/* Pure logic behind the chapter 18 widget. Teaching model of the greedy verify window.
   The accept loop mirrors src/program/generate.cpp at the pinned commit:
     while (a < T - 1 && window[a + 1] == outv[a]) ++a;   ver.commit(a + 1);  */
(function (root) {
  'use strict';
  const MAX_T = 8;                                   // kVerifyMaxT in verify_kernels.hpp
  const WRONG = '✗';

  // window[0] is the last accepted token, window[1..] the drafts; outv[t] is the target's pick after window[t].
  function accepted(window, outv) {
    let a = 0;
    while (a < window.length - 1 && window[a + 1] === outv[a]) a++;
    return a;
  }

  // One verify round over `text`, the sequence the target would write. pos indexes the last accepted token.
  function round(text, pos, drafts) {
    const T = drafts.length + 1;
    if (T > MAX_T) throw new Error('窗口最多 8 行');
    const window = [text[pos], ...drafts];
    const outv = window.map((_, t) => text[pos + t + 1]);
    const a = accepted(window, outv);
    return {
      window, outv, a, nKeep: a + 1,
      emitted: [...drafts.slice(0, a), outv[a]],
      rejected: drafts.slice(a),
      nextPos: pos + a + 1,
    };
  }

  // k teaching drafts after pos: correct guesses, except a wrong one at 1-based position `miss` (null: none).
  function drafts(text, pos, k, miss, alt = t => WRONG + t) {
    if (!Number.isInteger(k) || k < 1) throw new Error('k 必须是正整数');
    const n = Math.min(k, text.length - 1 - pos);
    const out = [];
    for (let i = 1; i <= n; i++) out.push(i === miss ? alt(text[pos + i]) : text[pos + i]);
    return out;
  }

  const api = { MAX_T, WRONG, accepted, round, drafts };
  root.VizMath = root.VizMath || {};
  root.VizMath.spec = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
