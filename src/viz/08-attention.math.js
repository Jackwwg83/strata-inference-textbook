/* Pure numbers behind the chapter 08 widgets. Teaching models, not Strata kernels.
   Head counts and the 2,051-cell selection width come from include/strata/core/layout.hpp and
   include/strata/kernels/qsa.hpp at the pinned commit. */
(function (root) {
  'use strict';
  const N_HEAD = 24, N_KV = 2, HEAD_DIM = 256, QSA_LAYERS = 12;
  const IDX_TOP_K = 2048, IDX_BLOCK = 4, WIDTH = IDX_TOP_K + IDX_BLOCK - 1;   // 2051

  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

  function softmax(xs) {
    const mx = Math.max(...xs);
    const ex = xs.map(x => Math.exp(x - mx));
    const sum = ex.reduce((a, b) => a + b, 0);
    return ex.map(x => x / sum);
  }

  // Scaled dot-product attention for one query: scores q.k, divided by sqrt(d), softmax, weighted sum of values.
  function attend(q, keys, values) {
    if (keys.length !== values.length || keys.length === 0) throw new Error('键和值的个数必须相同且不为 0');
    const d = q.length, scale = 1 / Math.sqrt(d);
    const scores = keys.map(k => dot(q, k));
    const scaled = scores.map(s => s * scale);
    const weights = softmax(scaled);
    const out = new Array(values[0].length).fill(0);
    values.forEach((v, j) => v.forEach((x, i) => { out[i] += weights[j] * x; }));
    return { scores, scaled, weights, out };
  }

  // Query-key pairs when every one of n tokens attends to itself and everything before it.
  const causalPairs = n => n * (n + 1) / 2;
  const qsaWidth = nkv => Math.min(nkv, WIDTH);
  // Pairs when query t attends to at most WIDTH selected cells.
  function sparsePairs(n) { return n <= WIDTH ? causalPairs(n) : causalPairs(WIDTH) + (n - WIDTH) * WIDTH; }

  function kvBytesPerToken(o = {}) {
    const layers = o.layers ?? QSA_LAYERS, kvHeads = o.kvHeads ?? N_KV, headDim = o.headDim ?? HEAD_DIM, bytes = o.bytes ?? 2;
    return layers * kvHeads * headDim * 2 * bytes;   // the 2 is K and V
  }
  const kvBytes = (tokens, o) => tokens * kvBytesPerToken(o);

  function qToKv(q, nHead = N_HEAD, nKv = N_KV) {
    if (!Number.isInteger(q) || q < 0 || q >= nHead) throw new Error('查询头编号超出范围');
    return Math.floor(q / (nHead / nKv));
  }
  const qToKvModulo = (q, nKv = N_KV) => q % nKv;

  const api = { N_HEAD, N_KV, HEAD_DIM, QSA_LAYERS, WIDTH, IDX_BLOCK, dot, softmax, attend, causalPairs, qsaWidth, sparsePairs, kvBytesPerToken, kvBytes, qToKv, qToKvModulo };
  root.VizMath = root.VizMath || {};
  root.VizMath.attention = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
