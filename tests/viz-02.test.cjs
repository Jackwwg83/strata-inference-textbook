'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/02-sampling.math.js');

const close = (a, b, eps = 1e-4) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < eps, `${x} vs ${b[i]}`));

test('softmax of [2,1,0] at T=1 matches the hand calculation', () => {
  const r = m.softmax([2, 1, 0], 1);
  close(r.probs, [0.6652, 0.2447, 0.0900]);
  close(m.cumulative(r.probs), [0.6652, 0.9100, 1]);
  assert.ok(Math.abs(r.probs.reduce((a, b) => a + b, 0) - 1) < 1e-12);
});

test('subtracting the max changes nothing mathematically but prevents FP32 overflow', () => {
  close(m.softmax([102, 101, 100], 1).probs, m.softmax([2, 1, 0], 1).probs, 1e-12);
  const naive = m.softmax([1000, 999], 1, { stable: false, f32: true });
  assert.equal(naive.overflow, true);
  assert.ok(naive.probs.every(Number.isNaN));
  const safe = m.softmax([1000, 999], 1, { stable: true, f32: true });
  assert.equal(safe.overflow, false);
  close(safe.probs, [0.7311, 0.2689]);
  assert.equal(m.F32_MAX_EXP_INPUT.toFixed(1), '88.7');
});

test('temperature sharpens or flattens; zero means greedy', () => {
  const z = [3, 2, 1, 0.5, -1];
  const cold = m.softmax(z, 0.2).probs[0], warm = m.softmax(z, 1).probs[0], hot = m.softmax(z, 5).probs[0];
  assert.ok(cold > 0.99 && cold > warm && warm > hot && hot < 0.4);
  assert.deepEqual(m.softmax(z, 0).probs, [1, 0, 0, 0, 0]);
  assert.equal(m.softmax(z, 0).greedy, true);
  assert.deepEqual(m.softmax([1, 3, 3], 0).probs, [0, 1, 0], 'ties go to the lower index');
  assert.throws(() => m.softmax(z, -1));
});

test('inverse-CDF pick: u lands in the segment whose cumulative bound first exceeds it', () => {
  const p = [0.6652, 0.2447, 0.0901];
  assert.equal(m.pick(p, 0), 0);
  assert.equal(m.pick(p, 0.5), 0);
  assert.equal(m.pick(p, 0.8), 1);
  assert.equal(m.pick(p, 0.95), 2);
  assert.equal(m.pick(p, 0.99999999), 2);
  assert.throws(() => m.pick(p, 1));
});

test('counter-based uniforms are reproducible, in [0,1) and roughly uniform', () => {
  assert.equal(m.uniform(7, 3), m.uniform(7, 3));
  assert.notEqual(m.uniform(7, 3), m.uniform(8, 3));
  assert.notEqual(m.uniform(7, 3), m.uniform(7, 4));
  let sum = 0;
  const counts = [0, 0, 0, 0];
  for (let c = 0; c < 20000; c++) { const u = m.uniform(1, c); assert.ok(u >= 0 && u < 1); sum += u; counts[Math.floor(u * 4)]++; }
  assert.ok(Math.abs(sum / 20000 - 0.5) < 0.01);
  counts.forEach(n => assert.ok(Math.abs(n / 20000 - 0.25) < 0.015));
  const p = m.softmax([3, 2, 1, 0.5, -1], 1).probs, hist = [0, 0, 0, 0, 0];
  for (let c = 0; c < 20000; c++) hist[m.pick(p, m.uniform(5, c))]++;
  hist.forEach((n, i) => assert.ok(Math.abs(n / 20000 - p[i]) < 0.015, `token ${i}`));
});
