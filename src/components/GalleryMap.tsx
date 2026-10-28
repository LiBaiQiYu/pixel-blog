import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CalendarDays, Images, MapPin, X } from 'lucide-react';
import {
  MAPBOX_TOKEN,
  addMapboxTerrain,
  getMapboxMapConfig,
} from '../lib/mapbox-style';
import type { GalleryPhoto } from '../types/gallery';
import type { ThemeMode } from '../types/blog';

interface GalleryMapProps {
  photos: GalleryPhoto[];
  theme: ThemeMode;
  viewerOpen?: boolean;
  onOpen: (id: string) => void;
}

interface HoverState {
  title: string;
  label: string;
  photos: LocatedPhoto[];
  x: number;
  y: number;
  above: boolean;
}

interface ClusterModalState {
  title: string;
  photos: LocatedPhoto[];
}

interface PhotoGroup {
  key: string;
  label: string;
  photos: LocatedPhoto[];
  center: [number, number];
}

interface MarkerHandlers {
  onOpen: () => void;
  onOpenCluster: () => void;
  onHover: () => void;
  onLeave: () => void;
}

type LocatedPhoto = GalleryPhoto & { lat: number; lon: number };

const DEFAULT_CENTER: [number, number] = [87.4, 48.2];
const CLUSTER_RADIUS = 30;
const MAX_PREVIEW = 9;
const HOVER_OPEN_DELAY = 180;
const HOVER_CLOSE_DELAY = 180;
const HOVER_CARD_WIDTH = 280;
const HOVER_CARD_HEIGHT = 350;
const HOVER_CARD_GAP = 38;

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
});

function hasLocation(photo: GalleryPhoto): photo is LocatedPhoto {
  return typeof photo.lat === 'number' && typeof photo.lon === 'number';
}

function getDateRange(photos: LocatedPhoto[]) {
  if (photos.length === 0) return '';
  const dates = photos.map((photo) => photo.date).sort();
  const start = shortDateFormatter.format(new Date(dates[0]));
  const end = shortDateFormatter.format(new Date(dates[dates.length - 1]));
  return start === end ? start : `${start} - ${end}`;
}

function clusterPhotos(
  zoom: number,
  photos: LocatedPhoto[]
): PhotoGroup[] {
  const scale = 512 * Math.pow(2, zoom);
  const projected = photos.map((photo) => {
    const point = mapboxgl.MercatorCoordinate.fromLngLat([
      photo.lon,
      photo.lat,
    ]);
    return {
      photo,
      point: {
        x: point.x * scale,
        y: point.y * scale,
      },
    };
  });
  const assigned = new Set<string>();
  const groups: PhotoGroup[] = [];
  const radiusSquared = CLUSTER_RADIUS * CLUSTER_RADIUS;

  projected.forEach((entry, index) => {
    if (assigned.has(entry.photo.id)) return;
    assigned.add(entry.photo.id);

    const members = [entry.photo];
    for (let nextIndex = index + 1; nextIndex < projected.length; nextIndex += 1) {
      const next = projected[nextIndex];
      if (assigned.has(next.photo.id)) continue;

      const dx = entry.point.x - next.point.x;
      const dy = entry.point.y - next.point.y;
      if (dx * dx + dy * dy > radiusSquared) continue;

      assigned.add(next.photo.id);
      members.push(next.photo);
    }

    const labelCounts = new Map<string, number>();
    members.forEach((photo) => {
      const label =
        photo.place ??
        photo.area ??
        photo.city ??
        photo.locationName ??
        '附近';
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    });
    const label =
      Array.from(labelCounts.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] ?? '附近';
    const center: [number, number] = [
      members.reduce((sum, photo) => sum + photo.lon, 0) / members.length,
      members.reduce((sum, photo) => sum + photo.lat, 0) / members.length,
    ];

    groups.push({
      key: members
        .map((photo) => photo.id)
        .sort()
        .join('|'),
      label,
      photos: members,
      center,
    });
  });

  return groups;
}

function createMarkerShell() {
  const shell = document.createElement('div');
  shell.className = 'gallery-map-marker';
  return shell;
}

