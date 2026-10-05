'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isolateNumbers } = require('../scripts/rtl.cjs');
const LRI = '⁦', PDI = '⁩';

test('figure numbers and ranges in prose read left to right', () => {
  assert.equal(isolateNumbers('<p>انظر الشكل 4-3 والمدى 12–24 GB.</p>'),
    '<p>انظر الشكل <span dir="ltr">4-3</span> والمدى <span dir="ltr">12–24</span> GB.</p>');
});

test('decimals and percents stay inside one isolate', () => {
  assert.equal(isolateNumbers('<p>من 0.6%–1.4% تقريبًا</p>'), '<p>من <span dir="ltr">0.6%–1.4%</span> تقريبًا</p>');
});

test('SVG text gets invisible isolate marks instead of a span', () => {
  assert.equal(isolateNumbers('<svg viewBox="0 0 400 10"><text x="1" y="2">الطبقات 1-24</text></svg>'),
    '<svg viewBox="0 0 400 10"><text x="1" y="2">الطبقات ' + LRI + '1-24' + PDI + '</text></svg>');
});

test('attributes, links and code are left alone', () => {
  const html = '<a href="https://x.org/a#L10-L20" aria-label="الشكل 4-3"><code>2-3</code></a>';
  assert.equal(isolateNumbers(html), html);
});

test('running it twice changes nothing more', () => {
  const once = isolateNumbers('<p>الشكل 1-2</p><svg><text>1-2</text></svg>');
  assert.equal(isolateNumbers(once), once);
});
