/* Chapter 17 widgets: the KV budget calculator and the CLOCK paging step-through.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.kv;
  const CTX = [4096, 8192, 16384, 32768, 65536, 131072, 262144];
  const FMTS = ['f16', 'int8', 'k8v4', 'q4'];
  const BLOCK_BYTES = 4224;                                 // one INT8 page: 4 cells, both heads, K and V
  const QUERIES = [[0, 1, 2], [1, 2, 3], [0, 5], [5, 6, 1], [2, 9, 10], [9, 10, 11], [5, 6, 0], [1, 2, 3]];

  const T = Viz.t({
    zh: {
      code: 'KV_BUDGET', title: 'KV 预算器', tag: '教学推演 · 只算主 KV 与 GDN 状态',
      intro: '选上下文长度、KV 格式和要保留的对话数，看字节数怎样变。Strata 的服务一次只跑<b>一段</b>对话；其余对话可以把状态“停放”在内存里。注意看同一个字节数写成 <b>GB</b> 和 <b>GiB</b> 时差多少。',
      lgVkv: '显存里的 KV', lgGdn: 'GDN 递推状态（固定大小）', lgRkv: '内存里的 KV 主副本（流式）', lgPark: '停放在内存的其他对话',
      stageLabel: '显存与内存的占用条', vram: '显存', ram: '内存',
      ctxLabel: '上下文长度', sesLabel: '保留几段对话',
      fmtNames: { f16: 'FP16', int8: 'INT8', k8v4: 'K8V4', q4: 'Q4_0' },
      bStream: (on) => on ? 'KV 流式：开' : 'KV 流式：关',
      tok: (x) => `${x} token`, ses: (x) => `${x} 段`,
      barText: (gib, gb) => `${gib} GiB（= ${gb} GB）`,
      sPtK: '每个 token 的 KV', sPtF: (cell) => `<b>= 12 层 × ${cell} 字节</b><br>每层 2 个 KV 头 × 256 维 × K、V 两份`,
      sOneK: '一段对话的 KV', sOneF: (ctx, pt, b, gb) => `<b>= ${ctx} × ${pt} = ${b} 字节 ≈ ${gb} GB</b><br>GB 除以 10⁹，GiB 除以 2³⁰`,
      sVramK: '显存合计（正在跑的那段）', sVramF: (cells) => `<b>= KV 驻留 ${cells} 格 + GDN 状态 112.2 MiB</b><br>不含权重、专家缓存和临时缓冲`,
      sRamK: '内存合计', sRamF: '<b>= 流式 KV 主副本 + 停放的对话</b><br>每段停放对话 = 它的 KV + GDN 状态',
      gibOf: gib => `${gib} GiB`,
      tChange: (ctx, pt, b, gb, gib) => `<span class="c">${ctx} 格</span> × ${pt} B = ${b} B = <span class="y">${gb} GB</span> = <span class="w">${gib} GiB</span>`,
      tStream: (on) => on ? '<span class="m">流式打开</span>：64K 起，显存只留 32,768 格常用的页，完整历史在内存' : '<span class="m">流式关闭</span>：整段 KV 都放在显存里',
      tFmt: (name, cell, scaled) => `<span class="c">格式 ${name}</span>：每层每格 ${cell} 字节${scaled ? '（含缩放系数）' : '（不需要缩放系数）'}`,
      vBase: (gb, gib, pct) => `同一段 KV：<b>${gb} GB</b>，也就是 <b>${gib} GiB</b>。GiB 的数字小了约 ${pct}%，因为 1 GiB 比 1 GB 多 7.4%。`,
      vStream: '<br>流式已生效：显存只放 32,768 格，完整历史在内存里，没有被删掉。',
      vShort: '<br>上下文不到 64K，流式不会启动：整段 KV 都在显存里。',
      vBlocked: '<br><b>注意：</b>K8V4 不走 KV 流式（上游文档写明），所以这里整段 KV 都留在显存。两个“省内存”开关不能叠加。',
      vPark: (n, gib) => `<br>另外 ${n} 段停放的对话占内存 ${gib} GiB；上游示例给停放缓存设的上限是 8 GiB。`,
      try: [
        '选 <b>FP16</b>、32K：一段对话的 KV 是 805,306,368 字节，也就是 805.3 MB 或 768 MiB。Strata 源码注释把它写成了“805 MiB”，单位标错了。',
        '把上下文从 32K 拉到 128K：KV 正好翻 4 倍；再打开流式，显存那条立刻变短，内存那条变长。历史没少，只是换了地方。',
        '选 <b>K8V4</b> 再拉到 256K：流式开关不起作用。“比 INT8 少 23%”和“只在显存留 32K”这两个好处不能同时拿到。',
      ],

      pCode: 'KV_PAGING', pTitle: '页表与换页', pTag: '教学推演 · 12 个块、4 个显存槽',
      pIntro: '历史按 4 个 token 一块切开，<b>完整的一份</b>一直在内存里；显存只有 4 个槽位。每一步注意力选中几块，按 <b>单步</b> 看页表怎样把它们换进显存。',
      pLgHost: '内存里的块（完整历史）', pLgSlot: '住在显存槽里的块', pLgNew: '这一步刚换进来', pLgRef: '引用位 = 1（最近用过）',
      pSteps: ['选中块', '查页表', 'CLOCK 选槽位', '从内存拷贝', '注意力读取'],
      pStage: '内存里的 12 个块、页表和 4 个显存槽', hostTitle: '内存：完整历史（每块 4 个 token）', slotTitle: '显存：4 个槽位', ptRow: '页表',
      slotBlock: (b) => b < 0 ? '空' : `块 ${b}`, refBit: (r) => `引用 ${r}`, hand: '▲ 指针',
      bStep: '▶ 单步', bReset: '重置',
      pReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]，一共 8 次查询',
      sHitK: '命中 / 缺页', sHitF: '<b>命中 = 块已在显存槽里</b><br>缺页 = 要从内存拷贝',
      sRateK: '命中率', sRateF: '<b>= 命中 ÷ (命中 + 缺页)</b>',
      sBytesK: '经 PCIe 拷贝的字节', sBytesF: '<b>= 缺页数 × 4,224 字节</b><br>INT8 下一块（4 格、2 头、K 和 V）',
      q0: (n, ids) => `<span class="c">[查询 ${n}]</span> 注意力这一步选中块 ${ids}`,
      q1: (hits, miss) => `<span class="m">查页表</span>：${hits.length ? '块 ' + hits.join('、') + ' 已在显存（命中，引用位设为 1）' : '没有命中'}；${miss.length ? '块 ' + miss.join('、') + ' 不在（页表里是 —）' : '全部命中'}`,
      q2none: '<span class="y">CLOCK</span>：不需要换出任何块',
      q2: (b, slot, ev) => ev >= 0 ? `<span class="y">CLOCK</span>：指针扫过槽位，引用位是 1 的先清零、放过一次；块 ${b} 放进槽 ${slot}，换出块 ${ev}（它在内存里还有完整一份）` : `<span class="y">CLOCK</span>：槽 ${slot} 还空着，块 ${b} 直接住进去`,
      q3: (n, bytes) => n ? `<span class="w">拷贝</span>：${n} 块 × 4,224 B = ${bytes} B 从内存经 PCIe 搬进显存` : '<span class="w">拷贝</span>：这一步不用搬',
      q4: '<span class="c">→</span> 注意力通过页表读到全部选中的块，读到的数值和全放显存时一样',
      pVerdict: (rate, bytes) => `① 8 次查询的命中率是 <b>${rate}%</b>，共搬了 ${bytes} 字节。<br>② 被换出的块没有消失：内存里一直有完整一份，下次选中时再搬回来。显存只决定“快不快”，不决定“对不对”。<br>③ Strata 的写入也遵守这一点：新 token 总写进内存那份，只有块正住在显存时才顺手写一份，所以显存槽永远不会过期。`,
      pTry: [
        '连按 <b>单步</b> 走完第 1–2 次查询：块 0–3 依次住进 4 个槽位，页表从 “—” 变成槽号。',
        '盯住第 3 次查询的 CLOCK 一步：引用位为 1 的槽先被清零放过，指针转一圈后才挑出换出的块，这就是“第二次机会”。',
        '走完 8 次，看命中率：最后一次又查块 1–3，它们早被换出，只能重新搬。工作集比槽位大时，换页就会反复发生。',
      ],
    },
  });

  Viz.register('kv-budget', {
    mount(el) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgVkv, glow: true },
        { color: 'var(--a2)', text: T.lgGdn },
        { color: 'var(--a3)', text: T.lgRkv },
        { color: 'var(--frame)', text: T.lgPark },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const X0 = 44, X1 = 354;
      const svg = Viz.svg('svg', { viewBox: '0 0 360 132', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const rows = [T.vram, T.ram].map((name, r) => {
        const y = 10 + r * 62;
        Viz.svg('text', { x: 0, y: y + 17, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = name;
        Viz.svg('rect', { x: X0, y, width: X1 - X0, height: 24, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        return { y, g: Viz.svg('g', {}, svg), t: Viz.svg('text', { x: X0, y: y + 42, 'font-size': 12, style: 'fill:var(--muted)' }, svg) };
      });
      const slider = (label, max, val) => `<div class="viz-slider"><label>${label}</label><input type="range" min="0" max="${max}" value="${val}" aria-label="${Viz.esc(label)}"><output></output></div>`;
      left.insertAdjacentHTML('beforeend', slider(T.ctxLabel, CTX.length - 1, 3) + `<div class="viz-slider"><label>${T.sesLabel}</label><input type="range" min="1" max="5" value="1" aria-label="${Viz.esc(T.sesLabel)}"><output></output></div>` +
        `<div class="viz-row">${FMTS.map(f => Viz.button(T.fmtNames[f], f === 'f16' ? 'alt' : 'ghost')).join('')}${Viz.button(T.bStream(false), 'ghost')}</div>`);
      const term = Viz.term(left, '');
      term.clear();
      right.innerHTML = Viz.stat({ id: 'b-pt', k: T.sPtK, v: '', f: '' }) + Viz.stat({ id: 'b-one', k: T.sOneK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'b-vram', k: T.sVramK, v: '', f: '' }) + Viz.stat({ id: 'b-ram', k: T.sRamK, v: '', f: T.sRamF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [ctxR, sesR] = el.querySelectorAll('input[type=range]');
      const outs = el.querySelectorAll('.viz-slider output');
      const btns = [...el.querySelectorAll('.viz-btn')], fmtBtns = btns.slice(0, 4), streamBtn = btns[4];
      let fmt = 'f16', streaming = false;
      const f2 = x => Viz.fmt(x, 2);

      function update(log) {
        const ctx = CTX[+ctxR.value], sessions = +sesR.value;
        outs[0].textContent = T.tok(Viz.fmt(ctx)); outs[1].textContent = T.ses(sessions);
        const b = M.budget({ ctx, sessions, fmt, streaming }), one = M.units(b.kvOne);
        $('[data-s=b-pt-v]').textContent = Viz.fmt(b.perToken) + ' B';
        $('[data-s=b-pt-f]').innerHTML = T.sPtF(Viz.fmt(M.CELL_BYTES[fmt]));
        $('[data-s=b-one-v]').textContent = T.gibOf(f2(one.gib));
        $('[data-s=b-one-f]').innerHTML = T.sOneF(Viz.fmt(ctx), Viz.fmt(b.perToken), Viz.fmt(b.kvOne), f2(one.gb));
        $('[data-s=b-vram-v]').textContent = f2(M.units(b.vram).gib) + ' GiB';
        $('[data-s=b-vram-f]').innerHTML = T.sVramF(Viz.fmt(b.streams ? M.RESIDENT_CELLS : ctx));
        $('[data-s=b-ram-v]').textContent = f2(M.units(b.ram).gib) + ' GiB';
        const max = Math.max(b.vram, b.ram, 1), sc = (X1 - X0) / max;
        const segs = [[[b.vramKv, 'var(--accent)'], [b.gdn, 'var(--a2)']], [[b.ramKv, 'var(--a3)'], [b.parked, 'var(--frame)']]];
        rows.forEach((row, r) => {
          row.g.innerHTML = '';
          let x = X0;
          segs[r].forEach(([v, color]) => { if (v > 0) { const w = v * sc; Viz.svg('rect', { x, y: row.y + 1, width: Math.max(1, w - 0.5), height: 22, style: 'fill:' + color }, row.g); x += w; } });
          const tot = M.units(r ? b.ram : b.vram);
          row.t.textContent = T.barText(f2(tot.gib), f2(tot.gb));
        });
        let v = T.vBase(f2(one.gb), f2(one.gib), (100 - 1e9 / 2 ** 30 * 100).toFixed(1));
        v += b.blocked ? T.vBlocked : b.streams ? T.vStream : streaming ? T.vShort : '';
        if (b.parked > 0) v += T.vPark(sessions - 1, f2(M.units(b.parked).gib));
        $('.viz-verdict').innerHTML = v;
        if (log) term.log(T.tChange(Viz.fmt(ctx), Viz.fmt(b.perToken), Viz.fmt(b.kvOne), f2(one.gb), f2(one.gib)));
      }
      ctxR.oninput = sesR.oninput = () => update(false);
      ctxR.onchange = sesR.onchange = () => update(true);
      fmtBtns.forEach((btn, i) => {
        btn.onclick = () => {
          fmt = FMTS[i];
          fmtBtns.forEach((b, j) => { b.className = 'viz-btn ' + (j === i ? 'alt' : 'ghost'); });
          term.log(T.tFmt(T.fmtNames[fmt], Viz.fmt(M.CELL_BYTES[fmt]), fmt !== 'f16')); update(true);
        };
      });
      streamBtn.onclick = () => {
        streaming = !streaming;
        streamBtn.textContent = T.bStream(streaming); streamBtn.className = 'viz-btn ' + (streaming ? 'alt' : 'ghost');
        term.log(T.tStream(streaming)); update(false);
      };
      update(true);
    },
  });

  Viz.register('kv-paging', {
    mount(el) {
      const body = Viz.frame(el, { code: T.pCode, title: T.pTitle, tag: T.pTag, intro: T.pIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.pLgHost },
        { color: 'var(--accent)', text: T.pLgSlot, glow: true },
        { color: 'var(--a3)', text: T.pLgNew },
        { color: 'var(--a2)', text: T.pLgRef },
      ]));
      const pipe = Viz.pipe(body, T.pSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 214', class: 'viz-stage', role: 'img', 'aria-label': T.pStage }, left);
      Viz.svg('text', { x: 0, y: 14, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = T.hostTitle;
      const hostRects = [], hostTxt = [], ptTxt = [];
      for (let i = 0; i < 12; i++) {
        const x = i * 30 + 1;
        hostRects.push(Viz.svg('rect', { x, y: 24, width: 27, height: 26, class: 'viz-cell' }, svg));
        hostTxt.push(Viz.svg('text', { x: x + 13.5, y: 42, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--paper);font-weight:700' }, svg));
        hostTxt[i].textContent = String(i);
        ptTxt.push(Viz.svg('text', { x: x + 13.5, y: 70, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--accent)' }, svg));
      }
      Viz.svg('text', { x: 0, y: 92, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.ptRow + ' ↑';
      Viz.svg('text', { x: 0, y: 118, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = T.slotTitle;
      const slots = [0, 1, 2, 3].map(j => {
        const x = j * 90 + 1;
        const r = Viz.svg('rect', { x, y: 128, width: 84, height: 50, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        const b = Viz.svg('text', { x: x + 42, y: 150, 'font-size': 14, 'text-anchor': 'middle', style: 'fill:var(--ink);font-weight:700' }, svg);
        const f = Viz.svg('text', { x: x + 42, y: 170, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg);
        return { r, b, f };
      });
      const hand = Viz.svg('text', { x: 43, y: 200, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--a3);font-weight:700' }, svg);
      hand.textContent = T.hand;
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.pReady);
      right.innerHTML = Viz.stat({ id: 'g-hit', k: T.sHitK, v: '0 / 0', f: T.sHitF }) + Viz.stat({ id: 'g-rate', k: T.sRateK, v: '—', f: T.sRateF, hot: true }) + Viz.stat({ id: 'g-bytes', k: T.sBytesK, v: '0 B', f: T.sBytesF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.pTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const verdict = $('.viz-verdict');
      let st, q, phase, res, selected, fresh, hits, misses;

      function paint() {
        const sel = new Set(selected);
        st.table.forEach((slot, i) => {
          hostRects[i].setAttribute('class', 'viz-cell' + (sel.has(i) ? ' pick' : ''));
          ptTxt[i].textContent = slot < 0 ? '—' : '→' + slot;
        });
        slots.forEach((s, j) => {
          const blk = st.slotBlock[j];
          s.r.setAttribute('style', 'stroke:var(--frame);fill:' + (fresh.has(j) ? 'var(--a3)' : blk >= 0 ? 'var(--accent)' : 'var(--side)'));
          s.b.textContent = T.slotBlock(blk);
          s.b.setAttribute('style', 'font-weight:700;fill:' + (blk >= 0 ? 'var(--paper)' : 'var(--muted)'));
          s.f.textContent = blk >= 0 ? T.refBit(st.ref[j]) : '';
          s.f.setAttribute('style', 'fill:' + (blk >= 0 ? 'var(--paper)' : 'var(--muted)') + (st.ref[j] ? ';font-weight:700' : ''));
        });
        hand.setAttribute('x', st.hand * 90 + 43);
        const total = hits + misses;
        $('[data-s=g-hit-v]').textContent = `${hits} / ${misses}`;
        $('[data-s=g-rate-v]').textContent = total ? Math.round(hits / total * 100) + '%' : '—';
        $('[data-s=g-bytes-v]').textContent = Viz.fmt(misses * BLOCK_BYTES) + ' B';
      }
      function reset() {
        st = M.pagingState(12, 4); q = 0; phase = 0; res = null; selected = []; fresh = new Set(); hits = 0; misses = 0;
        pipe.set(-1); verdict.hidden = true; term.clear(); term.log(T.pReady); paint();
      }
      function step() {
        if (q >= QUERIES.length) reset();
        pipe.set(phase);
        if (phase === 0) { fresh = new Set(); selected = QUERIES[q]; term.log(T.q0(q + 1, selected.join('、'))); }
        if (phase === 1) {
          const hitIds = selected.filter(b => st.table[b] >= 0), missIds = selected.filter(b => st.table[b] < 0);
          term.log(T.q1(hitIds, missIds));
        }
        if (phase === 2) {
          res = M.resolve(st, selected);
          if (!res.misses.length) term.log(T.q2none);
          res.misses.forEach(m => { fresh.add(m.slot); term.log(T.q2(m.block, m.slot, m.evicted)); });
        }
        if (phase === 3) {
          hits += res.hits.length; misses += res.misses.length;
          term.log(T.q3(res.misses.length, Viz.fmt(res.misses.length * BLOCK_BYTES)));
        }
        if (phase === 4) {
          term.log(T.q4);
          q++;
          if (q === QUERIES.length) {
            verdict.innerHTML = T.pVerdict(Math.round(hits / (hits + misses) * 100), Viz.fmt(misses * BLOCK_BYTES));
            verdict.hidden = false;
          }
        }
        paint();
        phase = (phase + 1) % 5;
      }
      stepBtn.onclick = step;
      resetBtn.onclick = reset;
      reset();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
