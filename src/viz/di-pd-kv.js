/* DeepInfer page "pd-kv" widgets: the hit-vs-recompute ledger and the mixed vs P/D split timeline.
   All visible text lives in the T table below (zh is the master). Numbers come from di-pd-kv.math.js. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.diPdKv;
  const LENS = [8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576];
  const kTok = n => (n >= 1048576 ? n / 1048576 + 'M' : n / 1024 + 'K');

  const T = Viz.t({
    zh: {
      hCode: 'KV_HIT_LEDGER', hTitle: '命中还是重算：一笔时间账', hTag: '教学推演 · 默认值取自上游报告',
      hIntro: '一个请求带着长前缀来了。前缀的 KV 存在 3FS 上，可以读回来，也可以在 GPU 上重算一遍。拖动参数，看<b>读</b>和<b>算</b>各要多久。<b>读取时间 = 命中 token 数 × 每 token 字节数 ÷ 读带宽</b>；<b>计算时间 = token 数 ÷ prefill 吞吐</b>。这里假设读和算不重叠，所以“命中”那根条是上限；预填充吞吐取测速图的平均值，长前缀之后的尾巴实际可能更慢。',
      lgLoad: '从 3FS 读回 KV', lgReplay: '有界重放：重算 128 个 token', lgCompute: '在 GPU 上做 prefill',
      lLen: '上下文长度 L（token）', lRatio: '前缀里已经缓存的比例', lBw: '分给这次读取的带宽（GB/s）', lTps: 'prefill 吞吐（token/s/卡）',
      lKv: '每 token 的 KV 大小（KiB，教学假设）', lSwa: 'SWA KV 找得到（本机，或经目录从别的机器拉回）',
      bwPresets: [[40, '40 · 一台存储服务器的读带宽'], [2.2, '2.2 · 约 18 张预填充卡分一台'], [1, '1 · 读得更挤（假设）']],
      barMiss: '不命中：整段重算', barHit: '命中：读回前缀，只算尾巴', stage: '命中与不命中时预填充耗时的对比条',
      ms: (x) => `${x} ms`,
      sHitK: '能用上的命中长度',
      sHitF: (cap, L1, swa) => `<b>= ⌊min(比例 × L, L − 134) ÷ 128⌋ × 128</b><br>上限 L − 134 = ${cap}；按 128 取整得 ${L1}${swa ? '' : '<br>SWA 找不到：退一块，再减 128'}`,
      sTtftK: '预填充耗时：不命中 → 命中',
      sTtftF: (load, comp) => `<b>不命中 = L ÷ 吞吐</b><br><b>命中 = 读取 ${load} ms + 计算 ${comp} ms</b><br>计算 = (L − 命中长度) ÷ 吞吐`,
      sGpuK: '每个这样的请求省下的 GPU 时间', sGpuF: '<b>= 命中长度 ÷ prefill 吞吐</b><br>这段时间 GPU 可以去算别人的新 token',
      sBeK: '读比算快的临界 KV 大小', sBeF: (be, kv) => `<b>= 读带宽 ÷ prefill 吞吐</b><br>每 token 小于 ${be} KiB 时，读比重算快；现在是 ${kv} KiB`,
      sStoreK: '这段前缀在 3FS 上占多少', sStoreF: (n) => `<b>= 命中长度 × 每 token 字节数</b><br>按每卡约 14.4 TB 算，能存约 ${n} 段这样的前缀`,
      tokens: (n) => `${n} token`, gb: (x) => `${x} GB`, mb: (x) => `${x} MB`,
      ready: '<span class="c">$</span> 拖动任何一个参数，这里逐步写出这笔账',
      l1: (L, wanted, L1, hit, swa) => `<span class="c">[1] 命中长度</span>：想命中 ${wanted}，按 128 取整得 L1 = ${L1}${swa ? '' : '；SWA 不在，退到 ' + hit} → 命中 ${hit} / ${L}`,
      l2: (hit, kv, bw, ms) => `<span class="m">[2] 读取</span>：${hit} × ${kv} KiB ÷ ${bw} GB/s = ${ms} ms`,
      l3: (n, tps, ms, replay) => `<span class="w">[3] 计算</span>：${n} token ÷ ${tps} token/s = ${ms} ms${replay ? '（含有界重放 128 个）' : ''}`,
      l4: (miss, hit) => `<span class="y">[4] 对比</span>：不命中 ${miss} ms，命中 ${hit} ms`,
      hVerdict: (x, saved, be, kv, slow) => slow
        ? `① 现在每 token 的 KV（${kv} KiB）比临界值 ${be} KiB 还大：读回来比重算还慢。<br>② 带宽被很多预填充卡分掉时，就会这样。所以存储集群的读带宽要跟着预填充卡数配。`
        : `① 命中后预填充快了约 <b>${x} 倍</b>，每个这样的请求省下约 <b>${saved} 秒</b> GPU 时间。<br>② 每 token 的 KV 只要小于 ${be} KiB，读就比算快；现在是 ${kv} KiB，余量很大。<br>③ SWA 找不到时只多重放 128 个 token：要重放的 token 数是常数，和上下文多长无关。`,
      hTry: [
        '把上下文从 <b>128K</b> 拉到 <b>1M</b>：不命中的时间跟着变长，有界重放的 128 个 token 却不变。',
        '点 <b>2.2 · 约 18 张预填充卡分一台</b>：临界值掉到约 25 KiB。再点 <b>1</b>、把 KV 拉到 <b>32 KiB</b>：临界值约 11 KiB，读反而比算慢。',
        '取消勾选 <b>SWA KV 找得到</b>：命中长度少 128，时间只多约 1.5 ms。',
      ],

      tCode: 'PD_TIMELINE', tTitle: '混合部署 vs 三段分离：两条时间线', tTag: '教学推演 · 步长取自上游测速图',
      tIntro: '服务器很忙：总有请求在解码，也总有新请求等着 prefill。<b>混合部署</b>时，同一组卡每做 K 步解码，就停下来做一步 prefill，所有人的解码都等着。<b>三段分离</b>时，prefill 在 P 卡上做，解码在 D 卡上做。按 <b>▶ 播放</b> 看 3 秒内发生了什么。虚线是一个新请求到达的时刻。这里每轮只做一步 prefill；真实的混合引擎在每个 DP rank 都还有活时会连着做几步，停顿只会更长。',
      lgDecode: '解码一步（约 13 ms）', lgPrefill: 'prefill 一步', lgTick: '一位用户收到新 token',
      laneMixed: '混合部署：同一组卡', laneP: '三段分离：P 卡（只做 prefill）', laneD: '三段分离：D 卡（只做解码）',
      tStage: '混合部署与三段分离的三秒时间线', arrive: '新请求', first: '首 token',
      lBatch: 'prefill 每步的 token 数（每个 DP rank）', lInterval: '混合部署：每隔几步解码插一次 prefill（K）', lArrive: '新请求到达时刻（ms）',
      bPlay: '▶ 播放', bReplay: '▶ 再放一次',
      sGapK: '解码最长停顿：混合 → 分离', sGapF: (p) => `<b>混合 = 解码一步 13 + prefill 一步 ${p}</b><br><b>分离 = 解码一步 13</b>`,
      tTtftK: '平均首 token 延迟：混合 → 分离', tTtftF: (a) => `<b>混合 = (a²/2 + 2pa + 1.5p²) ÷ (a + p)</b>，a = K × 13 = ${a} ms<br><b>分离 = 1.5p</b>：平均等半步，再算一步`,
      sShareK: '混合部署时 GPU 花在解码上的时间', sShareF: (a, p) => `<b>= a ÷ (a + p) = ${a} ÷ (${a} + ${p})</b><br>剩下的时间，所有解码都停着`,
      sOneK: '虚线这个请求的首 token：混合 → 分离', sOneF: '从到达到它那一步 prefill 结束。分离时，第二个 token 还要等 KV 传到 D 卡',
      tReady: '<span class="c">$</span> 按 [ ▶ 播放 ] 开始；时间放慢约 3 倍',
      ev: {
        arrive: (t) => `<span class="y">${t} ms</span> 新请求到达，排进 prefill 队列`,
        mixedPrefill: (t, p) => `<span class="m">${t} ms</span> 混合：开始一步 prefill，${p} ms 内所有解码暂停`,
        mixedFirst: (t, d) => `<span class="c">${t} ms</span> 混合：新请求拿到首 token，首 token 延迟 ${d} ms`,
        splitFirst: (t, d) => `<span class="c">${t} ms</span> 分离：新请求在 P 卡上拿到首 token，首 token 延迟 ${d} ms`,
        end: (gm) => `<span class="w">3000 ms</span> 结束。D 卡上每 13 ms 一步，从没停过；混合那组卡最长停了 ${gm} ms`,
      },
      tVerdict: (gm, tm, ts) => `① 混合部署时，一步 prefill 让所有人的解码停顿 <b>${gm} ms</b>；分离后解码节奏不变。<br>② 为了少停几次，混合部署把 prefill 攒着做，新请求的平均首 token 延迟就成了 <b>${tm} ms</b>；分离后约 <b>${ts} ms</b>。<br>③ 分离不是白来的：P 卡要另配，KV 还要从 P 传到 D。`,
      tTry: [
        '把 K 从 <b>70</b> 拉到 <b>10</b>：首 token 快了，可解码停顿得更频繁，GPU 花在解码上的时间也少了。',
        '选 <b>65,536</b> 的 prefill 步：混合部署时一次停顿超过 0.7 秒，对正在打字输出的用户很明显。',
        '把新请求挪到一步 prefill <b>正在做</b>的时候到达：混合部署要再等一整轮，分离只等半步。',
      ],
    },
    en: {
      hCode: 'KV_HIT_LEDGER', hTitle: 'Hit or recompute: a time ledger', hTag: 'Teaching estimate · defaults from the upstream report',
      hIntro: 'A request arrives with a long prefix. The KV of that prefix is on 3FS, so you can read it back or recompute it on the GPU. Drag the parameters and see how long <b>reading</b> and <b>computing</b> each take. <b>Read time = hit tokens × bytes per token ÷ read bandwidth</b>; <b>compute time = tokens ÷ prefill throughput</b>. Here reading and computing are assumed not to overlap, so the “hit” bar is an upper bound. Prefill throughput is the benchmark average; the tail after a long prefix may actually be slower.',
      lgLoad: 'Read KV back from 3FS', lgReplay: 'Bounded replay: recompute 128 tokens', lgCompute: 'Prefill on the GPU',
      lLen: 'Context length L (tokens)', lRatio: 'Share of the prefix already cached', lBw: 'Bandwidth given to this read (GB/s)', lTps: 'Prefill throughput (tokens/s per GPU)',
      lKv: 'KV size per token (KiB, teaching assumption)', lSwa: 'SWA KV can be found (local, or pulled from another machine via the directory)',
      bwPresets: [[40, '40 · read bandwidth of one storage server'], [2.2, '2.2 · about 18 prefill GPUs share one'], [1, '1 · tighter reads (assumption)']],
      barMiss: 'Miss: recompute everything', barHit: 'Hit: read the prefix, compute only the tail', stage: 'Bars comparing prefill time on a hit and on a miss',
      ms: (x) => `${x} ms`,
      sHitK: 'Usable hit length',
      sHitF: (cap, L1, swa) => `<b>= ⌊min(ratio × L, L − 134) ÷ 128⌋ × 128</b><br>Limit L − 134 = ${cap}; rounded to a multiple of 128 gives ${L1}${swa ? '' : '<br>SWA not found: step back one block, minus another 128'}`,
      sTtftK: 'Prefill time: miss → hit',
      sTtftF: (load, comp) => `<b>Miss = L ÷ throughput</b><br><b>Hit = read ${load} ms + compute ${comp} ms</b><br>Compute = (L − hit length) ÷ throughput`,
      sGpuK: 'GPU time saved per such request', sGpuF: '<b>= hit length ÷ prefill throughput</b><br>The GPU can spend this time on other people’s new tokens',
      sBeK: 'Break-even KV size where reading beats computing', sBeF: (be, kv) => `<b>= read bandwidth ÷ prefill throughput</b><br>If KV per token is below ${be} KiB, reading is faster than recomputing; now it is ${kv} KiB`,
      sStoreK: 'Space this prefix takes on 3FS', sStoreF: (n) => `<b>= hit length × bytes per token</b><br>At about 14.4 TB per GPU, that holds about ${n} such prefixes`,
      tokens: (n) => `${n} tokens`, gb: (x) => `${x} GB`, mb: (x) => `${x} MB`,
      ready: '<span class="c">$</span> Drag any parameter and the ledger is written here step by step',
      l1: (L, wanted, L1, hit, swa) => `<span class="c">[1] Hit length</span>: want ${wanted}, rounded to 128 gives L1 = ${L1}${swa ? '' : '; SWA missing, step back to ' + hit} → hit ${hit} / ${L}`,
      l2: (hit, kv, bw, ms) => `<span class="m">[2] Read</span>: ${hit} × ${kv} KiB ÷ ${bw} GB/s = ${ms} ms`,
      l3: (n, tps, ms, replay) => `<span class="w">[3] Compute</span>: ${n} tokens ÷ ${tps} tokens/s = ${ms} ms${replay ? ' (includes 128 tokens of bounded replay)' : ''}`,
      l4: (miss, hit) => `<span class="y">[4] Compare</span>: miss ${miss} ms, hit ${hit} ms`,
      hVerdict: (x, saved, be, kv, slow) => slow
        ? `① The KV per token now (${kv} KiB) is larger than the break-even ${be} KiB: reading it back is slower than recomputing.<br>② This happens when many prefill GPUs share the bandwidth. So the read bandwidth of the storage cluster must grow with the number of prefill GPUs.`
        : `① After a hit, prefill is about <b>${x}×</b> faster, and each such request saves about <b>${saved} s</b> of GPU time.<br>② As long as KV per token is below ${be} KiB, reading beats computing; now it is ${kv} KiB, a wide margin.<br>③ When SWA is not found, only 128 more tokens are replayed: the number of tokens to replay is a constant, independent of the context length.`,
      hTry: [
        'Pull the context from <b>128K</b> to <b>1M</b>: the miss time grows, but the 128 tokens of bounded replay stay the same.',
        'Click <b>2.2 · about 18 prefill GPUs share one</b>: the break-even drops to about 25 KiB. Then click <b>1</b> and pull KV to <b>32 KiB</b>: the break-even is about 11 KiB, and reading is now slower than computing.',
        'Untick <b>SWA KV can be found</b>: the hit length is 128 shorter, and the time grows by only about 1.5 ms.',
      ],

      tCode: 'PD_TIMELINE', tTitle: 'Mixed deployment vs E/P/D disaggregation: two timelines', tTag: 'Teaching estimate · step times from upstream benchmark charts',
      tIntro: 'The server is busy: some request is always decoding, and a new request is always waiting for prefill. With <b>mixed deployment</b>, after every K decode steps the same group of GPUs stops to run one prefill step, and everyone’s decode waits. With <b>disaggregation</b>, prefill runs on P GPUs and decode runs on D GPUs. Press <b>▶ Play</b> to see what happens in 3 seconds. The dashed line is the moment a new request arrives. Here each round runs only one prefill step; a real mixed engine runs several in a row while every DP rank still has work, so the stalls are only longer.',
      lgDecode: 'One decode step (about 13 ms)', lgPrefill: 'One prefill step', lgTick: 'A user receives a new token',
      laneMixed: 'Mixed deployment: one group of GPUs', laneP: 'Disaggregated: P GPUs (prefill only)', laneD: 'Disaggregated: D GPUs (decode only)',
      tStage: 'Three-second timeline of mixed deployment and disaggregation', arrive: 'new request', first: 'first token',
      lBatch: 'Tokens per prefill step (per DP rank)', lInterval: 'Mixed: insert a prefill after every how many decode steps (K)', lArrive: 'Arrival time of the new request (ms)',
      bPlay: '▶ Play', bReplay: '▶ Play again',
      sGapK: 'Longest decode stall: mixed → disaggregated', sGapF: (p) => `<b>Mixed = one decode step 13 + one prefill step ${p}</b><br><b>Disaggregated = one decode step 13</b>`,
      tTtftK: 'Mean time to first token: mixed → disaggregated', tTtftF: (a) => `<b>Mixed = (a²/2 + 2pa + 1.5p²) ÷ (a + p)</b>, a = K × 13 = ${a} ms<br><b>Disaggregated = 1.5p</b>: wait half a step on average, then compute one step`,
      sShareK: 'Share of GPU time spent on decode in mixed deployment', sShareF: (a, p) => `<b>= a ÷ (a + p) = ${a} ÷ (${a} + ${p})</b><br>For the rest of the time, all decode is stopped`,
      sOneK: 'First token of the dashed request: mixed → disaggregated', sOneF: 'From arrival to the end of its prefill step. With disaggregation, the second token must still wait for the KV to reach the D GPUs',
      tReady: '<span class="c">$</span> Press [ ▶ Play ] to start; time is slowed down about 3×',
      ev: {
        arrive: (t) => `<span class="y">${t} ms</span> New request arrives and joins the prefill queue`,
        mixedPrefill: (t, p) => `<span class="m">${t} ms</span> Mixed: one prefill step starts, and all decode pauses for ${p} ms`,
        mixedFirst: (t, d) => `<span class="c">${t} ms</span> Mixed: the new request gets its first token, time to first token ${d} ms`,
        splitFirst: (t, d) => `<span class="c">${t} ms</span> Disaggregated: the new request gets its first token on a P GPU, time to first token ${d} ms`,
        end: (gm) => `<span class="w">3000 ms</span> Done. D GPUs ran one step every 13 ms and never stopped; the mixed group stalled for up to ${gm} ms`,
      },
      tVerdict: (gm, tm, ts) => `① In mixed deployment, one prefill step stalls everyone’s decode for <b>${gm} ms</b>; after disaggregation the decode rhythm does not change.<br>② To stop fewer times, mixed deployment saves up prefill work, so the mean time to first token of a new request becomes <b>${tm} ms</b>; after disaggregation it is about <b>${ts} ms</b>.<br>③ Disaggregation is not free: P GPUs must be added, and the KV must travel from P to D.`,
      tTry: [
        'Pull K from <b>70</b> to <b>10</b>: the first token is faster, but decode stalls more often, and the GPU spends less of its time on decode.',
        'Pick a prefill step of <b>65,536</b>: in mixed deployment one stall goes beyond 0.7 seconds, which is very noticeable to a user watching the answer being typed.',
        'Move the new request to arrive while a prefill step is <b>running</b>: mixed deployment waits one more full round, and disaggregation waits only half a step.',
      ],
    },
    ja: {
      hCode: 'KV_HIT_LEDGER', hTitle: 'ヒットか再計算か：時間の帳簿', hTag: '教育用の試算 · 既定値は上流レポートより',
      hIntro: '長いプレフィックスを持つリクエストが来ました。プレフィックスの KV は 3FS にあり、読み戻すことも、GPU で計算し直すこともできます。パラメータを動かして、<b>読む</b>のと<b>計算する</b>のにそれぞれどれだけかかるかを見ましょう。<b>読み出し時間 = ヒットしたトークン数 × 1 トークンあたりのバイト数 ÷ 読み出し帯域</b>、<b>計算時間 = トークン数 ÷ prefill のスループット</b>です。ここでは読みと計算は重ならないと仮定するので、「ヒット」の棒は上限です。prefill のスループットはベンチマーク図の平均値で、長いプレフィックスの後の末尾は実際にはもっと遅いかもしれません。',
      lgLoad: '3FS から KV を読み戻す', lgReplay: '有界リプレイ：128 トークンを再計算', lgCompute: 'GPU で prefill',
      lLen: 'コンテキスト長 L（トークン）', lRatio: 'プレフィックスのうちキャッシュ済みの割合', lBw: 'この読み出しに割り当てる帯域（GB/s）', lTps: 'prefill のスループット（token/s/GPU）',
      lKv: '1 トークンあたりの KV の大きさ（KiB、教育用の仮定）', lSwa: 'SWA KV が見つかる（手元か、ディレクトリ経由で別マシンから取得）',
      bwPresets: [[40, '40 · ストレージサーバー 1 台の読み出し帯域'], [2.2, '2.2 · prefill 用 GPU 約 18 枚で 1 台を分け合う'], [1, '1 · 読み出しがさらに混む（仮定）']],
      barMiss: 'ヒットなし：全体を再計算', barHit: 'ヒット：プレフィックスを読み戻し、末尾だけ計算', stage: 'ヒットした場合としなかった場合の prefill 時間の比較バー',
      ms: (x) => `${x} ms`,
      sHitK: '使えるヒット長',
      sHitF: (cap, L1, swa) => `<b>= ⌊min(割合 × L, L − 134) ÷ 128⌋ × 128</b><br>上限 L − 134 = ${cap}。128 の倍数に丸めると ${L1}${swa ? '' : '<br>SWA が見つからない：1 ブロック戻り、さらに 128 を引く'}`,
      sTtftK: 'prefill の時間：ヒットなし → ヒット',
      sTtftF: (load, comp) => `<b>ヒットなし = L ÷ スループット</b><br><b>ヒット = 読み出し ${load} ms + 計算 ${comp} ms</b><br>計算 = (L − ヒット長) ÷ スループット`,
      sGpuK: 'このようなリクエスト 1 件で節約できる GPU 時間', sGpuF: '<b>= ヒット長 ÷ prefill のスループット</b><br>この時間、GPU は他の人の新しいトークンを計算できます',
      sBeK: '読むほうが速くなる境目の KV の大きさ', sBeF: (be, kv) => `<b>= 読み出し帯域 ÷ prefill のスループット</b><br>1 トークンあたり ${be} KiB より小さければ、読むほうが再計算より速くなります。今は ${kv} KiB です`,
      sStoreK: 'このプレフィックスが 3FS で占める量', sStoreF: (n) => `<b>= ヒット長 × 1 トークンあたりのバイト数</b><br>1 GPU あたり約 14.4 TB で計算すると、このようなプレフィックスを約 ${n} 件保存できます`,
      tokens: (n) => `${n} トークン`, gb: (x) => `${x} GB`, mb: (x) => `${x} MB`,
      ready: '<span class="c">$</span> どれかのパラメータを動かすと、ここに帳簿が順に書き出されます',
      l1: (L, wanted, L1, hit, swa) => `<span class="c">[1] ヒット長</span>：${wanted} 個ヒットさせたい。128 の倍数に丸めて L1 = ${L1}${swa ? '' : '。SWA がないので ' + hit + ' に戻す'} → ヒット ${hit} / ${L}`,
      l2: (hit, kv, bw, ms) => `<span class="m">[2] 読み出し</span>：${hit} × ${kv} KiB ÷ ${bw} GB/s = ${ms} ms`,
      l3: (n, tps, ms, replay) => `<span class="w">[3] 計算</span>：${n} トークン ÷ ${tps} token/s = ${ms} ms${replay ? '（有界リプレイ 128 個を含む）' : ''}`,
      l4: (miss, hit) => `<span class="y">[4] 比較</span>：ヒットなし ${miss} ms、ヒット ${hit} ms`,
      hVerdict: (x, saved, be, kv, slow) => slow
        ? `① 今の 1 トークンあたりの KV（${kv} KiB）は境目の ${be} KiB より大きいので、読み戻すほうが再計算より遅くなります。<br>② 多くの prefill 用 GPU で帯域を分け合うと、こうなります。だからストレージクラスタの読み出し帯域は、prefill 用 GPU の数に合わせて用意する必要があります。`
        : `① ヒットすると prefill は約 <b>${x} 倍</b>速くなり、このようなリクエスト 1 件で約 <b>${saved} 秒</b>の GPU 時間を節約できます。<br>② 1 トークンあたりの KV が ${be} KiB より小さければ、読むほうが計算より速くなります。今は ${kv} KiB で、余裕がたっぷりあります。<br>③ SWA が見つからなくても、リプレイするのは 128 トークン増えるだけです。リプレイするトークン数は定数で、コンテキストの長さに関係ありません。`,
      hTry: [
        'コンテキストを <b>128K</b> から <b>1M</b> まで伸ばしてみましょう。ヒットなしの時間は長くなりますが、有界リプレイの 128 トークンは変わりません。',
        '<b>2.2 · prefill 用 GPU 約 18 枚で 1 台を分け合う</b>を押すと、境目は約 25 KiB に下がります。さらに <b>1</b> を押して KV を <b>32 KiB</b> に伸ばすと、境目は約 11 KiB になり、読むほうがかえって遅くなります。',
        '<b>SWA KV が見つかる</b>のチェックを外すと、ヒット長が 128 短くなり、時間は約 1.5 ms 増えるだけです。',
      ],

      tCode: 'PD_TIMELINE', tTitle: '混合デプロイと 3 段分離：2 本のタイムライン', tTag: '教育用の試算 · ステップの長さは上流のベンチマーク図より',
      tIntro: 'サーバーは忙しい状態です。いつも誰かがデコード中で、いつも新しいリクエストが prefill を待っています。<b>混合デプロイ</b>では、同じ GPU 組がデコードを K ステップ進めるたびに止まって、prefill を 1 ステップ実行し、全員のデコードが待たされます。<b>3 段分離</b>では、prefill は P 側 GPU、デコードは D 側 GPU で行います。<b>▶ 再生</b>を押すと、3 秒間に何が起きるかが見えます。破線は新しいリクエストが到着した時刻です。ここでは 1 回に prefill を 1 ステップだけ実行します。実際の混合エンジンは、すべての DP rank にまだ仕事があるうちは何ステップか続けて実行するので、停止はもっと長くなるだけです。',
      lgDecode: 'デコード 1 ステップ（約 13 ms）', lgPrefill: 'prefill 1 ステップ', lgTick: 'ユーザーが新しいトークンを受け取る',
      laneMixed: '混合デプロイ：同じ GPU 組', laneP: '3 段分離：P 側 GPU（prefill のみ）', laneD: '3 段分離：D 側 GPU（デコードのみ）',
      tStage: '混合デプロイと 3 段分離の 3 秒間のタイムライン', arrive: '新規リクエスト', first: '最初のトークン',
      lBatch: 'prefill 1 ステップのトークン数（DP rank ごと）', lInterval: '混合デプロイ：デコード何ステップごとに prefill を入れるか（K）', lArrive: '新しいリクエストの到着時刻（ms）',
      bPlay: '▶ 再生', bReplay: '▶ もう一度再生',
      sGapK: 'デコードの最長停止：混合 → 分離', sGapF: (p) => `<b>混合 = デコード 1 ステップ 13 + prefill 1 ステップ ${p}</b><br><b>分離 = デコード 1 ステップ 13</b>`,
      tTtftK: '最初のトークンまでの平均時間：混合 → 分離', tTtftF: (a) => `<b>混合 = (a²/2 + 2pa + 1.5p²) ÷ (a + p)</b>、a = K × 13 = ${a} ms<br><b>分離 = 1.5p</b>：平均で半ステップ待ち、そのあと 1 ステップ計算`,
      sShareK: '混合デプロイで GPU がデコードに使う時間の割合', sShareF: (a, p) => `<b>= a ÷ (a + p) = ${a} ÷ (${a} + ${p})</b><br>残りの時間は、すべてのデコードが止まっています`,
      sOneK: '破線のリクエストが最初のトークンを受け取るまで：混合 → 分離', sOneF: '到着から、そのリクエストの prefill ステップが終わるまでです。分離の場合、2 つ目のトークンは KV が D 側 GPU に届くのをさらに待ちます',
      tReady: '<span class="c">$</span> [ ▶ 再生 ] を押すと始まります。時間は約 3 倍にゆっくり進みます',
      ev: {
        arrive: (t) => `<span class="y">${t} ms</span> 新しいリクエストが到着し、prefill のキューに並ぶ`,
        mixedPrefill: (t, p) => `<span class="m">${t} ms</span> 混合：prefill を 1 ステップ開始、${p} ms の間すべてのデコードが一時停止`,
        mixedFirst: (t, d) => `<span class="c">${t} ms</span> 混合：新しいリクエストが最初のトークンを受け取る。最初のトークンまで ${d} ms`,
        splitFirst: (t, d) => `<span class="c">${t} ms</span> 分離：新しいリクエストが P 側 GPU で最初のトークンを受け取る。最初のトークンまで ${d} ms`,
        end: (gm) => `<span class="w">3000 ms</span> 終了。D 側 GPU は 13 ms ごとに 1 ステップ進み、一度も止まりませんでした。混合の GPU 組は最長 ${gm} ms 止まりました`,
      },
      tVerdict: (gm, tm, ts) => `① 混合デプロイでは、prefill 1 ステップで全員のデコードが <b>${gm} ms</b> 止まります。分離すると、デコードのリズムは変わりません。<br>② 止まる回数を減らすために、混合デプロイは prefill をためてから実行するので、新しいリクエストの平均の最初のトークンまでの時間は <b>${tm} ms</b> になります。分離すると約 <b>${ts} ms</b> です。<br>③ 分離はただではありません。P 側 GPU を別に用意する必要があり、KV も P から D へ送らなければなりません。`,
      tTry: [
        'K を <b>70</b> から <b>10</b> に下げてみましょう。最初のトークンは速くなりますが、デコードの停止はもっと頻繁になり、GPU がデコードに使う時間も減ります。',
        'prefill のステップに <b>65,536</b> を選びましょう。混合デプロイでは 1 回の停止が 0.7 秒を超え、文字が出てくるのを見ているユーザーにははっきり分かります。',
        '新しいリクエストを、prefill の 1 ステップが<b>実行されている最中</b>に到着させてみましょう。混合デプロイはさらに丸 1 周待ち、分離は半ステップだけ待ちます。',
      ],
    },
    ko: {
      hCode: 'KV_HIT_LEDGER', hTitle: '히트냐 재계산이냐: 시간 장부', hTag: '교육용 추정 · 기본값은 업스트림 보고에서',
      hIntro: '긴 접두부를 가진 요청이 왔어요. 접두부의 KV는 3FS에 있어서 읽어 올 수도 있고, GPU에서 다시 계산할 수도 있어요. 매개변수를 끌어서 <b>읽기</b>와 <b>계산</b>이 각각 얼마나 걸리는지 보세요. <b>읽기 시간 = 히트한 토큰 수 × 토큰당 바이트 수 ÷ 읽기 대역폭</b>이고, <b>계산 시간 = 토큰 수 ÷ prefill 처리량</b>이에요. 여기서는 읽기와 계산이 겹치지 않는다고 가정하므로 “히트” 막대는 상한이에요. prefill 처리량은 속도 측정 그림의 평균값이고, 긴 접두부 뒤의 꼬리는 실제로 더 느릴 수 있어요.',
      lgLoad: '3FS에서 KV 읽어 오기', lgReplay: '유계 재생: 128개 토큰 재계산', lgCompute: 'GPU에서 prefill',
      lLen: '컨텍스트 길이 L(토큰)', lRatio: '접두부 중 이미 캐시된 비율', lBw: '이번 읽기에 배정된 대역폭(GB/s)', lTps: 'prefill 처리량(token/s/GPU)',
      lKv: '토큰당 KV 크기(KiB, 교육용 가정)', lSwa: 'SWA KV를 찾을 수 있음(로컬, 또는 디렉터리를 통해 다른 머신에서 가져옴)',
      bwPresets: [[40, '40 · 스토리지 서버 한 대의 읽기 대역폭'], [2.2, '2.2 · prefill GPU 약 18장이 한 대를 나눠 씀'], [1, '1 · 읽기가 더 붐빔(가정)']],
      barMiss: '미스: 전체 재계산', barHit: '히트: 접두부는 읽고 꼬리만 계산', stage: '히트와 미스일 때 prefill 소요 시간 비교 막대',
      ms: (x) => `${x} ms`,
      sHitK: '쓸 수 있는 히트 길이',
      sHitF: (cap, L1, swa) => `<b>= ⌊min(비율 × L, L − 134) ÷ 128⌋ × 128</b><br>상한 L − 134 = ${cap}, 128 단위로 내려 맞추면 ${L1}${swa ? '' : '<br>SWA를 찾지 못함: 한 블록 물러나서 128을 더 뺌'}`,
      sTtftK: 'prefill 소요 시간: 미스 → 히트',
      sTtftF: (load, comp) => `<b>미스 = L ÷ 처리량</b><br><b>히트 = 읽기 ${load} ms + 계산 ${comp} ms</b><br>계산 = (L − 히트 길이) ÷ 처리량`,
      sGpuK: '이런 요청 하나가 아끼는 GPU 시간', sGpuF: '<b>= 히트 길이 ÷ prefill 처리량</b><br>이 시간 동안 GPU는 다른 사람의 새 토큰을 계산할 수 있어요',
      sBeK: '읽기가 계산보다 빨라지는 분기점 KV 크기', sBeF: (be, kv) => `<b>= 읽기 대역폭 ÷ prefill 처리량</b><br>토큰당 ${be} KiB보다 작으면 읽기가 재계산보다 빨라요. 지금은 ${kv} KiB예요`,
      sStoreK: '이 접두부가 3FS에서 차지하는 양', sStoreF: (n) => `<b>= 히트 길이 × 토큰당 바이트 수</b><br>GPU 한 장당 약 14.4 TB로 계산하면 이런 접두부를 약 ${n}개 저장할 수 있어요`,
      tokens: (n) => `${n}개 토큰`, gb: (x) => `${x} GB`, mb: (x) => `${x} MB`,
      ready: '<span class="c">$</span> 매개변수를 하나라도 끌면 여기에 장부가 차례로 써져요',
      l1: (L, wanted, L1, hit, swa) => `<span class="c">[1] 히트 길이</span>: 히트시키고 싶은 수 ${wanted}, 128 단위로 내려 맞추면 L1 = ${L1}${swa ? '' : '. SWA가 없어서 ' + hit + '로 물러남'} → 히트 ${hit} / ${L}`,
      l2: (hit, kv, bw, ms) => `<span class="m">[2] 읽기</span>: ${hit} × ${kv} KiB ÷ ${bw} GB/s = ${ms} ms`,
      l3: (n, tps, ms, replay) => `<span class="w">[3] 계산</span>: ${n}개 토큰 ÷ ${tps} token/s = ${ms} ms${replay ? '(유계 재생 128개 포함)' : ''}`,
      l4: (miss, hit) => `<span class="y">[4] 비교</span>: 미스 ${miss} ms, 히트 ${hit} ms`,
      hVerdict: (x, saved, be, kv, slow) => slow
        ? `① 지금 토큰당 KV(${kv} KiB)가 분기점 ${be} KiB보다 커서, 읽어 오는 쪽이 재계산보다 느려요.<br>② 많은 prefill GPU가 대역폭을 나눠 쓰면 이렇게 돼요. 그래서 스토리지 클러스터의 읽기 대역폭은 prefill GPU 수에 맞춰 갖춰야 해요.`
        : `① 히트하면 prefill이 약 <b>${x}배</b> 빨라지고, 이런 요청 하나가 약 <b>${saved}초</b>의 GPU 시간을 아껴요.<br>② 토큰당 KV가 ${be} KiB보다 작기만 하면 읽기가 계산보다 빨라요. 지금은 ${kv} KiB라서 여유가 아주 커요.<br>③ SWA를 찾지 못해도 재생할 토큰이 128개 늘어날 뿐이에요. 재생할 토큰 수는 상수라서 컨텍스트가 얼마나 길든 상관없어요.`,
      hTry: [
        '컨텍스트를 <b>128K</b>에서 <b>1M</b>까지 늘려 보세요. 미스 시간은 길어지지만 유계 재생의 128개 토큰은 그대로예요.',
        '<b>2.2 · prefill GPU 약 18장이 한 대를 나눠 씀</b>을 누르면 분기점이 약 25 KiB로 떨어져요. 이어서 <b>1</b>을 누르고 KV를 <b>32 KiB</b>로 올리면 분기점이 약 11 KiB가 되어 읽기가 오히려 계산보다 느려져요.',
        '<b>SWA KV를 찾을 수 있음</b>의 체크를 풀어 보세요. 히트 길이가 128 줄고, 시간은 약 1.5 ms만 늘어나요.',
      ],

      tCode: 'PD_TIMELINE', tTitle: '혼합 배포 vs 3단 분리: 타임라인 두 개', tTag: '교육용 추정 · 단계 길이는 업스트림 속도 측정 그림에서',
      tIntro: '서버가 바빠요. 늘 누군가 디코드 중이고, 늘 새 요청이 prefill을 기다려요. <b>혼합 배포</b>에서는 같은 GPU 묶음이 디코드를 K단계 할 때마다 멈추고 prefill을 한 단계 실행하며, 모든 사람의 디코드가 기다려요. <b>3단 분리</b>에서는 prefill은 P GPU에서, 디코드는 D GPU에서 해요. <b>▶ 재생</b>을 눌러 3초 동안 무슨 일이 일어나는지 보세요. 점선은 새 요청이 도착한 시각이에요. 여기서는 한 번에 prefill을 한 단계만 실행해요. 실제 혼합 엔진은 모든 DP rank에 할 일이 남아 있는 동안 몇 단계를 이어서 실행하므로, 정지는 더 길어질 뿐이에요.',
      lgDecode: '디코드 한 단계(약 13 ms)', lgPrefill: 'prefill 한 단계', lgTick: '사용자가 새 토큰을 받음',
      laneMixed: '혼합 배포: 같은 GPU 묶음', laneP: '3단 분리: P GPU(prefill만)', laneD: '3단 분리: D GPU(디코드만)',
      tStage: '혼합 배포와 3단 분리의 3초 타임라인', arrive: '새 요청', first: '첫 토큰',
      lBatch: 'prefill 한 단계의 토큰 수(DP rank당)', lInterval: '혼합 배포: 디코드 몇 단계마다 prefill을 끼워 넣을지(K)', lArrive: '새 요청 도착 시각(ms)',
      bPlay: '▶ 재생', bReplay: '▶ 다시 재생',
      sGapK: '디코드 최장 정지: 혼합 → 분리', sGapF: (p) => `<b>혼합 = 디코드 한 단계 13 + prefill 한 단계 ${p}</b><br><b>분리 = 디코드 한 단계 13</b>`,
      tTtftK: '첫 토큰까지의 평균 시간: 혼합 → 분리', tTtftF: (a) => `<b>혼합 = (a²/2 + 2pa + 1.5p²) ÷ (a + p)</b>, a = K × 13 = ${a} ms<br><b>분리 = 1.5p</b>: 평균 반 단계를 기다린 뒤 한 단계 계산`,
      sShareK: '혼합 배포에서 GPU가 디코드에 쓰는 시간 비율', sShareF: (a, p) => `<b>= a ÷ (a + p) = ${a} ÷ (${a} + ${p})</b><br>나머지 시간에는 모든 디코드가 멈춰 있어요`,
      sOneK: '점선 요청의 첫 토큰: 혼합 → 분리', sOneF: '도착부터 그 요청의 prefill 단계가 끝날 때까지예요. 분리에서는 두 번째 토큰이 KV가 D GPU에 도착하기를 더 기다려야 해요',
      tReady: '<span class="c">$</span> [ ▶ 재생 ]을 누르면 시작해요. 시간은 약 3배 느리게 흘러요',
      ev: {
        arrive: (t) => `<span class="y">${t} ms</span> 새 요청이 도착해서 prefill 대기열에 들어감`,
        mixedPrefill: (t, p) => `<span class="m">${t} ms</span> 혼합: prefill 한 단계 시작, ${p} ms 동안 모든 디코드가 멈춤`,
        mixedFirst: (t, d) => `<span class="c">${t} ms</span> 혼합: 새 요청이 첫 토큰을 받음, 첫 토큰까지 ${d} ms`,
        splitFirst: (t, d) => `<span class="c">${t} ms</span> 분리: 새 요청이 P GPU에서 첫 토큰을 받음, 첫 토큰까지 ${d} ms`,
        end: (gm) => `<span class="w">3000 ms</span> 끝. D GPU는 13 ms마다 한 단계씩 한 번도 멈추지 않았고, 혼합 묶음은 최장 ${gm} ms 멈췄어요`,
      },
      tVerdict: (gm, tm, ts) => `① 혼합 배포에서는 prefill 한 단계가 모든 사람의 디코드를 <b>${gm} ms</b> 멈춰요. 분리하면 디코드 박자는 그대로예요.<br>② 멈추는 횟수를 줄이려고 혼합 배포는 prefill을 모아서 실행하므로, 새 요청의 평균 첫 토큰까지 시간은 <b>${tm} ms</b>가 돼요. 분리하면 약 <b>${ts} ms</b>예요.<br>③ 분리에도 대가가 있어요. P GPU를 따로 갖춰야 하고, KV도 P에서 D로 보내야 해요.`,
      tTry: [
        'K를 <b>70</b>에서 <b>10</b>으로 줄여 보세요. 첫 토큰은 빨라지지만 디코드 정지가 더 잦아지고, GPU가 디코드에 쓰는 시간도 줄어요.',
        'prefill 단계로 <b>65,536</b>을 골라 보세요. 혼합 배포에서는 한 번의 정지가 0.7초를 넘어서, 글자가 나오는 걸 보고 있는 사용자에게 뚜렷하게 느껴져요.',
        '새 요청이 prefill 한 단계가 <b>실행되는 도중</b>에 도착하도록 옮겨 보세요. 혼합 배포는 한 바퀴를 통째로 더 기다리고, 분리는 반 단계만 기다려요.',
      ],
    },
    es: {
      hCode: 'KV_HIT_LEDGER', hTitle: 'Acierto o recálculo: un libro de tiempos', hTag: 'Estimación didáctica · valores por defecto del informe upstream',
      hIntro: 'Llega una solicitud con un prefijo largo. El KV de ese prefijo está en 3FS, así que puedes leerlo de vuelta o recalcularlo en la GPU. Mueve los parámetros y mira cuánto tardan la <b>lectura</b> y el <b>cálculo</b>. <b>Tiempo de lectura = tokens acertados × bytes por token ÷ ancho de banda de lectura</b>; <b>tiempo de cálculo = tokens ÷ rendimiento del prefill</b>. Aquí se supone que leer y calcular no se solapan, así que la barra de «acierto» es un límite superior. El rendimiento del prefill es el promedio de la gráfica de velocidad; la cola tras un prefijo largo puede ser en realidad más lenta.',
      lgLoad: 'Leer el KV de vuelta desde 3FS', lgReplay: 'Reproducción acotada: recalcular 128 tokens', lgCompute: 'Prefill en la GPU',
      lLen: 'Longitud del contexto L (tokens)', lRatio: 'Parte del prefijo que ya está en caché', lBw: 'Ancho de banda para esta lectura (GB/s)', lTps: 'Rendimiento del prefill (token/s por GPU)',
      lKv: 'Tamaño del KV por token (KiB, supuesto didáctico)', lSwa: 'El KV de SWA se encuentra (en local, o traído de otra máquina por el directorio)',
      bwPresets: [[40, '40 · lectura de un servidor de almacenamiento'], [2.2, '2,2 · unas 18 GPU de prefill comparten uno'], [1, '1 · lectura más saturada (supuesto)']],
      barMiss: 'Fallo: se recalcula todo', barHit: 'Acierto: leer el prefijo, calcular la cola', stage: 'Barras que comparan el tiempo de prefill con acierto y con fallo',
      ms: (x) => `${x} ms`,
      sHitK: 'Longitud de acierto aprovechable',
      sHitF: (cap, L1, swa) => `<b>= ⌊min(proporción × L, L − 134) ÷ 128⌋ × 128</b><br>Límite L − 134 = ${cap}; redondeado a múltiplo de 128 da ${L1}${swa ? '' : '<br>No se encuentra el SWA: se retrocede un bloque, otros 128 menos'}`,
      sTtftK: 'Tiempo de prefill: fallo → acierto',
      sTtftF: (load, comp) => `<b>Fallo = L ÷ rendimiento</b><br><b>Acierto = lectura ${load} ms + cálculo ${comp} ms</b><br>Cálculo = (L − longitud de acierto) ÷ rendimiento`,
      sGpuK: 'Tiempo de GPU que ahorra cada solicitud así', sGpuF: '<b>= longitud de acierto ÷ rendimiento del prefill</b><br>La GPU puede dedicar ese tiempo a los tokens nuevos de otras personas',
      sBeK: 'Tamaño de KV de equilibrio en que leer le gana a calcular', sBeF: (be, kv) => `<b>= ancho de banda de lectura ÷ rendimiento del prefill</b><br>Si el KV por token es menor que ${be} KiB, leer es más rápido que recalcular; ahora es ${kv} KiB`,
      sStoreK: 'Espacio que ocupa este prefijo en 3FS', sStoreF: (n) => `<b>= longitud de acierto × bytes por token</b><br>Con unos 14,4 TB por GPU, caben unos ${n} prefijos así`,
      tokens: (n) => `${n} tokens`, gb: (x) => `${x} GB`, mb: (x) => `${x} MB`,
      ready: '<span class="c">$</span> Mueve cualquier parámetro y aquí se escribe el libro paso a paso',
      l1: (L, wanted, L1, hit, swa) => `<span class="c">[1] Longitud de acierto</span>: se quieren ${wanted}, redondeado a 128 da L1 = ${L1}${swa ? '' : '; falta el SWA, se retrocede a ' + hit} → acierto ${hit} / ${L}`,
      l2: (hit, kv, bw, ms) => `<span class="m">[2] Lectura</span>: ${hit} × ${kv} KiB ÷ ${bw} GB/s = ${ms} ms`,
      l3: (n, tps, ms, replay) => `<span class="w">[3] Cálculo</span>: ${n} tokens ÷ ${tps} token/s = ${ms} ms${replay ? ' (incluye 128 tokens de reproducción acotada)' : ''}`,
      l4: (miss, hit) => `<span class="y">[4] Comparación</span>: fallo ${miss} ms, acierto ${hit} ms`,
      hVerdict: (x, saved, be, kv, slow) => slow
        ? `① El KV por token de ahora (${kv} KiB) es mayor que el punto de equilibrio de ${be} KiB: leerlo de vuelta es más lento que recalcular.<br>② Pasa cuando muchas GPU de prefill se reparten el ancho de banda. Por eso el ancho de banda de lectura del clúster de almacenamiento debe crecer con el número de GPU de prefill.`
        : `① Tras un acierto, el prefill es unas <b>${x} veces</b> más rápido, y cada solicitud así ahorra unos <b>${saved} s</b> de GPU.<br>② Mientras el KV por token sea menor que ${be} KiB, leer le gana a calcular; ahora es ${kv} KiB, un margen amplio.<br>③ Cuando no se encuentra el SWA, solo se reproducen 128 tokens más: el número de tokens por reproducir es una constante, independiente de la longitud del contexto.`,
      hTry: [
        'Lleva el contexto de <b>128K</b> a <b>1M</b>: el tiempo de fallo crece, pero los 128 tokens de la reproducción acotada se quedan igual.',
        'Pulsa <b>2,2 · unas 18 GPU de prefill comparten uno</b>: el punto de equilibrio baja a unos 25 KiB. Luego pulsa <b>1</b> y sube el KV a <b>32 KiB</b>: el punto de equilibrio queda en unos 11 KiB y leer pasa a ser más lento que calcular.',
        'Desmarca <b>El KV de SWA se encuentra</b>: la longitud de acierto baja 128 y el tiempo sube solo unos 1,5 ms.',
      ],

      tCode: 'PD_TIMELINE', tTitle: 'Despliegue mixto vs desagregación E/P/D: dos líneas de tiempo', tTag: 'Estimación didáctica · duraciones de paso de las gráficas upstream',
      tIntro: 'El servidor está ocupado: siempre hay alguna solicitud en decode y siempre hay una nueva esperando el prefill. Con el <b>despliegue mixto</b>, cada K pasos de decode el mismo grupo de GPU se detiene a ejecutar un paso de prefill, y el decode de todos espera. Con la <b>desagregación</b>, el prefill corre en las GPU P y el decode en las GPU D. Pulsa <b>▶ Reproducir</b> para ver qué pasa en 3 segundos. La línea punteada es el momento en que llega una solicitud nueva. Aquí cada ronda ejecuta un solo paso de prefill; un motor mixto real ejecuta varios seguidos mientras todos los rank DP aún tienen trabajo, así que las paradas solo son más largas.',
      lgDecode: 'Un paso de decode (unos 13 ms)', lgPrefill: 'Un paso de prefill', lgTick: 'Un usuario recibe un token nuevo',
      laneMixed: 'Despliegue mixto: un mismo grupo de GPU', laneP: 'Desagregado: GPU P (solo prefill)', laneD: 'Desagregado: GPU D (solo decode)',
      tStage: 'Línea de tiempo de tres segundos del despliegue mixto y la desagregación', arrive: 'solicitud nueva', first: 'primer token',
      lBatch: 'Tokens por paso de prefill (por rank DP)', lInterval: 'Mixto: insertar un prefill cada cuántos pasos de decode (K)', lArrive: 'Instante de llegada de la solicitud nueva (ms)',
      bPlay: '▶ Reproducir', bReplay: '▶ Reproducir otra vez',
      sGapK: 'Parada de decode más larga: mixto → desagregado', sGapF: (p) => `<b>Mixto = un paso de decode 13 + un paso de prefill ${p}</b><br><b>Desagregado = un paso de decode 13</b>`,
      tTtftK: 'Tiempo medio hasta el primer token: mixto → desagregado', tTtftF: (a) => `<b>Mixto = (a²/2 + 2pa + 1,5p²) ÷ (a + p)</b>, a = K × 13 = ${a} ms<br><b>Desagregado = 1,5p</b>: se espera medio paso en promedio y luego se calcula un paso`,
      sShareK: 'Parte del tiempo de GPU dedicada a decode en el despliegue mixto', sShareF: (a, p) => `<b>= a ÷ (a + p) = ${a} ÷ (${a} + ${p})</b><br>El resto del tiempo, todo el decode está parado`,
      sOneK: 'Primer token de la solicitud punteada: mixto → desagregado', sOneF: 'Desde la llegada hasta que termina su paso de prefill. Con desagregación, el segundo token aún debe esperar a que el KV llegue a las GPU D',
      tReady: '<span class="c">$</span> Pulsa [ ▶ Reproducir ] para empezar; el tiempo va unas 3 veces más lento',
      ev: {
        arrive: (t) => `<span class="y">${t} ms</span> Llega una solicitud nueva y entra en la cola de prefill`,
        mixedPrefill: (t, p) => `<span class="m">${t} ms</span> Mixto: empieza un paso de prefill y todo el decode se pausa ${p} ms`,
        mixedFirst: (t, d) => `<span class="c">${t} ms</span> Mixto: la solicitud nueva recibe su primer token, tiempo hasta el primer token ${d} ms`,
        splitFirst: (t, d) => `<span class="c">${t} ms</span> Desagregado: la solicitud nueva recibe su primer token en una GPU P, tiempo hasta el primer token ${d} ms`,
        end: (gm) => `<span class="w">3000 ms</span> Fin. Las GPU D dieron un paso cada 13 ms y nunca pararon; el grupo mixto se detuvo hasta ${gm} ms`,
      },
      tVerdict: (gm, tm, ts) => `① En el despliegue mixto, un paso de prefill detiene el decode de todos durante <b>${gm} ms</b>; tras la desagregación, el ritmo del decode no cambia.<br>② Para parar menos veces, el despliegue mixto acumula trabajo de prefill, así que el tiempo medio hasta el primer token de una solicitud nueva pasa a ser <b>${tm} ms</b>; tras la desagregación es de unos <b>${ts} ms</b>.<br>③ La desagregación no es gratis: hay que añadir GPU P y el KV debe viajar de P a D.`,
      tTry: [
        'Baja K de <b>70</b> a <b>10</b>: el primer token llega antes, pero el decode se detiene con más frecuencia y la GPU dedica menos tiempo al decode.',
        'Elige un paso de prefill de <b>65.536</b>: en el despliegue mixto una sola parada pasa de 0,7 segundos, y lo nota mucho un usuario que ve cómo se escribe la respuesta.',
        'Mueve la solicitud nueva para que llegue mientras un paso de prefill <b>está corriendo</b>: el despliegue mixto espera una ronda completa más, y la desagregación solo medio paso.',
      ],
    },
    ar: {
      hCode: 'KV_HIT_LEDGER', hTitle: 'إصابة أم إعادة حساب: دفتر الأزمنة', hTag: 'تقدير تعليمي · القيم الافتراضية من تقرير المصدر الأصلي',
      hIntro: 'يصل طلب ببادئة طويلة. ذاكرة KV الخاصة بالبادئة موجودة على 3FS، فيمكنك قراءتها من جديد أو إعادة حسابها على GPU. حرّك المعاملات وانظر كم تستغرق <b>القراءة</b> وكم يستغرق <b>الحساب</b>. <b>زمن القراءة = عدد الرموز المصابة × بايتات الرمز ÷ عرض نطاق القراءة</b>؛ و<b>زمن الحساب = عدد الرموز ÷ إنتاجية prefill</b>. نفترض هنا أن القراءة والحساب لا يتداخلان، لذا فشريط «الإصابة» حدّ أعلى. وإنتاجية prefill هي متوسط رسم القياس؛ وقد يكون الذيل بعد بادئة طويلة أبطأ في الواقع.',
      lgLoad: 'قراءة KV من جديد من 3FS', lgReplay: 'إعادة التشغيل المحدودة: إعادة حساب 128 رمزًا', lgCompute: 'prefill على GPU',
      lLen: 'طول السياق L (رموز)', lRatio: 'نسبة ما في البادئة من المخزَّن مؤقتًا', lBw: 'عرض النطاق المخصص لهذه القراءة (GB/s)', lTps: 'إنتاجية prefill (token/s لكل بطاقة)',
      lKv: 'حجم KV للرمز الواحد (KiB، افتراض تعليمي)', lSwa: 'يمكن العثور على SWA KV (محليًا، أو يُسحب من جهاز آخر عبر الدليل)',
      bwPresets: [[40, '40 · عرض نطاق قراءة خادم تخزين واحد'], [2.2, '2.2 · نحو 18 بطاقة prefill تتقاسم خادمًا'], [1, '1 · قراءة أكثر ازدحامًا (افتراض)']],
      barMiss: 'إخفاق: إعادة حساب الكل', barHit: 'إصابة: قراءة البادئة وحساب الذيل فقط', stage: 'شريطان يقارنان زمن prefill عند الإصابة وعند الإخفاق',
      ms: (x) => `${x} ms`,
      sHitK: 'طول الإصابة القابل للاستخدام',
      sHitF: (cap, L1, swa) => `<b>= ⌊min(النسبة × L، L − 134) ÷ 128⌋ × 128</b><br>الحد L − 134 = ${cap}؛ وبالتقريب إلى مضاعف للعدد 128 نحصل على ${L1}${swa ? '' : '<br>لم يُعثر على SWA: يُتراجع كتلة واحدة، ويُطرح 128 أخرى'}`,
      sTtftK: 'زمن prefill: إخفاق ← إصابة',
      sTtftF: (load, comp) => `<b>إخفاق = L ÷ الإنتاجية</b><br><b>إصابة = قراءة ${load} ms + حساب ${comp} ms</b><br>الحساب = (L − طول الإصابة) ÷ الإنتاجية`,
      sGpuK: 'زمن GPU الذي يوفّره كل طلب كهذا', sGpuF: '<b>= طول الإصابة ÷ إنتاجية prefill</b><br>يمكن لـ GPU أن يقضي هذا الزمن في حساب رموز جديدة لغيرك',
      sBeK: 'حجم KV عند نقطة التعادل التي تتفوق فيها القراءة على الحساب', sBeF: (be, kv) => `<b>= عرض نطاق القراءة ÷ إنتاجية prefill</b><br>إذا كان KV للرمز أصغر من ${be} KiB فالقراءة أسرع من إعادة الحساب؛ والآن هو ${kv} KiB`,
      sStoreK: 'المساحة التي تشغلها هذه البادئة على 3FS', sStoreF: (n) => `<b>= طول الإصابة × بايتات الرمز</b><br>بنحو 14.4 TB لكل بطاقة، يتسع ذلك لنحو ${n} بادئة كهذه`,
      tokens: (n) => `${n} رمز`, gb: (x) => `${x} GB`, mb: (x) => `${x} MB`,
      ready: '<span class="c">$</span> حرّك أي معامل وسيُكتب الدفتر هنا خطوة بخطوة',
      l1: (L, wanted, L1, hit, swa) => `<span class="c">[1] طول الإصابة</span>: المطلوب ${wanted}، وبالتقريب إلى 128 نحصل على L1 = ${L1}${swa ? '' : '؛ SWA غير موجود، فيُتراجع إلى ' + hit} ← إصابة ${hit} / ${L}`,
      l2: (hit, kv, bw, ms) => `<span class="m">[2] القراءة</span>: ${hit} × ${kv} KiB ÷ ${bw} GB/s = ${ms} ms`,
      l3: (n, tps, ms, replay) => `<span class="w">[3] الحساب</span>: ${n} رمز ÷ ${tps} token/s = ${ms} ms${replay ? ' (يشمل 128 رمزًا من إعادة التشغيل المحدودة)' : ''}`,
      l4: (miss, hit) => `<span class="y">[4] المقارنة</span>: إخفاق ${miss} ms، إصابة ${hit} ms`,
      hVerdict: (x, saved, be, kv, slow) => slow
        ? `① KV للرمز الآن (${kv} KiB) أكبر من نقطة التعادل ${be} KiB: قراءته من جديد أبطأ من إعادة حسابه.<br>② يحدث هذا عندما تتقاسم بطاقات prefill كثيرة عرض النطاق. لذلك يجب أن ينمو عرض نطاق القراءة في عنقود التخزين مع عدد بطاقات prefill.`
        : `① بعد الإصابة يصبح prefill أسرع بنحو <b>${x} ضعف</b>، ويوفّر كل طلب كهذا نحو <b>${saved} ثانية</b> من زمن GPU.<br>② ما دام KV للرمز أصغر من ${be} KiB فالقراءة أسرع من الحساب؛ والآن هو ${kv} KiB، وهامش الأمان كبير.<br>③ عند غياب SWA لا يُعاد تشغيل سوى 128 رمزًا إضافيًا: عدد الرموز المعاد تشغيلها ثابت ولا يتوقف على طول السياق.`,
      hTry: [
        'ارفع طول السياق من <b>128K</b> إلى <b>1M</b>: يطول زمن الإخفاق، بينما تبقى الرموز الـ 128 في إعادة التشغيل المحدودة كما هي.',
        'اضغط <b>2.2 · نحو 18 بطاقة prefill تتقاسم خادمًا</b>: تنخفض نقطة التعادل إلى نحو 25 KiB. ثم اضغط <b>1</b> وارفع KV إلى <b>32 KiB</b>: تصبح نقطة التعادل نحو 11 KiB، وتصير القراءة أبطأ من الحساب.',
        'ألغِ تحديد <b>يمكن العثور على SWA KV</b>: ينقص طول الإصابة 128، ويزيد الزمن نحو 1.5 ms فقط.',
      ],

      tCode: 'PD_TIMELINE', tTitle: 'النشر المختلط مقابل فصل E/P/D: خطان زمنيان', tTag: 'تقدير تعليمي · أزمنة الخطوات من رسوم قياس المصدر الأصلي',
      tIntro: 'الخادم مزدحم: هناك دائمًا طلب في decode ودائمًا طلب جديد ينتظر prefill. في <b>النشر المختلط</b> تتوقف المجموعة نفسها من البطاقات بعد كل K خطوة decode لتشغّل خطوة prefill واحدة، وينتظر decode الجميع. وفي <b>الفصل</b> يعمل prefill على بطاقات P ويعمل decode على بطاقات D. اضغط <b>▶ تشغيل</b> لترى ما يحدث خلال 3 ثوانٍ. الخط المنقّط هو لحظة وصول طلب جديد. هنا تشغّل كل جولة خطوة prefill واحدة فقط؛ أما المحرك المختلط الحقيقي فيشغّل عدة خطوات متتالية ما دام لدى كل rank في DP عمل، فتكون التوقفات أطول فحسب.',
      lgDecode: 'خطوة decode واحدة (نحو 13 ms)', lgPrefill: 'خطوة prefill واحدة', lgTick: 'مستخدم يتلقى رمزًا جديدًا',
      laneMixed: 'نشر مختلط: المجموعة نفسها من البطاقات', laneP: 'فصل: بطاقات P (prefill فقط)', laneD: 'فصل: بطاقات D (decode فقط)',
      tStage: 'الخط الزمني لثلاث ثوانٍ للنشر المختلط والفصل', arrive: 'طلب جديد', first: 'أول رمز',
      lBatch: 'رموز كل خطوة prefill (لكل rank في DP)', lInterval: 'مختلط: إدراج prefill بعد كل كم خطوة decode (K)', lArrive: 'لحظة وصول الطلب الجديد (ms)',
      bPlay: '▶ تشغيل', bReplay: '▶ تشغيل مرة أخرى',
      sGapK: 'أطول توقف في decode: مختلط ← مفصول', sGapF: (p) => `<b>مختلط = خطوة decode 13 + خطوة prefill ${p}</b><br><b>مفصول = خطوة decode 13</b>`,
      tTtftK: 'متوسط زمن أول رمز: مختلط ← مفصول', tTtftF: (a) => `<b>مختلط = (a²/2 + 2pa + 1.5p²) ÷ (a + p)</b>، a = K × 13 = ${a} ms<br><b>مفصول = 1.5p</b>: انتظار نصف خطوة في المتوسط ثم حساب خطوة`,
      sShareK: 'نسبة زمن GPU المنفق على decode في النشر المختلط', sShareF: (a, p) => `<b>= a ÷ (a + p) = ${a} ÷ (${a} + ${p})</b><br>وفي بقية الوقت يكون كل decode متوقفًا`,
      sOneK: 'أول رمز للطلب المنقّط: مختلط ← مفصول', sOneF: 'من الوصول إلى نهاية خطوة prefill الخاصة به. وفي الفصل، لا يزال الرمز الثاني ينتظر وصول KV إلى بطاقات D',
      tReady: '<span class="c">$</span> اضغط [ ▶ تشغيل ] للبدء؛ يجري الزمن أبطأ بنحو 3 مرات',
      ev: {
        arrive: (t) => `<span class="y">${t} ms</span> يصل طلب جديد ويدخل طابور prefill`,
        mixedPrefill: (t, p) => `<span class="m">${t} ms</span> مختلط: تبدأ خطوة prefill ويتوقف كل decode مدة ${p} ms`,
        mixedFirst: (t, d) => `<span class="c">${t} ms</span> مختلط: يحصل الطلب الجديد على أول رمز، وزمن أول رمز ${d} ms`,
        splitFirst: (t, d) => `<span class="c">${t} ms</span> مفصول: يحصل الطلب الجديد على أول رمز على بطاقة P، وزمن أول رمز ${d} ms`,
        end: (gm) => `<span class="w">3000 ms</span> انتهى. عملت بطاقات D بخطوة كل 13 ms ولم تتوقف أبدًا؛ وتوقفت المجموعة المختلطة حتى ${gm} ms`,
      },
      tVerdict: (gm, tm, ts) => `① في النشر المختلط، تُوقف خطوة prefill واحدة decode للجميع مدة <b>${gm} ms</b>؛ وبعد الفصل لا يتغير إيقاع decode.<br>② ليتوقف مرات أقل، يجمع النشر المختلط عمل prefill، فيصير متوسط زمن أول رمز للطلب الجديد <b>${tm} ms</b>؛ وبعد الفصل نحو <b>${ts} ms</b>.<br>③ الفصل ليس مجانيًا: يجب إضافة بطاقات P، ويجب أن ينتقل KV من P إلى D.`,
      tTry: [
        'اخفض K من <b>70</b> إلى <b>10</b>: يصبح أول رمز أسرع، لكن decode يتوقف أكثر، وينقص الزمن الذي تقضيه البطاقة في decode.',
        'اختر خطوة prefill من <b>65,536</b>: في النشر المختلط يتجاوز التوقف الواحد 0.7 ثانية، وهذا ملحوظ جدًا لمستخدم يشاهد الإجابة تُكتب.',
        'انقل الطلب الجديد ليصل بينما خطوة prefill <b>تعمل</b>: ينتظر النشر المختلط جولة كاملة إضافية، وينتظر الفصل نصف خطوة فقط.',
      ],
    },
  });

  // Long labels sit on their own row and may wrap, so the control never forces the widget wider than a phone screen.
  const ctl = (label, cls, min, max, step, val) => `<div class="viz-slider" style="grid-template-columns:minmax(0,1fr) auto;min-width:0"><label style="grid-column:1/-1;white-space:normal;min-width:0">${label}</label><input class="${cls}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${Viz.esc(label)}"><output style="min-width:0"></output></div>`;
  const pick = (btns, i) => btns.forEach((b, j) => { b.className = 'viz-btn' + (j === i ? '' : ' ghost'); b.setAttribute('aria-pressed', String(j === i)); });
  // Size goes into the inline style too: a page-wide rule shrinks widget svg text to 10px, which would force a sideways scroll on phones.
  const txt = (svg, x, y, s, extra = {}) => {
    const size = extra['font-size'] || 14;
    const t = Viz.svg('text', { x, y, 'font-size': size, ...extra }, svg);
    t.textContent = s;
    t.setAttribute('style', `${extra.style || 'fill:var(--ink)'};font-size:${size}px`);
    return t;
  };

  Viz.register('di-pd-kv-hit', {
    mount(el) {
      const body = Viz.frame(el, { code: T.hCode, title: T.hTitle, tag: T.hTag, intro: T.hIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a2)', text: T.lgLoad },
        { color: 'var(--a3)', text: T.lgReplay },
        { color: 'var(--accent)', text: T.lgCompute, glow: true },
      ]) + '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 400 150', class: 'viz-stage', role: 'img', 'aria-label': T.stage }, left);
      left.insertAdjacentHTML('beforeend',
        ctl(T.lLen, 'h-len', 0, LENS.length - 1, 1, 4) + ctl(T.lRatio, 'h-ratio', 0, 100, 5, 90) +
        ctl(T.lBw, 'h-bw', 0.5, 50, 0.05, 40) +
        `<div class="viz-row h-pre" style="margin:4px 0 8px">${T.bwPresets.map(([, s]) => Viz.button(s, 'ghost')).join('')}</div>` +
        ctl(T.lTps, 'h-tps', 20000, 100000, 1000, 87000) + ctl(T.lKv, 'h-kv', 1, 32, 0.5, 8) +
        `<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px;min-width:0"><input class="h-swa" type="checkbox" checked style="accent-color:var(--accent)">${T.lSwa}</label>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'h-hit', k: T.sHitK, v: '', f: '' }) +
        Viz.stat({ id: 'h-ttft', k: T.sTtftK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'h-gpu', k: T.sGpuK, v: '', f: T.sGpuF }) +
        Viz.stat({ id: 'h-be', k: T.sBeK, v: '', f: '' }) +
        Viz.stat({ id: 'h-store', k: T.sStoreK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.hTry));
      const $ = s => el.querySelector(s);
      const preBtns = [...el.querySelectorAll('.h-pre .viz-btn')];
      const put = (id, v, f) => { $(`[data-s=${id}-v]`).textContent = v; if (f !== undefined) $(`[data-s=${id}-f]`).innerHTML = f; };

      function bars(r) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        const span = Math.max(r.missMs, r.hitMs), u = 380 / span;
        const lane = (y, label, parts, total) => {
          txt(svg, 10, y, label);
          Viz.svg('rect', { x: 10, y: y + 8, width: 380, height: 26, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
          let x = 10;
          for (const [ms, color] of parts) { const w = ms * u; if (w > 0) Viz.svg('rect', { x, y: y + 8, width: Math.max(w, 1), height: 26, style: `fill:${color}` }, svg); x += w; }
          const label2 = T.ms(Viz.fmt(total, total < 10 ? 1 : 0));
          const inside = x - 10 > 120;
          txt(svg, inside ? x - 6 : Math.min(x + 6, 300), y + 26, label2, { 'text-anchor': inside ? 'end' : 'start', style: inside ? 'fill:var(--paper);font-weight:700' : 'fill:var(--ink);font-weight:700' });
        };
        lane(18, T.barMiss, [[r.missMs, 'var(--accent)']], r.missMs);
        lane(88, T.barHit, [[r.loadMs, 'var(--a2)'], [r.replayMs, 'var(--a3)'], [r.suffixMs, 'var(--accent)']], r.hitMs);
      }

      function update() {
        const L = LENS[+$('.h-len').value], ratio = +$('.h-ratio').value / 100, readGBps = +$('.h-bw').value;
        const prefillTps = +$('.h-tps').value, kvKiB = +$('.h-kv').value, swaHit = !!$('.h-swa').checked;
        const r = M.hitTrade({ L, ratio, swaHit, prefillTps, readGBps, kvKiB });
        $('.h-len + output').textContent = `${Viz.fmt(L)}（${kTok(L)}）`;
        $('.h-ratio + output').textContent = Math.round(ratio * 100) + '%';
        $('.h-bw + output').textContent = Viz.fmt(readGBps, 2) + ' GB/s';
        $('.h-tps + output').textContent = Viz.fmt(prefillTps);
        $('.h-kv + output').textContent = Viz.fmt(kvKiB, 1) + ' KiB';
        preBtns.forEach((b, i) => { b.className = 'viz-btn' + (T.bwPresets[i][0] === readGBps ? '' : ' ghost'); b.setAttribute('aria-pressed', String(T.bwPresets[i][0] === readGBps)); });
        const f1 = x => Viz.fmt(x, x < 10 ? 1 : 0);
        put('h-hit', T.tokens(Viz.fmt(r.hit)), T.sHitF(Viz.fmt(r.cap), Viz.fmt(r.L1), swaHit));
        put('h-ttft', `${f1(r.missMs)} → ${f1(r.hitMs)} ms`, T.sTtftF(f1(r.loadMs), f1(r.computeMs)));
        put('h-gpu', T.ms(Viz.fmt(r.gpuSavedMs)));
        put('h-be', Viz.fmt(r.breakEvenKiB, 1) + ' KiB', T.sBeF(Viz.fmt(r.breakEvenKiB, 1), Viz.fmt(kvKiB, 1)));
        const st = r.storedBytes;
        put('h-store', st >= 1e9 ? T.gb(Viz.fmt(st / 1e9, 2)) : T.mb(Viz.fmt(st / 1e6, 0)), T.sStoreF(Number.isFinite(r.sessionsPerGpu) ? Viz.fmt(Math.round(r.sessionsPerGpu)) : '∞'));
        bars(r);
        term.clear();
        term.log(T.l1(Viz.fmt(L), Viz.fmt(r.wanted), Viz.fmt(r.L1), Viz.fmt(r.hit), swaHit));
        term.log(T.l2(Viz.fmt(r.hit), Viz.fmt(kvKiB, 1), Viz.fmt(readGBps, 2), f1(r.loadMs)));
        term.log(T.l3(Viz.fmt(r.compute), Viz.fmt(prefillTps), f1(r.computeMs), r.replay > 0));
        term.log(T.l4(f1(r.missMs), f1(r.hitMs)));
        const slow = kvKiB > r.breakEvenKiB;
        $('.viz-verdict').innerHTML = T.hVerdict(Viz.fmt(r.missMs / r.hitMs, 1), Viz.fmt(r.gpuSavedMs / 1000, 2), Viz.fmt(r.breakEvenKiB, 1), Viz.fmt(kvKiB, 1), slow);
      }
      el.querySelectorAll('input').forEach(i => { i.oninput = update; i.onchange = update; });
      preBtns.forEach((b, i) => { b.onclick = () => { $('.h-bw').value = T.bwPresets[i][0]; update(); }; });
      update();
    },
  });

  Viz.register('di-pd-kv-timeline', {
    mount(el, ctx) {
      const HORIZON = 3000, X0 = 10, W = 380, u = W / HORIZON;
      const body = Viz.frame(el, { code: T.tCode, title: T.tTitle, tag: T.tTag, intro: T.tIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a2)', text: T.lgDecode },
        { color: 'var(--accent)', text: T.lgPrefill, glow: true },
        { color: 'var(--ink)', text: T.lgTick },
      ]) + '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 400 236', class: 'viz-stage', role: 'img', 'aria-label': T.tStage }, left);
      left.insertAdjacentHTML('beforeend',
        `<div style="font-size:13px;color:var(--muted);margin-top:8px">${T.lBatch}</div><div class="viz-row t-batch" style="margin:4px 0 6px">${M.PREFILL_POINTS.map(p => Viz.button(Viz.fmt(p.tokens), 'ghost')).join('')}</div>` +
        ctl(T.lInterval, 't-int', 5, 100, 5, M.PREFILL_INTERVAL) + ctl(T.lArrive, 't-arr', 0, 1500, 10, 200) +
        `<div class="viz-row t-play" style="margin-top:8px">${Viz.button(T.bPlay)}<span class="t-clk" style="font-family:var(--mono);font-size:12px;color:var(--muted)">t = 0 ms</span></div>`);
      const term = Viz.term(left, T.tReady);
      right.innerHTML =
        Viz.stat({ id: 't-gap', k: T.sGapK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 't-ttft', k: T.tTtftK, v: '', f: '' }) +
        Viz.stat({ id: 't-share', k: T.sShareK, v: '', f: '' }) +
        Viz.stat({ id: 't-one', k: T.sOneK, v: '', f: T.sOneF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.tTry));
      const $ = s => el.querySelector(s);
      const batchBtns = [...el.querySelectorAll('.t-batch .viz-btn')];
      const playBtn = $('.t-play .viz-btn');
      const put = (id, v, f) => { $(`[data-s=${id}-v]`).textContent = v; if (f !== undefined) $(`[data-s=${id}-f]`).innerHTML = f; };
      let bi = 3, runs = null, playing = 0;

      function compute() {
        const prefillMs = M.PREFILL_POINTS[bi].ms, interval = +$('.t-int').value, arrivalMs = +$('.t-arr').value;
        const mixed = M.timeline({ mode: 'mixed', prefillMs, interval, arrivalMs, horizonMs: HORIZON });
        const split = M.timeline({ mode: 'split', prefillMs, interval, arrivalMs, horizonMs: HORIZON });
        runs = { prefillMs, interval, arrivalMs, mixed, split };
      }
      const LANES = { gpu: 26, p: 96, d: 152 };
      function draw(upTo) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        const { mixed, split, arrivalMs } = runs;
        txt(svg, X0, 18, T.laneMixed); txt(svg, X0, 88, T.laneP); txt(svg, X0, 144, T.laneD);
        for (const y of Object.values(LANES)) Viz.svg('rect', { x: X0, y, width: W, height: 22, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        // Back-to-back decode steps merge into one run, so a frame draws a few rectangles, not hundreds.
        const runsOf = list => list.reduce((acc, s) => { const last = acc[acc.length - 1]; if (last && last.kind === 'decode' && s.kind === 'decode' && Math.abs(last.end - s.start) < 1e-9) last.end = s.end; else acc.push({ ...s }); return acc; }, []);
        const seg = s => {
          if (s.start >= upTo) return;
          const end = Math.min(s.end, upTo, HORIZON), w = (end - s.start) * u;
          Viz.svg('rect', { x: X0 + s.start * u, y: LANES[s.lane], width: Math.max(0, w - (s.kind === 'prefill' ? 1 : 0)), height: 22, style: `fill:${s.kind === 'prefill' ? 'var(--accent)' : 'var(--a2)'}` }, svg);
        };
        runsOf(mixed.segments).forEach(seg); runsOf(split.segments.filter(s => s.lane === 'p')).forEach(seg); runsOf(split.segments.filter(s => s.lane === 'd')).forEach(seg);
        const ticks = (list, y) => {
          const d = list.filter(t => t <= Math.min(upTo, HORIZON)).map(t => `M${(X0 + t * u).toFixed(1)} ${y}V${y + 8}`).join('');
          if (d) Viz.svg('path', { d, fill: 'none', style: 'stroke:var(--ink);stroke-width:.8' }, svg);
        };
        ticks(mixed.ticks, 52); ticks(split.ticks, 178);
        if (upTo >= arrivalMs) {
          const x = X0 + arrivalMs * u;
          Viz.svg('path', { d: `M${x} 22V190`, fill: 'none', style: 'stroke:var(--a3);stroke-width:1.5;stroke-dasharray:4 3' }, svg);
          txt(svg, Math.min(x + 3, 340), 200, T.arrive, { 'font-size': 13, style: 'fill:var(--a3)' });
        }
        const mark = (t, y) => { if (t > upTo || t > HORIZON) return; const x = X0 + t * u; Viz.svg('circle', { cx: x, cy: y, r: 5, style: 'fill:var(--paper);stroke:var(--a3);stroke-width:2' }, svg); };
        mark(mixed.tracked.end, LANES.gpu + 11); mark(split.tracked.end, LANES.p + 11);
        for (let t = 0; t <= HORIZON; t += 500) {
          const x = X0 + t * u;
          Viz.svg('path', { d: `M${x} 210V215`, fill: 'none', style: 'stroke:var(--muted)' }, svg);
          txt(svg, x, 230, (t / 1000).toFixed(1) + ' s', { 'text-anchor': t === 0 ? 'start' : t === HORIZON ? 'end' : 'middle', 'font-size': 12, style: 'fill:var(--muted)' });
        }
      }
      function stats() {
        const { prefillMs: p, interval, mixed, split } = runs;
        const a = interval * M.DECODE_MS, f0 = x => Viz.fmt(Math.round(x));
        put('t-gap', `${f0(mixed.maxGap)} → ${f0(split.maxGap)} ms`, T.sGapF(p));
        put('t-ttft', `${f0(M.meanTtft('mixed', { prefillMs: p, interval }))} → ${f0(M.meanTtft('split', { prefillMs: p }))} ms`, T.tTtftF(a));
        put('t-share', Math.round(M.decodeShare({ prefillMs: p, interval }) * 100) + '%', T.sShareF(a, p));
        put('t-one', `${f0(mixed.tracked.ttft)} → ${f0(split.tracked.ttft)} ms`);
        $('.viz-verdict').innerHTML = T.tVerdict(f0(mixed.maxGap), f0(M.meanTtft('mixed', { prefillMs: p, interval })), f0(M.meanTtft('split', { prefillMs: p })));
      }
      function events() {
        const { prefillMs: p, arrivalMs, mixed, split } = runs;
        const list = [[arrivalMs, T.ev.arrive(arrivalMs)]];
        mixed.segments.filter(s => s.kind === 'prefill' && s.start < HORIZON).forEach(s => list.push([s.start, T.ev.mixedPrefill(s.start, p)]));
        list.push([mixed.tracked.end, T.ev.mixedFirst(mixed.tracked.end, mixed.tracked.ttft)]);
        list.push([split.tracked.end, T.ev.splitFirst(split.tracked.end, split.tracked.ttft)]);
        return list.filter(e => e[0] <= HORIZON).sort((x, y) => x[0] - y[0]);
      }
      function reset() { playing++; compute(); pick(batchBtns, bi); draw(HORIZON); stats(); $('.viz-verdict').hidden = true; term.clear(); term.log(T.tReady); $('.t-clk').textContent = 't = 0 ms'; playBtn.textContent = T.bPlay; }
      function play() {
        const id = ++playing, evs = events();
        let next = 0;
        term.clear();
        const t0 = performance.now();
        const tick = now => {
          if (id !== playing) return;
          const sim = ctx.reduced ? HORIZON : Math.min(HORIZON, (now - t0) / 3);
          while (next < evs.length && evs[next][0] <= sim) term.log(evs[next++][1]);
          draw(sim);
          $('.t-clk').textContent = `t = ${Math.round(sim)} ms`;
          if (sim < HORIZON) ctx.raf(tick);
          else { term.log(T.ev.end(Math.round(runs.mixed.maxGap))); $('.viz-verdict').hidden = false; playBtn.textContent = T.bReplay; }
        };
        ctx.raf(tick);
      }
      batchBtns.forEach((b, i) => { b.onclick = () => { bi = i; reset(); }; });
      ['.t-int', '.t-arr'].forEach(s => { $(s).oninput = () => { $(s + ' + output').textContent = $(s).value; reset(); }; });
      $('.t-int + output').textContent = $('.t-int').value;
      $('.t-arr + output').textContent = $('.t-arr').value;
      playBtn.onclick = play;
      reset();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
