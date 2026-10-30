interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number; last_row_id?: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface Env {
  DB: D1Database;
  FRIENDS_ADMIN_TOKEN?: string;
  STEAM_API_KEY?: string;
  STEAM_ID?: string;
}

type FriendStatus = 'pending' | 'approved' | 'rejected';

interface FriendLinkRow {
  id: number;
  name: string;
  url: string;
  seed: number;
  description: string;
  tags: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
}

interface StatsRow {
  post_id: string;
  views: number;
  likes: number;
}

interface ViewRow {
  viewed_at: number;
}

interface PhotoCommentRow {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
}

const VIEW_WINDOW_MS = 6 * 60 * 60 * 1000;
const PHOTO_VIEW_WINDOW_MS = 6 * 60 * 60 * 1000;
const SITE_VISIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const PHOTO_COMMENT_LIMIT = 100;
const POST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

const PHOTO_REACTIONS = [
  'stunning',
  'cozy',
  'solid',
  'shock',
  'intriguing',
  'plain',
  'moving',
  'blank',
  'wistful',
] as const;
type PhotoReaction = (typeof PHOTO_REACTIONS)[number];

function isPhotoReaction(value: unknown): value is PhotoReaction {
  return (
    typeof value === 'string' &&
    (PHOTO_REACTIONS as readonly string[]).includes(value)
  );
}

