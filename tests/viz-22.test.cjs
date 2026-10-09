'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/22-portable.math.js');

test('pack and unpack keep four signed bytes, lane 0 in the low byte', () => {
  const w = m.pack([3, -2, 5, 1]);
  assert.equal(w, 0x0105fe03 | 0);
  assert.deepEqual(m.unpack(w), [3, -2, 5, 1]);
  assert.deepEqual(m.unpack(m.pack([-128, 127, -1, 0])), [-128, 127, -1, 0]);
  assert.throws(() => m.pack([1, 2, 3]));
  assert.throws(() => m.pack([128, 0, 0, 0]));
  assert.throws(() => m.pack([1.5, 0, 0, 0]));
});

test('dp4a sums four signed byte products into c', () => {
  const a = m.pack([3, -2, 5, 1]), b = m.pack([4, 7, -1, 2]);
  assert.equal(m.dp4aRef(a, b, 0), 12 - 14 - 5 + 2);
  assert.equal(m.dp4aRef(a, b, 100), 95);
  assert.equal(m.dp4aRef(m.pack([-128, -128, -128, -128]), m.pack([-128, -128, -128, -128]), 0), 65536);
});

test('dp4a wraps modulo 2^32 like a 32-bit integer', () => {
  const big = m.pack([127, 127, 127, 127]);
  assert.equal(m.dp4aRef(big, big, 2147483647), (2147483647 + 4 * 127 * 127) | 0);
  assert.ok(m.dp4aRef(big, big, 2147483647) < 0, 'overflow wraps to a negative int32');
});

test('the HIP portable loop and the CUDA sm_60 fallback agree with the reference bit for bit', () => {
  const cases = [
    [[3, -2, 5, 1], [4, 7, -1, 2], 0],
    [[-128, 127, -1, 0], [127, -128, 5, -7], -42],
    [[127, 127, 127, 127], [127, 127, 127, 127], 2147483647],
    [[-128, -128, -128, -128], [127, 127, 127, 127], -2147483648],
  ];
  for (const [x, y, c] of cases) {
    const a = m.pack(x), b = m.pack(y), want = m.dp4aRef(a, b, c);
    assert.equal(m.dp4aHipLoop(a, b, c), want);
    assert.equal(m.dp4aSm60(a, b, c), want);
    assert.equal(m.dp4aSdwa(a, b, c), want);
  }
});

test('dp4a branch follows the #if chains in dp4a.hpp and hip_compat/intrinsics.hpp', () => {
  assert.equal(m.dp4aBranch({ backend: 'cuda', sm: 120 }).id, 'cuda-hw');
  assert.equal(m.dp4aBranch({ backend: 'cuda', sm: 61 }).id, 'cuda-hw');
  assert.equal(m.dp4aBranch({ backend: 'cuda', sm: 60 }).id, 'cuda-sw');
  for (const arch of ['gfx1100', 'gfx1101', 'gfx1102', 'gfx1150', 'gfx1151', 'gfx1200', 'gfx1201']) assert.equal(m.dp4aBranch({ backend: 'hip', arch }).id, 'hip-sudot4', arch + ' (v0.1.40 adds gfx1150 and gfx1151)');
  for (const arch of ['gfx1030', 'gfx1031', 'gfx1032']) assert.equal(m.dp4aBranch({ backend: 'hip', arch }).id, 'hip-sdot4');
  assert.equal(m.dp4aBranch({ backend: 'hip', arch: 'gfx1012' }).id, 'hip-sdwa', 'v0.1.39: RDNA1 SDWA sequence');
  assert.equal(m.dp4aBranch({ backend: 'hip', arch: 'gfx1012', portableDot: true }).id, 'hip-loop', 'STRATA_GFX1012_PORTABLE_DOT');
  assert.equal(m.dp4aBranch({ backend: 'hip', arch: 'gfx1103' }).id, 'hip-loop', 'v0.1.40.2: gfx1103 (780M) takes the portable kernels');
  for (const arch of ['gfx1010', 'gfx1011']) assert.equal(m.dp4aBranch({ backend: 'hip', arch }).id, 'hip-loop', arch + ' (RDNA1, v0.1.40.2): only gfx1012 has the SDWA sequence');
  assert.equal(m.dp4aBranch({ backend: 'hip', arch: 'gfx1034' }).id, 'hip-loop', 'gfx1034 is not in the sdot4 list');
  assert.throws(() => m.dp4aBranch({ backend: 'metal' }));
});

