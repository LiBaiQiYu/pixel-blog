import React, { useState } from 'react';

const ART_BASE = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

// Not every app ships the small store capsule (Deadlock, for example, only has
// header.jpg). Walk the list, then fall back to a generated tile so a missing
// asset never leaves a hole in the layout.
const ART_VARIANTS = ['capsule_184x69.jpg', 'header.jpg'];

const initialsOf = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const first = Array.from(trimmed)[0];
  return first.toUpperCase();
};

const hueOf = (appid: number): number => Math.abs(appid * 47) % 360;

interface SteamGameArtProps {
  appid: number;
  name: string;
  className?: string;
}

export const SteamGameArt: React.FC<SteamGameArtProps> = ({
  appid,
  name,
  className = '',
}) => {
  const [attempt, setAttempt] = useState(0);

  if (attempt < ART_VARIANTS.length) {
    return (
      <img
        src={`${ART_BASE}/${appid}/${ART_VARIANTS[attempt]}`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={`${className} object-cover`}
        onError={() => setAttempt((value) => value + 1)}
      />
    );
  }

  const hue = hueOf(appid);

  return (
    <span
      aria-hidden="true"
      className={`${className} flex items-center justify-center overflow-hidden font-mono font-bold text-white/90`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 62% 42%), hsl(${(hue + 38) % 360} 58% 30%))`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
};
