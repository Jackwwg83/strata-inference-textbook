'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/09-gdn.math.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const closeV = (a, b, eps = 1e-9) => { assert.equal(a.length, b.length); a.forEach((x, i) => close(x, b[i], eps)); };
const Z = () => [[0, 0], [0, 0]];

test('outer product is a rank-one table: every row is a multiple of v', () => {
  assert.deepEqual(m.outer([1, 0], [2, 3]), [[2, 3], [0, 0]]);
  assert.deepEqual(m.outer([1, 0, 2], [2, 3]), [[2, 3], [0, 0], [4, 6]]);
  closeV(m.read([[2, 3], [0, 0]], [1, 0]), [2, 3]);
  closeV(m.read([[2, 3], [0, 0]], [0, 1]), [0, 0]);
});

test('delta rule: write, then overwrite the same key', () => {
  const a = m.deltaStep(Z(), [1, 0], [2, 3], 1, 1);
  closeV(a.vhat, [0, 0]); closeV(a.delta, [2, 3]);
  assert.deepEqual(a.S, [[2, 3], [0, 0]]);
  const b = m.deltaStep(a.S, [1, 0], [5, 1], 1, 1);
  closeV(b.vhat, [2, 3]); closeV(b.delta, [3, -2]);
  closeV(m.read(b.S, [1, 0]), [5, 1], 1e-12);
  // The plain additive (Hebbian) write piles the two values up instead.
  const h = m.hebbStep(m.hebbStep(Z(), [1, 0], [2, 3], 1), [1, 0], [5, 1], 1);
  closeV(m.read(h, [1, 0]), [7, 4]);
});

test('orthogonal keys do not interfere; an overlapping key is corrected by the delta rule', () => {
  let S = m.deltaStep(Z(), [1, 0], [2, 3], 1, 1).S;
  S = m.deltaStep(S, [0, 1], [1, 4], 1, 1).S;
  closeV(m.read(S, [1, 0]), [2, 3]); closeV(m.read(S, [0, 1]), [1, 4]);
  const k3 = [0.6, 0.8];
  const D = m.deltaStep(S, k3, [3, 3], 1, 1).S;
  closeV(m.read(D, k3), [3, 3], 1e-12);
  let H = m.hebbStep(m.hebbStep(Z(), [1, 0], [2, 3], 1), [0, 1], [1, 4], 1);
  H = m.hebbStep(H, k3, [3, 3], 1);
  const r = m.read(H, k3);
  assert.ok(Math.abs(r[0] - 3) > 0.5, 'the additive write mixes the old contents into the read');
});

test('boundaries: alpha = 0 forgets, beta = 0 writes nothing, k = 0 changes nothing but the decay', () => {
  const S = [[2, 3], [1, 1]];
  const f = m.deltaStep(S, [1, 0], [5, 1], 1, 0);
  closeV(f.vhat, [0, 0]); assert.deepEqual(f.S, [[5, 1], [0, 0]]);
  const n = m.deltaStep(S, [1, 0], [5, 1], 0, 0.5);
  assert.deepEqual(n.S, [[1, 1.5], [0.5, 0.5]]);
  const z = m.deltaStep(S, [0, 0], [5, 1], 1, 0.5);
  assert.deepEqual(z.S, [[1, 1.5], [0.5, 0.5]]);
  assert.throws(() => m.deltaStep(S, [1], [5, 1], 1, 1));
});

test('scalar walk-through: decay first gives 1.5, the wrong order gives 1.125', () => {
  const p = { S: 2, alpha: 0.5, k: 1, v: 3, beta: 0.25, q: 1 };
  const c = m.scalarStep(p, 'decay-first');
  assert.equal(c.Sbar, 1); assert.equal(c.vhat, 1); assert.equal(c.delta, 0.5); assert.equal(c.S, 1.5); assert.equal(c.o, 1.5);
  const w = m.scalarStep(p, 'write-first');
  assert.equal(w.vhat, 2); assert.equal(w.delta, 0.25); assert.equal(w.Sw, 2.25); assert.equal(w.S, 1.125); assert.equal(w.o, 1.125);
  assert.equal(m.scalarStep({ ...p, alpha: 0 }, 'decay-first').S, 0.75);
  assert.equal(m.scalarStep({ ...p, beta: 0 }, 'decay-first').S, 1);
  assert.equal(m.scalarStep({ ...p, k: 0 }, 'decay-first').S, 1);
  assert.throws(() => m.scalarStep(p, 'sideways'));
});

test('state size does not grow with the context', () => {
  assert.equal(m.stateBytesPerLayer(), 128 * 128 * 48 * 4);
  assert.equal(m.stateBytesPerLayer() / 2 ** 20, 3);
  assert.equal(m.convBytesPerLayer(), 10240 * 3 * 4);
  assert.equal(36 * m.stateBytesPerLayer() / 2 ** 20, 108);
  close(m.gdnBytesTotal() / 2 ** 20, 112.21875);
});
