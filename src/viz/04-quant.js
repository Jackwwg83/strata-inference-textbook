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
    en: {
      code: 'FLOAT_BITS', title: 'One number, three ways to store it', tag: 'Teaching estimate · same rounding rule as Strata',
      intro: 'Pick a number and see which bits it takes in FP32, FP16 and BF16, and what value actually gets stored. Press <b>Step</b> to walk through it: first write it in scientific notation, then fill in the sign, exponent and mantissa.',
      lgSign: 'Sign bit', lgExp: 'Exponent bits: the range', lgMant: 'Mantissa bits: the precision',
      steps: ['Write as 1.xxx × 2ᵉ', 'Sign bit', 'Exponent bits', 'Mantissa, rounding', 'Read back the value'],
      presets: [['0.1', 0.1], ['1/3', 1 / 3], ['3.14159', 3.14159], ['65504', 65504], ['70000', 70000], ['0.000001', 0.000001]],
      custom: 'Your own number', bStep: '▶ Step',
      rows: [['FP32', '1 + 8 + 23 bits'], ['FP16', '1 + 5 + 10 bits'], ['BF16', '1 + 8 + 7 bits']],
      stored: 'Stored: ', err: 'error',
      ready: '<span class="c">$</span> ready. Pick a number, then press [ ▶ Step ]',
      pick: (x) => `<span class="y">// switched to ${x}</span>`,
      s0: (x, m, e) => `<span class="c">Scientific notation</span>: ${x} = ${m} × 2^${e}. Any nonzero number can be written as "1.xxx × 2 to some power"`,
      s0z: '<span class="c">Scientific notation</span>: 0 is a special case; all three formats have a dedicated pattern for it',
      s1: (neg) => `<span class="c">Sign bit</span>: ${neg ? 'negative, so 1' : 'positive, so 0'}. All three formats use just 1 bit`,
      s2: (e, ok16) => `<span class="m">Exponent bits</span>: we need to store 2 to the power ${e}. FP32 and BF16 have 8 exponent bits, a normal range of 2⁻¹²⁶ to 2¹²⁷; FP16 has only 5, from 2⁻¹⁴ to 2¹⁵. ${ok16 ? '' : 'This number is already outside FP16\'s normal range'}`,
      s3: '<span class="w">Mantissa and rounding</span>: for the part after the point, FP32 keeps 23 bits, FP16 keeps 10 and BF16 keeps only 7. Extra bits are dropped by "round to nearest, ties to even"',
      s4: (v16, r16, vb, rb) => `<span class="y">Read back</span>: FP16 stores ${v16} (relative error ${r16}), BF16 stores ${vb} (relative error ${rb})`,
      k16: 'Value stored in FP16', f16: (r) => `relative error <b>${r}</b><br>10 mantissa bits: at most about 2⁻¹¹ ≈ 0.05% in the normal range`,
      kb: 'Value stored in BF16', fb: (r) => `relative error <b>${r}</b><br>7 mantissa bits: at most about 2⁻⁸ ≈ 0.4%`,
      kTop: 'Top 16 bits of FP32 → BF16', fTop: '<b>BF16 = FP32 with the last 16 bits cut off</b><br>the cut-off part decides the rounding, to nearest even',
      try: [
        'Pick <b>65504</b>, then <b>70000</b>: FP16 cannot hold 70000 and it becomes ∞; BF16 holds it fine, just stored as 70144. The exponent bits set the range.',
        'Pick <b>1/3</b>: none of the three formats stores it exactly. BF16\'s error is about 8 times FP16\'s, because its mantissa has 3 fewer bits. The mantissa bits set the precision.',
        'Pick <b>0.000001</b>: it is below FP16\'s normal minimum, so it can only be stored as a "subnormal" number with fewer significant bits, and the error passes 1%; BF16\'s exponent is as wide as FP32\'s, so its error stays within 0.4%.',
      ],

      qCode: 'QUANT_BLOCK', qTitle: 'Squeeze a block of weights into a few bits', qTag: 'Teaching estimate · symmetric uniform quantization, not Q2_0',
      qIntro: '16 weights are split into one or more groups, and each group shares one scale s. Drag <b>Bits</b> and <b>Group size</b>, then tick "outlier" to see how the error changes. Press <b>Step</b> to watch group 1 being quantized step by step.',
      lgOrig: 'Original weights', lgDeq: 'Values restored after quantization', lgGroup: 'Group boundary',
      qSteps: ['Find max |x|', 'Compute scale s', 'Divide by s, round', 'Multiply by s', 'Compute error'],
      bits: 'Bits b', group: 'Group size', outlier: 'Add an outlier (−2.8)',
      qReady: '<span class="c">$</span> ready. Press [ ▶ Step ] to quantize group 1',
      q0: (a, out) => `<span class="c">Find the max</span>: the largest absolute value in group 1 is ${a}${out ? ', which is the outlier itself' : ''}`,
      q1: (b, Q, s, a) => `<span class="c">Scale s</span>: ${b}-bit symmetric quantization has ${2 * Q + 1} levels from −${Q} to ${Q}, so s = ${a} ÷ ${Q} = ${s}`,
      q2: (z) => `<span class="m">Round</span>: divide each number by s and round it to an integer code (the number under each bar). Nonzero numbers in the block rounded to 0: ${z}`,
      q3: '<span class="w">Restore</span>: code × s gives the approximation, shown as the main-color bars',
      q4: (mse, mx, half) => `<span class="y">Error</span>: the whole block's mean squared error MSE = ${mse}; group 1's largest error is ${mx}, no more than s ÷ 2 = ${half}`,
      ksK: 'Scale s of group 1', ksF: '<b>= max|x| ÷ (2^(b−1) − 1)</b><br>fewer levels mean a bigger s and coarser marks',
      kMse: 'Mean squared error (MSE)', fMse: '<b>= average of (original − restored)²</b><br>an error accepted on purpose, so measure it',
      kBpw: 'Real bits per weight', fBpw: (b, g) => `<b>= ${b} + 16 ÷ ${g}</b><br>each group also stores a 16-bit s`,
      qTry: [
        'Drag the bits from 8 down to 2: the main-color bars go from hugging the originals to only three levels (−s, 0, +s). The MSE grows more than ten-thousand-fold.',
        'Tick <b>outlier</b>: a single −2.8 stretches s several times over, and most small weights in the same group become 0.',
        'With the outlier still there, set the group size to <b>4</b>: only the outlier\'s group gets coarse, and the other three recover. See the cost at the bottom right: each weight spends a few more bits on scales.',
      ],
      qVerdict: (ratio, z0, z1, k, extra) => `① The outlier stretches its group's s to ${ratio} times, the weights rounded to 0 go from ${z0} to ${z1}, and the MSE grows ${k} times.<br>② The smaller the groups, the more the outlier drags down only its own group; the price is ${extra} more bits per weight for the scales.<br>③ The nominal bit width is neither the real cost nor the error: work out both.`,
    },
    ar: {
      code: 'FLOAT_BITS', title: 'رقم واحد، ثلاث طرق لتخزينه', tag: 'تقدير تعليمي · قاعدة التقريب نفسها في Strata',
      intro: 'اختر رقمًا، وانظر أي البتات يشغلها في FP32 وFP16 وBF16، وما القيمة التي تُخزَّن فعلًا. اضغط <b>خطوة</b> لتتبّعه: نكتبه أولًا بالتدوين العلمي، ثم نوزّع الإشارة والأس والجزء الكسري.',
      lgSign: 'بت الإشارة', lgExp: 'بتات الأس: تحدد المدى', lgMant: 'بتات الجزء الكسري: تحدد الدقة',
      steps: ['اكتبه 1.xxx × 2ᵉ', 'بت الإشارة', 'بتات الأس', 'الجزء الكسري والتقريب', 'اقرأ القيمة المخزَّنة'],
      presets: [['0.1', 0.1], ['1/3', 1 / 3], ['3.14159', 3.14159], ['65504', 65504], ['70000', 70000], ['0.000001', 0.000001]],
      custom: 'رقمك الخاص', bStep: '▶ خطوة',
      rows: [['FP32', '1 + 8 + 23 بتًا'], ['FP16', '1 + 5 + 10 بتات'], ['BF16', '1 + 8 + 7 بتات']],
      stored: 'المخزَّن: ', err: 'الخطأ',
      ready: '<span class="c">$</span> ready. اختر رقمًا ثم اضغط [ ▶ خطوة ]',
      pick: (x) => `<span class="y">// تغيّر الرقم إلى ${x}</span>`,
      s0: (x, m, e) => `<span class="c">التدوين العلمي</span>: ${x} = ${m} × 2^${e}. أي رقم غير صفري يمكن كتابته على الشكل «1.xxx × 2 أس ما»`,
      s0z: '<span class="c">التدوين العلمي</span>: الصفر حالة خاصة، ولكل من الصيغ الثلاث نمط مخصص له',
      s1: (neg) => `<span class="c">بت الإشارة</span>: ${neg ? 'رقم سالب، فنسجّل 1' : 'رقم موجب، فنسجّل 0'}. الصيغ الثلاث تستخدم بتًا واحدًا فقط`,
      s2: (e, ok16) => `<span class="m">بتات الأس</span>: يجب تخزين 2 أس ${e}. في FP32 وBF16 ثمانية بتات للأس، والمدى العادي من 2⁻¹²⁶ إلى 2¹²⁷؛ وفي FP16 خمسة بتات فقط، من 2⁻¹⁴ إلى 2¹⁵. ${ok16 ? '' : 'هذا الرقم خارج المدى العادي لـ FP16'}`,
      s3: '<span class="w">الجزء الكسري والتقريب</span>: في الجزء بعد الفاصلة، يحتفظ FP32 بـ 23 بتًا، وFP16 بـ 10، وBF16 بـ 7 فقط. تُحذف البتات الزائدة بقاعدة «التقريب إلى الأقرب، وعند التعادل إلى الزوجي»',
      s4: (v16, r16, vb, rb) => `<span class="y">القراءة</span>: FP16 يخزّن ${v16} (الخطأ النسبي ${r16})، وBF16 يخزّن ${vb} (الخطأ النسبي ${rb})`,
      k16: 'القيمة المخزَّنة في FP16', f16: (r) => `الخطأ النسبي <b>${r}</b><br>10 بتات للجزء الكسري: الحد الأقصى نحو 2⁻¹¹ ≈ 0.05% في المدى العادي`,
      kb: 'القيمة المخزَّنة في BF16', fb: (r) => `الخطأ النسبي <b>${r}</b><br>7 بتات للجزء الكسري: الحد الأقصى نحو 2⁻⁸ ≈ 0.4%`,
      kTop: 'أول 16 بتًا من FP32 ← BF16', fTop: '<b>BF16 = FP32 بعد قطع آخر 16 بتًا</b><br>والجزء المقطوع يحدد التقريب إلى أقرب زوجي',
      try: [
        'اختر <b>65504</b> ثم <b>70000</b>: FP16 لا يتسع لـ 70000 فيصير ∞؛ أما BF16 فيخزّنه، لكن على صورة 70144. بتات الأس تتحكم في المدى.',
        'اختر <b>1/3</b>: لا تخزّنه أي من الصيغ الثلاث بدقة. خطأ BF16 نحو 8 أضعاف خطأ FP16 لأن جزأه الكسري أقل بـ 3 بتات. بتات الجزء الكسري تتحكم في الدقة.',
        'اختر <b>0.000001</b>: هو أصغر من الحد الأدنى العادي لـ FP16، فلا يُخزَّن إلا بطريقة «غير المنظَّم» (subnormal)، وتقل بتاته المعنوية ويتجاوز الخطأ 1%؛ أما أس BF16 فبعرض أس FP32، فيبقى خطؤه ضمن 0.4%.',
      ],

      qCode: 'QUANT_BLOCK', qTitle: 'ضغط كتلة من الأوزان إلى بضع بتات', qTag: 'تقدير تعليمي · تكميم منتظم متماثل، وليس Q2_0',
      qIntro: 'تُقسَّم 16 وزنًا إلى مجموعة أو عدة مجموعات، وتتقاسم كل مجموعة معامل قياس s واحدًا. اسحب <b>البتات</b> و<b>حجم المجموعة</b>، ثم فعّل «القيمة الشاذة» لترى كيف يتغيّر الخطأ. اضغط <b>خطوة</b> لتتبع تكميم المجموعة 1 خطوة بخطوة.',
      lgOrig: 'الأوزان الأصلية', lgDeq: 'القيم المسترجَعة بعد التكميم', lgGroup: 'حدّ المجموعة',
      qSteps: ['ابحث عن أكبر قيمة مطلقة', 'احسب معامل القياس s', 'اقسم على s وقرّب', 'اضرب في s', 'احسب الخطأ'],
      bits: 'البتات b', group: 'حجم المجموعة', outlier: 'أضف قيمة شاذة (−2.8)',
      qReady: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ] لتكميم المجموعة 1',
      q0: (a, out) => `<span class="c">أكبر قيمة</span>: أكبر قيمة مطلقة في المجموعة 1 هي ${a}${out ? '، وهي القيمة الشاذة نفسها' : ''}`,
      q1: (b, Q, s, a) => `<span class="c">معامل القياس s</span>: التكميم المتماثل بـ ${b} بتات له ${2 * Q + 1} مستوى من −${Q} إلى ${Q}، فـ s = ${a} ÷ ${Q} = ${s}`,
      q2: (z) => `<span class="m">التقريب</span>: نقسم كل رقم على s ونقرّبه إلى كود صحيح (الرقم تحت كل عمود). عدد الأرقام غير الصفرية في الكتلة التي صارت 0: ${z}`,
      q3: '<span class="w">الاسترجاع</span>: الكود × s يعطي القيمة التقريبية، وهي الأعمدة بالألوان الرئيسية في الرسم',
      q4: (mse, mx, half) => `<span class="y">الخطأ</span>: متوسط مربع الخطأ للكتلة كلها MSE = ${mse}؛ وأكبر خطأ في المجموعة 1 هو ${mx}، ولا يتجاوز s ÷ 2 = ${half}`,
      ksK: 'معامل القياس s للمجموعة 1', ksF: '<b>= max|x| ÷ (2^(b−1) − 1)</b><br>كلما قلّت المستويات كبر s وخشنت التدريجات',
      kMse: 'متوسط مربع الخطأ (MSE)', fMse: '<b>= متوسط (الأصلي − المسترجَع)²</b><br>خطأ نقبله عن قصد، ويجب أن نقيسه',
      kBpw: 'البتات الفعلية لكل وزن', fBpw: (b, g) => `<b>= ${b} + 16 ÷ ${g}</b><br>كل مجموعة تخزّن أيضًا s بـ 16 بتًا`,
      qTry: [
        'اسحب البتات من 8 إلى 2: تتحول الأعمدة الرئيسية من لصيقة بالقيم الأصلية إلى ثلاثة مستويات فقط (−s و0 و+s). ويزيد MSE عشرات الآلاف من المرات.',
        'فعّل <b>القيمة الشاذة</b>: رقم واحد −2.8 يضخّم s عدة أضعاف، فتصير معظم الأوزان الصغيرة في المجموعة نفسها 0.',
        'مع بقاء القيمة الشاذة، اجعل حجم المجموعة <b>4</b>: لا تخشن إلا مجموعة القيمة الشاذة، وتتعافى المجموعات الثلاث الأخرى. وانظر التكلفة في الأسفل: كل وزن يصرف بضعة بتات إضافية على معاملات القياس.',
      ],
      qVerdict: (ratio, z0, z1, k, extra) => `① القيمة الشاذة تضخّم s في مجموعتها إلى ${ratio} ضعفًا، وعدد الأوزان التي صارت 0 ينتقل من ${z0} إلى ${z1}، وMSE يكبر ${k} ضعفًا.<br>② كلما صغرت المجموعات لم تؤثر القيمة الشاذة إلا في مجموعتها؛ والثمن ${extra} بتات إضافية لكل وزن لتخزين معاملات القياس.<br>③ عدد البتات الاسمي ليس التكلفة الحقيقية، وليس الخطأ: احسب الاثنين.`,
    },
    es: {
      code: 'FLOAT_BITS', title: 'Un número, tres formas de guardarlo', tag: 'Estimación didáctica · reglas de redondeo como en Strata',
      intro: 'Elige un número y mira qué bits ocupa en FP32, FP16 y BF16 y qué valor queda guardado. Pulsa <b>Paso</b> para seguirlo: primero se escribe en notación científica y luego se reparten signo, exponente y mantisa.',
      lgSign: 'Bit de signo', lgExp: 'Bits de exponente: el rango', lgMant: 'Bits de mantisa: la precisión',
      steps: ['Escribir 1,xxx × 2ᵉ', 'Bit de signo', 'Bits de exponente', 'Mantisa y redondeo', 'Leer el valor guardado'],
      presets: [['0,1', 0.1], ['1/3', 1 / 3], ['3,14159', 3.14159], ['65.504', 65504], ['70.000', 70000], ['0,000001', 0.000001]],
      custom: 'Escribe el tuyo', bStep: '▶ Paso',
      rows: [['FP32', '1 + 8 + 23 bits'], ['FP16', '1 + 5 + 10 bits'], ['BF16', '1 + 8 + 7 bits']],
      stored: 'Guardado: ', err: 'error',
      ready: '<span class="c">$</span> ready. Elige un número y pulsa [ ▶ Paso ]',
      pick: (x) => `<span class="y">// cambio a ${x}</span>`,
      s0: (x, m, e) => `<span class="c">Notación científica</span>: ${x} = ${m} × 2^${e}. Cualquier número distinto de cero se puede escribir como «1,xxx × 2 elevado a algo»`,
      s0z: '<span class="c">Notación científica</span>: el 0 es un caso especial; los tres formatos tienen una escritura propia para él',
      s1: (neg) => `<span class="c">Bit de signo</span>: ${neg ? 'número negativo, se anota 1' : 'número positivo, se anota 0'}. Los tres formatos usan solo 1 bit`,
      s2: (e, ok16) => `<span class="m">Bits de exponente</span>: hay que guardar 2 elevado a ${e}. FP32 y BF16 tienen 8 bits de exponente, con rango normal de 2⁻¹²⁶ a 2¹²⁷; FP16 solo tiene 5, de 2⁻¹⁴ a 2¹⁵. ${ok16 ? '' : 'Este número ya se sale del rango normal de FP16'}`,
      s3: '<span class="w">Mantisa y redondeo</span>: de la parte después de la coma, FP32 conserva 23 bits, FP16 10 y BF16 solo 7. Los bits sobrantes se quitan con «redondeo al más cercano, con empates al par»',
      s4: (v16, r16, vb, rb) => `<span class="y">Lectura</span>: FP16 guarda ${v16} (error relativo ${r16}), BF16 guarda ${vb} (error relativo ${rb})`,
      k16: 'Valor guardado en FP16', f16: (r) => `error relativo <b>${r}</b><br>mantisa de 10 bits: dentro del rango normal, como máximo ≈ 2⁻¹¹ ≈ 0,05 %`,
      kb: 'Valor guardado en BF16', fb: (r) => `error relativo <b>${r}</b><br>mantisa de 7 bits: como máximo ≈ 2⁻⁸ ≈ 0,4 %`,
      kTop: 'Los primeros 16 bits de FP32 → BF16', fTop: '<b>BF16 = FP32 sin sus últimos 16 bits</b><br>y la parte cortada se redondea al más cercano, con empates al par',
      try: [
        'Elige <b>65.504</b> y luego <b>70.000</b>: FP16 no puede guardar 70.000 y pasa a ∞; BF16 sí lo guarda, solo que como 70.144. Los bits de exponente controlan el rango.',
        'Elige <b>1/3</b>: ninguno de los tres formatos lo guarda con exactitud. El error de BF16 es unas 8 veces el de FP16, porque su mantisa tiene 3 bits menos. Los bits de mantisa controlan la precisión.',
        'Elige <b>0,000001</b>: es menor que el límite normal inferior de FP16 y solo se puede guardar de forma «desnormalizada», con menos bits útiles y un error superior a 1 %; el exponente de BF16 es tan ancho como el de FP32 y su error sigue por debajo de 0,4 %.',
      ],

      qCode: 'QUANT_BLOCK', qTitle: 'Comprimir un bloque de pesos a unos pocos bits', qTag: 'Estimación didáctica · cuantización uniforme simétrica, no Q2_0',
      qIntro: '16 pesos se dividen en uno o varios grupos, y cada grupo comparte un factor de escala s. Arrastra los controles de <b>bits</b> y <b>tamaño de grupo</b> y marca «valor atípico» para ver cómo cambia el error. Pulsa <b>Paso</b> para ver cómo se cuantiza el grupo 1 paso a paso.',
      lgOrig: 'Los pesos originales', lgDeq: 'Los valores restaurados tras cuantizar', lgGroup: 'Límite de grupo',
      qSteps: ['Hallar el máximo absoluto', 'Calcular la escala s', 'Dividir por s y redondear', 'Multiplicar otra vez por s', 'Calcular el error'],
      bits: 'Bits b', group: 'Tamaño del grupo', outlier: 'Añadir un valor atípico (−2,8)',
      qReady: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para cuantizar el grupo 1',
      q0: (a, out) => `<span class="c">Hallar el máximo</span>: en el grupo 1, el de mayor valor absoluto es ${a}${out ? ', justo el valor atípico' : ''}`,
      q1: (b, Q, s, a) => `<span class="c">Escala s</span>: la cuantización simétrica de ${b} bits tiene de −${Q} a ${Q}, ${2 * Q + 1} niveles en total, s = ${a} ÷ ${Q} = ${s}`,
      q2: (z) => `<span class="m">Redondear</span>: cada número se divide por s y se redondea a un código entero (el número bajo la barra). En todo el bloque, ${z} números que no eran 0 pasaron a 0`,
      q3: '<span class="w">Restaurar</span>: código × s da el valor aproximado, la barra con el color principal del dibujo',
      q4: (mse, mx, half) => `<span class="y">Error</span>: el error cuadrático medio de todo el bloque es MSE = ${mse}; el error máximo del grupo 1 es ${mx}, que no pasa de s ÷ 2 = ${half}`,
      ksK: 'Escala s del grupo 1', ksF: '<b>= max|x| ÷ (2^(b−1) − 1)</b><br>cuantos menos niveles, mayor s y marcas más burdas',
      kMse: 'Error cuadrático medio MSE', fMse: '<b>= promedio de (original − restaurado)²</b><br>un error aceptado a propósito, que hay que medir',
      kBpw: 'Bits reales por peso', fBpw: (b, g) => `<b>= ${b} + 16 ÷ ${g}</b><br>cada grupo guarda además una s de 16 bits`,
      qTry: [
        'Baja los bits de 8 a 2: las barras del color principal pasan de casi pegadas al valor original a quedarse con solo tres niveles (−s, 0, +s). El MSE se multiplica por decenas de miles.',
        'Marca <b>valor atípico</b>: un −2,8 infla s varias veces y la mayoría de los pesos pequeños del mismo grupo pasan a 0.',
        'Con el valor atípico puesto, cambia el tamaño de grupo a <b>4</b>: solo se engrosa el grupo del valor atípico y los otros tres se recuperan. El costo está abajo a la derecha: cada peso ocupa unos bits más para guardar la escala.',
      ],
      qVerdict: (ratio, z0, z1, k, extra) => `① El valor atípico multiplica por ${ratio} la s de su grupo; los pesos redondeados a 0 pasan de ${z0} a ${z1} y el MSE sube ${k} veces.<br>② Cuanto más pequeños son los grupos, más se limita el daño del valor atípico a su propio grupo; el costo es que cada peso gasta ${extra} bits más en el factor de escala.<br>③ Los bits nominales (cuántos bits) no son el costo real ni el error: hay que calcular los dos.`,
    },
    ko: {
      code: 'FLOAT_BITS', title: '숫자 하나, 저장 방법 세 가지', tag: '교육용 추정 · 반올림 규칙은 Strata와 같음',
      intro: '숫자를 하나 고르면 FP32, FP16, BF16에서 각각 어떤 비트를 쓰고 실제로 무엇이 저장되는지 볼 수 있어요. <b>단계 실행</b>을 눌러 따라가 보세요. 먼저 과학적 표기법으로 쓰고, 그다음 부호, 지수, 가수를 배분해요.',
      lgSign: '부호 비트', lgExp: '지수 비트: 범위 담당', lgMant: '가수 비트: 정밀도 담당',
      steps: ['1.xxx × 2ᵉ 꼴로 쓰기', '부호 비트', '지수 비트', '가수와 반올림', '저장된 값 읽기'],
      presets: [['0.1', 0.1], ['1/3', 1 / 3], ['3.14159', 3.14159], ['65504', 65504], ['70000', 70000], ['0.000001', 0.000001]],
      custom: '직접 입력', bStep: '▶ 단계 실행',
      rows: [['FP32', '1 + 8 + 23비트'], ['FP16', '1 + 5 + 10비트'], ['BF16', '1 + 8 + 7비트']],
      stored: '저장값: ', err: '오차',
      ready: '<span class="c">$</span> ready. 숫자를 고르고 [ ▶ 단계 실행 ]을 누르세요',
      pick: (x) => `<span class="y">// ${x}(으)로 바꿈</span>`,
      s0: (x, m, e) => `<span class="c">과학적 표기법</span>: ${x} = ${m} × 2^${e}. 0이 아닌 수는 모두 "1.xxx × 2의 몇 제곱" 꼴로 쓸 수 있어요`,
      s0z: '<span class="c">과학적 표기법</span>: 0은 특수한 경우예요. 세 포맷 모두 0을 위한 전용 표현이 있어요',
      s1: (neg) => `<span class="c">부호 비트</span>: ${neg ? '음수라서 1' : '양수라서 0'}. 세 포맷 모두 1비트만 써요`,
      s2: (e, ok16) => `<span class="m">지수 비트</span>: 2의 ${e}제곱을 저장해야 해요. FP32와 BF16은 지수가 8비트라 정상 범위가 2⁻¹²⁶부터 2¹²⁷까지예요. FP16은 5비트뿐이라 2⁻¹⁴부터 2¹⁵까지예요. ${ok16 ? '' : '이 숫자는 이미 FP16의 정상 범위를 벗어났어요'}`,
      s3: '<span class="w">가수와 반올림</span>: 소수점 뒤 부분은 FP32가 23비트, FP16이 10비트, BF16은 7비트만 남겨요. 넘치는 비트는 "가장 가까운 값으로, 딱 중간이면 짝수 쪽으로" 버려요',
      s4: (v16, r16, vb, rb) => `<span class="y">읽어 오기</span>: FP16은 ${v16}을(를) 저장(상대 오차 ${r16}), BF16은 ${vb}을(를) 저장(상대 오차 ${rb})`,
      k16: 'FP16에 저장된 값', f16: (r) => `상대 오차 <b>${r}</b><br>가수 10비트: 정상 범위에서 최대 약 2⁻¹¹ ≈ 0.05%`,
      kb: 'BF16에 저장된 값', fb: (r) => `상대 오차 <b>${r}</b><br>가수 7비트: 최대 약 2⁻⁸ ≈ 0.4%`,
      kTop: 'FP32의 앞 16비트 → BF16', fTop: '<b>BF16 = FP32의 뒤 16비트를 잘라 낸 것</b><br>잘린 부분을 보고 가장 가까운 짝수로 반올림해요',
      try: [
        '<b>65504</b>를 고른 다음 <b>70000</b>을 골라 보세요. FP16은 70000을 저장하지 못해 ∞가 돼요. BF16은 문제없이 저장하지만 70144로 저장돼요. 지수 비트가 범위를 정해요.',
        '<b>1/3</b>을 골라 보세요. 세 포맷 모두 정확히 저장하지 못해요. BF16의 오차는 FP16의 약 8배예요. 가수가 3비트 적기 때문이에요. 가수 비트가 정밀도를 정해요.',
        '<b>0.000001</b>을 골라 보세요. FP16의 정상 최솟값보다 작아서 "비정규화" 방식으로만 저장할 수 있어요. 유효 비트가 줄어서 오차가 1%를 넘어요. BF16은 지수 폭이 FP32와 같아서 오차가 여전히 0.4% 이내예요.',
      ],

      qCode: 'QUANT_BLOCK', qTitle: '가중치 한 덩어리를 몇 비트로 압축하기', qTag: '교육용 추정 · 대칭 균등 양자화, Q2_0 아님',
      qIntro: '가중치 16개를 한 그룹 또는 여러 그룹으로 나누고, 그룹마다 스케일 s 하나를 공유해요. <b>비트 수</b>와 <b>그룹 크기</b>를 움직이고 "이상치"를 체크해서 오차가 어떻게 변하는지 보세요. <b>단계 실행</b>을 누르면 1번 그룹이 양자화되는 과정을 차례로 볼 수 있어요.',
      lgOrig: '원래 가중치', lgDeq: '양자화 후 복원한 값', lgGroup: '그룹 경계',
      qSteps: ['절댓값 최댓값 찾기', '스케일 s 계산', 's로 나눠 반올림', 's를 다시 곱하기', '오차 계산'],
      bits: '비트 수 b', group: '그룹당 개수', outlier: '이상치 하나 추가(−2.8)',
      qReady: '<span class="c">$</span> ready. [ ▶ 단계 실행 ]을 눌러 1번 그룹을 양자화하세요',
      q0: (a, out) => `<span class="c">최댓값 찾기</span>: 1번 그룹에서 절댓값이 가장 큰 값은 ${a}${out ? '이고, 바로 그 이상치예요' : '이에요'}`,
      q1: (b, Q, s, a) => `<span class="c">스케일 s</span>: ${b}비트 대칭 양자화는 −${Q}부터 ${Q}까지 ${2 * Q + 1}단계가 있어요. s = ${a} ÷ ${Q} = ${s}`,
      q2: (z) => `<span class="m">반올림</span>: 각 숫자를 s로 나눠 정수 코드(막대 아래 숫자)로 반올림해요. 블록 전체에서 원래 0이 아닌데 0이 된 숫자는 ${z}개예요`,
      q3: '<span class="w">복원</span>: 코드 × s로 근삿값을 얻어요. 그림의 주색 막대가 그 값이에요',
      q4: (mse, mx, half) => `<span class="y">오차</span>: 블록 전체의 평균 제곱 오차 MSE = ${mse}. 1번 그룹의 최대 오차는 ${mx}이고, s ÷ 2 = ${half} 이하예요`,
      ksK: '1번 그룹의 스케일 s', ksF: '<b>= max|x| ÷ (2^(b−1) − 1)</b><br>단계가 적을수록 s가 커지고 눈금이 거칠어져요',
      kMse: '평균 제곱 오차 MSE', fMse: '<b>= (원래 값 − 복원값)²의 평균</b><br>일부러 받아들인 오차이니 측정해야 해요',
      kBpw: '가중치당 실제 비트 수', fBpw: (b, g) => `<b>= ${b} + 16 ÷ ${g}</b><br>그룹마다 16비트 s도 저장해요`,
      qTry: [
        '비트 수를 8에서 2로 내려 보세요. 주색 막대가 원래 값에 거의 붙어 있다가 세 단계(−s, 0, +s)만 남아요. MSE가 1만 배 넘게 커져요.',
        '<b>이상치</b>를 체크해 보세요. −2.8 하나가 s를 몇 배로 키우고, 같은 그룹의 작은 가중치 대부분이 0이 돼요.',
        '이상치를 둔 채 그룹 크기를 <b>4</b>로 바꿔 보세요. 이상치가 속한 그룹만 거칠어지고 나머지 세 그룹은 회복돼요. 대가는 오른쪽 아래에 있어요. 가중치마다 스케일 저장에 몇 비트를 더 써요.',
      ],
      qVerdict: (ratio, z0, z1, k, extra) => `① 이상치가 자기 그룹의 s를 ${ratio}배로 키웠어요. 0이 된 가중치는 ${z0}개에서 ${z1}개로 늘고, MSE는 ${k}배가 됐어요.<br>② 그룹을 작게 나눌수록 이상치는 자기 그룹만 끌어내려요. 대가로 가중치마다 스케일 저장에 ${extra}비트를 더 써요.<br>③ 명목 비트 수(몇 bit인지)는 실제 비용도 오차도 아니에요. 둘 다 계산해서 확인해야 해요.`,
    },
    ja: {
      code: 'FLOAT_BITS', title: '1 つの数、3 通りの保存方法', tag: '教育用の試算 · 丸め規則は Strata と同じ',
      intro: '数を 1 つ選ぶと、FP32、FP16、BF16 のそれぞれでどのビットを使い、実際に何が保存されるかが見えます。<b>ステップ</b>を押して順に追いましょう。まず科学的記数法に直し、次に符号、指数部、仮数部を割り当てます。',
      lgSign: '符号ビット', lgExp: '指数部のビット：範囲を決める', lgMant: '仮数部のビット：精度を決める',
      steps: ['1.xxx × 2ᵉ の形にする', '符号ビット', '指数部のビット', '仮数部と丸め', '保存された値を読み戻す'],
      presets: [['0.1', 0.1], ['1/3', 1 / 3], ['3.14159', 3.14159], ['65504', 65504], ['70000', 70000], ['0.000001', 0.000001]],
      custom: '好きな数', bStep: '▶ ステップ',
      rows: [['FP32', '1 + 8 + 23 ビット'], ['FP16', '1 + 5 + 10 ビット'], ['BF16', '1 + 8 + 7 ビット']],
      stored: '保存値：', err: '誤差',
      ready: '<span class="c">$</span> ready. 数を選んで [ ▶ ステップ ] を押してください',
      pick: (x) => `<span class="y">// ${x} に切り替え</span>`,
      s0: (x, m, e) => `<span class="c">科学的記数法</span>：${x} = ${m} × 2^${e}。0 でない数は、どれも「1.xxx × 2 の何乗か」の形で書けます`,
      s0z: '<span class="c">科学的記数法</span>：0 は特別な場合で、3 つのフォーマットとも専用の書き方があります',
      s1: (neg) => `<span class="c">符号ビット</span>：${neg ? '負の数なので 1' : '正の数なので 0'}。3 つのフォーマットとも 1 ビットだけ使います`,
      s2: (e, ok16) => `<span class="m">指数部のビット</span>：2 の ${e} 乗を保存します。FP32 と BF16 は指数部が 8 ビットで、通常の範囲は 2⁻¹²⁶ から 2¹²⁷ です。FP16 は 5 ビットしかなく、2⁻¹⁴ から 2¹⁵ です。${ok16 ? '' : 'この数はすでに FP16 の通常の範囲を超えています'}`,
      s3: '<span class="w">仮数部と丸め</span>：小数点より後ろの部分は、FP32 が 23 ビット、FP16 が 10 ビット、BF16 は 7 ビットだけ残します。あふれたビットは「最近接丸め、同点は偶数へ」で捨てます',
      s4: (v16, r16, vb, rb) => `<span class="y">読み戻し</span>：FP16 は ${v16} を保存（相対誤差 ${r16}）、BF16 は ${vb} を保存（相対誤差 ${rb}）`,
      k16: 'FP16 が保存した値', f16: (r) => `相対誤差 <b>${r}</b><br>仮数部 10 ビット：通常の範囲で最大でも約 2⁻¹¹ ≈ 0.05%`,
      kb: 'BF16 が保存した値', fb: (r) => `相対誤差 <b>${r}</b><br>仮数部 7 ビット：最大でも約 2⁻⁸ ≈ 0.4%`,
      kTop: 'FP32 の上位 16 ビット → BF16', fTop: '<b>BF16 = FP32 の下位 16 ビットを切り捨てたもの</b><br>切り捨てた部分を見て、最近接の偶数へ丸めます',
      try: [
        '<b>65504</b> を選び、次に <b>70000</b> を選びます。FP16 は 70000 を保存できず ∞ になります。BF16 は問題なく保存できますが、保存値は 70144 です。指数部のビットが範囲を決めます。',
        '<b>1/3</b> を選びます。3 つのフォーマットとも正確には保存できません。BF16 の誤差は FP16 の約 8 倍です。仮数部が 3 ビット少ないからです。仮数部のビットが精度を決めます。',
        '<b>0.000001</b> を選びます。FP16 の通常の下限より小さいので、「非正規化数」という方法で保存するしかありません。有効なビットが減り、誤差は 1% を超えます。BF16 は指数部が FP32 と同じ幅なので、誤差は 0.4% 以内のままです。',
      ],

      qCode: 'QUANT_BLOCK', qTitle: '重みのブロックを数ビットに詰める', qTag: '教育用の試算 · 対称一様量子化（Q2_0 ではない）',
      qIntro: '16 個の重みを 1 組または複数の組に分け、組ごとに 1 つのスケール s を共有します。<b>ビット数</b>と<b>組の大きさ</b>を動かし、「外れ値」にチェックを入れて、誤差の変化を見ましょう。<b>ステップ</b>を押すと、第 1 組の量子化を順に追えます。',
      lgOrig: '元の重み', lgDeq: '量子化後に復元した値', lgGroup: '組の境界',
      qSteps: ['絶対値の最大を探す', 'スケール s を計算', 's で割って丸める', 's を掛け戻す', '誤差を計算'],
      bits: 'ビット数 b', group: '1 組の個数', outlier: '外れ値を 1 つ加える（−2.8）',
      qReady: '<span class="c">$</span> ready. [ ▶ ステップ ] を押すと第 1 組を量子化します',
      q0: (a, out) => `<span class="c">最大値を探す</span>：第 1 組で絶対値が最大なのは ${a} です${out ? '。これがまさに外れ値です' : ''}`,
      q1: (b, Q, s, a) => `<span class="c">スケール s</span>：${b} ビットの対称量子化には −${Q} から ${Q} まで ${2 * Q + 1} 段階があり、s = ${a} ÷ ${Q} = ${s}`,
      q2: (z) => `<span class="m">丸め</span>：各数を s で割り、四捨五入して整数のコード（棒の下の数）にします。ブロック全体で、本来 0 でなかったのに 0 に丸められた数は ${z} 個です`,
      q3: '<span class="w">復元</span>：コード × s で近似値が得られます。図のメインカラーの棒がそれです',
      q4: (mse, mx, half) => `<span class="y">誤差</span>：ブロック全体の平均二乗誤差 MSE = ${mse}。第 1 組の最大誤差は ${mx} で、s ÷ 2 = ${half} 以下です`,
      ksK: '第 1 組のスケール s', ksF: '<b>= max|x| ÷ (2^(b−1) − 1)</b><br>段階が少ないほど s は大きく、目盛りは粗くなります',
      kMse: '平均二乗誤差 MSE', fMse: '<b>= （元の値 − 復元値）² の平均</b><br>自分から受け入れた誤差なので、測ります',
      kBpw: '重み 1 個あたりの実際のビット数', fBpw: (b, g) => `<b>= ${b} + 16 ÷ ${g}</b><br>組ごとに 16 ビットの s も保存します`,
      qTry: [
        'ビット数を 8 から 2 まで下げます。メインカラーの棒は、元の値にほぼ重なっていた状態から、3 段階（−s、0、+s）だけになります。MSE は 1 万倍以上に増えます。',
        '<b>外れ値</b>にチェックを入れます。−2.8 が 1 つあるだけで s が何倍にも膨らみ、同じ組の小さな重みの大半が 0 に丸められます。',
        '外れ値を残したまま、組の大きさを <b>4</b> にします。粗くなるのは外れ値のある組だけで、残りの 3 組は元に戻ります。代償は右下にあります。スケールの保存に、重み 1 個あたり数ビット余分にかかります。',
      ],
      qVerdict: (ratio, z0, z1, k, extra) => `① 外れ値は、その組の s を ${ratio} 倍に広げました。0 に丸められた重みは ${z0} 個から ${z1} 個に増え、MSE は ${k} 倍になりました。<br>② 組を小さくするほど、外れ値が巻き込むのは自分の組だけになります。代償は、スケールの保存に重み 1 個あたり ${extra} ビット余分にかかることです。<br>③ 名目上のビット数（何 bit か）は、実際のコストでも誤差でもありません。どちらも計算で求めましょう。`,
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