function emptyReactionCounts(): Record<PhotoReaction, number> {
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

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,x-admin-token',
  'Access-Control-Max-Age': '86400',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function isValidPostId(value: unknown): value is string {
  return typeof value === 'string' && POST_ID_PATTERN.test(value);
}

function isValidClientId(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_ID_PATTERN.test(value);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const data = await request.json();
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function getPostStats(db: D1Database, postId: string) {
  const row = await db
    .prepare('SELECT views, likes FROM post_stats WHERE post_id = ?')
    .bind(postId)
    .first<{ views: number; likes: number }>();

  return {
    views: Number(row?.views ?? 0),
    likes: Number(row?.likes ?? 0),
  };
}

async function getAllStats(db: D1Database) {
  const rows = await db
    .prepare('SELECT post_id, views, likes FROM post_stats')
    .all<StatsRow>();

  const stats: Record<string, { views: number; likes: number }> = {};
  for (const row of rows.results ?? []) {
    stats[row.post_id] = {
      views: Number(row.views ?? 0),
      likes: Number(row.likes ?? 0),
    };
  }
  return stats;
}

async function getSiteVisits(db: D1Database) {
  const row = await db
    .prepare("SELECT value FROM site_stats WHERE stat_key = 'visits'")
    .first<{ value: number }>();
  return Number(row?.value ?? 0);
}

async function recordSiteVisit(db: D1Database, clientId: string) {
  const now = Date.now();
  const existing = await db
    .prepare('SELECT visited_at FROM site_visits WHERE client_id = ?')
    .bind(clientId)
    .first<{ visited_at: number }>();

  const shouldCount =
    !existing || now - Number(existing.visited_at) > SITE_VISIT_WINDOW_MS;

  if (shouldCount) {
    await db.batch([
      db
        .prepare(
          `INSERT INTO site_visits (client_id, visited_at)
           VALUES (?, ?)
           ON CONFLICT(client_id) DO UPDATE SET visited_at = excluded.visited_at`
        )
        .bind(clientId, now),
      db
        .prepare(
          `INSERT INTO site_stats (stat_key, value, updated_at)
           VALUES ('visits', 1, CURRENT_TIMESTAMP)
           ON CONFLICT(stat_key) DO UPDATE SET
             value = site_stats.value + 1,
             updated_at = CURRENT_TIMESTAMP`
        ),
    ]);
  }

  return {
    counted: shouldCount,
    visits: await getSiteVisits(db),
  };
}

async function getPhotoReactionState(
  db: D1Database,
  photoId: string,
  clientId: string
) {
  const rows = await db
    .prepare(
      `SELECT reaction, COUNT(*) AS count
       FROM photo_reactions
       WHERE photo_id = ?
       GROUP BY reaction`
    )
    .bind(photoId)
    .all<{ reaction: string; count: number }>();

  const counts = emptyReactionCounts();
  for (const row of rows.results ?? []) {
    if (isPhotoReaction(row.reaction)) {
      counts[row.reaction] = Number(row.count ?? 0);
    }
  }

  const mineRow = await db
    .prepare(
      `SELECT reaction
       FROM photo_reactions
       WHERE photo_id = ? AND client_id = ?`
    )
    .bind(photoId, clientId)
    .first<{ reaction: string }>();

  return {
    counts,
    mine: isPhotoReaction(mineRow?.reaction) ? mineRow.reaction : null,
  };
}

async function setPhotoReaction(
  db: D1Database,
  photoId: string,
  clientId: string,
  reaction: PhotoReaction | null
) {
  if (reaction === null) {
    await db
      .prepare(
        'DELETE FROM photo_reactions WHERE photo_id = ? AND client_id = ?'
      )
      .bind(photoId, clientId)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO photo_reactions (photo_id, client_id, reaction)
         VALUES (?, ?, ?)
         ON CONFLICT(photo_id, client_id) DO UPDATE SET
           reaction = excluded.reaction`
      )
      .bind(photoId, clientId, reaction)
      .run();
  }

  return getPhotoReactionState(db, photoId, clientId);
}

function isoFromSqliteTimestamp(value: string) {
  const parsed = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function serializePhotoComment(row: PhotoCommentRow) {
  return {
    id: Number(row.id),
    nickname: row.nickname,
    content: row.content,
    createdAt: isoFromSqliteTimestamp(row.created_at),
  };
}

const FRIEND_STATUSES = ['pending', 'approved', 'rejected'] as const;
const FRIEND_NAME_MAX = 48;
const FRIEND_DESCRIPTION_MAX = 240;
const FRIEND_TAG_MAX = 16;
const FRIEND_TAGS_MAX = 6;

function isFriendStatus(value: unknown): value is FriendStatus {
  return (
    typeof value === 'string' &&
    (FRIEND_STATUSES as readonly string[]).includes(value)
  );
}

function normalizeFriendName(value: unknown) {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= FRIEND_NAME_MAX ? name : null;
}

function normalizeFriendDescription(value: unknown) {
  if (typeof value !== 'string') return null;
  const description = value.trim();
  return description.length <= FRIEND_DESCRIPTION_MAX ? description : null;
}

function normalizeFriendUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeFriendSeed(value: unknown) {
  const seed = Number(value);
  return Number.isInteger(seed) && seed >= 1 && seed <= 2147483647
    ? seed
    : null;
}

function normalizeFriendTags(value: unknown) {
  if (value === undefined || value === null) return [] as string[];
  if (!Array.isArray(value) || value.length > FRIEND_TAGS_MAX) return null;
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const tag = item.trim();
    if (!tag || tag.length > FRIEND_TAG_MAX) return null;
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function parseStoredFriendTags(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === 'string');
    }
  } catch {
    // Fall back to legacy comma-separated tags.
  }
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function serializeFriend(row: FriendLinkRow, includeStatus = false) {
  return {
    id: Number(row.id),
    name: row.name,
    url: row.url,
    seed: Number(row.seed),
    description: row.description,
    tags: parseStoredFriendTags(row.tags),
    createdAt: isoFromSqliteTimestamp(row.created_at),
    ...(includeStatus
      ? {
          status: row.status,
          updatedAt: isoFromSqliteTimestamp(row.updated_at),
        }
      : {}),
  };
}

function isFriendAdmin(request: Request, env: Env) {
  const expected = env.FRIENDS_ADMIN_TOKEN?.trim();
  return Boolean(expected) && request.headers.get('x-admin-token') === expected;
}

async function listApprovedFriends(db: D1Database) {
  const rows = await db
    .prepare(
      `SELECT id, name, url, seed, description, tags, status, created_at, updated_at
       FROM friend_links
       WHERE status = 'approved'
       ORDER BY id DESC`
    )
    .all<FriendLinkRow>();
  return (rows.results ?? []).map((row) => serializeFriend(row));
}

async function listFriendsForAdmin(db: D1Database) {
  const rows = await db
    .prepare(
      `SELECT id, name, url, seed, description, tags, status, created_at, updated_at
       FROM friend_links
       ORDER BY CASE status
         WHEN 'pending' THEN 0
         WHEN 'approved' THEN 1
         ELSE 2
       END, id DESC`
    )
    .all<FriendLinkRow>();
  return (rows.results ?? []).map((row) => serializeFriend(row, true));
}

async function getFriendLink(db: D1Database, id: number) {
  const row = await db
    .prepare(
      `SELECT id, name, url, seed, description, tags, status, created_at, updated_at
       FROM friend_links
       WHERE id = ?`
    )
    .bind(id)
    .first<FriendLinkRow>();
  return row;
}

interface FriendApplicationInput {
  name: string;
  url: string;
  seed: number;
  description: string;
  tags: string[];
}

async function createFriendApplication(
  db: D1Database,
  input: FriendApplicationInput
) {
  const duplicate = await db
    .prepare(
      `SELECT id FROM friend_links
       WHERE url = ? AND status IN ('pending', 'approved')
       LIMIT 1`
    )
    .bind(input.url)
    .first<{ id: number }>();

  if (duplicate) return null;

  const result = await db
    .prepare(
      `INSERT INTO friend_links (name, url, seed, description, tags)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      input.name,
      input.url,
      input.seed,
      input.description,
      JSON.stringify(input.tags)
    )
    .run();

  const id = Number(result.meta?.last_row_id ?? 0);
  return id > 0 ? getFriendLink(db, id) : null;
}

interface FriendPatch {
  name?: string;
  url?: string;
  seed?: number;
  description?: string;
  tags?: string[];
  status?: FriendStatus;
}

async function updateFriendLink(
  db: D1Database,
  id: number,
  patch: FriendPatch
) {
  const setters: string[] = [];
  const values: unknown[] = [];

  if (patch.name !== undefined) {
    setters.push('name = ?');
    values.push(patch.name);
  }
  if (patch.url !== undefined) {
    setters.push('url = ?');
    values.push(patch.url);
  }
  if (patch.seed !== undefined) {
    setters.push('seed = ?');
    values.push(patch.seed);
  }
  if (patch.description !== undefined) {
    setters.push('description = ?');
    values.push(patch.description);
  }
  if (patch.tags !== undefined) {
    setters.push('tags = ?');
    values.push(JSON.stringify(patch.tags));
  }
  if (patch.status !== undefined) {
    setters.push('status = ?');
    values.push(patch.status);
  }

  if (setters.length === 0) return undefined;

  setters.push('updated_at = CURRENT_TIMESTAMP');
  await db
    .prepare(`UPDATE friend_links SET ${setters.join(', ')} WHERE id = ?`)
    .bind(...values, id)
    .run();

  return getFriendLink(db, id);
}

async function deleteFriendLink(db: D1Database, id: number) {
  const result = await db
    .prepare('DELETE FROM friend_links WHERE id = ?')
    .bind(id)
    .run();
  return Boolean(result.meta?.changes);
}

async function getPhotoCommentCount(db: D1Database, photoId: string) {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM photo_comments WHERE photo_id = ?')
    .bind(photoId)
    .first<{ count: number }>();
  return Number(row?.count ?? 0);
}

async function listPhotoComments(db: D1Database, photoId: string) {
  const [rows, total] = await Promise.all([
    db
      .prepare(
        `SELECT id, nickname, content, created_at
         FROM photo_comments
         WHERE photo_id = ?
         ORDER BY id DESC
         LIMIT ?`
      )
      .bind(photoId, PHOTO_COMMENT_LIMIT)
      .all<PhotoCommentRow>(),
    getPhotoCommentCount(db, photoId),
  ]);

  return {
    comments: (rows.results ?? []).map(serializePhotoComment),
    total,
  };
}

async function createPhotoComment(
  db: D1Database,
  photoId: string,
  clientId: string,
  nickname: string,
  content: string
) {
  const result = await db
    .prepare(
      `INSERT INTO photo_comments (photo_id, nickname, content, client_id)
       VALUES (?, ?, ?, ?)`
    )
    .bind(photoId, nickname, content, clientId)
    .run();

  const id = Number(result.meta?.last_row_id ?? 0);
  const row =
    id > 0
      ? await db
          .prepare(
            `SELECT id, nickname, content, created_at
             FROM photo_comments
             WHERE id = ?`
          )
          .bind(id)
          .first<PhotoCommentRow>()
      : await db
          .prepare(
            `SELECT id, nickname, content, created_at
             FROM photo_comments
             WHERE photo_id = ?
             ORDER BY id DESC
             LIMIT 1`
          )
          .bind(photoId)
          .first<PhotoCommentRow>();

  return {
    comment: row
      ? serializePhotoComment(row)
      : {
          id,
          nickname,
          content,
          createdAt: new Date().toISOString(),
        },
    total: await getPhotoCommentCount(db, photoId),
  };
}

async function recordPhotoView(
  db: D1Database,
  photoId: string,
  clientId: string
) {
  const now = Date.now();
  const existing = await db
    .prepare(
      'SELECT viewed_at FROM photo_views WHERE photo_id = ? AND client_id = ?'
    )
    .bind(photoId, clientId)
    .first<ViewRow>();

  const shouldCount =
    !existing || now - Number(existing.viewed_at) > PHOTO_VIEW_WINDOW_MS;

  if (shouldCount) {
    await db.batch([
      db
        .prepare(
          `INSERT INTO photo_views (photo_id, client_id, viewed_at)
           VALUES (?, ?, ?)
           ON CONFLICT(photo_id, client_id) DO UPDATE SET viewed_at = excluded.viewed_at`
        )
        .bind(photoId, clientId, now),
      db
        .prepare(
          `INSERT INTO photo_stats (photo_id, views, updated_at)
           VALUES (?, 1, CURRENT_TIMESTAMP)
           ON CONFLICT(photo_id) DO UPDATE SET
             views = photo_stats.views + 1,
             updated_at = CURRENT_TIMESTAMP`
        )
        .bind(photoId),
    ]);
  }

  const stats = await db
    .prepare('SELECT views FROM photo_stats WHERE photo_id = ?')
    .bind(photoId)
    .first<{ views: number }>();

  return {
    counted: shouldCount,
    views: Number(stats?.views ?? 0),
    comments: await getPhotoCommentCount(db, photoId),
  };
}

async function getLikedPostIds(db: D1Database, clientId: string) {
  const rows = await db
    .prepare('SELECT post_id FROM post_likes WHERE client_id = ? ORDER BY post_id')
    .bind(clientId)
    .all<{ post_id: string }>();

  return (rows.results ?? []).map((row) => row.post_id);
}

async function recordView(db: D1Database, postId: string, clientId: string) {
  const now = Date.now();
  const existing = await db
    .prepare('SELECT viewed_at FROM post_views WHERE post_id = ? AND client_id = ?')
    .bind(postId, clientId)
    .first<ViewRow>();

  const shouldCount = !existing || now - Number(existing.viewed_at) > VIEW_WINDOW_MS;

  if (shouldCount) {
    await db.batch([
      db
        .prepare(
          `INSERT INTO post_views (post_id, client_id, viewed_at)
           VALUES (?, ?, ?)
           ON CONFLICT(post_id, client_id) DO UPDATE SET viewed_at = excluded.viewed_at`
        )
        .bind(postId, clientId, now),
      db
        .prepare(
          `INSERT INTO post_stats (post_id, views, likes, updated_at)
           VALUES (?, 1, 0, CURRENT_TIMESTAMP)
           ON CONFLICT(post_id) DO UPDATE SET
             views = post_stats.views + 1,
             updated_at = CURRENT_TIMESTAMP`
        )
        .bind(postId),
    ]);
  }

  return {
    counted: shouldCount,
    stats: await getPostStats(db, postId),
  };
}

async function setLike(
  db: D1Database,
  postId: string,
  clientId: string,
  liked: boolean
) {
  if (liked) {
    await db
      .prepare('INSERT OR IGNORE INTO post_likes (post_id, client_id) VALUES (?, ?)')
      .bind(postId, clientId)
      .run();
  } else {
    await db
      .prepare('DELETE FROM post_likes WHERE post_id = ? AND client_id = ?')
      .bind(postId, clientId)
      .run();
  }

  return {
    liked,
    stats: await getPostStats(db, postId),
  };
}

const STEAM_API_BASE = 'https://api.steampowered.com';
const STEAM_CAPSULE_BASE =
  'https://cdn.cloudflare.steamstatic.com/steam/apps';
const STEAM_ID_PATTERN = /^\d{17}$/;
const STEAM_CACHE_SECONDS = 600;
const STEAM_CACHE_VERSION = 3;
const STEAM_TOP_GAMES = 20;
const STEAM_RECENT_GAMES = 8;

interface SteamProfileSummary {
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

interface SteamGame {
  appid: number;
  name: string;
  minutes: number;
  twoWeekMinutes: number;
  lastPlayed: number;
  icon: string | null;
}

interface SteamPlatforms {
  windows: number;
  mac: number;
  linux: number;
  deck: number;
}

interface SteamLibrary {
  totalGames: number;
  playedGames: number;
  totalMinutes: number;
  twoWeekMinutes: number;
  platforms: SteamPlatforms;
  topGames: SteamGame[];
  recentGames: SteamGame[];
}

interface SteamLevel {
  level: number;
  xp: number;
  xpToNextLevel: number;
  xpCurrentLevel: number;
  badgeCount: number;
}

interface SteamCommunity {
  friends: number | null;
  groups: number | null;
  vacBanned: boolean;
  communityBanned: boolean;
  gameBans: number;
  daysSinceLastBan: number;
  economyBan: string | null;
}

interface SteamSummary {
  profile: SteamProfileSummary | null;
  level: SteamLevel | null;
  library: SteamLibrary | null;
  community: SteamCommunity | null;
  updatedAt: number;
}

interface SteamPayloads {
  players: SteamPlayerSummariesPayload;
  owned: SteamOwnedGamesPayload | null;
  level: SteamLevelPayload | null;
  badges: SteamBadgesPayload | null;
  recent: SteamRecentGamesPayload | null;
  friends: SteamFriendListPayload | null;
  groups: SteamGroupListPayload | null;
  bans: SteamBansPayload | null;
}

interface SteamPlayerSummariesPayload {
  response?: {
    players?: Array<{
      steamid?: string;
      personaname?: string;
      realname?: string;
      avatarfull?: string;
      avatar?: string;
      profileurl?: string;
      personastate?: number;
      communityvisibilitystate?: number;
      timecreated?: number;
      lastlogoff?: number;
      loccountrycode?: string;
      gameid?: string;
      gameextrainfo?: string;
    }>;
  };
}

interface SteamOwnedGamesPayload {
  response?: {
    game_count?: number;
    games?: Array<{
      appid?: number;
      name?: string;
      playtime_forever?: number;
      playtime_2weeks?: number;
      playtime_windows_forever?: number;
      playtime_mac_forever?: number;
      playtime_linux_forever?: number;
      playtime_deck_forever?: number;
      rtime_last_played?: number;
    }>;
  };
}

interface SteamRecentGamesPayload {
  response?: {
    total_count?: number;
    games?: Array<{
      appid?: number;
      name?: string;
      playtime_2weeks?: number;
      playtime_forever?: number;
    }>;
  };
}

interface SteamLevelPayload {
  response?: {
    player_level?: number;
  };
}

interface SteamBadgesPayload {
  response?: {
    player_xp?: number;
    player_level?: number;
    player_xp_needed_to_level_up?: number;
    player_xp_needed_current_level?: number;
    badges?: unknown[];
  };
}

interface SteamFriendListPayload {
  friendslist?: {
    friends?: Array<{ steamid?: string }>;
  };
}

interface SteamGroupListPayload {
  response?: {
    groups?: Array<{ gid?: string }>;
  };
}

interface SteamBansPayload {
  players?: Array<{
    SteamId?: string;
    CommunityBanned?: boolean;
    VACBanned?: boolean;
    NumberOfVACBans?: number;
    DaysSinceLastBan?: number;
    NumberOfGameBans?: number;
    EconomyBan?: string;
  }>;
}

class SteamApiError extends Error {
  status: number;

  constructor(status: number) {
    super(`Steam API responded with ${status}`);
    this.status = status;
  }
}

type EdgeCacheEntry = {
  expiresAt: number;
  body: string;
};

type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

const edgeCache: EdgeCache | null =
  typeof globalThis === 'object' && 'caches' in globalThis
    ? (globalThis as unknown as { caches: { default: EdgeCache } }).caches
        .default
    : null;

async function readEdgeCache<T>(key: string): Promise<T | null> {
  if (!edgeCache) return null;
  try {
    const hit = await edgeCache.match(new Request(key));
    if (!hit) return null;
    const entry = (await hit.json()) as EdgeCacheEntry;
    if (
      !entry ||
      typeof entry.expiresAt !== 'number' ||
      typeof entry.body !== 'string' ||
      entry.expiresAt <= Date.now()
    ) {
      return null;
    }
    return JSON.parse(entry.body) as T;
  } catch {
    return null;
  }
}

async function writeEdgeCache<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  if (!edgeCache) return;
  try {
    const entry: EdgeCacheEntry = {
      expiresAt: Date.now() + ttlSeconds * 1000,
      body: JSON.stringify(data),
    };
    await edgeCache.put(
      new Request(key),
      new Response(JSON.stringify(entry), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': `public, max-age=${ttlSeconds}`,
        },
      })
    );
  } catch {
    // Cache misses are harmless; the next request refetches upstream.
  }
}

