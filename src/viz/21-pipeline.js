/* Chapter 21 widgets: the two-GPU layer pipeline and the hand-off cost on different links.
   All visible text lives in the T tables below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.pipeline;

  const T = Viz.t({
    zh: {
      code: 'PIPE_SIM', title: '双卡流水线：读提示词', tag: '教学推演 · 时间为假设值',
      intro: '提示词被切成 N 块，前一张卡读前半段层，后一张卡读后半段层。拖动滑块改时间，按 <b>▶ 播放</b> 看两张卡什么时候在干活、什么时候在空等。单位是毫秒，数值是教学假设。',
      lgA: '前一张卡（GPU A）读一块', lgB: '后一张卡（GPU B）读一块', lgX: '搬运交接数据', lgIdle: '空等（气泡）',
      steps: ['切成块', '填充', '两卡同时忙', '排空', '完成'],
      rowA: 'GPU A', rowB: 'GPU B', axis: (t) => `${t} ms`,
      sA: 'GPU A 读一块（a）', sB: 'GPU B 读一块（b）', sX: '每次搬运（x）', sN: '块数（N）',
      bPlay: '▶ 播放', bOne: '只算一个 token', bReset: '重置',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 播放 ]，时间线从左往右走',
      kTotal: '双卡总时间', fTotal: (a, b, n, m) => `<b>= (a+x) + (b+x) + (N−1) × max</b><br>= ${a} + ${b} + ${n - 1} × ${m}`,
      kSerial: '一张卡串行做完', fSerial: (n, a, b) => `<b>= N × (a + b)</b><br>= ${n} × (${a} + ${b})`,
      kSpeed: '加速比', fSpeed: '<b>= 串行时间 ÷ 双卡时间</b><br>大于 1 才算赚到',
      kIdle: '两张卡各空等多久', fIdle: (n, a, b) => `<b>A 空等 = 总时间 − ${n} × ${a}</b><br><b>B 空等 = 总时间 − ${n} × ${b}</b>`,
      idle: (a, b) => `A ${a} · B ${b} ms`,
      try: [
        '保持 a = 4、b = 5、x = 0，把 N 从 1 拉到 8：总时间是 <b>5N + 4</b>。块越多，开头和结尾的气泡占比越小。',
        '把搬运 x 调到 1，再按 <b>只算一个 token</b>：N = 1 时双卡比单卡还慢。同一个 token 的层必须一层接一层算，两张卡帮不上彼此，还要多搬两次。',
        '把 a 拉到 2、b 拉到 8：慢的那张卡决定节拍，快的那张卡大部分时间在空等。这就是为什么要按速度分层。',
      ],
      lStartA: (c, t) => `<span class="c">t=${t}</span> GPU A 开始读第 ${c} 块（前半段层）`,
      lHand: (c, t) => `<span class="y">t=${t}</span> GPU A 交出第 ${c} 块，数据放进内存里的交接缓冲区`,
      lStartB: (c, t, w) => `<span class="c">t=${t}</span> GPU B 开始读第 ${c} 块${w > 0 ? `（它刚才空等了 ${w} ms）` : ''}`,
      lFull: (t) => `<span class="m">t=${t}</span> 填充结束：两张卡第一次同时在干活`,
      lDrain: (t) => `<span class="m">t=${t}</span> 排空开始：GPU A 已经没有新块，只剩 GPU B 在收尾`,
      lDone: (t, s) => `<span class="w">完成</span>：t = ${t} ms，一张卡串行要 ${s} ms`,
      verdict: (n, tot, ser, sp) => n === 1
        ? `只有 1 块时，双卡要 <b>${tot} ms</b>，一张卡串行要 <b>${ser} ms</b>，双卡最多打平。同一份数据必须先过前半段层、再过后半段层，两张卡没法同时帮它。层切分让<b>单个 token</b> 变快的唯一途径，是每张卡能多缓存专家、少让 CPU 算。`
        : `${n} 块用了 <b>${tot} ms</b>，串行要 <b>${ser} ms</b>，加速 <b>${sp}</b> 倍。两张卡只有在处理<b>不同</b>块时才能同时忙；开头填充、结尾排空的气泡省不掉，慢的那张卡决定节拍。`,

      rCode: 'LINK_BUDGET', rTitle: '交接一次要多久', rTag: '教学推演 · 延迟为假设值',
      rIntro: '同样两张卡，换一种分工、换一种连线，通信代价差多少？<b>每次跨卡 = 固定延迟 + 字节数 ÷ 带宽</b>。层切分每个验证窗口交接一次，经内存中转要过两次总线；假想的张量并行每层同步两次。',
      rLgSplit: '层切分（Strata 的做法）', rLgTp: '张量并行（假想对照）', rLgPre: '读提示词时交接一块',
      links: { p4x4: 'PCIe 4.0 ×4', p3x16: 'PCIe 3.0 ×16', p4x16: 'PCIe 4.0 ×16', p5x16: 'PCIe 5.0 ×16', nvl4: 'NVLink 4.0' },
      linkNote: { p4x4: '主板上较短的插槽', p3x16: '老一些的主板', p4x16: '常见的显卡插槽', p5x16: '新平台的显卡插槽', nvl4: 'H100 的 18 条链路' },
      sT: '窗口里的 token 数', sLat: '每次跨卡的固定延迟（µs）',
      lane1: '层切分', lane1s: '每窗口 2 次', lane2: '张量并行', lane2s: '每窗口 96 次', lane3: '提示词一块', lane3s: '2048 个 token',
      eq1: (t, kb, n) => `2 × (${t} µs + ${kb} KB ÷ 带宽)，${n} 个 token × 51,216 字节`,
      eq2: (t, kb) => `96 × (${t} µs + ${kb} KB ÷ 带宽)，48 层 × 每层 2 次同步`,
      eq3: (mb) => `2 × ${mb} MB ÷ 带宽，只算带宽不算延迟`,
      kRatio: '张量并行 ÷ 层切分', fRatio: '<b>= 张量并行耗时 ÷ 层切分耗时</b><br>同步次数多，固定延迟就被乘了 96 次',
      kBytes: '层切分每窗口搬的字节', fBytes: (n) => `<b>= 2 × ${n} × 51,216 字节</b><br>51,216 = (4 × 2560 + 2560 + 4) × 4`,
      log: (name, n, lat, s, tp) => `<span class="c">${name}</span> · ${n} 个 token · 延迟 ${lat} µs → 层切分 <span class="y">${s} µs</span>，张量并行 <span class="m">${tp} µs</span>`,
      rReady: '<span class="c">$</span> 选一种连线，拖动滑块，这里会记下每次的结果',
      rVerdict: (s, tp, r, pre) => `① 层切分每个窗口只交接一次，约 <b>${s} µs</b>，和十几毫秒的窗口比可以忽略。<br>② 假想的张量并行要同步 96 次，约 <b>${tp} µs</b>，是层切分的 <b>${r}</b> 倍；它更怕延迟，所以通常配 NVLink 这类快速互连。<br>③ 读提示词时一块 2048 个 token 的交接约 <b>${pre} ms</b>，比读这一块本身的时间小得多。这就是 Strata 不要求 NVLink、插在 ×4 插槽上也能用的原因。`,
      rTry: [
        '在 <b>PCIe 4.0 ×16</b> 上把延迟从 10 拉到 30 µs：张量并行涨得多，层切分几乎不动。次数比字节更要命。',
        '换到 <b>NVLink 4.0</b>，再把延迟调到 2 µs：张量并行的代价降到几百微秒，这正是数据中心用它的原因。',
        '换到 <b>PCIe 4.0 ×4</b>：提示词一块的交接变成约 21 ms，仍远小于读这一块要花的时间。',
      ],
    },
    en: {
      code: 'PIPE_SIM', title: 'Two-card pipeline: reading a prompt', tag: 'Teaching estimate · times are assumptions',
      intro: 'The prompt is cut into N chunks. The first card reads the front layers and the second card reads the back layers. Drag the sliders to change the times, then press <b>▶ Play</b> to see when each card is working and when it sits idle. Units are milliseconds; the values are teaching assumptions.',
      lgA: 'First card (GPU A) reads a chunk', lgB: 'Second card (GPU B) reads a chunk', lgX: 'Moving handoff data', lgIdle: 'Idle (bubble)',
      steps: ['Cut into chunks', 'Fill', 'Both cards busy', 'Drain', 'Done'],
      rowA: 'GPU A', rowB: 'GPU B', axis: (t) => `${t} ms`,
      sA: 'GPU A per chunk (a)', sB: 'GPU B per chunk (b)', sX: 'Each transfer (x)', sN: 'Chunks (N)',
      bPlay: '▶ Play', bOne: 'Just one token', bReset: 'Reset',
      ready: '<span class="c">$</span> ready. Press [ ▶ Play ] and the timeline runs from left to right',
      kTotal: 'Two-card total time', fTotal: (a, b, n, m) => `<b>= (a+x) + (b+x) + (N−1) × max</b><br>= ${a} + ${b} + ${n - 1} × ${m}`,
      kSerial: 'One card, all in sequence', fSerial: (n, a, b) => `<b>= N × (a + b)</b><br>= ${n} × (${a} + ${b})`,
      kSpeed: 'Speedup', fSpeed: '<b>= serial time ÷ two-card time</b><br>only a gain if above 1',
      kIdle: 'How long each card sits idle', fIdle: (n, a, b) => `<b>A idle = total − ${n} × ${a}</b><br><b>B idle = total − ${n} × ${b}</b>`,
      idle: (a, b) => `A ${a} · B ${b} ms`,
      try: [
        'Keep a = 4, b = 5, x = 0 and drag N from 1 to 8: the total is <b>5N + 4</b>. The more chunks, the smaller the share of the bubbles at the start and the end.',
        'Set the transfer x to 1, then press <b>Just one token</b>: with N = 1, two cards are slower than one. One token\'s layers must be computed one after another, the two cards cannot help each other, and there are two extra transfers.',
        'Drag a to 2 and b to 8: the slow card sets the beat and the fast card is idle most of the time. That is why layers should be assigned by speed.',
      ],
      lStartA: (c, t) => `<span class="c">t=${t}</span> GPU A starts reading chunk ${c} (front layers)`,
      lHand: (c, t) => `<span class="y">t=${t}</span> GPU A hands off chunk ${c}; the data goes into the handoff buffer in RAM`,
      lStartB: (c, t, w) => `<span class="c">t=${t}</span> GPU B starts reading chunk ${c}${w > 0 ? ` (it was just idle for ${w} ms)` : ''}`,
      lFull: (t) => `<span class="m">t=${t}</span> fill done: both cards are working at the same time for the first time`,
      lDrain: (t) => `<span class="m">t=${t}</span> drain starts: GPU A has no new chunks, only GPU B is finishing up`,
      lDone: (t, s) => `<span class="w">Done</span>: t = ${t} ms; one card in sequence would take ${s} ms`,
      verdict: (n, tot, ser, sp) => n === 1
        ? `With only 1 chunk, two cards take <b>${tot} ms</b> and one card in sequence takes <b>${ser} ms</b>; at best two cards break even. The same data must pass the front layers before the back layers, so the two cards cannot work on it at once. The only way a layer split makes a <b>single token</b> faster is that each card can cache more experts and leave less for the CPU.`
        : `${n} chunks took <b>${tot} ms</b>, versus <b>${ser} ms</b> in sequence: a <b>${sp}×</b> speedup. Two cards can both be busy only while handling <b>different</b> chunks; the fill bubble at the start and the drain bubble at the end cannot be avoided, and the slower card sets the beat.`,

      rCode: 'LINK_BUDGET', rTitle: 'How long one handoff takes', rTag: 'Teaching estimate · latency is an assumption',
      rIntro: 'Same two cards, a different split, a different link: how much does the communication cost change? <b>Each crossing = fixed latency + bytes ÷ bandwidth</b>. The layer split hands off once per verify window, crossing the bus twice because it relays through RAM; a hypothetical tensor-parallel split syncs twice per layer.',
      rLgSplit: 'Layer split (Strata\'s way)', rLgTp: 'Tensor parallel (hypothetical comparison)', rLgPre: 'Handing off one chunk while reading a prompt',
      links: { p4x4: 'PCIe 4.0 ×4', p3x16: 'PCIe 3.0 ×16', p4x16: 'PCIe 4.0 ×16', p5x16: 'PCIe 5.0 ×16', nvl4: 'NVLink 4.0' },
      linkNote: { p4x4: 'a shorter motherboard slot', p3x16: 'older motherboards', p4x16: 'a common graphics card slot', p5x16: 'graphics slot on new platforms', nvl4: 'the 18 links of an H100' },
      sT: 'Tokens in the window', sLat: 'Fixed latency per crossing (µs)',
      lane1: 'Layer split', lane1s: '2 per window', lane2: 'Tensor parallel', lane2s: '96 per window', lane3: 'One prompt chunk', lane3s: '2048 tokens',
      eq1: (t, kb, n) => `2 × (${t} µs + ${kb} KB ÷ bandwidth), ${n} tokens × 51,216 bytes`,
      eq2: (t, kb) => `96 × (${t} µs + ${kb} KB ÷ bandwidth), 48 layers × 2 syncs per layer`,
      eq3: (mb) => `2 × ${mb} MB ÷ bandwidth, bandwidth only, no latency`,
      kRatio: 'Tensor parallel ÷ layer split', fRatio: '<b>= tensor-parallel time ÷ layer-split time</b><br>many syncs multiply the fixed latency 96 times',
      kBytes: 'Bytes the layer split moves per window', fBytes: (n) => `<b>= 2 × ${n} × 51,216 bytes</b><br>51,216 = (4 × 2560 + 2560 + 4) × 4`,
      log: (name, n, lat, s, tp) => `<span class="c">${name}</span> · ${n} tokens · latency ${lat} µs → layer split <span class="y">${s} µs</span>, tensor parallel <span class="m">${tp} µs</span>`,
      rReady: '<span class="c">$</span> pick a link and drag the sliders; each result is logged here',
      rVerdict: (s, tp, r, pre) => `① The layer split hands off only once per window, about <b>${s} µs</b>, negligible next to a window of a dozen-odd milliseconds.<br>② The hypothetical tensor-parallel split must sync 96 times, about <b>${tp} µs</b>, <b>${r}×</b> the layer split; it is far more sensitive to latency, which is why it usually comes with a fast link such as NVLink.<br>③ While reading a prompt, handing off one 2048-token chunk takes about <b>${pre} ms</b>, far less than reading the chunk itself. That is why Strata does not need NVLink and works even in a ×4 slot.`,
      rTry: [
        'On <b>PCIe 4.0 ×16</b>, raise the latency from 10 to 30 µs: tensor parallel grows a lot while the layer split barely moves. The number of crossings hurts more than the bytes.',
        'Switch to <b>NVLink 4.0</b> and set the latency to 2 µs: the tensor-parallel cost drops to a few hundred microseconds, which is exactly why data centers use it.',
        'Switch to <b>PCIe 4.0 ×4</b>: handing off one prompt chunk now takes about 21 ms, still far less than the time to read that chunk.',
      ],
    },
  });

  const r1 = v => (Math.round(v * 10) / 10).toString();

  Viz.register('layer-pipeline', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgA, glow: true },
        { color: 'var(--a2)', text: T.lgB },
        { color: 'var(--a3)', text: T.lgX },
        { color: 'var(--frame)', text: T.lgIdle },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 560, X0 = 64, X1 = 548;
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} 150`, class: 'viz-stage', role: 'img', 'aria-label': T.title }, left);
      const sliders = [['a', T.sA, 1, 10, 1, 4], ['b', T.sB, 1, 10, 1, 5], ['x', T.sX, 0, 3, 0.5, 0], ['n', T.sN, 1, 8, 1, 8]];
      left.insertAdjacentHTML('beforeend', sliders.map(([id, lab, lo, hi, st, v]) =>
        `<div class="viz-slider"><label>${lab}</label><input type="range" data-k="${id}" min="${lo}" max="${hi}" step="${st}" value="${v}" aria-label="${Viz.esc(lab)}"><output data-o="${id}">${v}</output></div>`).join('') +
        `<div class="viz-row">${Viz.button(T.bPlay)}${Viz.button(T.bOne, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'p-total', k: T.kTotal, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'p-serial', k: T.kSerial, v: '', f: '' }) +
        Viz.stat({ id: 'p-speed', k: T.kSpeed, v: '', f: T.fSpeed }) +
        Viz.stat({ id: 'p-idle', k: T.kIdle, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const inputs = [...el.querySelectorAll('input[type=range]')];
      const [playBtn, oneBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const P = () => Object.fromEntries(inputs.map(i => [i.dataset.k, +i.value]));
      let sched = null, cursor = null, busy = false;

      function draw() {
        const p = P(), s = M.pipeline(p.a, p.b, p.x, p.n);
        sched = s;
        const scale = (X1 - X0) / s.total, X = t => X0 + t * scale;
        svg.innerHTML = '';
        const rows = [[T.rowA, 30], [T.rowB, 78]];
        rows.forEach(([lab, y]) => {
          Viz.svg('rect', { x: X0, y, width: X1 - X0, height: 30, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
          Viz.svg('text', { x: 6, y: y + 20, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = lab;
        });
        s.chunks.forEach((c, i) => {
          Viz.svg('rect', { x: X(c.aStart), y: 31, width: Math.max(0, p.a * scale - 1), height: 28, style: 'fill:var(--accent)' }, svg);
          if (p.x > 0) Viz.svg('rect', { x: X(c.aStart + p.a), y: 31, width: Math.max(0, p.x * scale - 1), height: 28, style: 'fill:var(--a3)' }, svg);
          if (p.x > 0) Viz.svg('rect', { x: X(c.bStart), y: 79, width: Math.max(0, p.x * scale - 1), height: 28, style: 'fill:var(--a3)' }, svg);
          Viz.svg('rect', { x: X(c.bStart + p.x), y: 79, width: Math.max(0, p.b * scale - 1), height: 28, style: 'fill:var(--a2)' }, svg);
          if (p.a * scale > 14) Viz.svg('text', { x: X(c.aStart) + p.a * scale / 2, y: 50, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--paper)' }, svg).textContent = i + 1;
          if (p.b * scale > 14) Viz.svg('text', { x: X(c.bStart + p.x) + p.b * scale / 2, y: 98, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--paper)' }, svg).textContent = i + 1;
        });
        const ticks = 5;
        for (let i = 0; i <= ticks; i++) {
          const t = s.total * i / ticks;
          Viz.svg('text', { x: X(t), y: 132, 'font-size': 11, 'text-anchor': i === 0 ? 'start' : i === ticks ? 'end' : 'middle', style: 'fill:var(--muted)' }, svg).textContent = T.axis(r1(t));
        }
        cursor = Viz.svg('line', { x1: X0, x2: X0, y1: 22, y2: 116, style: 'stroke:var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3', opacity: 0 }, svg);
        inputs.forEach(i => { $(`[data-o=${i.dataset.k}]`).textContent = i.value; });
        const A = p.a + p.x, B = p.b + p.x;
        $('[data-s=p-total-v]').textContent = r1(s.total) + ' ms';
        $('[data-s=p-total-f]').innerHTML = T.fTotal(r1(A), r1(B), p.n, r1(s.steady));
        $('[data-s=p-serial-v]').textContent = r1(s.serial) + ' ms';
        $('[data-s=p-serial-f]').innerHTML = T.fSerial(p.n, p.a, p.b);
        $('[data-s=p-speed-v]').textContent = s.speedup.toFixed(2) + ' ×';
        $('[data-s=p-idle-v]').textContent = T.idle(r1(s.idleA), r1(s.idleB));
        $('[data-s=p-idle-f]').innerHTML = T.fIdle(p.n, r1(A), r1(B));
        $('.viz-verdict').hidden = true;
        pipe.set(-1);
        return s;
      }

      function events(s) {
        const ev = [];
        s.chunks.forEach((c, i) => {
          ev.push({ t: c.aStart, h: T.lStartA(i + 1, r1(c.aStart)) });
          ev.push({ t: c.aEnd, h: T.lHand(i + 1, r1(c.aEnd)) });
          ev.push({ t: c.bStart, h: T.lStartB(i + 1, r1(c.bStart), r1(i ? c.bStart - s.chunks[i - 1].bEnd : c.bStart)) });
        });
        if (s.chunks.length > 1) {
          ev.push({ t: s.chunks[0].bStart + 1e-6, h: T.lFull(r1(s.chunks[0].bStart)), phase: 2 });
          ev.push({ t: s.chunks.at(-1).aEnd + 2e-6, h: T.lDrain(r1(s.chunks.at(-1).aEnd)), phase: 3 });
        }
        return ev.sort((p, q) => p.t - q.t);
      }

      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn, input').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn, input').forEach(b => b.disabled = false);
      }

      async function play() {
        const s = draw(), ev = events(s), X = t => X0 + t * (X1 - X0) / s.total;
        term.clear();
        pipe.set(0); await ctx.sleep(300);
        pipe.set(1);
        cursor.setAttribute('opacity', 1);
        const frames = ctx.reduced ? 1 : 60;
        let k = 0;
        for (let f = 1; f <= frames; f++) {
          const now = s.total * f / frames;
          cursor.setAttribute('x1', X(now)); cursor.setAttribute('x2', X(now));
          while (k < ev.length && ev[k].t <= now + 1e-9) { term.log(ev[k].h); if (ev[k].phase) pipe.set(ev[k].phase); k++; }
          await ctx.sleep(45);
        }
        while (k < ev.length) term.log(ev[k++].h);
        pipe.set(4);
        term.log(T.lDone(r1(s.total), r1(s.serial)));
        const p = P(), v = $('.viz-verdict');
        v.innerHTML = T.verdict(p.n, r1(s.total), r1(s.serial), s.speedup.toFixed(2));
        v.hidden = false;
      }

      playBtn.onclick = () => guard(play);
      oneBtn.onclick = () => guard(async () => { $('input[data-k=n]').value = 1; await play(); });
      resetBtn.onclick = () => guard(async () => {
        [['a', 4], ['b', 5], ['x', 0], ['n', 8]].forEach(([k, v]) => { $(`input[data-k=${k}]`).value = v; });
        draw(); term.clear(); term.log(T.ready);
      });
      inputs.forEach(i => { i.oninput = () => draw(); });
      draw();
    },
  });

  Viz.register('link-budget', {
    mount(el) {
      const body = Viz.frame(el, { code: T.rCode, title: T.rTitle, tag: T.rTag, intro: T.rIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.rLgSplit, glow: true },
        { color: 'var(--a2)', text: T.rLgTp },
        { color: 'var(--a3)', text: T.rLgPre },
      ]) +
        `<div class="viz-row">${M.LINKS.map(l => `<button type="button" class="viz-btn ghost" data-l="${l.id}">${Viz.esc(T.links[l.id])}</button>`).join('')}</div>` +
        `<div class="viz-slider"><label>${T.sT}</label><input type="range" data-k="t" min="1" max="9" step="1" value="5" aria-label="${Viz.esc(T.sT)}"><output data-o="t">5</output></div>` +
        `<div class="viz-slider"><label>${T.sLat}</label><input type="range" data-k="lat" min="1" max="30" step="1" value="10" aria-label="${Viz.esc(T.sLat)}"><output data-o="lat">10</output></div>` +
        [[T.lane1, T.lane1s, ''], [T.lane2, T.lane2s, ' alt'], [T.lane3, T.lane3s, '']].map(([n, s, alt], i) =>
          `<div class="viz-lane${alt}"><div class="n">${n}<small>${s}</small></div><div class="viz-track"><i data-i="${i}"${i === 2 ? ' style="background:var(--a3)"' : ''}></i></div><div class="t" data-t="${i}"></div><div class="eq" data-e="${i}"></div></div>`).join('') +
        '<div class="viz-cols" style="margin-top:12px"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.innerHTML = Viz.stat({ id: 'l-ratio', k: T.kRatio, v: '', f: T.fRatio, hot: true });
      right.innerHTML = Viz.stat({ id: 'l-bytes', k: T.kBytes, v: '', f: '' });
      const term = Viz.term(body, T.rReady);
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.rTry));
      const $ = s => el.querySelector(s);
      let link = M.LINKS[2];
      function update(log) {
        const n = +$('input[data-k=t]').value, lat = +$('input[data-k=lat]').value;
        $('[data-o=t]').textContent = n; $('[data-o=lat]').textContent = lat;
        el.querySelectorAll('[data-l]').forEach(b => { b.classList.toggle('ghost', b.dataset.l !== link.id); });
        const s = M.layerSplitWindow(n, link.gbps, lat), tp = M.tensorWindow(n, link.gbps, lat), pre = M.prefillHandoffMs(2048, link.gbps);
        const us = [s.us, tp.us], max = Math.max(...us);
        el.querySelectorAll('.viz-track i').forEach((b, i) => { b.style.width = (i < 2 ? us[i] / max : Math.min(1, pre / 25)) * 100 + '%'; });
        $('[data-t="0"]').textContent = r1(s.us) + ' µs';
        $('[data-t="1"]').textContent = Math.round(tp.us) + ' µs';
        $('[data-t="2"]').textContent = r1(pre) + ' ms';
        $('[data-e="0"]').textContent = T.eq1(lat, r1(n * M.DECODE_HANDOFF_BYTES / 1e3), n);
        $('[data-e="1"]').textContent = T.eq2(lat, r1(n * M.N_EMBD * 4 / 1e3));
        $('[data-e="2"]').textContent = T.eq3(r1(M.prefillChunkBytes(2048) / 1e6));
        $('[data-s=l-ratio-v]').textContent = (tp.us / s.us).toFixed(1) + ' ×';
        $('[data-s=l-bytes-v]').textContent = Viz.fmt(s.bytes) + ' B';
        $('[data-s=l-bytes-f]').innerHTML = T.fBytes(n);
        $('.viz-verdict').innerHTML = T.rVerdict(r1(s.us), Math.round(tp.us), (tp.us / s.us).toFixed(0), r1(pre));
        if (log) term.log(T.log(Viz.esc(T.links[link.id]) + ' ' + link.gbps + ' GB/s', n, lat, r1(s.us), Math.round(tp.us)));
      }
      el.querySelectorAll('[data-l]').forEach(b => { b.onclick = () => { link = M.LINKS.find(l => l.id === b.dataset.l); update(true); }; b.title = T.linkNote[b.dataset.l]; });
      el.querySelectorAll('input[type=range]').forEach(i => { i.oninput = () => update(false); i.onchange = () => update(true); });
      update(true);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
