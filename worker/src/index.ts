interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
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
}

interface StatsRow {
  post_id: string;
  views: number;
  likes: number;
}

interface ViewRow {
  viewed_at: number;
}

const VIEW_WINDOW_MS = 6 * 60 * 60 * 1000;
const POST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

      return json({ ok: false, error: 'not_found' }, 404);
    } catch (error) {
      console.error('stats worker error', error);
      return json({ ok: false, error: 'internal_error' }, 500);
    }
  },
};
