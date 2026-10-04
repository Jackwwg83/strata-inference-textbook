'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/21-pipeline.math.js');

test('hand-off payload follows the pinned geometry', () => {
  assert.equal(m.DECODE_HANDOFF_FLOATS, 4 * 2560 + 2560 + 4);
  assert.equal(m.DECODE_HANDOFF_FLOATS, 12804);
  assert.equal(m.DECODE_HANDOFF_BYTES, 51216);
  assert.equal(m.PREFILL_ROW_BYTES, 4 * 2560 * 4);
  assert.equal(m.prefillChunkBytes(2048), 83886080);
  assert.throws(() => m.prefillChunkBytes(0));
});

test('two-stage pipeline matches the closed form a+b+(N-1)max(a,b)', () => {
  const s = m.pipeline(4, 5, 0, 8);
  assert.equal(s.total, 44);
  assert.equal(s.total, 5 * 8 + 4);
  assert.equal(s.serial, 72);
  assert.equal(m.pipeline(4, 5, 0, 1).total, 9);
  assert.equal(m.pipeline(5, 4, 0, 8).total, 44, 'order of the stages does not change the bound');
  assert.equal(m.pipeline(3, 3, 0, 4).total, 15);
  for (const [a, b, x, n] of [[2, 7, 1, 5], [7, 2, 0.5, 6], [4, 4, 2, 3], [1, 9, 0, 1]]) {
    const s2 = m.pipeline(a, b, x, n);
    assert.ok(Math.abs(s2.total - ((a + x) + (b + x) + (n - 1) * Math.max(a + x, b + x))) < 1e-9);
  }
});

test('the schedule keeps every dependency and buffer rule', () => {
  const s = m.pipeline(4, 5, 1, 6);
  s.chunks.forEach((c, i) => {
    assert.ok(c.bStart >= c.aEnd - 1e-9, 'stage B reads a chunk only after A handed it on');
    if (i > 0) {
      assert.ok(c.bStart >= s.chunks[i - 1].bEnd - 1e-9, 'stage B reads one chunk at a time');
      assert.ok(c.aStart >= s.chunks[i - 1].aEnd - 1e-9, 'stage A reads one chunk at a time');
      assert.ok(c.aStart >= s.chunks[i - 1].bStart - 1e-9, 'A waits until B took the previous chunk (two buffers)');
    }
  });
  assert.equal(s.total, s.chunks.at(-1).bEnd);
  assert.ok(Math.abs(s.idleA - (s.total - 6 * 5)) < 1e-9);
  assert.ok(Math.abs(s.idleB - (s.total - 6 * 6)) < 1e-9);
});

test('a single token gains nothing from the split and pays the transfer twice', () => {
  const s = m.pipeline(4, 5, 0.5, 1);
  assert.equal(s.total, 10);
  assert.equal(s.serial, 9);
  assert.ok(s.speedup < 1);
  assert.ok(m.pipeline(4, 5, 0, 64).speedup > 1.7);
  assert.ok(m.pipeline(4, 5, 0, 64).speedup < 1.8);
  assert.throws(() => m.pipeline(0, 5, 0, 2));
  assert.throws(() => m.pipeline(4, 5, -1, 2));
  assert.throws(() => m.pipeline(4, 5, 0, 0));
  assert.throws(() => m.pipeline(4, 5, 0, 2.5));
});

test('link cost is latency per crossing plus bytes over bandwidth', () => {
  assert.equal(m.crossUs(0, 31.5, 10), 10);
  assert.ok(Math.abs(m.crossUs(31.5e3, 31.5, 0) - 1) < 1e-12, '31.5 kB at 31.5 GB/s is one microsecond');
  const split = m.layerSplitWindow(5, 31.5, 10);
  assert.equal(split.crossings, 2);
  assert.equal(split.bytes, 2 * 5 * 51216);
  assert.ok(Math.abs(split.us - 2 * (10 + 5 * 51216 / 31.5e3)) < 1e-9);
  const tp = m.tensorWindow(5, 31.5, 10);
  assert.equal(tp.crossings, 96);
  assert.equal(tp.bytes, 96 * 5 * 2560 * 4);
  assert.ok(tp.us > 10 * split.us, 'many small syncs cost more than one hand-off');
  assert.throws(() => m.crossUs(1, 0, 1));
  assert.throws(() => m.layerSplitWindow(0, 31.5, 10));
});

test('prefill chunk hand-off over the listed links', () => {
  const ms = m.prefillHandoffMs(2048, 31.5);
  assert.equal(ms.toFixed(2), (2 * 83886080 / 31.5e9 * 1000).toFixed(2));
  assert.equal(ms.toFixed(1), '5.3');
  assert.equal(m.prefillHandoffMs(2048, 7.9).toFixed(1), '21.2');
  assert.deepEqual(m.LINKS.map(l => l.gbps), [7.9, 15.8, 31.5, 63, 450]);
});
