import React, { useEffect, useState } from 'react';

let busyTimer: number | null = null;

// Trigger the 8-bit pixel hourglass loading cursor briefly during state transitions
export function triggerPixelLoadingCursor(durationMs = 320) {
  if (typeof window === 'undefined') return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  document.body.classList.add('pixel-cursor-busy');
  if (busyTimer) {
    window.clearTimeout(busyTimer);
  }
  busyTimer = window.setTimeout(() => {
    document.body.classList.remove('pixel-cursor-busy');
    busyTimer = null;
  }, durationMs);
}

// Dynamically build resolution-adapted SVG data-URI cursors for 1080p, 2K (2560), and 4K (3840)
function applyResolutionAdaptedPixelCursors() {
  if (typeof window === 'undefined') return;
  const vw = window.innerWidth;
  // Choose even cursor size so the center hotspot (size/2, size/2) is always exact
  const size = vw >= 3200 ? 40 : vw >= 2200 ? 32 : 24;
  const center = size / 2;

  const root = document.documentElement;

  // 1. Default: Minimalist Symmetric Pixel Circle + Center Dot
  const defaultSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' shape-rendering='crispEdges'%3E%3Cg fill='%230F172A' fill-opacity='0.75'%3E%3Crect x='8' y='4' width='8' height='4'/%3E%3Crect x='8' y='16' width='8' height='4'/%3E%3Crect x='4' y='8' width='4' height='8'/%3E%3Crect x='16' y='8' width='4' height='8'/%3E%3Crect x='6' y='6' width='4' height='4'/%3E%3Crect x='14' y='6' width='4' height='4'/%3E%3Crect x='6' y='14' width='4' height='4'/%3E%3Crect x='14' y='14' width='4' height='4'/%3E%3C/g%3E%3Cg fill='%23F8FAFC'%3E%3Crect x='9' y='5' width='6' height='2'/%3E%3Crect x='9' y='17' width='6' height='2'/%3E%3Crect x='5' y='9' width='2' height='6'/%3E%3Crect x='17' y='9' width='2' height='6'/%3E%3Crect x='7' y='7' width='2' height='2'/%3E%3Crect x='15' y='7' width='2' height='2'/%3E%3Crect x='7' y='15' width='2' height='2'/%3E%3Crect x='15' y='15' width='2' height='2'/%3E%3C/g%3E%3Crect x='11' y='11' width='2' height='2' fill='%2338BDF8'/%3E%3C/svg%3E") ${center} ${center}, auto`;

  // 2. Pointer / Select: Expanded Cyan Pixel Ring + Glowing Core
  const pointerSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' shape-rendering='crispEdges'%3E%3Cg fill='%230F172A' fill-opacity='0.8'%3E%3Crect x='8' y='2' width='8' height='4'/%3E%3Crect x='8' y='18' width='8' height='4'/%3E%3Crect x='2' y='8' width='4' height='8'/%3E%3Crect x='18' y='8' width='4' height='8'/%3E%3Crect x='9' y='9' width='6' height='6'/%3E%3C/g%3E%3Cg fill='%2338BDF8'%3E%3Crect x='9' y='3' width='6' height='2'/%3E%3Crect x='9' y='19' width='6' height='2'/%3E%3Crect x='3' y='9' width='2' height='6'/%3E%3Crect x='19' y='9' width='2' height='6'/%3E%3Crect x='5' y='5' width='2' height='2'/%3E%3Crect x='17' y='5' width='2' height='2'/%3E%3Crect x='5' y='17' width='2' height='2'/%3E%3Crect x='17' y='17' width='2' height='2'/%3E%3C/g%3E%3Crect x='10' y='10' width='4' height='4' fill='%23F8FAFC'/%3E%3C/svg%3E") ${center} ${center}, pointer`;

  // 3. Text Input: Minimalist Pixel Vertical Beam with Center Ring Node
  const textSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' shape-rendering='crispEdges'%3E%3Crect x='8' y='3' width='8' height='4' fill='%230F172A' fill-opacity='0.75'/%3E%3Crect x='8' y='17' width='8' height='4' fill='%230F172A' fill-opacity='0.75'/%3E%3Crect x='10' y='5' width='4' height='14' fill='%230F172A' fill-opacity='0.75'/%3E%3Crect x='9' y='4' width='6' height='2' fill='%2338BDF8'/%3E%3Crect x='9' y='18' width='6' height='2' fill='%2338BDF8'/%3E%3Crect x='11' y='6' width='2' height='12' fill='%23F8FAFC'/%3E%3Crect x='9' y='10' width='6' height='4' fill='%230F172A' fill-opacity='0.75'/%3E%3Crect x='10' y='11' width='4' height='2' fill='%2338BDF8'/%3E%3C/svg%3E") ${center} ${center}, text`;

  // 4. Loading / Wait: Tri-Color Quas-Wex-Exort Pixel Ring
  const waitSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' shape-rendering='crispEdges'%3E%3Cg fill='%230F172A' fill-opacity='0.8'%3E%3Crect x='8' y='4' width='8' height='4'/%3E%3Crect x='8' y='16' width='8' height='4'/%3E%3Crect x='4' y='8' width='4' height='8'/%3E%3Crect x='16' y='8' width='4' height='8'/%3E%3C/g%3E%3Crect x='9' y='5' width='6' height='2' fill='%2338BDF8'/%3E%3Crect x='7' y='7' width='2' height='2' fill='%2338BDF8'/%3E%3Crect x='15' y='7' width='2' height='2' fill='%23E879F9'/%3E%3Crect x='17' y='9' width='2' height='6' fill='%23E879F9'/%3E%3Crect x='15' y='15' width='2' height='2' fill='%23F59E0B'/%3E%3Crect x='9' y='17' width='6' height='2' fill='%23F59E0B'/%3E%3Crect x='7' y='15' width='2' height='2' fill='%2338BDF8'/%3E%3Crect x='5' y='9' width='2' height='6' fill='%2338BDF8'/%3E%3Crect x='11' y='11' width='2' height='2' fill='%23FFFFFF'/%3E%3C/svg%3E") ${center} ${center}, wait`;

  // 5. Disabled / Not-Allowed: Crimson Pixel Circle with Slash
  const notAllowedSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' shape-rendering='crispEdges'%3E%3Cg fill='%230F172A' fill-opacity='0.8'%3E%3Crect x='8' y='4' width='8' height='4'/%3E%3Crect x='8' y='16' width='8' height='4'/%3E%3Crect x='4' y='8' width='4' height='8'/%3E%3Crect x='16' y='8' width='4' height='8'/%3E%3C/g%3E%3Cg fill='%23F43F5E'%3E%3Crect x='9' y='5' width='6' height='2'/%3E%3Crect x='9' y='17' width='6' height='2'/%3E%3Crect x='5' y='9' width='2' height='6'/%3E%3Crect x='17' y='9' width='2' height='6'/%3E%3Crect x='7' y='7' width='2' height='2'/%3E%3Crect x='15' y='7' width='2' height='2'/%3E%3Crect x='7' y='15' width='2' height='2'/%3E%3Crect x='15' y='15' width='2' height='2'/%3E%3Crect x='9' y='9' width='2' height='2'/%3E%3Crect x='11' y='11' width='2' height='2'/%3E%3Crect x='13' y='13' width='2' height='2'/%3E%3C/g%3E%3C/svg%3E") ${center} ${center}, not-allowed`;

  root.style.setProperty('--cursor-pixel-default', defaultSvg);
  root.style.setProperty('--cursor-pixel-pointer', pointerSvg);
  root.style.setProperty('--cursor-pixel-text', textSvg);
  root.style.setProperty('--cursor-pixel-wait', waitSvg);
  root.style.setProperty('--cursor-pixel-not-allowed', notAllowedSvg);
}

