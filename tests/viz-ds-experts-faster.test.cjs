'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/ds-experts-faster.math.js');

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('ledger constants match page section 2.1', () => {
  assert.equal(m.TOTAL_EXPERTS, 40 * 384);
  assert.equal(m.TOTAL_EXPERTS, 15360);
  assert.equal(m.EXPERT_MB.q8, 18.8);
  assert.equal(m.EXPERT_MB.bit2, 8.6);
  assert.equal(m.FULL_K, 6);
  assert.equal(m.FASTER_K, 5);
  // 15,360 x 18.8 MB = 288.8 GB (rounded)
  near(m.totalGB('q8'), 288.8, 0.05);
  // 2-bit set: about 132 GB
  near(m.totalGB('bit2'), 132, 0.2);
});

test('graphics memory budget follows the 600 MiB reserve rule', () => {
  assert.equal(m.vramBudgetMB(0), 0);
  assert.equal(m.vramBudgetMB(0.5), 0); // below the reserve: nothing left
  assert.equal(m.vramBudgetMB(600 / 1024), 0);
  // 12 GiB free: (12 * 1024 - 600) MiB = 11688 MiB
  near(m.vramBudgetMB(12), 11688 * 1048576 / 1e6, 1e-6);
  // --vram-experts scales the budget
  near(m.vramBudgetMB(12, 0.5), m.vramBudgetMB(12) / 2, 1e-6);
  assert.ok(m.vramBudgetMB(24) > m.vramBudgetMB(12));
});

test('resident experts are whole experts and never exceed the total', () => {
  assert.equal(m.residentExperts(0, 'q8'), 0);
  assert.equal(m.residentExperts(12, 'q8'), Math.floor(m.vramBudgetMB(12) / 18.8));
  assert.equal(m.residentExperts(12, 'q8'), 651);
  assert.ok(m.residentExperts(12, 'bit2') > m.residentExperts(12, 'q8'));
  assert.equal(m.residentExperts(1000, 'q8'), m.TOTAL_EXPERTS);
  assert.equal(m.residentExperts(m.MAX_FREE_GIB, 'q8'), m.TOTAL_EXPERTS);
  assert.equal(m.residentShare(0, 'q8'), 0);
  assert.equal(m.residentShare(1000, 'bit2'), 1);
  near(m.residentShare(12, 'q8'), 651 / 15360, 1e-12);
});

test('word bill: nothing resident means every selected expert is read from RAM or SSD', () => {
  const full = m.wordBill(6, 0, 'q8');
  near(full.totalMB, 112.8);
  near(full.offMB, 112.8);
  assert.equal(full.offShare, 1);
  const fast = m.wordBill(5, 0, 'q8');
  near(fast.totalMB, 94);
  near(fast.offMB, 94);
});

test('word bill: the off-card part is bytes x (1 - resident share)', () => {
  const b = m.wordBill(6, 12, 'q8');
  near(b.totalMB, 112.8);
  near(b.offShare, 1 - 651 / 15360, 1e-12);
  near(b.offMB, 112.8 * (1 - 651 / 15360), 1e-9);
  near(b.residentMB, b.totalMB - b.offMB, 1e-9);
  // everything resident: nothing to read from RAM or SSD
  const all = m.wordBill(6, 1000, 'q8');
  assert.equal(all.offMB, 0);
  assert.equal(all.offShare, 0);
  near(all.residentMB, 112.8);
});

test('default state equals the static figure DS2-4', () => {
  assert.equal(m.DEFAULT_FREE_GIB, 0);
  assert.equal(m.DEFAULT_SET, 'q8');
  const c = m.compare(m.DEFAULT_FREE_GIB, m.DEFAULT_SET);
  near(c.full.offMB, 112.8);
  near(c.faster.offMB, 94);
  near(c.savedMB, 18.8);
  near(c.savedPct, -1 / 6);
  assert.equal(c.savedPct.toFixed(3), '-0.167');
  // bar widths in the figure: 376 and 313 (94 / 112.8 x 376 = 313.3)
  assert.equal(Math.round(c.faster.offMB / c.full.offMB * 376), 313);
});

test('saving is one expert in six of the off-card bytes, for any file set and memory size', () => {
  for (const set of ['q8', 'bit2']) for (const gib of [0, 1, 12, 24, 48, 128, 200]) {
    const c = m.compare(gib, set);
    if (c.full.offMB > 0) near(c.savedPct, -1 / 6, 1e-12);
    near(c.savedMB, c.full.offMB - c.faster.offMB, 1e-9);
    assert.ok(c.savedMB >= 0);
  }
  // all resident: no saving to report
  const all = m.compare(m.MAX_FREE_GIB, 'q8');
  assert.equal(all.savedMB, 0);
  assert.equal(all.savedPct, 0);
  // the 2-bit set has the same -1/6 but smaller bytes
  near(m.compare(0, 'bit2').full.offMB, 51.6);
  near(m.compare(0, 'bit2').savedMB, 8.6);
});

test('more graphics memory never increases the bytes read from RAM or SSD', () => {
  let prev = Infinity;
  for (let g = 0; g <= m.MAX_FREE_GIB; g += 4) {
    const off = m.wordBill(6, g, 'q8').offMB;
    assert.ok(off <= prev + 1e-9);
    prev = off;
  }
  assert.equal(prev, 0);
});

test('invalid input is rejected', () => {
  assert.throws(() => m.vramBudgetMB(-1));
  assert.throws(() => m.vramBudgetMB(NaN));
  assert.throws(() => m.vramBudgetMB(Infinity));
  assert.throws(() => m.vramBudgetMB(12, 1.5));
  assert.throws(() => m.vramBudgetMB(12, -0.1));
  assert.throws(() => m.residentExperts(12, 'q4'));
  assert.throws(() => m.wordBill(0, 0, 'q8'));
  assert.throws(() => m.wordBill(5.5, 0, 'q8'));
  assert.throws(() => m.wordBill(385, 0, 'q8'));
  assert.throws(() => m.compare('x', 'q8'));
});
