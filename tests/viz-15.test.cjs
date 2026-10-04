'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/15-launch.math.js');

test('direct launches: launch-bound when each kernel is shorter than its launch', () => {
  const t = m.direct(45, 5, 20);
  assert.equal(t.kernels.length, 45);
  assert.equal(t.total, 45 * 20 + 5);          // n·L + w
  assert.equal(t.busy, 45 * 5);
  assert.equal(t.kernels[0].start, 20);         // the GPU waits for the first submission
  assert.equal(t.kernels[1].start, 40);         // and for every later one
  assert.ok(Math.abs(t.busyRatio - 225 / 905) < 1e-12);
});

test('direct launches: GPU-bound when each kernel is longer than its launch', () => {
  const t = m.direct(10, 30, 20);
  assert.equal(t.total, 20 + 10 * 30);          // L + n·w
  assert.equal(t.kernels[1].start, t.kernels[0].end);
});

test('fusion groups g kernels into one launch with the summed work', () => {
  const t = m.fused(45, 5, 20, 3);
  assert.equal(t.kernels.length, 15);
  assert.equal(t.kernels[0].end - t.kernels[0].start, 15);
  assert.equal(t.total, 15 * 20 + 15);
  const odd = m.fused(10, 5, 20, 4);            // 4 + 4 + 2
  assert.deepEqual(odd.kernels.map(k => k.end - k.start), [20, 20, 10]);
  assert.deepEqual(m.fused(7, 5, 20, 1).total, m.direct(7, 5, 20).total);
});

test('a graph replay pays one submission, then runs the nodes back to back', () => {
  const t = m.graph(45, 5, 20);
  assert.equal(t.total, 20 + 45 * 5);
  assert.equal(t.launches, 1);
  assert.equal(t.kernels[44].end, t.total);
  assert.equal(t.busyRatio, 225 / 245);
});

test('inputs are checked', () => {
  assert.throws(() => m.direct(0, 5, 20));
  assert.throws(() => m.direct(3, -1, 20));
  assert.throws(() => m.fused(3, 5, 20, 0));
  assert.throws(() => m.graph(2.5, 5, 20));
});

test('the QSA step buffer holds pos, n_kv, completed blocks and selection width', () => {
  assert.deepEqual(m.stepBuffer(0), [0, 1, 0, 1]);
  assert.deepEqual(m.stepBuffer(3), [3, 4, 1, 4]);
  assert.deepEqual(m.stepBuffer(4999), [4999, 5000, 1250, 2051]);
  assert.equal(m.SELECTION_CAP, 2048 + 4 - 1);
});

test('frozen pos writes every token to cell 0; the step buffer writes each to its own cell', () => {
  const bad = m.replay('frozen', 4);
  assert.deepEqual(bad.cells.slice(0, 4), [3, null, null, null]);
  assert.equal(bad.nKv, 1);
  const good = m.replay('buffer', 4);
  assert.deepEqual(good.cells.slice(0, 4), [0, 1, 2, 3]);
  assert.equal(good.nKv, 4);
  assert.throws(() => m.replay('other', 2));
});
