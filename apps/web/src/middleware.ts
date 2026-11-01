import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge middleware — defense-in-depth security headers.
 * Primary CSP/headers also set in next.config.js; this covers edge cases
 * where config headers may not apply on all Worker paths.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(self), payment=(self)',
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );

  // Block common scanner probes from wasting resources (cheap filter only)
  const path = request.nextUrl.pathname.toLowerCase();
  if (
    path.includes('wp-admin') ||
    path.includes('wp-login') ||
    path.includes('.php') ||
    path.includes('/.env') ||
    path.includes('/.git')
  ) {
    return new NextResponse(null, { status: 404 });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets that Cloudflare/OpenNext serves directly.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
