import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

import type { GalleryStorage } from '../../src/types/gallery-manifest';

export const ROOT = process.cwd();
export const ENV_PATH = path.join(ROOT, '.env.local');
export const ADMIN_ENV_PATH = path.join(ROOT, '.gallery-admin.env');
export const STORAGE_PATH = path.join(
  ROOT,
  'src',
  'data',
  'gallery-storage.json'
);
export const MANIFEST_PATH = path.join(
  ROOT,
  'src',
  'data',
  'gallery-manifest.json'
);
export const ENTRIES_PATH = path.join(
  ROOT,
  'src',
  'data',
  'gallery-entries.json'
);
export const META_PATH = path.join(ROOT, 'src', 'data', 'gallery-meta.json');
export const PLACEHOLDERS_PATH = path.join(
  ROOT,
  'src',
  'data',
  'gallery-placeholders.json'
);

export const LOCAL_GALLERY_DIR = path.join(ROOT, 'public', 'gallery');

dotenv.config({ path: ENV_PATH, quiet: true });
dotenv.config({ path: ADMIN_ENV_PATH, quiet: true, override: true });

export const DEFAULT_STORAGE: GalleryStorage = {
  provider: 'local',
  publicBaseUrl: '',
  bucket: '',
  prefix: 'gallery',
};

export interface AdminConfigInput {
  provider?: 'local' | 'r2';
  publicBaseUrl?: string;
  bucket?: string;
  prefix?: string;
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  cacheControl?: string;
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(
      (await fs.readFile(filePath, 'utf8')).replace(/^\uFEFF/, '')
    ) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath: string, value: unknown) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(
    tempPath,
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8'
  );
  await fs.rename(tempPath, filePath);
}

export async function readStorage(): Promise<GalleryStorage> {
  return {
    ...DEFAULT_STORAGE,
    ...(await readJson<Partial<GalleryStorage>>(STORAGE_PATH, {})),
  };
}

export async function saveStorage(storage: GalleryStorage) {
  await writeJson(STORAGE_PATH, storage);
}

async function readEnvFile(): Promise<string> {
  try {
    return await fs.readFile(ADMIN_ENV_PATH, 'utf8');
  } catch {
    return '';
  }
}

async function writeEnvValues(values: Record<string, string>) {
  const existing = await readEnvFile();
  const lines = existing.split(/\r?\n/);
  const seen = new Set<string>();

  const next = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=/);
    if (!match) return line;
    const key = match[1];
    if (!(key in values)) return line;
    seen.add(key);
    return `${key}=${values[key]}`;
  });

  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }

  await fs.writeFile(
    ADMIN_ENV_PATH,
    `${next.join('\n').replace(/\n+$/, '')}\n`,
    'utf8'
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
}

export function getAdminToken() {
  return process.env.ADMIN_DEV_TOKEN?.trim() ?? '';
}

export function r2Endpoint() {
  return (
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : '')
  );
}

export function isR2Configured() {
  return Boolean(
    r2Endpoint() &&
      process.env.R2_BUCKET &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );
}

