export interface GalleryAssetRecord {
  key: string;
  sha256: string;
  size: number;
  contentType: string;
  uploadedAt?: string;
  provider?: 'local' | 'r2';
}

export type GalleryAssetKind =
  | 'thumbnail'
  | 'medium'
  | 'original'
  | 'live';

export interface GalleryManifestEntry {
  thumbnail?: GalleryAssetRecord;
  medium?: GalleryAssetRecord;
  original?: GalleryAssetRecord;
  live?: GalleryAssetRecord;
}

export interface GalleryManifest {
  version: number;
  generatedAt: string;
  prefix: string;
  objects: Record<string, GalleryManifestEntry>;
}

export interface GalleryStorage {
  provider: 'local' | 'r2';
  publicBaseUrl: string;
  bucket: string;
  prefix: string;
}
