// @ts-nocheck
/**
 * Never show raw backend errors (500, stack traces, SQL) to end users.
 */

const FRIENDLY = {
  unauthorized: 'Please sign in to continue.',
  network: 'Connection problem. Check your internet and try again.',
  generic: 'Something went wrong. Please try again in a moment.',
  onboarding: 'We couldn\'t finish setting up your seller account. Please try again.',
  profile: 'We couldn\'t save your profile. Please try again.',
};

export function logServerError(scope, error, extra = {}) {
  console.error(`[${scope}]`, error?.message || error, extra);
}

export function jsonUserError(
  scope,
  error,
  {
    status = 500,
    userMessage = FRIENDLY.generic,
    code = 'error',
  } = {},
) {
  logServerError(scope, error);
  return Response.json(
    {
      error: userMessage,
      code,
    },
    { status },
  );
}

export const UserMessages = FRIENDLY;
