/* Pure numbers behind the chapter 15 widgets. Teaching model, not a Strata measurement.
   The step-buffer layout follows include/strata/kernels/qsa.hpp at the pinned commit. */
(function (root) {
  'use strict';
  const IDX_BLOCK = 4, IDX_TOP_K = 2048, SELECTION_CAP = IDX_TOP_K + IDX_BLOCK - 1;   // 2051

  const posInt = (x, name) => { if (!Number.isInteger(x) || x < 1) throw new Error(name + ' 必须是正整数'); };
  const nonNeg = (x, name) => { if (!(x >= 0) || !Number.isFinite(x)) throw new Error(name + ' 不能为负'); };

  // Host submits launch i during [i·L, (i+1)·L]; the GPU starts it when both the submission and the previous kernel are done.
  function timeline(works, L) {
    nonNeg(L, 'L');
    const kernels = [];
    let gpuFree = 0;
    works.forEach((w, i) => {
      nonNeg(w, 'w');
      const submitStart = i * L, submitEnd = (i + 1) * L;
      const start = Math.max(submitEnd, gpuFree), end = start + w;
      kernels.push({ submitStart, submitEnd, start, end });
      gpuFree = end;
    });
    const total = gpuFree, busy = works.reduce((a, b) => a + b, 0);
    return { kernels, total, busy, busyRatio: total > 0 ? busy / total : 0, launches: works.length };
  }

  // n kernels of w µs each, every one launched separately at L µs of host cost.
  function direct(n, w, L) { posInt(n, 'n'); nonNeg(w, 'w'); return timeline(Array(n).fill(w), L); }

  // Groups of g neighbouring kernels fused into one launch; the work inside a group adds up.
  function fused(n, w, L, g) {
    posInt(n, 'n'); posInt(g, 'g'); nonNeg(w, 'w');
    const works = [];
    for (let left = n; left > 0; left -= g) works.push(Math.min(g, left) * w);
    return timeline(works, L);
  }

  // One graph launch (G µs of host cost), then the n recorded nodes run back to back.
  function graph(n, w, G) {
    posInt(n, 'n'); nonNeg(w, 'w'); nonNeg(G, 'G');
    const kernels = [];
    for (let i = 0; i < n; i++) kernels.push({ submitStart: 0, submitEnd: G, start: G + i * w, end: G + (i + 1) * w });
    const total = G + n * w, busy = n * w;
    return { kernels, total, busy, busyRatio: total > 0 ? busy / total : 0, launches: 1 };
  }

  // The four per-token values qsa.hpp keeps in one device buffer: pos, n_kv, completed blocks, selection width.
  function stepBuffer(pos) {
    if (!Number.isInteger(pos) || pos < 0) throw new Error('pos 必须是非负整数');
    const nKv = pos + 1;
    return [pos, nKv, Math.floor(nKv / IDX_BLOCK), Math.min(nKv, SELECTION_CAP)];
  }

  // Replays a captured "write token at pos" graph for `tokens` tokens. 'frozen': pos was a kernel argument
  // captured as 0. 'buffer': the kernel reads pos from a fixed-address device buffer the host rewrites each token.
  function replay(mode, tokens, size = 8) {
    if (mode !== 'frozen' && mode !== 'buffer') throw new Error('mode 只能是 frozen 或 buffer');
    posInt(tokens, 'tokens');
    const cells = Array(size).fill(null);
    let nKv = 0;
    for (let t = 0; t < tokens; t++) {
      const pos = mode === 'frozen' ? 0 : t;
      if (pos < size) cells[pos] = t;
      nKv = stepBuffer(pos)[1];
    }
    return { cells, nKv };
  }

  const api = { IDX_BLOCK, IDX_TOP_K, SELECTION_CAP, timeline, direct, fused, graph, stepBuffer, replay };
  root.VizMath = root.VizMath || {};
  root.VizMath.launch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
