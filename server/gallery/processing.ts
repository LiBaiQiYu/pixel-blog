import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { exiftool } from 'exiftool-vendored';
import heicConvert from 'heic-convert';
import sharp from 'sharp';

import type { GalleryEntry, GalleryMeta } from '../../src/types/gallery';
import type {
  GalleryAssetRecord,
  GalleryManifestEntry,
} from '../../src/types/gallery-manifest';
import { uniquePhotoId } from './data';
import { buildMetadata } from './metadata';

export interface UploadFields {
  title?: string;
  description?: string;
  category?: string;
  area?: string;
  place?: string;
  tags?: string;
  date?: string;
}

export interface ProcessedFile {
  key: string;
  buffer: Buffer;
  contentType: string;
  sha256: string;
}

export interface ProcessedUpload {
  id: string;
  entry: GalleryEntry;
  meta: GalleryMeta;
  assets: GalleryManifestEntry;
  placeholder: string;
  files: ProcessedFile[];
  sourceName: string;
}

const HEIC_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'mif1',
  'msf1',
  'heif',
]);

function isHeic(buffer: Buffer) {
  if (buffer.length < 12) return false;
  if (buffer.toString('ascii', 4, 8) !== 'ftyp') return false;
  return HEIC_BRANDS.has(
    buffer.toString('ascii', 8, 12).toLowerCase()
  );
}

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function slugId(fileName: string) {
  const stem = path.parse(fileName).name;
  const slug = stem
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  if (/^tempImage/i.test(stem) || !slug) {
    return `photo-${Date.now()}`;
  }
  return slug;
}

