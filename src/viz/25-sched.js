/* Chapter 25 widgets: FIFO / SJF / round-robin on the same arrivals, and the M/M/1 waiting-time curve.
   A design exercise, not an upstream feature: upstream Strata serves one sequence at a time behind a FIFO.
   All visible text lives in the T tables below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.sched;

  const T = Viz.t({
    zh: {
      code: 'SCHED_RACE', title: '三种调度，同一批请求', tag: '教学推演 · 1 格 = 生成 1 个 token 的时间',
      intro: '一台引擎一次只能服务一个请求。同一批请求按到达时间排好，分别交给三种调度策略：<b>FIFO</b> 按到达顺序，<b>SJF</b> 挑最短的先做，<b>轮转</b>每人轮流做一个时间片。按 <b>开始比较</b>，看三条时间线怎样一格格长出来。',
      lgArrive: j => `${j.id}：第 ${j.arrive} 格到，要 ${j.len} 格`,
      steps: ['FIFO 先来先服务', 'SJF 短作业优先', '轮转', '比较'],
      lanes: { fifo: 'FIFO 先来先服务', sjf: 'SJF 短作业优先（不抢占）', rr: q => `轮转（时间片 ${q} 格）` },
      stage: '三种调度策略的时间线，每格是生成一个 token 的时间',
      presets: { convoy: '长请求先到', same: '同时到达', starve: '短请求接连到' },
      bPlay: '▶ 开始比较', qtLabel: '轮转的时间片（格）',
      ready: '<span class="c">$</span> ready. 选一组请求，按 [ ▶ 开始比较 ]',
      start: (p) => `<span class="y">// ${p}</span>`,
      dFifo: (t, j, w) => `t=${t}：${w ? `队里有 ${w}，` : ''}选最早到的 <span class="c">${j}</span>，一口气做完`,
      dSjf: (t, j, len, w) => `t=${t}：${w ? `队里有 ${w}，` : ''}选最短的 <span class="c">${j}</span>（${len} 格），一口气做完`,
      dRr: (t, j, w) => `t=${t}：轮到 <span class="c">${j}</span>，最多做一个时间片${w ? `，之后排到 ${w} 后面` : ''}`,
      lEnd: (name, w, f) => `<span class="y">${name}</span>：平均等待 ${w} 格，平均 ${f} 格后看到第一个字`,
      sK: { fifo: 'FIFO 平均等待', sjf: 'SJF 平均等待', rr: '轮转平均等待' },
      sF: (f, sw) => `<b>= Σ(完成 − 到达 − 长度) ÷ 人数</b><br>平均首字：${f} 格 · 切换 ${sw} 次`,
      unit: '格',
      verdict: (bw, bf, extra) => `① 平均等待最短的是 <b>${bw}</b>；平均最早看到第一个字的是 <b>${bf}</b>。<br>② 三种策略做的总工作一样多，时间线一样长，差别只在<b>谁先谁后</b>。<br>③ ${extra}`,
      xConvoy: 'FIFO 下，B、C、D 都被先到的长请求 A 挡在后面，这叫<b>护航效应</b>。轮转让每个人很快拿到第一个字，代价是来回切换。',
      xSame: 'SJF 让短请求先走，平均等待最短；但它要求事先知道每个回答有多长，而大模型的回答长度在生成完之前并不知道。',
      xStarve: (f, s) => `长请求 A 在 FIFO 下只等 ${f} 格，在 SJF 下要等 ${s} 格：短请求接连插队，A 一直被往后推，这叫<b>饥饿</b>。`,
      try: [
        '选 <b>长请求先到</b>：FIFO 下 B、C、D 都要等 A 做完。能看出：一个长请求能拖慢它后面所有人。',
        '把时间片从 1 拉到 <b>8</b>：轮转的时间线变得和 FIFO 一模一样。能看出：时间片足够大时，轮转就退化成 FIFO。',
        '选 <b>短请求接连到</b>：SJF 平均等待最短，可长请求 A 排到了最后。能看出：只看平均数，会漏掉被饿着的那个人。',
      ],

      qCode: 'QUEUE_LOAD', qTitle: '忙到几成就开始堵', qTag: '教学推演 · M/M/1 模型，假设平均每个回答 10 秒',
      qIntro: '假设一台 Strata 平均 10 秒答完一个请求，也就是每分钟最多服务 6 个。拖动滑块改变每分钟来几个请求，看平均要等多久。<b>模拟</b>按钮会用随机数真的跑 2 万个请求，和公式对一对。',
      qLgCurve: '公式算出的平均停留时间', qLgDot: '当前的到达率', qLgSim: '模拟结果',
      qStage: '平均停留时间随利用率变化的曲线',
      qAxisX: '利用率 ρ', qAxisY: '平均停留（秒）',
      qLabel: '每分钟到达的请求', qSim: '▶ 模拟 2 万个请求',
      qReady: '<span class="c">$</span> ready. 拖动滑块，或按 [ ▶ 模拟 ]',
      qMove: (l, rho, w) => `<span class="c">λ = ${l}/分钟</span>：引擎忙碌 ${rho}% 的时间，平均停留 ${w} 秒`,
      qRun: (n, seed) => `<span class="m">模拟</span>：随机生成 ${n} 个请求的到达间隔和服务时间（种子 ${seed}）`,
      qRes: (w, f, peak) => `<span class="y">结果</span>：平均停留 ${w} 秒，公式给出 ${f} 秒；最拥挤时系统里同时有 ${peak} 个请求`,
      sRhoK: '利用率 ρ', sRhoF: '<b>= λ ÷ μ</b><br>μ = 6 个/分钟（平均 10 秒一个）',
      sec: n => `${n} 秒`,
      sWK: '平均停留时间 W', sWF: '<b>= 1 ÷ (μ − λ)</b><br>排队时间 + 自己被服务的 10 秒',
      sLK: '系统里平均有几个请求 L', sLF: '<b>= λ × W</b>（利特尔法则）<br>到达率乘以每人停留的时间',
      qVerdict: (rho, w, sim) => `① 利用率 ${rho}% 时，公式给出平均停留 <b>${w} 秒</b>，模拟得到 <b>${sim} 秒</b>。<br>② 等待时间不是随利用率线性增长：从 50% 到 80%，停留从 20 秒涨到 50 秒；到 95% 就是 200 秒。<br>③ 越接近满负荷，模拟结果波动越大：偶尔一阵扎堆到达，队伍要很久才能消化。所以服务要留余量，不能按“刚好忙满”来规划。`,
      qTry: [
        '把到达率从 <b>3</b> 拉到 <b>4.8</b>：利用率从 50% 到 80%，平均停留从 20 秒变成 50 秒。能看出：多了六成的请求，等待却多了一倍半。',
        '继续拉到 <b>5.7</b>（95%）：平均停留 200 秒。能看出：曲线在接近 100% 时陡然竖起来。',
        '在 80% 和 95% 各按几次 <b>模拟</b>：80% 时结果和公式很接近，95% 时每次都差不少。',
      ],
    },
    en: {
      code: 'SCHED_RACE', title: 'Three schedulers, one set of requests', tag: 'Teaching estimate · 1 tick = time to generate 1 token',
      intro: 'One engine can serve only one request at a time. The same set of requests, ordered by arrival time, goes to three scheduling policies: <b>FIFO</b> in order of arrival, <b>SJF</b> picks the shortest first, and <b>round-robin</b> gives everyone one time slice in turn. Press <b>Compare</b> and watch the three timelines grow tick by tick.',
      lgArrive: j => `${j.id}: arrives at tick ${j.arrive}, needs ${j.len} ticks`,
      steps: ['FIFO first come, first served', 'SJF shortest job first', 'Round-robin', 'Compare'],
      lanes: { fifo: 'FIFO first come, first served', sjf: 'SJF shortest job first (no preemption)', rr: q => `Round-robin (slice ${q} ticks)` },
      stage: 'Timelines of the three scheduling policies; each tick is the time to generate one token',
      presets: { convoy: 'Long request first', same: 'All arrive together', starve: 'Short requests keep coming' },
      bPlay: '▶ Compare', qtLabel: 'Round-robin time slice (ticks)',
      ready: '<span class="c">$</span> ready. Pick a set of requests and press [ ▶ Compare ]',
      start: (p) => `<span class="y">// ${p}</span>`,
      dFifo: (t, j, w) => `t=${t}: ${w ? `queue holds ${w.split('、').join(', ')}; ` : ''}pick the earliest arrival <span class="c">${j}</span> and run it to the end`,
      dSjf: (t, j, len, w) => `t=${t}: ${w ? `queue holds ${w.split('、').join(', ')}; ` : ''}pick the shortest, <span class="c">${j}</span> (${len} ticks), and run it to the end`,
      dRr: (t, j, w) => `t=${t}: <span class="c">${j}</span>'s turn, for at most one time slice${w ? `, then it goes behind ${w.split('、').join(', ')}` : ''}`,
      lEnd: (name, w, f) => `<span class="y">${name}</span>: average wait ${w} ticks; first word after ${f} ticks on average`,
      sK: { fifo: 'FIFO average wait', sjf: 'SJF average wait', rr: 'Round-robin average wait' },
      sF: (f, sw) => `<b>= Σ(finish − arrival − length) ÷ number of requests</b><br>average first word: ${f} ticks · ${sw} switches`,
      unit: 'ticks',
      verdict: (bw, bf, extra) => `① The shortest average wait: <b>${bw}</b>. The earliest first word on average: <b>${bf}</b>.<br>② All three policies do the same total work, and the timelines are equally long; the only difference is <b>who goes first</b>.<br>③ ${extra}`,
      xConvoy: 'Under FIFO, B, C and D are all stuck behind the long request A that arrived first; this is the <b>convoy effect</b>. Round-robin gives everyone a first word quickly, at the cost of switching back and forth.',
      xSame: 'SJF lets short requests go first and gives the shortest average wait; but it needs to know each answer\'s length in advance, and a large model\'s answer length is unknown until it is fully generated.',
      xStarve: (f, s) => `The long request A waits only ${f} ticks under FIFO but ${s} ticks under SJF: short requests keep cutting in and A keeps getting pushed back; this is <b>starvation</b>.`,
      try: [
        'Pick <b>Long request first</b>: under FIFO, B, C and D all wait for A to finish. You can see that one long request slows down everyone behind it.',
        'Drag the time slice from 1 up to <b>8</b>: the round-robin timeline becomes identical to FIFO. You can see that with a big enough slice, round-robin turns into FIFO.',
        'Pick <b>Short requests keep coming</b>: SJF has the shortest average wait, yet the long request A ends up last. You can see that looking only at the average misses the one who starves.',
      ],

      qCode: 'QUEUE_LOAD', qTitle: 'How busy before it jams', qTag: 'Teaching estimate · M/M/1 model, mean answer time 10 s',
      qIntro: 'Suppose one Strata finishes a request in 10 seconds on average, so it can serve at most 6 per minute. Drag the slider to change how many requests arrive per minute and see how long the average wait is. The <b>Simulate</b> button really runs 20,000 requests with random numbers to check against the formula.',
      qLgCurve: 'Average time in system from the formula', qLgDot: 'Current arrival rate', qLgSim: 'Simulation result',
      qStage: 'Curve of average time in system versus utilization',
      qAxisX: 'Utilization ρ', qAxisY: 'Average time in system (s)',
      qLabel: 'Requests arriving per minute', qSim: '▶ Simulate 20,000 requests',
      qReady: '<span class="c">$</span> ready. Drag the slider, or press [ ▶ Simulate ]',
      qMove: (l, rho, w) => `<span class="c">λ = ${l}/min</span>: the engine is busy ${rho}% of the time; average time in system ${w} s`,
      qRun: (n, seed) => `<span class="m">Simulate</span>: random arrival gaps and service times for ${n} requests (seed ${seed})`,
      qRes: (w, f, peak) => `<span class="y">Result</span>: average time in system ${w} s, formula says ${f} s; at the busiest moment ${peak} requests were in the system at once`,
      sRhoK: 'Utilization ρ', sRhoF: '<b>= λ ÷ μ</b><br>μ = 6 per minute (10 s each on average)',
      sec: n => `${n} s`,
      sWK: 'Average time in system W', sWF: '<b>= 1 ÷ (μ − λ)</b><br>queuing time + your own 10 s of service',
      sLK: 'Average requests in the system L', sLF: '<b>= λ × W</b> (Little\'s law)<br>arrival rate times time each one stays',
      qVerdict: (rho, w, sim) => `① At ${rho}% utilization, the formula gives an average time in system of <b>${w} s</b>, and the simulation gives <b>${sim} s</b>.<br>② Waiting does not grow linearly with utilization: from 50% to 80%, time in system goes from 20 s to 50 s; at 95% it is 200 s.<br>③ The closer to full load, the more the simulation swings: an occasional burst of arrivals takes a long time to clear. That is why a service needs headroom and must not be planned to be "exactly fully busy".`,
      qTry: [
        'Drag the arrival rate from <b>3</b> to <b>4.8</b>: utilization goes from 50% to 80%, and the average time in system from 20 s to 50 s. You can see that 60% more requests mean 150% more waiting.',
        'Keep going to <b>5.7</b> (95%): the average time in system is 200 s. You can see the curve shoot straight up near 100%.',
        'Press <b>Simulate</b> a few times at 80% and at 95%: at 80% the results stay close to the formula; at 95% they are well off every time.',
      ],
    },
    ja: {
      code: 'SCHED_RACE', title: '3 つのスケジューリング、同じリクエストの組', tag: '教育用の試算 · 1 マス = 1 トークンを生成する時間',
      intro: '1 台のエンジンは、一度に 1 つのリクエストしか処理できません。到着時刻の順に並べた同じリクエストの組を、3 つのスケジューリング方針に渡します。<b>FIFO</b> は到着順、<b>SJF</b> はいちばん短いものから先、<b>ラウンドロビン</b>は全員が 1 タイムスライスずつ順番にやります。<b>比較を開始</b>を押して、3 本のタイムラインが 1 マスずつ伸びていくのを見てください。',
      lgArrive: j => `${j.id}：${j.arrive} マス目に到着、${j.len} マス必要`,
      steps: ['FIFO 先着順', 'SJF 最短ジョブ優先', 'ラウンドロビン', '比較'],
      lanes: { fifo: 'FIFO 先着順', sjf: 'SJF 最短ジョブ優先（非割り込み）', rr: q => `ラウンドロビン（スライス ${q} マス）` },
      stage: '3 つのスケジューリング方針のタイムライン。1 マスは 1 トークンを生成する時間',
      presets: { convoy: '長いリクエストが先に到着', same: '同時に到着', starve: '短いリクエストが次々に到着' },
      bPlay: '▶ 比較を開始', qtLabel: 'ラウンドロビンのスライス（マス）',
      ready: '<span class="c">$</span> ready. リクエストの組を選んで、[ ▶ 比較を開始 ] を押してください',
      start: (p) => `<span class="y">// ${p}</span>`,
      dFifo: (t, j, w) => `t=${t}：${w ? `行列に ${w} がいます。` : ''}いちばん早く着いた <span class="c">${j}</span> を選び、一気にやり終えます`,
      dSjf: (t, j, len, w) => `t=${t}：${w ? `行列に ${w} がいます。` : ''}いちばん短い <span class="c">${j}</span>（${len} マス）を選び、一気にやり終えます`,
      dRr: (t, j, w) => `t=${t}：<span class="c">${j}</span> の番です。最大で 1 タイムスライスだけやります${w ? `。その後は ${w} の後ろに並びます` : ''}`,
      lEnd: (name, w, f) => `<span class="y">${name}</span>：平均待ち ${w} マス、平均 ${f} マスで最初の文字が見えます`,
      sK: { fifo: 'FIFO の平均待ち', sjf: 'SJF の平均待ち', rr: 'ラウンドロビンの平均待ち' },
      sF: (f, sw) => `<b>= Σ(完了 − 到着 − 長さ) ÷ 人数</b><br>平均の最初の文字：${f} マス · 切り替え ${sw} 回`,
      unit: 'マス',
      verdict: (bw, bf, extra) => `① 平均待ちがいちばん短いのは <b>${bw}</b>、最初の文字が平均でいちばん早く見えるのは <b>${bf}</b> です。<br>② 3 つの方針がこなす総仕事量は同じで、タイムラインの長さも同じです。違うのは<b>誰が先か</b>だけです。<br>③ ${extra}`,
      xConvoy: 'FIFO では、B、C、D が、先に着いた長いリクエスト A に足止めされます。これが<b>コンボイ効果</b>です。ラウンドロビンなら、全員がすぐに最初の文字をもらえますが、代償として切り替えが何度も起こります。',
      xSame: 'SJF は短いリクエストを先に行かせるので、平均待ちが最短になります。ただし、各答えの長さを前もって知っている必要があります。大規模モデルの答えの長さは、生成し終えるまで分かりません。',
      xStarve: (f, s) => `長いリクエスト A は、FIFO なら ${f} マス待つだけですが、SJF では ${s} マス待たされます。短いリクエストが次々に割り込み、A はずっと後ろへ押しやられます。これが<b>飢餓</b>です。`,
      try: [
        '<b>長いリクエストが先に到着</b>を選びます。FIFO では、B、C、D が A の終わりを待つことになります。1 つの長いリクエストが、その後ろの全員を遅らせることが分かります。',
        'スライスを 1 から <b>8</b> まで引き上げます。ラウンドロビンのタイムラインが、FIFO とまったく同じになります。スライスが十分大きいと、ラウンドロビンは FIFO に退化することが分かります。',
        '<b>短いリクエストが次々に到着</b>を選びます。SJF は平均待ちが最短ですが、長いリクエスト A はいちばん最後になります。平均だけを見ると、飢えさせられている 1 人を見落とすことが分かります。',
      ],

      qCode: 'QUEUE_LOAD', qTitle: '何割忙しくなると詰まり始めるか', qTag: '教育用の試算 · M/M/1 モデル、1 つの答えの平均を 10 秒と仮定',
      qIntro: 'Strata 1 台が、1 つのリクエストを平均 10 秒で答え終えるとします。つまり毎分最大 6 件を処理できます。スライダーを動かして、毎分何件のリクエストが来るかを変え、平均でどれだけ待つかを見てください。<b>シミュレーション</b>ボタンは、乱数を使って本当に 2 万件のリクエストを走らせ、公式と照らし合わせます。',
      qLgCurve: '公式で計算した平均滞在時間', qLgDot: '現在の到着率', qLgSim: 'シミュレーション結果',
      qStage: '平均滞在時間が利用率とともに変化する曲線',
      qAxisX: '利用率 ρ', qAxisY: '平均滞在（秒）',
      qLabel: '毎分到着するリクエスト', qSim: '▶ 2 万件をシミュレーション',
      qReady: '<span class="c">$</span> ready. スライダーを動かすか、[ ▶ シミュレーション ] を押してください',
      qMove: (l, rho, w) => `<span class="c">λ = ${l}/分</span>：エンジンは時間の ${rho}% が忙しく、平均滞在は ${w} 秒`,
      qRun: (n, seed) => `<span class="m">シミュレーション</span>：${n} 件のリクエストの到着間隔とサービス時間を乱数で生成（シード ${seed}）`,
      qRes: (w, f, peak) => `<span class="y">結果</span>：平均滞在は ${w} 秒、公式では ${f} 秒。いちばん混んだときは、システム内に同時に ${peak} 件のリクエストがいました`,
      sRhoK: '利用率 ρ', sRhoF: '<b>= λ ÷ μ</b><br>μ = 毎分 6 件（平均 10 秒に 1 件）',
      sec: n => `${n} 秒`,
      sWK: '平均滞在時間 W', sWF: '<b>= 1 ÷ (μ − λ)</b><br>待ち時間 + 自分がサービスを受ける 10 秒',
      sLK: 'システム内の平均リクエスト数 L', sLF: '<b>= λ × W</b>（リトルの法則）<br>到着率に、1 件あたりの滞在時間を掛けたもの',
      qVerdict: (rho, w, sim) => `① 利用率 ${rho}% のとき、公式による平均滞在は <b>${w} 秒</b>、シミュレーションでは <b>${sim} 秒</b> でした。<br>② 待ち時間は、利用率に比例して増えるわけではありません。50% から 80% で、滞在は 20 秒から 50 秒に伸び、95% では 200 秒です。<br>③ 満杯に近づくほど、シミュレーション結果のばらつきは大きくなります。たまに一斉に到着すると、行列をさばくのにとても時間がかかるからです。だからサービスには余裕を持たせるべきで、「ちょうど満杯」を基準に計画してはいけません。`,
      qTry: [
        '到着率を <b>3</b> から <b>4.8</b> まで上げます。利用率は 50% から 80% になり、平均滞在は 20 秒から 50 秒になります。リクエストが 6 割増えただけなのに、待ち時間は 1.5 倍も増えたことが分かります。',
        '<b>5.7</b>（95%）まで引き上げます。平均滞在は 200 秒です。曲線が 100% 近くで急に垂直に立ち上がることが分かります。',
        '80% と 95% で、それぞれ<b>シミュレーション</b>を何度か押します。80% では結果が公式にとても近く、95% では毎回かなりずれます。',
      ],
    },
  });

  const JOB_FILL = ['var(--accent)', 'var(--a2)', 'var(--a3)', 'var(--muted)', 'var(--ink)'];

  Viz.register('sched-race', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', `<div class="viz-row s-presets" style="margin:0 0 12px">${Object.keys(M.PRESETS).map(k => Viz.button(T.presets[k], 'ghost')).join('')}</div><div class="s-legend"></div>`);
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 400 236', class: 'viz-stage', role: 'img', 'aria-label': T.stage }, left);
      left.insertAdjacentHTML('beforeend', `<div class="viz-slider"><label>${T.qtLabel}</label><input type="range" min="1" max="8" value="2" aria-label="${Viz.esc(T.qtLabel)}"><output>2</output></div>
        <div class="viz-row">${Viz.button(T.bPlay)}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = ['fifo', 'sjf', 'rr'].map(p => Viz.stat({ id: 's-' + p, k: T.sK[p], v: '—', f: '' })).join('');
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const presetBtns = [...el.querySelectorAll('.s-presets .viz-btn')];
      const playBtn = left.querySelector('.viz-row .viz-btn');
      const range = $('input[type=range]');
      let preset = 'convoy', q = 2, runs = {}, busy = false;
      const POL = ['fifo', 'sjf', 'rr'];
      const color = id => JOB_FILL[(id.charCodeAt(0) - 65) % JOB_FILL.length];

      function compute() { runs = Object.fromEntries(POL.map(p => [p, M.simulate(M.PRESETS[preset], p, { quantum: q })])); }
      function legend() {
        $('.s-legend').innerHTML = Viz.legend([...M.PRESETS[preset]].sort((a, b) => a.id.localeCompare(b.id)).map(j => ({ color: color(j.id), text: T.lgArrive(j) })));
        presetBtns.forEach((b, i) => { b.className = 'viz-btn' + (Object.keys(M.PRESETS)[i] === preset ? '' : ' ghost'); });
      }
      function draw(upTo) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        const span = Math.max(...POL.map(p => runs[p].makespan)), u = 380 / span;
        POL.forEach((p, li) => {
          const y = 8 + li * 66;
          const lab = Viz.svg('text', { x: 10, y: y + 14, 'font-size': 14 }, svg);
          lab.textContent = p === 'rr' ? T.lanes.rr(q) : T.lanes[p];
          lab.setAttribute('style', 'fill:var(--ink)');
          Viz.svg('rect', { x: 10, y: y + 22, width: 380, height: 30, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
          const lim = upTo[li];
          for (const s of runs[p].segments) {
            if (s.job === null || s.start >= lim) continue;
            const end = Math.min(s.end, lim), w = (end - s.start) * u;
            Viz.svg('rect', { x: 10 + s.start * u, y: y + 22, width: Math.max(0, w - 1), height: 30, style: `fill:${color(s.job)}` }, svg);
            if (w >= 13) { const t = Viz.svg('text', { x: 10 + s.start * u + w / 2, y: y + 42, 'text-anchor': 'middle', 'font-size': 14 }, svg); t.textContent = s.job; t.setAttribute('style', 'fill:var(--paper);font-weight:700'); }
          }
        });
        const step = span > 16 ? 4 : 2;
        for (let t = 0; t <= span; t += step) {
          const x = 10 + t * u;
          Viz.svg('path', { d: `M${x} 204V210`, fill: 'none', style: 'stroke:var(--muted)' }, svg);
          const tx = Viz.svg('text', { x, y: 226, 'text-anchor': 'middle', 'font-size': 14 }, svg);
          tx.textContent = String(t);
          tx.setAttribute('style', 'fill:var(--muted)');
        }
      }
      function stats(show) {
        const best = Math.min(...POL.map(p => runs[p].avgWait));
        for (const p of POL) {
          const r = runs[p], box = $(`[data-s=s-${p}-v]`).parentElement;
          $(`[data-s=s-${p}-v]`).textContent = show[p] ? r.avgWait.toFixed(2) + ' ' + T.unit : '—';
          $(`[data-s=s-${p}-f]`).innerHTML = show[p] ? T.sF(r.avgFirst.toFixed(2), r.switches) : '';
          box.classList.toggle('hot', !!show[p] && show.rr && r.avgWait === best);
        }
      }
      function reset() {
        compute(); legend(); pipe.set(-1); draw([0, 0, 0]); stats({}); $('.viz-verdict').hidden = true;
      }
      function verdict() {
        const name = p => (p === 'rr' ? T.lanes.rr(q) : T.lanes[p]);
        const bw = POL.reduce((a, p) => (runs[p].avgWait < runs[a].avgWait ? p : a));
        const bf = POL.reduce((a, p) => (runs[p].avgFirst < runs[a].avgFirst ? p : a));
        const A = p => runs[p].jobs.find(j => j.id === 'A').wait;
        const extra = preset === 'convoy' ? T.xConvoy : preset === 'same' ? T.xSame : T.xStarve(A('fifo'), A('sjf'));
        $('.viz-verdict').innerHTML = T.verdict(name(bw), name(bf), extra);
        $('.viz-verdict').hidden = false;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn, input').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn, input').forEach(b => b.disabled = false);
      }
      playBtn.onclick = () => guard(async () => {
        reset(); term.clear();
        const upTo = [0, 0, 0], shown = {};
        for (let li = 0; li < 3; li++) {
          const p = POL[li], r = runs[p];
          pipe.set(li);
          term.log(T.start(p === 'rr' ? T.lanes.rr(q) : T.lanes[p]));
          const lens = Object.fromEntries(M.PRESETS[preset].map(j => [j.id, j.len]));
          for (const d of r.decisions) {
            const w = d.waiting.join('、');
            term.log(p === 'fifo' ? T.dFifo(d.t, d.job, w) : p === 'sjf' ? T.dSjf(d.t, d.job, lens[d.job], w) : T.dRr(d.t, d.job, w));
            const seg = r.segments.find(s => s.job === d.job && s.start <= d.t && s.end > d.t) || r.segments.find(s => s.job === d.job && s.start >= d.t);
            const target = seg ? seg.end : r.makespan;
            while (upTo[li] < target) { upTo[li] = Math.min(target, upTo[li] + 1); draw(upTo); await ctx.sleep(90); }
          }
          upTo[li] = r.makespan; draw(upTo);
          shown[p] = true; stats(shown);
          term.log(T.lEnd(p === 'rr' ? T.lanes.rr(q) : T.lanes[p], r.avgWait.toFixed(2), r.avgFirst.toFixed(2)));
          await ctx.sleep(300);
        }
        pipe.set(3); stats(shown); verdict();
      });
      presetBtns.forEach((b, i) => { b.onclick = () => { if (busy) return; preset = Object.keys(M.PRESETS)[i]; term.clear(); term.log(T.ready); reset(); }; });
      range.oninput = () => { if (busy) return; q = +range.value; $('output').textContent = String(q); reset(); };
      reset();
    },
  });

  Viz.register('queue-load', {
    mount(el, ctx) {
      const MU = 6;
      const body = Viz.frame(el, { code: T.qCode, title: T.qTitle, tag: T.qTag, intro: T.qIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.qLgCurve },
        { color: 'var(--a2)', text: T.qLgDot, glow: true },
        { color: 'var(--a3)', text: T.qLgSim },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 400 250', class: 'viz-stage', role: 'img', 'aria-label': T.qStage }, left);
      const X = rho => 56 + rho * 324, Y = w => 206 - Math.min(w, 300) / 300 * 186;
      const txt = (x, y, s, anchor, color) => { const t = Viz.svg('text', { x, y, 'font-size': 14, 'text-anchor': anchor || 'start' }, svg); t.textContent = s; t.setAttribute('style', `fill:${color || 'var(--muted)'}`); return t; };
      Viz.svg('path', { d: 'M56 20V206H382', fill: 'none', style: 'stroke:var(--muted);stroke-width:1.2' }, svg);
      for (const w of [100, 200, 300]) { Viz.svg('path', { d: `M56 ${Y(w)}H382`, fill: 'none', style: 'stroke:var(--frame);stroke-dasharray:3 4' }, svg); txt(50, Y(w) + 5, String(w), 'end'); }
      txt(50, 211, '0', 'end');
      for (const r of [0.5, 0.8, 1]) txt(X(r), 226, Math.round(r * 100) + '%', 'middle');
      txt(219, 246, T.qAxisX, 'middle');
      txt(62, 16, T.qAxisY);
      let d = '';
      for (let r = 0; r <= 0.967; r += 0.01) d += (d ? 'L' : 'M') + X(r).toFixed(1) + ' ' + Y(10 / (1 - r)).toFixed(1);
      Viz.svg('path', { d, fill: 'none', style: 'stroke:var(--accent);stroke-width:2.5' }, svg);
      const simDot = Viz.svg('circle', { cx: 0, cy: 0, r: 6, style: 'fill:var(--a3);opacity:0' }, svg);
      const dot = Viz.svg('circle', { cx: 0, cy: 0, r: 7, style: 'fill:var(--a2)' }, svg);
      const dotLabel = txt(0, 0, '', 'end', 'var(--ink)');
      left.insertAdjacentHTML('beforeend', `<div class="viz-slider"><label>${T.qLabel}</label><input type="range" min="0.6" max="5.7" step="0.3" value="3" aria-label="${Viz.esc(T.qLabel)}"><output>3.0</output></div>
        <div class="viz-row">${Viz.button(T.qSim)}</div>`);
      const term = Viz.term(left, T.qReady);
      right.innerHTML =
        Viz.stat({ id: 'q-rho', k: T.sRhoK, v: '', f: T.sRhoF }) +
        Viz.stat({ id: 'q-w', k: T.sWK, v: '', f: T.sWF, hot: true }) +
        Viz.stat({ id: 'q-l', k: T.sLK, v: '', f: T.sLF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.qTry));
      const $ = s => el.querySelector(s);
      const range = $('input[type=range]'), simBtn = left.querySelector('.viz-row .viz-btn');
      let lambda = 3, seed = 1;
      function update(log) {
        const q = M.mm1(lambda, MU), w = q.W * 60;
        $('output').textContent = lambda.toFixed(1);
        dot.setAttribute('cx', X(q.rho)); dot.setAttribute('cy', Y(w));
        dotLabel.setAttribute('x', X(q.rho) - 10); dotLabel.setAttribute('y', Y(w) - 10);
        dotLabel.textContent = Math.round(w) + ' s';
        simDot.setAttribute('style', 'fill:var(--a3);opacity:0');
        $('[data-s=q-rho-v]').textContent = Math.round(q.rho * 100) + '%';
        $('[data-s=q-w-v]').textContent = T.sec(Math.round(w));
        $('[data-s=q-l-v]').textContent = q.L.toFixed(2);
        $('.viz-verdict').hidden = true;
        if (log) term.log(T.qMove(lambda.toFixed(1), Math.round(q.rho * 100), Math.round(w)));
      }
      range.oninput = () => { lambda = +range.value; update(false); };
      range.onchange = () => update(true);
      simBtn.onclick = async () => {
        simBtn.disabled = true;
        const n = 20000, s = seed++;
        term.log(T.qRun(Viz.fmt(n), s));
        try { await ctx.sleep(120); } catch (e) { if (!ctx.alive) return; throw e; }
        const q = M.mm1(lambda, MU), r = M.simulateMM1(lambda, MU, n, s), w = r.W * 60;
        simDot.setAttribute('cx', X(q.rho)); simDot.setAttribute('cy', Y(w));
        simDot.setAttribute('style', 'fill:var(--a3);opacity:1');
        term.log(T.qRes(Math.round(w), Math.round(q.W * 60), r.maxInSystem));
        $('.viz-verdict').innerHTML = T.qVerdict(Math.round(q.rho * 100), Math.round(q.W * 60), Math.round(w));
        $('.viz-verdict').hidden = false;
        simBtn.disabled = false;
      };
      update(false);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
