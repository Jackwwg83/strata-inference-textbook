/* Chapter 19 widgets: the draft-window optimizer and the acceptance tracker (EMA).
   All visible text lives in the T tables below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.draft;

  const T = Viz.t({
    zh: {
      code: 'DRAFT_WINDOW', title: '草稿窗口优化器', tag: '教学推演 · 源码默认成本参数',
      intro: '拖动三个滑块。每根柱子是一种窗口（猜 k 个草稿）的速度，<b>速度 = 一轮期望提交的 token 数 ÷ 一轮的时间</b>。时间公式和默认值照抄 Strata 的 <code>CostModel</code>；为了好算，这里每个位置用同一个接受率 p。',
      lgBar: '某个 k 的速度（token/s）', lgPick: 'Strata 的规则会选的 k', lgLine: '门槛：不猜的速度 × 1.05',
      chartLabel: 'k = 0 到 8 的速度柱状图',
      pLabel: '接受率 p', hLabel: '显存命中率', dLabel: '每个草稿的成本',
      axis: 'token/s', kTick: (k) => 'k=' + k,
      sPickK: 'Strata 的规则会选', sPickV: (k) => 'k = ' + k,
      sPickF: (bk) => `<b>= 让「期望 token ÷ 一轮时间」最大的 k</b><br>还必须比不猜快 5% 以上${bk ? `；不设门槛时会选 k = ${bk}` : ''}`,
      sEK: '这个窗口一轮期望提交', sEV: (e) => e + ' 个', sEF: (k) => k ? `<b>= 1 + p + p² + … + p^${k}</b><br>第 1 个由大模型自己给，必得` : '<b>= 1</b><br>不猜：每轮只有大模型自己的 1 个',
      sMsK: '一轮的时间', sMsF: (d, c, s, r) => `<b>= 稠密 ${d} + CPU 专家 ${c} + 同步 ${s} + 起草 ${r}</b><br>单位都是毫秒`,
      sRateK: '速度', sRateF: (e, ms, x) => `<b>= ${e} ÷ ${ms} ms × 1000</b><br>是不猜的 ${x} 倍`,
      ready: '<span class="c">$</span> ready. 拖动滑块，柱子和右边的算式会一起变',
      log: (p, h, d, k, rate, x) => `<span class="c">p=${p}</span> 命中率=${h} 草稿=${d} ms → <span class="y">选 k=${k}</span>，${rate} token/s，是不猜的 ${x} 倍`,
      logGate: (bk) => `<span class="m">门槛</span>：k=${bk} 只比不猜快不到 5%，控制器宁可不猜`,
      verdict: (k, bk, p) => k === 0
        ? (bk ? `接受率 ${p} 时，猜 ${bk} 个只快一点点，没过 5% 的门槛，所以 <b>不猜</b>。这道门槛防止控制器为了几乎为零的收益去冒险。` : `接受率 ${p} 时，任何草稿都不划算：猜错的草稿只增加验证时间。控制器退回 <b>不猜</b>。`)
        : `接受率 ${p} 时最划算的是 <b>猜 ${k} 个</b>。再往后，第 k 个草稿只贡献 p^k 个 token，越来越少；窗口却越来越贵，速度开始下降。`,
      try: [
        '把 p 从 0.86 拉到 <b>0.5</b>：最佳窗口从 3 缩到 1。接受率一低，后面的草稿几乎白猜。',
        '把 p 拉到 <b>0.40</b>：k = 1 的柱子仍比不猜高一点，可没过门槛线，控制器选 <b>k = 0</b>。看终端里的“门槛”一行。',
        '把每个草稿的成本拉到 <b>5 ms</b>：最佳窗口从 3 掉到 1。起草本身也要时间，草稿越慢，越不值得多猜。',
      ],

      eCode: 'ACCEPT_TRACKER', eTitle: '接受率追踪器（EMA）', eTag: '教学推演 · 接受与否用随机数模拟',
      eIntro: 'MTP 每轮固定猜 3 个。前 150 轮真实接受率是 0.86；第 150 轮起换了话题，降到 0.55。控制器看不到真实值，只能用<b>指数移动平均</b>从每轮的结果里估计。按 <b>单步</b> 看一轮怎样记账，按 <b>跑完 300 轮</b> 看估计怎样追上变化。',
      eLgTrue: '真实接受率（控制器看不到）', eLgP1: '第 1 个草稿的估计 p₁', eLgP3: '第 3 个草稿的估计 p₃', eLgK: '底部小柱：按当时估计会选的 k',
      eSteps: ['起草 3 个', '一次验证', '数接受了几个', '记账（EMA）', '重估窗口'],
      eChart: '估计值随轮数变化的折线图', eSwitch: '换话题', eRound: '轮',
      bStep: '▶ 单步', bAll: '▶▶ 跑完 300 轮', bReset: '重置', bSeed: '换一组随机数',
      aLabel: '更新权重 α', naive: '错误做法：把没验证的位置也记成失败',
      sP1K: '第 1 个草稿的估计 p₁', sP1F: (t) => `<b>新估计 = 旧估计 + α × (这次结果 − 旧估计)</b><br>真实值 ${t}；结果记 1 = 接受，0 = 拒绝`,
      sP3K: '第 3 个草稿的估计 p₃', sP3F: (t, naive) => naive ? `真实值 ${t}<br><b>错误记账会把它压向 p₁ × p₂ × p₃</b>` : `真实值 ${t}<br><b>只在前两个都接受的轮次里才更新</b>`,
      sHalfK: '半衰期（旧数据的权重减半）', sHalfV: (h) => h + ' 轮', sHalfF: '<b>= ln 0.5 ÷ ln(1 − α)</b><br>α 越大，忘得越快、追得越快',
      sNoiseK: '估计的抖动（标准差）', sNoiseF: '<b>≈ √(α ÷ (2 − α) × p × (1 − p))</b><br>按 p = 0.86 算；α 越大，抖得越凶',
      sKK: '按此刻的估计会选', sKV: (k) => 'k = ' + k, sKF: '<b>= 上一个交互图的规则</b><br>本模拟里窗口仍固定为 3，只看建议',
      eReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始',
      e0: (n, t) => `<span class="c">[第 ${n} 轮]</span> 真实接受率 ${t}（控制器不知道）。MTP 猜 3 个草稿`,
      e1: '<span class="m">验证</span>：大模型一次算完 4 个位置（上一个 token + 3 个草稿）',
      e2: (a) => a === 3 ? '<span class="y">3 个全部接受</span>，再加大模型自己的 1 个，本轮提交 4 个 token' : `<span class="y">接受 ${a} 个</span>，第 ${a + 1} 个被拒；本轮提交 ${a + 1} 个 token`,
      e3: (parts, p1) => `<span class="w">记账</span>：${parts}。p₁ 现在是 ${p1}`,
      e3ok: (i) => `位置 ${i} 记成功`, e3bad: (i) => `位置 ${i} 记失败`, e3skip: (i) => `位置 ${i} 没验证，不记`,
      e3naive: (i) => `位置 ${i} 没验证却记失败（错误做法）`, e3ext: '位置 4–8 没试过，往 p₃ 拉一点',
      e4: (k) => `<span class="c">→</span> 按新估计，控制器此刻会选 k = ${k}`,
      eSwitchLog: '<span class="m">// 第 150 轮：换话题，真实接受率从 0.86 掉到 0.55</span>',
      eFast: '<span class="y">// 快进到第 300 轮</span>',
      eDone: (p1, p3, k) => `<span class="y">完成</span>：p₁ ≈ ${p1}，p₃ ≈ ${p3}，控制器会选 k = ${k}`,
      eEnd: '<span class="y">// 300 轮已跑完，按 [ 重置 ] 再来</span>',
      eVerdict: (a, h, before, after, k0, k1, naive, p3) => `α = ${a} 时，估计大约 ${h} 轮就把旧数据的分量忘掉一半。换话题前 p₁ ≈ ${before}，最后 ≈ ${after}；按估计会选的窗口从 k = ${k0} 变成 k = ${k1}。` +
        (naive ? `<br>你打开了错误做法：p₃ 最后只有 ${p3}，比真实的 0.55 低。没验证的位置被当成失败，后面的位置被重复扣分，控制器会以为长窗口不划算。` : '<br>把 α 调大再跑一次：追得更快，但曲线抖得更凶。α 是“反应快”和“不被噪声骗”之间的取舍。'),
      eTry: [
        '先用默认 α = 0.05 跑完 300 轮：第 150 轮之后，p₁ 的曲线要过十几轮才明显往下走。这就是平均的<b>滞后</b>。',
        '把 α 拉到 <b>0.3</b> 再跑：半衰期不到 2 轮，换话题后几乎立刻追上，但曲线上下乱跳。这就是<b>噪声</b>。',
        '勾上“错误做法”再跑：前 150 轮的 p₃ 就掉到 0.64 左右（≈ 0.86³），底部建议的 k 变小。把“没看到”当成“失败”会冤枉长窗口。',
      ],
    },
  });

  const fmt2 = (x) => x.toFixed(2);
  const css = (el, s) => { el.setAttribute('style', s); return el; };

  Viz.register('draft-window', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgBar },
        { color: 'var(--accent)', text: T.lgPick, glow: true },
        { color: 'var(--a2)', text: T.lgLine },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 540, H = 250, X0 = 52, X1 = 530, Y0 = 20, Y1 = 210;
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-stage', role: 'img', 'aria-label': T.chartLabel }, left);
      const grid = Viz.svg('g', {}, svg), bars = [], vals = [], ticks = [];
      const slot = (X1 - X0) / 9;
      for (let k = 0; k <= 8; k++) {
        bars.push(css(Viz.svg('rect', { x: X0 + k * slot + 6, width: slot - 12, y: Y1, height: 0 }, svg), 'fill:var(--frame)'));
        vals.push(css(Viz.svg('text', { x: X0 + k * slot + slot / 2, y: Y1 - 4, 'text-anchor': 'middle', 'font-size': 12 }, svg), 'fill:var(--ink)'));
        const t = css(Viz.svg('text', { x: X0 + k * slot + slot / 2, y: Y1 + 18, 'text-anchor': 'middle', 'font-size': 12 }, svg), 'fill:var(--muted)');
        t.textContent = T.kTick(k); ticks.push(t);
      }
      const gate = css(Viz.svg('line', { x1: X0, x2: X1 }, svg), 'stroke:var(--a2);stroke-width:1.5;stroke-dasharray:5 4');
      const axisT = css(Viz.svg('text', { x: 4, y: 14, 'font-size': 12 }, svg), 'fill:var(--muted)');
      axisT.textContent = T.axis;
      left.insertAdjacentHTML('beforeend', [
        ['p', T.pLabel, 0, 1, 0.01, 0.86], ['h', T.hLabel, 0, 1, 0.05, 0.55], ['d', T.dLabel, 0, 6, 0.1, 1.2],
      ].map(([id, label, min, max, step, v]) => `<div class="viz-slider"><label>${label}</label><input data-i="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}" aria-label="${Viz.esc(label)}"><output data-o="${id}"></output></div>`).join(''));
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'w-k', k: T.sPickK, v: '', f: '' }) +
        Viz.stat({ id: 'w-e', k: T.sEK, v: '', f: '' }) +
        Viz.stat({ id: 'w-ms', k: T.sMsK, v: '', f: '' }) +
        Viz.stat({ id: 'w-r', k: T.sRateK, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.try));
      const $ = (s) => el.querySelector(s);
      const input = (id) => $(`input[data-i="${id}"]`);
      const set = (id, v, f) => { $(`[data-s="${id}-v"]`).innerHTML = v; $(`[data-s="${id}-f"]`).innerHTML = f; };

      function read() {
        const p = +input('p').value, h = +input('h').value, d = +input('d').value;
        $('[data-o="p"]').textContent = p.toFixed(2);
        $('[data-o="h"]').textContent = Math.round(h * 100) + '%';
        $('[data-o="d"]').textContent = d.toFixed(1) + ' ms';
        return { p, h, d, c: M.choose(p, { ...M.DEFAULT_COST, hitRate: h, mtpDraftMs: d }) };
      }
      function draw() {
        const { p, c } = read();
        const top = Math.max(60, Math.ceil(Math.max(c.threshold, ...c.rows.map(r => r.rate)) / 20) * 20);
        const y = (v) => Y1 - v / top * (Y1 - Y0);
        grid.innerHTML = '';
        for (let v = 0; v <= top; v += top / 4) {
          css(Viz.svg('line', { x1: X0, x2: X1, y1: y(v), y2: y(v) }, grid), 'stroke:var(--frame);stroke-width:1');
          const t = css(Viz.svg('text', { x: X0 - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11 }, grid), 'fill:var(--muted)');
          t.textContent = Math.round(v);
        }
        c.rows.forEach((r, k) => {
          bars[k].setAttribute('y', y(r.rate)); bars[k].setAttribute('height', Y1 - y(r.rate));
          bars[k].setAttribute('style', k === c.k ? 'fill:var(--accent)' : 'fill:var(--frame)');
          vals[k].setAttribute('y', y(r.rate) - 5); vals[k].textContent = r.rate.toFixed(0);
          vals[k].setAttribute('style', k === c.k ? 'fill:var(--accent);font-weight:700' : 'fill:var(--ink)');
        });
        gate.setAttribute('y1', y(c.threshold)); gate.setAttribute('y2', y(c.threshold));
        const s = c.rows[c.k].step, x = (c.rate / c.baseline).toFixed(2);
        set('w-k', T.sPickV(c.k), T.sPickF(c.k !== c.bestK ? c.bestK : 0));
        set('w-e', T.sEV(c.e.toFixed(2)), T.sEF(c.k));
        set('w-ms', c.ms.toFixed(1) + ' ms', T.sMsF(s.dense.toFixed(1), s.cpu.toFixed(1), s.sync.toFixed(1), s.draft.toFixed(1)));
        set('w-r', c.rate.toFixed(1) + ' token/s', T.sRateF(c.e.toFixed(2), c.ms.toFixed(1), x));
        $('.viz-verdict').innerHTML = T.verdict(c.k, c.bestK, p.toFixed(2));
        return c;
      }
      function logNow() {
        const { p, h, d } = read(), c = draw();
        term.log(T.log(p.toFixed(2), Math.round(h * 100) + '%', d.toFixed(1), c.k, c.rate.toFixed(1), (c.rate / c.baseline).toFixed(2)));
        if (c.k === 0 && c.bestK > 0) term.log(T.logGate(c.bestK));
      }
      el.querySelectorAll('input[type=range]').forEach(i => { i.oninput = draw; i.onchange = logNow; });
      draw();
    },
  });

  Viz.register('draft-ema', {
    mount(el, ctx) {
      const ROUNDS = 300, SWITCH = 150, P0 = 0.86, P1 = 0.55, WIN = 3;
      const body = Viz.frame(el, { code: T.eCode, title: T.eTitle, tag: T.eTag, intro: T.eIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--muted)', text: T.eLgTrue },
        { color: 'var(--accent)', text: T.eLgP1, glow: true },
        { color: 'var(--a2)', text: T.eLgP3 },
        { color: 'var(--frame)', text: T.eLgK },
      ]));
      const pipe = Viz.pipe(body, T.eSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 540, H = 262, X0 = 40, X1 = 530, PY0 = 16, PY1 = 176, KY1 = 236, KH = 40;
      const X = (i) => X0 + i * (X1 - X0) / ROUNDS, Y = (v) => PY0 + (1 - v) * (PY1 - PY0);
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-stage', role: 'img', 'aria-label': T.eChart }, left);
      for (const v of [0, 0.25, 0.5, 0.75, 1]) {
        css(Viz.svg('line', { x1: X0, x2: X1, y1: Y(v), y2: Y(v) }, svg), 'stroke:var(--frame);stroke-width:1');
        css(Viz.svg('text', { x: X0 - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11 }, svg), 'fill:var(--muted)').textContent = v.toFixed(2);
      }
      css(Viz.svg('line', { x1: X(SWITCH), x2: X(SWITCH), y1: PY0, y2: KY1 }, svg), 'stroke:var(--muted);stroke-width:1;stroke-dasharray:3 3');
      css(Viz.svg('text', { x: X(SWITCH) + 5, y: PY0 + 12, 'font-size': 12 }, svg), 'fill:var(--muted)').textContent = T.eSwitch;
      css(Viz.svg('path', { d: `M${X0} ${Y(P0)}H${X(SWITCH)}V${Y(P1)}H${X1}`, fill: 'none' }, svg), 'stroke:var(--muted);stroke-width:1.5;stroke-dasharray:6 4;fill:none');
      css(Viz.svg('text', { x: X1, y: KY1 + 20, 'text-anchor': 'end', 'font-size': 11 }, svg), 'fill:var(--muted)').textContent = ROUNDS + ' ' + T.eRound;
      css(Viz.svg('text', { x: X0, y: KY1 + 20, 'font-size': 11 }, svg), 'fill:var(--muted)').textContent = '0';
      const kG = Viz.svg('g', {}, svg);
      const l3 = css(Viz.svg('path', { d: '', fill: 'none' }, svg), 'stroke:var(--a2);stroke-width:1.8;fill:none');
      const l1 = css(Viz.svg('path', { d: '', fill: 'none' }, svg), 'stroke:var(--accent);stroke-width:2.2;fill:none');
      const dot = css(Viz.svg('circle', { r: 4, cx: X0, cy: Y(P0) }, svg), 'fill:var(--accent)');

      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}${Viz.button(T.bSeed, 'ghost')}</div>
        <div class="viz-slider"><label>${T.aLabel}</label><input type="range" min="0.01" max="0.5" step="0.01" value="0.05" aria-label="${Viz.esc(T.aLabel)}"><output>α = 0.05</output></div>
        <label class="viz-row" style="font-size:14px;gap:8px"><input type="checkbox" style="accent-color:var(--a2)"> ${T.naive}</label>`);
      const term = Viz.term(left, T.eReady);
      right.innerHTML =
        Viz.stat({ id: 'e-p1', k: T.sP1K, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'e-p3', k: T.sP3K, v: '', f: '' }) +
        Viz.stat({ id: 'e-k', k: T.sKK, v: '', f: T.sKF }) +
        Viz.stat({ id: 'e-h', k: T.sHalfK, v: '', f: T.sHalfF }) +
        Viz.stat({ id: 'e-n', k: T.sNoiseK, v: '', f: T.sNoiseF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.eTry));
      const $ = (s) => el.querySelector(s);
      const btns = el.querySelectorAll('.viz-btn'), [stepBtn, allBtn, resetBtn, seedBtn] = btns;
      const range = $('input[type=range]'), box = $('input[type=checkbox]');
      let alpha = 0.05, naive = false, seed = 7, sim = null, shown = 0, busy = false;
      const estAt = (i) => (i < ROUNDS ? sim.est[i] : sim.final);
      const set = (id, v, f) => { $(`[data-s="${id}-v"]`).innerHTML = v; if (f !== undefined) $(`[data-s="${id}-f"]`).innerHTML = f; };

      function rebuild() {
        sim = M.simulate({ rounds: ROUNDS, switchAt: SWITCH, pBefore: P0, pAfter: P1, alpha, mode: naive ? 'naive' : 'censored', seed, window: WIN });
        shown = 0; pipe.set(-1); $('.viz-verdict').hidden = true; paint();
      }
      function paint() {
        let d1 = `M${X(0)} ${Y(estAt(0)[0])}`, d3 = `M${X(0)} ${Y(estAt(0)[2])}`;
        for (let i = 1; i <= shown; i++) { d1 += `L${X(i).toFixed(1)} ${Y(estAt(i)[0]).toFixed(1)}`; d3 += `L${X(i).toFixed(1)} ${Y(estAt(i)[2]).toFixed(1)}`; }
        l1.setAttribute('d', d1); l3.setAttribute('d', d3);
        dot.setAttribute('cx', X(shown)); dot.setAttribute('cy', Y(estAt(shown)[0]));
        kG.innerHTML = '';
        const bw = (X1 - X0) / ROUNDS;
        for (let i = 0; i < shown; i++) {
          const k = M.choose(estAt(i + 1)).k;
          if (k) css(Viz.svg('rect', { x: X(i), y: KY1 - k / 8 * KH, width: Math.max(bw, 1), height: k / 8 * KH }, kG), 'fill:var(--frame)');
        }
        const now = estAt(shown), truth = shown < SWITCH ? P0 : P1;
        set('e-p1', fmt2(now[0]), T.sP1F(truth));
        set('e-p3', fmt2(now[2]), T.sP3F(truth, naive));
        set('e-k', T.sKV(M.choose(now).k));
        set('e-h', T.sHalfV(M.halfLife(alpha).toFixed(1)));
        set('e-n', '± ' + M.emaNoise(alpha, P0).toFixed(3));
      }
      function verdict() {
        const before = estAt(SWITCH), after = sim.final;
        $('.viz-verdict').innerHTML = T.eVerdict(alpha.toFixed(2), M.halfLife(alpha).toFixed(1), fmt2(before[0]), fmt2(after[0]), M.choose(before).k, M.choose(after).k, naive, fmt2(after[2]));
        $('.viz-verdict').hidden = false;
      }
      async function step(fast) {
        const i = shown, a = sim.accepted[i], next = estAt(i + 1);
        if (i === SWITCH) term.log(T.eSwitchLog);
        for (let ph = 0; ph < 5; ph++) {
          if (!fast) {
            pipe.set(ph);
            if (ph === 0) term.log(T.e0(i + 1, sim.truth[i]));
            if (ph === 1) term.log(T.e1);
            if (ph === 2) term.log(T.e2(a));
            if (ph === 3) {
              const parts = [];
              for (let j = 0; j < WIN; j++) parts.push(j < a ? T.e3ok(j + 1) : j === a ? T.e3bad(j + 1) : naive ? T.e3naive(j + 1) : T.e3skip(j + 1));
              if (a === WIN) parts.push(T.e3ext);
              shown = i + 1; paint();
              term.log(T.e3(parts.join('，'), fmt2(next[0])));
            }
            if (ph === 4) term.log(T.e4(M.choose(next).k));
            await ctx.sleep(260);
          }
        }
        shown = i + 1;
      }
      async function guard(fn) {
        if (busy) return;
        const ctl = [...btns, range, box];
        busy = true; ctl.forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) ctl.forEach(b => b.disabled = false);
      }
      stepBtn.onclick = () => guard(async () => {
        if (shown >= ROUNDS) { term.log(T.eEnd); return; }
        await step(false); paint();
        if (shown >= ROUNDS) verdict();
      });
      allBtn.onclick = () => guard(async () => {
        if (shown >= ROUNDS) { term.log(T.eEnd); return; }
        term.log(T.eFast);
        while (shown < ROUNDS) {
          for (let n = 0; n < 5 && shown < ROUNDS; n++) await step(true);
          paint();
          await ctx.sleep(16);
        }
        pipe.set(-1);
        const f = sim.final;
        term.log(T.eDone(fmt2(f[0]), fmt2(f[2]), M.choose(f).k));
        verdict();
      });
      resetBtn.onclick = () => guard(async () => { rebuild(); term.clear(); term.log(T.eReady); });
      seedBtn.onclick = () => guard(async () => { seed += 1; rebuild(); term.clear(); term.log(T.eReady); });
      range.oninput = () => { alpha = +range.value; $('output').textContent = 'α = ' + alpha.toFixed(2); rebuild(); };
      range.onchange = () => term.log(T.eReady);
      box.onchange = () => { naive = box.checked; rebuild(); term.log(T.eReady); };
      rebuild();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
