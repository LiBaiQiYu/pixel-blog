import React, { useEffect, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  CornerDownLeft,
  Cpu,
  ExternalLink,
  Gamepad2,
  MapPin,
  Play,
  Swords,
  Terminal,
} from 'lucide-react';
import { AvatarVideoModal } from './AvatarVideoModal';
import { LiquidPixelCard } from './LiquidPixelCard';
import type { ViewMode } from '../types/blog';

interface AboutViewProps {
  viewMode: ViewMode;
  onBackHome: () => void;
}

const DOTA_IMAGE = 'https://about.cwa1e.top/dota.png';
const DOTA_VIDEO = 'https://about.cwa1e.top/dota.mp4';
const CHRONOFRAME_URL = 'https://github.com/HoshinoSuzumi/chronoframe';

const SteamIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
  </svg>
);

const BilibiliIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z" />
  </svg>
);

const DouyinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const SOCIAL_LINKS = [
  { name: 'Steam', Icon: SteamIcon },
  { name: '哔哩哔哩', Icon: BilibiliIcon },
  { name: '抖音', Icon: DouyinIcon },
];

const SocialLinks: React.FC<{ terminal?: boolean }> = ({ terminal = false }) => (
  <div className="flex flex-wrap items-center gap-2">
    {SOCIAL_LINKS.map(({ name, Icon }) => (
      <a
        key={name}
        href="#"
        onClick={(event) => event.preventDefault()}
        title={`${name}（链接待补充）`}
        aria-label={`${name}（链接待补充）`}
        className={
          terminal
            ? 'inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-white/40 px-2 py-1 font-mono text-[10px] text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:bg-slate-950/40 dark:text-emerald-300'
            : 'liquid-pill inline-flex items-center gap-1.5 rounded-full border border-slate-300/60 bg-white/40 px-2.5 py-1.5 font-mono text-[10px] text-slate-600 transition-colors hover:border-sky-400/50 hover:text-sky-600 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:text-cyan-300'
        }
      >
        <Icon className="h-3.5 w-3.5" />
        {name}
      </a>
    ))}
  </div>
);

const HobbyCard: React.FC<{
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ eyebrow, title, children, className = '' }) => (
  <LiquidPixelCard
    accent="violet"
    className={`about-reveal p-4 sm:p-5 space-y-2 transition-transform hover:-translate-y-0.5 ${className}`}
  >
    <div className="font-mono text-[9px] tracking-wider text-violet-600 dark:text-violet-300">
      {eyebrow}
    </div>
    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
    <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      {children}
    </div>
  </LiquidPixelCard>
);

const CountUp: React.FC<{ value: number; suffix?: string }> = ({
  value,
  suffix = '',
}) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplay(value);
      return;
    }

    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 900);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
};

