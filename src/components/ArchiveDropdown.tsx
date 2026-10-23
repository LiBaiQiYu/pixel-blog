import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, ChevronDown } from 'lucide-react';

export interface ArchiveBucket {
  ym: string;
  label: string;
  count: number;
}

export interface ArchiveGroup {
  year: string;
  total: number;
  months: ArchiveBucket[];
}

interface ArchiveDropdownProps {
  value: string;
  total: number;
  groups: ArchiveGroup[];
  activeLabel: string;
  onChange: (value: string) => void;
}

interface MenuLayout {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

export const ArchiveDropdown: React.FC<ArchiveDropdownProps> = ({
  value,
  total,
  groups,
  activeLabel,
  onChange,
}) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [layout, setLayout] = useState<MenuLayout | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const updateLayout = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      Math.max(rect.width, 280),
      Math.min(350, viewportWidth - 24)
    );
    const left = Math.min(
      Math.max(rect.left, 12),
      Math.max(12, viewportWidth - width - 12)
    );
    let top = rect.bottom + 8;
    let maxHeight = Math.min(340, viewportHeight - top - 12);

    if (maxHeight < 180) {
      maxHeight = Math.min(340, rect.top - 20);
      top = Math.max(12, rect.top - maxHeight - 8);
    }

    setLayout({ left, top, width, maxHeight });
  }, []);

  const openMenu = () => {
    clearCloseTimer();
    setMounted(true);
    setOpen(true);
    updateLayout();
    window.requestAnimationFrame(() => setVisible(true));
  };

  const closeMenu = () => {
    clearCloseTimer();
    setVisible(false);
    setOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, 180);
  };

  const toggleMenu = () => {
    if (open) closeMenu();
    else openMenu();
  };

  const select = (next: string) => {
    onChange(next);
    closeMenu();
  };

  useEffect(() => {
    if (!mounted) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closeMenu();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updateLayout);
    window.addEventListener('scroll', updateLayout, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('scroll', updateLayout, true);
    };
  }, [mounted, updateLayout]);

  useLayoutEffect(() => {
    if (mounted) updateLayout();
  }, [mounted, updateLayout]);

  useEffect(
    () => () => {
      clearCloseTimer();
    },
    []
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-w-[190px] max-w-[260px] items-center justify-between gap-2 rounded-xl border px-3 py-1.5 font-mono text-[11px] transition-all ${
          open
            ? 'border-sky-400/60 bg-sky-500/10 text-sky-700 dark:border-cyan-400/40 dark:text-cyan-200'
            : 'border-slate-300/60 bg-white/55 text-slate-700 hover:border-sky-400/40 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200'
        }`}
        title="展开年月归档"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0 text-sky-500" />
          <span className="truncate">{activeLabel}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-sky-500' : ''
          }`}
        />
      </button>

      {mounted &&
        layout &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label="年月归档"
            className={`fixed z-[70] origin-top overflow-hidden rounded-2xl border border-slate-300/70 bg-white/95 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl transition-[opacity,transform] duration-200 ease-out dark:border-white/15 dark:bg-slate-950/95 dark:shadow-black/50 ${
              visible
                ? 'translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none -translate-y-2 scale-[0.98] opacity-0'
            }`}
            style={{
              left: layout.left,
              top: layout.top,
              width: layout.width,
              maxHeight: layout.maxHeight,
            }}
          >
            <span className="pointer-events-none absolute left-1.5 top-1.5 h-1 w-1 bg-sky-400 shadow-[3px_0_0_0_#38bdf8,0_3px_0_0_#38bdf8]" />
            <span className="pointer-events-none absolute right-1.5 top-1.5 h-1 w-1 bg-pink-400 shadow-[-3px_0_0_0_#f472b6,0_3px_0_0_#f472b6]" />
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-1 w-1 bg-emerald-400 shadow-[3px_0_0_0_#34d399,0_-3px_0_0_#34d399]" />
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-1 w-1 bg-amber-400 shadow-[-3px_0_0_0_#fbbf24,0_-3px_0_0_#fbbf24]" />

            <div className="mb-1.5 flex items-center justify-between px-1 font-mono text-[9px] text-slate-400">
              <span>ARCHIVE // 年月归档</span>
              <span>{total} POSTS</span>
            </div>

            <div
              className="space-y-2 overflow-y-auto pr-1"
              style={{ maxHeight: Math.max(0, layout.maxHeight - 36) }}
            >
              <button
                type="button"
                onClick={() => select('ALL')}
                className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 font-mono text-[10px] transition-colors ${
                  value === 'ALL'
                    ? 'border-sky-400/50 bg-sky-500/15 text-sky-700 dark:text-cyan-200'
                    : 'border-transparent text-slate-600 hover:border-sky-400/30 hover:bg-sky-500/5 dark:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {value === 'ALL' ? (
                    <Check className="h-3 w-3 text-sky-500" />
                  ) : (
                    <span className="h-3 w-3" />
                  )}
                  全部归档
                </span>
                <span className="text-slate-400">{total}</span>
              </button>

              {groups.map((group) => (
                <div
                  key={group.year}
                  className="border-t border-slate-200/60 pt-1.5 first:border-t-0 first:pt-0 dark:border-white/10"
                >
                  <button
                    type="button"
                    onClick={() => select(group.year)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1 font-mono text-[10px] transition-colors ${
                      value === group.year
                        ? 'bg-sky-500/15 text-sky-700 dark:text-cyan-200'
                        : 'text-slate-500 hover:bg-sky-500/5 dark:text-slate-400'
                    }`}
                  >
                    <span className="font-bold">{group.year} 年</span>
                    <span>全年 {group.total} 篇</span>
                  </button>

                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {group.months.map((bucket) => {
                      const month = bucket.ym.slice(5);
                      const active = value === bucket.ym;
                      return (
                        <button
                          key={bucket.ym}
                          type="button"
                          onClick={() => select(bucket.ym)}
                          className={`flex items-center justify-between rounded-lg border px-2 py-1 font-mono text-[10px] transition-all ${
                            active
                              ? 'border-sky-400/50 bg-sky-500/15 text-sky-700 shadow-[2px_2px_0_0_rgba(56,189,248,0.25)] dark:text-cyan-200'
                              : 'border-slate-200/70 text-slate-600 hover:border-sky-400/30 hover:bg-sky-500/5 dark:border-white/10 dark:text-slate-300'
                          }`}
                        >
                          <span>{Number(month)} 月</span>
                          <span className="text-[9px] text-slate-400">
                            {bucket.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
