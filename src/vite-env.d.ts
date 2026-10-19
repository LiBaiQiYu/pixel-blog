/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 外部天气接口完整地址，例如 https://your-api.vercel.app/api/weather */
  readonly VITE_WEATHER_API_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
