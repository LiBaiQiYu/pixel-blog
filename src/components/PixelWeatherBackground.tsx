import React, { useEffect, useRef } from 'react';
import type { WeatherKind } from '../types/weather';

type ThemeMode = 'dark' | 'light';

interface PixelWeatherBackgroundProps {
  kind: WeatherKind;
  enabled: boolean;
  theme: ThemeMode;
  /** Particle density multiplier, 1 = normal */
  intensity?: number;
  /** Observer latitude for solar/lunar position, defaults to Shanghai */
  latitude?: number;
  /** Observer longitude for solar/lunar position, defaults to Shanghai */
  longitude?: number;
  /** Beaufort wind scale (0-12) from the weather API, drives slant & drift */
  windScale?: number;
  /** Preview hour in true solar time (0-23), null uses the real clock */
  previewHour?: number | null;
}

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

interface SnowFlake {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  amp: number;
}

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
  alpha: number;
  variant: number;
  phase: number;
}

interface FogBand {
  y: number;
  h: number;
  speed: number;
  dir: number;
  alpha: number;
  phase: number;
  verticalAmp: number;
}

interface FogPuff {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  dir: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface WindStreak {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

interface Splash {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

interface HailPellet {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface HailFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
}

interface SandSpeck {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

interface HazeSpeck {
  x: number;
  y: number;
  speed: number;
  alpha: number;
  phase: number;
}

interface Mote {
  x: number;
  y: number;
  speed: number;
  phase: number;
}

interface Star {
  x: number;
  y: number;
  phase: number;
  bright: number;
}

interface Point {
  x: number;
  y: number;
}

interface Bolt {
  points: Point[];
  branches: Point[][];
  width: number;
  life: number;
  maxLife: number;
}

interface Flash {
  life: number;
  maxLife: number;
  intensity: number;
}

const CLOUD_BLOCKS: number[][][] = [
  [
    [0, 0, 10, 2],
    [2, -1, 5, 1],
    [7, 1, 6, 2],
  ],
  [
    [0, 1, 12, 2],
    [3, 0, 6, 1],
    [1, -1, 4, 1],
    [8, 0, 5, 1],
  ],
];

const RAD = Math.PI / 180;

const toJulian = (date: Date) => date.valueOf() / 86400000 - 0.5 + 2440588;
const toDays = (date: Date) => toJulian(date) - 2451545;

// Simplified SunCalc algorithm: solar altitude & azimuth for the current instant.
function solarPosition(date: Date, latDeg: number, lonDeg: number) {
  const d = toDays(date);
  const M = RAD * (357.5291 + 0.98560028 * d);
  const L =
    M +
    RAD *
      (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) +
    RAD * 102.9372 +
    Math.PI;
  const e = RAD * 23.4397;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const lw = RAD * -lonDeg;
  const phi = RAD * latDeg;
  const theta = RAD * (280.16 + 360.9856235 * d) - lw;
  const H = theta - ra;
  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  );
  // azimuth measured from south (negative = east, positive = west)
  const azimuth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)
  );
  return { altitude, azimuth };
}

function moonPosition(date: Date, latDeg: number, lonDeg: number) {
  const d = toDays(date);
  const e = RAD * 23.4397;
  const L = RAD * (218.316 + 13.176396 * d);
  const M = RAD * (134.963 + 13.064993 * d);
  const F = RAD * (93.272 + 13.229350 * d);
  const l = L + RAD * 6.289 * Math.sin(M);
  const b = RAD * 5.128 * Math.sin(F);
  const ra = Math.atan2(
    Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e),
    Math.cos(l)
  );
  const dec = Math.asin(
    Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)
  );
  const lw = RAD * -lonDeg;
  const phi = RAD * latDeg;
  const theta = RAD * (280.16 + 360.9856235 * d) - lw;
  const H = theta - ra;
  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  );
  const azimuth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)
  );
  return { altitude, azimuth };
}

// Moon phase: 0 = new moon, 0.5 = full moon, 1 = new moon again
function moonPhaseFraction(date: Date): number {
  const synodic = 29.530588853;
  const newMoonRef = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const days = date.valueOf() / 86400000;
  const phase = ((days - newMoonRef) % synodic) / synodic;
  return phase < 0 ? phase + 1 : phase;
}

