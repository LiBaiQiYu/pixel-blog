# Pixel Glass Blog — Project Memory

Last updated: 2026-10-30

This file is a portable handoff for other AI tools and developers. It describes the current architecture, deployment, behavior, known constraints, and recent work. Do not put secret values in this file.

## 1. Project Overview

- Project: **Pixel Glass Blog / 李白的白 / CarlosWhite**
- Site: https://cwa1e.top
- Repository: https://github.com/LiBaiQiYu/pixel-blog
- Branch: `main`
- Public image bucket: https://img.cwa1e.top
- Stats API: https://stats.cwa1e.top
- Language/UI: Chinese, pixel-art + liquid-glass visual style
- Runtime: Next.js App Router on Cloudflare Workers via OpenNext
- Node requirement: Node.js >= 22

## 2. Stack

- Next.js 16.4.3, React 19, TypeScript
- Tailwind CSS
- Swiper + Swiper Zoom (photo viewer)
- MapLibre / Mapbox GL (gallery map)
- Cloudflare Workers + OpenNext
- Cloudflare D1 (stats, likes, comments, reactions, friend links)
- Cloudflare R2 (gallery assets, blog posts, blog images)
- lucide-react icons
- sharp, exiftool, busboy, HEIC conversion (local admin/upload only)

## 3. Deployment

- Cloudflare site Worker: `pixel-blog`
- Custom domain: `cwa1e.top`
- Site deploy: `npm run cf:deploy`
- Stats Worker: `pixel-blog-stats`
- Stats custom domain: `stats.cwa1e.top`
- Stats deploy: `npm run stats:deploy`
- Site routing/assets: `wrangler.jsonc`
- Stats Worker config: `worker/wrangler.toml`
- Build environment must use Node 22; `.nvmrc` and `package.json` engines are set.
- Windows OpenNext build is supported; production config avoids `serverExternalPackages` and uses `images.unoptimized`.
- Cloudflare build-time `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` must be set under Build Variables, not only Runtime Variables.
- GitHub push triggers Cloudflare automatic deployment.

### D1

- Binding: `DB`
- Database: `pixel-blog-stats`
- Database ID: `80d9cd7e-e75f-49ca-9b1b-ee4dec17256a`
- Schema: `worker/schema.sql`
- Migrations: `worker/migrations/`
- Existing migration scripts:
  - `npm run stats:migrate:reactions`
  - `npm run stats:migrate:friends`

## 4. App Architecture

- Root layout: `app/layout.tsx`
- Public site shell layout: `app/(site)/layout.tsx`
- Shared client shell: `src/AppShell.tsx`
- `/` page returns `null`; AppShell renders home content from pathname.
- `/gallery` page returns `null`; AppShell renders GalleryView.
- `/friends` page returns `null`; AppShell renders standard or terminal friends UI.
- `/about` page returns `null`; AppShell renders AboutView.
- `/posts/[id]` is server-rendered with `force-dynamic`.
- `/gallery/[id]` is used for photo preview state.
- `app/(site)/layout.tsx` is `force-dynamic` and fetches public posts from R2 before passing `initialPosts` to AppShell.
- `src/components/BlogShellContext.tsx` shares post stats, likes, article registration, and back-button state.
- Client navigation transitions use `src/lib/route-transition.ts` and `src/components/RouteTransition.tsx`.
- Content page switches use an optimistic `pendingContentPage` in AppShell so the target page/fallback renders immediately before the route RSC response returns.
- `/admin` and `/__admin/*` are **dev-only**, outside `(site)`, and excluded from production builds.
- Never mount another AppShell inside page components.

## 5. Theme and Visual Behavior

- Theme preference key: `pixel_blog_theme_preference`
- Values: `auto`, `dark`, `light`
- Default: `auto`; auto follows `prefers-color-scheme`.
- Root layout applies the theme in an inline script before hydration.
- Admin page follows the site theme automatically and listens for:
  - site theme changes in other tabs
  - window focus / visibility changes
  - system theme changes while in auto mode
- View mode key: `pixel_blog_view_mode` (`standard` or `terminal`)
- Weather background key: `pixel_blog_weather_bg`
- Weather preview keys:
  - `pixel_blog_weather_preview`
  - `pixel_blog_weather_preview_intensity`
  - `pixel_blog_weather_preview_hour`
- Splash state key: `pixel_blog_splash_seen` (sessionStorage)
- PixelBloom modal is the canonical expand-from-card popup:
  - `src/components/PixelBloom.tsx`
  - Expand 300ms ease-out; collapse 250ms ease-in; content reveal 120ms delay / 150ms fade.
  - Do not reimplement its timing in new components.

## 6. Main Features

### Home and shell

