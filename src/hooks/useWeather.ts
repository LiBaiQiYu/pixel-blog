import { useCallback, useEffect, useState } from 'react';
import weatherData from '../data/weather.json';
import type { WeatherData } from '../types/weather';

export type WeatherStatus = 'locating' | 'live' | 'fallback';

const CACHE_KEY = 'pixel_blog_weather_live_v1';
const CACHE_TTL = 10 * 60 * 1000;

export interface UseWeatherResult {
  weather: WeatherData;
  status: WeatherStatus;
  hint: string | null;
  requestLiveWeather: () => void;
}

export function useWeather(): UseWeatherResult {
  const fallbackWeather = weatherData as WeatherData;
  const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<WeatherStatus>('locating');
  const [hint, setHint] = useState<string | null>(null);

  const requestLiveWeather = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('fallback');
      setHint('当前浏览器不支持定位，显示默认城市');
      return;
    }

    setStatus('locating');
    setHint(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `/api/weather?lat=${latitude.toFixed(2)}&lon=${longitude.toFixed(2)}`
          );
          if (!res.ok) {
            setHint(
              res.status === 503
                ? '服务端未配置和风 API Host，显示默认城市'
                : `天气服务暂不可用 (HTTP ${res.status})，显示默认城市`
            );
            setStatus('fallback');
            return;
          }
          const data = (await res.json()) as WeatherData;
          setLiveWeather(data);
          setStatus('live');
          setHint(null);
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ data, ts: Date.now() })
            );
          } catch {
            // ignore storage quota issues
          }
        } catch {
          setHint('天气服务请求失败，显示默认城市');
          setStatus('fallback');
        }
      },
      (err) => {
        setStatus('fallback');
        setHint(
          err.code === err.PERMISSION_DENIED
            ? '定位未授权，显示默认城市'
            : '定位失败，显示默认城市'
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: CACHE_TTL }
    );
  }, []);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { data: WeatherData; ts: number };
        if (parsed?.data && Date.now() - parsed.ts < CACHE_TTL) {
          setLiveWeather(parsed.data);
          setStatus('live');
          return;
        }
      }
    } catch {
      // ignore malformed cache
    }
    requestLiveWeather();
  }, [requestLiveWeather]);

  return {
    weather: liveWeather ?? fallbackWeather,
    status,
    hint,
    requestLiveWeather,
  };
}
