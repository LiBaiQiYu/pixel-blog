import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Gamepad2 } from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';
import { SteamLibraryModal } from './SteamLibraryModal';
import {
  fetchSteamSummary,
  formatPlaytime,
  steamStateLabel,
  type SteamGame,
  type SteamSummary,
} from '../lib/steam';

const CARD_GAME_COUNT = 5;

const STATE_DOT: Record<number, string> = {
  0: 'bg-slate-400',
  1: 'bg-emerald-500',
  2: 'bg-rose-500',
  3: 'bg-amber-400',
  4: 'bg-amber-400',
  5: 'bg-sky-400',
  6: 'bg-sky-400',
};

const useSteamSummary = (): SteamSummary | null => {
  const [summary, setSummary] = useState<SteamSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchSteamSummary(controller.signal).then((data) => {
      if (active) setSummary(data);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return summary;
};

const topGamePercent = (game: SteamGame, games: SteamGame[]) => {
  const max = games[0]?.minutes ?? 0;
  if (!max) return 0;
  return Math.max(4, Math.round((game.minutes / max) * 100));
};

export const SteamProfileCard: React.FC = () => {
  const summary = useSteamSummary();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [sourceHidden, setSourceHidden] = useState(false);

  if (!summary) return null;

  const { profile, level, library, community } = summary;
  if (!profile && !library) return null;

  const stateColor = profile
    ? STATE_DOT[profile.state] ?? 'bg-slate-400'
    : 'bg-slate-400';
  const joinedYear =
    profile && profile.createdAt > 0
      ? new Date(profile.createdAt * 1000).getFullYear()
      : null;
  const recent = library?.recentGames[0] ?? null;
  const topGames = library?.topGames.slice(0, CARD_GAME_COUNT) ?? [];

  const openModal = () => {
    const element = cardRef.current;
    if (!element) return;
    setOriginRect(element.getBoundingClientRect());
    setOpen(true);
  };

  return (
    <>
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label="查看完整 Steam 游戏档案"
        onClick={openModal}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openModal();
          }
        }}
        className={`cursor-pointer rounded-2xl transition-opacity duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
          sourceHidden ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <LiquidPixelCard
          accent="cyan"
          interactive
          className="about-reveal space-y-4 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/10 text-sky-600 dark:text-cyan-300">
                <Gamepad2 className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 font-mono text-[9px] tracking-wider text-sky-600 dark:text-cyan-300">
                  STEAM LIBRARY // 游戏库
                  {level && (
                    <span className="rounded bg-sky-500/10 px-1 py-0.5 text-[8px] leading-none dark:bg-cyan-400/10">
                      LV.{level.level}
                    </span>
                  )}
                </div>
                <h2 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                  时间都去哪儿了
                </h2>
              </div>
            </div>
            {profile?.profileUrl && (
              <a
                href={profile.profileUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="liquid-pill inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-400/35 bg-white/40 px-2.5 py-1 font-mono text-[10px] text-sky-700 transition-colors hover:border-sky-400/70 hover:bg-sky-500/10 dark:border-cyan-300/25 dark:bg-slate-950/40 dark:text-cyan-200 dark:hover:bg-cyan-400/10"
              >
                STEAM
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-center">
            {profile ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="relative shrink-0">
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    loading="lazy"
                    className="h-12 w-12 rounded-lg border border-sky-400/30 object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-950 ${stateColor}`}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {profile.name}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    {profile.currentGame
                      ? `正在玩 ${profile.currentGame.name}`
                      : steamStateLabel(profile.state)}
                    {joinedYear ? ` · ${joinedYear} 加入` : ''}
                  </span>
                </span>
              </div>
            ) : (
              <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                Steam 资料暂不可见
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: '总时长',
                  value: formatPlaytime(library?.totalMinutes ?? 0),
                  hint: library
                    ? `≈ ${Math.max(1, Math.round(library.totalMinutes / 1440))} 天`
                    : '—',
                },
                {
                  label: '游戏数',
                  value: String(library?.totalGames ?? 0),
                  hint: library?.playedGames ? `已玩 ${library.playedGames} 款` : '—',
                },
                {
                  label: '近两周',
                  value: formatPlaytime(library?.twoWeekMinutes ?? 0),
                  hint: recent ? `多在 ${recent.name}` : '近 14 天',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-sky-400/30 bg-white/55 px-2.5 py-2 text-center dark:border-cyan-400/20 dark:bg-slate-950/50"
                >
                  <div className="font-mono text-[8px] tracking-wider text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </div>
                  <div className="mt-0.5 font-mono text-base font-bold leading-none text-sky-700 dark:text-cyan-200">
                    {stat.value}
                  </div>
                  <div className="mt-1 truncate font-mono text-[9px] text-slate-400 dark:text-slate-500">
                    {stat.hint}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {topGames.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 font-mono text-[9px] tracking-wider text-slate-400 dark:text-slate-500">
                <span>TOP PLAYTIME</span>
                {recent && <span className="truncate">最近在玩 {recent.name}</span>}
              </div>
              {topGames.map((game, index) => (
                <div
                  key={game.appid}
                  className="flex items-center gap-2.5 rounded-md px-1 py-0.5 transition-colors hover:bg-sky-500/5 dark:hover:bg-cyan-400/5"
                >
                  <span className="w-3 shrink-0 text-right font-mono text-[9px] text-slate-400 dark:text-slate-500">
                    {index + 1}
                  </span>
                  {game.icon ? (
                    <img
                      src={game.icon}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="h-[19px] w-10 shrink-0 rounded-sm object-cover"
                      onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  ) : (
                    <span className="h-[19px] w-10 shrink-0 rounded-sm bg-slate-300/60 dark:bg-slate-700/60" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700 dark:text-slate-200">
                    {game.name}
                  </span>
                  <span className="hidden h-1 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200/80 sm:block dark:bg-slate-700/40">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
                      style={{ width: `${topGamePercent(game, topGames)}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    {formatPlaytime(game.minutes)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 pt-0.5 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                <span>
                  TOP {topGames.length}
                  {library ? ` / ${library.totalGames} 款` : ''}
                </span>
                <span className="inline-flex items-center gap-1 text-sky-600 dark:text-cyan-300">
                  点击查看完整档案
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          )}
        </LiquidPixelCard>
      </div>

      <SteamLibraryModal
        open={open}
        originRect={originRect}
        summary={summary}
        onClose={() => setOpen(false)}
        onSourceVisibilityChange={setSourceHidden}
      />
    </>
  );
};

export const TerminalSteamProfile: React.FC = () => {
  const summary = useSteamSummary();
  if (!summary) return null;

  const { profile, level, library, community } = summary;
  if (!profile && !library) return null;

  const topGames = library?.topGames.slice(0, CARD_GAME_COUNT) ?? [];

  return (
    <section className="space-y-2">
      <p className="text-emerald-600 dark:text-emerald-300"># steam</p>
      <div className="space-y-1 font-mono text-[10px]">
        {profile && (
          <div className="flex items-baseline gap-2">
            <span className="w-16 shrink-0 text-cyan-600 dark:text-cyan-300">
              persona
            </span>
            <span className="truncate text-slate-700 dark:text-slate-200">
              {profile.name}
            </span>
            <span className="shrink-0 text-slate-400 dark:text-slate-500">
              {steamStateLabel(profile.state)}
              {level ? ` · LV.${level.level}` : ''}
            </span>
          </div>
        )}
        {library && (
          <>
            <div className="flex items-baseline gap-2">
              <span className="w-16 shrink-0 text-cyan-600 dark:text-cyan-300">
                library
              </span>
              <span className="text-slate-700 dark:text-slate-200">
                {library.totalGames} games · {formatPlaytime(library.totalMinutes)}{' '}
                total · {formatPlaytime(library.twoWeekMinutes)} / 2w
              </span>
            </div>
            {topGames.map((game) => (
              <div key={game.appid} className="flex items-baseline gap-2">
                <span className="w-16 shrink-0 text-slate-400 dark:text-slate-500">
                  {' '}
                </span>
                <span className="w-40 shrink-0 truncate text-slate-600 dark:text-slate-300">
                  {game.name}
                </span>
                <span className="shrink-0 text-slate-500 dark:text-slate-400">
                  {formatPlaytime(game.minutes)}
                </span>
              </div>
            ))}
            {community && (
              <div className="flex items-baseline gap-2">
                <span className="w-16 shrink-0 text-cyan-600 dark:text-cyan-300">
                  social
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {community.friends ?? '—'} friends · {community.groups ?? '—'} groups
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