function splitTags(value?: string) {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(/[,，、\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ];
}

function accentFor(id: string): GalleryEntry['accent'] {
  const accents: GalleryEntry['accent'][] = [
    'cyan',
    'magenta',
    'emerald',
    'amber',
    'violet',
  ];
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return accents[hash % accents.length];
}

function contentTypeForExtension(ext: string) {
  switch (ext.toLowerCase()) {
    case '.avif':
      return 'image/avif';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.tif':
    case '.tiff':
      return 'image/tiff';
    case '.heic':
      return 'image/heic';
    case '.heif':
    case '.hif':
      return 'image/heif';
    case '.mov':
      return 'video/quicktime';
    case '.mp4':
      return 'video/mp4';
    case '.m4v':
      return 'video/x-m4v';
    default:
      return 'image/jpeg';
  }
}

function histogramFromRaw(
  data: Buffer,
  channels: number,
  pixelCount: number
) {
  const bins = {
    r: Array.from({ length: 32 }, () => 0),
    g: Array.from({ length: 32 }, () => 0),
    b: Array.from({ length: 32 }, () => 0),
  };

  for (let i = 0; i < data.length; i += channels) {
    bins.r[data[i] >> 3] += 1;
    bins.g[data[i + 1] >> 3] += 1;
    bins.b[data[i + 2] >> 3] += 1;
  }

  for (const channel of Object.values(bins)) {
    for (let i = 0; i < channel.length; i++) {
      channel[i] = channel[i] / pixelCount;
    }
  }
  return bins;
}

export async function processUpload(
  imageBuffer: Buffer,
  fileName: string,
  fields: UploadFields = {},
  video?: { buffer: Buffer; fileName: string }
): Promise<ProcessedUpload> {
  const heic = isHeic(imageBuffer);
  const sourceExt = path.extname(fileName).toLowerCase() || '.jpg';
  let originalBuffer = imageBuffer;
  let originalExt = sourceExt;

  if (heic) {
    const converted = await heicConvert({
      buffer: imageBuffer,
      format: 'JPEG',
      quality: 0.95,
    });
    originalBuffer = Buffer.from(converted);
    originalExt = '.jpeg';
  }

  const tempPath = path.join(
    os.tmpdir(),
    `pixel-blog-admin-${crypto.randomUUID()}${heic ? '.heic' : sourceExt}`
  );
  await fs.writeFile(tempPath, imageBuffer);

  let tags: Record<string, any> = {};
  try {
    tags = await exiftool.read(tempPath);
  } catch (error) {
    console.warn('EXIF extraction failed:', error);
  } finally {
    await fs.rm(tempPath, { force: true });
  }

  const metadata = buildMetadata(tags, fileName, imageBuffer.length);
  const id = await uniquePhotoId(slugId(fileName));
  const rotated = sharp(originalBuffer, { failOn: 'none' }).rotate();
  const sharpMeta = await rotated.metadata();
  const width = metadata.width ?? sharpMeta.width ?? 1;
  const height = metadata.height ?? sharpMeta.height ?? 1;

  const thumbnail = await rotated
    .clone()
    .resize(600, null, { withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();
  const medium = await rotated
    .clone()
    .resize(2048, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const placeholder = await rotated
    .clone()
    .resize(40, 40, { fit: 'inside' })
    .webp({ quality: 35 })
    .toBuffer();

  const { data: raw, info: rawInfo } = await rotated
    .clone()
    .resize(256, 256, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const histogram = histogramFromRaw(
    raw,
    rawInfo.channels,
    rawInfo.width * rawInfo.height
  );

  const tagsList = fields.tags
    ? splitTags(fields.tags)
    : metadata.tags;
  const parsedDate = fields.date ? new Date(fields.date) : null;
  const date =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : metadata.date;

  const entry: GalleryEntry = {
    id,
    title:
      fields.title?.trim() ||
      path.parse(fileName).name ||
      id,
    category: fields.category?.trim() || '未分类',
    area: fields.area?.trim() || undefined,
    place: fields.place?.trim() || undefined,
    description: fields.description?.trim() || '',
    date,
    width,
    height,
    aspect: width / height,
    lat: metadata.latitude ?? undefined,
    lon: metadata.longitude ?? undefined,
    city: undefined,
    country: undefined,
    locationName: undefined,
    accent: accentFor(id),
  };

  const thumbKey = `gallery/${id}.webp`;
  const mediumKey = `gallery/medium/${id}.webp`;
  const originalKey = `gallery/original/${id}${originalExt}`;
  const liveKey = video
    ? `gallery/live/${id}${path.extname(video.fileName).toLowerCase() || '.mov'}`
    : undefined;

  const files: ProcessedFile[] = [
    {
      key: thumbKey,
      buffer: thumbnail,
      contentType: 'image/webp',
      sha256: sha256(thumbnail),
    },
    {
      key: mediumKey,
      buffer: medium,
      contentType: 'image/webp',
      sha256: sha256(medium),
    },
    {
      key: originalKey,
      buffer: originalBuffer,
      contentType: heic ? 'image/jpeg' : contentTypeForExtension(sourceExt),
      sha256: sha256(originalBuffer),
    },
  ];

  if (video && liveKey) {
    files.push({
      key: liveKey,
      buffer: video.buffer,
      contentType: contentTypeForExtension(
        path.extname(video.fileName)
      ),
      sha256: sha256(video.buffer),
    });
  }

  const byKey = new Map(files.map((file) => [file.key, file]));
  const assetRecord = (key: string): GalleryAssetRecord => {
    const file = byKey.get(key)!;
    return {
      key,
      sha256: file.sha256,
      size: file.buffer.length,
      contentType: file.contentType,
    };
  };

  const assets: GalleryManifestEntry = {
    thumbnail: assetRecord(thumbKey),
    medium: assetRecord(mediumKey),
    original: assetRecord(originalKey),
  };
  if (liveKey) assets.live = assetRecord(liveKey);

  const meta: GalleryMeta = {
    params: metadata.params,
    sections: metadata.sections,
    tags: tagsList,
    histogram,
    fileSize: imageBuffer.length,
    isLivePhoto: Boolean(video),
    liveVideo: liveKey ?? null,
    altitude: metadata.altitude,
  };

  return {
    id,
    entry,
    meta,
    assets,
    placeholder: `data:image/webp;base64,${placeholder.toString('base64')}`,
    files,
    sourceName: fileName,
  };
}

