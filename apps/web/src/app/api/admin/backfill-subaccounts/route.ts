// @ts-nocheck
import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import { backfillMissingSubaccounts } from '@/app/api/utils/paystackSubaccount';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { errorResponse: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const [admin] = await sql`
    SELECT id, role FROM auth_users
    WHERE id = ${session.user.id.toString()} AND role IN ('admin', 'owner', 'moderator')
  `;

  if (!admin) {
    return { errorResponse: Response.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { admin };
}

/**
 * GET /api/admin/backfill-subaccounts
 * Dry run — reports which seller/monetization profiles are missing a Paystack
 * subaccount code and whether they have registered details to create one.
 */
export async function GET() {
  try {
    const { errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const report = await backfillMissingSubaccounts(true);

    return Response.json({
      success: true,
      dry_run: true,
      summary: {
        scanned: report.scanned,
        would_create: report.created.length,
        skipped_no_details: report.skipped.length,
      },
      report,
    });
  } catch (error) {
    console.error('Backfill dry-run error:', error);
    return Response.json({ error: 'Failed to run backfill dry-run' }, { status: 500 });
  }
}

/**
 * POST /api/admin/backfill-subaccounts
 * Runs the real backfill: creates Paystack subaccounts for every seller and
 * monetization profile missing one (using their registered bank/MoMo details)
 * and saves the subaccount_code to their record.
 */
export async function POST() {
  try {
    const { errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const report = await backfillMissingSubaccounts(false);

    return Response.json({
      success: true,
      dry_run: false,
      summary: {
        scanned: report.scanned,
        created: report.created.length,
        skipped_no_details: report.skipped.length,
        failed: report.failed.length,
      },
      report,
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return Response.json({ error: 'Failed to run subaccount backfill' }, { status: 500 });
  }
}
