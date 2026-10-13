// @ts-nocheck
/**
 * POST /api/system/ensure-schema
 * Idempotent — creates missing Crestar core tables on Neon.
 * Safe to call after deploy if seller onboarding failed due to missing tables.
 */
import { ensureCoreSchema } from '@/app/api/utils/ensureSchema';

export async function POST() {
  try {
    const result = await ensureCoreSchema();
    return Response.json({
      ok: result.ok,
      message: result.ok
        ? 'Core Crestar tables are ready.'
        : 'Some tables could not be created. Check Worker logs.',
      steps: result.steps,
    });
  } catch (error) {
    console.error('[ensure-schema]', error);
    return Response.json(
      { ok: false, message: 'Could not prepare the database. Please try again later.' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return POST();
}
