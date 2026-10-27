import mapboxgl from 'mapbox-gl';
import type { ThemeMode } from '../types/blog';
import { APP_ENV } from './app-env';

export const MAPBOX_TOKEN = APP_ENV.mapboxToken;

const MAPBOX_STYLE = 'mapbox://styles/mapbox/standard';
const TERRAIN_SOURCE_ID = 'gallery-terrain-dem';
const HILLSHADE_SOURCE_ID = 'gallery-terrain-hillshade-dem';
const HILLSHADE_LAYER_ID = 'gallery-terrain-hillshade';

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

export function getMapboxMapConfig(theme: ThemeMode) {
  return {
    style: MAPBOX_STYLE,
    config: {
      basemap: {
        lightPreset: theme === 'dark' ? 'night' : 'day',
        colorThemes: 'faded',
      },
    },
    pitch: 18,
    maxPitch: 70,
    language: 'zh-Hans',
  };
}

export function addMapboxTerrain(map: mapboxgl.Map, theme: ThemeMode) {
  if (!map.getSource(TERRAIN_SOURCE_ID)) {
    map.addSource(TERRAIN_SOURCE_ID, {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }

  if (!map.getSource(HILLSHADE_SOURCE_ID)) {
    map.addSource(HILLSHADE_SOURCE_ID, {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }

  if (!map.getLayer(HILLSHADE_LAYER_ID)) {
    map.addLayer({
      id: HILLSHADE_LAYER_ID,
      type: 'hillshade',
      source: HILLSHADE_SOURCE_ID,
      slot: 'middle',
      paint: {
        'hillshade-exaggeration': theme === 'dark' ? 0.34 : 0.24,
        'hillshade-shadow-color': theme === 'dark' ? '#020617' : '#9ca9b8',
        'hillshade-highlight-color': theme === 'dark' ? '#475569' : '#ffffff',
        'hillshade-accent-color': theme === 'dark' ? '#0ea5e9' : '#dbeafe',
      },
    });
  }

  map.setTerrain({
    source: TERRAIN_SOURCE_ID,
    exaggeration: 1.25,
  });
}
