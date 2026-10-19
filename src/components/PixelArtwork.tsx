import React, { useMemo } from 'react';

export type CoverArtType =
  | 'auto'
  | 'cyber-city'
  | 'liquid-shader'
  | 'retro-console'
  | 'neural-core'
  | 'synth-wave'
  | 'pixel-garden';

// Generate a random 6-digit seed number (100000 - 999999)
export function generateRandomSeed(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

// Convert any number or string input into a clean display seed integer
export function normalizeSeed(seedInput: number | string | undefined): number {
  if (typeof seedInput === 'number' && Number.isFinite(seedInput)) {
    return Math.abs(Math.floor(seedInput));
  }
  const str = String(seedInput ?? '202610').trim();
  if (!str) return 1024;
  const asNum = Number(str);
  if (!Number.isNaN(asNum)) {
    return Math.abs(Math.floor(asNum));
  }
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000000;
}

// Full 32-bit MurmurHash3 / SplitMix32 Avalanche Mixer
// Ensures seed 1, seed 2, seed 3 have completely uncorrelated bits!
function avalancheHash(seed: number, salt: number = 0): number {
  let h = (seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function createSeededRng(seed: number, salt: number = 0) {
  let state = avalancheHash(seed, salt) || 0x6d2b79f5;
  const nextFloat = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nextInt = (min: number, max: number) =>
    Math.floor(nextFloat() * (max - min + 1)) + min;
  const pick = <T,>(arr: readonly T[]): T =>
    arr[Math.floor(nextFloat() * arr.length)];
  return { nextFloat, nextInt, pick };
}

// HSL to Hex converter for procedural infinite color palettes
function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const lig = Math.max(0, Math.min(100, l)) / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface ProceduralPalette {
  bgDeep: string;
  bgMid: string;
  bgGlow: string;
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
  highlight: string;
  shadow: string;
}

// Synthesizes a unique color palette from 360-degree continuous hue space
function synthesizePalette(rng: ReturnType<typeof createSeededRng>): ProceduralPalette {
  const baseHue = rng.nextInt(0, 359);
  const harmonyMode = rng.nextInt(0, 4);
  // 0: Split-Complementary, 1: Triadic, 2: Cyberpunk Duotone, 3: Analogous Wide, 4: Tetradic Golden
  const hueOffsets =
    harmonyMode === 0
      ? [150, 210, 45]
      : harmonyMode === 1
      ? [120, 240, 60]
      : harmonyMode === 2
      ? [175, 320, 195]
      : harmonyMode === 3
      ? [42, 85, 290]
      : [137.5, 275, 52.5];

  const h1 = (baseHue + hueOffsets[0]) % 360;
  const h2 = (baseHue + hueOffsets[1]) % 360;
  const h3 = (baseHue + hueOffsets[2]) % 360;

  const baseSat = rng.nextInt(72, 96);
  return {
    bgDeep: hslToHex(baseHue, rng.nextInt(45, 70), rng.nextInt(5, 10)),
    bgMid: hslToHex((baseHue + 18) % 360, rng.nextInt(50, 75), rng.nextInt(12, 18)),
    bgGlow: hslToHex(h1, rng.nextInt(55, 85), rng.nextInt(20, 28)),
    primary: hslToHex(h1, baseSat, rng.nextInt(56, 68)),
    secondary: hslToHex(h2, baseSat, rng.nextInt(58, 70)),
    tertiary: hslToHex(h3, rng.nextInt(75, 95), rng.nextInt(54, 66)),
    accent: hslToHex((baseHue + 90) % 360, 90, 62),
    highlight: hslToHex(h1, rng.nextInt(60, 90), rng.nextInt(86, 95)),
    shadow: hslToHex(baseHue, rng.nextInt(50, 70), rng.nextInt(3, 6)),
  };
}

// 4x4 Bayer Ordered Dithering Matrix (normalized 0..1)
const BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16],
];

export const PixelAvatar: React.FC<{ size?: number; className?: string }> = ({
  size = 56,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pixelated select-none ${className}`}
      shapeRendering="crispEdges"
    >
      {/* Arcane Deep Void Backdrop */}
      <rect x="0" y="0" width="24" height="24" fill="#070B19" />
      <rect x="1" y="1" width="22" height="22" fill="#13112C" />

      {/* Orbiting Orb 1: QUAS (Ice Blue - Top Left) */}
      <rect x="1" y="3" width="4" height="4" fill="#0284C7" />
      <rect x="2" y="2" width="2" height="6" fill="#38BDF8" />
      <rect x="1" y="4" width="6" height="2" fill="#38BDF8" />
      <rect x="2" y="4" width="2" height="2" fill="#E0F2FE" />

      {/* Orbiting Orb 2: WEX (Storm Violet/Magenta - Top Right) */}
      <rect x="19" y="3" width="4" height="4" fill="#9333EA" />
      <rect x="20" y="2" width="2" height="6" fill="#E879F9" />
      <rect x="17" y="4" width="6" height="2" fill="#E879F9" />
      <rect x="20" y="4" width="2" height="2" fill="#FAE8FF" />

      {/* Orbiting Orb 3: EXORT (Sun Fire Amber - Top Crown) */}
      <rect x="10" y="1" width="4" height="3" fill="#EA580C" />
      <rect x="11" y="0" width="2" height="4" fill="#FBBF24" />
      <rect x="11" y="1" width="2" height="2" fill="#FEF9C3" />

      {/* Invoker High-Standing Royal White & Gold Collar (Back Layer) */}
      <rect x="3" y="10" width="3" height="7" fill="#E2E8F0" />
      <rect x="18" y="10" width="3" height="7" fill="#E2E8F0" />
      <rect x="3" y="9" width="2" height="2" fill="#F59E0B" />
      <rect x="19" y="9" width="2" height="2" fill="#F59E0B" />
      <rect x="4" y="11" width="2" height="6" fill="#F8FAFC" />
      <rect x="18" y="11" width="2" height="6" fill="#F8FAFC" />

      {/* Golden Flowing Spiky Hair (Ezreal × Invoker Crown) */}
      <rect x="6" y="4" width="12" height="5" fill="#F59E0B" />
      <rect x="7" y="3" width="10" height="3" fill="#FDE047" />
      <rect x="5" y="6" width="2" height="6" fill="#F59E0B" />
      <rect x="17" y="6" width="2" height="6" fill="#F59E0B" />
      <rect x="6" y="5" width="2" height="5" fill="#FDE047" />
      <rect x="16" y="5" width="2" height="5" fill="#FDE047" />
      <rect x="9" y="3" width="4" height="1" fill="#FEF9C3" />

      {/* Ezreal's Iconic Arcane Goggles on Forehead */}
      <rect x="6" y="6" width="12" height="2" fill="#1E293B" />
      <rect x="7" y="5" width="4" height="3" fill="#0284C7" />
      <rect x="13" y="5" width="4" height="3" fill="#0284C7" />
      <rect x="8" y="6" width="3" height="2" fill="#38BDF8" />
      <rect x="14" y="6" width="3" height="2" fill="#38BDF8" />
      <rect x="8" y="6" width="1" height="1" fill="#FFFFFF" />
      <rect x="14" y="6" width="1" height="1" fill="#FFFFFF" />
      <rect x="11" y="6" width="2" height="1" fill="#F59E0B" />

      {/* Golden Hair Bangs Over Forehead */}
      <rect x="7" y="8" width="2" height="2" fill="#FDE047" />
      <rect x="11" y="8" width="2" height="3" fill="#FDE047" />
      <rect x="15" y="8" width="2" height="2" fill="#FDE047" />

      {/* Face */}
      <rect x="7" y="9" width="10" height="7" fill="#FDE68A" />
      <rect x="8" y="16" width="8" height="1" fill="#FCD34D" />

      {/* Invoker Glowing Cyan Arcane Eyes */}
      <rect x="8" y="11" width="2" height="2" fill="#0284C7" />
      <rect x="14" y="11" width="2" height="2" fill="#0284C7" />
      <rect x="8" y="11" width="1" height="1" fill="#ECFEFF" />
      <rect x="14" y="11" width="1" height="1" fill="#ECFEFF" />
      <rect x="9" y="12" width="1" height="1" fill="#38BDF8" />
      <rect x="15" y="12" width="1" height="1" fill="#38BDF8" />

      {/* Ezreal's Arcane Cheek Marks & Confident Smirk */}
      <rect x="7" y="13" width="2" height="1" fill="#F43F5E" />
      <rect x="15" y="13" width="2" height="1" fill="#F43F5E" />
      <rect x="10" y="14" width="4" height="1" fill="#92400E" />
      <rect x="13" y="13" width="1" height="1" fill="#92400E" />

      {/* Royal White & Gold Invoker Mantle + Ezreal Arcane Core */}
      <rect x="4" y="17" width="16" height="6" fill="#F8FAFC" />
      <rect x="5" y="17" width="14" height="1" fill="#F59E0B" />
      <rect x="7" y="18" width="10" height="5" fill="#581C87" />
      <rect x="9" y="18" width="6" height="5" fill="#7C3AED" />
      {/* Glowing Arcane Gauntlet / Chest Crystal */}
      <rect x="10" y="19" width="4" height="3" fill="#0284C7" />
      <rect x="11" y="19" width="2" height="2" fill="#67E8F9" />
      <rect x="11" y="19" width="1" height="1" fill="#FFFFFF" />
      {/* Gold Shoulder Pauldrons */}
      <rect x="4" y="18" width="3" height="2" fill="#FBBF24" />
      <rect x="17" y="18" width="3" height="2" fill="#FBBF24" />

      {/* Outer Pixel Frame Accents */}
      <rect x="0" y="0" width="24" height="1" fill="#38BDF8" fillOpacity="0.6" />
      <rect x="0" y="23" width="24" height="1" fill="#E879F9" fillOpacity="0.6" />
      <rect x="0" y="0" width="1" height="24" fill="#38BDF8" fillOpacity="0.6" />
      <rect x="23" y="0" width="1" height="24" fill="#F59E0B" fillOpacity="0.6" />
    </svg>
  );
};

export const PixelHeart: React.FC<{ filled?: boolean; className?: string }> = ({
  filled = true,
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 12 11"
    fill="none"
    shapeRendering="crispEdges"
    className={`pixelated ${className}`}
  >
    <path
      d="M2 1H5V2H6V2H7V1H10V2H11V5H10V7H9V8H8V9H7V10H5V9H4V8H3V7H2V5H1V2H2V1Z"
      fill={filled ? '#F43F5E' : 'currentColor'}
      fillOpacity={filled ? 1 : 0.35}
    />
    {filled && <rect x="3" y="2" width="2" height="1" fill="#FDA4AF" />}
  </svg>
);

export const PixelLogoMark: React.FC<{ className?: string }> = ({
  className = 'w-8 h-8',
}) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    shapeRendering="crispEdges"
    className={`pixelated ${className}`}
  >
    <rect x="2" y="1" width="12" height="14" fill="#0EA5E9" fillOpacity="0.2" />
    <rect x="3" y="2" width="10" height="12" fill="#38BDF8" fillOpacity="0.25" />
    <rect x="3" y="3" width="2" height="10" fill="#38BDF8" />
    <rect x="5" y="3" width="4" height="2" fill="#38BDF8" />
    <rect x="8" y="5" width="2" height="3" fill="#38BDF8" />
    <rect x="5" y="7" width="4" height="2" fill="#38BDF8" />
    <rect x="10" y="10" width="3" height="3" fill="#F472B6" />
    <rect x="4" y="4" width="2" height="1" fill="#FFFFFF" />
  </svg>
);

export const PixelPostCover: React.FC<{
  type?: CoverArtType;
  seed?: number | string;
  className?: string;
}> = ({ type = 'auto', seed = 202601, className = '' }) => {
  const numericSeed = useMemo(() => normalizeSeed(seed), [seed]);

  // Generate a 64x32 pixel buffer deterministically from the seed
  // Every seed produces a unique combination of:
  // 1) Synthesized HSL Color Harmony Palette
  // 2) Background Mathematical Field Shader (Plasma / Voronoi / Spiral / Diamond / Cellular Automata / Horizon)
  // 3) Midground Structural Architecture (Skyline / Mountain / Circuit / Rings / Isometric / Oscilloscope)
  // 4) Foreground Procedural Pixel Totem / Spaceship / Glyph / Crystal / Planet
  const svgRects = useMemo(() => {
    const rng = createSeededRng(numericSeed, 101);
    const pal = synthesizePalette(rng);

    const W = 64;
    const H = 32;
    const grid: string[][] = Array.from({ length: H }, () =>
      Array(W).fill(pal.bgDeep)
    );

    const setPx = (x: number, y: number, color: string) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      if (ix >= 0 && ix < W && iy >= 0 && iy < H) {
        grid[iy][ix] = color;
      }
    };

    const drawRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      color: string
    ) => {
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          setPx(x + dx, y + dy, color);
        }
      }
    };

    // --- LAYER 1: Mathematical Background Pixel Shader (2x2 or 1x1 dithered field) ---
    const bgMode = rng.nextInt(0, 6);
    const focalX = rng.nextInt(12, 52);
    const focalY = rng.nextInt(6, 24);
    const freqX = rng.nextFloat() * 0.22 + 0.06;
    const freqY = rng.nextFloat() * 0.25 + 0.08;
    const phase = rng.nextFloat() * Math.PI * 2;
    const twist = rng.nextFloat() * 3.5 + 1.0;

    // Voronoi sites if bgMode === 3
    const voronoiSites = Array.from({ length: 7 }, () => ({
      x: rng.nextInt(0, W - 1),
      y: rng.nextInt(0, H - 1),
      col: rng.pick([pal.bgDeep, pal.bgMid, pal.bgGlow, pal.shadow]),
    }));

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const bayer = BAYER_4X4[y & 3][x & 3];
        let v = 0;

        if (bgMode === 0) {
          // Bayer Dithered Radial + Wave Field
          const dx = (x - focalX) * 0.9;
          const dy = (y - focalY) * 1.4;
          const dist = Math.sqrt(dx * dx + dy * dy) / 36;
          v = 1 - dist + Math.sin(x * freqX + phase) * 0.15;
        } else if (bgMode === 1) {
          // Plasma Interference Shader
          const s1 = Math.sin(x * freqX + phase);
          const s2 = Math.cos(y * freqY - phase);
          const s3 = Math.sin((x + y) * (freqX * 0.7));
          v = (s1 + s2 + s3 + 3) / 6;
        } else if (bgMode === 2) {
          // Manhattan Diamond Rings
          const md =
            (Math.abs(x - focalX) + Math.abs(y - focalY) * 1.5) * freqX;
          v = (Math.sin(md + phase) + 1) * 0.5;
        } else if (bgMode === 3) {
          // Voronoi Crystal Shards
          let minD1 = 99999;
          let minD2 = 99999;
          let bestCol = pal.bgDeep;
          for (const s of voronoiSites) {
            const d = Math.abs(x - s.x) + Math.abs(y - s.y) * 1.5;
            if (d < minD1) {
              minD2 = minD1;
              minD1 = d;
              bestCol = s.col;
            } else if (d < minD2) {
              minD2 = d;
            }
          }
          if (minD2 - minD1 <= 1.6) {
            setPx(x, y, bayer > 0.4 ? pal.primary : pal.bgGlow);
          } else {
            setPx(x, y, bestCol);
          }
          continue;
        } else if (bgMode === 4) {
          // Spiral Galaxy / Polar Vortex
          const dx = x - focalX;
          const dy = (y - focalY) * 1.6;
          const angle = Math.atan2(dy, dx);
          const radius = Math.sqrt(dx * dx + dy * dy);
          v = (Math.sin(angle * Math.floor(twist) + radius * 0.35 - phase) + 1) * 0.5;
        } else if (bgMode === 5) {
          // Diagonal Stepped Bands
          const diag = (x * rng.nextInt(1, 2) + y * rng.nextInt(1, 3)) * 0.08;
          v = (Math.sin(diag + phase) + 1) * 0.5;
        } else {
          // Vertical / Horizontal Gradient with Dither
          v = 1 - y / H;
        }

        const quantized = v + (bayer - 0.5) * 0.32;
        if (quantized > 0.78) {
          setPx(x, y, pal.bgGlow);
        } else if (quantized > 0.45) {
          setPx(x, y, pal.bgMid);
        } else if (quantized > 0.2) {
          setPx(x, y, pal.bgDeep);
        } else {
          setPx(x, y, pal.shadow);
        }
      }
    }

    // --- LAYER 2: Midground Structural Generator (Seed-Driven) ---
    // Even if a post has a preferred coverType, we blend the seed's structural mode so every seed changes structure!
    const structMode = rng.nextInt(0, 6);

    if (structMode === 0) {
      // Procedural Cyber Skyline with variable density, bridges & neon signs
      let bx = rng.nextInt(0, 3);
      while (bx < W - 2) {
        const bw = rng.nextInt(4, 10);
        const bh = rng.nextInt(6, 22);
        const by = H - bh;
        const bCol = rng.nextFloat() > 0.5 ? pal.shadow : pal.bgDeep;
        drawRect(bx, by, bw, bh, bCol);
        // Roof trim
        drawRect(bx, by, bw, 1, rng.pick([pal.primary, pal.secondary]));
        // Spire
        if (rng.nextFloat() > 0.5) {
          const sx = bx + Math.floor(bw / 2);
          const sh = rng.nextInt(2, 5);
          drawRect(sx, by - sh, 1, sh, pal.tertiary);
          setPx(sx, by - sh, pal.highlight);
        }
        // Windows pattern
        const winStepX = rng.nextInt(2, 3);
        const winStepY = rng.nextInt(2, 4);
        const winCol = rng.pick([
          pal.primary,
          pal.secondary,
          pal.tertiary,
          pal.highlight,
        ]);
        for (let wy = by + 2; wy < H - 3; wy += winStepY) {
          for (let wx = bx + 1; wx < bx + bw - 1; wx += winStepX) {
            if (rng.nextFloat() > 0.35) {
              setPx(wx, wy, winCol);
            }
          }
        }
        bx += bw + rng.nextInt(-1, 2);
      }
    } else if (structMode === 1) {
      // Wolfram 1D Elementary Cellular Automaton Pyramid / Tapestry
      const rule = rng.pick([30, 54, 60, 90, 102, 110, 126, 150, 182]);
      let row = Array.from({ length: W }, () => (rng.nextFloat() > 0.82 ? 1 : 0));
      row[Math.floor(W / 2)] = 1;
      const caCol1 = rng.pick([pal.primary, pal.secondary, pal.tertiary]);
      const caCol2 = rng.pick([pal.highlight, pal.accent]);
      const startY = rng.nextInt(2, 8);
      for (let y = startY; y < H; y++) {
        const nextRow = Array(W).fill(0);
        for (let x = 0; x < W; x++) {
          if (row[x]) {
            setPx(x, y, (x + y) % 3 === 0 ? caCol2 : caCol1);
          }
          const left = row[(x - 1 + W) % W];
          const self = row[x];
          const right = row[(x + 1) % W];
          const pattern = (left << 2) | (self << 1) | right;
          nextRow[x] = (rule >> pattern) & 1;
        }
        row = nextRow;
      }
    } else if (structMode === 2) {
      // Perspective Synth Grid + Jagged Mountain Ridges
      const horizonY = rng.nextInt(14, 21);
      let mh = rng.nextInt(3, 9);
      const ridgeCol = rng.pick([pal.primary, pal.secondary, pal.tertiary]);
      for (let x = 0; x < W; x++) {
        mh = Math.max(1, Math.min(13, mh + rng.nextInt(-2, 2)));
        drawRect(x, horizonY - mh, 1, mh, pal.shadow);
        setPx(x, horizonY - mh, ridgeCol);
      }
      // Floor perspective grid
      drawRect(0, horizonY, W, H - horizonY, pal.shadow);
      const vanishX = rng.nextInt(16, 48);
      for (let y = horizonY; y < H; y++) {
        if ((y - horizonY) % 3 === 0) {
          drawRect(0, y, W, 1, pal.secondary);
        }
      }
      const rayCount = rng.nextInt(6, 12);
      for (let r = -rayCount; r <= rayCount; r++) {
        for (let y = horizonY; y < H; y++) {
          const t = (y - horizonY) / Math.max(1, H - horizonY);
          const rx = Math.round(vanishX + r * (3 + t * 18));
          setPx(rx, y, pal.primary);
        }
      }
    } else if (structMode === 3) {
      // Circuit Board Traces & Logic Nodes
      const traceCount = rng.nextInt(8, 16);
      for (let i = 0; i < traceCount; i++) {
        let tx = rng.nextInt(2, W - 3);
        let ty = rng.nextInt(2, H - 3);
        const tCol = rng.pick([pal.primary, pal.secondary, pal.tertiary]);
        const steps = rng.nextInt(6, 18);
        let dirX = rng.pick([-1, 0, 1]);
        let dirY = dirX === 0 ? rng.pick([-1, 1]) : 0;
        for (let s = 0; s < steps; s++) {
          setPx(tx, ty, tCol);
          tx += dirX;
          ty += dirY;
          if (rng.nextFloat() > 0.7) {
            // 90-degree or 45-degree turn
            const tmp = dirX;
            dirX = dirY;
            dirY = tmp;
          }
        }
        // Terminal pad at end
        drawRect(tx - 1, ty - 1, 3, 3, pal.highlight);
        setPx(tx, ty, tCol);
      }
    } else if (structMode === 4) {
      // Audio / Oscilloscope Waveform + Data Bars
      const waveY = rng.nextInt(12, 20);
      const waveFreq = rng.nextFloat() * 0.4 + 0.12;
      const waveAmp = rng.nextInt(4, 11);
      for (let x = 0; x < W; x += 2) {
        const h = Math.max(
          1,
          Math.abs(
            Math.round(
              Math.sin(x * waveFreq + phase) *
                Math.cos(x * 0.09) *
                waveAmp
            )
          )
        );
        drawRect(x, waveY - h, 1, h * 2 + 1, pal.primary);
        setPx(x, waveY - h, pal.highlight);
        setPx(x, waveY + h, pal.secondary);
      }
    } else if (structMode === 5) {
      // Floating Pixel Terrarium Islands & Crystal Flora
      const islandCount = rng.nextInt(3, 6);
      for (let i = 0; i < islandCount; i++) {
        const iw = rng.nextInt(10, 22);
        const ix = rng.nextInt(2, W - iw - 2);
        const iy = rng.nextInt(10, 26);
        // Island rock base tapering down
        for (let row = 0; row < 5; row++) {
          const rw = Math.max(2, iw - row * 4);
          const rx = ix + Math.floor((iw - rw) / 2);
          drawRect(rx, iy + row, rw, 1, row === 0 ? pal.tertiary : pal.shadow);
        }
        // Crystal tree on island
        const tx = ix + Math.floor(iw / 2);
        const th = rng.nextInt(4, 8);
        drawRect(tx, iy - th, 2, th, pal.secondary);
        drawRect(tx - 2, iy - th - 2, 6, 3, pal.primary);
        drawRect(tx - 1, iy - th - 3, 4, 1, pal.highlight);
      }
    } else {
      // Isometric / Concentric Pixel Frames & Portals
      const cx = rng.nextInt(20, 44);
      const cy = rng.nextInt(10, 22);
      for (let r = 3; r <= 15; r += rng.nextInt(3, 4)) {
        const col = r % 2 === 0 ? pal.primary : pal.secondary;
        for (let dx = -r * 2; dx <= r * 2; dx++) {
          setPx(cx + dx, cy - r, col);
          setPx(cx + dx, cy + r, col);
        }
        for (let dy = -r; dy <= r; dy++) {
          setPx(cx - r * 2, cy + dy, col);
          setPx(cx + r * 2, cy + dy, col);
        }
      }
    }

    // --- LAYER 3: Foreground Procedural Focal Subject (Totem / Sprite / Celestial / Prism) ---
    const fgMode = rng.nextInt(0, 4);
    const centerX = rng.nextInt(18, 46);
    const centerY = rng.nextInt(10, 20);

    if (fgMode === 0) {
      // Procedural Bilateral Symmetric Pixel Invader / Mecha Totem (unique 10x10 matrix)
      const halfW = rng.nextInt(4, 7);
      const spriteH = rng.nextInt(8, 14);
      const startY = Math.max(2, centerY - Math.floor(spriteH / 2));

      for (let sy = 0; sy < spriteH; sy++) {
        for (let sx = 0; sx < halfW; sx++) {
          // Higher density near center, lower at edges
          const prob = 0.68 - (sx / halfW) * 0.25;
          if (rng.nextFloat() < prob) {
            const col =
              sx === 0
                ? pal.highlight
                : sx < 2
                ? pal.primary
                : sx < 4
                ? pal.secondary
                : pal.tertiary;
            const pxL = centerX - 1 - sx;
            const pxR = centerX + sx;
            const py = startY + sy;
            // Outline shadow
            setPx(pxL - 1, py, pal.shadow);
            setPx(pxR + 1, py, pal.shadow);
            setPx(pxL, py, col);
            setPx(pxR, py, col);
          }
        }
      }
    } else if (fgMode === 1) {
      // Procedural Ringed Exoplanet / Binary Celestial System
      const radius = rng.nextInt(5, 9);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const band = Math.sin((dy + phase) * 0.9);
            const col =
              dx + dy < -radius * 0.4
                ? pal.highlight
                : band > 0.2
                ? pal.primary
                : band > -0.3
                ? pal.secondary
                : pal.bgGlow;
            setPx(centerX + dx, centerY + dy, col);
          }
        }
      }
      // Planetary Ring
      const tilt = rng.nextFloat() * 0.5 + 0.2;
      for (let rx = -radius * 2 - 2; rx <= radius * 2 + 2; rx++) {
        const ry = Math.round(rx * tilt);
        if (Math.abs(rx) > radius - 1 || ry > 0) {
          setPx(centerX + rx, centerY + ry, pal.tertiary);
          setPx(centerX + rx, centerY + ry + 1, pal.highlight);
        }
      }
    } else if (fgMode === 2) {
      // 4-Way Kaleidoscope Mandala Crystal
      const size = rng.nextInt(5, 9);
      for (let dy = 0; dy <= size; dy++) {
        for (let dx = 0; dx <= size; dx++) {
          if (dx + dy <= size + 2 && rng.nextFloat() > 0.42) {
            const col =
              dx + dy < 3
                ? pal.highlight
                : (dx + dy) % 2 === 0
                ? pal.primary
                : pal.secondary;
            setPx(centerX + dx, centerY + dy, col);
            setPx(centerX - dx, centerY + dy, col);
            setPx(centerX + dx, centerY - dy, col);
            setPx(centerX - dx, centerY - dy, col);
          }
        }
      }
    } else if (fgMode === 3) {
      // Overlapping Refracting Glass Windows & Data Cards
      const cardCount = rng.nextInt(2, 4);
      for (let c = 0; c < cardCount; c++) {
        const cw = rng.nextInt(12, 22);
        const ch = rng.nextInt(8, 15);
        const cx = rng.nextInt(6, W - cw - 6);
        const cy = rng.nextInt(4, H - ch - 4);
        const rimCol = rng.pick([pal.primary, pal.secondary, pal.tertiary]);
        // Top bar
        drawRect(cx, cy, cw, 2, rimCol);
        setPx(cx + 1, cy, pal.highlight);
        // Frame outline
        for (let x = cx; x < cx + cw; x++) {
          setPx(x, cy + ch - 1, rimCol);
        }
        for (let y = cy; y < cy + ch; y++) {
          setPx(cx, y, rimCol);
          setPx(cx + cw - 1, y, rimCol);
        }
        // Internal pixel data bars
        for (let py = cy + 4; py < cy + ch - 2; py += 2) {
          drawRect(
            cx + 2,
            py,
            rng.nextInt(3, cw - 4),
            1,
            rng.pick([pal.highlight, pal.primary, pal.secondary])
          );
        }
      }
    } else {
      // Sacred Geometry Diamond Prism + Laser Beams
      const pSize = rng.nextInt(6, 11);
      // Horizontal laser beam through prism
      drawRect(0, centerY, centerX - pSize, 1, pal.highlight);
      for (let r = -2; r <= 2; r++) {
        for (let x = centerX + pSize; x < W; x++) {
          const ry = centerY + Math.round(((x - (centerX + pSize)) * r) / 8);
          const beamCol =
            r === -2
              ? pal.primary
              : r === 0
              ? pal.highlight
              : r === 2
              ? pal.secondary
              : pal.tertiary;
          setPx(x, ry, beamCol);
        }
      }
      // Diamond Prism
      for (let dy = -pSize; dy <= pSize; dy++) {
        const span = pSize - Math.abs(dy);
        for (let dx = -span; dx <= span; dx++) {
          const isEdge = Math.abs(dx) === span || Math.abs(dy) === pSize;
          setPx(
            centerX + dx,
            centerY + dy,
            isEdge
              ? pal.highlight
              : dx < 0
              ? pal.primary
              : pal.secondary
          );
        }
      }
    }

    // --- LAYER 4: Procedural Stars / Constellations / Sparkles ---
    const sparkCount = rng.nextInt(6, 16);
    for (let s = 0; s < sparkCount; s++) {
      const sx = rng.nextInt(1, W - 2);
      const sy = rng.nextInt(1, H - 2);
      const sCol = rng.pick([pal.highlight, pal.primary, pal.secondary, pal.tertiary]);
      setPx(sx, sy, sCol);
      // Occasional 4-point pixel star cross
      if (rng.nextFloat() > 0.78) {
        setPx(sx, sy, pal.highlight);
        setPx(sx - 1, sy, sCol);
        setPx(sx + 1, sy, sCol);
        setPx(sx, sy - 1, sCol);
        setPx(sx, sy + 1, sCol);
      }
    }

    // Run-Length Encode (RLE) horizontal spans per row for ultra-fast SVG rendering!
    const rleNodes: React.ReactNode[] = [];
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const color = grid[y][x];
        let runLen = 1;
        while (x + runLen < W && grid[y][x + runLen] === color) {
          runLen++;
        }
        rleNodes.push(
          <rect
            key={`${y}-${x}`}
            x={x}
            y={y}
            width={runLen}
            height={1}
            fill={color}
          />
        );
        x += runLen;
      }
    }

    return rleNodes;
  }, [numericSeed, type]);

  return (
    <div className={`relative overflow-hidden bg-slate-950 ${className}`}>
      <svg
        viewBox="0 0 64 32"
        shapeRendering="crispEdges"
        className="w-full h-full pixelated"
        preserveAspectRatio="xMidYMid slice"
      >
        {svgRects}
      </svg>
    </div>
  );
};
