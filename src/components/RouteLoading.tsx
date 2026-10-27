import React from 'react';

export const RouteLoading: React.FC = () => {
  return (
    <div role="status" aria-live="polite" className="animate-fadeIn space-y-5 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div className="liquid-glass-strong flex items-center gap-2 rounded-xl border border-slate-300/50 px-3 py-2 dark:border-white/10">
          <div className="h-4 w-4 animate-pulse rounded-sm bg-sky-400/70" />
          <div className="h-2.5 w-16 animate-pulse rounded-sm bg-slate-300/80 dark:bg-slate-700" />
        </div>
        <div className="flex items-center gap-2 font-pixel text-[9px] tracking-wider text-sky-600 dark:text-cyan-300">
          <span className="h-1.5 w-1.5 animate-pulse bg-sky-500 dark:bg-cyan-300" />
          LOADING ARTICLE
        </div>
      </div>

      <div className="liquid-glass overflow-hidden rounded-2xl border border-slate-300/50 dark:border-white/10">
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-sky-500/30 via-violet-500/20 to-pink-500/20 sm:h-56">
          <div className="route-loading-scan absolute inset-y-0 w-2/5 bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/15" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:16px_16px]" />
        </div>

        <div className="space-y-4 p-5 sm:p-8">
          <div className="h-2.5 w-24 animate-pulse rounded-sm bg-sky-400/60 dark:bg-cyan-300/40" />
          <div className="h-8 w-4/5 animate-pulse rounded-sm bg-slate-300/80 dark:bg-slate-700" />
          <div className="h-3 w-2/3 animate-pulse rounded-sm bg-slate-300/60 dark:bg-slate-800" />
          <div className="flex gap-2 pt-1">
            <div className="h-6 w-20 animate-pulse rounded-md bg-slate-300/50 dark:bg-slate-800" />
            <div className="h-6 w-16 animate-pulse rounded-md bg-slate-300/50 dark:bg-slate-800" />
            <div className="h-6 w-16 animate-pulse rounded-md bg-slate-300/50 dark:bg-slate-800" />
          </div>
          <div className="space-y-2.5 pt-5">
            <div className="h-3 w-full animate-pulse rounded-sm bg-slate-300/50 dark:bg-slate-800" />
            <div className="h-3 w-11/12 animate-pulse rounded-sm bg-slate-300/50 dark:bg-slate-800" />
            <div className="h-3 w-4/5 animate-pulse rounded-sm bg-slate-300/50 dark:bg-slate-800" />
            <div className="h-3 w-2/3 animate-pulse rounded-sm bg-slate-300/50 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500 dark:text-slate-400">
        <span className="relative h-1 w-36 overflow-hidden bg-slate-300/60 dark:bg-slate-800">
          <span className="route-loading-scan absolute inset-y-0 w-1/2 bg-sky-500 dark:bg-cyan-300" />
        </span>
        <span>正在从 R2 读取文章…</span>
      </div>
    </div>
  );
};
