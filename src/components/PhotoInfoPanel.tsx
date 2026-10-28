'use client';

import React, { lazy, Suspense, useMemo } from 'react';
import { Camera, MapPin } from 'lucide-react';
import type { ThemeMode } from '../types/blog';
import type { GalleryPhoto } from '../types/gallery';

const PhotoMiniMap = lazy(() =>
  import('./PhotoMiniMap').then((module) => ({
    default: module.PhotoMiniMap,
  }))
);

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatCoords(lat: number, lon: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}°${ns}, ${Math.abs(lon).toFixed(5)}°${ew}`;
}

function buildSmoothArea(values: number[], width: number, height: number) {
  const n = values.length;
  if (n === 0) return `M 0 ${height} L ${width} ${height} Z`;
  const pts = values.map((v, i) => ({
    x: (i / (n - 1)) * width,
    y: height - Math.max(0.01, Math.min(1, v)) * height,
  }));

  let d = `M 0 ${height} L ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(
      1
    )} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  d += ` L ${width} ${height} Z`;
  return d;
}

const CHANNELS = [
  { key: 'r' as const, label: 'R', color: '#F87171', dark: '#FCA5A5' },
  { key: 'g' as const, label: 'G', color: '#34D399', dark: '#6EE7B7' },
  { key: 'b' as const, label: 'B', color: '#60A5FA', dark: '#93C5FD' },
];

