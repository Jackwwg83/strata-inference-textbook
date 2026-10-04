'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/05-roofline.math.js');

test('roofline: attainable = min(P, B x I); the ridge is P / B', () => {
  const P = 50e12, B = 672e9;
  assert.equal(m.ridge(P, B).toFixed(1), '74.4');
  const low = m.roofline(P, B, 1);
  assert.equal(low.perf, 672e9);
  assert.equal(low.bound, 'memory');
  const high = m.roofline(P, B, 200);
  assert.equal(high.perf, P);
  assert.equal(high.bound, 'compute');
  assert.throws(() => m.roofline(P, B, 0));
});

test('time lower bound is the larger of compute time and transfer time', () => {
  assert.equal(m.lowerBound(1e9, 1e9, 1e12, 1e10), 0.1);
  assert.equal(m.lowerBound(1e12, 1e6, 1e12, 1e10), 1);
});

test('GEMV intensity is 2 FLOP per weight per input over bytes per weight', () => {
  assert.equal(m.intensity(1, 2), 1);
  assert.equal(m.intensity(32, 2), 32);
  assert.equal(m.intensity(1, 18 / 64).toFixed(2), '7.11');
  const w = m.layerExample(8e6, 2, 32);
  assert.equal(w.flops, 512e6);
  assert.equal(w.bytes, 16e6);
  assert.equal(w.I, 32);
});

test('latency plus size over bandwidth: small transfers are latency-bound', () => {
  const small = m.transfer(10e-6, 1024, 63e9), big = m.transfer(10e-6, 664e6, 63e9);
  assert.ok(small.latencyShare > 0.99);
  assert.ok(big.latencyShare < 0.001);
  assert.equal((big.seconds * 1000).toFixed(1), '10.5');
});

test('Amdahl: a 16% stage made 2x faster gives about 1.087x; the ceiling is 1 / (1 - f)', () => {
  assert.equal(m.amdahl(0.16, 2).toFixed(3), '1.087');
  assert.equal(m.amdahl(0.16, Infinity).toFixed(3), '1.190');
  assert.equal(m.amdahl(0.2, 2).toFixed(3), '1.111');
  assert.equal(m.amdahl(0.2, Infinity), 1.25);
  assert.equal(m.amdahl(0, 5), 1);
  assert.throws(() => m.amdahl(1.2, 2));
  assert.throws(() => m.amdahl(0.5, 0.5));
});

test('upstream decode example: 663.6 MB over the measured 44.14 GB/s DRAM read', () => {
  const t = m.transfer(0, 663.6e6, 44.14e9);
  assert.equal((t.seconds * 1000).toFixed(1), '15.0');
  assert.equal(Math.floor(1 / t.seconds), 66);
  assert.equal((2.393 / 1.585).toFixed(2), '1.51');
});

test('serial stages add, parallel branches take the max plus the join', () => {
  assert.equal(m.serial([2, 3, 4]), 9);
  assert.equal(m.parallel([2, 3], 0.5), 3.5);
});
