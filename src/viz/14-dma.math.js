/* Pure numbers behind the chapter 14 widgets. Teaching models of a copy/compute pipeline and of DMA into
   pageable memory. Times are teaching values; the pipeline bound is the textbook formula. */
(function (root) {
  'use strict';

  // n chunks flow through `buffers` staging buffers: a copy engine fills buffer i % buffers, then compute reads it.
  // wait = the copy into a buffer waits until the previous reader of that buffer has finished (the "used" signal).
  function doubleBuffer({ n, copyMs, computeMs, buffers, wait }) {
    if (!(Number.isInteger(n) && n > 0 && Number.isInteger(buffers) && buffers > 0 && copyMs > 0 && computeMs > 0)) throw new Error('参数必须为正数');
    const chunks = [], freeAt = new Array(buffers).fill(0), lastUser = new Array(buffers).fill(-1), corrupted = [];
    let copyFree = 0, compFree = 0;
    for (let i = 0; i < n; i++) {
      const buf = i % buffers;
      const copyStart = Math.max(copyFree, wait ? freeAt[buf] : 0), copyEnd = copyStart + copyMs;
      const prev = lastUser[buf];
      if (prev >= 0 && copyStart < chunks[prev].compEnd) { chunks[prev].corrupted = true; corrupted.push(prev); }
      const compStart = Math.max(copyEnd, compFree), compEnd = compStart + computeMs;
      chunks.push({ i, buf, copyStart, copyEnd, compStart, compEnd, corrupted: false });
      copyFree = copyEnd; compFree = compEnd; freeAt[buf] = compEnd; lastUser[buf] = i;
    }
    return { chunks, corrupted, total: compFree, serial: n * (copyMs + computeMs) };
  }

  // Two or more buffers, both engines independent: first copy + (n - 1) x the slower stage + last compute.
  const pipelineFormula = (n, c, k) => c + (n - 1) * Math.max(c, k) + k;

  const pages = (bytes, page) => Math.ceil(bytes / page);

  // A 4-page buffer handed to a DMA engine. Without pinning, memory pressure moves page 2 to another frame
  // halfway through; the engine still reads the physical frames it was given.
  function pinTimeline(pinned) {
    const start = [2, 5, 3, 7], steps = [];
    let frames = start.slice(), done = 0;
    const dmaFrames = start.slice();
    const push = (key) => steps.push({ key, frames: frames.slice(), dmaFrames: dmaFrames.slice(), done, ok: frames.every((f, i) => i >= done || dmaFrames[i] === f) && (key !== 'finish' || frames.every((f, i) => dmaFrames[i] === f)) });
    push('alloc');
    push('handoff');
    done = 2; push('copying');
    if (!pinned) frames = [2, 5, 6, 7];
    push('pressure');
    done = 4; push('resume');
    push('finish');
    return steps;
  }

  const api = { doubleBuffer, pipelineFormula, pages, pinTimeline };
  root.VizMath = root.VizMath || {};
  root.VizMath.dma = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
