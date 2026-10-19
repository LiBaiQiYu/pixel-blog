import React, { useMemo, useState } from 'react';
import {
  Search,
  Clock,
  Eye,
  ArrowUpRight,
  X,
  Dices,
  Hash,
  Check,
  Calendar,
  ListFilter,
  LayoutGrid,
} from 'lucide-react';
import { AuthorProfile, BlogPost, PostCategory } from '../types/blog';
import type { WeatherData, WeatherKind } from '../types/weather';
import type { WeatherStatus } from '../hooks/useWeather';
import { LiquidPixelCard } from './LiquidPixelCard';
import {
  PixelAvatar,
  PixelHeart,
  PixelPostCover,
  generateRandomSeed,
  normalizeSeed,
} from './PixelArtwork';
import { ArticleModal } from './ArticleModal';
import { WeatherWidget } from './WeatherWidget';

interface StandardBlogViewProps {
  posts: BlogPost[];
  author: AuthorProfile;
  selectedPost: BlogPost | null;
  onSelectPost: (post: BlogPost | null) => void;
  likedPostIds: string[];
  onToggleLike: (id: string) => void;
  onUpdateSeed: (id: string, newSeed: number) => void;
  onRandomizeAllSeeds: (customBaseSeed?: number) => void;
  onSwitchToTerminal: (initialCmd?: string) => void;
  weather: WeatherData;
  weatherStatus: WeatherStatus;
  weatherHint: string | null;
  onWeatherRelocate: () => void;
  weatherPreviewKind: WeatherKind | null;
  onSetWeatherPreview: (kind: WeatherKind | null) => void;
  weatherPreviewIntensity: number | null;
  onSetWeatherPreviewIntensity: (intensity: number | null) => void;
  backOriginRef?: React.RefObject<HTMLButtonElement>;
}

function formatYearMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  if (!year || !month) return ym;
  return `${year} 年 ${month} 月`;
}

