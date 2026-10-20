import {
  getWeatherConfig,
  getMissingWeatherEnv,
  fetchWeatherForLocation,
} from '../../server/weather-core.mjs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const config = getWeatherConfig();
  if (!config) {
    return json(
      {
        error: 'Weather service is not configured.',
        missing: getMissingWeatherEnv(),
      },
      503
    );
  }

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return json({ error: 'Invalid latitude/longitude.' }, 400);
  }

  try {
    const data = await fetchWeatherForLocation(config, lat, lon);
    return json(data, 200, { 'Cache-Control': 'public, max-age=300' });
  } catch {
    return json({ error: 'Failed to fetch weather data.' }, 502);
  }
}

// Netlify Functions v2: expose a clean same-origin path used by the frontend
export const config = {
  path: '/api/weather',
};
