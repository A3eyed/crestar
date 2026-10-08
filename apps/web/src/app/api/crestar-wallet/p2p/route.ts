// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Send P2P payment (instant, zero-fee transfer between Crestar users)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { recipient_username, amount, message } = await request.json();

    if (!recipient_username || !amount) {
      return Response.json(
        { error: "Recipient username and amount are required" },
        { status: 400 },
      );
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      return Response.json(
        { error: "Amount must be positive" },
        { status: 400 },
      );
    }

    const senderId = session.user.id;

    // Get sender's identity and wallet
    const senderData = await sql`
      SELECT 
        u.identity_id,
        wa.id as wallet_id,
        wa.actual_balance,
        u.username as sender_username
      FROM auth_users u
      JOIN wallet_accounts wa ON u.identity_id = wa.identity_id
      WHERE u.id = ${senderId}
    `;

    if (senderData.length === 0) {
      return Response.json(
        { error: "Sender wallet not found" },
        { status: 404 },
      );
    }

    const sender = senderData[0];
    if (parseFloat(sender.actual_balance) < amountNum) {
      return Response.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Get recipient by username
    const recipientData = await sql`
      SELECT 
        u.id as user_id,
        u.identity_id,
        wa.id as wallet_id,
        u.username,
        u.name
      FROM auth_users u
      JOIN wallet_accounts wa ON u.identity_id = wa.identity_id
      WHERE u.username = ${recipient_username}
    `;

    if (recipientData.length === 0) {
      return Response.json({ error: "Recipient not found" }, { status: 404 });
    }

    const recipient = recipientData[0];

    // Prevent self-transfer
    if (sender.identity_id === recipient.identity_id) {
      return Response.json(
        { error: "Cannot send money to yourself" },
        { status: 400 },
      );
    }

    // Use a transaction to ensure atomicity
    const transactionResult = await sql.transaction([
      // Deduct from sender
      sql`
        UPDATE wallet_accounts 
        SET 
          actual_balance = actual_balance - ${amountNum},
          updated_at = now()
        WHERE id = ${sender.wallet_id}
        RETURNING actual_balance
      `,

      // Add to recipient
      sql`
        UPDATE wallet_accounts 
        SET 
          actual_balance = actual_balance + ${amountNum},
          updated_at = now()
        WHERE id = ${recipient.wallet_id}
        RETURNING actual_balance
      `,

      // Create P2P payment record
      sql`
        INSERT INTO p2p_payments (
          sender_identity_id,
          receiver_identity_id,
          amount,
          message,
          status,
          created_at,
          completed_at
        ) VALUES (
          ${sender.identity_id},
          ${recipient.identity_id},
          ${amountNum},
          ${message || null},
          'completed',
          now(),
          now()
        ) RETURNING id
      `,

      // Record sender transaction
      sql`
        INSERT INTO crestar_wallet_transactions (
          wallet_account_id,
          transaction_type,
          amount,
          actual_balance_before,
          actual_balance_after,
          pending_balance_before,
          pending_balance_after,
          reference,
          description,
          related_user_id,
          status,
          created_at,
          completed_at
        ) VALUES (
          ${sender.wallet_id},
          'p2p_transfer_out',
          ${-amountNum},
          ${sender.actual_balance},
          ${parseFloat(sender.actual_balance) - amountNum},
          0,
          0,
          'P2P-' || ${Date.now()},
          'Sent to @' || ${recipient_username},
          ${recipient.user_id},
          'completed',
          now(),
          now()
        ) RETURNING id
      `,

      // Record recipient transaction
      sql`
        INSERT INTO crestar_wallet_transactions (
          wallet_account_id,
          transaction_type,
          amount,
          actual_balance_before,
          actual_balance_after,
          pending_balance_before,
          pending_balance_after,
          reference,
          description,
          related_user_id,
          status,
          created_at,
          completed_at
        ) VALUES (
          ${recipient.wallet_id},
          'p2p_transfer_in',
          ${amountNum},
          (SELECT actual_balance - ${amountNum} FROM wallet_accounts WHERE id = ${recipient.wallet_id}),
          (SELECT actual_balance FROM wallet_accounts WHERE id = ${recipient.wallet_id}),
          0,
          0,
          'P2P-' || ${Date.now()},
          'Received from @' || ${sender.sender_username},
          ${senderId},
          'completed',
          now(),
          now()
        ) RETURNING id
      `,
    ]);

    const [senderBalance, recipientBalance, p2pPayment] = transactionResult;

    return Response.json({
      success: true,
      payment_id: p2pPayment[0].id,
      amount: amountNum,
      recipient: {
        username: recipient.username,
        name: recipient.name,
      },
      sender_new_balance: parseFloat(senderBalance[0].actual_balance),
      message: message || null,
    });
  } catch (error) {
    console.error("P2P payment error:", error);
    return Response.json({ error: "Failed to send payment" }, { status: 500 });
  }
}

// Get P2P payment history
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20"),
      100,
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const userId = session.user.id;

    // Get user's identity
    const userIdentity = await sql`
      SELECT identity_id FROM auth_users WHERE id = ${userId}
    `;

    if (userIdentity.length === 0 || !userIdentity[0].identity_id) {
      return Response.json({ error: "Identity not found" }, { status: 404 });
    }

    const identity_id = userIdentity[0].identity_id;

    // Get P2P payment history
    const payments = await sql`
      SELECT 
        p.id,
        p.amount,
        p.message,
        p.status,
        p.created_at,
        p.completed_at,
        
        -- Sender details
        sender_u.username as sender_username,
        sender_u.name as sender_name,
        sender_u.profile_image as sender_profile_image,
        
        -- Receiver details
        receiver_u.username as receiver_username,
        receiver_u.name as receiver_name,
        receiver_u.profile_image as receiver_profile_image,
        
        -- Determine if this user is sender or receiver
        CASE 
          WHEN p.sender_identity_id = ${identity_id} THEN 'sent'
          ELSE 'received'
        END as direction
        
      FROM p2p_payments p
      JOIN identities sender_i ON p.sender_identity_id = sender_i.id
      JOIN identity_accounts sender_ia ON sender_i.id = sender_ia.identity_id AND sender_ia.is_primary = true
      JOIN auth_users sender_u ON sender_ia.user_id = sender_u.id
      JOIN identities receiver_i ON p.receiver_identity_id = receiver_i.id
      JOIN identity_accounts receiver_ia ON receiver_i.id = receiver_ia.identity_id AND receiver_ia.is_primary = true
      JOIN auth_users receiver_u ON receiver_ia.user_id = receiver_u.id
      
      WHERE p.sender_identity_id = ${identity_id} OR p.receiver_identity_id = ${identity_id}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return Response.json({
      payments: payments,
      has_more: payments.length === limit,
    });
  } catch (error) {
    console.error("P2P history error:", error);
    return Response.json(
      { error: "Failed to get payment history" },
      { status: 500 },
    );
  }
}
