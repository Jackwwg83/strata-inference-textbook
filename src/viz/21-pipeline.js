/* Chapter 21 widgets: the two-GPU layer pipeline and the hand-off cost on different links.
   All visible text lives in the T tables below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.pipeline;

  const T = Viz.t({
    zh: {
      code: 'PIPE_SIM', title: '双卡流水线：读提示词', tag: '教学推演 · 时间为假设值',
      intro: '提示词被切成 N 块，前一张卡读前半段层，后一张卡读后半段层。拖动滑块改时间，按 <b>▶ 播放</b> 看两张卡什么时候在干活、什么时候在空等。单位是毫秒，数值是教学假设。',
      lgA: '前一张卡（GPU A）读一块', lgB: '后一张卡（GPU B）读一块', lgX: '搬运交接数据', lgIdle: '空等（气泡）',
      steps: ['切成块', '填充', '两卡同时忙', '排空', '完成'],
      rowA: 'GPU A', rowB: 'GPU B', axis: (t) => `${t} ms`,
      sA: 'GPU A 读一块（a）', sB: 'GPU B 读一块（b）', sX: '每次搬运（x）', sN: '块数（N）',
      bPlay: '▶ 播放', bOne: '只算一个 token', bReset: '重置',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 播放 ]，时间线从左往右走',
      kTotal: '双卡总时间', fTotal: (a, b, n, m) => `<b>= (a+x) + (b+x) + (N−1) × max</b><br>= ${a} + ${b} + ${n - 1} × ${m}`,
      kSerial: '一张卡串行做完', fSerial: (n, a, b) => `<b>= N × (a + b)</b><br>= ${n} × (${a} + ${b})`,
      kSpeed: '加速比', fSpeed: '<b>= 串行时间 ÷ 双卡时间</b><br>大于 1 才算赚到',
      kIdle: '两张卡各空等多久', fIdle: (n, a, b) => `<b>A 空等 = 总时间 − ${n} × ${a}</b><br><b>B 空等 = 总时间 − ${n} × ${b}</b>`,
      idle: (a, b) => `A ${a} · B ${b} ms`,
      try: [
        '保持 a = 4、b = 5、x = 0，把 N 从 1 拉到 8：总时间是 <b>5N + 4</b>。块越多，开头和结尾的气泡占比越小。',
        '把搬运 x 调到 1，再按 <b>只算一个 token</b>：N = 1 时双卡比单卡还慢。同一个 token 的层必须一层接一层算，两张卡帮不上彼此，还要多搬两次。',
        '把 a 拉到 2、b 拉到 8：慢的那张卡决定节拍，快的那张卡大部分时间在空等。这就是为什么要按速度分层。',
      ],
      lStartA: (c, t) => `<span class="c">t=${t}</span> GPU A 开始读第 ${c} 块（前半段层）`,
      lHand: (c, t) => `<span class="y">t=${t}</span> GPU A 交出第 ${c} 块，数据放进内存里的交接缓冲区`,
      lStartB: (c, t, w) => `<span class="c">t=${t}</span> GPU B 开始读第 ${c} 块${w > 0 ? `（它刚才空等了 ${w} ms）` : ''}`,
      lFull: (t) => `<span class="m">t=${t}</span> 填充结束：两张卡第一次同时在干活`,
      lDrain: (t) => `<span class="m">t=${t}</span> 排空开始：GPU A 已经没有新块，只剩 GPU B 在收尾`,
      lDone: (t, s) => `<span class="w">完成</span>：t = ${t} ms，一张卡串行要 ${s} ms`,
      verdict: (n, tot, ser, sp) => n === 1
        ? `只有 1 块时，双卡要 <b>${tot} ms</b>，一张卡串行要 <b>${ser} ms</b>，双卡最多打平。同一份数据必须先过前半段层、再过后半段层，两张卡没法同时帮它。层切分让<b>单个 token</b> 变快的唯一途径，是每张卡能多缓存专家、少让 CPU 算。`
        : `${n} 块用了 <b>${tot} ms</b>，串行要 <b>${ser} ms</b>，加速 <b>${sp}</b> 倍。两张卡只有在处理<b>不同</b>块时才能同时忙；开头填充、结尾排空的气泡省不掉，慢的那张卡决定节拍。`,

      rCode: 'LINK_BUDGET', rTitle: '交接一次要多久', rTag: '教学推演 · 延迟为假设值',
      rIntro: '同样两张卡，换一种分工、换一种连线，通信代价差多少？<b>每次跨卡 = 固定延迟 + 字节数 ÷ 带宽</b>。层切分每个验证窗口交接一次，经内存中转要过两次总线；假想的张量并行每层同步两次。',
      rLgSplit: '层切分（Strata 的做法）', rLgTp: '张量并行（假想对照）', rLgPre: '读提示词时交接一块',
      links: { p4x4: 'PCIe 4.0 ×4', p3x16: 'PCIe 3.0 ×16', p4x16: 'PCIe 4.0 ×16', p5x16: 'PCIe 5.0 ×16', nvl4: 'NVLink 4.0' },
      linkNote: { p4x4: '主板上较短的插槽', p3x16: '老一些的主板', p4x16: '常见的显卡插槽', p5x16: '新平台的显卡插槽', nvl4: 'H100 的 18 条链路' },
      sT: '窗口里的 token 数', sLat: '每次跨卡的固定延迟（µs）',
      lane1: '层切分', lane1s: '每窗口 2 次', lane2: '张量并行', lane2s: '每窗口 96 次', lane3: '提示词一块', lane3s: '2048 个 token',
      eq1: (t, kb, n) => `2 × (${t} µs + ${kb} KB ÷ 带宽)，${n} 个 token × 51,216 字节`,
      eq2: (t, kb) => `96 × (${t} µs + ${kb} KB ÷ 带宽)，48 层 × 每层 2 次同步`,
      eq3: (mb) => `2 × ${mb} MB ÷ 带宽，只算带宽不算延迟`,
      kRatio: '张量并行 ÷ 层切分', fRatio: '<b>= 张量并行耗时 ÷ 层切分耗时</b><br>同步次数多，固定延迟就被乘了 96 次',
      kBytes: '层切分每窗口搬的字节', fBytes: (n) => `<b>= 2 × ${n} × 51,216 字节</b><br>51,216 = (4 × 2560 + 2560 + 4) × 4`,
      log: (name, n, lat, s, tp) => `<span class="c">${name}</span> · ${n} 个 token · 延迟 ${lat} µs → 层切分 <span class="y">${s} µs</span>，张量并行 <span class="m">${tp} µs</span>`,
      rReady: '<span class="c">$</span> 选一种连线，拖动滑块，这里会记下每次的结果',
      rVerdict: (s, tp, r, pre) => `① 层切分每个窗口只交接一次，约 <b>${s} µs</b>，和十几毫秒的窗口比可以忽略。<br>② 假想的张量并行要同步 96 次，约 <b>${tp} µs</b>，是层切分的 <b>${r}</b> 倍；它更怕延迟，所以通常配 NVLink 这类快速互连。<br>③ 读提示词时一块 2048 个 token 的交接约 <b>${pre} ms</b>，比读这一块本身的时间小得多。这就是 Strata 不要求 NVLink、插在 ×4 插槽上也能用的原因。`,
      rTry: [
        '在 <b>PCIe 4.0 ×16</b> 上把延迟从 10 拉到 30 µs：张量并行涨得多，层切分几乎不动。次数比字节更要命。',
        '换到 <b>NVLink 4.0</b>，再把延迟调到 2 µs：张量并行的代价降到几百微秒，这正是数据中心用它的原因。',
        '换到 <b>PCIe 4.0 ×4</b>：提示词一块的交接变成约 21 ms，仍远小于读这一块要花的时间。',
      ],
    },
    en: {
      code: 'PIPE_SIM', title: 'Two-card pipeline: reading a prompt', tag: 'Teaching estimate · times are assumptions',
      intro: 'The prompt is cut into N chunks. The first card reads the front layers and the second card reads the back layers. Drag the sliders to change the times, then press <b>▶ Play</b> to see when each card is working and when it sits idle. Units are milliseconds; the values are teaching assumptions.',
      lgA: 'First card (GPU A) reads a chunk', lgB: 'Second card (GPU B) reads a chunk', lgX: 'Moving handoff data', lgIdle: 'Idle (bubble)',
      steps: ['Cut into chunks', 'Fill', 'Both cards busy', 'Drain', 'Done'],
      rowA: 'GPU A', rowB: 'GPU B', axis: (t) => `${t} ms`,
      sA: 'GPU A per chunk (a)', sB: 'GPU B per chunk (b)', sX: 'Each transfer (x)', sN: 'Chunks (N)',
      bPlay: '▶ Play', bOne: 'Just one token', bReset: 'Reset',
      ready: '<span class="c">$</span> ready. Press [ ▶ Play ] and the timeline runs from left to right',
      kTotal: 'Two-card total time', fTotal: (a, b, n, m) => `<b>= (a+x) + (b+x) + (N−1) × max</b><br>= ${a} + ${b} + ${n - 1} × ${m}`,
      kSerial: 'One card, all in sequence', fSerial: (n, a, b) => `<b>= N × (a + b)</b><br>= ${n} × (${a} + ${b})`,
      kSpeed: 'Speedup', fSpeed: '<b>= serial time ÷ two-card time</b><br>only a gain if above 1',
      kIdle: 'How long each card sits idle', fIdle: (n, a, b) => `<b>A idle = total − ${n} × ${a}</b><br><b>B idle = total − ${n} × ${b}</b>`,
      idle: (a, b) => `A ${a} · B ${b} ms`,
      try: [
        'Keep a = 4, b = 5, x = 0 and drag N from 1 to 8: the total is <b>5N + 4</b>. The more chunks, the smaller the share of the bubbles at the start and the end.',
        'Set the transfer x to 1, then press <b>Just one token</b>: with N = 1, two cards are slower than one. One token\'s layers must be computed one after another, the two cards cannot help each other, and there are two extra transfers.',
        'Drag a to 2 and b to 8: the slow card sets the beat and the fast card is idle most of the time. That is why layers should be assigned by speed.',
      ],
      lStartA: (c, t) => `<span class="c">t=${t}</span> GPU A starts reading chunk ${c} (front layers)`,
      lHand: (c, t) => `<span class="y">t=${t}</span> GPU A hands off chunk ${c}; the data goes into the handoff buffer in RAM`,
      lStartB: (c, t, w) => `<span class="c">t=${t}</span> GPU B starts reading chunk ${c}${w > 0 ? ` (it was just idle for ${w} ms)` : ''}`,
      lFull: (t) => `<span class="m">t=${t}</span> fill done: both cards are working at the same time for the first time`,
      lDrain: (t) => `<span class="m">t=${t}</span> drain starts: GPU A has no new chunks, only GPU B is finishing up`,
      lDone: (t, s) => `<span class="w">Done</span>: t = ${t} ms; one card in sequence would take ${s} ms`,
      verdict: (n, tot, ser, sp) => n === 1
        ? `With only 1 chunk, two cards take <b>${tot} ms</b> and one card in sequence takes <b>${ser} ms</b>; at best two cards break even. The same data must pass the front layers before the back layers, so the two cards cannot work on it at once. The only way a layer split makes a <b>single token</b> faster is that each card can cache more experts and leave less for the CPU.`
        : `${n} chunks took <b>${tot} ms</b>, versus <b>${ser} ms</b> in sequence: a <b>${sp}×</b> speedup. Two cards can both be busy only while handling <b>different</b> chunks; the fill bubble at the start and the drain bubble at the end cannot be avoided, and the slower card sets the beat.`,

      rCode: 'LINK_BUDGET', rTitle: 'How long one handoff takes', rTag: 'Teaching estimate · latency is an assumption',
      rIntro: 'Same two cards, a different split, a different link: how much does the communication cost change? <b>Each crossing = fixed latency + bytes ÷ bandwidth</b>. The layer split hands off once per verify window, crossing the bus twice because it relays through RAM; a hypothetical tensor-parallel split syncs twice per layer.',
      rLgSplit: 'Layer split (Strata\'s way)', rLgTp: 'Tensor parallel (hypothetical comparison)', rLgPre: 'Handing off one chunk while reading a prompt',
      links: { p4x4: 'PCIe 4.0 ×4', p3x16: 'PCIe 3.0 ×16', p4x16: 'PCIe 4.0 ×16', p5x16: 'PCIe 5.0 ×16', nvl4: 'NVLink 4.0' },
      linkNote: { p4x4: 'a shorter motherboard slot', p3x16: 'older motherboards', p4x16: 'a common graphics card slot', p5x16: 'graphics slot on new platforms', nvl4: 'the 18 links of an H100' },
      sT: 'Tokens in the window', sLat: 'Fixed latency per crossing (µs)',
      lane1: 'Layer split', lane1s: '2 per window', lane2: 'Tensor parallel', lane2s: '96 per window', lane3: 'One prompt chunk', lane3s: '2048 tokens',
      eq1: (t, kb, n) => `2 × (${t} µs + ${kb} KB ÷ bandwidth), ${n} tokens × 51,216 bytes`,
      eq2: (t, kb) => `96 × (${t} µs + ${kb} KB ÷ bandwidth), 48 layers × 2 syncs per layer`,
      eq3: (mb) => `2 × ${mb} MB ÷ bandwidth, bandwidth only, no latency`,
      kRatio: 'Tensor parallel ÷ layer split', fRatio: '<b>= tensor-parallel time ÷ layer-split time</b><br>many syncs multiply the fixed latency 96 times',
      kBytes: 'Bytes the layer split moves per window', fBytes: (n) => `<b>= 2 × ${n} × 51,216 bytes</b><br>51,216 = (4 × 2560 + 2560 + 4) × 4`,
      log: (name, n, lat, s, tp) => `<span class="c">${name}</span> · ${n} tokens · latency ${lat} µs → layer split <span class="y">${s} µs</span>, tensor parallel <span class="m">${tp} µs</span>`,
      rReady: '<span class="c">$</span> pick a link and drag the sliders; each result is logged here',
      rVerdict: (s, tp, r, pre) => `① The layer split hands off only once per window, about <b>${s} µs</b>, negligible next to a window of a dozen-odd milliseconds.<br>② The hypothetical tensor-parallel split must sync 96 times, about <b>${tp} µs</b>, <b>${r}×</b> the layer split; it is far more sensitive to latency, which is why it usually comes with a fast link such as NVLink.<br>③ While reading a prompt, handing off one 2048-token chunk takes about <b>${pre} ms</b>, far less than reading the chunk itself. That is why Strata does not need NVLink and works even in a ×4 slot.`,
      rTry: [
        'On <b>PCIe 4.0 ×16</b>, raise the latency from 10 to 30 µs: tensor parallel grows a lot while the layer split barely moves. The number of crossings hurts more than the bytes.',
        'Switch to <b>NVLink 4.0</b> and set the latency to 2 µs: the tensor-parallel cost drops to a few hundred microseconds, which is exactly why data centers use it.',
        'Switch to <b>PCIe 4.0 ×4</b>: handing off one prompt chunk now takes about 21 ms, still far less than the time to read that chunk.',
      ],
    },
    ar: {
      code: 'PIPE_SIM', title: 'خط أنابيب البطاقتين: قراءة المُطالبة', tag: 'تقدير تعليمي · الأزمنة افتراضية',
      intro: 'تُقطَّع المُطالبة إلى N دفعة. تقرأ البطاقة الأولى طبقات القسم الأمامي، وتقرأ الثانية طبقات القسم الخلفي. حرّك المنزلقات لتغيير الأزمنة، واضغط <b>▶ تشغيل</b> لترى متى تعمل كل بطاقة ومتى تنتظر. الوحدة هي المللي ثانية، والقيم افتراضات تعليمية.',
      lgA: 'البطاقة الأولى (GPU A) تقرأ دفعة', lgB: 'البطاقة الثانية (GPU B) تقرأ دفعة', lgX: 'نقل بيانات التسليم', lgIdle: 'انتظار (فقاعة)',
      steps: ['التقطيع إلى دفعات', 'الملء', 'البطاقتان مشغولتان', 'التفريغ', 'اكتمل'],
      rowA: 'GPU A', rowB: 'GPU B', axis: (t) => `${t} ms`,
      sA: 'GPU A لكل دفعة (a)', sB: 'GPU B لكل دفعة (b)', sX: 'كل عملية نقل (x)', sN: 'الدفعات (N)',
      bPlay: '▶ تشغيل', bOne: 'token واحد فقط', bReset: 'إعادة ضبط',
      ready: '<span class="c">$</span> ready. اضغط [ ▶ تشغيل ] ويسير الخط الزمني من اليسار إلى اليمين',
      kTotal: 'الزمن الكلي للبطاقتين', fTotal: (a, b, n, m) => `<b>= (a+x) + (b+x) + (N−1) × max</b><br>= ${a} + ${b} + ${n - 1} × ${m}`,
      kSerial: 'بطاقة واحدة بالتتابع', fSerial: (n, a, b) => `<b>= N × (a + b)</b><br>= ${n} × (${a} + ${b})`,
      kSpeed: 'التسارع', fSpeed: '<b>= الزمن المتتابع ÷ زمن البطاقتين</b><br>لا يكون مكسبًا إلا إذا زاد على 1',
      kIdle: 'كم تنتظر كل بطاقة', fIdle: (n, a, b) => `<b>انتظار A = الكلي − ${n} × ${a}</b><br><b>انتظار B = الكلي − ${n} × ${b}</b>`,
      idle: (a, b) => `A ${a} · B ${b} ms`,
      try: [
        'ثبّت a = 4 وb = 5 وx = 0، وارفع N من 1 إلى 8: الزمن الكلي هو <b>5N + 4</b>. وكلما زادت الدفعات صغرت نسبة الفقاعات في البداية والنهاية.',
        'اضبط النقل x على 1، ثم اضغط <b>token واحد فقط</b>: عند N = 1 تكون البطاقتان أبطأ من واحدة. فطبقات الـ token الواحد يجب أن تُحسب طبقة بعد طبقة، ولا تستطيع البطاقتان مساعدة إحداهما الأخرى، وهناك عمليتا نقل إضافيتان.',
        'اجعل a تساوي 2 وb تساوي 8: البطاقة الأبطأ تحدد الإيقاع، والسريعة تنتظر معظم الوقت. لهذا يجب توزيع الطبقات حسب السرعة.',
      ],
      lStartA: (c, t) => `<span class="c">t=${t}</span> تبدأ GPU A قراءة الدفعة ${c} (طبقات القسم الأمامي)`,
      lHand: (c, t) => `<span class="y">t=${t}</span> تسلّم GPU A الدفعة ${c}، وتوضع البيانات في مخزن التسليم المؤقت في الذاكرة`,
      lStartB: (c, t, w) => `<span class="c">t=${t}</span> تبدأ GPU B قراءة الدفعة ${c}${w > 0 ? ` (كانت تنتظر قبل قليل ${w} ms)` : ''}`,
      lFull: (t) => `<span class="m">t=${t}</span> انتهى الملء: البطاقتان تعملان معًا للمرة الأولى`,
      lDrain: (t) => `<span class="m">t=${t}</span> بدأ التفريغ: لم تعد لدى GPU A دفعات جديدة، وGPU B وحدها تُنهي ما بقي`,
      lDone: (t, s) => `<span class="w">اكتمل</span>: t = ${t} ms، وبطاقة واحدة بالتتابع تحتاج ${s} ms`,
      verdict: (n, tot, ser, sp) => n === 1
        ? `مع دفعة واحدة فقط تحتاج البطاقتان <b>${tot} ms</b>، وبطاقة واحدة بالتتابع <b>${ser} ms</b>، وأقصى ما تبلغه البطاقتان هو التعادل. فالبيانات نفسها يجب أن تمر بطبقات القسم الأمامي ثم بطبقات القسم الخلفي، ولا تستطيع البطاقتان العمل عليها معًا. والطريقة الوحيدة التي يجعل بها تقسيم الطبقات <b>الـ token الواحد</b> أسرع هي أن تخزّن كل بطاقة خبراء أكثر ويقل حساب CPU.`
        : `استغرقت ${n} دفعات <b>${tot} ms</b>، مقابل <b>${ser} ms</b> بالتتابع، أي تسارع بمقدار <b>${sp}</b> مرة. لا تنشغل البطاقتان معًا إلا عند معالجة دفعات <b>مختلفة</b>؛ وفقاعة الملء في البداية وفقاعة التفريغ في النهاية لا يمكن تفاديهما، والبطاقة الأبطأ تحدد الإيقاع.`,

      rCode: 'LINK_BUDGET', rTitle: 'كم يستغرق تسليم واحد', rTag: 'تقدير تعليمي · زمن الاستجابة افتراضي',
      rIntro: 'البطاقتان نفسهما، لكن بتقسيم مختلف ووصلة مختلفة: كم تتغير كلفة التواصل؟ <b>كل عبور = زمن ثابت + عدد البايتات ÷ عرض النطاق</b>. تقسيم الطبقات يسلّم مرة لكل نافذة تحقق، ويعبر الناقل مرتين لأنه يمر عبر الذاكرة؛ أما التوازي الموتّري الافتراضي فيتزامن مرتين عند كل طبقة.',
      rLgSplit: 'تقسيم الطبقات (طريقة Strata)', rLgTp: 'التوازي الموتّري (مقارنة افتراضية)', rLgPre: 'تسليم دفعة عند قراءة المُطالبة',
      links: { p4x4: 'PCIe 4.0 ×4', p3x16: 'PCIe 3.0 ×16', p4x16: 'PCIe 4.0 ×16', p5x16: 'PCIe 5.0 ×16', nvl4: 'NVLink 4.0' },
      linkNote: { p4x4: 'فتحة أقصر على اللوحة الأم', p3x16: 'لوحات أم أقدم', p4x16: 'فتحة بطاقة رسوميات شائعة', p5x16: 'فتحة الرسوميات في المنصات الجديدة', nvl4: 'الوصلات الـ 18 في H100' },
      sT: 'عدد الرموز في النافذة', sLat: 'الزمن الثابت لكل عبور (µs)',
      lane1: 'تقسيم الطبقات', lane1s: 'مرتان لكل نافذة', lane2: 'توازٍ موتّري', lane2s: '96 مرة لكل نافذة', lane3: 'دفعة مُطالبة', lane3s: '2048 token',
      eq1: (t, kb, n) => `2 × (${t} µs + ${kb} KB ÷ عرض النطاق)، ${n} token × 51,216 بايت`,
      eq2: (t, kb) => `96 × (${t} µs + ${kb} KB ÷ عرض النطاق)، 48 طبقة × مزامنتان لكل طبقة`,
      eq3: (mb) => `2 × ${mb} MB ÷ عرض النطاق، عرض النطاق فقط بلا زمن استجابة`,
      kRatio: 'التوازي الموتّري ÷ تقسيم الطبقات', fRatio: '<b>= زمن التوازي الموتّري ÷ زمن تقسيم الطبقات</b><br>كثرة المزامنات تضرب الزمن الثابت 96 مرة',
      kBytes: 'بايتات تقسيم الطبقات لكل نافذة', fBytes: (n) => `<b>= 2 × ${n} × 51,216 بايت</b><br>51,216 = (4 × 2560 + 2560 + 4) × 4`,
      log: (name, n, lat, s, tp) => `<span class="c">${name}</span> · ${n} token · زمن الاستجابة ${lat} µs ← تقسيم الطبقات <span class="y">${s} µs</span>، التوازي الموتّري <span class="m">${tp} µs</span>`,
      rReady: '<span class="c">$</span> اختر وصلة وحرّك المنزلقات، وتُسجَّل هنا نتيجة كل مرة',
      rVerdict: (s, tp, r, pre) => `① تقسيم الطبقات يسلّم مرة واحدة فقط لكل نافذة، نحو <b>${s} µs</b>، وهذا مهمل أمام نافذة من بضع عشرات الميلي ثانية.<br>② التوازي الموتّري الافتراضي يحتاج 96 مزامنة، نحو <b>${tp} µs</b>، أي <b>${r}</b> ضعف تقسيم الطبقات؛ وهو أشد حساسية لزمن الاستجابة، ولذلك يأتي عادةً مع وصلة سريعة مثل NVLink.<br>③ عند قراءة المُطالبة، يستغرق تسليم دفعة من 2048 token نحو <b>${pre} ms</b>، وهو أقل بكثير من زمن قراءة الدفعة نفسها. لهذا لا تشترط Strata وجود NVLink، وتعمل حتى في فتحة ×4.`,
      rTry: [
        'على <b>PCIe 4.0 ×16</b> ارفع زمن الاستجابة من 10 إلى 30 µs: يرتفع التوازي الموتّري كثيرًا ولا يكاد تقسيم الطبقات يتحرك. عدد المرات أشد ضررًا من عدد البايتات.',
        'انتقل إلى <b>NVLink 4.0</b> واضبط زمن الاستجابة على 2 µs: تنخفض كلفة التوازي الموتّري إلى بضع مئات من الميكروثواني، وهذا بالضبط سبب استخدام مراكز البيانات له.',
        'انتقل إلى <b>PCIe 4.0 ×4</b>: يصير تسليم دفعة مُطالبة واحدة نحو 21 ms، وهو ما زال أقل بكثير من زمن قراءة هذه الدفعة.',
      ],
    },
    ko: {
      code: 'PIPE_SIM', title: '두 카드 파이프라인: 프롬프트 읽기', tag: '교육용 추정 · 시간은 가정값',
      intro: '프롬프트를 N개 청크로 자르고, 앞 카드는 앞 구간 층을, 뒤 카드는 뒤 구간 층을 읽어요. 슬라이더로 시간을 바꾸고 <b>▶ 재생</b>을 눌러 두 카드가 언제 일하고 언제 기다리는지 보세요. 단위는 밀리초이고, 값은 교육용 가정이에요.',
      lgA: '앞 카드(GPU A)가 청크 하나를 읽기', lgB: '뒤 카드(GPU B)가 청크 하나를 읽기', lgX: '인계 데이터 옮기기', lgIdle: '대기(버블)',
      steps: ['청크로 자르기', '채우기', '두 카드가 모두 바쁨', '비우기', '완료'],
      rowA: 'GPU A', rowB: 'GPU B', axis: (t) => `${t} ms`,
      sA: 'GPU A가 청크 하나 읽기(a)', sB: 'GPU B가 청크 하나 읽기(b)', sX: '한 번 옮기는 시간(x)', sN: '청크 수(N)',
      bPlay: '▶ 재생', bOne: '토큰 하나만 계산', bReset: '초기화',
      ready: '<span class="c">$</span> ready. [ ▶ 재생 ]을 누르면 타임라인이 왼쪽에서 오른쪽으로 흘러가요',
      kTotal: '두 카드 총 시간', fTotal: (a, b, n, m) => `<b>= (a+x) + (b+x) + (N−1) × max</b><br>= ${a} + ${b} + ${n - 1} × ${m}`,
      kSerial: '카드 한 장으로 직렬 처리', fSerial: (n, a, b) => `<b>= N × (a + b)</b><br>= ${n} × (${a} + ${b})`,
      kSpeed: '속도 향상 배수', fSpeed: '<b>= 직렬 시간 ÷ 두 카드 시간</b><br>1보다 커야 이득이에요',
      kIdle: '두 카드가 각각 얼마나 기다릴까', fIdle: (n, a, b) => `<b>A 대기 = 총 시간 − ${n} × ${a}</b><br><b>B 대기 = 총 시간 − ${n} × ${b}</b>`,
      idle: (a, b) => `A ${a} · B ${b} ms`,
      try: [
        'a = 4, b = 5, x = 0으로 두고 N을 1에서 8까지 끌어 보세요. 총 시간은 <b>5N + 4</b>예요. 청크가 많을수록 처음과 끝의 버블이 차지하는 비율이 작아져요.',
        '이동 x를 1로 올리고 <b>토큰 하나만 계산</b>을 눌러 보세요. N = 1이면 두 카드가 한 장보다 더 느려요. 같은 토큰의 층은 하나씩 이어서 계산해야 해서 두 카드가 서로 도울 수 없고, 옮기는 일만 두 번 더 생겨요.',
        'a를 2로, b를 8로 끌어 보세요. 느린 카드가 박자를 정하고, 빠른 카드는 대부분의 시간을 기다려요. 그래서 속도에 맞춰 층을 나눠야 해요.',
      ],
      lStartA: (c, t) => `<span class="c">t=${t}</span> GPU A가 청크 ${c} 읽기 시작(앞 구간 층)`,
      lHand: (c, t) => `<span class="y">t=${t}</span> GPU A가 청크 ${c}를 넘겨요. 데이터는 RAM의 인계 버퍼에 들어가요`,
      lStartB: (c, t, w) => `<span class="c">t=${t}</span> GPU B가 청크 ${c} 읽기 시작${w > 0 ? `(방금까지 ${w} ms 기다렸어요)` : ''}`,
      lFull: (t) => `<span class="m">t=${t}</span> 채우기 끝: 두 카드가 처음으로 동시에 일해요`,
      lDrain: (t) => `<span class="m">t=${t}</span> 비우기 시작: GPU A는 새 청크가 없고 GPU B만 마무리해요`,
      lDone: (t, s) => `<span class="w">완료</span>: t = ${t} ms, 카드 한 장으로 직렬 처리하면 ${s} ms`,
      verdict: (n, tot, ser, sp) => n === 1
        ? `청크가 1개면 두 카드는 <b>${tot} ms</b>, 카드 한 장 직렬은 <b>${ser} ms</b>예요. 두 카드는 기껏해야 비겨요. 같은 데이터는 앞 구간 층을 먼저 지나고 뒤 구간 층을 지나야 해서, 두 카드가 동시에 도울 수 없어요. 레이어 분할이 <b>토큰 하나</b>를 빠르게 하는 유일한 길은 카드마다 전문가를 더 캐시해서 CPU 계산을 줄이는 거예요.`
        : `청크 ${n}개에 <b>${tot} ms</b>가 걸렸고, 직렬은 <b>${ser} ms</b>예요. 속도는 <b>${sp}</b>배 빨라졌어요. 두 카드는 <b>서로 다른</b> 청크를 처리할 때만 동시에 바빠요. 처음의 채우기와 끝의 비우기 버블은 없앨 수 없고, 느린 카드가 박자를 정해요.`,

      rCode: 'LINK_BUDGET', rTitle: '인계 한 번에 걸리는 시간', rTag: '교육용 추정 · 지연은 가정값',
      rIntro: '같은 카드 두 장이라도 분담 방식과 연결이 다르면 통신 비용이 얼마나 달라질까요? <b>카드 사이를 한 번 건너는 시간 = 고정 지연 + 바이트 수 ÷ 대역폭</b>이에요. 레이어 분할은 검증 윈도우마다 한 번 인계하고, RAM을 거치니까 버스를 두 번 지나요. 가상의 텐서 병렬은 층마다 두 번 동기화해요.',
      rLgSplit: '레이어 분할(Strata의 방식)', rLgTp: '텐서 병렬(가상의 비교 대상)', rLgPre: '프롬프트를 읽을 때 청크 하나 인계',
      links: { p4x4: 'PCIe 4.0 ×4', p3x16: 'PCIe 3.0 ×16', p4x16: 'PCIe 4.0 ×16', p5x16: 'PCIe 5.0 ×16', nvl4: 'NVLink 4.0' },
      linkNote: { p4x4: '메인보드의 좁은 슬롯', p3x16: '조금 오래된 메인보드', p4x16: '흔한 GPU 슬롯', p5x16: '새 플랫폼의 GPU 슬롯', nvl4: 'H100의 링크 18개' },
      sT: '윈도우의 토큰 수', sLat: '카드 간 1회 고정 지연(µs)',
      lane1: '레이어 분할', lane1s: '윈도우당 2회', lane2: '텐서 병렬', lane2s: '윈도우당 96회', lane3: '프롬프트 청크 하나', lane3s: '토큰 2048개',
      eq1: (t, kb, n) => `2 × (${t} µs + ${kb} KB ÷ 대역폭), 토큰 ${n}개 × 51,216 바이트`,
      eq2: (t, kb) => `96 × (${t} µs + ${kb} KB ÷ 대역폭), 48개 층 × 층마다 동기화 2회`,
      eq3: (mb) => `2 × ${mb} MB ÷ 대역폭, 지연은 빼고 대역폭만 계산`,
      kRatio: '텐서 병렬 ÷ 레이어 분할', fRatio: '<b>= 텐서 병렬 시간 ÷ 레이어 분할 시간</b><br>동기화가 많으면 고정 지연이 96번 곱해져요',
      kBytes: '레이어 분할이 윈도우마다 옮기는 바이트', fBytes: (n) => `<b>= 2 × ${n} × 51,216 바이트</b><br>51,216 = (4 × 2560 + 2560 + 4) × 4`,
      log: (name, n, lat, s, tp) => `<span class="c">${name}</span> · 토큰 ${n}개 · 지연 ${lat} µs → 레이어 분할 <span class="y">${s} µs</span>, 텐서 병렬 <span class="m">${tp} µs</span>`,
      rReady: '<span class="c">$</span> 연결을 하나 고르고 슬라이더를 끌어 보세요. 여기에 결과가 기록돼요',
      rVerdict: (s, tp, r, pre) => `① 레이어 분할은 윈도우마다 한 번만 인계해서 약 <b>${s} µs</b>예요. 십수 밀리초짜리 윈도우와 비교하면 무시해도 돼요.<br>② 가상의 텐서 병렬은 96번 동기화해서 약 <b>${tp} µs</b>이고, 레이어 분할의 <b>${r}</b>배예요. 지연에 더 약해서 보통 NVLink 같은 빠른 연결과 함께 써요.<br>③ 프롬프트를 읽을 때 토큰 2048개짜리 청크 하나의 인계는 약 <b>${pre} ms</b>로, 이 청크를 읽는 시간보다 훨씬 작아요. Strata가 NVLink를 요구하지 않고 ×4 슬롯에 꽂아도 쓸 수 있는 이유예요.`,
      rTry: [
        '<b>PCIe 4.0 ×16</b>에서 지연을 10에서 30 µs로 끌어 보세요. 텐서 병렬은 많이 늘고, 레이어 분할은 거의 움직이지 않아요. 바이트보다 횟수가 더 치명적이에요.',
        '<b>NVLink 4.0</b>으로 바꾸고 지연을 2 µs로 맞춰 보세요. 텐서 병렬의 비용이 수백 마이크로초로 내려가요. 데이터센터가 이걸 쓰는 이유예요.',
        '<b>PCIe 4.0 ×4</b>로 바꿔 보세요. 프롬프트 청크 하나의 인계가 약 21 ms가 되는데, 이 청크를 읽는 데 드는 시간에 비하면 여전히 훨씬 작아요.',
      ],
    },
    ja: {
      code: 'PIPE_SIM', title: '2 枚の GPU のパイプライン：プロンプトを読む', tag: '教育用の試算 · 時間は仮定の値',
      intro: 'プロンプトを N 個のチャンクに切ります。前の GPU が前半の層を、後ろの GPU が後半の層を読みます。スライダーで時間を変え、<b>▶ 再生</b>を押すと、2 枚の GPU がいつ働き、いつ待っているかが見えます。単位はミリ秒で、数値は教育用の仮定です。',
      lgA: '前の GPU（GPU A）が 1 チャンク読む', lgB: '後ろの GPU（GPU B）が 1 チャンク読む', lgX: '受け渡しデータの転送', lgIdle: '待機（バブル）',
      steps: ['チャンクに切る', '充填', '2 枚とも稼働', '排出', '完了'],
      rowA: 'GPU A', rowB: 'GPU B', axis: (t) => `${t} ms`,
      sA: 'GPU A の 1 チャンク（a）', sB: 'GPU B の 1 チャンク（b）', sX: '転送 1 回（x）', sN: 'チャンク数（N）',
      bPlay: '▶ 再生', bOne: 'token 1 個だけ計算', bReset: 'リセット',
      ready: '<span class="c">$</span> ready. [ ▶ 再生 ] を押すと、時間軸が左から右へ進みます',
      kTotal: '2 枚の合計時間', fTotal: (a, b, n, m) => `<b>= (a+x) + (b+x) + (N−1) × max</b><br>= ${a} + ${b} + ${n - 1} × ${m}`,
      kSerial: '1 枚で直列に全部やる時間', fSerial: (n, a, b) => `<b>= N × (a + b)</b><br>= ${n} × (${a} + ${b})`,
      kSpeed: '高速化の倍率', fSpeed: '<b>= 直列の時間 ÷ 2 枚の時間</b><br>1 より大きければ得をしている',
      kIdle: '2 枚がそれぞれ待つ時間', fIdle: (n, a, b) => `<b>A の待ち = 合計時間 − ${n} × ${a}</b><br><b>B の待ち = 合計時間 − ${n} × ${b}</b>`,
      idle: (a, b) => `A ${a} · B ${b} ms`,
      try: [
        'a = 4、b = 5、x = 0 のままにして、N を 1 から 8 まで増やします。合計時間は <b>5N + 4</b> です。チャンクが多いほど、最初と最後のバブルの割合は小さくなります。',
        '転送 x を 1 にして、<b>token 1 個だけ計算</b>を押します。N = 1 では、2 枚のほうが 1 枚より遅くなります。同じ token の層は 1 層ずつ順に計算するしかなく、2 枚は助け合えません。そのうえ、転送が 2 回増えます。',
        'a を 2、b を 8 にします。遅いほうの GPU がリズムを決め、速いほうの GPU はほとんどの時間を待ちます。だから、層は速さに合わせて割り当てるのです。',
      ],
      lStartA: (c, t) => `<span class="c">t=${t}</span> GPU A が第 ${c} チャンク（前半の層）を読み始めます`,
      lHand: (c, t) => `<span class="y">t=${t}</span> GPU A が第 ${c} チャンクを渡します。データは RAM の受け渡しバッファに入ります`,
      lStartB: (c, t, w) => `<span class="c">t=${t}</span> GPU B が第 ${c} チャンクを読み始めます${w > 0 ? `（直前まで ${w} ms 待っていました）` : ''}`,
      lFull: (t) => `<span class="m">t=${t}</span> 充填が終わりました。2 枚が初めて同時に働いています`,
      lDrain: (t) => `<span class="m">t=${t}</span> 排出が始まりました。GPU A にはもう新しいチャンクがなく、GPU B だけが仕上げています`,
      lDone: (t, s) => `<span class="w">完了</span>：t = ${t} ms。1 枚で直列にやると ${s} ms かかります`,
      verdict: (n, tot, ser, sp) => n === 1
        ? `チャンクが 1 つだけのとき、2 枚は <b>${tot} ms</b>、1 枚で直列なら <b>${ser} ms</b> です。2 枚でも、よくて引き分けです。同じデータは、前半の層を通ってから後半の層を通る必要があり、2 枚が同時に手伝うことはできません。レイヤー分割で<b>token 1 個</b>が速くなる道は、ただ 1 つ。各 GPU がエキスパートをより多くキャッシュして、CPU の出番を減らすことです。`
        : `${n} チャンクで <b>${tot} ms</b>、直列なら <b>${ser} ms</b>、<b>${sp}</b> 倍の高速化です。2 枚が同時に忙しくなれるのは、<b>別々の</b>チャンクを処理しているときだけです。最初の充填と最後の排出のバブルは省けません。遅いほうの GPU がリズムを決めます。`,

      rCode: 'LINK_BUDGET', rTitle: '受け渡し 1 回にかかる時間', rTag: '教育用の試算 · 遅延は仮定の値',
      rIntro: '同じ 2 枚の GPU でも、分担と接続を変えると、通信コストはどれくらい変わるでしょうか。<b>GPU をまたぐ 1 回 = 固定の遅延 + バイト数 ÷ 帯域</b>。レイヤー分割は、検証ウィンドウごとに 1 回受け渡します。RAM を中継するので、バスは 2 回通ります。仮想のテンソル並列は、層ごとに 2 回同期します。',
      rLgSplit: 'レイヤー分割（Strata の方式）', rLgTp: 'テンソル並列（仮想の比較対象）', rLgPre: 'プロンプトを読むとき 1 チャンクを受け渡す',
      links: { p4x4: 'PCIe 4.0 ×4', p3x16: 'PCIe 3.0 ×16', p4x16: 'PCIe 4.0 ×16', p5x16: 'PCIe 5.0 ×16', nvl4: 'NVLink 4.0' },
      linkNote: { p4x4: 'マザーボードの短めのスロット', p3x16: '少し古いマザーボード', p4x16: 'よくある GPU 用スロット', p5x16: '新しいプラットフォームの GPU 用スロット', nvl4: 'H100 の 18 本のリンク' },
      sT: 'ウィンドウの token 数', sLat: '1 回の固定遅延（µs）',
      lane1: 'レイヤー分割', lane1s: '1 ウィンドウに 2 回', lane2: 'テンソル並列', lane2s: '1 ウィンドウに 96 回', lane3: 'プロンプト 1 チャンク', lane3s: '2048 token',
      eq1: (t, kb, n) => `2 × (${t} µs + ${kb} KB ÷ 帯域)、${n} token × 51,216 バイト`,
      eq2: (t, kb) => `96 × (${t} µs + ${kb} KB ÷ 帯域)、48 層 × 1 層に 2 回の同期`,
      eq3: (mb) => `2 × ${mb} MB ÷ 帯域、帯域だけで遅延は数えない`,
      kRatio: 'テンソル並列 ÷ レイヤー分割', fRatio: '<b>= テンソル並列の時間 ÷ レイヤー分割の時間</b><br>同期の回数が多いので、固定遅延が 96 回ぶん掛かる',
      kBytes: 'レイヤー分割が 1 ウィンドウで運ぶバイト数', fBytes: (n) => `<b>= 2 × ${n} × 51,216 バイト</b><br>51,216 = (4 × 2560 + 2560 + 4) × 4`,
      log: (name, n, lat, s, tp) => `<span class="c">${name}</span> · ${n} token · 遅延 ${lat} µs → レイヤー分割 <span class="y">${s} µs</span>、テンソル並列 <span class="m">${tp} µs</span>`,
      rReady: '<span class="c">$</span> 接続を 1 つ選び、スライダーを動かしてください。結果がここに記録されます',
      rVerdict: (s, tp, r, pre) => `① レイヤー分割は、1 ウィンドウに受け渡しが 1 回だけで、約 <b>${s} µs</b> です。十数ミリ秒のウィンドウと比べれば、無視できます。<br>② 仮想のテンソル並列は 96 回同期するので、約 <b>${tp} µs</b>、レイヤー分割の <b>${r}</b> 倍です。遅延にずっと弱いので、ふつうは NVLink のような高速な接続と組み合わせます。<br>③ プロンプトを読むとき、2048 token の 1 チャンクの受け渡しは約 <b>${pre} ms</b> で、そのチャンクを読む時間よりずっと小さいです。Strata が NVLink を求めず、×4 のスロットでも使える理由は、ここにあります。`,
      rTry: [
        '<b>PCIe 4.0 ×16</b> で、遅延を 10 から 30 µs に上げます。テンソル並列は大きく増え、レイヤー分割はほとんど動きません。バイト数より回数のほうが効きます。',
        '<b>NVLink 4.0</b> に切り替えて、遅延を 2 µs にします。テンソル並列のコストは数百マイクロ秒まで下がります。データセンターが NVLink を使う理由が、これです。',
        '<b>PCIe 4.0 ×4</b> に切り替えます。プロンプト 1 チャンクの受け渡しは約 21 ms になりますが、そのチャンクを読む時間よりはずっと小さいままです。',
      ],
    },
    es: {
      code: 'PIPE_SIM', title: 'Pipeline de dos tarjetas: leer un prompt', tag: 'Estimación didáctica · los tiempos son supuestos',
      intro: 'El prompt se corta en N chunks. La primera tarjeta lee las capas delanteras y la segunda tarjeta lee las traseras. Arrastra los controles para cambiar los tiempos y pulsa <b>▶ Reproducir</b> para ver cuándo trabaja cada tarjeta y cuándo está ociosa. Las unidades son milisegundos; los valores son supuestos didácticos.',
      lgA: 'La primera tarjeta (GPU A) lee un chunk', lgB: 'La segunda tarjeta (GPU B) lee un chunk', lgX: 'Moviendo datos del traspaso', lgIdle: 'Ociosa (burbuja)',
      steps: ['Cortar en chunks', 'Llenado', 'Las dos tarjetas ocupadas', 'Vaciado', 'Listo'],
      rowA: 'GPU A', rowB: 'GPU B', axis: (t) => `${t} ms`,
      sA: 'GPU A por chunk (a)', sB: 'GPU B por chunk (b)', sX: 'Cada transferencia (x)', sN: 'Chunks (N)',
      bPlay: '▶ Reproducir', bOne: 'Solo un token', bReset: 'Reiniciar',
      ready: '<span class="c">$</span> ready. Pulsa [ ▶ Reproducir ] y la línea de tiempo avanza de izquierda a derecha',
      kTotal: 'Tiempo total con dos tarjetas', fTotal: (a, b, n, m) => `<b>= (a+x) + (b+x) + (N−1) × máx</b><br>= ${a} + ${b} + ${n - 1} × ${m}`,
      kSerial: 'Una tarjeta, todo en secuencia', fSerial: (n, a, b) => `<b>= N × (a + b)</b><br>= ${n} × (${a} + ${b})`,
      kSpeed: 'Aceleración', fSpeed: '<b>= tiempo en serie ÷ tiempo con dos tarjetas</b><br>solo hay ganancia si es mayor que 1',
      kIdle: 'Cuánto tiempo está ociosa cada tarjeta', fIdle: (n, a, b) => `<b>A ociosa = total − ${n} × ${a}</b><br><b>B ociosa = total − ${n} × ${b}</b>`,
      idle: (a, b) => `A ${a} · B ${b} ms`,
      try: [
        'Deja a = 4, b = 5, x = 0 y arrastra N de 1 a 8: el total es <b>5N + 4</b>. Cuantos más chunks, menor es la parte que ocupan las burbujas del principio y del final.',
        'Pon la transferencia x en 1 y pulsa <b>Solo un token</b>: con N = 1, dos tarjetas son más lentas que una. Las capas de un token deben calcularse una tras otra, las dos tarjetas no pueden ayudarse y hay dos transferencias extra.',
        'Arrastra a a 2 y b a 8: la tarjeta lenta marca el ritmo y la rápida está ociosa casi todo el tiempo. Por eso las capas deben asignarse según la velocidad.',
      ],
      lStartA: (c, t) => `<span class="c">t=${t}</span> la GPU A empieza a leer el chunk ${c} (capas delanteras)`,
      lHand: (c, t) => `<span class="y">t=${t}</span> la GPU A traspasa el chunk ${c}; los datos van al búfer de traspaso en la RAM`,
      lStartB: (c, t, w) => `<span class="c">t=${t}</span> la GPU B empieza a leer el chunk ${c}${w > 0 ? ` (acababa de estar ociosa ${w} ms)` : ''}`,
      lFull: (t) => `<span class="m">t=${t}</span> llenado terminado: las dos tarjetas trabajan a la vez por primera vez`,
      lDrain: (t) => `<span class="m">t=${t}</span> empieza el vaciado: la GPU A no tiene chunks nuevos, solo la GPU B está terminando`,
      lDone: (t, s) => `<span class="w">Listo</span>: t = ${t} ms; una tarjeta en secuencia tomaría ${s} ms`,
      verdict: (n, tot, ser, sp) => n === 1
        ? `Con un solo chunk, dos tarjetas toman <b>${tot} ms</b> y una tarjeta en secuencia toma <b>${ser} ms</b>; en el mejor caso, dos tarjetas empatan. Los mismos datos deben pasar por las capas delanteras antes que por las traseras, así que las dos tarjetas no pueden trabajar en ellos a la vez. La única forma de que una división por capas acelere un <b>solo token</b> es que cada tarjeta pueda guardar en caché más expertos y dejar menos para la CPU.`
        : `${n} chunks tomaron <b>${tot} ms</b>, frente a <b>${ser} ms</b> en secuencia: una aceleración de <b>${sp}×</b>. Las dos tarjetas solo pueden estar ocupadas a la vez mientras tratan chunks <b>distintos</b>; la burbuja de llenado del principio y la de vaciado del final son inevitables, y la tarjeta más lenta marca el ritmo.`,

      rCode: 'LINK_BUDGET', rTitle: 'Cuánto tarda un traspaso', rTag: 'Estimación didáctica · la latencia es un supuesto',
      rIntro: 'Las mismas dos tarjetas, otro reparto, otro enlace: ¿cuánto cambia el costo de comunicación? <b>Cada cruce = latencia fija + bytes ÷ ancho de banda</b>. La división por capas traspasa una vez por ventana de verificación, cruzando el bus dos veces porque retransmite por la RAM; una división hipotética por tensores sincroniza dos veces por capa.',
      rLgSplit: 'División por capas (la forma de Strata)', rLgTp: 'Paralelismo de tensores (comparación hipotética)', rLgPre: 'Traspasar un chunk al leer un prompt',
      links: { p4x4: 'PCIe 4.0 ×4', p3x16: 'PCIe 3.0 ×16', p4x16: 'PCIe 4.0 ×16', p5x16: 'PCIe 5.0 ×16', nvl4: 'NVLink 4.0' },
      linkNote: { p4x4: 'una ranura de placa base más corta', p3x16: 'placas base antiguas', p4x16: 'una ranura de tarjeta gráfica común', p5x16: 'ranura gráfica de las plataformas nuevas', nvl4: 'los 18 enlaces de un H100' },
      sT: 'Tokens en la ventana', sLat: 'Latencia fija por cruce (µs)',
      lane1: 'Por capas', lane1s: '2 por ventana', lane2: 'Tensor paralelo', lane2s: '96 por ventana', lane3: 'Un chunk de prompt', lane3s: '2.048 tokens',
      eq1: (t, kb, n) => `2 × (${t} µs + ${kb} KB ÷ ancho de banda), ${n} tokens × 51.216 bytes`,
      eq2: (t, kb) => `96 × (${t} µs + ${kb} KB ÷ ancho de banda), 48 capas × 2 sincronizaciones por capa`,
      eq3: (mb) => `2 × ${mb} MB ÷ ancho de banda, solo ancho de banda, sin latencia`,
      kRatio: 'Tensor paralelo ÷ división por capas', fRatio: '<b>= tiempo del tensor paralelo ÷ tiempo de la división por capas</b><br>muchas sincronizaciones multiplican la latencia fija 96 veces',
      kBytes: 'Bytes que mueve la división por capas por ventana', fBytes: (n) => `<b>= 2 × ${n} × 51.216 bytes</b><br>51.216 = (4 × 2560 + 2560 + 4) × 4`,
      log: (name, n, lat, s, tp) => `<span class="c">${name}</span> · ${n} tokens · latencia ${lat} µs → división por capas <span class="y">${s} µs</span>, tensor paralelo <span class="m">${tp} µs</span>`,
      rReady: '<span class="c">$</span> elige un enlace y arrastra los controles; cada resultado se registra aquí',
      rVerdict: (s, tp, r, pre) => `① La división por capas traspasa solo una vez por ventana, unos <b>${s} µs</b>, despreciable junto a una ventana de una docena larga de milisegundos.<br>② La división hipotética por tensores debe sincronizar 96 veces, unos <b>${tp} µs</b>, <b>${r}×</b> la división por capas; es mucho más sensible a la latencia, y por eso suele venir con un enlace rápido como NVLink.<br>③ Al leer un prompt, traspasar un chunk de 2.048 tokens toma unos <b>${pre} ms</b>, mucho menos que leer el propio chunk. Por eso Strata no necesita NVLink y funciona incluso en una ranura ×4.`,
      rTry: [
        'En <b>PCIe 4.0 ×16</b>, sube la latencia de 10 a 30 µs: el tensor paralelo crece mucho mientras la división por capas casi no se mueve. El número de cruces perjudica más que los bytes.',
        'Cambia a <b>NVLink 4.0</b> y pon la latencia en 2 µs: el costo del tensor paralelo baja a unos cientos de microsegundos, que es justo por lo que los centros de datos lo usan.',
        'Cambia a <b>PCIe 4.0 ×4</b>: traspasar un chunk de prompt ahora toma unos 21 ms, todavía mucho menos que el tiempo de leer ese chunk.',
      ],
    },
  });

  const r1 = v => (Math.round(v * 10) / 10).toString();

  Viz.register('layer-pipeline', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgA, glow: true },
        { color: 'var(--a2)', text: T.lgB },
        { color: 'var(--a3)', text: T.lgX },
        { color: 'var(--frame)', text: T.lgIdle },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 560, X0 = 64, X1 = 548;
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} 150`, class: 'viz-stage', role: 'img', 'aria-label': T.title }, left);
      const sliders = [['a', T.sA, 1, 10, 1, 4], ['b', T.sB, 1, 10, 1, 5], ['x', T.sX, 0, 3, 0.5, 0], ['n', T.sN, 1, 8, 1, 8]];
      left.insertAdjacentHTML('beforeend', sliders.map(([id, lab, lo, hi, st, v]) =>
        `<div class="viz-slider"><label>${lab}</label><input type="range" data-k="${id}" min="${lo}" max="${hi}" step="${st}" value="${v}" aria-label="${Viz.esc(lab)}"><output data-o="${id}">${v}</output></div>`).join('') +
        `<div class="viz-row">${Viz.button(T.bPlay)}${Viz.button(T.bOne, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'p-total', k: T.kTotal, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'p-serial', k: T.kSerial, v: '', f: '' }) +
        Viz.stat({ id: 'p-speed', k: T.kSpeed, v: '', f: T.fSpeed }) +
        Viz.stat({ id: 'p-idle', k: T.kIdle, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const inputs = [...el.querySelectorAll('input[type=range]')];
      const [playBtn, oneBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const P = () => Object.fromEntries(inputs.map(i => [i.dataset.k, +i.value]));
      let sched = null, cursor = null, busy = false;

      function draw() {
        const p = P(), s = M.pipeline(p.a, p.b, p.x, p.n);
        sched = s;
        const scale = (X1 - X0) / s.total, X = t => X0 + t * scale;
        svg.innerHTML = '';
        const rows = [[T.rowA, 30], [T.rowB, 78]];
        rows.forEach(([lab, y]) => {
          Viz.svg('rect', { x: X0, y, width: X1 - X0, height: 30, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
          Viz.svg('text', { x: 6, y: y + 20, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = lab;
        });
        s.chunks.forEach((c, i) => {
          Viz.svg('rect', { x: X(c.aStart), y: 31, width: Math.max(0, p.a * scale - 1), height: 28, style: 'fill:var(--accent)' }, svg);
          if (p.x > 0) Viz.svg('rect', { x: X(c.aStart + p.a), y: 31, width: Math.max(0, p.x * scale - 1), height: 28, style: 'fill:var(--a3)' }, svg);
          if (p.x > 0) Viz.svg('rect', { x: X(c.bStart), y: 79, width: Math.max(0, p.x * scale - 1), height: 28, style: 'fill:var(--a3)' }, svg);
          Viz.svg('rect', { x: X(c.bStart + p.x), y: 79, width: Math.max(0, p.b * scale - 1), height: 28, style: 'fill:var(--a2)' }, svg);
          if (p.a * scale > 14) Viz.svg('text', { x: X(c.aStart) + p.a * scale / 2, y: 50, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--paper)' }, svg).textContent = i + 1;
          if (p.b * scale > 14) Viz.svg('text', { x: X(c.bStart + p.x) + p.b * scale / 2, y: 98, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--paper)' }, svg).textContent = i + 1;
        });
        const ticks = 5;
        for (let i = 0; i <= ticks; i++) {
          const t = s.total * i / ticks;
          Viz.svg('text', { x: X(t), y: 132, 'font-size': 11, 'text-anchor': i === 0 ? 'start' : i === ticks ? 'end' : 'middle', style: 'fill:var(--muted)' }, svg).textContent = T.axis(r1(t));
        }
        cursor = Viz.svg('line', { x1: X0, x2: X0, y1: 22, y2: 116, style: 'stroke:var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3', opacity: 0 }, svg);
        inputs.forEach(i => { $(`[data-o=${i.dataset.k}]`).textContent = i.value; });
        const A = p.a + p.x, B = p.b + p.x;
        $('[data-s=p-total-v]').textContent = r1(s.total) + ' ms';
        $('[data-s=p-total-f]').innerHTML = T.fTotal(r1(A), r1(B), p.n, r1(s.steady));
        $('[data-s=p-serial-v]').textContent = r1(s.serial) + ' ms';
        $('[data-s=p-serial-f]').innerHTML = T.fSerial(p.n, p.a, p.b);
        $('[data-s=p-speed-v]').textContent = s.speedup.toFixed(2) + ' ×';
        $('[data-s=p-idle-v]').textContent = T.idle(r1(s.idleA), r1(s.idleB));
        $('[data-s=p-idle-f]').innerHTML = T.fIdle(p.n, r1(A), r1(B));
        $('.viz-verdict').hidden = true;
        pipe.set(-1);
        return s;
      }

      function events(s) {
        const ev = [];
        s.chunks.forEach((c, i) => {
          ev.push({ t: c.aStart, h: T.lStartA(i + 1, r1(c.aStart)) });
          ev.push({ t: c.aEnd, h: T.lHand(i + 1, r1(c.aEnd)) });
          ev.push({ t: c.bStart, h: T.lStartB(i + 1, r1(c.bStart), r1(i ? c.bStart - s.chunks[i - 1].bEnd : c.bStart)) });
        });
        if (s.chunks.length > 1) {
          ev.push({ t: s.chunks[0].bStart + 1e-6, h: T.lFull(r1(s.chunks[0].bStart)), phase: 2 });
          ev.push({ t: s.chunks.at(-1).aEnd + 2e-6, h: T.lDrain(r1(s.chunks.at(-1).aEnd)), phase: 3 });
        }
        return ev.sort((p, q) => p.t - q.t);
      }

      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn, input').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn, input').forEach(b => b.disabled = false);
      }

      async function play() {
        const s = draw(), ev = events(s), X = t => X0 + t * (X1 - X0) / s.total;
        term.clear();
        pipe.set(0); await ctx.sleep(300);
        pipe.set(1);
        cursor.setAttribute('opacity', 1);
        const frames = ctx.reduced ? 1 : 60;
        let k = 0;
        for (let f = 1; f <= frames; f++) {
          const now = s.total * f / frames;
          cursor.setAttribute('x1', X(now)); cursor.setAttribute('x2', X(now));
          while (k < ev.length && ev[k].t <= now + 1e-9) { term.log(ev[k].h); if (ev[k].phase) pipe.set(ev[k].phase); k++; }
          await ctx.sleep(45);
        }
        while (k < ev.length) term.log(ev[k++].h);
        pipe.set(4);
        term.log(T.lDone(r1(s.total), r1(s.serial)));
        const p = P(), v = $('.viz-verdict');
        v.innerHTML = T.verdict(p.n, r1(s.total), r1(s.serial), s.speedup.toFixed(2));
        v.hidden = false;
      }

      playBtn.onclick = () => guard(play);
      oneBtn.onclick = () => guard(async () => { $('input[data-k=n]').value = 1; await play(); });
      resetBtn.onclick = () => guard(async () => {
        [['a', 4], ['b', 5], ['x', 0], ['n', 8]].forEach(([k, v]) => { $(`input[data-k=${k}]`).value = v; });
        draw(); term.clear(); term.log(T.ready);
      });
      inputs.forEach(i => { i.oninput = () => draw(); });
      draw();
    },
  });

  Viz.register('link-budget', {
    mount(el) {
      const body = Viz.frame(el, { code: T.rCode, title: T.rTitle, tag: T.rTag, intro: T.rIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.rLgSplit, glow: true },
        { color: 'var(--a2)', text: T.rLgTp },
        { color: 'var(--a3)', text: T.rLgPre },
      ]) +
        `<div class="viz-row">${M.LINKS.map(l => `<button type="button" class="viz-btn ghost" data-l="${l.id}">${Viz.esc(T.links[l.id])}</button>`).join('')}</div>` +
        `<div class="viz-slider"><label>${T.sT}</label><input type="range" data-k="t" min="1" max="9" step="1" value="5" aria-label="${Viz.esc(T.sT)}"><output data-o="t">5</output></div>` +
        `<div class="viz-slider"><label>${T.sLat}</label><input type="range" data-k="lat" min="1" max="30" step="1" value="10" aria-label="${Viz.esc(T.sLat)}"><output data-o="lat">10</output></div>` +
        [[T.lane1, T.lane1s, ''], [T.lane2, T.lane2s, ' alt'], [T.lane3, T.lane3s, '']].map(([n, s, alt], i) =>
          `<div class="viz-lane${alt}"><div class="n">${n}<small>${s}</small></div><div class="viz-track"><i data-i="${i}"${i === 2 ? ' style="background:var(--a3)"' : ''}></i></div><div class="t" data-t="${i}"></div><div class="eq" data-e="${i}"></div></div>`).join('') +
        '<div class="viz-cols" style="margin-top:12px"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.innerHTML = Viz.stat({ id: 'l-ratio', k: T.kRatio, v: '', f: T.fRatio, hot: true });
      right.innerHTML = Viz.stat({ id: 'l-bytes', k: T.kBytes, v: '', f: '' });
      const term = Viz.term(body, T.rReady);
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.rTry));
      const $ = s => el.querySelector(s);
      let link = M.LINKS[2];
      function update(log) {
        const n = +$('input[data-k=t]').value, lat = +$('input[data-k=lat]').value;
        $('[data-o=t]').textContent = n; $('[data-o=lat]').textContent = lat;
        el.querySelectorAll('[data-l]').forEach(b => { b.classList.toggle('ghost', b.dataset.l !== link.id); });
        const s = M.layerSplitWindow(n, link.gbps, lat), tp = M.tensorWindow(n, link.gbps, lat), pre = M.prefillHandoffMs(2048, link.gbps);
        const us = [s.us, tp.us], max = Math.max(...us);
        el.querySelectorAll('.viz-track i').forEach((b, i) => { b.style.width = (i < 2 ? us[i] / max : Math.min(1, pre / 25)) * 100 + '%'; });
        $('[data-t="0"]').textContent = r1(s.us) + ' µs';
        $('[data-t="1"]').textContent = Math.round(tp.us) + ' µs';
        $('[data-t="2"]').textContent = r1(pre) + ' ms';
        $('[data-e="0"]').textContent = T.eq1(lat, r1(n * M.DECODE_HANDOFF_BYTES / 1e3), n);
        $('[data-e="1"]').textContent = T.eq2(lat, r1(n * M.N_EMBD * 4 / 1e3));
        $('[data-e="2"]').textContent = T.eq3(r1(M.prefillChunkBytes(2048) / 1e6));
        $('[data-s=l-ratio-v]').textContent = (tp.us / s.us).toFixed(1) + ' ×';
        $('[data-s=l-bytes-v]').textContent = Viz.fmt(s.bytes) + ' B';
        $('[data-s=l-bytes-f]').innerHTML = T.fBytes(n);
        $('.viz-verdict').innerHTML = T.rVerdict(r1(s.us), Math.round(tp.us), (tp.us / s.us).toFixed(0), r1(pre));
        if (log) term.log(T.log(Viz.esc(T.links[link.id]) + ' ' + link.gbps + ' GB/s', n, lat, r1(s.us), Math.round(tp.us)));
      }
      el.querySelectorAll('[data-l]').forEach(b => { b.onclick = () => { link = M.LINKS.find(l => l.id === b.dataset.l); update(true); }; b.title = T.linkNote[b.dataset.l]; });
      el.querySelectorAll('input[type=range]').forEach(i => { i.oninput = () => update(false); i.onchange = () => update(true); });
      update(true);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
