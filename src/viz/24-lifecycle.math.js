/* Pure functions behind the chapter 24 widgets: a teaching request state machine, the serve watchdog's
   allowances (constants from serve/server.py at the pinned commit) and a timing side channel in key comparison. */
(function (root) {
  'use strict';

  // Teaching state machine. Not upstream enums: Strata tracks "queued" / "generating" plus a phase string.
  const TABLE = {
    queued: { admit: 'prefill', cancel: 'cancelled' },
    prefill: { firstToken: 'decoding', cancel: 'cancelling', silent: 'failed' },
    decoding: { finish: 'done', cancel: 'cancelling', silent: 'failed' },
    cancelling: { ack: 'cancelled', silent: 'failed' },
    done: {}, cancelled: {}, failed: {},
  };
  const STATES = Object.keys(TABLE);
  function transition(state, ev) {
    if (!(state in TABLE)) throw new Error('未知状态 ' + state);
    const next = TABLE[state][ev];
    if (!next) throw new Error(`状态 ${state} 不接受事件 ${ev}`);
    return next;
  }
  const allowed = state => Object.keys(TABLE[state] || {});
  const isTerminal = state => state in TABLE && allowed(state).length === 0;

  // serve/server.py: ENGINE_SILENCE_S = 300, PP_CHUNK_MAX = 32768, PP_FLOOR_TOK_S = 50, PP_SLACK = 3.
  const SILENCE = 300, CHUNK_MAX = 32768, FLOOR = 50, SLACK = 3;
  // How long the engine may stay silent before the first prompt-progress line (seconds; Infinity = wait forever).
  function firstAllowance(promptTokens, { silence = SILENCE, chunkMax = CHUNK_MAX, floor = FLOOR } = {}) {
    if (!(silence > 0)) return Infinity;
    return silence + Math.min(promptTokens, chunkMax) / floor;
  }
  // After a chunk of `chunk` tokens read at `rate` tokens/s: the next chunk may take SLACK times as long.
  function nextAllowance(chunk, rate, { silence = SILENCE, slack = SLACK } = {}) {
    if (!(rate > 0) || !(chunk > 0)) throw new Error('块大小和速度必须大于零');
    return Math.max(silence, slack * chunk / rate);
  }

  // Worst-case seconds from the client hanging up to the engine stopping (teaching estimate).
  // Detection: the watch thread looks every 0.5 s. Then the engine finishes its current unit of work.
  function stopDelay(state, { watch = 0.5, chunk = 32768, prefillRate = 2171, decodeRate = 81.8 } = {}) {
    if (state === 'queued') return watch;
    if (state === 'prefill') return watch + chunk / prefillRate;
    if (state === 'decoding') return watch + 1 / decodeRate;
    throw new Error('只有排队、读题、生成三个状态需要取消');
  }

  // Characters compared before the answer is known. Early exit stops at the first mismatch.
  function earlyExitSteps(secret, guess) {
    const n = Math.min(secret.length, guess.length);
    for (let i = 0; i < n; i++) if (secret[i] !== guess[i]) return i + 1;
    return n;
  }
  const constantSteps = secret => secret.length;

  // Measured "time" for each candidate at the next position, the rest padded with a filler.
  function probe(secret, known, alphabet, mode) {
    const pad = '\u0000'.repeat(Math.max(0, secret.length - known.length - 1));
    return [...alphabet].map(c => (mode === 'early' ? earlyExitSteps(secret, known + c + pad) : constantSteps(secret)));
  }
  // Guess position by position; stop when no single candidate stands out.
  // The last position needs no timing: the right guess is simply accepted.
  function pick(secret, known, alphabet, mode) {
    if (known.length === secret.length - 1) return [...alphabet].map((c, i) => (known + c === secret ? i : -1)).filter(i => i >= 0);
    const t = probe(secret, known, alphabet, mode), max = Math.max(...t);
    return t.map((x, i) => (x === max ? i : -1)).filter(i => i >= 0);
  }
  function attack(secret, alphabet, mode) {
    let known = '', tries = 0;
    while (known.length < secret.length) {
      tries += alphabet.length;
      const best = pick(secret, known, alphabet, mode);
      if (best.length !== 1) return { recovered: known, tries, stuckAt: known.length };
      known += alphabet[best[0]];
    }
    return { recovered: known, tries, stuckAt: -1 };
  }
  const bruteForce = (alphabetSize, len) => alphabetSize ** len;

  const api = { STATES, transition, allowed, isTerminal, SILENCE, CHUNK_MAX, FLOOR, SLACK, firstAllowance, nextAllowance, stopDelay, earlyExitSteps, constantSteps, probe, pick, attack, bruteForce };
  root.VizMath = root.VizMath || {};
  root.VizMath.lifecycle = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
