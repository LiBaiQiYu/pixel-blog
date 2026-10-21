import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { galleryAdminPlugin } from './server/gallery/admin-plugin';

export default defineConfig({
  server: {
    // Listen on all network interfaces so phones/tablets on the same LAN can open the dev site
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  plugins: [
    react(),
    galleryAdminPlugin(),
    {
      name: 'qweather-dev-api',
      configureServer(server) {
        // Local dev-only proxy so the JWT private key never reaches the browser.
        // In production this route is handled by api/weather.js on Vercel.
        server.middlewares.use('/api/weather', async (req, res) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');

          try {
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
              res.end(JSON.stringify({ error: 'Invalid coordinates.' }));
              return;
            }

            const coreUrl = pathToFileURL(
              resolve(process.cwd(), 'server/weather-core.mjs')
            ).href;
            const core = await import(/* @vite-ignore */ coreUrl);
            const config = core.getWeatherConfig();

            if (!config) {
              res.statusCode = 503;
              res.end(
                JSON.stringify({
                  error: 'Weather service is not configured locally.',
                })
              );
              return;
            }

            const data = await core.fetchWeatherForLocation(config, lat, lon);
            res.statusCode = 200;
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(data));
          } catch (err) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Failed to fetch weather.' }));
          }
        });
      },
    },
  ],
});
