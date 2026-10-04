/* Chapter 09 widgets: a 2 x 2 delta-rule memory, and the scalar GDN step in the right and the wrong order.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.gdn;

  const T = Viz.t({
    zh: {
      code: 'DELTA_MEMORY', title: '2 × 2 的白板：Delta 规则怎样写和读', tag: '教学推演 · 真实状态是 128 × 128 × 48 个头',
      intro: '白板 S 只有 2 × 2 = 4 个数，却要记住“键 → 值”的对应。三个键：苹果 [1, 0]、香蕉 [0, 1]、橙子 [0.6, 0.8]（它和前两个都有重叠）。按写入按钮，看四步怎样改白板；按读出按钮，看能不能读回最后写进去的值。',
      lgCell: '白板 S 的一个数（越亮绝对值越大）', lgNeg: '负数', lgHit: '这一步刚改动的格子',
      steps: ['衰减 S̄ = αS', '读旧值 v̂ = S̄ᵀk', '算差额 δ = β(v − v̂)', '写入 S = S̄ + kδᵀ'],
      stage: '2 乘 2 的状态矩阵、键向量和本步的中间量',
      title2: '白板 S：每行对应键的一维，每列对应值的一维',
      colH: ['值维 1', '值维 2'], keyH: 'k',
      keyNames: ['苹果', '香蕉', '橙子'],
      writes: ['写 苹果 → [2, 3]', '写 香蕉 → [1, 4]', '改写 苹果 → [5, 1]', '写 橙子 → [3, 3]'],
      reads: ['读 苹果', '读 香蕉', '读 橙子'],
      bReset: '清空白板',
      ruleDelta: 'Delta 规则（GDN 用的）', ruleHebb: '纯加法（对照组）', ruleLabel: '写入规则',
      aLabel: '衰减 α', bLabel: '写入强度 β',
      ready: '<span class="c">$</span> 白板全是 0。先按 [ 写 苹果 → [2, 3] ]',
      l0: (a, name) => `<span class="c">[写 ${name}]</span> ① 衰减：整块白板乘 α = ${a}，${a < 1 ? '旧记忆先打个折' : '这次不打折'}`,
      l1: (v) => `② 读旧值：v̂ = S̄ᵀk = [${v}]，白板上这个键原来存着什么`,
      l2: (d, b) => `③ 算差额：δ = β(v − v̂) = ${b} × (目标 − 旧值) = [${d}]，只写<b>差多少</b>`,
      l3: '<span class="y">④ 写入</span>：S = S̄ + k δᵀ，一次外积改动整块白板',
      h1: '<span class="m">② 纯加法</span>：不读旧值',
      h2: (v) => `③ 直接把 v = [${v}] 当作要写的量`,
      h3: '<span class="y">④ 写入</span>：S = S̄ + k vᵀ，新旧内容叠在一起',
      rd: (name, r, want) => `<span class="c">[读 ${name}]</span> Sᵀk = [${r}]${want ? `，最后写进去的是 [${want}]` : '，还没写过它'}`,
      line1: (vh, d) => `v̂ = [${vh}]　δ = [${d}]`,
      line2: (r) => `读出 = [${r}]`,
      sReadK: '最近一次读出', sReadF: '<b>= Sᵀk</b>：每列和 k 做点积',
      sErrK: '和最后写入值的差距', sErrF: '<b>= |读出 − 最后写入|</b>（取最大的一维）',
      sSizeK: '白板大小（不随写入次数变化）', sSizeF: '<b>玩具：2 × 2 个数</b><br>真实每层：128 × 128 × 48 个头 × 4 字节 = 3 MiB',
      vOk: (name, r) => `读回 <b>${name}</b> 得到 [${r}]，正是最后一次写进去的值。Delta 规则先读出旧值，只写差额，所以同一个键反复改写也不会越叠越多。`,
      vBad: (name, r, w) => `读回 <b>${name}</b> 得到 [${r}]，可最后写进去的是 [${w}]。白板只有 4 个数，内容会互相干扰：旧值没被扣掉（纯加法），或者 α、β 让写入不完整。`,
      vNone: (name) => `还没写过 <b>${name}</b>。读到的是白板上和它重叠的其他内容。`,
      try: [
        '依次按 <b>写 苹果</b>、<b>改写 苹果</b>、<b>读 苹果</b>：Delta 规则读回 [5, 1]。切到 <b>纯加法</b> 重做一遍：读回 [7, 4]，新旧值叠在了一起。',
        '写苹果、写香蕉，再 <b>写 橙子</b>，然后读三个键：橙子读得准，苹果和香蕉却被改了。4 个数装不下三组互相重叠的记忆，这就是“固定大小 = 有损”。',
        '把 <b>α</b> 拉到 0.5 再连续写：每写一次，旧内容先缩一半。α 越小，忘得越快；α = 0 等于每次都从空白板开始。',
      ],

      oCode: 'GDN_ORDER', oTitle: '顺序真的重要：先衰减，还是先写入', oTag: '精确计算 · 一维标量',
      oIntro: '把白板缩成一个数。同一组参数，按两种顺序各算一遍：<b>契约</b>是先衰减再写入；常见的笔误是先写入再衰减。按 <b>单步</b>，两边同时往下走。',
      oLgOk: '先衰减再写入（GDN 的契约）', oLgBad: '先写入再衰减（错误顺序）', oLgS: '起始状态 S',
      oSteps: ['衰减 / 预测', '预测 / 差额', '差额 / 写入', '写入 / 衰减', '读出'],
      sl: { S: '旧状态 S', alpha: '衰减 α', k: '键 k', v: '值 v', beta: '写入强度 β' },
      presets: ['课本例子', 'α = 0', 'β = 0', 'k = 0'],
      sep: '，',
      pv: [{ S: 2, alpha: 0.5, k: 1, v: 3, beta: 0.25 }, { S: 2, alpha: 0, k: 1, v: 3, beta: 0.25 }, { S: 2, alpha: 0.5, k: 1, v: 3, beta: 0 }, { S: 2, alpha: 0.5, k: 0, v: 3, beta: 0.25 }],
      bStep: '▶ 单步', bAll: '▶▶ 算完', oStage: '数轴：起始状态与两种顺序得到的新状态',
      ok: ['S̄ = α · S', 'v̂ = S̄ · k', 'δ = β (v − v̂)', 'S′ = S̄ + k · δ', 'o = S′ · q'],
      bad: ['v̂ = S · k', 'δ = β (v − v̂)', 'S_w = S + k · δ', 'S′ = α · S_w', 'o = S′ · q'],
      oReady: '<span class="c">$</span> 选一个预设，或拖动滑块，然后按 [ ▶ 单步 ]（q 固定为 1）',
      oLog: (i, a, b) => `<span class="c">[第 ${i} 步]</span> 契约：${a}　｜　错序：<span class="m">${b}</span>`,
      sOkK: '契约顺序的新状态', sBadK: '错误顺序的新状态', sDiffK: '两者相差',
      sDiffF: '<b>= 错序 − 契约</b><br>两个结果都是正常的有限数，不会报错',
      oVerdictSame: (s) => `这组参数下两种顺序碰巧一样（都是 ${s}）。试试“课本例子”：只要 α ≠ 1 且真的写入了东西，结果就会不同。`,
      oVerdict: (a, b) => `契约顺序得到 <b>${a}</b>，错误顺序得到 <b>${b}</b>。错序会把刚写进去的新信息也乘上 α，等于“刚记下就忘一部分”。两个数都合理、有限、不越界，只有一个符合模型。`,
      oTry: [
        '点 <b>课本例子</b>，连按单步：契约顺序得 1.5，错误顺序得 1.125。差在第 4 步，新写入的 0.25 也被打了五折。',
        '点 <b>α = 0</b>：契约顺序先把旧记忆清零，再写入 β·v = 0.75；错误顺序最后整个乘 0，什么都没留下。',
        '点 <b>β = 0</b> 或 <b>k = 0</b>：没有任何写入，两种顺序都只剩衰减，结果相同。边界情况最适合拿来写测试。',
      ],
    },
    en: {
      code: 'DELTA_MEMORY', title: 'A 2 × 2 whiteboard: how the Delta rule writes and reads', tag: 'Teaching estimate · the real state is 128 × 128 × 48 heads',
      intro: 'Whiteboard S has only 2 × 2 = 4 numbers, yet it must remember "key → value" pairs. Three keys: apple [1, 0], banana [0, 1], orange [0.6, 0.8] (it overlaps both of the others). Press a write button to see how the four steps change the board; press a read button to see whether you get back the value written last.',
      lgCell: 'One number of whiteboard S (brighter = larger magnitude)', lgNeg: 'Negative', lgHit: 'Cells changed in this step',
      steps: ['Decay S̄ = αS', 'Read old v̂ = S̄ᵀk', 'Difference δ = β(v − v̂)', 'Write S = S̄ + kδᵀ'],
      stage: 'The 2-by-2 state matrix, the key vector and this step\'s intermediate values',
      title2: 'Board S: rows = key dims, cols = value dims',
      colH: ['value 1', 'value 2'], keyH: 'k',
      keyNames: ['apple', 'banana', 'orange'],
      writes: ['Write apple → [2, 3]', 'Write banana → [1, 4]', 'Rewrite apple → [5, 1]', 'Write orange → [3, 3]'],
      reads: ['Read apple', 'Read banana', 'Read orange'],
      bReset: 'Clear the board',
      ruleDelta: 'Delta rule (what GDN uses)', ruleHebb: 'Plain addition (control)', ruleLabel: 'Write rule',
      aLabel: 'Decay α', bLabel: 'Write strength β',
      ready: '<span class="c">$</span> the board is all 0. Start with [ Write apple → [2, 3] ]',
      l0: (a, name) => `<span class="c">[write ${name}]</span> ① decay: multiply the whole board by α = ${a}; ${a < 1 ? 'old memories are discounted first' : 'no discount this time'}`,
      l1: (v) => `② read the old value: v̂ = S̄ᵀk = [${v}], what the board held for this key`,
      l2: (d, b) => `③ difference: δ = β(v − v̂) = ${b} × (target − old value) = [${d}]; write only <b>how far off</b> it is`,
      l3: '<span class="y">④ write</span>: S = S̄ + k δᵀ; one outer product changes the whole board',
      h1: '<span class="m">② plain addition</span>: no reading of the old value',
      h2: (v) => `③ use v = [${v}] directly as the amount to write`,
      h3: '<span class="y">④ write</span>: S = S̄ + k vᵀ; old and new content pile up',
      rd: (name, r, want) => `<span class="c">[read ${name}]</span> Sᵀk = [${r}]${want ? `; the value written last is [${want}]` : '; nothing written for it yet'}`,
      line1: (vh, d) => `v̂ = [${vh}]　δ = [${d}]`,
      line2: (r) => `read = [${r}]`,
      sReadK: 'Latest read', sReadF: '<b>= Sᵀk</b>: dot each column with k',
      sErrK: 'Gap to the value written last', sErrF: '<b>= |read − last write|</b> (largest dimension)',
      sSizeK: 'Board size (does not change with writes)', sSizeF: '<b>Toy: 2 × 2 numbers</b><br>Real, per layer: 128 × 128 × 48 heads × 4 bytes = 3 MiB',
      vOk: (name, r) => `Reading <b>${name}</b> gives [${r}], exactly the value written last. The Delta rule reads the old value first and writes only the difference, so rewriting the same key again and again does not pile up.`,
      vBad: (name, r, w) => `Reading <b>${name}</b> gives [${r}], but the value written last is [${w}]. The board has only 4 numbers, so contents interfere: the old value was not subtracted (plain addition), or α and β made the write incomplete.`,
      vNone: (name) => `Nothing has been written for <b>${name}</b> yet. What you read is other content on the board that overlaps it.`,
      try: [
        'Press <b>Write apple</b>, <b>Rewrite apple</b>, <b>Read apple</b> in turn: the Delta rule reads back [5, 1]. Switch to <b>Plain addition</b> and do it again: it reads back [7, 4], with the old and new values piled together.',
        'Write apple, write banana, then <b>Write orange</b>, and read all three keys: orange reads back accurately, but apple and banana have changed. 4 numbers cannot hold three overlapping memories; that is "fixed size = lossy".',
        'Drag <b>α</b> to 0.5 and keep writing: before each write, the old content shrinks by half. The smaller α, the faster it forgets; α = 0 means starting from a blank board every time.',
      ],

      oCode: 'GDN_ORDER', oTitle: 'Order really matters: decay first, or write first?', oTag: 'Exact computation · 1-D scalar',
      oIntro: 'Shrink the whiteboard to one number. With the same parameters, compute in both orders: the <b>contract</b> is decay, then write; a common slip is write, then decay. Press <b>Step</b> and both sides advance together.',
      oLgOk: 'Decay, then write (GDN\'s contract)', oLgBad: 'Write, then decay (wrong order)', oLgS: 'Starting state S',
      oSteps: ['Decay / predict', 'Predict / difference', 'Difference / write', 'Write / decay', 'Read out'],
      sl: { S: 'Old state S', alpha: 'Decay α', k: 'Key k', v: 'Value v', beta: 'Write strength β' },
      presets: ['Textbook example', 'α = 0', 'β = 0', 'k = 0'],
      sep: ', ',
      pv: [{ S: 2, alpha: 0.5, k: 1, v: 3, beta: 0.25 }, { S: 2, alpha: 0, k: 1, v: 3, beta: 0.25 }, { S: 2, alpha: 0.5, k: 1, v: 3, beta: 0 }, { S: 2, alpha: 0.5, k: 0, v: 3, beta: 0.25 }],
      bStep: '▶ Step', bAll: '▶▶ Finish', oStage: 'Number line: the starting state and the new states from the two orders',
      ok: ['S̄ = α · S', 'v̂ = S̄ · k', 'δ = β (v − v̂)', 'S′ = S̄ + k · δ', 'o = S′ · q'],
      bad: ['v̂ = S · k', 'δ = β (v − v̂)', 'S_w = S + k · δ', 'S′ = α · S_w', 'o = S′ · q'],
      oReady: '<span class="c">$</span> pick a preset or drag the sliders, then press [ ▶ Step ] (q is fixed at 1)',
      oLog: (i, a, b) => `<span class="c">[step ${i}]</span> contract: ${a}　|　wrong order: <span class="m">${b}</span>`,
      sOkK: 'New state, contract order', sBadK: 'New state, wrong order', sDiffK: 'Difference between them',
      sDiffF: '<b>= wrong order − contract</b><br>both results are normal finite numbers; no error is raised',
      oVerdictSame: (s) => `With these parameters the two orders happen to agree (both ${s}). Try "Textbook example": as long as α ≠ 1 and something is actually written, the results differ.`,
      oVerdict: (a, b) => `The contract order gives <b>${a}</b>; the wrong order gives <b>${b}</b>. The wrong order also multiplies the freshly written information by α, as if "partly forgetting something the moment you note it down". Both numbers are reasonable, finite and in range, but only one matches the model.`,
      oTry: [
        'Click <b>Textbook example</b> and keep pressing Step: the contract order gives 1.5, the wrong order 1.125. The gap appears at step 4, where the newly written 0.25 is also cut in half.',
        'Click <b>α = 0</b>: the contract order first clears the old memory, then writes β·v = 0.75; the wrong order multiplies everything by 0 at the end, leaving nothing.',
        'Click <b>β = 0</b> or <b>k = 0</b>: nothing is written, both orders are left with just the decay, and the results agree. Edge cases make the best tests.',
      ],
    },
    ja: {
      code: 'DELTA_MEMORY', title: '2 × 2 のホワイトボード：Delta 則はどう書き、どう読むか', tag: '教育用の試算 · 実際の状態は 128 × 128 × 48 ヘッド',
      intro: 'ホワイトボード S の数はたった 2 × 2 = 4 個です。それでも「キー → 値」の対応を覚えなければなりません。キーは 3 つ。りんご [1, 0]、バナナ [0, 1]、オレンジ [0.6, 0.8]（前の 2 つとどちらも重なります）。書き込みボタンを押すと、4 つのステップでボードがどう変わるかが見えます。読み出しボタンを押すと、最後に書いた値が読み戻せるかが分かります。',
      lgCell: 'ホワイトボード S の数 1 つ（明るいほど絶対値が大きい）', lgNeg: '負の数', lgHit: 'このステップで変わったマス',
      steps: ['減衰 S̄ = αS', '古い値を読む v̂ = S̄ᵀk', '差額 δ = β(v − v̂)', '書き込み S = S̄ + kδᵀ'],
      stage: '2 × 2 の状態行列、キーベクトル、このステップの中間値',
      title2: 'ボード S：行はキーの次元、列は値の次元',
      colH: ['値次元 1', '値次元 2'], keyH: 'k',
      keyNames: ['りんご', 'バナナ', 'オレンジ'],
      writes: ['りんご → [2, 3] を書く', 'バナナ → [1, 4] を書く', 'りんご → [5, 1] に書き換え', 'オレンジ → [3, 3] を書く'],
      reads: ['りんごを読む', 'バナナを読む', 'オレンジを読む'],
      bReset: 'ボードを消す',
      ruleDelta: 'Delta 則（GDN が使う）', ruleHebb: '単純な足し算（比較用）', ruleLabel: '書き込み規則',
      aLabel: '減衰 α', bLabel: '書き込みの強さ β',
      ready: '<span class="c">$</span> ボードはすべて 0 です。まず [ りんご → [2, 3] を書く ] を押してください',
      l0: (a, name) => `<span class="c">[${name} を書く]</span> ① 減衰：ボード全体に α = ${a} を掛けます。${a < 1 ? '古い記憶をまず割り引きます' : '今回は割り引きません'}`,
      l1: (v) => `② 古い値を読む：v̂ = S̄ᵀk = [${v}]。このキーでボードに何が入っていたかです`,
      l2: (d, b) => `③ 差額を計算：δ = β(v − v̂) = ${b} × (目標 − 古い値) = [${d}]。<b>どれだけ違うか</b>だけを書きます`,
      l3: '<span class="y">④ 書き込み</span>：S = S̄ + k δᵀ。外積 1 回でボード全体が変わります',
      h1: '<span class="m">② 単純な足し算</span>：古い値は読みません',
      h2: (v) => `③ v = [${v}] をそのまま書く量にします`,
      h3: '<span class="y">④ 書き込み</span>：S = S̄ + k vᵀ。新旧の中身が重なります',
      rd: (name, r, want) => `<span class="c">[${name} を読む]</span> Sᵀk = [${r}]${want ? `。最後に書いた値は [${want}] です` : '。まだ書いていません'}`,
      line1: (vh, d) => `v̂ = [${vh}]　δ = [${d}]`,
      line2: (r) => `読み出し = [${r}]`,
      sReadK: '直近の読み出し', sReadF: '<b>= Sᵀk</b>：各列と k の内積',
      sErrK: '最後に書いた値との差', sErrF: '<b>= |読み出し − 最後の書き込み|</b>（最大の次元）',
      sSizeK: 'ボードの大きさ（書き込み回数で変わらない）', sSizeF: '<b>おもちゃ：2 × 2 個の数</b><br>実際は 1 層あたり：128 × 128 × 48 ヘッド × 4 バイト = 3 MiB',
      vOk: (name, r) => `<b>${name}</b> を読むと [${r}] が返りました。最後に書いた値そのものです。Delta 則は先に古い値を読み、差額だけを書きます。だから同じキーを何度書き換えても、値は積み重なりません。`,
      vBad: (name, r, w) => `<b>${name}</b> を読むと [${r}] が返りましたが、最後に書いた値は [${w}] です。ボードには数が 4 つしかないので、中身が干渉します。古い値が引かれていない（単純な足し算）か、α や β のせいで書き込みが不完全になっています。`,
      vNone: (name) => `<b>${name}</b> は、まだ書いていません。読めたのは、それと重なる、ボード上の別の内容です。`,
      try: [
        '<b>りんごを書く</b>、<b>りんごを書き換える</b>、<b>りんごを読む</b>の順に押してください。Delta 則では [5, 1] が読み戻せます。<b>単純な足し算</b>に切り替えて、もう一度やってみましょう。[7, 4] が返り、新旧の値が重なっています。',
        'りんごを書き、バナナを書き、さらに<b>オレンジを書い</b>てから、3 つのキーを読んでみてください。オレンジは正確に読めますが、りんごとバナナは変わっています。4 個の数では、互いに重なる 3 組の記憶は収まりません。これが「大きさが固定 = 損失がある」です。',
        '<b>α</b> を 0.5 にして、続けて書いてみましょう。書くたびに、古い内容がまず半分に縮みます。α が小さいほど、速く忘れます。α = 0 は、毎回白紙から始めるのと同じです。',
      ],

      oCode: 'GDN_ORDER', oTitle: '順番は本当に大事：先に減衰か、先に書き込みか', oTag: '正確な計算 · 1 次元スカラー',
      oIntro: 'ホワイトボードを 1 つの数に縮めます。同じパラメータで、2 つの順番を両方計算します。<b>約束事</b>は「減衰してから書き込み」です。よくある書き間違いは「書き込んでから減衰」です。<b>1 ステップ</b>を押すと、両側が一緒に進みます。',
      oLgOk: '減衰 → 書き込み（GDN の約束事）', oLgBad: '書き込み → 減衰（誤った順番）', oLgS: '開始時の状態 S',
      oSteps: ['減衰 / 予測', '予測 / 差額', '差額 / 書き込み', '書き込み / 減衰', '読み出し'],
      sl: { S: '古い状態 S', alpha: '減衰 α', k: 'キー k', v: '値 v', beta: '書き込みの強さ β' },
      presets: ['教科書の例', 'α = 0', 'β = 0', 'k = 0'],
      sep: '、',
      pv: [{ S: 2, alpha: 0.5, k: 1, v: 3, beta: 0.25 }, { S: 2, alpha: 0, k: 1, v: 3, beta: 0.25 }, { S: 2, alpha: 0.5, k: 1, v: 3, beta: 0 }, { S: 2, alpha: 0.5, k: 0, v: 3, beta: 0.25 }],
      bStep: '▶ 1 ステップ', bAll: '▶▶ 最後まで', oStage: '数直線：開始時の状態と、2 つの順番で得られた新しい状態',
      ok: ['S̄ = α · S', 'v̂ = S̄ · k', 'δ = β (v − v̂)', 'S′ = S̄ + k · δ', 'o = S′ · q'],
      bad: ['v̂ = S · k', 'δ = β (v − v̂)', 'S_w = S + k · δ', 'S′ = α · S_w', 'o = S′ · q'],
      oReady: '<span class="c">$</span> プリセットを選ぶか、スライダーを動かして、[ ▶ 1 ステップ ] を押してください（q は 1 に固定）',
      oLog: (i, a, b) => `<span class="c">[ステップ ${i}]</span> 約束どおり：${a}　｜　誤った順番：<span class="m">${b}</span>`,
      sOkK: '約束どおりの順番での新しい状態', sBadK: '誤った順番での新しい状態', sDiffK: '両者の差',
      sDiffF: '<b>= 誤った順番 − 約束どおり</b><br>どちらも普通の有限の数で、エラーにはなりません',
      oVerdictSame: (s) => `このパラメータでは、2 つの順番がたまたま一致しました（どちらも ${s}）。「教科書の例」を試してください。α ≠ 1 で、実際に何かを書き込むなら、結果は必ず違います。`,
      oVerdict: (a, b) => `約束どおりの順番では <b>${a}</b>、誤った順番では <b>${b}</b> になりました。誤った順番では、書いたばかりの新しい情報にも α が掛かります。「メモした瞬間に、少し忘れる」のと同じです。どちらの数ももっともらしく、有限で、範囲内です。ただし、モデルに合うのは片方だけです。`,
      oTry: [
        '<b>教科書の例</b>を押して、1 ステップを続けて押してください。約束どおりの順番では 1.5、誤った順番では 1.125 になります。差が出るのはステップ 4 です。新しく書いた 0.25 まで半分にされています。',
        '<b>α = 0</b> を押してください。約束どおりの順番では、先に古い記憶を 0 にしてから、β·v = 0.75 を書きます。誤った順番では、最後に全体へ 0 を掛けるので、何も残りません。',
        '<b>β = 0</b> か <b>k = 0</b> を押してください。何も書き込まれません。どちらの順番でも減衰だけが残り、結果は同じです。境界の場合は、テストを書く題材にいちばん向いています。',
      ],
    },
  });

  const KEYS = [[1, 0], [0, 1], [0.6, 0.8]];
  const WRITES = [[0, [2, 3]], [1, [1, 4]], [0, [5, 1]], [2, [3, 3]]];
  const f = x => (Math.abs(x) < 0.0005 ? '0' : (Math.round(x * 1000) / 1000).toString());
  const fv = v => v.map(f).join(', ');
  const names = () => T.keyNames;
  let uid = 0;

  async function guardRun(el, ctx, state, fn) {
    if (state.busy) return;
    state.busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { if (ctx.alive) throw e; }
    state.busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
  }

  Viz.register('delta-memory', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgCell, glow: true },
        { color: 'var(--a2)', text: T.lgNeg },
        { color: 'var(--a3)', text: T.lgHit },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 240', class: 'viz-stage', role: 'img', 'aria-label': T.stage }, left);
      const tx = (x, y, s, size, extra) => { const e = Viz.svg('text', Object.assign({ x, y, 'font-size': size || 13, style: 'fill:var(--ink)' }, extra || {}), svg); e.textContent = s; return e; };
      tx(4, 16, T.title2, 13);
      tx(48, 60, T.keyH, 13, { 'text-anchor': 'middle' });
      T.colH.forEach((h, j) => tx(148 + j * 82, 60, h, 12, { 'text-anchor': 'middle', style: 'fill:var(--muted)' }));
      const cells = [[], []], vals = [[], []], keyCells = [], keyVals = [];
      for (let i = 0; i < 2; i++) {
        keyCells.push(Viz.svg('rect', { x: 24, y: 68 + i * 50, width: 48, height: 46, rx: 3, style: 'fill:var(--side);stroke:var(--frame)' }, svg));
        keyVals.push(tx(48, 97 + i * 50, '', 14, { 'text-anchor': 'middle' }));
        for (let j = 0; j < 2; j++) {
          cells[i].push(Viz.svg('rect', { x: 110 + j * 82, y: 68 + i * 50, width: 76, height: 46, rx: 3, style: 'fill:var(--frame)' }, svg));
          vals[i].push(tx(148 + j * 82, 97 + i * 50, '0', 15, { 'text-anchor': 'middle', 'font-weight': 600 }));
        }
      }
      const line1 = tx(4, 196, '', 13), line2 = tx(4, 222, '', 13, { style: 'fill:var(--a3)' });
      left.insertAdjacentHTML('beforeend',
        `<div class="viz-row">${T.writes.map(w => Viz.button(w)).join('')}</div>
         <div class="viz-row">${T.reads.map(r => Viz.button(r, 'alt')).join('')}${Viz.button(T.bReset, 'ghost')}</div>
         <div class="viz-row" style="font-size:14px;gap:14px"><span>${T.ruleLabel}</span><label><input type="radio" name="rule" value="delta" checked> ${T.ruleDelta}</label><label><input type="radio" name="rule" value="hebb"> ${T.ruleHebb}</label></div>
         <div class="viz-slider"><label>${T.aLabel}</label><input type="range" min="0" max="1" step="0.05" value="1" data-k="alpha" aria-label="${Viz.esc(T.aLabel)}"><output data-o="alpha">1</output></div>
         <div class="viz-slider"><label>${T.bLabel}</label><input type="range" min="0" max="1" step="0.05" value="1" data-k="beta" aria-label="${Viz.esc(T.bLabel)}"><output data-o="beta">1</output></div>`);
      // Radio groups on one page must not share a name.
      const radios = [...el.querySelectorAll('input[type=radio]')];
      const group = 'delta-rule-' + (++uid);
      radios.forEach(r => { r.name = group; });
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'dm-r', k: T.sReadK, v: '—', f: T.sReadF, hot: true }) +
        Viz.stat({ id: 'dm-e', k: T.sErrK, v: '—', f: T.sErrF }) +
        Viz.stat({ id: 'dm-s', k: T.sSizeK, v: '2 × 2', f: T.sSizeF });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden></div>` + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const state = { busy: false };
      let S = [[0, 0], [0, 0]], alpha = 1, beta = 1, last = [null, null, null], hl = new Set();

      function paint(k) {
        const max = Math.max(1, ...S.flat().map(Math.abs));
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          const v = S[i][j], a = Math.min(1, Math.abs(v) / max);
          cells[i][j].setAttribute('style', `fill:${v >= 0 ? 'var(--accent)' : 'var(--a2)'};opacity:${(0.15 + 0.85 * a).toFixed(2)}` + (hl.has(i * 2 + j) ? ';stroke:var(--a3);stroke-width:3' : ''));
          vals[i][j].textContent = f(v);
          vals[i][j].style.fill = a > 0.5 ? 'var(--paper)' : 'var(--ink)';
        }
        keyVals.forEach((t, i) => { t.textContent = k ? f(k[i]) : '·'; });
      }
      function rule() { return radios.find(r => r.checked).value; }
      async function write(n) {
        const [ki, v] = WRITES[n], k = KEYS[ki], name = names()[ki];
        $('.viz-verdict').hidden = true;
        hl = new Set(); paint(k);
        pipe.set(0); term.log(T.l0(alpha, name + ' → [' + fv(v) + ']'));
        const r = M.deltaStep(S, k, v, beta, alpha);
        S = r.Sbar; hl = new Set([0, 1, 2, 3]); paint(k); await ctx.sleep(500);
        if (rule() === 'delta') {
          pipe.set(1); term.log(T.l1(fv(r.vhat))); await ctx.sleep(500);
          pipe.set(2); term.log(T.l2(fv(r.delta), beta)); line1.textContent = T.line1(fv(r.vhat), fv(r.delta)); await ctx.sleep(500);
          S = r.S;
          pipe.set(3); term.log(T.l3);
        } else {
          pipe.set(1); term.log(T.h1); await ctx.sleep(400);
          pipe.set(2); term.log(T.h2(fv(v))); line1.textContent = ''; await ctx.sleep(400);
          S = M.hebbStep(S, k, v, 1);
          pipe.set(3); term.log(T.h3);
        }
        hl = new Set([0, 1, 2, 3].filter(c => k[Math.floor(c / 2)] !== 0)); paint(k);
        last[ki] = v;
      }
      function readKey(ki) {
        const k = KEYS[ki], r = M.read(S, k), name = names()[ki], want = last[ki];
        hl = new Set(); pipe.set(-1); paint(k);
        line2.textContent = T.line2(fv(r));
        term.log(T.rd(name, fv(r), want ? fv(want) : null));
        $('[data-s=dm-r-v]').textContent = '[' + fv(r) + ']';
        const err = want ? Math.max(...r.map((x, j) => Math.abs(x - want[j]))) : null;
        $('[data-s=dm-e-v]').textContent = err === null ? '—' : f(err);
        const v = $('.viz-verdict');
        v.innerHTML = !want ? T.vNone(name) : err < 0.01 ? T.vOk(name, fv(r)) : T.vBad(name, fv(r), fv(want));
        v.hidden = false;
      }
      const btns = [...el.querySelectorAll('.viz-btn')];
      btns.slice(0, 4).forEach((b, n) => { b.onclick = () => guardRun(el, ctx, state, () => write(n)); });
      btns.slice(4, 7).forEach((b, n) => { b.onclick = () => { if (!state.busy) readKey(n); }; });
      btns[7].onclick = () => guardRun(el, ctx, state, async () => {
        S = [[0, 0], [0, 0]]; last = [null, null, null]; hl = new Set(); pipe.set(-1);
        line1.textContent = ''; line2.textContent = ''; term.clear(); term.log(T.ready);
        $('[data-s=dm-r-v]').textContent = '—'; $('[data-s=dm-e-v]').textContent = '—'; $('.viz-verdict').hidden = true; paint(null);
      });
      el.querySelectorAll('input[type=range]').forEach(r => {
        r.oninput = () => { if (r.dataset.k === 'alpha') alpha = +r.value; else beta = +r.value; el.querySelector(`[data-o="${r.dataset.k}"]`).textContent = r.value; };
      });
      paint(null);
    },
  });

  Viz.register('gdn-order', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.oCode, title: T.oTitle, tag: T.oTag, intro: T.oIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.oLgOk, glow: true },
        { color: 'var(--a2)', text: T.oLgBad },
        { color: 'var(--muted)', text: T.oLgS },
      ]));
      const pipe = Viz.pipe(body, T.oSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 104', class: 'viz-stage', role: 'img', 'aria-label': T.oStage }, left);
      const LO = -1, HI = 4, X = v => 20 + (Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO) * 320;
      Viz.svg('line', { x1: 20, y1: 60, x2: 340, y2: 60, style: 'stroke:var(--muted)' }, svg);
      for (let v = LO; v <= HI; v++) {
        Viz.svg('line', { x1: X(v), y1: 56, x2: X(v), y2: 64, style: 'stroke:var(--muted)' }, svg);
        const t = Viz.svg('text', { x: X(v), y: 78, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg); t.textContent = v;
      }
      const mk = (c, y) => ({ dot: Viz.svg('circle', { cy: 60, r: 7, style: `fill:${c}` }, svg), t: Viz.svg('text', { y, 'font-size': 13, 'text-anchor': 'middle', style: `fill:${c}` }, svg) });
      const m0 = mk('var(--muted)', 16), mOk = mk('var(--accent)', 38), mBad = mk('var(--a2)', 98);
      const sl = (k, min, max, step, v) => `<div class="viz-slider"><label>${T.sl[k]}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-k="${k}" aria-label="${Viz.esc(T.sl[k])}"><output data-o="${k}">${v}</output></div>`;
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${T.presets.map(p => Viz.button(p, 'alt')).join('')}</div>` +
        sl('S', -2, 3, 0.25, 2) + sl('alpha', 0, 1, 0.05, 0.5) + sl('k', 0, 2, 0.25, 1) + sl('v', -2, 4, 0.25, 3) + sl('beta', 0, 1, 0.05, 0.25) +
        `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'ghost')}</div>`);
      const term = Viz.term(left, T.oReady);
      right.innerHTML =
        `<div class="viz-stat"><div class="k">${T.oLgOk}</div><div class="viz-bars ok-steps"></div></div>` +
        `<div class="viz-stat"><div class="k">${T.oLgBad}</div><div class="viz-bars bad-steps"></div></div>` +
        Viz.stat({ id: 'go-d', k: T.sDiffK, v: '', f: T.sDiffF, hot: true });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden></div>` + Viz.tryList(T.oTry));
      const $ = s => el.querySelector(s);
      const p = { S: 2, alpha: 0.5, k: 1, v: 3, beta: 0.25, q: 1 };
      let stage = -1;

      function nums() {
        const a = M.scalarStep(p, 'decay-first'), b = M.scalarStep(p, 'write-first');
        return { a, b, okVals: [a.Sbar, a.vhat, a.delta, a.S, a.o], badVals: [b.vhat, b.delta, b.Sw, b.S, b.o] };
      }
      function render() {
        const { a, b, okVals, badVals } = nums();
        const rows = (labels, vs) => labels.map((l, i) => `<div style="grid-template-columns:minmax(0,1fr) 56px"><span style="color:${i <= stage ? 'var(--ink)' : 'var(--muted)'}">${l}</span><span style="text-align:right;color:${i <= stage ? 'var(--ink)' : 'var(--muted)'}">${i <= stage ? f(vs[i]) : '?'}</span></div>`).join('');
        $('.ok-steps').innerHTML = rows(T.ok, okVals);
        $('.bad-steps').innerHTML = rows(T.bad, badVals);
        const place = (mrk, v, label, show) => { mrk.dot.setAttribute('cx', X(v)); mrk.t.setAttribute('x', X(v)); mrk.t.textContent = show ? label : ''; mrk.dot.style.opacity = show ? 1 : 0; };
        place(m0, p.S, 'S = ' + f(p.S), true);
        place(mOk, a.S, f(a.S), stage >= 3);
        place(mBad, b.S, f(b.S), stage >= 3);
        $('[data-s=go-d-v]').textContent = stage >= 3 ? f(b.S - a.S) : '—';
        const v = $('.viz-verdict');
        if (stage >= 4) { v.innerHTML = Math.abs(a.S - b.S) < 1e-9 ? T.oVerdictSame(f(a.S)) : T.oVerdict(f(a.S), f(b.S)); v.hidden = false; } else v.hidden = true;
      }
      function step() {
        if (stage >= 4) stage = -1;
        stage++; pipe.set(stage);
        const { okVals, badVals } = nums();
        term.log(T.oLog(stage + 1, `${T.ok[stage]} = ${f(okVals[stage])}`, `${T.bad[stage]} = ${f(badVals[stage])}`));
        render();
      }
      function setP(o) { Object.assign(p, o); for (const k of Object.keys(T.sl)) { $(`input[data-k="${k}"]`).value = p[k]; $(`[data-o="${k}"]`).textContent = p[k]; } stage = -1; pipe.set(-1); render(); }
      const btns = [...el.querySelectorAll('.viz-btn')];
      btns.slice(0, 4).forEach((b, j) => { b.onclick = () => { setP(T.pv[j]); term.log(`<span class="y">[${T.presets[j]}]</span> S = ${p.S}${T.sep}α = ${p.alpha}${T.sep}k = ${p.k}${T.sep}v = ${p.v}${T.sep}β = ${p.beta}`); }; });
      btns[4].onclick = step;
      btns[5].onclick = () => { stage = -1; for (let i = 0; i < 5; i++) step(); };
      el.querySelectorAll('input[type=range]').forEach(r => {
        r.oninput = () => { p[r.dataset.k] = +r.value; $(`[data-o="${r.dataset.k}"]`).textContent = r.value; stage = -1; pipe.set(-1); render(); };
      });
      render();
      void ctx;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
