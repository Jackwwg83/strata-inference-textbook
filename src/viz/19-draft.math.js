/* Pure numbers behind the chapter 19 widgets. Teaching model of the draft-length decision.
   stepMs / choose / observe follow src/spec/controller.cpp and include/strata/spec/controller.hpp
   at the pinned commit (CostModel defaults, min_gain 0.05, ema 0.05, K_MAX 8). Acceptance in the
   simulation is drawn from a seeded generator: a teaching assumption, not a Strata measurement. */
(function (root) {
  'use strict';
  const K_MAX = 8;
  const DEFAULT_COST = Object.freeze({
    denseMs: 11.0,
    denseRatio: [1.0, 1.05, 1.3, 1.45, 1.85, 2.2, 2.6, 3.0, 3.3],
    cpuAllMissMs: 15.8,
    hitRate: 0.55,
    distinctRatio: [1.0, 1.70, 2.31, 2.88, 3.40, 3.89, 4.35, 4.80, 5.2],
    extraUseCost: 0.25,
    syncMs: 2.4,
    mtpDraftMs: 1.2,
  });
  const MIN_GAIN = 0.05, ALPHA = 0.05, PRIOR = 0.86;

  const prob = (p, name) => { if (!(p >= 0 && p <= 1)) throw new Error(name + ' 必须在 0 到 1 之间'); return p; };
  const intK = (k) => { if (!Number.isInteger(k) || k < 0) throw new Error('k 必须是非负整数'); return k; };

  // Step time for verifying n = k + 1 tokens plus drafting k tokens (CostModel::step_ms, MTP drafts).
  function stepMs(k, cost = DEFAULT_COST) {
    intK(k);
    const n = Math.min(Math.max(k + 1, 1), K_MAX + 1);
    const dense = cost.denseMs * cost.denseRatio[n - 1];
    const u = cost.distinctRatio[n - 1];
    const usesPerExpert = n / u;
    const cpu = (1 - cost.hitRate) * cost.cpuAllMissMs * u * (1 + cost.extraUseCost * (usesPerExpert - 1));
    const draft = Math.min(k, K_MAX) * cost.mtpDraftMs;
    return { k, n, dense, cpu, sync: cost.syncMs, draft, total: dense + cpu + cost.syncMs + draft };
  }

  // E = 1 + p1 + p1p2 + ... ; p is one number (same at every position) or an array of conditional rates.
  function expected(p, k) {
    intK(k);
    const arr = Array.isArray(p);
    if (arr && p.length < k) throw new Error('概率数组比 k 短');
    let e = 1, run = 1;
    for (let i = 0; i < k; i++) { run *= prob(arr ? p[i] : p, '接受率'); e += run; }
    return e;
  }

  // Closed form of 1 + p + ... + p^k.
  function geometric(p, k) {
    prob(p, '接受率'); intK(k);
    return p === 1 ? k + 1 : (1 - p ** (k + 1)) / (1 - p);
  }

  // Rates for k = 0..K_MAX in tokens per second; the choice keeps k = 0 unless the best beats it by minGain.
  function choose(p, cost = DEFAULT_COST, minGain = MIN_GAIN) {
    const rows = [];
    for (let k = 0; k <= K_MAX; k++) {
      const e = k === 0 ? 1 : expected(p, k), s = stepMs(k, cost);
      rows.push({ k, e, ms: s.total, step: s, rate: e / s.total * 1000 });
    }
    const baseline = rows[0].rate;
    let best = rows[0];
    for (const r of rows) if (r.rate > best.rate) best = r;
    const pick = best.k > 0 && best.rate < baseline * (1 + minGain) ? rows[0] : best;
    return { k: pick.k, e: pick.e, rate: pick.rate, ms: pick.ms, bestK: best.k, bestRate: best.rate, baseline, threshold: baseline * (1 + minGain), rows };
  }

  function ema(prev, x, alpha) {
    if (!(alpha >= 0 && alpha <= 1)) throw new Error('alpha 必须在 0 到 1 之间');
    return prev + alpha * (x - prev);
  }

  // Rounds until an old value's weight drops to one half: (1 - alpha)^h = 1/2.
  function halfLife(alpha) {
    if (!(alpha > 0 && alpha < 1)) throw new Error('alpha 必须在 0 到 1 之间（不含端点）');
    return Math.log(0.5) / Math.log(1 - alpha);
  }

  // Standard deviation of an EMA fed with 0/1 outcomes of a fixed rate p, once it has settled.
  function emaNoise(alpha, p) {
    prob(p, 'p');
    if (!(alpha > 0 && alpha <= 1)) throw new Error('alpha 必须在 0 到 1 之间');
    return Math.sqrt(alpha / (2 - alpha) * p * (1 - p));
  }

  // Controller::observe for MTP drafts. 'censored' updates positions 0..accepted (the first rejection included);
  // 'naive' is the wrong variant that also records every position after the first rejection as a failure.
  function observe(pArr, k, accepted, alpha = ALPHA, mode = 'censored') {
    const p = pArr.slice();
    if (k <= 0) return p;
    accepted = Math.min(Math.max(accepted, 0), k);
    const seen = mode === 'naive' ? k : Math.min(k, accepted + 1);
    for (let i = 0; i < seen; i++) p[i] = ema(p[i], i < accepted ? 1 : 0, alpha);
    if (accepted === k && k < K_MAX) for (let i = k; i < K_MAX; i++) p[i] = ema(p[i], p[k - 1], alpha);
    return p;
  }

  // Small seeded generator (mulberry32) so a run can be replayed exactly.
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Rounds of draft -> verify -> observe. The true conditional acceptance is the same at every position and jumps
  // from pBefore to pAfter at round switchAt. window 'auto' lets choose() pick k from the estimates (the Controller
  // loop); a number keeps k fixed (like an MTP window set by --spec) and only reports what choose() would pick.
  // est[i] is the estimate before round i is observed.
  function simulate({ rounds = 300, switchAt = 150, pBefore = PRIOR, pAfter = 0.55, alpha = ALPHA, mode = 'censored', seed = 7, window = 'auto', cost = DEFAULT_COST } = {}) {
    prob(pBefore, 'pBefore'); prob(pAfter, 'pAfter');
    if (window !== 'auto') intK(window);
    const rand = rng(seed);
    let p = Array(K_MAX).fill(PRIOR), tokens = 0, ms = 0;
    const est = [], k = [], suggested = [], accepted = [], truth = [];
    for (let i = 0; i < rounds; i++) {
      const pt = i < switchAt ? pBefore : pAfter;
      const c = choose(p, cost);
      const kk = window === 'auto' ? c.k : Math.min(window, K_MAX);
      let a = 0;
      while (a < kk && rand() < pt) a++;
      est.push(p); k.push(kk); suggested.push(c.k); accepted.push(a); truth.push(pt);
      tokens += a + 1; ms += stepMs(kk, cost).total;
      p = observe(p, kk, a, alpha, mode);
    }
    return { est, k, suggested, accepted, truth, tokens, ms, rate: tokens / ms * 1000, final: p };
  }

  const api = { K_MAX, DEFAULT_COST, MIN_GAIN, ALPHA, PRIOR, stepMs, expected, geometric, choose, ema, halfLife, emaNoise, observe, rng, simulate };
  root.VizMath = root.VizMath || {};
  root.VizMath.draft = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
