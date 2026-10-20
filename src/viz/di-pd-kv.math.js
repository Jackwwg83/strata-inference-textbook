/* Pure numbers behind the DeepInfer page "pd-kv" (P/D split and the KV cache store).
   Teaching model, not DeepInfer code. Constants come from DeepInfer at commit 774ce244:
   - 128-token blocks: deepinfer/model_executor/model_metadata_utils.py (resolved_tokens_per_block)
     and deepinfer/worker/cache_engine.py (KVSTORE_GRAIN).
   - backtracking = max(raw, nextn + 1), nextn defaults to 5: deepinfer/environ.py.
   - 528 B MXFP8 and 288 B FP4 token records: deepinfer/model_executor/layers/tilelang_ops/cache_common.py.
   - the 128-token SWA window, the 20 stored layers and L - 134 come from doc/inference_deployment_qa.md.
   Prefill step latencies are read by eye from doc/images/prefill_pareto.png (EP4DP4, 4 SM100 GPUs). */
(function (root) {
  'use strict';
  const BLOCK = 128;
  const WINDOW = 128;
  const NEXTN = 5;
  const backtrack = (raw = 0, nextn = NEXTN) => Math.max(raw, nextn + 1);
  // DEEPINFER_YOCO_PREFILL_KEEP_TOKENS must be at least window + backtracking.
  const keepMin = (window = WINDOW, nextn = NEXTN, raw = 0) => window + backtrack(raw, nextn);
  const RESERVE = keepMin();   // 134: the Q&A caps a hit at L - 134
  const STORE_PER_GPU_TB = 14.4;   // Q&A: about 14.4 TB logical KV storage per online GPU

  // Bytes of one token record: quantized data plus one scale per group.
  function tokenRecordBytes(elements, bitsPerElement, elementsPerScale, scaleBytes) {
    return elements * bitsPerElement / 8 + Math.ceil(elements / elementsPerScale) * scaleBytes;
  }
  const MXFP8_BYTES = tokenRecordBytes(512, 8, 32, 1);   // 528
  const FP4_BYTES = tokenRecordBytes(512, 4, 16, 1);     // 288

  const alignUp = (n, a) => Math.ceil(n / a) * a;
  // Persisted SWA state of one sequence: stored layers x ring tokens x bytes, each layer padded to 32 B.
  function swaStateBytes(layers = 20, tokens = RESERVE, bytesPerToken = MXFP8_BYTES) {
    return layers * alignUp(tokens * bytesPerToken, 32);
  }

  function checkLen(L) { if (!Number.isInteger(L) || L < 1) throw new Error('上下文长度必须是正整数'); }

  // The hit policy of the Q&A: cap at L - 134, round down to a 128-token block, back off one block when SWA KV is missing.
  function hitLength(L, ratio, swaHit = true) {
    checkLen(L);
    if (!(ratio >= 0 && ratio <= 1)) throw new Error('命中比例必须在 0 到 1 之间');
    const cap = Math.max(0, L - RESERVE);
    const wanted = Math.floor(L * ratio);
    const L1 = Math.floor(Math.min(wanted, cap) / BLOCK) * BLOCK;
    const hit = swaHit ? L1 : Math.max(0, L1 - BLOCK);
    return { cap, wanted, L1, hit, replay: L1 - hit, suffix: L - L1, compute: L - hit };
  }

  // Time to first token spent on prefill, with and without the hit. Reading and computing do not overlap here,
  // so the hit time is an upper bound; the Q&A says the real system overlaps them layer by layer.
  function hitTrade({ L, ratio, swaHit = true, prefillTps, readGBps, kvKiB }) {
    if (!(prefillTps > 0) || !(readGBps > 0) || !(kvKiB > 0)) throw new Error('吞吐、带宽和每 token 字节数都必须大于零');
    const h = hitLength(L, ratio, swaHit);
    const bpt = kvKiB * 1024;
    const ms = tokens => tokens / prefillTps * 1e3;
    const missMs = ms(L);
    const loadMs = h.hit * bpt / (readGBps * 1e9) * 1e3;
    const computeMs = ms(h.compute);
    const hitMs = loadMs + computeMs;
    const storedBytes = h.hit * bpt;
    return {
      ...h, missMs, loadMs, computeMs, hitMs,
      replayMs: ms(h.replay), suffixMs: ms(h.suffix),
      savedMs: missMs - hitMs, gpuSavedMs: ms(h.hit),
      breakEvenKiB: readGBps * 1e9 / prefillTps / 1024,
      storedBytes, sessionsPerGpu: storedBytes > 0 ? STORE_PER_GPU_TB * 1e12 / storedBytes : Infinity,
    };
  }

  // Prefill step latency (ms) per prefill batch size (tokens per DP rank), read from the README chart.
  const PREFILL_POINTS = [
    { tokens: 4096, ms: 68 }, { tokens: 8192, ms: 114 }, { tokens: 16384, ms: 200 },
    { tokens: 32768, ms: 376 }, { tokens: 65536, ms: 731 },
  ];
  // Decode step: 3.25 tokens per step (README decode chart, nextn = 3) / about 246 tokens/s per user at 64 requests per rank.
  const DECODE_MS = 13;
  const PREFILL_INTERVAL = 70;   // DEEPINFER_PREFILL_ATTEMPT_INTERVAL default

  /* Busy-server timeline. mixed: one GPU group runs `interval` decode steps, then one prefill step that stalls decode.
     split: a prefill lane runs prefill steps back to back; a decode lane runs decode steps back to back.
     A tracked request arrives at arrivalMs and rides the first prefill step that starts at or after it. */
  function timeline({ mode, decodeMs = DECODE_MS, prefillMs, interval = PREFILL_INTERVAL, horizonMs = 3000, arrivalMs = 0 }) {
    if (mode !== 'mixed' && mode !== 'split') throw new Error('mode 必须是 mixed 或 split');
    if (!(decodeMs > 0) || !(prefillMs > 0) || !Number.isInteger(interval) || interval < 1) throw new Error('参数无效');
    const segments = [], ticks = [];
    let tracked = null;
    const ride = (start, end) => { if (!tracked && start >= arrivalMs) tracked = { start, end, ttft: end - arrivalMs }; };
    if (mode === 'mixed') {
      let t = 0, k = 0;
      while (t < horizonMs) {
        if (k === interval) { segments.push({ lane: 'gpu', kind: 'prefill', start: t, end: t + prefillMs }); ride(t, t + prefillMs); t += prefillMs; k = 0; }
        else { segments.push({ lane: 'gpu', kind: 'decode', start: t, end: t + decodeMs }); t += decodeMs; ticks.push(t); k++; }
      }
    } else {
      for (let t = 0; t < horizonMs; t += prefillMs) { segments.push({ lane: 'p', kind: 'prefill', start: t, end: t + prefillMs }); ride(t, t + prefillMs); }
      for (let t = 0; t < horizonMs; t += decodeMs) { segments.push({ lane: 'd', kind: 'decode', start: t, end: t + decodeMs }); ticks.push(t + decodeMs); }
      // A request arriving late in the horizon still gets the next step after it.
      if (!tracked) { const start = Math.ceil(arrivalMs / prefillMs) * prefillMs; tracked = { start, end: start + prefillMs, ttft: start + prefillMs - arrivalMs }; }
    }
    if (!tracked) { // mixed: the next prefill point lies beyond the horizon
      const cycle = interval * decodeMs + prefillMs, n = Math.floor(arrivalMs / cycle);
      let start = n * cycle + interval * decodeMs;
      if (start < arrivalMs) start += cycle;
      tracked = { start, end: start + prefillMs, ttft: start + prefillMs - arrivalMs };
    }
    const gaps = ticks.slice(1).map((x, i) => x - ticks[i]);
    return { segments, ticks, tracked, maxGap: Math.max(...gaps), meanGap: gaps.reduce((a, b) => a + b, 0) / gaps.length };
  }

  // Share of time the mixed GPU group spends decoding, over whole cycles: a / (a + p).
  function decodeShare({ decodeMs = DECODE_MS, prefillMs, interval = PREFILL_INTERVAL }) {
    const a = interval * decodeMs;
    return a / (a + prefillMs);
  }

  /* Mean TTFT for an arrival spread evenly over one cycle of a busy server.
     mixed: decode phase a = interval * decodeMs, then a prefill of p. Arriving at x < a waits a - x, then p.
     Arriving during the prefill waits for the next cycle. Integrating gives (a^2/2 + 2pa + 1.5p^2) / (a + p).
     split: the prefill lane is always busy, so the wait is half a step on average, then one step: 1.5 p. */
  function meanTtft(mode, { decodeMs = DECODE_MS, prefillMs, interval = PREFILL_INTERVAL }) {
    const p = prefillMs;
    if (mode === 'split') return 1.5 * p;
    const a = interval * decodeMs;
    return (a * a / 2 + 2 * p * a + 1.5 * p * p) / (a + p);
  }

  /* Causal attention work of splitting one sequence of n tokens over cp ranks.
     The sequence is cut into 2 * cp equal chunks. Naive: rank r takes chunks 2r and 2r + 1.
     Mirror (DeepInfer "balanced CP"): rank r takes chunks r and 2cp - 1 - r. Work of a row at position t is t + 1 keys. */
  function cpBalance(n, cp) {
    if (!Number.isInteger(n) || n < 1 || !Number.isInteger(cp) || cp < 1) throw new Error('参数无效');
    const parts = 2 * cp, s = Math.ceil(n / parts);
    const work = i => { const lo = i * s, hi = Math.min((i + 1) * s, n); if (hi <= lo) return 0; return (hi * (hi + 1) - lo * (lo + 1)) / 2; };
    const naive = [], mirror = [];
    for (let r = 0; r < cp; r++) { naive.push(work(2 * r) + work(2 * r + 1)); mirror.push(work(r) + work(parts - 1 - r)); }
    const imb = a => Math.max(...a) / (a.reduce((x, y) => x + y, 0) / a.length);
    return { naive, mirror, naiveImbalance: imb(naive), mirrorImbalance: imb(mirror) };
  }

  const api = {
    BLOCK, WINDOW, NEXTN, RESERVE, STORE_PER_GPU_TB, MXFP8_BYTES, FP4_BYTES, PREFILL_POINTS, DECODE_MS, PREFILL_INTERVAL,
    backtrack, keepMin, tokenRecordBytes, swaStateBytes, hitLength, hitTrade, timeline, decodeShare, meanTtft, cpBalance,
  };
  root.VizMath = root.VizMath || {};
  root.VizMath.diPdKv = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
