/* Chapter 12 widgets: LRU vs LFU vs decayed counts on one layer's routing, and the swap protocol.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.cache;

  const T = Viz.t({
    zh: {
      code: 'CACHE_RACE', title: '三种替换策略赛跑', tag: '教学推演 · 一层、24 个专家、6 个槽位',
      intro: '把一层缩小成 24 个专家，每个 token 选 4 个，显存只放得下 6 个。三种策略看同一串路由：<b>LRU</b> 换掉最久没用的；<b>LFU</b> 换掉历史总次数最少的；<b>衰减计数</b>模仿 Strata：平时不动，每 4 个 token 调整一次，再把所有次数乘 0.7。第 30 个 token 起话题从 A 换成 B，热门专家整体换了一批。',
      lgHot: '当前话题的热门专家', lgCold: '其他专家', lgStrip: '下方小格：每个 token 命中几个（越亮越多）', lgShift: '┃ 话题切换 / 冷门插曲',
      steps: ['路由选 4 个专家', '三种缓存各查一遍', '记次数', '每 4 个 token 调整', '次数 × 0.7'],
      names: { lru: 'LRU', lfu: 'LFU', decay: '衰减计数' },
      routed: (t, topic, ids) => `token ${t}（话题 ${topic}）选中：${ids}`,
      stageLabel: '三种策略的显存槽位和逐 token 命中情况',
      stripLabel: '每个 token 命中几个（上 LRU、中 LFU、下 衰减计数）',
      bStep: '▶ 下一个 token', bAll: '▶▶ 跑完 60 个', bReset: '重置', bBurstOff: '冷门插曲：关', bBurstOn: '冷门插曲：开',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 下一个 token ]，或者直接跑完',
      lTok: (t, topic, ids, a, b, c) => `<span class="c">[t${String(t).padStart(2, '0')}]</span> 话题 ${topic}，选中 ${ids} → 命中：LRU ${a}，LFU ${b}，衰减 ${c}`,
      lAdapt: (moves) => `<span class="y">  衰减计数调整</span>：${moves || '没有够格的交换'}；然后所有次数 × 0.7`,
      lMove: (inn, out) => out === null ? `放入 #${inn}` : `#${inn} 换掉 #${out}`,
      lShift: '<span class="m">// 话题切换：从这里起热门专家换成 B 组</span>',
      lBurst: '<span class="m">// 冷门插曲：接下来 3 个 token 只选冷门专家</span>',
      lDone: '<span class="y">// 60 个 token 跑完</span>',
      sK: (n) => `${n}：命中率`, sF: (h, n) => `<b>= 命中 ${h} ÷ 访问 ${n}</b>`,
      sAfterF: (h) => `换话题后的前 15 个 token 命中 ${h} 次`,
      sRuleK: '衰减计数的规则（来自 Strata）', sRuleV: '× 0.7',
      sRuleF: '<b>次数 ≥ 2</b> 才有资格换入；<br>比最冷的驻留专家多 <b>1.5</b> 以上才换；<br>每次调整后所有次数 × 0.7，<br>约每调整 2 次减半',
      verdict: (r, a) => `① 总命中率：LRU <b>${r.lru}</b>，LFU <b>${r.lfu}</b>，衰减计数 <b>${r.decay}</b>。<br>② 换话题后的前 15 个 token：LRU 命中 <b>${a.lru}</b> 次，反应最快；LFU 只有 <b>${a.lfu}</b> 次，被旧话题攒下的大次数拖住；衰减计数 <b>${a.decay}</b> 次，慢几步但会跟上。<br>③ 衰减计数平时不乱动，偶尔的冷门 token 冲不掉热门专家；旧次数每次调整乘 0.7，又不会永远压着新热门。这就是“记性”和“忘性”的折中。`,
      try: [
        '按 <b>跑完 60 个</b>，看下方三条小格：第 30 个 token 之后，哪一条暗了最久？那就是适应新话题最慢的策略。',
        '把 <b>冷门插曲</b> 打开再跑：第 18–20 个 token 只选冷门专家。LRU 的槽位被冲掉一大片，衰减计数几乎不受影响。',
        '单步走到第 4、8、12 个 token，看终端里“衰减计数调整”那一行：资格线 2、领先 1.5、乘 0.7，三个数一起决定换谁。',
      ],

      wCode: 'SWAP_PROTOCOL', wTitle: '一次换入换出：先拷贝，后登记', wTag: '代码事实 · 简化成一个槽位',
      wIntro: '自适应缓存要把 #112 换进显存槽位 5，换出 #331。驻留表说“谁在哪个槽”，槽位里装的是真正的字节。按 <b>单步</b> 走一遍正确的顺序；再打开“错误顺序”，看提前登记会出什么事。',
      wLgOld: '#331 的字节（旧）', wLgNew: '#112 的字节（新）', wLgBad: '读到半新半旧的字节',
      wSteps: ['初始', '决定交换', '撤下 #331', '异步拷贝', '拷贝完成', '登记 #112'],
      tableLabel: '驻留表', slotLabel: '显存槽位 5', ramLabel: '内存里的完整副本', none: '无（CPU 算）', slot: '槽位 5',
      wBug: '错误顺序：关', wBugOn: '错误顺序：开（先登记，后拷贝）', wStep: '▶ 单步', wReset: '重置',
      wReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]',
      wLog: {
        init: '初始：槽位 5 装着 #331，驻留表写着 #331 → 槽位 5；#112 不在显存，被选中时由 CPU 用内存里的副本计算',
        decide: '决定交换：#112 最近的衰减计数比 #331 高出 1.5 以上，值得换',
        unmap: '先改表：#331 → 无。从这一刻起，#331 被选中就交给 CPU，没人再从槽位 5 读它',
        unmapBug: '<span class="m">错误顺序</span>：#331 → 无，同时提前写上 #112 → 槽位 5，可它的字节还没开始搬',
        copy: '在拷贝流上发起异步拷贝：#112 的字节经 PCIe 写进槽位 5，函数立刻返回，拷贝还在进行',
        event: '拷贝之后记录的“完成事件”到了：槽位 5 现在完整装着 #112',
        map: '再改表：#112 → 槽位 5。之后 #112 被选中，就由 GPU 读槽位 5 计算',
      },
      wRead: (who, ok) => `  这一步正好有 token 选中 #112 → 由 ${who === 'gpu' ? 'GPU 读槽位 5' : 'CPU 读内存副本'} 计算：${ok ? '<span class="c">结果正确</span>' : '<span class="m">读到半新半旧的字节，结果错了，而且不会报错</span>'}`,
      wReadShort: (who, ok) => `选中 #112 → ${who === 'gpu' ? 'GPU 读槽位 5' : 'CPU 读内存副本'}：${ok ? '结果正确' : '读到半新半旧，算错'}`,
      sTabK: '驻留表此刻', sTabF: '<b>表项 = 槽位号，或“无”</b><br>表说了算：GPU 只读表里登记的槽位',
      sSlotK: '槽位 5 里装着', sSlotF: '<b>拷贝是异步的</b><br>函数返回 ≠ 字节已到',
      sOkK: '本步计算结果', sOkF: '<b>正确条件</b>：登记的槽位里，<br>字节必须已经完整到位',
      slotOld: '#331（旧）', slotMixed: '一半 #112、一半 #331', slotNew: '#112（新）',
      okYes: '正确', okNo: '错误', okNa: '—',
      vGood: '正确顺序下，表项只在字节到齐之后才指向槽位：拷贝途中 #112 一直由 CPU 计算，每一步都对。Strata 的自适应缓存正是这样做的：先把换出的专家标成“不在显存”，拷贝完成的事件到了，才把换入的专家登记进表。',
      vBad: '提前登记以后，拷贝途中选中 #112 的 token 让 GPU 读到了半新半旧的槽位。程序不崩、也不报错，只是这个 token 算错了。这就是“标签对、字节错”的伪命中，统计上看命中率还更高。',
      wTry: [
        '用正确顺序单步走完：注意第 4 步拷贝进行中，#112 仍由 CPU 计算。',
        '打开 <b>错误顺序</b> 再走一遍：第 4 步结果变成“错误”。想一想，为什么这种错误很难靠看输出发现？',
        '对照第 3 步：为什么要<b>先</b>把 #331 撤下表，再开始往槽位里写？（提示：写的过程中谁还可能在读槽位 5？）',
      ],
    },
    en: {
      code: 'CACHE_RACE', title: 'Three replacement policies race', tag: 'Teaching estimate · one layer, 24 experts, 6 slots',
      intro: 'One layer shrunk to 24 experts: each token picks 4, and VRAM holds only 6. Three policies watch the same routing sequence. <b>LRU</b> evicts the expert unused for the longest time; <b>LFU</b> evicts the one with the lowest total count; <b>decayed count</b> imitates Strata: it sits still most of the time, adjusts once every 4 tokens, then multiplies every count by 0.7. From token 30 on, the topic changes from A to B, and a whole new group of experts becomes hot.',
      lgHot: 'Hot expert for the current topic', lgCold: 'Other experts', lgStrip: 'Cells below: hits per token (brighter = more)', lgShift: '┃ topic shift / cold burst',
      steps: ['Router picks 4 experts', 'Each cache looks them up', 'Count', 'Adjust every 4 tokens', 'Counts × 0.7'],
      names: { lru: 'LRU', lfu: 'LFU', decay: 'Decayed count' },
      routed: (t, topic, ids) => `token ${t} (topic ${topic}) picks: ${ids}`,
      stageLabel: 'VRAM slots of the three policies and hits per token',
      stripLabel: 'Hits per token (rows: LRU, LFU, decayed count)',
      bStep: '▶ Next token', bAll: '▶▶ Run all 60', bReset: 'Reset', bBurstOff: 'Cold burst: off', bBurstOn: 'Cold burst: on',
      ready: '<span class="c">$</span> ready. Press [ ▶ Next token ], or run them all',
      lTok: (t, topic, ids, a, b, c) => `<span class="c">[t${String(t).padStart(2, '0')}]</span> topic ${topic}, picks ${ids} → hits: LRU ${a}, LFU ${b}, decayed ${c}`,
      // The widget joins moves with a full-width comma (U+FF0C); show an English comma instead.
      lAdapt: (moves) => `<span class="y">  decayed-count adjustment</span>: ${moves ? moves.split('\uff0c').join(', ') : 'no swap qualifies'}; then every count × 0.7`,
      lMove: (inn, out) => out === null ? `load #${inn}` : `#${inn} replaces #${out}`,
      lShift: '<span class="m">// topic shift: from here on the hot experts are group B</span>',
      lBurst: '<span class="m">// cold burst: the next 3 tokens pick only cold experts</span>',
      lDone: '<span class="y">// all 60 tokens done</span>',
      sK: (n) => `${n}: hit rate`, sF: (h, n) => `<b>= ${h} hits ÷ ${n} accesses</b>`,
      sAfterF: (h) => `${h} hits in the first 15 tokens after the topic shift`,
      sRuleK: 'Decayed-count rules (from Strata)', sRuleV: '× 0.7',
      sRuleF: 'Needs a <b>count ≥ 2</b> to be a candidate;<br>swaps only if it leads the coldest resident by <b>1.5</b> or more;<br>after each adjustment every count × 0.7,<br>so a count halves about every 2 adjustments',
      verdict: (r, a) => `① Overall hit rate: LRU <b>${r.lru}</b>, LFU <b>${r.lfu}</b>, decayed count <b>${r.decay}</b>.<br>② In the first 15 tokens after the topic shift: LRU gets <b>${a.lru}</b> hits and reacts fastest; LFU gets only <b>${a.lfu}</b>, held back by the big counts the old topic built up; decayed count gets <b>${a.decay}</b>, a few steps slower but it catches up.<br>③ Decayed count stays still most of the time, so an occasional cold token cannot knock out the hot experts; and since old counts are multiplied by 0.7 at each adjustment, they cannot hold down a new favorite forever. This is the balance between remembering and forgetting.`,
      try: [
        'Press <b>Run all 60</b> and look at the three strips of cells below: after token 30, which one stays dark the longest? That is the policy slowest to adapt to the new topic.',
        'Turn <b>Cold burst</b> on and run again: tokens 18–20 pick only cold experts. LRU loses a large share of its slots; decayed count is barely affected.',
        'Step to tokens 4, 8 and 12 and read the "decayed-count adjustment" line in the terminal: the threshold of 2, the lead of 1.5 and the factor 0.7 together decide who gets swapped.',
      ],

      wCode: 'SWAP_PROTOCOL', wTitle: 'One swap in and out: copy first, register after', wTag: 'Code fact · simplified to one slot',
      wIntro: 'The adaptive cache wants to swap #112 into VRAM slot 5 and swap #331 out. The residency table says "who is in which slot"; the slot holds the real bytes. Press <b>Step</b> to walk through the correct order; then turn on "Wrong order" and see what goes wrong when you register too early.',
      wLgOld: 'bytes of #331 (old)', wLgNew: 'bytes of #112 (new)', wLgBad: 'read half-new, half-old bytes',
      wSteps: ['Start', 'Decide to swap', 'Unmap #331', 'Async copy', 'Copy done', 'Map #112'],
      tableLabel: 'Residency table', slotLabel: 'VRAM slot 5', ramLabel: 'Full copy in RAM', none: 'none (CPU)', slot: 'slot 5',
      wBug: 'Wrong order: off', wBugOn: 'Wrong order: on (register, then copy)', wStep: '▶ Step', wReset: 'Reset',
      wReady: '<span class="c">$</span> ready. Press [ ▶ Step ]',
      wLog: {
        init: 'Start: slot 5 holds #331, and the residency table says #331 → slot 5; #112 is not in VRAM, so when picked the CPU computes it from the copy in RAM',
        decide: 'Decide to swap: #112\'s recent decayed count leads #331\'s by more than 1.5, so the swap is worth it',
        unmap: 'Change the table first: #331 → none. From this moment, if #331 is picked it goes to the CPU, and nobody reads it from slot 5 any more',
        unmapBug: '<span class="m">Wrong order</span>: #331 → none, and #112 → slot 5 is written early at the same time, but its bytes have not started moving yet',
        copy: 'Start an async copy on the copy stream: #112\'s bytes travel over PCIe into slot 5; the function returns at once while the copy is still running',
        event: 'The "copy done" event recorded after the copy arrives: slot 5 now holds all of #112',
        map: 'Now change the table: #112 → slot 5. From now on, when #112 is picked the GPU reads slot 5 and computes it',
      },
      wRead: (who, ok) => `  a token picks #112 at this very step → computed by ${who === 'gpu' ? 'the GPU reading slot 5' : 'the CPU reading the RAM copy'}: ${ok ? '<span class="c">result correct</span>' : '<span class="m">it read half-new, half-old bytes; the result is wrong, and nothing reports an error</span>'}`,
      wReadShort: (who, ok) => `#112: ${who === 'gpu' ? 'GPU reads slot 5' : 'CPU reads RAM copy'} → ${ok ? 'correct' : 'mixed bytes, wrong'}`,
      sTabK: 'Residency table now', sTabF: '<b>entry = slot number, or "none"</b><br>the table rules: the GPU reads only the slot the table names',
      sSlotK: 'Slot 5 holds', sSlotF: '<b>the copy is asynchronous</b><br>function returned ≠ bytes arrived',
      sOkK: 'Result of this step', sOkF: '<b>Correct only if</b> the bytes in the registered<br>slot have fully arrived',
      slotOld: '#331 (old)', slotMixed: 'half #112, half #331', slotNew: '#112 (new)',
      okYes: 'Correct', okNo: 'Wrong', okNa: '—',
      vGood: 'In the correct order, a table entry points to a slot only after all the bytes have arrived: during the copy, #112 is always computed by the CPU, and every step is right. Strata\'s adaptive cache does exactly this: it first marks the outgoing expert "not in VRAM", and registers the incoming expert in the table only when the copy-done event arrives.',
      vBad: 'After registering early, a token that picked #112 during the copy made the GPU read a half-new, half-old slot. The program does not crash or report an error; that token is simply computed wrong. This is a fake hit with "right label, wrong bytes", and on paper the hit rate even looks higher.',
      wTry: [
        'Step through in the correct order: note that at step 4, while the copy is running, #112 is still computed by the CPU.',
        'Turn on <b>Wrong order</b> and walk through again: at step 4 the result becomes "Wrong". Think about it: why is this kind of error hard to spot by looking at the output?',
        'Look at step 3: why remove #331 from the table <b>first</b>, before starting to write into the slot? (Hint: during the write, who else might be reading slot 5?)',
      ],
    },
    ja: {
      code: 'CACHE_RACE', title: '3 つの置換方式のレース', tag: '教育用の試算 · 1 層、エキスパート 24 個、スロット 6 個',
      intro: '1 つの層を、エキスパート 24 個に縮めます。各トークンは 4 個を選び、VRAM に置けるのは 6 個だけです。3 つの方式が、同じルーティングの列を見ます。<b>LRU</b> は、いちばん長く使われていないものを外します。<b>LFU</b> は、通算の回数がいちばん少ないものを外します。<b>減衰カウント</b>は Strata をまねています。ふだんは動かず、4 トークンごとに 1 回調整し、そのあと全部の回数に 0.7 を掛けます。30 個目のトークンから話題が A から B に変わり、人気のエキスパートがごっそり入れ替わります。',
      lgHot: '今の話題で人気のエキスパート', lgCold: 'ほかのエキスパート', lgStrip: '下の小さなマス：トークンごとのヒット数（明るいほど多い）', lgShift: '┃ 話題の切り替え / 不人気の割り込み',
      steps: ['ルーターが 4 個を選ぶ', '3 つのキャッシュが検索', '回数を記録', '4 トークンごとに調整', '回数 × 0.7'],
      names: { lru: 'LRU', lfu: 'LFU', decay: '減衰カウント' },
      routed: (t, topic, ids) => `token ${t}（話題 ${topic}）：${ids}`,
      stageLabel: '3 つの方式の VRAM スロットと、トークンごとのヒット状況',
      stripLabel: 'トークンごとのヒット数（上から LRU、LFU、減衰カウント）',
      bStep: '▶ 次のトークン', bAll: '▶▶ 60 個を最後まで', bReset: 'リセット', bBurstOff: '不人気の割り込み：オフ', bBurstOn: '不人気の割り込み：オン',
      ready: '<span class="c">$</span> ready. [ ▶ 次のトークン ] を押すか、最後まで一気に走らせてください',
      lTok: (t, topic, ids, a, b, c) => `<span class="c">[t${String(t).padStart(2, '0')}]</span> 話題 ${topic}、選択 ${ids} → ヒット：LRU ${a}、LFU ${b}、減衰 ${c}`,
      // The widget joins moves with a full-width comma (U+FF0C); show a Japanese enumeration comma instead.
      lAdapt: (moves) => `<span class="y">  減衰カウントの調整</span>：${moves ? moves.split('，').join('、') : '条件を満たす入れ替えなし'}。そのあと全部の回数 × 0.7`,
      lMove: (inn, out) => out === null ? `#${inn} を入れる` : `#${inn} が #${out} と交代`,
      lShift: '<span class="m">// 話題の切り替え：ここから人気のエキスパートは B グループ</span>',
      lBurst: '<span class="m">// 不人気の割り込み：次の 3 トークンは不人気のエキスパートだけを選ぶ</span>',
      lDone: '<span class="y">// 60 トークン終了</span>',
      sK: (n) => `${n}：ヒット率`, sF: (h, n) => `<b>= ヒット ${h} ÷ アクセス ${n}</b>`,
      sAfterF: (h) => `話題が変わった後の最初の 15 トークンで ${h} 回ヒット`,
      sRuleK: '減衰カウントのルール（Strata より）', sRuleV: '× 0.7',
      sRuleF: '<b>回数 2 以上</b>で入れ替えの候補になる。<br>常駐の最も冷たいエキスパートより <b>1.5</b> 以上多いときだけ交代。<br>調整のたびに全部の回数 × 0.7。<br>約 2 回の調整で半分になる',
      verdict: (r, a) => `① 総ヒット率：LRU <b>${r.lru}</b>、LFU <b>${r.lfu}</b>、減衰カウント <b>${r.decay}</b>。<br>② 話題が変わった後の最初の 15 トークン：LRU は <b>${a.lru}</b> 回ヒットで、反応がいちばん速いです。LFU は <b>${a.lfu}</b> 回だけ。古い話題でためた大きな回数に足を引っ張られます。減衰カウントは <b>${a.decay}</b> 回で、数歩遅れますが追いつきます。<br>③ 減衰カウントはふだんむやみに動かないので、たまに来る不人気トークンで人気のエキスパートが追い出されません。古い回数は調整のたびに 0.7 倍になるため、新しい人気者をいつまでも押さえつけることもありません。「覚えること」と「忘れること」のバランスです。`,
      try: [
        '<b>60 個を最後まで</b>を押して、下の 3 本の小さなマスを見ましょう。30 個目のトークンの後、いちばん長く暗いままなのはどれでしょうか。新しい話題への適応がいちばん遅い方式です。',
        '<b>不人気の割り込み</b>をオンにして、もう一度走らせます。18〜20 個目のトークンは不人気のエキスパートだけを選びます。LRU はスロットの大半を失い、減衰カウントはほとんど影響を受けません。',
        '4、8、12 個目のトークンまで 1 歩ずつ進み、ターミナルの「減衰カウントの調整」の行を読みましょう。資格ライン 2、リード 1.5、掛け率 0.7。この 3 つの数字で、誰を入れ替えるかが決まります。',
      ],

      wCode: 'SWAP_PROTOCOL', wTitle: '入れ替え 1 回：先にコピー、あとで登録', wTag: 'コード上の事実 · スロット 1 つに単純化',
      wIntro: '適応キャッシュが、#112 を VRAM のスロット 5 に入れ、#331 を外そうとしています。常駐テーブルは「誰がどのスロットにいるか」を示し、スロットの中には本物のバイトが入っています。<b>1 歩進む</b>を押して、正しい順序を 1 回たどりましょう。そのあと「誤った順序」をオンにして、早く登録するとどうなるかを見てください。',
      wLgOld: '#331 のバイト（古い）', wLgNew: '#112 のバイト（新しい）', wLgBad: '新旧が半分ずつ混ざったバイトを読んだ',
      wSteps: ['初期', '入れ替えを決定', '#331 を外す', '非同期コピー', 'コピー完了', '#112 を登録'],
      tableLabel: '常駐テーブル', slotLabel: 'VRAM スロット 5', ramLabel: 'RAM にある完全なコピー', none: 'なし（CPU）', slot: 'スロット 5',
      wBug: '誤った順序：オフ', wBugOn: '誤った順序：オン（先に登録、あとでコピー）', wStep: '▶ 1 歩進む', wReset: 'リセット',
      wReady: '<span class="c">$</span> ready. [ ▶ 1 歩進む ] を押してください',
      wLog: {
        init: '初期：スロット 5 には #331 が入っていて、常駐テーブルには #331 → スロット 5 と書いてあります。#112 は VRAM にいないので、選ばれたときは CPU が RAM のコピーで計算します',
        decide: '入れ替えを決定：#112 の最近の減衰カウントが #331 を 1.5 以上上回っているので、入れ替える価値があります',
        unmap: '先にテーブルを書き換えます：#331 → なし。この瞬間から、#331 が選ばれたら CPU に回します。スロット 5 から #331 を読む人はもういません',
        unmapBug: '<span class="m">誤った順序</span>：#331 → なし。同時に #112 → スロット 5 も先に書き込みます。でも #112 のバイトはまだ運び始めていません',
        copy: 'コピー用ストリームで非同期コピーを開始：#112 のバイトが PCIe を通ってスロット 5 に書き込まれます。関数はすぐ戻りますが、コピーはまだ続いています',
        event: 'コピーの後ろに記録した「完了イベント」が届きました：スロット 5 には #112 が丸ごと入っています',
        map: 'ここでテーブルを書き換えます：#112 → スロット 5。以後 #112 が選ばれたら、GPU がスロット 5 を読んで計算します',
      },
      wRead: (who, ok) => `  このステップでちょうど #112 を選んだトークンがある → ${who === 'gpu' ? 'GPU がスロット 5 を読んで' : 'CPU が RAM のコピーを読んで'}計算：${ok ? '<span class="c">結果は正しい</span>' : '<span class="m">新旧が半分ずつ混ざったバイトを読み、結果が間違い。しかもエラーは出ません</span>'}`,
      wReadShort: (who, ok) => `#112：${who === 'gpu' ? 'GPU がスロット 5 を読む' : 'CPU が RAM のコピーを読む'} → ${ok ? '正しい' : '新旧混在で誤り'}`,
      sTabK: '今の常駐テーブル', sTabF: '<b>項目 ＝ スロット番号、または「なし」</b><br>決めるのはテーブル。GPU は、テーブルに登録されたスロットだけを読む',
      sSlotK: 'スロット 5 の中身', sSlotF: '<b>コピーは非同期</b><br>関数が戻った ≠ バイトが届いた',
      sOkK: 'このステップの計算結果', sOkF: '<b>正しくなる条件</b>：登録したスロットに、<br>バイトが丸ごと届いていること',
      slotOld: '#331（古い）', slotMixed: '#112 が半分、#331 が半分', slotNew: '#112（新しい）',
      okYes: '正しい', okNo: '誤り', okNa: '—',
      vGood: '正しい順序では、バイトが全部届いてから、はじめてテーブルの項目がスロットを指します。コピーの途中、#112 はずっと CPU が計算するので、どのステップも正しいままです。Strata の適応キャッシュはまさにこの方法です。まず外すエキスパートを「VRAM にいない」にし、コピー完了イベントが届いてから、入れるエキスパートをテーブルに登録します。',
      vBad: '早く登録したせいで、コピーの途中に #112 を選んだトークンでは、GPU が新旧半分ずつのスロットを読みました。プログラムは落ちず、エラーも出ません。そのトークンだけが静かに間違います。これが「ラベルは正しいのにバイトが誤り」という偽のヒットです。統計の上では、ヒット率はむしろ高く見えます。',
      wTry: [
        '正しい順序で 1 歩ずつ最後まで進みましょう。4 番目のステップ、コピーの途中でも #112 は CPU が計算していることに注目してください。',
        '<b>誤った順序</b>をオンにして、もう一度たどります。4 番目のステップの結果が「誤り」に変わります。この種のエラーが、出力を見ただけでは見つけにくいのはなぜでしょうか。',
        '3 番目のステップを見てください。スロットに書き込み始める<b>前に</b>、#331 をテーブルから外すのはなぜでしょう。（ヒント：書き込みの最中に、スロット 5 を読みにくる人はいませんか。）',
      ],
    },
  });

  Viz.register('cache-race', {
    mount(el, ctx) {
      const D = M.DEFAULTS;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgHot, glow: true },
        { color: 'var(--frame)', text: T.lgCold },
        { color: 'var(--a2)', text: T.lgStrip },
        { color: 'var(--a3)', text: T.lgShift },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 282', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const kinds = ['lru', 'lfu', 'decay'];
      const routedText = Viz.svg('text', { x: 4, y: 16, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const slots = {}, rateText = {}, strip = {};
      kinds.forEach((k, r) => {
        const y = 40 + r * 60;
        Viz.svg('text', { x: 4, y, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = T.names[k];
        rateText[k] = Viz.svg('text', { x: 356, y, 'font-size': 13, 'text-anchor': 'end', style: 'fill:var(--accent)' }, svg);
        slots[k] = [];
        for (let s = 0; s < D.cap; s++) {
          const rect = Viz.svg('rect', { x: 4 + s * 59, y: y + 6, width: 55, height: 32, class: 'viz-cell' }, svg);
          const txt = Viz.svg('text', { x: 4 + s * 59 + 27.5, y: y + 27, 'font-size': 13, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
          slots[k].push({ rect, txt });
        }
      });
      const SX = 4, CWID = 5.85;
      Viz.svg('text', { x: 4, y: 222, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.stripLabel;
      kinds.forEach((k, r) => {
        const y = 230 + r * 16;
        strip[k] = [];
        for (let t = 0; t < D.tokens; t++) strip[k].push(Viz.svg('rect', { x: SX + t * CWID, y, width: CWID - 0.85, height: 13, class: 'viz-cell' }, svg));
      });
      const marks = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}${Viz.button(T.bBurstOff, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = kinds.map(k => Viz.stat({ id: 'p-' + k, k: T.sK(T.names[k]), v: '—', f: T.sF(0, 0), hot: k === 'decay' })).join('') +
        Viz.stat({ id: 'p-rule', k: T.sRuleK, v: T.sRuleV, f: T.sRuleF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn, burstBtn] = left.querySelectorAll('.viz-btn');
      let burst = false, trace, pol, t, hits, perToken, busy = false;

      function load() {
        trace = M.makeTrace({ seed: 3, burst });
        pol = Object.fromEntries(kinds.map(k => [k, M.makePolicy(k)]));
        hits = { lru: 0, lfu: 0, decay: 0 }; perToken = { lru: [], lfu: [], decay: [] }; t = 0;
        marks.innerHTML = '';
        const line = (x) => Viz.svg('rect', { x, y: 226, width: 2, height: 52, style: 'fill:var(--a3)' }, marks);
        line(SX + trace.shiftAt * CWID - 1.5);
        if (trace.burstAt >= 0) { line(SX + trace.burstAt * CWID - 1.5); line(SX + (trace.burstAt + 3) * CWID - 1.5); }
        burstBtn.textContent = burst ? T.bBurstOn : T.bBurstOff;
        $('.viz-verdict').hidden = true; pipe.set(-1); paint(null); stats();
      }
      const topicOf = i => (i < trace.shiftAt ? 'A' : 'B');
      const ids = arr => arr.map(e => '#' + String(e).padStart(2, '0')).join(' ');
      function paint(routed) {
        const hot = t > 0 && t - 1 >= trace.shiftAt ? trace.hotB : trace.hotA;
        routedText.textContent = routed ? T.routed(t, topicOf(t - 1), ids(routed)) : '';
        kinds.forEach(k => {
          const list = [...pol[k].resident()].sort((a, b) => a - b);
          slots[k].forEach((s, i) => {
            const e = list[i];
            s.txt.textContent = e === undefined ? '' : '#' + String(e).padStart(2, '0');
            s.rect.setAttribute('class', 'viz-cell' + (e !== undefined && hot.includes(e) ? ' pick' : ''));
            s.txt.style.fill = e !== undefined && hot.includes(e) ? 'var(--paper)' : 'var(--ink)';
          });
          strip[k].forEach((r, i) => {
            if (i < perToken[k].length) { r.setAttribute('class', 'viz-cell score'); r.style.opacity = 0.12 + 0.88 * perToken[k][i] / M.DEFAULTS.k; }
            else { r.setAttribute('class', 'viz-cell'); r.style.opacity = 1; }
          });
        });
      }
      const pct = (h, n) => (n ? Math.round(h / n * 100) : 0) + '%';
      const after = k => perToken[k].slice(trace.shiftAt, trace.shiftAt + 15).reduce((a, b) => a + b, 0);
      function stats() {
        const n = t * M.DEFAULTS.k;
        kinds.forEach(k => {
          $(`[data-s=p-${k}-v]`).textContent = t ? pct(hits[k], n) : '—';
          $(`[data-s=p-${k}-f]`).innerHTML = T.sF(hits[k], n) + (t > trace.shiftAt ? '<br>' + T.sAfterF(after(k)) : '');
          rateText[k].textContent = t ? pct(hits[k], n) : '';
        });
      }
      async function step(fast) {
        if (t >= trace.tokens.length) return;
        const routed = trace.tokens[t];
        if (!fast) { if (t === trace.shiftAt) term.log(T.lShift); if (t === trace.burstAt) term.log(T.lBurst); }
        if (!fast) { pipe.set(0); await ctx.sleep(90); pipe.set(1); }
        const res = {};
        kinds.forEach(k => { res[k] = pol[k].token(routed); hits[k] += res[k].hits; perToken[k].push(res[k].hits); });
        t++;
        if (!fast) {
          await ctx.sleep(90); pipe.set(2);
          term.log(T.lTok(t, topicOf(t - 1), ids(routed), res.lru.hits, res.lfu.hits, res.decay.hits));
          if (res.decay.adapted) {
            await ctx.sleep(90); pipe.set(3); await ctx.sleep(90); pipe.set(4);
            term.log(T.lAdapt(res.decay.swaps.map(([a, b]) => T.lMove(String(a).padStart(2, '0'), b === null ? null : String(b).padStart(2, '0'))).join('，')));
          }
        }
        paint(routed); stats();
        if (t === trace.tokens.length) finish();
      }
      function finish() {
        term.log(T.lDone);
        const n = t * M.DEFAULTS.k;
        const v = $('.viz-verdict');
        v.innerHTML = T.verdict({ lru: pct(hits.lru, n), lfu: pct(hits.lfu, n), decay: pct(hits.decay, n) }, { lru: after('lru'), lfu: after('lfu'), decay: after('decay') });
        v.hidden = false;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      stepBtn.onclick = () => guard(async () => { if (t >= trace.tokens.length) load(); await step(false); });
      allBtn.onclick = () => guard(async () => {
        if (t >= trace.tokens.length) load();
        while (t < trace.tokens.length) { await step(true); await ctx.sleep(25); }
      });
      resetBtn.onclick = () => guard(async () => { load(); term.clear(); term.log(T.ready); });
      burstBtn.onclick = () => guard(async () => { burst = !burst; load(); term.clear(); term.log(T.ready); });
      load();
    },
  });

  Viz.register('expert-swap', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.wCode, title: T.wTitle, tag: T.wTag, intro: T.wIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.wLgOld },
        { color: 'var(--accent)', text: T.wLgNew, glow: true },
        { color: 'var(--a2)', text: T.wLgBad },
      ]));
      const pipe = Viz.pipe(body, T.wSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 206', class: 'viz-stage', role: 'img', 'aria-label': T.wTitle }, left);
      const tx = (x, y, s, size, fill, anchor) => { const e = Viz.svg('text', { x, y, 'font-size': size || 13, 'text-anchor': anchor || 'start', style: `fill:${fill || 'var(--ink)'}` }, svg); e.textContent = s; return e; };
      tx(4, 14, T.tableLabel, 12, 'var(--muted)');
      Viz.svg('rect', { x: 4, y: 20, width: 186, height: 32, class: 'viz-cell' }, svg);
      Viz.svg('rect', { x: 4, y: 56, width: 186, height: 32, class: 'viz-cell' }, svg);
      const t331 = tx(12, 41, ''), t112 = tx(12, 77, '');
      tx(200, 14, T.ramLabel, 12, 'var(--muted)');
      Viz.svg('rect', { x: 200, y: 20, width: 156, height: 32, class: 'viz-cell' }, svg);
      Viz.svg('rect', { x: 200, y: 56, width: 156, height: 32, class: 'viz-cell' }, svg);
      tx(278, 41, '#331', 13, 'var(--ink)', 'middle'); tx(278, 77, '#112', 13, 'var(--ink)', 'middle');
      tx(4, 108, T.slotLabel, 12, 'var(--muted)');
      Viz.svg('rect', { x: 4, y: 114, width: 352, height: 36, class: 'viz-cell' }, svg);
      const fillNew = Viz.svg('rect', { x: 4, y: 114, width: 0, height: 36, style: 'fill:var(--accent)' }, svg);
      const slotText = tx(180, 137, '', 13, 'var(--ink)', 'middle');
      const arrow = Viz.svg('path', { d: 'M278 90V112', style: 'stroke:var(--accent);stroke-width:3;fill:none', opacity: 0 }, svg);
      const readBox = Viz.svg('rect', { x: 4, y: 160, width: 352, height: 40, class: 'viz-cell' }, svg);
      const readText = tx(180, 185, '', 13, 'var(--ink)', 'middle');
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.wStep)}${Viz.button(T.wReset, 'ghost')}${Viz.button(T.wBug, 'ghost')}</div>`);
      const term = Viz.term(left, T.wReady);
      right.innerHTML = Viz.stat({ id: 'w-tab', k: T.sTabK, v: '—', f: T.sTabF }) + Viz.stat({ id: 'w-slot', k: T.sSlotK, v: '—', f: T.sSlotF }) + Viz.stat({ id: 'w-ok', k: T.sOkK, v: '—', f: T.sOkF, hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.wTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, resetBtn, bugBtn] = left.querySelectorAll('.viz-btn');
      let bug = false, steps, i, anyWrong;
      const slotName = n => (n >= 0 ? T.slot : T.none);
      function load() {
        steps = M.swapTimeline(bug); i = 0; anyWrong = false;
        bugBtn.textContent = bug ? T.wBugOn : T.wBug;
        bugBtn.className = 'viz-btn ' + (bug ? 'alt' : 'ghost');
        $('.viz-verdict').hidden = true; pipe.set(-1); paint(null);
        term.clear(); term.log(T.wReady);
      }
      function paint(s) {
        const st = s || steps[0];
        t331.textContent = '#331 → ' + slotName(st.table331);
        t112.textContent = '#112 → ' + slotName(st.table112);
        fillNew.setAttribute('width', 352 * st.copied);
        slotText.textContent = st.copied === 0 ? T.slotOld : st.copied < 1 ? T.slotMixed : T.slotNew;
        slotText.style.fill = st.copied === 1 ? 'var(--paper)' : 'var(--ink)';
        arrow.setAttribute('opacity', s && s.key === 'copy' ? 1 : 0);
        readBox.setAttribute('class', 'viz-cell' + (s && s.reads112 ? (s.correct ? ' pick' : ' score') : ''));
        readText.textContent = s && s.reads112 ? T.wReadShort(s.who112, s.correct) : '';
        readText.style.fill = s && s.reads112 ? 'var(--paper)' : 'var(--ink)';
        $('[data-s=w-tab-v]').textContent = s ? (st.table112 >= 0 ? '#112 → 5' : '#112 → —') : '—';
        $('[data-s=w-slot-v]').textContent = s ? slotText.textContent : '—';
        $('[data-s=w-ok-v]').textContent = s && s.reads112 ? (s.correct ? T.okYes : T.okNo) : T.okNa;
      }
      stepBtn.onclick = () => {
        if (i >= steps.length) load();
        const s = steps[i];
        pipe.set(i);
        term.log((s.key === 'unmap' && bug ? T.wLog.unmapBug : T.wLog[s.key]));
        if (s.reads112) term.log(T.wRead(s.who112, s.correct));
        if (!s.correct) anyWrong = true;
        paint(s);
        i++;
        if (i === steps.length) { const v = $('.viz-verdict'); v.textContent = anyWrong ? T.vBad : T.vGood; v.hidden = false; }
      };
      resetBtn.onclick = () => load();
      bugBtn.onclick = () => { bug = !bug; load(); };
      load();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
