import fs from 'node:fs/promises';
import path from 'node:path';

import type { GalleryEntry, GalleryMeta } from '../../src/types/gallery';
import type {
  GalleryAssetRecord,
  GalleryManifest,
} from '../../src/types/gallery-manifest';
import {
  ENTRIES_PATH,
  MANIFEST_PATH,
  META_PATH,
  PLACEHOLDERS_PATH,
  readJson,
  readStorage,
  writeJson,
} from './config';

export interface LibraryItem {
  entry: GalleryEntry;
  meta: GalleryMeta | null;
  assets: GalleryManifest['objects'][string] | undefined;
  previewUrl: string;
}

export interface UploadResult {
  id: string;
  entry: GalleryEntry;
  meta: GalleryMeta;
  assets: GalleryManifest['objects'][string];
  placeholder: string;
  keys: string[];
  previewUrl: string;
}

type DataFiles = {
  entries: GalleryEntry[];
  meta: Record<string, GalleryMeta>;
  manifest: GalleryManifest;
  placeholders: Record<string, string>;
};

let dataChain: Promise<unknown> = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const next = dataChain.then(task, task);
  dataChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function readData(): Promise<DataFiles> {
  return {
    entries: await readJson<GalleryEntry[]>(ENTRIES_PATH, []),
    meta: await readJson<Record<string, GalleryMeta>>(META_PATH, {}),
    manifest: await readJson<GalleryManifest>(MANIFEST_PATH, {
      version: 1,
      generatedAt: new Date().toISOString(),
      prefix: 'gallery',
      objects: {},
    }),
    placeholders: await readJson<Record<string, string>>(
      PLACEHOLDERS_PATH,
      {}
    ),
  };
}

async function writeData(data: DataFiles) {
  data.manifest.generatedAt = new Date().toISOString();
  await Promise.all([
    writeJson(ENTRIES_PATH, data.entries),
    writeJson(META_PATH, data.meta),
    writeJson(MANIFEST_PATH, data.manifest),
    writeJson(PLACEHOLDERS_PATH, data.placeholders),
  ]);
}

function previewUrl(key: string | undefined, publicBaseUrl: string) {
  if (!key) return '';
  const base = publicBaseUrl.replace(/\/+$/, '');
  return base
    ? `${base}/${key.replace(/^\/+/, '')}`
    : `/${key.replace(/^\/+/, '')}`;
}

export async function listLibrary(): Promise<LibraryItem[]> {
  const data = await readData();
  const storage = await readStorage();
  return data.entries.map((entry) => {
    const assets = data.manifest.objects[entry.id];
    return {
      entry,
      meta: data.meta[entry.id] ?? null,
      assets,
      previewUrl: previewUrl(assets?.thumbnail?.key, storage.publicBaseUrl),
    };
  });
}

export async function uniquePhotoId(preferred: string) {
  const data = await readData();
  const used = new Set([
    ...data.entries.map((entry) => entry.id),
    ...Object.keys(data.manifest.objects),
  ]);
  const base = preferred || `photo-${Date.now()}`;
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export async function saveUploadedPhoto(result: {
  id: string;
  entry: GalleryEntry;
  meta: GalleryMeta;
  assets: GalleryManifest['objects'][string];
  placeholder: string;
}): Promise<UploadResult> {
  return withLock(async () => {
    const data = await readData();
    const entryIndex = data.entries.findIndex(
      (entry) => entry.id === result.id
    );
    if (entryIndex >= 0) {
      data.entries[entryIndex] = result.entry;
    } else {
      data.entries.push(result.entry);
    }
    data.meta[result.id] = result.meta;
    data.manifest.objects[result.id] = result.assets;
    data.placeholders[result.id] = result.placeholder;
    await writeData(data);
    const storage = await readStorage();
    return {
      ...result,
      keys: Object.values(result.assets)
        .map((asset) => asset?.key)
        .filter((key): key is string => Boolean(key)),
      previewUrl: previewUrl(
        result.assets.thumbnail?.key,
        storage.publicBaseUrl
      ),
    };
  });
}

const EDITABLE_FIELDS = [
  'title',
  'description',
  'category',
  'area',
  'place',
  'date',
  'lat',
  'lon',
  'city',
  'country',
  'locationName',
  'locationVisible',
  'accent',
] as const;

export async function updateEntry(
  id: string,
  patch: Partial<GalleryEntry> & { tags?: string[] }
): Promise<LibraryItem | null> {
  return withLock(async () => {
    const data = await readData();
    const entry = data.entries.find((item) => item.id === id);
    if (!entry) return null;

    for (const field of EDITABLE_FIELDS) {
      if (patch[field] !== undefined) {
        (entry as unknown as Record<string, unknown>)[field] = patch[field];
      }
    }

    if (Array.isArray(patch.tags) && data.meta[id]) {
      data.meta[id].tags = patch.tags.filter(Boolean);
    }

    await writeData(data);
    const storage = await readStorage();
    const assets = data.manifest.objects[id];
    return {
      entry,
      meta: data.meta[id] ?? null,
      assets,
      previewUrl: previewUrl(assets?.thumbnail?.key, storage.publicBaseUrl),
    };
  });
}

export async function removeEntry(id: string): Promise<string[]> {
  return withLock(async () => {
    const data = await readData();
    const assets = data.manifest.objects[id];
    const keys = Object.values(assets ?? {})
      .map((asset) => asset?.key)
      .filter((key): key is string => Boolean(key));

    data.entries = data.entries.filter((entry) => entry.id !== id);
    delete data.meta[id];
    delete data.manifest.objects[id];
    delete data.placeholders[id];
    await writeData(data);
    return keys;
  });
}

export async function deleteLocalObjects(keys: string[]) {
  for (const key of keys) {
    if (!key.startsWith('gallery/')) continue;
    const absolute = path.join(process.cwd(), 'public', key);
    await fs.rm(absolute, { force: true });
  }
}
