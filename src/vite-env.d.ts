/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 外部天气接口完整地址，例如 https://your-api.vercel.app/api/weather */
  readonly VITE_WEATHER_API_ENDPOINT?: string;
  /** 可选：自定义 MapLibre 兼容的地图样式 URL（默认 OpenFreeMap） */
  readonly VITE_MAP_STYLE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
