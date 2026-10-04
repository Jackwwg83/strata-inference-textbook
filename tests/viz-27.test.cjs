'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/27-bench.math.js');

test('mean, median, nearest-rank percentile and sample standard deviation', () => {
  const x = [8, 9, 10, 11, 100];
  assert.equal(m.mean(x), 27.6);
  assert.equal(m.median(x), 10);
  assert.equal(m.median([4, 1, 3, 2]), 2.5);
  assert.equal(m.percentile(x, 95), 100, 'with 5 samples p95 is the maximum');
  assert.equal(m.percentile(x, 50), 10);
  assert.equal(m.percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 95), 19);
  assert.equal(m.stdev([2, 4, 4, 4, 5, 5, 7, 9]).toFixed(4), '2.1381');
  assert.equal(m.stdev([5]), 0);
  assert.throws(() => m.mean([]));
  assert.throws(() => m.percentile([1], 0));
  const s = m.summarize([52.7, 66.8, 97.4]);
  assert.equal(s.n, 3);
  assert.equal(s.median, 66.8);
  assert.equal(s.mean.toFixed(1), '72.3');
  assert.equal(s.p95, 97.4);
});

test('the seeded generator is deterministic and stays in [0, 1)', () => {
  const a = m.rng(7), b = m.rng(7);
  for (let i = 0; i < 1000; i++) { const x = a(); assert.equal(x, b()); assert.ok(x >= 0 && x < 1); }
  assert.notEqual(m.rng(1)(), m.rng(2)());
});

test('cold runs are slow at the start of the session and fade linearly', () => {
  assert.deepEqual([0, 1, 2, 3].map(i => +m.coldFactor(i).toFixed(4)), [1.8, 1.5333, 1.2667, 1]);
});

test('a session runs A and B in the requested order, with warm-up runs flagged', () => {
  const seq = m.runSession({ n: 3, warm: 1, order: 'sequential', seed: 1 });
  assert.equal(seq.runs.length, 8);
  assert.deepEqual(seq.runs.map(r => r.cfg).join(''), 'AAAABBBB');
  assert.deepEqual(seq.runs.map(r => r.warmup), [true, false, false, false, true, false, false, false]);
  const alt = m.runSession({ n: 3, warm: 1, order: 'interleaved', seed: 1 });
  assert.deepEqual(alt.runs.map(r => r.cfg).join(''), 'ABABABAB');
  assert.equal(alt.A.n, 3);
  assert.equal(alt.B.n, 3);
  assert.ok(seq.runs[0].cold && seq.runs[0].ms > 150, 'the very first run pays the cold start');
  assert.throws(() => m.runSession({ n: 0, warm: 0, order: 'sequential', seed: 1 }));
  assert.throws(() => m.runSession({ n: 3, warm: 0, order: 'random', seed: 1 }));
});

test('three runs, no warm-up, A first: the measured gap is never near the true 5%', () => {
  let tooBig = 0, flipped = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const r = m.runSession({ n: 3, warm: 0, order: 'sequential', seed });
    assert.ok(Math.abs(r.gapMedian - m.TRUE_GAP) > 10, `seed ${seed}: ${r.gapMedian}`);
    if (r.gapMedian > 15) tooBig++;
    if (r.gapMedian < 0) flipped++;
  }
  assert.ok(tooBig >= 45, 'mostly the cold start makes A look far slower');
  assert.ok(flipped >= 1, 'two outliers among three B runs can even flip the sign');
});

test('fifteen interleaved runs after three warm-ups usually land near the true 5%', () => {
  let close = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const r = m.runSession({ n: 15, warm: 3, order: 'interleaved', seed });
    if (Math.abs(r.gapMedian - m.TRUE_GAP) <= 2.5) close++;
  }
  assert.ok(close >= 40, `only ${close} / 50 seeds were close`);
  assert.equal(m.TRUE_GAP, 5);
});

test('a streamed request yields TTFT and three rate definitions', () => {
  const t = m.timeline({ n: 20, queue: 0, accept: 0, seed: 3 });
  assert.equal(t.tokens.length, 20);
  assert.equal(t.tFirst, m.PREFILL_MS);
  assert.equal(t.tokens[0], t.tFirst);
  for (let i = 1; i < 20; i++) assert.equal(t.tokens[i] - t.tokens[i - 1], m.STEP_MS);
  const r = m.rates(t);
  assert.equal(r.ttft, 800);
  assert.equal(r.e2e.toFixed(3), (20 / (t.tEnd / 1000)).toFixed(3));
  assert.equal(r.perDecode, 20 / (19 * 25 / 1000));
  assert.equal(r.perGap, 19 / (19 * 25 / 1000));
  const q = m.rates(m.timeline({ n: 20, queue: 2, accept: 0, seed: 3 }));
  assert.equal(q.ttft, 800 + 2 * m.QUEUE_MS);
  const one = m.rates(m.timeline({ n: 1, queue: 0, accept: 0, seed: 3 }));
  assert.equal(one.perGap, null, 'one token has no gap to divide by');
  assert.equal(one.perDecode, null);
});

test('drafts make tokens arrive in bursts but never more than the request asked for', () => {
  const t = m.timeline({ n: 30, queue: 0, accept: 0.9, seed: 5 });
  assert.equal(t.tokens.length, 30);
  const steps = new Set(t.tokens).size;
  assert.ok(steps < 20, 'several tokens share one step');
  for (let i = 1; i < t.tokens.length; i++) assert.ok(t.tokens[i] >= t.tokens[i - 1]);
});

test('the cumulative live meter spikes at the first token; the 2-second window does not', () => {
  const t = m.timeline({ n: 40, queue: 0, accept: 0, seed: 1 });
  const cum = m.meterMean(t, t.tFirst + 10), win = m.meterWindow(t, t.tFirst + 10);
  assert.equal(cum, 100, '1 token in 10 ms reads as 100 token/s');
  assert.equal(win, 4, '1 token over the 0.25 s floor');
  const later = t.tFirst + 900;
  assert.ok(Math.abs(m.meterWindow(t, later) - 40) < 2.5);
  assert.equal(m.meterMean(t, t.tFirst - 1), null);
});
