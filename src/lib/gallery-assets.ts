import type { GalleryAssetRecord } from '../types/gallery-manifest';
import galleryStorageJson from '../data/gallery-storage.json';
import { APP_ENV } from './app-env';

const BASE = (
  APP_ENV.galleryBaseUrl ||
  galleryStorageJson.publicBaseUrl ||
  ''
).replace(/\/+$/, '');

function isAbsolute(value: string) {
  return /^(https?:|data:|blob:)/.test(value);
}

/**
 * Resolve a manifest asset to its public URL. When the R2 base URL is not
 * configured, the same key resolves to a local `/gallery/...` path so local
 * development still works without credentials.
 */
export function galleryAsset(
  asset?: Pick<GalleryAssetRecord, 'key' | 'sha256'> | null
): string | undefined {
  if (!asset?.key) return undefined;

  if (isAbsolute(asset.key)) return asset.key;

  const key = asset.key.replace(/^\/+/, '');
  const url = BASE ? `${BASE}/${key}` : `/${key}`;
  const version = asset.sha256?.slice(0, 12);
  return version ? `${url}?v=${version}` : url;
}

/**
 * Resolve a legacy local path (e.g. `/gallery/medium/x.webp`) through the same
 * base URL. Used only as a fallback when the manifest does not contain an
 * entry yet.
 */
export function galleryAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (isAbsolute(path)) return path;

  const key = path.replace(/^\/+/, '');
  return BASE ? `${BASE}/${key}` : `/${key}`;
}
