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
