'use strict';
// Analytics backend tests. The database is real Postgres (PGlite, in memory), not a mock.
const test = require('node:test');
const assert = require('node:assert/strict');
const a = require('../lib/analytics.cjs');

const CHROME_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const WECHAT = 'Mozilla/5.0 (Linux; Android 14; V2309A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0 Mobile Safari/537.36 MicroMessenger/8.0.50';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const SALT = 'test-salt';
const TOKEN = 'admin-secret-token';
const NOW = new Date('2026-10-04T08:00:00Z');

async function freshDb() {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite();
  return { query: (text, params) => pg.query(text, params).then(r => r.rows) };
}

function collectReq(body, headers = {}) {
  return {
    method: 'POST',
    headers: {
      'user-agent': CHROME_MAC,
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      'x-vercel-ip-country': 'CN',
      'x-vercel-ip-country-region': 'SH',
      'x-vercel-ip-city': encodeURIComponent('上海'),
      host: 'strata-inference-textbook.vercel.app',
      ...headers,
    },
    body,
  };
}

test('bot and headless user agents are recognized', () => {
  for (const ua of ['Googlebot/2.1', 'Mozilla/5.0 HeadlessChrome/140', 'curl/8.4', 'python-requests/2.32', 'Mozilla/5.0 (compatible; bingbot/2.0)', '']) assert.equal(a.isBot(ua), true, ua);
  for (const ua of [CHROME_MAC, IPHONE, WECHAT, IPAD]) assert.equal(a.isBot(ua), false, ua);
});

test('device and browser classification', () => {
  assert.equal(a.deviceOf(CHROME_MAC), 'desktop');
  assert.equal(a.deviceOf(IPHONE), 'mobile');
  assert.equal(a.deviceOf(WECHAT), 'mobile');
  assert.equal(a.deviceOf(IPAD), 'tablet');
  assert.equal(a.browserOf(CHROME_MAC), 'Chrome');
  assert.equal(a.browserOf(IPHONE), 'Safari');
  assert.equal(a.browserOf(WECHAT), 'WeChat');
  assert.equal(a.browserOf('Mozilla/5.0 (Windows NT 10.0) Gecko/20100101 Firefox/130.0'), 'Firefox');
  assert.equal(a.browserOf('Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Safari/537.36 Edg/140.0'), 'Edge');
});

test('referrer keeps only an external host', () => {
  assert.equal(a.referrerHost('https://www.zhihu.com/question/1?x=1', 'strata-inference-textbook.vercel.app'), 'www.zhihu.com');
  assert.equal(a.referrerHost('https://strata-inference-textbook.vercel.app/#home', 'strata-inference-textbook.vercel.app'), null);
  assert.equal(a.referrerHost('', 'x'), null);
  assert.equal(a.referrerHost('not a url', 'x'), null);
  assert.equal(a.referrerHost('javascript:alert(1)', 'x'), null);
});

test('visitor id is a daily salted hash and never contains the IP', () => {
  const v1 = a.visitorId({ ip: '203.0.113.7', ua: CHROME_MAC, salt: SALT, now: NOW });
  const v2 = a.visitorId({ ip: '203.0.113.7', ua: CHROME_MAC, salt: SALT, now: new Date('2026-10-04T23:59:00Z') });
  const nextDay = a.visitorId({ ip: '203.0.113.7', ua: CHROME_MAC, salt: SALT, now: new Date('2026-10-05T00:01:00Z') });
  const otherSalt = a.visitorId({ ip: '203.0.113.7', ua: CHROME_MAC, salt: 'other', now: NOW });
  assert.match(v1, /^[0-9a-f]{16}$/);
  assert.equal(v1, v2);
  assert.notEqual(v1, nextDay);
  assert.notEqual(v1, otherSalt);
  assert.ok(!v1.includes('203'));
  assert.throws(() => a.visitorId({ ip: '1.1.1.1', ua: CHROME_MAC, salt: '', now: NOW }));
});

