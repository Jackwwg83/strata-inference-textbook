/* Pure numbers behind the DeepSeek column widget ds-draft-window (page 5.2, figure DS5-2). Teaching model.
   Upstream = https://github.com/Niko1221/Strata at the locked commit c62d5e3a15b40ea51c96aae9e8d36928965f53ab.
   - keptDrafts(): the gate loop of ds4_main.cpp. Count drafts from the first; stop at the first one whose confidence is
     below the floor or whose running product is below the cumulative gate; the rest are dropped.
   - expectedWords(): E = 1 + c1 + c1c2 + ... + c1..ck over the k kept drafts (page 5.2 "来试一试"; derivation in chapter 19.2).
     Treating the confidence as a conditional acceptance rate is the page's teaching assumption, not an engine fact. */
(function (root) {
  'use strict';

  // Block size of the DSpark pack: one block forward gives 5 drafts and 5 confidences.
  // Source: page 5.1; src/dsv41/ds4_model.cu:533-536 (geometry read from the pack), ds4_model.cu:2350 (--dspark-block cap).
  const BLOCK = 5;
  // Teaching confidences of the static figure DS5-2 (not measured). Source: page 5.2, figure DS5-2.
  const PRESET_CONF = [0.80, 0.62, 0.45, 0.35, 0.28];
  // Per-draft floor, default dspark_conf 0.5. Source: page 5.2 "第一道门槛"; src/dsv41/ds4_model.hpp:52-55, ds4_main.cpp:281-286.
  const FLOOR = 0.5;
  // Cumulative gate shown on the figure. The engine default is 0 (off) except on RDNA4 (0.5).
  // Source: page 5.2 "连乘门槛的默认值跟着硬件走"; ds4_experts_rule.hpp:197-201; ds4_main.cpp:169-175.
  const CUM = 0.5;
  // Hard cap on drafts per round: min(block size, --dspark-depth). The engine default depth 64 never binds; 5 is the block size.
  // Source: page 5.2; ds4_main.cpp:238-244 (loop caps), ds4_main.cpp:165 (--dspark-depth default).
  const DEPTH = BLOCK;
  // Highest confidence the widget will scale to; sigmoid output never reaches 1. Teaching choice, no upstream source.
  const MAX_CONF = 0.99;
  const DEFAULTS = Object.freeze({ floor: FLOOR, cum: CUM, depth: DEPTH, scale: 1 });
  // Tolerance so a product exactly on the gate passes (the engine stops only when strictly below).
  const EPS = 1e-9;

  const unit = (x, name) => { if (!(x >= 0 && x <= 1)) throw new Error(name + ' 必须在 0 到 1 之间'); };

  // Running product of the confidences: draft j is useful only if drafts 1..j-1 were all accepted.
  function cumulative(conf) {
    let acc = 1;
    return conf.map(p => { unit(p, '置信度'); acc *= p; return acc; });
  }

  // Number of drafts that enter the verify window.
  function keptDrafts(conf, { floor = 0, cum = 0, depth = BLOCK } = {}) {
    unit(floor, '下限'); unit(cum, '连乘门槛');
    if (!Number.isInteger(depth) || depth < 0) throw new Error('草稿数必须是非负整数');
    const cap = Math.min(depth, BLOCK, conf.length), run = cumulative(conf);
    let k = 0;
    while (k < cap && conf[k] >= floor - EPS && run[k] >= cum - EPS) k++;
    return k;
  }

  // Expected words out of one verify round that checks the first k drafts.
  function expectedWords(conf, k) {
    if (!Number.isInteger(k) || k < 0 || k > conf.length) throw new Error('k 超出草稿个数');
    return 1 + cumulative(conf).slice(0, k).reduce((a, b) => a + b, 0);
  }

  // Window rows: the last committed word y plus k drafts. Source: page 5.3; ds4_model.cu:7952-7958.
  function windowRows(k) {
    if (!Number.isInteger(k) || k < 0 || k > BLOCK) throw new Error('草稿数必须在 0 到 ' + BLOCK + ' 之间');
    return k + 1;
  }

  // The acceptance knob: multiply every confidence by scale, clamp to [0, MAX_CONF]. Scale 1 keeps the preset.
  function scaleConf(conf, scale) {
    if (!(scale >= 0) || !Number.isFinite(scale)) throw new Error('缩放必须是非负数');
    return conf.map(p => { unit(p, '置信度'); return Math.min(MAX_CONF, p * scale); });
  }

  // The three rows of the figure: no gate, floor only, floor plus cumulative gate. Depth applies to all three.
  function threeCuts(conf, { floor, cum, depth }) {
    const row = g => { const k = keptDrafts(conf, { ...g, depth }); return { k, rows: windowRows(k), words: expectedWords(conf, k) }; };
    return { none: row({ floor: 0, cum: 0 }), floor: row({ floor, cum: 0 }), both: row({ floor, cum }) };
  }

  const api = { BLOCK, PRESET_CONF, DEFAULTS, MAX_CONF, cumulative, keptDrafts, expectedWords, windowRows, scaleConf, threeCuts };
  root.VizMath = root.VizMath || {};
  root.VizMath.dsDraftWindow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
