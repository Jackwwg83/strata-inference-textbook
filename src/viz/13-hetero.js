/* Chapter 13 widgets: one decode layer on CPU + GPU, and SIMD lanes versus a dependent chain.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.hetero;

  const T = Viz.t({
    zh: {
      code: 'LAYER_TIMELINE', title: '一层之内：GPU 和 CPU 同时算', tag: '教学推演 · 带宽取理论峰值',
      intro: '一层的流程：GPU 先算注意力和路由，选出 10 个专家；在显存里的（命中）交给 GPU，一部分没命中的经 PCIe 交给 GPU，剩下的交给 CPU；两边都算完才能汇合，进入下一层。拖动滑块改命中率和 PCIe 份额，看哪一边成了<b>关键路径</b>。专家个数按平均值算，可以带小数。',
      lgGpu: 'GPU：注意力、路由、合并', lgMoe: 'GPU：命中的专家 ＋ PCIe 送来的专家', lgCpu: 'CPU：其余没命中的专家', lgPcie: 'PCIe 搬运',
      steps: ['注意力 ＋ 路由', '分派专家', '两边同时算', '汇合', '合并写回'],
      lane: { gpu: 'GPU', cpu: 'CPU', pcie: 'PCIe' },
      axis: (ms) => `${ms} ms`,
      crit: (who, ms) => `关键路径：${who === 'cpu' ? 'CPU 分支' : 'GPU 分支'}（${ms} ms）`,
      critSerial: (ms) => `串行：CPU 算完 GPU 才开始（共 ${ms} ms）`,
      hLabel: '命中率 h', fLabel: 'PCIe 份额 f',
      bPlay: '▶ 播放一层', bBest: '设为最佳份额', bOverlapOn: '两边同时算：开', bOverlapOff: '两边同时算：关（先 CPU 后 GPU）',
      ready: '<span class="c">$</span> ready. 拖动滑块，或按 [ ▶ 播放一层 ]',
      l0: (pre) => `<span class="c">[GPU]</span> 注意力 ＋ 路由，约 ${pre} ms（教学假设）。路由选出 10 个专家`,
      l1: (hits, pcie, cpu) => `<span class="y">分派</span>：${hits} 个在显存（命中）→ GPU；${pcie} 个经 PCIe → GPU；${cpu} 个 → CPU`,
      l2: (g, c, ov) => ov ? `<span class="m">并行</span>：GPU 分支 ${g} ms，CPU 分支 ${c} ms，同时进行` : `<span class="m">串行</span>：GPU 要等 CPU 先算完 ${c} ms，再算自己的 ${g} ms`,
      l3: (who, ms) => `<span class="c">汇合</span>：等慢的那一边。这次是 ${who === 'cpu' ? 'CPU' : 'GPU'}，用时 ${ms} ms`,
      l4: (t, tok) => `<span class="c">→</span> 合并 10 份结果写回主干。这一层 ${t} ms；48 层约 ${tok} ms`,
      sLayerK: '这一层用时', sLayerF: (ov) => ov ? '<b>= 注意力路由 ＋ max(CPU, GPU) ＋ 合并</b><br>两边同时算，取慢的一边' : '<b>= 注意力路由 ＋ CPU ＋ GPU ＋ 合并</b><br>先后来，两段相加',
      sTokK: '一个 token（48 层）', sTokF: '<b>= 48 × 每层用时</b><br>不含草稿、采样等其他开销',
      sBranchK: 'CPU 分支 / GPU 分支', sBranchF: (cpu, pcie) => `<b>CPU：${cpu} 个 × 1.3824 MB ÷ 40 GB/s</b><br>GPU：命中从显存读（672 GB/s），<br>${pcie} 个经 PCIe（63 GB/s）`,
      sBestK: '让两边同时完成的 PCIe 份额', sBestF: '<b>f* 使 CPU 用时 = GPU 用时</b><br>只在“两边互不抢带宽”的假设下成立',
      try: [
        '把命中率拖到 <b>0%</b>：CPU 要算全部 10 个专家，CPU 分支就是关键路径。再拖到 <b>65%</b>（接近上游开发期留出评估的命中率），这一层快了多少？',
        '把 <b>两边同时算</b> 关掉：GPU 要等 CPU 先算完。命中率越高，CPU 越轻，可 GPU 的那份被排到了 CPU 后面。这正是上游第一版的教训。',
        '按 <b>设为最佳份额</b>：两条分支一样长。再把 f 拖到 100%，GPU 分支反而成了关键路径，整体变慢。',
      ],

      sCode: 'SIMD_LANES', sTitle: '一次算 16 个，和一步一步等', sTag: '计算机原理 · AVX-512 一次 16 个单精度数',
      sIntro: '同样 16 个数，三种算法。<b>逐个相加</b>：一条指令算一个加法。<b>SIMD</b>：一条指令同时算 16 个加法，因为每一格互不相干。<b>累加链</b>：每一格要用前一格的结果，车道再多也只能一格一格来。选一种，按 <b>单步</b>。',
      sLgIn: '输入', sLgNow: '这一步正在算', sLgDone: '已算完', sLgWait: '在等前一格',
      modes: { scalar: '逐个相加', simd: 'SIMD 一次 16 个', chain: '累加链' },
      modeTitle: { scalar: '结果[i] = a[i] + b[i]：一次一个', simd: '结果[i] = a[i] + b[i]：一次 16 个', chain: '结果[i] = 结果[i−1] + a[i]：要等前一格' },
      outLabel: '结果', stepText: (n, total) => `第 ${n} 步 / 共 ${total} 步`,
      bStep: '▶ 单步', bAll: '▶▶ 跑完', bReset: '重置',
      sReady: '<span class="c">$</span> ready. 选一种算法，按 [ ▶ 单步 ]',
      lScalar: (i, a, b, s) => `<span class="c">第 ${i + 1} 步</span>：${a} + ${b} = ${s}，一条指令只算了 1 个数`,
      lSimd: '<span class="c">第 1 步</span>：一条向量加法指令，16 条车道同时算完 16 个加法',
      lChain: (i, p, a, s) => i === 0 ? `<span class="c">第 1 步</span>：结果[0] = a[0] = ${s}` : `<span class="c">第 ${i + 1} 步</span>：结果[${i}] = ${p} + ${a} = ${s}，必须等第 ${i} 步的结果`,
      lDone: (mode, n) => `<span class="y">// ${mode}：共 ${n} 步</span>`,
      sStepsK: '这种算法要几步', sStepsF: { scalar: '<b>= n = 16</b>', simd: '<b>= ⌈n ÷ 16⌉ = 1</b><br>512 位 ÷ 32 位 = 16 条车道', chain: '<b>= n = 16</b><br>车道再多也用不上' },
      sCmpK: '已跑过的算法', sCmpNone: '还没有跑完任何一种', sCmpRow: (mode, n) => `<b>${mode}</b>：${n} 步`,
      sVerdict: '① 逐个相加 16 步，SIMD 只要 1 步：数据互不相干，就能同时算。<br>② 累加链有 16 条车道也要 16 步：每一格都要等前一格，这叫<b>数据依赖</b>。<br>③ 模型的 48 层就是这样一条链：第 l + 1 层的输入是第 l 层的输出。同一层里的 10 个专家互不相干，可以分给 CPU 和 GPU 同时算；层与层之间不行。',
      sTry: [
        '先跑 <b>逐个相加</b>，再跑 <b>SIMD 一次 16 个</b>：结果一样，步数从 16 变成 1。',
        '跑 <b>累加链</b>：注意每一步只有一格在算，其他车道都在等。',
        '三种都跑完，读结论。想一想：模型里哪些计算像“逐个相加”，哪些像“累加链”？',
      ],
    },
    en: {
      code: 'LAYER_TIMELINE', title: 'Within one layer: GPU and CPU compute at once', tag: 'Teaching estimate · bandwidths at theoretical peak',
      intro: 'One layer goes like this: the GPU first computes attention and routing and picks 10 experts. Those in VRAM (hits) go to the GPU, some of the misses go to the GPU over PCIe, and the rest go to the CPU. Both sides must finish before they join and move on to the next layer. Drag the sliders to change the hit rate and the PCIe share, and see which side becomes the <b>critical path</b>. Expert counts are averages, so they can have decimals.',
      lgGpu: 'GPU: attention, routing, merge', lgMoe: 'GPU: hit experts + experts sent over PCIe', lgCpu: 'CPU: the other missed experts', lgPcie: 'PCIe transfer',
      steps: ['Attention + routing', 'Dispatch experts', 'Both sides compute', 'Join', 'Merge and write back'],
      lane: { gpu: 'GPU', cpu: 'CPU', pcie: 'PCIe' },
      axis: (ms) => `${ms} ms`,
      crit: (who, ms) => `Critical path: ${who === 'cpu' ? 'CPU branch' : 'GPU branch'} (${ms} ms)`,
      critSerial: (ms) => `Serial: CPU first, then GPU (${ms} ms total)`,
      hLabel: 'Hit rate h', fLabel: 'PCIe share f',
      bPlay: '▶ Play one layer', bBest: 'Set best share', bOverlapOn: 'Both sides at once: on', bOverlapOff: 'Both sides at once: off (CPU, then GPU)',
      ready: '<span class="c">$</span> ready. Drag a slider, or press [ ▶ Play one layer ]',
      l0: (pre) => `<span class="c">[GPU]</span> attention + routing, about ${pre} ms (teaching assumption). The router picks 10 experts`,
      l1: (hits, pcie, cpu) => `<span class="y">Dispatch</span>: ${hits} in VRAM (hits) → GPU; ${pcie} over PCIe → GPU; ${cpu} → CPU`,
      l2: (g, c, ov) => ov ? `<span class="m">Parallel</span>: GPU branch ${g} ms and CPU branch ${c} ms run at the same time` : `<span class="m">Serial</span>: the GPU waits for the CPU to finish its ${c} ms, then computes its own ${g} ms`,
      l3: (who, ms) => `<span class="c">Join</span>: wait for the slower side. This time it is the ${who === 'cpu' ? 'CPU' : 'GPU'}, at ${ms} ms`,
      l4: (t, tok) => `<span class="c">→</span> merge the 10 results and write back. This layer: ${t} ms; 48 layers: about ${tok} ms`,
      sLayerK: 'Time for this layer', sLayerF: (ov) => ov ? '<b>= attention/routing + max(CPU, GPU) + merge</b><br>both sides at once; the slower one counts' : '<b>= attention/routing + CPU + GPU + merge</b><br>one after the other; the two add up',
      sTokK: 'One token (48 layers)', sTokF: '<b>= 48 × time per layer</b><br>excludes drafts, sampling and other costs',
      sBranchK: 'CPU branch / GPU branch', sBranchF: (cpu, pcie) => `<b>CPU: ${cpu} × 1.3824 MB ÷ 40 GB/s</b><br>GPU: hits read from VRAM (672 GB/s),<br>${pcie} over PCIe (63 GB/s)`,
      sBestK: 'PCIe share that makes both sides finish together', sBestF: '<b>f* makes CPU time = GPU time</b><br>holds only if the two sides do not compete for bandwidth',
      try: [
        'Drag the hit rate to <b>0%</b>: the CPU must compute all 10 experts, and the CPU branch is the critical path. Then drag it to <b>65%</b> (close to the held-out hit rate upstream measured during development). How much faster is this layer?',
        'Turn <b>Both sides at once</b> off: the GPU has to wait for the CPU to finish first. The higher the hit rate, the lighter the CPU, but the GPU\'s share now sits behind the CPU. That is exactly the lesson of the first upstream version.',
        'Press <b>Set best share</b>: the two branches become equally long. Then drag f to 100%: the GPU branch becomes the critical path, and the whole layer gets slower.',
      ],

      sCode: 'SIMD_LANES', sTitle: '16 at a time, or waiting step by step', sTag: 'Computer architecture · AVX-512 does 16 floats at once',
      sIntro: 'The same 16 numbers, three algorithms. <b>One by one</b>: one instruction does one addition. <b>SIMD</b>: one instruction does 16 additions at once, because the cells are independent. <b>Running sum</b>: each cell needs the result of the one before, so however many lanes you have, it goes one cell at a time. Pick one and press <b>Step</b>.',
      sLgIn: 'Input', sLgNow: 'Being computed this step', sLgDone: 'Done', sLgWait: 'Waiting for the cell before',
      modes: { scalar: 'One by one', simd: 'SIMD, 16 at a time', chain: 'Running sum' },
      modeTitle: { scalar: 'out[i] = a[i] + b[i]: one at a time', simd: 'out[i] = a[i] + b[i]: 16 at a time', chain: 'out[i] = out[i−1] + a[i]: waits for i−1' },
      outLabel: 'out', stepText: (n, total) => `Step ${n} / ${total}`,
      bStep: '▶ Step', bAll: '▶▶ Run to end', bReset: 'Reset',
      sReady: '<span class="c">$</span> ready. Pick an algorithm and press [ ▶ Step ]',
      lScalar: (i, a, b, s) => `<span class="c">Step ${i + 1}</span>: ${a} + ${b} = ${s}; one instruction computed just 1 number`,
      lSimd: '<span class="c">Step 1</span>: one vector add instruction; 16 lanes finish 16 additions at once',
      lChain: (i, p, a, s) => i === 0 ? `<span class="c">Step 1</span>: out[0] = a[0] = ${s}` : `<span class="c">Step ${i + 1}</span>: out[${i}] = ${p} + ${a} = ${s}; it must wait for the result of step ${i}`,
      lDone: (mode, n) => `<span class="y">// ${mode}: ${n} steps in total</span>`,
      sStepsK: 'Steps this algorithm needs', sStepsF: { scalar: '<b>= n = 16</b>', simd: '<b>= ⌈n ÷ 16⌉ = 1</b><br>512 bits ÷ 32 bits = 16 lanes', chain: '<b>= n = 16</b><br>extra lanes do not help' },
      sCmpK: 'Algorithms run so far', sCmpNone: 'None has run to the end yet', sCmpRow: (mode, n) => `<b>${mode}</b>: ${n} ${n === 1 ? 'step' : 'steps'}`,
      sVerdict: '① One by one takes 16 steps; SIMD takes just 1: when the data are independent, they can be computed at once.<br>② The running sum takes 16 steps even with 16 lanes: each cell must wait for the one before. This is called <b>data dependence</b>.<br>③ The model\'s 48 layers form exactly such a chain: the input of layer l + 1 is the output of layer l. The 10 experts within one layer are independent, so they can be split between the CPU and the GPU and computed at once; across layers, they cannot.',
      sTry: [
        'Run <b>One by one</b> first, then <b>SIMD, 16 at a time</b>: the results are the same, but the steps drop from 16 to 1.',
        'Run <b>Running sum</b>: notice that only one cell computes in each step while the other lanes wait.',
        'Run all three and read the conclusion. Think about it: which computations in the model look like "one by one", and which look like a "running sum"?',
      ],
    },
    ar: {
      code: 'LAYER_TIMELINE', title: 'داخل طبقة واحدة: GPU وCPU يحسبان معًا', tag: 'تقدير تعليمي · عرض النطاق عند الذروة النظرية',
      intro: 'تسير الطبقة الواحدة هكذا: يحسب GPU أولًا الانتباه والتوجيه، ويختار 10 خبراء. الخبراء الموجودون في ذاكرة الفيديو (إصابة) يحسبهم GPU، وبعض الخبراء المُخفقين يحسبهم GPU أيضًا بعد نقلهم عبر PCIe، والباقي يحسبه CPU. لا يلتقي الطرفان إلا بعد أن ينتهي كلاهما، ثم تبدأ الطبقة التالية. حرّك المنزلقين لتغيير معدل الإصابة ونصيب PCIe، وانظر أي طرف يصير <b>المسار الحرج</b>. عدد الخبراء متوسط، فقد يحمل كسورًا عشرية.',
      lgGpu: 'GPU: الانتباه والتوجيه والدمج', lgMoe: 'GPU: الخبراء المصابون + خبراء نُقلوا عبر PCIe', lgCpu: 'CPU: بقية الخبراء المُخفقين', lgPcie: 'نقل عبر PCIe',
      steps: ['الانتباه + التوجيه', 'توزيع الخبراء', 'الطرفان يحسبان معًا', 'الالتقاء', 'الدمج والكتابة'],
      lane: { gpu: 'GPU', cpu: 'CPU', pcie: 'PCIe' },
      axis: (ms) => `${ms} ms`,
      crit: (who, ms) => `المسار الحرج: ${who === 'cpu' ? 'فرع CPU' : 'فرع GPU'} (${ms} ms)`,
      critSerial: (ms) => `تسلسلي: CPU أولًا ثم GPU (${ms} ms)`,
      hLabel: 'معدل الإصابة h', fLabel: 'نصيب PCIe f',
      bPlay: '▶ شغّل طبقة', bBest: 'اضبط أفضل نصيب', bOverlapOn: 'الطرفان معًا: مفعّل', bOverlapOff: 'الطرفان معًا: معطّل (CPU ثم GPU)',
      ready: '<span class="c">$</span> ready. حرّك منزلقًا، أو اضغط [ ▶ شغّل طبقة ]',
      l0: (pre) => `<span class="c">[GPU]</span> الانتباه + التوجيه، نحو ${pre} ms (افتراض تعليمي). يختار الموجِّه 10 خبراء`,
      l1: (hits, pcie, cpu) => `<span class="y">توزيع</span>: ${hits} في ذاكرة الفيديو (إصابة) ← GPU؛ ${pcie} عبر PCIe ← GPU؛ ${cpu} ← CPU`,
      l2: (g, c, ov) => ov ? `<span class="m">توازٍ</span>: فرع GPU ${g} ms وفرع CPU ${c} ms في الوقت نفسه` : `<span class="m">تسلسل</span>: ينتظر GPU حتى ينهي CPU حسابه (${c} ms)، ثم يحسب نصيبه (${g} ms)`,
      l3: (who, ms) => `<span class="c">التقاء</span>: ننتظر الطرف الأبطأ. هذه المرة هو ${who === 'cpu' ? 'CPU' : 'GPU'}، بزمن ${ms} ms`,
      l4: (t, tok) => `<span class="c">←</span> ندمج النتائج العشر ونكتبها في المسار الرئيسي. هذه الطبقة: ${t} ms؛ و48 طبقة: نحو ${tok} ms`,
      sLayerK: 'زمن هذه الطبقة', sLayerF: (ov) => ov ? '<b>= الانتباه/التوجيه + max(CPU, GPU) + الدمج</b><br>الطرفان معًا؛ يُحسب الأبطأ' : '<b>= الانتباه/التوجيه + CPU + GPU + الدمج</b><br>واحد بعد الآخر؛ يُجمع الزمنان',
      sTokK: 'رمز واحد (48 طبقة)', sTokF: '<b>= 48 × زمن الطبقة</b><br>دون المسودة وأخذ العينات وغيرهما',
      sBranchK: 'فرع CPU / فرع GPU', sBranchF: (cpu, pcie) => `<b>CPU: ${cpu} × 1.3824 MB ÷ 40 GB/s</b><br>GPU: الإصابات تُقرأ من ذاكرة الفيديو (672 GB/s)،<br>و${pcie} عبر PCIe (63 GB/s)`,
      sBestK: 'نصيب PCIe الذي ينهي الطرفين معًا', sBestF: '<b>f* يجعل زمن CPU = زمن GPU</b><br>يصح فقط إن لم يتنافس الطرفان على عرض النطاق',
      try: [
        'اسحب معدل الإصابة إلى <b>0%</b>: يحسب CPU الخبراء العشرة كلهم، فيصير فرع CPU هو المسار الحرج. ثم اسحبه إلى <b>65%</b> (قريب من معدل الإصابة الذي قاسه المصدر الأصلي على بيانات محجوزة أثناء التطوير). كم صارت هذه الطبقة أسرع؟',
        'عطّل <b>الطرفان معًا</b>: يضطر GPU إلى انتظار CPU حتى ينتهي. كلما ارتفع معدل الإصابة خفّ حمل CPU، لكن نصيب GPU صار خلف CPU. هذا هو درس النسخة الأولى من المصدر الأصلي.',
        'اضغط <b>اضبط أفضل نصيب</b>: يتساوى طول الفرعين. ثم اسحب f إلى 100%: يصير فرع GPU هو المسار الحرج، وتبطؤ الطبقة كلها.',
      ],

      sCode: 'SIMD_LANES', sTitle: '16 دفعة واحدة، أو الانتظار خطوة بخطوة', sTag: 'معمارية الحاسوب · AVX-512 يحسب 16 عددًا عشريًا دفعة واحدة',
      sIntro: 'الأعداد الـ16 نفسها بثلاث خوارزميات. <b>واحدًا واحدًا</b>: تعليمة واحدة تنفّذ جمعًا واحدًا. <b>SIMD</b>: تعليمة واحدة تنفّذ 16 جمعًا معًا، لأن الخانات مستقلة. <b>المجموع المتراكم</b>: كل خانة تحتاج نتيجة التي قبلها، فمهما زادت المسارات تمشي خانة بعد خانة. اختر واحدة واضغط <b>خطوة</b>.',
      sLgIn: 'المدخلات', sLgNow: 'قيد الحساب في هذه الخطوة', sLgDone: 'تم', sLgWait: 'تنتظر الخانة التي قبلها',
      modes: { scalar: 'واحدًا واحدًا', simd: 'SIMD، 16 دفعة واحدة', chain: 'المجموع المتراكم' },
      modeTitle: { scalar: 'out[i] = a[i] + b[i]: واحدًا في كل مرة', simd: 'out[i] = a[i] + b[i]: 16 في كل مرة', chain: 'out[i] = out[i−1] + a[i]: ينتظر i−1' },
      outLabel: 'out', stepText: (n, total) => `الخطوة ${n} / ${total}`,
      bStep: '▶ خطوة', bAll: '▶▶ شغّل للنهاية', bReset: 'إعادة',
      sReady: '<span class="c">$</span> ready. اختر خوارزمية واضغط [ ▶ خطوة ]',
      lScalar: (i, a, b, s) => `<span class="c">الخطوة ${i + 1}</span>: ${a} + ${b} = ${s}؛ حسبت التعليمة عددًا واحدًا فقط`,
      lSimd: '<span class="c">الخطوة 1</span>: تعليمة جمع متجهي واحدة؛ تُنهي 16 مسارًا 16 جمعًا معًا',
      lChain: (i, p, a, s) => i === 0 ? `<span class="c">الخطوة 1</span>: out[0] = a[0] = ${s}` : `<span class="c">الخطوة ${i + 1}</span>: out[${i}] = ${p} + ${a} = ${s}؛ يجب انتظار نتيجة الخطوة ${i}`,
      lDone: (mode, n) => `<span class="y">// ${mode}: ${n} خطوة في المجموع</span>`,
      sStepsK: 'الخطوات التي تحتاجها هذه الخوارزمية', sStepsF: { scalar: '<b>= n = 16</b>', simd: '<b>= ⌈n ÷ 16⌉ = 1</b><br>512 بت ÷ 32 بت = 16 مسارًا', chain: '<b>= n = 16</b><br>المسارات الزائدة لا تفيد' },
      sCmpK: 'الخوارزميات التي شُغّلت حتى الآن', sCmpNone: 'لم تُشغَّل أي واحدة حتى النهاية بعد', sCmpRow: (mode, n) => `<b>${mode}</b>: ${n} خطوة`,
      sVerdict: '① واحدًا واحدًا يحتاج 16 خطوة؛ وSIMD يحتاج خطوة واحدة فقط: حين تكون البيانات مستقلة يمكن حسابها معًا.<br>② المجموع المتراكم يحتاج 16 خطوة حتى مع 16 مسارًا: كل خانة تنتظر التي قبلها. هذا هو <b>الاعتماد بين البيانات</b>.<br>③ طبقات النموذج الـ48 سلسلة من هذا النوع: مدخل الطبقة l + 1 هو مخرج الطبقة l. أما الخبراء العشرة داخل الطبقة الواحدة فمستقلون، فيمكن توزيعهم بين CPU وGPU وحسابهم معًا؛ وبين الطبقات لا يمكن.',
      sTry: [
        'شغّل <b>واحدًا واحدًا</b> أولًا، ثم <b>SIMD، 16 دفعة واحدة</b>: النتائج واحدة، لكن الخطوات تنزل من 16 إلى 1.',
        'شغّل <b>المجموع المتراكم</b>: لاحظ أن خانة واحدة فقط تُحسب في كل خطوة، وبقية المسارات تنتظر.',
        'شغّل الثلاث واقرأ الخلاصة. فكّر: أي حسابات في النموذج تشبه «واحدًا واحدًا»، وأيها يشبه «المجموع المتراكم»؟',
      ],
    },
    es: {
      code: 'LAYER_TIMELINE', title: 'Dentro de una capa: GPU y CPU calculan a la vez', tag: 'Estimación didáctica · ancho de banda en el pico teórico',
      intro: 'El flujo de una capa: la GPU calcula primero la atención y el enrutamiento y elige 10 expertos; los que están en la VRAM (aciertos) van a la GPU, una parte de los fallos va a la GPU por PCIe y el resto va a la CPU; solo cuando ambos lados terminan se pueden unir y pasar a la capa siguiente. Arrastra los controles para cambiar la tasa de aciertos y la cuota de PCIe, y mira qué lado pasa a ser la <b>ruta crítica</b>. El número de expertos se calcula como promedio y puede tener decimales.',
      lgGpu: 'GPU: atención, enrutamiento, fusión', lgMoe: 'GPU: expertos con acierto + expertos que llegan por PCIe', lgCpu: 'CPU: el resto de expertos con fallo', lgPcie: 'Transferencia por PCIe',
      steps: ['Atención + enrutamiento', 'Repartir expertos', 'Ambos calculan a la vez', 'Unión', 'Fusionar y escribir'],
      lane: { gpu: 'GPU', cpu: 'CPU', pcie: 'PCIe' },
      axis: (ms) => `${ms} ms`,
      crit: (who, ms) => `Ruta crítica: ${who === 'cpu' ? 'rama de la CPU' : 'rama de la GPU'} (${ms} ms)`,
      critSerial: (ms) => `En serie: la GPU empieza cuando la CPU termina (${ms} ms en total)`,
      hLabel: 'Tasa de aciertos h', fLabel: 'Cuota de PCIe f',
      bPlay: '▶ Reproducir una capa', bBest: 'Poner la cuota óptima', bOverlapOn: 'Calcular a la vez: sí', bOverlapOff: 'Calcular a la vez: no (primero CPU, luego GPU)',
      ready: '<span class="c">$</span> ready. Arrastra los controles o pulsa [ ▶ Reproducir una capa ]',
      l0: (pre) => `<span class="c">[GPU]</span> atención + enrutamiento, unos ${pre} ms (supuesto didáctico). El router elige 10 expertos`,
      l1: (hits, pcie, cpu) => `<span class="y">Reparto</span>: ${hits} están en la VRAM (acierto) → GPU; ${pcie} por PCIe → GPU; ${cpu} → CPU`,
      l2: (g, c, ov) => ov ? `<span class="m">En paralelo</span>: la rama de la GPU ${g} ms y la de la CPU ${c} ms, a la vez` : `<span class="m">En serie</span>: la GPU espera a que la CPU termine sus ${c} ms y luego calcula sus ${g} ms`,
      l3: (who, ms) => `<span class="c">Unión</span>: se espera al lado más lento. Esta vez es ${who === 'cpu' ? 'la CPU' : 'la GPU'}, con ${ms} ms`,
      l4: (t, tok) => `<span class="c">→</span> se fusionan los 10 resultados y se escriben en el flujo principal. Esta capa ${t} ms; las 48 capas, unos ${tok} ms`,
      sLayerK: 'Tiempo de esta capa', sLayerF: (ov) => ov ? '<b>= atención y enrutamiento + max(CPU, GPU) + fusión</b><br>los dos lados calculan a la vez y manda el más lento' : '<b>= atención y enrutamiento + CPU + GPU + fusión</b><br>uno tras otro, se suman los dos tramos',
      sTokK: 'Un token (48 capas)', sTokF: '<b>= 48 × tiempo por capa</b><br>sin contar borradores, muestreo y otros costos',
      sBranchK: 'Rama de la CPU / rama de la GPU', sBranchF: (cpu, pcie) => `<b>CPU: ${cpu} × 1,3824 MB ÷ 40 GB/s</b><br>GPU: los aciertos se leen de la VRAM (672 GB/s),<br>${pcie} por PCIe (63 GB/s)`,
      sBestK: 'Cuota de PCIe con la que ambos lados terminan a la vez', sBestF: '<b>f* hace que el tiempo de la CPU = el de la GPU</b><br>solo vale si los dos lados no se disputan el ancho de banda',
      try: [
        'Lleva la tasa de aciertos a <b>0 %</b>: la CPU tiene que calcular los 10 expertos y su rama es la ruta crítica. Luego llévala a <b>65 %</b> (cerca de la tasa de la evaluación con reserva de upstream): ¿cuánto más rápida es la capa?',
        'Desactiva <b>Calcular a la vez</b>: la GPU espera a que la CPU termine. Cuanto mayor es la tasa de aciertos, menos carga la CPU, pero la parte de la GPU se coloca detrás de la de la CPU. Esa es la lección de la primera versión de upstream.',
        'Pulsa <b>Poner la cuota óptima</b>: las dos ramas miden lo mismo. Si luego llevas f al 100 %, la rama de la GPU pasa a ser la ruta crítica y todo va más lento.',
      ],

      sCode: 'SIMD_LANES', sTitle: 'Calcular 16 a la vez, o esperar paso a paso', sTag: 'Principios de computadoras · AVX-512, 16 números de precisión simple a la vez',
      sIntro: 'Los mismos 16 números, tres algoritmos. <b>Uno a uno</b>: una instrucción hace una suma. <b>SIMD</b>: una instrucción hace 16 sumas a la vez, porque las celdas no dependen entre sí. <b>Cadena de sumas</b>: cada celda necesita el resultado de la anterior, y por más carriles que haya, hay que ir celda por celda. Elige uno y pulsa <b>Paso</b>.',
      sLgIn: 'Entrada', sLgNow: 'Calculando en este paso', sLgDone: 'Ya calculado', sLgWait: 'Esperando a la celda anterior',
      modes: { scalar: 'Uno a uno', simd: 'SIMD, 16 a la vez', chain: 'Cadena de sumas' },
      modeTitle: { scalar: 'resultado[i] = a[i] + b[i]: uno cada vez', simd: 'resultado[i] = a[i] + b[i]: 16 cada vez', chain: 'res[i] = res[i−1] + a[i]: espera a la anterior' },
      outLabel: 'Resultado', stepText: (n, total) => `Paso ${n} de ${total}`,
      bStep: '▶ Paso', bAll: '▶▶ Terminar', bReset: 'Reiniciar',
      sReady: '<span class="c">$</span> ready. Elige un algoritmo y pulsa [ ▶ Paso ]',
      lScalar: (i, a, b, s) => `<span class="c">Paso ${i + 1}</span>: ${a} + ${b} = ${s}, una instrucción calculó solo 1 número`,
      lSimd: '<span class="c">Paso 1</span>: una instrucción de suma vectorial, y los 16 carriles terminan las 16 sumas a la vez',
      lChain: (i, p, a, s) => i === 0 ? `<span class="c">Paso 1</span>: resultado[0] = a[0] = ${s}` : `<span class="c">Paso ${i + 1}</span>: resultado[${i}] = ${p} + ${a} = ${s}, tiene que esperar el resultado del paso ${i}`,
      lDone: (mode, n) => `<span class="y">// ${mode}: ${n} pasos en total</span>`,
      sStepsK: 'Cuántos pasos necesita este algoritmo', sStepsF: { scalar: '<b>= n = 16</b>', simd: '<b>= ⌈n ÷ 16⌉ = 1</b><br>512 bits ÷ 32 bits = 16 carriles', chain: '<b>= n = 16</b><br>por más carriles que haya, no sirven' },
      sCmpK: 'Algoritmos ya ejecutados', sCmpNone: 'Todavía no has terminado ninguno', sCmpRow: (mode, n) => `<b>${mode}</b>: ${n} pasos`,
      sVerdict: '① Sumar uno a uno son 16 pasos y SIMD necesita solo 1: si los datos no dependen entre sí, se pueden calcular a la vez.<br>② La cadena de sumas necesita 16 pasos aunque haya 16 carriles: cada celda espera a la anterior. Eso es una <b>dependencia de datos</b>.<br>③ Las 48 capas del modelo son una cadena así: la entrada de la capa l + 1 es la salida de la capa l. Los 10 expertos de una misma capa no dependen entre sí y se pueden repartir entre la CPU y la GPU para calcular a la vez; de una capa a otra, no.',
      sTry: [
        'Ejecuta primero <b>Uno a uno</b> y luego <b>SIMD, 16 a la vez</b>: el resultado es el mismo y los pasos pasan de 16 a 1.',
        'Ejecuta la <b>Cadena de sumas</b>: fíjate en que en cada paso calcula una sola celda y los demás carriles esperan.',
        'Ejecuta los tres y lee la conclusión. Piensa: ¿qué cálculos del modelo se parecen a «uno a uno» y cuáles a la «cadena de sumas»?',
      ],
    },
    ko: {
      code: 'LAYER_TIMELINE', title: '한 층 안에서: GPU와 CPU가 동시에 계산해요', tag: '교육용 추정 · 대역폭은 이론 최대치 기준',
      intro: '한 층은 이렇게 흘러가요. GPU가 먼저 어텐션과 라우팅을 계산해서 전문가 10개를 골라요. VRAM에 있는 전문가(히트)는 GPU가 계산하고, 미스 중 일부는 PCIe로 GPU에 보내 계산해요. 나머지는 CPU가 계산해요. 양쪽이 모두 끝나야 합류해서 다음 층으로 넘어가요. 슬라이더로 히트율과 PCIe 몫을 바꿔 보고, 어느 쪽이 <b>임계 경로</b>가 되는지 보세요. 전문가 수는 평균값이라 소수점이 나올 수 있어요.',
      lgGpu: 'GPU: 어텐션, 라우팅, 병합', lgMoe: 'GPU: 히트한 전문가 + PCIe로 받은 전문가', lgCpu: 'CPU: 나머지 미스 전문가', lgPcie: 'PCIe 전송',
      steps: ['어텐션 + 라우팅', '전문가 분배', '양쪽이 동시에 계산', '합류', '병합 후 되쓰기'],
      lane: { gpu: 'GPU', cpu: 'CPU', pcie: 'PCIe' },
      axis: (ms) => `${ms} ms`,
      crit: (who, ms) => `임계 경로: ${who === 'cpu' ? 'CPU 분기' : 'GPU 분기'} (${ms} ms)`,
      critSerial: (ms) => `직렬: CPU가 끝나야 GPU 시작 (합계 ${ms} ms)`,
      hLabel: '히트율 h', fLabel: 'PCIe 몫 f',
      bPlay: '▶ 한 층 재생', bBest: '최적 몫으로 설정', bOverlapOn: '양쪽 동시 계산: 켜짐', bOverlapOff: '양쪽 동시 계산: 꺼짐 (CPU 먼저, GPU 나중)',
      ready: '<span class="c">$</span> ready. 슬라이더를 움직이거나 [ ▶ 한 층 재생 ]을 누르세요',
      l0: (pre) => `<span class="c">[GPU]</span> 어텐션 + 라우팅, 약 ${pre} ms (교육용 가정). 라우터가 전문가 10개를 골라요`,
      l1: (hits, pcie, cpu) => `<span class="y">분배</span>: ${hits}개는 VRAM에 있어요(히트) → GPU, ${pcie}개는 PCIe 경유 → GPU, ${cpu}개는 → CPU`,
      l2: (g, c, ov) => ov ? `<span class="m">병렬</span>: GPU 분기 ${g} ms와 CPU 분기 ${c} ms가 동시에 진행돼요` : `<span class="m">직렬</span>: GPU는 CPU가 ${c} ms 동안 먼저 끝내기를 기다린 뒤, 자기 몫 ${g} ms를 계산해요`,
      l3: (who, ms) => `<span class="c">합류</span>: 느린 쪽을 기다려요. 이번에는 ${who === 'cpu' ? 'CPU' : 'GPU'}이고, ${ms} ms 걸렸어요`,
      l4: (t, tok) => `<span class="c">→</span> 결과 10개를 병합해서 본줄기에 되써요. 이 층은 ${t} ms, 48개 층은 약 ${tok} ms예요`,
      sLayerK: '이 층에 걸리는 시간', sLayerF: (ov) => ov ? '<b>= 어텐션·라우팅 + max(CPU, GPU) + 병합</b><br>양쪽이 동시에 계산하고, 느린 쪽이 기준이에요' : '<b>= 어텐션·라우팅 + CPU + GPU + 병합</b><br>차례로 계산해서 두 시간을 더해요',
      sTokK: '토큰 1개 (48개 층)', sTokF: '<b>= 48 × 층당 시간</b><br>드래프트, 샘플링 등 다른 비용은 빠져 있어요',
      sBranchK: 'CPU 분기 / GPU 분기', sBranchF: (cpu, pcie) => `<b>CPU: ${cpu}개 × 1.3824 MB ÷ 40 GB/s</b><br>GPU: 히트는 VRAM에서 읽고(672 GB/s),<br>${pcie}개는 PCIe로 읽어요(63 GB/s)`,
      sBestK: '양쪽이 동시에 끝나는 PCIe 몫', sBestF: '<b>f*는 CPU 시간 = GPU 시간이 되게 해요</b><br>양쪽이 대역폭을 다투지 않을 때만 성립해요',
      try: [
        '히트율을 <b>0%</b>로 내려 보세요. CPU가 전문가 10개를 모두 계산하니 CPU 분기가 임계 경로예요. 이어서 <b>65%</b>(업스트림이 개발 중 따로 떼어 평가한 히트율에 가까워요)로 올리면 이 층이 얼마나 빨라지나요?',
        '<b>양쪽 동시 계산</b>을 끄세요. GPU가 CPU의 계산이 끝나길 기다려요. 히트율이 높을수록 CPU는 가벼워지지만, GPU 몫이 CPU 뒤로 밀려요. 업스트림 첫 버전의 교훈이 바로 이거예요.',
        '<b>최적 몫으로 설정</b>을 누르세요. 두 분기의 길이가 같아져요. 그다음 f를 100%로 끌어 보세요. 이번에는 GPU 분기가 임계 경로가 되어 전체가 오히려 느려져요.',
      ],

      sCode: 'SIMD_LANES', sTitle: '한 번에 16개 계산 vs 한 칸씩 기다리기', sTag: '컴퓨터 원리 · AVX-512는 단정밀도 수 16개를 한 번에',
      sIntro: '같은 숫자 16개를 세 가지 방식으로 계산해요. <b>하나씩 더하기</b>: 명령 하나가 덧셈 하나를 해요. <b>SIMD</b>: 칸마다 서로 상관없으니 명령 하나가 덧셈 16개를 동시에 해요. <b>누적 체인</b>: 각 칸이 앞 칸의 결과를 써야 해서, 레인이 아무리 많아도 한 칸씩 가야 해요. 하나를 고르고 <b>한 단계</b>를 누르세요.',
      sLgIn: '입력', sLgNow: '지금 계산 중', sLgDone: '계산 끝', sLgWait: '앞 칸을 기다리는 중',
      modes: { scalar: '하나씩 더하기', simd: 'SIMD 한 번에 16개', chain: '누적 체인' },
      modeTitle: { scalar: '결과[i] = a[i] + b[i]: 한 번에 하나', simd: '결과[i] = a[i] + b[i]: 한 번에 16개', chain: '결과[i] = 결과[i−1] + a[i]: 앞 칸을 기다려요' },
      outLabel: '결과', stepText: (n, total) => `${n}단계 / 총 ${total}단계`,
      bStep: '▶ 한 단계', bAll: '▶▶ 끝까지', bReset: '초기화',
      sReady: '<span class="c">$</span> ready. 방식을 하나 고르고 [ ▶ 한 단계 ]를 누르세요',
      lScalar: (i, a, b, s) => `<span class="c">${i + 1}단계</span>: ${a} + ${b} = ${s}. 명령 하나로 수 1개만 계산했어요`,
      lSimd: '<span class="c">1단계</span>: 벡터 덧셈 명령 하나로 16개 레인이 덧셈 16개를 동시에 끝내요',
      lChain: (i, p, a, s) => i === 0 ? `<span class="c">1단계</span>: 결과[0] = a[0] = ${s}` : `<span class="c">${i + 1}단계</span>: 결과[${i}] = ${p} + ${a} = ${s}. ${i}단계의 결과를 기다려야 해요`,
      lDone: (mode, n) => `<span class="y">// ${mode}: 총 ${n}단계</span>`,
      sStepsK: '이 방식에 필요한 단계 수', sStepsF: { scalar: '<b>= n = 16</b>', simd: '<b>= ⌈n ÷ 16⌉ = 1</b><br>512비트 ÷ 32비트 = 16개 레인', chain: '<b>= n = 16</b><br>레인이 많아도 쓸 수 없어요' },
      sCmpK: '지금까지 실행한 방식', sCmpNone: '아직 끝까지 실행한 방식이 없어요', sCmpRow: (mode, n) => `<b>${mode}</b>: ${n}단계`,
      sVerdict: '① 하나씩 더하면 16단계, SIMD는 1단계예요. 데이터가 서로 상관없으면 동시에 계산할 수 있어요.<br>② 누적 체인은 레인이 16개여도 16단계예요. 칸마다 앞 칸을 기다려야 하는데, 이를 <b>데이터 의존성</b>이라고 해요.<br>③ 모델의 48개 층이 바로 이런 체인이에요. l + 1번째 층의 입력은 l번째 층의 출력이에요. 같은 층의 전문가 10개는 서로 상관없으니 CPU와 GPU가 나눠 동시에 계산할 수 있지만, 층과 층 사이는 안 돼요.',
      sTry: [
        '먼저 <b>하나씩 더하기</b>, 이어서 <b>SIMD 한 번에 16개</b>를 실행해 보세요. 결과는 같고 단계 수는 16에서 1로 줄어요.',
        '<b>누적 체인</b>을 실행해 보세요. 단계마다 한 칸만 계산하고 나머지 레인은 기다리는 걸 보세요.',
        '세 가지를 모두 실행하고 결론을 읽어 보세요. 모델 안의 어떤 계산이 「하나씩 더하기」 같고, 어떤 계산이 「누적 체인」 같을까요?',
      ],
    },
    ja: {
      code: 'LAYER_TIMELINE', title: '1 つの層の中：GPU と CPU が同時に計算', tag: '教育用の試算 · 帯域は理論ピーク値',
      intro: '1 つの層の流れ：GPU がまずアテンションとルーティングを計算し、10 個のエキスパートを選びます。VRAM にあるもの（ヒット）は GPU へ、ミスの一部は PCIe 経由で GPU へ、残りは CPU へ渡します。両側の計算が終わってはじめて合流し、次の層へ進みます。スライダーでヒット率と PCIe の割合を変えて、どちらが<b>クリティカルパス</b>になるかを見ましょう。エキスパートの個数は平均値なので、小数になることもあります。',
      lgGpu: 'GPU：アテンション、ルーティング、マージ', lgMoe: 'GPU：ヒットしたエキスパート ＋ PCIe で届いたエキスパート', lgCpu: 'CPU：残りのミスしたエキスパート', lgPcie: 'PCIe 転送',
      steps: ['アテンション ＋ ルーティング', 'エキスパートの割り振り', '両側が同時に計算', '合流', 'マージして書き戻し'],
      lane: { gpu: 'GPU', cpu: 'CPU', pcie: 'PCIe' },
      axis: (ms) => `${ms} ms`,
      crit: (who, ms) => `クリティカルパス：${who === 'cpu' ? 'CPU の分岐' : 'GPU の分岐'}（${ms} ms）`,
      critSerial: (ms) => `直列：CPU が終わってから GPU が開始（合計 ${ms} ms）`,
      hLabel: 'ヒット率 h', fLabel: 'PCIe の割合 f',
      bPlay: '▶ 1 層を再生', bBest: '最適な割合に設定', bOverlapOn: '両側が同時に計算：オン', bOverlapOff: '両側が同時に計算：オフ（CPU のあとに GPU）',
      ready: '<span class="c">$</span> ready. スライダーを動かすか、[ ▶ 1 層を再生 ] を押してください',
      l0: (pre) => `<span class="c">[GPU]</span> アテンション ＋ ルーティング、約 ${pre} ms（教育用の仮定）。ルーティングで 10 個のエキスパートを選択`,
      l1: (hits, pcie, cpu) => `<span class="y">割り振り</span>：${hits} 個は VRAM にある（ヒット）→ GPU、${pcie} 個は PCIe 経由 → GPU、${cpu} 個 → CPU`,
      l2: (g, c, ov) => ov ? `<span class="m">並列</span>：GPU の分岐 ${g} ms と CPU の分岐 ${c} ms を同時に実行` : `<span class="m">直列</span>：GPU は CPU の ${c} ms が終わるのを待ってから、自分の ${g} ms を計算`,
      l3: (who, ms) => `<span class="c">合流</span>：遅いほうを待ちます。今回は ${who === 'cpu' ? 'CPU' : 'GPU'} で、${ms} ms`,
      l4: (t, tok) => `<span class="c">→</span> 10 個の結果をマージして本流に書き戻します。この層は ${t} ms、48 層で約 ${tok} ms`,
      sLayerK: 'この層の所要時間', sLayerF: (ov) => ov ? '<b>= アテンション・ルーティング ＋ max(CPU, GPU) ＋ マージ</b><br>両側が同時に計算し、遅いほうを採用' : '<b>= アテンション・ルーティング ＋ CPU ＋ GPU ＋ マージ</b><br>順番に実行するので、2 つを足す',
      sTokK: '1 トークン（48 層）', sTokF: '<b>= 48 × 1 層の所要時間</b><br>ドラフトやサンプリングなどの他のコストは含まない',
      sBranchK: 'CPU の分岐 / GPU の分岐', sBranchF: (cpu, pcie) => `<b>CPU：${cpu} 個 × 1.3824 MB ÷ 40 GB/s</b><br>GPU：ヒットは VRAM から読む（672 GB/s）、<br>${pcie} 個は PCIe 経由（63 GB/s）`,
      sBestK: '両側が同時に終わる PCIe の割合', sBestF: '<b>f* は CPU の時間 = GPU の時間になる値</b><br>「両側が帯域を奪い合わない」という仮定のもとでのみ成り立つ',
      try: [
        'ヒット率を <b>0%</b> にします。CPU が 10 個すべてを計算するので、CPU の分岐がクリティカルパスです。次に <b>65%</b>（上流が開発時に評価用に取り置いたデータでのヒット率に近い値）まで動かします。この層はどれだけ速くなりますか。',
        '<b>両側が同時に計算</b> をオフにします。GPU は CPU が終わるのを待ちます。ヒット率が高いほど CPU の負担は軽くなりますが、GPU の分は CPU の後ろに並べられます。これが上流の最初のバージョンの教訓です。',
        '<b>最適な割合に設定</b> を押します。2 つの分岐が同じ長さになります。次に f を 100% まで動かします。今度は GPU の分岐がクリティカルパスになり、全体はかえって遅くなります。',
      ],

      sCode: 'SIMD_LANES', sTitle: '16 個を一度に計算するか、1 ステップずつ待つか', sTag: 'コンピュータの原理 · AVX-512 は単精度の数を一度に 16 個',
      sIntro: '同じ 16 個の数に、3 つのアルゴリズム。<b>1 つずつ加算</b>：命令 1 つで加算 1 回。<b>SIMD</b>：命令 1 つで 16 回の加算を同時に。各マスが互いに無関係だからです。<b>累積和の連鎖</b>：各マスが前のマスの結果を使うので、レーンが何本あっても 1 マスずつしか進めません。1 つ選んで <b>ステップ</b> を押してください。',
      sLgIn: '入力', sLgNow: 'このステップで計算中', sLgDone: '計算済み', sLgWait: '前のマスを待っている',
      modes: { scalar: '1 つずつ加算', simd: 'SIMD で 16 個ずつ', chain: '累積和の連鎖' },
      modeTitle: { scalar: '結果[i] = a[i] + b[i]：1 回に 1 つ', simd: '結果[i] = a[i] + b[i]：1 回に 16 個', chain: '結果[i] = 結果[i−1] + a[i]：前のマスを待つ' },
      outLabel: '結果', stepText: (n, total) => `ステップ ${n} / 全 ${total}`,
      bStep: '▶ ステップ', bAll: '▶▶ 最後まで', bReset: 'リセット',
      sReady: '<span class="c">$</span> ready. アルゴリズムを選んで [ ▶ ステップ ] を押してください',
      lScalar: (i, a, b, s) => `<span class="c">ステップ ${i + 1}</span>：${a} + ${b} = ${s}、命令 1 つで計算できたのは 1 個だけ`,
      lSimd: '<span class="c">ステップ 1</span>：ベクトル加算命令 1 つで、16 レーンが 16 回の加算を同時に終えます',
      lChain: (i, p, a, s) => i === 0 ? `<span class="c">ステップ 1</span>：結果[0] = a[0] = ${s}` : `<span class="c">ステップ ${i + 1}</span>：結果[${i}] = ${p} + ${a} = ${s}、ステップ ${i} の結果を待つ必要があります`,
      lDone: (mode, n) => `<span class="y">// ${mode}：全 ${n} ステップ</span>`,
      sStepsK: 'このアルゴリズムのステップ数', sStepsF: { scalar: '<b>= n = 16</b>', simd: '<b>= ⌈n ÷ 16⌉ = 1</b><br>512 ビット ÷ 32 ビット = 16 レーン', chain: '<b>= n = 16</b><br>レーンが増えても使い道がない' },
      sCmpK: '実行済みのアルゴリズム', sCmpNone: 'まだ最後まで実行したものはありません', sCmpRow: (mode, n) => `<b>${mode}</b>：${n} ステップ`,
      sVerdict: '① 1 つずつ加算すると 16 ステップ、SIMD ならたった 1 ステップです。データが互いに無関係なら、同時に計算できます。<br>② 累積和の連鎖は、16 レーンあっても 16 ステップかかります。どのマスも前のマスを待つからです。これを<b>データ依存</b>といいます。<br>③ モデルの 48 層は、まさにこのような鎖です。第 l + 1 層の入力は第 l 層の出力だからです。同じ層の 10 個のエキスパートは互いに無関係なので、CPU と GPU に分けて同時に計算できます。層と層の間では、それができません。',
      sTry: [
        'まず <b>1 つずつ加算</b>、次に <b>SIMD で 16 個ずつ</b> を実行します。結果は同じで、ステップ数が 16 から 1 に減ります。',
        '<b>累積和の連鎖</b> を実行します。各ステップで計算しているのは 1 マスだけで、ほかのレーンは待っています。',
        '3 つとも実行して、結論を読みます。考えてみましょう。モデルの中の計算で、「1 つずつ加算」に似ているものと、「累積和の連鎖」に似ているものはどれでしょう。',
      ],
    },
  });

  Viz.register('layer-timeline', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgGpu, glow: true },
        { color: 'var(--frame)', text: T.lgMoe },
        { color: 'var(--a2)', text: T.lgCpu },
        { color: 'var(--a3)', text: T.lgPcie },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 196', class: 'viz-stage', role: 'img', 'aria-label': T.title }, left);
      const X0 = 52, SPAN = 300, MAXMS = 0.7, X = ms => X0 + ms / MAXMS * SPAN;
      const lanesY = { gpu: 20, cpu: 62, pcie: 104 };
      Object.entries(lanesY).forEach(([k, y]) => {
        Viz.svg('text', { x: 4, y: y + 18, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = T.lane[k];
        Viz.svg('rect', { x: X0, y, width: SPAN, height: 26, style: 'fill:var(--side)' }, svg);
      });
      [0, 0.2, 0.4, 0.6].forEach(ms => {
        Viz.svg('rect', { x: X(ms) - 0.5, y: 14, width: 1, height: 122, style: 'fill:var(--frame)' }, svg);
        Viz.svg('text', { x: X(ms), y: 152, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = T.axis(ms);
      });
      const bar = (lane, fill) => Viz.svg('rect', { x: X0, y: lanesY[lane] + 2, width: 0, height: 22, style: `fill:${fill}` }, svg);
      const bPre = bar('gpu', 'var(--accent)'), bMoe = bar('gpu', 'var(--frame)'), bPost = bar('gpu', 'var(--accent)');
      const bCpu = bar('cpu', 'var(--a2)'), bPcie = bar('pcie', 'var(--a3)');
      const joinLine = Viz.svg('rect', { x: X0, y: 14, width: 2, height: 122, style: 'fill:var(--ink)' }, svg);
      const cursor = Viz.svg('rect', { x: X0, y: 14, width: 2, height: 122, style: 'fill:var(--a3)', opacity: 0 }, svg);
      const critText = Viz.svg('text', { x: 4, y: 178, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      left.insertAdjacentHTML('beforeend', `
        <div class="viz-slider"><label>${T.hLabel}</label><input type="range" min="0" max="100" step="5" value="65" aria-label="${Viz.esc(T.hLabel)}"><output>65%</output></div>
        <div class="viz-slider"><label>${T.fLabel}</label><input type="range" min="0" max="100" step="5" value="20" aria-label="${Viz.esc(T.fLabel)}"><output>20%</output></div>
        <div class="viz-row">${Viz.button(T.bPlay)}${Viz.button(T.bBest, 'alt')}${Viz.button(T.bOverlapOn, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = Viz.stat({ id: 't-layer', k: T.sLayerK, v: '', f: '', hot: true }) + Viz.stat({ id: 't-tok', k: T.sTokK, v: '', f: T.sTokF }) +
        Viz.stat({ id: 't-br', k: T.sBranchK, v: '', f: '' }) + Viz.stat({ id: 't-best', k: T.sBestK, v: '', f: T.sBestF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [hR, fR] = left.querySelectorAll('input[type=range]');
      const [playBtn, bestBtn, ovBtn] = left.querySelectorAll('.viz-btn');
      let overlap = true, busy = false;
      const f3 = x => x.toFixed(3), f2 = x => x.toFixed(2);
      const cur = () => ({ h: +hR.value / 100, f: +fR.value / 100 });
      function setBar(r, a, b) { r.setAttribute('x', X(a)); r.setAttribute('width', Math.max(0, X(b) - X(a))); }
      function draw() {
        const { h, f } = cur();
        const r = M.layer({ h, f, overlap });
        const pre = M.PRE_MS;
        setBar(bPre, 0, pre);
        const gStart = overlap ? pre : pre + r.cpuMs;
        setBar(bMoe, gStart, gStart + r.gpuMs);
        setBar(bCpu, pre, pre + r.cpuMs);
        setBar(bPcie, gStart, gStart + r.pcieN * M.expertMs(M.PCIE_GBPS));
        setBar(bPost, pre + r.moeMs, r.totalMs);
        joinLine.setAttribute('x', X(pre + r.moeMs) - 1);
                critText.textContent = overlap ? T.crit(r.critical, f3(r.moeMs)) : T.critSerial(f3(r.moeMs));
        hR.nextElementSibling.textContent = hR.value + '%'; fR.nextElementSibling.textContent = fR.value + '%';
        $('[data-s=t-layer-v]').textContent = f3(r.totalMs) + ' ms';
        $('[data-s=t-layer-f]').innerHTML = T.sLayerF(overlap);
        $('[data-s=t-tok-v]').textContent = f2(r.tokenMs) + ' ms';
        $('[data-s=t-br-v]').textContent = f3(r.cpuMs) + ' / ' + f3(r.gpuMs);
        $('[data-s=t-br-f]').innerHTML = T.sBranchF(r.cpuN.toFixed(1), r.pcieN.toFixed(1));
        $('[data-s=t-best-v]').textContent = Math.round(M.bestShare(h) * 100) + '%';
        return r;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      playBtn.onclick = () => guard(async () => {
        const r = draw(), pre = M.PRE_MS;
        cursor.setAttribute('opacity', 1);
        const move = async (ms) => { cursor.setAttribute('x', X(ms) - 1); await ctx.sleep(380); };
        pipe.set(0); term.log(T.l0(pre)); await move(pre);
        pipe.set(1); term.log(T.l1(r.hits.toFixed(1), r.pcieN.toFixed(1), r.cpuN.toFixed(1))); await move(pre);
        pipe.set(2); term.log(T.l2(f3(r.gpuMs), f3(r.cpuMs), overlap)); await move(pre + r.moeMs);
        pipe.set(3); term.log(T.l3(overlap ? r.critical : 'cpu', f3(r.moeMs))); await move(pre + r.moeMs);
        pipe.set(4); term.log(T.l4(f3(r.totalMs), f2(r.tokenMs))); await move(r.totalMs);
        cursor.setAttribute('opacity', 0);
      });
      bestBtn.onclick = () => { fR.value = Math.round(M.bestShare(+hR.value / 100) * 20) * 5; draw(); };
      ovBtn.onclick = () => { overlap = !overlap; ovBtn.textContent = overlap ? T.bOverlapOn : T.bOverlapOff; ovBtn.className = 'viz-btn ' + (overlap ? 'ghost' : 'alt'); draw(); };
      hR.oninput = draw; fR.oninput = draw;
      draw();
    },
  });

  Viz.register('simd-lanes', {
    mount(el, ctx) {
      const D = M.simdDemo(), N = 16;
      const body = Viz.frame(el, { code: T.sCode, title: T.sTitle, tag: T.sTag, intro: T.sIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.sLgIn },
        { color: 'var(--accent)', text: T.sLgNow, glow: true },
        { color: 'var(--a2)', text: T.sLgDone },
        { color: 'var(--a3)', text: T.sLgWait },
      ]));
      body.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin:0 0 12px">${Object.entries(T.modes).map(([k, v]) => `<button type="button" class="viz-btn ghost" data-m="${k}">${Viz.esc(v)}</button>`).join('')}</div><div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 150', class: 'viz-stage', role: 'img', 'aria-label': T.sTitle }, left);
      const titleT = Viz.svg('text', { x: 4, y: 14, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const row = (y, vals) => vals.map((v, i) => {
        const r = Viz.svg('rect', { x: 4 + i * 22, y, width: 20, height: 22, class: 'viz-cell' }, svg);
        const t = Viz.svg('text', { x: 14 + i * 22, y: y + 16, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
        t.textContent = v; return { r, t };
      });
      const rowA = row(20, D.a), rowB = row(46, D.b);
      Viz.svg('text', { x: 4, y: 88, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.outLabel;
      const rowO = row(94, Array(N).fill(''));
      const stepT = Viz.svg('text', { x: 4, y: 140, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.sReady);
      right.innerHTML = Viz.stat({ id: 's-steps', k: T.sStepsK, v: '', f: '', hot: true }) + Viz.stat({ id: 's-cmp', k: T.sCmpK, v: '—', f: T.sCmpNone });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.sTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn] = left.querySelectorAll('.viz-btn');
      let mode = 'scalar', k = 0, busy = false;
      const done = {};
      const total = () => M.steps(N, mode);
      function load(m) {
        mode = m; k = 0;
        el.querySelectorAll('[data-m]').forEach(b => { b.className = 'viz-btn ' + (b.dataset.m === m ? '' : 'ghost'); });
        titleT.textContent = T.modeTitle[m];
        rowB.forEach(c => c.r.style.opacity = m === 'chain' ? 0.25 : 1);
        rowB.forEach(c => c.t.style.opacity = m === 'chain' ? 0.25 : 1);
        rowO.forEach(c => { c.t.textContent = ''; c.r.setAttribute('class', 'viz-cell'); c.r.style.fill = ''; });
        $('[data-s=s-steps-v]').textContent = total();
        $('[data-s=s-steps-f]').innerHTML = T.sStepsF[m];
        paint([]);
      }
      function paint(now) {
        rowO.forEach((c, i) => {
          const isNow = now.includes(i), isDone = c.t.textContent !== '' && !isNow;
          c.r.setAttribute('class', 'viz-cell' + (isNow ? ' pick' : isDone ? ' score' : ''));
          c.r.style.fill = !isNow && !isDone && mode === 'chain' && k > 0 && i > now[now.length - 1] ? 'var(--a3)' : '';
          c.r.style.opacity = !isNow && !isDone && mode === 'chain' && k > 0 && i > now[now.length - 1] ? 0.35 : 1;
          c.t.style.fill = isNow ? 'var(--paper)' : 'var(--ink)';
        });
        stepT.textContent = T.stepText(k, total());
      }
      function step() {
        if (k >= total()) return false;
        let now = [];
        if (mode === 'scalar') { now = [k]; rowO[k].t.textContent = D.sum[k]; term.log(T.lScalar(k, D.a[k], D.b[k], D.sum[k])); }
        if (mode === 'simd') { now = [...Array(N).keys()]; now.forEach(i => { rowO[i].t.textContent = D.sum[i]; }); term.log(T.lSimd); }
        if (mode === 'chain') { now = [k]; rowO[k].t.textContent = D.chain[k]; term.log(T.lChain(k, k ? D.chain[k - 1] : 0, D.a[k], D.chain[k])); }
        k++;
        paint(now);
        if (k === total()) finish();
        return true;
      }
      function finish() {
        done[mode] = total();
        term.log(T.lDone(T.modes[mode], total()));
        $('[data-s=s-cmp-v]').textContent = Object.keys(done).length + ' / 3';
        $('[data-s=s-cmp-f]').innerHTML = Object.entries(done).map(([m, n]) => T.sCmpRow(T.modes[m], n)).join('<br>');
        if (Object.keys(done).length === 3) { const v = $('.viz-verdict'); v.innerHTML = T.sVerdict; v.hidden = false; }
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      el.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => guard(async () => { load(b.dataset.m); }); });
      stepBtn.onclick = () => guard(async () => { if (k >= total()) load(mode); step(); });
      allBtn.onclick = () => guard(async () => { if (k >= total()) load(mode); while (step()) await ctx.sleep(120); });
      resetBtn.onclick = () => guard(async () => { load(mode); term.clear(); term.log(T.sReady); });
      load('scalar');
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
