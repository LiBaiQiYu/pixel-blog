#!/usr/bin/env node
/**
 * Upload gallery assets to Cloudflare R2 and maintain
 * src/data/gallery-manifest.json.
 *
 *   npm run gallery:manifest        # local hashes only, no R2 credentials
 *   npm run gallery:upload          # upload changed files, then write manifest
 *   npm run gallery:upload -- --dry-run
 *   npm run gallery:upload -- --prune
 *
 * Credentials live in .env.local / CI secrets, never in the client bundle.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'public', 'gallery');
const MANIFEST_PATH = path.join(ROOT, 'src', 'data', 'gallery-manifest.json');

dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
dotenv.config({
  path: path.join(ROOT, '.gallery-admin.env'),
  quiet: true,
  override: true,
});

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const manifestOnly = args.has('--manifest-only');
const prune = args.has('--prune');
const force = args.has('--force');
const prefix = (process.env.R2_PREFIX ?? 'gallery').replace(/^\/+|\/+$/g, '');
const cacheControl =
  process.env.R2_CACHE_CONTROL ?? 'public, max-age=31536000, immutable';

const CONTENT_TYPES = new Map([
  ['.webp', 'image/webp'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.bmp', 'image/bmp'],
  ['.tif', 'image/tiff'],
  ['.tiff', 'image/tiff'],
  ['.heic', 'image/heic'],
  ['.heif', 'image/heif'],
  ['.hif', 'image/heif'],
  ['.mp4', 'video/mp4'],
  ['.mov', 'video/quicktime'],
  ['.m4v', 'video/x-m4v'],
  ['.webm', 'video/webm'],
]);

function contentTypeFor(filePath) {
  return CONTENT_TYPES.get(path.extname(filePath).toLowerCase());
}

function kindFor(relativePath) {
  const parts = relativePath.split('/');
  const fileName = parts.pop();
  if (!fileName) return null;

  if (parts.length === 0) return 'thumbnail';
  if (parts.length !== 1) return null;

  switch (parts[0]) {
    case 'thumbnail':
    case 'thumbnails':
      return 'thumbnail';
    case 'medium':
      return 'medium';
    case 'original':
      return 'original';
    case 'live':
      return 'live';
    default:
      return null;
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }

  return files;
}

async function sha256(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function flattenManifest(manifest) {
  const byKey = new Map();
  for (const [photoId, entry] of Object.entries(manifest?.objects ?? {})) {
    for (const [kind, asset] of Object.entries(entry ?? {})) {
      if (asset?.key) byKey.set(asset.key, { photoId, kind, ...asset });
    }
  }
  return byKey;
}

async function readOldManifest() {
  try {
    return JSON.parse(
      (await fs.readFile(MANIFEST_PATH, 'utf8')).replace(/^\uFEFF/, '')
    );
  } catch {
    return { objects: {} };
  }
}

async function buildManifest() {
  const absoluteFiles = (await walk(SOURCE_DIR)).sort();
  const objects = {};
  const files = [];

  for (const absolute of absoluteFiles) {
    const contentType = contentTypeFor(absolute);
    if (!contentType) continue;

    const relative = path
      .relative(SOURCE_DIR, absolute)
      .split(path.sep)
      .join('/');
    const kind = kindFor(relative);
    if (!kind) continue;

    const photoId = path.parse(relative).name;
    const stat = await fs.stat(absolute);
    const asset = {
      key: [prefix, relative].filter(Boolean).join('/'),
      sha256: await sha256(absolute),
      size: stat.size,
      contentType,
    };

    objects[photoId] ??= {};
    objects[photoId][kind] = asset;
    files.push({ absolute, relative, asset });
  }

  const sortedObjects = {};
  for (const photoId of Object.keys(objects).sort()) {
    sortedObjects[photoId] = objects[photoId];
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    prefix,
    objects: sortedObjects,
    files,
  };
}

async function writeManifest(manifest) {
  const { files: _files, ...output } = manifest;
  await fs.writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8'
  );
}

function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined);

  if (!process.env.R2_BUCKET) {
    throw new Error('R2_BUCKET is missing in .env.local');
  }
  if (
    !endpoint ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      'R2_ACCOUNT_ID (or R2_ENDPOINT), R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required'
    );
  }

  return new S3Client({
    region: process.env.R2_REGION || 'auto',
    endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

async function main() {
  if (!(await fs.stat(SOURCE_DIR).catch(() => null))) {
    throw new Error(`Gallery source directory not found: ${SOURCE_DIR}`);
  }

  const oldManifest = await readOldManifest();
  const oldByKey = flattenManifest(oldManifest);
  const manifest = await buildManifest();
  const newByKey = new Map(
    manifest.files.map((file) => [file.asset.key, file])
  );

  // Keep the timestamp for files that are still identical, so the manifest
  // remains an accurate record of what is actually in R2.
  for (const file of manifest.files) {
    const previous = oldByKey.get(file.asset.key);
    if (
      previous &&
      previous.sha256 === file.asset.sha256 &&
      previous.uploadedAt
    ) {
      file.asset.uploadedAt = previous.uploadedAt;
      file.asset.provider = previous.provider;
    }
  }

  if (manifest.files.length === 0) {
    throw new Error(`No supported assets found in ${SOURCE_DIR}`);
  }

  console.log(`Found ${manifest.files.length} assets under ${prefix}/`);

  if (manifestOnly) {
    await writeManifest(manifest);
    console.log(`Wrote ${MANIFEST_PATH}`);
    return;
  }

  const changed = manifest.files.filter(
    (file) =>
      force ||
      oldByKey.get(file.asset.key)?.provider !== 'r2' ||
      !oldByKey.get(file.asset.key)?.uploadedAt ||
      oldByKey.get(file.asset.key)?.sha256 !== file.asset.sha256
  );
  const removed = [...oldByKey.keys()].filter((key) => !newByKey.has(key));

  console.log(
    `Uploads: ${changed.length}, skipped: ${manifest.files.length - changed.length}${
      prune ? `, prune: ${removed.length}` : ''
    }`
  );

  if (dryRun) {
    for (const file of changed) {
      console.log(`  PUT ${file.asset.key} (${file.asset.contentType})`);
    }
    if (prune) {
      for (const key of removed) console.log(`  DELETE ${key}`);
    }
    console.log('Dry run: nothing was uploaded and the manifest was not changed.');
    return;
  }

  const client = createR2Client();
  const bucket = process.env.R2_BUCKET;

  for (const [index, file] of changed.entries()) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: file.asset.key,
        Body: await fs.readFile(file.absolute),
        ContentType: file.asset.contentType,
        CacheControl: cacheControl,
        Metadata: { sha256: file.asset.sha256 },
      })
    );
    file.asset.uploadedAt = new Date().toISOString();
    file.asset.provider = 'r2';
    console.log(
      `[${index + 1}/${changed.length}] uploaded ${file.asset.key}`
    );
  }

  if (prune && removed.length > 0) {
    for (const key of removed) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key })
      );
      console.log(`deleted ${key}`);
    }
  }

  await writeManifest(manifest);
  console.log(`Wrote ${MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});



