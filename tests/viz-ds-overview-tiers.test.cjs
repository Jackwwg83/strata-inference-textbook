'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const m = require('../src/viz/ds-overview-tiers.math.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} vs ${b} (tol ${tol})`);
const r1 = (x) => Math.round(x * 10) / 10;
const sumTiers = (p) => p.tiers.vram + p.tiers.ram + p.tiers.ssd;

test('file sets: sizes add up like the page and DEEPSEEK41.md', () => {
  const ud = m.SETS.ud;
  assert.equal(r1(ud.expertsGb), 288.8);
  assert.equal(r1(ud.denseGb), 16.8);
  assert.equal(r1(ud.engramGb), 202.8);
  assert.equal(r1(ud.expertsGb + ud.denseGb + ud.engramGb), 508.4);
  assert.equal(r1(m.diskGb('ud')), 508.4);
  // 2-bit sets: model + shared 111 GB table + 8 GB drafter = 239 / 257 / 274 GB of disk
  assert.equal(Math.round(m.diskGb('ist175')), 239);
  assert.equal(Math.round(m.diskGb('ist200')), 257);
  assert.equal(Math.round(m.diskGb('ist225')), 274);
  assert.equal(r1(m.SETS.ist200.engramGb), 110.6);
  assert.equal(Math.round(m.SETS.ist200.drafterGb), 8);
  // the three 2-bit sets share one table; the UD set has no drafter
  assert.equal(m.SETS.ist175.engramGb, m.SETS.ist225.engramGb);
  assert.equal(m.SETS.ud.drafterGb, 0);
  // dense weights of the 2-bit sets: about 6.16 GB
  for (const id of ['ist175', 'ist200', 'ist225']) near(m.SETS[id].denseGb, 6.16, 0.02, id);
  assert.deepEqual(m.SET_IDS, ['ud', 'ist175', 'ist200', 'ist225']);
  assert.equal(m.EXPERTS_TOTAL, 40 * 384);
  near(m.SETS.ud.expertsGb / m.EXPERTS_TOTAL * 1000, 18.8, 0.01, 'MB per expert');
});

test('default state is the measured 4x R9700 + 251 GB run of the page figure', () => {
  assert.deepEqual(m.DEFAULT, { setId: 'ud', unified: false, vram: 128, ram: 251 });
  const p = m.place(m.DEFAULT);
  assert.equal(p.kind, 'measured');
  assert.equal(r1(p.expertsVram), 116.5);
  assert.equal(r1(p.expertsRam), 172.3);
  assert.equal(p.expertsSsd, 0);
  assert.equal(r1(p.denseVram), 16.8);
  assert.equal(r1(p.engramGb), 202.8);
  assert.equal(p.engramWhere, 'ssd');
  assert.equal(p.expertsVramCount, 6197);
  assert.equal(p.expertsRamCount, 9163);
  assert.equal(p.expertsVramCount + p.expertsRamCount, m.EXPERTS_TOTAL);
  assert.equal(r1(p.expertsVram + p.expertsRam), 288.8);
  assert.equal(p.verdict, 'fits');
  assert.equal(r1(p.tiers.vram), 133.3);
  assert.equal(r1(p.tiers.ram), 172.3);
  assert.equal(r1(p.tiers.ssd), 202.8);
  near(sumTiers(p), m.diskGb('ud'), 1e-9);
  // the 4 x 32 GB cards hold 32 GiB each: 137.4 GB, so 133.3 GB fits
  near(p.vramCapGb, 137.44, 0.01);
});

test('the Strix Halo preset is the measured 128 GB unified run', () => {
  const p = m.place(m.PRESETS.strix.state);
  assert.deepEqual(m.PRESETS.strix.state, { setId: 'ist200', unified: true, vram: 128, ram: 0 });
  assert.equal(p.kind, 'measured');
  assert.equal(Math.round(p.expertsVram), 109);
  assert.equal(Math.round(p.expertsSsd), 23);
  assert.equal(p.expertsRam, 0);
  assert.equal(p.engramWhere, 'ssd');
  assert.equal(Math.round(p.engramGb), 111);
  assert.equal(Math.round(p.drafterGb), 8);
  near(sumTiers(p), m.diskGb('ist200'), 1e-9);
  assert.equal(p.verdict, 'spills');
});

test('page figure: the default numbers appear in the static fallback of the page', () => {
  const html = fs.readFileSync(path.join(__dirname, '../content/columns/deepseek/overview.html'), 'utf8');
  const fig = html.match(/<div class="viz" data-viz="ds-overview-tiers">[\s\S]*?<\/figure><\/div>/)[0];
  const a = m.place(m.DEFAULT), b = m.place(m.PRESETS.strix.state);
  for (const n of [r1(a.expertsVram), r1(a.denseVram), r1(a.expertsRam), r1(a.engramGb)]) assert.ok(fig.includes(String(n)), 'figure lacks ' + n);
  for (const n of [Math.round(b.expertsVram), Math.round(b.expertsSsd), Math.round(b.engramGb), Math.round(b.drafterGb)]) assert.ok(fig.includes(String(n)), 'figure lacks ' + n);
  assert.ok(fig.includes('508.4') && fig.includes('257'));
});

test('estimate rule reproduces the measured placement within 1 GB', () => {
  // dense first, then experts into what is left of the cards (32 GiB = 34.4 GB each, 1.15 GB kept free per card)
  const e = m.estimate(m.DEFAULT);
  assert.equal(e.kind, 'estimate');
  near(e.expertsVram, 116.5, 1, 'R9700 experts in graphics memory');
  near(e.expertsRam, 172.3, 1, 'R9700 experts on the CPU');
  // upstream dsv41_fit.py predicted 6,240 experts; this simpler rule lands within 1.5%
  near(e.expertsVramCount, 6240, 6240 * 0.015, 'expert count');
  const s = m.estimate(m.PRESETS.strix.state);
  near(s.expertsVram, 109, 1, 'Strix experts in the pool');
  near(s.expertsSsd, 23, 1, 'Strix experts from SSD');
});

test('placement conserves every byte of the file set', () => {
  for (const setId of m.SET_IDS) for (const unified of [false, true]) for (const vram of [0, 8, 24, 64, 128, 192, 1024]) for (const ram of [0, 16, 64, 251, 1024]) {
    const p = m.place({ setId, unified, vram, ram });
    const set = m.SETS[setId];
    near(p.denseVram + p.expertsVram + p.expertsRam + p.expertsSsd, set.denseGb + set.expertsGb, 1e-6, `${setId} ${unified} ${vram} ${ram}`);
    near(sumTiers(p), m.diskGb(setId), 1e-6, 'tiers');
    assert.ok(p.expertsVram >= 0 && p.expertsRam >= 0 && p.expertsSsd >= 0);
    assert.ok(p.expertsVramCount + p.expertsRamCount + p.expertsSsdCount === m.EXPERTS_TOTAL, 'counts');
    if (unified) assert.equal(p.expertsRam, 0);
  }
});

test('maximum memory: everything in graphics memory, nothing on the SSD except the tables', () => {
  const p = m.place({ setId: 'ud', unified: false, vram: 1024, ram: 1024 });
  assert.equal(p.kind, 'estimate');
  near(p.expertsVram, m.SETS.ud.expertsGb, 1e-9);
  assert.equal(p.expertsRam, 0);
  assert.equal(p.expertsSsd, 0);
  assert.equal(p.verdict, 'fits');
  near(p.tiers.ssd, m.SETS.ud.engramGb, 1e-9);
});

test('less RAM than the CPU experts need: the rest is read from the SSD', () => {
  const p = m.place({ setId: 'ud', unified: false, vram: 128, ram: 64 });
  assert.equal(p.verdict, 'spills');
  // RAM keeps 9 GB for the engine and the system, the rest of it caches experts
  near(p.expertsRam, 64 - m.REST_RAM_GB, 1e-9);
  near(p.expertsSsd, p.expertsRam + p.expertsSsd - p.expertsRam, 1e-9);
  assert.ok(p.expertsSsd > 100);
  near(p.ramNeededGb, p.expertsRam + p.expertsSsd + m.REST_RAM_GB, 1e-9);
  const none = m.place({ setId: 'ud', unified: false, vram: 128, ram: 0 });
  assert.equal(none.expertsRam, 0);
  assert.equal(none.verdict, 'spills');
});

test('verdict thresholds: fits needs 4 GB of RAM beyond the CPU experts, tight is 0 to 4 GB', () => {
  const base = m.estimate({ setId: 'ud', unified: false, vram: 128, ram: 0 });
  const need = base.expertsRam + base.expertsSsd + m.REST_RAM_GB;
  assert.equal(m.estimate({ setId: 'ud', unified: false, vram: 128, ram: need + 4 }).verdict, 'fits');
  assert.equal(m.estimate({ setId: 'ud', unified: false, vram: 128, ram: need + 3.9 }).verdict, 'tight');
  assert.equal(m.estimate({ setId: 'ud', unified: false, vram: 128, ram: need }).verdict, 'tight');
  assert.equal(m.estimate({ setId: 'ud', unified: false, vram: 128, ram: need - 0.1 }).verdict, 'spills');
});

test('graphics memory too small for the dense weights: out of memory warning, no experts there', () => {
  const p = m.place({ setId: 'ud', unified: false, vram: 8, ram: 512 });
  assert.equal(p.verdict, 'oom');
  assert.equal(p.expertsVram, 0);
  assert.ok(p.denseVram > p.vramCapGb - 1);
  // the same card is enough for a 2-bit set
  const q = m.place({ setId: 'ist200', unified: false, vram: 12, ram: 64 });
  assert.notEqual(q.verdict, 'oom');
  assert.ok(q.expertsVram > 0 && q.expertsVram < 10);
  assert.equal(m.place({ setId: 'ud', unified: false, vram: 0, ram: 251 }).verdict, 'noCard');
});

test('unified memory: one pool, dense weights and 12 GB for the system first', () => {
  const p = m.estimate({ setId: 'ist200', unified: true, vram: 64, ram: 0 });
  near(p.expertsVram, 64 - m.SETS.ist200.denseGb - m.UMA_RESERVE_GB, 1e-9);
  const big = m.place({ setId: 'ist200', unified: true, vram: 256, ram: 0 });
  assert.equal(big.expertsSsd, 0);
  assert.equal(big.verdict, 'fits');
  assert.equal(m.place({ setId: 'ist200', unified: true, vram: 10, ram: 0 }).verdict, 'oom');
});

test('card count follows 32 GB per card and sets the reserve', () => {
  assert.equal(m.cardsFor(128), 4);
  assert.equal(m.cardsFor(12), 1);
  assert.equal(m.cardsFor(33), 2);
  assert.equal(m.cardsFor(0), 0);
});

test('Engram of a 2-bit set goes to RAM only when RAM can hold all of it', () => {
  const rich = m.place({ setId: 'ist200', unified: false, vram: 24, ram: 400 });
  assert.equal(rich.engramWhere, 'ram');
  near(rich.tiers.ram, rich.expertsRam + rich.engramGb, 1e-9);
  const poor = m.place({ setId: 'ist200', unified: false, vram: 24, ram: 64 });
  assert.equal(poor.engramWhere, 'ssd');
  // UD table is never held in memory, however much RAM there is
  assert.equal(m.place({ setId: 'ud', unified: false, vram: 24, ram: 1024 }).engramWhere, 'ssd');
});

test('invalid input is rejected', () => {
  const ok = { setId: 'ud', unified: false, vram: 128, ram: 251 };
  assert.throws(() => m.place({ ...ok, setId: 'nope' }));
  for (const bad of [-1, NaN, Infinity, '128', null, undefined]) {
    assert.throws(() => m.place({ ...ok, vram: bad }), undefined, 'vram ' + bad);
    assert.throws(() => m.place({ ...ok, ram: bad }), undefined, 'ram ' + bad);
  }
  assert.throws(() => m.place(null));
  assert.throws(() => m.diskGb('nope'));
  // unified ignores RAM
  assert.doesNotThrow(() => m.place({ setId: 'ist200', unified: true, vram: 64, ram: 0 }));
});

test('measured presets only apply to their exact settings', () => {
  assert.equal(m.place({ ...m.DEFAULT, ram: 250 }).kind, 'estimate');
  assert.equal(m.place({ ...m.DEFAULT, vram: 120 }).kind, 'estimate');
  assert.equal(m.place({ ...m.DEFAULT, setId: 'ist200' }).kind, 'estimate');
  assert.equal(m.place({ ...m.PRESETS.strix.state, vram: 120 }).kind, 'estimate');
  assert.equal(m.place({ ...m.PRESETS.strix.state, ram: 99 }).kind, 'measured');
});

test('shares: tier widths for the bars add up to one', () => {
  const p = m.place(m.DEFAULT);
  const s = m.shares(p);
  near(s.vram + s.ram + s.ssd, 1, 1e-9);
  assert.ok(s.vram > 0.25 && s.vram < 0.27);
});
