/* 구글 캘린더 ICS 파서 — 반복 일정(RRULE) 포함, 외부 의존성 없음 */

function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeText(v) {
  return String(v || "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function tzOffsetMs(utcMs, tz) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const map = {};
    for (const p of dtf.formatToParts(new Date(utcMs))) map[p.type] = p.value;
    const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day,
      (+map.hour) % 24, +map.minute, +map.second);
    return asUTC - utcMs;
  } catch (e) { return 0; }
}

function zonedToUTC(y, mo, d, h, mi, s, tz) {
  const naive = Date.UTC(y, mo - 1, d, h, mi, s);
  let ms = naive;
  for (let i = 0; i < 3; i++) ms = naive - tzOffsetMs(ms, tz);
  return ms;
}

function parseDT(params, value, defaultTz) {
  const isDate = (params.VALUE === "DATE") || /^\d{8}$/.test(value);
  const y = +value.slice(0, 4), mo = +value.slice(4, 6), d = +value.slice(6, 8);
  if (isDate) return { ms: Date.UTC(y, mo - 1, d), allDay: true };
  const h = +value.slice(9, 11), mi = +value.slice(11, 13), s = +value.slice(13, 15) || 0;
  if (value.endsWith("Z")) return { ms: Date.UTC(y, mo - 1, d, h, mi, s), allDay: false };
  const tz = params.TZID || defaultTz || "UTC";
  return { ms: zonedToUTC(y, mo, d, h, mi, s, tz), allDay: false };
}

function parseLine(line) {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const left = line.slice(0, colon), value = line.slice(colon + 1);
  const bits = left.split(";");
  const name = bits[0].toUpperCase();
  const params = {};
  for (let i = 1; i < bits.length; i++) {
    const eq = bits[i].indexOf("=");
    if (eq > 0) params[bits[i].slice(0, eq).toUpperCase()] = bits[i].slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name, params: params, value: value };
}

const DAYNUM = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const DAY_MS = 86400000;

function expandRule(startMs, rule, windowStart, windowEnd, tz, exdates) {
  const out = [];
  const freq = rule.FREQ;
  if (!freq) return [startMs];
  const interval = Math.max(1, parseInt(rule.INTERVAL || "1", 10));
  const count = rule.COUNT ? parseInt(rule.COUNT, 10) : null;
  let until = null;
  if (rule.UNTIL) {
    const u = rule.UNTIL;
    until = u.endsWith("Z")
      ? Date.UTC(+u.slice(0, 4), +u.slice(4, 6) - 1, +u.slice(6, 8),
          +u.slice(9, 11) || 0, +u.slice(11, 13) || 0, +u.slice(13, 15) || 0)
      : zonedToUTC(+u.slice(0, 4), +u.slice(4, 6), +u.slice(6, 8),
          +u.slice(9, 11) || 0, +u.slice(11, 13) || 0, +u.slice(13, 15) || 0, tz);
  }
  const byday = rule.BYDAY
    ? rule.BYDAY.split(",").map(function (s) { return s.replace(/^[-+]?\d+/, ""); })
    : null;

  const base = new Date(startMs);
  const hh = base.getUTCHours(), mm = base.getUTCMinutes(), ss = base.getUTCSeconds();
  let produced = 0;
  const LIMIT = 2000;

  const push = function (ms) {
    if (until !== null && ms > until) return false;
    if (count !== null && produced >= count) return false;
    produced++;
    if (ms >= windowStart && ms <= windowEnd && !exdates.has(ms)) out.push(ms);
    return true;
  };

  if (freq === "WEEKLY") {
    const days = (byday && byday.length)
      ? byday.map(function (d) { return DAYNUM[d]; }).filter(function (n) { return n != null; })
      : [base.getUTCDay()];
    const startDay = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate());
    const weekStart = startDay - new Date(startDay).getUTCDay() * DAY_MS;
    const sorted = days.slice().sort(function (a, b) { return a - b; });
    for (let w = 0; w < LIMIT; w++) {
      const wkBase = weekStart + w * interval * 7 * DAY_MS;
      if (wkBase > windowEnd + 7 * DAY_MS) break;
      for (let k = 0; k < sorted.length; k++) {
        const day = new Date(wkBase + sorted[k] * DAY_MS);
        const ms = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hh, mm, ss);
        if (ms < startMs) continue;
        if (!push(ms)) return out;
      }
    }
    return out;
  }

  if (freq === "DAILY") {
    for (let i = 0; i < LIMIT; i++) {
      const ms = startMs + i * interval * DAY_MS;
      if (ms > windowEnd) break;
      if (!push(ms)) return out;
    }
    return out;
  }

  if (freq === "MONTHLY" || freq === "YEARLY") {
    const d0 = new Date(startMs);
    for (let i = 0; i < LIMIT; i++) {
      const ms = freq === "MONTHLY"
        ? Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + i * interval, d0.getUTCDate(), hh, mm, ss)
        : Date.UTC(d0.getUTCFullYear() + i * interval, d0.getUTCMonth(), d0.getUTCDate(), hh, mm, ss);
      if (ms > windowEnd) break;
      if (!push(ms)) return out;
    }
    return out;
  }

  return [startMs];
}

