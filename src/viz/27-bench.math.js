/* Pure numbers behind the chapter 27 widgets: summary statistics, a seeded benchmark session with a
   cold start, and a streamed request timeline. Every timing here is a teaching assumption, not a measurement. */
(function (root) {
  'use strict';

  function need(xs) { if (!Array.isArray(xs) || !xs.length) throw new Error('至少需要一个样本'); }
  function mean(xs) { need(xs); return xs.reduce((a, b) => a + b, 0) / xs.length; }
  function median(xs) {
    need(xs);
    const s = [...xs].sort((a, b) => a - b), h = s.length >> 1;
    return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
  }
  // Nearest-rank percentile: sort, then take the ceil(p/100 * n)-th value. With n < 20, p95 is the maximum.
  function percentile(xs, p) {
    need(xs);
    if (!(p > 0 && p <= 100)) throw new Error('百分位必须在 (0, 100] 之间');
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.ceil(p / 100 * s.length) - 1];
  }
  // Sample standard deviation (divides by n - 1); 0 for a single sample.
  function stdev(xs) {
    need(xs);
    if (xs.length < 2) return 0;
    const mu = mean(xs);
    return Math.sqrt(xs.reduce((a, x) => a + (x - mu) ** 2, 0) / (xs.length - 1));
  }
  function summarize(xs) {
    return { n: xs.length, mean: mean(xs), median: median(xs), p95: percentile(xs, 95), min: Math.min(...xs), max: Math.max(...xs), sd: stdev(xs) };
  }

  // mulberry32: a small seeded generator, so a "random" session can be replayed exactly.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- a benchmark session: A (true 100 ms) against B (true 95 ms) ---------- */
  const TRUE_MS = { A: 100, B: 95 };
  const TRUE_GAP = (TRUE_MS.A - TRUE_MS.B) / TRUE_MS.A * 100;
  const JITTER = 0.04, OUTLIER_P = 0.08, OUTLIER_X = 2.5, COLD_RUNS = 3, COLD_PEAK = 1.8;
  // The machine warms up once per session: run g (0-based, counted over A and B together) is slowed by this factor.
  function coldFactor(g) { return g < COLD_RUNS ? 1 + (COLD_PEAK - 1) * (COLD_RUNS - g) / COLD_RUNS : 1; }

  function runSession({ n, warm, order, seed }) {
    if (!Number.isInteger(n) || n < 1) throw new Error('每组至少跑 1 次');
    if (!Number.isInteger(warm) || warm < 0) throw new Error('预热次数必须是非负整数');
    if (order !== 'sequential' && order !== 'interleaved') throw new Error('未知的运行顺序：' + order);
    const per = n + warm, plan = [];
    if (order === 'sequential') { for (let i = 0; i < per; i++) plan.push('A'); for (let i = 0; i < per; i++) plan.push('B'); }
    else for (let i = 0; i < per; i++) plan.push('A', 'B');
    const r = rng(seed), seen = { A: 0, B: 0 };
    const runs = plan.map((cfg, g) => {
      const jitter = 1 + JITTER * (2 * r() - 1), outlier = r() < OUTLIER_P;
      const ms = TRUE_MS[cfg] * jitter * coldFactor(g) * (outlier ? OUTLIER_X : 1);
      const k = seen[cfg]++;
      return { cfg, g, k, ms, cold: g < COLD_RUNS, outlier, warmup: k < warm };
    });
    const pickMs = cfg => runs.filter(x => x.cfg === cfg && !x.warmup).map(x => x.ms);
    const A = summarize(pickMs('A')), B = summarize(pickMs('B'));
    const gap = (a, b) => (a - b) / a * 100;
    return { runs, A, B, gapMedian: gap(A.median, B.median), gapMean: gap(A.mean, B.mean), gapP95: gap(A.p95, B.p95) };
  }

  /* ---------- one streamed request ---------- */
  const PREFILL_MS = 800, STEP_MS = 25, QUEUE_MS = 1500, MAX_DRAFT = 3, WINDOW_MS = 2000, MIN_SPAN_MS = 250;
  // queue: requests ahead in a FIFO; accept: chance each extra drafted token is accepted (they stop at the first miss).
  function timeline({ n, queue, accept, seed }) {
    if (!Number.isInteger(n) || n < 1) throw new Error('至少输出 1 个 token');
    const r = rng(seed), tStart = queue * QUEUE_MS, tFirst = tStart + PREFILL_MS, tokens = [tFirst];
    let t = tFirst;
    while (tokens.length < n) {
      t += STEP_MS;
      let got = 1;
      while (got <= MAX_DRAFT && r() < accept) got++;
      for (let i = 0; i < got && tokens.length < n; i++) tokens.push(t);
    }
    return { n, queue, accept, tSend: 0, tStart, tFirst, tokens, tEnd: tokens[tokens.length - 1] };
  }

  function rates(tl) {
    const span = tl.tokens[tl.tokens.length - 1] - tl.tFirst;
    return {
      ttft: tl.tFirst - tl.tSend,
      e2e: tl.n / ((tl.tEnd - tl.tSend) / 1000),
      perDecode: span > 0 ? tl.n / (span / 1000) : null,
      perGap: tl.n > 1 && span > 0 ? (tl.n - 1) / (span / 1000) : null,
      span,
    };
  }

  // Live meter, version 1: tokens so far divided by time since the first token. Spikes right after it.
  function meterMean(tl, now) {
    if (now <= tl.tFirst) return null;
    return tl.tokens.filter(x => x <= now).length / ((now - tl.tFirst) / 1000);
  }
  // Live meter, version 2: tokens in the last 2 s over the window span, floored at 0.25 s.
  function meterWindow(tl, now) {
    if (now < tl.tFirst) return null;
    const count = tl.tokens.filter(x => x <= now && x > now - WINDOW_MS).length;
    const span = Math.max(Math.min(WINDOW_MS, now - tl.tFirst), MIN_SPAN_MS);
    return count / (span / 1000);
  }

  const api = { mean, median, percentile, stdev, summarize, rng, TRUE_MS, TRUE_GAP, JITTER, OUTLIER_P, OUTLIER_X, COLD_RUNS, COLD_PEAK, coldFactor, runSession,
    PREFILL_MS, STEP_MS, QUEUE_MS, MAX_DRAFT, WINDOW_MS, MIN_SPAN_MS, timeline, rates, meterMean, meterWindow };
  root.VizMath = root.VizMath || {};
  root.VizMath.bench = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
