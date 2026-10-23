import { AuthorProfile, BlogPost } from '../types/blog';
import { CoverArtType, generateRandomSeed, normalizeSeed } from '../components/PixelArtwork';
import { extractMarkdownExcerpt } from '../components/MarkdownRenderer';

export const AUTHOR_PROFILE: AuthorProfile = {
  name: 'CarlosWhite',
  handle: 'carlos@libai.dev',
  role: '前端工程师',
  level: 7,
  hp: '777 / 777',
  mp: '512 / 512',
  location: '李白的白',
  bio: '「李白的白」博客主理人 · 前端工程师 (LV.7)。在代码与生活之间游走，记录深夜随想、旅途碎片与那些说不出口的心事。',
  skills: [
    { name: 'React / TypeScript', level: 96, color: 'bg-sky-400' },
    { name: 'CSS / Pixel UI', level: 94, color: 'bg-pink-400' },
    { name: 'Frontend Tooling', level: 92, color: 'bg-amber-400' },
    { name: 'Node.js / CLI', level: 90, color: 'bg-emerald-400' },
  ],
  socials: [
    { label: 'GITHUB', cmd: 'open github', url: 'https://github.com' },
    { label: 'X / TWITTER', cmd: 'open twitter', url: 'https://x.com' },
    { label: 'RSS FEED', cmd: 'cat rss.xml', url: '#rss' },
  ],
};

// Normalize date string like "2021-8-15 02:12" -> "2021-08-15 02:12" so YYYY-MM sorting & grouping always work
export function normalizeDateString(raw: string): string {
  const trimmed = raw.trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/.exec(trimmed);
  if (!match) return trimmed;
  const [, y, m, d, rest] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}${rest}`;
}

// Parse a raw .md file (with optional YAML frontmatter) into a BlogPost object
export function parseMarkdownFileToPost(
  rawFileContent: string,
  filePath: string,
  index: number
): BlogPost {
  const normalized = rawFileContent.replace(/\r\n/g, '\n').trim();
  const fileName =
    filePath
      .split('/')
      .pop()
      ?.replace(/\.md$/i, '') || `0${index + 1}-post`;

  const idMatch = /^(\d+)[-_](.+)$/.exec(fileName);
  const defaultId = idMatch
    ? idMatch[1].padStart(2, '0')
    : String(index + 1).padStart(2, '0');
  const defaultSlug = idMatch ? idMatch[2] : fileName;

  const meta: Record<string, string> = {};
  let markdownBody = normalized;

  if (normalized.startsWith('---')) {
    const endIdx = normalized.indexOf('\n---', 3);
    if (endIdx !== -1) {
      const frontmatterBlock = normalized.slice(3, endIdx).trim();
      markdownBody = normalized.slice(endIdx + 4).trim();

      for (const line of frontmatterBlock.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim();
          const val = line
            .slice(colonIdx + 1)
            .trim()
            .replace(/^["']|["']$/g, '');
          meta[key] = val;
        }
      }
    }
  }

  let tags: string[] = ['随笔'];
  if (meta.tags) {
    const cleanedTags = meta.tags.replace(/^\[|\]$/g, '');
    const parsed = cleanedTags
      .split(',')
      .map((t) => t.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    if (parsed.length > 0) tags = parsed;
  }

  const category = meta.category?.trim() || '随笔';

  const validAccents = ['cyan', 'magenta', 'emerald', 'amber', 'violet'] as const;
  const accent = validAccents.includes(meta.accent as typeof validAccents[number])
    ? (meta.accent as typeof validAccents[number])
    : 'cyan';

  const title = meta.title || defaultSlug;
  const excerpt = meta.excerpt || extractMarkdownExcerpt(markdownBody);
  const subtitle = meta.subtitle || excerpt;
  const date = normalizeDateString(
    meta.date || new Date().toISOString().slice(0, 10)
  );
  const readTime =
    meta.readTime || `${Math.max(1, Math.ceil(markdownBody.length / 260))} MIN`;
  const views = Number(meta.views) || 0;
  const likes = Number(meta.likes) || 0;
  const featured = meta.featured === 'true';
  const isPublic = meta.public !== 'false';
  const coverType = (meta.coverType as CoverArtType) || 'auto';
  const coverSeed = meta.coverSeed
    ? normalizeSeed(meta.coverSeed)
    : generateRandomSeed();

  return {
    id: meta.id || defaultId,
    slug: meta.slug || defaultSlug,
    title,
    subtitle,
    category,
    tags,
    date,
    readTime,
    views,
    likes,
    featured,
    isPublic,
    coverType,
    coverSeed,
    accent,
    excerpt,
    markdown: markdownBody,
  };
}

// Serialize a BlogPost into a standard .md file with YAML Frontmatter ready for src/posts/
export function serializePostToMarkdownFile(post: BlogPost): string {
  return `---
id: "${post.id}"
slug: "${post.slug}"
title: "${post.title.replace(/"/g, '\\"')}"
subtitle: "${post.subtitle.replace(/"/g, '\\"')}"
category: "${post.category}"
tags: [${post.tags.map((t) => `"${t}"`).join(', ')}]
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

// Helper to trigger browser download of a .md file
export function downloadMarkdownPostFile(post: BlogPost) {
  const content = serializePostToMarkdownFile(post);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeSlug = post.slug
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  a.href = url;
  a.download = `${post.id}-${safeSlug || 'post'}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ensurePostMarkdown(post: BlogPost): BlogPost {
  if (post.markdown && post.markdown.trim().length > 0) {
    return post;
  }
  return {
    ...post,
    markdown: post.excerpt || '',
  };
}
