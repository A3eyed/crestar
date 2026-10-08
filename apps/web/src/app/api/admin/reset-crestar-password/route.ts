// @ts-nocheck
// This endpoint is deprecated. The legacy Crestar admin account has been removed.
// Use /api/auth/forgot-password for password resets.

export async function POST(request) {
  return Response.json(
    {
      error:
        "This endpoint is no longer available. Use /api/auth/forgot-password instead.",
    },
    { status: 410 },
  );
}
