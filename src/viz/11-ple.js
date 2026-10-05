/* Chapter 11 widgets: the toy n-gram hash and the 8-way row cache with a rotating pointer.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.ple;
  const TOY = M.TOY;

  const T = Viz.t({
    zh: {
      code: 'NGRAM_HASH', title: 'n-gram 哈希：三个词变成八个行号', tag: '教学推演 · 小号哈希',
      intro: '选一组上下文（从旧到新三个词），按 <b>单步</b> 看哈希怎样算行号：取最近 2 个词和最近 3 个词，各算一个“混合值”（相乘再异或），再对 4 个不同的数取余，得到 8 个行号。Strata 的做法一样，只是每种 n-gram 有 8 个头、每个头约 2000 万行。',
      lgBi: '二元组（最近 2 个词）算出的行', lgTri: '三元组（最近 3 个词）算出的行', lgHit: '两个不同的 n-gram 撞到同一行',
      steps: ['取上下文', '二元组混合', '三元组混合', '各头取余', '拼成 8 行'],
      words: { 2: '〈结束〉', 5: '我', 7: '你', 11: '喜欢', 13: '吃', 19: '鱼', 23: '猫', 29: '狗' },
      none: '〈无〉',
      presets: [
        { name: '我 喜欢 猫', tok: 23, prev: [5, 11] },
        { name: '你 喜欢 猫', tok: 23, prev: [7, 11] },
        { name: '我 喜欢 狗', tok: 29, prev: [5, 11] },
        { name: '〈无〉〈无〉我', tok: 5, prev: [-1, -1] },
        { name: '喜欢 〈结束〉 猫', tok: 23, prev: [11, 2] },
        { name: '你 吃 鱼', tok: 19, prev: [7, 13] },
      ],
      pick: '上下文（旧 → 新）：',
      stageLabel: '玩具大表：8 个头，共 180 行',
      stageKey: '上：头的编号　中：模数　下：本次行号',
      bStep: '▶ 单步', bAll: '▶▶ 一次算完', bReset: '清空记录',
      ready: '<span class="c">$</span> ready. 先点一组上下文，再按 [ ▶ 单步 ]',
      l0: (ctx) => `<span class="c">上下文</span>：当前词在前，往回数两个 → [${ctx}]（没有的位置、以及〈结束〉之前的位置，一律记成〈结束〉）`,
      l1: (a, b, x) => `<span class="m">二元组</span>：${a} ⊕ ${b} = <span class="w">${x}</span>（⊕ 是异或，按二进制逐位比较，相同得 0、不同得 1）`,
      l2: (a, b, c, x) => `<span class="m">三元组</span>：${a} ⊕ ${b} ⊕ ${c} = <span class="w">${x}</span>`,
      l3: (parts) => `<span class="y">取余</span>：${parts}`,
      l4: (n, hit) => `<span class="c">→</span> 8 个行号就位。表里只存这些行的数字，不存词本身。${hit ? `<span class="y">有 ${n} 行和另一个不同的 n-gram 撞到了一起</span>：两者会读到同一行数据，模型分不清它们。` : '目前没有撞车（同一个 n-gram 重复出现时去同一行，不算撞车）。'}`,
      sRowsK: '这组上下文的 8 个行号', sRowsF: '<b>行号 = 混合值 mod 模数 + 该头起点</b><br>8 个头的模数是 13、17、19、23、11、29、31、37',
      sColK: '撞车的行（被两个不同的 n-gram 共用）', sColF: (ctxs, rows) => `<b>已登记 ${ctxs} 个不同的 n-gram</b><br>玩具表只有 ${rows} 行，三元组却有 8³ = 512 种：<br>鸽巢原理保证一定会撞`,
      sRealK: 'Strata 每个 token 实际读多少', sRealV: '1,440 B', sRealF: '<b>= 16 行 × 90 字节</b><br>8 个二元组头 + 8 个三元组头；<br>每行 160 个数，16 行拼成 2560 个数',
      try: [
        '先点 <b>我 喜欢 猫</b> 算一遍，再点同一组再算：行号一模一样。哈希是确定的，同样的输入永远去同一行。',
        '换成 <b>你 喜欢 猫</b>：只改了最旧的词，二元组的 4 行不动，三元组的 4 行全变。二元组根本看不到第三个词。',
        '点 <b>喜欢 〈结束〉 猫</b>：〈结束〉把更早的“喜欢”截断了。六组都算一遍，看“撞车”计数涨起来；再数一数，撞车的两个 n-gram 通常只在 1 个头上相撞，别的头上各走各的。这就是多用几个头的好处。',
      ],

      cCode: 'ROW_CACHE', cTitle: '行缓存：8 路组相联 + 轮换指针', cTag: '教学推演 · 组号用取余',
      cIntro: '缓存一共 16 格，分成 2 组、每组 8 路。一行先按 <b>行号 mod 2</b> 分到一组，只能住在这组的 8 格里。组里没找到，就把<b>替换指针</b>指着的那一格换掉，指针再往后挪一格。下方用同样 16 格、但“随便放、换最久没用的”（全相联 LRU）跑同一串访问作对照。',
      cLgEmpty: '空格', cLgHit: '这一步命中', cLgNew: '这一步写入（换掉了旧行）', cLgPtr: '▲ 该组的替换指针',
      cSteps: ['算组号', '组内比 8 路', '命中？', '按指针替换', '指针 +1'],
      setName: (s) => `第 ${s} 组`,
      traceLabel: '访问序列',
      cPresets: ['冲突：9 个奇数行轮流来', '热点：少数行反复出现'],
      cbStep: '▶ 下一次访问', cbAll: '▶▶ 跑完', cbReset: '重置',
      cReady: '<span class="c">$</span> ready. 选一串访问，按 [ ▶ 下一次访问 ]',
      cHit: (k, s, w) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}，在第 ${s} 组第 ${w} 路找到：<span class="c">命中</span>，不用读 SSD`,
      cMiss: (k, s, w, ev) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}，组内 8 路都不是它：<span class="m">未命中</span>，读 SSD 后写进指针指的第 ${w} 路${ev === null ? '（原来是空的）' : `，换掉了 #${String(ev).padStart(2, '0')}`}，指针挪到 ${(w + 1) % 8}`,
      cLru: (hit) => `<span class="y">  对照</span>：全相联 LRU ${hit ? '命中' : '未命中'}`,
      cDone: '<span class="y">// 这串访问跑完了</span>',
      sRrK: '组相联 + 轮换（Strata 的做法）', sLruK: '全相联 LRU（对照）', sRateF: (h, n) => `<b>命中率 = 命中 ÷ 访问 = ${h} ÷ ${n}</b>`,
      sScaleK: 'Strata 默认的行缓存', sScaleV: '≈ 94 MB', sScaleF: '<b>1,048,576 行 = 131,072 组 × 8 路</b><br>× 90 字节/行',
      vConflict: (rr, lru) => `① 9 个行号都是奇数，全挤进第 1 组；这组只有 8 格，每来一个都把下一个要用的挤掉：轮换的命中率 <b>${rr}</b>。<br>② 同样 16 格的全相联 LRU 装得下这 9 行，命中率 <b>${lru}</b>。<br>③ 总容量够，不等于每一组都够。这种“组内打架”叫<b>冲突未命中</b>。Strata 先用哈希把行号打散再分组，就是为了不让真实数据这样扎堆。`,
      vHot: (rr, lru) => `① 访问集中在少数几行时，轮换的命中率 <b>${rr}</b>，全相联 LRU <b>${lru}</b>，相差不大。<br>② 轮换指针只需要每组一个小计数器，比 LRU 每次都要更新“最近使用时间”省事得多。<br>③ 访问越集中，简单的替换策略越够用。`,
      cTry: [
        '选 <b>冲突</b>，连按几次：第 1 组的指针一圈圈地转，每一步都在换掉马上要用的行，第 0 组却一直空着。',
        '按 <b>跑完</b>，对比两个命中率：轮换 0%，全相联 LRU 75%。差别全来自“只能住在自己那一组”。',
        '换成 <b>热点</b> 再跑完：两种做法的命中率接近。想一想，真实的 Strata 为什么敢用这么简单的策略。',
      ],
    },
    en: {
      code: 'NGRAM_HASH', title: 'n-gram hash: three words become eight row numbers', tag: 'Teaching estimate · toy hash',
      intro: 'Pick a context (three words, oldest to newest) and press <b>Step</b> to see how the hash computes row numbers: take the last 2 words and the last 3 words, compute a "mixed value" for each (multiply, then XOR), then take the remainder for 4 different numbers each, giving 8 row numbers. Strata works the same way, except that each kind of n-gram has 8 heads and each head has about 20 million rows.',
      lgBi: 'Row from the bigram (last 2 words)', lgTri: 'Row from the trigram (last 3 words)', lgHit: 'Two different n-grams land on the same row',
      steps: ['Take context', 'Mix bigram', 'Mix trigram', 'Remainder per head', 'Join 8 rows'],
      words: { 2: '⟨end⟩', 5: 'I', 7: 'you', 11: 'like', 13: 'eat', 19: 'fish', 23: 'cats', 29: 'dogs' },
      none: '⟨none⟩',
      presets: [
        { name: 'I like cats', tok: 23, prev: [5, 11] },
        { name: 'you like cats', tok: 23, prev: [7, 11] },
        { name: 'I like dogs', tok: 29, prev: [5, 11] },
        { name: '⟨none⟩ ⟨none⟩ I', tok: 5, prev: [-1, -1] },
        { name: 'like ⟨end⟩ cats', tok: 23, prev: [11, 2] },
        { name: 'you eat fish', tok: 19, prev: [7, 13] },
      ],
      pick: 'Context (old → new):',
      stageLabel: 'Toy table: 8 heads, 180 rows in all',
      stageKey: 'Top: head · Middle: modulus · Bottom: row',
      bStep: '▶ Step', bAll: '▶▶ All at once', bReset: 'Clear record',
      ready: '<span class="c">$</span> ready. Pick a context, then press [ ▶ Step ]',
      l0: (ctx) => `<span class="c">Context</span>: the current word first, then two back → [${ctx}] (missing positions, and positions before ⟨end⟩, are all recorded as ⟨end⟩)`,
      l1: (a, b, x) => `<span class="m">Bigram</span>: ${a} ⊕ ${b} = <span class="w">${x}</span> (⊕ is XOR: compare bit by bit, same gives 0, different gives 1)`,
      l2: (a, b, c, x) => `<span class="m">Trigram</span>: ${a} ⊕ ${b} ⊕ ${c} = <span class="w">${x}</span>`,
      l3: (parts) => `<span class="y">Remainder</span>: ${parts.replace(/\uff1b/g, '; ')}`,
      l4: (n, hit) => `<span class="c">→</span> all 8 row numbers are in place. The table stores only these rows' numbers, never the words. ${hit ? `<span class="y">${n} row(s) collided with a different n-gram</span>: both read the same row data, and the model cannot tell them apart.` : 'No collisions yet (the same n-gram going to the same row again does not count).'}`,
      sRowsK: 'The 8 row numbers for this context', sRowsF: '<b>row = mixed value mod modulus + head start</b><br>the 8 heads use moduli 13, 17, 19, 23, 11, 29, 31, 37',
      sColK: 'Collided rows (shared by two different n-grams)', sColF: (ctxs, rows) => `<b>${ctxs} different n-grams recorded</b><br>the toy table has only ${rows} rows, but there are 8³ = 512 trigrams:<br>the pigeonhole principle guarantees collisions`,
      sRealK: 'What Strata really reads per token', sRealV: '1,440 B', sRealF: '<b>= 16 rows × 90 bytes</b><br>8 bigram heads + 8 trigram heads;<br>160 numbers per row, 16 rows join into 2560 numbers',
      try: [
        'Pick <b>I like cats</b> and run it once, then pick it again and rerun: the row numbers are identical. The hash is deterministic, so the same input always goes to the same rows.',
        'Switch to <b>you like cats</b>: only the oldest word changed, so the 4 bigram rows stay put and all 4 trigram rows move. The bigram never sees the third word.',
        'Pick <b>like ⟨end⟩ cats</b>: ⟨end⟩ cuts off the earlier "like". Run all six contexts and watch the collision count climb. Then count: two colliding n-grams usually meet on only 1 head and go separate ways on the others. That is why it pays to use several heads.',
      ],

      cCode: 'ROW_CACHE', cTitle: 'Row cache: 8-way set associative + rotating pointer', cTag: 'Teaching estimate · set by remainder',
      cIntro: 'The cache has 16 slots in all: 2 sets of 8 ways. A row is first assigned to a set by <b>row mod 2</b> and can live only in that set\'s 8 slots. If the set does not have it, the slot under the <b>replacement pointer</b> is replaced, and the pointer moves on by one. Below, a cache with the same 16 slots that "puts rows anywhere and evicts the least recently used" (fully associative LRU) runs the same accesses for comparison.',
      cLgEmpty: 'Empty slot', cLgHit: 'Hit on this step', cLgNew: 'Written on this step (replaced an old row)', cLgPtr: '▲ the set\'s replacement pointer',
      cSteps: ['Find set', 'Compare 8 ways', 'Hit?', 'Replace at pointer', 'Pointer +1'],
      setName: (s) => `Set ${s}`,
      traceLabel: 'Access sequence',
      cPresets: ['Conflict: 9 odd rows take turns', 'Hot spot: a few rows repeat'],
      cbStep: '▶ Next access', cbAll: '▶▶ Run to end', cbReset: 'Reset',
      cReady: '<span class="c">$</span> ready. Pick an access sequence, then press [ ▶ Next access ]',
      cHit: (k, s, w) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}, found in set ${s}, way ${w}: <span class="c">hit</span>, no SSD read`,
      cMiss: (k, s, w, ev) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}, none of the 8 ways has it: <span class="m">miss</span>, read from the SSD and written to way ${w} under the pointer${ev === null ? ' (it was empty)' : `, replacing #${String(ev).padStart(2, '0')}`}; the pointer moves to ${(w + 1) % 8}`,
      cLru: (hit) => `<span class="y">  compare</span>: fully associative LRU ${hit ? 'hit' : 'miss'}`,
      cDone: '<span class="y">// this access sequence is done</span>',
      sRrK: 'Set associative + rotation (Strata\'s way)', sLruK: 'Fully associative LRU (comparison)', sRateF: (h, n) => `<b>hit rate = hits ÷ accesses = ${h} ÷ ${n}</b>`,
      sScaleK: 'Strata\'s default row cache', sScaleV: '≈ 94 MB', sScaleF: '<b>1,048,576 rows = 131,072 sets × 8 ways</b><br>× 90 bytes per row',
      vConflict: (rr, lru) => `① All 9 row numbers are odd, so they all crowd into set 1. That set has only 8 slots, and each new arrival pushes out the row needed next: the rotation hit rate is <b>${rr}</b>.<br>② Fully associative LRU with the same 16 slots can hold all 9 rows: hit rate <b>${lru}</b>.<br>③ Enough total capacity does not mean every set has enough. This "fight inside one set" is a <b>conflict miss</b>. Strata stirs row numbers with a hash before assigning sets precisely so that real data does not crowd together like this.`,
      vHot: (rr, lru) => `① When accesses concentrate on a few rows, rotation hits <b>${rr}</b> and fully associative LRU hits <b>${lru}</b>, not far apart.<br>② The rotating pointer needs only one small counter per set, much cheaper than LRU, which must update a "last used" time on every access.<br>③ The more concentrated the accesses, the more a simple replacement policy is enough.`,
      cTry: [
        'Pick <b>Conflict</b> and press a few times: set 1\'s pointer goes round and round, each step replacing the row needed next, while set 0 stays empty.',
        'Press <b>Run to end</b> and compare the two hit rates: rotation 0%, fully associative LRU 75%. The whole gap comes from "a row may only live in its own set".',
        'Switch to <b>Hot spot</b> and run to the end: the two hit rates are close. Think about why the real Strata can afford such a simple policy.',
      ],
    },
    ar: {
      code: 'NGRAM_HASH', title: 'تجزئة n-gram: ثلاث كلمات تصير ثمانية أرقام صفوف', tag: 'تقدير تعليمي · تجزئة مصغّرة',
      intro: 'اختر سياقًا (ثلاث كلمات من الأقدم إلى الأحدث) ثم اضغط <b>خطوة</b> لترى كيف تحسب التجزئة أرقام الصفوف: نأخذ آخر كلمتين وآخر ثلاث كلمات، ونحسب لكل منهما «قيمة مخلوطة» (ضرب ثم XOR)، ثم نأخذ الباقي على 4 أعداد مختلفة لكل منهما، فنحصل على 8 أرقام صفوف. يعمل Strata بالطريقة نفسها، لكن لكل نوع من n-gram ثمانية رؤوس، وفي كل رأس نحو 20 مليون صف.',
      lgBi: 'صف محسوب من الثنائية (آخر كلمتين)', lgTri: 'صف محسوب من الثلاثية (آخر 3 كلمات)', lgHit: 'n-gram مختلفان وقعا في الصف نفسه',
      steps: ['أخذ السياق', 'خلط الثنائية', 'خلط الثلاثية', 'الباقي لكل رأس', 'ضم الصفوف الثمانية'],
      words: { 2: '⟨النهاية⟩', 5: 'سارة', 7: 'ليلى', 11: 'تحب', 13: 'تأكل', 19: 'السمك', 23: 'القطط', 29: 'الكلاب' },
      none: '⟨لا شيء⟩',
      presets: [
        { name: 'سارة تحب القطط', tok: 23, prev: [5, 11] },
        { name: 'ليلى تحب القطط', tok: 23, prev: [7, 11] },
        { name: 'سارة تحب الكلاب', tok: 29, prev: [5, 11] },
        { name: '⟨لا شيء⟩ ⟨لا شيء⟩ سارة', tok: 5, prev: [-1, -1] },
        { name: 'تحب ⟨النهاية⟩ القطط', tok: 23, prev: [11, 2] },
        { name: 'ليلى تأكل السمك', tok: 19, prev: [7, 13] },
      ],
      pick: 'السياق (من الأقدم إلى الأحدث):',
      stageLabel: 'الجدول التجريبي: 8 رؤوس، 180 صفًا',
      stageKey: 'أعلى: رقم الرأس · وسط: المقسوم عليه · أسفل: رقم الصف',
      bStep: '▶ خطوة', bAll: '▶▶ دفعة واحدة', bReset: 'مسح السجل',
      ready: '<span class="c">$</span> ready. اختر سياقًا ثم اضغط [ ▶ خطوة ]',
      l0: (ctx) => `<span class="c">السياق</span>: الكلمة الحالية أولًا ثم نعدّ للخلف كلمتين → [${ctx}] (المواضع الناقصة والمواضع التي قبل ⟨النهاية⟩ تُسجَّل كلها ⟨النهاية⟩)`,
      l1: (a, b, x) => `<span class="m">الثنائية</span>: ${a} ⊕ ${b} = <span class="w">${x}</span> (⊕ هي XOR: مقارنة بت ببت، المتماثلان يعطيان 0 والمختلفان يعطيان 1)`,
      l2: (a, b, c, x) => `<span class="m">الثلاثية</span>: ${a} ⊕ ${b} ⊕ ${c} = <span class="w">${x}</span>`,
      l3: (parts) => `<span class="y">الباقي</span>: ${parts.replace(/；/g, '؛ ')}`,
      l4: (n, hit) => `<span class="c">→</span> صارت أرقام الصفوف الثمانية جاهزة. لا يخزّن الجدول إلا أرقام هذه الصفوف، ولا يخزّن الكلمات نفسها. ${hit ? `<span class="y">تصادمت ${n} من الصفوف مع n-gram مختلف</span>: كلاهما يقرأ بيانات الصف نفسه، ولا يستطيع النموذج التمييز بينهما.` : 'لا تصادم حتى الآن (إذا ذهب n-gram نفسه إلى الصف نفسه مرة أخرى فلا يُعدّ تصادمًا).'}`,
      sRowsK: 'أرقام الصفوف الثمانية لهذا السياق', sRowsF: '<b>الصف = باقي قسمة القيمة المخلوطة على المقسوم عليه + بداية الرأس</b><br>مقاسيم الرؤوس الثمانية: 13 و17 و19 و23 و11 و29 و31 و37',
      sColK: 'الصفوف المتصادمة (يشترك فيها n-gram مختلفان)', sColF: (ctxs, rows) => `<b>سُجّل ${ctxs} من n-gram المختلفة</b><br>الجدول التجريبي فيه ${rows} صفًا فقط، بينما عدد الثلاثيات الممكنة 512 (8 أس 3):<br>مبدأ برج الحمام يضمن حدوث التصادم`,
      sRealK: 'ما يقرؤه Strata فعلًا لكل رمز', sRealV: '1,440 بايت', sRealF: '<b>16 صفًا × 90 بايت لكل صف</b><br>8 رؤوس للثنائية و8 رؤوس للثلاثية؛<br>في كل صف 160 قيمة، وتُضمّ 16 صفًا في 2560 قيمة',
      try: [
        'اختر <b>سارة تحب القطط</b> وشغّلها مرة، ثم اخترها مرة أخرى وأعد التشغيل: أرقام الصفوف مطابقة تمامًا. التجزئة حتمية، فالمدخل نفسه يذهب دائمًا إلى الصفوف نفسها.',
        'انتقل إلى <b>ليلى تحب القطط</b>: تغيّرت أقدم كلمة فقط، فتبقى صفوف الثنائية الأربعة في مكانها وتتحرك صفوف الثلاثية الأربعة كلها. الثنائية لا ترى الكلمة الثالثة أبدًا.',
        'اختر <b>تحب ⟨النهاية⟩ القطط</b>: ⟨النهاية⟩ تقطع «تحب» الأقدم. شغّل السياقات الستة كلها وراقب عدّاد «التصادم» وهو يرتفع. ثم عُدّ: n-gram المتصادمان يلتقيان عادةً في رأس واحد فقط، ويفترقان في الرؤوس الأخرى. وهذه فائدة استخدام عدة رؤوس.',
      ],

      cCode: 'ROW_CACHE', cTitle: 'ذاكرة الصفوف المؤقتة: ترابط مجموعات بثمانية مسارات + مؤشر دوّار', cTag: 'تقدير تعليمي · المجموعة بالباقي',
      cIntro: 'في الذاكرة المؤقتة 16 خانة في المجموع: مجموعتان بثمانية مسارات. يُوزَّع الصف أولًا على مجموعة بحسب <b>رقم الصف mod 2</b>، ولا يقيم إلا في خانات هذه المجموعة الثمانية. إذا لم تجده المجموعة استُبدلت الخانة التي يشير إليها <b>مؤشر الاستبدال</b>، ثم ينتقل المؤشر خانة واحدة. وللمقارنة تشغّل ذاكرة بالخانات الـ 16 نفسها لكن «تضع الصف في أي مكان وتطرد الأقدم استخدامًا» (LRU كامل الترابط) تسلسل الوصول نفسه في الأسفل.',
      cLgEmpty: 'خانة فارغة', cLgHit: 'إصابة في هذه الخطوة', cLgNew: 'كُتب في هذه الخطوة (استبدل صفًا قديمًا)', cLgPtr: '▲ مؤشر استبدال المجموعة',
      cSteps: ['إيجاد المجموعة', 'مقارنة 8 مسارات', 'إصابة؟', 'الاستبدال عند المؤشر', 'المؤشر +1'],
      setName: (s) => `المجموعة ${s}`,
      traceLabel: 'تسلسل الوصول',
      cPresets: ['تعارض: 9 صفوف فردية بالتناوب', 'نقطة ساخنة: صفوف قليلة تتكرر'],
      cbStep: '▶ الوصول التالي', cbAll: '▶▶ شغّل حتى النهاية', cbReset: 'إعادة ضبط',
      cReady: '<span class="c">$</span> ready. اختر تسلسل وصول ثم اضغط [ ▶ الوصول التالي ]',
      cHit: (k, s, w) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}، وُجد في المجموعة ${s} عند المسار ${w}: <span class="c">إصابة</span>، لا قراءة من SSD`,
      cMiss: (k, s, w, ev) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}، لا يوجد في أي من المسارات الثمانية: <span class="m">إخفاق</span>، قراءة من SSD وكتابة عند المسار ${w} الذي يشير إليه المؤشر${ev === null ? ' (كان فارغًا)' : `، فاستُبدل #${String(ev).padStart(2, '0')}`}، وينتقل المؤشر إلى ${(w + 1) % 8}`,
      cLru: (hit) => `<span class="y">  للمقارنة</span>: LRU كامل الترابط ${hit ? 'إصابة' : 'إخفاق'}`,
      cDone: '<span class="y">// انتهى تسلسل الوصول هذا</span>',
      sRrK: 'ترابط المجموعات + دوّار (طريقة Strata)', sLruK: 'LRU كامل الترابط (للمقارنة)', sRateF: (h, n) => `<b>نسبة الإصابة = الإصابات ÷ مرات الوصول</b><br>${h} إصابة من ${n} وصولًا`,
      sScaleK: 'الذاكرة المؤقتة الافتراضية للصفوف في Strata', sScaleV: '≈ 94 ميغابايت', sScaleF: '<b>1,048,576 صفًا = 131,072 مجموعة × 8 مسارات</b><br>× 90 بايت للصف',
      vConflict: (rr, lru) => `① أرقام الصفوف التسعة كلها فردية، فتزدحم كلها في المجموعة 1. وفي هذه المجموعة 8 خانات فقط، وكل صف جديد يطرد الصف الذي سيُطلب بعده: نسبة الإصابة في الدوّار <b>${rr}</b>.<br>② LRU كامل الترابط بالخانات الـ 16 نفسها يتسع للصفوف التسعة: نسبة الإصابة <b>${lru}</b>.<br>③ كفاية السعة الكلية لا تعني كفاية كل مجموعة. هذا «العراك داخل المجموعة» هو <b>إخفاق التعارض</b>. يخلط Strata أرقام الصفوف بالتجزئة قبل توزيعها على المجموعات تحديدًا لكي لا تتكدس البيانات الحقيقية هكذا.`,
      vHot: (rr, lru) => `① حين يتركز الوصول على صفوف قليلة، تكون نسبة الإصابة في الدوّار <b>${rr}</b> وفي LRU كامل الترابط <b>${lru}</b>، والفرق ليس كبيرًا.<br>② يحتاج المؤشر الدوّار إلى عدّاد صغير واحد لكل مجموعة، وهذا أرخص بكثير من LRU الذي يجب أن يحدّث «زمن آخر استخدام» عند كل وصول.<br>③ كلما تركز الوصول أكثر كفتك سياسة استبدال بسيطة.`,
      cTry: [
        'اختر <b>التعارض</b> واضغط عدة مرات: مؤشر المجموعة 1 يدور دورة بعد دورة ويستبدل في كل خطوة الصف الذي سيُطلب بعده، بينما تبقى المجموعة 0 فارغة.',
        'اضغط <b>شغّل حتى النهاية</b> وقارن النسبتين: الدوّار 0% وLRU كامل الترابط 75%. الفرق كله ناتج عن أن «الصف لا يقيم إلا في مجموعته».',
        'انتقل إلى <b>النقطة الساخنة</b> وشغّل حتى النهاية: النسبتان متقاربتان. فكّر لماذا يجرؤ Strata الحقيقي على استخدام سياسة بسيطة هكذا.',
      ],
    },
    es: {
      code: 'NGRAM_HASH', title: 'Hash de n-gramas: tres palabras se convierten en ocho filas', tag: 'Estimación didáctica · hash pequeño',
      intro: 'Elige un contexto (tres palabras, de la más antigua a la más reciente) y pulsa <b>Paso</b> para ver cómo el hash calcula los números de fila: toma las últimas 2 palabras y las últimas 3, calcula para cada grupo un "valor mezclado" (multiplicar y luego XOR) y saca el resto con 4 números distintos, lo que da 8 filas. Strata hace lo mismo, solo que cada tipo de n-grama tiene 8 cabezas y cada cabeza unos 20 millones de filas.',
      lgBi: 'Filas calculadas por el bigrama (últimas 2 palabras)', lgTri: 'Filas calculadas por el trigrama (últimas 3 palabras)', lgHit: 'Dos n-gramas distintos chocan en la misma fila',
      steps: ['Tomar el contexto', 'Mezclar el bigrama', 'Mezclar el trigrama', 'Resto por cabeza', 'Unir las 8 filas'],
      words: { 2: '‹fin›', 5: 'mi', 7: 'su', 11: 'perro', 13: 'gato', 19: 'come', 23: 'duerme', 29: 'ladra' },
      none: '‹nada›',
      presets: [
        { name: 'mi perro duerme', tok: 23, prev: [5, 11] },
        { name: 'su perro duerme', tok: 23, prev: [7, 11] },
        { name: 'mi perro ladra', tok: 29, prev: [5, 11] },
        { name: '‹nada› ‹nada› mi', tok: 5, prev: [-1, -1] },
        { name: 'perro ‹fin› duerme', tok: 23, prev: [11, 2] },
        { name: 'su gato come', tok: 19, prev: [7, 13] },
      ],
      pick: 'Contexto (antiguo → nuevo):',
      stageLabel: 'Tabla de juguete: 8 cabezas, 180 filas en total',
      stageKey: 'Arriba: cabeza · medio: módulo · abajo: fila',
      bStep: '▶ Paso', bAll: '▶▶ Calcular todo', bReset: 'Borrar el registro',
      ready: '<span class="c">$</span> ready. Primero elige un contexto y luego pulsa [ ▶ Paso ]',
      l0: (ctx) => `<span class="c">Contexto</span>: la palabra actual va primero y se cuentan dos hacia atrás → [${ctx}] (las posiciones que faltan, y las anteriores a ‹fin›, se anotan siempre como ‹fin›)`,
      l1: (a, b, x) => `<span class="m">Bigrama</span>: ${a} ⊕ ${b} = <span class="w">${x}</span> (⊕ es el XOR: compara bit a bit; iguales dan 0, distintos dan 1)`,
      l2: (a, b, c, x) => `<span class="m">Trigrama</span>: ${a} ⊕ ${b} ⊕ ${c} = <span class="w">${x}</span>`,
      l3: (parts) => `<span class="y">Resto</span>: ${parts}`,
      l4: (n, hit) => `<span class="c">→</span> las 8 filas están listas. La tabla solo guarda los números de esas filas, no las palabras. ${hit ? `<span class="y">${n} filas chocan con otro n-grama distinto</span>: los dos leen los mismos datos y el modelo no los distingue.` : 'Por ahora no hay colisiones (si el mismo n-grama aparece otra vez, va a la misma fila y eso no cuenta como colisión).'}`,
      sRowsK: 'Las 8 filas de este contexto', sRowsF: '<b>fila = valor mezclado mod módulo + inicio de la cabeza</b><br>los módulos de las 8 cabezas son 13, 17, 19, 23, 11, 29, 31, 37',
      sColK: 'Filas con colisión (compartidas por dos n-gramas distintos)', sColF: (ctxs, rows) => `<b>${ctxs} n-gramas distintos registrados</b><br>la tabla de juguete tiene solo ${rows} filas y los trigramas son 8³ = 512:<br>el principio del palomar garantiza que habrá colisiones`,
      sRealK: 'Cuánto lee Strata de verdad por token', sRealV: '1440 B', sRealF: '<b>= 16 filas × 90 bytes</b><br>8 cabezas de bigrama + 8 de trigrama;<br>cada fila tiene 160 números y las 16 filas forman 2560 números',
      try: [
        'Pulsa primero <b>mi perro duerme</b> y calcula; luego pulsa el mismo contexto y calcula otra vez: los números de fila son idénticos. El hash es determinista: la misma entrada va siempre a la misma fila.',
        'Cambia a <b>su perro duerme</b>: solo cambió la palabra más antigua, y las 4 filas del bigrama no se mueven mientras que las 4 del trigrama cambian todas. El bigrama ni siquiera ve la tercera palabra.',
        'Pulsa <b>perro ‹fin› duerme</b>: ‹fin› corta el "perro" anterior. Calcula los seis contextos y mira cómo sube el contador de colisiones; luego cuenta: los dos n-gramas que chocan suelen chocar solo en 1 cabeza, y en las demás van cada uno por su lado. Esa es la ventaja de usar varias cabezas.',
      ],

      cCode: 'ROW_CACHE', cTitle: 'Caché de filas: asociativa por conjuntos de 8 vías + puntero rotatorio', cTag: 'Estimación didáctica · el conjunto se calcula con el resto',
      cIntro: 'La caché tiene 16 ranuras en total, repartidas en 2 conjuntos de 8 vías. Una fila va primero a un conjunto según <b>número de fila mod 2</b> y solo puede vivir en las 8 ranuras de ese conjunto. Si no se encuentra en el conjunto, se sustituye la ranura a la que apunta el <b>puntero de reemplazo</b> y el puntero avanza una ranura. Abajo, como comparación, una caché con las mismas 16 ranuras pero "se pone donde sea y se sustituye lo que lleva más tiempo sin usarse" (LRU totalmente asociativa) recorre la misma serie de accesos.',
      cLgEmpty: 'Ranura vacía', cLgHit: 'Acierto en este paso', cLgNew: 'Escrita en este paso (sustituyó una fila vieja)', cLgPtr: '▲ Puntero de reemplazo del conjunto',
      cSteps: ['Calcular el conjunto', 'Comparar las 8 vías', '¿Acierto?', 'Sustituir según el puntero', 'Puntero +1'],
      setName: (s) => `Conjunto ${s}`,
      traceLabel: 'Serie de accesos',
      cPresets: ['Conflicto: se turnan 9 filas impares', 'Punto caliente: pocas filas se repiten'],
      cbStep: '▶ Siguiente acceso', cbAll: '▶▶ Terminar', cbReset: 'Reiniciar',
      cReady: '<span class="c">$</span> ready. Elige una serie de accesos y pulsa [ ▶ Siguiente acceso ]',
      cHit: (k, s, w) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}, encontrada en la vía ${w} del conjunto ${s}: <span class="c">acierto</span>, no hace falta leer el SSD`,
      cMiss: (k, s, w, ev) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}, ninguna de las 8 vías del conjunto es ella: <span class="m">fallo</span>; se lee el SSD y se escribe en la vía ${w}, a la que apunta el puntero${ev === null ? ' (estaba vacía)' : `, sustituyendo a #${String(ev).padStart(2, '0')}`}; el puntero pasa a ${(w + 1) % 8}`,
      cLru: (hit) => `<span class="y">  comparación</span>: LRU totalmente asociativa ${hit ? 'acierto' : 'fallo'}`,
      cDone: '<span class="y">// la serie de accesos terminó</span>',
      sRrK: 'Por conjuntos + rotación (lo que hace Strata)', sLruK: 'LRU totalmente asociativa (comparación)', sRateF: (h, n) => `<b>tasa de aciertos = aciertos ÷ accesos = ${h} ÷ ${n}</b>`,
      sScaleK: 'La caché de filas predeterminada de Strata', sScaleV: '≈ 94 MB', sScaleF: '<b>1.048.576 filas = 131.072 conjuntos × 8 vías</b><br>× 90 bytes por fila',
      vConflict: (rr, lru) => `① Las 9 filas son impares y se amontonan todas en el conjunto 1; ese conjunto tiene solo 8 ranuras y cada fila que llega expulsa a la que se va a necesitar enseguida: la tasa de aciertos de la rotación es <b>${rr}</b>.<br>② Una LRU totalmente asociativa con las mismas 16 ranuras sí guarda estas 9 filas y alcanza <b>${lru}</b>.<br>③ Que la capacidad total alcance no significa que alcance en cada conjunto. Esta "pelea dentro del conjunto" se llama <b>fallo por conflicto</b>. Strata dispersa primero los números de fila con un hash y luego los reparte en conjuntos, justo para que los datos reales no se amontonen así.`,
      vHot: (rr, lru) => `① Cuando los accesos se concentran en pocas filas, la tasa de aciertos de la rotación es <b>${rr}</b> y la de LRU totalmente asociativa es <b>${lru}</b>; no hay mucha diferencia.<br>② El puntero rotatorio necesita solo un contador pequeño por conjunto, mucho más sencillo que LRU, que tiene que actualizar el "momento de último uso" en cada acceso.<br>③ Cuanto más concentrados están los accesos, más basta con una política de reemplazo simple.`,
      cTry: [
        'Elige <b>Conflicto</b> y pulsa varias veces: el puntero del conjunto 1 da vueltas y vueltas, y en cada paso expulsa la fila que se va a usar enseguida, mientras el conjunto 0 sigue vacío.',
        'Pulsa <b>Terminar</b> y compara las dos tasas de aciertos: rotación 0 %, LRU totalmente asociativa 75 %. Toda la diferencia viene de "solo puede vivir en su propio conjunto".',
        'Cambia a <b>Punto caliente</b> y termina: las tasas de las dos políticas son parecidas. Piensa por qué el Strata real se atreve a usar una política tan simple.',
      ],
    },
    ko: {
      code: 'NGRAM_HASH', title: 'n-gram 해시: 단어 세 개가 행 번호 여덟 개로', tag: '교육용 추정 · 작은 해시',
      intro: '문맥(오래된 것부터 단어 세 개)을 고르고 <b>단계 실행</b>을 눌러 보세요. 해시가 행 번호를 계산하는 과정이 보여요. 최근 단어 2개와 최근 단어 3개로 각각 “혼합값”(곱한 뒤 XOR)을 만들고, 서로 다른 수 4개로 나눈 나머지를 구해서 행 번호 8개를 얻어요. Strata도 똑같이 해요. 다만 n-gram 종류마다 헤드가 8개이고, 헤드 하나가 약 2000만 행이에요.',
      lgBi: '2-gram(최근 단어 2개)이 만든 행', lgTri: '3-gram(최근 단어 3개)이 만든 행', lgHit: '서로 다른 두 n-gram이 같은 행에 충돌',
      steps: ['문맥 가져오기', '2-gram 혼합', '3-gram 혼합', '헤드별 나머지', '행 8개 잇기'],
      words: { 2: '⟨끝⟩', 5: '나', 7: '너', 11: '고양이', 13: '생선', 19: '먹어', 23: '좋아해', 29: '싫어해' },
      none: '⟨없음⟩',
      presets: [
        { name: '나 고양이 좋아해', tok: 23, prev: [5, 11] },
        { name: '너 고양이 좋아해', tok: 23, prev: [7, 11] },
        { name: '나 고양이 싫어해', tok: 29, prev: [5, 11] },
        { name: '⟨없음⟩ ⟨없음⟩ 나', tok: 5, prev: [-1, -1] },
        { name: '고양이 ⟨끝⟩ 좋아해', tok: 23, prev: [11, 2] },
        { name: '너 생선 먹어', tok: 19, prev: [7, 13] },
      ],
      pick: '문맥(오래된 것 → 최근 것):',
      stageLabel: '장난감 대형 표: 헤드 8개, 모두 180행',
      stageKey: '위: 헤드 번호　가운데: 나누는 수　아래: 이번 행 번호',
      bStep: '▶ 단계 실행', bAll: '▶▶ 한 번에 계산', bReset: '기록 지우기',
      ready: '<span class="c">$</span> ready. 문맥을 하나 고른 뒤 [ ▶ 단계 실행 ]을 눌러요',
      l0: (ctx) => `<span class="c">문맥</span>: 현재 단어가 맨 앞, 거슬러 두 개 더 → [${ctx}] (없는 자리와 ⟨끝⟩ 이전 자리는 모두 ⟨끝⟩으로 기록)`,
      l1: (a, b, x) => `<span class="m">2-gram</span>: ${a} ⊕ ${b} = <span class="w">${x}</span> (⊕는 XOR이에요. 이진수로 비트마다 비교해서 같으면 0, 다르면 1)`,
      l2: (a, b, c, x) => `<span class="m">3-gram</span>: ${a} ⊕ ${b} ⊕ ${c} = <span class="w">${x}</span>`,
      l3: (parts) => `<span class="y">나머지</span>: ${parts.replace(/；/g, '; ')}`,
      l4: (n, hit) => `<span class="c">→</span> 행 번호 8개가 정해졌어요. 표에는 이 행들의 숫자만 있고 단어 자체는 없어요. ${hit ? `<span class="y">${n}개 행이 다른 n-gram과 충돌했어요</span>: 두 n-gram이 같은 행 데이터를 읽으니 모델이 둘을 구분하지 못해요.` : '아직 충돌이 없어요(같은 n-gram이 다시 같은 행으로 가는 건 충돌이 아니에요).'}`,
      sRowsK: '이 문맥의 행 번호 8개', sRowsF: '<b>행 번호 = 혼합값 mod 나누는 수 + 그 헤드의 시작 위치</b><br>헤드 8개가 나누는 수는 13, 17, 19, 23, 11, 29, 31, 37',
      sColK: '충돌한 행(서로 다른 두 n-gram이 공유)', sColF: (ctxs, rows) => `<b>등록된 서로 다른 n-gram ${ctxs}개</b><br>장난감 표는 ${rows}행뿐인데 3-gram은 8³ = 512가지예요.<br>비둘기집 원리상 반드시 충돌해요`,
      sRealK: 'Strata가 토큰 하나당 실제로 읽는 양', sRealV: '1,440 B', sRealF: '<b>= 16행 × 90바이트</b><br>2-gram 헤드 8개 + 3-gram 헤드 8개<br>행마다 숫자 160개, 16행을 이으면 숫자 2560개',
      try: [
        '<b>나 고양이 좋아해</b>를 한 번 계산하고, 같은 문맥을 다시 눌러 계산해 보세요. 행 번호가 똑같아요. 해시는 결정적이라서 같은 입력은 늘 같은 행으로 가요.',
        '<b>너 고양이 좋아해</b>로 바꿔 보세요. 가장 오래된 단어만 바뀌었어요. 2-gram의 행 4개는 그대로고 3-gram의 행 4개는 전부 바뀌어요. 2-gram은 세 번째 단어를 아예 보지 못해요.',
        '<b>고양이 ⟨끝⟩ 좋아해</b>를 눌러 보세요. ⟨끝⟩이 그 앞의 “고양이”를 잘라 내요. 여섯 문맥을 모두 계산하면서 “충돌” 수가 늘어나는 걸 보세요. 충돌한 두 n-gram은 보통 헤드 1개에서만 부딪히고 다른 헤드에서는 각자 다른 행으로 가요. 헤드를 여러 개 쓰는 이유예요.',
      ],

      cCode: 'ROW_CACHE', cTitle: '행 캐시: 8웨이 집합 연관 + 순환 포인터', cTag: '교육용 추정 · 집합 번호는 나머지 연산',
      cIntro: '캐시는 모두 16칸이고 2개 집합, 집합마다 8웨이예요. 행은 먼저 <b>행 번호 mod 2</b>로 집합이 정해지고, 그 집합의 8칸에만 들어갈 수 있어요. 집합에서 못 찾으면 <b>교체 포인터</b>가 가리키는 칸을 교체하고, 포인터는 한 칸 앞으로 가요. 아래에는 같은 16칸이지만 “아무 칸에나 넣고 가장 오래 안 쓴 것을 교체”하는(완전 연관 LRU) 캐시가 같은 접근을 처리해서 비교해 줘요.',
      cLgEmpty: '빈 칸', cLgHit: '이번 단계에 히트', cLgNew: '이번 단계에 기록(옛 행을 교체)', cLgPtr: '▲ 그 집합의 교체 포인터',
      cSteps: ['집합 번호 계산', '집합 안 8웨이 비교', '히트?', '포인터 위치 교체', '포인터 +1'],
      setName: (s) => `${s}번 집합`,
      traceLabel: '접근 순서',
      cPresets: ['충돌: 홀수 행 9개가 번갈아 와요', '핫스팟: 소수의 행이 반복돼요'],
      cbStep: '▶ 다음 접근', cbAll: '▶▶ 끝까지', cbReset: '초기화',
      cReady: '<span class="c">$</span> ready. 접근 순서를 고른 뒤 [ ▶ 다음 접근 ]을 눌러요',
      cHit: (k, s, w) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}, ${s}번 집합의 ${w}번 웨이에서 찾았어요: <span class="c">히트</span>, SSD를 읽지 않아요`,
      cMiss: (k, s, w, ev) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}, 집합 안 8웨이에 없어요: <span class="m">미스</span>, SSD에서 읽어 포인터가 가리키는 ${w}번 웨이에 기록해요${ev === null ? '(원래 비어 있었어요)' : `. 교체된 행: #${String(ev).padStart(2, '0')}`}. 포인터는 ${(w + 1) % 8}번으로 가요`,
      cLru: (hit) => `<span class="y">  비교</span>: 완전 연관 LRU ${hit ? '히트' : '미스'}`,
      cDone: '<span class="y">// 이 접근 순서가 끝났어요</span>',
      sRrK: '집합 연관 + 순환(Strata의 방식)', sLruK: '완전 연관 LRU(비교용)', sRateF: (h, n) => `<b>히트율 = 히트 ÷ 접근 = ${h} ÷ ${n}</b>`,
      sScaleK: 'Strata 기본 행 캐시', sScaleV: '≈ 94 MB', sScaleF: '<b>1,048,576행 = 131,072개 집합 × 8웨이</b><br>× 행당 90바이트',
      vConflict: (rr, lru) => `① 행 번호 9개가 모두 홀수라서 전부 1번 집합에 몰려요. 이 집합은 8칸뿐이라서 새로 올 때마다 바로 다음에 쓸 행을 밀어내요. 순환 방식의 히트율은 <b>${rr}</b>예요.<br>② 같은 16칸의 완전 연관 LRU는 이 9개 행을 다 담을 수 있어서 히트율이 <b>${lru}</b>예요.<br>③ 전체 용량이 충분하다고 해서 모든 집합이 충분한 건 아니에요. 이렇게 “집합 안에서 다투는” 미스를 <b>충돌 미스</b>라고 해요. Strata는 행 번호를 해시로 먼저 흩뜨린 뒤 집합을 나눠요. 실제 데이터가 이렇게 몰리지 않게 하려는 거예요.`,
      vHot: (rr, lru) => `① 접근이 소수의 행에 집중되면 순환 방식의 히트율은 <b>${rr}</b>, 완전 연관 LRU는 <b>${lru}</b>예요. 차이가 크지 않아요.<br>② 순환 포인터는 집합마다 작은 카운터 하나면 돼요. 접근할 때마다 “마지막 사용 시각”을 고쳐야 하는 LRU보다 훨씬 간단해요.<br>③ 접근이 집중될수록 단순한 교체 정책으로도 충분해요.`,
      cTry: [
        '<b>충돌</b>을 골라 몇 번 눌러 보세요. 1번 집합의 포인터가 빙글빙글 돌면서 매 단계 곧 쓸 행을 교체해요. 0번 집합은 계속 비어 있어요.',
        '<b>끝까지</b>를 눌러 두 히트율을 비교해 보세요. 순환은 0%, 완전 연관 LRU는 75%예요. 차이는 모두 “자기 집합에만 들어갈 수 있다”는 제약에서 나와요.',
        '<b>핫스팟</b>으로 바꿔서 끝까지 실행해 보세요. 두 방식의 히트율이 비슷해요. 실제 Strata가 왜 이렇게 단순한 정책을 쓸 수 있는지 생각해 보세요.',
      ],
    },
    ja: {
      code: 'NGRAM_HASH', title: 'n-gram ハッシュ：3 つの単語が 8 個の行番号になる', tag: '教育用の試算 · 小さなハッシュ',
      intro: '文脈（古い順に 3 つの単語）を選び、<b>ステップ</b> を押して、ハッシュが行番号を作る様子を見ます。直近 2 語と直近 3 語から、それぞれ「混合値」（掛け算してから XOR）を出し、4 つの異なる数で割った余りを取って、8 個の行番号を得ます。Strata のやり方も同じです。ただし n-gram の種類ごとにヘッドが 8 個あり、各ヘッドは約 2000 万行です。',
      lgBi: '2-gram（直近 2 語）が出した行', lgTri: '3-gram（直近 3 語）が出した行', lgHit: '異なる 2 つの n-gram が同じ行に衝突',
      steps: ['文脈を取る', '2-gram を混ぜる', '3-gram を混ぜる', '各ヘッドで剰余', '8 行をつなぐ'],
      words: { 2: '〈終了〉', 5: '私', 7: '君', 11: '好き', 13: '食べる', 19: '魚', 23: '猫', 29: '犬' },
      none: '〈なし〉',
      presets: [
        { name: '私 好き 猫', tok: 23, prev: [5, 11] },
        { name: '君 好き 猫', tok: 23, prev: [7, 11] },
        { name: '私 好き 犬', tok: 29, prev: [5, 11] },
        { name: '〈なし〉〈なし〉私', tok: 5, prev: [-1, -1] },
        { name: '好き 〈終了〉 猫', tok: 23, prev: [11, 2] },
        { name: '君 食べる 魚', tok: 19, prev: [7, 13] },
      ],
      pick: '文脈（古い → 新しい）：',
      stageLabel: 'おもちゃの大表：8 ヘッド、計 180 行',
      stageKey: '上：ヘッド番号　中：法　下：今回の行番号',
      bStep: '▶ ステップ', bAll: '▶▶ 一気に計算', bReset: '記録を消す',
      ready: '<span class="c">$</span> ready. 文脈を選んでから [ ▶ ステップ ] を押してください',
      l0: (ctx) => `<span class="c">文脈</span>：現在の単語を先頭に、2 つ前まで戻る → [${ctx}]（存在しない位置と、〈終了〉より前の位置は、すべて〈終了〉として記録）`,
      l1: (a, b, x) => `<span class="m">2-gram</span>：${a} ⊕ ${b} = <span class="w">${x}</span>（⊕ は XOR。2 進数でビットごとに比べ、同じなら 0、違えば 1）`,
      l2: (a, b, c, x) => `<span class="m">3-gram</span>：${a} ⊕ ${b} ⊕ ${c} = <span class="w">${x}</span>`,
      l3: (parts) => `<span class="y">剰余</span>：${parts}`,
      l4: (n, hit) => `<span class="c">→</span> 8 個の行番号がそろいました。表に保存するのはこれらの行の数値だけで、単語そのものは保存しません。${hit ? `<span class="y">${n} 行が、別の n-gram と衝突しました</span>：両者は同じ行のデータを読むので、モデルは区別できません。` : '今のところ衝突はありません（同じ n-gram がもう一度同じ行に行っても、衝突には数えません）。'}`,
      sRowsK: 'この文脈の 8 個の行番号', sRowsF: '<b>行番号 = 混合値 mod 法 + そのヘッドの起点</b><br>8 個のヘッドの法は 13、17、19、23、11、29、31、37',
      sColK: '衝突した行（異なる 2 つの n-gram が共有）', sColF: (ctxs, rows) => `<b>登録済みの異なる n-gram：${ctxs} 個</b><br>おもちゃの表は ${rows} 行しかないのに、3-gram は 8³ = 512 通り：<br>鳩の巣原理により、必ず衝突します`,
      sRealK: 'Strata が token ごとに実際に読む量', sRealV: '1,440 B', sRealF: '<b>= 16 行 × 90 バイト</b><br>2-gram のヘッド 8 個 + 3-gram のヘッド 8 個；<br>1 行 160 個の数で、16 行をつなぐと 2560 個',
      try: [
        'まず <b>私 好き 猫</b> を選んで 1 回計算し、同じ文脈をもう一度計算してください。行番号はまったく同じです。ハッシュは決定的なので、同じ入力は必ず同じ行に行きます。',
        '<b>君 好き 猫</b> に替えます。変わったのは一番古い単語だけです。2-gram の 4 行は動かず、3-gram の 4 行はすべて変わります。2-gram には 3 つめの単語が見えないからです。',
        '<b>好き 〈終了〉 猫</b> を選びます。〈終了〉が、それより前の「好き」を切り捨てます。6 つの文脈をすべて計算して、「衝突」の数が増える様子を見ましょう。さらに数えてみてください。衝突した 2 つの n-gram は、たいてい 1 つのヘッドでだけ当たり、ほかのヘッドでは別々の行に行きます。ヘッドを複数使うと得なのは、このためです。',
      ],

      cCode: 'ROW_CACHE', cTitle: '行キャッシュ：8 ウェイセットアソシアティブ + ローテーションポインタ', cTag: '教育用の試算 · セット番号は剰余',
      cIntro: 'キャッシュは全部で 16 マスあり、2 セット、各 8 ウェイに分かれています。行はまず <b>行番号 mod 2</b> でセットに振り分けられ、そのセットの 8 マスにしか住めません。セットの中に見つからなければ、<b>置換ポインタ</b>が指すマスを置き換え、ポインタを 1 つ先に進めます。下では比較のために、同じ 16 マスで「どこにでも置いてよく、いちばん長く使っていないものを追い出す」キャッシュ（全連想 LRU）に、同じアクセスを流します。',
      cLgEmpty: '空きマス', cLgHit: 'このステップでヒット', cLgNew: 'このステップで書き込み（古い行を置き換え）', cLgPtr: '▲ そのセットの置換ポインタ',
      cSteps: ['セットを求める', '8 ウェイを比較', 'ヒット？', 'ポインタ位置を置換', 'ポインタ +1'],
      setName: (s) => `第 ${s} セット`,
      traceLabel: 'アクセス列',
      cPresets: ['競合：奇数行 9 個が順番に来る', 'ホットスポット：少数の行が繰り返し出る'],
      cbStep: '▶ 次のアクセス', cbAll: '▶▶ 最後まで実行', cbReset: 'リセット',
      cReady: '<span class="c">$</span> ready. アクセス列を選んでから [ ▶ 次のアクセス ] を押してください',
      cHit: (k, s, w) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}、第 ${s} セットの ${w} ウェイで発見：<span class="c">ヒット</span>、SSD は読まない`,
      cMiss: (k, s, w, ev) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}、セット内の 8 ウェイのどれにもない：<span class="m">ミス</span>、SSD から読んでポインタが指す ${w} ウェイに書き込み${ev === null ? '（もとは空き）' : `、#${String(ev).padStart(2, '0')} を置き換え`}、ポインタは ${(w + 1) % 8} へ`,
      cLru: (hit) => `<span class="y">  比較</span>：全連想 LRU は${hit ? 'ヒット' : 'ミス'}`,
      cDone: '<span class="y">// このアクセス列は終わりました</span>',
      sRrK: 'セットアソシアティブ + ローテーション（Strata の方式）', sLruK: '全連想 LRU（比較用）', sRateF: (h, n) => `<b>ヒット率 = ヒット ÷ アクセス = ${h} ÷ ${n}</b>`,
      sScaleK: 'Strata 既定の行キャッシュ', sScaleV: '≈ 94 MB', sScaleF: '<b>1,048,576 行 = 131,072 セット × 8 ウェイ</b><br>× 1 行 90 バイト',
      vConflict: (rr, lru) => `① 9 個の行番号はすべて奇数なので、全部が第 1 セットに集まります。このセットは 8 マスしかなく、1 つ来るたびに、次に使う行を押し出します。ローテーションのヒット率は <b>${rr}</b> です。<br>② 同じ 16 マスの全連想 LRU なら、この 9 行が入ります。ヒット率は <b>${lru}</b> です。<br>③ 全体の容量が足りていても、どのセットも足りているとは限りません。この「セット内の奪い合い」を<b>競合ミス</b>と呼びます。Strata は、行番号をハッシュでばらしてからセットに分けます。実際のデータがこんなふうに固まらないようにするためです。`,
      vHot: (rr, lru) => `① アクセスが少数の行に集中すると、ローテーションのヒット率は <b>${rr}</b>、全連想 LRU は <b>${lru}</b> で、大きな差はありません。<br>② ローテーションポインタに必要なのは、セットごとの小さなカウンター 1 つだけです。LRU のように、アクセスのたびに「最後に使った時刻」を更新するより、ずっと手軽です。<br>③ アクセスが集中するほど、単純な置換方針で足ります。`,
      cTry: [
        '<b>競合</b>を選び、何回か続けて押してください。第 1 セットのポインタがぐるぐる回り、毎回すぐ使う行を置き換えます。第 0 セットはずっと空のままです。',
        '<b>最後まで実行</b>を押して、2 つのヒット率を比べます。ローテーションは 0%、全連想 LRU は 75% です。この差は、すべて「行は自分のセットにしか住めない」ことから生まれます。',
        '<b>ホットスポット</b>に替えて最後まで実行します。2 つの方式のヒット率は近くなります。本物の Strata が、なぜこんなに単純な方針で済ませられるのか、考えてみましょう。',
      ],
    },
  });

  Viz.register('ngram-hash', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgBi, glow: true },
        { color: 'var(--a2)', text: T.lgTri },
        { color: 'var(--a3)', text: T.lgHit },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin:0 0 12px"><span style="font-size:14px">${T.pick}</span>${T.presets.map((p, i) => `<button type="button" class="viz-btn ghost" data-p="${i}">${Viz.esc(p.name)}</button>`).join('')}</div><div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 360, X0 = 4, scale = (W - 2 * X0) / TOY.rows;
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} 168`, class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      Viz.svg('text', { x: 4, y: 16, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.stageLabel;
      Viz.svg('text', { x: 4, y: 162, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.stageKey;
      TOY.mods.forEach((mod, h) => {
        const x = X0 + TOY.offsets[h] * scale, w = mod * scale;
        Viz.svg('rect', { x: x + 1, y: 46, width: w - 2, height: 56, style: `fill:var(--side);stroke:${h < TOY.HEADS ? 'var(--accent)' : 'var(--a2)'};stroke-width:1` }, svg);
        Viz.svg('text', { x: x + w / 2, y: 38, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = h;
        Viz.svg('text', { x: x + w / 2, y: 120, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = mod;
      });
      const ghostLayer = Viz.svg('g', {}, svg), markLayer = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'n-rows', k: T.sRowsK, v: '—', f: T.sRowsF }) +
        Viz.stat({ id: 'n-col', k: T.sColK, v: '0', f: T.sColF(0, TOY.rows), hot: true }) +
        Viz.stat({ id: 'n-real', k: T.sRealK, v: T.sRealV, f: T.sRealF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn] = left.querySelectorAll('.viz-btn');
      const word = id => (id < 0 ? T.none : T.words[id]);
      let preset = 0, phase = 0, busy = false, cur = null;
      const owners = new Map();   // row -> set of context names that landed there

      function choose(i) {
        preset = i; phase = 0; cur = M.toyRows(T.presets[i].tok, T.presets[i].prev);
        el.querySelectorAll('[data-p]').forEach(b => { b.className = 'viz-btn ' + (+b.dataset.p === i ? '' : 'ghost'); });
        markLayer.innerHTML = ''; pipe.set(-1);
      }
      function paintGhosts() {
        ghostLayer.innerHTML = '';
        owners.forEach((names, row) => Viz.svg('rect', { x: X0 + row * scale + 0.5, y: 50, width: Math.max(2, scale - 1), height: 48, style: `fill:${names.size > 1 ? 'var(--a3)' : 'var(--frame)'}` }, ghostLayer));
      }
      function paintRows(n) {
        markLayer.innerHTML = '';
        cur.rows.slice(0, n).forEach((row, h) => {
          const x = X0 + row * scale;
          Viz.svg('rect', { x: x - 1, y: 46, width: Math.max(4, scale + 2), height: 56, style: `fill:${h < TOY.HEADS ? 'var(--accent)' : 'var(--a2)'}` }, markLayer);
          const cx = X0 + (TOY.offsets[h] + TOY.mods[h] / 2) * scale;
          Viz.svg('text', { x: cx, y: 140, 'font-size': 12, 'text-anchor': 'middle', style: `fill:${h < TOY.HEADS ? 'var(--accent)' : 'var(--a2)'}` }, markLayer).textContent = row;
        });
      }
      function collisions() {
        let n = 0; owners.forEach(names => { if (names.size > 1) n++; }); return n;
      }
      function contexts() { const s = new Set(); owners.forEach(names => names.forEach(x => s.add(x))); return s.size; }
      async function step(fast) {
        if (!cur) choose(preset);
        pipe.set(phase);
        const c = cur.ctx;
        const prod = j => `${word(c[j])}×${TOY.mult[j]}=${c[j] * TOY.mult[j]}`;
        if (phase === 0 && !fast) term.log(T.l0([c[0], c[1], c[2]].map(word).join(', ')));
        if (phase === 1) { paintRows(0); if (!fast) term.log(T.l1(prod(0), prod(1), cur.mixed[0])); }
        if (phase === 2 && !fast) term.log(T.l2(prod(0), prod(1), prod(2), cur.mixed[1]));
        if (phase === 3) {
          for (let n = 1; n <= cur.rows.length; n++) { paintRows(n); if (!fast) await ctx.sleep(90); }
          if (!fast) term.log(T.l3(cur.rows.map((r, h) => `${cur.mixed[h < TOY.HEADS ? 0 : 1]} mod ${TOY.mods[h]} + ${TOY.offsets[h]} = ${r}`).slice(0, 8).join('；')));
        }
        if (phase === 4) {
          const gram = [[c[1], c[0]], [c[2], c[1], c[0]]].map(g => g.map(word).join(' '));
          cur.rows.forEach((r, h) => { if (!owners.has(r)) owners.set(r, new Set()); owners.get(r).add(gram[h < TOY.HEADS ? 0 : 1]); });
          const shared = cur.rows.filter(r => owners.get(r).size > 1).length;
          paintGhosts();
          $('[data-s=n-rows-v]').textContent = cur.rows.join(' ');
          $('[data-s=n-col-v]').textContent = collisions();
          $('[data-s=n-col-f]').innerHTML = T.sColF(contexts(), TOY.rows);
          if (!fast) term.log(T.l4(shared, shared > 0));
        }
        phase = (phase + 1) % 5;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      el.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => guard(async () => { choose(+b.dataset.p); }); });
      stepBtn.onclick = () => guard(() => step(false));
      allBtn.onclick = () => guard(async () => { phase = 0; for (let i = 0; i < 5; i++) await step(false); });
      resetBtn.onclick = () => guard(async () => { owners.clear(); paintGhosts(); choose(preset); term.clear(); term.log(T.ready); $('[data-s=n-rows-v]').textContent = '—'; $('[data-s=n-col-v]').textContent = '0'; $('[data-s=n-col-f]').innerHTML = T.sColF(0, TOY.rows); });
      choose(0);
    },
  });

  Viz.register('row-cache', {
    mount(el, ctx) {
      const SETS = 2, WAYS = 8;
      const body = Viz.frame(el, { code: T.cCode, title: T.cTitle, tag: T.cTag, intro: T.cIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.cLgEmpty },
        { color: 'var(--accent)', text: T.cLgHit, glow: true },
        { color: 'var(--a2)', text: T.cLgNew },
        { color: 'var(--a3)', text: T.cLgPtr },
      ]));
      const pipe = Viz.pipe(body, T.cSteps);
      body.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin:0 0 12px">${T.cPresets.map((p, i) => `<button type="button" class="viz-btn ghost" data-t="${i}">${Viz.esc(p)}</button>`).join('')}</div><div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 206', class: 'viz-stage', role: 'img', 'aria-label': T.cTitle }, left);
      const CW = 42, GAP = 2, CX = 4, cells = [], ptrs = [], setY = s => 22 + s * 72;
      for (let s = 0; s < SETS; s++) {
        const y = setY(s);
        Viz.svg('text', { x: 4, y: y - 6, 'font-size': 12, style: 'fill:var(--ink)' }, svg).textContent = T.setName(s);
        for (let w = 0; w < WAYS; w++) {
          const r = Viz.svg('rect', { x: CX + w * (CW + GAP), y, width: CW, height: 34, class: 'viz-cell' }, svg);
          const t = Viz.svg('text', { x: CX + w * (CW + GAP) + CW / 2, y: y + 22, 'font-size': 13, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
          cells.push({ r, t });
        }
        ptrs.push(Viz.svg('path', { d: 'M0 0l6 9h-12z', style: 'fill:var(--a3)' }, svg));
      }
      Viz.svg('text', { x: 4, y: 166, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.traceLabel;
      const traceG = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.cbStep)}${Viz.button(T.cbAll, 'alt')}${Viz.button(T.cbReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.cReady);
      right.innerHTML =
        Viz.stat({ id: 'c-rr', k: T.sRrK, v: '—', f: T.sRateF(0, 0), hot: true }) +
        Viz.stat({ id: 'c-lru', k: T.sLruK, v: '—', f: T.sRateF(0, 0) }) +
        Viz.stat({ id: 'c-scale', k: T.sScaleK, v: T.sScaleV, f: T.sScaleF });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden></div>` + Viz.tryList(T.cTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn] = left.querySelectorAll('.viz-btn');
      let which = 0, trace = [], i = 0, rr, lru, rrHits = 0, lruHits = 0, busy = false, last = null;

      function load(t) {
        which = t; trace = t === 0 ? M.conflictTrace() : M.hotTrace(7); i = 0; rrHits = 0; lruHits = 0; last = null;
        rr = M.makeCache({ sets: SETS, ways: WAYS, policy: 'rr' });
        lru = M.makeCache({ sets: 1, ways: SETS * WAYS, policy: 'lru' });
        el.querySelectorAll('[data-t]').forEach(b => { b.className = 'viz-btn ' + (+b.dataset.t === t ? '' : 'ghost'); });
        $('.viz-verdict').hidden = true; pipe.set(-1); paint(); stats();
      }
      function paint() {
        cells.forEach((c, j) => {
          const k = rr.keys[j];
          c.t.textContent = k === null ? '' : '#' + String(k).padStart(2, '0');
          let cls = 'viz-cell';
          if (last && last.set * WAYS + last.way === j) cls += last.hit ? ' pick' : ' score';
          c.r.setAttribute('class', cls);
        });
        ptrs.forEach((p, s) => p.setAttribute('transform', `translate(${CX + rr.next[s] * (CW + GAP) + CW / 2} ${setY(s) + 37})`));
        traceG.innerHTML = '';
        const per = 12, start = Math.max(0, Math.min(i - 4, trace.length - per));
        trace.slice(start, start + per).forEach((k, n) => {
          const idx = start + n, x = 4 + n * 29;
          Viz.svg('rect', { x, y: 172, width: 26, height: 26, class: 'viz-cell' + (idx === i - 1 ? ' pick' : ''), style: idx < i - 1 ? 'opacity:.45' : '' }, traceG);
          Viz.svg('text', { x: x + 13, y: 190, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, traceG).textContent = String(k).padStart(2, '0');
        });
      }
      const pct = (h, n) => (n ? Math.round(h / n * 100) : 0) + '%';
      function stats() {
        $('[data-s=c-rr-v]').textContent = i ? pct(rrHits, i) : '—';
        $('[data-s=c-rr-f]').innerHTML = T.sRateF(rrHits, i);
        $('[data-s=c-lru-v]').textContent = i ? pct(lruHits, i) : '—';
        $('[data-s=c-lru-f]').innerHTML = T.sRateF(lruHits, i);
      }
      async function step(fast) {
        if (i >= trace.length) return false;
        const k = trace[i++];
        const r = rr.access(k), l = lru.access(k);
        if (r.hit) rrHits++;
        if (l.hit) lruHits++;
        last = r;
        if (!fast) {
          const phases = r.hit ? [0, 1, 2] : [0, 1, 2, 3, 4];
          for (const p of phases) { pipe.set(p); await ctx.sleep(110); }
          term.log(r.hit ? T.cHit(k, r.set, r.way) : T.cMiss(k, r.set, r.way, r.evicted));
          term.log(T.cLru(l.hit));
        }
        paint(); stats();
        if (i === trace.length) finish();
        return true;
      }
      function finish() {
        term.log(T.cDone);
        const v = $('.viz-verdict');
        v.innerHTML = which === 0 ? T.vConflict(pct(rrHits, i), pct(lruHits, i)) : T.vHot(pct(rrHits, i), pct(lruHits, i));
        v.hidden = false;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      el.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => guard(async () => { load(+b.dataset.t); term.clear(); term.log(T.cReady); }); });
      stepBtn.onclick = () => guard(async () => { if (i >= trace.length) load(which); await step(false); });
      allBtn.onclick = () => guard(async () => {
        if (i >= trace.length) load(which);
        while (i < trace.length) { await step(true); await ctx.sleep(40); }
      });
      resetBtn.onclick = () => guard(async () => { load(which); term.clear(); term.log(T.cReady); });
      load(0);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
