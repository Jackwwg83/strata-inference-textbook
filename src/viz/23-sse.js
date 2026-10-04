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
