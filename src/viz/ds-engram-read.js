/* DeepSeek column, page engram, section 4.5: the upper bound on words per second for a chosen SSD read speed and
   MB read per word, with the measured Mac points marked. Static, no animation, so reduced motion needs nothing extra
   (ctx.reduced is respected by never starting a timer). All visible text lives in T (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsEngramRead;

  const T = Viz.t({
    zh: {
      code: 'ENGRAM_READ', title: '字速上限：读速 ÷ 每字读盘量', tag: '教学推演 · 实测点来自 Mac 文档',
      intro: '一个字要从盘里读多少 MB，一秒钟盘能读多少 MB，两者相除就是每秒最多写几个字。<b>拖动读速和每字 MB</b>，看上限怎么变。两条彩色线是 Mac 文档里的两套模型包，圆点是它们的实测字速。实测点远在线下面，说明字速不由读速单独决定。',
      lg48: '每字 48 MB（2.00 套装）', lg111: '每字 111 MB（2.25 套装）', lgMeas: '圆点：Mac 实测字速', lgCustom: '细线：你选的每字 MB',
      figLabel: '字速上限等于 SSD 读速除以每字读盘量。横轴是读速，竖轴是字速上限，圆点是 Mac 实测。',
      top48: '每字读 48 MB（2.00 套装）：实测约 15.6 字/秒（实心点）',
      top111: '每字读 111 MB（2.25 套装）：实测约 15.0 字/秒（空心点）',
      topDash: (g, a, b) => `虚线：${g} GB/s 时的上限，分别是 ${a} 和 ${b} 字/秒`,
      axisX: 'SSD 读速（GB/s）', axisY: '上限（字/秒）',
      sGbps: 'SSD 读速', sMb: '每字读盘量', outGbps: (v) => `${v} GB/s`, outMb: (v) => `${v} MB`,
      bp48: '用 48 MB', bp111: '用 111 MB', pressed: '当前选择',
      sBoundK: '你选的字速上限', sBoundF: (g, mb) => `<b>= ${g} GB/s × 1000 ÷ ${mb} MB</b><br>1 GB 按 1000 MB 算`,
      sNeedK: 'Mac 实测要求的读速', sNeedV: (a, b) => `${a} / ${b} GB/s`, sNeedF: '<b>= 字速 × 每字 MB ÷ 1000</b><br>15.6 × 48，15.0 × 111',
      sRoomK: '上限是实测的几倍', sRoomV: (a, b) => `${a}× / ${b}×`, sRoomF: (g) => `<b>= 上限 ÷ 实测字速</b><br>读速 ${g} GB/s，48 MB / 111 MB 两套`,
      vOk: (g, a, b) => `① 读速 ${g} GB/s 时，两套的上限是 <b>${a}</b> 和 <b>${b}</b> 字/秒，都高于实测的 15.6 和 15.0。读盘不是唯一的限制。<br>② 每字 MB 不变，读速翻倍，上限也翻倍；读速不变，每字 MB 翻倍，上限减半。<br>③ 这是上限。专家还要在 CPU 上算，真实字速更低。`,
      vLow48: (g, a) => `① 读速 ${g} GB/s 时，48 MB 那套的上限只有 <b>${a}</b> 字/秒，低于实测的 15.6：盘慢到这个程度，读盘本身就是瓶颈。`,
      vLow111: (g, b) => `① 读速 ${g} GB/s 时，111 MB 那套的上限只有 <b>${b}</b> 字/秒，低于实测的 15.0：这套每字读得多，先被盘卡住。`,
      vLowBoth: (g, a, b) => `① 读速 ${g} GB/s 时，两套的上限只有 <b>${a}</b> 和 <b>${b}</b> 字/秒，都低于实测的 15.6 和 15.0：盘慢到这个程度，读盘本身就是瓶颈。`,
      vTail: '<br>② 实测点对应的读速是 0.75 和 1.67 GB/s：只要盘比这快，读速就不再单独决定字速。<br>③ 读速要按你的读法取值：专家是大块读，接近顺序读；Engram 是小块随机读，吞吐低得多。',
      tryList: [
        '保持默认 3.6 GB/s、48 MB：上限 75 字/秒，是实测 15.6 的近 5 倍。这就是“盘不是唯一的限制”。',
        '把读速拖到 <b>0.7 GB/s</b>：48 MB 那套的上限掉到约 15 字/秒，贴住实测点。再往下，读盘就成了瓶颈。',
        '点“用 111 MB”，再把读速拖到 <b>1.6 GB/s</b>：上限约 14 字/秒，刚好够不到实测的 15.0。每字读得越多，对盘的要求越高。',
      ],
    },
  });

  const f1 = v => Viz.fmt(v, 1), f0 = v => Viz.fmt(v, 0), f2 = v => Viz.fmt(v, 2);
  const [P48, P111] = M.MEASURED;

  Viz.register('ds-engram-read', {
    mount(el) {
      const g = M.geometry, ax = M.axes, R = M.RANGES;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lg48 },
        { color: 'var(--a3)', text: T.lg111 },
        { color: 'var(--ink)', text: T.lgMeas },
        { color: 'var(--muted)', text: T.lgCustom },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 400 254', class: 'viz-stage', role: 'img', 'aria-label': T.figLabel }, left);
      const txt = (x, y, s, anchor, fill, parent) => { const t = Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': anchor, style: `fill:${fill || 'var(--muted)'}` }, parent || svg); t.textContent = s; return t; };
      const line = (d, stroke, w, extra, parent) => Viz.svg('path', Object.assign({ d, fill: 'none', style: `stroke:${stroke}`, 'stroke-width': w }, extra || {}), parent || svg);

      // Fixed parts: top captions, axes, ticks.
      const dyn = {};
      txt(12, 14, T.top48, 'start'); txt(12, 32, T.top111, 'start');
      dyn.dashNote = txt(12, 50, '', 'start');
      line(`M${g.x(0)} ${g.y(ax.yMax)}V${g.y(0)}H${g.x(ax.xMax)}`, 'var(--muted)', 1.2);
      for (let k = 0; k <= ax.xMax; k++) txt(g.x(k), 228, String(k), 'middle');
      txt(g.x(2), 246, T.axisX, 'middle');
      [0, 25, 50, 75].forEach(w => txt(42, g.y(w) + 4, String(w), 'end'));
      txt(g.x(0) + 8, g.y(ax.yMax) + 8, T.axisY, 'start');

      // Lines: custom (thin) first so the two pack lines sit on top.
      const pathFor = mb => { const [a, b] = M.curve(mb); return `M${g.x(a.gbps).toFixed(1)} ${g.y(a.wps).toFixed(1)}L${g.x(b.gbps).toFixed(1)} ${g.y(b.wps).toFixed(1)}`; };
      dyn.custom = line('', 'var(--muted)', 1.5, { opacity: 0.9 });
      line(pathFor(P48.mb), 'var(--accent)', 2);
      line(pathFor(P111.mb), 'var(--a3)', 2);
      dyn.vline = line('', 'var(--muted)', 1, { 'stroke-dasharray': '3 3' });
      const dot = (fill, stroke, r) => Viz.svg('circle', { r, style: `fill:${fill};stroke:${stroke}`, 'stroke-width': stroke === 'none' ? 0 : 2 }, svg);
      dyn.d48 = dot('var(--accent)', 'none', 3); dyn.d111 = dot('var(--a3)', 'none', 3); dyn.dc = dot('var(--muted)', 'none', 3);
      dyn.l48 = txt(0, 0, '', 'end'); dyn.l111 = txt(0, 0, '', 'end');
      // Measured Mac points: x = the read speed they need at least, y = measured words/s.
      [[P48, 'var(--accent)', 'var(--accent)', 'end'], [P111, 'var(--paper)', 'var(--a3)', 'middle']].forEach(([p, fill, stroke, anchor], i) => {
        const x = g.x(M.requiredRead(p.tps, p.mb)), y = g.y(p.tps);
        const c = Viz.svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 5, style: `fill:${fill};stroke:${stroke}`, 'stroke-width': 2 }, svg);
        c.setAttribute('aria-hidden', 'true');
        txt(i === 0 ? x - 8 : x, y - (i === 0 ? 9 : 12), f2(M.requiredRead(p.tps, p.mb)), anchor, 'var(--muted)');
      });

      left.insertAdjacentHTML('beforeend', `
        <div class="viz-slider"><label for="der-g">${Viz.esc(T.sGbps)}</label><input id="der-g" type="range" min="${R.gbps.min}" max="${R.gbps.max}" step="${R.gbps.step}" value="${M.DEFAULTS.gbps}"><output for="der-g"></output></div>
        <div class="viz-slider"><label for="der-m">${Viz.esc(T.sMb)}</label><input id="der-m" type="range" min="${R.mb.min}" max="${R.mb.max}" step="${R.mb.step}" value="${M.DEFAULTS.mb}"><output for="der-m"></output></div>
        <div class="viz-row"><button type="button" class="viz-btn" data-mb="${P48.mb}" aria-pressed="false">${Viz.esc(T.bp48)}</button><button type="button" class="viz-btn" data-mb="${P111.mb}" aria-pressed="false">${Viz.esc(T.bp111)}</button></div>`);
      right.innerHTML = Viz.stat({ id: 'e-b', k: T.sBoundK, v: '', f: '', hot: true }) + Viz.stat({ id: 'e-n', k: T.sNeedK, v: T.sNeedV(f2(M.requiredRead(P48.tps, P48.mb)), f2(M.requiredRead(P111.tps, P111.mb))), f: T.sNeedF }) +
        Viz.stat({ id: 'e-r', k: T.sRoomK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.tryList));

      const $ = s => el.querySelector(s);
      const gIn = $('#der-g'), mIn = $('#der-m'), btns = [...left.querySelectorAll('button[data-mb]')];
      const setPos = (c, x, y) => { c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); };

      function draw() {
        const gb = M.clamp(+gIn.value, R.gbps.min, R.gbps.max), mb = M.clamp(+mIn.value, R.mb.min, R.mb.max);
        gIn.nextElementSibling.textContent = T.outGbps(f1(gb)); mIn.nextElementSibling.textContent = T.outMb(f0(mb));
        const l48 = M.upperBound(gb, P48.mb), l111 = M.upperBound(gb, P111.mb), lc = M.upperBound(gb, mb);
        const gx = g.x(gb), top = ax.yMax;
        dyn.vline.setAttribute('d', `M${gx.toFixed(1)} ${g.y(0)}V${g.y(top).toFixed(1)}`);
        dyn.dashNote.textContent = T.topDash(f1(gb), f0(l48), f0(l111));
        const preset = mb === P48.mb || mb === P111.mb;
        dyn.custom.setAttribute('d', preset ? '' : pathFor(mb));
        dyn.dc.setAttribute('visibility', preset ? 'hidden' : 'visible');
        setPos(dyn.d48, gx, g.y(Math.min(l48, top))); setPos(dyn.d111, gx, g.y(Math.min(l111, top))); setPos(dyn.dc, gx, g.y(Math.min(lc, top)));
        // Value labels sit left of the dashed line, or right of it when the line is near the axis.
        const nearAxis = gx < 100, ax2 = nearAxis ? gx + 8 : gx - 8, an = nearAxis ? 'start' : 'end';
        [[dyn.l48, l48, -8], [dyn.l111, l111, 16]].forEach(([t, l, dy]) => {
          t.setAttribute('x', ax2.toFixed(1)); t.setAttribute('text-anchor', an);
          t.setAttribute('y', Math.min(g.y(0) - 4, Math.max(g.y(top) + 10, g.y(Math.min(l, top)) + dy)).toFixed(1));
          t.textContent = f0(l);
        });
        btns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.mb === mb)));
        $('[data-s=e-b-v]').textContent = f1(lc) + ' / s';
        $('[data-s=e-b-f]').innerHTML = T.sBoundF(f1(gb), f0(mb));
        const r48 = l48 / P48.tps, r111 = l111 / P111.tps;
        $('[data-s=e-r-v]').textContent = T.sRoomV(f1(r48), f1(r111));
        $('[data-s=e-r-f]').innerHTML = T.sRoomF(f1(gb));
        const v = $('.viz-verdict'), lo48 = l48 < P48.tps, lo111 = l111 < P111.tps;
        v.innerHTML = (lo48 && lo111 ? T.vLowBoth(f1(gb), f0(l48), f0(l111)) : lo48 ? T.vLow48(f1(gb), f0(l48)) : lo111 ? T.vLow111(f1(gb), f0(l111)) : T.vOk(f1(gb), f0(l48), f0(l111))) + (lo48 || lo111 ? T.vTail : '');
      }
      gIn.oninput = draw; mIn.oninput = draw;
      btns.forEach(b => { b.onclick = () => { mIn.value = b.dataset.mb; draw(); }; });
      draw();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
