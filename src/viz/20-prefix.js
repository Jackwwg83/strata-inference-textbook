/* Chapter 20 widgets: the prefix-match checker and the copy-on-write branch simulator.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.prefix;

  const T = Viz.t({
    zh: {
      code: 'PREFIX_MATCH', title: '检查点能不能用', tag: '规则取自 conversation_cache.hpp · token 为示意',
      intro: '上面一行是引擎存着的检查点，下面一行是新来的请求。点一个场景，看引擎按什么顺序检查、在哪一步放行或拒绝。一个格子代表一个 token，<b>[图A]</b> 代表一张图片占的位置。',
      lgIdle: '还没比较', lgSame: '一致', lgDiff: '不一致', lgTail: '新增的尾巴：要重新读',
      steps: ['收到请求', '比 steering', '比长度', '逐个比 token', '比图片', '给结论'],
      stageLabel: '检查点与新请求逐个 token 对比',
      rowSaved: '检查点（已存）', rowReq: '新请求',
      steer: on => on ? 'steering 开' : 'steering 关',
      tok: { 1: '系统', 2: '提示', 3: '看图', 5: '这是', 6: '什么', 7: '它', 8: '多大', 4: '？', 10: '谁' },
      img: h => h === 0xa ? '[图A]' : '[图B]',
      sc: ['① 追问', '② 改了一个字', '③ 换了一张图', '④ 打开 steering', '⑤ 原样重发'],
      ready: '<span class="c">$</span> ready. 点一个场景按钮，引擎开始逐项检查',
      l0: (name, n) => `<span class="c">[请求]</span> ${name}：新请求共 ${n} 个 token`,
      l1ok: '<span class="m">steering</span>：两边模式相同，继续',
      l1bad: '<span class="m">steering</span>：模式不同。检查点是按另一种方式算出来的，<span class="y">直接跳过</span>',
      l2ok: (n, len) => `<span class="m">长度</span>：检查点 ${n} 个 &lt; 请求 ${len} 个，继续`,
      l2bad: (n, len) => `<span class="m">长度</span>：检查点 ${n} 个，请求也只有 ${len} 个。最后一个 token 必须留给下一轮验证去读，<span class="y">这个检查点不能用</span>`,
      l3ok: n => `<span class="m">token</span>：前 ${n} 个逐个相同`,
      l3bad: i => `<span class="m">token</span>：第 ${i + 1} 个不同，<span class="y">前缀断了</span>，整个检查点作废`,
      l4ok: '<span class="m">图片</span>：前缀里的图片位置和哈希都一致',
      l4bad: '<span class="m">图片</span>：占位 token 一样，图片哈希不同。<span class="y">内容换了，不能复用</span>',
      l5hit: (n, tail) => `<span class="c">→ 命中</span>：复用 ${n} 个 token 的状态，只读后面 ${tail} 个`,
      l5miss: len => `<span class="y">→ 未命中</span>：${len} 个 token 从头读`,
      sReuseK: '可复用的 token', sReuseF: '<b>= 检查点长度</b><br>四项检查全部通过才算数',
      sTailK: '要重新读的 token', sTailF: '<b>= 请求长度 − 可复用长度</b>',
      sScaleK: '放大到真实对话', sScaleHit: '省约 30 秒', sScaleMiss: '省 0 秒',
      sScaleF: '<b>假设前缀 30,000 个 token，读取约每秒 1,000 个</b><br>30,000 ÷ 1,000 = 30 s（教学推演）',
      try: [
        '点 <b>① 追问</b>：前 6 个 token 全部一致，引擎只读后面 3 个。多轮对话的追问就是这种情况。',
        '点 <b>③ 换了一张图</b>：token 一个不差，照样被拒。占位 token 只说“这里有图”，不说“是哪张图”。',
        '点 <b>⑤ 原样重发</b>：内容完全相同，这个检查点反而不能用。最后一个 token 必须真的读一遍，才能开始生成。',
      ],
      verdict: {
        hit: '前缀的 token、图片、steering 模式都一致，检查点又比请求短：可以接着读。引擎省下了前缀的全部计算。',
        steering: 'steering 模式不同，模型许多层的中间结果本来就不一样。token 再一致也不能复用。',
        'not-shorter': '检查点和请求一样长：没有剩下的 token 去启动下一轮验证。这个检查点不能用，引擎会找更短的检查点，或者从头读。',
        tokens: '只要有一个 token 不同，后面所有位置的计算都跟着变。前缀复用只认“一字不差”。',
        image: '图片在 token 序列里只是一串占位符。引擎另外记录每张图的位置和哈希，图一换就不复用。',
        empty: '空检查点没有可复用的内容。',
      },

      cCode: 'COW_BRANCH', cTitle: '一个前缀，两个分支', cTag: '教学推演 · 示意模型，非 Strata 实现',
      cIntro: '对话 A 和 B 有一段相同的前缀，然后各说各的。比较两种做法：<b>整份复制</b>在分叉时把前缀全抄一份；<b>写时复制</b>先共用，谁要往共享页里写，谁才复制那一页。每页装 4 个 token（示意）。',
      cLgPre: '前缀里的 token', cLgNew: '分叉后新写的 token', cLgOwn: '一个分支独占的页', cLgShared: '两个分支共用的页（×2 = 引用计数）', cLgCopy: '复制出来的页或状态',
      cSteps: ['读完前缀', '拍快照、分叉', 'A 写入', 'B 写入', '结算'],
      cStage: '两个分支各自看到的页',
      rowA: 'A 看到的', rowB: 'B 看到的', notYet: '（还没分叉）',
      stateLbl: '状态', stateCopy: '复制',
      kShared: '×2', kCopied: '复制', kInplace: '原地写',
      mCopy: '整份复制', mCow: '写时复制',
      pLabel: '前缀长度（token）', aLabel: 'A 新写（token）', bLabel: 'B 新写（token）',
      bStep: '▶ 单步', bAll: '▶▶ 跑完', bReset: '重置',
      cReady: '<span class="c">$</span> ready. 选一种做法，按 [ ▶ 单步 ]',
      c1: (n, p) => `<span class="c">[前缀]</span> 读完 ${n} 个 token，占 ${p} 页，递推状态停在第 ${n} 个 token`,
      c2copy: p => `<span class="m">分叉</span>：整份复制，把 ${p} 页前缀全抄给 B，再给 B 复制一份递推状态`,
      c2cow: p => `<span class="m">分叉</span>：写时复制，${p} 页前缀两边共用（引用计数 2）。递推状态仍要给 B 复制一份`,
      c3: (t, c) => `<span class="w">A 写入</span> ${t} 个 token` + (c ? '：要写的页是共享的，<span class="y">先复制这一页</span>' : ''),
      c4: (t, c) => `<span class="w">B 写入</span> ${t} 个 token` + (c ? '：那一页已经只剩 B 在用，<span class="y">原地写，不用复制</span>' : ''),
      c4copy: (t, c) => `<span class="w">B 写入</span> ${t} 个 token` + (c ? '：A 没写过这一页，B 是第一个写的，<span class="y">先复制</span>' : ''),
      c5: (phys, cp) => `<span class="c">结算</span>：物理页 ${phys} 页，其中复制 ${cp} 页`,
      sPhysK: '实际占用的物理页',
      sPhysCopy: (p, a, b) => `<b>= 2 × 前缀 ${p} 页 + A 新页 ${a} + B 新页 ${b}</b>`,
      sPhysCow: (p, c, a, b) => `<b>= 前缀 ${p} 页 + 复制 ${c} 页 + A 新页 ${a} + B 新页 ${b}</b>`,
      sCopyK: '分叉时复制的页',
      sCopyFCopy: '<b>= 整个前缀</b><br>分叉那一刻一次抄完',
      sCopyFCow: '<b>= 被写到的共享页</b><br>前缀正好填满整页时为 0',
      sSaveK: '写时复制比整份复制少占',
      sSaveF: '<b>= 整份复制的页数 − 写时复制的页数</b>',
      sStateK: '递推状态',
      sStateV: '每分支 1 份',
      sStateF: '<b>每读一个 token 就整块改写，没法共用</b><br>分叉时复制一整块。按 Strata 的几何约 113 MB',
      pages: n => `${n} 页`,
      cTry: [
        '选 <b>写时复制</b>，前缀设成 <b>16</b>（正好 4 整页），A、B 各写 3 个：一页都不用复制。前缀对齐到页边界时，分叉几乎免费。',
        '把前缀改成 <b>17</b>，再跑一遍：多出半页，两边都要往里写，第一个写的人必须先复制这一页。',
        '切到 <b>整份复制</b> 跑同样的设置：前缀越长，多占的页越多。但两种做法里，递推状态都得复制一份。',
      ],
      cVerdictCow: (c, save) => `写时复制只复制了 <b>${c}</b> 页，比整份复制少占 <b>${save}</b> 页。共享的页只读不写，所以可以放心共用。递推状态没法这样省：它每个 token 都整块改写，分叉时只能整份复制。`,
      cVerdictCopy: (c, save) => `整份复制在分叉时抄了 <b>${c}</b> 页。换成写时复制能少占 <b>${save}</b> 页。前缀越长，差距越大。`,
    },
  });

  async function guardRun(el, ctx, state, fn) {
    if (state.busy) return;
    state.busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { if (ctx.alive) throw e; }
    state.busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
  }

  /* ---------- Widget 1: prefix-match ---------- */
  const SAVED = { ids: [1, 2, 3, 9, 5, 6], imgs: [{ start: 3, hash: 0xa }], cvec: false };
  const ASK = [1, 2, 3, 9, 5, 6, 7, 8, 4];
  const SCENES = [
    { ids: ASK, imgs: [{ start: 3, hash: 0xa }], cvec: false },
    { ids: [1, 2, 3, 9, 5, 10, 7, 8, 4], imgs: [{ start: 3, hash: 0xa }], cvec: false },
    { ids: ASK, imgs: [{ start: 3, hash: 0xb }], cvec: false },
    { ids: ASK, imgs: [{ start: 3, hash: 0xa }], cvec: true },
    { ids: SAVED.ids.slice(), imgs: [{ start: 3, hash: 0xa }], cvec: false },
  ];

  Viz.register('prefix-match', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgIdle },
        { color: 'var(--accent)', text: T.lgSame, glow: true },
        { color: 'var(--a2)', text: T.lgDiff },
        { color: 'var(--a3)', text: T.lgTail },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 520 168', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const lblSaved = Viz.svg('text', { x: 4, y: 18, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const lblReq = Viz.svg('text', { x: 4, y: 100, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const mkRow = y => Array.from({ length: 9 }, (_, i) => {
        const g = Viz.svg('g', {}, svg);
        const r = Viz.svg('rect', { x: 4 + i * 57, y, width: 52, height: 36, rx: 3, class: 'viz-cell' }, g);
        const t = Viz.svg('text', { x: 4 + i * 57 + 26, y: y + 23, 'font-size': 13, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, g);
        return { g, r, t };
      });
      const rowS = mkRow(28), rowR = mkRow(110);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${T.sc.map((s, i) => Viz.button(s, i ? 'alt' : '')).join('')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'pm-reuse', k: T.sReuseK, v: '—', f: T.sReuseF }) +
        Viz.stat({ id: 'pm-tail', k: T.sTailK, v: '—', f: T.sTailF }) +
        Viz.stat({ id: 'pm-scale', k: T.sScaleK, v: '—', f: T.sScaleF, hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const st = { busy: false };

      const label = (id, img) => id === 9 ? T.img(img ? img.hash : 0xa) : T.tok[id];
      function paintChip(c, mode) {
        // mode: idle | same | diff | tail | hidden
        c.g.style.display = mode === 'hidden' ? 'none' : '';
        const cls = { idle: 'viz-cell', same: 'viz-cell pick', diff: 'viz-cell score', tail: 'viz-cell' }[mode] || 'viz-cell';
        c.r.setAttribute('class', cls);
        c.r.style.fill = mode === 'tail' ? 'var(--paper)' : '';
        c.r.style.stroke = mode === 'tail' ? 'var(--a3)' : '';
        c.r.style.strokeDasharray = mode === 'tail' ? '4 3' : '';
        c.t.style.fill = mode === 'same' || mode === 'diff' ? 'var(--paper)' : 'var(--ink)';
      }
      function fill(row, req) {
        row.forEach((c, i) => {
          if (i >= req.ids.length) { paintChip(c, 'hidden'); return; }
          const img = req.imgs.find(m => m.start === i);
          c.t.textContent = label(req.ids[i], img);
          paintChip(c, 'idle');
        });
      }
      function setStats(r, len) {
        $('[data-s=pm-reuse-v]').textContent = r ? `${r.tokens} / ${len}` : '—';
        $('[data-s=pm-tail-v]').textContent = r ? String(r.tail) : '—';
        $('[data-s=pm-scale-v]').textContent = r ? (r.reason === 'hit' ? T.sScaleHit : T.sScaleMiss) : '—';
      }
      function reset() {
        lblSaved.textContent = `${T.rowSaved} · ${T.steer(SAVED.cvec)}`;
        lblReq.textContent = T.rowReq;
        fill(rowS, SAVED); rowR.forEach(c => paintChip(c, 'hidden'));
        pipe.set(-1); setStats(null, 0); $('.viz-verdict').hidden = true;
      }

      async function run(si) {
        const req = SCENES[si], res = M.match(SAVED, req), n = SAVED.ids.length, len = req.ids.length;
        const wait = ms => ctx.sleep(ms);
        reset();
        lblReq.textContent = `${T.rowReq} · ${T.steer(req.cvec)}`;
        fill(rowR, req);
        pipe.set(0); term.log(T.l0(T.sc[si], len)); await wait(350);
        const finish = async () => {
          pipe.set(5);
          if (res.reason === 'hit') {
            for (let i = n; i < len; i++) paintChip(rowR[i], 'tail');
            term.log(T.l5hit(res.tokens, res.tail));
          } else term.log(T.l5miss(len));
          setStats(res, len);
          const v = $('.viz-verdict'); v.innerHTML = T.verdict[res.reason]; v.hidden = false;
        };
        pipe.set(1); await wait(350);
        if (res.reason === 'steering') { term.log(T.l1bad); return finish(); }
        term.log(T.l1ok);
        pipe.set(2); await wait(350);
        if (res.reason === 'not-shorter') { term.log(T.l2bad(n, len)); return finish(); }
        term.log(T.l2ok(n, len));
        pipe.set(3);
        for (let i = 0; i < n; i++) {
          const same = SAVED.ids[i] === req.ids[i];
          paintChip(rowS[i], same ? 'same' : 'diff'); paintChip(rowR[i], same ? 'same' : 'diff');
          await wait(140);
          if (!same) { term.log(T.l3bad(i)); return finish(); }
        }
        term.log(T.l3ok(n));
        pipe.set(4); await wait(350);
        if (res.reason === 'image') {
          for (const im of req.imgs) if (im.start < n) { paintChip(rowS[im.start], 'diff'); paintChip(rowR[im.start], 'diff'); }
          term.log(T.l4bad); return finish();
        }
        term.log(T.l4ok);
        await wait(250);
        return finish();
      }
      el.querySelectorAll('.viz-row .viz-btn').forEach((b, i) => { b.onclick = () => guardRun(el, ctx, st, () => run(i)); });
      reset();
    },
  });

  /* ---------- Widget 2: prefix-cow ---------- */
  const PAGE = 4, COLS = 8, X0 = 150, CW = 50;

  Viz.register('prefix-cow', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.cCode, title: T.cTitle, tag: T.cTag, intro: T.cIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.cLgPre },
        { color: 'var(--a3)', text: T.cLgNew },
        { color: 'var(--frame)', text: T.cLgOwn },
        { color: 'var(--accent)', text: T.cLgShared, glow: true },
        { color: 'var(--a2)', text: T.cLgCopy },
      ]));
      const pipe = Viz.pipe(body, T.cSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 560 196', class: 'viz-stage', role: 'img', 'aria-label': T.cStage }, left);
      const layer = Viz.svg('g', {}, svg);
      const slider = (cls, lab, min, max, val) => `<div class="viz-slider ${cls}"><label>${lab}</label><input type="range" min="${min}" max="${max}" value="${val}" aria-label="${Viz.esc(lab)}"><output>${val}</output></div>`;
      left.insertAdjacentHTML('beforeend',
        `<div class="viz-row cow-mode">${Viz.button(T.mCopy, 'ghost')}${Viz.button(T.mCow)}</div>` +
        slider('s-p', T.pLabel, 1, 24, 17) + slider('s-a', T.aLabel, 0, 8, 3) + slider('s-b', T.bLabel, 0, 8, 3) +
        `<div class="viz-row cow-run">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.cReady);
      right.innerHTML =
        Viz.stat({ id: 'cw-phys', k: T.sPhysK, v: '—', f: '' }) +
        Viz.stat({ id: 'cw-copy', k: T.sCopyK, v: '—', f: '', hot: true }) +
        Viz.stat({ id: 'cw-save', k: T.sSaveK, v: '—', f: T.sSaveF }) +
        Viz.stat({ id: 'cw-state', k: T.sStateK, v: T.sStateV, f: T.sStateF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.cTry));
      const $ = s => el.querySelector(s);
      const st = { busy: false, mode: 'cow', phase: 0 };
      const [bCopy, bCow] = el.querySelectorAll('.cow-mode .viz-btn');
      const [bStep, bAll, bReset] = el.querySelectorAll('.cow-run .viz-btn');
      const val = c => +$(`.${c} input`).value;
      const cfg = () => ({ prefix: val('s-p'), tailA: val('s-a'), tailB: val('s-b'), page: PAGE, mode: st.mode });

      const S = (tag, attrs) => Viz.svg(tag, attrs, layer);
      function page(x, y, h, p, prefTok, kind) {
        const stroke = kind === 'shared' ? 'var(--accent)' : kind === 'copied' ? 'var(--a2)' : 'var(--frame)';
        S('rect', { x, y, width: 44, height: h, rx: 3, style: `fill:var(--paper);stroke:${stroke};stroke-width:${kind === 'shared' || kind === 'copied' ? 2 : 1}` + (kind === 'copied' ? ';stroke-dasharray:4 3' : '') });
        const ty = y + h / 2 - 4;
        for (let j = 0; j < PAGE; j++) {
          const on = j < p.tokens;
          S('rect', { x: x + 4 + j * 10, y: ty, width: 7, height: 7, style: `fill:${on ? (j < prefTok ? 'var(--accent)' : 'var(--a3)') : 'var(--side)'}` });
        }
        const tag = { shared: T.kShared, copied: T.kCopied, inplace: T.kInplace }[kind];
        if (tag) S('text', { x: x + 22, y: y + h - 6, 'font-size': 11, 'text-anchor': 'middle', style: `fill:${kind === 'copied' ? 'var(--a2)' : 'var(--muted)'}` }).textContent = tag;
      }
      function stateBox(y, copied) {
        S('rect', { x: 80, y, width: 56, height: 46, rx: 3, style: `fill:var(--side);stroke:${copied ? 'var(--a2)' : 'var(--frame)'};stroke-width:${copied ? 2 : 1}` + (copied ? ';stroke-dasharray:4 3' : '') });
        S('text', { x: 108, y: y + 20, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }).textContent = T.stateLbl;
        if (copied) S('text', { x: 108, y: y + 37, 'font-size': 11, 'text-anchor': 'middle', style: 'fill:var(--a2)' }).textContent = T.stateCopy;
      }
      // phase 0 empty, 1 trunk, 2 fork, 3 A wrote, 4/5 B wrote
      function draw() {
        layer.innerHTML = '';
        const c = cfg(), ph = st.phase;
        const yA = 30, yB = 120, h = 46;
        S('text', { x: 4, y: yA + 28, 'font-size': 13, style: 'fill:var(--ink)' }).textContent = T.rowA;
        S('text', { x: 4, y: yB + 28, 'font-size': 13, style: 'fill:var(--ink)' }).textContent = T.rowB;
        if (ph === 0) return;
        const pp = M.pages(c.prefix, PAGE), rest = c.prefix % PAGE;
        const prefTok = i => i < pp.full ? PAGE : i === pp.full ? rest : 0;
        stateBox(yA, false);
        if (ph === 1) {
          S('text', { x: X0, y: yB + 28, 'font-size': 12, style: 'fill:var(--muted)' }).textContent = T.notYet;
          for (let i = 0; i < pp.total; i++) page(X0 + i * CW, yA, h, { tokens: prefTok(i) }, prefTok(i), 'own');
          return;
        }
        stateBox(yB, true);
        const b = M.branch({ ...c, tailA: ph >= 3 ? c.tailA : 0, tailB: ph >= 4 ? c.tailB : 0 });
        const n = Math.min(COLS, Math.max(b.layout.A.length, b.layout.B.length));
        for (let i = 0; i < n; i++) {
          const a = b.layout.A[i], bb = b.layout.B[i];
          if (a && bb && a.kind === 'shared' && bb.kind === 'shared') { page(X0 + i * CW, yA, yB + h - yA, a, prefTok(i), 'shared'); continue; }
          if (a) page(X0 + i * CW, yA, h, a, prefTok(i), a.kind);
          if (bb) page(X0 + i * CW, yB, h, bb, prefTok(i), bb.kind);
        }
      }
      function stats(final) {
        const c = cfg(), cp = M.branch({ ...c, mode: 'copy' }), cw = M.branch({ ...c, mode: 'cow' }), cur = st.mode === 'cow' ? cw : cp;
        const show = final || st.phase >= 4;
        $('[data-s=cw-phys-v]').textContent = show ? T.pages(cur.physicalPages) : '—';
        $('[data-s=cw-phys-f]').innerHTML = st.mode === 'cow' ? T.sPhysCow(cur.prefixPages, cur.copiedPages, cur.newA, cur.newB) : T.sPhysCopy(cur.prefixPages, cur.newA, cur.newB);
        $('[data-s=cw-copy-v]').textContent = show ? T.pages(cur.copiedPages) : '—';
        $('[data-s=cw-copy-f]').innerHTML = st.mode === 'cow' ? T.sCopyFCow : T.sCopyFCopy;
        const save = cp.physicalPages - cw.physicalPages;
        $('[data-s=cw-save-v]').textContent = show ? `${T.pages(save)}（${Math.round(save / cp.physicalPages * 100)}%）` : '—';
        return { cur, save };
      }
      function setMode(m) {
        st.mode = m; bCopy.className = 'viz-btn' + (m === 'copy' ? '' : ' ghost'); bCow.className = 'viz-btn' + (m === 'cow' ? '' : ' ghost');
        resetAll();
      }
      function resetAll() {
        st.phase = 0; pipe.set(-1); draw(); stats(false); $('.viz-verdict').hidden = true; term.clear(); term.log(T.cReady);
      }
      async function step() {
        const c = cfg();
        if (st.phase >= 5) { st.phase = 0; $('.viz-verdict').hidden = true; }
        st.phase++;
        pipe.set(st.phase - 1);
        const b = M.branch(c), pp = M.pages(c.prefix, PAGE);
        if (st.phase === 1) term.log(T.c1(c.prefix, pp.total));
        if (st.phase === 2) term.log(st.mode === 'cow' ? T.c2cow(pp.total) : T.c2copy(pp.total));
        if (st.phase === 3) term.log(T.c3(c.tailA, st.mode === 'cow' && pp.partial && c.tailA > 0));
        if (st.phase === 4) term.log(st.mode === 'cow' && c.tailA === 0 ? T.c4copy(c.tailB, pp.partial && c.tailB > 0) : T.c4(c.tailB, st.mode === 'cow' && pp.partial && c.tailB > 0));
        draw();
        if (st.phase >= 4) stats(true);
        if (st.phase === 5) {
          const { cur, save } = stats(true);
          term.log(T.c5(cur.physicalPages, cur.copiedPages));
          const v = $('.viz-verdict');
          v.innerHTML = st.mode === 'cow' ? T.cVerdictCow(cur.copiedPages, save) : T.cVerdictCopy(cur.copiedPages, save);
          v.hidden = false;
          pipe.set(5);
        }
        await ctx.sleep(0);
        return b;
      }
      bStep.onclick = () => guardRun(el, ctx, st, step);
      bAll.onclick = () => guardRun(el, ctx, st, async () => {
        if (st.phase >= 5) resetAll();
        while (st.phase < 5) { await step(); await ctx.sleep(450); }
      });
      bReset.onclick = () => guardRun(el, ctx, st, async () => resetAll());
      bCopy.onclick = () => { if (!st.busy) setMode('copy'); };
      bCow.onclick = () => { if (!st.busy) setMode('cow'); };
      ['s-p', 's-a', 's-b'].forEach(cls => {
        const inp = $(`.${cls} input`);
        inp.oninput = () => { $(`.${cls} output`).textContent = inp.value; if (!st.busy) { if (st.phase) { draw(); stats(st.phase >= 4); } else stats(false); } };
      });
      resetAll();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
