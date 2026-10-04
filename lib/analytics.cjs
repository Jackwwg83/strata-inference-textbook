'use strict';
// Privacy-preserving visit analytics for the textbook.
// Stores no IP address and sets no cookie. A visitor id is a salted hash of
// IP + user agent + UTC day, so one person cannot be linked across days.
// `db` is any object with `query(text, params) -> Promise<rows[]>`.
const crypto = require('node:crypto');

const EVENT_TYPES = new Set(['pageview', 'chapter_done', 'quiz_answer']);
const ROUTE_RE = /^(home|labs|sources|teacher|notes|glossary|map|chapter\/\d{2}|lab\/[a-z]{2,20}|source\/[SR]\d{2}|map\/[^/]{1,40})$/u;
const DETAIL_RE = /^[0-2]:(correct|incorrect)$/;
const LANG_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/;
const MAX_BODY = 2048;
const SITES = new Set(['zh', 'en', 'ja', 'ko', 'es', 'ar']);
const TZ = 'Asia/Shanghai';
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|scrapy|phantom|puppeteer|playwright/i;

function isBot(ua) {
  return !ua || BOT_RE.test(ua);
}

function deviceOf(ua) {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android|MicroMessenger/i.test(ua)) return 'mobile';
  return 'desktop';
}

function browserOf(ua) {
  if (/MicroMessenger/i.test(ua)) return 'WeChat';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

function referrerHost(ref, selfHost) {
  if (!ref || typeof ref !== 'string') return null;
  try {
    const u = new URL(ref);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.hostname === selfHost) return null;
    return u.hostname.slice(0, 100);
  } catch {
    return null;
  }
}

function visitorId({ ip, ua, salt, now }) {
  if (!salt) throw new Error('analytics salt is required');
  const day = now.toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('hex').slice(0, 16);
}

function sanitizeEvent(body) {
  if (!body || typeof body !== 'object') return null;
  const { type, route } = body;
  if (!EVENT_TYPES.has(type) || typeof route !== 'string' || route.length > 64 || !ROUTE_RE.test(route)) return null;
  const chapter = (route.match(/^chapter\/(\d{2})$/) || [])[1] || null;
  const lab = (route.match(/^lab\/([a-z]+)$/) || [])[1] || null;
  let detail = null;
  if (type === 'quiz_answer') {
    if (!chapter || typeof body.detail !== 'string' || !DETAIL_RE.test(body.detail)) return null;
    detail = body.detail;
  }
  if (type === 'chapter_done' && !chapter) return null;
  const ref = typeof body.ref === 'string' && body.ref.length <= 500 ? body.ref : null;
  const lang = typeof body.lang === 'string' && LANG_RE.test(body.lang) ? body.lang : null;
  // Language edition of the site; older clients send none and read the Chinese edition.
  const site = body.site === undefined ? 'zh' : body.site;
  if (!SITES.has(site)) return null;
  return { type, route, chapter, lab, detail, ref, lang, site };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  route TEXT NOT NULL,
  chapter TEXT,
  lab TEXT,
  detail TEXT,
  visitor TEXT NOT NULL,
  referrer_host TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  device TEXT NOT NULL,
  browser TEXT NOT NULL,
  lang TEXT
)`;
const INDEX = 'CREATE INDEX IF NOT EXISTS events_ts_idx ON events (ts)';
const MIGRATE = 'ALTER TABLE events ADD COLUMN IF NOT EXISTS site TEXT';
const ready = new WeakSet();

async function ensureSchema(db) {
  if (ready.has(db)) return;
  await db.query(SCHEMA);
  await db.query(INDEX);
  await db.query(MIGRATE);
  ready.add(db);
}

function header(headers, name) {
  const v = headers[name];
  return Array.isArray(v) ? v[0] : v || '';
}

function decodeHeader(v) {
  if (!v) return null;
  try {
    return decodeURIComponent(v).slice(0, 80);
  } catch {
    return v.slice(0, 80);
  }
}

function parseBody(body) {
  if (body == null || body === '') return { error: 400 };
  if (typeof body === 'object' && !Buffer.isBuffer(body)) {
    return JSON.stringify(body).length > MAX_BODY ? { error: 413 } : { value: body };
  }
  const text = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  if (text.length > MAX_BODY) return { error: 413 };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: 400 };
  }
}

async function handleCollect(req, { db, salt, now = new Date() }) {
  if (req.method !== 'POST') return { status: 405 };
  if (!salt) return { status: 503 };
  const parsed = parseBody(req.body);
  if (parsed.error) return { status: parsed.error };
  const h = req.headers || {};
  const ua = header(h, 'user-agent').slice(0, 400);
  // Answer bots with success so they do not retry, but store nothing.
  if (isBot(ua)) return { status: 204 };
  const ev = sanitizeEvent(parsed.value);
  if (!ev) return { status: 400 };
  const ip = header(h, 'x-forwarded-for').split(',')[0].trim() || header(h, 'x-real-ip');
  await ensureSchema(db);
  await db.query(
    `INSERT INTO events (ts, type, route, chapter, lab, detail, visitor, referrer_host, country, region, city, device, browser, lang, site)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [now.toISOString(), ev.type, ev.route, ev.chapter, ev.lab, ev.detail,
      visitorId({ ip, ua, salt, now }), referrerHost(ev.ref, header(h, 'host')),
      header(h, 'x-vercel-ip-country').slice(0, 2) || null, decodeHeader(header(h, 'x-vercel-ip-country-region')),
      decodeHeader(header(h, 'x-vercel-ip-city')), deviceOf(ua), browserOf(ua), ev.lang, ev.site],
  );
  return { status: 204 };
}

