import React, { useRef, useState } from 'react';

interface LiquidPixelCardProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  interactive?: boolean;
  pixelCorners?: boolean;
  accent?: 'cyan' | 'magenta' | 'emerald' | 'amber' | 'violet';
  onClick?: () => void;
  strong?: boolean;
}

const accentColorMap = {
  cyan: {
    corner: 'bg-sky-400 dark:bg-cyan-400',
    glow: 'rgba(56, 189, 248, 0.18)',
    rim: 'from-sky-400/40 via-white/40 to-fuchsia-400/30',
  },
  magenta: {
    corner: 'bg-pink-500 dark:bg-pink-400',
    glow: 'rgba(244, 114, 182, 0.18)',
    rim: 'from-pink-400/40 via-white/40 to-cyan-400/30',
  },
  emerald: {
    corner: 'bg-emerald-500 dark:bg-emerald-400',
    glow: 'rgba(52, 211, 153, 0.18)',
    rim: 'from-emerald-400/40 via-white/40 to-cyan-400/30',
  },
  amber: {
    corner: 'bg-amber-500 dark:bg-amber-400',
    glow: 'rgba(251, 191, 36, 0.18)',
    rim: 'from-amber-400/40 via-white/40 to-pink-400/30',
  },
  violet: {
    corner: 'bg-violet-500 dark:bg-violet-400',
    glow: 'rgba(167, 139, 250, 0.18)',
    rim: 'from-violet-400/40 via-white/40 to-cyan-400/30',
  },
};

export const LiquidPixelCard: React.FC<LiquidPixelCardProps> = ({
  children,
  className = '',
  contentClassName = '',
  interactive = false,
  pixelCorners = true,
  accent = 'cyan',
  onClick,
  strong = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCursor({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setCursor((prev) => ({ ...prev, active: false }));
  };

  const palette = accentColorMap[accent];

  // Separate inner layout/spacing classes (like space-y-*, flex, justify-*, gap-*)
  // so they apply to the children container instead of shifting absolute overlays.
  const tokens = className.trim().split(/\s+/).filter(Boolean);
  const innerFlowTokens: string[] = [];
  const outerBoxTokens: string[] = [];

  for (const token of tokens) {
    if (
      token.startsWith('space-y-') ||
      token.startsWith('space-x-') ||
      token === 'flex' ||
      token === 'flex-col' ||
      token.startsWith('justify-') ||
      token.startsWith('items-') ||
      token.startsWith('gap-')
    ) {
      innerFlowTokens.push(token);
    } else {
      outerBoxTokens.push(token);
    }
  }

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative flex flex-col rounded-2xl overflow-hidden ${
        strong ? 'liquid-glass-strong' : 'liquid-glass'
      } ${
        interactive
          ? 'liquid-glass-interactive cursor-pointer hover:-translate-y-1'
          : ''
      } ${outerBoxTokens.join(' ')}`}
    >
      {/* Isolated Decorative Overlay Layer (Covers 100% of card from top:0 to bottom:0) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
      >
        {/* Top Specular Liquid Refraction Edge */}
        <div
          className={`absolute inset-x-4 top-0 h-[1.5px] bg-gradient-to-r ${palette.rim} opacity-75`}
        />

        {/* Mouse-Following Liquid Specular Spotlight */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: cursor.active ? 1 : 0,
            background: `radial-gradient(420px circle at ${cursor.x}px ${cursor.y}px, ${palette.glow}, transparent 65%)`,
          }}
        />

        {/* Subtle Stepped Pixel Corner Accents */}
        {pixelCorners && (
          <>
            <span
              className={`absolute top-2 left-2 w-1.5 h-1.5 ${palette.corner} opacity-70 shadow-[3px_0_0_0_currentColor,0_3px_0_0_currentColor] text-sky-400/50 dark:text-cyan-300/50`}
            />
            <span
              className={`absolute top-2 right-2 w-1.5 h-1.5 ${palette.corner} opacity-70 shadow-[-3px_0_0_0_currentColor,0_3px_0_0_currentColor] text-sky-400/50 dark:text-cyan-300/50`}
            />
            <span
              className={`absolute bottom-2 left-2 w-1.5 h-1.5 ${palette.corner} opacity-70 shadow-[3px_0_0_0_currentColor,0_-3px_0_0_currentColor] text-sky-400/50 dark:text-cyan-300/50`}
            />
            <span
              className={`absolute bottom-2 right-2 w-1.5 h-1.5 ${palette.corner} opacity-70 shadow-[-3px_0_0_0_currentColor,0_-3px_0_0_currentColor] text-sky-400/50 dark:text-cyan-300/50`}
            />
          </>
        )}
      </div>

      {/* Content */}
      <div
        className={`relative z-10 flex-1 w-full ${innerFlowTokens.join(
          ' '
        )} ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
