/* Chapter 05 widgets: a roofline you can climb by batching or by shrinking bytes, and Amdahl's law as two bars.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.roofline;
  const P = 50e12, B = 672e9;               // P is a teaching assumption; B is the RTX 5070 VRAM spec used in ch01/ch10
  const BATCH = [1, 2, 4, 8, 16, 32, 64, 128, 256];
  const SPEEDUPS = [1, 1.5, 2, 3, 4, 8, 16, Infinity];
  const sig = (x, d = 3) => Number(x.toPrecision(d)).toString();

  const T = Viz.t({
    zh: {
      code: 'ROOFLINE', title: '两块天花板', tag: '教学推演 · 算力 P 为假设值',
      intro: '横轴是<b>算术强度</b> I：每从显存读 1 字节，能做几次运算。斜线是带宽的天花板（B × I），平线是算力的天花板（P）。拖动“同时算几个 token”、切换权重格式，看那个点落在哪块天花板下面。按 <b>单步</b> 跟着算一遍。',
      lgPoint: '当前这次计算', lgRef: '参照：写答案（b = 1，FP16）', lgRoof: '天花板：min(P, B × I)',
      steps: ['数运算量', '数字节', '算 I', '和拐点比', '定瓶颈'],
      bLabel: '同时算几个 token（b）', bStep: '▶ 单步',
      formats: [['FP16', 2, '2 字节'], ['Q8_0', 34 / 32, '1.0625 字节'], ['Q2_0', 18 / 64, '0.28125 字节']],
      axX: '算术强度 I（FLOP/字节，对数刻度）', axY: '能达到的算力（TFLOPS，对数刻度）',
      plotLabel: 'roofline 图：横轴算术强度，纵轴可达算力',
      ridge: (r) => `拐点 ≈ ${r}`,
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始',
      r0: (b) => `<span class="c">数运算量</span>：b = ${b} 个 token，每个权重对每个 token 做 1 次乘法、1 次加法 → 每个权重 ${2 * b} 次运算`,
      r1: (bpw, fmt) => `<span class="c">数字节</span>：每个权重 ${bpw}（${fmt}），从显存读一次。这里只算权重，忽略输入输出`,
      r2: (b, bpw, I) => `<span class="m">算术强度</span>：I = ${2 * b} ÷ ${bpw} ≈ ${I} 次运算/字节`,
      r3: (I, r, left) => `<span class="w">和拐点比</span>：拐点 = P ÷ B = 50 万亿 ÷ 6720 亿 ≈ ${r}。I = ${I}，在拐点${left ? '左边' : '右边'}`,
      r4m: (perf, pct) => `<span class="y">结论</span>：带宽受限。最多只能用到 ${perf} TFLOPS，是算力上限的 ${pct}%，其余时间在等数据`,
      r4c: '<span class="y">结论</span>：算力受限，能用满 50 TFLOPS。再加大 b，每个 token 也不会更快',
      sI: '算术强度 I', sIF: '<b>= 2b ÷ 每个权重的字节数</b><br>单位：次运算/字节',
      sPerf: '能达到的算力', sPerfF: '<b>= min(P, B × I)</b><br>P = 50 TFLOPS（假设），B = 672 GB/s',
      sBound: '瓶颈在哪', vMem: '带宽', vComp: '算力', sBoundF: (r) => `<b>拐点 = P ÷ B ≈ ${r}</b><br>I 小于拐点，就是在等数据`,
      try: [
        'b = 1、FP16：I = 1，只能用到约 0.67 TFLOPS，不到上限的 2%。写答案时，显卡大部分时间在等数据。',
        '把 b 拉到 <b>128</b>：点越过拐点，爬上平顶。一次算很多 token（读题），同一份权重被用很多次。',
        '换成 <b>Q2_0</b>：同样 b = 1，I 变成约 7。每个权重的字节少了，同样的带宽能喂饱更多运算（解码的额外开销这里没算）。',
      ],
      verdict: '① 写答案时一轮只算 1 个 token，I 只有 1 左右，远在拐点左边：速度由带宽决定，不由算力决定。<br>② 读题时一次算很多 token，I 跟着 b 变大，才爬上平顶。<br>③ 量化减少每个权重的字节，也能把 I 往右推；代价是解码要额外计算（第 4 章）。',

      aCode: 'AMDAHL', aTitle: '只优化一部分，整体快多少', aTag: '教学推演 · 16% 来自 Strata 源码注释',
      aIntro: '一个 token 的时间分成两块：要优化的部分占 f，其余占 1 − f。把要优化的部分加速 s 倍，看整条时间线缩短多少。',
      lgRest: '没被优化的部分', lgPart: '要优化的部分', lgFast: '优化后的那部分',
      presets: [['Strata 的 GEMV：约 16%', 16], ['占一半', 50], ['占九成', 90]],
      fLabel: '要优化的部分占 f', sLabel: '它快了 s 倍',
      before: '优化前', after: '优化后',
      aReady: '<span class="c">$</span> ready. 拖动滑块，或点上面的预设',
      aLog: (f, s, t, S) => `<span class="c">f = ${f}%，s = ${s}</span>：新时间 = ${100 - f}% + ${f}% ÷ ${s} = ${t}%，整体快 <span class="y">${S} 倍</span>`,
      kS: '整体加速', fS: '<b>= 1 ÷ ((1 − f) + f ÷ s)</b>',
      kCap: '加速上限（s → ∞）', fCap: '<b>= 1 ÷ (1 − f)</b><br>没被优化的部分，一点没少',
      kT: '新的总时间', fT: '<b>= (1 − f) + f ÷ s</b><br>以优化前为 100%',
      aTry: [
        '点 <b>Strata 的 GEMV</b>，把 s 拉到 ∞：整体也只快约 1.19 倍。',
        '点 <b>占九成</b>，s = 2：整体快约 1.82 倍。值得花力气的，是占大头的部分。',
        '固定 s = 2，把 f 从 0 拉到 95%：整体加速慢慢逼近 2，但永远到不了。',
      ],
      aVerdict: (f, s, S, cap) => `① 要优化的部分占 ${f}%，快了 ${s} 倍，整体只快 <b>${S} 倍</b>。<br>② 就算快到无穷，整体最多快 ${cap} 倍：剩下的 ${100 - f}% 一点没少。<br>③ 所以动手优化之前，先量清楚各部分各占多少时间。Strata 的源码就是这样判断：GEMV 只占一个 token 的约 16%，改它的线程数动不了总时间。`,
    },
    en: {
      code: 'ROOFLINE', title: 'Two ceilings', tag: 'Teaching estimate · compute P is assumed',
      intro: 'The x-axis is <b>arithmetic intensity</b> I: operations per byte read from VRAM. The slant is the bandwidth ceiling (B × I), the flat part is the compute ceiling (P). Drag “tokens per batch”, switch weight formats, and watch where the point falls. Click <b>step</b> to walk through the arithmetic.',
      lgPoint: 'current computation', lgRef: 'reference: decode (b = 1, FP16)', lgRoof: 'ceiling: min(P, B × I)',
      steps: ['count ops', 'count bytes', 'compute I', 'compare ridge', 'find bottleneck'],
      bLabel: 'tokens per batch (b)', bStep: '▶ step',
      formats: [['FP16', 2, '2 bytes'], ['Q8_0', 34 / 32, '1.0625 bytes'], ['Q2_0', 18 / 64, '0.28125 bytes']],
      axX: 'arithmetic intensity I (FLOP/byte, log scale)', axY: 'achievable throughput (TFLOPS, log scale)',
      plotLabel: 'roofline: x-axis intensity, y-axis achievable throughput',
      ridge: (r) => `ridge ≈ ${r}`,
      ready: '<span class="c">$</span> ready. Click [ ▶ step ] to begin',
      r0: (b) => `<span class="c">count ops</span>: b = ${b} tokens, each weight does 1 multiply + 1 add per token → ${2 * b} ops per weight`,
      r1: (bpw, fmt) => `<span class="c">count bytes</span>: ${bpw} per weight (${fmt}), read once from VRAM. here, weights only, ignoring inputs/outputs`,
      r2: (b, bpw, I) => `<span class="m">arithmetic intensity</span>: I = ${2 * b} ÷ ${bpw} ≈ ${I} ops/byte`,
      r3: (I, r, left) => `<span class="w">compare ridge</span>: ridge = P ÷ B = 50 trillion ÷ 672 billion ≈ ${r}. I = ${I}, ${left ? 'left of' : 'right of'} ridge`,
      r4m: (perf, pct) => `<span class="y">conclusion</span>: bandwidth-limited. can only reach ${perf} TFLOPS, ${pct}% of limit; rest of time waiting for data`,
      r4c: '<span class="y">conclusion</span>: compute-limited, can reach full 50 TFLOPS. larger b will not speed up a single token',
      sI: 'intensity I', sIF: '<b>= 2b ÷ bytes per weight</b><br>unit: ops/byte',
      sPerf: 'achievable throughput', sPerfF: '<b>= min(P, B × I)</b><br>P = 50 TFLOPS (assumption), B = 672 GB/s',
      sBound: 'bottleneck', vMem: 'bandwidth', vComp: 'compute', sBoundF: (r) => `<b>ridge = P ÷ B ≈ ${r}</b><br>I left of ridge means waiting for data`,
      try: [
        'b = 1, FP16: I = 1, reaches only 0.67 TFLOPS, under 2% of ceiling. decode: GPU mostly waiting.',
        'slide b to <b>128</b>: point crosses ridge, climbs the flat. one batch computes many tokens (prefill), same weights reused.',
        'switch to <b>Q2_0</b>: same b = 1, I becomes ~7. fewer bytes per weight, same bandwidth feeds more arithmetic (unpacking cost not included).',
      ],
      verdict: '① decode one token at a time: I ~1, far left of ridge, speed set by bandwidth not compute. ② prefill many tokens at once: I grows with b, climbs the flat. ③ quantization shrinks bytes per weight, pushes I right; cost is extra unpacking compute (chapter 4).',

      aCode: 'AMDAHL', aTitle: 'speed up one part—how much faster overall', aTag: 'Teaching estimate · 16% from Strata source comments',
      aIntro: 'one token\'s time splits two ways: part to optimize is f, the rest is 1 − f. speed the part by s×, watch the timeline shrink.',
      lgRest: 'part not optimized', lgPart: 'part to optimize', lgFast: 'after speedup',
      presets: [['Strata\'s GEMV: ~16%', 16], ['half', 50], ['ninety percent', 90]],
      fLabel: 'fraction to optimize (f)', sLabel: 'speedup factor (s)',
      before: 'before', after: 'after',
      aReady: '<span class="c">$</span> ready. drag slider or click preset above',
      aLog: (f, s, t, S) => `<span class="c">f = ${f}%, s = ${s}</span>: new time = ${100 - f}% + ${f}% ÷ ${s} = ${t}%, overall speedup <span class="y">${S}×</span>`,
      kS: 'overall speedup', fS: '<b>= 1 ÷ ((1 − f) + f ÷ s)</b>',
      kCap: 'speedup ceiling (s → ∞)', fCap: '<b>= 1 ÷ (1 − f)</b><br>unoptimized part shrinks zero',
      kT: 'new total time', fT: '<b>= (1 − f) + f ÷ s</b><br>as % of original',
      aTry: [
        'click <b>Strata\'s GEMV</b>, slide s to ∞: overall speeds up only ~1.19×.',
        'click <b>ninety percent</b>, s = 2: overall ~1.82×. effort goes to the big piece.',
        'fix s = 2, slide f from 0 to 95%: overall speedup creeps toward 2, never reaches.',
      ],
      aVerdict: (f, s, S, cap) => `① optimize ${f}%, speed it ${s}×, whole system only <b>${S}×</b> faster. ② even infinite speed caps at ${cap}×: the other ${100 - f}% shrinks zero. ③ so measure first: which parts cost what. Strata source: GEMV is ~16% of one token, change thread count = zero net gain.`,
    },
    ja: {
      code: 'ROOFLINE', title: '2 枚の天井', tag: '教育用の試算 · 演算性能 P は仮定値',
      intro: '横軸は<b>演算強度</b> I です。VRAM から 1 バイト読むごとに、何回演算できるかを表します。斜めの線が帯域幅の天井（B × I）、水平の線が演算性能の天井（P）です。「同時に計算するトークン数」を動かし、重みの形式を切り替えて、点がどちらの天井の下にあるか見てみましょう。<b>ステップ</b>を押すと、計算を順に追えます。',
      lgPoint: '今の計算', lgRef: '比較用：デコード（b = 1、FP16）', lgRoof: '天井：min(P, B × I)',
      steps: ['演算量を数える', 'バイトを数える', 'I を求める', '折れ点と比べる', '律速を決める'],
      bLabel: '同時に計算するトークン数（b）', bStep: '▶ ステップ',
      formats: [['FP16', 2, '2 バイト'], ['Q8_0', 34 / 32, '1.0625 バイト'], ['Q2_0', 18 / 64, '0.28125 バイト']],
      axX: '演算強度 I（FLOP/バイト、対数目盛）', axY: '到達できる演算性能（TFLOPS、対数目盛）',
      plotLabel: 'ルーフライン図：横軸は演算強度、縦軸は到達できる演算性能',
      ridge: (r) => `折れ点 ≈ ${r}`,
      ready: '<span class="c">$</span> ready. [ ▶ ステップ ] を押して開始',
      r0: (b) => `<span class="c">演算量を数える</span>：b = ${b} トークン。各重みは、トークンごとに乗算 1 回と加算 1 回 → 重み 1 個あたり ${2 * b} 回の演算`,
      r1: (bpw, fmt) => `<span class="c">バイトを数える</span>：重み 1 個は ${bpw}（${fmt}）で、VRAM から 1 回読みます。ここでは重みだけを数え、入出力は無視します`,
      r2: (b, bpw, I) => `<span class="m">演算強度</span>：I = ${2 * b} ÷ ${bpw} ≈ ${I} 回/バイト`,
      r3: (I, r, left) => `<span class="w">折れ点と比べる</span>：折れ点 = P ÷ B = 50 兆 ÷ 6720 億 ≈ ${r}。I = ${I} は、折れ点の${left ? '左側' : '右側'}です`,
      r4m: (perf, pct) => `<span class="y">結論</span>：帯域幅律速です。使えるのは最大 ${perf} TFLOPS で、演算性能の上限の ${pct}% です。残りの時間はデータを待っています`,
      r4c: '<span class="y">結論</span>：演算律速で、50 TFLOPS を使い切れます。b をさらに増やしても、1 トークンあたりは速くなりません',
      sI: '演算強度 I', sIF: '<b>= 2b ÷ 重み 1 個のバイト数</b><br>単位：回/バイト',
      sPerf: '到達できる演算性能', sPerfF: '<b>= min(P, B × I)</b><br>P = 50 TFLOPS（仮定）、B = 672 GB/s',
      sBound: '律速はどこか', vMem: '帯域幅', vComp: '演算性能', sBoundF: (r) => `<b>折れ点 = P ÷ B ≈ ${r}</b><br>I が折れ点より小さければ、データ待ちです`,
      try: [
        'b = 1、FP16：I = 1 で、使えるのは約 0.67 TFLOPS、上限の 2% 未満です。デコード中、GPU はほとんどの時間データを待っています。',
        'b を <b>128</b> に上げる：点は折れ点を越え、水平の部分に乗ります。多くのトークンをまとめて計算する（プリフィル）と、同じ重みが何度も使われます。',
        '<b>Q2_0</b> に切り替える：同じ b = 1 でも I は約 7 になります。重み 1 個のバイト数が減り、同じ帯域幅でより多くの演算を養えます（デコードの追加コストはここでは数えていません）。',
      ],
      verdict: '① デコードは 1 ラウンドで 1 トークンしか計算しません。I は 1 前後で、折れ点よりずっと左です。速さを決めるのは演算性能ではなく帯域幅です。<br>② プリフィルは多くのトークンをまとめて計算します。I が b とともに大きくなり、水平の部分に乗ります。<br>③ 量子化は重み 1 個のバイト数を減らし、I を右へ押します。代償は、デコードに追加の計算が要ることです（第 4 章）。',

      aCode: 'AMDAHL', aTitle: '一部だけ最適化すると、全体はどれだけ速くなるか', aTag: '教育用の試算 · 16% は Strata のソースコメントより',
      aIntro: '1 トークンの時間を 2 つに分けます。最適化する部分が f、残りが 1 − f です。最適化する部分を s 倍に速くして、全体のタイムラインがどれだけ縮むか見ましょう。',
      lgRest: '最適化されない部分', lgPart: '最適化する部分', lgFast: '最適化後のその部分',
      presets: [['Strata の GEMV：約 16%', 16], ['半分', 50], ['9 割', 90]],
      fLabel: '最適化する部分の割合 f', sLabel: 'その部分が s 倍速くなる',
      before: '最適化前', after: '最適化後',
      aReady: '<span class="c">$</span> ready. スライダーを動かすか、上のプリセットを押してください',
      aLog: (f, s, t, S) => `<span class="c">f = ${f}%、s = ${s}</span>：新しい時間 = ${100 - f}% + ${f}% ÷ ${s} = ${t}%、全体で <span class="y">${S} 倍</span>速くなります`,
      kS: '全体の高速化率', fS: '<b>= 1 ÷ ((1 − f) + f ÷ s)</b>',
      kCap: '高速化の上限（s → ∞）', fCap: '<b>= 1 ÷ (1 − f)</b><br>最適化されない部分は、まったく減りません',
      kT: '新しい総時間', fT: '<b>= (1 − f) + f ÷ s</b><br>最適化前を 100% とします',
      aTry: [
        '<b>Strata の GEMV</b> を押して、s を ∞ にする：全体は約 1.19 倍しか速くなりません。',
        '<b>9 割</b>を押して、s = 2 にする：全体は約 1.82 倍速くなります。力を注ぐ価値があるのは、大きな割合を占める部分です。',
        's = 2 に固定して、f を 0 から 95% まで動かす：全体の高速化率は 2 にじわじわ近づきますが、届きません。',
      ],
      aVerdict: (f, s, S, cap) => `① 最適化する部分は ${f}% で、${s} 倍速くなりました。全体は <b>${S} 倍</b>しか速くなりません。<br>② 無限に速くしても、全体は最大 ${cap} 倍までです。残りの ${100 - f}% はまったく減りません。<br>③ だから最適化に手をつける前に、各部分が時間のどれだけを占めるかを測ります。Strata のソースはこう判断しました。GEMV は 1 トークンの約 16% しか占めないので、スレッド数を変えても合計時間は動きません。`,
    },
  });

  Viz.register('roofline-lab', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgPoint, glow: true },
        { color: 'var(--a2)', text: T.lgRef },
        { color: 'var(--muted)', text: T.lgRoof },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 360, H = 250, x0 = 52, x1 = 344, y0 = 26, y1 = 206;
      const xs = I => x0 + (Math.log10(I) + 1) / 4 * (x1 - x0), ys = tf => y1 - (Math.log10(tf) + 2) / 4 * (y1 - y0);
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-stage', role: 'img', 'aria-label': T.plotLabel }, left);
      const txt = (x, y, s, anchor, color) => { const t = Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': anchor || 'start', style: `fill:${color || 'var(--muted)'}` }, svg); t.textContent = s; return t; };
      txt(x0, 14, T.axY);
      [0.1, 1, 10, 100, 1000].forEach(I => { Viz.svg('path', { d: `M${xs(I)} ${y0}V${y1}`, style: 'stroke:var(--frame);fill:none', 'stroke-width': 1 }, svg); txt(xs(I), y1 + 16, String(I), 'middle'); });
      [0.01, 0.1, 1, 10, 100].forEach(v => { Viz.svg('path', { d: `M${x0} ${ys(v)}H${x1}`, style: 'stroke:var(--frame);fill:none', 'stroke-width': 1 }, svg); txt(x0 - 4, ys(v) + 4, String(v), 'end'); });
      txt((x0 + x1) / 2, H - 6, T.axX, 'middle');
      const r = M.ridge(P, B), Ptf = P / 1e12, Btf = B / 1e12;
      Viz.svg('path', { d: `M${xs(0.1)} ${ys(Btf * 0.1)}L${xs(r)} ${ys(Ptf)}H${x1}`, style: 'stroke:var(--muted);fill:none', 'stroke-width': 2.5 }, svg);
      Viz.svg('path', { d: `M${xs(r)} ${ys(Ptf)}V${y1}`, style: 'stroke:var(--muted);fill:none', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
      txt(xs(r) - 4, ys(Ptf) - 6, T.ridge(r.toFixed(0)), 'end');
      Viz.svg('circle', { cx: xs(1), cy: ys(Btf), r: 5, style: 'fill:none;stroke:var(--a2)', 'stroke-width': 2 }, svg);
      const drop = Viz.svg('path', { d: '', style: 'stroke:var(--accent);fill:none', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
      const dot = Viz.svg('circle', { cx: 0, cy: 0, r: 6, style: 'fill:var(--accent);filter:drop-shadow(var(--glow))' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin-top:8px">${T.formats.map(([n], k) => `<button type="button" class="viz-btn${k ? ' ghost' : ''}" data-fmt="${k}" style="padding:5px 10px;font-size:12px">${n}</button>`).join('')}</div>
        <div class="viz-slider"><label>${T.bLabel}</label><input class="rl-b" type="range" min="0" max="${BATCH.length - 1}" step="1" value="0" aria-label="${Viz.esc(T.bLabel)}"><output class="rl-bo"></output></div>
        <div class="viz-row">${Viz.button(T.bStep, 'rl-step')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'rl-i', k: T.sI, v: '', f: T.sIF }) +
        Viz.stat({ id: 'rl-p', k: T.sPerf, v: '', f: T.sPerfF, hot: true }) +
        Viz.stat({ id: 'rl-b', k: T.sBound, v: '', f: T.sBoundF(r.toFixed(0)) });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try) + `<div class="viz-verdict" hidden>${T.verdict}</div>`);
      const $ = s => el.querySelector(s);
      const bIn = $('.rl-b');
      let fmt = 0, phase = -1;
      const state = () => { const b = BATCH[+bIn.value], bpw = T.formats[fmt][1], I = M.intensity(b, bpw), rf = M.roofline(P, B, I); return { b, bpw, I, rf }; };
      function paint() {
        const { b, I, rf } = state(), tf = rf.perf / 1e12, Ic = Math.min(1000, Math.max(0.1, I));
        $('.rl-bo').textContent = b;
        dot.setAttribute('cx', xs(Ic)); dot.setAttribute('cy', ys(tf));
        drop.setAttribute('d', `M${xs(Ic)} ${ys(tf)}V${y1}`);
        $('[data-s=rl-i-v]').textContent = sig(I);
        $('[data-s=rl-p-v]').textContent = sig(tf) + ' TFLOPS';
        $('[data-s=rl-b-v]').textContent = rf.bound === 'memory' ? T.vMem : T.vComp;
        el.querySelectorAll('[data-fmt]').forEach(x => x.classList.toggle('ghost', +x.dataset.fmt !== fmt));
      }
      function step() {
        phase = (phase + 1) % 5;
        pipe.set(phase);
        const { b, bpw, I, rf } = state(), f = T.formats[fmt];
        if (phase === 0) term.log(T.r0(b));
        if (phase === 1) term.log(T.r1(f[2], f[0]));
        if (phase === 2) term.log(T.r2(b, sig(bpw, 4), sig(I)));
        if (phase === 3) term.log(T.r3(sig(I), r.toFixed(0), I < r));
        if (phase === 4) { term.log(rf.bound === 'memory' ? T.r4m(sig(rf.perf / 1e12), sig(rf.perf / P * 100, 2)) : T.r4c); $('.viz-verdict').hidden = false; }
      }
      el.querySelectorAll('[data-fmt]').forEach(x => { x.onclick = () => { fmt = +x.dataset.fmt; phase = -1; pipe.set(-1); paint(); }; });
      bIn.oninput = () => { phase = -1; pipe.set(-1); paint(); };
      $('.rl-step').onclick = step;
      paint();
    },
  });

  Viz.register('amdahl-bar', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.aCode, title: T.aTitle, tag: T.aTag, intro: T.aIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgRest },
        { color: 'var(--accent)', text: T.lgPart, glow: true },
        { color: 'var(--a2)', text: T.lgFast },
      ]));
      const track = 'position:relative;height:28px;border:1px solid var(--frame);background:transparent;display:flex;overflow:hidden';
      const seg = 'height:100%;transition:width .35s ease';
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div class="viz-row" style="margin-top:0">${T.presets.map(([l], k) => `<button type="button" class="viz-btn ghost" data-pre="${k}" style="padding:5px 8px;font-size:12px">${l}</button>`).join('')}</div>
        <div style="font-size:13px;color:var(--ink);margin:14px 0 4px">${T.before}</div>
        <div style="${track}"><i class="ab-r0" style="${seg};background:color-mix(in srgb,var(--frame) 70%,transparent)"></i><i class="ab-p0" style="${seg};background:var(--accent)"></i></div>
        <div style="font-size:13px;color:var(--ink);margin:12px 0 4px">${T.after}</div>
        <div style="${track}"><i class="ab-r1" style="${seg};background:color-mix(in srgb,var(--frame) 70%,transparent)"></i><i class="ab-p1" style="${seg};background:var(--a2)"></i></div>
        <div class="viz-slider"><label>${T.fLabel}</label><input class="ab-f" type="range" min="0" max="95" step="1" value="16" aria-label="${Viz.esc(T.fLabel)}"><output class="ab-fo"></output></div>
        <div class="viz-slider"><label>${T.sLabel}</label><input class="ab-s" type="range" min="0" max="${SPEEDUPS.length - 1}" step="1" value="2" aria-label="${Viz.esc(T.sLabel)}"><output class="ab-so"></output></div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.aReady);
      right.innerHTML =
        Viz.stat({ id: 'ab-s', k: T.kS, v: '', f: T.fS, hot: true }) +
        Viz.stat({ id: 'ab-c', k: T.kCap, v: '', f: T.fCap }) +
        Viz.stat({ id: 'ab-t', k: T.kT, v: '', f: T.fT });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.aTry) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const fIn = $('.ab-f'), sIn = $('.ab-s');
      const sLabel = s => (s === Infinity ? '∞' : String(s));
      const cur = () => { const f = +fIn.value / 100, s = SPEEDUPS[+sIn.value]; return { f, s, S: M.amdahl(f, s), cap: f < 1 ? 1 / (1 - f) : Infinity, t: (1 - f) + (s === Infinity ? 0 : f / s) }; };
      function paint() {
        const { f, s, S, cap, t } = cur();
        $('.ab-fo').textContent = Math.round(f * 100) + '%';
        $('.ab-so').textContent = sLabel(s);
        $('.ab-r0').style.width = (1 - f) * 100 + '%'; $('.ab-p0').style.width = f * 100 + '%';
        $('.ab-r1').style.width = (1 - f) * 100 + '%'; $('.ab-p1').style.width = (t - (1 - f)) * 100 + '%';
        $('[data-s=ab-s-v]').textContent = S.toFixed(3) + '×';
        $('[data-s=ab-c-v]').textContent = cap.toFixed(2) + '×';
        $('[data-s=ab-t-v]').textContent = (t * 100).toFixed(1) + '%';
      }
      function report() {
        const { f, s, S, cap, t } = cur(), fp = Math.round(f * 100);
        term.log(T.aLog(fp, sLabel(s), (t * 100).toFixed(1), S.toFixed(3)));
        const v = $('.viz-verdict'); v.innerHTML = T.aVerdict(fp, sLabel(s), S.toFixed(3), cap.toFixed(2)); v.hidden = false;
      }
      el.querySelectorAll('[data-pre]').forEach(b => { b.onclick = () => {
        fIn.value = T.presets[+b.dataset.pre][1];
        el.querySelectorAll('[data-pre]').forEach(o => o.classList.toggle('ghost', o !== b));
        paint(); report();
      }; });
      fIn.oninput = sIn.oninput = paint;
      fIn.onchange = sIn.onchange = report;
      paint();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
