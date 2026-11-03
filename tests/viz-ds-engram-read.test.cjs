'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/ds-engram-read.math.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('upper bound = read speed / MB per word, 1 GB = 1000 MB', () => {
  close(m.upperBound(3.6, 48), 75);
  close(m.upperBound(3.6, 111), 3600 / 111);
  assert.equal(Math.round(m.upperBound(3.6, 111)), 32);
  close(m.upperBound(1, 100), 10);
  close(m.upperBound(2, 50), 40);
});

test('edge cases: zero speed gives zero, bad input throws', () => {
  assert.equal(m.upperBound(0, 48), 0);
  assert.throws(() => m.upperBound(-1, 48));
  assert.throws(() => m.upperBound(NaN, 48));
  assert.throws(() => m.upperBound(Infinity, 48));
  assert.throws(() => m.upperBound(3.6, 0), 'MB per word must be above zero');
  assert.throws(() => m.upperBound(3.6, -5));
  assert.throws(() => m.upperBound('3.6', 48));
});

test('upper bound is monotone: faster disk raises it, bigger reads lower it', () => {
  assert.ok(m.upperBound(2, 48) > m.upperBound(1, 48));
  assert.ok(m.upperBound(2, 48) > m.upperBound(2, 111));
  close(m.upperBound(2, 48) * 2, m.upperBound(4, 48));
});

test('required read speed = words/s x MB per word / 1000; it inverts the upper bound', () => {
  close(m.requiredRead(15.6, 48), 0.7488);
  close(m.requiredRead(15.0, 111), 1.665);
  assert.equal(m.requiredRead(0, 48), 0);
  close(m.upperBound(m.requiredRead(15.6, 48), 48), 15.6);
  assert.throws(() => m.requiredRead(-1, 48));
  assert.throws(() => m.requiredRead(15, 0));
});

test('headroom = upper bound / measured speed', () => {
  close(m.headroom(3.6, 48, 15.6), 75 / 15.6);
  assert.ok(m.headroom(0.5, 48, 15.6) < 1, 'a slow disk cannot reach the measured speed');
  assert.throws(() => m.headroom(3.6, 48, 0));
});

test('measured Mac points agree with the page: 48 MB @ 15.6, 111 MB @ 15.0', () => {
  const [a, b] = m.MEASURED;
  assert.deepEqual([a.mb, a.tps, b.mb, b.tps], [48, 15.6, 111, 15.0]);
  assert.equal(a.id, 'q2');
  assert.equal(b.id, 'q225');
  assert.equal(m.requiredRead(a.tps, a.mb).toFixed(2), '0.75');
  assert.equal(m.requiredRead(b.tps, b.mb).toFixed(2), '1.67');
});

test('default state reproduces the static figure: 3.6 GB/s, limits 75 and 32, axes 0-4 GB/s and 0-85', () => {
  assert.equal(m.DEFAULTS.gbps, 3.6);
  assert.equal(m.DEFAULTS.mb, 48);
  assert.equal(m.axes.xMax, 4);
  assert.equal(m.axes.yMax, 85);
  const s = m.defaultState();
  assert.deepEqual(s.limits.map(Math.round), [75, 32]);
  assert.deepEqual(s.required.map(x => x.toFixed(2)), ['0.75', '1.67']);
  // both measured points sit far below the 3.6 GB/s limits
  s.limits.forEach((l, i) => assert.ok(l > m.MEASURED[i].tps));
});

test('chart geometry matches the static figure within a pixel', () => {
  const g = m.geometry;
  // static figure: x 48..380, y 212 (zero) .. 64.1 (85)
  close(g.x(0), 48, 0.1); close(g.x(4), 380, 0.1); close(g.x(3.6), 346.8, 0.1);
  close(g.y(0), 212, 0.1); close(g.y(85), 64.1, 0.2);
  close(g.y(75), 81.5, 0.2); close(g.y(15.6), 184.9, 0.2); close(g.y(15.0), 185.9, 0.2);
  close(g.x(0.7488), 110.2, 0.2); close(g.x(1.665), 186.2, 0.2);
});

test('clamp keeps slider values inside their ranges', () => {
  assert.equal(m.clamp(9, 1, 4), 4);
  assert.equal(m.clamp(-1, 1, 4), 1);
  assert.equal(m.clamp(2, 1, 4), 2);
  assert.throws(() => m.clamp(NaN, 1, 4));
});

test('curve endpoints stay inside the chart, and a huge read is clipped to the top', () => {
  const [p0, p1] = m.curve(48);
  assert.deepEqual(p0, { gbps: 0, wps: 0 });
  assert.equal(p1.gbps, 4);
  close(p1.wps, 4000 / 48);
  const c = m.curve(10);       // 4 GB/s / 10 MB = 400 words/s, above the top
  assert.equal(c[1].wps, 85);
  close(c[1].gbps, 0.85);
});
