/* Chapter 23 widgets: SSE bytes cut into random chunks, and the tag hold-back parser.
   All visible text lives in the T tables below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.sse;

  const T = Viz.t({
    zh: {
      wireDeltas: ['你好', '，', null, '世界', '！'],
      code: 'SSE_WIRE', title: '字节切片器', tag: '教学推演 · 分片大小为随机数',
      intro: '服务器写出 4 条带中文的事件、1 条保活注释和结尾的 <code>[DONE]</code>，共 126 字节。网络把它切成大小随机的块送来。按 <b>单步</b> 每次收一块，对比两个客户端：<b>粗心的</b>每块单独解码、单独解析；<b>正确的</b>先增量解码 UTF-8，再按空行分帧，最后才 JSON 解析。',
      lgWait: '还没到达的字节', lgGot: '已经到达的字节', lgNow: '这一次到达的块', lgHeld: '被扣住的半个汉字',
      steps: ['收到一块', 'UTF-8 解码', '按空行分帧', 'JSON 解析'],
      stripLabel: '126 字节的 SSE 字节流，每格一个字节',
      bStep: '▶ 单步', bAll: '▶▶ 全部收完', bSeed: '换一种切法', bReset: '重置',
      sizeLabel: '每块最多几个字节',
      naiveH: '粗心的客户端：每块单独处理', rightH: '正确的客户端：先攒齐再处理',
      naiveSub: (b, e) => `乱码 ${b} 个 · 解析失败 ${e} 次`, rightSub: (h, p) => `扣住 ${h} 字节 · 缓冲里 ${p} 个字符待分帧`,
      empty: '（还没有文字）',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 收第一块字节',
      readyShort: '<span class="c">$</span> ready.',
      lChunk: (i, n, hex) => `<span class="c">[块 ${i}]</span> ${n} 字节：${hex}`,
      lRight: (txt, held) => `<span class="y">正确</span>：解出 ${txt}${held ? `，扣住 ${held} 字节等下一块` : ''}`,
      lFrame: (n, d) => `<span class="y">正确</span>：遇到空行，分出 ${n} 个完整事件${d ? `，JSON 解析得到 ${d}` : ''}`,
      lNaive: (txt, b, e) => `<span class="m">粗心</span>：这块单独解码成 ${txt}${b ? `，出现 ${b} 个乱码 �` : ''}${e ? `，${e} 行 data 解析失败` : ''}`,
      quote: s => '“' + s.replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '”',
      nothing: '（空）',
      done: '<span class="y">完成</span>：126 字节全部到达',
      sBytesK: '已到达的字节', sBytesF: (n, c) => `<b>= 共 126 字节，分成 ${c} 块</b><br>块的大小由网络决定，和事件、汉字的边界无关`,
      sHeldK: '正确客户端此刻扣住的字节', sHeldF: '<b>中文一个字占 3 字节</b><br>块的末尾若只到了前 1–2 个字节，先扣住，等下一块补齐',
      sLostK: '粗心客户端丢失的文字', sLostF: (got) => `<b>= 6 个字 − 显示正确的 ${got} 个</b><br>完整答案：你好，世界！`,
      verdict: (naive, right, c) => `① 同样 126 字节、同样的 ${c} 块，粗心的客户端显示 <b>${naive}</b>，正确的显示 <b>${right}</b>。<br>② 正确做法有三道门：先把字节拼成完整的字，再用空行切出完整事件，最后才解析 JSON。<br>③ 换一种切法，粗心的错法会变，正确的结果永远不变。这种时有时无的 bug，靠“本机试一下没问题”是发现不了的。`,
      try: [
        '把 <b>每块最多几个字节</b> 拉到 <b>1</b>，按 <b>全部收完</b>：每块只有 1 个字节，粗心的客户端一个汉字也拼不出来。能看出：一个汉字确实被拆成了 3 个字节。',
        '拉到 <b>64</b> 再收几次：块变大后，粗心的客户端能拼出一部分字，但总有几个丢掉。能看出：块越大，bug 越隐蔽；本机测试时整段回答常常一次到齐，看起来一切正常。',
        '保持 7，连按几次 <b>换一种切法</b>：粗心的错法每次不同，正确的结果始终是“你好，世界！”。',
      ],

      hDeltas: ['我先想', '一想。</th', 'ink>好的，', '我查一下天气。<tool', '_call><function=get_weather><parameter=city>杭州</parameter></function></tool_', 'call>'],
      hCode: 'TAG_HOLDBACK', hTitle: '标签扣留器', hTag: '教学简化 · 参照 serve/frontend.py 的 OutputParser',
      hIntro: '模型的输出是一段段文字，里面夹着 <code>&lt;/think&gt;</code>、<code>&lt;tool_call&gt;</code> 这样的标签。标签可能被切成两半，分在两个片段里。按 <b>单步</b> 送入下一个片段，看解析器怎样扣住“可能是标签开头”的尾巴，把思考、正文、工具调用分开。',
      hLgReason: '思考（reasoning）', hLgContent: '正文（content）', hLgTool: '工具调用（完整后才发出）', hLgHeld: '被扣住、暂不发出的尾巴',
      hSteps: ['片段 1', '片段 2', '片段 3', '片段 4', '片段 5', '片段 6'],
      hReason: '思考', hContent: '正文', hTool: '工具调用', hHeld: '扣住', hNaive: '粗心的做法：收到什么就显示什么',
      hBStep: '▶ 单步', hBReset: '重置',
      hReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 送入第一个片段',
      hFeed: (i, s) => `<span class="c">[片段 ${i}]</span> 收到 ${s}`,
      hEv: (k, s) => `<span class="y">发出</span> ${k}：${s}`,
      hKeep: s => `<span class="m">扣住</span> ${s}：它可能是某个标签的开头，下一片到了才知道`,
      hToolWait: s => `<span class="m">攒着</span> ${s}：工具调用还没写完，参数可能不全，先不交出`,
      hToolDone: (name, args) => `<span class="w">工具调用完整</span>：${name}(${args})，现在才交给客户端`,
      hEnd: '<span class="y">完成</span>：6 个片段全部处理完，没有半个标签漏出去',
      kinds: { reasoning: '思考', content: '正文', tool: '工具调用' },
      hHeldK: '此刻扣住的字符', hHeldF: '<b>只扣“可能是标签开头”的尾巴</b><br>其余文字立刻发出，不拖慢显示',
      hLeakK: '粗心做法漏到屏幕上的标签', hLeakF: '<b>思考结束、工具调用的开始和结束</b><br>本该是给程序看的记号',
      hVerdict: '① 片段的边界由分词和解码决定，可能正好切在标签中间。<br>② 解析器只扣住可能是标签开头的那几个字符，其余文字照常立刻发出。<br>③ 完整的工具调用要等结束标签到了才发出：参数不全的调用不能拿去执行。真实的 OutputParser 还会边写边报告工具名和参数片段，好让客户端显示进度，本组件省略了这一步。',
      hTry: [
        '按两次 <b>单步</b>：第 2 片以 <code>&lt;/th</code> 结尾，它被扣住了。能看出：解析器宁可晚发几个字，也不发半个标签。',
        '对比下方 <b>粗心的做法</b>：标签原样漏到了屏幕上，思考和正文也混在一起。',
        '一直按到第 6 片：完整的工具调用要等 <code>&lt;/tool_call&gt;</code> 到了才发出。想一想：参数只到一半时就去执行，会发生什么？',
      ],
    },
    en: {
      wireDeltas: ['你好', '，', null, '世界', '！'],
      code: 'SSE_WIRE', title: 'Byte slicer', tag: 'Teaching estimate · random chunk sizes',
      intro: 'The server writes 4 events carrying Chinese text ("Hello, world!"), 1 keep-alive comment and a final <code>[DONE]</code>: 126 bytes in all. The network cuts them into chunks of random size. Press <b>Step</b> to receive one chunk at a time and compare two clients: the <b>careless</b> one decodes and parses each chunk on its own; the <b>correct</b> one first decodes UTF-8 incrementally, then frames events at blank lines, and only then parses JSON.',
      lgWait: 'Bytes not yet arrived', lgGot: 'Bytes already arrived', lgNow: 'The chunk that just arrived', lgHeld: 'Half a Chinese character, held back',
      steps: ['Receive a chunk', 'UTF-8 decode', 'Frame at blank lines', 'JSON parse'],
      stripLabel: 'The 126-byte SSE stream, one cell per byte',
      bStep: '▶ Step', bAll: '▶▶ Receive all', bSeed: 'Cut it differently', bReset: 'Reset',
      sizeLabel: 'Max bytes per chunk',
      naiveH: 'Careless client: handles each chunk alone', rightH: 'Correct client: collects first, then handles',
      naiveSub: (b, e) => `${b} garbled · ${e} parse failures`, rightSub: (h, p) => `${h} bytes held · ${p} characters waiting to be framed`,
      empty: '(no text yet)',
      ready: '<span class="c">$</span> ready. Press [ ▶ Step ] to receive the first chunk',
      readyShort: '<span class="c">$</span> ready.',
      lChunk: (i, n, hex) => `<span class="c">[chunk ${i}]</span> ${n} bytes: ${hex}`,
      lRight: (txt, held) => `<span class="y">Correct</span>: decoded ${txt}${held ? `; holding ${held} bytes for the next chunk` : ''}`,
      lFrame: (n, d) => `<span class="y">Correct</span>: blank line found, ${n} complete events framed${d ? `; JSON parse gives ${d}` : ''}`,
      lNaive: (txt, b, e) => `<span class="m">Careless</span>: this chunk alone decodes to ${txt}${b ? `; ${b} garbled �` : ''}${e ? `; ${e} data lines failed to parse` : ''}`,
      quote: s => '"' + s.replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"',
      nothing: '(empty)',
      done: '<span class="y">Done</span>: all 126 bytes have arrived',
      sBytesK: 'Bytes arrived', sBytesF: (n, c) => `<b>= 126 bytes in all, in ${c} chunks</b><br>The network picks the chunk sizes; they ignore event and character boundaries`,
      sHeldK: 'Bytes the correct client is holding now', sHeldF: '<b>One Chinese character takes 3 bytes</b><br>If a chunk ends after only 1–2 of them, hold them until the next chunk completes the character',
      sLostK: 'Characters the careless client lost', sLostF: (got) => `<b>= 6 characters − ${got} shown correctly</b><br>The full answer is six Chinese characters: "Hello, world!"`,
      verdict: (naive, right, c) => `① Same 126 bytes, same ${c} chunks: the careless client shows <b>${naive}</b>, the correct one shows <b>${right}</b>.<br>② The correct approach has three gates: first join bytes into whole characters, then cut complete events at blank lines, and only then parse JSON.<br>③ Cut the stream differently and the careless client fails differently, while the correct result never changes. A bug that comes and goes like this never shows up in "I tried it on my machine and it was fine".`,
      try: [
        'Drag <b>Max bytes per chunk</b> to <b>1</b> and press <b>Receive all</b>: each chunk holds 1 byte, and the careless client cannot rebuild a single Chinese character. You can see that each Chinese character really is split into 3 bytes.',
        'Drag it to <b>64</b> and receive a few times: with bigger chunks the careless client gets some characters right, but always loses a few. You can see that bigger chunks hide the bug better; in local testing the whole answer often arrives in one go and everything looks fine.',
        'Keep it at 7 and press <b>Cut it differently</b> a few times: the careless client fails differently each time, while the correct client always shows the same six characters.',
      ],

      hDeltas: ['Let me ', 'think. </th', 'ink>Sure, ', 'I will check the weather. <tool', '_call><function=get_weather><parameter=city>Hangzhou</parameter></function></tool_', 'call>'],
      hCode: 'TAG_HOLDBACK', hTitle: 'Tag hold-back', hTag: 'Simplified · based on OutputParser in serve/frontend.py',
      hIntro: 'The model\'s output arrives as pieces of text with tags such as <code>&lt;/think&gt;</code> and <code>&lt;tool_call&gt;</code> mixed in. A tag can be cut in half across two fragments. Press <b>Step</b> to feed the next fragment and watch the parser hold any tail that "might start a tag", and separate thinking, answer text and tool calls.',
      hLgReason: 'Thinking (reasoning)', hLgContent: 'Answer (content)', hLgTool: 'Tool call (sent only when complete)', hLgHeld: 'Tail held back, not sent yet',
      hSteps: ['Fragment 1', 'Fragment 2', 'Fragment 3', 'Fragment 4', 'Fragment 5', 'Fragment 6'],
      hReason: 'Thinking', hContent: 'Answer', hTool: 'Tool call', hHeld: 'Held', hNaive: 'Careless approach: show whatever arrives',
      hBStep: '▶ Step', hBReset: 'Reset',
      hReady: '<span class="c">$</span> ready. Press [ ▶ Step ] to feed the first fragment',
      hFeed: (i, s) => `<span class="c">[fragment ${i}]</span> received ${s}`,
      hEv: (k, s) => `<span class="y">Send</span> ${k}: ${s}`,
      hKeep: s => `<span class="m">Hold</span> ${s}: it might be the start of a tag; we only know once the next fragment arrives`,
      hToolWait: s => `<span class="m">Collect</span> ${s}: the tool call is not finished and its arguments may be incomplete, so do not hand it over yet`,
      hToolDone: (name, args) => `<span class="w">Tool call complete</span>: ${name}(${args}); only now does it go to the client`,
      hEnd: '<span class="y">Done</span>: all 6 fragments handled, and not one half tag leaked out',
      kinds: { reasoning: 'thinking', content: 'answer', tool: 'tool call' },
      hHeldK: 'Characters held right now', hHeldF: '<b>Only the tail that "might start a tag" is held</b><br>All other text goes out at once, so the display does not slow down',
      hLeakK: 'Tags the careless approach leaks to the screen', hLeakF: '<b>End of thinking, start and end of the tool call</b><br>Markers that were meant for programs only',
      hVerdict: '① Fragment boundaries are set by tokenization and decoding, and can fall right in the middle of a tag.<br>② The parser holds only the few characters that might start a tag; all other text goes out at once as usual.<br>③ A complete tool call goes out only after its closing tag arrives: a call with incomplete arguments must not be executed. The real OutputParser also reports the tool name and argument pieces while they are being written, so the client can show progress; this widget leaves that step out.',
      hTry: [
        'Press <b>Step</b> twice: fragment 2 ends with <code>&lt;/th</code>, and it is held. You can see that the parser would rather send a few characters late than send half a tag.',
        'Compare with the <b>Careless approach</b> below: the tags leak to the screen as they are, and thinking and answer get mixed together.',
        'Keep going to fragment 6: the complete tool call goes out only when <code>&lt;/tool_call&gt;</code> arrives. Think about it: what would happen if you executed the call with only half of its arguments?',
      ],
    },
    es: {
      wireDeltas: ['你好', '，', null, '世界', '！'],
      code: 'SSE_WIRE', title: 'Cortador de bytes', tag: 'Estimación didáctica · tamaños de bloque aleatorios',
      intro: 'El servidor escribe 4 eventos con texto chino («¡Hola, mundo!»), 1 comentario keep-alive y un <code>[DONE]</code> final: 126 bytes en total. La red los corta en bloques de tamaño aleatorio. Pulsa <b>Paso</b> para recibir un bloque cada vez y compara dos clientes. El <b>descuidado</b> decodifica y analiza cada bloque por separado. El <b>correcto</b> primero decodifica UTF-8 de forma incremental, luego enmarca los eventos en las líneas en blanco y solo al final analiza el JSON.',
      lgWait: 'Bytes que aún no llegaron', lgGot: 'Bytes que ya llegaron', lgNow: 'El bloque que acaba de llegar', lgHeld: 'Medio carácter chino, retenido',
      steps: ['Recibir un bloque', 'Decodificar UTF-8', 'Enmarcar en líneas en blanco', 'Analizar JSON'],
      stripLabel: 'El flujo SSE de 126 bytes, una celda por byte',
      bStep: '▶ Paso', bAll: '▶▶ Recibir todo', bSeed: 'Cortar de otra forma', bReset: 'Reiniciar',
      sizeLabel: 'Máx. de bytes por bloque',
      naiveH: 'Cliente descuidado: trata cada bloque por separado', rightH: 'Cliente correcto: reúne primero y trata después',
      naiveSub: (b, e) => `${b} caracteres rotos · ${e} fallos de análisis`, rightSub: (h, p) => `${h} bytes retenidos · ${p} caracteres esperando enmarcado`,
      empty: '(aún sin texto)',
      ready: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para recibir el primer bloque',
      readyShort: '<span class="c">$</span> ready.',
      lChunk: (i, n, hex) => `<span class="c">[bloque ${i}]</span> ${n} bytes: ${hex}`,
      lRight: (txt, held) => `<span class="y">Correcto</span>: decodificó ${txt}${held ? `; retiene ${held} bytes para el bloque siguiente` : ''}`,
      lFrame: (n, d) => `<span class="y">Correcto</span>: línea en blanco, ${n} eventos completos enmarcados${d ? `; el análisis JSON da ${d}` : ''}`,
      lNaive: (txt, b, e) => `<span class="m">Descuidado</span>: este bloque solo se decodifica como ${txt}${b ? `; ${b} caracteres rotos �` : ''}${e ? `; ${e} líneas data no se pudieron analizar` : ''}`,
      quote: s => '«' + s.replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '»',
      nothing: '(vacío)',
      done: '<span class="y">Listo</span>: llegaron los 126 bytes',
      sBytesK: 'Bytes llegados', sBytesF: (n, c) => `<b>= 126 bytes en total, en ${c} bloques</b><br>La red elige el tamaño de los bloques; no respeta los límites de eventos ni de caracteres`,
      sHeldK: 'Bytes que retiene ahora el cliente correcto', sHeldF: '<b>Un carácter chino ocupa 3 bytes</b><br>Si un bloque termina tras solo 1 o 2 de ellos, se retienen hasta que el bloque siguiente complete el carácter',
      sLostK: 'Caracteres que perdió el cliente descuidado', sLostF: (got) => `<b>= 6 caracteres − ${got} mostrados bien</b><br>La respuesta completa son seis caracteres chinos: «¡Hola, mundo!»`,
      verdict: (naive, right, c) => `① Los mismos 126 bytes, los mismos ${c} bloques: el cliente descuidado muestra <b>${naive}</b> y el correcto muestra <b>${right}</b>.<br>② El método correcto tiene tres puertas: primero une los bytes en caracteres completos, luego recorta eventos completos en las líneas en blanco y solo al final analiza el JSON.<br>③ Si cortas el flujo de otra forma, el cliente descuidado falla de otra forma, y el resultado correcto no cambia nunca. Un error que va y viene así no aparece nunca con un «lo probé en mi máquina y estaba bien».`,
      try: [
        'Baja <b>Máx. de bytes por bloque</b> a <b>1</b> y pulsa <b>Recibir todo</b>: cada bloque tiene 1 byte y el cliente descuidado no logra reconstruir ni un carácter chino. Se ve que cada carácter chino se divide de verdad en 3 bytes.',
        'Súbelo a <b>64</b> y recibe unas cuantas veces: con bloques más grandes, el cliente descuidado acierta algunos caracteres, pero siempre pierde unos pocos. Se ve que los bloques grandes esconden mejor el error. En las pruebas locales, la respuesta entera suele llegar de una vez y todo parece ir bien.',
        'Déjalo en 7 y pulsa <b>Cortar de otra forma</b> varias veces: el cliente descuidado falla distinto cada vez, y el cliente correcto muestra siempre los mismos seis caracteres.',
      ],

      hDeltas: ['Primero ', 'pienso. </th', 'ink>Claro, ', 'Voy a consultar el clima. <tool', '_call><function=get_weather><parameter=city>Hangzhou</parameter></function></tool_', 'call>'],
      hCode: 'TAG_HOLDBACK', hTitle: 'Retención de etiquetas', hTag: 'Simplificado · basado en OutputParser de serve/frontend.py',
      hIntro: 'La salida del modelo llega como trozos de texto con etiquetas como <code>&lt;/think&gt;</code> y <code>&lt;tool_call&gt;</code> mezcladas. Una etiqueta puede quedar cortada por la mitad entre dos fragmentos. Pulsa <b>Paso</b> para enviar el fragmento siguiente y mira cómo el parser retiene la cola que «podría iniciar una etiqueta» y separa el pensamiento, el texto de la respuesta y las llamadas a herramientas.',
      hLgReason: 'Pensamiento (reasoning)', hLgContent: 'Respuesta (content)', hLgTool: 'Llamada a herramienta (se envía solo completa)', hLgHeld: 'Cola retenida, aún sin enviar',
      hSteps: ['Fragmento 1', 'Fragmento 2', 'Fragmento 3', 'Fragmento 4', 'Fragmento 5', 'Fragmento 6'],
      hReason: 'Pensamiento', hContent: 'Respuesta', hTool: 'Llamada a herramienta', hHeld: 'Retenido', hNaive: 'Método descuidado: mostrar lo que llegue',
      hBStep: '▶ Paso', hBReset: 'Reiniciar',
      hReady: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para enviar el primer fragmento',
      hFeed: (i, s) => `<span class="c">[fragmento ${i}]</span> recibido ${s}`,
      hEv: (k, s) => `<span class="y">Enviar</span> ${k}: ${s}`,
      hKeep: s => `<span class="m">Retener</span> ${s}: podría ser el inicio de una etiqueta; solo se sabrá cuando llegue el fragmento siguiente`,
      hToolWait: s => `<span class="m">Reunir</span> ${s}: la llamada a la herramienta no ha terminado y sus argumentos pueden estar incompletos, así que aún no se entrega`,
      hToolDone: (name, args) => `<span class="w">Llamada a herramienta completa</span>: ${name}(${args}); solo ahora pasa al cliente`,
      hEnd: '<span class="y">Listo</span>: se trataron los 6 fragmentos y no se filtró ni una etiqueta a medias',
      kinds: { reasoning: 'pensamiento', content: 'respuesta', tool: 'llamada a herramienta' },
      hHeldK: 'Caracteres retenidos ahora', hHeldF: '<b>Solo se retiene la cola que «podría iniciar una etiqueta»</b><br>Todo el demás texto sale de inmediato, así que la pantalla no se retrasa',
      hLeakK: 'Etiquetas que el método descuidado filtra a la pantalla', hLeakF: '<b>Fin del pensamiento, inicio y fin de la llamada a la herramienta</b><br>Marcas pensadas solo para programas',
      hVerdict: '① Los límites de los fragmentos los fijan la tokenización y la decodificación, y pueden caer justo en medio de una etiqueta.<br>② El parser retiene solo los pocos caracteres que podrían iniciar una etiqueta; todo el demás texto sale de inmediato, como siempre.<br>③ Una llamada a herramienta completa sale solo cuando llega su etiqueta de cierre: una llamada con argumentos incompletos no debe ejecutarse. El OutputParser real también informa del nombre de la herramienta y de los trozos de argumentos mientras se escriben, para que el cliente pueda mostrar el progreso. Este componente omite ese paso.',
      hTry: [
        'Pulsa <b>Paso</b> dos veces: el fragmento 2 termina en <code>&lt;/th</code> y queda retenido. Se ve que el parser prefiere enviar unos caracteres tarde antes que enviar media etiqueta.',
        'Compáralo con el <b>método descuidado</b> de abajo: las etiquetas se filtran a la pantalla tal cual, y el pensamiento y la respuesta se mezclan.',
        'Sigue hasta el fragmento 6: la llamada a la herramienta completa sale solo cuando llega <code>&lt;/tool_call&gt;</code>. Piensa: ¿qué pasaría si ejecutaras la llamada con solo la mitad de sus argumentos?',
      ],
    },
    ko: {
      wireDeltas: ['你好', '，', null, '世界', '！'],
      code: 'SSE_WIRE', title: '바이트 슬라이서', tag: '교육용 추정 · 조각 크기는 난수',
      intro: '서버가 중국어 문장이 든 이벤트 4개(「안녕하세요, 세상!」), keep-alive 주석 1개, 마지막 <code>[DONE]</code>을 써요. 모두 126바이트예요. 네트워크는 이것을 제멋대로 크기가 다른 덩어리로 잘라 보내요. <b>한 단계</b>를 눌러 한 덩어리씩 받으면서 두 클라이언트를 비교해 보세요. <b>부주의한</b> 클라이언트는 덩어리마다 따로 디코딩하고 따로 파싱해요. <b>올바른</b> 클라이언트는 먼저 UTF-8을 점진적으로 디코딩하고, 빈 줄에서 프레임을 나눈 뒤, 마지막에야 JSON을 파싱해요.',
      lgWait: '아직 도착하지 않은 바이트', lgGot: '이미 도착한 바이트', lgNow: '이번에 도착한 덩어리', lgHeld: '보류 중인 한자의 일부',
      steps: ['덩어리 수신', 'UTF-8 디코딩', '빈 줄로 프레임 나누기', 'JSON 파싱'],
      stripLabel: '126바이트 SSE 바이트 스트림 (칸 하나가 1바이트)',
      bStep: '▶ 한 단계', bAll: '▶▶ 모두 받기', bSeed: '다르게 자르기', bReset: '초기화',
      sizeLabel: '덩어리당 최대 바이트 수',
      naiveH: '부주의한 클라이언트: 덩어리마다 따로 처리', rightH: '올바른 클라이언트: 먼저 모은 뒤 처리',
      naiveSub: (b, e) => `깨진 글자 ${b}개 · 파싱 실패 ${e}번`, rightSub: (h, p) => `보류 ${h}바이트 · 프레임 대기 중인 문자 ${p}개`,
      empty: '(아직 글자 없음)',
      ready: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 눌러 첫 덩어리를 받으세요',
      readyShort: '<span class="c">$</span> ready.',
      lChunk: (i, n, hex) => `<span class="c">[덩어리 ${i}]</span> ${n}바이트: ${hex}`,
      lRight: (txt, held) => `<span class="y">올바름</span>: 디코딩 결과 ${txt}${held ? `. 다음 덩어리를 위해 ${held}바이트 보류` : ''}`,
      lFrame: (n, d) => `<span class="y">올바름</span>: 빈 줄을 만나 완전한 이벤트 ${n}개로 나눔${d ? `. JSON 파싱 결과 ${d}` : ''}`,
      lNaive: (txt, b, e) => `<span class="m">부주의</span>: 이 덩어리만 디코딩하면 ${txt}${b ? `. 깨진 글자 � ${b}개` : ''}${e ? `. data 줄 ${e}개 파싱 실패` : ''}`,
      quote: s => '"' + s.replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"',
      nothing: '(비어 있음)',
      done: '<span class="y">완료</span>: 126바이트가 모두 도착했어요',
      sBytesK: '도착한 바이트', sBytesF: (n, c) => `<b>= 모두 126바이트, ${c}덩어리</b><br>덩어리 크기는 네트워크가 정해요. 이벤트나 글자의 경계와는 상관없어요`,
      sHeldK: '올바른 클라이언트가 지금 보류 중인 바이트', sHeldF: '<b>한자 한 글자는 3바이트예요</b><br>덩어리 끝에 앞의 1~2바이트만 왔다면 보류하고, 다음 덩어리가 나머지를 채울 때까지 기다려요',
      sLostK: '부주의한 클라이언트가 잃은 글자', sLostF: (got) => `<b>= 6글자 − 올바르게 표시된 ${got}글자</b><br>전체 정답은 한자 여섯 글자예요: 「안녕하세요, 세상!」`,
      verdict: (naive, right, c) => `① 같은 126바이트, 같은 ${c}덩어리인데 부주의한 클라이언트는 <b>${naive}</b>, 올바른 클라이언트는 <b>${right}</b>를 보여 줘요.<br>② 올바른 방법에는 문이 세 개 있어요. 먼저 바이트를 이어 온전한 글자로 만들고, 빈 줄로 완전한 이벤트를 잘라 낸 뒤, 마지막에야 JSON을 파싱해요.<br>③ 자르는 방식이 바뀌면 부주의한 쪽은 틀리는 모양이 달라지고, 올바른 쪽 결과는 늘 같아요. 이렇게 나타났다 사라지는 버그는 「내 컴퓨터에서 해 보니 괜찮던데」로는 절대 못 찾아요.`,
      try: [
        '<b>덩어리당 최대 바이트 수</b>를 <b>1</b>로 내리고 <b>모두 받기</b>를 눌러 보세요. 덩어리마다 1바이트뿐이라 부주의한 클라이언트는 한자를 하나도 조립하지 못해요. 한자 한 글자가 정말 3바이트로 쪼개진다는 걸 볼 수 있어요.',
        '<b>64</b>로 올리고 몇 번 받아 보세요. 덩어리가 커지면 부주의한 클라이언트도 일부 글자는 맞히지만 몇 글자는 꼭 잃어요. 덩어리가 클수록 버그가 더 잘 숨는다는 걸 볼 수 있어요. 내 컴퓨터에서 테스트하면 답변 전체가 한 번에 도착하는 일이 많아서 아무 문제 없어 보여요.',
        '7로 둔 채 <b>다르게 자르기</b>를 몇 번 눌러 보세요. 부주의한 클라이언트는 번번이 다르게 틀리고, 올바른 클라이언트는 늘 같은 여섯 글자를 보여 줘요.',
      ],

      hDeltas: ['먼저 ', '생각 중. </th', 'ink>좋아요, ', '날씨를 확인할게요. <tool', '_call><function=get_weather><parameter=city>항저우</parameter></function></tool_', 'call>'],
      hCode: 'TAG_HOLDBACK', hTitle: '태그 보류기', hTag: '교육용 단순화 · serve/frontend.py의 OutputParser 참고',
      hIntro: '모델의 출력은 조각조각 도착하는 글이고, 그 안에 <code>&lt;/think&gt;</code>, <code>&lt;tool_call&gt;</code> 같은 태그가 섞여 있어요. 태그가 반으로 잘려 두 조각에 나뉘어 올 수도 있어요. <b>한 단계</b>를 눌러 다음 조각을 넣으면서, 파서가 「태그의 시작일 수도 있는」 꼬리를 어떻게 붙잡아 두고 생각, 본문, 도구 호출을 갈라내는지 보세요.',
      hLgReason: '생각(reasoning)', hLgContent: '본문(content)', hLgTool: '도구 호출(완성된 뒤에만 전송)', hLgHeld: '보류 중이라 아직 보내지 않은 꼬리',
      hSteps: ['조각 1', '조각 2', '조각 3', '조각 4', '조각 5', '조각 6'],
      hReason: '생각', hContent: '본문', hTool: '도구 호출', hHeld: '보류', hNaive: '부주의한 방식: 받은 대로 바로 표시',
      hBStep: '▶ 한 단계', hBReset: '초기화',
      hReady: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 눌러 첫 조각을 넣으세요',
      hFeed: (i, s) => `<span class="c">[조각 ${i}]</span> 수신: ${s}`,
      hEv: (k, s) => `<span class="y">전송</span> ${k}: ${s}`,
      hKeep: s => `<span class="m">보류</span> ${s}: 태그의 시작일 수도 있어서, 다음 조각이 와야 알 수 있어요`,
      hToolWait: s => `<span class="m">모으는 중</span> ${s}: 도구 호출이 아직 끝나지 않았고 인자가 덜 왔을 수 있어서, 아직 넘기지 않아요`,
      hToolDone: (name, args) => `<span class="w">도구 호출 완성</span>: ${name}(${args}). 이제야 클라이언트에 넘겨요`,
      hEnd: '<span class="y">완료</span>: 조각 6개를 모두 처리했고, 반쪽짜리 태그는 하나도 새어 나가지 않았어요',
      kinds: { reasoning: '생각', content: '본문', tool: '도구 호출' },
      hHeldK: '지금 보류 중인 문자', hHeldF: '<b>「태그의 시작일 수도 있는」 꼬리만 보류해요</b><br>나머지 글은 바로 내보내서 화면이 느려지지 않아요',
      hLeakK: '부주의한 방식에서 화면으로 새어 나온 태그', hLeakF: '<b>생각의 끝, 도구 호출의 시작과 끝</b><br>원래 프로그램만 보라고 만든 표시예요',
      hVerdict: '① 조각의 경계는 토큰화와 디코딩이 정해요. 태그 한가운데가 잘릴 수도 있어요.<br>② 파서는 태그의 시작일 수도 있는 문자 몇 개만 보류하고, 나머지 글은 평소처럼 바로 내보내요.<br>③ 완성된 도구 호출은 닫는 태그가 도착한 뒤에야 내보내요. 인자가 덜 온 호출은 실행하면 안 돼요. 실제 OutputParser는 도구 이름과 인자 조각도 쓰는 도중에 알려서 클라이언트가 진행 상황을 보여 줄 수 있게 해요. 이 컴포넌트는 그 단계를 생략했어요.',
      hTry: [
        '<b>한 단계</b>를 두 번 눌러 보세요. 조각 2는 <code>&lt;/th</code>로 끝나고, 그것이 보류돼요. 파서는 반쪽짜리 태그를 보내느니 몇 글자 늦게 보내는 쪽을 택한다는 걸 볼 수 있어요.',
        '아래 <b>부주의한 방식</b>과 비교해 보세요. 태그가 그대로 화면에 새고, 생각과 본문도 뒤섞여요.',
        '조각 6까지 계속 눌러 보세요. 완성된 도구 호출은 <code>&lt;/tool_call&gt;</code>이 도착해야 나가요. 생각해 보세요. 인자가 반만 왔는데 호출을 실행하면 어떻게 될까요?',
      ],
    },
    ja: {
      wireDeltas: ['你好', '，', null, '世界', '！'],
      code: 'SSE_WIRE', title: 'バイトスライサー', tag: '教育用の試算 · チャンクの大きさはランダム',
      intro: 'サーバーは、中国語を含む 4 つのイベント、1 つのキープアライブコメント、最後の <code>[DONE]</code> を書き出します。合計 126 バイトです。ネットワークはそれを、ランダムな大きさの塊に切って送ってきます。<b>1 ステップ</b>を押すたびに 1 つ受信し、2 つのクライアントを比べます。<b>不注意な</b>クライアントは、塊ごとに単独でデコードして解析します。<b>正しい</b>クライアントは、まず UTF-8 をインクリメンタルにデコードし、次に空行でイベントに区切り、最後にようやく JSON を解析します。',
      lgWait: 'まだ届いていないバイト', lgGot: 'すでに届いたバイト', lgNow: '今回届いた塊', lgHeld: '保留中の半分の漢字',
      steps: ['塊を受信', 'UTF-8 デコード', '空行で区切る', 'JSON 解析'],
      stripLabel: '126 バイトの SSE ストリーム（1 マス 1 バイト）',
      bStep: '▶ 1 ステップ', bAll: '▶▶ 全部受信', bSeed: '別の切り方', bReset: 'リセット',
      sizeLabel: '1 塊の最大バイト数',
      naiveH: '不注意なクライアント：塊ごとに単独で処理', rightH: '正しいクライアント：そろえてから処理',
      naiveSub: (b, e) => `文字化け ${b} 個 · 解析失敗 ${e} 回`, rightSub: (h, p) => `保留 ${h} バイト · バッファ内に区切り待ちの ${p} 文字`,
      empty: '（まだ文字がありません）',
      ready: '<span class="c">$</span> ready. [ ▶ 1 ステップ ] を押して、最初の塊を受信します',
      readyShort: '<span class="c">$</span> ready.',
      lChunk: (i, n, hex) => `<span class="c">[塊 ${i}]</span> ${n} バイト：${hex}`,
      lRight: (txt, held) => `<span class="y">正しい</span>：${txt} をデコード${held ? `。${held} バイトを保留して次の塊を待つ` : ''}`,
      lFrame: (n, d) => `<span class="y">正しい</span>：空行を検出し、完全なイベントを ${n} 個に区切る${d ? `。JSON 解析の結果は ${d}` : ''}`,
      lNaive: (txt, b, e) => `<span class="m">不注意</span>：この塊だけをデコードすると ${txt}${b ? `。文字化け � が ${b} 個` : ''}${e ? `。data ${e} 行の解析に失敗` : ''}`,
      quote: s => '「' + s.replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '」',
      nothing: '（空）',
      done: '<span class="y">完了</span>：126 バイトがすべて届きました',
      sBytesK: '届いたバイト', sBytesF: (n, c) => `<b>= 合計 126 バイト、${c} 個の塊に分かれた</b><br>塊の大きさはネットワークが決め、イベントや漢字の境目とは無関係です`,
      sHeldK: '正しいクライアントが今、保留しているバイト', sHeldF: '<b>中国語の漢字は 1 文字 3 バイト</b><br>塊の終わりに最初の 1〜2 バイトしか届いていなければ、保留して次の塊が補うのを待ちます',
      sLostK: '不注意なクライアントが失った文字', sLostF: (got) => `<b>= 6 文字 − 正しく表示された ${got} 文字</b><br>完全な答え：<span lang="zh">你好，世界！</span>`,
      verdict: (naive, right, c) => `① 同じ 126 バイト、同じ ${c} 個の塊で、不注意なクライアントは <b>${naive}</b> と表示し、正しいクライアントは <b>${right}</b> と表示します。<br>② 正しいやり方には 3 つの関門があります。まずバイトを完全な文字につなぎ、次に空行で完全なイベントを切り出し、最後に JSON を解析します。<br>③ 切り方を変えると、不注意なクライアントの間違い方は変わりますが、正しい結果は決して変わりません。こうした出たり出なかったりするバグは、「手元で試したら問題なかった」では見つかりません。`,
      try: [
        '<b>1 塊の最大バイト数</b>を <b>1</b> にして、<b>全部受信</b>を押します。どの塊も 1 バイトだけなので、不注意なクライアントは漢字を 1 つも組み立てられません。1 つの漢字が本当に 3 バイトに分かれていることが分かります。',
        '<b>64</b> にして、何度か受信してみます。塊が大きくなると、不注意なクライアントも一部の文字は組み立てられますが、必ず何文字か失います。塊が大きいほどバグは見つけにくくなります。手元のテストでは、答え全体が一度にそろうことが多く、すべて順調に見えてしまいます。',
        '7 のままにして、<b>別の切り方</b>を何度か押します。不注意なクライアントの間違い方は毎回違い、正しいクライアントの結果は、いつも「你好，世界！」のままです。',
      ],

      hDeltas: ['まず', '考えた。</th', 'ink>はい、', '天気を調べます。<tool', '_call><function=get_weather><parameter=city>杭州</parameter></function></tool_', 'call>'],
      hCode: 'TAG_HOLDBACK', hTitle: 'タグの保留', hTag: '教育用の簡略化 · serve/frontend.py の OutputParser を参考',
      hIntro: 'モデルの出力は文字の断片で、その中に <code>&lt;/think&gt;</code> や <code>&lt;tool_call&gt;</code> のようなタグが混じっています。タグは半分に切られて、2 つの断片に分かれることがあります。<b>1 ステップ</b>を押して次の断片を入れると、パーサーが「タグの先頭かもしれない」末尾を保留し、思考、本文、ツール呼び出しを分けていく様子が見られます。',
      hLgReason: '思考（reasoning）', hLgContent: '本文（content）', hLgTool: 'ツール呼び出し（完全になってから送る）', hLgHeld: '保留中で、まだ送らない末尾',
      hSteps: ['断片 1', '断片 2', '断片 3', '断片 4', '断片 5', '断片 6'],
      hReason: '思考', hContent: '本文', hTool: 'ツール呼び出し', hHeld: '保留', hNaive: '不注意なやり方：届いたものをそのまま表示',
      hBStep: '▶ 1 ステップ', hBReset: 'リセット',
      hReady: '<span class="c">$</span> ready. [ ▶ 1 ステップ ] を押して、最初の断片を入れます',
      hFeed: (i, s) => `<span class="c">[断片 ${i}]</span> ${s} を受信`,
      hEv: (k, s) => `<span class="y">送信</span> ${k}：${s}`,
      hKeep: s => `<span class="m">保留</span> ${s}：あるタグの先頭かもしれない。次の断片が来るまで分からない`,
      hToolWait: s => `<span class="m">ためる</span> ${s}：ツール呼び出しがまだ書き終わっておらず、引数が不完全かもしれないので、まだ渡さない`,
      hToolDone: (name, args) => `<span class="w">ツール呼び出しが完全になった</span>：${name}(${args})。ここで初めてクライアントに渡す`,
      hEnd: '<span class="y">完了</span>：6 つの断片をすべて処理し、半端なタグは 1 つも漏れませんでした',
      kinds: { reasoning: '思考', content: '本文', tool: 'ツール呼び出し' },
      hHeldK: '今、保留している文字', hHeldF: '<b>保留するのは「タグの先頭かもしれない」末尾だけ</b><br>ほかの文字はすぐ送り出すので、表示は遅くなりません',
      hLeakK: '不注意なやり方で画面に漏れたタグ', hLeakF: '<b>思考の終わり、ツール呼び出しの開始と終了</b><br>本来はプログラム向けの目印です',
      hVerdict: '① 断片の境目はトークナイズとデコードで決まるので、ちょうどタグの真ん中で切れることがあります。<br>② パーサーが保留するのは、タグの先頭かもしれない数文字だけです。ほかの文字は、いつもどおりすぐ送り出します。<br>③ 完全なツール呼び出しは、終了タグが届いてから送り出します。引数が不完全な呼び出しは、実行してはいけません。本物の OutputParser は、書いている途中でもツール名と引数の断片を報告して、クライアントが進み具合を表示できるようにします。このウィジェットでは、その段階を省いています。',
      hTry: [
        '<b>1 ステップ</b>を 2 回押します。断片 2 は <code>&lt;/th</code> で終わっていて、保留されます。パーサーは、半分のタグを送るくらいなら、数文字を遅らせて送るほうを選びます。',
        '下の<b>不注意なやり方</b>と比べます。タグがそのまま画面に漏れ、思考と本文も混ざっています。',
        '断片 6 まで押し続けます。完全なツール呼び出しは、<code>&lt;/tool_call&gt;</code> が届いてから送り出されます。考えてみましょう。引数が半分のうちに実行してしまったら、何が起こるでしょうか。',
      ],
    },
  });

  const box = 'border:1px solid var(--frame);padding:10px 12px;margin-top:10px;background:var(--paper);min-width:0';
  const mono = 'font-family:var(--mono);font-size:14px;line-height:1.7;word-break:break-all;white-space:pre-wrap;color:var(--ink);margin:4px 0 0';

  Viz.register('sse-chunk-split', {
    mount(el, ctx) {
      const DELTAS = T.wireDeltas;
      const bytes = M.utf8(M.wire(DELTAS));
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgWait },
        { color: 'var(--accent)', text: T.lgGot },
        { color: 'var(--a2)', text: T.lgNow },
        { color: 'var(--a3)', text: T.lgHeld },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const COLS = 12, CW = 34, rows = Math.ceil(bytes.length / COLS);
      const svg = Viz.svg('svg', { viewBox: `0 0 ${COLS * CW} ${rows * CW}`, class: 'viz-stage', role: 'img', 'aria-label': T.stripLabel }, left);
      const cells = [], labels = [];
      for (let i = 0; i < bytes.length; i++) {
        const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CW, b = bytes[i];
        cells.push(Viz.svg('rect', { x: x + 2, y: y + 2, width: CW - 4, height: CW - 4, rx: 3 }, svg));
        const ch = b === 10 ? '\\n' : b === 13 ? '\\r' : b < 0x80 ? String.fromCharCode(b) : b.toString(16).toUpperCase();
        const t = Viz.svg('text', { x: x + CW / 2, y: y + CW / 2 + 5, 'text-anchor': 'middle', 'font-size': b < 0x80 ? 16 : 14 }, svg);
        t.textContent = ch;
        labels.push(t);
      }
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bSeed, 'ghost')}${Viz.button(T.bReset, 'ghost')}</div>
        <div class="viz-slider"><label>${T.sizeLabel}</label><input type="range" min="1" max="64" value="7" aria-label="${Viz.esc(T.sizeLabel)}"><output>7</output></div>
        <div style="${box}"><b>${T.naiveH}</b><div class="s-ns" style="font-size:12px;color:var(--muted)"></div><p class="s-nt" style="${mono}"></p></div>
        <div style="${box}"><b>${T.rightH}</b><div class="s-rs" style="font-size:12px;color:var(--muted)"></div><p class="s-rt" style="${mono}"></p></div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 's-bytes', k: T.sBytesK, v: '0 / 126', f: '' }) +
        Viz.stat({ id: 's-held', k: T.sHeldK, v: '0', f: T.sHeldF }) +
        Viz.stat({ id: 's-lost', k: T.sLostK, v: '—', f: T.sLostF(0), hot: true });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden></div>` + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, seedBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const range = $('input[type=range]');
      let max = 7, seed = 7, chunks = [], idx = 0, got = 0, naive = null, right_ = null, dec, fr, busy = false;
      let nOut = '', rOut = '', nBroken = 0, nErr = 0;

      function plan() {
        chunks = M.splitBySizes(bytes, M.chunkSizes(bytes.length, seed, 1, max));
        naive = M.runNaive(chunks); right_ = M.runCorrect(chunks);
      }
      function restart() {
        plan(); idx = 0; got = 0; nOut = ''; rOut = ''; nBroken = 0; nErr = 0; dec = M.makeDecoder(); fr = M.makeFramer();
        pipe.set(-1); $('.viz-verdict').hidden = true; paint(0, 0); show(0, 0);
      }
      function paint(curFrom, held) {
        cells.forEach((c, i) => {
          let fill = 'var(--frame)', ink = 'var(--muted)';
          if (i < got) { fill = 'var(--accent)'; ink = 'var(--paper)'; }
          if (i >= curFrom && i < got) fill = 'var(--a2)';
          if (held && i >= got - held && i < got) fill = 'var(--a3)';
          c.setAttribute('style', 'fill:' + fill);
          labels[i].setAttribute('style', 'fill:' + ink + ';font-family:var(--mono)');
        });
      }
      function show(held, pending) {
        $('.s-nt').textContent = nOut || T.empty;
        $('.s-rt').textContent = rOut || T.empty;
        $('.s-ns').textContent = T.naiveSub(nBroken, nErr);
        $('.s-rs').textContent = T.rightSub(held, pending);
        $('[data-s=s-bytes-v]').textContent = `${got} / ${bytes.length}`;
        $('[data-s=s-bytes-f]').innerHTML = T.sBytesF(got, chunks.length);
        $('[data-s=s-held-v]').textContent = String(held);
        const ok = [...nOut].length;
        $('[data-s=s-lost-v]').textContent = idx === chunks.length ? String(6 - ok) : '—';
        $('[data-s=s-lost-f]').innerHTML = T.sLostF(idx === chunks.length ? ok : 0);
      }
      async function step(fast) {
        if (idx >= chunks.length) restart();
        const c = chunks[idx], from = got, ns = naive.steps[idx];
        idx++; got += c.length;
        pipe.set(0); paint(from, 0);
        if (!fast) term.log(T.lChunk(idx, c.length, Array.from(c, x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ')));
        await ctx.sleep(fast ? 0 : 160);
        const d = dec.push(c);
        pipe.set(1); paint(from, d.held);
        nOut += ns.deltas.join(''); nBroken += ns.broken; nErr += ns.errors;
        if (!fast) { term.log(T.lNaive(T.quote(ns.text), ns.broken, ns.errors)); term.log(T.lRight(d.text ? T.quote(d.text) : T.nothing, d.held)); }
        await ctx.sleep(fast ? 0 : 160);
        const evs = fr.push(d.text);
        pipe.set(2);
        await ctx.sleep(fast ? 0 : 160);
        const deltas = [];
        for (const e of evs) if (e.type === 'data' && e.data !== '[DONE]') deltas.push(JSON.parse(e.data).delta);
        rOut += deltas.join('');
        pipe.set(3);
        if (!fast && evs.length) term.log(T.lFrame(evs.length, deltas.map(T.quote).join(' ')));
        show(d.held, fr.pending().length);
        if (idx === chunks.length) {
          term.log(T.done);
          $('.viz-verdict').innerHTML = T.verdict(nOut || T.nothing, rOut, chunks.length);
          $('.viz-verdict').hidden = false;
        }
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      stepBtn.onclick = () => guard(() => step(false));
      allBtn.onclick = () => guard(async () => {
        if (idx >= chunks.length) restart();
        while (idx < chunks.length) { await step(true); await ctx.sleep(40); }
      });
      seedBtn.onclick = () => guard(async () => { seed = (seed * 31 + 11) % 100003; term.clear(); term.log(T.readyShort); restart(); });
      resetBtn.onclick = () => guard(async () => { term.clear(); term.log(T.ready); restart(); });
      range.oninput = () => { max = +range.value; $('output').textContent = String(max); restart(); };
      restart();
    },
  });

  Viz.register('think-tag-holdback', {
    mount(el, ctx) {
      const DELTAS = T.hDeltas;
      const body = Viz.frame(el, { code: T.hCode, title: T.hTitle, tag: T.hTag, intro: T.hIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--muted)', text: T.hLgReason },
        { color: 'var(--accent)', text: T.hLgContent },
        { color: 'var(--a2)', text: T.hLgTool },
        { color: 'var(--a3)', text: T.hLgHeld },
      ]));
      const pipe = Viz.pipe(body, T.hSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const lane = (cls, name, color) => `<div style="${box};border-left:4px solid ${color}"><b>${name}</b><p class="${cls}" style="${mono}"></p></div>`;
      left.insertAdjacentHTML('beforeend',
        lane('h-r', T.hReason, 'var(--muted)') + lane('h-c', T.hContent, 'var(--accent)') + lane('h-t', T.hTool, 'var(--a2)') + lane('h-h', T.hHeld, 'var(--a3)') +
        `<div style="${box};border-style:dashed"><b>${T.hNaive}</b><p class="h-n" style="${mono}"></p></div>
        <div class="viz-row">${Viz.button(T.hBStep)}${Viz.button(T.hBReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.hReady);
      right.innerHTML =
        Viz.stat({ id: 'h-held', k: T.hHeldK, v: '0', f: T.hHeldF }) +
        Viz.stat({ id: 'h-leak', k: T.hLeakK, v: '0', f: T.hLeakF, hot: true });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden>${T.hVerdict}</div>` + Viz.tryList(T.hTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      let p, i, out, raw;
      function reset() {
        p = M.makeTagParser(); i = 0; raw = ''; out = { reasoning: '', content: '', tool: '' };
        pipe.set(-1); $('.viz-verdict').hidden = true; show('');
      }
      function show(held) {
        $('.h-r').textContent = out.reasoning || '—';
        $('.h-c').textContent = out.content || '—';
        const call = out.tool ? M.parseToolXml(out.tool) : null;
        $('.h-t').textContent = call ? `${call.name}(${Object.entries(call.args).map(([k, v]) => k + '=' + v).join(', ')})` : '—';
        $('.h-h').textContent = held || '—';
        $('.h-n').textContent = raw || '—';
        $('[data-s=h-held-v]').textContent = String(held.length);
        $('[data-s=h-leak-v]').textContent = String((raw.match(/<\/?(think|tool_call)>/g) || []).length);
      }
      stepBtn.onclick = () => {
        if (i >= DELTAS.length) { term.clear(); term.log(T.hReady); reset(); }
        const d = DELTAS[i];
        pipe.set(i);
        raw += d;
        term.log(T.hFeed(i + 1, Viz.esc('“' + d + '”')));
        const r = p.feed(d);
        for (const e of r.events) {
          out[e.kind] += e.text;
          if (e.kind === 'tool') { const c = M.parseToolXml(e.text); term.log(T.hToolDone(c.name, Object.entries(c.args).map(([k, v]) => k + '=' + v).join(', '))); }
          else term.log(T.hEv(T.kinds[e.kind], Viz.esc('“' + e.text + '”')));
        }
        if (r.held) term.log((p.state() === 'tool' ? T.hToolWait : T.hKeep)(Viz.esc('“' + (r.held.length > 24 ? r.held.slice(0, 24) + '…' : r.held) + '”')));
        i++;
        show(r.held);
        if (i === DELTAS.length) { term.log(T.hEnd); $('.viz-verdict').hidden = false; pipe.set(DELTAS.length); }
      };
      resetBtn.onclick = () => { term.clear(); term.log(T.hReady); reset(); };
      reset();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
