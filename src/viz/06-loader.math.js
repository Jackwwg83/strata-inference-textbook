/* Pure numbers behind the chapter 06 widgets. Teaching models, not Strata's loader.
   checkRange mirrors the two ways to write a bounds check; payloadBytes mirrors
   tensor_payload_bytes in include/strata/artifact/gguf_reader.hpp at the pinned commit. */
(function (root) {
  'use strict';
  const U64_MAX = (1n << 64n) - 1n;

  // Is [o, o+n) inside a file of F bytes, when every number is a `bits`-bit unsigned integer?
  // naive: the sum o+n is computed in `bits` bits and may wrap. safe: o <= F && n <= F - o.
  function checkRange(F, o, n, bits) {
    if (!Number.isInteger(bits) || bits < 2 || bits > 32) throw new Error('bits 必须是 2 到 32 之间的整数');
    const max = 2 ** bits;
    for (const v of [F, o, n]) if (!Number.isInteger(v) || v < 0 || v >= max) throw new Error('数值超出 ' + bits + ' 位无符号整数的范围');
    const trueSum = o + n;
    const naiveSum = trueSum % max;
    return {
      trueSum, naiveSum,
      wrapped: trueSum >= max,
      naiveOk: naiveSum <= F,
      safeOk: o <= F && n <= F - o,
      truth: trueSum <= F,
      room: o <= F ? F - o : null,
    };
  }

  // Bytes of a tensor from its shape and block geometry; 0 for an empty shape, a zero dimension,
  // a row that is not whole blocks, or a count that would overflow 64 bits.
  function payloadBytes(shape, elemsPerBlock, bytesPerBlock) {
    if (!Array.isArray(shape) || shape.length === 0) return 0;
    const be = BigInt(elemsPerBlock), bb = BigInt(bytesPerBlock);
    if (BigInt(shape[0]) % be !== 0n) return 0;
    let elements = 1n;
    for (const d0 of shape) {
      const d = BigInt(d0);
      if (d === 0n || elements > U64_MAX / d) return 0;
      elements *= d;
    }
    const blocks = elements / be;
    if (blocks > U64_MAX / bb) return 0;
    return Number(blocks * bb);
  }

  // Least-recently-used page cache over an access list. Returns per-access steps and totals.
  function simulatePages(accesses, capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('缓存容量至少是 1 页');
    const cache = [];                       // most recently used last
    const steps = [];
    let hits = 0, faults = 0;
    for (const page of accesses) {
      const at = cache.indexOf(page);
      let evicted = null, hit = at >= 0;
      if (hit) { cache.splice(at, 1); hits++; }
      else { faults++; if (cache.length >= capacity) evicted = cache.shift(); }
      cache.push(page);
      steps.push({ page, hit, evicted, resident: cache.slice() });
    }
    return { steps, hits, faults, hitRate: accesses.length ? hits / accesses.length : 0 };
  }

  // Milliseconds to move `bytes` at `gbps` gigabytes per second (decimal units).
  function transferMs(bytes, gbps) {
    if (!(gbps > 0) || !(bytes >= 0)) throw new Error('带宽必须大于零');
    return bytes / (gbps * 1e9) * 1000;
  }

  const api = { checkRange, payloadBytes, simulatePages, transferMs };
  root.VizMath = root.VizMath || {};
  root.VizMath.loader = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
