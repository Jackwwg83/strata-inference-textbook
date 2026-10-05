'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),load=n=>JSON.parse(fs.readFileSync(path.join(root,'content',n+'.json'),'utf8'));
const chapters=load('chapters'),sources=load('sources'),labs=load('labs'),tracks=load('tracks'),sourceIDs=new Set(sources.map(s=>s.id));
test('28 complete chapters with learning goals, references, quizzes and open problems',()=>{
 assert.equal(chapters.length,28);assert.equal(new Set(chapters.map(c=>c.id)).size,28);
 chapters.forEach((c,i)=>{
  assert.equal(c.id,String(i+1).padStart(2,'0'));assert.ok(c.courses.length>=2);assert.equal(c.goals.length,3);assert.ok(c.prereq);
  assert.equal(c.quiz.length,3);c.quiz.forEach(q=>{assert.equal(q.choices.length,3);assert.ok(q.correct>=0&&q.correct<3);assert.ok(q.why.length>10);});
  assert.ok(c.problem.length>10);assert.ok(c.answer.length>20);
  const html=fs.readFileSync(path.join(root,'content/chapters',c.id+'.html'),'utf8');
  assert.ok((html.match(/<h2/g)||[]).length>=5,c.id+' needs explanatory sections');
  assert.ok(html.length>1500,c.id+' has no substantive body');
  for(const id of c.sources)assert.ok(sourceIDs.has(id),c.id+' '+id);
  for(const [,id] of html.matchAll(/\[((?:S|R)\d{2})\]/g))assert.ok(sourceIDs.has(id),c.id+' '+id);
  if(c.lab)assert.ok(labs.some(l=>l.id===c.lab));
  assert.ok(!/<script\b|onerror\s*=|TODO|待补充/.test(html));
 });
});
test('14 labs, 3 non-destructive paths and 16-week curriculum',()=>{
 assert.equal(labs.length,14);assert.equal(new Set(labs.map(l=>l.id)).size,14);assert.equal(tracks.length,3);
 for(const l of labs){assert.ok(l.assumptions&&l.task);for(const id of l.chapters)assert.ok(chapters.some(c=>c.id===id));}
 for(const t of tracks)for(const id of t.chapters)assert.ok(chapters.some(c=>c.id===id));
 const w=load('weeks');assert.equal(w.length,16);w.forEach((x,i)=>assert.equal(x.week,i+1));
 assert.equal(load('glossary').length,74);assert.equal(load('walkthroughs').length,8);
});
test('source URLs immutable for repository windows and scope explicit',()=>{
 const p=load('provenance');assert.match(p.commit,/^[0-9a-f]{40}$/);assert.ok(p.scope.includes('未编译运行'));
 assert.equal(sources.filter(s=>s.path).length,19);
 for(const s of sources){assert.match(s.url,/^https:\/\//);if(s.path){assert.ok(s.url.includes(p.commit));assert.ok(s.start>=1&&s.end>=s.start);}}
});
test('build is standalone and no external runtime assets or inference APIs',()=>{
 const p=path.join(root,'dist/index.html');assert.ok(fs.existsSync(p),'npm run build first');const html=fs.readFileSync(p,'utf8');
 assert.equal((html.match(/id="book-data"/g)||[]).length,1);assert.ok(!/<script[^>]+src=|<link[^>]+href="https:/i.test(html));
 const data=JSON.parse(html.match(/<script id="book-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.chapters.length,28);assert.ok(data.assets['tiny_inference.py']);assert.ok(data.license.includes('Copyright (c) 2026 Niko1221'));
 for(const c of data.chapters)assert.ok(c.html&&c.plain);
 const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));assert.equal(config.outputDirectory,'dist');
});
test('all chapter static fullbook anchors unique and no script dependency',()=>{
 const html=fs.readFileSync(path.join(root,'dist/fullbook.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);assert.equal(ids.filter(id=>/^chapter-\d{2}$/.test(id)).length,28);assert.ok(!/<script\b/.test(html));
});
test('public edition states author, licenses, draft status and errata channel',()=>{
 const p=load('provenance');
 assert.match(p.author,/Jackwwg83/);assert.match(p.author,/AI 辅助编写/);
 assert.match(p.license,/CC BY-SA 4\.0/);assert.match(p.license,/MIT/);
 assert.match(p.issues,/^https:\/\/github\.com\/Jackwwg83\/strata-inference-textbook\/issues$/);
 for(const f of ['LICENSE','LICENSE-CONTENT.md'])assert.ok(fs.existsSync(path.join(root,f)),f+' missing');
 assert.match(fs.readFileSync(path.join(root,'LICENSE'),'utf8'),/MIT License[\s\S]*Jackwwg83/);
 assert.match(fs.readFileSync(path.join(root,'LICENSE-CONTENT.md'),'utf8'),/creativecommons\.org\/licenses\/by-sa\/4\.0/);
 const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
 assert.match(app,/class="draft-note"/,'every route needs the draft notice');
 const index=fs.readFileSync(path.join(root,'dist/index.html'),'utf8'),full=fs.readFileSync(path.join(root,'dist/fullbook.html'),'utf8');
 for(const html of [index,full]){assert.ok(html.includes(p.issues));assert.ok(html.includes('CC BY-SA 4.0'));}
 assert.ok(full.includes('AI 辅助编写')&&full.includes('Jackwwg83'));
});
test('header links to the repository and footer links the author profile',()=>{
 const p=load('provenance');
 assert.equal(p.repoUrl,'https://github.com/Jackwwg83/strata-inference-textbook');
 assert.equal(p.authorUrl,'https://github.com/Jackwwg83');
 const index=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert.match(index,/<a[^>]+class="icon-button github-link"[^>]+href="https:\/\/github\.com\/Jackwwg83\/strata-inference-textbook"/);
 const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
 assert.ok(app.includes('Book.provenance.authorUrl'),'footer must link the author profile');
});
test('client analytics is same-origin, opt-out aware and covers the three event types',()=>{
 const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
 assert.ok(app.includes("navigator.sendBeacon('/api/collect'"),'beacon must go to same-origin endpoint');
 assert.ok(app.includes("'strata-no-track'"),'owner opt-out flag');
 assert.ok(app.includes('navigator.doNotTrack')&&app.includes('globalPrivacyControl'),'respect DNT and GPC');
 for(const t of ["track('pageview'","track('chapter_done'","track('quiz_answer'"])assert.ok(app.includes(t),t);
 const index=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert.ok(!/https?:\/\/[^"']*\/api\/collect/.test(index),'no cross-origin collector');
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
 assert.equal(cfg.cleanUrls,true);
 assert.ok(cfg.headers.some(h=>h.source==='/api/(.*)'&&h.headers.some(x=>x.key==='Cache-Control'&&x.value==='no-store')));
 assert.ok(cfg.headers.some(h=>h.source==='/admin'&&h.headers.some(x=>x.key==='X-Robots-Tag')));
});
test('admin dashboard is built, self-contained and reads the stats API with a bearer token',()=>{
 const p=path.join(root,'dist/admin.html');assert.ok(fs.existsSync(p),'npm run build must emit admin.html');
 const html=fs.readFileSync(p,'utf8');
 assert.ok(!/<script[^>]+src=|<link[^>]+href="https?:/i.test(html),'no external assets');
 assert.ok(html.includes("'/api/stats?days='"));assert.ok(html.includes("'Bearer '"));
 assert.ok(html.includes('sessionStorage'),'token lives only in the session');
 assert.ok(html.includes("'strata-no-track'"),'owner can exclude this browser');
 assert.match(html,/<meta name="robots" content="noindex/);
});
test('rewritten chapters follow the enthusiast template and print their deep dives',()=>{
 const rewritten=chapters.filter(c=>fs.readFileSync(path.join(root,'content/chapters',c.id+'.html'),'utf8').includes('class="hook"'));
 assert.ok(rewritten.length>=2,'pilot chapters must use the template');
 for(const c of rewritten){
  const html=fs.readFileSync(path.join(root,'content/chapters',c.id+'.html'),'utf8');
  for(const cls of ['class="tldr"','class="recap"','class="myth"','<details class="deep">'])assert.ok(html.includes(cls),c.id+' missing '+cls);
  const svgs=[...html.matchAll(/<svg\b[^>]*>/g)].map(m=>m[0]);
  assert.ok(svgs.length>=5,c.id+' needs at least 5 figures, has '+svgs.length);
  assert.ok(html.includes('class="bridge"'),c.id+' needs a note for CS students');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]).filter(x=>!/^sec-\d+$/.test(x));
  for(const id of ids)assert.ok(id.startsWith('c'+c.id+'-'),c.id+' svg id must be chapter-scoped: '+id);
  for(const s of svgs){assert.match(s,/role="img"/);assert.match(s,/aria-label="[^"]+"/);assert.match(s,/viewBox="/);}
  // Every drawn shape carries a fill attribute, so the figure renders in the unstyled print book too.
  for(const [tag] of html.matchAll(/<(rect|text|circle|path)\b[^>]*>/g))assert.match(tag,/\bfill="/,c.id+' shape without fallback fill: '+tag.slice(0,60));
  for(const ev of html.matchAll(/class="ev ([a-z-]+)"/g))assert.ok(['ev-code','ev-report','ev-est'].includes(ev[1]),ev[1]);
 }
 const full=fs.readFileSync(path.join(root,'dist/fullbook.html'),'utf8');
 assert.ok(!full.includes('<details class="deep">'),'print book must open deep dives');
 assert.ok(full.includes('<details class="deep" open>'));
 const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
 assert.ok(app.includes('<details class="deep" open>'),'exported book must open deep dives too');
});
const LINK_HOSTS=require('../scripts/link-hosts.cjs');
test('primers explain CS foundations and cite only vetted public sources',()=>{
 const htmlOf=id=>fs.readFileSync(path.join(root,'content/chapters',id+'.html'),'utf8');
 const rewritten=chapters.filter(c=>htmlOf(c.id).includes('class="hook"'));
 for(const c of rewritten){
  const html=htmlOf(c.id);
  const primers=[...html.matchAll(/<aside class="primer" id="(c\d{2}-[a-z0-9-]+)">([\s\S]*?)<\/aside>/g)];
  assert.ok(primers.length>=1,c.id+' needs at least one CS primer');
  for(const [,id,body] of primers){assert.ok(id.startsWith('c'+c.id+'-'),id);assert.match(body,/class="further"/,id+' needs further reading');}
 }
 for(const c of chapters){
  const html=htmlOf(c.id);
  for(const [tag,href] of html.matchAll(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>/g)){
   const u=new URL(href);assert.equal(u.protocol,'https:',href);assert.ok(LINK_HOSTS.has(u.hostname),c.id+' unvetted host '+u.hostname);
   assert.match(tag,/target="_blank"/);assert.match(tag,/rel="noopener noreferrer"/);
  }
  for(const [,ch,id] of html.matchAll(/href="#chapter\/(\d{2})\/([a-z0-9-]+)"/g)){
   assert.ok(htmlOf(ch).includes('id="'+id+'"'),c.id+' links to missing anchor '+ch+'/'+id);
  }
 }
 const full=fs.readFileSync(path.join(root,'dist/fullbook.html'),'utf8');
 assert.ok(!/href="#chapter\//.test(full),'print book must rewrite in-app chapter links');
});
test('every interactive figure in the chapters has a registered widget and a static fallback',()=>{
 const vizDir=path.join(root,'src/viz');
 require(path.join(vizDir,'core.js'));
 const files=fs.readdirSync(vizDir).filter(f=>f.endsWith('.js')&&f!=='core.js').sort((a,b)=>(a.endsWith('.math.js')?0:1)-(b.endsWith('.math.js')?0:1)||a.localeCompare(b));
 for(const f of files)require(path.join(vizDir,f));
 const used=new Set();
 for(const c of chapters){
  const html=fs.readFileSync(path.join(root,'content/chapters',c.id+'.html'),'utf8');
  for(const m of html.matchAll(/<div class="viz" data-viz="([a-z0-9-]+)">([\s\S]*?)<\/figure><\/div>/g)){
   used.add(m[1]);
   assert.ok(globalThis.Viz.has(m[1]),c.id+' uses unregistered widget '+m[1]);
   assert.match(m[2],/^<figure class="fig"><svg\b/,c.id+' '+m[1]+' needs a static figure fallback');
  }
  const opened=(html.match(/<div class="viz"/g)||[]).length,closed=[...html.matchAll(/<div class="viz" data-viz="[a-z0-9-]+"><figure class="fig">[\s\S]*?<\/figure><\/div>/g)].length;
  assert.equal(opened,closed,c.id+' viz blocks must be <div class="viz" data-viz="…"><figure class="fig">…</figure></div>');
 }
 for(const name of globalThis.Viz.names())assert.ok(used.has(name),'widget '+name+' is registered but no chapter uses it');
});

test('a lab experiment asks one question, lets the reader guess, and runs a real widget',()=>{
  require(path.join(root,'src/viz/core.js'));
  const vizDir=path.join(root,'src/viz');
  for(const f of fs.readdirSync(vizDir).filter(f=>f.endsWith('.js')&&f!=='core.js').sort((a,b)=>(a.endsWith('.math.js')?0:1)-(b.endsWith('.math.js')?0:1)||a.localeCompare(b)))require(path.join(vizDir,f));
  const withExp=labs.filter(l=>l.experiment);
  assert.ok(withExp.length>=1,'at least one lab uses the experiment format');
  for(const l of withExp){
    const e=l.experiment;
    assert.ok(typeof e.question==='string'&&e.question.length>5,l.id+' question');
    assert.ok(Array.isArray(e.choices)&&e.choices.length===3,l.id+' needs 3 choices');
    assert.ok(Number.isInteger(e.correct)&&e.correct>=0&&e.correct<3,l.id+' correct index');
    assert.ok(Array.isArray(e.steps)&&e.steps.length>=2&&e.steps.length<=4,l.id+' needs 2-4 steps');
    assert.ok(globalThis.Viz.has(e.widget),l.id+' widget not registered: '+e.widget);
    assert.ok(typeof e.answer==='string'&&e.answer.length>20,l.id+' answer');
    if(e.extra!==undefined)assert.ok(typeof e.extra==='string'&&e.extra.length>4,l.id+' extra section title');
  }
});
