'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArticleModal } from './ArticleModal';
import { useBlogShell } from './BlogShellContext';
import { startRouteTransition } from '../lib/route-transition';
import type { BlogPost } from '../types/blog';

interface ArticleRouteContentProps {
  post: BlogPost;
  posts: BlogPost[];
}

export const ArticleRouteContent: React.FC<ArticleRouteContentProps> = ({
  post,
  posts,
}) => {
  const router = useRouter();
  const {
    likedPostIds,
    postStats,
    toggleLike,
    recordView,
    registerArticle,
    articleBackOriginRef,
    openArticleInTerminal,
  } = useBlogShell();
  const [coverSeed, setCoverSeed] = useState(post.coverSeed);

  useEffect(() => {
    registerArticle(post);
    return () => registerArticle(null);
  }, [post, registerArticle]);

  useEffect(() => {
    recordView(post.id);
  }, [post.id, recordView]);

  useEffect(() => {
    setCoverSeed(post.coverSeed);
  }, [post.id, post.coverSeed]);

  const stats = postStats[post.id];
  const currentPost: BlogPost = {
    ...post,
    coverSeed,
    ...(stats ?? {}),
  };

  const goHome = () => {
    startRouteTransition('正在返回首页');
    router.push('/');
  };

  return (
    <ArticleModal
      post={currentPost}
      isLiked={likedPostIds.includes(post.id)}
      onToggleLike={toggleLike}
      onUpdateSeed={(id, nextSeed) => {
        if (id === post.id) setCoverSeed(nextSeed);
      }}
      onClose={goHome}
      onOpenInTerminal={openArticleInTerminal}
      onSelectPost={(next) => {
        startRouteTransition('正在打开文章');
        router.push(`/posts/${encodeURIComponent(next.id)}`);
      }}
      relatedPosts={posts.filter((item) => item.id !== post.id).slice(0, 3)}
      backOriginRef={articleBackOriginRef}
    />
  );
};
