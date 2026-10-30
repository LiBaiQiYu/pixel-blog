import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Swords } from 'lucide-react';
import { DotaMatchModal } from './DotaMatchModal';
import { LiquidPixelCard } from './LiquidPixelCard';
import { StatTile } from './PanelParts';
import {
  fetchDotaSummary,
  formatMatchDuration,
  matchModeLabel,
  type DotaSummary,
} from '../lib/dota';

const CARD_MATCH_COUNT = 5;

const useDotaSummary = (): DotaSummary | null => {
  const [summary, setSummary] = useState<DotaSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchDotaSummary(controller.signal).then((data) => {
      if (active) setSummary(data);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return summary;
};

export const DotaMatchCard: React.FC = () => {
  const summary = useDotaSummary();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [sourceHidden, setSourceHidden] = useState(false);

  if (!summary) return null;

  const { profile, overall, recent } = summary;
  if (!profile && !overall && !recent) return null;

  const matches = recent?.matches.slice(0, CARD_MATCH_COUNT) ?? [];
  const rank = profile?.rankLabel;

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
        aria-label="查看 Dota 2 战绩"
        onClick={openModal}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openModal();
          }
        }}
        className={`cursor-pointer rounded-2xl transition-opacity duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 ${
          sourceHidden ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <LiquidPixelCard
          accent="magenta"
          interactive
          className="about-reveal space-y-4 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                <Swords className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 font-mono text-[9px] tracking-wider text-rose-600 dark:text-rose-300">
                  DOTA 2 // 最近战绩
                  {overall && (
                    <span className="rounded bg-rose-500/10 px-1 py-0.5 text-[8px] leading-none dark:bg-rose-400/10">
                      {overall.matches.toLocaleString('en-US')} 场
                    </span>
                  )}
                </div>
                <h2 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                  最近打得怎么样
                </h2>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {rank && (
                <span className="rounded-full border border-rose-400/35 bg-rose-500/10 px-2.5 py-1 font-mono text-[10px] text-rose-700 dark:border-rose-300/25 dark:bg-rose-400/10 dark:text-rose-200">
                  {rank}
                  {profile?.mmr ? ` · ${profile.mmr}` : ''}
                </span>
              )}
              {profile && (
                <a
                  href={`https://www.opendota.com/players/${profile.accountId}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="liquid-pill inline-flex items-center gap-1.5 rounded-full border border-rose-400/35 bg-white/40 px-2.5 py-1 font-mono text-[10px] text-rose-700 transition-colors hover:bg-rose-500/10 dark:border-rose-300/25 dark:bg-slate-950/40 dark:text-rose-200"
                >
                  OPENDOTA
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {overall && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile
                label="总场次"
                value={overall.matches.toLocaleString('en-US')}
                hint={`${overall.wins} 胜 / ${overall.losses} 负`}
              />
              <StatTile
                label="胜率"
                value={`${overall.winRate.toFixed(1)}%`}
                hint={
                  recent ? `近 20 场 ${recent.wins} 胜 ${recent.losses} 负` : '—'
                }
                tone={overall.winRate >= 50 ? 'emerald' : 'rose'}
              />
              <StatTile
                label="场均 KDA"
                value={overall.kda.toFixed(2)}
                hint={`${overall.kills.toFixed(1)} / ${overall.deaths.toFixed(
                  1
                )} / ${overall.assists.toFixed(1)}`}
              />
              <StatTile
                label="场均 GPM"
                value={String(Math.round(overall.gpm))}
                hint={`XPM ${Math.round(overall.xpm)}`}
              />
            </div>
          )}

          {recent && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 font-mono text-[9px] tracking-wider text-slate-400 dark:text-slate-500">
                <span>RECENT FORM</span>
                <span>最老 → 最新</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {recent.form.map((result, index) => (
                  <span
                    key={`${result}-${index}`}
                    className={`h-2.5 w-2.5 rounded-sm ${
                      result === 'W' ? 'bg-emerald-500' : 'bg-rose-500/80'
                    }`}
                  />
                ))}
              </div>

              <div className="grid gap-0.5 pt-1 lg:grid-cols-2 lg:gap-x-4">
                {matches.map((match) => (
                  <div
                    key={match.matchId}
                    className="flex items-center gap-2 rounded-md px-1 py-1"
                  >
                    {match.heroImage ? (
                      <img
                        src={match.heroImage}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="h-[22px] w-10 shrink-0 rounded-sm object-cover"
                        onError={(event) => {
                          event.currentTarget.style.visibility = 'hidden';
                        }}
                      />
                    ) : (
                      <span className="h-[22px] w-10 shrink-0 rounded-sm bg-slate-300/60 dark:bg-slate-700/60" />
                    )}
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-[8px] font-bold leading-none ${
                        match.win
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {match.win ? '胜' : '负'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700 dark:text-slate-200">
                      {match.heroName}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                      {matchModeLabel(match.lobbyType, match.gameMode)}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      {match.kills}/{match.deaths}/{match.assists}
                    </span>
                    <span className="w-9 shrink-0 text-right font-mono text-[9px] text-slate-400 dark:text-slate-500">
                      {formatMatchDuration(match.duration)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                <span>最近 {matches.length} 场</span>
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300">
                  点击查看近 20 场
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          )}
        </LiquidPixelCard>
      </div>

      <DotaMatchModal
        open={open}
        originRect={originRect}
        summary={summary}
        onClose={() => setOpen(false)}
        onSourceVisibilityChange={setSourceHidden}
      />
    </>
  );
};

export const TerminalDotaMatch: React.FC = () => {
  const summary = useDotaSummary();
  if (!summary) return null;

  const { profile, overall, recent } = summary;
  if (!profile && !overall && !recent) return null;

  return (
    <section className="space-y-2">
      <p className="text-emerald-600 dark:text-emerald-300"># dota2</p>
      <div className="space-y-1 font-mono text-[10px]">
        {overall && (
          <div className="flex items-baseline gap-2">
            <span className="w-16 shrink-0 text-cyan-600 dark:text-cyan-300">
              record
            </span>
            <span className="text-slate-700 dark:text-slate-200">
              {overall.matches.toLocaleString('en-US')} games ·{' '}
              {overall.winRate.toFixed(1)}% win · KDA {overall.kda.toFixed(2)} ·{' '}
              {Math.round(overall.gpm)} GPM
            </span>
          </div>
        )}
        {profile?.rankLabel && (
          <div className="flex items-baseline gap-2">
            <span className="w-16 shrink-0 text-cyan-600 dark:text-cyan-300">
              rank
            </span>
            <span className="text-slate-700 dark:text-slate-200">
              {profile.rankLabel}
              {profile.mmr ? ` · ${profile.mmr} MMR` : ''}
            </span>
          </div>
        )}
        {recent && (
          <>
            <div className="flex items-baseline gap-2">
              <span className="w-16 shrink-0 text-cyan-600 dark:text-cyan-300">
                recent
              </span>
              <span className="text-slate-700 dark:text-slate-200">
                {recent.wins}W {recent.losses}L ·{' '}
                {recent.form.join('')}
              </span>
            </div>
            {recent.matches.slice(0, CARD_MATCH_COUNT).map((match) => (
              <div key={match.matchId} className="flex items-baseline gap-2">
                <span className="w-16 shrink-0 text-slate-400 dark:text-slate-500">
                  {' '}
                </span>
                <span
                  className={
                    match.win
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-rose-600 dark:text-rose-300'
                  }
                >
                  {match.win ? 'W' : 'L'}
                </span>
                <span className="w-40 shrink-0 truncate text-slate-600 dark:text-slate-300">
                  {match.heroName}
                </span>
                <span className="shrink-0 text-slate-500 dark:text-slate-400">
                  {match.kills}/{match.deaths}/{match.assists} ·{' '}
                  {formatMatchDuration(match.duration)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
};
