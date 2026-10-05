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
    en: {
      code: 'DRAFT_WINDOW', title: 'Draft window optimizer', tag: 'Teaching estimate · source default costs',
      intro: 'Drag the three sliders. Each bar is the speed of one window (guessing k drafts), and <b>speed = expected tokens committed per round ÷ time per round</b>. The time formula and defaults are copied from Strata\'s <code>CostModel</code>; to keep the math easy, every position here uses the same acceptance rate p.',
      lgBar: 'Speed for one k (tokens/s)', lgPick: 'The k Strata\'s rule would pick', lgLine: 'Threshold: no-draft speed × 1.05',
      chartLabel: 'Bar chart of speed for k = 0 to 8',
      pLabel: 'Acceptance rate p', hLabel: 'VRAM hit rate', dLabel: 'Cost per draft',
      axis: 'tokens/s', kTick: (k) => 'k=' + k,
      sPickK: 'Strata\'s rule would pick', sPickV: (k) => 'k = ' + k,
      sPickF: (bk) => `<b>= the k that maximizes "expected tokens ÷ round time"</b><br>and it must beat no drafting by more than 5%${bk ? `; without the threshold it would pick k = ${bk}` : ''}`,
      sEK: 'Expected tokens per round for this window', sEV: (e) => e + ' tokens', sEF: (k) => k ? `<b>= 1 + p + p² + … + p^${k}</b><br>the first one comes from the big model itself, guaranteed` : '<b>= 1</b><br>no drafting: each round gets only the big model\'s own 1',
      sMsK: 'Time per round', sMsF: (d, c, s, r) => `<b>= dense ${d} + CPU experts ${c} + sync ${s} + drafting ${r}</b><br>all in milliseconds`,
      sRateK: 'Speed', sRateF: (e, ms, x) => `<b>= ${e} ÷ ${ms} ms × 1000</b><br>${x}× the no-draft speed`,
      ready: '<span class="c">$</span> ready. Drag a slider; the bars and the formulas on the right change together',
      log: (p, h, d, k, rate, x) => `<span class="c">p=${p}</span> hit rate=${h} draft=${d} ms → <span class="y">pick k=${k}</span>, ${rate} tokens/s, ${x}× no drafting`,
      logGate: (bk) => `<span class="m">Threshold</span>: k=${bk} beats no drafting by less than 5%, so the controller would rather not draft`,
      verdict: (k, bk, p) => k === 0
        ? (bk ? `At acceptance rate ${p}, guessing ${bk} is only a tiny bit faster and misses the 5% threshold, so the answer is <b>no drafting</b>. The threshold stops the controller from taking risks for a near-zero gain.` : `At acceptance rate ${p}, no draft pays off: wrong drafts only add verification time. The controller falls back to <b>no drafting</b>.`)
        : `At acceptance rate ${p}, the best deal is <b>guessing ${k}</b>. Beyond that, the k-th draft adds only p^k tokens, less and less, while the window keeps getting more expensive, so speed starts to drop.`,
      try: [
        'Drag p from 0.86 down to <b>0.5</b>: the best window shrinks from 3 to 1. Once acceptance is low, the later drafts are almost wasted guesses.',
        'Drag p to <b>0.40</b>: the k = 1 bar is still slightly above no drafting, but it misses the threshold line, so the controller picks <b>k = 0</b>. Look for the "Threshold" line in the terminal.',
        'Raise the cost per draft to <b>5 ms</b>: the best window drops from 3 to 1. Drafting takes time too; the slower the drafts, the less it pays to guess more.',
      ],

      eCode: 'ACCEPT_TRACKER', eTitle: 'Acceptance tracker (EMA)', eTag: 'Teaching estimate · acceptances simulated with random numbers',
      eIntro: 'MTP guesses a fixed 3 per round. For the first 150 rounds the true acceptance rate is 0.86; at round 150 the topic changes and it drops to 0.55. The controller cannot see the true value and must estimate it from each round\'s result with an <b>exponential moving average</b>. Press <b>Step</b> to see how one round is recorded, or <b>Run all 300 rounds</b> to watch the estimate catch up with the change.',
      eLgTrue: 'True acceptance rate (hidden from the controller)', eLgP1: 'Estimate p₁ for draft 1', eLgP3: 'Estimate p₃ for draft 3', eLgK: 'Small bars at the bottom: the k the estimate would pick',
      eSteps: ['Draft 3', 'One verify pass', 'Count accepted', 'Record (EMA)', 'Re-pick window'],
      eChart: 'Line chart of the estimates over the rounds', eSwitch: 'topic change', eRound: 'rounds',
      bStep: '▶ Step', bAll: '▶▶ Run all 300 rounds', bReset: 'Reset', bSeed: 'New random numbers',
      aLabel: 'Update weight α', naive: 'Wrong way: also count unchecked positions as failures',
      sP1K: 'Estimate p₁ for draft 1', sP1F: (t) => `<b>new estimate = old estimate + α × (this result − old estimate)</b><br>true value ${t}; result 1 = accepted, 0 = rejected`,
      sP3K: 'Estimate p₃ for draft 3', sP3F: (t, naive) => naive ? `true value ${t}<br><b>wrong bookkeeping pushes it toward p₁ × p₂ × p₃</b>` : `true value ${t}<br><b>updated only in rounds where the first two were accepted</b>`,
      sHalfK: 'Half-life (old data\'s weight halves)', sHalfV: (h) => h + ' rounds', sHalfF: '<b>= ln 0.5 ÷ ln(1 − α)</b><br>the bigger α, the faster it forgets and the faster it catches up',
      sNoiseK: 'Jitter of the estimate (standard deviation)', sNoiseF: '<b>≈ √(α ÷ (2 − α) × p × (1 − p))</b><br>computed at p = 0.86; the bigger α, the worse the jitter',
      sKK: 'The current estimate would pick', sKV: (k) => 'k = ' + k, sKF: '<b>= the rule from the previous interactive figure</b><br>the window in this simulation stays at 3; this is only the advice',
      eReady: '<span class="c">$</span> ready. Press [ ▶ Step ] to begin',
      e0: (n, t) => `<span class="c">[round ${n}]</span> true acceptance rate ${t} (unknown to the controller). MTP guesses 3 drafts`,
      e1: '<span class="m">Verify</span>: the big model computes all 4 positions at once (the previous token + 3 drafts)',
      e2: (a) => a === 3 ? '<span class="y">All 3 accepted</span>, plus the big model\'s own 1: this round commits 4 tokens' : `<span class="y">${a} accepted</span>, draft ${a + 1} rejected; this round commits ${a + 1} tokens`,
      e3: (parts, p1) => `<span class="w">Record</span>: ${parts}. p₁ is now ${p1}`,
      e3ok: (i) => `position ${i} recorded as success`, e3bad: (i) => `position ${i} recorded as failure`, e3skip: (i) => `position ${i} unchecked, not recorded`,
      e3naive: (i) => `position ${i} unchecked but recorded as failure (wrong way)`, e3ext: 'positions 4–8 never tried, nudged toward p₃',
      e4: (k) => `<span class="c">→</span> with the new estimates, the controller would now pick k = ${k}`,
      eSwitchLog: '<span class="m">// round 150: topic change, true acceptance drops from 0.86 to 0.55</span>',
      eFast: '<span class="y">// fast-forward to round 300</span>',
      eDone: (p1, p3, k) => `<span class="y">Done</span>: p₁ ≈ ${p1}, p₃ ≈ ${p3}, the controller would pick k = ${k}`,
      eEnd: '<span class="y">// all 300 rounds done; press [ Reset ] to go again</span>',
      eVerdict: (a, h, before, after, k0, k1, naive, p3) => `With α = ${a}, the estimate forgets half the weight of old data in about ${h} rounds. Before the topic change p₁ ≈ ${before}; at the end ≈ ${after}; the window the estimate would pick went from k = ${k0} to k = ${k1}.` +
        (naive ? `<br>You turned on the wrong way: p₃ ends at only ${p3}, below the true 0.55. Unchecked positions were counted as failures, later positions were penalized again and again, and the controller will think long windows do not pay.` : '<br>Raise α and run again: it catches up faster, but the curve jitters harder. α is the trade-off between "react fast" and "do not get fooled by noise".'),
      eTry: [
        'First run all 300 rounds with the default α = 0.05: after round 150, the p₁ curve takes a dozen-plus rounds to clearly head down. That is the <b>lag</b> of averaging.',
        'Raise α to <b>0.3</b> and run again: the half-life is under 2 rounds, so it catches up almost at once after the topic change, but the curve jumps up and down. That is <b>noise</b>.',
        'Tick "Wrong way" and run again: p₃ falls to about 0.64 (≈ 0.86³) already in the first 150 rounds, and the suggested k at the bottom gets smaller. Counting "unseen" as "failed" is unfair to long windows.',
      ],
    },
    ar: {
      code: 'DRAFT_WINDOW', title: 'مُحسِّن نافذة المسودات', tag: 'تقدير تعليمي · تكاليف المصدر الافتراضية',
      intro: 'اسحب المنزلقات الثلاثة. كل عمود هو سرعة نافذة واحدة (تخمين k مسودة)، و<b>السرعة = عدد الرموز المتوقع إيداعها في الجولة ÷ زمن الجولة</b>. صيغة الزمن والقيم الافتراضية منسوخة من <code>CostModel</code> في Strata؛ ولتسهيل الحساب نستعمل هنا معدل قبول واحدًا p لكل المواضع.',
      lgBar: 'سرعة k معيّن (token/s)', lgPick: 'الـ k الذي ستختاره قاعدة Strata', lgLine: 'العتبة: سرعة عدم التخمين × 1.05',
      chartLabel: 'مخطط أعمدة للسرعة عند k من 0 إلى 8',
      pLabel: 'معدل القبول p', hLabel: 'معدل إصابة VRAM', dLabel: 'كلفة كل مسودة',
      axis: 'token/s', kTick: (k) => 'k=' + k,
      sPickK: 'ستختار قاعدة Strata', sPickV: (k) => 'k = ' + k,
      sPickF: (bk) => `<b>= الـ k الذي يجعل «الرموز المتوقعة ÷ زمن الجولة» أكبر ما يمكن</b><br>ويجب أن يتفوق على عدم التخمين بأكثر من 5%${bk ? `؛ وبدون العتبة كانت ستختار k = ${bk}` : ''}`,
      sEK: 'المتوقع إيداعه في الجولة بهذه النافذة', sEV: (e) => e + ' رمز', sEF: (k) => k ? `<b>= 1 + p + p² + … + p^${k}</b><br>الأول يعطيه النموذج الكبير نفسه، فهو مضمون` : '<b>= 1</b><br>دون تخمين: لا تحصل كل جولة إلا على رمز النموذج الكبير الواحد',
      sMsK: 'زمن الجولة', sMsF: (d, c, s, r) => `<b>= الكثيف ${d} + خبراء CPU ${c} + المزامنة ${s} + الصياغة ${r}</b><br>الوحدة ms في كل الحدود`,
      sRateK: 'السرعة', sRateF: (e, ms, x) => `<b>= ${e} ÷ ${ms} ms × 1000</b><br>أي ${x} ضعف سرعة عدم التخمين`,
      ready: '<span class="c">$</span> ready. اسحب منزلقًا فتتغير الأعمدة والصيغ على الجانب معًا',
      log: (p, h, d, k, rate, x) => `<span class="c">p=${p}</span> الإصابة=${h} المسودة=${d} ms ← <span class="y">اختيار k=${k}</span>، ${rate} token/s، أي ${x} ضعف عدم التخمين`,
      logGate: (bk) => `<span class="m">العتبة</span>: k=${bk} يتفوق على عدم التخمين بأقل من 5%، فيفضّل المتحكّم ألا يخمّن`,
      verdict: (k, bk, p) => k === 0
        ? (bk ? `عند معدل قبول ${p}، تخمين ${bk} أسرع بقليل جدًا ولا يبلغ عتبة 5%، فالجواب هو <b>عدم التخمين</b>. تمنع هذه العتبة المتحكّم من المجازفة من أجل مكسب يكاد يكون صفرًا.` : `عند معدل قبول ${p}، لا تستحق أي مسودة العناء: المسودات الخاطئة تزيد زمن التحقق فقط. فيعود المتحكّم إلى <b>عدم التخمين</b>.`)
        : `عند معدل قبول ${p}، الأوفر هو <b>تخمين ${k}</b>. وبعد ذلك لا تساهم المسودة رقم k إلا بـ p^k رمز، أي بأقل فأقل، بينما تغلو النافذة أكثر فأكثر، فتبدأ السرعة بالانخفاض.`,
      try: [
        'اسحب p من 0.86 إلى <b>0.5</b>: تنكمش أفضل نافذة من 3 إلى 1. حين ينخفض القبول تصير المسودات المتأخرة تخمينًا ضائعًا تقريبًا.',
        'اسحب p إلى <b>0.40</b>: عمود k = 1 ما زال أعلى قليلًا من عدم التخمين، لكنه لا يبلغ خط العتبة، فيختار المتحكّم <b>k = 0</b>. انظر إلى سطر «العتبة» في الطرفية.',
        'ارفع كلفة كل مسودة إلى <b>5 ms</b>: تهبط أفضل نافذة من 3 إلى 1. صياغة المسودة تأخذ وقتًا أيضًا، وكلما كانت المسودات أبطأ قلّ ما يستحقه التخمين الإضافي.',
      ],

      eCode: 'ACCEPT_TRACKER', eTitle: 'متتبّع معدل القبول (EMA)', eTag: 'تقدير تعليمي · القبول والرفض مُحاكاة بأرقام عشوائية',
      eIntro: 'تخمّن MTP في كل جولة 3 مسودات ثابتة. في أول 150 جولة يكون معدل القبول الحقيقي 0.86؛ ومن الجولة 150 يتغير الموضوع فينخفض إلى 0.55. لا يرى المتحكّم القيمة الحقيقية، بل عليه أن يقدّرها من نتائج الجولات بـ<b>المتوسط المتحرك الأسي</b>. اضغط <b>خطوة</b> لترى كيف تُسجَّل جولة واحدة، أو <b>شغّل 300 جولة</b> لترى كيف يلحق التقدير بالتغير.',
      eLgTrue: 'معدل القبول الحقيقي (لا يراه المتحكّم)', eLgP1: 'تقدير p₁ للمسودة 1', eLgP3: 'تقدير p₃ للمسودة 3', eLgK: 'الأعمدة الصغيرة في الأسفل: الـ k الذي سيختاره التقدير وقتها',
      eSteps: ['تخمين 3 مسودات', 'تحقق واحد', 'عدّ المقبول', 'التسجيل (EMA)', 'إعادة تقدير النافذة'],
      eChart: 'مخطط خطي للتقديرات عبر الجولات', eSwitch: 'تغيّر الموضوع', eRound: 'جولة',
      bStep: '▶ خطوة', bAll: '▶▶ شغّل 300 جولة', bReset: 'إعادة', bSeed: 'أرقام عشوائية جديدة',
      aLabel: 'وزن التحديث α', naive: 'الطريقة الخاطئة: تسجيل المواضع التي لم يُتحقق منها فشلًا أيضًا',
      sP1K: 'تقدير p₁ للمسودة 1', sP1F: (t) => `<b>التقدير الجديد = التقدير القديم + α × (نتيجة هذه المرة − التقدير القديم)</b><br>القيمة الحقيقية ${t}؛ النتيجة 1 = قبول، 0 = رفض`,
      sP3K: 'تقدير p₃ للمسودة 3', sP3F: (t, naive) => naive ? `القيمة الحقيقية ${t}<br><b>التسجيل الخاطئ يجرّه نحو p₁ × p₂ × p₃</b>` : `القيمة الحقيقية ${t}<br><b>يتحدّث فقط في الجولات التي قُبلت فيها المسودتان الأوليان</b>`,
      sHalfK: 'عمر النصف (يهبط وزن البيانات القديمة إلى النصف)', sHalfV: (h) => h + ' جولة', sHalfF: '<b>= ln 0.5 ÷ ln(1 − α)</b><br>كلما كبر α نسي أسرع ولحق أسرع',
      sNoiseK: 'تذبذب التقدير (الانحراف المعياري)', sNoiseF: '<b>≈ √(α ÷ (2 − α) × p × (1 − p))</b><br>محسوب عند p = 0.86؛ وكلما كبر α اشتد التذبذب',
      sKK: 'التقدير الحالي سيختار', sKV: (k) => 'k = ' + k, sKF: '<b>= قاعدة الشكل التفاعلي السابق</b><br>تبقى النافذة في هذه المحاكاة 3، وهذا مجرد اقتراح',
      eReady: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ] لتبدأ',
      e0: (n, t) => `<span class="c">[الجولة ${n}]</span> معدل القبول الحقيقي ${t} (لا يعرفه المتحكّم). تخمّن MTP 3 مسودات`,
      e1: '<span class="m">التحقق</span>: يحسب النموذج الكبير المواضع الأربعة دفعة واحدة (الرمز السابق + 3 مسودات)',
      e2: (a) => a === 3 ? '<span class="y">قُبلت المسودات الثلاث</span>، ومعها رمز النموذج الكبير نفسه: تودِع هذه الجولة 4 رموز' : `<span class="y">قُبل ${a}</span>، ورُفضت المسودة رقم ${a + 1}؛ تودِع هذه الجولة ${a + 1} رموز`,
      e3: (parts, p1) => `<span class="w">التسجيل</span>: ${parts}. صارت p₁ الآن ${p1}`,
      e3ok: (i) => `الموضع ${i} يُسجَّل نجاحًا`, e3bad: (i) => `الموضع ${i} يُسجَّل فشلًا`, e3skip: (i) => `الموضع ${i} لم يُتحقق منه، فلا يُسجَّل`,
      e3naive: (i) => `الموضع ${i} لم يُتحقق منه لكنه يُسجَّل فشلًا (الطريقة الخاطئة)`, e3ext: 'المواضع 4-8 لم تُجرَّب قط، فتُسحب قليلًا نحو p₃',
      e4: (k) => `<span class="c">←</span> بالتقديرات الجديدة سيختار المتحكّم الآن k = ${k}`,
      eSwitchLog: '<span class="m">// الجولة 150: تغيّر الموضوع، وينخفض القبول الحقيقي من 0.86 إلى 0.55</span>',
      eFast: '<span class="y">// تقديم سريع حتى الجولة 300</span>',
      eDone: (p1, p3, k) => `<span class="y">تم</span>: p₁ ≈ ${p1}، وp₃ ≈ ${p3}، وسيختار المتحكّم k = ${k}`,
      eEnd: '<span class="y">// انتهت الجولات الـ300؛ اضغط [ إعادة ] لتكرارها</span>',
      eVerdict: (a, h, before, after, k0, k1, naive, p3) => `عند α = ${a}، ينسى التقدير نصف وزن البيانات القديمة في نحو ${h} جولة. قبل تغيّر الموضوع كانت p₁ ≈ ${before}، وفي النهاية ≈ ${after}؛ وتحوّلت النافذة التي سيختارها التقدير من k = ${k0} إلى k = ${k1}.` +
        (naive ? `<br>فعّلتَ الطريقة الخاطئة: تنتهي p₃ عند ${p3} فقط، وهي أقل من القيمة الحقيقية 0.55. فالمواضع التي لم يُتحقق منها عُدّت فشلًا، وخُصمت من المواضع المتأخرة مرة بعد مرة، فيظن المتحكّم أن النوافذ الطويلة لا تستحق.` : '<br>ارفع α وأعد التشغيل: يلحق التقدير أسرع، لكن المنحنى يتذبذب أكثر. α مفاضلة بين «سرعة الاستجابة» و«ألا يخدعك الضجيج».'),
      eTry: [
        'شغّل أولًا 300 جولة بالقيمة الافتراضية α = 0.05: بعد الجولة 150 يحتاج منحنى p₁ إلى أكثر من عشر جولات ليهبط بوضوح. هذا هو <b>التأخر</b> الناتج عن المتوسط.',
        'ارفع α إلى <b>0.3</b> وأعد التشغيل: عمر النصف أقل من جولتين، فيلحق التقدير بالتغير تقريبًا فورًا بعد تغيّر الموضوع، لكن المنحنى يقفز صعودًا وهبوطًا. هذا هو <b>الضجيج</b>.',
        'فعّل «الطريقة الخاطئة» وأعد التشغيل: تهبط p₃ إلى نحو 0.64 (≈ 0.86³) منذ أول 150 جولة، ويصغر الـ k المقترح في الأسفل. اعتبار «لم نرَ» على أنه «فشل» ظلم للنوافذ الطويلة.',
      ],
    },
    ko: {
      code: 'DRAFT_WINDOW', title: '드래프트 윈도우 최적화기', tag: '교육용 추정 · 소스 기본 비용 파라미터',
      intro: '슬라이더 세 개를 끌어 보세요. 막대 하나는 윈도우 하나(드래프트 k개 추측)의 속도예요. <b>속도 = 한 라운드의 기대 커밋 토큰 수 ÷ 한 라운드의 시간</b>이에요. 시간 공식과 기본값은 Strata의 <code>CostModel</code>을 그대로 옮겼어요. 계산하기 쉽게 여기서는 모든 자리에 같은 수락률 p를 써요.',
      lgBar: 'k별 속도(token/s)', lgPick: 'Strata의 규칙이 고를 k', lgLine: '문턱: 추측 안 함의 속도 × 1.05',
      chartLabel: 'k = 0부터 8까지의 속도 막대그래프',
      pLabel: '수락률 p', hLabel: 'VRAM 히트율', dLabel: '드래프트당 비용',
      axis: 'token/s', kTick: (k) => 'k=' + k,
      sPickK: 'Strata의 규칙이 고르는 값', sPickV: (k) => 'k = ' + k,
      sPickF: (bk) => `<b>= 「기대 토큰 ÷ 라운드 시간」을 최대로 만드는 k</b><br>추측 안 함보다 5% 넘게 빨라야 해요${bk ? `. 문턱이 없으면 k = ${bk}을 골라요` : ''}`,
      sEK: '이 윈도우가 한 라운드에 기대하는 커밋', sEV: (e) => e + '개', sEF: (k) => k ? `<b>= 1 + p + p² + … + p^${k}</b><br>첫 번째는 큰 모델이 직접 내서 반드시 얻어요` : '<b>= 1</b><br>추측 안 함: 라운드마다 큰 모델의 토큰 1개뿐이에요',
      sMsK: '한 라운드의 시간', sMsF: (d, c, s, r) => `<b>= 밀집 ${d} + CPU 전문가 ${c} + 동기화 ${s} + 드래프트 작성 ${r}</b><br>단위는 모두 밀리초예요`,
      sRateK: '속도', sRateF: (e, ms, x) => `<b>= ${e} ÷ ${ms} ms × 1000</b><br>추측 안 함의 ${x}배예요`,
      ready: '<span class="c">$</span> ready. 슬라이더를 끌면 막대와 오른쪽 식이 함께 바뀌어요',
      log: (p, h, d, k, rate, x) => `<span class="c">p=${p}</span> 히트율=${h} 드래프트=${d} ms → <span class="y">k=${k} 선택</span>, ${rate} token/s, 추측 안 함의 ${x}배`,
      logGate: (bk) => `<span class="m">문턱</span>: k=${bk}는 추측 안 함보다 5%도 안 빨라서, 컨트롤러는 차라리 추측하지 않아요`,
      verdict: (k, bk, p) => k === 0
        ? (bk ? `수락률 ${p}에서는 ${bk}개를 추측해도 아주 조금만 빨라서 5% 문턱을 넘지 못해요. 그래서 <b>추측하지 않아요</b>. 이 문턱은 거의 0에 가까운 이득을 위해 컨트롤러가 모험하는 걸 막아 줘요.` : `수락률 ${p}에서는 어떤 드래프트도 이득이 아니에요. 틀린 드래프트는 검증 시간만 늘려요. 컨트롤러는 <b>추측 안 함</b>으로 물러나요.`)
        : `수락률 ${p}에서 가장 이득인 건 <b>${k}개 추측</b>이에요. 그보다 더 가면 k번째 드래프트의 기여가 p^k개뿐이라 점점 줄어요. 윈도우는 점점 비싸져서 속도가 떨어지기 시작해요.`,
      try: [
        'p를 0.86에서 <b>0.5</b>로 끌어 보세요. 최적 윈도우가 3에서 1로 줄어요. 수락률이 낮으면 뒤의 드래프트는 거의 헛추측이에요.',
        'p를 <b>0.40</b>까지 끌어 보세요. k = 1 막대가 추측 안 함보다 조금 높지만 문턱선을 넘지 못해서 컨트롤러는 <b>k = 0</b>을 골라요. 터미널의 "문턱" 줄을 보세요.',
        '드래프트당 비용을 <b>5 ms</b>로 끌어 보세요. 최적 윈도우가 3에서 1로 떨어져요. 드래프트 작성에도 시간이 들어서, 드래프트가 느릴수록 많이 추측할 가치가 줄어요.',
      ],

      eCode: 'ACCEPT_TRACKER', eTitle: '수락률 트래커(EMA)', eTag: '교육용 추정 · 수락 여부는 난수로 시뮬레이션',
      eIntro: 'MTP는 라운드마다 3개를 고정으로 추측해요. 처음 150라운드는 실제 수락률이 0.86이에요. 150라운드부터 주제가 바뀌어서 0.55로 떨어져요. 컨트롤러는 실제 값을 볼 수 없고, 라운드마다의 결과에서 <b>지수 이동 평균</b>으로 추정해야 해요. <b>한 단계</b>를 눌러 한 라운드가 어떻게 기록되는지 보고, <b>300라운드 끝까지</b>를 눌러 추정이 변화를 어떻게 따라가는지 보세요.',
      eLgTrue: '실제 수락률(컨트롤러는 못 봐요)', eLgP1: '드래프트 1의 추정 p₁', eLgP3: '드래프트 3의 추정 p₃', eLgK: '아래 작은 막대: 그 시점의 추정으로 고를 k',
      eSteps: ['드래프트 3개 작성', '검증 한 번', '수락 개수 세기', '기록(EMA)', '윈도우 재추정'],
      eChart: '라운드에 따른 추정값 변화 꺾은선 그래프', eSwitch: '주제 전환', eRound: '라운드',
      bStep: '▶ 한 단계', bAll: '▶▶ 300라운드 끝까지', bReset: '초기화', bSeed: '다른 난수 쓰기',
      aLabel: '갱신 가중치 α', naive: '잘못된 방식: 검증하지 않은 자리도 실패로 기록',
      sP1K: '드래프트 1의 추정 p₁', sP1F: (t) => `<b>새 추정 = 이전 추정 + α × (이번 결과 − 이전 추정)</b><br>실제 값 ${t}. 결과는 1 = 수락, 0 = 거부로 기록해요`,
      sP3K: '드래프트 3의 추정 p₃', sP3F: (t, naive) => naive ? `실제 값 ${t}<br><b>잘못 기록하면 p₁ × p₂ × p₃ 쪽으로 눌려요</b>` : `실제 값 ${t}<br><b>앞의 둘이 모두 수락된 라운드에서만 갱신해요</b>`,
      sHalfK: '반감기(오래된 데이터의 가중치가 절반이 되는 시간)', sHalfV: (h) => h + ' 라운드', sHalfF: '<b>= ln 0.5 ÷ ln(1 − α)</b><br>α가 클수록 빨리 잊고 빨리 따라가요',
      sNoiseK: '추정의 흔들림(표준편차)', sNoiseF: '<b>≈ √(α ÷ (2 − α) × p × (1 − p))</b><br>p = 0.86 기준이에요. α가 클수록 심하게 흔들려요',
      sKK: '지금의 추정으로 고를 값', sKV: (k) => 'k = ' + k, sKF: '<b>= 앞의 인터랙티브 그림의 규칙</b><br>이 시뮬레이션에서 윈도우는 3으로 고정이고, 제안만 봐요',
      eReady: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 눌러 시작하세요',
      e0: (n, t) => `<span class="c">[${n}번째 라운드]</span> 실제 수락률 ${t}(컨트롤러는 몰라요). MTP가 드래프트 3개를 추측해요`,
      e1: '<span class="m">검증</span>: 큰 모델이 자리 4개(직전 토큰 + 드래프트 3개)를 한 번에 계산해요',
      e2: (a) => a === 3 ? '<span class="y">3개 모두 수락</span>, 큰 모델 자신의 1개를 더해 이번 라운드에 토큰 4개를 커밋해요' : `<span class="y">${a}개 수락</span>, ${a + 1}번째가 거부돼요. 이번 라운드에 토큰 ${a + 1}개를 커밋해요`,
      e3: (parts, p1) => `<span class="w">기록</span>: ${parts}. 이제 p₁은 ${p1}이에요`,
      e3ok: (i) => `자리 ${i} 성공 기록`, e3bad: (i) => `자리 ${i} 실패 기록`, e3skip: (i) => `자리 ${i}는 검증하지 않아 기록 안 함`,
      e3naive: (i) => `자리 ${i}는 검증하지 않았는데 실패로 기록(잘못된 방식)`, e3ext: '자리 4~8은 시험해 본 적이 없어서 p₃ 쪽으로 조금 당겨요',
      e4: (k) => `<span class="c">→</span> 새 추정으로는 컨트롤러가 지금 k = ${k}을 골라요`,
      eSwitchLog: '<span class="m">// 150번째 라운드: 주제가 바뀌어 실제 수락률이 0.86에서 0.55로 떨어져요</span>',
      eFast: '<span class="y">// 300번째 라운드까지 빨리 감기</span>',
      eDone: (p1, p3, k) => `<span class="y">완료</span>: p₁ ≈ ${p1}, p₃ ≈ ${p3}, 컨트롤러는 k = ${k}을 골라요`,
      eEnd: '<span class="y">// 300라운드를 모두 돌았어요. [ 초기화 ]를 눌러 다시 하세요</span>',
      eVerdict: (a, h, before, after, k0, k1, naive, p3) => `α = ${a}일 때 추정은 약 ${h}라운드 만에 오래된 데이터의 비중을 절반으로 잊어요. 주제가 바뀌기 전 p₁ ≈ ${before}, 마지막에는 ≈ ${after}예요. 추정으로 고르는 윈도우는 k = ${k0}에서 k = ${k1}로 바뀌어요.` +
        (naive ? `<br>잘못된 방식을 켰어요. p₃가 마지막에 ${p3}뿐이라 실제 값 0.55보다 낮아요. 검증하지 않은 자리가 실패로 취급되고, 뒤쪽 자리는 거듭 감점돼서, 컨트롤러는 긴 윈도우가 이득이 아니라고 착각해요.` : '<br>α를 키워서 다시 돌려 보세요. 더 빨리 따라가지만 곡선이 더 심하게 흔들려요. α는 "반응이 빠름"과 "잡음에 속지 않음" 사이의 트레이드오프예요.'),
      eTry: [
        '기본 α = 0.05로 300라운드를 끝까지 돌려 보세요. 150라운드 뒤에도 p₁ 곡선이 눈에 띄게 내려가기까지 십여 라운드가 걸려요. 이게 평균의 <b>지연</b>이에요.',
        'α를 <b>0.3</b>으로 올리고 다시 돌려 보세요. 반감기가 2라운드도 안 돼서 주제가 바뀐 뒤 거의 바로 따라가지만, 곡선이 위아래로 마구 튀어요. 이게 <b>잡음</b>이에요.',
        '"잘못된 방식"을 체크하고 다시 돌려 보세요. 처음 150라운드의 p₃가 0.64쯤(≈ 0.86³)으로 떨어지고, 아래쪽 제안 k가 작아져요. "보지 못함"을 "실패"로 치면 긴 윈도우가 억울한 누명을 써요.',
      ],
    },
    ja: {
      code: 'DRAFT_WINDOW', title: 'ドラフトウィンドウの最適化', tag: '教育用の試算 · ソースの既定コスト',
      intro: '3 つのスライダーを動かしてください。各棒は、1 種類のウィンドウ（k 個のドラフトを推測）の速度です。<b>速度 = 1 ラウンドの期待コミットトークン数 ÷ 1 ラウンドの時間</b>。時間の式と既定値は、Strata の <code>CostModel</code> をそのまま使っています。計算をやさしくするため、ここではどの位置にも同じ受理率 p を使います。',
      lgBar: 'ある k の速度（token/s）', lgPick: 'Strata のルールが選ぶ k', lgLine: 'しきい値：推測なしの速度 × 1.05',
      chartLabel: 'k = 0 から 8 の速度の棒グラフ',
      pLabel: '受理率 p', hLabel: 'VRAM ヒット率', dLabel: 'ドラフト 1 個のコスト',
      axis: 'token/s', kTick: (k) => 'k=' + k,
      sPickK: 'Strata のルールが選ぶ値', sPickV: (k) => 'k = ' + k,
      sPickF: (bk) => `<b>= 「期待トークン数 ÷ 1 ラウンドの時間」が最大になる k</b><br>しかも推測なしより 5% 以上速い必要があります${bk ? `。しきい値がなければ k = ${bk} を選びます` : ''}`,
      sEK: 'このウィンドウの 1 ラウンドの期待コミット数', sEV: (e) => e + ' 個', sEF: (k) => k ? `<b>= 1 + p + p² + … + p^${k}</b><br>1 個目はターゲットモデル自身が出すので、必ず得られます` : '<b>= 1</b><br>推測なし：毎ラウンド、ターゲットモデル自身の 1 個だけ',
      sMsK: '1 ラウンドの時間', sMsF: (d, c, s, r) => `<b>= 密な部分 ${d} + CPU エキスパート ${c} + 同期 ${s} + ドラフト作成 ${r}</b><br>単位はすべてミリ秒`,
      sRateK: '速度', sRateF: (e, ms, x) => `<b>= ${e} ÷ ${ms} ms × 1000</b><br>推測なしの ${x} 倍`,
      ready: '<span class="c">$</span> ready. スライダーを動かすと、棒と右側の式がいっしょに変わります',
      log: (p, h, d, k, rate, x) => `<span class="c">p=${p}</span> ヒット率=${h} ドラフト=${d} ms → <span class="y">k=${k} を選択</span>、${rate} token/s、推測なしの ${x} 倍`,
      logGate: (bk) => `<span class="m">しきい値</span>：k=${bk} は推測なしより 5% も速くないので、コントローラは推測しないほうを選びます`,
      verdict: (k, bk, p) => k === 0
        ? (bk ? `受理率 ${p} では、${bk} 個推測してもほんの少し速いだけで、5% のしきい値に届きません。だから答えは<b>推測しない</b>です。このしきい値は、ほぼゼロの利益のために、コントローラが危ない橋を渡るのを防ぎます。` : `受理率 ${p} では、どのドラフトも割に合いません。外れたドラフトは検証の時間を増やすだけです。コントローラは<b>推測しない</b>に戻ります。`)
        : `受理率 ${p} でいちばんお得なのは、<b>${k} 個推測する</b>ことです。それより先は、k 個目のドラフトの貢献が p^k 個しかなく、どんどん減ります。ウィンドウはどんどん高くなるので、速度は下がり始めます。`,
      try: [
        'p を 0.86 から <b>0.5</b> まで引き下げます。最良のウィンドウは 3 から 1 に縮みます。受理率が低いと、後ろのドラフトはほとんど無駄な推測になります。',
        'p を <b>0.40</b> まで引き下げます。k = 1 の棒は、推測なしよりまだ少し高いのに、しきい値の線に届かず、コントローラは <b>k = 0</b> を選びます。ターミナルの「しきい値」の行を見てください。',
        'ドラフト 1 個のコストを <b>5 ms</b> に上げます。最良のウィンドウは 3 から 1 に下がります。ドラフト作成にも時間がかかります。ドラフトが遅いほど、多く推測する価値は減ります。',
      ],

      eCode: 'ACCEPT_TRACKER', eTitle: '受理率トラッカー（EMA）', eTag: '教育用の試算 · 受理かどうかは乱数でシミュレーション',
      eIntro: 'MTP は毎ラウンド、固定で 3 個推測します。最初の 150 ラウンドは、真の受理率が 0.86 です。第 150 ラウンドから話題が変わり、0.55 に下がります。コントローラには真の値が見えません。各ラウンドの結果から、<b>指数移動平均</b>で推定するしかありません。<b>ステップ</b>で、1 ラウンドの記帳のしかたを見ましょう。<b>300 ラウンド実行</b>で、推定が変化に追いつく様子を見ましょう。',
      eLgTrue: '真の受理率（コントローラには見えない）', eLgP1: '1 個目のドラフトの推定 p₁', eLgP3: '3 個目のドラフトの推定 p₃', eLgK: '下の小さな棒：その時点の推定で選ぶ k',
      eSteps: ['3 個推測', '1 回検証', '受理数を数える', '記帳（EMA）', 'ウィンドウを再推定'],
      eChart: 'ラウンドごとの推定値の折れ線グラフ', eSwitch: '話題が変わる', eRound: 'ラウンド',
      bStep: '▶ ステップ', bAll: '▶▶ 300 ラウンド実行', bReset: 'リセット', bSeed: '乱数を変える',
      aLabel: '更新の重み α', naive: '誤ったやり方：検証されなかった位置も失敗として記録する',
      sP1K: '1 個目のドラフトの推定 p₁', sP1F: (t) => `<b>新しい推定 = 古い推定 + α × (今回の結果 − 古い推定)</b><br>真の値 ${t}。結果は 1 = 受理、0 = 拒否`,
      sP3K: '3 個目のドラフトの推定 p₃', sP3F: (t, naive) => naive ? `真の値 ${t}<br><b>誤った記帳では、p₁ × p₂ × p₃ に向かって下がります</b>` : `真の値 ${t}<br><b>最初の 2 個が受理されたラウンドだけで更新されます</b>`,
      sHalfK: '半減期（古いデータの重みが半分になる）', sHalfV: (h) => h + ' ラウンド', sHalfF: '<b>= ln 0.5 ÷ ln(1 − α)</b><br>α が大きいほど、忘れるのも追いつくのも速い',
      sNoiseK: '推定の揺れ（標準偏差）', sNoiseF: '<b>≈ √(α ÷ (2 − α) × p × (1 − p))</b><br>p = 0.86 で計算。α が大きいほど、揺れがひどい',
      sKK: 'いまの推定が選ぶ値', sKV: (k) => 'k = ' + k, sKF: '<b>= 前のインタラクティブ図のルール</b><br>このシミュレーションでは、ウィンドウは 3 のまま。見るのは提案だけ',
      eReady: '<span class="c">$</span> ready. [ ▶ ステップ ] を押して始めましょう',
      e0: (n, t) => `<span class="c">[第 ${n} ラウンド]</span> 真の受理率は ${t}（コントローラは知りません）。MTP がドラフトを 3 個推測しました`,
      e1: '<span class="m">検証</span>：ターゲットモデルが 4 つの位置（直前のトークン + ドラフト 3 個）を 1 回で計算します',
      e2: (a) => a === 3 ? '<span class="y">3 個とも受理</span>。ターゲット自身の 1 個を足して、このラウンドは 4 トークンをコミットします' : `<span class="y">${a} 個受理</span>、${a + 1} 個目のドラフトは拒否。このラウンドは ${a + 1} トークンをコミットします`,
      e3: (parts, p1) => `<span class="w">記帳</span>：${parts}。p₁ は ${p1} になりました`,
      e3ok: (i) => `位置 ${i} は成功と記録`, e3bad: (i) => `位置 ${i} は失敗と記録`, e3skip: (i) => `位置 ${i} は未検証なので記録しない`,
      e3naive: (i) => `位置 ${i} は未検証なのに失敗と記録（誤ったやり方）`, e3ext: '位置 4〜8 は未試行なので、p₃ のほうへ少し引き寄せる',
      e4: (k) => `<span class="c">→</span> 新しい推定では、コントローラはいま k = ${k} を選びます`,
      eSwitchLog: '<span class="m">// 第 150 ラウンド：話題が変わり、真の受理率が 0.86 から 0.55 に下がります</span>',
      eFast: '<span class="y">// 第 300 ラウンドまで早送り</span>',
      eDone: (p1, p3, k) => `<span class="y">完了</span>：p₁ ≈ ${p1}、p₃ ≈ ${p3}、コントローラは k = ${k} を選びます`,
      eEnd: '<span class="y">// 300 ラウンドが終わりました。[ リセット ] でもう一度</span>',
      eVerdict: (a, h, before, after, k0, k1, naive, p3) => `α = ${a} のとき、推定は約 ${h} ラウンドで、古いデータの重みを半分忘れます。話題が変わる前は p₁ ≈ ${before}、最後は ≈ ${after} です。推定が選ぶウィンドウは、k = ${k0} から k = ${k1} に変わりました。` +
        (naive ? `<br>誤ったやり方をオンにしました。p₃ は最後に ${p3} しかなく、真の 0.55 より低くなっています。未検証の位置が失敗として数えられ、後ろの位置は何度も減点されました。コントローラは「長いウィンドウは割に合わない」と思い込みます。` : '<br>α を大きくして、もう一度実行してください。追いつくのは速くなりますが、曲線の揺れもひどくなります。α は「反応の速さ」と「ノイズにだまされない安定さ」のバランスです。'),
      eTry: [
        'まず既定の α = 0.05 で、300 ラウンドを最後まで実行します。第 150 ラウンドのあと、p₁ の曲線がはっきり下がり始めるまで、十数ラウンドかかります。これが平均の<b>遅れ</b>です。',
        'α を <b>0.3</b> に上げて、もう一度実行します。半減期は 2 ラウンド未満で、話題が変わるとほぼすぐ追いつきますが、曲線は上下に飛び跳ねます。これが<b>ノイズ</b>です。',
        '「誤ったやり方」にチェックを入れて、もう一度実行します。最初の 150 ラウンドで、もう p₃ が 0.64 くらい（≈ 0.86³）まで下がり、下に出る提案の k は小さくなります。「見えていない」を「失敗」と数えると、長いウィンドウに濡れ衣を着せます。',
      ],
    },
    es: {
      code: 'DRAFT_WINDOW', title: 'Optimizador de la ventana de borradores', tag: 'Estimación didáctica · costos por defecto del código',
      intro: 'Arrastra los tres controles. Cada barra es la velocidad de una ventana (adivinar k borradores), y <b>velocidad = tokens esperados confirmados por ronda ÷ tiempo por ronda</b>. La fórmula de tiempo y los valores por defecto están copiados del <code>CostModel</code> de Strata; para simplificar las cuentas, aquí todas las posiciones usan la misma tasa de aceptación p.',
      lgBar: 'Velocidad para un k (tokens/s)', lgPick: 'El k que elegiría la regla de Strata', lgLine: 'Umbral: velocidad sin borrador × 1,05',
      chartLabel: 'Gráfico de barras de la velocidad para k de 0 a 8',
      pLabel: 'Tasa de aceptación p', hLabel: 'Tasa de aciertos de la VRAM', dLabel: 'Costo por borrador',
      axis: 'tokens/s', kTick: (k) => 'k=' + k,
      sPickK: 'Elegiría la regla de Strata', sPickV: (k) => 'k = ' + k,
      sPickF: (bk) => `<b>= el k que maximiza «tokens esperados ÷ tiempo de ronda»</b><br>y debe superar a no adivinar en más de un 5%${bk ? `; sin el umbral elegiría k = ${bk}` : ''}`,
      sEK: 'Tokens esperados por ronda con esta ventana', sEV: (e) => e + ' tokens', sEF: (k) => k ? `<b>= 1 + p + p² + … + p^${k}</b><br>el primero viene del propio modelo grande, seguro` : '<b>= 1</b><br>sin adivinar: cada ronda recibe solo el 1 propio del modelo grande',
      sMsK: 'Tiempo por ronda', sMsF: (d, c, s, r) => `<b>= denso ${d} + expertos CPU ${c} + sync ${s} + borradores ${r}</b><br>todo en milisegundos`,
      sRateK: 'Velocidad', sRateF: (e, ms, x) => `<b>= ${e} ÷ ${ms} ms × 1000</b><br>${x}× la velocidad sin borrador`,
      ready: '<span class="c">$</span> ready. Arrastra un control; las barras y las fórmulas de la derecha cambian juntas',
      log: (p, h, d, k, rate, x) => `<span class="c">p=${p}</span> aciertos=${h} borrador=${d} ms → <span class="y">elige k=${k}</span>, ${rate} tokens/s, ${x}× sin adivinar`,
      logGate: (bk) => `<span class="m">Umbral</span>: k=${bk} supera a no adivinar en menos de un 5%, así que el controlador prefiere no adivinar`,
      verdict: (k, bk, p) => k === 0
        ? (bk ? `Con una tasa de aceptación de ${p}, adivinar ${bk} es solo un poquito más rápido y no llega al umbral del 5%, así que la respuesta es <b>no adivinar</b>. El umbral evita que el controlador corra riesgos por una ganancia casi nula.` : `Con una tasa de aceptación de ${p}, ningún borrador compensa: los borradores erróneos solo añaden tiempo de verificación. El controlador vuelve a <b>no adivinar</b>.`)
        : `Con una tasa de aceptación de ${p}, el mejor trato es <b>adivinar ${k}</b>. Más allá, el k-ésimo borrador aporta solo p^k tokens, cada vez menos, mientras la ventana sigue encareciéndose, así que la velocidad empieza a bajar.`,
      try: [
        'Arrastra p de 0,86 hacia <b>0,5</b>: la mejor ventana se encoge de 3 a 1. Cuando la aceptación es baja, los borradores posteriores son apuestas casi desperdiciadas.',
        'Arrastra p a <b>0,40</b>: la barra de k = 1 sigue un poco por encima de no adivinar, pero no llega a la línea del umbral, así que el controlador elige <b>k = 0</b>. Busca la línea «Umbral» en la terminal.',
        'Sube el costo por borrador a <b>5 ms</b>: la mejor ventana baja de 3 a 1. Adivinar también toma tiempo; cuanto más lentos son los borradores, menos compensa adivinar más.',
      ],

      eCode: 'ACCEPT_TRACKER', eTitle: 'Rastreador de aceptación (EMA)', eTag: 'Estimación didáctica · aceptaciones simuladas con números aleatorios',
      eIntro: 'MTP adivina 3 fijos por ronda. Durante las primeras 150 rondas la tasa de aceptación real es 0,86; en la ronda 150 cambia el tema y baja a 0,55. El controlador no ve el valor real y debe estimarlo a partir del resultado de cada ronda con una <b>media móvil exponencial</b>. Pulsa <b>Paso</b> para ver cómo se registra una ronda, o <b>Ejecutar las 300 rondas</b> para ver cómo la estimación alcanza el cambio.',
      eLgTrue: 'Tasa de aceptación real (oculta para el controlador)', eLgP1: 'Estimación p₁ del borrador 1', eLgP3: 'Estimación p₃ del borrador 3', eLgK: 'Barritas de abajo: el k que elegiría la estimación',
      eSteps: ['Borrador 3', 'Una pasada de verificación', 'Contar aceptados', 'Registrar (EMA)', 'Volver a elegir ventana'],
      eChart: 'Gráfico de líneas de las estimaciones a lo largo de las rondas', eSwitch: 'cambio de tema', eRound: 'rondas',
      bStep: '▶ Paso', bAll: '▶▶ Ejecutar las 300 rondas', bReset: 'Reiniciar', bSeed: 'Nuevos números aleatorios',
      aLabel: 'Peso de actualización α', naive: 'Forma incorrecta: contar también como fallos las posiciones sin comprobar',
      sP1K: 'Estimación p₁ del borrador 1', sP1F: (t) => `<b>nueva estimación = estimación anterior + α × (este resultado − estimación anterior)</b><br>valor real ${t}; resultado 1 = aceptado, 0 = rechazado`,
      sP3K: 'Estimación p₃ del borrador 3', sP3F: (t, naive) => naive ? `valor real ${t}<br><b>la contabilidad errónea la empuja hacia p₁ × p₂ × p₃</b>` : `valor real ${t}<br><b>se actualiza solo en las rondas en que los dos primeros se aceptaron</b>`,
      sHalfK: 'Vida media (el peso de los datos viejos se reduce a la mitad)', sHalfV: (h) => h + ' rondas', sHalfF: '<b>= ln 0,5 ÷ ln(1 − α)</b><br>cuanto mayor α, más rápido olvida y más rápido alcanza',
      sNoiseK: 'Temblor de la estimación (desviación típica)', sNoiseF: '<b>≈ √(α ÷ (2 − α) × p × (1 − p))</b><br>calculado con p = 0,86; cuanto mayor α, peor el temblor',
      sKK: 'La estimación actual elegiría', sKV: (k) => 'k = ' + k, sKF: '<b>= la regla de la figura interactiva anterior</b><br>la ventana de esta simulación se queda en 3; esto es solo el consejo',
      eReady: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para empezar',
      e0: (n, t) => `<span class="c">[ronda ${n}]</span> tasa de aceptación real ${t} (el controlador no la conoce). MTP adivina 3 borradores`,
      e1: '<span class="m">Verificar</span>: el modelo grande calcula las 4 posiciones a la vez (el token anterior + 3 borradores)',
      e2: (a) => a === 3 ? '<span class="y">Los 3 aceptados</span>, más el 1 propio del modelo grande: esta ronda confirma 4 tokens' : `<span class="y">${a} aceptado(s)</span>, borrador ${a + 1} rechazado; esta ronda confirma ${a + 1} tokens`,
      e3: (parts, p1) => `<span class="w">Registrar</span>: ${parts}. Ahora p₁ es ${p1}`,
      e3ok: (i) => `posición ${i} anotada como acierto`, e3bad: (i) => `posición ${i} anotada como fallo`, e3skip: (i) => `posición ${i} sin comprobar, no se anota`,
      e3naive: (i) => `posición ${i} sin comprobar pero anotada como fallo (forma incorrecta)`, e3ext: 'posiciones 4–8 nunca probadas, empujadas hacia p₃',
      e4: (k) => `<span class="c">→</span> con las estimaciones nuevas, el controlador elegiría ahora k = ${k}`,
      eSwitchLog: '<span class="m">// ronda 150: cambio de tema, la aceptación real baja de 0,86 a 0,55</span>',
      eFast: '<span class="y">// avance rápido hasta la ronda 300</span>',
      eDone: (p1, p3, k) => `<span class="y">Listo</span>: p₁ ≈ ${p1}, p₃ ≈ ${p3}, el controlador elegiría k = ${k}`,
      eEnd: '<span class="y">// las 300 rondas terminaron; pulsa [ Reiniciar ] para repetir</span>',
      eVerdict: (a, h, before, after, k0, k1, naive, p3) => `Con α = ${a}, la estimación olvida la mitad del peso de los datos viejos en unas ${h} rondas. Antes del cambio de tema p₁ ≈ ${before}; al final ≈ ${after}; la ventana que elegiría la estimación pasó de k = ${k0} a k = ${k1}.` +
        (naive ? `<br>Activaste la forma incorrecta: p₃ acaba en solo ${p3}, por debajo del 0,55 real. Las posiciones sin comprobar se contaron como fallos, las posiciones posteriores se penalizaron una y otra vez, y el controlador pensará que las ventanas largas no compensan.` : '<br>Sube α y ejecuta de nuevo: alcanza más rápido, pero la curva tiembla más. α es el equilibrio entre «reaccionar rápido» y «no dejarse engañar por el ruido».'),
      eTry: [
        'Primero ejecuta las 300 rondas con el α por defecto = 0,05: tras la ronda 150, la curva de p₁ tarda una docena larga de rondas en bajar con claridad. Es el <b>retraso</b> de promediar.',
        'Sube α a <b>0,3</b> y ejecuta de nuevo: la vida media es menor de 2 rondas, así que alcanza casi de inmediato tras el cambio de tema, pero la curva da saltos arriba y abajo. Eso es el <b>ruido</b>.',
        'Marca «Forma incorrecta» y ejecuta de nuevo: p₃ cae a unos 0,64 (≈ 0,86³) ya en las primeras 150 rondas, y el k sugerido de abajo se hace más pequeño. Contar «sin ver» como «fallado» es injusto con las ventanas largas.',
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
