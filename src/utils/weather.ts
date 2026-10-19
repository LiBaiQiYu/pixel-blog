import type { WeatherKind } from '../types/weather';

export interface WeatherVisual {
  kind: WeatherKind;
  /** 0.45 (极弱) ~ 2.5 (极强)，用于缩放粒子密度与动效强度 */
  intensity: number;
}

/**
 * 按和风天气官方天气现象代码（54 种）映射到像素动效种类与强度。
 * 强度分级参考：小雨/小雪/薄雾 = 弱，中雨/中雪/雾 = 中，
 * 大雨~暴雨/大雪~暴雪/浓雾 = 强，极端降雨/特大暴雨/特强浓雾/强沙尘暴 = 极强。
 */
export function resolveWeatherVisual(code: number): WeatherVisual {
  switch (code) {
    // 晴与云
    case 100:
      return { kind: 'sun', intensity: 1 };
    case 101:
    case 102:
    case 103:
      return { kind: 'partly', intensity: 1 };
    case 104:
      return { kind: 'cloud', intensity: 1.1 };

    // 雨（20 种）
    case 300:
      return { kind: 'rain', intensity: 1.1 }; // 阵雨
    case 301:
      return { kind: 'rain', intensity: 1.9 }; // 强阵雨
    case 302:
      return { kind: 'thunder', intensity: 1.2 }; // 雷阵雨
    case 303:
      return { kind: 'thunder', intensity: 2.0 }; // 强雷阵雨
    case 304:
      return { kind: 'hail', intensity: 2.0 }; // 雷阵雨伴有冰雹
    case 305:
      return { kind: 'rain', intensity: 0.6 }; // 小雨
    case 306:
      return { kind: 'rain', intensity: 0.95 }; // 中雨
    case 307:
      return { kind: 'rain', intensity: 1.35 }; // 大雨
    case 308:
      return { kind: 'rain', intensity: 2.5 }; // 极端降雨
    case 309:
      return { kind: 'rain', intensity: 0.45 }; // 毛毛雨/细雨
    case 310:
      return { kind: 'rain', intensity: 1.6 }; // 暴雨
    case 311:
      return { kind: 'rain', intensity: 1.95 }; // 大暴雨
    case 312:
      return { kind: 'rain', intensity: 2.4 }; // 特大暴雨
    case 313:
      return { kind: 'sleet', intensity: 1.15 }; // 冻雨
    case 314:
      return { kind: 'rain', intensity: 0.75 }; // 小到中雨
    case 315:
      return { kind: 'rain', intensity: 1.15 }; // 中到大雨
    case 316:
      return { kind: 'rain', intensity: 1.6 }; // 大到暴雨
    case 317:
      return { kind: 'rain', intensity: 1.95 }; // 暴雨到大暴雨
    case 318:
      return { kind: 'rain', intensity: 2.3 }; // 大暴雨到特大暴雨
    case 399:
      return { kind: 'rain', intensity: 1 }; // 雨

    // 雪（12 种）
    case 400:
      return { kind: 'snow', intensity: 0.6 }; // 小雪
    case 401:
      return { kind: 'snow', intensity: 1 }; // 中雪
    case 402:
      return { kind: 'snow', intensity: 1.4 }; // 大雪
    case 403:
      return { kind: 'snow', intensity: 2.2 }; // 暴雪
    case 404:
    case 405:
      return { kind: 'sleet', intensity: 1 }; // 雨夹雪 / 雨雪天气
    case 406:
      return { kind: 'sleet', intensity: 1.3 }; // 阵雨夹雪
    case 407:
      return { kind: 'snow', intensity: 1.1 }; // 阵雪
    case 408:
      return { kind: 'snow', intensity: 0.8 }; // 小到中雪
    case 409:
      return { kind: 'snow', intensity: 1.2 }; // 中到大雪
    case 410:
      return { kind: 'snow', intensity: 1.8 }; // 大到暴雪
    case 499:
      return { kind: 'snow', intensity: 1 }; // 雪

    // 雾 / 霾 / 沙尘（14 种）
    case 500:
      return { kind: 'fog', intensity: 0.5 }; // 薄雾
    case 501:
      return { kind: 'fog', intensity: 0.9 }; // 雾
    case 502:
      return { kind: 'haze', intensity: 0.9 }; // 霾
    case 503:
      return { kind: 'sand', intensity: 1.0 }; // 扬沙
    case 504:
      return { kind: 'sand', intensity: 0.8 }; // 浮尘
    case 507:
      return { kind: 'sand', intensity: 1.8 }; // 沙尘暴
    case 508:
      return { kind: 'sand', intensity: 2.4 }; // 强沙尘暴
    case 509:
      return { kind: 'fog', intensity: 1.35 }; // 浓雾
    case 510:
      return { kind: 'fog', intensity: 1.7 }; // 强浓雾
    case 511:
      return { kind: 'haze', intensity: 1.2 }; // 中度霾
    case 512:
      return { kind: 'haze', intensity: 1.55 }; // 重度霾
    case 513:
      return { kind: 'haze', intensity: 1.9 }; // 严重霾
    case 514:
      return { kind: 'fog', intensity: 2.1 }; // 大雾
    case 515:
      return { kind: 'fog', intensity: 2.5 }; // 特强浓雾

    // 体感特殊值（900 热 / 901 冷 / 999 未知）不参与天气背景映射，
    // 统一走兜底「少云 · 中」，避免与真实天气现象混淆
    default:
      return { kind: 'partly', intensity: 1 };
  }
}

export function getWeatherKind(code: number): WeatherKind {
  return resolveWeatherVisual(code).kind;
}

export const WEATHER_KIND_OPTIONS: { kind: WeatherKind; label: string }[] = [
  { kind: 'sun', label: '晴' },
  { kind: 'partly', label: '少云' },
  { kind: 'cloud', label: '阴' },
  { kind: 'rain', label: '雨' },
  { kind: 'thunder', label: '雷雨' },
  { kind: 'hail', label: '冰雹' },
  { kind: 'snow', label: '雪' },
  { kind: 'sleet', label: '雨夹雪' },
  { kind: 'fog', label: '雾' },
  { kind: 'haze', label: '霾' },
  { kind: 'sand', label: '沙尘' },
  { kind: 'wind', label: '风' },
];

export function isWeatherKind(value: string | null): value is WeatherKind {
  if (!value) return false;
  return WEATHER_KIND_OPTIONS.some((option) => option.kind === value);
}

export const WEATHER_INTENSITY_LEVELS: { value: number; label: string }[] = [
  { value: 0.5, label: '弱' },
  { value: 1, label: '中' },
  { value: 1.8, label: '强' },
  { value: 2.5, label: '极强' },
];

export function getIntensityLabel(value: number): string {
  let closest = WEATHER_INTENSITY_LEVELS[0];
  for (const level of WEATHER_INTENSITY_LEVELS) {
    if (Math.abs(level.value - value) < Math.abs(closest.value - value)) {
      closest = level;
    }
  }
  return closest.label;
}
