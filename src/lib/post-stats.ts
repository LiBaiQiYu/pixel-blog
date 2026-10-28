import { APP_ENV } from './app-env';

const STATS_API_URL = APP_ENV.statsApiUrl;

const CLIENT_ID_KEY = 'pixel_blog_stats_client_id';

export interface PostStats {
  views: number;
  likes: number;
}

interface StatsResponse {
  ok: boolean;
  stats: Record<string, PostStats>;
}

interface LikesResponse {
  ok: boolean;
  likedPostIds: string[];
}

interface ViewResponse {
  ok: boolean;
  counted: boolean;
  stats: PostStats;
}

interface LikeResponse {
  ok: boolean;
  liked: boolean;
  stats: PostStats;
}

interface SiteVisitResponse {
  ok: boolean;
  counted: boolean;
  visits: number;
}

function createClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getStatsClientId(): string {
  try {
    const saved = localStorage.getItem(CLIENT_ID_KEY);
    if (saved) return saved;
    const created = createClientId();
    localStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    return createClientId();
  }
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

export async function fetchPostStats(): Promise<Record<string, PostStats>> {
  const data = await request<StatsResponse>('/stats');
  return data.stats ?? {};
}

export async function fetchLikedPostIds(): Promise<string[]> {
  const clientId = getStatsClientId();
  const data = await request<LikesResponse>(
    `/likes?clientId=${encodeURIComponent(clientId)}`
  );
  return data.likedPostIds ?? [];
}

export async function recordPostView(postId: string): Promise<PostStats> {
  const data = await request<ViewResponse>('/view', {
    method: 'POST',
    body: JSON.stringify({
      postId,
      clientId: getStatsClientId(),
    }),
    keepalive: true,
  });
  return data.stats;
}

export async function recordSiteVisit(): Promise<number> {
  const data = await request<SiteVisitResponse>('/visit', {
    method: 'POST',
    body: JSON.stringify({ clientId: getStatsClientId() }),
    keepalive: true,
  });
  return data.visits;
}

export async function setPostLike(
  postId: string,
  liked: boolean
): Promise<PostStats> {
  const data = await request<LikeResponse>('/like', {
    method: 'POST',
    body: JSON.stringify({
      postId,
      liked,
      clientId: getStatsClientId(),
    }),
  });
  return data.stats;
}
