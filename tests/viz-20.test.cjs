'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/20-prefix.math.js');

const saved = { ids: [1, 2, 3, 9, 5, 6], imgs: [{ start: 3, hash: 0xa }], cvec: false };

test('prefix match follows conversation_prefix: exact ids, images and a shorter checkpoint', () => {
  const ok = m.match(saved, { ids: [1, 2, 3, 9, 5, 6, 7, 8, 4], imgs: [{ start: 3, hash: 0xa }], cvec: false });
  assert.deepEqual(ok, { tokens: 6, tail: 3, reason: 'hit' });
  assert.equal(m.match(saved, { ids: [1, 2, 3, 9, 5, 8, 7], imgs: [{ start: 3, hash: 0xa }], cvec: false }).reason, 'tokens');
  assert.equal(m.match(saved, { ids: [1, 2, 3, 9, 5, 6, 7], imgs: [{ start: 3, hash: 0xb }], cvec: false }).reason, 'image');
  assert.equal(m.match(saved, { ids: [1, 2, 3, 9, 5, 6, 7], imgs: [], cvec: false }).reason, 'image');
  assert.equal(m.match(saved, { ids: [1, 2, 3, 9, 5, 6, 7], imgs: [{ start: 3, hash: 0xa }, { start: 4, hash: 0xc }], cvec: false }).reason, 'image');
  assert.equal(m.match(saved, { ids: [1, 2, 3, 9, 5, 6, 7], imgs: [{ start: 3, hash: 0xa }], cvec: true }).reason, 'steering');
  // Equal length: the last prompt token must start the next verify window.
  assert.deepEqual(m.match(saved, { ids: [1, 2, 3, 9, 5, 6], imgs: [{ start: 3, hash: 0xa }], cvec: false }), { tokens: 0, tail: 6, reason: 'not-shorter' });
  assert.equal(m.match({ ids: [], imgs: [], cvec: false }, { ids: [1], imgs: [], cvec: false }).reason, 'empty');
  // Images after the checkpoint do not matter.
  assert.equal(m.match(saved, { ids: [1, 2, 3, 9, 5, 6, 7, 9], imgs: [{ start: 3, hash: 0xa }, { start: 7, hash: 0xd }], cvec: false }).reason, 'hit');
  for (const r of ['tokens', 'image', 'steering', 'not-shorter']) assert.ok(m.REASONS.includes(r));
});

test('pages split a token count into full and partial pages', () => {
  assert.deepEqual(m.pages(16, 4), { full: 4, partial: 0, total: 4, room: 0 });
  assert.deepEqual(m.pages(17, 4), { full: 4, partial: 1, total: 5, room: 3 });
  assert.deepEqual(m.pages(0, 4), { full: 0, partial: 0, total: 0, room: 0 });
  assert.throws(() => m.pages(-1, 4));
  assert.throws(() => m.pages(3, 0));
});

test('copy-on-write shares aligned prefixes with zero copies', () => {
  const cow = m.branch({ prefix: 16, tailA: 3, tailB: 3, page: 4, mode: 'cow' });
  assert.equal(cow.prefixPages, 4);
  assert.equal(cow.copiedPages, 0);
  assert.equal(cow.physicalPages, 6);
  assert.equal(cow.sharedPages, 4);
  assert.equal(cow.stateCopies, 1);
  const copy = m.branch({ prefix: 16, tailA: 3, tailB: 3, page: 4, mode: 'copy' });
  assert.equal(copy.copiedPages, 4);
  assert.equal(copy.physicalPages, 10);
  assert.equal(copy.sharedPages, 0);
  assert.equal(copy.stateCopies, 1);
});

test('a half-full shared page is copied once, by the first writer', () => {
  const cow = m.branch({ prefix: 17, tailA: 3, tailB: 3, page: 4, mode: 'cow' });
  assert.equal(cow.prefixPages, 5);
  assert.equal(cow.copiedPages, 1);
  assert.equal(cow.physicalPages, 6);
  assert.equal(cow.sharedPages, 4);
  // Only one branch writes: it still copies, because the page is shared.
  assert.equal(m.branch({ prefix: 17, tailA: 2, tailB: 0, page: 4, mode: 'cow' }).copiedPages, 1);
  // Nobody writes: nothing to copy.
  assert.equal(m.branch({ prefix: 17, tailA: 0, tailB: 0, page: 4, mode: 'cow' }).copiedPages, 0);
  // Tails longer than the room spill into new pages.
  const long = m.branch({ prefix: 17, tailA: 8, tailB: 1, page: 4, mode: 'cow' });
  assert.equal(long.newA, 2);
  assert.equal(long.newB, 0);
  assert.equal(long.physicalPages, 5 + 2 + 0 + 1);
  const copy = m.branch({ prefix: 17, tailA: 3, tailB: 3, page: 4, mode: 'copy' });
  assert.equal(copy.copiedPages, 5);
  assert.equal(copy.physicalPages, 10);
  assert.throws(() => m.branch({ prefix: 4, tailA: 1, tailB: 1, page: 4, mode: 'zip' }));
});

test('page layout lists what each branch sees', () => {
  const cow = m.branch({ prefix: 6, tailA: 3, tailB: 1, page: 4, mode: 'cow' });
  // Page 0 is full and shared; page 1 holds 2 prefix tokens and is copied by A, written in place by B.
  assert.deepEqual(cow.layout.A.map(p => [p.tokens, p.kind]), [[4, 'shared'], [4, 'copied'], [1, 'own']]);
  assert.deepEqual(cow.layout.B.map(p => [p.tokens, p.kind]), [[4, 'shared'], [3, 'inplace']]);
  const copy = m.branch({ prefix: 6, tailA: 3, tailB: 1, page: 4, mode: 'copy' });
  assert.deepEqual(copy.layout.A.map(p => p.kind), ['orig', 'orig', 'own']);
  assert.deepEqual(copy.layout.B.map(p => p.kind), ['copied', 'copied']);
});

test('GDN running state and prefill time use the pinned geometry', () => {
  assert.equal(m.GDN_STATE_BYTES, 36 * 128 * 48 * 128 * 4);
  assert.equal(Math.round(m.GDN_STATE_BYTES / 1e6), 113);
  assert.equal(m.prefillSeconds(30000), 30);
  assert.equal(m.prefillSeconds(500, 1000), 0.5);
  assert.throws(() => m.prefillSeconds(10, 0));
});
