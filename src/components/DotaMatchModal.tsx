import React from 'react';
import { ExternalLink, X } from 'lucide-react';
import { PixelBloom } from './PixelBloom';
import { MiniStat, SectionHeader, StatTile } from './PanelParts';
import {
  formatMatchDuration,
  formatMatchTime,
  matchModeLabel,
  type DotaMatch,
  type DotaSummary,
} from '../lib/dota';

interface DotaMatchModalProps {
  open: boolean;
  originRect: DOMRect | null;
  summary: DotaSummary;
  onClose: () => void;
  onSourceVisibilityChange?: (hidden: boolean) => void;
}

const matchKda = (match: DotaMatch): string => {
  const deaths = match.deaths || 1;
  return ((match.kills + match.assists) / deaths).toFixed(2);
};

const ResultChip: React.FC<{ win: boolean; compact?: boolean }> = ({
  win,
  compact = false,
}) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded font-mono font-bold leading-none ${
      compact ? 'h-4 w-4 text-[8px]' : 'h-4 px-1 text-[9px]'
    } ${
      win
        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
    }`}
  >
    {win ? '胜' : '负'}
  </span>
);

const MatchRow: React.FC<{ index: number; match: DotaMatch }> = ({
  index,
  match,
}) => (
  <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 odd:bg-slate-100/50 dark:odd:bg-white/[0.04]">
    <span className="w-5 shrink-0 text-right font-mono text-[9px] text-slate-400 dark:text-slate-500">
      {index}
    </span>
    {match.heroImage ? (
      <img
        src={match.heroImage}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="h-8 w-14 shrink-0 rounded object-cover"
        onError={(event) => {
          event.currentTarget.style.visibility = 'hidden';
        }}
      />
    ) : (
      <span className="h-8 w-14 shrink-0 rounded bg-slate-300/60 dark:bg-slate-700/60" />
    )}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-100">
          {match.heroName}
        </span>
        <ResultChip win={match.win} compact />
        <span className="shrink-0 font-mono text-[9px] text-slate-400 dark:text-slate-500">
          {matchModeLabel(match.lobbyType, match.gameMode)}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-slate-400 dark:text-slate-500">
        <span>{formatMatchDuration(match.duration)}</span>
        <span>·</span>
        <span>{match.gpm} GPM</span>
        <span>·</span>
        <span>{formatMatchTime(match.startTime)}</span>
      </div>
    </div>
    <div className="shrink-0 text-right">
      <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
        {match.kills} / {match.deaths} / {match.assists}
      </div>
      <div className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
        KDA {matchKda(match)}
      </div>
    </div>
  </div>
);

export const DotaMatchModal: React.FC<DotaMatchModalProps> = ({
  open,
  originRect,
  summary,
  onClose,
  onSourceVisibilityChange,
}) => {
  const { profile, overall, recent, heroes } = summary;
  const rank = profile?.rankLabel;

  return (
    <PixelBloom
      open={open}
      originRect={originRect}
      onClose={onClose}
      ariaLabel="Dota 2 战绩"
      targetWidth={960}
      targetHeight={700}
      lockScroll
      zIndex={95}
      backdropClassName="bg-slate-950/50 backdrop-blur-[2px]"
      panelClassName="border border-rose-300/40 bg-white/95 shadow-[0_30px_80px_-20px_rgba(2,6,23,0.45)] backdrop-blur-2xl dark:border-rose-400/20 dark:bg-slate-950/95 dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      onSourceVisibilityChange={onSourceVisibilityChange}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-2.5 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-rose-600 dark:text-rose-300">
          <span className="h-1.5 w-1.5 bg-rose-500" />
          DOTA 2 ARCHIVE
          <span className="text-slate-300 dark:text-slate-600">//</span>
          <span className="text-slate-500 dark:text-slate-400">战绩</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200/80 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
        <section className="space-y-2.5">
          <SectionHeader
            index="01"
            title="概况"
            hint={rank ?? undefined}
          />
          {profile && (
            <div className="flex items-center gap-3">
              {profile.avatar && (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="h-12 w-12 rounded-lg border border-rose-400/30 object-cover"
                />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {profile.name}
                  </span>
                  {rank && (
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[9px] leading-none text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">
                      {rank}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                  account_id {profile.accountId}
                </div>
              </div>
              <a
                href={`https://www.opendota.com/players/${profile.accountId}`}
                target="_blank"
                rel="noreferrer"
                className="liquid-pill ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-400/35 bg-white/40 px-2.5 py-1 font-mono text-[9px] text-rose-700 transition-colors hover:bg-rose-500/10 dark:border-rose-300/25 dark:bg-slate-950/40 dark:text-rose-200"
              >
                OpenDota
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          )}

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
                hint={`近 20 场 ${
                  recent ? `${recent.wins} 胜 ${recent.losses} 负` : '—'
                }`}
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

          {overall && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat label="场均补刀" value={String(Math.round(overall.lastHits))} />
              <MiniStat
                label="场均英雄伤害"
                value={Math.round(overall.heroDamage).toLocaleString('en-US')}
              />
              <MiniStat
                label="场均击杀"
                value={overall.kills.toFixed(1)}
              />
              <MiniStat
                label="场均助攻"
                value={overall.assists.toFixed(1)}
              />
            </div>
          )}
        </section>

        {recent && (
          <section className="space-y-2">
            <SectionHeader
              index="02"
              title="最近 20 场"
              hint={`${recent.wins} 胜 ${recent.losses} 负`}
            />
            <div className="flex flex-wrap gap-1">
              {recent.form.map((result, index) => (
                <span
                  key={`${result}-${index}`}
                  title={result === 'W' ? '胜' : '负'}
                  className={`h-2.5 w-2.5 rounded-sm ${
                    result === 'W' ? 'bg-emerald-500' : 'bg-rose-500/80'
                  }`}
                />
              ))}
            </div>
            <div className="space-y-0.5">
              {recent.matches.map((match, index) => (
                <MatchRow
                  key={match.matchId}
                  index={index + 1}
                  match={match}
                />
              ))}
            </div>
          </section>
        )}

        {heroes.length > 0 && (
          <section className="space-y-2">
            <SectionHeader index="03" title="这 20 场用过的英雄" hint={`${heroes.length} 个`} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {heroes.map((hero) => (
                <div
                  key={hero.heroId}
                  className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white/40 px-2 py-1.5 dark:border-white/10 dark:bg-slate-950/40"
                >
                  {hero.heroImage ? (
                    <img
                      src={hero.heroImage}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="h-7 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="h-7 w-12 shrink-0 rounded bg-slate-300/60 dark:bg-slate-700/60" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-medium text-slate-700 dark:text-slate-200">
                      {hero.heroName}
                    </div>
                    <div className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
                      {hero.games} 场 ·{' '}
                      {Math.round((hero.wins / hero.games) * 100)}% 胜
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="border-t border-slate-200/60 pt-3 font-mono text-[9px] text-slate-400 dark:border-white/10 dark:text-slate-500">
          数据来源 OpenDota API · 浏览器直连，每次访问最多 4 次请求 · @
          {new Date(summary.updatedAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </PixelBloom>
  );
};
