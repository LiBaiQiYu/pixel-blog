import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal as TerminalIcon,
  LayoutGrid,
  CornerDownLeft,
  Trash2,
} from 'lucide-react';
import { BlogPost, ThemeMode } from '../types/blog';
import { LiquidPixelCard } from './LiquidPixelCard';
import {
  PixelHeart,
  PixelPostCover,
  generateRandomSeed,
  normalizeSeed,
} from './PixelArtwork';
import { MarkdownRenderer } from './MarkdownRenderer';
import { PixelWeatherIcon } from './WeatherWidget';
import {
  getWeatherKind,
  getIntensityLabel,
  WEATHER_INTENSITY_LEVELS,
  WEATHER_KIND_OPTIONS,
} from '../utils/weather';
import type { WeatherData, WeatherKind } from '../types/weather';
import type { WeatherStatus } from '../hooks/useWeather';

interface TerminalBlogViewProps {
  posts: BlogPost[];
  theme: ThemeMode;
  onToggleTheme: (target?: ThemeMode) => void;
  onSwitchToStandard: (post?: BlogPost) => void;
  likedPostIds: string[];
  onToggleLike: (id: string) => void;
  onViewPost: (id: string) => void;
  onUpdateSeed: (id: string, newSeed: number) => void;
  onRandomizeAllSeeds: (customBaseSeed?: number) => void;
  weatherBgEnabled: boolean;
  onSetWeatherBg: (enabled: boolean) => void;
  weatherPreviewKind: WeatherKind | null;
  onSetWeatherPreview: (kind: WeatherKind | null) => void;
  weatherPreviewIntensity: number | null;
  onSetWeatherPreviewIntensity: (intensity: number | null) => void;
  weather: WeatherData;
  weatherStatus: WeatherStatus;
  weatherHint: string | null;
  onWeatherRelocate: () => void;
  onOpenGallery: () => void;
  onOpenAbout: () => void;
  initialCommand?: string | null;
  onConsumeInitialCommand?: () => void;
  onCommandSound: () => void;
}

interface HistoryEntry {
  id: string;
  command: string;
  timestamp: string;
  postId?: string;
  output: React.ReactNode;
}

const QUICK_COMMANDS = [
  { cmd: 'tree', label: 'tree (年月时间轴)' },
  { cmd: 'ls', label: 'ls (文件列表)' },
  { cmd: 'gallery', label: 'gallery (生活画廊)' },
  { cmd: 'about', label: 'about (关于我)' },
  { cmd: 'weather', label: 'weather (天气)' },
  { cmd: 'help', label: 'help (帮助)' },
];

