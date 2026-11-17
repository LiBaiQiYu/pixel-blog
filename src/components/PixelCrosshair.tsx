'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Dynamic pixel reticle (default mouse pointer).
 *
 * The closed pixel ring that used to be a static SVG cursor is now a live DOM
 * reticle so it can react to pointer movement:
 *
 * - at rest the eight ring segments sit flush and the ring is closed
 * - pointer speed pushes the segments radially outward (faster = wider spread)
 * - a lagging ghost ring and a chain of trailing pixel shards add inertial
 *   drag feedback; they fade out once the pointer stops
 *
 * Interactive states keep their native pixel cursors (pointer / text / wait /
 * not-allowed / zoom / grab). As soon as the element under the pointer
 * declares its own `cursor`, the ring steps aside and the native cursor takes
 * over, while the inertial shard trail keeps following the pointer, so no
 * state or affordance is lost.
 */

const SQRT_HALF = Math.SQRT1_2;

/** Ring geometry is authored on the same 24x24 grid as the old SVG cursor. */
const GRID_CENTER = 12;

const RING_FILL = 'rgba(15, 23, 42, 0.78)';
const RING_EDGE = 'rgba(248, 250, 252, 0.97)';
const RING_ACCENT = '#38BDF8';

const TRAIL_COLORS = ['#38BDF8', '#E879F9', '#FBBF24', '#34D399', '#F8FAFC'];
const TRAIL_COUNT = TRAIL_COLORS.length;
/** Follow rates for the inertial chain: node 0 chases the pointer, each next one chases the previous. */
const CHAIN_RATES = [0.55, 0.45, 0.36, 0.28, 0.22, 0.17];
/** The ghost ring trails on its own, slower and smoother than the shard chain. */
const GHOST_RATE = 0.3;

/** Tuning: spread in grid units, pointer speed in px per 60fps frame. */
const MAX_SPREAD = 6.5;
const SPEED_FLOOR = 1.2;
const SPEED_CEIL = 24;
/** How often the cursor under the pointer is re-read while it stays in place. */
const MODE_POLL_MS = 100;

interface RingSegment {
  x: number;
  y: number;
  w: number;
  h: number;
  dx: number;
  dy: number;
}

// Dark frame segments plus their outward unit direction.
const RING_SEGMENTS: RingSegment[] = [
  { x: 8, y: 4, w: 8, h: 4, dx: 0, dy: -1 },
  { x: 8, y: 16, w: 8, h: 4, dx: 0, dy: 1 },
  { x: 4, y: 8, w: 4, h: 8, dx: -1, dy: 0 },
  { x: 16, y: 8, w: 4, h: 8, dx: 1, dy: 0 },
  { x: 6, y: 6, w: 4, h: 4, dx: -SQRT_HALF, dy: -SQRT_HALF },
  { x: 14, y: 6, w: 4, h: 4, dx: SQRT_HALF, dy: -SQRT_HALF },
  { x: 6, y: 14, w: 4, h: 4, dx: -SQRT_HALF, dy: SQRT_HALF },
  { x: 14, y: 14, w: 4, h: 4, dx: SQRT_HALF, dy: SQRT_HALF },
];

