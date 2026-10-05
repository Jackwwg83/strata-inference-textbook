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
    ar: {
      code: 'ROUTER_SIM', title: 'محاكي الموجِّه', tag: 'تقدير تعليمي · الدرجات أرقام عشوائية',
      intro: 'الخبراء الـ 512 في طبقة واحدة مرتبون في شبكة 32 × 16. اضغط <b>خطوة</b> لترى خطوة خطوة كيف يعطي الموجِّه الخبراء درجات، ويختار أعلى k منها، ثم يجمع نتائجهم حسب الأوزان.',
      lgCell: 'خانة واحدة = خبير واحد في هذه الطبقة', lgScore: 'قيد التقييم (الأكثر سطوعًا = الأعلى درجة)', lgPick: 'مُختار، ويشارك في الحساب',
      steps: ['وصول الرمز', 'إعطاء الدرجات', 'اختيار أعلى k', 'حساب الخبراء', 'الجمع الموزون', 'الطبقة التالية'],
      gridLabel: 'شبكة درجات الخبراء الـ 512',
      bStep: '▶ خطوة', bAll: '▶▶ شغّل الطبقات الـ 48', bReset: 'إعادة',
      kLabel: 'عدد الخبراء المختارين في كل طبقة (k)',
      layers: (n) => `اكتملت ${n} / 48 طبقة`, read: (mb) => `المقروء حتى الآن: ${mb} MB`,
      ready: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ] للبدء، وكل ضغطة تتقدم خطوة على الشريط',
      readyShort: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ] للبدء',
      sPicksK: 'عدد اختيارات الخبراء لكل رمز', sPicksF: '<b>= 48 طبقة × k</b><br>كل طبقة تختار من جديد',
      sParamsK: 'المعاملات التي يستخدمها الرمز فعلًا',
      sParamsF: (picks, pct) => `<b>= ${picks} × 4.9152 M + نحو 4.2 B</b><br>معاملات الخبراء المختارين + الأجزاء المستخدمة في كل خطوة<br>${pct}% من مجموع 125 مليار`,
      sBytesK: 'بيانات الخبراء التي يجب أن يقرأها الرمز', sBytesF: (picks) => `<b>= ${picks} × 1.3824 MB</b><br>كل خبير يشغل 1,382,400 بايت في الصيغة القياسية`,
      sWK: 'حصة صوت كل خبير مختار (الأوزان)', sWEmpty: 'تظهر بعد الوصول إلى الخطوة 5 بالضغط على «خطوة»', sWF: 'كلما زادت الدرجة زاد الوزن، ومجموع الأوزان يساوي 1', sWMore: (n) => `…و${n} آخرون`,
      params: (x) => `${(x / 1e9).toFixed(1)} مليار`,
      try: [
        'اضغط <b>خطوة</b> مرارًا وراقب الشريط يتقدم خانة خانة، والطرفية تشرح كل خطوة في سطر.',
        'اسحب k إلى <b>1</b> ثم إلى <b>64</b>: ترتفع المعاملات المستخدمة من نحو 4.4 مليار إلى نحو 19.3 مليار. كلما كبر k عمل خبراء أكثر في كل خطوة وصارت الخطوة أبطأ.',
        'اضغط <b>شغّل الطبقات الـ 48</b>: كل طبقة تختار من جديد، وتقرأ الطبقات الـ 48 معًا 664 MB بالضبط. وهذا عمل توليد <b>رمز واحد</b> فقط.',
      ],
      restart: '<span class="y">// اكتملت الطبقات الـ 48؛ نبدأ من جديد من الطبقة 1</span>',
      l0: (n) => `<span class="c">[L${String(n).padStart(2, '0')}]</span> وصلت بيانات الرمز وسُلّمت إلى موجِّه الطبقة ${n}`,
      l1: '<span class="m">الدرجات</span>: يحسب الموجِّه درجة لكل خبير من الخبراء الـ 512 (الأسطع = الأعلى)',
      l2: (k, ids, rest) => `<span class="c">اختيار أعلى ${k}</span>: اختار ${ids}، ويستريح الـ ${rest} الباقون في هذه الخطوة`,
      l3: (k, mb) => `<span class="w">حساب الخبراء</span>: يحسب كل خبير من الـ ${k} نتيجة، ويقرأ ${k} × 1.38 MB ≈ ${mb} MB من المعاملات`,
      l4: (max) => `<span class="y">الجمع الموزون</span>: تتحول الدرجات إلى أوزان (الأكبر ${max} والمجموع 1.00)، فيكون لصاحب الدرجة الأعلى صوت أكبر`,
      l5: (n, mb) => `<span class="c">←</span> تذهب النتيجة إلى الطبقة التالية. اكتملت ${n} / 48 طبقة، والمقروء حتى الآن ${mb} MB`,
      fast: '<span class="y">// تقدّم سريع: تشغيل الطبقات الـ 48 متتالية</span>',
      done: (k, mb) => `<span class="y">تم</span>: 48 طبقة × ${k} = ${48 * k} اختيارًا، والمقروء ${mb} MB. وهذا عمل توليد <span class="w">رمز واحد</span> فقط`,

      rCode: 'TRANSFER_RACE', rTitle: 'سباق النقل: 664 MB', rTag: 'الذروة النظرية · تقدير تعليمي',
      rIntro: 'يحتاج الرمز الواحد إلى قراءة نحو 664 MB من بيانات الخبراء. اترك أربعة أماكن تنقل الـ 664 MB نفسها في وقت واحد، وانظر من يصل أولًا. <b>زمن النقل = حجم البيانات ÷ عرض النطاق</b>.',
      rLgLane: 'كل مسار = نوع من التخزين أو الربط', rLgFill: 'كلما امتلأ الشريط أسرع كان عرض النطاق أكبر',
      lanes: [['VRAM', 'ذاكرة فيديو RTX 5070'], ['RAM', 'DDR5-5200 بقناتين'], ['PCIe 5.0', 'الناقل بين GPU وRAM'], ['SSD', 'قراءة NVMe تسلسلية معتادة']],
      rEq: (hw, mb, bw, ms, tok) => `${hw}: ${mb} MB ÷ ${bw} GB/s = ${ms} ms ← حتى ${tok} رمزًا في الثانية على الأكثر`,
      rGo: '▶ انطلق', rSlow: 'الحركة أبطأ 60 مرة',
      rVerdict: (pcie, pTok, ssd, sTok) => `① النقل مرة واحدة عبر PCIe يستغرق <b>${pcie} ms</b>؛ والنقل وحده يحدّ السرعة بما لا يزيد على <b>${pTok}</b> رمزًا في الثانية، قبل أن يبدأ أي حساب.<br>② القراءة من قرص SSD تستغرق <b>${ssd} ms</b>، أي ${sTok} رمزًا في الثانية على الأكثر، فلا يمكن القراءة منه في كل مرة.<br>③ لذلك تجعل Strata وحدة CPU تحسب معظم الخبراء المُخفِقين في الذاكرة (RAM) مباشرة، فلا تحتاج بياناتهم إلى عبور PCIe.`,
    },
    es: {
      code: 'ROUTER_SIM', title: 'Simulador del router', tag: 'Estimación didáctica · puntuaciones aleatorias',
      intro: 'Los 512 expertos de una capa están en una cuadrícula de 32 × 16. Pulsa <b>Paso</b> para ver, un paso a la vez, cómo el router puntúa a los expertos, elige los k mejores y suma sus resultados según el peso.',
      lgCell: 'Una celda = un experto de esta capa', lgScore: 'Se está puntuando (más brillante = mayor puntuación)', lgPick: 'Elegido: participa en el cálculo',
      steps: ['Llega el token', 'Puntuar', 'Elegir top k', 'Calculan los expertos', 'Suma ponderada', 'Capa siguiente'],
      gridLabel: 'Cuadrícula de puntuación de los 512 expertos',
      bStep: '▶ Paso', bAll: '▶▶ Ejecutar las 48 capas', bReset: 'Reiniciar',
      kLabel: 'Expertos elegidos por capa (k)',
      layers: (n) => `${n} / 48 capas terminadas`, read: (mb) => `${mb} MB leídos hasta ahora`,
      ready: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para empezar; cada pulsación avanza un paso en la tira',
      readyShort: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para empezar',
      sPicksK: 'Elecciones de expertos por token', sPicksF: '<b>= 48 capas × k</b><br>cada capa elige de nuevo',
      sParamsK: 'Parámetros que usa realmente un token',
      sParamsF: (picks, pct) => `<b>= ${picks} × 4,9152 M + unos 4.200 M</b><br>parámetros de los expertos elegidos + las partes que se usan en cada paso<br>el ${pct} % de los 125.000 millones totales`,
      sBytesK: 'Datos de expertos que un token debe leer', sBytesF: (picks) => `<b>= ${picks} × 1,3824 MB</b><br>cada experto ocupa 1.382.400 bytes en el formato estándar`,
      sWK: 'Cuánta voz tiene cada experto elegido (pesos)', sWEmpty: 'Se muestra al llegar al paso 5 con Paso', sWF: 'A mayor puntuación, mayor peso; los pesos suman 1', sWMore: (n) => `…y ${n} más`,
      params: (x) => { const m = Math.round(x / 1e6); return (m >= 1000 ? String(m).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : m) + ' millones'; },
      try: [
        'Pulsa <b>Paso</b> varias veces y mira cómo la tira avanza casilla a casilla; el terminal explica cada paso en una línea.',
        'Baja k hasta <b>1</b> y luego súbelo a <b>64</b>: los parámetros usados pasan de unos 4.400 millones a unos 19.300 millones. Con k mayor trabajan más expertos en cada paso y el paso es más lento.',
        'Pulsa <b>Ejecutar las 48 capas</b>: cada capa elige de nuevo y las 48 capas leen en total justo 664 MB. Es el trabajo de generar <b>un solo</b> token.',
      ],
      restart: '<span class="y">// las 48 capas terminaron; se vuelve a empezar desde la capa 1</span>',
      l0: (n) => `<span class="c">[L${String(n).padStart(2, '0')}]</span> llegan los datos del token y pasan al router de la capa ${n}`,
      l1: '<span class="m">Puntuar</span>: el router calcula una puntuación para cada uno de los 512 expertos (más brillante = más alta)',
      l2: (k, ids, rest) => `<span class="c">Elegir top ${k}</span>: elige ${ids}; los otros ${rest} no trabajan en este paso`,
      l3: (k, mb) => `<span class="w">Calculan los expertos</span>: cada uno de los ${k} expertos calcula un resultado y lee ${k} × 1,38 MB ≈ ${mb} MB de parámetros`,
      l4: (max) => `<span class="y">Suma ponderada</span>: las puntuaciones pasan a ser pesos (el mayor es ${max}, el total 1.00); los expertos con mayor puntuación tienen más voz`,
      l5: (n, mb) => `<span class="c">→</span> el resultado pasa a la capa siguiente. ${n} / 48 capas terminadas, ${mb} MB leídos hasta ahora`,
      fast: '<span class="y">// avance rápido: se ejecutan las 48 capas seguidas</span>',
      done: (k, mb) => `<span class="y">Listo</span>: 48 capas × ${k} = ${48 * k} elecciones, ${mb} MB leídos en total. Es el trabajo de generar <span class="w">un solo</span> token`,

      rCode: 'TRANSFER_RACE', rTitle: 'Carrera de transferencia: 664 MB', rTag: 'Pico teórico · Estimación didáctica',
      rIntro: 'Un token necesita leer unos 664 MB de datos de expertos. Deja que cuatro lugares muevan esos 664 MB a la vez y mira quién llega primero. <b>Tiempo de transferencia = tamaño de los datos ÷ ancho de banda</b>.',
      rLgLane: 'Cada carril = un tipo de almacenamiento o enlace', rLgFill: 'Cuanto más rápido se llena la barra, mayor es el ancho de banda',
      lanes: [['VRAM', 'VRAM de la RTX 5070'], ['RAM', 'DDR5-5200 de doble canal'], ['PCIe 5.0', 'el bus entre la GPU y la RAM'], ['SSD', 'lectura secuencial NVMe típica']],
      rEq: (hw, mb, bw, ms, tok) => `${hw}: ${mb} MB ÷ ${bw} GB/s = ${ms} ms → como máximo ${tok} tokens por segundo`,
      rGo: '▶ Ya', rSlow: 'animación 60 veces más lenta',
      rVerdict: (pcie, pTok, ssd, sTok) => `① Un viaje por PCIe tarda <b>${pcie} ms</b>; solo mover los datos ya limita a <b>${pTok}</b> tokens por segundo, antes de empezar a calcular.<br>② Leer del SSD tarda <b>${ssd} ms</b>, como máximo ${sTok} tokens por segundo, así que no se puede leer de ahí cada vez.<br>③ Por eso Strata deja que la CPU calcule en la propia RAM la mayoría de los expertos que fallan en la caché, y esos datos no tienen que cruzar PCIe.`,
    },
    ko: {
      code: 'ROUTER_SIM', title: '라우터 시뮬레이터', tag: '교육용 추정 · 점수는 난수',
      intro: '한 층의 전문가 512명이 32 × 16 격자에 놓여 있어요. <b>단계 실행</b>을 누르면 라우터가 전문가에게 점수를 매기고, 상위 k명을 고르고, 결과를 가중합하는 과정을 한 걸음씩 볼 수 있어요.',
      lgCell: '칸 하나 = 이 층의 전문가 한 명', lgScore: '점수 매기는 중(밝을수록 높은 점수)', lgPick: '선택되어 계산에 참여',
      steps: ['토큰 도착', '점수 매기기', '상위 k 선택', '전문가 계산', '가중합', '다음 층'],
      gridLabel: '전문가 512명의 점수 격자',
      bStep: '▶ 단계 실행', bAll: '▶▶ 48개 층 끝까지', bReset: '초기화',
      kLabel: '층마다 고르는 전문가 수(k)',
      layers: (n) => `${n} / 48개 층 완료`, read: (mb) => `지금까지 읽은 양 ${mb} MB`,
      ready: '<span class="c">$</span> ready. [ ▶ 단계 실행 ]을 눌러 시작해요. 누를 때마다 진행 막대가 한 단계씩 나아가요',
      readyShort: '<span class="c">$</span> ready. [ ▶ 단계 실행 ]을 눌러 시작해요',
      sPicksK: '토큰 하나당 전문가 선택 횟수', sPicksF: '<b>= 48개 층 × k</b><br>층마다 새로 골라요',
      sParamsK: '토큰 하나가 실제로 쓰는 파라미터',
      sParamsF: (picks, pct) => `<b>= ${picks} × 491.52만 + 약 42억</b><br>선택된 전문가의 파라미터 + 매 단계 쓰는 부분<br>전체 1250억의 ${pct}%`,
      sBytesK: '토큰 하나가 읽어야 하는 전문가 데이터', sBytesF: (picks) => `<b>= ${picks} × 1.3824 MB</b><br>표준 형식에서 전문가 하나는 1,382,400바이트`,
      sWK: '이 층에서 선택된 전문가의 발언권(가중치)', sWEmpty: '“단계 실행”으로 5단계까지 가면 나타나요', sWF: '점수가 높을수록 가중치가 커요. 가중치의 합은 1이에요', sWMore: (n) => `…그 밖에 ${n}명`,
      params: (x) => `${Math.round(x / 1e8)}억`,
      try: [
        '<b>단계 실행</b>을 계속 눌러 보세요. 진행 막대가 한 칸씩 나아가고, 터미널에 단계마다 한 줄 설명이 나와요.',
        'k를 <b>1</b>까지 내렸다가 <b>64</b>까지 올려 보세요. 쓰는 파라미터가 약 44억에서 약 193억으로 늘어요. k가 클수록 한 단계에 일하는 전문가가 많아지고 느려져요.',
        '<b>48개 층 끝까지</b>를 눌러 보세요. 층마다 새로 고르고, 48개 층을 합치면 정확히 664 MB를 읽어요. 이건 토큰 <b>하나</b>를 만드는 일의 양이에요.',
      ],
      restart: '<span class="y">// 48개 층을 모두 마쳤어요. 1번 층부터 다시 시작해요</span>',
      l0: (n) => `<span class="c">[L${String(n).padStart(2, '0')}]</span> 토큰 데이터가 도착해서 ${n}번 층의 라우터로 가요`,
      l1: '<span class="m">점수 매기기</span>: 라우터가 전문가 512명 각각에게 점수를 매겨요(그림에서 밝을수록 높은 점수)',
      l2: (k, ids, rest) => `<span class="c">상위 ${k}명 선택</span>: ${ids} 선택. 나머지 ${rest}명은 이번 단계에 일하지 않아요`,
      l3: (k, mb) => `<span class="w">전문가 계산</span>: ${k}명이 각자 결과를 하나씩 계산해요. 읽는 파라미터는 ${k} × 1.38 MB ≈ ${mb} MB예요`,
      l4: (max) => `<span class="y">가중합</span>: 점수를 가중치로 바꿔요(최대 ${max}, 합계 1.00). 점수가 높은 전문가의 발언권이 커요`,
      l5: (n, mb) => `<span class="c">→</span> 결과를 다음 층으로 넘겨요. ${n} / 48개 층 완료, 지금까지 읽은 양 ${mb} MB`,
      fast: '<span class="y">// 빨리 감기: 48개 층을 연속으로 실행해요</span>',
      done: (k, mb) => `<span class="y">완료</span>: 48개 층 × ${k} = ${48 * k}번 선택, 모두 ${mb} MB를 읽었어요. 이건 토큰 <span class="w">하나</span>를 만드는 일의 양이에요`,

      rCode: 'TRANSFER_RACE', rTitle: '이동 경주: 664 MB', rTag: '이론 최대치 · 교육용 추정',
      rIntro: '토큰 하나는 약 664 MB의 전문가 데이터를 읽어요. 네 곳이 동시에 이 664 MB를 옮기게 하고 누가 먼저 도착하는지 보세요. <b>이동 시간 = 데이터 양 ÷ 대역폭</b>이에요.',
      rLgLane: '트랙 하나 = 저장 장치나 통로 하나', rLgFill: '막대가 빨리 찰수록 대역폭이 커요',
      lanes: [['VRAM', 'RTX 5070 VRAM'], ['RAM', 'DDR5-5200 듀얼 채널'], ['PCIe 5.0', 'GPU와 RAM 사이의 버스'], ['SSD', '일반적인 NVMe 순차 읽기']],
      rEq: (hw, mb, bw, ms, tok) => `${hw}: ${mb} MB ÷ ${bw} GB/s = ${ms} ms → 초당 최대 ${tok}개 토큰`,
      rGo: '▶ 출발', rSlow: '애니메이션을 60배 느리게',
      rVerdict: (pcie, pTok, ssd, sTok) => `① PCIe로 한 번 옮기면 <b>${pcie} ms</b>가 걸려요. 옮기기만 해도 속도가 초당 최대 <b>${pTok}</b>개 토큰으로 묶여요. 계산은 시작도 안 했어요.<br>② SSD에서 읽으면 <b>${ssd} ms</b>가 걸리고 초당 최대 ${sTok}개 토큰이에요. 매번 읽을 수는 없어요.<br>③ 그래서 Strata는 미스한 전문가 대부분을 CPU가 RAM에서 바로 계산하게 해요. 그 데이터는 PCIe를 지나지 않아도 돼요.`,
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
