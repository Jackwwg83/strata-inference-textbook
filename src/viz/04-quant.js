/* Chapter 04 widgets: how one number is stored in FP32 / FP16 / BF16, and quantizing a block of weights.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.quant;
  const show = v => (v === Infinity ? '∞' : v === -Infinity ? '−∞' : Number.isNaN(v) ? 'NaN' : Number(v.toPrecision(8)).toString());
  const pct = r => (r === Infinity ? '∞' : r === 0 ? '0' : (r * 100 < 0.001 ? (r * 100).toExponential(1) : (r * 100).toPrecision(2)) + '%');
  const hex4 = n => n.toString(16).toUpperCase().padStart(4, '0');

  const T = Viz.t({
    zh: {
      code: 'FLOAT_BITS', title: '一个数，三种存法', tag: '教学推演 · 舍入规则同 Strata',
      intro: '选一个数，看它在 FP32、FP16、BF16 里各占哪些位、存下来的是多少。按 <b>单步</b> 跟着走一遍：先写成科学计数法，再分配符号、指数、尾数。',
      lgSign: '符号位', lgExp: '指数位：管范围', lgMant: '尾数位：管精度',
      steps: ['写成 1.xxx × 2ᵉ', '符号位', '指数位', '尾数与舍入', '读回存下的值'],
      presets: [['0.1', 0.1], ['1/3', 1 / 3], ['3.14159', 3.14159], ['65504', 65504], ['70000', 70000], ['0.000001', 0.000001]],
      custom: '自己输入', bStep: '▶ 单步',
      rows: [['FP32', '1 + 8 + 23 位'], ['FP16', '1 + 5 + 10 位'], ['BF16', '1 + 8 + 7 位']],
      stored: '存下：', err: '误差',
      ready: '<span class="c">$</span> ready. 选一个数，再按 [ ▶ 单步 ]',
      pick: (x) => `<span class="y">// 换成 ${x}</span>`,
      s0: (x, m, e) => `<span class="c">科学计数法</span>：${x} = ${m} × 2^${e}。任何非零的数都能写成“1.xxx × 2 的几次方”`,
      s0z: '<span class="c">科学计数法</span>：0 是特例，三种格式都有专门的写法',
      s1: (neg) => `<span class="c">符号位</span>：${neg ? '负数，记 1' : '正数，记 0'}。三种格式都只用 1 位`,
      s2: (e, ok16) => `<span class="m">指数位</span>：要存 2 的 ${e} 次方。FP32 和 BF16 有 8 位指数，正常范围是 2⁻¹²⁶ 到 2¹²⁷；FP16 只有 5 位，是 2⁻¹⁴ 到 2¹⁵。${ok16 ? '' : '这个数已经超出 FP16 的正常范围'}`,
      s3: '<span class="w">尾数与舍入</span>：小数点后的部分，FP32 留 23 位，FP16 留 10 位，BF16 只留 7 位。多出来的位按“就近舍入，平局取偶”去掉',
      s4: (v16, r16, vb, rb) => `<span class="y">读回</span>：FP16 存下 ${v16}（相对误差 ${r16}），BF16 存下 ${vb}（相对误差 ${rb}）`,
      k16: 'FP16 存下的值', f16: (r) => `相对误差 <b>${r}</b><br>尾数 10 位：正常范围内最多约 2⁻¹¹ ≈ 0.05%`,
      kb: 'BF16 存下的值', fb: (r) => `相对误差 <b>${r}</b><br>尾数 7 位：最多约 2⁻⁸ ≈ 0.4%`,
      kTop: 'FP32 的前 16 位 → BF16', fTop: '<b>BF16 = FP32 砍掉后 16 位</b><br>再看被砍掉的部分，就近取偶舍入',
      try: [
        '选 <b>65504</b>，再选 <b>70000</b>：FP16 存不下 70000，变成 ∞；BF16 照样存得下，只是存成了 70144。指数位管范围。',
        '选 <b>1/3</b>：三种格式都存不准。BF16 的误差约是 FP16 的 8 倍，因为它的尾数少 3 位。尾数位管精度。',
        '选 <b>0.000001</b>：它小于 FP16 的正常下限，只能用“非规格化”的方式存，有效位变少，误差超过 1%；BF16 的指数和 FP32 一样宽，误差仍在 0.4% 以内。',
      ],

      qCode: 'QUANT_BLOCK', qTitle: '把一块权重压成几个比特', qTag: '教学推演 · 对称均匀量化，不是 Q2_0',
      qIntro: '16 个权重分成一组或几组，每组共用一个缩放系数 s。拖动 <b>位数</b> 和 <b>组大小</b>，再勾上“离群值”，看误差怎样变。按 <b>单步</b> 逐步看第 1 组怎么量化。',
      lgOrig: '原来的权重', lgDeq: '量化后还原的值', lgGroup: '组的分界',
      qSteps: ['找最大绝对值', '算缩放 s', '除以 s 取整', '乘回 s', '算误差'],
      bits: '位数 b', group: '每组几个', outlier: '加入一个离群值（−2.8）',
      qReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 量化第 1 组',
      q0: (a, out) => `<span class="c">找最大值</span>：第 1 组里绝对值最大的是 ${a}${out ? '，正是那个离群值' : ''}`,
      q1: (b, Q, s, a) => `<span class="c">缩放 s</span>：${b} 位对称量化有 −${Q} 到 ${Q} 共 ${2 * Q + 1} 档，s = ${a} ÷ ${Q} = ${s}`,
      q2: (z) => `<span class="m">取整</span>：每个数除以 s，四舍五入成整数编码（柱子下面的数）。整块里有 ${z} 个本来不是 0 的数被取成了 0`,
      q3: '<span class="w">还原</span>：编码 × s 得到近似值，就是图中主色的柱子',
      q4: (mse, mx, half) => `<span class="y">误差</span>：整块的均方误差 MSE = ${mse}；第 1 组的最大误差 ${mx}，不超过 s ÷ 2 = ${half}`,
      ksK: '第 1 组的缩放 s', ksF: '<b>= max|x| ÷ (2^(b−1) − 1)</b><br>档数越少，s 越大，刻度越粗',
      kMse: '均方误差 MSE', fMse: '<b>= 平均（原数 − 还原值）²</b><br>主动接受的误差，要量出来',
      kBpw: '每个权重实际占几位', fBpw: (b, g) => `<b>= ${b} + 16 ÷ ${g}</b><br>每组另存一个 16 位的 s`,
      qTry: [
        '把位数从 8 拉到 2：主色柱子从几乎贴着原值，变成只剩三档（−s、0、+s）。MSE 涨了上万倍。',
        '勾上 <b>离群值</b>：一个 −2.8 把 s 撑大好几倍，同组的小权重大多被取成 0。',
        '离群值还在，把组大小改成 <b>4</b>：只有离群值所在那一组变粗，其余三组恢复。代价看右下角：每个权重多占了几位存缩放。',
      ],
      qVerdict: (ratio, z0, z1, k, extra) => `① 离群值把它所在那组的 s 放大到 ${ratio} 倍，被取成 0 的权重从 ${z0} 个变成 ${z1} 个，MSE 涨到 ${k} 倍。<br>② 组分得越小，离群值只拖累自己那一组；代价是每个权重多花 ${extra} 位存缩放系数。<br>③ 名义位数（几 bit）不等于真实成本，也不等于误差：两样都要算出来。`,
    },
  });

  Viz.register('float-bits', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a3)', text: T.lgSign },
        { color: 'var(--a2)', text: T.lgExp },
        { color: 'var(--accent)', text: T.lgMant, glow: true },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      const widths = [32, 16, 16], fields = [[1, 8], [1, 5], [1, 8]];
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div class="viz-row" style="margin-top:0">${T.presets.map(([l], k) => `<button type="button" class="viz-btn ghost" data-pre="${k}" style="padding:5px 8px;font-size:12px">${l}</button>`).join('')}</div>
        <div class="viz-slider" style="grid-template-columns:auto minmax(0,1fr)"><label>${T.custom}</label><input class="fb-in" type="number" step="any" value="0.1" aria-label="${Viz.esc(T.custom)}" style="min-width:0;width:100%;font-family:var(--mono);font-size:14px;padding:4px 6px;background:transparent;color:var(--ink);border:1px solid var(--frame)"></div>
        ${T.rows.map(([n, d], r) => `<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--ink)"><b>${n}</b><span style="font-family:var(--mono);font-size:11px;color:var(--muted)">${d}</span></div>
          <div data-row="${r}" style="display:grid;grid-template-columns:repeat(${widths[r]},minmax(0,1fr));gap:1px;margin:4px 0"></div>
          <div style="font-family:var(--mono);font-size:12px;color:var(--muted)">${T.stored}<span data-val="${r}" style="color:var(--ink)"></span> · ${T.err} <span data-err="${r}"></span></div></div>`).join('')}
        <div class="viz-row">${Viz.button(T.bStep, 'fb-step')}</div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'fb-16', k: T.k16, v: '', f: '' }) +
        Viz.stat({ id: 'fb-b', k: T.kb, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'fb-top', k: T.kTop, v: '', f: T.fTop });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const input = $('.fb-in');
      let phase = -1;
      const cur = () => { const v = parseFloat(input.value); return Number.isFinite(v) ? v : 0; };
      function paint() {
        const x = cur(), r = M.storeAll(x), list = [r.fp32, r.fp16, r.bf16];
        list.forEach((f, k) => {
          const s = M.bitString(f.bits, widths[k]), [ns, ne] = fields[k];
          el.querySelector(`[data-row="${k}"]`).innerHTML = [...s].map((bit, i) => {
            const c = i < ns ? 'var(--a3)' : i < ns + ne ? 'var(--a2)' : 'var(--accent)';
            return `<span style="display:flex;align-items:center;justify-content:center;height:18px;font-family:var(--mono);font-size:10px;color:${bit === '1' ? 'var(--paper)' : 'var(--ink)'};background:${bit === '1' ? c : 'transparent'};border:1px solid ${c};min-width:0;overflow:hidden">${bit}</span>`;
          }).join('');
          el.querySelector(`[data-val="${k}"]`).textContent = show(f.value);
          el.querySelector(`[data-err="${k}"]`).textContent = pct(f.rel);
        });
        $('[data-s=fb-16-v]').textContent = show(r.fp16.value);
        $('[data-s=fb-16-f]').innerHTML = T.f16(pct(r.fp16.rel));
        $('[data-s=fb-b-v]').textContent = show(r.bf16.value);
        $('[data-s=fb-b-f]').innerHTML = T.fb(pct(r.bf16.rel));
        $('[data-s=fb-top-v]').textContent = `${hex4(r.fp32.bits >>> 16)} → ${hex4(r.bf16.bits)}`;
      }
      function step() {
        phase = (phase + 1) % 5;
        pipe.set(phase);
        const x = M.f32Bits(cur()).value, r = M.storeAll(x), a = Math.abs(x);
        let e = a ? Math.floor(Math.log2(a)) : 0;
        if (a && 2 ** e > a) e--;
        if (phase === 0) term.log(a ? T.s0(show(x), (a / 2 ** e).toFixed(6), e) : T.s0z);
        if (phase === 1) term.log(T.s1(x < 0));
        if (phase === 2) term.log(T.s2(e, !a || (e >= -14 && e <= 15)));
        if (phase === 3) term.log(T.s3);
        if (phase === 4) term.log(T.s4(show(r.fp16.value), pct(r.fp16.rel), show(r.bf16.value), pct(r.bf16.rel)));
      }
      el.querySelectorAll('[data-pre]').forEach(b => { b.onclick = () => {
        const [l, v] = T.presets[+b.dataset.pre];
        input.value = String(v); phase = -1; pipe.set(-1); term.log(T.pick(l)); paint();
        el.querySelectorAll('[data-pre]').forEach(o => o.classList.toggle('ghost', o !== b));
      }; });
      input.oninput = () => { phase = -1; pipe.set(-1); paint(); };
      $('.fb-step').onclick = step;
      paint();
    },
  });

  const GROUPS = [16, 8, 4];

  Viz.register('quant-block', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.qCode, title: T.qTitle, tag: T.qTag, intro: T.qIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgOrig },
        { color: 'var(--accent)', text: T.lgDeq, glow: true },
        { color: 'var(--a2)', text: T.lgGroup },
      ]));
      const pipe = Viz.pipe(body, T.qSteps);
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div class="qb-cols" style="display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:0;border-top:1px solid var(--frame);border-bottom:1px solid var(--frame)"></div>
        <div class="viz-slider"><label>${T.bits}</label><input class="qb-b" type="range" min="2" max="8" step="1" value="4" aria-label="${Viz.esc(T.bits)}"><output class="qb-bo"></output></div>
        <div class="viz-slider"><label>${T.group}</label><input class="qb-g" type="range" min="0" max="2" step="1" value="0" aria-label="${Viz.esc(T.group)}"><output class="qb-go"></output></div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:14px"><input class="qb-o" type="checkbox" style="accent-color:var(--accent)">${T.outlier}</label>
        <div class="viz-row">${Viz.button(T.bStep, 'qb-step')}</div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.qReady);
      right.innerHTML =
        Viz.stat({ id: 'qb-s', k: T.ksK, v: '', f: T.ksF }) +
        Viz.stat({ id: 'qb-mse', k: T.kMse, v: '', f: T.fMse, hot: true }) +
        Viz.stat({ id: 'qb-bpw', k: T.kBpw, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.qTry) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const bIn = $('.qb-b'), gIn = $('.qb-g'), oIn = $('.qb-o');
      let phase = -1;
      const state = () => {
        const b = +bIn.value, g = GROUPS[+gIn.value], out = oIn.checked, x = out ? M.withOutlier(M.BLOCK) : M.BLOCK.slice();
        return { b, g, out, x, r: M.quantizeGroups(x, b, g) };
      };
      function paint() {
        const { b, g, out, x, r } = state(), H = 120, top = Math.max(...x.map(Math.abs));
        $('.qb-bo').textContent = b; $('.qb-go').textContent = g;
        $('.qb-cols').innerHTML = x.map((v, i) => {
          const y = r.xhat[i], h0 = Math.abs(v) / top * (H / 2), h1 = Math.abs(y) / top * (H / 2);
          const bar = (h, val, left, color) => `<i style="position:absolute;${left};width:34%;${val >= 0 ? `bottom:${H / 2}px` : `top:${H / 2}px`};height:${h.toFixed(1)}px;background:${color}"></i>`;
          return `<div style="position:relative;height:${H + 16}px;border-left:1px solid ${i % g === 0 && i ? 'var(--a2)' : 'transparent'};min-width:0">
            <i style="position:absolute;left:0;right:0;top:${H / 2}px;height:1px;background:var(--frame)"></i>
            ${bar(h0, v, 'left:12%', 'var(--frame)')}${bar(h1, y, 'left:52%', 'var(--accent)')}
            <span style="position:absolute;left:0;right:0;bottom:0;text-align:center;font-family:var(--mono);font-size:10px;color:${r.q[i] === 0 && v !== 0 ? 'var(--a2)' : 'var(--muted)'}">${r.q[i]}</span></div>`;
        }).join('');
        const g0 = r.parts[0];
        $('[data-s=qb-s-v]').textContent = g0.s.toPrecision(3);
        $('[data-s=qb-mse-v]').textContent = r.mse.toExponential(2);
        $('[data-s=qb-bpw-v]').textContent = M.bitsPerWeight(b, g, 16);
        $('[data-s=qb-bpw-f]').innerHTML = T.fBpw(b, g);
        const v = $('.viz-verdict');
        if (out) {
          const clean = M.quantizeGroups(M.BLOCK, b, g), gi = Math.floor(M.OUTLIER_INDEX / g);
          v.innerHTML = T.qVerdict((r.parts[gi].s / clean.parts[gi].s).toFixed(1), clean.zeroed, r.zeroed, Math.round(r.mse / clean.mse), M.bitsPerWeight(b, g, 16) - b);
          v.hidden = false;
        } else v.hidden = true;
      }
      function step() {
        phase = (phase + 1) % 5;
        pipe.set(phase);
        const { b, out, r } = state(), g0 = r.parts[0];
        const outIn0 = out && M.OUTLIER_INDEX < g0.q.length;
        if (phase === 0) term.log(T.q0(g0.a.toFixed(2), outIn0));
        if (phase === 1) term.log(T.q1(b, g0.Q, g0.s.toPrecision(3), g0.a.toFixed(2)));
        if (phase === 2) term.log(T.q2(r.zeroed));
        if (phase === 3) term.log(T.q3);
        if (phase === 4) term.log(T.q4(r.mse.toExponential(2), g0.maxErr.toPrecision(3), (g0.s / 2).toPrecision(3)));
      }
      $('.qb-step').onclick = step;
      bIn.oninput = gIn.oninput = oIn.onchange = () => { phase = -1; pipe.set(-1); paint(); };
      paint();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
