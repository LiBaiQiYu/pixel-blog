'use client';

import dynamic from 'next/dynamic';

const AdminApp = dynamic(
  () => import('../../src/admin/AdminApp'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 font-mono text-xs text-cyan-300">
        LOADING ADMIN...
      </div>
    ),
  }
);

export function AdminPageClient() {
  return <AdminApp />;
}
