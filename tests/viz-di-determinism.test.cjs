'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/di-determinism.math.js');

test('the default row is 64 float32 values with mixed signs and magnitudes', () => {
  const v = m.row();
  assert.equal(v.length, 64);
  assert.ok(v.every(x => Math.fround(x) === x), 'every input is a float32 value');
  assert.ok(v.some(x => x < 0) && v.some(x => x > 0));
  assert.ok(Math.max(...v.map(Math.abs)) > 5 && Math.min(...v.map(Math.abs)) < 0.02);
  assert.deepEqual(m.row(7), v, 'the generator is deterministic');
  assert.throws(() => m.row(-1));
});

test('the toy kernel splits a row into more chunks when the batch is small', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 8, 9, 16, 64].map(b => m.splitsFor(b, false)), [16, 8, 4, 4, 2, 2, 1, 1, 1]);
  for (const b of [1, 3, 9, 64]) assert.equal(m.splitsFor(b, true), 4, 'batch-invariant mode fixes the chunk count');
  assert.throws(() => m.splitsFor(0, false));
  assert.throws(() => m.splitsFor(1.5, true));
  assert.equal(m.occupancy(1, 16), 1);
  assert.equal(m.occupancy(1, 4), 0.25);
  assert.equal(m.occupancy(12, 1), 0.75);
});

test('real float32 reduction: five chunk counts give five neighbouring float32 values', () => {
  const v = m.row();
  const got = [1, 2, 4, 8, 16].map(s => m.reduce(v, s).value);
  assert.deepEqual(got.map(m.hexF32), ['40b18dc5', '40b18dc6', '40b18dc3', '40b18dc2', '40b18dc1']);
  assert.equal(new Set(got).size, 5);
  assert.equal(m.ulpF32(got[0], got[4]), 4, 'B = 1 (16 chunks) and B >= 9 (1 chunk) differ by 4 ULP');
  // Every variant is a fine approximation: all lie within 6 ULP of the float64 sum of the same inputs.
  const ref = m.exactSum(v);
  assert.equal(ref.toPrecision(9), '5.54855472');
  for (const x of got) assert.ok(Math.abs(x - ref) < 6 * 4.77e-7);
  // In this row the 4-chunk sum happens to be the correctly rounded float64 sum: a coincidence the page names as such.
  assert.equal(m.reduce(v, 4).value, Math.fround(ref));
  const dist = got.map(x => Math.abs(x - ref));
  assert.equal(Math.min(...dist), dist[2]);
  // In drawn order (B = 1, 2, 3-4, 5-8, >= 9) neighbours differ by 1, 1, 3, 1 ULP.
  const drawn = [16, 8, 4, 2, 1].map(k => m.reduce(v, k).value);
  assert.deepEqual(drawn.slice(1).map((x, i) => m.ulpF32(x, drawn[i])), [1, 1, 3, 1]);
  // One chunk is the plain left-to-right float32 sum.
  let s = 0; for (const x of v) s = Math.fround(s + x);
  assert.equal(m.reduce(v, 1).value, s);
  assert.equal(m.reduce(v, 4).parts.length, 4);
  assert.throws(() => m.reduce(v, 3));
});

test('the same row picks a different token in a different batch, unless the reduction is fixed', () => {
  const free = m.sweep(false), fixed = m.sweep(true);
  assert.equal(free.rows.length, 16);
  assert.equal(free.distinct, 5);
  assert.equal(fixed.distinct, 1);
  assert.deepEqual(free.rows.map(r => r.token), [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.ok(fixed.rows.every(r => r.token === 1 && r.value === m.reduce(m.row(), 4).value));
  assert.equal(m.RIVAL, Math.fround(5.5485552));
  assert.equal(fixed.rows[0].occupancy, 0.25, 'the fixed order leaves units idle at B = 1');
  assert.equal(free.rows[0].occupancy, 1);
});

test('float32 helpers: bits and ULP distance', () => {
  assert.equal(m.hexF32(1), '3f800000');
  assert.equal(m.hexF32(-2), 'c0000000');
  assert.equal(m.ulpF32(1, 1), 0);
  assert.equal(m.ulpF32(1, 1 + 2 ** -23), 1);
  assert.equal(m.ulpF32(0, -0), 0);
});

test('the regex mask follows [A-Z]{2}-[0-9]{3} token by token', () => {
  const id = t => m.VOCAB.indexOf(t);
  assert.equal(m.VOCAB.length, 12);
  assert.equal(m.advance(0, id('AB')), 2);
  assert.equal(m.advance(0, id('Z-')), null, 'Z then - breaks the second letter');
  assert.equal(m.advance(1, id('Z-')), 3, 'one token may cross a class boundary');
  assert.equal(m.advance(0, id('A1')), null, 'a token that only starts right is still blocked');
  assert.equal(m.advance(3, id('345')), 6);
  assert.equal(m.advance(4, id('345')), null, 'too long for the pattern');
  assert.equal(m.advance(5, id(m.EOS)), null, 'EOS only when the pattern is complete');
  assert.equal(m.advance(6, id(m.EOS)), -1);
  assert.deepEqual(m.allowed(6).map((ok, i) => (ok ? m.VOCAB[i] : null)).filter(Boolean), [m.EOS]);
  assert.deepEqual(m.allowed(3).map((ok, i) => (ok ? m.VOCAB[i] : null)).filter(Boolean), ['12', '7', '345']);
  assert.throws(() => m.advance(0, 99));
});

test('the mask packs 32 tokens per word, bit (id & 31) of word (id >> 5)', () => {
  assert.deepEqual(m.packMask(m.allowed(0)), [(1 << 3) | (1 << 4)]);
  assert.deepEqual(m.packMask(m.allowed(3)), [(1 << 7) | (1 << 8) | (1 << 9)]);
  const big = Array(40).fill(false); big[0] = true; big[31] = true; big[33] = true;
  assert.deepEqual(m.packMask(big), [2147483649, 2], 'bit 31 stays an unsigned value');
});

test('greedy decoding: the model wants a story, the mask forces QZ-345', () => {
  const on = m.runGreedy(true);
  assert.equal(on.text, 'QZ-345');
  assert.equal(on.finished, true);
  assert.deepEqual(on.steps.map(s => m.VOCAB[s.token]), ['Q', 'Z-', '345', m.EOS]);
  assert.ok(/^[A-Z]{2}-[0-9]{3}$/.test(on.text));
  for (const s of on.steps) assert.ok(s.masked.every((x, i) => (s.allow[i] ? x === s.raw[i] : x === -Infinity)));
  const off = m.runGreedy(false);
  assert.equal(off.text, '从前冰箱，从前冰箱，');
  assert.equal(off.finished, false);
  assert.equal(m.scores(0)[0], 5);
});
