import type {
  GalleryParam,
  GallerySection,
} from '../../src/types/gallery';

type ExifTags = Record<string, any>;

function text(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join('、');
  if (typeof value === 'object' && 'toString' in value) {
    const rendered = String(value).trim();
    return rendered && rendered !== '[object Object]' ? rendered : null;
  }
  return String(value);
}

function number(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === undefined || value === null || value === '') return null;
  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: unknown, digits = 1): string | null {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return parsed
    .toFixed(digits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function formatFileSize(bytes: number) {
  if (!bytes || bytes <= 0) return null;
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

function formatDateTime(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw.replace(
    /^(\d{4}):(\d{2}):(\d{2})/,
    '$1-$2-$3'
  );
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
  );
  return match
    ? `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}`
    : raw;
}

function formatTimezone(tags: ExifTags) {
  const raw = text(
    tags.OffsetTimeOriginal ??
      tags.OffsetTime ??
      tags.OffsetTimeDigitized ??
      tags.tz
  );
  if (!raw) return null;
  if (/^[+-]\d{2}:\d{2}$/.test(raw)) return `UTC${raw}`;
  if (/^[+-]\d{4}$/.test(raw)) {
    return `UTC${raw.slice(0, 3)}:${raw.slice(3)}`;
  }
  return raw;
}

function formatExposureTime(value: unknown) {
  if (typeof value === 'string' && value.includes('/')) {
    return `${value.trim()} s`;
  }
  const parsed = parseNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed >= 1
    ? `${formatNumber(parsed, 2)} s`
    : `1/${Math.round(1 / parsed)} s`;
}

function formatAperture(value: unknown) {
  const parsed = parseNumber(value);
  return parsed ? `f/${formatNumber(parsed, 1)}` : null;
}

function formatExposureCompensation(value: unknown) {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return `${parsed > 0 ? '+' : ''}${formatNumber(parsed, 1)} EV`;
}

function colorSpace(tags: ExifTags) {
  const profile = text(tags.ProfileDescription);
  const exifSpace = text(tags.ColorSpace);
  if (profile && /srgb/i.test(profile)) return 'sRGB';
  if (profile && /display p3/i.test(profile)) return 'Display P3';
  return profile ?? exifSpace;
}

function uniqueTags(tags: ExifTags) {
  const values = [
    ...(Array.isArray(tags.Subject) ? tags.Subject : [tags.Subject]),
    ...(Array.isArray(tags.Keywords) ? tags.Keywords : [tags.Keywords]),
    ...(Array.isArray(tags.HierarchicalSubject)
      ? tags.HierarchicalSubject
      : [tags.HierarchicalSubject]),
  ]
    .map(text)
    .filter(Boolean) as string[];

  return [...new Set(values)];
}

function rows(entries: [string, string | null][]) {
  return entries
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value: String(value) }));
}

export interface MetadataResult {
  sections: GallerySection[];
  params: GalleryParam[];
  tags: string[];
  altitude: number | null;
  width: number | null;
  height: number | null;
  date: string;
  latitude: number | null;
  longitude: number | null;
}

