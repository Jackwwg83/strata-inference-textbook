/* Pure numbers behind the chapter 01 widgets. Teaching arithmetic on upstream measurements.
   Speeds: docs/DETAILS.md L31-55 at the pinned commit (Q2_0, RTX 5070 12 GB, engine 0.1.26, MTP on). */
(function (root) {
  'use strict';
  // k = prompt length in K tokens (1K = 1,024 here, a teaching convention); prefill and decode in tokens/s.
  const SPEEDS = [
    { k: 1, prefill: 536, decode: 87.3 },
    { k: 4, prefill: 1299, decode: 93.0 },
    { k: 32, prefill: 2171, decode: 81.8 },
    { k: 64, prefill: 2126, decode: 76.2 },
    { k: 128, prefill: 2107, decode: 73.7 },
  ];

  // Seconds until the first answer token, and seconds to write `answerTokens` more.
  function waitTimes(i, answerTokens) {
    const s = SPEEDS[i];
    if (!s) throw new Error('没有这个长度的实测数据');
    if (!Number.isInteger(answerTokens) || answerTokens < 1) throw new Error('回答长度必须是正整数');
    const promptTokens = s.k * 1024;
    const firstS = promptTokens / s.prefill, answerS = answerTokens / s.decode;
    return { promptTokens, firstS, answerS, totalS: firstS + answerS, prefill: s.prefill, decode: s.decode };
  }

  // Each generated token is one pass through steps 4-6.
  function loopRounds(generated) {
    if (!Number.isInteger(generated) || generated < 0) throw new Error('token 数必须是非负整数');
    return generated;
  }
  // The engine reads the prompt ids plus everything generated so far.
  const engineInput = (promptIds, generated) => promptIds + loopRounds(generated);

  const api = { SPEEDS, waitTimes, loopRounds, engineInput };
  root.VizMath = root.VizMath || {};
  root.VizMath.journey = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
