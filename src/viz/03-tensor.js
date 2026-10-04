/* Chapter 03 widgets: a matrix-vector product step by step, and strided addressing of a small 3-D tensor.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.tensor;
  const num = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const vec = a => '[' + a.map(num).join(', ') + ']';

  const T = Viz.t({
    zh: {
      code: 'MATVEC', title: '矩阵乘向量，一步一步', tag: '教学推演 · 小矩阵手算',
      intro: 'W 是 2 × 3 的矩阵，x 是 3 个数。按 <b>单步</b>，看 y = Wx 怎样一行一行算出来。拖动 x 的三个滑块，再按单步，看哪些输出跟着变。',
      lgRow: '正在用的一行权重', lgX: '正在相乘的输入', lgY: '刚算出的输出',
      steps: ['取第 1 行', '对应相乘', '相加得 y₁', '取第 2 行', '对应相乘', '相加得 y₂'],
      bStep: '▶ 单步', bReset: '重置',
      xLabel: (k) => `x${['₁', '₂', '₃'][k]}`, bLabel: '同时算几个输入 b',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始',
      t0: (r, row, x) => `<span class="c">第 ${r} 行</span>：W 的第 ${r} 行是 ${row}，要和 x = ${x} 一一配对`,
      t1: (prods) => `<span class="m">对应相乘</span>：${prods}`,
      t2: (r, sum, y) => `<span class="y">相加</span>：${sum} = ${y}，这就是 y${r === 1 ? '₁' : '₂'}。一个输出 = 一次点积`,
      done: (y) => `<span class="w">完成</span>：y = ${y}。2 行 × 3 列，一共 6 次乘加`,
      eqIdle: '按单步开始计算',
      sShapeK: 'y 的形状', sShapeF: '<b>= (2 × 3) · (3 × 1)</b><br>中间的 3 必须相等，然后消掉',
      sMacK: '乘加次数', sMacF: (b) => `<b>= 2 × 3 × ${b}</b><br>每个输入都要和每个权重乘一次`,
      sReuseK: '每读一次权重，用几次', sReuseF: '<b>= b</b><br>b = 1 叫 GEMV；b > 1 叫 GEMM',
      try: [
        '连按 <b>单步</b> 走完两行：每个输出都是“一行权重”和“整个 x”的点积。',
        '把 x 设成 <b>[0, 1, 0]</b> 再算：y 正好等于 W 的第 2 列。x 只有一个 1 时，Wx 就是把 W 的某一列挑出来。',
        '把 b 从 1 拉到 8：乘加次数涨 8 倍，可权重还是那 6 个。一份权重被用 8 次，这就是批量计算省搬运的来源（第 5 章）。',
      ],

      sCode: 'STRIDE_LAB', sTitle: '同一个元素，两个地址', sTag: '教学推演 · 缩小版 GDN 状态',
      sIntro: '一个三维数组，三个轴叫 i、h、j，大小是 2、3、2，一共 12 个数。内存只有一条线，12 个数总得排个先后。点上面任意一个格子，看它排在内存的第几位；再切换排法，看同一个格子搬到了哪里。',
      lgSel: '选中的元素', lgRead: '这次读到的地址', lgCell: '内存里的一格',
      sSteps: ['选元素', '查步长', '坐标 × 步长', '加起来 = 地址'],
      layA: '(i, h, j)：j 最快', layB: '(i, j, h)：h 最快',
      layNoteA: 'Strata 内核的排法', layNoteB: '参考实现的排法',
      block: (i) => `i = ${i}`, rowH: (h) => `h=${h}`, colJ: (j) => `j=${j}`,
      memLabel: '内存（地址 0–11）',
      walk: '▶ 固定 i，按 h、j 顺序读一遍',
      sReady: '<span class="c">$</span> ready. 点上面任意一个格子',
      p0: (e) => `<span class="c">选中</span> 元素 ${e}`,
      p1: (si, sh, sj) => `<span class="c">步长</span>：这种排法下 i 每加 1 跨 ${si} 格，h 跨 ${sh} 格，j 跨 ${sj} 格`,
      p2: (expr) => `<span class="m">相乘再相加</span>：${expr}`,
      p3: (a) => `<span class="y">地址 = ${a}</span>。内存条上高亮的就是它`,
      swap: (lay, e, a) => `<span class="y">// 换成「${lay}」：同一个元素 ${e} 搬到了地址 ${a}</span>`,
      walkLog: (seq, ok) => `<span class="w">读取顺序</span>：${seq}。${ok ? '每步 +1，连续读' : '来回跳着读'}`,
      kStride: '步长 (i, h, j)', fStride: '<b>最快的轴，步长是 1</b><br>往前每个轴 = 它后面各轴大小相乘',
      kAddr: '选中元素的地址', fAddr: (expr) => `<b>= ${expr}</b>`, fAddrIdle: '点一个格子',
      kStep: 'j 加 1，地址加几', vStep: (d) => d === 1 ? '+1（连续）' : `+${d}（跳着）`, fStep: '一组 GPU 线程读连续地址时最快',
      sTry: [
        '点 <b>i=1, h=2, j=0</b> 这一格，再切换排法：地址从 10 变成 8。两个地址都在 0–11 之内，越界检查发现不了“用错排法”。',
        '按 <b>固定 i 读一遍</b>：j 最快时地址连续 +1；h 最快时来回跳。GPU 上一组线程读相邻地址最划算，这就是 Strata 改排法的原因。',
        '看“步长”一栏：最后一个轴的步长总是 1，前面每个轴的步长 = 它后面所有轴的大小相乘。会算步长，就会算任意张量的地址。',
      ],
      sVerdict: '① 同一个数学元素，换一种排法就换一个地址。<br>② 两种地址都合法、都不越界，所以用错排法不会报错，只会悄悄算错。<br>③ Strata 的 GDN 内核让 j 最快，好让一组线程读连续的内存；它和参考实现的排法不同，必须写进接口说明。',
    },
  });

  const W = [[1, 2, 3], [4, 5, 6]];

  Viz.register('matvec-steps', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgRow, glow: true },
        { color: 'var(--a2)', text: T.lgX },
        { color: 'var(--a3)', text: T.lgY },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      const cellCss = 'display:flex;align-items:center;justify-content:center;height:34px;border:1px solid var(--frame);font-family:var(--mono);font-size:15px;color:var(--ink)';
      const opCss = 'display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--muted)';
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div style="display:grid;grid-template-columns:minmax(0,3fr) 22px minmax(0,1fr) 22px minmax(0,1fr);gap:6px;align-items:center;max-width:360px">
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px">${W.flat().map((w, k) => `<div data-w="${k}" style="${cellCss}">${w}</div>`).join('')}</div>
          <div style="${opCss}">×</div>
          <div style="display:grid;gap:4px">${[0, 1, 2].map(k => `<div data-x="${k}" style="${cellCss}"></div>`).join('')}</div>
          <div style="${opCss}">=</div>
          <div style="display:grid;gap:4px">${[0, 1].map(k => `<div data-y="${k}" style="${cellCss}">?</div>`).join('')}</div>
        </div>
        <div class="mv-eq" style="font-family:var(--mono);font-size:13px;color:var(--ink);margin-top:12px;min-height:20px"></div>
        ${[0, 1, 2].map(k => `<div class="viz-slider"><label>${T.xLabel(k)}</label><input data-xs="${k}" type="range" min="-2" max="2" step="1" value="${[1, 0, -1][k]}" aria-label="${Viz.esc(T.xLabel(k))}"><output data-xo="${k}"></output></div>`).join('')}
        <div class="viz-slider"><label>${T.bLabel}</label><input class="mv-b" type="range" min="1" max="8" step="1" value="1" aria-label="${Viz.esc(T.bLabel)}"><output class="mv-bo">1</output></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bReset, 'ghost')}</div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'mv-shape', k: T.sShapeK, v: '2 × 1', f: T.sShapeF }) +
        Viz.stat({ id: 'mv-mac', k: T.sMacK, v: '6', f: T.sMacF(1) }) +
        Viz.stat({ id: 'mv-reuse', k: T.sReuseK, v: '1', f: T.sReuseF, hot: true });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const bIn = $('.mv-b');
      let phase = -1;
      const x = () => [0, 1, 2].map(k => +el.querySelector(`[data-xs="${k}"]`).value);
      function paint() {
        const xv = x(), y = M.matvec(W, xv), row = phase < 0 ? -1 : phase < 3 ? 0 : 1, sub = phase < 0 ? -1 : phase % 3;
        [0, 1, 2].forEach(k => { el.querySelector(`[data-x="${k}"]`).textContent = num(xv[k]); el.querySelector(`[data-xo="${k}"]`).textContent = num(xv[k]); });
        W.flat().forEach((_, k) => { const c = el.querySelector(`[data-w="${k}"]`), on = Math.floor(k / 3) === row; c.style.borderColor = on ? 'var(--accent)' : 'var(--frame)'; c.style.boxShadow = on ? 'var(--glow)' : 'none'; c.style.background = on ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'transparent'; });
        [0, 1, 2].forEach(k => { el.querySelector(`[data-x="${k}"]`).style.borderColor = sub >= 1 ? 'var(--a2)' : 'var(--frame)'; });
        [0, 1].forEach(r => {
          const c = el.querySelector(`[data-y="${r}"]`), known = r < row || (r === row && sub === 2) || phase >= 6;
          c.textContent = known ? num(y[r]) : '?';
          c.style.borderColor = r === row && sub === 2 ? 'var(--a3)' : 'var(--frame)';
        });
        const b = +bIn.value, cst = M.cost(2, 3, b);
        $('.mv-bo').textContent = b;
        $('[data-s=mv-mac-v]').textContent = cst.macs;
        $('[data-s=mv-mac-f]').innerHTML = T.sMacF(b);
        $('[data-s=mv-reuse-v]').textContent = cst.reuse;
        const r = row >= 0 ? W[row] : null;
        $('.mv-eq').textContent = !r ? T.eqIdle : sub === 0 ? `${vec(r)} · ${vec(xv)}` : r.map((w, k) => `${w}×${xv[k] < 0 ? '(' + num(xv[k]) + ')' : xv[k]}`).join(' + ') + (sub === 2 ? ` = ${num(y[row])}` : '');
      }
      function step() {
        phase = phase >= 5 ? 0 : phase + 1;
        pipe.set(phase);
        const xv = x(), y = M.matvec(W, xv), row = phase < 3 ? 0 : 1, r = W[row];
        if (phase % 3 === 0) term.log(T.t0(row + 1, vec(r), vec(xv)));
        if (phase % 3 === 1) term.log(T.t1(r.map((w, k) => `${w}×${xv[k] < 0 ? '(' + num(xv[k]) + ')' : xv[k]} = ${num(w * xv[k])}`).join('，')));
        if (phase % 3 === 2) term.log(T.t2(row + 1, r.map((w, k) => num(w * xv[k])).map((s, k) => (k && s[0] === '−' ? `(${s})` : s)).join(' + '), num(y[row])));
        if (phase === 5) term.log(T.done(vec(y)));
        paint();
      }
      const [stepBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      stepBtn.onclick = step;
      resetBtn.onclick = () => { phase = -1; pipe.set(-1); [1, 0, -1].forEach((v, k) => { el.querySelector(`[data-xs="${k}"]`).value = v; }); bIn.value = 1; term.clear(); term.log(T.ready); paint(); };
      el.querySelectorAll('input[type=range]').forEach(i => { i.oninput = paint; });
      paint();
    },
  });

  Viz.register('stride-explorer', {
    mount(el, ctx) {
      const shape = { i: 2, h: 3, j: 2 }, orders = [['i', 'h', 'j'], ['i', 'j', 'h']];
      const body = Viz.frame(el, { code: T.sCode, title: T.sTitle, tag: T.sTag, intro: T.sIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgSel, glow: true },
        { color: 'var(--a2)', text: T.lgRead },
        { color: 'var(--frame)', text: T.lgCell },
      ]));
      const pipe = Viz.pipe(body, T.sSteps);
      const cell = 'display:flex;align-items:center;justify-content:center;border:1px solid var(--frame);font-family:var(--mono);font-size:12px;color:var(--ink);background:transparent;padding:0;cursor:pointer;min-width:0';
      const blocks = [0, 1].map(i => `<div style="min-width:0"><div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-bottom:4px">${T.block(i)}</div>
        <div style="display:grid;grid-template-columns:34px repeat(2,minmax(0,1fr));gap:3px;align-items:center">
        <span></span>${[0, 1].map(j => `<span style="font-family:var(--mono);font-size:11px;color:var(--muted);text-align:center">${T.colJ(j)}</span>`).join('')}
        ${[0, 1, 2].map(h => `<span style="font-family:var(--mono);font-size:11px;color:var(--muted)">${T.rowH(h)}</span>${[0, 1].map(j => `<button type="button" data-e="${i}${h}${j}" style="${cell};height:30px">${i}${h}${j}</button>`).join('')}`).join('')}
        </div></div>`).join('');
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div class="viz-row" style="margin-top:0">${orders.map((o, k) => `<button type="button" class="viz-btn${k ? ' ghost' : ''}" data-lay="${k}">${k ? T.layB : T.layA}</button>`).join('')}</div>
        <div class="se-note" style="font-size:12.5px;color:var(--muted);margin:6px 0 12px"></div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">${blocks}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin:14px 0 4px">${T.memLabel}</div>
        <div class="se-mem" style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:2px"></div>
        <div class="viz-row">${Viz.button(T.walk, 'alt se-walk')}</div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.sReady);
      right.innerHTML =
        Viz.stat({ id: 'se-st', k: T.kStride, v: '', f: T.fStride }) +
        Viz.stat({ id: 'se-ad', k: T.kAddr, v: '—', f: T.fAddrIdle, hot: true }) +
        Viz.stat({ id: 'se-dj', k: T.kStep, v: '', f: T.fStep });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.sTry) + `<div class="viz-verdict" hidden>${T.sVerdict}</div>`);
      const $ = s => el.querySelector(s);
      let lay = 0, sel = null, busy = false;
      const seen = new Set();
      const label = e => `(i=${e.i}, h=${e.h}, j=${e.j})`;
      const addrOf = e => M.offset(e, shape, orders[lay]);
      const expr = e => { const s = M.strides(shape, orders[lay]); return `${e.i}×${s.i} + ${e.h}×${s.h} + ${e.j}×${s.j}`; };
      function paint(reading) {
        const s = M.strides(shape, orders[lay]);
        $('.se-note').textContent = lay ? T.layNoteB : T.layNoteA;
        el.querySelectorAll('[data-lay]').forEach(b => b.classList.toggle('ghost', +b.dataset.lay !== lay));
        const mem = new Array(12);
        for (let i = 0; i < 2; i++) for (let h = 0; h < 3; h++) for (let j = 0; j < 2; j++) mem[M.offset({ i, h, j }, shape, orders[lay])] = `${i}${h}${j}`;
        const selKey = sel ? `${sel.i}${sel.h}${sel.j}` : '';
        $('.se-mem').innerHTML = mem.map((k, a) => {
          const on = k === selKey, rd = reading && reading.has(a);
          return `<div style="border:1px solid ${on ? 'var(--accent)' : rd ? 'var(--a2)' : 'var(--frame)'};background:${on ? 'var(--accent)' : rd ? 'color-mix(in srgb,var(--a2) 25%,transparent)' : 'transparent'};color:${on ? 'var(--paper)' : 'var(--ink)'};text-align:center;font-family:var(--mono);font-size:11px;line-height:1.3;padding:3px 0;min-width:0;overflow:hidden"><small style="display:block;font-size:10px;opacity:.7">${a}</small>${k}</div>`;
        }).join('');
        el.querySelectorAll('[data-e]').forEach(b => { const on = b.dataset.e === selKey; b.style.background = on ? 'var(--accent)' : 'transparent'; b.style.color = on ? 'var(--paper)' : 'var(--ink)'; b.style.borderColor = on ? 'var(--accent)' : 'var(--frame)'; });
        $('[data-s=se-st-v]').textContent = `(${s.i}, ${s.h}, ${s.j})`;
        $('[data-s=se-dj-v]').textContent = T.vStep(s.j);
        if (sel) { $('[data-s=se-ad-v]').textContent = addrOf(sel); $('[data-s=se-ad-f]').innerHTML = T.fAddr(expr(sel)); }
        if (sel) seen.add(lay);
        if (seen.size === 2) $('.viz-verdict').hidden = false;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true;
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false;
      }
      el.querySelectorAll('[data-e]').forEach(b => { b.onclick = () => guard(async () => {
        const k = b.dataset.e; sel = { i: +k[0], h: +k[1], j: +k[2] };
        const s = M.strides(shape, orders[lay]);
        pipe.set(0); term.log(T.p0(label(sel))); paint(); await ctx.sleep(220);
        pipe.set(1); term.log(T.p1(s.i, s.h, s.j)); await ctx.sleep(220);
        pipe.set(2); term.log(T.p2(expr(sel))); await ctx.sleep(220);
        pipe.set(3); term.log(T.p3(addrOf(sel))); paint();
      }); });
      el.querySelectorAll('[data-lay]').forEach(b => { b.onclick = () => guard(async () => {
        lay = +b.dataset.lay; paint();
        if (sel) term.log(T.swap(lay ? T.layB : T.layA, label(sel), addrOf(sel)));
      }); });
      el.querySelector('.se-walk').onclick = () => guard(async () => {
        const i = sel ? sel.i : 1, seq = [], reading = new Set();
        for (let h = 0; h < 3; h++) for (let j = 0; j < 2; j++) { const a = M.offset({ i, h, j }, shape, orders[lay]); seq.push(a); reading.add(a); paint(reading); await ctx.sleep(260); }
        const ok = seq.every((a, k) => !k || a === seq[k - 1] + 1);
        term.log(T.walkLog(seq.join(' → '), ok));
        await ctx.sleep(500); paint();
      });
      paint();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
