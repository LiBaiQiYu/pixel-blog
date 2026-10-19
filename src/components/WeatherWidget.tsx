import React, { useMemo, useState } from 'react';
import {
  CloudSun,
  Crosshair,
  Droplets,
  MapPin,
  SlidersHorizontal,
  Wind,
} from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';
import {
  getWeatherKind,
  getIntensityLabel,
  WEATHER_INTENSITY_LEVELS,
  WEATHER_KIND_OPTIONS,
} from '../utils/weather';
import type { WeatherData, WeatherKind } from '../types/weather';
import type { WeatherStatus } from '../hooks/useWeather';

interface PixelWeatherIconProps {
  kind: WeatherKind;
  className?: string;
}

export const PixelWeatherIcon: React.FC<PixelWeatherIconProps> = ({
  kind,
  className = 'w-10 h-10',
}) => {
  const common = {
    viewBox: '0 0 16 16',
    shapeRendering: 'crispEdges' as const,
    className: `pixelated select-none ${className}`,
    fill: 'none',
  };

  if (kind === 'sun') {
    return (
      <svg {...common}>
        <rect x="6" y="6" width="4" height="4" fill="#FBBF24" />
        <rect x="5" y="5" width="6" height="6" fill="#F59E0B" />
        <rect x="6" y="6" width="4" height="4" fill="#FDE047" />
        <rect x="7" y="2" width="2" height="2" fill="#FBBF24" />
        <rect x="7" y="12" width="2" height="2" fill="#FBBF24" />
        <rect x="2" y="7" width="2" height="2" fill="#FBBF24" />
        <rect x="12" y="7" width="2" height="2" fill="#FBBF24" />
        <rect x="4" y="4" width="1" height="1" fill="#FCD34D" />
        <rect x="11" y="4" width="1" height="1" fill="#FCD34D" />
        <rect x="4" y="11" width="1" height="1" fill="#FCD34D" />
        <rect x="11" y="11" width="1" height="1" fill="#FCD34D" />
      </svg>
    );
  }

  if (kind === 'cloud') {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="8" height="2" fill="#94A3B8" />
        <rect x="3" y="8" width="10" height="3" fill="#CBD5E1" />
        <rect x="5" y="5" width="5" height="2" fill="#E2E8F0" />
        <rect x="3" y="8" width="10" height="1" fill="#E2E8F0" />
        <rect x="4" y="10" width="8" height="1" fill="#64748B" />
      </svg>
    );
  }

  if (kind === 'partly') {
    return (
      <svg {...common}>
        <rect x="9" y="3" width="3" height="3" fill="#FBBF24" />
        <rect x="10" y="2" width="1" height="1" fill="#FCD34D" />
        <rect x="13" y="6" width="1" height="1" fill="#FCD34D" />
        <rect x="8" y="7" width="1" height="1" fill="#FCD34D" />
        <rect x="4" y="8" width="7" height="2" fill="#94A3B8" />
        <rect x="3" y="9" width="9" height="3" fill="#CBD5E1" />
        <rect x="5" y="7" width="4" height="2" fill="#E2E8F0" />
        <rect x="4" y="12" width="7" height="1" fill="#64748B" />
      </svg>
    );
  }

  if (kind === 'rain') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="8" height="2" fill="#94A3B8" />
        <rect x="3" y="6" width="10" height="3" fill="#CBD5E1" />
        <rect x="5" y="3" width="5" height="2" fill="#E2E8F0" />
        <rect x="4" y="9" width="2" height="3" fill="#38BDF8" />
        <rect x="8" y="10" width="2" height="3" fill="#38BDF8" />
        <rect x="12" y="8" width="1" height="2" fill="#7DD3FC" />
      </svg>
    );
  }

  if (kind === 'snow') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="8" height="2" fill="#94A3B8" />
        <rect x="3" y="6" width="10" height="3" fill="#CBD5E1" />
        <rect x="5" y="3" width="5" height="2" fill="#E2E8F0" />
        <rect x="3" y="10" width="2" height="2" fill="#F8FAFC" />
        <rect x="8" y="11" width="2" height="2" fill="#F8FAFC" />
        <rect x="12" y="9" width="1" height="1" fill="#E0F2FE" />
        <rect x="6" y="12" width="1" height="1" fill="#E0F2FE" />
      </svg>
    );
  }

  if (kind === 'thunder') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="8" height="2" fill="#64748B" />
        <rect x="3" y="6" width="10" height="3" fill="#94A3B8" />
        <rect x="5" y="3" width="5" height="2" fill="#CBD5E1" />
        <rect x="8" y="9" width="2" height="2" fill="#FBBF24" />
        <rect x="7" y="11" width="2" height="2" fill="#FBBF24" />
        <rect x="6" y="13" width="2" height="1" fill="#FDE047" />
        <rect x="5" y="9" width="1" height="2" fill="#38BDF8" />
      </svg>
    );
  }

  if (kind === 'sleet') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="8" height="2" fill="#94A3B8" />
        <rect x="3" y="6" width="10" height="3" fill="#CBD5E1" />
        <rect x="5" y="3" width="5" height="2" fill="#E2E8F0" />
        <rect x="4" y="10" width="2" height="3" fill="#38BDF8" />
        <rect x="11" y="9" width="1" height="2" fill="#7DD3FC" />
        <rect x="8" y="11" width="2" height="2" fill="#F8FAFC" />
        <rect x="6" y="13" width="1" height="1" fill="#E0F2FE" />
      </svg>
    );
  }

  if (kind === 'hail') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="8" height="2" fill="#64748B" />
        <rect x="3" y="6" width="10" height="3" fill="#94A3B8" />
        <rect x="5" y="3" width="5" height="2" fill="#CBD5E1" />
        <rect x="4" y="10" width="2" height="2" fill="#E0F2FE" />
        <rect x="8" y="11" width="2" height="2" fill="#DBEAFE" />
        <rect x="12" y="9" width="1" height="1" fill="#F8FAFC" />
        <rect x="10" y="14" width="1" height="1" fill="#BAE6FD" />
      </svg>
    );
  }

  if (kind === 'haze') {
    return (
      <svg {...common}>
        <rect x="2" y="4" width="10" height="2" fill="#A8A29E" />
        <rect x="4" y="7" width="10" height="2" fill="#D6D3D1" />
        <rect x="2" y="10" width="9" height="2" fill="#A8A29E" />
        <rect x="6" y="13" width="8" height="1" fill="#78716C" />
      </svg>
    );
  }

  if (kind === 'sand') {
    return (
      <svg {...common}>
        <rect x="2" y="4" width="11" height="2" fill="#D97706" />
        <rect x="4" y="7" width="10" height="2" fill="#FBBF24" />
        <rect x="2" y="10" width="9" height="2" fill="#B45309" />
        <rect x="3" y="13" width="3" height="1" fill="#92400E" />
        <rect x="9" y="13" width="4" height="1" fill="#92400E" />
      </svg>
    );
  }

  if (kind === 'fog') {
    return (
      <svg {...common}>
        <rect x="2" y="4" width="10" height="2" fill="#94A3B8" />
        <rect x="4" y="7" width="10" height="2" fill="#CBD5E1" />
        <rect x="2" y="10" width="9" height="2" fill="#94A3B8" />
        <rect x="6" y="13" width="8" height="1" fill="#64748B" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="2" y="5" width="6" height="2" fill="#7DD3FC" />
      <rect x="4" y="8" width="8" height="2" fill="#38BDF8" />
      <rect x="2" y="11" width="5" height="2" fill="#7DD3FC" />
      <rect x="11" y="5" width="2" height="1" fill="#E0F2FE" />
      <rect x="13" y="8" width="2" height="1" fill="#E0F2FE" />
    </svg>
  );
};

