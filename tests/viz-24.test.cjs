'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/viz/24-lifecycle.math.js');

test('lifecycle: the normal path ends in done', () => {
  let s = 'queued';
  for (const ev of ['admit', 'firstToken', 'finish']) s = m.transition(s, ev);
  assert.equal(s, 'done');
  assert.ok(m.isTerminal('done'));
});

test('lifecycle: cancel works from every live state and needs an ack once the engine is involved', () => {
  assert.equal(m.transition('queued', 'cancel'), 'cancelled');
  assert.equal(m.transition('prefill', 'cancel'), 'cancelling');
  assert.equal(m.transition('decoding', 'cancel'), 'cancelling');
  assert.equal(m.transition('cancelling', 'ack'), 'cancelled');
  assert.equal(m.transition('cancelling', 'silent'), 'failed');
  assert.equal(m.transition('prefill', 'silent'), 'failed');
});

test('lifecycle: terminal states accept nothing, unknown events throw', () => {
  for (const s of ['done', 'cancelled', 'failed']) assert.throws(() => m.transition(s, 'cancel'));
  assert.throws(() => m.transition('queued', 'finish'));
  assert.throws(() => m.transition('nowhere', 'admit'));
  assert.deepEqual(m.allowed('decoding').sort(), ['cancel', 'finish', 'silent']);
  assert.deepEqual(m.allowed('done'), []);
});

test('watchdog allowance follows serve/server.py constants', () => {
  assert.equal(m.firstAllowance(32768), 300 + 32768 / 50);
  assert.equal(Math.round(m.firstAllowance(32768)), 955);
  assert.equal(m.firstAllowance(100000), 300 + 32768 / 50, 'a prompt longer than one chunk only counts its first chunk');
  assert.equal(m.firstAllowance(4096), 300 + 4096 / 50);
  assert.equal(m.firstAllowance(4096, { silence: 0 }), Infinity, '0 means wait forever');
  assert.equal(m.nextAllowance(32768, 2171), 300, 'a fast PC keeps the base silence');
  assert.equal(Math.round(m.nextAllowance(32768, 100)), 983, 'a slow PC gets three times the last chunk');
  assert.throws(() => m.nextAllowance(100, 0));
});

test('worst-case stop delay: detection plus the rest of the current unit of work', () => {
  assert.equal(m.stopDelay('queued'), 0.5);
  assert.equal(m.stopDelay('prefill', { chunk: 32768, prefillRate: 2171 }).toFixed(1), '15.6');
  assert.equal(m.stopDelay('decoding', { decodeRate: 81.8 }).toFixed(3), '0.512');
  assert.throws(() => m.stopDelay('done'));
});

test('early-exit comparison leaks how many characters matched', () => {
  assert.equal(m.earlyExitSteps('k7f2', 'a000'), 1);
  assert.equal(m.earlyExitSteps('k7f2', 'k000'), 2);
  assert.equal(m.earlyExitSteps('k7f2', 'k7f0'), 4);
  assert.equal(m.earlyExitSteps('k7f2', 'k7f2'), 4);
  assert.equal(m.constantSteps('k7f2', 'a000'), 4);
  assert.equal(m.constantSteps('k7f2', 'k7f2'), 4);
});

test('probe shows a single tallest bar only for the early-exit comparison', () => {
  const A = '0123456789abcdef';
  const t = m.probe('c7f2', '', A, 'early');
  assert.equal(t.length, 16);
  assert.equal(Math.max(...t), 2);
  assert.equal(t.indexOf(2), A.indexOf('c'));
  assert.equal(t.filter(x => x === 2).length, 1);
  const c = m.probe('c7f2', '', A, 'constant');
  assert.ok(c.every(x => x === 4));
});

test('attack recovers the key in 16 x 4 tries with early exit and gets stuck with constant time', () => {
  const A = '0123456789abcdef';
  const e = m.attack('c7f2', A, 'early');
  assert.equal(e.recovered, 'c7f2');
  assert.equal(e.tries, 64);
  assert.equal(e.stuckAt, -1);
  const c = m.attack('c7f2', A, 'constant');
  assert.equal(c.recovered, '');
  assert.equal(c.stuckAt, 0);
  assert.equal(m.bruteForce(16, 4), 65536);
  assert.equal(m.bruteForce(16, 32), 16 ** 32);
});

test('the last position is found by acceptance, not by timing', () => {
  const A = '0123456789abcdef';
  assert.deepEqual(m.pick('c7f2', 'c7f', A, 'early'), [2]);
  assert.deepEqual(m.pick('c7f2', 'c7f', A, 'constant'), [2]);
  assert.equal(m.pick('c7f2', '', A, 'constant').length, 16, 'constant time: every candidate looks the same');
});
