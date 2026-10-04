/* Chapter 14 widgets: a double-buffered copy/compute pipeline, and DMA into memory that is or is not pinned.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dma;

  const T = Viz.t({
    zh: {
      code: 'DOUBLE_BUFFER', title: '双缓冲：一边搬，一边算', tag: '教学推演 · 6 块数据',
      intro: '6 块数据要从内存搬上显卡再计算。拷贝引擎和计算单元是两套硬件，可以同时干活，但每块数据都要先放进一个<b>缓冲区</b>。1 块缓冲区只能“搬完再算、算完再搬”；2 块就能一块在搬、一块在算。再试试打开“不等信号就覆盖”：缓冲区还在被读，就往里写下一块。',
      lgBufs: ['缓冲区 A', '缓冲区 B', '缓冲区 C'], lgBad: '读到被覆盖的数据',
      steps: ['拷进空闲缓冲区', '发“拷完”信号', '计算', '发“用完”信号', '缓冲区可复用'],
      laneCopy: '拷贝', laneComp: '计算',
      bufLabel: '缓冲区数', bufN: (n) => `${n} 块`,
      copyLabel: '每块拷贝', compLabel: '每块计算', ms: (v) => `${v} ms`,
      bPlay: '▶ 播放', bWaitOn: '不等信号就覆盖：关', bWaitOff: '不等信号就覆盖：开',
      totalText: (t, s) => `总用时 ${t} ms（全串行要 ${s} ms）`,
      badText: (list) => `✗ 第 ${list.join('、')} 块读到了被覆盖的数据`, okText: '✓ 每一块都读到了自己的数据',
      ready: '<span class="c">$</span> ready. 调好参数，按 [ ▶ 播放 ]',
      lCopy: (t, i, b) => `<span class="c">t=${t}</span> 开始拷贝第 ${i} 块 → 缓冲区 ${b}`,
      lWait: (t, i, b, prev, until) => `<span class="y">t=${t}</span> 想把第 ${i} 块拷进 ${b}，可第 ${prev} 块还在用它：等“用完”信号，到 t=${until} 才开始`,
      lClobber: (t, i, b, prev, until) => `<span class="m">t=${t}</span> 没等信号，直接把第 ${i} 块写进 ${b}；可第 ${prev} 块要算到 t=${until}，它后半段读到的是第 ${i} 块的数据`,
      lComp: (t, i) => `<span class="c">t=${t}</span> 第 ${i} 块拷完（“拷完”信号），开始计算`,
      lDone: (t) => `<span class="y">// t=${t} 全部算完</span>`,
      sTotK: '总用时', sTotF: (n, c, k, b) => b >= 2 ? `<b>≈ ${c} ＋ (${n} − 1) × max(${c}, ${k}) ＋ ${k}</b><br>首块拷贝 ＋ 中间按慢的一段 ＋ 末块计算` : `<b>= ${n} × (${c} ＋ ${k})</b><br>只有 1 块缓冲区：搬和算轮流来`,
      sSerK: '全串行（对照）', sSerF: '<b>= 块数 × (拷贝 ＋ 计算)</b>',
      sBadK: '读错的块', sBadF: '<b>覆盖开始时，上一位读者还没算完</b><br>程序照常跑完，不会报错',
      vOk: (t, s) => `① 总用时 <b>${t} ms</b>，比全串行的 ${s} ms 短：拷贝藏在了计算后面。<br>② 每次覆盖缓冲区之前，都等了上一位读者的“用完”信号，所以每块数据都对。<br>③ 再多加缓冲区，也快不过“最慢那一段 × 块数”：瓶颈换不掉，只能藏住另一段。`,
      vBad: (t, n) => `① 不等信号，总用时 <b>${t} ms</b>，并没有比老老实实等更快：计算本来就是瓶颈。<br>② 却有 <b>${n}</b> 块读到了被覆盖的数据，程序照常跑完，没有任何报错。<br>③ 双缓冲的正确性不来自“分配了两块内存”，而来自那两个信号：拷完了才能读，用完了才能写。`,
      try: [
        '缓冲区选 <b>1 块</b> 播放，再选 <b>2 块</b>：用 3 ms 拷贝、5 ms 计算时，总用时从 48 ms 降到 33 ms。',
        '选 <b>3 块</b>：几乎不再变快。计算是最慢的一段，多出来的缓冲区只是闲着。',
        '回到 2 块，打开 <b>不等信号就覆盖</b> 再播放：有几块被标成 ✗？把拷贝调到 6 ms、计算调到 2 ms 再试，为什么这次又“碰巧”没事？',
      ],

      pCode: 'PIN_DMA', pTitle: 'DMA 与锁页：地址被挪走会怎样', pTag: '计算机原理 · 示意',
      pIntro: '程序看到的是<b>虚拟地址</b>，操作系统用页表把每个虚拟页翻译成真实的物理页框，而且随时可能把页挪走。DMA 引擎不看页表，只认开工时拿到的物理页框。按 <b>单步</b> 看一次“搬到一半时内存紧张”的过程，再打开“锁页”对比。',
      pLgOurs: '我们缓冲区所在的页框', pLgOther: '别的程序占用的页框', pLgFree: '空闲页框', pLgDma: 'DMA 正在读的页框',
      pSteps: ['申请缓冲区', '交给 DMA', '搬了一半', '内存紧张', '继续搬', '完成'],
      vLabel: '虚拟页（程序看到的）', fLabel: '物理页框（真实内存）',
      vPage: (i) => `页 ${i}`, frame: (i) => `框 ${i}`,
      dmaText: (fr, done) => `DMA 拿到的页框：${fr.join('、')}；已搬 ${done} 页`,
      bStep: '▶ 单步', bReset: '重置', bPinOff: '锁页：关', bPinOn: '锁页：开',
      pReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]',
      pLog: {
        alloc: '程序申请 4 页大小的缓冲区。页表把页 0–3 翻译到物理页框 2、5、3、7：程序看到的地址连续，真实位置是散的',
        handoff: '驱动把这 4 个物理页框号交给 DMA 引擎。从现在起，DMA 只认这串页框号，不再看页表',
        copying: 'DMA 开始搬：页 0、页 1 已经送上显卡',
        pressureMove: '<span class="m">内存紧张</span>：操作系统把页 2 挪到了页框 6，页框 3 分给了别的程序。页表更新了，DMA 手里那串号码却没变',
        pressurePinned: '<span class="c">内存紧张</span>：操作系统想挪页，但这 4 页被<b>锁住</b>了，只能去动别人的页。页框保持 2、5、3、7',
        resumeBad: '<span class="m">DMA 继续</span>：按旧号码读页框 3，读到的是别的程序的数据。显卡上的第 2 页错了，没有任何报错',
        resumeOk: '<span class="c">DMA 继续</span>：页框 3、7 还是我们的，页 2、页 3 搬对了',
        finish: '搬完',
      },
      sPtK: '页表此刻（页 0–3 → 页框）', sDmaK: 'DMA 手里的页框', sResK: '结果',
      sPtF: '<b>页表由操作系统维护</b><br>它可以随时改', sDmaF: '<b>开工时拿到的，中途不变</b>', sResF: '<b>正确条件</b>：搬运期间，<br>页不能被挪走',
      resOk: '正确', resBad: '第 2 页错了', resNa: '—',
      vPinOff: '没有锁页时，操作系统在搬运途中挪走了一页，DMA 照着旧地址读，读到了别人的数据。如果方向反过来（从显卡写回内存），它还会改坏别的程序的内存。这就是 DMA 要求<b>锁页内存</b>的原因。',
      vPinOn: '锁页之后，操作系统保证这些页在解锁前不挪、不换出，DMA 照着开工时的页框号读写就是安全的。代价是这部分内存别人用不了。',
      pTry: [
        '锁页关着，单步走完：第 4 步页表变了，第 5 步结果出错。注意 DMA 手里的号码从头到尾没变。',
        '打开 <b>锁页</b> 再走一遍：第 4 步操作系统不能动这几页，结果正确。',
        '想一想：Strata 启动时为什么要把几十 GB 的专家锁进内存？锁页多了，系统其他部分会怎样？',
      ],
    },
    en: {
      code: 'DOUBLE_BUFFER', title: 'Double buffering: copy while you compute', tag: 'Teaching estimate · 6 chunks',
      intro: '6 chunks of data must be copied from RAM to the GPU and then computed. The copy engine and the compute units are two separate pieces of hardware and can work at the same time, but every chunk must first be put into a <b>buffer</b>. With 1 buffer you can only "copy, then compute, then copy again"; with 2, one buffer is being filled while the other is being computed. Then try turning on "overwrite without waiting": the next chunk is written into a buffer that is still being read.',
      lgBufs: ['Buffer A', 'Buffer B', 'Buffer C'], lgBad: 'Read overwritten data',
      steps: ['Copy into a free buffer', 'Signal "copied"', 'Compute', 'Signal "used"', 'Buffer reusable'],
      laneCopy: 'Copy', laneComp: 'Calc',
      bufLabel: 'Buffers', bufN: (n) => (n === 1 ? '1 buffer' : `${n} buffers`),
      copyLabel: 'Copy per chunk', compLabel: 'Compute per chunk', ms: (v) => `${v} ms`,
      bPlay: '▶ Play', bWaitOn: 'Overwrite without waiting: off', bWaitOff: 'Overwrite without waiting: on',
      totalText: (t, s) => `Total ${t} ms (fully serial: ${s} ms)`,
      badText: (list) => `✗ ${list.length === 1 ? 'Chunk' : 'Chunks'} ${list.join(', ')} read overwritten data`, okText: '✓ Every chunk read its own data',
      ready: '<span class="c">$</span> ready. Set the sliders, then press [ ▶ Play ]',
      lCopy: (t, i, b) => `<span class="c">t=${t}</span> start copying chunk ${i} → buffer ${b}`,
      lWait: (t, i, b, prev, until) => `<span class="y">t=${t}</span> chunk ${i} wants buffer ${b}, but chunk ${prev} is still using it: wait for the "used" signal, start at t=${until}`,
      lClobber: (t, i, b, prev, until) => `<span class="m">t=${t}</span> no waiting: chunk ${i} is written straight into ${b}; but chunk ${prev} computes until t=${until}, so the second half of its read sees chunk ${i}'s data`,
      lComp: (t, i) => `<span class="c">t=${t}</span> chunk ${i} copied ("copied" signal), compute starts`,
      lDone: (t) => `<span class="y">// t=${t} all chunks computed</span>`,
      sTotK: 'Total time', sTotF: (n, c, k, b) => b >= 2 ? `<b>≈ ${c} + (${n} − 1) × max(${c}, ${k}) + ${k}</b><br>first copy + slower part in between + last compute` : `<b>= ${n} × (${c} + ${k})</b><br>only 1 buffer: copy and compute take turns`,
      sSerK: 'Fully serial (for comparison)', sSerF: '<b>= chunks × (copy + compute)</b>',
      sBadK: 'Chunks read wrong', sBadF: '<b>The overwrite began before the previous reader finished</b><br>the program still runs to the end with no error',
      vOk: (t, s) => `① Total time <b>${t} ms</b>, shorter than the fully serial ${s} ms: the copying is hidden behind the computing.<br>② Before every overwrite, the producer waited for the previous reader's "used" signal, so every chunk is correct.<br>③ More buffers cannot beat "slowest part × chunks": you cannot remove the bottleneck, only hide the other part behind it.`,
      vBad: (t, n) => `① Without waiting, the total is <b>${t} ms</b>, no faster than waiting properly: compute was the bottleneck anyway.<br>② Yet <b>${n}</b> chunk(s) read overwritten data, and the program still ran to the end without any error.<br>③ Double buffering is correct not because you "allocated two blocks of memory", but because of the two signals: read only after the copy is done, write only after it has been used.`,
      try: [
        'Play with <b>1 buffer</b>, then with <b>2 buffers</b>: at 3 ms copy and 5 ms compute, the total drops from 48 ms to 33 ms.',
        'Pick <b>3 buffers</b>: it barely gets faster. Compute is the slowest part, and the extra buffer just sits idle.',
        'Go back to 2 buffers, turn on <b>Overwrite without waiting</b> and play again: how many chunks get a ✗? Set copy to 6 ms and compute to 2 ms and try again. Why is everything fine "by luck" this time?',
      ],

      pCode: 'PIN_DMA', pTitle: 'DMA and pinning: what if the address moves?', pTag: 'Computer principles · Sketch',
      pIntro: 'A program sees <b>virtual addresses</b>. The operating system uses the page table to translate each virtual page into a real physical page frame, and it may move a page at any time. The DMA engine ignores the page table and trusts only the physical frames it got when the job started. Press <b>Step</b> to watch "memory runs short halfway through a copy", then turn on pinning and compare.',
      pLgOurs: 'Frames that hold our buffer', pLgOther: 'Frames another program uses', pLgFree: 'Free frames', pLgDma: 'Frame DMA is reading now',
      pSteps: ['Allocate buffer', 'Hand to DMA', 'Half copied', 'Memory runs short', 'Copy continues', 'Done'],
      vLabel: 'Virtual pages (what the program sees)', fLabel: 'Physical page frames (real memory)',
      vPage: (i) => `Page ${i}`, frame: (i) => `#${i}`,
      dmaText: (fr, done) => `DMA's frames: ${fr.join(', ')} · ${done} pages copied`,
      bStep: '▶ Step', bReset: 'Reset', bPinOff: 'Pinning: off', bPinOn: 'Pinning: on',
      pReady: '<span class="c">$</span> ready. Press [ ▶ Step ]',
      pLog: {
        alloc: 'The program allocates a 4-page buffer. The page table maps pages 0–3 to physical frames 2, 5, 3, 7: the addresses the program sees are contiguous, but the real locations are scattered',
        handoff: 'The driver hands these 4 physical frame numbers to the DMA engine. From now on DMA trusts only this list and no longer looks at the page table',
        copying: 'DMA starts copying: pages 0 and 1 are already on the GPU',
        pressureMove: '<span class="m">Memory runs short</span>: the OS moves page 2 to frame 6 and gives frame 3 to another program. The page table is updated, but the list DMA holds has not changed',
        pressurePinned: '<span class="c">Memory runs short</span>: the OS wants to move pages, but these 4 pages are <b>pinned</b>, so it has to touch other pages. The frames stay 2, 5, 3, 7',
        resumeBad: '<span class="m">DMA continues</span>: it reads frame 3 by the old number and gets another program\'s data. Page 2 on the GPU is wrong, and nothing reports an error',
        resumeOk: '<span class="c">DMA continues</span>: frames 3 and 7 are still ours, so pages 2 and 3 are copied correctly',
        finish: 'Copy finished',
      },
      sPtK: 'Page table now (pages 0–3 → frames)', sDmaK: 'Frames DMA holds', sResK: 'Result',
      sPtF: '<b>The OS maintains the page table</b><br>it can change it at any time', sDmaF: '<b>Taken at the start, never changes</b>', sResF: '<b>Correct only if</b> no page<br>moves during the copy',
      resOk: 'Correct', resBad: 'Page 2 is wrong', resNa: '—',
      vPinOff: 'Without pinning, the OS moved a page in the middle of the copy, DMA read by the old address, and it got someone else\'s data. In the other direction (writing from the GPU back to RAM), it would also corrupt another program\'s memory. That is why DMA requires <b>pinned memory</b>.',
      vPinOn: 'With pinning, the OS promises not to move or swap out these pages until they are unpinned, so DMA can safely read and write by the frame numbers it got at the start. The cost: nobody else can use this memory.',
      pTry: [
        'With pinning off, step to the end: at step 4 the page table changes, and at step 5 the result is wrong. Note that the numbers DMA holds never change.',
        'Turn <b>pinning</b> on and walk through again: at step 4 the OS cannot touch these pages, and the result is correct.',
        'Think about it: why does Strata pin tens of GB of experts into RAM at startup? With that much pinned, what happens to the rest of the system?',
      ],
    },
    es: {
      code: 'DOUBLE_BUFFER', title: 'Doble búfer: mover mientras se calcula', tag: 'Estimación didáctica · 6 bloques de datos',
      intro: 'Hay que pasar 6 bloques de datos de la RAM a la GPU y calcularlos. El motor de copia y la unidad de cálculo son dos piezas de hardware distintas y pueden trabajar a la vez, pero cada bloque debe ir antes a un <b>búfer</b>. Con 1 búfer solo se puede "copiar y luego calcular, calcular y luego copiar"; con 2, uno se calcula mientras el otro se copia. Prueba también a activar "sobrescribir sin esperar la señal": se escribe el bloque siguiente mientras el búfer todavía se está leyendo.',
      lgBufs: ['Búfer A', 'Búfer B', 'Búfer C'], lgBad: 'Lee datos sobrescritos',
      steps: ['Copiar a un búfer libre', 'Enviar la señal "copiado"', 'Calcular', 'Enviar la señal "usado"', 'Búfer reutilizable'],
      laneCopy: 'Copia', laneComp: 'Cálculo',
      bufLabel: 'Número de búferes', bufN: (n) => `${n}`,
      copyLabel: 'Copia por bloque', compLabel: 'Cálculo por bloque', ms: (v) => `${v} ms`,
      bPlay: '▶ Reproducir', bWaitOn: 'Sobrescribir sin esperar la señal: no', bWaitOff: 'Sobrescribir sin esperar la señal: sí',
      totalText: (t, s) => `Tiempo total ${t} ms (todo en serie serían ${s} ms)`,
      badText: (list) => `✗ los bloques ${list.join(', ')} leyeron datos sobrescritos`, okText: '✓ cada bloque leyó sus propios datos',
      ready: '<span class="c">$</span> ready. Ajusta los parámetros y pulsa [ ▶ Reproducir ]',
      lCopy: (t, i, b) => `<span class="c">t=${t}</span> empieza a copiarse el bloque ${i} → búfer ${b}`,
      lWait: (t, i, b, prev, until) => `<span class="y">t=${t}</span> quiere copiar el bloque ${i} al ${b}, pero el bloque ${prev} todavía lo usa: espera la señal "usado" y empieza en t=${until}`,
      lClobber: (t, i, b, prev, until) => `<span class="m">t=${t}</span> sin esperar la señal, escribe el bloque ${i} directamente en ${b}; pero el bloque ${prev} calcula hasta t=${until} y en su segunda mitad lee los datos del bloque ${i}`,
      lComp: (t, i) => `<span class="c">t=${t}</span> el bloque ${i} se copió (señal "copiado") y empieza a calcularse`,
      lDone: (t) => `<span class="y">// t=${t} todo calculado</span>`,
      sTotK: 'Tiempo total', sTotF: (n, c, k, b) => b >= 2 ? `<b>≈ ${c} + (${n} − 1) × max(${c}, ${k}) + ${k}</b><br>copia del primer bloque + el tramo lento en medio + cálculo del último` : `<b>= ${n} × (${c} + ${k})</b><br>con 1 solo búfer: copiar y calcular se turnan`,
      sSerK: 'Todo en serie (comparación)', sSerF: '<b>= bloques × (copia + cálculo)</b>',
      sBadK: 'Bloques mal leídos', sBadF: '<b>al empezar a sobrescribir, el lector anterior aún no había terminado</b><br>el programa termina con normalidad, sin ningún error',
      vOk: (t, s) => `① Tiempo total <b>${t} ms</b>, menos que los ${s} ms de todo en serie: la copia quedó escondida detrás del cálculo.<br>② Antes de sobrescribir el búfer, siempre se esperó la señal "usado" del lector anterior, y por eso todos los bloques están bien.<br>③ Por más búferes que añadas, no irá más rápido que "el tramo más lento × bloques": el cuello de botella no se puede cambiar, solo esconder el otro tramo.`,
      vBad: (t, n) => `① Sin esperar la señal, el tiempo total es <b>${t} ms</b>, que no es más rápido que esperar como es debido: el cálculo ya era el cuello de botella.<br>② Pero <b>${n}</b> bloques leyeron datos sobrescritos; el programa termina con normalidad y sin ningún error.<br>③ La corrección del doble búfer no viene de "haber reservado dos bloques de memoria", sino de esas dos señales: se lee cuando ya se copió y se escribe cuando ya se usó.`,
      try: [
        'Elige <b>1</b> búfer y reproduce; luego <b>2</b>: con 3 ms de copia y 5 ms de cálculo, el tiempo total baja de 48 ms a 33 ms.',
        'Elige <b>3</b>: casi no mejora. El cálculo es el tramo más lento y los búferes de más se quedan ociosos.',
        'Vuelve a 2, activa <b>Sobrescribir sin esperar la señal</b> y reproduce: ¿cuántos bloques salen marcados con ✗? Prueba con 6 ms de copia y 2 ms de cálculo: ¿por qué esta vez "por casualidad" no falla?',
      ],

      pCode: 'PIN_DMA', pTitle: 'DMA y memoria fijada: qué pasa si mueven las direcciones', pTag: 'Principios de computadoras · esquema',
      pIntro: 'El programa ve <b>direcciones virtuales</b>; el sistema operativo traduce cada página virtual a un marco físico real con la tabla de páginas, y puede mover las páginas en cualquier momento. El motor DMA no mira la tabla de páginas: solo conoce los marcos físicos que recibió al empezar. Pulsa <b>Paso</b> para ver un caso de "falta memoria a mitad de la transferencia" y luego activa la "memoria fijada" para comparar.',
      pLgOurs: 'Marcos donde está nuestro búfer', pLgOther: 'Marcos ocupados por otros programas', pLgFree: 'Marcos libres', pLgDma: 'Marco que el DMA está leyendo',
      pSteps: ['Pedir el búfer', 'Entregar al DMA', 'A mitad de copia', 'Falta memoria', 'Seguir copiando', 'Fin'],
      vLabel: 'Páginas virtuales (lo que ve el programa)', fLabel: 'Marcos físicos (memoria real)',
      vPage: (i) => `pág. ${i}`, frame: (i) => `marco ${i}`,
      dmaText: (fr, done) => `Marcos que recibió el DMA: ${fr.join(', ')}; ${done} páginas copiadas`,
      bStep: '▶ Paso', bReset: 'Reiniciar', bPinOff: 'Memoria fijada: no', bPinOn: 'Memoria fijada: sí',
      pReady: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ]',
      pLog: {
        alloc: 'El programa pide un búfer de 4 páginas. La tabla de páginas traduce las páginas 0–3 a los marcos físicos 2, 5, 3, 7: las direcciones que ve el programa son contiguas, pero la ubicación real está dispersa',
        handoff: 'El controlador entrega al motor DMA los números de esos 4 marcos físicos. Desde ahora, el DMA solo conoce esa lista de marcos y ya no mira la tabla de páginas',
        copying: 'El DMA empieza a copiar: las páginas 0 y 1 ya viajaron a la GPU',
        pressureMove: '<span class="m">Falta memoria</span>: el sistema operativo movió la página 2 al marco 6 y dio el marco 3 a otro programa. La tabla de páginas se actualizó, pero la lista que tiene el DMA no cambió',
        pressurePinned: '<span class="c">Falta memoria</span>: el sistema operativo quiere mover páginas, pero estas 4 están <b>fijadas</b> y solo puede tocar las de otros. Los marcos siguen siendo 2, 5, 3, 7',
        resumeBad: '<span class="m">El DMA continúa</span>: lee el marco 3 con el número viejo y recibe datos de otro programa. La página 2 en la GPU es errónea y no hay ningún error',
        resumeOk: '<span class="c">El DMA continúa</span>: los marcos 3 y 7 siguen siendo nuestros, y las páginas 2 y 3 se copian bien',
        finish: 'Copia terminada',
      },
      sPtK: 'La tabla de páginas ahora (páginas 0–3 → marcos)', sDmaK: 'Marcos que tiene el DMA', sResK: 'Resultado',
      sPtF: '<b>La tabla de páginas la mantiene el sistema operativo</b><br>puede cambiarla en cualquier momento', sDmaF: '<b>Se recibieron al empezar y no cambian a mitad</b>', sResF: '<b>Condición de corrección</b>: durante la copia,<br>las páginas no pueden moverse',
      resOk: 'correcto', resBad: 'la página 2 está mal', resNa: '—',
      vPinOff: 'Sin memoria fijada, el sistema operativo movió una página durante la copia, y el DMA, con la dirección vieja, leyó datos de otro. Si fuera al revés (de la GPU a la RAM), además estropearía la memoria de otro programa. Por eso el DMA exige <b>memoria fijada</b>.',
      vPinOn: 'Con la memoria fijada, el sistema operativo garantiza que estas páginas no se mueven ni se intercambian hasta que se liberen, y el DMA puede leer y escribir con seguridad con los marcos que recibió al empezar. El precio es que otros no pueden usar esa memoria.',
      pTry: [
        'Con la memoria fijada desactivada, recorre todos los pasos: en el paso 4 la tabla de páginas cambia y en el paso 5 el resultado falla. Fíjate en que los números que tiene el DMA no cambiaron de principio a fin.',
        'Activa la <b>memoria fijada</b> y recórrelo otra vez: en el paso 4 el sistema operativo no puede tocar estas páginas y el resultado es correcto.',
        'Piensa: ¿por qué fija Strata al arrancar decenas de GB de expertos en memoria? Si se fija demasiado, ¿qué le pasa al resto del sistema?',
      ],
    },
    ko: {
      code: 'DOUBLE_BUFFER', title: '더블 버퍼링: 옮기면서 계산하기', tag: '교육용 추정 · 데이터 6블록',
      intro: '데이터 6블록을 RAM에서 그래픽 카드로 옮긴 뒤 계산해요. 복사 엔진과 계산 유닛은 서로 다른 하드웨어라서 동시에 일할 수 있어요. 다만 블록마다 먼저 <b>버퍼</b>에 들어가야 해요. 버퍼가 1개면 「다 옮기고 나서 계산, 다 계산하고 나서 옮기기」만 가능해요. 2개면 한 블록은 옮기는 중이고 다른 블록은 계산 중일 수 있어요. 「신호를 기다리지 않고 덮어쓰기」도 켜 보세요. 버퍼가 아직 읽히는 중인데 다음 블록을 써 넣어요.',
      lgBufs: ['버퍼 A', '버퍼 B', '버퍼 C'], lgBad: '덮어쓰인 데이터를 읽음',
      steps: ['빈 버퍼로 복사', '「복사 끝」 신호 보내기', '계산', '「다 썼음」 신호 보내기', '버퍼 재사용 가능'],
      laneCopy: '복사', laneComp: '계산',
      bufLabel: '버퍼 수', bufN: (n) => `${n}개`,
      copyLabel: '블록당 복사', compLabel: '블록당 계산', ms: (v) => `${v} ms`,
      bPlay: '▶ 재생', bWaitOn: '신호 안 기다리고 덮어쓰기: 꺼짐', bWaitOff: '신호 안 기다리고 덮어쓰기: 켜짐',
      totalText: (t, s) => `총 ${t} ms (완전 직렬이면 ${s} ms)`,
      badText: (list) => `✗ 덮어쓰인 데이터를 읽은 블록: ${list.join(', ')}`, okText: '✓ 모든 블록이 자기 데이터를 읽었어요',
      ready: '<span class="c">$</span> ready. 값을 정하고 [ ▶ 재생 ]을 누르세요',
      lCopy: (t, i, b) => `<span class="c">t=${t}</span> 블록 ${i} 복사 시작 → 버퍼 ${b}`,
      lWait: (t, i, b, prev, until) => `<span class="y">t=${t}</span> 블록 ${i}의 복사 대기: 버퍼 ${b}를 블록 ${prev}의 계산이 아직 쓰고 있어요. 「다 썼음」 신호를 기다렸다가 t=${until}에 시작해요`,
      lClobber: (t, i, b, prev, until) => `<span class="m">t=${t}</span> 신호를 기다리지 않고 블록 ${i}의 데이터를 버퍼 ${b}에 바로 썼어요. 그런데 블록 ${prev}의 계산은 t=${until}까지 이어져서, 뒷부분은 블록 ${i}의 데이터를 읽게 돼요`,
      lComp: (t, i) => `<span class="c">t=${t}</span> 블록 ${i} 복사 끝(「복사 끝」 신호), 계산 시작`,
      lDone: (t) => `<span class="y">// t=${t} 모두 계산 끝</span>`,
      sTotK: '총 시간', sTotF: (n, c, k, b) => b >= 2 ? `<b>≈ ${c} + (${n} − 1) × max(${c}, ${k}) + ${k}</b><br>첫 블록 복사 + 중간은 느린 쪽 기준 + 마지막 블록 계산` : `<b>= ${n} × (${c} + ${k})</b><br>버퍼가 1개뿐: 옮기기와 계산이 번갈아 가요`,
      sSerK: '완전 직렬 (비교용)', sSerF: '<b>= 블록 수 × (복사 + 계산)</b>',
      sBadK: '잘못 읽은 블록', sBadF: '<b>덮어쓰기가 시작될 때 앞의 독자가 아직 계산 중</b><br>프로그램은 평소처럼 끝나고 오류도 안 나요',
      vOk: (t, s) => `① 총 <b>${t} ms</b>로, 완전 직렬의 ${s} ms보다 짧아요. 복사가 계산 뒤로 숨었어요.<br>② 버퍼를 덮어쓰기 전에 매번 앞 독자의 「다 썼음」 신호를 기다렸어요. 그래서 모든 블록의 데이터가 맞아요.<br>③ 버퍼를 더 늘려도 「가장 느린 구간 × 블록 수」보다 빨라질 수 없어요. 병목은 바꿀 수 없고, 다른 구간을 숨길 수 있을 뿐이에요.`,
      vBad: (t, n) => `① 신호를 기다리지 않아서 총 <b>${t} ms</b>예요. 성실하게 기다린 경우보다 빠르지 않아요. 계산이 원래 병목이거든요.<br>② 그런데 <b>${n}</b>개 블록이 덮어쓰인 데이터를 읽었어요. 프로그램은 평소처럼 끝났고 오류는 하나도 없어요.<br>③ 더블 버퍼링이 옳은 건 「메모리를 두 개 할당했기 때문」이 아니라 두 신호 덕분이에요. 복사가 끝나야 읽고, 다 쓰고 나야 쓸 수 있어요.`,
      try: [
        '버퍼 <b>1개</b>로 재생하고, 이어서 <b>2개</b>로 재생해 보세요. 복사 3 ms, 계산 5 ms일 때 총 시간이 48 ms에서 33 ms로 줄어요.',
        '버퍼 <b>3개</b>를 골라 보세요. 더는 거의 빨라지지 않아요. 계산이 가장 느린 구간이라서, 늘어난 버퍼는 놀고만 있어요.',
        '2개로 돌아와 <b>신호 안 기다리고 덮어쓰기</b>를 켜고 재생해 보세요. 몇 개 블록이 ✗로 표시되나요? 복사를 6 ms, 계산을 2 ms로 바꿔 다시 해 보세요. 이번에는 왜 또 「우연히」 괜찮을까요?',
      ],

      pCode: 'PIN_DMA', pTitle: 'DMA와 페이지 고정: 주소가 옮겨지면 어떻게 될까', pTag: '컴퓨터 원리 · 개념도',
      pIntro: '프로그램이 보는 건 <b>가상 주소</b>예요. 운영체제는 페이지 테이블로 가상 페이지를 실제 물리 페이지 프레임으로 바꾸고, 언제든 페이지를 옮길 수 있어요. DMA 엔진은 페이지 테이블을 보지 않고 작업을 시작할 때 받은 물리 페이지 프레임만 알아요. <b>한 단계</b>를 눌러 「옮기는 도중 메모리가 부족해지는」 과정을 보고, 「페이지 고정」을 켜서 비교해 보세요.',
      pLgOurs: '우리 버퍼가 있는 프레임', pLgOther: '다른 프로그램이 쓰는 프레임', pLgFree: '빈 프레임', pLgDma: 'DMA가 읽는 프레임',
      pSteps: ['버퍼 요청', 'DMA에게 넘김', '절반 옮김', '메모리 부족', '이어서 옮김', '완료'],
      vLabel: '가상 페이지 (프로그램이 보는 것)', fLabel: '물리 페이지 프레임 (실제 메모리)',
      vPage: (i) => `페이지 ${i}`, frame: (i) => `프레임 ${i}`,
      dmaText: (fr, done) => `DMA가 받은 프레임: ${fr.join(', ')}. ${done}페이지 옮김`,
      bStep: '▶ 한 단계', bReset: '초기화', bPinOff: '페이지 고정: 꺼짐', bPinOn: '페이지 고정: 켜짐',
      pReady: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 누르세요',
      pLog: {
        alloc: '프로그램이 4페이지 크기의 버퍼를 요청해요. 페이지 테이블이 페이지 0-3을 물리 프레임 2, 5, 3, 7로 바꿔요. 프로그램이 보는 주소는 이어져 있지만 실제 위치는 흩어져 있어요',
        handoff: '드라이버가 이 물리 프레임 번호 4개를 DMA 엔진에 넘겨요. 이제부터 DMA는 이 번호들만 알고, 페이지 테이블은 보지 않아요',
        copying: 'DMA가 옮기기 시작해요. 페이지 0과 1은 이미 그래픽 카드로 갔어요',
        pressureMove: '<span class="m">메모리 부족</span>: 운영체제가 페이지 2를 프레임 6으로 옮기고, 프레임 3을 다른 프로그램에 줬어요. 페이지 테이블은 바뀌었는데 DMA가 쥔 번호는 그대로예요',
        pressurePinned: '<span class="c">메모리 부족</span>: 운영체제가 페이지를 옮기려 했지만 이 4페이지는 <b>고정</b>돼 있어서, 남의 페이지를 건드릴 수밖에 없어요. 프레임은 2, 5, 3, 7 그대로예요',
        resumeBad: '<span class="m">DMA 재개</span>: 옛 번호대로 프레임 3을 읽어서 다른 프로그램의 데이터를 읽었어요. 그래픽 카드의 페이지 2가 틀렸는데 오류는 하나도 없어요',
        resumeOk: '<span class="c">DMA 재개</span>: 프레임 3과 7은 여전히 우리 것이라서 페이지 2와 3을 제대로 옮겼어요',
        finish: '옮기기 끝',
      },
      sPtK: '지금의 페이지 테이블 (페이지 0-3 → 프레임)', sDmaK: 'DMA가 쥔 프레임', sResK: '결과',
      sPtF: '<b>페이지 테이블은 운영체제가 관리해요</b><br>언제든 바꿀 수 있어요', sDmaF: '<b>작업 시작 때 받은 값, 중간에 안 바뀌어요</b>', sResF: '<b>올바르려면</b>: 옮기는 동안<br>페이지가 옮겨지면 안 돼요',
      resOk: '정상', resBad: '페이지 2가 틀림', resNa: '—',
      vPinOff: '페이지를 고정하지 않으면 운영체제가 옮기는 도중에 페이지 하나를 옮겨 버려요. DMA는 옛 주소대로 읽어서 남의 데이터를 읽어요. 방향이 반대라면(그래픽 카드에서 RAM으로 되쓰기) 다른 프로그램의 메모리까지 망가뜨려요. 이것이 DMA에 <b>고정 메모리</b>가 필요한 이유예요.',
      vPinOn: '페이지를 고정하면 운영체제가 잠금을 풀기 전까지 이 페이지를 옮기거나 스왑 아웃하지 않아요. 그러면 DMA가 시작할 때 받은 프레임 번호대로 읽고 써도 안전해요. 대가는 이 메모리를 다른 곳에서 쓸 수 없다는 거예요.',
      pTry: [
        '페이지 고정을 끈 채로 끝까지 한 단계씩 가 보세요. 4단계에서 페이지 테이블이 바뀌고, 5단계에서 결과가 틀려요. DMA가 쥔 번호는 처음부터 끝까지 그대로라는 점을 보세요.',
        '<b>페이지 고정</b>을 켜고 다시 해 보세요. 4단계에서 운영체제가 이 페이지들을 건드릴 수 없어서 결과가 맞아요.',
        '생각해 보세요. Strata는 시작할 때 왜 수십 GB의 전문가를 메모리에 고정할까요? 고정이 많아지면 시스템의 다른 부분은 어떻게 될까요?',
      ],
    },
    ja: {
      code: 'DOUBLE_BUFFER', title: 'ダブルバッファ：転送しながら計算する', tag: '教育用の試算 · 6 ブロック',
      intro: '6 ブロックのデータを、RAM から GPU へ転送してから計算します。コピーエンジンと計算ユニットは別々のハードウェアで、同時に働けます。ただし、どのブロックもまず<b>バッファ</b>に入れる必要があります。バッファが 1 つなら「転送が終わってから計算し、計算が終わってから転送する」しかできません。2 つあれば、片方を転送しているあいだに、もう片方を計算できます。次に「合図を待たずに上書き」をオンにしてみましょう。まだ読んでいる最中のバッファに、次のブロックを書き込みます。',
      lgBufs: ['バッファ A', 'バッファ B', 'バッファ C'], lgBad: '上書きされたデータを読んだ',
      steps: ['空きバッファへコピー', '「コピー完了」を通知', '計算', '「使用完了」を通知', 'バッファを再利用'],
      laneCopy: 'コピー', laneComp: '計算',
      bufLabel: 'バッファ数', bufN: (n) => `${n} 個`,
      copyLabel: '1 ブロックのコピー', compLabel: '1 ブロックの計算', ms: (v) => `${v} ms`,
      bPlay: '▶ 再生', bWaitOn: '合図を待たずに上書き：オフ', bWaitOff: '合図を待たずに上書き：オン',
      totalText: (t, s) => `合計 ${t} ms（すべて直列なら ${s} ms）`,
      badText: (list) => `✗ 上書きされたデータを読んだブロック：${list.join('、')}`, okText: '✓ どのブロックも自分のデータを読めた',
      ready: '<span class="c">$</span> ready. 値を決めて [ ▶ 再生 ] を押してください',
      lCopy: (t, i, b) => `<span class="c">t=${t}</span> ブロック ${i} のコピーを開始 → バッファ ${b}`,
      lWait: (t, i, b, prev, until) => `<span class="y">t=${t}</span> ブロック ${i} をバッファ ${b} へコピーしたいが、ブロック ${prev} がまだ使用中。「使用完了」の合図を待ち、t=${until} に開始`,
      lClobber: (t, i, b, prev, until) => `<span class="m">t=${t}</span> 合図を待たず、ブロック ${i} をそのまま ${b} へ書き込む。ところがブロック ${prev} は t=${until} まで計算する。後半はブロック ${i} のデータを読んでしまう`,
      lComp: (t, i) => `<span class="c">t=${t}</span> ブロック ${i} のコピーが完了（「コピー完了」の合図）。計算を開始`,
      lDone: (t) => `<span class="y">// t=${t} すべて計算完了</span>`,
      sTotK: '合計時間', sTotF: (n, c, k, b) => b >= 2 ? `<b>≈ ${c} ＋ (${n} − 1) × max(${c}, ${k}) ＋ ${k}</b><br>最初のコピー ＋ 間は遅いほう ＋ 最後の計算` : `<b>= ${n} × (${c} ＋ ${k})</b><br>バッファは 1 つだけ：コピーと計算が交代で進む`,
      sSerK: 'すべて直列（比較用）', sSerF: '<b>= ブロック数 × (コピー ＋ 計算)</b>',
      sBadK: '読み間違えたブロック', sBadF: '<b>上書きを始めたとき、前の読み手がまだ計算中</b><br>プログラムは普通に最後まで走り、エラーは出ない',
      vOk: (t, s) => `① 合計時間は <b>${t} ms</b> で、すべて直列の ${s} ms より短くなりました。コピーが計算の裏に隠れたのです。<br>② バッファを上書きする前に、毎回、前の読み手の「使用完了」の合図を待ちました。だからどのブロックも正しい値です。<br>③ バッファを増やしても、「いちばん遅い区間 × ブロック数」より速くはなりません。ボトルネックは消せません。もう一方を、その裏に隠せるだけです。`,
      vBad: (t, n) => `① 合図を待たない場合の合計時間は <b>${t} ms</b> で、きちんと待つ場合より速くなっていません。もともと計算がボトルネックだからです。<br>② それなのに <b>${n}</b> ブロックが上書きされたデータを読みました。プログラムは普通に最後まで走り、エラーは 1 つも出ません。<br>③ ダブルバッファが正しく動くのは、「メモリを 2 つ確保したから」ではありません。2 つの合図があるからです。コピーが終わってから読む。使い終わってから書く。`,
      try: [
        'バッファを <b>1 個</b>にして再生し、次に <b>2 個</b>にします。コピー 3 ms、計算 5 ms なら、合計時間は 48 ms から 33 ms に下がります。',
        '<b>3 個</b>にします。ほとんど速くなりません。計算がいちばん遅い区間で、増えたバッファは遊ぶだけです。',
        '2 個に戻し、<b>合図を待たずに上書き</b>をオンにして再生します。✗ が付くのは何ブロックでしょう。コピーを 6 ms、計算を 2 ms にしてもう一度試します。今度は、なぜ「たまたま」大丈夫なのでしょう。',
      ],

      pCode: 'PIN_DMA', pTitle: 'DMA とピン留め：アドレスを動かされたら？', pTag: '計算機の原理 · 模式図',
      pIntro: 'プログラムが見ているのは<b>仮想アドレス</b>です。OS はページテーブルで、仮想ページを本物の物理ページフレームに翻訳します。しかも、いつでもページを動かす可能性があります。DMA エンジンはページテーブルを見ません。開始時にもらった物理ページフレームだけを信じます。<b>ステップ</b>を押して、「転送の途中でメモリが足りなくなる」過程を見てください。そのあと「ピン留め」をオンにして比べます。',
      pLgOurs: '私たちのバッファがあるフレーム', pLgOther: '別のプログラムが使うフレーム', pLgFree: '空きフレーム', pLgDma: 'DMA がいま読んでいるフレーム',
      pSteps: ['バッファを確保', 'DMA に渡す', '半分転送', 'メモリ不足', '転送を続ける', '完了'],
      vLabel: '仮想ページ（プログラムから見えるもの）', fLabel: '物理ページフレーム（実際のメモリ）',
      vPage: (i) => `ページ ${i}`, frame: (i) => `#${i}`,
      dmaText: (fr, done) => `DMA のフレーム：${fr.join('、')}（${done} ページ転送済み）`,
      bStep: '▶ ステップ', bReset: 'リセット', bPinOff: 'ピン留め：オフ', bPinOn: 'ピン留め：オン',
      pReady: '<span class="c">$</span> ready. [ ▶ ステップ ] を押してください',
      pLog: {
        alloc: 'プログラムが 4 ページ分のバッファを確保します。ページテーブルは、ページ 0–3 を物理フレーム 2、5、3、7 に対応づけます。プログラムから見たアドレスは連続ですが、本当の場所はばらばらです',
        handoff: 'ドライバが、この 4 つの物理フレーム番号を DMA エンジンに渡します。ここから先、DMA はこの番号の列だけを信じ、ページテーブルを見ません',
        copying: 'DMA が転送を始めます。ページ 0 とページ 1 は、もう GPU に届きました',
        pressureMove: '<span class="m">メモリ不足</span>：OS がページ 2 をフレーム 6 へ動かし、フレーム 3 を別のプログラムに渡しました。ページテーブルは更新されましたが、DMA の手元の番号は変わりません',
        pressurePinned: '<span class="c">メモリ不足</span>：OS はページを動かしたいのですが、この 4 ページは<b>ピン留め</b>されています。他人のページに手を出すしかありません。フレームは 2、5、3、7 のままです',
        resumeBad: '<span class="m">DMA が再開</span>：古い番号どおりにフレーム 3 を読み、別のプログラムのデータを読みました。GPU 上のページ 2 は間違いです。エラーは出ません',
        resumeOk: '<span class="c">DMA が再開</span>：フレーム 3 と 7 は今も私たちのものです。ページ 2 とページ 3 は正しく転送されました',
        finish: '転送完了',
      },
      sPtK: 'いまのページテーブル（ページ 0–3 → フレーム）', sDmaK: 'DMA の手元のフレーム', sResK: '結果',
      sPtF: '<b>ページテーブルは OS が管理する</b><br>いつでも書き換えられる', sDmaF: '<b>開始時にもらい、途中で変わらない</b>', sResF: '<b>正しくなる条件</b>：転送のあいだ、<br>ページが動かされないこと',
      resOk: '正しい', resBad: 'ページ 2 が間違い', resNa: '—',
      vPinOff: 'ピン留めしないと、OS が転送の途中でページを動かします。DMA は古いアドレスのまま読み、他人のデータを読んでしまいます。向きが逆なら（GPU から RAM へ書き戻すとき）、別のプログラムのメモリを壊します。これが、DMA に<b>ピン留めメモリ</b>が必要な理由です。',
      vPinOn: 'ピン留めすると、OS は解除するまでこれらのページを動かさず、スワップアウトもしません。DMA は開始時のフレーム番号どおりに安全に読み書きできます。代償は、このメモリを他の人が使えないことです。',
      pTry: [
        'ピン留めをオフにしたまま、最後までステップします。第 4 ステップでページテーブルが変わり、第 5 ステップで結果が間違います。DMA の手元の番号は、最初から最後まで変わっていません。',
        '<b>ピン留め</b>をオンにして、もう一度通します。第 4 ステップで OS はこれらのページに手を出せず、結果は正しくなります。',
        '考えてみましょう。Strata は起動時に、なぜ数十 GB のエキスパートをメモリにピン留めするのでしょう。たくさんピン留めすると、システムのほかの部分はどうなるでしょう。',
      ],
    },
  });

  Viz.register('double-buffer', {
    mount(el, ctx) {
      const N = 6;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      const bufColors = ['var(--accent)', 'var(--a3)', 'var(--muted)'];
      body.insertAdjacentHTML('beforeend', Viz.legend([
        ...T.lgBufs.map((t, i) => ({ color: bufColors[i], text: t, glow: i === 0 })),
        { color: 'var(--a2)', text: T.lgBad },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 176', class: 'viz-stage', role: 'img', 'aria-label': T.title }, left);
      const X0 = 48, SPAN = 306;
      Viz.svg('text', { x: 4, y: 40, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = T.laneCopy;
      Viz.svg('text', { x: 4, y: 90, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = T.laneComp;
      Viz.svg('rect', { x: X0, y: 20, width: SPAN, height: 30, style: 'fill:var(--side)' }, svg);
      Viz.svg('rect', { x: X0, y: 70, width: SPAN, height: 30, style: 'fill:var(--side)' }, svg);
      const barsG = Viz.svg('g', {}, svg);
      const cursor = Viz.svg('rect', { x: X0, y: 14, width: 2, height: 92, style: 'fill:var(--ink)', opacity: 0 }, svg);
      const totalT = Viz.svg('text', { x: 4, y: 130, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const badT = Viz.svg('text', { x: 4, y: 156, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      left.insertAdjacentHTML('beforeend', `
        <div class="viz-row"><span style="font-size:14px">${T.bufLabel}</span>${[1, 2, 3].map(n => `<button type="button" class="viz-btn ghost" data-b="${n}">${T.bufN(n)}</button>`).join('')}</div>
        <div class="viz-slider"><label>${T.copyLabel}</label><input type="range" min="1" max="8" value="3" aria-label="${Viz.esc(T.copyLabel)}"><output>3 ms</output></div>
        <div class="viz-slider"><label>${T.compLabel}</label><input type="range" min="1" max="8" value="5" aria-label="${Viz.esc(T.compLabel)}"><output>5 ms</output></div>
        <div class="viz-row">${Viz.button(T.bPlay)}${Viz.button(T.bWaitOn, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = Viz.stat({ id: 'd-tot', k: T.sTotK, v: '', f: '', hot: true }) + Viz.stat({ id: 'd-ser', k: T.sSerK, v: '', f: T.sSerF }) + Viz.stat({ id: 'd-bad', k: T.sBadK, v: '', f: T.sBadF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [cR, kR] = left.querySelectorAll('input[type=range]');
      const playBtn = [...left.querySelectorAll('.viz-btn')].find(b => b.textContent === T.bPlay);
      const waitBtn = [...left.querySelectorAll('.viz-btn')].find(b => b.textContent === T.bWaitOn);
      let B = 2, wait = true, busy = false, res;
      const bufName = b => String.fromCharCode(65 + b);
      function compute() { res = M.doubleBuffer({ n: N, copyMs: +cR.value, computeMs: +kR.value, buffers: B, wait }); return res; }
      function draw() {
        compute();
        el.querySelectorAll('[data-b]').forEach(b => { b.className = 'viz-btn ' + (+b.dataset.b === B ? '' : 'ghost'); });
        cR.nextElementSibling.textContent = T.ms(cR.value); kR.nextElementSibling.textContent = T.ms(kR.value);
        const X = t => X0 + t / res.serial * SPAN;
        barsG.innerHTML = '';
        res.chunks.forEach(c => {
          const put = (y, a, b, fill, label) => {
            Viz.svg('rect', { x: X(a), y, width: Math.max(1, X(b) - X(a) - 1), height: 30, style: `fill:${fill}` }, barsG);
            if (X(b) - X(a) >= 14) Viz.svg('text', { x: (X(a) + X(b)) / 2, y: y + 20, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--paper)' }, barsG).textContent = label;
          };
          put(20, c.copyStart, c.copyEnd, bufColors[c.buf], c.i + 1);
          put(70, c.compStart, c.compEnd, c.corrupted ? 'var(--a2)' : bufColors[c.buf], c.corrupted ? '✗' : c.i + 1);
        });
        totalT.textContent = T.totalText(res.total, res.serial);
        badT.textContent = res.corrupted.length ? T.badText(res.corrupted.map(i => i + 1)) : T.okText;
        badT.style.fill = res.corrupted.length ? 'var(--a2)' : 'var(--ink)';
        $('[data-s=d-tot-v]').textContent = res.total + ' ms';
        $('[data-s=d-tot-f]').innerHTML = T.sTotF(N, +cR.value, +kR.value, B);
        $('[data-s=d-ser-v]').textContent = res.serial + ' ms';
        $('[data-s=d-bad-v]').textContent = res.corrupted.length;
        $('.viz-verdict').hidden = true;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true); cR.disabled = kR.disabled = true;
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) { el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false); cR.disabled = kR.disabled = false; }
      }
      playBtn.onclick = () => guard(async () => {
        draw(); term.clear();
        const X = t => X0 + t / res.serial * SPAN, c = +cR.value;
        const events = [];
        res.chunks.forEach((ch, idx) => {
          const prev = idx - B >= 0 ? res.chunks[idx - B] : null;
          const wanted = idx === 0 ? 0 : res.chunks[idx - 1].copyEnd;
          if (prev && wait && ch.copyStart > wanted) events.push([wanted, 0, T.lWait(wanted, idx + 1, bufName(ch.buf), prev.i + 1, ch.copyStart)]);
          if (prev && !wait && ch.copyStart < prev.compEnd) events.push([ch.copyStart, 0, T.lClobber(ch.copyStart, idx + 1, bufName(ch.buf), prev.i + 1, prev.compEnd)]);
          events.push([ch.copyStart, 1, T.lCopy(ch.copyStart, idx + 1, bufName(ch.buf))]);
          events.push([ch.compStart, 2, T.lComp(ch.compStart, idx + 1)]);
        });
        events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        cursor.setAttribute('opacity', 1);
        for (const [t, kind, msg] of events) {
          cursor.setAttribute('x', X(t) - 1);
          pipe.set(kind === 2 ? 2 : kind === 1 ? 0 : 3);
          term.log(msg);
          await ctx.sleep(320);
        }
        cursor.setAttribute('x', X(res.total) - 1); pipe.set(4);
        term.log(T.lDone(res.total));
        await ctx.sleep(200);
        cursor.setAttribute('opacity', 0);
        const v = $('.viz-verdict');
        v.innerHTML = res.corrupted.length ? T.vBad(res.total, res.corrupted.length) : T.vOk(res.total, res.serial);
        v.hidden = false;
        void c;
      });
      waitBtn.onclick = () => { wait = !wait; waitBtn.textContent = wait ? T.bWaitOn : T.bWaitOff; waitBtn.className = 'viz-btn ' + (wait ? 'ghost' : 'alt'); draw(); };
      el.querySelectorAll('[data-b]').forEach(b => { b.onclick = () => { if (busy) return; B = +b.dataset.b; draw(); }; });
      cR.oninput = draw; kR.oninput = draw;
      draw();
    },
  });

  Viz.register('pin-dma', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.pCode, title: T.pTitle, tag: T.pTag, intro: T.pIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.pLgOurs, glow: true },
        { color: 'var(--a3)', text: T.pLgOther },
        { color: 'var(--frame)', text: T.pLgFree },
        { color: 'var(--a2)', text: T.pLgDma },
      ]));
      const pipe = Viz.pipe(body, T.pSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 196', class: 'viz-stage', role: 'img', 'aria-label': T.pTitle }, left);
      const tx = (x, y, s, size, fill, anchor) => { const e = Viz.svg('text', { x, y, 'font-size': size || 13, 'text-anchor': anchor || 'start', style: `fill:${fill || 'var(--ink)'}` }, svg); e.textContent = s; return e; };
      tx(4, 14, T.vLabel, 12, 'var(--muted)');
      const vx = i => 4 + i * 89 + 42;
      for (let i = 0; i < 4; i++) { Viz.svg('rect', { x: 4 + i * 89, y: 20, width: 84, height: 28, class: 'viz-cell' }, svg); tx(vx(i), 39, T.vPage(i), 13, 'var(--ink)', 'middle'); }
      const links = Viz.svg('g', {}, svg);
      tx(4, 100, T.fLabel, 12, 'var(--muted)');
      const fx = f => 4 + f * 44.5 + 21;
      const frames = [];
      for (let f = 0; f < 8; f++) { frames.push(Viz.svg('rect', { x: 4 + f * 44.5, y: 106, width: 42, height: 28, class: 'viz-cell' }, svg)); }
      const fTexts = [...Array(8).keys()].map(f => tx(fx(f), 125, T.frame(f), 12, 'var(--ink)', 'middle'));
      const dmaT = tx(4, 160, '', 13);
      const resT = tx(4, 186, '', 13);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bReset, 'ghost')}${Viz.button(T.bPinOff, 'ghost')}</div>`);
      const term = Viz.term(left, T.pReady);
      right.innerHTML = Viz.stat({ id: 'p-pt', k: T.sPtK, v: '—', f: T.sPtF }) + Viz.stat({ id: 'p-dma', k: T.sDmaK, v: '—', f: T.sDmaF }) + Viz.stat({ id: 'p-res', k: T.sResK, v: '—', f: T.sResF, hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.pTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, resetBtn, pinBtn] = left.querySelectorAll('.viz-btn');
      let pinned = false, steps, i;
      const OTHER = [0, 4];   // frames another program owns from the start
      function load() {
        steps = M.pinTimeline(pinned); i = 0;
        pinBtn.textContent = pinned ? T.bPinOn : T.bPinOff; pinBtn.className = 'viz-btn ' + (pinned ? 'alt' : 'ghost');
        $('.viz-verdict').hidden = true; pipe.set(-1); paint(null);
        term.clear(); term.log(T.pReady);
        ['p-pt', 'p-dma', 'p-res'].forEach(id => { $(`[data-s=${id}-v]`).textContent = '—'; });
      }
      function paint(s) {
        links.innerHTML = '';
        const st = s || steps[0];
        const ours = s ? st.frames : [];
        const other = OTHER.concat(s && s.key !== 'alloc' && s.key !== 'handoff' && s.key !== 'copying' && !pinned ? [3] : []);
        frames.forEach((r, f) => {
          let fill = 'var(--frame)';
          if (other.includes(f)) fill = 'var(--a3)';
          if (ours.includes(f)) fill = 'var(--accent)';
          if (s && (s.key === 'resume' || s.key === 'copying') && s.dmaFrames[s.key === 'resume' ? 2 : 1] === f) fill = 'var(--a2)';
          r.style.fill = fill;
          fTexts[f].style.fill = fill === 'var(--frame)' ? 'var(--ink)' : 'var(--paper)';
        });
        if (s) st.frames.forEach((f, p) => Viz.svg('path', { d: `M${vx(p)} 48L${fx(f)} 106`, style: 'stroke:var(--muted);stroke-width:1.5;fill:none' }, links));
        dmaT.textContent = s && s.key !== 'alloc' ? T.dmaText(st.dmaFrames, st.done) : '';
        resT.textContent = s && (s.key === 'resume' || s.key === 'finish') ? (s.ok ? '✓ ' + T.resOk : '✗ ' + T.resBad) : '';
        resT.style.fill = s && !s.ok ? 'var(--a2)' : 'var(--ink)';
      }
      stepBtn.onclick = () => {
        if (i >= steps.length) load();
        const s = steps[i];
        pipe.set(i);
        const L = T.pLog;
        term.log(s.key === 'pressure' ? (pinned ? L.pressurePinned : L.pressureMove) : s.key === 'resume' ? (s.ok ? L.resumeOk : L.resumeBad) : L[s.key]);
        paint(s);
        $('[data-s=p-pt-v]').textContent = s.frames.join(' ');
        $('[data-s=p-dma-v]').textContent = s.key === 'alloc' ? '—' : s.dmaFrames.join(' ');
        $('[data-s=p-res-v]').textContent = s.key === 'resume' || s.key === 'finish' ? (s.ok ? T.resOk : T.resBad) : T.resNa;
        i++;
        if (i === steps.length) { const v = $('.viz-verdict'); v.innerHTML = pinned ? T.vPinOn : T.vPinOff; v.hidden = false; }
      };
      resetBtn.onclick = () => load();
      pinBtn.onclick = () => { pinned = !pinned; load(); };
      load();
      void ctx;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
