'use client';

import React, { useEffect, useRef } from 'react';

const SPLASH_CLASS = 'pixel-splash-pending';
const FILL_DURATION = 4000;
const BURST_DURATION = 4000;
const TOTAL_DURATION = FILL_DURATION + BURST_DURATION;

const CYAN_HUES = [188, 191, 194, 197, 200, 204, 208];
const PINK_HUES = [318, 322, 326, 330, 334, 338, 342];
const ACCENT_HUES = [214, 226, 268, 280, 158, 170];
const LOADING_PALETTE = [
  { color: '#FFFFFF', outline: '#000000' },
  { color: '#FFEE44', outline: '#000000' },
  { color: '#222222', outline: '#FFFFFF' },
  { color: '#00DDFF', outline: '#000000' },
  { color: '#992288', outline: '#FFFFFF' },
];

const LOADING_GLYPHS: Record<string, string[]> = {
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
};

interface SplashShard {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  entryX: number;
  entryY: number;
  entryRotation: number;
  fillDelay: number;
  fillDuration: number;
  burstDelay: number;
  color: string;
  accent: string;
  outline: string | null;
  accentX: number;
  accentY: number;
  accentSize: number;
  trail: boolean;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createShardColor(isDark: boolean) {
  const roll = Math.random();
  const hues =
    roll < 0.38 ? CYAN_HUES : roll < 0.76 ? PINK_HUES : ACCENT_HUES;
  const hue =
    hues[Math.floor(Math.random() * hues.length)] + randomBetween(-3, 3);
  const isCyan = hue >= 180 && hue < 230;
  const saturation = isDark ? randomBetween(48, 66) : randomBetween(56, 74);
  const lightness = isDark
    ? isCyan
      ? randomBetween(26, 38)
      : randomBetween(22, 36)
    : isCyan
      ? randomBetween(68, 82)
      : randomBetween(56, 70);
  const accentLightness = isDark
    ? Math.min(50, lightness + 8)
    : Math.max(44, lightness - 10);

  return {
    color: `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`,
    accent: `hsl(${hue.toFixed(1)} ${Math.min(82, saturation + 8).toFixed(1)}% ${accentLightness.toFixed(1)}%)`,
  };
}

function createEntry(width: number, height: number) {
  const edge = Math.floor(Math.random() * 4);
  const outside = randomBetween(24, 140);
  let entryX = 0;
  let entryY = 0;

  if (edge === 0) {
    entryX = Math.random() * width;
    entryY = -outside;
  } else if (edge === 1) {
    entryX = width + outside;
    entryY = Math.random() * height;
  } else if (edge === 2) {
    entryX = Math.random() * width;
    entryY = height + outside;
  } else {
    entryX = -outside;
    entryY = Math.random() * height;
  }

  return {
    entryX,
    entryY,
    entryRotation:
      (Math.random() < 0.5 ? -1 : 1) *
      randomBetween(Math.PI * 0.55, Math.PI * 1.8),
  };
}

function createMotion(
  width: number,
  height: number,
  centerX: number,
  centerY: number
) {
  const offsetX = centerX - width / 2;
  const offsetY = centerY - height / 2;
  const distance = Math.hypot(offsetX, offsetY);
  const diagonal = Math.hypot(width, height);
  const normalizedDistance = Math.min(
    1,
    distance / Math.max(1, diagonal / 2)
  );
  const baseAngle =
    distance < 4 ? Math.random() * Math.PI * 2 : Math.atan2(offsetY, offsetX);
  const angle = baseAngle + randomBetween(-0.18, 0.18);
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const edgeX =
    directionX > 0.001
      ? (width - centerX) / directionX
      : directionX < -0.001
        ? -centerX / directionX
        : Infinity;
  const edgeY =
    directionY > 0.001
      ? (height - centerY) / directionY
      : directionY < -0.001
        ? -centerY / directionY
        : Infinity;
  const travel = Math.max(
    140,
    Math.min(edgeX, edgeY) + randomBetween(40, 240)
  );

  return {
    vx: directionX * travel,
    vy: directionY * travel + randomBetween(0, 50),
    burstDelay: 80 + normalizedDistance * 900 + randomBetween(0, 220),
  };
}

function scheduleFill(
  shards: SplashShard[],
  fillSpan = FILL_DURATION - 820
) {
  for (let i = shards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shards[i], shards[j]] = [shards[j], shards[i]];
  }

  shards.forEach((shard, index) => {
    const fillDuration = randomBetween(460, 760);
    const slot =
      (index / Math.max(1, shards.length - 1)) * fillSpan +
      randomBetween(-20, 20);
    shard.fillDuration = fillDuration;
    shard.fillDelay = Math.max(
      0,
      Math.min(FILL_DURATION - fillDuration, slot)
    );
  });
}

