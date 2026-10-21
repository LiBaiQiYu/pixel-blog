const HEIC_PATH_PATTERN = /\.(heic|heif|hif)$/i;
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

export function isHeicUrl(url: string): boolean {
  try {
    return HEIC_PATH_PATTERN.test(
      new URL(url, window.location.href).pathname
    );
  } catch {
    return /\.(heic|heif|hif)(?:[?#]|$)/i.test(url);
  }
}

/**
 * Detect HEIC/HEIF by MIME or the ISO BMFF `ftyp` brand. This also catches
 * HEIC files served from a URL that does not end with .heic.
 */
export async function isHeicBlob(blob: Blob): Promise<boolean> {
  if (blob.type === 'image/heic' || blob.type === 'image/heif') {
    return true;
  }
  if (blob.size < 12) return false;

  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const ftyp = String.fromCharCode(...header.subarray(4, 8));
  if (ftyp !== 'ftyp') return false;

  const brand = String.fromCharCode(...header.subarray(8, 12));
  return HEIC_BRANDS.has(brand.toLowerCase());
}

/**
 * Lazily load the libheif-based decoder. Only browsers that cannot decode
 * HEIC natively ever download this chunk. Converted JPEGs are cached briefly
 * so reopening a photo does not repeat the expensive WASM decode.
 */
const conversionCache = new Map<string, Blob>();
const MAX_CACHE_ENTRIES = 3;

export async function convertHeicToJpeg(
  blob: Blob,
  cacheKey: string
): Promise<Blob> {
  const cached = conversionCache.get(cacheKey);
  if (cached) return cached;

  const { heicTo } = await import('heic-to');
  const jpeg = await heicTo({
    blob,
    type: 'image/jpeg',
    quality: 0.94,
  });

  if (conversionCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = conversionCache.keys().next().value;
    if (oldest) conversionCache.delete(oldest);
  }
  conversionCache.set(cacheKey, jpeg);
  return jpeg;
}
