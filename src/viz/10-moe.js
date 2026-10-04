/* Chapter 10 widgets: the MoE router and the 664 MB transfer race. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.moe;

  Viz.register('moe-router', {
    mount(el, ctx) {
      const body = Viz.frame(el, {
        code: 'ROUTER_SIM', title: '路由器模拟器', tag: '教学推演 · 分数为随机数',
        intro: '一层的 512 个专家排成 32 × 16 的格子。按 <b>单步</b>，一步一步看路由器怎样给专家打分、挑出前 k 个、再把结果加权相加。',
      });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: '一个格子 = 本层的一个专家' },
        { color: 'var(--a2)', text: '正在打分（越亮分越高）' },
        { color: 'var(--accent)', text: '被选中，参与计算', glow: true },
      ]));
      const pipe = Viz.pipe(body, ['收到 token', '打分', '挑前 k', '专家计算', '加权相加', '下一层']);
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 544 272', class: 'viz-stage', role: 'img', 'aria-label': '512 个专家的打分网格' }, left);
      const cells = [];
      for (let i = 0; i < M.EXPERTS; i++) cells.push(Viz.svg('rect', { x: (i % 32) * 17 + 1.5, y: Math.floor(i / 32) * 17 + 1.5, width: 14, height: 14, class: 'viz-cell' }, svg));
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button('▶ 单步')}${Viz.button('▶▶ 跑完 48 层', 'alt')}${Viz.button('重置', 'ghost')}</div>
        <div class="viz-slider"><label>每层挑几个专家（k）</label><input type="range" min="1" max="64" value="10" aria-label="每层挑几个专家"><output>k = 10</output></div>
        <div class="viz-row" style="justify-content:space-between;font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:10px"><span class="lay">已完成 0 / 48 层</span><span class="byt">累计读取 0 MB</span></div>`);
      const term = Viz.term(left, '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始，每按一次走流程条上的一步');
      right.innerHTML =
        Viz.stat({ id: 'r-picks', k: '每个 token 的专家选择次数', v: '480', f: '<b>= 48 层 × k</b><br>每一层都重新挑一次' }) +
        Viz.stat({ id: 'r-params', k: '每个 token 实际动用的参数', v: '66 亿', f: '', hot: true }) +
        Viz.stat({ id: 'r-bytes', k: '每个 token 要读的专家数据', v: '664 MB', f: '' }) +
        `<div class="viz-stat"><div class="k">本层选中专家的话语权（加权系数）</div><div class="viz-bars r-w"><div><span>—</span><span style="grid-column:2/4">按“单步”走到第 5 步后显示</span></div></div><div class="f">分数越高，权重越大；权重加起来等于 1</div></div>`;
      body.insertAdjacentHTML('beforeend', Viz.tryList([
        '连按 <b>单步</b>，看流程条一格格往前走，终端里每一步都有一句说明。',
        '把 k 拉到 <b>1</b>，再拉到 <b>64</b>：动用的参数从约 44 亿涨到约 193 亿。k 越大，每步干活的专家越多，也越慢。',
        '按 <b>跑完 48 层</b>：每层都重新挑一次，48 层累计正好读 664 MB。这只是生成<b>一个</b> token 的工作量。',
      ]));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const range = $('input[type=range]');
      let k = 10, layer = 0, phase = 0, busy = false, scores = new Float32Array(M.EXPERTS), picked = [];

      function paint() {
        const sel = new Set(picked);
        cells.forEach((c, i) => {
          if (sel.has(i)) { c.setAttribute('class', 'viz-cell pick'); c.style.opacity = 1; }
          else if (scores[i] > 0) { c.setAttribute('class', 'viz-cell score'); c.style.opacity = picked.length ? .05 + scores[i] * .18 : .1 + scores[i] * .55; }
          else { c.setAttribute('class', 'viz-cell'); c.style.opacity = 1; }
        });
      }
      function stats() {
        const s = M.moeStats(k);
        $('output').textContent = 'k = ' + k;
        $('[data-s=r-picks-v]').textContent = Viz.fmt(s.picks);
        $('[data-s=r-params-v]').textContent = Math.round(s.params / 1e8) + ' 亿';
        $('[data-s=r-params-f]').innerHTML = `<b>= ${s.picks} × 491.52 万 + 约 42 亿</b><br>选中专家的参数 + 每步都用的部分<br>占全部 1250 亿的 ${(s.ratio * 100).toFixed(1)}%`;
        $('[data-s=r-bytes-v]').textContent = Viz.fmt(Math.round(s.bytes / 1e6)) + ' MB';
        $('[data-s=r-bytes-f]').innerHTML = `<b>= ${s.picks} × 1.3824 MB</b><br>每个专家在标准格式下占 1,382,400 字节`;
      }
      function progress() {
        $('.lay').textContent = '已完成 ' + layer + ' / 48 层';
        $('.byt').textContent = '累计读取 ' + Math.round(layer * k * M.EXPERT_BYTES / 1e6) + ' MB';
      }
      function showWeights() {
        const w = M.routeWeights(picked.map(i => scores[i])), max = Math.max(...w);
        $('.r-w').innerHTML = picked.slice(0, 10).map((id, j) => `<div><span>#${String(id).padStart(3, '0')}</span><i style="width:${(w[j] / max * 100).toFixed(0)}%"></i><span>${w[j].toFixed(2)}</span></div>`).join('') +
          (picked.length > 10 ? `<div><span></span><span style="grid-column:2/4">…另外 ${picked.length - 10} 个</span></div>` : '');
        return w;
      }
      async function step(fast) {
        if (layer >= M.LAYERS) { layer = 0; progress(); if (!fast) term.log('<span class="y">// 48 层已跑完，从第 1 层重新开始</span>'); }
        pipe.set(phase);
        if (phase === 0) { scores.fill(0); picked = []; paint(); if (!fast) term.log(`<span class="c">[L${String(layer + 1).padStart(2, '0')}]</span> 收到 token 的数据，交给第 ${layer + 1} 层的路由器`); }
        if (phase === 1) {
          for (let f = 0; f < (fast ? 1 : 7); f++) { for (let i = 0; i < M.EXPERTS; i++) scores[i] = Math.random(); paint(); await ctx.sleep(fast ? 0 : 70); }
          if (!fast) term.log('<span class="m">打分</span>：路由器给 512 个专家每人算一个分数（图中越亮分越高）');
        }
        if (phase === 2) { picked = M.topK(scores, k); paint(); if (!fast) term.log(`<span class="c">挑前 ${k}</span>：选中 ${picked.slice(0, 5).map(i => '#' + i).join(' ')}${k > 5 ? ' …' : ''}，其余 ${M.EXPERTS - k} 个这一步不干活`); }
        if (phase === 3 && !fast) term.log(`<span class="w">专家计算</span>：${k} 个专家各算一份结果，要读 ${k} × 1.38 MB ≈ ${(k * M.EXPERT_BYTES / 1e6).toFixed(1)} MB 参数`);
        if (phase === 4) { const w = showWeights(); if (!fast) term.log(`<span class="y">加权相加</span>：把分数换算成权重（最大 ${Math.max(...w).toFixed(2)}，合计 1.00），得分高的专家话语权大`); }
        if (phase === 5) { layer++; progress(); if (!fast) term.log(`<span class="c">→</span> 结果交给下一层。已完成 ${layer} / 48 层，累计读取 ${Math.round(layer * k * M.EXPERT_BYTES / 1e6)} MB`); }
        phase = (phase + 1) % 6;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      stepBtn.onclick = () => guard(() => step(false));
      allBtn.onclick = () => guard(async () => {
        term.log('<span class="y">// 快进：连续跑完 48 层</span>');
        layer = 0; phase = 0; progress();
        for (let l = 0; l < M.LAYERS; l++) { for (let p = 0; p < 6; p++) await step(true); await ctx.sleep(30); }
        term.log(`<span class="y">完成</span>：48 层 × ${k} = ${48 * k} 次选择，共读取 ${Math.round(48 * k * M.EXPERT_BYTES / 1e6)} MB。这只是生成<span class="w">一个</span> token 的工作量`);
      });
      resetBtn.onclick = () => guard(async () => {
        layer = 0; phase = 0; scores.fill(0); picked = []; paint(); pipe.set(-1); progress(); term.clear();
        term.log('<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始');
        $('.r-w').innerHTML = '<div><span>—</span><span style="grid-column:2/4">按“单步”走到第 5 步后显示</span></div>';
      });
      range.oninput = () => { k = +range.value; stats(); progress(); };
      paint(); stats(); progress();
    },
  });

  Viz.register('transfer-race', {
    mount(el, ctx) {
      const MB = 664;
      const lanes = [
        { n: '显存', s: '672 GB/s', hw: 'RTX 5070 显存', bw: 672 },
        { n: '内存', s: '83 GB/s', hw: 'DDR5-5200 双通道', bw: 83 },
        { n: 'PCIe 5.0', s: '63 GB/s', hw: '显卡与内存之间的总线', bw: 63 },
        { n: '固态硬盘', s: '7 GB/s', hw: '常见 NVMe 顺序读', bw: 7, alt: true },
      ].map(l => ({ ...l, ...M.transfer(MB, l.bw) }));
      const body = Viz.frame(el, {
        code: 'TRANSFER_RACE', title: '搬运竞速：664 MB', tag: '理论峰值 · 教学推演',
        intro: '一个 token 要读约 664 MB 的专家数据。让四个地方同时搬这 664 MB，看谁先到终点。<b>搬运时间 = 数据量 ÷ 带宽</b>。',
      });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: '每条赛道 = 一种存储或通道', glow: true },
        { color: 'var(--frame)', text: '条越快填满 = 带宽越大' },
      ]) + lanes.map((l, i) => `<div class="viz-lane${l.alt ? ' alt' : ''}"><div class="n">${l.n}<small>${l.s}</small></div><div class="viz-track"><i data-i="${i}"></i></div><div class="t" data-t="${i}">— ms</div><div class="eq">${l.hw}：${MB} MB ÷ ${l.bw} GB/s = ${l.ms.toFixed(1)} ms → 每秒最多 ${l.maxTokensPerSecond} 个 token</div></div>`).join('') +
        `<div class="viz-row">${Viz.button('▶ 开跑')}<span style="font-family:var(--mono);font-size:12px;color:var(--muted)">动画放慢 60 倍 · <span class="clk">t = 0.0 ms</span></span></div>
        <div class="viz-verdict" hidden>① 走 PCIe 搬一遍要 <b>${lanes[2].ms.toFixed(1)} ms</b>，光搬运就把速度压到每秒最多 <b>${lanes[2].maxTokensPerSecond}</b> 个 token，还没开始计算。<br>② 从硬盘读要 <b>${lanes[3].ms.toFixed(0)} ms</b>，每秒最多 ${lanes[3].maxTokensPerSecond} 个 token，不可能每次都读。<br>③ 所以 Strata 让 CPU 直接在内存里计算大部分没命中的专家，这些数据不必经过 PCIe。</div>`);
      const end = Math.max(...lanes.map(l => l.ms));
      const bars = el.querySelectorAll('.viz-track i'), times = el.querySelectorAll('.t');
      el.querySelector('.viz-btn').onclick = () => {
        el.querySelector('.viz-verdict').hidden = true;
        const t0 = performance.now();
        const tick = now => {
          const sim = ctx.reduced ? end : (now - t0) / 60;
          lanes.forEach((l, i) => { bars[i].style.width = Math.min(1, sim / l.ms) * 100 + '%'; times[i].textContent = Math.min(sim, l.ms).toFixed(1) + ' ms'; });
          el.querySelector('.clk').textContent = 't = ' + Math.min(sim, end).toFixed(1) + ' ms';
          if (sim < end) ctx.raf(tick); else el.querySelector('.viz-verdict').hidden = false;
        };
        ctx.raf(tick);
      };
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
