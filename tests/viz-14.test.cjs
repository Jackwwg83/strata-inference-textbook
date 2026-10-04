'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/14-dma.math.js');

test('one buffer serialises copy and compute', () => {
  const r = m.doubleBuffer({ n: 4, copyMs: 3, computeMs: 5, buffers: 1, wait: true });
  assert.equal(r.total, 32);
  assert.equal(r.serial, 32);
  assert.equal(r.corrupted.length, 0);
});

test('two buffers overlap: 3 + (N - 1) x max(3, 5) + 5', () => {
  const r = m.doubleBuffer({ n: 4, copyMs: 3, computeMs: 5, buffers: 2, wait: true });
  assert.equal(r.total, 23);
  assert.equal(m.pipelineFormula(4, 3, 5), 23);
  const s = m.doubleBuffer({ n: 4, copyMs: 5, computeMs: 3, buffers: 2, wait: true });
  assert.equal(s.total, 23);
  assert.equal(m.pipelineFormula(4, 5, 3), 23);
  // chunk 2 reuses buffer 0, so its copy waits for chunk 0's compute to end
  assert.equal(r.chunks[2].copyStart, r.chunks[0].compEnd);
  assert.equal(r.corrupted.length, 0);
});

test('a third buffer does not beat the pipeline bound', () => {
  const r = m.doubleBuffer({ n: 6, copyMs: 3, computeMs: 5, buffers: 3, wait: true });
  assert.equal(r.total, m.pipelineFormula(6, 3, 5));
});

test('overwriting a buffer before its reader is done corrupts that chunk', () => {
  const r = m.doubleBuffer({ n: 4, copyMs: 3, computeMs: 5, buffers: 2, wait: false });
  assert.ok(r.corrupted.length > 0);
  assert.ok(r.corrupted.includes(0));
  assert.ok(r.total <= 23, 'not waiting looks faster');
  for (const i of r.corrupted) {
    const next = r.chunks[i + 2];
    assert.ok(next.copyStart < r.chunks[i].compEnd);
  }
  // when copies are slower than compute, the early overwrite happens to be harmless
  const slowCopy = m.doubleBuffer({ n: 4, copyMs: 6, computeMs: 2, buffers: 2, wait: false });
  assert.equal(slowCopy.corrupted.length, 0);
  assert.throws(() => m.doubleBuffer({ n: 0, copyMs: 3, computeMs: 5, buffers: 2, wait: true }));
});

test('TLB reach: 4 KiB pages need millions of entries for the expert arena, 2 MiB pages thousands', () => {
  assert.equal((m.pages(33.97e9, 4096) / 1e6).toFixed(1), '8.3');
  assert.equal(m.pages(33.97e9, 2 * 1024 * 1024), 16199);
});

test('DMA into a page the OS moved reads the wrong frame unless the page is pinned', () => {
  const bad = m.pinTimeline(false), good = m.pinTimeline(true);
  assert.equal(bad.length, good.length);
  assert.ok(good.every(s => s.ok));
  const last = bad[bad.length - 1];
  assert.equal(last.ok, false);
  const moved = bad.find(s => s.key === 'pressure');
  assert.notDeepEqual(moved.frames, bad[0].frames);
  assert.deepEqual(good.find(s => s.key === 'pressure').frames, good[0].frames);
  // the DMA engine keeps the frame list it was given at the start
  assert.deepEqual(bad.find(s => s.key === 'resume').dmaFrames, bad[0].frames);
});