/** The reticle needs a fine pointer and should respect reduced-motion. */
export function shouldUseDynamicReticle(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function reticleScaleForViewport(width: number): number {
  if (width >= 3200) return 40 / 24;
  if (width >= 2200) return 32 / 24;
  return 1;
}

export const PixelCrosshair: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [unit, setUnit] = useState(1);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const reticleRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const trailRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Enable only for fine pointers without reduced-motion preference.
  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)');
    const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnabled(shouldUseDynamicReticle());

    sync();
    finePointer.addEventListener('change', sync);
    calmMotion.addEventListener('change', sync);
    return () => {
      finePointer.removeEventListener('change', sync);
      calmMotion.removeEventListener('change', sync);
    };
  }, []);

  // Keep the reticle size aligned with the old resolution-adapted cursors.
  useEffect(() => {
    const sync = () => setUnit(reticleScaleForViewport(window.innerWidth));
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  // The reticle becomes the default pointer, so the native default cursor is
  // hidden while it is active. Interactive elements keep their own pixel
  // cursors (declared with !important) and override this.
  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      delete root.dataset.pixelReticle;
      return;
    }
    root.dataset.pixelReticle = 'on';
    return () => {
      delete root.dataset.pixelReticle;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    const reticle = reticleRef.current;
    const ring = ringRef.current;
    const ghost = ghostRef.current;
    if (!root || !reticle || !ring || !ghost) return;

    let frameId = 0;
    let lastTime = performance.now();
    let lastModeCheck = 0;
    let modeDirty = true;

    let hasPointer = false;
    let pointerX = 0;
    let pointerY = 0;
    let previousX = 0;
    let previousY = 0;

    let velocity = 0; // smoothed pointer speed, px per 60fps frame
    let spread = 0; // current ring gap, grid units
    let trailAlpha = 0; // inertial feedback opacity
    let pulse = 0; // click squeeze

    let nativeCursorActive = false;
    let rootShown = false;

    const chain = CHAIN_RATES.map(() => ({ x: 0, y: 0 }));
    const ghostNode = { x: 0, y: 0 };

    // Frame-rate independent lerp factor.
    const ease = (rate: number, frameDelta: number) =>
      1 - Math.pow(1 - rate, frameDelta);

    const setRootShown = (next: boolean) => {
      if (rootShown === next) return;
      rootShown = next;
      root.style.opacity = next ? '1' : '0';
    };

    const snapChain = () => {
      for (const node of chain) {
        node.x = pointerX;
        node.y = pointerY;
      }
      ghostNode.x = pointerX;
      ghostNode.y = pointerY;
    };

    const settle = () => {
      velocity = 0;
      spread = 0;
      trailAlpha = 0;
      pulse = 0;
      previousX = pointerX;
      previousY = pointerY;
      snapChain();
    };

    /** True when the hovered element paints its own native pixel cursor. */
    const readNativeCursor = () => {
      const hovered = document.elementFromPoint(pointerX, pointerY);
      if (!hovered) return true;
      return window.getComputedStyle(hovered).cursor !== 'none';
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!hasPointer) {
        hasPointer = true;
        previousX = pointerX;
        previousY = pointerY;
        snapChain();
      }
    };

    // Movement is also the cheap moment to re-check which cursor is under the
    // pointer, so the reticle steps aside the instant a control is entered.
    const onPointerOver = () => {
      modeDirty = true;
    };

    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      hasPointer = false;
    };

    const onPointerDown = () => {
      pulse = 1;
    };

    const paint = (speedRatio: number) => {
      // Ring + ghost: hidden while a native pixel cursor is under the pointer,
      // so the two never draw on top of each other.
      reticle.style.opacity = nativeCursorActive ? '0' : '1';

      ring.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) scale(${
        1 - pulse * 0.2
      })`;

      const spreadPx = spread * unit;
      for (let i = 0; i < RING_SEGMENTS.length; i += 1) {
        const node = segmentRefs.current[i];
        if (!node) continue;
        const segment = RING_SEGMENTS[i];
        node.style.transform = `translate3d(${
          segment.dx * spreadPx
        }px, ${segment.dy * spreadPx}px, 0)`;
      }

      if (dotRef.current) {
        dotRef.current.style.opacity = String(1 - speedRatio * 0.72);
        dotRef.current.style.transform = `scale(${1 - speedRatio * 0.25})`;
      }

      ghost.style.transform = `translate3d(${ghostNode.x}px, ${
        ghostNode.y
      }px, 0) scale(${1 + speedRatio * 0.5})`;
      ghost.style.opacity = String(trailAlpha * 0.34);

      // The inertial shard trail keeps following the pointer in every state.
      for (let i = 0; i < TRAIL_COUNT; i += 1) {
        const node = trailRefs.current[i];
        const chainNode = chain[i + 1];
        if (!node || !chainNode) continue;
        node.style.transform = `translate3d(${chainNode.x}px, ${chainNode.y}px, 0)`;
        node.style.opacity = String(
          trailAlpha * (0.62 - i * 0.1) * (0.35 + speedRatio * 0.65)
        );
      }
    };

    const frame = (now: number) => {
      frameId = window.requestAnimationFrame(frame);

      const dt = Math.min(Math.max(now - lastTime, 1), 48);
      lastTime = now;
      const frameDelta = dt / (1000 / 60);

      if (!hasPointer) {
        nativeCursorActive = false;
        settle();
        setRootShown(false);
        return;
      }

      if (modeDirty || now - lastModeCheck > MODE_POLL_MS) {
        modeDirty = false;
        lastModeCheck = now;
        nativeCursorActive = readNativeCursor();
      }

      // --- speed ---------------------------------------------------------
      const travel = Math.hypot(pointerX - previousX, pointerY - previousY);
      previousX = pointerX;
      previousY = pointerY;

      const instantSpeed = (travel * (1000 / 60)) / dt;
      velocity += (instantSpeed - velocity) * ease(0.42, frameDelta);
      if (velocity < 0.01) velocity = 0;

      const ratio = Math.min(
        Math.max((velocity - SPEED_FLOOR) / (SPEED_CEIL - SPEED_FLOOR), 0),
        1
      );
      // Smoothstep keeps the first few pixels of drift calm.
      const speedRatio = ratio * ratio * (3 - 2 * ratio);

      // --- spread: opens fast, closes with a short inertial tail ----------
      const spreadTarget = speedRatio * MAX_SPREAD;
      spread +=
        (spreadTarget - spread) *
        ease(spreadTarget > spread ? 0.38 : 0.12, frameDelta);
      if (spread < 0.01) spread = 0;

      // --- inertial drag feedback ----------------------------------------
      const trailTarget = speedRatio > 0.015 ? 1 : 0;
      trailAlpha +=
        (trailTarget - trailAlpha) *
        ease(trailTarget > trailAlpha ? 0.3 : 0.1, frameDelta);
      if (trailAlpha < 0.005) trailAlpha = 0;

      pulse *= Math.pow(0.78, frameDelta);
      if (pulse < 0.005) pulse = 0;

      // --- trailing chain -------------------------------------------------
      for (let i = 0; i < chain.length; i += 1) {
        const node = chain[i];
        const targetX = i === 0 ? pointerX : chain[i - 1].x;
        const targetY = i === 0 ? pointerY : chain[i - 1].y;
        const rate = ease(CHAIN_RATES[i], frameDelta);
        node.x += (targetX - node.x) * rate;
        node.y += (targetY - node.y) * rate;
      }

      // The ghost ring lags behind the reticle with its own easing, so the
      // spread stays readable while the echo slides out of place.
      const ghostRate = ease(GHOST_RATE, frameDelta);
      ghostNode.x += (pointerX - ghostNode.x) * ghostRate;
      ghostNode.y += (pointerY - ghostNode.y) * ghostRate;

      paint(speedRatio);
      setRootShown(true);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('pointerout', onPointerOut, { passive: true });
    frameId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
    };
  }, [enabled, unit]);

  if (!enabled) return null;

  const toPx = (value: number) => value * unit;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-pixel-reticle="root"
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      style={{ opacity: 0, transition: 'opacity 110ms linear' }}
    >
      {/* Ring + lagging ghost: the closed crosshair and its inertial echo. */}
      <div
        ref={reticleRef}
        data-pixel-reticle="reticle"
        className="absolute inset-0"
        style={{ transition: 'opacity 90ms linear' }}
      >
        {/* Ghost ring: a larger, lagging cyan copy of the reticle. */}
        <div
          ref={ghostRef}
          data-pixel-reticle="ghost"
          className="absolute left-0 top-0"
          style={{
            width: 0,
            height: 0,
            opacity: 0,
            willChange: 'transform, opacity',
          }}
        >
          {RING_SEGMENTS.map((segment, index) => (
            <div
              key={`ghost-${index}`}
              className="absolute"
              style={{
                left: toPx(segment.x - GRID_CENTER),
                top: toPx(segment.y - GRID_CENTER),
                width: toPx(segment.w),
                height: toPx(segment.h),
                background: RING_ACCENT,
              }}
            />
          ))}
        </div>

        {/* Closed reticle: eight segments that fly apart with pointer speed. */}
        <div
          ref={ringRef}
          data-pixel-reticle="ring"
          className="absolute left-0 top-0"
          style={{ width: 0, height: 0, willChange: 'transform' }}
        >
          {RING_SEGMENTS.map((segment, index) => (
            <div
              key={`ring-${index}`}
              ref={(node) => {
                segmentRefs.current[index] = node;
              }}
              className="absolute"
              style={{
                left: toPx(segment.x - GRID_CENTER),
                top: toPx(segment.y - GRID_CENTER),
                width: toPx(segment.w),
                height: toPx(segment.h),
                background: RING_FILL,
                willChange: 'transform',
              }}
            >
              <div
                className="absolute"
                style={{
                  left: unit,
                  top: unit,
                  width: toPx(segment.w - 2),
                  height: toPx(segment.h - 2),
                  background: RING_EDGE,
                }}
              />
            </div>
          ))}

          <div
            ref={dotRef}
            className="absolute"
            style={{
              left: toPx(11 - GRID_CENTER),
              top: toPx(11 - GRID_CENTER),
              width: toPx(2),
              height: toPx(2),
              background: RING_ACCENT,
            }}
          />
        </div>
      </div>

      {/* Pixel shard chain dragging behind the reticle. */}
      {TRAIL_COLORS.map((color, index) => {
        const size = (2.4 - index * 0.3) * unit;
        return (
          <div
            key={`trail-${index}`}
            ref={(node) => {
              trailRefs.current[index] = node;
            }}
            className="absolute left-0 top-0"
            style={{
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              background: color,
              boxShadow: `0 0 ${6 * unit}px ${color}99`,
              opacity: 0,
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
    </div>
  );
};
