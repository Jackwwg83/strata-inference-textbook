'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { dfnTexts, tagDfns, tagFirstUses } = require('../scripts/terms.cjs');

test('dfnTexts lists the defined terms in document order without tags', () => {
  assert.deepEqual(dfnTexts('<p><dfn>分词器</dfn> 和 <dfn><b>KV</b> 缓存</dfn></p>'), ['分词器', 'KV 缓存']);
});

test('tagDfns gives each dfn its term key, in order, and makes it focusable', () => {
  assert.equal(tagDfns('<p><dfn>分词器</dfn>，<dfn>采样</dfn></p>', ['tokenizer', 'sampling']),
    '<p><dfn data-term="tokenizer" tabindex="0">分词器</dfn>，<dfn data-term="sampling" tabindex="0">采样</dfn></p>');
  assert.equal(tagDfns('<p><dfn>x</dfn></p>', [undefined]), '<p><dfn>x</dfn></p>');
});

test('tagFirstUses marks only the first plain use of each term in a chapter', () => {
  const surfaces = [['专家', 'expert'], ['路由器', 'router']];
  assert.equal(tagFirstUses('<p>每个专家都有编号，专家很多。路由器挑选。</p>', surfaces, 'zh'),
    '<p>每个<span class="term-ref" data-term="expert" tabindex="0">专家</span>都有编号，专家很多。<span class="term-ref" data-term="router" tabindex="0">路由器</span>挑选。</p>');
});

test('tagFirstUses skips headings, code, links, svg, dfn and terms defined in the chapter', () => {
  const surfaces = [['专家', 'expert']];
  const html = '<h2>专家</h2><p><code>专家</code><a href="#x">专家</a></p><svg><text>专家</text></svg><p><dfn data-term="expert">专家</dfn></p><p>专家</p>';
  assert.equal(tagFirstUses(html, surfaces, 'zh'), html);
});

test('tagFirstUses prefers the longest surface and respects word boundaries in Latin scripts', () => {
  const surfaces = [['expert', 'expert'], ['expert cache', 'expert-cache']];
  assert.equal(tagFirstUses('<p>The expert cache holds experts. An expert is a block.</p>', surfaces, 'en'),
    '<p>The <span class="term-ref" data-term="expert-cache" tabindex="0">expert cache</span> holds experts. An <span class="term-ref" data-term="expert" tabindex="0">expert</span> is a block.</p>');
});

test('tagFirstUses ignores surfaces too short to match safely', () => {
  assert.equal(tagFirstUses('<p>网页上的页和键</p>', [['页', 'page'], ['键', 'key']], 'zh'), '<p>网页上的页和键</p>');
  assert.equal(tagFirstUses('<p>K and V and KV</p>', [['K', 'k'], ['V', 'v']], 'en'), '<p>K and V and KV</p>');
  assert.equal(tagFirstUses('<p>the KV cache, KVs</p>', [['KV', 'kv']], 'en'), '<p>the <span class="term-ref" data-term="kv" tabindex="0">KV</span> cache, KVs</p>');
});

test('every translated term file covers exactly the master keys', () => {
  const fs = require('node:fs'), path = require('node:path');
  const root = path.join(__dirname, '..');
  const master = JSON.parse(fs.readFileSync(path.join(root, 'content/terms.json'), 'utf8'));
  const keys = [...new Set(master.map(t => t.key))].sort();
  for (const t of master) assert.ok(t.meaning && t.chapter && t.anchor, 'master entry incomplete: ' + t.term);
  const dir = path.join(root, 'content/i18n');
  for (const lang of fs.readdirSync(dir)) {
    const f = path.join(dir, lang, 'terms.json');
    if (!fs.existsSync(f)) continue;
    const tr = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.deepEqual(tr.map(t => t.key).sort(), keys, lang + ' term keys differ from the master');
    for (const t of tr) assert.ok(typeof t.meaning === 'string' && t.meaning.trim().length > 5, lang + ' empty meaning: ' + t.key);
  }
});
