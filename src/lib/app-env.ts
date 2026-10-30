const value = (raw: string | undefined, fallback = '') =>
  raw?.trim() || fallback;

const blogImageBase = value(
  process.env.NEXT_PUBLIC_BLOG_IMAGE_BASE_URL,
  value(process.env.NEXT_PUBLIC_GALLERY_BASE_URL, 'https://img.cwa1e.top')
).replace(/\/+$/, '');

export const APP_ENV = {
  isDev: process.env.NODE_ENV !== 'production',
  baseUrl: '/',
  weatherEndpoint: value(
    process.env.NEXT_PUBLIC_WEATHER_API_ENDPOINT,
    '/api/weather'
  ).replace(/\/+$/, ''),
  blogImageBaseUrl: blogImageBase,
  blogIndexUrl: value(
    process.env.NEXT_PUBLIC_BLOG_INDEX_URL,
    `${blogImageBase}/blog/posts.json`
  ),
  galleryBaseUrl: value(process.env.NEXT_PUBLIC_GALLERY_BASE_URL),
  mapboxToken: value(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN),
  statsApiUrl: value(
    process.env.NEXT_PUBLIC_STATS_API_URL,
    'https://stats.cwa1e.top'
  ).replace(/\/+$/, ''),
  steamId: value(process.env.NEXT_PUBLIC_STEAM_ID, '76561198070168584'),
};
