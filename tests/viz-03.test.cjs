'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/03-tensor.math.js');

test('matrix times vector: each output is one row dotted with x', () => {
  const W = [[1, 2, 3], [4, 5, 6]];
  assert.deepEqual(m.matvec(W, [1, 0, -1]), [-2, -2]);
  assert.deepEqual(m.matvec(W, [0, 1, 0]), [2, 5], 'a one-hot x picks a column');
  assert.equal(m.dot([1, 2, 3], [1, 0, -1]), -2);
  assert.throws(() => m.matvec(W, [1, 2]));
  assert.throws(() => m.dot([1], [1, 2]));
});

test('batching inputs (GEMM) gives the same columns as separate GEMVs and reuses each weight b times', () => {
  const W = [[1, 2, 3], [4, 5, 6]], X = [[1, 0, -1], [2, 1, 0], [0, 0, 1]];
  assert.deepEqual(m.matmulCols(W, X), X.map(x => m.matvec(W, x)));
  const c = m.cost(2, 3, 4);
  assert.equal(c.macs, 24);
  assert.equal(c.weights, 6);
  assert.equal(c.reuse, 4);
});

test('strides: the last axis is 1, each earlier axis is the product of the sizes after it', () => {
  const shape = { i: 2, h: 3, j: 2 };
  assert.deepEqual(m.strides(shape, ['i', 'h', 'j']), { i: 6, h: 2, j: 1 });
  assert.deepEqual(m.strides(shape, ['i', 'j', 'h']), { i: 6, j: 3, h: 1 });
  assert.equal(m.offset({ i: 1, h: 2, j: 0 }, shape, ['i', 'h', 'j']), 10);
  assert.equal(m.offset({ i: 1, h: 2, j: 0 }, shape, ['i', 'j', 'h']), 8);
  assert.throws(() => m.offset({ i: 2, h: 0, j: 0 }, shape, ['i', 'h', 'j']));
});

test('row-major and column-major offsets of a 2 x 3 matrix', () => {
  assert.equal(m.offset({ r: 1, c: 0 }, { r: 2, c: 3 }, ['r', 'c']), 3);
  assert.equal(m.offset({ r: 1, c: 0 }, { r: 2, c: 3 }, ['c', 'r']), 1);
  assert.equal(m.offset({ r: 1, c: 2 }, { r: 2, c: 3 }, ['r', 'c']), 5);
});

test('every layout is a bijection onto 0..n-1, and walking j is contiguous only when j is fastest', () => {
  const shape = { i: 2, h: 3, j: 2 };
  for (const order of [['i', 'h', 'j'], ['i', 'j', 'h'], ['j', 'i', 'h']]) {
    const seen = new Set();
    for (let i = 0; i < 2; i++) for (let h = 0; h < 3; h++) for (let j = 0; j < 2; j++) seen.add(m.offset({ i, h, j }, shape, order));
    assert.equal(seen.size, 12);
    assert.equal(Math.max(...seen), 11);
  }
  const real = { i: 128, h: 48, j: 128 };
  assert.equal(m.strides(real, ['i', 'h', 'j']).j, 1);
  assert.equal(m.strides(real, ['i', 'j', 'h']).j, 48);
  assert.equal(m.elements(real), 786432);
  assert.equal(m.elements(real) * 4, 3 * 1024 * 1024);
});
