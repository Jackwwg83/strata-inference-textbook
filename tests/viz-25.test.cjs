'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/25-sched.math.js');

const same = [{ id: 'A', arrive: 0, len: 8 }, { id: 'B', arrive: 0, len: 3 }, { id: 'C', arrive: 0, len: 5 }];
const byId = (r, k) => Object.fromEntries(r.jobs.map(j => [j.id, j[k]]));

test('FIFO on jobs that arrive together: the old textbook example', () => {
  const r = m.simulate(same, 'fifo');
  assert.deepEqual(byId(r, 'finish'), { A: 8, B: 11, C: 16 });
  assert.deepEqual(byId(r, 'firstToken'), { A: 1, B: 9, C: 12 });
  assert.deepEqual(byId(r, 'wait'), { A: 0, B: 8, C: 11 });
  assert.equal(r.avgWait.toFixed(2), '6.33');
  assert.equal(r.makespan, 16);
  assert.equal(r.switches, 2);
});

test('SJF runs the shortest ready job first', () => {
  const r = m.simulate(same, 'sjf');
  assert.deepEqual(byId(r, 'finish'), { B: 3, C: 8, A: 16 });
  assert.equal(r.avgWait.toFixed(2), '3.67');
  assert.equal(r.makespan, 16, 'reordering does not change the total work');
});

test('round robin with quantum 1 gives every job an early first token', () => {
  const r = m.simulate(same, 'rr', { quantum: 1 });
  assert.deepEqual(byId(r, 'firstToken'), { A: 1, B: 2, C: 3 });
  assert.deepEqual(byId(r, 'finish'), { A: 16, B: 8, C: 13 });
  assert.equal(r.makespan, 16);
  assert.ok(r.switches > 10);
});

test('round robin with a large quantum becomes FIFO', () => {
  const a = m.simulate(same, 'rr', { quantum: 99 }), b = m.simulate(same, 'fifo');
  assert.deepEqual(byId(a, 'finish'), byId(b, 'finish'));
});

test('switch cost is paid on every change of job and lengthens the schedule', () => {
  const r = m.simulate(same, 'rr', { quantum: 1, switchCost: 1 });
  assert.equal(r.makespan, 16 + r.switches);
  assert.equal(m.simulate(same, 'fifo', { switchCost: 1 }).makespan, 18);
});

test('arrivals: new jobs wait for their arrival, idle gaps are skipped, RR queues arrivals before the preempted job', () => {
  const jobs = [{ id: 'A', arrive: 0, len: 2 }, { id: 'B', arrive: 5, len: 1 }];
  const r = m.simulate(jobs, 'fifo');
  assert.deepEqual(byId(r, 'finish'), { A: 2, B: 6 });
  assert.equal(r.idle, 3);
  const rr = m.simulate([{ id: 'A', arrive: 0, len: 3 }, { id: 'B', arrive: 1, len: 1 }], 'rr', { quantum: 1 });
  assert.deepEqual(rr.segments.map(s => s.job), ['A', 'B', 'A']);
});

test('convoy preset: FIFO makes short jobs wait behind the long one', () => {
  const p = m.PRESETS.convoy;
  const f = m.simulate(p, 'fifo'), s = m.simulate(p, 'sjf');
  assert.ok(f.avgWait > s.avgWait);
  assert.ok(m.simulate(p, 'rr', { quantum: 1 }).avgFirst < f.avgFirst);
});

test('starve preset: SJF keeps pushing the long job back', () => {
  const p = m.PRESETS.starve;
  const s = m.simulate(p, 'sjf'), f = m.simulate(p, 'fifo');
  const a = j => j.jobs.find(x => x.id === 'A');
  assert.ok(a(s).wait > a(f).wait);
  assert.equal(a(s).finish, s.makespan, 'A finishes last under SJF');
});

test('bad input is rejected', () => {
  assert.throws(() => m.simulate([], 'fifo'));
  assert.throws(() => m.simulate(same, 'lottery'));
  assert.throws(() => m.simulate([{ id: 'A', arrive: 0, len: 0 }], 'fifo'));
  assert.throws(() => m.simulate(same, 'rr', { quantum: 0 }));
});

test('M/M/1 formulas and Little law', () => {
  const q = m.mm1(3, 6);
  assert.equal(q.rho, 0.5);
  assert.equal(q.W, 1 / 3);
  assert.equal(q.Wq, 0.5 / 3);
  assert.equal(q.L, 1);
  assert.ok(Math.abs(q.L - 3 * q.W) < 1e-12, 'L = lambda W');
  assert.equal(Math.round(m.mm1(4.8, 6).W * 60), 50);
  assert.equal(Math.round(m.mm1(5.7, 6).W * 60), 200);
  assert.throws(() => m.mm1(6, 6));
});

test('seeded M/M/1 simulation is reproducible and close to the formula', () => {
  const a = m.simulateMM1(4.8, 6, 20000, 42), b = m.simulateMM1(4.8, 6, 20000, 42);
  assert.equal(a.W, b.W);
  const W = m.mm1(4.8, 6).W;
  assert.ok(Math.abs(a.W - W) / W < 0.1, `simulated ${a.W} vs ${W}`);
});

test('expected distinct experts per layer for a batch, and the memory budget', () => {
  assert.equal(m.distinctExperts(1), 10);
  assert.equal(m.distinctExperts(4).toFixed(1), '38.8');
  assert.equal(m.distinctExperts(32).toFixed(1), '239.6');
  assert.equal(m.budget(5), 34);
  assert.equal(m.budget(1), 26);
});

test('the scheduler widget calls one request at a time the default, not the only mode (Strata v0.1.39)', () => {
  require('../src/viz/core.js');
  require('../src/viz/25-sched.js');
  const t = globalThis.Viz.tables.find(x => x.zh && x.zh.code === 'SCHED_RACE');
  assert.ok(t, 'the SCHED_RACE table is registered');
  assert.match(t.zh.intro, /默认/);
  assert.doesNotMatch(t.zh.intro, /只能服务一个请求/);
});