function createPhotoMarker(
  photo: LocatedPhoto,
  offset: [number, number],
  handlers: MarkerHandlers
) {
  const shell = createMarkerShell();
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'gallery-map-pin';
  element.style.backgroundImage = `url("${photo.src}")`;
  element.title = [photo.title, photo.place].filter(Boolean).join(' · ');
  element.setAttribute('aria-label', `查看 ${photo.title}`);
  element.addEventListener('click', handlers.onOpen);
  element.addEventListener('mouseenter', handlers.onHover);
  element.addEventListener('mouseleave', handlers.onLeave);
  element.addEventListener('focus', handlers.onHover);
  element.addEventListener('blur', handlers.onLeave);
  shell.appendChild(element);

  return new mapboxgl.Marker({
    element: shell,
    anchor: 'center',
    offset,
  }).setLngLat([photo.lon, photo.lat]);
}

function createClusterMarker(group: PhotoGroup, handlers: MarkerHandlers) {
  const shell = createMarkerShell();
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'gallery-map-cluster';
  element.style.backgroundImage = `url("${group.photos[0].src}")`;
  element.title = `${group.label} · ${group.photos.length} 张照片`;
  element.setAttribute(
    'aria-label',
    `查看 ${group.label} 的 ${group.photos.length} 张照片`
  );
  element.addEventListener('click', handlers.onOpenCluster);
  element.addEventListener('mouseenter', handlers.onHover);
  element.addEventListener('mouseleave', handlers.onLeave);
  element.addEventListener('focus', handlers.onHover);
  element.addEventListener('blur', handlers.onLeave);

  const badge = document.createElement('span');
  badge.textContent = String(group.photos.length);
  element.appendChild(badge);
  shell.appendChild(element);

  return new mapboxgl.Marker({
    element: shell,
    anchor: 'center',
  }).setLngLat(group.center);
}

