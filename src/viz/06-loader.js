/* Chapter 06 widgets: the page cache under a cyclic working set, and the 8-bit bounds check.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.loader;

  const BLOB_MB = 1.3824;            // one cell stands for one expert-sized blob (expert_source.hpp: 1,382,400 B)
  const SSD_GBPS = 7, RAM_GBPS = 83; // chapter 01's upstream test machine, theoretical peaks

  const T = Viz.t({
    zh: {
      code: 'PAGE_CACHE', title: '页缓存模拟器：mmap 之后发生什么', tag: '教学推演 · 一格代表一段文件',
      intro: '模型文件已经用 mmap 映射好了，但还<b>一页都没读</b>。上排是文件在硬盘上的 16 段，下排是内存里的页缓存槽位。每生成一个 token，程序都按顺序把前 W 段读一遍（代表这个 token 要用的数据）。按 <b>单步</b> 一次访问一段，看哪次缺页、哪次命中。',
      lgFile: '文件的一段（在硬盘上）', lgNow: '正在访问', lgRes: '已在页缓存里', lgMiss: '缺页：要从硬盘读',
      steps: ['访问一段', '查页缓存', '命中：直接用', '缺页：读硬盘', '满了：淘汰最久没用的'],
      fileLabel: '文件（硬盘）', cacheLabel: '页缓存（内存）', empty: '空',
      stageLabel: '文件页与页缓存槽位',
      wLabel: '每个 token 读几段（W）', cLabel: '页缓存槽位（C）',
      bStep: '▶ 单步', bRun: '▶▶ 跑 10 个 token', bReset: '重置',
      ready: '<span class="c">$</span> mmap 完成：文件已映射进地址空间，读入 0 字节。按 [ ▶ 单步 ] 开始访问',
      readyShort: '<span class="c">$</span> 已重置。页缓存清空',
      hit: (t, p) => `<span class="c">[T${String(t).padStart(2, '0')}]</span> 第 ${p} 段：<span class="c">命中</span>，内存里已有副本，直接用`,
      miss: (t, p, ms) => `<span class="c">[T${String(t).padStart(2, '0')}]</span> 第 ${p} 段：<span class="m">缺页</span>，从硬盘读入 ${BLOB_MB} MB（约 ${ms} ms）`,
      evict: (p) => `<span class="y">　└ 槽位满了，淘汰第 ${p} 段（最久没被用过）</span>`,
      fast: '<span class="y">// 快进：连续跑 10 个 token</span>',
      tokDone: (t, f, h) => `<span class="w">token ${t} 结束</span>：本轮缺页 ${f} 次，命中 ${h} 次`,
      sFaultK: '缺页次数', sFaultF: (f) => `<b>= 从硬盘读入 ${f} 段 × ${BLOB_MB} MB</b><br>= ${Viz.fmt(f * BLOB_MB, 1)} MB`,
      sRateK: '命中率', sRateF: (h, n) => `<b>= 命中 ÷ 访问 = ${h} ÷ ${n}</b>`,
      sTimeK: '估算读取耗时', sTimeF: `<b>= 缺页 × 0.198 ms + 命中 × 0.017 ms</b><br>一段 ${BLOB_MB} MB，硬盘按 ${SSD_GBPS} GB/s、内存按 ${RAM_GBPS} GB/s 估算`,
      verdictFit: (w, c) => `工作集 W = ${w} 段，页缓存 C = ${c} 个槽位，装得下。只有第 1 个 token 缺页，之后每个 token 全部命中：数据一直留在内存里，硬盘不用再读。`,
      verdictThrash: (w, c, rate) => `工作集 W = ${w} 段，比页缓存 C = ${c} 多。按顺序循环读的时候，每一段都在下次被用到之前被淘汰了，命中率只有 ${rate}%，每个 token 都要重新从硬盘读。<br>Strata 的源码注释记录过同样的现象：数据页被淘汰得和读进来一样快，速度掉到硬盘水平。`,
      try: [
        '保持 W = 8、C = 12，按 <b>跑 10 个 token</b>：只有第 1 个 token 缺页，之后命中率一路上涨。这就是“第二次就快了”的原因。',
        '把 C 拉到 <b>7</b>（比 W 少 1 个槽位），再跑：命中率掉到 0%，读盘量翻了 10 倍。缓存只差一点点，效果却是全有或全无。',
        '在 C = 7 时连按 <b>单步</b>，盯住被淘汰的那一段：它总是<b>马上就要用</b>的那一段。这说明“最久没用”并不总是“最不需要”。',
      ],

      rCode: 'BOUNDS_CHECK', rTitle: '区间检查：在 8 位整数的世界里', rTag: '教学推演 · 8 位无符号整数',
      rIntro: '为了让溢出看得见，这里所有数都是 <b>8 位无符号整数</b>：只能表示 0 到 255，算到 256 就绕回 0。文件长 F 字节；张量声称自己从偏移 o 开始、长 n 字节。比较两种检查写法，看谁会被骗。',
      rLgFile: '文件范围 [0, F)', rLgTensor: '张量声称的范围 [o, o+n)', rLgOut: '超出文件的部分',
      fLabel: '文件长度 F', oLabel: '偏移 o', nLabel: '长度 n',
      presets: ['正常张量', '恰好到末尾', '越界 1 字节', '溢出绕回', '偏移越界'],
      pv: [[128, 32, 64], [128, 64, 64], [128, 64, 65], [128, 200, 100], [100, 120, 0]],
      rStage: '文件与张量区间的数轴',
      axisNote: '8 位整数的上限 255',
      wrapNote: (s) => `8 位里算出的 o+n = ${s}`,
      sAK: '写法 A：o + n ≤ F', sBK: '写法 B：o ≤ F 且 n ≤ F − o', sTK: '真实情况（不限位数）',
      pass: '通过', fail: '拒绝',
      sAF: (o, n, s, w, f) => `<b>${o} + ${n} = ${w ? `${o + n}，绕回成 ${s}` : s}</b><br>${s} ≤ ${f} ？`,
      sBF: (o, n, f) => o <= f ? `<b>${o} ≤ ${f}，且 ${n} ≤ ${f} − ${o} = ${f - o}</b> ？` : `<b>${o} ≤ ${f}</b> 已经不成立，直接拒绝`,
      sTF: (o, n, f) => `<b>[${o}, ${o + n}) 是否落在 [0, ${f}) 里</b>`,
      inside: '在文件里', outside: '超出文件',
      vOk: '两种写法都给出了正确答案。',
      vBad: (s) => `写法 A 被骗了：o + n 超过 255 后绕回成 ${s}，看起来比 F 还小，于是一个越界的张量被放行。写法 B 先检查 o，再做一次<b>不会溢出</b>的减法，所以不会上当。`,
      rReady: '<span class="c">$</span> 选一个预设，或者拖动滑块',
      rLog: (name, a, b, t) => `<span class="c">[${name}]</span> 写法 A：${a}　写法 B：${b}　真实：<span class="${t ? 'c' : 'm'}">${t ? '在文件里' : '越界'}</span>`,
      custom: '自定义',
      rTry: [
        '点 <b>溢出绕回</b>：o = 200、n = 100 明明越界了，可 200 + 100 在 8 位里等于 44，写法 A 判它“合法”。',
        '点 <b>恰好到末尾</b>：张量最后一个字节正好是文件最后一个字节，两种写法都应该放行。边界条件写成 &lt; 还是 ≤，要在这里验证。',
        '点 <b>偏移越界</b>，再把 n 拉到 0：长度为 0 的张量也不能从文件外面开始。写法 B 的第一个条件就是为它准备的。',
      ],
    },
  });

  async function guardRun(el, ctx, state, fn) {
    if (state.busy) return;
    state.busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { if (ctx.alive) throw e; }
    state.busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
  }

  Viz.register('page-cache', {
    mount(el, ctx) {
      const PAGES = 16;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgFile },
        { color: 'var(--a3)', text: T.lgNow },
        { color: 'var(--accent)', text: T.lgRes, glow: true },
        { color: 'var(--a2)', text: T.lgMiss },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 200', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const label = (x, y, t) => { const e = Viz.svg('text', { x, y, 'font-size': 13, style: 'fill:var(--muted)' }, svg); e.textContent = t; return e; };
      label(2, 16, T.fileLabel);
      const fileCells = [], fileText = [];
      for (let i = 0; i < PAGES; i++) {
        fileCells.push(Viz.svg('rect', { x: 2 + i * 22, y: 24, width: 20, height: 40, rx: 2, style: 'fill:var(--frame)' }, svg));
        const t = Viz.svg('text', { x: 12 + i * 22, y: 49, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
        t.textContent = i; fileText.push(t);
      }
      label(2, 104, T.cacheLabel);
      const slotG = Viz.svg('g', {}, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-slider"><label>${T.wLabel}</label><input type="range" min="4" max="16" value="8" data-k="w" aria-label="${Viz.esc(T.wLabel)}"><output data-o="w">8</output></div>
        <div class="viz-slider"><label>${T.cLabel}</label><input type="range" min="4" max="16" value="12" data-k="c" aria-label="${Viz.esc(T.cLabel)}"><output data-o="c">12</output></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bRun, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'pc-f', k: T.sFaultK, v: '0', f: T.sFaultF(0), hot: true }) +
        Viz.stat({ id: 'pc-r', k: T.sRateK, v: '—', f: T.sRateF(0, 0) }) +
        Viz.stat({ id: 'pc-t', k: T.sTimeK, v: '0 ms', f: T.sTimeF });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden></div>` + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [stepBtn, runBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const state = { busy: false };
      let W = 8, C = 12, i = 0, cache = [], hits = 0, faults = 0, tokF = 0, tokH = 0;
      const missMs = M.transferMs(BLOB_MB * 1e6, SSD_GBPS), hitMs = M.transferMs(BLOB_MB * 1e6, RAM_GBPS);

      function paint(now, missed) {
        fileCells.forEach((c, p) => {
          let fill = 'var(--frame)', op = p < W ? 1 : 0.35;
          if (cache.includes(p)) fill = 'var(--accent)';
          if (p === now) fill = missed ? 'var(--a2)' : 'var(--a3)';
          c.style.fill = fill; c.style.opacity = op;
          fileText[p].style.fill = fill === 'var(--frame)' ? 'var(--ink)' : 'var(--paper)';
        });
        slotG.innerHTML = '';
        const w = Math.min(22, Math.floor(354 / C));
        for (let s = 0; s < C; s++) {
          const p = cache[s];
          Viz.svg('rect', { x: 2 + s * w, y: 112, width: w - 2, height: 40, rx: 2, style: `fill:${p === undefined ? 'var(--side)' : p === now ? (missed ? 'var(--a2)' : 'var(--a3)') : 'var(--accent)'};stroke:var(--frame)` }, slotG);
          const t = Viz.svg('text', { x: 2 + s * w + (w - 2) / 2, y: 137, 'font-size': 12, 'text-anchor': 'middle', style: `fill:${p === undefined ? 'var(--muted)' : 'var(--paper)'}` }, slotG);
          t.textContent = p === undefined ? '·' : p;
        }
        const n = Viz.svg('text', { x: 2, y: 184, 'font-size': 13, style: 'fill:var(--muted)' }, slotG);
        n.textContent = `W = ${W}　C = ${C}　token ${Math.floor(i / W) + (i % W ? 1 : 0)}`;
      }
      function stats() {
        const n = hits + faults;
        $('[data-s=pc-f-v]').textContent = Viz.fmt(faults);
        $('[data-s=pc-f-f]').innerHTML = T.sFaultF(faults);
        $('[data-s=pc-r-v]').textContent = n ? (hits / n * 100).toFixed(0) + '%' : '—';
        $('[data-s=pc-r-f]').innerHTML = T.sRateF(hits, n);
        $('[data-s=pc-t-v]').textContent = Viz.fmt(faults * missMs + hits * hitMs, 1) + ' ms';
      }
      function access(log, logTok) {
        const page = i % W, tok = Math.floor(i / W) + 1;
        const at = cache.indexOf(page), hit = at >= 0;
        let evicted = null;
        if (hit) { cache.splice(at, 1); hits++; tokH++; }
        else { faults++; tokF++; if (cache.length >= C) evicted = cache.shift(); }
        cache.push(page);
        i++;
        pipe.set(hit ? 2 : evicted !== null ? 4 : 3);
        if (log) {
          term.log(hit ? T.hit(tok, page) : T.miss(tok, page, missMs.toFixed(2)));
          if (evicted !== null) term.log(T.evict(evicted));
        }
        if (i % W === 0) { if (log || logTok) term.log(T.tokDone(tok, tokF, tokH)); tokF = 0; tokH = 0; }
        paint(page, !hit); stats();
      }
      function reset(msg) {
        i = 0; cache = []; hits = 0; faults = 0; tokF = 0; tokH = 0;
        pipe.set(-1); term.clear(); term.log(msg); $('.viz-verdict').hidden = true; paint(-1, false); stats();
      }
      stepBtn.onclick = () => guardRun(el, ctx, state, async () => { access(true, false); });
      runBtn.onclick = () => guardRun(el, ctx, state, async () => {
        reset(T.fast);
        for (let t = 0; t < 10; t++) {
          for (let p = 0; p < W; p++) { access(false, true); await ctx.sleep(25); }
        }
        const v = $('.viz-verdict');
        v.innerHTML = W <= C ? T.verdictFit(W, C) : T.verdictThrash(W, C, (hits / (hits + faults) * 100).toFixed(0));
        v.hidden = false;
      });
      resetBtn.onclick = () => guardRun(el, ctx, state, async () => reset(T.readyShort));
      el.querySelectorAll('input[type=range]').forEach(r => {
        r.oninput = () => {
          if (state.busy) return;
          if (r.dataset.k === 'w') W = +r.value; else C = +r.value;
          el.querySelector(`[data-o="${r.dataset.k}"]`).textContent = r.value;
          reset(T.readyShort);
        };
      });
      paint(-1, false); stats();
    },
  });

  Viz.register('range-check', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.rCode, title: T.rTitle, tag: T.rTag, intro: T.rIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.rLgFile },
        { color: 'var(--accent)', text: T.rLgTensor, glow: true },
        { color: 'var(--a2)', text: T.rLgOut },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      // Number line from 0 to 384 so a claimed range past 255 stays visible.
      const X0 = 12, SCALE = 336 / 384;
      const X = v => X0 + v * SCALE;
      const svg = Viz.svg('svg', { viewBox: '0 0 360 160', class: 'viz-stage', role: 'img', 'aria-label': T.rStage }, left);
      Viz.svg('line', { x1: X(0), y1: 96, x2: X(384), y2: 96, style: 'stroke:var(--muted)', 'stroke-width': 1 }, svg);
      for (const v of [0, 128, 256, 384]) {
        Viz.svg('line', { x1: X(v), y1: 92, x2: X(v), y2: 100, style: 'stroke:var(--muted)' }, svg);
        const t = Viz.svg('text', { x: X(v), y: 118, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg); t.textContent = v;
      }
      Viz.svg('line', { x1: X(256), y1: 20, x2: X(256), y2: 100, style: 'stroke:var(--a3)', 'stroke-dasharray': '4 3' }, svg);
      const lim = Viz.svg('text', { x: X(256) - 4, y: 146, 'font-size': 12, 'text-anchor': 'end', style: 'fill:var(--a3)' }, svg); lim.textContent = T.axisNote;
      const fileR = Viz.svg('rect', { x: X(0), y: 30, height: 22, style: 'fill:var(--frame)' }, svg);
      const tenR = Viz.svg('rect', { y: 58, height: 22, style: 'fill:var(--accent)' }, svg);
      const outR = Viz.svg('rect', { y: 58, height: 22, style: 'fill:var(--a2)' }, svg);
      const wrapM = Viz.svg('path', { d: '', style: 'fill:none;stroke:var(--a2)', 'stroke-width': 2 }, svg);
      const wrapT = Viz.svg('text', { y: 16, 'font-size': 13, style: 'fill:var(--a2)' }, svg);
      const fT = Viz.svg('text', { y: 46, 'font-size': 13, style: 'fill:var(--ink)' }, svg);

      const sl = (k, lab, v) => `<div class="viz-slider"><label>${lab}</label><input type="range" min="0" max="255" value="${v}" data-k="${k}" aria-label="${Viz.esc(lab)}"><output data-o="${k}">${v}</output></div>`;
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${T.presets.map((p, j) => Viz.button(p, j === 3 ? 'alt' : '')).join('')}</div>` +
        sl('f', T.fLabel, 128) + sl('o', T.oLabel, 32) + sl('n', T.nLabel, 64));
      const term = Viz.term(left, T.rReady);
      right.innerHTML =
        Viz.stat({ id: 'rc-a', k: T.sAK, v: '', f: '' }) +
        Viz.stat({ id: 'rc-b', k: T.sBK, v: '', f: '' }) +
        Viz.stat({ id: 'rc-t', k: T.sTK, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict"></div>` + Viz.tryList(T.rTry));
      const $ = s => el.querySelector(s);
      const v = { f: 128, o: 32, n: 64 };

      function render() {
        const r = M.checkRange(v.f, v.o, v.n, 8);
        fileR.setAttribute('width', Math.max(0, X(v.f) - X(0)));
        fT.setAttribute('x', X(0) + 4); fT.textContent = 'F = ' + v.f;
        const end = v.o + v.n, inEnd = Math.min(end, Math.max(v.f, v.o));
        tenR.setAttribute('x', X(v.o)); tenR.setAttribute('width', Math.max(0, X(inEnd) - X(v.o)));
        const outStart = Math.max(v.o, v.f);
        outR.setAttribute('x', X(outStart)); outR.setAttribute('width', Math.max(0, X(end) - X(outStart)));
        if (r.wrapped) {
          wrapM.setAttribute('d', `M${X(r.naiveSum)} 22V84`);
          wrapT.setAttribute('x', Math.min(X(r.naiveSum) + 4, 190)); wrapT.textContent = T.wrapNote(r.naiveSum);
        } else { wrapM.setAttribute('d', ''); wrapT.textContent = ''; }
        $('[data-s=rc-a-v]').textContent = r.naiveOk ? T.pass : T.fail;
        $('[data-s=rc-a-f]').innerHTML = T.sAF(v.o, v.n, r.naiveSum, r.wrapped, v.f);
        $('[data-s=rc-b-v]').textContent = r.safeOk ? T.pass : T.fail;
        $('[data-s=rc-b-f]').innerHTML = T.sBF(v.o, v.n, v.f);
        $('[data-s=rc-t-v]').textContent = r.truth ? T.inside : T.outside;
        $('[data-s=rc-t-f]').innerHTML = T.sTF(v.o, v.n, v.f);
        $('.viz-verdict').innerHTML = r.naiveOk !== r.truth ? T.vBad(r.naiveSum) : T.vOk;
        return r;
      }
      function log(name) { const r = render(); term.log(T.rLog(name, r.naiveOk ? T.pass : T.fail, r.safeOk ? T.pass : T.fail, r.truth)); }
      function setSliders() { for (const k of ['f', 'o', 'n']) { el.querySelector(`[data-k="${k}"]`).value = v[k]; el.querySelector(`[data-o="${k}"]`).textContent = v[k]; } }
      el.querySelectorAll('.viz-btn').forEach((b, j) => {
        b.onclick = () => { [v.f, v.o, v.n] = T.pv[j]; setSliders(); log(T.presets[j]); };
      });
      el.querySelectorAll('input[type=range]').forEach(r => {
        r.oninput = () => { v[r.dataset.k] = +r.value; el.querySelector(`[data-o="${r.dataset.k}"]`).textContent = r.value; render(); };
        r.onchange = () => log(T.custom);
      });
      render();
      void ctx;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
