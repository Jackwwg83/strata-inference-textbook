/* Chapter 01 widgets: one token's journey through the six steps, and the wait for the first token.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.journey;

  const T = Viz.t({
    zh: {
      code: 'TOKEN_JOURNEY', title: '一个 token 的旅程', tag: '教学推演 · 编号和概率为示意',
      intro: '按 <b>单步</b>，跟着一句话走完图 1-1 的六步。走到第 ⑥ 步后，新 token 接到末尾，再回到第 ④ 步。每转一圈，回答多一个 token。',
      lgNow: '正在进行的一步', lgMark: '模板加的标记', lgNew: '刚生成的 token',
      steps: ['你的消息', '聊天模板', '分词器', '推理引擎', '采样', '解码推送'],
      bStep: '▶ 单步', bAuto: '▶▶ 自动走完', bReset: '重置',
      stageTitle: '此刻手里的数据',
      message: 'MoE 是什么？',
      tplNote: '模板告诉模型：谁在说话，轮到谁回答',
      idsNote: (n) => `模型只看到这 ${n} 个整数`,
      layer: (l) => `第 ${l} / 48 层`,
      engineOut: '输出：给词表里每个 token 打一个分',
      candNote: '分数换成概率，这里挑最高的一个',
      answerLabel: '屏幕上的回答',
      // Illustrative tokens and ids; [label, id, isTemplateMark].
      prompt: [['〈用户〉', 3, true], ['MoE', 5402], ['是', 1187], ['什么', 2310], ['？', 1311], ['〈结束〉', 4, true], ['〈助手〉', 5, true]],
      rounds: [
        { id: 5402, cands: [['MoE', 0.62], ['它', 0.25], ['这', 0.13]] },
        { id: 1187, cands: [['是', 0.71], ['指', 0.18], ['，', 0.11]] },
        { id: 2741, cands: [['一种', 0.55], ['一个', 0.30], ['混合', 0.15]] },
        { id: 3306, cands: [['模型', 0.48], ['架构', 0.37], ['方法', 0.15]] },
      ],
      tpl: (msg) => `<span style="color:var(--a2)">〈用户〉</span> ${msg} <span style="color:var(--a2)">〈结束〉</span><br><span style="color:var(--a2)">〈助手〉</span>`,
      empty: '（还没有）',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始，每按一次走流程条上的一步',
      l0: '<span class="c">①</span> 你输入“MoE 是什么？”。这时它还只是一串文字',
      l1: '<span class="c">②</span> 套上聊天模板：加上〈用户〉〈结束〉〈助手〉这类标记，告诉模型谁在说话、轮到谁答',
      l2: (n) => `<span class="c">③</span> 分词器把文字切成 ${n} 个 token，再换成编号。从这里起，模型只和整数打交道`,
      l3: (n) => `<span class="m">④</span> 引擎读入 ${n} 个编号，逐层算完 48 层，给词表里每个 token 打一个分`,
      l4: (tok, p) => `<span class="y">⑤</span> 采样：把分数换成概率，挑出“${tok}”（概率 ${p}）。这里总挑最高的，第 2 章讲怎样按概率随机挑`,
      l5: (id, tok, ans) => `<span class="w">⑥</span> 把编号 ${id} 换回文字“${tok}”，推到屏幕上。回答目前是：${ans}`,
      loop: (n) => `<span class="y">// 回答没写完：新 token 接到末尾，回到第 ④ 步。已生成 ${n} 个 token</span>`,
      done: (n) => `<span class="y">完成</span>：${n} 个 token，第 ④–⑥ 步转了 ${n} 圈；第 ①–③ 步只走了 1 次`,
      restart: '<span class="y">// 从头再来一遍</span>',
      sGenK: '已经生成的 token', sGenF: '<b>= 第 ④–⑥ 步转过的圈数</b><br>一圈只产出一个 token',
      sInK: '这一圈引擎读入的 token', sInF: (p, n) => `<b>= 提问 ${p} 个 + 已生成 ${n} 个</b><br>每一圈的输入都包含上一圈的输出`,
      sHeadK: '第 ①–③ 步走了几次', sHeadF: '<b>只在开头走一次</b><br>之后每个 token 只重复 ④–⑥',
      try: [
        '连按 <b>单步</b>，看流程条走到 ⑥ 之后跳回 ④。这就是图 1-1 里那条虚线。',
        '盯住右边的“引擎读入的 token”：每转一圈加 1。模型每一步都要重新看见自己刚写的字，这叫<b>自回归</b>。',
        '按 <b>自动走完</b>：4 个 token 转了 4 圈，①–③ 只走 1 次。回答越长，第 ④ 步的速度越要紧。',
      ],
      verdict: '① 回答有几个 token，第 ④–⑥ 步就转几圈。<br>② 第 ①–③ 步只在开头走一次。<br>③ 所以写答案的快慢，主要看引擎转一圈要多久：这正是后面各章要拆开讲的事。',

      wCode: 'FIRST_TOKEN', wTitle: '等第一个字要多久', wTag: '上游实测 · 教学推演',
      wIntro: '一次回答 = 读题（prefill）+ 写答案（decode）。拖动滑块改变提问长度和回答长度，按 <b>播放</b> 看两段时间各占多少。速度取自上游实测：RTX 5070 12 GB，Q2_0，引擎 0.1.26。',
      wLgPre: '读题：整段提问一起算', wLgDec: '写答案：一轮一个 token',
      wLen: '提问长度', wAns: '回答长度', wGo: '▶ 播放',
      wClock: (s) => `t = ${s} 秒`,
      wFirst: '等第一个字', wFirstF: (n, pp) => `<b>= ${n} ÷ ${pp} token/s</b><br>提问越长，等得越久`,
      wAnsK: '写完回答', wAnsF: (m, tg) => `<b>= ${m} ÷ ${tg} token/s</b><br>一轮一个 token`,
      wShareK: '读题占总时间', wShareF: '<b>= 等第一个字 ÷ 总时间</b>',
      sec: (s) => `${s} 秒`,
      wNote: '按 1K = 1,024 个 token 估算。README 给的经验值更保守：第一条消息大约每 30,000 个 token 要读 1 分钟。',
      wTry: [
        '把提问长度从 4K 拉到 128K：等第一个字从约 3 秒变成约 1 分钟，写答案的时间几乎不变。',
        '把回答长度拉到 1000：写答案按比例变长，读题时间纹丝不动。两段时间由不同的因素决定。',
        '看 1K 那一档：读题速度只有每秒 536 个，不到 4K 档的一半。读题速度不是常数，报数字要带上长度。',
      ],
      wVerdict: (n, first, m, ans, ratio) => `① 提问 ${n} 个 token 时，要先等 <b>${first} 秒</b> 才看到第一个字。<br>② 之后 ${m} 个 token 的回答只要 ${ans} 秒。<br>③ 读题每秒处理的 token 是写答案的 ${ratio} 倍，因为提问里的 token 能一起算（第 16 章细讲）。`,
    },
    en: {
      code: 'TOKEN_JOURNEY', title: 'One token\'s journey', tag: 'Teaching estimate · IDs and probabilities are made up',
      intro: 'Press <b>Step</b> and follow one sentence through the six steps of Figure 1-1. After step ⑥, the new token is appended and we go back to step ④. Each lap adds one token to the answer.',
      lgNow: 'The step happening now', lgMark: 'Marks added by the template', lgNew: 'The token just generated',
      steps: ['Your message', 'Chat template', 'Tokenizer', 'Engine', 'Sampling', 'Detokenize'],
      bStep: '▶ Step', bAuto: '▶▶ Run to the end', bReset: 'Reset',
      stageTitle: 'DATA IN HAND RIGHT NOW',
      message: 'What is MoE?',
      tplNote: 'The template tells the model who is speaking and whose turn it is to answer',
      idsNote: (n) => `The model sees only these ${n} integers`,
      layer: (l) => `Layer ${l} / 48`,
      engineOut: 'Output: a score for every token in the vocabulary',
      candNote: 'Scores become probabilities; here we pick the highest one',
      answerLabel: 'The answer on screen',
      // Illustrative tokens and ids; [label, id, isTemplateMark].
      prompt: [['⟨user⟩', 3, true], ['What', 3923], [' is', 374], [' MoE', 5402], ['?', 30], ['⟨end⟩', 4, true], ['⟨assistant⟩', 5, true]],
      rounds: [
        { id: 6125, cands: [['MoE', 0.62], ['It', 0.25], ['This', 0.13]] },
        { id: 374, cands: [[' is', 0.71], [' means', 0.18], [',', 0.11]] },
        { id: 264, cands: [[' a', 0.55], [' one', 0.30], [' an', 0.15]] },
        { id: 1646, cands: [[' model', 0.48], [' design', 0.37], [' way', 0.15]] },
      ],
      tpl: (msg) => `<span style="color:var(--a2)">⟨user⟩</span> ${msg} <span style="color:var(--a2)">⟨end⟩</span><br><span style="color:var(--a2)">⟨assistant⟩</span>`,
      empty: '(nothing yet)',
      ready: '<span class="c">$</span> ready. Press [ ▶ Step ] to begin; each press moves one step along the strip',
      l0: '<span class="c">①</span> You type "What is MoE?". Right now it is still just a string of text',
      l1: '<span class="c">②</span> Wrap it in the chat template: add marks like ⟨user⟩ ⟨end⟩ ⟨assistant⟩ that tell the model who is speaking and whose turn it is',
      l2: (n) => `<span class="c">③</span> The tokenizer cuts the text into ${n} tokens and turns them into IDs. From here on, the model deals only with integers`,
      l3: (n) => `<span class="m">④</span> The engine reads ${n} IDs, runs all 48 layers, and gives every token in the vocabulary a score`,
      l4: (tok, p) => `<span class="y">⑤</span> Sampling: turn the scores into probabilities and pick "${tok}" (probability ${p}). Here we always pick the highest; Chapter 2 shows how to pick at random by probability`,
      l5: (id, tok, ans) => `<span class="w">⑥</span> Turn ID ${id} back into the text "${tok}" and push it to the screen. The answer so far: ${ans}`,
      loop: (n) => `<span class="y">// answer not done: append the new token and go back to step ④. ${n} tokens generated so far</span>`,
      done: (n) => `<span class="y">Done</span>: ${n} tokens, so steps ④–⑥ ran ${n} laps; steps ①–③ ran only once`,
      restart: '<span class="y">// starting over from the top</span>',
      sGenK: 'Tokens generated so far', sGenF: '<b>= laps through steps ④–⑥</b><br>each lap produces only one token',
      sInK: 'Tokens the engine reads this lap', sInF: (p, n) => `<b>= ${p} in the prompt + ${n} generated</b><br>every lap's input includes the previous lap's output`,
      sHeadK: 'Times steps ①–③ ran', sHeadF: '<b>only once, at the start</b><br>after that each token repeats only ④–⑥',
      try: [
        'Keep pressing <b>Step</b> and watch the strip jump from ⑥ back to ④. That is the dashed line in Figure 1-1.',
        'Watch "Tokens the engine reads" on the right: it grows by 1 every lap. At every step the model must see again the words it just wrote; this is called <b>autoregressive</b>.',
        'Press <b>Run to the end</b>: 4 tokens take 4 laps, and ①–③ run only once. The longer the answer, the more the speed of step ④ matters.',
      ],
      verdict: '① An answer with n tokens takes n laps through steps ④–⑥.<br>② Steps ①–③ run only once, at the start.<br>③ So how fast the answer is written depends mainly on how long one lap through the engine takes: exactly what later chapters take apart.',

      wCode: 'FIRST_TOKEN', wTitle: 'How long until the first word?', wTag: 'Upstream measurement · Teaching estimate',
      wIntro: 'One answer = prefill ("reading the prompt") + decode ("writing the answer"). Drag the sliders to change the prompt length and the answer length, then press <b>Play</b> to see how much time each phase takes. Speeds come from upstream measurements: RTX 5070 12 GB, Q2_0, engine 0.1.26.',
      wLgPre: 'Prefill: the whole prompt together', wLgDec: 'Decode: one token per round',
      wLen: 'Prompt length', wAns: 'Answer length', wGo: '▶ Play',
      wClock: (s) => `t = ${s} s`,
      wFirst: 'Wait for the first word', wFirstF: (n, pp) => `<b>= ${n} ÷ ${pp} token/s</b><br>the longer the prompt, the longer the wait`,
      wAnsK: 'Finish the answer', wAnsF: (m, tg) => `<b>= ${m} ÷ ${tg} token/s</b><br>one token per round`,
      wShareK: 'Prefill share of total time', wShareF: '<b>= first-word wait ÷ total time</b>',
      sec: (s) => `${s} s`,
      wNote: 'Estimated with 1K = 1,024 tokens. The README gives a more cautious rule of thumb: the first message takes about 1 minute to read per 30,000 tokens.',
      wTry: [
        'Drag the prompt length from 4K to 128K: the wait for the first word goes from about 3 seconds to about 1 minute, while the time to write the answer barely changes.',
        'Drag the answer length to 1000: decode time grows in proportion, and prefill time does not move at all. The two phases depend on different things.',
        'Look at the 1K setting: prefill handles only 536 tokens per second, less than half the 4K rate. Prefill speed is not a constant, so always state the length with the number.',
      ],
      wVerdict: (n, first, m, ans, ratio) => `① With a ${n}-token prompt, you first wait <b>${first} s</b> before the first word appears.<br>② After that, an answer of ${m} tokens takes only ${ans} s.<br>③ Prefill handles ${ratio} times as many tokens per second as decode, because the prompt's tokens can be computed together (Chapter 16 has the details).`,
    },
  });

  const PROMPT = T.prompt, ROUNDS = T.rounds;
  const chip = (label, id, kind) => {
    const bg = kind === 'new' ? 'var(--accent)' : 'transparent';
    const fg = kind === 'new' ? 'var(--paper)' : kind === 'mark' ? 'var(--a2)' : 'var(--ink)';
    return `<span style="display:inline-flex;flex-direction:column;align-items:center;border:1px solid ${kind === 'new' ? 'var(--accent)' : 'var(--frame)'};background:${bg};color:${fg};padding:3px 7px;margin:0 4px 6px 0;font-size:13px;line-height:1.4">${Viz.esc(label)}${id !== undefined ? `<small style="font-family:var(--mono);font-size:11px;opacity:.75">${id}</small>` : ''}</span>`;
  };

  Viz.register('token-journey', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgNow, glow: true },
        { color: 'var(--a2)', text: T.lgMark },
        { color: 'var(--accent)', text: T.lgNew },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.insertAdjacentHTML('beforeend', `<div class="tj-stage" style="border:1px solid var(--frame);padding:12px 14px;min-height:190px;background:color-mix(in srgb,var(--side) 60%,transparent)">
        <div style="font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px">${T.stageTitle}</div><div class="tj-data"></div></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bAuto, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'tj-gen', k: T.sGenK, v: '0', f: T.sGenF, hot: true }) +
        Viz.stat({ id: 'tj-in', k: T.sInK, v: '—', f: T.sInF(PROMPT.length, 0) }) +
        Viz.stat({ id: 'tj-head', k: T.sHeadK, v: '0', f: T.sHeadF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try) + `<div class="viz-verdict" hidden>${T.verdict}</div>`);
      const $ = s => el.querySelector(s);
      const data = $('.tj-data');
      const [stepBtn, autoBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      let phase = 0, gen = 0, busy = false, finished = false, headDone = 0, lastIn = null;
      const answer = [];

      const idsHtml = (withNew) => PROMPT.map(([l, id, mark]) => chip(l, id, mark ? 'mark' : '')).join('') +
        answer.map((r, i) => chip(r.cands[0][0], r.id, withNew && i === answer.length - 1 ? 'new' : '')).join('');
      const answerText = () => answer.length ? answer.map(r => r.cands[0][0]).join('') : T.empty;
      function stats() {
        $('[data-s=tj-gen-v]').textContent = gen;
        $('[data-s=tj-in-v]').textContent = lastIn === null ? '—' : lastIn;
        $('[data-s=tj-in-f]').innerHTML = T.sInF(PROMPT.length, lastIn === null ? 0 : lastIn - PROMPT.length);
        $('[data-s=tj-head-v]').textContent = headDone;
      }
      function show(p, extra) {
        if (p === 0) data.innerHTML = `<div style="display:inline-block;border:1px solid var(--accent);padding:8px 14px;font-size:18px;color:var(--ink)">${T.message}</div>`;
        if (p === 1) data.innerHTML = `<div style="font-size:15px;line-height:2;color:var(--ink)">${T.tpl(T.message)}</div><div style="font-size:12px;color:var(--muted);margin-top:6px">${T.tplNote}</div>`;
        if (p === 2) data.innerHTML = `<div>${idsHtml(false)}</div><div style="font-size:12px;color:var(--muted)">${T.idsNote(PROMPT.length)}</div>`;
        if (p === 3) data.innerHTML = `<div>${idsHtml(gen > 0)}</div><div class="viz-track" style="margin:8px 0 6px"><i class="tj-bar" style="width:${(extra || 0) / 48 * 100}%"></i></div><div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;color:var(--muted)"><span class="tj-layer">${T.layer(extra || 0)}</span><span>${(extra || 0) >= 48 ? T.engineOut : ''}</span></div>`;
        if (p === 4) {
          const r = ROUNDS[gen];
          data.innerHTML = r.cands.map(([tok, pr], i) => `<div style="display:grid;grid-template-columns:52px minmax(0,1fr) 44px;gap:8px;align-items:center;margin-bottom:6px;font-size:14px;color:var(--ink)"><span>${tok}</span><span style="height:14px;border:1px solid var(--frame)"><i style="display:block;height:100%;width:${pr * 100}%;background:${i === 0 ? 'var(--accent)' : 'var(--frame)'}"></i></span><span style="font-family:var(--mono);font-size:12px;text-align:right">${pr.toFixed(2)}</span></div>`).join('') +
            `<div style="font-size:12px;color:var(--muted)">${T.candNote}</div>`;
        }
        if (p === 5) data.innerHTML = `<div style="font-size:12px;color:var(--muted);margin-bottom:6px">${T.answerLabel}</div><div style="font-size:18px;color:var(--ink)">${answer.map((r, i) => i === answer.length - 1 ? `<span style="background:var(--accent);color:var(--paper);padding:0 3px">${r.cands[0][0]}</span>` : r.cands[0][0]).join('')}</div>`;
      }
      async function step(fast) {
        if (finished) { reset(); term.log(T.restart); }
        pipe.set(phase);
        if (phase === 0) { show(0); term.log(T.l0); }
        if (phase === 1) { show(1); term.log(T.l1); }
        if (phase === 2) { show(2); headDone = 1; term.log(T.l2(PROMPT.length)); }
        if (phase === 3) {
          lastIn = M.engineInput(PROMPT.length, gen); stats();
          term.log(T.l3(lastIn));
          for (let l = 0; l <= 48; l += fast ? 48 : 4) { show(3, l); await ctx.sleep(fast ? 0 : 35); }
        }
        if (phase === 4) { show(4); const c = ROUNDS[gen].cands[0]; term.log(T.l4(c[0], c[1].toFixed(2))); }
        if (phase === 5) {
          answer.push(ROUNDS[gen]); gen++; show(5);
          term.log(T.l5(ROUNDS[gen - 1].id, ROUNDS[gen - 1].cands[0][0], answerText()));
          if (gen < ROUNDS.length) { phase = 2; term.log(T.loop(gen)); }
          else { finished = true; term.log(T.done(gen)); $('.viz-verdict').hidden = false; }
        }
        phase++;
        stats();
      }
      function reset() {
        phase = 0; gen = 0; headDone = 0; finished = false; lastIn = null; answer.length = 0;
        data.innerHTML = ''; pipe.set(-1); $('.viz-verdict').hidden = true; stats();
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
      }
      stepBtn.onclick = () => guard(() => step(false));
      autoBtn.onclick = () => guard(async () => {
        if (finished) { reset(); term.log(T.restart); }
        while (!finished) { await step(ctx.reduced); await ctx.sleep(380); }
      });
      resetBtn.onclick = () => guard(async () => { reset(); term.clear(); term.log(T.ready); });
      stats();
    },
  });

  Viz.register('first-token-wait', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.wCode, title: T.wTitle, tag: T.wTag, intro: T.wIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.wLgPre, glow: true },
        { color: 'var(--a2)', text: T.wLgDec },
      ]) + `<div class="viz-cols"><div class="viz-left">
        <div style="position:relative;height:30px;border:1px solid var(--frame);background:var(--side)"><i class="ft-pre" style="position:absolute;left:0;top:0;bottom:0;width:0;background:var(--accent);box-shadow:var(--glow)"></i><i class="ft-dec" style="position:absolute;top:0;bottom:0;width:0;background:var(--a2)"></i></div>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:6px"><span>t = 0</span><span class="ft-clk">${T.wClock('0.0')}</span></div>
        <div class="viz-slider"><label>${T.wLen}</label><input class="ft-len" type="range" min="0" max="${M.SPEEDS.length - 1}" value="1" aria-label="${Viz.esc(T.wLen)}"><output class="ft-len-o"></output></div>
        <div class="viz-slider"><label>${T.wAns}</label><input class="ft-ans" type="range" min="50" max="1000" step="50" value="300" aria-label="${Viz.esc(T.wAns)}"><output class="ft-ans-o"></output></div>
        <div class="viz-row">${Viz.button(T.wGo)}</div>
        <p style="font-size:12.5px;color:var(--muted);line-height:1.7;margin:12px 0 0">${T.wNote}</p>
      </div><div class="viz-right"></div></div>`);
      const right = body.querySelector('.viz-right');
      right.innerHTML =
        Viz.stat({ id: 'ft-first', k: T.wFirst, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'ft-ans', k: T.wAnsK, v: '', f: '' }) +
        Viz.stat({ id: 'ft-share', k: T.wShareK, v: '', f: T.wShareF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.wTry) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const len = $('.ft-len'), ans = $('.ft-ans'), pre = $('.ft-pre'), dec = $('.ft-dec'), verdict = $('.viz-verdict');
      let run = 0;
      const cur = () => M.waitTimes(+len.value, +ans.value);
      function paint(frac) {
        const w = cur(), split = w.firstS / w.totalS;
        pre.style.width = Math.min(frac, split) * 100 + '%';
        dec.style.left = split * 100 + '%';
        dec.style.width = Math.max(0, frac - split) * 100 + '%';
        $('.ft-clk').textContent = T.wClock((frac * w.totalS).toFixed(1));
      }
      function stats() {
        const w = cur();
        $('.ft-len-o').textContent = M.SPEEDS[+len.value].k + 'K';
        $('.ft-ans-o').textContent = ans.value;
        $('[data-s=ft-first-v]').textContent = T.sec(w.firstS.toFixed(1));
        $('[data-s=ft-first-f]').innerHTML = T.wFirstF(Viz.fmt(w.promptTokens), Viz.fmt(w.prefill));
        $('[data-s=ft-ans-v]').textContent = T.sec(w.answerS.toFixed(1));
        $('[data-s=ft-ans-f]').innerHTML = T.wAnsF(ans.value, w.decode.toFixed(1));
        $('[data-s=ft-share-v]').textContent = (w.firstS / w.totalS * 100).toFixed(0) + '%';
        verdict.innerHTML = T.wVerdict(Viz.fmt(w.promptTokens), w.firstS.toFixed(1), ans.value, w.answerS.toFixed(1), (w.prefill / w.decode).toFixed(0));
      }
      function play() {
        const id = ++run, t0 = performance.now(), dur = 2400;
        verdict.hidden = true;
        const tick = now => {
          if (id !== run) return;
          const f = ctx.reduced ? 1 : Math.min(1, (now - t0) / dur);
          paint(f);
          if (f < 1) ctx.raf(tick); else verdict.hidden = false;
        };
        ctx.raf(tick);
      }
      len.oninput = ans.oninput = () => { run++; stats(); paint(1); verdict.hidden = true; };
      $('.viz-btn').onclick = play;
      stats(); paint(1);
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
