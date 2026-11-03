/* Pure numbers behind the DeepSeek page "attention" widget (rows one decode query reads, and the state a token keeps).
   Teaching model of strata-dsv41, not engine code. Page section numbers refer to content/columns/deepseek/attention.html.
   Upstream paths are in Niko1221/Strata at the pinned commit c62d5e3a15b40ea51c96aae9e8d36928965f53ab. */
(function (root) {
  'use strict';

  // Sec 3.1: the recipe reads a 128-row window ring, up to 512 picked compressed rows and a per-head sink. 64 heads share them.
  // src/dsv41/ds4_model.cu:8-10, src/dsv41/ds4_model.hpp:6-10, tools/dsv41_lab/ds4_lab.cu:1-4.
  const WINDOW = 128;
  const TOPK = 512;
  const HEADS = 64;
  // Sec 3.2: DeepSeek-V4.1-Flash has 40 layers. docs/DEEPSEEK41.md:3.
  const LAYERS = 40;
  // Sec 3.2: one ring row is 512 FP8 codes + 512 / 32 = 16 scales = 528 B.
  // src/dsv41/ds4_kernels.cuh:22-33, src/dsv41/ds4_model.cu:3209-3213.
  const RING_ROW_BYTES = 512 + 512 / 32;
  // Sec 3.3: one compressed row is 256 FP4 bytes + 512 / 16 = 32 E4M3 scales = 288 B.
  // src/dsv41/ds4_model.cu:10223-10232, src/dsv41/ds4_kernels.cuh:22-33.
  const COMP_ROW_BYTES = 256 + 512 / 16;
  // Sec 3.3: one index key is 128 dims of FP4 = 64 B + 4 B scale, padded to a multiple of 16 = 80 B.
  // src/dsv41/ds4_kernels.cuh:29-33, src/dsv41/ds4_model.cu:3211-3213.
  const INDEX_KEY_BYTES = 80;
  // Sec 3.4: the indexer kernel supports at most 32 heads; the lab comment says exactly 32 (teaching estimate: 32 heads x 128 dims per row).
  // src/dsv41/ds4_kernels.cu:2356-2362, tools/dsv41_lab/ds4_lab.cu:1-4.
  const INDEX_HEADS = 32;
  const INDEX_DIM = 128;
  // Sec 3.5: a source layer keeps one compressed row and one index key per row: 288 + 80 = 368 B.
  const SOURCE_ROW_BYTES = COMP_ROW_BYTES + INDEX_KEY_BYTES;
  // Sec 3.5: --context accepts 8K to 1M (setup.py:8533-8536); the default is 8,192 (docs/DEEPSEEK41.md:93).
  const MIN_CONTEXT = 1;
  const MAX_CONTEXT = 1048576;
  const DEFAULTS = { ctx: 8192, R: 1 };
  // Sec 3.4 and 3.6: reads per layer per step are capped at 128 + 512 rows.
  const MAX_ROWS_PER_LAYER = WINDOW + TOPK;

  function checkCtx(L) {
    if (!Number.isInteger(L) || L < MIN_CONTEXT || L > MAX_CONTEXT) throw new Error('上下文长度必须是 1 到 1,048,576 的整数');
  }
  // R = 0: no compressed rows (window-only layer). src/dsv41/ds4_model.cu:531.
  function checkR(R) {
    if (!Number.isInteger(R) || R < 0) throw new Error('压缩比 R 必须是非负整数');
  }

  const ringBytesPerLayer = () => WINDOW * RING_ROW_BYTES;   // 128 x 528 = 67,584
  const ringBytesTotal = () => LAYERS * ringBytesPerLayer(); // 2,703,360 = 2.58 MiB
  const stepBytesPerLayer = () => WINDOW * RING_ROW_BYTES + TOPK * COMP_ROW_BYTES;   // 215,040 (sec 3.6)

  // n = floor(position / R): compressed rows that exist now (sec 3.4; ds4_model.cu:10151-10155).
  function compressedRows(L, R) {
    checkCtx(L); checkR(R);
    return R === 0 ? 0 : Math.floor(L / R);
  }
  // A token at position p sees p + 1 ring rows, at most 128 (sec 3.2; ds4_model.cu:10090-10118).
  function windowRows(L) { checkCtx(L); return Math.min(WINDOW, L); }
  // The indexer picks min(512, n); all rows when n <= 512 (sec 3.4; ds4_model.cu:10151-10155).
  function pickedRows(n) {
    if (!Number.isInteger(n) || n < 0) throw new Error('行数必须是非负整数');
    return Math.min(TOPK, n);
  }

  // What the last token of a context of length L reads in one layer with compression ratio R.
  function readState(L, R) {
    const n = compressedRows(L, R), window = windowRows(L), picked = pickedRows(n);
    return { L, R, n, window, picked, total: window + picked, bytes: window * RING_ROW_BYTES + picked * COMP_ROW_BYTES };
  }

  // Sec 3.4: scoring cost of one decode step on a layer that scores every row (no candidate-block prefilter).
  function indexerScan(L, R) {
    const rows = compressedRows(L, R);
    return { rows, keyBytes: rows * INDEX_KEY_BYTES, macs: rows * INDEX_HEADS * INDEX_DIM };
  }

  // Sec 3.4: scoring pairs while reading a prompt of L tokens: sum over p = 1..L of floor(p / R). L(L + 1) / 2 for R = 1.
  function promptPairs(L, R) {
    checkCtx(L); checkR(R);
    if (R === 0) return 0;
    const q = Math.floor(L / R), r = L - q * R;
    return R * q * (q - 1) / 2 + q * (r + 1);
  }

  // Sec 3.5: the state kept for one context. Ring: 40 layers, fixed. One source layer: ceil(L / R) + 1 rows x 368 B
  // (ds4_model.cu:2401). Naive: every layer keeps one FP8 row per position.
  function keptState(L, R) {
    checkCtx(L); checkR(R);
    const sourceRows = R === 0 ? 0 : Math.ceil(L / R) + 1;
    return { ringBytes: ringBytesTotal(), sourceRows, sourceBytes: sourceRows * SOURCE_ROW_BYTES, naiveBytes: LAYERS * RING_ROW_BYTES * L };
  }

  // Deterministic sample of k distinct row positions in [0, n), sorted. Only for drawing: real picks follow the scores.
  function pickPositions(n, k) {
    if (!Number.isInteger(n) || n < 0 || !Number.isInteger(k) || k < 0 || k > n) throw new Error('挑选数必须在 0 到 n 之间');
    if (k === n) return Array.from({ length: n }, (_, i) => i);
    const seen = new Set();
    let s = 2463534242;   // xorshift32 seed
    while (seen.size < k) {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      seen.add(s % n);
    }
    return [...seen].sort((a, b) => a - b);
  }

  const api = {
    WINDOW, TOPK, HEADS, LAYERS, RING_ROW_BYTES, COMP_ROW_BYTES, INDEX_KEY_BYTES, INDEX_HEADS, INDEX_DIM, SOURCE_ROW_BYTES,
    MIN_CONTEXT, MAX_CONTEXT, MAX_ROWS_PER_LAYER, DEFAULTS,
    ringBytesPerLayer, ringBytesTotal, stepBytesPerLayer, compressedRows, windowRows, pickedRows, readState, indexerScan,
    promptPairs, keptState, pickPositions,
  };
  root.VizMath = root.VizMath || {};
  root.VizMath.dsAttentionState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
