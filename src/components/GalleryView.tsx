import React, { useMemo, useState } from 'react';
import { Camera, Image, MapPin } from 'lucide-react';
import { PhotoDetail } from './PhotoDetail';
import { GALLERY_AREAS, GALLERY_PHOTOS } from '../data/gallery';
import type { ThemeMode } from '../types/blog';

interface GalleryViewProps {
  theme: ThemeMode;
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const GalleryView: React.FC<GalleryViewProps> = ({ theme }) => {
  const [activeArea, setActiveArea] = useState<string>('全部');
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      [...GALLERY_PHOTOS]
        .filter((photo) => activeArea === '全部' || photo.area === activeArea)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [activeArea]
  );

  const active = useMemo(
    () => filtered.find((photo) => photo.id === activeId) || null,
    [filtered, activeId]
  );

  const navigate = (direction: 1 | -1) => {
    if (!active) return;
    const index = filtered.findIndex((photo) => photo.id === active.id);
    if (index === -1) return;
    const next = filtered[(index + direction + filtered.length) % filtered.length];
    setActiveId(next.id);
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Slim gallery toolbar (photos only below, map lives in the preview) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 dark:bg-cyan-400/10 border border-sky-400/30 dark:border-cyan-400/25">
            <Camera className="w-4 h-4 text-sky-500 dark:text-cyan-300" />
          </div>
          <div>
            <h2 className="font-pixel text-xs sm:text-sm text-slate-900 dark:text-white">
              TRAVEL GALLERY // 旅行画廊
            </h2>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-pink-500" />
              点击照片查看地图、EXIF 参数与 RGB 直方图
            </p>
          </div>
          <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 dark:bg-white/5 text-sky-700 dark:text-cyan-300 border border-sky-400/20 dark:border-white/10">
            {filtered.length} / {GALLERY_PHOTOS.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {GALLERY_AREAS.map((area) => (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                activeArea === area
                  ? 'bg-sky-500 text-white border-sky-500 font-semibold shadow-sm shadow-sky-500/20'
                  : 'bg-white/40 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-300/60 dark:border-white/10 hover:border-sky-400/50'
              }`}
            >
              {area === '全部' ? '全部' : area}
            </button>
          ))}
        </div>
      </div>

      {/* Photo-only masonry gallery */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 sm:gap-4">
        {filtered.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setActiveId(photo.id)}
            className="group relative mb-3 sm:mb-4 w-full break-inside-avoid block text-left rounded-xl overflow-hidden border border-slate-300/60 dark:border-white/10 hover:border-sky-400/60 shadow-sm hover:shadow-lg hover:shadow-sky-500/10 transition-all"
          >
            <img
              src={photo.src}
              alt={photo.title}
              loading="lazy"
              style={{ aspectRatio: String(photo.aspect) }}
              className="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />

            {/* Top badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950/75 text-cyan-200 border border-white/15 backdrop-blur-md">
                {photo.area}
              </span>
              {photo.meta.liveVideo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-pink-500/90 text-white border border-pink-300/50">
                  LIVE
                </span>
              )}
            </div>

            {/* Pixel corner notch */}
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-sky-400 shadow-[3px_0_0_0_rgba(244,114,182,0.8),0_3px_0_0_rgba(244,114,182,0.8)] opacity-80 group-hover:opacity-100 transition-opacity" />

            {/* Bottom readable caption */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-3 pt-10">
              <div className="text-xs sm:text-sm font-semibold text-white truncate">
                {photo.title}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-300">
                <span className="truncate">{photo.place}</span>
                <span className="shrink-0">{dateFormatter.format(new Date(photo.date))}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="liquid-glass rounded-2xl p-10 text-center space-y-2">
          <Image className="w-6 h-6 mx-auto text-slate-400" />
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            这个地点还没有照片
          </p>
        </div>
      )}

      {active && (
        <PhotoDetail
          photo={active}
          photos={filtered}
          theme={theme}
          onClose={() => setActiveId(null)}
          onNavigate={navigate}
        />
      )}
    </div>
  );
};
