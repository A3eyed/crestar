// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { subscribePostQueue } from '@/utils/postVideoQueue';

/** Global toast for background video posts (survives create → feed navigation). */
export default function PostStatusToast() {
  const [s, setS] = useState({ status: 'idle', message: '', progress: 0 });

  useEffect(() => subscribePostQueue(setS), []);

  if (s.status === 'idle') return null;

  const isError = s.status === 'error';
  const isDone = s.status === 'done';

  return (
    <div className="fixed left-1/2 bottom-24 z-[100] -translate-x-1/2 w-[min(92vw,360px)] pointer-events-none">
      <div
        className={
          'rounded-2xl px-4 py-3 shadow-lg border text-sm font-medium ' +
          (isError
            ? 'bg-red-500/95 border-red-400 text-white'
            : isDone
              ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
              : 'bg-black/90 border-white/15 text-white')
        }
      >
        <div className="flex items-center justify-between gap-3">
          <span>{s.message || (isDone ? 'Posted' : 'Working…')}</span>
          {s.status === 'uploading' && (
            <span className="text-xs opacity-70 tabular-nums">{s.progress || 0}%</span>
          )}
        </div>
        {s.status === 'uploading' && (
          <div className="mt-2 h-1 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-[#D4AF37] transition-all duration-200"
              style={{ width: Math.max(4, s.progress || 0) + '%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
