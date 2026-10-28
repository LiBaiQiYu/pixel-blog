ALTER TABLE photo_reactions RENAME TO photo_reactions_legacy;

CREATE TABLE photo_reactions (
  photo_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  reaction TEXT NOT NULL CHECK (
    reaction IN (
      'stunning', 'cozy', 'solid', 'shock', 'intriguing',
      'plain', 'moving', 'blank', 'wistful'
    )
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (photo_id, client_id)
);

INSERT OR IGNORE INTO photo_reactions (photo_id, client_id, reaction, created_at)
SELECT
  photo_id,
  client_id,
  CASE reaction
    WHEN 'like' THEN 'solid'
    WHEN 'love' THEN 'cozy'
    WHEN 'laugh' THEN 'cozy'
    WHEN 'wow' THEN 'shock'
    WHEN 'sad' THEN 'moving'
    WHEN 'fire' THEN 'stunning'
    WHEN 'party' THEN 'stunning'
    WHEN 'think' THEN 'intriguing'
    ELSE reaction
  END,
  created_at
FROM photo_reactions_legacy
WHERE reaction IN (
  'like', 'love', 'laugh', 'wow', 'sad', 'fire', 'party', 'think',
  'stunning', 'cozy', 'solid', 'shock', 'intriguing',
  'plain', 'moving', 'blank', 'wistful'
);

DROP TABLE photo_reactions_legacy;

CREATE INDEX IF NOT EXISTS idx_photo_reactions_photo
ON photo_reactions(photo_id);
