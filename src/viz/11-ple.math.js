/* Pure numbers behind the chapter 11 widgets. Teaching model, not the Strata reader.
   Geometry from include/strata/kernels/ngram.hpp, include/strata/ngram/ple_reader.hpp and
   src/ngram/ple_reader.cpp at the pinned commit. The toy hash keeps the upstream rules
   (multiply, XOR, modulo per head, EOS cut) but uses small numbers so the arithmetic is readable. */
(function (root) {
  'use strict';
  const ROW_BYTES = 90, PAGE = 4096, HEAD_DIM = 160, ROWS_PER_TOKEN = 16, TABLE_ROWS = 320001536;
  const CACHE_ROWS = 1 << 20, WAYS = 8;

  const tableBytes = () => TABLE_ROWS * ROW_BYTES;

  // The read a row needs, as src/ngram/ple_reader.cpp computes it: aligned start, one or two pages.
  function pagesForRow(at, rb = ROW_BYTES, page = PAGE) {
    const first = Math.floor(at / page) * page;
    const length = Math.floor((at + rb - 1) / page) * page - first + page;
    return { first, length, pages: length / page };
  }

  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  // Share of rows that straddle a page boundary, counted exactly over one period of row offsets.
  function straddleFraction(rb = ROW_BYTES, page = PAGE, tableOffset = 0) {
    const period = page / gcd(rb, page);
    let straddling = 0;
    for (let r = 0; r < period; r++) if (pagesForRow(tableOffset + r * rb, rb, page).pages === 2) straddling++;
    return { period, straddling, fraction: straddling / period };
  }

  // One token's SSD traffic: `hits` rows come from the row cache, the rest cost a page each (two if straddling).
  function tokenRead(rows = ROWS_PER_TOKEN, hits = 0, straddling = 0) {
    const misses = Math.max(0, rows - hits);
    const pages = misses ? misses + straddling : 0;
    const read = pages * PAGE;
    return { misses, pages, read, useful: rows * ROW_BYTES, amplification: misses ? read / (misses * ROW_BYTES) : 0 };
  }

  /* ---------- toy n-gram hash ---------- */
  const TOY = {
    HEADS: 4,                       // per n-gram size; Strata uses 8
    EOS: 2,
    mult: [31, 17, 7],              // Strata: three 14-digit multipliers
    mods: [13, 17, 19, 23, 11, 29, 31, 37],   // Strata: about 20 million rows per head, none a power of two
    ids: { eos: 2, i: 5, you: 7, like: 11, eat: 13, fish: 19, cat: 23, dog: 29 },
  };
  TOY.offsets = TOY.mods.map((_, h) => TOY.mods.slice(0, h).reduce((a, b) => a + b, 0));
  TOY.rows = TOY.mods.reduce((a, b) => a + b, 0);

  // mixed = ctx[0]*m[0] XOR ctx[1]*m[1] XOR ...
  function toyMixed(ctx, mult) {
    let x = ctx[0] * mult[0];
    for (let j = 1; j < ctx.length; j++) x ^= ctx[j] * mult[j];
    return x >>> 0;
  }

  // prev: the two tokens before `token`, OLDEST FIRST, -1 where there is none (session.hpp's ple_prev).
  function toyRows(token, prev) {
    const ctx = [token];
    let cut = false;
    for (let s = 1; s <= 2; s++) {
      const t = cut ? -1 : prev[2 - s];
      cut = cut || t < 0 || t === TOY.EOS;
      ctx.push(cut ? TOY.EOS : t);
    }
    const mixed = [toyMixed(ctx.slice(0, 2), TOY.mult), toyMixed(ctx, TOY.mult)];
    const rows = [];
    for (let n = 0; n < 2; n++) for (let g = 0; g < TOY.HEADS; g++) {
      const h = n * TOY.HEADS + g;
      rows.push(mixed[n] % TOY.mods[h] + TOY.offsets[h]);
    }
    return { ctx, mixed, rows };
  }

  /* ---------- set-associative cache ---------- */
  // policy 'rr': one replacement pointer per set (Strata's RowCache); 'lru': least recently used.
  // The set index is key % sets here; Strata hashes the row id first (mix), which the toy leaves out.
  function makeCache({ sets, ways, policy }) {
    if (!(Number.isInteger(sets) && sets > 0 && Number.isInteger(ways) && ways > 0)) throw new Error('sets 和 ways 必须是正整数');
    if (policy !== 'rr' && policy !== 'lru') throw new Error('未知策略 ' + policy);
    const keys = new Array(sets * ways).fill(null), stamp = new Array(sets * ways).fill(-1), next = new Array(sets).fill(0);
    let clock = 0;
    function access(key) {
      const s = ((key % sets) + sets) % sets;
      clock++;
      for (let w = 0; w < ways; w++) if (keys[s * ways + w] === key) { stamp[s * ways + w] = clock; return { hit: true, set: s, way: w, evicted: null }; }
      let w;
      if (policy === 'rr') { w = next[s]; next[s] = (w + 1) % ways; }
      else {
        w = 0;
        for (let i = 0; i < ways; i++) {
          if (keys[s * ways + i] === null) { w = i; break; }
          if (stamp[s * ways + i] < stamp[s * ways + w]) w = i;
        }
      }
      const evicted = keys[s * ways + w];
      keys[s * ways + w] = key; stamp[s * ways + w] = clock;
      return { hit: false, set: s, way: w, evicted };
    }
    return { sets, ways, policy, keys, next, access };
  }

  function runTrace(cache, trace) {
    let hits = 0;
    for (const k of trace) if (cache.access(k).hit) hits++;
    return { hits, misses: trace.length - hits, rate: trace.length ? hits / trace.length : 0 };
  }

  // Nine odd keys, four rounds: all land in set 1 of a 2-set cache.
  function conflictTrace() {
    const t = [];
    for (let r = 0; r < 4; r++) for (let k = 1; k <= 17; k += 2) t.push(k);
    return t;
  }

  // Small deterministic generator (mulberry32) so a trace replays identically.
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // 48 accesses: 80% from six hot rows, 20% from 24 cold rows.
  function hotTrace(seed = 7) {
    const r = rng(seed), t = [];
    for (let i = 0; i < 48; i++) t.push(r() < 0.8 ? 1 + Math.floor(r() * 6) : 7 + Math.floor(r() * 24));
    return t;
  }

  const api = { ROW_BYTES, PAGE, HEAD_DIM, ROWS_PER_TOKEN, TABLE_ROWS, CACHE_ROWS, WAYS, tableBytes, pagesForRow, straddleFraction, tokenRead, TOY, toyMixed, toyRows, makeCache, runTrace, conflictTrace, hotTrace, rng };
  root.VizMath = root.VizMath || {};
  root.VizMath.ple = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