- Standard and terminal modes share the same AppShell.
- Navbar has four pages: 首页 / 画廊 / 友链 / 关于我.
- Sliding blue navigation indicator uses a spring-like cubic-bezier.
- First-open splash: pixel shards fill and burst; only on home, once per browser session, skipped for reduced-motion.
- Dynamic weather background uses solar/lunar position, day/night/twilight colors, sun/moon, moon phase, wind, rain/snow/fog/storm effects.
- Weather preview supports solar-hour selection.
- Weather preview default must stay `null`/current time unless a saved/URL hour exists. Avoid `Number(null) === 0` bugs.

### Gallery / photo viewer

- Gallery metadata is in `src/data/gallery-*.json`; assets are in R2 and served from `img.cwa1e.top`.
- Gallery supports map, categories, photo preview, reactions, comments, view counts, live photos, HEIC handling, and retries.
- Original photos are rendered to Canvas for consistent orientation/HEIC behavior.
- Photo viewer zoom rules:
  - Zoom is disabled until the active photo's original image is fully ready.
  - If original loading fails, zoom can fall back to a fully loaded medium image.
  - Wheel, buttons, keyboard, pinch, and double-tap are all gated.
  - Wheel zoom is anchored at the mouse position using custom wrapper translation math.
  - `+/-` buttons are disabled while not ready.
- Photo comments modal style is the reference for modal entry/exit animation:
  - `src/components/PhotoCommentsModal.tsx`
  - CSS classes `photo-comments-backdrop-*`, `photo-comments-panel-*` in `src/index.css`.
- Histogram uses `src/components/PhotoHistogram.tsx` + `src/lib/histogram.ts`.

### Friends

- Public approved links live in D1 table `friend_links`.
- Stats Worker endpoints:
  - `GET /friends`
  - `POST /friends/apply`
  - `GET /friends/admin` (admin token)
  - `PATCH /friends/admin/:id` (admin token)
  - `DELETE /friends/admin/:id` (admin token)
- Admin token header: `x-admin-token`.
- Worker secret: `FRIENDS_ADMIN_TOKEN`.
- Local admin proxy env: `FRIENDS_ADMIN_TOKEN` in `.env.local` with the same value.
- Standard mode:
  - `src/components/FriendsView.tsx`
  - Hero art with cat; mobile uses full-width art + gradient, cat anchored right.
  - Application modal: `src/components/FriendApplyModal.tsx`
  - Tag chips are created with comma/Chinese comma/Enter, removable with animation.
  - Seed avatar uses `src/components/FriendAvatar.tsx` (independent GitHub-style identicon).
- Terminal mode:
  - `src/components/TerminalFriendsView.tsx`
  - Commands: `help`, `ls`, `open <n>`, `apply`, `filter <tag>`, `search <text>`, `reload`, `clear`, `cd ~`.
  - Has command history, arrow navigation, Tab completion, tag filters, internal apply form.
- No mock friend data should be reintroduced.
- `/friends` is indexable and included in the sitemap.

### About / game profile

- `src/components/AboutView.tsx`
- Hero avatars: `src/components/PixelHeroAvatar.tsx`
  - Invoker: white hair, glowing eyes, red high collar, ice/fire/lightning orbs.
  - Master Yi: gold/white horned helmet, green goggles, purple sash.
  - Ezreal: blonde hair, goggles, teal fur collar, blue gauntlet.
- Pixel avatars use 24×24 SVG grids.

### Admin

- Local-only admin: `npm run dev`, then `http://<LAN-IP>:5173/admin`
- Route: `app/admin/page.dev.tsx`
- Client: `src/admin/AdminApp.tsx`
- API: `app/api/admin/[...path]/route.dev.ts`
- Tabs: storage / upload / library / posts / friends
- Production `/admin` is intentionally unavailable (404). There is no online admin/auth implementation yet.
- Admin theme follows site theme; no separate admin theme preference.
- LAN ACCESS block in storage settings lists reachable private IPv4 admin URLs:
  - Only private RFC1918 addresses.
  - Virtual/link-local adapters are filtered.
  - URL format: `http://<IP>:5173/admin`, not `?admin=1`.
- `allowedDevOrigins` in `next.config.mjs` auto-collects LAN IPv4s and `*.local`; use `DEV_ALLOWED_ORIGINS` for tunnel hostnames.
- `ADMIN_DEV_TOKEN` protects the local admin when set.
- `FRIENDS_ADMIN_TOKEN` protects friend-admin operations through the stats Worker.

## 7. Data and APIs

### Gallery data

- `src/data/gallery-entries.json` — photo metadata, titles, descriptions.
- `src/data/gallery-meta.json` — EXIF/thumbnail/color metadata.
- `src/data/gallery-manifest.json` — R2 asset keys/sizes/hashes.
- `src/data/gallery-placeholders.json` — preview placeholders.
- `src/data/gallery-storage.json` — storage provider/public base.
- Assets are uploaded to R2 through the local admin.

