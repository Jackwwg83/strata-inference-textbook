/* Chapter 06 widgets: the page cache under a cyclic working set, and the 8-bit bounds check.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.loader;

  const BLOB_MB = 1.3824;            // one cell stands for one expert-sized blob (expert_source.hpp: 1,382,400 B)
  const SSD_GBPS = 7, RAM_GBPS = 83; // chapter 01's upstream test machine, theoretical peaks

  const T = Viz.t({
    zh: {
      code: 'PAGE_CACHE', title: '页缓存模拟器：mmap 之后发生什么', tag: '教学推演 · 一格代表一段文件',
      intro: '模型文件已经用 mmap 映射好了，但还<b>一页都没读</b>。上排是文件在硬盘上的 16 段，下排是内存里的页缓存槽位。每生成一个 token，程序都按顺序把前 W 段读一遍（代表这个 token 要用的数据）。按 <b>单步</b> 一次访问一段，看哪次缺页、哪次命中。',
      lgFile: '文件的一段（在硬盘上）', lgNow: '正在访问', lgRes: '已在页缓存里', lgMiss: '缺页：要从硬盘读',
      steps: ['访问一段', '查页缓存', '命中：直接用', '缺页：读硬盘', '满了：淘汰最久没用的'],
      fileLabel: '文件（硬盘）', cacheLabel: '页缓存（内存）', empty: '空',
      stageLabel: '文件页与页缓存槽位',
      wLabel: '每个 token 读几段（W）', cLabel: '页缓存槽位（C）',
      bStep: '▶ 单步', bRun: '▶▶ 跑 10 个 token', bReset: '重置',
      ready: '<span class="c">$</span> mmap 完成：文件已映射进地址空间，读入 0 字节。按 [ ▶ 单步 ] 开始访问',
      readyShort: '<span class="c">$</span> 已重置。页缓存清空',
      hit: (t, p) => `<span class="c">[T${String(t).padStart(2, '0')}]</span> 第 ${p} 段：<span class="c">命中</span>，内存里已有副本，直接用`,
      miss: (t, p, ms) => `<span class="c">[T${String(t).padStart(2, '0')}]</span> 第 ${p} 段：<span class="m">缺页</span>，从硬盘读入 ${BLOB_MB} MB（约 ${ms} ms）`,
      evict: (p) => `<span class="y">　└ 槽位满了，淘汰第 ${p} 段（最久没被用过）</span>`,
      fast: '<span class="y">// 快进：连续跑 10 个 token</span>',
      tokDone: (t, f, h) => `<span class="w">token ${t} 结束</span>：本轮缺页 ${f} 次，命中 ${h} 次`,
      sFaultK: '缺页次数', sFaultF: (f) => `<b>= 从硬盘读入 ${f} 段 × ${BLOB_MB} MB</b><br>= ${Viz.fmt(f * BLOB_MB, 1)} MB`,
      sRateK: '命中率', sRateF: (h, n) => `<b>= 命中 ÷ 访问 = ${h} ÷ ${n}</b>`,
      sTimeK: '估算读取耗时', sTimeF: `<b>= 缺页 × 0.198 ms + 命中 × 0.017 ms</b><br>一段 ${BLOB_MB} MB，硬盘按 ${SSD_GBPS} GB/s、内存按 ${RAM_GBPS} GB/s 估算`,
      verdictFit: (w, c) => `工作集 W = ${w} 段，页缓存 C = ${c} 个槽位，装得下。只有第 1 个 token 缺页，之后每个 token 全部命中：数据一直留在内存里，硬盘不用再读。`,
      verdictThrash: (w, c, rate) => `工作集 W = ${w} 段，比页缓存 C = ${c} 多。按顺序循环读的时候，每一段都在下次被用到之前被淘汰了，命中率只有 ${rate}%，每个 token 都要重新从硬盘读。<br>Strata 的源码注释记录过同样的现象：数据页被淘汰得和读进来一样快，速度掉到硬盘水平。`,
      try: [
        '保持 W = 8、C = 12，按 <b>跑 10 个 token</b>：只有第 1 个 token 缺页，之后命中率一路上涨。这就是“第二次就快了”的原因。',
        '把 C 拉到 <b>7</b>（比 W 少 1 个槽位），再跑：命中率掉到 0%，读盘量翻了 10 倍。缓存只差一点点，效果却是全有或全无。',
        '在 C = 7 时连按 <b>单步</b>，盯住被淘汰的那一段：它总是<b>马上就要用</b>的那一段。这说明“最久没用”并不总是“最不需要”。',
      ],

      rCode: 'BOUNDS_CHECK', rTitle: '区间检查：在 8 位整数的世界里', rTag: '教学推演 · 8 位无符号整数',
      rIntro: '为了让溢出看得见，这里所有数都是 <b>8 位无符号整数</b>：只能表示 0 到 255，算到 256 就绕回 0。文件长 F 字节；张量声称自己从偏移 o 开始、长 n 字节。比较两种检查写法，看谁会被骗。',
      rLgFile: '文件范围 [0, F)', rLgTensor: '张量声称的范围 [o, o+n)', rLgOut: '超出文件的部分',
      fLabel: '文件长度 F', oLabel: '偏移 o', nLabel: '长度 n',
      presets: ['正常张量', '恰好到末尾', '越界 1 字节', '溢出绕回', '偏移越界'],
      pv: [[128, 32, 64], [128, 64, 64], [128, 64, 65], [128, 200, 100], [100, 120, 0]],
      rStage: '文件与张量区间的数轴',
      axisNote: '8 位整数的上限 255',
      wrapNote: (s) => `8 位里算出的 o+n = ${s}`,
      sAK: '写法 A：o + n ≤ F', sBK: '写法 B：o ≤ F 且 n ≤ F − o', sTK: '真实情况（不限位数）',
      pass: '通过', fail: '拒绝',
      sAF: (o, n, s, w, f) => `<b>${o} + ${n} = ${w ? `${o + n}，绕回成 ${s}` : s}</b><br>${s} ≤ ${f} ？`,
      sBF: (o, n, f) => o <= f ? `<b>${o} ≤ ${f}，且 ${n} ≤ ${f} − ${o} = ${f - o}</b> ？` : `<b>${o} ≤ ${f}</b> 已经不成立，直接拒绝`,
      sTF: (o, n, f) => `<b>[${o}, ${o + n}) 是否落在 [0, ${f}) 里</b>`,
      inside: '在文件里', outside: '超出文件',
      vOk: '两种写法都给出了正确答案。',
      vBad: (s) => `写法 A 被骗了：o + n 超过 255 后绕回成 ${s}，看起来比 F 还小，于是一个越界的张量被放行。写法 B 先检查 o，再做一次<b>不会溢出</b>的减法，所以不会上当。`,
      rReady: '<span class="c">$</span> 选一个预设，或者拖动滑块',
      rLog: (name, a, b, t) => `<span class="c">[${name}]</span> 写法 A：${a}　写法 B：${b}　真实：<span class="${t ? 'c' : 'm'}">${t ? '在文件里' : '越界'}</span>`,
      custom: '自定义',
      rTry: [
        '点 <b>溢出绕回</b>：o = 200、n = 100 明明越界了，可 200 + 100 在 8 位里等于 44，写法 A 判它“合法”。',
        '点 <b>恰好到末尾</b>：张量最后一个字节正好是文件最后一个字节，两种写法都应该放行。边界条件写成 &lt; 还是 ≤，要在这里验证。',
        '点 <b>偏移越界</b>，再把 n 拉到 0：长度为 0 的张量也不能从文件外面开始。写法 B 的第一个条件就是为它准备的。',
      ],
    },
    en: {
      code: 'PAGE_CACHE', title: 'Page cache simulator: what happens after mmap', tag: 'Teaching estimate · one cell = one file segment',
      intro: 'The model file is already mapped with mmap, but <b>not one page has been read</b>. The top row is the file\'s 16 segments on the SSD; the bottom row is the page cache slots in RAM. For every token generated, the program reads the first W segments in order (standing for the data this token needs). Press <b>Step</b> to access one segment at a time and see which access faults and which one hits.',
      lgFile: 'One file segment (on the SSD)', lgNow: 'Being accessed', lgRes: 'Already in the page cache', lgMiss: 'Page fault: read from the SSD',
      steps: ['Access a segment', 'Check page cache', 'Hit: use it', 'Fault: read SSD', 'Full: evict least recent'],
      fileLabel: 'File (SSD)', cacheLabel: 'Page cache (RAM)', empty: 'empty',
      stageLabel: 'File pages and page cache slots',
      wLabel: 'Segments read per token (W)', cLabel: 'Page cache slots (C)',
      bStep: '▶ Step', bRun: '▶▶ Run 10 tokens', bReset: 'Reset',
      ready: '<span class="c">$</span> mmap done: the file is mapped into the address space, 0 bytes read. Press [ ▶ Step ] to start accessing',
      readyShort: '<span class="c">$</span> reset. Page cache cleared',
      hit: (t, p) => `<span class="c">[T${String(t).padStart(2, '0')}]</span> segment ${p}: <span class="c">hit</span>, a copy is already in RAM; use it`,
      miss: (t, p, ms) => `<span class="c">[T${String(t).padStart(2, '0')}]</span> segment ${p}: <span class="m">page fault</span>, read ${BLOB_MB} MB from the SSD (about ${ms} ms)`,
      evict: (p) => `<span class="y">　└ slots full; evict segment ${p} (unused the longest)</span>`,
      fast: '<span class="y">// fast-forward: running 10 tokens</span>',
      tokDone: (t, f, h) => `<span class="w">token ${t} done</span>: ${f} page faults, ${h} hits this round`,
      sFaultK: 'Page faults', sFaultF: (f) => `<b>= ${f} segments read from the SSD × ${BLOB_MB} MB</b><br>= ${Viz.fmt(f * BLOB_MB, 1)} MB`,
      sRateK: 'Hit rate', sRateF: (h, n) => `<b>= hits ÷ accesses = ${h} ÷ ${n}</b>`,
      sTimeK: 'Estimated read time', sTimeF: `<b>= faults × 0.198 ms + hits × 0.017 ms</b><br>one segment is ${BLOB_MB} MB; SSD at ${SSD_GBPS} GB/s, RAM at ${RAM_GBPS} GB/s`,
      verdictFit: (w, c) => `Working set W = ${w} segments, page cache C = ${c} slots: it fits. Only token 1 faults; every later token hits on every access. The data stays in RAM and the SSD is never read again.`,
      verdictThrash: (w, c, rate) => `Working set W = ${w} segments is larger than the page cache C = ${c}. In a cyclic in-order read, every segment is evicted just before it is needed again, so the hit rate is only ${rate}% and every token reads from the SSD all over again.<br>Strata's source comments record the same effect: data pages were evicted as fast as they came in, and speed dropped to SSD level.`,
      try: [
        'Keep W = 8 and C = 12, then press <b>Run 10 tokens</b>: only token 1 faults, and the hit rate climbs from there. That is why "the second time is fast".',
        'Drag C to <b>7</b> (one slot fewer than W) and run again: the hit rate drops to 0% and SSD reads go up 10×. The cache is only a little short, yet the effect is all or nothing.',
        'With C = 7, keep pressing <b>Step</b> and watch which segment gets evicted: it is always the one <b>about to be used next</b>. "Unused the longest" is not always "needed the least".',
      ],

      rCode: 'BOUNDS_CHECK', rTitle: 'Range check: in a world of 8-bit integers', rTag: 'Teaching estimate · 8-bit unsigned integers',
      rIntro: 'To make overflow visible, every number here is an <b>8-bit unsigned integer</b>: it can only hold 0 to 255, and 256 wraps back to 0. The file is F bytes long; a tensor claims to start at offset o and be n bytes long. Compare two ways to write the check and see which one gets fooled.',
      rLgFile: 'File range [0, F)', rLgTensor: 'Range the tensor claims [o, o+n)', rLgOut: 'Part outside the file',
      fLabel: 'File length F', oLabel: 'Offset o', nLabel: 'Length n',
      presets: ['Normal tensor', 'Ends at file end', '1 byte too far', 'Overflow wrap', 'Offset outside'],
      pv: [[128, 32, 64], [128, 64, 64], [128, 64, 65], [128, 200, 100], [100, 120, 0]],
      rStage: 'Number line of the file and tensor ranges',
      axisNote: '8-bit limit: 255',
      wrapNote: (s) => `8-bit o+n = ${s}`,
      sAK: 'Check A: o + n ≤ F', sBK: 'Check B: o ≤ F and n ≤ F − o', sTK: 'The truth (no bit limit)',
      pass: 'pass', fail: 'reject',
      sAF: (o, n, s, w, f) => `<b>${o} + ${n} = ${w ? `${o + n}, wraps to ${s}` : s}</b><br>${s} ≤ ${f} ?`,
      sBF: (o, n, f) => o <= f ? `<b>${o} ≤ ${f}, and ${n} ≤ ${f} − ${o} = ${f - o}</b> ?` : `<b>${o} ≤ ${f}</b> already fails; reject at once`,
      sTF: (o, n, f) => `<b>does [${o}, ${o + n}) lie inside [0, ${f})?</b>`,
      inside: 'inside the file', outside: 'outside the file',
      vOk: 'Both checks give the right answer.',
      vBad: (s) => `Check A was fooled: o + n went past 255 and wrapped to ${s}, which looks smaller than F, so an out-of-bounds tensor got through. Check B tests o first, then does a subtraction that <b>cannot overflow</b>, so it is not fooled.`,
      rReady: '<span class="c">$</span> pick a preset, or drag a slider',
      rLog: (name, a, b, t) => `<span class="c">[${name}]</span> Check A: ${a}　Check B: ${b}　truth: <span class="${t ? 'c' : 'm'}">${t ? 'inside the file' : 'out of bounds'}</span>`,
      custom: 'custom',
      rTry: [
        'Press <b>Overflow wrap</b>: o = 200, n = 100 is clearly out of bounds, but 200 + 100 equals 44 in 8 bits, so check A calls it "valid".',
        'Press <b>Ends at file end</b>: the tensor\'s last byte is exactly the file\'s last byte, and both checks should let it through. This is where you verify whether the boundary should be &lt; or ≤.',
        'Press <b>Offset outside</b>, then drag n to 0: even a zero-length tensor may not start outside the file. The first condition of check B exists for exactly this case.',
      ],
    },
    ja: {
      code: 'PAGE_CACHE', title: 'ページキャッシュシミュレーター：mmap のあとに何が起きるか', tag: '教育用の試算 · 1 マス = ファイルの 1 区間',
      intro: 'モデルファイルは mmap でマップ済みですが、<b>1 ページも読まれていません</b>。上の段は SSD 上にあるファイルの 16 区間、下の段は RAM にあるページキャッシュのスロットです。トークンを 1 つ生成するたびに、プログラムは先頭の W 区間を順に読みます（そのトークンが使うデータを表します）。<b>ステップ</b> を押すと 1 区間ずつアクセスします。どのアクセスでページフォールトが起き、どれがヒットするか見てみましょう。',
      lgFile: 'ファイルの 1 区間（SSD 上）', lgNow: 'アクセス中', lgRes: 'ページキャッシュに入っている', lgMiss: 'ページフォールト：SSD から読む',
      steps: ['区間にアクセス', 'キャッシュを確認', 'ヒット：そのまま使う', 'ページフォールト：SSD を読む', '満杯：最も古いものを追い出す'],
      fileLabel: 'ファイル（SSD）', cacheLabel: 'ページキャッシュ（RAM）', empty: '空',
      stageLabel: 'ファイルのページとページキャッシュのスロット',
      wLabel: '1 トークンで読む区間数（W）', cLabel: 'ページキャッシュのスロット数（C）',
      bStep: '▶ ステップ', bRun: '▶▶ 10 トークン実行', bReset: 'リセット',
      ready: '<span class="c">$</span> mmap 完了：ファイルはアドレス空間にマップされ、読み込みは 0 バイト。[ ▶ ステップ ] を押してアクセスを始めましょう',
      readyShort: '<span class="c">$</span> リセットしました。ページキャッシュは空です',
      hit: (t, p) => `<span class="c">[T${String(t).padStart(2, '0')}]</span> 区間 ${p}：<span class="c">ヒット</span>。メモリにコピーがあるので、そのまま使います`,
      miss: (t, p, ms) => `<span class="c">[T${String(t).padStart(2, '0')}]</span> 区間 ${p}：<span class="m">ページフォールト</span>。SSD から ${BLOB_MB} MB 読み込みます（約 ${ms} ms）`,
      evict: (p) => `<span class="y">　└ スロットが満杯なので、区間 ${p} を追い出します（最も長く使われていない）</span>`,
      fast: '<span class="y">// 早送り：10 トークン連続で実行</span>',
      tokDone: (t, f, h) => `<span class="w">トークン ${t} 完了</span>：この回はページフォールト ${f} 回、ヒット ${h} 回`,
      sFaultK: 'ページフォールト回数', sFaultF: (f) => `<b>= SSD から ${f} 区間 × ${BLOB_MB} MB 読み込み</b><br>= ${Viz.fmt(f * BLOB_MB, 1)} MB`,
      sRateK: 'ヒット率', sRateF: (h, n) => `<b>= ヒット ÷ アクセス = ${h} ÷ ${n}</b>`,
      sTimeK: '推定読み込み時間', sTimeF: `<b>= フォールト × 0.198 ms + ヒット × 0.017 ms</b><br>1 区間は ${BLOB_MB} MB。SSD は ${SSD_GBPS} GB/s、RAM は ${RAM_GBPS} GB/s として見積もり`,
      verdictFit: (w, c) => `ワーキングセット W = ${w} 区間、ページキャッシュ C = ${c} スロットで、収まります。ページフォールトは最初のトークンだけで、そのあとはどのトークンも全アクセスがヒットします。データはずっと RAM に残り、SSD を読み直す必要はありません。`,
      verdictThrash: (w, c, rate) => `ワーキングセット W = ${w} 区間が、ページキャッシュ C = ${c} より多くなっています。順番にぐるぐる読むと、どの区間も、次に使われる直前に追い出されます。ヒット率は ${rate}% しかなく、トークンごとに SSD から読み直しです。<br>Strata のソースコードのコメントにも、同じ現象が記録されています。データのページが読み込まれるのと同じ速さで追い出され、速度が SSD の水準まで落ちました。`,
      try: [
        'W = 8、C = 12 のまま <b>10 トークン実行</b> を押します。ページフォールトは最初のトークンだけで、そのあとヒット率は上がり続けます。これが「2 回目は速い」理由です。',
        'C を <b>7</b>（W より 1 スロット少ない）にして、もう一度実行します。ヒット率は 0% に落ち、SSD の読み込み量は 10 倍になります。キャッシュが少し足りないだけなのに、効果は全か無かです。',
        'C = 7 のまま <b>ステップ</b> を押し続けて、追い出される区間に注目しましょう。それは、いつも<b>すぐに使われる</b>区間です。「最も長く使われていない」が、いつも「最も要らない」とは限りません。',
      ],

      rCode: 'BOUNDS_CHECK', rTitle: '範囲検査：8 ビット整数の世界で', rTag: '教育用の試算 · 8 ビット符号なし整数',
      rIntro: 'オーバーフローを目に見えるようにするため、ここでは数がすべて <b>8 ビット符号なし整数</b>です。表せるのは 0 から 255 までで、256 になると 0 に巻き戻ります。ファイルの長さは F バイトで、テンソルはオフセット o から長さ n バイトだと主張します。2 つの検査の書き方を比べて、どちらがだまされるか見てみましょう。',
      rLgFile: 'ファイルの範囲 [0, F)', rLgTensor: 'テンソルが主張する範囲 [o, o+n)', rLgOut: 'ファイルからはみ出した部分',
      fLabel: 'ファイル長 F', oLabel: 'オフセット o', nLabel: '長さ n',
      presets: ['正常なテンソル', 'ちょうど末尾まで', '1 バイト超過', 'オーバーフロー', 'オフセット超過'],
      pv: [[128, 32, 64], [128, 64, 64], [128, 64, 65], [128, 200, 100], [100, 120, 0]],
      rStage: 'ファイルとテンソルの範囲を表す数直線',
      axisNote: '8 ビット整数の上限 255',
      wrapNote: (s) => `8 ビットでの o+n = ${s}`,
      sAK: '書き方 A：o + n ≤ F', sBK: '書き方 B：o ≤ F かつ n ≤ F − o', sTK: '本当のところ（桁数の制限なし）',
      pass: '通過', fail: '拒否',
      sAF: (o, n, s, w, f) => `<b>${o} + ${n} = ${w ? `${o + n}、巻き戻って ${s}` : s}</b><br>${s} ≤ ${f} ？`,
      sBF: (o, n, f) => o <= f ? `<b>${o} ≤ ${f}、かつ ${n} ≤ ${f} − ${o} = ${f - o}</b> ？` : `<b>${o} ≤ ${f}</b> がすでに不成立なので、すぐ拒否`,
      sTF: (o, n, f) => `<b>[${o}, ${o + n}) は [0, ${f}) の中に収まるか</b>`,
      inside: 'ファイルの中', outside: 'ファイルの外',
      vOk: '2 つの書き方とも、正しい答えを出しました。',
      vBad: (s) => `書き方 A がだまされました。o + n が 255 を超えて ${s} に巻き戻り、F より小さく見えたので、範囲外のテンソルが通過しました。書き方 B は、先に o を確認し、そのあと<b>オーバーフローしない</b>引き算をするので、だまされません。`,
      rReady: '<span class="c">$</span> プリセットを選ぶか、スライダーを動かしましょう',
      rLog: (name, a, b, t) => `<span class="c">[${name}]</span> 書き方 A：${a}　書き方 B：${b}　本当：<span class="${t ? 'c' : 'm'}">${t ? 'ファイルの中' : '範囲外'}</span>`,
      custom: 'カスタム',
      rTry: [
        '<b>オーバーフロー</b> を押します。o = 200、n = 100 は明らかに範囲外です。それなのに 200 + 100 は 8 ビットでは 44 になり、書き方 A は「正しい」と判定します。',
        '<b>ちょうど末尾まで</b> を押します。テンソルの最後のバイトがちょうどファイルの最後のバイトで、どちらの書き方も通すはずです。境界条件を &lt; と ≤ のどちらで書くかは、ここで確かめます。',
        '<b>オフセット超過</b> を押してから、n を 0 まで動かします。長さ 0 のテンソルでも、ファイルの外から始まってはいけません。書き方 B の最初の条件は、このケースのためにあります。',
      ],
    },
  });

  async function guardRun(el, ctx, state, fn) {
    if (state.busy) return;
    state.busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { if (ctx.alive) throw e; }
    state.busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
  }

  Viz.register('page-cache', {
    mount(el, ctx) {
      const PAGES = 16;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgFile },
        { color: 'var(--a3)', text: T.lgNow },
        { color: 'var(--accent)', text: T.lgRes, glow: true },
        { color: 'var(--a2)', text: T.lgMiss },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 200', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const label = (x, y, t) => { const e = Viz.svg('text', { x, y, 'font-size': 13, style: 'fill:var(--muted)' }, svg); e.textContent = t; return e; };
      label(2, 16, T.fileLabel);
      const fileCells = [], fileText = [];
      for (let i = 0; i < PAGES; i++) {
        fileCells.push(Viz.svg('rect', { x: 2 + i * 22, y: 24, width: 20, height: 40, rx: 2, style: 'fill:var(--frame)' }, svg));
        const t = Viz.svg('text', { x: 12 + i * 22, y: 49, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
        t.textContent = i; fileText.push(t);
      }
      label(2, 104, T.cacheLabel);
      const slotG = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-slider"><label>${T.wLabel}</label><input type="range" min="4" max="16" value="8" data-k="w" aria-label="${Viz.esc(T.wLabel)}"><output data-o="w">8</output></div>
        <div class="viz-slider"><label>${T.cLabel}</label><input type="range" min="4" max="16" value="12" data-k="c" aria-label="${Viz.esc(T.cLabel)}"><output data-o="c">12</output></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bRun, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'pc-f', k: T.sFaultK, v: '0', f: T.sFaultF(0), hot: true }) +
        Viz.stat({ id: 'pc-r', k: T.sRateK, v: '—', f: T.sRateF(0, 0) }) +
        Viz.stat({ id: 'pc-t', k: T.sTimeK, v: '0 ms', f: T.sTimeF });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden></div>` + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [stepBtn, runBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const state = { busy: false };
      let W = 8, C = 12, i = 0, cache = [], hits = 0, faults = 0, tokF = 0, tokH = 0;
      const missMs = M.transferMs(BLOB_MB * 1e6, SSD_GBPS), hitMs = M.transferMs(BLOB_MB * 1e6, RAM_GBPS);

      function paint(now, missed) {
        fileCells.forEach((c, p) => {
          let fill = 'var(--frame)', op = p < W ? 1 : 0.35;
          if (cache.includes(p)) fill = 'var(--accent)';
          if (p === now) fill = missed ? 'var(--a2)' : 'var(--a3)';
          c.style.fill = fill; c.style.opacity = op;
          fileText[p].style.fill = fill === 'var(--frame)' ? 'var(--ink)' : 'var(--paper)';
        });
        slotG.innerHTML = '';
        const w = Math.min(22, Math.floor(354 / C));
        for (let s = 0; s < C; s++) {
          const p = cache[s];
          Viz.svg('rect', { x: 2 + s * w, y: 112, width: w - 2, height: 40, rx: 2, style: `fill:${p === undefined ? 'var(--side)' : p === now ? (missed ? 'var(--a2)' : 'var(--a3)') : 'var(--accent)'};stroke:var(--frame)` }, slotG);
          const t = Viz.svg('text', { x: 2 + s * w + (w - 2) / 2, y: 137, 'font-size': 12, 'text-anchor': 'middle', style: `fill:${p === undefined ? 'var(--muted)' : 'var(--paper)'}` }, slotG);
          t.textContent = p === undefined ? '·' : p;
        }
        const n = Viz.svg('text', { x: 2, y: 184, 'font-size': 13, style: 'fill:var(--muted)' }, slotG);
        n.textContent = `W = ${W}　C = ${C}　token ${Math.floor(i / W) + (i % W ? 1 : 0)}`;
      }
      function stats() {
        const n = hits + faults;
        $('[data-s=pc-f-v]').textContent = Viz.fmt(faults);
        $('[data-s=pc-f-f]').innerHTML = T.sFaultF(faults);
        $('[data-s=pc-r-v]').textContent = n ? (hits / n * 100).toFixed(0) + '%' : '—';
        $('[data-s=pc-r-f]').innerHTML = T.sRateF(hits, n);
        $('[data-s=pc-t-v]').textContent = Viz.fmt(faults * missMs + hits * hitMs, 1) + ' ms';
      }
      function access(log, logTok) {
        const page = i % W, tok = Math.floor(i / W) + 1;
        const at = cache.indexOf(page), hit = at >= 0;
        let evicted = null;
        if (hit) { cache.splice(at, 1); hits++; tokH++; }
        else { faults++; tokF++; if (cache.length >= C) evicted = cache.shift(); }
        cache.push(page);
        i++;
        pipe.set(hit ? 2 : evicted !== null ? 4 : 3);
        if (log) {
          term.log(hit ? T.hit(tok, page) : T.miss(tok, page, missMs.toFixed(2)));
          if (evicted !== null) term.log(T.evict(evicted));
        }
        if (i % W === 0) { if (log || logTok) term.log(T.tokDone(tok, tokF, tokH)); tokF = 0; tokH = 0; }
        paint(page, !hit); stats();
      }
      function reset(msg) {
        i = 0; cache = []; hits = 0; faults = 0; tokF = 0; tokH = 0;
        pipe.set(-1); term.clear(); term.log(msg); $('.viz-verdict').hidden = true; paint(-1, false); stats();
      }
      stepBtn.onclick = () => guardRun(el, ctx, state, async () => { access(true, false); });
      runBtn.onclick = () => guardRun(el, ctx, state, async () => {
        reset(T.fast);
        for (let t = 0; t < 10; t++) {
          for (let p = 0; p < W; p++) { access(false, true); await ctx.sleep(25); }
        }
        const v = $('.viz-verdict');
        v.innerHTML = W <= C ? T.verdictFit(W, C) : T.verdictThrash(W, C, (hits / (hits + faults) * 100).toFixed(0));
        v.hidden = false;
      });
      resetBtn.onclick = () => guardRun(el, ctx, state, async () => reset(T.readyShort));
      el.querySelectorAll('input[type=range]').forEach(r => {
        r.oninput = () => {
          if (state.busy) return;
          if (r.dataset.k === 'w') W = +r.value; else C = +r.value;
          el.querySelector(`[data-o="${r.dataset.k}"]`).textContent = r.value;
          reset(T.readyShort);
        };
      });
      paint(-1, false); stats();
    },
  });

  Viz.register('range-check', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.rCode, title: T.rTitle, tag: T.rTag, intro: T.rIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.rLgFile },
        { color: 'var(--accent)', text: T.rLgTensor, glow: true },
        { color: 'var(--a2)', text: T.rLgOut },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      // Number line from 0 to 384 so a claimed range past 255 stays visible.
      const X0 = 12, SCALE = 336 / 384;
      const X = v => X0 + v * SCALE;
      const svg = Viz.svg('svg', { viewBox: '0 0 360 160', class: 'viz-stage', role: 'img', 'aria-label': T.rStage }, left);
      Viz.svg('line', { x1: X(0), y1: 96, x2: X(384), y2: 96, style: 'stroke:var(--muted)', 'stroke-width': 1 }, svg);
      for (const v of [0, 128, 256, 384]) {
        Viz.svg('line', { x1: X(v), y1: 92, x2: X(v), y2: 100, style: 'stroke:var(--muted)' }, svg);
        const t = Viz.svg('text', { x: X(v), y: 118, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg); t.textContent = v;
      }
      Viz.svg('line', { x1: X(256), y1: 20, x2: X(256), y2: 100, style: 'stroke:var(--a3)', 'stroke-dasharray': '4 3' }, svg);
      const lim = Viz.svg('text', { x: X(256) - 4, y: 146, 'font-size': 12, 'text-anchor': 'end', style: 'fill:var(--a3)' }, svg); lim.textContent = T.axisNote;
      const fileR = Viz.svg('rect', { x: X(0), y: 30, height: 22, style: 'fill:var(--frame)' }, svg);
      const tenR = Viz.svg('rect', { y: 58, height: 22, style: 'fill:var(--accent)' }, svg);
      const outR = Viz.svg('rect', { y: 58, height: 22, style: 'fill:var(--a2)' }, svg);
      const wrapM = Viz.svg('path', { d: '', style: 'fill:none;stroke:var(--a2)', 'stroke-width': 2 }, svg);
      const wrapT = Viz.svg('text', { y: 16, 'font-size': 13, style: 'fill:var(--a2)' }, svg);
      const fT = Viz.svg('text', { y: 46, 'font-size': 13, style: 'fill:var(--ink)' }, svg);

      const sl = (k, lab, v) => `<div class="viz-slider"><label>${lab}</label><input type="range" min="0" max="255" value="${v}" data-k="${k}" aria-label="${Viz.esc(lab)}"><output data-o="${k}">${v}</output></div>`;
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${T.presets.map((p, j) => Viz.button(p, j === 3 ? 'alt' : '')).join('')}</div>` +
        sl('f', T.fLabel, 128) + sl('o', T.oLabel, 32) + sl('n', T.nLabel, 64));
      const term = Viz.term(left, T.rReady);
      right.innerHTML =
        Viz.stat({ id: 'rc-a', k: T.sAK, v: '', f: '' }) +
        Viz.stat({ id: 'rc-b', k: T.sBK, v: '', f: '' }) +
        Viz.stat({ id: 'rc-t', k: T.sTK, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict"></div>` + Viz.tryList(T.rTry));
      const $ = s => el.querySelector(s);
      const v = { f: 128, o: 32, n: 64 };

      function render() {
        const r = M.checkRange(v.f, v.o, v.n, 8);
        fileR.setAttribute('width', Math.max(0, X(v.f) - X(0)));
        fT.setAttribute('x', X(0) + 4); fT.textContent = 'F = ' + v.f;
        const end = v.o + v.n, inEnd = Math.min(end, Math.max(v.f, v.o));
        tenR.setAttribute('x', X(v.o)); tenR.setAttribute('width', Math.max(0, X(inEnd) - X(v.o)));
        const outStart = Math.max(v.o, v.f);
        outR.setAttribute('x', X(outStart)); outR.setAttribute('width', Math.max(0, X(end) - X(outStart)));
        if (r.wrapped) {
          wrapM.setAttribute('d', `M${X(r.naiveSum)} 22V84`);
          wrapT.setAttribute('x', Math.min(X(r.naiveSum) + 4, 190)); wrapT.textContent = T.wrapNote(r.naiveSum);
        } else { wrapM.setAttribute('d', ''); wrapT.textContent = ''; }
        $('[data-s=rc-a-v]').textContent = r.naiveOk ? T.pass : T.fail;
        $('[data-s=rc-a-f]').innerHTML = T.sAF(v.o, v.n, r.naiveSum, r.wrapped, v.f);
        $('[data-s=rc-b-v]').textContent = r.safeOk ? T.pass : T.fail;
        $('[data-s=rc-b-f]').innerHTML = T.sBF(v.o, v.n, v.f);
        $('[data-s=rc-t-v]').textContent = r.truth ? T.inside : T.outside;
        $('[data-s=rc-t-f]').innerHTML = T.sTF(v.o, v.n, v.f);
        $('.viz-verdict').innerHTML = r.naiveOk !== r.truth ? T.vBad(r.naiveSum) : T.vOk;
        return r;
      }
      function log(name) { const r = render(); term.log(T.rLog(name, r.naiveOk ? T.pass : T.fail, r.safeOk ? T.pass : T.fail, r.truth)); }
      function setSliders() { for (const k of ['f', 'o', 'n']) { el.querySelector(`[data-k="${k}"]`).value = v[k]; el.querySelector(`[data-o="${k}"]`).textContent = v[k]; } }
      el.querySelectorAll('.viz-btn').forEach((b, j) => {
        b.onclick = () => { [v.f, v.o, v.n] = T.pv[j]; setSliders(); log(T.presets[j]); };
      });
      el.querySelectorAll('input[type=range]').forEach(r => {
        r.oninput = () => { v[r.dataset.k] = +r.value; el.querySelector(`[data-o="${r.dataset.k}"]`).textContent = r.value; render(); };
        r.onchange = () => log(T.custom);
      });
      render();
      void ctx;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
