'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Link2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';
import { FriendAvatar } from './FriendAvatar';
import { FriendApplyModal } from './FriendApplyModal';
import { fetchFriends, type FriendLink } from '../lib/friends';
import { pixelAudio } from '../utils/sound';

type FriendAccent = 'cyan' | 'magenta' | 'emerald' | 'amber' | 'violet';

const ACCENTS: FriendAccent[] = [
  'violet',
  'cyan',
  'magenta',
  'emerald',
  'amber',
];

function accentForSeed(seed: number): FriendAccent {
  return ACCENTS[Math.abs(Math.floor(seed)) % ACCENTS.length];
}

const HERO_CLOUDS = [
  [250, 120, 120, 12, '#E4F2FF', 0.95],
  [300, 96, 180, 18, '#F6F2FF', 0.9],
  [370, 132, 150, 16, '#DFEEFF', 0.85],
  [450, 92, 170, 22, '#F5EFFF', 0.88],
  [520, 124, 150, 18, '#E5F4FF', 0.82],
  [190, 150, 90, 14, '#C9E9F8', 0.8],
  [280, 150, 200, 20, '#D9EEFF', 0.66],
  [410, 155, 180, 18, '#E3F0FF', 0.72],
  [560, 150, 120, 14, '#D8EAFB', 0.72],
  [330, 178, 130, 16, '#C9E7F8', 0.58],
  [470, 182, 170, 18, '#E5EDFF', 0.56],
] as const;

const FriendHeroArt: React.FC = () => (
  <svg
    viewBox="0 0 760 300"
    preserveAspectRatio="xMaxYMid slice"
    className="h-full w-full"
    aria-hidden="true"
    shapeRendering="crispEdges"
  >
    <defs>
      <linearGradient id="friends-hero-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#D9EFFF" />
        <stop offset="55%" stopColor="#E7E6FF" />
        <stop offset="100%" stopColor="#F4DDEB" />
      </linearGradient>
      <linearGradient id="friends-hero-mountain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A7B8E5" />
        <stop offset="100%" stopColor="#7A87C7" />
      </linearGradient>
    </defs>
    <rect width="760" height="300" fill="url(#friends-hero-sky)" />
    <circle cx="558" cy="122" r="34" fill="#FFF1B8" opacity="0.9" />
    <circle cx="558" cy="122" r="22" fill="#FFFDF0" />
    {HERO_CLOUDS.map(([x, y, width, height, color, opacity], index) => (
      <React.Fragment key={`${x}-${y}-${index}`}>
        <rect x={x} y={y} width={width} height={height} fill={color} opacity={opacity} />
        <rect
          x={x + 16}
          y={y - 8}
          width={Math.max(20, width - 58)}
          height={12}
          fill={color}
          opacity={opacity * 0.7}
        />
        <rect
          x={x + 42}
          y={y + height}
          width={Math.max(18, width - 100)}
          height={8}
          fill="#FFFFFF"
          opacity={opacity * 0.45}
        />
      </React.Fragment>
    ))}
    <path d="M0 248 L90 208 L160 230 L242 198 L322 238 L414 210 L498 242 L590 214 L680 234 L760 208 L760 300 L0 300 Z" fill="url(#friends-hero-mountain)" opacity="0.8" />
    <path d="M0 266 L110 246 L190 264 L292 236 L390 266 L468 246 L560 262 L650 244 L760 258 L760 300 L0 300 Z" fill="#7180BE" opacity="0.55" />
    <g>
      <rect x="608" y="254" width="96" height="8" fill="#3B456F" opacity="0.22" />
      <g fill="#3B456F">
        <rect x="668" y="236" width="8" height="16" />
        <rect x="676" y="228" width="12" height="12" />
        <rect x="684" y="216" width="12" height="16" />
        <rect x="692" y="204" width="8" height="16" />
        <rect x="688" y="200" width="8" height="8" />
      </g>
      <g fill="#E8BC80">
        <rect x="672" y="240" width="8" height="8" />
        <rect x="680" y="232" width="8" height="8" />
        <rect x="688" y="220" width="8" height="12" />
        <rect x="696" y="208" width="4" height="12" />
        <rect x="692" y="204" width="4" height="4" />
      </g>
      <g fill="#D49A5A">
        <rect x="680" y="236" width="4" height="4" />
        <rect x="688" y="224" width="4" height="4" />
        <rect x="696" y="212" width="4" height="4" />
      </g>
      <path
        d="M624 212 H672 V216 H676 V228 H680 V252 H676 V260 H620 V252 H616 V228 H620 V216 H624 Z"
        fill="#3B456F"
      />
      <path
        d="M624 168 V160 H628 V152 H636 V160 H640 V168 H656 V160 H660 V152 H668 V160 H672 V168 H676 V180 H680 V204 H676 V212 H620 V204 H616 V180 H624 Z"
        fill="#3B456F"
      />
      <path
        d="M628 172 V164 H632 V160 H636 V164 H640 V172 H656 V164 H660 V160 H664 V164 H668 V172 H672 V180 H676 V200 H672 V208 H624 V200 H620 V180 H628 Z"
        fill="#F0CF9B"
      />
      <rect x="628" y="164" width="8" height="4" fill="#E7A5A4" />
      <rect x="660" y="164" width="8" height="4" fill="#E7A5A4" />
      <g fill="#D49A5A">
        <rect x="640" y="172" width="4" height="8" />
        <rect x="648" y="172" width="4" height="8" />
        <rect x="656" y="172" width="4" height="8" />
      </g>
      <rect x="628" y="200" width="40" height="12" fill="#F8E4C0" />
      <rect x="628" y="188" width="8" height="8" fill="#3B456F" />
      <rect x="660" y="188" width="8" height="8" fill="#3B456F" />
      <rect x="630" y="190" width="4" height="4" fill="#F9D98C" />
      <rect x="662" y="190" width="4" height="4" fill="#F9D98C" />
      <rect x="630" y="190" width="2" height="2" fill="#FFFDF0" />
      <rect x="662" y="190" width="2" height="2" fill="#FFFDF0" />
      <rect x="644" y="200" width="8" height="4" fill="#E7A5A4" />
      <rect x="648" y="204" width="4" height="4" fill="#3B456F" />
      <rect x="644" y="208" width="4" height="2" fill="#3B456F" />
      <rect x="652" y="208" width="4" height="2" fill="#3B456F" />
      <g fill="#F8E4C0" opacity="0.85">
        <rect x="608" y="196" width="16" height="2" />
        <rect x="608" y="204" width="16" height="2" />
        <rect x="672" y="196" width="16" height="2" />
        <rect x="672" y="204" width="16" height="2" />
      </g>
      <path
        d="M628 216 H668 V220 H672 V228 H676 V248 H672 V256 H624 V248 H620 V228 H624 V220 H628 Z"
        fill="#F0CF9B"
      />
      <rect x="636" y="224" width="24" height="32" fill="#F8E4C0" />
      <rect x="620" y="228" width="8" height="24" fill="#E8BC80" />
      <rect x="636" y="212" width="24" height="4" fill="#5AA7B8" />
      <rect x="644" y="216" width="8" height="8" fill="#3B456F" />
      <rect x="646" y="216" width="4" height="4" fill="#F9D98C" />
      <rect x="624" y="252" width="16" height="8" fill="#3B456F" />
      <rect x="656" y="252" width="16" height="8" fill="#3B456F" />
      <rect x="628" y="252" width="10" height="4" fill="#F8E4C0" />
      <rect x="660" y="252" width="10" height="4" fill="#F8E4C0" />
      <rect x="628" y="256" width="4" height="4" fill="#E7A5A4" />
      <rect x="660" y="256" width="4" height="4" fill="#E7A5A4" />
    </g>
    {[210, 280, 360, 460, 600, 700].map((x, index) => (
      <rect
        key={x}
        x={x}
        y={48 + (index % 3) * 18}
        width="5"
        height="5"
        fill={index % 2 === 0 ? '#FFFFFF' : '#B7D8F4'}
        opacity="0.8"
      />
    ))}
  </svg>
);

