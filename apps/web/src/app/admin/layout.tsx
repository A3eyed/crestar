// @ts-nocheck
import type { ReactNode } from 'react';

/**
 * Admin area is private: never index, never follow, never appear in search.
 * Access is enforced on each admin page + API (role/admin checks).
 */
export const metadata = {
  title: 'Admin',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
