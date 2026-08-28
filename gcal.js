/* 구글 캘린더 쓰기 — 서비스 계정(JWT RS256)으로 액세스 토큰을 받아 이벤트를 만들고 고친다.
 * GOOGLE_SERVICE_ACCOUNT_JSON 시크릿이 없으면 모든 함수가 조용히 null 을 돌려주고,
 * 앱은 캘린더 동기화 없이 그대로 동작한다. */

const SCOPE = 'https://www.googleapis.com/auth/calendar';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let tokenCache = { at: 0, token: null };

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToBytes(pem) {
  const body = String(pem)
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function calendarWriteReady(env) {
  return Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON && env.CALENDAR_ID);
}

async function accessToken(env) {
  if (!calendarWriteReady(env)) return null;
  if (tokenCache.token && Date.now() - tokenCache.at < 45 * 60 * 1000) return tokenCache.token;

  const account = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const iat = Math.floor(Date.now() / 1000);
  const claim = {
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: iat,
    exp: iat + 3000
  };
  const enc = o => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc(claim);

  const key = await crypto.subtle.importKey(
    'pkcs8', pemToBytes(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)
  );
  const jwt = unsigned + '.' + b64url(new Uint8Array(sig));

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt)
  });
  if (!res.ok) throw new Error('구글 캘린더 인증에 실패했습니다. (' + res.status + ')');
  const data = await res.json();
  tokenCache = { at: Date.now(), token: data.access_token };
  return data.access_token;
}

async function callApi(env, path, method, body) {
  const token = await accessToken(env);
  if (!token) return null;
  const url = 'https://www.googleapis.com/calendar/v3/calendars/' +
    encodeURIComponent(env.CALENDAR_ID) + path;
  const res = await fetch(url, {
    method: method,
    headers: {
      Authorization: 'Bearer ' + token,
      'content-type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 404 || res.status === 410) return null; // 이미 지워진 일정
  if (!res.ok) {
    const text = await res.text();
    let msg = '캘린더 쓰기 실패 (' + res.status + ')';
    try {
      const j = JSON.parse(text);
      if (j.error && j.error.message) msg += ': ' + j.error.message;
    } catch (e) { /* noop */ }
    throw new Error(msg);
  }
  return res.status === 204 ? {} : res.json();
}

/* 시작 시각과 종료 시각을 구글이 받는 형태로 */
function timeFields(startISO, minutes) {
  const start = new Date(startISO);
  const end = new Date(start.getTime() + (minutes || 60) * 60000);
  return {
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Seoul' },
    end: { dateTime: end.toISOString(), timeZone: 'Asia/Seoul' }
  };
}

export function buildDescription(opts) {
  const lines = [];
  if (opts.body) lines.push(opts.body, '');
  if (opts.kind) lines.push('구분: ' + opts.kind);
  if (opts.capacity) lines.push('정원: ' + opts.capacity + '명');
  if (opts.deadline) {
    lines.push('신청 마감: ' + new Date(opts.deadline).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
  }
  const names = opts.participants || [];
  lines.push('');
  lines.push('참여자 ' + names.length + '명' + (opts.capacity ? ' / ' + opts.capacity : ''));
  lines.push(names.length ? names.join(', ') : '(아직 없음)');
  if (opts.appUrl) {
    lines.push('');
    lines.push('신청·확인: ' + opts.appUrl);
  }
  return lines.join('\n');
}

export async function createEvent(env, opts) {
  if (!calendarWriteReady(env) || !opts.start_at) return null;
  const ev = Object.assign({
    summary: opts.summary,
    description: opts.description || '',
    location: opts.location || ''
  }, timeFields(opts.start_at, opts.minutes));
  const made = await callApi(env, '/events', 'POST', ev);
  return made && made.id ? made.id : null;
}

export async function updateEvent(env, eventId, opts) {
  if (!calendarWriteReady(env) || !eventId) return null;
  const patch = {};
  if (opts.summary != null) patch.summary = opts.summary;
  if (opts.description != null) patch.description = opts.description;
  if (opts.location != null) patch.location = opts.location;
  if (opts.start_at) Object.assign(patch, timeFields(opts.start_at, opts.minutes));
  return callApi(env, '/events/' + encodeURIComponent(eventId), 'PATCH', patch);
}

export async function deleteEvent(env, eventId) {
  if (!calendarWriteReady(env) || !eventId) return null;
  return callApi(env, '/events/' + encodeURIComponent(eventId), 'DELETE', null);
}
