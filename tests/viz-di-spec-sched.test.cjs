'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/di-spec-sched.math.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('synchronous loop: GPU waits for every CPU block, period = cpu + gpu', () => {
  const r = m.timeline({ cpuMs: 4, gpuMs: 10, steps: 5, mode: 'sync' });
  assert.equal(r.gpu.length, 5);
  assert.equal(r.total, 5 * (4 + 10));
  assert.equal(r.period, 14);
  assert.equal(r.gpuIdle, 5 * 4);
  for (let k = 1; k < 5; k++) assert.equal(r.gpu[k].start - r.gpu[k - 1].end, 4, 'gap = cpu time');
  for (let k = 0; k < 5; k++) assert.equal(r.cpu[k].end, r.gpu[k].start, 'GPU starts when CPU is done');
});

test('asynchronous loop hides CPU time when CPU <= GPU: no gap after the first step', () => {
  const r = m.timeline({ cpuMs: 4, gpuMs: 10, steps: 5, mode: 'async' });
  assert.equal(r.period, 10);
  assert.equal(r.total, 4 + 10 + 4 * 10);
  for (let k = 1; k < 5; k++) assert.equal(r.gpu[k].start, r.gpu[k - 1].end, 'back to back');
  // CPU is at most one step ahead: it prepares step k while the GPU runs step k-1.
  for (let k = 1; k < 5; k++) assert.ok(r.cpu[k].start >= r.gpu[k - 1].start);
  assert.equal(r.gpuIdle, 4, 'only the pipeline fill');
});

test('asynchronous loop cannot hide a CPU that is slower than the GPU', () => {
  const r = m.timeline({ cpuMs: 12, gpuMs: 8, steps: 4, mode: 'async' });
  assert.equal(r.period, 12);
  assert.equal(r.total, 12 + 8 + 3 * 12);
  for (let k = 1; k < 4; k++) assert.equal(r.gpu[k].start - r.gpu[k - 1].end, 4, 'gap = cpu - gpu');
  for (let k = 1; k < 4; k++) assert.equal(r.cpu[k].start, r.cpu[k - 1].end, 'CPU never rests');
});

test('compare gives the steady-state speedup (cpu+gpu)/max(cpu,gpu)', () => {
  const c = m.compare(4, 12);
  close(c.speedup, 16 / 12);
  close(c.syncUtil, 12 / 16);
  close(c.asyncUtil, 1);
  close(m.compare(10, 10).speedup, 2);
  close(m.compare(20, 5).asyncUtil, 0.25);
  assert.throws(() => m.compare(0, 5));
  assert.throws(() => m.timeline({ cpuMs: 1, gpuMs: 1, steps: 0, mode: 'sync' }));
  assert.throws(() => m.timeline({ cpuMs: 1, gpuMs: 1, steps: 2, mode: 'x' }));
});

test('cumulative acceptance multiplies the per-position confidences', () => {
  const c = m.cumulative([0.9, 0.8, 0.5]);
  close(c[0], 0.9); close(c[1], 0.72); close(c[2], 0.36);
  close(m.expectedTokens([0.9, 0.8, 0.5], 3), 1 + 0.9 + 0.72 + 0.36);
  close(m.expectedTokens([0.9, 0.8, 0.5], 0), 1);
  assert.throws(() => m.cumulative([1.2]));
});

test('graph sizes follow build_graph_batch_sizes: 1, 2, 4, then multiples of 8', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 8, 9, 16, 17, 19, 24, 25].map(q => m.graphSize(q)), [1, 2, 4, 4, 8, 8, 16, 16, 24, 24, 24, 32]);
  assert.equal(m.stepTime(19, { t0: 10, t1: 0.15 }), m.stepTime(24, { t0: 10, t1: 0.15 }), 'flat inside one graph');
  assert.throws(() => m.graphSize(0));
});

test('varlen picks the throughput-maximising budget on the graph staircase', () => {
  // Two requests, two drafts each. Cumulative rates: A [0.9, 0.81], B [0.5, 0.25].
  const conf = [[0.9, 0.9], [0.5, 0.5]];
  const free = m.varlen(conf, { t0: 10, t1: 0 });
  assert.equal(free.totalQ, 6);
  assert.deepEqual(free.seqlensQ, [3, 3]);
  // T = 10 + 1 x graph. q=2: 2/12; q=3: 2.9/14; q=4: 3.71/14=.265; q=5: 4.21/18; q=6: 4.46/18=.248
  const r = m.varlen(conf, { t0: 10, t1: 1 });
  assert.equal(r.totalQ, 4);
  assert.equal(r.graph, 4);
  assert.deepEqual(r.seqlensQ, [3, 1]);
  close(r.expected, 2 + 0.9 + 0.81);
  close(r.timeMs, 14);
  const f = m.fixed(conf, { t0: 10, t1: 1 });
  assert.equal(f.totalQ, 6);
  assert.equal(f.graph, 8);
  close(f.throughput, 4.46 / 18);
  assert.ok(r.throughput >= f.throughput);
});

test('the chosen budget fills its graph, unless every draft already fits', () => {
  for (const seed of [1, 2, 3, 7]) for (const n of [4, 8, 16]) for (const t1 of [0.05, 0.15, 0.3]) {
    const conf = m.presetConfidences(n, 5, seed), r = m.varlen(conf, { t0: 10, t1 });
    assert.ok(r.totalQ === r.graph || r.totalQ === n * 6, `seed ${seed} n ${n} t1 ${t1}: q ${r.totalQ} graph ${r.graph}`);
  }
});

test('varlen breaks ties toward the lower request index and the smaller batch', () => {
  // q=2: 2/1.5; q=3: 2.5/2; q=4: 3/2 -> all
  const r = m.varlen([[0.5], [0.5]], { t0: 1, t1: 0.25 });
  assert.deepEqual(r.seqlensQ, [2, 2]);
  // q=2: 2/3; q=3: 2.5/5; q=4: 3/5 -> none
  const s = m.varlen([[0.5], [0.5]], { t0: 1, t1: 1 });
  assert.deepEqual(s.seqlensQ, [1, 1]);
  assert.deepEqual(m.distribute([[0.5], [0.5]], 3), [2, 1]);
});

test('a per-request choice is always a prefix of its drafts', () => {
  const conf = m.presetConfidences(8, 5, 7);
  const r = m.varlen(conf, { t0: 10, t1: 0.12 });
  r.seqlensQ.forEach((q, i) => {
    assert.ok(q >= 1 && q <= 6);
    const cum = m.cumulative(conf[i]);
    for (let j = 1; j < cum.length; j++) assert.ok(cum[j] <= cum[j - 1]);
  });
  assert.equal(r.seqlensQ.reduce((a, b) => a + b, 0), r.totalQ);
});

test('preset confidences are reproducible and inside (0, 1)', () => {
  const a = m.presetConfidences(6, 5, 3), b = m.presetConfidences(6, 5, 3);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, m.presetConfidences(6, 5, 4));
  for (const row of a) { assert.equal(row.length, 5); for (const p of row) assert.ok(p > 0 && p < 1); }
});

test('benchmark accounting: full acceptance counts 1 + nextn, the plot rescales by tau', () => {
  assert.equal(m.fullTau(5), 6);
  close(m.tau(3, 0.75), 3.25);
  close(m.tau(5, 0.75), 4.75);
  // examples/README: 64 requests, nextn 5 -> 384 tokens per step under full acceptance.
  assert.equal(64 * m.fullTau(5), 384);
  assert.throws(() => m.tau(3, 1.5));
});
