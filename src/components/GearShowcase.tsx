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
  Zap,
} from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';
import { TerminalPopup } from './TerminalPopup';

type BrandKey =
  | 'apple'
  | 'intel'
  | 'logitech'
  | 'razer'
  | 'hisense'
  | 'keychron'
  | 'royal-kludge'
  | 'cuktech'
  | 'ugreen'
  | 'unknown';

const BRAND_META: Record<
  BrandKey,
  { label: string; badge: string }
> = {
  apple: {
    label: 'APPLE',
    badge:
      'border-slate-400/40 bg-slate-900 text-white dark:border-white/20',
  },
  intel: {
    label: 'INTEL',
    badge: 'border-sky-300/50 bg-sky-600 text-white',
  },
  logitech: {
    label: 'LOGITECH',
    badge: 'border-cyan-300/50 bg-cyan-500 text-slate-950',
  },
  razer: {
    label: 'RAZER',
    badge: 'border-lime-300/50 bg-lime-500 text-slate-950',
  },
  hisense: {
    label: 'HISENSE',
    badge: 'border-rose-300/50 bg-rose-500 text-white',
  },
  keychron: {
    label: 'KEYCHRON',
    badge: 'border-slate-400/40 bg-slate-800 text-white',
  },
  'royal-kludge': {
    label: 'ROYAL KLUDGE',
    badge: 'border-violet-300/50 bg-violet-600 text-white',
  },
  cuktech: {
    label: 'CUKTECH',
    badge: 'border-orange-300/50 bg-orange-500 text-slate-950',
  },
  ugreen: {
    label: 'UGREEN',
    badge: 'border-emerald-300/50 bg-emerald-500 text-slate-950',
  },
  unknown: {
    label: 'OTHER',
    badge:
      'border-dashed border-amber-400/60 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  },
};

const BrandLogo: React.FC<{ brand: BrandKey }> = ({ brand }) => {
  const meta = BRAND_META[brand] ?? BRAND_META.unknown;

  return (
    <span
      className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border shadow-sm ${meta.badge}`}
      title={meta.label}
      aria-label={`${meta.label} 品牌`}
    >
      {brand === 'apple' ? (
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
        </svg>
      ) : brand === 'razer' ? (
        <svg
          viewBox="0 0 18 18"
          className="h-3 w-3"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M2 4h4l8 10H9L2 4Zm6 0h4l4 5h-4L8 4Z" />
        </svg>
      ) : brand === 'intel' ? (
        <span className="text-[6px] font-black leading-none tracking-tighter">
          in
        </span>
      ) : brand === 'logitech' ? (
        <span className="text-[9px] font-black leading-none">G</span>
      ) : brand === 'hisense' ? (
        <span className="text-[7px] font-black leading-none">H</span>
      ) : brand === 'keychron' ? (
        <span className="text-[9px] font-black leading-none">K</span>
      ) : brand === 'royal-kludge' ? (
        <span className="text-[6px] font-black leading-none tracking-tighter">
          RK
        </span>
      ) : brand === 'cuktech' ? (
        <span className="text-[8px] font-black leading-none">C</span>
      ) : brand === 'ugreen' ? (
        <span className="text-[6px] font-black leading-none tracking-tighter">
          UG
        </span>
      ) : (
        <span className="font-mono text-[10px] font-bold leading-none">?</span>
      )}
    </span>
  );
};

interface DeviceColor {
  zh: string;
  en: string;
  hex: string;
  hex2?: string;
}

interface Device {
  category: string;
  brand: BrandKey;
  nameZh: string;
  nameEn: string;
  detail: string;
  color?: DeviceColor;
  icon: React.ReactNode;
}

const ColorInfo: React.FC<{ color?: DeviceColor }> = ({ color }) => {
  if (!color) return null;

  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-slate-500 dark:text-slate-400">
      <span>
        {color.zh} / {color.en}
      </span>
      <span
        className={`h-2.5 shrink-0 rounded-[2px] border border-slate-400/60 shadow-inner dark:border-white/30 ${
          color.hex2 ? 'w-3.5' : 'w-2.5'
        }`}
        style={{
          background: color.hex2
            ? `linear-gradient(to right, ${color.hex} 0 50%, ${color.hex2} 50% 100%)`
            : color.hex,
        }}
        title={`${color.zh} / ${color.en}`}
      />
    </div>
  );
};

const DEVICES: Device[] = [
  {
    category: 'PHONE',
    brand: 'apple',
    nameZh: 'iPhone 17',
    nameEn: 'iPhone 17',
    detail: '256GB',
    color: { zh: '白色', en: 'White', hex: '#f8fafc' },
    icon: <Smartphone className="h-4 w-4" />,
  },
  {
    category: 'LAPTOP',
    brand: 'apple',
    nameZh: 'MacBook Neo',
    nameEn: 'MacBook Neo',
    detail: '512GB',
    color: { zh: '柑橘黄色', en: 'Citrus', hex: '#d6d96a' },
    icon: <Laptop className="h-4 w-4" />,
  },
  {
    category: 'LAPTOP',
    brand: 'apple',
    nameZh: 'MacBook Pro（M1 Max）',
    nameEn: 'MacBook Pro (M1 Max)',
    detail: '32GB 统一内存 · 512GB',
    color: { zh: '银色', en: 'Silver', hex: '#e5e7eb' },
    icon: <Laptop className="h-4 w-4" />,
  },
  {
    category: 'DESKTOP',
    brand: 'intel',
    nameZh: 'Intel NUC13 Extreme 猛禽峡谷',
    nameEn: 'Intel NUC 13 Extreme Raptor Canyon',
    detail: 'i9-13900K · 64GB DDR5 · 3×1TB · RTX 4080 FE 16G 公版',
    color: { zh: '黑色', en: 'Black', hex: '#111827' },
    icon: <Cpu className="h-4 w-4" />,
  },
  {
    category: 'DISPLAY',
    brand: 'hisense',
    nameZh: '海信 GX 27 英寸 2027 款 Mini LED 显示器',
    nameEn: 'Hisense GX 27-inch (2027) Mini LED Monitor',
    detail: 'XDR2000 · 2304 分区 · 玻璃基',
    color: {
      zh: '正面黑色 / 背面白色',
      en: 'Front Black / Back White',
      hex: '#111827',
      hex2: '#f8fafc',
    },
    icon: <Monitor className="h-4 w-4" />,
  },
  {
    category: 'MOUSE',
    brand: 'logitech',
    nameZh: '罗技 G102 Prodigy 游戏鼠标',
    nameEn: 'Logitech G102 Prodigy Gaming Mouse',
    detail: '第一代',
    color: { zh: '黑色', en: 'Black', hex: '#111827' },
    icon: <Mouse className="h-4 w-4" />,
  },
  {
    category: 'MOUSE',
    brand: 'logitech',
    nameZh: '罗技 G102 Prodigy 游戏鼠标',
    nameEn: 'Logitech G102 Prodigy Gaming Mouse',
    detail: '第一代',
    color: { zh: '白色', en: 'White', hex: '#f8fafc' },
    icon: <Mouse className="h-4 w-4" />,
  },
  {
    category: 'MOUSE',
    brand: 'logitech',
    nameZh: '罗技 G102 LIGHTSYNC 游戏鼠标',
    nameEn: 'Logitech G102 LIGHTSYNC Gaming Mouse',
    detail: '第二代',
    color: { zh: '蓝色', en: 'Blue', hex: '#3b82f6' },
    icon: <Mouse className="h-4 w-4" />,
  },
  {
    category: 'MOUSE',
    brand: 'logitech',
    nameZh: '罗技 MX Master 3S',
    nameEn: 'Logitech MX Master 3S',
    detail: '办公',
    color: { zh: '黑色', en: 'Black', hex: '#111827' },
    icon: <Mouse className="h-4 w-4" />,
  },
  {
    category: 'KEYBOARD',
    brand: 'razer',
    nameZh: '雷蛇黑寡妇蜘蛛 V4 75% 键盘',
    nameEn: 'Razer BlackWidow V4 75%',
    detail: '75% 配列 · 热插拔',
    color: { zh: '白色', en: 'White', hex: '#f8fafc' },
    icon: <Keyboard className="h-4 w-4" />,
  },
  {
    category: 'KEYBOARD',
    brand: 'keychron',
    nameZh: 'Keychron 京东京造版 K2',
    nameEn: 'Keychron K2 (JD Edition)',
    detail: '84 配列 · 热插拔 · Gateron G Silver Pro · 办公',
    icon: <Keyboard className="h-4 w-4" />,
  },
  {
    category: 'KEYBOARD',
    brand: 'royal-kludge',
    nameZh: 'RK R98',
    nameEn: 'Royal Kludge R98',
    detail: '98 配列 · 热插拔 · 风铃轴 · Razer PBT 白色键帽',
    color: { zh: '白色', en: 'White', hex: '#f8fafc' },
    icon: <Keyboard className="h-4 w-4" />,
  },
  {
    category: 'KEYBOARD',
    brand: 'royal-kludge',
    nameZh: 'RK R75',
    nameEn: 'Royal Kludge R75',
    detail: '75% 配列 · 热插拔 · 烟雨轴 · Pixel XDA 键帽',
    color: { zh: '白色', en: 'White', hex: '#f8fafc' },
    icon: <Keyboard className="h-4 w-4" />,
  },
  {
    category: 'CHARGER',
    brand: 'cuktech',
    nameZh: '酷态科 65W 氮化镓充电器 AD653C',
    nameEn: 'CUKTECH 65W GaN Charger AD653C',
    detail: '65W · GaN',
    color: {
      zh: '灰色 / 黑色',
      en: 'Gray / Black',
      hex: '#6b7280',
      hex2: '#111827',
    },
    icon: <Zap className="h-4 w-4" />,
  },
  {
    category: 'CHARGER',
    brand: 'cuktech',
    nameZh: '酷态科 30 号 Ultra 充电器',
    nameEn: 'CUKTECH 30 Ultra Charger',
    detail: '300W · 屏幕 · 5525 电源口',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    category: 'CHARGER',
    brand: 'cuktech',
    nameZh: '酷态科 10 号 Ultra 充电器',
    nameEn: 'CUKTECH 10 Ultra Charger',
    detail: '屏幕 · 支持米家',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    category: 'CHARGER',
    brand: 'cuktech',
    nameZh: '酷态科 6 号 Ultra 充电器',
    nameEn: 'CUKTECH 6 Ultra Charger',
    detail: '屏幕 · 支持 AVS',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    category: 'CHARGER',
    brand: 'ugreen',
    nameZh: '绿联 45W 屏显充电器 X740',
    nameEn: 'UGREEN 45W Display Charger X740',
    detail: '45W · 屏幕显示',
    icon: <Zap className="h-4 w-4" />,
  },
];

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
              aria-label="我的电子产品柜"
              className="fixed overflow-hidden border border-emerald-400/30 bg-white/95 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl dark:border-emerald-400/20 dark:bg-slate-950/95"
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
                <div className={`flex shrink-0 items-center justify-between gap-3 border-b border-emerald-500/20 px-4 py-3 transition-opacity duration-150 ${contentOpacity}`}>
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
                  className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 transition-opacity duration-150 sm:p-4 ${contentOpacity}`}
                >
                  <div className="mb-2 flex items-center gap-2 font-mono text-[9px] text-slate-500">
                    <span className="h-1.5 w-1.5 bg-emerald-400" />
                    正在服役 / CURRENTLY IN SERVICE
                  </div>
                  <div className="space-y-2">
                    {DEVICES.map((device, index) => (
                      <div
                        key={`${device.category}-${device.nameEn}-${device.detail}-${device.color?.en ?? 'none'}`}
                        className="about-reveal flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 dark:border-white/10 dark:bg-white/[0.035]"
                        style={{ animationDelay: `${index * 35}ms` }}
                      >
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-slate-950 text-emerald-300">
                          {device.icon}
                          <span className="absolute -bottom-1 -right-1">
                            <BrandLogo brand={device.brand} />
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white">
                              {device.nameZh}
                            </span>
                            <span className="font-mono text-[8px] text-slate-400">
                              {BRAND_META[device.brand].label} · {device.category}
                            </span>
                          </div>
                          <div className="truncate font-mono text-[9px] text-slate-500">
                            {device.nameEn}
                          </div>
                          <ColorInfo color={device.color} />
                        </div>
                        <div className="max-w-[46%] shrink-0 text-right">
                          <div className="font-mono text-[9px] leading-relaxed text-slate-500">
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

                <div className={`flex shrink-0 items-center justify-between gap-3 border-t border-emerald-500/15 px-4 py-2 font-mono text-[9px] text-slate-500 transition-opacity duration-150 ${contentOpacity}`}>
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

export const TerminalGearShowcase: React.FC = () => {
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
        className="group flex h-full flex-col gap-2 rounded-xl border border-emerald-500/30 bg-white/40 p-3 text-left transition-opacity duration-200 hover:border-emerald-400/60 hover:bg-emerald-500/5 dark:bg-slate-950/50"
        title="查看电子产品柜"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-mono text-[9px] tracking-wider text-emerald-700 dark:text-emerald-300">
              GEAR CABINET //
            </div>
            <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              我的电子产品柜
            </h3>
          </div>
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-700 dark:text-emerald-300">
            {DEVICES.length.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-700 dark:text-cyan-300">
          <Cpu className="h-3.5 w-3.5" />
          gadgets / hardware
        </div>
        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
          正在服役的手机、电脑、显示器与外设，以及那些留下深刻印象的设备。
        </p>
        <span className="mt-auto font-mono text-[9px] text-emerald-600 transition-colors group-hover:text-emerald-500 dark:text-emerald-300">
          $ cat gear.log <span className="animate-pulse">_</span>
        </span>
      </button>

      <TerminalPopup
        open={open}
        originRect={originRect}
        onClose={closePopup}
        accent="emerald"
        icon={<Cpu className="h-3.5 w-3.5" />}
        title="carlos@libai:~/about/gear"
        subtitle={`${DEVICES.length} DEVICES · ACTIVE`}
        footerLeft="[EOF] gear inventory"
        targetHeight={570}
      >
        <div className="space-y-2">
          <div className="mb-1 font-mono text-[10px] text-slate-500">
            <span className="text-emerald-700 dark:text-emerald-400">$</span>{' '}
            ls -la ~/devices
          </div>
          {DEVICES.map((device) => (
            <div
              key={`${device.category}-${device.nameEn}-${device.detail}-${device.color?.en ?? 'none'}`}
              className="flex items-center gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03] p-2.5"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded border border-emerald-500/25 bg-slate-900 text-emerald-300">
                {device.icon}
                <span className="absolute -bottom-1 -right-1">
                  <BrandLogo brand={device.brand} />
                </span>
              </span>
              <div className="min-w-0 flex-1 font-mono">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                    {device.nameZh}
                  </span>
                  <span className="text-[8px] text-emerald-700 dark:text-emerald-400">
                    {BRAND_META[device.brand].label} · {device.category}
                  </span>
                </div>
                <div className="truncate text-[9px] text-slate-500">
                  {device.nameEn}
                </div>
                <ColorInfo color={device.color} />
              </div>
              <div className="max-w-[46%] shrink-0 text-right font-mono text-[9px] leading-relaxed text-slate-500 dark:text-slate-400">
                {device.detail}
              </div>
            </div>
          ))}
        </div>
      </TerminalPopup>
    </>
  );
};
