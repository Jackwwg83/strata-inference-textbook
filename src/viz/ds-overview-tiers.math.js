/* Pure numbers behind the DeepSeek overview widget "where the files go". Teaching model, not Strata code.
   Page: content/columns/deepseek/overview.html, sections 1.2 (file sets) and 1.3 (three-tier placement).
   Upstream: Niko1221/Strata pinned at c62d5e3a15b40ea51c96aae9e8d36928965f53ab.
   Two placements are measured and copied as measured (PRESETS). Everything else uses the estimate rule below. */
(function (root) {
  'use strict';
  const GB = 1e9;
  // One GiB in decimal GB. Card sizes are catalogue figures in GiB (32 for an R9700): strata_control/dsv41_fit.py:30 and :213-216 (_cap_gb).
  const GIB_GB = 1073741824 / GB;
  // Page 1.3 "三层放置": "共 128 GB 显存" means 4 x 32 GiB cards. Cards are assumed to hold at most 32 GB each (R9700), to count the reserve.
  const CARD_GB = 32;
  // Page 1.3: the engine leaves about 1.15 GB free on each card (600 MiB reserve + ~0.5 GB buffers). strata_control/dsv41_fit.py:44.
  const RESERVE_PER_CARD_GB = 1.15;
  // Page 1.3: "CPU 侧要有大约同样多的空闲内存才能留在缓存里"; the engine and the system keep 9 GB of RAM beside the experts. dsv41_fit.py:46.
  const REST_RAM_GB = 9.0;
  // Below this much RAM beyond the CPU experts, "fits" turns into "tight". dsv41_fit.py:47 (used at :478).
  const SPARE_FITS_GB = 4.0;
  // Page 1.3 (Strix Halo): 12 GB kept for Windows and the desktop out of the one memory pool. dsv41_fit.py:95 (used at :352).
  const UMA_RESERVE_GB = 12.0;
  // Page 1.2: 40 layers x 384 experts = 15,360 experts. dsv41_fit.py:34-36.
  const EXPERTS_TOTAL = 40 * 384;

  // File sets. Sizes in GB (bytes / 1e9).
  // ud: UD-Q8_K_XL, page 1.2. 508,376,763,197 B in nine shards (dsv41_fit.py:31); experts 288,777,830,400 B (:33);
  //   Engram 202,758,032,592 B (:32); dense weights = rest = 16.84 GB (:40, page "16.8 GB").
  // IST-DAS sets, page 1.2: set bytes and expert GB from dsv41_fit.py:65 (2.00), :70 (1.75), :74 (2.25). Dense weights = set - experts = 6.16 GB
  //   (ISTA_DENSE_GB, :88). Engram 110,595,290,816 B (:60, page "111 GB", shared by all three), drafter 7,976,914,240 B (:61, page "8 GB").
  const ISTA = { engramGb: 110595290816 / GB, drafterGb: 7976914240 / GB };
  const mk = (id, label, bpw, setBytes, expertsGb, extra) => {
    const setGb = setBytes / GB;
    return { id, label, bpw, setGb, expertsGb, denseGb: setGb - expertsGb, ...extra };
  };
  const SETS = {
    ud: mk('ud', 'UD-Q8_K_XL', null, 508376763197, 288777830400 / GB, { engramGb: 202758032592 / GB, drafterGb: 0 }),
    ist175: mk('ist175', 'IST-DAS 1.75', 1.75, 120721120256, 114.56, ISTA),
    ist200: mk('ist200', 'IST-DAS 2.00', 2.0, 138238893056, 132.07, ISTA),
    ist225: mk('ist225', 'IST-DAS 2.25', 2.25, 155225824256, 149.06, ISTA),
  };
  // UD: the nine shards already contain the Engram, so dense + experts + Engram is the whole 508.4 GB.
  SETS.ud.denseGb = SETS.ud.setGb - SETS.ud.expertsGb - SETS.ud.engramGb;
  const SET_IDS = ['ud', 'ist175', 'ist200', 'ist225'];

  function set(id) {
    if (!Object.prototype.hasOwnProperty.call(SETS, id)) throw new Error('未知的文件集：' + id);
    return SETS[id];
  }
  // Total disk of a set. UD: 508.4 GB. IST-DAS: model + Engram + drafter = 239 / 257 / 274 GB (page 1.2; DEEPSEEK41.md:29-31).
  function diskGb(id) {
    const s = set(id);
    return s.id === 'ud' ? s.setGb : s.setGb + s.engramGb + s.drafterGb;
  }

  // Measured placements, copied from the page (page 1.3).
  // r9700: 4 x R9700 (32 GB each) + 251 GB RAM, UD set: 6,197 experts (116.5 GB) in graphics memory, 9,163 (172.3 GB) on the CPU.
  //   Source: DEEPSEEK41.md:19-20; also dsv41_fit.py:14-16.
  // strix: Ryzen AI Max, 128 GB pool (64 GB BIOS carve-out + 64 GB seen by Windows), 2.00 set: about 109 GB of experts in the pool, 23 GB read from SSD.
  //   Source: DEEPSEEK41.md:51-53.
  const PRESETS = {
    r9700: { state: { setId: 'ud', unified: false, vram: 128, ram: 251 }, expertsVram: 116.5, expertsVramCount: 6197, expertsCpuCount: 9163 },
    strix: { state: { setId: 'ist200', unified: true, vram: 128, ram: 0 }, expertsVram: 109 },
  };
  const DEFAULT = { ...PRESETS.r9700.state };

  function check(s) {
    if (!s || typeof s !== 'object') throw new Error('缺少输入');
    set(s.setId);
    for (const k of s.unified ? ['vram'] : ['vram', 'ram']) {
      if (typeof s[k] !== 'number' || !Number.isFinite(s[k]) || s[k] < 0) throw new Error(`${k} 必须是不小于零的有限数字`);
    }
  }

  // Cards of at most CARD_GB each.
  const cardsFor = (vram) => (vram > 0 ? Math.ceil(vram / CARD_GB) : 0);
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  function finish(s, st, kind, p) {
    const perExpert = st.expertsGb / EXPERTS_TOTAL;
    const expertsVramCount = p.expertsVramCount ?? Math.round(p.expertsVram / perExpert);
    const expertsRamCount = p.expertsRamCount ?? Math.round(p.expertsRam / perExpert);
    const out = {
      setId: s.setId, unified: !!s.unified, kind,
      denseVram: p.denseVram, expertsVram: p.expertsVram, expertsRam: p.expertsRam, expertsSsd: p.expertsSsd,
      engramGb: st.engramGb, engramWhere: p.engramWhere, drafterGb: st.drafterGb,
      expertsVramCount, expertsRamCount, expertsSsdCount: EXPERTS_TOTAL - expertsVramCount - expertsRamCount,
      vramCapGb: p.vramCapGb, ramGb: s.unified ? 0 : s.ram, ramNeededGb: p.ramNeededGb, spareRamGb: p.spareRamGb,
      cards: s.unified ? 0 : cardsFor(s.vram), verdict: p.verdict,
    };
    out.tiers = {
      vram: out.denseVram + out.expertsVram,
      ram: out.expertsRam + (out.engramWhere === 'ram' ? out.engramGb : 0),
      ssd: out.expertsSsd + (out.engramWhere === 'ssd' ? out.engramGb : 0) + out.drafterGb,
    };
    return out;
  }

  // The estimate rule (teaching estimate, simpler than strata_control/dsv41_fit.py plan() at :408):
  //  1. dense weights go to graphics memory first (page 1.3);
  //  2. experts fill the rest of graphics memory (cards in GiB, 1.15 GB reserved per card);
  //  3. the experts left are computed on the CPU and stay cached in RAM, which keeps 9 GB for the engine and the system;
  //  4. what RAM cannot cache is read from the SSD (page 1.3: "内存更少，这部分专家改读 SSD，速度变慢");
  //  5. a 2-bit set's Engram table goes to RAM only if RAM can hold all of it (page 1.3: "从内存或 SSD 读"); UD's table never does.
  // Unified memory (Strix Halo): one pool; dense weights and 12 GB for the system first, then experts, the rest from SSD (dsv41_fit.py:343-352).
  function estimate(s) {
    check(s);
    const st = set(s.setId);
    const E = st.expertsGb, D = st.denseGb;
    if (s.unified) {
      const room = s.vram - D - UMA_RESERVE_GB;
      const expertsVram = clamp(room, 0, E);
      return finish(s, st, 'estimate', {
        denseVram: D, expertsVram, expertsRam: 0, expertsSsd: E - expertsVram, engramWhere: 'ssd',
        vramCapGb: s.vram, ramNeededGb: 0, spareRamGb: 0,
        verdict: s.vram === 0 ? 'noCard' : room < 0 ? 'oom' : E - expertsVram > 0 ? 'spills' : 'fits',
      });
    }
    const n = cardsFor(s.vram);
    const cap = s.vram * GIB_GB, room = cap - n * RESERVE_PER_CARD_GB - D;
    const expertsVram = clamp(room, 0, E);
    const cpu = E - expertsVram;
    const expertsRam = Math.min(cpu, Math.max(0, s.ram - REST_RAM_GB));
    const spare = s.ram - (cpu + REST_RAM_GB);
    const engramWhere = st.id !== 'ud' && s.ram - REST_RAM_GB - expertsRam >= st.engramGb ? 'ram' : 'ssd';
    return finish(s, st, 'estimate', {
      denseVram: D, expertsVram, expertsRam, expertsSsd: cpu - expertsRam, engramWhere,
      vramCapGb: cap, ramNeededGb: cpu + REST_RAM_GB, spareRamGb: Math.max(0, spare),
      verdict: s.vram === 0 ? 'noCard' : room < 0 ? 'oom' : spare < 0 ? 'spills' : spare < SPARE_FITS_GB ? 'tight' : 'fits',
    });
  }

  // Measured placement for the two settings the page measured, the estimate for everything else.
  function place(s) {
    const e = estimate(s);
    const st = set(s.setId);
    for (const key of Object.keys(PRESETS)) {
      const pr = PRESETS[key], t = pr.state;
      if (s.setId !== t.setId || !!s.unified !== t.unified || s.vram !== t.vram || (!t.unified && s.ram !== t.ram)) continue;
      const E = st.expertsGb;
      const expertsVram = pr.expertsVram;
      if (t.unified) {
        return finish(s, st, 'measured', { ...e, expertsVram, expertsRam: 0, expertsSsd: E - expertsVram, expertsVramCount: undefined });
      }
      return finish(s, st, 'measured', { ...e, expertsVram, expertsRam: E - expertsVram, expertsSsd: 0, expertsVramCount: pr.expertsVramCount, expertsRamCount: pr.expertsCpuCount });
    }
    return e;
  }

  // Share of the files in each tier (for bar widths).
  function shares(p) {
    const t = p.tiers.vram + p.tiers.ram + p.tiers.ssd;
    return { vram: p.tiers.vram / t, ram: p.tiers.ram / t, ssd: p.tiers.ssd / t };
  }

  const api = {
    GIB_GB, CARD_GB, RESERVE_PER_CARD_GB, REST_RAM_GB, SPARE_FITS_GB, UMA_RESERVE_GB, EXPERTS_TOTAL,
    SETS, SET_IDS, PRESETS, DEFAULT, diskGb, cardsFor, estimate, place, shares,
  };
  root.VizMath = root.VizMath || {};
  root.VizMath.dsOverviewTiers = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