function tokenMatches(given, expected) {
  const d = s => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(d(given), d(expected));
}

function clampDays(v) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(1, n));
}

async function queryStats(db, days, now) {
  await ensureSchema(db);
  const since = new Date(now.getTime() - days * 86400000).toISOString();
  const p = [since];
  const day = `to_char(ts AT TIME ZONE '${TZ}', 'YYYY-MM-DD')`;
  const today = now.toLocaleDateString('sv-SE', { timeZone: TZ });
  const [summary, todayRow, daily, chapters, labs, quiz, referrers, countries, cities, devices, browsers, recent, sites] = await Promise.all([
    db.query(`SELECT count(*)::int AS events,
        count(*) FILTER (WHERE type = 'pageview')::int AS pageviews,
        count(DISTINCT visitor)::int AS visitor_days
      FROM events WHERE ts >= $1`, p),
    db.query(`SELECT count(DISTINCT visitor)::int AS visitors FROM events WHERE ${day} = $1`, [today]),
    db.query(`SELECT ${day} AS day, count(*) FILTER (WHERE type = 'pageview')::int AS pageviews, count(DISTINCT visitor)::int AS visitors
      FROM events WHERE ts >= $1 GROUP BY 1 ORDER BY 1`, p),
    db.query(`SELECT chapter,
        count(DISTINCT visitor) FILTER (WHERE type = 'pageview')::int AS readers,
        count(*) FILTER (WHERE type = 'pageview')::int AS views,
        count(DISTINCT visitor) FILTER (WHERE type = 'chapter_done')::int AS completions
      FROM events WHERE ts >= $1 AND chapter IS NOT NULL GROUP BY chapter ORDER BY chapter`, p),
    db.query(`SELECT lab, count(*)::int AS opens, count(DISTINCT visitor)::int AS visitors
      FROM events WHERE ts >= $1 AND lab IS NOT NULL AND type = 'pageview' GROUP BY lab ORDER BY opens DESC, lab`, p),
    db.query(`SELECT chapter, count(*)::int AS answers, count(*) FILTER (WHERE detail LIKE '%:correct')::int AS correct
      FROM events WHERE ts >= $1 AND type = 'quiz_answer' GROUP BY chapter ORDER BY chapter`, p),
    db.query(`SELECT referrer_host AS host, count(DISTINCT visitor)::int AS visitors
      FROM events WHERE ts >= $1 AND referrer_host IS NOT NULL GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10`, p),
    db.query(`SELECT country, count(DISTINCT visitor)::int AS visitors
      FROM events WHERE ts >= $1 AND country IS NOT NULL GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10`, p),
    db.query(`SELECT city, country, count(DISTINCT visitor)::int AS visitors
      FROM events WHERE ts >= $1 AND city IS NOT NULL GROUP BY 1, 2 ORDER BY 3 DESC, 1 LIMIT 10`, p),
    db.query(`SELECT device, count(DISTINCT visitor)::int AS visitors FROM events WHERE ts >= $1 GROUP BY 1 ORDER BY 2 DESC, 1`, p),
    db.query(`SELECT browser, count(DISTINCT visitor)::int AS visitors FROM events WHERE ts >= $1 GROUP BY 1 ORDER BY 2 DESC, 1`, p),
    db.query(`SELECT ts, type, route, detail, referrer_host, country, city, device, browser
      FROM events WHERE ts >= $1 ORDER BY ts DESC, id DESC LIMIT 20`, p),
    db.query(`SELECT COALESCE(site, 'zh') AS site, count(DISTINCT visitor)::int AS visitors, count(*) FILTER (WHERE type = 'pageview')::int AS pageviews
      FROM events WHERE ts >= $1 GROUP BY 1 ORDER BY 2 DESC, 1`, p),
  ]);
  return {
    days,
    generatedAt: now.toISOString(),
    timezone: TZ,
    summary: { events: summary[0].events, pageviews: summary[0].pageviews, visitorDays: summary[0].visitor_days, todayVisitors: todayRow[0].visitors },
    daily,
    chapters,
    labs,
    quiz,
    referrers,
    countries,
    cities,
    devices,
    browsers,
    sites,
    recent: recent.map(r => ({ ...r, ts: new Date(r.ts).toISOString() })),
  };
}

async function handleStats(req, { db, token, now = new Date() }) {
  if (req.method !== 'GET') return { status: 405 };
  if (!token) return { status: 503, body: { error: 'ADMIN_TOKEN is not configured' } };
  const auth = header(req.headers || {}, 'authorization');
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!given || !tokenMatches(given, token)) return { status: 401, body: { error: 'unauthorized' } };
  const days = clampDays((req.query || {}).days);
  return { status: 200, body: await queryStats(db, days, now) };
}

module.exports = {
  isBot, deviceOf, browserOf, referrerHost, visitorId, sanitizeEvent,
  ensureSchema, handleCollect, handleStats, clampDays,
};
