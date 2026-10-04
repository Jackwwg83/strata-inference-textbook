'use strict';
// Zero-dependency, deterministic static build. No remote content is fetched.
// Chinese content in content/ is the master copy and is built to dist/.
// A translation in content/i18n/<lang>/ overlays it and is built to dist/<lang>/
// once content/i18n/languages.json marks it published (or STRATA_ALL_LANGS=1 for local previews).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const I18N = require('../src/i18n.js');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const exists = p => fs.existsSync(path.join(root, p));
const json = p => JSON.parse(read(p));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const plain = s => s.replace(/<[^>]*>/g, ' ').replace(/&(?:lt|gt|amp|quot|#39);/g, ' ').replace(/\s+/g, ' ').trim();
const LANG_ORDER = ['zh', 'en', 'ja', 'ko', 'es', 'ar'];
const RTL = new Set(['ar']);

// Strings for one language with Chinese fallback, key by key.
const strings = lang => new Proxy({}, { get: (_, k) => ((I18N.S[lang] && k in I18N.S[lang]) ? I18N.S[lang][k] : I18N.S.zh[k]) });

function languagesToBuild() {
  const cfg = exists('content/i18n/languages.json') ? json('content/i18n/languages.json') : {};
  const all = process.env.STRATA_ALL_LANGS === '1';
  return LANG_ORDER.filter(l => l === 'zh' || (exists(`content/i18n/${l}`) && (all || cfg[l]?.published === true)));
}

// Overlay translated fields onto the Chinese records, matched by key.
function overlay(base, tr, key, fields) {
  const byKey = new Map((tr || []).map(x => [x[key], x]));
  return base.map(b => { const t = byKey.get(b[key]); if (!t) return { ...b }; const o = { ...b }; for (const f of fields) if (t[f] !== undefined) o[f] = t[f]; return o; });
}

function loadBook(lang) {
  const Book = {};
  for (const n of ['chapters', 'sources', 'tracks', 'weeks', 'glossary', 'walkthroughs', 'labs', 'provenance', 'courses']) Book[n] = json(`content/${n}.json`);
  const missing = [];
  if (lang !== 'zh') {
    const dir = `content/i18n/${lang}`;
    const tr = n => (exists(`${dir}/${n}.json`) ? json(`${dir}/${n}.json`) : (missing.push(n + '.json'), null));
    Book.chapters = overlay(Book.chapters, tr('chapters'), 'id', ['title', 'deck', 'part', 'courses', 'prereq', 'goals', 'quiz', 'problem', 'answer', 'level']);
    Book.sources = overlay(Book.sources, tr('sources'), 'id', ['title', 'note', 'kind']);
    Book.tracks = overlay(Book.tracks, tr('tracks'), 'id', ['name', 'sub', 'desc']);
    Book.labs = overlay(Book.labs, tr('labs'), 'id', ['title', 'category', 'description', 'assumptions', 'task']);
    Book.walkthroughs = overlay(Book.walkthroughs, tr('walkthroughs'), 'source', ['title', 'steps', 'challenge']);
    const g = tr('glossary'); if (g) Book.glossary = g;
    const c = tr('courses'); if (c) Book.courses = c;
    const p = tr('provenance'); if (p) Object.assign(Book.provenance, p);
  }
  for (const c of Book.chapters) {
    const own = lang === 'zh' ? `content/chapters/${c.id}.html` : `content/i18n/${lang}/chapters/${c.id}.html`;
    if (!exists(own)) missing.push(`chapters/${c.id}.html`);
    c.html = read(exists(own) ? own : `content/chapters/${c.id}.html`);
    c.plain = plain(c.html);
  }
  Book.teacher = lang === 'zh' ? read('content/teacher.html') : '';
  Book.license = read('licenses/Strata-MIT.txt');
  Book.assets = {};
  for (const n of ['tiny_inference.py', 'test_tiny_inference.py', 'benchmark_template.csv', 'benchmark_protocol.md']) Book.assets[n] = read('labs/' + n);
  Book.assets['labs-README.md'] = read('labs/README.md');
  Book.lang = lang;
  return { Book, missing };
}

// Viz widgets: the framework first, then pure math modules, then widgets, all in name order.
const vizFiles = fs.readdirSync(path.join(root, 'src/viz')).filter(n => n.endsWith('.js') && n !== 'core.js').sort((a, b) => (a.endsWith('.math.js') ? 0 : 1) - (b.endsWith('.math.js') ? 0 : 1) || a.localeCompare(b)).map(n => 'viz/' + n);
const scripts = ['lab-math.js', 'labs.js', 'i18n.js', 'viz/core.js', ...vizFiles, 'app.js'].map(n => `<script>\n${read('src/' + n).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
const css = `${read('src/style.css')}\n${read('src/machine.css')}`;
const icon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#136d5a"/><path d="M11 15h26M11 24h21M11 33h16" stroke="#e5f1df" stroke-width="5" stroke-linecap="round"/></svg>');
const githubIcon = '<svg viewBox="0 0 16 16" width="17" height="17" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
const cssString = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

function langSwitcher(lang, built, U) {
  if (built.length < 2) return '';
  const href = l => (l === 'zh' ? (lang === 'zh' ? './' : '../') : (lang === 'zh' ? `${l}/` : `../${l}/`));
  return `<label class="sr-only" for="lang-select">${esc(U.bLang)}</label><select id="lang-select" class="lang-select" aria-label="${esc(U.bLang)}">${built.map(l => `<option value="${href(l)}"${l === lang ? ' selected' : ''}>${esc(strings(l).langName)}</option>`).join('')}</select>`;
}

function appPage(Book, lang, built) {
  const U = strings(lang);
  const payload = JSON.stringify({ ...Book, languages: built }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const labelVars = `:root{--l-input:${cssString(U.cssInput)};--l-output:${cssString(U.cssOutput)};--l-primer:${cssString(U.cssPrimer)};--l-summary:${cssString(U.cssSummary)};--l-verdict:${cssString(U.cssVerdict)}}`;
  const teacherNav = Book.teacher ? `<a href="#teacher" data-view="teacher">${U.navTeacher}</a>` : '';
  return `<!doctype html>
<html lang="${U.htmlLang}"${RTL.has(lang) ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${esc(U.bDesc)}">
<meta name="theme-color" content="#05060b"><title>${U.siteTitle}</title><link rel="icon" href="${icon}">
<style id="site-css">${css}
${labelVars}</style></head><body>
<button class="skip-link" id="skip-content">${U.bSkip}</button>
<header class="topbar"><button id="menu-button" class="icon-button menu-button" aria-label="${U.bMenuOpen}" aria-expanded="false" aria-controls="sidebar">☰</button>
<a class="brand" href="#home" aria-label="${U.bHomeAria}"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span><strong>${U.bBrand.replace(/ · (.+)$/, '<span class="brand-tail"> · $1</span>')}</strong><small>AN OPEN SYSTEMS TEXTBOOK</small></span></a>
<nav class="top-nav" aria-label="${U.bNavAria}"><a href="#home" data-view="home">${U.navCourse}</a><a href="#labs" data-view="labs">${U.navLabs}</a><a href="#sources" data-view="sources">${U.navSources}</a>${teacherNav}<a href="#notes" data-view="notes">${U.navNotes}</a></nav>
<span class="readout" aria-hidden="true">READ <b id="read-pct">00%</b></span><div class="top-actions">${langSwitcher(lang, built, U)}<button id="search-button" class="search-button" aria-label="${U.bSearchAria}">${U.bSearch} <kbd>⌘ K</kbd></button><button id="theme-button" class="icon-button" aria-label="${U.bTheme}">◐</button><a class="icon-button github-link" href="${esc(Book.provenance.repoUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${U.bGithub}" title="GitHub">${githubIcon}</a></div><i class="read-progress" id="read-progress" aria-hidden="true"></i></header>
<aside id="sidebar" class="sidebar"></aside><button id="sidebar-overlay" class="sidebar-overlay" aria-label="${U.bMenuClose}" tabindex="-1"></button>
<main id="main" class="main" tabindex="-1"></main>
<noscript>${U.bNoscript}<a href="fullbook.html">${U.bNoscriptLink}</a>${U.bNoscriptEnd}</noscript>
<dialog id="search-dialog" class="search-dialog" aria-label="${U.bSearchDialog}"><div class="search-head"><label for="global-search" class="sr-only">${U.bSearchLabel}</label><input id="global-search" type="search" placeholder="${U.bSearchPlaceholder}" autocomplete="off"><button id="close-search" aria-label="${U.bCloseSearch}">${U.bCloseSearchText}</button></div><div id="search-results" class="search-results" aria-live="polite"></div></dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script id="book-data" type="application/json">${payload}</script>
${scripts}
<script>document.getElementById('skip-content').onclick=function(){document.getElementById('main').focus();};</script>
</body></html>`;
}

const staticStyle = `*{box-sizing:border-box}body{font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#16332a;background:#fff;max-width:1000px;margin:40px auto;padding:0 25px;line-height:1.95;font-size:17px}h1{font-size:32px;line-height:1.5}h2{font-size:24px;margin-top:34px}h3{font-size:19px}a{color:#14664e}pre{background:#f1f5ef;padding:18px;overflow:auto;font-size:12px;line-height:1.8}code{font-family:monospace;overflow-wrap:anywhere}.table-wrap{max-width:100%;overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #d5dfd3;padding:10px;text-align:left}th{background:#eef3e9}.equation{background:#eef5e7;border:1px solid #d5dfd3;padding:16px;margin:24px 0;overflow-wrap:anywhere}.chapter-print{border-top:2px solid #14664e;padding-top:30px;margin-top:55px}.ref{font-size:11px;margin-left:4px}.metadata{font-size:13px;color:#526358;overflow-wrap:anywhere}li{margin-bottom:9px}summary{cursor:pointer}.hook{background:#eef5e7;padding:16px 20px;margin:0 0 22px}.tldr{border-left:4px solid #14664e;padding-left:16px}.ev{font-size:11px;border:1px solid #d5dfd3;border-radius:9px;padding:0 6px;margin:0 3px}dfn{font-style:normal;font-weight:600}.fig{margin:24px 0;text-align:center}.fig svg{width:100%;max-width:560px;height:auto;font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif}.fig figcaption{font-size:13px;color:#526358}.recap{border:1px solid #d5dfd3;padding:12px 20px;margin:24px 0}.myth{border-left:4px solid #9e5d24;background:#fff4e5;padding:12px 16px;margin:16px 0}details.deep>summary{font-weight:600;color:#14664e}.primer{border:1px solid #d5dfd3;border-top:4px solid #14664e;padding:12px 18px;margin:22px 0}.bridge{background:#f1f5ef;padding:10px 14px}.further{font-size:13px;color:#526358} @media(max-width:600px){body{margin:20px auto;padding:0 18px;font-size:16px}h1{font-size:27px}h2{font-size:22px}}@media print{body{font-size:11pt;margin:0;max-width:none}.chapter-print{page-break-before:always}h2,h3{break-after:avoid}pre,.equation{break-inside:avoid}.noprint{display:none}@page{margin:18mm}}`;

function staticPage(Book, lang) {
  const U = strings(lang);
  const sourcesByID = new Map(Book.sources.map(s => [s.id, s]));
  const refs = s => s.replace(/\[((?:S|R)\d{2})\]/g, (m, id) => sourcesByID.has(id) ? `<a class="ref" href="${esc(sourcesByID.get(id).url)}">[${id}]</a>` : m);
  const wrap = s => refs(s).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>').replace(/<details class="deep">/g, '<details class="deep" open>').replace(/href="#chapter\/(\d{2})\/([a-z0-9-]+)"/g, 'href="#$2"').replace(/href="#chapter\/(\d{2})"/g, 'href="#chapter-$1"');
  const toc = Book.chapters.map(c => `<li><a href="#chapter-${c.id}">${c.id} · ${esc(c.title)}</a></li>`).join('');
  const chapters = Book.chapters.map(c => `<section class="chapter-print" id="chapter-${c.id}"><p class="metadata">CHAPTER ${c.id} · ${esc(c.part)} · ${esc(c.level)}</p><h1>${esc(c.title)}</h1><p>${esc(c.deck)}</p><p class="metadata">${U.sCourses}${esc(c.courses.join(' / '))}<br>${U.fullPrereq}${esc(c.prereq)}</p><h3>${U.sGoals}</h3><ul>${c.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>${wrap(c.html).replace(/id="sec-(\d+)"/g, `id="c${c.id}-sec-$1"`)}<h2>${U.sQuiz}</h2>${c.quiz.map((q, i) => `<h3>${i + 1}. ${esc(q.text)}</h3><p>${q.choices.map((a, j) => String.fromCharCode(65 + j) + '. ' + esc(a)).join('<br>')}</p><p><strong>${U.fullAnswer(String.fromCharCode(65 + q.correct))}</strong>${esc(q.why)}</p>`).join('')}<h3>${U.fullOpen}</h3><p>${esc(c.problem)}</p><p><strong>${U.fullArgument}</strong>${esc(c.answer)}</p></section>`).join('');
  const h = U.sWeekHead;
  const weeks = `<div class="table-wrap"><table><thead><tr><th>${h[0]}</th><th>${h[1]}</th><th>${h[2]}</th><th>${h[3]}</th></tr></thead><tbody>` + Book.weeks.map(w => `<tr><td>${w.week}</td><td>${esc(w.chapters)} · ${esc(w.title)}</td><td>${esc(w.lab)}</td><td>${esc(w.deliverable)}</td></tr>`).join('') + '</tbody></table></div>';
  const teacher = Book.teacher ? `<section class="chapter-print"><h1>${U.fullTeacher}</h1>${weeks}${wrap(Book.teacher)}</section>` : '';
  return `<!doctype html><html lang="${U.htmlLang}"${RTL.has(lang) ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${U.sTitle}</title><style>${staticStyle}</style></head><body><h1>${U.sHeading}</h1><p>${U.sCounts}</p><p class="metadata">${U.sEdition}${Book.provenance.edition} / ${Book.provenance.date}<br>${U.sCommit}${Book.provenance.commit}<br>${esc(Book.provenance.scope)}<br>${esc(Book.provenance.measurements)}<br>${U.sAuthor(esc(Book.provenance.author), esc(Book.provenance.license))}<br>${U.sErrata}<a href="${esc(Book.provenance.issues)}">${esc(Book.provenance.issues)}</a></p><p class="noprint"><a href="index.html">${U.sOpenApp}</a>${U.sPrintable}</p><h2>${U.sToc}</h2><ol>${toc}</ol>${chapters}${teacher}<section class="chapter-print"><h1>${U.sLabs}</h1>${Book.labs.map(l => `<h2>${esc(l.title)}</h2><p>${esc(l.description)}</p><p><strong>${U.labBoundary}</strong>${esc(l.assumptions)}</p><p><strong>${U.sTask}</strong>${esc(l.task)}</p><p class="noprint"><a href="index.html#lab/${l.id}">${U.sOpenLab}</a></p>`).join('')}</section><section class="chapter-print"><h1>${U.sWalk}</h1><p>${U.sWalkHint}</p>${Book.walkthroughs.map(w => `<h2>${w.source} · ${esc(w.title)}</h2><pre><code>${esc(w.code)}</code></pre><ol>${w.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><p>${esc(w.challenge)}</p>`).join('')}</section><section class="chapter-print"><h1>${U.sideGlossary}</h1>${Book.glossary.map(t => `<h3>${esc(t.en)} · ${esc(t.zh)}</h3><p>${esc(t.meaning)} <a href="#chapter-${t.chapter}">${U.crumbChapter(t.chapter)}</a></p>`).join('')}</section><section class="chapter-print"><h1>${U.sSources}</h1>${Book.sources.map(s => `<h3>${s.id} · ${esc(s.title)}</h3><p>${esc(s.note)}</p><p class="metadata">${s.path ? esc(s.path) + ` · L${s.start}–L${s.end}<br>` : ''}<a href="${esc(s.url)}">${esc(s.url)}</a></p>`).join('')}<p>${U.sDisclaimer}</p><h2>${U.fullLicense}</h2><pre><code>${esc(Book.license)}</code></pre></section></body></html>`;
}

const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
const built = languagesToBuild();
const manifest = { languages: {}, files: {} };
for (const lang of built) {
  const { Book, missing } = loadBook(lang);
  const outDir = lang === 'zh' ? dist : path.join(dist, lang);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), appPage(Book, lang, built));
  fs.writeFileSync(path.join(outDir, 'fullbook.html'), staticPage(Book, lang));
  const prefix = lang === 'zh' ? '' : lang + '/';
  for (const n of ['index.html', 'fullbook.html']) manifest.files[prefix + n] = { bytes: fs.statSync(path.join(outDir, n)).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(outDir, n))).digest('hex') };
  manifest.languages[lang] = { missing };
  if (lang === 'zh') Object.assign(manifest, Book.provenance, { counts: { chapters: Book.chapters.length, quizzes: Book.chapters.reduce((a, c) => a + c.quiz.length, 0), openProblems: Book.chapters.length, labs: Book.labs.length, glossary: Book.glossary.length, sourceWindows: Book.sources.filter(s => s.path).length } });
  console.log(`[${lang}] built${missing.length ? `, falling back to Chinese for ${missing.length} item(s): ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ' …' : ''}` : ''}`);
}
fs.copyFileSync(path.join(root, 'src/admin.html'), path.join(dist, 'admin.html'));
fs.mkdirSync(path.join(dist, 'labs'), { recursive: true });
for (const n of ['tiny_inference.py', 'test_tiny_inference.py', 'README.md', 'benchmark_template.csv', 'benchmark_protocol.md']) fs.copyFileSync(path.join(root, 'labs', n), path.join(dist, 'labs', n));
fs.mkdirSync(path.join(dist, 'licenses'), { recursive: true });
if (fs.existsSync(path.join(root, 'licenses/Strata-MIT.txt'))) fs.copyFileSync(path.join(root, 'licenses/Strata-MIT.txt'), path.join(dist, 'licenses/Strata-MIT.txt'));
fs.writeFileSync(path.join(dist, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${manifest.counts.chapters} chapters, ${manifest.counts.quizzes} quizzes, ${manifest.counts.labs} labs in ${built.length} language(s).`);
for (const [n, m] of Object.entries(manifest.files)) console.log(`${n}: ${(m.bytes / 1024).toFixed(1)} KiB / SHA256 ${m.sha256}`);