interface WeatherWidgetProps {
  weather: WeatherData;
  status: WeatherStatus;
  hint: string | null;
  onRequestLocation: () => void;
  previewKind: WeatherKind | null;
  onSetPreviewKind: (kind: WeatherKind | null) => void;
  previewIntensity: number | null;
  onSetPreviewIntensity: (intensity: number | null) => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  status,
  hint,
  onRequestLocation,
  previewKind,
  onSetPreviewKind,
  previewIntensity,
  onSetPreviewIntensity,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const kind = useMemo(
    () => getWeatherKind(weather.current.code),
    [weather.current.code]
  );

  return (
    <LiquidPixelCard accent="cyan" className="p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Current Weather */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="shrink-0 p-2 rounded-xl bg-sky-500/10 dark:bg-cyan-400/10 border border-sky-400/25 dark:border-cyan-400/20">
            <PixelWeatherIcon kind={kind} className="w-10 h-10" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {weather.current.temp}
                <span className="text-base align-top">°C</span>
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {weather.current.text}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <MapPin className="w-3 h-3 text-sky-500" />
                {weather.city}
              </span>
              {status === 'locating' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-600 dark:text-cyan-300">
                  <span className="w-1.5 h-1.5 bg-sky-400 animate-pulse inline-block" />
                  正在获取位置
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CloudSun className="w-3 h-3 text-amber-500" />
                体感 {weather.current.feelsLike}°
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-sky-500" />
                湿度 {weather.current.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-emerald-500" />
                {weather.current.windDir} {weather.current.windScale} 级
              </span>
            </div>
          </div>
        </div>

        {/* 3-Day Forecast */}
        <div className="flex items-stretch gap-2 sm:gap-3 overflow-x-auto">
          {weather.daily.map((day) => (
            <div
              key={day.date}
              className="flex-1 sm:flex-none min-w-[4.5rem] px-2.5 py-1.5 rounded-xl bg-white/45 dark:bg-slate-900/55 border border-slate-200/60 dark:border-white/10 text-center"
            >
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {day.weekday}
              </div>
              <PixelWeatherIcon
                kind={getWeatherKind(day.code)}
                className="w-6 h-6 mx-auto my-0.5"
              />
              <div className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200">
                {day.tempMax}°
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  {' '}
                  / {day.tempMin}°
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attribution & Location Actions */}
      <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
        <a
          href={weather.attribution}
          target="_blank"
          rel="noreferrer"
          className="hover:text-sky-500 dark:hover:text-cyan-300 transition-colors"
        >
          天气数据由 {weather.source} 提供
        </a>
        <div className="flex items-center gap-3">
          {hint && (
            <span className="text-amber-500 dark:text-amber-400">{hint}</span>
          )}
          {previewKind && (
            <span className="text-pink-500 dark:text-pink-400">
              背景预览中（
              {WEATHER_KIND_OPTIONS.find((o) => o.kind === previewKind)?.label}
              {previewIntensity !== null
                ? ` · ${getIntensityLabel(previewIntensity)}`
                : ''}
              ）
            </span>
          )}
          <span>更新于 {weather.updatedAt}</span>
          <button
            type="button"
            onClick={onRequestLocation}
            className="inline-flex items-center gap-1 hover:text-sky-500 dark:hover:text-cyan-300 transition-colors"
            title="使用浏览器定位获取本地天气"
          >
            <Crosshair className="w-3 h-3" />
            {status === 'live' ? '重新定位' : '使用我的位置'}
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className={`inline-flex items-center gap-1 transition-colors ${
              showPreview || previewKind
                ? 'text-sky-500 dark:text-cyan-300'
                : 'hover:text-sky-500 dark:hover:text-cyan-300'
            }`}
            title="临时预览所有天气背景效果"
          >
            <SlidersHorizontal className="w-3 h-3" />
            效果预览
          </button>
        </div>
      </div>

      {/* Temporary Weather Background Preview Switcher */}
      {showPreview && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/50 dark:border-white/10 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mr-1">
            背景效果:
          </span>
          <button
            type="button"
            onClick={() => onSetPreviewKind(null)}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all border ${
              !previewKind
                ? 'bg-sky-500 text-white border-sky-500 font-semibold'
                : 'bg-white/40 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-300/60 dark:border-white/10 hover:border-sky-400/50'
            }`}
          >
            自动（实况）
          </button>
          {WEATHER_KIND_OPTIONS.map((option) => (
            <button
              key={option.kind}
              type="button"
              onClick={() => onSetPreviewKind(option.kind)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all border ${
                previewKind === option.kind
                  ? 'bg-sky-500 text-white border-sky-500 font-semibold'
                  : 'bg-white/40 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-300/60 dark:border-white/10 hover:border-sky-400/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Preview Intensity Levels */}
      {showPreview && previewKind && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mr-1">
            强度:
          </span>
          {WEATHER_INTENSITY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => onSetPreviewIntensity(level.value)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all border ${
                previewIntensity === level.value
                  ? 'bg-pink-500 text-white border-pink-500 font-semibold'
                  : 'bg-white/40 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-300/60 dark:border-white/10 hover:border-pink-400/50'
              }`}
              title={`强度 ${level.value}`}
            >
              {level.label}
            </button>
          ))}
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-1">
            影响雨量、水花、雪花密度与积雪层次等
          </span>
        </div>
      )}
    </LiquidPixelCard>
  );
};
