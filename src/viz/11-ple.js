/* Chapter 11 widgets: the toy n-gram hash and the 8-way row cache with a rotating pointer.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.ple;
  const TOY = M.TOY;

  const T = Viz.t({
    zh: {
      code: 'NGRAM_HASH', title: 'n-gram 哈希：三个词变成八个行号', tag: '教学推演 · 小号哈希',
      intro: '选一组上下文（从旧到新三个词），按 <b>单步</b> 看哈希怎样算行号：取最近 2 个词和最近 3 个词，各算一个“混合值”（相乘再异或），再对 4 个不同的数取余，得到 8 个行号。Strata 的做法一样，只是每种 n-gram 有 8 个头、每个头约 2000 万行。',
      lgBi: '二元组（最近 2 个词）算出的行', lgTri: '三元组（最近 3 个词）算出的行', lgHit: '两个不同的 n-gram 撞到同一行',
      steps: ['取上下文', '二元组混合', '三元组混合', '各头取余', '拼成 8 行'],
      words: { 2: '〈结束〉', 5: '我', 7: '你', 11: '喜欢', 13: '吃', 19: '鱼', 23: '猫', 29: '狗' },
      none: '〈无〉',
      presets: [
        { name: '我 喜欢 猫', tok: 23, prev: [5, 11] },
        { name: '你 喜欢 猫', tok: 23, prev: [7, 11] },
        { name: '我 喜欢 狗', tok: 29, prev: [5, 11] },
        { name: '〈无〉〈无〉我', tok: 5, prev: [-1, -1] },
        { name: '喜欢 〈结束〉 猫', tok: 23, prev: [11, 2] },
        { name: '你 吃 鱼', tok: 19, prev: [7, 13] },
      ],
      pick: '上下文（旧 → 新）：',
      stageLabel: '玩具大表：8 个头，共 180 行',
      stageKey: '上：头的编号　中：模数　下：本次行号',
      bStep: '▶ 单步', bAll: '▶▶ 一次算完', bReset: '清空记录',
      ready: '<span class="c">$</span> ready. 先点一组上下文，再按 [ ▶ 单步 ]',
      l0: (ctx) => `<span class="c">上下文</span>：当前词在前，往回数两个 → [${ctx}]（没有的位置、以及〈结束〉之前的位置，一律记成〈结束〉）`,
      l1: (a, b, x) => `<span class="m">二元组</span>：${a} ⊕ ${b} = <span class="w">${x}</span>（⊕ 是异或，按二进制逐位比较，相同得 0、不同得 1）`,
      l2: (a, b, c, x) => `<span class="m">三元组</span>：${a} ⊕ ${b} ⊕ ${c} = <span class="w">${x}</span>`,
      l3: (parts) => `<span class="y">取余</span>：${parts}`,
      l4: (n, hit) => `<span class="c">→</span> 8 个行号就位。表里只存这些行的数字，不存词本身。${hit ? `<span class="y">有 ${n} 行和另一个不同的 n-gram 撞到了一起</span>：两者会读到同一行数据，模型分不清它们。` : '目前没有撞车（同一个 n-gram 重复出现时去同一行，不算撞车）。'}`,
      sRowsK: '这组上下文的 8 个行号', sRowsF: '<b>行号 = 混合值 mod 模数 + 该头起点</b><br>8 个头的模数是 13、17、19、23、11、29、31、37',
      sColK: '撞车的行（被两个不同的 n-gram 共用）', sColF: (ctxs, rows) => `<b>已登记 ${ctxs} 个不同的 n-gram</b><br>玩具表只有 ${rows} 行，三元组却有 8³ = 512 种：<br>鸽巢原理保证一定会撞`,
      sRealK: 'Strata 每个 token 实际读多少', sRealV: '1,440 B', sRealF: '<b>= 16 行 × 90 字节</b><br>8 个二元组头 + 8 个三元组头；<br>每行 160 个数，16 行拼成 2560 个数',
      try: [
        '先点 <b>我 喜欢 猫</b> 算一遍，再点同一组再算：行号一模一样。哈希是确定的，同样的输入永远去同一行。',
        '换成 <b>你 喜欢 猫</b>：只改了最旧的词，二元组的 4 行不动，三元组的 4 行全变。二元组根本看不到第三个词。',
        '点 <b>喜欢 〈结束〉 猫</b>：〈结束〉把更早的“喜欢”截断了。六组都算一遍，看“撞车”计数涨起来；再数一数，撞车的两个 n-gram 通常只在 1 个头上相撞，别的头上各走各的。这就是多用几个头的好处。',
      ],

      cCode: 'ROW_CACHE', cTitle: '行缓存：8 路组相联 + 轮换指针', cTag: '教学推演 · 组号用取余',
      cIntro: '缓存一共 16 格，分成 2 组、每组 8 路。一行先按 <b>行号 mod 2</b> 分到一组，只能住在这组的 8 格里。组里没找到，就把<b>替换指针</b>指着的那一格换掉，指针再往后挪一格。下方用同样 16 格、但“随便放、换最久没用的”（全相联 LRU）跑同一串访问作对照。',
      cLgEmpty: '空格', cLgHit: '这一步命中', cLgNew: '这一步写入（换掉了旧行）', cLgPtr: '▲ 该组的替换指针',
      cSteps: ['算组号', '组内比 8 路', '命中？', '按指针替换', '指针 +1'],
      setName: (s) => `第 ${s} 组`,
      traceLabel: '访问序列',
      cPresets: ['冲突：9 个奇数行轮流来', '热点：少数行反复出现'],
      cbStep: '▶ 下一次访问', cbAll: '▶▶ 跑完', cbReset: '重置',
      cReady: '<span class="c">$</span> ready. 选一串访问，按 [ ▶ 下一次访问 ]',
      cHit: (k, s, w) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}，在第 ${s} 组第 ${w} 路找到：<span class="c">命中</span>，不用读 SSD`,
      cMiss: (k, s, w, ev) => `<span class="c">#${String(k).padStart(2, '0')}</span> → ${k} mod 2 = ${s}，组内 8 路都不是它：<span class="m">未命中</span>，读 SSD 后写进指针指的第 ${w} 路${ev === null ? '（原来是空的）' : `，换掉了 #${String(ev).padStart(2, '0')}`}，指针挪到 ${(w + 1) % 8}`,
      cLru: (hit) => `<span class="y">  对照</span>：全相联 LRU ${hit ? '命中' : '未命中'}`,
      cDone: '<span class="y">// 这串访问跑完了</span>',
      sRrK: '组相联 + 轮换（Strata 的做法）', sLruK: '全相联 LRU（对照）', sRateF: (h, n) => `<b>命中率 = 命中 ÷ 访问 = ${h} ÷ ${n}</b>`,
      sScaleK: 'Strata 默认的行缓存', sScaleV: '≈ 94 MB', sScaleF: '<b>1,048,576 行 = 131,072 组 × 8 路</b><br>× 90 字节/行',
      vConflict: (rr, lru) => `① 9 个行号都是奇数，全挤进第 1 组；这组只有 8 格，每来一个都把下一个要用的挤掉：轮换的命中率 <b>${rr}</b>。<br>② 同样 16 格的全相联 LRU 装得下这 9 行，命中率 <b>${lru}</b>。<br>③ 总容量够，不等于每一组都够。这种“组内打架”叫<b>冲突未命中</b>。Strata 先用哈希把行号打散再分组，就是为了不让真实数据这样扎堆。`,
      vHot: (rr, lru) => `① 访问集中在少数几行时，轮换的命中率 <b>${rr}</b>，全相联 LRU <b>${lru}</b>，相差不大。<br>② 轮换指针只需要每组一个小计数器，比 LRU 每次都要更新“最近使用时间”省事得多。<br>③ 访问越集中，简单的替换策略越够用。`,
      cTry: [
        '选 <b>冲突</b>，连按几次：第 1 组的指针一圈圈地转，每一步都在换掉马上要用的行，第 0 组却一直空着。',
        '按 <b>跑完</b>，对比两个命中率：轮换 0%，全相联 LRU 75%。差别全来自“只能住在自己那一组”。',
        '换成 <b>热点</b> 再跑完：两种做法的命中率接近。想一想，真实的 Strata 为什么敢用这么简单的策略。',
      ],
    },
  });

  Viz.register('ngram-hash', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgBi, glow: true },
        { color: 'var(--a2)', text: T.lgTri },
        { color: 'var(--a3)', text: T.lgHit },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin:0 0 12px"><span style="font-size:14px">${T.pick}</span>${T.presets.map((p, i) => `<button type="button" class="viz-btn ghost" data-p="${i}">${Viz.esc(p.name)}</button>`).join('')}</div><div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 360, X0 = 4, scale = (W - 2 * X0) / TOY.rows;
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} 168`, class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      Viz.svg('text', { x: 4, y: 16, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.stageLabel;
      Viz.svg('text', { x: 4, y: 162, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.stageKey;
      TOY.mods.forEach((mod, h) => {
        const x = X0 + TOY.offsets[h] * scale, w = mod * scale;
        Viz.svg('rect', { x: x + 1, y: 46, width: w - 2, height: 56, style: `fill:var(--side);stroke:${h < TOY.HEADS ? 'var(--accent)' : 'var(--a2)'};stroke-width:1` }, svg);
        Viz.svg('text', { x: x + w / 2, y: 38, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = h;
        Viz.svg('text', { x: x + w / 2, y: 120, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = mod;
      });
      const ghostLayer = Viz.svg('g', {}, svg), markLayer = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'n-rows', k: T.sRowsK, v: '—', f: T.sRowsF }) +
        Viz.stat({ id: 'n-col', k: T.sColK, v: '0', f: T.sColF(0, TOY.rows), hot: true }) +
        Viz.stat({ id: 'n-real', k: T.sRealK, v: T.sRealV, f: T.sRealF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn] = left.querySelectorAll('.viz-btn');
      const word = id => (id < 0 ? T.none : T.words[id]);
      let preset = 0, phase = 0, busy = false, cur = null;
      const owners = new Map();   // row -> set of context names that landed there

      function choose(i) {
        preset = i; phase = 0; cur = M.toyRows(T.presets[i].tok, T.presets[i].prev);
        el.querySelectorAll('[data-p]').forEach(b => { b.className = 'viz-btn ' + (+b.dataset.p === i ? '' : 'ghost'); });
        markLayer.innerHTML = ''; pipe.set(-1);
      }
      function paintGhosts() {
        ghostLayer.innerHTML = '';
        owners.forEach((names, row) => Viz.svg('rect', { x: X0 + row * scale + 0.5, y: 50, width: Math.max(2, scale - 1), height: 48, style: `fill:${names.size > 1 ? 'var(--a3)' : 'var(--frame)'}` }, ghostLayer));
      }
      function paintRows(n) {
        markLayer.innerHTML = '';
        cur.rows.slice(0, n).forEach((row, h) => {
          const x = X0 + row * scale;
          Viz.svg('rect', { x: x - 1, y: 46, width: Math.max(4, scale + 2), height: 56, style: `fill:${h < TOY.HEADS ? 'var(--accent)' : 'var(--a2)'}` }, markLayer);
          const cx = X0 + (TOY.offsets[h] + TOY.mods[h] / 2) * scale;
          Viz.svg('text', { x: cx, y: 140, 'font-size': 12, 'text-anchor': 'middle', style: `fill:${h < TOY.HEADS ? 'var(--accent)' : 'var(--a2)'}` }, markLayer).textContent = row;
        });
      }
      function collisions() {
        let n = 0; owners.forEach(names => { if (names.size > 1) n++; }); return n;
      }
      function contexts() { const s = new Set(); owners.forEach(names => names.forEach(x => s.add(x))); return s.size; }
      async function step(fast) {
        if (!cur) choose(preset);
        pipe.set(phase);
        const c = cur.ctx;
        const prod = j => `${word(c[j])}×${TOY.mult[j]}=${c[j] * TOY.mult[j]}`;
        if (phase === 0 && !fast) term.log(T.l0([c[0], c[1], c[2]].map(word).join(', ')));
        if (phase === 1) { paintRows(0); if (!fast) term.log(T.l1(prod(0), prod(1), cur.mixed[0])); }
        if (phase === 2 && !fast) term.log(T.l2(prod(0), prod(1), prod(2), cur.mixed[1]));
        if (phase === 3) {
          for (let n = 1; n <= cur.rows.length; n++) { paintRows(n); if (!fast) await ctx.sleep(90); }
          if (!fast) term.log(T.l3(cur.rows.map((r, h) => `${cur.mixed[h < TOY.HEADS ? 0 : 1]} mod ${TOY.mods[h]} + ${TOY.offsets[h]} = ${r}`).slice(0, 8).join('；')));
        }
        if (phase === 4) {
          const gram = [[c[1], c[0]], [c[2], c[1], c[0]]].map(g => g.map(word).join(' '));
          cur.rows.forEach((r, h) => { if (!owners.has(r)) owners.set(r, new Set()); owners.get(r).add(gram[h < TOY.HEADS ? 0 : 1]); });
          const shared = cur.rows.filter(r => owners.get(r).size > 1).length;
          paintGhosts();
          $('[data-s=n-rows-v]').textContent = cur.rows.join(' ');
          $('[data-s=n-col-v]').textContent = collisions();
          $('[data-s=n-col-f]').innerHTML = T.sColF(contexts(), TOY.rows);
          if (!fast) term.log(T.l4(shared, shared > 0));
        }
        phase = (phase + 1) % 5;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      el.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => guard(async () => { choose(+b.dataset.p); }); });
      stepBtn.onclick = () => guard(() => step(false));
      allBtn.onclick = () => guard(async () => { phase = 0; for (let i = 0; i < 5; i++) await step(false); });
      resetBtn.onclick = () => guard(async () => { owners.clear(); paintGhosts(); choose(preset); term.clear(); term.log(T.ready); $('[data-s=n-rows-v]').textContent = '—'; $('[data-s=n-col-v]').textContent = '0'; $('[data-s=n-col-f]').innerHTML = T.sColF(0, TOY.rows); });
      choose(0);
    },
  });

  Viz.register('row-cache', {
    mount(el, ctx) {
      const SETS = 2, WAYS = 8;
      const body = Viz.frame(el, { code: T.cCode, title: T.cTitle, tag: T.cTag, intro: T.cIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.cLgEmpty },
        { color: 'var(--accent)', text: T.cLgHit, glow: true },
        { color: 'var(--a2)', text: T.cLgNew },
        { color: 'var(--a3)', text: T.cLgPtr },
      ]));
      const pipe = Viz.pipe(body, T.cSteps);
      body.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin:0 0 12px">${T.cPresets.map((p, i) => `<button type="button" class="viz-btn ghost" data-t="${i}">${Viz.esc(p)}</button>`).join('')}</div><div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 206', class: 'viz-stage', role: 'img', 'aria-label': T.cTitle }, left);
      const CW = 42, GAP = 2, CX = 4, cells = [], ptrs = [], setY = s => 22 + s * 72;
      for (let s = 0; s < SETS; s++) {
        const y = setY(s);
        Viz.svg('text', { x: 4, y: y - 6, 'font-size': 12, style: 'fill:var(--ink)' }, svg).textContent = T.setName(s);
        for (let w = 0; w < WAYS; w++) {
          const r = Viz.svg('rect', { x: CX + w * (CW + GAP), y, width: CW, height: 34, class: 'viz-cell' }, svg);
          const t = Viz.svg('text', { x: CX + w * (CW + GAP) + CW / 2, y: y + 22, 'font-size': 13, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
          cells.push({ r, t });
        }
        ptrs.push(Viz.svg('path', { d: 'M0 0l6 9h-12z', style: 'fill:var(--a3)' }, svg));
      }
      Viz.svg('text', { x: 4, y: 166, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T.traceLabel;
      const traceG = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.cbStep)}${Viz.button(T.cbAll, 'alt')}${Viz.button(T.cbReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.cReady);
      right.innerHTML =
        Viz.stat({ id: 'c-rr', k: T.sRrK, v: '—', f: T.sRateF(0, 0), hot: true }) +
        Viz.stat({ id: 'c-lru', k: T.sLruK, v: '—', f: T.sRateF(0, 0) }) +
        Viz.stat({ id: 'c-scale', k: T.sScaleK, v: T.sScaleV, f: T.sScaleF });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden></div>` + Viz.tryList(T.cTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn] = left.querySelectorAll('.viz-btn');
      let which = 0, trace = [], i = 0, rr, lru, rrHits = 0, lruHits = 0, busy = false, last = null;

      function load(t) {
        which = t; trace = t === 0 ? M.conflictTrace() : M.hotTrace(7); i = 0; rrHits = 0; lruHits = 0; last = null;
        rr = M.makeCache({ sets: SETS, ways: WAYS, policy: 'rr' });
        lru = M.makeCache({ sets: 1, ways: SETS * WAYS, policy: 'lru' });
        el.querySelectorAll('[data-t]').forEach(b => { b.className = 'viz-btn ' + (+b.dataset.t === t ? '' : 'ghost'); });
        $('.viz-verdict').hidden = true; pipe.set(-1); paint(); stats();
      }
      function paint() {
        cells.forEach((c, j) => {
          const k = rr.keys[j];
          c.t.textContent = k === null ? '' : '#' + String(k).padStart(2, '0');
          let cls = 'viz-cell';
          if (last && last.set * WAYS + last.way === j) cls += last.hit ? ' pick' : ' score';
          c.r.setAttribute('class', cls);
        });
        ptrs.forEach((p, s) => p.setAttribute('transform', `translate(${CX + rr.next[s] * (CW + GAP) + CW / 2} ${setY(s) + 37})`));
        traceG.innerHTML = '';
        const per = 12, start = Math.max(0, Math.min(i - 4, trace.length - per));
        trace.slice(start, start + per).forEach((k, n) => {
          const idx = start + n, x = 4 + n * 29;
          Viz.svg('rect', { x, y: 172, width: 26, height: 26, class: 'viz-cell' + (idx === i - 1 ? ' pick' : ''), style: idx < i - 1 ? 'opacity:.45' : '' }, traceG);
          Viz.svg('text', { x: x + 13, y: 190, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, traceG).textContent = String(k).padStart(2, '0');
        });
      }
      const pct = (h, n) => (n ? Math.round(h / n * 100) : 0) + '%';
      function stats() {
        $('[data-s=c-rr-v]').textContent = i ? pct(rrHits, i) : '—';
        $('[data-s=c-rr-f]').innerHTML = T.sRateF(rrHits, i);
        $('[data-s=c-lru-v]').textContent = i ? pct(lruHits, i) : '—';
        $('[data-s=c-lru-f]').innerHTML = T.sRateF(lruHits, i);
      }
      async function step(fast) {
        if (i >= trace.length) return false;
        const k = trace[i++];
        const r = rr.access(k), l = lru.access(k);
        if (r.hit) rrHits++;
        if (l.hit) lruHits++;
        last = r;
        if (!fast) {
          const phases = r.hit ? [0, 1, 2] : [0, 1, 2, 3, 4];
          for (const p of phases) { pipe.set(p); await ctx.sleep(110); }
          term.log(r.hit ? T.cHit(k, r.set, r.way) : T.cMiss(k, r.set, r.way, r.evicted));
          term.log(T.cLru(l.hit));
        }
        paint(); stats();
        if (i === trace.length) finish();
        return true;
      }
      function finish() {
        term.log(T.cDone);
        const v = $('.viz-verdict');
        v.innerHTML = which === 0 ? T.vConflict(pct(rrHits, i), pct(lruHits, i)) : T.vHot(pct(rrHits, i), pct(lruHits, i));
        v.hidden = false;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      el.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => guard(async () => { load(+b.dataset.t); term.clear(); term.log(T.cReady); }); });
      stepBtn.onclick = () => guard(async () => { if (i >= trace.length) load(which); await step(false); });
      allBtn.onclick = () => guard(async () => {
        if (i >= trace.length) load(which);
        while (i < trace.length) { await step(true); await ctx.sleep(40); }
      });
      resetBtn.onclick = () => guard(async () => { load(which); term.clear(); term.log(T.cReady); });
      load(0);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
