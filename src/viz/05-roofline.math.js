/* Pure numbers behind the chapter 05 widgets: roofline bounds, arithmetic intensity, latency + bandwidth,
   Amdahl's law. Hardware numbers in the widgets are inputs and teaching assumptions, not measurements. */
(function (root) {
  'use strict';
  const ridge = (P, B) => P / B;
  // P: peak FLOP/s, B: bytes/s across the link in question, I: FLOP per byte across that link.
  function roofline(P, B, I) {
    if (!(I > 0) || !(P > 0) || !(B > 0)) throw new Error('算力、带宽和算术强度都必须大于零');
    const mem = B * I;
    return { perf: Math.min(P, mem), bound: mem < P ? 'memory' : 'compute', ridge: ridge(P, B) };
  }
  const lowerBound = (F, D, P, B) => Math.max(F / P, D / B);
  // A GEMV does 2 FLOP (multiply + add) per weight per input; weights dominate the bytes.
  const intensity = (b, bytesPerWeight) => 2 * b / bytesPerWeight;
  function layerExample(nWeights, bytesPerWeight, b) {
    const flops = 2 * nWeights * b, bytes = nWeights * bytesPerWeight;
    return { flops, bytes, I: flops / bytes };
  }
  function transfer(latencyS, bytes, bandwidth) {
    const seconds = latencyS + bytes / bandwidth;
    return { seconds, latencyShare: latencyS / seconds };
  }
  // Fraction f of the time sped up s times; s may be Infinity.
  function amdahl(f, s) {
    if (!(f >= 0 && f <= 1) || !(s >= 1)) throw new Error('f 必须在 0 到 1 之间，s 必须不小于 1');
    return 1 / ((1 - f) + (s === Infinity ? 0 : f / s));
  }
  const serial = ts => ts.reduce((a, b) => a + b, 0);
  const parallel = (ts, join) => Math.max(...ts) + join;

  const api = { ridge, roofline, lowerBound, intensity, layerExample, transfer, amdahl, serial, parallel };
  root.VizMath = root.VizMath || {};
  root.VizMath.roofline = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
