/* DeepInfer column, page "determinism": two widgets.
   di-determinism-reduce: one row summed in float32 with a batch-dependent chunk count, or a fixed one.
   di-determinism-mask: a regex token mask over a toy vocabulary, packed into an int32 bitmask.
   All visible text lives in the T table below (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.diDeterminism;

  const T = Viz.t({
    zh: {
      code: 'BATCH_REDUCE', title: '同一行求和，换个批就变', tag: '教学推演 · 浏览器里用 float32 真算',
      intro: '一个 logit 就是 64 个乘积的和。下面这个玩具内核有 16 个计算单元：批里请求少时，它把一行拆成更多段并行加，好让每个单元都有活干。拖动<b>同批请求数</b>，看同一行的和怎么变；再打开<b>批次不变模式</b>，段数固定为 4。',
      lgA: '一格 = 一个乘积（这一段）', lgB: '一格 = 一个乘积（相邻的另一段）',
      bLabel: '同批请求数 B', biLabel: '批次不变模式：不管 B 是多少，段数固定为 4',
      bSweep: '▶ 从 B = 1 扫到 16', bClear: '清空记录',
      stageLabel: '64 个乘积按段着色',
      segs: (k, len) => `这一行被拆成 ${k} 段，每段 ${len} 个，段内从左到右加，段和再两两相加`,
      sSumK: '这一行的和（float32）', sSumF: (hex) => `<b>位模式 0x${hex}</b><br>每做一次加法，都舍入到 float32`,
      sUlpK: '和单独跑（B = 1）时差多少', sUlpF: (ref) => `<b>按 float32 的刻度（ULP）数</b><br>双精度参考 ${ref}：每种结果都是合格的近似`,
      ulp: (n) => `${n} ULP`,
      sTokK: '贪心选中的 token', sTokF: (rival) => `<b>甲的分数 = 这一行的和</b><br>乙的分数固定为 ${rival}，两者几乎打平`,
      tok: ['甲', '乙'],
      sOccK: '计算单元占用', sOccF: (b, k) => `<b>= min(16, B × 段数) ÷ 16 = min(16, ${b} × ${k}) ÷ 16</b><br>段数固定后，小批时有单元闲着`,
      histK: '见过的不同结果', histEmpty: '拖动滑块或按“扫一遍”，这里记下每种不同的和',
      hist: (hex, v, bs, t) => `0x${hex} · ${v} · B = ${bs} · ${t}`,
      ready: '<span class="c">$</span> ready. 拖动 [ 同批请求数 B ]，或按 [ ▶ 从 B = 1 扫到 16 ]',
      lMove: (b, k, v, t) => `<span class="c">[B=${b}]</span> 内核把这一行拆成 ${k} 段 → 和 = ${v} → 选<span class="w">${t}</span>`,
      lSweep: (bi) => `<span class="y">// 扫一遍 B = 1…16（${bi ? '批次不变' : '按批大小选段数'}）</span>`,
      lMode: (bi) => (bi ? '<span class="m">批次不变模式</span>：段数固定为 4，求和顺序不再跟着批变' : '<span class="m">普通模式</span>：段数跟着批大小变'),
      vFree: (n, flip) => `B 从 1 到 16，同一行出现了 <b>${n}</b> 种不同的 float32 和，彼此只差几个 ULP。${flip ? '因为甲乙几乎打平，选中的 token 也跟着变了：B ≤ 4 时选乙，B ≥ 5 时选甲。' : ''}你的请求本身没变，变的是和你同批的人数。`,
      vFixed: 'B 从 1 到 16，结果只有 <b>1</b> 种，每次都选乙。代价写在“计算单元占用”里：B = 1 时只有 4 个单元有活。批次不变换来的是可复现，不是更准：在这一行里 4 段的和恰好最接近双精度参考，但这是巧合，换一行数就未必。批次不变只保证顺序固定，不挑最准的顺序。',
      try: [
        '把 B 从 1 拖到 16：B = 1、2、3–4、5–8、9 以上各得一种和，相邻两种只差 1 到 3 个 ULP。',
        '看“贪心选中的 token”：B ≤ 4 时是乙，B ≥ 5 时是甲。差 4 个 ULP，就换了一个词，后面整段回答都会不同。',
        '打开批次不变模式，再扫一遍：只剩 1 种结果。看“计算单元占用”在 B = 1 时掉到 25%，这就是它“更慢”的来源。',
      ],

      mCode: 'TOKEN_MASK', mTitle: '结构化输出：给词表盖一层掩码', mTag: '教学推演 · 12 个 token 的玩具词表',
      mIntro: '提示词让模型“随便续写一个很长的故事”，格式却要求匹配正则 <code>[A-Z]{2}-[0-9]{3}</code>（DeepInfer 的示例里就是这么故意为难模型的）。每一步，自动机先算出哪些 token 不会破坏格式，打包成位掩码；其余 token 的分数改成 −∞，再挑最高分。',
      mLgOk: '允许：写下它不会破坏格式', mLgNo: '屏蔽：分数改成 −∞', mLgPick: '这一步选中',
      mSteps: ['推进自动机', '算出合法 token', '打包成位掩码', '屏蔽的置为 −∞', '挑最高分'],
      mStep: '▶ 单步', mAll: '▶▶ 跑完', mReset: '重置', mOff: '关掉约束（看模型本来想写什么）',
      slotsLabel: '正则的 6 个位置',
      cls: { 'A-Z': 'A–Z', '0-9': '0–9', '-': '-' },
      sTextK: '已写出的文字', sTextF: (s) => `<b>状态 = 已写满 ${s} / 6 个位置</b><br>EOS 只在 6 个位置都写满时才允许`,
      sMaskK: '位掩码（第 0 个 int32）', sMaskF: (bits) => `<b>第 i 位 = token i 是否允许</b><br>token 0→11（低位在前）：${bits}`,
      sTopK: '模型分数最高的 token', sTopF: '<b>不加掩码时贪心会选它</b><br>分数是教学假设',
      inf: '−∞', empty: '（空）',
      storyToks: ['从前', '冰箱', '，'],
      mReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]，每按一次生成一个 token',
      m0: (s) => `<span class="c">[状态 ${s}]</span> 自动机看已写出的字符，判断每个 token 写下去会不会出格`,
      m1: (ok) => `<span class="m">合法</span>：${ok}`,
      m2: (hex) => `<span class="m">位掩码</span>：0x${hex}（12 个 token 只占一个 int32 的低 12 位）`,
      m3: (n) => `<span class="m">屏蔽</span>：其余 ${n} 个 token 的分数改成 −∞`,
      m4: (tok, top) => `<span class="w">选中</span> ${tok}（模型最想写的是 ${top}）`,
      mFree: (tok) => `<span class="y">无约束</span>：直接选分数最高的 ${tok}`,
      mDone: (txt) => `<span class="y">完成</span>：输出 ${txt}，再写 EOS 结束`,
      mStop: '<span class="y">// 6 步用完，没有结束符：模型还想继续写故事</span>',
      mvOn: (txt) => `输出 <b>${txt}</b>，完整匹配 <code>[A-Z]{2}-[0-9]{3}</code>，然后正常结束。每一步模型分数最高的都是故事里的词，可它们全被屏蔽了。注意 <b>Z-</b> 这种跨两个位置的 token：自动机要逐个字符检查。`,
      mvOff: (txt) => `关掉约束后，贪心写出 <b>${txt}</b>：模型照着提示词写故事，和格式毫无关系。掩码不改变模型，只改变“能从哪些 token 里挑”。`,
      mTry: [
        '连按 <b>单步</b>：第 1 步只有 AB 和 Q 合法；A1 开头是字母，也被屏蔽了，因为第二个字符必须还是字母。',
        '走到第 3 步，看位掩码：只剩 12、7、345 三位是 1。分数最高的 345 一次写满 3 个位置。',
        '勾选 <b>关掉约束</b> 再跑完：模型一直写“从前冰箱，……”。掩码只在采样前动分数，模型的计算一点没变。',
      ],
    },
    en: {
      code: 'BATCH_REDUCE', title: 'Same row, same sum? Change the batch and it changes', tag: 'Teaching estimate · real float32 in your browser',
      intro: 'One logit is the sum of 64 products. The toy kernel below has 16 compute units. When the batch has few requests, it splits one row into more segments and adds them in parallel, so that every unit has work. Drag <b>requests in the batch</b> and watch how the sum of the same row changes. Then switch on <b>batch-invariant mode</b>, which fixes the number of segments at 4.',
      lgA: 'One cell = one product (this segment)', lgB: 'One cell = one product (the neighboring segment)',
      bLabel: 'Requests in the batch B', biLabel: 'Batch-invariant mode: the number of segments stays 4, whatever B is',
      bSweep: '▶ Sweep B = 1 to 16', bClear: 'Clear log',
      stageLabel: '64 products, colored by segment',
      segs: (k, len) => `The row is split into ${k} segments of ${len} products each. Inside a segment, add from left to right. Then add the segment sums in pairs`,
      sSumK: 'Sum of this row (float32)', sSumF: (hex) => `<b>Bit pattern 0x${hex}</b><br>Every addition rounds to float32`,
      sUlpK: 'Difference from running alone (B = 1)', sUlpF: (ref) => `<b>Counted in float32 steps (ULP)</b><br>Double-precision reference ${ref}: every result is a valid approximation`,
      ulp: (n) => `${n} ULP`,
      sTokK: 'Token picked by greedy', sTokF: (rival) => `<b>X's score = the sum of this row</b><br>Y's score is fixed at ${rival}. The two are almost tied`,
      tok: ['X', 'Y'],
      sOccK: 'Compute-unit usage', sOccF: (b, k) => `<b>= min(16, B × segments) ÷ 16 = min(16, ${b} × ${k}) ÷ 16</b><br>With a fixed segment count, some units sit idle in small batches`,
      histK: 'Different results seen', histEmpty: 'Drag the slider or press “Sweep”. Each different sum is recorded here',
      hist: (hex, v, bs, t) => `0x${hex} · ${v} · B = ${bs} · ${t}`,
      ready: '<span class="c">$</span> ready. Drag [ Requests in the batch B ], or press [ ▶ Sweep B = 1 to 16 ]',
      lMove: (b, k, v, t) => `<span class="c">[B=${b}]</span> kernel splits the row into ${k} segments → sum = ${v} → picks <span class="w">${t}</span>`,
      lSweep: (bi) => `<span class="y">// sweep B = 1…16 (${bi ? 'batch-invariant' : 'segments chosen by batch size'})</span>`,
      lMode: (bi) => (bi ? '<span class="m">Batch-invariant mode</span>: the number of segments stays 4, and the summation order no longer follows the batch' : '<span class="m">Normal mode</span>: the number of segments follows the batch size'),
      vFree: (n, flip) => `From B = 1 to 16, the same row gives <b>${n}</b> different float32 sums. They differ by only a few ULP. ${flip ? 'Because X and Y are almost tied, the chosen token changes too: Y for B ≤ 4, X for B ≥ 5. ' : ''}Your request did not change. What changed is how many people share its batch.`,
      vFixed: 'From B = 1 to 16, there is only <b>1</b> result, and it always picks Y. The cost is shown in “Compute-unit usage”: at B = 1, only 4 units have work. Batch-invariant buys reproducibility, not accuracy. In this row, the sum of 4 segments happens to be closest to the double-precision reference, but that is a coincidence, and another row may differ. Batch-invariant only fixes the order. It does not choose the most accurate order.',
      try: [
        'Drag B from 1 to 16. B = 1, 2, 3–4, 5–8 and 9 or more each give one sum, and neighboring sums differ by only 1 to 3 ULP.',
        'Watch “Token picked by greedy”: it is Y for B ≤ 4 and X for B ≥ 5. A gap of 4 ULP swaps one word, and the whole rest of the answer will differ.',
        'Switch on batch-invariant mode and sweep again: only 1 result remains. Watch “Compute-unit usage” fall to 25% at B = 1. This is where the “slower” comes from.',
      ],

      mCode: 'TOKEN_MASK', mTitle: 'Structured outputs: put a mask over the vocabulary', mTag: 'Teaching estimate · a toy vocabulary of 12 tokens',
      mIntro: 'The prompt asks the model to “continue a very long story freely”, but the format must match the regex <code>[A-Z]{2}-[0-9]{3}</code> (DeepInfer\'s example makes things hard for the model in just this way). At each step, the automaton first works out which tokens do not break the format and packs them into a bitmask. The scores of all other tokens become −∞, and then the top score is picked.',
      mLgOk: 'Allowed: writing it does not break the format', mLgNo: 'Masked: score set to −∞', mLgPick: 'Picked at this step',
      mSteps: ['Advance automaton', 'Find legal tokens', 'Pack into bitmask', 'Set masked to −∞', 'Pick top score'],
      mStep: '▶ Step', mAll: '▶▶ Run to end', mReset: 'Reset', mOff: 'Turn the constraint off (see what the model wants to write)',
      slotsLabel: 'The 6 positions of the regex',
      cls: { 'A-Z': 'A–Z', '0-9': '0–9', '-': '-' },
      sTextK: 'Text written so far', sTextF: (s) => `<b>State = ${s} of 6 positions filled</b><br>EOS is allowed only when all 6 positions are filled`,
      sMaskK: 'Bitmask (int32 number 0)', sMaskF: (bits) => `<b>Bit i = whether token i is allowed</b><br>Tokens 0→11 (low bit first): ${bits}`,
      sTopK: 'Token with the top model score', sTopF: '<b>Without the mask, greedy would pick it</b><br>The scores are a teaching assumption',
      inf: '−∞', empty: '(empty)',
      storyToks: ['Once', ' fridge', ','],
      mReady: '<span class="c">$</span> ready. Press [ ▶ Step ] to generate one token per press',
      m0: (s) => `<span class="c">[state ${s}]</span> the automaton looks at the characters written so far and checks whether each token would break the format`,
      m1: (ok) => `<span class="m">Legal</span>: ${ok}`,
      m2: (hex) => `<span class="m">Bitmask</span>: 0x${hex} (12 tokens use only the low 12 bits of one int32)`,
      m3: (n) => `<span class="m">Masked</span>: the scores of the other ${n} tokens become −∞`,
      m4: (tok, top) => `<span class="w">Picked</span> ${tok} (the model wanted to write ${top} most)`,
      mFree: (tok) => `<span class="y">No constraint</span>: just pick the top score, ${tok}`,
      mDone: (txt) => `<span class="y">Done</span>: the output is ${txt}, then EOS ends it`,
      mStop: '<span class="y">// 6 steps used and no end token: the model still wants to keep writing the story</span>',
      mvOn: (txt) => `The output is <b>${txt}</b>. It fully matches <code>[A-Z]{2}-[0-9]{3}</code>, and then ends normally. At every step, the top-scoring token of the model is a word of the story, but all of them are masked. Note tokens like <b>Z-</b> that span two positions: the automaton must check them character by character.`,
      mvOff: (txt) => `With the constraint off, greedy writes <b>${txt}</b>. The model follows the prompt and writes a story, with no relation to the format. The mask does not change the model. It changes only “which tokens you can pick from”.`,
      mTry: [
        'Press <b>Step</b> repeatedly. At step 1, only AB and Q are legal. A1 starts with a letter but is masked too, because the second character must also be a letter.',
        'At step 3, look at the bitmask: only the bits of tokens 12, 7 and 345 are 1. The top-scoring token, 345, fills all 3 positions at once.',
        'Tick <b>Turn the constraint off</b> and run to the end: the model keeps writing “Once fridge, …”. The mask changes scores only before sampling. The model\'s computation does not change at all.',
      ],
    },
    ja: {
      code: 'BATCH_REDUCE', title: '同じ行の和が、バッチを変えると変わる', tag: '教育用の試算 · ブラウザ内で float32 を実計算',
      intro: 'logit 1 つは、64 個の積の和です。下のおもちゃのカーネルには 16 個の演算ユニットがあります。バッチのリクエストが少ないと、カーネルは 1 行をより多くのセグメントに分けて並列に足し、どのユニットにも仕事が行き渡るようにします。<b>同じバッチのリクエスト数</b>をドラッグして、同じ行の和がどう変わるかを見てください。次に<b>バッチ不変モード</b>をオンにすると、セグメント数が 4 に固定されます。',
      lgA: '1 マス = 1 つの積（このセグメント）', lgB: '1 マス = 1 つの積（隣のセグメント）',
      bLabel: '同じバッチのリクエスト数 B', biLabel: 'バッチ不変モード：B がいくつでも、セグメント数は 4 に固定',
      bSweep: '▶ B = 1 から 16 まで一括実行', bClear: '記録を消去',
      stageLabel: '64 個の積をセグメントごとに色分け',
      segs: (k, len) => `この行は ${k} 個のセグメントに分かれ、各セグメントは ${len} 個です。セグメントの中は左から右へ足し、セグメントの和を 2 つずつ足します`,
      sSumK: 'この行の和（float32）', sSumF: (hex) => `<b>ビットパターン 0x${hex}</b><br>足し算のたびに float32 に丸めます`,
      sUlpK: '単独実行（B = 1）との差', sUlpF: (ref) => `<b>float32 の刻み（ULP）で数えた差</b><br>倍精度の基準 ${ref}：どの結果も妥当な近似です`,
      ulp: (n) => `${n} ULP`,
      sTokK: '貪欲に選ばれたトークン', sTokF: (rival) => `<b>甲のスコア = この行の和</b><br>乙のスコアは ${rival} に固定です。2 つはほぼ同点です`,
      tok: ['甲', '乙'],
      sOccK: '演算ユニットの使用率', sOccF: (b, k) => `<b>= min(16, B × セグメント数) ÷ 16 = min(16, ${b} × ${k}) ÷ 16</b><br>セグメント数を固定すると、小さいバッチでは遊ぶユニットが出ます`,
      histK: 'これまでに見た異なる結果', histEmpty: 'スライダーを動かすか「一括実行」を押すと、異なる和がここに記録されます',
      hist: (hex, v, bs, t) => `0x${hex} · ${v} · B = ${bs} · ${t}`,
      ready: '<span class="c">$</span> ready. [ 同じバッチのリクエスト数 B ] をドラッグするか、[ ▶ B = 1 から 16 まで一括実行 ] を押してください',
      lMove: (b, k, v, t) => `<span class="c">[B=${b}]</span> カーネルはこの行を ${k} セグメントに分ける → 和 = ${v} → <span class="w">${t}</span> を選ぶ`,
      lSweep: (bi) => `<span class="y">// B = 1…16 を一括実行（${bi ? 'バッチ不変' : 'バッチサイズに応じてセグメント数を選ぶ'}）</span>`,
      lMode: (bi) => (bi ? '<span class="m">バッチ不変モード</span>：セグメント数は 4 に固定され、足し算の順序はバッチに合わせて変わらなくなります' : '<span class="m">通常モード</span>：セグメント数はバッチサイズに合わせて変わります'),
      vFree: (n, flip) => `B が 1 から 16 まで動くと、同じ行に <b>${n}</b> 種類の異なる float32 の和が出ました。互いの差は数 ULP だけです。${flip ? '甲と乙がほぼ同点なので、選ばれるトークンも変わりました。B ≤ 4 では乙、B ≥ 5 では甲です。' : ''}あなたのリクエストは変わっていません。変わったのは、同じバッチにいる人数です。`,
      vFixed: 'B が 1 から 16 まで動いても、結果は <b>1</b> 種類だけで、毎回乙を選びます。代償は「演算ユニットの使用率」に出ています。B = 1 のとき、仕事があるユニットは 4 個だけです。バッチ不変で得られるのは再現性であって、精度ではありません。この行では、たまたま 4 セグメントの和が倍精度の基準にいちばん近くなりましたが、これは偶然で、別の行ならそうとは限りません。バッチ不変が保証するのは順序の固定だけで、いちばん正確な順序を選ぶわけではありません。',
      try: [
        'B を 1 から 16 までドラッグします。B = 1、2、3–4、5–8、9 以上で、それぞれ 1 種類の和が出て、隣り合う 2 つの和の差は 1 から 3 ULP だけです。',
        '「貪欲に選ばれたトークン」を見てください。B ≤ 4 では乙、B ≥ 5 では甲です。4 ULP の差で単語が 1 つ変わり、その後の回答全体が変わります。',
        'バッチ不変モードをオンにして、もう一度一括実行します。結果は 1 種類だけになります。「演算ユニットの使用率」が B = 1 で 25% に落ちるのが、「より遅い」の理由です。',
      ],

      mCode: 'TOKEN_MASK', mTitle: '構造化出力：語彙にマスクをかける', mTag: '教育用の試算 · 12 個のトークンのおもちゃの語彙',
      mIntro: 'プロンプトはモデルに「とても長い物語を自由に続けて」と頼みますが、形式は正規表現 <code>[A-Z]{2}-[0-9]{3}</code> に一致しなければなりません（DeepInfer の例は、わざとこうしてモデルを困らせています）。毎ステップ、オートマトンがまず、形式を壊さないトークンを計算してビットマスクに詰めます。それ以外のトークンのスコアは −∞ になり、そのあと最高スコアを選びます。',
      mLgOk: '許可：書いても形式を壊さない', mLgNo: 'マスク：スコアを −∞ にする', mLgPick: 'このステップで選ばれた',
      mSteps: ['オートマトンを進める', '正しいトークンを計算', 'ビットマスクに詰める', 'マスクしたものを −∞ に', '最高スコアを選ぶ'],
      mStep: '▶ 1 ステップ', mAll: '▶▶ 最後まで実行', mReset: 'リセット', mOff: '制約をオフにする（モデルが本来書きたいものを見る）',
      slotsLabel: '正規表現の 6 つの位置',
      cls: { 'A-Z': 'A–Z', '0-9': '0–9', '-': '-' },
      sTextK: 'ここまでに書いた文字', sTextF: (s) => `<b>状態 = 6 つの位置のうち ${s} 個を記入済み</b><br>EOS は 6 つの位置がすべて埋まったときだけ許可されます`,
      sMaskK: 'ビットマスク（0 番目の int32）', sMaskF: (bits) => `<b>i ビット目 = トークン i が許可されているか</b><br>トークン 0→11（下位ビットが先）：${bits}`,
      sTopK: 'モデルのスコアが最高のトークン', sTopF: '<b>マスクがなければ、貪欲はこれを選びます</b><br>スコアは教育用の仮定です',
      inf: '−∞', empty: '（空）',
      storyToks: ['むかし', '冷蔵庫', '、'],
      mReady: '<span class="c">$</span> ready. [ ▶ 1 ステップ ] を押すと、押すたびに 1 トークンを生成します',
      m0: (s) => `<span class="c">[状態 ${s}]</span> オートマトンは書いた文字を見て、各トークンを書くと形式から外れるかを判定します`,
      m1: (ok) => `<span class="m">正しい</span>：${ok}`,
      m2: (hex) => `<span class="m">ビットマスク</span>：0x${hex}（12 個のトークンは、1 つの int32 の下位 12 ビットだけを使います）`,
      m3: (n) => `<span class="m">マスク</span>：残り ${n} 個のトークンのスコアを −∞ にします`,
      m4: (tok, top) => `<span class="w">選択</span> ${tok}（モデルがいちばん書きたかったのは ${top}）`,
      mFree: (tok) => `<span class="y">制約なし</span>：最高スコアの ${tok} をそのまま選びます`,
      mDone: (txt) => `<span class="y">完了</span>：出力は ${txt}、そのあと EOS を書いて終わります`,
      mStop: '<span class="y">// 6 ステップを使い切ったが終了トークンがない：モデルはまだ物語を続けたがっている</span>',
      mvOn: (txt) => `出力は <b>${txt}</b> で、<code>[A-Z]{2}-[0-9]{3}</code> に完全に一致し、そのあと普通に終わります。毎ステップ、モデルのスコアが最高なのは物語の単語ですが、それらはすべてマスクされています。<b>Z-</b> のように 2 つの位置にまたがるトークンに注意してください。オートマトンは 1 文字ずつ調べなければなりません。`,
      mvOff: (txt) => `制約をオフにすると、貪欲は <b>${txt}</b> を書きます。モデルはプロンプトどおりに物語を書き、形式とは何の関係もありません。マスクはモデルを変えません。変えるのは「どのトークンから選べるか」だけです。`,
      mTry: [
        '<b>1 ステップ</b>を続けて押します。1 ステップ目で正しいのは AB と Q だけです。A1 は文字で始まりますが、2 文字目も文字でなければならないので、マスクされます。',
        '3 ステップ目まで進んで、ビットマスクを見てください。1 になっているのは、トークン 12、7、345 の 3 ビットだけです。スコアが最高の 345 は、3 つの位置を一度に埋めます。',
        '<b>制約をオフにする</b>にチェックを入れて最後まで実行します。モデルは「むかし冷蔵庫、……」と書き続けます。マスクが動かすのはサンプリングの前のスコアだけで、モデルの計算は少しも変わりません。',
      ],
    },
    ko: {
      code: 'BATCH_REDUCE', title: '같은 행의 합이 배치를 바꾸면 달라져요', tag: '교육용 추정 · 브라우저에서 float32로 실제 계산',
      intro: 'logit 하나는 곱 64개의 합이에요. 아래 장난감 커널에는 계산 유닛이 16개 있어요. 배치에 요청이 적으면 커널은 한 행을 더 많은 구간으로 나눠서 병렬로 더하고, 모든 유닛이 일을 하게 해요. <b>같은 배치의 요청 수</b>를 드래그해서 같은 행의 합이 어떻게 바뀌는지 보세요. 그다음 <b>배치 불변 모드</b>를 켜면 구간 수가 4로 고정돼요.',
      lgA: '한 칸 = 곱 하나(이 구간)', lgB: '한 칸 = 곱 하나(이웃한 구간)',
      bLabel: '같은 배치의 요청 수 B', biLabel: '배치 불변 모드: B가 얼마이든 구간 수는 4로 고정',
      bSweep: '▶ B = 1부터 16까지 훑기', bClear: '기록 지우기',
      stageLabel: '곱 64개를 구간별로 색칠',
      segs: (k, len) => `이 행은 구간 ${k}개로 나뉘고, 구간마다 ${len}개예요. 구간 안에서는 왼쪽에서 오른쪽으로 더하고, 구간 합을 둘씩 더해요`,
      sSumK: '이 행의 합(float32)', sSumF: (hex) => `<b>비트 패턴 0x${hex}</b><br>덧셈을 할 때마다 float32로 반올림해요`,
      sUlpK: '따로 실행(B = 1)했을 때와의 차이', sUlpF: (ref) => `<b>float32 눈금(ULP) 수로 센 차이</b><br>배정밀도 기준 ${ref}: 어느 결과든 타당한 근삿값이에요`,
      ulp: (n) => `${n} ULP`,
      sTokK: '그리디가 고른 토큰', sTokF: (rival) => `<b>갑의 점수 = 이 행의 합</b><br>을의 점수는 ${rival}로 고정이에요. 둘은 거의 동점이에요`,
      tok: ['갑', '을'],
      sOccK: '계산 유닛 사용률', sOccF: (b, k) => `<b>= min(16, B × 구간 수) ÷ 16 = min(16, ${b} × ${k}) ÷ 16</b><br>구간 수를 고정하면 작은 배치에서는 노는 유닛이 생겨요`,
      histK: '지금까지 본 서로 다른 결과', histEmpty: '슬라이더를 드래그하거나 “훑기”를 누르면 서로 다른 합이 여기에 기록돼요',
      hist: (hex, v, bs, t) => `0x${hex} · ${v} · B = ${bs} · ${t}`,
      ready: '<span class="c">$</span> ready. [ 같은 배치의 요청 수 B ]를 드래그하거나 [ ▶ B = 1부터 16까지 훑기 ]를 누르세요',
      lMove: (b, k, v, t) => `<span class="c">[B=${b}]</span> 커널이 이 행을 ${k}개 구간으로 나눔 → 합 = ${v} → <span class="w">${t}</span> 선택`,
      lSweep: (bi) => `<span class="y">// B = 1…16 훑기(${bi ? '배치 불변' : '배치 크기에 따라 구간 수 선택'})</span>`,
      lMode: (bi) => (bi ? '<span class="m">배치 불변 모드</span>: 구간 수가 4로 고정되고, 덧셈 순서가 더는 배치를 따라 바뀌지 않아요' : '<span class="m">일반 모드</span>: 구간 수가 배치 크기를 따라 바뀌어요'),
      vFree: (n, flip) => `B가 1에서 16까지 가는 동안, 같은 행에서 서로 다른 float32 합이 <b>${n}</b>가지 나왔어요. 서로 몇 ULP밖에 차이 나지 않아요. ${flip ? '갑과 을이 거의 동점이라 선택된 토큰도 바뀌었어요. B ≤ 4에서는 을, B ≥ 5에서는 갑이에요. ' : ''}내 요청은 바뀌지 않았어요. 바뀐 것은 같은 배치에 있는 사람 수예요.`,
      vFixed: 'B가 1에서 16까지 가도 결과는 <b>1</b>가지뿐이고, 매번 을을 골라요. 대가는 “계산 유닛 사용률”에 나와 있어요. B = 1일 때 일이 있는 유닛은 4개뿐이에요. 배치 불변으로 얻는 것은 재현성이지 정확도가 아니에요. 이 행에서는 4개 구간의 합이 마침 배정밀도 기준값에 가장 가깝지만, 이것은 우연이고 다른 행이라면 그렇지 않을 수 있어요. 배치 불변은 순서를 고정할 뿐, 가장 정확한 순서를 고르지는 않아요.',
      try: [
        'B를 1에서 16까지 드래그해 보세요. B = 1, 2, 3–4, 5–8, 9 이상에서 각각 합이 하나씩 나오고, 이웃한 두 합은 1에서 3 ULP밖에 차이 나지 않아요.',
        '“그리디가 고른 토큰”을 보세요. B ≤ 4에서는 을, B ≥ 5에서는 갑이에요. 4 ULP 차이로 단어 하나가 바뀌고, 그 뒤의 답 전체가 달라져요.',
        '배치 불변 모드를 켜고 다시 훑어 보세요. 결과가 1가지만 남아요. “계산 유닛 사용률”이 B = 1에서 25%로 떨어지는 것이 “더 느리다”의 이유예요.',
      ],

      mCode: 'TOKEN_MASK', mTitle: '구조화 출력: 어휘에 마스크를 씌워요', mTag: '교육용 추정 · 토큰 12개짜리 장난감 어휘',
      mIntro: '프롬프트는 모델에게 “아주 긴 이야기를 마음대로 이어 써라”라고 하지만, 형식은 정규 표현식 <code>[A-Z]{2}-[0-9]{3}</code>에 맞아야 해요(DeepInfer의 예제는 이렇게 일부러 모델을 곤란하게 만들어요). 매 단계 오토마톤이 먼저 형식을 깨지 않는 토큰을 계산해서 비트마스크로 담아요. 나머지 토큰의 점수는 −∞로 바뀌고, 그다음 최고 점수를 골라요.',
      mLgOk: '허용: 써도 형식을 깨지 않음', mLgNo: '가림: 점수를 −∞로 바꿈', mLgPick: '이번 단계에서 선택',
      mSteps: ['오토마톤 진행', '올바른 토큰 계산', '비트마스크로 담기', '가린 것을 −∞로', '최고 점수 선택'],
      mStep: '▶ 한 단계', mAll: '▶▶ 끝까지', mReset: '초기화', mOff: '제약 끄기(모델이 원래 쓰고 싶은 것 보기)',
      slotsLabel: '정규 표현식의 6개 위치',
      cls: { 'A-Z': 'A–Z', '0-9': '0–9', '-': '-' },
      sTextK: '지금까지 쓴 글자', sTextF: (s) => `<b>상태 = 6개 위치 중 ${s}개 채움</b><br>EOS는 6개 위치가 모두 찼을 때만 허용돼요`,
      sMaskK: '비트마스크(0번째 int32)', sMaskF: (bits) => `<b>i번째 비트 = 토큰 i의 허용 여부</b><br>토큰 0→11(낮은 비트 먼저): ${bits}`,
      sTopK: '모델 점수가 가장 높은 토큰', sTopF: '<b>마스크가 없으면 그리디가 이것을 골라요</b><br>점수는 교육용 가정이에요',
      inf: '−∞', empty: '(비어 있음)',
      storyToks: ['옛날', ' 냉장고', ','],
      mReady: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 누르면 누를 때마다 토큰 하나를 생성해요',
      m0: (s) => `<span class="c">[상태 ${s}]</span> 오토마톤이 쓴 글자를 보고, 각 토큰을 쓰면 형식을 벗어나는지 판정해요`,
      m1: (ok) => `<span class="m">올바름</span>: ${ok}`,
      m2: (hex) => `<span class="m">비트마스크</span>: 0x${hex}(토큰 12개는 int32 하나의 낮은 12비트만 써요)`,
      m3: (n) => `<span class="m">가림</span>: 나머지 ${n}개 토큰의 점수를 −∞로 바꿔요`,
      m4: (tok, top) => `<span class="w">선택</span> ${tok}(모델이 가장 쓰고 싶었던 것은 ${top})`,
      mFree: (tok) => `<span class="y">제약 없음</span>: 최고 점수 토큰을 그대로 골라요: ${tok}`,
      mDone: (txt) => `<span class="y">완료</span>: 출력은 ${txt}, 그다음 EOS를 쓰고 끝나요`,
      mStop: '<span class="y">// 6단계를 다 썼는데 종료 토큰이 없음: 모델은 아직 이야기를 이어 쓰고 싶어 해요</span>',
      mvOn: (txt) => `출력은 <b>${txt}</b>. <code>[A-Z]{2}-[0-9]{3}</code>에 완전히 일치한 뒤 정상적으로 끝나요. 매 단계 모델 점수가 가장 높은 것은 이야기의 단어였지만, 모두 가려졌어요. <b>Z-</b>처럼 두 위치에 걸치는 토큰에 주목하세요. 오토마톤은 글자를 하나씩 검사해야 해요.`,
      mvOff: (txt) => `제약을 끄면 그리디의 출력은 이렇게 돼요: <b>${txt}</b>. 모델은 프롬프트대로 이야기를 쓰고, 형식과는 아무 관계가 없어요. 마스크는 모델을 바꾸지 않아요. 바꾸는 것은 “어떤 토큰 중에서 고를 수 있느냐”뿐이에요.`,
      mTry: [
        '<b>한 단계</b>를 계속 눌러 보세요. 1단계에서 올바른 것은 AB와 Q뿐이에요. A1은 글자로 시작하지만 두 번째 문자도 글자여야 하므로 가려져요.',
        '3단계까지 가서 비트마스크를 보세요. 1인 것은 토큰 12, 7, 345의 세 비트뿐이에요. 점수가 가장 높은 345는 세 위치를 한 번에 채워요.',
        '<b>제약 끄기</b>를 체크하고 끝까지 실행해 보세요. 모델은 “옛날 냉장고, ……”를 계속 써요. 마스크는 샘플링 전에 점수만 건드리고, 모델의 계산은 조금도 바뀌지 않아요.',
      ],
    },
    es: {
      code: 'BATCH_REDUCE', title: 'Misma fila, otra suma: cambia el lote y cambia el resultado', tag: 'Estimación didáctica · float32 real en tu navegador',
      intro: 'Un logit es la suma de 64 productos. El kernel de juguete de abajo tiene 16 unidades de cómputo. Cuando el lote tiene pocas peticiones, divide una fila en más segmentos y los suma en paralelo, para que todas las unidades tengan trabajo. Arrastra <b>peticiones en el lote</b> y mira cómo cambia la suma de la misma fila. Después activa el <b>modo invariante al lote</b>, que fija el número de segmentos en 4.',
      lgA: 'Una celda = un producto (este segmento)', lgB: 'Una celda = un producto (el segmento vecino)',
      bLabel: 'Peticiones en el lote B', biLabel: 'Modo invariante al lote: el número de segmentos sigue siendo 4, sea cual sea B',
      bSweep: '▶ Recorrer B = 1 a 16', bClear: 'Borrar registro',
      stageLabel: '64 productos, coloreados por segmento',
      segs: (k, len) => `La fila se divide en ${k} segmentos de ${len} productos cada uno. Dentro de un segmento se suma de izquierda a derecha. Luego las sumas de los segmentos se suman de dos en dos`,
      sSumK: 'Suma de esta fila (float32)', sSumF: (hex) => `<b>Patrón de bits 0x${hex}</b><br>Cada suma se redondea a float32`,
      sUlpK: 'Diferencia con la ejecución sola (B = 1)', sUlpF: (ref) => `<b>Contada en pasos de float32 (ULP)</b><br>Referencia en doble precisión ${ref}: todos los resultados son aproximaciones válidas`,
      ulp: (n) => `${n} ULP`,
      sTokK: 'Token elegido por el muestreo voraz', sTokF: (rival) => `<b>Puntuación de X = suma de esta fila</b><br>La puntuación de Y está fijada en ${rival}. Los dos están casi empatados`,
      tok: ['X', 'Y'],
      sOccK: 'Uso de unidades de cómputo', sOccF: (b, k) => `<b>= min(16, B × segmentos) ÷ 16 = min(16, ${b} × ${k}) ÷ 16</b><br>Con un número fijo de segmentos, algunas unidades quedan ociosas en lotes pequeños`,
      histK: 'Resultados distintos vistos', histEmpty: 'Arrastra el control o pulsa «Recorrer». Aquí se anota cada suma distinta',
      hist: (hex, v, bs, t) => `0x${hex} · ${v} · B = ${bs} · ${t}`,
      ready: '<span class="c">$</span> ready. Arrastra [ Peticiones en el lote B ] o pulsa [ ▶ Recorrer B = 1 a 16 ]',
      lMove: (b, k, v, t) => `<span class="c">[B=${b}]</span> el kernel divide la fila en ${k} segmentos → suma = ${v} → elige <span class="w">${t}</span>`,
      lSweep: (bi) => `<span class="y">// recorrido B = 1…16 (${bi ? 'invariante al lote' : 'segmentos según el tamaño del lote'})</span>`,
      lMode: (bi) => (bi ? '<span class="m">Modo invariante al lote</span>: el número de segmentos sigue siendo 4 y el orden de la suma ya no sigue al lote' : '<span class="m">Modo normal</span>: el número de segmentos sigue al tamaño del lote'),
      vFree: (n, flip) => `De B = 1 a 16, la misma fila da <b>${n}</b> sumas float32 distintas. Difieren solo en unos pocos ULP. ${flip ? 'Como X e Y están casi empatados, el token elegido también cambia: Y para B ≤ 4, X para B ≥ 5. ' : ''}Tu petición no cambió. Lo que cambió es cuántas personas comparten su lote.`,
      vFixed: 'De B = 1 a 16, solo hay <b>1</b> resultado, y siempre elige Y. El coste se ve en «Uso de unidades de cómputo»: con B = 1, solo 4 unidades tienen trabajo. Ser invariante al lote da reproducibilidad, no precisión. En esta fila, la suma de 4 segmentos resulta ser la más cercana a la referencia en doble precisión, pero es una coincidencia, y otra fila puede ser distinta. Ser invariante al lote solo fija el orden. No elige el orden más preciso.',
      try: [
        'Arrastra B de 1 a 16. B = 1, 2, 3–4, 5–8 y 9 o más dan una suma cada uno, y las sumas vecinas difieren solo en 1 a 3 ULP.',
        'Mira «Token elegido por el muestreo voraz»: es Y para B ≤ 4 y X para B ≥ 5. Una diferencia de 4 ULP cambia una palabra, y toda la respuesta que sigue será distinta.',
        'Activa el modo invariante al lote y recorre otra vez: solo queda 1 resultado. Mira cómo «Uso de unidades de cómputo» cae al 25% con B = 1. De ahí viene lo de «más lento».',
      ],

      mCode: 'TOKEN_MASK', mTitle: 'Salidas estructuradas: una máscara sobre el vocabulario', mTag: 'Estimación didáctica · vocabulario de juguete de 12 tokens',
      mIntro: 'El prompt pide al modelo «continuar libremente una historia muy larga», pero el formato debe cumplir la expresión regular <code>[A-Z]{2}-[0-9]{3}</code> (el ejemplo de DeepInfer pone las cosas difíciles al modelo justo así). En cada paso, el autómata calcula primero qué tokens no rompen el formato y los empaqueta en una máscara de bits. Las puntuaciones de todos los demás tokens pasan a −∞, y luego se elige la mayor puntuación.',
      mLgOk: 'Permitido: escribirlo no rompe el formato', mLgNo: 'Enmascarado: puntuación a −∞', mLgPick: 'Elegido en este paso',
      mSteps: ['Avanzar el autómata', 'Calcular tokens válidos', 'Empaquetar en máscara', 'Enmascarados a −∞', 'Elegir la mayor'],
      mStep: '▶ Un paso', mAll: '▶▶ Hasta el final', mReset: 'Reiniciar', mOff: 'Apagar la restricción (ver lo que el modelo quiere escribir)',
      slotsLabel: 'Las 6 posiciones de la expresión regular',
      cls: { 'A-Z': 'A–Z', '0-9': '0–9', '-': '-' },
      sTextK: 'Texto escrito hasta ahora', sTextF: (s) => `<b>Estado = ${s} de 6 posiciones rellenas</b><br>EOS solo se permite cuando las 6 posiciones están rellenas`,
      sMaskK: 'Máscara de bits (int32 número 0)', sMaskF: (bits) => `<b>Bit i = si el token i está permitido</b><br>Tokens 0→11 (bit bajo primero): ${bits}`,
      sTopK: 'Token con la mayor puntuación del modelo', sTopF: '<b>Sin máscara, el muestreo voraz lo elegiría</b><br>Las puntuaciones son un supuesto didáctico',
      inf: '−∞', empty: '(vacío)',
      storyToks: ['Érase', ' nevera', ','],
      mReady: '<span class="c">$</span> ready. Pulsa [ ▶ Un paso ] para generar un token por pulsación',
      m0: (s) => `<span class="c">[estado ${s}]</span> el autómata mira los caracteres escritos y comprueba si cada token rompería el formato`,
      m1: (ok) => `<span class="m">Válidos</span>: ${ok}`,
      m2: (hex) => `<span class="m">Máscara de bits</span>: 0x${hex} (12 tokens usan solo los 12 bits bajos de un int32)`,
      m3: (n) => `<span class="m">Enmascarados</span>: las puntuaciones de los otros ${n} tokens pasan a −∞`,
      m4: (tok, top) => `<span class="w">Elegido</span> ${tok} (el modelo quería escribir sobre todo ${top})`,
      mFree: (tok) => `<span class="y">Sin restricción</span>: se elige directamente la mayor puntuación, ${tok}`,
      mDone: (txt) => `<span class="y">Hecho</span>: la salida es ${txt}, y luego EOS la termina`,
      mStop: '<span class="y">// Se usaron los 6 pasos y no hay token de fin: el modelo aún quiere seguir con la historia</span>',
      mvOn: (txt) => `La salida es <b>${txt}</b>. Coincide por completo con <code>[A-Z]{2}-[0-9]{3}</code> y luego termina con normalidad. En cada paso, el token de mayor puntuación del modelo es una palabra de la historia, pero todos están enmascarados. Fíjate en tokens como <b>Z-</b>, que abarcan dos posiciones: el autómata debe comprobarlos carácter por carácter.`,
      mvOff: (txt) => `Con la restricción apagada, el muestreo voraz escribe <b>${txt}</b>. El modelo sigue el prompt y escribe una historia, sin relación con el formato. La máscara no cambia el modelo. Solo cambia «entre qué tokens puedes elegir».`,
      mTry: [
        'Pulsa <b>Un paso</b> varias veces. En el paso 1, solo AB y Q son válidos. A1 empieza con una letra pero también está enmascarado, porque el segundo carácter también debe ser una letra.',
        'En el paso 3, mira la máscara de bits: solo están en 1 los bits de los tokens 12, 7 y 345. El de mayor puntuación, 345, llena las 3 posiciones de una vez.',
        'Marca <b>Apagar la restricción</b> y ejecuta hasta el final: el modelo sigue escribiendo «Érase nevera, …». La máscara cambia las puntuaciones solo antes del muestreo. El cálculo del modelo no cambia en absoluto.',
      ],
    },
    ar: {
      code: 'BATCH_REDUCE', title: 'الصف نفسه، مجموع مختلف: غيّر الدفعة يتغير الناتج', tag: 'تقدير تعليمي · float32 حقيقي في المتصفح',
      intro: 'الـ logit الواحد هو مجموع 64 حاصل ضرب. في نواة اللعبة هذه 16 وحدة حساب. حين يكون في الدفعة طلبات قليلة تقسّم النواة الصف إلى مقاطع أكثر وتجمعها على التوازي، ليجد كل وحدة ما تعمل عليه. اسحب <b>عدد الطلبات في الدفعة</b> وراقب كيف يتغير مجموع الصف نفسه. ثم فعّل <b>وضع الثبات عبر الدُّفعات</b> الذي يثبّت عدد المقاطع عند 4.',
      lgA: 'خانة = حاصل ضرب (هذا المقطع)', lgB: 'خانة = حاصل ضرب (المقطع المجاور)',
      bLabel: 'عدد الطلبات في الدفعة B', biLabel: 'وضع الثبات عبر الدُّفعات: عدد المقاطع 4 مهما كان B',
      bSweep: '▶ مسح من B = 1 إلى 16', bClear: 'مسح السجل',
      stageLabel: '64 حاصل ضرب ملوّنة بحسب المقطع',
      segs: (k, len) => `قُسِّم الصف إلى ${k} من المقاطع، وفي كل مقطع ${len} من حواصل الضرب. داخل المقطع يُجمع من اليسار إلى اليمين، ثم تُجمع مجاميع المقاطع اثنين اثنين`,
      sSumK: 'مجموع هذا الصف (float32)', sSumF: (hex) => `<b>نمط البتّات 0x${hex}</b><br>كل عملية جمع تُقرَّب إلى float32`,
      sUlpK: 'الفرق عن التشغيل المنفرد (B = 1)', sUlpF: (ref) => `<b>مقيسًا بخطوات float32 (ULP)</b><br>المرجع بدقة مضاعفة ${ref}: كل نتيجة تقريب صالح`,
      ulp: (n) => `${n} ULP`,
      sTokK: 'الرمز الذي اختاره الجشع', sTokF: (rival) => `<b>درجة X = مجموع هذا الصف</b><br>درجة Y مثبتة عند ${rival}. وهما يكادان يتعادلان`,
      tok: ['X', 'Y'],
      sOccK: 'استخدام وحدات الحساب', sOccF: (b, k) => `<b>= min(16, B × المقاطع) ÷ 16 = min(16, ${b} × ${k}) ÷ 16</b><br>مع ثبات عدد المقاطع تبقى بعض الوحدات عاطلة في الدفعات الصغيرة`,
      histK: 'النتائج المختلفة التي ظهرت', histEmpty: 'اسحب المؤشر أو اضغط «مسح». يُسجَّل هنا كل مجموع مختلف',
      hist: (hex, v, bs, t) => `0x${hex} · ${v} · B = ${bs} · ${t}`,
      ready: '<span class="c">$</span> ready. اسحب [ عدد الطلبات في الدفعة B ] أو اضغط [ ▶ مسح من B = 1 إلى 16 ]',
      lMove: (b, k, v, t) => `<span class="c">[B=${b}]</span> تقسّم النواة الصف إلى ${k} من المقاطع ← المجموع = ${v} ← تختار <span class="w">${t}</span>`,
      lSweep: (bi) => `<span class="y">// مسح B = 1…16 (${bi ? 'ثبات عبر الدُّفعات' : 'عدد المقاطع بحسب حجم الدفعة'})</span>`,
      lMode: (bi) => (bi ? '<span class="m">وضع الثبات عبر الدُّفعات</span>: عدد المقاطع 4، ولم يعد ترتيب الجمع يتبع الدفعة' : '<span class="m">الوضع العادي</span>: عدد المقاطع يتبع حجم الدفعة'),
      vFree: (n, flip) => `من B = 1 إلى 16 ظهر للصف نفسه <b>${n}</b> من مجاميع float32 المختلفة، تختلف بعضها عن بعض ببضع ULP فقط. ${flip ? 'ولأن X وY يكادان يتعادلان تغيّر الرمز المختار أيضًا: Y عندما B ≤ 4، وX عندما B ≥ 5. ' : ''}طلبك لم يتغير. الذي تغيّر هو عدد من يشاركونه الدفعة.`,
      vFixed: 'من B = 1 إلى 16 توجد نتيجة <b>واحدة</b> فقط، وتختار دائمًا Y. والثمن ظاهر في «استخدام وحدات الحساب»: عند B = 1 لا تجد عملًا إلا 4 وحدات. الثبات عبر الدُّفعات يشتري قابلية التكرار لا الدقة. في هذا الصف يصادف أن مجموع المقاطع الأربعة هو الأقرب إلى المرجع بدقة مضاعفة، لكنها مصادفة، وقد يختلف الأمر في صف آخر. الثبات عبر الدُّفعات يثبّت الترتيب فقط، ولا يختار الترتيب الأدق.',
      try: [
        'اسحب B من 1 إلى 16: القيم B = 1 و2 و3–4 و5–8 و9 فأكثر تعطي مجموعًا واحدًا لكل منها، وتختلف المجاميع المتجاورة بـ 1 إلى 3 ULP فقط.',
        'راقب «الرمز الذي اختاره الجشع»: هو Y عندما B ≤ 4 وX عندما B ≥ 5. فرق 4 ULP يبدّل كلمة، وتختلف الإجابة كلها بعدها.',
        'فعّل وضع الثبات عبر الدُّفعات وامسح مرة أخرى: لا تبقى إلا نتيجة واحدة. وراقب «استخدام وحدات الحساب» يهبط إلى 25% عند B = 1. من هنا يأتي «الأبطأ».',
      ],

      mCode: 'TOKEN_MASK', mTitle: 'المخرجات المهيكلة: قناع فوق المفردات', mTag: 'تقدير تعليمي · مفردات لعبة من 12 رمزًا',
      mIntro: 'تطلب المُطالبة من النموذج «أن يكمل قصة طويلة جدًّا كما يشاء»، لكن الصيغة يجب أن تطابق التعبير النمطي <code>[A-Z]{2}-[0-9]{3}</code> (مثال DeepInfer يُحرج النموذج عمدًا بهذه الطريقة). في كل خطوة تحسب الأتمتة أولًا الرموز التي لا تُفسد الصيغة وتحزمها في قناع بتّات. وتتحول درجات باقي الرموز إلى −∞، ثم تُختار أعلى درجة.',
      mLgOk: 'مسموح: كتابته لا تُفسد الصيغة', mLgNo: 'محجوب: الدرجة تصبح −∞', mLgPick: 'المختار في هذه الخطوة',
      mSteps: ['تقدّم الأتمتة', 'حساب الرموز السليمة', 'حزمها في قناع بتّات', 'المحجوب → −∞', 'اختيار أعلى درجة'],
      mStep: '▶ خطوة', mAll: '▶▶ إلى النهاية', mReset: 'إعادة', mOff: 'إطفاء القيد (لترى ما يريد النموذج كتابته)',
      slotsLabel: 'المواضع الستة للتعبير النمطي',
      cls: { 'A-Z': 'A–Z', '0-9': '0–9', '-': '-' },
      sTextK: 'النص المكتوب حتى الآن', sTextF: (s) => `<b>الحالة = ${s} من 6 مواضع ممتلئة</b><br>لا يُسمح بـ EOS إلا إذا امتلأت المواضع الستة`,
      sMaskK: 'قناع البتّات (int32 رقم 0)', sMaskF: (bits) => `<b>البت i = هل الرمز i مسموح</b><br>الرموز 0→11 (البت الأدنى أولًا): ${bits}`,
      sTopK: 'الرمز الأعلى درجة عند النموذج', sTopF: '<b>بلا قناع كان الجشع سيختاره</b><br>الدرجات افتراض تعليمي',
      inf: '−∞', empty: '(فارغ)',
      storyToks: ['كان', ' ثلاجة', '،'],
      mReady: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ] لتوليد رمز واحد عند كل ضغطة',
      m0: (s) => `<span class="c">[الحالة ${s}]</span> تنظر الأتمتة في الأحرف المكتوبة وتحكم هل يخرج كل رمز عن الصيغة إن كُتب`,
      m1: (ok) => `<span class="m">السليمة</span>: ${ok}`,
      m2: (hex) => `<span class="m">قناع البتّات</span>: 0x${hex} (الرموز الـ 12 لا تشغل إلا أدنى 12 بتًّا في int32 واحد)`,
      m3: (n) => `<span class="m">الحجب</span>: درجات الرموز الـ ${n} الباقية تصبح −∞`,
      m4: (tok, top) => `<span class="w">المختار</span> ${tok} (أكثر ما أراد النموذج كتابته ${top})`,
      mFree: (tok) => `<span class="y">بلا قيد</span>: يُختار مباشرة الرمز الأعلى درجة ${tok}`,
      mDone: (txt) => `<span class="y">تم</span>: المخرجات ${txt}، ثم يُكتب EOS للنهاية`,
      mStop: '<span class="y">// استُنفدت 6 خطوات ولا رمز نهاية: ما زال النموذج يريد مواصلة القصة</span>',
      mvOn: (txt) => `المخرجات <b>${txt}</b>. تطابق <code>[A-Z]{2}-[0-9]{3}</code> تمامًا ثم تنتهي طبيعيًّا. في كل خطوة كان الرمز الأعلى درجة عند النموذج كلمة من القصة، لكنها كلها محجوبة. انتبه إلى رموز مثل <b>Z-</b> تمتد عبر موضعين: على الأتمتة أن تفحصها حرفًا حرفًا.`,
      mvOff: (txt) => `حين يُطفأ القيد يكتب الجشع <b>${txt}</b>. يتبع النموذج المُطالبة ويكتب قصة لا علاقة لها بالصيغة. القناع لا يغيّر النموذج. هو يغيّر فقط «الرموز التي يمكن الاختيار منها».`,
      mTry: [
        'اضغط <b>خطوة</b> مرات متتالية. في الخطوة 1 لا يصلح إلا AB وQ. أما A1 فيبدأ بحرف لكنه محجوب أيضًا، لأن الحرف الثاني يجب أن يكون حرفًا كذلك.',
        'عند الخطوة 3 انظر إلى قناع البتّات: لا تساوي 1 إلا بتّات الرموز 12 و7 و345. والرمز 345 الأعلى درجة يملأ المواضع الثلاثة دفعة واحدة.',
        'فعّل <b>إطفاء القيد</b> ثم شغّل إلى النهاية: يواصل النموذج كتابة «كان ثلاجة، …». القناع يغيّر الدرجات قبل أخذ العينات فقط، وحساب النموذج لا يتغير إطلاقًا.',
      ],
    },
  });

  const sig = x => x.toPrecision(9);
  // The three story tokens of the toy vocabulary are shown through T, so a translation can relabel them.
  const tokName = id => (id < T.storyToks.length ? T.storyToks[id] : M.VOCAB[id]);

  Viz.register('di-determinism-reduce', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgA, glow: true },
        { color: 'var(--a2)', text: T.lgB },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 392 108', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const cells = [];
      for (let i = 0; i < M.N; i++) cells.push(Viz.svg('rect', { x: 4 + (i % 16) * 24, y: 4 + Math.floor(i / 16) * 26, width: 20, height: 22, class: 'viz-cell' }, svg));
      left.insertAdjacentHTML('beforeend', `<p class="rd-segs" style="font-family:var(--mono);font-size:12px;color:var(--muted);margin:8px 0 0"></p>
        <div class="viz-slider"><label>${T.bLabel}</label><input class="rd-b" type="range" min="1" max="16" value="1" aria-label="${Viz.esc(T.bLabel)}"><output class="rd-bo">1</output></div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:14px"><input class="rd-bi" type="checkbox" style="accent-color:var(--accent);flex:0 0 auto">${T.biLabel}</label>
        <div class="viz-row">${Viz.button(T.bSweep)}${Viz.button(T.bClear, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'rd-sum', k: T.sSumK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'rd-ulp', k: T.sUlpK, v: '', f: T.sUlpF(sig(M.exactSum(M.row()))) }) +
        Viz.stat({ id: 'rd-tok', k: T.sTokK, v: '', f: T.sTokF(sig(M.RIVAL)) }) +
        Viz.stat({ id: 'rd-occ', k: T.sOccK, v: '', f: '' }) +
        `<div class="viz-stat"><div class="k">${T.histK}</div><div class="rd-hist" style="font-family:var(--mono);font-size:12px;line-height:1.7;margin-top:4px;overflow-wrap:anywhere"></div></div>`;
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const [sweepBtn, clearBtn] = el.querySelectorAll('.viz-btn');
      const range = $('.rd-b'), bi = $('.rd-bi'), verdict = $('.viz-verdict');
      const values = M.row(), base = M.reduce(values, M.splitsFor(1, false)).value;
      let seen = new Map(), busy = false;

      function render(b, log) {
        const inv = bi.checked, k = M.splitsFor(b, inv), len = M.N / k, r = M.reduce(values, k), t = M.pickToken(r.value);
        cells.forEach((c, i) => c.setAttribute('class', 'viz-cell ' + (Math.floor(i / len) % 2 ? 'score' : 'pick')));
        $('.rd-segs').textContent = T.segs(k, len);
        $('.rd-bo').textContent = String(b);
        $('[data-s=rd-sum-v]').textContent = sig(r.value);
        $('[data-s=rd-sum-f]').innerHTML = T.sSumF(M.hexF32(r.value));
        $('[data-s=rd-ulp-v]').textContent = T.ulp(M.ulpF32(r.value, base));
        $('[data-s=rd-tok-v]').textContent = T.tok[t];
        $('[data-s=rd-occ-v]').textContent = Math.round(M.occupancy(b, k) * 100) + '%';
        $('[data-s=rd-occ-f]').innerHTML = T.sOccF(b, k);
        const key = r.value;
        if (!seen.has(key)) seen.set(key, { bs: [], t });
        const e = seen.get(key);
        if (!e.bs.includes(b)) e.bs.push(b);
        $('.rd-hist').innerHTML = seen.size ? [...seen.entries()].map(([v, x]) => `<div>${T.hist(M.hexF32(v), sig(v), x.bs.sort((p, q) => p - q).join(','), T.tok[x.t])}</div>`).join('') : `<span>${T.histEmpty}</span>`;
        if (log) term.log(T.lMove(b, k, sig(r.value), T.tok[t]));
      }
      function clear() { seen = new Map(); verdict.hidden = true; render(+range.value, false); }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(x => { x.disabled = true; });
        try { await fn(); } catch (err) { if (ctx.alive) throw err; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(x => { x.disabled = false; });
      }
      range.oninput = () => { verdict.hidden = true; render(+range.value, true); };
      bi.onchange = () => { term.log(T.lMode(bi.checked)); clear(); };
      clearBtn.onclick = () => guard(async () => { term.clear(); term.log(T.ready); clear(); });
      sweepBtn.onclick = () => guard(async () => {
        seen = new Map(); verdict.hidden = true;
        term.log(T.lSweep(bi.checked));
        for (let b = 1; b <= M.UNITS; b++) { range.value = String(b); render(b, true); await ctx.sleep(180); }
        const s = M.sweep(bi.checked);
        const flip = new Set(s.rows.map(r => r.token)).size > 1;
        verdict.innerHTML = bi.checked ? T.vFixed : T.vFree(s.distinct, flip);
        verdict.hidden = false;
      });
      $('.rd-hist').innerHTML = `<span>${T.histEmpty}</span>`;
      render(1, false);
    },
  });

  Viz.register('di-determinism-mask', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.mCode, title: T.mTitle, tag: T.mTag, intro: T.mIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.mLgOk },
        { color: 'var(--frame)', text: T.mLgNo },
        { color: 'var(--a3)', text: T.mLgPick, glow: true },
      ]));
      const pipe = Viz.pipe(body, T.mSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 372 64', class: 'viz-stage', role: 'img', 'aria-label': T.slotsLabel }, left);
      const slots = M.CLASSES.map((c, i) => {
        const x = 4 + i * 62;
        const box = Viz.svg('rect', { x, y: 4, width: 54, height: 34, style: 'fill:none;stroke:var(--frame)' }, svg);
        const ch = Viz.svg('text', { x: x + 27, y: 28, 'text-anchor': 'middle', 'font-size': 18, style: 'fill:var(--ink)' }, svg);
        const lab = Viz.svg('text', { x: x + 27, y: 58, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:var(--muted)' }, svg);
        lab.textContent = T.cls[c];
        return { box, ch };
      });
      left.insertAdjacentHTML('beforeend', `<div class="viz-bars mk-bars" style="margin-top:12px"></div>
        <div class="viz-row">${Viz.button(T.mStep)}${Viz.button(T.mAll, 'alt')}${Viz.button(T.mReset, 'ghost')}</div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:14px"><input class="mk-off" type="checkbox" style="accent-color:var(--accent);flex:0 0 auto">${T.mOff}</label>`);
      const term = Viz.term(left, T.mReady);
      right.innerHTML =
        Viz.stat({ id: 'mk-text', k: T.sTextK, v: T.empty, f: T.sTextF(0), hot: true }) +
        Viz.stat({ id: 'mk-mask', k: T.sMaskK, v: '', f: '' }) +
        Viz.stat({ id: 'mk-top', k: T.sTopK, v: '', f: T.sTopF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.mTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, allBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const off = $('.mk-off'), verdict = $('.viz-verdict');
      const MAX_STEPS = 6;
      let state = 0, step = 0, text = '', shown = '', done = false, busy = false;

      function bars(r) {
        const max = Math.max(...M.BASE) + 2;
        $('.mk-bars').innerHTML = M.VOCAB.map((tok, id) => {
          const ok = r ? r.allow[id] : true, pick = r && r.token === id, sc = r ? r.raw[id] : M.scores(step)[id];
          const color = pick ? 'var(--a3)' : ok ? 'var(--accent)' : 'var(--frame)';
          return `<div style="opacity:${ok ? 1 : 0.55}"><span>${Viz.esc(tokName(id))}</span><i style="width:${(sc / max * 100).toFixed(0)}%;background:${color};box-shadow:${pick ? 'var(--glow)' : 'none'}"></i><span>${ok ? sc.toFixed(1) : T.inf}</span></div>`;
        }).join('');
      }
      function paintSlots() {
        const chars = [...text].filter(c => /[A-Z0-9-]/.test(c));
        slots.forEach((s, i) => { s.ch.textContent = off.checked ? '' : (chars[i] || ''); s.box.setAttribute('style', 'fill:none;stroke:' + (i < chars.length && !off.checked ? 'var(--accent)' : 'var(--frame)')); });
      }
      function showStats(r) {
        $('[data-s=mk-text-v]').textContent = shown || T.empty;
        $('[data-s=mk-text-f]').innerHTML = T.sTextF(state < 0 ? M.CLASSES.length : state);
        const words = r ? r.words : M.packMask(M.allowed(state));
        const allow = r ? r.allow : M.allowed(state);
        $('[data-s=mk-mask-v]').textContent = '0x' + words[0].toString(16).padStart(3, '0');
        $('[data-s=mk-mask-f]').innerHTML = T.sMaskF(allow.map(x => (x ? 1 : 0)).join(''));
        const sc = r ? r.raw : M.scores(step);
        $('[data-s=mk-top-v]').textContent = tokName(sc.indexOf(Math.max(...sc)));
      }
      function finish() {
        done = true;
        verdict.innerHTML = off.checked ? T.mvOff(Viz.esc(shown)) : T.mvOn(Viz.esc(shown));
        verdict.hidden = false;
      }
      async function doStep(fast) {
        if (done) return;
        const constrained = !off.checked;
        const r = M.stepGreedy(state, step, constrained);
        const top = tokName(r.raw.indexOf(Math.max(...r.raw)));
        if (constrained) {
          pipe.set(0); if (!fast) term.log(T.m0(state)); await ctx.sleep(fast ? 0 : 220);
          pipe.set(1); bars({ ...r, token: -1 }); if (!fast) term.log(T.m1(M.VOCAB.map((_, i) => i).filter(i => r.allow[i]).map(i => Viz.esc(tokName(i))).join(' · '))); await ctx.sleep(fast ? 0 : 220);
          pipe.set(2); showStats(r); if (!fast) term.log(T.m2(r.words[0].toString(16).padStart(3, '0'))); await ctx.sleep(fast ? 0 : 220);
          pipe.set(3); if (!fast) term.log(T.m3(r.allow.filter(x => !x).length)); await ctx.sleep(fast ? 0 : 220);
          pipe.set(4); if (!fast) term.log(T.m4(Viz.esc(tokName(r.token)), Viz.esc(top)));
        } else {
          pipe.set(4); if (!fast) term.log(T.mFree(Viz.esc(tokName(r.token))));
        }
        bars(r);
        step++;
        if (M.VOCAB[r.token] === M.EOS) { state = -1; showStats(r); paintSlots(); term.log(T.mDone(Viz.esc(shown))); finish(); return; }
        text += M.VOCAB[r.token];
        shown += tokName(r.token);
        if (constrained) state = r.next;
        showStats(r); paintSlots();
        if (step >= MAX_STEPS) { term.log(T.mStop); finish(); }
      }
      function reset() {
        state = 0; step = 0; text = ''; shown = ''; done = false; verdict.hidden = true; pipe.set(-1);
        bars(null); showStats(null); paintSlots();
      }
      async function guard(fn) {
        if (busy) return;
        busy = true; el.querySelectorAll('.viz-btn').forEach(x => { x.disabled = true; });
        try { await fn(); } catch (err) { if (ctx.alive) throw err; }
        busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(x => { x.disabled = false; });
      }
      stepBtn.onclick = () => guard(() => doStep(false));
      allBtn.onclick = () => guard(async () => { while (!done) { await doStep(true); await ctx.sleep(120); } });
      resetBtn.onclick = () => guard(async () => { term.clear(); term.log(T.mReady); reset(); });
      off.onchange = () => guard(async () => { term.clear(); term.log(T.mReady); reset(); });
      reset();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
