import type { BlogPost } from '../types/blog';
import { APP_ENV } from './app-env';

const BLOG_PUBLIC_BASE = APP_ENV.blogImageBaseUrl;

export const BLOG_ASSET_BASE_URL = `${BLOG_PUBLIC_BASE}/blog`;
export const BLOG_INDEX_URL = APP_ENV.blogIndexUrl;

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  const response = await fetch(`${BLOG_INDEX_URL}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`博客索引加载失败 (${response.status})`);
  }

  const data = (await response.json()) as
    | BlogPost[]
    | { posts?: BlogPost[] };
  const posts = Array.isArray(data) ? data : data.posts;

  if (!Array.isArray(posts)) {
    throw new Error('博客索引格式不正确');
  }

  return posts
    .filter(
      (post) =>
        post &&
        typeof post.id === 'string' &&
        post.isPublic !== false
    )
    .map((post) => ({
      ...post,
      isPublic: post.isPublic !== false,
      views: Number(post.views) || 0,
      likes: Number(post.likes) || 0,
      markdown: typeof post.markdown === 'string' ? post.markdown : '',
      assetBaseUrl: `${BLOG_ASSET_BASE_URL}/${encodeURIComponent(post.id)}/`,
    }));
}