const RgbHistogram: React.FC<{
  histogram: { r: number[]; g: number[]; b: number[] };
  theme: ThemeMode;
}> = ({ histogram, theme }) => {
  const isDark = theme === 'dark';
  const width = 320;
  const height = 96;
  const paths = useMemo(
    () =>
      CHANNELS.map((channel) => ({
        ...channel,
        path: buildSmoothArea(histogram[channel.key], width, height),
      })),
    [histogram]
  );

  return (
    <div
      className={`rounded-xl border p-3 ${
        isDark
          ? 'bg-slate-950/60 border-white/10'
          : 'bg-white/60 border-slate-300/70'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`font-mono text-[10px] tracking-wide ${
            isDark ? 'text-cyan-300' : 'text-sky-600'
          }`}
        >
          RGB HISTOGRAM
        </span>
        <div className="flex items-center gap-2.5">
          {CHANNELS.map((channel) => (
            <span
              key={channel.key}
              className={`flex items-center gap-1 font-mono text-[9px] ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: isDark ? channel.dark : channel.color,
                }}
              />
              {channel.label}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-[104px] w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="RGB histogram"
      >
        <defs>
          {paths.map((channel) => (
            <linearGradient
              key={channel.key}
              id={`hist-${channel.key}-${isDark ? 'dark' : 'light'}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={isDark ? channel.dark : channel.color}
                stopOpacity={isDark ? 0.55 : 0.4}
              />
              <stop
                offset="100%"
                stopColor={isDark ? channel.dark : channel.color}
                stopOpacity={0.03}
              />
            </linearGradient>
          ))}
        </defs>

        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
            stroke={isDark ? 'rgba(148,163,184,0.16)' : 'rgba(100,116,139,0.18)'}
            strokeWidth={0.7}
            strokeDasharray="3 4"
          />
        ))}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={`v-${ratio}`}
            x1={width * ratio}
            x2={width * ratio}
            y1={0}
            y2={height}
            stroke={isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.12)'}
            strokeWidth={0.7}
            strokeDasharray="3 4"
          />
        ))}

        <g style={{ mixBlendMode: isDark ? 'screen' : 'multiply' }}>
          {paths.map((channel) => (
            <path
              key={channel.key}
              d={channel.path}
              fill={`url(#hist-${channel.key}-${isDark ? 'dark' : 'light'})`}
              stroke={isDark ? channel.dark : channel.color}
              strokeWidth={1.1}
              strokeLinejoin="round"
            />
          ))}
        </g>

        <line
          x1={0}
          x2={width}
          y1={height - 0.5}
          y2={height - 0.5}
          stroke={isDark ? 'rgba(226,232,240,0.25)' : 'rgba(71,85,105,0.3)'}
          strokeWidth={1}
        />
      </svg>

      <div
        className={`mt-1 flex justify-between font-mono text-[9px] ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        {[0, 64, 128, 192, 255].map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
};

interface PhotoInfoPanelProps {
  photo: GalleryPhoto;
  theme: ThemeMode;
}

export const PhotoInfoPanel: React.FC<PhotoInfoPanelProps> = ({
  photo,
  theme,
}) => {
  const coords =
    typeof photo.lat === 'number' && typeof photo.lon === 'number'
      ? { lat: photo.lat, lon: photo.lon }
      : null;

  const sections = useMemo(() => {
    const base = photo.meta.sections?.length
      ? photo.meta.sections
      : [
          {
            id: 'exif',
            title: 'EXIF // 拍摄参数',
            params: photo.meta.params,
          },
        ];

    return base.map((section) => {
      if (section.id !== 'basic') return section;

      const params = [...section.params];
      const add = (label: string, value: string) => {
        if (!params.some((param) => param.label === label)) {
          params.push({ label, value });
        }
      };

      add('拍摄时间', dateFormatter.format(new Date(photo.date)));
      add('相册', photo.category);
      add(
        '标签',
        photo.meta.tags?.length ? photo.meta.tags.join(' · ') : '—'
      );

      return { ...section, params };
    });
  }, [photo]);

  return (
    <div className="space-y-4 text-slate-700 dark:text-slate-200">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-sky-600 dark:text-cyan-300">
          <Camera className="h-3 w-3" />
          {photo.category}
          {photo.place ? ` · ${photo.place}` : ''}
        </div>
        <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white">
          {photo.title}
        </h2>
        <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
          {dateFormatter.format(new Date(photo.date))}
        </div>
        {photo.description && (
          <p className="pt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {photo.description}
          </p>
        )}
      </div>

      {(coords || photo.locationName) && (
        <div className="space-y-2">
          {coords && (
            <Suspense
              fallback={
                <div className="flex h-[150px] items-center justify-center rounded-xl border border-slate-300/60 bg-slate-100/60 font-mono text-[10px] text-slate-400 dark:border-white/15 dark:bg-slate-900/50">
                  LOADING MAP...
                </div>
              }
            >
              <PhotoMiniMap photo={photo} theme={theme} />
            </Suspense>
          )}
          <div className="flex items-start gap-1.5 font-mono text-[11px]">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-pink-500" />
            <div className="min-w-0">
              {coords && (
                <div className="text-sky-700 dark:text-cyan-200">
                  {formatCoords(coords.lat, coords.lon)}
                  {photo.meta.altitude !== null
                    ? ` · 海拔 ${Math.round(photo.meta.altitude)} m`
                    : ''}
                </div>
              )}
              {photo.locationName && (
                <div className="break-words leading-snug text-slate-500 dark:text-slate-400">
                  {photo.locationName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id} className="space-y-2">
          <div className="font-mono text-[10px] text-sky-600 dark:text-cyan-300">
            {section.title}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {section.params.map((param, paramIndex) => (
              <div
                key={`${section.id}-${param.label}-${paramIndex}`}
                className="min-w-0"
              >
                <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  {param.label}
                </div>
                <div
                  className="break-words font-mono text-[11px] leading-snug text-slate-800 dark:text-slate-100"
                  title={param.value}
                >
                  {param.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {photo.meta.histogram && (
        <RgbHistogram histogram={photo.meta.histogram} theme={theme} />
      )}

      <div className="flex items-center justify-between border-t border-slate-300/50 pt-1 font-mono text-[10px] text-slate-400 dark:border-white/10 dark:text-slate-500">
        <span>SOURCE: chronoframe</span>
      </div>
    </div>
  );
};
