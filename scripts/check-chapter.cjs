'use strict';
// Checks one rewritten chapter against docs/STYLE-GUIDE.md without touching other chapters.
// Usage: node scripts/check-chapter.cjs NN [path/to/meta.json]
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const langAt = args.indexOf('--lang');
const lang = langAt >= 0 ? args.splice(langAt, 2)[1] : 'zh';
const id = args[0];
const metaPath = args[1];
if (!/^\d{2}$/.test(id || '')) { console.error('usage: node scripts/check-chapter.cjs NN [meta.json] [--lang en]'); process.exit(2); }

const hosts = require('./link-hosts.cjs');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
const sourceIDs = new Set(sources.map(s => s.id));
const html = fs.readFileSync(path.join(root, lang === 'zh' ? 'content/chapters' : `content/i18n/${lang}/chapters`, id + '.html'), 'utf8');
const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };

// A translation must keep the master's structure and contain no Chinese.
if (lang !== 'zh') {
  const zh = fs.readFileSync(path.join(root, 'content/chapters', id + '.html'), 'utf8');
  const list = (h, re) => [...h.matchAll(re)].map(m => m[1]).join(',');
  for (const [what, re] of [['widgets', /data-viz="([^"]+)"/g], ['primers', /<aside class="primer" id="([^"]+)"/g], ['h2 ids', /<h2 id="([^"]+)"/g], ['source refs', /\[((?:S|R)\d{2})\]/g], ['evidence tags', /class="ev ([a-z-]+)"/g], ['svg count', /(<svg\b)/g], ['ids', /\bid="(c\d{2}-[^"]+)"/g]]) {
    const a = list(zh, re), b = list(html, re);
    need(a === b, `${what} differ from the Chinese master: zh=[${a.slice(0, 120)}] ${lang}=[${b.slice(0, 120)}]`);
  }
  const cjk = html.replace(/<code>[\s\S]*?<\/code>/g, '').match(/[\u4e00-\u9fff]/g);
  need(!cjk, `contains ${cjk ? cjk.length : 0} Chinese characters`);
}

// Template blocks
for (const cls of ['class="hook"', 'class="tldr"', 'class="recap"', 'class="myth"', '<details class="deep">', 'class="bridge"']) need(html.includes(cls), 'missing ' + cls);
const h2 = [...html.matchAll(/<h2 id="sec-(\d+)">(\d+)\.(\d+) /g)];
need(h2.length >= 5, `needs >= 5 <h2 id="sec-N">${+id}.N 标题</h2>, found ${h2.length}`);
h2.forEach((m, i) => { need(+m[1] === i + 1, `h2 #${i + 1} has id sec-${m[1]}`); need(+m[2] === +id, `h2 ${m[2]}.${m[3]} must start with ${+id}.`); });

