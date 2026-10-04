/* Chapter 16 widget: chunked prompt reading, with and without copy/compute overlap.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.prefill;
  const W_MS = 600, U_MS = 0.4;                       // teaching assumptions, stated in the intro
  const NS = [1024, 4096, 32768], CS = [1, 16, 64, 256, 1024, 2048, 4096, 8192];

  const T = Viz.t({
    zh: {
      code: 'PREFILL_CHUNKS', title: '读题切多大块', tag: '教学推演 · W 与 u 为假设值',
      intro: '读题时所有 token 都已知，可以一块一起算。教学模型：每块都要把权重和专家送一遍，用时 <b>W = 600 ms</b>；每个 token 的计算要 <b>u = 0.4 ms</b>。拖动块大小 C，按 <b>播放</b> 看前 3 块怎样排队。',
      lgCopy: '搬运这一层的权重和专家', lgComp: '这一层整块一起算', lgPick: '当前选中的块大小',
      steps: ['切成块', '搬运权重', '整块计算', '交接状态', '下一块'],
      ganttLabel: '前 3 块的时间线', barsLabel: '不同块大小下的读题速度', axis: '块大小 C（柱上数字：token/s）',
      lanes: ['搬运', '计算'], chunk: (i) => `第 ${i} 块`,
      nLabel: '提示词长度 N', cLabel: '每块 token 数 C',
      bPlay: '▶ 播放', bOverlap: (on) => on ? '流水线：开' : '流水线：关', bReset: '重置',
      ready: '<span class="c">$</span> ready. 先拖 C，再按 [ ▶ 播放 ]',
      sChunksK: '要切几块', sChunksF: (n, c) => `<b>= ⌈${n} ÷ ${c}⌉</b><br>最后一块可能不满`,
      sTimeK: '每块用时', sTimeF: (on, c) => on ? `<b>≈ max(W, C × u) + 零头</b><br>48 层排成流水线，C × u = ${c} ms` : `<b>= W + C × u</b><br>先搬后算，C × u = ${c} ms`,
      sRateK: '读题速度', sRateF: (n, s) => `<b>= ${n} 个 token ÷ ${s} 秒</b><br>同一模型下，越接近 1 ÷ u = 2,500 越好`,
      perSec: (x) => `${x} token/s`, ms: (x) => `${x} ms`,
      tChange: (n, c, k, cu, rate) => `<span class="c">C = ${c}</span>：${n} 个 token 切成 ${k} 块；每块计算 ${c} × 0.4 = ${cu} ms，搬运 600 ms → 约 ${rate} token/s`,
      tOverlap: (on) => on ? '<span class="y">// 流水线打开：第 l 层计算时，第 l+1 层的数据已经在路上</span>' : '<span class="y">// 流水线关闭：每一层都先搬完再算，两件事轮流做</span>',
      t0: '<span class="m">切块</span>：按 C 把提示词切开，一块一块送进 48 层',
      t1: (i) => `<span class="c">第 ${i} 块</span>：搬运和计算按层进行（时间线上的条纹就是 48 层）`,
      t3: (i) => `<span class="w">交接</span>：第 ${i} 块的 KV、递推状态留给下一块接着用`,
      tEnd: (sec, rate) => `<span class="y">完成</span>：全部读完约 ${sec} 秒，平均 ${rate} token/s`,
      vSmall: (c, be) => `① C = ${c} 时，每块算得太快，大部分时间花在<b>搬运</b>上：权重读一次，只服务 ${c} 个 token。<br>② 当 C × u 追上 W（这里 C ≈ ${be}），搬运才被计算盖住。<br>③ 这也是 Strata 读题时把块开到 8,192 个 token 的原因之一。`,
      vBig: (c, be) => `① C = ${c} 已超过平衡点 ${be}：计算时间盖住了搬运，速度接近上限 1 ÷ u。<br>② 再加大 C 收益很小，却要更多临时显存。Strata 的块缓冲是从专家缓存“借”来的，借多了，热门专家就得让位。<br>③ 所以块大小要在“摊薄搬运”和“占用显存”之间取舍。`,
      vNoOverlap: '<br>④ 流水线现在是关的：把它打开再播放一次，同样的 C 会更快，因为下一层的数据在上一层计算时就开始搬了。',
      bCode: 'BATCH_REUSE', bTitle: '一起算省多少', bTag: '上游默认表 · spec/controller.hpp',
      bIntro: '同一份权重，读一遍可以只算 1 个 token，也可以顺手算 n 个。拖动 <b>n</b>，看稠密部分的耗时怎样变。数字是 Strata 投机控制器里的默认表，注释说来自上游的矩阵向量乘测量。',
      bLgOne: '一个个算：n 倍时间', bLgBatch: '一起算：上游实测的倍数', bLgTok: '一个 token',
      bStage: '一个个算与一起算的耗时对比', bRowOne: '一个个算', bRowBatch: '一起算', bWeights: '读一遍权重，供这 n 个 token 共用',
      bNLabel: '一起算的 token 数 n', bTimes: (x) => `${x} 倍`,
      bSK1: '一起算的耗时', bSF1: (n) => `<b>= 上游默认表第 ${n} 项</b><br>以单个 token 的耗时为 1`,
      bSK2: '平均每个 token', bSF2: (n) => `<b>= 一起算的耗时 ÷ ${n}</b><br>越小，权重复用越充分`,
      bSK3: '比一个个算省下', bSF3: '<b>= 1 − 平均每个 token</b><br>省下的主要是重复读权重的时间',
      bLog: (n, r, per) => `<span class="c">n = ${n}</span>：一起算 ${r} 倍时间，平均每个 token ${per}；一个个算要 ${n} 倍`,
      bVerdict: (n, per, saved) => `n = ${n} 时，平均每个 token 只花单独算时的 <b>${per}</b>，省下 ${saved}。读题时 n 可以是几千，所以读题比写答案快得多；写答案时只有投机解码的验证窗口能凑出几个 token 一起算（第 18 章）。`,
      bTry: [
        '把 <b>n</b> 从 1 拉到 2：耗时只多 5%，第二个 token 几乎是“白送”的。',
        '拉到 4、再到 8，盯住“平均每个 token”：它先快速下降，到 4 个左右就基本走平了。n 再大，计算量本身开始占上风，复用的好处不再增长。',
        '对照第 18 章：验证窗口最多 8 行，这张表正是投机控制器决定“猜几个”时用到的成本表之一。',
      ],
      try: [
        '把 <b>C</b> 从 1 拉到 8192，看下面的柱子：一开始几乎线性上涨，到 2048 附近就平了。上涨段是“权重读一次、服务更多 token”，平台段是算力上限。',
        '选 C = 1024，按 <b>流水线</b> 开关各播放一次：关的时候“搬运”和“计算”两条轮流亮；开的时候它们重叠，每块少用约 40% 的时间。',
        '把 N 换成 1024，再把 C 调到 8192：只有一块，块再大也没用。Strata 也只按提示词实际需要的大小去借显存。',
      ],
    },
    en: {
      code: 'PREFILL_CHUNKS', title: 'How big a prefill chunk?', tag: 'Teaching estimate · W and u are assumed',
      intro: 'During prefill every token is already known, so a whole chunk can be computed together. Teaching model: each chunk must bring the weights and experts in once, which takes <b>W = 600 ms</b>; each token needs <b>u = 0.4 ms</b> of compute. Drag the chunk size C, then press <b>Play</b> to watch how the first 3 chunks line up.',
      lgCopy: 'Moving this layer\'s weights and experts', lgComp: 'Computing this layer for the whole chunk', lgPick: 'The chunk size you picked',
      steps: ['Cut into chunks', 'Move weights', 'Compute chunk', 'Hand off state', 'Next chunk'],
      ganttLabel: 'Timeline of the first 3 chunks', barsLabel: 'Prefill speed for each chunk size', axis: 'Chunk size C (bar labels: tokens/s)',
      lanes: ['Copy', 'Calc'], chunk: (i) => `Chunk ${i}`,
      nLabel: 'Prompt length N', cLabel: 'Tokens per chunk C',
      bPlay: '▶ Play', bOverlap: (on) => on ? 'Pipeline: on' : 'Pipeline: off', bReset: 'Reset',
      ready: '<span class="c">$</span> ready. Drag C first, then press [ ▶ Play ]',
      sChunksK: 'Number of chunks', sChunksF: (n, c) => `<b>= ⌈${n} ÷ ${c}⌉</b><br>the last chunk may not be full`,
      sTimeK: 'Time per chunk', sTimeF: (on, c) => on ? `<b>≈ max(W, C × u) + a remainder</b><br>48 layers in a pipeline, C × u = ${c} ms` : `<b>= W + C × u</b><br>move first, then compute; C × u = ${c} ms`,
      sRateK: 'Prefill speed', sRateF: (n, s) => `<b>= ${n} tokens ÷ ${s} s</b><br>for one model, the closer to 1 ÷ u = 2,500 the better`,
      perSec: (x) => `${x} tokens/s`, ms: (x) => `${x} ms`,
      tChange: (n, c, k, cu, rate) => `<span class="c">C = ${c}</span>: ${n} tokens cut into ${k} chunks; each chunk computes for ${c} × 0.4 = ${cu} ms and moves for 600 ms → about ${rate} tokens/s`,
      tOverlap: (on) => on ? '<span class="y">// pipeline on: while layer l computes, layer l+1\'s data is already on its way</span>' : '<span class="y">// pipeline off: each layer finishes moving before it computes; the two take turns</span>',
      t0: '<span class="m">Cut</span>: the prompt is cut into chunks of C and fed through the 48 layers one chunk at a time',
      t1: (i) => `<span class="c">Chunk ${i}</span>: moving and computing go layer by layer (the stripes on the timeline are the 48 layers)`,
      t3: (i) => `<span class="w">Handoff</span>: chunk ${i}'s KV and recurrent state are kept for the next chunk to build on`,
      tEnd: (sec, rate) => `<span class="y">Done</span>: the whole prompt took about ${sec} s, ${rate} tokens/s on average`,
      vSmall: (c, be) => `① At C = ${c}, each chunk computes so fast that most of the time goes into <b>moving</b>: one read of the weights serves only ${c} tokens.<br>② Only when C × u catches up with W (here C ≈ ${be}) does the compute hide the moving.<br>③ That is one reason Strata reads the prompt in chunks of up to 8,192 tokens.`,
      vBig: (c, be) => `① C = ${c} is past the break-even point of ${be}: the compute time hides the moving, and the speed nears the ceiling of 1 ÷ u.<br>② A bigger C gains very little but needs more temporary VRAM. Strata's chunk buffer is "borrowed" from the expert cache; borrow too much and the hot experts must make room.<br>③ So the chunk size is a trade-off between "spreading the moving cost thin" and "taking up VRAM".`,
      vNoOverlap: '<br>④ The pipeline is off right now. Switch it on and play again: the same C gets faster, because the next layer\'s data starts moving while the previous layer computes.',
      bCode: 'BATCH_REUSE', bTitle: 'How much batching saves', bTag: 'Upstream default table · spec/controller.hpp',
      bIntro: 'One read of the weights can serve 1 token, or n tokens at no extra reading cost. Drag <b>n</b> and watch how the time of the dense part changes. The numbers are the default table in Strata\'s speculative controller; its comment says they come from upstream matrix-vector measurements.',
      bLgOne: 'One by one: n times the time', bLgBatch: 'Together: the upstream measured ratio', bLgTok: 'One token',
      bStage: 'Time of one-by-one vs batched computation', bRowOne: 'Separate', bRowBatch: 'Batched', bWeights: 'One read of the weights, shared by these n tokens',
      bNLabel: 'Tokens computed together (n)', bTimes: (x) => `${x}×`,
      bSK1: 'Time for the batch', bSF1: (n) => `<b>= entry ${n} of the upstream default table</b><br>with one token's time as 1`,
      bSK2: 'Average per token', bSF2: (n) => `<b>= batch time ÷ ${n}</b><br>smaller means better weight reuse`,
      bSK3: 'Saved vs one by one', bSF3: '<b>= 1 − average per token</b><br>mostly the time of reading the weights again and again',
      bLog: (n, r, per) => `<span class="c">n = ${n}</span>: together takes ${r}× the time, ${per} per token on average; one by one takes ${n}×`,
      bVerdict: (n, per, saved) => `At n = ${n}, each token costs on average only <b>${per}</b> of computing it alone, saving ${saved}. During prefill n can be in the thousands, so prefill is much faster than decode; during decode only the verification window of speculative decoding can gather a few tokens to compute together (Chapter 18).`,
      bTry: [
        'Drag <b>n</b> from 1 to 2: the time grows by only 5%, so the second token is almost "free".',
        'Go to 4, then 8, and watch "Average per token": it drops fast at first and is nearly flat by about 4. Past that, the compute itself starts to dominate and the benefit of reuse stops growing.',
        'Compare with Chapter 18: the verification window holds at most 8 rows, and this table is one of the cost tables the speculative controller uses to decide "how many to guess".',
      ],
      try: [
        'Drag <b>C</b> from 1 to 8192 and watch the bars below: they rise almost linearly at first and flatten out around 2048. The rising part is "one read of the weights serves more tokens"; the plateau is the compute ceiling.',
        'Pick C = 1024 and play once with the <b>Pipeline</b> switch on and once with it off. Off, the "Copy" and "Calc" lanes light up in turn; on, they overlap and each chunk takes about 40% less time.',
        'Set N to 1024, then C to 8192: there is only one chunk, so a bigger chunk does nothing. Strata, too, borrows only as much VRAM as the prompt actually needs.',
      ],
    },
    ko: {
      code: 'PREFILL_CHUNKS', title: '프리필 청크는 얼마나 크게?', tag: '교육용 추정 · W와 u는 가정값',
      intro: '문제를 읽을 때는 토큰이 전부 이미 정해져 있어서 한 청크를 한꺼번에 계산할 수 있어요. 교육용 모델: 청크마다 가중치와 전문가를 한 번씩 옮겨야 하고, 이 단계에 <b>W = 600 ms</b>가 들어요. 토큰 하나를 계산하는 데는 <b>u = 0.4 ms</b>가 들어요. 청크 크기 C를 끌어 보고, <b>재생</b>을 눌러 처음 3개 청크가 어떻게 줄 서는지 보세요.',
      lgCopy: '이 층의 가중치와 전문가 옮기기', lgComp: '이 층을 청크 전체로 한꺼번에 계산', lgPick: '지금 고른 청크 크기',
      steps: ['청크로 자르기', '가중치 옮기기', '청크 계산', '상태 인계', '다음 청크'],
      ganttLabel: '처음 3개 청크의 타임라인', barsLabel: '청크 크기별 프리필 속도', axis: '청크 크기 C (막대 위 숫자: token/s)',
      lanes: ['이동', '계산'], chunk: (i) => `청크 ${i}`,
      nLabel: '프롬프트 길이 N', cLabel: '청크당 토큰 수 C',
      bPlay: '▶ 재생', bOverlap: (on) => on ? '파이프라인: 켬' : '파이프라인: 끔', bReset: '초기화',
      ready: '<span class="c">$</span> ready. 먼저 C를 끌고, [ ▶ 재생 ]을 누르세요',
      sChunksK: '청크 개수', sChunksF: (n, c) => `<b>= ⌈${n} ÷ ${c}⌉</b><br>마지막 청크는 덜 찰 수 있어요`,
      sTimeK: '청크당 시간', sTimeF: (on, c) => on ? `<b>≈ max(W, C × u) + 나머지</b><br>48개 층이 파이프라인으로 이어져요. C × u = ${c} ms` : `<b>= W + C × u</b><br>옮기고 나서 계산해요. C × u = ${c} ms`,
      sRateK: '프리필 속도', sRateF: (n, s) => `<b>= 토큰 ${n}개 ÷ ${s}초</b><br>같은 모델이면 1 ÷ u = 2,500에 가까울수록 좋아요`,
      perSec: (x) => `${x} token/s`, ms: (x) => `${x} ms`,
      tChange: (n, c, k, cu, rate) => `<span class="c">C = ${c}</span>: 토큰 ${n}개를 청크 ${k}개로 나눠요. 청크마다 계산은 ${c} × 0.4 = ${cu} ms, 이동은 600 ms → 약 ${rate} token/s`,
      tOverlap: (on) => on ? '<span class="y">// 파이프라인 켬: l번째 층이 계산하는 동안 l+1번째 층의 데이터는 이미 오는 중이에요</span>' : '<span class="y">// 파이프라인 끔: 층마다 먼저 옮기고 나서 계산해요. 두 일이 번갈아 진행돼요</span>',
      t0: '<span class="m">청크 나누기</span>: C 단위로 프롬프트를 잘라 청크를 하나씩 48개 층에 넣어요',
      t1: (i) => `<span class="c">청크 ${i}</span>: 이동과 계산이 층 단위로 진행돼요(타임라인의 줄무늬가 48개 층이에요)`,
      t3: (i) => `<span class="w">인계</span>: 청크 ${i}의 KV와 재귀 상태를 다음 청크가 이어서 써요`,
      tEnd: (sec, rate) => `<span class="y">완료</span>: 전부 읽는 데 약 ${sec}초, 평균 ${rate} token/s`,
      vSmall: (c, be) => `① C = ${c}일 때는 청크마다 계산이 너무 빨리 끝나서, 시간 대부분이 <b>이동</b>에 들어가요. 가중치를 한 번 읽어도 토큰 ${c}개만 도와줘요.<br>② C × u가 W를 따라잡아야(여기서는 C ≈ ${be}) 이동이 계산 뒤로 가려져요.<br>③ Strata가 문제를 읽을 때 청크를 토큰 8,192개까지 키우는 이유 중 하나예요.`,
      vBig: (c, be) => `① C = ${c}는 균형점 ${be}를 넘었어요. 계산 시간이 이동을 가리고, 속도가 상한 1 ÷ u에 가까워져요.<br>② C를 더 키워도 얻는 게 아주 적은데, 임시 VRAM은 더 필요해요. Strata의 청크 버퍼는 전문가 캐시에서 "빌려" 오기 때문에, 많이 빌리면 인기 전문가가 자리를 내줘야 해요.<br>③ 그래서 청크 크기는 "이동 비용을 나눠 갖기"와 "VRAM 차지하기" 사이의 트레이드오프예요.`,
      vNoOverlap: '<br>④ 지금은 파이프라인이 꺼져 있어요. 켜고 다시 재생해 보세요. 같은 C인데 더 빨라져요. 이전 층이 계산하는 동안 다음 층의 데이터를 옮기기 시작하기 때문이에요.',
      bCode: 'BATCH_REUSE', bTitle: '함께 계산하면 얼마나 아낄까', bTag: '업스트림 기본 표 · spec/controller.hpp',
      bIntro: '같은 가중치를 한 번 읽어서 토큰 1개만 계산할 수도 있고, 덤으로 n개를 계산할 수도 있어요. <b>n</b>을 끌어서 밀집 부분의 시간이 어떻게 변하는지 보세요. 숫자는 Strata 추측 컨트롤러의 기본 표예요. 주석에 따르면 업스트림의 행렬-벡터 곱 측정에서 나왔어요.',
      bLgOne: '하나씩 계산: n배 시간', bLgBatch: '함께 계산: 업스트림 실측 배수', bLgTok: '토큰 1개',
      bStage: '하나씩 계산할 때와 함께 계산할 때의 시간 비교', bRowOne: '하나씩 계산', bRowBatch: '함께 계산', bWeights: '가중치를 한 번 읽어서 이 n개 토큰이 함께 써요',
      bNLabel: '함께 계산하는 토큰 수 n', bTimes: (x) => `${x}배`,
      bSK1: '함께 계산하는 시간', bSF1: (n) => `<b>= 업스트림 기본 표의 ${n}번째 항목</b><br>토큰 1개의 시간을 1로 놓아요`,
      bSK2: '토큰당 평균', bSF2: (n) => `<b>= 함께 계산하는 시간 ÷ ${n}</b><br>작을수록 가중치를 잘 재사용한 거예요`,
      bSK3: '하나씩 계산보다 절약', bSF3: '<b>= 1 − 토큰당 평균</b><br>아낀 것은 주로 가중치를 반복해서 읽는 시간이에요',
      bLog: (n, r, per) => `<span class="c">n = ${n}</span>: 함께 계산하면 ${r}배 시간, 토큰당 평균 ${per}. 하나씩 계산하면 ${n}배가 들어요`,
      bVerdict: (n, per, saved) => `n = ${n}일 때 토큰당 평균은 혼자 계산할 때의 <b>${per}</b>만 들고, ${saved}를 아껴요. 문제를 읽을 때는 n이 수천이 될 수 있어서 읽기가 쓰기보다 훨씬 빨라요. 답을 쓸 때는 추측 디코딩의 검증 윈도우만 토큰 몇 개를 모아서 함께 계산할 수 있어요(18장).`,
      bTry: [
        '<b>n</b>을 1에서 2로 끌어 보세요. 시간이 5%만 늘어서, 두 번째 토큰은 거의 "공짜"예요.',
        '4, 그다음 8까지 끌면서 "토큰당 평균"을 지켜보세요. 처음에는 빠르게 내려가다가 4개쯤에서 거의 평평해져요. n이 더 커지면 계산량 자체가 우세해져서, 재사용의 이점이 더는 늘지 않아요.',
        '18장과 비교해 보세요. 검증 윈도우는 최대 8줄이고, 이 표가 바로 추측 컨트롤러가 "몇 개를 추측할지" 정할 때 쓰는 비용표 중 하나예요.',
      ],
      try: [
        '<b>C</b>를 1에서 8192까지 끌면서 아래 막대를 보세요. 처음에는 거의 선형으로 오르다가 2048 근처에서 평평해져요. 오르는 구간은 "가중치를 한 번 읽어서 더 많은 토큰을 돕는" 구간이고, 평평한 구간은 연산 능력의 상한이에요.',
        'C = 1024를 고르고 <b>파이프라인</b> 스위치를 켠 채, 그리고 끈 채로 한 번씩 재생해 보세요. 끄면 "이동"과 "계산" 두 줄이 번갈아 켜지고, 켜면 두 줄이 겹쳐서 청크당 약 40% 시간이 줄어요.',
        'N을 1024로 바꾸고 C를 8192로 올려 보세요. 청크가 하나뿐이라서 아무리 키워도 소용없어요. Strata도 프롬프트가 실제로 필요한 크기만큼만 VRAM을 빌려요.',
      ],
    },
    ja: {
      code: 'PREFILL_CHUNKS', title: 'プリフィルのチャンクはどれくらいの大きさ？', tag: '教育用の試算 · W と u は仮定値',
      intro: 'プリフィルでは token がすべて分かっているので、ひとかたまりをまとめて計算できます。教育用モデル：1 チャンクごとに、重みとエキスパートを 1 回運ぶ必要があり、<b>W = 600 ms</b> かかります。token 1 つの計算は <b>u = 0.4 ms</b> です。チャンクサイズ C を動かし、<b>再生</b>を押して、最初の 3 チャンクがどう並ぶかを見ましょう。',
      lgCopy: 'この層の重みとエキスパートを転送', lgComp: 'この層をチャンク全体でまとめて計算', lgPick: '選んだチャンクサイズ',
      steps: ['チャンクに切る', '重みを転送', 'チャンクを計算', '状態を引き継ぐ', '次のチャンク'],
      ganttLabel: '最初の 3 チャンクのタイムライン', barsLabel: 'チャンクサイズ別のプリフィル速度', axis: 'チャンクサイズ C（棒の上の数字：token/s）',
      lanes: ['転送', '計算'], chunk: (i) => `チャンク ${i}`,
      nLabel: 'プロンプトの長さ N', cLabel: '1 チャンクの token 数 C',
      bPlay: '▶ 再生', bOverlap: (on) => on ? 'パイプライン：オン' : 'パイプライン：オフ', bReset: 'リセット',
      ready: '<span class="c">$</span> ready. まず C を動かし、[ ▶ 再生 ] を押してください',
      sChunksK: 'チャンクの数', sChunksF: (n, c) => `<b>= ⌈${n} ÷ ${c}⌉</b><br>最後のチャンクは埋まらないことがあります`,
      sTimeK: '1 チャンクの時間', sTimeF: (on, c) => on ? `<b>≈ max(W, C × u) + 端数</b><br>48 層をパイプラインで流す。C × u = ${c} ms` : `<b>= W + C × u</b><br>運んでから計算。C × u = ${c} ms`,
      sRateK: 'プリフィル速度', sRateF: (n, s) => `<b>= ${n} token ÷ ${s} 秒</b><br>同じモデルなら、1 ÷ u = 2,500 に近いほどよい`,
      perSec: (x) => `${x} token/s`, ms: (x) => `${x} ms`,
      tChange: (n, c, k, cu, rate) => `<span class="c">C = ${c}</span>：${n} token を ${k} チャンクに分割。1 チャンクの計算は ${c} × 0.4 = ${cu} ms、転送は 600 ms → 約 ${rate} token/s`,
      tOverlap: (on) => on ? '<span class="y">// パイプラインがオン：層 l を計算している間に、層 l+1 のデータはもう道中にいる</span>' : '<span class="y">// パイプラインがオフ：各層は運び終えてから計算する。2 つの作業は交互に進む</span>',
      t0: '<span class="m">分割</span>：プロンプトを C ごとに切り、1 チャンクずつ 48 層に送り込む',
      t1: (i) => `<span class="c">チャンク ${i}</span>：転送と計算が層ごとに進む（タイムラインの縞模様が 48 層）`,
      t3: (i) => `<span class="w">引き継ぎ</span>：チャンク ${i} の KV と再帰状態を、次のチャンクが続けて使えるように残す`,
      tEnd: (sec, rate) => `<span class="y">完了</span>：全部読み終えるのに約 ${sec} 秒、平均 ${rate} token/s`,
      vSmall: (c, be) => `① C = ${c} では、各チャンクの計算が速すぎて、時間の大半が<b>転送</b>に消えます。重みを 1 回読んでも、役に立つのは ${c} token だけです。<br>② C × u が W に追いつく（ここでは C ≈ ${be}）と、やっと転送が計算に隠れます。<br>③ これが、Strata がプリフィルでチャンクを 8,192 token まで広げる理由の 1 つです。`,
      vBig: (c, be) => `① C = ${c} は損益分岐点 ${be} を超えています。計算時間が転送を隠し、速度は上限 1 ÷ u に近づきます。<br>② C をさらに大きくしても得られるものは小さく、一時的な VRAM は余計に必要です。Strata のチャンクバッファはエキスパートキャッシュから「借りる」ものです。借りすぎると、人気のエキスパートが場所を譲ることになります。<br>③ だからチャンクサイズは、「転送コストを薄める」ことと「VRAM を使う」ことのトレードオフです。`,
      vNoOverlap: '<br>④ いまパイプラインはオフです。オンにしてもう一度再生してください。同じ C でも速くなります。前の層を計算している間に、次の層のデータの転送が始まるからです。',
      bCode: 'BATCH_REUSE', bTitle: 'まとめて計算するといくら得か', bTag: '上流の既定表 · spec/controller.hpp',
      bIntro: '同じ重みを 1 回読んで、1 token だけ計算することも、ついでに n token 計算することもできます。<b>n</b> を動かして、密な部分の時間がどう変わるかを見ましょう。数字は Strata の投機コントローラにある既定表です。コメントによると、上流の行列ベクトル積の測定に由来します。',
      bLgOne: '1 個ずつ：n 倍の時間', bLgBatch: 'まとめて：上流の実測倍率', bLgTok: '1 token',
      bStage: '1 個ずつ計算する場合とまとめて計算する場合の時間比較', bRowOne: '1 個ずつ', bRowBatch: 'まとめて', bWeights: '重みを 1 回読み、この n token で共用',
      bNLabel: 'まとめて計算する token 数 n', bTimes: (x) => `${x} 倍`,
      bSK1: 'まとめて計算する時間', bSF1: (n) => `<b>= 上流の既定表の第 ${n} 項</b><br>1 token の時間を 1 とする`,
      bSK2: '1 token あたりの平均', bSF2: (n) => `<b>= まとめて計算する時間 ÷ ${n}</b><br>小さいほど、重みをよく再利用できている`,
      bSK3: '1 個ずつより節約', bSF3: '<b>= 1 − 1 token あたりの平均</b><br>節約できるのは、主に重みを何度も読む時間',
      bLog: (n, r, per) => `<span class="c">n = ${n}</span>：まとめると ${r} 倍の時間、1 token あたり平均 ${per}。1 個ずつなら ${n} 倍`,
      bVerdict: (n, per, saved) => `n = ${n} のとき、1 token あたり平均でかかるのは、単独で計算した場合の <b>${per}</b> だけです。${saved} の節約になります。プリフィルでは n が数千になることもあるので、プリフィルはデコードよりずっと速くなります。デコードでは、投機的デコーディングの検証ウィンドウだけが、数個の token をまとめて計算できます（第 18 章）。`,
      bTry: [
        '<b>n</b> を 1 から 2 に動かします。時間は 5% しか増えず、2 つ目の token はほとんど「おまけ」です。',
        '4、そして 8 まで動かして、「1 token あたりの平均」に注目します。最初は急に下がり、4 個あたりでほぼ横ばいになります。n がそれより大きくなると、計算そのものが主役になり、再利用の効果はもう伸びません。',
        '第 18 章と見比べましょう。検証ウィンドウは最大 8 行です。この表は、投機コントローラが「何個推測するか」を決めるときに使うコスト表の 1 つです。',
      ],
      try: [
        '<b>C</b> を 1 から 8192 まで動かして、下の棒を見ます。最初はほぼ直線的に上がり、2048 付近で頭打ちになります。上がる部分は「重みを 1 回読んで、より多くの token の役に立つ」部分です。平らな部分が演算性能の上限です。',
        'C = 1024 を選び、<b>パイプライン</b>のスイッチをオンとオフで 1 回ずつ再生します。オフでは「転送」と「計算」の 2 本が交互に光ります。オンでは重なり、1 チャンクあたり約 40% 時間が減ります。',
        'N を 1024 にして、C を 8192 にします。チャンクは 1 つだけなので、いくら大きくしても効果はありません。Strata も、プロンプトが実際に必要とする大きさの VRAM しか借りません。',
      ],
    },
    es: {
      code: 'PREFILL_CHUNKS', title: '¿Qué tan grande debe ser un chunk de prefill?', tag: 'Estimación didáctica · W y u son supuestos',
      intro: 'Durante el prefill todos los tokens ya se conocen, así que un chunk entero puede calcularse junto. Modelo didáctico: cada chunk debe traer los pesos y los expertos una vez, y eso toma <b>W = 600 ms</b>; cada token necesita <b>u = 0,4 ms</b> de cálculo. Arrastra el tamaño de chunk C y pulsa <b>Reproducir</b> para ver cómo se alinean los 3 primeros chunks.',
      lgCopy: 'Mover los pesos y los expertos de esta capa', lgComp: 'Calcular esta capa para todo el chunk', lgPick: 'El tamaño de chunk que elegiste',
      steps: ['Cortar en chunks', 'Mover pesos', 'Calcular el chunk', 'Entregar el estado', 'Chunk siguiente'],
      ganttLabel: 'Línea de tiempo de los 3 primeros chunks', barsLabel: 'Velocidad de prefill según el tamaño del chunk', axis: 'Tamaño de chunk C (números sobre las barras: tokens/s)',
      lanes: ['Copia', 'Cálculo'], chunk: (i) => `Chunk ${i}`,
      nLabel: 'Longitud del prompt N', cLabel: 'Tokens por chunk C',
      bPlay: '▶ Reproducir', bOverlap: (on) => on ? 'Pipeline: activado' : 'Pipeline: desactivado', bReset: 'Reiniciar',
      ready: '<span class="c">$</span> ready. Primero arrastra C y luego pulsa [ ▶ Reproducir ]',
      sChunksK: 'Número de chunks', sChunksF: (n, c) => `<b>= ⌈${n} ÷ ${c}⌉</b><br>el último chunk puede no estar lleno`,
      sTimeK: 'Tiempo por chunk', sTimeF: (on, c) => on ? `<b>≈ max(W, C × u) + un resto</b><br>48 capas en pipeline, C × u = ${c} ms` : `<b>= W + C × u</b><br>primero mover, luego calcular; C × u = ${c} ms`,
      sRateK: 'Velocidad de prefill', sRateF: (n, s) => `<b>= ${n} tokens ÷ ${s} s</b><br>para un modelo dado, cuanto más cerca de 1 ÷ u = 2.500, mejor`,
      perSec: (x) => `${x} tokens/s`, ms: (x) => `${x} ms`,
      tChange: (n, c, k, cu, rate) => `<span class="c">C = ${c}</span>: ${n} tokens cortados en ${k} chunks; cada chunk calcula ${c} × 0,4 = ${cu} ms y mueve durante 600 ms → unos ${rate} tokens/s`,
      tOverlap: (on) => on ? '<span class="y">// pipeline activado: mientras la capa l calcula, los datos de la capa l+1 ya van en camino</span>' : '<span class="y">// pipeline desactivado: cada capa termina de mover antes de calcular; las dos tareas se turnan</span>',
      t0: '<span class="m">Cortar</span>: el prompt se corta en chunks de C y se pasa por las 48 capas un chunk cada vez',
      t1: (i) => `<span class="c">Chunk ${i}</span>: mover y calcular avanzan capa por capa (las franjas de la línea de tiempo son las 48 capas)`,
      t3: (i) => `<span class="w">Entrega</span>: la KV y el estado recurrente del chunk ${i} se conservan para que el siguiente construya sobre ellos`,
      tEnd: (sec, rate) => `<span class="y">Listo</span>: el prompt completo tomó unos ${sec} s, ${rate} tokens/s de promedio`,
      vSmall: (c, be) => `① Con C = ${c}, cada chunk se calcula tan rápido que casi todo el tiempo se va en <b>mover</b>: una lectura de los pesos sirve solo a ${c} tokens.<br>② Solo cuando C × u alcanza a W (aquí C ≈ ${be}) el cálculo oculta el movimiento.<br>③ Esa es una de las razones por las que Strata lee el prompt en chunks de hasta 8.192 tokens.`,
      vBig: (c, be) => `① C = ${c} ya pasó el punto de equilibrio de ${be}: el tiempo de cálculo oculta el movimiento, y la velocidad se acerca al techo de 1 ÷ u.<br>② Un C mayor gana muy poco pero necesita más VRAM temporal. El búfer de chunk de Strata se «toma prestado» de la caché de expertos; si prestas demasiado, los expertos calientes tienen que hacerle sitio.<br>③ Así que el tamaño del chunk es un equilibrio entre «repartir el costo del movimiento» y «ocupar VRAM».`,
      vNoOverlap: '<br>④ Ahora mismo el pipeline está desactivado. Actívalo y reproduce otra vez: el mismo C va más rápido, porque los datos de la capa siguiente empiezan a moverse mientras la anterior calcula.',
      bCode: 'BATCH_REUSE', bTitle: 'Cuánto ahorra el batching', bTag: 'Tabla por defecto de upstream · spec/controller.hpp',
      bIntro: 'Una lectura de los pesos puede servir a 1 token, o a n tokens sin costo extra de lectura. Arrastra <b>n</b> y mira cómo cambia el tiempo de la parte densa. Los números son la tabla por defecto del controlador especulativo de Strata; su comentario dice que vienen de mediciones matriz-vector de upstream.',
      bLgOne: 'Uno por uno: n veces el tiempo', bLgBatch: 'Juntos: la razón medida por upstream', bLgTok: 'Un token',
      bStage: 'Tiempo del cálculo uno por uno frente al cálculo por lotes', bRowOne: 'Por separado', bRowBatch: 'Por lotes', bWeights: 'Una lectura de los pesos, compartida por estos n tokens',
      bNLabel: 'Tokens calculados juntos (n)', bTimes: (x) => `${x}×`,
      bSK1: 'Tiempo del lote', bSF1: (n) => `<b>= entrada ${n} de la tabla por defecto de upstream</b><br>con el tiempo de un token como 1`,
      bSK2: 'Promedio por token', bSF2: (n) => `<b>= tiempo del lote ÷ ${n}</b><br>menor significa mejor reutilización de los pesos`,
      bSK3: 'Ahorro frente a uno por uno', bSF3: '<b>= 1 − promedio por token</b><br>sobre todo el tiempo de leer los pesos una y otra vez',
      bLog: (n, r, per) => `<span class="c">n = ${n}</span>: juntos toman ${r}× el tiempo, ${per} por token en promedio; uno por uno toma ${n}×`,
      bVerdict: (n, per, saved) => `Con n = ${n}, cada token cuesta en promedio solo <b>${per}</b> de lo que costaría calcularlo solo, un ahorro de ${saved}. Durante el prefill n puede ser de miles, por eso el prefill es mucho más rápido que el decode; durante el decode solo la ventana de verificación de la decodificación especulativa puede juntar unos pocos tokens para calcularlos juntos (capítulo 18).`,
      bTry: [
        'Arrastra <b>n</b> de 1 a 2: el tiempo crece solo un 5%, así que el segundo token es casi «gratis».',
        'Ve a 4 y luego a 8, y mira «Promedio por token»: baja rápido al principio y está casi plano hacia 4. Pasado eso, el cálculo en sí empieza a dominar y el beneficio de la reutilización deja de crecer.',
        'Compáralo con el capítulo 18: la ventana de verificación tiene como máximo 8 filas, y esta tabla es una de las tablas de costo que usa el controlador especulativo para decidir «cuántos tokens adivinar».',
      ],
      try: [
        'Arrastra <b>C</b> de 1 a 8192 y mira las barras de abajo: suben casi linealmente al principio y se aplanan hacia 2048. La parte que sube es «una lectura de los pesos sirve a más tokens»; la meseta es el techo de cálculo.',
        'Elige C = 1024 y reproduce una vez con el interruptor <b>Pipeline</b> activado y otra desactivado. Desactivado, los carriles «Copia» y «Cálculo» se encienden por turnos; activado, se solapan y cada chunk tarda un 40% menos.',
        'Pon N en 1024 y luego C en 8192: solo hay un chunk, así que un chunk más grande no hace nada. Strata también toma prestada solo la VRAM que el prompt necesita de verdad.',
      ],
    },
  });

  Viz.register('prefill-chunk', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a2)', text: T.lgCopy },
        { color: 'var(--accent)', text: T.lgComp, glow: true },
        { color: 'var(--a3)', text: T.lgPick },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const X0 = 40, X1 = 356;   // stages ~360 wide: 12-unit text stays >= 10 px on a phone
      const gantt = Viz.svg('svg', { viewBox: '0 0 360 96', class: 'viz-stage', role: 'img', 'aria-label': T.ganttLabel }, left);
      T.lanes.forEach((name, j) => {
        Viz.svg('text', { x: 0, y: 39 + j * 30, 'font-size': 13, style: 'fill:var(--muted)' }, gantt).textContent = name;
        Viz.svg('rect', { x: X0, y: 24 + j * 30, width: X1 - X0, height: 20, style: 'fill:var(--side);stroke:var(--frame)' }, gantt);
      });
      const gLayer = Viz.svg('g', {}, gantt), gMarks = Viz.svg('g', {}, gantt);
      const cursor = Viz.svg('path', { d: '', style: 'stroke:var(--a3);stroke-width:1.5;fill:none' }, gantt);
      const bars = Viz.svg('svg', { viewBox: '0 0 360 172', class: 'viz-stage', role: 'img', 'aria-label': T.barsLabel, style: 'margin-top:8px' }, left);
      Viz.svg('text', { x: 180, y: 168, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, bars).textContent = T.axis;
      const barEls = CS.map((c, i) => {
        const x = 7 + i * 44;
        const r = Viz.svg('rect', { x, y: 128, width: 34, height: 0, class: 'viz-cell' }, bars);
        const v = Viz.svg('text', { x: x + 17, y: 122, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, bars);
        Viz.svg('text', { x: x + 17, y: 146, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, bars).textContent = String(c);
        return { r, v };
      });
      const slider = (label, max, val) => `<div class="viz-slider"><label>${label}</label><input type="range" min="0" max="${max}" value="${val}" aria-label="${Viz.esc(label)}"><output></output></div>`;
      left.insertAdjacentHTML('beforeend', slider(T.nLabel, NS.length - 1, 2) + slider(T.cLabel, CS.length - 1, 4) +
        `<div class="viz-row">${Viz.button(T.bPlay)}${Viz.button(T.bOverlap(true), 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = Viz.stat({ id: 'p-chunks', k: T.sChunksK, v: '', f: '' }) + Viz.stat({ id: 'p-time', k: T.sTimeK, v: '', f: '' }) + Viz.stat({ id: 'p-rate', k: T.sRateK, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [nRange, cRange] = el.querySelectorAll('input[type=range]');
      const outs = el.querySelectorAll('.viz-slider output');
      const [playBtn, ovBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const verdict = $('.viz-verdict');
      let overlap = true, busy = false, plan = null;

      const cur = () => ({ n: NS[+nRange.value], c: CS[+cRange.value] });
      function compute() {
        const { n, c } = cur();
        outs[0].textContent = Viz.fmt(n); outs[1].textContent = Viz.fmt(c);
        const r = M.run(n, c, W_MS, U_MS, overlap);
        $('[data-s=p-chunks-v]').textContent = Viz.fmt(r.chunks.length);
        $('[data-s=p-chunks-f]').innerHTML = T.sChunksF(Viz.fmt(n), Viz.fmt(c));
        $('[data-s=p-time-v]').textContent = T.ms(Viz.fmt(r.times[0]));
        $('[data-s=p-time-f]').innerHTML = T.sTimeF(overlap, Viz.fmt(c * U_MS, 1));
        $('[data-s=p-rate-v]').textContent = T.perSec(Viz.fmt(r.tokPerSec));
        $('[data-s=p-rate-f]').innerHTML = T.sRateF(Viz.fmt(n), Viz.fmt(r.totalMs / 1000, 2));
        const rates = CS.map(cc => M.run(n, cc, W_MS, U_MS, overlap).tokPerSec), top = 2500;
        barEls.forEach(({ r: rect, v }, i) => {
          const h = Math.max(1, rates[i] / top * 100);
          rect.setAttribute('y', 128 - h); v.setAttribute('y', 122 - h); rect.setAttribute('height', h);
          rect.setAttribute('class', 'viz-cell' + (CS[i] === c ? ' pick' : ' score'));
          v.textContent = Viz.fmt(rates[i]);
        });
        // The first three chunks, laid end to end, scaled to the strip.
        const shown = r.chunks.slice(0, 3);
        let t = 0;
        plan = shown.map(size => { const s = M.layerSchedule(size, W_MS, U_MS, overlap); const p = { t0: t, s }; t += s.end; return p; });
        plan.total = t; plan.scale = (X1 - X0) / t;
        return r;
      }
      function draw(time) {
        gLayer.innerHTML = ''; gMarks.innerHTML = '';
        const sc = plan.scale;
        plan.forEach((p, k) => {
          p.s.layers.forEach(l => {
            [[l.copy, 26, 'var(--a2)'], [l.comp, 56, 'var(--accent)']].forEach(([seg, y, color]) => {
              const s0 = p.t0 + seg[0], s1 = Math.min(p.t0 + seg[1], time);
              if (s1 > s0) Viz.svg('rect', { x: X0 + s0 * sc, y, width: Math.max(0.4, (s1 - s0) * sc - 0.3), height: 16, style: 'fill:' + color }, gLayer);
            });
          });
          const x = X0 + (p.t0 + p.s.end) * sc;
          if (time >= p.t0) Viz.svg('text', { x: X0 + p.t0 * sc + 3, y: 16, 'font-size': 12, style: 'fill:var(--muted)' }, gMarks).textContent = T.chunk(k + 1);
          if (time >= p.t0 + p.s.end && k < plan.length - 1) Viz.svg('path', { d: `M${x} 20V80`, style: 'stroke:var(--ink);stroke-dasharray:3 3;fill:none' }, gMarks);
        });
        cursor.setAttribute('d', Number.isFinite(time) ? `M${X0 + time * sc} 20V80` : '');
      }
      function settle(log) {
        verdict.hidden = true; pipe.set(-1);
        const r = compute(); draw(Infinity);
        if (log) { const { n, c } = cur(); term.log(T.tChange(Viz.fmt(n), Viz.fmt(c), Viz.fmt(r.chunks.length), Viz.fmt(c * U_MS, 1), Viz.fmt(r.tokPerSec))); }
      }
      nRange.oninput = cRange.oninput = () => { if (!busy) settle(false); };
      nRange.onchange = cRange.onchange = () => { if (!busy) settle(true); };
      ovBtn.onclick = () => {
        if (busy) return;
        overlap = !overlap; ovBtn.textContent = T.bOverlap(overlap); ovBtn.className = 'viz-btn ' + (overlap ? 'alt' : 'ghost');
        term.log(T.tOverlap(overlap)); settle(false);
      };
      resetBtn.onclick = () => {
        if (busy) return;
        nRange.value = 2; cRange.value = 4; overlap = true; ovBtn.textContent = T.bOverlap(true); ovBtn.className = 'viz-btn alt';
        term.clear(); term.log(T.ready); settle(false);
      };
      playBtn.onclick = async () => {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = true; });
        const r = compute(); verdict.hidden = true;
        try {
          pipe.set(0); term.log(T.t0); draw(0);
          await ctx.sleep(500);
          const dur = ctx.reduced ? 0 : 1800 * plan.length;
          const t0 = performance.now();
          let k = -1;
          await new Promise(resolve => {
            const tick = now => {
              const time = dur ? Math.min(1, (now - t0) / dur) * plan.total : plan.total;
              const idx = plan.findIndex(p => time < p.t0 + p.s.end);
              const at = idx < 0 ? plan.length - 1 : idx;
              if (at !== k) { if (k >= 0) { pipe.set(3); term.log(T.t3(k + 1)); } k = at; term.log(T.t1(k + 1)); }
              if (idx >= 0) {
                const local = time - plan[at].t0, l = plan[at].s.layers.find(x => local < x.comp[1]);
                pipe.set(l && local < l.copy[1] && local < l.comp[0] ? 1 : 2);
              }
              draw(time);
              if (time < plan.total) ctx.raf(tick); else resolve();
            };
            ctx.raf(tick);
          });
          pipe.set(4);
          term.log(T.tEnd(Viz.fmt(r.totalMs / 1000, 2), Viz.fmt(r.tokPerSec)));
          const { c } = cur(), be = Viz.fmt(M.breakEven(W_MS, U_MS));
          verdict.innerHTML = (c < M.breakEven(W_MS, U_MS) ? T.vSmall(Viz.fmt(c), be) : T.vBig(Viz.fmt(c), be)) + (overlap ? '' : T.vNoOverlap);
          verdict.hidden = false;
        } catch (e) { if (ctx.alive) throw e; }
        busy = false;
        if (ctx.alive) el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = false; });
      };
      settle(false);
    },
  });

  Viz.register('batch-reuse', {
    mount(el) {
      const body = Viz.frame(el, { code: T.bCode, title: T.bTitle, tag: T.bTag, intro: T.bIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.bLgOne },
        { color: 'var(--accent)', text: T.bLgBatch, glow: true },
        { color: 'var(--a2)', text: T.bLgTok },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const X0 = 70, PX = 34;                               // 8 × 34 = 272 → bars end at 342
      const svg = Viz.svg('svg', { viewBox: '0 0 360 150', class: 'viz-stage', role: 'img', 'aria-label': T.bStage }, left);
      const rowOne = Viz.svg('rect', { x: X0, y: 10, width: 0, height: 22, style: 'fill:var(--frame)' }, svg);
      const rowBat = Viz.svg('rect', { x: X0, y: 46, width: 0, height: 22, style: 'fill:var(--accent)' }, svg);
      Viz.svg('text', { x: 0, y: 26, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = T.bRowOne;
      Viz.svg('text', { x: 0, y: 62, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = T.bRowBatch;
      const vOne = Viz.svg('text', { x: X0, y: 26, 'font-size': 12, style: 'fill:var(--ink)' }, svg);
      const vBat = Viz.svg('text', { x: X0, y: 62, 'font-size': 12, style: 'fill:var(--ink)' }, svg);
      Viz.svg('rect', { x: 0, y: 84, width: 358, height: 26, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
      Viz.svg('text', { x: 179, y: 102, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = T.bWeights;
      const toks = Array.from({ length: 8 }, (_, i) => Viz.svg('rect', { x: 8 + i * 44, y: 120, width: 36, height: 24, rx: 3, style: 'fill:var(--a2)' }, svg));
      left.insertAdjacentHTML('beforeend', `<div class="viz-slider"><label>${T.bNLabel}</label><input type="range" min="1" max="8" value="1" aria-label="${Viz.esc(T.bNLabel)}"><output>1</output></div>`);
      const term = Viz.term(left, '');
      term.clear();
      right.innerHTML = Viz.stat({ id: 'u-t', k: T.bSK1, v: '', f: '' }) + Viz.stat({ id: 'u-p', k: T.bSK2, v: '', f: '', hot: true }) + Viz.stat({ id: 'u-s', k: T.bSK3, v: '', f: T.bSF3 });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.bTry));
      const $ = q => el.querySelector(q);
      const range = $('input[type=range]');
      function update(log) {
        const n = +range.value, r = M.DENSE_RATIO[n - 1], per = M.perTokenCost(n);
        $('.viz-slider output').textContent = n;
        rowOne.setAttribute('width', n * PX); rowBat.setAttribute('width', r * PX);
        vOne.setAttribute('x', X0 + n * PX + 4); vOne.textContent = T.bTimes(n);
        vBat.setAttribute('x', X0 + r * PX + 4); vBat.textContent = T.bTimes(Viz.fmt(r, 2));
        if (n * PX > 250) { vOne.setAttribute('x', X0 + n * PX - 4); vOne.setAttribute('text-anchor', 'end'); vOne.setAttribute('style', 'fill:var(--paper)'); }
        else { vOne.setAttribute('text-anchor', 'start'); vOne.setAttribute('style', 'fill:var(--ink)'); }
        toks.forEach((t, i) => t.setAttribute('style', 'fill:' + (i < n ? 'var(--a2)' : 'var(--side)')));
        $('[data-s=u-t-v]').textContent = T.bTimes(Viz.fmt(r, 2)); $('[data-s=u-t-f]').innerHTML = T.bSF1(n);
        $('[data-s=u-p-v]').textContent = Math.round(per * 100) + '%'; $('[data-s=u-p-f]').innerHTML = T.bSF2(n);
        $('[data-s=u-s-v]').textContent = Math.round((1 - per) * 100) + '%';
        $('.viz-verdict').innerHTML = T.bVerdict(n, Math.round(per * 100) + '%', Math.round((1 - per) * 100) + '%');
        if (log) term.log(T.bLog(n, Viz.fmt(r, 2), Math.round(per * 100) + '%'));
      }
      range.oninput = () => update(false);
      range.onchange = () => update(true);
      update(true);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
