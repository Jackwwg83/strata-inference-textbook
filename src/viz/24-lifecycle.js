/* Chapter 24 widgets: a request lifecycle with a cancel button, and a timing leak in API-key comparison.
   All visible text lives in the T tables below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.lifecycle;

  const T = Viz.t({
    zh: {
      code: 'LIFECYCLE_SIM', title: '请求生命周期', tag: '教学抽象 · 状态名不是上游枚举',
      intro: '一个请求从排队到结束，要经过几个状态。按 <b>推进一步</b> 让它正常往前走；在任何时候按 <b>取消</b>，看“停下来”要经过哪几层；按 <b>引擎失联</b>，看看门狗怎样收场。',
      lgNow: '当前状态', lgPast: '走过的状态', lgEnd: '终点状态', lgCancel: '取消路径上的一步',
      names: { queued: '排队', prefill: '读题', decoding: '生成', cancelling: '取消中', done: '完成', cancelled: '已取消', failed: '失败' },
      steps: ['发现断开', '设取消标志', '引擎检查点', '发 STOP', '排空到 DONE', '释放 FIFO'],
      diagram: '请求状态图：排队、读题、生成、完成，以及取消中、已取消、失败',
      bNext: '▶ 推进一步', bCancel: '✕ 取消', bSilent: '⚠ 引擎失联', bReset: '重置',
      ready: '<span class="c">$</span> 新请求到达。前面还有 1 个请求在用引擎，它先排队',
      lAdmit: '<span class="c">[FIFO]</span> 前一个请求结束，拿到锁。引擎开始读题，第 1 块（共 2 块）',
      lChunk: '<span class="c">[读题]</span> 第 2 块（共 2 块）。每读完一块，引擎报告一次进度',
      lFirst: '<span class="y">[生成]</span> 读题结束，第 1 个 token 发给客户端',
      lTok: n => `<span class="y">[生成]</span> 第 ${n} 个 token 发给客户端`,
      lDone: '<span class="y">[完成]</span> 引擎写出 DONE，结果和用量记入这个请求名下，然后释放 FIFO',
      c0: '<span class="m">[取消 1/6]</span> 监视线程每 0.5 秒看一眼连接：读到 EOF，说明客户端挂断了',
      c1: '<span class="m">[取消 2/6]</span> 设下取消标志 cancel.set()。这只是一个“请停下”的信号，没有任何东西被强行打断',
      cQueued: '<span class="m">[取消 3/6]</span> 教学设计：请求还在排队，直接出队，不必惊动引擎（上游 Strata 的做法见“深入一层”）',
      cPrefill: '<span class="m">[取消 3/6]</span> 引擎在每一块开始前检查一次；手上这一块要读完，才轮到检查点',
      cDecode: '<span class="m">[取消 3/6]</span> 下一个 token 产出时就会检查标志，几乎立刻停',
      c3: '<span class="m">[取消 4/6]</span> 服务器给引擎写一行 STOP',
      c4: '<span class="m">[取消 5/6]</span> 继续读引擎的输出，直到它写出这个请求自己的 DONE。限时等待，绝不无限期地等',
      c5: '<span class="m">[取消 6/6]</span> 记好账，释放 FIFO。下一个请求不会读到上一个请求的残留输出',
      cEnd: '<span class="y">[已取消]</span> 之后再也不会有新 token 发出',
      sSilent: '<span class="w">[看门狗]</span> 引擎太久没有任何输出，判定失联：结束引擎进程，这个请求以错误收尾',
      sNext: '<span class="w">[看门狗]</span> 下一个请求到来时，服务器会重新启动引擎',
      noMore: '<span class="c">$</span> 请求已经结束。按 [ 重置 ] 再来一次',
      sStateK: '当前状态', sStateF: '<b>终点只有三个：完成、已取消、失败</b><br>每个请求必须落到其中一个，不能悬着',
      sDelayK: '从挂断到引擎停下，最坏要等', sDelayF: s => s,
      fQueued: '<b>≈ 0.5 秒</b><br>监视线程的检查间隔',
      fPrefill: '<b>≈ 0.5 + 32768 ÷ 2171 ≈ 15.6 秒</b><br>检查间隔 + 读完手上这一块<br>假设一块 32768 个 token、读题每秒 2171 个',
      fDecode: '<b>≈ 0.5 + 1 ÷ 81.8 ≈ 0.51 秒</b><br>检查间隔 + 再生成一个 token<br>假设每秒生成 81.8 个 token',
      fNone: '<b>—</b><br>请求不在排队、读题、生成状态',
      sTokK: '已发给客户端的 token', sTokF: '<b>取消开始后，这个数不能再变</b><br>这是“取消完成”最基本的验收条件',
      vDone: '请求正常结束：DONE 到达后才记账、释放 FIFO。',
      vCancelled: '取消完成的四个标志：① 不再发出新 token；② 引擎回到空闲；③ 这个请求的输出不会被下一个请求读到；④ FIFO 只释放一次。',
      vFailed: '失败也是一种明确的结局：服务器不会假装成功，也不会无限期地等。结束引擎进程后，显存和内存随进程一起归还，下一个请求重新启动引擎。',
      try: [
        '推进到 <b>读题</b> 时按取消：最坏要等约 15.6 秒引擎才停。能看出：取消只能在检查点生效，读题的检查点隔得远。',
        '推进到 <b>生成</b> 时再取消：只要约 0.51 秒。能看出：同样是“停”，在哪个阶段停，代价差得很远。',
        '按取消后，趁 <b>取消中</b> 按引擎失联：请求进入失败。能看出：等待 STOP 的回音也必须限时，因为等待期间 FIFO 一直被占着。',
      ],

      kCode: 'TIMING_LEAK', kTitle: '逐位偷看密钥', kTag: '教学推演 · 时间单位为“比较了几个字符”，已去掉噪声',
      kIntro: '服务器里存着一个 4 位的 API Key，每位是 0–9 或 a–f。攻击者不知道密钥，但能测出服务器每次比较花了多久。选一种比较方法，按 <b>猜下一位</b>，看攻击者能不能一位一位猜出来。',
      kLgBar: '一个候选字符的比较耗时', kLgPick: '耗时最长、被攻击者选中', kLgKnown: '已经猜出的位',
      kSteps: ['第 1 位', '第 2 位', '第 3 位', '第 4 位'],
      kModeEarly: '逐字比较，遇错就停', kModeConst: '恒定时间比较',
      kBars: '16 个候选字符的比较耗时柱状图',
      kGuess: '▶ 猜下一位', kReset: '换个密钥',
      kKnown: k => `攻击者已猜出：<b style="font-family:var(--mono);color:var(--a3)">${k}</b>`,
      kReady: '<span class="c">$</span> 新密钥已生成（攻击者看不到）。按 [ ▶ 猜下一位 ]',
      kProbe: (pos, n) => `<span class="c">[第 ${pos} 位]</span> 把 16 个候选各试一次，共 ${n} 次请求，记下每次耗时`,
      kHit: (c, t) => `<span class="y">选中</span> “${c}”：它的耗时是 ${t}，比其他候选多比较了一个字符，说明这一位猜对了`,
      kLast: c => `<span class="y">最后一位</span>不用看时间：16 个挨个试，“${c}”直接通过了认证`,
      kStuck: '<span class="m">卡住</span>：16 个候选耗时完全一样，时间里没有任何线索',
      kWin: (k, n) => `<span class="w">破解</span>：密钥是 ${k}，一共只试了 ${n} 次`,
      kModeLog: m => `<span class="c">$</span> 比较方法换成：${m}。攻击从头开始`,
      sTriesK: '攻击者已经发出的请求', sTriesF: '<b>= 每位 16 次 × 已猜的位数</b><br>逐位猜，次数随位数线性增长',
      sBruteK: '不靠计时、硬猜要多少次', sBruteF: '<b>= 16⁴ = 65,536</b><br>32 位十六进制的真实密钥：16³² ≈ 3.4 × 10³⁸，逐位猜却只要 16 × 32 = 512 次',
      kVerdictEarly: '逐字比较一遇到不同就返回，耗时泄露了“前面猜对了几位”。攻击者把 65,536 次的穷举，变成了 64 次的逐位猜。',
      kVerdictConst: '恒定时间比较总是把整个密钥比完，耗时和猜对几位无关，计时这条路就断了。Strata 用 <code>hmac.compare_digest</code> 检查 API Key，就是这个原因。',
      kTry: [
        '在“逐字比较”模式连按 4 次 <b>猜下一位</b>：每一位都有一根柱子特别高，64 次请求就猜出了全部 4 位。',
        '切到 <b>恒定时间比较</b> 再猜：所有柱子一样高，攻击者连第 1 位都定不下来。',
        '想一想：真实服务器上，每次比较只差几纳秒，网络抖动却有几毫秒。攻击者靠什么把这么小的差别测出来？（提示：同一个猜测重复成千上万次，再取平均）',
      ],
    },
    en: {
      code: 'LIFECYCLE_SIM', title: 'Request lifecycle', tag: 'Teaching abstraction · state names are not an upstream enum',
      intro: 'A request passes through several states from queuing to its end. Press <b>Advance</b> to move it forward normally; press <b>Cancel</b> at any time to see which layers "stopping" has to pass through; press <b>Engine lost</b> to see how the watchdog wraps things up.',
      lgNow: 'Current state', lgPast: 'States already visited', lgEnd: 'End state', lgCancel: 'A step on the cancel path',
      names: { queued: 'Queued', prefill: 'Prefill', decoding: 'Decode', cancelling: 'Cancelling', done: 'Done', cancelled: 'Cancelled', failed: 'Failed' },
      steps: ['Notice hang-up', 'Set cancel flag', 'Engine checkpoint', 'Send STOP', 'Drain to DONE', 'Release FIFO'],
      diagram: 'Request state diagram: queued, prefill, decode, done, plus cancelling, cancelled and failed',
      bNext: '▶ Advance', bCancel: '✕ Cancel', bSilent: '⚠ Engine lost', bReset: 'Reset',
      ready: '<span class="c">$</span> A new request arrives. One request ahead of it is using the engine, so it queues first',
      lAdmit: '<span class="c">[FIFO]</span> The previous request ends and this one gets the lock. The engine starts prefill: chunk 1 of 2',
      lChunk: '<span class="c">[prefill]</span> Chunk 2 of 2. After each chunk, the engine reports its progress once',
      lFirst: '<span class="y">[decode]</span> Prefill is over; token 1 goes to the client',
      lTok: n => `<span class="y">[decode]</span> token ${n} goes to the client`,
      lDone: '<span class="y">[done]</span> The engine writes DONE; the result and usage are booked to this request, then the FIFO is released',
      c0: '<span class="m">[cancel 1/6]</span> The watcher thread checks the connection every 0.5 s: it reads EOF, so the client has hung up',
      c1: '<span class="m">[cancel 2/6]</span> Set the cancel flag with cancel.set(). This is only a "please stop" signal; nothing is forcibly interrupted',
      cQueued: '<span class="m">[cancel 3/6]</span> Teaching design: the request is still queued, so it just leaves the queue without bothering the engine (for what upstream Strata does, see "Go deeper")',
      cPrefill: '<span class="m">[cancel 3/6]</span> The engine checks once before each chunk starts; it must finish the chunk in hand before it reaches the checkpoint',
      cDecode: '<span class="m">[cancel 3/6]</span> The flag is checked when the next token comes out, so it stops almost at once',
      c3: '<span class="m">[cancel 4/6]</span> The server writes a STOP line to the engine',
      c4: '<span class="m">[cancel 5/6]</span> Keep reading the engine\'s output until it writes this request\'s own DONE. The wait has a time limit; it is never unbounded',
      c5: '<span class="m">[cancel 6/6]</span> Book the usage, release the FIFO. The next request will not read this request\'s leftover output',
      cEnd: '<span class="y">[cancelled]</span> No new token will ever go out after this',
      sSilent: '<span class="w">[watchdog]</span> The engine has produced no output for too long, so it is declared lost: the engine process is ended and this request ends with an error',
      sNext: '<span class="w">[watchdog]</span> When the next request arrives, the server restarts the engine',
      noMore: '<span class="c">$</span> The request has ended. Press [ Reset ] to go again',
      sStateK: 'Current state', sStateF: '<b>There are only three end states: Done, Cancelled, Failed</b><br>Every request must end in one of them; none may be left hanging',
      sDelayK: 'Worst-case wait from hang-up to engine stop', sDelayF: s => s,
      fQueued: '<b>≈ 0.5 s</b><br>the watcher\'s check interval',
      fPrefill: '<b>≈ 0.5 + 32768 ÷ 2171 ≈ 15.6 s</b><br>check interval + finishing the chunk in hand<br>assuming 32768-token chunks and prefill at 2171 tokens per second',
      fDecode: '<b>≈ 0.5 + 1 ÷ 81.8 ≈ 0.51 s</b><br>check interval + generating one more token<br>assuming 81.8 tokens generated per second',
      fNone: '<b>—</b><br>the request is not queued, in prefill or in decode',
      sTokK: 'Tokens sent to the client', sTokF: '<b>Once cancellation starts, this number must not change</b><br>That is the most basic test of "cancellation complete"',
      vDone: 'The request ended normally: usage is booked and the FIFO released only after DONE arrives.',
      vCancelled: 'Four signs that cancellation is complete: ① no new token goes out; ② the engine is idle again; ③ this request\'s output will not be read by the next request; ④ the FIFO is released exactly once.',
      vFailed: 'Failure is also a clear outcome: the server neither pretends to succeed nor waits forever. Once the engine process ends, its VRAM and RAM are returned with it, and the next request restarts the engine.',
      try: [
        'Advance to <b>Prefill</b> and press Cancel: the worst case is about 15.6 seconds before the engine stops. You can see that cancellation only takes effect at checkpoints, and prefill checkpoints are far apart.',
        'Advance to <b>Decode</b> and cancel again: it takes only about 0.51 seconds. You can see that the same "stop" costs very different amounts depending on the phase.',
        'After pressing Cancel, press Engine lost while still <b>Cancelling</b>: the request goes to Failed. You can see that waiting for the STOP echo must also have a time limit, because the FIFO stays taken the whole time.',
      ],

      kCode: 'TIMING_LEAK', kTitle: 'Peeking at the key one character at a time', kTag: 'Teaching estimate · time unit = characters compared, noise removed',
      kIntro: 'The server holds a 4-character API key; each character is 0–9 or a–f. The attacker does not know the key but can measure how long each comparison on the server takes. Pick a comparison method, press <b>Guess next</b>, and see whether the attacker can guess the key one character at a time.',
      kLgBar: 'Comparison time for one candidate character', kLgPick: 'Slowest, picked by the attacker', kLgKnown: 'Characters already guessed',
      kSteps: ['Char 1', 'Char 2', 'Char 3', 'Char 4'],
      kModeEarly: 'Early-exit compare', kModeConst: 'Constant-time compare',
      kBars: 'Bar chart of comparison times for the 16 candidate characters',
      kGuess: '▶ Guess next', kReset: 'New key',
      kKnown: k => `Attacker has guessed: <b style="font-family:var(--mono);color:var(--a3)">${k}</b>`,
      kReady: '<span class="c">$</span> A new key has been generated (the attacker cannot see it). Press [ ▶ Guess next ]',
      kProbe: (pos, n) => `<span class="c">[char ${pos}]</span> try each of the 16 candidates once, ${n} requests in all, and record each time`,
      kHit: (c, t) => `<span class="y">Picked</span> "${c}": its time is ${t}, one character more than the others, so this character is right`,
      kLast: c => `<span class="y">The last character</span> needs no timing: try all 16 in turn, and "${c}" simply passes authentication`,
      kStuck: '<span class="m">Stuck</span>: all 16 candidates take exactly the same time; the timing gives no clue at all',
      kWin: (k, n) => `<span class="w">Cracked</span>: the key is ${k}, found with only ${n} tries`,
      kModeLog: m => `<span class="c">$</span> Comparison method switched to: ${m}. The attack starts over`,
      sTriesK: 'Requests the attacker has sent', sTriesF: '<b>= 16 per character × characters guessed</b><br>guessing one character at a time, the count grows linearly with key length',
      sBruteK: 'Tries for blind guessing, without timing', sBruteF: '<b>= 16⁴ = 65,536</b><br>a real 32-character hex key: 16³² ≈ 3.4 × 10³⁸, yet character by character it takes only 16 × 32 = 512 tries',
      kVerdictEarly: 'Early-exit comparison returns at the first difference, so its timing leaks "how many leading characters were right". The attacker turns a 65,536-try brute force into 64 character-by-character guesses.',
      kVerdictConst: 'Constant-time comparison always compares the whole key, so its timing has nothing to do with how many characters were right, and the timing route is closed. That is why Strata checks API keys with <code>hmac.compare_digest</code>.',
      kTry: [
        'In "Early-exit compare" mode, press <b>Guess next</b> 4 times: at every character one bar stands out, and 64 requests reveal all 4 characters.',
        'Switch to <b>Constant-time compare</b> and guess again: all bars are the same height, and the attacker cannot even pin down character 1.',
        'Think about it: on a real server each comparison differs by only a few nanoseconds, while network jitter is several milliseconds. How can an attacker measure such a tiny difference? (Hint: repeat the same guess thousands of times and average.)',
      ],
    },
    ja: {
      code: 'LIFECYCLE_SIM', title: 'リクエストのライフサイクル', tag: '教育用の抽象 · 状態名は上流の列挙型ではない',
      intro: '1 つのリクエストは、キュー待ちから終了まで、いくつかの状態を通ります。<b>1 歩進める</b>を押すと、正常に先へ進みます。いつでも<b>キャンセル</b>を押して、「止まる」までにどの層を通るか見てください。<b>エンジン応答なし</b>を押すと、ウォッチドッグがどう収拾するかが見られます。',
      lgNow: '現在の状態', lgPast: '通った状態', lgEnd: '終点の状態', lgCancel: 'キャンセルの経路上の 1 歩',
      names: { queued: 'キュー待ち', prefill: 'プリフィル', decoding: 'デコード', cancelling: 'キャンセル中', done: '完了', cancelled: 'キャンセル済み', failed: '失敗' },
      steps: ['切断を検出', 'フラグを設定', 'エンジンのチェックポイント', 'STOP を送る', 'DONE まで読み捨て', 'FIFO を解放'],
      diagram: 'リクエストの状態図：キュー待ち、プリフィル、デコード、完了、そしてキャンセル中、キャンセル済み、失敗',
      bNext: '▶ 1 歩進める', bCancel: '✕ キャンセル', bSilent: '⚠ エンジン応答なし', bReset: 'リセット',
      ready: '<span class="c">$</span> 新しいリクエストが到着。前にエンジンを使っているリクエストが 1 つあるので、先にキューで待ちます',
      lAdmit: '<span class="c">[FIFO]</span> 前のリクエストが終わり、ロックを取得。エンジンがプリフィルを開始、第 1 チャンク（全 2 チャンク）',
      lChunk: '<span class="c">[プリフィル]</span> 第 2 チャンク（全 2 チャンク）。1 チャンク読み終えるたびに、エンジンが進み具合を報告します',
      lFirst: '<span class="y">[デコード]</span> プリフィルが終わり、最初のトークンをクライアントに送信',
      lTok: n => `<span class="y">[デコード]</span> ${n} 個目のトークンをクライアントに送信`,
      lDone: '<span class="y">[完了]</span> エンジンが DONE を書き、結果と使用量をこのリクエストに記録してから、FIFO を解放',
      c0: '<span class="m">[キャンセル 1/6]</span> 監視スレッドが 0.5 秒ごとに接続を確認：EOF を読んだので、クライアントが切断したと分かります',
      c1: '<span class="m">[キャンセル 2/6]</span> キャンセルフラグ cancel.set() を立てる。これは「止まってください」という信号にすぎず、何も強制的には中断されません',
      cQueued: '<span class="m">[キャンセル 3/6]</span> 教育用の設計：リクエストはまだキュー待ちなので、そのままキューから外し、エンジンには知らせません（上流 Strata のやり方は「もう一歩深く」を参照）',
      cPrefill: '<span class="m">[キャンセル 3/6]</span> エンジンは各チャンクの開始前に 1 回確認します。手元のチャンクを読み終えてはじめて、チェックポイントが来ます',
      cDecode: '<span class="m">[キャンセル 3/6]</span> 次のトークンを出すときにフラグを確認するので、ほぼすぐ止まります',
      c3: '<span class="m">[キャンセル 4/6]</span> サーバーがエンジンに STOP を 1 行書きます',
      c4: '<span class="m">[キャンセル 5/6]</span> エンジンの出力を読み続け、このリクエスト自身の DONE が書かれるまで待ちます。制限時間つきで、決して無期限には待ちません',
      c5: '<span class="m">[キャンセル 6/6]</span> 記録をつけて FIFO を解放。次のリクエストは、前のリクエストの残った出力を読みません',
      cEnd: '<span class="y">[キャンセル済み]</span> これ以後、新しいトークンは二度と送られません',
      sSilent: '<span class="w">[ウォッチドッグ]</span> エンジンからの出力が長く途絶えたので、応答なしと判断：エンジンプロセスを終了し、このリクエストはエラーで終わります',
      sNext: '<span class="w">[ウォッチドッグ]</span> 次のリクエストが来たら、サーバーがエンジンを再起動します',
      noMore: '<span class="c">$</span> リクエストはすでに終わりました。[ リセット ] を押してもう一度どうぞ',
      sStateK: '現在の状態', sStateF: '<b>終点は 3 つだけ：完了、キャンセル済み、失敗</b><br>どのリクエストも、必ずこのどれかに着地します。宙ぶらりんは許されません',
      sDelayK: '切断からエンジン停止まで、最悪でどれだけ待つか', sDelayF: s => s,
      fQueued: '<b>≈ 0.5 秒</b><br>監視スレッドの確認間隔',
      fPrefill: '<b>≈ 0.5 + 32768 ÷ 2171 ≈ 15.6 秒</b><br>確認間隔 + 手元の 1 チャンクを読み終える時間<br>1 チャンク 32768 トークン、プリフィル毎秒 2171 トークンと仮定',
      fDecode: '<b>≈ 0.5 + 1 ÷ 81.8 ≈ 0.51 秒</b><br>確認間隔 + もう 1 トークン生成する時間<br>デコード毎秒 81.8 トークンと仮定',
      fNone: '<b>—</b><br>リクエストは、キュー待ち、プリフィル、デコードのどの状態でもありません',
      sTokK: 'クライアントに送信済みのトークン', sTokF: '<b>キャンセルが始まったあとは、この数は変わってはいけません</b><br>これが「キャンセル完了」のいちばん基本的な受け入れ条件です',
      vDone: 'リクエストは正常に終了しました：DONE が届いてから記録し、FIFO を解放します。',
      vCancelled: 'キャンセル完了の 4 つの印：① 新しいトークンが出ない。② エンジンが空き状態に戻る。③ このリクエストの出力が、次のリクエストに読まれない。④ FIFO は 1 回だけ解放される。',
      vFailed: '失敗も、はっきりした結末の 1 つです。サーバーは成功を装わず、無期限にも待ちません。エンジンプロセスを終了すると、VRAM とメモリはプロセスと一緒に返り、次のリクエストでエンジンが再起動されます。',
      try: [
        '<b>プリフィル</b>まで進めてキャンセルを押します。エンジンが止まるまで、最悪で約 15.6 秒待ちます。キャンセルはチェックポイントでしか効かず、プリフィルのチェックポイントは間隔が長いことが分かります。',
        '<b>デコード</b>まで進めてからキャンセルします。待ち時間は約 0.51 秒だけです。同じ「止める」でも、どの段階で止めるかで、コストが大きく違うことが分かります。',
        'キャンセルを押したあと、<b>キャンセル中</b>のうちにエンジン応答なしを押します。リクエストは失敗になります。STOP のエコーを待つときにも制限時間が必要なことが分かります。待っている間、FIFO はずっと占められているからです。',
      ],

      kCode: 'TIMING_LEAK', kTitle: 'キーを 1 桁ずつ盗み見る', kTag: '教育用の試算 · 時間の単位は「何文字比較したか」、ノイズは除去済み',
      kIntro: 'サーバーには 4 桁の API キーが保存されていて、各桁は 0〜9 か a〜f です。攻撃者はキーを知りませんが、サーバーが比較のたびにどれだけ時間をかけたかは測れます。比較方法を選んで<b>次の桁を当てる</b>を押し、攻撃者がキーを 1 桁ずつ当てられるか見てください。',
      kLgBar: '1 つの候補文字の比較にかかった時間', kLgPick: '時間が最長で、攻撃者に選ばれた', kLgKnown: 'すでに当てた桁',
      kSteps: ['1 桁目', '2 桁目', '3 桁目', '4 桁目'],
      kModeEarly: '1 文字ずつ比較、違えば即停止', kModeConst: '定数時間比較',
      kBars: '16 個の候補文字の比較時間の棒グラフ',
      kGuess: '▶ 次の桁を当てる', kReset: 'キーを替える',
      kKnown: k => `攻撃者がすでに当てた分：<b style="font-family:var(--mono);color:var(--a3)">${k}</b>`,
      kReady: '<span class="c">$</span> 新しいキーを生成しました（攻撃者には見えません）。[ ▶ 次の桁を当てる ] を押してください',
      kProbe: (pos, n) => `<span class="c">[${pos} 桁目]</span> 16 個の候補を 1 回ずつ試します。リクエストは合計 ${n} 回で、毎回の所要時間を記録します`,
      kHit: (c, t) => `<span class="y">選択</span>「${c}」：所要時間は ${t} で、ほかの候補より 1 文字多く比較されています。この桁が当たっていると分かります`,
      kLast: c => `<span class="y">最後の桁</span>は時間を見る必要がありません。16 個を順に試せば、「${c}」がそのまま認証を通ります`,
      kStuck: '<span class="m">行き詰まり</span>：16 個の候補の所要時間がまったく同じで、時間からは何の手がかりも得られません',
      kWin: (k, n) => `<span class="w">突破</span>：キーは ${k} で、試したのは合計 ${n} 回だけです`,
      kModeLog: m => `<span class="c">$</span> 比較方法を切り替えました：${m}。攻撃を最初からやり直します`,
      sTriesK: '攻撃者がすでに送ったリクエスト', sTriesF: '<b>= 1 桁ごとに 16 回 × 当てた桁数</b><br>1 桁ずつ当てるので、回数は桁数に比例して増えます',
      sBruteK: '計時に頼らず総当たりした場合の回数', sBruteF: '<b>= 16⁴ = 65,536</b><br>本物の 32 桁 16 進キーなら 16³² ≈ 3.4 × 10³⁸ ですが、1 桁ずつ当てれば 16 × 32 = 512 回で済みます',
      kVerdictEarly: '1 文字ずつの比較は、違いを見つけた瞬間に戻るので、所要時間が「前の何桁が当たっているか」を漏らします。攻撃者は、65,536 回の総当たりを、64 回の桁ごとの推測に変えてしまいました。',
      kVerdictConst: '定数時間比較は、いつもキー全体を比べ終えるので、所要時間は何桁当たったかと無関係です。計時という道は断たれました。Strata が API キーの検査に <code>hmac.compare_digest</code> を使うのは、このためです。',
      kTry: [
        '「1 文字ずつ比較」モードで、<b>次の桁を当てる</b>を 4 回続けて押します。どの桁にも、飛び抜けて高い棒が 1 本あり、64 回のリクエストで 4 桁すべてを当てられます。',
        '<b>定数時間比較</b>に切り替えてやり直します。棒はすべて同じ高さで、攻撃者は 1 桁目さえ決められません。',
        '考えてみましょう。本物のサーバーでは、1 回の比較の差は数ナノ秒しかなく、ネットワークの揺らぎは数ミリ秒あります。攻撃者は、どうやってこんなに小さな差を測るのでしょうか。（ヒント：同じ推測を何千回、何万回も繰り返して、平均を取ります）',
      ],
    },
  });

  const POS = { queued: [20, 20], prefill: [185, 20], decoding: [350, 20], cancelling: [185, 128], done: [350, 128], cancelled: [185, 236], failed: [350, 236] };
  const EDGES = [
    ['queued', 'prefill', 'M130 42H183'], ['prefill', 'decoding', 'M295 42H348'], ['decoding', 'done', 'M405 64V126'],
    ['prefill', 'cancelling', 'M240 64V126'], ['decoding', 'cancelling', 'M360 64L292 128'], ['cancelling', 'cancelled', 'M240 172V234'],
    ['cancelling', 'failed', 'M295 160L352 236'], ['queued', 'cancelled', 'M75 64V258H183'],
  ];

  Viz.register('request-lifecycle', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgNow, glow: true },
        { color: 'var(--a2)', text: T.lgPast },
        { color: 'var(--frame)', text: T.lgEnd },
        { color: 'var(--a3)', text: T.lgCancel },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 480 284', class: 'viz-stage', role: 'img', 'aria-label': T.diagram }, left);
      const edges = EDGES.map(([a, b, d]) => ({ a, b, el: Viz.svg('path', { d, fill: 'none', style: 'stroke:var(--muted);stroke-width:1.5', 'stroke-dasharray': b === 'failed' ? '4 4' : '' }, svg) }));
      const nodes = {};
      for (const s of M.STATES) {
        const [x, y] = POS[s];
        const r = Viz.svg('rect', { x, y, width: 110, height: 44, rx: 8 }, svg);
        const t = Viz.svg('text', { x: x + 55, y: y + 28, 'text-anchor': 'middle', 'font-size': 17 }, svg);
        t.textContent = T.names[s];
        nodes[s] = { r, t };
      }
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bNext)}${Viz.button(T.bCancel, 'alt')}${Viz.button(T.bSilent, 'ghost')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'l-state', k: T.sStateK, v: '', f: '' }) +
        Viz.stat({ id: 'l-delay', k: T.sDelayK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'l-tok', k: T.sTokK, v: '0', f: T.sTokF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [nextBtn, cancelBtn, silentBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      let state, sub, tokens, visited, busy = false, delayState;

      function paint(cancelEdge) {
        for (const s of M.STATES) {
          const cur = s === state, past = visited.has(s) && !cur, end = M.isTerminal(s);
          nodes[s].r.setAttribute('style', `fill:${cur ? 'var(--accent)' : past ? 'color-mix(in srgb,var(--a2) 22%,var(--paper))' : 'var(--paper)'};stroke:${cur ? 'var(--accent)' : end ? 'var(--frame)' : 'var(--muted)'};stroke-width:${cur ? 2 : 1.2}`);
          nodes[s].t.setAttribute('style', `fill:${cur ? 'var(--paper)' : 'var(--ink)'};font-weight:${cur ? 700 : 400}`);
        }
        for (const e of edges) {
          const hot = cancelEdge && e.b === state && visited.has(e.a);
          const walked = visited.has(e.a) && visited.has(e.b);
          e.el.setAttribute('style', `stroke:${hot ? 'var(--a3)' : walked ? 'var(--a2)' : 'var(--muted)'};stroke-width:${hot || walked ? 2.5 : 1.2};opacity:${walked || hot ? 1 : .55}`);
        }
      }
      function stats() {
        $('[data-s=l-state-v]').textContent = T.names[state];
        $('[data-s=l-state-f]').innerHTML = T.sStateF;
        const s = delayState || state;
        $('[data-s=l-delay-v]').textContent = ['queued', 'prefill', 'decoding'].includes(s) ? M.stopDelay(s).toFixed(s === 'decoding' ? 2 : 1) + ' s' : '—';
        $('[data-s=l-delay-f]').innerHTML = { queued: T.fQueued, prefill: T.fPrefill, decoding: T.fDecode }[s] || T.fNone;
        $('[data-s=l-tok-v]').textContent = String(tokens);
        const live = !M.isTerminal(state);
        nextBtn.disabled = !live || state === 'cancelling';
        cancelBtn.disabled = !M.allowed(state).includes('cancel');
        silentBtn.disabled = !M.allowed(state).includes('silent');
      }
      function go(ev) { state = M.transition(state, ev); visited.add(state); }
      function finish() {
        const v = $('.viz-verdict');
        if (M.isTerminal(state)) { v.innerHTML = { done: T.vDone, cancelled: T.vCancelled, failed: T.vFailed }[state]; v.hidden = false; }
      }
      function reset() {
        state = 'queued'; sub = 0; tokens = 0; visited = new Set(['queued']); delayState = null;
        pipe.set(-1); $('.viz-verdict').hidden = true; paint(false); stats();
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) { el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false); stats(); }
      }
      nextBtn.onclick = () => guard(async () => {
        if (state === 'queued') { go('admit'); sub = 1; term.log(T.lAdmit); }
        else if (state === 'prefill' && sub === 1) { sub = 2; term.log(T.lChunk); }
        else if (state === 'prefill') { go('firstToken'); tokens = 1; term.log(T.lFirst); }
        else if (state === 'decoding' && tokens < 3) { tokens++; term.log(T.lTok(tokens)); }
        else if (state === 'decoding') { go('finish'); term.log(T.lDone); }
        else term.log(T.noMore);
        paint(false); finish();
      });
      cancelBtn.onclick = () => guard(async () => {
        const from = state;
        delayState = from;
        stats();
        pipe.set(0); term.log(T.c0); await ctx.sleep(450);
        pipe.set(1); term.log(T.c1); await ctx.sleep(450);
        if (from === 'queued') {
          pipe.set(2); term.log(T.cQueued); go('cancel'); paint(true); await ctx.sleep(450);
          pipe.set(6); term.log(T.cEnd); finish(); return;
        }
        go('cancel'); paint(true);
        pipe.set(2); term.log(from === 'prefill' ? T.cPrefill : T.cDecode); await ctx.sleep(600);
        pipe.set(3); term.log(T.c3); await ctx.sleep(450);
        pipe.set(4); term.log(T.c4);
      });
      // From "cancelling" a second press of next completes the drain; from any active state "silent" fails it.
      silentBtn.onclick = () => guard(async () => {
        go('silent'); paint(true); pipe.set(-1);
        term.log(T.sSilent); await ctx.sleep(450); term.log(T.sNext); finish();
      });
      // Let the drain finish on its own a moment after STOP, unless the user pulls the plug first.
      const origCancel = cancelBtn.onclick;
      cancelBtn.onclick = async () => {
        await origCancel();
        if (state !== 'cancelling' || !ctx.alive) return;
        const drain = () => {
          if (state !== 'cancelling') return;
          if (busy) { ctx.timeout(drain, 300); return; }
          guard(async () => { pipe.set(5); term.log(T.c5); go('ack'); paint(true); await ctx.sleep(300); pipe.set(6); term.log(T.cEnd); finish(); });
        };
        ctx.timeout(drain, ctx.reduced ? 0 : 2200);
      };
      resetBtn.onclick = () => guard(async () => { term.clear(); term.log(T.ready); reset(); });
      reset();
    },
  });

  Viz.register('key-compare-timing', {
    mount(el, ctx) {
      const A = '0123456789abcdef', LEN = 4;
      const body = Viz.frame(el, { code: T.kCode, title: T.kTitle, tag: T.kTag, intro: T.kIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.kLgBar },
        { color: 'var(--a2)', text: T.kLgPick, glow: true },
        { color: 'var(--a3)', text: T.kLgKnown },
      ]));
      const pipe = Viz.pipe(body, T.kSteps);
      body.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin:0 0 12px">${Viz.button(T.kModeEarly)}${Viz.button(T.kModeConst, 'ghost')}</div>
        <div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const [earlyBtn, constBtn] = el.querySelectorAll('.viz-btn');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.insertAdjacentHTML('beforeend', '<div class="k-known" style="font-size:15px;margin-bottom:8px"></div>');
      const svg = Viz.svg('svg', { viewBox: '0 0 480 190', class: 'viz-stage', role: 'img', 'aria-label': T.kBars }, left);
      const bars = [...A].map((c, i) => {
        const r = Viz.svg('rect', { x: 8 + i * 29.5, y: 150, width: 22, height: 0, rx: 2 }, svg);
        const t = Viz.svg('text', { x: 19 + i * 29.5, y: 178, 'text-anchor': 'middle', 'font-size': 17 }, svg);
        t.textContent = c;
        t.setAttribute('style', 'fill:var(--ink);font-family:var(--mono)');
        return r;
      });
      Viz.svg('path', { d: 'M4 150H476', fill: 'none', style: 'stroke:var(--muted);stroke-width:1' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.kGuess)}${Viz.button(T.kReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.kReady);
      right.innerHTML =
        Viz.stat({ id: 'k-tries', k: T.sTriesK, v: '0', f: T.sTriesF, hot: true }) +
        Viz.stat({ id: 'k-brute', k: T.sBruteK, v: '65,536', f: T.sBruteF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.kTry));
      const $ = s => el.querySelector(s);
      const [, , guessBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      let mode = 'early', secret, known, tries, stuck;

      function newSecret() { secret = Array.from({ length: LEN }, () => A[Math.floor(Math.random() * A.length)]).join(''); }
      function show(times, chosen) {
        const max = 4;
        bars.forEach((b, i) => {
          const h = times ? times[i] / max * 130 : 0;
          b.setAttribute('y', String(150 - h)); b.setAttribute('height', String(h));
          b.setAttribute('style', `fill:${chosen === i ? 'var(--a2)' : 'var(--accent)'};opacity:${chosen === i ? 1 : .55}`);
        });
        $('.k-known').innerHTML = T.kKnown(known + '_'.repeat(LEN - known.length));
        $('[data-s=k-tries-v]').textContent = Viz.fmt(tries);
        pipe.set(known.length < LEN ? known.length : LEN);
      }
      function reset(log) {
        newSecret(); known = ''; tries = 0; stuck = false;
        $('.viz-verdict').hidden = true; term.clear(); term.log(log || T.kReady); show(null, -1);
      }
      function setMode(m) {
        mode = m;
        earlyBtn.className = 'viz-btn' + (m === 'early' ? '' : ' ghost');
        constBtn.className = 'viz-btn' + (m === 'constant' ? '' : ' ghost');
        reset(T.kModeLog(m === 'early' ? T.kModeEarly : T.kModeConst));
      }
      guessBtn.onclick = () => {
        if (known.length >= LEN || stuck) { reset(); return; }
        const pos = known.length + 1, times = M.probe(secret, known, A, mode);
        tries += A.length;
        term.log(T.kProbe(pos, A.length));
        const best = M.pick(secret, known, A, mode);
        if (best.length !== 1) {
          stuck = true; show(times, -1); term.log(T.kStuck);
          $('.viz-verdict').innerHTML = T.kVerdictConst; $('.viz-verdict').hidden = false; return;
        }
        const c = A[best[0]];
        term.log(known.length === LEN - 1 ? T.kLast(c) : T.kHit(c, times[best[0]]));
        known += c;
        show(times, best[0]);
        if (known.length === LEN) { term.log(T.kWin(known, tries)); $('.viz-verdict').innerHTML = T.kVerdictEarly; $('.viz-verdict').hidden = false; }
      };
      earlyBtn.onclick = () => setMode('early');
      constBtn.onclick = () => setMode('constant');
      resetBtn.onclick = () => reset();
      reset();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
