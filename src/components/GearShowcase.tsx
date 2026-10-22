import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Cpu,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  Smartphone,
  X,
} from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';

interface Device {
  category: string;
  nameZh: string;
  nameEn: string;
  detail: string;
  icon: React.ReactNode;
}

const DEVICES: Device[] = [
  {
    category: 'PHONE',
    nameZh: 'iPhone 17',
    nameEn: 'iPhone 17',
    detail: '白色 · 256GB',
    icon: <Smartphone className="h-4 w-4" />,
  },
  {
    category: 'LAPTOP',
    nameZh: 'MacBook Neo',
    nameEn: 'MacBook Neo',
    detail: '黄色 · 512GB',
    icon: <Laptop className="h-4 w-4" />,
  },
  {
    category: 'LAPTOP',
    nameZh: 'MacBook Pro（M1 Max）',
    nameEn: 'MacBook Pro (M1 Max)',
    detail: '32GB 统一内存 · 512GB',
    icon: <Laptop className="h-4 w-4" />,
  },
  {
    category: 'DISPLAY',
    nameZh: '海信 GX 27 英寸 2027 款 Mini LED 显示器',
    nameEn: 'Hisense GX 27-inch (2027) Mini LED Monitor',
    detail: '27 英寸 · Mini LED',
    icon: <Monitor className="h-4 w-4" />,
  },
  {
    category: 'MOUSE',
    nameZh: '罗技 G102 Prodigy 游戏鼠标',
    nameEn: 'Logitech G102 Prodigy Gaming Mouse',
    detail: '黑色 · 第一代',
    icon: <Mouse className="h-4 w-4" />,
  },
  {
    category: 'MOUSE',
    nameZh: '罗技 G102 Prodigy 游戏鼠标',
    nameEn: 'Logitech G102 Prodigy Gaming Mouse',
    detail: '白色 · 第一代',
    icon: <Mouse className="h-4 w-4" />,
  },
  {
    category: 'MOUSE',
    nameZh: '罗技 G102 LIGHTSYNC 游戏鼠标',
    nameEn: 'Logitech G102 LIGHTSYNC Gaming Mouse',
    detail: '蓝色 · 第二代',
    icon: <Mouse className="h-4 w-4" />,
  },
  {
    category: 'KEYBOARD',
    nameZh: '雷蛇黑寡妇蜘蛛 V4 75% 键盘',
    nameEn: 'Razer BlackWidow V4 75%',
    detail: '75% 配列',
    icon: <Keyboard className="h-4 w-4" />,
  },
];

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

const TRANSITION =
  'left 650ms cubic-bezier(0.16, 1, 0.3, 1), top 650ms cubic-bezier(0.16, 1, 0.3, 1), width 650ms cubic-bezier(0.16, 1, 0.3, 1), height 650ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 650ms cubic-bezier(0.16, 1, 0.3, 1)';


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
  const height = Math.min(570, viewportHeight - 48);
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

export const GearShowcase: React.FC = () => {
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [expanded, setExpanded] = useState(false);

  const clearFinishTimer = () => {
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
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
    setOpen(true);
  };

  const beginClose = () => {
    if (!open || closing) return;
    clearFinishTimer();
    setClosing(true);
    setExpanded(false);
    if (origin) setBox(toBox(origin));
    finishTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      finishTimerRef.current = null;
    }, 700);
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
        setBox(getTargetBox(origin));
        finishTimerRef.current = window.setTimeout(() => {
          setExpanded(true);
          finishTimerRef.current = null;
        }, 300);
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
        className="group block h-full w-full text-left focus:outline-none"
        title="查看我的电子产品柜"
      >
        <LiquidPixelCard
          accent="emerald"
          className="about-reveal flex h-full flex-col gap-2 p-4 sm:p-5 transition-transform group-hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-[9px] tracking-wider text-emerald-600 dark:text-emerald-300">
                GEAR / CABINET
              </div>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                我的电子产品柜
              </h3>
            </div>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-700 dark:text-emerald-300">
              {DEVICES.length.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-cyan-300">
            <Cpu className="h-3.5 w-3.5" />
            GADGETS / HARDWARE
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            正在服役的手机、电脑、显示器与外设，以及那些留下深刻印象的设备。
          </p>
          <span className="mt-auto inline-flex items-center gap-1 font-mono text-[9px] text-slate-400 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
            CLICK TO OPEN →
          </span>
        </LiquidPixelCard>
      </button>

      {(open || closing) &&
        box &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[78] bg-slate-950/25 transition-opacity duration-300"
              style={{ opacity: expanded ? 1 : 0 }}
              onClick={beginClose}
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal
              aria-label="我的电子产品柜"
              className="fixed overflow-hidden border border-emerald-400/30 bg-white/95 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl dark:border-emerald-400/20 dark:bg-slate-950/95"
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                borderRadius: box.radius,
                zIndex: 80,
                transition: TRANSITION,
                willChange: 'left, top, width, height',
              }}
            >
              <div className="flex h-full flex-col">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-emerald-500/20 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2 font-mono">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <Cpu className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        GEAR CABINET // 我的电子产品柜
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {DEVICES.length} DEVICES · ACTIVE
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={beginClose}
                    className="shrink-0 rounded-lg border border-slate-200/80 p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="收起我的电子产品柜"
                    title="收起"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div
                  className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 transition-opacity duration-300 sm:p-4 ${
                    expanded ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2 font-mono text-[9px] text-slate-500">
                    <span className="h-1.5 w-1.5 bg-emerald-400" />
                    正在服役 / CURRENTLY IN SERVICE
                  </div>
                  <div className="space-y-2">
                    {DEVICES.map((device, index) => (
                      <div
                        key={`${device.category}-${device.detail}`}
                        className="about-reveal flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 dark:border-white/10 dark:bg-white/[0.035]"
                        style={{ animationDelay: `${index * 35}ms` }}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-slate-950 text-emerald-300">
                          {device.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white">
                              {device.nameZh}
                            </span>
                            <span className="font-mono text-[8px] text-slate-400">
                              {device.category}
                            </span>
                          </div>
                          <div className="truncate font-mono text-[9px] text-slate-500">
                            {device.nameEn}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-[9px] text-slate-500">
                            {device.detail}
                          </div>
                          <div className="mt-1 font-mono text-[8px] text-emerald-600 dark:text-emerald-400">
                            ACTIVE
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-emerald-500/15 px-4 py-2 font-mono text-[9px] text-slate-500">
                  <span>[EOF] gear inventory</span>
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
