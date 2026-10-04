/* Pure numbers behind the chapter 28 widgets: a week-by-week project plan and the course rubric.
   The plan is a teaching model: one cell of work = one week, no parallel work. */
(function (root) {
  'use strict';
  const FEATURES = ['f1', 'f2', 'f3', 'f4'];
  const STAGES = ['code', 'test', 'wire', 'evidence'];

  // horizontal: finish each stage for every feature before the next stage.
  // vertical: take one feature through all four stages before starting the next.
  // hidden: the first time a feature is wired into the main path, an interface assumption turns out wrong,
  //         and every feature whose code already exists needs one week of rework.
  function plan(strategy, budget, hidden) {
    if (strategy !== 'horizontal' && strategy !== 'vertical') throw new Error('未知的做法：' + strategy);
    if (!Number.isInteger(budget) || budget < 0) throw new Error('周数必须是非负整数');
    const queue = [];
    if (strategy === 'horizontal') STAGES.forEach(s => FEATURES.forEach(f => queue.push({ feature: f, stage: s })));
    else FEATURES.forEach(f => STAGES.forEach(s => queue.push({ feature: f, stage: s })));
    const done = Object.fromEntries(FEATURES.map(f => [f, new Set()]));
    const weeks = [];
    let surprised = false, totalNeeded = 0, firstEvidence = null, reworkAll = 0;
    // Expand the queue once to know the full cost, then cut it at the budget.
    const full = [];
    const coded = new Set();
    for (const task of queue) {
      full.push(task);
      if (task.stage === 'code') coded.add(task.feature);
      if (hidden && !surprised && task.stage === 'wire') {
        surprised = true;
        FEATURES.filter(f => coded.has(f)).forEach(f => { full.push({ feature: f, stage: 'rework' }); reworkAll++; });
      }
    }
    totalNeeded = full.length;
    let rework = 0;
    full.slice(0, budget).forEach((task, i) => {
      weeks.push({ week: i + 1, feature: task.feature, stage: task.stage });
      if (task.stage === 'rework') rework++;
      else done[task.feature].add(task.stage);
      if (task.stage === 'evidence' && firstEvidence === null) firstEvidence = i + 1;
    });
    const status = {};
    FEATURES.forEach(f => { let s = 'none'; for (const st of STAGES) { if (done[f].has(st)) s = st; else break; } status[f] = s; });
    const complete = FEATURES.filter(f => status[f] === 'evidence').length;
    return { strategy, budget, hidden, weeks, status, complete, rework, reworkAll, firstEvidence, totalNeeded };
  }

  /* ---------- the course rubric (100 points) ---------- */
  const RUBRIC = [
    { id: 'theory', max: 20, items: [{ id: 't-formula', pts: 8 }, { id: 't-deps', pts: 6 }, { id: 't-hand', pts: 6 }] },
    { id: 'source', max: 20, items: [{ id: 's-pin', pts: 8 }, { id: 's-history', pts: 6 }, { id: 's-contract', pts: 6 }] },
    { id: 'impl', max: 25, items: [{ id: 'i-run', pts: 7 }, { id: 'i-oracle', pts: 6 }, { id: 'i-mutant', pts: 6 }, { id: 'i-edge', pts: 6 }] },
    { id: 'experiment', max: 20, items: [{ id: 'x-ab', pts: 6 }, { id: 'x-raw', pts: 5 }, { id: 'x-gate', pts: 5 }, { id: 'x-fail', pts: 4 }] },
    { id: 'expr', max: 15, items: [{ id: 'e-env', pts: 5 }, { id: 'e-repro', pts: 5 }, { id: 'e-limits', pts: 5 }] },
  ];
  const RED_LINES = { simAsReal: 'experiment', stateLeak: 'impl' };

  // checked: Set of item ids; red: Set of red-line ids. A red line sets its dimension to zero.
  function score(checked, red) {
    const known = new Set(RUBRIC.flatMap(d => d.items.map(i => i.id)));
    for (const id of checked) if (!known.has(id)) throw new Error('未知的评分项：' + id);
    const zeroed = new Set([...red].map(r => RED_LINES[r]).filter(Boolean));
    const byDim = RUBRIC.map(d => {
      const raw = d.items.filter(i => checked.has(i.id)).reduce((a, i) => a + i.pts, 0);
      return { id: d.id, max: d.max, raw, got: zeroed.has(d.id) ? 0 : raw, zeroed: zeroed.has(d.id) };
    });
    const total = byDim.reduce((a, d) => a + d.got, 0);
    // Weakest: lowest share of its points; ties go to the dimension with more points at stake.
    const weakest = [...byDim].sort((a, b) => a.got / a.max - b.got / b.max || b.max - a.max)[0].id;
    return { byDim, total, weakest };
  }

  const api = { FEATURES, STAGES, plan, RUBRIC, RED_LINES, score };
  root.VizMath = root.VizMath || {};
  root.VizMath.project = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
