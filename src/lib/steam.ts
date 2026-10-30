import { APP_ENV } from './app-env';

export interface SteamGame {
  appid: number;
  name: string;
  minutes: number;
  twoWeekMinutes: number;
  lastPlayed: number;
  icon: string | null;
}

export interface SteamPlatforms {
  windows: number;
  mac: number;
  linux: number;
  deck: number;
}

export interface SteamProfileSummary {
  steamId: string;
  name: string;
  realName: string | null;
  avatar: string;
  profileUrl: string;
  state: number;
  visibility: number;
  countryCode: string | null;
  createdAt: number;
  lastLogOff: number;
  currentGame: { appid: number; name: string } | null;
}

export interface SteamLibrary {
  totalGames: number;
  playedGames: number;
  totalMinutes: number;
  twoWeekMinutes: number;
  platforms: SteamPlatforms;
  topGames: SteamGame[];
  recentGames: SteamGame[];
}

export interface SteamLevel {
  level: number;
  xp: number;
  xpToNextLevel: number;
  xpCurrentLevel: number;
  badgeCount: number;
}

export interface SteamCommunity {
  friends: number | null;
  groups: number | null;
  vacBanned: boolean;
  communityBanned: boolean;
  gameBans: number;
  daysSinceLastBan: number;
  economyBan: string | null;
}

export interface SteamSummary {
  profile: SteamProfileSummary | null;
  level: SteamLevel | null;
  library: SteamLibrary | null;
  community: SteamCommunity | null;
  updatedAt: number;
}

interface SteamResponse {
  ok: boolean;
  steam?: SteamSummary;
  error?: string;
}

const STEAM_STATE_LABELS: Record<number, string> = {
  0: '离线',
  1: '在线',
  2: '忙碌',
  3: '离开',
  4: '打盹',
  5: '想交易',
  6: '想玩游戏',
};

const COUNTRY_LABELS: Record<string, string> = {
  CN: '中国',
  HK: '中国香港',
  TW: '中国台湾',
  MO: '中国澳门',
  JP: '日本',
  KR: '韩国',
  SG: '新加坡',
  MY: '马来西亚',
  TH: '泰国',
  US: '美国',
  CA: '加拿大',
  GB: '英国',
  DE: '德国',
  FR: '法国',
  AU: '澳大利亚',
  NZ: '新西兰',
  RU: '俄罗斯',
  BR: '巴西',
};

export function steamStateLabel(state: number): string {
  return STEAM_STATE_LABELS[state] ?? '未知状态';
}

export function countryLabel(code: string | null): string | null {
  if (!code) return null;
  return COUNTRY_LABELS[code.toUpperCase()] ?? code.toUpperCase();
}

export function formatPlaytime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0h';
  const hours = minutes / 60;
  if (hours < 1) return `${Math.max(1, Math.round(minutes))}m`;
  if (hours < 10) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours).toLocaleString('en-US')}h`;
}

export function formatHours(minutes: number): string {
  const hours = Math.max(0, minutes) / 60;
  return hours.toFixed(1);
}

export function formatJoinedAt(seconds: number): string | null {
  if (!seconds) return null;
  const date = new Date(seconds * 1000);
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

export function formatDate(seconds: number): string | null {
  if (!seconds) return null;
  const date = new Date(seconds * 1000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatRelative(seconds: number): string | null {
  if (!seconds) return null;
  const diff = Date.now() - seconds * 1000;
  if (diff < 0) return null;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

export function levelProgress(level: SteamLevel): {
  ratio: number;
  current: number;
  target: number;
} {
  const start = Math.max(0, level.xpCurrentLevel);
  const end = start + Math.max(0, level.xpToNextLevel);
  const current = Math.max(0, level.xp - start);
  const target = Math.max(0, end - start);
  return {
    ratio: target > 0 ? Math.min(1, Math.max(0, current / target)) : 0,
    current,
    target,
  };
}

export async function fetchSteamSummary(
  signal?: AbortSignal
): Promise<SteamSummary | null> {
  try {
    const response = await fetch(`${APP_ENV.statsApiUrl}/steam/profile`, {
      signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as SteamResponse;
    if (!data?.ok || !data.steam) return null;
    if (!data.steam.profile && !data.steam.library) return null;

    return data.steam;
  } catch {
    return null;
  }
}
