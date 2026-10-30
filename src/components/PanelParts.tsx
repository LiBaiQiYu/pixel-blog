import React from 'react';

export const SectionHeader: React.FC<{
  index: string;
  title: string;
  hint?: React.ReactNode;
}> = ({ index, title, hint }) => (
  <div className="flex items-center gap-2">
    <span className="font-mono text-[10px] leading-none text-sky-500 dark:text-cyan-300">
      {index}
    </span>
    <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">
      {title}
    </h3>
    <span className="h-px flex-1 bg-gradient-to-r from-slate-300/80 via-slate-200/50 to-transparent dark:from-white/15 dark:via-white/5" />
    {hint ? (
      <span className="shrink-0 font-mono text-[9px] text-slate-400 dark:text-slate-500">
        {hint}
      </span>
    ) : null}
  </div>
);

export const StatTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: 'sky' | 'rose' | 'emerald';
}> = ({ label, value, hint, tone = 'sky' }) => {
  const valueTone =
    tone === 'rose'
      ? 'text-rose-600 dark:text-rose-300'
      : tone === 'emerald'
        ? 'text-emerald-600 dark:text-emerald-300'
        : 'text-sky-700 dark:text-cyan-200';

  return (
    <div className="rounded-xl border border-sky-400/25 bg-white/55 px-3 py-2 dark:border-cyan-400/15 dark:bg-slate-950/50">
      <div className="font-mono text-[8px] tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-base font-bold leading-none ${valueTone}`}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 truncate font-mono text-[9px] text-slate-400 dark:text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
};

export const MiniStat: React.FC<{
  label: string;
  value: string;
  ok?: boolean;
}> = ({ label, value, ok }) => (
  <div className="rounded-lg border border-slate-200/70 bg-white/40 px-2.5 py-2 dark:border-white/10 dark:bg-slate-950/40">
    <div className="font-mono text-[8px] tracking-wider text-slate-500 dark:text-slate-400">
      {label}
    </div>
    <div
      className={`mt-0.5 truncate font-mono text-[11px] font-bold ${
        ok === false
          ? 'text-rose-600 dark:text-rose-300'
          : ok === true
            ? 'text-emerald-600 dark:text-emerald-300'
            : 'text-slate-800 dark:text-slate-100'
      }`}
    >
      {value}
    </div>
  </div>
);
