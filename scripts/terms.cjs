'use strict';
// Key terms get a small hover/tap explanation. At build time:
//  - tagDfns gives each <dfn> its term key (the k-th dfn of a translation has the same key as the k-th dfn
//    of the Chinese master, so translations need no extra markup);
//  - tagFirstUses marks the first plain use of each term in a chapter, so a reader who jumps into a later
//    chapter still gets the explanation. Headings, code, links, SVG and existing marks are left alone.
const strip = s => s.replace(/<[^>]+>/g, '').trim();

function dfnTexts(html) {
  return [...html.matchAll(/<dfn\b[^>]*>([\s\S]*?)<\/dfn>/g)].map(m => strip(m[1]));
}

function tagDfns(html, keys) {
  let i = 0;
  return html.replace(/<dfn\b([^>]*)>/g, (tag, attrs) => {
    const key = keys[i++];
    if (!key || /data-term=/.test(attrs)) return tag;
    return `<dfn${attrs} data-term="${key}" tabindex="0">`;
  });
}

const SKIP = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'a', 'svg', 'dfn', 'script', 'style', 'kbd']);
const CJK = new Set(['zh', 'ja', 'ko']);

function tagFirstUses(html, surfaces, lang) {
  // Keys the chapter defines itself are explained at their dfn already.
  const defined = new Set([...html.matchAll(/<dfn\b[^>]*data-term="([^"]+)"/g)].map(m => m[1]));
  const dfnText = new Set(dfnTexts(html));
  // Very short surfaces (页, 键, K, V) would match inside other words; they keep their dfn popover only.
  const minLen = 2;
  const list = surfaces.filter(([s, k]) => s && [...s].length >= minLen && !defined.has(k) && !dfnText.has(s)).sort((a, b) => b[0].length - a[0].length);
  const used = new Set();
  const boundary = !CJK.has(lang);
  const isWordChar = c => !!c && /[\p{L}\p{N}]/u.test(c);
  const parts = html.split(/(<[^>]+>)/);
  const stack = [];
  return parts.map(part => {
    if (part.startsWith('<')) {
      const m = /^<(\/?)\s*([a-zA-Z0-9]+)/.exec(part);
      if (m) {
        const name = m[2].toLowerCase();
        const isTerm = name === 'span' && /class="term-ref"/.test(part);
        if (m[1]) { if (stack.length && stack[stack.length - 1].name === name) stack.pop(); }
        else if (!/\/>$/.test(part) && !['br', 'img', 'input', 'hr', 'wbr'].includes(name)) stack.push({ name, skip: SKIP.has(name) || isTerm });
      }
      return part;
    }
    if (!part.trim() || stack.some(x => x.skip)) return part;
    let out = '', rest = part;
    for (;;) {
      let best = null;
      const lower = boundary ? rest.toLowerCase() : rest;
      for (const [s, k] of list) {
        if (used.has(k)) continue;
        const needle = boundary ? s.toLowerCase() : s;
        let from = 0, at;
        while ((at = lower.indexOf(needle, from)) !== -1) {
          if (!boundary || (!isWordChar(rest[at - 1]) && !isWordChar(rest[at + s.length]))) break;
          from = at + 1;
        }
        if (at === -1) continue;
        if (!best || at < best.at || (at === best.at && s.length > best.len)) best = { at, len: s.length, key: k };
      }
      if (!best) { out += rest; break; }
      used.add(best.key);
      out += rest.slice(0, best.at) + `<span class="term-ref" data-term="${best.key}" tabindex="0">${rest.slice(best.at, best.at + best.len)}</span>`;
      rest = rest.slice(best.at + best.len);
    }
    return out;
  }).join('');
}

module.exports = { dfnTexts, tagDfns, tagFirstUses };
