/* Pure numbers behind the DeepSeek column widget ds-engram-read (page: content/columns/deepseek/engram.html, section 4.5).
   Teaching model: words per second <= SSD read speed / MB read from the disk per word. It is an upper bound;
   the experts also need CPU time. 1 GB is 1000 MB, as on the page (3.6 GB/s / 48 MB = 75 words/s).
   Upstream = https://github.com/Niko1221/Strata at c62d5e3a15b40ea51c96aae9e8d36928965f53ab. */
(function (root) {
  'use strict';

  const MB_PER_GB = 1000; // page 4.5: 3.6 GB/s ÷ 48 MB → 75 and ÷ 111 MB → 32, so decimal units.

  // Measured Mac points. mb: "Read from the SSD per word", docs/DEEPSEEK_MAC.md:50 (M5 Max 128 GB, 2.00 bpw 48 MB, 2.25 bpw 111 MB).
  // tps: mid-points of the ranges in the short-answer code hint, as used in figure DS4-5 on the page
  // (2.00 套装 15.2–16.0 → 15.6; 2.25 套装 14.7–15.3 → 15.0). Teaching mid-points, not upstream numbers.
  const MEASURED = [
    { id: 'q2', mb: 48, tps: 15.6 },
    { id: 'q225', mb: 111, tps: 15.0 },
  ];

  // Default SSD read speed: the 3.6 GB/s NVMe drive of the RTX 5070 machine, docs/DEEPSEEK41.md:63-64.
  // Default MB per word: the 2.00 bpw pack, docs/DEEPSEEK_MAC.md:50.
  const DEFAULTS = { gbps: 3.6, mb: 48 };

  // Slider ranges. Chosen for teaching: 0.1 to 4 GB/s is the span of the chart axis and holds the 3.6 GB/s drive;
  // 10 to 200 MB per word covers both packs (48 and 111 MB).
  const RANGES = { gbps: { min: 0.1, max: 4, step: 0.1 }, mb: { min: 10, max: 200, step: 1 } };

  // Chart axes of the static figure on the page: 0-4 GB/s across, 0-85 words/s up.
  const axes = { xMax: 4, yMax: 85 };
  // Pixel box of the static figure (viewBox 400 x 254): x from 48 to 380, zero line at y 212, top at y 64.1.
  const box = { x0: 48, x1: 380, y0: 212, y1: 64.1 };
  const geometry = {
    x: g => box.x0 + g / axes.xMax * (box.x1 - box.x0),
    y: w => box.y0 - w / axes.yMax * (box.y0 - box.y1),
  };

  const finite = (x, name) => { if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(name + ' 必须是有限的数'); };
  const pos = (x, name) => { finite(x, name); if (!(x > 0)) throw new Error(name + ' 必须大于零'); };
  const nonneg = (x, name) => { finite(x, name); if (x < 0) throw new Error(name + ' 不能为负'); };

  // Words per second at most, for a disk that reads gbps GB/s and a word that reads mb MB.
  function upperBound(gbps, mb) {
    nonneg(gbps, '读速'); pos(mb, '每字读盘量');
    return gbps * MB_PER_GB / mb;
  }

  // The read speed (GB/s) a word rate needs at least: the inverse of upperBound.
  function requiredRead(tps, mb) {
    nonneg(tps, '字速'); pos(mb, '每字读盘量');
    return tps * mb / MB_PER_GB;
  }

  // How many times the measured speed fits under the bound (below 1 means the disk alone caps it lower).
  function headroom(gbps, mb, tps) {
    pos(tps, '字速');
    return upperBound(gbps, mb) / tps;
  }

  const clamp = (x, lo, hi) => { finite(x, '值'); return Math.min(hi, Math.max(lo, x)); };

  // Two end points of the line words = speed x 1000 / mb, cut at the top of the chart.
  function curve(mb) {
    pos(mb, '每字读盘量');
    const top = upperBound(axes.xMax, mb);
    if (top <= axes.yMax) return [{ gbps: 0, wps: 0 }, { gbps: axes.xMax, wps: top }];
    return [{ gbps: 0, wps: 0 }, { gbps: requiredRead(axes.yMax, mb), wps: axes.yMax }];
  }

  // The state the static figure shows.
  function defaultState() {
    return {
      gbps: DEFAULTS.gbps,
      limits: MEASURED.map(p => upperBound(DEFAULTS.gbps, p.mb)),
      required: MEASURED.map(p => requiredRead(p.tps, p.mb)),
    };
  }

  const api = { MB_PER_GB, MEASURED, DEFAULTS, RANGES, axes, geometry, upperBound, requiredRead, headroom, clamp, curve, defaultState };
  root.VizMath = root.VizMath || {};
  root.VizMath.dsEngramRead = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
