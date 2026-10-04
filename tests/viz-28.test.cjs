'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/28-project.math.js');

const statuses = r => m.FEATURES.map(f => r.status[f]);

test('vertical slices finish whole features; horizontal layers finish none by week 10', () => {
  const v = m.plan('vertical', 10, false), h = m.plan('horizontal', 10, false);
  assert.deepEqual(statuses(v), ['evidence', 'evidence', 'test', 'none']);
  assert.deepEqual(statuses(h), ['wire', 'wire', 'test', 'test']);
  assert.equal(v.complete, 2);
  assert.equal(h.complete, 0);
  assert.equal(v.weeks.length, 10);
  assert.equal(v.firstEvidence, 4);
  assert.equal(h.firstEvidence, null);
});

test('a hidden interface assumption costs one rework per feature already coded', () => {
  const v = m.plan('vertical', 10, true), h = m.plan('horizontal', 10, true);
  assert.equal(v.rework, 1);
  assert.equal(h.rework, 1, 'only one rework week fits before the deadline');
  assert.deepEqual(statuses(v), ['evidence', 'evidence', 'code', 'none']);
  assert.deepEqual(statuses(h), ['wire', 'test', 'test', 'test']);
  assert.equal(v.firstEvidence, 5);
  const hFull = m.plan('horizontal', 30, true), vFull = m.plan('vertical', 30, true);
  assert.equal(hFull.rework, 4);
  assert.equal(vFull.rework, 1);
  assert.equal(hFull.totalNeeded, 20);
  assert.equal(vFull.totalNeeded, 17);
  assert.equal(hFull.firstEvidence, 17);
  assert.equal(hFull.complete, 4);
  assert.equal(hFull.weeks.length, 20, 'the plan stops when the work runs out');
});

test('the week log names each unit of work in order', () => {
  const v = m.plan('vertical', 5, true);
  assert.deepEqual(v.weeks.map(w => w.feature + ':' + w.stage), ['f1:code', 'f1:test', 'f1:wire', 'f1:rework', 'f1:evidence']);
  const h = m.plan('horizontal', 6, false);
  assert.deepEqual(h.weeks.map(w => w.feature + ':' + w.stage), ['f1:code', 'f2:code', 'f3:code', 'f4:code', 'f1:test', 'f2:test']);
  assert.throws(() => m.plan('diagonal', 5, false));
  assert.throws(() => m.plan('vertical', -1, false));
});

test('rubric items add up to each dimension and to 100', () => {
  for (const d of m.RUBRIC) assert.equal(d.items.reduce((a, i) => a + i.pts, 0), d.max, d.id);
  assert.equal(m.RUBRIC.reduce((a, d) => a + d.max, 0), 100);
  const all = m.RUBRIC.flatMap(d => d.items.map(i => i.id));
  assert.equal(new Set(all).size, all.length, 'item ids are unique');
});

test('rubric score honours the two red lines', () => {
  const all = new Set(m.RUBRIC.flatMap(d => d.items.map(i => i.id)));
  assert.equal(m.score(all, new Set()).total, 100);
  assert.equal(m.score(new Set(), new Set()).total, 0);
  const sim = m.score(all, new Set(['simAsReal']));
  assert.equal(sim.total, 80);
  assert.equal(sim.byDim.find(d => d.id === 'experiment').got, 0);
  const leak = m.score(all, new Set(['stateLeak']));
  assert.equal(leak.byDim.find(d => d.id === 'impl').got, 0);
  assert.equal(leak.total, 75);
  assert.equal(m.score(all, new Set(['simAsReal', 'stateLeak'])).total, 55);
  const some = m.score(new Set(['t-formula', 'x-ab']), new Set());
  assert.equal(some.total, 8 + 6);
  assert.equal(some.weakest, 'impl');
  assert.throws(() => m.score(new Set(['nope']), new Set()));
});