const SHARD_COLORS = [
  '#38BDF8', // Quas Cyan
  '#E879F9', // Wex Magenta
  '#FBBF24', // Exort Gold
  '#34D399', // Emerald
  '#FB7185', // Rose
  '#F8FAFC', // Pure White
];

interface PixelShard {
  id: number;
  tx: number;
  ty: number;
  w: number;
  h: number;
  color: string;
  dur: number;
  hollow: boolean;
}

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  shards: PixelShard[];
}

function createRandomShardBurst(x: number, y: number): ClickBurst {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const scale = vw >= 3200 ? 1.65 : vw >= 2200 ? 1.3 : 1;

  // Randomize number of shards between 11 and 17 per burst
  const count = Math.floor(11 + Math.random() * 7);
  const shards: PixelShard[] = [];

  for (let i = 0; i < count; i++) {
    // Base angle distributed around 360 deg + strong random angular jitter
    const baseAngle = (i / count) * Math.PI * 2;
    const angle = baseAngle + (Math.random() - 0.5) * 0.85;

    // Wide randomized spread distance (28px ~ 105px, scaled for 2K/4K)
    const dist = (28 + Math.random() * 78) * scale;

    // Snap target coordinates to 2px pixel steps + slight downward gravity drift
    const rawX = Math.cos(angle) * dist;
    const rawY = Math.sin(angle) * dist + (Math.random() * 14 - 3) * scale;
    const tx = Math.round(rawX / 2) * 2;
    const ty = Math.round(rawY / 2) * 2;

    // Randomize pixel shard dimensions (squares, rectangles, or hollow mini-rings)
    const shapeRoll = Math.random();
    let w = Math.round((4 + Math.random() * 4) * scale);
    let h = w;
    if (shapeRoll > 0.72) {
      w = Math.round(7 * scale);
      h = Math.round(3 * scale);
    } else if (shapeRoll < 0.22) {
      w = Math.round(3 * scale);
      h = Math.round(7 * scale);
    }

    const color =
      SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)];
    const dur = Math.floor(380 + Math.random() * 280);
    const hollow = Math.random() > 0.76;

    shards.push({
      id: i,
      tx,
      ty,
      w,
      h,
      color,
      dur,
      hollow,
    });
  }

  return {
    id: Date.now() + Math.random(),
    x,
    y,
    shards,
  };
}

