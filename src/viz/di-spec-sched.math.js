/* Pure numbers behind the DeepInfer spec-sched widgets. Teaching models, not DeepInfer kernels.
   - timeline(): a one-step-ahead CPU/GPU pipeline, the shape of deepinfer/worker/worker.py execute_model_step.
   - varlen(): the budget search of csrc/engine/mtp_varlen.hpp MTPVarlen::schedule. The step time of q tokens is
     looked up at the smallest captured CUDA graph >= q (sizes 1, 2, 4, then every 8, as in
     deepinfer/worker/cuda_graph_runner.py build_graph_batch_sizes), so it is a staircase: T(q) = t0 + t1 * graph(q).
     A straight line in graph size stands in for the profiled per-graph curve. One list of rates is used for both
     the budget and the split; the engine uses rates one round older for the budget.
   - tau(): the decode accounting of examples/sweep/plot_pareto.py (tau = 1 + nextn * a). */
(function (root) {
  'use strict';

  const pos = (x, name) => { if (!(x > 0) || !Number.isFinite(x)) throw new Error(name + ' 必须大于零'); };

  // CPU block k prepares step k (post-process of the previous step + schedule of this one), GPU block k runs it.
  // sync: the GPU starts step k only after the CPU block; the CPU starts block k only after GPU step k-1 ends.
  // async: the CPU may run one step ahead, so block k may start once GPU step k-1 has started.
  function timeline({ cpuMs, gpuMs, steps, mode }) {
    pos(cpuMs, 'CPU 时间'); pos(gpuMs, 'GPU 时间');
    if (!Number.isInteger(steps) || steps < 1) throw new Error('步数必须是正整数');
    if (mode !== 'sync' && mode !== 'async') throw new Error('mode 只能是 sync 或 async');
    const cpu = [], gpu = [];
    for (let k = 0; k < steps; k++) {
      let start;
      if (k === 0) start = 0;
      else if (mode === 'sync') start = gpu[k - 1].end;
      else start = Math.max(cpu[k - 1].end, gpu[k - 1].start);
      const c = { k, start, end: start + cpuMs };
      const gStart = Math.max(c.end, k ? gpu[k - 1].end : 0);
      cpu.push(c);
      gpu.push({ k, start: gStart, end: gStart + gpuMs });
    }
    const total = gpu[steps - 1].end;
    return {
      cpu, gpu, total,
      period: mode === 'sync' ? cpuMs + gpuMs : Math.max(cpuMs, gpuMs),
      gpuIdle: total - steps * gpuMs,
    };
  }

  // Steady-state comparison of the two loops for one step.
  function compare(cpuMs, gpuMs) {
    pos(cpuMs, 'CPU 时间'); pos(gpuMs, 'GPU 时间');
    const syncP = cpuMs + gpuMs, asyncP = Math.max(cpuMs, gpuMs);
    return { syncPeriod: syncP, asyncPeriod: asyncP, speedup: syncP / asyncP, syncUtil: gpuMs / syncP, asyncUtil: gpuMs / asyncP };
  }

  // Confidence of draft j is conditional on drafts 1..j-1 being accepted, so a draft is useful with the running product.
  function cumulative(rates) {
    let acc = 1;
    return rates.map(p => {
      if (!(p >= 0 && p <= 1)) throw new Error('置信度必须在 0 到 1 之间');
      acc *= p;
      return acc;
    });
  }

  // Expected tokens committed by one request that verifies its first k drafts: 1 + c1 + ... + ck.
  function expectedTokens(rates, k) {
    return 1 + cumulative(rates).slice(0, k).reduce((a, b) => a + b, 0);
  }

  // Smallest captured graph that holds q tokens (interval 8, no upper cap in this teaching model).
  function graphSize(q) {
    if (!Number.isInteger(q) || q < 1) throw new Error('token 数必须是正整数');
    if (q <= 4) return q <= 1 ? 1 : q <= 2 ? 2 : 4;
    return Math.ceil(q / 8) * 8;
  }
  const stepTime = (q, { t0, t1 }) => t0 + t1 * graphSize(q);

  // All (cumulative rate, request) pairs, highest first; equal rates keep the lower request first.
  function ranked(conf) {
    const all = [];
    conf.forEach((row, i) => cumulative(row).forEach((c, j) => all.push({ c, i, j })));
    return all.sort((a, b) => b.c - a.c || a.i - b.i || a.j - b.j);
  }

  // Hand totalQ tokens out: one golden token per request, then the extra ones by global rank.
  function distribute(conf, totalQ) {
    const q = conf.map(() => 1);
    ranked(conf).slice(0, totalQ - conf.length).forEach(x => { q[x.i] += 1; });
    return q;
  }

  // Try every budget from "golden tokens only" to "all drafts"; keep the first one with the best expected tokens per ms.
  function varlen(conf, cost) {
    if (!conf.length) throw new Error('至少要有一个请求');
    const order = ranked(conf), n = conf.length;
    let expected = n, best = { totalQ: n, expected: n, timeMs: stepTime(n, cost), graph: graphSize(n) };
    best.throughput = best.expected / best.timeMs;
    order.forEach((x, idx) => {
      expected += x.c;
      const totalQ = n + idx + 1, timeMs = stepTime(totalQ, cost), throughput = expected / timeMs;
      if (throughput > best.throughput) best = { totalQ, expected, timeMs, throughput, graph: graphSize(totalQ) };
    });
    return { ...best, seqlensQ: distribute(conf, best.totalQ) };
  }

  // Fixed length: every request verifies all of its drafts.
  function fixed(conf, cost) {
    const n = conf.length, totalQ = conf.reduce((s, row) => s + 1 + row.length, 0);
    const expected = conf.reduce((s, row) => s + expectedTokens(row, row.length), 0);
    const timeMs = stepTime(totalQ, cost);
    return { totalQ, expected, timeMs, throughput: expected / timeMs, seqlensQ: conf.map(row => 1 + row.length), graph: graphSize(totalQ) };
  }

  // Seeded teaching confidences: each request has its own level, later positions a little lower.
  function presetConfidences(nReq, nextn, seed) {
    let s = (seed >>> 0) || 1;
    const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const out = [];
    for (let i = 0; i < nReq; i++) {
      const level = 0.45 + 0.52 * rnd();
      const row = [];
      for (let j = 0; j < nextn; j++) row.push(Math.round(Math.min(0.98, Math.max(0.05, level - 0.04 * j + 0.08 * (rnd() - 0.5))) * 100) / 100);
      out.push(row);
    }
    return out;
  }

  // Decode accounting. Full acceptance: 1 + nextn tokens per request per step. The plots use tau = 1 + nextn * a,
  // where a is the share of drafts that get accepted.
  const fullTau = nextn => 1 + nextn;
  function tau(nextn, a) {
    if (!(a >= 0 && a <= 1)) throw new Error('接受率必须在 0 到 1 之间');
    return 1 + nextn * a;
  }

  const api = { timeline, compare, cumulative, expectedTokens, graphSize, stepTime, ranked, distribute, varlen, fixed, presetConfidences, fullTau, tau };
  root.VizMath = root.VizMath || {};
  root.VizMath.diSpecSched = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
