/* Pure numbers behind the DeepInfer wide-ep widgets. Teaching model, not DeepInfer code.
   Rounding of redundant experts: deepinfer/model_executor/eplb/__init__.py resolve_num_extra_experts (pin 774ce244).
   Replication and placement: a single-layer port of deepinfer/model_executor/eplb/policy.py. */
(function (root) {
  'use strict';
  // 384 routed experts: legend of doc/images/wide_ep_decode_pareto.png ("384+64 experts").
  // The model config itself lives on Hugging Face, not in the repository, so this is an upstream report.
  const LOGICAL = 384;
  const EP_WIDTHS = [8, 16, 32, 64, 128];
  // examples/README.md: default decode batch of 64 requests x (1 + nextn 5) = 384 tokens per step.
  const DEFAULT_TOKENS = 384;
  const MODES = ['perCard', 'fixed32'];

  const isInt = (x) => Number.isInteger(x);

  // Python: padding = -(routed + min) % ep, then min + padding. Python's % never returns a negative number.
  function resolveExtra(numRouted, minExtra, ep) {
    if (!isInt(numRouted) || !isInt(minExtra) || !isInt(ep) || numRouted < 1 || minExtra < 0 || ep < 1) throw new Error('专家数、冗余下限和 EP 必须是非负整数，EP 至少为 1');
    const padding = ((-(numRouted + minExtra)) % ep + ep) % ep;
    return minExtra + padding;
  }

  // perCard: at least one redundant expert per card (the Q&A decode setting).
  // fixed32: at least 32 redundant experts in total (examples/_config.py default).
  function layout(ep, mode = 'perCard', logical = LOGICAL) {
    if (!MODES.includes(mode)) throw new Error('未知的冗余模式：' + mode);
    const minExtra = mode === 'perCard' ? ep : 32;
    const extra = resolveExtra(logical, minExtra, ep);
    const physical = logical + extra;
    return { ep, minExtra, extra, physical, local: physical / ep };
  }

  // Per card, per MoE layer, per decode step. tokens = tokens this card brings to the step (T).
  // weightVsEp8: expert weight bytes read, relative to EP8 (all local experts are hit in a big batch).
  // tokensPerCopyPerK: average tokens one expert copy serves, as a multiple of top-k (T * k / local).
  // dispatchPerK: hidden vectors this card sends out, as a multiple of k (T * k * (EP - 1) / EP, uniform targets).
  function stepTraffic(ep, tokens = DEFAULT_TOKENS, mode = 'perCard') {
    if (!(tokens > 0)) throw new Error('每卡 token 数必须大于零');
    const l = layout(ep, mode), base = layout(8, mode);
    return { ...l, tokens, weightVsEp8: l.local / base.local, tokensPerCopyPerK: tokens / l.local, dispatchPerK: tokens * (ep - 1) / ep };
  }

  /* ---------- EPLB toy: one MoE layer, 16 experts on 4 cards ---------- */
  const TOY = { experts: 16, cards: 4, extra: 4, capacity: 5, steps: 4, base: 30 };

  // Small deterministic generator (LCG), so a seed always gives the same loads.
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  // tokens[step][expert]: a few hot experts get 6x, 4x and 2.5x the base load, each value with +-30% noise.
  function toyLoads({ seed = 1, randomHot = false, hot } = {}) {
    const r = rng(seed);
    let h = hot ? [...hot] : [5, 6, 7];
    if (!hot && randomHot) {
      h = [];
      while (h.length < 3) { const e = Math.floor(r() * TOY.experts); if (!h.includes(e)) h.push(e); }
    }
    const boost = [6, 4, 2.5];
    const w = Array.from({ length: TOY.experts }, (_, j) => (h.includes(j) ? boost[h.indexOf(j)] : 1));
    const tokens = Array.from({ length: TOY.steps }, () => w.map(x => Math.round(TOY.base * x * (0.7 + 0.6 * r()))));
    return { tokens, hot: h };
  }

  // get_initial_global_physical_to_logical_map: [0 .. n-1, then extra copies of 0, 1, 2 ...].
  function initialMap(logical, extra) {
    return [...Array(logical).keys(), ...Array.from({ length: extra }, (_, i) => i % logical)];
  }

  const countsOf = (phys, logical) => { const c = Array(logical).fill(0); phys.forEach(e => c[e]++); return c; };
  const argmin = (a) => a.reduce((b, x, i) => (x < a[b] ? i : b), 0);

  // rebalance_experts_global, step 1: each round gives one copy to the expert whose extra copy
  // lowers the sum over steps of the largest per-copy load the most.
  function replicate(tokens, numPhysical) {
    const E = tokens[0].length, R = numPhysical - E;
    if (R < 0) throw new Error('物理槽位不能少于逻辑专家数');
    const count = Array(E).fill(1), phys = [...Array(E).keys()];
    for (let i = 0; i < R; i++) {
      const totals = Array(E).fill(0);
      for (const row of tokens) {
        const score = row.map((t, j) => (t + j * 1e-4) / count[j]);
        const m = score.reduce((b, x, j) => (x > score[b] ? j : b), 0);
        const replaced = row[m] / (count[m] + 1);
        const newMax = Math.max(...score.map((x, j) => (j === m ? replaced : x)));
        for (let j = 0; j < E; j++) totals[j] += j === m ? newMax : score[m];
      }
      const pick = argmin(totals);
      phys.push(pick);
      count[pick]++;
    }
    return { phys, count };
  }

  // _batch_greedy_indices: copies in falling load order; each goes to the non-full card that keeps
  // the sum over steps of the busiest card smallest. Ties go to the lower card id.
  function place(tokens, phys, count, capacity) {
    const P = phys.length, S = tokens.length;
    if (P % capacity) throw new Error('槽位数必须是每卡容量的整数倍');
    const cards = P / capacity;
    const vec = e => tokens.map(row => row[e] / count[e]);
    const weight = e => tokens.reduce((a, row) => a + row[e], 0) / count[e];
    const order = [...Array(P).keys()].sort((a, b) => weight(phys[b]) - weight(phys[a]));
    const loads = Array.from({ length: cards }, () => Array(S).fill(0)), peaks = Array(S).fill(0), occ = Array(cards).fill(0);
    const out = Array(P);
    for (const p of order) {
      const v = vec(phys[p]);
      let best = -1, bestScore = Infinity;
      for (let c = 0; c < cards; c++) {
        if (occ[c] === capacity) continue;
        const sc = v.reduce((a, x, s) => a + Math.max(loads[c][s] + x, peaks[s]), 0);
        if (sc < bestScore) { bestScore = sc; best = c; }
      }
      out[best * capacity + occ[best]] = phys[p];
      occ[best]++;
      v.forEach((x, s) => { loads[best][s] += x; peaks[s] = Math.max(peaks[s], loads[best][s]); });
    }
    return out;
  }

  function rebalance(tokens, numPhysical, capacity) {
    const r = replicate(tokens, numPhysical);
    return { phys: place(tokens, r.phys, r.count, capacity), count: r.count };
  }

  // loads[step][card]; an expert's tokens split evenly over its copies (the policy assumes this too).
  function cardLoads(tokens, phys, capacity) {
    const count = countsOf(phys, tokens[0].length), cards = phys.length / capacity;
    return tokens.map(row => Array.from({ length: cards }, (_, c) =>
      phys.slice(c * capacity, (c + 1) * capacity).reduce((a, e) => a + row[e] / count[e], 0)));
  }

  // stats_logger._moe_lb_ratio: sum of the busiest card over sum of the mean card.
  function moeLb(loads) {
    if (!loads.length) throw new Error('没有负载数据');
    let max = 0, mean = 0;
    for (const row of loads) { max += Math.max(...row); mean += row.reduce((a, b) => a + b, 0) / row.length; }
    return max / mean;
  }

  const api = { LOGICAL, EP_WIDTHS, DEFAULT_TOKENS, TOY, resolveExtra, layout, stepTraffic, rng, toyLoads, initialMap, replicate, place, rebalance, cardLoads, moeLb };
  root.VizMath = root.VizMath || {};
  root.VizMath.diWideEp = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
