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
    ar: {
      code: 'SOFTMAX_LAB', title: 'كيف تتحول الدرجات إلى احتمالات', tag: 'تقدير تعليمي · درجات مفترضة',
      intro: 'لإكمال العبارة «ربّينا في بيتنا ＿＿»، أعطى النموذج كل كلمة من 5 كلمات مرشحة درجة (logit). اسحب <b>درجة الحرارة</b> لترى الاحتمالات تحدّ أو تتسطح؛ وارفع <b>مقياس الدرجات</b> وألغِ «طرح الأكبر» لترى كيف يفيض FP32. اضغط <b>خطوة</b> لتتبّع الحساب خطوة بخطوة.',
      lgTop: 'المرشح الأعلى احتمالًا', lgOther: 'مرشحون آخرون', lgBad: 'فيضان: ∞ أو NaN',
      cands: [['قط', 3.0], ['كلب', 2.0], ['طير', 1.0], ['سمك', 0.5], ['باص', -1.0]],
      steps: ['الدرجات الأصلية', 'القسمة على T', 'طرح الأكبر', 'أخذ الأُسّ', 'القسمة على المجموع'],
      cols: ['الكلمة', 'الدرجة', '÷T', '−m', 'eˣ', 'الاحتمال'],
      tLabel: 'درجة الحرارة T', sLabel: 'مقياس الدرجات', stable: 'اطرح الأكبر أولًا (موصى به)',
      bStep: '▶ خطوة', bReset: 'إعادة ضبط',
      greedy: 'greedy',
      ready: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ] لتحسب مع شريط الخطوات',
      s0: (top, low) => `<span class="c">الدرجات</span>: يعطي النموذج كل مرشح من الخمسة درجة. الأعلى «قط» = ${top}، والأدنى «باص» = ${low}. الدرجات قد تكون موجبة أو سالبة، وليست احتمالات بعد`,
      s1: (t) => `<span class="c">÷ درجة الحرارة</span>: نقسم كل درجة على T = ${t}. إذا كانت T أصغر من 1 اتسعت الفروق؛ وإذا كانت أكبر من 1 ضاقت`,
      s1g: '<span class="c">درجة الحرارة = 0</span>: لا قسمة؛ نسلك فرع greedy ونختار الأعلى درجة «قط». لا يبقى في جدول الاحتمالات إلا 1 واحد',
      s2: (m) => `<span class="m">طرح الأكبر</span>: نطرح m = ${m} من كل عدد؛ يصير الأكبر 0 وتصير البقية سالبة. هذه الخطوة لا تغيّر الاحتمالات النهائية`,
      s2off: '<span class="m">تخطٍّ</span>: لم نطرح الأكبر؛ تذهب الأعداد الأصلية مباشرة إلى الأُسّ',
      s3: (x) => `<span class="w">أخذ الأُسّ</span>: يحوّل eˣ كل عدد إلى عدد موجب. أكبر حدّ هو ${x}`,
      s3bad: (x) => `<span class="w">أخذ الأُسّ</span>: e أُسّ ${x} يتجاوز حدّ FP32 (نحو 3.4 × 10³⁸)، فخُزّن ∞`,
      s4: (sum, p) => `<span class="y">التطبيع</span>: نقسم كل حدّ على المجموع ${sum} فنحصل على الاحتمالات. «قط» يأخذ ${p}`,
      s4bad: '<span class="y">التطبيع</span>: ∞ ÷ ∞ = NaN، وتفسد كل الاحتمالات. هذه عاقبة عدم طرح الأكبر',
      sTopK: 'احتمال «قط»', sTopF: '<b>= e^(z₁/T − m) ÷ Σ e^(zᵢ/T − m)</b><br>m هو أكبر قيم zᵢ/T',
      sTopG: '<b>درجة الحرارة = 0: greedy</b><br>لا نحسب احتمالات، بل نختار الأعلى درجة',
      sExpK: 'أكبر حدّ أُسّي (مخزَّن بصيغة FP32)', sExpF: 'أكبر قيمة في FP32 نحو 3.4 × 10³⁸<br>أيّ أُسّ فوق 88.7 يفيض إلى ∞',
      sSumK: 'مجموع الاحتمالات', sSumF: '<b>= Σ pᵢ</b>، ويجب أن يساوي 1<br>بعد الفيضان يصير ∞ ÷ ∞ = NaN',
      try: [
        'اسحب درجة الحرارة إلى <b>0.2</b> ثم إلى <b>2.0</b>: يهبط احتمال «قط» من قرابة 100% إلى 40% وزيادة قليلة. درجة الحرارة تغيّر شكل التوزيع فقط، ولا تغيّر الترتيب.',
        'اضبط المقياس على <b>×50</b> وألغِ تحديد «طرح الأكبر»: تفيض الأسس إلى ∞ وتصير كل الاحتمالات NaN. حدّد الخيار ثانية فتعود الاحتمالات طبيعية فورًا. طرح الأكبر يمنع الفيضان فقط، ولا يغيّر الجواب.',
        'اسحب درجة الحرارة إلى <b>0</b>: لا تُحسب احتمالات بعد الآن، بل يُختار الأعلى درجة مباشرة. وفي معاملات أخذ العينات في Strata القاعدة نفسها: درجة الحرارة ≤ 0 تعني greedy.',
      ],

      dCode: 'DICE', dTitle: 'رمي النرد حسب الاحتمال', dTag: 'تقدير تعليمي · الأرقام العشوائية من دالة تجزئة تعليمية، لا Philox',
      dIntro: 'عند درجة الحرارة T = 1 تقطّع احتمالات المرشحين الخمسة الخط [0, 1) إلى 5 مقاطع، وطول كل مقطع هو احتماله. في كل رمية يُحسب رقم عشوائي منتظم u من (البذرة, العدّاد)؛ وأي مقطع يقع فيه u تُختار كلمته.',
      dLgPick: 'الكلمة المختارة هذه المرة', dLgSeg: 'طول المقطع = الاحتمال', dLgU: 'قيمة u هذه المرة',
      dSteps: ['البذرة + العدّاد', 'حساب u', 'الاحتمالات التراكمية', 'إيجاد موضع السقوط', 'اختيار الكلمة'],
      bOne: '▶ ارمِ مرة', bHundred: '▶▶ ارمِ 100 مرة', bRewind: 'صفّر العدّاد',
      seed: 'البذرة seed',
      dReady: '<span class="c">$</span> ready. اضغط [ ▶ ارمِ مرة ]',
      draw: (n, c, u, lo, hi, tok) => `<span class="c">#${n}</span> العدّاد ${c} ← u = ${u}، يقع في [${lo}, ${hi}) ← يختار «${tok}»`,
      batch: (n, top) => `<span class="y">// رُميت 100 مرة: المجموع ${n} رمية، وظهر «قط» ${top} مرة</span>`,
      rewind: (s) => `<span class="y">// عاد العدّاد إلى الصفر والبذرة ما زالت ${s}. ارمِ مرة أخرى فتتكرر المتتالية نفسها تمامًا</span>`,
      reseed: (s) => `<span class="y">// تغيّرت البذرة إلى ${s} وعاد العدّاد إلى الصفر. تغيّرت متتالية الأرقام العشوائية كلها</span>`,
      uK: 'قيمة u والنتيجة هذه المرة', uF: (s, c) => `<b>u = تجزئة(البذرة ${s}، العدّاد ${c})</b><br>العددان نفسهما يعطيان u نفسها دائمًا`,
      nK: 'عدد الرميات حتى الآن', nF: '<b>كل رمية تزيد العدّاد 1</b><br>«إعادة الضبط» ترجع بالعدّاد إلى 0 فقط',
      fK: 'تكرار ظهور «قط»', fF: (p) => `<b>= عدد مرات «قط» ÷ مجموع الرميات</b><br>الاحتمال النظري ${p}`,
      dTry: [
        'ارمِ 5 مرات ودوّن الكلمات المختارة. اضغط <b>صفّر العدّاد</b> ثم ارمِ 5 مرات أخرى: المتتالية نفسها تمامًا. جرّب بذرة أخرى: تتغيّر المتتالية.',
        'اضغط <b>ارمِ 100 مرة</b> عدة مرات: يتذبذب تكرار «قط» حول 62%، وكلما رميت أكثر قلّ التذبذب.',
        'انتبه إلى «باص»: احتماله نحو 1% فقط، فهو ليس مستحيلًا، بل نادر. أخذ العينات يختار أحيانًا كلمة منخفضة الاحتمال، ومن هنا يأتي تنوّع الإجابات.',
      ],
      dVerdict: '① كلما رميت أكثر اقترب تكرار كل كلمة من احتمالها.<br>② إذا ثبتت البذرة والعدّاد ثبتت u: «العشوائية» هنا محسوبة، فيمكن إعادة إنتاجها.<br>③ مولّد Philox الذي يستخدمه Strata قائم على عدّاد أيضًا: u تتحدد بـ (البذرة, الموضع) فقط، ولا علاقة لها بعدد مرات السحب السابقة.',
    },
    es: {
      code: 'SOFTMAX_LAB', title: 'Cómo las puntuaciones se vuelven probabilidades', tag: 'Estimación didáctica · puntuaciones supuestas',
      intro: 'Para completar «Mi mascota es un ___», el modelo dio a cada una de 5 palabras candidatas una puntuación (un logit). Arrastra la <b>temperatura</b> para ver cómo las probabilidades se vuelven más picudas o más planas; sube la <b>escala de puntuaciones</b> y desmarca «restar el máximo» para ver cómo FP32 se desborda. Pulsa <b>Paso</b> para recorrer el cálculo.',
      lgTop: 'Candidato más probable', lgOther: 'Otros candidatos', lgBad: 'Desbordamiento: ∞ o NaN',
      cands: [['gato', 3.0], ['loro', 2.0], ['pez', 1.0], ['oso', 0.5], ['auto', -1.0]],
      steps: ['Puntuaciones originales', 'Dividir por T', 'Restar el máximo', 'Exponencial', 'Dividir por la suma'],
      cols: ['tok', 'punt.', '÷T', '−m', 'eˣ', 'prob.'],
      tLabel: 'Temperatura T', sLabel: 'Escala de puntuaciones', stable: 'Restar antes el máximo (recomendado)',
      bStep: '▶ Paso', bReset: 'Reiniciar',
      greedy: 'voraz',
      ready: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para calcular a lo largo de la tira',
      s0: (top, low) => `<span class="c">Puntuaciones</span>: el modelo da una puntuación a cada uno de los 5 candidatos. La más alta, «gato», es ${top}; la más baja, «auto», es ${low}. Las puntuaciones pueden ser positivas o negativas y todavía no son probabilidades`,
      s1: (t) => `<span class="c">÷ temperatura</span>: se divide cada puntuación por T = ${t}. Con T menor que 1 las diferencias se amplían; con T mayor que 1 se reducen`,
      s1g: '<span class="c">Temperatura = 0</span>: no se divide; se toma la rama voraz y se elige el de mayor puntuación, «gato». La tabla de probabilidades queda con un solo 1',
      s2: (m) => `<span class="m">Restar el máximo</span>: a cada número se le resta m = ${m}; el mayor pasa a ser 0 y los demás quedan negativos. Este paso no cambia las probabilidades finales`,
      s2off: '<span class="m">Omitido</span>: no se resta el máximo; los números originales van directos a la exponencial',
      s3: (x) => `<span class="w">Exponencial</span>: eˣ vuelve positivo cada número. El término mayor es ${x}`,
      s3bad: (x) => `<span class="w">Exponencial</span>: e elevado a ${x} supera el límite de FP32 (unos 3,4 × 10³⁸) y se guarda como ∞`,
      s4: (sum, p) => `<span class="y">Normalizar</span>: se divide cada término por la suma ${sum} y salen las probabilidades. «gato» recibe ${p}`,
      s4bad: '<span class="y">Normalizar</span>: ∞ ÷ ∞ = NaN y todas las probabilidades se estropean. Eso pasa si no restas el máximo',
      sTopK: 'Probabilidad de «gato»', sTopF: '<b>= e^(z₁/T − m) ÷ Σ e^(zᵢ/T − m)</b><br>m es el mayor de todos los zᵢ/T',
      sTopG: '<b>Temperatura = 0: voraz</b><br>no se calculan probabilidades; se elige la puntuación más alta',
      sExpK: 'Mayor término exponencial (guardado en FP32)', sExpF: 'FP32 llega como máximo a unos 3,4 × 10³⁸<br>un exponente mayor que 88,7 se desborda a ∞',
      sSumK: 'Suma de las probabilidades', sSumF: '<b>= Σ pᵢ</b>, debería ser 1<br>tras el desbordamiento pasa a ∞ ÷ ∞ = NaN',
      try: [
        'Arrastra la temperatura a <b>0,2</b> y luego a <b>2,0</b>: la probabilidad de «gato» baja de casi 100 % a poco más de 40 %. La temperatura solo cambia la forma de la distribución, nunca el orden.',
        'Pon la escala en <b>×50</b> y desmarca «restar el máximo»: las exponenciales se desbordan a ∞ y todas las probabilidades pasan a NaN. Márcalo otra vez y las probabilidades vuelven a la normalidad al instante. Restar el máximo solo evita el desbordamiento; no cambia la respuesta.',
        'Arrastra la temperatura a <b>0</b>: ya no se calculan probabilidades; se elige directamente la puntuación más alta. Los parámetros de muestreo de Strata siguen la misma regla: temperatura ≤ 0 significa voraz.',
      ],

      dCode: 'DICE', dTitle: 'Lanzar un dado según la probabilidad', dTag: 'Estimación didáctica · números aleatorios de un hash didáctico, no Philox',
      dIntro: 'Con temperatura T = 1, las probabilidades de los 5 candidatos cortan la línea [0, 1) en 5 tramos, cada uno tan largo como su probabilidad. Cada lanzamiento calcula un número aleatorio uniforme u a partir de (semilla, contador); el tramo donde cae u indica la palabra elegida.',
      dLgPick: 'La palabra elegida esta vez', dLgSeg: 'Longitud del tramo = probabilidad', dLgU: 'La u de este lanzamiento',
      dSteps: ['Semilla + contador', 'Calcular u', 'Prob. acumuladas', 'Ver dónde cae u', 'Elegir la palabra'],
      bOne: '▶ Lanzar una vez', bHundred: '▶▶ Lanzar 100 veces', bRewind: 'Reiniciar contador',
      seed: 'Semilla',
      dReady: '<span class="c">$</span> ready. Pulsa [ ▶ Lanzar una vez ]',
      draw: (n, c, u, lo, hi, tok) => `<span class="c">#${n}</span> contador ${c} → u = ${u}, cae en [${lo}, ${hi}) → elige «${tok}»`,
      batch: (n, top) => `<span class="y">// 100 lanzamientos: ${n} en total, «gato» salió ${top} veces</span>`,
      rewind: (s) => `<span class="y">// contador a cero, la semilla sigue siendo ${s}. Si lanzas otra vez, la secuencia será exactamente igual</span>`,
      reseed: (s) => `<span class="y">// cambio a la semilla ${s}, contador a cero. Toda la secuencia aleatoria cambió</span>`,
      uK: 'La u de este lanzamiento y el resultado', uF: (s, c) => `<b>u = hash(semilla ${s}, contador ${c})</b><br>los mismos dos números siempre dan la misma u`,
      nK: 'Lanzamientos hasta ahora', nF: '<b>cada lanzamiento suma 1 al contador</b><br>«Reiniciar» solo devuelve el contador a 0',
      fK: 'Con qué frecuencia salió «gato»', fF: (p) => `<b>= veces de «gato» ÷ lanzamientos totales</b><br>probabilidad teórica ${p}`,
      dTry: [
        'Lanza 5 veces y anota las palabras elegidas. Pulsa <b>Reiniciar contador</b> y lanza otras 5: la secuencia es exactamente la misma. Prueba con otra semilla: la secuencia cambia.',
        'Pulsa varias veces <b>Lanzar 100 veces</b>: la frecuencia de «gato» oscila alrededor de 62 %, y cuantos más lanzamientos, menor es la oscilación.',
        'Fíjate en «auto»: solo tiene un 1 % aproximadamente; no es imposible, solo raro. El muestreo elige de vez en cuando una palabra poco probable; eso da variedad a las respuestas.',
      ],
      dVerdict: '① Cuantos más lanzamientos, más se acerca la frecuencia de cada palabra a su probabilidad.<br>② Si la semilla y el contador no cambian, u no cambia: la «aleatoriedad» de aquí se calcula, así que se puede reproducir.<br>③ El generador Philox que usa Strata también es por contador: u depende solo de (semilla, posición), no de cuántos números se sacaron antes.',
    },
    ko: {
      code: 'SOFTMAX_LAB', title: '점수가 확률이 되는 과정', tag: '교육용 추정 · 점수는 가정',
      intro: '모델이 「우리 집에서 키우는 ＿＿」를 완성하려고 후보 단어 5개에 점수(로짓)를 하나씩 매겼어요. <b>온도</b>를 끌어서 확률이 뾰족해지거나 평평해지는 걸 보세요. 점수를 <b>키우고</b> 「최댓값 빼기」를 해제하면 FP32가 오버플로하는 모습을 볼 수 있어요. <b>단계</b>를 누르면 계산을 한 단계씩 따라가요.',
      lgTop: '확률이 가장 높은 후보', lgOther: '다른 후보', lgBad: '오버플로: ∞ 또는 NaN',
      cands: [['고양이', 3.0], ['개', 2.0], ['새', 1.0], ['쥐', 0.5], ['자동차', -1.0]],
      steps: ['원래 점수', '온도로 나누기', '최댓값 빼기', '지수 취하기', '합으로 나누기'],
      cols: ['단어', '점수', '÷T', '−m', 'eˣ', '확률'],
      tLabel: '온도 T', sLabel: '점수 배율', stable: '먼저 최댓값 빼기 (권장)',
      bStep: '▶ 단계', bReset: '초기화',
      greedy: '그리디',
      ready: '<span class="c">$</span> ready. [ ▶ 단계 ]를 눌러 흐름 막대를 따라 계산해 보세요',
      s0: (top, low) => `<span class="c">점수</span>: 모델이 후보 5개에 점수를 하나씩 매겨요. 가장 높은 「고양이」는 ${top}, 가장 낮은 「자동차」는 ${low}예요. 점수는 양수도 음수도 될 수 있고, 아직 확률이 아니에요`,
      s1: (t) => `<span class="c">÷ 온도</span>: 모든 점수를 T = ${t}로 나눠요. T가 1보다 작으면 차이가 커지고, 1보다 크면 차이가 줄어요`,
      s1g: '<span class="c">온도 = 0</span>: 나눗셈은 하지 않고 그리디 분기로 가서, 점수가 가장 높은 「고양이」를 골라요. 확률표에는 1 하나만 남아요',
      s2: (m) => `<span class="m">최댓값 빼기</span>: 모든 수에서 m = ${m}를 빼요. 가장 큰 수는 0이 되고 나머지는 음수예요. 이 단계는 최종 확률을 바꾸지 않아요`,
      s2off: '<span class="m">건너뜀</span>: 최댓값을 빼지 않고 원래 수에 바로 지수를 취해요',
      s3: (x) => `<span class="w">지수 취하기</span>: eˣ가 모든 수를 양수로 만들어요. 가장 큰 항은 ${x}예요`,
      s3bad: (x) => `<span class="w">지수 취하기</span>: e의 ${x}제곱이 FP32의 한도(약 3.4 × 10³⁸)를 넘어서 ∞로 저장됐어요`,
      s4: (sum, p) => `<span class="y">정규화</span>: 각 항을 합 ${sum}으로 나눠서 확률을 얻어요. 「고양이」는 ${p}예요`,
      s4bad: '<span class="y">정규화</span>: ∞ ÷ ∞ = NaN이라서 확률이 모두 망가졌어요. 최댓값을 빼지 않으면 이렇게 돼요',
      sTopK: '「고양이」의 확률', sTopF: '<b>= e^(z₁/T − m) ÷ Σ e^(zᵢ/T − m)</b><br>m은 모든 zᵢ/T 중 가장 큰 값',
      sTopG: '<b>온도 = 0: 그리디</b><br>확률은 계산하지 않고 최고 점수를 바로 골라요',
      sExpK: '가장 큰 지수 항 (FP32로 저장)', sExpF: 'FP32의 최댓값은 약 3.4 × 10³⁸<br>e의 지수가 88.7을 넘으면 ∞로 오버플로',
      sSumK: '확률의 합', sSumF: '<b>= Σ pᵢ</b>, 1이어야 해요<br>오버플로하면 ∞ ÷ ∞ = NaN',
      try: [
        '온도를 <b>0.2</b>로, 그다음 <b>2.0</b>으로 끌어 보세요. 「고양이」의 확률이 100%에 가까운 값에서 40%를 조금 넘는 값으로 내려가요. 온도는 분포의 모양만 바꾸고 순위는 바꾸지 않아요.',
        '배율을 <b>×50</b>으로 올리고 「최댓값 빼기」를 해제해 보세요. 지수 항이 ∞로 오버플로하고 확률이 모두 NaN이 돼요. 다시 체크하면 확률이 곧바로 정상으로 돌아와요. 최댓값 빼기는 오버플로만 막고 답은 바꾸지 않아요.',
        '온도를 <b>0</b>으로 끌어 보세요. 확률을 더는 계산하지 않고 최고 점수를 바로 골라요. Strata의 샘플링 파라미터도 같은 약속이에요. 온도 ≤ 0이면 그리디예요.',
      ],

      dCode: 'DICE', dTitle: '확률대로 주사위 굴리기', dTag: '교육용 추정 · 난수는 교육용 해시이며 Philox가 아님',
      dIntro: '온도 T = 1일 때 후보 5개의 확률이 [0, 1) 선을 5개 구간으로 나눠요. 구간 길이가 곧 확률이에요. 한 번 굴릴 때마다 (시드, 카운터)로 균등 난수 u를 계산하고, u가 떨어진 구간의 단어를 골라요.',
      dLgPick: '이번에 선택된 단어', dLgSeg: '구간 길이 = 확률', dLgU: '이번의 u',
      dSteps: ['시드 + 카운터', 'u 계산', '누적 확률 찾기', '떨어진 구간 찾기', '단어 선택'],
      bOne: '▶ 한 번 굴리기', bHundred: '▶▶ 100번 연속 굴리기', bRewind: '카운터 초기화',
      seed: '시드 seed',
      dReady: '<span class="c">$</span> ready. [ ▶ 한 번 굴리기 ]를 눌러 보세요',
      draw: (n, c, u, lo, hi, tok) => `<span class="c">#${n}</span> 카운터 ${c} → u = ${u}, [${lo}, ${hi}) 구간에 떨어짐 → 「${tok}」 선택`,
      batch: (n, top) => `<span class="y">// 100번 연속 굴림: 모두 ${n}번 중 「고양이」가 ${top}번 나왔어요</span>`,
      rewind: (s) => `<span class="y">// 카운터를 0으로 되돌렸어요. 시드는 그대로 ${s}예요. 다시 굴리면 수열이 똑같이 나와요</span>`,
      reseed: (s) => `<span class="y">// 시드를 ${s}로 바꾸고 카운터를 0으로 되돌렸어요. 난수 수열이 완전히 달라졌어요</span>`,
      uK: '이번의 u와 결과', uF: (s, c) => `<b>u = 해시(시드 ${s}, 카운터 ${c})</b><br>같은 두 수에서는 언제나 같은 u가 나와요`,
      nK: '지금까지 굴린 횟수', nF: '<b>한 번 굴릴 때마다 카운터가 1 늘어요</b><br>「초기화」는 카운터만 0으로 되돌려요',
      fK: '「고양이」가 나온 빈도', fF: (p) => `<b>= 「고양이」 횟수 ÷ 전체 횟수</b><br>이론상 확률 ${p}`,
      dTry: [
        '5번 굴려서 선택된 단어를 적어 두세요. <b>카운터 초기화</b>를 누르고 5번 더 굴리면 수열이 똑같아요. 시드를 바꿔서 다시 해 보면 수열이 달라져요.',
        '<b>100번 연속 굴리기</b>를 몇 번 눌러 보세요. 「고양이」의 빈도가 62% 근처에서 흔들리고, 많이 굴릴수록 흔들림이 작아져요.',
        '「자동차」를 눈여겨보세요. 확률이 약 1%뿐이라 불가능한 게 아니라 드물게 나올 뿐이에요. 샘플링이 가끔 확률이 낮은 단어를 고르기 때문에 답이 달라질 수 있어요.',
      ],
      dVerdict: '① 많이 굴릴수록 각 단어의 빈도가 그 단어의 확률에 가까워져요.<br>② 시드와 카운터가 같으면 u도 같아요. 여기서 「무작위」는 계산된 것이라서 재현할 수 있어요.<br>③ Strata가 쓰는 Philox도 카운터 기반이에요. u는 (시드, 위치)로만 정해지고, 앞에서 몇 번 뽑았는지와는 상관이 없어요.',
    },
    ja: {
      code: 'SOFTMAX_LAB', title: 'スコアが確率になるまで', tag: '教育用の試算 · スコアは仮定',
      intro: 'モデルが「うちで飼っているのは一匹の＿＿」を補完するため、5 つの候補語にそれぞれスコア（ロジット）を付けました。<b>温度</b>をドラッグして、確率が尖るか平らになるかを見てください。スコアを<b>拡大</b>して「最大値を引く」を外すと、FP32 がオーバーフローするのが見られます。<b>ステップ</b>を押すと、計算を 1 段ずつ追えます。',
      lgTop: '確率が最も高い候補', lgOther: 'その他の候補', lgBad: 'オーバーフロー：∞ または NaN',
      cands: [['猫', 3.0], ['犬', 2.0], ['鳥', 1.0], ['魚', 0.5], ['車', -1.0]],
      steps: ['元のスコア', '温度で割る', '最大値を引く', '指数を取る', '合計で割る'],
      cols: ['語', 'スコア', '÷T', '−m', 'eˣ', '確率'],
      tLabel: '温度 T', sLabel: 'スコア拡大', stable: '先に最大値を引く（推奨）',
      bStep: '▶ ステップ', bReset: 'リセット',
      greedy: '貪欲',
      ready: '<span class="c">$</span> ready. [ ▶ ステップ ] を押して、流れ図に沿って計算しよう',
      s0: (top, low) => `<span class="c">スコア</span>：モデルが 5 つの候補にスコアを付けます。最高の「猫」は ${top}、最低の「車」は ${low} です。スコアは正でも負でもよく、まだ確率ではありません`,
      s1: (t) => `<span class="c">÷ 温度</span>：各スコアを T = ${t} で割ります。T が 1 より小さいと差が広がり、1 より大きいと差が縮まります`,
      s1g: '<span class="c">温度 = 0</span>：割り算はせず、貪欲の分岐に進んで、最高スコアの「猫」を選びます。確率表には 1 だけが残ります',
      s2: (m) => `<span class="m">最大値を引く</span>：すべての数から m = ${m} を引きます。最大のものは 0 になり、残りは負の数です。このステップは最終的な確率を変えません`,
      s2off: '<span class="m">スキップ</span>：最大値を引かず、元の数をそのまま指数に入れます',
      s3: (x) => `<span class="w">指数を取る</span>：eˣ ですべての数が正になります。最大の項は ${x} です`,
      s3bad: (x) => `<span class="w">指数を取る</span>：e の ${x} 乗は FP32 の上限（約 3.4 × 10³⁸）を超え、∞ として保存されました`,
      s4: (sum, p) => `<span class="y">正規化</span>：各項を合計 ${sum} で割って確率にします。「猫」は ${p} です`,
      s4bad: '<span class="y">正規化</span>：∞ ÷ ∞ = NaN になり、すべての確率が壊れました。最大値を引かないと、こうなります',
      sTopK: '「猫」の確率', sTopF: '<b>= e^(z₁/T − m) ÷ Σ e^(zᵢ/T − m)</b><br>m は全 zᵢ/T の中で最大のもの',
      sTopG: '<b>温度 = 0：貪欲</b><br>確率は計算せず、最高スコアを直接選ぶ',
      sExpK: '最大の指数項（FP32 で保存）', sExpF: 'FP32 の最大値は約 3.4 × 10³⁸<br>e の指数が 88.7 を超えると ∞ にオーバーフロー',
      sSumK: '確率の合計', sSumF: '<b>= Σ pᵢ</b>、1 になるはず<br>オーバーフローすると ∞ ÷ ∞ = NaN',
      try: [
        '温度を <b>0.2</b> に、次に <b>2.0</b> にしてみましょう。「猫」の確率は、100% 近くから 40% 少しまで下がります。温度が変えるのは分布の形だけで、順位は変えません。',
        '拡大率を <b>×50</b> にして、「最大値を引く」のチェックを外します。指数項が ∞ にオーバーフローし、確率はすべて NaN になります。もう一度チェックすると、確率はすぐ元に戻ります。最大値を引くのはオーバーフロー対策だけで、答えは変えません。',
        '温度を <b>0</b> にしてみましょう。確率は計算されず、最高スコアが直接選ばれます。Strata のサンプリングパラメータも同じ決まりです。温度 ≤ 0 は貪欲です。',
      ],

      dCode: 'DICE', dTitle: '確率どおりにサイコロを振る', dTag: '教育用の試算 · 乱数は教育用ハッシュで、Philox ではない',
      dIntro: '温度 T = 1 のとき、5 つの候補の確率が [0, 1) の線を 5 つの区間に切ります。区間の長さが確率です。1 回振るごとに、（シード, カウンタ）から一様乱数 u を計算し、それが落ちた区間の単語を選びます。',
      dLgPick: '今回選ばれた語', dLgSeg: '区間の長さ = 確率', dLgU: '今回の u',
      dSteps: ['シード + カウンタ', 'u を計算', '累積確率を見る', '落ちた区間を探す', '語を選ぶ'],
      bOne: '▶ 1 回振る', bHundred: '▶▶ 100 回続けて振る', bRewind: 'カウンタをリセット',
      seed: 'シード seed',
      dReady: '<span class="c">$</span> ready. [ ▶ 1 回振る ] を押そう',
      draw: (n, c, u, lo, hi, tok) => `<span class="c">#${n}</span> カウンタ ${c} → u = ${u}、[${lo}, ${hi}) に落ちた → 「${tok}」を選択`,
      batch: (n, top) => `<span class="y">// 100 回続けて振りました：合計 ${n} 回、「猫」は ${top} 回出ました</span>`,
      rewind: (s) => `<span class="y">// カウンタを 0 に戻しました。シードは ${s} のままです。もう一度振ると、同じ系列になります</span>`,
      reseed: (s) => `<span class="y">// シードを ${s} に変え、カウンタを 0 に戻しました。乱数の系列がすべて変わりました</span>`,
      uK: '今回の u と結果', uF: (s, c) => `<b>u = ハッシュ(シード ${s}, カウンタ ${c})</b><br>同じ 2 つの数からは、いつも同じ u が出る`,
      nK: 'ここまでに振った回数', nF: '<b>1 回振るごとに、カウンタが 1 増える</b><br>「リセット」はカウンタを 0 に戻すだけ',
      fK: '「猫」が出た頻度', fF: (p) => `<b>=「猫」の回数 ÷ 総回数</b><br>理論上の確率 ${p}`,
      dTry: [
        '5 回振って、選ばれた語をメモします。<b>カウンタをリセット</b>してもう 5 回振ると、系列はまったく同じです。シードを変えてもう一度やると、系列が変わります。',
        '<b>100 回続けて振る</b>を何回か押してみましょう。「猫」の頻度は 62% あたりで揺れ、振るほど揺れは小さくなります。',
        '「車」に注目してください。確率は約 1% で、起こり得ないのではなく、めったに出ないだけです。サンプリングがときどき確率の低い語を選ぶから、答えに変化が生まれます。',
      ],
      dVerdict: '① たくさん振るほど、各語の出現頻度は、その確率に近づきます。<br>② シードとカウンタが同じなら u も同じです。ここでの「ランダム」は計算されたものなので、再現できます。<br>③ Strata が使う Philox もカウンタ型です。u は（シード, 位置）だけで決まり、それまでに何回引いたかとは無関係です。',
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
