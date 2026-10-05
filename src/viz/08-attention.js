/* Chapter 08 widgets: one attention step on 2-D toy vectors, and the cost of looking back.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.attention;

  const T = Viz.t({
    zh: {
      code: 'ATTN_STEP', title: '注意力的一步：打分、softmax、加权求和', tag: '教学推演 · 二维玩具向量',
      intro: '前文有 4 个词，每个词带一把<b>键</b>（平面上的箭头，表示“我是什么”）和一份<b>值</b>（“我能提供的内容”）。当前词发出一个<b>查询</b> q（高亮的箭头，表示“我在找什么”）。拖动滑块转动 q，或按 <b>单步</b> 看四步计算。',
      lgKey: '键 k：前文每个词的“标签”', lgQ: '查询 q：当前词在找什么', lgW: '注意力权重（条越长，看得越多）',
      steps: ['点积打分', '除以 √d', 'softmax', '加权求和'],
      words: ['小猫', '追着', '毛线球', '跑'],
      plane: '查询与四个键的二维平面，以及每个词的分数和权重',
      angle: 'q 的方向（度）', bStep: '▶ 单步', bRestart: '从头单步',
      presets: ['找“小猫”', '找“追着”', '夹在中间', '找“跑”'],
      out: (o) => `输出 = [${o}]`,
      sep: '，',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ]，一步一步看注意力怎么算',
      l0: (s) => `<span class="c">① 打分</span>：sᵢ = q · kᵢ，方向越接近分越高：${s}`,
      l1: (s) => `<span class="c">② 缩放</span>：每个分数除以 √d = √2 ≈ 1.41，得到 ${s}。真实的 QSA 每个头 d = 256，要除以 16`,
      l2: (w) => `<span class="m">③ softmax</span>：先取 e 的幂，再除以总和，权重都为正、加起来等于 1：${w}`,
      l3: (o) => `<span class="y">④ 加权求和</span>：输出 = Σ wᵢ · vᵢ = [${o}]。注意力不是“挑一个”，而是按比例混合所有值`,
      again: '<span class="y">// 已到最后一步。按 [ 从头单步 ] 再来一遍</span>',
      sTopK: '权重最大的词', sTopF: (w, p) => `<b>${w}</b> 拿到 ${p}% 的注意力<br>q 和它的键方向最接近`,
      sSumK: '权重之和', sSumF: '<b>Σ wᵢ = 1</b><br>softmax 保证每个权重为正、合计为 1',
      sOutK: '输出向量', sOutF: '<b>= Σ wᵢ · vᵢ</b><br>值 v：小猫 [3, 0]，追着 [0, 2]，毛线球 [1, 3]，跑 [0, −2]',
      try: [
        '点 <b>找“小猫”</b>：小猫拿到大部分权重，输出接近小猫的值 [3, 0]。查询和哪个键方向一致，就主要读谁的值。',
        '点 <b>夹在中间</b>：小猫和毛线球的权重差不多，输出是两者值的混合。注意力是“按比例混合”，不是“只挑一个”。',
        '点 <b>找“跑”</b>，再按 <b>从头单步</b>：看第 ③ 步，分数差 1，权重就差约 e 倍。softmax 会放大分数之间的差距。',
      ],

      cCode: 'ATTN_COST', cTitle: '往回看要花多少力气', cTag: '教学推演 · 只数“查询-位置”配对',
      cIntro: '拖动滑块改变上下文长度 n。全注意力里，第 t 个 token 要和前面所有 t 个位置配对；QSA 每次最多只看 2051 个被选中的位置。下面的条用<b>对数刻度</b>：每往右一格，数量乘 10。',
      cLgFull: '全注意力', cLgQsa: 'QSA（每次最多 2051 个位置）',
      nLabel: '上下文长度 n',
      rows: ['最后一个 token 要看几个位置：全注意力', '最后一个 token 要看几个位置：QSA', '读完整段提问的配对数：全注意力', '读完整段提问的配对数：QSA'],
      stage: '对数刻度的条形图：全注意力与 QSA 的配对数',
      sSaveK: '读完整段：QSA 少算多少', sSaveF: (n) => `<b>= n(n+1)/2 ÷ Σ min(t, 2051)</b><br>n = ${Viz.fmt(n)}`,
      sKvK: 'KV 缓存（FP16）', sKvF: '<b>= 12 层 × 2 个 KV 头 × 256 × 2（K 和 V）× 2 字节 × n</b><br>= 24,576 字节 × n',
      sHypK: '假设：48 层都是全注意力、24 个独立 KV 头', sHypF: '<b>= 上一项 × 4（层数）× 12（头数）= × 48</b><br>这是对比用的假设，不是 Strata 的配置',
      times: (x) => `× ${x}`,
      cLog: (n, full, qsa, ratio) => `<span class="c">[n = ${n}]</span> 读完整段：全注意力 ${full} 对，QSA ${qsa} 对，少算 ${ratio} 倍`,
      cReady: '<span class="c">$</span> 拖动滑块，从 1K 一路拉到 262K',
      cVerdictShort: (n) => `n = ${n} 还没超过 2051：QSA 不需要挑，每个位置都看，和全注意力完全一样。`,
      cVerdict: (n, r, kv) => `n = ${n} 时，全注意力的配对数按 n² 增长，QSA 每个查询最多看 2051 个位置，整体只按 n 增长，读完整段少算约 <b>${r}</b> 倍。<br>但 KV 缓存仍要为每个位置留一份（这里约 ${kv}），因为下一个 token 可能选中任何一个旧位置。`,
      cTry: [
        '把 n 拉到 <b>2K</b>：两条线一样长。上下文不超过 2051 时，QSA 的选择就是“全选”。',
        '从 <b>32K</b> 拉到 <b>262K</b>（长 8 倍）：全注意力的配对数涨约 64 倍，QSA 只涨约 8 倍。这就是 O(n²) 和 O(n) 的差别。',
        '看最后两张卡片：GQA 和“只有 12 层是注意力”加起来，让 KV 缓存小了 48 倍。262K 时是约 6 GiB 对约 288 GiB。',
      ],
    },
    en: {
      code: 'ATTN_STEP', title: 'One attention step: score, softmax, weighted sum', tag: 'Teaching estimate · 2-D toy vectors',
      intro: 'The earlier text has 4 words. Each carries a <b>key</b> (an arrow on the plane: "what I am") and a <b>value</b> ("what I can offer"). The current word sends out a <b>query</b> q (the highlighted arrow: "what I am looking for"). Drag the slider to turn q, or press <b>Step</b> to watch the four steps of the computation.',
      lgKey: 'Key k: the "label" of each earlier word', lgQ: 'Query q: what the current word looks for', lgW: 'Attention weight (longer bar = looks more)',
      steps: ['Dot-product score', 'Divide by √d', 'softmax', 'Weighted sum'],
      words: ['kitten', 'chases', 'yarn', 'runs'],
      plane: 'The query and four keys on a 2-D plane, with each word\'s score and weight',
      angle: 'Direction of q (degrees)', bStep: '▶ Step', bRestart: 'Step from start',
      presets: ['Find "kitten"', 'Find "chases"', 'In between', 'Find "runs"'],
      out: (o) => `output = [${o}]`,
      sep: ', ',
      ready: '<span class="c">$</span> ready. Press [ ▶ Step ] to see how attention is computed, one step at a time',
      l0: (s) => `<span class="c">① Score</span>: sᵢ = q · kᵢ; the closer the direction, the higher the score: ${s}`,
      l1: (s) => `<span class="c">② Scale</span>: divide each score by √d = √2 ≈ 1.41, giving ${s}. Real QSA has d = 256 per head and divides by 16`,
      l2: (w) => `<span class="m">③ softmax</span>: take e to each power, then divide by the total; the weights are all positive and add up to 1: ${w}`,
      l3: (o) => `<span class="y">④ Weighted sum</span>: output = Σ wᵢ · vᵢ = [${o}]. Attention does not "pick one"; it mixes all the values in proportion`,
      again: '<span class="y">// already at the last step. Press [ Step from start ] to go again</span>',
      sTopK: 'Word with the largest weight', sTopF: (w, p) => `<b>${w}</b> gets ${p}% of the attention<br>q points closest to its key`,
      sSumK: 'Sum of weights', sSumF: '<b>Σ wᵢ = 1</b><br>softmax makes every weight positive and the total 1',
      sOutK: 'Output vector', sOutF: '<b>= Σ wᵢ · vᵢ</b><br>values v: kitten [3, 0], chases [0, 2], yarn [1, 3], runs [0, −2]',
      try: [
        'Click <b>Find "kitten"</b>: kitten gets most of the weight and the output is close to its value [3, 0]. Whichever key the query points along is the one whose value it mostly reads.',
        'Click <b>In between</b>: kitten and yarn get about the same weight, and the output is a blend of their values. Attention "mixes in proportion"; it does not "pick just one".',
        'Click <b>Find "runs"</b>, then press <b>Step from start</b>: at step ③, a score gap of 1 makes the weights differ by about a factor of e. softmax amplifies the gaps between scores.',
      ],

      cCode: 'ATTN_COST', cTitle: 'How much effort looking back takes', cTag: 'Teaching estimate · counts only query–position pairs',
      cIntro: 'Drag the slider to change the context length n. In full attention, the t-th token pairs with all t positions up to it; QSA looks at no more than 2051 picked positions each time. The bars below use a <b>log scale</b>: each step to the right multiplies the count by 10.',
      cLgFull: 'Full attention', cLgQsa: 'QSA (at most 2051 positions each time)',
      nLabel: 'Context length n',
      rows: ['Positions the last token sees: full attention', 'Positions the last token sees: QSA', 'Pairs to read the whole prompt: full attention', 'Pairs to read the whole prompt: QSA'],
      stage: 'Log-scale bar chart: pair counts of full attention and QSA',
      sSaveK: 'Whole prompt: how much less QSA computes', sSaveF: (n) => `<b>= n(n+1)/2 ÷ Σ min(t, 2051)</b><br>n = ${Viz.fmt(n)}`,
      sKvK: 'KV cache (FP16)', sKvF: '<b>= 12 layers × 2 KV heads × 256 × 2 (K and V) × 2 bytes × n</b><br>= 24,576 bytes × n',
      sHypK: 'Suppose: all 48 layers full attention, 24 separate KV heads', sHypF: '<b>= the item above × 4 (layers) × 12 (heads) = × 48</b><br>a hypothetical for comparison, not Strata\'s configuration',
      times: (x) => `× ${x}`,
      cLog: (n, full, qsa, ratio) => `<span class="c">[n = ${n}]</span> whole prompt: full attention ${full} pairs, QSA ${qsa} pairs, ${ratio}× fewer`,
      cReady: '<span class="c">$</span> drag the slider all the way from 1K to 262K',
      cVerdictShort: (n) => `n = ${n} is not above 2051 yet: QSA has nothing to pick, looks at every position, and is exactly the same as full attention.`,
      cVerdict: (n, r, kv) => `At n = ${n}, full attention's pair count grows as n², while QSA looks at no more than 2051 positions per query and grows only as n overall; reading the whole prompt takes about <b>${r}</b>× fewer pairs.<br>But the KV cache still keeps an entry for every position (about ${kv} here), because the next token may pick any old position.`,
      cTry: [
        'Drag n to <b>2K</b>: the two bars are the same length. When the context is no more than 2051, QSA\'s selection is "pick all".',
        'Drag from <b>32K</b> to <b>262K</b> (8× longer): full attention\'s pairs grow about 64×, QSA\'s only about 8×. That is the difference between O(n²) and O(n).',
        'Look at the last two cards: GQA plus "only 12 layers do attention" make the KV cache 48 times smaller. At 262K that is about 6 GiB against about 288 GiB.',
      ],
    },
    ar: {
      code: 'ATTN_STEP', title: 'خطوة انتباه واحدة: التقييم وsoftmax والجمع الموزون', tag: 'تقدير تعليمي · متجهات لعبة بعدين',
      intro: 'في النص السابق 4 كلمات، لكل كلمة <b>مفتاح</b> (سهم على المستوى، يعني «ما أنا») و<b>قيمة</b> («ما أستطيع تقديمه»). وترسل الكلمة الحالية <b>استعلامًا</b> q (السهم المضيء، يعني «ما الذي أبحث عنه»). اسحب المنزلق لتدير q، أو اضغط <b>خطوة</b> لترى خطوات الحساب الأربع.',
      lgKey: 'المفتاح k: «ملصق» كل كلمة سابقة', lgQ: 'الاستعلام q: ما تبحث عنه الكلمة الحالية', lgW: 'وزن الانتباه (كلما طال الشريط زاد النظر)',
      steps: ['تقييم بالضرب النقطي', 'القسمة على √d', 'softmax', 'جمع موزون'],
      words: ['القطة', 'تطارد', 'الكرة', 'تركض'],
      plane: 'الاستعلام والمفاتيح الأربعة على مستوى ببعدين، مع درجة كل كلمة ووزنها',
      angle: 'اتجاه q (بالدرجات)', bStep: '▶ خطوة', bRestart: 'خطوة من البداية',
      presets: ['نحو «القطة»', 'نحو «تطارد»', 'بين الاثنين', 'نحو «تركض»'],
      out: (o) => `الخرج = [${o.replace(/, /g, ',')}]`,
      sep: '، ',
      ready: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ] لترى كيف يُحسب الانتباه خطوة خطوة',
      l0: (s) => `<span class="c">① التقييم</span>: <bdi dir="ltr">sᵢ = q · kᵢ</bdi>، وكلما تقارب الاتجاه زادت الدرجة: ${s}`,
      l1: (s) => `<span class="c">② التحجيم</span>: تُقسم كل درجة على <bdi dir="ltr">√d = √2 ≈ 1.41</bdi>، فتصير ${s}. في QSA الحقيقية d = 256 لكل رأس، فالقسمة على 16`,
      l2: (w) => `<span class="m">③ softmax</span>: نأخذ e أسًّا لكل درجة، ثم نقسم على المجموع. الأوزان كلها موجبة ومجموعها 1: ${w}`,
      l3: (o) => `<span class="y">④ الجمع الموزون</span>: الخرج = <bdi dir="ltr">Σ wᵢ · vᵢ = [${o}]</bdi>. الانتباه لا «يختار واحدًا»، بل يمزج كل القيم بنِسَبها`,
      again: '<span class="y">// وصلنا إلى الخطوة الأخيرة. اضغط [ خطوة من البداية ] لتعيدها</span>',
      sTopK: 'الكلمة ذات أكبر وزن', sTopF: (w, p) => `<b>${w}</b> تنال ${p}% من الانتباه<br>اتجاه q أقرب ما يكون إلى مفتاحها`,
      sSumK: 'مجموع الأوزان', sSumF: '<b><bdi dir="ltr">Σ wᵢ = 1</bdi></b><br>يجعل softmax كل وزن موجبًا ومجموعها 1',
      sOutK: 'متجه الخرج', sOutF: '<b><bdi dir="ltr">= Σ wᵢ · vᵢ</bdi></b><br>القيم v: القطة <bdi dir="ltr">[3, 0]</bdi>، تطارد <bdi dir="ltr">[0, 2]</bdi>، الكرة <bdi dir="ltr">[1, 3]</bdi>، تركض <bdi dir="ltr">[0, −2]</bdi>',
      try: [
        'اضغط <b>نحو «القطة»</b>: تنال القطة معظم الوزن، فيقترب الخرج من قيمتها <bdi dir="ltr">[3, 0]</bdi>. المفتاح الذي يتفق اتجاهه مع الاستعلام هو الذي تُقرأ قيمته أساسًا.',
        'اضغط <b>بين الاثنين</b>: يتقارب وزنا القطة والكرة، والخرج مزيج من قيمتيهما. الانتباه «مزج بالنِّسَب» وليس «اختيار واحد فقط».',
        'اضغط <b>نحو «تركض»</b>، ثم <b>خطوة من البداية</b>: في الخطوة ③ يعني فرق الدرجة 1 فرقًا في الوزن نحو e مرة. يضخّم softmax الفروق بين الدرجات.',
      ],

      cCode: 'ATTN_COST', cTitle: 'كم يكلّف النظر إلى الوراء', cTag: 'تقدير تعليمي · عدّ أزواج «استعلام وموضع» فقط',
      cIntro: 'اسحب المنزلق لتغيير طول السياق n. في الانتباه الكامل يقترن الرمز رقم t بكل المواضع السابقة وعددها t؛ أما QSA فتنظر في كل مرة إلى 2051 موضعًا مختارًا على الأكثر. الأشرطة أدناه بـ<b>مقياس لوغاريتمي</b>: كل خطوة على المحور تضرب العدد في 10.',
      cLgFull: 'الانتباه الكامل', cLgQsa: 'QSA (2051 موضعًا على الأكثر في كل مرة)',
      nLabel: 'طول السياق n',
      rows: ['عدد المواضع التي ينظر إليها آخر رمز: الانتباه الكامل', 'عدد المواضع التي ينظر إليها آخر رمز: QSA', 'عدد الأزواج لقراءة المُطالبة كلها: الانتباه الكامل', 'عدد الأزواج لقراءة المُطالبة كلها: QSA'],
      stage: 'مخطط أشرطة لوغاريتمي: عدد الأزواج في الانتباه الكامل وفي QSA',
      sSaveK: 'قراءة المُطالبة كلها: كم تقلّل QSA من الحساب', sSaveF: (n) => `<b><bdi dir="ltr">= n(n+1)/2 ÷ Σ min(t, 2051)</bdi></b><br><bdi dir="ltr">n = ${Viz.fmt(n)}</bdi>`,
      sKvK: 'ذاكرة KV المؤقتة (FP16)', sKvF: '<b><bdi dir="ltr">= 12 × 2 × 256 × 2 × 2 × n</bdi></b><br>الطبقات × رؤوس KV × البُعد × (K وV) × بايتات<br><bdi dir="ltr">= 24,576 bytes × n</bdi>',
      sHypK: 'افتراض: 48 طبقة كلها انتباه كامل، و24 رأس KV مستقلًا', sHypF: '<b><bdi dir="ltr">× 4 × 12 = × 48</bdi></b><br>الناتج السابق مضروبًا في 4 (الطبقات) وفي 12 (الرؤوس). هذا افتراض للمقارنة، وليس إعداد Strata',
      times: (x) => `${x}×`,
      cLog: (n, full, qsa, ratio) => `<span class="c">[n = ${n}]</span> قراءة المُطالبة كلها: الانتباه الكامل <bdi dir="ltr">${full}</bdi> زوج، وQSA <bdi dir="ltr">${qsa}</bdi> زوج، بتوفير ${ratio} مرة`,
      cReady: '<span class="c">$</span> اسحب المنزلق من 1K حتى 262K',
      cVerdictShort: (n) => `n = ${n} لم يتجاوز 2051 بعد: لا تحتاج QSA إلى الاختيار، فتنظر إلى كل موضع، وتطابق الانتباه الكامل تمامًا.`,
      cVerdict: (n, r, kv) => `عند n = ${n} يتزايد عدد أزواج الانتباه الكامل بحسب n². أما QSA فتنظر في كل استعلام إلى 2051 موضعًا على الأكثر، فيتزايد عملها كله بحسب n فقط، وتوفّر في قراءة المُطالبة كلها نحو <b>${r}</b> مرة.<br>لكن ذاكرة KV المؤقتة يجب أن تحتفظ بنسخة لكل موضع (هنا نحو ${kv})، لأن الرمز التالي قد يختار أي موضع قديم.`,
      cTry: [
        'اسحب n إلى <b>2K</b>: يتساوى الشريطان. إذا لم يتجاوز السياق 2051 فاختيار QSA هو «اختيار الكل».',
        'اسحب من <b>32K</b> إلى <b>262K</b> (أطول 8 مرات): يزيد عدد أزواج الانتباه الكامل نحو 64 مرة، وتزيد QSA نحو 8 مرات فقط. هذا هو الفرق بين O(n²) وO(n).',
        'انظر إلى البطاقتين الأخيرتين: يجتمع GQA وكون 12 طبقة فقط تعمل بالانتباه، فتصغر ذاكرة KV المؤقتة 48 مرة. عند 262K يكون الفرق نحو 6 GiB مقابل نحو 288 GiB.',
      ],
    },
    ko: {
      code: 'ATTN_STEP', title: '어텐션 한 단계: 점수, 소프트맥스, 가중합', tag: '교육용 추정 · 2차원 장난감 벡터',
      intro: '앞글에 단어가 4개 있어요. 단어마다 <b>키</b>(평면 위의 화살표, "나는 무엇인가")와 <b>값</b>("내가 줄 수 있는 내용")이 하나씩 있어요. 현재 단어는 <b>쿼리</b> q(강조된 화살표, "나는 무엇을 찾나")를 보내요. 슬라이더를 끌어 q를 돌려 보거나, <b>한 단계</b>를 눌러 네 단계 계산을 따라가 보세요.',
      lgKey: '키 k: 앞글 각 단어의 "라벨"', lgQ: '쿼리 q: 현재 단어가 찾는 것', lgW: '어텐션 가중치(막대가 길수록 많이 봐요)',
      steps: ['내적 점수', '√d로 나누기', '소프트맥스', '가중합'],
      words: ['고양이', '쫓아', '털실 공', '달려'],
      plane: '쿼리와 키 4개를 보여 주는 2차원 평면, 그리고 단어별 점수와 가중치',
      angle: 'q의 방향(도)', bStep: '▶ 한 단계', bRestart: '처음부터 단계 실행',
      presets: ['"고양이" 찾기', '"쫓아" 찾기', '중간에 놓기', '"달려" 찾기'],
      out: (o) => `출력 = [${o}]`,
      sep: ', ',
      ready: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 눌러 어텐션이 어떻게 계산되는지 한 단계씩 보세요',
      l0: (s) => `<span class="c">① 점수</span>: sᵢ = q · kᵢ. 방향이 비슷할수록 점수가 높아요: ${s}`,
      l1: (s) => `<span class="c">② 스케일링</span>: 점수마다 √d = √2 ≈ 1.41로 나누면 ${s}가 돼요. 실제 QSA는 헤드마다 d = 256이라 16으로 나눠요`,
      l2: (w) => `<span class="m">③ 소프트맥스</span>: e의 거듭제곱을 구한 뒤 합으로 나눠요. 가중치는 모두 양수이고 합이 1이에요: ${w}`,
      l3: (o) => `<span class="y">④ 가중합</span>: 출력 = Σ wᵢ · vᵢ = [${o}]. 어텐션은 "하나를 고르는" 것이 아니라 모든 값을 비율대로 섞어요`,
      again: '<span class="y">// 마지막 단계예요. [ 처음부터 단계 실행 ]을 누르면 다시 볼 수 있어요</span>',
      sTopK: '가중치가 가장 큰 단어', sTopF: (w, p) => `<b>${w}</b>: 어텐션의 ${p}%<br>q가 이 단어의 키와 방향이 가장 비슷해요`,
      sSumK: '가중치의 합', sSumF: '<b>Σ wᵢ = 1</b><br>소프트맥스는 가중치를 모두 양수로, 합을 1로 만들어요',
      sOutK: '출력 벡터', sOutF: '<b>= Σ wᵢ · vᵢ</b><br>값 v: 고양이 [3, 0], 쫓아 [0, 2], 털실 공 [1, 3], 달려 [0, −2]',
      try: [
        '<b>"고양이" 찾기</b>를 눌러 보세요. 고양이가 가중치 대부분을 받고, 출력은 고양이의 값 [3, 0]에 가까워져요. 쿼리와 방향이 같은 키의 값을 주로 읽는 거예요.',
        '<b>중간에 놓기</b>를 눌러 보세요. 고양이와 털실 공의 가중치가 비슷하고, 출력은 두 값을 섞은 것이 돼요. 어텐션은 "비율대로 섞는" 것이지 "하나만 고르는" 것이 아니에요.',
        '<b>"달려" 찾기</b>를 누른 다음 <b>처음부터 단계 실행</b>을 눌러 보세요. ③ 단계에서 점수가 1 차이 나면 가중치는 약 e배 차이가 나요. 소프트맥스는 점수 사이의 차이를 키워요.',
      ],

      cCode: 'ATTN_COST', cTitle: '되짚어 보는 데 드는 힘', cTag: '교육용 추정 · "쿼리-위치" 쌍만 세요',
      cIntro: '슬라이더를 끌어 컨텍스트 길이 n을 바꿔 보세요. 풀 어텐션에서는 t번째 토큰이 앞의 t개 위치와 모두 짝을 이뤄요. QSA는 한 번에 선택된 위치를 최대 2051개만 봐요. 아래 막대는 <b>로그 눈금</b>이에요. 오른쪽으로 한 칸 갈 때마다 개수가 10배가 돼요.',
      cLgFull: '풀 어텐션', cLgQsa: 'QSA(한 번에 최대 2051개 위치)',
      nLabel: '컨텍스트 길이 n',
      rows: ['마지막 토큰이 볼 위치 수: 풀 어텐션', '마지막 토큰이 볼 위치 수: QSA', '프롬프트 전체를 읽는 쌍의 수: 풀 어텐션', '프롬프트 전체를 읽는 쌍의 수: QSA'],
      stage: '로그 눈금 막대 그래프: 풀 어텐션과 QSA의 쌍의 수',
      sSaveK: '프롬프트 전체: QSA가 덜 계산하는 정도', sSaveF: (n) => `<b>= n(n+1)/2 ÷ Σ min(t, 2051)</b><br>n = ${Viz.fmt(n)}`,
      sKvK: 'KV 캐시(FP16)', sKvF: '<b>= 12개 층 × KV 헤드 2개 × 256 × 2(K와 V) × 2바이트 × n</b><br>= 24,576바이트 × n',
      sHypK: '가정: 48개 층 모두 풀 어텐션, 독립 KV 헤드 24개', sHypF: '<b>= 위 항목 × 4(층 수) × 12(헤드 수) = × 48</b><br>비교용 가정이고, Strata의 구성이 아니에요',
      times: (x) => `× ${x}`,
      cLog: (n, full, qsa, ratio) => `<span class="c">[n = ${n}]</span> 프롬프트 전체: 풀 어텐션 ${full}쌍, QSA ${qsa}쌍, ${ratio}배 적게 계산해요`,
      cReady: '<span class="c">$</span> 슬라이더를 1K에서 262K까지 끝까지 끌어 보세요',
      cVerdictShort: (n) => `n = ${n}은 아직 2051을 넘지 않아요. QSA는 고를 것이 없어서 모든 위치를 보고, 풀 어텐션과 완전히 같아요.`,
      cVerdict: (n, r, kv) => `n = ${n}일 때 풀 어텐션의 쌍의 수는 n²으로 늘어나요. QSA는 쿼리마다 최대 2051개 위치만 보므로 전체로는 n으로만 늘어나고, 프롬프트 전체를 읽을 때 약 <b>${r}</b>배 적게 계산해요.<br>하지만 KV 캐시는 여전히 위치마다 한 벌씩 남겨야 해요(여기서는 약 ${kv}). 다음 토큰이 어떤 옛 위치든 고를 수 있기 때문이에요.`,
      cTry: [
        'n을 <b>2K</b>로 끌어 보세요. 두 막대의 길이가 같아요. 컨텍스트가 2051 이하이면 QSA의 선택은 "전부 선택"이에요.',
        '<b>32K</b>에서 <b>262K</b>로 끌어 보세요(8배 길어져요). 풀 어텐션의 쌍은 약 64배 늘고, QSA는 약 8배만 늘어요. 이것이 O(n²)과 O(n)의 차이예요.',
        '마지막 카드 두 장을 보세요. GQA와 "12개 층만 어텐션"을 합치면 KV 캐시가 48배 작아져요. 262K에서는 약 6 GiB 대 약 288 GiB예요.',
      ],
    },
    es: {
      code: 'ATTN_STEP', title: 'Un paso de atención: puntuar, softmax, suma ponderada', tag: 'Estimación didáctica · vectores de juguete en 2D',
      intro: 'El texto anterior tiene 4 palabras. Cada una lleva una <b>clave</b> (una flecha en el plano: "lo que soy") y un <b>valor</b> ("lo que puedo ofrecer"). La palabra actual envía una <b>consulta</b> q (la flecha resaltada: "lo que busco"). Arrastra el control para girar q, o pulsa <b>Paso</b> para ver los cuatro pasos del cálculo.',
      lgKey: 'Clave k: la "etiqueta" de cada palabra anterior', lgQ: 'Consulta q: lo que busca la palabra actual', lgW: 'Peso de atención (barra más larga = mira más)',
      steps: ['Puntuar con producto punto', 'Dividir entre √d', 'softmax', 'Suma ponderada'],
      words: ['gatito', 'persigue', 'ovillo', 'corre'],
      plane: 'La consulta y cuatro claves en un plano 2D, con la puntuación y el peso de cada palabra',
      angle: 'Dirección de q (grados)', bStep: '▶ Paso', bRestart: 'Repetir desde el inicio',
      presets: ['Busca «gatito»', 'Busca «persigue»', 'Justo en medio', 'Busca «corre»'],
      out: (o) => `salida = [${o}]`,
      sep: ', ',
      ready: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para ver cómo se calcula la atención, un paso a la vez',
      l0: (s) => `<span class="c">① Puntuar</span>: sᵢ = q · kᵢ; cuanto más parecida la dirección, mayor la puntuación: ${s}`,
      l1: (s) => `<span class="c">② Escalar</span>: divide cada puntuación entre √d = √2 ≈ 1.41 y obtienes ${s}. En el QSA real, d = 256 por cabeza y se divide entre 16`,
      l2: (w) => `<span class="m">③ softmax</span>: eleva e a cada puntuación y divide entre el total; los pesos son positivos y suman 1: ${w}`,
      l3: (o) => `<span class="y">④ Suma ponderada</span>: salida = Σ wᵢ · vᵢ = [${o}]. La atención no "elige uno": mezcla todos los valores en proporción`,
      again: '<span class="y">// ya estás en el último paso. Pulsa [ Repetir desde el inicio ] para verlo otra vez</span>',
      sTopK: 'Palabra con el mayor peso', sTopF: (w, p) => `<b>${w}</b> recibe el ${p} % de la atención<br>q apunta casi igual que su clave`,
      sSumK: 'Suma de los pesos', sSumF: '<b>Σ wᵢ = 1</b><br>softmax hace que cada peso sea positivo y que el total sea 1',
      sOutK: 'Vector de salida', sOutF: '<b>= Σ wᵢ · vᵢ</b><br>valores v: gatito [3, 0], persigue [0, 2], ovillo [1, 3], corre [0, −2]',
      try: [
        'Pulsa <b>Busca «gatito»</b>: gatito recibe casi todo el peso y la salida se acerca a su valor [3, 0]. La consulta lee sobre todo el valor de la clave hacia la que apunta.',
        'Pulsa <b>Justo en medio</b>: gatito y ovillo reciben un peso parecido y la salida es una mezcla de sus valores. La atención "mezcla en proporción"; no "elige solo uno".',
        'Pulsa <b>Busca «corre»</b> y luego <b>Repetir desde el inicio</b>: en el paso ③, una diferencia de 1 en la puntuación hace que los pesos se diferencien en un factor de e. softmax amplifica las diferencias entre puntuaciones.',
      ],

      cCode: 'ATTN_COST', cTitle: 'Cuánto cuesta mirar atrás', cTag: 'Estimación didáctica · solo cuenta pares consulta-posición',
      cIntro: 'Arrastra el control para cambiar la longitud del contexto n. En la atención completa, el token t se empareja con las t posiciones anteriores; QSA mira como máximo 2051 posiciones elegidas cada vez. Las barras usan una <b>escala logarítmica</b>: cada marca a la derecha multiplica la cuenta por 10.',
      cLgFull: 'Atención completa', cLgQsa: 'QSA (como máximo 2051 posiciones cada vez)',
      nLabel: 'Longitud del contexto n',
      rows: ['Posiciones que ve el último token: atención completa', 'Posiciones que ve el último token: QSA', 'Pares para leer todo el prompt: atención completa', 'Pares para leer todo el prompt: QSA'],
      stage: 'Gráfico de barras en escala logarítmica: pares de la atención completa y de QSA',
      sSaveK: 'Todo el prompt: cuánto menos calcula QSA', sSaveF: (n) => `<b>= n(n+1)/2 ÷ Σ min(t, 2051)</b><br>n = ${Viz.fmt(n)}`,
      sKvK: 'Caché KV (FP16)', sKvF: '<b>= 12 capas × 2 cabezas KV × 256 × 2 (K y V) × 2 bytes × n</b><br>= 24.576 bytes × n',
      sHypK: 'Hipótesis: las 48 capas con atención completa y 24 cabezas KV propias', sHypF: '<b>= el valor anterior × 4 (capas) × 12 (cabezas) = × 48</b><br>es una hipótesis para comparar, no la configuración de Strata',
      times: (x) => `× ${x}`,
      cLog: (n, full, qsa, ratio) => `<span class="c">[n = ${n}]</span> todo el prompt: atención completa ${full} pares, QSA ${qsa} pares, ${ratio} veces menos`,
      cReady: '<span class="c">$</span> arrastra el control de 1K hasta 262K',
      cVerdictShort: (n) => `n = ${n} aún no supera 2051: QSA no tiene nada que elegir, mira todas las posiciones y es idéntico a la atención completa.`,
      cVerdict: (n, r, kv) => `Con n = ${n}, los pares de la atención completa crecen como n². QSA mira como máximo 2051 posiciones por consulta y crece solo como n; leer todo el prompt necesita unas <b>${r}</b> veces menos pares.<br>Pero la caché KV sigue guardando una entrada por cada posición (aquí unos ${kv}), porque el próximo token puede elegir cualquier posición antigua.`,
      cTry: [
        'Arrastra n hasta <b>2K</b>: las dos barras miden lo mismo. Si el contexto no pasa de 2051, la selección de QSA es "elegir todo".',
        'Arrastra de <b>32K</b> a <b>262K</b> (8 veces más largo): los pares de la atención completa crecen unas 64 veces y los de QSA solo unas 8. Esa es la diferencia entre O(n²) y O(n).',
        'Mira las dos últimas tarjetas: GQA y "solo 12 capas hacen atención" juntas hacen la caché KV 48 veces más pequeña. A 262K son unos 6 GiB frente a unos 288 GiB.',
      ],
    },
    ja: {
      code: 'ATTN_STEP', title: 'アテンションの 1 ステップ：スコア、ソフトマックス、重み付き和', tag: '教育用の試算 · 2 次元のおもちゃベクトル',
      intro: '前の文章には 4 つの単語があります。各単語は<b>キー</b>（平面上の矢印で、「私は何か」を表す）と<b>値</b>（「私が差し出せる中身」）を持っています。現在の単語は<b>クエリ</b> q（強調された矢印で、「私は何を探しているか」を表す）を出します。スライダーを動かして q を回すか、<b>ステップ</b>を押して 4 つの計算ステップを順に見ましょう。',
      lgKey: 'キー k：前の文章の各単語の「ラベル」', lgQ: 'クエリ q：現在の単語が探しているもの', lgW: 'アテンションの重み（バーが長いほどよく見る）',
      steps: ['内積でスコア', '√d で割る', 'ソフトマックス', '重み付き和'],
      words: ['子猫', '追う', '毛糸玉', '走る'],
      plane: 'クエリと 4 つのキーを置いた 2 次元平面と、各単語のスコアおよび重み',
      angle: 'q の向き（度）', bStep: '▶ ステップ', bRestart: '最初からステップ',
      presets: ['「子猫」を探す', '「追う」を探す', '真ん中', '「走る」を探す'],
      out: (o) => `出力 = [${o}]`,
      sep: '、',
      ready: '<span class="c">$</span> ready. [ ▶ ステップ ] を押して、アテンションの計算を 1 歩ずつ見ましょう',
      l0: (s) => `<span class="c">① スコア</span>：sᵢ = q · kᵢ。向きが近いほどスコアが高い：${s}`,
      l1: (s) => `<span class="c">② スケーリング</span>：各スコアを √d = √2 ≈ 1.41 で割ると ${s}。本物の QSA は 1 ヘッドあたり d = 256 なので、16 で割ります`,
      l2: (w) => `<span class="m">③ ソフトマックス</span>：まず e のべき乗を取り、合計で割る。重みはすべて正で、合計は 1：${w}`,
      l3: (o) => `<span class="y">④ 重み付き和</span>：出力 = Σ wᵢ · vᵢ = [${o}]。アテンションは「1 つを選ぶ」のではなく、すべての値を割合どおりに混ぜます`,
      again: '<span class="y">// 最後のステップです。[ 最初からステップ ] でもう一度どうぞ</span>',
      sTopK: '重みが最大の単語', sTopF: (w, p) => `<b>${w}</b> がアテンションの ${p}% を受け取る<br>q はそのキーの向きにいちばん近い`,
      sSumK: '重みの合計', sSumF: '<b>Σ wᵢ = 1</b><br>ソフトマックスは、どの重みも正で合計が 1 になるようにする',
      sOutK: '出力ベクトル', sOutF: '<b>= Σ wᵢ · vᵢ</b><br>値 v：子猫 [3, 0]、追う [0, 2]、毛糸玉 [1, 3]、走る [0, −2]',
      try: [
        '<b>「子猫」を探す</b>を押します。子猫が重みの大部分を受け取り、出力は子猫の値 [3, 0] に近づきます。クエリの向きに合うキーがあれば、主にその値を読みます。',
        '<b>真ん中</b>を押します。子猫と毛糸玉の重みがほぼ同じになり、出力は 2 つの値の混合になります。アテンションは「割合どおりに混ぜる」もので、「1 つだけ選ぶ」ものではありません。',
        '<b>「走る」を探す</b>を押してから、<b>最初からステップ</b>を押します。③ のステップを見てください。スコアの差が 1 だと、重みの差は約 e 倍です。ソフトマックスは、スコアどうしの差を拡大します。',
      ],

      cCode: 'ATTN_COST', cTitle: '見返すのにかかる手間', cTag: '教育用の試算 · 「クエリ-位置」のペアだけを数える',
      cIntro: 'スライダーを動かして、コンテキスト長 n を変えます。完全なアテンションでは、t 番目のトークンが手前の t 個すべての位置とペアになります。QSA は毎回、選ばれた最大 2051 個の位置だけを見ます。下のバーは<b>対数目盛り</b>です。右へ 1 目盛り進むごとに、数が 10 倍になります。',
      cLgFull: '完全なアテンション', cLgQsa: 'QSA（毎回最大 2051 位置）',
      nLabel: 'コンテキスト長 n',
      rows: ['最後のトークンが見る位置の数：完全なアテンション', '最後のトークンが見る位置の数：QSA', '質問全体を読むペア数：完全なアテンション', '質問全体を読むペア数：QSA'],
      stage: '対数目盛りの棒グラフ：完全なアテンションと QSA のペア数',
      sSaveK: '質問全体を読むとき QSA が減らす計算量', sSaveF: (n) => `<b>= n(n+1)/2 ÷ Σ min(t, 2051)</b><br>n = ${Viz.fmt(n)}`,
      sKvK: 'KV キャッシュ（FP16）', sKvF: '<b>= 12 層 × 2 個の KV ヘッド × 256 × 2（K と V）× 2 バイト × n</b><br>= 24,576 バイト × n',
      sHypK: '仮定：48 層すべてが完全なアテンションで、KV ヘッドが 24 個とも独立', sHypF: '<b>= 上の項目 × 4（層数）× 12（ヘッド数）= × 48</b><br>比較のための仮定で、Strata の設定ではありません',
      times: (x) => `× ${x}`,
      cLog: (n, full, qsa, ratio) => `<span class="c">[n = ${n}]</span> 質問全体を読む：完全なアテンション ${full} 組、QSA ${qsa} 組、${ratio} 分の 1`,
      cReady: '<span class="c">$</span> スライダーを 1K から 262K まで引いてみましょう',
      cVerdictShort: (n) => `n = ${n} はまだ 2051 を超えていません。QSA は選ぶ必要がなく、すべての位置を見ます。完全なアテンションとまったく同じです。`,
      cVerdict: (n, r, kv) => `n = ${n} のとき、完全なアテンションのペア数は n² で増えます。QSA はクエリごとに最大 2051 位置しか見ないので、全体では n に比例して増えるだけです。質問全体を読むときの計算量は、約 <b>${r}</b> 分の 1 になります。<br>ただし KV キャッシュは、すべての位置に 1 つずつ残す必要があります（ここでは約 ${kv}）。次のトークンが、どの古い位置でも選ぶ可能性があるからです。`,
      cTry: [
        'n を <b>2K</b> まで引きます。2 本のバーは同じ長さです。コンテキストが 2051 以下なら、QSA の選択は「全部選ぶ」です。',
        '<b>32K</b> から <b>262K</b> まで引きます（長さは 8 倍）。完全なアテンションのペア数は約 64 倍になり、QSA は約 8 倍にしかなりません。これが O(n²) と O(n) の違いです。',
        '最後の 2 枚のカードを見てください。GQA と「アテンションは 12 層だけ」を合わせると、KV キャッシュは 48 分の 1 になります。262K では、約 288 GiB に対して約 6 GiB です。',
      ],
    },
  });

  const KEYS = [[2.2, 0], [-0.6, 1.8], [1.1, 1.7], [-1.6, -0.6]];
  const VALS = [[3, 0], [0, 2], [1, 3], [0, -2]];
  const PRESET_DEG = [0, 100, 32, 205];
  const fmt2 = v => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));

  Viz.register('attention-step', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--muted)', text: T.lgKey },
        { color: 'var(--accent)', text: T.lgQ, glow: true },
        { color: 'var(--a2)', text: T.lgW },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 336', class: 'viz-stage', role: 'img', 'aria-label': T.plane }, left);
      const CX = 180, CY = 98, S = 28;
      const P = v => [CX + v[0] * S, CY - v[1] * S];
      Viz.svg('line', { x1: CX - 92, y1: CY, x2: CX + 92, y2: CY, style: 'stroke:var(--frame)' }, svg);
      Viz.svg('line', { x1: CX, y1: CY - 90, x2: CX, y2: CY + 90, style: 'stroke:var(--frame)' }, svg);
      KEYS.forEach((k, i) => {
        const [x, y] = P(k);
        Viz.svg('line', { x1: CX, y1: CY, x2: x, y2: y, style: 'stroke:var(--muted)', 'stroke-width': 2 }, svg);
        Viz.svg('circle', { cx: x, cy: y, r: 3.5, style: 'fill:var(--muted)' }, svg);
        const len = Math.hypot(k[0], k[1]);
        const t = Viz.svg('text', { x: x + k[0] / len * 10, y: y - k[1] / len * 10 + 4, 'font-size': 13, 'text-anchor': k[0] >= 0 ? 'start' : 'end', style: 'fill:var(--ink)' }, svg);
        t.textContent = T.words[i];
      });
      const qLine = Viz.svg('line', { x1: CX, y1: CY, style: 'stroke:var(--accent)', 'stroke-width': 3 }, svg);
      const qDot = Viz.svg('circle', { r: 5, style: 'fill:var(--accent)' }, svg);
      const qT = Viz.svg('text', { 'font-size': 13, style: 'fill:var(--accent)' }, svg); qT.textContent = 'q';
      const rows = T.words.map((w, i) => {
        const y = 210 + i * 28;
        const lab = Viz.svg('text', { x: 2, y: y + 14, 'font-size': 13, style: 'fill:var(--ink)' }, svg); lab.textContent = w;
        const sc = Viz.svg('text', { x: 58, y: y + 14, 'font-size': 12, style: 'fill:var(--muted)' }, svg);
        const bar = Viz.svg('rect', { x: 140, y: y + 3, height: 14, width: 0, style: 'fill:var(--a2)' }, svg);
        const wt = Viz.svg('text', { x: 356, y: y + 14, 'font-size': 12, 'text-anchor': 'end', style: 'fill:var(--ink)' }, svg);
        return { sc, bar, wt };
      });
      const outT = Viz.svg('text', { x: 2, y: 330, 'font-size': 13, style: 'fill:var(--a3)' }, svg);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${T.presets.map(p => Viz.button(p, 'alt')).join('')}</div>
        <div class="viz-slider"><label>${T.angle}</label><input type="range" min="0" max="359" value="0" data-k="deg" aria-label="${Viz.esc(T.angle)}"><output data-o="deg">0°</output></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bRestart, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'as-top', k: T.sTopK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'as-sum', k: T.sSumK, v: '1.00', f: T.sSumF }) +
        Viz.stat({ id: 'as-out', k: T.sOutK, v: '', f: T.sOutF });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const btns = [...el.querySelectorAll('.viz-btn')];
      const stepBtn = btns[4], restartBtn = btns[5];
      let deg = 0, stage = 3, r;

      function compute() { const a = deg * Math.PI / 180; const q = [3 * Math.cos(a), 3 * Math.sin(a)]; r = M.attend(q, KEYS, VALS); r.q = q; }
      function paint() {
        const [x, y] = P(r.q);
        qLine.setAttribute('x2', x); qLine.setAttribute('y2', y);
        qDot.setAttribute('cx', x); qDot.setAttribute('cy', y);
        qT.setAttribute('x', x + (r.q[0] >= 0 ? 8 : -16)); qT.setAttribute('y', y - 18);  // above the key labels at the arrow tips
        rows.forEach((row, i) => {
          row.sc.textContent = stage >= 1 ? 's÷√2=' + fmt2(r.scaled[i]) : stage >= 0 ? 's=' + fmt2(r.scores[i]) : '';
          row.bar.setAttribute('width', stage >= 2 ? r.weights[i] * 170 : 0);
          row.wt.textContent = stage >= 2 ? r.weights[i].toFixed(2) : '';
        });
        outT.textContent = stage >= 3 ? T.out(r.out.map(fmt2).join(', ')) : '';
        const top = r.weights.indexOf(Math.max(...r.weights));
        $('[data-s=as-top-v]').textContent = stage >= 2 ? T.words[top] : '—';
        $('[data-s=as-top-f]').innerHTML = stage >= 2 ? T.sTopF(T.words[top], (r.weights[top] * 100).toFixed(0)) : '';
        $('[data-s=as-out-v]').textContent = stage >= 3 ? '[' + r.out.map(fmt2).join(', ') + ']' : '—';
      }
      function list(arr) { return arr.map((v, i) => T.words[i] + ' ' + fmt2(v)).join(T.sep); }
      function setDeg(d) { deg = d; $('input[data-k="deg"]').value = d; $('[data-o="deg"]').textContent = d + '°'; compute(); stage = 3; pipe.set(4); paint(); }
      btns.slice(0, 4).forEach((b, j) => { b.onclick = () => { setDeg(PRESET_DEG[j]); stage = -1; pipe.set(-1); paint(); term.log(`<span class="c">[${T.presets[j]}]</span> q = [${r.q.map(fmt2).join(', ')}]`); }; });
      stepBtn.onclick = () => {
        if (stage >= 3) { term.log(T.again); return; }
        stage++; pipe.set(stage); paint();
        if (stage === 0) term.log(T.l0(list(r.scores)));
        if (stage === 1) term.log(T.l1(list(r.scaled)));
        if (stage === 2) term.log(T.l2(list(r.weights)));
        if (stage === 3) term.log(T.l3(r.out.map(fmt2).join(', ')));
      };
      restartBtn.onclick = () => { stage = -1; pipe.set(-1); paint(); term.log(T.ready); };
      $('input[data-k="deg"]').oninput = e => setDeg(+e.target.value);
      compute(); pipe.set(4); paint();
      void ctx;
    },
  });

  Viz.register('attention-cost', {
    mount(el, ctx) {
      const NS = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];
      const NAMES = ['1K', '2K', '4K', '8K', '16K', '32K', '64K', '128K', '262K'];
      const body = Viz.frame(el, { code: T.cCode, title: T.cTitle, tag: T.cTag, intro: T.cIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a2)', text: T.cLgFull },
        { color: 'var(--accent)', text: T.cLgQsa, glow: true },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 360 262', class: 'viz-stage', role: 'img', 'aria-label': T.stage }, left);
      // Log scale: 10^2 .. 10^11 over 340 px.
      const LO = 2, HI = 11, W = 340, X0 = 4;
      const SUP = { 2: '10²', 5: '10⁵', 8: '10⁸', 11: '10¹¹' };
      const X = v => X0 + (Math.log10(Math.max(v, 100)) - LO) / (HI - LO) * W;
      for (let e = LO; e <= HI; e++) {
        Viz.svg('line', { x1: X(10 ** e), y1: 14, x2: X(10 ** e), y2: 232, style: 'stroke:var(--frame)', 'stroke-dasharray': '2 3' }, svg);
        if (e % 3 === 2) { const t = Viz.svg('text', { x: X(10 ** e), y: 252, 'font-size': 12, 'text-anchor': e === HI ? 'end' : e === LO ? 'start' : 'middle', style: 'fill:var(--muted)' }, svg); t.textContent = SUP[e]; }
      }
      const bars = T.rows.map((name, i) => {
        const y = 16 + i * 54;
        const lab = Viz.svg('text', { x: X0, y: y + 12, 'font-size': 12, style: 'fill:var(--ink)' }, svg); lab.textContent = name;
        const bar = Viz.svg('rect', { x: X0, y: y + 20, height: 16, width: 0, style: `fill:${i % 2 ? 'var(--accent)' : 'var(--a2)'}` }, svg);
        const val = Viz.svg('text', { y: y + 33, 'font-size': 12, style: 'fill:var(--ink)' }, svg);
        return { bar, val };
      });
      left.insertAdjacentHTML('beforeend', `<div class="viz-slider"><label>${T.nLabel}</label><input type="range" min="0" max="8" value="5" data-k="n" aria-label="${Viz.esc(T.nLabel)}"><output data-o="n">32K</output></div>`);
      const term = Viz.term(left, T.cReady);
      right.innerHTML =
        Viz.stat({ id: 'ac-s', k: T.sSaveK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'ac-k', k: T.sKvK, v: '', f: T.sKvF }) +
        Viz.stat({ id: 'ac-h', k: T.sHypK, v: '', f: T.sHypF });
      body.insertAdjacentHTML('beforeend', `<div class="viz-verdict"></div>` + Viz.tryList(T.cTry));
      const $ = s => el.querySelector(s);
      const big = v => v >= 1e9 ? (v / 1e9).toFixed(1) + ' × 10⁹' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' × 10⁶' : Viz.fmt(v);
      const bytes = b => b >= 2 ** 30 ? (b / 2 ** 30).toFixed(1) + ' GiB' : (b / 2 ** 20).toFixed(0) + ' MiB';
      let idx = 5;
      function render(log) {
        const n = NS[idx];
        const vals = [n, M.qsaWidth(n), M.causalPairs(n), M.sparsePairs(n)];
        bars.forEach((b, i) => {
          const w = X(vals[i]) - X0;
          b.bar.setAttribute('width', w);
          b.val.textContent = big(vals[i]);
          const tx = X0 + w + 6;
          if (tx > 300) { b.val.setAttribute('x', X0 + w - 6); b.val.setAttribute('text-anchor', 'end'); b.val.style.fill = 'var(--paper)'; }
          else { b.val.setAttribute('x', tx); b.val.setAttribute('text-anchor', 'start'); b.val.style.fill = 'var(--ink)'; }
        });
        const ratio = vals[2] / vals[3];
        $('[data-o="n"]').textContent = NAMES[idx];
        $('[data-s=ac-s-v]').textContent = T.times(ratio.toFixed(ratio < 10 ? 2 : 0));
        $('[data-s=ac-s-f]').innerHTML = T.sSaveF(n);
        $('[data-s=ac-k-v]').textContent = bytes(M.kvBytes(n));
        $('[data-s=ac-h-v]').textContent = bytes(M.kvBytes(n, { layers: 48, kvHeads: 24 }));
        $('.viz-verdict').innerHTML = n <= M.WIDTH ? T.cVerdictShort(NAMES[idx]) : T.cVerdict(NAMES[idx], ratio.toFixed(0), bytes(M.kvBytes(n)));
        if (log) term.log(T.cLog(NAMES[idx], big(vals[2]), big(vals[3]), ratio.toFixed(ratio < 10 ? 2 : 0)));
      }
      const range = $('input[data-k="n"]');
      range.oninput = () => { idx = +range.value; render(false); };
      range.onchange = () => render(true);
      render(false);
      void ctx;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
