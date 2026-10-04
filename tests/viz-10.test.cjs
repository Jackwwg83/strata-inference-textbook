'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/10-moe.math.js');

test('MoE per-token cost follows the pinned geometry', () => {
  const s = m.moeStats(10);
  assert.equal(s.picks, 480);
  assert.equal(s.expertParams, 480 * 4915200);
  assert.equal(s.params, 480 * 4915200 + 4.2e9);
  assert.equal(Math.round(s.params / 1e8), 66);
  assert.equal(s.ratio.toFixed(3), (s.params / 125e9).toFixed(3));
  assert.equal(s.bytes, 480 * 1382400);
  assert.equal(Math.round(s.bytes / 1e6), 664);
  assert.equal(Math.round(m.moeStats(1).params / 1e8), 44);
  assert.equal(Math.round(m.moeStats(64).params / 1e8), 193);
  assert.throws(() => m.moeStats(0));
  assert.throws(() => m.moeStats(513));
  assert.throws(() => m.moeStats(2.5));
});

test('top-k picks the highest scores in order and breaks ties by lower id', () => {
  assert.deepEqual(m.topK([0.1, 0.9, 0.5, 0.9, 0.2], 3), [1, 3, 2]);
  assert.deepEqual(m.topK([3, 2, 1], 5), [0, 1, 2]);
  assert.throws(() => m.topK([1, 2], 0));
});

test('router weights are positive, ordered like scores and sum to one', () => {
  const w = m.routeWeights([0.99, 0.97, 0.95, 0.91]);
  assert.equal(w.length, 4);
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  for (let i = 1; i < w.length; i++) assert.ok(w[i - 1] >= w[i]);
  assert.ok(w[0] / w[3] > 5, 'spread must be visible');
  assert.deepEqual(m.routeWeights([0.5, 0.5]), [0.5, 0.5]);
});

test('transfer time is bytes over bandwidth, with the token ceiling', () => {
  const t = m.transfer(664, 63);
  assert.equal(t.ms.toFixed(2), '10.54');
  assert.equal(t.maxTokensPerSecond, 94);
  assert.equal(m.transfer(664, 7).maxTokensPerSecond, 10);
  assert.equal(m.transfer(664, 672).ms.toFixed(2), '0.99');
  assert.throws(() => m.transfer(664, 0));
});
