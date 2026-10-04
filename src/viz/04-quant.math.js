/* Pure numbers behind the chapter 04 widgets: FP32 / FP16 / BF16 bit patterns, symmetric uniform quantization,
   and the block formats named in Strata's headers (include/strata/artifact/dequant.hpp, kernels/quantize_act.hpp). */
(function (root) {
  'use strict';
  const buf = new DataView(new ArrayBuffer(4));
  function f32Bits(x) {
    buf.setFloat32(0, x);
    const u = buf.getUint32(0);
    return { u, sign: u >>> 31, exp: (u >>> 23) & 0xff, mant: u & 0x7fffff, value: buf.getFloat32(0) };
  }
  const fromU32 = u => { buf.setUint32(0, u >>> 0); return buf.getFloat32(0); };

  // Strata's bf16_from_f32: NaN passed through quieted; otherwise round to nearest even on bit 16.
  function bf16FromF32(x) {
    let i = f32Bits(x).u;
    if ((i & 0x7fffffff) >>> 0 > 0x7f800000) return ((i >>> 16) | 64) & 0xffff;
    i = ((i + ((i >>> 16) & 1) + 0x7fff) & 0xffff0000) >>> 0;
    return i >>> 16;
  }
  const f32FromBf16 = h => fromU32((h & 0xffff) << 16);

  // IEEE binary16 with round to nearest even, overflow to infinity, gradual underflow.
  function f16FromF32(x) {
    const v = f32Bits(x).value, sign = (v < 0 || Object.is(v, -0)) ? 0x8000 : 0, a = Math.abs(v);
    if (Number.isNaN(v)) return 0x7e00;
    if (a === Infinity) return sign | 0x7c00;
    if (a === 0) return sign;
    let e = Math.floor(Math.log2(a));
    if (2 ** e > a) e--; else if (2 ** (e + 1) <= a) e++;
    if (e < -14) {                                  // subnormal: multiples of 2^-24
      const q = rne(a / 2 ** -24);
      return sign | q;                               // q == 1024 becomes the smallest normal, which is the right bits
    }
    let mant = rne((a / 2 ** e - 1) * 1024);
    if (mant === 1024) { mant = 0; e++; }
    if (e > 15) return sign | 0x7c00;
    return sign | ((e + 15) << 10) | mant;
  }
  function f32FromF16(h) {
    const s = h & 0x8000 ? -1 : 1, e = (h >>> 10) & 0x1f, m = h & 0x3ff;
    if (e === 0) return s * m * 2 ** -24;
    if (e === 31) return m ? NaN : s * Infinity;
    return s * (1 + m / 1024) * 2 ** (e - 15);
  }
  function rne(v) { const f = Math.floor(v), d = v - f; return d > 0.5 || (d === 0.5 && f % 2 === 1) ? f + 1 : f; }

  const FLOATS = { fp32: { e: 8, m: 23 }, fp16: { e: 5, m: 10 }, bf16: { e: 8, m: 7 } };
  function storeAll(x) {
    const x32 = f32Bits(x).value;
    const pack = (bits, value, width) => ({ bits, width, value, rel: x32 === 0 ? 0 : Math.abs(value - x32) / Math.abs(x32) });
    const h = f16FromF32(x32), b = bf16FromF32(x32);
    return { x32, fp32: pack(f32Bits(x32).u, x32, 32), fp16: pack(h, f32FromF16(h), 16), bf16: pack(b, f32FromBf16(b), 16) };
  }
  const bitString = (bits, width) => (bits >>> 0).toString(2).padStart(width, '0');

  // Symmetric uniform quantizer: Q = 2^(b-1) - 1, s = max|x| / Q, q = clip(round(x / s)), x^ = s q.
  function quantize(x, b) {
    if (!Number.isInteger(b) || b < 2 || b > 8) throw new Error('位数必须是 2 到 8 的整数');
    const Q = 2 ** (b - 1) - 1, a = Math.max(...x.map(Math.abs)), s = a > 0 ? a / Q : 1;
    const q = x.map(v => { const r = Math.sign(v) * Math.round(Math.abs(v) / s); return Math.max(-Q, Math.min(Q, r)) + 0; });
    const xhat = q.map(c => c * s), err = x.map((v, i) => v - xhat[i]);
    return { Q, a, s, q, xhat, mse: err.reduce((t, e) => t + e * e, 0) / x.length, maxErr: Math.max(...err.map(Math.abs)) };
  }
  // Split into groups of g, each with its own scale.
  function quantizeGroups(x, b, g) {
    const parts = [];
    for (let i = 0; i < x.length; i += g) parts.push(quantize(x.slice(i, i + g), b));
    const q = parts.flatMap(p => p.q), xhat = parts.flatMap(p => p.xhat);
    const mse = x.reduce((t, v, i) => t + (v - xhat[i]) ** 2, 0) / x.length;
    return { parts, q, xhat, mse, maxErr: Math.max(...x.map((v, i) => Math.abs(v - xhat[i]))), zeroed: q.filter((c, i) => c === 0 && x[i] !== 0).length };
  }
  const bitsPerWeight = (b, g, scaleBits) => b + scaleBits / g;

  // A teaching block of 16 weights, and the same block with one outlier.
  const BLOCK = [0.12, -0.35, 0.08, 0.41, -0.22, 0.05, -0.47, 0.30, -0.09, 0.26, -0.31, 0.17, 0.44, -0.14, 0.02, -0.38];
  const OUTLIER_INDEX = 6, OUTLIER = -2.8;
  const withOutlier = x => x.map((v, i) => (i === OUTLIER_INDEX ? OUTLIER : v));

  // Block formats: bytes per block and weights per block.
  const FORMATS = [
    { name: 'Q2_0', bytes: 18, n: 64 },
    { name: 'Q4_0', bytes: 18, n: 32 },
    { name: 'Q8_0', bytes: 34, n: 32 },
    { name: 'Q8_K', bytes: 292, n: 256 },
  ];
  const formatBits = f => f.bytes * 8 / f.n;
  const q2Decode = (code, d) => (code - 1) * d;     // code {0,1,2,3} -> {-1,0,+1,+2} * d
  const EXPERT_PARAMS = 3 * 2560 * 640;

  const api = { f32Bits, bf16FromF32, f32FromBf16, f16FromF32, f32FromF16, FLOATS, storeAll, bitString, quantize, quantizeGroups, bitsPerWeight, BLOCK, OUTLIER_INDEX, OUTLIER, withOutlier, FORMATS, formatBits, q2Decode, EXPERT_PARAMS };
  root.VizMath = root.VizMath || {};
  root.VizMath.quant = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
