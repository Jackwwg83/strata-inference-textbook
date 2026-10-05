'use strict';
// Right-to-left pages: after an Arabic letter, digits count as Arabic numbers, and a dash between two of them
// does not join them, so "4-3" shows as "3-4". This wraps each number-dash-number run so it reads left to right:
// a <span dir="ltr"> in HTML text, and invisible isolate marks (LRI ... PDI) inside SVG text, where spans do not work.
const NUM = String.raw`\d+(?:[.,]\d+)*%?`;
const RUN = new RegExp(`${NUM}\\s?[-\\u2010-\\u2015\\u2212]\\s?${NUM}`, 'g');
const LRI = '⁦', PDI = '⁩';

function isolateNumbers(html) {
  // Split into tags and text; track whether the text sits inside <svg>, <code>, <pre> or an existing ltr span.
  const parts = html.split(/(<[^>]+>)/);
  let svg = 0, code = 0, ltr = 0;
  const ltrStack = [];
  return parts.map(part => {
    if (part.startsWith('<')) {
      const m = /^<\/?\s*([a-zA-Z0-9]+)/.exec(part);
      const name = m ? m[1].toLowerCase() : '';
      const closing = part.startsWith('</');
      if (name === 'svg') svg += closing ? -1 : 1;
      if (name === 'code' || name === 'pre') code += closing ? -1 : 1;
      if (name === 'span') {
        if (closing) { if (ltrStack.pop()) ltr--; }
        else { const isLtr = /\bdir="ltr"/.test(part); ltrStack.push(isLtr); if (isLtr) ltr++; }
      }
      return part;
    }
    if (code > 0 || ltr > 0) return part;
    if (svg > 0) return part.replace(RUN, (run, at, s) => (s[at - 1] === LRI ? run : LRI + run + PDI));
    return part.replace(RUN, run => `<span dir="ltr">${run}</span>`);
  }).join('');
}

module.exports = { isolateNumbers };
