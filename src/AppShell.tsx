'use client';

import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AUTHOR_PROFILE } from './data/posts';
import { fetchBlogPosts } from './lib/blog-api';
import { APP_ENV } from './lib/app-env';
import { startRouteTransition } from './lib/route-transition';
import {
  BlogPost,
  ContentPage,
  ThemeMode,
  ThemePreference,
  ViewMode,
} from './types/blog';
import { AmbientPixelBackground } from './components/AmbientPixelBackground';
import { PixelSplash } from './components/PixelSplash';
import { BlogShellProvider } from './components/BlogShellContext';
import { Navbar } from './components/Navbar';
import { StandardBlogView } from './components/StandardBlogView';
import { TerminalBlogView } from './components/TerminalBlogView';
import { FriendsView } from './components/FriendsView';
import { TerminalFriendsView } from './components/TerminalFriendsView';
import { PixelWeatherBackground } from './components/PixelWeatherBackground';
import { FlyingBackButton } from './components/FlyingBackButton';
import { useWeather } from './hooks/useWeather';
import { isWeatherKind, resolveWeatherVisual } from './utils/weather';
import type { WeatherKind } from './types/weather';
import { pixelAudio } from './utils/sound';
import type { MusicMood } from './utils/sound';
import { Eye, Terminal, LayoutGrid, Settings, Minimize2 } from 'lucide-react';
import { generateRandomSeed } from './components/PixelArtwork';
import {
  PixelCursorEffects,
  triggerPixelLoadingCursor,
} from './components/PixelCursorEffects';
import {
  fetchLikedPostIds,
  fetchPostStats,
  recordPostView,
  recordSiteVisit,
  setPostLike,
} from './lib/post-stats';
import type { PostStats } from './lib/post-stats';

// MapLibre is heavy: load the gallery (and the map engine) only when needed
const GalleryView = lazy(() =>
  import('./components/GalleryView').then((module) => ({
    default: module.GalleryView,
  }))
);

const TerminalGalleryView = lazy(() =>
  import('./components/TerminalGalleryView').then((module) => ({
    default: module.TerminalGalleryView,
  }))
);

const AboutView = lazy(() =>
  import('./components/AboutView').then((module) => ({
    default: module.AboutView,
  }))
);

interface AppShellProps {
  initialPosts?: BlogPost[];
  children: React.ReactNode;
}

function parseWeatherPreviewHour(value: string | null) {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hour = Number(trimmed);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23
    ? hour
    : null;
}

