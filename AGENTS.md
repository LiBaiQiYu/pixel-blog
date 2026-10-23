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
