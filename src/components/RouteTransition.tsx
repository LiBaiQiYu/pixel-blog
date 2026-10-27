'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ROUTE_TRANSITION_EVENT } from '../lib/route-transition';

const MIN_VISIBLE_MS = 320;
const MAX_VISIBLE_MS = 8000;

export const RouteTransition: React.FC = () => {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState('正在加载');
  const activeRef = useRef(false);
  const startedAtRef = useRef(0);
  const maxTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleStart = (event: Event) => {
      const detail = (event as CustomEvent<{ label?: string }>).detail;
      activeRef.current = true;
      startedAtRef.current = performance.now();
      setLabel(detail?.label ?? '正在加载');
      setActive(true);

      if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = window.setTimeout(() => {
        activeRef.current = false;
        setActive(false);
      }, MAX_VISIBLE_MS);
    };

    window.addEventListener(ROUTE_TRANSITION_EVENT, handleStart);
    return () => {
      window.removeEventListener(ROUTE_TRANSITION_EVENT, handleStart);
      if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeRef.current) return;

    const elapsed = performance.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timer = window.setTimeout(() => {
      activeRef.current = false;
      setActive(false);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-100/70 px-4 backdrop-blur-md dark:bg-slate-950/75"
    >
      <div className="liquid-glass-strong w-full max-w-xs rounded-2xl border border-slate-300/60 px-6 py-5 text-center shadow-2xl dark:border-white/10">
        <div className="mb-3 flex items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className="block h-2.5 w-2.5 animate-pulse bg-sky-500 dark:bg-cyan-300"
              style={{ animationDelay: `${index * 100}ms` }}
            />
          ))}
        </div>
        <div className="font-pixel text-[10px] tracking-wider text-sky-600 dark:text-cyan-300">
          {label}
        </div>
        <div className="mt-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          LOADING / 请稍候
        </div>
        <span className="relative mt-4 block h-1 overflow-hidden bg-slate-300/60 dark:bg-slate-800">
          <span className="route-loading-scan absolute inset-y-0 w-1/2 bg-sky-500 dark:bg-cyan-300" />
        </span>
      </div>
    </div>
  );
};
