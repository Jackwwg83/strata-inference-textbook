/* Chapter 15 widgets: the kernel-launch timeline (direct vs fused vs graph) and the frozen-position replay.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.launch;

  const T = Viz.t({
    zh: {
      code: 'LAUNCH_TIMELINE', title: '启动开销时间线', tag: '教学推演 · 参数可调',
      intro: '同样一串小 kernel，用三种方式交给 GPU。上面一行是 CPU 在“提交”，下面一行是 GPU 在“计算”。拖动滑块，再按 <b>播放</b>，看 GPU 有多少时间在干等。',
      lgCpu: 'CPU 提交一次启动', lgGpu: 'GPU 在计算', lgIdle: 'GPU 空闲（在等下一次提交）',
      rows: ['逐个启动', '融合', 'CUDA Graph'], cpu: 'CPU', gpu: 'GPU',
      stageLabel: '三种提交方式的时间线',
      nLabel: 'kernel 个数 n', wLabel: '每个 kernel 计算 w', lLabel: '每次启动开销 L', gLabel: '几个融合成一个 g',
      us: (x) => `${x} µs`, nOut: (x) => `${x} 个`, gOut: (x) => `${x} 合 1`,
      bPlay: '▶ 播放', bReset: '重置',
      ready: '<span class="c">$</span> ready. 调好参数后按 [ ▶ 播放 ]',
      sDirK: '逐个启动：总时间', sFusK: '融合：总时间', sGraK: 'CUDA Graph：总时间',
      sDirF: (n, L, w, busy) => (w < L ? `<b>= ${n} × ${L} + ${w}</b>（n × L + w：kernel 比启动短）` : `<b>= ${L} + ${n} × ${w}</b>（L + n × w：kernel 比启动长）`) + `<br>GPU 忙碌占比 ${busy}%`,
      sFusF: (m, g, busy) => `<b>启动次数 ${m} = ⌈n ÷ ${g}⌉</b><br>GPU 忙碌占比 ${busy}%`,
      sGraF: (busy) => `<b>= 1 次图启动 + n × w</b><br>GPU 忙碌占比 ${busy}%`,
      tPlay: '<span class="y">// 时钟开始走，三种方式同时出发</span>',
      tDir: (n, L, w, tot, busy) => `<span class="c">逐个启动</span>：CPU 提交 ${n} 次，每次 ${L} µs；每个 kernel 只算 ${w} µs。共 ${tot} µs，GPU 忙了 ${busy}%`,
      tFus: (m, tot, busy) => `<span class="m">融合</span>：只剩 ${m} 次启动，每个 kernel 干得更多。共 ${tot} µs，GPU 忙了 ${busy}%`,
      tGra: (tot, busy) => `<span class="w">CUDA Graph</span>：整串只提交 1 次，节点一个接一个跑。共 ${tot} µs，GPU 忙了 ${busy}%`,
      vLaunch: (x) => `① 每个 kernel 只算 w，却要等 L 才轮到它：GPU 大部分时间在<b>等 CPU 提交</b>，这叫“启动受限”。<br>② 融合减少了启动次数；CUDA Graph 把提交压到一次，GPU 几乎不停。这里图比逐个启动快 <b>${x} 倍</b>。<br>③ Strata 源码注释里的实测：一个层块的 43 个节点，逐个启动 2.393 ms，图重放 1.585 ms。`,
      vCompute: (saved) => `① 现在每个 kernel 比一次启动还长，GPU 一直有活干，提交开销被<b>藏在计算后面</b>。<br>② 所以图只比逐个启动省下 <b>${saved}%</b> 的时间：启动开销已经不是瓶颈。<br>③ 先找到真正的瓶颈，再决定要不要做融合或图。`,
      try: [
        '保持默认（w = 5 µs、L = 20 µs）按 <b>播放</b>：逐个启动那一行，GPU 行几乎全是空隙。小 kernel 的时间都花在“排队等提交”上。',
        '把 <b>w</b> 拉到 40 µs 再播放：三行的总时间差不多了。kernel 一长，启动开销就被计算盖住。',
        '把 <b>g</b> 从 1 拉到 8：融合越多，启动次数越少，但每个 kernel 越大。真实的融合还会占更多寄存器，这里没有画出来。',
      ],

      fCode: 'GRAPH_REPLAY', fTitle: '被冻住的位置', fTag: '教学推演 · 只画 8 格 KV',
      fIntro: 'CUDA Graph 录下 kernel 时，连参数一起录。选一种写法，按 <b>单步</b> 连续生成几个 token，看 KV 缓存每一格被谁写入。',
      fLgCell: '一格 = KV 缓存里的一个位置', fLgNew: '这一步刚写入', fLgOld: '早先写入、仍然有效',
      modes: ['参数按值录进图（错误写法）', 'kernel 从 step 缓冲读位置（Strata 的写法）'],
      fSteps: ['主机准备位置', '重放图', '写入 KV', '注意力读历史', '输出 token'],
      cellsLabel: '8 格 KV 缓存与 step 缓冲',
      stepNames: ['pos', 'n_kv', 'n_bid', 'width'],
      kvTitle: 'KV 缓存（位置 0–7）', stepTitle: 'kernel 看到的 step 缓冲',
      bStep: '▶ 单步', bReset: '重置',
      fReady: '<span class="c">$</span> ready. 先选写法，再按 [ ▶ 单步 ]',
      sTrueK: '真实位置', sSeenK: 'kernel 看到的位置', sNkvK: '注意力能看到几格',
      sTrueF: '<b>= 已生成的 token 数</b><br>第 0 个 token 在位置 0', sSeenF: (frozen) => frozen ? '<b>录图那一刻的值，永远是 0</b><br>重放不会重新读参数' : '<b>每步由主机写进同一块显存</b><br>地址不变，内容在变',
      sNkvF: '<b>n_kv = pos + 1</b><br>和 pos 一起放在 step 缓冲里',
      p0: (t, frozen) => frozen ? `<span class="c">[t${t}]</span> 主机知道这是第 ${t} 个 token，可位置是 kernel 参数，录图时已经定成 0` : `<span class="c">[t${t}]</span> 主机把 pos = ${t} 写进 step 缓冲（同一块显存，地址不变）`,
      p1: '<span class="m">重放</span>：一次提交，整张图照录好的样子再跑一遍',
      p2: (pos) => `<span class="w">写入 KV</span>：kv_append 把这个 token 的 K、V 写进位置 ${pos}`,
      p3: (n) => `<span class="y">注意力</span>：只读前 ${n} 格历史`,
      p4: (frozen) => frozen ? '<span class="c">→</span> 输出一个 token：数值有限、不报错，可模型只“记得”刚写入的那一格' : '<span class="c">→</span> 输出一个 token：历史完整，和不录图时算的一样',
      fVerdictBad: '① 4 个 token 全写进了位置 0，注意力每次只看 1 格。<br>② 程序没有崩溃，输出也是正常的数字，只是模型像<b>失忆</b>了。这类错误最难查。<br>③ Strata 的 qsa.hpp 专门列出了 6 个会被这样冻住的参数，并把它们全部改成从 step 缓冲读取。',
      fVerdictGood: '① 4 个 token 各占一格，注意力能看到全部历史。<br>② 图里录下的是 step 缓冲的<b>地址</b>，主机每步只改它的<b>内容</b>。<br>③ 这就是 Strata 能把整层录成图、还保证每步位置正确的原因。',
      fTry: [
        '选 <b>按值录进图</b>，连按 <b>单步</b> 走完 4 个 token：所有写入都挤在位置 0，注意力始终只看 1 格。',
        '换成 <b>从 step 缓冲读</b>，再走 4 个 token：位置 0–3 依次填满，n_kv 跟着长。',
        '盯住右边的 step 缓冲：四个数一起变。它们互相依赖，放在一块显存里由一处代码写，就不会出现“改了一个、忘了另一个”。',
      ],
    },
    en: {
      code: 'LAUNCH_TIMELINE', title: 'Launch overhead timeline', tag: 'Teaching estimate · adjustable',
      intro: 'The same chain of small kernels, handed to the GPU in three ways. The upper lane is the CPU "submitting"; the lower lane is the GPU "computing". Move the sliders, then press <b>Play</b> to see how long the GPU sits idle.',
      lgCpu: 'CPU submits one launch', lgGpu: 'GPU is computing', lgIdle: 'GPU idle (waiting for the next submission)',
      rows: ['One by one', 'Fused', 'CUDA Graph'], cpu: 'CPU', gpu: 'GPU',
      stageLabel: 'Timelines of the three ways to submit',
      nLabel: 'Number of kernels n', wLabel: 'Compute time per kernel w', lLabel: 'Overhead per launch L', gLabel: 'Kernels fused into one g',
      us: (x) => `${x} µs`, nOut: (x) => `${x}`, gOut: (x) => `${x} in 1`,
      bPlay: '▶ Play', bReset: 'Reset',
      ready: '<span class="c">$</span> ready. Set the sliders, then press [ ▶ Play ]',
      sDirK: 'One by one: total time', sFusK: 'Fused: total time', sGraK: 'CUDA Graph: total time',
      sDirF: (n, L, w, busy) => (w < L ? `<b>= ${n} × ${L} + ${w}</b> (n × L + w: the kernel is shorter than a launch)` : `<b>= ${L} + ${n} × ${w}</b> (L + n × w: the kernel is longer than a launch)`) + `<br>GPU busy ${busy}% of the time`,
      sFusF: (m, g, busy) => `<b>${m} launches = ⌈n ÷ ${g}⌉</b><br>GPU busy ${busy}% of the time`,
      sGraF: (busy) => `<b>= 1 graph launch + n × w</b><br>GPU busy ${busy}% of the time`,
      tPlay: '<span class="y">// the clock starts; all three ways set off together</span>',
      tDir: (n, L, w, tot, busy) => `<span class="c">One by one</span>: the CPU submits ${n} times, ${L} µs each; each kernel computes for only ${w} µs. Total ${tot} µs, GPU busy ${busy}%`,
      tFus: (m, tot, busy) => `<span class="m">Fused</span>: only ${m} launches left, and each kernel does more work. Total ${tot} µs, GPU busy ${busy}%`,
      tGra: (tot, busy) => `<span class="w">CUDA Graph</span>: the whole chain is submitted once, and the nodes run back to back. Total ${tot} µs, GPU busy ${busy}%`,
      vLaunch: (x) => `① Each kernel computes for only w but must wait L for its turn: the GPU spends most of its time <b>waiting for the CPU to submit</b>. This is called being "launch-bound".<br>② Fusion cuts the number of launches; CUDA Graph cuts submission to a single one, and the GPU hardly stops. Here the graph is <b>${x}×</b> faster than launching one by one.<br>③ A measurement from a comment in Strata's source: the 43 nodes of one layer block take 2.393 ms launched one by one, and 1.585 ms as a graph replay.`,
      vCompute: (saved) => `① Now each kernel runs longer than one launch, so the GPU always has work, and the submission cost is <b>hidden behind the computation</b>.<br>② So the graph saves only <b>${saved}%</b> of the time compared with launching one by one: launch overhead is no longer the bottleneck.<br>③ Find the real bottleneck first, then decide whether fusion or a graph is worth it.`,
      try: [
        'Keep the defaults (w = 5 µs, L = 20 µs) and press <b>Play</b>: in the one-by-one row, the GPU lane is almost all gaps. Small kernels spend their time "queuing for submission".',
        'Drag <b>w</b> to 40 µs and play again: the three totals are now close. Once a kernel is long, the computation covers the launch overhead.',
        'Drag <b>g</b> from 1 to 8: the more you fuse, the fewer the launches, but each kernel gets bigger. Real fusion also uses more registers, which is not drawn here.',
      ],

      fCode: 'GRAPH_REPLAY', fTitle: 'The frozen position', fTag: 'Teaching estimate · only 8 KV slots drawn',
      fIntro: 'When CUDA Graph records a kernel, it records the arguments too. Pick a way of writing it, then press <b>Step</b> to generate several tokens in a row and see who writes each KV cache slot.',
      fLgCell: 'One cell = one position in the KV cache', fLgNew: 'Just written in this step', fLgOld: 'Written earlier, still valid',
      modes: ['Argument captured by value (wrong)', 'Kernel reads pos from the step buffer (Strata)'],
      fSteps: ['Host prepares position', 'Replay graph', 'Write KV', 'Attention reads history', 'Output token'],
      cellsLabel: 'An 8-slot KV cache and the step buffer',
      stepNames: ['pos', 'n_kv', 'n_bid', 'width'],
      kvTitle: 'KV cache (positions 0–7)', stepTitle: 'The step buffer the kernel sees',
      bStep: '▶ Step', bReset: 'Reset',
      fReady: '<span class="c">$</span> ready. Pick a way of writing it, then press [ ▶ Step ]',
      sTrueK: 'True position', sSeenK: 'Position the kernel sees', sNkvK: 'Slots attention can see',
      sTrueF: '<b>= tokens generated so far</b><br>token 0 sits at position 0', sSeenF: (frozen) => frozen ? '<b>The value at capture time, always 0</b><br>replay never rereads arguments' : '<b>The host writes it into the same VRAM block every step</b><br>same address, new content',
      sNkvF: '<b>n_kv = pos + 1</b><br>kept in the step buffer next to pos',
      p0: (t, frozen) => frozen ? `<span class="c">[t${t}]</span> the host knows this is token ${t}, but the position is a kernel argument, fixed at 0 when the graph was captured` : `<span class="c">[t${t}]</span> the host writes pos = ${t} into the step buffer (same VRAM block, same address)`,
      p1: '<span class="m">Replay</span>: one submission, and the whole graph runs again exactly as recorded',
      p2: (pos) => `<span class="w">Write KV</span>: kv_append writes this token's K and V into position ${pos}`,
      p3: (n) => `<span class="y">Attention</span>: reads only the first ${n} slot(s) of history`,
      p4: (frozen) => frozen ? '<span class="c">→</span> outputs a token: finite numbers, no error, yet the model "remembers" only the slot it just wrote' : '<span class="c">→</span> outputs a token: the history is complete, same as without the graph',
      fVerdictBad: '① All 4 tokens went into position 0, and attention sees only 1 slot each time.<br>② The program did not crash and the output is ordinary numbers; the model just seems to have <b>lost its memory</b>. This kind of bug is the hardest to find.<br>③ Strata\'s qsa.hpp lists the 6 arguments that would freeze this way, and moves all of them into the step buffer.',
      fVerdictGood: '① The 4 tokens each have their own slot, and attention sees the whole history.<br>② The graph records the <b>address</b> of the step buffer; the host changes only its <b>content</b> each step.<br>③ That is how Strata can capture a whole layer as a graph and still get the position right at every step.',
      fTry: [
        'Pick <b>captured by value</b> and keep pressing <b>Step</b> through 4 tokens: every write lands in position 0, and attention always sees just 1 slot.',
        'Switch to <b>reads from the step buffer</b> and run 4 tokens again: positions 0–3 fill up in turn, and n_kv grows with them.',
        'Watch the step buffer on the right: the four numbers change together. They depend on each other, so keeping them in one VRAM block written by one piece of code rules out "changed one, forgot the other".',
      ],
    },
    ar: {
      code: 'LAUNCH_TIMELINE', title: 'الخط الزمني لتكلفة الإطلاق', tag: 'تقدير تعليمي · معاملات قابلة للضبط',
      intro: 'سلسلة واحدة من kernels الصغيرة نسلّمها إلى GPU بثلاث طرق. الصف العلوي هو CPU وهو «يرسل»، والصف السفلي هو GPU وهو «يحسب». حرّك المنزلقات ثم اضغط <b>تشغيل</b> لترى كم من الوقت يقف GPU بلا عمل.',
      lgCpu: 'CPU يرسل إطلاقًا واحدًا', lgGpu: 'GPU يحسب', lgIdle: 'GPU خامل (ينتظر الإرسال التالي)',
      rows: ['إطلاق واحد تلو الآخر', 'مدمج', 'CUDA Graph'], cpu: 'CPU', gpu: 'GPU',
      stageLabel: 'الخطوط الزمنية للطرق الثلاث للإرسال',
      nLabel: 'عدد الـ kernels (n)', wLabel: 'زمن حساب كل kernel (w)', lLabel: 'تكلفة كل إطلاق (L)', gLabel: 'عدد kernels المدموجة في واحدة (g)',
      us: (x) => `${x} µs`, nOut: (x) => `${x}`, gOut: (x) => `${x} في 1`,
      bPlay: '▶ تشغيل', bReset: 'إعادة ضبط',
      ready: '<span class="c">$</span> ready. اضبط المعاملات ثم اضغط [ ▶ تشغيل ]',
      sDirK: 'إطلاق واحد تلو الآخر: الزمن الكلي', sFusK: 'المدمج: الزمن الكلي', sGraK: 'CUDA Graph: الزمن الكلي',
      sDirF: (n, L, w, busy) => (w < L ? `<b>= ${n} × ${L} + ${w}</b> (n × L + w: الـ kernel أقصر من الإطلاق)` : `<b>= ${L} + ${n} × ${w}</b> (L + n × w: الـ kernel أطول من الإطلاق)`) + `<br>نسبة انشغال GPU: ${busy}%`,
      sFusF: (m, g, busy) => `<b>عدد الإطلاقات ${m} = ⌈n ÷ ${g}⌉</b><br>نسبة انشغال GPU: ${busy}%`,
      sGraF: (busy) => `<b>= إطلاق graph واحد + n × w</b><br>نسبة انشغال GPU: ${busy}%`,
      tPlay: '<span class="y">// بدأت الساعة، وانطلقت الطرق الثلاث معًا</span>',
      tDir: (n, L, w, tot, busy) => `<span class="c">إطلاق واحد تلو الآخر</span>: يرسل CPU ${n} مرة، وكل مرة ${L} µs؛ وكل kernel يحسب ${w} µs فقط. المجموع ${tot} µs، وGPU مشغول ${busy}%`,
      tFus: (m, tot, busy) => `<span class="m">المدمج</span>: بقيت ${m} إطلاقات فقط، وكل kernel تعمل أكثر. المجموع ${tot} µs، وGPU مشغول ${busy}%`,
      tGra: (tot, busy) => `<span class="w">CUDA Graph</span>: تُرسَل السلسلة كلها مرة واحدة، وتعمل العقد واحدة بعد الأخرى. المجموع ${tot} µs، وGPU مشغول ${busy}%`,
      vLaunch: (x) => `① كل kernel تحسب w فقط، لكنها تنتظر L حتى يأتي دورها. يقضي GPU معظم وقته في <b>انتظار إرسال CPU</b>، ويسمى هذا «التقيّد بالإطلاق».<br>② الدمج يقلّل عدد الإطلاقات، وCUDA Graph يختصر الإرسال في مرة واحدة، فلا يكاد GPU يتوقف. هنا يسبق الـ graph الإطلاق المنفرد بمقدار <b>${x} مرة</b>.<br>③ قياس من تعليق في شيفرة Strata: عقد كتلة الطبقة الـ 43 تستغرق 2.393 ms عند إطلاقها واحدة تلو الأخرى، و1.585 ms عند إعادة تشغيل graph.`,
      vCompute: (saved) => `① الآن كل kernel أطول من إطلاق واحد، فلا ينقطع عمل GPU، وتكلفة الإرسال <b>مخفية خلف الحساب</b>.<br>② لذلك يوفّر الـ graph <b>${saved}%</b> فقط من الزمن مقارنة بالإطلاق المنفرد: لم تعد تكلفة الإطلاق هي عنق الزجاجة.<br>③ اعثر أولًا على عنق الزجاجة الحقيقي، ثم قرّر هل يستحق الدمج أو الـ graph العناء.`,
      try: [
        'أبقِ القيم الافتراضية (w = 5 µs وL = 20 µs) واضغط <b>تشغيل</b>: في صف «إطلاق واحد تلو الآخر» يكاد صف GPU يكون فراغات كله. تضيع أوقات الـ kernels الصغيرة في «الانتظار في طابور الإرسال».',
        'اسحب <b>w</b> إلى 40 µs وشغّل مجددًا: تقترب الأزمنة الكلية الثلاثة. حين تطول الـ kernel، يغطّي الحساب تكلفة الإطلاق.',
        'اسحب <b>g</b> من 1 إلى 8: كلما دمجتَ أكثر قلّت الإطلاقات، لكن كبرت كل kernel. الدمج الحقيقي يستهلك سجلات أكثر أيضًا، ولا يظهر هذا هنا.',
      ],

      fCode: 'GRAPH_REPLAY', fTitle: 'الموضع المجمَّد', fTag: 'تقدير تعليمي · رُسمت 8 خانات KV فقط',
      fIntro: 'حين يسجّل CUDA Graph الـ kernel فإنه يسجّل معها معاملاتها. اختر طريقة كتابة، ثم اضغط <b>خطوة</b> لتوليد عدة رموز متتالية، وراقب من يكتب في كل خانة من ذاكرة KV المؤقتة.',
      fLgCell: 'خانة واحدة = موضع واحد في ذاكرة KV المؤقتة', fLgNew: 'كُتبت في هذه الخطوة', fLgOld: 'كُتبت سابقًا وما زالت صالحة',
      modes: ['المعامل مسجَّل بالقيمة في الـ graph (خطأ)', 'الـ kernel تقرأ الموضع من مخزن step (طريقة Strata)'],
      fSteps: ['المضيف يجهّز الموضع', 'إعادة تشغيل الـ graph', 'كتابة KV', 'الانتباه يقرأ التاريخ', 'إخراج الرمز'],
      cellsLabel: 'ذاكرة KV المؤقتة من 8 خانات ومخزن step',
      stepNames: ['pos', 'n_kv', 'n_bid', 'width'],
      kvTitle: 'ذاكرة KV المؤقتة (المواضع 0-7)', stepTitle: 'مخزن step كما تراه الـ kernel',
      bStep: '▶ خطوة', bReset: 'إعادة ضبط',
      fReady: '<span class="c">$</span> ready. اختر طريقة الكتابة ثم اضغط [ ▶ خطوة ]',
      sTrueK: 'الموضع الحقيقي', sSeenK: 'الموضع الذي تراه الـ kernel', sNkvK: 'عدد الخانات التي يراها الانتباه',
      sTrueF: '<b>= عدد الرموز المولَّدة حتى الآن</b><br>الرمز 0 في الموضع 0', sSeenF: (frozen) => frozen ? '<b>القيمة لحظة التسجيل، وهي 0 دائمًا</b><br>إعادة التشغيل لا تقرأ المعاملات من جديد' : '<b>المضيف يكتبه في كتلة VRAM نفسها كل خطوة</b><br>العنوان ثابت والمحتوى يتغيّر',
      sNkvF: '<b>n_kv = pos + 1</b><br>محفوظ في مخزن step بجوار pos',
      p0: (t, frozen) => frozen ? `<span class="c">[t${t}]</span> المضيف يعرف أن هذا هو الرمز ${t}، لكن الموضع معامل في الـ kernel، وقد ثبت عند 0 لحظة تسجيل الـ graph` : `<span class="c">[t${t}]</span> المضيف يكتب pos = ${t} في مخزن step (كتلة VRAM نفسها، والعنوان نفسه)`,
      p1: '<span class="m">إعادة التشغيل</span>: إرسال واحد، فيعمل الـ graph كله مجددًا تمامًا كما سُجّل',
      p2: (pos) => `<span class="w">كتابة KV</span>: تكتب kv_append مفتاح K وقيمة V لهذا الرمز في الموضع ${pos}`,
      p3: (n) => `<span class="y">الانتباه</span>: يقرأ أول ${n} من خانات التاريخ فقط`,
      p4: (frozen) => frozen ? '<span class="c">→</span> يخرج رمزًا: أرقام منتهية وبلا خطأ، لكن النموذج «يتذكر» الخانة التي كتبها للتو فقط' : '<span class="c">→</span> يخرج رمزًا: التاريخ كامل، كما لو لم نستخدم الـ graph',
      fVerdictBad: '① كُتبت الرموز الأربعة كلها في الموضع 0، والانتباه يرى خانة واحدة في كل مرة.<br>② لم ينهَر البرنامج، والمخرجات أرقام عادية؛ لكن النموذج يبدو وكأنه <b>فقد ذاكرته</b>. هذا النوع من الأخطاء هو الأصعب كشفًا.<br>③ يسرد الملف qsa.hpp في Strata المعاملات الستة التي تتجمد بهذه الطريقة، وينقلها كلها إلى مخزن step.',
      fVerdictGood: '① لكل رمز من الرموز الأربعة خانته، والانتباه يرى التاريخ كله.<br>② ما يسجّله الـ graph هو <b>عنوان</b> مخزن step، والمضيف لا يغيّر كل خطوة إلا <b>محتواه</b>.<br>③ بهذا تستطيع Strata تسجيل طبقة كاملة في graph مع الحفاظ على الموضع الصحيح في كل خطوة.',
      fTry: [
        'اختر <b>مسجَّل بالقيمة</b> وواصل الضغط على <b>خطوة</b> عبر 4 رموز: كل الكتابات تتكدس في الموضع 0، والانتباه يرى خانة واحدة دائمًا.',
        'انتقل إلى <b>تقرأ من مخزن step</b> وشغّل 4 رموز مرة أخرى: تمتلئ المواضع 0-3 بالتتابع، ويكبر n_kv معها.',
        'راقب مخزن step على اليمين: الأرقام الأربعة تتغير معًا. هي تعتمد على بعضها، وحفظها في كتلة VRAM واحدة تكتبها شيفرة واحدة يمنع خطأ «غيّرتُ رقمًا ونسيتُ الآخر».',
      ],
    },
    ja: {
      code: 'LAUNCH_TIMELINE', title: '起動オーバーヘッドのタイムライン', tag: '教育用の試算 · パラメータ調整可',
      intro: '同じ小さなカーネルの列を、3 つの方式で GPU に渡します。上の行は CPU の「投入」、下の行は GPU の「計算」です。スライダーを動かして <b>再生</b> を押し、GPU がどれだけ待たされるかを見てみましょう。',
      lgCpu: 'CPU が起動を 1 回投入', lgGpu: 'GPU が計算中', lgIdle: 'GPU は空き（次の投入待ち）',
      rows: ['1 つずつ起動', '融合', 'CUDA Graph'], cpu: 'CPU', gpu: 'GPU',
      stageLabel: '3 つの投入方式のタイムライン',
      nLabel: 'カーネルの数 n', wLabel: 'カーネル 1 つの計算 w', lLabel: '起動 1 回のオーバーヘッド L', gLabel: '何個を 1 つに融合するか g',
      us: (x) => `${x} µs`, nOut: (x) => `${x} 個`, gOut: (x) => `${x} 個を 1 つに`,
      bPlay: '▶ 再生', bReset: 'リセット',
      ready: '<span class="c">$</span> ready. パラメータを決めて [ ▶ 再生 ] を押してください',
      sDirK: '1 つずつ起動：総時間', sFusK: '融合：総時間', sGraK: 'CUDA Graph：総時間',
      sDirF: (n, L, w, busy) => (w < L ? `<b>= ${n} × ${L} + ${w}</b>（n × L + w：カーネルが起動より短い）` : `<b>= ${L} + ${n} × ${w}</b>（L + n × w：カーネルが起動より長い）`) + `<br>GPU のビジー率 ${busy}%`,
      sFusF: (m, g, busy) => `<b>起動回数 ${m} = ⌈n ÷ ${g}⌉</b><br>GPU のビジー率 ${busy}%`,
      sGraF: (busy) => `<b>= グラフ起動 1 回 + n × w</b><br>GPU のビジー率 ${busy}%`,
      tPlay: '<span class="y">// 時計が動き出し、3 つの方式が同時にスタート</span>',
      tDir: (n, L, w, tot, busy) => `<span class="c">1 つずつ起動</span>：CPU が ${n} 回投入。1 回 ${L} µs。各カーネルの計算は ${w} µs だけ。合計 ${tot} µs、GPU のビジー率は ${busy}%`,
      tFus: (m, tot, busy) => `<span class="m">融合</span>：起動は ${m} 回だけになり、各カーネルの仕事が増えます。合計 ${tot} µs、GPU のビジー率は ${busy}%`,
      tGra: (tot, busy) => `<span class="w">CUDA Graph</span>：全体を 1 回だけ投入し、ノードが次々に走ります。合計 ${tot} µs、GPU のビジー率は ${busy}%`,
      vLaunch: (x) => `① 各カーネルの計算は w しかないのに、順番が来るまで L 待たされます。GPU はほとんどの時間を<b>CPU の投入待ち</b>に使っています。これを「起動律速」と呼びます。<br>② 融合は起動回数を減らし、CUDA Graph は投入を 1 回にまとめるので、GPU はほとんど止まりません。ここではグラフが 1 つずつ起動するより <b>${x} 倍</b>速くなっています。<br>③ Strata のソースのコメントにある実測値：1 つの層ブロックの 43 ノードは、1 つずつ起動すると 2.393 ms、グラフ再生では 1.585 ms です。`,
      vCompute: (saved) => `① 今は各カーネルが起動 1 回より長く、GPU には常に仕事があります。投入コストは<b>計算の裏に隠れています</b>。<br>② だからグラフが 1 つずつ起動するより節約できるのは <b>${saved}%</b> だけです。起動オーバーヘッドはもうボトルネックではありません。<br>③ まず本当のボトルネックを見つけてから、融合やグラフをやるか決めましょう。`,
      try: [
        '既定のまま（w = 5 µs、L = 20 µs）<b>再生</b>を押します。「1 つずつ起動」の行では、GPU の行がほとんど隙間です。小さなカーネルの時間は「投入待ちの行列」に消えています。',
        '<b>w</b> を 40 µs まで上げて、もう一度再生します。3 行の総時間はほぼ並びます。カーネルが長くなると、起動オーバーヘッドは計算に隠れます。',
        '<b>g</b> を 1 から 8 に上げます。融合を増やすほど起動回数は減りますが、カーネルは大きくなります。実際の融合ではレジスタの使用量も増えますが、ここでは描いていません。',
      ],

      fCode: 'GRAPH_REPLAY', fTitle: '凍った位置', fTag: '教育用の試算 · KV は 8 マスだけ描画',
      fIntro: 'CUDA Graph はカーネルを記録するとき、引数もいっしょに記録します。書き方を 1 つ選び、<b>1 ステップ</b>を押して数トークン続けて生成し、KV キャッシュの各マスを誰が書くかを見てみましょう。',
      fLgCell: '1 マス = KV キャッシュの 1 つの位置', fLgNew: 'このステップで書いたところ', fLgOld: '以前に書き、まだ有効',
      modes: ['引数を値でグラフに記録（誤った書き方）', 'カーネルが step バッファから位置を読む（Strata の書き方）'],
      fSteps: ['ホストが位置を用意', 'グラフを再生', 'KV に書く', 'アテンションが履歴を読む', 'トークンを出力'],
      cellsLabel: '8 マスの KV キャッシュと step バッファ',
      stepNames: ['pos', 'n_kv', 'n_bid', 'width'],
      kvTitle: 'KV キャッシュ（位置 0〜7）', stepTitle: 'カーネルから見える step バッファ',
      bStep: '▶ 1 ステップ', bReset: 'リセット',
      fReady: '<span class="c">$</span> ready. 書き方を選んで [ ▶ 1 ステップ ] を押してください',
      sTrueK: '本当の位置', sSeenK: 'カーネルから見える位置', sNkvK: 'アテンションが見えるマス数',
      sTrueF: '<b>= 生成済みのトークン数</b><br>0 番目のトークンは位置 0', sSeenF: (frozen) => frozen ? '<b>記録した瞬間の値で、ずっと 0</b><br>再生しても引数は読み直されない' : '<b>毎ステップ、ホストが同じ VRAM に書く</b><br>アドレスは同じで、中身が変わる',
      sNkvF: '<b>n_kv = pos + 1</b><br>pos といっしょに step バッファに入っている',
      p0: (t, frozen) => frozen ? `<span class="c">[t${t}]</span> ホストはこれが ${t} 番目のトークンだと知っていますが、位置はカーネルの引数なので、記録の時点で 0 に決まっています` : `<span class="c">[t${t}]</span> ホストが pos = ${t} を step バッファに書きます（同じ VRAM、同じアドレス）`,
      p1: '<span class="m">再生</span>：1 回の投入で、グラフ全体が記録どおりにもう一度走ります',
      p2: (pos) => `<span class="w">KV に書く</span>：kv_append がこのトークンの K と V を位置 ${pos} に書きます`,
      p3: (n) => `<span class="y">アテンション</span>：履歴の先頭 ${n} マスだけを読みます`,
      p4: (frozen) => frozen ? '<span class="c">→</span> トークンを出力：数値は有限でエラーもありませんが、モデルが「覚えている」のは今書いた 1 マスだけです' : '<span class="c">→</span> トークンを出力：履歴がそろっていて、グラフを使わないときと同じ計算です',
      fVerdictBad: '① 4 つのトークンがすべて位置 0 に書かれ、アテンションは毎回 1 マスしか見ません。<br>② プログラムはクラッシュせず、出力も普通の数字です。ただモデルが<b>記憶を失った</b>ように見えます。この種のバグがいちばん見つけにくいのです。<br>③ Strata の qsa.hpp は、こうして凍る 6 つの引数を列挙し、すべて step バッファから読むように変えました。',
      fVerdictGood: '① 4 つのトークンがそれぞれ 1 マスずつ使い、アテンションは履歴全体を見られます。<br>② グラフに記録されているのは step バッファの<b>アドレス</b>で、ホストが毎ステップ変えるのはその<b>中身</b>だけです。<br>③ だから Strata は、1 層まるごとグラフに記録しながら、毎ステップ正しい位置を保てるのです。',
      fTry: [
        '<b>値でグラフに記録</b>を選び、<b>1 ステップ</b>を連続で押して 4 トークン進めます。すべての書き込みが位置 0 に集まり、アテンションはいつも 1 マスしか見ません。',
        '<b>step バッファから読む</b>に切り替えて、もう一度 4 トークン進めます。位置 0〜3 が順に埋まり、n_kv もいっしょに増えます。',
        '右の step バッファに注目してください。4 つの数がいっしょに変わります。互いに依存しているので、1 か所の VRAM に置き、1 つのコードで書けば、「1 つ直して、もう 1 つを直し忘れる」ことは起こりません。',
      ],
    },
    ko: {
      code: 'LAUNCH_TIMELINE', title: '런치 오버헤드 타임라인', tag: '교육용 추정 · 인자 조절 가능',
      intro: '같은 작은 커널 묶음을 세 가지 방식으로 GPU에 넘겨요. 위 줄은 CPU가 「제출」하는 모습이고, 아래 줄은 GPU가 「계산」하는 모습이에요. 슬라이더를 움직이고 <b>재생</b>을 눌러서 GPU가 얼마나 멍하니 기다리는지 보세요.',
      lgCpu: 'CPU가 커널 시작을 한 번 제출', lgGpu: 'GPU가 계산 중', lgIdle: 'GPU 유휴(다음 제출을 기다리는 중)',
      rows: ['하나씩 시작', '융합', 'CUDA Graph'], cpu: 'CPU', gpu: 'GPU',
      stageLabel: '세 가지 제출 방식의 타임라인',
      nLabel: '커널 개수 n', wLabel: '커널당 계산 시간 w', lLabel: '시작 한 번의 비용 L', gLabel: '하나로 융합하는 개수 g',
      us: (x) => `${x} µs`, nOut: (x) => `${x}개`, gOut: (x) => `${x}개를 1개로`,
      bPlay: '▶ 재생', bReset: '초기화',
      ready: '<span class="c">$</span> ready. 인자를 맞춘 뒤 [ ▶ 재생 ]을 누르세요',
      sDirK: '하나씩 시작: 총 시간', sFusK: '융합: 총 시간', sGraK: 'CUDA Graph: 총 시간',
      sDirF: (n, L, w, busy) => (w < L ? `<b>= ${n} × ${L} + ${w}</b>(n × L + w: 커널이 시작 비용보다 짧음)` : `<b>= ${L} + ${n} × ${w}</b>(L + n × w: 커널이 시작 비용보다 긺)`) + `<br>GPU 가동 비율 ${busy}%`,
      sFusF: (m, g, busy) => `<b>시작 횟수 ${m} = ⌈n ÷ ${g}⌉</b><br>GPU 가동 비율 ${busy}%`,
      sGraF: (busy) => `<b>= 그래프 시작 1번 + n × w</b><br>GPU 가동 비율 ${busy}%`,
      tPlay: '<span class="y">// 시계가 돌기 시작해요. 세 방식이 동시에 출발해요</span>',
      tDir: (n, L, w, tot, busy) => `<span class="c">하나씩 시작</span>: CPU가 ${n}번 제출하고 한 번에 ${L} µs씩 들어요. 커널은 ${w} µs만 계산해요. 합계 ${tot} µs, GPU 가동 ${busy}%`,
      tFus: (m, tot, busy) => `<span class="m">융합</span>: 시작이 ${m}번만 남고, 커널 하나가 더 많은 일을 해요. 합계 ${tot} µs, GPU 가동 ${busy}%`,
      tGra: (tot, busy) => `<span class="w">CUDA Graph</span>: 전체를 한 번만 제출하고 노드가 차례로 돌아요. 합계 ${tot} µs, GPU 가동 ${busy}%`,
      vLaunch: (x) => `① 커널은 w만 계산하는데 차례가 오려면 L을 기다려야 해요. GPU는 대부분 <b>CPU의 제출을 기다려요</b>. 이것을 「런치 바운드」(launch-bound, 시작 비용에 묶인 상태)라고 해요.<br>② 융합은 시작 횟수를 줄이고, CUDA Graph는 제출을 한 번으로 줄여서 GPU가 거의 쉬지 않아요. 여기서는 그래프가 하나씩 시작보다 <b>${x}배</b> 빨라요.<br>③ Strata 소스 주석의 실측: 층 블록 하나의 노드 43개는 하나씩 시작하면 2.393 ms, 그래프로 재생하면 1.585 ms예요.`,
      vCompute: (saved) => `① 이제 커널 하나가 시작 한 번보다 길어서 GPU에 늘 할 일이 있고, 제출 비용이 <b>계산 뒤에 숨어요</b>.<br>② 그래서 그래프가 하나씩 시작보다 줄이는 시간은 <b>${saved}%</b>뿐이에요. 런치 오버헤드는 더 이상 병목이 아니에요.<br>③ 진짜 병목을 먼저 찾고 나서 융합이나 그래프를 할지 정하세요.`,
      try: [
        '기본값(w = 5 µs, L = 20 µs) 그대로 <b>재생</b>을 눌러 보세요. 하나씩 시작하는 줄에서 GPU 줄은 거의 빈틈이에요. 작은 커널의 시간이 전부 「제출을 기다리는 줄」에 쓰여요.',
        '<b>w</b>를 40 µs로 늘리고 다시 재생하세요. 세 줄의 총 시간이 비슷해져요. 커널이 길어지면 시작 비용이 계산에 가려져요.',
        '<b>g</b>를 1에서 8로 늘려 보세요. 융합할수록 시작 횟수는 줄지만 커널은 커져요. 실제 융합은 레지스터도 더 쓰는데, 여기에는 그리지 않았어요.',
      ],

      fCode: 'GRAPH_REPLAY', fTitle: '얼어붙은 위치', fTag: '교육용 추정 · KV 8칸만 표시',
      fIntro: 'CUDA Graph는 커널을 녹화할 때 인자까지 같이 녹화해요. 쓰기 방식을 하나 고르고 <b>한 단계씩</b> 눌러 토큰 몇 개를 만들면서, KV 캐시의 각 칸을 누가 쓰는지 보세요.',
      fLgCell: '한 칸 = KV 캐시의 위치 하나', fLgNew: '이번 단계에서 막 씀', fLgOld: '앞서 쓴 값, 아직 유효',
      modes: ['인자를 값으로 그래프에 녹화(잘못된 방식)', '커널이 step 버퍼에서 위치를 읽음(Strata의 방식)'],
      fSteps: ['호스트가 위치 준비', '그래프 재생', 'KV에 쓰기', '어텐션이 과거를 읽음', '토큰 출력'],
      cellsLabel: 'KV 캐시 8칸과 step 버퍼',
      stepNames: ['pos', 'n_kv', 'n_bid', 'width'],
      kvTitle: 'KV 캐시(위치 0–7)', stepTitle: '커널이 보는 step 버퍼',
      bStep: '▶ 한 단계', bReset: '초기화',
      fReady: '<span class="c">$</span> ready. 쓰기 방식을 고르고 [ ▶ 한 단계 ]를 누르세요',
      sTrueK: '실제 위치', sSeenK: '커널이 보는 위치', sNkvK: '어텐션이 볼 수 있는 칸 수',
      sTrueF: '<b>= 지금까지 만든 토큰 수</b><br>0번째 토큰은 위치 0', sSeenF: (frozen) => frozen ? '<b>녹화한 순간의 값, 영원히 0</b><br>재생은 인자를 다시 읽지 않아요' : '<b>매 단계 호스트가 같은 GPU 메모리에 씀</b><br>주소는 그대로, 내용이 바뀜',
      sNkvF: '<b>n_kv = pos + 1</b><br>pos와 함께 step 버퍼에 있음',
      p0: (t, frozen) => frozen ? `<span class="c">[t${t}]</span> 호스트는 ${t}번째 토큰인 줄 알지만, 위치는 커널 인자라서 녹화할 때 0으로 정해졌어요` : `<span class="c">[t${t}]</span> 호스트가 pos = ${t}를 step 버퍼에 써요(같은 GPU 메모리, 주소는 그대로)`,
      p1: '<span class="m">재생</span>: 한 번 제출하면 그래프 전체가 녹화된 모습 그대로 다시 돌아요',
      p2: (pos) => `<span class="w">KV에 쓰기</span>: kv_append가 이 토큰의 K, V를 위치 ${pos}에 써요`,
      p3: (n) => `<span class="y">어텐션</span>: 과거 ${n}칸만 읽어요`,
      p4: (frozen) => frozen ? '<span class="c">→</span> 토큰 하나를 출력해요. 값은 유한하고 오류도 없지만, 모델은 방금 쓴 한 칸만 「기억」해요' : '<span class="c">→</span> 토큰 하나를 출력해요. 과거가 온전하고, 그래프 없이 계산한 결과와 같아요',
      fVerdictBad: '① 토큰 4개가 모두 위치 0에 쓰이고, 어텐션은 매번 1칸만 봐요.<br>② 프로그램은 멈추지 않고 출력도 정상적인 숫자예요. 다만 모델이 <b>기억을 잃은</b> 것 같아요. 이런 오류가 가장 찾기 어려워요.<br>③ Strata의 qsa.hpp는 이렇게 얼어붙는 인자 6개를 따로 나열하고, 모두 step 버퍼에서 읽도록 바꿨어요.',
      fVerdictGood: '① 토큰 4개가 각자 한 칸씩 차지하고, 어텐션이 과거 전체를 볼 수 있어요.<br>② 그래프에 녹화되는 것은 step 버퍼의 <b>주소</b>이고, 호스트는 매 단계 그 <b>내용</b>만 고쳐요.<br>③ 그래서 Strata는 층 전체를 그래프로 녹화하면서도 매 단계 위치가 올바르게 유지돼요.',
      fTry: [
        '<b>값으로 그래프에 녹화</b>를 고르고 <b>한 단계</b>를 눌러 토큰 4개를 끝까지 진행하세요. 모든 쓰기가 위치 0에 몰리고 어텐션은 계속 1칸만 봐요.',
        '<b>step 버퍼에서 읽음</b>으로 바꾸고 토큰 4개를 다시 진행하세요. 위치 0–3이 차례로 채워지고 n_kv도 따라서 커져요.',
        '오른쪽 step 버퍼를 지켜보세요. 숫자 네 개가 함께 바뀌어요. 서로 의존하므로 GPU 메모리 한 조각에 두고 한 곳의 코드로 쓰면 「하나만 고치고 다른 하나를 잊는」 일이 생기지 않아요.',
      ],
    },
    es: {
      code: 'LAUNCH_TIMELINE', title: 'Línea de tiempo de la sobrecarga de lanzamiento', tag: 'Estimación didáctica · ajustable',
      intro: 'La misma cadena de kernels pequeños, entregada a la GPU de tres maneras. El carril de arriba es la CPU «enviando»; el de abajo es la GPU «calculando». Mueve los controles y pulsa <b>Reproducir</b> para ver cuánto tiempo está ociosa la GPU.',
      lgCpu: 'La CPU envía un lanzamiento', lgGpu: 'La GPU está calculando', lgIdle: 'GPU ociosa (esperando el siguiente envío)',
      rows: ['Uno por uno', 'Fusionados', 'CUDA Graph'], cpu: 'CPU', gpu: 'GPU',
      stageLabel: 'Líneas de tiempo de las tres formas de enviar',
      nLabel: 'Número de kernels n', wLabel: 'Tiempo de cálculo por kernel w', lLabel: 'Sobrecarga por lanzamiento L', gLabel: 'Kernels fusionados en uno g',
      us: (x) => `${x} µs`, nOut: (x) => `${x}`, gOut: (x) => `${x} en 1`,
      bPlay: '▶ Reproducir', bReset: 'Reiniciar',
      ready: '<span class="c">$</span> ready. Ajusta los controles y pulsa [ ▶ Reproducir ]',
      sDirK: 'Uno por uno: tiempo total', sFusK: 'Fusionados: tiempo total', sGraK: 'CUDA Graph: tiempo total',
      sDirF: (n, L, w, busy) => (w < L ? `<b>= ${n} × ${L} + ${w}</b> (n × L + w: el kernel dura menos que un lanzamiento)` : `<b>= ${L} + ${n} × ${w}</b> (L + n × w: el kernel dura más que un lanzamiento)`) + `<br>GPU ocupada el ${busy}% del tiempo`,
      sFusF: (m, g, busy) => `<b>${m} lanzamientos = ⌈n ÷ ${g}⌉</b><br>GPU ocupada el ${busy}% del tiempo`,
      sGraF: (busy) => `<b>= 1 lanzamiento de grafo + n × w</b><br>GPU ocupada el ${busy}% del tiempo`,
      tPlay: '<span class="y">// el reloj arranca; las tres formas salen juntas</span>',
      tDir: (n, L, w, tot, busy) => `<span class="c">Uno por uno</span>: la CPU envía ${n} veces, ${L} µs cada una; cada kernel calcula solo ${w} µs. Total ${tot} µs, GPU ocupada ${busy}%`,
      tFus: (m, tot, busy) => `<span class="m">Fusionados</span>: quedan solo ${m} lanzamientos y cada kernel hace más trabajo. Total ${tot} µs, GPU ocupada ${busy}%`,
      tGra: (tot, busy) => `<span class="w">CUDA Graph</span>: toda la cadena se envía una vez y los nodos corren uno tras otro. Total ${tot} µs, GPU ocupada ${busy}%`,
      vLaunch: (x) => `① Cada kernel calcula solo w, pero debe esperar L para tener su turno: la GPU pasa la mayor parte del tiempo <b>esperando el envío de la CPU</b>. Esto se llama estar «limitado por el lanzamiento».<br>② La fusión reduce el número de lanzamientos; CUDA Graph reduce el envío a uno solo, y la GPU casi no se detiene. Aquí el grafo es <b>${x}×</b> más rápido que lanzar uno por uno.<br>③ Una medición de un comentario del código de Strata: los 43 nodos de un bloque de capa tardan 2,393 ms lanzados uno por uno y 1,585 ms como repetición de un grafo.`,
      vCompute: (saved) => `① Ahora cada kernel dura más que un lanzamiento, así que la GPU siempre tiene trabajo y el costo del envío queda <b>oculto detrás del cálculo</b>.<br>② Por eso el grafo ahorra solo el <b>${saved}%</b> del tiempo frente a lanzar uno por uno: la sobrecarga de lanzamiento ya no es el cuello de botella.<br>③ Primero encuentra el cuello de botella real; luego decide si la fusión o un grafo valen la pena.`,
      try: [
        'Deja los valores por defecto (w = 5 µs, L = 20 µs) y pulsa <b>Reproducir</b>: en la fila «Uno por uno», el carril de la GPU es casi todo huecos. Los kernels pequeños se pasan el tiempo «haciendo cola para el envío».',
        'Arrastra <b>w</b> a 40 µs y reproduce de nuevo: los tres totales ahora están cerca. Cuando un kernel es largo, el cálculo cubre la sobrecarga de lanzamiento.',
        'Arrastra <b>g</b> de 1 a 8: cuanto más fusionas, menos lanzamientos, pero cada kernel es más grande. La fusión real también usa más registros, algo que aquí no se dibuja.',
      ],

      fCode: 'GRAPH_REPLAY', fTitle: 'La posición congelada', fTag: 'Estimación didáctica · solo 8 casillas KV dibujadas',
      fIntro: 'Cuando CUDA Graph graba un kernel, graba también los argumentos. Elige una forma de escribirlo y pulsa <b>Paso</b> para generar varios tokens seguidos y ver quién escribe cada casilla de la caché KV.',
      fLgCell: 'Una celda = una posición en la caché KV', fLgNew: 'Escrita justo en este paso', fLgOld: 'Escrita antes, aún válida',
      modes: ['Argumento capturado por valor (incorrecto)', 'El kernel lee pos del búfer step (Strata)'],
      fSteps: ['El host prepara la posición', 'Repetir el grafo', 'Escribir KV', 'La atención lee el historial', 'Salida del token'],
      cellsLabel: 'Una caché KV de 8 casillas y el búfer step',
      stepNames: ['pos', 'n_kv', 'n_bid', 'width'],
      kvTitle: 'Caché KV (posiciones 0–7)', stepTitle: 'El búfer step que ve el kernel',
      bStep: '▶ Paso', bReset: 'Reiniciar',
      fReady: '<span class="c">$</span> ready. Elige una forma de escribirlo y pulsa [ ▶ Paso ]',
      sTrueK: 'Posición real', sSeenK: 'Posición que ve el kernel', sNkvK: 'Casillas que la atención puede ver',
      sTrueF: '<b>= tokens generados hasta ahora</b><br>el token 0 está en la posición 0', sSeenF: (frozen) => frozen ? '<b>El valor del momento de la captura, siempre 0</b><br>la repetición nunca relee los argumentos' : '<b>El host la escribe en el mismo bloque de VRAM en cada paso</b><br>misma dirección, contenido nuevo',
      sNkvF: '<b>n_kv = pos + 1</b><br>guardado en el búfer step junto a pos',
      p0: (t, frozen) => frozen ? `<span class="c">[t${t}]</span> el host sabe que este es el token ${t}, pero la posición es un argumento del kernel, fijado en 0 cuando se capturó el grafo` : `<span class="c">[t${t}]</span> el host escribe pos = ${t} en el búfer step (el mismo bloque de VRAM, la misma dirección)`,
      p1: '<span class="m">Repetición</span>: un solo envío, y todo el grafo corre otra vez exactamente como se grabó',
      p2: (pos) => `<span class="w">Escribir KV</span>: kv_append escribe la K y la V de este token en la posición ${pos}`,
      p3: (n) => `<span class="y">Atención</span>: lee solo las primeras ${n} casilla(s) del historial`,
      p4: (frozen) => frozen ? '<span class="c">→</span> produce un token: números finitos, sin error, pero el modelo «recuerda» solo la casilla que acaba de escribir' : '<span class="c">→</span> produce un token: el historial está completo, igual que sin grafo',
      fVerdictBad: '① Los 4 tokens fueron a la posición 0, y la atención ve solo 1 casilla cada vez.<br>② El programa no falló y la salida son números normales; el modelo parece haber <b>perdido la memoria</b>. Este tipo de error es el más difícil de encontrar.<br>③ El qsa.hpp de Strata enumera los 6 argumentos que se congelarían así, y los pasa todos al búfer step.',
      fVerdictGood: '① Los 4 tokens tienen cada uno su casilla, y la atención ve todo el historial.<br>② El grafo graba la <b>dirección</b> del búfer step; el host cambia solo su <b>contenido</b> en cada paso.<br>③ Así consigue Strata capturar una capa entera como grafo y aun así acertar la posición en cada paso.',
      fTry: [
        'Elige <b>capturado por valor</b> y sigue pulsando <b>Paso</b> durante 4 tokens: todas las escrituras caen en la posición 0, y la atención ve siempre solo 1 casilla.',
        'Cambia a <b>lee del búfer step</b> y ejecuta 4 tokens otra vez: las posiciones 0–3 se llenan por turno, y n_kv crece con ellas.',
        'Mira el búfer step a la derecha: los cuatro números cambian juntos. Dependen unos de otros, así que guardarlos en un bloque de VRAM escrito por un solo trozo de código evita el error de «cambié uno y olvidé el otro».',
      ],
    },
  });

  Viz.register('kernel-launch', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a2)', text: T.lgCpu },
        { color: 'var(--accent)', text: T.lgGpu, glow: true },
        { color: 'var(--side)', text: T.lgIdle },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 360, X0 = 46, X1 = 354;   // ~300 px wide on a phone: 12-unit text stays >= 10 px
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} 276`, class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const groups = [];
      T.rows.forEach((name, r) => {
        const y = 10 + r * 88;
        Viz.svg('text', { x: 0, y: y + 12, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = name;
        ['cpu', 'gpu'].forEach((lane, j) => {
          const ly = y + 22 + j * 26;
          Viz.svg('text', { x: 0, y: ly + 14, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T[lane];
          Viz.svg('rect', { x: X0, y: ly, width: X1 - X0, height: 18, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        });
        groups.push({ y, g: Viz.svg('g', {}, svg), end: Viz.svg('text', { x: X1, y: y + 12, 'font-size': 12, 'text-anchor': 'end', style: 'fill:var(--ink)' }, svg) });
      });
      const cursor = Viz.svg('path', { d: '', style: 'stroke:var(--a3);stroke-width:1.5;fill:none' }, svg);
      const slider = (label, min, max, val) => `<div class="viz-slider"><label>${label}</label><input type="range" min="${min}" max="${max}" value="${val}" aria-label="${Viz.esc(label)}"><output></output></div>`;
      left.insertAdjacentHTML('beforeend', slider(T.nLabel, 1, 96, 45) + slider(T.wLabel, 1, 60, 5) + slider(T.lLabel, 5, 40, 20) + slider(T.gLabel, 1, 8, 3) +
        `<div class="viz-row">${Viz.button(T.bPlay)}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = Viz.stat({ id: 'k-dir', k: T.sDirK, v: '', f: '' }) + Viz.stat({ id: 'k-fus', k: T.sFusK, v: '', f: '' }) + Viz.stat({ id: 'k-gra', k: T.sGraK, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden></div>` + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const ranges = el.querySelectorAll('input[type=range]'), outs = el.querySelectorAll('.viz-slider output');
      const [playBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const verdict = $('.viz-verdict');
      let runs = [], scale = 1, busy = false;

      function read() { return { n: +ranges[0].value, w: +ranges[1].value, L: +ranges[2].value, g: +ranges[3].value }; }
      function compute() {
        const p = read();
        outs[0].textContent = T.nOut(p.n); outs[1].textContent = T.us(p.w); outs[2].textContent = T.us(p.L); outs[3].textContent = T.gOut(p.g);
        runs = [M.direct(p.n, p.w, p.L), M.fused(p.n, p.w, p.L, p.g), M.graph(p.n, p.w, p.L)];
        scale = (X1 - X0) / Math.max(...runs.map(r => r.total));
        const pct = r => Math.round(r.busyRatio * 100);
        $('[data-s=k-dir-v]').textContent = Viz.fmt(runs[0].total) + ' µs';
        $('[data-s=k-dir-f]').innerHTML = T.sDirF(p.n, p.L, p.w, pct(runs[0]));
        $('[data-s=k-fus-v]').textContent = Viz.fmt(runs[1].total) + ' µs';
        $('[data-s=k-fus-f]').innerHTML = T.sFusF(runs[1].launches, p.g, pct(runs[1]));
        $('[data-s=k-gra-v]').textContent = Viz.fmt(runs[2].total) + ' µs';
        $('[data-s=k-gra-f]').innerHTML = T.sGraF(pct(runs[2]));
        return p;
      }
      // Draws every bar clipped to simulated time t (Infinity = final state).
      function draw(t) {
        runs.forEach((run, r) => {
          const { y, g, end } = groups[r];
          g.innerHTML = '';
          const cpuY = y + 22, gpuY = y + 48, seen = new Set();
          run.kernels.forEach(k => {
            const key = k.submitStart + ':' + k.submitEnd;
            if (!seen.has(key) && t > k.submitStart) {
              seen.add(key);
              const w = (Math.min(t, k.submitEnd) - k.submitStart) * scale;
              Viz.svg('rect', { x: X0 + k.submitStart * scale, y: cpuY + 2, width: Math.max(0, w - (run.launches > 1 ? 0.6 : 0)), height: 14, style: 'fill:var(--a2)' }, g);
            }
            if (t > k.start) Viz.svg('rect', { x: X0 + k.start * scale, y: gpuY + 2, width: Math.max(0.6, (Math.min(t, k.end) - k.start) * scale - 0.4), height: 14, style: 'fill:var(--accent)' }, g);
          });
          end.textContent = t >= run.total ? Viz.fmt(run.total) + ' µs' : '';
        });
        cursor.setAttribute('d', Number.isFinite(t) ? `M${X0 + t * scale} 6V272` : '');
      }
      function settle() { verdict.hidden = true; compute(); draw(Infinity); }
      ranges.forEach(r => { r.oninput = () => { if (!busy) settle(); }; });
      playBtn.onclick = async () => {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = true; });
        const p = compute(); verdict.hidden = true;
        term.log(T.tPlay);
        const end = Math.max(...runs.map(r => r.total)), logged = [false, false, false], pct = r => Math.round(r.busyRatio * 100);
        const lines = [() => T.tDir(p.n, p.L, p.w, Viz.fmt(runs[0].total), pct(runs[0])), () => T.tFus(runs[1].launches, Viz.fmt(runs[1].total), pct(runs[1])), () => T.tGra(Viz.fmt(runs[2].total), pct(runs[2]))];
        const order = runs.map((r, i) => i).sort((a, b) => runs[a].total - runs[b].total);
        try {
          const t0 = performance.now(), dur = ctx.reduced ? 0 : 2600;
          await new Promise(resolve => {
            const tick = now => {
              const t = dur ? Math.min(1, (now - t0) / dur) * end : end;
              draw(t);
              order.forEach(i => { if (!logged[i] && t >= runs[i].total) { logged[i] = true; term.log(lines[i]()); } });
              if (t < end) ctx.raf(tick); else resolve();
            };
            ctx.raf(tick);
          });
          const x = (runs[0].total / runs[2].total).toFixed(1);
          verdict.innerHTML = p.w < p.L ? T.vLaunch(x) : T.vCompute(Math.round((1 - runs[2].total / runs[0].total) * 100));
          verdict.hidden = false; draw(Infinity);
        } finally {
          busy = false;
          if (ctx.alive) el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = false; });
        }
      };
      resetBtn.onclick = () => {
        if (busy) return;
        [45, 5, 20, 3].forEach((v, i) => { ranges[i].value = v; });
        term.clear(); term.log(T.ready); settle();
      };
      settle();
    },
  });

  Viz.register('graph-freeze', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.fCode, title: T.fTitle, tag: T.fTag, intro: T.fIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.fLgCell },
        { color: 'var(--accent)', text: T.fLgNew, glow: true },
        { color: 'var(--a2)', text: T.fLgOld },
      ]));
      body.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin:0 0 14px">${Viz.button(T.modes[0], 'alt')}${Viz.button(T.modes[1], 'ghost')}</div>`);
      const pipe = Viz.pipe(body, T.fSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 200', class: 'viz-stage', role: 'img', 'aria-label': T.cellsLabel }, left);
      Viz.svg('text', { x: 0, y: 16, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = T.kvTitle;
      const cells = [], labels = [];
      for (let i = 0; i < 8; i++) {
        const x = i * 44 + 4;
        cells.push(Viz.svg('rect', { x, y: 28, width: 40, height: 46, class: 'viz-cell' }, svg));
        labels.push(Viz.svg('text', { x: x + 20, y: 57, 'font-size': 14, 'text-anchor': 'middle', style: 'fill:var(--paper);font-weight:700' }, svg));
        Viz.svg('text', { x: x + 20, y: 92, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = String(i);
      }
      Viz.svg('text', { x: 0, y: 132, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = T.stepTitle;
      const stepVals = T.stepNames.map((name, i) => {
        const x = i * 88 + 4;
        Viz.svg('rect', { x, y: 142, width: 84, height: 52, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        Viz.svg('text', { x: x + 42, y: 162, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = name;
        return Viz.svg('text', { x: x + 42, y: 186, 'font-size': 16, 'text-anchor': 'middle', style: 'fill:var(--accent);font-weight:700' }, svg);
      });
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.fReady);
      right.innerHTML = Viz.stat({ id: 'f-true', k: T.sTrueK, v: '—', f: T.sTrueF }) + Viz.stat({ id: 'f-seen', k: T.sSeenK, v: '—', f: '', hot: true }) + Viz.stat({ id: 'f-nkv', k: T.sNkvK, v: '—', f: T.sNkvF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.fTry));
      const $ = s => el.querySelector(s);
      const [badBtn, goodBtn, stepBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const verdict = $('.viz-verdict');
      let frozen = true, token = 0, phase = 0, kv = Array(8).fill(null), fresh = -1;

      function paint() {
        kv.forEach((v, i) => {
          cells[i].setAttribute('class', 'viz-cell' + (i === fresh ? ' pick' : v !== null ? ' score' : ''));
          labels[i].textContent = v === null ? '' : 't' + v;
        });
      }
      function showStep(pos) { const s = pos === null ? ['—', '—', '—', '—'] : M.stepBuffer(pos); stepVals.forEach((t, i) => { t.textContent = s[i]; }); }
      function setMode(f) {
        frozen = f;
        badBtn.className = 'viz-btn ' + (f ? 'alt' : 'ghost');
        goodBtn.className = 'viz-btn ' + (f ? 'ghost' : 'alt');
        reset();
      }
      function reset() {
        token = 0; phase = 0; kv = Array(8).fill(null); fresh = -1;
        pipe.set(-1); paint(); showStep(null); verdict.hidden = true;
        term.clear(); term.log(T.fReady);
        $('[data-s=f-true-v]').textContent = '—'; $('[data-s=f-seen-v]').textContent = '—'; $('[data-s=f-nkv-v]').textContent = '—';
        $('[data-s=f-seen-f]').innerHTML = T.sSeenF(frozen);
      }
      function step() {
        if (token >= 8) reset();
        const pos = frozen ? 0 : token;
        pipe.set(phase);
        if (phase === 0) {
          fresh = -1; paint(); showStep(pos);
          $('[data-s=f-true-v]').textContent = token; $('[data-s=f-seen-v]').textContent = pos;
          term.log(T.p0(token, frozen));
        }
        if (phase === 1) term.log(T.p1);
        if (phase === 2) { kv[pos] = token; fresh = pos; paint(); term.log(T.p2(pos)); }
        if (phase === 3) { const n = M.stepBuffer(pos)[1]; $('[data-s=f-nkv-v]').textContent = n; term.log(T.p3(n)); }
        if (phase === 4) {
          term.log(T.p4(frozen));
          token++;
          if (token === 4) { verdict.innerHTML = frozen ? T.fVerdictBad : T.fVerdictGood; verdict.hidden = false; }
        }
        phase = (phase + 1) % 5;
      }
      badBtn.onclick = () => setMode(true);
      goodBtn.onclick = () => setMode(false);
      stepBtn.onclick = step;
      resetBtn.onclick = reset;
      setMode(true);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
