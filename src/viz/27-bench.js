/* Chapter 27 widgets: a benchmark session with a known truth, and one streamed request seen through
   several "speed" definitions. All visible text lives in the T table below (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.bench;

  const T = Viz.t({
    zh: {
      code: 'BENCH_LAB', title: '测量实验：A 和 B 谁更快', tag: '教学推演 · 已知真相的模拟',
      intro: '这是一台“知道真相”的模拟机器：配置 A 每次真实耗时 100 ms，配置 B 是 95 ms，B 真的快 5%。每次运行有 ±4% 的随机抖动，还有 8% 的概率被别的程序打扰、慢 2.5 倍。机器刚开始工作时，前 3 次运行会变慢，第 1 次慢 80%。你来设计实验，看测出来的结论离真相有多远。',
      lgA: '配置 A 的一次运行', lgB: '配置 B 的一次运行', lgWarm: '空心点：预热，丢弃不算', lgMed: '竖线：这一组的中位数',
      steps: ['设计实验', '预热', '正式运行', '统计', '下结论'],
      nLabel: '每组正式跑几次', wLabel: '每组先预热几次',
      orderSeq: '先跑完 A 再跑 B', orderAlt: 'A、B 交替跑',
      bGo: '▶ 开始测量', bSeed: '换一批随机数',
      stageLabel: 'A、B 两组运行耗时的散点图',
      axis: '耗时（ms），越靠左越快', clip: '超出 250 ms 的点画在最右边',
      sAK: '配置 A（真实 100 ms）', sBK: '配置 B（真实 95 ms）',
      sF: (s) => `<b>中位数</b>；均值 ${s.mean.toFixed(1)} · p95 ${s.p95.toFixed(1)} · 标准差 ${s.sd.toFixed(1)}<br>正式样本 n = ${s.n}${s.n < 20 ? '，n &lt; 20 时 p95 就是最大值' : ''}`,
      sGK: '测出来：B 比 A 快多少', sGF: (mean) => `<b>= (A 的中位数 − B 的中位数) ÷ A 的中位数</b><br>换成均值算：${mean}　真相：5%`,
      ready: '<span class="c">$</span> ready. 设计好实验，按 [ ▶ 开始测量 ]',
      lStart: (n, w, alt) => `<span class="c">[设计]</span> 每组预热 ${w} 次、正式 ${n} 次，${alt ? 'A、B 交替' : '先 A 后 B'}`,
      lRun: (g, cfg, ms, tags) => `<span class="m">#${g + 1} ${cfg}</span> ${ms} ms${tags}`,
      tCold: (f) => ` <span class="y">机器还没热 ×${f}</span>`, tOut: ' <span class="y">被打扰 ×2.5</span>', tWarm: ' （预热，丢弃）',
      lMore: (k) => `<span class="m">…</span> 另外 ${k} 次运行没有逐条打印`,
      lStat: (a, b) => `<span class="c">统计</span> A 的中位数 ${a} ms，B 的中位数 ${b} ms`,
      lGap: (g) => `<span class="w">结论</span> B 比 A 快 ${g}%（真相是 5%）`,
      vGood: (g) => `测得 B 快 <b>${g}%</b>，和真相 5% 相差不到 2.5 个百分点。这个实验设计靠得住：冷启动被预热吃掉了，偶尔的干扰也被中位数挡住了。`,
      vFlip: (g) => `测得 B 快 <b>${g}%</b>，方向都反了！只跑这么几次，B 恰好撞上两次干扰，中位数就被拖走了。样本太少，结论可以完全颠倒。`,
      vOff: (g) => `测得 B 快 <b>${g}%</b>，可真相只有 5%。`,
      vSeqCold: '先跑完 A 再跑 B，机器刚启动时的慢，全算在了 A 头上。',
      vNoWarm: '没有预热，冷启动的那几次混进了正式样本。',
      vFew: '每组样本太少，一次干扰就能拖动中位数。',
      vMean: (g) => `<br>顺便看均值：${g >= 0 ? 'B 快 ' + g.toFixed(1) + '%' : 'B 反而慢了 ' + (-g).toFixed(1) + '%'}。均值会被偶尔一次 ×2.5 的干扰拖走，中位数稳得多。`,
      vNoise: '实验设计本身没问题，这次偏差来自随机波动。多换几批随机数，看结论落在什么范围，比只看一次可靠。',
      try: [
        '保持默认（每组 3 次、不预热、先 A 后 B），按 <b>开始测量</b>：B 看起来快了 30% 以上。机器刚启动时那几次慢，全算在了 A 头上。',
        '改成 <b>A、B 交替跑</b>，再把预热调到 <b>3</b>：冷启动被丢掉，也不再偏向某一边。结论一下子靠近 5%。',
        '把正式次数拉到 <b>15</b>，多按几次 <b>换一批随机数</b>：中位数的结论稳定在 5% 附近；均值有时会被一次干扰拖走好几个百分点。',
      ],

      rCode: 'RATE_CLOCK', rTitle: '一次请求，三种“速度”', rTag: '教学推演 · 时间是假设值',
      rIntro: '模拟一次流式请求：排队、读题（prefill）、吐出第一个 token，然后陆续吐出后面的 token。假设读题要 800 ms，每一步解码 25 ms；草稿被接受时，一步能吐出好几个 token。按 <b>播放</b>，看同一次请求能算出几种不同的“速度”。',
      rLgQ: '排队：等前面的请求', rLgP: '读题：处理整段提问', rLgT: '竖线：吐出的 token', rLgMean: '速度表 1：从首 token 起的平均', rLgWin: '速度表 2：最近 2 秒窗口',
      rSteps: ['发出请求', '排队', '读题', '首个 token', '陆续输出', '结束'],
      rN: '输出多少个 token', rQ: '前面排队的请求', rA: '草稿接受率',
      rGo: '▶ 播放',
      rStage: '一次请求的时间线和两种实时速度表',
      rQueue: '排队', rPre: '读题', rFirst: '首 token',
      rMeter: '实时速度表（token/s）', rClip: (v) => `平均值读数冲到 ${v}`,
      rTtftK: '首 token 延迟 TTFT', rTtftF: '<b>= 首个 token 到达 − 发出请求</b><br>包含排队和读题',
      rE2eK: '速度 ①：端到端', rE2eF: (n, s) => `<b>= N ÷ 总时长 = ${n} ÷ ${s} s</b><br>把排队和读题也算进去`,
      rDecK: '速度 ②：按解码时长', rDecF: (n, s) => `<b>= N ÷ (末 token − 首 token) = ${n} ÷ ${s} s</b><br>首 token 不占时间却被计入，N 小时偏高`,
      rGapK: '速度 ③：按间隔', rGapF: (n, s) => `<b>= (N − 1) ÷ (末 token − 首 token) = ${n} ÷ ${s} s</b><br>只算首 token 之后的间隔`,
      undef: '没有定义',
      rReady: '<span class="c">$</span> ready. 调好参数，按 [ ▶ 播放 ]',
      r0: '<span class="c">t = 0</span> 发出请求',
      rQ1: (t) => `<span class="m">t = ${t} ms</span> 前面的请求结束，轮到你。服务端一次只处理一个序列，先来先服务`,
      rP1: (t) => `<span class="m">t = ${t} ms</span> 读题完成，吐出第 1 个 token → TTFT = ${t} ms`,
      rBurst: (t, k) => `<span class="m">t = ${t} ms</span> 这一步吐出 ${k} 个 token（${k - 1} 个草稿被接受）`,
      rStep: (t, i) => `<span class="m">t = ${t} ms</span> 第 ${i} 个 token`,
      rMore: '<span class="m">…</span> 后面的步骤不逐条打印',
      rEnd: (t, n) => `<span class="w">t = ${t} ms</span> 结束，共 ${n} 个 token`,
      rMeterLog: (a, b) => `<span class="y">速度表</span> 首 token 后 10 ms：平均值读数 ${a} token/s，2 秒窗口读数 ${b} token/s`,
      rVerdict: (e, d, g, t) => `同一次请求：端到端 <b>${e}</b> token/s，按解码时长 <b>${d}</b>，按间隔 <b>${g}</b>；TTFT <b>${t}</b> ms。三个数都没算错，只是回答不同的问题。写报告时，必须写出用的是哪个公式。`,
      rOne: '<br>只有 1 个 token 时，速度 ② 和 ③ 都要除以 0，没有定义。界面上硬显示一个巨大的数，比显示“没有定义”更糟。',
      rQueueNote: '<br>排队让 TTFT 多了好几秒，可解码速度一点没变。用户觉得“慢”，可能慢在排队，不是引擎算得慢。',
      rBurstNote: '<br>草稿让 token 一簇一簇地到。“从首 token 起的平均”在首 token 刚出来时读数虚高（10 ms 时就是 1 ÷ 0.01 s = 100），之后随着一簇簇 token 忽高忽低；2 秒窗口把起步时的分母垫到至少 0.25 s，读数不会冲上天。Strata 服务端的实时速度用的就是窗口的做法。',
      rTry: [
        '把输出长度拉到 <b>1</b>：速度 ② 和 ③ 都没有定义，要除以 0。短回答的速度数字要格外小心。',
        '把排队调到 <b>2</b>：TTFT 多了 3 秒，速度 ② 和 ③ 纹丝不动，速度 ① 却掉了一大截。三个数回答的是三个不同的问题。',
        '把草稿接受率调到 <b>80%</b>：token 一簇一簇地到。看速度表 1 在首 token 之后冲得多高，再对比速度表 2。',
      ],
    },
    en: {
      code: 'BENCH_LAB', title: 'Measurement lab: is A or B faster?', tag: 'Teaching estimate · simulation with a known truth',
      intro: 'This simulated machine "knows the truth": configuration A really takes 100 ms per run, and B takes 95 ms, so B really is 5% faster. Each run has ±4% random jitter, and an 8% chance of being disturbed by another program and running 2.5× slower. While the machine is still cold, the first 3 runs are slower, and run 1 is 80% slower. You design the experiment and see how far the measured conclusion lands from the truth.',
      lgA: 'One run of configuration A', lgB: 'One run of configuration B', lgWarm: 'Hollow dot: warm-up, dropped', lgMed: 'Vertical line: this group\'s median',
      steps: ['Design', 'Warm up', 'Timed runs', 'Statistics', 'Conclude'],
      nLabel: 'Timed runs per group', wLabel: 'Warm-up runs per group',
      orderSeq: 'All of A, then B', orderAlt: 'Alternate A and B',
      bGo: '▶ Start measuring', bSeed: 'New random numbers',
      stageLabel: 'Scatter plot of run times for groups A and B',
      axis: 'Time (ms); further left is faster', clip: 'Points above 250 ms are drawn at the far right',
      sAK: 'Configuration A (truly 100 ms)', sBK: 'Configuration B (truly 95 ms)',
      sF: (s) => `<b>median</b>; mean ${s.mean.toFixed(1)} · p95 ${s.p95.toFixed(1)} · SD ${s.sd.toFixed(1)}<br>timed samples n = ${s.n}${s.n < 20 ? '; with n &lt; 20, p95 is just the maximum' : ''}`,
      sGK: 'Measured: how much faster B is than A', sGF: (mean) => `<b>= (A's median − B's median) ÷ A's median</b><br>computed with means instead: ${mean} · truth: 5%`,
      ready: '<span class="c">$</span> ready. Design your experiment, then press [ ▶ Start measuring ]',
      lStart: (n, w, alt) => `<span class="c">[design]</span> per group: ${w} warm-up, ${n} timed; ${alt ? 'A and B alternate' : 'all of A, then B'}`,
      lRun: (g, cfg, ms, tags) => `<span class="m">#${g + 1} ${cfg}</span> ${ms} ms${tags}`,
      tCold: (f) => ` <span class="y">machine still cold ×${f}</span>`, tOut: ' <span class="y">disturbed ×2.5</span>', tWarm: ' (warm-up, dropped)',
      lMore: (k) => `<span class="m">…</span> ${k} more runs not printed one by one`,
      lStat: (a, b) => `<span class="c">statistics</span> A's median ${a} ms, B's median ${b} ms`,
      lGap: (g) => `<span class="w">conclusion</span> B is ${g}% faster than A (truth: 5%)`,
      vGood: (g) => `Measured: B is <b>${g}%</b> faster, within 2.5 percentage points of the true 5%. This design is sound: the warm-up absorbed the cold start, and the median shrugged off the occasional disturbance.`,
      vFlip: (g) => `Measured: B is <b>${g}%</b> faster. The sign is backwards! With this few runs, B happened to hit two disturbances, and they dragged its median away. With too few samples, a conclusion can flip completely.`,
      vOff: (g) => `Measured: B is <b>${g}%</b> faster, but the truth is only 5%. `,
      vSeqCold: 'Running all of A before B put all the slowness of a just-started machine on A. ',
      vNoWarm: 'Without a warm-up, the cold runs slipped into the timed samples. ',
      vFew: 'Each group has too few samples, so one disturbance can move the median. ',
      vMean: (g) => `<br>Look at the mean too: ${g >= 0 ? 'B is ' + g.toFixed(1) + '% faster' : 'B is actually ' + (-g).toFixed(1) + '% slower'}. One occasional ×2.5 disturbance can drag the mean away; the median is much steadier.`,
      vNoise: 'The design itself is fine; this miss comes from random noise. Try several batches of random numbers and see what range the conclusion falls in. That is more reliable than looking once.',
      try: [
        'Keep the defaults (3 runs per group, no warm-up, all of A then B) and press <b>Start measuring</b>: B looks more than 30% faster. All the slow runs of a just-started machine land on A.',
        'Switch to <b>Alternate A and B</b> and set the warm-up to <b>3</b>: the cold start is dropped and no longer favors one side. The conclusion jumps close to 5%.',
        'Drag the timed runs to <b>15</b> and press <b>New random numbers</b> a few times: the median\'s conclusion settles near 5%, while the mean is sometimes dragged off by several percentage points by a single disturbance.',
      ],

      rCode: 'RATE_CLOCK', rTitle: 'One request, three "speeds"', rTag: 'Teaching estimate · times are assumed values',
      rIntro: 'A simulated streamed request: queueing, prefill ("reading the prompt"), the first token, then the later tokens one after another. Assume prefill takes 800 ms and each decode step takes 25 ms; when draft tokens are accepted, one step can emit several tokens. Press <b>Play</b> and see how many different "speeds" one request can yield.',
      rLgQ: 'Queue: waiting for earlier requests', rLgP: 'Prefill: processing the whole prompt', rLgT: 'Vertical line: a token emitted', rLgMean: 'Meter 1: average since the first token', rLgWin: 'Meter 2: last 2-second window',
      rSteps: ['Request sent', 'Queue', 'Prefill', 'First token', 'Streaming', 'Done'],
      rN: 'Output tokens', rQ: 'Requests ahead in the queue', rA: 'Draft acceptance rate',
      rGo: '▶ Play',
      rStage: 'Timeline of one request and two live speedometers',
      rQueue: 'Queue', rPre: 'Prefill', rFirst: '1st token',
      rMeter: 'Live speed meter (token/s)', rClip: (v) => `Average reading spikes to ${v}`,
      rTtftK: 'Time to first token (TTFT)', rTtftF: '<b>= first token arrives − request sent</b><br>includes queueing and prefill',
      rE2eK: 'Speed ①: end-to-end', rE2eF: (n, s) => `<b>= N ÷ total time = ${n} ÷ ${s} s</b><br>queueing and prefill count too`,
      rDecK: 'Speed ②: by decode time', rDecF: (n, s) => `<b>= N ÷ (last token − first token) = ${n} ÷ ${s} s</b><br>the first token takes no time but is counted, so small N reads high`,
      rGapK: 'Speed ③: by gaps', rGapF: (n, s) => `<b>= (N − 1) ÷ (last token − first token) = ${n} ÷ ${s} s</b><br>counts only the gaps after the first token`,
      undef: 'not defined',
      rReady: '<span class="c">$</span> ready. Set the parameters, then press [ ▶ Play ]',
      r0: '<span class="c">t = 0</span> request sent',
      rQ1: (t) => `<span class="m">t = ${t} ms</span> the earlier requests finish; your turn. The server handles one sequence at a time, first come, first served`,
      rP1: (t) => `<span class="m">t = ${t} ms</span> prefill done, token 1 emitted → TTFT = ${t} ms`,
      rBurst: (t, k) => `<span class="m">t = ${t} ms</span> this step emits ${k} tokens (${k - 1} draft token${k === 2 ? '' : 's'} accepted)`,
      rStep: (t, i) => `<span class="m">t = ${t} ms</span> token ${i}`,
      rMore: '<span class="m">…</span> later steps not printed one by one',
      rEnd: (t, n) => `<span class="w">t = ${t} ms</span> done, ${n} tokens in total`,
      rMeterLog: (a, b) => `<span class="y">meters</span> 10 ms after the first token: average reads ${a} token/s, 2-second window reads ${b} token/s`,
      rVerdict: (e, d, g, t) => `One request: end-to-end <b>${e}</b> token/s, by decode time <b>${d}</b>, by gaps <b>${g}</b>; TTFT <b>${t}</b> ms. None of the three is wrong; they answer different questions. A report must state which formula it used.`,
      rOne: '<br>With only 1 token, speeds ② and ③ both divide by 0, so neither is defined. Forcing a huge number onto the screen is worse than showing "not defined".',
      rQueueNote: '<br>Queueing added several seconds to TTFT, yet the decode speed did not change at all. When users feel "slow", the slowness may be in the queue, not in the engine\'s math.',
      rBurstNote: '<br>Drafts make tokens arrive in bursts. "Average since the first token" reads far too high right after the first token (at 10 ms it is 1 ÷ 0.01 s = 100), then swings up and down with each burst. The 2-second window pads the starting denominator to at least 0.25 s, so the reading never shoots through the roof. Strata\'s server uses the window approach for its live speed.',
      rTry: [
        'Drag the output length to <b>1</b>: neither speed ② nor speed ③ is defined, since both divide by 0. Be extra careful with speed numbers for short answers.',
        'Set the queue to <b>2</b>: TTFT grows by 3 seconds, speeds ② and ③ do not budge, but speed ① drops a lot. The three numbers answer three different questions.',
        'Set the draft acceptance rate to <b>80%</b>: tokens arrive in bursts. See how high meter 1 shoots after the first token, then compare it with meter 2.',
      ],
    },
    ja: {
      code: 'BENCH_LAB', title: '測定実験：A と B、どちらが速いか', tag: '教育用の試算 · 真実が分かっているシミュレーション',
      intro: 'これは「真実が分かっている」シミュレーションのマシンです。構成 A の本当の所要時間は毎回 100 ms、構成 B は 95 ms で、B は本当に 5% 速くなっています。実行ごとに ±4% のランダムな揺れがあり、8% の確率でほかのプログラムに邪魔されて 2.5 倍遅くなります。マシンが動き始めたばかりのとき、最初の 3 回の実行は遅くなり、1 回目は 80% 遅くなります。あなたが実験を設計して、測った結論が真実からどれだけ離れるかを見てください。',
      lgA: '構成 A の 1 回の実行', lgB: '構成 B の 1 回の実行', lgWarm: '白抜きの点：ウォームアップ、捨てる', lgMed: '縦線：この組の中央値',
      steps: ['実験を設計', 'ウォームアップ', '本番の実行', '集計', '結論'],
      nLabel: '各組の本番の実行回数', wLabel: '各組の先にウォームアップする回数',
      orderSeq: 'A を全部走らせてから B', orderAlt: 'A、B を交互に走らせる',
      bGo: '▶ 測定を開始', bSeed: '別の乱数で',
      stageLabel: 'A、B 2 つの組の実行時間の散布図',
      axis: '所要時間（ms）、左ほど速い', clip: '250 ms を超えた点は、いちばん右に描きます',
      sAK: '構成 A（本当は 100 ms）', sBK: '構成 B（本当は 95 ms）',
      sF: (s) => `<b>中央値</b>；平均 ${s.mean.toFixed(1)} · p95 ${s.p95.toFixed(1)} · 標準偏差 ${s.sd.toFixed(1)}<br>本番のサンプル n = ${s.n}${s.n < 20 ? '、n &lt; 20 では p95 は最大値になります' : ''}`,
      sGK: '測定結果：B は A よりどれだけ速いか', sGF: (mean) => `<b>= (A の中央値 − B の中央値) ÷ A の中央値</b><br>平均で計算すると：${mean}　真実：5%`,
      ready: '<span class="c">$</span> ready. 実験を設計して、[ ▶ 測定を開始 ] を押してください',
      lStart: (n, w, alt) => `<span class="c">[設計]</span> 各組でウォームアップ ${w} 回、本番 ${n} 回、${alt ? 'A、B 交互' : 'A の後に B'}`,
      lRun: (g, cfg, ms, tags) => `<span class="m">#${g + 1} ${cfg}</span> ${ms} ms${tags}`,
      tCold: (f) => ` <span class="y">マシンがまだ温まっていない ×${f}</span>`, tOut: ' <span class="y">邪魔された ×2.5</span>', tWarm: '（ウォームアップ、捨てる）',
      lMore: (k) => `<span class="m">…</span> ほかに ${k} 回の実行は 1 つずつは表示しません`,
      lStat: (a, b) => `<span class="c">集計</span> A の中央値 ${a} ms、B の中央値 ${b} ms`,
      lGap: (g) => `<span class="w">結論</span> B は A より ${g}% 速い（真実は 5%）`,
      vGood: (g) => `測定では B が <b>${g}%</b> 速く、真実の 5% との差は 2.5 ポイント未満です。この実験計画は信頼できます。コールドスタートはウォームアップが吸収し、ときどきの邪魔も中央値が防ぎました。`,
      vFlip: (g) => `測定では B が <b>${g}%</b> 速いという結果で、向きが逆です。これだけの回数しか走らせないと、B がたまたま 2 回邪魔に当たり、中央値が引っ張られてしまいました。サンプルが少なすぎると、結論は完全に逆転することがあります。`,
      vOff: (g) => `測定では B が <b>${g}%</b> 速いという結果ですが、真実は 5% だけです。`,
      vSeqCold: 'A を全部走らせてから B を走らせたので、マシンが起動した直後の遅さが、すべて A の分になりました。',
      vNoWarm: 'ウォームアップがないので、コールドスタートの何回かが本番のサンプルに混ざりました。',
      vFew: '各組のサンプルが少なすぎて、1 回の邪魔で中央値が動いてしまいます。',
      vMean: (g) => `<br>ついでに平均も見てみましょう：${g >= 0 ? 'B が ' + g.toFixed(1) + '% 速い' : 'B のほうがかえって ' + (-g).toFixed(1) + '% 遅い'}。平均は、ときどきの ×2.5 の邪魔に引っ張られますが、中央値はずっと安定しています。`,
      vNoise: '実験計画そのものに問題はありません。今回のずれは、ランダムな揺れによるものです。何度か乱数を替えて、結論がどの範囲に収まるかを見るほうが、1 回だけ見るより確かです。',
      try: [
        '既定のまま（各組 3 回、ウォームアップなし、A の後に B）で<b>測定を開始</b>を押します。B が 30% 以上速く見えます。マシンが起動した直後の遅さが、すべて A の分になっています。',
        '<b>A、B を交互に走らせる</b>に変え、さらにウォームアップを <b>3</b> に上げます。コールドスタートは捨てられ、どちらか一方に偏ることもなくなります。結論が一気に 5% に近づきます。',
        '本番の回数を <b>15</b> まで上げて、<b>別の乱数で</b>を何度か押します。中央値の結論は 5% 付近で安定します。平均は、ときどき 1 回の邪魔に数ポイント引っ張られます。',
      ],

      rCode: 'RATE_CLOCK', rTitle: '1 回のリクエストに、3 通りの「速度」', rTag: '教育用の試算 · 時間は仮定値',
      rIntro: '1 回のストリーミングリクエストをシミュレートします。キュー待ち、プリフィル（prefill）、最初のトークンを出し、続いて後ろのトークンが次々に出ていきます。プリフィルは 800 ms、デコードは 1 ステップ 25 ms とし、ドラフトが受理されると、1 ステップで何個ものトークンが出ます。<b>再生</b>を押して、同じリクエストから何通りの「速度」が計算できるかを見てください。',
      rLgQ: 'キュー待ち：前のリクエストを待つ', rLgP: 'プリフィル：質問全体を処理する', rLgT: '縦線：出たトークン', rLgMean: '速度メーター 1：最初のトークンからの平均', rLgWin: '速度メーター 2：直近 2 秒の窓',
      rSteps: ['リクエスト送信', 'キュー待ち', 'プリフィル', '最初のトークン', '出力が続く', '終了'],
      rN: '出力するトークン数', rQ: '前に並ぶリクエスト', rA: 'ドラフトの受理率',
      rGo: '▶ 再生',
      rStage: '1 回のリクエストのタイムラインと、2 種類のリアルタイム速度メーター',
      rQueue: 'キュー', rPre: 'プリフィル', rFirst: '最初のトークン',
      rMeter: 'リアルタイム速度メーター（token/s）', rClip: (v) => `平均値の表示が ${v} まで跳ね上がる`,
      rTtftK: '最初のトークンまでの遅延 TTFT', rTtftF: '<b>= 最初のトークンの到着 − リクエスト送信</b><br>キュー待ちとプリフィルを含む',
      rE2eK: '速度 ①：エンドツーエンド', rE2eF: (n, s) => `<b>= N ÷ 総時間 = ${n} ÷ ${s} s</b><br>キュー待ちとプリフィルも含めて計算`,
      rDecK: '速度 ②：デコード時間あたり', rDecF: (n, s) => `<b>= N ÷ (最後のトークン − 最初のトークン) = ${n} ÷ ${s} s</b><br>最初のトークンは時間を使わないのに数に入るので、N が小さいと高めに出る`,
      rGapK: '速度 ③：間隔あたり', rGapF: (n, s) => `<b>= (N − 1) ÷ (最後のトークン − 最初のトークン) = ${n} ÷ ${s} s</b><br>最初のトークンのあとの間隔だけを数える`,
      undef: '未定義',
      rReady: '<span class="c">$</span> ready. パラメータを調整して、[ ▶ 再生 ] を押してください',
      r0: '<span class="c">t = 0</span> リクエストを送信',
      rQ1: (t) => `<span class="m">t = ${t} ms</span> 前のリクエストが終わり、あなたの番です。サーバーは一度に 1 つのシーケンスしか処理せず、先着順です`,
      rP1: (t) => `<span class="m">t = ${t} ms</span> プリフィルが完了し、最初のトークンを出力 → TTFT = ${t} ms`,
      rBurst: (t, k) => `<span class="m">t = ${t} ms</span> この 1 ステップで ${k} 個のトークンが出ました（ドラフト ${k - 1} 個が受理）`,
      rStep: (t, i) => `<span class="m">t = ${t} ms</span> ${i} 個目のトークン`,
      rMore: '<span class="m">…</span> 以降のステップは 1 つずつは表示しません',
      rEnd: (t, n) => `<span class="w">t = ${t} ms</span> 終了、合計 ${n} トークン`,
      rMeterLog: (a, b) => `<span class="y">速度メーター</span> 最初のトークンの 10 ms 後：平均値は ${a} token/s、2 秒窓の表示は ${b} token/s`,
      rVerdict: (e, d, g, t) => `同じ 1 回のリクエストで、エンドツーエンドは <b>${e}</b> token/s、デコード時間あたりは <b>${d}</b>、間隔あたりは <b>${g}</b>、TTFT は <b>${t}</b> ms です。3 つの数はどれも計算を間違えていません。答えている問いが違うだけです。レポートを書くときは、どの式を使ったかを必ず書いてください。`,
      rOne: '<br>トークンが 1 つだけのとき、速度 ② と ③ は、どちらも 0 で割ることになり、未定義です。画面に巨大な数を無理に出すのは、「未定義」と表示するよりも悪いことです。',
      rQueueNote: '<br>キュー待ちで TTFT が何秒も増えましたが、デコード速度はまったく変わっていません。ユーザーが「遅い」と感じる原因は、キュー待ちにあるかもしれず、エンジンの計算が遅いとは限りません。',
      rBurstNote: '<br>ドラフトのせいで、トークンは 1 かたまりずつ届きます。「最初のトークンからの平均」は、最初のトークンが出た直後は表示が高すぎ（10 ms なら 1 ÷ 0.01 s = 100）、その後はかたまりごとに上下します。2 秒窓は、立ち上がりの分母を少なくとも 0.25 s に底上げするので、表示が跳ね上がりません。Strata のサーバーのリアルタイム速度が使っているのは、この窓のやり方です。',
      rTry: [
        '出力の長さを <b>1</b> まで下げます。速度 ② と ③ は、どちらも 0 で割ることになり、未定義です。短い答えの速度の数字は、特に注意が必要です。',
        'キュー待ちを <b>2</b> にします。TTFT が 3 秒増え、速度 ② と ③ はびくともせず、速度 ① は大きく下がります。3 つの数は、3 つの別の問いに答えています。',
        'ドラフトの受理率を <b>80%</b> にします。トークンが 1 かたまりずつ届きます。速度メーター 1 が最初のトークンのあとでどれだけ跳ね上がるかを見て、速度メーター 2 と比べてみましょう。',
      ],
    },
  });

  async function guardRun(el, ctx, state, fn) {
    if (state.busy) return;
    state.busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { if (ctx.alive) throw e; }
    state.busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
  }
  const pick = (btns, i) => btns.forEach((b, j) => { b.classList.toggle('alt', j === i); b.classList.toggle('ghost', j !== i); b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
  const txt = (svg, attrs, s) => { const t = Viz.svg('text', attrs, svg); t.textContent = s; return t; };

  Viz.register('bench-warmup', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgA, glow: true },
        { color: 'var(--a2)', text: T.lgB },
        { color: 'transparent', text: T.lgWarm },
        { color: 'var(--a3)', text: T.lgMed },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend',
        `<div class="viz-slider"><label>${T.nLabel}</label><input class="bw-n" type="range" min="1" max="30" value="3" aria-label="${Viz.esc(T.nLabel)}"><output class="bw-no"></output></div>
         <div class="viz-slider"><label>${T.wLabel}</label><input class="bw-w" type="range" min="0" max="5" value="0" aria-label="${Viz.esc(T.wLabel)}"><output class="bw-wo"></output></div>
         <div class="viz-row bw-ord">${Viz.button(T.orderSeq, 'alt')}${Viz.button(T.orderAlt, 'ghost')}</div>
         <div class="viz-cols" style="margin-top:14px"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 300 170', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const X = ms => 34 + (Math.min(ms, 250) - 80) / 170 * 256;
      [100, 150, 200, 250].forEach(v => {
        Viz.svg('path', { d: `M${X(v)} 18V128`, style: 'stroke:var(--frame);stroke-width:1;fill:none' }, svg);
        txt(svg, { x: X(v), y: 144, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:var(--muted)' }, String(v));
      });
      txt(svg, { x: 12, y: 51, 'font-size': 14, 'font-weight': 700, style: 'fill:var(--accent)' }, 'A');
      txt(svg, { x: 12, y: 107, 'font-size': 14, 'font-weight': 700, style: 'fill:var(--a2)' }, 'B');
      txt(svg, { x: 162, y: 164, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:var(--muted)' }, T.axis);
      const dots = Viz.svg('g', {}, svg), meds = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bGo)}${Viz.button(T.bSeed, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'bw-a', k: T.sAK, v: '—', f: '' }) +
        Viz.stat({ id: 'bw-b', k: T.sBK, v: '—', f: '' }) +
        Viz.stat({ id: 'bw-g', k: T.sGK, v: '—', f: T.sGF('—'), hot: true });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const ordBtns = [...el.querySelectorAll('.bw-ord .viz-btn')];
      const [goBtn, seedBtn] = left.querySelectorAll('.viz-btn');
      const state = { busy: false, alt: false, seed: 1 };
      const design = () => ({ n: +$('.bw-n').value, warm: +$('.bw-w').value, order: state.alt ? 'interleaved' : 'sequential', seed: state.seed });
      const labels = () => { $('.bw-no').textContent = $('.bw-n').value; $('.bw-wo').textContent = $('.bw-w').value; };

      function dot(run) {
        const y = (run.cfg === 'A' ? 46 : 102) + ((run.k * 7) % 5 - 2) * 4;
        const color = run.cfg === 'A' ? 'var(--accent)' : 'var(--a2)';
        const style = run.warmup ? `fill:none;stroke:${color};stroke-width:1.4` : `fill:${color};opacity:.85`;
        if (run.ms > 250) Viz.svg('path', { d: `M${X(250) - 5} ${y - 5}l8 5l-8 5z`, style }, dots);
        else Viz.svg('circle', { cx: X(run.ms), cy: y, r: 4.5, style }, dots);
      }
      function medLine(v, y, color) { Viz.svg('path', { d: `M${X(v)} ${y - 18}V${y + 18}`, style: `stroke:${color};stroke-width:2.5;fill:none` }, meds); }
      function clear() {
        dots.innerHTML = ''; meds.innerHTML = '';
        ['bw-a', 'bw-b', 'bw-g'].forEach(id => { $(`[data-s=${id}-v]`).textContent = '—'; });
        $('[data-s=bw-a-f]').innerHTML = ''; $('[data-s=bw-b-f]').innerHTML = ''; $('[data-s=bw-g-f]').innerHTML = T.sGF('—');
        $('.viz-verdict').hidden = true;
      }
      function verdict(d, r) {
        const g = r.gapMedian.toFixed(1);
        let html;
        if (Math.abs(r.gapMedian - M.TRUE_GAP) <= 2.5) html = T.vGood(g);
        else if (r.gapMedian < 0) html = T.vFlip(g);
        else {
          html = T.vOff(g);
          if (d.order === 'sequential' && d.warm < M.COLD_RUNS) html += T.vSeqCold;
          else if (d.warm < 2) html += T.vNoWarm;
          if (d.n < 10) html += T.vFew;
          if (d.order === 'interleaved' && d.warm >= M.COLD_RUNS && d.n >= 10) html += T.vNoise;
        }
        html += T.vMean(r.gapMean);
        const v = $('.viz-verdict'); v.innerHTML = html; v.hidden = false;
      }
      goBtn.onclick = () => guardRun(el, ctx, state, async () => {
        const d = design(), r = M.runSession(d);
        clear(); term.clear();
        pipe.set(0); term.log(T.lStart(d.n, d.warm, state.alt)); await ctx.sleep(250);
        const quiet = r.runs.length > 16;
        for (let i = 0; i < r.runs.length; i++) {
          const run = r.runs[i];
          pipe.set(run.warmup ? 1 : 2);
          dot(run);
          if (!quiet || i < 8) {
            const tags = (run.cold ? T.tCold(M.coldFactor(run.g).toFixed(2)) : '') + (run.outlier ? T.tOut : '') + (run.warmup ? T.tWarm : '');
            term.log(T.lRun(run.g, run.cfg, run.ms.toFixed(1), tags));
          } else if (i === 8) term.log(T.lMore(r.runs.length - 8));
          await ctx.sleep(quiet ? 40 : 160);
        }
        pipe.set(3);
        medLine(r.A.median, 46, 'var(--a3)'); medLine(r.B.median, 102, 'var(--a3)');
        $('[data-s=bw-a-v]').textContent = r.A.median.toFixed(1) + ' ms'; $('[data-s=bw-a-f]').innerHTML = T.sF(r.A);
        $('[data-s=bw-b-v]').textContent = r.B.median.toFixed(1) + ' ms'; $('[data-s=bw-b-f]').innerHTML = T.sF(r.B);
        term.log(T.lStat(r.A.median.toFixed(1), r.B.median.toFixed(1))); await ctx.sleep(250);
        pipe.set(4);
        $('[data-s=bw-g-v]').textContent = r.gapMedian.toFixed(1) + '%'; $('[data-s=bw-g-f]').innerHTML = T.sGF(r.gapMean.toFixed(1) + '%');
        term.log(T.lGap(r.gapMedian.toFixed(1)));
        verdict(d, r);
      });
      seedBtn.onclick = () => { if (!state.busy) { state.seed++; goBtn.click(); } };
      ordBtns.forEach((b, i) => { b.onclick = () => { if (!state.busy) { state.alt = i === 1; pick(ordBtns, i); } }; });
      $('.bw-n').oninput = labels; $('.bw-w').oninput = labels;
      labels(); pick(ordBtns, 0); pipe.set(-1);
    },
  });

  Viz.register('rate-clock', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.rCode, title: T.rTitle, tag: T.rTag, intro: T.rIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.rLgQ },
        { color: 'var(--a3)', text: T.rLgP },
        { color: 'var(--accent)', text: T.rLgT, glow: true },
        { color: 'var(--a2)', text: T.rLgMean },
        { color: 'var(--accent)', text: T.rLgWin },
      ]));
      const pipe = Viz.pipe(body, T.rSteps);
      body.insertAdjacentHTML('beforeend',
        `<div class="viz-slider"><label>${T.rN}</label><input class="rc-n" type="range" min="1" max="64" value="24" aria-label="${Viz.esc(T.rN)}"><output class="rc-no"></output></div>
         <div class="viz-slider"><label>${T.rQ}</label><input class="rc-q" type="range" min="0" max="2" value="0" aria-label="${Viz.esc(T.rQ)}"><output class="rc-qo"></output></div>
         <div class="viz-slider"><label>${T.rA}</label><input class="rc-a" type="range" min="0" max="9" value="0" aria-label="${Viz.esc(T.rA)}"><output class="rc-ao"></output></div>
         <div class="viz-cols" style="margin-top:14px"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 300 210', class: 'viz-stage', role: 'img', 'aria-label': T.rStage }, left);
      const layer = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.rGo)}</div>`);
      const term = Viz.term(left, T.rReady);
      right.innerHTML =
        Viz.stat({ id: 'rc-t', k: T.rTtftK, v: '—', f: T.rTtftF }) +
        Viz.stat({ id: 'rc-e', k: T.rE2eK, v: '—', f: '' }) +
        Viz.stat({ id: 'rc-d', k: T.rDecK, v: '—', f: '' }) +
        Viz.stat({ id: 'rc-g', k: T.rGapK, v: '—', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.rTry) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const state = { busy: false };
      const params = () => ({ n: +$('.rc-n').value, queue: +$('.rc-q').value, accept: +$('.rc-a').value / 10, seed: 27 });
      const labels = () => { $('.rc-no').textContent = $('.rc-n').value; $('.rc-qo').textContent = $('.rc-q').value; $('.rc-ao').textContent = $('.rc-a').value * 10 + '%'; };
      const f1 = v => (v === null ? T.undef : v.toFixed(1));
      const sec = ms => (ms / 1000).toFixed(3);

      // Draws the timeline up to time `now` (ms). Returns nothing; purely visual.
      function draw(tl, now) {
        layer.innerHTML = '';
        const X = t => 10 + t / Math.max(tl.tEnd, 1) * 280;
        if (tl.tStart > 0) {
          Viz.svg('rect', { x: X(0), y: 22, width: Math.max(0, X(Math.min(now, tl.tStart)) - X(0)), height: 22, style: 'fill:var(--frame)' }, layer);
          if (X(tl.tStart) - X(0) > 40) txt(layer, { x: (X(0) + X(tl.tStart)) / 2, y: 38, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:var(--ink)' }, T.rQueue);
        }
        if (now > tl.tStart) {
          Viz.svg('rect', { x: X(tl.tStart), y: 22, width: Math.max(0, X(Math.min(now, tl.tFirst)) - X(tl.tStart)), height: 22, style: 'fill:var(--a3);opacity:.55' }, layer);
          if (X(tl.tFirst) - X(tl.tStart) > 40) txt(layer, { x: (X(tl.tStart) + X(tl.tFirst)) / 2, y: 38, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:var(--ink)' }, T.rPre);
        }
        tl.tokens.forEach(t => { if (t <= now) Viz.svg('path', { d: `M${X(t)} 18V48`, style: 'stroke:var(--accent);stroke-width:1.5;fill:none' }, layer); });
        if (now >= tl.tFirst) txt(layer, { x: Math.min(X(tl.tFirst), 250), y: 64, 'font-size': 12, style: 'fill:var(--accent)' }, '▲ ' + T.rFirst);
        Viz.svg('path', { d: 'M10 48H290', style: 'stroke:var(--muted);stroke-width:1;fill:none' }, layer);
        // meters, drawn only over the decode span
        txt(layer, { x: 10, y: 90, 'font-size': 12, style: 'fill:var(--muted)' }, T.rMeter);
        Viz.svg('path', { d: 'M10 190H290M10 98V190', style: 'stroke:var(--frame);stroke-width:1;fill:none' }, layer);
        if (now < tl.tFirst || tl.n < 2) return;
        const span = Math.max(tl.tEnd - tl.tFirst, 1), xs = t => 10 + (t - tl.tFirst) / span * 280;
        const pts = [];
        for (let t = tl.tFirst + 10; t <= Math.min(now, tl.tEnd); t += Math.max(5, span / 120)) pts.push(t);
        const winMax = Math.max(...pts.map(t => M.meterWindow(tl, t)), 1), top = winMax * 2.2;
        const Y = v => 190 - Math.min(v, top) / top * 88;
        const line = (fn, color) => Viz.svg('path', { d: pts.map((t, i) => `${i ? 'L' : 'M'}${xs(t).toFixed(1)} ${Y(fn(tl, t)).toFixed(1)}`).join(''), style: `stroke:${color};stroke-width:2;fill:none` }, layer);
        if (pts.length > 1) { line(M.meterMean, 'var(--a2)'); line(M.meterWindow, 'var(--accent)'); }
        const peak = M.meterMean(tl, tl.tFirst + 10);
        if (peak > top) txt(layer, { x: 14, y: 112, 'font-size': 12, style: 'fill:var(--a2)' }, T.rClip(Math.round(peak)));
      }
      function stats(tl) {
        const r = M.rates(tl);
        $('[data-s=rc-t-v]').textContent = r.ttft + ' ms';
        $('[data-s=rc-e-v]').textContent = f1(r.e2e); $('[data-s=rc-e-f]').innerHTML = T.rE2eF(tl.n, sec(tl.tEnd));
        $('[data-s=rc-d-v]').textContent = f1(r.perDecode); $('[data-s=rc-d-f]').innerHTML = T.rDecF(tl.n, sec(r.span));
        $('[data-s=rc-g-v]').textContent = f1(r.perGap); $('[data-s=rc-g-f]').innerHTML = T.rGapF(tl.n - 1, sec(r.span));
        return r;
      }
      function preview() {
        if (state.busy) return;
        labels();
        const tl = M.timeline(params());
        draw(tl, tl.tEnd); stats(tl); $('.viz-verdict').hidden = true; pipe.set(-1);
      }
      $('.viz-row .viz-btn').onclick = () => guardRun(el, ctx, state, async () => {
        const p = params(), tl = M.timeline(p), r = M.rates(tl);
        term.clear(); $('.viz-verdict').hidden = true;
        pipe.set(0); term.log(T.r0); draw(tl, 0); await ctx.sleep(300);
        if (tl.tStart > 0) { pipe.set(1); draw(tl, tl.tStart); term.log(T.rQ1(tl.tStart)); await ctx.sleep(450); }
        pipe.set(2); draw(tl, tl.tFirst - 1); await ctx.sleep(450);
        pipe.set(3); draw(tl, tl.tFirst); term.log(T.rP1(tl.tFirst)); await ctx.sleep(350);
        pipe.set(4);
        const steps = [...new Set(tl.tokens)].slice(1);
        let shown = 0, idx = 1;
        for (const t of steps) {
          const k = tl.tokens.filter(x => x === t).length;
          idx += k;
          if (shown < 4) { term.log(k > 1 ? T.rBurst(t, k) : T.rStep(t, idx)); shown++; } else if (shown === 4) { term.log(T.rMore); shown++; }
          draw(tl, t); await ctx.sleep(Math.max(15, 900 / steps.length));
        }
        pipe.set(5); draw(tl, tl.tEnd); stats(tl);
        term.log(T.rEnd(tl.tEnd, tl.n));
        if (tl.n > 1) term.log(T.rMeterLog(M.meterMean(tl, tl.tFirst + 10).toFixed(0), M.meterWindow(tl, tl.tFirst + 10).toFixed(0)));
        let html = T.rVerdict(f1(r.e2e), f1(r.perDecode), f1(r.perGap), r.ttft);
        if (tl.n === 1) html += T.rOne;
        if (p.queue > 0) html += T.rQueueNote;
        if (p.accept >= 0.5 && tl.n > 1) html += T.rBurstNote;
        const v = $('.viz-verdict'); v.innerHTML = html; v.hidden = false;
      });
      ['.rc-n', '.rc-q', '.rc-a'].forEach(s => { $(s).oninput = preview; });
      preview();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
