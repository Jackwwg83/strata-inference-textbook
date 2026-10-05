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
    ar: {
      code: 'SLICE_PLAN', title: 'مخطِّط المشروع: فرش أفقي أم قطع رأسي', tag: 'تقدير تعليمي · خانة = أسبوع',
      intro: 'للمشروع الدراسي 4 ميزات (صفوف)، وكل ميزة تمر بـ 4 خطوات (أعمدة): كتابة الشيفرة، وكتابة الاختبار، والوصل بالمسار الرئيسي، والتشغيل الحقيقي الذي يترك دليلًا. كل خانة بأسبوع، ولا يُنجَز إلا خانة واحدة في المرة. اختر طريقة واضغط <b>تقدّم حتى الموعد النهائي</b>، وانظر كم ميزة تستطيع أن تعرضها فعلًا يوم التسليم.',
      lgDone: 'اكتملت هذه الخانة', lgNow: 'يُعمل فيها هذا الأسبوع', lgRework: 'إعادة عمل: افتراض الواجهة خاطئ، وتجب إعادة كتابة الشيفرة', lgTodo: 'لم تُنجَز بعد',
      stages: ['كتابة الشيفرة', 'كتابة الاختبار', 'الوصل بالمسار الرئيسي', 'الدليل الحقيقي'],
      feats: { f1: 'توليد رمز واحد', f2: 'الحفظ والاستعادة', f3: 'prefill على أجزاء', f4: 'المسودة والتحقق' },
      strat: { horizontal: 'فرش أفقي: أنجز كل عمود أولًا', vertical: 'الشريحة الرأسية أولًا: أنجز صفًّا حتى النهاية' },
      stratShort: { horizontal: 'فرش أفقي', vertical: 'شريحة رأسية أولًا' },
      budget: 'كم أسبوعًا حتى الموعد النهائي', hidden: 'في الواجهة افتراض خاطئ مخبوء', hiddenOn: 'شغّل', hiddenOff: 'أطفئ',
      bGo: '▶ تقدّم حتى الموعد النهائي', bStep: 'أسبوع واحد ▶', bReset: 'من جديد',
      gridLabel: 'جدول تقدم 4 ميزات × 4 خطوات',
      wk: (n) => `الأسبوع ${n}`, rw: (n) => `إعادة عمل ${n}`,
      sDoneK: 'ميزات كاملة قابلة للعرض عند الموعد النهائي', sDoneF: '<b>= عدد الميزات التي أُنجزت خطواتها الأربع وتركت دليلًا حقيقيًّا</b>',
      sFirstK: 'يظهر أول دليل حقيقي في', sFirstF: (none) => none ? '<b>لا دليل واحد قبل الموعد النهائي</b><br>لا يرى المعلم إلا الشيفرة والاختبارات' : '<b>كلما كان أبكر ظهرت مشكلات مستوى النظام أبكر</b>',
      sReworkK: 'أسابيع ذهبت في إعادة العمل', sReworkF: (now, all) => `<b>أُعيد العمل ${now} أسابيع قبل الموعد النهائي</b><br>وإذا أُنجز كل شيء فتلزم إعادة عمل ${all} أسابيع`,
      ready: '<span class="c">$</span> ready. اختر الطريقة، ثم اضغط [ ▶ تقدّم حتى الموعد النهائي ] أو [ أسبوع واحد ▶ ]',
      lWeek: (n, f, s) => `<span class="m">الأسبوع ${n}</span> ${f}: ${s}`,
      lRework: (n, f) => `<span class="m">الأسبوع ${n}</span> <span class="y">إعادة عمل</span> ${f}: عند الوصل بالمسار الرئيسي تبين أن افتراض الواجهة خاطئ، وتجب تعديل ما كُتب من شيفرة`,
      lSurprise: '<span class="y">// أول وصل بالمسار الرئيسي كشف افتراضًا خاطئًا تعتمد عليه كل الوحدات</span>',
      lEnd: (c) => `<span class="w">الموعد النهائي</span> الميزات الكاملة القابلة للعرض: ${c}`,
      lOver: '<span class="c">// أُنجز العمل كله</span>',
      vSome: (name, c, first) => `${name}: عند الموعد النهائي <b>${c}</b> من الميزات تعمل كاملة من المدخل إلى المخرج، وظهر أول دليل حقيقي في الأسبوع <b>${first}</b>.`,
      vVertTail: 'والميزة التي لم تكتمل «لم تبدأ بعد»، لا «أُنجز نصفها».',
      vNoneH: 'فرش أفقي: عدد الميزات الكاملة القابلة للعرض عند الموعد النهائي <b>0</b>. كُتبت شيفرة واختبارات كثيرة، لكن لم تُوصَل ميزة واحدة بالمسار الرئيسي لتنتج بيانات حقيقية. وهذه هي حال وحدة PLE في Strata: اجتازت كل القطع الاختبارات، ولم يستدعها أحد.',
      vNoneV: 'الشريحة الرأسية أولًا: الأسابيع قليلة جدًّا، ولم تكمل الميزة الأولى خطواتها الأربع. زِد أسبوعًا أو اثنين فتقدّم أول دليل حقيقي.',
      vHiddenH: (all) => `<br>الافتراض الخاطئ المخبوء لا ينكشف إلا عند أول وصل، وقد كُتبت شيفرة الميزات الأربع كلها على الافتراض الخاطئ، فتجب إعادة كتابتها كلها: المجموع إعادة عمل ${all} أسابيع.`,
      vHiddenV: '<br>مع الشريحة الرأسية ينكشف الافتراض الخاطئ عند وصل أول ميزة، فلا تحتاج إلا ميزة واحدة إلى إعادة عمل، وتُكتب الميزات التالية على الواجهة الصحيحة مباشرة.',
      vAll: '<br>إذا اتسع الوقت أمكن للطريقتين أن تنتهيا في النهاية؛ والفرق في أي لحظة في الوسط: ماذا في يدك مما يمكن عرضه والتحقق منه.',
      try: [
        'أبقِ الأسابيع 10 وتقدّم بكل من الطريقتين حتى الموعد النهائي: الشريحة الرأسية تعرض ميزتين، والفرش الأفقي لا يعرض ولا واحدة.',
        'شغّل <b>في الواجهة افتراض خاطئ مخبوء</b> وقارن مرة أخرى: الفرش الأفقي يحتاج إعادة عمل 4 أسابيع، والرأسي أسبوعًا واحدًا. فكلما بكّرت بالوصل بكّرت باكتشاف المشكلة.',
        'ارفع الأسابيع إلى <b>20</b>: تنتهي الطريقتان في النهاية. وانظر في أي أسبوع يظهر «أول دليل حقيقي»، وفكّر: من الأهدأ إذا فُتّش في الوسط.',
      ],

      rCode: 'RUBRIC', rTitle: 'فحص التسليم: قيّم نفسك بجدول التقييم', rTag: 'تقدير تعليمي · جدول التقييم في هذا الفصل',
      rIntro: 'علّم ما <b>هو موجود فعلًا</b> في تقريرك، وستُحسب الدرجة فورًا. والبندان الأخيران خطان أحمران: إذا لمستهما صُفّر المحور المقابل كله، ولو أحسنتَ في غيره فلن يعوّض.',
      rLgBar: 'طول الشريط = نسبة درجة هذا المحور من العلامة الكاملة', rLgZero: 'محور صفّره خط أحمر',
      dims: { theory: 'المبدأ والاشتقاق', source: 'الشيفرة والعقود', impl: 'التنفيذ والاختبار', experiment: 'التجربة والجودة', expr: 'التعبير وإعادة الإنتاج' },
      dimHead: (name, max) => `${name} (${max})`,
      items: {
        't-formula': 'كتبتَ الصيغ الأساسية مع وحداتها', 't-deps': 'بيّنتَ ما الفرضيات التي تعتمد عليها الصيغ', 't-hand': 'أعطيتَ مثالًا صغيرًا يمكن التحقق منه حسابًا بالورقة',
        's-pin': 'اقتباسات الشيفرة تشير إلى إيداع ثابت ورقم سطر', 's-history': 'ميّزتَ الشيفرة الحالية من التعليقات القديمة', 's-contract': 'كتبتَ عقد الواجهة الذي تعتمد عليه',
        'i-run': 'الشيفرة تعمل على جهاز غيرك', 'i-oracle': 'لها إجابة مرجعية مستقلة', 'i-mutant': 'لها حالات سلبية بعلل محقونة عمدًا، وتفشل الاختبارات أمامها', 'i-edge': 'اختبرتَ الحدود: مدخل فارغ، وطويل جدًّا، وN = 1',
        'x-ab': 'A/B بتغيير عامل واحد في كل مرة، وبتناوب التشغيل', 'x-raw': 'احتفظتَ بالبيانات الخام لكل تشغيل', 'x-gate': 'مررتَ بوابة الجودة أولًا ثم قارنتَ السرعة', 'x-fail': 'حُسبت التشغيلات الفاشلة والشاذة أيضًا',
        'e-env': 'كتبتَ العتاد والإصدارات والإعدادات بوضوح', 'e-repro': 'يستطيع غيرك أن يعيد الإنتاج بالخطوات', 'e-limits': 'كتبتَ القيود وما لم تفعله',
      },
      red: { simAsReal: 'كتبتَ أعدادًا محاكاة أو مقدَّرة على أنها قياس فعلي', stateLeak: 'اختلاط حالات غير موضَّح (جلستان تشاركتا حالة واحدة)' },
      redTitle: 'الخطان الأحمران',
      sTotK: 'المجموع', sTotF: '<b>= مجموع درجات المحاور الخمسة، والعلامة الكاملة 100</b><br>والخط الأحمر يصفّر المحور المقابل كله',
      sDimK: 'درجة كل محور', sWeakK: 'أحق محور بالتحسين', sWeakF: '<b>المحور الأقل نسبة من درجته</b>؛ وعند التعادل يُختار الأكبر درجة',
      rReady: '<span class="c">$</span> علّم بندًا وسترى هنا كم نقطة أُضيفت',
      rAdd: (name, pts) => `<span class="m">+${pts}</span> ${name}`,
      rDel: (name, pts) => `<span class="m">−${pts}</span> ${name}`,
      rRedOn: (name, dim) => `<span class="y">خط أحمر</span> ${name} ← صُفّر «${dim}»`,
      rRedOff: (name) => `<span class="c">أُزيل</span> ${name}`,
      vScore: (t, weak) => `الآن <b>${t}</b> درجة. أحق ما تسدّه «${weak}».`,
      vRedSim: '<br>كتابة أعداد محاكاة على أنها قياس تُبطل محور «التجربة والجودة» كله: فلم يعد القارئ يستطيع أن يثق بأي عدد عندك. والتصحيح بسيط: اكتب بوضوح «تقدير تعليمي» أو «قياس».',
      vRedLeak: '<br>اختلاط حالات غير موضَّح يصفّر «التنفيذ والاختبار»: مهما بلغت السرعة فلا تعوّض عن خطأ الحساب.',
      vFull: '<br>العلامة كاملة. ولا تنسَ: جدول التقييم يفحص الدليل، لا جمال الاستنتاج.',
      rTry: [
        'علّم أولًا بنود «التنفيذ والاختبار» الأربعة: 25 درجة. ثم المس الخط الأحمر «أعداد محاكاة على أنها قياس»، وانظر أي محور صُفّر.',
        'علّم بنود «التجربة والجودة» الأربعة كلها ثم المس الخط الأحمر: ضاعت 20 درجة دفعة واحدة. فعدد مزوّر واحد يُبطل العمل الأمين في المحور نفسه.',
        'حاول أن تبلغ أكثر من 80: سترى أن أرخص الدرجات بنود التعبير مثل «اكتب البيئة» و«اكتب القيود». وهي ليست صعبة، لكنها أكثر ما يُنسى.',
      ],
    },
    ja: {
      code: 'SLICE_PLAN', title: 'プロジェクトプランナー：横に広げるか、縦に切るか', tag: '教育用の試算 · 1 マス = 1 週間',
      intro: 'コース課題には 4 つの機能（行）があり、各機能は 4 段階（列）を通ります。コードを書く、テストを書く、主経路につなぐ、本当に動かして証拠を残す。1 マスは 1 週間で、一度に 1 マスしか進められません。やり方を選んで<b>締め切りまで進める</b>を押し、締め切りの日に、本当にデモできる機能がいくつ手元にあるか見てください。',
      lgDone: 'このマスは完了', lgNow: '今週やっているところ', lgRework: '手戻り：インターフェースの仮定が間違っていて、コードを直す', lgTodo: 'まだ手を付けていない',
      stages: ['コードを書く', 'テストを書く', '主経路につなぐ', '本物の証拠'],
      feats: { f1: 'トークンを 1 つ生成', f2: '保存と復元', f3: '分割プリフィル', f4: 'ドラフトと検証' },
      strat: { horizontal: '横に広げる：まず列ごとに終わらせる', vertical: '縦切り優先：1 行を最後までやる' },
      stratShort: { horizontal: '横に広げる', vertical: '縦切り優先' },
      budget: '締め切りまであと何週間か', hidden: 'インターフェースに間違った仮定が隠れている', hiddenOn: 'オン', hiddenOff: 'オフ',
      bGo: '▶ 締め切りまで進める', bStep: '1 週 ▶', bReset: 'やり直す',
      gridLabel: '4 つの機能 × 4 つの段階の進捗表',
      wk: (n) => `${n} 週目`, rw: (n) => `手戻り ${n}`,
      sDoneK: '締め切り時にデモできる完全な機能', sDoneF: '<b>= 4 段階すべて終わり、本物の証拠を残した機能の数</b>',
      sFirstK: '最初の本物の証拠が出る時期', sFirstF: (none) => none ? '<b>締め切りまで 1 つもなし</b><br>先生に見せられるのは、コードとテストだけです' : '<b>早いほど、システム全体の問題を早く見つけられる</b>',
      sReworkK: '手戻りで使った週数', sReworkF: (now, all) => `<b>締め切りまでに ${now} 週ぶんの手戻り</b><br>全部終わらせるには、さらに手戻りが ${all} 週`,
      ready: '<span class="c">$</span> ready. やり方を選んで、[ ▶ 締め切りまで進める ] か [ 1 週 ▶ ] を押してください',
      lWeek: (n, f, s) => `<span class="m">${n} 週目</span> ${f}：${s}`,
      lRework: (n, f) => `<span class="m">${n} 週目</span> <span class="y">手戻り</span> ${f}：主経路につないだときに、インターフェースの仮定が間違っていたと分かり、書いたコードを直します`,
      lSurprise: '<span class="y">// 初めて主経路につないだら、すべてのモジュールが依存する間違った仮定が露見した</span>',
      lEnd: (c) => `<span class="w">締め切り</span> デモできる完全な機能：${c} 個`,
      lOver: '<span class="c">// すべての作業が終わりました</span>',
      vSome: (name, c, first) => `${name}：締め切り時には <b>${c}</b> 個の機能が入力から出力まで通り、最初の本物の証拠は <b>${first}</b> 週目に出ています。`,
      vVertTail: '終わっていない機能は「まだ手を付けていない」のであって、「半分だけやった」のではありません。',
      vNoneH: '横に広げる：締め切り時にデモできる完全な機能は <b>0</b> 個です。コードとテストはたくさん書いたのに、主経路につながって本物のデータを出した機能は、まだ 1 つもありません。これがまさに Strata の PLE モジュールの状況です。部品はすべてテストに通ったのに、呼び出されていなかったのです。',
      vNoneV: '縦切り優先：週数が少なすぎて、最初の機能がまだ 4 段階を通り終えていません。もう 1、2 週あれば、最初の本物の証拠を出せます。',
      vHiddenH: (all) => `<br>隠れていた間違った仮定は、最初に配線したときにはじめて露見します。そのとき、4 つの機能のコードはどれも、すでに間違った仮定のもとで書き終えられていて、全部直さなければなりません。合計で ${all} 週ぶんの手戻りです。`,
      vHiddenV: '<br>縦切りなら、間違った仮定は最初の機能を配線した時点で露見し、手戻りが必要なのは 1 つの機能だけです。後の機能は、はじめから正しいインターフェースで書けます。',
      vAll: '<br>時間が十分あれば、どちらのやり方でも最終的には終わります。違いは、途中のどの時点でも、デモでき、検証できるものが手元にあるかどうかです。',
      try: [
        '10 週のままにして、2 つのやり方でそれぞれ締め切りまで進めます。縦切りなら 2 つの機能をデモでき、横に広げると 1 つもできません。',
        '<b>インターフェースに間違った仮定が隠れている</b>をオンにして、もう一度比べます。横に広げると 4 週ぶん手戻りし、縦切りは 1 週ぶんだけです。早く配線するほど、早く問題が見つかります。',
        '週数を <b>20</b> まで上げます。どちらのやり方でも最終的には終わります。そのうえで「最初の本物の証拠」が何週目かを見て、途中で検査されたときに、どちらが余裕を持てるかを考えてみましょう。',
      ],

      rCode: 'RUBRIC', rTitle: '納品の自己チェック：評価表で自分を採点する', rTag: '教育用の試算 · 評価表はこの章にあります',
      rIntro: 'レポートに<b>すでに入っている</b>内容にチェックを入れると、右側にリアルタイムで点数が出ます。いちばん下の 2 つはレッドラインです。触れると、対応する項目がまるごと 0 点になり、ほかの項目がどれだけ良くても取り戻せません。',
      rLgBar: 'バーの長さ = この項目の得点が満点に占める割合', rLgZero: 'レッドラインで 0 点になった項目',
      dims: { theory: '原理と導出', source: 'ソースと契約', impl: '実装とテスト', experiment: '実験と品質', expr: '表現と再現性' },
      dimHead: (name, max) => `${name}（${max}）`,
      items: {
        't-formula': '重要な式を、単位つきで書いた', 't-deps': '式が依存する前提を説明した', 't-hand': '手計算で突き合わせられる小さな例を示した',
        's-pin': 'ソースの引用が、固定したコミットと行番号を指している', 's-history': '現在のコードと古いコメントを区別した', 's-contract': '依存しているインターフェースの契約を書いた',
        'i-run': 'コードが他の人のマシンで動く', 'i-oracle': '独立した基準の答えがある', 'i-mutant': 'わざとバグを入れた反例があり、テストが失敗する', 'i-edge': '境界をテストした：空の入力、超長文、N = 1',
        'x-ab': 'A/B は一度に 1 つの要因だけ変え、交互に走らせた', 'x-raw': '各回の生データを残した', 'x-gate': '先に品質ゲートを通してから、速度を比べた', 'x-fail': '失敗や異常な実行も数に入れた',
        'e-env': 'ハードウェア、バージョン、設定を書いた', 'e-repro': '他の人が手順どおりに再現できる', 'e-limits': '限界と、やっていないことを書いた',
      },
      red: { simAsReal: '模擬や推算の数字を、実測として書いた', stateLeak: '説明のない状態の混用がある（2 つのセッションが状態を共用した）' },
      redTitle: '2 本のレッドライン',
      sTotK: '合計点', sTotF: '<b>= 5 項目の得点の合計、満点 100</b><br>レッドラインは対応する項目をまるごと 0 点にします',
      sDimK: '項目ごとの得点', sWeakK: 'いちばん補うべき項目', sWeakF: '<b>得点の割合がいちばん低い項目</b>；同じなら配点が大きいほう',
      rReady: '<span class="c">$</span> 項目にチェックを入れると、何点増えたかがここに表示されます',
      rAdd: (name, pts) => `<span class="m">+${pts}</span> ${name}`,
      rDel: (name, pts) => `<span class="m">−${pts}</span> ${name}`,
      rRedOn: (name, dim) => `<span class="y">レッドライン</span> ${name} →「${dim}」が 0 点`,
      rRedOff: (name) => `<span class="c">解除</span> ${name}`,
      vScore: (t, weak) => `今は <b>${t}</b> 点です。いちばん補うべきなのは「${weak}」です。`,
      vRedSim: '<br>模擬の数字を実測と書くと、「実験と品質」の項目全体が無効になります。読者が、あなたの数字を 1 つも信じられなくなるからです。直し方は簡単で、「教育用の試算」か「実測」かをはっきり書くことです。',
      vRedLeak: '<br>説明のない状態の混用があると、「実装とテスト」が 0 点になります。速度がどれだけ速くても、計算を間違えたことは相殺できません。',
      vFull: '<br>満点です。忘れないでください。評価表が調べるのは証拠であって、結論の見栄えではありません。',
      rTry: [
        'まず「実装とテスト」の 4 項目だけにチェックを入れます。25 点です。それから「模擬の数字を実測として書いた」のレッドラインにチェックを入れ、どの項目が 0 点になるかを見ます。',
        '「実験と品質」の 4 項目をすべてチェックしてから、レッドラインに触れます。20 点が一気に消えます。1 つの偽の数字が、同じ項目の中の誠実な仕事まで無効にしてしまいます。',
        '80 点以上を目指してみましょう。いちばん安く取れる点は、「環境を書く」「限界を書く」のような表現の項目だと分かります。難しくはないのに、いちばん書き忘れられがちです。',
      ],
    },
    ko: {
      code: 'SLICE_PLAN', title: '프로젝트 플래너: 가로로 넓힐까, 세로로 자를까', tag: '교육용 추정 · 한 칸 = 한 주',
      intro: '수업 프로젝트에는 기능 4개(행)가 있고, 기능마다 4단계(열)를 거쳐야 해요. 코드 쓰기, 테스트 쓰기, 주 경로에 연결하기, 실제로 돌려서 증거 남기기예요. 한 칸이 한 주이고, 한 번에 한 칸만 할 수 있어요. 방식을 하나 고르고 <b>마감까지 진행</b>을 눌러서, 마감일에 정말 시연할 수 있는 기능이 몇 개인지 보세요.',
      lgDone: '이 칸은 끝났어요', lgNow: '이번 주에 하는 일', lgRework: '재작업: 인터페이스 가정이 틀려서 코드를 고쳐요', lgTodo: '아직 안 했어요',
      stages: ['코드 쓰기', '테스트 쓰기', '주 경로 연결', '실제 증거'],
      feats: { f1: '토큰 하나 생성', f2: '저장과 복원', f3: '분할 프리필', f4: '드래프트와 검증' },
      strat: { horizontal: '수평으로 넓히기: 열부터 먼저 끝내기', vertical: '수직 슬라이스 우선: 한 행을 끝까지' },
      stratShort: { horizontal: '수평으로 넓히기', vertical: '수직 슬라이스 우선' },
      budget: '마감까지 남은 주', hidden: '인터페이스에 잘못된 가정이 숨어 있어요', hiddenOn: '켜기', hiddenOff: '끄기',
      bGo: '▶ 마감까지 진행', bStep: '1주 ▶', bReset: '처음부터',
      gridLabel: '기능 4개 × 단계 4개의 진행표',
      wk: (n) => `${n}주차`, rw: (n) => `재작업 ${n}`,
      sDoneK: '마감 때 완전히 시연할 수 있는 기능', sDoneF: '<b>= 네 단계를 모두 끝내고 실제 증거를 남긴 기능의 수</b>',
      sFirstK: '첫 실제 증거가 나오는 때', sFirstF: (none) => none ? '<b>마감 전까지 하나도 없어요</b><br>선생님이 볼 수 있는 건 코드와 테스트뿐이에요' : '<b>빠를수록 시스템 차원의 문제를 일찍 찾아요</b>',
      sReworkK: '재작업에 쓴 주', sReworkF: (now, all) => `<b>마감 전까지 재작업 ${now}주</b><br>전부 끝내려면 재작업이 모두 ${all}주예요`,
      ready: '<span class="c">$</span> ready. 방식을 고르고 [ ▶ 마감까지 진행 ] 또는 [ 1주 ▶ ]를 눌러요',
      lWeek: (n, f, s) => `<span class="m">${n}주차</span> ${f}: ${s}`,
      lRework: (n, f) => `<span class="m">${n}주차</span> <span class="y">재작업</span> ${f}: 주 경로에 연결하다가 인터페이스 가정이 틀렸다는 걸 알았어요. 이미 쓴 코드를 고쳐요`,
      lSurprise: '<span class="y">// 처음 주 경로에 연결하자 모든 모듈이 기대고 있던 잘못된 가정이 드러났어요</span>',
      lEnd: (c) => `<span class="w">마감</span> 완전히 시연할 수 있는 기능: ${c}개`,
      lOver: '<span class="c">// 모든 일을 끝냈어요</span>',
      vSome: (name, c, first) => `${name}: 마감 때 기능 <b>${c}</b>개가 입력에서 출력까지 끝까지 돌아가요. 첫 실제 증거는 <b>${first}</b>주차에 나왔어요. `,
      vVertTail: '끝내지 못한 기능은 「반쯤 한 것」이 아니라 「아직 시작하지 않은 것」이에요.',
      vNoneH: '수평으로 넓히기: 마감 때 완전히 시연할 수 있는 기능은 <b>0</b>개예요. 코드와 테스트는 많이 썼지만, 주 경로에 연결돼서 실제 데이터를 낸 기능은 아직 하나도 없어요. Strata의 PLE 모듈이 바로 이런 처지였어요. 부품은 전부 테스트를 통과했지만 아무도 호출하지 않았어요.',
      vNoneV: '수직 슬라이스 우선: 주 수가 너무 적어서 첫 기능이 아직 네 단계를 다 거치지 못했어요. 한두 주만 더 있으면 첫 실제 증거를 낼 수 있어요.',
      vHiddenH: (all) => `<br>숨어 있던 잘못된 가정은 처음 연결할 때에야 드러나요. 그때는 기능 4개의 코드가 모두 이미 잘못된 가정으로 쓰여 있어요. 전부 고쳐야 해요. 재작업은 모두 ${all}주예요.`,
      vHiddenV: '<br>수직 슬라이스에서는 첫 기능을 연결할 때 잘못된 가정이 드러나요. 고칠 기능은 1개뿐이고, 뒤의 기능은 처음부터 맞는 인터페이스로 써요.',
      vAll: '<br>시간이 충분하면 두 방식 모두 결국 다 끝내요. 차이는 중간 어느 시점에든 시연하고 검증할 수 있는 것이 손에 있느냐예요.',
      try: [
        '10주 그대로 두고 두 방식을 각각 마감까지 진행해 보세요. 수직 슬라이스는 기능 2개를 시연할 수 있고, 수평으로 넓히기는 하나도 못 해요.',
        '<b>인터페이스에 잘못된 가정이 숨어 있어요</b>를 켜고 다시 비교해 보세요. 수평으로 넓히면 재작업이 4주이고, 수직 슬라이스는 1주뿐이에요. 일찍 연결할수록 문제를 일찍 찾아요.',
        '주 수를 <b>20</b>으로 늘려 보세요. 두 방식 모두 결국 다 끝내요. 그다음 「첫 실제 증거」가 몇 주차인지 보고, 중간에 검사받을 때 누가 더 여유로울지 생각해 보세요.',
      ],

      rCode: 'RUBRIC', rTitle: '제출 자가 점검: 채점표로 스스로 채점하기', rTag: '교육용 추정 · 채점표는 이 장에 있어요',
      rIntro: '보고서에 <b>이미 들어 있는</b> 내용을 체크하면 오른쪽에서 점수를 바로 계산해요. 맨 아래 두 개는 레드라인이에요. 하나라도 걸리면 해당 항목 전체가 0점이 되고, 다른 항목을 아무리 잘해도 만회할 수 없어요.',
      rLgBar: '막대 길이 = 이 항목 점수가 만점에서 차지하는 비율', rLgZero: '레드라인으로 0점이 된 항목',
      dims: { theory: '원리와 유도', source: '소스와 계약', impl: '구현과 테스트', experiment: '실험과 품질', expr: '표현과 재현성' },
      dimHead: (name, max) => `${name}(${max})`,
      items: {
        't-formula': '핵심 공식을 단위와 함께 썼어요', 't-deps': '공식이 기대는 전제를 설명했어요', 't-hand': '손으로 계산해서 맞춰 볼 수 있는 작은 예를 줬어요',
        's-pin': '소스 인용이 고정한 커밋과 줄 번호를 가리켜요', 's-history': '현재 코드와 낡은 주석을 구별했어요', 's-contract': '기대고 있는 인터페이스 계약을 적었어요',
        'i-run': '코드가 다른 사람의 컴퓨터에서도 실행돼요', 'i-oracle': '독립된 참조 답안이 있어요', 'i-mutant': '일부러 버그를 넣은 반례가 있고, 테스트가 실패해요', 'i-edge': '경계를 테스트했어요: 빈 입력, 아주 긴 입력, N = 1',
        'x-ab': 'A/B는 한 번에 요인 하나만 바꾸고 번갈아 실행했어요', 'x-raw': '실행마다의 원본 데이터를 남겼어요', 'x-gate': '품질 관문을 먼저 통과하고, 그다음 속도를 비교했어요', 'x-fail': '실패하거나 이상했던 실행도 집계했어요',
        'e-env': '하드웨어, 버전, 설정을 분명히 썼어요', 'e-repro': '다른 사람이 단계를 따라 재현할 수 있어요', 'e-limits': '한계와 하지 않은 일을 적었어요',
      },
      red: { simAsReal: '모의 또는 추정한 숫자를 실측처럼 썼어요', stateLeak: '설명 없는 상태 혼용이 있어요(두 세션이 상태를 같이 썼어요)' },
      redTitle: '레드라인 두 개',
      sTotK: '총점', sTotF: '<b>= 다섯 항목의 점수를 더한 값, 만점 100</b><br>레드라인은 해당 항목 전체를 0점으로 만들어요',
      sDimK: '항목별 점수', sWeakK: '가장 먼저 채울 항목', sWeakF: '<b>배점 대비 득점 비율이 가장 낮은 항목</b>. 같으면 배점이 큰 쪽이에요',
      rReady: '<span class="c">$</span> 항목을 체크하면 몇 점이 늘었는지 여기에 보여요',
      rAdd: (name, pts) => `<span class="m">+${pts}</span> ${name}`,
      rDel: (name, pts) => `<span class="m">−${pts}</span> ${name}`,
      rRedOn: (name, dim) => `<span class="y">레드라인</span> ${name} → 「${dim}」 0점 처리`,
      rRedOff: (name) => `<span class="c">해제</span> ${name}`,
      vScore: (t, weak) => `지금 <b>${t}</b>점이에요. 가장 먼저 채울 곳은 「${weak}」예요.`,
      vRedSim: '<br>모의 숫자를 실측처럼 쓰면 「실험과 품질」 항목 전체가 무효가 돼요. 독자가 여러분의 숫자를 하나도 믿을 수 없게 되기 때문이에요. 고치는 방법은 간단해요. 「교육용 추정」인지 「실측」인지 분명히 적어요.',
      vRedLeak: '<br>설명 없는 상태 혼용이 있으면 「구현과 테스트」가 0점이 돼요. 속도가 아무리 빨라도 계산이 틀린 것을 상쇄하지 못해요.',
      vFull: '<br>만점이에요. 잊지 마세요. 채점표가 보는 것은 증거예요. 결론이 얼마나 멋진지가 아니에요.',
      rTry: [
        '먼저 「구현과 테스트」의 네 항목만 체크해 보세요. 25점이에요. 그다음 「모의 숫자를 실측처럼 썼어요」 레드라인을 체크하고 어느 항목이 0점이 되는지 보세요.',
        '「실험과 품질」의 네 항목을 모두 체크한 뒤 레드라인을 걸어 보세요. 20점이 한꺼번에 사라져요. 가짜 숫자 하나가 같은 항목의 성실한 작업까지 무효로 만들어요.',
        '80점 넘기를 노려 보세요. 가장 싸게 얻는 점수는 「환경을 분명히 썼어요」, 「한계를 적었어요」 같은 표현 항목이에요. 어렵지 않은데 가장 자주 빠뜨려요.',
      ],
    },
    es: {
      code: 'SLICE_PLAN', title: 'Planificador del proyecto: ¿construir en horizontal o cortar en vertical?', tag: 'Estimación didáctica · una casilla = una semana',
      intro: 'El proyecto del curso tiene 4 funciones (filas), y cada función debe pasar por 4 pasos (columnas): escribir el código, escribir las pruebas, conectarla a la ruta principal y dejar evidencia de una ejecución real. Cada casilla cuesta una semana y trabajas en una casilla a la vez. Elige un enfoque, pulsa <b>Avanzar hasta la entrega</b> y mira cuántas funciones puedes demostrar de verdad el día de la entrega.',
      lgDone: 'Esta casilla está hecha', lgNow: 'Se trabaja en ella esta semana', lgRework: 'Rehacer: un supuesto de la interfaz era erróneo y hay que cambiar el código', lgTodo: 'Sin empezar',
      stages: ['Código', 'Tests', 'Unión', 'Datos reales'],
      feats: { f1: 'Generar un token', f2: 'Guardar y restaurar', f3: 'Prefill por chunks', f4: 'Borrador y verificación' },
      strat: { horizontal: 'Horizontal: terminar primero cada columna', vertical: 'Corte vertical: una fila de punta a punta' },
      stratShort: { horizontal: 'Horizontal', vertical: 'Corte vertical' },
      budget: 'Semanas hasta la entrega', hidden: 'Un supuesto erróneo se esconde en la interfaz', hiddenOn: 'Activado', hiddenOff: 'Desactivado',
      bGo: '▶ Avanzar hasta la entrega', bStep: 'Una semana ▶', bReset: 'Empezar de nuevo',
      gridLabel: 'Tabla de avance de 4 funciones × 4 pasos',
      wk: (n) => `Sem. ${n}`, rw: (n) => `Rehacer ${n}`,
      sDoneK: 'Funciones listas para demostrar en la entrega', sDoneF: '<b>= funciones con los cuatro pasos hechos y evidencia real</b>',
      sFirstK: 'La primera evidencia real aparece en', sFirstF: (none) => none ? '<b>Ninguna antes de la entrega</b><br>el profesor solo ve código y pruebas' : '<b>Cuanto antes, antes descubres los problemas del sistema</b>',
      sReworkK: 'Semanas gastadas en rehacer', sReworkF: (now, all) => `<b>${now} ${now === 1 ? 'semana' : 'semanas'} de rehacer antes de la entrega</b><br>terminar todo exige ${all} ${all === 1 ? 'semana' : 'semanas'} de rehacer`,
      ready: '<span class="c">$</span> ready. Elige un enfoque y pulsa [ ▶ Avanzar hasta la entrega ] o [ Una semana ▶ ]',
      lWeek: (n, f, s) => `<span class="m">Semana ${n}</span> ${f}: ${s}`,
      lRework: (n, f) => `<span class="m">Semana ${n}</span> <span class="y">rehacer</span> ${f}: al conectarla a la ruta principal se vio que un supuesto de la interfaz era erróneo; hay que cambiar el código ya escrito`,
      lSurprise: '<span class="y">// la primera conexión a la ruta principal destapó un supuesto erróneo del que dependen todos los módulos</span>',
      lEnd: (c) => `<span class="w">entrega</span> funciones listas para demostrar: ${c}`,
      lOver: '<span class="c">// todo el trabajo está hecho</span>',
      vSome: (name, c, first) => `${name}: en la entrega, <b>${c}</b> ${c === 1 ? 'función funciona' : 'funciones funcionan'} de punta a punta, de la entrada a la salida, y la primera evidencia real apareció en la semana <b>${first}</b>. `,
      vVertTail: 'Las funciones sin terminar están «sin empezar», no «a medias».',
      vNoneH: 'Horizontal: en la entrega hay <b>0</b> funciones listas para demostrar. Hay mucho código y muchas pruebas escritas, pero ninguna función está conectada a la ruta principal y produciendo datos reales. Es justo la situación del módulo PLE de Strata: todas las piezas pasaron sus pruebas, pero nadie las llamó.',
      vNoneV: 'Corte vertical: hay muy pocas semanas y la primera función aún no ha completado los cuatro pasos. Con una o dos semanas más, produciría su primera evidencia real.',
      vHiddenH: (all) => `<br>El supuesto erróneo escondido aflora solo en la primera conexión, cuando el código de las 4 funciones ya está escrito sobre ese supuesto. Hay que cambiarlo todo: ${all} ${all === 1 ? 'semana' : 'semanas'} de rehacer en total.`,
      vHiddenV: '<br>Con cortes verticales, el supuesto erróneo aflora al conectar la primera función. Solo hay que rehacer 1 función, y las siguientes se escriben desde el principio contra la interfaz correcta.',
      vAll: '<br>Con tiempo suficiente, los dos enfoques lo terminan todo. La diferencia es qué tienes para demostrar y verificar en cada momento del camino.',
      try: [
        'Deja las 10 semanas y avanza cada enfoque hasta la entrega: el corte vertical puede demostrar 2 funciones y el horizontal, ni una.',
        'Activa <b>Un supuesto erróneo se esconde en la interfaz</b> y compara otra vez: el horizontal necesita 4 semanas de rehacer y el vertical solo 1. Cuanto antes conectas, antes encuentras los problemas.',
        'Sube las semanas a <b>20</b>: los dos enfoques lo terminan todo. Ahora mira en qué semana aparece la «primera evidencia real» y piensa quién está más tranquilo si lo revisan a mitad de camino.',
      ],

      rCode: 'RUBRIC', rTitle: 'Autoevaluación de la entrega: ponte nota con la rúbrica', rTag: 'Estimación didáctica · rúbrica en este capítulo',
      rIntro: 'Marca lo que tu informe <b>ya tiene</b> y la puntuación de la derecha se actualiza al instante. Los dos últimos puntos son líneas rojas: si cruzas una, su dimensión entera baja a cero y ningún trabajo bueno en otra parte la recupera.',
      rLgBar: 'Longitud de la barra = puntos de esta dimensión como proporción de su máximo', rLgZero: 'Una dimensión puesta a cero por una línea roja',
      dims: { theory: 'Teoría y derivación', source: 'Código fuente y contratos', impl: 'Código y pruebas', experiment: 'Experimentos y calidad', expr: 'Redacción y réplica' },
      dimHead: (name, max) => `${name} (${max})`,
      items: {
        't-formula': 'Escribe las fórmulas clave, con unidades', 't-deps': 'Explica los supuestos en que se apoya cada fórmula', 't-hand': 'Da un ejemplo pequeño que se puede comprobar a mano',
        's-pin': 'Las citas del código señalan un commit fijo y números de línea', 's-history': 'Distingue el código actual de los comentarios desfasados', 's-contract': 'Escribe los contratos de interfaz de los que dependes',
        'i-run': 'El código se ejecuta en la máquina de otra persona', 'i-oracle': 'Tiene una respuesta de referencia independiente', 'i-mutant': 'Tiene casos negativos con errores inyectados, y las pruebas fallan con ellos', 'i-edge': 'Prueba los casos límite: entrada vacía, entrada muy larga, N = 1',
        'x-ab': 'En A/B cambia un solo factor a la vez y alterna las ejecuciones', 'x-raw': 'Conserva los datos en bruto de cada ejecución', 'x-gate': 'Pasa la puerta de calidad antes de comparar la velocidad', 'x-fail': 'También cuenta las ejecuciones fallidas y anómalas',
        'e-env': 'Indica el hardware, las versiones y la configuración', 'e-repro': 'Otras personas pueden reproducirlo siguiendo los pasos', 'e-limits': 'Indica las limitaciones y lo que no se hizo',
      },
      red: { simAsReal: 'Cifras simuladas o estimadas presentadas como mediciones', stateLeak: 'Una fuga de estado sin explicar (dos sesiones compartieron estado)' },
      redTitle: 'Dos líneas rojas',
      sTotK: 'Puntuación total', sTotF: '<b>= suma de las cinco dimensiones, sobre 100</b><br>una línea roja pone a cero su dimensión entera',
      sDimK: 'Puntos por dimensión', sWeakK: 'Qué mejorar primero', sWeakF: '<b>la dimensión con la menor proporción de sus puntos</b>; en un empate, la que vale más',
      rReady: '<span class="c">$</span> marca un punto y verás aquí cuántos puntos suma',
      rAdd: (name, pts) => `<span class="m">+${pts}</span> ${name}`,
      rDel: (name, pts) => `<span class="m">−${pts}</span> ${name}`,
      rRedOn: (name, dim) => `<span class="y">línea roja</span> ${name} → «${dim}» a cero`,
      rRedOff: (name) => `<span class="c">anulada</span> ${name}`,
      vScore: (t, weak) => `Ahora tienes <b>${t}</b> puntos. Mejora primero «${weak}».`,
      vRedSim: '<br>Presentar cifras simuladas como mediciones anula toda la dimensión «Experimentos y calidad»: los lectores ya no pueden fiarse de ninguna de tus cifras. El arreglo es sencillo: etiquétalas con claridad como «Estimación didáctica» o «medido».',
      vRedLeak: '<br>Una fuga de estado sin explicar pone a cero «Código y pruebas»: ninguna velocidad compensa los resultados incorrectos.',
      vFull: '<br>Puntuación perfecta. Recuerda: la rúbrica revisa la evidencia, no lo bonita que sea la conclusión.',
      rTry: [
        'Marca solo los cuatro puntos de «Código y pruebas»: 25 puntos. Después marca la línea roja «cifras simuladas presentadas como mediciones» y mira qué dimensión se pone a cero.',
        'Marca los cuatro puntos de «Experimentos y calidad» y luego cruza la línea roja: se esfuman 20 puntos de golpe. Una sola cifra falsa anula también el trabajo honesto de la misma dimensión.',
        'Intenta pasar de 80: verás que los puntos más baratos son los de redacción, como «indica el hardware» e «indica las limitaciones». No son difíciles, pero son los que más se olvidan.',
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
