import {
  getWeatherConfig,
  fetchWeatherForLocation,
} from '../server/weather-core.mjs';

export default async function handler(req, res) {
  const config = getWeatherConfig();

  if (!config) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({ error: 'Weather service is not configured on the server.' })
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
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Invalid latitude/longitude.' }));
    return;
  }

  try {
    const data = await fetchWeatherForLocation(config, lat, lon);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=300'
    );
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Failed to fetch weather data.' }));
  }
}