function isBlueMoon(date: Date) {
  const start = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    1
  );
  const end = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    1
  );
  const step = 6 * 60 * 60 * 1000;
  const events: number[] = [];
  let previous = moonPhaseFraction(new Date(start));

  for (let time = start + step; time < end; time += step) {
    const current = moonPhaseFraction(new Date(time));
    if (previous < 0.5 && current >= 0.5) {
      events.push(time);
    }
    previous = current;
  }

  if (events.length < 2) return false;
  const now = date.getTime();
  return events.some(
    (event, index) =>
      index > 0 && Math.abs(now - event) < 18 * 60 * 60 * 1000
  );
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function smoothstep(min: number, max: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

function rgbaColor(
  color: [number, number, number],
  alpha = 1
) {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

const J2000 = 2451545;

const julianToDate = (julian: number) =>
  new Date((julian + 0.5 - 2440588) * 86400000);

const dateForSolarHour = (hour: number, longitude: number) => {
  const now = new Date();
  const utcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return new Date(utcMidnight + (hour * 60 - longitude * 4) * 60000);
};

// Sunrise / sunset for the current location (SunCalc algorithm, h0 = -0.833°)
function getSunTimes(date: Date, latDeg: number, lonDeg: number) {
  const e = RAD * 23.4397;
  const lw = RAD * -lonDeg;
  const phi = RAD * latDeg;
  const d = toDays(date);

  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = RAD * (357.5291 + 0.98560028 * ds);
  const L =
    M +
    RAD *
      (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) +
    RAD * 102.9372 +
    Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const Jnoon =
    J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

  const h0 = -0.833 * RAD;
  const cosW =
    (Math.sin(h0) - Math.sin(phi) * Math.sin(dec)) /
    (Math.cos(phi) * Math.cos(dec));

  if (!Number.isFinite(cosW) || cosW > 1 || cosW < -1) {
    // Polar day or polar night: no meaningful sunrise/sunset
    return { sunrise: null as Date | null, sunset: null as Date | null };
  }

  const w0 = Math.acos(cosW);
  const Jset = Jnoon + w0 / (2 * Math.PI);
  const Jrise = Jnoon - w0 / (2 * Math.PI);
  return {
    sunrise: julianToDate(Jrise),
    sunset: julianToDate(Jset),
  };
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
  alpha = 1
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgba(${r},${g},${bl},${alpha})`;
}

export const PixelWeatherBackground: React.FC<PixelWeatherBackgroundProps> = ({
  kind,
  enabled,
  theme,
  intensity = 1,
  latitude = 31.23,
  longitude = 121.47,
  windScale = 0,
  previewHour = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = theme === 'dark';
    const PIXEL = 4;

    let cols = 1;
    let rows = 1;
    let rafId = 0;
    let disposed = false;
    let lastTimestamp = 0;

    let rain: RainDrop[] = [];
    let snow: SnowFlake[] = [];
    let clouds: Cloud[] = [];
    let fogBands: FogBand[] = [];
    let fogPuffs: FogPuff[] = [];
    let wind: WindStreak[] = [];
    let motes: Mote[] = [];
    let stars: Star[] = [];
    let bolts: Bolt[] = [];
    let flashes: Flash[] = [];
    let splashes: Splash[] = [];
    let hailPellets: HailPellet[] = [];
    let hailFragments: HailFragment[] = [];
    let sandSpecks: SandSpeck[] = [];
    let hazeSpecks: HazeSpeck[] = [];
    let snowPile: number[] = [];
    let snowMeltAcc = 0;
    let boltQueue: number[] = [];
    let nextStrikeIn = 1200 + Math.random() * 4200;

    let lastSolarCheck = 0;
    let sceneTime =
      previewHour === null
        ? new Date()
        : dateForSolarHour(previewHour, longitude);
    let solar = solarPosition(sceneTime, latitude, longitude);
    let lunar = moonPosition(sceneTime, latitude, longitude);
    let phase = moonPhaseFraction(sceneTime);
    let blueMoon = isBlueMoon(sceneTime);
    let sunTimes = getSunTimes(sceneTime, latitude, longitude);

    const group = (() => {
      if (kind === 'partly' || kind === 'cloud') return 'cloudy';
      return kind;
    })();

    // Weather strength: light drizzle ~ 0.45, extreme rainstorm ~ 2.5
    const strength = Math.max(0.4, Math.min(2.6, intensity));

    // Beaufort wind scale: 0~1 级几乎无风（云基本不动），10 级以上风力拉满
    const windFactor = Math.min(1, Math.max(0, (windScale - 1) / 10));

    // Day or night strictly by local sunrise / sunset, independent of theme
    const isNight = () => {
      if (sunTimes.sunrise && sunTimes.sunset) {
        return sceneTime < sunTimes.sunrise || sceneTime >= sunTimes.sunset;
      }
      return solar.altitude < -0.0083; // polar fallback (h0 = -0.833°)
    };

    const initParticles = () => {
      const area = (cols * rows) / (480 * 270);
      const density = Math.max(0.5, Math.min(2.2, area)) * strength;

      rain = Array.from({ length: Math.round(85 * density) }, () => ({
        x: Math.random() * cols,
        y: Math.random() * rows,
        len:
          2 +
          Math.floor(Math.random() * 3) +
          (strength > 1.5 ? 1 : 0) +
          (strength > 2.1 ? 1 : 0),
        speed: (6 + Math.random() * 6) * (0.72 + 0.22 * strength),
      }));

      // Bigger, brighter, more visible snow; blizzards bias toward large flakes
      snow = Array.from({ length: Math.round(60 * density) }, () => {
        const roll = Math.random();
        const bias = Math.min(0.35, (strength - 1) * 0.25);
        const size =
          roll > 0.72 - bias ? 3 : roll > 0.35 - bias * 0.6 ? 2 : 1;
        return {
          x: Math.random() * cols,
          y: Math.random() * rows,
          size,
          speed:
            (0.9 + Math.random() * 1.5 + size * 0.25) *
            (0.8 + 0.22 * strength),
          phase: Math.random() * Math.PI * 2,
          amp: (0.5 + Math.random() * 2.2) * (1 + (strength - 1) * 0.5),
        };
      });

      // Hail pellets for thunderstorms with hail
      hailPellets = Array.from({ length: Math.round(26 * density) }, () => ({
        x: Math.random() * cols,
        y: Math.random() * rows,
        size: Math.random() > 0.6 ? 2 : 1,
        speed: (9 + Math.random() * 6) * (0.8 + 0.2 * strength),
      }));

      // Sand/dust particles blowing sideways
      sandSpecks = Array.from({ length: Math.round(48 * density) }, () => ({
        x: Math.random() * cols,
        y: Math.random() * rows,
        len: 1 + Math.floor(Math.random() * 3),
        speed: (3 + Math.random() * 6) * (0.7 + 0.35 * strength),
        alpha: 0.25 + Math.random() * 0.45,
      }));

      // Fine haze particles drifting slowly
      hazeSpecks = Array.from({ length: Math.round(34 * density) }, () => ({
        x: Math.random() * cols,
        y: Math.random() * rows,
        speed: 0.12 + Math.random() * 0.35,
        alpha: 0.18 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      }));

      const cloudCount =
        group === 'cloudy'
          ? 6
          : group === 'thunder'
          ? 5
          : group === 'rain'
          ? 4
          : group === 'snow'
          ? 3
          : group === 'wind'
          ? 1
          : 0;
      clouds = Array.from({ length: cloudCount }, () => {
        const roll = Math.random();
        const scale =
          roll > 0.86 ? 4 : roll > 0.55 ? 3 : roll > 0.25 ? 2 : 1;
        return {
          x: Math.random() * cols,
          y: 4 + Math.random() * rows * 0.42,
          scale,
          // Much slower drift; bigger clouds move even slower for parallax depth
          speed: (0.1 + Math.random() * 0.24) / (0.6 + scale * 0.35),
          alpha:
            (0.45 + Math.random() * 0.45) * (scale >= 3 ? 0.82 : 1),
          variant: Math.floor(Math.random() * CLOUD_BLOCKS.length),
          phase: Math.random() * Math.PI * 2,
        };
      });

      fogBands = Array.from({ length: 9 }, (_, i) => ({
        y: Math.floor((rows / 9) * i) + Math.floor(Math.random() * 6),
        h: 4 + Math.floor(Math.random() * 10),
        speed: 0.18 + Math.random() * 0.5,
        dir: Math.random() > 0.5 ? 1 : -1,
        alpha: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        verticalAmp: 1 + Math.random() * 3,
      }));

      fogPuffs = Array.from({ length: Math.round(16 * density) }, () => {
        const maxLife = 5000 + Math.random() * 9000;
        return {
          x: Math.random() * cols,
          y: Math.random() * rows,
          w: 6 + Math.random() * 14,
          h: 3 + Math.random() * 6,
          speed: 0.15 + Math.random() * 0.4,
          dir: Math.random() > 0.5 ? 1 : -1,
          alpha: 0.18 + Math.random() * 0.3,
          life: Math.random() * maxLife,
          maxLife,
        };
      });

      wind = Array.from({ length: Math.round(22 * density) }, () => ({
        x: Math.random() * cols,
        y: Math.random() * rows,
        len: 4 + Math.random() * 10,
        speed: (4 + Math.random() * 7) * (0.7 + 0.3 * strength),
        alpha: 0.35 + Math.random() * 0.55,
      }));

      motes = Array.from({ length: Math.round(24 * density) }, () => ({
        x: Math.random() * cols,
        y: Math.random() * rows,
        speed: 0.15 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      }));

      stars = Array.from({ length: Math.round(70 * density) }, () => ({
        x: Math.random() * cols,
        y: Math.random() * rows * 0.72,
        phase: Math.random() * Math.PI * 2,
        bright: 0.35 + Math.random() * 0.65,
      }));

      splashes = [];
      hailFragments = [];
      snowPile = new Array(cols).fill(0);
      snowMeltAcc = 0;
    };

    const resize = () => {
      cols = Math.max(64, Math.ceil(window.innerWidth / PIXEL));
      rows = Math.max(64, Math.ceil(window.innerHeight / PIXEL));
      canvas.width = cols;
      canvas.height = rows;
      initParticles();
    };

    const drawCloud = (cloud: Cloud, t: number) => {
      const nightFactor = isNight() ? 0.6 : 1;
      const blocks = CLOUD_BLOCKS[cloud.variant];
      const bob = Math.sin(t / 9000 + cloud.phase);
      const baseY = cloud.y + bob;
      ctx.globalAlpha = cloud.alpha * nightFactor;
      for (const [bx, by, bw, bh] of blocks) {
        ctx.fillStyle =
          by < 0
            ? isDark
              ? 'rgba(226,232,240,0.24)'
              : 'rgba(255,255,255,0.55)'
            : isDark
            ? 'rgba(148,163,184,0.26)'
            : 'rgba(100,116,139,0.18)';
        ctx.fillRect(
          Math.round(cloud.x + bx * cloud.scale),
          Math.round(baseY + by * cloud.scale),
          bw * cloud.scale,
          bh * cloud.scale
        );
      }
      ctx.globalAlpha = cloud.alpha * nightFactor * 0.6;
      ctx.fillStyle = isDark ? 'rgba(71,85,105,0.5)' : 'rgba(71,85,105,0.28)';
      ctx.fillRect(
        Math.round(cloud.x + 1 * cloud.scale),
        Math.round(baseY + 3 * cloud.scale),
        9 * cloud.scale,
        1
      );
      ctx.globalAlpha = 1;
    };

    const drawStars = (t: number) => {
      for (const s of stars) {
        const twinkle =
          s.bright * (0.35 + 0.65 * Math.abs(Math.sin(t / 1100 + s.phase)));
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = isDark ? '#E2E8F0' : '#64748B';
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      }
      ctx.globalAlpha = 1;
    };

    // Keep the sun/moon over the side gutters of the centered content column,
    // aligned with the cloud layer height so cards rarely cover it.
    const CONTENT_MAX_WIDTH = 1152; // 72rem content column
    const mapCelestialPosition = (altitude: number, azimuth: number) => {
      const t = Math.max(0, Math.min(1, altitude / (55 * RAD)));
      // Same vertical band as the drifting clouds, never sinking to the card area
      const y = rows * (0.34 - 0.23 * t);

      const desiredX = cols / 2 + (azimuth / Math.PI) * cols * 0.5;
      const contentCols = Math.min(cols, Math.ceil(CONTENT_MAX_WIDTH / PIXEL));
      const marginCols = Math.max(0, (cols - contentCols) / 2);
      const isLeft = azimuth <= 0;

      let x: number;
      if (marginCols >= 12) {
        const leftMin = marginCols * 0.22 + 4;
        const leftMax = Math.max(leftMin + 6, marginCols * 0.92);
        x = isLeft
          ? Math.min(Math.max(desiredX, leftMin), leftMax)
          : Math.min(Math.max(desiredX, cols - leftMax), cols - leftMin);
      } else {
        // Narrow screens: hug the outer edges so the content column covers less of it
        const edgeMax = cols * 0.12;
        x = isLeft
          ? Math.min(Math.max(desiredX, 5), edgeMax)
          : Math.max(Math.min(desiredX, cols - 5), cols - edgeMax);
      }

      return {
        x: Math.max(12, Math.min(cols - 12, x)),
        y: Math.max(rows * 0.1, Math.min(rows * 0.38, y)),
      };
    };

    const drawSun = (t: number) => {
      const { altitude, azimuth } = solar;
      const pos = mapCelestialPosition(altitude, azimuth);
      const cx = Math.round(pos.x);
      const cy = Math.round(pos.y);

      // Sun gets bigger and warmer near the horizon (sunrise / sunset)
      const heightFactor = Math.max(0, Math.min(1, altitude / (35 * RAD)));
      const r = 7.2 + (1 - heightFactor) * 2.4 + Math.sin(t / 1400) * 0.55;
      const coreColor = lerpColor([253, 224, 71], [253, 186, 116], 1 - heightFactor);
      const bodyColor = lerpColor([251, 191, 36], [244, 114, 60], 1 - heightFactor);
      const rayAlpha = 0.55 + 0.25 * heightFactor;

      ctx.fillStyle = bodyColor;
      for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
        for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
          if (x * x + y * y <= r * r) ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
      ctx.fillStyle = coreColor;
      const cr = Math.max(2, Math.round(r * 0.55));
      for (let y = -cr; y <= cr; y++) {
        for (let x = -cr; x <= cr; x++) {
          if (x * x + y * y <= cr * cr) ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }

      // Glow ring near horizon
      if (heightFactor < 0.35) {
        ctx.globalAlpha = 0.35 * (1 - heightFactor / 0.35);
        ctx.fillStyle = 'rgba(251,146,60,0.55)';
        const gr = Math.ceil(r) + 2;
        for (let y = -gr; y <= gr; y++) {
          for (let x = -gr; x <= gr; x++) {
            const d = x * x + y * y;
            if (d > r * r && d <= gr * gr) ctx.fillRect(cx + x, cy + y, 1, 1);
          }
        }
        ctx.globalAlpha = 1;
      }

      // Rotating pixel rays
      const rayCount = 8;
      const rot = t / 4000;
      ctx.globalAlpha = rayAlpha;
      ctx.fillStyle = bodyColor;
      for (let i = 0; i < rayCount; i++) {
        const angle = rot + (i / rayCount) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        for (let step = 0; step < 3; step++) {
          const px = Math.round(cx + dx * (r + 2 + step * 2));
          const py = Math.round(cy + dy * (r + 2 + step * 2));
          ctx.fillRect(px, py, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    };

    const drawMoon = (t: number) => {
      const { altitude, azimuth } = lunar;
      const pos = mapCelestialPosition(altitude, azimuth);
      const cx = Math.round(pos.x);
      const cy = Math.round(pos.y);
      const r = 8.2 + Math.sin(t / 2000) * 0.5;
      const fullness = Math.max(0, 1 - Math.abs(phase - 0.5) * 2);
      const fullMoon = fullness > 0.9;
      const blueFullMoon = fullMoon && blueMoon;
      const litColor = blueFullMoon
        ? '#DBEAFE'
        : fullMoon
          ? '#FECACA'
          : '#F8FAFC';
      const edgeColor = blueFullMoon
        ? '#93C5FD'
        : fullMoon
          ? '#FCA5A5'
          : '#CBD5E1';
      const shadowColor = blueFullMoon
        ? 'rgba(30,64,175,0.32)'
        : fullMoon
          ? 'rgba(127,29,29,0.26)'
          : 'rgba(100,116,139,0.30)';

      if (fullMoon) {
        ctx.globalAlpha = blueFullMoon ? 0.24 : 0.18;
        ctx.fillStyle = blueFullMoon
          ? 'rgba(96,165,250,0.55)'
          : 'rgba(251,113,133,0.48)';
        const glowRadius = Math.ceil(r) + 4;
        for (let y = -glowRadius; y <= glowRadius; y++) {
          for (let x = -glowRadius; x <= glowRadius; x++) {
            const d2 = x * x + y * y;
            if (d2 > r * r && d2 <= glowRadius * glowRadius) {
              ctx.fillRect(cx + x, cy + y, 1, 1);
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // Phase-accurate pixel moon. Lit side flips in the southern hemisphere.
      const hemisphere = latitude >= 0 ? 1 : -1;
      const beta = 2 * Math.PI * phase;
      const sinB = Math.sin(beta);
      const cosB = Math.cos(beta);

      for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
        for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
          const d2 = x * x + y * y;
          if (d2 > r * r) continue;
          const nx = x / r;
          const nz = Math.sqrt(Math.max(0, 1 - (nx * nx + (y * y) / (r * r))));
          const lit = nx * sinB * hemisphere - nz * cosB > 0;
          ctx.fillStyle = lit
            ? Math.abs(x) > r - 2
              ? edgeColor
              : litColor
            : shadowColor;
          ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }

      ctx.fillStyle = fullMoon
        ? blueFullMoon
          ? 'rgba(147,197,253,0.55)'
          : 'rgba(254,202,202,0.55)'
        : 'rgba(148,163,184,0.55)';
      if (phase < 0.5 || phase > 0.85) {
        ctx.fillRect(cx - 2, cy - 1, 1, 1);
      }
      if (phase > 0.15 && phase < 0.85) {
        ctx.fillRect(cx + 1, cy + 1, 2, 1);
      }
    };

    const scheduleStrike = () => {
      // Random frequency: sometimes quick bursts, sometimes long peaceful gaps.
      // Stronger storms strike more often.
      const roll = Math.random();
      const base =
        roll > 0.75
          ? 400 + Math.random() * 1400
          : roll > 0.35
          ? 1500 + Math.random() * 3600
          : 4200 + Math.random() * 7000;
      nextStrikeIn = base / Math.max(0.7, strength);
    };

    const spawnBolt = () => {
      const width = Math.random() > 0.72 ? 2 : 1;
      const startX = Math.floor(cols * (0.06 + Math.random() * 0.88));
      const endY = Math.floor(rows * (0.42 + Math.random() * 0.4));
      const points: Point[] = [];
      let bx = startX;
      let by = Math.floor(rows * 0.04);
      const jitter = width === 2 ? 5 : 3;
      while (by < endY) {
        points.push({ x: bx, y: by });
        bx += Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
        by += 2 + Math.floor(Math.random() * 4);
      }

      // Random branches
      const branches: Point[][] = [];
      const branchCount = Math.random() > 0.6 ? 2 : Math.random() > 0.3 ? 1 : 0;
      for (let i = 0; i < branchCount; i++) {
        const startIdx = Math.floor(points.length * (0.3 + Math.random() * 0.5));
        let px = points[startIdx]?.x ?? bx;
        let py = points[startIdx]?.y ?? by;
        const branchPoints: Point[] = [];
        const steps = 3 + Math.floor(Math.random() * 4);
        const branchDir = Math.random() > 0.5 ? 1 : -1;
        for (let s = 0; s < steps; s++) {
          branchPoints.push({ x: px, y: py });
          px += branchDir * (1 + Math.floor(Math.random() * 3));
          py += 1 + Math.floor(Math.random() * 3);
        }
        branches.push(branchPoints);
      }

      bolts.push({
        points,
        branches,
        width,
        life: 190 + Math.random() * 160,
        maxLife: 350,
      });
      flashes.push({
        life: 240 + Math.random() * 260,
        maxLife: 500,
        intensity: (0.35 + Math.random() * 0.95) * (0.8 + strength * 0.25),
      });
    };

    const draw = (t: number) => {
      const dt = lastTimestamp ? Math.min(48, t - lastTimestamp) : 16.7;
      const f = dt / 16.7;
      lastTimestamp = t;

      // Recompute solar/lunar position periodically (cheap, keeps sun moving with real time)
      if (t - lastSolarCheck > 15000) {
        lastSolarCheck = t;
        sceneTime =
          previewHour === null
            ? new Date()
            : dateForSolarHour(previewHour, longitude);
        solar = solarPosition(sceneTime, latitude, longitude);
        lunar = moonPosition(sceneTime, latitude, longitude);
        phase = moonPhaseFraction(sceneTime);
        blueMoon = isBlueMoon(sceneTime);
        sunTimes = getSunTimes(sceneTime, latitude, longitude);
      }

      const night = isNight();
      const altitudeDeg = solar.altitude / RAD;
      const dayness = smoothstep(-8, 10, altitudeDeg);
      const twilight = Math.max(0, 1 - Math.abs(altitudeDeg) / 10);
      const warmTwilight =
        kind === 'sun' || kind === 'partly' ? twilight : 0;

      const nightTop: [number, number, number] = isDark
        ? [2, 6, 16]
        : [88, 100, 115];
      const nightBottom: [number, number, number] = isDark
        ? [8, 18, 34]
        : [126, 137, 151];
      const dayTop: [number, number, number] = isDark
        ? [17, 39, 68]
        : [219, 239, 252];
      const dayBottom: [number, number, number] = isDark
        ? [8, 19, 35]
        : [245, 250, 255];
      const duskTop: [number, number, number] = isDark
        ? [78, 32, 42]
        : [232, 139, 93];
      const duskBottom: [number, number, number] = isDark
        ? [180, 76, 43]
        : [255, 218, 148];

      let skyTop = mixRgb(nightTop, dayTop, dayness);
      let skyBottom = mixRgb(nightBottom, dayBottom, dayness);
      skyTop = mixRgb(skyTop, duskTop, warmTwilight * 0.82);
      skyBottom = mixRgb(skyBottom, duskBottom, warmTwilight * 0.7);
      const skyAlpha = isDark
        ? 0.45 + (1 - dayness) * 0.38 + warmTwilight * 0.08
        : 0.3 + (1 - dayness) * 0.27 + warmTwilight * 0.08;

      ctx.clearRect(0, 0, cols, rows);
      const skyGradient = ctx.createLinearGradient(0, 0, 0, rows);
      skyGradient.addColorStop(0, rgbaColor(skyTop, skyAlpha));
      skyGradient.addColorStop(
        0.56,
        rgbaColor(mixRgb(skyTop, skyBottom, 0.56), skyAlpha * 0.94)
      );
      skyGradient.addColorStop(1, rgbaColor(skyBottom, skyAlpha * 0.84));
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, cols, rows);

      if (warmTwilight > 0.04) {
        const horizonGlow = ctx.createLinearGradient(
          0,
          rows * 0.32,
          0,
          rows * 0.74
        );
        horizonGlow.addColorStop(
          0,
          `rgba(251,146,60,${0.3 * warmTwilight})`
        );
        horizonGlow.addColorStop(
          1,
          'rgba(253,230,138,0)'
        );
        ctx.fillStyle = horizonGlow;
        ctx.fillRect(0, 0, cols, rows);
      }

      // Weather mood overlay
      const moodAlpha = Math.min(2.2, 0.6 + strength * 0.5);
      let tint: string;
      if (night) {
        tint = isDark
          ? group === 'thunder' || group === 'hail'
            ? 'rgba(15,23,42,0.16)'
            : 'rgba(15,23,42,0.12)'
          : 'rgba(30,41,59,0.05)';
      } else if (group === 'rain' || group === 'thunder') {
        tint = isDark
          ? `rgba(56,189,248,${0.045 * moodAlpha})`
          : `rgba(2,132,199,${0.038 * moodAlpha})`;
      } else if (group === 'hail') {
        tint = isDark
          ? `rgba(148,197,253,${0.05 * moodAlpha})`
          : `rgba(37,99,235,${0.04 * moodAlpha})`;
      } else if (group === 'sleet') {
        tint = isDark
          ? `rgba(186,230,253,${0.05 * moodAlpha})`
          : `rgba(71,85,105,${0.04 * moodAlpha})`;
      } else if (group === 'snow') {
        tint = isDark
          ? `rgba(226,232,240,${0.055 * moodAlpha})`
          : `rgba(148,163,184,${0.05 * moodAlpha})`;
      } else if (group === 'sun') {
        tint = isDark ? 'rgba(251,191,36,0.045)' : 'rgba(245,158,11,0.05)';
      } else if (group === 'fog') {
        tint = isDark
          ? `rgba(148,163,184,${0.055 * moodAlpha})`
          : `rgba(100,116,139,${0.05 * moodAlpha})`;
      } else if (group === 'haze') {
        tint = isDark
          ? `rgba(168,162,158,${0.06 * moodAlpha})`
          : `rgba(120,113,108,${0.055 * moodAlpha})`;
      } else if (group === 'sand') {
        tint = isDark
          ? `rgba(217,119,6,${0.055 * moodAlpha})`
          : `rgba(180,83,9,${0.05 * moodAlpha})`;
      } else if (group === 'wind') {
        tint = isDark ? 'rgba(125,211,252,0.045)' : 'rgba(2,132,199,0.035)';
      } else {
        tint = isDark ? 'rgba(148,163,184,0.045)' : 'rgba(100,116,139,0.04)';
      }

      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, cols, rows);

      if (night) {
        drawStars(t);
      }

      if (kind === 'sun' || kind === 'partly') {
        if (night) {
          if (lunar.altitude > 0.03) drawMoon(t);
        } else {
          drawSun(t);
        }
      }

      // Floating light motes: fireflies at night, dust in the day
      if (kind === 'sun' || kind === 'partly') {
        for (const m of motes) {
          m.y -= m.speed * f;
          m.x += windFactor * 0.8 * f;
          if (m.y < -1) m.y = rows + 1;
          if (m.x > cols + 2) m.x = -2;
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t / 900 + m.phase));
          ctx.globalAlpha = twinkle * (night ? 0.85 : 0.6);
          ctx.fillStyle = night ? '#A5F3FC' : '#FCD34D';
          ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
        }
        ctx.globalAlpha = 1;
      }

      if (clouds.length > 0) {
        // Clouds barely move in calm air and speed up as the wind rises
        const cloudWindMul = 0.1 + windFactor * 2.6;
        for (const c of clouds) {
          c.x += c.speed * cloudWindMul * f;
          const wrapWidth = 16 * c.scale;
          if (c.x > cols + wrapWidth) c.x = -wrapWidth;
          drawCloud(c, t);
        }
      }

      if (group === 'rain' || group === 'thunder' || group === 'hail' || group === 'sleet') {
        ctx.fillStyle = isDark
          ? 'rgba(56,189,248,0.5)'
          : 'rgba(2,132,199,0.32)';
        const rainStep = group === 'sleet' ? 2 : 1;
        const splashCap = Math.round(45 + strength * 40);
        const splashChance = Math.min(0.92, 0.22 + strength * 0.26);
        const bigSplashBias = Math.max(0.35, 0.75 - strength * 0.15);
        // Wind pushes rain sideways: stronger wind = more slanted streaks
        const rainDriftX = windFactor * 2.6;
        const rainSlant = windFactor * 1.2;
        for (let i = 0; i < rain.length; i += rainStep) {
          const d = rain[i];
          d.y += d.speed * f;
          d.x += rainDriftX * f;
          if (d.x > cols + 4) d.x = -4;
          if (d.x < -4) d.x = cols + 4;
          if (d.y > rows) {
            // Splash size/frequency grows with rainfall strength
            if (splashes.length < splashCap && Math.random() < splashChance) {
              splashes.push({
                x: d.x,
                y: rows - 1,
                life: 150 + Math.random() * 130,
                maxLife: 280,
                size: Math.random() > bigSplashBias ? 2 : 1,
              });
            }
            d.y = -d.len - Math.random() * 6;
            d.x = Math.random() * cols;
          }
          if (rainSlant > 0.15) {
            // Pixel-stepped diagonal streaks when blown by wind
            for (let k = 0; k < d.len; k++) {
              ctx.fillRect(
                Math.round(d.x + rainSlant * k),
                Math.round(d.y - k),
                1,
                1
              );
            }
          } else {
            ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, d.len);
          }
        }

        // Hail pellets (fast, bright, shattering into flying ice on impact)
        if (group === 'hail') {
          const hailSplashChance = Math.min(0.9, 0.2 + strength * 0.28);
          for (const p of hailPellets) {
            p.y += p.speed * f;
            if (p.y > rows) {
              // Shatter into pixel fragments that bounce up to a visible height
              if (hailFragments.length < 260) {
                const pieceCount = 3 + Math.floor(Math.random() * 4);
                const power = 1 + (strength - 1) * 0.22;
                for (let k = 0; k < pieceCount; k++) {
                  hailFragments.push({
                    x: p.x + (Math.random() - 0.5) * 2,
                    y: rows - 1,
                    vx:
                      (Math.random() > 0.5 ? 1 : -1) *
                        (0.3 + Math.random() * 1.4) +
                      windFactor * 1.2,
                    vy: -(1.1 + Math.random() * 1.8) * power,
                    size: Math.random() > 0.62 ? 2 : 1,
                    life: 420 + Math.random() * 340,
                    maxLife: 760,
                  });
                }
              }
              if (
                splashes.length < splashCap + 30 &&
                Math.random() < hailSplashChance
              ) {
                splashes.push({
                  x: p.x,
                  y: rows - 1,
                  life: 130 + Math.random() * 110,
                  maxLife: 240,
                  size: 2,
                });
              }
              p.y = -p.size - Math.random() * 8;
              p.x = Math.random() * cols;
            }
            const x = Math.round(p.x);
            const y = Math.round(p.y);
            ctx.fillStyle = isDark
              ? 'rgba(224,242,254,0.95)'
              : 'rgba(37,99,235,0.75)';
            ctx.fillRect(x, y, p.size, p.size);
            ctx.fillStyle = isDark
              ? 'rgba(255,255,255,0.75)'
              : 'rgba(147,197,253,0.8)';
            ctx.fillRect(x, y, 1, 1);
          }
          ctx.fillStyle = isDark
            ? 'rgba(56,189,248,0.5)'
            : 'rgba(2,132,199,0.32)';
        }

        // Subtle expanding pixel splashes at the very bottom
        splashes = splashes.filter((s) => s.life > 0);
        for (const s of splashes) {
          s.life -= dt;
          const fade = Math.max(0, s.life / s.maxLife);
          const spread = Math.round((1 - fade) * (s.size + 2));
          ctx.globalAlpha = fade * 0.45;
          ctx.fillStyle = isDark
            ? 'rgba(125,211,252,1)'
            : 'rgba(2,132,199,1)';
          ctx.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 1);
          ctx.fillRect(Math.round(s.x) - spread, Math.round(s.y), 1, 1);
          ctx.fillRect(Math.round(s.x) + spread, Math.round(s.y), 1, 1);
          if (s.size >= 2) {
            ctx.fillRect(Math.round(s.x) - spread + 1, Math.round(s.y), 1, 1);
            ctx.fillRect(Math.round(s.x) + spread - 1, Math.round(s.y), 1, 1);
          }
        }
        ctx.globalAlpha = 1;

        // Shattered ice fragments flying up after each hail impact
        if (group === 'hail') {
          hailFragments = hailFragments.filter(
            (frag) => frag.life > 0 && frag.y < rows
          );
          for (const frag of hailFragments) {
            frag.life -= dt;
            frag.vy += 0.11 * f; // gravity pulls the pieces back down
            frag.x += frag.vx * f;
            frag.y += frag.vy * f;
            const fade = Math.max(0, frag.life / frag.maxLife);
            ctx.globalAlpha = Math.min(1, 0.4 + fade);
            ctx.fillStyle = isDark
              ? 'rgba(224,242,254,0.95)'
              : 'rgba(37,99,235,0.72)';
            ctx.fillRect(
              Math.round(frag.x),
              Math.round(frag.y),
              frag.size,
              frag.size
            );
            // Tiny bright ice core
            ctx.fillStyle = isDark ? '#FFFFFF' : '#93C5FD';
            ctx.fillRect(Math.round(frag.x), Math.round(frag.y), 1, 1);
          }
          ctx.globalAlpha = 1;
        }
      }

      if (group === 'snow' || group === 'sleet') {
        const snowStep = group === 'sleet' ? 2 : 1;
        const maxPile = Math.max(2, Math.round(1 + strength * 2));
        const accumulateChance = Math.min(0.9, 0.3 + strength * 0.2);
        const spreadChance = Math.min(0.65, 0.2 + strength * 0.16);
        for (let i = 0; i < snow.length; i += snowStep) {
          const s = snow[i];
          s.y += s.speed * f;
          if (s.y > rows + 3) {
            // Snow builds up faster and thicker in heavier snowfall
            const col = Math.max(0, Math.min(cols - 1, Math.round(s.x)));
            if (Math.random() < accumulateChance && snowPile[col] < maxPile) {
              snowPile[col] += 1;
              if (Math.random() < spreadChance) {
                const side = Math.random() > 0.5 ? -1 : 1;
                const sideCol = col + side;
                if (
                  sideCol >= 0 &&
                  sideCol < cols &&
                  snowPile[sideCol] < maxPile
                ) {
                  snowPile[sideCol] += 1;
                }
              }
            }
            s.y = -3;
            s.x = Math.random() * cols;
          }
          const sway = s.amp * (1 - 0.55 * windFactor);
          const drift = Math.sin(t / 1300 + s.phase) * sway;
          s.x += windFactor * 2.3 * f;
          if (s.x > cols + 4) s.x = -4;
          const x = Math.round(s.x + drift);
          const y = Math.round(s.y);

          // Soft halo for larger flakes
          if (s.size >= 2) {
            ctx.globalAlpha = isDark ? 0.22 : 0.14;
            ctx.fillStyle = isDark ? '#E0F2FE' : '#64748B';
            ctx.fillRect(x - 1, y - 1, s.size + 2, s.size + 2);
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = isDark
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(71,85,105,0.75)';
          ctx.fillRect(x, y, s.size, s.size);
          // Cross arms make bigger flakes read as snowflakes
          if (s.size >= 3) {
            ctx.fillStyle = isDark
              ? 'rgba(226,232,240,0.9)'
              : 'rgba(100,116,139,0.7)';
            ctx.fillRect(x + 1, y - 1, 1, 1);
            ctx.fillRect(x + 1, y + s.size, 1, 1);
            ctx.fillRect(x - 1, y + 1, 1, 1);
            ctx.fillRect(x + s.size, y + 1, 1, 1);
          }
        }

        // Slow melt so the snow line keeps changing a little
        snowMeltAcc += dt;
        if (snowMeltAcc > 800) {
          snowMeltAcc = 0;
          for (let i = 0; i < 6; i++) {
            const col = Math.floor(Math.random() * cols);
            if (snowPile[col] > 0) snowPile[col] -= 1;
          }
        }

        // Draw accumulated snow along the bottom (only for pure snow, not sleet)
        if (group === 'snow') {
          ctx.globalAlpha = isDark ? 0.85 : 0.6;
          ctx.fillStyle = isDark ? '#F8FAFC' : '#94A3B8';
          for (let col = 0; col < cols; col++) {
            const h = snowPile[col];
            if (h > 0) ctx.fillRect(col, rows - h, 1, h);
          }
          // Faint bright crest on top of the pile
          ctx.globalAlpha = isDark ? 0.5 : 0.35;
          ctx.fillStyle = isDark ? '#FFFFFF' : '#CBD5E1';
          for (let col = 0; col < cols; col++) {
            const h = snowPile[col];
            if (h > 0) ctx.fillRect(col, rows - h, 1, 1);
          }
          ctx.globalAlpha = 1;
        }
      }

      if (group === 'fog' || group === 'haze' || group === 'sand') {
        const isHaze = group === 'haze';
        const isSand = group === 'sand';
        const fogColor = isSand
          ? isDark
            ? 'rgba(217,119,6,0.12)'
            : 'rgba(180,83,9,0.10)'
          : isHaze
          ? isDark
            ? 'rgba(168,162,158,0.11)'
            : 'rgba(120,113,108,0.10)'
          : isDark
          ? 'rgba(148,163,184,0.10)'
          : 'rgba(100,116,139,0.09)';
        const fogAlphaScale = Math.min(1.9, 0.55 + strength * 0.55);

        // Drifting bands with vertical bobbing and breathing alpha
        // (strong wind blows the fog faster and thins it out)
        const fogWindSpeed = 1 + windFactor * 1.8;
        const fogWindThin = 1 - windFactor * 0.3;
        for (let i = 0; i < fogBands.length; i++) {
          const band = fogBands[i];
          const offset =
            (t * band.speed * 0.05 * band.dir * fogWindSpeed) % cols;
          const bob = Math.sin(t / 2600 + band.phase) * band.verticalAmp;
          const breathe = 0.65 + 0.35 * Math.sin(t / 2200 + band.phase * 1.7);
          ctx.globalAlpha = Math.min(
            1,
            band.alpha * breathe * 0.95 * fogAlphaScale * fogWindThin
          );
          ctx.fillStyle = fogColor;
          for (let dy = 0; dy < band.h; dy++) {
            const ox =
              Math.floor(offset + dy * 3 * band.dir + i * 11) % cols;
            ctx.fillRect(
              ox - cols,
              Math.round(band.y + dy + bob),
              cols * 2,
              1
            );
          }
        }
        // Billowing fog puffs fading in and out
        for (const puff of fogPuffs) {
          puff.life += dt;
          if (puff.life > puff.maxLife) {
            puff.life = 0;
            puff.maxLife = 5000 + Math.random() * 9000;
            puff.y = Math.random() * rows;
            puff.w = 6 + Math.random() * 14;
            puff.h = 3 + Math.random() * 6;
            puff.alpha = 0.18 + Math.random() * 0.3;
            puff.speed = 0.15 + Math.random() * 0.4;
            puff.dir = Math.random() > 0.5 ? 1 : -1;
            puff.x = puff.dir > 0 ? -puff.w : cols + puff.w;
          }
          puff.x += puff.speed * puff.dir * f;
          const progress = puff.life / puff.maxLife;
          const envelope = Math.sin(Math.PI * progress);
          const wy = puff.y + Math.sin(t / 3400 + puff.life / 2200) * 2;
          ctx.globalAlpha = Math.min(
            1,
            puff.alpha * envelope * fogAlphaScale
          );
          ctx.fillStyle = fogColor;
          ctx.fillRect(
            Math.round(puff.x),
            Math.round(wy),
            puff.w,
            puff.h
          );
          ctx.fillRect(
            Math.round(puff.x + 1),
            Math.round(wy - 1),
            Math.max(2, puff.w - 2),
            puff.h + 2
          );
        }
        ctx.globalAlpha = 1;
      }

      // Haze: fine dust specks drifting slowly through the grey-yellow air
      if (group === 'haze') {
        ctx.fillStyle = isDark
          ? 'rgba(214,211,209,0.5)'
          : 'rgba(87,83,78,0.4)';
        for (const speck of hazeSpecks) {
          speck.x += speck.speed * f;
          if (speck.x > cols + 2) {
            speck.x = -2;
            speck.y = Math.random() * rows;
          }
          const flicker =
            0.5 + 0.5 * Math.abs(Math.sin(t / 1600 + speck.phase));
          ctx.globalAlpha = speck.alpha * flicker * Math.min(1.6, 0.6 + strength * 0.5);
          ctx.fillRect(Math.round(speck.x), Math.round(speck.y), 1, 1);
        }
        ctx.globalAlpha = 1;
      }

      // Sandstorm: horizontal sand streaks + dust specks blowing across
      if (group === 'sand') {
        const sandColor = isDark
          ? 'rgba(251,191,36,0.5)'
          : 'rgba(180,83,9,0.42)';
        for (const speck of sandSpecks) {
          speck.x += speck.speed * (0.6 + windFactor * 1.5) * f;
          if (speck.x - speck.len > cols) {
            speck.x = -speck.len;
            speck.y = Math.random() * rows;
          }
          ctx.globalAlpha = speck.alpha * Math.min(1.6, 0.6 + strength * 0.5);
          ctx.fillStyle = sandColor;
          ctx.fillRect(
            Math.round(speck.x - speck.len),
            Math.round(speck.y),
            speck.len,
            1
          );
        }
        ctx.globalAlpha = 1;
      }

      if (group === 'wind') {
        const windKindSpeed = 0.7 + Math.max(windFactor, 0.35) * 1.8;
        for (const w of wind) {
          w.x += w.speed * windKindSpeed * f;
          if (w.x - w.len > cols) {
            w.x = -w.len;
            w.y = Math.random() * rows;
          }
          ctx.globalAlpha = w.alpha;
          ctx.fillStyle = isDark
            ? 'rgba(125,211,252,0.42)'
            : 'rgba(2,132,199,0.26)';
          ctx.fillRect(
            Math.round(w.x - w.len),
            Math.round(w.y),
            Math.round(w.len),
            1
          );
        }
        ctx.globalAlpha = 1;
      }

      if (group === 'thunder' || group === 'hail') {
        nextStrikeIn -= dt;
        if (nextStrikeIn <= 0) {
          spawnBolt();
          // Random follow-up strikes within the same storm burst
          if (Math.random() > 0.55 - Math.min(0.25, strength * 0.1)) {
            const extra =
              1 + Math.floor(Math.random() * (strength > 1.6 ? 4 : 3));
            for (let i = 0; i < extra; i++) {
              boltQueue.push(120 + Math.random() * 620);
            }
          }
          scheduleStrike();
        }

        if (boltQueue.length > 0) {
          boltQueue = boltQueue.map((delay) => delay - dt);
          const ready = boltQueue.filter((d) => d <= 0).length;
          if (ready > 0) {
            for (let i = 0; i < ready; i++) spawnBolt();
            boltQueue = boltQueue.filter((d) => d > 0);
          }
        }

        // Draw lingering bolts
        bolts = bolts.filter((bolt) => bolt.life > 0);
        for (const bolt of bolts) {
          bolt.life -= dt;
          const fade = Math.max(0, bolt.life / bolt.maxLife);
          ctx.globalAlpha = Math.min(1, fade * 1.6);
          ctx.fillStyle = 'rgba(251,191,36,0.35)';
          for (const p of bolt.points) {
            ctx.fillRect(p.x - 1, p.y - 1, bolt.width + 3, bolt.width + 3);
          }
          ctx.fillStyle = '#FDE047';
          for (const p of bolt.points) {
            ctx.fillRect(p.x, p.y, bolt.width, bolt.width);
          }
          for (const branch of bolt.branches) {
            ctx.fillStyle = '#FEF9C3';
            for (const p of branch) {
              ctx.fillRect(p.x, p.y, bolt.width, bolt.width);
            }
          }
          ctx.globalAlpha = 1;
        }

        // Layered flashes (double-flash feel from overlapping entries)
        flashes = flashes.filter((flash) => flash.life > 0);
        if (flashes.length > 0) {
          let alpha = 0;
          for (const flash of flashes) {
            flash.life -= dt;
            alpha += Math.max(0, flash.life / flash.maxLife) * flash.intensity;
          }
          ctx.globalAlpha = Math.min(0.55, alpha);
          ctx.fillStyle = isDark
            ? 'rgba(226,232,240,1)'
            : 'rgba(255,255,255,1)';
          ctx.fillRect(0, 0, cols, rows);
          ctx.globalAlpha = 1;
        }
      }
    };

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion) {
      draw(0);
    } else {
      const loop = (t: number) => {
        if (disposed) return;
        if (!document.hidden) draw(t);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [
    kind,
    enabled,
    theme,
    intensity,
    latitude,
    longitude,
    windScale,
    previewHour,
  ]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
