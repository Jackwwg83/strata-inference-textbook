/* Pure numbers behind the chapter 26 widgets: float comparison and a toy mutation-testing matrix.
   Teaching models only. The tolerance rule is Python's math.isclose; nothing here is a Strata kernel. */
(function (root) {
  'use strict';
  const rnd = (x, prec) => (prec === 'f32' ? Math.fround(x) : x);

  // Sums `values` in the given order. Every input and every partial sum is rounded to `prec`.
  // forward / reverse return the running sums; pairwise is a tree, like a GPU reduction.
  function sum(values, order, prec) {
    if (!['f32', 'f64'].includes(prec)) throw new Error('precision 必须是 f32 或 f64');
    const v = values.map(x => rnd(x, prec));
    if (order === 'forward' || order === 'reverse') {
      const seq = order === 'forward' ? v : [...v].reverse();
      const partials = [];
      let s = 0;
      for (const x of seq) { s = rnd(s + x, prec); partials.push(s); }
      return { value: s, partials };
    }
    if (order === 'pairwise') {
      const tree = a => (a.length === 1 ? a[0] : rnd(tree(a.slice(0, a.length >> 1)) + tree(a.slice(a.length >> 1)), prec));
      return { value: v.length ? tree(v) : 0, partials: [] };
    }
    throw new Error('未知的累加顺序：' + order);
  }

  // Python's math.isclose: |a-b| <= max(rtol * max(|a|,|b|), atol). NaN is close to nothing.
  function isClose(a, b, rtol, atol) {
    if (!(rtol >= 0) || !(atol >= 0)) throw new Error('容差必须是非负数');
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    if (a === b) return true;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a - b) <= Math.max(rtol * Math.max(Math.abs(a), Math.abs(b)), atol);
  }

  function judge(a, b, rtol, atol) {
    const d = Math.abs(a - b);
    return {
      exact: a === b,
      absOnly: d <= atol,
      relOnly: d <= rtol * Math.max(Math.abs(a), Math.abs(b)),
      combined: isClose(a, b, rtol, atol),
    };
  }

  // How many float32 values lie between a and b (both rounded to float32 first). -0 and +0 count as one value.
  const f32 = new Float32Array(1), i32 = new Int32Array(f32.buffer);
  function ordered(x) { f32[0] = x; const i = i32[0]; return i < 0 ? -(i & 0x7fffffff) : i; }
  function ulpF32(a, b) { return Math.abs(ordered(a) - ordered(b)); }

  // Deterministic numbers in [-1, 1): a small linear congruential generator, exact in float64.
  function lcg(seed, n) {
    const out = [];
    let s = seed;
    for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) % 2147483648; out.push(s / 1073741824 - 1); }
    return out;
  }

  const SCENARIOS = [
    { id: 'tenths', a: 'forward', b: 'literal', literal: 0.3, values: () => [0.1, 0.2] },
    { id: 'swamp', a: 'forward', b: 'pairwise', values: () => [1e8, 1, -1e8, 1] },
    { id: 'drift', a: 'forward', b: 'pairwise', values: () => Array(1000).fill(0.1) },
    { id: 'dot', a: 'forward', b: 'pairwise', products: true, values: () => { const x = lcg(26, 256), y = lcg(2026, 256); return x.map((v, i) => [v, y[i]]); } },
    { id: 'nearzero', a: 'forward', b: 'reverse', values: () => [1, 2e-8, -1, 2e-8] },
  ];

  // Both computation paths of one scenario, plus a float64 reference of the rounded inputs.
  function runScenario(id, prec) {
    const s = SCENARIOS.find(x => x.id === id);
    if (!s) throw new Error('未知场景：' + id);
    let v = s.values();
    if (s.products) v = v.map(([x, y]) => rnd(rnd(x, prec) * rnd(y, prec), prec));
    const a = sum(v, s.a, prec);
    const b = s.b === 'literal' ? { value: rnd(s.literal, prec), partials: [] } : sum(v, s.b, prec);
    const ref = s.b === 'literal' ? s.literal : v.map(x => rnd(x, prec)).reduce((p, x) => p + x, 0);
    return { id, prec, n: v.length, values: v, a, b, ref };
  }

  /* ---------- a toy layer stack for mutation testing ---------- */
  const LAYERS = 48, K = 4;
  const TOL = { rtol: 1e-5, atol: 1e-6 };
  const MUTANTS = ['ok', 'w2', 'drop', 'stale'];
  const TESTS = ['smoke', 'weakUnit', 'strongUnit', 'diffExact', 'diffTol'];
  const f = Math.fround;
  // Router weights per layer (they sum to 1) and one scalar "expert" per slot, all exact rationals.
  function weights(l) { const raw = [0, 1, 2, 3].map(i => 1 + ((l * 7 + i * 3) % 5)); const t = raw.reduce((a, b) => a + b, 0); return raw.map(r => f(r / t)); }
  function expert(l, i) { return f((((l * 37 + i * 91) % 61) - 30) / 500); }

  // The weighted sum of expert outputs. `ref` and `ok` differ only in summation order.
  function combine(variant, parts, w) {
    const n = parts.length;
    let s = 0;
    if (variant === 'ok') { for (let i = n - 1; i >= 0; i--) s = f(s + f(w[i] * parts[i])); return s; }
    if (variant === 'w2') { for (let i = 0; i < n; i++) s = f(s + f(f(w[i] * w[i]) * parts[i])); return s; }
    if (variant === 'drop') { for (let i = 0; i < n - 1; i++) s = f(s + f(w[i] * parts[i])); return s; }
    for (let i = 0; i < n; i++) s = f(s + f(w[i] * parts[i]));
    return s;
  }

  // x <- x + combine(expert_i(x)) for 48 layers. `ok` adds each weighted expert straight into the residual,
  // last expert first: the same sum in another order. `stale` feeds layer 0's input to every layer.
  function runModel(variant) {
    if (variant !== 'ref' && !MUTANTS.includes(variant)) throw new Error('未知实现：' + variant);
    let x = 1;
    const x0 = x, trace = [x];
    for (let l = 0; l < LAYERS; l++) {
      const input = variant === 'stale' ? x0 : x, w = weights(l);
      const parts = Array.from({ length: K }, (_, i) => f(expert(l, i) * input));
      if (variant === 'ok') { for (let i = K - 1; i >= 0; i--) x = f(x + f(w[i] * parts[i])); }
      else x = f(x + combine(variant, parts, w));
      trace.push(x);
    }
    return { final: x, trace };
  }

  function runTests(variant) {
    if (!MUTANTS.includes(variant)) throw new Error('未知实现：' + variant);
    const got = runModel(variant).final, want = runModel('ref').final;
    const weak = combine(variant, [2], [1]);
    const strong = combine(variant, [1, 3], [f(0.7), f(0.3)]);
    return [
      { id: 'smoke', pass: Number.isFinite(got) && got !== 0 && Math.abs(got) < 1e6, got, want: null },
      { id: 'weakUnit', pass: weak === 2, got: weak, want: 2 },
      { id: 'strongUnit', pass: isClose(strong, 1.6, 1e-6, 1e-7), got: strong, want: 1.6 },
      { id: 'diffExact', pass: got === want, got, want },
      { id: 'diffTol', pass: isClose(got, want, TOL.rtol, TOL.atol), got, want },
    ];
  }

  const api = { sum, isClose, judge, ulpF32, lcg, SCENARIOS, runScenario, LAYERS, K, TOL, MUTANTS, TESTS, weights, expert, combine, runModel, runTests };
  root.VizMath = root.VizMath || {};
  root.VizMath.testing = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
