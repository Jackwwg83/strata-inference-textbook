/* Pure functions behind the chapter 23 widgets: UTF-8 bytes, SSE framing and tag hold-back.
   A teaching subset: data-only SSE with LF / CRLF / CR line ends, and three tags of the model's output.
   Wire shape follows serve/server.py at the pinned commit: `data: ` + JSON + blank line, `: keep-alive`, `data: [DONE]`. */
(function (root) {
  'use strict';
  const enc = new TextEncoder();
  const utf8 = s => enc.encode(s);

  // Bytes in the UTF-8 sequence that starts with byte b; 0 for a continuation or invalid byte.
  function seqLen(b) {
    if (b < 0x80) return 1;
    if ((b & 0xE0) === 0xC0) return 2;
    if ((b & 0xF0) === 0xE0) return 3;
    if ((b & 0xF8) === 0xF0) return 4;
    return 0;
  }

  // Index where an unfinished sequence at the end of `bytes` begins (bytes.length when nothing is unfinished).
  function completeUpTo(bytes) {
    const n = bytes.length;
    for (let i = n - 1; i >= Math.max(0, n - 4); i--) {
      const b = bytes[i];
      if ((b & 0xC0) === 0x80) continue;
      const len = seqLen(b);
      if (len === 0) return n;
      return i + len > n ? i : n;
    }
    return n;
  }

  function concat(a, b) { const out = new Uint8Array(a.length + b.length); out.set(a, 0); out.set(b, a.length); return out; }

  // Incremental decoder: emits complete characters, holds the first bytes of a split one.
  function makeDecoder() {
    let pending = new Uint8Array(0);
    const dec = new TextDecoder('utf-8');
    return {
      push(chunk) {
        const all = concat(pending, chunk), cut = completeUpTo(all);
        pending = all.slice(cut);
        return { text: dec.decode(all.slice(0, cut)), held: pending.length };
      },
      end() { const rest = dec.decode(pending); pending = new Uint8Array(0); return rest; },
    };
  }

  // Each chunk decoded on its own, the way a careless client does it.
  const naiveDecode = chunk => new TextDecoder('utf-8').decode(chunk);

  // SSE framing: a blank line ends an event; `data:` lines join with \n; `:` lines are comments.
  function parseBlock(block) {
    const data = [], notes = [];
    let event = 'message';
    for (const line of block.split(/\r\n|\r|\n/)) {
      if (line.startsWith(':')) notes.push(line.slice(1).replace(/^ /, ''));
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      else if (line.startsWith('event:')) event = line.slice(6).replace(/^ /, '');
    }
    if (data.length) return { type: 'data', event, data: data.join('\n') };
    if (notes.length) return { type: 'comment', data: notes.join('\n') };
    return null;
  }
  function makeFramer() {
    let buf = '';
    return {
      push(text) {
        buf += text;
        const out = [];
        let mm;
        while ((mm = /\r\n\r\n|\n\n|\r\r/.exec(buf))) {
          const ev = parseBlock(buf.slice(0, mm.index));
          buf = buf.slice(mm.index + mm[0].length);
          if (ev) out.push(ev);
        }
        return out;
      },
      pending() { return buf; },
    };
  }

  // The byte stream for a list of deltas; null stands for a keep-alive comment.
  function wire(deltas, crlf = false) {
    const nl = crlf ? '\r\n' : '\n';
    const parts = deltas.map(d => (d === null ? ': keep-alive' : 'data: ' + JSON.stringify({ delta: d })) + nl + nl);
    return parts.join('') + 'data: [DONE]' + nl + nl;
  }

  // Reproducible chunk sizes in [min, max] that add up to `total` (mulberry32).
  function chunkSizes(total, seed, min = 1, max = 7) {
    if (!(Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min)) throw new Error('分片大小范围无效');
    let s = seed >>> 0;
    const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const out = [];
    let left = total;
    while (left > 0) { const n = Math.min(left, min + Math.floor(rnd() * (max - min + 1))); out.push(n); left -= n; }
    return out;
  }
  function splitBySizes(bytes, sizes) { const out = []; let i = 0; for (const n of sizes) { out.push(bytes.slice(i, i + n)); i += n; } return out; }
  function splitBySize(bytes, size) { const out = []; for (let i = 0; i < bytes.length; i += size) out.push(bytes.slice(i, i + size)); return out; }

  // Correct order: incremental UTF-8 -> SSE framing -> JSON.parse of complete `data`.
  function runCorrect(chunks) {
    const dec = makeDecoder(), fr = makeFramer(), steps = [];
    let output = '', done = false, events = 0, comments = 0;
    for (const c of chunks) {
      const { text, held } = dec.push(c);
      const evs = fr.push(text), deltas = [];
      for (const e of evs) {
        if (e.type === 'comment') { comments++; continue; }
        if (e.data === '[DONE]') { done = true; continue; }
        events++;
        const d = JSON.parse(e.data).delta;
        deltas.push(d);
        output += d;
      }
      steps.push({ size: c.length, text, held, events: evs, deltas, buffered: fr.pending().length });
    }
    return { output, done, events, comments, steps, pending: fr.pending() };
  }

  // Careless order: decode each chunk alone, JSON.parse every `data:` line found inside that chunk.
  function runNaive(chunks) {
    const steps = [];
    let output = '', broken = 0, errors = 0;
    for (const c of chunks) {
      const text = naiveDecode(c), deltas = [];
      const bad = (text.match(/�/g) || []).length;
      broken += bad;
      let err = 0;
      for (const line of text.split(/\r\n|\r|\n/)) {
        if (!line.startsWith('data:')) continue;
        const body = line.slice(5).replace(/^ /, '');
        if (body === '[DONE]') continue;
        try { const d = JSON.parse(body).delta; if (typeof d === 'string') { deltas.push(d); output += d; } else err++; } catch { err++; }
      }
      errors += err;
      steps.push({ size: c.length, text, broken: bad, errors: err, deltas });
    }
    return { output, broken, errors, steps };
  }

  // Bytes of {"delta":s} as JSON: raw UTF-8, or every non-ASCII character written as \uXXXX.
  function jsonBytes(s, asciiOnly) {
    let j = JSON.stringify({ delta: s });
    if (asciiOnly) j = j.replace(/[\u0080-￿]/g, ch => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
    return utf8(j).length;
  }

  // Hold-back parser for three tags. reasoning --</think>--> content --<tool_call>--> tool --</tool_call>--> content.
  const NEXT = { reasoning: ['</think>', 'content'], content: ['<tool_call>', 'tool'], tool: ['</tool_call>', 'content'] };
  function heldSuffix(buf, tag) {
    for (let n = Math.min(buf.length, tag.length - 1); n > 0; n--) if (tag.startsWith(buf.slice(buf.length - n))) return n;
    return 0;
  }
  function makeTagParser(start = 'reasoning') {
    let state = start, buf = '', call = '';
    return {
      feed(delta) {
        buf += delta;
        const events = [];
        const emit = (kind, text) => { if (text) events.push({ kind, text }); };
        for (;;) {
          const [tag, next] = NEXT[state], i = buf.indexOf(tag);
          if (i < 0) break;
          if (state === 'tool') { emit('tool', call + buf.slice(0, i)); call = ''; } else emit(state, buf.slice(0, i));
          buf = buf.slice(i + tag.length);
          state = next;
        }
        const keep = heldSuffix(buf, NEXT[state][0]);
        if (state === 'tool') { call += buf.slice(0, buf.length - keep); buf = buf.slice(buf.length - keep); return { events, held: call + buf }; }
        emit(state, buf.slice(0, buf.length - keep));
        buf = buf.slice(buf.length - keep);
        return { events, held: buf };
      },
      state: () => state,
    };
  }

  // <function=NAME><parameter=P>V</parameter>...</function> -> { name, args }
  function parseToolXml(s) {
    const name = (/<function=([^>]+)>/.exec(s) || [])[1] || '';
    const args = {};
    for (const [, k, v] of s.matchAll(/<parameter=([^>]+)>([\s\S]*?)<\/parameter>/g)) args[k] = v;
    return { name, args };
  }

  const api = { utf8, seqLen, completeUpTo, makeDecoder, naiveDecode, makeFramer, wire, chunkSizes, splitBySizes, splitBySize, runCorrect, runNaive, jsonBytes, makeTagParser, parseToolXml };
  root.VizMath = root.VizMath || {};
  root.VizMath.sse = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
