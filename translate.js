/* 양방향 번역 — 구글 번역 API(v2, API 키) + D1 캐시.
 * target='en' : 한국어 문장만 번역, 이미 영어인 문장은 그대로.
 * target='ko' : 영어(비한글) 문장만 번역, 이미 한글인 문장은 그대로.
 * 숫자/이름 같은 짧은 문자열은 두 방향 다 건드리지 않는다. */

const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;
const LATIN_WORDish = /[a-zA-Z]{3,}/;

export function hasHangul(text) {
  return HANGUL.test(String(text || ''));
}

function needsTranslation(text, target) {
  const t = String(text || '').trim();
  if (!t) return false;
  if (target === 'ko') {
    // 이미 한글이 섞여 있으면 번역할 필요 없음. 영문 알파벳이 충분히 있어야 "영어 글"로 간주.
    return !hasHangul(t) && LATIN_WORDish.test(t);
  }
  // target === 'en'
  return hasHangul(t);
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function callGoogleTranslate(env, texts, target) {
  const url = 'https://translation.googleapis.com/language/translate/v2?key=' +
    encodeURIComponent(env.GOOGLE_TRANSLATE_API_KEY);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // source 는 생략 — 구글이 원문 언어를 자동 감지 (한↔영 양방향에 동일 코드로 대응)
    body: JSON.stringify({ q: texts, target: target, format: 'text' })
  });
  if (!res.ok) {
    const body = await res.text();
    let msg = '번역 API 오류 (' + res.status + ')';
    try {
      const j = JSON.parse(body);
      if (j.error && j.error.message) msg += ': ' + j.error.message;
    } catch (e) { /* noop */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return (data.data && data.data.translations || []).map(t =>
    String(t.translatedText || '')
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  );
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * texts: string[], target: 'en' | 'ko' → 같은 길이의 번역된 string[] 반환.
 * 번역이 필요 없는 항목(이미 목표 언어)은 원문 그대로, 실패한 항목도 원문 그대로 돌려준다.
 */
export async function translateTexts(env, db, texts, target) {
  target = target === 'ko' ? 'ko' : 'en';
  const out = new Array(texts.length);
  const need = []; // { index, text, hash }

  for (let i = 0; i < texts.length; i++) {
    const t = String(texts[i] || '');
    if (!needsTranslation(t, target)) { out[i] = t; continue; }
    need.push({ index: i, text: t });
  }
  if (!need.length) return out;

  if (!env.GOOGLE_TRANSLATE_API_KEY) {
    need.forEach(n => { out[n.index] = n.text; });
    return out;
  }

  for (const n of need) n.hash = await sha256Hex(target + '|' + n.text);

  const placeholders = need.map(() => '?').join(',');
  const cached = await db.prepare(
    'SELECT hash,translated_text FROM translations WHERE hash IN (' + placeholders + ')'
  ).bind(...need.map(n => n.hash)).all();
  const cacheMap = {};
  (cached.results || []).forEach(r => { cacheMap[r.hash] = r.translated_text; });

  const misses = need.filter(n => cacheMap[n.hash] === undefined);
  need.forEach(n => { if (cacheMap[n.hash] !== undefined) out[n.index] = cacheMap[n.hash]; });

  if (misses.length) {
    const now = new Date().toISOString();
    for (const group of chunk(misses, 50)) {
      let translated;
      try {
        translated = await callGoogleTranslate(env, group.map(g => g.text), target);
      } catch (e) {
        console.error(e);
        group.forEach(g => { out[g.index] = g.text; }); // 실패 시 원문 유지
        continue;
      }
      const inserts = [];
      group.forEach((g, i) => {
        const tr = translated[i] || g.text;
        out[g.index] = tr;
        inserts.push(db.prepare(
          `INSERT INTO translations(hash,source_text,translated_text,created_at) VALUES(?,?,?,?)
           ON CONFLICT(hash) DO UPDATE SET translated_text=excluded.translated_text`
        ).bind(g.hash, g.text, tr, now));
      });
      if (inserts.length) await db.batch(inserts);
    }
  }

  return out;
}
