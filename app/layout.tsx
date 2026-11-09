import type { Metadata, Viewport } from 'next';
import '../src/index.css';
import { GlobalClickSound } from '../src/components/GlobalClickSound';
import { RouteTransition } from '../src/components/RouteTransition';

const SITE_DESCRIPTION =
  '数日的疾风把秋末的枯叶袭落，相比于夕阳映衬下的满眼金黄，树木显得病态般瘦削。北边天际的尽头充斥着灰褐色的浓云，日薄西山，黑暗混入云层搅动着渐而昏沉的天色。';

export const metadata: Metadata = {
  metadataBase: new URL('https://cwa1e.top'),
  title: {
    default: 'Pixel Blog',
    template: '%s · Pixel Blog',
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'Pixel Blog',
    title: 'Pixel Blog',
    description: SITE_DESCRIPTION,
    url: 'https://cwa1e.top',
  },
  twitter: {
    card: 'summary',
    title: 'Pixel Blog',
    description: SITE_DESCRIPTION,
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

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Pixel Blog',
  alternateName: '李白的白',
  url: 'https://cwa1e.top',
  description: SITE_DESCRIPTION,
  inLanguage: 'zh-CN',
  author: {
    '@type': 'Person',
    name: 'CarlosWhite',
    url: 'https://cwa1e.top/about',
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
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
