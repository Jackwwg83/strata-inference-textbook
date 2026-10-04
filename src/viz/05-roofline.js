/* Chapter 05 widgets: a roofline you can climb by batching or by shrinking bytes, and Amdahl's law as two bars.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.roofline;
  const P = 50e12, B = 672e9;               // P is a teaching assumption; B is the RTX 5070 VRAM spec used in ch01/ch10
  const BATCH = [1, 2, 4, 8, 16, 32, 64, 128, 256];
  const SPEEDUPS = [1, 1.5, 2, 3, 4, 8, 16, Infinity];
  const sig = (x, d = 3) => Number(x.toPrecision(d)).toString();

  const T = Viz.t({
    zh: {
      code: 'ROOFLINE', title: '两块天花板', tag: '教学推演 · 算力 P 为假设值',
      intro: '横轴是<b>算术强度</b> I：每从显存读 1 字节，能做几次运算。斜线是带宽的天花板（B × I），平线是算力的天花板（P）。拖动“同时算几个 token”、切换权重格式，看那个点落在哪块天花板下面。按 <b>单步</b> 跟着算一遍。',
      lgPoint: '当前这次计算', lgRef: '参照：写答案（b = 1，FP16）', lgRoof: '天花板：min(P, B × I)',
      steps: ['数运算量', '数字节', '算 I', '和拐点比', '定瓶颈'],
      bLabel: '同时算几个 token（b）', bStep: '▶ 单步',
      formats: [['FP16', 2, '2 字节'], ['Q8_0', 34 / 32, '1.0625 字节'], ['Q2_0', 18 / 64, '0.28125 字节']],
      axX: '算术强度 I（FLOP/字节，对数刻度）', axY: '能达到的算力（TFLOPS，对数刻度）',
      plotLabel: 'roofline 图：横轴算术强度，纵轴可达算力',
      ridge: (r) => `拐点 ≈ ${r}`,
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始',
      r0: (b) => `<span class="c">数运算量</span>：b = ${b} 个 token，每个权重对每个 token 做 1 次乘法、1 次加法 → 每个权重 ${2 * b} 次运算`,
      r1: (bpw, fmt) => `<span class="c">数字节</span>：每个权重 ${bpw}（${fmt}），从显存读一次。这里只算权重，忽略输入输出`,
      r2: (b, bpw, I) => `<span class="m">算术强度</span>：I = ${2 * b} ÷ ${bpw} ≈ ${I} 次运算/字节`,
      r3: (I, r, left) => `<span class="w">和拐点比</span>：拐点 = P ÷ B = 50 万亿 ÷ 6720 亿 ≈ ${r}。I = ${I}，在拐点${left ? '左边' : '右边'}`,
      r4m: (perf, pct) => `<span class="y">结论</span>：带宽受限。最多只能用到 ${perf} TFLOPS，是算力上限的 ${pct}%，其余时间在等数据`,
      r4c: '<span class="y">结论</span>：算力受限，能用满 50 TFLOPS。再加大 b，每个 token 也不会更快',
      sI: '算术强度 I', sIF: '<b>= 2b ÷ 每个权重的字节数</b><br>单位：次运算/字节',
      sPerf: '能达到的算力', sPerfF: '<b>= min(P, B × I)</b><br>P = 50 TFLOPS（假设），B = 672 GB/s',
      sBound: '瓶颈在哪', vMem: '带宽', vComp: '算力', sBoundF: (r) => `<b>拐点 = P ÷ B ≈ ${r}</b><br>I 小于拐点，就是在等数据`,
      try: [
        'b = 1、FP16：I = 1，只能用到约 0.67 TFLOPS，不到上限的 2%。写答案时，显卡大部分时间在等数据。',
        '把 b 拉到 <b>128</b>：点越过拐点，爬上平顶。一次算很多 token（读题），同一份权重被用很多次。',
        '换成 <b>Q2_0</b>：同样 b = 1，I 变成约 7。每个权重的字节少了，同样的带宽能喂饱更多运算（解码的额外开销这里没算）。',
      ],
      verdict: '① 写答案时一轮只算 1 个 token，I 只有 1 左右，远在拐点左边：速度由带宽决定，不由算力决定。<br>② 读题时一次算很多 token，I 跟着 b 变大，才爬上平顶。<br>③ 量化减少每个权重的字节，也能把 I 往右推；代价是解码要额外计算（第 4 章）。',

      aCode: 'AMDAHL', aTitle: '只优化一部分，整体快多少', aTag: '教学推演 · 16% 来自 Strata 源码注释',
      aIntro: '一个 token 的时间分成两块：要优化的部分占 f，其余占 1 − f。把要优化的部分加速 s 倍，看整条时间线缩短多少。',
      lgRest: '没被优化的部分', lgPart: '要优化的部分', lgFast: '优化后的那部分',
      presets: [['Strata 的 GEMV：约 16%', 16], ['占一半', 50], ['占九成', 90]],
      fLabel: '要优化的部分占 f', sLabel: '它快了 s 倍',
      before: '优化前', after: '优化后',
      aReady: '<span class="c">$</span> ready. 拖动滑块，或点上面的预设',
      aLog: (f, s, t, S) => `<span class="c">f = ${f}%，s = ${s}</span>：新时间 = ${100 - f}% + ${f}% ÷ ${s} = ${t}%，整体快 <span class="y">${S} 倍</span>`,
      kS: '整体加速', fS: '<b>= 1 ÷ ((1 − f) + f ÷ s)</b>',
      kCap: '加速上限（s → ∞）', fCap: '<b>= 1 ÷ (1 − f)</b><br>没被优化的部分，一点没少',
      kT: '新的总时间', fT: '<b>= (1 − f) + f ÷ s</b><br>以优化前为 100%',
      aTry: [
        '点 <b>Strata 的 GEMV</b>，把 s 拉到 ∞：整体也只快约 1.19 倍。',
        '点 <b>占九成</b>，s = 2：整体快约 1.82 倍。值得花力气的，是占大头的部分。',
        '固定 s = 2，把 f 从 0 拉到 95%：整体加速慢慢逼近 2，但永远到不了。',
      ],
      aVerdict: (f, s, S, cap) => `① 要优化的部分占 ${f}%，快了 ${s} 倍，整体只快 <b>${S} 倍</b>。<br>② 就算快到无穷，整体最多快 ${cap} 倍：剩下的 ${100 - f}% 一点没少。<br>③ 所以动手优化之前，先量清楚各部分各占多少时间。Strata 的源码就是这样判断：GEMV 只占一个 token 的约 16%，改它的线程数动不了总时间。`,
    },
    en: {
      code: 'ROOFLINE', title: 'Two ceilings', tag: 'Teaching estimate · compute P is assumed',
      intro: 'The x-axis is <b>arithmetic intensity</b> I: operations per byte read from VRAM. The slant is the bandwidth ceiling (B × I), the flat part is the compute ceiling (P). Drag “tokens per batch”, switch weight formats, and watch where the point falls. Click <b>step</b> to walk through the arithmetic.',
      lgPoint: 'current computation', lgRef: 'reference: decode (b = 1, FP16)', lgRoof: 'ceiling: min(P, B × I)',
      steps: ['count ops', 'count bytes', 'compute I', 'compare ridge', 'find bottleneck'],
      bLabel: 'tokens per batch (b)', bStep: '▶ step',
      formats: [['FP16', 2, '2 bytes'], ['Q8_0', 34 / 32, '1.0625 bytes'], ['Q2_0', 18 / 64, '0.28125 bytes']],
      axX: 'arithmetic intensity I (FLOP/byte, log scale)', axY: 'achievable throughput (TFLOPS, log scale)',
      plotLabel: 'roofline: x-axis intensity, y-axis achievable throughput',
      ridge: (r) => `ridge ≈ ${r}`,
      ready: '<span class="c">$</span> ready. Click [ ▶ step ] to begin',
      r0: (b) => `<span class="c">count ops</span>: b = ${b} tokens, each weight does 1 multiply + 1 add per token → ${2 * b} ops per weight`,
      r1: (bpw, fmt) => `<span class="c">count bytes</span>: ${bpw} per weight (${fmt}), read once from VRAM. here, weights only, ignoring inputs/outputs`,
      r2: (b, bpw, I) => `<span class="m">arithmetic intensity</span>: I = ${2 * b} ÷ ${bpw} ≈ ${I} ops/byte`,
      r3: (I, r, left) => `<span class="w">compare ridge</span>: ridge = P ÷ B = 50 trillion ÷ 672 billion ≈ ${r}. I = ${I}, ${left ? 'left of' : 'right of'} ridge`,
      r4m: (perf, pct) => `<span class="y">conclusion</span>: bandwidth-limited. can only reach ${perf} TFLOPS, ${pct}% of limit; rest of time waiting for data`,
      r4c: '<span class="y">conclusion</span>: compute-limited, can reach full 50 TFLOPS. larger b will not speed up a single token',
      sI: 'intensity I', sIF: '<b>= 2b ÷ bytes per weight</b><br>unit: ops/byte',
      sPerf: 'achievable throughput', sPerfF: '<b>= min(P, B × I)</b><br>P = 50 TFLOPS (assumption), B = 672 GB/s',
      sBound: 'bottleneck', vMem: 'bandwidth', vComp: 'compute', sBoundF: (r) => `<b>ridge = P ÷ B ≈ ${r}</b><br>I left of ridge means waiting for data`,
      try: [
        'b = 1, FP16: I = 1, reaches only 0.67 TFLOPS, under 2% of ceiling. decode: GPU mostly waiting.',
        'slide b to <b>128</b>: point crosses ridge, climbs the flat. one batch computes many tokens (prefill), same weights reused.',
        'switch to <b>Q2_0</b>: same b = 1, I becomes ~7. fewer bytes per weight, same bandwidth feeds more arithmetic (unpacking cost not included).',
      ],
      verdict: '① decode one token at a time: I ~1, far left of ridge, speed set by bandwidth not compute. ② prefill many tokens at once: I grows with b, climbs the flat. ③ quantization shrinks bytes per weight, pushes I right; cost is extra unpacking compute (chapter 4).',

      aCode: 'AMDAHL', aTitle: 'speed up one part—how much faster overall', aTag: 'Teaching estimate · 16% from Strata source comments',
      aIntro: 'one token\'s time splits two ways: part to optimize is f, the rest is 1 − f. speed the part by s×, watch the timeline shrink.',
      lgRest: 'part not optimized', lgPart: 'part to optimize', lgFast: 'after speedup',
      presets: [['Strata\'s GEMV: ~16%', 16], ['half', 50], ['ninety percent', 90]],
      fLabel: 'fraction to optimize (f)', sLabel: 'speedup factor (s)',
      before: 'before', after: 'after',
      aReady: '<span class="c">$</span> ready. drag slider or click preset above',
      aLog: (f, s, t, S) => `<span class="c">f = ${f}%, s = ${s}</span>: new time = ${100 - f}% + ${f}% ÷ ${s} = ${t}%, overall speedup <span class="y">${S}×</span>`,
      kS: 'overall speedup', fS: '<b>= 1 ÷ ((1 − f) + f ÷ s)</b>',
      kCap: 'speedup ceiling (s → ∞)', fCap: '<b>= 1 ÷ (1 − f)</b><br>unoptimized part shrinks zero',
      kT: 'new total time', fT: '<b>= (1 − f) + f ÷ s</b><br>as % of original',
      aTry: [
        'click <b>Strata\'s GEMV</b>, slide s to ∞: overall speeds up only ~1.19×.',
        'click <b>ninety percent</b>, s = 2: overall ~1.82×. effort goes to the big piece.',
        'fix s = 2, slide f from 0 to 95%: overall speedup creeps toward 2, never reaches.',
      ],
      aVerdict: (f, s, S, cap) => `① optimize ${f}%, speed it ${s}×, whole system only <b>${S}×</b> faster. ② even infinite speed caps at ${cap}×: the other ${100 - f}% shrinks zero. ③ so measure first: which parts cost what. Strata source: GEMV is ~16% of one token, change thread count = zero net gain.`,
    },
    es: {
      code: 'ROOFLINE', title: 'Dos techos', tag: 'Estimación didáctica · el cómputo P es un valor supuesto',
      intro: 'El eje horizontal es la <b>intensidad aritmética</b> I: cuántas operaciones se hacen por cada byte leído de la VRAM. La diagonal es el techo del ancho de banda (B × I) y la horizontal el techo del cómputo (P). Arrastra «tokens calculados a la vez», cambia el formato de los pesos y mira bajo qué techo cae el punto. Pulsa <b>Paso</b> para calcularlo paso a paso.',
      lgPoint: 'Este cálculo', lgRef: 'Referencia: escribir la respuesta (b = 1, FP16)', lgRoof: 'Techo: min(P, B × I)',
      steps: ['Contar operaciones', 'Contar bytes', 'Calcular I', 'Comparar con el quiebre', 'Hallar el cuello de botella'],
      bLabel: 'Tokens calculados a la vez (b)', bStep: '▶ Paso',
      formats: [['FP16', 2, '2 bytes'], ['Q8_0', 34 / 32, '1,0625 bytes'], ['Q2_0', 18 / 64, '0,28125 bytes']],
      axX: 'Intensidad aritmética I (FLOP/byte, log)', axY: 'Cómputo alcanzable (TFLOPS, log)',
      plotLabel: 'Gráfico Roofline: eje horizontal, intensidad aritmética; eje vertical, cómputo alcanzable',
      ridge: (r) => `Quiebre ≈ ${r}`,
      ready: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para empezar',
      r0: (b) => `<span class="c">Contar operaciones</span>: b = ${b} tokens; cada peso hace 1 multiplicación y 1 suma con cada token → ${2 * b} operaciones por peso`,
      r1: (bpw, fmt) => `<span class="c">Contar bytes</span>: cada peso ocupa ${bpw} (${fmt}) y se lee una vez de la VRAM. Aquí solo se cuentan los pesos; se ignoran entradas y salidas`,
      r2: (b, bpw, I) => `<span class="m">Intensidad aritmética</span>: I = ${2 * b} ÷ ${bpw} ≈ ${I} operaciones/byte`,
      r3: (I, r, left) => `<span class="w">Comparar con el quiebre</span>: quiebre = P ÷ B = 50 × 10¹² ÷ 672 × 10⁹ ≈ ${r}. I = ${I}, a la ${left ? 'izquierda' : 'derecha'} del quiebre`,
      r4m: (perf, pct) => `<span class="y">Conclusión</span>: limitado por el ancho de banda. Solo se pueden usar como máximo ${perf} TFLOPS, el ${pct} % del tope de cómputo; el resto del tiempo espera datos`,
      r4c: '<span class="y">Conclusión</span>: limitado por el cómputo; se usan los 50 TFLOPS completos. Aunque aumentes b, cada token no irá más rápido',
      sI: 'Intensidad aritmética I', sIF: '<b>= 2b ÷ bytes por peso</b><br>unidad: operaciones/byte',
      sPerf: 'Cómputo alcanzable', sPerfF: '<b>= min(P, B × I)</b><br>P = 50 TFLOPS (supuesto), B = 672 GB/s',
      sBound: 'Dónde está el cuello de botella', vMem: 'ancho de banda', vComp: 'cómputo', sBoundF: (r) => `<b>quiebre = P ÷ B ≈ ${r}</b><br>si I es menor que el quiebre, se espera a los datos`,
      try: [
        'Con b = 1 y FP16: I = 1, solo se usan unos 0,67 TFLOPS, menos del 2 % del tope. Al escribir la respuesta, la tarjeta pasa la mayor parte del tiempo esperando datos.',
        'Sube b a <b>128</b>: el punto pasa el quiebre y sube a la parte plana. Si se calculan muchos tokens a la vez (leer el prompt), la misma copia de los pesos se usa muchas veces.',
        'Cambia a <b>Q2_0</b>: con el mismo b = 1, I pasa a ser de unos 7. Cada peso ocupa menos bytes y el mismo ancho de banda alimenta más operaciones (aquí no se cuenta el costo extra de decodificar).',
      ],
      verdict: '① Al escribir la respuesta se calcula 1 solo token por vuelta, I es aproximadamente 1, muy a la izquierda del quiebre: la velocidad la decide el ancho de banda, no el cómputo.<br>② Al leer el prompt se calculan muchos tokens a la vez, I crece con b y por fin sube a la parte plana.<br>③ La cuantización reduce los bytes por peso y también empuja I hacia la derecha; el precio es que decodificar exige cálculo extra (capítulo 4).',

      aCode: 'AMDAHL', aTitle: 'Optimizar solo una parte: ¿cuánto mejora el conjunto?', aTag: 'Estimación didáctica · el 16 % viene de los comentarios del código de Strata',
      aIntro: 'El tiempo de un token se divide en dos bloques: la parte que se va a optimizar ocupa f y el resto ocupa 1 − f. Acelera s veces la parte que se optimiza y mira cuánto se acorta toda la línea de tiempo.',
      lgRest: 'La parte que no se optimiza', lgPart: 'La parte que se va a optimizar', lgFast: 'Esa parte, ya optimizada',
      presets: [['GEMV de Strata: ≈ 16 %', 16], ['La mitad', 50], ['El noventa por ciento', 90]],
      fLabel: 'La parte a optimizar ocupa f', sLabel: 'Es s veces más rápida',
      before: 'Antes de optimizar', after: 'Después de optimizar',
      aReady: '<span class="c">$</span> ready. Arrastra los controles o pulsa uno de los ajustes de arriba',
      aLog: (f, s, t, S) => `<span class="c">f = ${f} %, s = ${s}</span>: tiempo nuevo = ${100 - f} % + ${f} % ÷ ${s} = ${t} %, el conjunto es <span class="y">${S} veces</span> más rápido`,
      kS: 'Aceleración del conjunto', fS: '<b>= 1 ÷ ((1 − f) + f ÷ s)</b>',
      kCap: 'Límite de aceleración (s → ∞)', fCap: '<b>= 1 ÷ (1 − f)</b><br>lo que no se optimiza no disminuye en nada',
      kT: 'Nuevo tiempo total', fT: '<b>= (1 − f) + f ÷ s</b><br>tomando el tiempo antes de optimizar como 100 %',
      aTry: [
        'Pulsa <b>GEMV de Strata</b> y sube s hasta ∞: el conjunto solo es unas 1,19 veces más rápido.',
        'Pulsa <b>El noventa por ciento</b> con s = 2: el conjunto es unas 1,82 veces más rápido. Lo que merece el esfuerzo es la parte que pesa mucho.',
        'Fija s = 2 y sube f de 0 a 95 %: la aceleración del conjunto se acerca poco a poco a 2, pero nunca llega.',
      ],
      aVerdict: (f, s, S, cap) => `① La parte a optimizar ocupa ${f} % y es ${s} veces más rápida; el conjunto solo es <b>${S} veces</b> más rápido.<br>② Aunque fuera infinitamente rápida, el conjunto sería como máximo ${cap} veces más rápido: el ${100 - f} % restante no disminuye en nada.<br>③ Por eso, antes de optimizar, mide cuánto tiempo ocupa cada parte. Así juzga el código de Strata: GEMV es solo cerca del 16 % de un token, y cambiar sus hilos no mueve el tiempo total.`,
    },
    ko: {
      code: 'ROOFLINE', title: '천장 두 개', tag: '교육용 추정 · 연산 성능 P는 가정값',
      intro: '가로축은 <b>산술 강도</b> I예요. VRAM에서 1 바이트를 읽을 때마다 연산을 몇 번 하는가를 나타내요. 비스듬한 선은 대역폭 천장(B × I)이고 수평선은 연산 성능 천장(P)이에요. "한 번에 계산하는 토큰 수"를 움직이고 가중치 형식을 바꿔 가며, 점이 어느 천장 아래에 놓이는지 보세요. <b>단계</b>를 눌러 계산을 차례로 따라가 보세요.',
      lgPoint: '현재 계산', lgRef: '비교: 답 쓰기 (b = 1, FP16)', lgRoof: '천장: min(P, B × I)',
      steps: ['연산량 세기', '바이트 세기', 'I 계산', '꺾임점과 비교', '병목 판정'],
      bLabel: '한 번에 계산하는 토큰 수 (b)', bStep: '▶ 단계',
      formats: [['FP16', 2, '2 바이트'], ['Q8_0', 34 / 32, '1.0625 바이트'], ['Q2_0', 18 / 64, '0.28125 바이트']],
      axX: '산술 강도 I (FLOP/바이트, 로그 눈금)', axY: '도달 가능한 연산 성능 (TFLOPS, 로그 눈금)',
      plotLabel: '루프라인 그래프: 가로축은 산술 강도, 세로축은 도달 가능한 연산 성능',
      ridge: (r) => `꺾임점 ≈ ${r}`,
      ready: '<span class="c">$</span> ready. [ ▶ 단계 ]를 눌러 시작하세요',
      r0: (b) => `<span class="c">연산량 세기</span>: b = ${b}개 토큰, 가중치 하나는 토큰마다 곱셈 1번, 덧셈 1번 → 가중치 하나당 ${2 * b}번 연산`,
      r1: (bpw, fmt) => `<span class="c">바이트 세기</span>: 가중치 하나는 ${bpw}(${fmt})이고 VRAM에서 한 번 읽어요. 여기서는 가중치만 세고 입력과 출력은 무시해요`,
      r2: (b, bpw, I) => `<span class="m">산술 강도</span>: I = ${2 * b} ÷ ${bpw} ≈ ${I} 연산/바이트`,
      r3: (I, r, left) => `<span class="w">꺾임점과 비교</span>: 꺾임점 = P ÷ B = 50조 ÷ 6720억 ≈ ${r}. I = ${I}는 꺾임점의 ${left ? '왼쪽' : '오른쪽'}에 있어요`,
      r4m: (perf, pct) => `<span class="y">결론</span>: 대역폭 한계예요. 최대 ${perf} TFLOPS밖에 못 쓰고, 연산 성능 상한의 ${pct}%예요. 나머지 시간은 데이터를 기다려요`,
      r4c: '<span class="y">결론</span>: 연산 성능 한계예요. 50 TFLOPS를 다 쓸 수 있어요. b를 더 키워도 토큰 하나가 더 빨라지지는 않아요',
      sI: '산술 강도 I', sIF: '<b>= 2b ÷ 가중치 하나의 바이트 수</b><br>단위: 연산/바이트',
      sPerf: '도달 가능한 연산 성능', sPerfF: '<b>= min(P, B × I)</b><br>P = 50 TFLOPS(가정), B = 672 GB/s',
      sBound: '병목 위치', vMem: '대역폭', vComp: '연산 성능', sBoundF: (r) => `<b>꺾임점 = P ÷ B ≈ ${r}</b><br>I가 꺾임점보다 작으면 데이터를 기다리는 거예요`,
      try: [
        'b = 1, FP16: I = 1이라 약 0.67 TFLOPS밖에 못 써요. 상한의 2%도 안 돼요. 답을 쓸 때 GPU는 대부분의 시간을 데이터를 기다려요.',
        'b를 <b>128</b>로 올려 보세요. 점이 꺾임점을 넘어 수평선 위로 올라가요. 한 번에 토큰을 많이 계산하면(문제 읽기) 같은 가중치가 여러 번 쓰여요.',
        '<b>Q2_0</b>으로 바꿔 보세요. 같은 b = 1이어도 I가 약 7이 돼요. 가중치 하나의 바이트가 줄어서 같은 대역폭으로 더 많은 연산을 먹일 수 있어요(디코딩의 추가 비용은 여기서 세지 않았어요).',
      ],
      verdict: '① 답을 쓸 때는 한 라운드에 토큰 1개만 계산해서 I가 1 안팎이고 꺾임점보다 한참 왼쪽이에요. 속도는 연산 성능이 아니라 대역폭이 정해요.<br>② 문제를 읽을 때는 토큰을 많이 한꺼번에 계산해서 I가 b와 함께 커지고, 그제야 수평선 위로 올라가요.<br>③ 양자화는 가중치 하나의 바이트를 줄여 I를 오른쪽으로 밀어 줘요. 대신 디코딩에 추가 연산이 필요해요(4장).',

      aCode: 'AMDAHL', aTitle: '일부만 최적화하면 전체는 얼마나 빨라질까', aTag: '교육용 추정 · 16%는 Strata 소스 주석에서',
      aIntro: '토큰 하나의 시간을 두 덩어리로 나눠요. 최적화할 부분이 f, 나머지가 1 − f예요. 최적화할 부분을 s배 빠르게 했을 때 전체 타임라인이 얼마나 줄어드는지 보세요.',
      lgRest: '최적화하지 않은 부분', lgPart: '최적화할 부분', lgFast: '최적화한 뒤의 그 부분',
      presets: [['Strata의 GEMV: 약 16%', 16], ['절반', 50], ['90%', 90]],
      fLabel: '최적화할 부분의 비율 f', sLabel: '그 부분이 s배 빨라짐',
      before: '최적화 전', after: '최적화 후',
      aReady: '<span class="c">$</span> ready. 슬라이더를 움직이거나 위의 프리셋을 누르세요',
      aLog: (f, s, t, S) => `<span class="c">f = ${f}%, s = ${s}</span>: 새 시간 = ${100 - f}% + ${f}% ÷ ${s} = ${t}%, 전체 <span class="y">${S}배</span> 빨라짐`,
      kS: '전체 가속', fS: '<b>= 1 ÷ ((1 − f) + f ÷ s)</b>',
      kCap: '가속 상한 (s → ∞)', fCap: '<b>= 1 ÷ (1 − f)</b><br>최적화하지 않은 부분은 조금도 줄지 않아요',
      kT: '새 총 시간', fT: '<b>= (1 − f) + f ÷ s</b><br>최적화 전을 100%로 놓아요',
      aTry: [
        '<b>Strata의 GEMV</b>를 누르고 s를 ∞까지 올려 보세요. 전체는 약 1.19배밖에 빨라지지 않아요.',
        '<b>90%</b>를 누르고 s = 2로 해 보세요. 전체는 약 1.82배 빨라져요. 힘을 들일 가치가 있는 곳은 큰 비중을 차지하는 부분이에요.',
        's = 2로 고정하고 f를 0에서 95%까지 올려 보세요. 전체 가속은 2에 서서히 다가가지만 끝내 닿지 못해요.',
      ],
      aVerdict: (f, s, S, cap) => `① 최적화할 부분이 ${f}%이고 ${s}배 빨라졌어요. 전체는 <b>${S}배</b>만 빨라져요.<br>② 무한히 빨라져도 전체는 최대 ${cap}배예요. 나머지 ${100 - f}%는 조금도 줄지 않아요.<br>③ 그래서 최적화에 손대기 전에 각 부분이 시간을 얼마나 차지하는지 먼저 재야 해요. Strata 소스도 이렇게 판단했어요. GEMV는 토큰 하나의 약 16%밖에 안 되니, 스레드 수를 바꿔도 총 시간은 움직이지 않아요.`,
    },
    ja: {
      code: 'ROOFLINE', title: '2 枚の天井', tag: '教育用の試算 · 演算性能 P は仮定値',
      intro: '横軸は<b>演算強度</b> I です。VRAM から 1 バイト読むごとに、何回演算できるかを表します。斜めの線が帯域幅の天井（B × I）、水平の線が演算性能の天井（P）です。「同時に計算するトークン数」を動かし、重みの形式を切り替えて、点がどちらの天井の下にあるか見てみましょう。<b>ステップ</b>を押すと、計算を順に追えます。',
      lgPoint: '今の計算', lgRef: '比較用：デコード（b = 1、FP16）', lgRoof: '天井：min(P, B × I)',
      steps: ['演算量を数える', 'バイトを数える', 'I を求める', '折れ点と比べる', '律速を決める'],
      bLabel: '同時に計算するトークン数（b）', bStep: '▶ ステップ',
      formats: [['FP16', 2, '2 バイト'], ['Q8_0', 34 / 32, '1.0625 バイト'], ['Q2_0', 18 / 64, '0.28125 バイト']],
      axX: '演算強度 I（FLOP/バイト、対数目盛）', axY: '到達できる演算性能（TFLOPS、対数目盛）',
      plotLabel: 'ルーフライン図：横軸は演算強度、縦軸は到達できる演算性能',
      ridge: (r) => `折れ点 ≈ ${r}`,
      ready: '<span class="c">$</span> ready. [ ▶ ステップ ] を押して開始',
      r0: (b) => `<span class="c">演算量を数える</span>：b = ${b} トークン。各重みは、トークンごとに乗算 1 回と加算 1 回 → 重み 1 個あたり ${2 * b} 回の演算`,
      r1: (bpw, fmt) => `<span class="c">バイトを数える</span>：重み 1 個は ${bpw}（${fmt}）で、VRAM から 1 回読みます。ここでは重みだけを数え、入出力は無視します`,
      r2: (b, bpw, I) => `<span class="m">演算強度</span>：I = ${2 * b} ÷ ${bpw} ≈ ${I} 回/バイト`,
      r3: (I, r, left) => `<span class="w">折れ点と比べる</span>：折れ点 = P ÷ B = 50 兆 ÷ 6720 億 ≈ ${r}。I = ${I} は、折れ点の${left ? '左側' : '右側'}です`,
      r4m: (perf, pct) => `<span class="y">結論</span>：帯域幅律速です。使えるのは最大 ${perf} TFLOPS で、演算性能の上限の ${pct}% です。残りの時間はデータを待っています`,
      r4c: '<span class="y">結論</span>：演算律速で、50 TFLOPS を使い切れます。b をさらに増やしても、1 トークンあたりは速くなりません',
      sI: '演算強度 I', sIF: '<b>= 2b ÷ 重み 1 個のバイト数</b><br>単位：回/バイト',
      sPerf: '到達できる演算性能', sPerfF: '<b>= min(P, B × I)</b><br>P = 50 TFLOPS（仮定）、B = 672 GB/s',
      sBound: '律速はどこか', vMem: '帯域幅', vComp: '演算性能', sBoundF: (r) => `<b>折れ点 = P ÷ B ≈ ${r}</b><br>I が折れ点より小さければ、データ待ちです`,
      try: [
        'b = 1、FP16：I = 1 で、使えるのは約 0.67 TFLOPS、上限の 2% 未満です。デコード中、GPU はほとんどの時間データを待っています。',
        'b を <b>128</b> に上げる：点は折れ点を越え、水平の部分に乗ります。多くのトークンをまとめて計算する（プリフィル）と、同じ重みが何度も使われます。',
        '<b>Q2_0</b> に切り替える：同じ b = 1 でも I は約 7 になります。重み 1 個のバイト数が減り、同じ帯域幅でより多くの演算を養えます（デコードの追加コストはここでは数えていません）。',
      ],
      verdict: '① デコードは 1 ラウンドで 1 トークンしか計算しません。I は 1 前後で、折れ点よりずっと左です。速さを決めるのは演算性能ではなく帯域幅です。<br>② プリフィルは多くのトークンをまとめて計算します。I が b とともに大きくなり、水平の部分に乗ります。<br>③ 量子化は重み 1 個のバイト数を減らし、I を右へ押します。代償は、デコードに追加の計算が要ることです（第 4 章）。',

      aCode: 'AMDAHL', aTitle: '一部だけ最適化すると、全体はどれだけ速くなるか', aTag: '教育用の試算 · 16% は Strata のソースコメントより',
      aIntro: '1 トークンの時間を 2 つに分けます。最適化する部分が f、残りが 1 − f です。最適化する部分を s 倍に速くして、全体のタイムラインがどれだけ縮むか見ましょう。',
      lgRest: '最適化されない部分', lgPart: '最適化する部分', lgFast: '最適化後のその部分',
      presets: [['Strata の GEMV：約 16%', 16], ['半分', 50], ['9 割', 90]],
      fLabel: '最適化する部分の割合 f', sLabel: 'その部分が s 倍速くなる',
      before: '最適化前', after: '最適化後',
      aReady: '<span class="c">$</span> ready. スライダーを動かすか、上のプリセットを押してください',
      aLog: (f, s, t, S) => `<span class="c">f = ${f}%、s = ${s}</span>：新しい時間 = ${100 - f}% + ${f}% ÷ ${s} = ${t}%、全体で <span class="y">${S} 倍</span>速くなります`,
      kS: '全体の高速化率', fS: '<b>= 1 ÷ ((1 − f) + f ÷ s)</b>',
      kCap: '高速化の上限（s → ∞）', fCap: '<b>= 1 ÷ (1 − f)</b><br>最適化されない部分は、まったく減りません',
      kT: '新しい総時間', fT: '<b>= (1 − f) + f ÷ s</b><br>最適化前を 100% とします',
      aTry: [
        '<b>Strata の GEMV</b> を押して、s を ∞ にする：全体は約 1.19 倍しか速くなりません。',
        '<b>9 割</b>を押して、s = 2 にする：全体は約 1.82 倍速くなります。力を注ぐ価値があるのは、大きな割合を占める部分です。',
        's = 2 に固定して、f を 0 から 95% まで動かす：全体の高速化率は 2 にじわじわ近づきますが、届きません。',
      ],
      aVerdict: (f, s, S, cap) => `① 最適化する部分は ${f}% で、${s} 倍速くなりました。全体は <b>${S} 倍</b>しか速くなりません。<br>② 無限に速くしても、全体は最大 ${cap} 倍までです。残りの ${100 - f}% はまったく減りません。<br>③ だから最適化に手をつける前に、各部分が時間のどれだけを占めるかを測ります。Strata のソースはこう判断しました。GEMV は 1 トークンの約 16% しか占めないので、スレッド数を変えても合計時間は動きません。`,
    },
  });

  Viz.register('roofline-lab', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgPoint, glow: true },
        { color: 'var(--a2)', text: T.lgRef },
        { color: 'var(--muted)', text: T.lgRoof },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 360, H = 250, x0 = 52, x1 = 344, y0 = 26, y1 = 206;
      const xs = I => x0 + (Math.log10(I) + 1) / 4 * (x1 - x0), ys = tf => y1 - (Math.log10(tf) + 2) / 4 * (y1 - y0);
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-stage', role: 'img', 'aria-label': T.plotLabel }, left);
      const txt = (x, y, s, anchor, color) => { const t = Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': anchor || 'start', style: `fill:${color || 'var(--muted)'}` }, svg); t.textContent = s; return t; };
      txt(x0, 14, T.axY);
      [0.1, 1, 10, 100, 1000].forEach(I => { Viz.svg('path', { d: `M${xs(I)} ${y0}V${y1}`, style: 'stroke:var(--frame);fill:none', 'stroke-width': 1 }, svg); txt(xs(I), y1 + 16, String(I), 'middle'); });
      [0.01, 0.1, 1, 10, 100].forEach(v => { Viz.svg('path', { d: `M${x0} ${ys(v)}H${x1}`, style: 'stroke:var(--frame);fill:none', 'stroke-width': 1 }, svg); txt(x0 - 4, ys(v) + 4, String(v), 'end'); });
      txt((x0 + x1) / 2, H - 6, T.axX, 'middle');
      const r = M.ridge(P, B), Ptf = P / 1e12, Btf = B / 1e12;
      Viz.svg('path', { d: `M${xs(0.1)} ${ys(Btf * 0.1)}L${xs(r)} ${ys(Ptf)}H${x1}`, style: 'stroke:var(--muted);fill:none', 'stroke-width': 2.5 }, svg);
      Viz.svg('path', { d: `M${xs(r)} ${ys(Ptf)}V${y1}`, style: 'stroke:var(--muted);fill:none', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
      txt(xs(r) - 4, ys(Ptf) - 6, T.ridge(r.toFixed(0)), 'end');
      Viz.svg('circle', { cx: xs(1), cy: ys(Btf), r: 5, style: 'fill:none;stroke:var(--a2)', 'stroke-width': 2 }, svg);
      const drop = Viz.svg('path', { d: '', style: 'stroke:var(--accent);fill:none', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
      const dot = Viz.svg('circle', { cx: 0, cy: 0, r: 6, style: 'fill:var(--accent);filter:drop-shadow(var(--glow))' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin-top:8px">${T.formats.map(([n], k) => `<button type="button" class="viz-btn${k ? ' ghost' : ''}" data-fmt="${k}" style="padding:5px 10px;font-size:12px">${n}</button>`).join('')}</div>
        <div class="viz-slider"><label>${T.bLabel}</label><input class="rl-b" type="range" min="0" max="${BATCH.length - 1}" step="1" value="0" aria-label="${Viz.esc(T.bLabel)}"><output class="rl-bo"></output></div>
        <div class="viz-row">${Viz.button(T.bStep, 'rl-step')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'rl-i', k: T.sI, v: '', f: T.sIF }) +
        Viz.stat({ id: 'rl-p', k: T.sPerf, v: '', f: T.sPerfF, hot: true }) +
        Viz.stat({ id: 'rl-b', k: T.sBound, v: '', f: T.sBoundF(r.toFixed(0)) });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try) + `<div class="viz-verdict" hidden>${T.verdict}</div>`);
      const $ = s => el.querySelector(s);
      const bIn = $('.rl-b');
      let fmt = 0, phase = -1;
      const state = () => { const b = BATCH[+bIn.value], bpw = T.formats[fmt][1], I = M.intensity(b, bpw), rf = M.roofline(P, B, I); return { b, bpw, I, rf }; };
      function paint() {
        const { b, I, rf } = state(), tf = rf.perf / 1e12, Ic = Math.min(1000, Math.max(0.1, I));
        $('.rl-bo').textContent = b;
        dot.setAttribute('cx', xs(Ic)); dot.setAttribute('cy', ys(tf));
        drop.setAttribute('d', `M${xs(Ic)} ${ys(tf)}V${y1}`);
        $('[data-s=rl-i-v]').textContent = sig(I);
        $('[data-s=rl-p-v]').textContent = sig(tf) + ' TFLOPS';
        $('[data-s=rl-b-v]').textContent = rf.bound === 'memory' ? T.vMem : T.vComp;
        el.querySelectorAll('[data-fmt]').forEach(x => x.classList.toggle('ghost', +x.dataset.fmt !== fmt));
      }
      function step() {
        phase = (phase + 1) % 5;
        pipe.set(phase);
        const { b, bpw, I, rf } = state(), f = T.formats[fmt];
        if (phase === 0) term.log(T.r0(b));
        if (phase === 1) term.log(T.r1(f[2], f[0]));
        if (phase === 2) term.log(T.r2(b, sig(bpw, 4), sig(I)));
        if (phase === 3) term.log(T.r3(sig(I), r.toFixed(0), I < r));
        if (phase === 4) { term.log(rf.bound === 'memory' ? T.r4m(sig(rf.perf / 1e12), sig(rf.perf / P * 100, 2)) : T.r4c); $('.viz-verdict').hidden = false; }
      }
      el.querySelectorAll('[data-fmt]').forEach(x => { x.onclick = () => { fmt = +x.dataset.fmt; phase = -1; pipe.set(-1); paint(); }; });
      bIn.oninput = () => { phase = -1; pipe.set(-1); paint(); };
      $('.rl-step').onclick = step;
      paint();
    },
  });

  Viz.register('amdahl-bar', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.aCode, title: T.aTitle, tag: T.aTag, intro: T.aIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgRest },
        { color: 'var(--accent)', text: T.lgPart, glow: true },
        { color: 'var(--a2)', text: T.lgFast },
      ]));
      const track = 'position:relative;height:28px;border:1px solid var(--frame);background:transparent;display:flex;overflow:hidden';
      const seg = 'height:100%;transition:width .35s ease';
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div class="viz-row" style="margin-top:0">${T.presets.map(([l], k) => `<button type="button" class="viz-btn ghost" data-pre="${k}" style="padding:5px 8px;font-size:12px">${l}</button>`).join('')}</div>
        <div style="font-size:13px;color:var(--ink);margin:14px 0 4px">${T.before}</div>
        <div style="${track}"><i class="ab-r0" style="${seg};background:color-mix(in srgb,var(--frame) 70%,transparent)"></i><i class="ab-p0" style="${seg};background:var(--accent)"></i></div>
        <div style="font-size:13px;color:var(--ink);margin:12px 0 4px">${T.after}</div>
        <div style="${track}"><i class="ab-r1" style="${seg};background:color-mix(in srgb,var(--frame) 70%,transparent)"></i><i class="ab-p1" style="${seg};background:var(--a2)"></i></div>
        <div class="viz-slider"><label>${T.fLabel}</label><input class="ab-f" type="range" min="0" max="95" step="1" value="16" aria-label="${Viz.esc(T.fLabel)}"><output class="ab-fo"></output></div>
        <div class="viz-slider"><label>${T.sLabel}</label><input class="ab-s" type="range" min="0" max="${SPEEDUPS.length - 1}" step="1" value="2" aria-label="${Viz.esc(T.sLabel)}"><output class="ab-so"></output></div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.aReady);
      right.innerHTML =
        Viz.stat({ id: 'ab-s', k: T.kS, v: '', f: T.fS, hot: true }) +
        Viz.stat({ id: 'ab-c', k: T.kCap, v: '', f: T.fCap }) +
        Viz.stat({ id: 'ab-t', k: T.kT, v: '', f: T.fT });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.aTry) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const fIn = $('.ab-f'), sIn = $('.ab-s');
      const sLabel = s => (s === Infinity ? '∞' : String(s));
      const cur = () => { const f = +fIn.value / 100, s = SPEEDUPS[+sIn.value]; return { f, s, S: M.amdahl(f, s), cap: f < 1 ? 1 / (1 - f) : Infinity, t: (1 - f) + (s === Infinity ? 0 : f / s) }; };
      function paint() {
        const { f, s, S, cap, t } = cur();
        $('.ab-fo').textContent = Math.round(f * 100) + '%';
        $('.ab-so').textContent = sLabel(s);
        $('.ab-r0').style.width = (1 - f) * 100 + '%'; $('.ab-p0').style.width = f * 100 + '%';
        $('.ab-r1').style.width = (1 - f) * 100 + '%'; $('.ab-p1').style.width = (t - (1 - f)) * 100 + '%';
        $('[data-s=ab-s-v]').textContent = S.toFixed(3) + '×';
        $('[data-s=ab-c-v]').textContent = cap.toFixed(2) + '×';
        $('[data-s=ab-t-v]').textContent = (t * 100).toFixed(1) + '%';
      }
      function report() {
        const { f, s, S, cap, t } = cur(), fp = Math.round(f * 100);
        term.log(T.aLog(fp, sLabel(s), (t * 100).toFixed(1), S.toFixed(3)));
        const v = $('.viz-verdict'); v.innerHTML = T.aVerdict(fp, sLabel(s), S.toFixed(3), cap.toFixed(2)); v.hidden = false;
      }
      el.querySelectorAll('[data-pre]').forEach(b => { b.onclick = () => {
        fIn.value = T.presets[+b.dataset.pre][1];
        el.querySelectorAll('[data-pre]').forEach(o => o.classList.toggle('ghost', o !== b));
        paint(); report();
      }; });
      fIn.oninput = sIn.oninput = paint;
      fIn.onchange = sIn.onchange = report;
      paint();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
