import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GALLERY_PHOTOS } from '../../../../src/data/gallery';

interface GalleryPreviewPageProps {
  params: Promise<{ id: string }>;
}

function findPhoto(id: string) {
  return GALLERY_PHOTOS.find((photo) => photo.id === id) ?? null;
}

export async function generateMetadata({
  params,
}: GalleryPreviewPageProps): Promise<Metadata> {
  const { id } = await params;
  const photo = findPhoto(id);
  if (!photo) return {};

  return {
    title: photo.title,
    description: photo.description || `${photo.category} · ${photo.place ?? ''}`,
    alternates: { canonical: `/gallery/${encodeURIComponent(photo.id)}` },
    openGraph: {
      type: 'article',
      title: photo.title,
      description: photo.description || photo.category,
      url: `/gallery/${encodeURIComponent(photo.id)}`,
      images: [{ url: photo.medium || photo.src, alt: photo.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: photo.title,
      description: photo.description || photo.category,
      images: [photo.medium || photo.src],
    },
  };
}

export default async function GalleryPreviewPage({
  params,
}: GalleryPreviewPageProps) {
  const { id } = await params;
  if (!findPhoto(id)) notFound();
  return null;
}
