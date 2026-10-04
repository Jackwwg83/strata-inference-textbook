'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/06-loader.math.js');

test('range check: the safe form agrees with unbounded arithmetic', () => {
  const ok = m.checkRange(128, 32, 64, 8);
  assert.equal(ok.truth, true);
  assert.equal(ok.naiveOk, true);
  assert.equal(ok.safeOk, true);
  assert.equal(ok.wrapped, false);
  const edge = m.checkRange(128, 64, 64, 8);
  assert.equal(edge.truth, true, 'ending exactly at the file end is legal');
  assert.equal(edge.safeOk, true);
  const over = m.checkRange(128, 64, 65, 8);
  assert.equal(over.truth, false);
  assert.equal(over.naiveOk, false);
  assert.equal(over.safeOk, false);
});

test('range check: the naive sum wraps and wrongly accepts', () => {
  const r = m.checkRange(128, 200, 100, 8);
  assert.equal(r.truth, false);
  assert.equal(r.wrapped, true);
  assert.equal(r.naiveSum, 44);          // 300 mod 256
  assert.equal(r.naiveOk, true, 'the overflow bug: a wrapped sum passes');
  assert.equal(r.safeOk, false);
  const r16 = m.checkRange(1000, 65000, 1000, 16);
  assert.equal(r16.naiveSum, (65000 + 1000) % 65536);
  assert.equal(r16.naiveOk, true);
  assert.equal(r16.safeOk, false);
  const past = m.checkRange(100, 120, 0, 8);
  assert.equal(past.safeOk, false, 'an offset past the end is refused even with n = 0');
  assert.equal(past.truth, false);
  assert.throws(() => m.checkRange(300, 0, 0, 8));
  assert.throws(() => m.checkRange(10, -1, 0, 8));
});

test('payload bytes follow block geometry and refuse bad shapes', () => {
  assert.equal(m.payloadBytes([2560, 640], 64, 18), 460800);
  assert.equal(3 * m.payloadBytes([2560, 640], 64, 18), 1382400);
  assert.equal(m.payloadBytes([2560, 640], 1, 4), 2560 * 640 * 4);
  assert.equal(m.payloadBytes([100, 3], 64, 18), 0, 'a row that is not whole blocks');
  assert.equal(m.payloadBytes([2560, 0], 64, 18), 0, 'a zero dimension');
  assert.equal(m.payloadBytes([], 64, 18), 0);
  assert.equal(m.payloadBytes([2 ** 32, 2 ** 32, 2], 1, 1), 0, 'the element count would overflow 64 bits');
});

test('LRU page cache: a working set that fits warms up, one that does not thrashes', () => {
  const cyc = (w, tokens) => { const a = []; for (let t = 0; t < tokens; t++) for (let p = 0; p < w; p++) a.push(p); return a; };
  const fit = m.simulatePages(cyc(8, 5), 8);
  assert.equal(fit.faults, 8, 'only the first token faults');
  assert.equal(fit.hits, 32);
  const thrash = m.simulatePages(cyc(9, 5), 8);
  assert.equal(thrash.hits, 0, 'LRU with a cyclic working set one larger than the cache never hits');
  assert.equal(thrash.faults, 45);
  const big = m.simulatePages(cyc(4, 3), 16);
  assert.equal(big.faults, 4);
  const steps = m.simulatePages([1, 2, 1, 3], 2).steps;
  assert.deepEqual(steps.map(s => s.hit), [false, false, true, false]);
  assert.equal(steps[3].evicted, 2, 'page 2 was used least recently');
  assert.throws(() => m.simulatePages([1], 0));
});

test('transfer time is bytes over bandwidth', () => {
  assert.equal(m.transferMs(7e9, 7).toFixed(1), '1000.0');
  assert.equal(m.transferMs(1382400, 7).toFixed(3), '0.197');
  assert.throws(() => m.transferMs(1, 0));
});