test('HIP architecture tiers match cmake/hip_backend.cmake', () => {
  assert.equal(m.hipTier('gfx1100'), 'validated');
  assert.equal(m.hipTier('gfx1201'), 'validated');
  assert.equal(m.hipTier('gfx1101'), 'community');
  assert.equal(m.hipTier('gfx1200'), 'community');
  assert.equal(m.hipTier('gfx1102'), 'unvalidated');
  assert.equal(m.hipTier('gfx1030'), 'unvalidated');
  assert.equal(m.hipTier('gfx1012'), 'unvalidated', 'v0.1.39 adds gfx1012');
  assert.equal(m.hipTier('gfx1031'), 'unvalidated', 'v0.1.39 adds gfx1031');
  assert.equal(m.hipTier('gfx1034'), 'unvalidated', 'v0.1.40 adds gfx1034');
  assert.equal(m.hipTier('gfx1151'), 'unvalidated', 'v0.1.40 adds gfx1151 (Strix Halo, experimental)');
  for (const arch of ['gfx1010', 'gfx1011', 'gfx1103', 'gfx1150']) assert.equal(m.hipTier(arch), 'unvalidated', 'v0.1.40.2 adds ' + arch);
  assert.equal(m.hipTier('gfx1032'), 'refused', 'gfx1032 has an sdot4 branch but is not in the CMake list');
  assert.equal(m.hipTier('gfx1100:xnack-'), 'validated', 'feature suffix is stripped');
  assert.equal(m.hipTier('gfx906'), 'refused');
});

test('CUDA architecture check matches the CMake guard', () => {
  assert.equal(m.cudaTier(120, false), 'ok');
  assert.equal(m.cudaTier(75, false), 'ok');
  assert.equal(m.cudaTier(70, false), 'refused');
  assert.equal(m.cudaTier(70, true), 'experimental');
  assert.equal(m.cudaTier(60, true), 'experimental');
  assert.equal(m.cudaTier(52, true), 'refused');
});

test('CPU expert path follows generate.cpp and native_expert.cpp', () => {
  const base = { avx2: true, avx512: true, pack: 'iq3_s', nt: 3, noIq512: false, noIq256: false };
  assert.equal(m.cpuPath({ ...base, avx2: false, avx512: false }).id, 'refuse-avx2');
  assert.equal(m.cpuPath({ ...base, pack: 'q2_0' }).id, 'strata-vnni');
  assert.equal(m.cpuPath({ ...base, pack: 'q2_0', avx512: false }).id, 'refuse-avx512');
  assert.equal(m.cpuPath(base).id, 'iq512');
  assert.equal(m.cpuPath({ ...base, noIq512: true }).id, 'iq256');
  assert.equal(m.cpuPath({ ...base, noIq512: true, noIq256: true }).id, 'ggml');
  assert.equal(m.cpuPath({ ...base, avx512: false }).id, 'iq256');
  assert.equal(m.cpuPath({ ...base, avx512: false, noIq256: true }).id, 'ggml');
  assert.equal(m.cpuPath({ ...base, nt: 1 }).id, 'ggml', 'one token stays on ggml vec_dot (mt_min = 2)');
  assert.equal(m.cpuPath({ ...base, pack: 'iq4_xs' }).id, 'ggml', 'IQ4_XS has only an AVX2 kernel; an AVX-512 CPU keeps ggml');
  assert.equal(m.cpuPath({ ...base, pack: 'iq4_xs', avx512: false }).id, 'iq256');
  assert.throws(() => m.cpuPath({ ...base, pack: 'q9' }));
  assert.throws(() => m.cpuPath({ ...base, nt: 0 }));
});

test('vector width: AVX2 holds 32 int8 lanes, AVX-512 holds 64', () => {
  assert.equal(m.lanes(256, 8), 32);
  assert.equal(m.lanes(512, 8), 64);
  assert.equal(m.lanes(512, 32), 16);
  assert.throws(() => m.lanes(500, 8));
});

test('support matrix size is the product of its dimensions', () => {
  assert.equal(m.combos([2, 3, 2, 2]), 24);
  assert.equal(m.combos([12, 3, 2, 5]), 360, 'figure 22-7 at v0.1.41: 4 NVIDIA generations + 8 AMD archs in the Windows HIP zip');
  assert.equal(m.combos([]), 1);
  assert.throws(() => m.combos([2, 0]));
});
