'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/ds-draft-window.math.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('cumulative confidence multiplies the per-position confidences', () => {
  const c = m.cumulative([0.8, 0.62, 0.45]);
  close(c[0], 0.8); close(c[1], 0.496); close(c[2], 0.2232);
  assert.deepEqual(m.cumulative([]), []);
  assert.throws(() => m.cumulative([1.2]));
  assert.throws(() => m.cumulative([-0.1]));
  assert.throws(() => m.cumulative([NaN]));
});

test('keptDrafts stops at the first draft below the floor or the running product', () => {
  const c = m.PRESET_CONF;
  assert.equal(m.keptDrafts(c, { floor: 0, cum: 0 }), 5, 'no cut');
  assert.equal(m.keptDrafts(c, { floor: 0.5, cum: 0 }), 2, 'floor only: 0.45 stops draft 3');
  assert.equal(m.keptDrafts(c, { floor: 0.5, cum: 0.5 }), 1, 'product 0.496 < 0.5 stops draft 2');
  // A later draft above the floor does not rescue an earlier stop.
  assert.equal(m.keptDrafts([0.9, 0.3, 0.95], { floor: 0.5, cum: 0 }), 1);
  // Equal to the threshold passes (the stop is strictly below).
  assert.equal(m.keptDrafts([0.5, 0.5], { floor: 0.5, cum: 0.25 }), 2);
});

test('depth caps the number of drafts per round', () => {
  assert.equal(m.keptDrafts(m.PRESET_CONF, { floor: 0, cum: 0, depth: 3 }), 3);
  assert.equal(m.keptDrafts(m.PRESET_CONF, { floor: 0, cum: 0, depth: 0 }), 0);
  assert.equal(m.keptDrafts(m.PRESET_CONF, { floor: 0, cum: 0, depth: 99 }), 5, 'block size 5 is the ceiling');
  assert.throws(() => m.keptDrafts(m.PRESET_CONF, { floor: 0, cum: 0, depth: -1 }));
  assert.throws(() => m.keptDrafts(m.PRESET_CONF, { floor: 2, cum: 0 }));
  assert.throws(() => m.keptDrafts(m.PRESET_CONF, { floor: 0, cum: -1 }));
});

test('expected words per round: E = 1 + c1 + c1c2 + ... over the kept drafts', () => {
  close(m.expectedWords([0.8, 0.62, 0.45], 0), 1);
  close(m.expectedWords([0.8, 0.62, 0.45], 1), 1.8);
  close(m.expectedWords([0.8, 0.62, 0.45], 2), 1 + 0.8 + 0.496);
  assert.throws(() => m.expectedWords([0.8], 2));
  assert.throws(() => m.expectedWords([0.8], -1));
});

test('edge cases: zero confidence, full confidence, empty list', () => {
  assert.equal(m.keptDrafts([0, 0.9], { floor: 0, cum: 0 }), 2, 'floor 0 lets zero through');
  close(m.expectedWords([0, 0.9], 2), 1);
  assert.equal(m.keptDrafts([1, 1, 1, 1, 1], { floor: 1, cum: 1 }), 5);
  close(m.expectedWords([1, 1, 1, 1, 1], 5), 6, 1e-12);
  assert.equal(m.keptDrafts([], { floor: 0.5, cum: 0.5 }), 0);
  assert.equal(m.keptDrafts([0.1, 0.1], { floor: 0.5, cum: 0 }), 0);
});

test('window rows = kept drafts + 1', () => {
  assert.equal(m.windowRows(0), 1);
  assert.equal(m.windowRows(5), 6);
  assert.throws(() => m.windowRows(6), /5/);
});

test('scaleConf scales and clamps the preset; scale 1 returns it unchanged', () => {
  assert.deepEqual(m.scaleConf(m.PRESET_CONF, 1), m.PRESET_CONF);
  const hi = m.scaleConf(m.PRESET_CONF, 2);
  hi.forEach(p => assert.ok(p <= m.MAX_CONF && p >= 0));
  assert.deepEqual(m.scaleConf(m.PRESET_CONF, 0), [0, 0, 0, 0, 0]);
  close(m.scaleConf([0.5], 0.5)[0], 0.25);
  assert.throws(() => m.scaleConf(m.PRESET_CONF, -1));
});

test('three cuts: lower scale lowers the words, tighter cuts never verify more drafts', () => {
  for (const scale of [0.5, 0.8, 1, 1.2]) for (const depth of [1, 3, 5]) {
    const r = m.threeCuts(m.scaleConf(m.PRESET_CONF, scale), { floor: 0.5, cum: 0.5, depth });
    assert.ok(r.none.k >= r.floor.k && r.floor.k >= r.both.k, `scale ${scale} depth ${depth}`);
    assert.ok(r.none.words >= r.floor.words - 1e-12 && r.floor.words >= r.both.words - 1e-12);
    assert.equal(r.none.rows, r.none.k + 1);
  }
});

test("default state matches the page's figure DS5-2", () => {
  const r = m.threeCuts(m.PRESET_CONF, m.DEFAULTS);
  assert.deepEqual(m.PRESET_CONF, [0.80, 0.62, 0.45, 0.35, 0.28]);
  assert.deepEqual(m.cumulative(m.PRESET_CONF).map(x => +x.toFixed(3)), [0.8, 0.496, 0.223, 0.078, 0.022]);
  assert.equal(r.none.k, 5); assert.equal(r.none.rows, 6); close(r.none.words, 2.62, 0.005);
  assert.equal(r.floor.k, 2); assert.equal(r.floor.rows, 3); close(r.floor.words, 2.296, 0.005);
  assert.equal(r.both.k, 1); assert.equal(r.both.rows, 2); close(r.both.words, 1.8, 1e-9);
  assert.equal(m.DEFAULTS.floor, 0.5); assert.equal(m.DEFAULTS.cum, 0.5); assert.equal(m.DEFAULTS.depth, 5);
  assert.equal(m.DEFAULTS.scale, 1);
  // Figure caption: the cum gate cuts about 0.5 words and saves 1 row.
  close(r.floor.words - r.both.words, 0.496, 1e-9);
  assert.equal(r.floor.rows - r.both.rows, 1);
});
