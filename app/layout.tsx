import type { Metadata, Viewport } from 'next';
import '../src/index.css';
import { GlobalClickSound } from '../src/components/GlobalClickSound';
import { RouteTransition } from '../src/components/RouteTransition';

export const metadata: Metadata = {
  metadataBase: new URL('https://cwa1e.top'),
  title: {
    default: '李白的白 // CarlosWhite · 像素液态玻璃博客',
    template: '%s // 李白的白',
  },
  description:
    'CarlosWhite 的个人博客，记录代码、旅途与日常观察。',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '李白的白',
    title: '李白的白 // CarlosWhite',
    description:
      'CarlosWhite 的个人博客，记录代码、旅途与日常观察。',
    url: 'https://cwa1e.top',
  },
  twitter: {
    card: 'summary',
    title: '李白的白 // CarlosWhite',
    description:
      'CarlosWhite 的个人博客，记录代码、旅途与日常观察。',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#060913',
  interactiveWidget: 'resizes-content',
};

const themeInitScript = `(function(){try{var saved=localStorage.getItem('pixel_blog_theme_preference');var preference=saved==='light'||saved==='dark'||saved==='auto'?saved:'auto';var systemDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=preference==='dark'||(preference==='auto'&&systemDark);var root=document.documentElement;root.classList.toggle('dark',dark);root.style.colorScheme=dark?'dark':'light';root.dataset.themePreference=preference;}catch(e){}})();`;

const splashInitScript = `(function(){try{var path=window.location.pathname;var home=path==='/'||path==='/index.html';var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;var seen=sessionStorage.getItem('pixel_blog_splash_seen');if(home&&!seen&&!reduce){document.documentElement.classList.add('pixel-splash-pending');sessionStorage.setItem('pixel_blog_splash_seen','1');window.setTimeout(function(){document.documentElement.classList.remove('pixel-splash-pending');},12000);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: splashInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <GlobalClickSound />
        <RouteTransition />
        {children}
      </body>
    </html>
  );
}
