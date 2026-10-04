'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/01-journey.math.js');

test('upstream speed table is the pinned DETAILS.md Q2_0 row (engine 0.1.26)', () => {
  assert.deepEqual(m.SPEEDS.map(s => s.k), [1, 4, 32, 64, 128]);
  assert.deepEqual(m.SPEEDS.map(s => s.prefill), [536, 1299, 2171, 2126, 2107]);
  assert.deepEqual(m.SPEEDS.map(s => s.decode), [87.3, 93.0, 81.8, 76.2, 73.7]);
});

test('waiting time is prompt tokens over prompt speed, answer time is answer tokens over output speed', () => {
  const w = m.waitTimes(1, 300);
  assert.equal(w.promptTokens, 4096);
  assert.equal(w.firstS.toFixed(2), (4096 / 1299).toFixed(2));
  assert.equal(w.firstS.toFixed(1), '3.2');
  assert.equal(w.answerS.toFixed(2), '3.23');
  assert.equal(w.totalS, w.firstS + w.answerS);
  const big = m.waitTimes(4, 300);
  assert.equal(big.promptTokens, 131072);
  assert.equal(Math.round(big.firstS), 62);
  assert.ok(big.firstS / big.answerS > 15, 'a long prompt dominates the wait');
  assert.throws(() => m.waitTimes(5, 300));
  assert.throws(() => m.waitTimes(0, 0));
  assert.throws(() => m.waitTimes(0, -1));
});

test('the loop count equals the number of generated tokens', () => {
  assert.equal(m.loopRounds(0), 0);
  assert.equal(m.loopRounds(300), 300);
  assert.equal(m.engineInput(7, 3), 10);
  assert.throws(() => m.loopRounds(-1));
});
