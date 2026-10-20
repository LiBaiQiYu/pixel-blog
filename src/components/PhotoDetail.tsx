import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { PhotoMiniMap } from './PhotoMiniMap';
import type { GalleryPhoto } from '../types/gallery';
import type { ThemeMode } from '../types/blog';

interface PhotoDetailProps {
  photo: GalleryPhoto;
  photos: GalleryPhoto[];
  theme: ThemeMode;
  onClose: () => void;
  onNavigate: (direction: 1 | -1) => void;
}

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

// Catmull-Rom -> cubic Bézier, for a smooth professional histogram curve
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
          ? 'bg-slate-950/70 border-white/10'
          : 'bg-white/70 border-slate-300/70'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] font-mono tracking-wide ${
            isDark ? 'text-cyan-300' : 'text-sky-600'
          }`}
        >
          RGB HISTOGRAM
        </span>
        <div className="flex items-center gap-2.5">
          {CHANNELS.map((channel) => (
            <span
              key={channel.key}
              className={`flex items-center gap-1 text-[9px] font-mono ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isDark ? channel.dark : channel.color }}
              />
              {channel.label}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[104px] block"
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

        {/* Grid */}
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

        {/* Channel curves: additive on dark, multiply on light (like photo editors) */}
        <g
          style={{
            mixBlendMode: isDark ? 'screen' : 'multiply',
          }}
        >
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

        {/* Baseline */}
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
        className={`mt-1 flex justify-between text-[9px] font-mono ${
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

export const PhotoDetail: React.FC<PhotoDetailProps> = ({
  photo,
  photos,
  theme,
  onClose,
  onNavigate,
}) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const [livePlaying, setLivePlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const index = useMemo(
    () => photos.findIndex((item) => item.id === photo.id),
    [photos, photo.id]
  );

  useEffect(() => {
    setVideoFailed(false);
    setLivePlaying(false);
  }, [photo.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onNavigate(-1);
      if (event.key === 'ArrowRight') onNavigate(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigate]);

  // Play / pause the live photo video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (livePlaying) {
      video.currentTime = 0;
      video.play().catch(() => {
        setLivePlaying(false);
        setVideoFailed(true);
      });
    } else {
      video.pause();
    }
  }, [livePlaying, photo.id]);

  const hasLiveVideo = Boolean(photo.meta.liveVideo) && !videoFailed;
  const isDark = theme === 'dark';

  return (
    <div
      className={`fixed inset-x-0 bottom-0 top-[4.6rem] z-50 p-2 sm:p-4 flex items-start justify-center animate-fadeIn backdrop-blur-xl ${
        isDark ? 'bg-slate-950/55' : 'bg-slate-100/35'
      }`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-full rounded-2xl overflow-hidden liquid-glass border border-slate-300/50 dark:border-white/15 shadow-2xl flex flex-col lg:flex-row"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top specular rim */}
        <div className="pointer-events-none absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-sky-400/50 via-white/70 to-pink-400/50 dark:from-cyan-400/60 dark:via-white/40 dark:to-pink-400/60 z-10" />

        {/* Media */}
        <div
          className={`relative lg:flex-1 flex items-center justify-center min-h-[34vh] lg:min-h-[68vh] ${
            isDark ? 'bg-black/35' : 'bg-slate-200/45'
          }`}
        >
          {livePlaying && hasLiveVideo ? (
            <video
              ref={videoRef}
              key={photo.id}
              src={photo.meta.liveVideo as string}
              poster={photo.view}
              autoPlay
              muted
              loop
              playsInline
              onError={() => {
                setVideoFailed(true);
                setLivePlaying(false);
              }}
              className="max-h-[46vh] lg:max-h-[70vh] w-full object-contain"
            />
          ) : (
            <img
              src={photo.view}
              alt={photo.title}
              className="max-h-[46vh] lg:max-h-[70vh] w-full object-contain"
            />
          )}

          {/* Badges (dark glass ensures readability over photos in both themes) */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950/80 text-cyan-300 border border-cyan-400/35">
              {index + 1} / {photos.length}
            </span>
            {hasLiveVideo && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-pink-500/90 text-white border border-pink-300/60">
                LIVE PHOTO
              </span>
            )}
          </div>

          {/* Live photo play button (still image by default, click to play) */}
          {hasLiveVideo && (
            <button
              type="button"
              onClick={() => setLivePlaying((prev) => !prev)}
              className="absolute bottom-3 left-3 z-10 px-2.5 py-1.5 rounded-lg liquid-glass-strong text-slate-800 dark:text-slate-100 border border-slate-300/70 dark:border-white/20 flex items-center gap-1.5 text-[11px] font-mono font-semibold hover:text-sky-600 dark:hover:text-cyan-300"
              title={livePlaying ? '暂停实况' : '播放实况照片'}
            >
              {livePlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-pink-500" />
                  <span>暂停实况</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-pink-500" />
                  <span>实况</span>
                </>
              )}
            </button>
          )}

          {/* Prev / Next: flex containers avoid transform conflicts with the global button lift */}
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 z-10">
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              className="p-2 rounded-full liquid-glass-strong text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-cyan-300 border border-slate-300/70 dark:border-white/20"
              title="上一张 (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-10">
            <button
              type="button"
              onClick={() => onNavigate(1)}
              className="p-2 rounded-full liquid-glass-strong text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-cyan-300 border border-slate-300/70 dark:border-white/20"
              title="下一张 (→)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-3 right-3 z-10">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full liquid-glass-strong text-slate-700 dark:text-slate-200 hover:text-rose-500 border border-slate-300/70 dark:border-white/20"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info panel: theme-aware, more transparent glass */}
        <div className="lg:w-[380px] shrink-0 overflow-y-auto p-5 space-y-4 border-t lg:border-t-0 lg:border-l border-slate-300/50 dark:border-white/10 bg-white/35 dark:bg-slate-950/40 backdrop-blur-2xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-600 dark:text-cyan-300">
              <Camera className="w-3 h-3" />
              {photo.area} · {photo.place}
            </div>
            <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white">
              {photo.title}
            </h2>
            <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
              {dateFormatter.format(new Date(photo.date))}
            </div>
            {photo.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                {photo.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <PhotoMiniMap photo={photo} theme={theme} />
            <div className="flex items-start gap-1.5 text-[11px] font-mono">
              <MapPin className="w-3 h-3 text-pink-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sky-700 dark:text-cyan-200">
                  {formatCoords(photo.lat, photo.lon)}
                  {photo.meta.altitude !== null
                    ? ` · 海拔 ${Math.round(photo.meta.altitude)} m`
                    : ''}
                </div>
                <div className="text-slate-500 dark:text-slate-400 leading-snug break-words">
                  {photo.locationName}
                </div>
              </div>
            </div>
          </div>

          {/* EXIF parameters */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-sky-600 dark:text-cyan-300">
              EXIF // 拍摄参数
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {photo.meta.params.map((param) => (
                <div key={param.label} className="min-w-0">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {param.label}
                  </div>
                  <div
                    className="text-[11px] font-mono text-slate-800 dark:text-slate-100 leading-snug break-words"
                    title={param.value}
                  >
                    {param.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RGB histogram (professional, non-pixel styling) */}
          <RgbHistogram histogram={photo.meta.histogram} theme={theme} />

          <div className="pt-1 border-t border-slate-300/50 dark:border-white/10 text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>SOURCE: chronoframe</span>
            <span>{photo.meta.isLivePhoto ? 'LIVE PHOTO' : 'STILL PHOTO'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
