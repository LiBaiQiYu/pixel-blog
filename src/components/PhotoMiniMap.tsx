import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MAPBOX_TOKEN,
  addMapboxTerrain,
  getMapboxMapConfig,
} from '../lib/mapbox-style';
import type { ThemeMode } from '../types/blog';
import type { GalleryPhoto } from '../types/gallery';

interface PhotoMiniMapProps {
  photo: GalleryPhoto;
  theme: ThemeMode;
}

export const PhotoMiniMap: React.FC<PhotoMiniMapProps> = ({ photo, theme }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasToken = Boolean(MAPBOX_TOKEN);
  const latitude = photo.lat;
  const longitude = photo.lon;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasToken || latitude === undefined || longitude === undefined) {
      return;
    }

    const map = new mapboxgl.Map({
      container,
      ...getMapboxMapConfig(theme),
      center: [longitude, latitude],
      zoom: 12.5,
      interactive: false,
      attributionControl: true,
    });

    map.on('load', () => addMapboxTerrain(map, theme));

    const el = document.createElement('div');
    el.className = 'gallery-pin is-active';
    const core = document.createElement('span');
    el.appendChild(core);

    new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([longitude, latitude])
      .addTo(map);

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [photo.id, latitude, longitude, theme, hasToken]);

  return (
    <div className="relative h-[150px] rounded-xl overflow-hidden border border-slate-300/60 dark:border-white/15">
      {hasToken ? (
        <div ref={containerRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-100/70 dark:bg-slate-900/60">
          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
            MAPBOX TOKEN 未配置
          </span>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
            在 .env.local 填写 VITE_MAPBOX_ACCESS_TOKEN
          </span>
        </div>
      )}
      <span className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950/80 text-cyan-300 border border-white/15">
        LOCATION
      </span>
    </div>
  );
};
