/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 外部天气接口完整地址，例如 https://your-api.vercel.app/api/weather */
  readonly VITE_WEATHER_API_ENDPOINT?: string;
  /** Mapbox 公共访问令牌（地图预览使用） */
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
  /** 文章阅读/喜欢统计 API 地址，默认 https://stats.cwa1e.top */
  readonly VITE_STATS_API_URL?: string;
  /** R2 博文图片/资源基础地址，默认 https://img.cwa1e.top */
  readonly VITE_BLOG_IMAGE_BASE_URL?: string;
  /** 可选：覆盖 R2 的 posts.json 索引地址 */
  readonly VITE_BLOG_INDEX_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
