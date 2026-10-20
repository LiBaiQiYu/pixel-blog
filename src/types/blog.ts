import { CoverArtType } from '../components/PixelArtwork';

export type ViewMode = 'standard' | 'gallery' | 'terminal';
export type ThemeMode = 'dark' | 'light';

export type PostCategory = string;

export interface PostSection {
  heading: string;
  paragraphs: string[];
  codeBlock?: {
    language: string;
    filename: string;
    code: string;
  };
  pixelTip?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  tags: string[];
  date: string;
  readTime: string;
  views: number;
  likes: number;
  featured?: boolean;
  coverType: CoverArtType;
  coverSeed: number;
  accent: 'cyan' | 'magenta' | 'emerald' | 'amber' | 'violet';
  excerpt: string;
  markdown: string;
  sections?: PostSection[];
}

export interface AuthorProfile {
  name: string;
  handle: string;
  role: string;
  level: number;
  hp: string;
  mp: string;
  location: string;
  bio: string;
  skills: { name: string; level: number; color: string }[];
  socials: { label: string; cmd: string; url: string }[];
}
