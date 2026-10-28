import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Image as ImageIcon, Terminal } from 'lucide-react';
import { useLiveVideo } from '../hooks/useLiveVideo';
import { LiquidPixelCard } from './LiquidPixelCard';
import { LiveProgressRing } from './LiveProgressRing';
import { PhotoSwiperDetail } from './PhotoSwiperDetail';
import { GALLERY_CATEGORIES, GALLERY_PHOTOS } from '../data/gallery';
import type { GalleryPhoto } from '../types/gallery';
import type { ThemeMode } from '../types/blog';

interface TerminalGalleryViewProps {
  theme: ThemeMode;
  previewId: string | null;
  onPreviewOpen: (id: string) => void;
  onPreviewNavigate: (id: string) => void;
  onPreviewClose: () => void;
  onBackHome: () => void;
}

const shortDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function fileName(photo: GalleryPhoto) {
  return `${photo.id}.jpeg`;
}

function supportsHover() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

const TerminalGalleryCard: React.FC<{
  photo: GalleryPhoto;
  index: number;
  onOpen: () => void;
}> = ({ photo, index, onOpen }) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressActiveRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const pendingPlayRef = useRef(false);
  const hasLiveSource = Boolean(photo.meta.liveVideo);
  const liveAsset = useLiveVideo(
    photo.meta.liveVideo,
    hasLiveSource && thumbnailLoaded
  );
  const hasLive = hasLiveSource && !liveAsset.error;

  const playLive = () => {
    const video = videoRef.current;
    if (!video || !liveAsset.objectUrl) return;
    setPlaying(true);
    video.currentTime = 0;
    video.play().catch(() => setPlaying(false));
  };

  const startLive = () => {
    if (!hasLive) return;
    if (!liveAsset.objectUrl) {
      pendingPlayRef.current = true;
      return;
    }
    playLive();
  };

  const stopLive = () => {
    pendingPlayRef.current = false;
    setPlaying(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  };

  useEffect(() => {
    if (!pendingPlayRef.current || !liveAsset.objectUrl) return;
    pendingPlayRef.current = false;
    playLive();
  }, [liveAsset.objectUrl]);

  useEffect(
    () => () => {
      pendingPlayRef.current = false;
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    },
    []
  );

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!hasLive || event.pointerType === 'mouse') return;
    cancelLongPress();
    pressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      longPressActiveRef.current = true;
      startLive();
    }, 450);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!pressStartRef.current) return;
    const dx = event.clientX - pressStartRef.current.x;
    const dy = event.clientY - pressStartRef.current.y;
    if (dx * dx + dy * dy <= 100) return;
    pressStartRef.current = null;
    cancelLongPress();
    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      stopLive();
    }
  };

  const stopLongPress = (suppressClick: boolean) => {
    pressStartRef.current = null;
    cancelLongPress();
    if (!longPressActiveRef.current) return;
    longPressActiveRef.current = false;
    suppressClickRef.current = suppressClick;
    stopLive();
    if (suppressClick) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 700);
    }
  };

  return (
    <button
      type="button"
      data-custom-sound
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onOpen();
      }}
      onMouseEnter={() => {
        if (hasLive && supportsHover()) startLive();
      }}
      onMouseLeave={stopLive}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => stopLongPress(true)}
      onPointerCancel={() => stopLongPress(false)}
      onPointerLeave={() => stopLongPress(false)}
      onContextMenu={(event) => {
        if (hasLive) event.preventDefault();
      }}
      className="group overflow-hidden rounded-lg border border-emerald-500/20 bg-white/50 text-left transition-all select-none touch-pan-y hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-500/10 dark:bg-slate-950/65"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-slate-900">
        <img
          src={photo.src}
          alt={photo.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setThumbnailLoaded(true)}
          className={`h-full w-full object-cover saturate-[0.8] transition-[transform,opacity] duration-500 group-hover:scale-[1.03] group-hover:saturate-100 ${
            playing ? 'opacity-0' : 'opacity-100'
          }`}
        />
        {hasLive && (
          <video
            ref={videoRef}
            src={liveAsset.objectUrl ?? undefined}
            poster={photo.src}
            muted
            loop
            playsInline
            preload={liveAsset.objectUrl ? 'auto' : 'none'}
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              playing ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
        <span className="absolute left-2 top-2 rounded bg-slate-950/75 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
          [{String(index + 1).padStart(2, '0')}]
        </span>
        {hasLive && (
          <LiveProgressRing
            progress={liveAsset.progress}
            loaded={liveAsset.loaded}
            playing={playing}
            size={28}
            className="absolute right-2 top-2 shadow-lg shadow-slate-950/30"
          />
        )}
      </div>
      <div className="space-y-1 p-2.5">
        <div className="flex items-center justify-between gap-2 font-mono text-[9px] text-slate-500">
          <span className="truncate text-emerald-700 dark:text-emerald-300">
            $ {fileName(photo)}
          </span>
          <span className="shrink-0">
            {shortDateFormatter.format(new Date(photo.date))}
          </span>
        </div>
        <div className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">
          {photo.title}
        </div>
        <div className="flex items-center gap-1 truncate font-mono text-[9px] text-slate-500">
          <ImageIcon className="h-2.5 w-2.5 shrink-0 text-emerald-500/70" />
          {photo.place ?? photo.area ?? photo.category}
        </div>
      </div>
    </button>
  );
};

