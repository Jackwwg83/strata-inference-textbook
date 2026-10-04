'use strict';
// Fetch every external link in the chapter sources and report the ones that do not resolve.
// Needs network access, so it is not part of `npm test`. Run: node scripts/check-links.cjs [chapter ids...] [--lang en]
const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const langAt = argv.indexOf('--lang');
const lang = langAt >= 0 ? argv.splice(langAt, 2)[1] : 'zh';
const dir = path.resolve(__dirname, '..', lang === 'zh' ? 'content/chapters' : `content/i18n/${lang}/chapters`);
const only = new Set(argv);
const links = new Map();
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort()) {
  const id = f.slice(0, 2);
  if (only.size && !only.has(id)) continue;
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const [, href] of html.matchAll(/href="(https:[^"]+)"/g)) {
    if (!links.has(href)) links.set(href, new Set());
    links.get(href).add(id);
  }
}

async function check(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 (strata-textbook link checker; +https://github.com/Jackwwg83/strata-inference-textbook)' },
        signal: AbortSignal.timeout(20000),
      });
      return res.status;
    } catch (err) {
      if (attempt === 1) return 'ERR ' + (err.cause?.code || err.name);
    }
  }
}

(async () => {
  const bad = [];
  const entries = [...links.entries()];
  for (let i = 0; i < entries.length; i += 6) {
    await Promise.all(entries.slice(i, i + 6).map(async ([url, chs]) => {
      const status = await check(url);
      if (status !== 200) bad.push({ status, url, chapters: [...chs].join(',') });
    }));
  }
  console.log(`checked ${links.size} links, ${bad.length} failing`);
  for (const b of bad) console.log(`${b.status}\t${b.chapters}\t${decodeURI(b.url)}`);
  process.exitCode = bad.length ? 1 : 0;
})();
