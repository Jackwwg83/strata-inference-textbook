/* Pure numbers behind the chapter 12 widgets. A teaching model of ONE layer's expert cache.
   The 'decay' policy follows the adaptive tier in src/program/generate.cpp at the pinned commit
   (decayed routing counts, candidates need a count of at least 2, a swap needs a lead of 1.5,
   counts multiplied by 0.7 after each adaptation, residency changes only at adaptation steps).
   Trace sizes (24 experts, 4 per token, 6 slots) are teaching values, not Strata's 512 / 10. */
(function (root) {
  'use strict';
  const DEFAULTS = { n: 24, k: 4, tokens: 60, cap: 6, shiftAt: 30, every: 4, decay: 0.7, minCount: 2, margin: 1.5, maxSwaps: 6 };
  const HOT_A = [2, 5, 7, 11, 16, 20], HOT_B = [1, 9, 13, 14, 18, 22];

  const check01 = h => { if (!(h >= 0 && h <= 1)) throw new Error('命中率必须在 0 到 1 之间'); };
  const expectedHits = (h, k) => { check01(h); return h * k; };
  // Chance that all k experts of a layer hit, if each hit independently with probability h.
  const layerAllHit = (h, k) => { check01(h); return Math.pow(h, k); };
  const halfLife = d => { if (!(d > 0 && d < 1)) throw new Error('衰减系数必须在 0 和 1 之间'); return Math.log(0.5) / Math.log(d); };
  const countSum = d => 1 / (1 - d);

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Each token routes k distinct experts, weighted: the current topic's hot experts weigh 8, the rest 1.
  // burst: three tokens in topic A that route only rare experts (a quoted passage in another language, say).
  function makeTrace({ seed = 3, burst = false } = {}) {
    const { n, k, tokens, shiftAt } = DEFAULTS, r = rng(seed), out = [];
    const rare = [...Array(n).keys()].filter(e => !HOT_A.includes(e) && !HOT_B.includes(e));
    const burstAt = burst ? 18 : -1;
    for (let t = 0; t < tokens; t++) {
      if (burst && t >= burstAt && t < burstAt + 3) { out.push(rare.slice((t - burstAt) * k, (t - burstAt + 1) * k)); continue; }
      const hot = t < shiftAt ? HOT_A : HOT_B, pick = [];
      const w = [...Array(n).keys()].map(e => (hot.includes(e) ? 8 : 1));
      for (let j = 0; j < k; j++) {
        const total = w.reduce((a, b) => a + b, 0);
        let x = r() * total, e = 0;
        while (x >= w[e]) { x -= w[e]; e++; }
        pick.push(e); w[e] = 0;
      }
      out.push(pick);
    }
    return { tokens: out, shiftAt, burstAt, hotA: HOT_A, hotB: HOT_B };
  }

  function makePolicy(kind, opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    const res = new Set(), last = new Map(), count = new Map();
    let clock = 0, tokens = 0, swaps = [];
    const c = e => count.get(e) || 0;
    if (kind === 'lru' || kind === 'lfu') {
      return {
        kind, resident: () => res, count: c,
        token(ids) {
          let hits = 0; swaps = [];
          for (const e of ids) {
            clock++; count.set(e, c(e) + 1);
            if (res.has(e)) { hits++; last.set(e, clock); continue; }
            if (res.size >= o.cap) {
              let victim = null;
              for (const r of res) {
                if (victim === null) { victim = r; continue; }
                const better = kind === 'lru' ? last.get(r) < last.get(victim)
                  : c(r) < c(victim) || (c(r) === c(victim) && last.get(r) < last.get(victim));
                if (better) victim = r;
              }
              res.delete(victim); swaps.push([e, victim]);
            } else swaps.push([e, null]);
            res.add(e); last.set(e, clock);
          }
          return { hits, swaps };
        },
      };
    }
    if (kind === 'decay') {
      function adapt() {
        const cand = [], vict = [];
        for (const [e, u] of count) if (!res.has(e) && u >= o.minCount) cand.push([u, e]);
        for (const e of res) vict.push([c(e), e]);
        cand.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
        vict.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const done = [];
        let ci = 0;
        while (res.size < o.cap && ci < cand.length && done.length < o.maxSwaps) { res.add(cand[ci][1]); done.push([cand[ci][1], null]); ci++; }
        for (let vi = 0; ci < cand.length && vi < vict.length && done.length < o.maxSwaps; ci++, vi++) {
          if (cand[ci][0] < vict[vi][0] + o.margin) break;
          res.delete(vict[vi][1]); res.add(cand[ci][1]); done.push([cand[ci][1], vict[vi][1]]);
        }
        for (const [e, u] of count) count.set(e, u * o.decay);
        return done;
      }
      return {
        kind, resident: () => res, count: c,
        token(ids) {
          let hits = 0;
          for (const e of ids) { if (res.has(e)) hits++; count.set(e, c(e) + 1); }
          tokens++;
          swaps = tokens % o.every === 0 ? adapt() : null;
          return { hits, swaps, adapted: swaps !== null };
        },
      };
    }
    throw new Error('未知策略 ' + kind);
  }

  function race(trace, opts = {}) {
    const out = {};
    for (const kind of ['lru', 'lfu', 'decay']) {
      const p = makePolicy(kind, opts), perToken = [];
      for (const t of trace.tokens) perToken.push(p.token(t).hits);
      const hits = perToken.reduce((a, b) => a + b, 0);
      out[kind] = { hits, perToken, rate: hits / (trace.tokens.length * DEFAULTS.k) };
    }
    return out;
  }

  // One swap of expert #112 into slot 5 (held by #331). bug = mark #112 resident before its bytes land.
  function swapTimeline(bug) {
    const steps = [];
    const push = (key, table331, table112, copied, reads112) => {
      const who112 = table112 >= 0 ? 'gpu' : 'cpu';
      steps.push({ key, table331, table112, copied, reads112, who112, correct: !reads112 || who112 === 'cpu' || copied === 1 });
    };
    push('init', 5, -1, 0, false);
    push('decide', 5, -1, 0, false);
    push('unmap', -1, bug ? 5 : -1, 0, false);
    push('copy', -1, bug ? 5 : -1, 0.5, true);
    push('event', -1, bug ? 5 : -1, 1, false);
    push('map', -1, 5, 1, true);
    return steps;
  }

  const api = { DEFAULTS, HOT_A, HOT_B, expectedHits, layerAllHit, halfLife, countSum, rng, makeTrace, makePolicy, race, swapTimeline };
  root.VizMath = root.VizMath || {};
  root.VizMath.cache = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
