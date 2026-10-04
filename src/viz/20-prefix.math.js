/* Pure numbers behind the chapter 20 widgets. Teaching model, not Strata code.
   match() mirrors conversation_prefix() and the steering check in ConversationCache::best()
   (include/strata/core/conversation_cache.hpp at the pinned commit). branch() is a textbook
   copy-on-write page model; Strata does not share pages between conversations. */
(function (root) {
  'use strict';
  // 36 GDN layers × state (S, h_v, S) f32 with S = 128, h_v = 48 (layout.hpp, gdn.hpp).
  const GDN_STATE_BYTES = 36 * 128 * 48 * 128 * 4;
  const REASONS = ['hit', 'steering', 'empty', 'not-shorter', 'tokens', 'image'];

  // entry / req: { ids: number[], imgs: [{ start, hash }], cvec: boolean }
  function match(entry, req) {
    const prompt = req.ids, n = entry.ids.length;
    const miss = reason => ({ tokens: 0, tail: prompt.length, reason });
    if (entry.cvec !== req.cvec) return miss('steering');
    if (n === 0) return miss('empty');
    if (n >= prompt.length) return miss('not-shorter');
    for (let i = 0; i < n; i++) if (entry.ids[i] !== prompt[i]) return miss('tokens');
    let j = 0;
    for (const im of req.imgs) {
      if (im.start >= n) continue;
      const c = entry.imgs[j++];
      if (!c || c.start !== im.start || c.hash !== im.hash) return miss('image');
    }
    if (j !== entry.imgs.length) return miss('image');
    return { tokens: n, tail: prompt.length - n, reason: 'hit' };
  }

  function pages(tokens, page) {
    if (!Number.isInteger(tokens) || tokens < 0) throw new Error('token 数必须是非负整数');
    if (!Number.isInteger(page) || page < 1) throw new Error('每页 token 数必须是正整数');
    const full = Math.floor(tokens / page), rest = tokens % page, partial = rest ? 1 : 0;
    return { full, partial, total: full + partial, room: rest ? page - rest : 0 };
  }

  // Two branches A and B continue one prefix. mode 'copy': B copies every prefix page at the fork.
  // mode 'cow': both reference the prefix pages; the first write into a shared page copies it.
  function branch({ prefix, tailA, tailB, page, mode }) {
    if (mode !== 'copy' && mode !== 'cow') throw new Error('mode 只能是 copy 或 cow');
    const p = pages(prefix, page);
    pages(tailA, page); pages(tailB, page);
    const rest = prefix % page;
    const fresh = t => Math.ceil(Math.max(0, t - p.room) / page);
    const newA = fresh(tailA), newB = fresh(tailB);
    const tailPages = (t, first) => { const out = []; let left = Math.max(0, t - p.room); for (let i = 0; i < first; i++) { out.push({ tokens: Math.min(page, left), kind: 'own' }); left -= page; } return out; };
    const A = [], B = [];
    let copied = 0, shared = 0;
    if (mode === 'copy') {
      for (let i = 0; i < p.total; i++) {
        const tok = i < p.full ? page : rest;
        A.push({ tokens: tok + (i === p.full ? Math.min(tailA, p.room) : 0), kind: 'orig' });
        B.push({ tokens: tok + (i === p.full ? Math.min(tailB, p.room) : 0), kind: 'copied' });
      }
      copied = p.total;
    } else {
      for (let i = 0; i < p.full; i++) { A.push({ tokens: page, kind: 'shared' }); B.push({ tokens: page, kind: 'shared' }); }
      shared = p.full;
      if (p.partial) {
        const wa = tailA > 0, wb = tailB > 0;
        // First writer (A, then B) copies the shared half-full page; a later writer finds it unshared.
        const kindA = wa ? 'copied' : (wb ? 'orig' : 'shared');
        const kindB = wb ? (wa ? 'inplace' : 'copied') : (wa ? 'orig' : 'shared');
        A.push({ tokens: rest + Math.min(tailA, p.room), kind: kindA });
        B.push({ tokens: rest + Math.min(tailB, p.room), kind: kindB });
        if (wa || wb) copied = 1; else shared += 1;
      }
    }
    A.push(...tailPages(tailA, newA));
    B.push(...tailPages(tailB, newB));
    const physicalPages = mode === 'copy' ? 2 * p.total + newA + newB : p.total + copied + newA + newB;
    return { prefixPages: p.total, sharedPages: shared, copiedPages: copied, newA, newB, physicalPages, stateCopies: 1, layout: { A, B } };
  }

  function prefillSeconds(tokens, rate = 1000) {
    if (!(rate > 0)) throw new Error('速度必须大于零');
    return tokens / rate;
  }

  const api = { GDN_STATE_BYTES, REASONS, match, pages, branch, prefillSeconds };
  root.VizMath = root.VizMath || {};
  root.VizMath.prefix = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
