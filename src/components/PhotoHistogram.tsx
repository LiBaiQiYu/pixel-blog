'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  calculateHistogramCompressed,
  drawHistogramToCanvas,
  type HistogramDataCompressed,
} from '../lib/histogram';
import type { ThemeMode } from '../types/blog';

interface PhotoHistogramProps {
  thumbnailUrl: string;
  theme: ThemeMode;
}

const LEGEND = [
  { label: 'R', color: '#FF6259' },
  { label: 'G', color: '#2ED157' },
  { label: 'B', color: '#3B9AFF' },
];

export const PhotoHistogram: React.FC<PhotoHistogramProps> = ({
  thumbnailUrl,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [histogram, setHistogram] =
    useState<HistogramDataCompressed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setHistogram(null);

    const image = new Image();
    image.crossOrigin = 'anonymous';

    try {
      const url = new URL(thumbnailUrl, window.location.origin);
      url.searchParams.set('_cors', Date.now().toString());
      image.src = url.toString();
    } catch {
      setLoading(false);
      setError(true);
      return;
    }

    image.onload = () => {
      if (cancelled) return;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        setLoading(false);
        setError(true);
        return;
      }

      const sourceWidth = image.naturalWidth || image.width || 1;
      const sourceHeight = image.naturalHeight || image.height || 1;
      const scale = 360 / Math.max(sourceWidth, sourceHeight);
      const width = Math.max(1, Math.floor(sourceWidth * scale));
      const height = Math.max(1, Math.floor(sourceHeight * scale));

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      try {
        const imageData = context.getImageData(0, 0, width, height);
        setHistogram(calculateHistogramCompressed(imageData));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    image.onerror = () => {
      if (cancelled) return;
      setLoading(false);
      setError(true);
    };

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
      image.src = '';
    };
  }, [thumbnailUrl]);

  useEffect(() => {
    if (!histogram) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => drawHistogramToCanvas(canvas, histogram);
    draw();

    const parent = canvas.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [histogram]);

  return (
    <div
      className={`rounded-xl border p-3 ${
        isDark
          ? 'bg-slate-950/60 border-white/10'
          : 'bg-white/60 border-slate-300/70'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`font-mono text-[10px] tracking-wide ${
            isDark ? 'text-cyan-300' : 'text-sky-600'
          }`}
        >
          RGB HISTOGRAM
        </span>
        <div className="flex items-center gap-2.5">
          {LEGEND.map((channel) => (
            <span
              key={channel.label}
              className={`flex items-center gap-1 font-mono text-[9px] ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: channel.color }}
              />
              {channel.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative h-32 w-full overflow-hidden rounded-lg">
        {histogram && (
          <canvas
            ref={canvasRef}
            className="block h-full w-full rounded-lg"
            role="img"
            aria-label="RGB histogram"
          />
        )}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-950/55 text-slate-200 backdrop-blur-xl">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-mono text-[10px]">
              RENDERING HISTOGRAM
            </span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-950/65 text-slate-200 backdrop-blur-xl">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span className="font-mono text-[10px]">
              HISTOGRAM UNAVAILABLE
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
