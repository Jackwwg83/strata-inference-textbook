'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/23-sse.math.js');

const hex = b => Array.from(b, x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');

test('UTF-8 bytes of common characters', () => {
  assert.equal(hex(m.utf8('中')), 'E4 B8 AD');
  assert.equal(hex(m.utf8('文')), 'E6 96 87');
  assert.equal(m.utf8('A').length, 1);
  assert.equal(m.utf8('é').length, 2);
  assert.equal(m.utf8('😀').length, 4);
  assert.equal(m.seqLen(0x41), 1);
  assert.equal(m.seqLen(0xC3), 2);
  assert.equal(m.seqLen(0xE4), 3);
  assert.equal(m.seqLen(0xF0), 4);
  assert.equal(m.seqLen(0xB8), 0, 'continuation byte');
});

test('incremental decoder holds a split character until it is complete', () => {
  const d = m.makeDecoder();
  const b = m.utf8('中');
  assert.deepEqual(d.push(b.slice(0, 1)), { text: '', held: 1 });
  assert.deepEqual(d.push(b.slice(1, 2)), { text: '', held: 2 });
  assert.deepEqual(d.push(b.slice(2, 3)), { text: '中', held: 0 });
  const d2 = m.makeDecoder();
  assert.deepEqual(d2.push(m.utf8('A中').slice(0, 2)), { text: 'A', held: 1 });
  assert.equal(d2.end(), '�', 'a dangling partial character becomes one replacement character at the end');
});

test('naive per-chunk decoding breaks a split character', () => {
  const b = m.utf8('中');
  const parts = [b.slice(0, 1), b.slice(1, 2), b.slice(2)];
  const text = parts.map(m.naiveDecode).join('');
  assert.notEqual(text, '中');
  assert.ok(text.includes('�'));
});

test('SSE framer: blank line ends an event, comments are not data, CRLF works', () => {
  const f = m.makeFramer();
  assert.deepEqual(f.push('data: {"delta":"中"}\n'), []);
  assert.deepEqual(f.push('\n: keep-alive\n\n'), [{ type: 'data', event: 'message', data: '{"delta":"中"}' }, { type: 'comment', data: 'keep-alive' }]);
  assert.equal(f.pending(), '');
  const g = m.makeFramer();
  assert.deepEqual(g.push('event: delta\r\ndata: a\r\ndata: b\r\n\r'), []);
  assert.deepEqual(g.push('\n'), [{ type: 'data', event: 'delta', data: 'a\nb' }]);
  const h = m.makeFramer();
  assert.deepEqual(h.push('data: half'), []);
  assert.equal(h.pending(), 'data: half', 'an unfinished event stays pending');
});

test('wire format matches the shape the server writes', () => {
  const w = m.wire(['中', null, '文']);
  assert.equal(w, 'data: {"delta":"中"}\n\n: keep-alive\n\ndata: {"delta":"文"}\n\ndata: [DONE]\n\n');
  assert.equal(m.wire(['x'], true), 'data: {"delta":"x"}\r\n\r\ndata: [DONE]\r\n\r\n');
});

test('seeded chunk sizes are reproducible and cover every byte', () => {
  const a = m.chunkSizes(100, 7, 1, 7), b = m.chunkSizes(100, 7, 1, 7);
  assert.deepEqual(a, b);
  assert.equal(a.reduce((x, y) => x + y, 0), 100);
  assert.ok(a.every(x => x >= 1 && x <= 7));
  assert.notDeepEqual(m.chunkSizes(100, 8, 1, 7), a);
  assert.throws(() => m.chunkSizes(10, 1, 0, 3));
});

test('correct pipeline recovers the text for every fixed chunk size', () => {
  const deltas = ['你好', '，', null, '世界', '！'];
  const bytes = m.utf8(m.wire(deltas));
  for (let size = 1; size <= 32; size++) {
    const r = m.runCorrect(m.splitBySize(bytes, size));
    assert.equal(r.output, '你好，世界！', 'size ' + size);
    assert.equal(r.done, true);
    assert.equal(r.events, 4);
    assert.equal(r.comments, 1);
  }
  for (const crlf of [true]) assert.equal(m.runCorrect(m.splitBySize(m.utf8(m.wire(deltas, crlf)), 3)).output, '你好，世界！');
});

test('naive pipeline loses text when chunks cut characters or events', () => {
  const bytes = m.utf8(m.wire(['中文']));
  const one = m.runNaive(m.splitBySize(bytes, 1));
  assert.equal(one.output, '');
  assert.ok(one.broken > 0);
  const whole = m.runNaive([bytes]);
  assert.equal(whole.output, '中文', 'one chunk holding the whole stream happens to work');
  assert.equal(whole.broken, 0);
  const r = m.runNaive(m.splitBySize(bytes, 13));
  assert.notEqual(r.output, '中文');
});

test('step records explain each chunk', () => {
  const bytes = m.utf8('data: {"delta":"中"}\n\n');
  const r = m.runCorrect(m.splitBySize(bytes, 17));
  assert.equal(r.steps.length, 2);
  assert.equal(r.steps[0].held, 1, 'first chunk ends one byte into 中');
  assert.equal(r.steps[1].held, 0);
  assert.deepEqual(r.steps[1].deltas, ['中']);
});

test('JSON byte cost: raw UTF-8 versus \\u escapes', () => {
  assert.equal(m.jsonBytes('中文', false), 18);
  assert.equal(m.jsonBytes('中文', true), 24);
  assert.equal(m.jsonBytes('ab', true), m.jsonBytes('ab', false));
});

test('tag parser holds back partial tags and splits reasoning, content and tool call', () => {
  const p = m.makeTagParser();
  const deltas = ['我先想', '一想。</th', 'ink>好的，', '查天气。<tool', '_call><function=get_weather><parameter=city>杭州</parameter></function></tool_', 'call>'];
  const steps = deltas.map(d => p.feed(d));
  assert.equal(steps[1].held, '</th');
  for (const s of steps) for (const e of s.events) if (e.kind !== 'tool') assert.ok(!e.text.includes('<'), 'leaked: ' + e.text);
  const all = steps.flatMap(s => s.events);
  const by = k => all.filter(e => e.kind === k).map(e => e.text).join('');
  assert.equal(by('reasoning'), '我先想一想。');
  assert.equal(by('content'), '好的，查天气。');
  assert.equal(all.filter(e => e.kind === 'tool').length, 1);
  assert.deepEqual(m.parseToolXml(by('tool')), { name: 'get_weather', args: { city: '杭州' } });
  assert.equal(p.state(), 'content');
});

test('tag parser starting in content treats plain text as content', () => {
  const p = m.makeTagParser('content');
  assert.deepEqual(p.feed('hi <'), { events: [{ kind: 'content', text: 'hi ' }], held: '<' });
  assert.deepEqual(p.feed('b>'), { events: [{ kind: 'content', text: '<b>' }], held: '' });
});
