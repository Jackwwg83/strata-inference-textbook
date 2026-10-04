'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/19-draft.math.js');

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('cost model reproduces CostModel::step_ms with the pinned defaults', () => {
  const s0 = m.stepMs(0);
  near(s0.dense, 11);
  near(s0.cpu, 0.45 * 15.8);
  near(s0.sync, 2.4);
  near(s0.draft, 0);
  assert.equal(s0.total.toFixed(2), '20.51');
  const s3 = m.stepMs(3);
  near(s3.dense, 11 * 1.45);
  // n = 4 tokens, U = 2.88 distinct-expert units, each expert used 4 / 2.88 times
  near(s3.cpu, 0.45 * 15.8 * 2.88 * (1 + 0.25 * (4 / 2.88 - 1)));
  near(s3.draft, 3 * 1.2);
  assert.equal(s3.total.toFixed(2), '44.42');
  assert.equal(m.stepMs(8).total.toFixed(2), '92.03');
  assert.equal(m.stepMs(12).total, m.stepMs(8).total, 'k is clamped to K_MAX like std::clamp');
  assert.throws(() => m.stepMs(-1));
  assert.throws(() => m.stepMs(1.5));
});

test('expected tokens: conditional product sum, geometric closed form, edge cases', () => {
  near(m.expected([0.8, 0.6, 0.5], 3), 2.52);
  near(m.expected(0.86, 3), 1 + 0.86 + 0.86 ** 2 + 0.86 ** 3);
  near(m.geometric(0.86, 3), m.expected(0.86, 3), 1e-12);
  near(m.geometric(0.5, 0), 1);
  assert.equal(m.expected(1, 5), 6);
  assert.equal(m.geometric(1, 5), 6);
  assert.equal(m.expected(0, 5), 1);
  assert.throws(() => m.expected(1.2, 2));
  assert.throws(() => m.expected([0.5], 2), 'array shorter than k');
});

test('choose maximizes tokens per ms and keeps k = 0 below the 5% margin', () => {
  const c = m.choose(0.86);
  assert.equal(c.k, 3);
  assert.equal(c.rate.toFixed(1), '72.8');
  assert.equal(c.baseline.toFixed(1), '48.8');
  assert.equal(c.rows.length, 9);
  assert.equal(m.choose(0).k, 0, 'p = 0: drafts only add cost');
  assert.equal(m.choose(1).k, 8, 'p = 1 with these costs: the widest window wins');
  assert.equal(m.choose(0.5).k, 1);
  const low = m.choose(0.4);
  assert.ok(low.rows[1].rate > low.baseline, 'k = 1 is a little faster than plain decoding');
  assert.equal(low.bestK, 1);
  assert.equal(low.k, 0, 'but not 5% faster, so the controller stays at k = 0');
  assert.equal(m.choose(0.4, m.DEFAULT_COST, 0).k, 1, 'without the margin it would draft');
  // controller_test.cpp's 'cheap wide verify': dense cost barely grows with width, 95% of experts in VRAM
  const flat = [1.0, 1.02, 1.04, 1.06, 1.08, 1.1, 1.12, 1.14, 1.16];
  const cheap = m.choose(0.86, { ...m.DEFAULT_COST, hitRate: 0.95, denseRatio: flat });
  assert.ok(cheap.k > 3, 'a cheaper wide verify pays for a longer window');
  assert.equal(m.choose(0.86, { ...m.DEFAULT_COST, mtpDraftMs: 5 }).k, 1, 'slower drafts shorten the window');
  const pricey = m.choose(0.86, { ...m.DEFAULT_COST, mtpDraftMs: 20 });
  assert.equal(pricey.k, 0, 'expensive drafts fall back to plain decoding');
});

