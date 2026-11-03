'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const m = require('../src/viz/ds-attention-state.math.js');

test('constants match the page: 128-row window, 512 picked rows, row sizes, 40 layers', () => {
  assert.equal(m.WINDOW, 128);
  assert.equal(m.TOPK, 512);
  assert.equal(m.HEADS, 64);
  assert.equal(m.LAYERS, 40);
  assert.equal(m.RING_ROW_BYTES, 528);   // 512 FP8 codes + 512 / 32 scales
  assert.equal(m.COMP_ROW_BYTES, 288);   // 256 FP4 bytes + 512 / 16 scales
  assert.equal(m.INDEX_KEY_BYTES, 80);   // 64 + 4 padded to a multiple of 16
  assert.equal(m.ringBytesPerLayer(), 67584);
  assert.equal(m.ringBytesTotal(), 2703360);
  assert.equal(m.MAX_ROWS_PER_LAYER, 640);
  assert.equal(m.stepBytesPerLayer(), 215040);
  assert.equal(m.stepBytesPerLayer() * m.LAYERS, 8601600);
});

test('compressed rows n = floor(L / R); R = 0 has none', () => {
  assert.equal(m.compressedRows(8192, 1), 8192);
  assert.equal(m.compressedRows(8192, 4), 2048);
  assert.equal(m.compressedRows(10, 4), 2);
  assert.equal(m.compressedRows(3, 4), 0);
  assert.equal(m.compressedRows(8192, 0), 0);
});

test('window is min(128, L); picked rows are min(512, n)', () => {
  assert.equal(m.windowRows(1), 1);
  assert.equal(m.windowRows(127), 127);
  assert.equal(m.windowRows(128), 128);
  assert.equal(m.windowRows(1048576), 128);
  assert.equal(m.pickedRows(0), 0);
  assert.equal(m.pickedRows(300), 300);
  assert.equal(m.pickedRows(512), 512);
  assert.equal(m.pickedRows(513), 512);
});

test('rows read per layer follow the figure DS3-4 table (R = 1)', () => {
  const rows = [[300, 128, 300, 300, 428], [8192, 128, 8192, 512, 640], [262144, 128, 262144, 512, 640], [1048576, 128, 1048576, 512, 640]];
  for (const [L, win, n, pick, total] of rows) {
    const r = m.readState(L, 1);
    assert.deepEqual([r.window, r.n, r.picked, r.total], [win, n, pick, total], 'L = ' + L);
  }
});

test('rows read never exceed 640, for any L and R', () => {
  for (const R of [0, 1, 2, 4, 128]) for (const L of [1, 127, 128, 129, 640, 100000, 1048576]) {
    const r = m.readState(L, R);
    assert.ok(r.total <= 640, `L=${L} R=${R}`);
    assert.equal(r.total, r.window + r.picked);
  }
  assert.equal(m.readState(8192, 0).total, 128);   // R = 0: window only
  assert.equal(m.readState(8192, 0).picked, 0);
  assert.equal(m.readState(8192, 4).picked, 512);
  assert.equal(m.readState(1000, 4).picked, 250);
});

test('indexer scan grows with n, bytes and multiply-adds', () => {
  const s = m.indexerScan(8192, 1);
  assert.equal(s.rows, 8192);
  assert.equal(s.keyBytes, 8192 * 80);
  assert.equal(s.macs, 8192 * 32 * 128);
  assert.equal(m.indexerScan(1048576, 1).keyBytes, 83886080);   // 80 MiB, page 3.4
  assert.equal(m.indexerScan(1048576, 0).rows, 0);
});

