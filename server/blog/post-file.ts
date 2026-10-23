import type { BlogPost } from '../../src/types/blog';

const ACCENTS = ['cyan', 'magenta', 'emerald', 'amber', 'violet'] as const;
const COVER_TYPES = [
  'auto',
  'cyber-city',
  'liquid-shader',
  'retro-console',
  'neural-core',
  'synth-wave',
  'pixel-garden',
] as const;

export function normalizeDateString(raw: string): string {
  const trimmed = raw.trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/.exec(trimmed);
  if (!match) return trimmed;
  const [, year, month, day, rest] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}${rest}`;
}

function normalizeSeed(value: string | undefined, fallback: string): number {
  const raw = (value || fallback).trim();
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber !== 0) {
    return Math.abs(Math.floor(asNumber));
  }
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 1000000;
}

export function extractExcerpt(markdown: string, maxLength = 120): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const plain: string[] = [];
  let inCode = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (
      inCode ||
      !line ||
      line.startsWith('#') ||
      line.startsWith('>') ||
      line.startsWith('|') ||
      line.startsWith('---') ||
      /^!\[[^\]]*\]\([^)]+\)$/.test(line)
    ) {
      continue;
    }

    const cleaned = line
      .replace(/^[-*+]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`~]/g, '');

    if (cleaned) plain.push(cleaned);
    if (plain.join(' ').length >= maxLength) break;
  }

  const joined = plain.join(' ').trim();
  if (!joined) return '标准 Markdown 像素笔记归档';
  return joined.length > maxLength
    ? `${joined.slice(0, maxLength)}...`
    : joined;
}

function splitTags(value: string | undefined): string[] {
  if (!value) return ['随笔'];
  const tags = value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  return tags.length > 0 ? tags : ['随笔'];
}

export function parsePostFile(
  rawContent: string,
  fallbackId: string,
  fallbackSlug: string
): BlogPost {
  const normalized = rawContent.replace(/\r\n/g, '\n').trim();
  const meta: Record<string, string> = {};
  let markdown = normalized;

  if (normalized.startsWith('---')) {
    const end = normalized.indexOf('\n---', 3);
    if (end !== -1) {
      const frontmatter = normalized.slice(3, end).trim();
      markdown = normalized.slice(end + 4).trim();

      for (const line of frontmatter.split('\n')) {
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim();
        const value = line
          .slice(colon + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
        meta[key] = value;
      }
    }
  }

  const title = meta.title || fallbackSlug;
  const excerpt = meta.excerpt || extractExcerpt(markdown);
  const subtitle = meta.subtitle || excerpt;
  const accent = ACCENTS.includes(meta.accent as (typeof ACCENTS)[number])
    ? (meta.accent as (typeof ACCENTS)[number])
    : 'cyan';
  const coverType = COVER_TYPES.includes(
    meta.coverType as (typeof COVER_TYPES)[number]
  )
    ? (meta.coverType as (typeof COVER_TYPES)[number])
    : 'auto';

  return {
    id: meta.id || fallbackId,
    slug: meta.slug || fallbackSlug,
    title,
    subtitle,
    category: meta.category?.trim() || '随笔',
    tags: splitTags(meta.tags),
    date: normalizeDateString(
      meta.date || new Date().toISOString().slice(0, 10)
    ),
    readTime:
      meta.readTime ||
      `${Math.max(1, Math.ceil(markdown.length / 260))} MIN`,
    views: Number(meta.views) || 0,
    likes: Number(meta.likes) || 0,
    featured: meta.featured === 'true',
    isPublic: meta.public !== 'false',
    coverType,
    coverSeed: normalizeSeed(meta.coverSeed, fallbackId),
    accent,
    excerpt,
    markdown,
  };
}

export function serializePostFile(post: BlogPost): string {
  return `---
id: "${post.id}"
slug: "${post.slug}"
title: "${post.title.replace(/"/g, '\\"')}"
subtitle: "${post.subtitle.replace(/"/g, '\\"')}"
category: "${post.category}"
tags: [${post.tags.map((tag) => `"${tag}"`).join(', ')}]
date: "${post.date}"
readTime: "${post.readTime}"
views: ${post.views}
likes: ${post.likes}
featured: ${Boolean(post.featured)}
public: ${post.isPublic !== false}
coverSeed: ${post.coverSeed}
accent: "${post.accent}"
---

${post.markdown.trim()}
`;
}

export function isValidPostId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}
