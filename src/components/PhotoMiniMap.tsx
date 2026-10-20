import React, { useEffect, useRef } from 'react';
import { MAP_STYLE_DARK, MAP_STYLE_LIGHT, maplibregl } from './maplibreSetup';
import type { ThemeMode } from '../types/blog';
import type { GalleryPhoto } from '../types/gallery';

interface PhotoMiniMapProps {
  photo: GalleryPhoto;
  theme: ThemeMode;
}

export const PhotoMiniMap: React.FC<PhotoMiniMapProps> = ({ photo, theme }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isDark = theme === 'dark';
    const customStyle = import.meta.env.VITE_MAP_STYLE_URL?.trim();
    const map = new maplibregl.Map({
      container,
      style:
        customStyle || (isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT),
      center: [photo.lon, photo.lat],
      zoom: 12.5,
      interactive: false,
      attributionControl: { compact: true },
    });

    const el = document.createElement('div');
    el.className = 'gallery-pin is-active';
    const core = document.createElement('span');
    el.appendChild(core);

    new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([photo.lon, photo.lat])
      .addTo(map);

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [photo.id, photo.lat, photo.lon, theme]);

  return (
    <div className="relative h-[150px] rounded-xl overflow-hidden border border-slate-300/60 dark:border-white/15">
      <div ref={containerRef} className="w-full h-full" />
      <span className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950/80 text-cyan-300 border border-white/15">
        LOCATION
      </span>
    </div>
  );
};
