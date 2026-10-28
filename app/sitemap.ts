import type { MetadataRoute } from 'next';
import { GALLERY_PHOTOS } from '../src/data/gallery';
import { getPublicPosts } from '../src/lib/blog-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://cwa1e.top';
  const posts = await getPublicPosts().catch(() => []);

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${base}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...posts.map((post) => ({
      url: `${base}/posts/${post.id}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...GALLERY_PHOTOS.map((photo) => ({
      url: `${base}/gallery/${encodeURIComponent(photo.id)}`,
      lastModified: new Date(photo.date),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
