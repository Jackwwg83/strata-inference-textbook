/* DeepInfer column, page spec-sched: the CPU/GPU timeline (sync vs zero-overhead) and the
   fixed-5 vs confidence-scheduled verification budget. All visible text lives in T (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.diSpecSched;

  const T = Viz.t({
    zh: {
      code: 'ZOS_TIMELINE', title: 'CPU 与 GPU 的时间线：同步 vs 异步', tag: '教学推演 · 时间为假设值',
      intro: '每一步解码，CPU 要做<b>后处理和调度</b>（纯 CPU 逻辑），GPU 要做<b>前向和采样</b>。上面一组是同步循环，下面一组是异步循环：CPU 提前一步，在 GPU 跑第 k 步时就把第 k+1 步排好。默认的 GPU 13 ms 是从 README 解码图读出的约数，CPU 4 ms 是假设，上游没有公布 CPU 每步花多久。',
      lgCpu: 'CPU：后处理 ＋ 调度', lgGpu: 'GPU：前向 ＋ 采样', lgIdle: '底色露出来 = 这一段闲着',
      laneSync: '同步', laneAsync: '异步', cpu: 'CPU', gpu: 'GPU', stepLabel: (k) => `${k}`,
      cpuLabel: 'CPU 每步耗时', gpuLabel: 'GPU 每步耗时', ms: (v) => `${v} ms`,
      bPlay: '▶ 播放 6 步',
      ready: '<span class="c">$</span> ready. 调好两个滑块，按 [ ▶ 播放 6 步 ]',
      lSyncGap: (t, d) => `<span class="m">同步 t=${t}</span> GPU 做完一步，停下来等 CPU 后处理和调度：空等 ${d} ms`,
      lAsyncOk: (t, k) => `<span class="c">异步 t=${t}</span> 第 ${k} 步的输入早已排好，GPU 接着就跑，没有空档`,
      lAsyncGap: (t, d) => `<span class="y">异步 t=${t}</span> CPU 比 GPU 慢，下一步还没排好：GPU 空等 ${d} ms`,
      lDone: (s, a) => `<span class="y">// 6 步跑完：同步 ${s} ms，异步 ${a} ms</span>`,
      endText: (t) => `${t} ms 跑完`,
      sSyncK: '同步：每步周期', sSyncF: '<b>= CPU ＋ GPU</b><br>两边轮流干，总有一边在等',
      sAsyncK: '异步：每步周期', sAsyncF: '<b>= max(CPU, GPU)</b><br>慢的那一边决定节奏',
      sUtilK: 'GPU 忙碌的比例', sUtilF: (s, a) => `<b>同步 ${s}% → 异步 ${a}%</b><br>= GPU ÷ 周期`,
      sGainK: '吞吐提高', sGainF: '<b>= (CPU ＋ GPU) ÷ max(CPU, GPU)</b><br>稳态下每秒多走的步数',
      vHide: (c, g, x) => `① CPU 每步 ${c} ms，比 GPU 的 ${g} ms 少，异步循环把它整个藏到了 GPU 后面：GPU 一步接一步，吞吐提高到 <b>${x} 倍</b>。<br>② 藏的是 CPU 的时间，CPU 的活一点没少。<br>③ CPU 只领先一步：它要等第 k−1 步采样完成，才能做那一步的后处理。`,
      vSlow: (c, g, d) => `① CPU 每步 ${c} ms，比 GPU 的 ${g} ms 还慢：异步循环里 GPU 每步仍要空等 <b>${d} ms</b>。<br>② 这时瓶颈在 CPU。“零开销”只在 CPU 每步的活不超过 GPU 一步时成立。<br>③ 所以批越大、请求越多，CPU 端的调度代码越要快。`,
      try: [
        '默认 CPU 4 ms、GPU 13 ms：同步每步 17 ms，异步每步 13 ms，吞吐多约 31%。按 <b>播放</b>，看同步一组的 GPU 每步都停一下。',
        '把 CPU 拉到 <b>13 ms</b>，和 GPU 相等：提速正好 2 倍，异步一组的 GPU 仍然不停。',
        '把 CPU 拉到 <b>20 ms</b>：异步一组的 GPU 又开始空等，每步变成 20 ms。零开销的前提是 CPU 每步的活比 GPU 少。',
      ],

      vCode: 'VARLEN_BUDGET', vTitle: '验几个草稿：固定 5 个 vs 按置信度', vTag: '教学推演 · 置信度为随机数',
      vIntro: '每个请求有 1 个必验的主模型 token 和 5 个草稿 token。格子里的数是“这个草稿派上用场的概率”，即置信度一路乘到这里。验证不免费，教学假设：<b>一步耗时 = 10 ms ＋ t₁ × 图大小</b>，图大小是装得下本步 token 的最小那张 CUDA Graph（1、2、4、8、16、24……每隔 8 一张），所以耗时是一级级台阶。按置信度验证时，调度器从概率最高的草稿开始逐个加名额，挑“每毫秒期望 token 最多”的那个总数。模拟器只用一份置信度；真实引擎定总数时用的是再早一轮的。',
      lgMain: '主模型 token：每个请求必验', lgPick: '本步要验的草稿', lgSkip: '本步不验的草稿',
      bFixed: '看：固定 5 个', bVar: '看：按置信度', bShuffle: '换一批置信度',
      nLabel: '并发请求数 N', tLabel: '图每大 1 个 token 的耗时 t₁', nOut: (n) => `N = ${n}`, tOut: (t) => `${t} ms`,
      main: '主', rowLabel: (i) => `#${i}`,
      gridLabel: '每个请求的草稿和它们派上用场的概率',
      sQK: '本步验证的 token 数', sQF: (gv, gf) => `<b>按置信度 / 固定 5 个</b><br>= 请求数 ＋ 被选中的草稿数<br>重放的图：${gv} / ${gf}`,
      sEK: '期望提交的 token 数', sEF: '<b>= N ＋ Σ 被验草稿的累乘置信度</b><br>没验的草稿贡献 0',
      sTK: '吞吐（期望 token / ms）', sTF: (g) => `<b>= 期望 token ÷ (10 ＋ t₁ × 图大小)</b><br>按置信度比固定 5 个：${g}`,
      verdict: (dq, de, g) => `① 按置信度少验了 <b>${dq}</b> 个 token，期望只少提交 <b>${de}</b> 个：被砍掉的都是希望渺茫的草稿。<br>② 吞吐变化 <b>${g}</b>。只有总数跌过一张图的边界才省时间；验证越贵（t₁ 越大）、请求越多，砍得越多，赚得越多。<br>③ 这里置信度就是真实概率，所以按置信度不会亏。真实系统里置信度是估计，耗时模型也有误差，定总数用的还是更早一轮的数；上游表里每卡 16 条时慢了 1.5%，可能的原因之一就在这里。`,
      vTry: [
        '把 t₁ 拉到 <b>0</b>：验证免费，按置信度也会把 5 个草稿全验，两种做法一模一样。',
        '回到默认 N = 8、t₁ = 0.08（第一批置信度）：总数从 48 砍到 40，正好少一张图；期望只少约 0.35 个，吞吐多约 3%。注意选中的总数总是 8 的倍数。',
        '把 N 拉到 <b>16</b>、t₁ 拉到 <b>0.15</b>：差距涨到十几个百分点。方向和上游的表一致：并发越高，变长验证越赚。',
      ],
    },
    en: {
      code: 'ZOS_TIMELINE', title: 'CPU and GPU timeline: synchronous vs asynchronous', tag: 'Teaching estimate · times are assumed',
      intro: 'In every decode step, the CPU does <b>post-processing and scheduling</b> (pure CPU logic) and the GPU does <b>forward and sampling</b>. The top group is the synchronous loop and the bottom group is the asynchronous loop: the CPU runs one step ahead and has step k+1 ready while the GPU runs step k. The default GPU 13 ms is an approximate value read from the README decode chart. The CPU 4 ms is an assumption, because upstream does not publish how long the CPU takes per step.',
      lgCpu: 'CPU: post-process + schedule', lgGpu: 'GPU: forward + sampling', lgIdle: 'Background showing = this stretch is idle',
      laneSync: 'Synchronous', laneAsync: 'Asynchronous', cpu: 'CPU', gpu: 'GPU', stepLabel: (k) => `${k}`,
      cpuLabel: 'CPU time per step', gpuLabel: 'GPU time per step', ms: (v) => `${v} ms`,
      bPlay: '▶ Play 6 steps',
      ready: '<span class="c">$</span> ready. Set the two sliders, then press [ ▶ Play 6 steps ]',
      lSyncGap: (t, d) => `<span class="m">sync t=${t}</span> the GPU finishes a step and stops to wait for the CPU to post-process and schedule: idle ${d} ms`,
      lAsyncOk: (t, k) => `<span class="c">async t=${t}</span> the input of step ${k} was ready long ago, so the GPU runs on with no gap`,
      lAsyncGap: (t, d) => `<span class="y">async t=${t}</span> the CPU is slower than the GPU and the next step is not ready: the GPU idles ${d} ms`,
      lDone: (s, a) => `<span class="y">// 6 steps done: sync ${s} ms, async ${a} ms</span>`,
      endText: (t) => `done in ${t} ms`,
      sSyncK: 'Sync: cycle per step', sSyncF: '<b>= CPU + GPU</b><br>The two take turns, so one side is always waiting',
      sAsyncK: 'Async: cycle per step', sAsyncF: '<b>= max(CPU, GPU)</b><br>The slower side sets the pace',
      sUtilK: 'Share of time the GPU is busy', sUtilF: (s, a) => `<b>sync ${s}% → async ${a}%</b><br>= GPU ÷ cycle`,
      sGainK: 'Throughput gain', sGainF: '<b>= (CPU + GPU) ÷ max(CPU, GPU)</b><br>Extra steps per second in steady state',
      vHide: (c, g, x) => `① The CPU takes ${c} ms per step, less than the GPU's ${g} ms. The asynchronous loop hides all of it behind the GPU: the GPU runs one step after another, and throughput rises to <b>${x}×</b>.<br>② What is hidden is the CPU's time. The CPU's work is not reduced at all.<br>③ The CPU is only one step ahead: it must wait for step k−1 to finish sampling before it can post-process that step.`,
      vSlow: (c, g, d) => `① The CPU takes ${c} ms per step, even slower than the GPU's ${g} ms. In the asynchronous loop the GPU still idles <b>${d} ms</b> every step.<br>② Now the bottleneck is the CPU. "Zero overhead" holds only when the CPU's work per step does not exceed one GPU step.<br>③ So the bigger the batch and the more requests, the faster the CPU-side scheduling code has to be.`,
      try: [
        'Default CPU 4 ms, GPU 13 ms: sync takes 17 ms per step, async 13 ms, about 31% more throughput. Press <b>Play</b> and watch the GPU stop at every step in the sync group.',
        'Drag the CPU to <b>13 ms</b>, equal to the GPU: the speedup is exactly 2×, and the GPU in the async group still never stops.',
        'Drag the CPU to <b>20 ms</b>: the GPU in the async group starts to idle again, and each step becomes 20 ms. Zero overhead needs the CPU to do less per step than the GPU.',
      ],

      vCode: 'VARLEN_BUDGET', vTitle: 'How many drafts to verify: fixed 5 vs by confidence', vTag: 'Teaching estimate · confidence is random',
      vIntro: 'Each request has 1 main-model token that must be verified and 5 draft tokens. The number in a cell is "the chance this draft turns out useful", that is, the confidence multiplied along the row up to this cell. Verification is not free. Teaching assumption: <b>one step takes 10 ms + t₁ × graph size</b>, where the graph size is the smallest CUDA Graph that holds this step\'s tokens (1, 2, 4, 8, 16, 24 … one every 8), so the time is a staircase. With confidence scheduling, the scheduler starts from the highest-probability draft, adds one slot at a time, and picks the total with the most expected tokens per millisecond. The simulator uses only one set of confidence scores. When the real engine fixes the total, it uses the set from an even earlier round.',
      lgMain: 'Main-model token: always verified', lgPick: 'Drafts verified this step', lgSkip: 'Drafts not verified this step',
      bFixed: 'View: fixed 5', bVar: 'View: by confidence', bShuffle: 'New confidence set',
      nLabel: 'Concurrent requests N', tLabel: 'Time per extra token of graph size, t₁', nOut: (n) => `N = ${n}`, tOut: (t) => `${t} ms`,
      main: 'Main', rowLabel: (i) => `#${i}`,
      gridLabel: 'The drafts of each request and the chance each one is used',
      sQK: 'Tokens verified this step', sQF: (gv, gf) => `<b>by confidence / fixed 5</b><br>= number of requests + number of drafts chosen<br>Graph replayed: ${gv} / ${gf}`,
      sEK: 'Expected tokens committed', sEF: '<b>= N + Σ cumulative confidence of verified drafts</b><br>Drafts not verified add 0',
      sTK: 'Throughput (expected tokens / ms)', sTF: (g) => `<b>= expected tokens ÷ (10 + t₁ × graph size)</b><br>By confidence vs fixed 5: ${g}`,
      verdict: (dq, de, g) => `① Confidence scheduling verified <b>${dq}</b> fewer tokens and committed only <b>${de}</b> fewer in expectation: everything it cut was a draft with little hope.<br>② Throughput change: <b>${g}</b>. Time is saved only when the total drops across a graph boundary. The more expensive verification is (larger t₁) and the more requests there are, the more it cuts and the more it gains.<br>③ Here the confidence is the true probability, so confidence scheduling cannot lose. In a real system the confidence is an estimate, the timing model has errors, and the total is fixed from an even earlier round. The upstream table shows 1.5% slower at 16 requests per GPU, and this may be one of the reasons.`,
      vTry: [
        'Drag t₁ to <b>0</b>: verification is free, so confidence scheduling also verifies all 5 drafts, and the two methods are identical.',
        'Back to the default N = 8, t₁ = 0.08 (first confidence set): the total drops from 48 to 40, exactly one graph size less. Expected tokens drop by only about 0.35, and throughput rises by about 3%. Note that the chosen total is always a multiple of 8.',
        'Drag N to <b>16</b> and t₁ to <b>0.15</b>: the gap grows to over ten percentage points. The direction agrees with the upstream table: the higher the concurrency, the more variable-length verification gains.',
      ],
    },
    ja: {
      code: 'ZOS_TIMELINE', title: 'CPU と GPU のタイムライン：同期と非同期', tag: '教育用の試算 · 時間は仮定の値',
      intro: 'デコードの 1 ステップごとに、CPU は<b>後処理とスケジューリング</b>（CPU だけの処理）を行い、GPU は<b>順伝播とサンプリング</b>を行います。上の組が同期ループ、下の組が非同期ループです。非同期では CPU が 1 ステップ先を進み、GPU が k 番目のステップを走らせている間に k+1 番目のステップを準備し終えます。既定の GPU 13 ms は、README のデコード図から読み取ったおおよその値です。CPU の 4 ms は仮定で、CPU が 1 ステップにどれだけかかるかを上流は公表していません。',
      lgCpu: 'CPU：後処理 ＋ スケジューリング', lgGpu: 'GPU：順伝播 ＋ サンプリング', lgIdle: '地色が見える ＝ その区間は遊んでいる',
      laneSync: '同期', laneAsync: '非同期', cpu: 'CPU', gpu: 'GPU', stepLabel: (k) => `${k}`,
      cpuLabel: 'CPU の 1 ステップあたりの時間', gpuLabel: 'GPU の 1 ステップあたりの時間', ms: (v) => `${v} ms`,
      bPlay: '▶ 6 ステップを再生',
      ready: '<span class="c">$</span> ready. 2 つのスライダーを合わせて、[ ▶ 6 ステップを再生 ] を押してください',
      lSyncGap: (t, d) => `<span class="m">同期 t=${t}</span> GPU は 1 ステップを終えると止まり、CPU の後処理とスケジューリングを待ちます：${d} ms 遊んでいます`,
      lAsyncOk: (t, k) => `<span class="c">非同期 t=${t}</span> ${k} 番目のステップの入力はとっくに準備済みなので、GPU はそのまま走り、空きがありません`,
      lAsyncGap: (t, d) => `<span class="y">非同期 t=${t}</span> CPU が GPU より遅く、次のステップが準備できていません：GPU は ${d} ms 遊んでいます`,
      lDone: (s, a) => `<span class="y">// 6 ステップ完了：同期 ${s} ms、非同期 ${a} ms</span>`,
      endText: (t) => `${t} ms で完了`,
      sSyncK: '同期：1 ステップの周期', sSyncF: '<b>= CPU ＋ GPU</b><br>2 つが交代で動くので、必ずどちらかが待っています',
      sAsyncK: '非同期：1 ステップの周期', sAsyncF: '<b>= max(CPU, GPU)</b><br>遅いほうが拍子を決めます',
      sUtilK: 'GPU が稼働している割合', sUtilF: (s, a) => `<b>同期 ${s}% → 非同期 ${a}%</b><br>= GPU ÷ 周期`,
      sGainK: 'スループットの向上', sGainF: '<b>= (CPU ＋ GPU) ÷ max(CPU, GPU)</b><br>定常状態で 1 秒あたりに増えるステップ数',
      vHide: (c, g, x) => `① CPU は 1 ステップ ${c} ms で、GPU の ${g} ms より短いです。非同期ループはそのすべてを GPU の陰に隠します。GPU は 1 ステップずつ途切れず進み、スループットは <b>${x} 倍</b>に上がります。<br>② 隠れるのは CPU の時間です。CPU の仕事は少しも減っていません。<br>③ CPU が先に進めるのは 1 ステップだけです。k−1 番目のステップのサンプリング完了を待たないと、そのステップの後処理ができません。`,
      vSlow: (c, g, d) => `① CPU は 1 ステップ ${c} ms で、GPU の ${g} ms よりさらに遅いです。非同期ループでも、GPU は毎ステップ <b>${d} ms</b> 遊びます。<br>② このときのボトルネックは CPU です。「ゼロオーバーヘッド」が成り立つのは、CPU の 1 ステップの仕事が GPU の 1 ステップを超えないときだけです。<br>③ だから、バッチが大きく、リクエストが多いほど、CPU 側のスケジューリングのコードは速くなければなりません。`,
      try: [
        '既定の CPU 4 ms、GPU 13 ms：同期は 1 ステップ 17 ms、非同期は 1 ステップ 13 ms で、スループットは約 31% 増えます。<b>再生</b>を押して、同期の組の GPU がステップごとに止まるのを見てください。',
        'CPU を <b>13 ms</b> にして GPU と同じにします。高速化はちょうど 2 倍で、非同期の組の GPU は相変わらず止まりません。',
        'CPU を <b>20 ms</b> にします。非同期の組の GPU がまた遊び始め、1 ステップが 20 ms になります。ゼロオーバーヘッドの前提は、CPU の 1 ステップの仕事が GPU より少ないことです。',
      ],

      vCode: 'VARLEN_BUDGET', vTitle: 'ドラフトをいくつ検証するか：固定 5 個と信頼度順', vTag: '教育用の試算 · 信頼度は乱数',
      vIntro: '各リクエストには、必ず検証するメインモデルのトークンが 1 個と、ドラフトトークンが 5 個あります。マスの数字は「このドラフトが役に立つ確率」で、信頼度をここまで掛け合わせたものです。検証はタダではありません。教育用の仮定：<b>1 ステップの所要時間 = 10 ms ＋ t₁ × グラフの大きさ</b>。グラフの大きさは、このステップのトークンが収まる最小の CUDA Graph（1、2、4、8、16、24 … と 8 おき）なので、所要時間は階段状になります。信頼度順に検証するとき、スケジューラは確率がいちばん高いドラフトから 1 つずつ枠を足し、「1 ミリ秒あたりの期待トークン数」が最大になる総数を選びます。シミュレータは信頼度を 1 組しか使いません。実際のエンジンは、総数を決めるときにさらに前のラウンドの信頼度を使います。',
      lgMain: 'メインモデルのトークン：必ず検証', lgPick: 'このステップで検証するドラフト', lgSkip: 'このステップで検証しないドラフト',
      bFixed: '固定 5 個', bVar: '信頼度順', bShuffle: '引き直す',
      nLabel: '同時リクエスト数 N', tLabel: 'グラフ 1 トークンの時間 t₁', nOut: (n) => `N = ${n}`, tOut: (t) => `${t} ms`,
      main: '主', rowLabel: (i) => `#${i}`,
      gridLabel: '各リクエストのドラフトと、それが役に立つ確率',
      sQK: 'このステップで検証するトークン数', sQF: (gv, gf) => `<b>信頼度順 / 固定 5 個</b><br>= リクエスト数 ＋ 選ばれたドラフト数<br>リプレイするグラフ：${gv} / ${gf}`,
      sEK: '期待コミットトークン数', sEF: '<b>= N ＋ Σ 検証したドラフトの累積信頼度</b><br>検証しなかったドラフトの寄与は 0',
      sTK: 'スループット（期待トークン / ms）', sTF: (g) => `<b>= 期待トークン数 ÷ (10 ＋ t₁ × グラフの大きさ)</b><br>信頼度順と固定 5 個の比較：${g}`,
      verdict: (dq, de, g) => `① 信頼度順では検証するトークンが <b>${dq}</b> 個少なく、期待コミット数は <b>${de}</b> 個しか減りません。削られたのは、どれも見込みの薄いドラフトです。<br>② スループットの変化は <b>${g}</b> です。時間が減るのは、総数がグラフの境目を下回ったときだけです。検証が高くつく（t₁ が大きい）ほど、リクエストが多いほど、削る量が増えて、得も大きくなります。<br>③ ここでは信頼度がそのまま真の確率なので、信頼度順で損をすることはありません。実際のシステムでは、信頼度は見積もりで、時間のモデルにも誤差があり、総数を決めるのにはさらに前のラウンドの値を使います。上流の表で GPU 1 枚あたり 16 件のとき 1.5% 遅くなるのは、このあたりが理由の 1 つかもしれません。`,
      vTry: [
        't₁ を <b>0</b> にします。検証がタダになるので、信頼度順でも 5 個のドラフトを全部検証し、2 つの方式がまったく同じになります。',
        '既定の N = 8、t₁ = 0.08（最初の信頼度）に戻します。総数は 48 から 40 に減り、ちょうどグラフ 1 段ぶん少なくなります。期待トークン数は約 0.35 個減るだけで、スループットは約 3% 増えます。選ばれる総数が必ず 8 の倍数になることに注目してください。',
        'N を <b>16</b>、t₁ を <b>0.15</b> にします。差が十数ポイントに広がります。向きは上流の表と同じです。同時実行数が多いほど、可変長検証は得になります。',
      ],
    },
    ko: {
      code: 'ZOS_TIMELINE', title: 'CPU와 GPU 타임라인: 동기 vs 비동기', tag: '교육용 추정 · 시간은 가정한 값',
      intro: '디코드 스텝마다 CPU는 <b>후처리와 스케줄링</b>(CPU만 쓰는 로직)을 하고, GPU는 <b>순전파와 샘플링</b>을 합니다. 위쪽 묶음은 동기 루프이고, 아래쪽 묶음은 비동기 루프입니다. 비동기에서는 CPU가 한 스텝 앞서가서, GPU가 k번째 스텝을 돌리는 동안 k+1번째 스텝을 미리 줄 세웁니다. 기본 GPU 13 ms는 README 디코드 그림에서 읽은 근삿값이고, CPU 4 ms는 가정입니다. CPU가 스텝마다 얼마나 걸리는지는 업스트림이 공개하지 않았습니다.',
      lgCpu: 'CPU: 후처리 ＋ 스케줄링', lgGpu: 'GPU: 순전파 ＋ 샘플링', lgIdle: '바탕색이 보임 = 그 구간은 놀고 있음',
      laneSync: '동기', laneAsync: '비동기', cpu: 'CPU', gpu: 'GPU', stepLabel: (k) => `${k}`,
      cpuLabel: 'CPU 스텝당 시간', gpuLabel: 'GPU 스텝당 시간', ms: (v) => `${v} ms`,
      bPlay: '▶ 6스텝 재생',
      ready: '<span class="c">$</span> ready. 슬라이더 두 개를 맞춘 뒤 [ ▶ 6스텝 재생 ]을 누르세요',
      lSyncGap: (t, d) => `<span class="m">동기 t=${t}</span> GPU가 한 스텝을 끝내고 멈춰서 CPU의 후처리와 스케줄링을 기다립니다. 대기 ${d} ms`,
      lAsyncOk: (t, k) => `<span class="c">비동기 t=${t}</span> ${k}번째 스텝의 입력은 이미 준비되어 있어서 GPU가 바로 이어서 돌고, 빈틈이 없습니다`,
      lAsyncGap: (t, d) => `<span class="y">비동기 t=${t}</span> CPU가 GPU보다 느려서 다음 스텝이 아직 준비되지 않았습니다. GPU 대기 ${d} ms`,
      lDone: (s, a) => `<span class="y">// 6스텝 완료: 동기 ${s} ms, 비동기 ${a} ms</span>`,
      endText: (t) => `${t} ms에 완료`,
      sSyncK: '동기: 스텝당 주기', sSyncF: '<b>= CPU ＋ GPU</b><br>둘이 번갈아 일하므로 항상 한쪽은 기다립니다',
      sAsyncK: '비동기: 스텝당 주기', sAsyncF: '<b>= max(CPU, GPU)</b><br>느린 쪽이 박자를 정합니다',
      sUtilK: 'GPU가 일하는 비율', sUtilF: (s, a) => `<b>동기 ${s}% → 비동기 ${a}%</b><br>= GPU ÷ 주기`,
      sGainK: '처리량 향상', sGainF: '<b>= (CPU ＋ GPU) ÷ max(CPU, GPU)</b><br>정상 상태에서 초당 더 가는 스텝 수',
      vHide: (c, g, x) => `① CPU는 스텝당 ${c} ms로, GPU의 ${g} ms보다 짧습니다. 비동기 루프는 그것을 통째로 GPU 뒤에 숨깁니다. GPU가 한 스텝씩 끊김 없이 이어지고, 처리량은 <b>${x}배</b>로 올라갑니다.<br>② 숨겨지는 것은 CPU의 시간입니다. CPU의 일은 조금도 줄지 않았습니다.<br>③ CPU는 한 스텝만 앞섭니다. k−1번째 스텝의 샘플링이 끝나길 기다려야 그 스텝의 후처리를 할 수 있습니다.`,
      vSlow: (c, g, d) => `① CPU는 스텝당 ${c} ms로, GPU의 ${g} ms보다 더 느립니다. 비동기 루프에서도 GPU는 스텝마다 <b>${d} ms</b>씩 놉니다.<br>② 이때의 병목은 CPU입니다. "제로 오버헤드"는 CPU의 스텝당 일이 GPU 한 스텝을 넘지 않을 때만 성립합니다.<br>③ 그래서 배치가 크고 요청이 많을수록 CPU 쪽 스케줄링 코드는 더 빨라야 합니다.`,
      try: [
        '기본값 CPU 4 ms, GPU 13 ms: 동기는 스텝당 17 ms, 비동기는 스텝당 13 ms로 처리량이 약 31% 늘어납니다. <b>재생</b>을 눌러서 동기 묶음의 GPU가 스텝마다 멈추는 것을 보세요.',
        'CPU를 <b>13 ms</b>로 끌어 GPU와 같게 만드세요. 속도 향상은 정확히 2배이고, 비동기 묶음의 GPU는 여전히 멈추지 않습니다.',
        'CPU를 <b>20 ms</b>로 끌어 보세요. 비동기 묶음의 GPU가 다시 놀기 시작하고, 스텝이 20 ms가 됩니다. 제로 오버헤드의 전제는 CPU의 스텝당 일이 GPU보다 적다는 것입니다.',
      ],

      vCode: 'VARLEN_BUDGET', vTitle: '드래프트를 몇 개 검증할까: 고정 5개 vs 신뢰도순', vTag: '교육용 추정 · 신뢰도는 난수',
      vIntro: '요청마다 반드시 검증하는 메인 모델 토큰 1개와 드래프트 토큰 5개가 있습니다. 칸 안의 숫자는 "이 드래프트가 쓸모 있을 확률"로, 신뢰도를 여기까지 곱한 값입니다. 검증은 공짜가 아닙니다. 교육용 가정: <b>한 스텝 소요 시간 = 10 ms ＋ t₁ × 그래프 크기</b>. 그래프 크기는 이번 스텝의 토큰이 들어가는 가장 작은 CUDA Graph(1, 2, 4, 8, 16, 24 … 8마다 하나)이므로, 소요 시간은 계단 모양입니다. 신뢰도순으로 검증할 때 스케줄러는 확률이 가장 높은 드래프트부터 슬롯을 하나씩 더하고, "1밀리초당 기대 토큰 수"가 가장 큰 총합을 고릅니다. 시뮬레이터는 신뢰도를 한 벌만 씁니다. 실제 엔진은 총합을 정할 때 더 이전 라운드의 신뢰도를 씁니다.',
      lgMain: '메인 모델 토큰: 반드시 검증', lgPick: '이번 스텝에서 검증할 드래프트', lgSkip: '이번 스텝에서 검증하지 않는 드래프트',
      bFixed: '고정 5개', bVar: '신뢰도순', bShuffle: '다시 뽑기',
      nLabel: '동시 요청 수 N', tLabel: '그래프 토큰 1개당 시간 t₁', nOut: (n) => `N = ${n}`, tOut: (t) => `${t} ms`,
      main: '주', rowLabel: (i) => `#${i}`,
      gridLabel: '각 요청의 드래프트와 그것이 쓰일 확률',
      sQK: '이번 스텝에서 검증하는 토큰 수', sQF: (gv, gf) => `<b>신뢰도순 / 고정 5개</b><br>= 요청 수 ＋ 선택된 드래프트 수<br>리플레이하는 그래프: ${gv} / ${gf}`,
      sEK: '기대 커밋 토큰 수', sEF: '<b>= N ＋ Σ 검증한 드래프트의 누적 신뢰도</b><br>검증하지 않은 드래프트는 0을 더함',
      sTK: '처리량(기대 토큰 / ms)', sTF: (g) => `<b>= 기대 토큰 수 ÷ (10 ＋ t₁ × 그래프 크기)</b><br>신뢰도순과 고정 5개 비교: ${g}`,
      verdict: (dq, de, g) => `① 신뢰도순은 검증하는 토큰이 <b>${dq}</b>개 적고, 기대 커밋 수는 <b>${de}</b>개만 줄었습니다. 잘려 나간 것은 모두 가망이 희박한 드래프트입니다.<br>② 처리량 변화는 <b>${g}</b>입니다. 시간이 줄어드는 것은 총합이 그래프의 경계 아래로 떨어질 때뿐입니다. 검증이 비쌀수록(t₁이 클수록), 요청이 많을수록 더 많이 자르고 더 많이 이득을 봅니다.<br>③ 여기서는 신뢰도가 곧 진짜 확률이라서 신뢰도순이 손해를 볼 수 없습니다. 실제 시스템에서는 신뢰도가 추정치이고, 시간 모델에도 오차가 있으며, 총합을 정하는 데는 더 이전 라운드의 값을 씁니다. 업스트림 표에서 GPU당 16개일 때 1.5% 느려지는 것도 이런 이유 중 하나일 수 있습니다.`,
      vTry: [
        't₁을 <b>0</b>으로 끌어 보세요. 검증이 공짜가 되므로 신뢰도순도 드래프트 5개를 전부 검증하고, 두 방식이 완전히 같아집니다.',
        '기본값 N = 8, t₁ = 0.08(첫 번째 신뢰도 묶음)로 돌아가 보세요. 총합이 48에서 40으로 줄어 정확히 그래프 한 단계만큼 적어집니다. 기대 토큰은 약 0.35개만 줄고 처리량은 약 3% 늘어납니다. 선택된 총합이 항상 8의 배수라는 점을 눈여겨보세요.',
        'N을 <b>16</b>, t₁을 <b>0.15</b>로 끌어 보세요. 차이가 십몇 퍼센트포인트까지 벌어집니다. 방향은 업스트림 표와 같습니다. 동시 처리가 많을수록 가변 길이 검증이 더 이득입니다.',
      ],
    },
    es: {
      code: 'ZOS_TIMELINE', title: 'Línea de tiempo de CPU y GPU: síncrono vs asíncrono', tag: 'Estimación didáctica · tiempos supuestos',
      intro: 'En cada paso de decodificación, la CPU hace el <b>posprocesamiento y la planificación</b> (lógica puramente de CPU) y la GPU hace el <b>paso hacia adelante y el muestreo</b>. El grupo de arriba es el bucle síncrono y el de abajo es el bucle asíncrono: la CPU va un paso por delante y deja listo el paso k+1 mientras la GPU corre el paso k. Los 13 ms de GPU por defecto son una cifra aproximada leída del gráfico de decodificación del README. Los 4 ms de CPU son un supuesto, porque upstream no publica cuánto tarda la CPU por paso.',
      lgCpu: 'CPU: posprocesamiento + planificación', lgGpu: 'GPU: paso hacia adelante + muestreo', lgIdle: 'Se ve el fondo = este tramo está ocioso',
      laneSync: 'Síncrono', laneAsync: 'Asíncrono', cpu: 'CPU', gpu: 'GPU', stepLabel: (k) => `${k}`,
      cpuLabel: 'Tiempo de CPU por paso', gpuLabel: 'Tiempo de GPU por paso', ms: (v) => `${v} ms`,
      bPlay: '▶ Reproducir 6 pasos',
      ready: '<span class="c">$</span> ready. Ajusta los dos controles y pulsa [ ▶ Reproducir 6 pasos ]',
      lSyncGap: (t, d) => `<span class="m">síncrono t=${t}</span> la GPU termina un paso y se detiene a esperar el posprocesamiento y la planificación de la CPU: espera ${d} ms`,
      lAsyncOk: (t, k) => `<span class="c">asíncrono t=${t}</span> la entrada del paso ${k} estaba lista desde antes, así que la GPU sigue de largo, sin huecos`,
      lAsyncGap: (t, d) => `<span class="y">asíncrono t=${t}</span> la CPU es más lenta que la GPU y el paso siguiente no está listo: la GPU espera ${d} ms`,
      lDone: (s, a) => `<span class="y">// 6 pasos terminados: síncrono ${s} ms, asíncrono ${a} ms</span>`,
      endText: (t) => `terminado en ${t} ms`,
      sSyncK: 'Síncrono: ciclo por paso', sSyncF: '<b>= CPU + GPU</b><br>Se turnan, así que siempre hay un lado esperando',
      sAsyncK: 'Asíncrono: ciclo por paso', sAsyncF: '<b>= max(CPU, GPU)</b><br>El lado más lento marca el ritmo',
      sUtilK: 'Fracción de tiempo con la GPU ocupada', sUtilF: (s, a) => `<b>síncrono ${s}% → asíncrono ${a}%</b><br>= GPU ÷ ciclo`,
      sGainK: 'Mejora de throughput', sGainF: '<b>= (CPU + GPU) ÷ max(CPU, GPU)</b><br>Pasos extra por segundo en régimen estable',
      vHide: (c, g, x) => `① La CPU tarda ${c} ms por paso, menos que los ${g} ms de la GPU. El bucle asíncrono la esconde entera detrás de la GPU: la GPU encadena un paso tras otro y el throughput sube a <b>${x} veces</b>.<br>② Lo que se esconde es el tiempo de la CPU. El trabajo de la CPU no se reduce en absoluto.<br>③ La CPU solo va un paso por delante: tiene que esperar a que el paso k−1 termine el muestreo para posprocesar ese paso.`,
      vSlow: (c, g, d) => `① La CPU tarda ${c} ms por paso, incluso más que los ${g} ms de la GPU. En el bucle asíncrono, la GPU aún espera <b>${d} ms</b> en cada paso.<br>② Ahora el cuello de botella es la CPU. El "sin sobrecoste" solo se cumple cuando el trabajo de la CPU por paso no supera un paso de la GPU.<br>③ Por eso, cuanto mayor es el lote y más solicitudes hay, más rápido tiene que ser el código de planificación del lado de la CPU.`,
      try: [
        'Por defecto, CPU 4 ms y GPU 13 ms: el síncrono tarda 17 ms por paso y el asíncrono 13 ms, un 31% más de throughput. Pulsa <b>Reproducir</b> y mira cómo la GPU del grupo síncrono se detiene en cada paso.',
        'Lleva la CPU a <b>13 ms</b>, igual que la GPU: la aceleración es exactamente de 2 veces, y la GPU del grupo asíncrono sigue sin detenerse.',
        'Lleva la CPU a <b>20 ms</b>: la GPU del grupo asíncrono vuelve a esperar y cada paso pasa a durar 20 ms. Para que haya cero sobrecoste, la CPU debe hacer menos trabajo por paso que la GPU.',
      ],

      vCode: 'VARLEN_BUDGET', vTitle: 'Cuántos borradores verificar: 5 fijos vs por confianza', vTag: 'Estimación didáctica · la confianza es aleatoria',
      vIntro: 'Cada solicitud tiene 1 token del modelo principal que siempre se verifica y 5 tokens borrador. El número de una celda es "la probabilidad de que este borrador sirva", es decir, la confianza multiplicada a lo largo de la fila hasta esta celda. Verificar no es gratis. Supuesto didáctico: <b>un paso tarda 10 ms + t₁ × tamaño del grafo</b>, donde el tamaño del grafo es el CUDA Graph más pequeño en el que caben los tokens de este paso (1, 2, 4, 8, 16, 24 … uno cada 8), así que el tiempo es una escalera. Con verificación por confianza, el planificador parte del borrador de mayor probabilidad, añade cupos de uno en uno y elige el total con más tokens esperados por milisegundo. El simulador usa un solo juego de confianzas. El motor real, al fijar el total, usa el de una ronda aún anterior.',
      lgMain: 'Token del modelo principal: siempre se verifica', lgPick: 'Borradores verificados en este paso', lgSkip: 'Borradores no verificados en este paso',
      bFixed: '5 fijos', bVar: 'Por confianza', bShuffle: 'Otro juego',
      nLabel: 'Solicitudes simultáneas N', tLabel: 'Tiempo por token extra, t₁', nOut: (n) => `N = ${n}`, tOut: (t) => `${t} ms`,
      main: 'Princ.', rowLabel: (i) => `#${i}`,
      gridLabel: 'Los borradores de cada solicitud y la probabilidad de que se usen',
      sQK: 'Tokens verificados en este paso', sQF: (gv, gf) => `<b>por confianza / 5 fijos</b><br>= número de solicitudes + borradores elegidos<br>Grafo reproducido: ${gv} / ${gf}`,
      sEK: 'Tokens esperados confirmados', sEF: '<b>= N + Σ confianza acumulada de los borradores verificados</b><br>Los borradores no verificados aportan 0',
      sTK: 'Throughput (tokens esperados / ms)', sTF: (g) => `<b>= tokens esperados ÷ (10 + t₁ × tamaño del grafo)</b><br>Por confianza frente a 5 fijos: ${g}`,
      verdict: (dq, de, g) => `① Por confianza se verificaron <b>${dq}</b> tokens menos y se confirmaron en esperanza solo <b>${de}</b> menos: todo lo recortado eran borradores con pocas esperanzas.<br>② Cambio de throughput: <b>${g}</b>. Solo se ahorra tiempo cuando el total cae por debajo del límite de un grafo. Cuanto más cara es la verificación (t₁ mayor) y más solicitudes hay, más se recorta y más se gana.<br>③ Aquí la confianza es la probabilidad verdadera, así que por confianza no se puede perder. En un sistema real la confianza es una estimación, el modelo de tiempos tiene errores y el total se fija con datos de una ronda aún anterior. En la tabla de upstream, el 1.5% más lento con 16 solicitudes por GPU puede deberse en parte a esto.`,
      vTry: [
        'Lleva t₁ a <b>0</b>: la verificación es gratis, así que por confianza también se verifican los 5 borradores y los dos métodos son idénticos.',
        'Vuelve a los valores por defecto N = 8, t₁ = 0.08 (primer juego de confianzas): el total baja de 48 a 40, exactamente un grafo menos. Los tokens esperados bajan solo unos 0.35 y el throughput sube un 3% aproximadamente. Fíjate en que el total elegido es siempre múltiplo de 8.',
        'Lleva N a <b>16</b> y t₁ a <b>0.15</b>: la diferencia sube a más de diez puntos porcentuales. La dirección coincide con la tabla de upstream: cuanta más concurrencia, más gana la verificación de longitud variable.',
      ],
    },
    ar: {
      code: 'ZOS_TIMELINE', title: 'الخط الزمني لـ CPU وGPU: متزامن مقابل غير متزامن', tag: 'تقدير تعليمي · الأزمنة مفترضة',
      intro: 'في كل خطوة فك ترميز يؤدي CPU <b>المعالجة اللاحقة والجدولة</b> (منطق CPU خالص)، وتؤدي GPU <b>التمريرة الأمامية وأخذ العينات</b>. المجموعة العليا هي الحلقة المتزامنة، والسفلى هي الحلقة غير المتزامنة: يتقدم CPU بخطوة ويجهّز الخطوة k+1 بينما تشغّل GPU الخطوة k. والقيمة الافتراضية 13 ms لـ GPU رقم تقريبي مقروء من رسم فك الترميز في README، أما 4 ms لـ CPU فافتراض، لأن المصدر الأصلي لم ينشر كم يستغرق CPU في الخطوة.',
      lgCpu: 'CPU: معالجة لاحقة + جدولة', lgGpu: 'GPU: تمريرة أمامية + أخذ العينات', lgIdle: 'ظهور الخلفية = هذا المقطع عاطل',
      laneSync: 'متزامن', laneAsync: 'غير متزامن', cpu: 'CPU', gpu: 'GPU', stepLabel: (k) => `${k}`,
      cpuLabel: 'زمن CPU لكل خطوة', gpuLabel: 'زمن GPU لكل خطوة', ms: (v) => `${v} ms`,
      bPlay: '▶ تشغيل 6 خطوات',
      ready: '<span class="c">$</span> ready. اضبط المنزلقين ثم اضغط [ ▶ تشغيل 6 خطوات ]',
      lSyncGap: (t, d) => `<span class="m">متزامن t=${t}</span> تنهي GPU خطوة وتتوقف لتنتظر المعالجة اللاحقة والجدولة من CPU: انتظار ${d} ms`,
      lAsyncOk: (t, k) => `<span class="c">غير متزامن t=${t}</span> مدخل الخطوة ${k} جاهز منذ وقت، فتواصل GPU العمل بلا فراغ`,
      lAsyncGap: (t, d) => `<span class="y">غير متزامن t=${t}</span> CPU أبطأ من GPU والخطوة التالية غير جاهزة: تنتظر GPU ${d} ms`,
      lDone: (s, a) => `<span class="y">// انتهت 6 خطوات: متزامن ${s} ms، غير متزامن ${a} ms</span>`,
      endText: (t) => `انتهى في ${t} ms`,
      sSyncK: 'متزامن: دورة الخطوة', sSyncF: '<b>= CPU + GPU</b><br>يتناوبان في العمل، فأحدهما ينتظر دائمًا',
      sAsyncK: 'غير متزامن: دورة الخطوة', sAsyncF: '<b>= max(CPU, GPU)</b><br>الطرف الأبطأ يحدد الإيقاع',
      sUtilK: 'نسبة انشغال GPU', sUtilF: (s, a) => `<b>متزامن ${s}% ← غير متزامن ${a}%</b><br>= GPU ÷ الدورة`,
      sGainK: 'زيادة الإنتاجية', sGainF: '<b>= (CPU + GPU) ÷ max(CPU, GPU)</b><br>الخطوات الإضافية في الثانية في الحالة المستقرة',
      vHide: (c, g, x) => `① يستغرق CPU ${c} ms في الخطوة، وهو أقل من ${g} ms لـ GPU. تخبّئه الحلقة غير المتزامنة كله خلف GPU: فتسير GPU خطوة بعد خطوة وترتفع الإنتاجية إلى <b>${x} مرة</b>.<br>② ما يُخبَّأ هو زمن CPU، أما عمل CPU فلم ينقص شيئًا.<br>③ يتقدم CPU بخطوة واحدة فقط: عليه أن ينتظر اكتمال أخذ العينات للخطوة k−1 ليعالجها لاحقًا.`,
      vSlow: (c, g, d) => `① يستغرق CPU ${c} ms في الخطوة، وهو أبطأ حتى من ${g} ms لـ GPU: ففي الحلقة غير المتزامنة تنتظر GPU <b>${d} ms</b> في كل خطوة.<br>② هنا يكون CPU هو عنق الزجاجة. فعبارة «عديم الكلفة» لا تصح إلا إذا لم يزد عمل CPU في الخطوة على خطوة GPU.<br>③ لذلك كلما كبرت الدفعة وزادت الطلبات وجب أن تكون شيفرة الجدولة على جهة CPU أسرع.`,
      try: [
        'القيم الافتراضية: CPU 4 ms وGPU 13 ms: المتزامن 17 ms للخطوة، وغير المتزامن 13 ms، وتزيد الإنتاجية بنحو 31%. اضغط <b>تشغيل</b> وراقب توقف GPU في كل خطوة في المجموعة المتزامنة.',
        'اسحب CPU إلى <b>13 ms</b> ليساوي GPU: يكون التسريع مرتين بالضبط، وتظل GPU في المجموعة غير المتزامنة لا تتوقف.',
        'اسحب CPU إلى <b>20 ms</b>: تعود GPU في المجموعة غير المتزامنة إلى الانتظار وتصير الخطوة 20 ms. شرط الكلفة الصفرية أن يؤدي CPU عملًا في الخطوة أقل من GPU.',
      ],

      vCode: 'VARLEN_BUDGET', vTitle: 'كم مسودة نتحقق منها: 5 ثابتة مقابل بحسب الثقة', vTag: 'تقدير تعليمي · الثقة أعداد عشوائية',
      vIntro: 'لكل طلب رمز واحد من النموذج الرئيسي يُتحقَّق منه دائمًا و5 رموز مسودة. العدد في الخانة هو «احتمال أن تنفع هذه المسودة»، أي الثقة مضروبة على امتداد الصف حتى هذه الخانة. والتحقق ليس مجانيًا. افتراض تعليمي: <b>زمن الخطوة = 10 ms + t₁ × حجم الرسم</b>، وحجم الرسم هو أصغر CUDA Graph تتسع لرموز هذه الخطوة (1 و2 و4 و8 و16 و24 … رسم كل 8)، فيكون الزمن درجًا. وعند التحقق بحسب الثقة يبدأ المُجدوِل من المسودة الأعلى احتمالًا ويضيف الحصص واحدة واحدة، ويختار المجموع صاحب أكبر عدد من الرموز المتوقعة لكل ميلي ثانية. يستخدم المحاكي مجموعة واحدة من الثقة؛ أما المحرك الحقيقي فيستخدم عند تحديد المجموع ثقة جولة أقدم من ذلك بعد.',
      lgMain: 'رمز النموذج الرئيسي: يُفحص دائمًا', lgPick: 'مسودات تُفحص في هذه الخطوة', lgSkip: 'مسودات لا تُفحص في هذه الخطوة',
      bFixed: '5 ثابتة', bVar: 'بالثقة', bShuffle: 'ثقة جديدة',
      nLabel: 'الطلبات المتزامنة N', tLabel: 'زمن كل رمز إضافي، t₁', nOut: (n) => `N = ${n}`, tOut: (t) => `${t} ms`,
      main: 'رئيسي', rowLabel: (i) => `#${i}`,
      gridLabel: 'مسودات كل طلب واحتمال أن تُستخدم',
      sQK: 'الرموز المفحوصة في هذه الخطوة', sQF: (gv, gf) => `<b>بالثقة / 5 ثابتة</b><br>= عدد الطلبات + عدد المسودات المختارة<br>الرسم المُعاد تشغيله: ${gv} / ${gf}`,
      sEK: 'الرموز المودَعة المتوقعة', sEF: '<b>= N + Σ الثقة التراكمية للمسودات المفحوصة</b><br>المسودات غير المفحوصة تسهم بصفر',
      sTK: 'الإنتاجية (رموز متوقعة / ms)', sTF: (g) => `<b>= الرموز المتوقعة ÷ (10 + t₁ × حجم الرسم)</b><br>بالثقة مقابل 5 ثابتة: ${g}`,
      verdict: (dq, de, g) => `① تحققت الطريقة بالثقة من <b>${dq}</b> رمزًا أقل، ولم يقل المتوقع إيداعه إلا <b>${de}</b>: كل ما حُذف مسودات ضعيفة الأمل.<br>② تغيّر الإنتاجية <b>${g}</b>. لا يوفَّر الوقت إلا حين يهبط المجموع عبر حدّ رسم. وكلما غلا التحقق (t₁ أكبر) وزادت الطلبات حُذف أكثر وربحنا أكثر.<br>③ هنا الثقة هي الاحتمال الحقيقي، فلا تخسر الطريقة بالثقة أبدًا. وفي النظام الحقيقي الثقة تقدير، ونموذج الزمن فيه خطأ، ويُحدَّد المجموع بقيم جولة أقدم. وفي جدول المصدر الأصلي تكون الطريقة أبطأ بنسبة 1.5% عند 16 طلبًا لكل بطاقة، وقد يكون هذا أحد الأسباب.`,
      vTry: [
        'اسحب t₁ إلى <b>0</b>: التحقق مجاني، فتتحقق الطريقة بالثقة أيضًا من المسودات الخمس كلها، وتتطابق الطريقتان.',
        'ارجع إلى القيم الافتراضية N = 8 وt₁ = 0.08 (المجموعة الأولى من الثقة): ينخفض المجموع من 48 إلى 40، أي أقل بحجم رسم واحد بالضبط. وتنقص الرموز المتوقعة بنحو 0.35 فقط، وترتفع الإنتاجية بنحو 3%. لاحظ أن المجموع المختار دائمًا من مضاعفات 8.',
        'اسحب N إلى <b>16</b> وt₁ إلى <b>0.15</b>: يتسع الفرق إلى أكثر من عشر نقاط مئوية. والاتجاه يوافق جدول المصدر الأصلي: كلما زاد التزامن زاد مكسب التحقق متغير الطول.',
      ],
    },
  });

  const pct = (x) => (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(1) + '%';

  Viz.register('di-spec-sched-zos', {
    mount(el, ctx) {
      const STEPS = 6;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a3)', text: T.lgCpu },
        { color: 'var(--accent)', text: T.lgGpu, glow: true },
        { color: 'var(--side)', text: T.lgIdle },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 228', class: 'viz-stage', role: 'img', 'aria-label': T.title }, left);
      const X0 = 52, SPAN = 302;
      const lanes = [
        { mode: 'sync', title: T.laneSync, y: 4 },
        { mode: 'async', title: T.laneAsync, y: 116 },
      ];
      const txt = (x, y, s, size, fill, anchor) => { const t = Viz.svg('text', { x, y, 'font-size': size, 'text-anchor': anchor || 'start', style: `fill:${fill}` }, svg); t.textContent = s; return t; };
      lanes.forEach(L => {
        txt(4, L.y + 14, L.title, 13, 'var(--ink)');
        txt(4, L.y + 38, T.cpu, 12, 'var(--muted)');
        txt(4, L.y + 68, T.gpu, 12, 'var(--muted)');
        Viz.svg('rect', { x: X0, y: L.y + 24, width: SPAN, height: 22, style: 'fill:var(--side)' }, svg);
        Viz.svg('rect', { x: X0, y: L.y + 54, width: SPAN, height: 22, style: 'fill:var(--side)' }, svg);
        L.g = Viz.svg('g', {}, svg);
        L.end = txt(X0 + SPAN, L.y + 96, '', 12, 'var(--ink)', 'end');
      });
      const cursor = Viz.svg('rect', { x: X0, y: 24, width: 2, height: 190, style: 'fill:var(--ink)', opacity: 0 }, svg);
      left.insertAdjacentHTML('beforeend', `
        <div class="viz-slider"><label>${T.cpuLabel}</label><input type="range" min="1" max="20" value="4" aria-label="${Viz.esc(T.cpuLabel)}"><output>4 ms</output></div>
        <div class="viz-slider"><label>${T.gpuLabel}</label><input type="range" min="2" max="20" value="13" aria-label="${Viz.esc(T.gpuLabel)}"><output>13 ms</output></div>
        <div class="viz-row">${Viz.button(T.bPlay)}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = Viz.stat({ id: 'z-s', k: T.sSyncK, v: '', f: T.sSyncF }) + Viz.stat({ id: 'z-a', k: T.sAsyncK, v: '', f: T.sAsyncF, hot: true }) +
        Viz.stat({ id: 'z-u', k: T.sUtilK, v: '', f: '' }) + Viz.stat({ id: 'z-g', k: T.sGainK, v: '', f: T.sGainF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [cR, gR] = left.querySelectorAll('input[type=range]');
      const playBtn = left.querySelector('.viz-btn');
      let busy = false, res = {};

      function draw() {
        const c = +cR.value, g = +gR.value;
        cR.nextElementSibling.textContent = T.ms(c); gR.nextElementSibling.textContent = T.ms(g);
        lanes.forEach(L => { res[L.mode] = M.timeline({ cpuMs: c, gpuMs: g, steps: STEPS, mode: L.mode }); });
        const tMax = Math.max(res.sync.total, res.async.total), X = t => X0 + t / tMax * SPAN;
        lanes.forEach(L => {
          const r = res[L.mode];
          L.g.innerHTML = '';
          const put = (y, a, b, fill, label) => {
            Viz.svg('rect', { x: X(a), y, width: Math.max(1, X(b) - X(a) - 1), height: 22, style: `fill:${fill}` }, L.g);
            if (label && X(b) - X(a) >= 14) { const t = Viz.svg('text', { x: (X(a) + X(b)) / 2, y: y + 15, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--paper)' }, L.g); t.textContent = label; }
          };
          r.cpu.forEach(b => put(L.y + 24, b.start, b.end, 'var(--a3)', T.stepLabel(b.k + 1)));
          r.gpu.forEach(b => put(L.y + 54, b.start, b.end, 'var(--accent)', T.stepLabel(b.k + 1)));
          L.end.textContent = T.endText(r.total);
        });
        const cmp = M.compare(c, g);
        $('[data-s=z-s-v]').textContent = cmp.syncPeriod + ' ms';
        $('[data-s=z-a-v]').textContent = cmp.asyncPeriod + ' ms';
        $('[data-s=z-u-v]').textContent = Math.round(cmp.asyncUtil * 100) + '%';
        $('[data-s=z-u-f]').innerHTML = T.sUtilF(Math.round(cmp.syncUtil * 100), Math.round(cmp.asyncUtil * 100));
        $('[data-s=z-g-v]').textContent = '× ' + cmp.speedup.toFixed(2);
        $('.viz-verdict').hidden = true;
        return { c, g, cmp, X };
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; playBtn.disabled = cR.disabled = gR.disabled = true;
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) playBtn.disabled = cR.disabled = gR.disabled = false;
      }
      playBtn.onclick = () => guard(async () => {
        const { c, g, cmp, X } = draw();
        term.clear();
        const events = [];
        const s = res.sync, a = res.async;
        for (let k = 1; k < STEPS; k++) {
          events.push([s.gpu[k - 1].end, T.lSyncGap(s.gpu[k - 1].end, s.gpu[k].start - s.gpu[k - 1].end)]);
          const gap = a.gpu[k].start - a.gpu[k - 1].end;
          events.push([a.gpu[k].start, gap > 0 ? T.lAsyncGap(a.gpu[k - 1].end, gap) : T.lAsyncOk(a.gpu[k].start, k + 1)]);
        }
        events.sort((p, q) => p[0] - q[0]);
        cursor.setAttribute('opacity', 1);
        for (const [t, msg] of events) {
          cursor.setAttribute('x', X(t) - 1);
          term.log(msg);
          await ctx.sleep(380);
        }
        cursor.setAttribute('x', X(Math.max(s.total, a.total)) - 1);
        term.log(T.lDone(s.total, a.total));
        await ctx.sleep(200);
        cursor.setAttribute('opacity', 0);
        const v = $('.viz-verdict');
        v.innerHTML = c <= g ? T.vHide(c, g, cmp.speedup.toFixed(2)) : T.vSlow(c, g, c - g);
        v.hidden = false;
      });
      cR.oninput = draw; gR.oninput = draw;
      draw();
    },
  });

  Viz.register('di-spec-sched-varlen', {
    mount(el, ctx) {
      const NEXTN = 5, T0 = 10, MAXN = 16;
      const body = Viz.frame(el, { code: T.vCode, title: T.vTitle, tag: T.vTag, intro: T.vIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgMain },
        { color: 'var(--accent)', text: T.lgPick, glow: true },
        { color: 'var(--side)', text: T.lgSkip },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bFixed, 'ghost')}${Viz.button(T.bVar)}${Viz.button(T.bShuffle, 'ghost')}</div>`);
      const svg = Viz.svg('svg', { viewBox: `0 0 360 ${MAXN * 18 + 4}`, class: 'viz-stage', role: 'img', 'aria-label': T.gridLabel }, left);
      const CX = 40, CW = 52;
      const rows = [];
      for (let i = 0; i < MAXN; i++) {
        const y = 2 + i * 18, g = Viz.svg('g', {}, svg);
        const lab = Viz.svg('text', { x: 4, y: y + 12, 'font-size': 12, style: 'fill:var(--muted)' }, g); lab.textContent = T.rowLabel(i + 1);
        const cells = [];
        for (let j = 0; j <= NEXTN; j++) {
          const r = Viz.svg('rect', { x: CX + j * CW, y, width: CW - 4, height: 15, rx: 2, class: 'viz-cell' }, g);
          const t = Viz.svg('text', { x: CX + j * CW + (CW - 4) / 2, y: y + 12, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, g);
          cells.push({ r, t });
        }
        rows.push({ g, cells });
      }
      left.insertAdjacentHTML('beforeend', `
        <div class="viz-slider"><label>${T.nLabel}</label><input type="range" min="4" max="${MAXN}" value="8" aria-label="${Viz.esc(T.nLabel)}"><output>N = 8</output></div>
        <div class="viz-slider"><label>${T.tLabel}</label><input type="range" min="0" max="0.3" step="0.01" value="0.08" aria-label="${Viz.esc(T.tLabel)}"><output>0.08 ms</output></div>`);
      right.innerHTML = Viz.stat({ id: 'v-q', k: T.sQK, v: '', f: '' }) + Viz.stat({ id: 'v-e', k: T.sEK, v: '', f: T.sEF }) + Viz.stat({ id: 'v-t', k: T.sTK, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.vTry));
      const $ = s => el.querySelector(s);
      const [fixedBtn, varBtn, shufBtn] = left.querySelectorAll('.viz-btn');
      const [nR, tR] = left.querySelectorAll('input[type=range]');
      let seed = 1, show = 'var', pool = M.presetConfidences(MAXN, NEXTN, seed);

      function draw() {
        const n = +nR.value, t1 = +tR.value, conf = pool.slice(0, n), cost = { t0: T0, t1 };
        nR.nextElementSibling.textContent = T.nOut(n); tR.nextElementSibling.textContent = T.tOut(t1.toFixed(2));
        const v = M.varlen(conf, cost), f = M.fixed(conf, cost);
        const q = show === 'var' ? v.seqlensQ : f.seqlensQ;
        fixedBtn.className = 'viz-btn ' + (show === 'fixed' ? '' : 'ghost'); varBtn.className = 'viz-btn ' + (show === 'var' ? '' : 'ghost');
        svg.setAttribute('viewBox', `0 0 360 ${n * 18 + 4}`);
        rows.forEach((row, i) => {
          row.g.style.display = i < n ? '' : 'none';
          if (i >= n) return;
          const cum = M.cumulative(conf[i]);
          row.cells.forEach((c, j) => {
            if (j === 0) { c.r.setAttribute('class', 'viz-cell'); c.r.style.fill = 'var(--frame)'; c.t.textContent = T.main; c.t.style.fill = 'var(--ink)'; return; }
            const on = j < q[i];
            c.r.setAttribute('class', on ? 'viz-cell pick' : 'viz-cell'); c.r.style.fill = on ? '' : 'var(--side)';
            c.t.textContent = cum[j - 1].toFixed(2).replace(/^0/, '');
            c.t.style.fill = on ? 'var(--paper)' : 'var(--muted)';
          });
        });
        const gain = v.throughput / f.throughput - 1;
        $('[data-s=v-q-v]').textContent = `${v.totalQ} / ${f.totalQ}`;
        $('[data-s=v-q-f]').innerHTML = T.sQF(v.graph, f.graph);
        $('[data-s=v-e-v]').textContent = `${v.expected.toFixed(2)} / ${f.expected.toFixed(2)}`;
        $('[data-s=v-t-v]').textContent = `${v.throughput.toFixed(3)} / ${f.throughput.toFixed(3)}`;
        $('[data-s=v-t-f]').innerHTML = T.sTF(pct(gain));
        $('.viz-verdict').innerHTML = T.verdict(f.totalQ - v.totalQ, (f.expected - v.expected).toFixed(2), pct(gain));
      }
      fixedBtn.onclick = () => { show = 'fixed'; draw(); };
      varBtn.onclick = () => { show = 'var'; draw(); };
      shufBtn.onclick = () => { seed += 1; pool = M.presetConfidences(MAXN, NEXTN, seed); draw(); };
      nR.oninput = draw; tR.oninput = draw;
      draw();
      void ctx;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
