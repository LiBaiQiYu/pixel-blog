# Project Memory

## PixelBloom Modal / 像素绽开弹窗

**Name:** PixelBloom Modal（像素绽开弹窗）

**Canonical component:** `src/components/PixelBloom.tsx`

Use this component for popups that expand from a card into a larger panel. Do not recreate the timing logic in new components.

### Motion spec

- Expand: `300ms ease-out`
- Collapse: `250ms ease-in`
- Content reveal: `120ms` delay, `150ms` fade
- Backdrop: `300ms ease-out` in, `250ms ease-in` out
- Original card: `200ms` opacity fade, restored `200ms` after close starts
- Unmount after collapse: `280ms`
- Default target: `720px` wide, configurable height, `18px` radius

### API

```tsx
<PixelBloom
  open={open}
  originRect={originRect}
  onClose={closePopup}
  ariaLabel="弹窗标题"
  targetHeight={600}
  lockScroll
  panelClassName="border border-sky-400/30 bg-white/95 dark:bg-slate-950/95"
  onSourceVisibilityChange={setSourceHidden}
>
  ...
</PixelBloom>
```

- Get `originRect` from the trigger card before opening.
- Hide/show the trigger card through `onSourceVisibilityChange`.
- Panel content should provide its own scroll container when needed.
- Use `panelClassName` for light/dark theme styling.

## Next.js App Router

- `npm run dev` runs Next.js on port `5173`.
- All public pages live under `app/(site)`. `app/(site)/layout.tsx` is the persistent App Shell boundary.
- `src/AppShell.tsx` is the client shell shared by `/`, `/gallery`, `/about`, and `/posts/[id]`. Do not mount another App shell inside page components.
- The site layout fetches public posts once and passes them into `AppShell`; `/`, `/gallery`, and `/about` pages return `null` and the shell renders their content from `usePathname()`.
- `/posts/[id]` is server-rendered with `force-dynamic`; the page renders `ArticleRouteContent` as shell children so article HTML stays SSR without remounting the shell.
- `src/components/BlogShellContext.tsx` shares likes, stats, article registration, and the back-button ref with article content.
- Client transitions use `RouteTransition` plus `app/(site)/posts/[id]/loading.tsx`; keep loading UI inside the shell.
- `/admin` and `/__admin/*` are dev-only and outside `(site)`, so admin never renders the blog shell.
- Public post index is R2 `blog/posts.json`; private posts must never enter it.
- `next.config.mjs` maps legacy `VITE_*` values to `NEXT_PUBLIC_*`.
- Netlify uses `@netlify/plugin-nextjs`; publish directory is `.next`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
