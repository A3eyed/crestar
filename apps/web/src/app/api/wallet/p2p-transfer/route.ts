// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 50000; // hard ceiling per transfer (GHS)

// P2P Transfer between @usernames with zero fees
export async function POST(request) {
  try {
    const senderUserId = await resolveUserId(request);
    if (!senderUserId) {
      return Response.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { recipientUsername, amount, message } = body;

    if (!recipientUsername || !String(recipientUsername).trim()) {
      return Response.json(
        { error: "Please enter the recipient's username" },
        { status: 400 },
      );
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return Response.json(
        { error: 'Please enter a valid amount' },
        { status: 400 },
      );
    }

    if (parsedAmount < MIN_AMOUNT) {
      return Response.json(
        { error: `Minimum transfer amount is GH₵ ${MIN_AMOUNT}` },
        { status: 400 },
      );
    }

    if (parsedAmount > MAX_AMOUNT) {
      return Response.json(
        { error: `Maximum transfer amount is GH₵ ${MAX_AMOUNT.toLocaleString()}` },
        { status: 400 },
      );
    }

    // Round to 2 decimal places (money)
    const transferAmount = Math.round(parsedAmount * 100) / 100;

    const cleanUsername = String(recipientUsername).replace(/^@/, '').toLowerCase().trim();
    if (!/^[a-z0-9._]{2,32}$/.test(cleanUsername)) {
      return Response.json({ error: 'Invalid username' }, { status: 400 });
    }

    const senderResult = await sql`
      SELECT identity_id, username FROM auth_users WHERE id = ${senderUserId} LIMIT 1
    `;

    if (!senderResult.length) {
      return Response.json({ error: 'Sender account not found' }, { status: 404 });
    }

    const senderIdentityId = senderResult[0].identity_id;
    const senderUsername = senderResult[0].username;

    if (senderUsername?.toLowerCase() === cleanUsername) {
      return Response.json(
        { error: 'You cannot transfer money to yourself' },
        { status: 400 },
      );
    }

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

    await sql`
      INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
      VALUES
        (${senderIdentityId}, 'personal', 'GHS', 0, 0),
        (${recipientIdentityId}, 'personal', 'GHS', 0, 0)
      ON CONFLICT (identity_id) DO NOTHING
    `;

    const senderWallet = await sql`
      SELECT id, actual_balance, pending_balance
      FROM wallet_accounts
      WHERE identity_id = ${senderIdentityId}
      LIMIT 1
    `;

    if (!senderWallet.length) {
      return Response.json({ error: 'Sender wallet not found' }, { status: 404 });
    }

    const recipientWallet = await sql`
      SELECT id, actual_balance, pending_balance
      FROM wallet_accounts
      WHERE identity_id = ${recipientIdentityId}
      LIMIT 1
    `;

    if (!recipientWallet.length) {
      return Response.json({ error: 'Recipient wallet not found' }, { status: 404 });
    }

    const senderWalletId = senderWallet[0].id;
    const recipientWalletId = recipientWallet[0].id;
    const senderCurrentBalance = parseFloat(senderWallet[0].actual_balance);
    const recipientCurrentBalance = parseFloat(recipientWallet[0].actual_balance);

    if (senderCurrentBalance < transferAmount) {
      return Response.json(
        {
          error: `Insufficient balance. You have GH₵${senderCurrentBalance.toFixed(2)} but need GH₵${transferAmount.toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    const transferReference = `P2P-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Atomic debit: only succeeds if balance is still sufficient (prevents race double-spend)
    const [debited] = await sql`
      UPDATE wallet_accounts
      SET actual_balance = actual_balance - ${transferAmount},
          updated_at = now()
      WHERE id = ${senderWalletId}
        AND actual_balance >= ${transferAmount}
      RETURNING actual_balance
    `;

    if (!debited) {
      return Response.json(
        { error: 'Insufficient balance or concurrent transfer. Please try again.' },
        { status: 409 },
      );
    }

    const senderNewBalance = parseFloat(debited.actual_balance);

    const [credited] = await sql`
      UPDATE wallet_accounts
      SET actual_balance = actual_balance + ${transferAmount},
          updated_at = now()
      WHERE id = ${recipientWalletId}
      RETURNING actual_balance
    `;

    const recipientNewBalance = parseFloat(credited?.actual_balance ?? recipientCurrentBalance + transferAmount);

    await sql`
      INSERT INTO crestar_wallet_transactions (
        wallet_account_id, transaction_type, amount, currency,
        actual_balance_before, actual_balance_after,
        pending_balance_before, pending_balance_after,
        reference, description, metadata, related_user_id,
        status, created_at, completed_at
      ) VALUES (
        ${senderWalletId}, 'p2p_transfer_out', ${transferAmount}, 'GHS',
        ${senderCurrentBalance}, ${senderNewBalance},
        ${senderWallet[0].pending_balance}, ${senderWallet[0].pending_balance},
        ${transferReference},
        ${`Sent to @${cleanUsername}${message ? `: ${String(message).slice(0, 200)}` : ''}`},
        ${JSON.stringify({
          recipient_username: cleanUsername,
          message: message ? String(message).slice(0, 200) : null,
          transfer_type: 'p2p_send',
        })},
        ${recipientUserId},
        'completed', now(), now()
      )
    `;

    await sql`
      INSERT INTO crestar_wallet_transactions (
        wallet_account_id, transaction_type, amount, currency,
        actual_balance_before, actual_balance_after,
        pending_balance_before, pending_balance_after,
        reference, description, metadata, related_user_id,
        status, created_at, completed_at
      ) VALUES (
        ${recipientWalletId}, 'p2p_transfer_in', ${transferAmount}, 'GHS',
        ${recipientCurrentBalance}, ${recipientNewBalance},
        ${recipientWallet[0].pending_balance}, ${recipientWallet[0].pending_balance},
        ${transferReference},
        ${`Received from @${senderUsername}${message ? `: ${String(message).slice(0, 200)}` : ''}`},
        ${JSON.stringify({
          sender_username: senderUsername,
          message: message ? String(message).slice(0, 200) : null,
          transfer_type: 'p2p_receive',
        })},
        ${senderUserId},
        'completed', now(), now()
      )
    `;

    await sql`
      INSERT INTO p2p_payments (
        sender_identity_id, receiver_identity_id, amount, currency,
        message, status, created_at, completed_at
      ) VALUES (
        ${senderIdentityId}, ${recipientIdentityId}, ${transferAmount}, 'GHS',
        ${message ? String(message).slice(0, 200) : null},
        'completed', now(), now()
      )
    `;

    return Response.json({
      success: true,
      message: `Successfully sent GH₵${transferAmount.toFixed(2)} to @${cleanUsername}`,
      transfer: {
        reference: transferReference,
        amount: transferAmount,
        recipient: cleanUsername,
        sender_new_balance: senderNewBalance,
        message: message ? String(message).slice(0, 200) : null,
      },
    });
  } catch (error) {
    console.error('P2P transfer error:', error);
    return Response.json(
      { error: 'Failed to process transfer. Please try again.' },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const userResult = await sql`
      SELECT identity_id FROM auth_users WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const identityId = userResult[0].identity_id;

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
    console.error('Get P2P transfers error:', error);
    return Response.json(
      { error: 'Failed to get transfer history' },
      { status: 500 },
    );
  }
}
