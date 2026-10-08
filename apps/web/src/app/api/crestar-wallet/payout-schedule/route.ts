// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { resolveUserId } from "@/app/api/utils/auth";

const FREQUENCIES = ["daily", "weekly", "biweekly", "monthly"];

async function currentUserId(request) {
  const resolved = await resolveUserId(request).catch(() => null);
  if (resolved) return String(resolved);
  const session = await auth();
  return session?.user?.id ? String(session.user.id) : null;
}

function readMetadata(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      return {};
    }
  }
  return value;
}

const defaultSettings = {
  enabled: false,
  frequency: "weekly",
  min_threshold: 50,
  last_payout_at: null,
  next_payout_at: null,
  pays: "available_balance_only",
};

export async function GET(request) {
  try {
    const userId = await currentUserId(request);
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const userRows = await sql(
      `SELECT identity_id FROM auth_users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (!userRows.length || !userRows[0].identity_id) {
      return Response.json({ success: true, settings: defaultSettings });
    }
    const walletRows = await sql(
      `SELECT id, metadata FROM wallet_accounts WHERE identity_id = $1 LIMIT 1`,
      [userRows[0].identity_id]
    );
    if (!walletRows.length)
      return Response.json({ success: true, settings: defaultSettings });
    const metadata = readMetadata(walletRows[0].metadata);
    return Response.json({
      success: true,
      settings: { ...defaultSettings, ...(metadata.payout_schedule || {}) },
    });
  } catch (error) {
    console.error("Get payout schedule error:", error);
    return Response.json(
      { error: "Failed to get payout schedule" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const userId = await currentUserId(request);
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { enabled, frequency, min_threshold } = await request.json();
    if (typeof enabled !== "boolean") {
      return Response.json(
        { error: "enabled must be boolean" },
        { status: 400 }
      );
    }
    if (enabled) {
      if (!FREQUENCIES.includes(frequency))
        return Response.json({ error: "Invalid frequency" }, { status: 400 });
      const threshold = parseFloat(min_threshold);
      if (!Number.isFinite(threshold) || threshold < 1) {
        return Response.json(
          { error: "Minimum threshold must be at least GH₵1" },
          { status: 400 }
        );
      }
      const method = await sql(
        `SELECT id FROM payout_methods WHERE user_id = $1 LIMIT 1`,
        [userId]
      ).catch(() => []);
      if (!method.length) {
        return Response.json(
          { error: "Add a payout method before turning on auto-payout." },
          { status: 400 }
        );
      }
    }

    const userRows = await sql(
      `SELECT identity_id FROM auth_users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (!userRows.length || !userRows[0].identity_id) {
      return Response.json({ error: "Wallet not found" }, { status: 404 });
    }
    const walletRows = await sql(
      `SELECT id, metadata FROM wallet_accounts WHERE identity_id = $1 LIMIT 1`,
      [userRows[0].identity_id]
    );
    if (!walletRows.length)
      return Response.json({ error: "Wallet not found" }, { status: 404 });

    const currentMetadata = readMetadata(walletRows[0].metadata);
    const days =
      { daily: 1, weekly: 7, biweekly: 14, monthly: 30 }[frequency] || 7;
    const nextPayoutAt = enabled
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const newSettings = {
      enabled,
      frequency: enabled
        ? frequency
        : currentMetadata.payout_schedule?.frequency || "weekly",
      min_threshold: enabled
        ? parseFloat(min_threshold)
        : currentMetadata.payout_schedule?.min_threshold || 50,
      last_payout_at: currentMetadata.payout_schedule?.last_payout_at || null,
      next_payout_at: nextPayoutAt,
      pays: "available_balance_only",
    };
    await sql(
      `UPDATE wallet_accounts SET metadata = $1, updated_at = now() WHERE id = $2`,
      [
        JSON.stringify({ ...currentMetadata, payout_schedule: newSettings }),
        walletRows[0].id,
      ]
    );
    return Response.json({
      success: true,
      settings: newSettings,
      message: enabled
        ? "Auto-payout will only send available balance. Pending earnings stay held until the delivery PIN."
        : "Auto-payout disabled",
    });
  } catch (error) {
    console.error("Update payout schedule error:", error);
    return Response.json(
      { error: "Failed to update payout schedule" },
      { status: 500 }
    );
  }
}