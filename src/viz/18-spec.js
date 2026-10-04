/* Chapter 18 widget: one speculative verify window at a time — guess, check, commit the prefix, roll back the rest.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.spec;

  const T = Viz.t({
    zh: {
      code: 'SPEC_VERIFY', title: '先猜后验', tag: '教学推演 · 贪心验证 · 猜错位置按剧本',
      intro: '草稿层一次猜 k 个 token，目标模型把它们放进<b>一个窗口</b>一次算完，再从左往右比对：接受到第一个不一致为止，后面的全部作废。按 <b>单步</b> 看一轮里每件事的先后。',
      lgAcc: '接受，写进历史', lgRej: '第一个不一致：换成目标的选择', lgVoid: '排在不一致之后：作废', lgTmp: '窗口里暂写的 KV',
      steps: ['草稿层猜 k 个', '一次算完整窗', '从左往右比对', '提交前缀', '回滚其余'],
      stageLabel: '验证窗口、目标选择与暂写状态',
      text: ['今天', '天气', '很', '好', '，', '我们', '去', '公园', '散步', '吧', '。', '记得', '带', '上', '水', '和', '伞', '，', '傍晚', '可能', '会', '下雨', '。', '回来', '的', '路上', '顺便', '买', '点', '水果', '，', '晚上', '一起', '做', '沙拉', '。'],
      alt: { '很': '不', '好': '冷', '我们': '你们', '去': '在', '公园': '海边', '散步': '跑步', '吧': '了', '记得': '别忘', '带': '买', '上': '好', '水': '书', '伞': '帽子', '傍晚': '晚上', '可能': '一定', '会': '要', '下雨': '刮风', '回来': '出门', '路上': '时候', '顺便': '记得', '买': '带', '水果': '蔬菜', '一起': '我们', '做': '吃', '沙拉': '饺子', '的': '了', '点': '些', '，': '。', '。': '！', '和': '或', '天气': '心情' },
      altDefault: '嗯',
      rowWin: '窗口：第 0 行是上一轮的结果，后面是草稿', rowOut: '目标模型在每一行之后的选择', rowKv: 'KV 缓存：窗口里每一行都先暂写',
      histLabel: '已输出：',
      marks: { ok: '接受', bad: '不一致', void: '作废', none: '' },
      unsure: '…', kvTmp: '暂写', kvKeep: '保留', kvDrop: '待覆盖',
      kLabel: '草稿长度 k',
      bStep: '▶ 单步', bRound: '▶▶ 跑完这一轮', bReset: '重置',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]，一共 5 轮，哪一格猜错按固定剧本',
      sRoundK: '已跑轮数', sRoundF: '<b>每轮 = 1 次 48 层的窗口计算</b><br>普通逐个生成时，1 轮只出 1 个 token',
      sTokK: '已输出 token', sTokF: '<b>每轮输出 = 接受的草稿数 a + 1</b><br>多出的 1 个是目标在不一致处自己选的',
      sAvgK: '平均每轮输出', sAvgF: '<b>= 已输出 ÷ 轮数</b><br>上游实测平均每轮 2.4–3.2 个 token',
      sKeepK: '本轮提交 n_keep', sKeepF: '<b>= a + 1</b><br>窗口第 0 行 + 接受的 a 个草稿',
      l0: (r, k, d) => `<span class="c">[第 ${r} 轮]</span> 草稿层猜了 ${k} 个：${d}`,
      l1: (t) => `<span class="m">验证</span>：${t} 行一起过 48 层，算出每一行之后目标会选什么（接在错字后面的行标成“…”：前提不对，算出来也用不上）；KV 先给 ${t} 行都暂写一格`,
      l2: (a, k, bad) => a === 0 ? `<span class="y">比对</span>：第 1 个草稿“${bad}”就和目标不同，a = 0，这一轮只靠目标自己前进 1 个` : a === k ? `<span class="y">比对</span>：${k} 个草稿全部和目标一致，a = ${k}` : `<span class="y">比对</span>：前 ${a} 个一致，第 ${a + 1} 个草稿“${bad}”和目标不同，比对到此为止`,
      l3: (n, emitted) => `<span class="w">提交</span>：commit(${n}) 只让前 ${n} 行生效；本轮输出 ${emitted}`,
      l4: (void_, next) => `<span class="c">回滚</span>：${void_ ? '作废 ' + void_ + '；' : ''}多写的 KV 格等下一轮直接覆盖。下一轮从“${next}”开始`,
      lEnd: '<span class="y">// 文本写完了，按 [ 重置 ] 再来一遍</span>',
      verdict: (avg, rounds, toks) => `① ${rounds} 轮输出了 ${toks} 个 token，平均每轮 <b>${avg}</b> 个；逐个生成要 ${toks} 轮。<br>② 每轮至少前进 1 个：就算第一个草稿就猜错，目标模型也会在那里给出自己的选择。<br>③ 草稿只决定一轮能前进几步，每个字都由目标模型拍板，所以按设计输出和不用草稿时<b>逐字相同</b>（正文讲了上游记录的一个舍入例外）。`,
      try: [
        '连按 <b>单步</b> 走完第 2 轮：第 2 个草稿猜错后，第 3 个草稿其实和原文一样，可它照样作废。它是接在错字后面猜的，前提已经不成立。',
        '把 <b>k</b> 调到 1 再跑 5 轮：每轮最多输出 2 个 token。调到 5：猜得越多，全对时赚得越多，但每轮的验证也更贵（见第 16 章）。',
        '看 KV 那一行：验证时整窗都先暂写，提交后只有前 a + 1 格算数，其余标成“待覆盖”。不用删除，下一轮会写在同样的位置上。',
      ],
    },
  });

  const SCRIPT = [null, 2, 1, 3, null, 2, 1, null];

  Viz.register('spec-verify', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgAcc, glow: true },
        { color: 'var(--a3)', text: T.lgRej },
        { color: 'var(--frame)', text: T.lgVoid },
        { color: 'var(--a2)', text: T.lgTmp },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 246', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const hist = Viz.svg('text', { x: 0, y: 16, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const rowTitles = [[T.rowWin, 44], [T.rowOut, 112], [T.rowKv, 180]];
      rowTitles.forEach(([t, y]) => { Viz.svg('text', { x: 0, y, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = t; });
      const COLS = 6, W = 56, STEP = 59;
      const mk = (y) => Array.from({ length: COLS }, (_, i) => {
        const x = i * STEP + 1;
        const r = Viz.svg('rect', { x, y, width: W, height: 30, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        const t = Viz.svg('text', { x: x + W / 2, y: y + 20, 'font-size': 13, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
        return { r, t };
      });
      const winCells = mk(52), outCells = mk(120), kvCells = mk(188);
      const markTxt = Array.from({ length: COLS }, (_, i) => Viz.svg('text', { x: i * STEP + 1 + W / 2, y: 98, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg));
      const rowNo = Array.from({ length: COLS }, (_, i) => Viz.svg('text', { x: i * STEP + 1 + W / 2, y: 238, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg));
      left.insertAdjacentHTML('beforeend', `<div class="viz-slider"><label>${T.kLabel}</label><input type="range" min="1" max="5" value="3" aria-label="${Viz.esc(T.kLabel)}"><output>3</output></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bRound, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = Viz.stat({ id: 's-round', k: T.sRoundK, v: '0', f: T.sRoundF }) + Viz.stat({ id: 's-tok', k: T.sTokK, v: '0', f: T.sTokF }) +
        Viz.stat({ id: 's-avg', k: T.sAvgK, v: '—', f: T.sAvgF, hot: true }) + Viz.stat({ id: 's-keep', k: T.sKeepK, v: '—', f: T.sKeepF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const range = $('input[type=range]'), verdict = $('.viz-verdict');
      const [stepBtn, roundBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const TEXT = T.text, alt = w => T.alt[w] || T.altDefault;
      let pos, rounds, emitted, phase, cur, busy = false;

      const fill = (cell, text, color, ink) => { cell.r.setAttribute('style', `stroke:var(--frame);fill:${color}`); cell.t.textContent = text; cell.t.setAttribute('style', 'fill:' + (ink || 'var(--ink)')); };
      function clearCells() {
        for (let i = 0; i < COLS; i++) {
          [winCells[i], outCells[i], kvCells[i]].forEach(c => fill(c, '', 'var(--side)'));
          markTxt[i].textContent = ''; rowNo[i].textContent = '';
        }
      }
      function showHist() {
        const shown = emitted.slice(-9).join('');
        hist.textContent = T.histLabel + (emitted.length > 9 ? '…' : '') + (shown || '—');
      }
      function stats() {
        $('[data-s=s-round-v]').textContent = rounds;
        $('[data-s=s-tok-v]').textContent = emitted.length - 1;
        $('[data-s=s-avg-v]').textContent = rounds ? Viz.fmt((emitted.length - 1) / rounds, 2) : '—';
        $('[data-s=s-keep-v]').textContent = cur && rounds > 0 && (phase === 4 || phase === 0) ? cur.nKeep : '—';
      }
      function reset() {
        pos = 0; rounds = 0; emitted = [TEXT[0]]; phase = 0; cur = null;
        pipe.set(-1); clearCells(); showHist(); stats(); verdict.hidden = true; term.clear(); term.log(T.ready);
      }
      function step() {
        if (phase === 0 && (rounds >= 5 || pos >= TEXT.length - 1)) { if (pos >= TEXT.length - 1) term.log(T.lEnd); reset(); return; }
        pipe.set(phase);
        if (phase === 0) {
          clearCells();
          const k = +range.value, miss = SCRIPT[rounds % SCRIPT.length];
          const d = M.drafts(TEXT, pos, k, miss && miss <= k ? miss : null, alt);
          cur = M.round(TEXT, pos, d);
          cur.window.forEach((w, i) => { fill(winCells[i], w, i ? 'var(--side)' : 'var(--accent)', i ? 'var(--ink)' : 'var(--paper)'); rowNo[i].textContent = 'pos ' + (pos + i); });
          term.log(T.l0(rounds + 1, d.length, d.join(' ')));
        }
        if (phase === 1) {
          cur.outv.forEach((o, i) => { fill(outCells[i], i <= cur.a ? o : T.unsure, 'var(--side)', i <= cur.a ? 'var(--ink)' : 'var(--muted)'); fill(kvCells[i], T.kvTmp, 'var(--a2)', 'var(--paper)'); });
          term.log(T.l1(cur.window.length));
        }
        if (phase === 2) {
          for (let i = 1; i < cur.window.length; i++) {
            const st = i <= cur.a ? 'ok' : i === cur.a + 1 ? 'bad' : 'void';
            markTxt[i].textContent = T.marks[st];
            fill(winCells[i], cur.window[i], st === 'ok' ? 'var(--accent)' : st === 'bad' ? 'var(--a3)' : 'var(--frame)', st === 'void' ? 'var(--muted)' : 'var(--paper)');
          }
          fill(outCells[cur.a], cur.outv[cur.a], 'var(--a3)', 'var(--paper)');
          term.log(T.l2(cur.a, cur.window.length - 1, cur.window[cur.a + 1]));
        }
        if (phase === 3) {
          for (let i = 0; i < cur.window.length; i++) fill(kvCells[i], i <= cur.a ? T.kvKeep : T.kvTmp, i <= cur.a ? 'var(--accent)' : 'var(--a2)', 'var(--paper)');
          emitted.push(...cur.emitted); rounds++; showHist();
          term.log(T.l3(cur.nKeep, cur.emitted.join(' ')));
        }
        if (phase === 4) {
          for (let i = cur.a + 1; i < cur.window.length; i++) fill(kvCells[i], T.kvDrop, 'var(--frame)', 'var(--muted)');
          term.log(T.l4(cur.rejected.join(' '), cur.outv[cur.a]));
          pos = cur.nextPos;
          if (rounds >= 5 || pos >= TEXT.length - 1) {
            const toks = emitted.length - 1;
            verdict.innerHTML = T.verdict(Viz.fmt(toks / rounds, 2), rounds, toks); verdict.hidden = false;
          }
        }
        phase = (phase + 1) % 5;
        stats();
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = true; });
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = false; });
      }
      stepBtn.onclick = () => guard(async () => step());
      roundBtn.onclick = () => guard(async () => { do { step(); if (phase !== 0) await ctx.sleep(450); } while (phase !== 0); });
      resetBtn.onclick = () => guard(async () => reset());
      range.oninput = () => { $('.viz-slider output').textContent = range.value; };
      reset();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