export const TerminalGalleryView: React.FC<TerminalGalleryViewProps> = ({
  theme,
  previewId,
  onPreviewOpen,
  onPreviewNavigate,
  onPreviewClose,
  onBackHome,
}) => {
  const [activeCategory, setActiveCategory] = useState('全部');

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

  const active = useMemo(
    () =>
      previewId
        ? filtered.find((photo) => photo.id === previewId) ||
          GALLERY_PHOTOS.find((photo) => photo.id === previewId) ||
          null
        : null,
    [filtered, previewId]
  );

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col">
      <LiquidPixelCard
        accent="emerald"
        strong
        className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden"
        contentClassName="flex-1 min-h-0 flex flex-col"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-500/20 bg-slate-200/70 px-3 py-2.5 dark:border-emerald-400/15 dark:bg-slate-950/85 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px]">
            <span className="flex shrink-0 gap-1">
              <span className="h-2 w-2 bg-rose-500" />
              <span className="h-2 w-2 bg-amber-400" />
              <span className="h-2 w-2 bg-emerald-500" />
            </span>
            <Terminal className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-300" />
            <span className="truncate text-emerald-700 dark:text-emerald-300">
              carlos@libai:~/gallery
            </span>
            <span className="hidden text-slate-500 sm:inline">
              // PHOTO ARCHIVE
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 font-mono text-[9px] text-slate-500">
            <span>{filtered.length} FILES</span>
            <button
              type="button"
              onClick={onBackHome}
              className="flex items-center gap-1 rounded-md border border-emerald-500/30 px-1.5 py-1 text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300"
              title="返回首页"
            >
              <CornerDownLeft className="h-3 w-3" />
              cd ~
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b border-emerald-500/15 px-3 py-2 font-mono text-[10px] text-slate-500 dark:text-slate-400 sm:px-4">
          <span className="text-slate-400 dark:text-slate-500">
            carlos@libai
          </span>
          <span className="text-slate-500">:</span>
          <span className="text-cyan-600 dark:text-cyan-300">~/gallery</span>
          <span className="text-slate-500">$ </span>
          <span className="text-emerald-700 dark:text-emerald-300">
            ls -lh --recent
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-emerald-500/15 px-3 py-2 font-mono text-[10px] sm:px-4">
          <span className="mr-1 text-slate-500">filter:</span>
          {GALLERY_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                activeCategory === category
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200'
                  : 'text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
            >
              [{category === '全部' ? 'all' : category}]
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-4">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
              {filtered.map((photo, index) => (
                <TerminalGalleryCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  onOpen={() => onPreviewOpen(photo.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 font-mono text-xs text-slate-500">
              <span className="text-emerald-500">no records found</span>
              <span className="text-[10px]">try another filter</span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-emerald-500/15 px-3 py-2 font-mono text-[9px] text-slate-500 sm:px-4">
          <span>
            [EOF] {filtered.length} / {GALLERY_PHOTOS.length} records
          </span>
          <span className="hidden sm:inline">
            click a record to open viewer
          </span>
        </div>
      </LiquidPixelCard>

      {active && (
        <PhotoSwiperDetail
          photo={active}
          photos={filtered.some((photo) => photo.id === active.id)
            ? filtered
            : [active]}
          theme={theme}
          onClose={onPreviewClose}
          onActiveChange={onPreviewNavigate}
        />
      )}
    </div>
  );
};
