#!/usr/bin/env node
/**
 * Rebuild src/data/gallery-meta.json with grouped EXIF sections.
 *
 * Reads originals from public/gallery/original, keeps existing histogram /
 * live-photo / altitude data, and updates the metadata sections. Run with:
 *
 *   npm run gallery:meta
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ExifTool } from 'exiftool-vendored';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINAL_DIR = path.join(ROOT, 'public', 'gallery', 'original');
const META_PATH = path.join(ROOT, 'src', 'data', 'gallery-meta.json');
const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.hif',
  '.tif',
  '.tiff',
]);

function text(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join('、');
  if (typeof value === 'object' && typeof value.toString === 'function') {
    const rendered = value.toString().trim();
    return rendered && rendered !== '[object Object]' ? rendered : null;
  }
  return String(value);
}

function number(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ExifTool often returns measured values with units, e.g. "20.0 mm" or
// "1/4000". Extract the first numeric part for display formatting.
function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === undefined || value === null || value === '') return null;
  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value, digits = 1) {
  const parsed = number(value);
  if (parsed === null) return null;
  return parsed
    .toFixed(digits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function formatFileSize(bytes) {
  const parsed = number(bytes);
  if (!parsed || parsed <= 0) return null;
  if (parsed >= 1024 * 1024) {
    return `${(parsed / 1024 / 1024).toFixed(2)} MB`;
  }
  return `${Math.round(parsed / 1024)} KB`;
}

function formatDateTime(value) {
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
  );
  if (!match) return raw;
  return `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}`;
}

function formatTimezone(tags) {
  const raw = text(
    tags.OffsetTimeOriginal ?? tags.OffsetTime ?? tags.OffsetTimeDigitized ?? tags.tz
  );
  if (!raw) return null;
  if (/^[+-]\d{2}:\d{2}$/.test(raw)) return `UTC${raw}`;
  if (/^[+-]\d{4}$/.test(raw)) {
    return `UTC${raw.slice(0, 3)}:${raw.slice(3)}`;
  }
  return raw.replace(/^UTC/, 'UTC');
}

function formatExposureTime(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.includes('/')) {
    return `${value.trim()} s`;
  }
  const parsed = parseNumber(value);
  if (parsed === null || parsed <= 0) return null;
  if (parsed >= 1) return `${formatNumber(parsed, 2)} s`;
  return `1/${Math.round(1 / parsed)} s`;
}

function formatAperture(value) {
  const parsed = parseNumber(value);
  return parsed ? `f/${formatNumber(parsed, 1)}` : null;
}

function formatExposureCompensation(value) {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  const prefix = parsed > 0 ? '+' : '';
  return `${prefix}${formatNumber(parsed, 1)} EV`;
}

function colorSpace(tags) {
  const profile = text(tags.ProfileDescription);
  const exifSpace = text(tags.ColorSpace);
  if (profile && /srgb/i.test(profile)) return 'sRGB';
  if (profile && /display p3/i.test(profile)) return 'Display P3';
  return profile ?? exifSpace;
}

function uniqueTags(tags) {
  const values = [
    ...(Array.isArray(tags.Subject) ? tags.Subject : [tags.Subject]),
    ...(Array.isArray(tags.Keywords) ? tags.Keywords : [tags.Keywords]),
    ...(Array.isArray(tags.HierarchicalSubject)
      ? tags.HierarchicalSubject
      : [tags.HierarchicalSubject]),
  ]
    .map(text)
    .filter(Boolean);

  return [...new Set(values)];
}

function rows(entries) {
  return entries
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value: String(value) }));
}

const SECTION_ORDER = ['basic', 'shooting', 'device', 'mode', 'technical'];
const SECTION_TITLES = {
  basic: 'BASIC // 基本信息',
  shooting: 'EXIF // 拍摄参数',
  device: 'DEVICE // 设备信息',
  mode: 'MODE // 拍摄模式',
  technical: 'TECH // 技术参数',
};

/**
 * Some JPEGs exported from the gallery have had their EXIF stripped while the
 * older chronoframe-only metadata still has the useful fields. Keep those
 * fields instead of losing them when regenerating the file.
 */
