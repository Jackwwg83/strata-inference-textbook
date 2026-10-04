'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/04-quant.math.js');

test('FP32 bit fields and BF16 as the top half of FP32', () => {
  const b = m.f32Bits(1);
  assert.equal(b.sign, 0); assert.equal(b.exp, 127); assert.equal(b.mant, 0);
  assert.equal(m.f32Bits(-2).sign, 1);
  assert.equal(m.bf16FromF32(1), 0x3f80);
  assert.equal(m.f32FromBf16(0x3f80), 1);
  assert.equal(m.f32FromBf16(m.bf16FromF32(3.140625)), 3.140625, 'exactly representable in 8 significant bits');
  // round to nearest even on bit 16: 1 + 2^-8 is a tie between 1 and 1 + 2^-7 -> stays at 1 (even)
  assert.equal(m.f32FromBf16(m.bf16FromF32(1 + 2 ** -8)), 1);
  assert.equal(m.f32FromBf16(m.bf16FromF32(1 + 3 * 2 ** -8)), 1 + 2 ** -6);
  assert.equal(m.f32FromBf16(m.bf16FromF32(70000)), 70144);
  assert.ok(Number.isNaN(m.f32FromBf16(m.bf16FromF32(NaN))));
});

test('FP16: 5 exponent bits overflow above 65504, subnormals lose precision', () => {
  assert.equal(m.f32FromF16(m.f16FromF32(1)), 1);
  assert.equal(m.f32FromF16(m.f16FromF32(65504)), 65504);
  assert.equal(m.f32FromF16(m.f16FromF32(70000)), Infinity);
  assert.equal(m.f32FromF16(m.f16FromF32(0.1)), 0.0999755859375);
  assert.equal(m.f32FromF16(m.f16FromF32(2 ** -24)), 2 ** -24);
  assert.equal(m.f32FromF16(m.f16FromF32(1 + 2 ** -11)), 1, 'tie rounds to even');
  const sub = m.f32FromF16(m.f16FromF32(1e-5));
  assert.ok(Math.abs(sub - 1e-5) / 1e-5 > 1e-3, 'subnormal error is larger than a normal one');
  assert.equal(m.f16FromF32(-0) >>> 15, 1);
});

test('stored value and relative error per format', () => {
  const r = m.storeAll(0.1);
  assert.equal(r.fp16.value, 0.0999755859375);
  assert.equal(r.bf16.value, 0.10009765625);
  assert.ok(r.bf16.rel > r.fp16.rel * 3);
  const third = m.storeAll(1 / 3);
  assert.ok(third.bf16.rel > third.fp16.rel * 7);
  const tiny = m.storeAll(1e-6);
  assert.ok(tiny.fp16.rel > 0.01 && tiny.bf16.rel < 0.004, "FP16 subnormal vs BF16 normal");
  assert.equal(m.storeAll(70000).fp16.value, Infinity);
});

test('symmetric uniform quantization matches the hand example', () => {
  const r = m.quantize([-1, -0.3, 0.2, 1], 4);
  assert.equal(r.Q, 7);
  assert.deepEqual(r.q, [-7, -2, 1, 7]);
  r.xhat.forEach((v, i) => assert.ok(Math.abs(v - [-1, -0.285714, 0.142857, 1][i]) < 1e-6));
  assert.equal(r.mse.toFixed(8), '0.00086735');
  assert.ok(r.maxErr <= r.s / 2 + 1e-12);
  assert.throws(() => m.quantize([1], 1));
});

test('grouping: one outlier coarsens its own group only; cost per weight is b + scale bits / g', () => {
  const x = m.BLOCK.slice(), y = m.withOutlier(x);
  const whole = m.quantizeGroups(y, 4, 16), small = m.quantizeGroups(y, 4, 4), clean = m.quantizeGroups(x, 4, 16);
  assert.ok(whole.mse > clean.mse * 10);
  assert.ok(small.mse < whole.mse / 3);
  assert.ok(whole.zeroed > clean.zeroed);
  assert.equal(m.bitsPerWeight(4, 32, 16), 4.5);
  assert.equal(m.bitsPerWeight(4, 4, 16), 8);
});

test('Strata formats: Q2_0 is 2.25 bits per weight and explains the 1,382,400-byte expert', () => {
  assert.deepEqual(m.FORMATS.map(f => [f.name, m.formatBits(f)]), [['Q2_0', 2.25], ['Q4_0', 4.5], ['Q8_0', 8.5], ['Q8_K', 9.125]]);
  assert.deepEqual([0, 1, 2, 3].map(c => m.q2Decode(c, 0.5)), [-0.5, 0, 0.5, 1]);
  assert.equal(m.EXPERT_PARAMS / 64 * 18, 1382400);
});