// The legacy community icon path (media.steampowered.com/.../apps/<id>/<hash>.jpg)
// now 404s for most apps; the appid-addressed store capsule still works.
function steamCapsuleUrl(appid: number): string {
  return `${STEAM_CAPSULE_BASE}/${appid}/capsule_184x69.jpg`;
}

function toSteamGame(game: {
  appid?: number;
  name?: string;
  playtime_forever?: number;
  playtime_2weeks?: number;
  rtime_last_played?: number;
}): SteamGame | null {
  if (typeof game.appid !== 'number') return null;
  return {
    appid: game.appid,
    name: game.name || `App ${game.appid}`,
    minutes: Math.max(0, Math.trunc(game.playtime_forever ?? 0)),
    twoWeekMinutes: Math.max(0, Math.trunc(game.playtime_2weeks ?? 0)),
    lastPlayed: Math.max(0, Math.trunc(game.rtime_last_played ?? 0)),
    icon: steamCapsuleUrl(game.appid),
  };
}

function sumPlatform(
  games: NonNullable<SteamOwnedGamesPayload['response']>['games'],
  key: 'playtime_windows_forever' | 'playtime_mac_forever' | 'playtime_linux_forever' | 'playtime_deck_forever'
): number {
  if (!games) return 0;
  return games.reduce((sum, game) => {
    const value = game[key];
    return sum + (typeof value === 'number' ? Math.max(0, value) : 0);
  }, 0);
}

