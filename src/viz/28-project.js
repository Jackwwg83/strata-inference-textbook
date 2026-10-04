/* Chapter 28 widgets: a vertical-slice project planner and a rubric self-check.
   All visible text lives in the T table below (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.project;

  const T = Viz.t({
    zh: {
      code: 'SLICE_PLAN', title: '项目规划器：横着铺，还是竖着切', tag: '教学推演 · 一格 = 一周',
      intro: '课程项目有 4 个功能（行），每个功能要走完 4 步（列）：写代码、写测试、接进主路径、真实运行留下证据。每一格算一周，一次只做一格。选一种做法，按 <b>推进到截止</b>，看截止那天手里有几个真正能演示的功能。',
      lgDone: '这一格做完了', lgNow: '本周正在做', lgRework: '返工：接口假设错了，代码要改', lgTodo: '还没做',
      stages: ['写代码', '写测试', '接进主路径', '真实证据'],
      feats: { f1: '生成一个 token', f2: '保存与恢复', f3: '分段预填充', f4: '草稿与验证' },
      strat: { horizontal: '横向铺开：先把每列做完', vertical: '纵切优先：一行做到底' },
      stratShort: { horizontal: '横向铺开', vertical: '纵切优先' },
      budget: '离截止还有几周', hidden: '接口里藏着一个错误假设', hiddenOn: '打开', hiddenOff: '关闭',
      bGo: '▶ 推进到截止', bStep: '单周 ▶', bReset: '重来',
      gridLabel: '4 个功能 × 4 个步骤的进度表',
      wk: (n) => `第 ${n} 周`, rw: (n) => `返工 ${n}`,
      sDoneK: '截止时完整可演示的功能', sDoneF: '<b>= 四步全做完、留下真实证据的功能数</b>',
      sFirstK: '第一份真实证据出现在', sFirstF: (none) => none ? '<b>截止前一份都没有</b><br>老师只能看到代码和测试' : '<b>越早，越早发现系统层面的问题</b>',
      sReworkK: '返工花掉的周数', sReworkF: (now, all) => `<b>截止前已返工 ${now} 周</b><br>做完全部还要返工 ${all} 周`,
      ready: '<span class="c">$</span> ready. 选好做法，按 [ ▶ 推进到截止 ] 或 [ 单周 ▶ ]',
      lWeek: (n, f, s) => `<span class="m">第 ${n} 周</span> ${f}：${s}`,
      lRework: (n, f) => `<span class="m">第 ${n} 周</span> <span class="y">返工</span> ${f}：接进主路径时发现接口假设错了，已写的代码要改`,
      lSurprise: '<span class="y">// 第一次接进主路径，暴露了一个所有模块都依赖的错误假设</span>',
      lEnd: (c) => `<span class="w">截止</span> 完整可演示的功能：${c} 个`,
      lOver: '<span class="c">// 所有工作都做完了</span>',
      vSome: (name, c, first) => `${name}：截止时有 <b>${c}</b> 个功能从输入到输出完整跑通，第一份真实证据出现在第 <b>${first}</b> 周。`,
      vVertTail: '没做完的功能是“还没开始”，而不是“做了一半”。',
      vNoneH: '横向铺开：截止时完整可演示的功能是 <b>0</b> 个。代码和测试写了很多，可还没有一个功能接进主路径、跑出真实数据。这正是 Strata 那个 PLE 模块的处境：零件全部通过了测试，却没被调用。',
      vNoneV: '纵切优先：周数太少，第一个功能还没走完四步。再多给一两周，它就能拿出第一份真实证据。',
      vHiddenH: (all) => `<br>藏着的错误假设在第一次接线时才暴露，这时 4 个功能的代码都已经按错误的假设写好了，全部要改：一共返工 ${all} 周。`,
      vHiddenV: '<br>纵切时，错误假设在第一个功能接线时就暴露了，只有 1 个功能需要返工，后面的功能直接按正确的接口写。',
      vAll: '<br>时间足够时，两种做法最终都能做完；区别在于中途任何一个时刻，你手里有什么可以演示、可以验证。',
      try: [
        '保持 10 周，分别用两种做法推进到截止：纵切能演示 2 个功能，横向铺开一个也没有。',
        '打开 <b>接口里藏着一个错误假设</b>，再比一次：横向铺开要返工 4 周，纵切只返工 1 周。越早接线，越早发现问题。',
        '把周数拉到 <b>20</b>：两种做法最终都能做完。再看“第一份真实证据”是第几周，想一想中途被检查时谁更从容。',
      ],

      rCode: 'RUBRIC', rTitle: '交付自检：按评分表给自己打分', rTag: '教学推演 · 评分表见本章',
      rIntro: '勾选你的报告里<b>已经有</b>的内容，右边实时算分。最下面两条是红线：一旦触碰，对应的整项清零，其他项做得再好也补不回来。',
      rLgBar: '条长 = 这一项的得分占满分的比例', rLgZero: '被红线清零的一项',
      dims: { theory: '原理与推导', source: '源码与契约', impl: '实现与测试', experiment: '实验与质量', expr: '表达与可复现' },
      dimHead: (name, max) => `${name}（${max}）`,
      items: {
        't-formula': '写出关键公式，带单位', 't-deps': '说明公式依赖哪些前提', 't-hand': '给出一个能手算核对的小例子',
        's-pin': '源码引用指向固定提交和行号', 's-history': '分清当前代码和过时的注释', 's-contract': '写出你依赖的接口契约',
        'i-run': '代码能在别人的机器上运行', 'i-oracle': '有独立的参照答案', 'i-mutant': '有故意注入 bug 的负例，且测试会失败', 'i-edge': '测了边界：空输入、超长、N = 1',
        'x-ab': 'A/B 一次只改一个因素，交替运行', 'x-raw': '保留每次运行的原始数据', 'x-gate': '先过质量门，再比速度', 'x-fail': '失败和异常的运行也计入',
        'e-env': '写清硬件、版本和配置', 'e-repro': '别人能照步骤复现', 'e-limits': '写明局限和没做的事',
      },
      red: { simAsReal: '把模拟或推算的数字写成了实测', stateLeak: '有没说明的状态串用（两个会话共用了状态）' },
      redTitle: '两条红线',
      sTotK: '总分', sTotF: '<b>= 五项得分相加，满分 100</b><br>红线会把对应的一整项清零',
      sDimK: '各项得分', sWeakK: '最该补的一项', sWeakF: '<b>得分比例最低的一项</b>；并列时选分值更大的',
      rReady: '<span class="c">$</span> 勾选一项，就会在这里看到加了几分',
      rAdd: (name, pts) => `<span class="m">+${pts}</span> ${name}`,
      rDel: (name, pts) => `<span class="m">−${pts}</span> ${name}`,
      rRedOn: (name, dim) => `<span class="y">红线</span> ${name} → “${dim}”清零`,
      rRedOff: (name) => `<span class="c">解除</span> ${name}`,
      vScore: (t, weak) => `现在 <b>${t}</b> 分。最该补的是“${weak}”。`,
      vRedSim: '<br>把模拟数字写成实测，整项“实验与质量”作废：读者没法再相信你的任何一个数。改正的办法很简单：标清“教学推演”或“实测”。',
      vRedLeak: '<br>存在没说明的状态串用，“实现与测试”清零：速度再快，也抵消不了算错。',
      vFull: '<br>满分。别忘了：评分表检查的是证据，不是结论有多漂亮。',
      rTry: [
        '先只勾“实现与测试”的四项：25 分。再勾“把模拟数字写成实测”这条红线，看看哪一项被清零。',
        '把“实验与质量”的四项全勾上，再触碰红线：20 分一下子没了。一个造假的数字，会让同一项里的诚实工作也作废。',
        '试着凑到 80 分以上：你会发现最便宜的分数是“写清环境”“写明局限”这类表达项。它们不难，却最常被漏掉。',
      ],
    },
    en: {
      code: 'SLICE_PLAN', title: 'Project planner: build across, or slice down?', tag: 'Teaching estimate · one cell = one week',
      intro: 'The course project has 4 features (rows), and each feature must go through 4 steps (columns): write the code, write the tests, wire it into the main path, and leave evidence from a real run. Each cell takes one week, and you work on one cell at a time. Pick an approach, press <b>Run to deadline</b>, and see how many features you can really demo on deadline day.',
      lgDone: 'This cell is done', lgNow: 'Working on it this week', lgRework: 'Rework: an interface assumption was wrong, so code must change', lgTodo: 'Not started',
      stages: ['Code', 'Tests', 'Wire in', 'Evidence'],
      feats: { f1: 'Generate one token', f2: 'Save and restore', f3: 'Chunked prefill', f4: 'Draft and verify' },
      strat: { horizontal: 'Horizontal: finish each column first', vertical: 'Vertical slice: one row end to end' },
      stratShort: { horizontal: 'Horizontal', vertical: 'Vertical slice' },
      budget: 'Weeks until the deadline', hidden: 'A wrong assumption hides in the interface', hiddenOn: 'On', hiddenOff: 'Off',
      bGo: '▶ Run to deadline', bStep: 'One week ▶', bReset: 'Start over',
      gridLabel: 'Progress table of 4 features × 4 steps',
      wk: (n) => `Wk ${n}`, rw: (n) => `Redo ${n}`,
      sDoneK: 'Features fully demo-ready at the deadline', sDoneF: '<b>= features with all four steps done and real evidence left behind</b>',
      sFirstK: 'First real evidence appears in', sFirstF: (none) => none ? '<b>None at all before the deadline</b><br>the teacher can see only code and tests' : '<b>The sooner, the sooner you find system-level problems</b>',
      sReworkK: 'Weeks spent on rework', sReworkF: (now, all) => `<b>${now} week${now === 1 ? '' : 's'} of rework before the deadline</b><br>finishing everything takes ${all} week${all === 1 ? '' : 's'} of rework`,
      ready: '<span class="c">$</span> ready. Pick an approach, then press [ ▶ Run to deadline ] or [ One week ▶ ]',
      lWeek: (n, f, s) => `<span class="m">Week ${n}</span> ${f}: ${s}`,
      lRework: (n, f) => `<span class="m">Week ${n}</span> <span class="y">rework</span> ${f}: wiring it into the main path showed an interface assumption was wrong; the code already written must change`,
      lSurprise: '<span class="y">// the first wiring into the main path exposed a wrong assumption that every module depends on</span>',
      lEnd: (c) => `<span class="w">deadline</span> features fully demo-ready: ${c}`,
      lOver: '<span class="c">// all the work is done</span>',
      vSome: (name, c, first) => `${name}: at the deadline, <b>${c}</b> ${c === 1 ? 'feature runs' : 'features run'} end to end from input to output, and the first real evidence appeared in week <b>${first}</b>. `,
      vVertTail: 'The unfinished features are "not started yet", not "half done".',
      vNoneH: 'Horizontal: <b>0</b> features are fully demo-ready at the deadline. Lots of code and tests are written, yet not one feature is wired into the main path and producing real data. That is exactly the situation of Strata\'s PLE module: every part passed its tests, yet none was ever called.',
      vNoneV: 'Vertical slice: too few weeks; the first feature has not finished all four steps yet. One or two more weeks and it would produce its first real evidence.',
      vHiddenH: (all) => `<br>The hidden wrong assumption surfaced only at the first wiring, when the code for all 4 features had already been written on that wrong assumption. All of it must change: ${all} week${all === 1 ? '' : 's'} of rework in total.`,
      vHiddenV: '<br>With vertical slices, the wrong assumption surfaced when the first feature was wired in. Only 1 feature needs rework, and the later features are written against the correct interface from the start.',
      vAll: '<br>Given enough time, both approaches finish everything. The difference is what you have to demo and verify at any moment along the way.',
      try: [
        'Keep 10 weeks and run each approach to the deadline: vertical slices can demo 2 features, horizontal not even one.',
        'Turn on <b>A wrong assumption hides in the interface</b> and compare again: horizontal needs 4 weeks of rework, vertical only 1. The earlier you wire things up, the earlier you find problems.',
        'Drag the weeks to <b>20</b>: both approaches finish everything. Now look at which week the "first real evidence" appears, and think about who is more relaxed when checked halfway.',
      ],

      rCode: 'RUBRIC', rTitle: 'Delivery self-check: grade yourself on the rubric', rTag: 'Teaching estimate · rubric in this chapter',
      rIntro: 'Tick what your report <b>already has</b>, and the score on the right updates live. The bottom two items are red lines: cross one and its whole dimension drops to zero, and no amount of good work elsewhere can win it back.',
      rLgBar: 'Bar length = this dimension\'s score as a share of its maximum', rLgZero: 'A dimension zeroed by a red line',
      dims: { theory: 'Theory and derivation', source: 'Source and contracts', impl: 'Code and tests', experiment: 'Experiments and quality', expr: 'Writing and replication' },
      dimHead: (name, max) => `${name} (${max})`,
      items: {
        't-formula': 'Key formulas written out, with units', 't-deps': 'States the assumptions each formula relies on', 't-hand': 'Gives a small example you can check by hand',
        's-pin': 'Source citations point to a fixed commit and line numbers', 's-history': 'Tells current code apart from outdated comments', 's-contract': 'Writes out the interface contracts you depend on',
        'i-run': 'The code runs on someone else\'s machine', 'i-oracle': 'Has an independent reference answer', 'i-mutant': 'Has negative cases with planted bugs, and the tests fail on them', 'i-edge': 'Tests the edges: empty input, very long input, N = 1',
        'x-ab': 'A/B changes one factor at a time and alternates runs', 'x-raw': 'Keeps the raw data of every run', 'x-gate': 'Passes the quality gate before comparing speed', 'x-fail': 'Counts failed and abnormal runs too',
        'e-env': 'States the hardware, versions and configuration', 'e-repro': 'Others can reproduce it by following the steps', 'e-limits': 'States the limitations and what was not done',
      },
      red: { simAsReal: 'Simulated or estimated numbers presented as measurements', stateLeak: 'An unexplained state leak (two sessions shared state)' },
      redTitle: 'Two red lines',
      sTotK: 'Total score', sTotF: '<b>= sum of the five dimensions, out of 100</b><br>a red line zeroes its whole dimension',
      sDimK: 'Score by dimension', sWeakK: 'What to fix first', sWeakF: '<b>the dimension with the lowest share of its points</b>; on a tie, the one worth more',
      rReady: '<span class="c">$</span> tick an item and you will see here how many points it adds',
      rAdd: (name, pts) => `<span class="m">+${pts}</span> ${name}`,
      rDel: (name, pts) => `<span class="m">−${pts}</span> ${name}`,
      rRedOn: (name, dim) => `<span class="y">red line</span> ${name} → "${dim}" zeroed`,
      rRedOff: (name) => `<span class="c">cleared</span> ${name}`,
      vScore: (t, weak) => `You now have <b>${t}</b> points. Fix "${weak}" first.`,
      vRedSim: '<br>Presenting simulated numbers as measurements voids the whole "Experiments and quality" dimension: readers can no longer trust any of your numbers. The fix is simple: label them clearly as "Teaching estimate" or "measured".',
      vRedLeak: '<br>An unexplained state leak zeroes "Code and tests": no speed can make up for wrong results.',
      vFull: '<br>Full marks. Remember: the rubric checks the evidence, not how pretty the conclusion is.',
      rTry: [
        'Tick only the four "Code and tests" items: 25 points. Then tick the red line "simulated numbers presented as measurements" and see which dimension gets zeroed.',
        'Tick all four "Experiments and quality" items, then cross the red line: 20 points vanish at once. One faked number voids the honest work in the same dimension too.',
        'Try to get above 80: you will find the cheapest points are writing items such as "states the hardware" and "states the limitations". They are not hard, yet they are the most often left out.',
      ],
    },
  });

  async function guardRun(el, ctx, state, fn) {
    if (state.busy) return;
    state.busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { if (ctx.alive) throw e; }
    state.busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
  }
  const pick = (btns, i) => btns.forEach((b, j) => { b.classList.toggle('alt', j === i); b.classList.toggle('ghost', j !== i); b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });

  Viz.register('slice-planner', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgDone, glow: true },
        { color: 'var(--a2)', text: T.lgNow },
        { color: 'var(--a3)', text: T.lgRework },
        { color: 'var(--frame)', text: T.lgTodo },
      ]));
      const pipe = Viz.pipe(body, T.stages);
      body.insertAdjacentHTML('beforeend',
        `<div class="viz-row sp-strat">${Viz.button(T.strat.horizontal, 'ghost')}${Viz.button(T.strat.vertical, 'ghost')}</div>
         <div class="viz-slider"><label>${T.budget}</label><input class="sp-b" type="range" min="4" max="20" value="10" aria-label="${Viz.esc(T.budget)}"><output class="sp-bo"></output></div>
         <div class="viz-row sp-hid"><span style="font-size:14px">${T.hidden}</span>${Viz.button(T.hiddenOff, 'alt')}${Viz.button(T.hiddenOn, 'ghost')}</div>
         <div class="viz-cols" style="margin-top:14px"><div class="viz-left"></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.insertAdjacentHTML('beforeend', `<div class="sp-grid" role="table" aria-label="${Viz.esc(T.gridLabel)}" style="display:grid;grid-template-columns:minmax(0,1.3fr) repeat(4,minmax(0,1fr));gap:3px;font-size:13px;line-height:1.35">
        <div></div>${T.stages.map(s => `<div style="color:var(--muted);text-align:center;padding:4px 2px;font-size:12px">${s}</div>`).join('')}
        ${M.FEATURES.map(f => `<div style="padding:8px 4px;border:1px solid var(--frame)">${T.feats[f]}</div>${M.STAGES.map(s => `<div data-c="${f}-${s}" style="text-align:center;padding:8px 2px;border:1px solid var(--frame);font-family:var(--mono);font-size:12px;color:var(--muted)"></div>`).join('')}`).join('')}
      </div>
      <div class="viz-row">${Viz.button(T.bGo)}${Viz.button(T.bStep, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'sp-done', k: T.sDoneK, v: '—', f: T.sDoneF, hot: true }) +
        Viz.stat({ id: 'sp-first', k: T.sFirstK, v: '—', f: '' }) +
        Viz.stat({ id: 'sp-rw', k: T.sReworkK, v: '—', f: '' });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const stratBtns = [...el.querySelectorAll('.sp-strat .viz-btn')], hidBtns = [...el.querySelectorAll('.sp-hid .viz-btn')];
      const [goBtn, stepBtn, resetBtn] = left.querySelectorAll('.viz-row .viz-btn');
      const state = { busy: false, strategy: 'vertical', hidden: false, week: 0 };
      const full = () => M.plan(state.strategy, +$('.sp-b').value, state.hidden);

      function paint(upTo, current) {
        const r = full(), shown = r.weeks.slice(0, upTo), reworks = {};
        el.querySelectorAll('[data-c]').forEach(c => { c.textContent = ''; c.style.background = 'transparent'; c.style.color = 'var(--muted)'; });
        shown.forEach((w, i) => {
          if (w.stage === 'rework') { reworks[w.feature] = (reworks[w.feature] || 0) + 1; const c = $(`[data-c="${w.feature}-code"]`); c.textContent = T.rw(w.week); c.style.background = 'color-mix(in srgb,var(--a3) 30%,transparent)'; c.style.color = 'var(--ink)'; return; }
          const c = $(`[data-c="${w.feature}-${w.stage}"]`);
          c.textContent = T.wk(w.week);
          const now = current && i === shown.length - 1;
          c.style.background = now ? 'color-mix(in srgb,var(--a2) 30%,transparent)' : 'color-mix(in srgb,var(--accent) 24%,transparent)';
          c.style.color = 'var(--ink)';
        });
        const last = shown[shown.length - 1];
        pipe.set(last ? (last.stage === 'rework' ? 0 : M.STAGES.indexOf(last.stage)) : -1);
        // stats for what has happened so far
        const sub = M.plan(state.strategy, upTo, state.hidden);
        $('[data-s=sp-done-v]').textContent = `${sub.complete} / 4`;
        $('[data-s=sp-first-v]').textContent = sub.firstEvidence ? T.wk(sub.firstEvidence) : '—';
        $('[data-s=sp-first-f]').innerHTML = T.sFirstF(!sub.firstEvidence);
        $('[data-s=sp-rw-v]').textContent = String(sub.rework);
        $('[data-s=sp-rw-f]').innerHTML = T.sReworkF(sub.rework, r.reworkAll);
        return { r, sub };
      }
      function logWeek(w, r) {
        if (w.stage === 'rework') {
          if (r.weeks.findIndex(x => x.stage === 'rework') === w.week - 1) term.log(T.lSurprise);
          term.log(T.lRework(w.week, T.feats[w.feature]));
        } else term.log(T.lWeek(w.week, T.feats[w.feature], T.stages[M.STAGES.indexOf(w.stage)]));
      }
      function finish() {
        const { r, sub } = paint(state.week, false);
        term.log(T.lEnd(sub.complete));
        if (r.weeks.length < r.budget) term.log(T.lOver);
        const vert = state.strategy === 'vertical';
        let html = sub.complete > 0 ? T.vSome(T.stratShort[state.strategy], sub.complete, sub.firstEvidence) + (vert && sub.complete < 4 ? T.vVertTail : '') : (vert ? T.vNoneV : T.vNoneH);
        if (state.hidden) html += state.strategy === 'horizontal' ? T.vHiddenH(r.reworkAll) : T.vHiddenV;
        if (sub.complete === 4) html += T.vAll;
        const v = $('.viz-verdict'); v.innerHTML = html; v.hidden = false;
      }
      function reset() {
        state.week = 0; term.clear(); term.log(T.ready); $('.viz-verdict').hidden = true;
        $('.sp-bo').textContent = $('.sp-b').value;
        pick(stratBtns, state.strategy === 'horizontal' ? 0 : 1); pick(hidBtns, state.hidden ? 1 : 0);
        paint(0, false); pipe.set(-1);
      }
      goBtn.onclick = () => guardRun(el, ctx, state, async () => {
        const r = full();
        if (state.week >= r.weeks.length) { reset(); }
        while (state.week < r.weeks.length) {
          state.week++;
          logWeek(r.weeks[state.week - 1], r);
          paint(state.week, true);
          await ctx.sleep(260);
        }
        finish();
      });
      stepBtn.onclick = () => guardRun(el, ctx, state, async () => {
        const r = full();
        if (state.week >= r.weeks.length) { reset(); return; }
        state.week++;
        logWeek(r.weeks[state.week - 1], r);
        paint(state.week, true);
        if (state.week === r.weeks.length) finish();
      });
      resetBtn.onclick = () => { if (!state.busy) reset(); };
      stratBtns.forEach((b, i) => { b.onclick = () => { if (!state.busy) { state.strategy = i ? 'vertical' : 'horizontal'; reset(); } }; });
      hidBtns.forEach((b, i) => { b.onclick = () => { if (!state.busy) { state.hidden = i === 1; reset(); } }; });
      $('.sp-b').oninput = () => { if (!state.busy) reset(); };
      reset();
    },
  });

  Viz.register('rubric-check', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.rCode, title: T.rTitle, tag: T.rTag, intro: T.rIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.rLgBar, glow: true },
        { color: 'var(--a2)', text: T.rLgZero },
      ]));
      const list = M.RUBRIC.map(d => `<fieldset style="border:1px solid var(--frame);margin:0 0 10px;padding:8px 12px;min-width:0"><legend style="font-size:14px;font-weight:600;padding:0 4px">${T.dimHead(T.dims[d.id], d.max)}</legend>${d.items.map(i => `<label style="display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.6;margin:4px 0"><input type="checkbox" data-i="${i.id}" style="margin-top:5px;accent-color:var(--accent)"><span>${T.items[i.id]} <span style="font-family:var(--mono);color:var(--muted)">+${i.pts}</span></span></label>`).join('')}</fieldset>`).join('');
      const reds = Object.keys(M.RED_LINES).map(r => `<label style="display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.6;margin:4px 0;color:var(--a2)"><input type="checkbox" data-r="${r}" style="margin-top:5px;accent-color:var(--a2)"><span>${T.red[r]}</span></label>`).join('');
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">${list}<fieldset style="border:1px dashed var(--a2);margin:0;padding:8px 12px;min-width:0"><legend style="font-size:14px;font-weight:600;padding:0 4px;color:var(--a2)">${T.redTitle}</legend>${reds}</fieldset></div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      right.innerHTML =
        Viz.stat({ id: 'rb-t', k: T.sTotK, v: '0', f: T.sTotF, hot: true }) +
        `<div class="viz-stat"><div class="k">${T.sDimK}</div><div class="viz-bars rb-bars"></div></div>` +
        Viz.stat({ id: 'rb-w', k: T.sWeakK, v: '—', f: T.sWeakF });
      const term = Viz.term(right, T.rReady);
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.rTry) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const ptsOf = Object.fromEntries(M.RUBRIC.flatMap(d => d.items.map(i => [i.id, i.pts])));
      function update() {
        const checked = new Set([...el.querySelectorAll('[data-i]')].filter(x => x.checked).map(x => x.dataset.i));
        const red = new Set([...el.querySelectorAll('[data-r]')].filter(x => x.checked).map(x => x.dataset.r));
        const s = M.score(checked, red);
        $('[data-s=rb-t-v]').textContent = String(s.total);
        $('.rb-bars').innerHTML = s.byDim.map(d => `<div style="grid-template-columns:84px minmax(0,1fr) 44px"><span>${T.dims[d.id]}</span><i style="width:${(d.got / d.max * 100).toFixed(0)}%;${d.zeroed ? 'background:var(--a2);min-width:4px' : ''}"></i><span>${d.got}/${d.max}</span></div>`).join('');
        $('[data-s=rb-w-v]').textContent = T.dims[s.weakest];
        let html = T.vScore(s.total, T.dims[s.weakest]);
        if (red.has('simAsReal')) html += T.vRedSim;
        if (red.has('stateLeak')) html += T.vRedLeak;
        if (s.total === 100) html += T.vFull;
        const v = $('.viz-verdict'); v.innerHTML = html; v.hidden = !(checked.size || red.size);
      }
      el.querySelectorAll('[data-i]').forEach(x => { x.onchange = () => { term.log((x.checked ? T.rAdd : T.rDel)(T.items[x.dataset.i], ptsOf[x.dataset.i])); update(); }; });
      el.querySelectorAll('[data-r]').forEach(x => { x.onchange = () => { term.log(x.checked ? T.rRedOn(T.red[x.dataset.r], T.dims[M.RED_LINES[x.dataset.r]]) : T.rRedOff(T.red[x.dataset.r])); update(); }; });
      update();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
