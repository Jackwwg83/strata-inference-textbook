/* Pure numbers behind the chapter 17 widgets. Budget exercise and teaching model, not an allocator simulation.
   Geometry and formats from layout.hpp, qsa.hpp, kv_q8.hpp, kv_q4.hpp, kv_stream.hpp and session.cpp at the pinned commit. */
(function (root) {
  'use strict';
  const QSA_LAYERS = 12, KV_HEADS = 2, HEAD_DIM = 256;
  // Bytes of one cell (one token, one QSA layer, both KV heads, K and V).
  const int8Head = HEAD_DIM + (HEAD_DIM / 64) * 2;        // codes + one fp16 scale per 64 values
  const q4Head = (HEAD_DIM / 32) * 18;                     // ggml block_q4_0: 32 values in 18 bytes
  const CELL_BYTES = {
    f16: KV_HEADS * HEAD_DIM * 2 * 2,
    int8: KV_HEADS * int8Head * 2,
    k8v4: KV_HEADS * (int8Head + q4Head),                  // INT8 K + rotated Q4_0 V
    q4: KV_HEADS * q4Head * 2,
  };
  // 36 GDN layers × (recurrent state 128 × 48 × 128 + conv history 10240 × 3) floats.
  const GDN_STATE_BYTES = 36 * (128 * 48 * 128 + 10240 * 3) * 4;
  const RESIDENT_CELLS = 32768, STREAM_FROM = 65536;       // --kv-resident 32768; streaming from 64K

  function perToken(fmt) {
    if (!(fmt in CELL_BYTES)) throw new Error('未知的 KV 格式：' + fmt);
    return QSA_LAYERS * CELL_BYTES[fmt];
  }

  function units(bytes) {
    return { bytes, kb: bytes / 1e3, kib: bytes / 1024, mb: bytes / 1e6, mib: bytes / 2 ** 20, gb: bytes / 1e9, gib: bytes / 2 ** 30 };
  }

  // One running conversation plus (sessions - 1) parked in host RAM.
  function budget({ ctx, sessions, fmt, streaming }) {
    if (!Number.isInteger(ctx) || ctx < 1) throw new Error('上下文长度必须是正整数');
    if (!Number.isInteger(sessions) || sessions < 1) throw new Error('对话数至少为 1');
    const pt = perToken(fmt), kvOne = pt * ctx;
    const wants = streaming && ctx >= STREAM_FROM;
    const blocked = wants && fmt === 'k8v4';
    const streams = wants && !blocked;
    const vramKv = pt * (streams ? RESIDENT_CELLS : ctx), ramKv = streams ? kvOne : 0;
    const parked = (sessions - 1) * (kvOne + GDN_STATE_BYTES);
    return { perToken: pt, kvOne, streams, blocked, vramKv, ramKv, gdn: GDN_STATE_BYTES, parked,
      vram: vramKv + GDN_STATE_BYTES, ram: ramKv + parked };
  }

  // ---- paging: a residency map over VRAM slots with a CLOCK (second chance) sweep, as kv_stream.hpp describes ----
  function pagingState(nBlocks, nSlots) {
    return { table: Array(nBlocks).fill(-1), slotBlock: Array(nSlots).fill(-1), ref: Array(nSlots).fill(0), hand: 0 };
  }

  // Makes every selected block resident. Returns the hits and, per miss, the slot it took and the block it evicted.
  function resolve(s, selected) {
    const blocks = [...new Set(selected)];
    if (blocks.length > s.slotBlock.length) throw new Error('一次选中的块多于显存槽位');
    const used = new Set(), hits = [], misses = [];
    for (const b of blocks) if (s.table[b] >= 0) { hits.push(b); s.ref[s.table[b]] = 1; used.add(s.table[b]); }
    for (const b of blocks) {
      if (s.table[b] >= 0) continue;
      let slot = -1;
      for (let guard = 0; guard < 3 * s.slotBlock.length && slot < 0; guard++) {
        const h = s.hand;
        s.hand = (s.hand + 1) % s.slotBlock.length;
        if (used.has(h)) continue;
        if (s.slotBlock[h] >= 0 && s.ref[h]) { s.ref[h] = 0; continue; }
        slot = h;
      }
      const evicted = s.slotBlock[slot];
      if (evicted >= 0) s.table[evicted] = -1;
      s.slotBlock[slot] = b; s.table[b] = slot; s.ref[slot] = 1; used.add(slot);
      misses.push({ block: b, slot, evicted });
    }
    return { hits, misses };
  }

  const api = { QSA_LAYERS, CELL_BYTES, GDN_STATE_BYTES, RESIDENT_CELLS, STREAM_FROM, perToken, units, budget, pagingState, resolve };
  root.VizMath = root.VizMath || {};
  root.VizMath.kv = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
