import { APP_ENV } from './app-env';
import { getStatsClientId } from './post-stats';

const STATS_API_URL = APP_ENV.statsApiUrl;

export const PHOTO_REACTIONS = [
  {
    key: 'stunning',
    emoji: '🤩',
    label: '惊艳',
    description: '惊艳出彩，一眼喜欢',
    group: 'positive',
  },
  {
    key: 'cozy',
    emoji: '😊',
    label: '舒服',
    description: '柔和舒服，氛围感很好',
    group: 'positive',
  },
  {
    key: 'solid',
    emoji: '👍',
    label: '稳',
    description: '稳妥到位，拍得很不错',
    group: 'positive',
  },
  {
    key: 'shock',
    emoji: '😯',
    label: '冲击',
    description: '出乎意料，冲击力强（可好可坏）',
    group: 'neutral',
  },
  {
    key: 'intriguing',
    emoji: '🤔',
    label: '耐品',
    description: '值得细品，有点耐人琢磨',
    group: 'neutral',
  },
  {
    key: 'plain',
    emoji: '✨',
    label: '平淡',
    description: '平平淡淡，无功无过',
    group: 'neutral',
  },
  {
    key: 'moving',
    emoji: '😢',
    label: '动容',
    description: '动容落泪，画面令人难过（强悲伤、破防）',
    group: 'negative',
  },
  {
    key: 'blank',
    emoji: '😐',
    label: '无感',
    description: '平淡无感，没有打动我（无感、没共鸣）',
    group: 'negative',
  },
  {
    key: 'wistful',
    emoji: '😔',
    label: '怅然',
    description: '怅然唏嘘，带着遗憾落寞（淡淡的伤感、意难平）',
    group: 'negative',
  },
] as const;

export type PhotoReactionKey = (typeof PHOTO_REACTIONS)[number]['key'];

export type PhotoReactionCounts = Record<PhotoReactionKey, number>;

export interface PhotoReactionState {
  counts: PhotoReactionCounts;
  mine: PhotoReactionKey | null;
}

interface PhotoReactionResponse extends PhotoReactionState {
  ok: boolean;
}

export function emptyPhotoReactionCounts(): PhotoReactionCounts {
  return {
    stunning: 0,
    cozy: 0,
    solid: 0,
    shock: 0,
    intriguing: 0,
    plain: 0,
    moving: 0,
    blank: 0,
    wistful: 0,
  };
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

export async function fetchPhotoReactions(
  photoId: string,
  signal?: AbortSignal
): Promise<PhotoReactionState> {
  const clientId = getStatsClientId();
  const data = await request<PhotoReactionResponse>(
    `/photo-reactions?photoId=${encodeURIComponent(photoId)}&clientId=${encodeURIComponent(clientId)}`,
    { signal }
  );
  return {
    counts: { ...emptyPhotoReactionCounts(), ...data.counts },
    mine: data.mine ?? null,
  };
}

export async function setPhotoReaction(
  photoId: string,
  reaction: PhotoReactionKey | null,
  signal?: AbortSignal
): Promise<PhotoReactionState> {
  const data = await request<PhotoReactionResponse>('/photo-react', {
    method: 'POST',
    body: JSON.stringify({
      photoId,
      clientId: getStatsClientId(),
      reaction,
    }),
    signal,
  });
  return {
    counts: { ...emptyPhotoReactionCounts(), ...data.counts },
    mine: data.mine ?? null,
  };
}
