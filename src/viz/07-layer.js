/* Chapter 07 widgets: one layer's six stages over a 4-stream residual, and L2 versus RMS normalisation.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.layer;

  const T = Viz.t({
    zh: {
      code: 'LAYER_WALK', title: '走一遍一层：读残差 → 计算 → 写回', tag: '教学推演 · 数值为示意',
      intro: '残差不是一根向量，而是 <b>4 条车道</b>（每条只画 8 个数，真实是 2560 个）。一层分两半：先“混合历史”（GDN 或 QSA），再“专家加工”（MoE）。每一半都是：从车道里<b>读</b>出一个向量 → <b>算</b>一个小修正 → <b>写回</b>每条车道。按 <b>单步</b> 走。',
      lgPos: '正数（越亮绝对值越大）', lgNeg: '负数', lgNew: '本步刚变化的格子',
      steps: ['读残差', '混合器', '写回', '读残差', 'MoE', '写回'],
      rowR: (c) => `车道${c}`, rowMix: '读出', rowOut: '修正',
      stage: '四条残差车道、读出向量与修正向量',
      layerLabel: '从第几层开始（0–47）', injLabel: '车道 0 的注入值 inject',
      bStep: '▶ 单步', bAll: '▶▶ 跑完 48 层', bReset: '重置',
      gdn: 'GDN 混合器', qsa: 'QSA 注意力',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]，每按一次走流程条上的一步',
      readyShort: '<span class="c">$</span> 已重置到输入状态',
      l0: (l, kind) => `<span class="c">[L${String(l).padStart(2, '0')}]</span> 读残差：4 条车道各自做 RMS 归一化，再合成一个向量。第 ${l} 层是 ${kind}（${l} % 4 ${l % 4 === 3 ? '= 3' : '≠ 3'}）`,
      l1: (kind) => `<span class="m">${kind}</span>：根据历史算出一个<b>小</b>修正（这里用一个示意变换代替）`,
      l2: (ws) => `<span class="y">写回</span>：同一个修正加到 4 条车道上，各乘自己的权重 w = 2σ(inject/4)：${ws}`,
      l3: '<span class="c">读残差</span>：第二次读，供 MoE 使用',
      l4: '<span class="m">MoE</span>：路由器挑专家、加权相加（第 10 章），得到第二个修正',
      l5: (l) => `<span class="y">写回</span>：第 ${l} 层结束，结果交给下一层`,
      restart: '<span class="y">// 48 层已走完，从第 0 层重新开始</span>',
      fast: '<span class="y">// 快进：连续走完 48 层</span>',
      done: (g, q) => `<span class="y">完成</span>：走过 ${g} 个 GDN 层、${q} 个 QSA 层，共 ${g + q} 层 × 2 次写回`,
      sTypeK: '当前层的混合器', sTypeF: (l) => `<b>layer % 4 == 3 → QSA，否则 GDN</b><br>${l} % 4 = ${l % 4}`,
      sWK: '4 条车道的写入权重', sWF: '<b>w = 2 × sigmoid(inject ÷ 4)</b><br>inject = 0 时 w = 1：就是普通的“加回去”',
      sCountK: '已走过的层', sCountF: '<b>48 层 = 36 层 GDN + 12 层 QSA</b>',
      count: (g, q) => `GDN ${g} · QSA ${q}`,
      try: [
        '从第 0 层连按 6 次 <b>单步</b>：车道只被<b>加</b>了一点点，原来的数大部分还在。这就是残差：每层只写“修改意见”，不重抄全文。',
        '把起始层拉到 <b>3</b>，再单步：混合器变成 QSA。再试 7、11……每 4 层的最后一层都是 QSA，48 层里共 12 个。',
        '把 <b>车道 0 的注入值</b> 拉到 0：它的写入权重正好是 1，等于普通残差相加；拉到 −8 或 +8，权重变成约 0.24 或 1.76。',
      ],

      nCode: 'NORM_COMPARE', nTitle: 'L2 归一化 vs RMS 归一化', nTag: '精确计算',
      nIntro: '两种归一化都把向量“调到标准音量”，方向不变，分母不同：L2 除以<b>平方和</b>的平方根，RMS 除以<b>平方的平均</b>的平方根。选一个输入，看结果差多少。',
      nLgX: '输入 x', nLgL2: 'L2 归一化', nLgRms: 'RMS 归一化',
      presets: ['[3, 4]', '8 个 1', '一个特别大', '接近 0', '128 维'],
      stageN: '输入与两种归一化结果的柱状图',
      epsLabel: 'ε 放在根号外（错误写法）',
      sLenK: 'L2 长度 ‖x‖', sLenF: '<b>= √(Σ xᵢ²)</b>',
      sRmsK: 'RMS（均方根）', sRmsF: (d) => `<b>= √(Σ xᵢ² ÷ d)</b>，d = ${d}`,
      sRatioK: 'RMS 结果 ÷ L2 结果（实算）', sRatioF: (d) => `<b>理论上 = ‖x‖ ÷ RMS = √d = √${d}</b>`, sRatioEps: '<br>输入接近 0 时 ε 占了主导，比值不再等于 √d',
      shown: (d) => d > 8 ? `只画前 8 个分量（共 ${d} 个）` : `共 ${d} 个分量`,
      nLog: (name, l2, rms, ratio) => `<span class="c">[${name}]</span> ‖x‖ = ${l2}，RMS = ${rms}，两种结果相差 ${ratio} 倍`,
      epsLog: (a, b) => `<span class="y">ε 位置</span>：放在根号里，第一个分量 = ${a}；放在根号外 = ${b}`,
      nReady: '<span class="c">$</span> 选一个输入',
      nVerdict: (d, r) => `两种归一化方向完全相同，大小差 √d 倍。这里 d = ${d}，差 <b>${r}</b> 倍。<br>Strata 的 GDN 对 q、k 用 L2，每个头 128 维；错用 RMS 会把它们放大约 11.3 倍。结果仍是正常的有限数，不报错，只会悄悄算错。`,
      nVerdictEps: (a, b) => `输入几乎为 0 时，ε 的位置决定结果：放在根号里得到 ${a}，放在根号外得到 ${b}。ε 本来只是“防止除以 0”的小数，放错位置却能让结果差十几倍。`,
      nTry: [
        '点 <b>[3, 4]</b>：L2 结果是 [0.6, 0.8]，RMS 结果是 [0.85, 1.13]，比值正好 √2 ≈ 1.41。',
        '点 <b>128 维</b>：比值变成 √128 ≈ 11.3。这就是“用错分母”在 GDN 里造成的误差倍数。',
        '点 <b>接近 0</b>，再勾选 <b>ε 放在根号外</b>：两种写法差十几倍。归一化公式里的每个小符号都是契约。',
      ],
    },
    en: {
      code: 'LAYER_WALK', title: 'Walk through one layer: read residual → compute → write back', tag: 'Teaching estimate · illustrative numbers',
      intro: 'The residual is not one vector but <b>4 lanes</b> (each lane shows only 8 numbers; the real ones hold 2560). A layer has two halves: first "mix in the history" (GDN or QSA), then "expert processing" (MoE). Each half <b>reads</b> one vector out of the lanes → <b>computes</b> a small correction → <b>writes it back</b> to every lane. Press <b>Step</b> to walk through it.',
      lgPos: 'Positive (brighter = larger magnitude)', lgNeg: 'Negative', lgNew: 'Cells changed in this step',
      steps: ['Read residual', 'Mixer', 'Write back', 'Read residual', 'MoE', 'Write back'],
      rowR: (c) => `Lane ${c}`, rowMix: 'Read', rowOut: 'Fix',
      stage: 'Four residual lanes, the read-out vector and the correction vector',
      layerLabel: 'Starting layer (0–47)', injLabel: 'Inject value of lane 0',
      bStep: '▶ Step', bAll: '▶▶ Run all 48 layers', bReset: 'Reset',
      gdn: 'GDN mixer', qsa: 'QSA attention',
      ready: '<span class="c">$</span> ready. Press [ ▶ Step ]; each press moves one step along the strip',
      readyShort: '<span class="c">$</span> reset to the input state',
      l0: (l, kind) => `<span class="c">[L${String(l).padStart(2, '0')}]</span> read residual: each of the 4 lanes gets its own RMS normalization, then they merge into one vector. Layer ${l} is ${kind} (${l} % 4 ${l % 4 === 3 ? '= 3' : '≠ 3'})`,
      l1: (kind) => `<span class="m">${kind}</span>: computes a <b>small</b> correction from the history (an illustrative transform stands in here)`,
      l2: (ws) => `<span class="y">Write back</span>: the same correction goes to all 4 lanes, each times its own weight w = 2σ(inject/4): ${ws}`,
      l3: '<span class="c">Read residual</span>: the second read, for MoE',
      l4: '<span class="m">MoE</span>: the router picks experts and adds them up by weight (Chapter 10), giving the second correction',
      l5: (l) => `<span class="y">Write back</span>: layer ${l} done; the result goes to the next layer`,
      restart: '<span class="y">// all 48 layers done; starting again from layer 0</span>',
      fast: '<span class="y">// fast-forward: running all 48 layers</span>',
      done: (g, q) => `<span class="y">Done</span>: passed ${g} GDN layers and ${q} QSA layers, ${g + q} layers × 2 write-backs`,
      sTypeK: 'Mixer of the current layer', sTypeF: (l) => `<b>layer % 4 == 3 → QSA, else GDN</b><br>${l} % 4 = ${l % 4}`,
      sWK: 'Write weights of the 4 lanes', sWF: '<b>w = 2 × sigmoid(inject ÷ 4)</b><br>at inject = 0, w = 1: a plain "add it back"',
      sCountK: 'Layers passed', sCountF: '<b>48 layers = 36 GDN + 12 QSA</b>',
      count: (g, q) => `GDN ${g} · QSA ${q}`,
      try: [
        'Start at layer 0 and press <b>Step</b> 6 times: the lanes only get a little <b>added</b>, and most of the original numbers are still there. That is the residual: each layer writes only "suggested changes" and never copies out the whole text.',
        'Drag the starting layer to <b>3</b> and step again: the mixer becomes QSA. Try 7, 11 … too: the last layer of every group of 4 is QSA, 12 of them in 48 layers.',
        'Drag <b>lane 0\'s inject value</b> to 0: its write weight is exactly 1, the same as a plain residual addition. Drag it to −8 or +8 and the weight becomes about 0.24 or 1.76.',
      ],

      nCode: 'NORM_COMPARE', nTitle: 'L2 normalization vs RMS normalization', nTag: 'Exact computation',
      nIntro: 'Both normalizations "set the vector to a standard volume" and keep its direction; only the denominator differs. L2 divides by the square root of the <b>sum of squares</b>; RMS divides by the square root of the <b>mean of squares</b>. Pick an input and see how far apart the results are.',
      nLgX: 'Input x', nLgL2: 'L2 normalized', nLgRms: 'RMS normalized',
      presets: ['[3, 4]', 'eight 1s', 'one huge', 'near 0', '128-dim'],
      stageN: 'Bar chart of the input and both normalized results',
      epsLabel: 'ε outside the square root (the wrong form)',
      sLenK: 'L2 length ‖x‖', sLenF: '<b>= √(Σ xᵢ²)</b>',
      sRmsK: 'RMS (root mean square)', sRmsF: (d) => `<b>= √(Σ xᵢ² ÷ d)</b>, d = ${d}`,
      sRatioK: 'RMS result ÷ L2 result (computed)', sRatioF: (d) => `<b>in theory = ‖x‖ ÷ RMS = √d = √${d}</b>`, sRatioEps: '<br>near 0, ε dominates and the ratio no longer equals √d',
      shown: (d) => d > 8 ? `showing the first 8 of ${d} components` : `${d} components`,
      nLog: (name, l2, rms, ratio) => `<span class="c">[${name}]</span> ‖x‖ = ${l2}, RMS = ${rms}; the two results differ by a factor of ${ratio}`,
      epsLog: (a, b) => `<span class="y">ε position</span>: inside the square root, the first component = ${a}; outside = ${b}`,
      nReady: '<span class="c">$</span> pick an input',
      nVerdict: (d, r) => `The two normalizations point in exactly the same direction; their sizes differ by a factor of √d. Here d = ${d}, a factor of <b>${r}</b>.<br>Strata's GDN uses L2 on q and k, with 128 dimensions per head; using RMS by mistake would scale them up about 11.3×. The results are still normal finite numbers: no error, just a silently wrong computation.`,
      nVerdictEps: (a, b) => `When the input is almost 0, the position of ε decides the result: inside the square root gives ${a}, outside gives ${b}. ε is only meant as a tiny number to "avoid dividing by 0", yet in the wrong place it can change the result more than tenfold.`,
      nTry: [
        'Click <b>[3, 4]</b>: L2 gives [0.6, 0.8] and RMS gives [0.85, 1.13]; the ratio is exactly √2 ≈ 1.41.',
        'Click <b>128-dim</b>: the ratio becomes √128 ≈ 11.3. That is the error factor "the wrong denominator" causes in GDN.',
        'Click <b>near 0</b>, then tick <b>ε outside the square root</b>: the two forms differ more than tenfold. Every small symbol in a normalization formula is part of the contract.',
      ],
    },
  });

  // Small deterministic generator so every reload shows the same numbers.
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  async function guardRun(el, ctx, state, fn) {
    if (state.busy) return;
    state.busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { if (ctx.alive) throw e; }
    state.busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
  }

  function cellStyle(v, max) {
    const a = Math.min(1, Math.abs(v) / max);
    return `fill:${v >= 0 ? 'var(--accent)' : 'var(--a2)'};opacity:${(0.12 + 0.88 * a).toFixed(2)}`;
  }

  Viz.register('layer-walk', {
    mount(el, ctx) {
      const N = 8, HC = M.HC;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgPos, glow: true },
        { color: 'var(--a2)', text: T.lgNeg },
        { color: 'var(--a3)', text: T.lgNew },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 252', class: 'viz-stage', role: 'img', 'aria-label': T.stage }, left);
      const rows = [];
      const rowY = [8, 38, 68, 98, 156, 196];
      const names = [T.rowR(0), T.rowR(1), T.rowR(2), T.rowR(3), T.rowMix, T.rowOut];
      rowY.forEach((y, r) => {
        const lab = Viz.svg('text', { x: 0, y: y + 18, 'font-size': 13, style: 'fill:var(--muted)' }, svg); lab.textContent = names[r];
        const cells = [];
        for (let i = 0; i < N; i++) {
          const rect = Viz.svg('rect', { x: 52 + i * 38, y, width: 36, height: 26, rx: 2, style: 'fill:var(--frame)' }, svg);
          const t = Viz.svg('text', { x: 70 + i * 38, y: y + 18, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
          cells.push({ rect, t });
        }
        rows.push(cells);
      });
      const kindT = Viz.svg('text', { x: 52, y: 146, 'font-size': 13, style: 'fill:var(--a3)' }, svg);
      const sub = Viz.svg('text', { x: 52, y: 246, 'font-size': 13, style: 'fill:var(--muted)' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>
        <div class="viz-slider"><label>${T.layerLabel}</label><input type="range" min="0" max="47" value="0" data-k="l" aria-label="${Viz.esc(T.layerLabel)}"><output data-o="l">0</output></div>
        <div class="viz-slider"><label>${T.injLabel}</label><input type="range" min="-8" max="8" step="0.5" value="1.5" data-k="i" aria-label="${Viz.esc(T.injLabel)}"><output data-o="i">1.5</output></div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'lw-t', k: T.sTypeK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'lw-w', k: T.sWK, v: '', f: T.sWF }) +
        Viz.stat({ id: 'lw-c', k: T.sCountK, v: '', f: T.sCountF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const state = { busy: false };
      const [stepBtn, allBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      let start = 0, layer = 0, phase = 0, inj0 = 1.5, R, mixed, out, changed = new Set(), seenG = 0, seenQ = 0;

      function injects(l, half) { const r = rng(1000 + l * 7 + half); const a = [0, 0, 0, 0].map(() => Math.round((r() * 6 - 3) * 2) / 2); a[0] = inj0; return a; }
      function init() {
        const r = rng(7);
        const e = Array.from({ length: N }, () => Math.round((r() * 4 - 2) * 10) / 10);
        R = Array.from({ length: HC }, (_, c) => e.map(v => Math.round(v * (1 + 0.15 * c) * 100) / 100));
        mixed = new Array(N).fill(0); out = new Array(N).fill(0); changed = new Set();
      }
      function readR() { const n = R.map(row => M.rmsnorm(row, 1e-6)); return Array.from({ length: N }, (_, i) => n.reduce((a, row) => a + row[i], 0) / HC); }
      function mixer(x, l) { const r = rng(50 + l); return x.map((v, i) => 0.35 * Math.tanh(x[(i + 1) % N] - v + (r() - 0.5))); }
      function moe(x, l) { const r = rng(90 + l); const a = x.map(v => M.relu(v) * (0.3 + 0.2 * r())); const b = x.map(v => M.silu(-v) * 0.3); return M.combine([a, b], [0.6, 0.4]); }
      function write(half) {
        const inj = injects(layer, half);
        R = M.grWrite(R, out, inj, HC);
        changed = new Set([0, 1, 2, 3]);
        return inj.map(v => M.grGate(v, HC));
      }
      function paint() {
        const max = Math.max(1, ...R.flat().map(Math.abs));
        rows.forEach((cells, r) => {
          const vals = r < 4 ? R[r] : r === 4 ? mixed : out;
          const hl = (r < 4 && changed.has(r)) || (r === 4 && phase === 1) || (r === 5 && (phase === 2 || phase === 5));
          cells.forEach((c, i) => {
            c.rect.setAttribute('style', cellStyle(vals[i], r < 4 ? max : 1) + (hl ? ';stroke:var(--a3);stroke-width:2' : ''));
            c.t.textContent = vals[i].toFixed(1);
          });
        });
        const q = M.isQsa(layer);
        kindT.textContent = (q ? T.qsa : T.gdn) + ' · L' + layer;
        sub.textContent = T.count(seenG, seenQ);
      }
      function stats(ws) {
        const q = M.isQsa(layer);
        $('[data-s=lw-t-v]').textContent = q ? T.qsa : T.gdn;
        $('[data-s=lw-t-f]').innerHTML = T.sTypeF(layer);
        const w = ws || injects(layer, 0).map(v => M.grGate(v, HC));
        $('[data-s=lw-w-v]').textContent = w.map(v => v.toFixed(2)).join(' · ');
        $('[data-s=lw-c-v]').textContent = T.count(seenG, seenQ);
      }
      function step(fast) {
        if (layer >= M.LAYERS) { layer = 0; seenG = 0; seenQ = 0; if (!fast) term.log(T.restart); }
        pipe.set(phase);
        const kind = M.isQsa(layer) ? T.qsa : T.gdn;
        let ws = null;
        changed = new Set();
        if (phase === 0 || phase === 3) { mixed = readR(); if (!fast) term.log(phase === 0 ? T.l0(layer, kind) : T.l3); }
        if (phase === 1) { out = mixer(mixed, layer); if (!fast) term.log(T.l1(kind)); }
        if (phase === 4) { out = moe(mixed, layer); if (!fast) term.log(T.l4); }
        if (phase === 2 || phase === 5) {
          ws = write(phase === 2 ? 0 : 1);
          if (!fast) term.log(phase === 2 ? T.l2(ws.map(v => v.toFixed(2)).join(' / ')) : T.l5(layer));
        }
        phase = (phase + 1) % 6;
        if (phase === 0) { if (M.isQsa(layer)) seenQ++; else seenG++; layer++; }
        if (layer < M.LAYERS) { paint(); stats(ws); }
      }
      function reset(msg) {
        layer = start; phase = 0; seenG = 0; seenQ = 0; init(); pipe.set(-1); term.clear(); term.log(msg); paint(); stats();
      }
      stepBtn.onclick = () => guardRun(el, ctx, state, async () => step(false));
      allBtn.onclick = () => guardRun(el, ctx, state, async () => {
        term.log(T.fast); layer = 0; phase = 0; seenG = 0; seenQ = 0; init();
        for (let l = 0; l < M.LAYERS; l++) {
          for (let p = 0; p < 6; p++) step(true);
          if (layer < M.LAYERS) { paint(); stats(); }
          await ctx.sleep(30);
        }
        layer = M.LAYERS - 1; phase = 0; paint(); stats();
        term.log(T.done(seenG, seenQ)); layer = M.LAYERS;
      });
      resetBtn.onclick = () => guardRun(el, ctx, state, async () => reset(T.readyShort));
      el.querySelectorAll('input[type=range]').forEach(r => {
        r.oninput = () => {
          if (state.busy) return;
          el.querySelector(`[data-o="${r.dataset.k}"]`).textContent = r.value;
          if (r.dataset.k === 'l') { start = +r.value; reset(T.readyShort); }
          else { inj0 = +r.value; stats(); }
        };
      });
      init(); paint(); stats();
    },
  });

  Viz.register('norm-compare', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.nCode, title: T.nTitle, tag: T.nTag, intro: T.nIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.nLgX },
        { color: 'var(--accent)', text: T.nLgL2, glow: true },
        { color: 'var(--a2)', text: T.nLgRms },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 230', class: 'viz-stage', role: 'img', 'aria-label': T.stageN }, left);
      const Y0 = 110, H = 90;
      Viz.svg('line', { x1: 0, y1: Y0, x2: 360, y2: Y0, style: 'stroke:var(--muted)', 'stroke-width': 1 }, svg);
      const bars = [];
      for (let i = 0; i < 8; i++) {
        const g = [];
        ['var(--frame)', 'var(--accent)', 'var(--a2)'].forEach((c, k) => g.push(Viz.svg('rect', { x: 6 + i * 44 + k * 12, width: 11, style: `fill:${c}` }, svg)));
        const t = Viz.svg('text', { x: 6 + i * 44 + 17, y: 222, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg);
        bars.push({ g, t });
      }
      const note = Viz.svg('text', { x: 4, y: 14, 'font-size': 13, style: 'fill:var(--muted)' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${T.presets.map(p => Viz.button(p)).join('')}</div>
        <div class="viz-row"><label style="font-size:14px;display:inline-flex;gap:8px;align-items:center"><input type="checkbox" data-k="eps">${T.epsLabel}</label></div>`);
      const term = Viz.term(left, T.nReady);
      right.innerHTML =
        Viz.stat({ id: 'nc-l', k: T.sLenK, v: '', f: T.sLenF }) +
        Viz.stat({ id: 'nc-r', k: T.sRmsK, v: '', f: '' }) +
        Viz.stat({ id: 'nc-q', k: T.sRatioK, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict"></div>` + Viz.tryList(T.nTry));
      const $ = s => el.querySelector(s);
      const r128 = rng(11);
      const inputs = [[3, 4], new Array(8).fill(1), [0.5, -0.2, 0.1, 6, 0.3, -0.4, 0.2, 0.1], [1e-4, 0], Array.from({ length: 128 }, () => Math.round((r128() * 2 - 1) * 100) / 100)];
      let cur = 0;
      const epsBox = $('input[data-k=eps]');

      function render(log) {
        const x = inputs[cur], d = x.length, eps = 1e-6;
        const l2 = M.l2norm(x, eps), rms = epsBox.checked ? M.rmsnormEpsOutside(x, eps) : M.rmsnorm(x, eps);
        const show = Math.min(8, d), max = Math.max(1e-9, ...[...x.slice(0, show), ...l2.slice(0, show), ...rms.slice(0, show)].map(Math.abs));
        bars.forEach((b, i) => {
          const vis = i < show;
          [x, l2, rms].forEach((arr, k) => {
            const v = vis ? arr[i] : 0, h = Math.abs(v) / max * H;
            b.g[k].setAttribute('y', v >= 0 ? Y0 - h : Y0); b.g[k].setAttribute('height', h);
          });
          b.t.textContent = vis ? 'x' + (i + 1) : '';
        });
        note.textContent = T.shown(d);
        const len = Math.sqrt(x.reduce((a, v) => a + v * v, 0)), rm = len / Math.sqrt(d);
        $('[data-s=nc-l-v]').textContent = len < 0.01 ? len.toExponential(2) : len.toFixed(3);
        $('[data-s=nc-r-v]').textContent = rm < 0.01 ? rm.toExponential(2) : rm.toFixed(3);
        $('[data-s=nc-r-f]').innerHTML = T.sRmsF(d);
        const nearZero = len < 1e-2;
        const k = x.findIndex(v => v !== 0);
        const ratio = k >= 0 && l2[k] !== 0 ? rms[k] / l2[k] : Math.sqrt(d);
        $('[data-s=nc-q-v]').textContent = ratio.toFixed(2);
        $('[data-s=nc-q-f]').innerHTML = T.sRatioF(d) + (nearZero ? T.sRatioEps : '');
        const a = M.rmsnorm(x, eps)[0].toFixed(3), b = M.rmsnormEpsOutside(x, eps)[0].toFixed(3);
        $('.viz-verdict').innerHTML = nearZero ? T.nVerdictEps(a, b) : T.nVerdict(d, Math.sqrt(d).toFixed(2));
        if (log) {
          term.log(T.nLog(T.presets[cur], len < 0.01 ? len.toExponential(2) : len.toFixed(3), rm < 0.01 ? rm.toExponential(2) : rm.toFixed(3), ratio.toFixed(2)));
          if (nearZero) term.log(T.epsLog(a, b));
        }
      }
      el.querySelectorAll('.viz-btn').forEach((b, j) => { b.onclick = () => { cur = j; render(true); }; });
      epsBox.onchange = () => render(true);
      render(false);
      void ctx;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