function buildSteamSummary(steamId: string, payloads: SteamPayloads): SteamSummary {
  const player = payloads.players?.response?.players?.[0];
  const profile: SteamProfileSummary | null = player
    ? {
        steamId: player.steamid || steamId,
        name: player.personaname || 'Steam user',
        realName: player.realname || null,
        avatar: player.avatarfull || player.avatar || '',
        profileUrl:
          player.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
        state: typeof player.personastate === 'number' ? player.personastate : 0,
        visibility:
          typeof player.communityvisibilitystate === 'number'
            ? player.communityvisibilitystate
            : 0,
        countryCode: player.loccountrycode || null,
        createdAt: Math.max(0, Math.trunc(player.timecreated ?? 0)),
        lastLogOff: Math.max(0, Math.trunc(player.lastlogoff ?? 0)),
        currentGame:
          player.gameid && player.gameextrainfo
            ? { appid: Number(player.gameid) || 0, name: player.gameextrainfo }
            : null,
      }
    : null;

  const rawGames = payloads.owned?.response?.games;
  const games = (rawGames ?? [])
    .map(toSteamGame)
    .filter((game): game is SteamGame => game !== null);
  const gameCount = payloads.owned?.response?.game_count;

  const badges = payloads.badges?.response;
  const steamLevel = payloads.level?.response?.player_level;
  const level: SteamLevel | null =
    typeof badges?.player_xp === 'number' || typeof steamLevel === 'number'
      ? {
          level:
            Math.trunc(steamLevel ?? badges?.player_level ?? 0) || 0,
          xp: Math.max(0, Math.trunc(badges?.player_xp ?? 0)),
          xpToNextLevel: Math.max(
            0,
            Math.trunc(badges?.player_xp_needed_to_level_up ?? 0)
          ),
          xpCurrentLevel: Math.max(
            0,
            Math.trunc(badges?.player_xp_needed_current_level ?? 0)
          ),
          badgeCount: Array.isArray(badges?.badges) ? badges!.badges!.length : 0,
        }
      : null;

  const ban = payloads.bans?.players?.[0];
  const community: SteamCommunity | null = ban
    ? {
        friends: payloads.friends?.friendslist?.friends?.length ?? null,
        groups: payloads.groups?.response?.groups?.length ?? null,
        vacBanned: Boolean(ban.VACBanned),
        communityBanned: Boolean(ban.CommunityBanned),
        gameBans: Math.max(0, Math.trunc(ban.NumberOfGameBans ?? 0)),
        daysSinceLastBan: Math.max(0, Math.trunc(ban.DaysSinceLastBan ?? 0)),
        economyBan: ban.EconomyBan && ban.EconomyBan !== 'none' ? ban.EconomyBan : null,
      }
    : null;

  if (games.length === 0 && typeof gameCount !== 'number') {
    return { profile, level, library: null, community, updatedAt: Date.now() };
  }

  const totalMinutes = games.reduce((sum, game) => sum + game.minutes, 0);
  const twoWeekMinutes = games.reduce(
    (sum, game) => sum + game.twoWeekMinutes,
    0
  );

  const recentFromSteam = (payloads.recent?.response?.games ?? [])
    .map(toSteamGame)
    .filter((game): game is SteamGame => game !== null)
    .sort((a, b) => b.twoWeekMinutes - a.twoWeekMinutes);

  return {
    profile,
    level,
    library: {
      totalGames: typeof gameCount === 'number' ? gameCount : games.length,
      playedGames: games.filter((game) => game.minutes > 0).length,
      totalMinutes,
      twoWeekMinutes,
      platforms: {
        windows: sumPlatform(rawGames, 'playtime_windows_forever'),
        mac: sumPlatform(rawGames, 'playtime_mac_forever'),
        linux: sumPlatform(rawGames, 'playtime_linux_forever'),
        deck: sumPlatform(rawGames, 'playtime_deck_forever'),
      },
      topGames: [...games]
        .filter((game) => game.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, STEAM_TOP_GAMES),
      recentGames:
        recentFromSteam.length > 0
          ? recentFromSteam.slice(0, STEAM_RECENT_GAMES)
          : games
              .filter((game) => game.twoWeekMinutes > 0)
              .sort((a, b) => b.twoWeekMinutes - a.twoWeekMinutes)
              .slice(0, STEAM_RECENT_GAMES),
    },
    community,
    updatedAt: Date.now(),
  };
}

