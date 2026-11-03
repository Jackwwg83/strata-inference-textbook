/* DeepSeek column, page overview: where the files of a chosen set go on a chosen machine.
   All visible text lives in the T table below (zh is the master). Numbers come from ds-overview-tiers.math.js. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsOverviewTiers;

  const T = Viz.t({
    zh: {
      code: 'DS_TIERS', title: '文件放在哪一层：显存、内存、SSD', tag: '教学估算 · 两组实测除外',
      intro: '选一套文件，再选这台电脑的显存和内存，看文件按页面 1.3 的规则放到哪一层：<b>显存</b>放稠密权重和尽量多的专家，放不下的专家在 CPU 上就地算、留在<b>内存</b>里，内存也放不下的改读 <b>SSD</b>。页面里的两台实测机器（4× R9700、Strix Halo）直接用实测数字；其他设置是<b>教学估算</b>，没有实测。',
      lgDense: '稠密权重（注意力等，放显存）', lgVram: '显存里的专家', lgRam: '内存里的专家（CPU 就地算）', lgSsd: '从 SSD 读的专家', lgTable: 'Engram 查找表', lgDraft: 'DSpark 草稿模型', lgCap: '虚线框 = 这一层的容量',
      setLabel: '文件集',
      sets: { ud: 'UD-Q8_K_XL · 508.4 GB', ist175: 'IST-DAS 1.75 bpw', ist200: 'IST-DAS 2.00 bpw', ist225: 'IST-DAS 2.25 bpw' },
      machineLabel: '机器类型',
      machines: ['独立显卡 + 内存', '统一内存（共用一个池）'],
      vramLabel: '显存合计', poolLabel: '统一内存池', ramLabel: '内存',
      presetLabel: '实测机器',
      presets: ['4× R9700 + 251 GB 内存 · UD 集', 'Strix Halo 128 GB · 2.00 集'],
      stage: (set) => `文件集 ${set} 在显存、内存、SSD 三层的放置`,
      rowVram: (cap, n) => `显存 · 容量 ${cap} GB（${n} 张卡）`,
      rowPool: (cap) => `统一内存池 · 容量 ${cap} GB`,
      rowRam: (cap) => `内存 · 容量 ${cap} GB`,
      rowSsd: 'SSD · 直读',
      dVram: (d, e) => `稠密 ${d} ＋ 专家 ${e} GB`,
      dRam: (e, t) => `专家 ${e} GB` + (t ? ` ＋ 表 ${t} GB` : ''),
      dSsd: (e, t, d) => [`专家 ${e}`, t ? `表 ${t}` : '', d ? `草稿 ${d}` : ''].filter(Boolean).join(' ＋ ') + ' GB',
      scaleNote: '三条横条用同一把 GB 尺子画；虚线框是容量，实心是放进去的文件',
      noRam: '统一内存没有单独的内存层',
      sVramK: '显存里放了多少', sRamK: '内存里放了多少', sSsdK: 'SSD 上放了多少', sDiskK: '这套文件占多少磁盘',
      sVramF: (p, f) => `<b>= 稠密 ${f(p.denseVram)} ＋ 专家 ${f(p.expertsVram)}（${Viz.fmt(p.expertsVramCount)} 个）</b><br>` + (p.kind === 'measured' ? '实测值，来自页面 1.3' : `估算：容量 ${f(p.vramCapGb)} GB 先扣每卡 1.15 GB 保留，再扣稠密权重，剩下的放专家`),
      sPoolF: (p, f) => `<b>= 稠密 ${f(p.denseVram)} ＋ 专家 ${f(p.expertsVram)}</b><br>` + (p.kind === 'measured' ? '实测值：约 109 GB 专家常驻（页面 1.3）' : `估算：池 ${f(p.vramCapGb)} GB 先扣稠密权重和 ${M.UMA_RESERVE_GB} GB 系统保留，剩下的放专家`),
      sRamF: (p, f) => `<b>= CPU 侧专家 ${f(p.expertsRam + p.expertsSsd)} 里，内存能缓存的部分${p.engramWhere === 'ram' ? ' ＋ 整张表' : ''}</b><br>全缓存要 ${f(p.ramNeededGb)} GB（专家 ＋ ${M.REST_RAM_GB} GB 留给引擎和系统），现有 ${f(p.ramGb)} GB`,
      sRamNone: '—',
      sSsdF: (p, f) => `<b>= 读 SSD 的专家 ${f(p.expertsSsd)} ＋ ${p.engramWhere === 'ssd' ? `Engram 表 ${f(p.engramGb)}` : '表（已在内存）'}${p.drafterGb ? ` ＋ 草稿 ${f(p.drafterGb)}` : ''}</b><br>表不计入内存，但每写一个字都要读它几行`,
      sDiskF: (p, f, set) => `<b>= 稠密 ＋ 专家 ＋ 表${p.drafterGb ? ' ＋ 草稿' : ''}</b><br>${set}；2-bit 三套共用同一张 ${f(p.engramGb)} GB 的表`,
      gb: (v) => `${v} GB`,
      kindMeasured: '这一组是页面里的<b>实测放置</b>。',
      kindEstimate: '这一组是<b>教学估算</b>：按页面的规则推出来，没有实测。',
      vFits: (p, f) => `放得下：${f(p.expertsVram)} GB 专家在显存，${f(p.expertsRam)} GB 在内存，内存还剩 ${f(p.spareRamGb)} GB。`,
      vFitsPool: (p, f) => `放得下：稠密权重和全部专家都在统一内存池里，只有表在 SSD。`,
      vTight: (p, f) => `刚好放得下：内存只比缓存 CPU 侧专家多出 ${f(p.spareRamGb)} GB，不到 4 GB，余量很小。`,
      vSpills: (p, f) => `放不下：有 ${f(p.expertsSsd)} GB 专家要从 SSD 读，能跑，但每写一个字都会变慢。`,
      vOom: '显存放不下稠密权重：引擎可能一启动就因为显存不足而停下。',
      vNoCard: '没有显卡：这个引擎需要至少一张显卡。',
      try: [
        '点 <b>实测机器：4× R9700</b>，再把<b>内存</b>从 251 拉到 100 GB：172 GB 的 CPU 侧专家只有 91 GB 能留在内存里，其余约 82 GB 改读 SSD，结论变成「放不下」。',
        '选 <b>IST-DAS 2.00</b>，显存拉到 <b>16</b> GB、内存 <b>160</b> GB：专家全在显存和内存里，111 GB 的表落在 SSD；把内存拉到 <b>400</b> GB，这张表改放内存。',
        '点 <b>实测机器：Strix Halo</b>，把<b>统一内存池</b>从 128 降到 64 GB：常驻专家从约 109 GB 掉到 46 GB，SSD 上的专家涨到约 86 GB。',
      ],
    },
  });

  const f1 = (x) => Viz.fmt(x, 1);

  Viz.register('ds-overview-tiers', {
    mount(el) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a3)', text: T.lgDense },
        { color: 'var(--a2)', text: T.lgVram },
        { color: 'var(--accent)', text: T.lgRam },
        { color: 'var(--side)', text: T.lgSsd },
        { color: 'var(--frame)', text: T.lgTable },
        { color: 'var(--muted)', text: T.lgDraft },
        { color: 'transparent', text: T.lgCap },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const lab = 'font-family:var(--mono);font-size:12px;color:var(--muted)';
      const btn = (attr, i, label) => `<button type="button" class="viz-btn ghost" data-${attr}="${i}" aria-pressed="false" style="padding:5px 9px;font-size:12px;min-width:0">${Viz.esc(label)}</button>`;
      left.insertAdjacentHTML('beforeend',
        `<div class="viz-row" style="margin-top:0" role="group" aria-label="${Viz.esc(T.setLabel)}"><span style="${lab}">${T.setLabel}</span>${M.SET_IDS.map((id, i) => btn('set', i, T.sets[id])).join('')}</div>
        <div class="viz-row" role="group" aria-label="${Viz.esc(T.machineLabel)}"><span style="${lab}">${T.machineLabel}</span>${T.machines.map((l, i) => btn('machine', i, l)).join('')}</div>
        <div class="viz-row" role="group" aria-label="${Viz.esc(T.presetLabel)}"><span style="${lab}">${T.presetLabel}</span>${T.presets.map((l, i) => btn('preset', i, l)).join('')}</div>
        <div class="viz-slider" data-row="vram"><label></label><input type="range" min="8" max="192" step="8" value="${M.DEFAULT.vram}"><output></output></div>
        <div class="viz-slider" data-row="ram"><label>${T.ramLabel}</label><input type="range" min="16" max="512" step="1" value="${M.DEFAULT.ram}" aria-label="${Viz.esc(T.ramLabel)}"><output></output></div>`);
      const svg = Viz.svg('svg', { viewBox: '0 0 400 214', class: 'viz-stage', role: 'img' }, left);
      right.innerHTML =
        Viz.stat({ id: 't-vram', k: T.sVramK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 't-ram', k: T.sRamK, v: '', f: '' }) +
        Viz.stat({ id: 't-ssd', k: T.sSsdK, v: '', f: '' }) +
        Viz.stat({ id: 't-disk', k: T.sDiskK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" aria-live="polite"></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const vramRange = $('[data-row=vram] input'), ramRange = $('[data-row=ram] input');
      const st = { ...M.DEFAULT };

      const txt = (x, y, s, color) => { const t = Viz.svg('text', { x, y, 'font-size': 12, style: `fill:${color || 'var(--muted)'}` }, svg); t.textContent = s; return t; };

      function draw() {
        const p = M.place(st), set = M.SETS[st.setId];
        const disk = M.diskGb(st.setId);
        // One GB ruler for the three rows: the largest of the files and the two capacities.
        const scale = Math.max(disk, p.vramCapGb, p.ramGb) / 400;
        svg.innerHTML = '';
        svg.setAttribute('aria-label', T.stage(T.sets[st.setId]));
        const rows = [
          { title: st.unified ? T.rowPool(f1(p.vramCapGb)) : T.rowVram(f1(p.vramCapGb), p.cards), cap: p.vramCapGb,
            segs: [[p.denseVram, 'var(--a3)'], [p.expertsVram, 'var(--a2)']], detail: T.dVram(f1(p.denseVram), f1(p.expertsVram)) },
          { title: st.unified ? T.noRam : T.rowRam(f1(p.ramGb)), cap: st.unified ? 0 : p.ramGb,
            segs: [[p.expertsRam, 'var(--accent)'], [p.engramWhere === 'ram' ? p.engramGb : 0, 'var(--frame)']], detail: st.unified ? '' : T.dRam(f1(p.expertsRam), p.engramWhere === 'ram' ? f1(p.engramGb) : '') },
          { title: T.rowSsd, cap: 0,
            segs: [[p.expertsSsd, 'var(--side)'], [p.engramWhere === 'ssd' ? p.engramGb : 0, 'var(--frame)'], [p.drafterGb, 'var(--muted)']], detail: T.dSsd(f1(p.expertsSsd), p.engramWhere === 'ssd' ? f1(p.engramGb) : '', p.drafterGb ? f1(p.drafterGb) : '') },
        ];
        rows.forEach((r, i) => {
          const y = 4 + i * 62;
          txt(0, y + 12, r.title, 'var(--ink)');
          let x = 0;
          for (const [gb, color] of r.segs) {
            if (!(gb > 0)) continue;
            const w = Math.max(1, gb / scale);
            Viz.svg('rect', { x, y: y + 20, width: w, height: 16, style: `fill:${color}` }, svg);
            x += w;
          }
          if (r.cap > 0) Viz.svg('rect', { x: 0.5, y: y + 19.5, width: Math.max(1, r.cap / scale - 1), height: 17, style: 'fill:none;stroke:var(--muted);stroke-dasharray:4 3' }, svg);
          if (r.detail) txt(0, y + 54, r.detail);
        });
        txt(0, 206, T.scaleNote);

        const v = (id, val, form) => { $(`[data-s=${id}-v]`).textContent = val; $(`[data-s=${id}-f]`).innerHTML = form; };
        v('t-vram', T.gb(f1(p.tiers.vram)), st.unified ? T.sPoolF(p, f1) : T.sVramF(p, f1));
        v('t-ram', st.unified ? T.sRamNone : T.gb(f1(p.tiers.ram)), st.unified ? T.noRam : T.sRamF(p, f1));
        v('t-ssd', T.gb(f1(p.tiers.ssd)), T.sSsdF(p, f1));
        v('t-disk', T.gb(f1(disk)), T.sDiskF(p, f1, set.label));
        const word = { fits: st.unified ? T.vFitsPool(p, f1) : T.vFits(p, f1), tight: T.vTight(p, f1), spills: T.vSpills(p, f1), oom: T.vOom, noCard: T.vNoCard }[p.verdict];
        $('.viz-verdict').innerHTML = `${word}<br>${p.kind === 'measured' ? T.kindMeasured : T.kindEstimate}`;

        el.querySelectorAll('[data-set]').forEach(b => { const on = M.SET_IDS[+b.dataset.set] === st.setId; b.classList.toggle('ghost', !on); b.setAttribute('aria-pressed', on); });
        el.querySelectorAll('[data-machine]').forEach(b => { const on = (+b.dataset.machine === 1) === st.unified; b.classList.toggle('ghost', !on); b.setAttribute('aria-pressed', on); });
        const presets = [M.PRESETS.r9700.state, M.PRESETS.strix.state];
        el.querySelectorAll('[data-preset]').forEach(b => {
          const s = presets[+b.dataset.preset], on = s.setId === st.setId && s.unified === st.unified && s.vram === st.vram && (s.unified || s.ram === st.ram);
          b.classList.toggle('ghost', !on); b.setAttribute('aria-pressed', on);
        });
        const vl = st.unified ? T.poolLabel : T.vramLabel;
        $('[data-row=vram] label').textContent = vl;
        vramRange.setAttribute('aria-label', vl);
        vramRange.value = st.vram; ramRange.value = st.ram;
        $('[data-row=vram] output').textContent = st.vram + ' GB';
        $('[data-row=ram] output').textContent = st.ram + ' GB';
        $('[data-row=ram]').hidden = st.unified;
      }

      el.querySelectorAll('[data-set]').forEach(b => { b.onclick = () => { st.setId = M.SET_IDS[+b.dataset.set]; draw(); }; });
      el.querySelectorAll('[data-machine]').forEach(b => { b.onclick = () => { st.unified = +b.dataset.machine === 1; draw(); }; });
      el.querySelectorAll('[data-preset]').forEach(b => { b.onclick = () => { Object.assign(st, [M.PRESETS.r9700.state, M.PRESETS.strix.state][+b.dataset.preset]); if (st.unified) st.ram = M.DEFAULT.ram; draw(); }; });
      vramRange.oninput = () => { st.vram = +vramRange.value; draw(); };
      ramRange.oninput = () => { st.ram = +ramRange.value; draw(); };
      draw();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
