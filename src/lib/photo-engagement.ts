import { APP_ENV } from './app-env';
import { getStatsClientId } from './post-stats';

const STATS_API_URL = APP_ENV.statsApiUrl;

export interface PhotoViewStats {
  counted: boolean;
  views: number;
  comments: number;
}

export interface PhotoComment {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface PhotoCommentsResult {
  comments: PhotoComment[];
  total: number;
}

interface PhotoViewResponse extends PhotoViewStats {
  ok: boolean;
}

interface PhotoCommentsResponse extends PhotoCommentsResult {
  ok: boolean;
}

interface PhotoCommentCreateResponse {
  ok: boolean;
  comment: PhotoComment;
  total: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${STATS_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Stats API ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function recordPhotoView(
  photoId: string,
  signal?: AbortSignal
): Promise<PhotoViewStats> {
  const data = await request<PhotoViewResponse>('/photo-view', {
    method: 'POST',
    body: JSON.stringify({
      photoId,
      clientId: getStatsClientId(),
    }),
    signal,
  });
  return {
    counted: Boolean(data.counted),
    views: Number(data.views ?? 0),
    comments: Number(data.comments ?? 0),
  };
}

export async function fetchPhotoComments(
  photoId: string,
  signal?: AbortSignal
): Promise<PhotoCommentsResult> {
  const data = await request<PhotoCommentsResponse>(
    `/photo-comments?photoId=${encodeURIComponent(photoId)}`,
    { signal }
  );
  return {
    comments: data.comments ?? [],
    total: Number(data.total ?? 0),
  };
}

export async function createPhotoComment(
  photoId: string,
  nickname: string,
  content: string,
  signal?: AbortSignal
): Promise<{ comment: PhotoComment; total: number }> {
  const data = await request<PhotoCommentCreateResponse>('/photo-comments', {
    method: 'POST',
    body: JSON.stringify({
      photoId,
      nickname,
      content,
      clientId: getStatsClientId(),
    }),
    signal,
  });
  return {
    comment: data.comment,
    total: Number(data.total ?? 0),
  };
}
