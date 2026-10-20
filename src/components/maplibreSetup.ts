import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Bundlers cannot resolve MapLibre's runtime worker URL automatically;
// point it to the emitted worker asset so the map works in dev and production.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

export { maplibregl };

export const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';
export const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