test('EMA step and censored observation follow Controller::observe', () => {
  near(m.ema(0.86, 1, 0.05), 0.867);
  near(m.ema(0.5, 0, 1), 0);
  assert.throws(() => m.ema(0.5, 1, 1.5));
  assert.equal(m.halfLife(0.05).toFixed(1), '13.5');
  assert.equal(m.halfLife(0.5), 1);
  assert.throws(() => m.halfLife(0));
  assert.equal(m.emaNoise(0.05, 0.86).toFixed(3), '0.056');
  assert.equal(m.emaNoise(1, 0.5), 0.5, 'alpha = 1 keeps only the last 0/1 outcome');
  assert.equal(m.emaNoise(0.3, 1), 0);
  const prior = Array(8).fill(0.86);
  const c = m.observe(prior, 3, 1, 0.05, 'censored');
  near(c[0], 0.867);
  near(c[1], 0.817);
  near(c[2], 0.86, 1e-12);
  assert.deepEqual(prior, Array(8).fill(0.86), 'observe does not mutate its input');
  const n = m.observe(prior, 3, 1, 0.05, 'naive');
  near(n[2], 0.817);
  const all = m.observe(prior, 3, 3, 0.05, 'censored');
  near(all[2], 0.867);
  near(all[3], 0.86 + 0.05 * (0.867 - 0.86));
  near(all[7], all[3]);
  assert.deepEqual(m.observe(prior, 0, 0, 0.05), prior, 'k = 0 is not an observation');
});

test('simulation is deterministic, tracks the switch and shows the bias of the naive update', () => {
  const opts = { rounds: 300, switchAt: 150, pBefore: 0.86, pAfter: 0.6, alpha: 0.05, seed: 7 };
  const a = m.simulate(opts), b = m.simulate(opts);
  assert.deepEqual(a.k, b.k);
  assert.equal(a.k.length, 300);
  assert.equal(a.est.length, 300);
  assert.equal(a.truth[0], 0.86);
  assert.equal(a.truth[299], 0.6);
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const late = a.est.slice(250).map(e => e[0]);
  assert.ok(Math.abs(mean(late) - 0.6) < 0.1, 'estimate of p1 settles near the new rate');
  assert.ok(mean(a.k.slice(0, 150)) > mean(a.k.slice(200)), 'the window shrinks after the switch');
  const naive = m.simulate({ ...opts, mode: 'naive' });
  assert.ok(mean(naive.k.slice(0, 150)) < mean(a.k.slice(0, 150)), 'counting unobserved positions as failures shrinks the window');
  near(a.tokens, a.accepted.reduce((s, x) => s + x + 1, 0));
  assert.ok(a.ms > 0 && a.rate > 0);
});

test('a large alpha can switch drafting off, and then the estimate freezes', () => {
  const r = m.simulate({ rounds: 300, switchAt: 100, pBefore: 0.86, pAfter: 0.5, alpha: 0.4, seed: 3 });
  const first = r.k.findIndex((k, i) => i >= 100 && k === 0);
  assert.ok(first > 0, 'noise pushes the estimate under the threshold');
  for (let i = first; i < 300; i++) assert.equal(r.k[i], 0, 'no drafts, no observations, no recovery');
  assert.deepEqual(r.est[299], r.est[first]);
});

test('fixed window: the censored estimate finds p, the naive one finds a product of rates', () => {
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const opts = { rounds: 600, switchAt: 600, pBefore: 0.86, alpha: 0.05, seed: 3, window: 3 };
  const good = m.simulate(opts), bad = m.simulate({ ...opts, mode: 'naive' });
  assert.ok(good.k.every(k => k === 3));
  const p3 = (r) => mean(r.est.slice(300).map(e => e[2]));
  assert.ok(Math.abs(p3(good) - 0.86) < 0.06, 'third position: about 0.86');
  assert.ok(Math.abs(p3(bad) - 0.86 ** 3) < 0.08, 'naive third position: about 0.86^3 = 0.64');
  assert.ok(mean(bad.suggested.slice(300)) < mean(good.suggested.slice(300)), 'the biased estimate suggests a shorter window');
  assert.throws(() => m.simulate({ window: -2 }));
});
