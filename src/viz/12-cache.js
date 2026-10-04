/* Chapter 12 widgets: LRU vs LFU vs decayed counts on one layer's routing, and the swap protocol.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.cache;

  const T = Viz.t({
    zh: {
      code: 'CACHE_RACE', title: '三种替换策略赛跑', tag: '教学推演 · 一层、24 个专家、6 个槽位',
      intro: '把一层缩小成 24 个专家，每个 token 选 4 个，显存只放得下 6 个。三种策略看同一串路由：<b>LRU</b> 换掉最久没用的；<b>LFU</b> 换掉历史总次数最少的；<b>衰减计数</b>模仿 Strata：平时不动，每 4 个 token 调整一次，再把所有次数乘 0.7。第 30 个 token 起话题从 A 换成 B，热门专家整体换了一批。',
      lgHot: '当前话题的热门专家', lgCold: '其他专家', lgStrip: '下方小格：每个 token 命中几个（越亮越多）', lgShift: '┃ 话题切换 / 冷门插曲',
      steps: ['路由选 4 个专家', '三种缓存各查一遍', '记次数', '每 4 个 token 调整', '次数 × 0.7'],
      names: { lru: 'LRU', lfu: 'LFU', decay: '衰减计数' },
      routed: (t, topic, ids) => `token ${t}（话题 ${topic}）选中：${ids}`,
      stageLabel: '三种策略的显存槽位和逐 token 命中情况',
      stripLabel: '每个 token 命中几个（上 LRU、中 LFU、下 衰减计数）',
      bStep: '▶ 下一个 token', bAll: '▶▶ 跑完 60 个', bReset: '重置', bBurstOff: '冷门插曲：关', bBurstOn: '冷门插曲：开',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 下一个 token ]，或者直接跑完',
      lTok: (t, topic, ids, a, b, c) => `<span class="c">[t${String(t).padStart(2, '0')}]</span> 话题 ${topic}，选中 ${ids} → 命中：LRU ${a}，LFU ${b}，衰减 ${c}`,
      lAdapt: (moves) => `<span class="y">  衰减计数调整</span>：${moves || '没有够格的交换'}；然后所有次数 × 0.7`,
      lMove: (inn, out) => out === null ? `放入 #${inn}` : `#${inn} 换掉 #${out}`,
      lShift: '<span class="m">// 话题切换：从这里起热门专家换成 B 组</span>',
      lBurst: '<span class="m">// 冷门插曲：接下来 3 个 token 只选冷门专家</span>',
      lDone: '<span class="y">// 60 个 token 跑完</span>',
      sK: (n) => `${n}：命中率`, sF: (h, n) => `<b>= 命中 ${h} ÷ 访问 ${n}</b>`,
      sAfterF: (h) => `换话题后的前 15 个 token 命中 ${h} 次`,
      sRuleK: '衰减计数的规则（来自 Strata）', sRuleV: '× 0.7',
      sRuleF: '<b>次数 ≥ 2</b> 才有资格换入；<br>比最冷的驻留专家多 <b>1.5</b> 以上才换；<br>每次调整后所有次数 × 0.7，<br>约每调整 2 次减半',
      verdict: (r, a) => `① 总命中率：LRU <b>${r.lru}</b>，LFU <b>${r.lfu}</b>，衰减计数 <b>${r.decay}</b>。<br>② 换话题后的前 15 个 token：LRU 命中 <b>${a.lru}</b> 次，反应最快；LFU 只有 <b>${a.lfu}</b> 次，被旧话题攒下的大次数拖住；衰减计数 <b>${a.decay}</b> 次，慢几步但会跟上。<br>③ 衰减计数平时不乱动，偶尔的冷门 token 冲不掉热门专家；旧次数每次调整乘 0.7，又不会永远压着新热门。这就是“记性”和“忘性”的折中。`,
      try: [
        '按 <b>跑完 60 个</b>，看下方三条小格：第 30 个 token 之后，哪一条暗了最久？那就是适应新话题最慢的策略。',
        '把 <b>冷门插曲</b> 打开再跑：第 18–20 个 token 只选冷门专家。LRU 的槽位被冲掉一大片，衰减计数几乎不受影响。',
        '单步走到第 4、8、12 个 token，看终端里“衰减计数调整”那一行：资格线 2、领先 1.5、乘 0.7，三个数一起决定换谁。',
      ],

      wCode: 'SWAP_PROTOCOL', wTitle: '一次换入换出：先拷贝，后登记', wTag: '代码事实 · 简化成一个槽位',
      wIntro: '自适应缓存要把 #112 换进显存槽位 5，换出 #331。驻留表说“谁在哪个槽”，槽位里装的是真正的字节。按 <b>单步</b> 走一遍正确的顺序；再打开“错误顺序”，看提前登记会出什么事。',
      wLgOld: '#331 的字节（旧）', wLgNew: '#112 的字节（新）', wLgBad: '读到半新半旧的字节',
      wSteps: ['初始', '决定交换', '撤下 #331', '异步拷贝', '拷贝完成', '登记 #112'],
      tableLabel: '驻留表', slotLabel: '显存槽位 5', ramLabel: '内存里的完整副本', none: '无（CPU 算）', slot: '槽位 5',
      wBug: '错误顺序：关', wBugOn: '错误顺序：开（先登记，后拷贝）', wStep: '▶ 单步', wReset: '重置',
      wReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]',
      wLog: {
        init: '初始：槽位 5 装着 #331，驻留表写着 #331 → 槽位 5；#112 不在显存，被选中时由 CPU 用内存里的副本计算',
        decide: '决定交换：#112 最近的衰减计数比 #331 高出 1.5 以上，值得换',
        unmap: '先改表：#331 → 无。从这一刻起，#331 被选中就交给 CPU，没人再从槽位 5 读它',
        unmapBug: '<span class="m">错误顺序</span>：#331 → 无，同时提前写上 #112 → 槽位 5，可它的字节还没开始搬',
        copy: '在拷贝流上发起异步拷贝：#112 的字节经 PCIe 写进槽位 5，函数立刻返回，拷贝还在进行',
        event: '拷贝之后记录的“完成事件”到了：槽位 5 现在完整装着 #112',
        map: '再改表：#112 → 槽位 5。之后 #112 被选中，就由 GPU 读槽位 5 计算',
      },
      wRead: (who, ok) => `  这一步正好有 token 选中 #112 → 由 ${who === 'gpu' ? 'GPU 读槽位 5' : 'CPU 读内存副本'} 计算：${ok ? '<span class="c">结果正确</span>' : '<span class="m">读到半新半旧的字节，结果错了，而且不会报错</span>'}`,
      wReadShort: (who, ok) => `选中 #112 → ${who === 'gpu' ? 'GPU 读槽位 5' : 'CPU 读内存副本'}：${ok ? '结果正确' : '读到半新半旧，算错'}`,
      sTabK: '驻留表此刻', sTabF: '<b>表项 = 槽位号，或“无”</b><br>表说了算：GPU 只读表里登记的槽位',
      sSlotK: '槽位 5 里装着', sSlotF: '<b>拷贝是异步的</b><br>函数返回 ≠ 字节已到',
      sOkK: '本步计算结果', sOkF: '<b>正确条件</b>：登记的槽位里，<br>字节必须已经完整到位',
      slotOld: '#331（旧）', slotMixed: '一半 #112、一半 #331', slotNew: '#112（新）',
      okYes: '正确', okNo: '错误', okNa: '—',
      vGood: '正确顺序下，表项只在字节到齐之后才指向槽位：拷贝途中 #112 一直由 CPU 计算，每一步都对。Strata 的自适应缓存正是这样做的：先把换出的专家标成“不在显存”，拷贝完成的事件到了，才把换入的专家登记进表。',
      vBad: '提前登记以后，拷贝途中选中 #112 的 token 让 GPU 读到了半新半旧的槽位。程序不崩、也不报错，只是这个 token 算错了。这就是“标签对、字节错”的伪命中，统计上看命中率还更高。',
      wTry: [
        '用正确顺序单步走完：注意第 4 步拷贝进行中，#112 仍由 CPU 计算。',
        '打开 <b>错误顺序</b> 再走一遍：第 4 步结果变成“错误”。想一想，为什么这种错误很难靠看输出发现？',
        '对照第 3 步：为什么要<b>先</b>把 #331 撤下表，再开始往槽位里写？（提示：写的过程中谁还可能在读槽位 5？）',
      ],
    },
  });

  Viz.register('cache-race', {
    mount(el, ctx) {
      const D = M.DEFAULTS;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgHot, glow: true },
        { color: 'var(--frame)', text: T.lgCold },
        { color: 'var(--a2)', text: T.lgStrip },
        { color: 'var(--a3)', text: T.lgShift },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 282', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const kinds = ['lru', 'lfu', 'decay'];
      const routedText = Viz.svg('text', { x: 4, y: 16, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const slots = {}, rateText = {}, strip = {};
      kinds.forEach((k, r) => {
        const y = 40 + r * 60;
        Viz.svg('text', { x: 4, y, 'font-size': 13, style: 'fill:var(--ink)' }, svg).textContent = T.names[k];
        rateText[k] = Viz.svg('text', { x: 356, y, 'font-size': 13, 'text-anchor': 'end', style: 'fill:var(--accent)' }, svg);
        slots[k] = [];
        for (let s = 0; s < D.cap; s++) {
          const rect = Viz.svg('rect', { x: 4 + s * 59, y: y + 6, width: 55, height: 32, class: 'viz-cell' }, svg);
          const txt = Viz.svg('text', { x: 4 + s * 59 + 27.5, y: y + 27, 'font-size': 13, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
          slots[k].push({ rect, txt });
        }
      });
      const SX = 4, CWID = 5.85;
      Viz.svg('text', { x: 4, y: 222, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.stripLabel;
      kinds.forEach((k, r) => {
        const y = 230 + r * 16;
        strip[k] = [];
        for (let t = 0; t < D.tokens; t++) strip[k].push(Viz.svg('rect', { x: SX + t * CWID, y, width: CWID - 0.85, height: 13, class: 'viz-cell' }, svg));
      });
      const marks = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}${Viz.button(T.bBurstOff, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = kinds.map(k => Viz.stat({ id: 'p-' + k, k: T.sK(T.names[k]), v: '—', f: T.sF(0, 0), hot: k === 'decay' })).join('') +
        Viz.stat({ id: 'p-rule', k: T.sRuleK, v: T.sRuleV, f: T.sRuleF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn, burstBtn] = left.querySelectorAll('.viz-btn');
      let burst = false, trace, pol, t, hits, perToken, busy = false;

      function load() {
        trace = M.makeTrace({ seed: 3, burst });
        pol = Object.fromEntries(kinds.map(k => [k, M.makePolicy(k)]));
        hits = { lru: 0, lfu: 0, decay: 0 }; perToken = { lru: [], lfu: [], decay: [] }; t = 0;
        marks.innerHTML = '';
        const line = (x) => Viz.svg('rect', { x, y: 226, width: 2, height: 52, style: 'fill:var(--a3)' }, marks);
        line(SX + trace.shiftAt * CWID - 1.5);
        if (trace.burstAt >= 0) { line(SX + trace.burstAt * CWID - 1.5); line(SX + (trace.burstAt + 3) * CWID - 1.5); }
        burstBtn.textContent = burst ? T.bBurstOn : T.bBurstOff;
        $('.viz-verdict').hidden = true; pipe.set(-1); paint(null); stats();
      }
      const topicOf = i => (i < trace.shiftAt ? 'A' : 'B');
      const ids = arr => arr.map(e => '#' + String(e).padStart(2, '0')).join(' ');
      function paint(routed) {
        const hot = t > 0 && t - 1 >= trace.shiftAt ? trace.hotB : trace.hotA;
        routedText.textContent = routed ? T.routed(t, topicOf(t - 1), ids(routed)) : '';
        kinds.forEach(k => {
          const list = [...pol[k].resident()].sort((a, b) => a - b);
          slots[k].forEach((s, i) => {
            const e = list[i];
            s.txt.textContent = e === undefined ? '' : '#' + String(e).padStart(2, '0');
            s.rect.setAttribute('class', 'viz-cell' + (e !== undefined && hot.includes(e) ? ' pick' : ''));
            s.txt.style.fill = e !== undefined && hot.includes(e) ? 'var(--paper)' : 'var(--ink)';
          });
          strip[k].forEach((r, i) => {
            if (i < perToken[k].length) { r.setAttribute('class', 'viz-cell score'); r.style.opacity = 0.12 + 0.88 * perToken[k][i] / M.DEFAULTS.k; }
            else { r.setAttribute('class', 'viz-cell'); r.style.opacity = 1; }
          });
        });
      }
      const pct = (h, n) => (n ? Math.round(h / n * 100) : 0) + '%';
      const after = k => perToken[k].slice(trace.shiftAt, trace.shiftAt + 15).reduce((a, b) => a + b, 0);
      function stats() {
        const n = t * M.DEFAULTS.k;
        kinds.forEach(k => {
          $(`[data-s=p-${k}-v]`).textContent = t ? pct(hits[k], n) : '—';
          $(`[data-s=p-${k}-f]`).innerHTML = T.sF(hits[k], n) + (t > trace.shiftAt ? '<br>' + T.sAfterF(after(k)) : '');
          rateText[k].textContent = t ? pct(hits[k], n) : '';
        });
      }
      async function step(fast) {
        if (t >= trace.tokens.length) return;
        const routed = trace.tokens[t];
        if (!fast) { if (t === trace.shiftAt) term.log(T.lShift); if (t === trace.burstAt) term.log(T.lBurst); }
        if (!fast) { pipe.set(0); await ctx.sleep(90); pipe.set(1); }
        const res = {};
        kinds.forEach(k => { res[k] = pol[k].token(routed); hits[k] += res[k].hits; perToken[k].push(res[k].hits); });
        t++;
        if (!fast) {
          await ctx.sleep(90); pipe.set(2);
          term.log(T.lTok(t, topicOf(t - 1), ids(routed), res.lru.hits, res.lfu.hits, res.decay.hits));
          if (res.decay.adapted) {
            await ctx.sleep(90); pipe.set(3); await ctx.sleep(90); pipe.set(4);
            term.log(T.lAdapt(res.decay.swaps.map(([a, b]) => T.lMove(String(a).padStart(2, '0'), b === null ? null : String(b).padStart(2, '0'))).join('，')));
          }
        }
        paint(routed); stats();
        if (t === trace.tokens.length) finish();
      }
      function finish() {
        term.log(T.lDone);
        const n = t * M.DEFAULTS.k;
        const v = $('.viz-verdict');
        v.innerHTML = T.verdict({ lru: pct(hits.lru, n), lfu: pct(hits.lfu, n), decay: pct(hits.decay, n) }, { lru: after('lru'), lfu: after('lfu'), decay: after('decay') });
        v.hidden = false;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      stepBtn.onclick = () => guard(async () => { if (t >= trace.tokens.length) load(); await step(false); });
      allBtn.onclick = () => guard(async () => {
        if (t >= trace.tokens.length) load();
        while (t < trace.tokens.length) { await step(true); await ctx.sleep(25); }
      });
      resetBtn.onclick = () => guard(async () => { load(); term.clear(); term.log(T.ready); });
      burstBtn.onclick = () => guard(async () => { burst = !burst; load(); term.clear(); term.log(T.ready); });
      load();
    },
  });

  Viz.register('expert-swap', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.wCode, title: T.wTitle, tag: T.wTag, intro: T.wIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.wLgOld },
        { color: 'var(--accent)', text: T.wLgNew, glow: true },
        { color: 'var(--a2)', text: T.wLgBad },
      ]));
      const pipe = Viz.pipe(body, T.wSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 206', class: 'viz-stage', role: 'img', 'aria-label': T.wTitle }, left);
      const tx = (x, y, s, size, fill, anchor) => { const e = Viz.svg('text', { x, y, 'font-size': size || 13, 'text-anchor': anchor || 'start', style: `fill:${fill || 'var(--ink)'}` }, svg); e.textContent = s; return e; };
      tx(4, 14, T.tableLabel, 12, 'var(--muted)');
      Viz.svg('rect', { x: 4, y: 20, width: 186, height: 32, class: 'viz-cell' }, svg);
      Viz.svg('rect', { x: 4, y: 56, width: 186, height: 32, class: 'viz-cell' }, svg);
      const t331 = tx(12, 41, ''), t112 = tx(12, 77, '');
      tx(200, 14, T.ramLabel, 12, 'var(--muted)');
      Viz.svg('rect', { x: 200, y: 20, width: 156, height: 32, class: 'viz-cell' }, svg);
      Viz.svg('rect', { x: 200, y: 56, width: 156, height: 32, class: 'viz-cell' }, svg);
      tx(278, 41, '#331', 13, 'var(--ink)', 'middle'); tx(278, 77, '#112', 13, 'var(--ink)', 'middle');
      tx(4, 108, T.slotLabel, 12, 'var(--muted)');
      Viz.svg('rect', { x: 4, y: 114, width: 352, height: 36, class: 'viz-cell' }, svg);
      const fillNew = Viz.svg('rect', { x: 4, y: 114, width: 0, height: 36, style: 'fill:var(--accent)' }, svg);
      const slotText = tx(180, 137, '', 13, 'var(--ink)', 'middle');
      const arrow = Viz.svg('path', { d: 'M278 90V112', style: 'stroke:var(--accent);stroke-width:3;fill:none', opacity: 0 }, svg);
      const readBox = Viz.svg('rect', { x: 4, y: 160, width: 352, height: 40, class: 'viz-cell' }, svg);
      const readText = tx(180, 185, '', 13, 'var(--ink)', 'middle');
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.wStep)}${Viz.button(T.wReset, 'ghost')}${Viz.button(T.wBug, 'ghost')}</div>`);
      const term = Viz.term(left, T.wReady);
      right.innerHTML = Viz.stat({ id: 'w-tab', k: T.sTabK, v: '—', f: T.sTabF }) + Viz.stat({ id: 'w-slot', k: T.sSlotK, v: '—', f: T.sSlotF }) + Viz.stat({ id: 'w-ok', k: T.sOkK, v: '—', f: T.sOkF, hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.wTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, resetBtn, bugBtn] = left.querySelectorAll('.viz-btn');
      let bug = false, steps, i, anyWrong;
      const slotName = n => (n >= 0 ? T.slot : T.none);
      function load() {
        steps = M.swapTimeline(bug); i = 0; anyWrong = false;
        bugBtn.textContent = bug ? T.wBugOn : T.wBug;
        bugBtn.className = 'viz-btn ' + (bug ? 'alt' : 'ghost');
        $('.viz-verdict').hidden = true; pipe.set(-1); paint(null);
        term.clear(); term.log(T.wReady);
      }
      function paint(s) {
        const st = s || steps[0];
        t331.textContent = '#331 → ' + slotName(st.table331);
        t112.textContent = '#112 → ' + slotName(st.table112);
        fillNew.setAttribute('width', 352 * st.copied);
        slotText.textContent = st.copied === 0 ? T.slotOld : st.copied < 1 ? T.slotMixed : T.slotNew;
        slotText.style.fill = st.copied === 1 ? 'var(--paper)' : 'var(--ink)';
        arrow.setAttribute('opacity', s && s.key === 'copy' ? 1 : 0);
        readBox.setAttribute('class', 'viz-cell' + (s && s.reads112 ? (s.correct ? ' pick' : ' score') : ''));
        readText.textContent = s && s.reads112 ? T.wReadShort(s.who112, s.correct) : '';
        readText.style.fill = s && s.reads112 ? 'var(--paper)' : 'var(--ink)';
        $('[data-s=w-tab-v]').textContent = s ? (st.table112 >= 0 ? '#112 → 5' : '#112 → —') : '—';
        $('[data-s=w-slot-v]').textContent = s ? slotText.textContent : '—';
        $('[data-s=w-ok-v]').textContent = s && s.reads112 ? (s.correct ? T.okYes : T.okNo) : T.okNa;
      }
      stepBtn.onclick = () => {
        if (i >= steps.length) load();
        const s = steps[i];
        pipe.set(i);
        term.log((s.key === 'unmap' && bug ? T.wLog.unmapBug : T.wLog[s.key]));
        if (s.reads112) term.log(T.wRead(s.who112, s.correct));
        if (!s.correct) anyWrong = true;
        paint(s);
        i++;
        if (i === steps.length) { const v = $('.viz-verdict'); v.textContent = anyWrong ? T.vBad : T.vGood; v.hidden = false; }
      };
      resetBtn.onclick = () => load();
      bugBtn.onclick = () => { bug = !bug; load(); };
      load();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
