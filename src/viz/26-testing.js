/* Chapter 26 widgets: a float comparison bench and a toy mutation-testing matrix.
   All visible text lives in the T table below (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.testing;

  const RTOLS = [0, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1];
  const ATOLS = [0, 1e-12, 1e-11, 1e-10, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2];
  const sci = x => (x === 0 ? '0' : x.toExponential(1).replace('e-', 'e−'));
  const fullNum = x => String(x).replace('e-', 'e−');

  const T = Viz.t({
    zh: {
      code: 'FLOAT_EQ', title: '浮点比较实验台', tag: '教学推演 · 浏览器里真算',
      intro: '同一组数，用两条路径相加：<b>路径 A</b> 和 <b>路径 B</b>，就像 CPU 和 GPU 用不同顺序算同一个专家。选一个场景，按 <b>逐步比较</b>，再拖动两个容差滑块，看三种“相等”的判据怎样给出不同答案。',
      lgA: '路径 A 的结果', lgB: '路径 B 的结果', lgRef: '双精度参考（把输入的和用 FP64 算一遍）', lgBand: '容差带：离 B 多近算“一样”',
      steps: ['选场景', '路径 A 相加', '路径 B 相加', '算差值', '三种判据'],
      scen: { tenths: '0.1 + 0.2 和 0.3', swamp: '大数吃掉小数', drift: '1000 个 0.1', dot: '256 维点积', nearzero: '结果接近 0' },
      scenDesc: {
        tenths: 'A：0.1 + 0.2；B：直接写 0.3。',
        swamp: '四个数 [1亿, 1, −1亿, 1]。A 从左到右；B 两两分组（像 GPU 的树形归约）。',
        drift: '把 0.1 加 1000 次。A 从左到右；B 两两分组。',
        dot: '两组各 256 个随机数逐项相乘再相加，像算一个 logit。A 从左到右；B 两两分组。',
        nearzero: '四个数 [1, 2×10⁻⁸, −1, 2×10⁻⁸]。A 从左到右；B 从右到左。',
      },
      order: { forward: '从左到右', reverse: '从右到左', pairwise: '两两分组', literal: '直接写出' },
      precLabel: '精度',
      rtolLabel: '相对容差 rtol', atolLabel: '绝对容差 atol',
      bRun: '▶ 逐步比较', bReset: '重置',
      lensLabel: '数轴放大镜：A、B、参考值和容差带',
      lens: (h) => `放大镜宽度：B ± ${h}`,
      sAK: '路径 A 的结果', sBK: '路径 B 的结果',
      sOrdF: (o, prec) => `<b>按“${o}”的顺序相加</b><br>每加一步，结果都舍入到 ${prec}`,
      sDK: '两条路径差多少', sDF: (rel, ulp) => `<b>|A − B|</b>；相对差 = |A − B| ÷ max(|A|, |B|) = ${rel}<br>${ulp}`,
      ulp: (n) => `相差 ${n} 个 FP32 刻度（ULP）`, ulpMany: '两个数隔得太远，ULP 没有意义', ulpNa: 'FP64 模式下不计 ULP',
      sJK: '三种“相等”判据', sJF: '<b>允许误差 = max(rtol × max(|A|,|B|), atol)</b><br>这是 Python 的 math.isclose 写法',
      j: { exact: '精确相等 A == B', absOnly: '只看绝对容差 |A−B| ≤ atol', relOnly: '只看相对容差', combined: '相对 + 绝对（推荐）' },
      yes: '✓ 相等', no: '✗ 不等',
      ready: '<span class="c">$</span> ready. 选一个场景，按 [ ▶ 逐步比较 ]',
      l0: (name, n, prec) => `<span class="c">[场景]</span> ${name}：${n} 个数，精度 ${prec}`,
      lStep: (who, i, s) => `<span class="m">${who}</span> 第 ${i} 步，累计 = ${s}`,
      lSkip: (k) => `<span class="m">…</span> 中间还有 ${k} 步`,
      lPair: (who, n, r) => `<span class="m">${who}</span> 两两分组：相邻两数先相加，结果再两两相加，共 ${r} 轮（${n} 个数）`,
      lLit: (who, v) => `<span class="m">${who}</span> 直接写出 0.3，存成 ${v}`,
      lRes: (who, v) => `<span class="w">${who} 结果</span> = ${v}`,
      lDiff: (d, ref) => `<span class="y">差值</span> |A − B| = ${d}；双精度参考 = ${ref}`,
      lJudge: (e, c) => `<span class="c">判据</span> 精确相等说：${e}；相对 + 绝对容差说：${c}`,
      same: '一样', diff: '不一样',
      vExactLuck: '两条路径恰好算出同一个数。别高兴太早：这是运气。换个精度或顺序就可能不同，试试 FP64 下的「0.1 + 0.2 和 0.3」。',
      vTolOk: '精确比较说“不一样”，可差值落在你设定的容差之内：按这个标准，两条路径算“一样”。测试如果写成 <code>==</code>，就会把这种顺序差异当成 bug。',
      vTolBad: '差值超出了容差。要么容差设得太紧，要么某条路径真的丢了信息，比如“大数吃掉小数”。看看双精度参考：谁更接近它？',
      vNearZero: '<br>另外注意：只看相对容差时判“不等”，加上绝对容差后判“相等”。结果接近 0 时，相对误差会失真，需要绝对容差兜底。',
      try: [
        '选「0.1 + 0.2 和 0.3」，在 <b>FP32</b> 和 <b>FP64</b> 之间切换：FP32 下恰好相等，FP64 下不等。相等与否取决于运气，不取决于“算对没有”。',
        '选「大数吃掉小数」：A 得 1，B 得 0，正确答案是 2。两条路径都丢了信息，而且丢得不一样。这说明容差救不了算法本身的问题。',
        '选「结果接近 0」，把 atol 拉到 <b>0</b>：相对 + 绝对判据也失败了。再把 atol 调回 10⁻⁶：通过。接近 0 的比较必须有绝对容差。',
      ],

      mCode: 'MUTANT_HUNT', mTitle: '变异测试：哪个测试抓得到 bug', mTag: '教学推演 · 48 层玩具模型',
      mIntro: '一个 48 层的玩具模型：每层 4 个“专家”各乘一个系数，按路由权重加权相加，再加回残差。我们准备了 4 个版本：1 个正确但换了加法顺序，3 个各藏一个 bug。选一个版本，按 <b>跑全部测试</b>，看 5 个测试里谁会报警。',
      mLgCaught: '报警了，而且该报警（抓到 bug）', mLgMissed: '该报警却没报警（漏掉 bug），或对正确实现误报', mLgQuiet: '正确实现、测试安静通过',
      tests: ['冒烟测试', '弱单元测试', '强单元测试', '差分·精确', '差分·容差'],
      testDesc: {
        smoke: '冒烟测试：跑完 48 层，输出是有限数、不是 0',
        weakUnit: '弱单元测试：1 个专家、权重 1.0、输入 2，期望 2',
        strongUnit: '强单元测试：2 个专家、权重 0.7 / 0.3、输入 1 / 3，期望 1.6（容差 10⁻⁶）',
        diffExact: '差分测试（精确相等）：和参考实现比 48 层后的输出，要求逐位相同',
        diffTol: '差分测试（容差）：和参考实现比，允许 rtol = 10⁻⁵、atol = 10⁻⁶',
      },
      vars: { ok: '正确实现（换了加法顺序）', w2: 'bug：权重乘两次', drop: 'bug：漏掉一个专家', stale: 'bug：每层用旧输入' },
      varDesc: {
        ok: '正确实现：把每个专家的贡献直接加进残差，而且从最后一个专家加起。数学上和参考实现完全相同。',
        w2: 'bug：路由权重乘了两次，w 变成 w²。Strata 的接口注释专门警告过这一条。',
        drop: 'bug：循环少跑一次，漏掉最后一个专家。经典的“差一”错误。',
        stale: 'bug：每一层都拿第 0 层的输入去算专家。好比按地址缓存了一块每层内容都在变的缓冲区。',
      },
      gridLabel: '4 个版本 × 5 个测试的结果表',
      cellPass: '通过', cellFail: '报警', cellTodo: '—',
      bRunAll: '▶ 跑全部测试', bClear: '清空表格',
      mReady: '<span class="c">$</span> ready. 先选一个版本，再按 [ ▶ 跑全部测试 ]',
      mStart: (name) => `<span class="c">[版本]</span> ${name}`,
      mLine: (desc, pass, got, want) => `<span class="m">${desc}</span><br>　得到 ${got}${want === null ? '' : '，期望 ' + want} → ${pass ? '<span class="w">通过</span>' : '<span class="y">报警</span>'}`,
      sOutK: '48 层后的输出：本版本 vs 参考实现', sOutF: (rel) => `<b>相对差 = ${rel}</b><br>参考实现：每层先把 4 个专家加权求和，再加进残差`,
      sScoreK: '变异分数（已跑的 bug 版本里，被至少一个测试抓到的比例）', sScoreF: (c, n) => `<b>= 抓到的 bug 版本 ÷ 已跑的 bug 版本 = ${c} ÷ ${n}</b>`,
      sColK: '每个测试的战绩（抓到 bug / 误报）',
      colLine: (name, c, n, fa) => `${name}：抓到 ${c}/${n}${fa ? '，误报 1 次' : ''}`,
      mVerdictRow: {
        ok: '这是正确实现。只有“差分·精确”报了警：换了加法顺序，最后几位就变了。这是误报。',
        w2: '“权重乘两次”骗过了冒烟测试和弱单元测试：权重恰好是 1.0 时，1.0² 还是 1.0。强单元测试用了 0.7 和 0.3，一下就抓到了。',
        drop: '漏掉一个专家，连弱单元测试都能抓到。可冒烟测试照样通过：输出仍是一个“看起来正常”的数。',
        stale: '“每层用旧输入”的 bug 不在加权求和函数里，所以两个单元测试都抓不到。只有比较整条 48 层路径的差分测试能发现它。',
      },
      mVerdictAll: '四行都跑完了。冒烟测试一个 bug 都没抓到；单元测试各有盲区；精确相等的差分测试全抓到了，却也冤枉了正确实现；带容差的差分测试抓到全部 3 个 bug，而且没有误报。好测试要同时做到两件事：在注入的 bug 面前失败，在合法的数值差异面前通过。',
      mTry: [
        '先跑 <b>bug：权重乘两次</b>：冒烟测试和弱单元测试都通过了。想一想：为什么权重取 1.0 的测试看不见这个 bug？',
        '再跑 <b>正确实现</b>：只有“差分·精确”报警。这就是浮点误报，第 26.3 节讲了为什么。',
        '最后跑 <b>bug：每层用旧输入</b>：两个单元测试都通过，只有整条路径的差分测试抓到它。这说明只有单元测试不够。',
      ],
    },
    en: {
      code: 'FLOAT_EQ', title: 'Float comparison bench', tag: 'Teaching estimate · computed live in your browser',
      intro: 'Add the same numbers along two paths, <b>path A</b> and <b>path B</b>, just as a CPU and a GPU compute the same expert in different orders. Pick a scenario, press <b>Compare step by step</b>, then drag the two tolerance sliders and watch three definitions of "equal" give different answers.',
      lgA: 'Result of path A', lgB: 'Result of path B', lgRef: 'Double-precision reference (the inputs summed in FP64)', lgBand: 'Tolerance band: how close to B counts as "the same"',
      steps: ['Pick scenario', 'Path A adds', 'Path B adds', 'Take difference', 'Three verdicts'],
      scen: { tenths: '0.1 + 0.2 vs 0.3', swamp: 'Big swallows small', drift: '1000 × 0.1', dot: '256-dim dot product', nearzero: 'Result near 0' },
      scenDesc: {
        tenths: 'A: 0.1 + 0.2; B: write 0.3 directly.',
        swamp: 'Four numbers [100M, 1, −100M, 1]. A goes left to right; B adds in pairs (like a GPU tree reduction).',
        drift: 'Add 0.1 a thousand times. A goes left to right; B adds in pairs.',
        dot: 'Two lists of 256 random numbers, multiplied item by item and summed, like computing one logit. A goes left to right; B adds in pairs.',
        nearzero: 'Four numbers [1, 2×10⁻⁸, −1, 2×10⁻⁸]. A goes left to right; B goes right to left.',
      },
      order: { forward: 'left to right', reverse: 'right to left', pairwise: 'in pairs', literal: 'written directly' },
      precLabel: 'Precision',
      rtolLabel: 'Relative tolerance rtol', atolLabel: 'Absolute tolerance atol',
      bRun: '▶ Compare step by step', bReset: 'Reset',
      lensLabel: 'Number-line magnifier: A, B, the reference and the tolerance band',
      lens: (h) => `Magnifier width: B ± ${h}`,
      sAK: 'Result of path A', sBK: 'Result of path B',
      sOrdF: (o, prec) => `<b>Added ${o}</b><br>every step is rounded to ${prec}`,
      sDK: 'How far apart the two paths are', sDF: (rel, ulp) => `<b>|A − B|</b>; relative gap = |A − B| ÷ max(|A|, |B|) = ${rel}<br>${ulp}`,
      ulp: (n) => `${n} FP32 steps (ULPs) apart`, ulpMany: 'The numbers are too far apart for ULPs to mean anything', ulpNa: 'ULPs are not counted in FP64 mode',
      sJK: 'Three verdicts on "equal"', sJF: '<b>Allowed error = max(rtol × max(|A|,|B|), atol)</b><br>this is how Python\'s math.isclose does it',
      j: { exact: 'Exact: A == B', absOnly: 'Absolute only: |A−B| ≤ atol', relOnly: 'Relative only', combined: 'Relative + absolute (recommended)' },
      yes: '✓ equal', no: '✗ not equal',
      ready: '<span class="c">$</span> ready. Pick a scenario, then press [ ▶ Compare step by step ]',
      l0: (name, n, prec) => `<span class="c">[scenario]</span> ${name}: ${n} numbers, precision ${prec}`,
      lStep: (who, i, s) => `<span class="m">${who}</span> step ${i}, running sum = ${s}`,
      lSkip: (k) => `<span class="m">…</span> ${k} more steps in between`,
      lPair: (who, n, r) => `<span class="m">${who}</span> in pairs: add neighbors first, then add those sums in pairs, ${r} rounds in all (${n} numbers)`,
      lLit: (who, v) => `<span class="m">${who}</span> writes 0.3 directly, stored as ${v}`,
      lRes: (who, v) => `<span class="w">${who} result</span> = ${v}`,
      lDiff: (d, ref) => `<span class="y">difference</span> |A − B| = ${d}; double-precision reference = ${ref}`,
      lJudge: (e, c) => `<span class="c">verdict</span> exact equality says: ${e}; relative + absolute tolerance says: ${c}`,
      same: 'same', diff: 'different',
      vExactLuck: 'The two paths happened to produce the very same number. Do not celebrate yet: that is luck. A different precision or order can break it; try "0.1 + 0.2 vs 0.3" in FP64.',
      vTolOk: 'Exact comparison says "different", but the gap falls inside the tolerance you set, so by that standard the two paths are "the same". A test written with <code>==</code> would report this order difference as a bug.',
      vTolBad: 'The gap is bigger than the tolerance. Either the tolerance is too tight, or one path really lost information, as in "Big swallows small". Look at the double-precision reference: which result is closer to it?',
      vNearZero: '<br>Also note: relative tolerance alone says "not equal", but adding an absolute tolerance says "equal". Near 0, relative error is distorted, and you need an absolute tolerance as a floor.',
      try: [
        'Pick "0.1 + 0.2 vs 0.3" and switch between <b>FP32</b> and <b>FP64</b>: equal in FP32, not equal in FP64. Whether they match depends on luck, not on "computed correctly".',
        'Pick "Big swallows small": A gets 1, B gets 0, and the right answer is 2. Both paths lost information, in different ways. No tolerance can fix a problem in the algorithm itself.',
        'Pick "Result near 0" and drag atol to <b>0</b>: even the relative + absolute verdict fails. Set atol back to 10⁻⁶ and it passes. Comparisons near 0 need an absolute tolerance.',
      ],

      mCode: 'MUTANT_HUNT', mTitle: 'Mutation testing: which test catches the bug?', mTag: 'Teaching estimate · 48-layer toy model',
      mIntro: 'A 48-layer toy model: in every layer, 4 "experts" each multiply by a coefficient, the results are summed by routing weight, and the residual is added back. There are 4 versions: 1 correct one that adds in a different order, and 3 that each hide a bug. Pick a version, press <b>Run all tests</b>, and see which of the 5 tests sound the alarm.',
      mLgCaught: 'Alarm, and rightly so (bug caught)', mLgMissed: 'No alarm when there should be one (bug missed), or a false alarm on correct code', mLgQuiet: 'Correct code, test passes quietly',
      tests: ['Smoke', 'Weak unit', 'Strong unit', 'Diff · exact', 'Diff · tol.'],
      testDesc: {
        smoke: 'Smoke test: run all 48 layers; the output is finite and not 0',
        weakUnit: 'Weak unit test: 1 expert, weight 1.0, input 2, expect 2',
        strongUnit: 'Strong unit test: 2 experts, weights 0.7 / 0.3, inputs 1 / 3, expect 1.6 (tolerance 10⁻⁶)',
        diffExact: 'Differential test (exact): compare the output after 48 layers with the reference; it must match bit for bit',
        diffTol: 'Differential test (tolerance): compare with the reference, allowing rtol = 10⁻⁵, atol = 10⁻⁶',
      },
      vars: { ok: 'Correct (reordered sum)', w2: 'Bug: weight twice', drop: 'Bug: skip an expert', stale: 'Bug: stale input' },
      varDesc: {
        ok: 'Correct: adds each expert\'s contribution straight into the residual, starting from the last expert. Mathematically identical to the reference.',
        w2: 'Bug: the routing weight is applied twice, so w becomes w². Strata\'s interface comments warn about exactly this.',
        drop: 'Bug: the loop runs one time too few and skips the last expert. The classic off-by-one error.',
        stale: 'Bug: every layer computes its experts from layer 0\'s input. It is like caching, by address, a buffer whose contents change in every layer.',
      },
      gridLabel: 'Results of 4 versions × 5 tests',
      cellPass: 'pass', cellFail: 'alarm', cellTodo: '—',
      bRunAll: '▶ Run all tests', bClear: 'Clear table',
      mReady: '<span class="c">$</span> ready. Pick a version, then press [ ▶ Run all tests ]',
      mStart: (name) => `<span class="c">[version]</span> ${name}`,
      mLine: (desc, pass, got, want) => `<span class="m">${desc}</span><br>&nbsp;&nbsp;got ${got}${want === null ? '' : ', expected ' + want} → ${pass ? '<span class="w">pass</span>' : '<span class="y">alarm</span>'}`,
      sOutK: 'Output after 48 layers: this version vs the reference', sOutF: (rel) => `<b>relative gap = ${rel}</b><br>in each layer the reference first sums the 4 weighted experts, then adds that to the residual`,
      sScoreK: 'Mutation score (share of the bug versions run so far that at least one test caught)', sScoreF: (c, n) => `<b>= bug versions caught ÷ bug versions run = ${c} ÷ ${n}</b>`,
      sColK: 'Each test\'s record (bugs caught / false alarms)',
      colLine: (name, c, n, fa) => `${name}: caught ${c}/${n}${fa ? ', 1 false alarm' : ''}`,
      mVerdictRow: {
        ok: 'This is the correct version. Only "Diff · exact" raised an alarm: changing the order of addition changed the last few digits. That is a false alarm.',
        w2: '"Weight twice" fooled the smoke test and the weak unit test: when the weight happens to be 1.0, 1.0² is still 1.0. The strong unit test used 0.7 and 0.3 and caught it at once.',
        drop: 'Even the weak unit test catches a skipped expert. Yet the smoke test still passes: the output is still a "normal-looking" number.',
        stale: 'The "stale input" bug is not inside the weighted-sum function, so neither unit test can catch it. Only a differential test that compares the full 48-layer path finds it.',
      },
      mVerdictAll: 'All four rows are done. The smoke test caught no bug at all; each unit test has blind spots; the exact differential test caught everything but also blamed the correct version; the differential test with a tolerance caught all 3 bugs with no false alarm. A good test does two things at once: it fails on planted bugs and passes on legitimate numerical differences.',
      mTry: [
        'Run <b>Bug: weight twice</b> first: the smoke test and the weak unit test both pass. Think: why can a test that uses weight 1.0 not see this bug?',
        'Then run <b>Correct (reordered sum)</b>: only "Diff · exact" raises an alarm. That is a floating-point false alarm; Section 26.3 explains why.',
        'Finally run <b>Bug: stale input</b>: both unit tests pass, and only the full-path differential test catches it. Unit tests alone are not enough.',
      ],
    },
  });

  async function guardRun(el, ctx, state, fn) {
    if (state.busy) return;
    state.busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { if (ctx.alive) throw e; }
    state.busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
  }
  const pick = (btns, i) => btns.forEach((b, j) => { b.classList.toggle('alt', j === i); b.classList.toggle('ghost', j !== i); b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });

  Viz.register('tolerance-lab', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgA, glow: true },
        { color: 'var(--a2)', text: T.lgB },
        { color: 'var(--a3)', text: T.lgRef },
        { color: 'var(--frame)', text: T.lgBand },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      const ids = M.SCENARIOS.map(s => s.id);
      body.insertAdjacentHTML('beforeend',
        `<div class="viz-row tl-scen">${ids.map(id => Viz.button(T.scen[id], 'ghost')).join('')}</div>
         <p class="tl-desc" style="margin:10px 0 0;font-size:14px;color:var(--muted)"></p>
         <div class="viz-row tl-prec"><span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${T.precLabel}</span>${Viz.button('FP32', 'ghost')}${Viz.button('FP64', 'ghost')}</div>
         <div class="viz-slider"><label>${T.rtolLabel}</label><input class="tl-r" type="range" min="0" max="${RTOLS.length - 1}" value="5" aria-label="${Viz.esc(T.rtolLabel)}"><output class="tl-ro"></output></div>
         <div class="viz-slider"><label>${T.atolLabel}</label><input class="tl-a" type="range" min="0" max="${ATOLS.length - 1}" value="7" aria-label="${Viz.esc(T.atolLabel)}"><output class="tl-ao"></output></div>
         <div class="viz-cols" style="margin-top:14px"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 300 132', class: 'viz-stage', role: 'img', 'aria-label': T.lensLabel }, left);
      const band = Viz.svg('rect', { x: 0, y: 34, width: 0, height: 44, style: 'fill:var(--frame);opacity:.55' }, svg);
      Viz.svg('path', { d: 'M10 56H290', style: 'stroke:var(--muted);stroke-width:1;fill:none' }, svg);
      const mk = (cls, color, label, y) => {
        const g = Viz.svg('g', { class: cls }, svg);
        Viz.svg('path', { d: 'M0 40V72', style: `stroke:${color};stroke-width:3;fill:none` }, g);
        const t = Viz.svg('text', { x: 0, y, 'text-anchor': 'middle', 'font-size': 14, style: `fill:${color}` }, g);
        t.textContent = label;
        return g;
      };
      const gA = mk('tl-ma', 'var(--accent)', 'A', 28), gB = mk('tl-mb', 'var(--a2)', 'B', 90), gR = mk('tl-mr', 'var(--a3)', '★', 108);
      const lensTxt = Viz.svg('text', { x: 150, y: 126, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:var(--muted)' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bRun)}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'tl-a', k: T.sAK, v: '—', f: '' }) +
        Viz.stat({ id: 'tl-b', k: T.sBK, v: '—', f: '' }) +
        Viz.stat({ id: 'tl-d', k: T.sDK, v: '—', f: '', hot: true }) +
        `<div class="viz-stat"><div class="k">${T.sJK}</div><div class="tl-j" style="font-family:var(--mono);font-size:12.5px;line-height:1.9;margin-top:4px"></div><div class="f">${T.sJF}</div></div>`;
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const scenBtns = [...el.querySelectorAll('.tl-scen .viz-btn')], precBtns = [...el.querySelectorAll('.tl-prec .viz-btn')];
      const runBtn = left.querySelectorAll('.viz-btn')[0], resetBtn = left.querySelectorAll('.viz-btn')[1];
      const state = { busy: false, scen: 'tenths', prec: 'f32' };
      const tol = () => ({ rtol: RTOLS[+$('.tl-r').value], atol: ATOLS[+$('.tl-a').value] });

      function compute() { return M.runScenario(state.scen, state.prec); }
      function paint(r, show) {
        const { rtol, atol } = tol();
        $('.tl-ro').textContent = sci(rtol); $('.tl-ao').textContent = sci(atol);
        const sc = M.SCENARIOS.find(s => s.id === state.scen);
        $('.tl-desc').innerHTML = T.scenDesc[state.scen];
        const precName = state.prec === 'f32' ? 'FP32' : 'FP64';
        $('[data-s=tl-a-f]').innerHTML = T.sOrdF(T.order[sc.a], precName);
        $('[data-s=tl-b-f]').innerHTML = sc.b === 'literal' ? T.order.literal : T.sOrdF(T.order[sc.b], precName);
        const A = r.a.value, B = r.b.value, d = Math.abs(A - B), mx = Math.max(Math.abs(A), Math.abs(B));
        const allowed = Math.max(rtol * mx, atol);
        const j = M.judge(A, B, rtol, atol);
        $('[data-s=tl-a-v]').textContent = show.a ? fullNum(A) : '—';
        $('[data-s=tl-b-v]').textContent = show.b ? fullNum(B) : '—';
        const ulp = state.prec === 'f64' ? T.ulpNa : (M.ulpF32(A, B) > 1e6 ? T.ulpMany : T.ulp(M.ulpF32(A, B)));
        $('[data-s=tl-d-v]').textContent = show.d ? sci(d) : '—';
        $('[data-s=tl-d-f]').innerHTML = T.sDF(show.d ? sci(mx ? d / mx : 0) : '—', show.d ? ulp : '');
        $('.tl-j').innerHTML = show.j ? Object.keys(T.j).map(k => `<div>${j[k] ? '<b style="color:var(--accent)">' + T.yes + '</b>' : '<b style="color:var(--a2)">' + T.no + '</b>'}　${T.j[k]}</div>`).join('') : '—';
        // number-line lens centred on B
        const h = Math.max(d * 1.6, allowed * 1.25, Math.abs(r.ref - B) * 1.3, Math.abs(B) * 1e-16, 1e-30);
        const X = v => Math.max(10, Math.min(290, 150 + (v - B) / h * 135));
        const bw = Math.min(282, allowed / h * 270);
        band.setAttribute('x', 150 - bw / 2); band.setAttribute('width', bw);
        gA.setAttribute('transform', `translate(${X(A)},0)`); gA.style.opacity = show.a ? 1 : 0;
        gB.setAttribute('transform', `translate(${X(B)},0)`); gB.style.opacity = show.b ? 1 : 0;
        gR.setAttribute('transform', `translate(${X(r.ref)},0)`); gR.style.opacity = show.d ? 1 : 0;
        lensTxt.textContent = T.lens(sci(h));
        return { A, B, d, j };
      }
      function verdict(r, j) {
        const v = $('.viz-verdict');
        let html = j.exact ? T.vExactLuck : (j.combined ? T.vTolOk : T.vTolBad);
        if (!j.relOnly && j.absOnly) html += T.vNearZero;
        v.innerHTML = html; v.hidden = false;
      }
      function select() {
        pick(scenBtns, M.SCENARIOS.findIndex(s => s.id === state.scen));
        pick(precBtns, state.prec === 'f32' ? 0 : 1);
        $('.viz-verdict').hidden = true; pipe.set(0);
        paint(compute(), { a: false, b: false, d: false, j: false });
      }
      async function logPath(who, order, res, n) {
        if (order === 'literal') { term.log(T.lLit(who, fullNum(res.value))); return; }
        if (order === 'pairwise') { term.log(T.lPair(who, n, Math.ceil(Math.log2(Math.max(n, 2))))); await ctx.sleep(260); return; }
        const p = res.partials, show = p.length <= 6 ? p.map((s, i) => i) : [0, 1, 2, p.length - 1];
        for (let k = 0; k < show.length; k++) {
          if (k > 0 && show[k] - show[k - 1] > 1) term.log(T.lSkip(show[k] - show[k - 1] - 1));
          term.log(T.lStep(who, show[k] + 1, fullNum(p[show[k]])));
          await ctx.sleep(220);
        }
      }
      runBtn.onclick = () => guardRun(el, ctx, state, async () => {
        const r = compute(), sc = M.SCENARIOS.find(s => s.id === state.scen);
        term.clear(); $('.viz-verdict').hidden = true;
        pipe.set(0); term.log(T.l0(T.scen[state.scen], r.n, state.prec === 'f32' ? 'FP32' : 'FP64')); await ctx.sleep(300);
        pipe.set(1); await logPath('A', sc.a, r.a, r.n); term.log(T.lRes('A', fullNum(r.a.value))); paint(r, { a: true }); await ctx.sleep(300);
        pipe.set(2); await logPath('B', sc.b, r.b, r.n); term.log(T.lRes('B', fullNum(r.b.value))); paint(r, { a: true, b: true }); await ctx.sleep(300);
        pipe.set(3); const out = paint(r, { a: true, b: true, d: true }); term.log(T.lDiff(sci(out.d), fullNum(r.ref))); await ctx.sleep(300);
        pipe.set(4); const fin = paint(r, { a: true, b: true, d: true, j: true });
        term.log(T.lJudge(fin.j.exact ? T.same : T.diff, fin.j.combined ? T.same : T.diff));
        verdict(r, fin.j);
      });
      resetBtn.onclick = () => guardRun(el, ctx, state, async () => { term.clear(); term.log(T.ready); pipe.set(-1); select(); pipe.set(-1); });
      scenBtns.forEach((b, i) => { b.onclick = () => { if (!state.busy) { state.scen = ids[i]; select(); } }; });
      precBtns.forEach((b, i) => { b.onclick = () => { if (!state.busy) { state.prec = i ? 'f64' : 'f32'; select(); } }; });
      const live = () => { if (state.busy) return; const shown = !$('.viz-verdict').hidden; const r = compute(); const out = paint(r, { a: shown, b: shown, d: shown, j: shown }); if (shown) verdict(r, out.j); };
      $('.tl-r').oninput = live; $('.tl-a').oninput = live;
      select(); pipe.set(-1);
    },
  });

  Viz.register('test-mutants', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.mCode, title: T.mTitle, tag: T.mTag, intro: T.mIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.mLgCaught, glow: true },
        { color: 'var(--a2)', text: T.mLgMissed },
        { color: 'var(--frame)', text: T.mLgQuiet },
      ]));
      const pipe = Viz.pipe(body, T.tests);
      body.insertAdjacentHTML('beforeend',
        `<div class="viz-row tm-vars">${M.MUTANTS.map(v => Viz.button(T.vars[v], 'ghost')).join('')}</div>
         <p class="tm-desc" style="margin:10px 0 0;font-size:14px;color:var(--muted)"></p>
         <div class="viz-cols" style="margin-top:14px"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const cols = M.TESTS.length;
      left.insertAdjacentHTML('beforeend', `<div class="tm-grid" role="table" aria-label="${Viz.esc(T.gridLabel)}" style="display:grid;grid-template-columns:minmax(0,1.6fr) repeat(${cols},minmax(0,1fr));gap:3px;font-family:var(--mono);font-size:12px;line-height:1.35">
        <div></div>${T.tests.map(t => `<div style="color:var(--muted);text-align:center;padding:4px 2px">${t}</div>`).join('')}
        ${M.MUTANTS.map(v => `<div style="color:var(--ink);padding:6px 4px;border:1px solid var(--frame)">${T.vars[v]}</div>${M.TESTS.map(t => `<div data-c="${v}-${t}" style="text-align:center;padding:6px 2px;border:1px solid var(--frame);color:var(--muted)">${T.cellTodo}</div>`).join('')}`).join('')}
      </div>
      <div class="viz-row">${Viz.button(T.bRunAll)}${Viz.button(T.bClear, 'ghost')}</div>`);
      const term = Viz.term(left, T.mReady);
      right.innerHTML =
        Viz.stat({ id: 'tm-out', k: T.sOutK, v: '—', f: T.sOutF('—') }) +
        Viz.stat({ id: 'tm-score', k: T.sScoreK, v: '—', f: T.sScoreF(0, 0), hot: true }) +
        `<div class="viz-stat"><div class="k">${T.sColK}</div><div class="tm-cols" style="font-family:var(--mono);font-size:12px;line-height:1.85;margin-top:4px">—</div></div>`;
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.mTry) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const varBtns = [...el.querySelectorAll('.tm-vars .viz-btn')];
      const [runBtn, clearBtn] = left.querySelectorAll('.viz-btn');
      const state = { busy: false, v: 'w2', done: {} };
      const fmt = x => (typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toPrecision(9)) : String(x));

      function paintCell(v, t, pass) {
        const c = $(`[data-c="${v}-${t}"]`), bug = v !== 'ok';
        const good = bug ? !pass : pass;
        c.textContent = pass ? T.cellPass : T.cellFail;
        c.style.background = good ? (bug ? 'color-mix(in srgb,var(--accent) 22%,transparent)' : 'transparent') : 'color-mix(in srgb,var(--a2) 22%,transparent)';
        c.style.color = good ? (bug ? 'var(--accent)' : 'var(--muted)') : 'var(--a2)';
        c.style.fontWeight = good && !bug ? '400' : '700';
      }
      function stats() {
        const bugs = M.MUTANTS.filter(v => v !== 'ok' && state.done[v]);
        const caught = bugs.filter(v => state.done[v].some(t => !t.pass)).length;
        $('[data-s=tm-score-v]').textContent = bugs.length ? Math.round(caught / bugs.length * 100) + '%' : '—';
        $('[data-s=tm-score-f]').innerHTML = T.sScoreF(caught, bugs.length);
        $('.tm-cols').innerHTML = Object.keys(state.done).length ? M.TESTS.map((t, i) => {
          const c = bugs.filter(v => !state.done[v][i].pass).length;
          const fa = state.done.ok && !state.done.ok[i].pass;
          return `<div>${T.colLine(T.tests[i], c, bugs.length, fa)}</div>`;
        }).join('') : '—';
      }
      function choose(v) {
        state.v = v; pick(varBtns, M.MUTANTS.indexOf(v));
        $('.tm-desc').innerHTML = T.varDesc[v];
      }
      runBtn.onclick = () => guardRun(el, ctx, state, async () => {
        const v = state.v, res = M.runTests(v), ref = M.runModel('ref').final, got = M.runModel(v).final;
        term.clear(); term.log(T.mStart(T.vars[v])); $('.viz-verdict').hidden = true;
        M.TESTS.forEach(t => { const c = $(`[data-c="${v}-${t}"]`); c.textContent = T.cellTodo; c.style.background = 'transparent'; c.style.color = 'var(--muted)'; });
        for (let i = 0; i < res.length; i++) {
          pipe.set(i);
          await ctx.sleep(380);
          const r = res[i];
          term.log(T.mLine(T.testDesc[r.id], r.pass, fmt(r.got), r.want === null ? null : fmt(r.want)));
          paintCell(v, r.id, r.pass);
        }
        pipe.set(res.length);
        state.done[v] = res;
        $('[data-s=tm-out-v]').textContent = `${got.toPrecision(9)} vs ${ref.toPrecision(9)}`;
        $('[data-s=tm-out-f]').innerHTML = T.sOutF(sci(Math.abs(got - ref) / Math.abs(ref)));
        stats();
        const all = M.MUTANTS.every(x => state.done[x]);
        const vd = $('.viz-verdict');
        vd.innerHTML = T.mVerdictRow[v] + (all ? '<br><br>' + T.mVerdictAll : '');
        vd.hidden = false;
      });
      clearBtn.onclick = () => guardRun(el, ctx, state, async () => {
        state.done = {};
        el.querySelectorAll('[data-c]').forEach(c => { c.textContent = T.cellTodo; c.style.background = 'transparent'; c.style.color = 'var(--muted)'; c.style.fontWeight = '400'; });
        $('[data-s=tm-out-v]').textContent = '—'; $('[data-s=tm-out-f]').innerHTML = T.sOutF('—');
        $('.viz-verdict').hidden = true; pipe.set(-1); term.clear(); term.log(T.mReady); stats();
      });
      varBtns.forEach((b, i) => { b.onclick = () => { if (!state.busy) choose(M.MUTANTS[i]); }; });
      choose('w2'); pipe.set(-1);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
