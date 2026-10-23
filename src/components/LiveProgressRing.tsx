import React from 'react';
import { Pause, Play } from 'lucide-react';

interface LiveProgressRingProps {
  progress: number;
  loaded?: boolean;
  playing?: boolean;
  size?: number;
  className?: string;
}

export const LiveProgressRing: React.FC<LiveProgressRingProps> = ({
  progress,
  loaded = false,
  playing = false,
  size = 30,
  className = '',
}) => {
  const ratio = loaded ? 1 : Math.min(1, Math.max(0, progress));
  const degrees = Math.round(ratio * 360);
  const percent = Math.round(ratio * 100);
  const label = ratio >= 1 ? '实况已加载' : `实况加载 ${percent}%`;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from -90deg, rgba(244, 114, 182, 0.62) ${degrees}deg, var(--live-ring-track) ${degrees}deg 360deg)`,
        }}
      />
      <span className="absolute inset-[3px] rounded-full border border-slate-300/70 bg-white/55 backdrop-blur-md dark:border-white/15 dark:bg-slate-950/40" />
      <span className="absolute inset-0 flex items-center justify-center">
        {playing ? (
          <Pause
            className="block text-pink-600 dark:text-pink-100"
            style={{ width: size * 0.36, height: size * 0.36 }}
            fill="currentColor"
            strokeWidth={0}
          />
        ) : (
          <Play
            className="block text-pink-700 dark:text-pink-50"
            style={{ width: size * 0.36, height: size * 0.36 }}
            fill="currentColor"
            strokeWidth={0}
          />
        )}
      </span>
    </span>
  );
};