const PixelHeroAvatar: React.FC<{
  kind: 'invoker' | 'yi' | 'ezreal';
}> = ({ kind }) => {
  const common = {
    viewBox: '0 0 16 16',
    shapeRendering: 'crispEdges' as const,
    className: 'h-full w-full pixelated',
    fill: 'none',
  };

  if (kind === 'invoker') {
    return (
      <svg {...common}>
        <rect width="16" height="16" fill="#160F24" />
        <rect x="3" y="2" width="10" height="3" fill="#E2E8F0" />
        <rect x="2" y="4" width="3" height="5" fill="#CBD5E1" />
        <rect x="11" y="4" width="3" height="5" fill="#CBD5E1" />
        <rect x="5" y="4" width="6" height="2" fill="#F8FAFC" />
        <rect x="5" y="6" width="6" height="4" fill="#F1C7A1" />
        <rect x="6" y="7" width="1" height="1" fill="#7DD3FC" />
        <rect x="9" y="7" width="1" height="1" fill="#7DD3FC" />
        <rect x="4" y="10" width="8" height="5" fill="#B91C1C" />
        <rect x="5" y="10" width="6" height="1" fill="#FBBF24" />
        <rect x="6" y="11" width="4" height="3" fill="#7F1D1D" />
        <rect x="11" y="12" width="3" height="3" fill="#A78BFA" />
        <rect x="12" y="12" width="1" height="1" fill="#F5D0FE" />
      </svg>
    );
  }

  if (kind === 'yi') {
    return (
      <svg {...common}>
        <rect width="16" height="16" fill="#0D1A12" />
        <rect x="4" y="1" width="8" height="3" fill="#5B8C2A" />
        <rect x="3" y="3" width="10" height="5" fill="#3F6212" />
        <rect x="5" y="5" width="6" height="3" fill="#D9B15F" />
        <rect x="6" y="6" width="1" height="1" fill="#A3E635" />
        <rect x="9" y="6" width="1" height="1" fill="#A3E635" />
        <rect x="4" y="10" width="8" height="5" fill="#365314" />
        <rect x="5" y="11" width="6" height="2" fill="#65A30D" />
        <rect x="11" y="8" width="2" height="5" fill="#CBD5E1" />
        <rect x="12" y="7" width="1" height="2" fill="#F8FAFC" />
        <rect x="3" y="13" width="2" height="2" fill="#FBBF24" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect width="16" height="16" fill="#0B1526" />
      <rect x="4" y="2" width="8" height="3" fill="#F6D365" />
      <rect x="3" y="4" width="2" height="4" fill="#F6D365" />
      <rect x="11" y="4" width="2" height="3" fill="#F6D365" />
      <rect x="5" y="5" width="6" height="4" fill="#F1C7A1" />
      <rect x="6" y="6" width="1" height="1" fill="#38BDF8" />
      <rect x="9" y="6" width="1" height="1" fill="#38BDF8" />
      <rect x="4" y="9" width="8" height="5" fill="#1D4ED8" />
      <rect x="5" y="10" width="6" height="2" fill="#3B82F6" />
      <rect x="5" y="9" width="6" height="1" fill="#FBBF24" />
      <rect x="11" y="11" width="3" height="3" fill="#FBBF24" />
      <rect x="12" y="11" width="1" height="1" fill="#FEF3C7" />
    </svg>
  );
};

const GameStat: React.FC<{
  game: string;
  hero: string;
  cnName: string;
  value: number;
  icon: React.ReactNode;
  avatar: React.ReactNode;
  delay: number;
}> = ({ game, hero, cnName, value, icon, avatar, delay }) => (
  <div
    className="about-reveal group rounded-xl border border-violet-300/70 bg-white/70 p-3 transition-all hover:border-violet-400/70 hover:bg-white/90 hover:shadow-lg hover:shadow-violet-500/10 dark:border-violet-400/20 dark:bg-slate-950/40 dark:hover:border-violet-400/50 dark:hover:bg-violet-500/5"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center justify-between gap-2 font-mono text-[9px] text-slate-500 dark:text-slate-400">
      <span className="flex items-center gap-1.5 font-semibold text-violet-700 dark:text-violet-300">
        {icon}
        {game}
      </span>
      <span className="transition-transform duration-300 group-hover:translate-x-0.5">
        {cnName}
      </span>
    </div>
    <div className="mt-2 flex items-end justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-violet-500/30 bg-slate-950 shadow-inner">
          {avatar}
        </span>
        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100">
            {hero}
          </div>
          <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-violet-200/80 dark:bg-slate-700/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-400 transition-[width] duration-1000"
              style={{ width: `${Math.min(100, value / 10)}%` }}
            />
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right font-mono text-xl font-bold leading-none text-violet-700 dark:text-violet-200">
        <CountUp value={value} suffix="+" />
        <div className="mt-1 text-[8px] font-normal tracking-wider text-slate-500 dark:text-slate-400">
          GAMES
        </div>
      </div>
    </div>
  </div>
);

export const AboutView: React.FC<AboutViewProps> = ({
  viewMode,
  onBackHome,
}) => {
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoOrigin, setVideoOrigin] = useState<DOMRect | null>(null);

  const openAvatarVideo = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    const image = event.currentTarget.querySelector('img');
    setVideoOrigin(
      image?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()
    );
    setVideoOpen(true);
  };

  if (viewMode === 'terminal') {
    return (
      <>
        <div className="flex w-full flex-1 min-h-0 flex-col">
          <LiquidPixelCard
            accent="emerald"
            strong
            className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden"
            contentClassName="flex-1 min-h-0 flex flex-col"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-500/20 bg-slate-200/70 px-3 py-2.5 dark:border-emerald-400/15 dark:bg-slate-950/85 sm:px-4">
              <div className="flex min-w-0 items-center gap-2 font-mono text-[10px]">
                <span className="flex shrink-0 gap-1">
                  <span className="h-2 w-2 bg-rose-500" />
                  <span className="h-2 w-2 bg-amber-400" />
                  <span className="h-2 w-2 bg-emerald-500" />
                </span>
                <Terminal className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-300" />
                <span className="truncate text-emerald-700 dark:text-emerald-300">
                  carlos@libai:~/about
                </span>
              </div>
              <button
                type="button"
                onClick={onBackHome}
                className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/30 px-1.5 py-1 font-mono text-[9px] text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300"
                title="返回首页"
              >
                <CornerDownLeft className="h-3 w-3" />
                cd ~
              </button>
            </div>

            <div className="shrink-0 border-b border-emerald-500/15 px-3 py-2 font-mono text-[10px] text-slate-500 dark:text-slate-400 sm:px-4">
              <span className="text-slate-400 dark:text-slate-500">carlos@libai</span>
              <span className="text-slate-500">:</span>
              <span className="text-cyan-600 dark:text-cyan-300">~/about</span>
              <span className="text-slate-500">$ </span>
              <span className="text-emerald-700 dark:text-emerald-300">cat about.md</span>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 font-mono text-xs sm:p-6">
              <section className="about-reveal flex justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={openAvatarVideo}
                  className="group relative w-40 shrink-0 rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-1.5 text-left transition-all hover:border-emerald-300/70 hover:bg-emerald-500/10 sm:w-48"
                  title="播放虚拟形象视频"
                >
                  <span className="pointer-events-none absolute left-1 top-1 h-2 w-2 border-l border-t border-emerald-300/80" />
                  <span className="pointer-events-none absolute right-1 top-1 h-2 w-2 border-r border-t border-emerald-300/80" />
                  <span className="pointer-events-none absolute bottom-1 left-1 h-2 w-2 border-b border-l border-emerald-300/80" />
                  <span className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 border-b border-r border-emerald-300/80" />
                  <span className="relative block overflow-hidden rounded-lg bg-slate-950">
                    <img
                      src={DOTA_IMAGE}
                      alt="CarlosWhite 虚拟形象"
                      className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors duration-300 group-hover:bg-slate-950/25 group-focus-visible:bg-slate-950/25">
                      <span className="flex h-10 w-10 scale-90 items-center justify-center rounded-full border border-white/25 bg-slate-950/60 text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
                        <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
                      </span>
                    </span>
                  </span>
                </button>
              </section>

              <section className="space-y-1">
                <p className="text-emerald-600 dark:text-emerald-300"># whoami</p>
                <h1 className="text-base font-bold text-slate-900 dark:text-white">
                  CarlosWhite — 前端开发者
                </h1>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3 w-3 text-cyan-500" />
                  现居乌鲁木齐
                </p>
                <p className="pt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  喜欢把界面、动效和像素细节打磨到刚刚好。
                </p>
              </section>

              <section className="space-y-2">
                <p className="text-emerald-600 dark:text-emerald-300"># interests</p>
                <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <p>
                    <span className="text-cyan-600 dark:text-cyan-300">DOTA2:</span>{' '}
                    游戏群里常用「黑鸟大神」这个昵称，最近沉迷 LOL 的海克斯大乱斗。
                  </p>
                  <p>
                    <span className="text-cyan-600 dark:text-cyan-300">摄影:</span>{' '}
                    喜欢风景摄影，收集山川、云层和日落。
                  </p>
                  <p>
                    <span className="text-cyan-600 dark:text-cyan-300">设备:</span>{' '}
                    喜欢收集电子设备。
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-emerald-600 dark:text-emerald-300"># game_stats</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded border border-emerald-500/20 bg-white/40 p-2 dark:bg-slate-950/40">
                    <div className="text-[8px] text-slate-500">DOTA2</div>
                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">INVOKER</div>
                    <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">1000+</div>
                  </div>
                  <div className="rounded border border-emerald-500/20 bg-white/40 p-2 dark:bg-slate-950/40">
                    <div className="text-[8px] text-slate-500">LOL</div>
                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">MASTER YI</div>
                    <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">300+</div>
                  </div>
                  <div className="rounded border border-emerald-500/20 bg-white/40 p-2 dark:bg-slate-950/40">
                    <div className="text-[8px] text-slate-500">LOL</div>
                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">EZREAL</div>
                    <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">300+</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  很喜欢这种灵动飘逸的英雄角色。
                </p>
              </section>

              <section className="space-y-2 border-l-2 border-emerald-500/40 pl-3">
                <p className="text-emerald-600 dark:text-emerald-300"># dream</p>
                <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
                  希望有一天能匹配到 Topson，来一场真正的中单博弈。
                </p>
              </section>

              <section className="space-y-2">
                <p className="text-emerald-600 dark:text-emerald-300"># credits</p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  本项目画廊的灵感与理念来源于{' '}
                  <a
                    href={CHRONOFRAME_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-600 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-500 dark:text-cyan-300"
                  >
                    ChronoFrame
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                  ，感谢开源。
                </p>
              </section>

              <section className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/15 pt-3">
                <span className="text-[10px] text-slate-500"># social</span>
                <SocialLinks terminal />
              </section>
            </div>
          </LiquidPixelCard>
        </div>
        {videoOpen && (
          <AvatarVideoModal
            open
            originRect={videoOrigin}
            imageUrl={DOTA_IMAGE}
            videoUrl={DOTA_VIDEO}
            onClose={() => setVideoOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-16">
        <div className="flex items-center gap-2 px-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ChevronLeft className="h-3 w-3" />
            首页
          </button>
          <span className="text-slate-400/60">/</span>
          <span className="text-sky-600 dark:text-cyan-300">关于我</span>
        </div>

        <LiquidPixelCard
          accent="violet"
          className="about-reveal relative overflow-hidden p-5 sm:p-7"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl animate-pulse-glow" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative grid items-center gap-6 lg:grid-cols-[260px_1fr]">
            <div className="mx-auto w-full max-w-[280px]">
              <button
                type="button"
                onClick={openAvatarVideo}
                className="group relative block w-full rounded-2xl border border-violet-400/35 bg-violet-500/5 p-1.5 text-left shadow-lg shadow-violet-500/10 transition-all hover:-translate-y-1 hover:border-violet-300/70 hover:bg-violet-500/10 hover:shadow-xl hover:shadow-violet-500/20"
                title="播放虚拟形象视频"
              >
                <span className="pointer-events-none absolute left-1 top-1 z-10 h-2.5 w-2.5 border-l-2 border-t-2 border-violet-300/80" />
                <span className="pointer-events-none absolute right-1 top-1 z-10 h-2.5 w-2.5 border-r-2 border-t-2 border-violet-300/80" />
                <span className="pointer-events-none absolute bottom-1 left-1 z-10 h-2.5 w-2.5 border-b-2 border-l-2 border-violet-300/80" />
                <span className="pointer-events-none absolute bottom-1 right-1 z-10 h-2.5 w-2.5 border-b-2 border-r-2 border-violet-300/80" />
                <span className="relative block overflow-hidden rounded-xl bg-slate-950">
                  <img
                    src={DOTA_IMAGE}
                    alt="CarlosWhite 虚拟形象"
                    className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors duration-300 group-hover:bg-slate-950/25 group-focus-visible:bg-slate-950/25">
                    <span className="flex h-14 w-14 scale-90 items-center justify-center rounded-full border border-white/25 bg-slate-950/60 text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
                      <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                    </span>
                  </span>
                </span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-violet-600 dark:text-violet-300">
                <Terminal className="h-3 w-3" />
                PROFILE // 关于我
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                CarlosWhite
              </h1>
              <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                <MapPin className="h-3 w-3 text-sky-500" />
                前端开发者 · 乌鲁木齐
              </p>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                我是一个前端开发者，现居乌鲁木齐。喜欢把界面、动效和像素细节打磨到刚刚好。
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['前端开发', 'DOTA2', '风景摄影', '电子设备'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] text-violet-700 transition-transform hover:-translate-y-0.5 dark:text-violet-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </LiquidPixelCard>

        <LiquidPixelCard accent="magenta" className="about-reveal p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="font-mono text-[9px] tracking-wider text-pink-600 dark:text-pink-300">
                GAMER PROFILE // 玩家档案
              </div>
              <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                黑鸟大神的主场
              </h2>
            </div>
            <span className="font-mono text-[9px] text-slate-500">
              agile heroes enjoyer
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <GameStat
              game="DOTA2"
              hero="Invoker / 祈求者"
              cnName="MAIN"
              value={1000}
              delay={80}
              icon={<Swords className="h-3 w-3" />}
              avatar={<PixelHeroAvatar kind="invoker" />}
            />
            <GameStat
              game="LOL"
              hero="Master Yi / 无极剑圣"
              cnName="300+"
              value={300}
              delay={160}
              icon={<Gamepad2 className="h-3 w-3" />}
              avatar={<PixelHeroAvatar kind="yi" />}
            />
            <GameStat
              game="LOL"
              hero="Ezreal / 伊泽瑞尔"
              cnName="300+"
              value={300}
              delay={240}
              icon={<Gamepad2 className="h-3 w-3" />}
              avatar={<PixelHeroAvatar kind="ezreal" />}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            游戏群里常用「黑鸟大神」这个昵称，最近沉迷 LOL 的海克斯大乱斗；很喜欢这种灵动飘逸的英雄角色。
          </p>
        </LiquidPixelCard>

        <div className="grid gap-4 md:grid-cols-2">
          <HobbyCard eyebrow="PHOTOGRAPHY" title="风景摄影">
            <span className="mb-2 flex items-center gap-1.5 text-sky-600 dark:text-cyan-300">
              <Camera className="h-3.5 w-3.5" />
              LANDSCAPE / LIGHT
            </span>
            喜欢风景摄影，收集山川、云层和日落。
          </HobbyCard>
          <HobbyCard eyebrow="GEAR / COLLECTION" title="电子设备收藏">
            <span className="mb-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
              <Cpu className="h-3.5 w-3.5" />
              GADGETS / HARDWARE
            </span>
            喜欢收集各种电子设备，也喜欢研究它们背后的交互与细节。
          </HobbyCard>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <LiquidPixelCard
            accent="violet"
            className="about-reveal relative overflow-hidden p-5 sm:p-6"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 font-mono text-[100px] leading-none text-violet-500/10">
              “
            </div>
            <div className="relative space-y-2">
              <div className="font-mono text-[9px] tracking-wider text-violet-600 dark:text-violet-300">
                MID LANE DREAM
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                想和 Topson 对一局
              </h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                希望有一天能匹配到 Topson，来一场真正的中单博弈。
              </p>
            </div>
          </LiquidPixelCard>

          <LiquidPixelCard
            accent="cyan"
            className="about-reveal p-5 sm:p-6 space-y-2"
          >
            <div className="font-mono text-[9px] tracking-wider text-sky-600 dark:text-cyan-300">
              GALLERY CREDITS
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              灵感来自 ChronoFrame
            </h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              本项目画廊的灵感与理念来源于 ChronoFrame 项目，感谢开源。
            </p>
            <a
              href={CHRONOFRAME_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1.5 font-mono text-[10px] text-sky-700 transition-colors hover:bg-sky-500/20 dark:text-cyan-200"
            >
              HoshinoSuzumi/chronoframe
              <ExternalLink className="h-3 w-3" />
            </a>
          </LiquidPixelCard>
        </div>

        <div className="about-reveal flex flex-col gap-3 rounded-2xl border border-slate-300/50 bg-white/30 px-4 py-3 dark:border-white/10 dark:bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <Gamepad2 className="h-3.5 w-3.5 text-violet-500" />
            FIND ME // 社交
          </div>
          <SocialLinks />
        </div>
      </div>
      {videoOpen && (
        <AvatarVideoModal
          open
          originRect={videoOrigin}
          imageUrl={DOTA_IMAGE}
          videoUrl={DOTA_VIDEO}
          onClose={() => setVideoOpen(false)}
        />
      )}
    </>
  );
};
