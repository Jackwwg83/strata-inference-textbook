/* Pure numbers behind the chapter 07 widgets. Teaching models, not Strata kernels.
   Layer split from include/strata/core/layout.hpp; the gated-residual write follows
   include/strata/kernels/gr.hpp (`w[c] = 2*sigmoid(inject[c]/hc)`) at the pinned commit. */
(function (root) {
  'use strict';
  const LAYERS = 48, QSA_INTERVAL = 4, HC = 4;

  function isQsa(layer) {
    if (!Number.isInteger(layer) || layer < 0 || layer >= LAYERS) throw new Error('层号必须是 0 到 47 之间的整数');
    return layer % QSA_INTERVAL === QSA_INTERVAL - 1;
  }
  function qsaLayers(n) { const out = []; for (let l = 0; l < n; l++) if (l % QSA_INTERVAL === QSA_INTERVAL - 1) out.push(l); return out; }

  const sumSq = x => x.reduce((a, v) => a + v * v, 0);
  // x / sqrt(sum(x^2) + eps): the GDN q/k norm.
  function l2norm(x, eps) { const d = Math.sqrt(sumSq(x) + eps); return x.map(v => (d > 0 ? v / d : 0)); }
  // x / sqrt(mean(x^2) + eps): RMSNorm without the learned gain.
  function rmsnorm(x, eps) { const d = Math.sqrt(sumSq(x) / x.length + eps); return x.map(v => (d > 0 ? v / d : 0)); }
  // The wrong placement, for comparison: x / (sqrt(mean(x^2)) + eps).
  function rmsnormEpsOutside(x, eps) { const d = Math.sqrt(sumSq(x) / x.length) + eps; return x.map(v => (d > 0 ? v / d : 0)); }

  const sigmoid = z => 1 / (1 + Math.exp(-z));
  const silu = z => z * sigmoid(z);
  const relu = z => (z > 0 ? z : 0);

  // Weight of one residual stream when the block output is written back.
  const grGate = (inject, hc = HC) => 2 * sigmoid(inject / hc);
  // R[c][i] + out[i] * w[c]: the same block output goes to every stream, only the weight differs.
  function grWrite(R, out, inject, hc = HC) {
    return R.map((row, c) => { const w = grGate(inject[c], hc); return row.map((v, i) => v + out[i] * w); });
  }

  // sum_j w[j] * parts[j]
  function combine(parts, weights) {
    if (parts.length !== weights.length) throw new Error('专家输出和权重的个数必须相同');
    const out = new Array(parts[0].length).fill(0);
    parts.forEach((p, j) => p.forEach((v, i) => { out[i] += weights[j] * v; }));
    return out;
  }

  const api = { LAYERS, HC, isQsa, qsaLayers, l2norm, rmsnorm, rmsnormEpsOutside, sigmoid, silu, relu, grGate, grWrite, combine };
  root.VizMath = root.VizMath || {};
  root.VizMath.layer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
