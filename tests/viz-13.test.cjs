'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/13-hetero.math.js');

test('per-expert costs are bytes over bandwidth', () => {
  assert.equal(m.expertMs(m.CPU_GBPS).toFixed(4), '0.0346');
  assert.equal(m.expertMs(m.PCIE_GBPS).toFixed(4), '0.0219');
  assert.equal(m.expertMs(m.VRAM_GBPS).toFixed(4), '0.0021');
  assert.throws(() => m.expertMs(0));
});

test('all ten experts on the CPU: the CPU branch is the critical path', () => {
  const r = m.layer({ h: 0, f: 0, overlap: true });
  assert.equal(r.cpuN, 10);
  assert.equal(r.cpuMs.toFixed(4), (10 * 1.3824 / 40).toFixed(4));
  assert.equal(r.critical, 'cpu');
  assert.equal(r.totalMs.toFixed(4), (m.PRE_MS + r.cpuMs + m.POST_MS).toFixed(4));
  assert.equal(r.tokenMs.toFixed(3), (48 * r.totalMs).toFixed(3));
});

test('overlap takes the longer branch, serial adds both', () => {
  const o = m.layer({ h: 0.6, f: 0.3, overlap: true }), s = m.layer({ h: 0.6, f: 0.3, overlap: false });
  assert.equal(o.totalMs.toFixed(6), (m.PRE_MS + Math.max(o.cpuMs, o.gpuMs) + m.POST_MS).toFixed(6));
  assert.equal(s.totalMs.toFixed(6), (m.PRE_MS + s.cpuMs + s.gpuMs + m.POST_MS).toFixed(6));
  assert.ok(s.totalMs > o.totalMs);
  assert.equal(o.hits + o.pcieN + o.cpuN, 10);
  assert.throws(() => m.layer({ h: 1.5, f: 0 }));
});

test('a higher hit rate never makes the overlapped layer slower', () => {
  let prev = Infinity;
  for (let h = 0; h <= 1.0001; h += 0.1) { const t = m.layer({ h: Math.min(1, h), f: 0, overlap: true }).totalMs; assert.ok(t <= prev + 1e-12); prev = t; }
});

test('the balance point equalises the two branches and stays in [0, 1]', () => {
  const r = m.layer({ h: 0.6, f: 0 });
  const f = m.bestShare(0.6);
  assert.ok(f > 0 && f < 1);
  const b = m.layer({ h: 0.6, f });
  assert.ok(Math.abs(b.cpuMs - b.gpuMs) < 1e-9);
  for (const g of [0, 0.1, 0.3, 0.7, 0.9, 1]) assert.ok(m.layer({ h: 0.6, f: g }).totalMs >= b.totalMs - 1e-12);
  assert.ok(b.totalMs < r.totalMs);
  assert.equal(m.bestShare(1), 0);
  // the textbook two-branch formula f = Bp / (Bc + Bp) when the GPU has nothing else to do
  assert.equal(m.splitFormula(40, 20).toFixed(4), (1 / 3).toFixed(4));
});

test('SIMD steps: scalar n, vector ceil(n / lanes), dependent chain n', () => {
  assert.equal(m.steps(16, 'scalar'), 16);
  assert.equal(m.steps(16, 'simd', 16), 1);
  assert.equal(m.steps(20, 'simd', 16), 2);
  assert.equal(m.steps(16, 'chain', 16), 16);
  const v = m.simdDemo();
  assert.equal(v.a.length, 16);
  assert.deepEqual(v.sum, v.a.map((x, i) => x + v.b[i]));
  for (let i = 1; i < 16; i++) assert.equal(v.chain[i], v.chain[i - 1] + v.a[i]);
  assert.equal(v.chain[0], v.a[0]);
});
