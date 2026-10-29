import { APP_ENV } from './app-env';

const FRIENDS_API_URL = APP_ENV.statsApiUrl;

export interface FriendLink {
  id: number;
  name: string;
  url: string;
  seed: number;
  description: string;
  tags: string[];
  createdAt: string;
}

export interface FriendApplicationInput {
  name: string;
  url: string;
  seed: number;
  description: string;
  tags: string[];
}

interface FriendListResponse {
  ok: boolean;
  friends: FriendLink[];
}

interface FriendApplicationResponse {
  ok: boolean;
  application: FriendLink & { status: string };
}

export class FriendApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function friendlyError(code: string, status: number) {
  if (code === 'duplicate_url') return '这个网址已经提交过或在友链中';
  if (code === 'invalid_payload') return '请检查友链名称、网址和种子';
  if (status >= 500) return '友链服务暂时不可用，请稍后重试';
  return '友链请求失败，请稍后重试';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${FRIENDS_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new FriendApiError(
      friendlyError(String(data?.error ?? ''), response.status),
      response.status
    );
  }
  return data as T;
}

export async function fetchFriends(signal?: AbortSignal) {
  const data = await request<FriendListResponse>('/friends', { signal });
  return data.friends ?? [];
}

export async function submitFriendApplication(
  input: FriendApplicationInput,
  signal?: AbortSignal
) {
  return request<FriendApplicationResponse>('/friends/apply', {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  });
}

export function generateFriendSeed() {
  return Math.floor(100000 + Math.random() * 900000);
}