// Figures
const svgs = [...html.matchAll(/<svg\b[^>]*>/g)].map(m => m[0]);
need(svgs.length >= 5, `needs >= 5 figures, found ${svgs.length}`);
for (const s of svgs) { need(/role="img"/.test(s), 'svg without role="img"'); need(/aria-label="[^"]+"/.test(s), 'svg without aria-label'); need(/viewBox="0 0 \d+ \d+"/.test(s), 'svg without viewBox'); }
for (const [tag] of html.matchAll(/<(rect|text|circle|path|ellipse|polygon|line)\b[^>]*>/g)) need(/\bfill="/.test(tag), 'shape without fill attribute: ' + tag.slice(0, 70));
for (const [, t] of html.matchAll(/<text\b[^>]*font-size="(\d+(?:\.\d+)?)"/g)) need(+t >= 11, 'svg text smaller than 11: ' + t);
// A fill colour class would turn a stroke-only line into a filled shape; lines use f-line.
for (const [tag] of html.matchAll(/<(?:path|polyline|line)\b[^>]*fill="none"[^>]*>/g)) { const c = (tag.match(/class="(f-[a-z]+)"/) || [])[1]; need(!c || c === 'f-line', 'stroke-only shape uses fill class ' + c + ': ' + tag.slice(0, 70)); }
for (const [, x] of html.matchAll(/\bid="([^"]+)"/g)) if (!/^sec-\d+$/.test(x)) need(x.startsWith('c' + id + '-'), 'id must start with c' + id + '-: ' + x);
for (const [, cls] of html.matchAll(/class="(f-[a-z]+)"/g)) need(['f-box', 'f-soft', 'f-accent', 'f-side', 'f-text', 'f-muted', 'f-on', 'f-line', 'f-warn'].includes(cls), 'unknown figure class ' + cls);
need(!/深色的|浅色的格|绿色的|蓝色的|青色的/.test(html), 'do not name colours in text; themes change them');

// Primers and links
const primers = [...html.matchAll(/<aside class="primer" id="(c\d{2}-[a-z0-9-]+)">([\s\S]*?)<\/aside>/g)];
need(primers.length >= 1, 'needs >= 1 <aside class="primer" id="cNN-topic">');
for (const [, pid, body] of primers) need(/class="further"/.test(body), pid + ' needs a further-reading line');
for (const [tag, href] of html.matchAll(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>/g)) {
  let u; try { u = new URL(href); } catch { problems.push('bad url ' + href); continue; }
  need(u.protocol === 'https:', 'non-https link ' + href);
  need(hosts.has(u.hostname), 'host not in scripts/link-hosts.cjs: ' + u.hostname);
  need(/target="_blank"/.test(tag) && /rel="noopener noreferrer"/.test(tag), 'external link needs target and rel: ' + href);
}
for (const [, ch, anchor] of html.matchAll(/href="#chapter\/(\d{2})\/([a-z0-9-]+)"/g)) {
  const other = fs.readFileSync(path.join(root, 'content/chapters', ch + '.html'), 'utf8');
  need(other.includes('id="' + anchor + '"'), 'anchor does not exist yet: #chapter/' + ch + '/' + anchor);
}
for (const [, sid] of html.matchAll(/\[((?:S|R)\d{2})\]/g)) need(sourceIDs.has(sid), 'unknown source ' + sid);
for (const [, ev] of html.matchAll(/class="ev ([a-z-]+)"/g)) need(['ev-code', 'ev-report', 'ev-est'].includes(ev), 'unknown evidence tag ' + ev);
need(!/<script\b|onerror\s*=|onclick\s*=|TODO|待补充/.test(html), 'no scripts, inline handlers or TODOs in chapter html');

// Interactive figures
const vizDir = path.join(root, 'src/viz');
require(path.join(vizDir, 'core.js'));
const files = fs.readdirSync(vizDir).filter(f => f.endsWith('.js') && f !== 'core.js').sort((a, b) => (a.endsWith('.math.js') ? 0 : 1) - (b.endsWith('.math.js') ? 0 : 1) || a.localeCompare(b));
for (const f of files) { try { require(path.join(vizDir, f)); } catch (e) { if (f.startsWith(id + '-')) problems.push('cannot load ' + f + ': ' + e.message); } }
const vizBlocks = [...html.matchAll(/<div class="viz" data-viz="([a-z0-9-]+)"><figure class="fig"><svg\b[\s\S]*?<\/figure><\/div>/g)];
need((html.match(/<div class="viz"/g) || []).length === vizBlocks.length, 'viz blocks must be <div class="viz" data-viz="name"><figure class="fig"><svg …>…</figure></div>');
need(vizBlocks.length >= 1, 'needs >= 1 interactive widget');
for (const [, name] of vizBlocks) need(globalThis.Viz.has(name), 'widget not registered: ' + name);

// Metadata
if (metaPath) {
  const m = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  need(typeof m.deck === 'string' && m.deck.length > 5, 'meta.deck');
  need(typeof m.prereq === 'string' && m.prereq.length > 1, 'meta.prereq');
  need(Array.isArray(m.goals) && m.goals.length === 3, 'meta.goals needs 3 items');
  need(Array.isArray(m.quiz) && m.quiz.length === 3, 'meta.quiz needs 3 questions');
  for (const q of m.quiz || []) { need(q.choices?.length === 3, 'quiz needs 3 choices: ' + q.text); need(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 3, 'quiz.correct 0..2: ' + q.text); need(q.why?.length > 10, 'quiz.why: ' + q.text); }
  need(m.problem?.length > 10 && m.answer?.length > 20, 'meta.problem / meta.answer');
  if (lang === 'zh') need(Array.isArray(m.sources) && m.sources.every(s => sourceIDs.has(s)), 'meta.sources must be known ids');
  if (m.title !== undefined) need(typeof m.title === 'string' && m.title.length > 2, 'meta.title');
}

const plain = html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<details class="deep">[\s\S]*?<\/details>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, '');
console.log(`chapter ${id}: ${svgs.length} figures, ${vizBlocks.length} widgets, ${primers.length} primers, surface text ${plain.length} chars`);
if (problems.length) { console.log(problems.map(p => '  ✗ ' + p).join('\n')); process.exitCode = 1; } else console.log('  ✓ all checks passed');
