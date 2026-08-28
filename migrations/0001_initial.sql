-- 현재 운영 중인 스키마의 스냅샷 (worker.js의 ensureSchema()와 동일한 최종 상태).
-- IF NOT EXISTS라서 이미 이 스키마가 적용된 운영 DB에 실행해도 안전함(에러 없이 무시).
-- 앞으로 스키마를 바꿀 때는 이 파일을 고치지 말고 새 마이그레이션을 추가할 것:
--   npx wrangler d1 migrations create hakhoe-on <설명>

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL, name TEXT,
  role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  email TEXT PRIMARY KEY NOT NULL, name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at TEXT NOT NULL, decided_at TEXT, decided_by TEXT
);

CREATE TABLE IF NOT EXISTS officers (
  email TEXT PRIMARY KEY NOT NULL, granted_by TEXT, granted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  signup INTEGER NOT NULL DEFAULT 0, start_at TEXT, location TEXT,
  capacity INTEGER NOT NULL DEFAULT 0, gcal_event_id TEXT,
  author_id TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  start_at TEXT NOT NULL, location TEXT, gcal_event_id TEXT,
  author_id TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL DEFAULT '기타',
  activity_date TEXT NOT NULL, headcount INTEGER NOT NULL,
  start_at TEXT, location TEXT, gcal_event_id TEXT,
  author_id TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
  deadline TEXT NOT NULL, multi INTEGER NOT NULL DEFAULT 0,
  author_id TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, poll_id INTEGER NOT NULL,
  label TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_ballots (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, poll_id INTEGER NOT NULL,
  option_id INTEGER NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, poll_id INTEGER NOT NULL, option_id INTEGER,
  user_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '', author_id TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notice_members (
  notice_id INTEGER NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (notice_id, user_id)
);

CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  author_id TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idea_likes (
  idea_id INTEGER NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE IF NOT EXISTS idea_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, idea_id INTEGER NOT NULL,
  user_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS translations (
  hash TEXT PRIMARY KEY NOT NULL, source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ballots_unique ON poll_ballots(poll_id,user_id,option_id);
CREATE INDEX IF NOT EXISTS idx_options_poll ON poll_options(poll_id,position);
CREATE INDEX IF NOT EXISTS idx_discussions_poll ON poll_discussions(poll_id,created_at);
CREATE INDEX IF NOT EXISTS idx_schedules_start ON schedules(start_at);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_idea_replies ON idea_replies(idea_id,created_at);
CREATE INDEX IF NOT EXISTS idx_notice_members ON notice_members(notice_id);
