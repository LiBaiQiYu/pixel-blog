'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Zoom } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import 'swiper/css/zoom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  Maximize,
  MessageSquare,
  Minus,
  Plus,
  Share2,
  Smile,
  X,
} from 'lucide-react';
import type { GalleryPhoto } from '../types/gallery';
import type { ThemeMode } from '../types/blog';
import { recordPhotoView } from '../lib/photo-engagement';
import { PhotoReactions } from './PhotoReactions';
import { PhotoSlideContent } from './PhotoSlideContent';
import { PhotoCommentsModal } from './PhotoCommentsModal';
import { PhotoInfoPanel } from './PhotoInfoPanel';
import { pixelAudio } from '../utils/sound';

interface PhotoSwiperDetailProps {
  photo: GalleryPhoto;
  photos: GalleryPhoto[];
  theme: ThemeMode;
  onClose: () => void;
  onActiveChange?: (id: string) => void;
}

export const PhotoSwiperDetail: React.FC<PhotoSwiperDetailProps> = ({
  photo,
  photos,
  theme,
  onClose,
  onActiveChange,
}) => {
  const initialIndex = Math.max(
    0,
    photos.findIndex((item) => item.id === photo.id)
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoomScale, setZoomScale] = useState(1);
  const [infoOpen, setInfoOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [infoClosing, setInfoClosing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [reactionsClosing, setReactionsClosing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<'copied' | 'failed' | null>(null);
  const [photoViews, setPhotoViews] = useState<number | null>(null);
  const [photoCommentCount, setPhotoCommentCount] = useState(0);
  const swiperRef = useRef<SwiperClass | null>(null);
  const shareTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const infoTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const reactionDockRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef(false);
  const activePhoto = photos[activeIndex] ?? photo;

  const closeViewer = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    pixelAudio.playViewerClose();
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(onClose, 340);
  };

  useEffect(() => {
    if (photos.length < 2) return;

    const previous = photos[(activeIndex - 1 + photos.length) % photos.length];
    const next = photos[(activeIndex + 1) % photos.length];
    [previous, next].forEach((item) => {
      if (!item?.medium) return;
      const image = new Image();
      image.decoding = 'async';
      image.src = item.medium;
    });
  }, [activeIndex, photos]);

  const zoomBy = (delta: number) => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    const current = swiper.zoom.scale || zoomScale;
    const next = Math.min(6, Math.max(1, current + delta));
    if (next <= 1.01) {
      swiper.zoom.out();
    } else {
      swiper.zoom.in(next);
    }
  };

  const resetZoom = () => {
    swiperRef.current?.zoom.out();
  };

  const closeReactions = () => {
    if (!reactionsOpen || reactionsClosing) return;
    setReactionsClosing(true);
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = window.setTimeout(() => {
      setReactionsOpen(false);
      setReactionsClosing(false);
    }, 160);
  };

  const toggleReactions = () => {
    pixelAudio.playClick();
    if (reactionsOpen) {
      closeReactions();
    } else {
      setReactionsClosing(false);
      setReactionsOpen(true);
    }
  };

  useEffect(() => {
    pixelAudio.playViewerOpen();
    return () => {
      if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (infoTimerRef.current) window.clearTimeout(infoTimerRef.current);
      if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    };
  }, []);

  const toggleInfo = () => {
    if (infoOpen) {
      setInfoClosing(true);
      pixelAudio.playInfoClose();
      if (infoTimerRef.current) window.clearTimeout(infoTimerRef.current);
      infoTimerRef.current = window.setTimeout(() => {
        setInfoOpen(false);
        setInfoClosing(false);
      }, 320);
    } else {
      if (infoTimerRef.current) window.clearTimeout(infoTimerRef.current);
      setInfoClosing(false);
      setInfoOpen(true);
      pixelAudio.playInfoOpen();
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    let copied = false;

    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      try {
        const field = document.createElement('textarea');
        field.value = url;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        copied = document.execCommand('copy');
        field.remove();
      } catch {
        copied = false;
      }
    }

    if (copied) {
      pixelAudio.playCopy();
      setShareFeedback('copied');
    } else {
      pixelAudio.playCommentError();
      setShareFeedback('failed');
    }

    if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
    shareTimerRef.current = window.setTimeout(
      () => setShareFeedback(null),
      2000
    );
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      const swiper = swiperRef.current;
      if (!swiper) return;
      event.preventDefault();
      const current = swiper.zoom.scale || 1;
      const next = Math.min(
        6,
        Math.max(1, current + (event.deltaY < 0 ? 0.25 : -0.25))
      );
      if (next <= 1.01) {
        swiper.zoom.out();
      } else {
        swiper.zoom.in(next);
      }
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setCommentsOpen(false);
    setPhotoViews(null);
    setPhotoCommentCount(0);

    recordPhotoView(activePhoto.id, controller.signal)
      .then((stats) => {
        setPhotoViews(stats.views);
        setPhotoCommentCount(stats.comments);
      })
      .catch(() => {
        // Keep counters hidden when the stats API is unavailable.
      });

    return () => controller.abort();
  }, [activePhoto.id]);

  useEffect(() => {
    if (zoomScale > 1.01) closeReactions();
  }, [zoomScale]);

  useEffect(() => {
    if (commentsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && reactionsOpen) {
        event.preventDefault();
        closeReactions();
        return;
      }
      if (reactionsOpen) return;
      if (event.key === 'Escape') {
        closeViewer();
        return;
      }
      if (event.key === 'ArrowLeft') {
        swiperRef.current?.slidePrev();
      } else if (event.key === 'ArrowRight') {
        swiperRef.current?.slideNext();
      } else if (event.key === '+' || event.key === '=') {
        const swiper = swiperRef.current;
        if (swiper) swiper.zoom.in(Math.min(6, swiper.zoom.scale + 0.25));
      } else if (event.key === '-' || event.key === '_') {
        const swiper = swiperRef.current;
        if (!swiper) return;
        const next = Math.max(1, swiper.zoom.scale - 0.25);
        if (next <= 1.01) swiper.zoom.out();
        else swiper.zoom.in(next);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commentsOpen, onClose, reactionsOpen]);

  const handleViewportClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const swiper = swiperRef.current;
    const target = event.target as Element;
    if (
      reactionsOpen ||
      !swiper ||
      swiper.zoom.scale > 1 ||
      swiper.allowClick === false ||
      event.detail > 1 ||
      target.closest('button, a, input, textarea, video')
    ) {
      return;
    }

    const rect = swiper.el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < rect.width * 0.22) {
      swiper.slidePrev();
    } else if (x > rect.width * 0.78) {
      swiper.slideNext();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] flex flex-col backdrop-blur-2xl ${
        closing ? 'photo-viewer-exit' : 'photo-viewer-enter'
      } ${
        theme === 'dark' ? 'bg-slate-950/95' : 'bg-slate-50/95'
      }`}
    >
      <div
        className={`flex h-14 shrink-0 items-center justify-between gap-2 border-b px-2 backdrop-blur-xl sm:px-4 ${
          theme === 'dark'
            ? 'border-white/10 bg-slate-950/70'
            : 'border-slate-300/60 bg-white/75'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={closeViewer}
            className="rounded-lg p-2 text-slate-700 liquid-pill hover:text-rose-500 dark:text-slate-200"
            title="关闭 (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="whitespace-nowrap rounded border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-cyan-300">
            {activeIndex + 1} / {photos.length}
          </span>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400"
            title="查看次数"
          >
            <Eye className="h-3 w-3 text-sky-500 dark:text-cyan-300" />
            <span className="tabular-nums">
              {photoViews === null
                ? '--'
                : photoViews.toLocaleString('zh-CN')}
            </span>
          </span>
          <span className="hidden truncate font-mono text-xs text-slate-600 dark:text-slate-300 md:block">
            {activePhoto.title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomBy(-0.25)}
            className="hidden rounded-lg p-2 text-slate-700 liquid-pill dark:text-slate-200 sm:flex"
            title="缩小 (-)"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="flex min-w-[3.2rem] items-center justify-center gap-1 rounded-lg px-2 py-1 font-mono text-[10px] text-slate-600 liquid-pill dark:text-slate-300"
            title="重置缩放 (双击)"
          >
            <Maximize className="h-3 w-3" />
            {Math.round(zoomScale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.25)}
            className="hidden rounded-lg p-2 text-slate-700 liquid-pill dark:text-slate-200 sm:flex"
            title="放大 (+)"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            data-custom-sound
            onClick={() => void handleShare()}
            className={`flex items-center rounded-lg p-2 font-mono text-[10px] liquid-pill transition-colors duration-200 ${
              shareFeedback === 'copied'
                ? 'share-button-copied bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-200'
                : shareFeedback === 'failed'
                  ? 'share-button-copied bg-rose-500/15 text-rose-600 dark:bg-rose-400/15 dark:text-rose-200'
                  : 'text-slate-700 hover:text-sky-600 dark:text-slate-200 dark:hover:text-cyan-300'
            }`}
            title={
              shareFeedback === 'copied'
                ? '图片链接已复制'
                : shareFeedback === 'failed'
                  ? '复制失败，请手动复制地址栏'
                  : '分享图片'
            }
            aria-label={
              shareFeedback === 'copied'
                ? '图片链接已复制'
                : shareFeedback === 'failed'
                  ? '复制失败'
                  : '分享图片'
            }
          >
            {shareFeedback === 'copied' ? (
              <Check className="share-copy-icon h-4 w-4" />
            ) : shareFeedback === 'failed' ? (
              <X className="share-copy-icon h-4 w-4" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            <span
              className={`share-copy-label overflow-hidden whitespace-nowrap text-[9px] ${
                shareFeedback ? 'share-copy-label-visible' : ''
              }`}
            >
              {shareFeedback === 'copied'
                ? '已复制'
                : shareFeedback === 'failed'
                  ? '复制失败'
                  : ''}
            </span>
            <span className="sr-only" role="status" aria-live="polite">
              {shareFeedback === 'copied'
                ? '图片链接已复制'
                : shareFeedback === 'failed'
                  ? '复制失败'
                  : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleInfo}
            className={`rounded-lg p-2 liquid-pill ${
              infoOpen
                ? 'text-sky-600 dark:text-cyan-300'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="照片信息"
          >
            <Info className="h-4 w-4" />
          </button>

        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          ref={stageRef}
          className="group relative min-h-0 flex-1 overflow-hidden"
          onClick={handleViewportClick}
        >
          <Swiper
            modules={[Zoom]}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            initialSlide={initialIndex}
            loop={photos.length > 1}
            slidesPerView={1}
            speed={320}
            zoom={{
              maxRatio: 6,
              minRatio: 1,
              toggle: true,
            }}
            onSlideChange={(swiper) => {
              if (closingRef.current) return;
              const nextIndex = swiper.realIndex;
              setActiveIndex(nextIndex);
              setZoomScale(1);
              setReactionsOpen(false);
              onActiveChange?.(photos[nextIndex]?.id ?? photo.id);
            }}
            onZoomChange={(_, scale) => setZoomScale(scale)}
            className="h-full w-full"
          >
            {photos.map((item, index) => (
              <SwiperSlide key={item.id} className="!h-full">
                <PhotoSlideContent
                  photo={item}
                  active={index === activeIndex}
                  highQuality={
                    index === activeIndex ||
                    index === (activeIndex + 1) % photos.length ||
                    index === (activeIndex - 1 + photos.length) % photos.length
                  }
                  controlsVisible={zoomScale <= 1.01}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {zoomScale <= 1 && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-20 items-center justify-start bg-gradient-to-r from-slate-950/15 to-transparent pl-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-slate-950/35 sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-950/55 text-white shadow-lg backdrop-blur">
                  <ChevronLeft className="h-5 w-5" />
                </span>
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-20 items-center justify-end bg-gradient-to-l from-slate-950/15 to-transparent pr-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-slate-950/35 sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-950/55 text-white shadow-lg backdrop-blur">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </div>
            </>
          )}

          {reactionsOpen && zoomScale <= 1.01 && (
            <div
              className="absolute inset-0 z-20"
              onClick={(event) => {
                event.stopPropagation();
                closeReactions();
              }}
              aria-hidden="true"
            />
          )}

          <div
            ref={reactionDockRef}
            className={`photo-reaction-dock absolute bottom-4 right-4 z-30 ${
              zoomScale > 1.01 ? 'pointer-events-none' : ''
            }`}
            aria-hidden={zoomScale > 1.01}
            onClick={(event) => event.stopPropagation()}
          >
            {reactionsOpen && (
              <div
                role="dialog"
                aria-label="图片表态"
                className={`photo-reaction-popover absolute bottom-[calc(100%+10px)] right-0 w-[300px] max-w-[calc(100vw-2rem)] border-2 border-pink-400/45 bg-white/95 p-3 shadow-[5px_5px_0_0_rgba(219,39,119,0.2)] backdrop-blur-xl dark:border-fuchsia-300/30 dark:bg-slate-950/95 dark:shadow-[5px_5px_0_0_rgba(244,114,182,0.14)] ${
                  reactionsClosing ? 'photo-reaction-popover-exit' : ''
                }`}
              >
                <PhotoReactions photoId={activePhoto.id} />
              </div>
            )}

            <div className="flex items-end justify-end gap-2">
              <div
                className={`photo-action-dock-item ${
                  zoomScale <= 1.01
                    ? 'photo-action-dock-enter'
                    : 'photo-action-dock-exit'
                }`}
                style={{
                  '--action-delay':
                    zoomScale <= 1.01 ? '0ms' : '90ms',
                } as React.CSSProperties}
              >
                <button
                  type="button"
                  data-custom-sound
                  onClick={() => {
                    pixelAudio.playCommentOpen();
                    closeReactions();
                    setCommentsOpen(true);
                  }}
                  className={`relative flex items-center gap-1.5 border-2 border-sky-400/50 bg-white/80 px-3 py-2 font-mono text-[10px] text-sky-700 shadow-[3px_3px_0_0_rgba(2,132,199,0.2)] backdrop-blur-md transition-[opacity,transform] duration-150 hover:border-cyan-400 dark:border-cyan-300/30 dark:bg-slate-950/80 dark:text-cyan-200 dark:shadow-[3px_3px_0_0_rgba(56,189,248,0.14)] ${
                    commentsOpen
                      ? 'opacity-100'
                      : 'opacity-70 hover:opacity-100 focus-visible:opacity-100'
                  }`}
                  title="查看评价"
                  aria-label="查看评价"
                  tabIndex={zoomScale > 1.01 ? -1 : undefined}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">评价</span>
                  {photoCommentCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 min-w-[16px] border border-sky-400/50 bg-sky-500 px-1 text-center font-mono text-[8px] leading-[14px] text-white dark:border-cyan-300/30 dark:bg-cyan-400 dark:text-slate-950">
                      {photoCommentCount > 99 ? '99+' : photoCommentCount}
                    </span>
                  )}
                </button>
              </div>

              <div
                className={`photo-action-dock-item ${
                  zoomScale <= 1.01
                    ? 'photo-action-dock-enter'
                    : 'photo-action-dock-exit'
                }`}
                style={{
                  '--action-delay':
                    zoomScale <= 1.01 ? '120ms' : '0ms',
                } as React.CSSProperties}
              >
                <button
                  type="button"
                  data-custom-sound
                  onClick={toggleReactions}
                  className={`flex items-center gap-1.5 border-2 border-pink-400/45 bg-white/80 px-3 py-2 font-mono text-[10px] text-pink-700 shadow-[3px_3px_0_0_rgba(219,39,119,0.2)] backdrop-blur-md transition-[opacity,transform] duration-150 hover:border-fuchsia-400 dark:border-fuchsia-300/30 dark:bg-slate-950/80 dark:text-fuchsia-200 dark:shadow-[3px_3px_0_0_rgba(244,114,182,0.14)] ${
                    reactionsOpen
                      ? 'opacity-100'
                      : 'opacity-70 hover:opacity-100 focus-visible:opacity-100'
                  }`}
                  title="选择表态"
                  aria-label="选择表态"
                  aria-expanded={reactionsOpen}
                  tabIndex={zoomScale > 1.01 ? -1 : undefined}
                >
                  <Smile className="h-4 w-4" />
                  <span className="hidden sm:inline">表态</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {infoOpen && (
          <aside
            className={`hidden w-[380px] shrink-0 flex-col overflow-y-auto border-l p-5 backdrop-blur-2xl lg:flex ${
              infoClosing ? 'photo-info-exit' : 'photo-info-enter'
            } ${
              theme === 'dark'
                ? 'border-white/10 bg-slate-950/60'
                : 'border-slate-300/60 bg-white/60'
            }`}
          >
            <PhotoInfoPanel photo={activePhoto} theme={theme} />
          </aside>
        )}
      </div>

      {infoOpen && (
        <div
          className={`absolute inset-x-0 bottom-0 top-14 z-20 flex flex-col rounded-t-2xl border-t backdrop-blur-2xl lg:hidden ${
            infoClosing ? 'photo-info-exit' : 'photo-info-enter'
          } ${
            theme === 'dark'
              ? 'border-white/15 bg-slate-950/95'
              : 'border-slate-300/70 bg-white/95'
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
            <span className="font-pixel text-[10px] text-sky-600 dark:text-cyan-300">
              PHOTO INFO // 照片信息
            </span>
            <button
              type="button"
              onClick={toggleInfo}
              className="pixel-icon-button flex h-8 w-8 items-center justify-center border-2 border-slate-300/70 bg-white/80 text-slate-600 hover:border-rose-400/50 hover:text-rose-500 dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-rose-300"
              title="关闭照片信息"
              aria-label="关闭照片信息"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <PhotoInfoPanel photo={activePhoto} theme={theme} />
          </div>
        </div>
      )}

      {commentsOpen && (
        <PhotoCommentsModal
          photoId={activePhoto.id}
          initialTotal={photoCommentCount}
          onClose={() => setCommentsOpen(false)}
          onTotalChange={setPhotoCommentCount}
        />
      )}
    </div>,
    document.body
  );
};
