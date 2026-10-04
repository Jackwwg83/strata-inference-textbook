/* Chapter 15 widgets: the kernel-launch timeline (direct vs fused vs graph) and the frozen-position replay.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.launch;

  const T = Viz.t({
    zh: {
      code: 'LAUNCH_TIMELINE', title: '启动开销时间线', tag: '教学推演 · 参数可调',
      intro: '同样一串小 kernel，用三种方式交给 GPU。上面一行是 CPU 在“提交”，下面一行是 GPU 在“计算”。拖动滑块，再按 <b>播放</b>，看 GPU 有多少时间在干等。',
      lgCpu: 'CPU 提交一次启动', lgGpu: 'GPU 在计算', lgIdle: 'GPU 空闲（在等下一次提交）',
      rows: ['逐个启动', '融合', 'CUDA Graph'], cpu: 'CPU', gpu: 'GPU',
      stageLabel: '三种提交方式的时间线',
      nLabel: 'kernel 个数 n', wLabel: '每个 kernel 计算 w', lLabel: '每次启动开销 L', gLabel: '几个融合成一个 g',
      us: (x) => `${x} µs`, nOut: (x) => `${x} 个`, gOut: (x) => `${x} 合 1`,
      bPlay: '▶ 播放', bReset: '重置',
      ready: '<span class="c">$</span> ready. 调好参数后按 [ ▶ 播放 ]',
      sDirK: '逐个启动：总时间', sFusK: '融合：总时间', sGraK: 'CUDA Graph：总时间',
      sDirF: (n, L, w, busy) => (w < L ? `<b>= ${n} × ${L} + ${w}</b>（n × L + w：kernel 比启动短）` : `<b>= ${L} + ${n} × ${w}</b>（L + n × w：kernel 比启动长）`) + `<br>GPU 忙碌占比 ${busy}%`,
      sFusF: (m, g, busy) => `<b>启动次数 ${m} = ⌈n ÷ ${g}⌉</b><br>GPU 忙碌占比 ${busy}%`,
      sGraF: (busy) => `<b>= 1 次图启动 + n × w</b><br>GPU 忙碌占比 ${busy}%`,
      tPlay: '<span class="y">// 时钟开始走，三种方式同时出发</span>',
      tDir: (n, L, w, tot, busy) => `<span class="c">逐个启动</span>：CPU 提交 ${n} 次，每次 ${L} µs；每个 kernel 只算 ${w} µs。共 ${tot} µs，GPU 忙了 ${busy}%`,
      tFus: (m, tot, busy) => `<span class="m">融合</span>：只剩 ${m} 次启动，每个 kernel 干得更多。共 ${tot} µs，GPU 忙了 ${busy}%`,
      tGra: (tot, busy) => `<span class="w">CUDA Graph</span>：整串只提交 1 次，节点一个接一个跑。共 ${tot} µs，GPU 忙了 ${busy}%`,
      vLaunch: (x) => `① 每个 kernel 只算 w，却要等 L 才轮到它：GPU 大部分时间在<b>等 CPU 提交</b>，这叫“启动受限”。<br>② 融合减少了启动次数；CUDA Graph 把提交压到一次，GPU 几乎不停。这里图比逐个启动快 <b>${x} 倍</b>。<br>③ Strata 源码注释里的实测：一个层块的 43 个节点，逐个启动 2.393 ms，图重放 1.585 ms。`,
      vCompute: (saved) => `① 现在每个 kernel 比一次启动还长，GPU 一直有活干，提交开销被<b>藏在计算后面</b>。<br>② 所以图只比逐个启动省下 <b>${saved}%</b> 的时间：启动开销已经不是瓶颈。<br>③ 先找到真正的瓶颈，再决定要不要做融合或图。`,
      try: [
        '保持默认（w = 5 µs、L = 20 µs）按 <b>播放</b>：逐个启动那一行，GPU 行几乎全是空隙。小 kernel 的时间都花在“排队等提交”上。',
        '把 <b>w</b> 拉到 40 µs 再播放：三行的总时间差不多了。kernel 一长，启动开销就被计算盖住。',
        '把 <b>g</b> 从 1 拉到 8：融合越多，启动次数越少，但每个 kernel 越大。真实的融合还会占更多寄存器，这里没有画出来。',
      ],

      fCode: 'GRAPH_REPLAY', fTitle: '被冻住的位置', fTag: '教学推演 · 只画 8 格 KV',
      fIntro: 'CUDA Graph 录下 kernel 时，连参数一起录。选一种写法，按 <b>单步</b> 连续生成几个 token，看 KV 缓存每一格被谁写入。',
      fLgCell: '一格 = KV 缓存里的一个位置', fLgNew: '这一步刚写入', fLgOld: '早先写入、仍然有效',
      modes: ['参数按值录进图（错误写法）', 'kernel 从 step 缓冲读位置（Strata 的写法）'],
      fSteps: ['主机准备位置', '重放图', '写入 KV', '注意力读历史', '输出 token'],
      cellsLabel: '8 格 KV 缓存与 step 缓冲',
      stepNames: ['pos', 'n_kv', 'n_bid', 'width'],
      kvTitle: 'KV 缓存（位置 0–7）', stepTitle: 'kernel 看到的 step 缓冲',
      bStep: '▶ 单步', bReset: '重置',
      fReady: '<span class="c">$</span> ready. 先选写法，再按 [ ▶ 单步 ]',
      sTrueK: '真实位置', sSeenK: 'kernel 看到的位置', sNkvK: '注意力能看到几格',
      sTrueF: '<b>= 已生成的 token 数</b><br>第 0 个 token 在位置 0', sSeenF: (frozen) => frozen ? '<b>录图那一刻的值，永远是 0</b><br>重放不会重新读参数' : '<b>每步由主机写进同一块显存</b><br>地址不变，内容在变',
      sNkvF: '<b>n_kv = pos + 1</b><br>和 pos 一起放在 step 缓冲里',
      p0: (t, frozen) => frozen ? `<span class="c">[t${t}]</span> 主机知道这是第 ${t} 个 token，可位置是 kernel 参数，录图时已经定成 0` : `<span class="c">[t${t}]</span> 主机把 pos = ${t} 写进 step 缓冲（同一块显存，地址不变）`,
      p1: '<span class="m">重放</span>：一次提交，整张图照录好的样子再跑一遍',
      p2: (pos) => `<span class="w">写入 KV</span>：kv_append 把这个 token 的 K、V 写进位置 ${pos}`,
      p3: (n) => `<span class="y">注意力</span>：只读前 ${n} 格历史`,
      p4: (frozen) => frozen ? '<span class="c">→</span> 输出一个 token：数值有限、不报错，可模型只“记得”刚写入的那一格' : '<span class="c">→</span> 输出一个 token：历史完整，和不录图时算的一样',
      fVerdictBad: '① 4 个 token 全写进了位置 0，注意力每次只看 1 格。<br>② 程序没有崩溃，输出也是正常的数字，只是模型像<b>失忆</b>了。这类错误最难查。<br>③ Strata 的 qsa.hpp 专门列出了 6 个会被这样冻住的参数，并把它们全部改成从 step 缓冲读取。',
      fVerdictGood: '① 4 个 token 各占一格，注意力能看到全部历史。<br>② 图里录下的是 step 缓冲的<b>地址</b>，主机每步只改它的<b>内容</b>。<br>③ 这就是 Strata 能把整层录成图、还保证每步位置正确的原因。',
      fTry: [
        '选 <b>按值录进图</b>，连按 <b>单步</b> 走完 4 个 token：所有写入都挤在位置 0，注意力始终只看 1 格。',
        '换成 <b>从 step 缓冲读</b>，再走 4 个 token：位置 0–3 依次填满，n_kv 跟着长。',
        '盯住右边的 step 缓冲：四个数一起变。它们互相依赖，放在一块显存里由一处代码写，就不会出现“改了一个、忘了另一个”。',
      ],
    },
  });

  Viz.register('kernel-launch', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a2)', text: T.lgCpu },
        { color: 'var(--accent)', text: T.lgGpu, glow: true },
        { color: 'var(--side)', text: T.lgIdle },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const W = 360, X0 = 46, X1 = 354;   // ~300 px wide on a phone: 12-unit text stays >= 10 px
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} 276`, class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const groups = [];
      T.rows.forEach((name, r) => {
        const y = 10 + r * 88;
        Viz.svg('text', { x: 0, y: y + 12, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = name;
        ['cpu', 'gpu'].forEach((lane, j) => {
          const ly = y + 22 + j * 26;
          Viz.svg('text', { x: 0, y: ly + 14, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = T[lane];
          Viz.svg('rect', { x: X0, y: ly, width: X1 - X0, height: 18, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        });
        groups.push({ y, g: Viz.svg('g', {}, svg), end: Viz.svg('text', { x: X1, y: y + 12, 'font-size': 12, 'text-anchor': 'end', style: 'fill:var(--ink)' }, svg) });
      });
      const cursor = Viz.svg('path', { d: '', style: 'stroke:var(--a3);stroke-width:1.5;fill:none' }, svg);
      const slider = (label, min, max, val) => `<div class="viz-slider"><label>${label}</label><input type="range" min="${min}" max="${max}" value="${val}" aria-label="${Viz.esc(label)}"><output></output></div>`;
      left.insertAdjacentHTML('beforeend', slider(T.nLabel, 1, 96, 45) + slider(T.wLabel, 1, 60, 5) + slider(T.lLabel, 5, 40, 20) + slider(T.gLabel, 1, 8, 3) +
        `<div class="viz-row">${Viz.button(T.bPlay)}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = Viz.stat({ id: 'k-dir', k: T.sDirK, v: '', f: '' }) + Viz.stat({ id: 'k-fus', k: T.sFusK, v: '', f: '' }) + Viz.stat({ id: 'k-gra', k: T.sGraK, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict" hidden></div>` + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const ranges = el.querySelectorAll('input[type=range]'), outs = el.querySelectorAll('.viz-slider output');
      const [playBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const verdict = $('.viz-verdict');
      let runs = [], scale = 1, busy = false;

      function read() { return { n: +ranges[0].value, w: +ranges[1].value, L: +ranges[2].value, g: +ranges[3].value }; }
      function compute() {
        const p = read();
        outs[0].textContent = T.nOut(p.n); outs[1].textContent = T.us(p.w); outs[2].textContent = T.us(p.L); outs[3].textContent = T.gOut(p.g);
        runs = [M.direct(p.n, p.w, p.L), M.fused(p.n, p.w, p.L, p.g), M.graph(p.n, p.w, p.L)];
        scale = (X1 - X0) / Math.max(...runs.map(r => r.total));
        const pct = r => Math.round(r.busyRatio * 100);
        $('[data-s=k-dir-v]').textContent = Viz.fmt(runs[0].total) + ' µs';
        $('[data-s=k-dir-f]').innerHTML = T.sDirF(p.n, p.L, p.w, pct(runs[0]));
        $('[data-s=k-fus-v]').textContent = Viz.fmt(runs[1].total) + ' µs';
        $('[data-s=k-fus-f]').innerHTML = T.sFusF(runs[1].launches, p.g, pct(runs[1]));
        $('[data-s=k-gra-v]').textContent = Viz.fmt(runs[2].total) + ' µs';
        $('[data-s=k-gra-f]').innerHTML = T.sGraF(pct(runs[2]));
        return p;
      }
      // Draws every bar clipped to simulated time t (Infinity = final state).
      function draw(t) {
        runs.forEach((run, r) => {
          const { y, g, end } = groups[r];
          g.innerHTML = '';
          const cpuY = y + 22, gpuY = y + 48, seen = new Set();
          run.kernels.forEach(k => {
            const key = k.submitStart + ':' + k.submitEnd;
            if (!seen.has(key) && t > k.submitStart) {
              seen.add(key);
              const w = (Math.min(t, k.submitEnd) - k.submitStart) * scale;
              Viz.svg('rect', { x: X0 + k.submitStart * scale, y: cpuY + 2, width: Math.max(0, w - (run.launches > 1 ? 0.6 : 0)), height: 14, style: 'fill:var(--a2)' }, g);
            }
            if (t > k.start) Viz.svg('rect', { x: X0 + k.start * scale, y: gpuY + 2, width: Math.max(0.6, (Math.min(t, k.end) - k.start) * scale - 0.4), height: 14, style: 'fill:var(--accent)' }, g);
          });
          end.textContent = t >= run.total ? Viz.fmt(run.total) + ' µs' : '';
        });
        cursor.setAttribute('d', Number.isFinite(t) ? `M${X0 + t * scale} 6V272` : '');
      }
      function settle() { verdict.hidden = true; compute(); draw(Infinity); }
      ranges.forEach(r => { r.oninput = () => { if (!busy) settle(); }; });
      playBtn.onclick = async () => {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = true; });
        const p = compute(); verdict.hidden = true;
        term.log(T.tPlay);
        const end = Math.max(...runs.map(r => r.total)), logged = [false, false, false], pct = r => Math.round(r.busyRatio * 100);
        const lines = [() => T.tDir(p.n, p.L, p.w, Viz.fmt(runs[0].total), pct(runs[0])), () => T.tFus(runs[1].launches, Viz.fmt(runs[1].total), pct(runs[1])), () => T.tGra(Viz.fmt(runs[2].total), pct(runs[2]))];
        const order = runs.map((r, i) => i).sort((a, b) => runs[a].total - runs[b].total);
        try {
          const t0 = performance.now(), dur = ctx.reduced ? 0 : 2600;
          await new Promise(resolve => {
            const tick = now => {
              const t = dur ? Math.min(1, (now - t0) / dur) * end : end;
              draw(t);
              order.forEach(i => { if (!logged[i] && t >= runs[i].total) { logged[i] = true; term.log(lines[i]()); } });
              if (t < end) ctx.raf(tick); else resolve();
            };
            ctx.raf(tick);
          });
          const x = (runs[0].total / runs[2].total).toFixed(1);
          verdict.innerHTML = p.w < p.L ? T.vLaunch(x) : T.vCompute(Math.round((1 - runs[2].total / runs[0].total) * 100));
          verdict.hidden = false; draw(Infinity);
        } finally {
          busy = false;
          if (ctx.alive) el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = false; });
        }
      };
      resetBtn.onclick = () => {
        if (busy) return;
        [45, 5, 20, 3].forEach((v, i) => { ranges[i].value = v; });
        term.clear(); term.log(T.ready); settle();
      };
      settle();
    },
  });

  Viz.register('graph-freeze', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.fCode, title: T.fTitle, tag: T.fTag, intro: T.fIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.fLgCell },
        { color: 'var(--accent)', text: T.fLgNew, glow: true },
        { color: 'var(--a2)', text: T.fLgOld },
      ]));
      body.insertAdjacentHTML('beforeend', `<div class="viz-row" style="margin:0 0 14px">${Viz.button(T.modes[0], 'alt')}${Viz.button(T.modes[1], 'ghost')}</div>`);
      const pipe = Viz.pipe(body, T.fSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 200', class: 'viz-stage', role: 'img', 'aria-label': T.cellsLabel }, left);
      Viz.svg('text', { x: 0, y: 16, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = T.kvTitle;
      const cells = [], labels = [];
      for (let i = 0; i < 8; i++) {
        const x = i * 44 + 4;
        cells.push(Viz.svg('rect', { x, y: 28, width: 40, height: 46, class: 'viz-cell' }, svg));
        labels.push(Viz.svg('text', { x: x + 20, y: 57, 'font-size': 14, 'text-anchor': 'middle', style: 'fill:var(--paper);font-weight:700' }, svg));
        Viz.svg('text', { x: x + 20, y: 92, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = String(i);
      }
      Viz.svg('text', { x: 0, y: 132, 'font-size': 13, style: 'fill:var(--ink);font-weight:600' }, svg).textContent = T.stepTitle;
      const stepVals = T.stepNames.map((name, i) => {
        const x = i * 88 + 4;
        Viz.svg('rect', { x, y: 142, width: 84, height: 52, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        Viz.svg('text', { x: x + 42, y: 162, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg).textContent = name;
        return Viz.svg('text', { x: x + 42, y: 186, 'font-size': 16, 'text-anchor': 'middle', style: 'fill:var(--accent);font-weight:700' }, svg);
      });
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.fReady);
      right.innerHTML = Viz.stat({ id: 'f-true', k: T.sTrueK, v: '—', f: T.sTrueF }) + Viz.stat({ id: 'f-seen', k: T.sSeenK, v: '—', f: '', hot: true }) + Viz.stat({ id: 'f-nkv', k: T.sNkvK, v: '—', f: T.sNkvF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.fTry));
      const $ = s => el.querySelector(s);
      const [badBtn, goodBtn, stepBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const verdict = $('.viz-verdict');
      let frozen = true, token = 0, phase = 0, kv = Array(8).fill(null), fresh = -1;

      function paint() {
        kv.forEach((v, i) => {
          cells[i].setAttribute('class', 'viz-cell' + (i === fresh ? ' pick' : v !== null ? ' score' : ''));
          labels[i].textContent = v === null ? '' : 't' + v;
        });
      }
      function showStep(pos) { const s = pos === null ? ['—', '—', '—', '—'] : M.stepBuffer(pos); stepVals.forEach((t, i) => { t.textContent = s[i]; }); }
      function setMode(f) {
        frozen = f;
        badBtn.className = 'viz-btn ' + (f ? 'alt' : 'ghost');
        goodBtn.className = 'viz-btn ' + (f ? 'ghost' : 'alt');
        reset();
      }
      function reset() {
        token = 0; phase = 0; kv = Array(8).fill(null); fresh = -1;
        pipe.set(-1); paint(); showStep(null); verdict.hidden = true;
        term.clear(); term.log(T.fReady);
        $('[data-s=f-true-v]').textContent = '—'; $('[data-s=f-seen-v]').textContent = '—'; $('[data-s=f-nkv-v]').textContent = '—';
        $('[data-s=f-seen-f]').innerHTML = T.sSeenF(frozen);
      }
      function step() {
        if (token >= 8) reset();
        const pos = frozen ? 0 : token;
        pipe.set(phase);
        if (phase === 0) {
          fresh = -1; paint(); showStep(pos);
          $('[data-s=f-true-v]').textContent = token; $('[data-s=f-seen-v]').textContent = pos;
          term.log(T.p0(token, frozen));
        }
        if (phase === 1) term.log(T.p1);
        if (phase === 2) { kv[pos] = token; fresh = pos; paint(); term.log(T.p2(pos)); }
        if (phase === 3) { const n = M.stepBuffer(pos)[1]; $('[data-s=f-nkv-v]').textContent = n; term.log(T.p3(n)); }
        if (phase === 4) {
          term.log(T.p4(frozen));
          token++;
          if (token === 4) { verdict.innerHTML = frozen ? T.fVerdictBad : T.fVerdictGood; verdict.hidden = false; }
        }
        phase = (phase + 1) % 5;
      }
      badBtn.onclick = () => setMode(true);
      goodBtn.onclick = () => setMode(false);
      stepBtn.onclick = step;
      resetBtn.onclick = reset;
      setMode(true);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
