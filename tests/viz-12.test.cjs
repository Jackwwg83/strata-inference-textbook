'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/12-cache.math.js');

test('per-expert and whole-layer hit rates are different numbers', () => {
  assert.equal(m.expectedHits(0.7, 10), 7);
  assert.equal(m.layerAllHit(0.7, 10).toFixed(4), '0.0282');
  assert.equal(m.layerAllHit(1, 10), 1);
  assert.throws(() => m.layerAllHit(1.2, 10));
});

test('decay of 0.7 halves a count in about two adaptations and sums to 1/(1-0.7)', () => {
  assert.equal(m.halfLife(0.7).toFixed(2), '1.94');
  assert.equal(m.countSum(0.7).toFixed(2), '3.33');
  assert.throws(() => m.halfLife(1));
});

test('the routing trace is deterministic, k distinct experts per token', () => {
  const a = m.makeTrace({ seed: 3 }), b = m.makeTrace({ seed: 3 });
  assert.deepEqual(a.tokens, b.tokens);
  assert.equal(a.tokens.length, m.DEFAULTS.tokens);
  for (const t of a.tokens) { assert.equal(t.length, m.DEFAULTS.k); assert.equal(new Set(t).size, t.length); }
  assert.ok(a.tokens.every(t => t.every(e => e >= 0 && e < m.DEFAULTS.n)));
  const burst = m.makeTrace({ seed: 3, burst: true });
  assert.ok(burst.burstAt >= 0);
});

test('LRU evicts the least recently used; perfect LFU keeps old favourites', () => {
  const lru = m.makePolicy('lru', { cap: 2 });
  lru.token([1]); lru.token([2]); lru.token([1]);
  lru.token([3]);
  assert.deepEqual([...lru.resident()].sort(), [1, 3]);
  const lfu = m.makePolicy('lfu', { cap: 2 });
  lfu.token([1]); lfu.token([1]); lfu.token([1]); lfu.token([2]);
  lfu.token([3]);   // 2 and 3 both count 1: the older one (2) goes
  assert.deepEqual([...lfu.resident()].sort(), [1, 3]);
  lfu.token([3]); lfu.token([4]);
  assert.ok(lfu.resident().has(1), 'a key with a big history count is never the victim');
});

test('the decayed-count tier only changes residency at adaptation steps, with the upstream thresholds', () => {
  const d = m.makePolicy('decay', { cap: 2, every: 2, decay: 0.7, minCount: 2, margin: 1.5, maxSwaps: 4 });
  let r = d.token([5]);
  assert.equal(r.hits, 0);
  assert.equal(d.resident().size, 0, 'no admission on a miss');
  d.token([5]);          // second token: adaptation runs, 5 has count 2 -> admitted into a free slot
  assert.ok(d.resident().has(5));
  assert.equal(d.count(5).toFixed(2), (2 * 0.7).toFixed(2));
  r = d.token([5]);
  assert.equal(r.hits, 1);
  // a challenger must beat the weakest resident by the margin
  const e = m.makePolicy('decay', { cap: 1, every: 1, decay: 1, minCount: 2, margin: 1.5, maxSwaps: 4 });
  e.token([1]); e.token([1]);            // 1 admitted (count 2)
  e.token([2]); e.token([2]);            // 2 reaches 2: not >= 2 + 1.5
  assert.ok(e.resident().has(1));
  e.token([2]); e.token([2]);            // 2 reaches 4 >= 2 + 1.5 -> swap
  assert.ok(e.resident().has(2) && !e.resident().has(1));
  assert.throws(() => m.makePolicy('mru', { cap: 2 }));
});

test('on the default trace: LFU adapts slowest after the topic shift, decay is not worse than LRU overall', () => {
  const tr = m.makeTrace({ seed: 3 });
  const r = m.race(tr);
  const after = k => r[k].perToken.slice(tr.shiftAt, tr.shiftAt + 15).reduce((a, b) => a + b, 0);
  assert.ok(after('lfu') < after('lru'), 'LFU recovers slower than LRU');
  assert.ok(after('lfu') < after('decay'), 'LFU recovers slower than decay');
  assert.ok(r.decay.rate >= r.lru.rate - 0.02);
  for (const k of ['lru', 'lfu', 'decay']) assert.equal(r[k].perToken.length, tr.tokens.length);
});

test('a burst of rare tokens hurts LRU more than the decayed counts', () => {
  const plain = m.race(m.makeTrace({ seed: 3 }));
  const burst = m.race(m.makeTrace({ seed: 3, burst: true }));
  const lossLru = plain.lru.hits - burst.lru.hits, lossDecay = plain.decay.hits - burst.decay.hits;
  assert.ok(lossLru > lossDecay, `LRU loses ${lossLru}, decay ${lossDecay}`);
});

test('swap protocol: correct order never lets the GPU read a half-copied slot; the buggy order does', () => {
  const ok = m.swapTimeline(false), bad = m.swapTimeline(true);
  assert.equal(ok.length, bad.length);
  assert.ok(ok.every(s => s.correct));
  assert.ok(bad.some(s => !s.correct));
  const mid = ok.find(s => s.copied > 0 && s.copied < 1);
  assert.equal(mid.table112, -1);
  assert.equal(mid.who112, 'cpu');
  const badMid = bad.find(s => s.copied > 0 && s.copied < 1 && s.reads112);
  assert.equal(badMid.who112, 'gpu');
  assert.equal(badMid.correct, false);
  assert.equal(ok[ok.length - 1].table112, 5);
  assert.equal(ok[ok.length - 1].table331, -1);
});