export function createR2Client() {
  const endpoint = r2Endpoint();
  if (
    !endpoint ||
    !process.env.R2_BUCKET ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY
  ) {
    throw new Error('R2 尚未配置完整');
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

export function publicUrlFor(key: string) {
  const base = (
    process.env.VITE_GALLERY_BASE_URL ||
    ''
  ).replace(/\/+$/, '');
  if (base) return `${base}/${key.replace(/^\/+/, '')}`;
  return `/${key.replace(/^\/+/, '')}`;
}

export async function getAdminConfig(port = 5173) {
  const storage = await readStorage();
  const accessKey = process.env.R2_ACCESS_KEY_ID ?? '';
  const secret = process.env.R2_SECRET_ACCESS_KEY ?? '';

  return {
    storage,
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyIdMasked: accessKey
      ? `${accessKey.slice(0, 4)}…${accessKey.slice(-4)}`
      : '',
    hasAccessKey: Boolean(accessKey),
    hasSecret: Boolean(secret),
    cacheControl:
      process.env.R2_CACHE_CONTROL ??
      'public, max-age=31536000, immutable',
    configured: isR2Configured(),
    networkUrls: getNetworkUrls(port),
  };
}

export async function saveAdminConfig(input: AdminConfigInput) {
  const provider = input.provider === 'r2' ? 'r2' : 'local';
  const currentStorage = await readStorage();
  const prefix =
    (input.prefix ?? currentStorage.prefix ?? 'gallery').replace(
      /^\/+|\/+$/g,
      ''
    ) || 'gallery';

  const values: Record<string, string> = {
    R2_PREFIX: prefix,
    R2_BUCKET: input.bucket ?? '',
    R2_ACCOUNT_ID: input.accountId ?? '',
    R2_CACHE_CONTROL:
      input.cacheControl ?? 'public, max-age=31536000, immutable',
  };

  values.R2_ACCESS_KEY_ID =
    input.accessKeyId || process.env.R2_ACCESS_KEY_ID || '';
  values.R2_SECRET_ACCESS_KEY =
    input.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '';

  await writeEnvValues(values);

  if (provider === 'r2') {
    let host = '';
    try {
      host = new URL(input.publicBaseUrl || '').hostname.toLowerCase();
    } catch {
      throw new Error(
        '请填写有效的 R2 公开访问域名（例如 https://img.example.com）'
      );
    }
    if (!host) {
      throw new Error('R2 模式需要填写公开访问域名');
    }
    if (host.endsWith('.r2.cloudflarestorage.com')) {
      throw new Error(
        '这是 S3 API Endpoint，不是公开访问域名。请使用 R2 自定义公开域名。'
      );
    }
  }

  const storage: GalleryStorage = {
    provider,
    publicBaseUrl: (input.publicBaseUrl ?? '').replace(/\/+$/, ''),
    bucket: input.bucket ?? '',
    prefix,
  };
  await saveStorage(storage);
  return storage;
}

export async function testStorage(origin = 'https://cwa1e.top') {
  const storage = await readStorage();

  if (storage.provider !== 'r2') {
    try {
      await fs.mkdir(LOCAL_GALLERY_DIR, { recursive: true });
      const testPath = path.join(LOCAL_GALLERY_DIR, '__connection_test__.txt');
      await fs.writeFile(testPath, 'ok', 'utf8');
      await fs.rm(testPath, { force: true });
      return {
        ok: true,
        provider: 'local',
        write: true,
        read: true,
        publicAccess: true,
        cors: true,
        message: '??????',
      };
    } catch (error) {
      return {
        ok: false,
        provider: 'local',
        error: error instanceof Error ? error.message : '???????',
      };
    }
  }

  if (!isR2Configured()) {
    return {
      ok: false,
      provider: 'r2',
      error: 'R2 ?????????? Account ID?Bucket?Access Key ? Secret',
    };
  }

  const prefix = (process.env.R2_PREFIX ?? storage.prefix ?? 'gallery').replace(/^\/+|\/+$/g, '');
  const key = [prefix, '__connection_test__', `${Date.now()}.txt`].filter(Boolean).join('/');
  const base = (process.env.VITE_GALLERY_BASE_URL || storage.publicBaseUrl || '').replace(/\/+$/, '');
  const url = base ? `${base}/${key}` : '';
  const client = createR2Client();
  const result = {
    ok: false,
    provider: 'r2' as const,
    write: false,
    read: false,
    publicAccess: false,
    cors: false,
    url,
    origin,
    status: null as number | null,
    preflightStatus: null as number | null,
    error: undefined as string | undefined,
  };

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: Buffer.from('pixel-blog-connection-test'),
        ContentType: 'text/plain',
      })
    );
    result.write = true;

    await client.send(
      new HeadObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })
    );
    result.read = true;

    if (!url) {
      result.error = 'R2 ???????????????';
      return result;
    }

    const head = await fetch(url, {
      method: 'HEAD',
      headers: { Origin: origin },
    });
    result.status = head.status;
    result.publicAccess = head.ok;
    result.cors = Boolean(head.headers.get('access-control-allow-origin'));

    const preflight = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'range',
      },
    });
    result.preflightStatus = preflight.status;
    const preflightCors = Boolean(
      preflight.headers.get('access-control-allow-origin')
    );

    if (!result.publicAccess) {
      result.error = `R2 ???????????? ${head.status}`;
    } else if (!result.cors || !preflightCors) {
      result.error = `????????? CORS ??? ${origin}`;
    } else {
      result.ok = true;
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'R2 ????';
    return result;
  } finally {
    try {
      await client.send(
        new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })
      );
    } catch {
      // Best effort cleanup; a failed test object is safer than hiding the error.
    }
    client.destroy();
  }
}

export async function putR2Object(
  key: string,
  body: Buffer,
  contentType: string,
  sha256: string
) {
  const client = createR2Client();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl:
          process.env.R2_CACHE_CONTROL ??
          'public, max-age=31536000, immutable',
        Metadata: { sha256 },
      })
    );
  } finally {
    client.destroy();
  }
}

export async function deleteR2Object(key: string) {
  if (!isR2Configured()) return;
  const client = createR2Client();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
      })
    );
  } finally {
    client.destroy();
  }
}

export async function testR2Bucket() {
  const client = createR2Client();
  try {
    await client.send(
      new HeadBucketCommand({ Bucket: process.env.R2_BUCKET! })
    );
    return { ok: true };
  } finally {
    client.destroy();
  }
}

export function getNetworkUrls(port = 5173) {
  const urls = new Set<string>();
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        urls.add(`http://${address.address}:5173/?admin=1`);
      }
    }
  }
  return [...urls];
}

