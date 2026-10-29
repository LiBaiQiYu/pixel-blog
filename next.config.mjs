import os from 'node:os';

const env = {
  NEXT_PUBLIC_WEATHER_API_ENDPOINT:
    process.env.NEXT_PUBLIC_WEATHER_API_ENDPOINT ??
    process.env.VITE_WEATHER_API_ENDPOINT ??
    '',
  NEXT_PUBLIC_BLOG_IMAGE_BASE_URL:
    process.env.NEXT_PUBLIC_BLOG_IMAGE_BASE_URL ??
    process.env.VITE_BLOG_IMAGE_BASE_URL ??
    process.env.VITE_GALLERY_BASE_URL ??
    '',
  NEXT_PUBLIC_BLOG_INDEX_URL:
    process.env.NEXT_PUBLIC_BLOG_INDEX_URL ??
    process.env.VITE_BLOG_INDEX_URL ??
    '',
  NEXT_PUBLIC_GALLERY_BASE_URL:
    process.env.NEXT_PUBLIC_GALLERY_BASE_URL ??
    process.env.VITE_GALLERY_BASE_URL ??
    '',
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ??
    process.env.VITE_MAPBOX_ACCESS_TOKEN ??
    '',
  NEXT_PUBLIC_STATS_API_URL:
    process.env.NEXT_PUBLIC_STATS_API_URL ??
    process.env.VITE_STATS_API_URL ??
    '',
};

const isDev = process.env.NODE_ENV !== 'production';

function getDevAllowedOrigins() {
  const origins = new Set(['*.local']);

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        origins.add(address.address);
      }
    }
  }

  for (const origin of (process.env.DEV_ALLOWED_ORIGINS ?? '').split(',')) {
    const value = origin.trim();
    if (!value) continue;
    const hostname = value
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0];
    if (hostname) origins.add(hostname);
  }

  return [...origins];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: getDevAllowedOrigins(),
  env,
  pageExtensions: isDev
    ? ['tsx', 'ts', 'jsx', 'js', 'dev.tsx', 'dev.ts']
    : ['tsx', 'ts', 'jsx', 'js'],
  images: {
    unoptimized: true,
  },
  ...(isDev
    ? {
        serverExternalPackages: [
          'sharp',
          'busboy',
          'heic-convert',
          'exiftool-vendored',
          '@aws-sdk/client-s3',
        ],
      }
    : {}),
  async rewrites() {
    return [
      {
        source: '/__admin/:path*',
        destination: '/api/admin/:path*',
      },
    ];
  },
};

export default nextConfig;