test('event validation accepts known shapes and rejects the rest', () => {
  assert.deepEqual(a.sanitizeEvent({ type: 'pageview', route: 'chapter/17' }), { type: 'pageview', route: 'chapter/17', chapter: '17', lab: null, detail: null, ref: null, lang: null, site: 'zh' });
  assert.equal(a.sanitizeEvent({ type: 'pageview', route: 'lab/spec' }).lab, 'spec');
  assert.equal(a.sanitizeEvent({ type: 'pageview', route: 'home', lang: 'zh-CN', ref: 'https://x.com/' }).lang, 'zh-CN');
  assert.equal(a.sanitizeEvent({ type: 'quiz_answer', route: 'chapter/02', detail: '1:correct' }).detail, '1:correct');
  assert.equal(a.sanitizeEvent({ type: 'chapter_done', route: 'chapter/28' }).chapter, '28');
  for (const bad of [null, 'x', {}, { type: 'hack', route: 'home' }, { type: 'pageview', route: '<script>' }, { type: 'pageview', route: 'chapter/1' },
    { type: 'pageview', route: 'x'.repeat(200) }, { type: 'quiz_answer', route: 'chapter/02', detail: 'drop table' }, { type: 'quiz_answer', route: 'home', detail: '1:correct' },
    { type: 'chapter_done', route: 'lab/spec' }]) assert.equal(a.sanitizeEvent(bad), null, JSON.stringify(bad));
});

test('collect stores one row with every mandatory field from a real request', async () => {
  const db = await freshDb();
  const r = await a.handleCollect(collectReq(JSON.stringify({ type: 'pageview', route: 'chapter/10', ref: 'https://www.zhihu.com/q', lang: 'zh-CN' })), { db, salt: SALT, now: NOW });
  assert.equal(r.status, 204);
  const rows = await db.query('select * from events');
  assert.equal(rows.length, 1);
  const e = rows[0];
  assert.equal(e.type, 'pageview');
  assert.equal(e.route, 'chapter/10');
  assert.equal(e.chapter, '10');
  assert.equal(e.referrer_host, 'www.zhihu.com');
  assert.equal(e.country, 'CN');
  assert.equal(e.region, 'SH');
  assert.equal(e.city, '上海');
  assert.equal(e.device, 'desktop');
  assert.equal(e.browser, 'Chrome');
  assert.equal(e.lang, 'zh-CN');
  assert.match(e.visitor, /^[0-9a-f]{16}$/);
  assert.equal(new Date(e.ts).toISOString(), NOW.toISOString());
  assert.ok(!JSON.stringify(e).includes('203.0.113.7'), 'IP must not be stored');
});

test('collect accepts an already-parsed object body', async () => {
  const db = await freshDb();
  const r = await a.handleCollect(collectReq({ type: 'pageview', route: 'home' }), { db, salt: SALT, now: NOW });
  assert.equal(r.status, 204);
  assert.equal((await db.query('select count(*)::int n from events'))[0].n, 1);
});

test('collect drops bots, bad methods, oversized and invalid bodies without storing', async () => {
  const db = await freshDb();
  const ctx = { db, salt: SALT, now: NOW };
  assert.equal((await a.handleCollect(collectReq(JSON.stringify({ type: 'pageview', route: 'home' }), { 'user-agent': 'Googlebot/2.1' }), ctx)).status, 204);
  assert.equal((await a.handleCollect({ ...collectReq('{}'), method: 'GET' }, ctx)).status, 405);
  assert.equal((await a.handleCollect(collectReq('x'.repeat(3000)), ctx)).status, 413);
  assert.equal((await a.handleCollect(collectReq('{bad json'), ctx)).status, 400);
  assert.equal((await a.handleCollect(collectReq(JSON.stringify({ type: 'hack', route: 'home' })), ctx)).status, 400);
  await a.ensureSchema(db);
  assert.equal((await db.query('select count(*)::int n from events'))[0].n, 0);
});

test('collect fails closed when the salt is missing', async () => {
  const db = await freshDb();
  const r = await a.handleCollect(collectReq(JSON.stringify({ type: 'pageview', route: 'home' })), { db, salt: '', now: NOW });
  assert.equal(r.status, 503);
});

test('stats requires the admin token', async () => {
  const db = await freshDb();
  const base = { method: 'GET', headers: {}, query: {} };
  assert.equal((await a.handleStats(base, { db, token: TOKEN, now: NOW })).status, 401);
  assert.equal((await a.handleStats({ ...base, headers: { authorization: 'Bearer wrong' } }, { db, token: TOKEN, now: NOW })).status, 401);
  assert.equal((await a.handleStats({ ...base, headers: { authorization: 'Bearer ' + TOKEN } }, { db, token: '', now: NOW })).status, 503);
  assert.equal((await a.handleStats({ ...base, method: 'POST', headers: { authorization: 'Bearer ' + TOKEN } }, { db, token: TOKEN, now: NOW })).status, 405);
});

