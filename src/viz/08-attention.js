/* Chapter 08 widgets: one attention step on 2-D toy vectors, and the cost of looking back.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.attention;

  const T = Viz.t({
    zh: {
      code: 'ATTN_STEP', title: '注意力的一步：打分、softmax、加权求和', tag: '教学推演 · 二维玩具向量',
      intro: '前文有 4 个词，每个词带一把<b>键</b>（平面上的箭头，表示“我是什么”）和一份<b>值</b>（“我能提供的内容”）。当前词发出一个<b>查询</b> q（高亮的箭头，表示“我在找什么”）。拖动滑块转动 q，或按 <b>单步</b> 看四步计算。',
      lgKey: '键 k：前文每个词的“标签”', lgQ: '查询 q：当前词在找什么', lgW: '注意力权重（条越长，看得越多）',
      steps: ['点积打分', '除以 √d', 'softmax', '加权求和'],
      words: ['小猫', '追着', '毛线球', '跑'],
      plane: '查询与四个键的二维平面，以及每个词的分数和权重',
      angle: 'q 的方向（度）', bStep: '▶ 单步', bRestart: '从头单步',
      presets: ['找“小猫”', '找“追着”', '夹在中间', '找“跑”'],
      out: (o) => `输出 = [${o}]`,
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]，一步一步看注意力怎么算',
      l0: (s) => `<span class="c">① 打分</span>：sᵢ = q · kᵢ，方向越接近分越高：${s}`,
      l1: (s) => `<span class="c">② 缩放</span>：每个分数除以 √d = √2 ≈ 1.41，得到 ${s}。真实的 QSA 每个头 d = 256，要除以 16`,
      l2: (w) => `<span class="m">③ softmax</span>：先取 e 的幂，再除以总和，权重都为正、加起来等于 1：${w}`,
      l3: (o) => `<span class="y">④ 加权求和</span>：输出 = Σ wᵢ · vᵢ = [${o}]。注意力不是“挑一个”，而是按比例混合所有值`,
      again: '<span class="y">// 已到最后一步。按 [ 从头单步 ] 再来一遍</span>',
      sTopK: '权重最大的词', sTopF: (w, p) => `<b>${w}</b> 拿到 ${p}% 的注意力<br>q 和它的键方向最接近`,
      sSumK: '权重之和', sSumF: '<b>Σ wᵢ = 1</b><br>softmax 保证每个权重为正、合计为 1',
      sOutK: '输出向量', sOutF: '<b>= Σ wᵢ · vᵢ</b><br>值 v：小猫 [3, 0]，追着 [0, 2]，毛线球 [1, 3]，跑 [0, −2]',
      try: [
        '点 <b>找“小猫”</b>：小猫拿到大部分权重，输出接近小猫的值 [3, 0]。查询和哪个键方向一致，就主要读谁的值。',
        '点 <b>夹在中间</b>：小猫和毛线球的权重差不多，输出是两者值的混合。注意力是“按比例混合”，不是“只挑一个”。',
        '点 <b>找“跑”</b>，再按 <b>从头单步</b>：看第 ③ 步，分数差 1，权重就差约 e 倍。softmax 会放大分数之间的差距。',
      ],

      cCode: 'ATTN_COST', cTitle: '往回看要花多少力气', cTag: '教学推演 · 只数“查询-位置”配对',
      cIntro: '拖动滑块改变上下文长度 n。全注意力里，第 t 个 token 要和前面所有 t 个位置配对；QSA 每次最多只看 2051 个被选中的位置。下面的条用<b>对数刻度</b>：每往右一格，数量乘 10。',
      cLgFull: '全注意力', cLgQsa: 'QSA（每次最多 2051 个位置）',
      nLabel: '上下文长度 n',
      rows: ['最后一个 token 要看几个位置：全注意力', '最后一个 token 要看几个位置：QSA', '读完整段提问的配对数：全注意力', '读完整段提问的配对数：QSA'],
      stage: '对数刻度的条形图：全注意力与 QSA 的配对数',
      sSaveK: '读完整段：QSA 少算多少', sSaveF: (n) => `<b>= n(n+1)/2 ÷ Σ min(t, 2051)</b><br>n = ${Viz.fmt(n)}`,
      sKvK: 'KV 缓存（FP16）', sKvF: '<b>= 12 层 × 2 个 KV 头 × 256 × 2（K 和 V）× 2 字节 × n</b><br>= 24,576 字节 × n',
      sHypK: '假设：48 层都是全注意力、24 个独立 KV 头', sHypF: '<b>= 上一项 × 4（层数）× 12（头数）= × 48</b><br>这是对比用的假设，不是 Strata 的配置',
      times: (x) => `× ${x}`,
      cLog: (n, full, qsa, ratio) => `<span class="c">[n = ${n}]</span> 读完整段：全注意力 ${full} 对，QSA ${qsa} 对，少算 ${ratio} 倍`,
      cReady: '<span class="c">$</span> 拖动滑块，从 1K 一路拉到 262K',
      cVerdictShort: (n) => `n = ${n} 还没超过 2051：QSA 不需要挑，每个位置都看，和全注意力完全一样。`,
      cVerdict: (n, r, kv) => `n = ${n} 时，全注意力的配对数按 n² 增长，QSA 每个查询最多看 2051 个位置，整体只按 n 增长，读完整段少算约 <b>${r}</b> 倍。<br>但 KV 缓存仍要为每个位置留一份（这里约 ${kv}），因为下一个 token 可能选中任何一个旧位置。`,
      cTry: [
        '把 n 拉到 <b>2K</b>：两条线一样长。上下文不超过 2051 时，QSA 的选择就是“全选”。',
        '从 <b>32K</b> 拉到 <b>262K</b>（长 8 倍）：全注意力的配对数涨约 64 倍，QSA 只涨约 8 倍。这就是 O(n²) 和 O(n) 的差别。',
        '看最后两张卡片：GQA 和“只有 12 层是注意力”加起来，让 KV 缓存小了 48 倍。262K 时是约 6 GiB 对约 288 GiB。',
      ],
    },
  });

  const KEYS = [[2.2, 0], [-0.6, 1.8], [1.1, 1.7], [-1.6, -0.6]];
  const VALS = [[3, 0], [0, 2], [1, 3], [0, -2]];
  const PRESET_DEG = [0, 100, 32, 205];
  const fmt2 = v => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));

  Viz.register('attention-step', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--muted)', text: T.lgKey },
        { color: 'var(--accent)', text: T.lgQ, glow: true },
        { color: 'var(--a2)', text: T.lgW },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 336', class: 'viz-stage', role: 'img', 'aria-label': T.plane }, left);
      const CX = 180, CY = 98, S = 28;
      const P = v => [CX + v[0] * S, CY - v[1] * S];
      Viz.svg('line', { x1: CX - 92, y1: CY, x2: CX + 92, y2: CY, style: 'stroke:var(--frame)' }, svg);
      Viz.svg('line', { x1: CX, y1: CY - 90, x2: CX, y2: CY + 90, style: 'stroke:var(--frame)' }, svg);
      KEYS.forEach((k, i) => {
        const [x, y] = P(k);
        Viz.svg('line', { x1: CX, y1: CY, x2: x, y2: y, style: 'stroke:var(--muted)', 'stroke-width': 2 }, svg);
        Viz.svg('circle', { cx: x, cy: y, r: 3.5, style: 'fill:var(--muted)' }, svg);
        const len = Math.hypot(k[0], k[1]);
        const t = Viz.svg('text', { x: x + k[0] / len * 10, y: y - k[1] / len * 10 + 4, 'font-size': 13, 'text-anchor': k[0] >= 0 ? 'start' : 'end', style: 'fill:var(--ink)' }, svg);
        t.textContent = T.words[i];
      });
      const qLine = Viz.svg('line', { x1: CX, y1: CY, style: 'stroke:var(--accent)', 'stroke-width': 3 }, svg);
      const qDot = Viz.svg('circle', { r: 5, style: 'fill:var(--accent)' }, svg);
      const qT = Viz.svg('text', { 'font-size': 13, style: 'fill:var(--accent)' }, svg); qT.textContent = 'q';
      const rows = T.words.map((w, i) => {
        const y = 210 + i * 28;
        const lab = Viz.svg('text', { x: 2, y: y + 14, 'font-size': 13, style: 'fill:var(--ink)' }, svg); lab.textContent = w;
        const sc = Viz.svg('text', { x: 58, y: y + 14, 'font-size': 12, style: 'fill:var(--muted)' }, svg);
        const bar = Viz.svg('rect', { x: 140, y: y + 3, height: 14, width: 0, style: 'fill:var(--a2)' }, svg);
        const wt = Viz.svg('text', { x: 356, y: y + 14, 'font-size': 12, 'text-anchor': 'end', style: 'fill:var(--ink)' }, svg);
        return { sc, bar, wt };
      });
      const outT = Viz.svg('text', { x: 2, y: 330, 'font-size': 13, style: 'fill:var(--a3)' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${T.presets.map(p => Viz.button(p, 'alt')).join('')}</div>
        <div class="viz-slider"><label>${T.angle}</label><input type="range" min="0" max="359" value="0" data-k="deg" aria-label="${Viz.esc(T.angle)}"><output data-o="deg">0°</output></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bRestart, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'as-top', k: T.sTopK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'as-sum', k: T.sSumK, v: '1.00', f: T.sSumF }) +
        Viz.stat({ id: 'as-out', k: T.sOutK, v: '', f: T.sOutF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const btns = [...el.querySelectorAll('.viz-btn')];
      const stepBtn = btns[4], restartBtn = btns[5];
      let deg = 0, stage = 3, r;

      function compute() { const a = deg * Math.PI / 180; const q = [3 * Math.cos(a), 3 * Math.sin(a)]; r = M.attend(q, KEYS, VALS); r.q = q; }
      function paint() {
        const [x, y] = P(r.q);
        qLine.setAttribute('x2', x); qLine.setAttribute('y2', y);
        qDot.setAttribute('cx', x); qDot.setAttribute('cy', y);
        qT.setAttribute('x', x + (r.q[0] >= 0 ? 8 : -16)); qT.setAttribute('y', y - 6);
        rows.forEach((row, i) => {
          row.sc.textContent = stage >= 1 ? 's÷√2=' + fmt2(r.scaled[i]) : stage >= 0 ? 's=' + fmt2(r.scores[i]) : '';
          row.bar.setAttribute('width', stage >= 2 ? r.weights[i] * 170 : 0);
          row.wt.textContent = stage >= 2 ? r.weights[i].toFixed(2) : '';
        });
        outT.textContent = stage >= 3 ? T.out(r.out.map(fmt2).join(', ')) : '';
        const top = r.weights.indexOf(Math.max(...r.weights));
        $('[data-s=as-top-v]').textContent = stage >= 2 ? T.words[top] : '—';
        $('[data-s=as-top-f]').innerHTML = stage >= 2 ? T.sTopF(T.words[top], (r.weights[top] * 100).toFixed(0)) : '';
        $('[data-s=as-out-v]').textContent = stage >= 3 ? '[' + r.out.map(fmt2).join(', ') + ']' : '—';
      }
      function list(arr) { return arr.map((v, i) => T.words[i] + ' ' + fmt2(v)).join('，'); }
      function setDeg(d) { deg = d; $('input[data-k="deg"]').value = d; $('[data-o="deg"]').textContent = d + '°'; compute(); stage = 3; pipe.set(4); paint(); }
      btns.slice(0, 4).forEach((b, j) => { b.onclick = () => { setDeg(PRESET_DEG[j]); stage = -1; pipe.set(-1); paint(); term.log(`<span class="c">[${T.presets[j]}]</span> q = [${r.q.map(fmt2).join(', ')}]`); }; });
      stepBtn.onclick = () => {
        if (stage >= 3) { term.log(T.again); return; }
        stage++; pipe.set(stage); paint();
        if (stage === 0) term.log(T.l0(list(r.scores)));
        if (stage === 1) term.log(T.l1(list(r.scaled)));
        if (stage === 2) term.log(T.l2(list(r.weights)));
        if (stage === 3) term.log(T.l3(r.out.map(fmt2).join(', ')));
      };
      restartBtn.onclick = () => { stage = -1; pipe.set(-1); paint(); term.log(T.ready); };
      $('input[data-k="deg"]').oninput = e => setDeg(+e.target.value);
      compute(); pipe.set(4); paint();
      void ctx;
    },
  });

  Viz.register('attention-cost', {
    mount(el, ctx) {
      const NS = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];
      const NAMES = ['1K', '2K', '4K', '8K', '16K', '32K', '64K', '128K', '262K'];
      const body = Viz.frame(el, { code: T.cCode, title: T.cTitle, tag: T.cTag, intro: T.cIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a2)', text: T.cLgFull },
        { color: 'var(--accent)', text: T.cLgQsa, glow: true },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 262', class: 'viz-stage', role: 'img', 'aria-label': T.stage }, left);
      // Log scale: 10^2 .. 10^11 over 340 px.
      const LO = 2, HI = 11, W = 340, X0 = 4;
      const SUP = { 2: '10²', 5: '10⁵', 8: '10⁸', 11: '10¹¹' };
      const X = v => X0 + (Math.log10(Math.max(v, 100)) - LO) / (HI - LO) * W;
      for (let e = LO; e <= HI; e++) {
        Viz.svg('line', { x1: X(10 ** e), y1: 14, x2: X(10 ** e), y2: 232, style: 'stroke:var(--frame)', 'stroke-dasharray': '2 3' }, svg);
        if (e % 3 === 2) { const t = Viz.svg('text', { x: X(10 ** e), y: 252, 'font-size': 12, 'text-anchor': e === HI ? 'end' : e === LO ? 'start' : 'middle', style: 'fill:var(--muted)' }, svg); t.textContent = SUP[e]; }
      }
      const bars = T.rows.map((name, i) => {
        const y = 16 + i * 54;
        const lab = Viz.svg('text', { x: X0, y: y + 12, 'font-size': 12, style: 'fill:var(--ink)' }, svg); lab.textContent = name;
        const bar = Viz.svg('rect', { x: X0, y: y + 20, height: 16, width: 0, style: `fill:${i % 2 ? 'var(--accent)' : 'var(--a2)'}` }, svg);
        const val = Viz.svg('text', { y: y + 33, 'font-size': 12, style: 'fill:var(--ink)' }, svg);
        return { bar, val };
      });
      left.insertAdjacentHTML('beforeend', `<div class="viz-slider"><label>${T.nLabel}</label><input type="range" min="0" max="8" value="5" data-k="n" aria-label="${Viz.esc(T.nLabel)}"><output data-o="n">32K</output></div>`);
      const term = Viz.term(left, T.cReady);
      right.innerHTML =
        Viz.stat({ id: 'ac-s', k: T.sSaveK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'ac-k', k: T.sKvK, v: '', f: T.sKvF }) +
        Viz.stat({ id: 'ac-h', k: T.sHypK, v: '', f: T.sHypF });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict"></div>` + Viz.tryList(T.cTry));
      const $ = s => el.querySelector(s);
      const big = v => v >= 1e9 ? (v / 1e9).toFixed(1) + ' × 10⁹' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' × 10⁶' : Viz.fmt(v);
      const bytes = b => b >= 2 ** 30 ? (b / 2 ** 30).toFixed(1) + ' GiB' : (b / 2 ** 20).toFixed(0) + ' MiB';
      let idx = 5;
      function render(log) {
        const n = NS[idx];
        const vals = [n, M.qsaWidth(n), M.causalPairs(n), M.sparsePairs(n)];
        bars.forEach((b, i) => {
          const w = X(vals[i]) - X0;
          b.bar.setAttribute('width', w);
          b.val.textContent = big(vals[i]);
          const tx = X0 + w + 6;
          if (tx > 300) { b.val.setAttribute('x', X0 + w - 6); b.val.setAttribute('text-anchor', 'end'); b.val.style.fill = 'var(--paper)'; }
          else { b.val.setAttribute('x', tx); b.val.setAttribute('text-anchor', 'start'); b.val.style.fill = 'var(--ink)'; }
        });
        const ratio = vals[2] / vals[3];
        $('[data-o="n"]').textContent = NAMES[idx];
        $('[data-s=ac-s-v]').textContent = T.times(ratio.toFixed(ratio < 10 ? 2 : 0));
        $('[data-s=ac-s-f]').innerHTML = T.sSaveF(n);
        $('[data-s=ac-k-v]').textContent = bytes(M.kvBytes(n));
        $('[data-s=ac-h-v]').textContent = bytes(M.kvBytes(n, { layers: 48, kvHeads: 24 }));
        $('.viz-verdict').innerHTML = n <= M.WIDTH ? T.cVerdictShort(NAMES[idx]) : T.cVerdict(NAMES[idx], ratio.toFixed(0), bytes(M.kvBytes(n)));
        if (log) term.log(T.cLog(NAMES[idx], big(vals[2]), big(vals[3]), ratio.toFixed(ratio < 10 ? 2 : 0)));
      }
      const range = $('input[data-k="n"]');
      range.oninput = () => { idx = +range.value; render(false); };
      range.onchange = () => render(true);
      render(false);
      void ctx;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
