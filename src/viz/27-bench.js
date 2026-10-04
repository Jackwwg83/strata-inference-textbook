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
    es: {
      code: 'BENCH_LAB', title: 'Laboratorio de medición: ¿es más rápida A o B?', tag: 'Estimación didáctica · simulación con una verdad conocida',
      intro: 'Esta máquina simulada «conoce la verdad»: la configuración A tarda de verdad 100 ms por ejecución y B tarda 95 ms, así que B es de verdad un 5 % más rápida. Cada ejecución tiene una oscilación aleatoria de ±4 % y una probabilidad del 8 % de que otro programa la moleste y corra 2,5 veces más lenta. Mientras la máquina sigue fría, las 3 primeras ejecuciones son más lentas, y la ejecución 1 es un 80 % más lenta. Tú diseñas el experimento y ves a qué distancia de la verdad cae la conclusión medida.',
      lgA: 'Una ejecución de la configuración A', lgB: 'Una ejecución de la configuración B', lgWarm: 'Punto hueco: calentamiento, se descarta', lgMed: 'Línea vertical: mediana de este grupo',
      steps: ['Diseñar', 'Calentar', 'Ejecuciones medidas', 'Estadística', 'Concluir'],
      nLabel: 'Ejecuciones medidas por grupo', wLabel: 'Ejecuciones de calentamiento por grupo',
      orderSeq: 'Toda A y luego B', orderAlt: 'Alternar A y B',
      bGo: '▶ Empezar a medir', bSeed: 'Nuevos números aleatorios',
      stageLabel: 'Diagrama de dispersión de los tiempos de ejecución de los grupos A y B',
      axis: 'Tiempo (ms); más a la izquierda es más rápido', clip: 'Los puntos por encima de 250 ms se dibujan en el extremo derecho',
      sAK: 'Configuración A (en verdad 100 ms)', sBK: 'Configuración B (en verdad 95 ms)',
      sF: (s) => `<b>mediana</b>; media ${s.mean.toFixed(1).replace('.', ',')} · p95 ${s.p95.toFixed(1).replace('.', ',')} · DE ${s.sd.toFixed(1).replace('.', ',')}<br>muestras medidas n = ${s.n}${s.n < 20 ? '; con n &lt; 20, p95 es solo el máximo' : ''}`,
      sGK: 'Medido: cuánto más rápida es B que A', sGF: (mean) => `<b>= (mediana de A − mediana de B) ÷ mediana de A</b><br>calculado con las medias: ${mean} · verdad: 5 %`,
      ready: '<span class="c">$</span> ready. Diseña tu experimento y pulsa [ ▶ Empezar a medir ]',
      lStart: (n, w, alt) => `<span class="c">[diseño]</span> por grupo: ${w} de calentamiento, ${n} medidas; ${alt ? 'A y B se alternan' : 'toda A y luego B'}`,
      lRun: (g, cfg, ms, tags) => `<span class="m">#${g + 1} ${cfg}</span> ${ms} ms${tags}`,
      tCold: (f) => ` <span class="y">máquina aún fría ×${f}</span>`, tOut: ' <span class="y">molestada ×2,5</span>', tWarm: ' (calentamiento, se descarta)',
      lMore: (k) => `<span class="m">…</span> ${k} ejecuciones más que no se imprimen una por una`,
      lStat: (a, b) => `<span class="c">estadística</span> mediana de A ${a} ms, mediana de B ${b} ms`,
      lGap: (g) => `<span class="w">conclusión</span> B es un ${g} % más rápida que A (verdad: 5 %)`,
      vGood: (g) => `Medido: B es un <b>${g} %</b> más rápida, a menos de 2,5 puntos porcentuales del 5 % real. Este diseño es sólido: el calentamiento absorbió el arranque en frío y la mediana ignoró la molestia ocasional.`,
      vFlip: (g) => `Medido: B es un <b>${g} %</b> más rápida. ¡El signo está al revés! Con tan pocas ejecuciones, a B le tocaron por casualidad dos molestias, y le arrastraron la mediana. Con muy pocas muestras, una conclusión puede invertirse por completo.`,
      vOff: (g) => `Medido: B es un <b>${g} %</b> más rápida, pero la verdad es solo el 5 %. `,
      vSeqCold: 'Ejecutar toda A antes que B cargó sobre A toda la lentitud de una máquina recién arrancada. ',
      vNoWarm: 'Sin calentamiento, las ejecuciones en frío se colaron en las muestras medidas. ',
      vFew: 'Cada grupo tiene muy pocas muestras, así que una sola molestia puede mover la mediana. ',
      vMean: (g) => `<br>Mira también la media: ${g >= 0 ? 'B es un ' + g.toFixed(1).replace('.', ',') + ' % más rápida' : 'B es en realidad un ' + (-g).toFixed(1).replace('.', ',') + ' % más lenta'}. Una sola molestia ocasional de ×2,5 puede arrastrar la media; la mediana es mucho más estable.`,
      vNoise: 'El diseño en sí está bien; este desvío viene del ruido aleatorio. Prueba varios lotes de números aleatorios y mira en qué rango cae la conclusión. Es más fiable que mirar una sola vez.',
      try: [
        'Deja los valores por defecto (3 ejecuciones por grupo, sin calentamiento, toda A y luego B) y pulsa <b>Empezar a medir</b>: B parece más de un 30 % más rápida. Todas las ejecuciones lentas de una máquina recién arrancada caen sobre A.',
        'Cambia a <b>Alternar A y B</b> y pon el calentamiento en <b>3</b>: se descarta el arranque en frío y ya no favorece a ningún lado. La conclusión salta cerca del 5 %.',
        'Sube las ejecuciones medidas a <b>15</b> y pulsa <b>Nuevos números aleatorios</b> varias veces: la conclusión de la mediana se estabiliza cerca del 5 %, mientras que la media a veces se desvía varios puntos porcentuales por una sola molestia.',
      ],

      rCode: 'RATE_CLOCK', rTitle: 'Una solicitud, tres «velocidades»', rTag: 'Estimación didáctica · los tiempos son valores supuestos',
      rIntro: 'Una solicitud con streaming simulada: espera en cola, prefill («leer el prompt»), el primer token y luego los demás tokens uno tras otro. Supón que el prefill tarda 800 ms y que cada paso de decode tarda 25 ms. Cuando se aceptan tokens del borrador, un paso puede emitir varios tokens. Pulsa <b>Reproducir</b> y mira cuántas «velocidades» distintas puede dar una sola solicitud.',
      rLgQ: 'Cola: esperando a las solicitudes anteriores', rLgP: 'Prefill: procesar todo el prompt', rLgT: 'Línea vertical: un token emitido', rLgMean: 'Medidor 1: promedio desde el primer token', rLgWin: 'Medidor 2: ventana de los últimos 2 segundos',
      rSteps: ['Solicitud enviada', 'Cola', 'Prefill', 'Primer token', 'En streaming', 'Terminada'],
      rN: 'Tokens de salida', rQ: 'Solicitudes por delante en la cola', rA: 'Tasa de aceptación del borrador',
      rGo: '▶ Reproducir',
      rStage: 'Línea de tiempo de una solicitud y dos velocímetros en vivo',
      rQueue: 'Cola', rPre: 'Prefill', rFirst: '1.er token',
      rMeter: 'Medidor de velocidad en vivo (token/s)', rClip: (v) => `La lectura del promedio se dispara a ${v}`,
      rTtftK: 'Tiempo hasta el primer token (TTFT)', rTtftF: '<b>= llegada del primer token − solicitud enviada</b><br>incluye la cola y el prefill',
      rE2eK: 'Velocidad ①: de extremo a extremo', rE2eF: (n, s) => `<b>= N ÷ tiempo total = ${n} ÷ ${s} s</b><br>también cuentan la cola y el prefill`,
      rDecK: 'Velocidad ②: por tiempo de decode', rDecF: (n, s) => `<b>= N ÷ (último token − primer token) = ${n} ÷ ${s} s</b><br>el primer token no ocupa tiempo pero se cuenta, así que con N pequeña la lectura sale alta`,
      rGapK: 'Velocidad ③: por intervalos', rGapF: (n, s) => `<b>= (N − 1) ÷ (último token − primer token) = ${n} ÷ ${s} s</b><br>cuenta solo los intervalos posteriores al primer token`,
      undef: 'indefinida',
      rReady: '<span class="c">$</span> ready. Ajusta los parámetros y pulsa [ ▶ Reproducir ]',
      r0: '<span class="c">t = 0</span> solicitud enviada',
      rQ1: (t) => `<span class="m">t = ${t} ms</span> terminan las solicitudes anteriores; es tu turno. El servidor atiende una secuencia a la vez, por orden de llegada`,
      rP1: (t) => `<span class="m">t = ${t} ms</span> termina el prefill, se emite el token 1 → TTFT = ${t} ms`,
      rBurst: (t, k) => `<span class="m">t = ${t} ms</span> este paso emite ${k} tokens (${k - 1} ${k === 2 ? 'token del borrador aceptado' : 'tokens del borrador aceptados'})`,
      rStep: (t, i) => `<span class="m">t = ${t} ms</span> token ${i}`,
      rMore: '<span class="m">…</span> los pasos posteriores no se imprimen uno por uno',
      rEnd: (t, n) => `<span class="w">t = ${t} ms</span> terminada, ${n} tokens en total`,
      rMeterLog: (a, b) => `<span class="y">medidores</span> 10 ms después del primer token: el promedio marca ${a} token/s y la ventana de 2 segundos marca ${b} token/s`,
      rVerdict: (e, d, g, t) => `Una solicitud: de extremo a extremo <b>${e}</b> token/s, por tiempo de decode <b>${d}</b>, por intervalos <b>${g}</b>; TTFT <b>${t}</b> ms. Ninguna de las tres está mal; responden preguntas distintas. Un informe debe decir qué fórmula usó.`,
      rOne: '<br>Con un solo token, las velocidades ② y ③ dividen entre 0, así que ninguna está definida. Forzar un número enorme en pantalla es peor que mostrar «indefinida».',
      rQueueNote: '<br>La cola añadió varios segundos al TTFT, pero la velocidad de decode no cambió en absoluto. Cuando los usuarios sienten «lentitud», puede que esté en la cola y no en el cálculo del motor.',
      rBurstNote: '<br>Los borradores hacen que los tokens lleguen en ráfagas. El «promedio desde el primer token» marca demasiado alto justo después del primer token (a los 10 ms es 1 ÷ 0,01 s = 100) y luego oscila con cada ráfaga. La ventana de 2 segundos rellena el denominador inicial hasta al menos 0,25 s, así que la lectura nunca se dispara. El servidor de Strata usa el enfoque de la ventana para su velocidad en vivo.',
      rTry: [
        'Baja la longitud de salida a <b>1</b>: ni la velocidad ② ni la ③ están definidas, porque las dos dividen entre 0. Ten mucho cuidado con las cifras de velocidad de las respuestas cortas.',
        'Pon la cola en <b>2</b>: el TTFT crece 3 segundos, las velocidades ② y ③ no se mueven, pero la velocidad ① cae mucho. Los tres números responden tres preguntas distintas.',
        'Pon la tasa de aceptación del borrador en <b>80 %</b>: los tokens llegan en ráfagas. Mira lo alto que se dispara el medidor 1 tras el primer token y compáralo luego con el medidor 2.',
      ],
    },
    ko: {
      code: 'BENCH_LAB', title: '측정 실험: A와 B 중 누가 더 빠를까', tag: '교육용 추정 · 진실을 아는 시뮬레이션',
      intro: '「진실을 아는」 시뮬레이션 기계예요. 구성 A는 실행 한 번에 실제로 100 ms가 걸리고, 구성 B는 95 ms가 걸려서 B가 정말로 5% 빨라요. 실행마다 ±4%의 무작위 흔들림이 있고, 8% 확률로 다른 프로그램에 방해받아 2.5배 느려져요. 기계가 막 일하기 시작하면 처음 3번의 실행은 느려지고, 첫 번째는 80% 느려요. 실험을 직접 설계해서 측정한 결론이 진실과 얼마나 떨어져 있는지 보세요.',
      lgA: '구성 A의 실행 한 번', lgB: '구성 B의 실행 한 번', lgWarm: '빈 점: 워밍업, 버려서 세지 않음', lgMed: '세로선: 이 묶음의 중앙값',
      steps: ['실험 설계', '워밍업', '본 실행', '통계', '결론'],
      nLabel: '묶음마다 본 실행 횟수', wLabel: '묶음마다 먼저 워밍업할 횟수',
      orderSeq: 'A를 다 돌린 뒤 B', orderAlt: 'A, B 번갈아 실행',
      bGo: '▶ 측정 시작', bSeed: '난수 바꾸기',
      stageLabel: 'A, B 두 묶음의 실행 시간 산점도',
      axis: '소요 시간(ms), 왼쪽일수록 빠름', clip: '250 ms를 넘는 점은 맨 오른쪽에 그려요',
      sAK: '구성 A(실제 100 ms)', sBK: '구성 B(실제 95 ms)',
      sF: (s) => `<b>중앙값</b>. 평균 ${s.mean.toFixed(1)} · p95 ${s.p95.toFixed(1)} · 표준 편차 ${s.sd.toFixed(1)}<br>본 표본 n = ${s.n}${s.n < 20 ? '. n &lt; 20이면 p95가 곧 최댓값이에요' : ''}`,
      sGK: '측정 결과: B가 A보다 얼마나 빠른가', sGF: (mean) => `<b>= (A의 중앙값 − B의 중앙값) ÷ A의 중앙값</b><br>평균으로 계산하면: ${mean}　진실: 5%`,
      ready: '<span class="c">$</span> ready. 실험을 설계하고 [ ▶ 측정 시작 ]을 누르세요',
      lStart: (n, w, alt) => `<span class="c">[설계]</span> 묶음마다 워밍업 ${w}번, 본 실행 ${n}번, ${alt ? 'A, B 번갈아' : 'A 먼저, 그다음 B'}`,
      lRun: (g, cfg, ms, tags) => `<span class="m">#${g + 1} ${cfg}</span> ${ms} ms${tags}`,
      tCold: (f) => ` <span class="y">기계가 아직 안 데워짐 ×${f}</span>`, tOut: ' <span class="y">방해받음 ×2.5</span>', tWarm: ' (워밍업, 버림)',
      lMore: (k) => `<span class="m">…</span> 그 밖의 ${k}번의 실행은 하나씩 출력하지 않았어요`,
      lStat: (a, b) => `<span class="c">통계</span> A의 중앙값 ${a} ms, B의 중앙값 ${b} ms`,
      lGap: (g) => `<span class="w">결론</span> B가 A보다 ${g}% 빠름(진실은 5%)`,
      vGood: (g) => `B가 <b>${g}%</b> 빠르다고 측정됐어요. 진실인 5%와 2.5퍼센트포인트도 차이 나지 않아요. 이 실험 설계는 믿을 만해요. 워밍업이 콜드 스타트를 흡수했고, 가끔 있는 방해는 중앙값이 막아 줬어요.`,
      vFlip: (g) => `B가 <b>${g}%</b> 빠르다고 측정됐는데, 방향이 아예 반대예요! 이 정도만 돌렸더니 B가 하필 방해를 두 번 맞았고, 중앙값이 끌려갔어요. 표본이 너무 적으면 결론이 완전히 뒤집힐 수 있어요.`,
      vOff: (g) => `B가 <b>${g}%</b> 빠르다고 측정됐지만, 진실은 5%뿐이에요.`,
      vSeqCold: 'A를 다 돌린 뒤 B를 돌렸더니, 기계가 막 시작했을 때의 느림이 전부 A 몫이 됐어요.',
      vNoWarm: '워밍업이 없어서, 콜드 스타트 몇 번이 본 표본에 섞였어요.',
      vFew: '묶음마다 표본이 너무 적어서, 방해 한 번에 중앙값이 움직여요.',
      vMean: (g) => `<br>참고로 평균을 보면: ${g >= 0 ? 'B가 ' + g.toFixed(1) + '% 빠름' : 'B가 오히려 ' + (-g).toFixed(1) + '% 느림'}. 평균은 가끔 있는 ×2.5 방해에 끌려가고, 중앙값은 훨씬 안정적이에요.`,
      vNoise: '실험 설계 자체에는 문제가 없어요. 이번 편차는 무작위 흔들림에서 왔어요. 난수를 여러 번 바꿔서 결론이 어느 범위에 떨어지는지 보는 편이 한 번만 보는 것보다 믿을 만해요.',
      try: [
        '기본값(묶음마다 3번, 워밍업 없음, A 먼저 B 나중)으로 <b>측정 시작</b>을 눌러 보세요. B가 30% 넘게 빨라 보여요. 기계가 막 시작했을 때의 느림이 전부 A 몫이 됐기 때문이에요.',
        '<b>A, B 번갈아 실행</b>으로 바꾸고 워밍업을 <b>3</b>으로 올려 보세요. 콜드 스타트가 버려지고 한쪽으로 치우치지도 않아요. 결론이 단번에 5%에 가까워져요.',
        '본 실행 횟수를 <b>15</b>로 올리고 <b>난수 바꾸기</b>를 여러 번 눌러 보세요. 중앙값의 결론은 5% 근처에서 안정적이고, 평균은 방해 한 번에 몇 퍼센트포인트씩 끌려가기도 해요.',
      ],

      rCode: 'RATE_CLOCK', rTitle: '요청 하나, 「속도」 세 가지', rTag: '교육용 추정 · 시간은 가정값',
      rIntro: '스트리밍 요청 하나를 시뮬레이션해요. 대기, 문제 읽기(프리필), 첫 토큰 출력, 그리고 이어서 나머지 토큰 출력이에요. 문제 읽기에 800 ms가 걸리고 디코드 한 단계에 25 ms가 걸린다고 가정해요. 드래프트가 수락되면 한 단계에 토큰이 여러 개 나와요. <b>재생</b>을 눌러 같은 요청에서 서로 다른 「속도」가 몇 가지나 나오는지 보세요.',
      rLgQ: '대기: 앞의 요청을 기다림', rLgP: '문제 읽기: 질문 전체를 처리', rLgT: '세로선: 출력된 토큰', rLgMean: '속도계 1: 첫 토큰부터의 평균', rLgWin: '속도계 2: 최근 2초 윈도',
      rSteps: ['요청 전송', '대기', '문제 읽기', '첫 토큰', '이어서 출력', '종료'],
      rN: '출력 토큰 수', rQ: '앞에서 대기 중인 요청', rA: '드래프트 수락률',
      rGo: '▶ 재생',
      rStage: '요청 한 번의 타임라인과 두 가지 실시간 속도계',
      rQueue: '대기', rPre: '문제 읽기', rFirst: '첫 토큰',
      rMeter: '실시간 속도계(token/s)', rClip: (v) => `평균 표시값이 ${v}까지 치솟음`,
      rTtftK: '첫 토큰까지의 지연 TTFT', rTtftF: '<b>= 첫 토큰 도착 − 요청 전송</b><br>대기와 문제 읽기를 포함해요',
      rE2eK: '속도 ①: 엔드투엔드', rE2eF: (n, s) => `<b>= N ÷ 총 시간 = ${n} ÷ ${s} s</b><br>대기와 문제 읽기도 계산에 넣어요`,
      rDecK: '속도 ②: 디코드 시간 기준', rDecF: (n, s) => `<b>= N ÷ (마지막 토큰 − 첫 토큰) = ${n} ÷ ${s} s</b><br>첫 토큰은 시간을 차지하지 않는데 세어서, N이 작으면 높게 나와요`,
      rGapK: '속도 ③: 간격 기준', rGapF: (n, s) => `<b>= (N − 1) ÷ (마지막 토큰 − 첫 토큰) = ${n} ÷ ${s} s</b><br>첫 토큰 이후의 간격만 계산해요`,
      undef: '정의되지 않음',
      rReady: '<span class="c">$</span> ready. 인자를 정하고 [ ▶ 재생 ]을 누르세요',
      r0: '<span class="c">t = 0</span> 요청 전송',
      rQ1: (t) => `<span class="m">t = ${t} ms</span> 앞의 요청이 끝나서 내 차례예요. 서버는 한 번에 시퀀스 하나만 처리하고 선착순이에요`,
      rP1: (t) => `<span class="m">t = ${t} ms</span> 문제 읽기가 끝나고 첫 번째 토큰이 나와요 → TTFT = ${t} ms`,
      rBurst: (t, k) => `<span class="m">t = ${t} ms</span> 이번 단계에서 토큰 ${k}개가 나와요(드래프트 ${k - 1}개 수락)`,
      rStep: (t, i) => `<span class="m">t = ${t} ms</span> ${i}번째 토큰`,
      rMore: '<span class="m">…</span> 뒤의 단계는 하나씩 출력하지 않아요',
      rEnd: (t, n) => `<span class="w">t = ${t} ms</span> 종료, 토큰은 모두 ${n}개`,
      rMeterLog: (a, b) => `<span class="y">속도계</span> 첫 토큰 10 ms 뒤: 평균 표시값 ${a} token/s, 2초 윈도 표시값 ${b} token/s`,
      rVerdict: (e, d, g, t) => `같은 요청인데, 엔드투엔드는 <b>${e}</b> token/s, 디코드 시간 기준은 <b>${d}</b>, 간격 기준은 <b>${g}</b>이고, TTFT는 <b>${t}</b> ms예요. 세 숫자 모두 잘못 계산한 게 아니라, 서로 다른 질문에 답하는 거예요. 보고서를 쓸 때는 어느 공식을 썼는지 반드시 밝혀야 해요.`,
      rOne: '<br>토큰이 1개뿐이면 속도 ②와 ③은 둘 다 0으로 나누게 돼서 정의되지 않아요. 화면에 엄청 큰 수를 억지로 띄우는 것은 「정의되지 않음」을 보여 주는 것보다 나빠요.',
      rQueueNote: '<br>대기 때문에 TTFT가 몇 초나 늘었는데 디코드 속도는 하나도 안 변했어요. 사용자가 「느리다」고 느꼈다면 엔진이 느린 게 아니라 대기가 느린 것일 수 있어요.',
      rBurstNote: '<br>드래프트 때문에 토큰이 한 묶음씩 도착해요. 「첫 토큰부터의 평균」은 첫 토큰이 막 나왔을 때 표시값이 부풀어요(10 ms에서는 1 ÷ 0.01 s = 100). 그 뒤로는 토큰 묶음이 올 때마다 오르락내리락해요. 2초 윈도는 시작할 때의 분모를 최소 0.25 s로 받쳐서 표시값이 하늘로 치솟지 않아요. Strata 서버의 실시간 속도가 쓰는 것이 바로 윈도 방식이에요.',
      rTry: [
        '출력 길이를 <b>1</b>로 내려 보세요. 속도 ②와 ③은 정의되지 않아요. 0으로 나누기 때문이에요. 짧은 답변의 속도 숫자는 특별히 조심해야 해요.',
        '대기를 <b>2</b>로 올려 보세요. TTFT가 3초 늘고 속도 ②와 ③은 꿈쩍도 안 하는데, 속도 ①은 크게 떨어져요. 세 숫자는 서로 다른 세 질문에 답하는 거예요.',
        '드래프트 수락률을 <b>80%</b>로 올려 보세요. 토큰이 한 묶음씩 도착해요. 속도계 1이 첫 토큰 뒤에 얼마나 높이 치솟는지 보고, 속도계 2와 비교해 보세요.',
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
