'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/di-pd-kv.math.js');

test('token records and the persisted SWA state match the pinned formats and the Q&A', () => {
  assert.equal(m.MXFP8_BYTES, 528);   // 512 FP8 bytes + 16 UE8M0 scales
  assert.equal(m.FP4_BYTES, 288);     // 256 FP4 bytes + 32 E4M3 scales
  assert.equal(m.backtrack(), 6);     // max(raw 0, nextn 5 + 1)
  assert.equal(m.backtrack(1, 5), 6); // benchmark.py sets 1; environ.py lifts it to nextn + 1
  assert.equal(m.backtrack(10, 5), 10);
  assert.equal(m.RESERVE, 134);
  assert.equal(m.keepMin(128, 5), 134);
  assert.ok(140 >= m.keepMin(), 'README default KEEP_TOKENS=140 satisfies the code check');
  assert.equal(m.swaStateBytes(), 1415040);   // Q&A: 20 x 134 x 528 B
  assert.equal(m.swaStateBytes(1, 3, 10), 32); // a 30-byte layer pads to 32
});

test('hit length follows the Q&A policy: cap at L - 134, 128-token blocks, back off one block without SWA', () => {
  const h = m.hitLength(131072, 0.9);
  assert.equal(h.cap, 130938);
  assert.equal(h.L1, 117888);
  assert.equal(h.L1 % 128, 0);
  assert.equal(h.hit, 117888);
  assert.equal(h.compute, 131072 - 117888);
  const full = m.hitLength(1000, 1);
  assert.equal(full.cap, 866);
  assert.equal(full.L1, 768);   // floor(866 / 128) * 128
  const miss = m.hitLength(1000, 1, false);
  assert.equal(miss.hit, 640);
  assert.equal(miss.replay, 128);
  assert.equal(miss.compute, 360);
  assert.equal(m.hitLength(200, 1).hit, 0);          // 200 - 134 = 66 < one block
  assert.equal(m.hitLength(200, 1, false).replay, 0);
  assert.equal(m.hitLength(4096, 0).hit, 0);
  assert.throws(() => m.hitLength(0, 0.5));
  assert.throws(() => m.hitLength(100, 1.5));
});

test('hit-vs-recompute arithmetic: bytes over bandwidth against tokens over throughput', () => {
  const t = m.hitTrade({ L: 131072, ratio: 0.9, prefillTps: 87000, readGBps: 40, kvKiB: 8 });
  assert.equal(t.missMs.toFixed(1), '1506.6');
  assert.equal(t.loadMs.toFixed(1), '24.1');
  assert.equal(t.computeMs.toFixed(1), '151.5');
  assert.equal(t.hitMs.toFixed(1), '175.7');
  assert.equal(t.gpuSavedMs.toFixed(1), '1355.0');
  assert.ok(Math.abs(t.missMs - t.computeMs - t.gpuSavedMs) < 1e-9);
  assert.equal(Math.round(t.breakEvenKiB), 449);
  assert.equal(t.storedBytes, 117888 * 8192);
  assert.equal(Math.round(t.sessionsPerGpu), 14911);
  const noSwa = m.hitTrade({ L: 131072, ratio: 0.9, swaHit: false, prefillTps: 87000, readGBps: 40, kvKiB: 8 });
  assert.equal(noSwa.replayMs.toFixed(2), '1.47');   // bounded replay: a constant 128 tokens
  assert.ok(noSwa.hitMs > t.hitMs && noSwa.hitMs - t.hitMs < 2);
  // Above the break-even size, loading is slower than recomputing the same tokens.
  const slow = m.hitTrade({ L: 131072, ratio: 0.9, prefillTps: 87000, readGBps: 1, kvKiB: 32 });
  assert.ok(32 > slow.breakEvenKiB);
  assert.ok(slow.loadMs > slow.gpuSavedMs);
  assert.throws(() => m.hitTrade({ L: 1000, ratio: 0.5, prefillTps: 0, readGBps: 1, kvKiB: 1 }));
});

test('mixed timeline stalls decode for a whole prefill step; the split timeline keeps the decode rhythm', () => {
  const mixed = m.timeline({ mode: 'mixed', prefillMs: 376, arrivalMs: 200 });
  assert.equal(mixed.maxGap, 389);   // 13 ms decode step + 376 ms prefill
  assert.deepEqual(mixed.segments.filter(s => s.kind === 'prefill').map(s => s.start), [910, 2196]);
  assert.deepEqual(mixed.tracked, { start: 910, end: 1286, ttft: 1086 });
  const split = m.timeline({ mode: 'split', prefillMs: 376, arrivalMs: 200 });
  assert.equal(split.maxGap, 13);
  assert.equal(split.meanGap, 13);
  assert.deepEqual(split.tracked, { start: 376, end: 752, ttft: 552 });
  assert.ok(split.segments.some(s => s.lane === 'p') && split.segments.some(s => s.lane === 'd'));
  // Arrival past the last prefill point in the horizon still gets a finite TTFT.
  const late = m.timeline({ mode: 'mixed', prefillMs: 376, arrivalMs: 2900 });
  assert.equal(late.tracked.start, 2 * 1286 + 910);
  assert.throws(() => m.timeline({ mode: 'both', prefillMs: 1 }));
  assert.equal(m.decodeShare({ prefillMs: 376 }).toFixed(3), '0.708');
});

test('mean TTFT formula matches a dense sweep of arrivals over one cycle', () => {
  for (const [interval, p] of [[70, 376], [10, 731], [100, 68]]) {
    const cycle = interval * 13 + p;
    let sum = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) sum += m.timeline({ mode: 'mixed', prefillMs: p, interval, arrivalMs: (i + 0.5) * cycle / n, horizonMs: 3 * cycle }).tracked.ttft;
    assert.ok(Math.abs(sum / n - m.meanTtft('mixed', { prefillMs: p, interval })) < 1, `interval ${interval}`);
    let sumSplit = 0;
    for (let i = 0; i < n; i++) sumSplit += m.timeline({ mode: 'split', prefillMs: p, arrivalMs: (i + 0.5) * p / n }).tracked.ttft;
    assert.ok(Math.abs(sumSplit / n - m.meanTtft('split', { prefillMs: p })) < 1);
  }
  assert.equal(m.meanTtft('mixed', { prefillMs: 376 }).toFixed(0), '1019');
  assert.equal(m.meanTtft('split', { prefillMs: 376 }), 564);
});

test('mirror CP gives every rank the same causal work; a naive split does not', () => {
  const b = m.cpBalance(131072, 4);
  assert.equal(new Set(b.mirror).size, 1);
  assert.equal(b.mirrorImbalance, 1);
  assert.equal(b.naiveImbalance.toFixed(2), '1.75');
  assert.ok(b.naive[0] < b.naive[1] && b.naive[2] < b.naive[3]);
  const sum = a => a.reduce((x, y) => x + y, 0);
  assert.equal(sum(b.mirror), 131072 * 131073 / 2);
  assert.equal(sum(b.naive), sum(b.mirror));
  assert.equal(m.cpBalance(10, 1).naiveImbalance, 1);
  assert.throws(() => m.cpBalance(10, 0));
});

test('the README prefill chart points are consistent: throughput = tokens / latency', () => {
  const tps = m.PREFILL_POINTS.map(p => p.tokens / p.ms * 1000);
  for (let i = 1; i < tps.length; i++) assert.ok(tps[i] > tps[i - 1], 'throughput rises with batch size');
  assert.ok(Math.abs(tps[3] - 87000) < 1000);
  assert.ok(tps[0] > 58000 && tps[0] < 62000);
});