function createShards(width: number, height: number, isDark: boolean) {
  const shards: SplashShard[] = [];
  const cell = Math.max(
    14,
    Math.min(46, Math.sqrt((width * height) / 3200))
  );

  let y = 0;
  while (y < height) {
    const rowHeight = Math.min(
      height - y,
      Math.max(7, Math.round(cell * randomBetween(0.7, 1.35)))
    );
    let x = 0;

    while (x < width) {
      const shardWidth = Math.min(
        width - x,
        Math.max(7, Math.round(cell * randomBetween(0.65, 1.45)))
      );
      const centerX = x + shardWidth / 2;
      const centerY = y + rowHeight / 2;
      const entry = createEntry(width, height);
      const motion = createMotion(width, height, centerX, centerY);
      const { color, accent } = createShardColor(isDark);
      const accentSize = Math.max(
        2,
        Math.round(Math.min(shardWidth, rowHeight) * randomBetween(0.18, 0.3))
      );

      shards.push({
        x,
        y,
        w: shardWidth,
        h: rowHeight,
        vx: motion.vx,
        vy: motion.vy,
        entryX: entry.entryX,
        entryY: entry.entryY,
        entryRotation: entry.entryRotation,
        fillDelay: 0,
        fillDuration: 1,
        burstDelay: motion.burstDelay,
        color,
        accent,
        outline: null,
        accentX: Math.max(
          1,
          Math.round(randomBetween(1, shardWidth - accentSize - 1))
        ),
        accentY: Math.max(
          1,
          Math.round(randomBetween(1, rowHeight - accentSize - 1))
        ),
        accentSize,
        trail: Math.random() > 0.68,
      });

      x += shardWidth;
    }

    y += rowHeight;
  }

  scheduleFill(shards);
  return shards;
}

function createLoadingShards(width: number, height: number) {
  const shards: SplashShard[] = [];
  const word = 'LOADING';
  const letterWidth = 5;
  const letterGap = 1;
  const columns = word.length * letterWidth + (word.length - 1) * letterGap;
  const rows = 7;
  const cell = Math.max(
    5,
    Math.min(
      14,
      Math.floor(Math.min((width * 0.72) / columns, (height * 0.22) / rows))
    )
  );
  const startX = Math.floor((width - columns * cell) / 2);
  const startY = Math.floor((height - rows * cell) / 2);

  word.split('').forEach((letter, letterIndex) => {
    const pattern = LOADING_GLYPHS[letter];
    if (!pattern) return;
    const palette = LOADING_PALETTE[letterIndex % LOADING_PALETTE.length];

    pattern.forEach((row, rowIndex) => {
      row.split('').forEach((value, columnIndex) => {
        if (value !== '1') return;

        const x =
          startX +
          (letterIndex * (letterWidth + letterGap) + columnIndex) * cell;
        const y = startY + rowIndex * cell;
        const centerX = x + cell / 2;
        const centerY = y + cell / 2;
        const entry = createEntry(width, height);
        const motion = createMotion(width, height, centerX, centerY);

        shards.push({
          x,
          y,
          w: cell,
          h: cell,
          vx: motion.vx,
          vy: motion.vy,
          entryX: entry.entryX,
          entryY: entry.entryY,
          entryRotation: entry.entryRotation,
          fillDelay: 0,
          fillDuration: 1,
          burstDelay: motion.burstDelay,
          color: palette.color,
          accent: palette.color,
          outline: palette.outline,
          accentX: 0,
          accentY: 0,
          accentSize: 0,
          trail: false,
        });
      });
    });
  });

  scheduleFill(shards, 2050);
  return shards;
}

