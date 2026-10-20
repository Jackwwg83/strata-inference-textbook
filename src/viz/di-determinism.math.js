/* Pure numbers behind the DeepInfer "determinism" page widgets.
   Teaching models only, not DeepInfer kernels:
   1. one row of 64 float32 products, reduced in a number of chunks that depends on the batch size
      (a toy split-reduction kernel), or in a fixed number of chunks (the batch-invariant idea);
   2. a token mask for the regex [A-Z]{2}-[0-9]{3} over a 12-token toy vocabulary, packed 32 tokens per
      int32 word like the structured-output bitmask in DeepInfer. */
(function (root) {
  'use strict';
  const f = Math.fround;

  /* ---------- 1. batch shape and reduction order ---------- */
  const N = 64;          // values in one row (one logit = a dot product of 64 products)
  const UNITS = 16;      // compute units of the toy GPU
  const BI_SPLITS = 4;   // chunk count in batch-invariant mode: fixed, whatever the batch size
  const SEED = 7;        // the default row; chosen so that all five chunk counts give five different sums
  const RIVAL = f(5.5485552); // the score of the other candidate token: sits between the variants of SEED 7

  // Deterministic uniform numbers in [0, 1): a 32-bit linear congruential generator.
  function lcg(seed, n) {
    let s = seed >>> 0;
    const out = [];
    for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; out.push(s / 4294967296); }
    return out;
  }

  // One row of N float32 values with mixed signs and magnitudes from 0.01 to 10.
  function row(seed = SEED) {
    if (!Number.isInteger(seed) || seed < 0) throw new Error('seed 必须是非负整数');
    const u = lcg(seed, 2 * N), v = [];
    for (let i = 0; i < N; i++) v.push(f((u[2 * i + 1] < 0.5 ? -1 : 1) * Math.pow(10, -2 + 3 * u[2 * i])));
    return v;
  }

  // The toy kernel: with few rows in the batch it splits each row into more chunks, so every unit has work.
  // The chunk count is the largest power of two with batch × chunks ≤ UNITS (at least 1, at most UNITS).
  // In batch-invariant mode the chunk count is fixed.
  function splitsFor(batch, invariant) {
    if (!Number.isInteger(batch) || batch < 1) throw new Error('批大小必须是正整数');
    if (invariant) return BI_SPLITS;
    let s = 1;
    while (s * 2 * batch <= UNITS && s < UNITS) s *= 2;
    return s;
  }

  // Each chunk is summed left to right in float32; the chunk sums are then added pairwise, also in float32.
  function reduce(values, splits) {
    if (!Number.isInteger(splits) || splits < 1 || values.length % splits) throw new Error('段数必须整除元素个数');
    const len = values.length / splits, parts = [];
    for (let k = 0; k < splits; k++) {
      let s = 0;
      for (let i = k * len; i < (k + 1) * len; i++) s = f(s + values[i]);
      parts.push(s);
    }
    let level = parts.slice();
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? f(level[i] + level[i + 1]) : level[i]);
      level = next;
    }
    return { value: level[0], parts };
  }

  // The sum of the same float32 inputs in float64: a reference, not "the" float32 answer.
  function exactSum(values) { return values.reduce((a, b) => a + b, 0); }

  // Bits of a float32 as 8 hex digits, and the distance in float32 steps (ULP) between two float32 values.
  const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer), i32 = new Int32Array(f32.buffer);
  function hexF32(x) { f32[0] = x; return u32[0].toString(16).padStart(8, '0'); }
  function ordered(x) { f32[0] = x; const i = i32[0]; return i < 0 ? -(i & 0x7fffffff) : i; }
  function ulpF32(a, b) { return Math.abs(ordered(a) - ordered(b)); }

  // Greedy choice between two candidate tokens: 甲 scores this row's sum, 乙 scores RIVAL.
  function pickToken(value, rival = RIVAL) { return value > rival ? 0 : 1; }

  // Share of the UNITS that hold a chunk of work.
  function occupancy(batch, splits) { return Math.min(UNITS, batch * splits) / UNITS; }

  // Every batch size from 1 to maxBatch for one row and one mode.
  function sweep(invariant, maxBatch = UNITS, seed = SEED) {
    const v = row(seed);
    const rows = [];
    for (let b = 1; b <= maxBatch; b++) {
      const splits = splitsFor(b, invariant), r = reduce(v, splits);
      rows.push({ batch: b, splits, value: r.value, token: pickToken(r.value), occupancy: occupancy(b, splits) });
    }
    return { rows, distinct: [...new Set(rows.map(r => r.value))].length };
  }

  /* ---------- 2. a token mask for a regex ---------- */
  const PATTERN = '[A-Z]{2}-[0-9]{3}';
  const CLASSES = ['A-Z', 'A-Z', '-', '0-9', '0-9', '0-9'];
  const EOS = '<eos>';
  // Toy vocabulary: id = index. The model "wants" to tell a story (the Chinese tokens score highest).
  const VOCAB = ['从前', '冰箱', '，', 'AB', 'Q', 'Z-', '-', '12', '7', '345', 'A1', EOS];
  const BASE = [3.0, 2.9, 2.8, 1.2, 1.5, 1.6, 0.4, 1.1, 0.8, 1.3, 1.4, 0.2];
  const STORY = [0, 1, 2]; // the story token that gets a +2 bonus at step s is STORY[s % 3]

  function charOk(cls, ch) {
    if (cls === 'A-Z') return ch >= 'A' && ch <= 'Z';
    if (cls === '0-9') return ch >= '0' && ch <= '9';
    return ch === cls;
  }

  // State = how many characters of the pattern are already written (0..6), or -1 once EOS is written.
  // Returns the new state, or null if the token breaks the pattern.
  function advance(state, tokenId) {
    const tok = VOCAB[tokenId];
    if (tok === undefined) throw new Error('未知的 token：' + tokenId);
    if (state < 0) return null;
    if (tok === EOS) return state === CLASSES.length ? -1 : null;
    let s = state;
    for (const ch of tok) {
      if (s >= CLASSES.length || !charOk(CLASSES[s], ch)) return null;
      s++;
    }
    return s;
  }

  function allowed(state) { return VOCAB.map((_, id) => advance(state, id) !== null); }

  // Pack the allowed set like the DeepInfer bitmask: bit (id & 31) of word (id >> 5). Words as unsigned numbers.
  function packMask(allow) {
    const words = new Array(Math.ceil(allow.length / 32)).fill(0);
    allow.forEach((ok, id) => { if (ok) words[id >> 5] = (words[id >> 5] | (1 << (id & 31))) >>> 0; });
    return words;
  }

  function scores(step) { return BASE.map((b, id) => b + (id === STORY[step % STORY.length] ? 2 : 0)); }

  // One greedy step. With the mask, a blocked token's score becomes -Infinity before the argmax.
  function stepGreedy(state, step, constrained) {
    const raw = scores(step), allow = constrained ? allowed(state) : VOCAB.map(() => true);
    const masked = raw.map((s, id) => (allow[id] ? s : -Infinity));
    let best = 0;
    for (let id = 1; id < masked.length; id++) if (masked[id] > masked[best]) best = id;
    const next = constrained ? advance(state, best) : state;
    return { raw, allow, masked, token: best, next, words: packMask(allow) };
  }

  // Greedy decoding until EOS or maxSteps.
  function runGreedy(constrained, maxSteps = 6) {
    let state = 0, text = '';
    const steps = [];
    for (let step = 0; step < maxSteps; step++) {
      const r = stepGreedy(state, step, constrained);
      steps.push(r);
      if (VOCAB[r.token] === EOS) { state = -1; break; }
      text += VOCAB[r.token];
      state = r.next;
    }
    return { text, steps, finished: state === -1 };
  }

  const api = {
    N, UNITS, BI_SPLITS, SEED, RIVAL, lcg, row, splitsFor, reduce, exactSum, hexF32, ulpF32, pickToken, occupancy, sweep,
    PATTERN, CLASSES, EOS, VOCAB, BASE, advance, allowed, packMask, scores, stepGreedy, runGreedy,
  };
  root.VizMath = root.VizMath || {};
  root.VizMath.diDeterminism = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
