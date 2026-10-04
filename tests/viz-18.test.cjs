'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/18-spec.math.js');

test('accepted count stops at the first draft that differs from the target pick', () => {
  // window = [x, d1, d2, d3]; outv[t] = the target's pick after window[t]
  assert.equal(m.accepted(['x', 'a', 'b', 'c'], ['a', 'b', 'c', 'z']), 3);
  assert.equal(m.accepted(['x', 'a', 'b', 'c'], ['a', 'b', 'd', 'z']), 2);
  assert.equal(m.accepted(['x', 'a', 'b', 'c'], ['q', 'b', 'c', 'z']), 0);
  // the third draft "matches" its row, but the second did not: it is not accepted
  assert.equal(m.accepted(['x', 'a', 'w', 'c'], ['a', 'b', 'c', 'z']), 1);
  assert.equal(m.accepted(['x'], ['a']), 0);
});

test('a round commits a + 1 window rows and emits a drafts plus the target pick', () => {
  const text = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
  const r = m.round(text, 0, ['T1', 'T2', 'T3']);
  assert.equal(r.a, 3);
  assert.equal(r.nKeep, 4);
  assert.deepEqual(r.emitted, ['T1', 'T2', 'T3', 'T4']);
  assert.equal(r.nextPos, 4);
  const miss = m.round(text, 2, ['T3', 'W', 'T5']);
  assert.equal(miss.a, 1);
  assert.equal(miss.nKeep, 2);
  assert.deepEqual(miss.emitted, ['T3', 'T4']);          // the target writes T4 where the draft said W
  assert.deepEqual(miss.rejected, ['W', 'T5']);           // T5 looked right but sat after a mismatch
  assert.equal(miss.nextPos, 4);
  const none = m.round(text, 5, ['X']);
  assert.equal(none.a, 0);
  assert.deepEqual(none.emitted, ['T6']);                 // every round moves at least one token
});

test('scripted drafts put one wrong guess at the chosen position', () => {
  const text = ['A', 'B', 'C', 'D', 'E', 'F'];
  assert.deepEqual(m.drafts(text, 0, 3, null), ['B', 'C', 'D']);
  const d = m.drafts(text, 0, 3, 2);
  assert.equal(d[0], 'B');
  assert.notEqual(d[1], 'C');
  assert.equal(d[2], 'D');                                // the guess after the wrong one still looks right
  assert.deepEqual(m.drafts(text, 4, 3, null), ['F']);    // never draft past the end of the text
  assert.throws(() => m.drafts(text, 0, 0, null));
});

test('window size is capped like the verifier (8 rows)', () => {
  assert.equal(m.MAX_T, 8);
  assert.throws(() => m.round(['a', 'b'], 0, Array(8).fill('b')));
});
