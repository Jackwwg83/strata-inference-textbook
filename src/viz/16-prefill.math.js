/* Pure numbers behind the chapter 16 widget. Teaching model, not a Strata throughput prediction.
   DENSE_RATIO is the default in include/strata/spec/controller.hpp at the pinned commit. */
(function (root) {
  'use strict';
  const LAYERS = 48;
  // Time of a dense pass over n = 1..9 tokens, relative to one token (upstream default, native MMVQ measurement).
  const DENSE_RATIO = [1.0, 1.05, 1.3, 1.45, 1.85, 2.2, 2.6, 3.0, 3.3];

  const posInt = (x, name) => { if (!Number.isInteger(x) || x < 1) throw new Error(name + ' 必须是正整数'); };

  // Chunk sizes for a prompt of n tokens cut into chunks of c.
  function chunks(n, c) {
    posInt(n, 'n'); posInt(c, 'C');
    const out = [];
    for (let left = n; left > 0; left -= c) out.push(Math.min(c, left));
    return out;
  }

  // One chunk of c tokens through the 48 layers. w: ms to bring one pass of weights in; u: ms of compute per token.
  // overlap = false: each layer moves its weights, then computes. overlap = true: layer l+1 moves while layer l computes.
  function chunkTime(c, w, u, overlap) {
    if (!(w >= 0) || !(u >= 0)) throw new Error('时间不能为负');
    const a = w / LAYERS, b = c * u / LAYERS;
    return overlap ? a + (LAYERS - 1) * Math.max(a, b) + b : LAYERS * (a + b);
  }

  // Per-layer start/end times of one chunk, consistent with chunkTime. With overlap the copy of layer l may run
  // while layer l-1 computes (a ring that holds two layers); without it each layer copies, then computes.
  function layerSchedule(c, w, u, overlap) {
    const a = w / LAYERS, b = c * u / LAYERS, out = [];
    for (let l = 0; l < LAYERS; l++) {
      const prev = out[l - 1], prev2 = out[l - 2];
      const cs = overlap ? Math.max(prev ? prev.copy[1] : 0, prev2 ? prev2.comp[1] : 0) : (prev ? prev.comp[1] : 0);
      const ce = cs + a, ks = Math.max(ce, prev ? prev.comp[1] : 0);
      out.push({ copy: [cs, ce], comp: [ks, ks + b] });
    }
    return { layers: out, end: out[LAYERS - 1].comp[1] };
  }

  function run(n, c, w, u, overlap) {
    const sizes = chunks(n, c);
    const times = sizes.map(s => chunkTime(s, w, u, overlap));
    const totalMs = times.reduce((x, y) => x + y, 0);
    return { chunks: sizes, times, totalMs, tokPerSec: totalMs > 0 ? n / (totalMs / 1000) : Infinity };
  }

  // Chunk size at which a chunk's compute takes as long as its weight trip.
  function breakEven(w, u) { if (!(u > 0)) throw new Error('u 必须大于零'); return w / u; }

  // Dense-pass cost per token when n tokens share one pass, relative to a lone token.
  function perTokenCost(n) {
    if (!Number.isInteger(n) || n < 1 || n > DENSE_RATIO.length) throw new Error('n 必须在 1 到 9 之间');
    return DENSE_RATIO[n - 1] / n;
  }

  const api = { LAYERS, DENSE_RATIO, chunks, chunkTime, layerSchedule, run, breakEven, perTokenCost };
  root.VizMath = root.VizMath || {};
  root.VizMath.prefill = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
