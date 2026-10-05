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
    ar: {
      code: 'SPEC_VERIFY', title: 'خمّن أولًا ثم تحقّق', tag: 'تقدير تعليمي · تحقق جشع · مواضع الخطأ بحسب سيناريو ثابت',
      intro: 'تخمّن طبقة المسودة k رمزًا دفعة واحدة، فيضعها النموذج الهدف في <b>نافذة واحدة</b> ويحسبها كلها دفعة واحدة، ثم يقارنها من اليسار إلى اليمين: يقبل حتى أول عدم تطابق، ويُلغي كل ما بعده. اضغط <b>خطوة</b> لترى ترتيب ما يحدث في جولة واحدة. الرموز هنا كلمات كاملة لتسهيل القراءة.',
      lgAcc: 'مقبولة، تُكتب في التاريخ', lgRej: 'أول عدم تطابق: يحل محلها اختيار الهدف', lgVoid: 'بعد عدم التطابق: تُلغى', lgTmp: 'KV مكتوبة مؤقتًا في النافذة',
      steps: ['المسودة تخمّن k', 'حساب النافذة كلها', 'المقارنة من اليسار إلى اليمين', 'إيداع البادئة', 'التراجع عن الباقي'],
      stageLabel: 'نافذة التحقق واختيارات الهدف والحالة المؤقتة',
      text: ['اليوم', ' الجو', ' جميل', ' جدًا', '،', ' سنمشي', ' في', ' الحديقة', ' قليلًا', ' معًا', '.', ' لا', ' تنس', ' أن', ' تأخذ', ' قبعة', ' ومظلة', '،', ' فقد', ' تمطر', ' في', ' المساء', '.', ' في', ' طريق', ' العودة', ' سنشتري', ' بعض', ' الفاكهة', '،', ' ثم', ' نعدّ', ' سلطة', ' معًا', ' الليلة', '.'],
      alt: { 'اليوم': 'أمس', ' الجو': ' الطقس', ' جميل': ' بارد', ' جدًا': ' قليلًا', ' سنمشي': ' سنركض', ' في': ' على', ' الحديقة': ' البحر', ' قليلًا': ' كثيرًا', ' معًا': ' وحدنا', ' لا': ' ربما', ' تنس': ' انس', ' أن': ' ألا', ' تأخذ': ' تشتري', ' قبعة': ' كتابًا', ' ومظلة': ' وكرة', ' فقد': ' لكن', ' تمطر': ' تثلج', ' المساء': ' الصباح', ' طريق': ' وقت', ' العودة': ' الخروج', ' سنشتري': ' سنأكل', ' بعض': ' كل', ' الفاكهة': ' الخضار', ' ثم': ' لم', ' نعدّ': ' نأكل', ' سلطة': ' كبة', ' الليلة': ' غدًا', '،': '.', '.': '!' },
      altDefault: ' أمم',
      rowWin: 'النافذة: الصف 0 نتيجة الجولة السابقة، ثم المسودات', rowOut: 'اختيار الهدف بعد كل صف', rowKv: 'ذاكرة المفتاح والقيمة: كل صف يُكتب مؤقتًا',
      histLabel: 'حتى الآن: ',
      marks: { ok: 'مقبولة', bad: 'مختلفة', void: 'مُلغاة', none: '' },
      unsure: '…', kvTmp: 'مؤقتة', kvKeep: 'تبقى', kvDrop: 'قديمة',
      kLabel: 'طول المسودة k',
      bStep: '▶ خطوة', bRound: '▶▶ أكمل هذه الجولة', bReset: 'إعادة ضبط',
      ready: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ]؛ هناك 5 جولات، وموضع الخطأ في كل منها يتبع سيناريو ثابت',
      sRoundK: 'الجولات المنفَّذة', sRoundF: '<b>كل جولة = تمريرة نافذة واحدة على 48 طبقة</b><br>التوليد العادي واحدًا بعد واحد يعطي رمزًا واحدًا في الجولة',
      sTokK: 'الرموز المُخرَجة', sTokF: '<b>ناتج الجولة = عدد المسودات المقبولة a + 1</b><br>الرمز الإضافي هو اختيار الهدف نفسه عند عدم التطابق',
      sAvgK: 'متوسط الناتج لكل جولة', sAvgF: '<b>= الرموز المُخرَجة ÷ عدد الجولات</b><br>قياس المصدر الأصلي: من 2.4 إلى 3.2 رمز لكل جولة في المتوسط',
      sKeepK: 'n_keep المودَع في هذه الجولة', sKeepF: '<b>= a + 1</b><br>الصف 0 من النافذة + a مسودة مقبولة',
      l0: (r, k, d) => `<span class="c">[الجولة ${r}]</span> خمّنت طبقة المسودة هذه الرموز (العدد ${k}): ${d}`,
      l1: (t) => `<span class="m">التحقق</span>: تمر صفوف النافذة كلها معًا (العدد ${t}) على 48 طبقة، فتعطي اختيار الهدف بعد كل صف (الصفوف التي تلي كلمة خاطئة تظهر «…»: مقدمتها خاطئة فلا فائدة من نتيجتها)؛ وتكتب KV أولًا خانة مؤقتة لكل صف`,
      l2: (a, k, bad) => a === 0 ? `<span class="y">المقارنة</span>: المسودة الأولى «${String(bad).trim()}» تختلف عن الهدف من أول خطوة، a = 0؛ فيتقدم الهدف وحده رمزًا واحدًا في هذه الجولة` : a === k ? `<span class="y">المقارنة</span>: كل المسودات (العدد ${k}) تطابق الهدف، a = ${k}` : `<span class="y">المقارنة</span>: المسودات الأولى (العدد ${a}) متطابقة، والمسودة رقم ${a + 1} «${String(bad).trim()}» تختلف عن الهدف، فتتوقف المقارنة هنا`,
      l3: (n, emitted) => `<span class="w">الإيداع</span>: commit(${n}) يُفعّل الصفوف الأولى فقط (العدد ${n})؛ ناتج هذه الجولة: ${emitted}`,
      l4: (void_, next) => `<span class="c">التراجع</span>: ${void_ ? 'تُلغى ' + void_ + '؛ ' : ''}وتُكتب فوق خانات KV الزائدة في الجولة التالية مباشرة. تبدأ الجولة التالية من «${String(next).trim()}»`,
      lEnd: '<span class="y">// انتهى النص؛ اضغط [ إعادة ضبط ] للمحاولة من جديد</span>',
      verdict: (avg, rounds, toks) => `① أخرجت الجولات (العدد ${rounds}) ما مجموعه ${toks} من الرموز، بمتوسط <b>${avg}</b> لكل جولة؛ والتوليد واحدًا بعد واحد يحتاج إلى ${toks} جولة.<br>② كل جولة تتقدم رمزًا واحدًا على الأقل: حتى لو أخطأت المسودة الأولى، يعطي النموذج الهدف اختياره الخاص عندها.<br>③ المسودات تحدد فقط مقدار تقدم الجولة؛ والنموذج الهدف هو من يحسم كل كلمة، فبحسب التصميم يكون الناتج <b>مطابقًا كلمة بكلمة</b> لما يخرج بلا مسودات (يتناول نص الفصل استثناء تقريب واحدًا سجّله المصدر الأصلي).`,
      try: [
        'تابع الضغط على <b>خطوة</b> حتى تنتهي الجولة 2: بعد خطأ المسودة الثانية، تطابق المسودة الثالثة النص الأصلي فعلًا، ومع ذلك تُلغى. لقد خُمّنت بعد كلمة خاطئة، فلم يعد شرطها قائمًا.',
        'اجعل <b>k</b> يساوي 1 وشغّل 5 جولات: تُخرج كل جولة رمزين على الأكثر. واجعله 5: كلما خمّنت أكثر ربحت أكثر عند صحة الكل، لكن تحقق كل جولة يصير أغلى أيضًا (راجع الفصل 16).',
        'انظر إلى صف KV: أثناء التحقق تُكتب النافذة كلها مؤقتًا، وبعد الإيداع لا تُحتسب إلا أول a + 1 خانات، وتُوسم البقية «قديمة». لا حاجة إلى الحذف: الجولة التالية تكتب في المواضع نفسها.',
      ],
    },
    ko: {
      code: 'SPEC_VERIFY', title: '먼저 추측하고 나중에 검증', tag: '교육용 추정 · 그리디 검증 · 틀리는 위치는 대본대로',
      intro: '드래프트 층이 토큰 k개를 한 번에 추측해요. 목표 모델은 이것들을 <b>윈도우 하나</b>에 넣어 한 번에 계산하고, 왼쪽부터 차례로 비교해요. 처음으로 다른 곳까지만 수락하고 나머지는 모두 버려요. <b>한 단계</b>를 눌러 한 라운드 안의 일이 일어나는 순서를 보세요. 읽기 쉽도록 여기서 토큰은 단어 단위예요.',
      lgAcc: '수락: 히스토리에 기록', lgRej: '처음으로 다른 곳: 목표의 선택으로 교체', lgVoid: '다른 곳 뒤: 폐기', lgTmp: '윈도우에서 임시로 쓴 KV',
      steps: ['드래프트가 k개 추측', '윈도우 한 번에 계산', '왼쪽부터 비교', '접두부 커밋', '나머지 롤백'],
      stageLabel: '검증 윈도우, 목표의 선택, 임시로 쓴 상태',
      text: ['오늘', ' 하늘이', ' 아주', ' 맑아요', ',', ' 우리', ' 공원에', ' 가서', ' 천천히', ' 산책', ' 해요', '.', ' 모자와', ' 우산도', ' 꼭', ' 챙기세요', ';', ' 저녁에', ' 비가', ' 올', ' 수도', ' 있어요', '.', ' 돌아오는', ' 길에', ' 시장에', ' 들러', ' 과일을', ' 좀', ' 사요', ',', ' 밤에', ' 같이', ' 샐러드를', ' 만들어요', '.'],
      alt: { ' 하늘이': ' 날씨가', ' 아주': ' 꽤', ' 맑아요': ' 흐려요', ' 우리': ' 너희', ' 공원에': ' 바다에', ' 가서': ' 와서', ' 천천히': ' 빨리', ' 산책': ' 달리기', ' 해요': ' 할래요', ' 모자와': ' 장갑과', ' 우산도': ' 책도', ' 꼭': ' 다', ' 챙기세요': ' 사세요', ' 저녁에': ' 아침에', ' 비가': ' 눈이', ' 올': ' 내릴', ' 수도': ' 것도', ' 있어요': ' 같아요', ' 돌아오는': ' 나가는', ' 길에': ' 때', ' 시장에': ' 가게에', ' 들러': ' 가서', ' 과일을': ' 채소를', ' 좀': ' 더', ' 사요': ' 봐요', ' 밤에': ' 낮에', ' 같이': ' 함께', ' 샐러드를': ' 만두를', ' 만들어요': ' 먹어요', ',': '.', '.': '!', ';': ',' },
      altDefault: ' 음',
      rowWin: '윈도우: 0번째 행은 지난 라운드의 결과, 뒤는 드래프트', rowOut: '각 행 다음에 목표 모델이 고른 토큰', rowKv: 'KV 캐시: 윈도우의 모든 행을 먼저 임시로 기록',
      histLabel: '지금까지 출력: ',
      marks: { ok: '수락', bad: '불일치', void: '폐기', none: '' },
      unsure: '…', kvTmp: '임시', kvKeep: '유지', kvDrop: '덮어쓸 자리',
      kLabel: '드래프트 길이 k',
      bStep: '▶ 한 단계', bRound: '▶▶ 이번 라운드 끝까지', bReset: '초기화',
      ready: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 누르세요. 모두 5라운드이고, 어느 칸이 틀리는지는 정해진 대본대로예요',
      sRoundK: '진행한 라운드 수', sRoundF: '<b>라운드마다 48개 층 윈도우 계산 1번</b><br>하나씩 생성하면 1라운드에 토큰 1개만 나와요',
      sTokK: '출력한 토큰', sTokF: '<b>라운드당 출력 = 수락한 드래프트 수 a + 1</b><br>덤으로 1개는 불일치한 곳에서 목표가 직접 고른 거예요',
      sAvgK: '라운드당 평균 출력', sAvgF: '<b>= 출력한 토큰 ÷ 라운드 수</b><br>업스트림 실측은 라운드당 평균 토큰 2.4–3.2개',
      sKeepK: '이번 라운드 커밋 n_keep', sKeepF: '<b>= a + 1</b><br>윈도우 0번째 행 + 수락한 드래프트 a개',
      l0: (r, k, d) => `<span class="c">[라운드 ${r}]</span> 드래프트 층이 ${k}개를 추측했어요: ${d}`,
      l1: (t) => `<span class="m">검증</span>: ${t}개 행이 함께 48개 층을 지나, 각 행 다음에 목표가 무엇을 고를지 계산해요(틀린 토큰 뒤에 이어진 행은 "…"로 표시해요. 전제가 틀려서 계산해도 쓸 데가 없어요). KV는 먼저 ${t}개 행 모두에 한 칸씩 임시로 써요`,
      l2: (a, k, bad) => a === 0 ? `<span class="y">비교</span>: 드래프트 1번째 “${bad}”부터 목표와 달라요. a = 0이라서 이번 라운드는 목표 혼자 1개만 나아가요` : a === k ? `<span class="y">비교</span>: 드래프트 ${k}개가 모두 목표와 같아요. a = ${k}` : `<span class="y">비교</span>: 앞의 ${a}개는 같고, ${a + 1}번째 드래프트 “${bad}”는 목표와 달라요. 비교는 여기서 멈춰요`,
      l3: (n, emitted) => `<span class="w">커밋</span>: commit(${n})은 앞의 ${n}개 행만 적용해요. 이번 라운드 출력: ${emitted}`,
      l4: (void_, next) => `<span class="c">롤백</span>: ${void_ ? '폐기: ' + void_ + '. ' : ''}더 써 둔 KV 칸은 다음 라운드에서 그대로 덮어써요. 다음 라운드는 “${next}”부터 시작해요`,
      lEnd: '<span class="y">// 글을 다 썼어요. [ 초기화 ]를 눌러 다시 해 보세요</span>',
      verdict: (avg, rounds, toks) => `① ${rounds}라운드에 토큰 ${toks}개를 출력했어요. 라운드당 평균 <b>${avg}</b>개예요. 하나씩 생성하면 ${toks}라운드가 필요해요.<br>② 라운드마다 최소 1개는 나아가요. 첫 드래프트부터 틀려도 목표 모델이 거기서 자기 선택을 내놔요.<br>③ 드래프트는 한 라운드에 몇 걸음 나아갈지만 정해요. 글자는 하나하나 목표 모델이 확정해요. 그래서 설계상 출력은 드래프트를 쓰지 않을 때와 <b>글자 단위로 똑같아요</b>(본문에서 업스트림이 기록한 반올림 예외를 설명해요).`,
      try: [
        '<b>한 단계</b>를 계속 눌러 2라운드를 끝까지 가 보세요. 드래프트 2번째가 틀린 뒤에는 3번째 드래프트가 사실 원문과 같은데도 그대로 폐기돼요. 틀린 토큰 뒤에 이어서 추측한 것이라 전제가 이미 무너졌기 때문이에요.',
        '<b>k</b>를 1로 낮춰서 5라운드를 다시 돌려 보세요. 라운드마다 토큰이 최대 2개 나와요. 5로 올리면 많이 추측할수록 전부 맞았을 때 더 벌지만, 라운드마다 검증 비용도 더 커져요(16장 참고).',
        'KV 줄을 보세요. 검증할 때는 윈도우 전체를 먼저 임시로 쓰고, 커밋하고 나면 앞의 a + 1칸만 인정돼요. 나머지는 "덮어쓸 자리"로 표시돼요. 지울 필요 없이 다음 라운드가 같은 위치에 써요.',
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
    es: {
      code: 'SPEC_VERIFY', title: 'Adivinar y luego verificar', tag: 'Estimación didáctica · verificación voraz · fallos según guion',
      intro: 'La capa de borrador adivina k tokens a la vez. El modelo objetivo los pone en <b>una ventana</b>, los calcula de una vez y luego compara de izquierda a derecha: acepta hasta el primer desacuerdo y descarta todo lo que viene después. Pulsa <b>Paso</b> para ver el orden de los sucesos en una ronda. Aquí los tokens son palabras enteras para que se lea mejor.',
      lgAcc: 'Aceptado, escrito en el historial', lgRej: 'Primer desacuerdo: sustituido por la elección del objetivo', lgVoid: 'Después del desacuerdo: descartado', lgTmp: 'KV escrita provisionalmente en la ventana',
      steps: ['El borrador adivina k', 'Calcular toda la ventana', 'Comparar de izquierda a derecha', 'Confirmar el prefijo', 'Deshacer el resto'],
      stageLabel: 'Ventana de verificación, elecciones del objetivo y estado provisional',
      text: ['Hoy', ' hace', ' mucho', ' sol', ',', ' salimos', ' a', ' pasear', ' por', ' el', ' parque', ' un', ' rato', '.', ' Lleva', ' un', ' gorro', ' y', ' un', ' abrigo', ';', ' tal', ' vez', ' llueva', '.', ' Al', ' volver', ' a', ' casa', ',', ' compramos', ' higos', ' para', ' la', ' cena', '.'],
      alt: { 'Hoy': 'Ayer', ' hace': ' hizo', ' mucho': ' poco', ' sol': ' frío', ' salimos': ' volvemos', ' a': ' en', ' pasear': ' correr', ' por': ' sobre', ' el': ' un', ' parque': ' lago', ' un': ' otro', ' rato': ' día', ' Lleva': ' Compra', ' gorro': ' mapa', ' y': ' o', ' abrigo': ' libro', ' tal': ' muy', ' vez': ' bien', ' llueva': ' nieve', ' Al': ' En', ' volver': ' salir', ' casa': ' clase', ' compramos': ' vemos', ' higos': ' pasas', ' para': ' con', ' la': ' una', ' cena': ' té', ',': '.', '.': '!', ';': ',' },
      altDefault: ' eh',
      rowWin: 'Ventana: fila 0 = ronda anterior + borradores', rowOut: 'La elección del objetivo tras cada fila', rowKv: 'Caché KV: filas escritas provisionalmente',
      histLabel: 'Hasta ahora: ',
      marks: { ok: 'acepta', bad: 'difiere', void: 'descartado', none: '' },
      unsure: '…', kvTmp: 'prov.', kvKeep: 'queda', kvDrop: 'obsoleta',
      kLabel: 'Longitud del borrador k',
      bStep: '▶ Paso', bRound: '▶▶ Terminar esta ronda', bReset: 'Reiniciar',
      ready: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ]; son 5 rondas en total, y qué apuesta falla sigue un guion fijo',
      sRoundK: 'Rondas ejecutadas', sRoundF: '<b>cada ronda = 1 pasada de ventana por 48 capas</b><br>la generación normal uno por uno da 1 token por ronda',
      sTokK: 'Tokens emitidos', sTokF: '<b>salida por ronda = borradores aceptados a + 1</b><br>el 1 extra es la elección propia del objetivo en el desacuerdo',
      sAvgK: 'Salida media por ronda', sAvgF: '<b>= tokens emitidos ÷ rondas</b><br>upstream mide de 2,4 a 3,2 tokens por ronda de promedio',
      sKeepK: 'n_keep confirmado en esta ronda', sKeepF: '<b>= a + 1</b><br>fila 0 de la ventana + los a borradores aceptados',
      l0: (r, k, d) => `<span class="c">[ronda ${r}]</span> la capa de borrador adivinó ${k}: ${d}`,
      l1: (t) => `<span class="m">Verificar</span>: ${t} filas pasan juntas por las 48 capas y dan la elección del objetivo tras cada fila (las filas posteriores a una palabra equivocada muestran «…»: su premisa es falsa, así que el resultado no sirve); la KV escribe primero una ranura provisional por cada una de las ${t} filas`,
      l2: (a, k, bad) => a === 0 ? `<span class="y">Comparar</span>: el 1.er borrador «${String(bad).trim()}» ya difiere del objetivo, a = 0; en esta ronda solo el objetivo avanza 1 token` : a === k ? `<span class="y">Comparar</span>: los ${k} borradores coinciden con el objetivo, a = ${k}` : `<span class="y">Comparar</span>: ${a === 1 ? 'el 1.er borrador coincide' : 'los primeros ' + a + ' coinciden'}; el borrador ${a + 1} «${String(bad).trim()}» difiere del objetivo, así que la comparación se detiene aquí`,
      l3: (n, emitted) => `<span class="w">Confirmar</span>: commit(${n}) hace que surta efecto solo ${n === 1 ? 'la primera fila' : 'las primeras ' + n + ' filas'}; esta ronda emite ${emitted}`,
      l4: (void_, next) => `<span class="c">Deshacer</span>: ${void_ ? 'se descarta ' + void_ + '; ' : ''}las ranuras extra de KV simplemente se sobrescriben en la ronda siguiente. La ronda siguiente empieza en «${String(next).trim()}»`,
      lEnd: '<span class="y">// el texto ha terminado; pulsa [ Reiniciar ] para repetir</span>',
      verdict: (avg, rounds, toks) => `① ${rounds} rondas emitieron ${toks} tokens, <b>${avg}</b> por ronda de promedio; la generación uno por uno necesita ${toks} rondas.<br>② Cada ronda avanza al menos 1 token: aunque el primer borrador sea incorrecto, el modelo objetivo da ahí su propia elección.<br>③ Los borradores solo deciden cuánto avanza una ronda; el modelo objetivo decide cada palabra, así que por diseño la salida es <b>idéntica palabra por palabra</b> a la de ejecutar sin borradores (el texto del capítulo trata una excepción de redondeo que registra upstream).`,
      try: [
        'Sigue pulsando <b>Paso</b> durante la ronda 2: tras fallar el 2.º borrador, el 3.º en realidad coincide con el texto original, pero aun así se descarta. Se adivinó tras una palabra equivocada, así que su premisa ya no se sostiene.',
        'Pon <b>k</b> en 1 y ejecuta 5 rondas: cada ronda emite como máximo 2 tokens. Ponlo en 5: cuanto más adivinas, más ganas cuando todo acierta, pero la verificación de cada ronda también cuesta más (mira el capítulo 16).',
        'Mira la fila de KV: durante la verificación toda la ventana se escribe provisionalmente; tras el commit solo cuentan las a + 1 primeras ranuras, y el resto se marca como «obsoleta». No hace falta borrar: la ronda siguiente escribe en las mismas posiciones.',
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
