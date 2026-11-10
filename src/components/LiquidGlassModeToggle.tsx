'use client';

import React from 'react';
import { LayoutGrid, Terminal } from 'lucide-react';

// Flip to false (or `git revert` the experiment commit) to restore the plain button.
export const ENABLE_LIQUID_GLASS_TOGGLE = true;

interface LiquidGlassModeToggleProps {
  viewMode: 'standard' | 'terminal';
  onToggle: () => void;
  className?: string;
}

const LABELS = {
  standard: { text: '终端模式', title: '切换至终端模式' },
  terminal: { text: '普通博客', title: '切换至普通博客风格' },
} as const;

export const LiquidGlassModeToggle: React.FC<LiquidGlassModeToggleProps> = ({
  viewMode,
  onToggle,
  className = '',
}) => {
  const label = LABELS[viewMode];

  return (
    <div className={className}>
      <button
        type="button"
        data-custom-sound
        onClick={onToggle}
        title={label.title}
        aria-label={label.title}
        className="liquid-glass-btn flex h-10 items-center gap-2 rounded-full px-3.5 font-mono text-xs text-slate-700 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:text-slate-100 sm:h-9"
      >
        {viewMode === 'standard' ? (
          <Terminal className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <LayoutGrid className="h-3.5 w-3.5 text-sky-500" />
        )}
        <span>{label.text}</span>
      </button>
    </div>
  );
};