export const AppShell: React.FC<AppShellProps> = ({
  initialPosts,
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const isArticleRoute = pathname.startsWith('/posts/');
  const isGalleryPreviewRoute = pathname.startsWith('/gallery/');
  const galleryPreviewId = isGalleryPreviewRoute
    ? decodeURIComponent(pathname.slice('/gallery/'.length).split('/')[0])
    : null;
  const galleryPreviewOpen = Boolean(galleryPreviewId);
  const pathContentPage: ContentPage = pathname.startsWith('/gallery')
    ? 'gallery'
    : pathname.startsWith('/friends')
      ? 'friends'
      : pathname.startsWith('/about')
        ? 'about'
        : 'home';
  const [pendingContentPage, setPendingContentPage] =
    useState<ContentPage | null>(null);
  const contentPage = pendingContentPage ?? pathContentPage;

  useEffect(() => {
    if (pendingContentPage && pathContentPage === pendingContentPage) {
      setPendingContentPage(null);
    }
  }, [pathContentPage, pendingContentPage]);

  const [prefsReady, setPrefsReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const shellViewMode: ViewMode = isArticleRoute ? 'standard' : viewMode;

  const [themePreference, setThemePreference] =
    useState<ThemePreference>('auto');
  const [systemTheme, setSystemTheme] = useState<ThemeMode>('dark');
  const theme: ThemeMode =
    themePreference === 'auto' ? systemTheme : themePreference;

  const [posts, setPosts] = useState<BlogPost[]>(initialPosts ?? []);
  const [postsLoading, setPostsLoading] = useState(!initialPosts);
  const [postsError, setPostsError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      setPosts(await fetchBlogPosts());
    } catch (error) {
      setPosts([]);
      setPostsError(
        error instanceof Error ? error.message : 'R2 博文索引加载失败'
      );
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialPosts) void loadPosts();
  }, [initialPosts, loadPosts]);

  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [postStats, setPostStats] = useState<Record<string, PostStats>>({});
  const [siteVisits, setSiteVisits] = useState<number | null>(null);
  const [articleMeta, setArticleMeta] = useState<BlogPost | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [localHour, setLocalHour] = useState(() => new Date().getHours());
  const [immersiveWeather, setImmersiveWeather] = useState(false);
  const likeRequestSeqRef = useRef<Record<string, number>>({});
  const [weatherBgEnabled, setWeatherBgEnabled] = useState(true);
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

  const handleEnterImmersiveWeather = () => {
    pixelAudio.playClick();
    triggerPixelLoadingCursor(260);
    setImmersiveWeather(true);
  };

  const handleExitImmersiveWeather = () => {
    pixelAudio.playClick();
    setImmersiveWeather(false);
  };

  useEffect(() => {
    if (!immersiveWeather) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        pixelAudio.playClick();
        setImmersiveWeather(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [immersiveWeather]);

  // Temporary preview override: ?weather=rain in URL, or sessionStorage, or terminal/widget switcher
  const [weatherPreviewKind, setWeatherPreviewKind] =
    useState<WeatherKind | null>(null);
  const [weatherPreviewHour, setWeatherPreviewHour] =
    useState<number | null>(null);

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
        sessionStorage.removeItem('pixel_blog_weather_preview_hour');
        setWeatherPreviewIntensity(null);
        setWeatherPreviewHour(null);
      }
    } catch {
      // ignore storage errors
    }
  };

  const [weatherPreviewIntensity, setWeatherPreviewIntensity] =
    useState<number | null>(null);

  useEffect(() => {
    try {
      const savedView = localStorage.getItem('pixel_blog_view_mode');
      if (savedView === 'terminal' || savedView === 'standard') {
        setViewMode(savedView);
      }
      const savedTheme = localStorage.getItem(
        'pixel_blog_theme_preference'
      );
      if (
        savedTheme === 'light' ||
        savedTheme === 'dark' ||
        savedTheme === 'auto'
      ) {
        setThemePreference(savedTheme);
      } else {
        setThemePreference('auto');
      }
      if (localStorage.getItem('pixel_blog_weather_bg') === 'off') {
        setWeatherBgEnabled(false);
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('terminal') === '1') {
        setViewMode('terminal');
        const command = params.get('cmd');
        if (command) setPendingTerminalCmd(command);
      }
      const urlKind = params.get('weather');
      const savedKind = sessionStorage.getItem(
        'pixel_blog_weather_preview'
      );
      if (isWeatherKind(urlKind)) {
        setWeatherPreviewKind(urlKind);
      } else if (isWeatherKind(savedKind)) {
        setWeatherPreviewKind(savedKind);
      }

      const urlIntensity = Number(params.get('wi'));
      if (Number.isFinite(urlIntensity) && urlIntensity > 0) {
        setWeatherPreviewIntensity(urlIntensity);
      } else {
        const savedIntensity = Number(
          sessionStorage.getItem('pixel_blog_weather_preview_intensity')
        );
        if (Number.isFinite(savedIntensity) && savedIntensity > 0) {
          setWeatherPreviewIntensity(savedIntensity);
        }
      }

      const urlHour = parseWeatherPreviewHour(params.get('wh'));
      if (urlHour !== null) {
        setWeatherPreviewHour(urlHour);
      } else {
        const savedHour = parseWeatherPreviewHour(
          sessionStorage.getItem('pixel_blog_weather_preview_hour')
        );
        if (savedHour !== null) {
          setWeatherPreviewHour(savedHour);
        }
      }
    } catch {
      // ignore storage access errors
    } finally {
      setPrefsReady(true);
    }
  }, []);

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

  const handleSetWeatherPreviewHour = (value: number | null) => {
    setWeatherPreviewHour(value);
    try {
      if (value === null) {
        sessionStorage.removeItem('pixel_blog_weather_preview_hour');
      } else {
        sessionStorage.setItem(
          'pixel_blog_weather_preview_hour',
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

  const musicMood = useMemo<MusicMood>(() => {
    if (
      ['thunder', 'hail', 'sand', 'wind'].includes(effectiveWeatherKind)
    ) {
      return 'storm';
    }
    if (['rain', 'sleet', 'fog', 'haze'].includes(effectiveWeatherKind)) {
      return 'rain';
    }
    if (effectiveWeatherKind === 'snow') return 'night';
    if (localHour >= 21 || localHour < 6) return 'night';
    if (localHour >= 17) return 'dusk';
    return 'day';
  }, [effectiveWeatherKind, localHour]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setLocalHour(new Date().getHours()),
      60_000
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!musicEnabled) return;
    void pixelAudio.setMusicMood(musicMood);
  }, [musicEnabled, musicMood]);

  // Elastic back-to-list button: flies into the navbar's left side on scroll down
  const backOriginRef = useRef<HTMLButtonElement | null>(null);
  const backDockAnchorRef = useRef<HTMLElement | null>(null);
  const [backDocked, setBackDocked] = useState(false);

  useEffect(() => {
    if (!isArticleRoute) {
      setArticleMeta(null);
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
  }, [isArticleRoute]);

  useLayoutEffect(() => {
    if (!isArticleRoute) return;

    const resetScroll = () => {
      const scroller = document.scrollingElement ?? document.documentElement;
      scroller.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    const timer = window.setTimeout(resetScroll, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [isArticleRoute, pathname]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      setSystemTheme(media.matches ? 'dark' : 'light');
    };

    syncSystemTheme();
    media.addEventListener('change', syncSystemTheme);
    return () => media.removeEventListener('change', syncSystemTheme);
  }, []);

  // Sync theme class with <html>
  useEffect(() => {
    if (!prefsReady) return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme;
    root.dataset.themePreference = themePreference;
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (themeColor) {
      themeColor.content = theme === 'dark' ? '#060913' : '#f8fafc';
    }
    localStorage.setItem('pixel_blog_theme_preference', themePreference);
  }, [theme, themePreference, prefsReady]);

  useEffect(() => {
    if (prefsReady) {
      localStorage.setItem('pixel_blog_view_mode', viewMode);
    }
  }, [viewMode, prefsReady]);

  useEffect(() => {
    localStorage.setItem('pixel_blog_likes', JSON.stringify(likedPostIds));
  }, [likedPostIds]);

  useEffect(() => {
    let cancelled = false;

    recordSiteVisit()
      .then((visits) => {
        if (!cancelled) setSiteVisits(visits);
      })
      .catch(() => {
        // Keep the counter hidden when the stats API is unavailable.
      });

    fetchPostStats()
      .then((stats) => {
        if (cancelled) return;
        setPostStats(stats);
        setPosts((prev) =>
          prev.map((post) => ({
            ...post,
            ...(stats[post.id] ?? { views: 0, likes: 0 }),
          }))
        );
      })
      .catch(() => {
        // Keep the static fallback counts when the stats API is unreachable.
      });

    fetchLikedPostIds()
      .then((ids) => {
        if (!cancelled) setLikedPostIds(ids);
      })
      .catch(() => {
        // Keep locally remembered likes until the API is available.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyPostStats = useCallback((id: string, stats: PostStats) => {
    setPostStats((prev) => ({ ...prev, [id]: stats }));
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? { ...post, views: stats.views, likes: stats.likes }
          : post
      )
    );
  }, []);

  const recordView = useCallback(
    (id: string) => {
      recordPostView(id)
        .then((stats) => applyPostStats(id, stats))
        .catch(() => {
          // Do not inflate local counts when the API call fails.
        });
    },
    [applyPostStats]
  );

  const handleViewModeChange = (nextMode: ViewMode) => {
    if (nextMode === viewMode) return;
    triggerPixelLoadingCursor(320);
    pixelAudio.playModeSwitch(nextMode === 'terminal');
    setViewMode(nextMode);
  };

  const handleContentPageChange = (nextPage: ContentPage) => {
    if (nextPage === contentPage && !isArticleRoute) return;
    setPendingContentPage(nextPage);
    pixelAudio.playClick();
    router.push(nextPage === 'home' ? '/' : `/${nextPage}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openGalleryPreview = (id: string) => {
    router.push(`/gallery/${encodeURIComponent(id)}`, { scroll: false });
  };

  const navigateGalleryPreview = (id: string) => {
    router.replace(`/gallery/${encodeURIComponent(id)}`, { scroll: false });
  };

  const closeGalleryPreview = () => {
    router.replace('/gallery', { scroll: false });
  };

  const handleThemeToggle = (explicitTheme?: ThemePreference) => {
    triggerPixelLoadingCursor(240);
    pixelAudio.playThemeSwitch();
    setThemePreference((prev) => {
      if (explicitTheme) return explicitTheme;
      if (prev === 'auto') return 'dark';
      if (prev === 'dark') return 'light';
      return 'auto';
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

  const handleMusicToggle = async () => {
    const next = !musicEnabled;
    setMusicEnabled(next);
    pixelAudio.playClick();
    const started = await pixelAudio.setMusicEnabled(next, musicMood);
    if (next && !started) setMusicEnabled(false);
  };

  const handleToggleLike = (id: string) => {
    const nextLiked = !likedPostIds.includes(id);
    pixelAudio.playHeart(nextLiked);
    const delta = nextLiked ? 1 : -1;
    const seq = (likeRequestSeqRef.current[id] ?? 0) + 1;
    likeRequestSeqRef.current[id] = seq;

    setLikedPostIds((prev) =>
      nextLiked
        ? [...prev.filter((item) => item !== id), id]
        : prev.filter((item) => item !== id)
    );
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likes: Math.max(0, p.likes + delta) }
          : p
      )
    );
    setPostStats((prev) => {
      const current = prev[id] ?? { views: 0, likes: 0 };
      return {
        ...prev,
        [id]: { ...current, likes: Math.max(0, current.likes + delta) },
      };
    });

    setPostLike(id, nextLiked)
      .then((stats) => {
        if (likeRequestSeqRef.current[id] === seq) {
          applyPostStats(id, stats);
        }
      })
      .catch(() => {
        if (likeRequestSeqRef.current[id] !== seq) return;
        setLikedPostIds((prev) =>
          nextLiked
            ? prev.filter((item) => item !== id)
            : [...prev.filter((item) => item !== id), id]
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, likes: Math.max(0, p.likes - delta) }
              : p
          )
        );
        setPostStats((prev) => {
          const current = prev[id] ?? { views: 0, likes: 0 };
          return {
            ...prev,
            [id]: {
              ...current,
              likes: Math.max(0, current.likes - delta),
            },
          };
        });
      });
  };

  const handleSelectPost = (post: BlogPost | null) => {
    pixelAudio.playClick();
    if (post) {
      startRouteTransition('正在打开文章');
      router.push(`/posts/${encodeURIComponent(post.id)}`);
      return;
    }
    if (isArticleRoute) {
      startRouteTransition('正在返回首页');
      router.push('/');
    }
  };

  const handleUpdateSeed = (id: string, newSeed: number) => {
    pixelAudio.playClick();
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, coverSeed: newSeed } : p))
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
  };

  const registerArticle = useCallback((post: BlogPost | null) => {
    setArticleMeta(post);
  }, []);

  const openArticleInTerminal = useCallback(
    (post: BlogPost) => {
      setPendingTerminalCmd(`cat ${post.id}`);
      setViewMode('terminal');
      setArticleMeta(null);
      startRouteTransition('正在打开终端');
      router.push('/');
    },
    [router]
  );

  const shellContext = useMemo(
    () => ({
      likedPostIds,
      postStats,
      toggleLike: handleToggleLike,
      recordView,
      registerArticle,
      articleBackOriginRef: backOriginRef,
      openArticleInTerminal,
    }),
    [
      likedPostIds,
      postStats,
      handleToggleLike,
      recordView,
      registerArticle,
      openArticleInTerminal,
    ]
  );

  return (
    <BlogShellProvider value={shellContext}>
      <div
        className={`relative flex flex-col ${
          shellViewMode === 'terminal'
            ? 'h-screen h-dvh overflow-hidden pb-5'
            : 'min-h-screen'
        }`}
      >
      <PixelSplash />

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
        previewHour={weatherPreviewHour}
      />

      {/* Ambient Liquid Glass & Pixel Matrix Background */}
      <AmbientPixelBackground mode={shellViewMode} />

      {/* Top Sticky Liquid Glass Navigation Bar */}
      <Navbar
        viewMode={shellViewMode}
        contentPage={contentPage}
        onContentPageChange={handleContentPageChange}
        themePreference={themePreference}
        onThemeToggle={() => handleThemeToggle()}
        soundEnabled={soundEnabled}
        onSoundToggle={handleSoundToggle}
        musicEnabled={musicEnabled}
        onMusicToggle={handleMusicToggle}
        onResetHome={() => {
          pixelAudio.playClick();
          if (isArticleRoute) {
            startRouteTransition('正在返回首页');
          }
          router.push('/');
        }}
        selectedPost={articleMeta}
        weatherBgEnabled={weatherBgEnabled}
        onWeatherBgToggle={() => handleSetWeatherBg(!weatherBgEnabled)}
        onImmersiveWeather={handleEnterImmersiveWeather}
        backDockAnchorRef={backDockAnchorRef}
        articleDocked={backDocked}
        concealed={galleryPreviewOpen || immersiveWeather}
      />

      {/* Main Content Container */}
      <main
        aria-hidden={immersiveWeather}
        className={`relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          immersiveWeather
            ? 'pointer-events-none -translate-y-6 scale-[0.98] opacity-0'
            : 'translate-y-0 scale-100 opacity-100'
        } ${
          shellViewMode === 'terminal'
            ? 'pt-4 sm:pt-5 min-h-0 flex flex-col'
            : 'pt-4'
        }`}
      >
        {isArticleRoute ? (
          children
        ) : contentPage === 'friends' ? (
          shellViewMode === 'terminal' ? (
            <TerminalFriendsView
              onBackHome={() => handleContentPageChange('home')}
            />
          ) : (
            <FriendsView />
          )
        ) : contentPage === 'about' ? (
          <Suspense
            fallback={
              <div className="liquid-glass flex min-h-48 items-center justify-center rounded-2xl p-10 font-mono text-xs text-violet-600 dark:text-violet-300">
                LOADING ABOUT...
              </div>
            }
          >
            <AboutView
              viewMode={shellViewMode}
              onBackHome={() => handleContentPageChange('home')}
            />
          </Suspense>
        ) : contentPage === 'gallery' ? (
          shellViewMode === 'standard' ? (
            <Suspense
              fallback={
                <div className="liquid-glass rounded-2xl p-10 text-center space-y-2">
                  <div className="font-pixel text-xs text-sky-500 dark:text-cyan-300">
                    LOADING GALLERY // 正在加载生活画廊与地图…
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Mapbox 地图引擎按需加载…
                  </div>
                </div>
              }
            >
              <GalleryView
                theme={theme}
                previewId={galleryPreviewId}
                onPreviewOpen={openGalleryPreview}
                onPreviewNavigate={navigateGalleryPreview}
                onPreviewClose={closeGalleryPreview}
                onBackHome={() => handleContentPageChange('home')}
              />
            </Suspense>
          ) : (
            <Suspense
              fallback={
                <div className="liquid-glass flex flex-1 items-center justify-center rounded-2xl p-10 font-mono text-xs text-emerald-600 dark:text-emerald-300">
                  LOADING TERMINAL GALLERY…
                </div>
              }
            >
              <TerminalGalleryView
                theme={theme}
                previewId={galleryPreviewId}
                onPreviewOpen={openGalleryPreview}
                onPreviewNavigate={navigateGalleryPreview}
                onPreviewClose={closeGalleryPreview}
                onBackHome={() => handleContentPageChange('home')}
              />
            </Suspense>
          )
        ) : postsLoading ? (
          <div className="liquid-glass flex min-h-48 items-center justify-center gap-2 rounded-2xl p-10 font-mono text-xs text-sky-600 dark:text-cyan-300">
            <span className="inline-block h-2 w-2 animate-pulse bg-sky-500" />
            LOADING R2 POSTS...
          </div>
        ) : postsError ? (
          <div className="liquid-glass space-y-3 rounded-2xl p-8 text-center font-mono text-xs text-rose-600 dark:text-rose-300">
            <div>{postsError}</div>
            <button
              type="button"
              onClick={() => void loadPosts()}
              className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-rose-700 dark:text-rose-200"
            >
              重新加载
            </button>
          </div>
        ) : shellViewMode === 'standard' ? (
          <StandardBlogView
            posts={posts}
            author={AUTHOR_PROFILE}
            selectedPost={null}
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
            weatherPreviewHour={weatherPreviewHour}
            onSetWeatherPreviewHour={handleSetWeatherPreviewHour}
            backOriginRef={backOriginRef}
            onSwitchToTerminal={(cmd) => {
              if (cmd) setPendingTerminalCmd(cmd);
              handleViewModeChange('terminal');
            }}
          />
        ) : (
          <TerminalBlogView
            posts={posts}
            theme={theme}
            onToggleTheme={handleThemeToggle}
            onSwitchToStandard={(post) => {
              if (post) {
                startRouteTransition('正在打开文章');
                router.push(`/posts/${encodeURIComponent(post.id)}`);
                return;
              }
              handleViewModeChange('standard');
            }}
            likedPostIds={likedPostIds}
            onToggleLike={handleToggleLike}
            onViewPost={recordView}
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
            onOpenGallery={() => handleContentPageChange('gallery')}
            onOpenFriends={() => handleContentPageChange('friends')}
            onOpenAbout={() => handleContentPageChange('about')}
            initialCommand={pendingTerminalCmd}
            onConsumeInitialCommand={() => setPendingTerminalCmd(null)}
            onCommandSound={() => pixelAudio.playCommandRun()}
          />
        )}
      </main>

      {/* Minimalist Colophon Footer */}
      {shellViewMode !== 'terminal' && (
        <footer
          className={`relative z-20 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 transition-all duration-500 ${
            immersiveWeather
              ? 'pointer-events-none translate-y-4 opacity-0'
              : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="border-t border-slate-300/50 dark:border-white/10 pt-5 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs font-mono text-slate-400 pr-12 sm:pr-0">
            <span>李白的白 · CarlosWhite (LV.7)</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-sky-500 dark:text-cyan-300" />
                访问量 {siteVisits === null ? '--' : siteVisits.toLocaleString('zh-CN')}
              </span>
              <span>MARKDOWN · PIXEL GLASS</span>
            </div>
          </div>
        </footer>
      )}

      {/* Elastic back-to-list button (flies between article bar and navbar) */}
      <FlyingBackButton
        visible={isArticleRoute && !!articleMeta && !immersiveWeather}
        docked={backDocked}
        originRef={backOriginRef}
        dockRef={backDockAnchorRef}
        onClick={() => {
          startRouteTransition('正在返回首页');
          router.push('/');
        }}
      />

      {/* Dev-only gallery admin entry. Removed from production builds. */}
      {APP_ENV.isDev && !galleryPreviewOpen && !immersiveWeather && (
        <a
          href="/admin"
          title="开发环境图库后台"
          aria-label="打开开发环境图库后台"
          className={`fixed z-40 left-3 liquid-pill rounded-full flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 border border-dashed border-amber-500/50 transition-all shadow-lg p-2.5 sm:left-5 sm:px-3 sm:py-2 opacity-75 hover:opacity-100 ${
            shellViewMode === 'terminal'
              ? 'bottom-[5rem] sm:bottom-[5rem] min-[1440px]:bottom-5'
              : 'bottom-3 sm:bottom-5'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-amber-500" />
          ADMIN
        </a>
      )}

      {/* Floating mode switch: content page stays the same */}
      {!isArticleRoute && (
        <button
          data-custom-sound
          onClick={() =>
            handleViewModeChange(
              viewMode === 'standard' ? 'terminal' : 'standard'
            )
          }
          title={
            viewMode === 'standard'
              ? '切换至终端模式'
              : '切换至普通博客风格'
          }
          className={`fixed z-40 liquid-pill rounded-full flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300 transition-all shadow-lg p-2.5 sm:px-3.5 sm:py-2 ${
            galleryPreviewOpen || immersiveWeather
              ? 'opacity-0 translate-y-6 pointer-events-none'
              : 'opacity-75 hover:opacity-100'
          } ${
            viewMode === 'terminal'
              ? 'bottom-[5rem] right-3 sm:bottom-[5rem] sm:right-5 min-[1440px]:bottom-5'
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
      )}

      <div
        className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:bottom-5 sm:right-5 ${
          immersiveWeather
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-5 opacity-0'
        }`}
        aria-hidden={!immersiveWeather}
      >
        <button
          type="button"
          onClick={handleExitImmersiveWeather}
          tabIndex={immersiveWeather ? 0 : -1}
          className="liquid-pill flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/75 px-3.5 py-2 font-mono text-xs text-slate-700 shadow-xl transition-colors hover:border-sky-400/60 hover:text-sky-700 dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-100 dark:hover:text-cyan-200"
          title="退出沉浸式天气 (Esc)"
        >
          <Minimize2 className="h-4 w-4 text-sky-600 dark:text-cyan-300" />
          <span>退出沉浸</span>
          <span className="hidden rounded border border-slate-300/70 px-1.5 py-0.5 text-[9px] text-slate-500 dark:border-white/15 dark:text-slate-400 sm:inline">
            ESC
          </span>
        </button>
      </div>
      </div>
    </BlogShellProvider>
  );
};
export default AppShell;
