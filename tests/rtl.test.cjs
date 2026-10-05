'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isolateNumbers } = require('../scripts/rtl.cjs');
const LRI = '⁦', PDI = '⁩';

// Figure numbers, ranges and units follow the Unicode default for Arabic text (as Arabic Wikipedia shows
// "(1918–1914)"); only bracketed number vectors, which are maths notation, are forced left to right.
test('figure numbers and ranges keep the Arabic default order', () => {
  const html = '<p>انظر الشكل 4-3 والمدى 12–24 GB و768 MiB.</p>';
  assert.equal(isolateNumbers(html), html);
});

test('a number vector in prose reads left to right', () => {
  assert.equal(isolateNumbers('<p>المتجه [7, 4] ثم [−1, 0.5]</p>'),
    '<p>المتجه <span dir="ltr">[7, 4]</span> ثم <span dir="ltr">[−1, 0.5]</span></p>');
});

test('a number vector in SVG text gets invisible isolate marks', () => {
  assert.equal(isolateNumbers('<svg viewBox="0 0 400 10"><text x="1" y="2">القيمة [7, 4]</text></svg>'),
    '<svg viewBox="0 0 400 10"><text x="1" y="2">القيمة ' + LRI + '[7, 4]' + PDI + '</text></svg>');
});

test('attributes, links and code are left alone', () => {
  const html = '<a href="https://x.org/a#L10-L20" aria-label="[1, 2]"><code>[2, 3]</code></a>';
  assert.equal(isolateNumbers(html), html);
});

test('running it twice changes nothing more', () => {
  const once = isolateNumbers('<p>[1, 2]</p><svg><text>[1, 2]</text></svg>');
  assert.equal(isolateNumbers(once), once);
});
