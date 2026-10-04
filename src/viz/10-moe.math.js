/* Pure numbers behind the chapter 10 widgets. Teaching model, not a Strata kernel.
   Geometry from include/strata/core/layout.hpp, session.hpp and expert_source.hpp at the pinned commit. */
(function (root) {
  'use strict';
  const LAYERS = 48, EXPERTS = 512, EXPERT_PARAMS = 3 * 2560 * 640, EXPERT_BYTES = 1382400;
  const OTHER_PARAMS = 4.2e9;   // 125e9 (README) minus all routed experts, rounded: a teaching estimate
  const TOTAL_PARAMS = 125e9;

  function moeStats(k) {
    if (!Number.isInteger(k) || k < 1 || k > EXPERTS) throw new Error('k 必须是 1 到 512 之间的整数');
    const picks = LAYERS * k, expertParams = picks * EXPERT_PARAMS, params = expertParams + OTHER_PARAMS;
    return { picks, expertParams, params, ratio: params / TOTAL_PARAMS, bytes: picks * EXPERT_BYTES };
  }

  // Indices of the k largest scores, highest first; equal scores keep the lower index first.
  function topK(scores, k) {
    if (!Number.isInteger(k) || k < 1) throw new Error('k 必须是正整数');
    return [...scores.keys()].sort((a, b) => scores[b] - scores[a] || a - b).slice(0, k);
  }

  // Softmax over the picked scores, rescaled to a fixed spread so the bars differ visibly.
  function routeWeights(picked) {
    const hi = Math.max(...picked), lo = Math.min(...picked);
    const ex = picked.map(s => Math.exp(hi > lo ? (s - lo) / (hi - lo) * 2.2 : 0));
    const sum = ex.reduce((a, b) => a + b, 0);
    return ex.map(x => x / sum);
  }

  // Time to move `mb` megabytes at `gbps` gigabytes per second (decimal units).
  function transfer(mb, gbps) {
    if (!(gbps > 0) || !(mb >= 0)) throw new Error('带宽必须大于零');
    const ms = mb / gbps;
    return { ms, maxTokensPerSecond: Math.floor(1000 / ms) };
  }

  const api = { LAYERS, EXPERTS, EXPERT_PARAMS, EXPERT_BYTES, OTHER_PARAMS, TOTAL_PARAMS, moeStats, topK, routeWeights, transfer };
  root.VizMath = root.VizMath || {};
  root.VizMath.moe = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
