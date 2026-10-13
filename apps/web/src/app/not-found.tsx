'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[#D4AF37] font-bold text-sm tracking-widest mb-3">CRESTAR</p>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-white/50 text-sm max-w-sm mb-8">
        This page isn&apos;t available. It may have moved, or the link is incorrect.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex-1 bg-[#D4AF37] text-black font-bold py-3 rounded-xl"
        >
          Go home
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 bg-white/10 text-white font-semibold py-3 rounded-xl"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
