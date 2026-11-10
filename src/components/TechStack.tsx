import React from 'react';
import { TECH_ICONS, type TechIcon } from './techIcons';

export type TechId = keyof typeof TECH_ICONS;

// Brand colours are nudged where the official one is too dark to read on a
// near-black card.
const TECH_COLORS: Record<TechId, string> = {
  vue: '#41B883',
  typescript: '#4C9EE8',
  vite: '#7C83FF',
  python: '#4B8BBE',
  java: '#E76F00',
  electron: '#7FB3C0',
  hono: '#E36002',
  cloudflare: '#F48120',
  sqlite: '#58A6D8',
};

interface TechChipProps {
  id: TechId;
  icon: TechIcon;
  size?: 'sm' | 'md';
}

const TechChip: React.FC<TechChipProps> = ({ id, icon, size = 'md' }) => {
  const box = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const glyph = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <span
      title={icon.label}
      aria-label={icon.label}
      className={`flex ${box} items-center justify-center rounded-sm border border-slate-300/60 bg-white/60 transition-transform duration-200 hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.04]`}
      style={{ color: TECH_COLORS[id] }}
    >
      <svg viewBox="0 0 24 24" className={glyph} fill="currentColor" aria-hidden="true">
        <path d={icon.path} />
      </svg>
    </span>
  );
};

export const TechStack: React.FC<{
  ids: TechId[];
  size?: 'sm' | 'md';
  className?: string;
}> = ({ ids, size = 'md', className = '' }) => (
  <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
    {ids.map((id) => (
      <TechChip key={id} id={id} icon={TECH_ICONS[id]} size={size} />
    ))}
  </div>
);
