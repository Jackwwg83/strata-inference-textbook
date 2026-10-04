'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/11-ple.math.js');

test('table geometry matches the pinned headers', () => {
  assert.equal(m.ROWS_PER_TOKEN, 16);
  assert.equal(m.ROWS_PER_TOKEN * m.HEAD_DIM, 2560);
  assert.equal(m.tableBytes(), 320001536 * 90);
  assert.equal((m.tableBytes() / 1e9).toFixed(1), '28.8');
  assert.equal((m.tableBytes() / 2 ** 30).toFixed(1), '26.8');
  assert.equal(m.CACHE_ROWS, 1048576);
  assert.equal(m.CACHE_ROWS / m.WAYS, 131072);
  assert.equal(Math.round(m.CACHE_ROWS * m.ROW_BYTES / 1e6), 94);
});

test('a row maps to one page, or two when it straddles a boundary', () => {
  assert.deepEqual(m.pagesForRow(0), { first: 0, length: 4096, pages: 1 });
  assert.deepEqual(m.pagesForRow(4006), { first: 0, length: 4096, pages: 1 });
  assert.deepEqual(m.pagesForRow(4007), { first: 0, length: 8192, pages: 2 });
  assert.deepEqual(m.pagesForRow(4000, 200), { first: 0, length: 8192, pages: 2 });
  assert.deepEqual(m.pagesForRow(8192 + 10), { first: 8192, length: 4096, pages: 1 });
});

test('about 2% of 90-byte rows straddle a 4 KiB page', () => {
  const even = m.straddleFraction(90, 4096, 0);
  assert.equal(even.period, 2048);
  assert.equal(even.straddling, 44);
  const odd = m.straddleFraction(90, 4096, 1);
  assert.equal(odd.straddling, 45);
  assert.ok(even.fraction > 0.02 && odd.fraction < 0.023);
});

test('one token that misses every row reads 45.5 times the useful bytes', () => {
  const r = m.tokenRead(16, 0);
  assert.equal(r.useful, 1440);
  assert.equal(r.read, 65536);
  assert.equal(r.amplification.toFixed(1), '45.5');
  assert.equal(m.tokenRead(16, 16).read, 0);
  assert.equal(m.tokenRead(16, 4, 1).read, 13 * 4096);
});

test('toy n-gram hash follows the upstream rules', () => {
  const T = m.TOY;
  const a = m.toyRows(T.ids.cat, [T.ids.i, T.ids.like]);
  assert.equal(a.rows.length, 2 * T.HEADS);
  assert.deepEqual(a.ctx, [T.ids.cat, T.ids.like, T.ids.i]);
  // deterministic
  assert.deepEqual(m.toyRows(T.ids.cat, [T.ids.i, T.ids.like]).rows, a.rows);
  // changing the oldest token keeps the bigram rows and changes the trigram mix
  const b = m.toyRows(T.ids.cat, [T.ids.you, T.ids.like]);
  assert.deepEqual(b.rows.slice(0, T.HEADS), a.rows.slice(0, T.HEADS));
  assert.notEqual(b.mixed[1], a.mixed[1]);
  // every row lands inside its own head's block
  a.rows.forEach((r, h) => { assert.ok(r >= T.offsets[h] && r < T.offsets[h] + T.mods[h]); });
  // missing predecessors and EOS cut everything older
  const start = m.toyRows(T.ids.i, [-1, -1]);
  assert.deepEqual(start.ctx, [T.ids.i, T.EOS, T.EOS]);
  const cut = m.toyRows(T.ids.cat, [T.ids.like, T.EOS]);
  assert.deepEqual(cut.ctx, [T.ids.cat, T.EOS, T.EOS]);
  const own = m.toyRows(T.EOS, [T.ids.i, T.ids.like]);
  assert.deepEqual(own.ctx, [T.EOS, T.ids.like, T.ids.i]);
  // XOR, not sum: two equal products cancel
  assert.equal(m.toyMixed([5, 5], [7, 7]), 0);
});

test('8-way round robin thrashes on 9 keys of one set, LRU over all slots does not', () => {
  const trace = m.conflictTrace();
  assert.equal(trace.length, 36);
  const rr = m.runTrace(m.makeCache({ sets: 2, ways: 8, policy: 'rr' }), trace);
  const lru = m.runTrace(m.makeCache({ sets: 1, ways: 16, policy: 'lru' }), trace);
  assert.equal(rr.hits, 0);
  assert.equal(lru.hits, 27);
  assert.equal(lru.misses, 9);
});

test('round robin replaces the way its pointer names and then advances', () => {
  const c = m.makeCache({ sets: 2, ways: 2, policy: 'rr' });
  assert.deepEqual(c.access(1), { hit: false, set: 1, way: 0, evicted: null });
  assert.deepEqual(c.access(3), { hit: false, set: 1, way: 1, evicted: null });
  assert.equal(c.access(1).hit, true);
  // a hit does not move the pointer: the next miss still replaces way 0
  assert.deepEqual(c.access(5), { hit: false, set: 1, way: 0, evicted: 1 });
  assert.equal(c.next[1], 1);
  assert.equal(c.access(2).set, 0);
  const lru = m.makeCache({ sets: 1, ways: 2, policy: 'lru' });
  lru.access(1); lru.access(2); lru.access(1);
  assert.equal(lru.access(3).evicted, 2);
  assert.throws(() => m.makeCache({ sets: 0, ways: 8, policy: 'rr' }));
});

test('the hot trace is deterministic and rewards any cache', () => {
  const t1 = m.hotTrace(7), t2 = m.hotTrace(7);
  assert.deepEqual(t1, t2);
  assert.equal(t1.length, 48);
  const rr = m.runTrace(m.makeCache({ sets: 2, ways: 8, policy: 'rr' }), t1);
  assert.ok(rr.hits / t1.length > 0.5);
});
