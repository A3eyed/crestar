// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// P2P Transfer between @usernames with zero fees
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const senderUserId = session.user.id.toString();
    const body = await request.json();
    const { recipientUsername, amount, message } = body;

    // Validate inputs
    if (!recipientUsername || !recipientUsername.trim()) {
      return Response.json(
        { error: "Please enter the recipient's username" },
        { status: 400 },
      );
    }

    if (!amount || amount <= 0) {
      return Response.json(
        { error: "Please enter a valid amount" },
        { status: 400 },
      );
    }

    if (amount < 0.01) {
      return Response.json(
        { error: "Minimum transfer amount is GH₵ 0.01" },
        { status: 400 },
      );
    }

    // Clean username (remove @ if present)
    const cleanUsername = recipientUsername.replace(/^@/, "").toLowerCase();

    // Get sender's identity and wallet
    const senderResult = await sql`
      SELECT identity_id, username FROM auth_users WHERE id = ${senderUserId} LIMIT 1
    `;

    if (!senderResult.length) {
      return Response.json(
        { error: "Sender account not found" },
        { status: 404 },
      );
    }

    const senderIdentityId = senderResult[0].identity_id;
    const senderUsername = senderResult[0].username;

    // Prevent self-transfer
    if (senderUsername?.toLowerCase() === cleanUsername) {
      return Response.json(
        { error: "You cannot transfer money to yourself" },
        { status: 400 },
      );
    }

    // Get recipient's identity
    const recipientResult = await sql`
      SELECT id, identity_id, username FROM auth_users 
      WHERE LOWER(username) = ${cleanUsername} 
      LIMIT 1
    `;

    if (!recipientResult.length) {
      return Response.json(
        { error: `User @${cleanUsername} not found` },
        { status: 404 },
      );
    }

    const recipientIdentityId = recipientResult[0].identity_id;
    const recipientUserId = recipientResult[0].id.toString();

    // Ensure both users have wallet accounts
    await sql`
      INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
      VALUES 
        (${senderIdentityId}, 'personal', 'GHS', 0, 0),
        (${recipientIdentityId}, 'personal', 'GHS', 0, 0)
      ON CONFLICT (identity_id) DO NOTHING
    `;

    // Get sender's wallet balance
    const senderWallet = await sql`
      SELECT id, actual_balance, pending_balance 
      FROM wallet_accounts 
      WHERE identity_id = ${senderIdentityId} 
      LIMIT 1
    `;

    if (!senderWallet.length) {
      return Response.json(
        { error: "Sender wallet not found" },
        { status: 404 },
      );
    }

    const senderWalletId = senderWallet[0].id;
    const senderCurrentBalance = parseFloat(senderWallet[0].actual_balance);

    // Check if sender has sufficient balance
    if (senderCurrentBalance < amount) {
      return Response.json(
        {
          error: `Insufficient balance. You have GH₵${senderCurrentBalance.toFixed(2)} but need GH₵${amount.toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    // Get recipient's wallet
    const recipientWallet = await sql`
      SELECT id, actual_balance, pending_balance 
      FROM wallet_accounts 
      WHERE identity_id = ${recipientIdentityId} 
      LIMIT 1
    `;

    if (!recipientWallet.length) {
      return Response.json(
        { error: "Recipient wallet not found" },
        { status: 404 },
      );
    }

    const recipientWalletId = recipientWallet[0].id;
    const recipientCurrentBalance = parseFloat(
      recipientWallet[0].actual_balance,
    );

    // Calculate new balances
    const senderNewBalance = senderCurrentBalance - amount;
    const recipientNewBalance = recipientCurrentBalance + amount;

    const transferReference = `P2P-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Perform the transfer in a transaction
    const transferResult = await sql.transaction([
      // Deduct from sender
      sql`
        UPDATE wallet_accounts 
        SET actual_balance = ${senderNewBalance}, updated_at = now()
        WHERE id = ${senderWalletId}
      `,
      // Add to recipient
      sql`
        UPDATE wallet_accounts 
        SET actual_balance = ${recipientNewBalance}, updated_at = now()
        WHERE id = ${recipientWalletId}
      `,
      // Record sender's transaction (outgoing)
      sql`
        INSERT INTO crestar_wallet_transactions (
          wallet_account_id,
          transaction_type,
          amount,
          currency,
          actual_balance_before,
          actual_balance_after,
          pending_balance_before,
          pending_balance_after,
          reference,
          description,
          metadata,
          related_user_id,
          status,
          created_at,
          completed_at
        ) VALUES (
          ${senderWalletId},
          'p2p_transfer_out',
          ${amount},
          'GHS',
          ${senderCurrentBalance},
          ${senderNewBalance},
          ${senderWallet[0].pending_balance},
          ${senderWallet[0].pending_balance},
          ${transferReference},
          ${`Sent to @${cleanUsername}${message ? `: ${message}` : ""}`},
          ${JSON.stringify({
            recipient_username: cleanUsername,
            message: message || null,
            transfer_type: "p2p_send",
          })},
          ${recipientUserId},
          'completed',
          now(),
          now()
        )
      `,
      // Record recipient's transaction (incoming)
      sql`
        INSERT INTO crestar_wallet_transactions (
          wallet_account_id,
          transaction_type,
          amount,
          currency,
          actual_balance_before,
          actual_balance_after,
          pending_balance_before,
          pending_balance_after,
          reference,
          description,
          metadata,
          related_user_id,
          status,
          created_at,
          completed_at
        ) VALUES (
          ${recipientWalletId},
          'p2p_transfer_in',
          ${amount},
          'GHS',
          ${recipientCurrentBalance},
          ${recipientNewBalance},
          ${recipientWallet[0].pending_balance},
          ${recipientWallet[0].pending_balance},
          ${transferReference},
          ${`Received from @${senderUsername}${message ? `: ${message}` : ""}`},
          ${JSON.stringify({
            sender_username: senderUsername,
            message: message || null,
            transfer_type: "p2p_receive",
          })},
          ${senderUserId},
          'completed',
          now(),
          now()
        )
      `,
      // Record the P2P payment in the dedicated table
      sql`
        INSERT INTO p2p_payments (
          sender_identity_id,
          receiver_identity_id,
          amount,
          currency,
          message,
          status,
          created_at,
          completed_at
        ) VALUES (
          ${senderIdentityId},
          ${recipientIdentityId},
          ${amount},
          'GHS',
          ${message || null},
          'completed',
          now(),
          now()
        )
      `,
    ]);

    return Response.json({
      success: true,
      message: `Successfully sent GH₵${amount.toFixed(2)} to @${cleanUsername}`,
      transfer: {
        reference: transferReference,
        amount,
        recipient: cleanUsername,
        sender_new_balance: senderNewBalance,
        message: message || null,
      },
    });
  } catch (error) {
    console.error("P2P transfer error:", error);
    return Response.json(
      { error: "Failed to process transfer. Please try again." },
      { status: 500 },
    );
  }
}

// Get P2P transfer history
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const userId = session.user.id.toString();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user's identity_id
    const userResult = await sql`
      SELECT identity_id FROM auth_users WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const identityId = userResult[0].identity_id;

    // Get P2P transfer history
    const transfers = await sql`
      SELECT 
        p2p.*,
        sender.username as sender_username,
        receiver.username as receiver_username,
        sender.profile_image as sender_image,
        receiver.profile_image as receiver_image
      FROM p2p_payments p2p
      JOIN identities sender_id ON p2p.sender_identity_id = sender_id.id
      JOIN identities receiver_id ON p2p.receiver_identity_id = receiver_id.id
      JOIN auth_users sender ON sender_id.id = sender.identity_id
      JOIN auth_users receiver ON receiver_id.id = receiver.identity_id
      WHERE p2p.sender_identity_id = ${identityId} OR p2p.receiver_identity_id = ${identityId}
      ORDER BY p2p.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const formattedTransfers = transfers.map((transfer) => ({
      id: transfer.id,
      amount: parseFloat(transfer.amount),
      currency: transfer.currency,
      message: transfer.message,
      status: transfer.status,
      created_at: transfer.created_at,
      completed_at: transfer.completed_at,
      is_sent: transfer.sender_identity_id === identityId,
      sender: {
        username: transfer.sender_username,
        profile_image: transfer.sender_image,
      },
      receiver: {
        username: transfer.receiver_username,
        profile_image: transfer.receiver_image,
      },
    }));

    return Response.json({ transfers: formattedTransfers });
  } catch (error) {
    console.error("Get P2P transfers error:", error);
    return Response.json(
      { error: "Failed to get transfer history" },
      { status: 500 },
    );
  }
}
