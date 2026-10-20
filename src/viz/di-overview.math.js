/* Pure data behind the DeepInfer overview widget: the blocks of DeepSeek's production
   inference system, whether each one ships in the open-source release, and the order a
   request visits them. Teaching model, not DeepInfer code.
   Blocks and arrows follow doc/images/architecture_overview.png and doc/inference_deployment_qa.md
   at DeepInfer 774ce244; release status follows README.md L38-L42 and the repository tree. */
(function (root) {
  'use strict';
  // open: the code is in this release. partial: the engine code is in, the glue that runs it as a
  // separate service is not. separate: published in another repository. closed: described only.
  const STATUS = ['open', 'partial', 'separate', 'closed'];
  const PAGES = ['overview', 'wide-ep', 'pd-kv', 'spec-sched', 'determinism'];

  // kind 'lb' marks the four load balancers that the Q&A doc names (L33).
  const BLOCKS = [
    { id: 'recipe', kind: 'io', status: 'separate', page: 'overview', chapters: ['23'] },
    { id: 'entry', kind: 'io', status: 'closed', page: 'pd-kv', chapters: ['23', '25'] },
    { id: 'vlb', kind: 'lb', status: 'closed', page: 'wide-ep', chapters: ['25'] },
    { id: 'plb', kind: 'lb', status: 'closed', page: 'wide-ep', chapters: ['16', '25'] },
    { id: 'dlb', kind: 'lb', status: 'closed', page: 'wide-ep', chapters: ['17', '25'] },
    { id: 've', kind: 'service', status: 'partial', page: 'pd-kv', chapters: ['20'] },
    { id: 'prefill', kind: 'service', status: 'partial', page: 'pd-kv', chapters: ['16', '21'] },
    { id: 'decode', kind: 'service', status: 'partial', page: 'spec-sched', chapters: ['18', '25'] },
    { id: 'eplb', kind: 'lb', status: 'open', page: 'wide-ep', chapters: ['10', '12'] },
    { id: 'kv', kind: 'storage', status: 'closed', page: 'pd-kv', chapters: ['17', '20'] },
  ];

  // One request, step by step: the blocks that are active in each step.
  // Step IMAGE_STEP (the vision encoder) only happens when the request carries images.
  const PATH = [
    ['recipe'],
    ['entry', 'kv'],
    ['plb'],
    ['vlb', 've'],
    ['prefill', 'kv', 'eplb'],
    ['dlb', 'decode'],
    ['decode', 'eplb', 'kv'],
    ['entry', 'recipe'],
  ];

  const IMAGE_STEP = 3;

  const byId = id => BLOCKS.find(b => b.id === id);

  function countByStatus(blocks = BLOCKS) {
    const out = Object.fromEntries(STATUS.map(s => [s, 0]));
    for (const b of blocks) {
      if (!(b.status in out)) throw new Error('unknown status ' + b.status);
      out[b.status]++;
    }
    return out;
  }

  // Load balancers whose code is in this release, out of all load balancers.
  function balancersOpen(blocks = BLOCKS) {
    const lbs = blocks.filter(b => b.kind === 'lb');
    return { open: lbs.filter(b => b.status === 'open').length, total: lbs.length };
  }

  // Distinct blocks a request touches, in first-visit order. A text-only request skips the image step.
  function visited(path = PATH, { images = true } = {}) {
    const seen = [];
    path.forEach((step, i) => { if (images || i !== IMAGE_STEP) for (const id of step) if (!seen.includes(id)) seen.push(id); });
    return seen;
  }

  const api = { STATUS, PAGES, BLOCKS, PATH, IMAGE_STEP, byId, countByStatus, balancersOpen, visited };
  root.VizMath = root.VizMath || {};
  root.VizMath.diOverview = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
