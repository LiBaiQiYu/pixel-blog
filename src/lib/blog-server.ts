import 'server-only';
import { cache } from 'react';
import type { BlogPost } from '../types/blog';
import { APP_ENV } from './app-env';
import { listBlogPosts } from '../../server/blog/store';

function normalize(post: BlogPost): BlogPost {
  return {
    ...post,
    isPublic: post.isPublic !== false,
    views: Number(post.views) || 0,
    likes: Number(post.likes) || 0,
    markdown: typeof post.markdown === 'string' ? post.markdown : '',
    assetBaseUrl: `${APP_ENV.blogImageBaseUrl}/blog/${encodeURIComponent(post.id)}/`,
  };
}

async function readPublicManifest(): Promise<BlogPost[]> {
  const response = await fetch(APP_ENV.blogIndexUrl, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Blog index request failed: ${response.status}`);
  }
  const data = (await response.json()) as
    | BlogPost[]
    | { posts?: BlogPost[] };
  const posts = Array.isArray(data) ? data : data.posts;
  if (!Array.isArray(posts)) throw new Error('Invalid blog index');
  return posts;
}

export const getPublicPosts = cache(async (): Promise<BlogPost[]> => {
  let posts: BlogPost[];
  try {
    posts = await listBlogPosts();
  } catch {
    posts = await readPublicManifest();
  }

  return posts
    .filter((post) => post && typeof post.id === 'string')
    .map(normalize)
    .filter((post) => post.isPublic !== false);
});

export const getPublicPost = cache(async (id: string) => {
  const posts = await getPublicPosts();
  const post = posts.find((entry) => entry.id === id);
  return post ? { post, posts } : null;
});
