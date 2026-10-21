import fs from 'node:fs/promises';
import path from 'node:path';

import type { GalleryManifestEntry } from '../../src/types/gallery-manifest';
import {
  deleteR2Object,
  isR2Configured,
  LOCAL_GALLERY_DIR,
  putR2Object,
  readStorage,
} from './config';
import type { ProcessedFile } from './processing';

function localPath(key: string) {
  const relative = key.replace(/^\/+/, '');
  if (!relative.startsWith('gallery/')) {
    throw new Error(`Unexpected gallery key: ${key}`);
  }
  const absolute = path.resolve(process.cwd(), 'public', relative);
  const root = path.resolve(process.cwd(), 'public', 'gallery');
  if (!absolute.startsWith(root + path.sep)) {
    throw new Error(`Invalid gallery key: ${key}`);
  }
  return absolute;
}

async function writeLocal(file: ProcessedFile) {
  const absolute = localPath(file.key);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, file.buffer);
}

export async function saveFiles(
  files: ProcessedFile[],
  assets: GalleryManifestEntry
): Promise<GalleryManifestEntry> {
  const storage = await readStorage();

  if (storage.provider === 'r2' && !isR2Configured()) {
    throw new Error('R2 尚未配置，无法上传。请先在“存储配置”里填写并测试。');
  }

  for (const file of files) {
    if (storage.provider === 'r2') {
      await putR2Object(
        file.key,
        file.buffer,
        file.contentType,
        file.sha256
      );
    } else {
      await writeLocal(file);
    }
  }

  const stamp = new Date().toISOString();
  for (const asset of Object.values(assets)) {
    if (!asset) continue;
    asset.uploadedAt = stamp;
    asset.provider = storage.provider;
  }

  return assets;
}

export async function deleteFiles(keys: string[]) {
  const storage = await readStorage();

  for (const key of keys) {
    if (!key.startsWith('gallery/')) continue;

    if (storage.provider === 'r2') {
      if (!isR2Configured()) continue;
      try {
        await deleteR2Object(key);
      } catch (error) {
        console.warn(`R2 delete failed for ${key}:`, error);
      }
    } else {
      await fs.rm(localPath(key), { force: true });
    }
  }
}

export async function localDirectory() {
  return LOCAL_GALLERY_DIR;
}
