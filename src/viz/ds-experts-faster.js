/* DeepSeek column, page experts, section 2.5: Full (6 experts per word) against Faster (5).
   All visible text lives in the T table below (zh is the master). Numbers come from ds-experts-faster.math.js. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsExpertsFaster;

  const T = Viz.t({
    zh: {
      code: 'EXPERTS_FASTER', title: '每字少用一个专家，省下多少搬运', tag: '教学推演 · 专家大小与规则取自本页',
      intro: '模型每写一个字选 6 个专家（Full），Faster 档只取前 5 个。选一个文件集，再拖动<b>单卡空闲显存</b>：显存里放得下的专家在卡上算，不用搬；其余的要从<b>内存槽位或 SSD</b> 读。图里两条横条等比，都按 Full 的总字节画。教学假设：每个专家被选中的机会均等，所以“在显存里的比例”就是“不用搬的比例”。真实引擎按热度从热到冷填充，实际会比这里更好。',
      lgOff: '内存槽位或 SSD 要读的字节', lgOn: '常驻显存、在卡上算的字节',
      setLabel: '文件集', sets: { q8: 'UD-Q8_K_XL（18.8 MB/个）', bit2: '2 比特集（8.6 MB/个）' },
      memLabel: '单卡空闲显存', memAria: '单卡空闲显存，单位 GiB',
      gib: (g) => `${g} GiB`,
      bFull: (k) => `Full：${k} 个专家`, bFaster: (k) => `Faster：${k} 个专家`,
      mb: (x) => `${x} MB`,
      barTotal: (x) => `共 ${x} MB`,
      axis: '深色 = 从内存槽位或 SSD 读；浅色 = 常驻显存',
      sShareK: '常驻显存的专家占比',
      sShareV: (p) => `${p}%`,
      sShareF: (n, total, p) => `<b>= ${n} ÷ ${total} = ${p}%</b><br>能放进显存的整个专家数 ÷ 15,360`,
      sBudgetK: '这张卡的专家预算',
      sBudgetV: (g) => `${g} GB`,
      sBudgetF: (free, n, sz) => `<b>=（${free} GiB × 1024 − 600 MiB 预留）× 1.0</b><br>÷ ${sz} MB/个，向下取整 = ${n} 个专家（集成显卡的额外预留和换入空槽这里不计）`,
      sFullK: 'Full 每字要从内存或 SSD 读',
      sFullV: (x) => `${x} MB`,
      sFullF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − 常驻比例) = ${off}% 不在显存</b><br>先算每字专家总字节，再乘上不在显存的份额`,
      sFastK: 'Faster 每字要从内存或 SSD 读',
      sFastV: (x) => `${x} MB`,
      sFastF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − 常驻比例) = ${off}% 不在显存</b><br>名单短一格，其余算法相同`,
      sSaveK: 'Faster 省下的搬运',
      sSaveV: (mb, pct) => `${mb} MB（${pct}%）`,
      sSaveF: (sz) => `<b>= 少选的 1 个专家 × ${sz} MB × 不在显存的份额</b><br>个数之比永远是 −1 ÷ 6 ≈ −16.7%；没有要搬的字节时，没有可省的`,
      verdictOff: (full, fast, saved) => `这个显存下，Full 每字要从内存或 SSD 读 <b>${full} MB</b>，Faster 是 <b>${fast} MB</b>，省下 <b>${saved} MB</b>。省的是搬运：常驻显存的专家，5 个和 6 个都在卡上算。`,
      verdictAll: '这个显存装得下全部专家：每字不用从内存或 SSD 读任何东西，Faster 没有搬运可省。它仍然少算一个专家，但那不是这张图量的东西。',
      try: [
        '把显存拖到 <b>0 GiB</b>：和上面那张静态图一样，6 个专家 112.8 MB，5 个 94 MB，省 18.8 MB。这是“6 个都不常驻”的上限账单。',
        '拖到 <b>12 GiB</b>（一台普通电脑的量级）：只有约 4% 的专家放得下，账单几乎没变，Faster 照样省约六分之一。显存小的机器，Faster 的好处最大。',
        '拖到 <b>270 GiB</b> 以上：全部专家常驻，两条横条都变成浅色，省下的搬运变成 0。再切到 <b>2 比特集</b>，同样的显存装得下更多专家，每字要读的字节也少得多。',
      ],
    },
  });

  const pct1 = (x) => (Math.round(x * 1000) / 10).toString();
  const mb1 = (x) => Viz.fmt(x, 1);

  Viz.register('ds-experts-faster', {
    mount(el) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgOff },
        { color: 'var(--frame)', text: T.lgOn },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.insertAdjacentHTML('beforeend',
        `<div class="viz-row" style="margin-top:0"><span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${T.setLabel}</span>${M.SETS.map(s => `<button type="button" class="viz-btn ghost" data-set="${s}" aria-pressed="false" style="padding:5px 9px;font-size:12px">${Viz.esc(T.sets[s])}</button>`).join('')}</div>
        <div class="viz-slider"><label for="dsef-mem">${T.memLabel}</label><input id="dsef-mem" type="range" min="0" max="${M.MAX_FREE_GIB}" step="1" value="${M.DEFAULT_FREE_GIB}" aria-label="${Viz.esc(T.memAria)}"><output aria-live="polite">${T.gib(M.DEFAULT_FREE_GIB)}</output></div>`);
      const svg = Viz.svg('svg', { viewBox: '0 0 400 150', class: 'viz-stage', role: 'img', 'aria-label': T.title }, left);
      right.innerHTML =
        Viz.stat({ id: 'e-share', k: T.sShareK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'e-budget', k: T.sBudgetK, v: '', f: '' }) +
        Viz.stat({ id: 'e-full', k: T.sFullK, v: '', f: '' }) +
        Viz.stat({ id: 'e-fast', k: T.sFastK, v: '', f: '' }) +
        Viz.stat({ id: 'e-save', k: T.sSaveK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      let free = M.DEFAULT_FREE_GIB, set = M.DEFAULT_SET;

      const txt = (x, y, s, opt = {}) => { const t = Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': opt.anchor || 'start', style: `fill:${opt.color || 'var(--muted)'}` }, svg); t.textContent = s; return t; };

      function bar(y, label, bill, scale) {
        txt(12, y, label, { color: 'var(--ink)' });
        const x0 = 12, wTotal = 376, wAll = bill.totalMB * scale, wOff = bill.offMB * scale;
        // Soft part first (resident), dark part (read from RAM or SSD) on top from the left edge.
        Viz.svg('rect', { x: x0, y: y + 6, width: wAll, height: 24, class: 'viz-cell', style: 'stroke:var(--frame)' }, svg);
        if (wOff > 0) Viz.svg('rect', { x: x0, y: y + 6, width: wOff, height: 24, style: 'fill:var(--accent)' }, svg);
        const inside = wOff >= 150;
        if (inside) txt(x0 + wOff / 2, y + 22, T.mb(mb1(bill.offMB)), { anchor: 'middle', color: 'var(--paper)' });
        else txt(Math.min(x0 + wOff + 6, wTotal - 40), y + 46, T.mb(mb1(bill.offMB)), { color: 'var(--ink)' });
        return y;
      }

      function draw() {
        svg.innerHTML = '';
        const c = M.compare(free, set), scale = 376 / c.full.totalMB;
        bar(14, T.bFull(M.FULL_K), c.full, scale);
        bar(74, T.bFaster(M.FASTER_K), c.faster, scale);
        txt(12, 144, T.axis);
        const n = M.residentExperts(free, set), share = M.residentShare(free, set), budget = M.vramBudgetMB(free) / 1000;
        const offPct = pct1(1 - share);
        $('[data-s=e-share-v]').textContent = T.sShareV(pct1(share));
        $('[data-s=e-share-f]').innerHTML = T.sShareF(Viz.fmt(n), Viz.fmt(M.TOTAL_EXPERTS), pct1(share));
        $('[data-s=e-budget-v]').textContent = T.sBudgetV(Viz.fmt(budget, 1));
        $('[data-s=e-budget-f]').innerHTML = T.sBudgetF(free, Viz.fmt(n), c.full.sizeMB);
        $('[data-s=e-full-v]').textContent = T.sFullV(mb1(c.full.offMB));
        $('[data-s=e-full-f]').innerHTML = T.sFullF(M.FULL_K, c.full.sizeMB, offPct);
        $('[data-s=e-fast-v]').textContent = T.sFastV(mb1(c.faster.offMB));
        $('[data-s=e-fast-f]').innerHTML = T.sFastF(M.FASTER_K, c.faster.sizeMB, offPct);
        $('[data-s=e-save-v]').textContent = T.sSaveV(mb1(c.savedMB), pct1(c.savedPct));
        $('[data-s=e-save-f]').innerHTML = T.sSaveF(c.full.sizeMB);
        $('.viz-verdict').innerHTML = c.full.offMB > 0 ? T.verdictOff(mb1(c.full.offMB), mb1(c.faster.offMB), mb1(c.savedMB)) : T.verdictAll;
        el.querySelectorAll('[data-set]').forEach(b => { const on = b.dataset.set === set; b.classList.toggle('ghost', !on); b.setAttribute('aria-pressed', String(on)); });
        $('output').textContent = T.gib(free);
        svg.setAttribute('aria-label', `${T.title}: ${T.bFull(M.FULL_K)} ${T.mb(mb1(c.full.offMB))}; ${T.bFaster(M.FASTER_K)} ${T.mb(mb1(c.faster.offMB))}`);
      }
      el.querySelectorAll('[data-set]').forEach(b => { b.onclick = () => { set = b.dataset.set; draw(); }; });
      const range = $('input[type=range]');
      range.oninput = () => { free = +range.value; draw(); };
      draw();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
