/* Chapter 01 widgets: one token's journey through the six steps, and the wait for the first token.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.journey;

  const T = Viz.t({
    zh: {
      code: 'TOKEN_JOURNEY', title: '一个 token 的旅程', tag: '教学推演 · 编号和概率为示意',
      intro: '按 <b>单步</b>，跟着一句话走完图 1-1 的六步。走到第 ⑥ 步后，新 token 接到末尾，再回到第 ④ 步。每转一圈，回答多一个 token。',
      lgNow: '正在进行的一步', lgMark: '模板加的标记', lgNew: '刚生成的 token',
      steps: ['你的消息', '聊天模板', '分词器', '推理引擎', '采样', '解码推送'],
      bStep: '▶ 单步', bAuto: '▶▶ 自动走完', bReset: '重置',
      stageTitle: '此刻手里的数据',
      message: 'MoE 是什么？',
      tplNote: '模板告诉模型：谁在说话，轮到谁回答',
      idsNote: (n) => `模型只看到这 ${n} 个整数`,
      layer: (l) => `第 ${l} / 48 层`,
      engineOut: '输出：给词表里每个 token 打一个分',
      candNote: '分数换成概率，这里挑最高的一个',
      answerLabel: '屏幕上的回答',
      // Illustrative tokens and ids; [label, id, isTemplateMark].
      prompt: [['〈用户〉', 3, true], ['MoE', 5402], ['是', 1187], ['什么', 2310], ['？', 1311], ['〈结束〉', 4, true], ['〈助手〉', 5, true]],
      rounds: [
        { id: 5402, cands: [['MoE', 0.62], ['它', 0.25], ['这', 0.13]] },
        { id: 1187, cands: [['是', 0.71], ['指', 0.18], ['，', 0.11]] },
        { id: 2741, cands: [['一种', 0.55], ['一个', 0.30], ['混合', 0.15]] },
        { id: 3306, cands: [['模型', 0.48], ['架构', 0.37], ['方法', 0.15]] },
      ],
      tpl: (msg) => `<span style="color:var(--a2)">〈用户〉</span> ${msg} <span style="color:var(--a2)">〈结束〉</span><br><span style="color:var(--a2)">〈助手〉</span>`,
      empty: '（还没有）',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始，每按一次走流程条上的一步',
      l0: '<span class="c">①</span> 你输入“MoE 是什么？”。这时它还只是一串文字',
      l1: '<span class="c">②</span> 套上聊天模板：加上〈用户〉〈结束〉〈助手〉这类标记，告诉模型谁在说话、轮到谁答',
      l2: (n) => `<span class="c">③</span> 分词器把文字切成 ${n} 个 token，再换成编号。从这里起，模型只和整数打交道`,
      l3: (n) => `<span class="m">④</span> 引擎读入 ${n} 个编号，逐层算完 48 层，给词表里每个 token 打一个分`,
      l4: (tok, p) => `<span class="y">⑤</span> 采样：把分数换成概率，挑出“${tok}”（概率 ${p}）。这里总挑最高的，第 2 章讲怎样按概率随机挑`,
      l5: (id, tok, ans) => `<span class="w">⑥</span> 把编号 ${id} 换回文字“${tok}”，推到屏幕上。回答目前是：${ans}`,
      loop: (n) => `<span class="y">// 回答没写完：新 token 接到末尾，回到第 ④ 步。已生成 ${n} 个 token</span>`,
      done: (n) => `<span class="y">完成</span>：${n} 个 token，第 ④–⑥ 步转了 ${n} 圈；第 ①–③ 步只走了 1 次`,
      restart: '<span class="y">// 从头再来一遍</span>',
      sGenK: '已经生成的 token', sGenF: '<b>= 第 ④–⑥ 步转过的圈数</b><br>一圈只产出一个 token',
      sInK: '这一圈引擎读入的 token', sInF: (p, n) => `<b>= 提问 ${p} 个 + 已生成 ${n} 个</b><br>每一圈的输入都包含上一圈的输出`,
      sHeadK: '第 ①–③ 步走了几次', sHeadF: '<b>只在开头走一次</b><br>之后每个 token 只重复 ④–⑥',
      try: [
        '连按 <b>单步</b>，看流程条走到 ⑥ 之后跳回 ④。这就是图 1-1 里那条虚线。',
        '盯住右边的“引擎读入的 token”：每转一圈加 1。模型每一步都要重新看见自己刚写的字，这叫<b>自回归</b>。',
        '按 <b>自动走完</b>：4 个 token 转了 4 圈，①–③ 只走 1 次。回答越长，第 ④ 步的速度越要紧。',
      ],
      verdict: '① 回答有几个 token，第 ④–⑥ 步就转几圈。<br>② 第 ①–③ 步只在开头走一次。<br>③ 所以写答案的快慢，主要看引擎转一圈要多久：这正是后面各章要拆开讲的事。',

      wCode: 'FIRST_TOKEN', wTitle: '等第一个字要多久', wTag: '上游实测 · 教学推演',
      wIntro: '一次回答 = 读题（prefill）+ 写答案（decode）。拖动滑块改变提问长度和回答长度，按 <b>播放</b> 看两段时间各占多少。速度取自上游实测：RTX 5070 12 GB，Q2_0，引擎 0.1.26。',
      wLgPre: '读题：整段提问一起算', wLgDec: '写答案：一轮一个 token',
      wLen: '提问长度', wAns: '回答长度', wGo: '▶ 播放',
      wClock: (s) => `t = ${s} 秒`,
      wFirst: '等第一个字', wFirstF: (n, pp) => `<b>= ${n} ÷ ${pp} token/s</b><br>提问越长，等得越久`,
      wAnsK: '写完回答', wAnsF: (m, tg) => `<b>= ${m} ÷ ${tg} token/s</b><br>一轮一个 token`,
      wShareK: '读题占总时间', wShareF: '<b>= 等第一个字 ÷ 总时间</b>',
      sec: (s) => `${s} 秒`,
      wNote: '按 1K = 1,024 个 token 估算。README 给的经验值更保守：第一条消息大约每 30,000 个 token 要读 1 分钟。',
      wTry: [
        '把提问长度从 4K 拉到 128K：等第一个字从约 3 秒变成约 1 分钟，写答案的时间几乎不变。',
        '把回答长度拉到 1000：写答案按比例变长，读题时间纹丝不动。两段时间由不同的因素决定。',
        '看 1K 那一档：读题速度只有每秒 536 个，不到 4K 档的一半。读题速度不是常数，报数字要带上长度。',
      ],
      wVerdict: (n, first, m, ans, ratio) => `① 提问 ${n} 个 token 时，要先等 <b>${first} 秒</b> 才看到第一个字。<br>② 之后 ${m} 个 token 的回答只要 ${ans} 秒。<br>③ 读题每秒处理的 token 是写答案的 ${ratio} 倍，因为提问里的 token 能一起算（第 16 章细讲）。`,
    },
    en: {
      code: 'TOKEN_JOURNEY', title: 'One token\'s journey', tag: 'Teaching estimate · IDs and probabilities are made up',
      intro: 'Press <b>Step</b> and follow one sentence through the six steps of Figure 1-1. After step ⑥, the new token is appended and we go back to step ④. Each lap adds one token to the answer.',
      lgNow: 'The step happening now', lgMark: 'Marks added by the template', lgNew: 'The token just generated',
      steps: ['Your message', 'Chat template', 'Tokenizer', 'Engine', 'Sampling', 'Detokenize'],
      bStep: '▶ Step', bAuto: '▶▶ Run to the end', bReset: 'Reset',
      stageTitle: 'DATA IN HAND RIGHT NOW',
      message: 'What is MoE?',
      tplNote: 'The template tells the model who is speaking and whose turn it is to answer',
      idsNote: (n) => `The model sees only these ${n} integers`,
      layer: (l) => `Layer ${l} / 48`,
      engineOut: 'Output: a score for every token in the vocabulary',
      candNote: 'Scores become probabilities; here we pick the highest one',
      answerLabel: 'The answer on screen',
      // Illustrative tokens and ids; [label, id, isTemplateMark].
      prompt: [['⟨user⟩', 3, true], ['What', 3923], [' is', 374], [' MoE', 5402], ['?', 30], ['⟨end⟩', 4, true], ['⟨assistant⟩', 5, true]],
      rounds: [
        { id: 6125, cands: [['MoE', 0.62], ['It', 0.25], ['This', 0.13]] },
        { id: 374, cands: [[' is', 0.71], [' means', 0.18], [',', 0.11]] },
        { id: 264, cands: [[' a', 0.55], [' one', 0.30], [' an', 0.15]] },
        { id: 1646, cands: [[' model', 0.48], [' design', 0.37], [' way', 0.15]] },
      ],
      tpl: (msg) => `<span style="color:var(--a2)">⟨user⟩</span> ${msg} <span style="color:var(--a2)">⟨end⟩</span><br><span style="color:var(--a2)">⟨assistant⟩</span>`,
      empty: '(nothing yet)',
      ready: '<span class="c">$</span> ready. Press [ ▶ Step ] to begin; each press moves one step along the strip',
      l0: '<span class="c">①</span> You type "What is MoE?". Right now it is still just a string of text',
      l1: '<span class="c">②</span> Wrap it in the chat template: add marks like ⟨user⟩ ⟨end⟩ ⟨assistant⟩ that tell the model who is speaking and whose turn it is',
      l2: (n) => `<span class="c">③</span> The tokenizer cuts the text into ${n} tokens and turns them into IDs. From here on, the model deals only with integers`,
      l3: (n) => `<span class="m">④</span> The engine reads ${n} IDs, runs all 48 layers, and gives every token in the vocabulary a score`,
      l4: (tok, p) => `<span class="y">⑤</span> Sampling: turn the scores into probabilities and pick "${tok}" (probability ${p}). Here we always pick the highest; Chapter 2 shows how to pick at random by probability`,
      l5: (id, tok, ans) => `<span class="w">⑥</span> Turn ID ${id} back into the text "${tok}" and push it to the screen. The answer so far: ${ans}`,
      loop: (n) => `<span class="y">// answer not done: append the new token and go back to step ④. ${n} tokens generated so far</span>`,
      done: (n) => `<span class="y">Done</span>: ${n} tokens, so steps ④–⑥ ran ${n} laps; steps ①–③ ran only once`,
      restart: '<span class="y">// starting over from the top</span>',
      sGenK: 'Tokens generated so far', sGenF: '<b>= laps through steps ④–⑥</b><br>each lap produces only one token',
      sInK: 'Tokens the engine reads this lap', sInF: (p, n) => `<b>= ${p} in the prompt + ${n} generated</b><br>every lap's input includes the previous lap's output`,
      sHeadK: 'Times steps ①–③ ran', sHeadF: '<b>only once, at the start</b><br>after that each token repeats only ④–⑥',
      try: [
        'Keep pressing <b>Step</b> and watch the strip jump from ⑥ back to ④. That is the dashed line in Figure 1-1.',
        'Watch "Tokens the engine reads" on the right: it grows by 1 every lap. At every step the model must see again the words it just wrote; this is called <b>autoregressive</b>.',
        'Press <b>Run to the end</b>: 4 tokens take 4 laps, and ①–③ run only once. The longer the answer, the more the speed of step ④ matters.',
      ],
      verdict: '① An answer with n tokens takes n laps through steps ④–⑥.<br>② Steps ①–③ run only once, at the start.<br>③ So how fast the answer is written depends mainly on how long one lap through the engine takes: exactly what later chapters take apart.',

      wCode: 'FIRST_TOKEN', wTitle: 'How long until the first word?', wTag: 'Upstream measurement · Teaching estimate',
      wIntro: 'One answer = prefill ("reading the prompt") + decode ("writing the answer"). Drag the sliders to change the prompt length and the answer length, then press <b>Play</b> to see how much time each phase takes. Speeds come from upstream measurements: RTX 5070 12 GB, Q2_0, engine 0.1.26.',
      wLgPre: 'Prefill: the whole prompt together', wLgDec: 'Decode: one token per round',
      wLen: 'Prompt length', wAns: 'Answer length', wGo: '▶ Play',
      wClock: (s) => `t = ${s} s`,
      wFirst: 'Wait for the first word', wFirstF: (n, pp) => `<b>= ${n} ÷ ${pp} token/s</b><br>the longer the prompt, the longer the wait`,
      wAnsK: 'Finish the answer', wAnsF: (m, tg) => `<b>= ${m} ÷ ${tg} token/s</b><br>one token per round`,
      wShareK: 'Prefill share of total time', wShareF: '<b>= first-word wait ÷ total time</b>',
      sec: (s) => `${s} s`,
      wNote: 'Estimated with 1K = 1,024 tokens. The README gives a more cautious rule of thumb: the first message takes about 1 minute to read per 30,000 tokens.',
      wTry: [
        'Drag the prompt length from 4K to 128K: the wait for the first word goes from about 3 seconds to about 1 minute, while the time to write the answer barely changes.',
        'Drag the answer length to 1000: decode time grows in proportion, and prefill time does not move at all. The two phases depend on different things.',
        'Look at the 1K setting: prefill handles only 536 tokens per second, less than half the 4K rate. Prefill speed is not a constant, so always state the length with the number.',
      ],
      wVerdict: (n, first, m, ans, ratio) => `① With a ${n}-token prompt, you first wait <b>${first} s</b> before the first word appears.<br>② After that, an answer of ${m} tokens takes only ${ans} s.<br>③ Prefill handles ${ratio} times as many tokens per second as decode, because the prompt's tokens can be computed together (Chapter 16 has the details).`,
    },
    es: {
      code: 'TOKEN_JOURNEY', title: 'El viaje de un token', tag: 'Estimación didáctica · los IDs y las probabilidades son de ejemplo',
      intro: 'Pulsa <b>Paso</b> y sigue una frase por los seis pasos de la figura 1-1. Después del paso ⑥, el token nuevo se añade al final y se vuelve al paso ④. Cada vuelta suma un token a la respuesta.',
      lgNow: 'El paso que ocurre ahora', lgMark: 'Marcas que añade la plantilla', lgNew: 'El token recién generado',
      steps: ['Tu mensaje', 'Plantilla de chat', 'Tokenizador', 'Motor', 'Muestreo', 'Decodificar'],
      bStep: '▶ Paso', bAuto: '▶▶ Ejecutar hasta el final', bReset: 'Reiniciar',
      stageTitle: 'DATOS QUE HAY AHORA MISMO',
      message: '¿Qué es MoE?',
      tplNote: 'La plantilla le dice al modelo quién habla y a quién le toca responder',
      idsNote: (n) => `El modelo solo ve estos ${n} enteros`,
      layer: (l) => `Capa ${l} / 48`,
      engineOut: 'Salida: una puntuación para cada token del vocabulario',
      candNote: 'Las puntuaciones pasan a probabilidades; aquí elegimos la más alta',
      answerLabel: 'La respuesta en pantalla',
      // Illustrative tokens and ids; [label, id, isTemplateMark].
      prompt: [['⟨usuario⟩', 3, true], ['¿Qué', 3923], [' es', 374], [' MoE', 5402], ['?', 30], ['⟨fin⟩', 4, true], ['⟨asistente⟩', 5, true]],
      rounds: [
        { id: 6125, cands: [['MoE', 0.62], ['Es', 0.25], ['Esto', 0.13]] },
        { id: 374, cands: [[' es', 0.71], [' significa', 0.18], [',', 0.11]] },
        { id: 264, cands: [[' una', 0.55], [' un', 0.30], [' la', 0.15]] },
        { id: 1646, cands: [[' arquitectura', 0.48], [' técnica', 0.37], [' forma', 0.15]] },
      ],
      tpl: (msg) => `<span style="color:var(--a2)">⟨usuario⟩</span> ${msg} <span style="color:var(--a2)">⟨fin⟩</span><br><span style="color:var(--a2)">⟨asistente⟩</span>`,
      empty: '(todavía nada)',
      ready: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para empezar; cada pulsación avanza un paso por la tira',
      l0: '<span class="c">①</span> Escribes «¿Qué es MoE?». Por ahora es solo una cadena de texto',
      l1: '<span class="c">②</span> Se envuelve en la plantilla de chat: se añaden marcas como ⟨usuario⟩ ⟨fin⟩ ⟨asistente⟩, que dicen al modelo quién habla y a quién le toca responder',
      l2: (n) => `<span class="c">③</span> El tokenizador corta el texto en ${n} tokens y los cambia por IDs. A partir de aquí, el modelo solo trabaja con enteros`,
      l3: (n) => `<span class="m">④</span> El motor lee ${n} IDs, recorre las 48 capas y da una puntuación a cada token del vocabulario`,
      l4: (tok, p) => `<span class="y">⑤</span> Muestreo: se pasan las puntuaciones a probabilidades y se elige «${tok}» (probabilidad ${p}). Aquí siempre elegimos la más alta; el capítulo 2 muestra cómo elegir al azar según la probabilidad`,
      l5: (id, tok, ans) => `<span class="w">⑥</span> Se convierte el ID ${id} otra vez en el texto «${tok}» y se envía a la pantalla. La respuesta hasta ahora: ${ans}`,
      loop: (n) => `<span class="y">// la respuesta no ha terminado: se añade el token nuevo y se vuelve al paso ④. Van ${n} tokens generados</span>`,
      done: (n) => `<span class="y">Listo</span>: ${n} tokens, así que los pasos ④–⑥ dieron ${n} vueltas; los pasos ①–③ solo se ejecutaron una vez`,
      restart: '<span class="y">// empezamos otra vez desde arriba</span>',
      sGenK: 'Tokens generados hasta ahora', sGenF: '<b>= vueltas por los pasos ④–⑥</b><br>cada vuelta produce un solo token',
      sInK: 'Tokens que lee el motor en esta vuelta', sInF: (p, n) => `<b>= ${p} del prompt + ${n} generados</b><br>la entrada de cada vuelta incluye la salida de la anterior`,
      sHeadK: 'Veces que se ejecutaron los pasos ①–③', sHeadF: '<b>solo una, al principio</b><br>después cada token repite solo ④–⑥',
      try: [
        'Pulsa <b>Paso</b> varias veces y mira cómo la tira salta de ⑥ a ④. Es la línea punteada de la figura 1-1.',
        'Mira «Tokens que lee el motor» a la derecha: sube 1 en cada vuelta. En cada paso el modelo tiene que volver a ver las palabras que acaba de escribir; esto se llama <b>autorregresivo</b>.',
        'Pulsa <b>Ejecutar hasta el final</b>: 4 tokens son 4 vueltas, y ①–③ se ejecutan una sola vez. Cuanto más larga es la respuesta, más importa la velocidad del paso ④.',
      ],
      verdict: '① Una respuesta de n tokens da n vueltas por los pasos ④–⑥.<br>② Los pasos ①–③ se ejecutan una sola vez, al principio.<br>③ Así que la rapidez al escribir la respuesta depende sobre todo de cuánto tarda una vuelta por el motor: justo lo que desarman los capítulos siguientes.',

      wCode: 'FIRST_TOKEN', wTitle: '¿Cuánto falta para la primera palabra?', wTag: 'Medición upstream · Estimación didáctica',
      wIntro: 'Una respuesta = prefill («leer el prompt») + decode («escribir la respuesta»). Arrastra los controles para cambiar la longitud del prompt y de la respuesta, y pulsa <b>Reproducir</b> para ver cuánto tiempo toma cada fase. Las velocidades vienen de mediciones upstream: RTX 5070 12 GB, Q2_0, motor 0.1.26.',
      wLgPre: 'Prefill: todo el prompt junto', wLgDec: 'Decode: un token por vuelta',
      wLen: 'Longitud del prompt', wAns: 'Longitud de la respuesta', wGo: '▶ Reproducir',
      wClock: (s) => `t = ${s} s`,
      wFirst: 'Espera de la primera palabra', wFirstF: (n, pp) => `<b>= ${n} ÷ ${pp} token/s</b><br>cuanto más largo el prompt, más larga la espera`,
      wAnsK: 'Terminar la respuesta', wAnsF: (m, tg) => `<b>= ${m} ÷ ${tg} token/s</b><br>un token por vuelta`,
      wShareK: 'Parte del prefill en el tiempo total', wShareF: '<b>= espera de la primera palabra ÷ tiempo total</b>',
      sec: (s) => `${s} s`,
      wNote: 'Estimado con 1K = 1.024 tokens. El README da una regla más prudente: el primer mensaje tarda 1 minuto en leerse por cada 30.000 tokens.',
      wTry: [
        'Arrastra la longitud del prompt de 4K a 128K: la espera de la primera palabra pasa de unos 3 segundos a más o menos 1 minuto, y el tiempo de escribir la respuesta casi no cambia.',
        'Arrastra la longitud de la respuesta a 1000: el tiempo de decode crece en proporción y el del prefill no se mueve nada. Las dos fases dependen de cosas distintas.',
        'Mira el ajuste de 1K: el prefill procesa solo 536 tokens por segundo, menos de la mitad que con 4K. La velocidad del prefill no es una constante, así que al dar el número indica siempre la longitud.',
      ],
      wVerdict: (n, first, m, ans, ratio) => `① Con un prompt de ${n} tokens, primero esperas <b>${first} s</b> hasta ver la primera palabra.<br>② Después, una respuesta de ${m} tokens toma solo ${ans} s.<br>③ El prefill procesa ${ratio} veces más tokens por segundo que el decode, porque los tokens del prompt se calculan juntos (el capítulo 16 da los detalles).`,
    },
    ko: {
      code: 'TOKEN_JOURNEY', title: '토큰 하나의 여정', tag: '교육용 추정 · 번호와 확률은 예시',
      intro: '<b>한 단계</b>를 눌러 문장 하나가 그림 1-1의 여섯 단계를 지나는 모습을 따라가 보세요. ⑥단계가 끝나면 새 토큰이 끝에 붙고 ④단계로 돌아갑니다. 한 바퀴 돌 때마다 답변에 토큰이 하나씩 늘어요.',
      lgNow: '지금 진행 중인 단계', lgMark: '템플릿이 붙인 표시', lgNew: '방금 생성된 토큰',
      steps: ['내 메시지', '채팅 템플릿', '토크나이저', '추론 엔진', '샘플링', '디코딩과 전송'],
      bStep: '▶ 한 단계', bAuto: '▶▶ 끝까지 진행', bReset: '처음으로',
      stageTitle: '지금 손에 든 데이터',
      message: 'MoE가 뭐예요?',
      tplNote: '템플릿은 누가 말하는지, 이제 누가 답할 차례인지 모델에 알려 줘요',
      idsNote: (n) => `모델에는 이 정수 ${n}개만 보여요`,
      layer: (l) => `${l} / 48번째 층`,
      engineOut: '출력: 어휘 목록의 모든 토큰에 점수 매기기',
      candNote: '점수를 확률로 바꾸고, 여기서는 가장 높은 것을 골라요',
      answerLabel: '화면에 보이는 답변',
      // Illustrative tokens and ids; [label, id, isTemplateMark].
      prompt: [['⟨사용자⟩', 3, true], ['MoE', 5402], ['가', 1187], ['뭐예요', 2310], ['?', 1311], ['⟨끝⟩', 4, true], ['⟨도우미⟩', 5, true]],
      rounds: [
        { id: 5402, cands: [['MoE', 0.62], ['이것', 0.25], ['그', 0.13]] },
        { id: 1187, cands: [['는', 0.71], ['란', 0.18], [',', 0.11]] },
        { id: 2741, cands: [['하나의', 0.55], ['일종의', 0.30], ['여러', 0.15]] },
        { id: 3306, cands: [['모델', 0.48], ['구조', 0.37], ['방법', 0.15]] },
      ],
      tpl: (msg) => `<span style="color:var(--a2)">⟨사용자⟩</span> ${msg} <span style="color:var(--a2)">⟨끝⟩</span><br><span style="color:var(--a2)">⟨도우미⟩</span>`,
      empty: '(아직 없음)',
      ready: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 눌러 시작하세요. 누를 때마다 진행 바에서 한 단계씩 나아가요',
      l0: '<span class="c">①</span> "MoE가 뭐예요?"를 입력해요. 지금은 아직 글자 한 줄일 뿐이에요',
      l1: '<span class="c">②</span> 채팅 템플릿을 씌워요. ⟨사용자⟩ ⟨끝⟩ ⟨도우미⟩ 같은 표시를 붙여서 누가 말하는지, 누가 답할 차례인지 알려 줘요',
      l2: (n) => `<span class="c">③</span> 토크나이저가 글자를 토큰 ${n}개로 자르고 번호로 바꿔요. 여기서부터 모델은 정수만 다뤄요`,
      l3: (n) => `<span class="m">④</span> 엔진이 번호 ${n}개를 읽고 48개 층을 차례로 계산한 뒤, 어휘 목록의 모든 토큰에 점수를 매겨요`,
      l4: (tok, p) => `<span class="y">⑤</span> 샘플링: 점수를 확률로 바꾸고 "${tok}"(확률 ${p})를 골라요. 여기서는 항상 가장 높은 것을 골라요. 확률에 따라 무작위로 고르는 방법은 2장에서 다뤄요`,
      l5: (id, tok, ans) => `<span class="w">⑥</span> 번호(${id})를 다시 글자 "${tok}"로 바꿔 화면에 보내요. 지금까지의 답변: ${ans}`,
      loop: (n) => `<span class="y">// 답변이 아직 안 끝났어요. 새 토큰을 끝에 붙이고 ④단계로 돌아가요. 지금까지 ${n}개 생성</span>`,
      done: (n) => `<span class="y">완료</span>: 토큰 ${n}개, ④–⑥단계는 ${n}바퀴 돌았고 ①–③단계는 한 번만 거쳤어요`,
      restart: '<span class="y">// 처음부터 다시 시작해요</span>',
      sGenK: '지금까지 생성한 토큰', sGenF: '<b>= ④–⑥단계를 돈 바퀴 수</b><br>한 바퀴에 토큰 하나만 나와요',
      sInK: '이번 바퀴에 엔진이 읽는 토큰', sInF: (p, n) => `<b>= 질문 ${p}개 + 생성한 ${n}개</b><br>매 바퀴의 입력에는 앞 바퀴의 출력이 들어 있어요`,
      sHeadK: '①–③단계를 거친 횟수', sHeadF: '<b>처음에 딱 한 번</b><br>그 뒤로 토큰마다 ④–⑥단계만 반복해요',
      try: [
        '<b>한 단계</b>를 계속 눌러서 진행 바가 ⑥에서 ④로 되돌아가는 것을 보세요. 그림 1-1의 점선이 바로 이거예요.',
        '오른쪽의 "엔진이 읽는 토큰"을 보세요. 한 바퀴마다 1씩 늘어요. 모델은 매 단계마다 방금 쓴 글자를 다시 읽어야 해요. 이것이 <b>자기회귀</b>예요.',
        '<b>끝까지 진행</b>을 눌러 보세요. 토큰 4개에 4바퀴, ①–③단계는 한 번뿐이에요. 답변이 길수록 ④단계의 속도가 더 중요해져요.',
      ],
      verdict: '① 답변이 토큰 몇 개이면 ④–⑥단계도 그만큼 돌아요.<br>② ①–③단계는 처음에 한 번만 거쳐요.<br>③ 그래서 답을 쓰는 속도는 엔진이 한 바퀴 도는 데 걸리는 시간에 달려 있어요. 뒤 장들에서 바로 이것을 하나씩 뜯어봐요.',

      wCode: 'FIRST_TOKEN', wTitle: '첫 글자까지 얼마나 기다릴까', wTag: '업스트림 실측 · 교육용 추정',
      wIntro: '답변 한 번 = 프리필(prefill, 「문제 읽기」 단계) + 디코드(decode, 「답 쓰기」 단계). 슬라이더로 질문 길이와 답변 길이를 바꾸고 <b>재생</b>을 눌러 두 구간에 시간이 각각 얼마나 드는지 보세요. 속도는 업스트림 실측값이에요: RTX 5070 12 GB, Q2_0, 엔진 0.1.26.',
      wLgPre: '프리필: 질문 전체를 한꺼번에 계산', wLgDec: '디코드: 한 바퀴에 토큰 하나',
      wLen: '질문 길이', wAns: '답변 길이', wGo: '▶ 재생',
      wClock: (s) => `t = ${s}초`,
      wFirst: '첫 글자까지 기다리는 시간', wFirstF: (n, pp) => `<b>= ${n} ÷ ${pp} token/s</b><br>질문이 길수록 오래 기다려요`,
      wAnsK: '답변을 다 쓰는 시간', wAnsF: (m, tg) => `<b>= ${m} ÷ ${tg} token/s</b><br>한 바퀴에 토큰 하나`,
      wShareK: '전체 시간 중 프리필 비중', wShareF: '<b>= 첫 글자까지 기다린 시간 ÷ 전체 시간</b>',
      sec: (s) => `${s}초`,
      wNote: '1K = 1,024 토큰으로 계산했어요. README의 경험값은 더 보수적이에요. 첫 메시지는 토큰 30,000개당 약 1분이 걸린다고 해요.',
      wTry: [
        '질문 길이를 4K에서 128K로 늘려 보세요. 첫 글자까지 약 3초에서 약 1분으로 늘고, 답을 쓰는 시간은 거의 그대로예요.',
        '답변 길이를 1000으로 늘려 보세요. 디코드 시간은 비례해서 늘고, 프리필 시간은 꿈쩍도 안 해요. 두 구간은 서로 다른 요인으로 정해져요.',
        '1K 설정을 보세요. 프리필 속도가 초당 536개뿐이라 4K 설정의 절반도 안 돼요. 프리필 속도는 상수가 아니니, 숫자를 말할 때는 길이도 함께 말해야 해요.',
      ],
      wVerdict: (n, first, m, ans, ratio) => `① 질문이 토큰 ${n}개이면 첫 글자가 보이기까지 먼저 <b>${first}초</b>를 기다려요.<br>② 그 뒤 토큰 ${m}개짜리 답변은 ${ans}초면 끝나요.<br>③ 프리필은 디코드보다 초당 ${ratio}배 많은 토큰을 처리해요. 질문 속 토큰은 한꺼번에 계산할 수 있기 때문이에요(16장에서 자세히 다뤄요).`,
    },
    ja: {
      code: 'TOKEN_JOURNEY', title: '1 つのトークンの旅', tag: '教育用の試算 · ID と確率は例示',
      intro: '<b>ステップ</b>を押して、1 つの文が図 1-1 の 6 段階を進むようすを追いましょう。第 ⑥ 段階のあと、新しいトークンが末尾に付き、第 ④ 段階へ戻ります。1 周するたびに、回答が 1 トークン増えます。',
      lgNow: '今進んでいる段階', lgMark: 'テンプレートが足した印', lgNew: '生成したばかりのトークン',
      steps: ['あなたのメッセージ', 'チャットテンプレート', 'トークナイザ', '推論エンジン', 'サンプリング', 'デコードと送信'],
      bStep: '▶ ステップ', bAuto: '▶▶ 最後まで進める', bReset: 'リセット',
      stageTitle: 'いま手元にあるデータ',
      message: 'MoE とは？',
      tplNote: 'テンプレートは、誰が話しているか、次は誰が答える番かをモデルに伝えます',
      idsNote: (n) => `モデルに見えるのは、この ${n} 個の整数だけです`,
      layer: (l) => `第 ${l} / 48 層`,
      engineOut: '出力：語彙の全トークンにスコアを付ける',
      candNote: 'スコアを確率に変えます。ここでは最も高いものを選びます',
      answerLabel: '画面上の回答',
      // Illustrative tokens and ids; [label, id, isTemplateMark].
      prompt: [['〈ユーザー〉', 3, true], ['MoE', 5402], ['と', 1187], ['は', 2310], ['？', 1311], ['〈終了〉', 4, true], ['〈アシスタント〉', 5, true]],
      rounds: [
        { id: 5402, cands: [['MoE', 0.62], ['それ', 0.25], ['これ', 0.13]] },
        { id: 2310, cands: [['は', 0.71], ['とは', 0.18], ['、', 0.11]] },
        { id: 2741, cands: [['一種の', 0.55], ['一つの', 0.30], ['混合', 0.15]] },
        { id: 3306, cands: [['モデル', 0.48], ['構造', 0.37], ['手法', 0.15]] },
      ],
      tpl: (msg) => `<span style="color:var(--a2)">〈ユーザー〉</span> ${msg} <span style="color:var(--a2)">〈終了〉</span><br><span style="color:var(--a2)">〈アシスタント〉</span>`,
      empty: '（まだありません）',
      ready: '<span class="c">$</span> ready. [ ▶ ステップ ] を押すと始まります。1 回押すごとに、流れ図の 1 段階が進みます',
      l0: '<span class="c">①</span> 「MoE とは？」と入力します。この時点では、ただの文字列です',
      l1: '<span class="c">②</span> チャットテンプレートをかぶせます。〈ユーザー〉〈終了〉〈アシスタント〉などの印を足し、誰が話していて次は誰が答える番かをモデルに伝えます',
      l2: (n) => `<span class="c">③</span> トークナイザが文字を ${n} 個のトークンに切り分け、番号に直します。ここからモデルが扱うのは整数だけです`,
      l3: (n) => `<span class="m">④</span> エンジンが ${n} 個の番号を読み込み、48 層をすべて計算して、語彙の全トークンにスコアを付けます`,
      l4: (tok, p) => `<span class="y">⑤</span> サンプリング：スコアを確率に変え、「${tok}」（確率 ${p}）を選びます。ここでは常に最も高いものを選びます。確率に従ってランダムに選ぶ方法は第 2 章で扱います`,
      l5: (id, tok, ans) => `<span class="w">⑥</span> 番号 ${id} を文字「${tok}」に戻し、画面へ送ります。ここまでの回答：${ans}`,
      loop: (n) => `<span class="y">// 回答はまだ終わっていません。新しいトークンを末尾に付け、第 ④ 段階へ戻ります。生成済み ${n} トークン</span>`,
      done: (n) => `<span class="y">完了</span>：${n} トークン。第 ④–⑥ 段階は ${n} 周し、第 ①–③ 段階は 1 回だけでした`,
      restart: '<span class="y">// 最初からもう一度</span>',
      sGenK: '生成済みのトークン', sGenF: '<b>= 第 ④–⑥ 段階を回った周数</b><br>1 周で出るトークンは 1 つだけ',
      sInK: 'この周にエンジンが読むトークン', sInF: (p, n) => `<b>= 質問 ${p} 個 + 生成済み ${n} 個</b><br>どの周の入力にも、前の周の出力が入っています`,
      sHeadK: '第 ①–③ 段階を通った回数', sHeadF: '<b>最初に 1 回だけ</b><br>そのあと各トークンが繰り返すのは ④–⑥ だけ',
      try: [
        '<b>ステップ</b>を押し続けて、流れ図が ⑥ から ④ へ戻るのを見ましょう。これが図 1-1 の破線です。',
        '右側の「エンジンが読むトークン」に注目します。1 周ごとに 1 増えます。モデルは毎回、自分が書いたばかりの文字をもう一度読み直します。これが<b>自己回帰</b>です。',
        '<b>最後まで進める</b>を押します。4 トークンなら 4 周し、①–③ は 1 回だけです。回答が長いほど、第 ④ 段階の速さが効いてきます。',
      ],
      verdict: '① 回答が何トークンあれば、第 ④–⑥ 段階もその周数だけ回ります。<br>② 第 ①–③ 段階は最初に 1 回だけです。<br>③ だから答えを書く速さは、エンジンが 1 周する時間でほぼ決まります。後の章で、その中身を分解していきます。',

      wCode: 'FIRST_TOKEN', wTitle: '最初の 1 文字まで、どれだけ待つか', wTag: '上流の実測 · 教育用の試算',
      wIntro: '1 回の回答 ＝ プリフィル（prefill、問題を読む段階）＋ デコード（decode、答えを書く段階）です。スライダーで質問の長さと回答の長さを変え、<b>再生</b>を押して、2 つの段階の時間の割合を見ましょう。速度は上流の実測値です：RTX 5070 12 GB、Q2_0、エンジン 0.1.26。',
      wLgPre: 'プリフィル：質問全体をまとめて計算', wLgDec: 'デコード：1 周に 1 トークン',
      wLen: '質問の長さ', wAns: '回答の長さ', wGo: '▶ 再生',
      wClock: (s) => `t = ${s} 秒`,
      wFirst: '最初の 1 文字まで', wFirstF: (n, pp) => `<b>= ${n} ÷ ${pp} token/s</b><br>質問が長いほど、待ち時間も長い`,
      wAnsK: '回答を書き終えるまで', wAnsF: (m, tg) => `<b>= ${m} ÷ ${tg} token/s</b><br>1 周に 1 トークン`,
      wShareK: 'プリフィルが全体に占める割合', wShareF: '<b>= 最初の 1 文字まで ÷ 全体の時間</b>',
      sec: (s) => `${s} 秒`,
      wNote: '1K = 1,024 トークンとして見積もっています。README の目安はもっと控えめで、最初のメッセージは約 30,000 トークンごとに 1 分かけて読みます。',
      wTry: [
        '質問の長さを 4K から 128K へ動かします。最初の 1 文字までの待ち時間は約 3 秒から約 1 分になり、答えを書く時間はほとんど変わりません。',
        '回答の長さを 1000 にします。デコードの時間は比例して伸び、プリフィルの時間はまったく動きません。2 つの段階は、別の要因で決まります。',
        '1K の設定を見ましょう。プリフィルの速度は毎秒 536 トークンで、4K の半分にも届きません。プリフィル速度は定数ではないので、数字を言うときは長さも添えます。',
      ],
      wVerdict: (n, first, m, ans, ratio) => `① 質問が ${n} トークンのとき、最初の 1 文字が出るまでに <b>${first} 秒</b>待ちます。<br>② そのあとの ${m} トークンの回答は ${ans} 秒しかかかりません。<br>③ プリフィルが毎秒処理するトークン数は、デコードの ${ratio} 倍です。質問のトークンはまとめて計算できるからです（詳しくは第 16 章）。`,
    },
  });

  const PROMPT = T.prompt, ROUNDS = T.rounds;
  const chip = (label, id, kind) => {
    const bg = kind === 'new' ? 'var(--accent)' : 'transparent';
    const fg = kind === 'new' ? 'var(--paper)' : kind === 'mark' ? 'var(--a2)' : 'var(--ink)';
    return `<span style="display:inline-flex;flex-direction:column;align-items:center;border:1px solid ${kind === 'new' ? 'var(--accent)' : 'var(--frame)'};background:${bg};color:${fg};padding:3px 7px;margin:0 4px 6px 0;font-size:13px;line-height:1.4">${Viz.esc(label)}${id !== undefined ? `<small style="font-family:var(--mono);font-size:11px;opacity:.75">${id}</small>` : ''}</span>`;
  };

  Viz.register('token-journey', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgNow, glow: true },
        { color: 'var(--a2)', text: T.lgMark },
        { color: 'var(--accent)', text: T.lgNew },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.insertAdjacentHTML('beforeend', `<div class="tj-stage" style="border:1px solid var(--frame);padding:12px 14px;min-height:190px;background:color-mix(in srgb,var(--side) 60%,transparent)">
        <div style="font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px">${T.stageTitle}</div><div class="tj-data"></div></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAuto, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'tj-gen', k: T.sGenK, v: '0', f: T.sGenF, hot: true }) +
        Viz.stat({ id: 'tj-in', k: T.sInK, v: '—', f: T.sInF(PROMPT.length, 0) }) +
        Viz.stat({ id: 'tj-head', k: T.sHeadK, v: '0', f: T.sHeadF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try) + `<div class="viz-verdict" hidden>${T.verdict}</div>`);
      const $ = s => el.querySelector(s);
      const data = $('.tj-data');
      const [stepBtn, autoBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      let phase = 0, gen = 0, busy = false, finished = false, headDone = 0, lastIn = null;
      const answer = [];

      const idsHtml = (withNew) => PROMPT.map(([l, id, mark]) => chip(l, id, mark ? 'mark' : '')).join('') +
        answer.map((r, i) => chip(r.cands[0][0], r.id, withNew && i === answer.length - 1 ? 'new' : '')).join('');
      const answerText = () => answer.length ? answer.map(r => r.cands[0][0]).join('') : T.empty;
      function stats() {
        $('[data-s=tj-gen-v]').textContent = gen;
        $('[data-s=tj-in-v]').textContent = lastIn === null ? '—' : lastIn;
        $('[data-s=tj-in-f]').innerHTML = T.sInF(PROMPT.length, lastIn === null ? 0 : lastIn - PROMPT.length);
        $('[data-s=tj-head-v]').textContent = headDone;
      }
      function show(p, extra) {
        if (p === 0) data.innerHTML = `<div style="display:inline-block;border:1px solid var(--accent);padding:8px 14px;font-size:18px;color:var(--ink)">${T.message}</div>`;
        if (p === 1) data.innerHTML = `<div style="font-size:15px;line-height:2;color:var(--ink)">${T.tpl(T.message)}</div><div style="font-size:12px;color:var(--muted);margin-top:6px">${T.tplNote}</div>`;
        if (p === 2) data.innerHTML = `<div>${idsHtml(false)}</div><div style="font-size:12px;color:var(--muted)">${T.idsNote(PROMPT.length)}</div>`;
        if (p === 3) data.innerHTML = `<div>${idsHtml(gen > 0)}</div><div class="viz-track" style="margin:8px 0 6px"><i class="tj-bar" style="width:${(extra || 0) / 48 * 100}%"></i></div><div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;color:var(--muted)"><span class="tj-layer">${T.layer(extra || 0)}</span><span>${(extra || 0) >= 48 ? T.engineOut : ''}</span></div>`;
        if (p === 4) {
          const r = ROUNDS[gen];
          data.innerHTML = r.cands.map(([tok, pr], i) => `<div style="display:grid;grid-template-columns:52px minmax(0,1fr) 44px;gap:8px;align-items:center;margin-bottom:6px;font-size:14px;color:var(--ink)"><span>${tok}</span><span style="height:14px;border:1px solid var(--frame)"><i style="display:block;height:100%;width:${pr * 100}%;background:${i === 0 ? 'var(--accent)' : 'var(--frame)'}"></i></span><span style="font-family:var(--mono);font-size:12px;text-align:right">${pr.toFixed(2)}</span></div>`).join('') +
            `<div style="font-size:12px;color:var(--muted)">${T.candNote}</div>`;
        }
        if (p === 5) data.innerHTML = `<div style="font-size:12px;color:var(--muted);margin-bottom:6px">${T.answerLabel}</div><div style="font-size:18px;color:var(--ink)">${answer.map((r, i) => i === answer.length - 1 ? `<span style="background:var(--accent);color:var(--paper);padding:0 3px">${r.cands[0][0]}</span>` : r.cands[0][0]).join('')}</div>`;
      }
      async function step(fast) {
        if (finished) { reset(); term.log(T.restart); }
        pipe.set(phase);
        if (phase === 0) { show(0); term.log(T.l0); }
        if (phase === 1) { show(1); term.log(T.l1); }
        if (phase === 2) { show(2); headDone = 1; term.log(T.l2(PROMPT.length)); }
        if (phase === 3) {
          lastIn = M.engineInput(PROMPT.length, gen); stats();
          term.log(T.l3(lastIn));
          for (let l = 0; l <= 48; l += fast ? 48 : 4) { show(3, l); await ctx.sleep(fast ? 0 : 35); }
        }
        if (phase === 4) { show(4); const c = ROUNDS[gen].cands[0]; term.log(T.l4(c[0], c[1].toFixed(2))); }
        if (phase === 5) {
          answer.push(ROUNDS[gen]); gen++; show(5);
          term.log(T.l5(ROUNDS[gen - 1].id, ROUNDS[gen - 1].cands[0][0], answerText()));
          if (gen < ROUNDS.length) { phase = 2; term.log(T.loop(gen)); }
          else { finished = true; term.log(T.done(gen)); $('.viz-verdict').hidden = false; }
        }
        phase++;
        stats();
      }
      function reset() {
        phase = 0; gen = 0; headDone = 0; finished = false; lastIn = null; answer.length = 0;
        data.innerHTML = ''; pipe.set(-1); $('.viz-verdict').hidden = true; stats();
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      stepBtn.onclick = () => guard(() => step(false));
      autoBtn.onclick = () => guard(async () => {
        if (finished) { reset(); term.log(T.restart); }
        while (!finished) { await step(ctx.reduced); await ctx.sleep(380); }
      });
      resetBtn.onclick = () => guard(async () => { reset(); term.clear(); term.log(T.ready); });
      stats();
    },
  });

  Viz.register('first-token-wait', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.wCode, title: T.wTitle, tag: T.wTag, intro: T.wIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.wLgPre, glow: true },
        { color: 'var(--a2)', text: T.wLgDec },
      ]) + `<div class="viz-cols"><div class="viz-left">
        <div style="position:relative;height:30px;border:1px solid var(--frame);background:var(--side)"><i class="ft-pre" style="position:absolute;left:0;top:0;bottom:0;width:0;background:var(--accent);box-shadow:var(--glow)"></i><i class="ft-dec" style="position:absolute;top:0;bottom:0;width:0;background:var(--a2)"></i></div>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:6px"><span>t = 0</span><span class="ft-clk">${T.wClock('0.0')}</span></div>
        <div class="viz-slider"><label>${T.wLen}</label><input class="ft-len" type="range" min="0" max="${M.SPEEDS.length - 1}" value="1" aria-label="${Viz.esc(T.wLen)}"><output class="ft-len-o"></output></div>
        <div class="viz-slider"><label>${T.wAns}</label><input class="ft-ans" type="range" min="50" max="1000" step="50" value="300" aria-label="${Viz.esc(T.wAns)}"><output class="ft-ans-o"></output></div>
        <div class="viz-row">${Viz.button(T.wGo)}</div>
        <p style="font-size:12.5px;color:var(--muted);line-height:1.7;margin:12px 0 0">${T.wNote}</p>
      </div><div class="viz-right"></div></div>`);
      const right = body.querySelector('.viz-right');
      right.innerHTML =
        Viz.stat({ id: 'ft-first', k: T.wFirst, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'ft-ans', k: T.wAnsK, v: '', f: '' }) +
        Viz.stat({ id: 'ft-share', k: T.wShareK, v: '', f: T.wShareF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.wTry) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const len = $('.ft-len'), ans = $('.ft-ans'), pre = $('.ft-pre'), dec = $('.ft-dec'), verdict = $('.viz-verdict');
      let run = 0;
      const cur = () => M.waitTimes(+len.value, +ans.value);
      function paint(frac) {
        const w = cur(), split = w.firstS / w.totalS;
        pre.style.width = Math.min(frac, split) * 100 + '%';
        dec.style.left = split * 100 + '%';
        dec.style.width = Math.max(0, frac - split) * 100 + '%';
        $('.ft-clk').textContent = T.wClock((frac * w.totalS).toFixed(1));
      }
      function stats() {
        const w = cur();
        $('.ft-len-o').textContent = M.SPEEDS[+len.value].k + 'K';
        $('.ft-ans-o').textContent = ans.value;
        $('[data-s=ft-first-v]').textContent = T.sec(w.firstS.toFixed(1));
        $('[data-s=ft-first-f]').innerHTML = T.wFirstF(Viz.fmt(w.promptTokens), Viz.fmt(w.prefill));
        $('[data-s=ft-ans-v]').textContent = T.sec(w.answerS.toFixed(1));
        $('[data-s=ft-ans-f]').innerHTML = T.wAnsF(ans.value, w.decode.toFixed(1));
        $('[data-s=ft-share-v]').textContent = (w.firstS / w.totalS * 100).toFixed(0) + '%';
        verdict.innerHTML = T.wVerdict(Viz.fmt(w.promptTokens), w.firstS.toFixed(1), ans.value, w.answerS.toFixed(1), (w.prefill / w.decode).toFixed(0));
      }
      function play() {
        const id = ++run, t0 = performance.now(), dur = 2400;
        verdict.hidden = true;
        const tick = now => {
          if (id !== run) return;
          const f = ctx.reduced ? 1 : Math.min(1, (now - t0) / dur);
          paint(f);
          if (f < 1) ctx.raf(tick); else verdict.hidden = false;
        };
        ctx.raf(tick);
      }
      len.oninput = ans.oninput = () => { run++; stats(); paint(1); verdict.hidden = true; };
      $('.viz-btn').onclick = play;
      stats(); paint(1);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
