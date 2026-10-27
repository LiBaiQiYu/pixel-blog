import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://cwa1e.top/sitemap.xml',
    host: 'https://cwa1e.top',
  };
}
