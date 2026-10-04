/* Interactive figure framework.
   A chapter places <div class="viz" data-viz="NAME">static fallback</div>.
   Viz.mountAll(container) replaces each fallback with the registered widget.
   Widgets get a context whose timers stop automatically when the page changes. */
(function (root) {
  'use strict';
  const registry = Object.create(null);
  const NS = 'http://www.w3.org/2000/svg';
  // Shared widget chrome strings.
  const UI = { zh: { tryTitle: '试试看', verdict: '结论' }, en: { tryTitle: 'Try it', verdict: 'Takeaway' } };
  const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function context(el) {
    const timers = new Set(), frames = new Set();
    let alive = true;
    return {
      el,
      get alive() { return alive; },
      reduced: reduced(),
      timeout(fn, ms) { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; },
      interval(fn, ms) { const id = setInterval(() => alive && fn(), ms); timers.add(id); return id; },
      raf(fn) { const id = requestAnimationFrame(t => { frames.delete(id); if (alive) fn(t); }); frames.add(id); return id; },
      // Resolves after ms (0 with reduced motion); rejects once the widget is gone so loops stop.
      sleep(ms) { return new Promise((res, rej) => { if (!alive) return rej(new Error('disposed')); const id = setTimeout(() => { timers.delete(id); alive ? res() : rej(new Error('disposed')); }, reduced() ? 0 : ms); timers.add(id); }); },
      dispose() { alive = false; timers.forEach(id => { clearTimeout(id); clearInterval(id); }); frames.forEach(id => cancelAnimationFrame(id)); timers.clear(); frames.clear(); },
    };
  }

  // Page language: zh (default), en, ja, ko, es, ar. Taken from <html lang>.
  const LANGS = ['zh', 'en', 'ja', 'ko', 'es', 'ar'];
  const pageLang = () => { const l = (root.document && document.documentElement.lang || 'zh').slice(0, 2).toLowerCase(); return LANGS.includes(l) ? l : 'zh'; };

  const Viz = {
    esc,
    LANGS,
    get lang() { return pageLang(); },
    // Picks the string table for the page language, falling back to Chinese key by key.
    t(tables) { const base = tables.zh || {}, cur = tables[pageLang()] || {}; return new Proxy(cur, { get: (o, k) => (k in o ? o[k] : base[k]) }); },
    register(name, def) {
      if (!def || typeof def.mount !== 'function') throw new Error('Viz.register needs a mount function: ' + name);
      registry[name] = def;
    },
    has(name) { return name in registry; },
    names() { return Object.keys(registry).sort(); },
    // Mounts every widget in container. Returns a function that disposes all of them.
    mountAll(container) {
      const ctxs = [];
      container.querySelectorAll('.viz[data-viz]').forEach(el => {
        const def = registry[el.dataset.viz];
        if (!def) return;
        const ctx = context(el);
        try {
          el.innerHTML = '';
          el.classList.add('viz-live');
          const cleanup = def.mount(el, ctx);
          if (typeof cleanup === 'function') ctx.cleanup = cleanup;
          ctxs.push(ctx);
        } catch (err) {
          ctx.dispose();
          el.innerHTML = '<p class="hint">viz error: ' + esc(err.message) + '</p>';
          if (root.console) console.error('viz ' + el.dataset.viz, err);
        }
      });
      return () => ctxs.forEach(c => { try { c.cleanup && c.cleanup(); } catch (e) { /* ignore */ } c.dispose(); });
    },

    /* ---------- building blocks ---------- */
    // Outer frame with the module bar. Returns the body element to fill.
    frame(el, { code, title, tag, intro }) {
      el.insertAdjacentHTML('beforeend', `<div class="viz-frame"><div class="viz-bar"><b>${esc(code)} // ${esc(title)}</b><span class="tag">${esc(tag || '教学推演')}</span></div><div class="viz-body">${intro ? `<p class="viz-intro">${intro}</p>` : ''}</div></div>`);
      return el.querySelector('.viz-body');
    },
    // items: [{ color: CSS color or var(), text, glow }]
    legend(items) {
      return `<div class="viz-legend">${items.map(i => `<span><i class="viz-sw" style="background:${i.color};${i.glow ? 'box-shadow:var(--glow);border-color:' + i.color : ''}"></i>${i.text}</span>`).join('')}</div>`;
    },
    // Step strip. Returns { el, set(i) }: steps before i are done, i is current.
    pipe(parent, steps) {
      const el = document.createElement('div');
      el.className = 'viz-pipe';
      el.innerHTML = steps.map((s, i) => `<div><small>${String(i + 1).padStart(2, '0')}</small>${esc(s)}</div>`).join('');
      parent.appendChild(el);
      const cells = [...el.children];
      return { el, set(n) { cells.forEach((c, i) => { c.classList.toggle('on', i === n); c.classList.toggle('done', i < n); }); } };
    },
    // Terminal log. html may use <span class="c|m|y|w">.
    term(parent, first) {
      const el = document.createElement('div');
      el.className = 'viz-term';
      el.setAttribute('aria-live', 'polite');
      parent.appendChild(el);
      const api = {
        el,
        log(html) { el.querySelector('.cur')?.remove(); const p = document.createElement('p'); p.innerHTML = html + ' <span class="cur"></span>'; el.appendChild(p); el.scrollTop = el.scrollHeight; },
        clear() { el.innerHTML = ''; },
      };
      if (first) api.log(first);
      return api;
    },
    // Stat card with a formula line. Update it later through el.querySelector('[data-s=ID-v]') / '[data-s=ID-f]'.
    stat({ id, k, v, f, hot }) {
      return `<div class="viz-stat${hot ? ' hot' : ''}"><div class="k">${k}</div><div class="v" data-s="${id}-v">${v}</div><div class="f" data-s="${id}-f">${f}</div></div>`;
    },
    tryList(items, title) { return `<div class="viz-try"><h4>&gt; ${esc(title || Viz.t(UI).tryTitle)}</h4><ol>${items.map(i => `<li>${i}</li>`).join('')}</ol></div>`; },
    button(label, cls) { return `<button type="button" class="viz-btn${cls ? ' ' + cls : ''}">${esc(label)}</button>`; },
    svg(tag, attrs, parent) {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    },
    // Current value of a CSS custom property, for canvas or SVG fills that must follow the theme.
    color(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); },
    fmt(n, digits = 0) { return Number(n).toLocaleString(pageLang() === 'zh' ? 'zh-CN' : pageLang(), { maximumFractionDigits: digits, minimumFractionDigits: digits }); },
  };

  root.Viz = Viz;
  if (typeof module !== 'undefined' && module.exports) module.exports = Viz;
})(typeof globalThis !== 'undefined' ? globalThis : this);
