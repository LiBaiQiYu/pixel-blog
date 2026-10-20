import {
  getWeatherConfig,
  getMissingWeatherEnv,
  fetchWeatherForLocation,
} from '../server/weather-core.mjs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) =>
    res.setHeader(key, value)
  );
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // CORS preflight for cross-origin static hosts (e.g. GitHub Pages)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const config = getWeatherConfig();

  if (!config) {
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        error: 'Weather service is not configured on the server.',
        missing: getMissingWeatherEnv(),
      })
    );
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid latitude/longitude.' }));
    return;
  }

  try {
    const data = await fetchWeatherForLocation(config, lat, lon);
    res.statusCode = 200;
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=300'
    );
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error('[weather] upstream error:', err?.message);
    res.statusCode = 502;
    res.end(
      JSON.stringify({
        error: 'Failed to fetch weather data.',
        detail: err?.message || 'unknown error',
      })
    );
  }
}

