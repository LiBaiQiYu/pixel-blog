import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  Maximize,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import type { GalleryPhoto } from '../types/gallery';
import type { ThemeMode } from '../types/blog';
import { convertHeicToJpeg, isHeicBlob, isHeicUrl } from '../lib/heic';

const PhotoMiniMap = lazy(() =>
  import('./PhotoMiniMap').then((module) => ({
    default: module.PhotoMiniMap,
  }))
);

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface ImageLoadState {
  loaded: number;
  total: number;
  phase: 'download' | 'convert' | 'decode';
}

type HudPhase = 'hidden' | 'loading' | 'complete' | 'leaving';

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
          ? 'bg-slate-950/60 border-white/10'
          : 'bg-white/60 border-slate-300/70'
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
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [imageError, setImageError] = useState(false);
  const [retryRequest, setRetryRequest] = useState<{
    photoId: string;
    nonce: number;
  } | null>(null);
  const retryNonce =
    retryRequest?.photoId === photo.id ? retryRequest.nonce : 0;
  const [loadState, setLoadState] = useState<ImageLoadState>({
    loaded: 0,
    total: 0,
    phase: 'download',
  });
  const [hudPhase, setHudPhase] = useState<HudPhase>('hidden');
  const [hasPartialProgress, setHasPartialProgress] = useState(false);
  const partialProgressRef = useRef(false);
  const [loadedMediumId, setLoadedMediumId] = useState<string | null>(null);
  const [livePlaying, setLivePlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [infoOpen, setInfoOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [viewport, setViewport] = useState({ w: 1, h: 1 });
  const [fit, setFit] = useState({ w: 1, h: 1 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    x: number;
    y: number;
  } | null>(null);
  const panStartRef = useRef<{
    x: number;
    y: number;
    viewX: number;
    viewY: number;
  } | null>(null);
  const viewRef = useRef({ scale: 1, x: 0, y: 0 });
  const targetViewRef = useRef({ scale: 1, x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);

  const index = useMemo(
    () => photos.findIndex((item) => item.id === photo.id),
    [photos, photo.id]
  );
  const hasLiveVideo = Boolean(photo.meta.liveVideo) && !videoFailed;
  const isDark = theme === 'dark';

  const isLoading = !bitmap && !imageError;
  const isConverting = loadState.phase === 'convert' && isLoading;
  const isDecoding = loadState.phase === 'decode' && isLoading;
  const mediumReady = loadedMediumId === photo.id;
  const hudComplete = hudPhase === 'complete' || hudPhase === 'leaving';
  const downloadRatio =
    loadState.total > 0
      ? clamp(loadState.loaded / loadState.total, 0, 1)
      : 0;
  const loadingPercent =
    loadState.phase === 'download' && loadState.total > 0
      ? Math.min(100, Math.round(downloadRatio * 100))
      : null;

  // Keep the 600px thumbnail crisp while the 2048px preview / original arrive.
  const placeholderStyle: React.CSSProperties = {
    opacity: bitmap || mediumReady ? 0 : 1,
  };

  // Show the HUD only after real partial download progress is observed, so a
  // cache hit does not flash a completed 100% bar.
  useEffect(() => {
    if (!isLoading || !hasPartialProgress || hudPhase !== 'hidden') return;
    const timer = window.setTimeout(() => {
      setHudPhase((phase) => (phase === 'hidden' ? 'loading' : phase));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isLoading, hasPartialProgress, hudPhase]);

  // Keep a completed HUD on screen briefly, then drop it away elastically.
  useEffect(() => {
    if (!bitmap) return;
    setHudPhase((phase) => (phase === 'loading' ? 'complete' : phase));
  }, [bitmap]);

  useEffect(() => {
    if (hudPhase !== 'complete') return;
    const timer = window.setTimeout(() => setHudPhase('leaving'), 1500);
    return () => window.clearTimeout(timer);
  }, [hudPhase]);

  useEffect(() => {
    if (hudPhase !== 'leaving') return;
    const timer = window.setTimeout(() => setHudPhase('hidden'), 550);
    return () => window.clearTimeout(timer);
  }, [hudPhase]);

  useEffect(() => {
    if (imageError) setHudPhase('hidden');
  }, [imageError]);

  // Reset everything when switching photos
  useEffect(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    const resetView = { scale: 1, x: 0, y: 0 };
    viewRef.current = resetView;
    targetViewRef.current = resetView;
    setImageError(false);
    setRetryRequest(null);
    setLoadState({ loaded: 0, total: 0, phase: 'download' });
    setHudPhase('hidden');
    setHasPartialProgress(false);
    partialProgressRef.current = false;
    setLivePlaying(false);
    setVideoFailed(false);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setDragging(false);
    pointersRef.current.clear();
    pinchRef.current = null;
    panStartRef.current = null;
  }, [photo.id]);

  // Cancel any pending zoom animation on unmount
  useEffect(
    () => () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    },
    []
  );

  // Lock background scrolling while preview is open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Track the viewport size so pan/zoom stays clamped to the image bounds
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setViewport({ w: el.clientWidth, h: el.clientHeight });
    });
    observer.observe(el);
    setViewport({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  // Compute the object-contain display size for clamping
  useEffect(() => {
    if (!bitmap || !viewport.w || !viewport.h) return;
    const ratio = Math.min(
      viewport.w / bitmap.width,
      viewport.h / bitmap.height
    );
    setFit({ w: bitmap.width * ratio, h: bitmap.height * ratio });
  }, [bitmap, viewport]);

  // Load the original image as an ImageBitmap (honours EXIF orientation)
  useEffect(() => {
    let cancelled = false;
    let xhr: XMLHttpRequest | null = null;
    let sendTimer: number | null = null;

    setBitmap(null);
    setImageError(false);
    setLoadState({ loaded: 0, total: 0, phase: 'download' });
    setHasPartialProgress(false);
    partialProgressRef.current = false;
    const requestUrl =
      retryNonce > 0
        ? `${photo.original}${photo.original.includes('?') ? '&' : '?'}retry=${retryNonce}`
        : photo.original;

    const loadBlob = () =>
      new Promise<Blob>((resolve, reject) => {
        const request = new XMLHttpRequest();
        xhr = request;
        request.open('GET', requestUrl);
        request.responseType = 'blob';

        request.onprogress = (event) => {
          if (cancelled) return;
          if (
            !partialProgressRef.current &&
            event.loaded > 0 &&
            (!event.lengthComputable || event.loaded < event.total)
          ) {
            partialProgressRef.current = true;
            setHasPartialProgress(true);
          }
          setLoadState({
            loaded: event.loaded,
            total: event.lengthComputable ? event.total : 0,
            phase: 'download',
          });
        };

        request.onload = () => {
          if (request.status < 200 || request.status >= 300) {
            reject(new Error(`HTTP ${request.status}`));
            return;
          }
          const blob = request.response as Blob | null;
          if (!blob) {
            reject(new Error('Empty image response'));
            return;
          }
          setLoadState({
            loaded: blob.size,
            total: blob.size,
            phase: 'decode',
          });
          resolve(blob);
        };

        request.onerror = () => reject(new Error('Network error'));
        request.onabort = () =>
          reject(new DOMException('Aborted', 'AbortError'));
        // Defer the send by one task so React StrictMode's immediate
        // mount/unmount in development cannot start two downloads.
        sendTimer = window.setTimeout(() => request.send(), 0);
      });

    (async () => {
      try {
        const blob = await loadBlob();
        if (cancelled) return;

        const heic =
          isHeicUrl(photo.original) || (await isHeicBlob(blob));
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
      } catch (error) {
        if (
          !cancelled &&
          !(error instanceof DOMException && error.name === 'AbortError')
        ) {
          setImageError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (sendTimer !== null) window.clearTimeout(sendTimer);
      xhr?.abort();
    };
  }, [photo.original, retryNonce]);

  // Release the bitmap when it is replaced or the viewer closes
  useEffect(
    () => () => {
      bitmap?.close();
    },
    [bitmap]
  );

  // Draw the photo on a canvas: CSS transform scaling of very large images
  // produces GPU tiling seams (visible grid lines), while canvas stays seamless.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap || !viewport.w || !viewport.h || livePlaying) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewport.w * dpr);
    canvas.height = Math.round(viewport.h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.w, viewport.h);

    const ratio = Math.min(
      viewport.w / bitmap.width,
      viewport.h / bitmap.height
    );
    const drawWidth = bitmap.width * ratio;
    const drawHeight = bitmap.height * ratio;

    ctx.translate(viewport.w / 2 + pan.x, viewport.h / 2 + pan.y);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      bitmap,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
  }, [bitmap, scale, pan, viewport, livePlaying]);

  const clampPan = useCallback(
    (x: number, y: number, nextScale: number) => {
      const maxX = Math.max(0, (fit.w * nextScale - viewport.w) / 2);
      const maxY = Math.max(0, (fit.h * nextScale - viewport.h) / 2);
      return {
        x: clamp(x, -maxX, maxX),
        y: clamp(y, -maxY, maxY),
      };
    },
    [fit, viewport]
  );

  const stopZoomAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const syncView = useCallback(
    (next: { scale: number; x: number; y: number }) => {
      viewRef.current = next;
      targetViewRef.current = next;
      setScale(next.scale);
      setPan({ x: next.x, y: next.y });
    },
    []
  );

  // Smoothly animate towards a target view (used by wheel / buttons / reset)
  const animateView = useCallback(
    (target: { scale: number; x: number; y: number }) => {
      targetViewRef.current = target;
      if (animationRef.current !== null) return;

      const tick = () => {
        const current = viewRef.current;
        const goal = targetViewRef.current;
        const next = {
          scale: current.scale + (goal.scale - current.scale) * 0.28,
          x: current.x + (goal.x - current.x) * 0.28,
          y: current.y + (goal.y - current.y) * 0.28,
        };

        if (
          Math.abs(goal.scale - next.scale) < 0.002 &&
          Math.abs(goal.x - next.x) < 0.3 &&
          Math.abs(goal.y - next.y) < 0.3
        ) {
          viewRef.current = goal;
          setScale(goal.scale);
          setPan({ x: goal.x, y: goal.y });
          animationRef.current = null;
          return;
        }

        viewRef.current = next;
        setScale(next.scale);
        setPan({ x: next.x, y: next.y });
        animationRef.current = requestAnimationFrame(tick);
      };

      animationRef.current = requestAnimationFrame(tick);
    },
    []
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = clientX - rect.left - rect.width / 2;
      const cy = clientY - rect.top - rect.height / 2;

      const base = targetViewRef.current;
      const nextScale = clamp(base.scale * factor, 1, 8);
      const ratio = nextScale / base.scale;
      const next = clampPan(
        cx - (cx - base.x) * ratio,
        cy - (cy - base.y) * ratio,
        nextScale
      );
      animateView({ scale: nextScale, x: next.x, y: next.y });
    },
    [animateView, clampPan]
  );

  const resetZoom = useCallback(() => {
    animateView({ scale: 1, x: 0, y: 0 });
  }, [animateView]);

  // Desktop wheel: zoom under the cursor
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onNavigate(-1);
      if (event.key === 'ArrowRight') onNavigate(1);
      if (event.key === '+' || event.key === '=') {
        const el = viewportRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.25);
        }
      }
      if (event.key === '-' || event.key === '_') {
        const el = viewportRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.8);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigate, zoomAt]);

  // Pointer / touch gestures: drag to pan, pinch to zoom
  const pointerDistance = () => {
    const points = Array.from(pointersRef.current.values());
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const pointerMid = () => {
    const points = Array.from(pointersRef.current.values());
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);

    stopZoomAnimation();
    const current = viewRef.current;
    targetViewRef.current = current;

    if (pointersRef.current.size === 1) {
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        viewX: current.x,
        viewY: current.y,
      };
      draggedRef.current = false;
    } else if (pointersRef.current.size === 2) {
      pinchRef.current = {
        distance: pointerDistance(),
        scale: current.scale,
        x: current.x,
        y: current.y,
      };
      panStartRef.current = null;
    }
  };

  const draggedRef = useRef(false);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const nextDistance = pointerDistance();
      if (!nextDistance || !pinchRef.current.distance) return;
      const factor = nextDistance / pinchRef.current.distance;
      const nextScale = clamp(pinchRef.current.scale * factor, 1, 8);
      const mid = pointerMid();
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = mid.x - rect.left - rect.width / 2;
      const cy = mid.y - rect.top - rect.height / 2;
      const ratio = nextScale / pinchRef.current.scale;
      const next = clampPan(
        cx - (cx - pinchRef.current.x) * ratio,
        cy - (cy - pinchRef.current.y) * ratio,
        nextScale
      );
      syncView({ scale: nextScale, x: next.x, y: next.y });
      setDragging(true);
      draggedRef.current = true;
      return;
    }

    if (
      pointersRef.current.size === 1 &&
      panStartRef.current &&
      viewRef.current.scale > 1
    ) {
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        draggedRef.current = true;
        setDragging(true);
      }
      const next = clampPan(
        panStartRef.current.viewX + dx,
        panStartRef.current.viewY + dy,
        viewRef.current.scale
      );
      syncView({ scale: viewRef.current.scale, x: next.x, y: next.y });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (pointersRef.current.size === 1) {
      const [remaining] = Array.from(pointersRef.current.values());
      panStartRef.current = {
        x: remaining.x,
        y: remaining.y,
        viewX: viewRef.current.x,
        viewY: viewRef.current.y,
      };
    } else if (pointersRef.current.size === 0) {
      panStartRef.current = null;
      setDragging(false);
    }
  };

  const handleDoubleClick = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    resetZoom();
  };

  const mediaStyle: React.CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
    transition: dragging || pointersRef.current.size > 1 ? 'none' : 'transform 120ms ease-out',
  };

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

  const InfoContent = (
    <div className="space-y-4 text-slate-700 dark:text-slate-200">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-600 dark:text-cyan-300">
          <Camera className="w-3 h-3" />
          {photo.category}
          {photo.place ? ` · ${photo.place}` : ''}
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

      {(coords || photo.locationName) && (
        <div className="space-y-2">
          {coords && (
            <Suspense
              fallback={
                <div className="h-[150px] rounded-xl border border-slate-300/60 dark:border-white/15 bg-slate-100/60 dark:bg-slate-900/50 flex items-center justify-center text-[10px] font-mono text-slate-400">
                  LOADING MAP…
                </div>
              }
            >
              <PhotoMiniMap photo={photo} theme={theme} />
            </Suspense>
          )}
          <div className="flex items-start gap-1.5 text-[11px] font-mono">
            <MapPin className="w-3 h-3 text-pink-500 shrink-0 mt-0.5" />
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
                <div className="text-slate-500 dark:text-slate-400 leading-snug break-words">
                  {photo.locationName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id} className="space-y-2">
          <div className="text-[10px] font-mono text-sky-600 dark:text-cyan-300">
            {section.title}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {section.params.map((param, paramIndex) => (
              <div
                key={`${section.id}-${param.label}-${paramIndex}`}
                className="min-w-0"
              >
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
      ))}

      {photo.meta.histogram && (
        <RgbHistogram histogram={photo.meta.histogram} theme={theme} />
      )}

      <div className="pt-1 border-t border-slate-300/50 dark:border-white/10 text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>SOURCE: chronoframe</span>
        <span>{photo.meta.isLivePhoto ? 'LIVE PHOTO' : 'STILL PHOTO'}</span>
      </div>
    </div>
  );

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] flex flex-col animate-fadeIn backdrop-blur-2xl ${
        isDark ? 'bg-slate-950/95' : 'bg-slate-50/95'
      }`}
    >
      {/* Viewer toolbar (never covers the image) */}
      <div
        className={`shrink-0 h-14 px-2 sm:px-4 flex items-center justify-between gap-2 border-b backdrop-blur-xl ${
          isDark
            ? 'bg-slate-950/70 border-white/10'
            : 'bg-white/75 border-slate-300/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg liquid-pill text-slate-700 dark:text-slate-200 hover:text-rose-500"
            title="关闭 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 dark:bg-white/5 text-sky-700 dark:text-cyan-300 border border-sky-400/20 dark:border-white/10 whitespace-nowrap">
            {index + 1} / {photos.length}
          </span>
          {hasLiveVideo && (
            <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-pink-500/90 text-white border border-pink-300/60">
              LIVE
            </span>
          )}
          <span className="hidden md:block text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
            {photo.title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const el = viewportRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.8);
            }}
            className="hidden sm:flex p-2 rounded-lg liquid-pill text-slate-700 dark:text-slate-200"
            title="缩小 (-)"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="px-2 py-1 rounded-lg liquid-pill text-[10px] font-mono text-slate-600 dark:text-slate-300 min-w-[3.2rem] flex items-center justify-center gap-1"
            title="重置缩放 (双击)"
          >
            <Maximize className="w-3 h-3" />
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => {
              const el = viewportRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.25);
            }}
            className="hidden sm:flex p-2 rounded-lg liquid-pill text-slate-700 dark:text-slate-200"
            title="放大 (+)"
          >
            <Plus className="w-4 h-4" />
          </button>

          {hasLiveVideo && (
            <button
              type="button"
              onClick={() => setLivePlaying((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-400/40 hover:bg-pink-500/25 flex items-center gap-1 text-[11px] font-mono font-semibold"
              title={livePlaying ? '暂停实况' : '播放实况照片'}
            >
              {livePlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">暂停</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">实况</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setInfoOpen((prev) => !prev)}
            className={`p-2 rounded-lg liquid-pill ${
              infoOpen
                ? 'text-sky-600 dark:text-cyan-300'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="照片信息"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate(-1)}
            className="p-2 rounded-lg liquid-pill text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-cyan-300"
            title="上一张 (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate(1)}
            className="p-2 rounded-lg liquid-pill text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-cyan-300"
            title="下一张 (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main viewer */}
      <div className="flex-1 min-h-0 flex">
        <div
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
          className={`relative flex-1 min-h-0 overflow-hidden touch-none select-none flex items-center justify-center ${
            scale > 1
              ? dragging
                ? 'cursor-grabbing-pixel'
                : 'cursor-grab-pixel'
              : 'cursor-zoom-pixel'
          }`}
        >
          {livePlaying && hasLiveVideo ? (
            <video
              key={photo.id}
              src={photo.meta.liveVideo as string}
              poster={photo.src}
              autoPlay
              muted
              loop
              playsInline
              onError={() => {
                setVideoFailed(true);
                setLivePlaying(false);
              }}
              className="max-h-full max-w-full object-contain pointer-events-none"
              style={mediaStyle}
            />
          ) : (
            <>
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={mediaStyle}
              >
                <img
                  src={photo.src}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="h-full w-full object-contain transition-opacity duration-300"
                  style={placeholderStyle}
                />
              </div>
              {/* 2048px preview: sharp immediately, follows pan/zoom until the original is ready */}
              {photo.medium && (
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  style={mediaStyle}
                >
                  <img
                    key={photo.id}
                    src={photo.medium}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    decoding="async"
                    onLoad={() => setLoadedMediumId(photo.id)}
                    onError={() =>
                      setLoadedMediumId((current) =>
                        current === photo.id ? null : current
                      )
                    }
                    className={`h-full w-full object-contain transition-opacity duration-300 ${
                      mediumReady ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
              )}
              {/* Canvas avoids GPU tiling seams from CSS-scaling huge photos */}
              <canvas
                ref={canvasRef}
                aria-label={photo.title}
                className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${
                  bitmap ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {hudPhase !== 'hidden' && !livePlaying && (
                <div
                  className={`absolute inset-x-0 bottom-4 flex justify-center pointer-events-none px-3 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform ${
                    hudPhase === 'leaving'
                      ? 'translate-y-10 opacity-0'
                      : 'translate-y-0 opacity-100'
                  }`}
                >
                  <div
                    role="status"
                    aria-live="polite"
                    className={`w-full max-w-[300px] rounded-lg border bg-slate-950/85 px-3 py-2 font-mono backdrop-blur-md ${
                      hudComplete
                        ? 'border-emerald-400/35 shadow-[0_0_24px_rgba(52,211,153,0.14)]'
                        : 'border-cyan-400/30 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px]">
                      {hudComplete ? (
                        <span className="flex items-center gap-1.5 text-emerald-300">
                          <Check className="h-3 w-3" />
                          LOAD COMPLETE
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-cyan-300">
                          <span className="inline-block h-1.5 w-1.5 animate-pulse bg-cyan-400" />
                          {isConverting
                            ? 'CONVERTING HEIC'
                            : isDecoding
                              ? 'DECODING ORIGINAL'
                              : mediumReady
                                ? 'LOADING FULL RES'
                                : 'LOADING PREVIEW'}
                        </span>
                      )}
                      <span
                        className={`tabular-nums ${
                          hudComplete ? 'text-emerald-200' : 'text-slate-300'
                        }`}
                      >
                        {hudComplete
                          ? '100%'
                          : loadingPercent === null
                            ? '--'
                            : `${loadingPercent}%`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm border border-white/5 bg-slate-800/90">
                      {hudComplete ? (
                        <div className="h-full w-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
                      ) : loadingPercent === null ? (
                        <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-cyan-500/10 via-cyan-300 to-sky-400/10" />
                      ) : (
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-[width] duration-300 ease-out"
                          style={{ width: `${loadingPercent}%` }}
                        />
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-[10px] tabular-nums text-slate-400">
                      <span>
                        {formatBytes(loadState.loaded)}
                        {loadState.total > 0
                          ? ` / ${formatBytes(loadState.total)}`
                          : ''}
                      </span>
                      <span className={hudComplete ? 'text-emerald-300/80' : ''}>
                        {hudComplete
                          ? '加载完成'
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
              {imageError && (
                <div className="absolute inset-x-0 bottom-4 flex justify-center px-3">
                  <div className="flex max-w-full items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-950/85 px-3 py-1.5 font-mono text-[11px] text-rose-200 backdrop-blur-md">
                    <span className="truncate">
                      {mediumReady
                        ? '原图加载失败，已显示中图预览'
                        : '原图加载失败，请检查网络后重试'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setRetryRequest({
                          photoId: photo.id,
                          nonce: Date.now(),
                        })
                      }
                      className="flex shrink-0 items-center gap-1 rounded-md border border-rose-300/30 bg-rose-400/15 px-2 py-0.5 text-rose-100 transition-colors hover:bg-rose-400/25"
                    >
                      <RefreshCw className="h-3 w-3" />
                      重新加载
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {livePlaying && (
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-mono bg-pink-500/90 text-white border border-pink-300/60 pointer-events-none">
              LIVE PHOTO
            </div>
          )}

          {/* Interaction hint */}
          {!isLoading && !livePlaying && (
            <>
              <div className="pointer-events-none absolute bottom-3 left-3 text-[10px] font-mono text-slate-500/80 dark:text-slate-400/80 hidden sm:block">
                滚轮缩放 · 拖动平移 · 双击还原
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 text-[10px] font-mono text-slate-500/80 dark:text-slate-400/80 sm:hidden">
                双指缩放 · 拖动平移
              </div>
            </>
          )}
        </div>

        {/* Desktop info drawer */}
        {infoOpen && (
          <aside
            className={`hidden lg:flex flex-col w-[380px] shrink-0 border-l overflow-y-auto p-5 backdrop-blur-2xl ${
              isDark
                ? 'border-white/10 bg-slate-950/60'
                : 'border-slate-300/60 bg-white/60'
            }`}
          >
            {InfoContent}
          </aside>
        )}
      </div>

      {/* Mobile/tablet info sheet */}
      {infoOpen && (
        <div
          className={`lg:hidden absolute inset-x-0 top-14 bottom-0 z-20 flex flex-col rounded-t-2xl border-t backdrop-blur-2xl animate-fadeIn ${
            isDark
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
              onClick={() => setInfoOpen(false)}
              className="p-1.5 rounded-lg liquid-pill text-slate-600 dark:text-slate-300"
              title="收起信息"
            >
              <ChevronLeft className="w-4 h-4 -rotate-90" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {InfoContent}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
