/**
 * Crestar — Neon Managed Better Auth (browser client)
 *
 * Talks to same-origin /api/auth/* which proxies to NEON_AUTH_BASE_URL.
 * Do not pass an absolute baseURL here.
 */
'use client';

import { createAuthClient } from '@neondatabase/auth/next';

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
