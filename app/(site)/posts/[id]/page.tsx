import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleRouteContent } from '../../../../src/components/ArticleRouteContent';
import { getPublicPost } from '../../../../src/lib/blog-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicPost(id);
  if (!data) return {};

  const { post } = data;
  return {
    title: post.title,
    description: post.excerpt || post.subtitle,
    alternates: { canonical: `/posts/${post.id}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt || post.subtitle,
      url: `/posts/${post.id}`,
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary',
      title: post.title,
      description: post.excerpt || post.subtitle,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const data = await getPublicPost(id);
  if (!data) notFound();

  const { post, posts } = data;
  const articleUrl = `https://cwa1e.top/posts/${post.id}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.subtitle,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: articleUrl,
    author: {
      '@type': 'Person',
      name: 'CarlosWhite',
    },
    publisher: {
      '@type': 'Person',
      name: 'CarlosWhite',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleRouteContent post={post} posts={posts} />
    </>
  );
}
