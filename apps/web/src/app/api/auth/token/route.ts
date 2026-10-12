/**
 * Mobile token-exchange endpoint.
 * After WebView signup/signin, native app reads { jwt, user } from this JSON.
 */
import { getAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data: session } = await getAuth().getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prefer session token when present (Better Auth / Neon session shape).
    const token =
      (session as { session?: { token?: string }; token?: string }).session
        ?.token ||
      (session as { token?: string }).token ||
      '';

    return NextResponse.json({
      jwt: token,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    });
  } catch (err) {
    console.error('[auth/token]', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
