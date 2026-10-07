'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/17-kv.math.js');

test('bytes per cell follow the pinned KV formats', () => {
  assert.equal(m.CELL_BYTES.f16, 2 * 256 * 2 * 2);              // 2 heads × 256 × (K, V) × 2 B
  assert.equal(m.CELL_BYTES.int8, 1024 + 32);                   // kv_q8.hpp: codes + one fp16 scale per 64
  assert.equal(m.CELL_BYTES.q4, 576);                           // kv_q4.hpp: 144 B per head, K and V
  assert.equal(m.CELL_BYTES.k8v4, 528 + 288);                   // INT8 K + Q4_0 V
  assert.equal(m.perToken('f16'), 24576);
  assert.equal(m.perToken('int8'), 12672);                      // kv_q8.hpp: "12,672 B/token instead of 24,576"
  assert.equal(m.perToken('q4'), 6912);
  assert.equal(Math.round((1 - m.perToken('k8v4') / m.perToken('int8')) * 100), 23);   // upstream: 23% less
  assert.throws(() => m.perToken('fp8'));
});

test('GB and GiB name different byte counts', () => {
  const b = m.perToken('f16') * 32768;
  assert.equal(b, 805306368);
  assert.equal(m.units(b).mib, 768);
  assert.equal(m.units(b).mb.toFixed(1), '805.3');
  assert.equal(m.units(m.perToken('f16') * 131072).gib, 3);
  assert.equal(m.units(m.perToken('f16') * 262144).gb.toFixed(2), '6.44');
  assert.equal(m.units(m.perToken('int8') * 262144).gb.toFixed(2), '3.32');
  assert.equal(((2 ** 30 / 1e9 - 1) * 100).toFixed(1), '7.4');
});

test('GDN state is fixed per conversation', () => {
  assert.equal(m.GDN_STATE_BYTES, 36 * (128 * 48 * 128 + 10240 * 3) * 4);
  assert.equal(m.units(m.GDN_STATE_BYTES).mib.toFixed(1), '112.2');
});

test('budget splits VRAM and RAM; streaming from 64K, K8V4 included (v0.1.40, #711)', () => {
  const short = m.budget({ ctx: 32768, sessions: 1, fmt: 'int8', streaming: true });
  assert.equal(short.streams, false);
  assert.equal(short.vramKv, 12672 * 32768);
  assert.equal(short.ramKv, 0);
  const long = m.budget({ ctx: 262144, sessions: 1, fmt: 'int8', streaming: true });
  assert.equal(long.streams, true);
  assert.equal(long.vramKv, 12672 * 32768);
  assert.equal(long.ramKv, 12672 * 262144);
  assert.equal(long.vram, long.vramKv + m.GDN_STATE_BYTES);
  const hybrid = m.budget({ ctx: 262144, sessions: 1, fmt: 'k8v4', streaming: true });   // DETAILS.md: K8V4 streams too
  assert.equal(hybrid.streams, true);
  assert.equal(hybrid.vramKv, 9792 * 32768);
  assert.equal(hybrid.ramKv, 9792 * 262144);
  assert.equal('blocked' in hybrid, false);
  const parked = m.budget({ ctx: 131072, sessions: 3, fmt: 'int8', streaming: false });
  assert.equal(parked.parked, 2 * (12672 * 131072 + m.GDN_STATE_BYTES));
  assert.equal(parked.ram, parked.parked);
  assert.throws(() => m.budget({ ctx: 0, sessions: 1, fmt: 'int8', streaming: false }));
  assert.throws(() => m.budget({ ctx: 1024, sessions: 0, fmt: 'int8', streaming: false }));
});

test('CLOCK resolve: hits set the reference bit, misses take a second-chance victim', () => {
  const s = m.pagingState(8, 3);
  let r = m.resolve(s, [0, 1, 2]);
  assert.deepEqual(r.misses.map(x => x.block), [0, 1, 2]);
  assert.deepEqual(s.slotBlock, [0, 1, 2]);
  r = m.resolve(s, [1]);
  assert.deepEqual(r.hits, [1]);
  r = m.resolve(s, [3]);                       // every ref bit is set: the sweep clears them, then evicts slot 0
  assert.deepEqual(r.misses, [{ block: 3, slot: 0, evicted: 0 }]);
  assert.equal(s.table[0], -1);
  assert.equal(s.table[3], 0);
  r = m.resolve(s, [3, 4]);                     // block 3 is a hit; 4 may not evict the slot this call uses
  assert.deepEqual(r.hits, [3]);
  assert.notEqual(r.misses[0].slot, 0);
  assert.throws(() => m.resolve(s, [0, 1, 2, 4]));   // more blocks than slots
});

test('the K8V4 streaming tip names the v0.1.40 token loss and its v0.1.40.2 fix (#1188)', () => {
  require('../src/viz/core.js');
  require('../src/viz/17-kv.js');
  const t = globalThis.Viz.tables.find(x => x.zh && x.zh.code === 'KV_BUDGET');
  assert.ok(t, 'the KV_BUDGET table is registered');
  const tip = t.zh.try.find(s => s.includes('K8V4'));
  assert.ok(tip, 'a zh tip covers K8V4 with streaming');
  assert.match(tip, /v0\.1\.40\.2/);
  assert.match(tip, /丢 token/);
});
