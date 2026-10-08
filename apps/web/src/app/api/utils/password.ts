// @ts-nocheck
import { argon2Verify } from 'argon2-wasm-edge';
import {
  hashPassword as betterAuthHash,
  verifyPassword as betterAuthVerify,
} from 'better-auth/crypto';

/**
 * Password helpers aligned with Anything v2 / Better Auth.
 *
 * Better Auth stores credential passwords in the `account` table using its own
 * scrypt format. Accounts migrated from V1 still carry `$argon2…` hashes, so
 * verification has to understand both — exactly like the `verifyCompatiblePassword`
 * hook in `@/lib/auth`. Anything we write from now on uses Better Auth's own
 * hashing so sign-in through `authClient.signIn.email` keeps working.
 */

export async function hashPassword(password: string) {
  return betterAuthHash(password);
}

export async function verifyPassword(hashedPassword: string, plainPassword: string) {
  if (!hashedPassword || !plainPassword) return false;

  if (hashedPassword.startsWith('$argon2')) {
    return argon2Verify({ hash: hashedPassword, password: plainPassword });
  }

  return betterAuthVerify({ hash: hashedPassword, password: plainPassword });
}

// Legacy alias kept so older call sites keep compiling.
export const verifyPasswordCompat = verifyPassword;
