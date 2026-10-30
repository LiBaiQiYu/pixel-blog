import { APP_ENV } from './app-env';

const OPENDOTA_BASE = 'https://api.opendota.com/api';
// tsconfig targets ES2017, so BigInt is built from strings instead of literals.
const DOTA_STEAM_ID_BASE = BigInt('76561197960265728');
const DOTA_ACCOUNT_ID_MAX = BigInt('4294967295');
const DOTA_ACCOUNT_ID_MIN = BigInt(0);
const HERO_IMAGE_BASE =
  'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes';
const HEROES_CACHE_KEY = 'pixel_blog_dota_heroes_v1';
const HEROES_TTL_MS = 24 * 60 * 60 * 1000;
export const DOTA_RECENT_LIMIT = 20;

const RANK_NAMES: Record<number, string> = {
  1: 'Herald',
  2: 'Guardian',
  3: 'Crusader',
  4: 'Archon',
  5: 'Legend',
  6: 'Ancient',
  7: 'Divine',
  8: 'Immortal',
};

export interface DotaProfile {
  accountId: number;
  name: string;
  avatar: string | null;
  rankTier: number;
  rankLabel: string | null;
  mmr: number | null;
}

export interface DotaMatch {
  matchId: number;
  heroId: number;
  heroName: string;
  heroImage: string | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  duration: number;
  gpm: number;
  xpm: number;
  startTime: number;
  lobbyType: number;
  gameMode: number;
  averageRank: number;
}

export interface DotaOverall {
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  gpm: number;
  xpm: number;
  lastHits: number;
  heroDamage: number;
}

export interface DotaHeroStat {
  heroId: number;
  heroName: string;
  heroImage: string | null;
  games: number;
  wins: number;
}

export interface DotaSummary {
  profile: DotaProfile | null;
  overall: DotaOverall | null;
  recent: {
    wins: number;
    losses: number;
    form: Array<'W' | 'L'>;
    matches: DotaMatch[];
  } | null;
  heroes: DotaHeroStat[];
  updatedAt: number;
}

interface OpenDotaPlayerPayload {
  profile?: {
    account_id?: number;
    personaname?: string;
    avatarfull?: string;
  };
  rank_tier?: number | null;
  computed_mmr?: number | null;
}

interface OpenDotaWinLossPayload {
  win?: number;
  lose?: number;
}

interface OpenDotaTotalRow {
  field?: string;
  n?: number;
  sum?: number;
}

interface OpenDotaRecentMatch {
  match_id?: number;
  hero_id?: number;
  player_slot?: number;
  radiant_win?: boolean;
  duration?: number;
  start_time?: number;
  lobby_type?: number;
  game_mode?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  gold_per_min?: number;
  xp_per_min?: number;
  average_rank?: number;
}

interface OpenDotaHero {
  id?: number;
  name?: string;
  localized_name?: string;
}

type HeroMap = Record<number, { name: string; image: string }>;

export function dotaAccountId(steamId: string): number | null {
  try {
    const value = BigInt(steamId.trim()) - DOTA_STEAM_ID_BASE;
    if (value <= DOTA_ACCOUNT_ID_MIN || value > DOTA_ACCOUNT_ID_MAX) {
      return null;
    }
    return Number(value);
  } catch {
    return null;
  }
}

export function dotaRankLabel(rankTier: number | null | undefined): string | null {
  if (!rankTier) return null;
  const medal = Math.floor(rankTier / 10);
  const star = rankTier % 10;
  const name = RANK_NAMES[medal];
  if (!name) return null;
  return star > 0 ? `${name} ${star}` : name;
}

export function formatMatchDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function formatMatchTime(seconds: number): string {
  if (!seconds) return '';
  const diff = Date.now() - seconds * 1000;
  if (diff < 0) return '';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

export function lobbyLabel(lobbyType: number): string {
  if (lobbyType === 7) return '排位';
  if (lobbyType === 6) return 'Battle Cup';
  return '普通';
}

export function matchModeLabel(lobbyType: number, gameMode: number): string {
  if (gameMode === 23) return 'Turbo';
  if (lobbyType === 7 || gameMode === 22) return '排位';
  if (lobbyType === 6) return 'Battle Cup';
  return '普通';
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`OpenDota ${response.status}`);
  }
  return (await response.json()) as T;
}

function readCachedHeroes(): HeroMap | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HEROES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; heroes?: HeroMap };
    if (!parsed?.at || !parsed.heroes) return null;
    if (Date.now() - parsed.at > HEROES_TTL_MS) return null;
    return parsed.heroes;
  } catch {
    return null;
  }
}

function writeCachedHeroes(heroes: HeroMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      HEROES_CACHE_KEY,
      JSON.stringify({ at: Date.now(), heroes })
    );
  } catch {
    // Storage may be full or blocked; the map is rebuilt next time.
  }
}

async function loadHeroes(signal?: AbortSignal): Promise<HeroMap> {
  const cached = readCachedHeroes();
  if (cached) return cached;

  const payload = await fetchJson<OpenDotaHero[]>(
    `${OPENDOTA_BASE}/heroes`,
    signal
  );
  const map: HeroMap = {};
  for (const hero of payload) {
    if (typeof hero.id !== 'number' || !hero.name) continue;
    const slug = hero.name.replace(/^npc_dota_hero_/, '');
    map[hero.id] = {
      name: hero.localized_name || slug,
      image: `${HERO_IMAGE_BASE}/${slug}.png`,
    };
  }
  writeCachedHeroes(map);
  return map;
}