function drawShard(
  context: CanvasRenderingContext2D,
  shard: SplashShard,
  elapsed: number
) {
  const filling = elapsed < FILL_DURATION;

  if (filling) {
    const local = (elapsed - shard.fillDelay) / shard.fillDuration;
    if (local <= 0) return;

    const progress = Math.min(1, local);

    if (progress >= 1) {
      context.globalAlpha = 1;
      if (shard.outline) {
        context.fillStyle = shard.outline;
        context.fillRect(
          shard.x - 1,
          shard.y - 1,
          shard.w + 2,
          shard.h + 2
        );
      }
      context.fillStyle = shard.color;
      context.fillRect(shard.x, shard.y, shard.w, shard.h);
      if (shard.accentSize > 0) {
        context.fillStyle = shard.accent;
        context.fillRect(
          shard.x + shard.accentX,
          shard.y + shard.accentY,
          shard.accentSize,
          shard.accentSize
        );
      }
      return;
    }

    const eased = 1 - Math.pow(1 - progress, 3);
    const targetX = shard.x + shard.w / 2;
    const targetY = shard.y + shard.h / 2;
    const x = shard.entryX + (targetX - shard.entryX) * eased;
    const y = shard.entryY + (targetY - shard.entryY) * eased;
    const rotation = shard.entryRotation * (1 - eased);
    const scale = 0.55 + 0.45 * eased;
    const alpha = Math.min(1, progress * 4);
    const shardWidth = shard.w * scale;
    const shardHeight = shard.h * scale;
    const accentSize = Math.max(1, shard.accentSize * scale);

    context.save();
    context.globalAlpha = alpha;
    context.translate(x, y);
    context.rotate(rotation);
    if (shard.outline) {
      context.fillStyle = shard.outline;
      context.fillRect(
        -shardWidth / 2 - 1,
        -shardHeight / 2 - 1,
        shardWidth + 2,
        shardHeight + 2
      );
    }
    context.fillStyle = shard.color;
    context.fillRect(
      -shardWidth / 2,
      -shardHeight / 2,
      shardWidth,
      shardHeight
    );
    if (shard.accentSize > 0) {
      context.fillStyle = shard.accent;
      context.fillRect(
        -shardWidth / 2 + shard.accentX * scale,
        -shardHeight / 2 + shard.accentY * scale,
        Math.min(accentSize, shardWidth),
        Math.min(accentSize, shardHeight)
      );
    }
    context.restore();
    return;
  }

  const burstElapsed = elapsed - FILL_DURATION - shard.burstDelay;
  const burstLength = BURST_DURATION - shard.burstDelay;
  const progress = Math.max(0, Math.min(1, burstElapsed / burstLength));
  if (progress >= 1) return;

  const eased =
    progress < 0.5
      ? 4 * Math.pow(progress, 3)
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  const alpha =
    progress < 0.7 ? 1 : Math.max(0, 1 - (progress - 0.7) / 0.3);
  const scale = 1 - 0.52 * Math.pow(progress, 1.1);
  const x = Math.round(shard.x + shard.vx * eased);
  const y = Math.round(shard.y + shard.vy * eased);
  const shardWidth = Math.max(1, Math.round(shard.w * scale));
  const shardHeight = Math.max(1, Math.round(shard.h * scale));

  if (shard.trail && progress > 0.04 && progress < 0.82) {
    const trailProgress = 1 - Math.pow(1 - progress * 0.84, 3);
    const trailX = Math.round(shard.x + shard.vx * trailProgress);
    const trailY = Math.round(shard.y + shard.vy * trailProgress);
    context.globalAlpha = alpha * 0.14;
    context.fillStyle = shard.color;
    context.fillRect(
      trailX,
      trailY,
      Math.max(1, Math.round(shardWidth * 0.58)),
      Math.max(1, Math.round(shardHeight * 0.58))
    );
  }

  context.globalAlpha = alpha;
  if (shard.outline) {
    context.fillStyle = shard.outline;
    context.fillRect(x - 1, y - 1, shardWidth + 2, shardHeight + 2);
  }
  context.fillStyle = shard.color;
  context.fillRect(x, y, shardWidth, shardHeight);

  if (shard.accentSize > 0) {
    const accentSize = Math.max(1, Math.round(shard.accentSize * scale));
    const accentX = x + Math.round(shard.accentX * scale);
    const accentY = y + Math.round(shard.accentY * scale);
    context.fillStyle = shard.accent;
    context.fillRect(
      accentX,
      accentY,
      Math.min(accentSize, shardWidth),
      Math.min(accentSize, shardHeight)
    );
  }
}

function drawSplash(
  context: CanvasRenderingContext2D,
  shards: SplashShard[],
  loadingShards: SplashShard[],
  elapsed: number,
  width: number,
  height: number
) {
  context.clearRect(0, 0, width, height);

  for (const shard of shards) {
    drawShard(context, shard, elapsed);
  }
  for (const shard of loadingShards) {
    drawShard(context, shard, elapsed);
  }

  context.globalAlpha = 1;
}

export const PixelSplash: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains(SPLASH_CLASS)) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.remove(SPLASH_CLASS);
      return;
    }

    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!overlay || !canvas || !context) {
      root.classList.remove(SPLASH_CLASS);
      return;
    }

    let animationFrame = 0;
    let stopped = false;
    let fallbackTimer = 0;

    const finish = () => {
      if (stopped) return;
      stopped = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      root.classList.remove(SPLASH_CLASS);
    };

    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = false;

    const isDark = root.classList.contains('dark');
    overlay.style.backgroundColor = isDark ? '#000000' : '#ffffff';
    overlay.dataset.phase = 'fill';

    const shards = createShards(width, height, isDark);
    const loadingShards = createLoadingShards(width, height);
    if (shards.length === 0) {
      finish();
      return;
    }

    const startedAt = performance.now();
    fallbackTimer = window.setTimeout(finish, TOTAL_DURATION + 200);

    const tick = (now: number) => {
      if (stopped) return;

      const elapsed = now - startedAt;
      if (elapsed >= TOTAL_DURATION) {
        finish();
        return;
      }

      if (elapsed >= FILL_DURATION && overlay.dataset.phase !== 'burst') {
        overlay.style.backgroundColor = 'transparent';
        overlay.dataset.phase = 'burst';
      }

      drawSplash(context, shards, loadingShards, elapsed, width, height);
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    window.addEventListener('resize', finish, { once: true });

    return () => {
      stopped = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', finish);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="pixel-splash fixed inset-0 z-[300] overflow-hidden"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
};
