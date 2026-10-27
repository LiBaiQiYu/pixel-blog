import type { ReactNode } from 'react';
import { AppShell } from '../../src/AppShell';
import { getPublicPosts } from '../../src/lib/blog-server';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const posts = await getPublicPosts().catch(() => []);

  return <AppShell initialPosts={posts}>{children}</AppShell>;
}
