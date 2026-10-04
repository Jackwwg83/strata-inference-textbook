/* Chapter 13 widgets: one decode layer on CPU + GPU, and SIMD lanes versus a dependent chain.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.hetero;

  const T = Viz.t({
    zh: {
      code: 'LAYER_TIMELINE', title: '一层之内：GPU 和 CPU 同时算', tag: '教学推演 · 带宽取理论峰值',
      intro: '一层的流程：GPU 先算注意力和路由，选出 10 个专家；在显存里的（命中）交给 GPU，一部分没命中的经 PCIe 交给 GPU，剩下的交给 CPU；两边都算完才能汇合，进入下一层。拖动滑块改命中率和 PCIe 份额，看哪一边成了<b>关键路径</b>。专家个数按平均值算，可以带小数。',
      lgGpu: 'GPU：注意力、路由、合并', lgMoe: 'GPU：命中的专家 ＋ PCIe 送来的专家', lgCpu: 'CPU：其余没命中的专家', lgPcie: 'PCIe 搬运',
      steps: ['注意力 ＋ 路由', '分派专家', '两边同时算', '汇合', '合并写回'],
      lane: { gpu: 'GPU', cpu: 'CPU', pcie: 'PCIe' },
      axis: (ms) => `${ms} ms`,
      crit: (who, ms) => `关键路径：${who === 'cpu' ? 'CPU 分支' : 'GPU 分支'}（${ms} ms）`,
      critSerial: (ms) => `串行：CPU 算完 GPU 才开始（共 ${ms} ms）`,
      hLabel: '命中率 h', fLabel: 'PCIe 份额 f',
      bPlay: '▶ 播放一层', bBest: '设为最佳份额', bOverlapOn: '两边同时算：开', bOverlapOff: '两边同时算：关（先 CPU 后 GPU）',
      ready: '<span class="c">$</span> ready. 拖动滑块，或按 [ ▶ 播放一层 ]',
      l0: (pre) => `<span class="c">[GPU]</span> 注意力 ＋ 路由，约 ${pre} ms（教学假设）。路由选出 10 个专家`,
      l1: (hits, pcie, cpu) => `<span class="y">分派</span>：${hits} 个在显存（命中）→ GPU；${pcie} 个经 PCIe → GPU；${cpu} 个 → CPU`,
      l2: (g, c, ov) => ov ? `<span class="m">并行</span>：GPU 分支 ${g} ms，CPU 分支 ${c} ms，同时进行` : `<span class="m">串行</span>：GPU 要等 CPU 先算完 ${c} ms，再算自己的 ${g} ms`,
      l3: (who, ms) => `<span class="c">汇合</span>：等慢的那一边。这次是 ${who === 'cpu' ? 'CPU' : 'GPU'}，用时 ${ms} ms`,
      l4: (t, tok) => `<span class="c">→</span> 合并 10 份结果写回主干。这一层 ${t} ms；48 层约 ${tok} ms`,
      sLayerK: '这一层用时', sLayerF: (ov) => ov ? '<b>= 注意力路由 ＋ max(CPU, GPU) ＋ 合并</b><br>两边同时算，取慢的一边' : '<b>= 注意力路由 ＋ CPU ＋ GPU ＋ 合并</b><br>先后来，两段相加',
      sTokK: '一个 token（48 层）', sTokF: '<b>= 48 × 每层用时</b><br>不含草稿、采样等其他开销',
      sBranchK: 'CPU 分支 / GPU 分支', sBranchF: (cpu, pcie) => `<b>CPU：${cpu} 个 × 1.3824 MB ÷ 40 GB/s</b><br>GPU：命中从显存读（672 GB/s），<br>${pcie} 个经 PCIe（63 GB/s）`,
      sBestK: '让两边同时完成的 PCIe 份额', sBestF: '<b>f* 使 CPU 用时 = GPU 用时</b><br>只在“两边互不抢带宽”的假设下成立',
      try: [
        '把命中率拖到 <b>0%</b>：CPU 要算全部 10 个专家，CPU 分支就是关键路径。再拖到 <b>65%</b>（接近上游开发期留出评估的命中率），这一层快了多少？',
        '把 <b>两边同时算</b> 关掉：GPU 要等 CPU 先算完。命中率越高，CPU 越轻，可 GPU 的那份被排到了 CPU 后面。这正是上游第一版的教训。',
        '按 <b>设为最佳份额</b>：两条分支一样长。再把 f 拖到 100%，GPU 分支反而成了关键路径，整体变慢。',
      ],

      sCode: 'SIMD_LANES', sTitle: '一次算 16 个，和一步一步等', sTag: '计算机原理 · AVX-512 一次 16 个单精度数',
      sIntro: '同样 16 个数，三种算法。<b>逐个相加</b>：一条指令算一个加法。<b>SIMD</b>：一条指令同时算 16 个加法，因为每一格互不相干。<b>累加链</b>：每一格要用前一格的结果，车道再多也只能一格一格来。选一种，按 <b>单步</b>。',
      sLgIn: '输入', sLgNow: '这一步正在算', sLgDone: '已算完', sLgWait: '在等前一格',
      modes: { scalar: '逐个相加', simd: 'SIMD 一次 16 个', chain: '累加链' },
      modeTitle: { scalar: '结果[i] = a[i] + b[i]：一次一个', simd: '结果[i] = a[i] + b[i]：一次 16 个', chain: '结果[i] = 结果[i−1] + a[i]：要等前一格' },
      outLabel: '结果', stepText: (n, total) => `第 ${n} 步 / 共 ${total} 步`,
      bStep: '▶ 单步', bAll: '▶▶ 跑完', bReset: '重置',
      sReady: '<span class="c">$</span> ready. 选一种算法，按 [ ▶ 单步 ]',
      lScalar: (i, a, b, s) => `<span class="c">第 ${i + 1} 步</span>：${a} + ${b} = ${s}，一条指令只算了 1 个数`,
      lSimd: '<span class="c">第 1 步</span>：一条向量加法指令，16 条车道同时算完 16 个加法',
      lChain: (i, p, a, s) => i === 0 ? `<span class="c">第 1 步</span>：结果[0] = a[0] = ${s}` : `<span class="c">第 ${i + 1} 步</span>：结果[${i}] = ${p} + ${a} = ${s}，必须等第 ${i} 步的结果`,
      lDone: (mode, n) => `<span class="y">// ${mode}：共 ${n} 步</span>`,
      sStepsK: '这种算法要几步', sStepsF: { scalar: '<b>= n = 16</b>', simd: '<b>= ⌈n ÷ 16⌉ = 1</b><br>512 位 ÷ 32 位 = 16 条车道', chain: '<b>= n = 16</b><br>车道再多也用不上' },
      sCmpK: '已跑过的算法', sCmpNone: '还没有跑完任何一种',
      sVerdict: '① 逐个相加 16 步，SIMD 只要 1 步：数据互不相干，就能同时算。<br>② 累加链有 16 条车道也要 16 步：每一格都要等前一格，这叫<b>数据依赖</b>。<br>③ 模型的 48 层就是这样一条链：第 l + 1 层的输入是第 l 层的输出。同一层里的 10 个专家互不相干，可以分给 CPU 和 GPU 同时算；层与层之间不行。',
      sTry: [
        '先跑 <b>逐个相加</b>，再跑 <b>SIMD 一次 16 个</b>：结果一样，步数从 16 变成 1。',
        '跑 <b>累加链</b>：注意每一步只有一格在算，其他车道都在等。',
        '三种都跑完，读结论。想一想：模型里哪些计算像“逐个相加”，哪些像“累加链”？',
      ],
    },
  });

  Viz.register('layer-timeline', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgGpu, glow: true },
        { color: 'var(--frame)', text: T.lgMoe },
        { color: 'var(--a2)', text: T.lgCpu },
        { color: 'var(--a3)', text: T.lgPcie },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 196', class: 'viz-stage', role: 'img', 'aria-label': T.title }, left);
      const X0 = 52, SPAN = 300, MAXMS = 0.7, X = ms => X0 + ms / MAXMS * SPAN;
      const lanesY = { gpu: 20, cpu: 62, pcie: 104 };
      Object.entries(lanesY).forEach(([k, y]) => {
        Viz.svg('text', { x: 4, y: y + 18, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = T.lane[k];
        Viz.svg('rect', { x: X0, y, width: SPAN, height: 26, style: 'fill:var(--side)' }, svg);
      });
      [0, 0.2, 0.4, 0.6].forEach(ms => {
        Viz.svg('rect', { x: X(ms) - 0.5, y: 14, width: 1, height: 122, style: 'fill:var(--frame)' }, svg);
        Viz.svg('text', { x: X(ms), y: 152, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = T.axis(ms);
      });
      const bar = (lane, fill) => Viz.svg('rect', { x: X0, y: lanesY[lane] + 2, width: 0, height: 22, style: `fill:${fill}` }, svg);
      const bPre = bar('gpu', 'var(--accent)'), bMoe = bar('gpu', 'var(--frame)'), bPost = bar('gpu', 'var(--accent)');
      const bCpu = bar('cpu', 'var(--a2)'), bPcie = bar('pcie', 'var(--a3)');
      const joinLine = Viz.svg('rect', { x: X0, y: 14, width: 2, height: 122, style: 'fill:var(--ink)' }, svg);
      const cursor = Viz.svg('rect', { x: X0, y: 14, width: 2, height: 122, style: 'fill:var(--a3)', opacity: 0 }, svg);
      const critText = Viz.svg('text', { x: 4, y: 178, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      left.insertAdjacentHTML('beforeend', `
        <div class="viz-slider"><label>${T.hLabel}</label><input type="range" min="0" max="100" step="5" value="65" aria-label="${Viz.esc(T.hLabel)}"><output>65%</output></div>
        <div class="viz-slider"><label>${T.fLabel}</label><input type="range" min="0" max="100" step="5" value="20" aria-label="${Viz.esc(T.fLabel)}"><output>20%</output></div>
        <div class="viz-row">${Viz.button(T.bPlay)}${Viz.button(T.bBest, 'alt')}${Viz.button(T.bOverlapOn, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = Viz.stat({ id: 't-layer', k: T.sLayerK, v: '', f: '', hot: true }) + Viz.stat({ id: 't-tok', k: T.sTokK, v: '', f: T.sTokF }) +
        Viz.stat({ id: 't-br', k: T.sBranchK, v: '', f: '' }) + Viz.stat({ id: 't-best', k: T.sBestK, v: '', f: T.sBestF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [hR, fR] = left.querySelectorAll('input[type=range]');
      const [playBtn, bestBtn, ovBtn] = left.querySelectorAll('.viz-btn');
      let overlap = true, busy = false;
      const f3 = x => x.toFixed(3), f2 = x => x.toFixed(2);
      const cur = () => ({ h: +hR.value / 100, f: +fR.value / 100 });
      function setBar(r, a, b) { r.setAttribute('x', X(a)); r.setAttribute('width', Math.max(0, X(b) - X(a))); }
      function draw() {
        const { h, f } = cur();
        const r = M.layer({ h, f, overlap });
        const pre = M.PRE_MS;
        setBar(bPre, 0, pre);
        const gStart = overlap ? pre : pre + r.cpuMs;
        setBar(bMoe, gStart, gStart + r.gpuMs);
        setBar(bCpu, pre, pre + r.cpuMs);
        setBar(bPcie, gStart, gStart + r.pcieN * M.expertMs(M.PCIE_GBPS));
        setBar(bPost, pre + r.moeMs, r.totalMs);
        joinLine.setAttribute('x', X(pre + r.moeMs) - 1);
                critText.textContent = overlap ? T.crit(r.critical, f3(r.moeMs)) : T.critSerial(f3(r.moeMs));
        hR.nextElementSibling.textContent = hR.value + '%'; fR.nextElementSibling.textContent = fR.value + '%';
        $('[data-s=t-layer-v]').textContent = f3(r.totalMs) + ' ms';
        $('[data-s=t-layer-f]').innerHTML = T.sLayerF(overlap);
        $('[data-s=t-tok-v]').textContent = f2(r.tokenMs) + ' ms';
        $('[data-s=t-br-v]').textContent = f3(r.cpuMs) + ' / ' + f3(r.gpuMs);
        $('[data-s=t-br-f]').innerHTML = T.sBranchF(r.cpuN.toFixed(1), r.pcieN.toFixed(1));
        $('[data-s=t-best-v]').textContent = Math.round(M.bestShare(h) * 100) + '%';
        return r;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      playBtn.onclick = () => guard(async () => {
        const r = draw(), pre = M.PRE_MS;
        cursor.setAttribute('opacity', 1);
        const move = async (ms) => { cursor.setAttribute('x', X(ms) - 1); await ctx.sleep(380); };
        pipe.set(0); term.log(T.l0(pre)); await move(pre);
        pipe.set(1); term.log(T.l1(r.hits.toFixed(1), r.pcieN.toFixed(1), r.cpuN.toFixed(1))); await move(pre);
        pipe.set(2); term.log(T.l2(f3(r.gpuMs), f3(r.cpuMs), overlap)); await move(pre + r.moeMs);
        pipe.set(3); term.log(T.l3(overlap ? r.critical : 'cpu', f3(r.moeMs))); await move(pre + r.moeMs);
        pipe.set(4); term.log(T.l4(f3(r.totalMs), f2(r.tokenMs))); await move(r.totalMs);
        cursor.setAttribute('opacity', 0);
      });
      bestBtn.onclick = () => { fR.value = Math.round(M.bestShare(+hR.value / 100) * 20) * 5; draw(); };
      ovBtn.onclick = () => { overlap = !overlap; ovBtn.textContent = overlap ? T.bOverlapOn : T.bOverlapOff; ovBtn.className = 'viz-btn ' + (overlap ? 'ghost' : 'alt'); draw(); };
      hR.oninput = draw; fR.oninput = draw;
      draw();
    },
  });

  Viz.register('simd-lanes', {
    mount(el, ctx) {
      const D = M.simdDemo(), N = 16;
      const body = Viz.frame(el, { code: T.sCode, title: T.sTitle, tag: T.sTag, intro: T.sIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.sLgIn },
        { color: 'var(--accent)', text: T.sLgNow, glow: true },
        { color: 'var(--a2)', text: T.sLgDone },
        { color: 'var(--a3)', text: T.sLgWait },
      ]));
      body.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin:0 0 12px">${Object.entries(T.modes).map(([k, v]) => `<button type="button" class="viz-btn ghost" data-m="${k}">${Viz.esc(v)}</button>`).join('')}</div><div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 150', class: 'viz-stage', role: 'img', 'aria-label': T.sTitle }, left);
      const titleT = Viz.svg('text', { x: 4, y: 14, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const row = (y, vals) => vals.map((v, i) => {
        const r = Viz.svg('rect', { x: 4 + i * 22, y, width: 20, height: 22, class: 'viz-cell' }, svg);
        const t = Viz.svg('text', { x: 14 + i * 22, y: y + 16, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
        t.textContent = v; return { r, t };
      });
      const rowA = row(20, D.a), rowB = row(46, D.b);
      Viz.svg('text', { x: 4, y: 88, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.outLabel;
      const rowO = row(94, Array(N).fill(''));
      const stepT = Viz.svg('text', { x: 4, y: 140, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.sReady);
      right.innerHTML = Viz.stat({ id: 's-steps', k: T.sStepsK, v: '', f: '', hot: true }) + Viz.stat({ id: 's-cmp', k: T.sCmpK, v: '—', f: T.sCmpNone });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.sTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn] = left.querySelectorAll('.viz-btn');
      let mode = 'scalar', k = 0, busy = false;
      const done = {};
      const total = () => M.steps(N, mode);
      function load(m) {
        mode = m; k = 0;
        el.querySelectorAll('[data-m]').forEach(b => { b.className = 'viz-btn ' + (b.dataset.m === m ? '' : 'ghost'); });
        titleT.textContent = T.modeTitle[m];
        rowB.forEach(c => c.r.style.opacity = m === 'chain' ? 0.25 : 1);
        rowB.forEach(c => c.t.style.opacity = m === 'chain' ? 0.25 : 1);
        rowO.forEach(c => { c.t.textContent = ''; c.r.setAttribute('class', 'viz-cell'); c.r.style.fill = ''; });
        $('[data-s=s-steps-v]').textContent = total();
        $('[data-s=s-steps-f]').innerHTML = T.sStepsF[m];
        paint([]);
      }
      function paint(now) {
        rowO.forEach((c, i) => {
          const isNow = now.includes(i), isDone = c.t.textContent !== '' && !isNow;
          c.r.setAttribute('class', 'viz-cell' + (isNow ? ' pick' : isDone ? ' score' : ''));
          c.r.style.fill = !isNow && !isDone && mode === 'chain' && k > 0 && i > now[now.length - 1] ? 'var(--a3)' : '';
          c.r.style.opacity = !isNow && !isDone && mode === 'chain' && k > 0 && i > now[now.length - 1] ? 0.35 : 1;
          c.t.style.fill = isNow ? 'var(--paper)' : 'var(--ink)';
        });
        stepT.textContent = T.stepText(k, total());
      }
      function step() {
        if (k >= total()) return false;
        let now = [];
        if (mode === 'scalar') { now = [k]; rowO[k].t.textContent = D.sum[k]; term.log(T.lScalar(k, D.a[k], D.b[k], D.sum[k])); }
        if (mode === 'simd') { now = [...Array(N).keys()]; now.forEach(i => { rowO[i].t.textContent = D.sum[i]; }); term.log(T.lSimd); }
        if (mode === 'chain') { now = [k]; rowO[k].t.textContent = D.chain[k]; term.log(T.lChain(k, k ? D.chain[k - 1] : 0, D.a[k], D.chain[k])); }
        k++;
        paint(now);
        if (k === total()) finish();
        return true;
      }
      function finish() {
        done[mode] = total();
        term.log(T.lDone(T.modes[mode], total()));
        $('[data-s=s-cmp-v]').textContent = Object.keys(done).length + ' / 3';
        $('[data-s=s-cmp-f]').innerHTML = Object.entries(done).map(([m, n]) => `<b>${T.modes[m]}</b>：${n} 步`).join('<br>');
        if (Object.keys(done).length === 3) { const v = $('.viz-verdict'); v.innerHTML = T.sVerdict; v.hidden = false; }
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      el.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => guard(async () => { load(b.dataset.m); }); });
      stepBtn.onclick = () => guard(async () => { if (k >= total()) load(mode); step(); });
      allBtn.onclick = () => guard(async () => { if (k >= total()) load(mode); while (step()) await ctx.sleep(120); });
      resetBtn.onclick = () => guard(async () => { load(mode); term.clear(); term.log(T.sReady); });
      load('scalar');
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
