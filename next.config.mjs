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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