async function fetchSteamJson<T>(url: URL): Promise<T> {
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new SteamApiError(response.status);
  }
  return (await response.json()) as T;
}

function steamUrl(
  apiKey: string,
  path: string,
  params: Record<string, string>
): URL {
  const url = new URL(`${STEAM_API_BASE}${path}`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('format', 'json');
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  return url;
}

async function loadSteamSummary(
  apiKey: string,
  steamId: string
): Promise<SteamSummary> {
  const settled = await Promise.allSettled([
    fetchSteamJson<SteamPlayerSummariesPayload>(
      steamUrl(apiKey, '/ISteamUser/GetPlayerSummaries/v2/', {
        steamids: steamId,
      })
    ),
    fetchSteamJson<SteamOwnedGamesPayload>(
      steamUrl(apiKey, '/IPlayerService/GetOwnedGames/v1/', {
        steamid: steamId,
        include_appinfo: '1',
        include_played_free_games: '1',
      })
    ),
    fetchSteamJson<SteamLevelPayload>(
      steamUrl(apiKey, '/IPlayerService/GetSteamLevel/v1/', {
        steamid: steamId,
      })
    ),
    fetchSteamJson<SteamBadgesPayload>(
      steamUrl(apiKey, '/IPlayerService/GetBadges/v1/', {
        steamid: steamId,
      })
    ),
    fetchSteamJson<SteamRecentGamesPayload>(
      steamUrl(apiKey, '/IPlayerService/GetRecentlyPlayedGames/v1/', {
        steamid: steamId,
        count: String(STEAM_RECENT_GAMES),
      })
    ),
    fetchSteamJson<SteamFriendListPayload>(
      steamUrl(apiKey, '/ISteamUser/GetFriendList/v1/', {
        steamid: steamId,
        relationship: 'friend',
      })
    ),
    fetchSteamJson<SteamGroupListPayload>(
      steamUrl(apiKey, '/ISteamUser/GetUserGroupList/v1/', {
        steamid: steamId,
      })
    ),
    fetchSteamJson<SteamBansPayload>(
      steamUrl(apiKey, '/ISteamUser/GetPlayerBans/v1/', {
        steamids: steamId,
      })
    ),
  ]);

  const take = <T,>(index: number): T | null => {
    const entry = settled[index];
    return entry.status === 'fulfilled' ? (entry.value as T) : null;
  };

  const players = take<SteamPlayerSummariesPayload>(0);
  if (!players) {
    const failure = settled[0];
    const reason =
      failure.status === 'rejected' ? failure.reason : null;
    throw reason instanceof SteamApiError ? reason : new SteamApiError(502);
  }

  return buildSteamSummary(steamId, {
    players,
    owned: take<SteamOwnedGamesPayload>(1),
    level: take<SteamLevelPayload>(2),
    badges: take<SteamBadgesPayload>(3),
    recent: take<SteamRecentGamesPayload>(4),
    friends: take<SteamFriendListPayload>(5),
    groups: take<SteamGroupListPayload>(6),
    bans: take<SteamBansPayload>(7),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (request.method === 'GET' && path === '/') {
        return json({ ok: true, service: 'pixel-blog-stats' });
      }

      if (request.method === 'GET' && path === '/stats') {
        return json({ ok: true, stats: await getAllStats(env.DB) });
      }

      if (request.method === 'GET' && path === '/site') {
        return json({ ok: true, visits: await getSiteVisits(env.DB) });
      }

      if (request.method === 'GET' && path === '/friends') {
        return json({ ok: true, friends: await listApprovedFriends(env.DB) });
      }

      if (request.method === 'POST' && path === '/friends/apply') {
        const body = await readJson(request);
        const name = normalizeFriendName(body?.name);
        const url = normalizeFriendUrl(body?.url);
        const seed = normalizeFriendSeed(body?.seed);
        const description =
          body?.description === undefined
            ? ''
            : normalizeFriendDescription(body.description);
        const tags = normalizeFriendTags(body?.tags);

        if (
          !body ||
          !name ||
          !url ||
          seed === null ||
          description === null ||
          tags === null
        ) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }

        const row = await createFriendApplication(env.DB, {
          name,
          url,
          seed,
          description,
          tags,
        });
        if (!row) {
          return json({ ok: false, error: 'duplicate_url' }, 409);
        }

        return json(
          { ok: true, application: serializeFriend(row, true) },
          201
        );
      }

      if (path.startsWith('/friends/admin')) {
        if (!env.FRIENDS_ADMIN_TOKEN?.trim()) {
          return json({ ok: false, error: 'admin_not_configured' }, 503);
        }
        if (!isFriendAdmin(request, env)) {
          return json({ ok: false, error: 'unauthorized' }, 401);
        }

        if (request.method === 'GET' && path === '/friends/admin') {
          return json({
            ok: true,
            friends: await listFriendsForAdmin(env.DB),
          });
        }

        const friendAdminMatch = /^\/friends\/admin\/(\d+)$/.exec(path);
        if (friendAdminMatch) {
          const id = Number(friendAdminMatch[1]);

          if (request.method === 'PATCH') {
            const body = await readJson(request);
            if (!body) {
              return json({ ok: false, error: 'invalid_payload' }, 400);
            }

            const patch: FriendPatch = {};
            if (body.name !== undefined) {
              const name = normalizeFriendName(body.name);
              if (!name) {
                return json({ ok: false, error: 'invalid_payload' }, 400);
              }
              patch.name = name;
            }
            if (body.url !== undefined) {
              const url = normalizeFriendUrl(body.url);
              if (!url) {
                return json({ ok: false, error: 'invalid_payload' }, 400);
              }
              patch.url = url;
            }
            if (body.seed !== undefined) {
              const seed = normalizeFriendSeed(body.seed);
              if (seed === null) {
                return json({ ok: false, error: 'invalid_payload' }, 400);
              }
              patch.seed = seed;
            }
            if (body.description !== undefined) {
              const description = normalizeFriendDescription(body.description);
              if (description === null) {
                return json({ ok: false, error: 'invalid_payload' }, 400);
              }
              patch.description = description;
            }
            if (body.tags !== undefined) {
              const tags = normalizeFriendTags(body.tags);
              if (tags === null) {
                return json({ ok: false, error: 'invalid_payload' }, 400);
              }
              patch.tags = tags;
            }
            if (body.status !== undefined) {
              if (!isFriendStatus(body.status)) {
                return json({ ok: false, error: 'invalid_payload' }, 400);
              }
              patch.status = body.status;
            }

            const row = await updateFriendLink(env.DB, id, patch);
            if (row === undefined) {
              return json({ ok: false, error: 'invalid_payload' }, 400);
            }
            if (!row) {
              return json({ ok: false, error: 'not_found' }, 404);
            }
            return json({ ok: true, friend: serializeFriend(row, true) });
          }

          if (request.method === 'DELETE') {
            if (!(await deleteFriendLink(env.DB, id))) {
              return json({ ok: false, error: 'not_found' }, 404);
            }
            return json({ ok: true, id });
          }
        }
      }

      if (request.method === 'GET' && path === '/photo-reactions') {
        const photoId = url.searchParams.get('photoId');
        const clientId = url.searchParams.get('clientId');
        if (!isValidPostId(photoId) || !isValidClientId(clientId)) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }
        return json({
          ok: true,
          ...(await getPhotoReactionState(env.DB, photoId, clientId)),
        });
      }

      if (request.method === 'POST' && path === '/photo-react') {
        const body = await readJson(request);
        if (
          !body ||
          !isValidPostId(body.photoId) ||
          !isValidClientId(body.clientId) ||
          (body.reaction !== null && !isPhotoReaction(body.reaction))
        ) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }

        return json({
          ok: true,
          ...(await setPhotoReaction(
            env.DB,
            body.photoId,
            body.clientId,
            body.reaction as PhotoReaction | null
          )),
        });
      }

      if (request.method === 'GET' && path === '/photo-comments') {
        const photoId = url.searchParams.get('photoId');
        if (!isValidPostId(photoId)) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }
        return json({ ok: true, ...(await listPhotoComments(env.DB, photoId)) });
      }

      if (request.method === 'POST' && path === '/photo-comments') {
        const body = await readJson(request);
        const nickname =
          typeof body?.nickname === 'string' ? body.nickname.trim() : '';
        const content =
          typeof body?.content === 'string' ? body.content.trim() : '';

        if (
          !body ||
          !isValidPostId(body.photoId) ||
          !isValidClientId(body.clientId) ||
          nickname.length < 1 ||
          nickname.length > 24 ||
          content.length < 1 ||
          content.length > 500
        ) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }

        return json({
          ok: true,
          ...(await createPhotoComment(
            env.DB,
            body.photoId,
            body.clientId,
            nickname,
            content
          )),
        });
      }

      if (request.method === 'POST' && path === '/photo-view') {
        const body = await readJson(request);
        if (
          !body ||
          !isValidPostId(body.photoId) ||
          !isValidClientId(body.clientId)
        ) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }

        return json({
          ok: true,
          ...(await recordPhotoView(env.DB, body.photoId, body.clientId)),
        });
      }

      if (request.method === 'GET' && path === '/likes') {
        const clientId = url.searchParams.get('clientId');
        if (!isValidClientId(clientId)) {
          return json({ ok: false, error: 'invalid_client_id' }, 400);
        }
        return json({
          ok: true,
          likedPostIds: await getLikedPostIds(env.DB, clientId),
        });
      }

      if (request.method === 'POST' && path === '/visit') {
        const body = await readJson(request);
        if (!body || !isValidClientId(body.clientId)) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }

        return json({ ok: true, ...(await recordSiteVisit(env.DB, body.clientId)) });
      }

      if (request.method === 'POST' && path === '/view') {
        const body = await readJson(request);
        if (!body || !isValidPostId(body.postId) || !isValidClientId(body.clientId)) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }

        const result = await recordView(env.DB, body.postId, body.clientId);
        return json({ ok: true, ...result });
      }

      if (request.method === 'POST' && path === '/like') {
        const body = await readJson(request);
        if (
          !body ||
          !isValidPostId(body.postId) ||
          !isValidClientId(body.clientId) ||
          typeof body.liked !== 'boolean'
        ) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }

        const result = await setLike(
          env.DB,
          body.postId,
          body.clientId,
          body.liked
        );
        return json({ ok: true, ...result });
      }

      if (request.method === 'GET' && path === '/steam/profile') {
        const apiKey = env.STEAM_API_KEY?.trim();
        const steamId = env.STEAM_ID?.trim() ?? '';

        if (!apiKey) {
          return json({ ok: false, error: 'steam_not_configured' }, 503);
        }
        if (!STEAM_ID_PATTERN.test(steamId)) {
          return json({ ok: false, error: 'steam_id_missing' }, 503);
        }

        const cacheKey = `${url.origin}/__steam-cache/v${STEAM_CACHE_VERSION}/profile/${steamId}`;
        const cached = await readEdgeCache<SteamSummary>(cacheKey);
        if (cached) {
          return json({ ok: true, steam: cached, cached: true });
        }

        try {
          const steam = await loadSteamSummary(apiKey, steamId);
          await writeEdgeCache(cacheKey, steam, STEAM_CACHE_SECONDS);
          return json({ ok: true, steam, cached: false });
        } catch (error) {
          if (error instanceof SteamApiError) {
            const unauthorized = error.status === 401 || error.status === 403;
            return json(
              {
                ok: false,
                error: unauthorized ? 'steam_unauthorized' : 'steam_error',
              },
              502
            );
          }
          throw error;
        }
      }

      return json({ ok: false, error: 'not_found' }, 404);
    } catch (error) {
      console.error('stats worker error', error);
      return json({ ok: false, error: 'internal_error' }, 500);
    }
  },
};
