import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
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

const HISTOGRAM_ROWS = [
  { key: 'r' as const, label: 'R', color: '#F87171' },
  { key: 'g' as const, label: 'G', color: '#34D399' },
  { key: 'b' as const, label: 'B', color: '#60A5FA' },
];

const Histogram: React.FC<{
  histogram: { r: number[]; g: number[]; b: number[] };
}> = ({ histogram }) => (
  <div className="rounded-xl border border-white/10 bg-black/50 p-3">
    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
      <span className="text-cyan-300">HISTOGRAM // RGB</span>
      <span>{histogram.r.length} BINS</span>
    </div>
    <div className="space-y-1.5">
      {HISTOGRAM_ROWS.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <span
            className="w-3 text-[10px] font-mono font-bold"
            style={{ color: row.color }}
          >
            {row.label}
          </span>
          <div className="flex-1 flex items-end gap-[2px] h-[26px] bg-white/5 px-1 py-0.5 rounded-sm">
            {histogram[row.key].map((value, index) => (
              <span
                key={index}
                className="flex-1 min-w-[2px]"
                style={{
                  height: `${Math.max(3, value * 100)}%`,
                  backgroundColor: row.color,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const PhotoDetail: React.FC<PhotoDetailProps> = ({
  photo,
  photos,
  theme,
  onClose,
  onNavigate,
}) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const index = useMemo(
    () => photos.findIndex((item) => item.id === photo.id),
    [photos, photo.id]
  );

  useEffect(() => {
    setVideoFailed(false);
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

  const isLive = Boolean(photo.meta.liveVideo) && !videoFailed;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-2 sm:p-5 flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[94dvh] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-slate-950/95 flex flex-col lg:flex-row"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Media */}
        <div className="relative lg:flex-1 bg-black flex items-center justify-center min-h-[34vh] lg:min-h-[72vh]">
          {isLive ? (
            <video
              key={photo.id}
              src={photo.meta.liveVideo as string}
              poster={photo.view}
              autoPlay
              muted
              loop
              playsInline
              controls
              onError={() => setVideoFailed(true)}
              className="max-h-[52vh] lg:max-h-[76vh] w-full object-contain"
            />
          ) : (
            <img
              src={photo.view}
              alt={photo.title}
              className="max-h-[52vh] lg:max-h-[76vh] w-full object-contain"
            />
          )}

          {/* Top-left badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950/80 text-cyan-300 border border-cyan-400/35">
              {index + 1} / {photos.length}
            </span>
            {isLive && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-pink-500/90 text-white border border-pink-300/60">
                LIVE PHOTO
              </span>
            )}
          </div>

          {/* Prev / Next */}
          <button
            type="button"
            onClick={() => onNavigate(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 text-slate-100 border border-white/20 hover:text-cyan-300"
            title="上一张 (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 text-slate-100 border border-white/20 hover:text-cyan-300"
            title="下一张 (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-slate-200 border border-white/20 hover:text-rose-400"
            title="关闭 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info panel: high-contrast dark glass for readability in both themes */}
        <div className="lg:w-[380px] shrink-0 overflow-y-auto p-5 space-y-4 text-slate-100 border-t lg:border-t-0 lg:border-l border-white/10 bg-slate-950/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
              <Camera className="w-3 h-3" />
              {photo.area} · {photo.place}
            </div>
            <h2 className="text-lg font-bold leading-snug">{photo.title}</h2>
            <div className="text-xs font-mono text-slate-300">
              {dateFormatter.format(new Date(photo.date))}
            </div>
            {photo.description && (
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {photo.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <PhotoMiniMap photo={photo} theme={theme} />
            <div className="flex items-start gap-1.5 text-[11px] font-mono text-slate-300">
              <MapPin className="w-3 h-3 text-pink-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-cyan-200">
                  {formatCoords(photo.lat, photo.lon)}
                  {photo.meta.altitude !== null
                    ? ` · 海拔 ${Math.round(photo.meta.altitude)} m`
                    : ''}
                </div>
                <div className="text-slate-400 leading-snug break-words">
                  {photo.locationName}
                </div>
              </div>
            </div>
          </div>

          {/* EXIF parameters */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-cyan-300">
              EXIF // 拍摄参数
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {photo.meta.params.map((param) => (
                <div key={param.label} className="min-w-0">
                  <div className="text-[10px] font-mono text-slate-400">
                    {param.label}
                  </div>
                  <div
                    className="text-[11px] font-mono text-slate-100 leading-snug break-words"
                    title={param.value}
                  >
                    {param.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RGB histogram */}
          <Histogram histogram={photo.meta.histogram} />

          <div className="pt-1 border-t border-white/10 text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>SOURCE: chronoframe</span>
            <span>{photo.meta.isLivePhoto ? 'LIVE PHOTO' : 'STILL PHOTO'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
