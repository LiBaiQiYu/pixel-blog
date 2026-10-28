import crypto from 'node:crypto';
import path from 'node:path';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

import { createR2Client, readStorage } from '../gallery/config';
import { isValidPostId } from './post-file';

const IMAGE_CACHE = 'public, max-age=31536000, immutable';

function blogPrefix() {
  return (process.env.R2_BLOG_PREFIX || 'blog')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

async function withClient<T>(
  run: (client: ReturnType<typeof createR2Client>) => Promise<T>
) {
  const client = createR2Client();
  try {
    return await run(client);
  } finally {
    client.destroy();
  }
}

async function publicBaseUrl() {
  const storage = await readStorage();
  return (
    process.env.NEXT_PUBLIC_BLOG_IMAGE_BASE_URL ||
    process.env.VITE_BLOG_IMAGE_BASE_URL ||
    process.env.VITE_GALLERY_BASE_URL ||
    storage.publicBaseUrl ||
    'https://img.cwa1e.top'
  ).replace(/\/+$/, '');
}

export async function saveBlogImage(
  id: string,
  buffer: Buffer,
  originalName: string
) {
  if (!isValidPostId(id)) throw new Error('Invalid post id');

  const stem =
    path
      .parse(originalName)
      .name.toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'image';
  const filename = `${Date.now()}-${stem}.webp`;
  const key = `${blogPrefix()}/${id}/${filename}`;
  const output = await sharp(buffer)
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();

  await withClient(async (client) => {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: output,
        ContentType: 'image/webp',
        CacheControl: IMAGE_CACHE,
        Metadata: {
          sha256: crypto.createHash('sha256').update(output).digest('hex'),
        },
      })
    );
  });

  const base = await publicBaseUrl();
  const relativeUrl = `./${filename}`;
  const alt = path.parse(originalName).name || '文章图片';

  return {
    key,
    filename,
    alt,
    relativeUrl,
    url: `${base}/${key}`,
    markdown: `![${alt}](${relativeUrl})`,
  };
}