### Blog data

- Public post index: R2 `blog/posts.json`
- Article source: R2 `blog/<id>/post.md`
- Blog images: R2 and public base `https://img.cwa1e.top`
- Private posts must never be written into `blog/posts.json`.

### Stats Worker

- D1 tables include post stats/likes/views, site visits, photo stats/views, photo reactions/comments, and friend links.
- Public stats endpoints are CORS-enabled.
- Admin friend endpoints require `x-admin-token`.
- Keep the stats Worker custom domain route in `worker/wrangler.toml`; removing it causes Wrangler to drop the Cloudflare custom domain on deploy.

## 8. Commands

```powershell
npm run dev                  # Next.js dev server on port 5173
npm run build                # production build + TypeScript
npm start                    # production Next server on port 5173
npm run cf:build             # OpenNext Cloudflare build
npm run cf:preview           # OpenNext preview
npm run cf:deploy            # build + deploy site to Cloudflare
npm run stats:deploy         # deploy stats Worker
npm run stats:migrate:friends
npm run cf-typegen
npm run seo:indexnow
```

## 9. Environment Variables

Names only; never commit values.

- QWeather: `QWEATHER_*`
- Mapbox: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (also legacy fallback mapping from `VITE_MAPBOX_ACCESS_TOKEN`)
- Stats API: `NEXT_PUBLIC_STATS_API_URL=https://stats.cwa1e.top`
- R2: `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PREFIX`
- R2 blog: `R2_BLOG_PREFIX`
- Public image base: `NEXT_PUBLIC_BLOG_IMAGE_BASE_URL=https://img.cwa1e.top`
- Local admin auth: `ADMIN_DEV_TOKEN`
- Friend review: `FRIENDS_ADMIN_TOKEN`
- Optional dev origins: `DEV_ALLOWED_ORIGINS`

Do not commit `.env.local`, `.gallery-admin.env`, Worker secrets, or R2 credentials.

## 10. Conventions and Gotchas

- Read `AGENTS.md` for project-specific agent rules.
- Next.js 16 docs live in `node_modules/next/dist/docs/`; consult them before using version-sensitive APIs.
- The `nextjs-agent-rules` block in `AGENTS.md` is re-added by Next dev; do not fight it.
- `src/data/weather.json` is generated by `npm run prebuild`; it often shows modified after a build.
- `next-env.d.ts` may be regenerated by Next dev/build.
- Keep `AppShell` as the single shell for public content pages.
- Use `PixelBloom` for card-to-panel expansion; use photo-comment animation classes for comment-style modals.
- Do not expose the local admin/admin API in production without adding real authentication and a Cloudflare-compatible data path.
- The current admin relies on Node-only image processing and local JSON writes; a fully online admin needs a separate Node service or a substantial refactor.
- `netlify.toml`, `@netlify/plugin-nextjs`, and `vite.config.ts` are old deployment leftovers. Cloudflare is the active deployment target.
- The old `?admin=1` entry is obsolete; use `/admin`.
- When accessing dev over LAN, use the current LAN IP and `allowedDevOrigins`; HMR WebSocket should work when the host is allowed.
- Photo viewer zoom must stay disabled until `PhotoSlideContent` reports original ready (or medium fallback after original failure).
- `PhotoSwiperDetail` uses custom wheel zoom math; do not replace it with plain `swiper.zoom.in(number)` or the image will shift right.
- Friend application limits: 6 tags max, 16 characters per tag, seed 1–2147483647.
- Public friend applications are pending until approved; only approved rows appear publicly.
- Git push may need a DNS workaround if GitHub resolution is poisoned:
  `git -c http.curloptResolve=github.com:443:20.205.243.166 push origin main`

## 11. Current Git State at Handoff

- Latest pushed commit: `489c5fd fix: 优化页面切换与友链移动端配图`
- The following are currently uncommitted but deployed to Cloudflare:
  - `src/components/PhotoSlideContent.tsx` — zoom readiness handshake
  - `src/components/PhotoSwiperDetail.tsx` — cursor-centered wheel zoom + zoom gating
  - `src/data/weather.json` — generated weather data
  - `next-env.d.ts` — Next-generated typing file may also show modified
- Cloudflare currently serves the deployed versions, not necessarily the Git HEAD versions.

## 12. Known Limitations / Possible Next Work

- No production/admin login system; admin is still local-dev only.
- No automated test suite; verify with `npm run build`, local production `next start`, and browser checks.
- Full online gallery upload is blocked by Node-only image processing on Cloudflare Workers.
- Netlify/Vite leftovers could be removed after confirming no fallback deployment is needed.
- D1 remote migrations require Wrangler authentication and should be run before Worker deploys that depend on new tables.
- Cloudflare map token must be a build variable for automatic builds.