test('stats aggregates traffic, chapter funnel, labs, quiz and sources', async () => {
  const db = await freshDb();
  const send = (body, headers = {}, now = NOW) => a.handleCollect(collectReq(JSON.stringify(body), headers), { db, salt: SALT, now });
  const visitorA = { 'x-forwarded-for': '198.51.100.1' };
  const visitorB = { 'x-forwarded-for': '198.51.100.2', 'user-agent': IPHONE, 'x-vercel-ip-country': 'US', 'x-vercel-ip-city': 'Seattle', 'x-vercel-ip-country-region': 'WA' };
  const yesterday = new Date('2026-10-03T08:00:00Z');
  await send({ type: 'pageview', route: 'home', ref: 'https://www.zhihu.com/q' }, visitorA);
  await send({ type: 'pageview', route: 'chapter/01' }, visitorA);
  await send({ type: 'pageview', route: 'chapter/01' }, visitorA);
  await send({ type: 'chapter_done', route: 'chapter/01' }, visitorA);
  await send({ type: 'pageview', route: 'chapter/02' }, visitorA);
  await send({ type: 'quiz_answer', route: 'chapter/01', detail: '0:correct' }, visitorA);
  await send({ type: 'quiz_answer', route: 'chapter/01', detail: '1:incorrect' }, visitorA);
  await send({ type: 'pageview', route: 'lab/spec' }, visitorA);
  await send({ type: 'pageview', route: 'chapter/01', ref: 'https://x.com/post' }, visitorB);
  await send({ type: 'pageview', route: 'lab/spec' }, visitorB);
  await send({ type: 'pageview', route: 'chapter/01' }, visitorA, yesterday);
  await send({ type: 'pageview', route: 'home' }, { 'user-agent': 'Googlebot/2.1' });

  const r = await a.handleStats({ method: 'GET', headers: { authorization: 'Bearer ' + TOKEN }, query: { days: '7' } }, { db, token: TOKEN, now: NOW });
  assert.equal(r.status, 200);
  const s = r.body;
  assert.equal(s.days, 7);
  assert.equal(s.summary.pageviews, 8);
  assert.equal(s.summary.events, 11);
  assert.equal(s.summary.visitorDays, 3);
  assert.equal(s.summary.todayVisitors, 2);
  assert.deepEqual(s.daily, [{ day: '2026-10-03', pageviews: 1, visitors: 1 }, { day: '2026-10-04', pageviews: 7, visitors: 2 }]);
  const ch1 = s.chapters.find(c => c.chapter === '01');
  assert.deepEqual(ch1, { chapter: '01', readers: 3, views: 4, completions: 1 });
  assert.deepEqual(s.chapters.find(c => c.chapter === '02'), { chapter: '02', readers: 1, views: 1, completions: 0 });
  assert.deepEqual(s.labs, [{ lab: 'spec', opens: 2, visitors: 2 }]);
  assert.deepEqual(s.quiz, [{ chapter: '01', answers: 2, correct: 1 }]);
  assert.deepEqual(s.referrers.map(x => x.host).sort(), ['www.zhihu.com', 'x.com']);
  assert.deepEqual(s.countries, [{ country: 'CN', visitors: 2 }, { country: 'US', visitors: 1 }]);
  assert.deepEqual(s.devices.map(d => d.device).sort(), ['desktop', 'mobile']);
  assert.ok(s.recent.length > 0 && s.recent.length <= 20);
  assert.ok(!JSON.stringify(s).includes('198.51.100'), 'stats must not leak IPs');
  assert.ok(s.recent.every(e => !('visitor' in e)), 'recent events must not expose visitor ids');
});

test('stats clamps the day range', async () => {
  const db = await freshDb();
  const req = days => ({ method: 'GET', headers: { authorization: 'Bearer ' + TOKEN }, query: { days } });
  assert.equal((await a.handleStats(req('9999'), { db, token: TOKEN, now: NOW })).body.days, 90);
  assert.equal((await a.handleStats(req('abc'), { db, token: TOKEN, now: NOW })).body.days, 30);
  assert.equal((await a.handleStats(req('0'), { db, token: TOKEN, now: NOW })).body.days, 1);
});

test('unknown browser, malformed geo header and Buffer body are handled', async () => {
  assert.equal(a.browserOf('Mozilla/5.0 SomeReader/1.0'), 'Other');
  const db = await freshDb();
  const r = await a.handleCollect(collectReq(Buffer.from(JSON.stringify({ type: 'pageview', route: 'home' })), { 'x-vercel-ip-city': '%E4%B8' }), { db, salt: SALT, now: NOW });
  assert.equal(r.status, 204);
  const rows = await db.query('select city from events');
  assert.equal(rows[0].city, '%E4%B8');
  assert.equal((await a.handleCollect(collectReq({ type: 'pageview', route: 'home', ref: 'x'.repeat(3000) }), { db, salt: SALT, now: NOW })).status, 413);
  assert.equal((await a.handleCollect(collectReq(''), { db, salt: SALT, now: NOW })).status, 400);
});

