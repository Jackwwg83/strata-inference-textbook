'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const m = require('../src/viz/di-overview.math.js');

const root = path.resolve(__dirname, '..');

test('release status matches README "not included" and the repository tree', () => {
  // README L38-L42: KV cache system, E/P/D disaggregation, DP load balancing are not included.
  assert.deepEqual(m.countByStatus(), { open: 1, partial: 3, separate: 1, closed: 5 });
  assert.equal(m.byId('eplb').status, 'open');
  for (const id of ['kv', 'plb', 'dlb', 'vlb']) assert.equal(m.byId(id).status, 'closed', id);
  for (const id of ['ve', 'prefill', 'decode']) assert.equal(m.byId(id).status, 'partial', id);
  assert.equal(m.byId('recipe').status, 'separate');
  assert.throws(() => m.countByStatus([{ id: 'x', status: 'maybe' }]));
});

test('the Q&A names four load balancers and only EPLB ships', () => {
  assert.deepEqual(m.balancersOpen(), { open: 1, total: 4 });
  assert.deepEqual(m.BLOCKS.filter(b => b.kind === 'lb').map(b => b.id).sort(), ['dlb', 'eplb', 'plb', 'vlb']);
});

test('a request path visits every block and only known ones', () => {
  assert.equal(m.PATH.length, 8);
  const ids = new Set(m.BLOCKS.map(b => b.id));
  assert.equal(ids.size, m.BLOCKS.length, 'block ids are unique');
  for (const step of m.PATH) for (const id of step) assert.ok(ids.has(id), 'unknown block in path: ' + id);
  assert.deepEqual([...m.visited()].sort(), [...ids].sort());
  // Only a request with images reaches the VE balancer and the vision encoder.
  assert.deepEqual(m.PATH[m.IMAGE_STEP], ['vlb', 've']);
  const text = m.visited(m.PATH, { images: false });
  assert.equal(text.length, 8);
  assert.ok(!text.includes('ve') && !text.includes('vlb'));
  assert.equal(m.visited()[0], 'recipe');
  assert.deepEqual(m.PATH[m.PATH.length - 1], ['entry', 'recipe'], 'the answer goes back the way it came');
});

test('every block points at an existing column page and existing chapters', () => {
  const cols = JSON.parse(fs.readFileSync(path.join(root, 'content/columns.json'), 'utf8'));
  const pages = cols.find(c => c.id === 'deepinfer').pages.map(p => p.id);
  assert.deepEqual(m.PAGES, pages);
  for (const b of m.BLOCKS) {
    assert.ok(m.STATUS.includes(b.status), b.id);
    assert.ok(pages.includes(b.page), b.id + ' page ' + b.page);
    assert.ok(b.chapters.length >= 1, b.id);
    for (const ch of b.chapters) assert.ok(fs.existsSync(path.join(root, 'content/chapters', ch + '.html')), b.id + ' chapter ' + ch);
  }
});