export const TerminalBlogView: React.FC<TerminalBlogViewProps> = ({
  posts,
  theme,
  onToggleTheme,
  onSwitchToStandard,
  likedPostIds,
  onToggleLike,
  onViewPost,
  onUpdateSeed,
  onRandomizeAllSeeds,
  weatherBgEnabled,
  onSetWeatherBg,
  weatherPreviewKind,
  onSetWeatherPreview,
  weatherPreviewIntensity,
  onSetWeatherPreviewIntensity,
  weather,
  weatherStatus,
  weatherHint,
  onWeatherRelocate,
  onOpenGallery,
  onOpenAbout,
  initialCommand,
  onConsumeInitialCommand,
  onCommandSound,
}) => {
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>(['ls', 'cat 01']);
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const lastEntryRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const nowTime = () => new Date().toTimeString().slice(0, 8);

  // Scroll to newly executed command output when entries update
  useEffect(() => {
    const container = terminalBodyRef.current;
    if (!container || entries.length === 0) return;

    requestAnimationFrame(() => {
      const lastEl = lastEntryRef.current;
      if (!shouldAutoScrollRef.current || !lastEl) {
        container.scrollTop = container.scrollHeight;
        return;
      }

      const entryTop = lastEl.offsetTop;
      const entryHeight = lastEl.offsetHeight;
      const viewportHeight = container.clientHeight;

      if (entryHeight > viewportHeight * 0.72) {
        container.scrollTo({
          top: Math.max(0, entryTop - 12),
          behavior: 'smooth',
        });
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    });
  }, [entries]);

  // Flat Unix-style file listing for `ls`
  const renderFlatFileList = (list: BlogPost[], titleLabel = '~/posts') => {
    const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
    return (
      <div className="my-1 p-3.5 rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/40 dark:bg-slate-950/55 font-mono text-xs space-y-1">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/60 dark:border-white/10">
          <span>total {sorted.length} ({titleLabel})</span>
          <span className="text-[11px]">点击任意文件直接阅读</span>
        </div>
        <div className="divide-y divide-slate-200/40 dark:divide-white/5">
          {sorted.map((p) => (
            <div
              key={p.id}
              onClick={() => runCommand(`cat ${p.id}`)}
              className="py-1.5 px-1.5 flex items-center justify-between gap-3 hover:bg-emerald-500/15 cursor-pointer rounded transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-slate-400 dark:text-slate-500 hidden sm:inline shrink-0">
                  -rw-r--r--
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  {p.id}_{p.slug}.md
                </span>
                <span className="text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 truncate">
                  {p.title}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">
                {p.readTime}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Hierarchical Year-Month Timeline Tree for `tree`
  const renderTimelineTree = (
    list: BlogPost[],
    titleLabel = '~/posts (TIMELINE ARCHIVE)'
  ) => {
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    const groups: { ym: string; items: BlogPost[] }[] = [];
    for (const p of sorted) {
      const ym = p.date.slice(0, 7);
      let g = groups.find((item) => item.ym === ym);
      if (!g) {
        g = { ym, items: [] };
        groups.push(g);
      }
      g.items.push(p);
    }

    return (
      <div className="my-1 p-3.5 rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/40 dark:bg-slate-950/55 font-mono text-xs space-y-1">
        <div className="flex items-center justify-between text-sky-600 dark:text-cyan-300 font-bold pb-1">
          <span>
            {titleLabel} [{sorted.length} MD]
          </span>
          <span className="text-[11px] font-normal text-slate-400">
            点击任意节点直接执行 cat 阅读
          </span>
        </div>

        {groups.map((group, gIdx) => {
          const isLastGroup = gIdx === groups.length - 1;
          const groupPrefix = isLastGroup ? '└─' : '├─';
          const childIndent = isLastGroup ? '   ' : '│  ';

          return (
            <div key={group.ym} className="space-y-0.5">
              {/* Year-Month Branch Node */}
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 pt-1">
                <span className="text-slate-400 dark:text-slate-600 select-none whitespace-pre">
                  {groupPrefix}
                </span>
                <button
                  onClick={() => runCommand(`tree ${group.ym}`)}
                  className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1.5"
                  title={`筛选 ${group.ym} 归档`}
                >
                  <span>◆ {group.ym}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    {group.items.length} 篇
                  </span>
                </button>
              </div>

              {/* Post Leaves under this Year-Month */}
              {group.items.map((p, pIdx) => {
                const isLastPost = pIdx === group.items.length - 1;
                const leafBranch = isLastPost ? '└─' : '├─';
                const dayStr = p.date.slice(5, 10); // MM-DD

                return (
                  <div
                    key={p.id}
                    onClick={() => runCommand(`cat ${p.id}`)}
                    className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-lg hover:bg-emerald-500/15 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-400 dark:text-slate-600 select-none whitespace-pre">
                        {childIndent}
                        {leafBranch}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 shrink-0">
                        [{dayStr}]
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        #{p.id}
                      </span>
                      <span className="text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 truncate">
                        {p.title}
                      </span>
                    </div>

                    <span className="hidden sm:inline-block shrink-0 text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 dark:bg-white/5 text-sky-600 dark:text-cyan-300">
                      {p.category}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTerminalArticle = (post: BlogPost) => {
    const isLiked = likedPostIds.includes(post.id);
    return (
      <div className="my-2 rounded-2xl overflow-hidden border border-emerald-500/30 bg-white/55 dark:bg-slate-950/70 space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-300/60 dark:border-white/10 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 dark:text-emerald-300 font-bold">
              {post.id}_{post.slug}.md
            </span>
            <span className="text-slate-400">
              · {post.date} · {post.readTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleLike(post.id)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300 flex items-center gap-1 text-xs"
            >
              <PixelHeart filled={isLiked} className="w-3.5 h-3.5" />
              <span>{post.likes}</span>
            </button>
            <button
              onClick={() => onSwitchToStandard(post)}
              className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-700 dark:text-cyan-300 flex items-center gap-1 text-xs"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>普通视图阅读</span>
            </button>
          </div>
        </div>

        {/* Pixel Cover Strip inside Terminal */}
        <div className="relative h-36 sm:h-44 rounded-xl overflow-hidden border border-white/15 group">
          <PixelPostCover
            type={post.coverType}
            seed={post.coverSeed}
            className="w-full h-full"
          />
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 text-[11px] font-mono opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <span className="px-2 py-0.5 rounded bg-slate-950/80 text-cyan-300">
              #{post.coverSeed}
            </span>
            <button
              onClick={() => onUpdateSeed(post.id, generateRandomSeed())}
              className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold"
            >
              随机种子
            </button>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-4 pointer-events-none">
            <h2 className="text-base sm:text-xl font-bold text-white">
              {post.title}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">{post.subtitle}</p>
          </div>
        </div>

        <div className="font-sans">
          <MarkdownRenderer content={post.markdown} variant="terminal" />
        </div>
      </div>
    );
  };

  const buildCommandOutput = (rawCmd: string): React.ReactNode | 'CLEAR' => {
    const trimmed = rawCmd.trim();
    const [cmd, ...args] = trimmed.split(/\s+/);
    const lower = (cmd || '').toLowerCase();
    const argStr = args.join(' ');

    switch (lower) {
      case 'help':
      case '?':
        return (
          <div className="p-3.5 rounded-xl bg-white/40 dark:bg-slate-950/55 border border-slate-300/50 dark:border-white/10 text-xs font-mono grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">tree [年月]</code> — 树状年月时间轴 (如 <code>tree 2026-10</code>)
            </div>
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">ls</code> — 平铺列出全部 .md 文章文件
            </div>
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">cat &lt;id&gt;</code> — 阅读文章 (如 <code>cat 01</code>)
            </div>
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">search &lt;词&gt;</code> — 搜索文章内容
            </div>
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">weather [locate]</code> — 当前位置实时天气详情 / 重新定位
            </div>
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">weather bg on|off</code> — 切换天气动态背景
            </div>
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">weather demo &lt;类型&gt;</code> — 预览任意天气背景 (auto 恢复实况)
            </div>
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">gallery</code> — 打开生活画廊（照片 + 地图）
            </div>
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">about</code> — 打开关于我页面
            </div>
            <div>
              <code className="text-emerald-600 dark:text-emerald-400 font-bold">seed &lt;id&gt; [序号]</code> — 随机或指定序号生成封面
            </div>
          </div>
        );

      case 'ls':
      case 'dir':
        return renderFlatFileList(posts);

      case 'tree':
      case 'log': {
        if (argStr && /^\d{4}(-\d{2})?$/.test(argStr.trim())) {
          const ymFilter = argStr.trim();
          const filtered = posts.filter((p) => p.date.startsWith(ymFilter));
          if (filtered.length === 0) {
            return (
              <div className="text-rose-500 text-xs font-mono">
                未找到 {ymFilter} 归档下的博文。
              </div>
            );
          }
          return renderTimelineTree(
            filtered,
            `~/posts/${ymFilter} (TIMELINE ARCHIVE)`
          );
        }
        return renderTimelineTree(posts);
      }

      case 'cat':
      case 'read':
      case 'open': {
        if (!argStr) {
          return (
            <div className="text-amber-600 dark:text-amber-400 text-xs font-mono">
              用法: <code>cat &lt;文章ID&gt;</code>，例如{' '}
              <button
                onClick={() => runCommand('cat 01')}
                className="underline text-emerald-500"
              >
                cat 01
              </button>
            </div>
          );
        }
        const cleaned = argStr.replace(/^#/, '').toLowerCase();
        const target = posts.find(
          (p) =>
            p.id.toLowerCase() === cleaned ||
            p.id.toLowerCase() === cleaned.padStart(2, '0') ||
            p.slug.toLowerCase().includes(cleaned) ||
            p.title.toLowerCase().includes(cleaned)
        );
        if (!target) {
          return (
            <div className="text-rose-500 text-xs font-mono">
              未找到文章 &quot;{argStr}&quot;，输入 <code>ls</code> 查看列表。
            </div>
          );
        }
        return renderTerminalArticle(target);
      }

      case 'search':
      case 'grep':
      case 'find': {
        if (!argStr) {
          return (
            <div className="text-amber-600 dark:text-amber-400 text-xs font-mono">
              用法: <code>search &lt;关键词&gt;</code>
            </div>
          );
        }
        const q = argStr.toLowerCase();
        const matches = posts.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.subtitle.toLowerCase().includes(q) ||
            p.excerpt.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        );
        if (matches.length === 0) {
          return (
            <div className="text-rose-500 text-xs font-mono">
              没有找到包含 &quot;{argStr}&quot; 的文章。
            </div>
          );
        }
        return renderTimelineTree(matches, `搜索结果: "${argStr}"`);
      }

      case 'weather': {
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'bg') {
          const modeArg = (args[1] || '').toLowerCase();
          if (modeArg === 'on' || modeArg === 'off') {
            onSetWeatherBg(modeArg === 'on');
            return (
              <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                天气动态背景已{modeArg === 'on' ? '开启' : '关闭'}。
              </div>
            );
          }
          onSetWeatherBg(!weatherBgEnabled);
          return (
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              天气动态背景已{weatherBgEnabled ? '关闭' : '开启'}。
            </div>
          );
        }

        if (sub === 'demo') {
          const target = (args[1] || '').toLowerCase();
          if (target === 'auto' || target === 'off') {
            onSetWeatherPreview(null);
            onSetWeatherPreviewIntensity(null);
            return (
              <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                已恢复实况天气背景。
              </div>
            );
          }
          const found = WEATHER_KIND_OPTIONS.find((o) => o.kind === target);
          if (!found) {
            return (
              <div className="space-y-2 my-1">
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                  用法: <code>weather demo &lt;类型|auto&gt; [强度]</code>
                  ，强度可选 <code>0.5/1/1.8/2.5</code> 或 弱/中/强/极强。可用类型：
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => runCommand('weather demo auto')}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                  >
                    自动（实况）
                  </button>
                  {WEATHER_KIND_OPTIONS.map((option) => (
                    <button
                      key={option.kind}
                      onClick={() => runCommand(`weather demo ${option.kind}`)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-sky-500/15 text-sky-700 dark:text-cyan-300 border border-sky-500/30 hover:bg-sky-500/25"
                    >
                      {option.label} ({option.kind})
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    强度预设:
                  </span>
                  {WEATHER_INTENSITY_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() =>
                        runCommand(
                          `weather demo ${weatherPreviewKind ?? 'rain'} ${level.value}`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-500/30 hover:bg-pink-500/25"
                    >
                      {level.label} ({level.value})
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          // Optional strength argument: number or 弱/中/强/极强
          const levelArg = args[2];
          let levelValue: number | null = null;
          if (levelArg) {
            const byLabel = WEATHER_INTENSITY_LEVELS.find(
              (l) => l.label === levelArg
            );
            const num = Number(levelArg);
            levelValue = byLabel
              ? byLabel.value
              : Number.isFinite(num) && num > 0
              ? num
              : null;
          }

          onSetWeatherPreview(found.kind);
          if (levelValue !== null) {
            onSetWeatherPreviewIntensity(levelValue);
          }
          const levelLabel = getIntensityLabel(
            levelValue ?? weatherPreviewIntensity ?? 1
          );
          return (
            <div className="text-xs font-mono text-pink-500 dark:text-pink-400">
              天气背景已切换到「{found.label} · {levelLabel}」效果预览。输入{' '}
              <code>weather demo auto</code> 恢复实况，或在天气栏切换强度。
            </div>
          );
        }

        if (weatherPreviewKind) {
          const label =
            WEATHER_KIND_OPTIONS.find((o) => o.kind === weatherPreviewKind)
              ?.label || weatherPreviewKind;
          return (
            <div className="space-y-2 my-1">
              <div className="text-xs font-mono text-pink-500 dark:text-pink-400">
                当前正在预览「{label} ·{' '}
                {getIntensityLabel(weatherPreviewIntensity ?? 1)}」背景效果，输入{' '}
                <code>weather demo auto</code> 恢复实况。
              </div>
            </div>
          );
        }

        if (sub === 'locate') {
          onWeatherRelocate();
          return (
            <div className="text-xs font-mono text-sky-600 dark:text-cyan-300">
              已向浏览器请求定位，授权后再次输入 <code>weather</code> 即可查看当前位置的天气详情。
            </div>
          );
        }

        const w = weather as WeatherData;
        return (
          <div className="my-1 p-4 rounded-xl bg-white/40 dark:bg-slate-950/60 border border-slate-300/60 dark:border-white/10 font-mono text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <PixelWeatherIcon
                  kind={getWeatherKind(w.current.code)}
                  className="w-9 h-9 shrink-0"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    <span>
                      {w.city} · {w.current.text} · {w.current.temp}°C
                    </span>
                    {weatherStatus === 'live' && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-500/15 text-sky-700 dark:text-cyan-300 border border-sky-500/30">
                        浏览器定位
                      </span>
                    )}
                    {weatherStatus === 'locating' && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        正在定位…
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    体感 {w.current.feelsLike}° · 湿度 {w.current.humidity}% ·{' '}
                    {w.current.windDir} {w.current.windScale} 级
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400">
                更新于 {w.updatedAt}
              </span>
            </div>

            {weatherHint && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400">
                {weatherHint}（输入 <code>weather locate</code> 重新定位）
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {w.daily.map((day) => (
                <div
                  key={day.date}
                  className="p-2 rounded-lg bg-white/50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 text-center"
                >
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {day.weekday}
                  </div>
                  <PixelWeatherIcon
                    kind={getWeatherKind(day.code)}
                    className="w-6 h-6 mx-auto my-0.5"
                  />
                  <div className="text-[11px] text-slate-700 dark:text-slate-200">
                    {day.tempMax}° / {day.tempMin}°
                  </div>
                  <div className="text-[10px] text-sky-600 dark:text-cyan-300">
                    降水 {day.precipProb}%
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200/50 dark:border-white/10 text-[10px] text-slate-400 flex flex-wrap justify-between gap-2">
              <a
                href={w.attribution}
                target="_blank"
                rel="noreferrer"
                className="hover:text-sky-500 dark:hover:text-cyan-300"
              >
                天气数据由 {w.source} 提供
              </a>
              <span>QWEATHER_API</span>
            </div>
          </div>
        );
      }

      case 'theme': {
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'dark' || sub === 'light') {
          onToggleTheme(sub);
        } else {
          onToggleTheme();
        }
        return (
          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
            已切换深色 / 浅色主题。
          </div>
        );
      }

      case 'gui':
      case 'standard':
      case 'exit':
        onSwitchToStandard();
        return null;

      case 'gallery':
      case 'photos':
        onOpenGallery();
        return (
          <div className="text-xs font-mono text-pink-500 dark:text-pink-400">
            正在打开「生活画廊」…
          </div>
        );

      case 'about':
      case 'me':
        onOpenAbout();
        return (
          <div className="text-xs font-mono text-violet-500 dark:text-violet-300">
            正在打开「关于我」…
          </div>
        );

      case 'seed': {
        const targetArg = (args[0] || 'all').toLowerCase();
        const seedValArg = args[1];
        if (targetArg === 'all') {
          const custom = seedValArg ? normalizeSeed(seedValArg) : undefined;
          onRandomizeAllSeeds(custom);
          return (
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              已更新全部文章封面种子{custom ? ` (#${custom})` : ''}。
            </div>
          );
        }
        const cleanedId = targetArg.replace(/^#/, '');
        const found = posts.find(
          (p) =>
            p.id.toLowerCase() === cleanedId ||
            p.id.toLowerCase() === cleanedId.padStart(2, '0')
        );
        if (!found) {
          return (
            <div className="text-xs font-mono text-rose-500">
              用法: <code>seed &lt;文章ID|all&gt; [种子序号]</code>
            </div>
          );
        }
        const nextSeed = seedValArg
          ? normalizeSeed(seedValArg)
          : generateRandomSeed();
        onUpdateSeed(found.id, nextSeed);
        return (
          <div className="space-y-2 my-1">
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              文章 #{found.id} 封面种子已更新为 <strong>#{nextSeed}</strong>：
            </div>
            <div className="h-28 w-64 rounded-xl overflow-hidden border border-emerald-500/40">
              <PixelPostCover
                type={found.coverType}
                seed={nextSeed}
                className="w-full h-full"
              />
            </div>
          </div>
        );
      }

      case 'clear':
      case 'cls':
        return 'CLEAR';

      default:
        return (
          <div className="text-xs font-mono text-rose-500">
            未知命令 &quot;{cmd}&quot;。输入 <code>help</code> 查看可用命令。
          </div>
        );
    }
  };

  const runCommand = (rawCmd: string) => {
    const cleaned = rawCmd.trim();
    if (!cleaned) return;
    onCommandSound();

    const [cmd, ...args] = cleaned.split(/\s+/);
    const lower = (cmd || '').toLowerCase();
    let matchedPostId: string | undefined;
    if (
      (lower === 'cat' || lower === 'read' || lower === 'open') &&
      args.length > 0
    ) {
      const q = args.join(' ').replace(/^#/, '').toLowerCase();
      const target = posts.find(
        (p) =>
          p.id.toLowerCase() === q ||
          p.id.toLowerCase() === q.padStart(2, '0') ||
          p.slug.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q)
      );
      if (target) matchedPostId = target.id;
    }

    if (matchedPostId) onViewPost(matchedPostId);

    const result = buildCommandOutput(cleaned);
    if (result === 'CLEAR') {
      shouldAutoScrollRef.current = false;
      setEntries([]);
      return;
    }

    shouldAutoScrollRef.current = true;
    setEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        command: cleaned,
        timestamp: nowTime(),
        postId: matchedPostId,
        output: result,
      },
    ]);
    setCmdHistory((prev) => [cleaned, ...prev.slice(0, 29)]);
    setHistoryCursor(-1);
  };

  // Start cleanly with the tree timeline archive
  useEffect(() => {
    if (entries.length === 0) {
      setEntries([
        {
          id: 'init-tree',
          command: 'tree',
          timestamp: nowTime(),
          output: renderTimelineTree(posts),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialCommand) {
      runCommand(initialCommand);
      if (onConsumeInitialCommand) {
        onConsumeInitialCommand();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCommand]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!input.trim()) return;
      runCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = Math.min(historyCursor + 1, cmdHistory.length - 1);
      setHistoryCursor(nextIdx);
      setInput(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursor <= 0) {
        setHistoryCursor(-1);
        setInput('');
      } else {
        const nextIdx = historyCursor - 1;
        setHistoryCursor(nextIdx);
        setInput(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const val = input.trim().toLowerCase();
      const cmds = [
        'help',
        'ls',
        'cat 01',
        'cat 02',
        'cat 03',
        'weather',
        'gallery',
        'about',
        'seed 01',
        'theme',
        'clear',
      ];
      const match = cmds.find((c) => c.startsWith(val));
      if (match) setInput(match);
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col">
      <LiquidPixelCard
        accent="emerald"
        strong
        className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden"
        contentClassName="flex-1 min-h-0 flex flex-col"
      >
        {/* Minimal Terminal Title Bar */}
        <div className="shrink-0 px-3 sm:px-4 py-2.5 border-b border-slate-300/60 dark:border-white/10 bg-slate-200/70 dark:bg-slate-950/85 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 bg-rose-500 inline-block" />
            <span className="w-2.5 h-2.5 bg-amber-400 inline-block" />
            <span className="w-2.5 h-2.5 bg-emerald-400 inline-block" />
            <span className="ml-1 sm:ml-2 font-mono text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <TerminalIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">carlos@libai.dev:</span>
              <span>~/posts</span>
            </span>
          </div>

          {/* Subtle Quick Command Links */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {QUICK_COMMANDS.map((item) => (
              <button
                key={item.cmd}
                onClick={() => runCommand(item.cmd)}
                className="px-2 py-0.5 rounded text-[11px] font-mono whitespace-nowrap text-slate-600 dark:text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => runCommand('clear')}
              className="p-1 text-slate-400 hover:text-rose-500 shrink-0"
              title="清屏"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Terminal Output Viewport */}
        <div
          ref={terminalBodyRef}
          onClick={(e) => {
            if (window.getSelection()?.toString()) return;
            const target = e.target as HTMLElement;
            if (target.closest('button, a, input')) return;
            inputRef.current?.focus({ preventScroll: true });
          }}
          className="relative flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 font-mono text-xs sm:text-sm"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">
            李白的白 // CarlosWhite (前端工程师 · LV.7) — 输入{' '}
            <code className="text-emerald-600 dark:text-emerald-400">cat 01</code>{' '}
            阅读文章，或输入{' '}
            <code className="text-emerald-600 dark:text-emerald-400">help</code>{' '}
            查看指令。
          </div>

          {entries.map((entry, idx) => {
            const livePost = entry.postId
              ? posts.find((p) => p.id === entry.postId)
              : undefined;
            return (
              <div
                key={entry.id}
                ref={idx === entries.length - 1 ? lastEntryRef : null}
                className="space-y-2 animate-fadeIn"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    carlos@libai:~$
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {entry.command}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-400">
                    {entry.timestamp}
                  </span>
                </div>
                <div className="pl-2 sm:pl-3 border-l border-emerald-500/30">
                  {livePost ? renderTerminalArticle(livePost) : entry.output}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Command Input Prompt Bar */}
        <div className="shrink-0 p-3 sm:px-4 border-t border-slate-300/60 dark:border-white/10 bg-white/75 dark:bg-slate-950/90 flex items-center gap-2">
          <span className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
            <span className="hidden sm:inline">carlos@libai:</span>~$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入 tree, ls, cat 01, search, about..."
            className="flex-1 min-w-0 bg-transparent font-mono text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={() => {
              if (!input.trim()) return;
              runCommand(input);
              setInput('');
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-xs flex items-center gap-1 hover:bg-emerald-500/30 transition-colors"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </LiquidPixelCard>
    </div>
  );
};
