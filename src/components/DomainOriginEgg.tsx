import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Binary, Cake, LockKeyhole } from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';

interface DomainSegment {
  code: string;
  hex: string | null;
  meaning: string;
  hint: string;
}

const SEGMENTS: DomainSegment[] = [
  { code: 'cw', hex: null, meaning: 'CarlosWhite', hint: '名字缩写' },
  { code: 'a', hex: '0x0A', meaning: '10', hint: '月份' },
  { code: '1e', hex: '0x1E', meaning: '30', hint: '日期' },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const useDecodeSequence = () => {
  const [decoded, setDecoded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const toggle = useCallback(() => {
    if (decoded) {
      clear();
      setScanning(false);
      setDecoded(false);
      return;
    }
    if (prefersReducedMotion()) {
      setDecoded(true);
      return;
    }
    clear();
    setScanning(true);
    timerRef.current = window.setTimeout(() => {
      setScanning(false);
      setDecoded(true);
      timerRef.current = null;
    }, 620);
  }, [clear, decoded]);

  return { decoded, scanning, toggle };
};

const useIsBirthday = () => {
  const [isBirthday, setIsBirthday] = useState(false);

  useEffect(() => {
    const now = new Date();
    setIsBirthday(now.getMonth() === 9 && now.getDate() === 30);
  }, []);

  return isBirthday;
};

const DecodeButton: React.FC<{
  decoded: boolean;
  onToggle: () => void;
  terminal?: boolean;
}> = ({ decoded, onToggle, terminal = false }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={decoded}
    className={
      terminal
        ? 'rounded border border-emerald-500/30 px-1.5 py-0.5 font-mono text-[9px] text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300'
        : 'liquid-pill inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/35 bg-white/40 px-2.5 py-1 font-mono text-[10px] text-amber-700 transition-colors hover:border-amber-400/70 hover:bg-amber-400/10 dark:border-amber-300/25 dark:bg-slate-950/40 dark:text-amber-200 dark:hover:bg-amber-300/10'
    }
  >
    {terminal ? null : <Binary className="h-3 w-3" />}
    {terminal ? (decoded ? 'reset' : 'decode') : decoded ? '重新编码' : '解码'}
  </button>
);

export const DomainOriginEgg: React.FC = () => {
  const { decoded, scanning, toggle } = useDecodeSequence();
  const isBirthday = useIsBirthday();

  return (
    <LiquidPixelCard accent="amber" className="about-reveal space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <Binary className="h-4 w-4" />
          </span>
          <div>
            <div className="font-mono text-[9px] tracking-wider text-amber-600 dark:text-amber-300">
              DOMAIN ORIGIN // 域名彩蛋
            </div>
            <h2 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
              cwa1e 是怎么来的
            </h2>
          </div>
        </div>
        <DecodeButton decoded={decoded} onToggle={toggle} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,280px)_1fr] sm:items-center sm:gap-4">
        <div className="relative overflow-hidden rounded-xl border border-amber-400/20 bg-white/40 dark:bg-slate-950/40">
          {scanning && (
            <span
              aria-hidden="true"
              className="domain-scan pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent dark:via-amber-300/25"
            />
          )}
          <div className="relative">
            <div className="grid grid-cols-[30px_46px_1fr] items-center gap-2 border-b border-amber-400/10 px-3 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              <span>frag</span>
              <span>hex</span>
              <span>value</span>
            </div>
            {SEGMENTS.map((segment, index) => (
              <div
                key={segment.code}
                className="grid grid-cols-[30px_46px_1fr] items-center gap-2 px-3 py-2 font-mono text-[11px]"
              >
                <span
                  className={`font-bold transition-colors duration-500 ${
                    decoded
                      ? 'text-amber-700 dark:text-amber-200'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {segment.code}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {segment.hex ?? '—'}
                </span>
                <span className="relative block h-4 leading-4">
                  <span
                    className={`absolute inset-0 transition-all duration-300 ${
                      decoded
                        ? '-translate-y-1 opacity-0'
                        : 'translate-y-0 opacity-100'
                    } text-slate-400/70 dark:text-slate-500`}
                  >
                    ??
                  </span>
                  <span
                    className={`absolute inset-0 transition-all duration-500 ${
                      decoded
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-1 opacity-0'
                    } text-slate-800 dark:text-amber-100`}
                    style={{
                      transitionDelay: decoded ? `${index * 80}ms` : '0ms',
                    }}
                  >
                    {segment.meaning}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {decoded ? (
          <div className="animate-fadeIn min-w-0 space-y-2">
            <div className="flex flex-wrap items-end gap-2">
              <span className="font-mono text-2xl font-bold leading-none tabular-nums text-amber-600 dark:text-amber-300">
                10
              </span>
              <span className="pb-0.5 font-mono text-sm leading-none text-amber-500/60">
                /
              </span>
              <span className="font-mono text-2xl font-bold leading-none tabular-nums text-amber-600 dark:text-amber-300">
                30
              </span>
              <span className="mb-0.5 flex items-center gap-1 font-mono text-[9px] tracking-wider text-slate-500 dark:text-slate-400">
                <Cake className="h-3 w-3" />
                BIRTHDAY
              </span>
              {isBirthday && (
                <span className="mb-0.5 rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[9px] leading-none text-amber-700 dark:text-amber-200">
                  TODAY
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="font-mono text-slate-800 dark:text-amber-100">
                cw
              </span>{' '}
              是 CarlosWhite 的缩写；
              <span className="font-mono text-slate-800 dark:text-amber-100">
                a
              </span>{' '}
              与{' '}
              <span className="font-mono text-slate-800 dark:text-amber-100">
                1e
              </span>{' '}
              是两个十六进制数——<span className="font-mono">0x0A</span> 是 10，
              <span className="font-mono">0x1E</span> 是 30。10 月 30
              日是我的生日，于是它被写成了一串只有懂十六进制的人才会读的日期。
            </p>
          </div>
        ) : (
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-slate-400 dark:text-slate-500">
              <LockKeyhole className="h-3 w-3" />
              LOCKED // 待解码
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              cwa1e.top 不是随手拼出来的域名：cw 是名字缩写，a 与 1e
              是两个十六进制数，把它们按十进制读出来，正好是一个日期。
            </p>
          </div>
        )}
      </div>
    </LiquidPixelCard>
  );
};

export const TerminalDomainOriginEgg: React.FC = () => {
  const { decoded, toggle } = useDecodeSequence();
  const isBirthday = useIsBirthday();

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-emerald-600 dark:text-emerald-300"># domain_origin</p>
        <DecodeButton decoded={decoded} onToggle={toggle} terminal />
      </div>
      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
        cwa1e 不是随手敲的五个字符：cw 是 CarlosWhite 的缩写，a 与 1e
        是两个十六进制数。
      </p>
      <div className="space-y-1 font-mono text-[10px]">
        {SEGMENTS.map((segment) => (
          <div key={segment.code} className="flex items-baseline gap-2">
            <span className="w-7 shrink-0 text-cyan-600 dark:text-cyan-300">
              {segment.code}
            </span>
            <span className="text-slate-400">→</span>
            <span
              className={
                decoded
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-400 dark:text-slate-500'
              }
            >
              {decoded ? segment.meaning : '??'}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">
              {segment.hint}
            </span>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-slate-500">
        <span className="text-cyan-600 dark:text-cyan-300">birthday</span>{' '}
        {decoded ? '10 / 30' : '?? / ??'}
        {decoded && isBirthday && (
          <span className="ml-2 text-amber-600 dark:text-amber-300"># today</span>
        )}
      </p>
    </section>
  );
};
