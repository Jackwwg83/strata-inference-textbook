/* DeepSeek column, page 5.2: how many drafts enter the verify window, and what that does to the words per round.
   All visible text lives in T (zh is the master; translators add the other languages). Nothing here animates,
   so prefers-reduced-motion needs no special path: every control redraws the final state at once. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsDraftWindow;

  const T = Viz.t({
    zh: {
      code: 'DRAFT_WINDOW', title: '验几个草稿：两道门槛怎么裁窗口', tag: '教学推演 · 置信度是教学数字，不是实测',
      intro: '草稿模型一轮给出 5 个草稿和 5 个置信度。引擎从第 1 个数起：某个草稿的置信度低于<b>下限</b>，或者前面各草稿置信度的<b>连乘</b>低于连乘门槛，就在这里停，后面的整条丢掉。留下 k 个草稿，窗口就有 k + 1 行，每轮期望吐出 <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b> 个字。拖四个旋钮，看三种裁法各验几个、各吐几个字。把置信度当成条件接受率，是本页的教学假设，引擎没有测过。',
      lgFloor: '再加连乘后仍验的草稿', lgCum: '只设下限时多验的草稿', lgNone: '不裁剪时才验的草稿',
      chartLabel: (c, k1, k2, k3) => `五个草稿的置信度：${c}。不裁剪验 ${k1} 个；只设下限验 ${k2} 个；再加连乘门槛验 ${k3} 个`,
      floorLine: (v) => `下限 ${v}`,
      draft: (j) => `草稿 ${j}`, rowConf: '置信度', rowCum: '连乘', rowFloor: '只设下限', rowBoth: '再加连乘',
      yes: '验', stop: '停', none: '—',
      dLabel: '每轮草稿数', sLabel: '接受率', fLabel: '下限', cLabel: '连乘门槛',
      dOut: (v) => `${v} 个`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? '关' : v), cOut: (v) => (v === 0 ? '关' : v),
      sNone: '不裁剪', sFloor: '只设下限', sBoth: '再加连乘',
      sK: (name) => name,
      sV: (k, w) => `验 ${k} 个 · ${w} 字`,
      sF: (k, w, c) => `<b>窗口 ${k + 1} 行</b><br>= 1 + ${c}<br>≈ ${w} 个字 / 轮`,
      sFnone: '<b>窗口 1 行</b><br>= 1<br>没有草稿进窗口，和不猜一样多',
      vNormal: (dr, dw) => `① 连乘门槛比只设下限多砍 <b>${dr}</b> 行，期望少 <b>${dw}</b> 个字。<br>② 少验的那几行，省下多少成本，因机器而异：RDNA4 上值得，CUDA 上持平，所以连乘门槛默认值不同（0.5 或 0）。<br>③ 上游只给最后的 token/s，不给每轮的字数；这里的字数是教学推演。`,
      vSame: '① 两道门槛这次裁出同样多的草稿，连乘门槛没有额外作用。<br>② 试试调高连乘门槛，或者调低接受率，看它什么时候开始多砍。<br>③ 上游只给最后的 token/s，不给每轮的字数；这里的字数是教学推演。',
      vZero: '① 没有一个草稿过得了门槛：引擎照常走一个普通解码步，并让下一轮不起草（一轮白起草，下一轮就歇着）。<br>② 每轮只吐 1 个字，和不猜一样多，但起草的耗时已经花掉了。<br>③ 门槛太严，等于白起草。',
      try: [
        '保持默认（5 个草稿、接受率 100%、下限 0.5、连乘 0.5）：不裁剪验 5 个，期望 2.62 个字；只设下限验 2 个，2.30 个字；再加连乘验 1 个，1.80 个字。这是页上图 DS5-2 的数字。',
        '把连乘门槛拉到 <b>0.4</b>：草稿 2 的连乘 0.496 过关，连乘门槛不再多砍，两行结果一样。再拉回 0.5，它又差一点点被拦下。',
        '把接受率拉到 <b>60%</b>、再拉到 <b>120%</b>：置信度整体变低或变高，三种裁法验的个数和期望的字数一起变。接受率低时，两道门槛几乎把窗口砍光。',
      ],
    },
  });

  const f2 = (x) => x.toFixed(2);
  const f3 = (x) => x.toFixed(3);
  const NEXT = M.BLOCK;

  Viz.register('ds-draft-window', {
    mount(el, ctx) {
      void ctx;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgFloor, glow: true },
        { color: 'var(--a2)', text: T.lgCum },
        { color: 'var(--side)', text: T.lgNone },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const slider = (id, label, min, max, step, val) =>
        `<div class="viz-slider"><label for="dw-${id}">${label}</label><input id="dw-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"><output for="dw-${id}"></output></div>`;

      // Chart: 360 wide so 12px text stays readable on a phone. Bars baseline y = 130, full height 90 (confidence 1).
      const W = 360, X0 = 64, CW = 58, BASE = 130, HMAX = 90;
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} 262`, class: 'viz-stage', role: 'img' }, left);
      const text = (x, y, anchor, cls, parent) => Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': anchor, style: `fill:var(--${cls})` }, parent || svg);
      const bars = [], names = [], confT = [], cumT = [], rowF = [], rowB = [];
      for (let j = 0; j < NEXT; j++) {
        const cx = X0 + j * CW + CW / 2;
        bars.push(Viz.svg('rect', { x: cx - 18, width: 36, rx: 2, stroke: 'var(--muted)', 'stroke-width': 1 }, svg));
        names.push(text(cx, BASE + 18, 'middle', 'ink')); names[j].textContent = T.draft(j + 1);
        confT.push(text(cx, BASE + 38, 'middle', 'ink'));
        cumT.push(text(cx, BASE + 58, 'middle', 'ink'));
        rowF.push(text(cx, BASE + 82, 'middle', 'ink'));
        rowB.push(text(cx, BASE + 102, 'middle', 'ink'));
      }
      [[BASE + 38, T.rowConf], [BASE + 58, T.rowCum], [BASE + 82, T.rowFloor], [BASE + 102, T.rowBoth]].forEach(([y, s]) => { text(2, y, 'start', 'muted').textContent = s; });
      const line = Viz.svg('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }, svg);
      const lineLab = text(2, 0, 'start', 'muted');

      left.insertAdjacentHTML('beforeend',
        slider('d', T.dLabel, 1, NEXT, 1, M.DEFAULTS.depth) + slider('s', T.sLabel, 40, 120, 5, M.DEFAULTS.scale * 100) +
        slider('f', T.fLabel, 0, 0.9, 0.05, M.DEFAULTS.floor) + slider('c', T.cLabel, 0, 0.9, 0.05, M.DEFAULTS.cum));
      right.innerHTML = Viz.stat({ id: 'n', k: T.sNone, v: '', f: '' }) + Viz.stat({ id: 'f', k: T.sFloor, v: '', f: '' }) + Viz.stat({ id: 'b', k: T.sBoth, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.try));
      const $ = (s) => el.querySelector(s);
      const [dR, sR, fR, cR] = left.querySelectorAll('input[type=range]');

      function draw() {
        const depth = +dR.value, scale = +sR.value / 100, floor = +fR.value, cum = +cR.value;
        dR.nextElementSibling.textContent = T.dOut(depth); sR.nextElementSibling.textContent = T.sOut(Math.round(scale * 100));
        fR.nextElementSibling.textContent = floor === 0 ? T.fOut(0) : T.fOut(floor.toFixed(2));
        cR.nextElementSibling.textContent = cum === 0 ? T.cOut(0) : T.cOut(cum.toFixed(2));
        const conf = M.scaleConf(M.PRESET_CONF, scale), run = M.cumulative(conf);
        const r = M.threeCuts(conf, { floor, cum, depth });
        const mark = (k, j) => (j < k ? T.yes : j === k && j < Math.min(depth, NEXT) ? T.stop : T.none);
        for (let j = 0; j < NEXT; j++) {
          const h = conf[j] * HMAX, inBoth = j < r.both.k, inFloor = j < r.floor.k, inNone = j < r.none.k;
          bars[j].setAttribute('y', BASE - h); bars[j].setAttribute('height', h);
          bars[j].style.fill = inBoth ? 'var(--accent)' : inFloor ? 'var(--a2)' : 'var(--side)';
          bars[j].style.opacity = inNone ? '1' : '0.45';
          confT[j].textContent = f2(conf[j]); cumT[j].textContent = f3(run[j]);
          [[rowF[j], r.floor.k], [rowB[j], r.both.k]].forEach(([t, k]) => { const s = mark(k, j); t.textContent = s; t.style.fill = s === T.none ? 'var(--muted)' : 'var(--ink)'; });
        }
        const ly = BASE - floor * HMAX;
        line.setAttribute('d', floor > 0 ? `M${X0 - 6} ${ly} H${X0 + NEXT * CW}` : '');
        lineLab.textContent = floor > 0 ? T.floorLine(f2(floor)) : '';
        lineLab.setAttribute('y', Math.max(12, ly - 4));
        svg.setAttribute('aria-label', T.chartLabel(conf.map(f2).join('、'), r.none.k, r.floor.k, r.both.k));
        [['n', r.none], ['f', r.floor], ['b', r.both]].forEach(([id, c]) => {
          $(`[data-s=${id}-v]`).textContent = T.sV(c.k, f2(c.words));
          $(`[data-s=${id}-f]`).innerHTML = c.k === 0 ? T.sFnone : T.sF(c.k, f2(c.words), run.slice(0, c.k).map(f3).join(' + '));
        });
        const v = $('.viz-verdict');
        if (r.both.k === 0) v.innerHTML = T.vZero;
        else if (r.both.k === r.floor.k) v.innerHTML = T.vSame;
        else v.innerHTML = T.vNormal(r.floor.rows - r.both.rows, f2(r.floor.words - r.both.words));
      }
      [dR, sR, fR, cR].forEach(i => { i.oninput = draw; });
      draw();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
