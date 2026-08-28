/* 세종 금융학회 — API worker
 * 인증: 구글 ID 토큰 검증 → HMAC 서명 세션 쿠키
 * 저장: Cloudflare D1
 */

import { parseICS } from './ics.js';
import { createEvent, updateEvent, deleteEvent, buildDescription, calendarWriteReady } from './gcal.js';
import { translateTexts } from './translate.js';

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra }
  });
const now = () => new Date().toISOString();

const SESSION_COOKIE = 'hakhoe_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 60; // 60일

/* ---------------- schema ---------------- */
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL, name TEXT,
      role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS members (
      email TEXT PRIMARY KEY NOT NULL, name TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      requested_at TEXT NOT NULL, decided_at TEXT, decided_by TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS officers (
      email TEXT PRIMARY KEY NOT NULL, granted_by TEXT, granted_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      signup INTEGER NOT NULL DEFAULT 0, start_at TEXT, location TEXT,
      capacity INTEGER NOT NULL DEFAULT 0, gcal_event_id TEXT,
      author_id TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
      start_at TEXT NOT NULL, location TEXT, gcal_event_id TEXT,
      author_id TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL DEFAULT '기타',
      activity_date TEXT NOT NULL, headcount INTEGER NOT NULL,
      start_at TEXT, location TEXT, gcal_event_id TEXT,
      author_id TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
      deadline TEXT NOT NULL, multi INTEGER NOT NULL DEFAULT 0,
      author_id TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, poll_id INTEGER NOT NULL,
      label TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS poll_ballots (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, poll_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS poll_discussions (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, poll_id INTEGER NOT NULL, option_id INTEGER,
      user_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '', author_id TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS notice_members (
      notice_id INTEGER NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY (notice_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      author_id TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS idea_likes (
      idea_id INTEGER NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY (idea_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS idea_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, idea_id INTEGER NOT NULL,
      user_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS translations (
      hash TEXT PRIMARY KEY NOT NULL, source_text TEXT NOT NULL,
      translated_text TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_ballots_unique ON poll_ballots(poll_id,user_id,option_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_options_poll ON poll_options(poll_id,position)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_discussions_poll ON poll_discussions(poll_id,created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_schedules_start ON schedules(start_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_idea_replies ON idea_replies(idea_id,created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_notice_members ON notice_members(notice_id)')
  ]);
  // 기존 배포본 마이그레이션 (이미 적용됐으면 조용히 무시)
  for (const sql of [
    'ALTER TABLE polls ADD COLUMN multi INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE activities ADD COLUMN start_at TEXT',
    'ALTER TABLE activities ADD COLUMN location TEXT',
    'ALTER TABLE activities ADD COLUMN gcal_event_id TEXT',
    'ALTER TABLE schedules ADD COLUMN gcal_event_id TEXT',
    'ALTER TABLE notices ADD COLUMN signup INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE notices ADD COLUMN start_at TEXT',
    'ALTER TABLE notices ADD COLUMN location TEXT',
    'ALTER TABLE notices ADD COLUMN capacity INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE notices ADD COLUMN gcal_event_id TEXT',
    'DROP INDEX IF EXISTS idx_ballots_poll_user',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_ballots_unique ON poll_ballots(poll_id,user_id,option_id)'
  ]) {
    try { await db.prepare(sql).run(); } catch (e) { /* 이미 반영됨 */ }
  }
  schemaReady = true;
}

/* ---------------- crypto ---------------- */
function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToStr(b64) {
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
async function hmac(env, data) {
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET이 설정되지 않았습니다.');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}
async function createSession(env, payload) {
  const data = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${data}.${await hmac(env, data)}`;
}
async function readSession(env, token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  let expected;
  try { expected = await hmac(env, data); } catch { return null; }
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(b64urlToStr(data));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}
function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const m = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

/* ---------------- identity ---------------- */
async function verifyGoogleCredential(credential, env) {
  const resp = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );
  if (!resp.ok) return null;
  const info = await resp.json();
  if (!env.GOOGLE_CLIENT_ID || info.aud !== env.GOOGLE_CLIENT_ID) return null;
  if (info.email_verified !== 'true' && info.email_verified !== true) return null;
  if (!info.email || !info.sub) return null;
  return {
    email: String(info.email).toLowerCase(),
    name: info.name || info.email.split('@')[0],
    sub: info.sub
  };
}
function adminEmails(env) {
  return new Set(
    String(env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  );
}
async function resolveUser(request, env, db) {
  const session = await readSession(env, getCookie(request, SESSION_COOKIE));
  if (!session || !session.email) {
    return { id: null, email: null, name: '방문자', role: 'visitor', authenticated: false };
  }
  const email = String(session.email).toLowerCase();
  const name = session.name || email.split('@')[0];
  const id = `google:${session.sub}`;

  let role;
  const officer = await db.prepare('SELECT 1 AS x FROM officers WHERE email=?').bind(email).first();
  if (adminEmails(env).has(email) || officer) {
    role = 'admin';
  } else {
    const m = await db.prepare('SELECT status FROM members WHERE email=?').bind(email).first();
    if (!m) {
      await db.prepare(
        "INSERT INTO members(email,name,status,requested_at) VALUES(?,?,'pending',?)"
      ).bind(email, name, now()).run();
      role = 'pending';
    } else {
      role = m.status === 'approved' ? 'member' : m.status; // pending | rejected
    }
  }

  const existing = await db.prepare('SELECT id,name FROM users WHERE id=?').bind(id).first();
  if (!existing) {
    await db.prepare('INSERT INTO users(id,email,name,role,created_at) VALUES(?,?,?,?,?)')
      .bind(id, email, name, role, now()).run();
  } else if (existing.name !== name) {
    await db.prepare('UPDATE users SET name=? WHERE id=?').bind(name, id).run();
  }
  return { id, email, name, role, authenticated: true };
}
const canRead = u => u.role === 'admin' || u.role === 'member';
const isAdmin = u => u.role === 'admin';

/* ---------------- helpers ---------------- */
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const DENY_GUEST = () => json({ error: '구글 로그인이 필요합니다.' }, 401);
const DENY_PENDING = () => json({ error: '운영진 승인 후 이용할 수 있습니다.' }, 403);
const DENY_ADMIN = () => json({ error: '운영진만 할 수 있습니다.' }, 403);

async function ownedRow(db, table, id) {
  return db.prepare(`SELECT id, author_id FROM ${table} WHERE id=?`).bind(id).first();
}
async function removeIfAllowed(db, table, id, user) {
  const row = await ownedRow(db, table, id);
  if (!row) return json({ error: '항목을 찾을 수 없습니다.' }, 404);
  if (!isAdmin(user) && row.author_id !== user.id) {
    return json({ error: '작성자와 운영진만 삭제할 수 있습니다.' }, 403);
  }
  await db.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
  if (table === 'polls') {
    await db.batch([
      db.prepare('DELETE FROM poll_options WHERE poll_id=?').bind(id),
      db.prepare('DELETE FROM poll_ballots WHERE poll_id=?').bind(id),
      db.prepare('DELETE FROM poll_discussions WHERE poll_id=?').bind(id)
    ]);
  }
  return json({ ok: true });
}

async function editable(db, table, id, user) {
  const row = await db.prepare(`SELECT id, author_id FROM ${table} WHERE id=?`).bind(id).first();
  if (!row) return { error: json({ error: '항목을 찾을 수 없습니다.' }, 404) };
  if (!isAdmin(user) && row.author_id !== user.id) {
    return { error: json({ error: '작성자와 운영진만 수정할 수 있습니다.' }, 403) };
  }
  return { row };
}

async function listPolls(db, user) {
  const polls = await db.prepare(
    `SELECT p.id,p.title,p.content,p.deadline,p.multi,p.created_at,p.author_id,
            COALESCE(u.name,u.email,'운영진') AS author_name,
            (SELECT COUNT(*) FROM poll_discussions d WHERE d.poll_id=p.id) AS comment_count,
            (SELECT COUNT(DISTINCT b.user_id) FROM poll_ballots b WHERE b.poll_id=p.id) AS voter_count
     FROM polls p LEFT JOIN users u ON u.id=p.author_id
     ORDER BY datetime(p.created_at) DESC`
  ).all();
  const options = await db.prepare(
    `SELECT o.id,o.poll_id,o.label,o.position,
            COUNT(b.id) AS vote_count,
            MAX(CASE WHEN b.user_id=? THEN 1 ELSE 0 END) AS selected
     FROM poll_options o LEFT JOIN poll_ballots b ON b.option_id=o.id
     GROUP BY o.id ORDER BY o.poll_id,o.position`
  ).bind(user.id || '').all();

  const grouped = new Map();
  for (const o of options.results || []) {
    if (!grouped.has(o.poll_id)) grouped.set(o.poll_id, []);
    grouped.get(o.poll_id).push({
      id: o.id, label: o.label, position: o.position,
      vote_count: Number(o.vote_count || 0), selected: Boolean(o.selected)
    });
  }
  return (polls.results || []).map(p => {
    const opts = grouped.get(p.id) || [];
    return {
      ...p,
      multi: Number(p.multi || 0) === 1,
      comment_count: Number(p.comment_count || 0),
      total: Number(p.voter_count || 0),
      picks: opts.reduce((s, o) => s + o.vote_count, 0),
      options: opts,
      mine: opts.filter(o => o.selected).map(o => o.id)
    };
  });
}

const DEFAULT_SETTINGS = {
  term: { name: '2026 2학기', progress: 0, note: '' },
  goal: {
    label: '이번 학기 우리의 방향',
    lead: '시장을 읽고', accent: '우리의 언어로 쓴다',
    note: '매주 정기 모임으로 관점을 쌓고, 공모전과 세미나에서 검증합니다.',
    count: '04'
  },
  roadmap: [
    { title: '리크루팅과 오리엔테이션', when: '4–5월', state: 'done' },
    { title: '정기 모임 · 소모임 운영', when: '9–11월', state: 'now' },
    { title: '한국은행 통화정책 경시대회', when: '10월', state: 'next' },
    { title: '학기 회고와 인수인계', when: '12월', state: 'next' }
  ],
  topics: [
    { no: 'I', title: '경제', detail: '통화정책과 거시경제 · 국제금융 · 외환시장' },
    { no: 'II', title: '비즈니스', detail: '기업가치평가와 경영전략 · 산업과 시장환경 · 퀀트 투자와 금융 데이터 분석' },
    { no: 'III', title: '국가별 주제', detail: '예: 한국 부동산 시장, 일본 통화정책, 미국 기술주 밸류에이션' }
  ],
  drive: {
    url: 'https://drive.google.com/drive/folders/1bNohviKwXbEyWgQlt5ArMWn_qeMlmOlc?usp=sharing',
    folderId: '1bNohviKwXbEyWgQlt5ArMWn_qeMlmOlc'
  },
  recruit: {
    period: '26.04.20 – 26.05.05',
    eligibility: '관심과 의지가 있는 모든 학생',
    process: '구글 폼 지원서 제출 후 면접',
    contact: 'insta DM · sejong_finance_association'
  }
};
async function readSettings(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key='app'").first();
  if (!row) return DEFAULT_SETTINGS;
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) }; }
  catch { return DEFAULT_SETTINGS; }
}

/* ---------------- 구글 캘린더 ---------------- */
function calEmbedUrl(env) {
  if (!env.CALENDAR_ID) return null;
  const q = new URLSearchParams();
  q.set('src', env.CALENDAR_ID);
  q.set('ctz', 'Asia/Seoul');
  q.set('mode', 'MONTH');
  q.set('showTitle', '0');
  q.set('showPrint', '0');
  q.set('showCalendars', '0');
  q.set('showTz', '0');
  q.set('showNav', '1');
  q.set('showDate', '1');
  q.set('showTabs', '1');
  q.set('wkst', '1');
  q.set('bgcolor', '#FAF5EE');
  return 'https://calendar.google.com/calendar/embed?' + q.toString();
}

let calCache = { at: 0, data: null };
const CAL_TTL = 60 * 1000;

/* 구글 캘린더 API (API 키) — 지연 없음, 반복 일정도 서버가 전개해서 내려줌 */
async function loadViaApi(env) {
  const calId = env.CALENDAR_ID;
  const timeMin = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  const qs = new URLSearchParams({
    key: env.GOOGLE_API_KEY,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
    timeMin: timeMin,
    timeMax: timeMax
  });
  const url = 'https://www.googleapis.com/calendar/v3/calendars/' +
    encodeURIComponent(calId) + '/events?' + qs.toString();
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    let msg = '캘린더 API 오류 (' + res.status + ')';
    try {
      const j = JSON.parse(body);
      if (j.error && j.error.message) msg += ': ' + j.error.message;
    } catch (e) { /* noop */ }
    throw new Error(msg);
  }
  const data = await res.json();
  const events = (data.items || [])
    .filter(function (it) { return it.status !== 'cancelled' && (it.start); })
    .map(function (it) {
      const allDay = !!(it.start && it.start.date);
      const startRaw = allDay ? it.start.date : it.start.dateTime;
      const endRaw = it.end ? (allDay ? it.end.date : it.end.dateTime) : null;
      return {
        uid: it.id,
        title: it.summary || '(제목 없음)',
        body: it.description || '',
        location: it.location || '',
        start_at: new Date(startRaw).toISOString(),
        end_at: endRaw ? new Date(endRaw).toISOString() : null,
        all_day: allDay,
        source: 'google'
      };
    });
  events.sort(function (a, b) { return a.start_at.localeCompare(b.start_at); });
  return { name: data.summary || '', events: events };
}

async function loadCalendar(env) {
  const src = env.CALENDAR_ICS_URL;
  const useApi = Boolean(env.GOOGLE_API_KEY && env.CALENDAR_ID);
  if (!src && !useApi) {
    return { configured: false, events: [], name: '', link: null,
             calendarId: env.CALENDAR_ID || null, embed: calEmbedUrl(env) };
  }
  if (calCache.data && Date.now() - calCache.at < CAL_TTL) return calCache.data;

  if (useApi) {
    const r = await loadViaApi(env);
    const out = {
      configured: true,
      via: 'api',
      name: r.name,
      link: env.CALENDAR_CID ? 'https://calendar.google.com/calendar/u/0?cid=' + env.CALENDAR_CID : null,
      calendarId: env.CALENDAR_ID || null,
      embed: calEmbedUrl(env),
      events: r.events
    };
    calCache = { at: Date.now(), data: out };
    return out;
  }

  const res = await fetch(src, { cf: { cacheTtl: 60 } });
  if (!res.ok) throw new Error('캘린더를 불러오지 못했습니다. (' + res.status + ')');
  const text = await res.text();
  if (!text.startsWith('BEGIN:VCALENDAR')) {
    throw new Error('캘린더 주소가 올바르지 않습니다. 비공개 iCal 주소인지 확인해 주세요.');
  }
  const start = Date.now() - 60 * 24 * 3600 * 1000;
  const end = Date.now() + 365 * 24 * 3600 * 1000;
  const parsed = parseICS(text, start, end);
  const data = {
    configured: true,
    via: 'ics',
    embed: calEmbedUrl(env),
    name: parsed.name,
    link: env.CALENDAR_CID ? 'https://calendar.google.com/calendar/u/0?cid=' + env.CALENDAR_CID : null,
    calendarId: env.CALENDAR_ID || null,
    events: parsed.events
  };
  calCache = { at: Date.now(), data };
  return data;
}

/* ---------------- 캘린더 자동 반영 ---------------- */
const APP_URL = 'https://hakhoe-on.sejong-finance.workers.dev';

async function noticeParticipants(db, id) {
  const r = await db.prepare(
    'SELECT name FROM notice_members WHERE notice_id=? ORDER BY datetime(created_at)'
  ).bind(id).all();
  return (r.results || []).map(function (x) { return x.name; });
}

/* 공지(모집) → 캘린더 일정 생성·갱신 */
async function syncNotice(env, db, id) {
  if (!calendarWriteReady(env)) return;
  const row = await db.prepare('SELECT * FROM notices WHERE id=?').bind(id).first();
  if (!row) return;

  // 날짜가 없으면 캘린더에 올릴 게 없다 (있던 일정은 지운다)
  if (!row.start_at) {
    if (row.gcal_event_id) {
      await deleteEvent(env, row.gcal_event_id);
      await db.prepare('UPDATE notices SET gcal_event_id=NULL WHERE id=?').bind(id).run();
    }
    return;
  }

  const names = row.signup ? await noticeParticipants(db, id) : [];
  const description = buildDescription({
    body: row.body,
    capacity: row.capacity || 0,
    participants: row.signup ? names : null,
    appUrl: APP_URL
  });
  const payload = {
    summary: row.title,
    description: row.signup ? description : (row.body || ''),
    location: row.location || '',
    start_at: row.start_at,
    minutes: 60
  };

  if (row.gcal_event_id) {
    const res = await updateEvent(env, row.gcal_event_id, payload);
    if (res !== null) return;                       // 정상 갱신
    await db.prepare('UPDATE notices SET gcal_event_id=NULL WHERE id=?').bind(id).run();
  }
  const made = await createEvent(env, payload);
  if (made) await db.prepare('UPDATE notices SET gcal_event_id=? WHERE id=?').bind(made, id).run();
}

/* 일정 / 활동 → 캘린더 */
async function syncRow(env, db, table, id, fields) {
  if (!calendarWriteReady(env)) return;
  const row = await db.prepare('SELECT * FROM ' + table + ' WHERE id=?').bind(id).first();
  if (!row) return;
  const startAt = fields.startAt(row);
  if (!startAt) return;
  const payload = {
    summary: fields.summary(row),
    description: fields.description(row),
    location: row.location || '',
    start_at: startAt,
    minutes: fields.minutes || 60
  };
  if (row.gcal_event_id) {
    const res = await updateEvent(env, row.gcal_event_id, payload);
    if (res !== null) return;
    await db.prepare('UPDATE ' + table + ' SET gcal_event_id=NULL WHERE id=?').bind(id).run();
  }
  const made = await createEvent(env, payload);
  if (made) await db.prepare('UPDATE ' + table + ' SET gcal_event_id=? WHERE id=?').bind(made, id).run();
}

const syncSchedule = (env, db, id) => syncRow(env, db, 'schedules', id, {
  startAt: r => r.start_at,
  summary: r => r.title,
  description: r => (r.body || '') + '\n\n' + APP_URL
});

const syncActivity = (env, db, id) => syncRow(env, db, 'activities', id, {
  startAt: r => r.start_at || (r.activity_date ? r.activity_date + 'T19:00:00+09:00' : null),
  summary: r => '[활동] ' + String(r.content || '').split('\n')[0].slice(0, 60),
  description: r => (r.content || '') +
    '\n\n구분: ' + (r.category || '기타') +
    '\n참여 인원: ' + (r.headcount || 0) + '명' +
    '\n\n' + APP_URL
});

async function dropEvent(env, db, table, id) {
  if (!calendarWriteReady(env)) return;
  const row = await db.prepare('SELECT gcal_event_id FROM ' + table + ' WHERE id=?').bind(id).first();
  if (row && row.gcal_event_id) await deleteEvent(env, row.gcal_event_id);
}

/* ---------------- api ---------------- */
async function handleApi(request, env, url) {
  if (!env.DB) return json({ error: '데이터베이스가 연결되지 않았습니다.' }, 503);
  const db = env.DB;
  await ensureSchema(db);

  const seg = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const method = request.method;
  const body = ['POST', 'PATCH', 'PUT'].includes(method)
    ? await request.json().catch(() => ({}))
    : {};

  /* --- 공개 --- */
  if (url.pathname === '/api/config' && method === 'GET') {
    return json({
      googleClientId: env.GOOGLE_CLIENT_ID || null,
      configured: Boolean(env.GOOGLE_CLIENT_ID && env.SESSION_SECRET),
      translateConfigured: Boolean(env.GOOGLE_TRANSLATE_API_KEY)
    });
  }
  if (url.pathname === '/api/auth/google' && method === 'POST') {
    const identity = body.credential ? await verifyGoogleCredential(body.credential, env) : null;
    if (!identity) return json({ error: '구글 로그인 확인에 실패했습니다.' }, 401);
    const token = await createSession(env, {
      sub: identity.sub, email: identity.email, name: identity.name,
      exp: Date.now() + SESSION_MAX_AGE * 1000
    });
    return json({ ok: true }, 200, {
      'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`
    });
  }
  if (url.pathname === '/api/auth/logout' && method === 'POST') {
    return json({ ok: true }, 200, {
      'Set-Cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
    });
  }

  const user = await resolveUser(request, env, db);

  if (url.pathname === '/api/me' && method === 'GET') {
    let pending = 0;
    if (isAdmin(user)) {
      const r = await db.prepare("SELECT COUNT(*) AS c FROM members WHERE status='pending'").first();
      pending = Number((r && r.c) || 0);
    }
    return json({
      user: { name: user.name, email: user.email, role: user.role, authenticated: user.authenticated },
      calendar_write: calendarWriteReady(env),
      pending_count: pending
    });
  }

  /* --- 로그인 필수 --- */
  if (!user.authenticated) return DENY_GUEST();

  /* --- 운영진 전용: 회원 승인 + 운영진 임명/해제 --- */
  if (url.pathname === '/api/members' && method === 'GET') {
    if (!isAdmin(user)) return DENY_ADMIN();
    const r = await db.prepare(
      `SELECT m.email,m.name,m.status,m.requested_at,m.decided_at,m.decided_by,
              CASE WHEN o.email IS NOT NULL THEN 1 ELSE 0 END AS is_officer
       FROM members m LEFT JOIN officers o ON o.email = m.email
       ORDER BY CASE m.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                datetime(m.requested_at) DESC`
    ).all();
    const bootstrap = adminEmails(env);
    return json({
      members: (r.results || []).map(m => ({
        ...m,
        is_officer: Boolean(m.is_officer),
        bootstrap: bootstrap.has(m.email),
        role: bootstrap.has(m.email) || m.is_officer ? 'admin' : (m.status === 'approved' ? 'member' : m.status)
      }))
    });
  }
  if (seg[1] === 'members' && seg[2] && seg[3] === 'decision' && method === 'POST') {
    if (!isAdmin(user)) return DENY_ADMIN();
    const email = decodeURIComponent(seg[2]).toLowerCase();
    const status = body.status;
    if (!['approved', 'rejected'].includes(status)) {
      return json({ error: '승인 상태를 확인해 주세요.' }, 400);
    }
    const exists = await db.prepare('SELECT email FROM members WHERE email=?').bind(email).first();
    if (exists) {
      await db.prepare('UPDATE members SET status=?,decided_at=?,decided_by=? WHERE email=?')
        .bind(status, now(), user.email, email).run();
    } else {
      await db.prepare(
        'INSERT INTO members(email,name,status,requested_at,decided_at,decided_by) VALUES(?,?,?,?,?,?)'
      ).bind(email, email.split('@')[0], status, now(), now(), user.email).run();
    }
    if (status === 'rejected') await db.prepare('DELETE FROM officers WHERE email=?').bind(email).run();
    return json({ ok: true });
  }
  if (seg[1] === 'members' && seg[2] && seg[3] === 'role' && method === 'POST') {
    if (!isAdmin(user)) return DENY_ADMIN();
    const email = decodeURIComponent(seg[2]).toLowerCase();
    const targetRole = body.role;
    if (!['admin', 'member'].includes(targetRole)) {
      return json({ error: '역할 값을 확인해 주세요.' }, 400);
    }
    if (targetRole === 'admin') {
      const mem = await db.prepare('SELECT status FROM members WHERE email=?').bind(email).first();
      if (!mem || mem.status !== 'approved') {
        return json({ error: '승인된 학회원만 운영진으로 지정할 수 있습니다.' }, 400);
      }
      await db.prepare(
        'INSERT INTO officers(email,granted_by,granted_at) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING'
      ).bind(email, user.email, now()).run();
    } else {
      if (adminEmails(env).has(email)) {
        return json({ error: '코드에 등록된 최초 운영진은 여기서 해제할 수 없습니다.' }, 400);
      }
      if (email === user.email) {
        return json({ error: '본인의 운영진 권한은 스스로 해제할 수 없습니다. 다른 운영진에게 요청해 주세요.' }, 400);
      }
      await db.prepare('DELETE FROM officers WHERE email=?').bind(email).run();
    }
    return json({ ok: true });
  }

  /* --- 승인된 학회원 전용 --- */
  if (!canRead(user)) return DENY_PENDING();

  // 번역 (한→영, 영→한 양방향 동적 번역, D1 캐시)
  if (url.pathname === '/api/translate' && method === 'POST') {
    const texts = Array.isArray(body.texts) ? body.texts.slice(0, 200).map(t => String(t == null ? '' : t)) : [];
    const target = body.target === 'ko' ? 'ko' : 'en';
    if (!texts.length) return json({ translations: [] });
    try {
      const translations = await translateTexts(env, db, texts, target);
      return json({ translations });
    } catch (e) {
      console.error(e);
      return json({ translations: texts }); // 실패해도 원문을 그대로 돌려줘 화면이 깨지지 않게
    }
  }

  // 설정
  if (url.pathname === '/api/settings' && method === 'GET') {
    return json({ settings: await readSettings(db) });
  }
  if (url.pathname === '/api/settings' && method === 'PUT') {
    if (!isAdmin(user)) return DENY_ADMIN();
    const merged = { ...(await readSettings(db)), ...(body.settings || {}) };
    await db.prepare(
      `INSERT INTO settings(key,value,updated_at) VALUES('app',?,?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`
    ).bind(JSON.stringify(merged), now()).run();
    return json({ settings: merged });
  }

  // 공지
  if (url.pathname === '/api/notices' && method === 'GET') {
    const r = await db.prepare(
      `SELECT n.id,n.title,n.body,n.pinned,n.created_at,n.author_id,
              n.signup,n.start_at,n.location,n.capacity,
              COALESCE(u.name,u.email,'운영진') AS author_name,
              (SELECT COUNT(*) FROM notice_members m WHERE m.notice_id=n.id) AS joined_count,
              (SELECT COUNT(*) FROM notice_members m WHERE m.notice_id=n.id AND m.user_id=?) AS joined
       FROM notices n LEFT JOIN users u ON u.id=n.author_id
       ORDER BY n.pinned DESC, datetime(n.created_at) DESC`
    ).bind(user.id).all();
    const rows = r.results || [];
    const withSignup = rows.filter(function (x) { return x.signup; }).map(function (x) { return x.id; });
    const nameMap = {};
    if (withSignup.length) {
      const placeholders = withSignup.map(function () { return '?'; }).join(',');
      const stmt = db.prepare(
        'SELECT notice_id,name FROM notice_members WHERE notice_id IN (' + placeholders +
        ') ORDER BY datetime(created_at)'
      );
      const mem = await stmt.bind(...withSignup).all();
      (mem.results || []).forEach(function (m) {
        (nameMap[m.notice_id] = nameMap[m.notice_id] || []).push(m.name);
      });
    }
    return json({
      notices: rows.map(function (x) {
        return Object.assign({}, x, {
          signup: Number(x.signup || 0) === 1,
          joined: Number(x.joined || 0) > 0,
          joined_count: Number(x.joined_count || 0),
          participants: nameMap[x.id] || []
        });
      })
    });
  }
  if (url.pathname === '/api/notices' && method === 'POST') {
    if (!isAdmin(user)) return DENY_ADMIN();
    const title = str(body.title, 100), content = str(body.body, 3000);
    if (!title || !content) return json({ error: '공지 제목과 내용을 확인해 주세요.' }, 400);
    const signup = body.signup ? 1 : 0;
    const startAt = body.start_at ? new Date(body.start_at) : null;
    if (startAt && Number.isNaN(startAt.getTime())) return json({ error: '일시를 확인해 주세요.' }, 400);
    const capacity = Math.max(0, Math.min(999, Number(body.capacity) || 0));
    const created = now();
    const r = await db.prepare(
      `INSERT INTO notices(title,body,pinned,signup,start_at,location,capacity,author_id,created_at)
       VALUES(?,?,?,?,?,?,?,?,?)`
    ).bind(title, content, body.pinned ? 1 : 0, signup,
           startAt ? startAt.toISOString() : null, str(body.location, 100) || null,
           capacity, user.id, created).run();
    const newId = r.meta.last_row_id;
    try { await syncNotice(env, db, newId); } catch (e) { console.error(e); }
    return json({ notice: { id: newId, title, body: content } }, 201);
  }
  if (seg[1] === 'notices' && seg[2] && method === 'PATCH') {
    if (!isAdmin(user)) return DENY_ADMIN();
    const id = Number(seg[2]);
    const chk = await editable(db, 'notices', id, user);
    if (chk.error) return chk.error;
    const title = str(body.title, 100), content = str(body.body, 3000);
    if (!title || !content) return json({ error: '공지 제목과 내용을 확인해 주세요.' }, 400);
    const startAt = body.start_at ? new Date(body.start_at) : null;
    if (startAt && Number.isNaN(startAt.getTime())) return json({ error: '일시를 확인해 주세요.' }, 400);
    await db.prepare(
      'UPDATE notices SET title=?,body=?,pinned=?,signup=?,start_at=?,location=?,capacity=? WHERE id=?'
    ).bind(title, content, body.pinned ? 1 : 0, body.signup ? 1 : 0,
           startAt ? startAt.toISOString() : null, str(body.location, 100) || null,
           Math.max(0, Math.min(999, Number(body.capacity) || 0)), id).run();
    try { await syncNotice(env, db, id); } catch (e) { console.error(e); }
    return json({ ok: true });
  }
  if (seg[1] === 'notices' && seg[2] && method === 'DELETE') {
    const id = Number(seg[2]);
    try { await dropEvent(env, db, 'notices', id); } catch (e) { console.error(e); }
    const res = await removeIfAllowed(db, 'notices', id, user);
    if (res.status === 200) {
      await db.prepare('DELETE FROM notice_members WHERE notice_id=?').bind(id).run();
    }
    return res;
  }

  /* 참여 신청 토글 */
  if (seg[1] === 'notices' && seg[2] && seg[3] === 'join' && method === 'POST') {
    const id = Number(seg[2]);
    const row = await db.prepare('SELECT id,signup,capacity FROM notices WHERE id=?').bind(id).first();
    if (!row) return json({ error: '공지를 찾을 수 없습니다.' }, 404);
    if (!row.signup) return json({ error: '참여 신청을 받지 않는 공지입니다.' }, 400);

    const mine = await db.prepare('SELECT 1 AS x FROM notice_members WHERE notice_id=? AND user_id=?')
      .bind(id, user.id).first();
    if (mine) {
      await db.prepare('DELETE FROM notice_members WHERE notice_id=? AND user_id=?')
        .bind(id, user.id).run();
    } else {
      if (row.capacity) {
        const c = await db.prepare('SELECT COUNT(*) AS c FROM notice_members WHERE notice_id=?')
          .bind(id).first();
        if (Number((c && c.c) || 0) >= row.capacity) {
          return json({ error: '정원이 모두 찼습니다.' }, 409);
        }
      }
      await db.prepare(
        'INSERT OR IGNORE INTO notice_members(notice_id,user_id,name,created_at) VALUES(?,?,?,?)'
      ).bind(id, user.id, user.name, now()).run();
    }
    try { await syncNotice(env, db, id); } catch (e) { console.error(e); }
    const names = await noticeParticipants(db, id);
    return json({ joined: !mine, joined_count: names.length, participants: names });
  }

  // 구글 캘린더
  if (url.pathname === '/api/calendar' && method === 'GET') {
    try {
      const data = await loadCalendar(env);
      return json(data);
    } catch (err) {
      return json({ configured: true, error: err.message, events: [] });
    }
  }

  // 일정
  if (url.pathname === '/api/schedules' && method === 'GET') {
    const r = await db.prepare(
      `SELECT s.id,s.title,s.body,s.start_at,s.location,s.created_at,s.author_id,
              COALESCE(u.name,u.email,'운영진') AS author_name
       FROM schedules s LEFT JOIN users u ON u.id=s.author_id
       ORDER BY datetime(s.start_at) ASC`
    ).all();
    return json({ schedules: r.results || [] });
  }
  if (url.pathname === '/api/schedules' && method === 'POST') {
    const title = str(body.title, 100), content = str(body.body, 2000);
    const location = str(body.location, 100);
    const start = new Date(body.start_at);
    if (!title || !content || Number.isNaN(start.getTime())) {
      return json({ error: '일정 제목, 내용, 날짜를 확인해 주세요.' }, 400);
    }
    const created = now();
    const r = await db.prepare(
      'INSERT INTO schedules(title,body,start_at,location,author_id,created_at) VALUES(?,?,?,?,?,?)'
    ).bind(title, content, start.toISOString(), location || null, user.id, created).run();
    try { await syncSchedule(env, db, r.meta.last_row_id); } catch (e) { console.error(e); }
    return json({
      schedule: {
        id: r.meta.last_row_id, title, body: content, start_at: start.toISOString(),
        location: location || null, created_at: created, author_id: user.id, author_name: user.name
      }
    }, 201);
  }
  if (seg[1] === 'schedules' && seg[2] && method === 'PATCH') {
    const id = Number(seg[2]);
    const chk = await editable(db, 'schedules', id, user);
    if (chk.error) return chk.error;
    const title = str(body.title, 100), content = str(body.body, 2000);
    const location = str(body.location, 100);
    const start = new Date(body.start_at);
    if (!title || !content || Number.isNaN(start.getTime())) {
      return json({ error: '일정 제목, 내용, 날짜를 확인해 주세요.' }, 400);
    }
    await db.prepare('UPDATE schedules SET title=?,body=?,start_at=?,location=? WHERE id=?')
      .bind(title, content, start.toISOString(), location || null, id).run();
    try { await syncSchedule(env, db, id); } catch (e) { console.error(e); }
    return json({ ok: true });
  }
  if (seg[1] === 'schedules' && seg[2] && method === 'DELETE') {
    const id = Number(seg[2]);
    try { await dropEvent(env, db, 'schedules', id); } catch (e) { console.error(e); }
    return removeIfAllowed(db, 'schedules', id, user);
  }

  // 활동 기록
  if (url.pathname === '/api/activities' && method === 'GET') {
    const r = await db.prepare(
      `SELECT a.id,a.content,a.category,a.activity_date,a.headcount,a.created_at,a.author_id,
              COALESCE(u.name,u.email,'참여자') AS author_name
       FROM activities a LEFT JOIN users u ON u.id=a.author_id
       ORDER BY date(a.activity_date) DESC, datetime(a.created_at) DESC`
    ).all();
    return json({ activities: r.results || [] });
  }
  if (url.pathname === '/api/activities' && method === 'POST') {
    const content = str(body.content, 3000);
    const category = str(body.category, 20) || '기타';
    const date = str(body.activity_date, 10);
    const headcount = Number(body.headcount);
    if (!content || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isInteger(headcount) || headcount < 1 || headcount > 999) {
      return json({ error: '활동 내용, 날짜와 인원을 확인해 주세요.' }, 400);
    }
    const created = now();
    const r = await db.prepare(
      'INSERT INTO activities(content,category,activity_date,headcount,author_id,created_at) VALUES(?,?,?,?,?,?)'
    ).bind(content, category, date, headcount, user.id, created).run();
    try { await syncActivity(env, db, r.meta.last_row_id); } catch (e) { console.error(e); }
    return json({
      activity: {
        id: r.meta.last_row_id, content, category, activity_date: date, headcount,
        created_at: created, author_id: user.id, author_name: user.name
      }
    }, 201);
  }
  if (seg[1] === 'activities' && seg[2] && method === 'PATCH') {
    const id = Number(seg[2]);
    const chk = await editable(db, 'activities', id, user);
    if (chk.error) return chk.error;
    const content = str(body.content, 3000);
    const category = str(body.category, 20) || '기타';
    const date = str(body.activity_date, 10);
    const headcount = Number(body.headcount);
    if (!content || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isInteger(headcount) || headcount < 1 || headcount > 999) {
      return json({ error: '활동 내용, 날짜와 인원을 확인해 주세요.' }, 400);
    }
    await db.prepare('UPDATE activities SET content=?,category=?,activity_date=?,headcount=? WHERE id=?')
      .bind(content, category, date, headcount, id).run();
    try { await syncActivity(env, db, id); } catch (e) { console.error(e); }
    return json({ ok: true });
  }
  if (seg[1] === 'activities' && seg[2] && method === 'DELETE') {
    const id = Number(seg[2]);
    try { await dropEvent(env, db, 'activities', id); } catch (e) { console.error(e); }
    return removeIfAllowed(db, 'activities', id, user);
  }

  // 자료실
  if (url.pathname === '/api/materials' && method === 'GET') {
    const r = await db.prepare(
      `SELECT m.id,m.name,m.url,m.tags,m.created_at,m.author_id,
              COALESCE(u.name,u.email,'참여자') AS author_name
       FROM materials m LEFT JOIN users u ON u.id=m.author_id
       ORDER BY datetime(m.created_at) DESC`
    ).all();
    return json({
      materials: (r.results || []).map(m => ({
        ...m, tags: m.tags ? m.tags.split(',').filter(Boolean) : []
      }))
    });
  }
  if (url.pathname === '/api/materials' && method === 'POST') {
    const name = str(body.name, 120), link = str(body.url, 500);
    if (!name || !/^https?:\/\//i.test(link)) {
      return json({ error: '자료 이름과 http(s) 링크를 확인해 주세요.' }, 400);
    }
    const tags = (Array.isArray(body.tags) ? body.tags : [])
      .map(t => str(t, 20)).filter(Boolean).slice(0, 10);
    const created = now();
    const r = await db.prepare(
      'INSERT INTO materials(name,url,tags,author_id,created_at) VALUES(?,?,?,?,?)'
    ).bind(name, link, tags.join(','), user.id, created).run();
    return json({
      material: {
        id: r.meta.last_row_id, name, url: link, tags,
        created_at: created, author_id: user.id, author_name: user.name
      }
    }, 201);
  }
  if (seg[1] === 'materials' && seg[2] && method === 'PATCH') {
    const id = Number(seg[2]);
    const chk = await editable(db, 'materials', id, user);
    if (chk.error) return chk.error;
    const name = str(body.name, 120), link = str(body.url, 500);
    if (!name || !/^https?:\/\//i.test(link)) {
      return json({ error: '자료 이름과 http(s) 링크를 확인해 주세요.' }, 400);
    }
    const tags = (Array.isArray(body.tags) ? body.tags : [])
      .map(t => str(t, 20)).filter(Boolean).slice(0, 10);
    await db.prepare('UPDATE materials SET name=?,url=?,tags=? WHERE id=?')
      .bind(name, link, tags.join(','), id).run();
    return json({ ok: true });
  }
  if (seg[1] === 'materials' && seg[2] && method === 'DELETE') {
    return removeIfAllowed(db, 'materials', Number(seg[2]), user);
  }

  // 건의 게시판
  if (url.pathname === '/api/ideas' && method === 'GET') {
    const r = await db.prepare(
      `SELECT i.id,i.title,i.body,i.status,i.created_at,i.author_id,
              COALESCE(u.name,u.email,'학회원') AS author_name,
              (SELECT COUNT(*) FROM idea_likes l WHERE l.idea_id=i.id) AS like_count,
              (SELECT COUNT(*) FROM idea_likes l WHERE l.idea_id=i.id AND l.user_id=?) AS liked,
              (SELECT COUNT(*) FROM idea_replies p WHERE p.idea_id=i.id) AS reply_count
       FROM ideas i LEFT JOIN users u ON u.id=i.author_id
       ORDER BY datetime(i.created_at) DESC`
    ).bind(user.id).all();
    return json({
      ideas: (r.results || []).map(i => ({
        ...i,
        like_count: Number(i.like_count || 0),
        reply_count: Number(i.reply_count || 0),
        liked: Number(i.liked || 0) > 0
      }))
    });
  }
  if (url.pathname === '/api/ideas' && method === 'POST') {
    const title = str(body.title, 100), content = str(body.body, 3000);
    if (!title || !content) return json({ error: '제목과 내용을 확인해 주세요.' }, 400);
    const created = now();
    const r = await db.prepare(
      "INSERT INTO ideas(title,body,status,author_id,created_at) VALUES(?,?,'open',?,?)"
    ).bind(title, content, user.id, created).run();
    return json({ idea: { id: r.meta.last_row_id, title, body: content, status: 'open',
      created_at: created, author_id: user.id, author_name: user.name } }, 201);
  }
  if (seg[1] === 'ideas' && seg[2] && seg[3] === 'like' && method === 'POST') {
    const id = Number(seg[2]);
    const has = await db.prepare('SELECT 1 AS x FROM idea_likes WHERE idea_id=? AND user_id=?')
      .bind(id, user.id).first();
    if (has) await db.prepare('DELETE FROM idea_likes WHERE idea_id=? AND user_id=?').bind(id, user.id).run();
    else await db.prepare('INSERT OR IGNORE INTO idea_likes(idea_id,user_id,created_at) VALUES(?,?,?)')
      .bind(id, user.id, now()).run();
    const c = await db.prepare('SELECT COUNT(*) AS c FROM idea_likes WHERE idea_id=?').bind(id).first();
    return json({ like_count: Number((c && c.c) || 0), liked: !has });
  }
  if (seg[1] === 'ideas' && seg[2] && seg[3] === 'status' && method === 'POST') {
    if (!isAdmin(user)) return DENY_ADMIN();
    const status = str(body.status, 12);
    if (!['open', 'reviewing', 'done', 'closed'].includes(status)) {
      return json({ error: '상태 값을 확인해 주세요.' }, 400);
    }
    await db.prepare('UPDATE ideas SET status=? WHERE id=?').bind(status, Number(seg[2])).run();
    return json({ ok: true });
  }
  if (seg[1] === 'ideas' && seg[2] && seg[3] === 'replies' && method === 'GET') {
    const r = await db.prepare(
      `SELECT p.id,p.body,p.created_at,p.user_id,
              COALESCE(u.name,u.email,'학회원') AS author_name
       FROM idea_replies p LEFT JOIN users u ON u.id=p.user_id
       WHERE p.idea_id=? ORDER BY datetime(p.created_at) ASC`
    ).bind(Number(seg[2])).all();
    return json({ replies: r.results || [] });
  }
  if (seg[1] === 'ideas' && seg[2] && seg[3] === 'replies' && method === 'POST') {
    const text = str(body.body, 500);
    if (!text) return json({ error: '답변 내용을 입력해 주세요.' }, 400);
    const created = now();
    const r = await db.prepare(
      'INSERT INTO idea_replies(idea_id,user_id,body,created_at) VALUES(?,?,?,?)'
    ).bind(Number(seg[2]), user.id, text, created).run();
    return json({ reply: { id: r.meta.last_row_id, body: text, created_at: created,
      user_id: user.id, author_name: user.name } }, 201);
  }
  if (seg[1] === 'ideas' && seg[2] && method === 'PATCH') {
    const id = Number(seg[2]);
    const chk = await editable(db, 'ideas', id, user);
    if (chk.error) return chk.error;
    const title = str(body.title, 100), content = str(body.body, 3000);
    if (!title || !content) return json({ error: '제목과 내용을 확인해 주세요.' }, 400);
    await db.prepare('UPDATE ideas SET title=?,body=? WHERE id=?').bind(title, content, id).run();
    return json({ ok: true });
  }
  if (seg[1] === 'ideas' && seg[2] && method === 'DELETE') {
    const id = Number(seg[2]);
    const res = await removeIfAllowed(db, 'ideas', id, user);
    if (res.status === 200) {
      await db.batch([
        db.prepare('DELETE FROM idea_likes WHERE idea_id=?').bind(id),
        db.prepare('DELETE FROM idea_replies WHERE idea_id=?').bind(id)
      ]);
    }
    return res;
  }

  // 투표
  if (url.pathname === '/api/votes' && method === 'GET') {
    return json({ polls: await listPolls(db, user) });
  }
  if (url.pathname === '/api/votes' && method === 'POST') {
    if (!isAdmin(user)) return DENY_ADMIN();
    const title = str(body.title, 80), content = str(body.content, 1000);
    const deadline = new Date(body.deadline);
    const options = (Array.isArray(body.options) ? body.options : [])
      .map(v => str(v, 60)).filter(Boolean);
    if (!title || !content || Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
      return json({ error: '안건과 종료 기한을 확인해 주세요.' }, 400);
    }
    if (options.length < 2 || options.length > 10 ||
        new Set(options.map(v => v.toLocaleLowerCase('ko-KR'))).size !== options.length) {
      return json({ error: '서로 다른 선택지를 2–10개 입력해 주세요.' }, 400);
    }
    const r = await db.prepare(
      'INSERT INTO polls(title,content,deadline,multi,author_id,created_at) VALUES(?,?,?,?,?,?)'
    ).bind(title, content, deadline.toISOString(), body.multi ? 1 : 0, user.id, now()).run();
    const pollId = r.meta.last_row_id;
    await db.batch(options.map((label, i) =>
      db.prepare('INSERT INTO poll_options(poll_id,label,position) VALUES(?,?,?)').bind(pollId, label, i)
    ));
    const poll = (await listPolls(db, user)).find(p => p.id === pollId);
    return json({ poll }, 201);
  }
  if (seg[1] === 'votes' && seg[2] && method === 'PATCH') {
    if (!isAdmin(user)) return DENY_ADMIN();
    const id = Number(seg[2]);
    const chk = await editable(db, 'polls', id, user);
    if (chk.error) return chk.error;
    const title = str(body.title, 80), content = str(body.content, 1000);
    const deadline = new Date(body.deadline);
    if (!title || !content || Number.isNaN(deadline.getTime())) {
      return json({ error: '안건과 종료 기한을 확인해 주세요.' }, 400);
    }
    await db.prepare('UPDATE polls SET title=?,content=?,deadline=? WHERE id=?')
      .bind(title, content, deadline.toISOString(), id).run();
    return json({ ok: true });
  }
  if (seg[1] === 'votes' && seg[2] && method === 'DELETE') {
    return removeIfAllowed(db, 'polls', Number(seg[2]), user);
  }

  if (seg[1] === 'votes' && seg[2]) {
    const pollId = Number(seg[2]);
    if (!Number.isInteger(pollId)) return json({ error: '투표를 찾을 수 없습니다.' }, 404);
    const poll = await db.prepare('SELECT * FROM polls WHERE id=?').bind(pollId).first();
    if (!poll) return json({ error: '투표를 찾을 수 없습니다.' }, 404);

    if (seg[3] === 'cast' && method === 'POST') {
      if (new Date(poll.deadline) <= new Date()) return json({ error: '종료된 투표입니다.' }, 409);
      const optionId = Number(body.option_id);
      const opt = await db.prepare('SELECT id FROM poll_options WHERE id=? AND poll_id=?')
        .bind(optionId, pollId).first();
      if (!opt) return json({ error: '선택지를 확인해 주세요.' }, 400);
      const picked = await db.prepare(
        'SELECT id FROM poll_ballots WHERE poll_id=? AND user_id=? AND option_id=?'
      ).bind(pollId, user.id, optionId).first();

      if (picked) {
        // 이미 고른 항목 → 선택 해제
        await db.prepare('DELETE FROM poll_ballots WHERE poll_id=? AND user_id=? AND option_id=?')
          .bind(pollId, user.id, optionId).run();
      } else {
        // 단일선택 투표면 기존 선택을 먼저 비운다
        if (!Number(poll.multi)) {
          await db.prepare('DELETE FROM poll_ballots WHERE poll_id=? AND user_id=?')
            .bind(pollId, user.id).run();
        }
        await db.prepare(
          'INSERT OR IGNORE INTO poll_ballots(poll_id,option_id,user_id,created_at) VALUES(?,?,?,?)'
        ).bind(pollId, optionId, user.id, now()).run();
      }
      return json({ poll: (await listPolls(db, user)).find(p => p.id === pollId) });
    }

    if (seg[3] === 'comments' && method === 'GET') {
      const r = await db.prepare(
        `SELECT c.id,c.option_id,c.body,c.created_at,
                COALESCE(u.name,u.email,'참여자') AS author_name, o.label AS option_label
         FROM poll_discussions c
         LEFT JOIN users u ON u.id=c.user_id
         LEFT JOIN poll_options o ON o.id=c.option_id
         WHERE c.poll_id=? ORDER BY datetime(c.created_at) ASC`
      ).bind(pollId).all();
      return json({ comments: r.results || [] });
    }
    if (seg[3] === 'comments' && method === 'POST') {
      if (new Date(poll.deadline) <= new Date()) {
        return json({ error: '종료된 투표에는 의견을 남길 수 없습니다.' }, 409);
      }
      const text = str(body.body, 500);
      const optionId = body.option_id == null || body.option_id === '' ? null : Number(body.option_id);
      if (!text) return json({ error: '의견 내용을 입력해 주세요.' }, 400);
      if (optionId !== null) {
        const opt = await db.prepare('SELECT id FROM poll_options WHERE id=? AND poll_id=?')
          .bind(optionId, pollId).first();
        if (!opt) return json({ error: '의견 선택지를 확인해 주세요.' }, 400);
      }
      const created = now();
      const r = await db.prepare(
        'INSERT INTO poll_discussions(poll_id,option_id,user_id,body,created_at) VALUES(?,?,?,?,?)'
      ).bind(pollId, optionId, user.id, text, created).run();
      const label = optionId === null ? null
        : (await db.prepare('SELECT label FROM poll_options WHERE id=?').bind(optionId).first() || {}).label;
      return json({
        comment: {
          id: r.meta.last_row_id, option_id: optionId, option_label: label,
          body: text, created_at: created, author_name: user.name
        }
      }, 201);
    }
  }

  return json({ error: '요청을 찾을 수 없습니다.' }, 404);
}

/* 정적 자산(ASSETS 바인딩)이 바이너리 파일에 Range 요청을 지원하지 않아서
 * (텍스트 자산은 지원, 이미지/영상 같은 바이너리는 항상 200 전체 응답만 옴)
 * <video> 태그가 로드를 포기하는 문제가 있어 여기서 직접 처리한다. */
async function serveRangeable(request, env) {
  const u = new URL(request.url);
  const assetRes = await env.ASSETS.fetch(new Request(u.origin + u.pathname, { headers: { Accept: request.headers.get('Accept') || '*/*' } }));
  if (!assetRes.ok) return assetRes;
  const buf = await assetRes.arrayBuffer();
  const total = buf.byteLength;
  const headers = new Headers(assetRes.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.delete('Content-Length');

  const range = request.headers.get('Range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!m) {
    headers.set('Content-Length', String(total));
    return new Response(buf, { status: 200, headers });
  }
  let start = m[1] ? parseInt(m[1], 10) : 0;
  let end = m[2] ? parseInt(m[2], 10) : total - 1;
  if (isNaN(start) || start < 0) start = 0;
  if (isNaN(end) || end >= total) end = total - 1;
  if (start > end || start >= total) {
    headers.set('Content-Range', `bytes */${total}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(buf.slice(start, end + 1), { status: 206, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        console.error(error);
        return json({ error: '요청을 처리하는 중 문제가 생겼습니다.' }, 500);
      }
    }
    if (url.pathname.startsWith('/video/') && env.ASSETS && env.ASSETS.fetch) {
      return serveRangeable(request, env);
    }
    if (env.ASSETS && env.ASSETS.fetch) return env.ASSETS.fetch(request);
    return new Response('Not found', {
      status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
};
