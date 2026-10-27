import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminPageClient } from './AdminPageClient';

export const metadata: Metadata = {
  title: '后台管理',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <AdminPageClient />;
}
