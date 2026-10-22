CREATE TABLE IF NOT EXISTS post_stats (
  post_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, client_id)
);

CREATE TABLE IF NOT EXISTS post_views (
  post_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  viewed_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, client_id)
);

CREATE TRIGGER IF NOT EXISTS trg_post_likes_insert
AFTER INSERT ON post_likes
BEGIN
  INSERT INTO post_stats (post_id, views, likes)
  VALUES (NEW.post_id, 0, 1)
  ON CONFLICT(post_id) DO UPDATE SET
    likes = post_stats.likes + 1,
    updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_post_likes_delete
AFTER DELETE ON post_likes
BEGIN
  UPDATE post_stats
  SET likes = MAX(0, likes - 1),
      updated_at = CURRENT_TIMESTAMP
  WHERE post_id = OLD.post_id;
END;
