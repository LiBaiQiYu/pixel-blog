import React from 'react';
import { ExternalLink, X } from 'lucide-react';
import { PixelBloom } from './PixelBloom';
import { MiniStat, SectionHeader, StatTile } from './PanelParts';
import {
  countryLabel,
  formatDate,
  formatHours,
  formatJoinedAt,
  formatPlaytime,
  formatRelative,
  levelProgress,
  steamStateLabel,
  type SteamGame,
  type SteamSummary,
} from '../lib/steam';

interface SteamLibraryModalProps {
  open: boolean;
  originRect: DOMRect | null;
  summary: SteamSummary;
  onClose: () => void;
  onSourceVisibilityChange?: (hidden: boolean) => void;
}

const GameRow: React.FC<{
  index: number;
  game: SteamGame;
  maxMinutes: number;
}> = ({ index, game, maxMinutes }) => {
  const width =
    maxMinutes > 0 ? Math.max(3, (game.minutes / maxMinutes) * 100) : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 odd:bg-slate-100/50 dark:odd:bg-white/[0.04]">
      <span className="w-6 shrink-0 text-right font-mono text-[9px] text-slate-400 dark:text-slate-500">
        {index}
      </span>
      {game.icon ? (
        <img
          src={game.icon}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-[27px] w-[72px] shrink-0 rounded object-cover"
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden';
          }}
        />
      ) : (
        <span className="h-[27px] w-[72px] shrink-0 rounded bg-slate-300/60 dark:bg-slate-700/60" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-100">
            {game.name}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-slate-600 dark:text-slate-300">
            {formatPlaytime(game.minutes)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-1 w-24 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/40">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
              style={{ width: `${width}%` }}
            />
          </span>
          <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
            {game.twoWeekMinutes > 0
              ? `近两周 ${formatPlaytime(game.twoWeekMinutes)}`
              : '近两周 未玩'}
          </span>
          {game.lastPlayed > 0 && (
            <span className="ml-auto shrink-0 font-mono text-[9px] text-slate-400 dark:text-slate-500">
              {formatDate(game.lastPlayed)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const SteamLibraryModal: React.FC<SteamLibraryModalProps> = ({
  open,
  originRect,
  summary,
  onClose,
  onSourceVisibilityChange,
}) => {
  const { profile, level, library, community } = summary;
  const country = countryLabel(profile?.countryCode ?? null);
  const joined = profile ? formatJoinedAt(profile.createdAt) : null;
  const lastOnline = profile ? formatRelative(profile.lastLogOff) : null;
  const progress = level ? levelProgress(level) : null;

  // Older cached payloads may miss these fields; never let the modal crash.
  const platforms = library?.platforms ?? {
    windows: 0,
    mac: 0,
    linux: 0,
    deck: 0,
  };
  const topGames = library?.topGames ?? [];
  const recentGames = library?.recentGames ?? [];

  const platformRows = library
    ? [
        {
          key: 'windows',
          label: 'Windows',
          minutes: platforms.windows,
          cls: 'bg-sky-400',
        },
        {
          key: 'mac',
          label: 'macOS',
          minutes: platforms.mac,
          cls: 'bg-violet-400',
        },
        {
          key: 'linux',
          label: 'Linux',
          minutes: platforms.linux,
          cls: 'bg-amber-400',
        },
        {
          key: 'deck',
          label: 'Steam Deck',
          minutes: platforms.deck,
          cls: 'bg-emerald-400',
        },
      ].filter((row) => row.minutes > 0)
    : [];
  const platformTotal = platformRows.reduce((sum, row) => sum + row.minutes, 0);

  const banned = Boolean(
    community &&
      (community.vacBanned ||
        community.communityBanned ||
        community.gameBans > 0)
  );

  return (
    <PixelBloom
      open={open}
      originRect={originRect}
      onClose={onClose}
      ariaLabel="Steam 游戏档案"
      targetWidth={960}
      targetHeight={700}
      lockScroll
      zIndex={95}
      backdropClassName="bg-slate-950/50 backdrop-blur-[2px]"
      panelClassName="border border-sky-300/50 bg-white/95 shadow-[0_30px_80px_-20px_rgba(2,6,23,0.45)] backdrop-blur-2xl dark:border-cyan-400/20 dark:bg-slate-950/95 dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      onSourceVisibilityChange={onSourceVisibilityChange}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-2.5 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-sky-600 dark:text-cyan-300">
          <span className="h-1.5 w-1.5 bg-sky-500 dark:bg-cyan-400" />
          STEAM ARCHIVE
          <span className="text-slate-300 dark:text-slate-600">//</span>
          <span className="text-slate-500 dark:text-slate-400">游戏档案</span>
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
            title="档案"
            hint={profile ? steamStateLabel(profile.state) : undefined}
          />
          {profile ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative shrink-0">
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-16 w-16 rounded-xl border border-sky-400/30 object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950 ${
                      profile.state > 0 ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                      {profile.name}
                    </h2>
                    {level && (
                      <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] leading-none text-sky-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                        LV.{level.level}
                      </span>
                    )}
                    {profile.realName && (
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {profile.realName}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                    {country && <span>{country}</span>}
                    {joined && <span>{joined}加入</span>}
                    {lastOnline && <span>最后在线 {lastOnline}</span>}
                    <span className="text-slate-400 dark:text-slate-500">
                      {profile.steamId}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                {profile.currentGame && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] text-emerald-700 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    正在玩 {profile.currentGame.name}
                  </span>
                )}
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="liquid-pill inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-white/40 px-2.5 py-1 font-mono text-[9px] text-sky-700 transition-colors hover:bg-sky-500/10 dark:border-cyan-300/25 dark:bg-slate-950/40 dark:text-cyan-200"
                >
                  Steam 主页
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-slate-500">
              资料不可见（个人资料设为私密）
            </p>
          )}
        </section>

        {library && (
          <section className="space-y-2.5">
            <SectionHeader
              index="02"
              title="数据总览"
              hint={`${library.totalGames} 款在库`}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile
                label="总时长"
                value={formatPlaytime(library.totalMinutes)}
                hint={`≈ ${Math.round(library.totalMinutes / 1440)} 天`}
              />
              <StatTile
                label="游戏数"
                value={String(library.totalGames)}
                hint={`玩过 ${library.playedGames} 款`}
              />
              <StatTile
                label="近两周"
                value={formatPlaytime(library.twoWeekMinutes)}
                hint="滚动 14 天"
              />
              <StatTile
                label="平均每款"
                value={`${formatHours(
                  library.playedGames > 0
                    ? Math.round(library.totalMinutes / library.playedGames)
                    : 0
                )}h`}
                hint="按玩过的游戏算"
              />
            </div>

            {level && progress && (
              <div className="rounded-xl border border-sky-400/20 bg-white/40 px-3 py-2.5 dark:border-cyan-400/15 dark:bg-slate-950/40">
                <div className="flex items-baseline justify-between gap-2 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                  <span>
                    等级 LV.{level.level} → LV.{level.level + 1}
                  </span>
                  <span>
                    {progress.current.toLocaleString('en-US')} /{' '}
                    {progress.target.toLocaleString('en-US')} XP
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
                    style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                  />
                </div>
                <div className="mt-1 font-mono text-[8px] text-slate-400 dark:text-slate-500">
                  总 XP {level.xp.toLocaleString('en-US')} · 徽章{' '}
                  {level.badgeCount}
                </div>
              </div>
            )}

            {platformRows.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/40">
                  {platformRows.map((row) => (
                    <span
                      key={row.key}
                      className={row.cls}
                      style={{
                        width: `${(row.minutes / platformTotal) * 100}%`,
                      }}
                      title={`${row.label} ${formatPlaytime(row.minutes)}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                  {platformRows.map((row) => (
                    <span key={row.key} className="inline-flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${row.cls}`} />
                      {row.label} {formatPlaytime(row.minutes)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {library && topGames.length > 0 && (
          <section className="space-y-2">
            <SectionHeader
              index="03"
              title="游戏时长"
              hint={`TOP ${topGames.length}`}
            />
            <div className="space-y-0.5">
              {topGames.map((game, index) => (
                <GameRow
                  key={game.appid}
                  index={index + 1}
                  game={game}
                  maxMinutes={topGames[0]?.minutes ?? 0}
                />
              ))}
            </div>
          </section>
        )}

        {library && recentGames.length > 0 && (
          <section className="space-y-2">
            <SectionHeader index="04" title="最近在玩" hint="近 14 天" />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentGames.map((game) => (
                <div key={game.appid} className="w-28 shrink-0">
                  {game.icon ? (
                    <img
                      src={game.icon}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="h-[52px] w-full rounded-md object-cover"
                      onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  ) : (
                    <div className="h-[52px] w-full rounded-md bg-slate-300/60 dark:bg-slate-700/60" />
                  )}
                  <div className="mt-1 truncate text-[10px] text-slate-700 dark:text-slate-200">
                    {game.name}
                  </div>
                  <div className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
                    {formatPlaytime(game.twoWeekMinutes)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <SectionHeader index="05" title="社区与徽章" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat
              label="徽章"
              value={level ? `${level.badgeCount} 枚` : '—'}
            />
            <MiniStat
              label="好友"
              value={
                community?.friends != null ? String(community.friends) : '未公开'
              }
            />
            <MiniStat
              label="群组"
              value={
                community?.groups != null ? String(community.groups) : '未公开'
              }
            />
            <MiniStat
              label="封禁"
              value={
                community
                  ? banned
                    ? `有记录（${community.gameBans}）`
                    : '无记录'
                  : '—'
              }
              ok={community ? !banned : undefined}
            />
          </div>
          <p className="font-mono text-[9px] leading-relaxed text-slate-400 dark:text-slate-500">
            徽章图片与展柜属于 Steam 社区页面数据，Web API
            不提供，这里只展示可获取的统计值。
          </p>
        </section>

        <div className="border-t border-slate-200/60 pt-3 font-mono text-[9px] text-slate-400 dark:border-white/10 dark:text-slate-500">
          数据来源 Steam Web API · 服务端缓存 10 分钟 · 更新于{' '}
          {formatDate(Math.floor(summary.updatedAt / 1000)) ?? '—'}
        </div>
      </div>
    </PixelBloom>
  );
};