function buildOverall(
  winLoss: OpenDotaWinLossPayload | null,
  totals: OpenDotaTotalRow[] | null
): DotaOverall | null {
  if (!winLoss && !totals) return null;

  const wins = Math.max(0, Math.trunc(winLoss?.win ?? 0));
  const losses = Math.max(0, Math.trunc(winLoss?.lose ?? 0));
  const matches = wins + losses;
  const average = (field: string) => {
    const row = totals?.find((entry) => entry.field === field);
    if (!row || !row.n) return 0;
    return (row.sum ?? 0) / row.n;
  };

  return {
    matches,
    wins,
    losses,
    winRate: matches > 0 ? (wins / matches) * 100 : 0,
    kills: average('kills'),
    deaths: average('deaths'),
    assists: average('assists'),
    kda: average('kda'),
    gpm: average('gold_per_min'),
    xpm: average('xp_per_min'),
    lastHits: average('last_hits'),
    heroDamage: average('hero_damage'),
  };
}

function buildRecent(
  matches: OpenDotaRecentMatch[] | null,
  heroes: HeroMap
): DotaSummary['recent'] {
  const list = (matches ?? []).slice(0, DOTA_RECENT_LIMIT);
  if (list.length === 0) return null;

  const mapped: DotaMatch[] = list.map((match) => {
    const heroId = match.hero_id ?? 0;
    const hero = heroes[heroId];
    const isRadiant = (match.player_slot ?? 0) < 128;

    return {
      matchId: match.match_id ?? 0,
      heroId,
      heroName: hero?.name ?? `Hero ${heroId}`,
      heroImage: hero?.image ?? null,
      win: Boolean(match.radiant_win) === isRadiant,
      kills: match.kills ?? 0,
      deaths: match.deaths ?? 0,
      assists: match.assists ?? 0,
      duration: Math.max(0, match.duration ?? 0),
      gpm: match.gold_per_min ?? 0,
      xpm: match.xp_per_min ?? 0,
      startTime: match.start_time ?? 0,
      lobbyType: match.lobby_type ?? 0,
      gameMode: match.game_mode ?? 0,
      averageRank: match.average_rank ?? 0,
    };
  });

  const wins = mapped.filter((match) => match.win).length;

  return {
    wins,
    losses: mapped.length - wins,
    form: [...mapped].reverse().map((match) => (match.win ? 'W' : 'L')),
    matches: mapped,
  };
}

function buildHeroStats(matches: DotaMatch[]): DotaHeroStat[] {
  const map = new Map<number, DotaHeroStat>();

  for (const match of matches) {
    const entry = map.get(match.heroId) ?? {
      heroId: match.heroId,
      heroName: match.heroName,
      heroImage: match.heroImage,
      games: 0,
      wins: 0,
    };
    entry.games += 1;
    if (match.win) entry.wins += 1;
    map.set(match.heroId, entry);
  }

  return [...map.values()]
    .sort((a, b) => b.games - a.games || b.wins - a.wins)
    .slice(0, 6);
}

export async function fetchDotaSummary(
  signal?: AbortSignal
): Promise<DotaSummary | null> {
  const accountId = dotaAccountId(APP_ENV.steamId);
  if (!accountId) return null;

  // OpenDota blocks Cloudflare Worker egress IPs (429), so this runs in the
  // visitor's browser instead, where the per-IP quota is theirs.
  const settled = await Promise.allSettled([
    fetchJson<OpenDotaPlayerPayload>(
      `${OPENDOTA_BASE}/players/${accountId}`,
      signal
    ),
    fetchJson<OpenDotaWinLossPayload>(
      `${OPENDOTA_BASE}/players/${accountId}/wl`,
      signal
    ),
    fetchJson<OpenDotaTotalRow[]>(
      `${OPENDOTA_BASE}/players/${accountId}/totals`,
      signal
    ),
    fetchJson<OpenDotaRecentMatch[]>(
      `${OPENDOTA_BASE}/players/${accountId}/recentMatches`,
      signal
    ),
    loadHeroes(signal),
  ]);

  const take = <T,>(index: number): T | null => {
    const entry = settled[index];
    return entry.status === 'fulfilled' ? (entry.value as T) : null;
  };

  const player = take<OpenDotaPlayerPayload>(0);
  const heroes = take<HeroMap>(4) ?? {};
  const recent = buildRecent(take<OpenDotaRecentMatch[]>(3), heroes);
  const overall = buildOverall(
    take<OpenDotaWinLossPayload>(1),
    take<OpenDotaTotalRow[]>(2)
  );

  if (!player && !overall && !recent) return null;

  return {
    profile: player
      ? {
          accountId,
          name: player.profile?.personaname || 'Dota player',
          avatar: player.profile?.avatarfull || null,
          rankTier: player.rank_tier ?? 0,
          rankLabel: dotaRankLabel(player.rank_tier),
          mmr:
            typeof player.computed_mmr === 'number'
              ? Math.round(player.computed_mmr)
              : null,
        }
      : null,
    overall,
    recent,
    heroes: recent ? buildHeroStats(recent.matches) : [],
    updatedAt: Date.now(),
  };
}
