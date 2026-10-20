'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/di-wide-ep.math.js');

test('redundant experts round up like resolve_num_extra_experts in eplb/__init__.py', () => {
  // padding = -(routed + min) % ep, Python modulo (never negative)
  assert.equal(m.resolveExtra(384, 64, 64), 64);
  assert.equal(m.resolveExtra(384, 32, 64), 64);
  assert.equal(m.resolveExtra(384, 32, 128), 128);
  assert.equal(m.resolveExtra(384, 32, 8), 32);
  assert.equal(m.resolveExtra(384, 0, 8), 0);
  assert.equal(m.resolveExtra(16, 4, 4), 4);
  assert.equal(m.resolveExtra(16, 1, 4), 4);
  assert.equal(m.resolveExtra(10, 0, 4), 2);
  assert.throws(() => m.resolveExtra(384, -1, 8));
  assert.throws(() => m.resolveExtra(384, 1, 0));
  assert.throws(() => m.resolveExtra(384.5, 1, 8));
});

test('experts per card at each EP width', () => {
  // Q&A decode setting: at least one redundant expert per card. Q&A: "at EP64 ... 7 experts per GPU".
  assert.deepEqual(m.EP_WIDTHS.map(ep => m.layout(ep, 'perCard').local), [49, 25, 13, 7, 4]);
  // Example scripts: lower bound of 32 in total. Chart legend: EP8 "384+32", EP64 "384+64".
  assert.deepEqual(m.EP_WIDTHS.map(ep => m.layout(ep, 'fixed32').local), [52, 26, 13, 7, 4]);
  assert.equal(m.layout(8, 'fixed32').physical, 416);
  assert.equal(m.layout(64, 'fixed32').physical, 448);
  for (const ep of m.EP_WIDTHS) for (const mode of ['perCard', 'fixed32']) {
    const l = m.layout(ep, mode);
    assert.equal(l.physical % ep, 0);
    assert.ok(l.extra >= l.minExtra);
    assert.equal(l.physical, m.LOGICAL + l.extra);
  }
  assert.throws(() => m.layout(8, 'other'));
});

test('per-step traffic estimate: weight reads shrink, all-to-all per card does not', () => {
  const a = m.stepTraffic(8, 384, 'perCard');
  const b = m.stepTraffic(64, 384, 'perCard');
  const c = m.stepTraffic(128, 384, 'perCard');
  assert.equal(a.weightVsEp8, 1);
  assert.equal(b.weightVsEp8, 7 / 49);
  assert.equal(c.weightVsEp8, 4 / 49);
  // tokens per expert copy per step = T * k / local (shown as a multiple of k)
  assert.equal(b.tokensPerCopyPerK, 384 / 7);
  assert.ok(b.tokensPerCopyPerK / a.tokensPerCopyPerK === 7);
  // vectors sent per card per step = T * k * (EP - 1) / EP (shown as a multiple of k)
  assert.equal(a.dispatchPerK, 336);
  assert.equal(b.dispatchPerK, 378);
  assert.equal(c.dispatchPerK, 381);
  assert.throws(() => m.stepTraffic(8, 0, 'perCard'));
});

test('initial physical map copies experts 0, 1, 2 ... into the extra slots', () => {
  assert.deepEqual(m.initialMap(4, 6), [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]);
  assert.deepEqual(m.initialMap(3, 0), [0, 1, 2]);
});

test('replication gives the extra copies to the hottest experts first', () => {
  const tokens = [[100, 10, 10, 10], [100, 10, 10, 10]];
  const r = m.replicate(tokens, 6);
  assert.deepEqual(r.phys.slice(0, 4), [0, 1, 2, 3]);
  assert.deepEqual(r.phys.slice(4), [0, 0]);
  assert.deepEqual(r.count, [3, 1, 1, 1]);
  const none = m.replicate(tokens, 4);
  assert.deepEqual(none.count, [1, 1, 1, 1]);
});

test('placement fills every card to capacity and spreads the copies', () => {
  const tokens = [[100, 10, 10, 10], [100, 10, 10, 10]];
  const r = m.replicate(tokens, 6);
  const placed = m.place(tokens, r.phys, r.count, 3);
  assert.equal(placed.length, 6);
  assert.deepEqual([...placed].sort((x, y) => x - y), [...r.phys].sort((x, y) => x - y));
  // the three copies of expert 0 must not share one card
  const cards = [placed.slice(0, 3), placed.slice(3)];
  assert.ok(cards.every(c => c.includes(0)));
});

test('rebalance lowers moe_lb on the window it learned from', () => {
  const data = m.toyLoads({ seed: 7 });
  assert.equal(data.tokens.length, m.TOY.steps);
  assert.equal(data.tokens[0].length, m.TOY.experts);
  const before = m.cardLoads(data.tokens, m.initialMap(m.TOY.experts, m.TOY.extra), m.TOY.capacity);
  const after = m.rebalance(data.tokens, m.TOY.experts + m.TOY.extra, m.TOY.capacity);
  const afterLoads = m.cardLoads(data.tokens, after.phys, m.TOY.capacity);
  const lbBefore = m.moeLb(before), lbAfter = m.moeLb(afterLoads);
  assert.ok(lbBefore > 1.5, 'default hot experts sit on one card: ' + lbBefore);
  assert.ok(lbAfter < 1.2, 'rebalanced: ' + lbAfter);
  assert.ok(lbAfter >= 1);
  // total tokens are conserved by the even split over copies
  const sum = rows => rows.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0);
  assert.ok(Math.abs(sum(before) - sum(afterLoads)) < 1e-6);
  assert.ok(Math.abs(sum(before) - sum(data.tokens)) < 1e-6);
});

test('moe_lb is sum of slowest card over sum of mean card, like stats_logger', () => {
  assert.equal(m.moeLb([[10, 10], [5, 5]]), 1);
  assert.equal(m.moeLb([[30, 10], [10, 10]]), (30 + 10) / (20 + 10));
  assert.throws(() => m.moeLb([]));
});

test('toy data is deterministic per seed and puts the default hot set on card 1', () => {
  assert.deepEqual(m.toyLoads({ seed: 3 }), m.toyLoads({ seed: 3 }));
  assert.notDeepEqual(m.toyLoads({ seed: 3 }).tokens, m.toyLoads({ seed: 4 }).tokens);
  assert.deepEqual(m.toyLoads({ seed: 1 }).hot, [5, 6, 7]);
  const shuffled = m.toyLoads({ seed: 9, randomHot: true });
  assert.equal(new Set(shuffled.hot).size, 3);
  assert.ok(shuffled.hot.every(h => h >= 0 && h < m.TOY.experts));
});
