'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/07-layer.math.js');

const close = (a, b, eps = 1e-4) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('layer types follow layer % 4 == 3', () => {
  assert.equal(m.isQsa(3), true);
  assert.equal(m.isQsa(0), false);
  assert.equal(m.isQsa(47), true);
  assert.equal(m.isQsa(4), false);
  const q = m.qsaLayers(48);
  assert.equal(q.length, 12);
  assert.deepEqual(q.slice(0, 3), [3, 7, 11]);
  assert.equal(q[11], 47);
  assert.throws(() => m.isQsa(-1));
  assert.throws(() => m.isQsa(48));
});

test('L2 and RMS normalisation differ by sqrt(d)', () => {
  const l2 = m.l2norm([3, 4], 0);
  close(l2[0], 0.6); close(l2[1], 0.8);
  const rms = m.rmsnorm([3, 4], 0);
  close(rms[0], 0.8485); close(rms[1], 1.1314);
  close(rms[0] / l2[0], Math.SQRT2);
  const x = Array.from({ length: 128 }, (_, i) => Math.sin(i + 1));
  close(m.rmsnorm(x, 0)[5] / m.l2norm(x, 0)[5], Math.sqrt(128));
  close(Math.sqrt(128), 11.3137);
  const r = m.rmsnorm([2, 2, 2, 2], 0);
  r.forEach(v => close(v, 1));
});

test('epsilon inside the root keeps a near-zero vector finite and small', () => {
  const tiny = [1e-4, 0];
  const inside = m.rmsnorm(tiny, 1e-6);
  const outside = m.rmsnormEpsOutside(tiny, 1e-6);
  assert.ok(Number.isFinite(inside[0]) && Number.isFinite(outside[0]));
  assert.ok(Math.abs(inside[0] - outside[0]) > 0.05, 'the two placements give visibly different results near zero');
  assert.deepEqual(m.rmsnorm([0, 0], 1e-6), [0, 0]);
  close(m.l2norm([3, 4], 1e-6)[0], 0.6);
});

test('activation functions', () => {
  close(m.sigmoid(0), 0.5);
  close(m.sigmoid(2), 0.8808);
  close(m.silu(2), 2 * 0.8808, 1e-3);
  close(m.silu(-2), -2 * m.sigmoid(-2));
  assert.equal(m.relu(-3), 0);
  assert.equal(m.relu(2.5), 2.5);
});

test('gated residual write: 2*sigmoid(inject/hc) is centred on 1', () => {
  close(m.grGate(0, 4), 1);
  close(m.grGate(4, 4), 2 * m.sigmoid(1));
  assert.ok(m.grGate(-100, 4) < 1e-6);
  assert.ok(m.grGate(100, 4) > 1.999);
  const R = [[1, 1], [2, 2], [0, 0], [-1, 1]];
  const out = m.grWrite(R, [10, 20], [0, 0, 0, 0], 4);
  assert.deepEqual(out, [[11, 21], [12, 22], [10, 20], [9, 21]], 'zero injection is a plain residual add on every stream');
  const g = m.grWrite([[0, 0]], [1, 1], [4], 4);
  close(g[0][0], 2 * m.sigmoid(1));
});

test('MoE combine applies each router weight exactly once', () => {
  assert.deepEqual(m.combine([[2, 0], [0, 4]], [0.25, 0.75]), [0.5, 3]);
  // The pool already multiplied the expert output [2, 0] by 0.2; the combine multiplies again.
  const twice = m.combine([[0.4, 0]], [0.2]);
  close(twice[0], 0.08);
  close(twice[0] / m.combine([[2, 0]], [0.2])[0], 0.2, 1e-9);
  assert.throws(() => m.combine([[1, 2]], [0.5, 0.5]));
});
