// @ts-nocheck
// This endpoint is deprecated. Admin access is now role-based.
// The owner account (Abdallahfuseini44@gmail.com) receives the 'owner' role automatically on signup.

export async function POST(request) {
  return Response.json(
    {
      error:
        "This setup endpoint is no longer available. Admin access is granted via role assignment.",
    },
    { status: 410 },
  );
}
