// @ts-nocheck
import sql from "@/app/api/utils/sql";
import {
  PLATFORM_FEE_PERCENT as CRESTAR_PLATFORM_FEE_PERCENT,
  EARNER_PERCENT,
} from "@/app/api/utils/platformFee";

export const PLATFORM_FEE_PERCENT = CRESTAR_PLATFORM_FEE_PERCENT;
export const SUBACCOUNT_PERCENTAGE_CHARGE = 0;

const MOMO_BANK_CODES = { MTN: "MTN", VODAFONE: "VDF", AIRTELTIGO: "ATL" };
const USER_IDENTITY_IDS_SQL = `
  SELECT identity_id FROM identity_accounts WHERE user_id = $1
  UNION
  SELECT identity_id FROM auth_users WHERE id = $1 AND identity_id IS NOT NULL
`;

export function buildFlatSplit() {
  return null;
}

export async function createPaystackSubaccount({
  businessName,
  accountNumber,
  settlementBank = "MTN",
}) {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY)
      return { error: "PAYSTACK_SECRET_KEY is not configured" };
    if (!businessName || !accountNumber)
      return { error: "businessName and accountNumber are required" };
    const response = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: businessName,
        settlement_bank: settlementBank,
        account_number: String(accountNumber).replace(/\s/g, ""),
        percentage_charge: 0,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.data?.subaccount_code)
      return { error: data?.message || "Subaccount creation failed" };
    return { subaccountCode: data.data.subaccount_code };
  } catch (error) {
    return { error: error.message || "Subaccount creation error" };
  }
}

export async function syncSubaccountPercentages() {
  const report = { checked: 0, updated: [], failed: [] };
  const rows = await sql`
    SELECT paystack_subaccount_code FROM professional_profiles WHERE paystack_subaccount_code IS NOT NULL
    UNION
    SELECT paystack_subaccount_code FROM business_centers WHERE paystack_subaccount_code IS NOT NULL
  `;
  for (const row of rows) {
    const code = row.paystack_subaccount_code;
    report.checked++;
    try {
      const res = await fetch(`https://api.paystack.co/subaccount/${code}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ percentage_charge: 0 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        report.failed.push({
          code,
          error: data?.message || `HTTP ${res.status}`,
        });
      else report.updated.push({ code, percentage_charge: 0 });
    } catch (error) {
      report.failed.push({ code, error: error.message });
    }
  }
  return report;
}

export async function resolvePayoutDetails(userId) {
  try {
    const methods = await sql(
      `SELECT wpm.method_type, wpm.details
       FROM wallet_payout_methods wpm
       JOIN wallet_accounts wa ON wa.id = wpm.wallet_account_id
       WHERE wa.identity_id IN (${USER_IDENTITY_IDS_SQL}) AND wpm.is_active = true
       ORDER BY wpm.updated_at DESC LIMIT 1`,
      [userId]
    );
    if (methods.length > 0) {
      const method = methods[0];
      const details =
        typeof method.details === "string"
          ? JSON.parse(method.details)
          : method.details || {};
      const accountNumber = details.phone_number || details.account_number;
      const settlementBank =
        method.method_type === "mobile_money"
          ? MOMO_BANK_CODES[details.provider] || details.bank_code || "MTN"
          : details.bank_code;
      if (accountNumber && settlementBank)
        return {
          accountNumber,
          settlementBank,
          source: "wallet_payout_method",
        };
    }
    const profile = await sql(
      `SELECT momo_number FROM professional_profiles WHERE user_id = $1 AND momo_number IS NOT NULL LIMIT 1`,
      [userId]
    );
    if (profile[0]?.momo_number)
      return {
        accountNumber: profile[0].momo_number,
        settlementBank: "MTN",
        source: "professional_profile",
      };
    const center = await sql(
      `SELECT momo_number, phone_number FROM business_centers WHERE identity_id IN (${USER_IDENTITY_IDS_SQL}) LIMIT 1`,
      [userId]
    );
    if (center[0]?.momo_number || center[0]?.phone_number) {
      return {
        accountNumber: center[0].momo_number || center[0].phone_number,
        settlementBank: "MTN",
        source: "business_center",
      };
    }
    return null;
  } catch (error) {
    console.error("resolvePayoutDetails error:", error);
    return null;
  }
}

export async function ensureSellerSubaccount(sellerUserId) {
  try {
    if (!sellerUserId) return null;
    const userId = String(sellerUserId);
    const profile = await sql(
      `SELECT id, paystack_subaccount_code, business_name, full_name FROM professional_profiles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (profile[0]?.paystack_subaccount_code)
      return profile[0].paystack_subaccount_code;
    const center = await sql(
      `SELECT id, paystack_subaccount_code, business_name, full_name FROM business_centers WHERE identity_id IN (${USER_IDENTITY_IDS_SQL}) LIMIT 1`,
      [userId]
    );
    if (center[0]?.paystack_subaccount_code)
      return center[0].paystack_subaccount_code;
    const payout = await resolvePayoutDetails(userId);
    const record = profile[0] || center[0];
    if (!payout || !record) return null;
    const created = await createPaystackSubaccount({
      businessName:
        record.business_name || record.full_name || `Crestar Seller ${userId}`,
      accountNumber: payout.accountNumber,
      settlementBank: payout.settlementBank,
    });
    if (!created.subaccountCode) return null;
    if (profile[0])
      await sql(
        `UPDATE professional_profiles SET paystack_subaccount_code = $1, payment_setup_complete = true, updated_at = now() WHERE id = $2`,
        [created.subaccountCode, profile[0].id]
      );
    if (center[0])
      await sql(
        `UPDATE business_centers SET paystack_subaccount_code = $1, payment_setup_complete = true, updated_at = now() WHERE id = $2`,
        [created.subaccountCode, center[0].id]
      );
    return created.subaccountCode;
  } catch (error) {
    console.error("ensureSellerSubaccount error:", error);
    return null;
  }
}

export async function backfillMissingSubaccounts(dryRun = false) {
  const report = { scanned: 0, created: [], skipped: [], failed: [] };
  const rows =
    await sql`SELECT id, user_id, business_name, full_name FROM professional_profiles WHERE paystack_subaccount_code IS NULL`;
  for (const row of rows) {
    report.scanned++;
    const payout = await resolvePayoutDetails(row.user_id);
    if (!payout) {
      report.skipped.push({
        user_id: row.user_id,
        reason: "No payout details",
      });
      continue;
    }
    if (dryRun) {
      report.created.push({ user_id: row.user_id, dry_run: true });
      continue;
    }
    const created = await createPaystackSubaccount({
      businessName:
        row.business_name || row.full_name || `Crestar Seller ${row.user_id}`,
      accountNumber: payout.accountNumber,
      settlementBank: payout.settlementBank,
    });
    if (!created.subaccountCode) {
      report.failed.push({ user_id: row.user_id, error: created.error });
      continue;
    }
    await sql(
      `UPDATE professional_profiles SET paystack_subaccount_code = $1, payment_setup_complete = true, updated_at = now() WHERE id = $2`,
      [created.subaccountCode, row.id]
    );
    report.created.push({
      user_id: row.user_id,
      subaccount_code: created.subaccountCode,
    });
  }
  return report;
}

export const EARNER_SHARE_PERCENT = EARNER_PERCENT;