export const StandardBlogView: React.FC<StandardBlogViewProps> = ({
  posts,
  author,
  selectedPost,
  onSelectPost,
  likedPostIds,
  onToggleLike,
  onUpdateSeed,
  onRandomizeAllSeeds,
  onSwitchToTerminal,
  weather,
  weatherStatus,
  weatherHint,
  onWeatherRelocate,
  weatherPreviewKind,
  onSetWeatherPreview,
  weatherPreviewIntensity,
  onSetWeatherPreviewIntensity,
  backOriginRef,
}) => {
  const [activeCategory, setActiveCategory] = useState<PostCategory>('ALL');
  const [activeYearMonth, setActiveYearMonth] = useState<string>('ALL');
  const [layoutStyle, setLayoutStyle] = useState<'timeline' | 'grid'>(
    'timeline'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showGlobalSeedInput, setShowGlobalSeedInput] = useState(false);
  const [globalSeedInput, setGlobalSeedInput] = useState('');
  const [editingSeedPostId, setEditingSeedPostId] = useState<string | null>(
    null
  );
  const [cardSeedDraft, setCardSeedDraft] = useState<string>('');

  // Dynamically derive categories from existing posts
  const categories = useMemo(() => {
    const set = new Set<string>(['ALL']);
    posts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [posts]);

  // Extract all Year-Month buckets with article counts
  const yearMonthBuckets = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
    sorted.forEach((p) => {
      const ym = p.date.slice(0, 7); // YYYY-MM
      map.set(ym, (map.get(ym) || 0) + 1);
    });
    return Array.from(map.entries()).map(([ym, count]) => ({
      ym,
      label: formatYearMonthLabel(ym),
      count,
    }));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((post) => {
        const matchesCat =
          activeCategory === 'ALL' || post.category === activeCategory;
        const matchesYM =
          activeYearMonth === 'ALL' || post.date.startsWith(activeYearMonth);
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          post.title.toLowerCase().includes(q) ||
          post.subtitle.toLowerCase().includes(q) ||
          post.excerpt.toLowerCase().includes(q) ||
          String(post.coverSeed).includes(q) ||
          post.tags.some((t) => t.toLowerCase().includes(q));
        return matchesCat && matchesYM && matchesSearch;
      });
  }, [posts, activeCategory, activeYearMonth, searchQuery]);

  // Group filteredPosts by YYYY-MM for the Timeline Archive
  const groupedByYearMonth = useMemo(() => {
    const groups: { ym: string; label: string; items: BlogPost[] }[] = [];
    for (const post of filteredPosts) {
      const ym = post.date.slice(0, 7);
      let existing = groups.find((g) => g.ym === ym);
      if (!existing) {
        existing = { ym, label: formatYearMonthLabel(ym), items: [] };
        groups.push(existing);
      }
      existing.items.push(post);
    }
    return groups;
  }, [filteredPosts]);

  if (selectedPost) {
    const related = posts
      .filter((p) => p.id !== selectedPost.id)
      .slice(0, 3);
    return (
      <ArticleModal
        post={selectedPost}
        isLiked={likedPostIds.includes(selectedPost.id)}
        onToggleLike={onToggleLike}
        onUpdateSeed={onUpdateSeed}
        onClose={() => onSelectPost(null)}
        onOpenInTerminal={(p) => onSwitchToTerminal(`cat ${p.id}`)}
        onSelectPost={(p) => {
          onSelectPost(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        relatedPosts={related}
        backOriginRef={backOriginRef}
      />
    );
  }

  const handleApplyGlobalSeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSeedInput.trim()) {
      onRandomizeAllSeeds();
      return;
    }
    const parsed = normalizeSeed(globalSeedInput);
    onRandomizeAllSeeds(parsed);
    setShowGlobalSeedInput(false);
  };

  const renderSeedOverlay = (post: BlogPost) => {
    const isEditingThisSeed = editingSeedPostId === post.id;
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex items-center gap-1 bg-slate-950/80 border border-white/15 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[10px] font-mono transition-opacity duration-200 ${
          isEditingThisSeed
            ? 'opacity-100'
            : 'opacity-95 sm:opacity-0 sm:group-hover:opacity-100'
        }`}
      >
        {isEditingThisSeed ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (cardSeedDraft.trim()) {
                onUpdateSeed(post.id, normalizeSeed(cardSeedDraft));
              }
              setEditingSeedPostId(null);
            }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              value={cardSeedDraft}
              onChange={(e) => setCardSeedDraft(e.target.value)}
              placeholder="种子"
              autoFocus
              className="w-14 bg-slate-900 text-cyan-300 px-1 rounded border border-cyan-400/50 focus:outline-none text-center"
            />
            <button
              type="submit"
              className="text-emerald-400 hover:text-emerald-300"
            >
              <Check className="w-3 h-3" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingSeedPostId(post.id);
              setCardSeedDraft(String(post.coverSeed));
            }}
            className="text-slate-300 hover:text-cyan-300"
            title="点击输入特定种子序号"
          >
            #{post.coverSeed}
          </button>
        )}
        <button
          type="button"
          onClick={() => onUpdateSeed(post.id, generateRandomSeed())}
          className="text-emerald-400 hover:text-emerald-300 pl-0.5"
          title="随机重绘封面"
        >
          <Dices className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Compact Author Profile & Content Filter Bar */}
      <LiquidPixelCard accent="cyan" className="p-5 sm:p-6 space-y-4">
        {/* Author Bio Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative p-1 rounded-2xl bg-slate-950 border border-amber-400/50 shadow-sm shrink-0">
              <PixelAvatar size={52} />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[9px] font-pixel bg-gradient-to-r from-amber-500 to-pink-500 text-slate-950 font-bold rounded">
                LV.{author.level}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  {author.name}
                </h1>
                <span className="text-xs font-mono text-sky-600 dark:text-cyan-300">
                  前端工程师
                </span>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-white/15"
                  title="冰(Quas) · 雷(Wex) · 火(Exort)"
                >
                  <span className="w-1.5 h-1.5 bg-sky-400 inline-block" />
                  <span className="w-1.5 h-1.5 bg-fuchsia-400 inline-block" />
                  <span className="w-1.5 h-1.5 bg-amber-400 inline-block" />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                「李白的白」—— 记录生活随感、旅途碎片与深夜独白的个人散文随笔集。
              </p>
            </div>
          </div>

          {/* Subtle Cover Seed & Layout Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
            {showGlobalSeedInput ? (
              <form
                onSubmit={handleApplyGlobalSeed}
                className="flex items-center gap-1.5 animate-fadeIn"
              >
                <div className="relative flex items-center">
                  <Hash className="w-3 h-3 text-sky-500 absolute left-2.5" />
                  <input
                    type="text"
                    value={globalSeedInput}
                    onChange={(e) => setGlobalSeedInput(e.target.value)}
                    placeholder="种子序号..."
                    autoFocus
                    className="pl-6 pr-2 py-1 rounded-lg text-xs font-mono bg-white/80 dark:bg-slate-900/85 border border-sky-400/60 text-slate-800 dark:text-cyan-300 focus:outline-none w-28"
                  />
                </div>
                <button
                  type="submit"
                  className="liquid-pill px-2.5 py-1 rounded-lg text-xs font-mono text-sky-700 dark:text-cyan-300"
                >
                  确定
                </button>
                <button
                  type="button"
                  onClick={() => setShowGlobalSeedInput(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowGlobalSeedInput(true)}
                className="liquid-pill px-2.5 py-1 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                title="输入特定种子序号生成封面"
              >
                <Hash className="w-3 h-3 text-sky-500" />
                <span>种子号</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onRandomizeAllSeeds()}
              className="liquid-pill px-2.5 py-1 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-300"
              title="随机刷新全部文章的像素封面种子"
            >
              <Dices className="w-3.5 h-3.5 text-emerald-500" />
              <span>随机封面</span>
            </button>

            <div className="flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-950/70 border border-slate-300/50 dark:border-white/10 text-xs font-mono">
              <button
                type="button"
                onClick={() => setLayoutStyle('timeline')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  layoutStyle === 'timeline'
                    ? 'bg-sky-500 text-white font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title="时间轴列表布局"
              >
                <ListFilter className="w-3 h-3" />
                <span className="hidden sm:inline">时间轴</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutStyle('grid')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  layoutStyle === 'grid'
                    ? 'bg-sky-500 text-white font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title="卡片网格布局"
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="hidden sm:inline">网格</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter & Search Row */}
        <div className="pt-3.5 border-t border-slate-200/60 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono whitespace-nowrap transition-all ${
                    active
                      ? 'bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'
                  }`}
                >
                  {cat === 'ALL' ? '全部' : cat}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章或标签..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs font-mono bg-white/60 dark:bg-slate-900/65 border border-slate-300/60 dark:border-white/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Year-Month Archive Pills Row */}
        <div className="pt-2.5 border-t border-slate-200/40 dark:border-white/5 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3 text-sky-500" />
            <span>年月归档:</span>
          </span>
          <button
            onClick={() => setActiveYearMonth('ALL')}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all border ${
              activeYearMonth === 'ALL'
                ? 'bg-sky-500/20 text-sky-700 dark:text-cyan-300 border-sky-400/50 font-bold'
                : 'bg-white/30 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-transparent hover:border-sky-400/30'
            }`}
          >
            全部 ({posts.length})
          </button>
          {yearMonthBuckets.map((bucket) => {
            const active = activeYearMonth === bucket.ym;
            return (
              <button
                key={bucket.ym}
                onClick={() =>
                  setActiveYearMonth(active ? 'ALL' : bucket.ym)
                }
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all border ${
                  active
                    ? 'bg-sky-500/20 text-sky-700 dark:text-cyan-300 border-sky-400/50 font-bold'
                    : 'bg-white/30 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-transparent hover:border-sky-400/30'
                }`}
              >
                {bucket.label} ({bucket.count})
              </button>
            );
          })}
        </div>
      </LiquidPixelCard>

      {/* Live Weather Strip (QWeather, embedded at build time) */}
      <WeatherWidget
        weather={weather}
        status={weatherStatus}
        hint={weatherHint}
        onRequestLocation={onWeatherRelocate}
        previewKind={weatherPreviewKind}
        onSetPreviewKind={onSetWeatherPreview}
        previewIntensity={weatherPreviewIntensity}
        onSetPreviewIntensity={onSetWeatherPreviewIntensity}
      />

      {/* Year-Month Timeline Archive Content */}
      {groupedByYearMonth.length === 0 ? (
        <LiquidPixelCard className="p-12 text-center space-y-2">
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            404 // 未找到匹配的归档文章
          </p>
          <button
            onClick={() => {
              setActiveCategory('ALL');
              setActiveYearMonth('ALL');
              setSearchQuery('');
            }}
            className="text-xs font-mono text-sky-500 hover:underline"
          >
            重置筛选条件
          </button>
        </LiquidPixelCard>
      ) : (
        <div className="relative pl-5 sm:pl-7 space-y-10 before:content-[''] before:absolute before:left-[7px] sm:before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-gradient-to-b before:from-sky-400/70 before:via-pink-400/40 before:to-emerald-400/20">
          {groupedByYearMonth.map((group) => (
            <section key={group.ym} className="relative space-y-4">
              {/* Year-Month Timeline Node Header */}
              <div className="flex items-center gap-3">
                {/* Stepped Pixel Node Dot on Axis */}
                <span className="absolute -left-[20px] sm:-left-[24px] w-4 h-4 bg-sky-500 dark:bg-cyan-400 border-[3px] border-slate-100 dark:border-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.6)]" />

                <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-xl liquid-glass">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {group.label}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[11px] font-mono bg-sky-500/15 text-sky-600 dark:text-cyan-300">
                    {group.items.length} 篇
                  </span>
                </div>
              </div>

              {/* Posts under this Year-Month */}
              {layoutStyle === 'timeline' ? (
                <div className="space-y-4">
                  {group.items.map((post) => {
                    const isLiked = likedPostIds.includes(post.id);
                    const dayStr = post.date.slice(5, 10); // MM-DD

                    return (
                      <div key={post.id} className="relative group">
                        {/* Small Pixel Tick on Axis */}
                        <span className="absolute -left-[16px] sm:-left-[20px] top-7 w-2 h-2 bg-slate-300 dark:bg-slate-700 group-hover:bg-pink-400 transition-colors" />

                        <LiquidPixelCard
                          accent={post.accent}
                          interactive
                          onClick={() => {
                            onSelectPost(post);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-0 overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row items-stretch">
                            {/* Left Pixel Cover Thumbnail */}
                            <div className="relative sm:w-52 h-36 sm:h-auto shrink-0 overflow-hidden border-b sm:border-b-0 sm:border-r border-slate-200/50 dark:border-white/10">
                              <PixelPostCover
                                type={post.coverType}
                                seed={post.coverSeed}
                                className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950/75 text-cyan-300 backdrop-blur-md">
                                  {dayStr}
                                </span>
                                {renderSeedOverlay(post)}
                              </div>
                            </div>

                            {/* Right Content */}
                            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-3">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  <span className="text-sky-600 dark:text-cyan-300 font-semibold">
                                    {post.category}
                                  </span>
                                  <span>·</span>
                                  <span>{post.date}</span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-sky-500" />
                                    {post.readTime}
                                  </span>
                                </div>

                                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-cyan-300 transition-colors leading-snug">
                                  {post.title}
                                </h2>

                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                  {post.excerpt}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-200/40 dark:border-white/5 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleLike(post.id);
                                    }}
                                    className={`flex items-center gap-1 transition-colors ${
                                      isLiked
                                        ? 'text-rose-500 font-semibold'
                                        : 'hover:text-rose-500'
                                    }`}
                                  >
                                    <PixelHeart
                                      filled={isLiked}
                                      className="w-3.5 h-3.5"
                                    />
                                    <span>{post.likes}</span>
                                  </button>

                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3.5 h-3.5" />
                                    {post.views}
                                  </span>

                                  <div className="hidden md:flex items-center gap-1.5">
                                    {post.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 dark:bg-white/5 text-sky-700 dark:text-cyan-300"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <span className="text-sky-600 dark:text-cyan-300 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                  <span>阅读</span>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </LiquidPixelCard>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.items.map((post) => {
                    const isLiked = likedPostIds.includes(post.id);
                    return (
                      <LiquidPixelCard
                        key={post.id}
                        accent={post.accent}
                        interactive
                        onClick={() => {
                          onSelectPost(post);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex flex-col justify-between group"
                      >
                        <div>
                          <div className="relative h-40 w-full overflow-hidden border-b border-white/15">
                            <PixelPostCover
                              type={post.coverType}
                              seed={post.coverSeed}
                              className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950/70 text-cyan-300 border border-white/10 backdrop-blur-md">
                                {post.category}
                              </span>
                              {renderSeedOverlay(post)}
                            </div>
                          </div>

                          <div className="p-5 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              <span>{post.date}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-sky-500" />
                                {post.readTime}
                              </span>
                            </div>

                            <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                              {post.title}
                            </h2>

                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                              {post.excerpt}
                            </p>
                          </div>
                        </div>

                        <div className="px-5 py-3 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleLike(post.id);
                              }}
                              className={`flex items-center gap-1 transition-colors ${
                                isLiked
                                  ? 'text-rose-500 font-semibold'
                                  : 'hover:text-rose-500'
                              }`}
                            >
                              <PixelHeart
                                filled={isLiked}
                                className="w-3.5 h-3.5"
                              />
                              <span>{post.likes}</span>
                            </button>

                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              {post.views}
                            </span>
                          </div>

                          <span className="text-sky-600 dark:text-cyan-300 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>阅读</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </LiquidPixelCard>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
