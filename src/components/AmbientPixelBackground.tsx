import React from 'react';
import { ViewMode } from '../types/blog';

interface AmbientPixelBackgroundProps {
  mode: ViewMode;
}

export const AmbientPixelBackground: React.FC<AmbientPixelBackgroundProps> = ({
  mode,
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Base Pixel Grid Matrix */}
      <div className="absolute inset-0 bg-pixel-matrix opacity-90" />

      {/* Liquid Glass Iridescent Orbs (Refracted through cards, rem-scaled for 2K/4K) */}
      <div
        className={`absolute -top-28 -left-24 w-[30rem] h-[30rem] rounded-full blur-[110px] transition-all duration-700 animate-pulse-glow ${
          mode === 'terminal'
            ? 'bg-emerald-500/20 dark:bg-emerald-500/22'
            : 'bg-sky-400/25 dark:bg-cyan-500/22'
        }`}
      />
      <div
        className={`absolute top-1/3 -right-28 w-[28rem] h-[28rem] rounded-full blur-[120px] transition-all duration-700 animate-float-slow ${
          mode === 'terminal'
            ? 'bg-cyan-500/20 dark:bg-sky-500/20'
            : 'bg-pink-400/20 dark:bg-fuchsia-500/20'
        }`}
      />
      <div
        className={`absolute -bottom-32 left-1/3 w-[32rem] h-[26rem] rounded-full blur-[130px] transition-all duration-700 ${
          mode === 'terminal'
            ? 'bg-indigo-500/15 dark:bg-teal-500/18'
            : 'bg-amber-300/15 dark:bg-violet-600/20'
        }`}
      />

      {/* Floating Decorative 8-bit Pixel Clusters */}
      <div className="hidden md:block absolute top-28 left-[8%] w-3 h-3 bg-sky-400/35 dark:bg-cyan-400/40 shadow-[12px_12px_0_0_rgba(244,114,182,0.35)] animate-float-slow" />
      <div className="hidden md:block absolute top-64 right-[9%] w-2.5 h-2.5 bg-pink-400/35 dark:bg-pink-400/40 shadow-[-10px_14px_0_0_rgba(56,189,248,0.35)] animate-pulse-glow" />
      <div className="hidden md:block absolute bottom-24 left-[12%] w-2 h-2 bg-emerald-400/40 shadow-[8px_-8px_0_0_rgba(251,191,36,0.35)]" />

      {/* Subtle Scanline Overlay when in Terminal Mode */}
      {mode === 'terminal' && (
        <div className="absolute inset-0 crt-scanlines opacity-55" />
      )}
    </div>
  );
};
