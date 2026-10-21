import React from 'react';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  ChevronRight,
  CloudSun,
  CloudOff,
} from 'lucide-react';
import { BlogPost, ThemeMode, ViewMode } from '../types/blog';
import { PixelLogoMark } from './PixelArtwork';

interface NavbarProps {
  viewMode: ViewMode;
  theme: ThemeMode;
  onThemeToggle: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  onResetHome: () => void;
  selectedPost?: BlogPost | null;
  weatherBgEnabled: boolean;
  onWeatherBgToggle: () => void;
  /** Anchor element where the flying back button docks when scrolling down */
  backDockAnchorRef?: React.RefObject<HTMLElement | null>;
  articleDocked?: boolean;
  /** Slide the whole navbar out of the screen (gallery photo preview) */
  concealed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  theme,
  onThemeToggle,
  soundEnabled,
  onSoundToggle,
  onResetHome,
  selectedPost,
  weatherBgEnabled,
  onWeatherBgToggle,
  backDockAnchorRef,
  articleDocked = false,
  concealed = false,
}) => {
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
      <div className="liquid-glass-strong rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 relative overflow-hidden">
        {/* Top Iridescent Specular Highlight */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-sky-400/40 via-white/60 to-pink-400/40" />

        {/* Left: Brand Identity + Context Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
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
            className="block w-0 h-7 shrink-0"
          />

          {viewMode === 'standard' && selectedPost && !articleDocked && (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400 pl-1 truncate max-w-[240px]">
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="text-sky-600 dark:text-cyan-300 truncate">
                {selectedPost.title}
              </span>
            </div>
          )}
        </div>

        {/* Right: Minimalist Actions (Weather Background, Sound, Theme) */}
        <div className="flex items-center gap-2">
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
            onClick={onThemeToggle}
            className="liquid-pill px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono text-slate-700 dark:text-slate-200"
            title="切换深色/浅色主题"
          >
            {theme === 'dark' ? (
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
    </header>
  );
};
