import React from 'react';

interface FriendAvatarProps {
  seed: number;
  className?: string;
  title?: string;
}

const PALETTES = [
  ['#0284C7', '#38BDF8', '#E0F2FE'],
  ['#7C3AED', '#C4B5FD', '#EDE9FE'],
  ['#DB2777', '#F9A8D4', '#FCE7F3'],
  ['#059669', '#6EE7B7', '#D1FAE5'],
  ['#D97706', '#FCD34D', '#FEF3C7'],
  ['#DC2626', '#FCA5A5', '#FEE2E2'],
  ['#0891B2', '#67E8F9', '#CFFAFE'],
  ['#4F46E5', '#A5B4FC', '#E0E7FF'],
] as const;

function mixSeed(seed: number, salt: number) {
  let value = (Math.abs(Math.floor(seed)) ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b) >>> 0;
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function buildCells(seed: number) {
  const cells: { x: number; y: number; color: string }[] = [];
  const palette = PALETTES[mixSeed(seed, 11) % PALETTES.length];
  let filled = 0;

  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const noise = mixSeed(seed, x * 37 + y * 61 + 23);
      if (noise % 100 >= 54) {
        const color = noise % 5 === 0 ? palette[1] : palette[0];
        cells.push({ x: x + 1, y: y + 1, color });
        if (x !== 6 - x) {
          cells.push({ x: 6 - x + 1, y: y + 1, color });
        }
        filled += 1;
      }
    }
  }

  if (filled < 3) {
    cells.push({ x: 4, y: 4, color: palette[0] });
  }

  return { cells, background: palette[2], border: palette[0] };
}

export const FriendAvatar: React.FC<FriendAvatarProps> = ({
  seed,
  className = '',
  title,
}) => {
  const { cells, background, border } = buildCells(seed);

  return (
    <svg
      viewBox="0 0 9 9"
      className={`h-full w-full ${className}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title ?? `友链头像 ${seed}`}
    >
      <rect width="9" height="9" fill={background} />
      <rect
        x="0.35"
        y="0.35"
        width="8.3"
        height="8.3"
        fill="none"
        stroke={border}
        strokeOpacity="0.28"
        strokeWidth="0.3"
      />
      {cells.map((cell, index) => (
        <rect
          key={`${cell.x}-${cell.y}-${index}`}
          x={cell.x}
          y={cell.y}
          width="1"
          height="1"
          fill={cell.color}
        />
      ))}
    </svg>
  );
};
