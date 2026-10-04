/* Pure numbers behind the chapter 13 widgets. A teaching model of one decode layer, not a Strata measurement.
   Expert size 1,382,400 B (expert_source.hpp); ~40 GB/s CPU expert streaming (expert_cache.hpp);
   672 GB/s VRAM and 63 GB/s PCIe 5.0 x16 are theoretical peaks. PRE_MS, POST_MS and SHARED_MS are
   teaching assumptions. The two branches are assumed independent (no shared DRAM), which real machines are not. */
(function (root) {
  'use strict';
  const K = 10, LAYERS = 48, EXPERT_MB = 1.3824;
  const CPU_GBPS = 40, VRAM_GBPS = 672, PCIE_GBPS = 63;
  const PRE_MS = 0.25, POST_MS = 0.05, SHARED_MS = 0.01;

  // MB / (GB/s) = ms
  function expertMs(gbps) { if (!(gbps > 0)) throw new Error('带宽必须大于零'); return EXPERT_MB / gbps; }

  // h: share of the k experts already in VRAM; f: share of the misses the GPU reads over PCIe.
  function layer({ h, f = 0, overlap = true }) {
    if (!(h >= 0 && h <= 1) || !(f >= 0 && f <= 1)) throw new Error('h 和 f 必须在 0 到 1 之间');
    const hits = K * h, misses = K - hits, pcieN = misses * f, cpuN = misses - pcieN;
    const cpuMs = cpuN * expertMs(CPU_GBPS);
    const gpuMs = SHARED_MS + hits * expertMs(VRAM_GBPS) + pcieN * expertMs(PCIE_GBPS);
    const moeMs = overlap ? Math.max(cpuMs, gpuMs) : cpuMs + gpuMs;
    const totalMs = PRE_MS + moeMs + POST_MS;
    return { hits, misses, pcieN, cpuN, cpuMs, gpuMs, moeMs, totalMs, tokenMs: LAYERS * totalMs, critical: cpuMs >= gpuMs ? 'cpu' : 'gpu' };
  }

  // The PCIe share that makes the two branches finish together (clamped to [0, 1]).
  function bestShare(h) {
    const m = K * (1 - h);
    if (m <= 0) return 0;
    const c = expertMs(CPU_GBPS), p = expertMs(PCIE_GBPS), g0 = SHARED_MS + K * h * expertMs(VRAM_GBPS);
    return Math.min(1, Math.max(0, (m * c - g0) / (m * (c + p))));
  }

  // Two independent branches with effective rates Bc and Bp: f = Bp / (Bc + Bp).
  const splitFormula = (bc, bp) => bp / (bc + bp);

  // Instruction steps to process n elements.
  function steps(n, mode, lanes = 16) {
    if (mode === 'simd') return Math.ceil(n / lanes);
    if (mode === 'scalar' || mode === 'chain') return n;
    throw new Error('未知模式 ' + mode);
  }

  // Sixteen small numbers: an element-wise sum (independent) and a running sum (each step needs the last).
  function simdDemo() {
    const a = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3], b = [2, 7, 1, 8, 2, 8, 1, 8, 2, 8, 4, 5, 9, 0, 4, 5];
    const sum = a.map((x, i) => x + b[i]), chain = [];
    a.forEach((x, i) => chain.push(i ? chain[i - 1] + x : x));
    return { a, b, sum, chain };
  }

  const api = { K, LAYERS, EXPERT_MB, CPU_GBPS, VRAM_GBPS, PCIE_GBPS, PRE_MS, POST_MS, SHARED_MS, expertMs, layer, bestShare, splitFormula, steps, simdDemo };
  root.VizMath = root.VizMath || {};
  root.VizMath.hetero = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
