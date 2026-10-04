/* Chapter 10 widgets: the MoE router and the 664 MB transfer race.
   All visible text lives in the T tables below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.moe;

  const T = Viz.t({
    zh: {
      code: 'ROUTER_SIM', title: '路由器模拟器', tag: '教学推演 · 分数为随机数',
      intro: '一层的 512 个专家排成 32 × 16 的格子。按 <b>单步</b>，一步一步看路由器怎样给专家打分、挑出前 k 个、再把结果加权相加。',
      lgCell: '一个格子 = 本层的一个专家', lgScore: '正在打分（越亮分越高）', lgPick: '被选中，参与计算',
      steps: ['收到 token', '打分', '挑前 k', '专家计算', '加权相加', '下一层'],
      gridLabel: '512 个专家的打分网格',
      bStep: '▶ 单步', bAll: '▶▶ 跑完 48 层', bReset: '重置',
      kLabel: '每层挑几个专家（k）',
      layers: (n) => `已完成 ${n} / 48 层`, read: (mb) => `累计读取 ${mb} MB`,
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始，每按一次走流程条上的一步',
      readyShort: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始',
      sPicksK: '每个 token 的专家选择次数', sPicksF: '<b>= 48 层 × k</b><br>每一层都重新挑一次',
      sParamsK: '每个 token 实际动用的参数',
      sParamsF: (picks, pct) => `<b>= ${picks} × 491.52 万 + 约 42 亿</b><br>选中专家的参数 + 每步都用的部分<br>占全部 1250 亿的 ${pct}%`,
      sBytesK: '每个 token 要读的专家数据', sBytesF: (picks) => `<b>= ${picks} × 1.3824 MB</b><br>每个专家在标准格式下占 1,382,400 字节`,
      sWK: '本层选中专家的话语权（加权系数）', sWEmpty: '按“单步”走到第 5 步后显示', sWF: '分数越高，权重越大；权重加起来等于 1', sWMore: (n) => `…另外 ${n} 个`,
      params: (x) => `${Math.round(x / 1e8)} 亿`,
      try: [
        '连按 <b>单步</b>，看流程条一格格往前走，终端里每一步都有一句说明。',
        '把 k 拉到 <b>1</b>，再拉到 <b>64</b>：动用的参数从约 44 亿涨到约 193 亿。k 越大，每步干活的专家越多，也越慢。',
        '按 <b>跑完 48 层</b>：每层都重新挑一次，48 层累计正好读 664 MB。这只是生成<b>一个</b> token 的工作量。',
      ],
      restart: '<span class="y">// 48 层已跑完，从第 1 层重新开始</span>',
      l0: (n) => `<span class="c">[L${String(n).padStart(2, '0')}]</span> 收到 token 的数据，交给第 ${n} 层的路由器`,
      l1: '<span class="m">打分</span>：路由器给 512 个专家每人算一个分数（图中越亮分越高）',
      l2: (k, ids, rest) => `<span class="c">挑前 ${k}</span>：选中 ${ids}，其余 ${rest} 个这一步不干活`,
      l3: (k, mb) => `<span class="w">专家计算</span>：${k} 个专家各算一份结果，要读 ${k} × 1.38 MB ≈ ${mb} MB 参数`,
      l4: (max) => `<span class="y">加权相加</span>：把分数换算成权重（最大 ${max}，合计 1.00），得分高的专家话语权大`,
      l5: (n, mb) => `<span class="c">→</span> 结果交给下一层。已完成 ${n} / 48 层，累计读取 ${mb} MB`,
      fast: '<span class="y">// 快进：连续跑完 48 层</span>',
      done: (k, mb) => `<span class="y">完成</span>：48 层 × ${k} = ${48 * k} 次选择，共读取 ${mb} MB。这只是生成<span class="w">一个</span> token 的工作量`,

      rCode: 'TRANSFER_RACE', rTitle: '搬运竞速：664 MB', rTag: '理论峰值 · 教学推演',
      rIntro: '一个 token 要读约 664 MB 的专家数据。让四个地方同时搬这 664 MB，看谁先到终点。<b>搬运时间 = 数据量 ÷ 带宽</b>。',
      rLgLane: '每条赛道 = 一种存储或通道', rLgFill: '条越快填满 = 带宽越大',
      lanes: [['显存', 'RTX 5070 显存'], ['内存', 'DDR5-5200 双通道'], ['PCIe 5.0', '显卡与内存之间的总线'], ['固态硬盘', '常见 NVMe 顺序读']],
      rEq: (hw, mb, bw, ms, tok) => `${hw}：${mb} MB ÷ ${bw} GB/s = ${ms} ms → 每秒最多 ${tok} 个 token`,
      rGo: '▶ 开跑', rSlow: '动画放慢 60 倍',
      rVerdict: (pcie, pTok, ssd, sTok) => `① 走 PCIe 搬一遍要 <b>${pcie} ms</b>，光搬运就把速度压到每秒最多 <b>${pTok}</b> 个 token，还没开始计算。<br>② 从硬盘读要 <b>${ssd} ms</b>，每秒最多 ${sTok} 个 token，不可能每次都读。<br>③ 所以 Strata 让 CPU 直接在内存里计算大部分没命中的专家，这些数据不必经过 PCIe。`,
    },
    en: {
      code: 'ROUTER_SIM', title: 'Router simulator', tag: 'Teaching estimate · random scores',
      intro: 'One layer\'s 512 experts sit in a 32 × 16 grid. Press <b>Step</b> to watch, one step at a time, how the router scores the experts, picks the top k, and adds up their results by weight.',
      lgCell: 'One cell = one expert in this layer', lgScore: 'Being scored (brighter = higher score)', lgPick: 'Picked, takes part in the computation',
      steps: ['Token arrives', 'Score', 'Pick top k', 'Experts compute', 'Weighted sum', 'Next layer'],
      gridLabel: 'Scoring grid of 512 experts',
      bStep: '▶ Step', bAll: '▶▶ Run all 48 layers', bReset: 'Reset',
      kLabel: 'Experts picked per layer (k)',
      layers: (n) => `${n} / 48 layers done`, read: (mb) => `${mb} MB read so far`,
      ready: '<span class="c">$</span> ready. Press [ ▶ Step ] to begin; each press moves one step along the strip',
      readyShort: '<span class="c">$</span> ready. Press [ ▶ Step ] to begin',
      sPicksK: 'Expert picks per token', sPicksF: '<b>= 48 layers × k</b><br>every layer picks again',
      sParamsK: 'Parameters one token actually uses',
      sParamsF: (picks, pct) => `<b>= ${picks} × 4.9152 M + about 4.2 B</b><br>chosen experts' parameters + the parts used every step<br>${pct}% of the full 125 billion`,
      sBytesK: 'Expert data one token must read', sBytesF: (picks) => `<b>= ${picks} × 1.3824 MB</b><br>each expert takes 1,382,400 bytes in the standard format`,
      sWK: 'How much say each picked expert gets (weights)', sWEmpty: 'Shown once you Step to step 5', sWF: 'Higher score, bigger weight; the weights add up to 1', sWMore: (n) => `…and ${n} more`,
      params: (x) => `${(x / 1e9).toFixed(1)} billion`,
      try: [
        'Keep pressing <b>Step</b> and watch the strip advance cell by cell; the terminal explains every step in one line.',
        'Drag k down to <b>1</b>, then up to <b>64</b>: the parameters used rise from about 4.4 billion to about 19.3 billion. A bigger k means more experts working each step, and a slower step.',
        'Press <b>Run all 48 layers</b>: every layer picks again, and the 48 layers read exactly 664 MB in total. That is the work for generating just <b>one</b> token.',
      ],
      restart: '<span class="y">// all 48 layers done; starting again from layer 1</span>',
      l0: (n) => `<span class="c">[L${String(n).padStart(2, '0')}]</span> token data arrives and goes to the router of layer ${n}`,
      l1: '<span class="m">Score</span>: the router computes a score for each of the 512 experts (brighter = higher)',
      l2: (k, ids, rest) => `<span class="c">Pick top ${k}</span>: chose ${ids}; the other ${rest} sit this step out`,
      l3: (k, mb) => `<span class="w">Experts compute</span>: each of the ${k} experts computes a result, reading ${k} × 1.38 MB ≈ ${mb} MB of parameters`,
      l4: (max) => `<span class="y">Weighted sum</span>: scores become weights (largest ${max}, total 1.00); higher-scoring experts get more say`,
      l5: (n, mb) => `<span class="c">→</span> result goes to the next layer. ${n} / 48 layers done, ${mb} MB read so far`,
      fast: '<span class="y">// fast-forward: running all 48 layers</span>',
      done: (k, mb) => `<span class="y">Done</span>: 48 layers × ${k} = ${48 * k} picks, ${mb} MB read in total. That is the work for generating just <span class="w">one</span> token`,

      rCode: 'TRANSFER_RACE', rTitle: 'Transfer race: 664 MB', rTag: 'Theoretical peak · Teaching estimate',
      rIntro: 'One token needs to read about 664 MB of expert data. Let four places move those 664 MB at once and see who finishes first. <b>Transfer time = data size ÷ bandwidth</b>.',
      rLgLane: 'Each lane = one kind of storage or link', rLgFill: 'The faster a bar fills, the higher the bandwidth',
      lanes: [['VRAM', 'RTX 5070 VRAM'], ['RAM', 'dual-channel DDR5-5200'], ['PCIe 5.0', 'the bus between GPU and RAM'], ['SSD', 'typical NVMe sequential read']],
      rEq: (hw, mb, bw, ms, tok) => `${hw}: ${mb} MB ÷ ${bw} GB/s = ${ms} ms → at most ${tok} tokens per second`,
      rGo: '▶ Go', rSlow: 'animation slowed 60×',
      rVerdict: (pcie, pTok, ssd, sTok) => `① One trip over PCIe takes <b>${pcie} ms</b>; the moving alone caps you at <b>${pTok}</b> tokens per second, before any computing starts.<br>② Reading from the SSD takes <b>${ssd} ms</b>, at most ${sTok} tokens per second, so you cannot read from it every time.<br>③ That is why Strata lets the CPU compute most missed experts right in RAM, so that data never has to cross PCIe.`,
    },
    ja: {
      code: 'ROUTER_SIM', title: 'ルーターシミュレーター', tag: '教育用の試算 · 得点は乱数',
      intro: '1 層の 512 個のエキスパートを、32 × 16 のマス目に並べました。<b>ステップ</b>を押すと、ルーターがエキスパートに得点をつけ、上位 k 個を選び、結果を重み付きで足し合わせる様子を 1 歩ずつ見られます。',
      lgCell: '1 マス = この層のエキスパート 1 個', lgScore: '採点中（明るいほど高得点）', lgPick: '選ばれて計算に参加',
      steps: ['トークン到着', '採点', '上位 k を選ぶ', 'エキスパート計算', '重み付き合計', '次の層へ'],
      gridLabel: '512 個のエキスパートの採点グリッド',
      bStep: '▶ ステップ', bAll: '▶▶ 48 層を最後まで', bReset: 'リセット',
      kLabel: '1 層で選ぶエキスパート数（k）',
      layers: (n) => `${n} / 48 層が完了`, read: (mb) => `ここまでの読み込み量 ${mb} MB`,
      ready: '<span class="c">$</span> ready. [ ▶ ステップ ] を押して開始。押すたびに、進行バーが 1 つ進みます',
      readyShort: '<span class="c">$</span> ready. [ ▶ ステップ ] を押して開始',
      sPicksK: '1 トークンあたりのエキスパート選択回数', sPicksF: '<b>= 48 層 × k</b><br>層ごとに選び直します',
      sParamsK: '1 トークンが実際に動かすパラメータ',
      sParamsF: (picks, pct) => `<b>= ${picks} × 491.52 万 + 約 42 億</b><br>選ばれたエキスパートのパラメータ + 毎ステップ使う部分<br>全体 1250 億の ${pct}%`,
      sBytesK: '1 トークンが読むエキスパートのデータ', sBytesF: (picks) => `<b>= ${picks} × 1.3824 MB</b><br>標準フォーマットでは、エキスパート 1 個が 1,382,400 バイト`,
      sWK: '選ばれたエキスパートの発言力（重み係数）', sWEmpty: '「ステップ」で第 5 段階まで進むと表示されます', sWF: '得点が高いほど重みが大きく、重みの合計は 1 になります', sWMore: (n) => `…ほか ${n} 個`,
      params: (x) => `${Math.round(x / 1e8)} 億`,
      try: [
        '<b>ステップ</b>を続けて押し、進行バーが 1 つずつ進むのを見ましょう。ターミナルに、段階ごとの説明が 1 行出ます。',
        'k を <b>1</b> に下げ、次に <b>64</b> に上げてみましょう。動かすパラメータは約 44 億から約 193 億に増えます。k が大きいほど、1 ステップで働くエキスパートが増え、遅くなります。',
        '<b>48 層を最後まで</b>を押します。層ごとに選び直し、48 層の合計でちょうど 664 MB を読みます。これは、トークンを<b>1 つ</b>生成する分の仕事量です。',
      ],
      restart: '<span class="y">// 48 層が終わったので、第 1 層からやり直します</span>',
      l0: (n) => `<span class="c">[L${String(n).padStart(2, '0')}]</span> トークンのデータが届き、第 ${n} 層のルーターに渡されます`,
      l1: '<span class="m">採点</span>：ルーターが 512 個のエキスパートそれぞれに得点をつけます（図では明るいほど高得点）',
      l2: (k, ids, rest) => `<span class="c">上位 ${k} を選ぶ</span>：${ids} を選択。残りの ${rest} 個は、このステップでは働きません`,
      l3: (k, mb) => `<span class="w">エキスパート計算</span>：${k} 個のエキスパートが 1 つずつ結果を計算します。読むパラメータは ${k} × 1.38 MB ≈ ${mb} MB`,
      l4: (max) => `<span class="y">重み付き合計</span>：得点を重みに変えます（最大 ${max}、合計 1.00）。高得点のエキスパートほど発言力が大きくなります`,
      l5: (n, mb) => `<span class="c">→</span> 結果を次の層に渡します。${n} / 48 層が完了、ここまでの読み込み量 ${mb} MB`,
      fast: '<span class="y">// 早送り：48 層を続けて実行します</span>',
      done: (k, mb) => `<span class="y">完了</span>：48 層 × ${k} = ${48 * k} 回の選択、合計 ${mb} MB を読みました。これは、トークンを<span class="w">1 つ</span>生成する分の仕事量です`,

      rCode: 'TRANSFER_RACE', rTitle: '転送レース：664 MB', rTag: '理論ピーク · 教育用の試算',
      rIntro: '1 トークンは、約 664 MB のエキスパートデータを読みます。4 か所で同時にこの 664 MB を運んで、どこが先にゴールするか見てみましょう。<b>転送時間 = データ量 ÷ 帯域幅</b>です。',
      rLgLane: '1 レーン = 1 種類の記憶装置または経路', rLgFill: 'バーが速く埋まるほど、帯域幅が大きい',
      lanes: [['VRAM', 'RTX 5070 の VRAM'], ['RAM', 'DDR5-5200 デュアルチャネル'], ['PCIe 5.0', 'GPU と RAM をつなぐバス'], ['SSD', '一般的な NVMe のシーケンシャル読み出し']],
      rEq: (hw, mb, bw, ms, tok) => `${hw}：${mb} MB ÷ ${bw} GB/s = ${ms} ms → 毎秒最大 ${tok} トークン`,
      rGo: '▶ スタート', rSlow: 'アニメーションを 60 倍ゆっくり',
      rVerdict: (pcie, pTok, ssd, sTok) => `① PCIe 経由で 1 回運ぶと <b>${pcie} ms</b> かかります。運ぶだけで、速度は毎秒最大 <b>${pTok}</b> トークンに抑えられます。計算はまだ始まっていません。<br>② SSD から読むと <b>${ssd} ms</b> かかり、毎秒最大 ${sTok} トークンです。毎回読むのは不可能です。<br>③ だから Strata は、ミスしたエキスパートの大部分を CPU が RAM の中でそのまま計算します。そのデータは PCIe を通らずに済みます。`,
    },
  });

  Viz.register('moe-router', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgCell },
        { color: 'var(--a2)', text: T.lgScore },
        { color: 'var(--accent)', text: T.lgPick, glow: true },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 544 272', class: 'viz-stage', role: 'img', 'aria-label': T.gridLabel }, left);
      const cells = [];
      for (let i = 0; i < M.EXPERTS; i++) cells.push(Viz.svg('rect', { x: (i % 32) * 17 + 1.5, y: Math.floor(i / 32) * 17 + 1.5, width: 14, height: 14, class: 'viz-cell' }, svg));
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>
        <div class="viz-slider"><label>${T.kLabel}</label><input type="range" min="1" max="64" value="10" aria-label="${Viz.esc(T.kLabel)}"><output>k = 10</output></div>
        <div class="viz-row" style="justify-content:space-between;font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:10px"><span class="lay"></span><span class="byt"></span></div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'r-picks', k: T.sPicksK, v: '480', f: T.sPicksF }) +
        Viz.stat({ id: 'r-params', k: T.sParamsK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'r-bytes', k: T.sBytesK, v: '', f: '' }) +
        `<div class="viz-stat"><div class="k">${T.sWK}</div><div class="viz-bars r-w"></div><div class="f">${T.sWF}</div></div>`;
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const range = $('input[type=range]');
      const emptyWeights = () => { $('.r-w').innerHTML = `<div><span style="grid-column:1/-1">${T.sWEmpty}</span></div>`; };
      let k = 10, layer = 0, phase = 0, busy = false, scores = new Float32Array(M.EXPERTS), picked = [];
      const mbRead = () => Math.round(layer * k * M.EXPERT_BYTES / 1e6);

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
        $('[data-s=r-params-v]').textContent = T.params(s.params);
        $('[data-s=r-params-f]').innerHTML = T.sParamsF(s.picks, (s.ratio * 100).toFixed(1));
        $('[data-s=r-bytes-v]').textContent = Viz.fmt(Math.round(s.bytes / 1e6)) + ' MB';
        $('[data-s=r-bytes-f]').innerHTML = T.sBytesF(s.picks);
      }
      function progress() { $('.lay').textContent = T.layers(layer); $('.byt').textContent = T.read(mbRead()); }
      function showWeights() {
        const w = M.routeWeights(picked.map(i => scores[i])), max = Math.max(...w);
        $('.r-w').innerHTML = picked.slice(0, 10).map((id, j) => `<div><span>#${String(id).padStart(3, '0')}</span><i style="width:${(w[j] / max * 100).toFixed(0)}%"></i><span>${w[j].toFixed(2)}</span></div>`).join('') +
          (picked.length > 10 ? `<div><span></span><span style="grid-column:2/4">${T.sWMore(picked.length - 10)}</span></div>` : '');
        return w;
      }
      async function step(fast) {
        if (layer >= M.LAYERS) { layer = 0; progress(); if (!fast) term.log(T.restart); }
        pipe.set(phase);
        if (phase === 0) { scores.fill(0); picked = []; paint(); if (!fast) term.log(T.l0(layer + 1)); }
        if (phase === 1) {
          for (let f = 0; f < (fast ? 1 : 7); f++) { for (let i = 0; i < M.EXPERTS; i++) scores[i] = Math.random(); paint(); await ctx.sleep(fast ? 0 : 70); }
          if (!fast) term.log(T.l1);
        }
        if (phase === 2) { picked = M.topK(scores, k); paint(); if (!fast) term.log(T.l2(k, picked.slice(0, 5).map(i => '#' + i).join(' ') + (k > 5 ? ' …' : ''), M.EXPERTS - k)); }
        if (phase === 3 && !fast) term.log(T.l3(k, (k * M.EXPERT_BYTES / 1e6).toFixed(1)));
        if (phase === 4) { const w = showWeights(); if (!fast) term.log(T.l4(Math.max(...w).toFixed(2))); }
        if (phase === 5) { layer++; progress(); if (!fast) term.log(T.l5(layer, mbRead())); }
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
        term.log(T.fast);
        layer = 0; phase = 0; progress();
        for (let l = 0; l < M.LAYERS; l++) { for (let p = 0; p < 6; p++) await step(true); await ctx.sleep(30); }
        term.log(T.done(k, Math.round(48 * k * M.EXPERT_BYTES / 1e6)));
      });
      resetBtn.onclick = () => guard(async () => {
        layer = 0; phase = 0; scores.fill(0); picked = []; paint(); pipe.set(-1); progress(); term.clear(); term.log(T.readyShort); emptyWeights();
      });
      range.oninput = () => { k = +range.value; stats(); progress(); };
      paint(); stats(); progress(); emptyWeights();
    },
  });

  Viz.register('transfer-race', {
    mount(el, ctx) {
      const MB = 664;
      const lanes = [672, 83, 63, 7].map((bw, i) => ({ bw, n: T.lanes[i][0], hw: T.lanes[i][1], alt: i === 3, ...M.transfer(MB, bw) }));
      const body = Viz.frame(el, { code: T.rCode, title: T.rTitle, tag: T.rTag, intro: T.rIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.rLgLane, glow: true },
        { color: 'var(--frame)', text: T.rLgFill },
      ]) + lanes.map((l, i) => `<div class="viz-lane${l.alt ? ' alt' : ''}"><div class="n">${l.n}<small>${l.bw} GB/s</small></div><div class="viz-track"><i data-i="${i}"></i></div><div class="t" data-t="${i}">— ms</div><div class="eq">${T.rEq(l.hw, MB, l.bw, l.ms.toFixed(1), l.maxTokensPerSecond)}</div></div>`).join('') +
        `<div class="viz-row">${Viz.button(T.rGo)}<span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${T.rSlow} · <span class="clk">t = 0.0 ms</span></span></div>
        <div class="viz-verdict" hidden>${T.rVerdict(lanes[2].ms.toFixed(1), lanes[2].maxTokensPerSecond, lanes[3].ms.toFixed(0), lanes[3].maxTokensPerSecond)}</div>`);
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
