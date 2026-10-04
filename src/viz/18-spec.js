/* Chapter 18 widget: one speculative verify window at a time — guess, check, commit the prefix, roll back the rest.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.spec;

  const T = Viz.t({
    zh: {
      code: 'SPEC_VERIFY', title: '先猜后验', tag: '教学推演 · 贪心验证 · 猜错位置按剧本',
      intro: '草稿层一次猜 k 个 token，目标模型把它们放进<b>一个窗口</b>一次算完，再从左往右比对：接受到第一个不一致为止，后面的全部作废。按 <b>单步</b> 看一轮里每件事的先后。',
      lgAcc: '接受，写进历史', lgRej: '第一个不一致：换成目标的选择', lgVoid: '排在不一致之后：作废', lgTmp: '窗口里暂写的 KV',
      steps: ['草稿层猜 k 个', '一次算完整窗', '从左往右比对', '提交前缀', '回滚其余'],
      stageLabel: '验证窗口、目标选择与暂写状态',
      text: ['今天', '天气', '很', '好', '，', '我们', '去', '公园', '散步', '吧', '。', '记得', '带', '上', '水', '和', '伞', '，', '傍晚', '可能', '会', '下雨', '。', '回来', '的', '路上', '顺便', '买', '点', '水果', '，', '晚上', '一起', '做', '沙拉', '。'],
      alt: { '很': '不', '好': '冷', '我们': '你们', '去': '在', '公园': '海边', '散步': '跑步', '吧': '了', '记得': '别忘', '带': '买', '上': '好', '水': '书', '伞': '帽子', '傍晚': '晚上', '可能': '一定', '会': '要', '下雨': '刮风', '回来': '出门', '路上': '时候', '顺便': '记得', '买': '带', '水果': '蔬菜', '一起': '我们', '做': '吃', '沙拉': '饺子', '的': '了', '点': '些', '，': '。', '。': '！', '和': '或', '天气': '心情' },
      altDefault: '嗯',
      rowWin: '窗口：第 0 行是上一轮的结果，后面是草稿', rowOut: '目标模型在每一行之后的选择', rowKv: 'KV 缓存：窗口里每一行都先暂写',
      histLabel: '已输出：',
      marks: { ok: '接受', bad: '不一致', void: '作废', none: '' },
      unsure: '…', kvTmp: '暂写', kvKeep: '保留', kvDrop: '待覆盖',
      kLabel: '草稿长度 k',
      bStep: '▶ 单步', bRound: '▶▶ 跑完这一轮', bReset: '重置',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]，一共 5 轮，哪一格猜错按固定剧本',
      sRoundK: '已跑轮数', sRoundF: '<b>每轮 = 1 次 48 层的窗口计算</b><br>普通逐个生成时，1 轮只出 1 个 token',
      sTokK: '已输出 token', sTokF: '<b>每轮输出 = 接受的草稿数 a + 1</b><br>多出的 1 个是目标在不一致处自己选的',
      sAvgK: '平均每轮输出', sAvgF: '<b>= 已输出 ÷ 轮数</b><br>上游实测平均每轮 2.4–3.2 个 token',
      sKeepK: '本轮提交 n_keep', sKeepF: '<b>= a + 1</b><br>窗口第 0 行 + 接受的 a 个草稿',
      l0: (r, k, d) => `<span class="c">[第 ${r} 轮]</span> 草稿层猜了 ${k} 个：${d}`,
      l1: (t) => `<span class="m">验证</span>：${t} 行一起过 48 层，算出每一行之后目标会选什么（接在错字后面的行标成“…”：前提不对，算出来也用不上）；KV 先给 ${t} 行都暂写一格`,
      l2: (a, k, bad) => a === 0 ? `<span class="y">比对</span>：第 1 个草稿“${bad}”就和目标不同，a = 0，这一轮只靠目标自己前进 1 个` : a === k ? `<span class="y">比对</span>：${k} 个草稿全部和目标一致，a = ${k}` : `<span class="y">比对</span>：前 ${a} 个一致，第 ${a + 1} 个草稿“${bad}”和目标不同，比对到此为止`,
      l3: (n, emitted) => `<span class="w">提交</span>：commit(${n}) 只让前 ${n} 行生效；本轮输出 ${emitted}`,
      l4: (void_, next) => `<span class="c">回滚</span>：${void_ ? '作废 ' + void_ + '；' : ''}多写的 KV 格等下一轮直接覆盖。下一轮从“${next}”开始`,
      lEnd: '<span class="y">// 文本写完了，按 [ 重置 ] 再来一遍</span>',
      verdict: (avg, rounds, toks) => `① ${rounds} 轮输出了 ${toks} 个 token，平均每轮 <b>${avg}</b> 个；逐个生成要 ${toks} 轮。<br>② 每轮至少前进 1 个：就算第一个草稿就猜错，目标模型也会在那里给出自己的选择。<br>③ 草稿只决定一轮能前进几步，每个字都由目标模型拍板，所以按设计输出和不用草稿时<b>逐字相同</b>（正文讲了上游记录的一个舍入例外）。`,
      try: [
        '连按 <b>单步</b> 走完第 2 轮：第 2 个草稿猜错后，第 3 个草稿其实和原文一样，可它照样作废。它是接在错字后面猜的，前提已经不成立。',
        '把 <b>k</b> 调到 1 再跑 5 轮：每轮最多输出 2 个 token。调到 5：猜得越多，全对时赚得越多，但每轮的验证也更贵（见第 16 章）。',
        '看 KV 那一行：验证时整窗都先暂写，提交后只有前 a + 1 格算数，其余标成“待覆盖”。不用删除，下一轮会写在同样的位置上。',
      ],
    },
    en: {
      code: 'SPEC_VERIFY', title: 'Guess, then verify', tag: 'Teaching estimate · greedy verify · scripted misses',
      intro: 'The draft layer guesses k tokens at once. The target model puts them in <b>one window</b>, computes them in one go, then compares from left to right: it accepts up to the first mismatch and throws away everything after it. Press <b>Step</b> to see the order of events in one round. Tokens here are whole words for readability.',
      lgAcc: 'Accepted, written to history', lgRej: 'First mismatch: replaced by the target\'s pick', lgVoid: 'After the mismatch: thrown away', lgTmp: 'KV written tentatively in the window',
      steps: ['Draft guesses k', 'Compute whole window', 'Compare left to right', 'Commit prefix', 'Roll back the rest'],
      stageLabel: 'Verify window, target picks and tentative state',
      text: ['The', ' sun', ' is', ' out', ',', ' we', ' go', ' to', ' the', ' park', ' for', ' a', ' walk', '.', ' Pack', ' a', ' hat', ' and', ' a', ' coat', ';', ' it', ' may', ' rain', '.', ' On', ' the', ' way', ' home', ',', ' we', ' buy', ' figs', ' for', ' tea', '.'],
      alt: { ' sun': ' sky', ' is': ' was', ' out': ' up', ' we': ' you', ' go': ' sit', ' to': ' at', ' the': ' a', ' park': ' lake', ' for': ' on', ' a': ' the', ' walk': ' run', ' Pack': ' Take', ' hat': ' cap', ' and': ' or', ' coat': ' map', ' it': ' we', ' may': ' will', ' rain': ' snow', ' On': ' In', ' way': ' road', ' home': ' back', ' buy': ' get', ' figs': ' plums', ' tea': ' lunch', ',': '.', '.': '!', ';': ',' },
      altDefault: ' um',
      rowWin: 'Window: row 0 = last round\'s result, then drafts', rowOut: 'The target\'s pick after each row', rowKv: 'KV cache: every window row written tentatively',
      histLabel: 'So far: ',
      marks: { ok: 'accept', bad: 'differs', void: 'dropped', none: '' },
      unsure: '…', kvTmp: 'temp', kvKeep: 'keep', kvDrop: 'stale',
      kLabel: 'Draft length k',
      bStep: '▶ Step', bRound: '▶▶ Finish this round', bReset: 'Reset',
      ready: '<span class="c">$</span> ready. Press [ ▶ Step ]; 5 rounds in all, and which guess is wrong follows a fixed script',
      sRoundK: 'Rounds run', sRoundF: '<b>each round = 1 window pass through 48 layers</b><br>plain one-by-one generation gives 1 token per round',
      sTokK: 'Tokens output', sTokF: '<b>output per round = accepted drafts a + 1</b><br>the extra 1 is the target\'s own pick at the mismatch',
      sAvgK: 'Average output per round', sAvgF: '<b>= tokens output ÷ rounds</b><br>upstream measures 2.4–3.2 tokens per round on average',
      sKeepK: 'n_keep committed this round', sKeepF: '<b>= a + 1</b><br>window row 0 + the a accepted drafts',
      l0: (r, k, d) => `<span class="c">[round ${r}]</span> the draft layer guessed ${k}: ${d}`,
      l1: (t) => `<span class="m">Verify</span>: ${t} rows go through 48 layers together, giving the target's pick after each row (rows after a wrong word show "…": their premise is wrong, so the result is useless); KV first writes one tentative slot for each of the ${t} rows`,
      l2: (a, k, bad) => a === 0 ? `<span class="y">Compare</span>: the 1st draft "${String(bad).trim()}" already differs from the target, a = 0; this round the target alone moves 1 token forward` : a === k ? `<span class="y">Compare</span>: all ${k} drafts match the target, a = ${k}` : `<span class="y">Compare</span>: ${a === 1 ? 'the 1st draft matches' : 'the first ' + a + ' match'}; draft ${a + 1} "${String(bad).trim()}" differs from the target, so comparing stops here`,
      l3: (n, emitted) => `<span class="w">Commit</span>: commit(${n}) makes only the first ${n === 1 ? 'row' : n + ' rows'} take effect; this round outputs ${emitted}`,
      l4: (void_, next) => `<span class="c">Roll back</span>: ${void_ ? 'throw away ' + void_ + '; ' : ''}the extra KV slots are simply overwritten next round. The next round starts from "${String(next).trim()}"`,
      lEnd: '<span class="y">// the text is finished; press [ Reset ] to go again</span>',
      verdict: (avg, rounds, toks) => `① ${rounds} rounds output ${toks} tokens, <b>${avg}</b> per round on average; one-by-one generation needs ${toks} rounds.<br>② Every round moves at least 1 token: even if the first draft is wrong, the target model gives its own pick there.<br>③ Drafts only decide how far a round moves; the target model decides every word, so by design the output is <b>word-for-word identical</b> to running without drafts (the chapter text covers one rounding exception that upstream records).`,
      try: [
        'Keep pressing <b>Step</b> through round 2: after the 2nd draft is wrong, the 3rd draft actually matches the original text, yet it is still thrown away. It was guessed after a wrong word, so its premise no longer holds.',
        'Set <b>k</b> to 1 and run 5 rounds: each round outputs at most 2 tokens. Set it to 5: the more you guess, the more you gain when all are right, but each round\'s verification also costs more (see Chapter 16).',
        'Watch the KV row: during verification the whole window is written tentatively; after commit only the first a + 1 slots count, and the rest are marked "stale". No deleting needed: the next round writes into the same positions.',
      ],
    },
    ja: {
      code: 'SPEC_VERIFY', title: '先に推測して、あとで検証', tag: '教育用の試算 · 貪欲検証 · 外れる位置は台本どおり',
      intro: 'ドラフト層が一度に k 個の token を推測します。ターゲットモデルは、それらを<b>1 つのウィンドウ</b>に入れて 1 回で計算し、左から右へ比べます。最初に食い違った所までを受理し、後ろはすべて破棄します。<b>ステップ</b>で、1 ラウンドの中の出来事を順に見ましょう。',
      lgAcc: '受理：履歴に書く', lgRej: '最初の食い違い：ターゲットの選択に置き換え', lgVoid: '食い違いの後ろ：破棄', lgTmp: 'ウィンドウ内で仮書きした KV',
      steps: ['ドラフトが k 個推測', 'ウィンドウを一括計算', '左から右へ比較', '先頭部分をコミット', '残りをロールバック'],
      stageLabel: '検証ウィンドウ、ターゲットの選択、仮書きの状態',
      text: ['今日', 'は', '晴れ', 'です', '。', '私たち', 'は', '公園', 'へ', '散歩', 'に', '行き', 'ましょう', '。', '傘', 'と', '水筒', 'を', '持って', 'いき', 'ましょう', '。', '夕方', 'は', '雨', 'かも', 'しれ', 'ない', '。', '帰り', 'に', '果物', 'を', '買い', 'ます', '。'],
      alt: { '今日': '昨日', 'は': 'が', '晴れ': '雨', 'です': 'でした', '私たち': 'あなたたち', '公園': '海', 'へ': 'で', '散歩': 'ラン', 'に': 'で', '行き': '来', 'ましょう': 'ません', '傘': '帽子', 'と': 'や', '水筒': '本', 'を': 'は', '持って': '買って', 'いき': 'こい', '夕方': '夜', '雨': '雪', 'かも': 'はず', 'しれ': 'わか', 'ない': 'あり', '帰り': '出発', '果物': '野菜', '買い': '食べ', 'ます': 'ない', '。': '！' },
      altDefault: 'ええと',
      rowWin: 'ウィンドウ：0 行目は前回の結果、続くのがドラフト', rowOut: '各行の後にターゲットモデルが選ぶ token', rowKv: 'KV キャッシュ：ウィンドウの各行をまず仮書き',
      histLabel: '出力済み：',
      marks: { ok: '受理', bad: '不一致', void: '破棄', none: '' },
      unsure: '…', kvTmp: '仮書き', kvKeep: '保持', kvDrop: '上書き可',
      kLabel: 'ドラフトの長さ k',
      bStep: '▶ ステップ', bRound: '▶▶ このラウンドを最後まで', bReset: 'リセット',
      ready: '<span class="c">$</span> ready. [ ▶ ステップ ] を押してください。全部で 5 ラウンド。どの枠が外れるかは固定の台本どおりです',
      sRoundK: '実行したラウンド数', sRoundF: '<b>1 ラウンド = 48 層のウィンドウ計算 1 回</b><br>通常の 1 個ずつの生成では、1 ラウンドで出るのは 1 token',
      sTokK: '出力した token 数', sTokF: '<b>1 ラウンドの出力 = 受理したドラフト数 a + 1</b><br>増える 1 個は、食い違った所でターゲットが自分で選んだもの',
      sAvgK: '1 ラウンドあたりの平均出力', sAvgF: '<b>= 出力数 ÷ ラウンド数</b><br>上流の実測は、平均で 1 ラウンドあたり 2.4〜3.2 token',
      sKeepK: 'このラウンドのコミット数 n_keep', sKeepF: '<b>= a + 1</b><br>ウィンドウ 0 行目 + 受理した a 個のドラフト',
      l0: (r, k, d) => `<span class="c">[第 ${r} ラウンド]</span> ドラフト層が ${k} 個推測しました：${d}`,
      l1: (t) => `<span class="m">検証</span>：${t} 行をまとめて 48 層に通し、各行の後にターゲットが何を選ぶかを計算します（誤った語の後ろの行は「…」。前提が違うので、計算しても使えません）。KV には、まず ${t} 行ぶんを 1 枠ずつ仮書きします`,
      l2: (a, k, bad) => a === 0 ? `<span class="y">比較</span>：1 つ目のドラフト「${bad}」がもうターゲットと違います。a = 0 で、このラウンドはターゲット自身の 1 個だけ進みます` : a === k ? `<span class="y">比較</span>：${k} 個のドラフトがすべてターゲットと一致しました。a = ${k}` : `<span class="y">比較</span>：先頭の ${a} 個は一致しました。${a + 1} 個目のドラフト「${bad}」がターゲットと違うので、比較はここまでです`,
      l3: (n, emitted) => `<span class="w">コミット</span>：commit(${n}) で、先頭の ${n} 行だけが有効になります。このラウンドの出力は ${emitted}`,
      l4: (void_, next) => `<span class="c">ロールバック</span>：${void_ ? void_ + ' を破棄します。' : ''}余分に書いた KV の枠は、次のラウンドでそのまま上書きされます。次のラウンドは「${next}」から始まります`,
      lEnd: '<span class="y">// 文章が書き終わりました。[ リセット ] でもう一度</span>',
      verdict: (avg, rounds, toks) => `① ${rounds} ラウンドで ${toks} token を出力しました。1 ラウンドの平均は <b>${avg}</b> 個です。1 個ずつの生成なら ${toks} ラウンドかかります。<br>② 1 ラウンドで必ず 1 個以上進みます。最初のドラフトが外れても、ターゲットモデルがそこで自分の選択を出します。<br>③ ドラフトが決めるのは、1 ラウンドで何ステップ進めるかだけです。どの文字もターゲットモデルが決めるので、設計上、ドラフトなしの場合と<b>1 文字ずつ同じ</b>出力になります（本文で、上流が記録している丸めの例外を説明しています）。`,
      try: [
        '<b>ステップ</b>を続けて押し、第 2 ラウンドを最後まで進めましょう。2 つ目のドラフトが外れたあと、3 つ目のドラフトは実は元の文と同じです。それでも破棄されます。誤った語の後ろで推測したので、前提がもう成り立たないのです。',
        '<b>k</b> を 1 にして 5 ラウンド走らせます。1 ラウンドの出力は最大 2 token です。5 にすると、推測が多いほど全部当たったときの利益は増えますが、1 ラウンドの検証も高くつきます（第 16 章を参照）。',
        'KV の行を見てください。検証のとき、ウィンドウ全体をまず仮書きします。コミットのあとで有効なのは先頭の a + 1 枠だけで、残りは「上書き可」になります。削除は要りません。次のラウンドが同じ位置に書き込みます。',
      ],
    },
  });

  const SCRIPT = [null, 2, 1, 3, null, 2, 1, null];

  Viz.register('spec-verify', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgAcc, glow: true },
        { color: 'var(--a3)', text: T.lgRej },
        { color: 'var(--frame)', text: T.lgVoid },
        { color: 'var(--a2)', text: T.lgTmp },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 246', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const hist = Viz.svg('text', { x: 0, y: 16, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const rowTitles = [[T.rowWin, 44], [T.rowOut, 112], [T.rowKv, 180]];
      rowTitles.forEach(([t, y]) => { Viz.svg('text', { x: 0, y, 'font-size': 12, style: 'fill:var(--muted)' }, svg).textContent = t; });
      const COLS = 6, W = 56, STEP = 59;
      const mk = (y) => Array.from({ length: COLS }, (_, i) => {
        const x = i * STEP + 1;
        const r = Viz.svg('rect', { x, y, width: W, height: 30, style: 'fill:var(--side);stroke:var(--frame)' }, svg);
        const t = Viz.svg('text', { x: x + W / 2, y: y + 20, 'font-size': 13, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg);
        return { r, t };
      });
      const winCells = mk(52), outCells = mk(120), kvCells = mk(188);
      const markTxt = Array.from({ length: COLS }, (_, i) => Viz.svg('text', { x: i * STEP + 1 + W / 2, y: 98, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg));
      const rowNo = Array.from({ length: COLS }, (_, i) => Viz.svg('text', { x: i * STEP + 1 + W / 2, y: 238, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg));
      left.insertAdjacentHTML('beforeend', `<div class="viz-slider"><label>${T.kLabel}</label><input type="range" min="1" max="5" value="3" aria-label="${Viz.esc(T.kLabel)}"><output>3</output></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bRound, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML = Viz.stat({ id: 's-round', k: T.sRoundK, v: '0', f: T.sRoundF }) + Viz.stat({ id: 's-tok', k: T.sTokK, v: '0', f: T.sTokF }) +
        Viz.stat({ id: 's-avg', k: T.sAvgK, v: '—', f: T.sAvgF, hot: true }) + Viz.stat({ id: 's-keep', k: T.sKeepK, v: '—', f: T.sKeepF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const range = $('input[type=range]'), verdict = $('.viz-verdict');
      const [stepBtn, roundBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const TEXT = T.text, alt = w => T.alt[w] || T.altDefault;
      let pos, rounds, emitted, phase, cur, busy = false;

      const fill = (cell, text, color, ink) => { cell.r.setAttribute('style', `stroke:var(--frame);fill:${color}`); cell.t.textContent = text; cell.t.setAttribute('style', 'fill:' + (ink || 'var(--ink)')); };
      function clearCells() {
        for (let i = 0; i < COLS; i++) {
          [winCells[i], outCells[i], kvCells[i]].forEach(c => fill(c, '', 'var(--side)'));
          markTxt[i].textContent = ''; rowNo[i].textContent = '';
        }
      }
      function showHist() {
        const shown = emitted.slice(-9).join('');
        hist.textContent = T.histLabel + (emitted.length > 9 ? '…' : '') + (shown || '—');
      }
      function stats() {
        $('[data-s=s-round-v]').textContent = rounds;
        $('[data-s=s-tok-v]').textContent = emitted.length - 1;
        $('[data-s=s-avg-v]').textContent = rounds ? Viz.fmt((emitted.length - 1) / rounds, 2) : '—';
        $('[data-s=s-keep-v]').textContent = cur && rounds > 0 && (phase === 4 || phase === 0) ? cur.nKeep : '—';
      }
      function reset() {
        pos = 0; rounds = 0; emitted = [TEXT[0]]; phase = 0; cur = null;
        pipe.set(-1); clearCells(); showHist(); stats(); verdict.hidden = true; term.clear(); term.log(T.ready);
      }
      function step() {
        if (phase === 0 && (rounds >= 5 || pos >= TEXT.length - 1)) { if (pos >= TEXT.length - 1) term.log(T.lEnd); reset(); return; }
        pipe.set(phase);
        if (phase === 0) {
          clearCells();
          const k = +range.value, miss = SCRIPT[rounds % SCRIPT.length];
          const d = M.drafts(TEXT, pos, k, miss && miss <= k ? miss : null, alt);
          cur = M.round(TEXT, pos, d);
          cur.window.forEach((w, i) => { fill(winCells[i], w, i ? 'var(--side)' : 'var(--accent)', i ? 'var(--ink)' : 'var(--paper)'); rowNo[i].textContent = 'pos ' + (pos + i); });
          term.log(T.l0(rounds + 1, d.length, d.join(' ')));
        }
        if (phase === 1) {
          cur.outv.forEach((o, i) => { fill(outCells[i], i <= cur.a ? o : T.unsure, 'var(--side)', i <= cur.a ? 'var(--ink)' : 'var(--muted)'); fill(kvCells[i], T.kvTmp, 'var(--a2)', 'var(--paper)'); });
          term.log(T.l1(cur.window.length));
        }
        if (phase === 2) {
          for (let i = 1; i < cur.window.length; i++) {
            const st = i <= cur.a ? 'ok' : i === cur.a + 1 ? 'bad' : 'void';
            markTxt[i].textContent = T.marks[st];
            fill(winCells[i], cur.window[i], st === 'ok' ? 'var(--accent)' : st === 'bad' ? 'var(--a3)' : 'var(--frame)', st === 'void' ? 'var(--muted)' : 'var(--paper)');
          }
          fill(outCells[cur.a], cur.outv[cur.a], 'var(--a3)', 'var(--paper)');
          term.log(T.l2(cur.a, cur.window.length - 1, cur.window[cur.a + 1]));
        }
        if (phase === 3) {
          for (let i = 0; i < cur.window.length; i++) fill(kvCells[i], i <= cur.a ? T.kvKeep : T.kvTmp, i <= cur.a ? 'var(--accent)' : 'var(--a2)', 'var(--paper)');
          emitted.push(...cur.emitted); rounds++; showHist();
          term.log(T.l3(cur.nKeep, cur.emitted.join(' ')));
        }
        if (phase === 4) {
          for (let i = cur.a + 1; i < cur.window.length; i++) fill(kvCells[i], T.kvDrop, 'var(--frame)', 'var(--muted)');
          term.log(T.l4(cur.rejected.join(' '), cur.outv[cur.a]));
          pos = cur.nextPos;
          if (rounds >= 5 || pos >= TEXT.length - 1) {
            const toks = emitted.length - 1;
            verdict.innerHTML = T.verdict(Viz.fmt(toks / rounds, 2), rounds, toks); verdict.hidden = false;
          }
        }
        phase = (phase + 1) % 5;
        stats();
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = true; });
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn, input').forEach(b => { b.disabled = false; });
      }
      stepBtn.onclick = () => guard(async () => step());
      roundBtn.onclick = () => guard(async () => { do { step(); if (phase !== 0) await ctx.sleep(450); } while (phase !== 0); });
      resetBtn.onclick = () => guard(async () => reset());
      range.oninput = () => { $('.viz-slider output').textContent = range.value; };
      reset();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
