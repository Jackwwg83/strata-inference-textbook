/* Pure numbers behind the DeepSeek column widget ds-experts-faster (page deepseek/experts, section 2.5).
   Teaching model, not engine code. Upstream pin: c62d5e3a15b40ea51c96aae9e8d36928965f53ab.
   Assumption of the model: every expert is equally likely to be picked, so the chance that a picked
   expert sits in graphics memory equals the share of experts that sit there. The real engine fills
   hottest-first from the profile (page 2.2, 2.3), which does better than this. */
(function (root) {
  'use strict';
  // 40 layers x 384 experts = 15,360 experts. Page 2.1; DEEPSEEK41.md:3-4 and :15 ("15,360 of 18.8 MB").
  const LAYERS = 40;
  const PER_LAYER = 384;
  const TOTAL_EXPERTS = LAYERS * PER_LAYER;
  // Bytes of one expert, in MB. q8: UD-Q8_K_XL, 18.8 MB (page 2.1; DEEPSEEK41.md:15).
  // bit2: the 2-bit set, about 8.6 MB (page 2.1: 132 GB / 15,360; DEEPSEEK41.md:51-55 gives 109 + 23 = 132 GB).
  const EXPERT_MB = { q8: 18.8, bit2: 8.6 };
  const SETS = Object.keys(EXPERT_MB);
  // Experts per word: the model routes top-6 (Full, page 2.1 and 2.5; DEEPSEEK41.md:3-4);
  // Faster keeps the router's top 5 and renormalises (page 2.5; src/dsv41/ds4_experts_rule.hpp:3-6; DEEPSEEK41.md:130).
  const FULL_K = 6;
  const FASTER_K = 5;
  // Per-card reserve: 600 MiB. Page 2.2 rule (1); src/dsv41/ds4_model.hpp:29-31 and src/dsv41/ds4_model.cu:4616-4617.
  // The extra integrated-GPU reserve (Windows only) and the one spare slot per mixed layer
  // (ds4_model.cu:4688-4703) are left out of this model.
  const RESERVE_MIB = 600;
  // --vram-experts default 1.0 (ds4_model.hpp:29-31; page 2.2 rule (1)).
  const VRAM_EXPERTS = 1.0;
  const MIB = 1048576; // bytes in one MiB
  // Widget range: one card with this much free memory (GiB) holds the whole 18.8 MB set (needs about 269.5 GiB).
  const MAX_FREE_GIB = 280;
  // Default state = the static figure DS2-4 (page 2.5): "6 个都不常驻", nothing in graphics memory, Q8 set.
  const DEFAULT_FREE_GIB = 0;
  const DEFAULT_SET = 'q8';

  const finite = (x) => typeof x === 'number' && Number.isFinite(x);
  function checkSet(set) {
    if (!SETS.includes(set)) throw new Error('未知的文件集：' + set);
    return EXPERT_MB[set];
  }

  // Budget for experts on one card, in MB: (free - 600 MiB reserve) x vramExperts, never below zero.
  function vramBudgetMB(freeGiB, vramExperts = VRAM_EXPERTS) {
    if (!finite(freeGiB) || freeGiB < 0) throw new Error('空闲显存必须是不小于零的有限数');
    if (!finite(vramExperts) || vramExperts < 0 || vramExperts > 1) throw new Error('--vram-experts 必须在 0 到 1 之间');
    return Math.max(0, freeGiB * 1024 - RESERVE_MIB) * MIB / 1e6 * vramExperts;
  }

  // Whole experts only; a partial expert does not count.
  function residentExperts(freeGiB, set = DEFAULT_SET) {
    const size = checkSet(set);
    return Math.min(TOTAL_EXPERTS, Math.floor(vramBudgetMB(freeGiB) / size));
  }
  const residentShare = (freeGiB, set = DEFAULT_SET) => residentExperts(freeGiB, set) / TOTAL_EXPERTS;
  const totalGB = (set = DEFAULT_SET) => TOTAL_EXPERTS * checkSet(set) / 1000;

  // One word, k experts picked: total expert bytes, and the part that is not in graphics memory.
  function wordBill(k, freeGiB, set = DEFAULT_SET) {
    if (!Number.isInteger(k) || k < 1 || k > PER_LAYER) throw new Error('每字专家数必须是 1 到 384 的整数');
    const size = checkSet(set);
    const share = residentShare(freeGiB, set);
    const totalMB = k * size;
    const offShare = 1 - share;
    const offMB = totalMB * offShare;
    return { k, sizeMB: size, totalMB, residentShare: share, offShare, offMB, residentMB: totalMB - offMB };
  }

  // Full against Faster. savedPct is -1/6 whenever something is read from RAM or SSD, else 0.
  function compare(freeGiB, set = DEFAULT_SET) {
    const full = wordBill(FULL_K, freeGiB, set), faster = wordBill(FASTER_K, freeGiB, set);
    const savedMB = full.offMB - faster.offMB;
    return { full, faster, savedMB, savedPct: full.offMB > 0 ? faster.offMB / full.offMB - 1 : 0 };
  }

  const api = { LAYERS, PER_LAYER, TOTAL_EXPERTS, EXPERT_MB, SETS, FULL_K, FASTER_K, RESERVE_MIB, VRAM_EXPERTS, MAX_FREE_GIB, DEFAULT_FREE_GIB, DEFAULT_SET, vramBudgetMB, residentExperts, residentShare, totalGB, wordBill, compare };
  root.VizMath = root.VizMath || {};
  root.VizMath.dsExpertsFaster = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
