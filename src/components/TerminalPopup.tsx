import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Accent = 'sky' | 'emerald';

const ACCENTS: Record<
  Accent,
  {
    panel: string;
    header: string;
    icon: string;
    title: string;
    close: string;
    shadow: string;
  }
> = {
  sky: {
    panel:
      'border-sky-500/35 bg-white/95 text-slate-700 dark:border-sky-400/30 dark:bg-slate-950/95 dark:text-slate-300',
    header:
      'border-sky-500/20 bg-sky-50/90 dark:border-sky-400/20 dark:bg-sky-500/5',
    icon:
      'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:border-sky-400/30 dark:text-cyan-300',
    title: 'text-sky-800 dark:text-cyan-300',
    close:
      'border-sky-500/30 text-sky-700 hover:bg-sky-500/10 dark:border-sky-400/30 dark:text-cyan-300',
    shadow: 'shadow-sky-950/20 dark:shadow-sky-950/50',
  },
  emerald: {
    panel:
      'border-emerald-500/35 bg-white/95 text-slate-700 dark:border-emerald-400/30 dark:bg-slate-950/95 dark:text-slate-300',
    header:
      'border-emerald-500/20 bg-emerald-50/90 dark:border-emerald-400/20 dark:bg-emerald-500/5',
    icon:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300',
    title: 'text-emerald-800 dark:text-emerald-300',
    close:
      'border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:border-emerald-400/30 dark:text-emerald-300',
    shadow: 'shadow-emerald-950/20 dark:shadow-emerald-950/50',
  },
};

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

const TRANSITION_OPEN =
  'left 300ms ease-out, top 300ms ease-out, width 300ms ease-out, height 300ms ease-out, border-radius 300ms ease-out, opacity 300ms ease-out';
const TRANSITION_CLOSE =
  'left 250ms ease-in, top 250ms ease-in, width 250ms ease-in, height 250ms ease-in, border-radius 250ms ease-in, opacity 250ms ease-in';

function toBox(rect: DOMRect): Box {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    radius: 16,
  };
}

function getTargetBox(origin: DOMRect, targetHeight: number): Box {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(720, viewportWidth - 24);
  const height = Math.min(targetHeight, viewportHeight - 48);
  const left = Math.min(
    Math.max(origin.left + origin.width / 2 - width / 2, 12),
    Math.max(12, viewportWidth - width - 12)
  );
  let top = origin.top - height - 16;
  if (top < 12) top = origin.bottom + 16;
  if (top + height > viewportHeight - 12) {
    top = Math.max(12, (viewportHeight - height) / 2);
  }

  return { left, top, width, height, radius: 18 };
}

interface TerminalPopupProps {
  open: boolean;
  originRect: DOMRect | null;
  onClose: () => void;
  accent: Accent;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  footerLeft: string;
  targetHeight?: number;
  children: React.ReactNode;
}

export const TerminalPopup: React.FC<TerminalPopupProps> = ({
  open,
  originRect,
  onClose,
  accent,
  icon,
  title,
  subtitle,
  footerLeft,
  targetHeight = 600,
  children,
}) => {
  const styles = ACCENTS[accent];
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const contentOpacity = expanded ? 'opacity-100' : 'opacity-0';

  useEffect(() => {
    let timer = 0;

    if (open && originRect) {
      setMounted(true);
      setBox(toBox(originRect));
      setExpanded(false);
      setBackdropVisible(false);
      setPanelVisible(false);
    } else if (!open) {
      setExpanded(false);
      setBackdropVisible(false);
      setPanelVisible(false);
      if (originRect) setBox(toBox(originRect));
      timer = window.setTimeout(() => {
        setMounted(false);
        setBox(null);
      }, 280);
    }

    return () => window.clearTimeout(timer);
  }, [open, originRect]);

  useLayoutEffect(() => {
    if (!open || !mounted || !originRect) return;

    let secondFrame = 0;
    let expandTimer = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setBackdropVisible(true);
        setPanelVisible(true);
        setBox(getTargetBox(originRect, targetHeight));
        expandTimer = window.setTimeout(() => setExpanded(true), 120);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(expandTimer);
    };
  }, [mounted, open, originRect, targetHeight]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!mounted || !box) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] bg-slate-950/45"
      style={{
        opacity: backdropVisible ? 1 : 0,
        transition: backdropVisible
          ? 'opacity 300ms ease-out'
          : 'opacity 250ms ease-in',
      }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed flex flex-col overflow-hidden border shadow-2xl ${styles.panel} ${styles.shadow}`}
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          borderRadius: box.radius,
          zIndex: 91,
          opacity: panelVisible ? 1 : 0,
          transition: open ? TRANSITION_OPEN : TRANSITION_CLOSE,
          willChange: 'left, top, width, height, opacity',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 transition-opacity duration-150 ${contentOpacity} ${styles.header}`}
        >
          <div className="flex min-w-0 items-center gap-2 font-mono">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${styles.icon}`}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <div className={`truncate text-[11px] font-bold ${styles.title}`}>
                {title}
              </div>
              {subtitle && (
                <div className="text-[9px] text-slate-500 dark:text-slate-500">
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded border p-1.5 transition-colors ${styles.close}`}
            aria-label={`关闭${title}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 transition-opacity duration-150 sm:p-4 ${contentOpacity}`}
        >
          {children}
        </div>

        <div
          className={`flex shrink-0 items-center justify-between gap-3 border-t border-slate-300/60 px-4 py-2 font-mono text-[9px] text-slate-500 transition-opacity duration-150 dark:border-white/10 dark:text-slate-500 ${contentOpacity}`}
        >
          <span>{footerLeft}</span>
          <span>ESC / click outside to close</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
