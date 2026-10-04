/* Chapter 02 widgets: softmax with temperature (and FP32 overflow), and inverse-CDF dice with a seed.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.sampling;

  const T = Viz.t({
    zh: {
      code: 'SOFTMAX_LAB', title: '分数怎样变成概率', tag: '教学推演 · 分数为假设',
      intro: '模型要补全“我家养了一只＿＿”，给 5 个候选词各打了一个分（logit）。拖动 <b>温度</b>，看概率变尖或变平；把分数 <b>放大</b>、再取消“减去最大值”，看 FP32 怎样溢出。按 <b>单步</b> 逐步看计算。',
      lgTop: '概率最高的候选', lgOther: '其他候选', lgBad: '溢出：∞ 或 NaN',
      cands: [['猫', 3.0], ['狗', 2.0], ['鸟', 1.0], ['鱼', 0.5], ['车', -1.0]],
      steps: ['原始分数', '除以温度', '减去最大值', '取指数', '除以总和'],
      cols: ['词', '分数', '÷T', '−m', 'eˣ', '概率'],
      tLabel: '温度 T', sLabel: '分数放大', stable: '先减去最大值（推荐）',
      bStep: '▶ 单步', bReset: '重置',
      greedy: '贪心',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 跟着流程条算一遍',
      s0: (top, low) => `<span class="c">分数</span>：模型给 5 个候选各打一分。最高的“猫”= ${top}，最低的“车”= ${low}。分数可正可负，还不是概率`,
      s1: (t) => `<span class="c">÷ 温度</span>：每个分数除以 T = ${t}。T 小于 1，差距被放大；T 大于 1，差距被缩小`,
      s1g: '<span class="c">温度 = 0</span>：不做除法，直接走贪心分支，选分数最高的“猫”。概率表只剩一个 1',
      s2: (m) => `<span class="m">减去最大值</span>：每个数都减去 m = ${m}，最大的变成 0，其余是负数。这一步不改变最后的概率`,
      s2off: '<span class="m">跳过</span>：没有减去最大值，直接拿原数去取指数',
      s3: (x) => `<span class="w">取指数</span>：eˣ 把每个数变成正数。最大的一项是 ${x}`,
      s3bad: (x) => `<span class="w">取指数</span>：e 的 ${x} 次方超过了 FP32 的上限（约 3.4 × 10³⁸），存成了 ∞`,
      s4: (sum, p) => `<span class="y">归一化</span>：每项除以总和 ${sum}，得到概率。“猫”占 ${p}`,
      s4bad: '<span class="y">归一化</span>：∞ ÷ ∞ = NaN，所有概率都坏了。这就是不减最大值的下场',
      sTopK: '“猫”的概率', sTopF: '<b>= e^(z₁/T − m) ÷ Σ e^(zᵢ/T − m)</b><br>m 是所有 zᵢ/T 里最大的那个',
      sTopG: '<b>温度 = 0：贪心</b><br>不算概率，直接选最高分',
      sExpK: '最大的指数项（按 FP32 存）', sExpF: 'FP32 最大约 3.4 × 10³⁸<br>e 的指数超过 88.7 就溢出成 ∞',
      sSumK: '概率加起来', sSumF: '<b>= Σ pᵢ</b>，应当等于 1<br>溢出后变成 ∞ ÷ ∞ = NaN',
      try: [
        '把温度拉到 <b>0.2</b>，再拉到 <b>2.0</b>：“猫”的概率从接近 100% 降到 40% 出头。温度只改分布的形状，不改排名。',
        '把放大倍数调到 <b>×50</b>，取消勾选“减去最大值”：指数项溢出成 ∞，概率全变 NaN。再勾上，概率立刻恢复正常。减最大值只防溢出，不改答案。',
        '把温度拉到 <b>0</b>：不再算概率，直接选最高分。Strata 的采样参数也这样约定：温度 ≤ 0 就是贪心。',
      ],

      dCode: 'DICE', dTitle: '按概率掷骰子', dTag: '教学推演 · 随机数为教学用哈希，不是 Philox',
      dIntro: '温度 T = 1 时，5 个候选的概率把 [0, 1) 这条线切成 5 段，段长就是概率。每掷一次，由（种子, 计数器）算出一个均匀随机数 u，看它落在哪一段，就选哪个词。',
      dLgPick: '这次选中的词', dLgSeg: '每段长度 = 概率', dLgU: '本次的 u',
      dSteps: ['种子 + 计数器', '算出 u', '查累计概率', '找落点', '选出词'],
      bOne: '▶ 掷一次', bHundred: '▶▶ 连掷 100 次', bRewind: '重置计数器',
      seed: '种子 seed',
      dReady: '<span class="c">$</span> ready. 按 [ ▶ 掷一次 ]',
      draw: (n, c, u, lo, hi, tok) => `<span class="c">#${n}</span> 计数器 ${c} → u = ${u}，落在 [${lo}, ${hi}) → 选“${tok}”`,
      batch: (n, top) => `<span class="y">// 连掷 100 次：共 ${n} 次，“猫”出现 ${top}</span>`,
      rewind: (s) => `<span class="y">// 计数器归零，种子仍是 ${s}。再掷一遍，序列会一模一样</span>`,
      reseed: (s) => `<span class="y">// 换成种子 ${s}，计数器归零。随机数序列整个换了</span>`,
      uK: '本次的 u 与结果', uF: (s, c) => `<b>u = 哈希(种子 ${s}, 计数器 ${c})</b><br>同样的两个数，永远算出同样的 u`,
      nK: '已经掷了几次', nF: '<b>每掷一次，计数器加 1</b><br>“重置”只把计数器拨回 0',
      fK: '“猫”出现的频率', fF: (p) => `<b>= “猫”的次数 ÷ 总次数</b><br>理论概率 ${p}`,
      dTry: [
        '掷 5 次，记下选中的词。按 <b>重置计数器</b> 再掷 5 次：序列一模一样。换一个种子再试：序列变了。',
        '按几次 <b>连掷 100 次</b>：“猫”的频率在 62% 附近晃动，掷得越多晃得越小。',
        '留意“车”：它只占约 1%，不是不可能，只是很少出现。采样偶尔挑中低概率的词，回答才会有变化。',
      ],
      dVerdict: '① 掷得越多，每个词出现的频率越接近它的概率。<br>② 种子和计数器不变，u 就不变：这里的“随机”是算出来的，可以重现。<br>③ Strata 用的 Philox 也是计数器式的：u 只由（种子, 位置）决定，和之前抽过几次无关。',
    },
    en: {
      code: 'SOFTMAX_LAB', title: 'How scores become probabilities', tag: 'Teaching estimate · assumed scores',
      intro: 'To complete "We have a pet ___", the model gave each of 5 candidate words a score (a logit). Drag <b>Temperature</b> to see the probabilities get sharper or flatter; turn up <b>Score scale</b> and untick "subtract the max" to watch FP32 overflow. Press <b>Step</b> to walk through the computation.',
      lgTop: 'Most probable candidate', lgOther: 'Other candidates', lgBad: 'Overflow: ∞ or NaN',
      cands: [['cat', 3.0], ['dog', 2.0], ['hen', 1.0], ['koi', 0.5], ['car', -1.0]],
      steps: ['Raw scores', 'Divide by T', 'Subtract max', 'Exponentiate', 'Divide by sum'],
      cols: ['tok', 'score', '÷T', '−m', 'eˣ', 'prob'],
      tLabel: 'Temperature T', sLabel: 'Score scale', stable: 'Subtract the max first (recommended)',
      bStep: '▶ Step', bReset: 'Reset',
      greedy: 'greedy',
      ready: '<span class="c">$</span> ready. Press [ ▶ Step ] to compute along the strip',
      s0: (top, low) => `<span class="c">Scores</span>: the model gives each of the 5 candidates a score. The highest, "cat", is ${top}; the lowest, "car", is ${low}. Scores can be positive or negative, and they are not probabilities yet`,
      s1: (t) => `<span class="c">÷ temperature</span>: divide every score by T = ${t}. T below 1 widens the gaps; T above 1 narrows them`,
      s1g: '<span class="c">Temperature = 0</span>: no division; take the greedy branch and pick the top-scoring "cat". The probability table holds a single 1',
      s2: (m) => `<span class="m">Subtract the max</span>: subtract m = ${m} from every number; the largest becomes 0 and the rest go negative. This step does not change the final probabilities`,
      s2off: '<span class="m">Skipped</span>: the max is not subtracted; the raw numbers go straight into the exponential',
      s3: (x) => `<span class="w">Exponentiate</span>: eˣ makes every number positive. The largest term is ${x}`,
      s3bad: (x) => `<span class="w">Exponentiate</span>: e to the power ${x} is above FP32's limit (about 3.4 × 10³⁸), so it is stored as ∞`,
      s4: (sum, p) => `<span class="y">Normalize</span>: divide each term by the sum ${sum} to get probabilities. "cat" gets ${p}`,
      s4bad: '<span class="y">Normalize</span>: ∞ ÷ ∞ = NaN, and every probability is ruined. That is what happens if you skip subtracting the max',
      sTopK: 'Probability of "cat"', sTopF: '<b>= e^(z₁/T − m) ÷ Σ e^(zᵢ/T − m)</b><br>m is the largest of all zᵢ/T',
      sTopG: '<b>Temperature = 0: greedy</b><br>no probabilities computed; just pick the top score',
      sExpK: 'Largest exponential term (stored as FP32)', sExpF: 'FP32 tops out at about 3.4 × 10³⁸<br>an exponent above 88.7 overflows to ∞',
      sSumK: 'Probabilities added up', sSumF: '<b>= Σ pᵢ</b>, should equal 1<br>after overflow it becomes ∞ ÷ ∞ = NaN',
      try: [
        'Drag the temperature to <b>0.2</b>, then to <b>2.0</b>: the probability of "cat" falls from nearly 100% to just over 40%. Temperature changes only the shape of the distribution, never the ranking.',
        'Set the scale to <b>×50</b> and untick "subtract the max": the exponentials overflow to ∞ and every probability becomes NaN. Tick it again and the probabilities are back to normal at once. Subtracting the max only prevents overflow; it does not change the answer.',
        'Drag the temperature to <b>0</b>: no probabilities are computed any more; the top score is picked directly. Strata\'s sampling parameters follow the same rule: temperature ≤ 0 means greedy.',
      ],

      dCode: 'DICE', dTitle: 'Rolling dice by probability', dTag: 'Teaching estimate · random numbers from a teaching hash, not Philox',
      dIntro: 'At temperature T = 1, the 5 candidates\' probabilities cut the line [0, 1) into 5 segments, each as long as its probability. Every roll computes a uniform random number u from (seed, counter); whichever segment u lands in, that word is picked.',
      dLgPick: 'The word picked this time', dLgSeg: 'Segment length = probability', dLgU: 'This roll\'s u',
      dSteps: ['Seed + counter', 'Compute u', 'Cumulative probs', 'Find where u lands', 'Pick the word'],
      bOne: '▶ Roll once', bHundred: '▶▶ Roll 100 times', bRewind: 'Reset counter',
      seed: 'Seed',
      dReady: '<span class="c">$</span> ready. Press [ ▶ Roll once ]',
      draw: (n, c, u, lo, hi, tok) => `<span class="c">#${n}</span> counter ${c} → u = ${u}, lands in [${lo}, ${hi}) → picks "${tok}"`,
      batch: (n, top) => `<span class="y">// rolled 100 times: ${n} rolls in total, "cat" came up ${top} times</span>`,
      rewind: (s) => `<span class="y">// counter back to zero, seed still ${s}. Roll again and the sequence will be exactly the same</span>`,
      reseed: (s) => `<span class="y">// switched to seed ${s}, counter back to zero. The whole random sequence has changed</span>`,
      uK: 'This roll\'s u and result', uF: (s, c) => `<b>u = hash(seed ${s}, counter ${c})</b><br>the same two numbers always give the same u`,
      nK: 'Rolls so far', nF: '<b>each roll adds 1 to the counter</b><br>"Reset" only turns the counter back to 0',
      fK: 'How often "cat" came up', fF: (p) => `<b>= "cat" count ÷ total rolls</b><br>theoretical probability ${p}`,
      dTry: [
        'Roll 5 times and note the words picked. Press <b>Reset counter</b> and roll 5 more: the sequence is exactly the same. Try another seed: the sequence changes.',
        'Press <b>Roll 100 times</b> a few times: the frequency of "cat" wobbles around 62%, and the more you roll, the smaller the wobble.',
        'Keep an eye on "car": it has only about 1%, so it is not impossible, just rare. Sampling now and then picks a low-probability word; that is what gives answers their variety.',
      ],
      dVerdict: '① The more you roll, the closer each word\'s frequency gets to its probability.<br>② If the seed and the counter stay the same, u stays the same: the "randomness" here is computed, so it can be reproduced.<br>③ The Philox generator Strata uses is counter-based too: u depends only on (seed, position), not on how many draws came before.',
    },
  });

  const fmtNum = x => {
    if (Number.isNaN(x)) return 'NaN';
    if (x === Infinity) return '∞';
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return x.toExponential(1).replace('e+', 'e');
    return (Math.round(x * 1000) / 1000).toString();
  };
  const SCALES = [1, 10, 50];

  Viz.register('softmax-temperature', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgTop, glow: true },
        { color: 'var(--frame)', text: T.lgOther },
        { color: 'var(--a2)', text: T.lgBad },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      const grid = 'display:grid;grid-template-columns:28px repeat(4,minmax(0,1fr)) minmax(0,1.6fr);gap:6px;align-items:center;font-family:var(--mono);font-size:12px;padding:5px 0;border-bottom:1px dashed var(--frame)';
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div style="${grid};color:var(--muted)">${T.cols.map((c, i) => `<span data-col="${i}">${c}</span>`).join('')}</div>
        ${T.cands.map((_, r) => `<div class="sx-row" style="${grid};color:var(--ink)"><span style="font-family:inherit;font-size:14px">${T.cands[r][0]}</span>${[1, 2, 3, 4].map(c => `<span data-col="${c}" data-r="${r}"></span>`).join('')}<span data-col="5" style="display:grid;grid-template-columns:minmax(0,1fr) 46px;gap:6px;align-items:center"><i data-bar="${r}" style="display:block;height:10px;background:var(--frame)"></i><b data-p="${r}" style="font-weight:600;text-align:right"></b></span></div>`).join('')}
        <div class="viz-slider"><label>${T.tLabel}</label><input class="sx-t" type="range" min="0" max="2" step="0.1" value="1" aria-label="${Viz.esc(T.tLabel)}"><output class="sx-to"></output></div>
        <div class="viz-slider"><label>${T.sLabel}</label><input class="sx-s" type="range" min="0" max="2" step="1" value="0" aria-label="${Viz.esc(T.sLabel)}"><output class="sx-so"></output></div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:14px"><input class="sx-st" type="checkbox" checked style="accent-color:var(--accent)">${T.stable}</label>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bReset, 'ghost')}</div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'sx-top', k: T.sTopK, v: '', f: T.sTopF, hot: true }) +
        Viz.stat({ id: 'sx-exp', k: T.sExpK, v: '', f: T.sExpF }) +
        Viz.stat({ id: 'sx-sum', k: T.sSumK, v: '', f: T.sSumF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const tIn = $('.sx-t'), sIn = $('.sx-s'), stIn = $('.sx-st');
      const [stepBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      let phase = -1;
      const state = () => {
        const t = +tIn.value, scale = SCALES[+sIn.value], stable = stIn.checked;
        const z = T.cands.map(c => c[1] * scale);
        return { t, scale, stable, z, r: M.softmax(z, t, { stable, f32: true }) };
      };
      function cell(r, c, v) { const x = el.querySelector(`[data-col="${c}"][data-r="${r}"]`); x.textContent = v; x.style.color = (v === '∞' || v === 'NaN') ? 'var(--a2)' : 'var(--ink)'; }
      function render() {
        const { t, scale, stable, z, r } = state();
        $('.sx-to').textContent = t === 0 ? T.greedy : t.toFixed(1);
        $('.sx-so').textContent = '×' + scale;
        const top = M.argmax(r.probs.map(p => (Number.isNaN(p) ? -1 : p)));
        z.forEach((zi, i) => {
          cell(i, 1, fmtNum(zi));
          cell(i, 2, r.greedy ? '—' : fmtNum(r.scaled[i]));
          cell(i, 3, r.greedy ? '—' : stable ? fmtNum(r.scaled[i] - r.shift) : '—');
          cell(i, 4, r.greedy ? '—' : fmtNum(r.exps[i]));
          const p = r.probs[i], bad = Number.isNaN(p);
          const bar = el.querySelector(`[data-bar="${i}"]`);
          bar.style.width = bad ? '100%' : (p * 100).toFixed(1) + '%';
          bar.style.background = bad ? 'var(--a2)' : i === top ? 'var(--accent)' : 'var(--frame)';
          bar.style.opacity = bad ? 0.35 : 1;
          el.querySelector(`[data-p="${i}"]`).textContent = bad ? 'NaN' : (p * 100).toFixed(1) + '%';
        });
        el.querySelectorAll('[data-col]').forEach(x => { const c = +x.dataset.col; x.style.outline = phase >= 0 && c === phase + 1 ? '1px solid var(--accent)' : ''; });
        const p0 = r.probs[0];
        $('[data-s=sx-top-v]').textContent = Number.isNaN(p0) ? 'NaN' : (p0 * 100).toFixed(1) + '%';
        $('[data-s=sx-top-f]').innerHTML = r.greedy ? T.sTopG : T.sTopF;
        const big = r.greedy ? null : Math.max(...r.exps);
        $('[data-s=sx-exp-v]').textContent = big === null ? '—' : fmtNum(big);
        const sum = r.probs.reduce((a, b) => a + b, 0);
        $('[data-s=sx-sum-v]').textContent = Number.isNaN(sum) ? 'NaN' : sum.toFixed(4);
      }
      function step() {
        phase = (phase + 1) % 5;
        pipe.set(phase);
        const { t, stable, z, r } = state();
        if (phase === 0) term.log(T.s0(fmtNum(z[0]), fmtNum(z[4])));
        if (phase === 1) term.log(r.greedy ? T.s1g : T.s1(t.toFixed(1)));
        if (phase === 2 && !r.greedy) term.log(stable ? T.s2(fmtNum(r.shift)) : T.s2off);
        if (phase === 3 && !r.greedy) term.log(r.overflow ? T.s3bad(fmtNum(Math.max(...r.scaled))) : T.s3(fmtNum(Math.max(...r.exps))));
        if (phase === 4 && !r.greedy) term.log(r.overflow ? T.s4bad : T.s4(fmtNum(r.sum), (r.probs[0] * 100).toFixed(1) + '%'));
        if (r.greedy && phase >= 1) phase = 4;
        render();
      }
      stepBtn.onclick = step;
      resetBtn.onclick = () => { phase = -1; pipe.set(-1); tIn.value = 1; sIn.value = 0; stIn.checked = true; term.clear(); term.log(T.ready); render(); };
      tIn.oninput = sIn.oninput = stIn.onchange = render;
      render();
    },
  });

  Viz.register('sampling-dice', {
    mount(el, ctx) {
      const probs = M.softmax(T.cands.map(c => c[1]), 1).probs, cum = M.cumulative(probs);
      const body = Viz.frame(el, { code: T.dCode, title: T.dTitle, tag: T.dTag, intro: T.dIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.dLgPick, glow: true },
        { color: 'var(--frame)', text: T.dLgSeg },
        { color: 'var(--a2)', text: T.dLgU },
      ]));
      const pipe = Viz.pipe(body, T.dSteps);
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div style="position:relative;height:34px;display:flex;border:1px solid var(--frame)">${probs.map((p, i) => `<div data-seg="${i}" style="flex:0 0 ${(p * 100).toFixed(3)}%;border-right:1px solid var(--frame);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--ink);overflow:hidden;background:transparent">${p > 0.03 ? T.cands[i][0] : ''}</div>`).join('')}
          <i class="dc-u" style="position:absolute;top:-6px;bottom:-6px;width:2px;left:0;background:var(--a2);display:none"></i></div>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--muted);margin:4px 0 12px"><span>0</span><span class="dc-ut"></span><span>1</span></div>
        <div class="viz-bars">${probs.map((p, i) => `<div><span>${T.cands[i][0]}</span><i data-h="${i}" style="width:0"></i><span data-hp="${i}">0%</span></div>`).join('')}</div>
        <div class="viz-slider"><label>${T.seed}</label><input class="dc-seed" type="range" min="1" max="20" value="7" aria-label="${Viz.esc(T.seed)}"><output class="dc-so">7</output></div>
        <div class="viz-row">${Viz.button(T.bOne)}${Viz.button(T.bHundred, 'alt')}${Viz.button(T.bRewind, 'ghost')}</div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.dReady);
      right.innerHTML =
        Viz.stat({ id: 'dc-u', k: T.uK, v: '—', f: T.uF(7, 0), hot: true }) +
        Viz.stat({ id: 'dc-n', k: T.nK, v: '0', f: T.nF }) +
        Viz.stat({ id: 'dc-f', k: T.fK, v: '—', f: T.fF((probs[0] * 100).toFixed(1) + '%') });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.dTry) + `<div class="viz-verdict" hidden>${T.dVerdict}</div>`);
      const $ = s => el.querySelector(s);
      const seedIn = $('.dc-seed'), [oneBtn, hundredBtn, rewindBtn] = el.querySelectorAll('.viz-btn');
      let counter = 0, busy = false;
      const hist = probs.map(() => 0);
      const total = () => hist.reduce((a, b) => a + b, 0);
      function showHist() {
        const n = total();
        hist.forEach((h, i) => {
          el.querySelector(`[data-h="${i}"]`).style.width = n ? (h / n * 100).toFixed(1) + '%' : '0';
          el.querySelector(`[data-hp="${i}"]`).textContent = n ? (h / n * 100).toFixed(0) + '%' : '0%';
        });
        $('[data-s=dc-n-v]').textContent = n;
        $('[data-s=dc-f-v]').textContent = n ? (hist[0] / n * 100).toFixed(1) + '%' : '—';
        if (n >= 100) $('.viz-verdict').hidden = false;
      }
      function mark(u, k) {
        const m = $('.dc-u'); m.style.display = 'block'; m.style.left = `calc(${(u * 100).toFixed(2)}% - 1px)`;
        $('.dc-ut').textContent = 'u = ' + u.toFixed(4);
        el.querySelectorAll('[data-seg]').forEach((s, i) => { s.style.background = i === k ? 'var(--accent)' : 'transparent'; s.style.color = i === k ? 'var(--paper)' : 'var(--ink)'; });
      }
      function drawOnce(log) {
        const s = +seedIn.value, c = counter++, u = M.uniform(s, c), k = M.pick(probs, u);
        hist[k]++;
        mark(u, k);
        $('[data-s=dc-u-v]').textContent = `u = ${u.toFixed(4)} → ${T.cands[k][0]}`;
        $('[data-s=dc-u-f]').innerHTML = T.uF(s, c);
        if (log) term.log(T.draw(total(), c, u.toFixed(4), (k ? cum[k - 1] : 0).toFixed(4), cum[k].toFixed(4), T.cands[k][0]));
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      oneBtn.onclick = () => guard(async () => {
        for (let p = 0; p < 5; p++) { pipe.set(p); if (p === 4) drawOnce(true); await ctx.sleep(110); }
        showHist();
      });
      hundredBtn.onclick = () => guard(async () => {
        pipe.set(4);
        for (let i = 0; i < 100; i++) { drawOnce(false); if (i % 10 === 9) { showHist(); await ctx.sleep(40); } }
        term.log(T.batch(total(), hist[0]));
        showHist();
      });
      const restart = (msg) => { counter = 0; hist.fill(0); pipe.set(-1); showHist(); $('.viz-verdict').hidden = true; term.log(msg); };
      rewindBtn.onclick = () => guard(async () => restart(T.rewind(seedIn.value)));
      seedIn.oninput = () => { $('.dc-so').textContent = seedIn.value; if (!busy) restart(T.reseed(seedIn.value)); };
      showHist();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