const FriendCard: React.FC<{ friend: FriendLink }> = ({ friend }) => (
  <a
    href={friend.url}
    target="_blank"
    rel="noreferrer"
    className="group block h-full"
    aria-label={friend.name}
  >
    <LiquidPixelCard
      accent={accentForSeed(friend.seed)}
      interactive
      className="h-full p-4"
      contentClassName="flex h-full flex-col"
    >
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-300/70 shadow-sm dark:border-white/15">
          <FriendAvatar seed={friend.seed} title={`${friend.name} 的头像`} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start gap-1.5">
            <h2 className="break-words font-bold text-sm leading-5 text-slate-900 dark:text-white">
              {friend.name}
            </h2>
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-300" />
          </div>
          {friend.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {friend.tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded bg-violet-500/10 px-1.5 py-0.5 font-mono text-[9px] text-violet-600 dark:bg-violet-400/10 dark:text-violet-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-violet-600 transition-colors group-hover:border-violet-400/60 group-hover:bg-violet-500/20 dark:border-violet-300/20 dark:text-violet-300">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
      {friend.description && (
        <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {friend.description}
        </p>
      )}
    </LiquidPixelCard>
  </a>
);

const FriendSkeletons: React.FC = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {[0, 1, 2, 3].map((item) => (
      <div
        key={item}
        className="liquid-glass h-40 animate-pulse rounded-2xl border border-slate-300/50 p-4 dark:border-white/10"
      >
        <div className="flex gap-3">
          <div className="h-16 w-16 rounded-xl bg-slate-300/50 dark:bg-white/10" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-2/3 rounded bg-slate-300/50 dark:bg-white/10" />
            <div className="h-2 w-1/2 rounded bg-slate-300/40 dark:bg-white/10" />
          </div>
        </div>
        <div className="mt-4 h-2 rounded bg-slate-300/40 dark:bg-white/10" />
        <div className="mt-2 h-2 w-4/5 rounded bg-slate-300/40 dark:bg-white/10" />
      </div>
    ))}
  </div>
);

export const FriendsView: React.FC = () => {
  const [friends, setFriends] = useState<FriendLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchFriends(controller.signal)
      .then((result) => setFriends(result))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : '友链加载失败');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retryToken]);

  const openApply = () => {
    pixelAudio.playCommentOpen();
    setApplyOpen(true);
  };

  return (
    <>
      <div className="space-y-5">
        <LiquidPixelCard
          strong
          accent="violet"
          className="relative min-h-[240px] overflow-hidden p-6 sm:min-h-[270px] sm:p-9"
          contentClassName="relative z-10 flex h-full flex-col justify-center"
        >
          <div className="pointer-events-none absolute inset-0 opacity-70 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[68%] sm:opacity-75">
            <FriendHeroArt />
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/45 to-transparent dark:from-slate-950/95 dark:via-slate-950/45" />
          </div>
          <div className="relative max-w-[430px]">
            <div className="flex items-center gap-2 font-pixel text-[10px] tracking-wider text-violet-600 dark:text-violet-300">
              <span className="h-2 w-2 bg-violet-500" />
              // FRIENDS
            </div>
            <h1 className="mt-4 flex items-center gap-3 font-black text-5xl tracking-tight text-slate-900 dark:text-white sm:text-6xl">
              友链
              <Link2 className="h-8 w-8 rotate-[-12deg] text-violet-500 dark:text-violet-300" />
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600 dark:text-slate-300">
              一些志同道合的朋友，
              <br />
              在各自的世界里发光。
            </p>
            <button
              type="button"
              data-custom-sound
              onClick={openApply}
              className="pixel-action-button mt-5 inline-flex items-center gap-1.5 border-2 border-violet-400/60 bg-violet-500/15 px-4 py-2 font-mono text-[11px] text-violet-700 dark:border-violet-300/40 dark:bg-violet-400/10 dark:text-violet-200"
            >
              <Plus className="h-3.5 w-3.5" />
              申请友链
            </button>
          </div>
          <div className="absolute right-6 top-7 z-10 hidden rounded bg-white/35 px-2 py-1 text-right font-pixel text-[9px] leading-5 tracking-wider text-violet-700/80 backdrop-blur-sm dark:bg-slate-950/25 dark:text-violet-200/80 sm:block">
            GOOD FRIENDS
            <br />
            BETTER JOURNEY
            <span className="ml-1.5 inline-block text-[14px]">▸</span>
          </div>
        </LiquidPixelCard>

        {loading ? (
          <FriendSkeletons />
        ) : error ? (
          <div className="liquid-glass flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-400/30 p-8 text-center">
            <div className="font-mono text-xs text-rose-600 dark:text-rose-300">
              {error}
            </div>
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              className="pixel-action-button flex items-center gap-1.5 border-2 border-rose-400/40 px-3 py-2 font-mono text-[11px] text-rose-600 dark:text-rose-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重试
            </button>
          </div>
        ) : friends.length === 0 ? (
          <div className="liquid-glass flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-violet-400/30 bg-violet-500/10 text-violet-500 dark:text-violet-300">
              <Link2 className="h-6 w-6" />
            </div>
            <div className="font-pixel text-[10px] tracking-wider text-violet-600 dark:text-violet-300">
              NO FRIENDS YET
            </div>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
              这里还很安静，来成为第一个朋友吧。
            </p>
            <button
              type="button"
              data-custom-sound
              onClick={openApply}
              className="pixel-action-button flex items-center gap-1.5 border-2 border-violet-400/60 bg-violet-500/15 px-3 py-2 font-mono text-[11px] text-violet-700 dark:border-violet-300/40 dark:bg-violet-400/10 dark:text-violet-200"
            >
              <Plus className="h-3.5 w-3.5" />
              申请友链
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {friends.map((friend) => (
              <FriendCard key={friend.id} friend={friend} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 py-3 font-pixel text-[9px] tracking-[0.2em] text-violet-500/80 dark:text-violet-300/80">
          <span className="h-2 w-2 bg-violet-400" />
          <span>
            {loading
              ? '友链 · LOADING'
              : `友链 · ${friends.length} FRIENDS`}
          </span>
          <span className="h-2 w-2 bg-violet-400" />
        </div>
      </div>

      {applyOpen && (
        <FriendApplyModal onClose={() => setApplyOpen(false)} />
      )}
    </>
  );
};
