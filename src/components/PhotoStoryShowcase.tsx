import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Sparkles, X } from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';
import { TerminalPopup } from './TerminalPopup';

const STORY_IMAGE =
  'https://about.cwa1e.top/%E6%9A%AE%E8%89%B2%E5%85%AC%E8%B7%AF%E4%B8%8A%E7%9A%84%E6%9C%88%E4%B8%8E%E8%90%BD%E6%97%A5.png';

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

function getTargetBox(origin: DOMRect): Box {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(720, viewportWidth - 24);
  const height = Math.min(600, viewportHeight - 48);
  const left = Math.min(
    Math.max(origin.left + origin.width / 2 - width / 2, 12),
    viewportWidth - width - 12
  );
  let top = origin.top - height - 16;
  if (top < 12) top = origin.bottom + 16;
  if (top + height > viewportHeight - 12) {
    top = Math.max(12, (viewportHeight - height) / 2);
  }

  return { left, top, width, height, radius: 18 };
}

export const PhotoStoryShowcase: React.FC = () => {
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const sourceTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [sourceHidden, setSourceHidden] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const contentOpacity = expanded ? 'opacity-100' : 'opacity-0';

  const clearFinishTimer = () => {
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (sourceTimerRef.current !== null) {
      window.clearTimeout(sourceTimerRef.current);
      sourceTimerRef.current = null;
    }
  };

  const beginOpen = () => {
    if (!cardRef.current) return;
    clearFinishTimer();
    const rect = cardRef.current.getBoundingClientRect();
    setOrigin(rect);
    setBox(toBox(rect));
    setClosing(false);
    setExpanded(false);
    setBackdropVisible(false);
    setPanelVisible(false);
    setSourceHidden(true);
    setOpen(true);
  };

  const beginClose = () => {
    if (!open || closing) return;
    clearFinishTimer();
    setClosing(true);
    setExpanded(false);
    setBackdropVisible(false);
    setPanelVisible(false);
    if (origin) setBox(toBox(origin));
    sourceTimerRef.current = window.setTimeout(() => {
      setSourceHidden(false);
      sourceTimerRef.current = null;
    }, 200);
    finishTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      finishTimerRef.current = null;
    }, 280);
  };

  useEffect(
    () => () => {
      clearFinishTimer();
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        beginClose();
      }
    };
    const onScroll = (event: Event) => {
      if (
        event.target instanceof Node &&
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      beginClose();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  });

  useLayoutEffect(() => {
    if (!open || closing || !origin) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setBackdropVisible(true);
        setPanelVisible(true);
        setBox(getTargetBox(origin));
        finishTimerRef.current = window.setTimeout(() => {
          setExpanded(true);
          finishTimerRef.current = null;
        }, 120);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [open, closing, origin]);

  return (
    <>
      <button
        ref={cardRef}
        type="button"
        aria-expanded={open}
        onClick={beginOpen}
        style={{ opacity: sourceHidden ? 0 : 1 }}
        className="group block h-full w-full text-left transition-opacity duration-200 focus:outline-none"
        title="查看风景摄影故事"
      >
        <LiquidPixelCard
          accent="cyan"
          className="about-reveal flex h-full flex-col gap-2 p-4 sm:p-5 transition-transform group-hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-[9px] tracking-wider text-sky-600 dark:text-cyan-300">
                PHOTOGRAPHY / FIELD NOTES
              </div>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                风景摄影
              </h3>
            </div>
            <span className="rounded border border-sky-500/30 bg-sky-500/10 p-1.5 text-sky-600 dark:text-cyan-300">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="relative h-24 overflow-hidden rounded-lg border border-sky-500/20 bg-slate-950">
            <img
              src={STORY_IMAGE}
              alt="暮色公路上的月亮与落日"
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
            <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-cyan-100">
              01 / 日月同辉
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            在旅途中收集山川、云层与光线，也记下那些来不及按快门的瞬间。
          </p>
          <span className="mt-auto inline-flex items-center gap-1 font-mono text-[9px] text-slate-400 transition-colors group-hover:text-sky-600 dark:group-hover:text-cyan-300">
            CLICK TO VIEW STORY →
          </span>
        </LiquidPixelCard>
      </button>

      {(open || closing) &&
        box &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[90] bg-slate-950/45"
              style={{
                opacity: backdropVisible ? 1 : 0,
                transition: backdropVisible
                  ? 'opacity 300ms ease-out'
                  : 'opacity 250ms ease-in',
              }}
              onClick={beginClose}
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal
              aria-label="风景摄影故事"
              className="fixed overflow-hidden border border-sky-400/30 bg-white/95 shadow-2xl shadow-sky-950/30 backdrop-blur-xl dark:border-cyan-400/20 dark:bg-slate-950/95"
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                borderRadius: box.radius,
                zIndex: 91,
                opacity: panelVisible ? 1 : 0,
                transition: closing ? TRANSITION_CLOSE : TRANSITION_OPEN,
                willChange: 'left, top, width, height, opacity',
              }}
            >
              <div className="flex h-full flex-col">
                <div className={`flex shrink-0 items-center justify-between gap-3 border-b border-sky-500/15 px-4 py-3 transition-opacity duration-150 ${contentOpacity}`}>
                  <div className="flex min-w-0 items-center gap-2 font-mono">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-cyan-300">
                      <Camera className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-bold text-sky-700 dark:text-cyan-300">
                        FIELD NOTES // 风景摄影
                      </div>
                      <div className="text-[9px] text-slate-500">
                        01 STORY · 日月同辉
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={beginClose}
                    className="shrink-0 rounded-lg border border-slate-200/80 p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="收起风景摄影故事"
                    title="收起"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div
                  className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 transition-opacity duration-150 sm:p-4 ${contentOpacity}`}
                >
                  <div className="group relative overflow-hidden rounded-xl border border-sky-500/20 bg-slate-950">
                    <img
                      src={STORY_IMAGE}
                      alt="暮色公路上的月亮与落日"
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                    <span className="absolute left-3 top-3 rounded border border-white/15 bg-slate-950/70 px-2 py-0.5 font-mono text-[9px] text-cyan-200 backdrop-blur-md">
                      AI RECONSTRUCTION
                    </span>
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="font-mono text-[9px] text-cyan-200/80">
                        ALT. 963M · 公路尽头
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-white">
                        日月同辉
                      </h2>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 font-mono text-[9px] text-sky-600 dark:text-cyan-300">
                      <Sparkles className="h-3 w-3" />
                      ONE FRAME / ONE MEMORY
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      旅途中遇到了日月同辉的一幕。受限于车内空间和高速路况，当时很难拍出满意的照片，于是我用 AI 复原了那个画面：后视镜里，月亮低悬在空中；前方，夕阳正沉入地平线。
                    </p>
                    <p className="border-l-2 border-sky-400/40 pl-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      像是周而复始的生命，绵绵不息。或许，这就是旅行的意义。
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['旅途', '日月同辉', 'AI 复原', '风景摄影'].map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-sky-400/20 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[9px] text-sky-700 dark:text-cyan-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`flex shrink-0 items-center justify-between gap-3 border-t border-sky-500/15 px-4 py-2 font-mono text-[9px] text-slate-500 transition-opacity duration-150 ${contentOpacity}`}>
                  <span>[EOF] field note 01</span>
                  <span>click outside to close</span>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
};

export const TerminalPhotoStoryShowcase: React.FC = () => {
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [sourceHidden, setSourceHidden] = useState(false);

  useEffect(
    () => () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
    },
    []
  );

  const openPopup = () => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (cardRef.current) {
      setOriginRect(cardRef.current.getBoundingClientRect());
    }
    setSourceHidden(true);
    setOpen(true);
  };

  const closePopup = () => {
    setOpen(false);
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
    }
    revealTimerRef.current = window.setTimeout(() => {
      setSourceHidden(false);
      revealTimerRef.current = null;
    }, 200);
  };

  return (
    <>
      <button
        ref={cardRef}
        type="button"
        onClick={openPopup}
        style={{ opacity: sourceHidden ? 0 : 1 }}
        className="group flex h-full flex-col gap-2 rounded-xl border border-sky-500/30 bg-white/40 p-3 text-left transition-opacity duration-200 hover:border-sky-400/60 hover:bg-sky-500/5 dark:bg-slate-950/50"
        title="查看风景摄影"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-mono text-[9px] tracking-wider text-sky-700 dark:text-cyan-300">
              FIELD NOTES //
            </div>
            <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              风景摄影
            </h3>
          </div>
          <span className="rounded border border-sky-500/30 bg-sky-500/10 p-1.5 text-sky-600 dark:text-cyan-300">
            <Camera className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="relative h-24 overflow-hidden rounded-lg border border-sky-500/20 bg-slate-950">
          <img
            src={STORY_IMAGE}
            alt="暮色公路上的月亮与落日"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
          <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-cyan-100">
            01 / 日月同辉
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
          在旅途中收集山川、云层与光线，也记下那些来不及按快门的瞬间。
        </p>
        <span className="mt-auto font-mono text-[9px] text-sky-600 transition-colors group-hover:text-sky-500 dark:text-cyan-300">
          $ cat field-note-01.md <span className="animate-pulse">_</span>
        </span>
      </button>

      <TerminalPopup
        open={open}
        originRect={originRect}
        onClose={closePopup}
        accent="sky"
        icon={<Camera className="h-3.5 w-3.5" />}
        title="carlos@libai:~/about/photography"
        subtitle="01 STORY · FIELD NOTES"
        footerLeft="[EOF] field note 01"
        targetHeight={600}
      >
        <div className="group relative overflow-hidden rounded-lg border border-sky-500/25 bg-slate-950">
          <img
            src={STORY_IMAGE}
            alt="暮色公路上的月亮与落日"
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded border border-white/15 bg-slate-950/70 px-2 py-0.5 font-mono text-[9px] text-cyan-200 backdrop-blur-md">
            AI RECONSTRUCTION
          </span>
          <div className="absolute bottom-3 left-3 right-3">
            <div className="font-mono text-[9px] text-cyan-200/80">
              ALT. 963M · 公路尽头
            </div>
            <h2 className="mt-1 text-lg font-bold text-white">日月同辉</h2>
          </div>
        </div>

        <div className="mt-4 space-y-3 font-mono">
          <div className="flex items-center gap-2 text-[9px] text-sky-700 dark:text-cyan-300">
            <Sparkles className="h-3 w-3" />
            ONE FRAME / ONE MEMORY
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            旅途中遇到了日月同辉的一幕。受限于车内空间和高速路况，当时很难拍出满意的照片，于是我用 AI 复原了那个画面：后视镜里，月亮低悬在空中；前方，夕阳正沉入地平线。
          </p>
          <p className="border-l-2 border-sky-400/40 pl-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            像是周而复始的生命，绵绵不息。或许，这就是旅行的意义。
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['旅行', '日月同辉', 'AI 复原', '风景摄影'].map((tag) => (
              <span
                key={tag}
                className="rounded border border-sky-400/20 bg-sky-500/10 px-1.5 py-0.5 text-[9px] text-sky-700 dark:text-cyan-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </TerminalPopup>
    </>
  );
};