function applyLegacyParams(sections, legacyParams = []) {
  const legacy = new Map(
    legacyParams
      .filter((param) => param?.label && param?.value)
      .map((param) => [param.label, param.value])
  );
  const get = (...labels) => {
    for (const label of labels) {
      if (legacy.has(label)) return legacy.get(label);
    }
    return null;
  };

  const ensure = (sectionId, label, value) => {
    if (!value) return;
    let section = sections.find((entry) => entry.id === sectionId);
    if (!section) {
      section = {
        id: sectionId,
        title: SECTION_TITLES[sectionId],
        params: [],
      };
      sections.push(section);
    }
    if (!section.params.some((param) => param.label === label)) {
      section.params.push({ label, value: String(value) });
    }
  };

  ensure('basic', '分辨率', get('分辨率'));
  ensure('basic', '色彩空间', get('色彩空间'));
  ensure('shooting', '焦距', get('焦距'));
  ensure('shooting', '光圈', get('光圈'));
  ensure('shooting', '曝光时间', get('快门', '曝光时间'));
  ensure('shooting', 'ISO', get('ISO'));
  ensure('shooting', '曝光补偿', get('曝光补偿'));
  ensure('device', '相机', get('相机'));
  ensure('device', '镜头', get('镜头'));
  ensure('mode', '白平衡', get('白平衡'));
  ensure('mode', '测光模式', get('测光', '测光模式'));

  sections.sort(
    (a, b) => SECTION_ORDER.indexOf(a.id) - SECTION_ORDER.indexOf(b.id)
  );
  return sections;
}

async function buildSections(tags, fileName, fileSize) {
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
  const lens = text(tags.LensModel ?? tags.Lens ?? tags.LensID);
  const maxApertureApex = parseNumber(tags.MaxApertureValue);
  const maxAperture =
    maxApertureApex !== null
      ? formatAperture(2 ** (maxApertureApex / 2))
      : null;
  const focalLength = parseNumber(tags.FocalLength);
  const focalLength35mm = parseNumber(tags.FocalLengthIn35mmFormat);
  const saturation = parseNumber(tags.Saturation);
  const brightness = parseNumber(tags.BrightnessValue);
  const focalPlaneX = parseNumber(tags.FocalPlaneXResolution);
  const focalPlaneY = parseNumber(tags.FocalPlaneYResolution);

  return [
    {
      id: 'basic',
      title: 'BASIC // 基本信息',
      params: rows([
        ['文件名', fileName],
        ['文件大小', formatFileSize(fileSize)],
        [
          '分辨率',
          width && height ? `${width} × ${height}` : null,
        ],
        [
          '像素',
          megapixels !== null ? `${megapixels.toFixed(2)} MP` : null,
        ],
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
        ['焦距', focalLength !== null ? `${formatNumber(focalLength, 2)} mm` : null],
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
        ['饱和度', saturation !== null ? formatNumber(saturation, 1) : null],
      ]),
    },
    {
      id: 'device',
      title: 'DEVICE // 设备信息',
      params: rows([
        ['相机', camera],
        ['镜头', lens],
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
}

async function main() {
  const existingRaw = await fs.readFile(META_PATH, 'utf8');
  const existing = JSON.parse(existingRaw.replace(/^\uFEFF/, ''));
  const files = (await fs.readdir(ORIGINAL_DIR))
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort();

  if (!files.length) {
    throw new Error(`No source images in ${ORIGINAL_DIR}`);
  }

  const exiftool = new ExifTool({ taskTimeoutMillis: 30_000 });
  const result = { ...existing };

  try {
    for (const file of files) {
      const stem = path.parse(file).name;
      const sourcePath = path.join(ORIGINAL_DIR, file);
      const stat = await fs.stat(sourcePath);
      const tags = await exiftool.read(sourcePath);
      const sections = applyLegacyParams(
        await buildSections(tags, file, stat.size),
        existing[stem]?.params
      );
      const params = sections.flatMap((section) => section.params);

      result[stem] = {
        ...existing[stem],
        fileSize: stat.size,
        sections,
        params,
        tags: uniqueTags(tags),
      };

      console.log(
        `${stem}: ${sections.map((section) => section.params.length).join(' + ')} fields`
      );
    }
  } finally {
    await exiftool.end();
  }

  await fs.writeFile(META_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${META_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

