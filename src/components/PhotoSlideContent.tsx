'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import type { GalleryPhoto } from '../types/gallery';
import { useLiveVideo } from '../hooks/useLiveVideo';
import { LiveProgressRing } from './LiveProgressRing';
import {
  convertHeicToJpeg,
  isHeicBlob,
  isHeicUrl,
} from '../lib/heic';

interface PhotoSlideContentProps {
  photo: GalleryPhoto;
  active: boolean;
  highQuality: boolean;
  controlsVisible?: boolean;
}

type LoadPhase = 'download' | 'convert' | 'decode';
type HudMode = 'hidden' | 'loading' | 'complete';

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export const PhotoSlideContent: React.FC<PhotoSlideContentProps> = ({
  photo,
  active,
  highQuality,
  controlsVisible = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [originalImageReady, setOriginalImageReady] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [loadState, setLoadState] = useState<{
    loaded: number;
    total: number;
    phase: LoadPhase;
  }>({ loaded: 0, total: 0, phase: 'download' });
  const [hudMode, setHudMode] = useState<HudMode>('hidden');
  const [livePlaying, setLivePlaying] = useState(false);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveHoldTimerRef = useRef<number | null>(null);
  const liveHoldActiveRef = useRef(false);
  const liveHoldStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressLiveClickRef = useRef(false);
  const suppressLiveTimerRef = useRef<number | null>(null);
  const liveAsset = useLiveVideo(
    photo.meta.liveVideo,
    active && Boolean(photo.meta.liveVideo)
  );
  const hasLive = Boolean(photo.meta.liveVideo) && !liveAsset.error;
  const heicSource = isHeicUrl(photo.original);
  const previewSrc = photo.medium || '';
  const layoutSrc = previewSrc || photo.src;
  const originalRequestUrl =
    retryToken > 0
      ? `${photo.original}${photo.original.includes('?') ? '&' : '?'}retry=${retryToken}`
      : photo.original;
  const isLoading =
    active &&
    !imageError &&
    (heicSource ? !bitmap : !originalImageReady);
  const isConverting = heicSource && isLoading && loadState.phase === 'convert';
  const isDecoding = heicSource && isLoading && loadState.phase === 'decode';
  const percent =
    loadState.total > 0
      ? Math.min(100, Math.round((loadState.loaded / loadState.total) * 100))
      : null;

  const stopLiveHold = () => {
    if (liveHoldTimerRef.current !== null) {
      window.clearTimeout(liveHoldTimerRef.current);
      liveHoldTimerRef.current = null;
    }
    liveHoldActiveRef.current = false;
    liveHoldStartRef.current = null;
    setLivePlaying(false);
    liveVideoRef.current?.pause();
  };

  const clearLiveHold = () => {
    if (liveHoldTimerRef.current !== null) {
      window.clearTimeout(liveHoldTimerRef.current);
      liveHoldTimerRef.current = null;
    }
    liveHoldStartRef.current = null;
  };

  const scheduleLiveClickSuppression = () => {
    suppressLiveClickRef.current = true;
    if (suppressLiveTimerRef.current !== null) {
      window.clearTimeout(suppressLiveTimerRef.current);
    }
    suppressLiveTimerRef.current = window.setTimeout(() => {
      suppressLiveClickRef.current = false;
      suppressLiveTimerRef.current = null;
    }, 700);
  };

  const toggleLivePlayback = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!hasLive) return;
    if (livePlaying) {
      stopLiveHold();
    } else {
      setLivePlaying(true);
    }
  };

  const handlePhotoPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!active || !hasLive || !controlsVisible) return;
    const target = event.target;
    if (target instanceof Element && target.closest('button')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    clearLiveHold();
    liveHoldStartRef.current = { x: event.clientX, y: event.clientY };
    liveHoldTimerRef.current = window.setTimeout(() => {
      liveHoldTimerRef.current = null;
      liveHoldActiveRef.current = true;
      scheduleLiveClickSuppression();
      setLivePlaying(true);
    }, 450);
  };

  const handlePhotoPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const start = liveHoldStartRef.current;
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) {
      return;
    }

    clearLiveHold();
    if (liveHoldActiveRef.current) {
      liveHoldActiveRef.current = false;
      scheduleLiveClickSuppression();
      stopLiveHold();
    }
  };

  const handlePhotoPointerEnd = () => {
    clearLiveHold();
    if (!liveHoldActiveRef.current) return;
    liveHoldActiveRef.current = false;
    scheduleLiveClickSuppression();
    stopLiveHold();
  };

  const handlePhotoClickCapture = (event: React.MouseEvent) => {
    if (!suppressLiveClickRef.current) return;
    suppressLiveClickRef.current = false;
    if (suppressLiveTimerRef.current !== null) {
      window.clearTimeout(suppressLiveTimerRef.current);
      suppressLiveTimerRef.current = null;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    return () => {
      if (liveHoldTimerRef.current !== null) {
        window.clearTimeout(liveHoldTimerRef.current);
      }
      if (suppressLiveTimerRef.current !== null) {
        window.clearTimeout(suppressLiveTimerRef.current);
      }
      liveVideoRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!controlsVisible) stopLiveHold();
  }, [controlsVisible]);

  useEffect(() => {
    if (!active) {
      setBitmap(null);
      setCanvasReady(false);
      setOriginalImageReady(false);
      setImageError(false);
      setLoadState({ loaded: 0, total: 0, phase: 'download' });
      setHudMode('hidden');
      setLivePlaying(false);
      liveHoldActiveRef.current = false;
      liveHoldStartRef.current = null;
      if (liveHoldTimerRef.current !== null) {
        window.clearTimeout(liveHoldTimerRef.current);
        liveHoldTimerRef.current = null;
      }
      return;
    }

    setBitmap(null);
    setCanvasReady(false);
    setOriginalImageReady(false);
    setImageError(false);
    setLoadState({ loaded: 0, total: 0, phase: 'download' });
    setHudMode('loading');

    if (!heicSource) {
      return;
    }

    let cancelled = false;
    let xhr: XMLHttpRequest | null = null;

    const openBlob = (url: string) =>
      new Promise<Blob>((resolve, reject) => {
        xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.onprogress = (event) => {
          if (cancelled) return;
          setLoadState({
            loaded: event.loaded,
            total: event.lengthComputable ? event.total : 0,
            phase: 'download',
          });
        };
        xhr.onload = () => {
          if (xhr && xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response as Blob;
            setLoadState({
              loaded: blob.size,
              total: blob.size,
              phase: 'decode',
            });
            resolve(blob);
          } else {
            reject(new Error(`HTTP ${xhr?.status ?? 0}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
        xhr.send();
      });

    const loadBlob = async () => {
      let lastError: unknown = new Error('Network error');

      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (cancelled) break;

        const url =
          attempt === 0
            ? originalRequestUrl
            : `${originalRequestUrl}${originalRequestUrl.includes('?') ? '&' : '?'}autoRetry=${attempt}&t=${Date.now()}`;

        try {
          return await openBlob(url);
        } catch (error) {
          lastError = error;
          if (cancelled) break;
          if (error instanceof Error && /^HTTP 4/.test(error.message)) {
            break;
          }
          if (attempt < 2) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, 260 * (attempt + 1))
            );
          }
        }
      }

      throw lastError;
    };

    const loadFallbackBitmap = () =>
      new Promise<ImageBitmap>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.decoding = 'async';
        image.onload = () => {
          createImageBitmap(image, { imageOrientation: 'from-image' }).then(
            resolve,
            reject
          );
        };
        image.onerror = () => reject(new Error('Image fallback failed'));
        image.src = originalRequestUrl;
      });

    const load = async () => {
      try {
        const blob = await loadBlob();
        if (cancelled) return;

        const heic = isHeicUrl(photo.original) || (await isHeicBlob(blob));
        let nextBitmap: ImageBitmap;

        try {
          nextBitmap = await createImageBitmap(blob, {
            imageOrientation: 'from-image',
          });
        } catch (error) {
          if (!heic) throw error;
          if (cancelled) return;
          setLoadState((state) => ({ ...state, phase: 'convert' }));
          const jpeg = await convertHeicToJpeg(blob, photo.original);
          if (cancelled) return;
          setLoadState((state) => ({ ...state, phase: 'decode' }));
          nextBitmap = await createImageBitmap(jpeg, {
            imageOrientation: 'from-image',
          });
        }

        if (cancelled) {
          nextBitmap.close();
          return;
        }
        setBitmap(nextBitmap);
        setHudMode('complete');
      } catch {
        if (cancelled) return;

        if (!isHeicUrl(photo.original)) {
          try {
            const fallbackBitmap = await loadFallbackBitmap();
            if (cancelled) {
              fallbackBitmap.close();
              return;
            }
            setBitmap(fallbackBitmap);
            setHudMode('complete');
            return;
          } catch {}
        }

        if (!cancelled) {
          setImageError(true);
          setHudMode('hidden');
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      xhr?.abort();
      xhr = null;
    };
  }, [active, heicSource, photo.original, originalRequestUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    let cancelled = false;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (cancelled || bitmap) return;
      canvas.width = image.naturalWidth || photo.width;
      canvas.height = image.naturalHeight || photo.height;
      const context = canvas.getContext('2d');
      context?.drawImage(image, 0, 0);
      setCanvasReady(true);
    };
    image.src = photo.medium || photo.src;

    return () => {
      cancelled = true;
    };
  }, [active, bitmap, photo.medium, photo.width, photo.height, photo.src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap || !active) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    context?.drawImage(bitmap, 0, 0);
    setCanvasReady(true);
  }, [active, bitmap]);

  useEffect(
    () => () => {
      bitmap?.close();
    },
    [bitmap]
  );

  useEffect(() => {
    if (hudMode !== 'complete') return;
    const timer = window.setTimeout(() => setHudMode('hidden'), 1200);
    return () => window.clearTimeout(timer);
  }, [hudMode]);

  return (
    <div
      className="photo-live-hold-surface relative h-full w-full overflow-hidden"
      onPointerDown={handlePhotoPointerDown}
      onPointerMove={handlePhotoPointerMove}
      onPointerUp={handlePhotoPointerEnd}
      onPointerCancel={handlePhotoPointerEnd}
      onPointerLeave={handlePhotoPointerEnd}
      onClickCapture={handlePhotoClickCapture}
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => {
        if (hasLive) event.preventDefault();
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <img
          src={photo.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl saturate-125 opacity-90 transition-[opacity,filter] duration-500 dark:opacity-75 dark:brightness-75"
        />
        <div className="absolute inset-0 bg-white/45 transition-colors duration-500 dark:bg-slate-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(15,23,42,0.1)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_26%,rgba(2,6,23,0.32)_100%)]" />
      </div>

      <div className="swiper-zoom-container relative z-10 flex h-full w-full items-center justify-center">
        <div className="relative flex max-h-full max-w-full items-center justify-center">
          {active && heicSource && (
            <canvas
              ref={canvasRef}
              aria-label={photo.title}
              className={`absolute inset-0 h-full w-full object-contain ${
                canvasReady ? 'visible' : 'invisible'
              }`}
            />
          )}
          {active && !heicSource && (
            <img
              key={`${photo.id}-${retryToken}`}
              src={originalRequestUrl}
              alt={photo.title}
              draggable={false}
              loading="eager"
              decoding="async"
              onLoad={() => {
                setOriginalImageReady(true);
                setImageError(false);
                setHudMode('complete');
              }}
              onError={() => {
                setOriginalImageReady(false);
                setImageError(true);
                setHudMode('hidden');
              }}
              className={`absolute inset-0 h-full w-full select-none object-contain ${
                originalImageReady ? 'visible' : 'invisible'
              }`}
            />
          )}
          <img
            src={layoutSrc}
            alt={active ? photo.title : ''}
            aria-hidden={!active}
            draggable={false}
            loading={highQuality ? 'eager' : 'lazy'}
            decoding="async"
            className={`relative block max-h-full max-w-full select-none object-contain ${
              !active ||
              (heicSource ? !canvasReady : !originalImageReady)
                ? 'visible'
                : 'invisible'
            }`}
          />
        </div>
      </div>

      {active && (hudMode !== 'hidden' || imageError) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
          <div className="w-full max-w-[300px] border border-white/20 bg-slate-950/85 px-3 py-2 font-mono text-[10px] text-slate-200 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                {hudMode === 'complete' ? (
                  <span className="text-emerald-300">LOAD COMPLETE</span>
                ) : imageError ? (
                  <span className="text-rose-300">ORIGINAL FAILED</span>
                ) : (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-cyan-300" />
                    {isConverting
                      ? 'HEIC CONVERTING'
                      : isDecoding
                        ? 'DECODING ORIGINAL'
                        : 'LOADING FULL RES'}
                  </>
                )}
              </span>
              <span className="tabular-nums">
                {hudMode === 'complete'
                  ? '100%'
                  : imageError
                    ? '--'
                    : percent === null
                      ? '--'
                      : `${percent}%`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden border border-white/10 bg-slate-800">
              <div
                className={`h-full transition-[width] duration-300 ${
                  hudMode === 'complete'
                    ? 'w-full bg-emerald-400'
                    : imageError
                      ? 'w-0'
                      : 'bg-gradient-to-r from-cyan-400 to-sky-500'
                }`}
                style={
                  hudMode === 'loading' && percent !== null
                    ? { width: `${percent}%` }
                    : undefined
                }
              />
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 text-slate-400">
              <span>
                {formatBytes(loadState.loaded)}
                {loadState.total > 0
                  ? ` / ${formatBytes(loadState.total)}`
                  : ''}
              </span>
              <span>
                {hudMode === 'complete'
                  ? '加载完成'
                  : imageError
                    ? '原图加载失败，显示预览图'
                    : isConverting
                      ? 'HEIC 转换中'
                      : isDecoding
                        ? '解码中'
                        : loadState.total > 0
                          ? '下载中'
                          : '等待响应'}
              </span>
            </div>
          </div>
        </div>
      )}

      {active && imageError && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center">
          <button
            type="button"
            data-custom-sound
            onClick={() => setRetryToken((token) => token + 1)}
            className="retry-original-button pointer-events-auto flex items-center gap-2 px-3 py-2"
            title="重新加载原图"
            aria-label="重新加载原图"
          >
            <RotateCcw className="retry-original-icon h-3.5 w-3.5" />
            <span className="font-pixel text-[8px] tracking-[0.12em]">
              RETRY
            </span>
            <span className="font-mono text-[10px]">重试原图</span>
          </button>
        </div>
      )}

      {active && hasLive && (
        <>
          {livePlaying && liveAsset.objectUrl ? (
            <video
              ref={liveVideoRef}
              key={photo.id}
              src={liveAsset.objectUrl}
              poster={photo.src}
              autoPlay
              muted
              loop
              playsInline
              disablePictureInPicture
              className="pointer-events-none absolute inset-0 z-10 h-full w-full select-none object-contain"
            />
          ) : null}
          <div
            className={`live-hold-dock absolute left-4 top-4 z-20 ${
              controlsVisible
                ? 'live-hold-dock-enter'
                : 'live-hold-dock-exit'
            }`}
            aria-hidden={!controlsVisible}
          >
            <button
              type="button"
              data-custom-sound
              onClick={toggleLivePlayback}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              className="live-hold-button"
              title={livePlaying ? '停止实况播放' : '播放实况照片'}
              aria-label={livePlaying ? '停止实况播放' : '播放实况照片'}
              aria-pressed={livePlaying}
              tabIndex={controlsVisible ? undefined : -1}
            >
              <LiveProgressRing
                progress={liveAsset.progress}
                loaded={liveAsset.loaded}
                playing={livePlaying}
                size={40}
                className="shadow-lg shadow-slate-950/30"
              />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
