/* Chapter 17 widgets: the KV budget calculator and the CLOCK paging step-through.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.kv;
  const CTX = [4096, 8192, 16384, 32768, 65536, 131072, 262144];
  const FMTS = ['f16', 'int8', 'k8v4', 'q4'];
  const BLOCK_BYTES = 4224;                                 // one INT8 page: 4 cells, both heads, K and V
  const QUERIES = [[0, 1, 2], [1, 2, 3], [0, 5], [5, 6, 1], [2, 9, 10], [9, 10, 11], [5, 6, 0], [1, 2, 3]];

  const T = Viz.t({
    zh: {
      code: 'KV_BUDGET', title: 'KV 预算器', tag: '教学推演 · 只算主 KV 与 GDN 状态',
      intro: '选上下文长度、KV 格式和要保留的对话数，看字节数怎样变。Strata 的服务默认一次只跑<b>一段</b>对话（可选的 parallel 槽位这里不算）；其余对话可以把状态“停放”在内存里。注意看同一个字节数写成 <b>GB</b> 和 <b>GiB</b> 时差多少。',
      lgVkv: '显存里的 KV', lgGdn: 'GDN 递推状态（固定大小）', lgRkv: '内存里的 KV 主副本（流式）', lgPark: '停放在内存的其他对话',
      stageLabel: '显存与内存的占用条', vram: '显存', ram: '内存',
      ctxLabel: '上下文长度', sesLabel: '保留几段对话',
      fmtNames: { f16: 'FP16', int8: 'INT8', k8v4: 'K8V4', q4: 'Q4_0' },
      bStream: (on) => on ? 'KV 流式：开' : 'KV 流式：关',
      tok: (x) => `${x} token`, ses: (x) => `${x} 段`,
      barText: (gib, gb) => `${gib} GiB（= ${gb} GB）`,
      sPtK: '每个 token 的 KV', sPtF: (cell) => `<b>= 12 层 × ${cell} 字节</b><br>每层 2 个 KV 头 × 256 维 × K、V 两份`,
      sOneK: '一段对话的 KV', sOneF: (ctx, pt, b, gb) => `<b>= ${ctx} × ${pt} = ${b} 字节 ≈ ${gb} GB</b><br>GB 除以 10⁹，GiB 除以 2³⁰`,
      sVramK: '显存合计（正在跑的那段）', sVramF: (cells) => `<b>= KV 驻留 ${cells} 格 + GDN 状态 112.2 MiB</b><br>不含权重、专家缓存和临时缓冲`,
      sRamK: '内存合计', sRamF: '<b>= 流式 KV 主副本 + 停放的对话</b><br>每段停放对话 = 它的 KV + GDN 状态',
      gibOf: gib => `${gib} GiB`,
      tChange: (ctx, pt, b, gb, gib) => `<span class="c">${ctx} 格</span> × ${pt} B = ${b} B = <span class="y">${gb} GB</span> = <span class="w">${gib} GiB</span>`,
      tStream: (on) => on ? '<span class="m">流式打开</span>：64K 起，显存只留 32,768 格常用的页，完整历史在内存' : '<span class="m">流式关闭</span>：整段 KV 都放在显存里',
      tFmt: (name, cell, scaled) => `<span class="c">格式 ${name}</span>：每层每格 ${cell} 字节${scaled ? '（含缩放系数）' : '（不需要缩放系数）'}`,
      vBase: (gb, gib, pct) => `同一段 KV：<b>${gb} GB</b>，也就是 <b>${gib} GiB</b>。GiB 的数字小了约 ${pct}%，因为 1 GiB 比 1 GB 多 7.4%。`,
      vStream: '<br>流式已生效：显存只放 32,768 格，完整历史在内存里，没有被删掉。',
      vShort: '<br>上下文不到 64K，流式不会启动：整段 KV 都在显存里。',
      vBlocked: '<br><b>注意：</b>K8V4 不走 KV 流式（上游文档写明），所以这里整段 KV 都留在显存。两个“省内存”开关不能叠加。',
      vPark: (n, gib) => `<br>另外 ${n} 段停放的对话占内存 ${gib} GiB；上游示例给停放缓存设的上限是 8 GiB。`,
      try: [
        '选 <b>FP16</b>、32K：一段对话的 KV 是 805,306,368 字节，也就是 805.3 MB 或 768 MiB。Strata 源码注释把它写成了“805 MiB”，单位标错了。',
        '把上下文从 32K 拉到 128K：KV 正好翻 4 倍；再打开流式，显存那条立刻变短，内存那条变长。历史没少，只是换了地方。',
        '选 <b>K8V4</b> 再拉到 256K：流式开关不起作用。“比 INT8 少 23%”和“只在显存留 32K”这两个好处不能同时拿到。',
      ],

      pCode: 'KV_PAGING', pTitle: '页表与换页', pTag: '教学推演 · 12 个块、4 个显存槽',
      pIntro: '历史按 4 个 token 一块切开，<b>完整的一份</b>一直在内存里；显存只有 4 个槽位。每一步注意力选中几块，按 <b>单步</b> 看页表怎样把它们换进显存。',
      pLgHost: '内存里的块（完整历史）', pLgSlot: '住在显存槽里的块', pLgNew: '这一步刚换进来', pLgRef: '引用位 = 1（最近用过）',
      pSteps: ['选中块', '查页表', 'CLOCK 选槽位', '从内存拷贝', '注意力读取'],
      pStage: '内存里的 12 个块、页表和 4 个显存槽', hostTitle: '内存：完整历史（每块 4 个 token）', slotTitle: '显存：4 个槽位', ptRow: '页表',
      slotBlock: (b) => b < 0 ? '空' : `块 ${b}`, refBit: (r) => `引用 ${r}`, hand: '▲ 指针',
      bStep: '▶ 单步', bReset: '重置',
      pReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]，一共 8 次查询',
      sHitK: '命中 / 缺页', sHitF: '<b>命中 = 块已在显存槽里</b><br>缺页 = 要从内存拷贝',
      sRateK: '命中率', sRateF: '<b>= 命中 ÷ (命中 + 缺页)</b>',
      sBytesK: '经 PCIe 拷贝的字节', sBytesF: '<b>= 缺页数 × 4,224 字节</b><br>INT8 下一块（4 格、2 头、K 和 V）',
      q0: (n, ids) => `<span class="c">[查询 ${n}]</span> 注意力这一步选中块 ${ids}`,
      q1: (hits, miss) => `<span class="m">查页表</span>：${hits.length ? '块 ' + hits.join('、') + ' 已在显存（命中，引用位设为 1）' : '没有命中'}；${miss.length ? '块 ' + miss.join('、') + ' 不在（页表里是 —）' : '全部命中'}`,
      q2none: '<span class="y">CLOCK</span>：不需要换出任何块',
      q2: (b, slot, ev) => ev >= 0 ? `<span class="y">CLOCK</span>：指针扫过槽位，引用位是 1 的先清零、放过一次；块 ${b} 放进槽 ${slot}，换出块 ${ev}（它在内存里还有完整一份）` : `<span class="y">CLOCK</span>：槽 ${slot} 还空着，块 ${b} 直接住进去`,
      q3: (n, bytes) => n ? `<span class="w">拷贝</span>：${n} 块 × 4,224 B = ${bytes} B 从内存经 PCIe 搬进显存` : '<span class="w">拷贝</span>：这一步不用搬',
      q4: '<span class="c">→</span> 注意力通过页表读到全部选中的块，读到的数值和全放显存时一样',
      pVerdict: (rate, bytes) => `① 8 次查询的命中率是 <b>${rate}%</b>，共搬了 ${bytes} 字节。<br>② 被换出的块没有消失：内存里一直有完整一份，下次选中时再搬回来。显存只决定“快不快”，不决定“对不对”。<br>③ Strata 的写入也遵守这一点：新 token 总写进内存那份，只有块正住在显存时才顺手写一份，所以显存槽永远不会过期。`,
      pTry: [
        '连按 <b>单步</b> 走完第 1–2 次查询：块 0–3 依次住进 4 个槽位，页表从 “—” 变成槽号。',
        '盯住第 3 次查询的 CLOCK 一步：引用位为 1 的槽先被清零放过，指针转一圈后才挑出换出的块，这就是“第二次机会”。',
        '走完 8 次，看命中率：最后一次又查块 1–3，它们早被换出，只能重新搬。工作集比槽位大时，换页就会反复发生。',
      ],
    },
    en: {
      code: 'KV_BUDGET', title: 'KV budget calculator', tag: 'Teaching estimate · main KV and GDN state only',
      intro: 'Pick a context length, a KV format and how many conversations to keep, and watch the bytes change. By default, Strata\'s server runs only <b>one</b> conversation at a time (the optional parallel slots are not counted here); the others can "park" their state in RAM. Notice how far apart the same byte count is when written in <b>GB</b> and in <b>GiB</b>.',
      lgVkv: 'KV in VRAM', lgGdn: 'GDN recurrent state (fixed size)', lgRkv: 'Master copy of KV in RAM (streaming)', lgPark: 'Other conversations parked in RAM',
      stageLabel: 'Usage bars for VRAM and RAM', vram: 'VRAM', ram: 'RAM',
      ctxLabel: 'Context length', sesLabel: 'Conversations to keep',
      fmtNames: { f16: 'FP16', int8: 'INT8', k8v4: 'K8V4', q4: 'Q4_0' },
      bStream: (on) => on ? 'KV streaming: on' : 'KV streaming: off',
      tok: (x) => `${x} tokens`, ses: (x) => `${x}`,
      barText: (gib, gb) => `${gib} GiB (= ${gb} GB)`,
      sPtK: 'KV per token', sPtF: (cell) => `<b>= 12 layers × ${cell} bytes</b><br>per layer: 2 KV heads × 256 dims × both K and V`,
      sOneK: 'KV of one conversation', sOneF: (ctx, pt, b, gb) => `<b>= ${ctx} × ${pt} = ${b} bytes ≈ ${gb} GB</b><br>GB divides by 10⁹, GiB by 2³⁰`,
      sVramK: 'VRAM total (the running conversation)', sVramF: (cells) => `<b>= ${cells} resident KV cells + 112.2 MiB GDN state</b><br>weights, expert cache and scratch buffers not counted`,
      sRamK: 'RAM total', sRamF: '<b>= master copy of streamed KV + parked conversations</b><br>each parked conversation = its KV + GDN state',
      gibOf: gib => `${gib} GiB`,
      tChange: (ctx, pt, b, gb, gib) => `<span class="c">${ctx} cells</span> × ${pt} B = ${b} B = <span class="y">${gb} GB</span> = <span class="w">${gib} GiB</span>`,
      tStream: (on) => on ? '<span class="m">Streaming on</span>: from 64K, VRAM keeps only the 32,768 cells of pages in use; the full history is in RAM' : '<span class="m">Streaming off</span>: the whole KV stays in VRAM',
      tFmt: (name, cell, scaled) => `<span class="c">Format ${name}</span>: ${cell} bytes per cell per layer${scaled ? ' (scale factors included)' : ' (no scale factors needed)'}`,
      vBase: (gb, gib, pct) => `The same KV: <b>${gb} GB</b>, that is, <b>${gib} GiB</b>. The GiB number is about ${pct}% smaller, because 1 GiB is 7.4% more than 1 GB.`,
      vStream: '<br>Streaming is active: VRAM holds only 32,768 cells, and the full history is in RAM, not deleted.',
      vShort: '<br>The context is under 64K, so streaming does not start: the whole KV is in VRAM.',
      vBlocked: '<br><b>Note:</b> K8V4 does not use KV streaming (the upstream docs say so), so the whole KV stays in VRAM here. The two "save memory" switches do not stack.',
      vPark: (n, gib) => `<br>The ${n} other parked conversation(s) take ${gib} GiB of RAM; the upstream example caps the parking cache at 8 GiB.`,
      try: [
        'Pick <b>FP16</b> and 32K: one conversation\'s KV is 805,306,368 bytes, that is, 805.3 MB or 768 MiB. A comment in Strata\'s source calls it "805 MiB", with the wrong unit.',
        'Drag the context from 32K to 128K: the KV grows exactly 4 times. Then turn on streaming: the VRAM bar shrinks at once and the RAM bar grows. No history is lost; it only moved.',
        'Pick <b>K8V4</b> and drag to 256K: the streaming switch does nothing. You cannot have both "23% less than INT8" and "keep only 32K in VRAM".',
      ],

      pCode: 'KV_PAGING', pTitle: 'Page table and paging', pTag: 'Teaching estimate · 12 blocks, 4 VRAM slots',
      pIntro: 'The history is cut into blocks of 4 tokens, and <b>one full copy</b> always stays in RAM; VRAM has only 4 slots. Each step, attention selects a few blocks. Press <b>Step</b> to watch the page table swap them into VRAM.',
      pLgHost: 'Block in RAM (full history)', pLgSlot: 'Block living in a VRAM slot', pLgNew: 'Just swapped in this step', pLgRef: 'Reference bit = 1 (used recently)',
      pSteps: ['Select blocks', 'Check page table', 'CLOCK picks slot', 'Copy from RAM', 'Attention reads'],
      pStage: 'The 12 blocks in RAM, the page table and the 4 VRAM slots', hostTitle: 'RAM: full history (4 tokens per block)', slotTitle: 'VRAM: 4 slots', ptRow: 'Page table',
      slotBlock: (b) => b < 0 ? 'empty' : `Block ${b}`, refBit: (r) => `ref ${r}`, hand: '▲ hand',
      bStep: '▶ Step', bReset: 'Reset',
      pReady: '<span class="c">$</span> ready. Press [ ▶ Step ]; there are 8 queries in all',
      sHitK: 'Hits / misses', sHitF: '<b>hit = block already in a VRAM slot</b><br>miss = must copy it from RAM',
      sRateK: 'Hit rate', sRateF: '<b>= hits ÷ (hits + misses)</b>',
      sBytesK: 'Bytes copied over PCIe', sBytesF: '<b>= misses × 4,224 bytes</b><br>one INT8 block (4 cells, 2 heads, K and V)',
      q0: (n, ids) => `<span class="c">[query ${n}]</span> attention selects block(s) ${String(ids).split('\u3001').join(', ')} this step`,
      q1: (hits, miss) => `<span class="m">Check page table</span>: ${hits.length ? 'block(s) ' + hits.join(', ') + ' already in VRAM (hit; reference bit set to 1)' : 'no hits'}; ${miss.length ? 'block(s) ' + miss.join(', ') + ' absent (— in the page table)' : 'all hits'}`,
      q2none: '<span class="y">CLOCK</span>: no block needs to be evicted',
      q2: (b, slot, ev) => ev >= 0 ? `<span class="y">CLOCK</span>: the hand sweeps the slots, clearing each reference bit of 1 and letting that slot off once; block ${b} goes into slot ${slot}, evicting block ${ev} (it still has a full copy in RAM)` : `<span class="y">CLOCK</span>: slot ${slot} is still empty, so block ${b} moves straight in`,
      q3: (n, bytes) => n ? `<span class="w">Copy</span>: ${n} block(s) × 4,224 B = ${bytes} B moved from RAM over PCIe into VRAM` : '<span class="w">Copy</span>: nothing to move this step',
      q4: '<span class="c">→</span> attention reads every selected block through the page table, and gets the same values as if everything sat in VRAM',
      pVerdict: (rate, bytes) => `① The hit rate over 8 queries is <b>${rate}%</b>, with ${bytes} bytes moved in total.<br>② Evicted blocks do not vanish: RAM always keeps a full copy, and they are moved back the next time they are selected. VRAM decides only "how fast", not "how correct".<br>③ Strata's writes follow the same rule: a new token is always written to the copy in RAM, and also to a slot only when its block happens to live in VRAM, so a VRAM slot is never stale.`,
      pTry: [
        'Keep pressing <b>Step</b> through queries 1–2: blocks 0–3 move into the 4 slots one by one, and the page table changes from "—" to slot numbers.',
        'Watch the CLOCK step of query 3: slots whose reference bit is 1 are cleared and let off first, and only after the hand goes round does it pick a block to evict. That is the "second chance".',
        'Finish all 8 and look at the hit rate: the last query asks for blocks 1–3 again, long since evicted, so they must be moved again. When the working set is bigger than the slots, paging keeps happening.',
      ],
    },
    ar: {
      code: 'KV_BUDGET', title: 'حاسبة ميزانية KV', tag: 'تقدير تعليمي · KV الرئيسية وحالة GDN فقط',
      intro: 'اختر طول السياق وصيغة KV وعدد المحادثات التي تريد الاحتفاظ بها، وراقب كيف تتغير البايتات. خادم Strata يشغّل افتراضيًا محادثة <b>واحدة</b> في كل مرة (فتحات parallel الاختيارية غير محسوبة هنا)؛ أما المحادثات الأخرى فيمكن «إيقاف» حالتها مؤقتًا في RAM. لاحظ كم يختلف العدد نفسه من البايتات حين يُكتب بوحدة <b>GB</b> وبوحدة <b>GiB</b>.',
      lgVkv: 'KV في VRAM', lgGdn: 'حالة GDN التكرارية (حجم ثابت)', lgRkv: 'النسخة المرجعية لـ KV في RAM (بث)', lgPark: 'محادثات أخرى موقوفة في RAM',
      stageLabel: 'أشرطة استخدام VRAM و RAM', vram: 'VRAM', ram: 'RAM',
      ctxLabel: 'طول السياق', sesLabel: 'عدد المحادثات المحفوظة',
      fmtNames: { f16: 'FP16', int8: 'INT8', k8v4: 'K8V4', q4: 'Q4_0' },
      bStream: (on) => on ? 'بث KV: مفعّل' : 'بث KV: معطّل',
      tok: (x) => `${x} رمز`, ses: (x) => `${x}`,
      barText: (gib, gb) => `${gib} GiB (= ${gb} GB)`,
      sPtK: 'KV لكل رمز', sPtF: (cell) => `<b>= 12 طبقة × ${cell} بايت</b><br>لكل طبقة: رأسا KV × 256 بُعدًا × نسختان (K و V)`,
      sOneK: 'KV لمحادثة واحدة', sOneF: (ctx, pt, b, gb) => `<b>= ${ctx} × ${pt} = ${b} بايت ≈ ${gb} GB</b><br>GB بالقسمة على 10⁹، و GiB بالقسمة على 2³⁰`,
      sVramK: 'مجموع VRAM (المحادثة الجارية)', sVramF: (cells) => `<b>= ${cells} خلية KV مقيمة + حالة GDN بحجم 112.2 MiB</b><br>لا تشمل الأوزان وذاكرة الخبراء المؤقتة ومخازن العمل`,
      sRamK: 'مجموع RAM', sRamF: '<b>= النسخة المرجعية لـ KV المبثوثة + المحادثات الموقوفة</b><br>كل محادثة موقوفة = KV الخاصة بها + حالة GDN',
      gibOf: gib => `${gib} GiB`,
      tChange: (ctx, pt, b, gb, gib) => `<span class="c">${ctx} خلية</span> × ${pt} B = ${b} B = <span class="y">${gb} GB</span> = <span class="w">${gib} GiB</span>`,
      tStream: (on) => on ? '<span class="m">البث مفعّل</span>: ابتداءً من 64K لا تحتفظ VRAM إلا بـ 32,768 خلية من الصفحات الشائعة، والتاريخ الكامل في RAM' : '<span class="m">البث معطّل</span>: كل KV تبقى في VRAM',
      tFmt: (name, cell, scaled) => `<span class="c">الصيغة ${name}</span>: ${cell} بايت لكل خلية في كل طبقة${scaled ? ' (مع معاملات القياس)' : ' (لا حاجة إلى معاملات قياس)'}`,
      vBase: (gb, gib, pct) => `KV نفسها: <b>${gb} GB</b>، أي <b>${gib} GiB</b>. رقم GiB أصغر بنحو ${pct}%، لأن 1 GiB أكبر من 1 GB بنسبة 7.4%.`,
      vStream: '<br>البث فعّال: لا تضع VRAM إلا 32,768 خلية، والتاريخ الكامل في RAM، ولم يُحذف.',
      vShort: '<br>السياق أقل من 64K، فلا يبدأ البث: كل KV في VRAM.',
      vBlocked: '<br><b>تنبيه:</b> لا تعمل K8V4 مع بث KV (كما تنص وثائق المصدر الأصلي)، لذلك تبقى كل KV هنا في VRAM. مفتاحا «توفير الذاكرة» لا يجتمعان.',
      vPark: (n, gib) => `<br>المحادثات الموقوفة الأخرى (${n}) تأخذ ${gib} GiB من RAM؛ وفي مثال المصدر الأصلي الحد الأقصى للذاكرة المؤقتة للإيقاف 8 GiB.`,
      try: [
        'اختر <b>FP16</b> و 32K: KV لمحادثة واحدة هي 805,306,368 بايت، أي 805.3 MB أو 768 MiB. وقد كتب تعليق في شيفرة Strata «805 MiB»، فجاءت الوحدة خاطئة.',
        'اسحب السياق من 32K إلى 128K: تتضاعف KV أربع مرات بالضبط. ثم فعّل البث: يقصر شريط VRAM فورًا ويطول شريط RAM. لم يضِع شيء من التاريخ، بل انتقل فقط.',
        'اختر <b>K8V4</b> ثم اسحب إلى 256K: مفتاح البث لا يؤثر. فلا يمكنك أن تجمع «أقل من INT8 بنسبة 23%» مع «الاحتفاظ بـ 32K فقط في VRAM».',
      ],

      pCode: 'KV_PAGING', pTitle: 'جدول الصفحات والتبديل', pTag: 'تقدير تعليمي · 12 كتلة، 4 فتحات في VRAM',
      pIntro: 'يُقطَّع التاريخ إلى كتل من 4 رموز، وتبقى <b>نسخة كاملة</b> منه دائمًا في RAM؛ وفي VRAM 4 فتحات فقط. في كل خطوة يختار الانتباه بضع كتل. اضغط <b>خطوة</b> لترى كيف ينقلها جدول الصفحات إلى VRAM.',
      pLgHost: 'كتلة في RAM (التاريخ الكامل)', pLgSlot: 'كتلة مقيمة في فتحة VRAM', pLgNew: 'نُقلت للتو في هذه الخطوة', pLgRef: 'بِت المرجع = 1 (استُخدمت حديثًا)',
      pSteps: ['اختيار الكتل', 'فحص جدول الصفحات', 'CLOCK يختار فتحة', 'النسخ من RAM', 'قراءة الانتباه'],
      pStage: 'الكتل الاثنتا عشرة في RAM، وجدول الصفحات، وفتحات VRAM الأربع', hostTitle: 'RAM: التاريخ الكامل (كل كتلة 4 رموز)', slotTitle: 'VRAM: 4 فتحات', ptRow: 'جدول الصفحات',
      slotBlock: (b) => b < 0 ? 'فارغة' : `كتلة ${b}`, refBit: (r) => `مرجع ${r}`, hand: '▲ المؤشر',
      bStep: '▶ خطوة', bReset: 'إعادة ضبط',
      pReady: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ]؛ هناك 8 استعلامات في المجموع',
      sHitK: 'إصابات / إخفاقات', sHitF: '<b>إصابة = الكتلة موجودة في فتحة VRAM</b><br>إخفاق = يجب نسخها من RAM',
      sRateK: 'نسبة الإصابة', sRateF: '<b>= الإصابات ÷ (الإصابات + الإخفاقات)</b>',
      sBytesK: 'البايتات المنسوخة عبر PCIe', sBytesF: '<b>= الإخفاقات × 4,224 بايت</b><br>كتلة INT8 واحدة (4 خلايا، رأسان، K و V)',
      q0: (n, ids) => `<span class="c">[الاستعلام ${n}]</span> اختار الانتباه في هذه الخطوة الكتل: ${String(ids).split('、').join('، ')}`,
      q1: (hits, miss) => `<span class="m">فحص جدول الصفحات</span>: ${hits.length ? 'الكتل ' + hits.join('، ') + ' موجودة في VRAM (إصابة؛ بِت المرجع يصبح 1)' : 'لا إصابات'}؛ ${miss.length ? 'الكتل ' + miss.join('، ') + ' غير موجودة (— في جدول الصفحات)' : 'كلها إصابات'}`,
      q2none: '<span class="y">CLOCK</span>: لا حاجة إلى إخراج أي كتلة',
      q2: (b, slot, ev) => ev >= 0 ? `<span class="y">CLOCK</span>: يمر المؤشر على الفتحات، فيصفّر كل بِت مرجع قيمته 1 ويُمهل تلك الفتحة مرة واحدة؛ تدخل الكتلة ${b} الفتحة ${slot} وتُخرج الكتلة ${ev} (ولها نسخة كاملة في RAM)` : `<span class="y">CLOCK</span>: الفتحة ${slot} ما زالت فارغة، فتدخلها الكتلة ${b} مباشرة`,
      q3: (n, bytes) => n ? `<span class="w">نسخ</span>: ${n} كتلة × 4,224 B = ${bytes} B تنتقل من RAM عبر PCIe إلى VRAM` : '<span class="w">نسخ</span>: لا شيء ينتقل في هذه الخطوة',
      q4: '<span class="c">→</span> يقرأ الانتباه كل الكتل المختارة عبر جدول الصفحات، فيحصل على القيم نفسها لو كان كل شيء في VRAM',
      pVerdict: (rate, bytes) => `① نسبة الإصابة في 8 استعلامات هي <b>${rate}%</b>، وانتقل ما مجموعه ${bytes} بايت.<br>② الكتل المُخرَجة لا تختفي: في RAM نسخة كاملة دائمًا، وتُعاد حين تُختار في المرة التالية. VRAM تحدد «هل هو سريع» فقط، لا «هل هو صحيح».<br>③ والكتابة في Strata تلتزم بالقاعدة نفسها: الرمز الجديد يُكتب دائمًا في نسخة RAM، ويُكتب في فتحة أيضًا فقط إذا كانت كتلته مقيمة في VRAM حينها، فلا تصبح فتحة VRAM قديمة أبدًا.`,
      pTry: [
        'اضغط <b>خطوة</b> متتابعًا خلال الاستعلامين 1-2: تدخل الكتل 0-3 الفتحات الأربع واحدة بعد أخرى، ويتحول جدول الصفحات من «—» إلى أرقام الفتحات.',
        'راقب خطوة CLOCK في الاستعلام 3: الفتحات التي بِت المرجع فيها 1 تُصفَّر وتُمهَل أولًا، ولا يختار المؤشر كتلة لإخراجها إلا بعد أن يدور دورة كاملة؛ وهذه هي «الفرصة الثانية».',
        'أنهِ الاستعلامات الثمانية وانظر إلى نسبة الإصابة: يطلب الاستعلام الأخير الكتل 1-3 من جديد وقد أُخرجت من قبل، فلا بد من نقلها مرة أخرى. وحين تكون مجموعة العمل أكبر من الفتحات يتكرر التبديل.',
      ],
    },
    ko: {
      code: 'KV_BUDGET', title: 'KV 예산 계산기', tag: '교육용 추정 · 주 KV와 GDN 상태만 계산',
      intro: '컨텍스트 길이, KV 형식, 보존할 대화 수를 골라서 바이트 수가 어떻게 변하는지 보세요. Strata의 서버는 기본적으로 한 번에 대화를 <b>하나</b>만 실행해요(선택 사항인 parallel 슬롯은 여기서 계산하지 않아요). 나머지 대화는 상태를 RAM에 "파킹"해 둘 수 있어요. 같은 바이트 수를 <b>GB</b>와 <b>GiB</b>로 쓸 때 얼마나 다른지 살펴보세요.',
      lgVkv: 'VRAM 속 KV', lgGdn: 'GDN 재귀 상태(고정 크기)', lgRkv: 'RAM 속 KV 기준 사본(스트리밍)', lgPark: 'RAM에 파킹한 다른 대화',
      stageLabel: 'VRAM과 RAM 사용량 막대', vram: 'VRAM', ram: 'RAM',
      ctxLabel: '컨텍스트 길이', sesLabel: '보존할 대화 수',
      fmtNames: { f16: 'FP16', int8: 'INT8', k8v4: 'K8V4', q4: 'Q4_0' },
      bStream: (on) => on ? 'KV 스트리밍: 켬' : 'KV 스트리밍: 끔',
      tok: (x) => `${x} token`, ses: (x) => `${x}개`,
      barText: (gib, gb) => `${gib} GiB (= ${gb} GB)`,
      sPtK: '토큰당 KV', sPtF: (cell) => `<b>= 12개 층 × ${cell}바이트</b><br>층마다 KV 헤드 2개 × 256차원 × K, V 두 벌`,
      sOneK: '대화 하나의 KV', sOneF: (ctx, pt, b, gb) => `<b>= ${ctx} × ${pt} = ${b}바이트 ≈ ${gb} GB</b><br>GB는 10⁹으로, GiB는 2³⁰으로 나눠요`,
      sVramK: 'VRAM 합계(실행 중인 대화)', sVramF: (cells) => `<b>= KV 상주 ${cells}칸 + GDN 상태 112.2 MiB</b><br>가중치, 전문가 캐시, 임시 버퍼는 빼요`,
      sRamK: 'RAM 합계', sRamF: '<b>= 스트리밍 KV 기준 사본 + 파킹한 대화</b><br>파킹한 대화 하나 = 그 대화의 KV + GDN 상태',
      gibOf: gib => `${gib} GiB`,
      tChange: (ctx, pt, b, gb, gib) => `<span class="c">${ctx}칸</span> × ${pt} B = ${b} B = <span class="y">${gb} GB</span> = <span class="w">${gib} GiB</span>`,
      tStream: (on) => on ? '<span class="m">스트리밍 켬</span>: 64K부터 VRAM에는 자주 쓰는 페이지 32,768칸만 두고, 완전한 히스토리는 RAM에 둬요' : '<span class="m">스트리밍 끔</span>: KV 전체를 VRAM에 둬요',
      tFmt: (name, cell, scaled) => `<span class="c">형식 ${name}</span>: 층마다 칸 하나에 ${cell}바이트${scaled ? '(스케일 포함)' : '(스케일 불필요)'}`,
      vBase: (gb, gib, pct) => `같은 KV인데 <b>${gb} GB</b>이고, <b>${gib} GiB</b>이기도 해요. GiB 숫자가 약 ${pct}% 작은 이유는 1 GiB가 1 GB보다 7.4% 크기 때문이에요.`,
      vStream: '<br>스트리밍이 적용됐어요. VRAM에는 32,768칸만 두고, 완전한 히스토리는 RAM에 있어서 지워지지 않아요.',
      vShort: '<br>컨텍스트가 64K 미만이라 스트리밍이 시작되지 않아요. KV 전체가 VRAM에 있어요.',
      vBlocked: '<br><b>주의:</b> K8V4는 KV 스트리밍을 쓰지 않아요(업스트림 문서에 적혀 있어요). 그래서 여기서는 KV 전체가 VRAM에 남아요. "메모리를 아끼는" 스위치 두 개는 겹칠 수 없어요.',
      vPark: (n, gib) => `<br>이 밖에 파킹한 대화 ${n}개가 RAM ${gib} GiB를 차지해요. 업스트림 예시에서 파킹 캐시의 상한은 8 GiB예요.`,
      try: [
        '<b>FP16</b>과 32K를 고르세요. 대화 하나의 KV는 805,306,368바이트, 즉 805.3 MB이고 768 MiB예요. Strata 소스 주석은 이걸 "805 MiB"라고 적어서 단위가 틀렸어요.',
        '컨텍스트를 32K에서 128K로 끌어 보세요. KV가 정확히 4배가 돼요. 스트리밍을 켜면 VRAM 막대는 바로 짧아지고 RAM 막대는 길어져요. 히스토리는 줄지 않고 자리만 옮겨요.',
        '<b>K8V4</b>를 고르고 256K까지 끌어 보세요. 스트리밍 스위치가 동작하지 않아요. "INT8보다 23% 적다"와 "VRAM에는 32K만 둔다"는 두 가지 이점을 동시에 얻을 수는 없어요.',
      ],

      pCode: 'KV_PAGING', pTitle: '페이지 테이블과 페이지 교체', pTag: '교육용 추정 · 블록 12개, VRAM 슬롯 4개',
      pIntro: '히스토리를 토큰 4개씩 한 블록으로 자르고, <b>완전한 한 벌</b>은 계속 RAM에 둬요. VRAM에는 슬롯이 4개뿐이에요. 단계마다 어텐션이 블록 몇 개를 고르는데, <b>한 단계씩</b> 눌러서 페이지 테이블이 그 블록들을 VRAM으로 어떻게 바꿔 들이는지 보세요.',
      pLgHost: 'RAM 속 블록(완전한 히스토리)', pLgSlot: 'VRAM 슬롯에 들어 있는 블록', pLgNew: '이번 단계에서 방금 들어온 블록', pLgRef: '참조 비트 = 1(최근에 썼음)',
      pSteps: ['블록 선택', '페이지 테이블 조회', 'CLOCK으로 슬롯 선택', 'RAM에서 복사', '어텐션 읽기'],
      pStage: 'RAM 속 블록 12개, 페이지 테이블, VRAM 슬롯 4개', hostTitle: 'RAM: 완전한 히스토리(블록당 토큰 4개)', slotTitle: 'VRAM: 슬롯 4개', ptRow: '페이지 테이블',
      slotBlock: (b) => b < 0 ? '비어 있음' : `블록 ${b}`, refBit: (r) => `참조 ${r}`, hand: '▲ 포인터',
      bStep: '▶ 한 단계', bReset: '초기화',
      pReady: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 누르세요. 쿼리는 모두 8번이에요',
      sHitK: '히트 / 미스', sHitF: '<b>히트 = 블록이 이미 VRAM 슬롯에 있음</b><br>미스 = RAM에서 복사해야 함',
      sRateK: '히트율', sRateF: '<b>= 히트 ÷ (히트 + 미스)</b>',
      sBytesK: 'PCIe로 복사한 바이트', sBytesF: '<b>= 미스 수 × 4,224바이트</b><br>INT8에서 블록 하나(4칸, 헤드 2개, K와 V)',
      q0: (n, ids) => `<span class="c">[쿼리 ${n}]</span> 어텐션이 이번 단계에서 고른 블록: ${ids}`,
      q1: (hits, miss) => `<span class="m">페이지 테이블 조회</span>: ${hits.length ? '블록 ' + hits.join(', ') + ' 이미 VRAM에 있음(히트, 참조 비트를 1로)' : '히트 없음'}. ${miss.length ? '블록 ' + miss.join(', ') + ' 없음(페이지 테이블에 —)' : '전부 히트'}`,
      q2none: '<span class="y">CLOCK</span>: 내보낼 블록이 없어요',
      q2: (b, slot, ev) => ev >= 0 ? `<span class="y">CLOCK</span>: 포인터가 슬롯을 훑어요. 참조 비트가 1인 슬롯은 0으로 바꾸고 한 번 봐줘요. 블록 ${b}를 슬롯 ${slot}에 넣고, 블록 ${ev}를 내보내요(RAM에 완전한 한 벌이 남아 있어요)` : `<span class="y">CLOCK</span>: 슬롯 ${slot}이 비어 있어서 블록 ${b}가 바로 들어가요`,
      q3: (n, bytes) => n ? `<span class="w">복사</span>: ${n}블록 × 4,224 B = ${bytes} B를 RAM에서 PCIe로 VRAM에 옮겨요` : '<span class="w">복사</span>: 이번 단계는 옮길 게 없어요',
      q4: '<span class="c">→</span> 어텐션이 페이지 테이블을 거쳐 고른 블록을 전부 읽어요. 읽은 값은 전부 VRAM에 둘 때와 같아요',
      pVerdict: (rate, bytes) => `① 쿼리 8번의 히트율은 <b>${rate}%</b>이고, 모두 ${bytes}바이트를 옮겼어요.<br>② 내보낸 블록은 사라지지 않아요. RAM에 완전한 한 벌이 계속 있고, 다음에 고르면 다시 가져와요. VRAM은 "빠른가"만 정하고, "맞는가"는 정하지 않아요.<br>③ Strata의 쓰기도 이 원칙을 지켜요. 새 토큰은 항상 RAM의 한 벌에 쓰고, 블록이 마침 VRAM에 있을 때만 덤으로 한 번 더 써요. 그래서 VRAM 슬롯은 절대 낡지 않아요.`,
      pTry: [
        '<b>한 단계</b>를 눌러 쿼리 1–2번을 진행해 보세요. 블록 0–3이 차례로 슬롯 4개에 들어가고, 페이지 테이블이 "—"에서 슬롯 번호로 바뀌어요.',
        '3번째 쿼리의 CLOCK 단계를 눈여겨보세요. 참조 비트가 1인 슬롯은 먼저 0으로 바뀌며 한 번 봐주고, 포인터가 한 바퀴 돈 뒤에야 내보낼 블록이 정해져요. 이게 "두 번째 기회"예요.',
        '8번을 끝까지 진행하고 히트율을 보세요. 마지막 쿼리는 블록 1–3을 다시 찾지만, 이 블록들은 이미 밀려나서 다시 옮겨야 해요. 워킹 세트가 슬롯보다 크면 페이지 교체가 계속 반복돼요.',
      ],
    },
    ja: {
      code: 'KV_BUDGET', title: 'KV 予算計算機', tag: '教育用の試算 · メイン KV と GDN 状態のみ',
      intro: 'コンテキスト長、KV の形式、残しておく会話の数を選んで、バイト数の変化を見ましょう。Strata のサーバーは既定では同時に<b>1 つ</b>の会話しか実行しません（オプションの parallel スロットはここでは数えません）。ほかの会話は、状態を RAM に「駐車」できます。同じバイト数を <b>GB</b> と <b>GiB</b> で書くと、どれだけ差が出るかにも注目してください。',
      lgVkv: 'VRAM 上の KV', lgGdn: 'GDN の再帰状態（固定サイズ）', lgRkv: 'RAM 上の KV の正本（ストリーミング）', lgPark: 'RAM に駐車した他の会話',
      stageLabel: 'VRAM と RAM の使用量バー', vram: 'VRAM', ram: 'RAM',
      ctxLabel: 'コンテキスト長', sesLabel: '残す会話の数',
      fmtNames: { f16: 'FP16', int8: 'INT8', k8v4: 'K8V4', q4: 'Q4_0' },
      bStream: (on) => on ? 'KV ストリーミング：オン' : 'KV ストリーミング：オフ',
      tok: (x) => `${x} トークン`, ses: (x) => `${x} 件`,
      barText: (gib, gb) => `${gib} GiB（= ${gb} GB）`,
      sPtK: '1 トークンあたりの KV', sPtF: (cell) => `<b>= 12 層 × ${cell} バイト</b><br>1 層あたり：KV ヘッド 2 つ × 256 次元 × K と V の 2 つ`,
      sOneK: '会話 1 件の KV', sOneF: (ctx, pt, b, gb) => `<b>= ${ctx} × ${pt} = ${b} バイト ≈ ${gb} GB</b><br>GB は 10⁹ で割り、GiB は 2³⁰ で割る`,
      sVramK: 'VRAM 合計（実行中の会話）', sVramF: (cells) => `<b>= KV 常駐 ${cells} マス + GDN 状態 112.2 MiB</b><br>重み、エキスパートキャッシュ、一時バッファは含まない`,
      sRamK: 'RAM 合計', sRamF: '<b>= ストリーミング KV の正本 + 駐車した会話</b><br>駐車した会話 1 件 = その KV + GDN 状態',
      gibOf: gib => `${gib} GiB`,
      tChange: (ctx, pt, b, gb, gib) => `<span class="c">${ctx} マス</span> × ${pt} B = ${b} B = <span class="y">${gb} GB</span> = <span class="w">${gib} GiB</span>`,
      tStream: (on) => on ? '<span class="m">ストリーミング オン</span>：64K 以上では、VRAM には使用中のページ 32,768 マス分だけを置き、完全な履歴は RAM に置く' : '<span class="m">ストリーミング オフ</span>：KV 全体を VRAM に置く',
      tFmt: (name, cell, scaled) => `<span class="c">形式 ${name}</span>：1 層・1 マスあたり ${cell} バイト${scaled ? '（スケールを含む）' : '（スケールは不要）'}`,
      vBase: (gb, gib, pct) => `同じ KV：<b>${gb} GB</b>、つまり <b>${gib} GiB</b>。1 GiB は 1 GB より 7.4% 大きいので、GiB の数字は約 ${pct}% 小さくなります。`,
      vStream: '<br>ストリーミングが有効：VRAM には 32,768 マスだけを置き、完全な履歴は RAM にあります。削除はされていません。',
      vShort: '<br>コンテキストが 64K 未満なので、ストリーミングは始まりません。KV 全体が VRAM にあります。',
      vBlocked: '<br><b>注意：</b>K8V4 は KV ストリーミングを使いません（上流のドキュメントに明記）。そのため、ここでは KV 全体が VRAM に残ります。2 つの「メモリ節約」スイッチは重ねられません。',
      vPark: (n, gib) => `<br>ほかに駐車した ${n} 件の会話が RAM を ${gib} GiB 使います。上流の例では、駐車キャッシュの上限は 8 GiB です。`,
      try: [
        '<b>FP16</b> と 32K を選びます。会話 1 件の KV は 805,306,368 バイト、つまり 805.3 MB または 768 MiB です。Strata のソースのコメントは「805 MiB」と書いていて、単位が間違っています。',
        'コンテキストを 32K から 128K に動かします。KV はちょうど 4 倍になります。次にストリーミングをオンにすると、VRAM のバーがすぐ短くなり、RAM のバーが長くなります。履歴は減っていません。置き場所が変わっただけです。',
        '<b>K8V4</b> を選んで 256K まで動かします。ストリーミングのスイッチは効きません。「INT8 より 23% 少ない」と「VRAM には 32K だけ置く」の両方は同時に得られません。',
      ],

      pCode: 'KV_PAGING', pTitle: 'ページテーブルとページング', pTag: '教育用の試算 · 12 ブロック、VRAM スロット 4 つ',
      pIntro: '履歴を 4 トークンごとのブロックに切ります。<b>完全なコピー</b>は常に RAM にあり、VRAM のスロットは 4 つだけです。毎ステップ、アテンションがいくつかのブロックを選びます。<b>ステップ</b>を押して、ページテーブルがそれを VRAM に入れ替える様子を見ましょう。',
      pLgHost: 'RAM 上のブロック（完全な履歴）', pLgSlot: 'VRAM スロットにいるブロック', pLgNew: 'このステップで入れ替わったもの', pLgRef: '参照ビット = 1（最近使った）',
      pSteps: ['ブロック選択', 'ページテーブル参照', 'CLOCK がスロット選択', 'RAM からコピー', 'アテンション読み出し'],
      pStage: 'RAM 上の 12 ブロック、ページテーブル、VRAM スロット 4 つ', hostTitle: 'RAM：完全な履歴（1 ブロック 4 トークン）', slotTitle: 'VRAM：スロット 4 つ', ptRow: 'ページテーブル',
      slotBlock: (b) => b < 0 ? '空' : `ブロック ${b}`, refBit: (r) => `参照 ${r}`, hand: '▲ 針',
      bStep: '▶ ステップ', bReset: 'リセット',
      pReady: '<span class="c">$</span> ready. [ ▶ ステップ ] を押してください。クエリは全部で 8 回です',
      sHitK: 'ヒット / ミス', sHitF: '<b>ヒット = ブロックがすでに VRAM スロットにある</b><br>ミス = RAM からコピーが必要',
      sRateK: 'ヒット率', sRateF: '<b>= ヒット ÷ (ヒット + ミス)</b>',
      sBytesK: 'PCIe 経由でコピーしたバイト数', sBytesF: '<b>= ミス数 × 4,224 バイト</b><br>INT8 の 1 ブロック（4 マス、2 ヘッド、K と V）',
      q0: (n, ids) => `<span class="c">[クエリ ${n}]</span> このステップでアテンションがブロック ${ids} を選択`,
      q1: (hits, miss) => `<span class="m">ページテーブル参照</span>：${hits.length ? 'ブロック ' + hits.join('、') + ' はすでに VRAM にある（ヒット、参照ビットを 1 に設定）' : 'ヒットなし'}；${miss.length ? 'ブロック ' + miss.join('、') + ' は不在（ページテーブルでは —）' : 'すべてヒット'}`,
      q2none: '<span class="y">CLOCK</span>：追い出すブロックはなし',
      q2: (b, slot, ev) => ev >= 0 ? `<span class="y">CLOCK</span>：針がスロットを順に回り、参照ビットが 1 のものは 0 にして一度見逃す。ブロック ${b} をスロット ${slot} に入れ、ブロック ${ev} を追い出す（RAM に完全なコピーが残っている）` : `<span class="y">CLOCK</span>：スロット ${slot} はまだ空きなので、ブロック ${b} がそのまま入る`,
      q3: (n, bytes) => n ? `<span class="w">コピー</span>：${n} ブロック × 4,224 B = ${bytes} B を RAM から PCIe 経由で VRAM へ移す` : '<span class="w">コピー</span>：このステップは移すものなし',
      q4: '<span class="c">→</span> アテンションはページテーブル経由で選ばれた全ブロックを読み、全部 VRAM に置いた場合と同じ値を得る',
      pVerdict: (rate, bytes) => `① 8 回のクエリのヒット率は <b>${rate}%</b>、移したバイト数は合計 ${bytes} です。<br>② 追い出されたブロックは消えません。RAM に常に完全なコピーがあり、次に選ばれたときに戻します。VRAM が決めるのは「速いか」だけで、「正しいか」ではありません。<br>③ Strata の書き込みも同じ規則です。新しいトークンは常に RAM のコピーに書き、そのブロックがたまたま VRAM にあるときだけ、スロットにも書きます。だから VRAM スロットが古くなることはありません。`,
      pTry: [
        '<b>ステップ</b>を連打してクエリ 1〜2 を進めます。ブロック 0〜3 が 4 つのスロットに順に入り、ページテーブルが「—」からスロット番号に変わります。',
        'クエリ 3 の CLOCK の段階に注目します。参照ビットが 1 のスロットは、まず 0 にされて見逃されます。針が一周してから、追い出すブロックが決まります。これが「セカンドチャンス」です。',
        '8 回すべて進めて、ヒット率を見ます。最後のクエリはブロック 1〜3 をまた選びますが、もう追い出されているので、移し直しです。ワーキングセットがスロットより大きいと、ページングは何度も起こります。',
      ],
    },
    es: {
      code: 'KV_BUDGET', title: 'Calculadora de presupuesto de KV', tag: 'Estimación didáctica · solo la KV principal y el estado GDN',
      intro: 'Elige una longitud de contexto, un formato de KV y cuántas conversaciones conservar, y mira cómo cambian los bytes. El servidor de Strata ejecuta por defecto solo <b>una</b> conversación a la vez (los slots paralelos opcionales no se cuentan aquí); las demás pueden «aparcar» su estado en la RAM. Fíjate en lo distinto que sale el mismo número de bytes escrito en <b>GB</b> y en <b>GiB</b>.',
      lgVkv: 'KV en la VRAM', lgGdn: 'Estado recurrente GDN (tamaño fijo)', lgRkv: 'Copia maestra de la KV en la RAM (streaming)', lgPark: 'Otras conversaciones aparcadas en la RAM',
      stageLabel: 'Barras de uso de la VRAM y la RAM', vram: 'VRAM', ram: 'RAM',
      ctxLabel: 'Longitud del contexto', sesLabel: 'Conversaciones a conservar',
      fmtNames: { f16: 'FP16', int8: 'INT8', k8v4: 'K8V4', q4: 'Q4_0' },
      bStream: (on) => on ? 'Streaming de KV: activado' : 'Streaming de KV: desactivado',
      tok: (x) => `${x} tokens`, ses: (x) => `${x}`,
      barText: (gib, gb) => `${gib} GiB (= ${gb} GB)`,
      sPtK: 'KV por token', sPtF: (cell) => `<b>= 12 capas × ${cell} bytes</b><br>por capa: 2 cabezas KV × 256 dimensiones × K y V`,
      sOneK: 'KV de una conversación', sOneF: (ctx, pt, b, gb) => `<b>= ${ctx} × ${pt} = ${b} bytes ≈ ${gb} GB</b><br>GB divide entre 10⁹, GiB entre 2³⁰`,
      sVramK: 'VRAM total (la conversación en ejecución)', sVramF: (cells) => `<b>= ${cells} celdas de KV residentes + 112,2 MiB de estado GDN</b><br>no se cuentan los pesos, la caché de expertos ni los búferes scratch`,
      sRamK: 'RAM total', sRamF: '<b>= copia maestra de la KV en streaming + conversaciones aparcadas</b><br>cada conversación aparcada = su KV + su estado GDN',
      gibOf: gib => `${gib} GiB`,
      tChange: (ctx, pt, b, gb, gib) => `<span class="c">${ctx} celdas</span> × ${pt} B = ${b} B = <span class="y">${gb} GB</span> = <span class="w">${gib} GiB</span>`,
      tStream: (on) => on ? '<span class="m">Streaming activado</span>: desde 64K, la VRAM guarda solo las 32.768 celdas de las páginas en uso; el historial completo está en la RAM' : '<span class="m">Streaming desactivado</span>: toda la KV permanece en la VRAM',
      tFmt: (name, cell, scaled) => `<span class="c">Formato ${name}</span>: ${cell} bytes por celda y por capa${scaled ? ' (con factores de escala)' : ' (no hacen falta factores de escala)'}`,
      vBase: (gb, gib, pct) => `La misma KV: <b>${gb} GB</b>, es decir, <b>${gib} GiB</b>. El número en GiB es un ${pct}% menor, porque 1 GiB es un 7,4% más que 1 GB.`,
      vStream: '<br>El streaming está activo: la VRAM guarda solo 32.768 celdas, y el historial completo está en la RAM, no borrado.',
      vShort: '<br>El contexto es menor de 64K, así que el streaming no arranca: toda la KV está en la VRAM.',
      vBlocked: '<br><b>Ojo:</b> K8V4 no usa el streaming de KV (lo dice la documentación de upstream), así que aquí toda la KV permanece en la VRAM. Los dos interruptores de «ahorrar memoria» no se acumulan.',
      vPark: (n, gib) => `<br>Las otras ${n} conversación(es) aparcada(s) ocupan ${gib} GiB de RAM; el ejemplo de upstream limita la caché de aparcamiento a 8 GiB.`,
      try: [
        'Elige <b>FP16</b> y 32K: la KV de una conversación son 805.306.368 bytes, es decir, 805,3 MB o 768 MiB. Un comentario del código de Strata la llama «805 MiB», con la unidad equivocada.',
        'Arrastra el contexto de 32K a 128K: la KV crece exactamente 4 veces. Luego activa el streaming: la barra de VRAM se encoge de inmediato y la de RAM crece. No se pierde historial; solo se movió.',
        'Elige <b>K8V4</b> y arrastra a 256K: el interruptor de streaming no hace nada. No puedes tener a la vez «23% menos que INT8» y «guardar solo 32K en la VRAM».',
      ],

      pCode: 'KV_PAGING', pTitle: 'Tabla de páginas y paginación', pTag: 'Estimación didáctica · 12 bloques, 4 ranuras de VRAM',
      pIntro: 'El historial se corta en bloques de 4 tokens, y <b>una copia completa</b> permanece siempre en la RAM; la VRAM tiene solo 4 ranuras. En cada paso, la atención selecciona unos cuantos bloques. Pulsa <b>Paso</b> para ver cómo la tabla de páginas los trae a la VRAM.',
      pLgHost: 'Bloque en la RAM (historial completo)', pLgSlot: 'Bloque que vive en una ranura de VRAM', pLgNew: 'Recién traído en este paso', pLgRef: 'Bit de referencia = 1 (usado hace poco)',
      pSteps: ['Seleccionar bloques', 'Consultar la tabla de páginas', 'CLOCK elige ranura', 'Copiar desde la RAM', 'La atención lee'],
      pStage: 'Los 12 bloques de la RAM, la tabla de páginas y las 4 ranuras de VRAM', hostTitle: 'RAM: historial completo (4 tokens por bloque)', slotTitle: 'VRAM: 4 ranuras', ptRow: 'Tabla de páginas',
      slotBlock: (b) => b < 0 ? 'vacía' : `Bloque ${b}`, refBit: (r) => `ref ${r}`, hand: '▲ manecilla',
      bStep: '▶ Paso', bReset: 'Reiniciar',
      pReady: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ]; hay 8 consultas en total',
      sHitK: 'Aciertos / fallos', sHitF: '<b>acierto = el bloque ya está en una ranura de VRAM</b><br>fallo = hay que copiarlo desde la RAM',
      sRateK: 'Tasa de aciertos', sRateF: '<b>= aciertos ÷ (aciertos + fallos)</b>',
      sBytesK: 'Bytes copiados por PCIe', sBytesF: '<b>= fallos × 4.224 bytes</b><br>un bloque INT8 (4 celdas, 2 cabezas, K y V)',
      q0: (n, ids) => `<span class="c">[consulta ${n}]</span> la atención selecciona en este paso el/los bloque(s) ${String(ids).split('、').join(', ')}`,
      q1: (hits, miss) => `<span class="m">Consultar la tabla de páginas</span>: ${hits.length ? 'bloque(s) ' + hits.join(', ') + ' ya en la VRAM (acierto; bit de referencia en 1)' : 'ningún acierto'}; ${miss.length ? 'bloque(s) ' + miss.join(', ') + ' ausente(s) (— en la tabla de páginas)' : 'todo son aciertos'}`,
      q2none: '<span class="y">CLOCK</span>: no hace falta expulsar ningún bloque',
      q2: (b, slot, ev) => ev >= 0 ? `<span class="y">CLOCK</span>: la manecilla recorre las ranuras, pone a cero cada bit de referencia que vale 1 y perdona una vez esa ranura; el bloque ${b} entra en la ranura ${slot} y expulsa al bloque ${ev} (que aún tiene una copia completa en la RAM)` : `<span class="y">CLOCK</span>: la ranura ${slot} sigue vacía, así que el bloque ${b} entra directamente`,
      q3: (n, bytes) => n ? `<span class="w">Copia</span>: ${n} bloque(s) × 4.224 B = ${bytes} B pasan de la RAM a la VRAM por PCIe` : '<span class="w">Copia</span>: nada que mover en este paso',
      q4: '<span class="c">→</span> la atención lee cada bloque seleccionado a través de la tabla de páginas, y obtiene los mismos valores que si todo estuviera en la VRAM',
      pVerdict: (rate, bytes) => `① La tasa de aciertos en las 8 consultas es del <b>${rate}%</b>, con ${bytes} bytes movidos en total.<br>② Los bloques expulsados no desaparecen: la RAM siempre guarda una copia completa, y se vuelven a traer la próxima vez que se seleccionan. La VRAM decide solo «qué tan rápido», no «qué tan correcto».<br>③ Las escrituras de Strata siguen la misma regla: un token nuevo se escribe siempre en la copia de la RAM, y también en una ranura solo cuando su bloque vive casualmente en la VRAM, así que una ranura de VRAM nunca queda obsoleta.`,
      pTry: [
        'Sigue pulsando <b>Paso</b> durante las consultas 1–2: los bloques 0–3 pasan a las 4 ranuras uno a uno, y la tabla de páginas cambia de «—» a números de ranura.',
        'Mira el paso CLOCK de la consulta 3: las ranuras cuyo bit de referencia es 1 se ponen a cero y se perdonan primero, y solo después de que la manecilla da la vuelta elige un bloque para expulsar. Esa es la «segunda oportunidad».',
        'Termina las 8 y mira la tasa de aciertos: la última consulta pide otra vez los bloques 1–3, expulsados hace tiempo, así que hay que moverlos de nuevo. Cuando el conjunto de trabajo es mayor que las ranuras, la paginación no para.',
      ],
    },
  });

  Viz.register('kv-budget', {
    mount(el) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgVkv, glow: true },
        { color: 'var(--a2)', text: T.lgGdn },
        { color: 'var(--a3)', text: T.lgRkv },
        { color: 'var(--frame)', text: T.lgPark },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const X0 = 44, X1 = 354;
      const svg = Viz.svg('svg', { viewBox: '0 0 360 132', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const rows = [T.vram, T.ram].map((name, r) => {
        const y = 10 + r * 62;
        Viz.svg('text', { x: 0, y: y + 17, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = name;
        Viz.svg('rect', { x: X0, y, width: X1 - X0, height: 24, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        return { y, g: Viz.svg('g', {}, svg), t: Viz.svg('text', { x: X0, y: y + 42, 'font-size': 12, style: 'fill:var(--muted)' }, svg) };
      });
      const slider = (label, max, val) => `<div class="viz-slider"><label>${label}</label><input type="range" min="0" max="${max}" value="${val}" aria-label="${Viz.esc(label)}"><output></output></div>`;
      left.insertAdjacentHTML('beforeend', slider(T.ctxLabel, CTX.length - 1, 3) + `<div class="viz-slider"><label>${T.sesLabel}</label><input type="range" min="1" max="5" value="1" aria-label="${Viz.esc(T.sesLabel)}"><output></output></div>` +
        `<div class="viz-row">${FMTS.map(f => Viz.button(T.fmtNames[f], f === 'f16' ? 'alt' : 'ghost')).join('')}${Viz.button(T.bStream(false), 'ghost')}</div>`);
      const term = Viz.term(left, '');
      term.clear();
      right.innerHTML = Viz.stat({ id: 'b-pt', k: T.sPtK, v: '', f: '' }) + Viz.stat({ id: 'b-one', k: T.sOneK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'b-vram', k: T.sVramK, v: '', f: '' }) + Viz.stat({ id: 'b-ram', k: T.sRamK, v: '', f: T.sRamF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [ctxR, sesR] = el.querySelectorAll('input[type=range]');
      const outs = el.querySelectorAll('.viz-slider output');
      const btns = [...el.querySelectorAll('.viz-btn')], fmtBtns = btns.slice(0, 4), streamBtn = btns[4];
      let fmt = 'f16', streaming = false;
      const f2 = x => Viz.fmt(x, 2);

      function update(log) {
        const ctx = CTX[+ctxR.value], sessions = +sesR.value;
        outs[0].textContent = T.tok(Viz.fmt(ctx)); outs[1].textContent = T.ses(sessions);
        const b = M.budget({ ctx, sessions, fmt, streaming }), one = M.units(b.kvOne);
        $('[data-s=b-pt-v]').textContent = Viz.fmt(b.perToken) + ' B';
        $('[data-s=b-pt-f]').innerHTML = T.sPtF(Viz.fmt(M.CELL_BYTES[fmt]));
        $('[data-s=b-one-v]').textContent = T.gibOf(f2(one.gib));
        $('[data-s=b-one-f]').innerHTML = T.sOneF(Viz.fmt(ctx), Viz.fmt(b.perToken), Viz.fmt(b.kvOne), f2(one.gb));
        $('[data-s=b-vram-v]').textContent = f2(M.units(b.vram).gib) + ' GiB';
        $('[data-s=b-vram-f]').innerHTML = T.sVramF(Viz.fmt(b.streams ? M.RESIDENT_CELLS : ctx));
        $('[data-s=b-ram-v]').textContent = f2(M.units(b.ram).gib) + ' GiB';
        const max = Math.max(b.vram, b.ram, 1), sc = (X1 - X0) / max;
        const segs = [[[b.vramKv, 'var(--accent)'], [b.gdn, 'var(--a2)']], [[b.ramKv, 'var(--a3)'], [b.parked, 'var(--frame)']]];
        rows.forEach((row, r) => {
          row.g.innerHTML = '';
          let x = X0;
          segs[r].forEach(([v, color]) => { if (v > 0) { const w = v * sc; Viz.svg('rect', { x, y: row.y + 1, width: Math.max(1, w - 0.5), height: 22, style: 'fill:' + color }, row.g); x += w; } });
          const tot = M.units(r ? b.ram : b.vram);
          row.t.textContent = T.barText(f2(tot.gib), f2(tot.gb));
        });
        let v = T.vBase(f2(one.gb), f2(one.gib), (100 - 1e9 / 2 ** 30 * 100).toFixed(1));
        v += b.blocked ? T.vBlocked : b.streams ? T.vStream : streaming ? T.vShort : '';
        if (b.parked > 0) v += T.vPark(sessions - 1, f2(M.units(b.parked).gib));
        $('.viz-verdict').innerHTML = v;
        if (log) term.log(T.tChange(Viz.fmt(ctx), Viz.fmt(b.perToken), Viz.fmt(b.kvOne), f2(one.gb), f2(one.gib)));
      }
      ctxR.oninput = sesR.oninput = () => update(false);
      ctxR.onchange = sesR.onchange = () => update(true);
      fmtBtns.forEach((btn, i) => {
        btn.onclick = () => {
          fmt = FMTS[i];
          fmtBtns.forEach((b, j) => { b.className = 'viz-btn ' + (j === i ? 'alt' : 'ghost'); });
          term.log(T.tFmt(T.fmtNames[fmt], Viz.fmt(M.CELL_BYTES[fmt]), fmt !== 'f16')); update(true);
        };
      });
      streamBtn.onclick = () => {
        streaming = !streaming;
        streamBtn.textContent = T.bStream(streaming); streamBtn.className = 'viz-btn ' + (streaming ? 'alt' : 'ghost');
        term.log(T.tStream(streaming)); update(false);
      };
      update(true);
    },
  });

  Viz.register('kv-paging', {
    mount(el) {
      const body = Viz.frame(el, { code: T.pCode, title: T.pTitle, tag: T.pTag, intro: T.pIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.pLgHost },
        { color: 'var(--accent)', text: T.pLgSlot, glow: true },
        { color: 'var(--a3)', text: T.pLgNew },
        { color: 'var(--a2)', text: T.pLgRef },
      ]));
      const pipe = Viz.pipe(body, T.pSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 214', class: 'viz-stage', role: 'img', 'aria-label': T.pStage }, left);
      Viz.svg('text', { x: 0, y: 14, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = T.hostTitle;
      const hostRects = [], hostTxt = [], ptTxt = [];
      for (let i = 0; i < 12; i++) {
        const x = i * 30 + 1;
        hostRects.push(Viz.svg('rect', { x, y: 24, width: 27, height: 26, class: 'viz-cell' }, svg));
        hostTxt.push(Viz.svg('text', { x: x + 13.5, y: 42, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--paper);font-weight:700' }, svg));
        hostTxt[i].textContent = String(i);
        ptTxt.push(Viz.svg('text', { x: x + 13.5, y: 70, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--accent)' }, svg));
      }
      Viz.svg('text', { x: 0, y: 92, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.ptRow + ' ↑';
      Viz.svg('text', { x: 0, y: 118, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = T.slotTitle;
      const slots = [0, 1, 2, 3].map(j => {
        const x = j * 90 + 1;
        const r = Viz.svg('rect', { x, y: 128, width: 84, height: 50, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        const b = Viz.svg('text', { x: x + 42, y: 150, 'font-size': 14, 'text-anchor': 'middle', style: 'fill:var(--ink);font-weight:700' }, svg);
        const f = Viz.svg('text', { x: x + 42, y: 170, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg);
        return { r, b, f };
      });
      const hand = Viz.svg('text', { x: 43, y: 200, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--a3);font-weight:700' }, svg);
      hand.textContent = T.hand;
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.pReady);
      right.innerHTML = Viz.stat({ id: 'g-hit', k: T.sHitK, v: '0 / 0', f: T.sHitF }) + Viz.stat({ id: 'g-rate', k: T.sRateK, v: '—', f: T.sRateF, hot: true }) + Viz.stat({ id: 'g-bytes', k: T.sBytesK, v: '0 B', f: T.sBytesF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.pTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const verdict = $('.viz-verdict');
      let st, q, phase, res, selected, fresh, hits, misses;

      function paint() {
        const sel = new Set(selected);
        st.table.forEach((slot, i) => {
          hostRects[i].setAttribute('class', 'viz-cell' + (sel.has(i) ? ' pick' : ''));
          ptTxt[i].textContent = slot < 0 ? '—' : '→' + slot;
        });
        slots.forEach((s, j) => {
          const blk = st.slotBlock[j];
          s.r.setAttribute('style', 'stroke:var(--frame);fill:' + (fresh.has(j) ? 'var(--a3)' : blk >= 0 ? 'var(--accent)' : 'var(--side)'));
          s.b.textContent = T.slotBlock(blk);
          s.b.setAttribute('style', 'font-weight:700;fill:' + (blk >= 0 ? 'var(--paper)' : 'var(--muted)'));
          s.f.textContent = blk >= 0 ? T.refBit(st.ref[j]) : '';
          s.f.setAttribute('style', 'fill:' + (blk >= 0 ? 'var(--paper)' : 'var(--muted)') + (st.ref[j] ? ';font-weight:700' : ''));
        });
        hand.setAttribute('x', st.hand * 90 + 43);
        const total = hits + misses;
        $('[data-s=g-hit-v]').textContent = `${hits} / ${misses}`;
        $('[data-s=g-rate-v]').textContent = total ? Math.round(hits / total * 100) + '%' : '—';
        $('[data-s=g-bytes-v]').textContent = Viz.fmt(misses * BLOCK_BYTES) + ' B';
      }
      function reset() {
        st = M.pagingState(12, 4); q = 0; phase = 0; res = null; selected = []; fresh = new Set(); hits = 0; misses = 0;
        pipe.set(-1); verdict.hidden = true; term.clear(); term.log(T.pReady); paint();
      }
      function step() {
        if (q >= QUERIES.length) reset();
        pipe.set(phase);
        if (phase === 0) { fresh = new Set(); selected = QUERIES[q]; term.log(T.q0(q + 1, selected.join('、'))); }
        if (phase === 1) {
          const hitIds = selected.filter(b => st.table[b] >= 0), missIds = selected.filter(b => st.table[b] < 0);
          term.log(T.q1(hitIds, missIds));
        }
        if (phase === 2) {
          res = M.resolve(st, selected);
          if (!res.misses.length) term.log(T.q2none);
          res.misses.forEach(m => { fresh.add(m.slot); term.log(T.q2(m.block, m.slot, m.evicted)); });
        }
        if (phase === 3) {
          hits += res.hits.length; misses += res.misses.length;
          term.log(T.q3(res.misses.length, Viz.fmt(res.misses.length * BLOCK_BYTES)));
        }
        if (phase === 4) {
          term.log(T.q4);
          q++;
          if (q === QUERIES.length) {
            verdict.innerHTML = T.pVerdict(Math.round(hits / (hits + misses) * 100), Viz.fmt(misses * BLOCK_BYTES));
            verdict.hidden = false;
          }
        }
        paint();
        phase = (phase + 1) % 5;
      }
      stepBtn.onclick = step;
      resetBtn.onclick = reset;
      reset();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
