import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Image, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { PhotoDetail } from './PhotoDetail';
import { GALLERY_CATEGORIES, GALLERY_PHOTOS } from '../data/gallery';
import type { GalleryPhoto } from '../types/gallery';
import type { ThemeMode } from '../types/blog';

const GalleryMap = React.lazy(() =>
  import('./GalleryMap').then((module) => ({ default: module.GalleryMap }))
);

interface GalleryViewProps {
  theme: ThemeMode;
  onPreviewOpenChange?: (open: boolean) => void;
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const INITIAL_BATCH = 9;
const LOAD_BATCH = 6;
const CARD_STAGGER_MS = 80;

function getColumnCount() {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 640) return 2;
  return 1;
}

/** Life photo card: LQIP → thumbnail fade-in, Live Photos play inline on hover */
const GalleryCard: React.FC<{
  photo: GalleryPhoto;
  onOpen: () => void;
  loadDelay: number;
}> = ({ photo, onOpen, loadDelay }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediumPreloadedRef = useRef(false);
  const [cardDelay] = useState(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return 0;
    }
    return loadDelay;
  });
  const [thumbActive, setThumbActive] = useState(cardDelay === 0);
  const [playing, setPlaying] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const hasLive = Boolean(photo.meta.liveVideo);

  useEffect(() => {
    if (thumbActive) return;
    const timer = window.setTimeout(() => setThumbActive(true), cardDelay);
    return () => window.clearTimeout(timer);
  }, [cardDelay, thumbActive]);

  const preloadMedium = () => {
    if (mediumPreloadedRef.current || !photo.medium) return;
    mediumPreloadedRef.current = true;
    const image = new window.Image();
    image.decoding = 'async';
    image.src = photo.medium;
  };

  const startLive = () => {
    if (!hasLive) return;
    const video = videoRef.current;
    if (!video) return;
    setPlaying(true);
    video.currentTime = 0;
    video.play().catch(() => setPlaying(false));
  };

  const stopLive = () => {
    if (!hasLive) return;
    setPlaying(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  };

  return (
    <button
      onMouseEnter={() => {
        preloadMedium();
        startLive();
      }}
      onMouseLeave={stopLive}
      onFocus={() => {
        preloadMedium();
        startLive();
      }}
      onBlur={stopLive}
      onPointerDown={preloadMedium}
      onClick={() => {
        preloadMedium();
        stopLive();
        onOpen();
      }}
      className="gallery-card-reveal group relative w-full block text-left rounded-xl overflow-hidden border border-slate-300/60 dark:border-white/10 hover:border-sky-400/60 shadow-sm hover:shadow-lg hover:shadow-sky-500/10 transition-all"
      style={{ animationDelay: `${cardDelay}ms` }}
    >
      <div
        className={`relative w-full overflow-hidden ${
          thumbnailLoaded ? '' : 'bg-slate-200/70 dark:bg-slate-900/70'
        }`}
        style={{ aspectRatio: String(photo.aspect) }}
      >
        {photo.placeholder && (
          <img
            src={photo.placeholder}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-500 ${
              thumbnailLoaded ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}
        {thumbActive && (
          <img
            src={photo.src}
            alt={photo.title}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setThumbnailLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 group-hover:scale-[1.03] ${
              thumbnailLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
        {hasLive && (
          <video
            ref={videoRef}
            src={photo.meta.liveVideo as string}
            poster={thumbActive ? photo.src : undefined}
            muted
            loop
            playsInline
            preload="none"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              playing ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>

      {/* Top badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950/75 text-cyan-200 border border-white/15 backdrop-blur-md">
          {photo.category}
        </span>
        {hasLive && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              playing
                ? 'bg-pink-500 text-white border-pink-200/70'
                : 'bg-pink-500/90 text-white border-pink-300/50'
            }`}
          >
            {playing ? 'LIVE · 播放中' : 'LIVE'}
          </span>
        )}
      </div>

      {/* Bottom readable caption */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-3 pt-10 pointer-events-none">
        <div className="text-xs sm:text-sm font-semibold text-white truncate">
          {photo.title}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-300">
          <span className="truncate">
            {photo.place ?? photo.city ?? photo.category}
          </span>
          <span className="shrink-0">
            {dateFormatter.format(new Date(photo.date))}
          </span>
        </div>
      </div>
    </button>
  );
};

export const GalleryView: React.FC<GalleryViewProps> = ({
  theme,
  onPreviewOpenChange,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [displayMode, setDisplayMode] = useState<'grid' | 'map'>('grid');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [batchStart, setBatchStart] = useState(0);
  const [columnCount, setColumnCount] = useState(getColumnCount);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setColumnCount(getColumnCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Let the app hide the navbar while the fullscreen photo viewer is open
  React.useEffect(() => {
    onPreviewOpenChange?.(Boolean(activeId));
    return () => onPreviewOpenChange?.(false);
  }, [activeId, onPreviewOpenChange]);

  const filtered = useMemo(
    () =>
      [...GALLERY_PHOTOS]
        .filter(
          (photo) =>
            activeCategory === '全部' || photo.category === activeCategory
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [activeCategory]
  );

  const visiblePhotos = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  // Row-aware masonry: each horizontal row places one photo per column and
  // pairs taller photos with the currently shortest columns, so columns stay
  // balanced while rows still reveal left-to-right. Assignments are computed
  // against the full filtered list so loading another batch never moves cards.
  const columns = useMemo(() => {
    const result: { photo: GalleryPhoto; index: number }[][] = Array.from(
      { length: columnCount },
      () => []
    );
    const heights = Array.from({ length: columnCount }, () => 0);

    for (let start = 0; start < filtered.length; start += columnCount) {
      const rowItems = filtered
        .slice(start, start + columnCount)
        .map((photo, offset) => ({ photo, index: start + offset }))
        .sort((a, b) => a.photo.aspect - b.photo.aspect);
      const columnOrder = Array.from(
        { length: columnCount },
        (_, index) => index
      ).sort((a, b) => heights[a] - heights[b]);

      rowItems.forEach((item, offset) => {
        const target = columnOrder[offset];
        result[target].push(item);
        heights[target] += 1 / item.photo.aspect + 0.04;
      });
    }

    return result.map((column) =>
      column.filter((item) => item.index < visibleCount)
    );
  }, [filtered, columnCount, visibleCount]);

  const revealBaseOrder = useMemo(() => {
    let minimum = Infinity;
    columns.forEach((column, columnIndex) => {
      column.forEach((item, rowIndex) => {
        if (item.index >= batchStart) {
          minimum = Math.min(
            minimum,
            rowIndex * columnCount + columnIndex
          );
        }
      });
    });
    return Number.isFinite(minimum) ? minimum : 0;
  }, [columns, batchStart, columnCount]);

  useEffect(() => {
    if (visibleCount >= filtered.length) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setBatchStart(visibleCount);
        setVisibleCount(Math.min(visibleCount + LOAD_BATCH, filtered.length));
      },
      { rootMargin: '160px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);

  const changeCategory = (category: string) => {
    if (category === activeCategory) return;
    setActiveCategory(category);
    setVisibleCount(INITIAL_BATCH);
    setBatchStart(0);
  };

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
      {/* Gallery toolbar: category filters and grid/map switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0 p-1.5 rounded-lg bg-sky-500/10 dark:bg-cyan-400/10 border border-sky-400/30 dark:border-cyan-400/25">
            <Camera className="w-4 h-4 text-sky-500 dark:text-cyan-300" />
          </div>
          <div className="min-w-0">
            <h2 className="font-pixel text-xs sm:text-sm text-slate-900 dark:text-white">
              <span className="hidden sm:inline">LIFE GALLERY // </span>
              生活画廊
            </h2>
            <p className="hidden text-[11px] font-mono text-slate-500 dark:text-slate-400 sm:flex sm:items-center sm:gap-1">
              <Image className="w-3 h-3 text-pink-500" />
              生活照片分享 · 旅行 / 代码 / 饮食 / 日常
            </p>
          </div>
          <span className="ml-1 shrink-0 whitespace-nowrap rounded border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-cyan-300">
            {filtered.length} / {GALLERY_PHOTOS.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-slate-300/60 bg-white/40 p-0.5 dark:border-white/10 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={() => setDisplayMode('grid')}
              aria-pressed={displayMode === 'grid'}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${
                displayMode === 'grid'
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                  : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              图集
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('map')}
              aria-pressed={displayMode === 'map'}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${
                displayMode === 'map'
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                  : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-white/5'
              }`}
            >
              <MapIcon className="h-3 w-3" />
              地图
            </button>
          </div>

          {GALLERY_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => changeCategory(category)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                activeCategory === category
                  ? 'bg-sky-500 text-white border-sky-500 font-semibold shadow-sm shadow-sky-500/20'
                  : 'bg-white/40 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-300/60 dark:border-white/10 hover:border-sky-400/50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Life photo masonry gallery: horizontal row-by-row reveal */}
      {displayMode === 'grid' && visiblePhotos.length > 0 && (
        <div className="flex items-start gap-3 sm:gap-4">
          {columns.map((column, columnIndex) => (
            <div
              key={`column-${columnIndex}`}
              className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4"
            >
              {column.map(({ photo }, rowIndex) => {
                const visualOrder =
                  rowIndex * columnCount + columnIndex;
                const loadDelay =
                  Math.max(0, visualOrder - revealBaseOrder) *
                  CARD_STAGGER_MS;

                return (
                  <GalleryCard
                    key={`${activeCategory}-${photo.id}`}
                    photo={photo}
                    loadDelay={loadDelay}
                    onOpen={() => setActiveId(photo.id)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {displayMode === 'grid' && visibleCount < filtered.length && (
        <div
          ref={loadMoreRef}
          className="flex h-16 items-center justify-center gap-2 font-mono text-[10px] text-slate-500 dark:text-slate-400"
        >
          <span className="h-1.5 w-1.5 animate-pulse bg-cyan-400" />
          LOADING MORE…
        </div>
      )}

      {displayMode === 'map' && filtered.length > 0 && (
        <Suspense
          fallback={
            <div className="flex h-[68vh] min-h-[480px] items-center justify-center rounded-2xl border border-slate-300/70 bg-slate-100/60 dark:border-white/15 dark:bg-slate-950/60 sm:min-h-[560px]">
              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 animate-pulse bg-cyan-400" />
                LOADING MAP…
              </div>
            </div>
          }
        >
          <GalleryMap
            photos={filtered}
            theme={theme}
            viewerOpen={Boolean(active)}
            onOpen={(id) => setActiveId(id)}
          />
        </Suspense>
      )}

      {filtered.length === 0 && (
        <div className="liquid-glass rounded-2xl p-10 text-center space-y-2">
          <Image className="w-6 h-6 mx-auto text-slate-400" />
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            这个分类还没有照片
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
