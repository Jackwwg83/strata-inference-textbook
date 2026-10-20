'use strict';
// Checks one rewritten chapter against docs/STYLE-GUIDE.md without touching other chapters.
// Usage: node scripts/check-chapter.cjs NN [path/to/meta.json]
// A column page (content/columns.json) uses its column and page ids: node scripts/check-chapter.cjs deepinfer/wide-ep
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const langAt = args.indexOf('--lang');
const lang = langAt >= 0 ? args.splice(langAt, 2)[1] : 'zh';
const id = args[0];
const metaPath = args[1];
const colMatch = /^([a-z]+)\/([a-z0-9-]+)$/.exec(id || '');
if (!/^\d{2}$/.test(id || '') && !colMatch) { console.error('usage: node scripts/check-chapter.cjs NN|column/page [meta.json] [--lang en]'); process.exit(2); }
// A column page is lighter than a chapter: fewer sections and figures, no required myth or primer, its own id prefix.
const column = colMatch && JSON.parse(fs.readFileSync(path.join(root, 'content/columns.json'), 'utf8')).find(c => c.id === colMatch[1]);
const pageNo = column ? column.pages.findIndex(p => p.id === colMatch[2]) + 1 : 0;
if (colMatch && !pageNo) { console.error('unknown column page ' + id); process.exit(2); }
const idPrefix = column ? `${column.prefix}-${colMatch[2]}-` : 'c' + id + '-';
const secNo = column ? pageNo : +id;
const htmlPath = l => (column ? (l === 'zh' ? `content/columns/${column.id}/${colMatch[2]}.html` : `content/i18n/${l}/columns/${column.id}/${colMatch[2]}.html`) : (l === 'zh' ? `content/chapters/${id}.html` : `content/i18n/${l}/chapters/${id}.html`));

const hosts = require('./link-hosts.cjs');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
const sourceIDs = new Set(sources.map(s => s.id));
const html = fs.readFileSync(path.join(root, htmlPath(lang)), 'utf8');
const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };

// A translation must keep the master's structure and contain no Chinese.
if (lang !== 'zh') {
  const zh = fs.readFileSync(path.join(root, htmlPath('zh')), 'utf8');
  const list = (h, re) => [...h.matchAll(re)].map(m => m[1]).join(',');
  for (const [what, re] of [['widgets', /data-viz="([^"]+)"/g], ['primers', /<aside class="primer" id="([^"]+)"/g], ['h2 ids', /<h2 id="([^"]+)"/g], ['source refs', /\[((?:S|R)\d{2})\]/g], ['evidence tags', /class="ev ([a-z-]+)"/g], ['svg count', /(<svg\b)/g], ['ids', /\bid="((?:c\d{2}|[a-z]+-[a-z0-9]+)-[^"]+)"/g], ['\\u escapes', /(\\u[0-9a-fA-F]{4})/g]]) {
    const a = list(zh, re), b = list(html, re);
    need(a === b, `${what} differ from the Chinese master: zh=[${a.slice(0, 120)}] ${lang}=[${b.slice(0, 120)}]`);
  }
  // Chinese teaching samples are allowed inside <code> or inside an element marked lang="zh".
  // Japanese is written with kanji, so for ja only glyphs found in Simplified Chinese alone count as leftovers.
  const han = lang === 'ja' ? /[这们说时过发个对现么无问还进动样实关应长开见边头间两东车经资认该处则网签维计读钟递传输钮页图标题码块缓选择设显错误]/g : /[\u4e00-\u9fff]/g;
  const cjk = html.replace(/<code>[\s\S]*?<\/code>/g, '').replace(/<(text|tspan|code|span)\b[^>]*\blang="zh"[^>]*>[\s\S]*?<\/\1>/g, '').match(han);
  need(!cjk, `contains ${cjk ? cjk.length : 0} Chinese characters${cjk ? ': ' + [...new Set(cjk)].slice(0, 12).join('') : ''}`);
  // A lab named in the master must appear under its official translated title, so readers can find it.
  const labsTr = path.join(root, `content/i18n/${lang}/labs.json`);
  if (fs.existsSync(labsTr)) {
    const tr = new Map(JSON.parse(fs.readFileSync(labsTr, 'utf8')).map(l => [l.id, l.title]));
    for (const l of JSON.parse(fs.readFileSync(path.join(root, 'content/labs.json'), 'utf8'))) {
      if (zh.includes(l.title) && tr.has(l.id)) need(html.includes(tr.get(l.id)), `lab "${l.id}" must use its official title: ${tr.get(l.id)}`);
    }
  }
}

// Template blocks
for (const cls of ['class="hook"', 'class="tldr"', 'class="recap"', '<details class="deep">', 'class="bridge"', ...(column ? [] : ['class="myth"'])]) need(html.includes(cls), 'missing ' + cls);
const minH2 = column ? 4 : 5, minFig = column ? 3 : 5;
const h2 = [...html.matchAll(/<h2 id="sec-(\d+)">(\d+)\.(\d+) /g)];
need(h2.length >= minH2, `needs >= ${minH2} <h2 id="sec-N">${secNo}.N 标题</h2>, found ${h2.length}`);
need(h2.length === (html.match(/<h2\b/g) || []).length, 'every h2 needs id="sec-N" and an N.M number');
h2.forEach((m, i) => { need(+m[1] === i + 1, `h2 #${i + 1} has id sec-${m[1]}`); need(+m[2] === secNo, `h2 ${m[2]}.${m[3]} must start with ${secNo}.`); });

