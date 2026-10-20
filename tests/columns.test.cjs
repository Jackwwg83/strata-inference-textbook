'use strict';
// Columns (content/columns.json): short series of pages beside the book, e.g. the DeepInfer column.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const json = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const columns = json('content/columns.json');
const chapters = new Set(json('content/chapters.json').map(c => c.id));
const langs = Object.entries(json('content/i18n/languages.json')).filter(([, c]) => c.published).map(([l]) => l);
const pageFile = (lang, col, page) => path.join(root, lang === 'zh' ? 'content/columns' : `content/i18n/${lang}/columns`, col, page + '.html');

test('every column names a pinned upstream commit and pages that point at real chapters', () => {
  assert.equal(new Set(columns.map(c => c.id)).size, columns.length);
  for (const c of columns) {
    assert.match(c.id, /^[a-z]+$/, c.id);
    assert.ok(!['home', 'chapter', 'labs', 'lab', 'map', 'sources', 'source', 'teacher', 'glossary', 'notes', 'changelog'].includes(c.id), c.id + ' collides with a built-in route');
    assert.match(c.prefix, /^[a-z]{2,4}$/);
    assert.match(c.upstream.commit, /^[0-9a-f]{40}$/);
    assert.match(c.upstream.url, /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
    for (const k of ['nav', 'title', 'deck']) assert.ok(c[k] && c[k].length > 1, c.id + '.' + k);
    assert.equal(new Set(c.pages.map(p => p.id)).size, c.pages.length);
    for (const p of c.pages) {
      assert.match(p.id, /^[a-z][a-z-]{1,19}$/, p.id);
      assert.ok(p.title && p.deck, p.id);
      assert.ok(p.chapters.length >= 1 && p.chapters.every(id => chapters.has(id)), p.id + ' chapters');
    }
  }
});

test('every written column page passes the page checker in every published language', () => {
  for (const c of columns) for (const p of c.pages) {
    if (!fs.existsSync(pageFile('zh', c.id, p.id))) continue;
    for (const lang of ['zh', ...langs]) {
      if (lang !== 'zh') assert.ok(fs.existsSync(pageFile(lang, c.id, p.id)), `${lang} translation of ${c.id}/${p.id}`);
      let out = '';
      try { out = execFileSync('node', ['scripts/check-chapter.cjs', `${c.id}/${p.id}`, '--lang', lang], { cwd: root, encoding: 'utf8' }); } catch (e) { out = e.stdout; assert.fail(`${lang} ${c.id}/${p.id}:\n${out}`); }
      assert.match(out, /all checks passed/);
    }
  }
});

test('published translations carry the column titles for every page', () => {
  for (const lang of langs) {
    const tr = json(`content/i18n/${lang}/columns.json`);
    for (const c of columns) {
      const t = tr.find(x => x.id === c.id);
      assert.ok(t, `${lang} column ${c.id}`);
      for (const k of ['nav', 'title', 'deck']) assert.ok(typeof t[k] === 'string' && t[k].length > 1, `${lang} ${c.id}.${k}`);
      for (const p of c.pages) {
        const tp = (t.pages || []).find(x => x.id === p.id);
        assert.ok(tp && tp.title && tp.deck, `${lang} ${c.id}/${p.id} title and deck`);
        if (lang !== 'ja') assert.ok(!/[一-鿿]/.test(tp.title + tp.deck), `${lang} ${c.id}/${p.id} contains Chinese`);
      }
    }
  }
});

test('the built site routes, lists and prints the column pages', () => {
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const data = JSON.parse(html.match(/<script id="book-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const full = fs.readFileSync(path.join(root, 'dist/fullbook.html'), 'utf8');
  for (const c of data.columns) {
    assert.ok(html.includes(`<a href="#${c.id}" data-view="${c.id}">`), 'top navigation links ' + c.id);
    for (const p of c.pages) {
      assert.ok(p.html && p.plain, p.id);
      assert.ok(full.includes(`id="${c.id}-${p.id}"`), 'print book has ' + p.id);
    }
  }
  assert.ok(!/href="#deepinfer\//.test(full), 'print book must rewrite in-app column links');
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  for (const f of ['function columnPage(', 'function bindColumn(', 'columnSide(current)', 'columnCards()', 'colHits']) assert.ok(app.includes(f), f);
});
