import type {
  GalleryEntry,
  GalleryMeta,
  GalleryPhoto,
} from '../types/gallery';
import type { GalleryManifest } from '../types/gallery-manifest';
import { galleryAsset } from '../lib/gallery-assets';
import galleryEntriesJson from './gallery-entries.json';
import galleryManifestJson from './gallery-manifest.json';
import galleryMetaJson from './gallery-meta.json';
import galleryPlaceholdersJson from './gallery-placeholders.json';

const entries = galleryEntriesJson as GalleryEntry[];
const metaById = galleryMetaJson as Record<string, GalleryMeta>;
const placeholders = galleryPlaceholdersJson as Record<string, string>;
const manifest = galleryManifestJson as GalleryManifest;

export const GALLERY_PHOTOS: GalleryPhoto[] = entries
  .map((entry) => {
    const assets = manifest.objects[entry.id];
    const meta = metaById[entry.id];
    const original = galleryAsset(assets?.original);

    if (!meta || !original) return null;

    return {
      ...entry,
      src: galleryAsset(assets?.thumbnail) ?? `/gallery/${entry.id}.webp`,
      medium:
        galleryAsset(assets?.medium) ??
        `/gallery/medium/${entry.id}.webp`,
      original,
      placeholder: placeholders[entry.id] ?? '',
      meta: {
        ...meta,
        liveVideo: galleryAsset(assets?.live) ?? null,
      },
    } satisfies GalleryPhoto;
  })
  .filter((photo): photo is GalleryPhoto => photo !== null);

export const GALLERY_CATEGORIES = [
  '全部',
  ...Array.from(new Set(GALLERY_PHOTOS.map((photo) => photo.category))),
];
