'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/08-attention.math.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('softmax is stable, positive and sums to one', () => {
  assert.deepEqual(m.softmax([0, 0]), [0.5, 0.5]);
  const w = m.softmax([Math.log(3), 0]);
  close(w[0], 0.75); close(w[1], 0.25);
  const big = m.softmax([1000, 1000, 999]);
  assert.ok(big.every(Number.isFinite));
  close(big.reduce((a, b) => a + b, 0), 1);
});

test('attention: scores, scaling, weights and the weighted sum', () => {
  const r = m.attend([0, 0], [[1, 0], [0, 1]], [[2, 0], [0, 4]]);
  assert.deepEqual(r.scores, [0, 0]);
  assert.deepEqual(r.weights, [0.5, 0.5]);
  assert.deepEqual(r.out, [1, 2]);
  // Scaled score ln 3 on the first key: weights 3/4 and 1/4, output [1.5, 1].
  const q = [Math.log(3) * Math.SQRT2, 0];
  const s = m.attend(q, [[1, 0], [0, 1]], [[2, 0], [0, 4]]);
  close(s.scaled[0], Math.log(3)); close(s.scaled[1], 0);
  close(s.weights[0], 0.75); close(s.out[0], 1.5); close(s.out[1], 1);
  assert.equal(m.dot([1, 2, 3], [4, 5, 6]), 32);
  assert.throws(() => m.attend([1, 0], [[1, 0]], [[1, 0], [0, 1]]));
});

test('pair counts: full causal attention is quadratic, the selection caps each query', () => {
  assert.equal(m.causalPairs(4), 10);
  assert.equal(m.causalPairs(262144), 262144 * 262145 / 2);
  assert.equal(m.qsaWidth(100), 100);
  assert.equal(m.qsaWidth(2051), 2051);
  assert.equal(m.qsaWidth(5000), 2051);
  assert.equal(m.sparsePairs(4), 10);
  assert.equal(m.sparsePairs(2051), m.causalPairs(2051));
  assert.equal(m.sparsePairs(2052), m.causalPairs(2051) + 2051);
  assert.equal(m.sparsePairs(10000), m.causalPairs(2051) + (10000 - 2051) * 2051);
});

test('KV bytes follow GQA: 12 layers x 2 KV heads x 256 x K and V x 2 bytes', () => {
  assert.equal(m.kvBytesPerToken(), 24576);
  assert.equal(m.kvBytes(32768), 805306368);
  assert.equal(m.kvBytes(32768) / 2 ** 20, 768);
  assert.equal(m.kvBytesPerToken({ layers: 48, kvHeads: 24 }) / m.kvBytesPerToken(), 48);
});

test('GQA head map is integer division, not modulo', () => {
  assert.equal(m.qToKv(0), 0);
  assert.equal(m.qToKv(11), 0);
  assert.equal(m.qToKv(12), 1);
  assert.equal(m.qToKv(23), 1);
  assert.equal(m.qToKvModulo(1), 1, 'the rival reading interleaves');
  assert.throws(() => m.qToKv(24));
});
