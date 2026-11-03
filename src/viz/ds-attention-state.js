/* DeepSeek page "attention" widget: which rows one decode query reads in one layer, and the state a token keeps.
   All visible text lives in the T table below (zh is the master). Numbers come from ds-attention-state.math.js. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsAttentionState;
  const LENS = [64, 128, 300, 512, 1024, 4096, 8192, 32768, 131072, 262144, 524288, 1048576];
  const RS = [0, 1, 4];
  const W = 380, X0 = 10;   // strip and bar: x from 10 to 390 in a 400-wide viewBox

  const T = Viz.t({
    zh: {
      code: 'ATTN_ROWS', title: '一个字这一步读哪些行', tag: '教学推演 · 行数和字节数按本页公式算',
      intro: '选一个上下文长度和压缩比 R，看<b>最后一个字</b>在一层里读哪些行。窗口环里的最近 128 行一定读；索引器再从压缩行里挑最多 512 行；每个头另有一个 sink 数，它不是行，不计入。上下文变长，压缩行 n 在涨，读的行数却停在 640。默认是 R = 1 的层、上下文 8,192，和上面的静态图一致。竖线的位置只是示意，实际由分数决定。',
      lgWin: '窗口：最近 128 行，来自环，不经过挑选', lgPick: '索引器挑的行（最多 512）', lgRest: '其余压缩行：这一步不读，但要一直留着',
      lCtx: '上下文长度 L（token）', lR: '压缩比 R（每 R 个位置一行；0 = 没有压缩行）',
      rBtn: (r) => (r === 0 ? 'R = 0 · 只有窗口' : r === 1 ? 'R = 1 · 20 到 39 层' : `R = ${r} · 画图用的例子`),
      stage: '一个解码字读的行：窗口、挑出的压缩行和其余压缩行',
      stripCap: (n, R) => (R === 0 ? 'R = 0：没有压缩行，只读窗口' : `压缩行 n = ${n}（左旧右新）`),
      barCap: '这一步读的行（整条 = 上限 640）',
      barTxt: (w, p, t) => `窗口 ${w} + 挑选 ${p} = ${t}`,
      sReadK: '这一步读的行（每层）', sReadF: (w, p) => `<b>= 窗口 min(128, L) + 挑选 min(512, n)</b><br>= ${w} + ${p}；上限 128 + 512 = 640`,
      sScanK: '索引器要打分的行数 n',
      sScanF: (R, keys, macs, pairs) => R === 0
        ? '<b>R = 0 的层没有压缩行，也没有索引器</b>'
        : `<b>n = ⌊L ÷ R⌋</b>；每步读索引键 n × 80 B = ${keys}，做 n × 32 × 128 = ${macs} 次乘加<br>读完整段提示共 ${pairs} 对打分`,
      sBytesK: '每层每步从缓存读多少字节', sBytesF: (w, p, all) => `<b>= ${w} × 528 + ${p} × 288</b>（窗口 FP8，压缩行 FP4）${all}`,
      sBytesAll: (b) => `<br>40 层都有压缩行时，一步最多 ${b}`,
      sStateK: '一个字留下的状态（窗口环）',
      sStateF: (src, srcRows, naive) => `<b>= 40 层 × 128 × 528 B</b>，和 L、R 都无关<br>压缩行另算：一个来源层 ${srcRows} 行 × 368 B = ${src}<br>朴素做法（40 层每位置存一行 FP8）要 ${naive}`,
      rows: (n) => `${n} 行`, none: '没有',
      b: (x) => `${x} B`, kib: (x) => `${x} KiB`, mib: (x) => `${x} MiB`, gib: (x) => `${x} GiB`,
      ready: '<span class="c">$</span> 拖动上下文长度，或切换 R',
      l1: (L, R, n) => `<span class="c">[1] 压缩行</span>：${R === 0 ? 'R = 0，没有压缩行' : `n = ⌊${L} ÷ ${R}⌋ = ${n}`}`,
      l2: (n, p, all) => `<span class="m">[2] 挑选</span>：min(512, ${n}) = ${p}${n > 0 && all ? '（n 不超过 512，全选）' : ''}`,
      l3: (L, w, p, t) => `<span class="w">[3] 读取</span>：窗口 min(128, ${L}) = ${w}，共 ${w} + ${p} = ${t} 行`,
      verdict: (t, n, R, rest) => R === 0
        ? `① 这一层 R = 0：只读窗口环里的 ${t} 行，没有压缩行可挑。<br>② 它的状态只有 40 层共约 2.58 MiB 的环，和上下文长度无关。`
        : `① 这一步读 <b>${t}</b> 行，最多 640：上下文再长，读的行也不再增加。<br>② 压缩行 n = <b>${n}</b> 在随上下文涨，索引器要给它们全部打分；${rest}<br>③ 128 个字之前的位置，只靠压缩行留下来。`,
      restFull: 'n 不超过 512，挑选就是全选。', restPick: '挑选只留下其中 512 行，其余这一步不读，但要一直存着。',
      tryList: [
        '把上下文从 <b>8,192</b> 拉到 <b>1,048,576</b>：读的行数不动，压缩行 n 和索引器的扫描量涨了 128 倍。',
        '拉到 <b>300</b>：n 不到 512，索引器全选，读 428 行，比 640 少。',
        '点 <b>R = 4</b>：n 变成 L 的四分之一，一个来源层要存的行也少到约四分之一，读的行数仍是 640。',
      ],
    },
  });

  const ctl = (label, cls, min, max, step, val) => `<div class="viz-slider" style="grid-template-columns:minmax(0,1fr) auto;min-width:0"><label style="grid-column:1/-1;white-space:normal;min-width:0">${label}</label><input class="${cls}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${Viz.esc(label)}"><output style="min-width:0"></output></div>`;
  // Size goes into the inline style too: a page-wide rule shrinks widget svg text to 10px.
  const txt = (svg, x, y, s, extra = {}) => {
    const size = extra['font-size'] || 13;
    const t = Viz.svg('text', { x, y, 'font-size': size, ...extra }, svg);
    t.textContent = s;
    t.setAttribute('style', `${extra.style || 'fill:var(--ink)'};font-size:${size}px`);
    return t;
  };
  const bytesText = (b) => {
    if (b >= 1073741824) return T.gib(Viz.fmt(b / 1073741824, b / 1073741824 < 10 ? 2 : 1));
    if (b >= 1048576) return T.mib(Viz.fmt(b / 1048576, b / 1048576 < 10 ? 2 : b / 1048576 < 100 ? 1 : 0));
    if (b >= 1024) return T.kib(Viz.fmt(b / 1024, 1));
    return T.b(Viz.fmt(b));
  };
  const sci = (x) => {
    if (x < 1e6) return Viz.fmt(x);
    const e = Math.floor(Math.log10(x));
    return `${Viz.fmt(x / 10 ** e, 1)} × 10<sup>${e}</sup>`;
  };

  Viz.register('ds-attention-state', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgWin, glow: true },
        { color: 'var(--a3)', text: T.lgPick },
        { color: 'var(--side)', text: T.lgRest },
      ]) + '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 400 142', class: 'viz-stage', role: 'img', 'aria-label': T.stage }, left);
      left.insertAdjacentHTML('beforeend',
        ctl(T.lCtx, 'a-len', 0, LENS.length - 1, 1, LENS.indexOf(M.DEFAULTS.ctx)) +
        `<div style="font-size:14px;margin-top:14px">${T.lR}</div>` +
        `<div class="viz-row a-r" style="margin-top:6px">${RS.map(r => Viz.button(T.rBtn(r), 'ghost')).join('')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'a-read', k: T.sReadK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'a-scan', k: T.sScanK, v: '', f: '' }) +
        Viz.stat({ id: 'a-bytes', k: T.sBytesK, v: '', f: '' }) +
        Viz.stat({ id: 'a-state', k: T.sStateK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.tryList));
      const $ = s => el.querySelector(s);
      const rBtns = [...el.querySelectorAll('.a-r .viz-btn')];
      const put = (id, v, f) => { $(`[data-s=${id}-v]`).innerHTML = v; $(`[data-s=${id}-f]`).innerHTML = f; };
      let R = M.DEFAULTS.R;
      // Bar segments keep their elements, so a width change can animate unless the reader prefers reduced motion.
      const mk = (tag, attrs, style) => { const e = Viz.svg(tag, attrs, svg); e.setAttribute('style', style + (ctx.reduced ? '' : ';transition:width .25s')); return e; };
      const cap = txt(svg, X0, 16, '');
      mk('rect', { x: X0, y: 24, width: W, height: 30 }, 'fill:var(--side);stroke:var(--frame)');
      const picksFill = mk('rect', { x: X0, y: 24, width: W, height: 30 }, 'fill:var(--a3);opacity:.45');
      const picksPath = Viz.svg('path', { d: '', fill: 'none', 'stroke-width': 1.4 }, svg);
      picksPath.setAttribute('style', 'stroke:var(--a3)');
      const winRect = mk('rect', { x: X0 + W - 5, y: 22, width: 5, height: 34 }, 'fill:var(--accent)');
      txt(svg, X0, 82, T.barCap);
      mk('rect', { x: X0, y: 90, width: W, height: 26 }, 'fill:none;stroke:var(--frame);stroke-dasharray:4 3');
      const segW = mk('rect', { x: X0, y: 90, width: 0, height: 26 }, 'fill:var(--accent)');
      const segP = mk('rect', { x: X0, y: 90, width: 0, height: 26 }, 'fill:var(--a3)');
      const barTxt = txt(svg, X0, 136, '', { style: 'fill:var(--ink);font-weight:700', 'font-size': 14 });

      function update() {
        const L = LENS[+$('.a-len').value];
        const r = M.readState(L, R), sc = M.indexerScan(L, R), ks = M.keptState(L, R);
        $('.a-len + output').textContent = Viz.fmt(L);
        $('.a-len').setAttribute('aria-valuetext', Viz.fmt(L));
        rBtns.forEach((b, i) => { b.className = 'viz-btn' + (RS[i] === R ? '' : ' ghost'); b.setAttribute('aria-pressed', String(RS[i] === R)); });
        cap.textContent = T.stripCap(Viz.fmt(r.n), R);
        const all = r.n > 0 && r.n <= M.TOPK;
        picksFill.setAttribute('width', all ? W : 0);
        picksPath.setAttribute('d', !all && r.picked > 0
          ? M.pickPositions(r.n, r.picked).map(i => `M${(X0 + (i + 0.5) / r.n * W).toFixed(1)} 24V54`).join('') : '');
        const ww = Math.max(5, W * r.window / L);
        winRect.setAttribute('width', ww); winRect.setAttribute('x', X0 + W - ww);
        segW.setAttribute('width', W * r.window / M.MAX_ROWS_PER_LAYER);
        segP.setAttribute('x', X0 + W * r.window / M.MAX_ROWS_PER_LAYER);
        segP.setAttribute('width', W * r.picked / M.MAX_ROWS_PER_LAYER);
        barTxt.textContent = T.barTxt(r.window, r.picked, r.total);
        put('a-read', T.rows(Viz.fmt(r.total)), T.sReadF(r.window, r.picked));
        put('a-scan', R === 0 ? T.none : T.rows(Viz.fmt(sc.rows)),
          T.sScanF(R, bytesText(sc.keyBytes), sci(sc.macs), sci(M.promptPairs(L, R))));
        put('a-bytes', bytesText(r.bytes), T.sBytesF(r.window, r.picked, R > 0 ? T.sBytesAll(bytesText(M.stepBytesPerLayer() * M.LAYERS)) : ''));
        put('a-state', bytesText(ks.ringBytes), T.sStateF(R === 0 ? T.none : bytesText(ks.sourceBytes), Viz.fmt(ks.sourceRows), bytesText(ks.naiveBytes)));
        term.clear();
        term.log(T.l1(Viz.fmt(L), R, Viz.fmt(r.n)));
        term.log(T.l2(Viz.fmt(r.n), Viz.fmt(r.picked), all));
        term.log(T.l3(Viz.fmt(L), r.window, Viz.fmt(r.picked), Viz.fmt(r.total)));
        $('.viz-verdict').innerHTML = T.verdict(Viz.fmt(r.total), Viz.fmt(r.n), R, all ? T.restFull : T.restPick);
      }
      el.querySelectorAll('input').forEach(i => { i.oninput = update; i.onchange = update; });
      rBtns.forEach((b, i) => { b.onclick = () => { R = RS[i]; update(); }; });
      update();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
