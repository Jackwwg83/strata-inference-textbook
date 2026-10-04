'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I18N = require('../src/i18n.js');

test('every UI language has exactly the Chinese keys with matching value types', () => {
  const zh = I18N.S.zh;
  for (const [lang, table] of Object.entries(I18N.S)) {
    if (lang === 'zh') continue;
    assert.deepEqual(Object.keys(table).sort(), Object.keys(zh).sort(), lang + ' key set differs from zh');
    for (const k of Object.keys(zh)) {
      assert.equal(typeof table[k], typeof zh[k], `${lang}.${k} type`);
      if (Array.isArray(zh[k])) assert.equal(table[k].length, zh[k].length, `${lang}.${k} length`);
      if (typeof zh[k] === 'function') assert.equal(table[k].length, zh[k].length, `${lang}.${k} arity`);
    }
    assert.ok(!/[一-鿿]/.test(JSON.stringify(table, (k, v) => (typeof v === 'function' ? String(v) : v))), lang + ' table must not contain Chinese characters');
  }
});

test('published languages have complete translated content', () => {
  const root = path.resolve(__dirname, '..');
  const cfgPath = path.join(root, 'content/i18n/languages.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const chapters = JSON.parse(fs.readFileSync(path.join(root, 'content/chapters.json'), 'utf8'));
  for (const [lang, c] of Object.entries(cfg)) {
    assert.ok(lang in I18N.S, lang + ' needs a UI string table');
    if (!c.published) continue;
    const dir = path.join(root, 'content/i18n', lang);
    for (const f of ['chapters.json', 'glossary.json', 'labs.json', 'tracks.json', 'sources.json', 'walkthroughs.json', 'courses.json', 'provenance.json']) assert.ok(fs.existsSync(path.join(dir, f)), `${lang}/${f}`);
    for (const ch of chapters) assert.ok(fs.existsSync(path.join(dir, 'chapters', ch.id + '.html')), `${lang}/chapters/${ch.id}.html`);
  }
});

test('lab page string tables match the Chinese keys', () => {
  require('../src/labs.js');
  const T = globalThis.LabViews.TABLE, zh = T.zh;
  const translatorKeys = new Set(['math', 'mathPatterns', 'names']);
  for (const [lang, table] of Object.entries(T)) {
    if (lang === 'zh') continue;
    assert.deepEqual(Object.keys(table).sort(), Object.keys(zh).sort(), 'labs ' + lang + ' key set differs from zh');
    for (const k of Object.keys(zh)) {
      assert.equal(typeof table[k], typeof zh[k], `labs ${lang}.${k} type`);
      if (Array.isArray(zh[k]) && !translatorKeys.has(k)) assert.equal(table[k].length, zh[k].length, `labs ${lang}.${k} length`);
      if (translatorKeys.has(k)) continue;
      assert.ok(!/[一-鿿]/.test(typeof table[k] === 'function' ? String(table[k]) : JSON.stringify(table[k])), `labs ${lang}.${k} contains Chinese`);
    }
  }
});

test('widget string tables keep the Chinese keys and arities in every language', () => {
  const fs2 = require('node:fs'), path2 = require('node:path');
  const dir = path2.resolve(__dirname, '../src/viz');
  require(path2.join(dir, 'core.js'));
  const files = fs2.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'core.js').sort((a, b) => (a.endsWith('.math.js') ? 0 : 1) - (b.endsWith('.math.js') ? 0 : 1) || a.localeCompare(b));
  for (const f of files) require(path2.join(dir, f));
  assert.ok(globalThis.Viz.tables.length > 0);
  for (const tables of globalThis.Viz.tables) {
    const zh = tables.zh;
    for (const [lang, t] of Object.entries(tables)) {
      if (lang === 'zh' || lang === 'en' && Object.keys(zh).length === 0) continue;
      assert.deepEqual(Object.keys(t).sort(), Object.keys(zh).sort(), `widget table ${lang} keys differ (first zh key: ${Object.keys(zh)[0]})`);
      for (const k of Object.keys(zh)) {
        assert.equal(typeof t[k], typeof zh[k], `widget ${lang}.${k} type`);
        if (typeof zh[k] === 'function') assert.equal(t[k].length, zh[k].length, `widget ${lang}.${k} arity`);
        if (Array.isArray(zh[k])) assert.equal(t[k].length, zh[k].length, `widget ${lang}.${k} length`);
        const text = typeof t[k] === 'function' ? String(t[k]) : JSON.stringify(t[k]);
        assert.ok(!/[一-鿿]/.test(text), `widget ${lang}.${k} contains Chinese`);
      }
    }
  }
});
