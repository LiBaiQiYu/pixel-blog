import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MapPinned,
  Maximize2,
  X,
} from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';
import { GalleryMap } from './GalleryMap';
import { GALLERY_AREAS, GALLERY_PHOTOS } from '../data/gallery';
import type { GalleryPhoto } from '../types/gallery';
import type { ThemeMode } from '../types/blog';

interface GalleryViewProps {
  theme: ThemeMode;
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

const dayFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
});

function formatCoords(lat: number, lon: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}°${ns}, ${Math.abs(lon).toFixed(5)}°${ew}`;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ theme }) => {
  const [activeArea, setActiveArea] = useState<string>('全部');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      activeArea === '全部'
        ? GALLERY_PHOTOS
        : GALLERY_PHOTOS.filter((photo) => photo.area === activeArea),
    [activeArea]
  );

  const selected = useMemo(
    () => GALLERY_PHOTOS.find((photo) => photo.id === selectedId) || null,
    [selectedId]
  );

  const lightbox = useMemo(
    () => GALLERY_PHOTOS.find((photo) => photo.id === lightboxId) || null,
    [lightboxId]
  );

  // Group by shooting day (Asia/Shanghai), newest first
  const grouped = useMemo(() => {
    const map = new Map<string, GalleryPhoto[]>();
    [...filtered]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((photo) => {
        const day = dayFormatter.format(new Date(photo.date));
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(photo);
      });
    return Array.from(map.entries());
  }, [filtered]);

  const stepLightbox = (direction: 1 | -1) => {
    if (!lightbox) return;
    const index = filtered.findIndex((photo) => photo.id === lightbox.id);
    if (index === -1) return;
    const next = filtered[(index + direction + filtered.length) % filtered.length];
    setLightboxId(next.id);
    setSelectedId(next.id);
  };

  useEffect(() => {
    if (!lightboxId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxId(null);
      if (event.key === 'ArrowLeft') stepLightbox(-1);
      if (event.key === 'ArrowRight') stepLightbox(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxId, filtered]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <LiquidPixelCard accent="cyan" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 dark:bg-cyan-400/10 border border-sky-400/30 dark:border-cyan-400/25">
              <Camera className="w-5 h-5 text-sky-500 dark:text-cyan-300" />
            </div>
            <div>
              <h2 className="font-pixel text-xs sm:text-sm text-slate-900 dark:text-white">
                TRAVEL GALLERY // 旅行画廊
              </h2>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                照片来自 chronoframe 图库 · 点击照片或地图标记查看拍摄地点
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="px-2 py-0.5 rounded bg-sky-500/10 dark:bg-white/5 text-sky-700 dark:text-cyan-300 border border-sky-400/20 dark:border-white/10">
              {GALLERY_PHOTOS.length} PHOTOS
            </span>
            <span className="px-2 py-0.5 rounded bg-pink-500/10 dark:bg-white/5 text-pink-600 dark:text-pink-300 border border-pink-400/20 dark:border-white/10">
              {GALLERY_AREAS.length - 1} PLACES
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
            <MapPinned className="w-3 h-3 text-sky-500" />
            地点:
          </span>
          {GALLERY_AREAS.map((area) => (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                activeArea === area
                  ? 'bg-sky-500 text-white border-sky-500 font-semibold'
                  : 'bg-white/40 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-300/60 dark:border-white/10 hover:border-sky-400/50'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </LiquidPixelCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map + detail */}
        <div className="lg:col-span-5 lg:sticky lg:top-[9.5rem] space-y-4">
          <LiquidPixelCard accent="emerald" className="p-0 overflow-hidden">
            <div className="relative h-[340px] sm:h-[420px]">
              <GalleryMap
                photos={filtered}
                selectedId={selectedId}
                theme={theme}
                onSelect={(photo) => setSelectedId(photo.id)}
              />
              <div className="pointer-events-none absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-950/70 text-cyan-300 border border-white/15 backdrop-blur-md">
                MAP // {filtered.length} PINS
              </div>
            </div>

            <div className="p-4 border-t border-slate-200/60 dark:border-white/10 bg-white/30 dark:bg-slate-950/30 min-h-[7.5rem]">
              {selected ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <img
                      src={selected.src}
                      alt={selected.title}
                      className="w-20 h-20 rounded-lg object-cover border border-slate-300/60 dark:border-white/15 shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {selected.title}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-sky-500 shrink-0" />
                        {dateFormatter.format(new Date(selected.date))}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-pink-500 shrink-0" />
                        {formatCoords(selected.lat, selected.lon)}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {selected.description || selected.locationName}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLightboxId(selected.id)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-sky-500/15 text-sky-700 dark:text-cyan-300 border border-sky-500/30 hover:bg-sky-500/25 flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      查看大图
                    </button>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white/50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-white/10"
                    >
                      清除选择
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <MapPinned className="w-4 h-4 text-sky-500 shrink-0" />
                  点击地图上的像素标记或右侧照片，查看拍摄地点与照片详情。
                </div>
              )}
            </div>
          </LiquidPixelCard>
        </div>

        {/* Photo grid grouped by day */}
        <div className="lg:col-span-7 space-y-6">
          {grouped.map(([day, items]) => (
            <section key={day} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-sky-500 dark:bg-cyan-400 shadow-[3px_3px_0_0_rgba(244,114,182,0.75)]" />
                <h3 className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                  {day}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {items.length} 张
                </span>
              </div>

              <div className="columns-1 sm:columns-2 gap-3">
                {items.map((photo) => {
                  const isActive = selectedId === photo.id;
                  return (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedId(photo.id)}
                      onDoubleClick={() => setLightboxId(photo.id)}
                      className={`group relative mb-3 w-full break-inside-avoid block text-left rounded-xl overflow-hidden border transition-all ${
                        isActive
                          ? 'border-sky-400 ring-2 ring-sky-400/40 shadow-lg shadow-sky-500/20'
                          : 'border-slate-300/60 dark:border-white/10 hover:border-sky-400/50 shadow-sm'
                      }`}
                    >
                      <img
                        src={photo.src}
                        alt={photo.title}
                        loading="lazy"
                        style={{ aspectRatio: String(photo.aspect) }}
                        className="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 pt-8">
                        <div className="text-[11px] sm:text-xs font-semibold text-white truncate">
                          {photo.title}
                        </div>
                        <div className="text-[10px] font-mono text-slate-300 flex items-center justify-between gap-2">
                          <span>{photo.place}</span>
                          <span>{formatCoords(photo.lat, photo.lon)}</span>
                        </div>
                      </div>
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          setLightboxId(photo.id);
                        }}
                        className="absolute top-2 right-2 p-1 rounded-md bg-slate-950/70 text-cyan-300 border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="查看大图"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/88 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxId(null)}
        >
          <div
            className="w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative">
              <img
                src={lightbox.view}
                alt={lightbox.title}
                className="max-h-[70vh] w-auto mx-auto rounded-xl border border-white/20 shadow-2xl object-contain"
              />
              <button
                onClick={() => setLightboxId(null)}
                className="absolute -top-3 -right-3 p-2 rounded-full bg-slate-950/90 text-slate-200 border border-white/20 hover:text-rose-400"
                title="关闭 (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => stepLightbox(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 text-slate-100 border border-white/20 hover:text-cyan-300"
                title="上一张 (←)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => stepLightbox(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 text-slate-100 border border-white/20 hover:text-cyan-300"
                title="下一张 (→)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold">{lightbox.title}</h3>
                <span className="text-[11px] font-mono text-cyan-300">
                  {formatCoords(lightbox.lat, lightbox.lon)}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {dateFormatter.format(new Date(lightbox.date))}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {lightbox.locationName}
                </span>
              </div>
              {lightbox.description && (
                <p className="text-xs text-slate-300">{lightbox.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
