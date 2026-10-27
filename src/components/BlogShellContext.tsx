'use client';

import React, { createContext, useContext } from 'react';
import type { BlogPost } from '../types/blog';
import type { PostStats } from '../lib/post-stats';

interface BlogShellContextValue {
  likedPostIds: string[];
  postStats: Record<string, PostStats>;
  toggleLike: (id: string) => void;
  recordView: (id: string) => void;
  registerArticle: (post: BlogPost | null) => void;
  articleBackOriginRef: React.RefObject<HTMLButtonElement | null>;
  openArticleInTerminal: (post: BlogPost) => void;
}

const BlogShellContext = createContext<BlogShellContextValue | null>(null);

export const BlogShellProvider = BlogShellContext.Provider;

export const useBlogShell = (): BlogShellContextValue => {
  const context = useContext(BlogShellContext);
  if (!context) {
    throw new Error('useBlogShell must be used inside AppShell');
  }
  return context;
};
