/* Pure logic behind the chapter 22 widgets. Teaching model, not Strata code.
   The branch rules mirror files at the pinned commit 99f3dbd:
   include/strata/kernels/dp4a.hpp, include/strata/hip_compat/intrinsics.hpp, cmake/hip_backend.cmake,
   CMakeLists.txt (CUDA guard), src/program/generate.cpp and src/kernels/cpu/native_expert.cpp. */
(function (root) {
  'use strict';

  // Four signed bytes -> one int32, lane 0 in the low byte (little-endian, as on x86 and both GPU families).
  function pack(bytes) {
    if (!Array.isArray(bytes) || bytes.length !== 4) throw new Error('需要 4 个字节');
    let w = 0;
    bytes.forEach((v, i) => {
      if (!Number.isInteger(v) || v < -128 || v > 127) throw new Error('每个字节必须是 -128 到 127 的整数');
      w |= (v & 0xff) << (8 * i);
    });
    return w | 0;
  }
  function unpack(word) {
    return [0, 1, 2, 3].map(i => { const v = (word >>> (8 * i)) & 0xff; return v < 0x80 ? v : v - 0x100; });
  }

  // CUDA's signed __dp4a: c + sum of four signed byte products, modulo 2^32.
  function dp4aRef(a, b, c) {
    const x = unpack(a), y = unpack(b);
    let s = c | 0;
    for (let i = 0; i < 4; i++) s = (s + x[i] * y[i]) | 0;
    return s;
  }
  // The portable HIP branch: unsigned 32-bit accumulation, then reinterpret as signed.
  function dp4aHipLoop(a, b, c) {
    let sum = c >>> 0;
    for (let lane = 0; lane < 4; lane++) {
      const sb = w => { const v = (w >>> (lane * 8)) & 0xff; return v < 0x80 ? v : v - 0x100; };
      sum = (sum + ((sb(a) * sb(b)) >>> 0)) >>> 0;
    }
    return sum | 0;
  }
  // The CUDA sm_60 fallback: read the operands as int8 arrays, add in int32.
  function dp4aSm60(a, b, c) {
    const x = unpack(a), y = unpack(b);
    return (c + x[0] * y[0] + x[1] * y[1] + x[2] * y[2] + x[3] * y[3]) | 0;
  }

  const SUDOT4 = ['gfx1100', 'gfx1101', 'gfx1102', 'gfx1200', 'gfx1201'];
  const SDOT4 = ['gfx1030', 'gfx1031', 'gfx1032'];
  // Which #if branch a call to STRATA_DP4A / __dp4a compiles to for one target.
  function dp4aBranch(t) {
    if (t && t.backend === 'cuda') {
      if (!Number.isInteger(t.sm)) throw new Error('需要 sm 编号');
      return t.sm < 61 ? { id: 'cuda-sw', file: 'dp4a.hpp' } : { id: 'cuda-hw', file: 'dp4a.hpp' };
    }
    if (t && t.backend === 'hip') {
      const base = String(t.arch || '').replace(/:.*$/, '');
      if (SUDOT4.includes(base)) return { id: 'hip-sudot4', file: 'intrinsics.hpp' };
      if (SDOT4.includes(base)) return { id: 'hip-sdot4', file: 'intrinsics.hpp' };
      return { id: 'hip-loop', file: 'intrinsics.hpp' };
    }
    throw new Error('未知后端');
  }

  // cmake/hip_backend.cmake lines 12-33.
  function hipTier(arch) {
    const base = String(arch).replace(/:.*$/, '');
    if (['gfx1100', 'gfx1201'].includes(base)) return 'validated';
    if (['gfx1101', 'gfx1200'].includes(base)) return 'community';
    if (['gfx1102', 'gfx1030'].includes(base)) return 'unvalidated';
    return 'refused';
  }
  // CMakeLists.txt lines 95-103: below 7.5 only with STRATA_EXPERIMENTAL_SM60, below 6.0 never.
  function cudaTier(sm, experimental) {
    if (sm < 60) return 'refused';
    if (sm < 75) return experimental ? 'experimental' : 'refused';
    return 'ok';
  }

  // ggml type ids: IQ2_XXS 16, IQ2_XS 17, IQ3_XXS 18, IQ3_S 21, IQ2_S 22, IQ4_XS 23.
  const TYPES = { iq2_xxs: 16, iq2_xs: 17, iq3_xxs: 18, iq3_s: 21, iq2_s: 22, iq4_xs: 23 };
  const iq512 = t => [16, 17, 18, 21, 22].includes(t);
  const iq256 = t => [16, 17, 18, 21, 22, 23].includes(t);
  const MT_MIN = 2;
  // Which CPU kernel computes an expert's gate/up rows. cpu: { avx2, avx512 } as the CPUID probe reports them.
  function cpuPath({ avx2, avx512, pack: p, nt, noIq512 = false, noIq256 = false }) {
    if (!Number.isInteger(nt) || nt < 1) throw new Error('nt 必须是正整数');
    if (p !== 'q2_0' && !(p in TYPES)) throw new Error('未知的包格式');
    if (!avx2) return { id: 'refuse-avx2' };
    if (p === 'q2_0') return avx512 ? { id: 'strata-vnni' } : { id: 'refuse-avx512' };
    const t = TYPES[p], use512 = avx512 && !noIq512, use256 = !noIq256;
    if (nt >= MT_MIN && (iq512(t) || (!avx512 && iq256(t)))) {
      if (use512 && iq512(t)) return { id: 'iq512' };
      if (use256 && iq256(t)) return { id: 'iq256' };
    }
    return { id: 'ggml' };
  }

  function lanes(registerBits, elementBits) {
    if (![128, 256, 512].includes(registerBits) || ![8, 16, 32].includes(elementBits)) throw new Error('不支持的宽度');
    return registerBits / elementBits;
  }

  function combos(dims) {
    return dims.reduce((p, d) => { if (!Number.isInteger(d) || d < 1) throw new Error('每一维至少 1 项'); return p * d; }, 1);
  }

  const api = { pack, unpack, dp4aRef, dp4aHipLoop, dp4aSm60, dp4aBranch, hipTier, cudaTier, cpuPath, lanes, combos, TYPES, MT_MIN };
  root.VizMath = root.VizMath || {};
  root.VizMath.portable = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
