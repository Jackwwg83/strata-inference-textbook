/* Pure functions behind the chapter 25 widgets: FIFO / SJF / round-robin on the same arrivals, M/M/1 queueing,
   and two teaching estimates for multi-sequence serving. A design exercise: by default upstream Strata serves one
   sequence at a time behind a FIFO (serve/server.py); its opt-in batch slots (since v0.1.39; checked at v0.1.41, fb58e0d, docs/BATCHING.md) are not
   modelled here, and nothing here describes an upstream scheduler. */
(function (root) {
  'use strict';

  const PRESETS = {
    convoy: [{ id: 'A', arrive: 0, len: 8 }, { id: 'B', arrive: 1, len: 2 }, { id: 'C', arrive: 2, len: 3 }, { id: 'D', arrive: 3, len: 1 }],
    same: [{ id: 'A', arrive: 0, len: 8 }, { id: 'B', arrive: 0, len: 3 }, { id: 'C', arrive: 0, len: 5 }],
    starve: [{ id: 'B', arrive: 0, len: 2 }, { id: 'A', arrive: 1, len: 6 }, { id: 'C', arrive: 2, len: 2 }, { id: 'D', arrive: 4, len: 2 }, { id: 'E', arrive: 6, len: 2 }],
  };

  // One time unit = the time to generate one token. Returns segments, per-job figures and averages.
  function simulate(jobs, policy, { quantum = 1, switchCost = 0 } = {}) {
    if (!Array.isArray(jobs) || !jobs.length) throw new Error('至少要有一个请求');
    if (!['fifo', 'sjf', 'rr'].includes(policy)) throw new Error('未知调度策略 ' + policy);
    if (!(Number.isInteger(quantum) && quantum >= 1)) throw new Error('时间片必须是正整数');
    for (const j of jobs) if (!(Number.isInteger(j.len) && j.len >= 1 && Number.isInteger(j.arrive) && j.arrive >= 0)) throw new Error('请求长度和到达时间必须是非负整数，长度至少 1');
    const order = jobs.map((j, i) => ({ ...j, i })).sort((a, b) => a.arrive - b.arrive || a.i - b.i);
    const rem = new Map(jobs.map(j => [j.id, j.len])), first = new Map(), finish = new Map();
    const segments = [], decisions = [];
    let t = 0, next = 0, last = null, switches = 0, idle = 0;
    const ready = [];
    const admit = upTo => { while (next < order.length && order[next].arrive <= upTo) ready.push(order[next++]); };
    admit(0);
    while (ready.length || next < order.length) {
      if (!ready.length) { idle += order[next].arrive - t; t = order[next].arrive; admit(t); }
      let k = 0;
      if (policy === 'sjf') ready.forEach((j, i) => { const b = ready[k]; if (j.len < b.len || (j.len === b.len && (j.arrive < b.arrive || (j.arrive === b.arrive && j.i < b.i)))) k = i; });
      const job = ready.splice(k, 1)[0];
      decisions.push({ t, job: job.id, waiting: ready.map(j => j.id) });
      if (last !== null && last !== job.id && switchCost > 0) { segments.push({ job: null, start: t, end: t + switchCost }); t += switchCost; }
      if (last !== null && last !== job.id) switches++;
      const n = policy === 'rr' ? Math.min(quantum, rem.get(job.id)) : rem.get(job.id);
      if (!first.has(job.id)) first.set(job.id, t + 1);
      const prev = segments[segments.length - 1];
      if (prev && prev.job === job.id && prev.end === t) prev.end = t + n; else segments.push({ job: job.id, start: t, end: t + n });
      t += n;
      rem.set(job.id, rem.get(job.id) - n);
      last = job.id;
      admit(t);
      if (rem.get(job.id) === 0) finish.set(job.id, t); else ready.push(job);
    }
    const out = jobs.map(j => {
      const f = finish.get(j.id), ft = first.get(j.id);
      return { id: j.id, arrive: j.arrive, len: j.len, firstToken: ft, finish: f, wait: f - j.arrive - j.len, turnaround: f - j.arrive, first: ft - j.arrive };
    });
    const avg = k => out.reduce((a, j) => a + j[k], 0) / out.length;
    return { segments, decisions, jobs: out, avgWait: avg('wait'), avgTurnaround: avg('turnaround'), avgFirst: avg('first'), makespan: t, switches, idle };
  }

  // M/M/1 queue: arrival rate lambda, service rate mu (same time unit). W, Wq in that unit.
  function mm1(lambda, mu) {
    if (!(lambda >= 0 && mu > 0)) throw new Error('到达率和服务率必须为正');
    const rho = lambda / mu;
    if (rho >= 1) throw new Error('利用率 ρ 必须小于 1，否则队伍会无限变长');
    const W = 1 / (mu - lambda), Wq = rho / (mu - lambda);
    return { rho, W, Wq, L: rho / (1 - rho), Lq: rho * rho / (1 - rho) };
  }

  // Seeded simulation of n customers through one FIFO server with exponential gaps and service times.
  function simulateMM1(lambda, mu, n, seed) {
    let s = seed >>> 0;
    const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const exp = rate => -Math.log(1 - rnd()) / rate;
    let arrive = 0, free = 0, sumW = 0, sumWq = 0, maxQ = 0;
    const ends = [];
    for (let i = 0; i < n; i++) {
      arrive += exp(lambda);
      const start = Math.max(arrive, free), end = start + exp(mu);
      while (ends.length && ends[0] <= arrive) ends.shift();
      maxQ = Math.max(maxQ, ends.length);
      ends.push(end);
      free = end; sumW += end - arrive; sumWq += start - arrive;
    }
    return { W: sumW / n, Wq: sumWq / n, maxInSystem: maxQ + 1 };
  }

  // Expected distinct experts one layer touches when B sequences each pick k of n uniformly (teaching model).
  const distinctExperts = (B, k = 10, n = 512) => n * (1 - Math.pow(1 - k / n, B));
  // GiB for N active sequences: shared weights and caches once, per-sequence state N times (teaching numbers).
  const budget = (N, { shared = 20, perSeq = 2, scratch = 2, reserve = 2 } = {}) => shared + N * perSeq + scratch + reserve;

  const api = { PRESETS, simulate, mm1, simulateMM1, distinctExperts, budget };
  root.VizMath = root.VizMath || {};
  root.VizMath.sched = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
