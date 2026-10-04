'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/16-prefill.math.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('a prompt is cut into chunks of C tokens with a short last chunk', () => {
  assert.deepEqual(m.chunks(32768, 8192), [8192, 8192, 8192, 8192]);
  assert.deepEqual(m.chunks(1000, 256), [256, 256, 256, 232]);
  assert.deepEqual(m.chunks(5, 8192), [5]);
  assert.throws(() => m.chunks(0, 8));
  assert.throws(() => m.chunks(8, 0));
});

test('without overlap a chunk pays the weight trip and the compute in turn', () => {
  close(m.chunkTime(1024, 600, 0.4, false), 600 + 1024 * 0.4);
  close(m.chunkTime(1, 600, 0.4, false), 600.4);
});

test('with overlap the 48 layers form a pipeline: next layer moves while this one computes', () => {
  const a = 600 / 48, b = 8192 * 0.4 / 48;
  close(m.chunkTime(8192, 600, 0.4, true), a + 47 * Math.max(a, b) + b);
  close(m.chunkTime(1024, 600, 0.4, true), 12.5 + 47 * 12.5 + 1024 * 0.4 / 48);
  assert.ok(m.chunkTime(8192, 600, 0.4, true) < m.chunkTime(8192, 600, 0.4, false));
  close(m.chunkTime(10, 0, 0.4, true), 4);           // nothing to move: pure compute
});

test('the per-layer schedule ends exactly when chunkTime says', () => {
  for (const c of [1, 100, 1500, 8192]) for (const ov of [false, true]) {
    const s = m.layerSchedule(c, 600, 0.4, ov);
    assert.equal(s.layers.length, 48);
    close(s.end, m.chunkTime(c, 600, 0.4, ov), 1e-6);
    for (const l of s.layers) assert.ok(l.comp[0] >= l.copy[1] - 1e-9, 'a layer computes only after its weights arrive');
  }
  const ov = m.layerSchedule(8192, 600, 0.4, true).layers;
  assert.ok(ov[1].copy[0] < ov[0].comp[1], 'with overlap the next copy starts before this compute ends');
});

test('prefill run adds the chunks up and reports tokens per second', () => {
  const r = m.run(32768, 8192, 600, 0.4, false);
  assert.equal(r.chunks.length, 4);
  close(r.totalMs, 4 * (600 + 8192 * 0.4));
  close(r.tokPerSec, 32768 / (r.totalMs / 1000));
  const one = m.run(4096, 1, 600, 0.4, false);
  assert.ok(one.tokPerSec < 2, 'one token per chunk pays the whole weight trip every time');
  const big = m.run(32768, 8192, 600, 0.4, true);
  assert.ok(big.tokPerSec > 2400 && big.tokPerSec < 2500);
});

test('the break-even chunk is where compute time equals the weight trip', () => {
  assert.equal(m.breakEven(600, 0.4), 1500);
  assert.throws(() => m.breakEven(600, 0));
});

test('upstream dense-pass ratios give the per-token cost of a batch', () => {
  assert.deepEqual(m.DENSE_RATIO.slice(0, 4), [1.0, 1.05, 1.3, 1.45]);
  close(m.perTokenCost(1), 1);
  close(m.perTokenCost(2), 0.525);
  close(m.perTokenCost(8), 3.0 / 8);
  assert.throws(() => m.perTokenCost(10));
});
