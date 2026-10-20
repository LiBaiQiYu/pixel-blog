import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ThemeMode } from '../types/blog';
import type { GalleryPhoto } from '../types/gallery';

// Bundlers cannot resolve MapLibre's runtime worker URL automatically;
// point it to the emitted worker asset so the map works in dev and production.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

interface GalleryMapProps {
  photos: GalleryPhoto[];
  selectedId: string | null;
  theme: ThemeMode;
  onSelect: (photo: GalleryPhoto) => void;
}

export const GalleryMap: React.FC<GalleryMapProps> = ({
  photos,
  selectedId,
  theme,
  onSelect,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create / recreate the map when the theme changes (tiles differ per theme)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || photos.length === 0) return;

    const isDark = theme === 'dark';
    const customStyle = import.meta.env.VITE_MAP_STYLE_URL?.trim();

    const map = new maplibregl.Map({
      container,
      // OpenFreeMap is free, keyless and MapLibre-friendly.
      // You can override with any MapLibre-compatible style URL via VITE_MAP_STYLE_URL.
      style:
        customStyle ||
        (isDark
          ? 'https://tiles.openfreemap.org/styles/dark'
          : 'https://tiles.openfreemap.org/styles/positron'),
      center: [87.1, 48.63],
      zoom: 10,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    const bounds = new maplibregl.LngLatBounds();
    photos.forEach((photo) => bounds.extend([photo.lon, photo.lat]));
    map.on('load', () => {
      map.fitBounds(bounds, { padding: 60, maxZoom: 12.5, duration: 0 });
    });

    // Pixel markers
    const markers = markersRef.current;
    markers.forEach((marker) => marker.remove());
    markers.clear();

    photos.forEach((photo) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'gallery-pin';
      el.setAttribute('aria-label', photo.title);
      el.title = photo.title;
      const core = document.createElement('span');
      el.appendChild(core);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectRef.current(photo);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([photo.lon, photo.lat])
        .addTo(map);
      markers.set(photo.id, marker);
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [photos, theme]);

  // Highlight + fly to the selected photo
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      el.classList.toggle('is-active', id === selectedId);
    });

    if (selectedId) {
      const photo = photos.find((item) => item.id === selectedId);
      if (photo) {
        map.flyTo({
          center: [photo.lon, photo.lat],
          zoom: Math.max(map.getZoom(), 13),
          duration: 900,
          essential: true,
        });
      }
    }
  }, [selectedId, photos]);

  return <div ref={containerRef} className="w-full h-full" />;
};