// Compute the exact viewport (x, y) coordinates of the text caret inside an <input> or <textarea>
let mirrorDiv: HTMLDivElement | null = null;

function getInputCaretViewportCoords(
  el: HTMLInputElement | HTMLTextAreaElement
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  if (!mirrorDiv) {
    mirrorDiv = document.createElement('div');
    document.body.appendChild(mirrorDiv);
  }

  const isTextarea = el.tagName.toLowerCase() === 'textarea';
  const copyProps = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'textTransform',
    'wordSpacing',
    'textIndent',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderLeftWidth',
    'boxSizing',
    'lineHeight',
    'textAlign',
  ] as const;

  mirrorDiv.style.position = 'fixed';
  mirrorDiv.style.top = '-9999px';
  mirrorDiv.style.left = '-9999px';
  mirrorDiv.style.visibility = 'hidden';
  mirrorDiv.style.pointerEvents = 'none';
  mirrorDiv.style.whiteSpace = isTextarea ? 'pre-wrap' : 'pre';
  mirrorDiv.style.wordWrap = isTextarea ? 'break-word' : 'normal';
  mirrorDiv.style.width = isTextarea ? `${el.clientWidth}px` : 'auto';

  for (const prop of copyProps) {
    mirrorDiv.style[prop] = style[prop];
  }

  const caretIdx = el.selectionEnd ?? el.value.length;
  const textBefore = el.value.slice(0, caretIdx);

  mirrorDiv.textContent = textBefore;
  const marker = document.createElement('span');
  marker.textContent = '|';
  mirrorDiv.appendChild(marker);

  const rawX = rect.left + marker.offsetLeft - el.scrollLeft;
  const rawY =
    rect.top + marker.offsetTop - el.scrollTop + marker.offsetHeight * 0.5;

  const clampedX = Math.max(rect.left + 8, Math.min(rect.right - 8, rawX));
  const clampedY = Math.max(rect.top + 8, Math.min(rect.bottom - 8, rawY));

  return { x: clampedX, y: clampedY };
}

export const PixelCursorEffects: React.FC = () => {
  const [hasFinePointer, setHasFinePointer] = useState(false);
  const [bursts, setBursts] = useState<ClickBurst[]>([]);

  const spawnBurstAt = (x: number, y: number) => {
    const burst = createRandomShardBurst(x, y);
    setBursts((prev) => [...prev.slice(-11), burst]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burst.id));
    }, 680);
  };

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    setHasFinePointer(mq.matches);

    if (mq.matches) {
      applyResolutionAdaptedPixelCursors();
    }

    const onChange = (e: MediaQueryListEvent) => {
      setHasFinePointer(e.matches);
      if (e.matches) applyResolutionAdaptedPixelCursors();
    };
    const onResize = () => {
      if (window.matchMedia('(pointer: fine)').matches) {
        applyResolutionAdaptedPixelCursors();
      }
    };

    mq.addEventListener('change', onChange);
    window.addEventListener('resize', onResize);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!hasFinePointer) return;
      spawnBurstAt(e.clientX, e.clientY);
    };

    // Trigger exploding pixel shards when typing or deleting text in any <input> or <textarea>
    const handleInput = (e: Event) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        const { x, y } = getInputCaretViewportCoords(target);
        spawnBurstAt(x, y);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('input', handleInput, true);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('input', handleInput, true);
    };
  }, [hasFinePointer]);

  if (bursts.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {bursts.map((burst) => (
        <div
          key={burst.id}
          style={{ left: burst.x, top: burst.y }}
          className="absolute"
        >
          {burst.shards.map((shard) => (
            <span
              key={shard.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 animate-pixel-shard"
              style={
                {
                  width: `${shard.w}px`,
                  height: `${shard.h}px`,
                  backgroundColor: shard.hollow ? 'transparent' : shard.color,
                  border: shard.hollow ? `2px solid ${shard.color}` : 'none',
                  boxShadow: `0 0 6px ${shard.color}80`,
                  '--tx': `${shard.tx}px`,
                  '--ty': `${shard.ty}px`,
                  '--dur': `${shard.dur}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
};