test('events record which language edition was read', async () => {
  assert.equal(a.sanitizeEvent({ type: 'pageview', route: 'home', site: 'en' }).site, 'en');
  assert.equal(a.sanitizeEvent({ type: 'pageview', route: 'home' }).site, 'zh');
  assert.equal(a.sanitizeEvent({ type: 'pageview', route: 'home', site: 'xx' }), null);
  const db = await freshDb();
  const send = (body, ip) => a.handleCollect(collectReq(JSON.stringify(body), { 'x-forwarded-for': ip }), { db, salt: SALT, now: NOW });
  await send({ type: 'pageview', route: 'home', site: 'en' }, '1.1.1.1');
  await send({ type: 'pageview', route: 'chapter/01', site: 'en' }, '1.1.1.1');
  await send({ type: 'pageview', route: 'home' }, '2.2.2.2');
  assert.deepEqual((await db.query('select site from events order by id')).map(r => r.site), ['en', 'en', 'zh']);
  const s = (await a.handleStats({ method: 'GET', headers: { authorization: 'Bearer ' + TOKEN }, query: { days: '7' } }, { db, token: TOKEN, now: NOW })).body;
  assert.deepEqual(s.sites, [{ site: 'en', visitors: 1, pageviews: 2 }, { site: 'zh', visitors: 1, pageviews: 1 }]);
});

test('an existing events table gains the site column', async () => {
  const db = await freshDb();
  await db.query(`CREATE TABLE events (id BIGSERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL, type TEXT NOT NULL, route TEXT NOT NULL, chapter TEXT, lab TEXT, detail TEXT, visitor TEXT NOT NULL, referrer_host TEXT, country TEXT, region TEXT, city TEXT, device TEXT NOT NULL, browser TEXT NOT NULL, lang TEXT)`);
  await db.query(`INSERT INTO events (ts,type,route,visitor,device,browser) VALUES (now(),'pageview','home','v','desktop','Chrome')`);
  const r = await a.handleCollect(collectReq(JSON.stringify({ type: 'pageview', route: 'home', site: 'en' })), { db, salt: SALT, now: NOW });
  assert.equal(r.status, 204);
  assert.deepEqual((await db.query('select site from events order by id')).map(x => x.site), [null, 'en']);
});

test('events record which domain the reader used', async () => {
  assert.equal(a.hostOf('strata.matra.space'), 'strata.matra.space');
  assert.equal(a.hostOf('Strata.Matra.Space:443'), 'strata.matra.space');
  assert.equal(a.hostOf(''), null);
  assert.equal(a.hostOf('bad host/<script>'), null);
  assert.equal(a.hostOf('a'.repeat(120) + '.com'), null);
  const db = await freshDb();
  const send = (host, ip) => a.handleCollect(collectReq(JSON.stringify({ type: 'pageview', route: 'home' }), { host, 'x-forwarded-for': ip }), { db, salt: SALT, now: NOW });
  await send('strata.matra.space', '1.1.1.1');
  await send('strata.matra.space', '2.2.2.2');
  await send('strata-inference-textbook.vercel.app', '3.3.3.3');
  assert.deepEqual((await db.query('select host from events order by id')).map(r => r.host), ['strata.matra.space', 'strata.matra.space', 'strata-inference-textbook.vercel.app']);
  const s = (await a.handleStats({ method: 'GET', headers: { authorization: 'Bearer ' + TOKEN }, query: { days: '7' } }, { db, token: TOKEN, now: NOW })).body;
  assert.deepEqual(s.hosts, [{ host: 'strata.matra.space', visitors: 2, pageviews: 2 }, { host: 'strata-inference-textbook.vercel.app', visitors: 1, pageviews: 1 }]);
});

test('older rows without a domain are counted as unknown', async () => {
  const db = await freshDb();
  await a.ensureSchema(db);
  await db.query(`INSERT INTO events (ts,type,route,visitor,device,browser) VALUES ($1,'pageview','home','v','desktop','Chrome')`, [NOW.toISOString()]);
  const s = (await a.handleStats({ method: 'GET', headers: { authorization: 'Bearer ' + TOKEN }, query: { days: '7' } }, { db, token: TOKEN, now: NOW })).body;
  assert.deepEqual(s.hosts, [{ host: null, visitors: 1, pageviews: 1 }]);
});