const ClusterModal: React.FC<{
  cluster: ClusterModalState;
  viewerOpen?: boolean;
  onClose: () => void;
  onOpenPhoto: (id: string) => void;
}> = ({ cluster, viewerOpen = false, onClose, onOpenPhoto }) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (viewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, viewerOpen]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${cluster.title} 的照片`}
        className="gallery-map-modal-panel flex max-h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl shadow-slate-950/40 dark:border-white/15 dark:bg-slate-950/95"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-mono text-sky-600 dark:text-cyan-300">
              <Images className="h-3.5 w-3.5" />
              CLUSTER PREVIEW
            </div>
            <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
              {cluster.title}
            </h3>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
              {cluster.photos.length} 张照片 · {getDateRange(cluster.photos)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200/80 p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="关闭照片预览"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {cluster.photos.map((photo, index) => (
              <button
                type="button"
                key={photo.id}
                onClick={() => onOpenPhoto(photo.id)}
                className="gallery-map-grid-item group relative aspect-square overflow-hidden rounded-lg border border-slate-200/70 bg-slate-200 bg-cover bg-center text-left dark:border-white/10 dark:bg-slate-900"
                style={{
                  animationDelay: `${Math.min(index, 18) * 40}ms`,
                  backgroundImage: photo.placeholder
                    ? `url("${photo.placeholder}")`
                    : undefined,
                }}
                title={photo.title}
              >
                <img
                  src={photo.src}
                  alt={photo.title}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-slate-950/90 to-transparent px-1.5 pb-1 pt-5 text-[9px] font-mono text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {photo.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const GalleryMap: React.FC<GalleryMapProps> = ({
  photos,
  theme,
  viewerOpen = false,
  onOpen,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const hoverOpenTimer = useRef<number | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [clusterModal, setClusterModal] =
    useState<ClusterModalState | null>(null);
  const [loading, setLoading] = useState(Boolean(MAPBOX_TOKEN));
  const hasToken = Boolean(MAPBOX_TOKEN);
  const locatedPhotos = useMemo(() => photos.filter(hasLocation), [photos]);

  const clearHoverTimers = () => {
    if (hoverOpenTimer.current !== null) {
      window.clearTimeout(hoverOpenTimer.current);
      hoverOpenTimer.current = null;
    }
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const cancelHoverClose = () => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const scheduleHoverClose = () => {
    if (hoverOpenTimer.current !== null) {
      window.clearTimeout(hoverOpenTimer.current);
      hoverOpenTimer.current = null;
    }
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
    }
    hoverCloseTimer.current = window.setTimeout(() => {
      hoverCloseTimer.current = null;
      if (
        document
          .querySelector('.gallery-map-hover-card')
          ?.matches(':hover')
      ) {
        return;
      }
      setHover(null);
    }, HOVER_CLOSE_DELAY);
  };

  const openPhoto = (id: string, keepCluster = false) => {
    clearHoverTimers();
    setHover(null);
    if (!keepCluster) setClusterModal(null);
    onOpenRef.current(id);
  };

  const openCluster = (title: string, clusterPhotos: LocatedPhoto[]) => {
    clearHoverTimers();
    setHover(null);
    setClusterModal({ title, photos: clusterPhotos });
  };

  useEffect(() => {
    return () => {
      clearHoverTimers();
    };
  }, []);

  useEffect(() => {
    if (!clusterModal) return;
    if (locatedPhotos.some((photo) => clusterModal.photos.some((item) => item.id === photo.id))) {
      return;
    }
    setClusterModal(null);
  }, [clusterModal, locatedPhotos]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasToken) return;

    setLoading(true);
    setHover(null);
    const map = new mapboxgl.Map({
      container,
      ...getMapboxMapConfig(theme),
      center: DEFAULT_CENTER,
      zoom: 8,
      attributionControl: true,
    });

    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        visualizePitch: true,
      }),
      'top-right'
    );

    const markers: mapboxgl.Marker[] = [];

    const clearMarkers = () => {
      while (markers.length) markers.pop()?.remove();
    };

    const closeHover = () => {
      clearHoverTimers();
      setHover(null);
    };

    const scheduleHover = (
      title: string,
      label: string,
      groupPhotosForCard: LocatedPhoto[],
      lngLat: [number, number],
      offset: [number, number]
    ) => {
      clearHoverTimers();
      setHover(null);
      hoverOpenTimer.current = window.setTimeout(() => {
        hoverOpenTimer.current = null;
        const point = map.project(lngLat);
        const rect = map.getContainer().getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const halfWidth = HOVER_CARD_WIDTH / 2;
        const x = Math.min(
          Math.max(rect.left + point.x + offset[0], halfWidth + 12),
          viewportWidth - halfWidth - 12
        );
        const y = rect.top + point.y + offset[1];
        setHover({
          title,
          label,
          photos: groupPhotosForCard,
          x,
          y,
          above: y > HOVER_CARD_HEIGHT,
        });
      }, HOVER_OPEN_DELAY);
    };

    const fitPhotos = () => {
      if (locatedPhotos.length === 0) {
        map.setCenter(DEFAULT_CENTER);
        map.setZoom(8);
        return;
      }
      if (locatedPhotos.length === 1) {
        map.setCenter([locatedPhotos[0].lon, locatedPhotos[0].lat]);
        map.setZoom(14);
        return;
      }

      const bounds = new mapboxgl.LngLatBounds();
      locatedPhotos.forEach((photo) => {
        bounds.extend([photo.lon, photo.lat]);
      });
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 90, left: 70, right: 70 },
        maxZoom: 12,
        duration: 0,
      });
    };

    let lastClusterSignature = '';
    const renderMarkers = () => {
      const groups = clusterPhotos(map.getZoom(), locatedPhotos);
      const signature = groups
        .map((group) => group.photos.map((photo) => photo.id).join(','))
        .join(';');
      if (signature === lastClusterSignature) return;
      lastClusterSignature = signature;

      clearMarkers();
      groups.forEach((group) => {
        if (group.photos.length === 1) {
          const photo = group.photos[0];
          markers.push(
            createPhotoMarker(photo, [0, 0], {
              onOpen: () => openPhoto(photo.id),
              onOpenCluster: () => openCluster(group.label, group.photos),
              onHover: () =>
                scheduleHover(
                  photo.title,
                  group.label,
                  [photo],
                  [photo.lon, photo.lat],
                  [0, 0]
                ),
              onLeave: scheduleHoverClose,
            })
          );
          return;
        }

        markers.push(
          createClusterMarker(group, {
            onOpen: () => openCluster(group.label, group.photos),
            onOpenCluster: () => openCluster(group.label, group.photos),
            onHover: () =>
              scheduleHover(
                '附近照片',
                group.label,
                group.photos,
                group.center,
                [0, 0]
              ),
            onLeave: scheduleHoverClose,
          })
        );
      });

      markers.forEach((marker) => marker.addTo(map));
    };

    map.on('load', () => {
      addMapboxTerrain(map, theme);
      setLoading(false);
      fitPhotos();
      renderMarkers();
    });
    map.on('zoomend', renderMarkers);
    map.on('movestart', closeHover);
    map.on('zoomstart', closeHover);
    map.on('error', () => setLoading(false));

    const onWindowChange = () => closeHover();
    window.addEventListener('scroll', onWindowChange, true);
    window.addEventListener('resize', onWindowChange);

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.off('zoomend', renderMarkers);
      map.off('movestart', closeHover);
      map.off('zoomstart', closeHover);
      window.removeEventListener('scroll', onWindowChange, true);
      window.removeEventListener('resize', onWindowChange);
      clearHoverTimers();
      setHover(null);
      clearMarkers();
      map.remove();
    };
  }, [hasToken, locatedPhotos, theme]);

  const hoverDateRange = hover ? getDateRange(hover.photos) : '';
  const hoverOverflow = hover
    ? Math.max(0, hover.photos.length - MAX_PREVIEW)
    : 0;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-slate-300/70 dark:border-white/15 bg-slate-200/60 dark:bg-slate-950/60">
        {hasToken ? (
          <div
            ref={containerRef}
            className="h-[68vh] min-h-[480px] w-full sm:min-h-[560px]"
          />
        ) : (
          <div className="flex h-[68vh] min-h-[480px] w-full flex-col items-center justify-center gap-2 bg-slate-100/70 dark:bg-slate-900/60 sm:min-h-[560px]">
            <MapPin className="h-6 w-6 text-slate-400" />
            <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
              MAPBOX TOKEN 未配置
            </span>
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              请在 .env.local 填写 NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/80 px-2.5 py-1.5 text-[10px] font-mono text-cyan-200 backdrop-blur-md">
          <MapPin className="h-3 w-3" />
          {locatedPhotos.length} 张照片 · 点击聚合点查看全部
        </div>

        {hasToken && locatedPhotos.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/20">
            <div className="rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 font-mono text-xs text-slate-300 backdrop-blur-md">
              当前分类没有带 GPS 的照片
            </div>
          </div>
        )}

        {loading && hasToken && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/20">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 px-3 py-1.5 font-mono text-[10px] text-cyan-200 backdrop-blur-md">
              <span className="h-1.5 w-1.5 animate-pulse bg-cyan-400" />
              LOADING MAP
            </div>
          </div>
        )}
      </div>

      {hover &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60]"
            style={{
              left: hover.x,
              top: hover.y,
              transform: hover.above
                ? `translate(-50%, calc(-100% - ${HOVER_CARD_GAP}px))`
                : `translate(-50%, ${HOVER_CARD_GAP}px)`,
            }}
          >
            <div
              className="gallery-map-hover-card pointer-events-auto w-[280px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-white/20 bg-white/90 p-2.5 shadow-xl shadow-slate-950/30 backdrop-blur-xl dark:border-white/15 dark:bg-slate-950/90"
              onMouseEnter={cancelHoverClose}
              onMouseOver={cancelHoverClose}
              onPointerEnter={cancelHoverClose}
              onMouseLeave={scheduleHoverClose}
            >
              <div className="flex items-start justify-between gap-2 px-0.5 pb-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                    {hover.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {hover.label}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[9px] text-sky-700 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                  {hover.photos.length} 张
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {hover.photos.slice(0, MAX_PREVIEW).map((photo, index) => {
                  const showOverflow =
                    hoverOverflow > 0 && index === MAX_PREVIEW - 1;
                  return (
                    <button
                      type="button"
                      key={photo.id}
                      onClick={() =>
                        showOverflow
                          ? openCluster(hover.label, hover.photos)
                          : openPhoto(photo.id)
                      }
                      className="gallery-map-grid-item group relative aspect-square overflow-hidden rounded-md border border-slate-200/70 bg-slate-200 bg-cover bg-center text-left dark:border-white/10 dark:bg-slate-900"
                      style={{
                        animationDelay: `${index * 35}ms`,
                        backgroundImage: photo.placeholder
                          ? `url("${photo.placeholder}")`
                          : undefined,
                      }}
                      title={showOverflow ? `查看全部 ${hover.photos.length} 张照片` : photo.title}
                    >
                      <img
                        src={photo.src}
                        alt={photo.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {showOverflow && (
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/70 font-mono text-sm font-bold text-white backdrop-blur-[1px]">
                          +{hoverOverflow}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 px-0.5 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {hoverDateRange}
                </span>
                <span className="truncate">点击图片查看</span>
              </div>
            </div>
          </div>,
          document.body
        )}

      {clusterModal && (
        <ClusterModal
          cluster={clusterModal}
          viewerOpen={viewerOpen}
          onClose={() => setClusterModal(null)}
          onOpenPhoto={(id) => openPhoto(id, true)}
        />
      )}
    </>
  );
};