export function parseICS(text, windowStart, windowEnd) {
  const lines = unfold(text).split("\n");
  const events = [];
  let cur = null;
  let calTz = "UTC";
  let calName = "";

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line) continue;

    if (line === "BEGIN:VEVENT") { cur = { exdates: new Set() }; continue; }

    if (line === "END:VEVENT") {
      if (cur && cur.start && !cur.cancelled) {
        const tz = cur.tz || calTz;
        const times = cur.rrule
          ? expandRule(cur.start.ms, cur.rrule, windowStart, windowEnd, tz, cur.exdates)
          : ((cur.start.ms >= windowStart && cur.start.ms <= windowEnd && !cur.exdates.has(cur.start.ms))
              ? [cur.start.ms] : []);
        const dur = cur.end
          ? Math.max(0, cur.end.ms - cur.start.ms)
          : (cur.start.allDay ? DAY_MS : 3600000);
        for (let t = 0; t < times.length; t++) {
          const ms = times[t];
          events.push({
            uid: (cur.uid || "ev") + "@" + ms,
            title: cur.summary || "(제목 없음)",
            body: cur.description || "",
            location: cur.location || "",
            start_at: new Date(ms).toISOString(),
            end_at: new Date(ms + dur).toISOString(),
            all_day: !!cur.start.allDay,
            source: "google"
          });
        }
      }
      cur = null;
      continue;
    }

    const p = parseLine(line);
    if (!p) continue;

    if (!cur) {
      if (p.name === "X-WR-TIMEZONE") calTz = p.value.trim() || "UTC";
      if (p.name === "X-WR-CALNAME") calName = p.value.trim();
      continue;
    }

    if (p.name === "UID") cur.uid = p.value;
    else if (p.name === "SUMMARY") cur.summary = unescapeText(p.value);
    else if (p.name === "DESCRIPTION") cur.description = unescapeText(p.value);
    else if (p.name === "LOCATION") cur.location = unescapeText(p.value);
    else if (p.name === "DTSTART") {
      cur.start = parseDT(p.params, p.value, calTz);
      if (p.params.TZID) cur.tz = p.params.TZID;
    }
    else if (p.name === "DTEND") cur.end = parseDT(p.params, p.value, calTz);
    else if (p.name === "RRULE") {
      const r = {};
      const parts = p.value.split(";");
      for (let k = 0; k < parts.length; k++) {
        const eq = parts[k].indexOf("=");
        if (eq > 0) r[parts[k].slice(0, eq).toUpperCase()] = parts[k].slice(eq + 1);
      }
      cur.rrule = r;
    }
    else if (p.name === "EXDATE") {
      const vals = p.value.split(",");
      for (let k = 0; k < vals.length; k++) {
        cur.exdates.add(parseDT(p.params, vals[k].trim(), cur.tz || calTz).ms);
      }
    }
    else if (p.name === "STATUS" && p.value.toUpperCase() === "CANCELLED") cur.cancelled = true;
  }

  events.sort(function (a, b) { return a.start_at.localeCompare(b.start_at); });
  return { name: calName, events: events };
}
