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
