'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../src/viz/core.js');
const { Viz } = globalThis;

// A minimal stand-in for the few DOM calls mountAll makes.
function fakeWidgetBlock(name) {
  const order = [];
  const figure = { tag: 'figure' };
  const parent = { insertBefore(node, ref) { order.push([node.tag, 'before', ref.tag]); } };
  const el = {
    tag: 'viz', dataset: { viz: name }, parentNode: parent, html: '<figure class="fig">…</figure>',
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); } },
    get innerHTML() { return this.html; }, set innerHTML(v) { this.html = v; },
    querySelector(sel) { return sel === 'figure' ? figure : null; },
    querySelectorAll() { return []; },
    insertAdjacentHTML(pos, h) { this.html += h; },
  };
  return { el, order, container: { querySelectorAll: () => [el] } };
}

test('mounting a widget keeps its static figure, placed before the widget', () => {
  Viz.register('test-keep-figure', { mount(el) { el.insertAdjacentHTML('beforeend', '<div class="viz-frame">live</div>'); } });
  const { el, order, container } = fakeWidgetBlock('test-keep-figure');
  Viz.mountAll(container)();
  assert.deepEqual(order, [['figure', 'before', 'viz']]);
  assert.equal(el.innerHTML, '<div class="viz-frame">live</div>');
  assert.ok(el.classList.set.has('viz-live'));
});

test('a widget that fails to mount leaves the figure and an empty block', () => {
  Viz.register('test-broken', { mount() { throw new Error('boom'); } });
  const { el, order, container } = fakeWidgetBlock('test-broken');
  const quiet = console.error; console.error = () => {};
  try { Viz.mountAll(container); } finally { console.error = quiet; }
  assert.deepEqual(order, [['figure', 'before', 'viz']]);
  assert.equal(el.innerHTML, '');
  assert.ok(!el.classList.set.has('viz-live'));
});

test('every widget block in the chapters wraps a figure with a numbered caption', () => {
  const dir = path.join(__dirname, '..', 'content', 'chapters');
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const [block, name] of html.matchAll(/<div class="viz" data-viz="([^"]+)">[\s\S]*?<\/figure><\/div>/g)) {
      assert.match(block, /<figcaption>图 \d+-\d+/, `${f} widget ${name} needs a numbered figcaption`);
    }
  }
});

test('the widget framework labels exist in every site language', () => {
  for (const lang of Viz.LANGS) {
    const ui = Viz.ui(lang);
    assert.ok(ui && ui.tryTitle && ui.verdict, 'missing widget labels for ' + lang);
  }
});
