import React from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Volume2,
  VolumeX,
  ChevronRight,
  CloudSun,
  CloudOff,
  Maximize2,
  Music,
  Music2,
} from 'lucide-react';
import {
  BlogPost,
  ContentPage,
  ThemePreference,
  ViewMode,
} from '../types/blog';
import { PixelLogoMark } from './PixelArtwork';

const CONTENT_PAGES: { id: ContentPage; label: string }[] = [
  { id: 'home', label: '首页' },
  { id: 'gallery', label: '画廊' },
  { id: 'friends', label: '友链' },
  { id: 'about', label: '关于我' },
];

interface NavbarProps {
  viewMode: ViewMode;
  contentPage: ContentPage;
  onContentPageChange: (page: ContentPage) => void;
  themePreference: ThemePreference;
  onThemeToggle: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  musicEnabled: boolean;
  onMusicToggle: () => void;
  onResetHome: () => void;
  selectedPost?: BlogPost | null;
  weatherBgEnabled: boolean;
  onWeatherBgToggle: () => void;
  onImmersiveWeather: () => void;
  /** Anchor element where the flying back button docks when scrolling down */
  backDockAnchorRef?: React.RefObject<HTMLElement | null>;
  articleDocked?: boolean;
  /** Slide the whole navbar out of the screen (gallery photo preview) */
  concealed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  contentPage,
  onContentPageChange,
  themePreference,
  onThemeToggle,
  soundEnabled,
  onSoundToggle,
  musicEnabled,
  onMusicToggle,
  onResetHome,
  selectedPost,
  weatherBgEnabled,
  onWeatherBgToggle,
  onImmersiveWeather,
  backDockAnchorRef,
  articleDocked = false,
  concealed = false,
}) => {
  const activePageIndex = Math.max(
    0,
    CONTENT_PAGES.findIndex((page) => page.id === contentPage)
  );

  const renderContentNav = (mobile: boolean) => {
    if (viewMode === 'terminal') return null;

    return (
      <nav
        className={`relative grid grid-cols-4 rounded-xl border border-slate-300/50 bg-white/45 p-0.5 font-mono dark:border-white/10 dark:bg-slate-950/50 ${
          mobile
            ? 'w-full text-[10px] md:hidden'
            : 'hidden w-[248px] text-[11px] md:grid lg:w-[264px]'
        }`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0.5 z-0"
        >
          <span
            className="block h-full rounded-lg bg-sky-500 shadow-[0_2px_12px_rgba(14,165,233,0.35)] transition-transform duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform"
            style={{
              width: `${100 / CONTENT_PAGES.length}%`,
              transform: `translateX(${activePageIndex * 100}%)`,
            }}
          />
        </span>
        {CONTENT_PAGES.map((page) => {
          const active = contentPage === page.id;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onContentPageChange(page.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 w-full rounded-lg px-1 py-1.5 text-center transition-colors duration-200 ${
                active
                  ? 'font-semibold text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {page.label}
            </button>
          );
        })}
      </nav>
    );
  };

  return (
    <header
      className={`${
        viewMode !== 'terminal' ? 'sticky top-4' : 'relative'
      } mt-4 shrink-0 z-40 px-4 sm:px-6 lg:px-8 max-w-6xl w-full mx-auto transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        concealed
          ? '-translate-y-[190%] opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="liquid-glass-strong rounded-2xl px-4 py-2.5 flex flex-col gap-2 relative overflow-hidden">
        {/* Top Iridescent Specular Highlight */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-sky-400/40 via-white/60 to-pink-400/40" />

        <div className="flex w-full items-center justify-between gap-3">
          {/* Left: Brand Identity + Context Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onResetHome}
            className="flex items-center gap-2.5 text-left group focus:outline-none shrink-0"
          >
            <div className="relative p-1.5 rounded-xl bg-slate-900/85 dark:bg-slate-950/90 border border-sky-400/30 shadow-inner group-hover:scale-105 transition-transform">
              <PixelLogoMark className="w-5 h-5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-bold text-sm sm:text-base tracking-wide text-slate-900 dark:text-white ${
                  articleDocked ? 'hidden sm:inline' : ''
                }`}
              >
                李白的白
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                CarlosWhite · LV.7
              </span>
            </div>
          </button>

          {/* Dock anchor: the flying back button parks here when scrolling down */}
          <span
            ref={backDockAnchorRef}
            aria-hidden="true"
            className={`block h-7 shrink-0 transition-[width] duration-300 ease-out ${
              articleDocked ? 'w-12 sm:w-28' : 'w-0'
            }`}
          />

          {viewMode === 'standard' && selectedPost && !articleDocked && (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400 pl-1 truncate max-w-[240px]">
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="text-sky-600 dark:text-cyan-300 truncate">
                {selectedPost.title}
              </span>
            </div>
          )}

          {renderContentNav(false)}
        </div>

        {/* Right: Minimalist Actions (Weather Background, Sound, Theme) */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onWeatherBgToggle}
            className={`liquid-pill p-1.5 rounded-xl flex items-center justify-center transition-colors ${
              weatherBgEnabled
                ? 'text-sky-600 dark:text-cyan-300'
                : 'text-slate-400 dark:text-slate-600'
            }`}
            title={
              weatherBgEnabled
                ? '天气动态背景：已开启 (点击关闭)'
                : '天气动态背景：已关闭 (点击开启)'
            }
            aria-label="切换天气动态背景"
          >
            {weatherBgEnabled ? (
              <CloudSun className="w-3.5 h-3.5" />
            ) : (
              <CloudOff className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={onImmersiveWeather}
            className="liquid-pill p-1.5 rounded-xl flex items-center justify-center text-sky-600 transition-colors dark:text-cyan-300"
            title="沉浸式天气：隐藏标题栏和内容"
            aria-label="开启沉浸式天气"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onMusicToggle}
            aria-pressed={musicEnabled}
            className={`liquid-pill p-1.5 rounded-xl flex items-center justify-center transition-colors ${
              musicEnabled
                ? 'text-fuchsia-600 dark:text-fuchsia-300'
                : 'text-slate-400 dark:text-slate-600'
            }`}
            title={musicEnabled ? '关闭背景音乐' : '播放 8bit 背景音乐'}
            aria-label={musicEnabled ? '关闭背景音乐' : '播放背景音乐'}
          >
            {musicEnabled ? (
              <Music2 className="w-3.5 h-3.5" />
            ) : (
              <Music className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={onSoundToggle}
            className={`liquid-pill p-1.5 rounded-xl flex items-center justify-center transition-colors ${
              soundEnabled
                ? 'text-slate-700 dark:text-slate-300'
                : 'text-slate-400 dark:text-slate-600'
            }`}
            title={soundEnabled ? '音效已开启' : '音效已静音'}
            aria-label="切换音效"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            data-custom-sound
            onClick={onThemeToggle}
            className="liquid-pill px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono text-slate-700 dark:text-slate-200"
            title={`主题模式：${
              themePreference === 'auto'
                ? '自动'
                : themePreference === 'dark'
                  ? '深色'
                  : '浅色'
            }（点击切换）`}
          >
            {themePreference === 'auto' ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-300" />
                <span className="hidden sm:inline">自动</span>
              </>
            ) : themePreference === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">深色</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">浅色</span>
              </>
            )}
          </button>
        </div>
        </div>

        {renderContentNav(true)}
      </div>
    </header>
  );
};
