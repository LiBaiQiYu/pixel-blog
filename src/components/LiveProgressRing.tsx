import React from 'react';

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
  const label =
    ratio >= 1
      ? playing
        ? '实况播放中'
        : '实况已就绪'
      : `实况加载 ${percent}%`;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`live-progress-ring relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-slate-950/45 text-slate-100 shadow-[0_4px_16px_rgba(2,6,23,0.32)] backdrop-blur-md ${
        playing ? 'live-progress-ring-playing' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from -90deg, rgba(241, 245, 249, 0.92) ${degrees}deg, rgba(255, 255, 255, 0.12) ${degrees}deg 360deg)`,
        }}
      />
      <span className="absolute inset-[3px] rounded-full border border-white/10 bg-slate-950/55 backdrop-blur-md" />
      <span className="absolute inset-[6px] rounded-full border border-white/10" />
      <span className="absolute inset-0">
        <span
          className={`live-state-icon ${
            playing ? 'live-state-icon-hidden' : 'live-state-icon-visible'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="live-progress-glyph"
            style={{ width: size * 0.46, height: size * 0.46 }}
          >
            <circle
              cx="12"
              cy="12"
              r="8.25"
              stroke="currentColor"
              strokeWidth="1.15"
              strokeDasharray="2.5 2.1"
              strokeOpacity="0.82"
            />
            <circle
              cx="12"
              cy="12"
              r="5.15"
              stroke="currentColor"
              strokeWidth="1.05"
              strokeOpacity="0.58"
            />
            <circle cx="12" cy="12" r="2.1" fill="currentColor" />
          </svg>
        </span>
        <span
          className={`live-state-icon ${
            playing ? 'live-state-icon-visible' : 'live-state-icon-hidden'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="live-progress-glyph"
            style={{ width: size * 0.46, height: size * 0.46 }}
          >
            <rect x="6.6" y="5.6" width="3.5" height="12.8" rx="1.75" />
            <rect x="13.9" y="5.6" width="3.5" height="12.8" rx="1.75" />
          </svg>
        </span>
      </span>
    </span>
  );
};