export function buildMetadata(
  tags: ExifTags,
  fileName: string,
  fileSize: number
): MetadataResult {
  const orientation = number(tags.Orientation) ?? 1;
  let width = number(tags.ImageWidth) ?? number(tags.ExifImageWidth);
  let height = number(tags.ImageHeight) ?? number(tags.ExifImageHeight);
  if (orientation >= 5 && orientation <= 8 && width && height) {
    [width, height] = [height, width];
  }

  const megapixels =
    width && height ? (width * height) / 1_000_000 : null;
  const make = text(tags.Make);
  const model = text(tags.Model);
  const camera =
    make && model
      ? model.toLowerCase().startsWith(make.toLowerCase())
        ? model
        : `${make} ${model}`
      : model ?? make;
  const maxApertureApex = parseNumber(tags.MaxApertureValue);
  const maxAperture =
    maxApertureApex !== null
      ? formatAperture(2 ** (maxApertureApex / 2))
      : null;
  const focalLength = parseNumber(tags.FocalLength);
  const focalLength35mm = parseNumber(tags.FocalLengthIn35mmFormat);
  const brightness = parseNumber(tags.BrightnessValue);
  const focalPlaneX = parseNumber(tags.FocalPlaneXResolution);
  const focalPlaneY = parseNumber(tags.FocalPlaneYResolution);
  const rawDate = text(tags.DateTimeOriginal);
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const date =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();

  let latitude = number(tags.GPSLatitude);
  let longitude = number(tags.GPSLongitude);
  if (latitude !== null && String(tags.GPSLatitudeRef ?? '').startsWith('S')) {
    latitude = -latitude;
  }
  if (longitude !== null && String(tags.GPSLongitudeRef ?? '').startsWith('W')) {
    longitude = -longitude;
  }

  const sections: GallerySection[] = [
    {
      id: 'basic',
      title: 'BASIC // 基本信息',
      params: rows([
        ['文件名', fileName],
        ['文件大小', formatFileSize(fileSize)],
        ['分辨率', width && height ? `${width} × ${height}` : null],
        ['像素', megapixels ? `${megapixels.toFixed(2)} MP` : null],
        ['拍摄时间', formatDateTime(tags.DateTimeOriginal)],
        ['时区', formatTimezone(tags)],
        ['色彩空间', colorSpace(tags)],
        ['艺术家', text(tags.Artist ?? tags.XPAuthor)],
        ['软件', text(tags.Software)],
      ]),
    },
    {
      id: 'shooting',
      title: 'EXIF // 拍摄参数',
      params: rows([
        [
          '焦距',
          focalLength !== null
            ? `${formatNumber(focalLength, 2)} mm`
            : null,
        ],
        [
          '35mm 等效',
          focalLength35mm !== null
            ? `${formatNumber(focalLength35mm, 0)} mm`
            : null,
        ],
        ['光圈', formatAperture(tags.FNumber)],
        ['曝光时间', formatExposureTime(tags.ExposureTime)],
        ['ISO', text(tags.ISO) ? `ISO ${text(tags.ISO)}` : null],
        ['曝光补偿', formatExposureCompensation(tags.ExposureCompensation)],
      ]),
    },
    {
      id: 'device',
      title: 'DEVICE // 设备信息',
      params: rows([
        ['相机', camera],
        ['镜头', text(tags.LensModel ?? tags.Lens ?? tags.LensID)],
        ['最大光圈', maxAperture],
      ]),
    },
    {
      id: 'mode',
      title: 'MODE // 拍摄模式',
      params: rows([
        ['白平衡', text(tags.WhiteBalance)],
        ['曝光程序', text(tags.ExposureProgram)],
        ['曝光模式', text(tags.ExposureMode)],
        ['测光模式', text(tags.MeteringMode)],
        ['闪光灯', text(tags.Flash)],
        ['场景捕捉类型', text(tags.SceneCaptureType)],
      ]),
    },
    {
      id: 'technical',
      title: 'TECH // 技术参数',
      params: rows([
        [
          '亮度',
          brightness !== null ? `${formatNumber(brightness, 1)} EV` : null,
        ],
        [
          '焦平面分辨率',
          focalPlaneX !== null && focalPlaneY !== null
            ? `${formatNumber(focalPlaneX, 2)} x ${formatNumber(focalPlaneY, 2)}`
            : null,
        ],
      ]),
    },
  ].filter((section) => section.params.length > 0);

  return {
    sections,
    params: sections.flatMap((section) => section.params),
    tags: uniqueTags(tags),
    altitude: parseNumber(tags.GPSAltitude),
    width: width ?? null,
    height: height ?? null,
    date,
    latitude,
    longitude,
  };
}
