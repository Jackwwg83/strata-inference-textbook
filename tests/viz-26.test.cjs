'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/26-testing.math.js');

test('float32 summation order changes the result; float64 gives the exact 2', () => {
  const v = [1e8, 1, -1e8, 1];
  assert.equal(m.sum(v, 'forward', 'f32').value, 1);
  assert.equal(m.sum(v, 'reverse', 'f32').value, 0);
  assert.equal(m.sum(v, 'pairwise', 'f32').value, 0);
  assert.equal(m.sum(v, 'forward', 'f64').value, 2);
  assert.deepEqual(m.sum(v, 'forward', 'f32').partials, [1e8, 1e8, 0, 1]);
});

test('0.1 + 0.2 equals 0.3 in float32 by luck, not in float64', () => {
  assert.equal(m.sum([0.1, 0.2], 'forward', 'f32').value, Math.fround(0.3));
  assert.notEqual(m.sum([0.1, 0.2], 'forward', 'f64').value, 0.3);
  assert.equal(m.sum([0.1, 0.2], 'forward', 'f64').value, 0.30000000000000004);
});

test('accumulating 1000 x 0.1 drifts left to right but not pairwise', () => {
  const v = Array(1000).fill(0.1);
  const fwd = m.sum(v, 'forward', 'f32').value, pw = m.sum(v, 'pairwise', 'f32').value;
  assert.equal(fwd, Math.fround(99.9990463256836));
  assert.equal(pw, 100);
  assert.ok(Math.abs(fwd - 100) > 9e-4);
});

test('isClose follows math.isclose: max(rtol * max(|a|,|b|), atol)', () => {
  assert.equal(m.isClose(1, 1 + 1e-10, 1e-9, 0), true);
  assert.equal(m.isClose(0, 1e-12, 1e-9, 0), false, 'near zero a relative tolerance alone fails');
  assert.equal(m.isClose(0, 1e-12, 1e-9, 1e-9), true);
  assert.equal(m.isClose(NaN, NaN, 1, 1), false);
  assert.equal(m.isClose(Infinity, Infinity, 0, 0), true);
  assert.equal(m.isClose(Infinity, 1e308, 0.5, 0), false);
  assert.throws(() => m.isClose(1, 1, -1, 0));
  const j = m.judge(2e-8, 0, 1e-6, 1e-6);
  assert.deepEqual(j, { exact: false, absOnly: true, relOnly: false, combined: true });
});

test('ulp distance counts float32 steps and treats -0 as 0', () => {
  assert.equal(m.ulpF32(1, 1), 0);
  assert.equal(m.ulpF32(0, -0), 0);
  assert.equal(m.ulpF32(1, 1 + 2 ** -23), 1);
  assert.equal(m.ulpF32(1, 1 - 2 ** -24), 1);
  assert.equal(m.ulpF32(-1e-45, 1e-45), 2);
  assert.equal(m.ulpF32(99.9990463256836, 100), 125);
});

test('every scenario is deterministic and its two paths are defined', () => {
  for (const s of m.SCENARIOS) {
    const a = m.runScenario(s.id, 'f32'), b = m.runScenario(s.id, 'f32');
    assert.equal(a.a.value, b.a.value, s.id);
    assert.equal(a.b.value, b.b.value, s.id);
    assert.ok(Number.isFinite(a.a.value) && Number.isFinite(a.b.value), s.id);
  }
  const dot = m.runScenario('dot', 'f32');
  assert.notEqual(dot.a.value, dot.b.value, 'the two orders must differ in the last bits');
  assert.ok(m.ulpF32(dot.a.value, dot.b.value) <= 64);
  assert.ok(m.isClose(dot.a.value, dot.b.value, 1e-5, 1e-6));
  assert.throws(() => m.runScenario('nope', 'f32'));
});

test('the toy layer stack stays finite and the correct variant differs only in the last bits', () => {
  const ref = m.runModel('ref'), ok = m.runModel('ok');
  assert.equal(ref.trace.length, m.LAYERS + 1);
  assert.ok(Number.isFinite(ref.final) && ref.final > 0.5 && ref.final < 2);
  assert.notEqual(ok.final, ref.final, 'reverse-order variant must differ bitwise');
  assert.ok(m.isClose(ok.final, ref.final, m.TOL.rtol, m.TOL.atol));
  for (const v of ['w2', 'drop', 'stale']) assert.ok(!m.isClose(m.runModel(v).final, ref.final, m.TOL.rtol, m.TOL.atol), v);
});

test('which test catches which mutant (true = test passed, so the bug was missed)', () => {
  const grid = Object.fromEntries(m.MUTANTS.map(v => [v, m.runTests(v).map(t => t.pass)]));
  assert.deepEqual(m.TESTS, ['smoke', 'weakUnit', 'strongUnit', 'diffExact', 'diffTol']);
  assert.deepEqual(grid.ok, [true, true, true, false, true]);
  assert.deepEqual(grid.w2, [true, true, false, false, false]);
  assert.deepEqual(grid.drop, [true, false, false, false, false]);
  assert.deepEqual(grid.stale, [true, true, true, false, false]);
  assert.throws(() => m.runTests('nope'));
});
