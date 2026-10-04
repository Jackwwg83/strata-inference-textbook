'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/viz/core.js');
const { Viz } = globalThis;

test('captionOf returns the figure caption of a static fallback', () => {
  const html = '<figure class="fig"><svg viewBox="0 0 400 10"></svg><figcaption>图 1-1 一句话的<b>六次</b>转换。</figcaption></figure>';
  assert.equal(Viz.captionOf(html), '图 1-1 一句话的<b>六次</b>转换。');
});

test('captionOf returns an empty string when there is no caption', () => {
  assert.equal(Viz.captionOf('<figure class="fig"><svg></svg></figure>'), '');
  assert.equal(Viz.captionOf(''), '');
});

test('every widget fallback in the chapters carries a numbered caption', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.join(__dirname, '..', 'content', 'chapters');
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const [block, name] of html.matchAll(/<div class="viz" data-viz="([^"]+)">[\s\S]*?<\/figure><\/div>/g)) {
      assert.match(Viz.captionOf(block), /^图 \d+-\d+/, `${f} widget ${name} needs a numbered figcaption`);
    }
  }
});
