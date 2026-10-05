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
    ar: {
      code: 'FLOAT_EQ', title: 'منصة مقارنة الأعداد العشرية', tag: 'تقدير تعليمي · يُحسب فعلًا في المتصفح',
      intro: 'نجمع الأعداد نفسها بمسارين: <b>المسار A</b> و<b>المسار B</b>، كما يحسب CPU وGPU الخبير نفسه بترتيبين مختلفين. اختر سيناريو، واضغط <b>قارن خطوة خطوة</b>، ثم حرّك منزلقي التسامح، وانظر كيف تعطي ثلاثة معايير لـ«التساوي» إجابات مختلفة.',
      lgA: 'نتيجة المسار A', lgB: 'نتيجة المسار B', lgRef: 'المرجع بدقة مزدوجة (مجموع المدخلات محسوبًا بـ FP64)', lgBand: 'نطاق التسامح: كم يقرب من B ليُعدّ «مثله»',
      steps: ['اختيار السيناريو', 'المسار A يجمع', 'المسار B يجمع', 'حساب الفرق', 'ثلاثة معايير'],
      scen: { tenths: '0.1 + 0.2 و0.3', swamp: 'الكبير يبتلع الصغير', drift: '1000 مرة 0.1', dot: 'ضرب نقطي ببعد 256', nearzero: 'نتيجة قرب 0' },
      scenDesc: {
        tenths: 'A: 0.1 + 0.2؛ B: كتابة 0.3 مباشرة.',
        swamp: 'أربعة أعداد [100M, 1, −100M, 1]. A من اليسار إلى اليمين؛ وB أزواجًا (مثل الاختزال الشجري في GPU).',
        drift: 'نجمع 0.1 ألف مرة. A من اليسار إلى اليمين؛ وB أزواجًا.',
        dot: 'مجموعتان من 256 عددًا عشوائيًّا يُضرب كل زوج ثم تُجمع النواتج، كأننا نحسب logit. A من اليسار إلى اليمين؛ وB أزواجًا.',
        nearzero: 'أربعة أعداد [1, 2×10⁻⁸, −1, 2×10⁻⁸]. A من اليسار إلى اليمين؛ وB من اليمين إلى اليسار.',
      },
      order: { forward: 'من اليسار إلى اليمين', reverse: 'من اليمين إلى اليسار', pairwise: 'أزواجًا', literal: 'كتابة مباشرة' },
      precLabel: 'الدقة',
      rtolLabel: 'التسامح النسبي rtol', atolLabel: 'التسامح المطلق atol',
      bRun: '▶ قارن خطوة خطوة', bReset: 'إعادة',
      lensLabel: 'عدسة على المحور العددي: A وB والمرجع ونطاق التسامح',
      lens: (h) => `عرض العدسة: B ± ${h}`,
      sAK: 'نتيجة المسار A', sBK: 'نتيجة المسار B',
      sOrdF: (o, prec) => `<b>الجمع بترتيب «${o}»</b><br>مع كل خطوة جمع تُقرَّب النتيجة إلى ${prec}`,
      sDK: 'كم يبعد المساران', sDF: (rel, ulp) => `<b>|A − B|</b>؛ الفرق النسبي = |A − B| ÷ max(|A|, |B|) = ${rel}<br>${ulp}`,
      ulp: (n) => `الفرق ${n} من تدريجات FP32 (ULP)`, ulpMany: 'العددان متباعدان جدًّا، فلا معنى لـ ULP', ulpNa: 'في وضع FP64 لا يُحسب ULP',
      sJK: 'ثلاثة معايير لـ«التساوي»', sJF: '<b>الخطأ المسموح = max(rtol × max(|A|,|B|), atol)</b><br>هذه صيغة math.isclose في Python',
      j: { exact: 'تساوٍ دقيق A == B', absOnly: 'التسامح المطلق فقط |A−B| ≤ atol', relOnly: 'التسامح النسبي فقط', combined: 'نسبي + مطلق (الموصى به)' },
      yes: '✓ متساويان', no: '✗ مختلفان',
      ready: '<span class="c">$</span> ready. اختر سيناريو واضغط [ ▶ قارن خطوة خطوة ]',
      l0: (name, n, prec) => `<span class="c">[سيناريو]</span> ${name}: ${n} من الأعداد، والدقة ${prec}`,
      lStep: (who, i, s) => `<span class="m">${who}</span> الخطوة ${i}، المجموع التراكمي = ${s}`,
      lSkip: (k) => `<span class="m">…</span> وبينهما ${k} من الخطوات`,
      lPair: (who, n, r) => `<span class="m">${who}</span> أزواجًا: يُجمع كل عددين متجاورين أولًا، ثم تُجمع النتائج أزواجًا، في ${r} من الجولات (${n} من الأعداد)`,
      lLit: (who, v) => `<span class="m">${who}</span> كتابة 0.3 مباشرة، وتُخزَّن ${v}`,
      lRes: (who, v) => `<span class="w">نتيجة ${who}</span> = ${v}`,
      lDiff: (d, ref) => `<span class="y">الفرق</span> |A − B| = ${d}؛ المرجع بدقة مزدوجة = ${ref}`,
      lJudge: (e, c) => `<span class="c">المعيار</span> التساوي الدقيق يقول: ${e}؛ والتسامح النسبي + المطلق يقول: ${c}`,
      same: 'متساويان', diff: 'مختلفان',
      vExactLuck: 'المساران حسبا العدد نفسه تمامًا. لا تفرح مبكرًا: هذه صدفة. غيّر الدقة أو الترتيب فقد يختلفان؛ جرّب «0.1 + 0.2 و0.3» في FP64.',
      vTolOk: 'المقارنة الدقيقة تقول «مختلفان»، لكن الفرق يقع ضمن التسامح الذي ضبطته: بهذا المعيار المساران «متساويان». ولو كُتب الاختبار بـ <code>==</code> لعُدّ فرق الترتيب هذا علّة.',
      vTolBad: 'الفرق تجاوز التسامح. إما أن التسامح ضيق جدًّا، وإما أن أحد المسارين فقد معلومات فعلًا، مثل «الكبير يبتلع الصغير». انظر إلى المرجع بدقة مزدوجة: أيهما أقرب إليه؟',
      vNearZero: '<br>وانتبه أيضًا: بالتسامح النسبي وحده الحكم «مختلفان»، ومع إضافة المطلق الحكم «متساويان». إذا اقتربت النتيجة من 0 تشوه الخطأ النسبي، ويلزم تسامح مطلق يسنده.',
      try: [
        'اختر «0.1 + 0.2 و0.3» وبدّل بين <b>FP32</b> و<b>FP64</b>: في FP32 يتساويان تمامًا، وفي FP64 لا. فالتساوي يتوقف على الصدفة لا على «هل الحساب صحيح».',
        'اختر «الكبير يبتلع الصغير»: A يعطي 1، وB يعطي 0، والصحيح 2. كلا المسارين فقد معلومات، وبطريقتين مختلفتين. وهذا يبيّن أن التسامح لا ينقذ مشكلة في الخوارزمية نفسها.',
        'اختر «نتيجة قرب 0» وأنزل atol إلى <b>0</b>: فيفشل أيضًا معيار نسبي + مطلق. ثم أعد atol إلى 10⁻⁶: ينجح. فالمقارنة قرب الصفر لا بد فيها من تسامح مطلق.',
      ],

      mCode: 'MUTANT_HUNT', mTitle: 'اختبار الطفرات: أي اختبار يلتقط العلّة', mTag: 'تقدير تعليمي · نموذج لعبة من 48 طبقة',
      mIntro: 'نموذج لعبة من 48 طبقة: في كل طبقة 4 «خبراء» يضرب كل منهم في معامل، ثم تُجمع النواتج بأوزان الموجِّه، ثم يُضاف الباقي (residual). جهّزنا 4 نسخ: واحدة صحيحة لكن بترتيب جمع آخر، وثلاث في كل منها علّة مخفية. اختر نسخة واضغط <b>شغّل كل الاختبارات</b>، وانظر من يطلق الإنذار من الاختبارات الخمسة.',
      mLgCaught: 'أطلق الإنذار وكان عليه أن يطلقه (التقط العلّة)', mLgMissed: 'كان عليه أن يطلق الإنذار فلم يفعل (فاتته العلّة)، أو أطلقه على تنفيذ صحيح', mLgQuiet: 'تنفيذ صحيح، والاختبار ينجح بهدوء',
      tests: ['اختبار الدخان', 'وحدة ضعيف', 'وحدة قوي', 'فرق · دقيق', 'فرق · تسامح'],
      testDesc: {
        smoke: 'اختبار الدخان: يشغّل الطبقات الـ 48، ويشترط أن يكون المخرج عددًا منتهيًا وليس 0',
        weakUnit: 'اختبار وحدة ضعيف: خبير واحد، ووزنه 1.0، والمدخل 2، والمتوقع 2',
        strongUnit: 'اختبار وحدة قوي: خبيران، ووزناهما 0.7 / 0.3، ومدخلاهما 1 / 3، والمتوقع 1.6 (التسامح 10⁻⁶)',
        diffExact: 'اختبار الفرق (تساوٍ دقيق): يقارن مخرج الطبقات الـ 48 بالتنفيذ المرجعي، ويشترط التطابق بتًّا ببت',
        diffTol: 'اختبار الفرق (تسامح): يقارن بالتنفيذ المرجعي، ويسمح بـ rtol = 10⁻⁵ وatol = 10⁻⁶',
      },
      vars: { ok: 'تنفيذ صحيح (بترتيب جمع آخر)', w2: 'علّة: ضرب الوزن مرتين', drop: 'علّة: إسقاط خبير', stale: 'علّة: مدخل قديم لكل طبقة' },
      varDesc: {
        ok: 'تنفيذ صحيح: تُضاف مساهمة كل خبير مباشرة إلى الباقي، وتبدأ من الخبير الأخير. وهو في الرياضيات مطابق تمامًا للتنفيذ المرجعي.',
        w2: 'علّة: وزن الموجِّه ضُرب مرتين، فصار w هو w². وقد حذّر منها تعليق الواجهة في Strata تحديدًا.',
        drop: 'علّة: دارت الحلقة مرة أقل، فسقط الخبير الأخير. وهو خطأ «فرق بواحد» الكلاسيكي.',
        stale: 'علّة: كل طبقة تحسب الخبراء من مدخل الطبقة 0. كأنما خُزّنت بحسب العنوان ذاكرة مؤقتة يتغير محتواها مع كل طبقة.',
      },
      gridLabel: 'جدول نتائج 4 نسخ × 5 اختبارات',
      cellPass: 'نجح', cellFail: 'إنذار', cellTodo: '—',
      bRunAll: '▶ شغّل كل الاختبارات', bClear: 'امسح الجدول',
      mReady: '<span class="c">$</span> ready. اختر نسخة أولًا، ثم اضغط [ ▶ شغّل كل الاختبارات ]',
      mStart: (name) => `<span class="c">[النسخة]</span> ${name}`,
      mLine: (desc, pass, got, want) => `<span class="m">${desc}</span><br>　الناتج ${got}${want === null ? '' : '، والمتوقع ' + want} → ${pass ? '<span class="w">نجح</span>' : '<span class="y">إنذار</span>'}`,
      sOutK: 'المخرج بعد 48 طبقة: هذه النسخة مقابل المرجع', sOutF: (rel) => `<b>الفرق النسبي = ${rel}</b><br>المرجع: في كل طبقة يُجمع الخبراء الأربعة موزونين أولًا، ثم يُضاف المجموع إلى الباقي`,
      sScoreK: 'درجة الطفرات (من نسخ العلل التي شُغّلت، نسبة ما التقطه اختبار واحد على الأقل)', sScoreF: (c, n) => `<b>= نسخ العلل الملتقطة ÷ نسخ العلل المشغَّلة = ${c} ÷ ${n}</b>`,
      sColK: 'سجل كل اختبار (التقط علّة / إنذار كاذب)',
      colLine: (name, c, n, fa) => `${name}: التقط ${c}/${n}${fa ? '، وإنذار كاذب مرة واحدة' : ''}`,
      mVerdictRow: {
        ok: 'هذا هو التنفيذ الصحيح. لم يطلق الإنذار إلا «فرق · دقيق»: تغير ترتيب الجمع فتغيرت آخر الخانات. هذا إنذار كاذب.',
        w2: '«ضرب الوزن مرتين» خدع اختبار الدخان واختبار الوحدة الضعيف: حين يكون الوزن 1.0 فمربعه 1.0. أما اختبار الوحدة القوي فاستخدم 0.7 و0.3، فالتقطه فورًا.',
        drop: 'إسقاط خبير يلتقطه حتى اختبار الوحدة الضعيف. لكن اختبار الدخان ينجح مع ذلك: فالمخرج ما زال عددًا «يبدو سليمًا».',
        stale: 'علّة «مدخل قديم لكل طبقة» ليست في دالة الجمع الموزون، فلا يلتقطها اختبارا الوحدة. وإنما يكشفها اختبار الفرق الذي يقارن المسار كله بطبقاته الـ 48.',
      },
      mVerdictAll: 'اكتملت الصفوف الأربعة. اختبار الدخان لم يلتقط علّة واحدة؛ واختبارات الوحدة لكل منها نقطة عمى؛ واختبار الفرق الدقيق التقط الكل لكنه ظلم التنفيذ الصحيح؛ واختبار الفرق مع التسامح التقط العلل الثلاث كلها بلا إنذار كاذب. الاختبار الجيد يجب أن يحقق أمرين معًا: أن يفشل أمام العلل المحقونة، وأن ينجح أمام الفروق العددية المشروعة.',
      mTry: [
        'شغّل أولًا <b>علّة: ضرب الوزن مرتين</b>: ينجح اختبار الدخان واختبار الوحدة الضعيف. فكّر: لماذا لا يرى اختبار وزنه 1.0 هذه العلّة؟',
        'ثم شغّل <b>التنفيذ الصحيح</b>: لا ينذر إلا «فرق · دقيق». هذا إنذار كاذب عشري، وقد شرحنا في القسم 26.3 لماذا.',
        'وأخيرًا شغّل <b>علّة: مدخل قديم لكل طبقة</b>: ينجح اختبارا الوحدة، ولا يلتقطها إلا اختبار الفرق على المسار كله. وهذا يبيّن أن اختبارات الوحدة وحدها لا تكفي.',
      ],
    },
    es: {
      code: 'FLOAT_EQ', title: 'Banco de comparación de flotantes', tag: 'Estimación didáctica · se calcula en vivo en tu navegador',
      intro: 'Suma los mismos números por dos caminos, el <b>camino A</b> y el <b>camino B</b>, igual que una CPU y una GPU calculan el mismo experto en órdenes distintos. Elige un escenario, pulsa <b>Comparar paso a paso</b>, arrastra después los dos deslizadores de tolerancia y mira cómo tres definiciones de «igual» dan respuestas distintas.',
      lgA: 'Resultado del camino A', lgB: 'Resultado del camino B', lgRef: 'Referencia de doble precisión (las entradas sumadas en FP64)', lgBand: 'Banda de tolerancia: cuán cerca de B cuenta como «lo mismo»',
      steps: ['Elegir escenario', 'Suma del camino A', 'Suma del camino B', 'Calcular la diferencia', 'Tres veredictos'],
      scen: { tenths: '0.1 + 0.2 frente a 0.3', swamp: 'El grande se traga al pequeño', drift: '1000 × 0.1', dot: 'Producto punto de 256 dim.', nearzero: 'Resultado cerca de 0' },
      scenDesc: {
        tenths: 'A: 0.1 + 0.2; B: escribe 0.3 directamente.',
        swamp: 'Cuatro números [100M, 1, −100M, 1]. A va de izquierda a derecha; B suma por parejas (como una reducción en árbol de la GPU).',
        drift: 'Suma 0.1 mil veces. A va de izquierda a derecha; B suma por parejas.',
        dot: 'Dos listas de 256 números aleatorios, multiplicadas elemento a elemento y sumadas, como al calcular un logit. A va de izquierda a derecha; B suma por parejas.',
        nearzero: 'Cuatro números [1, 2×10⁻⁸, −1, 2×10⁻⁸]. A va de izquierda a derecha; B va de derecha a izquierda.',
      },
      order: { forward: 'de izquierda a derecha', reverse: 'de derecha a izquierda', pairwise: 'por parejas', literal: 'escrito directamente' },
      precLabel: 'Precisión',
      rtolLabel: 'Tolerancia relativa rtol', atolLabel: 'Tolerancia absoluta atol',
      bRun: '▶ Comparar paso a paso', bReset: 'Reiniciar',
      lensLabel: 'Lupa sobre la recta numérica: A, B, la referencia y la banda de tolerancia',
      lens: (h) => `Ancho de la lupa: B ± ${h}`,
      sAK: 'Resultado del camino A', sBK: 'Resultado del camino B',
      sOrdF: (o, prec) => `<b>Sumado ${o}</b><br>cada paso se redondea a ${prec}`,
      sDK: 'Cuánto se separan los dos caminos', sDF: (rel, ulp) => `<b>|A − B|</b>; diferencia relativa = |A − B| ÷ max(|A|, |B|) = ${rel}<br>${ulp}`,
      ulp: (n) => `separados por ${n} pasos de FP32 (ULP)`, ulpMany: 'Los números están demasiado lejos para que los ULP signifiquen algo', ulpNa: 'En modo FP64 no se cuentan los ULP',
      sJK: 'Tres veredictos sobre «igual»', sJF: '<b>Error permitido = max(rtol × max(|A|,|B|), atol)</b><br>así lo hace math.isclose de Python',
      j: { exact: 'Exacto: A == B', absOnly: 'Solo absoluto: |A−B| ≤ atol', relOnly: 'Solo relativo', combined: 'Relativo + absoluto (recomendado)' },
      yes: '✓ igual', no: '✗ distinto',
      ready: '<span class="c">$</span> ready. Elige un escenario y pulsa [ ▶ Comparar paso a paso ]',
      l0: (name, n, prec) => `<span class="c">[escenario]</span> ${name}: ${n} números, precisión ${prec}`,
      lStep: (who, i, s) => `<span class="m">${who}</span> paso ${i}, suma acumulada = ${s}`,
      lSkip: (k) => `<span class="m">…</span> ${k} pasos más en medio`,
      lPair: (who, n, r) => `<span class="m">${who}</span> por parejas: se suman primero los vecinos y luego esas sumas por parejas, ${r} rondas en total (${n} números)`,
      lLit: (who, v) => `<span class="m">${who}</span> escribe 0.3 directamente, guardado como ${v}`,
      lRes: (who, v) => `<span class="w">Resultado de ${who}</span> = ${v}`,
      lDiff: (d, ref) => `<span class="y">diferencia</span> |A − B| = ${d}; referencia de doble precisión = ${ref}`,
      lJudge: (e, c) => `<span class="c">veredicto</span> la igualdad exacta dice: ${e}; la tolerancia relativa + absoluta dice: ${c}`,
      same: 'igual', diff: 'distinto',
      vExactLuck: 'Los dos caminos produjeron por casualidad el mismo número. No cantes victoria: es suerte. Otra precisión u otro orden pueden romperlo; prueba «0.1 + 0.2 frente a 0.3» en FP64.',
      vTolOk: 'La comparación exacta dice «distinto», pero la diferencia cae dentro de la tolerancia que fijaste, así que con ese criterio los dos caminos son «lo mismo». Una prueba escrita con <code>==</code> informaría de esta diferencia de orden como si fuera un bug.',
      vTolBad: 'La diferencia es mayor que la tolerancia. O la tolerancia es demasiado estrecha, o un camino perdió información de verdad, como en «El grande se traga al pequeño». Mira la referencia de doble precisión: ¿qué resultado está más cerca?',
      vNearZero: '<br>Fíjate también: con solo tolerancia relativa el veredicto es «distinto», pero al añadir una tolerancia absoluta pasa a «igual». Cerca de 0, el error relativo se distorsiona y hace falta una tolerancia absoluta como piso.',
      try: [
        'Elige «0.1 + 0.2 frente a 0.3» y alterna entre <b>FP32</b> y <b>FP64</b>: iguales en FP32, distintos en FP64. Que coincidan depende de la suerte, no de «haberlo calculado bien».',
        'Elige «El grande se traga al pequeño»: A da 1, B da 0, y la respuesta correcta es 2. Los dos caminos perdieron información, de formas distintas. Ninguna tolerancia puede arreglar un problema del propio algoritmo.',
        'Elige «Resultado cerca de 0» y lleva atol a <b>0</b>: hasta el veredicto relativo + absoluto falla. Vuelve a poner atol en 10⁻⁶ y pasa. Las comparaciones cerca de 0 necesitan una tolerancia absoluta.',
      ],

      mCode: 'MUTANT_HUNT', mTitle: 'Prueba de mutación: ¿qué prueba atrapa el bug?', mTag: 'Estimación didáctica · modelo de juguete de 48 capas',
      mIntro: 'Un modelo de juguete de 48 capas: en cada capa, 4 «expertos» multiplican cada uno por un coeficiente, los resultados se suman según el peso de enrutamiento y se vuelve a añadir el residuo. Hay 4 versiones: 1 correcta que suma en otro orden y 3 que esconden cada una un bug. Elige una versión, pulsa <b>Ejecutar todas las pruebas</b> y mira cuáles de las 5 pruebas dan la alarma.',
      mLgCaught: 'Alarma, y con razón (bug atrapado)', mLgMissed: 'Sin alarma cuando debía haberla (bug escapado), o falsa alarma con código correcto', mLgQuiet: 'Código correcto, la prueba pasa en silencio',
      tests: ['Humo', 'Unit. débil', 'Unit. fuerte', 'Dif. · exacta', 'Dif. · tol.'],
      testDesc: {
        smoke: 'Prueba de humo: corre las 48 capas; la salida es finita y no es 0',
        weakUnit: 'Prueba unitaria débil: 1 experto, peso 1,0, entrada 2, se espera 2',
        strongUnit: 'Prueba unitaria fuerte: 2 expertos, pesos 0,7 / 0,3, entradas 1 / 3, se espera 1,6 (tolerancia 10⁻⁶)',
        diffExact: 'Prueba diferencial (exacta): compara la salida tras 48 capas con la referencia; debe coincidir bit a bit',
        diffTol: 'Prueba diferencial (tolerancia): compara con la referencia, permitiendo rtol = 10⁻⁵, atol = 10⁻⁶',
      },
      vars: { ok: 'Correcta (suma reordenada)', w2: 'Bug: peso dos veces', drop: 'Bug: omite un experto', stale: 'Bug: entrada vieja' },
      varDesc: {
        ok: 'Correcta: suma la contribución de cada experto directamente al residuo, empezando por el último experto. Matemáticamente idéntica a la referencia.',
        w2: 'Bug: el peso de enrutamiento se aplica dos veces, así que w pasa a ser w². Los comentarios de la interfaz de Strata advierten justo de esto.',
        drop: 'Bug: el bucle corre una vez de menos y omite el último experto. El clásico error de uno de más o de menos.',
        stale: 'Bug: cada capa calcula sus expertos con la entrada de la capa 0. Es como guardar en caché por dirección un búfer cuyo contenido cambia en cada capa.',
      },
      gridLabel: 'Resultados de 4 versiones × 5 pruebas',
      cellPass: 'pasa', cellFail: 'alarma', cellTodo: '—',
      bRunAll: '▶ Ejecutar todas las pruebas', bClear: 'Vaciar la tabla',
      mReady: '<span class="c">$</span> ready. Elige una versión y pulsa [ ▶ Ejecutar todas las pruebas ]',
      mStart: (name) => `<span class="c">[versión]</span> ${name}`,
      mLine: (desc, pass, got, want) => `<span class="m">${desc}</span><br>&nbsp;&nbsp;obtuvo ${got}${want === null ? '' : ', esperado ' + want} → ${pass ? '<span class="w">pasa</span>' : '<span class="y">alarma</span>'}`,
      sOutK: 'Salida tras 48 capas: esta versión frente a la referencia', sOutF: (rel) => `<b>diferencia relativa = ${rel}</b><br>en cada capa, la referencia suma primero los 4 expertos ponderados y luego suma el resultado al residuo`,
      sScoreK: 'Puntuación de mutación (proporción de las versiones con bug ejecutadas hasta ahora que atrapó al menos una prueba)', sScoreF: (c, n) => `<b>= versiones con bug atrapadas ÷ versiones con bug ejecutadas = ${c} ÷ ${n}</b>`,
      sColK: 'Historial de cada prueba (bugs atrapados / falsas alarmas)',
      colLine: (name, c, n, fa) => `${name}: atrapó ${c}/${n}${fa ? ', 1 falsa alarma' : ''}`,
      mVerdictRow: {
        ok: 'Esta es la versión correcta. Solo «Dif. · exacta» dio la alarma: cambiar el orden de la suma cambió los últimos dígitos. Es una falsa alarma.',
        w2: '«Peso dos veces» engañó a la prueba de humo y a la unitaria débil: cuando el peso es justo 1,0, 1,0² sigue siendo 1,0. La unitaria fuerte usó 0,7 y 0,3 y lo atrapó enseguida.',
        drop: 'Hasta la prueba unitaria débil atrapa un experto omitido. Pero la prueba de humo sigue pasando: la salida sigue siendo un número «de aspecto normal».',
        stale: 'El bug de la «entrada vieja» no está dentro de la función de suma ponderada, así que ninguna de las dos pruebas unitarias lo atrapa. Solo lo encuentra una prueba diferencial que compare el camino completo de 48 capas.',
      },
      mVerdictAll: 'Las cuatro filas están terminadas. La prueba de humo no atrapó ningún bug; cada prueba unitaria tiene puntos ciegos; la diferencial exacta lo atrapó todo, pero también culpó a la versión correcta; la diferencial con tolerancia atrapó los 3 bugs sin ninguna falsa alarma. Una buena prueba hace dos cosas a la vez: falla ante los bugs plantados y pasa ante las diferencias numéricas legítimas.',
      mTry: [
        'Ejecuta primero <b>Bug: peso dos veces</b>: la prueba de humo y la unitaria débil pasan las dos. Piensa: ¿por qué una prueba que usa peso 1,0 no puede ver este bug?',
        'Después ejecuta <b>Correcta (suma reordenada)</b>: solo «Dif. · exacta» da la alarma. Es una falsa alarma de punto flotante; la sección 26.3 explica por qué.',
        'Por último ejecuta <b>Bug: entrada vieja</b>: las dos pruebas unitarias pasan, y solo la diferencial del camino completo lo atrapa. Las pruebas unitarias solas no bastan.',
      ],
    },
    ko: {
      code: 'FLOAT_EQ', title: '부동소수점 비교 실험대', tag: '교육용 추정 · 브라우저에서 실제로 계산',
      intro: '같은 수들을 두 경로로 더해 봐요. <b>경로 A</b>와 <b>경로 B</b>예요. CPU와 GPU가 같은 전문가를 서로 다른 순서로 계산하는 것과 같아요. 시나리오를 고르고 <b>단계별 비교</b>를 누른 다음, 허용 오차 슬라이더 두 개를 끌어서 세 가지 「같다」 기준이 어떻게 다른 답을 내는지 보세요.',
      lgA: '경로 A의 결과', lgB: '경로 B의 결과', lgRef: '배정밀도 기준값(입력의 합을 FP64로 계산)', lgBand: '허용 오차 띠: B에서 얼마나 가까워야 「같다」인가',
      steps: ['시나리오 선택', '경로 A 덧셈', '경로 B 덧셈', '차이 계산', '세 가지 기준'],
      scen: { tenths: '0.1 + 0.2와 0.3', swamp: '큰 수가 작은 수를 삼킴', drift: '0.1을 1000번', dot: '256차원 내적', nearzero: '결과가 0에 가까움' },
      scenDesc: {
        tenths: 'A: 0.1 + 0.2. B: 0.3을 그대로 씀.',
        swamp: '수 네 개 [1억, 1, −1억, 1]. A는 왼쪽에서 오른쪽으로, B는 둘씩 묶어(GPU의 트리형 리덕션처럼) 더해요.',
        drift: '0.1을 1000번 더해요. A는 왼쪽에서 오른쪽으로, B는 둘씩 묶어 더해요.',
        dot: '각각 256개인 난수 두 묶음을 항목별로 곱해 더해요. 로짓 하나를 계산하는 것과 같아요. A는 왼쪽에서 오른쪽으로, B는 둘씩 묶어 더해요.',
        nearzero: '수 네 개 [1, 2×10⁻⁸, −1, 2×10⁻⁸]. A는 왼쪽에서 오른쪽으로, B는 오른쪽에서 왼쪽으로 더해요.',
      },
      order: { forward: '왼쪽에서 오른쪽으로', reverse: '오른쪽에서 왼쪽으로', pairwise: '둘씩 묶어서', literal: '직접 쓴 값' },
      precLabel: '정밀도',
      rtolLabel: '상대 허용 오차 rtol', atolLabel: '절대 허용 오차 atol',
      bRun: '▶ 단계별 비교', bReset: '초기화',
      lensLabel: '수직선 돋보기: A, B, 기준값, 허용 오차 띠',
      lens: (h) => `돋보기 폭: B ± ${h}`,
      sAK: '경로 A의 결과', sBK: '경로 B의 결과',
      sOrdF: (o, prec) => `<b>더하는 방식: ${o}</b><br>한 단계마다 결과를 반올림해요. 정밀도: ${prec}`,
      sDK: '두 경로의 차이', sDF: (rel, ulp) => `<b>|A − B|</b>. 상대 차이 = |A − B| ÷ max(|A|, |B|) = ${rel}<br>${ulp}`,
      ulp: (n) => `FP32 눈금(ULP) ${n}개 차이`, ulpMany: '두 수가 너무 멀어서 ULP가 의미 없어요', ulpNa: 'FP64 모드에서는 ULP를 세지 않아요',
      sJK: '「같다」의 세 가지 기준', sJF: '<b>허용 오차 = max(rtol × max(|A|,|B|), atol)</b><br>Python의 math.isclose가 쓰는 식이에요',
      j: { exact: '정확히 같음 A == B', absOnly: '절대 오차만 |A−B| ≤ atol', relOnly: '상대 오차만', combined: '상대 + 절대(권장)' },
      yes: '✓ 같음', no: '✗ 다름',
      ready: '<span class="c">$</span> ready. 시나리오를 고르고 [ ▶ 단계별 비교 ]를 누르세요',
      l0: (name, n, prec) => `<span class="c">[시나리오]</span> ${name}: 수 ${n}개, 정밀도 ${prec}`,
      lStep: (who, i, s) => `<span class="m">${who}</span> ${i}단계, 누적 = ${s}`,
      lSkip: (k) => `<span class="m">…</span> 그 사이에 ${k}단계가 더 있어요`,
      lPair: (who, n, r) => `<span class="m">${who}</span> 둘씩 묶기: 이웃한 두 수를 먼저 더하고, 그 결과를 다시 둘씩 더해요. 모두 ${r}라운드(수 ${n}개)`,
      lLit: (who, v) => `<span class="m">${who}</span> 0.3을 그대로 써요. 저장된 값: ${v}`,
      lRes: (who, v) => `<span class="w">${who} 결과</span> = ${v}`,
      lDiff: (d, ref) => `<span class="y">차이</span> |A − B| = ${d}. 배정밀도 기준값 = ${ref}`,
      lJudge: (e, c) => `<span class="c">기준</span> 정확히 같음 기준의 답: ${e}. 상대 + 절대 허용 오차 기준의 답: ${c}`,
      same: '같음', diff: '다름',
      vExactLuck: '두 경로가 우연히 같은 수를 냈어요. 아직 기뻐하기엔 일러요. 운이에요. 정밀도나 순서가 달라지면 깨질 수 있어요. FP64에서 「0.1 + 0.2와 0.3」을 해 보세요.',
      vTolOk: '정확한 비교는 「다르다」고 하지만, 차이가 내가 정한 허용 오차 안에 들어요. 그 기준으로는 두 경로가 「같아요」. 테스트를 <code>==</code>로 쓰면 이런 순서 차이를 버그로 잘못 보고해요.',
      vTolBad: '차이가 허용 오차를 넘었어요. 허용 오차가 너무 빡빡하거나, 한 경로가 정말 정보를 잃은 거예요. 「큰 수가 작은 수를 삼킴」이 그런 경우예요. 배정밀도 기준값을 보세요. 어느 쪽이 더 가까운가요?',
      vNearZero: '<br>또 하나 눈여겨보세요. 상대 허용 오차만 보면 「다름」인데 절대 허용 오차를 더하면 「같음」이에요. 결과가 0에 가까우면 상대 오차가 왜곡되어서, 절대 허용 오차가 바닥을 받쳐 줘야 해요.',
      try: [
        '「0.1 + 0.2와 0.3」을 고르고 <b>FP32</b>와 <b>FP64</b>를 오가 보세요. FP32에서는 딱 같고 FP64에서는 달라요. 같으냐 다르냐는 운에 달려 있고, 「제대로 계산했느냐」와는 상관없어요.',
        '「큰 수가 작은 수를 삼킴」을 골라 보세요. A는 1, B는 0이고 정답은 2예요. 두 경로 모두 정보를 잃었고, 잃는 방식도 달라요. 허용 오차로는 알고리즘 자체의 문제를 구할 수 없다는 걸 보여 줘요.',
        '「결과가 0에 가까움」을 고르고 atol을 <b>0</b>으로 끌어내려 보세요. 상대 + 절대 기준도 실패해요. atol을 10⁻⁶으로 되돌리면 통과해요. 0에 가까운 비교에는 반드시 절대 허용 오차가 있어야 해요.',
      ],

      mCode: 'MUTANT_HUNT', mTitle: '뮤테이션 테스트: 어떤 테스트가 버그를 잡을까', mTag: '교육용 추정 · 48층 장난감 모델',
      mIntro: '48층짜리 장난감 모델이에요. 층마다 「전문가」 4개가 각각 계수 하나를 곱하고, 라우팅 가중치로 가중합한 다음 잔차에 더해요. 버전을 네 개 준비했어요. 정상이지만 덧셈 순서를 바꾼 것 1개, 각각 버그를 하나씩 숨긴 것 3개예요. 버전을 하나 고르고 <b>전체 테스트 실행</b>을 눌러, 테스트 5개 중 어느 것이 경보를 울리는지 보세요.',
      mLgCaught: '경보를 울렸고 울려야 했음(버그를 잡음)', mLgMissed: '울려야 하는데 안 울림(버그를 놓침), 또는 정상 구현에 오경보', mLgQuiet: '정상 구현, 테스트가 조용히 통과',
      tests: ['스모크 테스트', '약한 단위 테스트', '강한 단위 테스트', '차분 · 정확', '차분 · 허용 오차'],
      testDesc: {
        smoke: '스모크 테스트: 48층을 다 돌렸을 때 출력이 유한한 수이고 0이 아님',
        weakUnit: '약한 단위 테스트: 전문가 1개, 가중치 1.0, 입력 2, 기대값 2',
        strongUnit: '강한 단위 테스트: 전문가 2개, 가중치 0.7 / 0.3, 입력 1 / 3, 기대값 1.6(허용 오차 10⁻⁶)',
        diffExact: '차분 테스트(정확히 같음): 참조 구현과 48층 뒤의 출력을 비교하며 비트까지 같아야 함',
        diffTol: '차분 테스트(허용 오차): 참조 구현과 비교하며 rtol = 10⁻⁵, atol = 10⁻⁶까지 허용',
      },
      vars: { ok: '정상 구현(덧셈 순서 변경)', w2: '버그: 가중치를 두 번 곱함', drop: '버그: 전문가 하나를 빠뜨림', stale: '버그: 층마다 옛 입력을 씀' },
      varDesc: {
        ok: '정상 구현: 전문가마다의 기여를 잔차에 바로 더하되, 마지막 전문가부터 더해요. 수학적으로는 참조 구현과 완전히 같아요.',
        w2: '버그: 라우팅 가중치를 두 번 곱해서 w가 w²이 돼요. Strata의 인터페이스 주석이 바로 이 경우를 경고해요.',
        drop: '버그: 반복을 한 번 덜 돌아서 마지막 전문가를 빠뜨려요. 전형적인 「off-by-one」 오류예요.',
        stale: '버그: 모든 층이 0번째 층의 입력으로 전문가를 계산해요. 층마다 내용이 바뀌는 버퍼를 주소로 캐시한 것과 같아요.',
      },
      gridLabel: '버전 4개 × 테스트 5개의 결과표',
      cellPass: '통과', cellFail: '경보', cellTodo: '—',
      bRunAll: '▶ 전체 테스트 실행', bClear: '표 비우기',
      mReady: '<span class="c">$</span> ready. 먼저 버전을 고른 뒤 [ ▶ 전체 테스트 실행 ]을 누르세요',
      mStart: (name) => `<span class="c">[버전]</span> ${name}`,
      mLine: (desc, pass, got, want) => `<span class="m">${desc}</span><br>　결과 ${got}${want === null ? '' : ', 기대값 ' + want} → ${pass ? '<span class="w">통과</span>' : '<span class="y">경보</span>'}`,
      sOutK: '48층 뒤의 출력: 이 버전 vs 참조 구현', sOutF: (rel) => `<b>상대 차이 = ${rel}</b><br>참조 구현: 층마다 전문가 4개를 먼저 가중합한 뒤 잔차에 더해요`,
      sScoreK: '뮤테이션 점수(실행한 버그 버전 중 테스트가 하나라도 잡은 비율)', sScoreF: (c, n) => `<b>= 잡은 버그 버전 ÷ 실행한 버그 버전 = ${c} ÷ ${n}</b>`,
      sColK: '테스트별 전적(버그 잡음 / 오경보)',
      colLine: (name, c, n, fa) => `${name}: 잡은 것 ${c}/${n}${fa ? ', 오경보 1번' : ''}`,
      mVerdictRow: {
        ok: '정상 구현이에요. 「차분 · 정확」만 경보를 울렸어요. 덧셈 순서가 바뀌면 마지막 몇 자리가 달라지기 때문이에요. 오경보예요.',
        w2: '「가중치를 두 번 곱함」은 스모크 테스트와 약한 단위 테스트를 속였어요. 가중치가 마침 1.0이면 1.0²도 1.0이에요. 강한 단위 테스트는 0.7과 0.3을 써서 바로 잡았어요.',
        drop: '전문가를 하나 빠뜨리면 약한 단위 테스트도 잡아요. 하지만 스모크 테스트는 그대로 통과해요. 출력이 여전히 「정상으로 보이는」 수이기 때문이에요.',
        stale: '「층마다 옛 입력을 씀」 버그는 가중합 함수 안에 있지 않아서 단위 테스트 둘 다 못 잡아요. 48층 전체 경로를 비교하는 차분 테스트만 알아봐요.',
      },
      mVerdictAll: '네 줄을 모두 돌렸어요. 스모크 테스트는 버그를 하나도 못 잡았어요. 단위 테스트는 저마다 사각지대가 있어요. 정확히 같음을 요구하는 차분 테스트는 모두 잡았지만 정상 구현에도 누명을 씌웠어요. 허용 오차가 있는 차분 테스트는 버그 3개를 모두 잡았고 오경보도 없었어요. 좋은 테스트는 두 가지를 동시에 해내야 해요. 심은 버그 앞에서는 실패하고, 정당한 수치 차이 앞에서는 통과해야 해요.',
      mTry: [
        '먼저 <b>버그: 가중치를 두 번 곱함</b>을 돌려 보세요. 스모크 테스트와 약한 단위 테스트가 모두 통과했어요. 생각해 보세요. 가중치가 1.0인 테스트는 왜 이 버그를 못 볼까요?',
        '다음은 <b>정상 구현</b>을 돌려 보세요. 「차분 · 정확」만 경보를 울려요. 이것이 부동소수점 오경보이고, 26.3절이 그 이유를 설명했어요.',
        '마지막으로 <b>버그: 층마다 옛 입력을 씀</b>을 돌려 보세요. 단위 테스트 둘은 통과하고, 전체 경로의 차분 테스트만 이것을 잡아요. 단위 테스트만으로는 부족하다는 걸 보여 줘요.',
      ],
    },
    ja: {
      code: 'FLOAT_EQ', title: '浮動小数点の比較実験台', tag: '教育用の試算 · ブラウザの中で本当に計算',
      intro: '同じ数の組を、2 つの経路で足します。<b>経路 A</b> と <b>経路 B</b> で、CPU と GPU が同じエキスパートを違う順序で計算するのと同じです。場面を選んで<b>順に比較</b>を押し、2 つの許容差スライダーを動かして、3 通りの「等しい」の判定がどう違う答えを出すかを見てください。',
      lgA: '経路 A の結果', lgB: '経路 B の結果', lgRef: '倍精度の基準（入力の和を FP64 で計算したもの）', lgBand: '許容差の帯：B からどれだけ近ければ「同じ」とするか',
      steps: ['場面を選ぶ', '経路 A で足す', '経路 B で足す', '差を求める', '3 つの判定'],
      scen: { tenths: '0.1 + 0.2 と 0.3', swamp: '大きい数が小さい数を飲み込む', drift: '0.1 を 1000 個', dot: '256 次元の内積', nearzero: '結果が 0 に近い' },
      scenDesc: {
        tenths: 'A：0.1 + 0.2、B：0.3 をそのまま書く。',
        swamp: '4 つの数 [1億, 1, −1億, 1]。A は左から右へ、B は 2 つずつ組にして足す（GPU のツリー縮約のように）。',
        drift: '0.1 を 1000 回足す。A は左から右へ、B は 2 つずつ組にして足す。',
        dot: '256 個ずつの乱数 2 組を、項ごとに掛けて足す。logit を 1 つ計算するのと同じです。A は左から右へ、B は 2 つずつ組にして足す。',
        nearzero: '4 つの数 [1, 2×10⁻⁸, −1, 2×10⁻⁸]。A は左から右へ、B は右から左へ。',
      },
      order: { forward: '左から右', reverse: '右から左', pairwise: '2 つずつ組にする', literal: 'そのまま書く' },
      precLabel: '精度',
      rtolLabel: '相対許容差 rtol', atolLabel: '絶対許容差 atol',
      bRun: '▶ 順に比較', bReset: 'リセット',
      lensLabel: '数直線の拡大鏡：A、B、基準値、許容差の帯',
      lens: (h) => `拡大鏡の幅：B ± ${h}`,
      sAK: '経路 A の結果', sBK: '経路 B の結果',
      sOrdF: (o, prec) => `<b>「${o}」の順序で足す</b><br>1 ステップごとに、結果が ${prec} に丸められます`,
      sDK: '2 つの経路の差', sDF: (rel, ulp) => `<b>|A − B|</b>；相対差 = |A − B| ÷ max(|A|, |B|) = ${rel}<br>${ulp}`,
      ulp: (n) => `FP32 の目盛り（ULP）で ${n} 個ぶん離れている`, ulpMany: '2 つの数が離れすぎていて、ULP は意味を持たない', ulpNa: 'FP64 モードでは ULP を数えない',
      sJK: '3 通りの「等しい」の判定', sJF: '<b>許される誤差 = max(rtol × max(|A|,|B|), atol)</b><br>これは Python の math.isclose の書き方です',
      j: { exact: '完全一致 A == B', absOnly: '絶対許容差だけ |A−B| ≤ atol', relOnly: '相対許容差だけ', combined: '相対 + 絶対（推奨）' },
      yes: '✓ 等しい', no: '✗ 等しくない',
      ready: '<span class="c">$</span> ready. 場面を選んで、[ ▶ 順に比較 ] を押してください',
      l0: (name, n, prec) => `<span class="c">[場面]</span> ${name}：${n} 個の数、精度 ${prec}`,
      lStep: (who, i, s) => `<span class="m">${who}</span> ステップ ${i}、累計 = ${s}`,
      lSkip: (k) => `<span class="m">…</span> 間にまだ ${k} ステップあります`,
      lPair: (who, n, r) => `<span class="m">${who}</span> 2 つずつ組にする：隣り合う 2 つを先に足し、その結果をまた 2 つずつ足す。全部で ${r} ラウンド（${n} 個の数）`,
      lLit: (who, v) => `<span class="m">${who}</span> 0.3 をそのまま書き、${v} として保存`,
      lRes: (who, v) => `<span class="w">${who} の結果</span> = ${v}`,
      lDiff: (d, ref) => `<span class="y">差</span> |A − B| = ${d}；倍精度の基準 = ${ref}`,
      lJudge: (e, c) => `<span class="c">判定</span> 完全一致は：${e}；相対 + 絶対の許容差は：${c}`,
      same: '同じ', diff: '違う',
      vExactLuck: '2 つの経路が、たまたま同じ数を出しました。まだ喜ばないでください。これは運です。精度や順序を変えると、違ってしまうかもしれません。FP64 で「0.1 + 0.2 と 0.3」を試してみましょう。',
      vTolOk: '完全一致は「違う」と言っていますが、差はあなたが決めた許容差の範囲内です。この基準では、2 つの経路は「同じ」です。テストを <code>==</code> で書いていたら、この順序の違いをバグとみなしてしまいます。',
      vTolBad: '差が許容差を超えました。許容差が厳しすぎるか、どちらかの経路が本当に情報を失ったかです。たとえば「大きい数が小さい数を飲み込む」場合です。倍精度の基準を見てください。どちらがそれに近いでしょうか。',
      vNearZero: '<br>もう 1 つ注意：相対許容差だけでは「等しくない」と判定され、絶対許容差を加えると「等しい」になります。結果が 0 に近いとき、相対誤差は歪むので、絶対許容差で下支えする必要があります。',
      try: [
        '「0.1 + 0.2 と 0.3」を選び、<b>FP32</b> と <b>FP64</b> を切り替えます。FP32 ではちょうど等しく、FP64 では等しくありません。等しいかどうかは運で決まり、「正しく計算できたか」では決まりません。',
        '「大きい数が小さい数を飲み込む」を選びます。A は 1、B は 0 になり、正解は 2 です。2 つの経路がどちらも情報を失い、失い方も違います。許容差では、アルゴリズム自体の問題は救えないことが分かります。',
        '「結果が 0 に近い」を選び、atol を <b>0</b> まで下げます。相対 + 絶対の判定も失敗します。atol を 10⁻⁶ に戻すと通ります。0 付近の比較には、絶対許容差が必要です。',
      ],

      mCode: 'MUTANT_HUNT', mTitle: 'ミューテーションテスト：どのテストがバグを捕まえるか', mTag: '教育用の試算 · 48 層のおもちゃのモデル',
      mIntro: '48 層のおもちゃのモデルです。各層で 4 つの「エキスパート」がそれぞれ係数を掛け、ルーティングの重みで加重して足し、残差に加え戻します。4 つの版を用意しました。足す順序を変えただけの正しい版が 1 つと、バグを 1 つずつ隠した版が 3 つです。版を選んで<b>全テストを実行</b>を押し、5 つのテストのうち、どれが警報を鳴らすか見てください。',
      mLgCaught: '警報が鳴り、鳴るべきだった（バグを検出）', mLgMissed: '鳴るべきなのに鳴らない（バグを見逃し）、または正しい実装に誤報', mLgQuiet: '正しい実装で、テストが静かに通過',
      tests: ['スモーク', '弱い単体', '強い単体', '差分·厳密', '差分·許容'],
      testDesc: {
        smoke: 'スモークテスト：48 層を走らせ、出力が有限の数で、0 ではないことを確認',
        weakUnit: '弱い単体テスト：エキスパート 1 つ、重み 1.0、入力 2、期待値 2',
        strongUnit: '強い単体テスト：エキスパート 2 つ、重み 0.7 / 0.3、入力 1 / 3、期待値 1.6（許容差 10⁻⁶）',
        diffExact: '差分テスト（完全一致）：48 層後の出力を参照実装と比べ、1 ビットまで同じであることを求める',
        diffTol: '差分テスト（許容差）：参照実装と比べ、rtol = 10⁻⁵、atol = 10⁻⁶ まで許す',
      },
      vars: { ok: '正しい実装（足す順序を変更）', w2: 'バグ：重みを 2 回掛ける', drop: 'バグ：エキスパートを 1 つ落とす', stale: 'バグ：毎層で古い入力を使う' },
      varDesc: {
        ok: '正しい実装：各エキスパートの寄与を直接残差に足し込み、最後のエキスパートから足し始めます。数学的には、参照実装とまったく同じです。',
        w2: 'バグ：ルーティングの重みを 2 回掛けていて、w が w² になります。Strata のインターフェースのコメントが、まさにこの点を警告しています。',
        drop: 'バグ：ループが 1 回少なく回り、最後のエキスパートを落とします。典型的な「1 つずれ」の間違いです。',
        stale: 'バグ：どの層も、第 0 層の入力でエキスパートを計算します。層ごとに中身が変わるバッファを、アドレスでキャッシュしてしまうのと同じです。',
      },
      gridLabel: '4 つの版 × 5 つのテストの結果表',
      cellPass: '通過', cellFail: '警報', cellTodo: '—',
      bRunAll: '▶ 全テストを実行', bClear: '表をクリア',
      mReady: '<span class="c">$</span> ready. まず版を選んで、[ ▶ 全テストを実行 ] を押してください',
      mStart: (name) => `<span class="c">[版]</span> ${name}`,
      mLine: (desc, pass, got, want) => `<span class="m">${desc}</span><br>　結果 ${got}${want === null ? '' : '、期待値 ' + want} → ${pass ? '<span class="w">通過</span>' : '<span class="y">警報</span>'}`,
      sOutK: '48 層後の出力：この版 vs 参照実装', sOutF: (rel) => `<b>相対差 = ${rel}</b><br>参照実装：層ごとに、まず 4 つのエキスパートを加重して足し、それから残差に足す`,
      sScoreK: 'ミューテーションスコア（これまでに走らせたバグ入りの版のうち、少なくとも 1 つのテストが捕まえた割合）', sScoreF: (c, n) => `<b>= 捕まえたバグ入りの版 ÷ 走らせたバグ入りの版 = ${c} ÷ ${n}</b>`,
      sColK: '各テストの成績（バグの検出数 / 誤報）',
      colLine: (name, c, n, fa) => `${name}：検出 ${c}/${n}${fa ? '、誤報 1 回' : ''}`,
      mVerdictRow: {
        ok: 'これは正しい実装です。「差分·厳密」だけが警報を鳴らしました。足す順序を変えたせいで、下の数桁が変わったのです。これは誤報です。',
        w2: '「重みを 2 回掛ける」は、スモークテストと弱い単体テストをだましました。重みがちょうど 1.0 だと、1.0² も 1.0 のままだからです。強い単体テストは 0.7 と 0.3 を使っていたので、すぐに捕まえました。',
        drop: 'エキスパートを 1 つ落とすバグは、弱い単体テストでも捕まえられます。それでもスモークテストは通ります。出力は、まだ「正常に見える」数のままだからです。',
        stale: '「毎層で古い入力」のバグは、加重和の関数の中にはないので、2 つの単体テストはどちらも捕まえられません。48 層の経路全体を比べる差分テストだけが見つけられます。',
      },
      mVerdictAll: '4 行とも走らせ終わりました。スモークテストはバグを 1 つも捕まえず、単体テストにはそれぞれ盲点があります。完全一致の差分テストはすべて捕まえましたが、正しい実装も濡れ衣を着せました。許容差つきの差分テストは、3 つのバグをすべて捕まえ、誤報もありません。良いテストは、2 つのことを同時にやります。注入したバグには失敗し、正当な数値の違いには通ることです。',
      mTry: [
        'まず <b>バグ：重みを 2 回掛ける</b> を走らせます。スモークテストと弱い単体テストは、どちらも通ります。考えてみましょう。重みを 1.0 にしたテストには、なぜこのバグが見えないのでしょうか。',
        '次に <b>正しい実装</b> を走らせます。「差分·厳密」だけが警報を鳴らします。これが浮動小数点の誤報で、理由は 26.3 節で説明しました。',
        '最後に <b>バグ：毎層で古い入力を使う</b> を走らせます。2 つの単体テストは通り、経路全体の差分テストだけが捕まえます。単体テストだけでは足りないことが分かります。',
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
