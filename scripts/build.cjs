'use strict';
// Zero-dependency, deterministic static build. No remote content is fetched.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = n => JSON.parse(read(`content/${n}.json`));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const plain = s => s.replace(/<[^>]*>/g, ' ').replace(/&(?:lt|gt|amp|quot|#39);/g, ' ').replace(/\s+/g, ' ').trim();
const Book = {};
for (const n of ['chapters','sources','tracks','weeks','glossary','walkthroughs','labs','provenance']) Book[n] = json(n);
for (const c of Book.chapters) {
  c.html = read(`content/chapters/${c.id}.html`);
  c.plain = plain(c.html);
}
Book.teacher = read('content/teacher.html');
Book.license = read('licenses/Strata-MIT.txt');
Book.assets = {};
for (const n of ['tiny_inference.py','test_tiny_inference.py','benchmark_template.csv','benchmark_protocol.md']) Book.assets[n] = read('labs/' + n);
Book.assets['labs-README.md'] = read('labs/README.md');
const payload = JSON.stringify(Book).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const scripts = ['lab-math.js', 'labs.js', 'app.js'].map(n => `<script>\n${read('src/'+n).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
const icon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#136d5a"/><path d="M11 15h26M11 24h21M11 33h16" stroke="#e5f1df" stroke-width="5" stroke-linecap="round"/></svg>');
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="以 Strata 为真实项目线索，连接大学计算机基础的中文推理系统教材。28 章、14 个交互实验、84 道解析自测与 16 周教师手册。">
<meta name="theme-color" content="#136d5a"><title>从 Strata 学推理系统</title><link rel="icon" href="${icon}">
<style id="site-css">${read('src/style.css')}</style></head><body>
<button class="skip-link" id="skip-content">跳到正文</button>
<header class="topbar"><button id="menu-button" class="icon-button menu-button" aria-label="展开课程目录" aria-expanded="false" aria-controls="sidebar">☰</button>
<a class="brand" href="#home" aria-label="从 Strata 学推理系统：首页"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span><strong>推理系统 · Strata</strong><small>AN OPEN SYSTEMS TEXTBOOK</small></span></a>
<nav class="top-nav" aria-label="主要功能"><a href="#home" data-view="home">课程</a><a href="#labs" data-view="labs">实验室</a><a href="#sources" data-view="sources">源码地图</a><a href="#teacher" data-view="teacher">教师手册</a><a href="#notes" data-view="notes">学习笔记</a></nav>
<div class="top-actions"><button id="search-button" class="search-button" aria-label="搜索教材，快捷键 Control 或 Command K">搜索 <kbd>⌘ K</kbd></button><button id="theme-button" class="icon-button" aria-label="切换主题">◐</button></div></header>
<aside id="sidebar" class="sidebar"></aside><button id="sidebar-overlay" class="sidebar-overlay" aria-label="关闭课程目录" tabindex="-1"></button>
<main id="main" class="main" tabindex="-1"></main>
<noscript>互动教材需要 JavaScript。<a href="fullbook.html">打开无需 JavaScript 的完整教材与答案</a>。</noscript>
<dialog id="search-dialog" class="search-dialog" aria-label="搜索教材"><div class="search-head"><label for="global-search" class="sr-only">搜索正文、标题和术语</label><input id="global-search" type="search" placeholder="搜索原理、源码与术语…" autocomplete="off"><button id="close-search" aria-label="关闭搜索">关闭 / ESC</button></div><div id="search-results" class="search-results" aria-live="polite"></div></dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script id="book-data" type="application/json">${payload}</script>
${scripts}
<script>document.getElementById('skip-content').onclick=function(){document.getElementById('main').focus();};</script>
</body></html>`;
const sourcesByID = new Map(Book.sources.map(s => [s.id,s]));
function refs(s) { return s.replace(/\[((?:S|R)\d{2})\]/g,(m,id)=>sourcesByID.has(id)?`<a class="ref" href="${esc(sourcesByID.get(id).url)}">[${id}]</a>`:m); }
const wrap = s => refs(s).replace(/<table>/g,'<div class="table-wrap"><table>').replace(/<\/table>/g,'</table></div>');
const staticStyle = `*{box-sizing:border-box}body{font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#16332a;background:#fff;max-width:1000px;margin:40px auto;padding:0 25px;line-height:1.95;font-size:17px}h1{font-size:32px;line-height:1.5}h2{font-size:24px;margin-top:34px}h3{font-size:19px}a{color:#14664e}pre{background:#f1f5ef;padding:18px;overflow:auto;font-size:12px;line-height:1.8}code{font-family:monospace;overflow-wrap:anywhere}.table-wrap{max-width:100%;overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #d5dfd3;padding:10px;text-align:left}th{background:#eef3e9}.equation{background:#eef5e7;border:1px solid #d5dfd3;padding:16px;margin:24px 0;overflow-wrap:anywhere}.chapter-print{border-top:2px solid #14664e;padding-top:30px;margin-top:55px}.ref{font-size:11px;margin-left:4px}.metadata{font-size:13px;color:#526358;overflow-wrap:anywhere}li{margin-bottom:9px}summary{cursor:pointer} @media(max-width:600px){body{margin:20px auto;padding:0 18px;font-size:16px}h1{font-size:27px}h2{font-size:22px}}@media print{body{font-size:11pt;margin:0;max-width:none}.chapter-print{page-break-before:always}h2,h3{break-after:avoid}pre,.equation{break-inside:avoid}.noprint{display:none}@page{margin:18mm}}`;
const toc = Book.chapters.map(c=>`<li><a href="#chapter-${c.id}">${c.id} · ${esc(c.title)}</a></li>`).join('');
const chapters = Book.chapters.map(c => `<section class="chapter-print" id="chapter-${c.id}"><p class="metadata">CHAPTER ${c.id} · ${esc(c.part)} · ${esc(c.level)}</p><h1>${esc(c.title)}</h1><p>${esc(c.deck)}</p><p class="metadata">关联基础课程：${esc(c.courses.join(' / '))}<br>先修：${esc(c.prereq)}</p><h3>学习目标</h3><ul>${c.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ul>${wrap(c.html).replace(/id="sec-(\d+)"/g,`id="c${c.id}-sec-$1"`)}<h2>自测与解析</h2>${c.quiz.map((q,i)=>`<h3>${i+1}. ${esc(q.text)}</h3><p>${q.choices.map((a,j)=>String.fromCharCode(65+j)+'. '+esc(a)).join('<br>')}</p><p><strong>答案 ${String.fromCharCode(65+q.correct)}。</strong>${esc(q.why)}</p>`).join('')}<h3>开放题</h3><p>${esc(c.problem)}</p><p><strong>参考论证：</strong>${esc(c.answer)}</p></section>`).join('');
const weeks = '<div class="table-wrap"><table><thead><tr><th>周</th><th>章节与主题</th><th>实验</th><th>交付</th></tr></thead><tbody>'+Book.weeks.map(w=>`<tr><td>${w.week}</td><td>${esc(w.chapters)} · ${esc(w.title)}</td><td>${esc(w.lab)}</td><td>${esc(w.deliverable)}</td></tr>`).join('')+'</tbody></table></div>';
const staticBook = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>从 Strata 学推理系统 · 完整教材与解析</title><style>${staticStyle}</style></head><body><h1>从 Strata 学推理系统<br>一颗 token 的计算机科学之旅</h1><p>28 章 · 84 道解析自测 · 28 道开放题 · 14 项实验说明 · 16 周教师手册</p><p class="metadata">独立教学初版 ${Book.provenance.edition} / ${Book.provenance.date}<br>固定代码：${Book.provenance.commit}<br>${esc(Book.provenance.scope)}<br>${esc(Book.provenance.measurements)}<br>作者：${esc(Book.provenance.author)} · 许可：${esc(Book.provenance.license)}<br>初版，未经同行审阅。发现错误请提交勘误：<a href="${esc(Book.provenance.issues)}">${esc(Book.provenance.issues)}</a></p><p class="noprint"><a href="index.html">打开交互式教材</a> · 本页不需要 JavaScript，可直接用浏览器打印。</p><h2>目录</h2><ol>${toc}</ol>${chapters}<section class="chapter-print"><h1>教师手册</h1>${weeks}${wrap(Book.teacher)}</section><section class="chapter-print"><h1>实验目录与边界</h1>${Book.labs.map(l=>`<h2>${esc(l.title)}</h2><p>${esc(l.description)}</p><p><strong>模型边界：</strong>${esc(l.assumptions)}</p><p><strong>任务：</strong>${esc(l.task)}</p><p class="noprint"><a href="index.html#lab/${l.id}">在主站打开此交互实验</a></p>`).join('')}</section><section class="chapter-print"><h1>八份源码逻辑导读</h1><p>摘编仅用于教学，省略上下文；完整实现与行号见原始链接。部分片段是头文件数学说明，不是完整可编译代码。</p>${Book.walkthroughs.map(w=>`<h2>${w.source} · ${esc(w.title)}</h2><pre><code>${esc(w.code)}</code></pre><ol>${w.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p>${esc(w.challenge)}</p>`).join('')}</section><section class="chapter-print"><h1>术语表</h1>${Book.glossary.map(t=>`<h3>${esc(t.en)} · ${esc(t.zh)}</h3><p>${esc(t.meaning)} <a href="#chapter-${t.chapter}">第 ${t.chapter} 章</a></p>`).join('')}</section><section class="chapter-print"><h1>来源与阅读范围</h1>${Book.sources.map(s=>`<h3>${s.id} · ${esc(s.title)}</h3><p>${esc(s.note)}</p><p class="metadata">${s.path?esc(s.path)+` · L${s.start}–L${s.end}<br>`:''}<a href="${esc(s.url)}">${esc(s.url)}</a></p>`).join('')}<p>本教材并非 Strata 官方作品或其作者背书；引用源码保留上游 MIT 许可。不附带模型权重、字体文件或全仓库。全文尚未经过正式同行外审。</p><h2>上游源码许可</h2><pre><code>${esc(Book.license)}</code></pre></section></body></html>`;
const dist = path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,'index.html'),html);
fs.writeFileSync(path.join(dist,'fullbook.html'),staticBook);
fs.mkdirSync(path.join(dist,'labs'),{recursive:true});
for(const n of ['tiny_inference.py','test_tiny_inference.py','README.md','benchmark_template.csv','benchmark_protocol.md']) fs.copyFileSync(path.join(root,'labs',n),path.join(dist,'labs',n));
fs.mkdirSync(path.join(dist,'licenses'),{recursive:true});
if(fs.existsSync(path.join(root,'licenses/Strata-MIT.txt')))fs.copyFileSync(path.join(root,'licenses/Strata-MIT.txt'),path.join(dist,'licenses/Strata-MIT.txt'));
const manifest={...Book.provenance,counts:{chapters:Book.chapters.length,quizzes:Book.chapters.reduce((a,c)=>a+c.quiz.length,0),openProblems:Book.chapters.length,labs:Book.labs.length,glossary:Book.glossary.length,sourceWindows:Book.sources.filter(s=>s.path).length},files:{}};
for(const n of ['index.html','fullbook.html'])manifest.files[n]={bytes:fs.statSync(path.join(dist,n)).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dist,n))).digest('hex')};
fs.writeFileSync(path.join(dist,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Built ${manifest.counts.chapters} chapters, ${manifest.counts.quizzes} quizzes, ${manifest.counts.labs} labs.`);
for(const [n,m] of Object.entries(manifest.files))console.log(`${n}: ${(m.bytes/1024).toFixed(1)} KiB / SHA256 ${m.sha256}`);
