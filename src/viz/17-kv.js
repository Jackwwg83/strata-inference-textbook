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
      intro: '选上下文长度、KV 格式和要保留的对话数，看字节数怎样变。Strata 的服务一次只跑<b>一段</b>对话；其余对话可以把状态“停放”在内存里。注意看同一个字节数写成 <b>GB</b> 和 <b>GiB</b> 时差多少。',
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
      intro: 'Pick a context length, a KV format and how many conversations to keep, and watch the bytes change. Strata\'s server runs only <b>one</b> conversation at a time; the others can "park" their state in RAM. Notice how far apart the same byte count is when written in <b>GB</b> and in <b>GiB</b>.',
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
    ja: {
      code: 'KV_BUDGET', title: 'KV 予算計算機', tag: '教育用の試算 · メイン KV と GDN 状態のみ',
      intro: 'コンテキスト長、KV の形式、残しておく会話の数を選んで、バイト数の変化を見ましょう。Strata のサーバーは同時に<b>1 つ</b>の会話しか実行しません。ほかの会話は、状態を RAM に「駐車」できます。同じバイト数を <b>GB</b> と <b>GiB</b> で書くと、どれだけ差が出るかにも注目してください。',
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
