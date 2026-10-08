// @ts-nocheck
'use client';

import PublicProfilePage from '@/app/seller/[id]/page';

/**
 * Clean handle profile route — crestarhq.com/username
 *
 * Renders the exact same public profile UI as /seller/[id]. The profile
 * component reads the last path segment and calls /api/sellers/<handle>,
 * which resolves EITHER a clean username or a raw user id. That means both
 *   crestarhq.com/syredesyre   (clean, shareable)
 *   crestarhq.com/seller/<id>  (legacy links keep working)
 * load the same page.
 *
 * NOTE: static routes (/cart, /checkout, /profile, /api/..., etc.) always win
 * over this dynamic segment in the Next.js App Router, so real pages are never
 * shadowed by a username.
 */
export default function UsernameProfilePage() {
  return <PublicProfilePage />;
}
