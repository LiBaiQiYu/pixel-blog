import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Terminal,
  Copy,
  Check,
  Clock,
  Eye,
  Calendar,
  Share2,
  Dices,
  Hash,
  FileCode,
  BookOpen,
  Download,
} from 'lucide-react';
import { BlogPost } from '../types/blog';
import { LiquidPixelCard } from './LiquidPixelCard';
import {
  PixelHeart,
  PixelPostCover,
  generateRandomSeed,
  normalizeSeed,
} from './PixelArtwork';
import { MarkdownRenderer, extractMarkdownToc } from './MarkdownRenderer';
import {
  downloadMarkdownPostFile,
  serializePostToMarkdownFile,
} from '../data/posts';
import { pixelAudio } from '../utils/sound';

interface ArticleModalProps {
  post: BlogPost;
  isLiked: boolean;
  onToggleLike: (id: string) => void;
  onUpdateSeed: (id: string, newSeed: number) => void;
  onClose: () => void;
  onOpenInTerminal: (post: BlogPost) => void;
  onSelectPost: (post: BlogPost) => void;
  relatedPosts: BlogPost[];
  backOriginRef?: React.RefObject<HTMLButtonElement | null>;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  post,
  isLiked,
  onToggleLike,
  onUpdateSeed,
  onClose,
  onOpenInTerminal,
  onSelectPost,
  relatedPosts,
  backOriginRef,
}) => {
  const [shareFeedback, setShareFeedback] = useState<
    'copied' | 'failed' | null
  >(null);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [viewRawMd, setViewRawMd] = useState(false);
  const [seedDraft, setSeedDraft] = useState<string>(String(post.coverSeed));
  const shareTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSeedDraft(String(post.coverSeed));
  }, [post.id, post.coverSeed]);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) {
        window.clearTimeout(shareTimerRef.current);
      }
    };
  }, []);

  const toc = useMemo(() => extractMarkdownToc(post.markdown), [post.markdown]);

  const fullMarkdownFile = useMemo(
    () => serializePostToMarkdownFile(post),
    [post]
  );

  const showShareFeedback = (next: 'copied' | 'failed') => {
    if (shareTimerRef.current) {
      window.clearTimeout(shareTimerRef.current);
    }
    setShareFeedback(next);
    shareTimerRef.current = window.setTimeout(
      () => setShareFeedback(null),
      2000
    );
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      pixelAudio.playCopy();
      showShareFeedback('copied');
    } catch {
      showShareFeedback('failed');
    }
  };

  const handleCopyRawMarkdown = () => {
    navigator.clipboard.writeText(fullMarkdownFile);
    pixelAudio.playCopy();
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 1800);
  };

  const handleSeedInputChange = (val: string) => {
    setSeedDraft(val);
    if (val.trim() !== '') {
      onUpdateSeed(post.id, normalizeSeed(val));
    }
  };

  const handleRandomSeed = () => {
    const next = generateRandomSeed();
    setSeedDraft(String(next));
    onUpdateSeed(post.id, next);
  };

  return (
    <div className="animate-fadeIn space-y-6 pb-16">
      {/* Sticky Scroll-Following Action Bar (back button flies to the navbar on scroll) */}
      <div className="sticky top-[5.5rem] z-30 flex items-center justify-between gap-2 pointer-events-none">
        <button
          ref={backOriginRef}
          onClick={onClose}
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none invisible liquid-glass-strong px-3 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-mono font-semibold text-slate-800 dark:text-slate-100 shadow-lg shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-sky-500" />
          <span>返回列表</span>
        </button>

        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Toggle Rendered Markdown vs Raw .MD Source */}
          <button
            onClick={() => setViewRawMd((prev) => !prev)}
            className={`liquid-glass-strong px-2.5 sm:px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-mono font-semibold shadow-md transition-colors ${
              viewRawMd
                ? 'text-pink-600 dark:text-pink-300 border-pink-400/50'
                : 'text-sky-700 dark:text-cyan-300'
            }`}
          >
            {viewRawMd ? (
              <>
                <BookOpen className="w-3.5 h-3.5" />
                <span>渲染</span>
              </>
            ) : (
              <>
                <FileCode className="w-3.5 h-3.5" />
                <span>源码</span>
              </>
            )}
          </button>

          <button
            onClick={() => onOpenInTerminal(post)}
            className="liquid-glass-strong px-2.5 sm:px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:border-emerald-400 shadow-md"
            title="在终端打开"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">终端打开</span>
          </button>

          <button
            data-custom-sound
            onClick={handleShare}
            className="liquid-glass-strong px-2.5 sm:px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-md"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">
              {shareFeedback === 'copied'
                ? '已复制'
                : shareFeedback === 'failed'
                  ? '复制失败'
                  : '分享'}
            </span>
          </button>
        </div>
      </div>

      {shareFeedback &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className={`pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 animate-fadeIn rounded-xl border px-4 py-2.5 font-mono text-xs shadow-2xl backdrop-blur-xl ${
              shareFeedback === 'copied'
                ? 'border-emerald-400/40 bg-emerald-50/95 text-emerald-700 dark:border-emerald-300/25 dark:bg-emerald-950/90 dark:text-emerald-200'
                : 'border-rose-400/40 bg-rose-50/95 text-rose-700 dark:border-rose-300/25 dark:bg-rose-950/90 dark:text-rose-200'
            }`}
          >
            {shareFeedback === 'copied'
              ? '文章链接已复制'
              : '复制失败，请手动复制地址栏'}
          </div>,
          document.body
        )}

      {/* Hero Article Header Card: Pure Cover Art + Clearly Separated Title Panel */}
      <LiquidPixelCard accent={post.accent} strong className="p-0 overflow-hidden">
        {/* Cover Artwork Section (No gradient overlay) */}
        <div className="relative h-40 sm:h-56 w-full overflow-hidden">
          <PixelPostCover
            type={post.coverType}
            seed={post.coverSeed}
            className="absolute inset-0 w-full h-full"
          />

          {/* Top Floating Metadata & Interactive Seed Generator */}
          <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-mono font-bold bg-white/90 text-sky-700 border border-sky-400/50 dark:bg-slate-950/80 dark:text-cyan-300 dark:border-cyan-400/40 backdrop-blur-md truncate max-w-[180px] sm:max-w-none">
              {post.id}_{post.slug}.md
            </span>

            {/* Interactive Cover Seed Controller */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/90 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/20 backdrop-blur-md text-xs font-mono">
              <Hash className="w-3 h-3 text-sky-600 dark:text-cyan-400 shrink-0" />
              <input
                type="text"
                value={seedDraft}
                onChange={(e) => handleSeedInputChange(e.target.value)}
                aria-label="封面种子序号"
                className="w-16 sm:w-20 px-1 py-0.5 rounded bg-white dark:bg-slate-900 text-sky-700 dark:text-cyan-300 font-bold border border-sky-400/50 dark:border-cyan-500/30 focus:outline-none focus:border-sky-400 text-center text-[11px] sm:text-xs"
              />
              <button
                type="button"
                onClick={handleRandomSeed}
                className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 border border-emerald-500/40 dark:bg-emerald-500/25 dark:hover:bg-emerald-500/40 dark:text-emerald-300 dark:border-emerald-400/40 flex items-center gap-1 transition-colors text-[11px] sm:text-xs"
                title="随机生成新的封面种子"
              >
                <Dices className="w-3 h-3" />
                <span>随机</span>
              </button>
            </div>
          </div>
        </div>

        {/* Title & Subtitle Panel (Distinct solid glass layer, separated by border) */}
        <div className="relative z-10 px-5 sm:px-8 py-5 sm:py-7 border-t-2 border-sky-400/30 dark:border-cyan-400/25 bg-white/55 dark:bg-slate-950/45 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-700 border border-sky-400/30 dark:bg-white/10 dark:text-cyan-200 dark:border-white/20"
              >
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
            {post.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {post.subtitle}
          </p>
        </div>

        {/* Sub-bar Telemetry */}
        <div className="px-5 sm:px-8 py-3.5 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/30 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              {post.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-pink-500" />
              {post.views.toLocaleString()} READS
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              {post.readTime}
            </span>
          </div>

          <button
            data-custom-sound
            onClick={() => onToggleLike(post.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all border ${
              isLiked
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-400/50 scale-105'
                : 'bg-slate-200/60 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-white/10 hover:border-rose-400/40'
            }`}
          >
            <PixelHeart filled={isLiked} className="w-4 h-4" />
            <span>{post.likes} PIXEL HEARTS</span>
          </button>
        </div>
      </LiquidPixelCard>

      {/* Main Content + Optional Sticky Liquid Glass Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Article Body */}
        <LiquidPixelCard
          accent={post.accent}
          className={`${
            toc.length > 0 || relatedPosts.length > 0
              ? 'lg:col-span-8'
              : 'lg:col-span-12'
          } p-6 sm:p-8 space-y-6`}
        >
          {viewRawMd ? (
            <div className="rounded-xl overflow-hidden border border-slate-300/80 dark:border-white/15 bg-slate-950 text-slate-100 shadow-lg">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-cyan-300 font-bold">
                  blog/{post.id}/post.md
                </span>
                <div className="flex items-center gap-2">
                  <button
                    data-custom-sound
                    onClick={handleCopyRawMarkdown}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                  >
                    {copiedRaw ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>复制源码</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => downloadMarkdownPostFile(post)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/35 text-cyan-300 border border-cyan-400/30 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下载 .md</span>
                  </button>
                </div>
              </div>
              <pre className="p-5 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed text-emerald-200 whitespace-pre-wrap">
                <code>{fullMarkdownFile}</code>
              </pre>
            </div>
          ) : (
            <MarkdownRenderer
              content={post.markdown}
              variant="gui"
              imageBaseUrl={post.assetBaseUrl}
            />
          )}
        </LiquidPixelCard>

        {/* Right Sticky Sidebar: Only shown when TOC or Related Posts exist */}
        {(toc.length > 0 || relatedPosts.length > 0) && (
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-[8.75rem]">
            {toc.length > 0 && (
              <LiquidPixelCard accent="cyan" className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-2.5">
                  <span className="font-pixel text-[11px] text-sky-600 dark:text-cyan-400">
                    MD_TOC // 章节大纲
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {toc.length} HEADINGS
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm font-mono">
                  {toc.map((item) => (
                    <li
                      key={item.id}
                      style={{ paddingLeft: `${(item.level - 1) * 10}px` }}
                    >
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setViewRawMd(false);
                          const target = document.getElementById(item.id);
                          if (target) {
                            target.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                            try {
                              window.history.replaceState(
                                null,
                                '',
                                `#${item.id}`
                              );
                            } catch {
                              // ignore history restrictions
                            }
                          }
                        }}
                        className="block px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-cyan-300 hover:translate-x-0.5 transition-all duration-200 truncate"
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </LiquidPixelCard>
            )}

            {relatedPosts.length > 0 && (
              <LiquidPixelCard accent="magenta" className="p-5 space-y-3.5">
                <span className="font-pixel text-[11px] text-pink-600 dark:text-pink-400 block">
                  RELATED // 邻近文章
                </span>
                <div className="space-y-2.5">
                  {relatedPosts.map((rel) => (
                    <button
                      key={rel.id}
                      onClick={() => onSelectPost(rel)}
                      className="w-full text-left p-3 rounded-xl bg-white/40 dark:bg-slate-900/50 hover:bg-sky-500/15 border border-slate-200/60 dark:border-white/10 transition-all group"
                    >
                      <div className="text-[10px] font-mono text-sky-600 dark:text-cyan-400 mb-0.5">
                        #{rel.id} · {rel.category}
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-500 dark:group-hover:text-cyan-300 line-clamp-1">
                        {rel.title}
                      </div>
                    </button>
                  ))}
                </div>
              </LiquidPixelCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
