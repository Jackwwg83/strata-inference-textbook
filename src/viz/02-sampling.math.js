/* Pure numbers behind the chapter 02 widgets: softmax with temperature, FP32 overflow, inverse-CDF picking,
   and a counter-based teaching RNG. The RNG is a small integer hash, NOT Strata's Philox 4x32-10. */
(function (root) {
  'use strict';
  const F32_MAX = 3.4028234663852886e38;
  const F32_MAX_EXP_INPUT = Math.log(F32_MAX);   // about 88.72: exp() of anything larger overflows FP32

  const f32 = x => (Math.abs(x) > F32_MAX && Number.isFinite(x)) || x === Infinity ? Infinity : Math.fround(x);

  // Index of the largest value; equal values keep the lower index (Strata's greedy tie rule).
  function argmax(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }

  // logits -> probabilities. T <= 0 is the greedy branch: a one-hot on the argmax, no division by zero.
  // opts.stable: subtract the max first (default true). opts.f32: round every exp to FP32 to show overflow.
  function softmax(logits, T, opts = {}) {
    const stable = opts.stable !== false, use32 = !!opts.f32;
    if (!(T >= 0)) throw new Error('温度不能为负');
    if (T === 0) { const k = argmax(logits); return { probs: logits.map((_, i) => (i === k ? 1 : 0)), exps: [], scaled: [], greedy: true, overflow: false }; }
    const scaled = logits.map(z => z / T);
    const shift = stable ? Math.max(...scaled) : 0;
    const exps = scaled.map(s => (use32 ? f32(Math.exp(s - shift)) : Math.exp(s - shift)));
    const overflow = exps.some(e => e === Infinity);
    const sum = exps.reduce((a, b) => a + b, 0);
    return { probs: exps.map(e => e / sum), exps, scaled, shift, sum, greedy: false, overflow };
  }

  function cumulative(p) { let c = 0; return p.map(x => (c += x)); }

  // Inverse-CDF pick: the first index whose cumulative probability exceeds u; the last one if rounding leaves a gap.
  function pick(p, u) {
    if (!(u >= 0 && u < 1)) throw new Error('u 必须在 [0, 1) 之间');
    let c = 0;
    for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; }
    return p.length - 1;
  }

  // Counter-based uniform in [0, 1) with 24 random bits: a pure function of (seed, counter).
  function uniform(seed, counter) {
    let h = Math.imul(seed >>> 0, 0x9e3779b1) ^ Math.imul((counter >>> 0) + 0x632be5ab, 0x85ebca6b);
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
    h ^= h >>> 16;
    return (h >>> 8) / 16777216;
  }

  const api = { F32_MAX, F32_MAX_EXP_INPUT, argmax, softmax, cumulative, pick, uniform };
  root.VizMath = root.VizMath || {};
  root.VizMath.sampling = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
