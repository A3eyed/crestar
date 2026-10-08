// @ts-nocheck
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The old standalone analytics page confused sellers — it only showed
 * charts (with placeholder data) and no way to list products.
 * All analytics now live inside the Seller Center's Analytics tab,
 * so this route simply redirects there.
 */
export default function SellerAnalyticsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/seller/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Taking you to your Seller Center...</p>
    </div>
  );
}
