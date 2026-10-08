'use strict';
// The book's own changelog (English only). The book version follows the pinned Strata version; a book-only
// update between upstream releases adds a revision suffix: 0.1.39, then 0.1.39-2, 0.1.39-3, ...
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const load = n => JSON.parse(fs.readFileSync(path.join(root, 'content', n + '.json'), 'utf8'));
const log = load('changelog'), prov = load('provenance'), chapters = new Set(load('chapters').map(c => c.id));
const VERSION = /^(\d+\.\d+\.\d+(?:\.\d+)?)(?:-([2-9]|[1-9]\d+))?$/;
const TYPES = new Set(['upstream', 'content', 'feature', 'fix', 'privacy']);

test('changelog entries are newest first with unique, well-formed versions', () => {
  assert.ok(log.length >= 1);
  assert.equal(new Set(log.map(e => e.version)).size, log.length);
  for (const e of log) {
    assert.match(e.version, VERSION, e.version);
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, e.version);
    assert.ok(e.title && e.summary, e.version);
  }
  for (let i = 1; i < log.length; i++) assert.ok(log[i - 1].date >= log[i].date, `${log[i - 1].version} before ${log[i].version}`);
});

test('each book version names the Strata release it is pinned to', () => {
  for (const e of log) {
    const [, base, rev] = VERSION.exec(e.version);
    assert.equal(e.strata.version, 'v' + base, e.version);
    assert.match(e.strata.commit, /^[0-9a-f]{40}$/, e.version);
    // A revision shares its pin with the release it revises.
    if (rev) assert.ok(log.some(o => o.version === (+rev === 2 ? base : `${base}-${rev - 1}`) && o.strata.commit === e.strata.commit), e.version);
  }
});

test('the newest entry is the version and pin the book shows', () => {
  assert.equal(log[0].version, prov.edition);
  assert.equal(log[0].strata.commit, prov.commit);
  assert.equal(log[0].date, prov.date);
});

test('changes are typed, point at real chapters and are written in English', () => {
  for (const e of log) {
    assert.ok(e.changes.length >= 1, e.version);
    for (const c of e.changes) {
      assert.ok(TYPES.has(c.type), `${e.version}: ${c.type}`);
      for (const id of c.chapters || []) assert.ok(chapters.has(id), `${e.version}: chapter ${id}`);
    }
    const text = JSON.stringify(e);
    assert.doesNotMatch(text, /[぀-ヿ㐀-鿿가-힯؀-ۿ]/, e.version + ' must be English');
  }
});
