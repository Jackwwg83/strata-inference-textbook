/* Pure numbers behind the chapter 21 widgets. Teaching model, not a Strata scheduler.
   Hand-off sizes from include/strata/core/verify.hpp (handoff_floats), layout.hpp (hc = 4, n_embd = 2560)
   and src/prefill/prefill.cpp (D = N * HC rows) at the pinned commit. Stage times and link latency are inputs. */
(function (root) {
  'use strict';
  const N_EMBD = 2560, HC = 4, LAYERS = 48;
  const DECODE_HANDOFF_FLOATS = HC * N_EMBD + N_EMBD + HC;   // residual R + pending write bo + inject
  const DECODE_HANDOFF_BYTES = DECODE_HANDOFF_FLOATS * 4;
  const PREFILL_ROW_BYTES = HC * N_EMBD * 4;                 // the prompt path hands on the residual rows only
  // Per-direction peak of common links, GB/s (decimal). PCIe from the PCI-SIG generation table; NVLink 4.0 = H100, 18 links.
  const LINKS = [
    { id: 'p4x4', gbps: 7.9 }, { id: 'p3x16', gbps: 15.8 }, { id: 'p4x16', gbps: 31.5 },
    { id: 'p5x16', gbps: 63 }, { id: 'nvl4', gbps: 450 },
  ];

  const pos = (v, name) => { if (!(Number.isFinite(v) && v > 0)) throw new Error(name + ' 必须大于零'); return v; };
  const nonneg = (v, name) => { if (!(Number.isFinite(v) && v >= 0)) throw new Error(name + ' 不能为负'); return v; };
  const count = (v, name) => { if (!Number.isInteger(v) || v < 1) throw new Error(name + ' 必须是正整数'); return v; };

  function prefillChunkBytes(tokens) { return count(tokens, '块大小') * PREFILL_ROW_BYTES; }

  // Two stages, two hand-off buffers. Stage A reads chunk c in a ms, then copies it out in x ms; stage B copies it
  // in (x ms), then reads it in b ms. A hands chunk c on only after B finished chunk c-1, then moves to chunk c+1.
  function pipeline(a, b, x, n) {
    pos(a, '前一张卡的时间'); pos(b, '后一张卡的时间'); nonneg(x, '搬运时间'); count(n, '块数');
    const chunks = [];
    let aStart = 0, prevBEnd = 0;
    for (let c = 0; c < n; c++) {
      const aEnd = aStart + a + x;
      const bStart = Math.max(aEnd, prevBEnd);
      const bEnd = bStart + x + b;
      chunks.push({ aStart, aEnd, bStart, bEnd });
      prevBEnd = bEnd;
      aStart = bStart;
    }
    const total = prevBEnd, serial = n * (a + b);
    return {
      chunks, total, serial, speedup: serial / total,
      idleA: total - n * (a + x), idleB: total - n * (b + x),
      steady: Math.max(a + x, b + x),
    };
  }

  // One crossing of a link: fixed latency plus bytes over bandwidth. Microseconds.
  function crossUs(bytes, gbps, latencyUs) { nonneg(bytes, '字节数'); pos(gbps, '带宽'); nonneg(latencyUs, '延迟'); return latencyUs + bytes / (gbps * 1e3); }

  // Layer split: one hand-off per verify window, through pinned host RAM, so it crosses PCIe twice.
  function layerSplitWindow(tokens, gbps, latencyUs) {
    count(tokens, '窗口 token 数');
    const each = tokens * DECODE_HANDOFF_BYTES;
    return { crossings: 2, bytes: 2 * each, us: 2 * crossUs(each, gbps, latencyUs) };
  }

  // Hypothetical tensor parallelism on the same model: two syncs per layer, each moving one 2560-float row per token.
  function tensorWindow(tokens, gbps, latencyUs) {
    count(tokens, '窗口 token 数');
    const syncs = 2 * LAYERS, each = tokens * N_EMBD * 4;
    return { crossings: syncs, bytes: syncs * each, us: syncs * crossUs(each, gbps, latencyUs) };
  }

  // A 2048-token prompt chunk's residual rows: device -> pinned host -> next device. Milliseconds, bandwidth only.
  function prefillHandoffMs(tokens, gbps) { return 2 * prefillChunkBytes(tokens) / (pos(gbps, '带宽') * 1e9) * 1000; }

  const api = { N_EMBD, HC, LAYERS, DECODE_HANDOFF_FLOATS, DECODE_HANDOFF_BYTES, PREFILL_ROW_BYTES, LINKS, prefillChunkBytes, pipeline, crossUs, layerSplitWindow, tensorWindow, prefillHandoffMs };
  root.VizMath = root.VizMath || {};
  root.VizMath.pipeline = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
