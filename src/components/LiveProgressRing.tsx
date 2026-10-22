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
          background: `conic-gradient(from -90deg, rgba(244, 114, 182, 0.62) ${degrees}deg, rgba(255, 255, 255, 0.16) ${degrees}deg 360deg)`,
        }}
      />
      <span className="absolute inset-[3px] rounded-full border border-white/15 bg-slate-950/40 backdrop-blur-md" />
      <span className="absolute inset-0 flex items-center justify-center">
        {playing ? (
          <Pause
            className="block text-pink-100"
            style={{ width: size * 0.36, height: size * 0.36 }}
            fill="currentColor"
            strokeWidth={0}
          />
        ) : (
          <Play
            className="block text-pink-50"
            style={{ width: size * 0.36, height: size * 0.36 }}
            fill="currentColor"
            strokeWidth={0}
          />
        )}
      </span>
    </span>
  );
};
