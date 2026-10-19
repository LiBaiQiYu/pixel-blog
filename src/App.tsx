import React, { useEffect, useRef, useState } from 'react';
import { AUTHOR_PROFILE, INITIAL_POSTS, ensurePostMarkdown } from './data/posts';
import { BlogPost, ThemeMode, ViewMode } from './types/blog';
import { AmbientPixelBackground } from './components/AmbientPixelBackground';
import { Navbar } from './components/Navbar';
import { StandardBlogView } from './components/StandardBlogView';
import { TerminalBlogView } from './components/TerminalBlogView';
import { PixelWeatherBackground } from './components/PixelWeatherBackground';
import { FlyingBackButton } from './components/FlyingBackButton';
import { useWeather } from './hooks/useWeather';
import { isWeatherKind, resolveWeatherVisual } from './utils/weather';
import type { WeatherKind } from './types/weather';
import { pixelAudio } from './utils/sound';
import { Terminal, LayoutGrid } from 'lucide-react';
import { generateRandomSeed } from './components/PixelArtwork';
import {
  PixelCursorEffects,
  triggerPixelLoadingCursor,
} from './components/PixelCursorEffects';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('pixel_blog_view_mode');
    return saved === 'terminal' || saved === 'standard' ? saved : 'standard';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('pixel_blog_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  // Load all static Markdown files from src/posts/*.md and merge any local browser drafts
  const [posts, setPosts] = useState<BlogPost[]>(() => {
    localStorage.removeItem('pixel_blog_posts_v1');
    localStorage.removeItem('pixel_blog_local_drafts_v1');
    const staticIds = new Set(INITIAL_POSTS.map((p) => p.id));
    let localDrafts: BlogPost[] = [];
    const savedDrafts = localStorage.getItem('pixel_blog_local_drafts_v2');
    if (savedDrafts) {
      try {
        const parsed = JSON.parse(savedDrafts);
        if (Array.isArray(parsed)) {
          localDrafts = parsed
            .map(ensurePostMarkdown)
            .filter((d) => !staticIds.has(d.id));
        }
      } catch {
        localDrafts = [];
      }
    }
    return [...localDrafts, ...INITIAL_POSTS];
  });

  const [likedPostIds, setLikedPostIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('pixel_blog_likes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return ['01'];
      }
    }
    return ['01'];
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [weatherBgEnabled, setWeatherBgEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pixel_blog_weather_bg') !== 'off';
  });
  const [pendingTerminalCmd, setPendingTerminalCmd] = useState<string | null>(
    null
  );

  const {
    weather,
    status: weatherStatus,
    hint: weatherHint,
    requestLiveWeather,
  } = useWeather();

  const handleSetWeatherBg = (nextEnabled: boolean) => {
    pixelAudio.playClick();
    setWeatherBgEnabled(nextEnabled);
    localStorage.setItem(
      'pixel_blog_weather_bg',
      nextEnabled ? 'on' : 'off'
    );
  };

  // Temporary preview override: ?weather=rain in URL, or sessionStorage, or terminal/widget switcher
  const [weatherPreviewKind, setWeatherPreviewKind] = useState<
    WeatherKind | null
  >(() => {
    try {
      const urlKind = new URLSearchParams(window.location.search).get(
        'weather'
      );
      if (isWeatherKind(urlKind)) return urlKind;
      const saved = sessionStorage.getItem('pixel_blog_weather_preview');
      if (isWeatherKind(saved)) return saved;
    } catch {
      // ignore URL / storage access errors
    }
    return null;
  });

  const handleSetWeatherPreview = (kind: WeatherKind | null) => {
    setWeatherPreviewKind(kind);
    try {
      if (kind) {
        sessionStorage.setItem('pixel_blog_weather_preview', kind);
        if (weatherPreviewIntensity === null) {
          setWeatherPreviewIntensity(1);
          sessionStorage.setItem('pixel_blog_weather_preview_intensity', '1');
        }
      } else {
        sessionStorage.removeItem('pixel_blog_weather_preview');
        sessionStorage.removeItem('pixel_blog_weather_preview_intensity');
        setWeatherPreviewIntensity(null);
      }
    } catch {
      // ignore storage errors
    }
  };

  const [weatherPreviewIntensity, setWeatherPreviewIntensity] = useState<
    number | null
  >(() => {
    try {
      const urlVal = new URLSearchParams(window.location.search).get('wi');
      const urlNum = urlVal ? Number(urlVal) : NaN;
      if (Number.isFinite(urlNum) && urlNum > 0) return urlNum;
      const saved = sessionStorage.getItem(
        'pixel_blog_weather_preview_intensity'
      );
      const savedNum = saved ? Number(saved) : NaN;
      if (Number.isFinite(savedNum) && savedNum > 0) return savedNum;
    } catch {
      // ignore URL / storage access errors
    }
    return null;
  });

  const handleSetWeatherPreviewIntensity = (value: number | null) => {
    setWeatherPreviewIntensity(value);
    try {
      if (value === null) {
        sessionStorage.removeItem('pixel_blog_weather_preview_intensity');
      } else {
        sessionStorage.setItem(
          'pixel_blog_weather_preview_intensity',
          String(value)
        );
      }
    } catch {
      // ignore storage errors
    }
  };

  const weatherVisual = resolveWeatherVisual(weather.current.code);
  const effectiveWeatherKind = weatherPreviewKind ?? weatherVisual.kind;
  const effectiveWeatherIntensity = weatherPreviewKind
    ? weatherPreviewIntensity ?? 1
    : weatherVisual.intensity;

  // Elastic back-to-list button: flies into the navbar's left side on scroll down
  const backOriginRef = useRef<HTMLButtonElement | null>(null);
  const backDockAnchorRef = useRef<HTMLElement | null>(null);
  const [backDocked, setBackDocked] = useState(false);

  useEffect(() => {
    const readingArticle = viewMode === 'standard' && !!selectedPost;
    if (!readingArticle) {
      setBackDocked(false);
      return;
    }
    const onScroll = () => {
      const y = window.scrollY;
      setBackDocked((prev) => {
        if (!prev && y > 150) return true;
        if (prev && y < 70) return false;
        return prev;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [viewMode, selectedPost]);

  // Sync theme class with <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('pixel_blog_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('pixel_blog_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const staticIds = new Set(INITIAL_POSTS.map((p) => p.id));
    const draftsOnly = posts.filter((p) => !staticIds.has(p.id));
    localStorage.setItem(
      'pixel_blog_local_drafts_v2',
      JSON.stringify(draftsOnly)
    );
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('pixel_blog_likes', JSON.stringify(likedPostIds));
  }, [likedPostIds]);

  const handleViewModeChange = (nextMode: ViewMode) => {
    if (nextMode === viewMode) return;
    triggerPixelLoadingCursor(320);
    pixelAudio.playModeSwitch(nextMode === 'terminal');
    setViewMode(nextMode);
  };

  const handleThemeToggle = (explicitTheme?: ThemeMode) => {
    triggerPixelLoadingCursor(240);
    pixelAudio.playThemeSwitch();
    setTheme((prev) => {
      if (explicitTheme) return explicitTheme;
      return prev === 'dark' ? 'light' : 'dark';
    });
  };

  const handleSoundToggle = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      pixelAudio.enabled = next;
      if (next) pixelAudio.playClick();
      return next;
    });
  };

  const handleToggleLike = (id: string) => {
    pixelAudio.playClick();
    const alreadyLiked = likedPostIds.includes(id);
    setLikedPostIds((prev) =>
      alreadyLiked ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likes: alreadyLiked ? Math.max(0, p.likes - 1) : p.likes + 1 }
          : p
      )
    );
    if (selectedPost && selectedPost.id === id) {
      setSelectedPost((prev) =>
        prev
          ? {
              ...prev,
              likes: alreadyLiked ? Math.max(0, prev.likes - 1) : prev.likes + 1,
            }
          : null
      );
    }
  };

  const handleSelectPost = (post: BlogPost | null) => {
    pixelAudio.playClick();
    if (post) {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, views: p.views + 1 } : p))
      );
    }
    setSelectedPost(post);
  };

  const handleUpdateSeed = (id: string, newSeed: number) => {
    pixelAudio.playClick();
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, coverSeed: newSeed } : p))
    );
    setSelectedPost((prev) =>
      prev && prev.id === id ? { ...prev, coverSeed: newSeed } : prev
    );
  };

  const handleRandomizeAllSeeds = (customBaseSeed?: number) => {
    triggerPixelLoadingCursor(300);
    pixelAudio.playThemeSwitch();
    setPosts((prev) =>
      prev.map((p, idx) => ({
        ...p,
        coverSeed:
          customBaseSeed !== undefined
            ? customBaseSeed + idx * 137
            : generateRandomSeed(),
      }))
    );
    if (selectedPost) {
      setSelectedPost((prev) =>
        prev
          ? {
              ...prev,
              coverSeed:
                customBaseSeed !== undefined
                  ? customBaseSeed
                  : generateRandomSeed(),
            }
          : null
      );
    }
  };

  return (
    <div
      className={`relative flex flex-col ${
        viewMode === 'terminal'
          ? 'h-screen h-dvh overflow-hidden pb-5'
          : 'min-h-screen'
      }`}
    >
      {/* Custom Pixel Mouse Click Spark & Loading Cursor Manager */}
      <PixelCursorEffects />

      {/* Dynamic Pixel Weather Background (driven by live weather kind + strength) */}
      <PixelWeatherBackground
        kind={effectiveWeatherKind}
        intensity={effectiveWeatherIntensity}
        enabled={weatherBgEnabled}
        theme={theme}
        latitude={weather.lat ?? 31.23}
        longitude={weather.lon ?? 121.47}
        windScale={weather.current.windScale ?? 0}
      />

      {/* Ambient Liquid Glass & Pixel Matrix Background */}
      <AmbientPixelBackground mode={viewMode} />

      {/* Top Sticky Liquid Glass Navigation Bar */}
      <Navbar
        viewMode={viewMode}
        theme={theme}
        onThemeToggle={() => handleThemeToggle()}
        soundEnabled={soundEnabled}
        onSoundToggle={handleSoundToggle}
        onResetHome={() => {
          pixelAudio.playClick();
          setSelectedPost(null);
        }}
        selectedPost={selectedPost}
        weatherBgEnabled={weatherBgEnabled}
        onWeatherBgToggle={() => handleSetWeatherBg(!weatherBgEnabled)}
        backDockAnchorRef={backDockAnchorRef}
        articleDocked={backDocked}
      />

      {/* Main Content Container */}
      <main
        className={`relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 ${
          viewMode === 'terminal' ? 'pt-4 sm:pt-5 min-h-0 flex flex-col' : 'pt-4'
        }`}
      >
        {viewMode === 'standard' ? (
          <StandardBlogView
            posts={posts}
            author={AUTHOR_PROFILE}
            selectedPost={selectedPost}
            onSelectPost={handleSelectPost}
            likedPostIds={likedPostIds}
            onToggleLike={handleToggleLike}
            onUpdateSeed={handleUpdateSeed}
            onRandomizeAllSeeds={handleRandomizeAllSeeds}
            weather={weather}
            weatherStatus={weatherStatus}
            weatherHint={weatherHint}
            onWeatherRelocate={requestLiveWeather}
            weatherPreviewKind={weatherPreviewKind}
            onSetWeatherPreview={handleSetWeatherPreview}
            weatherPreviewIntensity={weatherPreviewIntensity}
            onSetWeatherPreviewIntensity={handleSetWeatherPreviewIntensity}
            backOriginRef={backOriginRef}
            onSwitchToTerminal={(cmd) => {
              if (cmd) setPendingTerminalCmd(cmd);
              handleViewModeChange('terminal');
            }}
          />
        ) : (
          <TerminalBlogView
            posts={posts}
            author={AUTHOR_PROFILE}
            theme={theme}
            onToggleTheme={handleThemeToggle}
            onSwitchToStandard={(post) => {
              if (post) setSelectedPost(post);
              handleViewModeChange('standard');
            }}
            likedPostIds={likedPostIds}
            onToggleLike={handleToggleLike}
            onUpdateSeed={handleUpdateSeed}
            onRandomizeAllSeeds={handleRandomizeAllSeeds}
            weatherBgEnabled={weatherBgEnabled}
            onSetWeatherBg={handleSetWeatherBg}
            weatherPreviewKind={weatherPreviewKind}
            onSetWeatherPreview={handleSetWeatherPreview}
            weatherPreviewIntensity={weatherPreviewIntensity}
            onSetWeatherPreviewIntensity={handleSetWeatherPreviewIntensity}
            weather={weather}
            weatherStatus={weatherStatus}
            weatherHint={weatherHint}
            onWeatherRelocate={requestLiveWeather}
            initialCommand={pendingTerminalCmd}
            onConsumeInitialCommand={() => setPendingTerminalCmd(null)}
            onCommandSound={() => pixelAudio.playCommandRun()}
          />
        )}
      </main>

      {/* Minimalist Colophon Footer */}
      {viewMode === 'standard' && (
        <footer className="relative z-20 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="border-t border-slate-300/50 dark:border-white/10 pt-5 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs font-mono text-slate-400 pr-12 sm:pr-0">
            <span>李白的白 · CarlosWhite (LV.7)</span>
            <span>MARKDOWN · PIXEL GLASS</span>
          </div>
        </footer>
      )}

      {/* Elastic back-to-list button (flies between article bar and navbar) */}
      <FlyingBackButton
        visible={viewMode === 'standard' && !!selectedPost}
        docked={backDocked}
        originRef={backOriginRef}
        dockRef={backDockAnchorRef}
        onClick={() => {
          setSelectedPost(null);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }}
      />

      {/* Subtle Floating Mode Toggle Button (bottom-right; lifted above terminal input on mobile) */}
      <button
        onClick={() =>
          handleViewModeChange(
            viewMode === 'standard' ? 'terminal' : 'standard'
          )
        }
        title={
          viewMode === 'standard'
            ? '切换至终端风格'
            : '切换至普通博客风格'
        }
        className={`fixed z-40 liquid-pill rounded-full flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300 opacity-75 hover:opacity-100 transition-all shadow-lg p-2.5 sm:px-3.5 sm:py-2 ${
          viewMode === 'terminal'
            ? 'bottom-[5rem] right-3 sm:bottom-5 sm:right-5'
            : 'bottom-3 right-3 sm:bottom-5 sm:right-5'
        }`}
      >
        {viewMode === 'standard' ? (
          <>
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">终端模式</span>
          </>
        ) : (
          <>
            <LayoutGrid className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">普通博客</span>
          </>
        )}
      </button>
    </div>
  );
};
export default App;