test('state a token keeps: ring is fixed, source layer is linear, naive is 40 layers per position', () => {
  const MiB = 1048576, GiB = 1073741824;
  const s = L => m.keptState(L, 1);
  // page 3.5 table
  assert.equal((s(8192).naiveBytes / MiB).toFixed(0), '165');
  assert.equal((s(32768).naiveBytes / MiB).toFixed(0), '660');
  assert.equal((s(262144).naiveBytes / GiB).toFixed(2), '5.16');
  assert.equal((s(1048576).naiveBytes / GiB).toFixed(1), '20.6');
  assert.equal((s(8192).sourceBytes / MiB).toFixed(2), '2.88');
  assert.equal((s(32768).sourceBytes / MiB).toFixed(1), '11.5');
  assert.equal((s(262144).sourceBytes / MiB).toFixed(1), '92.0');
  assert.equal((s(1048576).sourceBytes / MiB).toFixed(0), '368');
  for (const L of [8192, 1048576]) assert.equal((s(L).ringBytes / MiB).toFixed(2), '2.58');
  assert.equal(s(8192).sourceRows, 8193);
  assert.equal(m.keptState(8192, 4).sourceRows, 2049);
  assert.equal(m.keptState(8192, 4).sourceBytes, 2049 * 368);
  // R = 0: no compressed rows, only the ring
  const z = m.keptState(8192, 0);
  assert.equal(z.sourceRows, 0);
  assert.equal(z.sourceBytes, 0);
  assert.equal(z.ringBytes, 2703360);
});

test('prompt scoring pairs: exact sum, L(L+1)/2 for R = 1', () => {
  assert.equal(m.promptPairs(1, 1), 1);
  assert.equal(m.promptPairs(8192, 1), 8192 * 8193 / 2);
  assert.ok(Math.abs(m.promptPairs(8192, 1) / 3.4e7 - 1) < 0.02);
  assert.ok(Math.abs(m.promptPairs(262144, 1) / 3.4e10 - 1) < 0.02);
  assert.ok(Math.abs(m.promptPairs(1048576, 1) / 5.5e11 - 1) < 0.01);
  assert.equal(m.promptPairs(8, 4), 0 + 0 + 0 + 1 + 1 + 1 + 1 + 2);   // floor(p/4), p = 1..8
  assert.equal(m.promptPairs(100, 0), 0);
});

test('picked positions are deterministic, distinct and in range', () => {
  const a = m.pickPositions(8192, 512), b = m.pickPositions(8192, 512);
  assert.deepEqual(a, b);
  assert.equal(a.length, 512);
  assert.equal(new Set(a).size, 512);
  assert.ok(a.every(i => Number.isInteger(i) && i >= 0 && i < 8192));
  assert.deepEqual(m.pickPositions(300, 300), Array.from({ length: 300 }, (_, i) => i));   // all picked
  assert.deepEqual(m.pickPositions(0, 0), []);
});

test('invalid input is rejected', () => {
  assert.throws(() => m.readState(0, 1));
  assert.throws(() => m.readState(-5, 1));
  assert.throws(() => m.readState(1.5, 1));
  assert.throws(() => m.readState(NaN, 1));
  assert.throws(() => m.readState(1048577, 1));
  assert.throws(() => m.readState(8192, -1));
  assert.throws(() => m.readState(8192, 1.5));
  assert.throws(() => m.compressedRows(8192, 'x'));
  assert.throws(() => m.keptState(0, 1));
  assert.throws(() => m.pickPositions(10, 11));
});

test('the default state (L = 8,192, R = 1) matches the static figure on the page', () => {
  const html = fs.readFileSync(path.join(__dirname, '../content/columns/deepseek/attention.html'), 'utf8');
  const i = html.indexOf('data-viz="ds-attention-state"');
  const fig = html.slice(i, html.indexOf('</figure>', i));
  const d = m.DEFAULTS;
  assert.deepEqual([d.ctx, d.R], [8192, 1]);
  const r = m.readState(d.ctx, d.R);
  assert.deepEqual([r.window, r.n, r.picked, r.total], [128, 8192, 512, 640]);
  assert.ok(fig.includes('上下文 8,192'), 'figure default context');
  assert.ok(fig.includes('R = 1'), 'figure default R');
  assert.ok(fig.includes('共 640 行'), 'figure total rows');
  assert.ok(fig.includes('≤ 128 + 512 = 640'), 'figure cap');
  // every row of the figure table, as "ctx window n picked total"
  for (const L of [8192, 262144, 1048576]) {
    const x = m.readState(L, 1), fmt = n => n.toLocaleString('en-US');
    for (const v of [x.window, x.n, x.picked, x.total]) assert.ok(fig.includes('>' + fmt(v) + '<'), `figure shows ${fmt(v)} for L = ${L}`);
  }
});