// Figures
const svgs = [...html.matchAll(/<svg\b[^>]*>/g)].map(m => m[0]);
need(svgs.length >= minFig, `needs >= ${minFig} figures, found ${svgs.length}`);
for (const s of svgs) { need(/role="img"/.test(s), 'svg without role="img"'); need(/aria-label="[^"]+"/.test(s), 'svg without aria-label'); need(/viewBox="0 0 \d+ \d+"/.test(s), 'svg without viewBox'); }
for (const [tag] of html.matchAll(/<(rect|text|circle|path|ellipse|polygon|line)\b[^>]*>/g)) need(/\bfill="/.test(tag), 'shape without fill attribute: ' + tag.slice(0, 70));
for (const [, t] of html.matchAll(/<text\b[^>]*font-size="(\d+(?:\.\d+)?)"/g)) need(+t >= 11, 'svg text smaller than 11: ' + t);
// A fill colour class would turn a stroke-only line into a filled shape; lines use f-line.
for (const [tag] of html.matchAll(/<(?:path|polyline|line)\b[^>]*fill="none"[^>]*>/g)) { const c = (tag.match(/class="(f-[a-z]+)"/) || [])[1]; need(!c || c === 'f-line', 'stroke-only shape uses fill class ' + c + ': ' + tag.slice(0, 70)); }
for (const [, x] of html.matchAll(/\bid="([^"]+)"/g)) if (!/^sec-\d+$/.test(x)) need(x.startsWith(idPrefix), 'id must start with ' + idPrefix + ': ' + x);
for (const [, cls] of html.matchAll(/class="(f-[a-z]+)"/g)) need(['f-box', 'f-soft', 'f-accent', 'f-side', 'f-text', 'f-muted', 'f-on', 'f-line', 'f-warn'].includes(cls), 'unknown figure class ' + cls);
need(!/深色的|浅色的格|绿色的|蓝色的|青色的/.test(html), 'do not name colours in text; themes change them');

// Primers and links
const primers = [...html.matchAll(/<aside class="primer" id="([a-z0-9-]+)">([\s\S]*?)<\/aside>/g)];
need(primers.length === (html.match(/<aside class="primer"/g) || []).length, 'every primer needs an id');
if (!column) need(primers.length >= 1, 'needs >= 1 <aside class="primer" id="cNN-topic">');
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
for (const [, pg, anchor] of html.matchAll(/href="#([a-z]+\/[a-z0-9-]+)\/([a-z0-9-]+)"/g)) {
  if (pg.startsWith('chapter/')) continue;
  const f = path.join(root, 'content/columns', pg + '.html');
  need(fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('id="' + anchor + '"'), 'anchor does not exist yet: #' + pg + '/' + anchor);
}
// Links into a column's upstream repository must name the pinned commit, like the Strata links do.
if (column) for (const [, href] of html.matchAll(/href="(https:\/\/github\.com\/[^"]+)"/g)) {
  if (href.toLowerCase().startsWith(column.upstream.url.toLowerCase() + '/')) need(/\/(?:blob|tree)\//.test(href) && href.includes('/' + column.upstream.commit + '/'), 'upstream link must use the pinned commit ' + column.upstream.commit.slice(0, 8) + ': ' + href);
}
for (const [, sid] of html.matchAll(/\[((?:S|R)\d{2})\]/g)) need(sourceIDs.has(sid), 'unknown source ' + sid);
for (const [, ev] of html.matchAll(/class="ev ([a-z-]+)"/g)) need(['ev-code', 'ev-report', 'ev-est'].includes(ev), 'unknown evidence tag ' + ev);
need(!/<script\b|onerror\s*=|onclick\s*=|TODO|待补充/.test(html), 'no scripts, inline handlers or TODOs in chapter html');

// Interactive figures
const vizDir = path.join(root, 'src/viz');
require(path.join(vizDir, 'core.js'));
const files = fs.readdirSync(vizDir).filter(f => f.endsWith('.js') && f !== 'core.js').sort((a, b) => (a.endsWith('.math.js') ? 0 : 1) - (b.endsWith('.math.js') ? 0 : 1) || a.localeCompare(b));
for (const f of files) { try { require(path.join(vizDir, f)); } catch (e) { if (f.startsWith(column ? column.prefix + '-' + colMatch[2] : id + '-')) problems.push('cannot load ' + f + ': ' + e.message); } }
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
console.log(`${column ? 'page' : 'chapter'} ${id}: ${svgs.length} figures, ${vizBlocks.length} widgets, ${primers.length} primers, surface text ${plain.length} chars`);
if (problems.length) { console.log(problems.map(p => '  ✗ ' + p).join('\n')); process.exitCode = 1; } else console.log('  ✓ all checks passed');
