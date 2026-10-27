const value = (key: string, fallback = '') =>
  process.env[key]?.trim() || fallback;

const blogImageBase = value(
  'NEXT_PUBLIC_BLOG_IMAGE_BASE_URL',
  value('NEXT_PUBLIC_GALLERY_BASE_URL', 'https://img.cwa1e.top')
).replace(/\/+$/, '');

export const APP_ENV = {
  isDev: process.env.NODE_ENV !== 'production',
  baseUrl: '/',
  weatherEndpoint: value(
    'NEXT_PUBLIC_WEATHER_API_ENDPOINT',
    '/api/weather'
  ).replace(/\/+$/, ''),
  blogImageBaseUrl: blogImageBase,
  blogIndexUrl: value(
    'NEXT_PUBLIC_BLOG_INDEX_URL',
    `${blogImageBase}/blog/posts.json`
  ),
  galleryBaseUrl: value('NEXT_PUBLIC_GALLERY_BASE_URL'),
  mapboxToken: value('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN'),
  statsApiUrl: value(
    'NEXT_PUBLIC_STATS_API_URL',
    'https://stats.cwa1e.top'
  ).replace(/\/+$/, ''),
};
