/* Chapter 03 widgets: a matrix-vector product step by step, and strided addressing of a small 3-D tensor.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.tensor;
  const num = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const vec = a => '[' + a.map(num).join(', ') + ']';

  const T = Viz.t({
    zh: {
      code: 'MATVEC', title: '矩阵乘向量，一步一步', tag: '教学推演 · 小矩阵手算',
      intro: 'W 是 2 × 3 的矩阵，x 是 3 个数。按 <b>单步</b>，看 y = Wx 怎样一行一行算出来。拖动 x 的三个滑块，再按单步，看哪些输出跟着变。',
      lgRow: '正在用的一行权重', lgX: '正在相乘的输入', lgY: '刚算出的输出',
      steps: ['取第 1 行', '对应相乘', '相加得 y₁', '取第 2 行', '对应相乘', '相加得 y₂'],
      bStep: '▶ 单步', bReset: '重置',
      xLabel: (k) => `x${['₁', '₂', '₃'][k]}`, bLabel: '同时算几个输入 b',
      ready: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始',
      t0: (r, row, x) => `<span class="c">第 ${r} 行</span>：W 的第 ${r} 行是 ${row}，要和 x = ${x} 一一配对`,
      t1: (prods) => `<span class="m">对应相乘</span>：${prods}`,
      sep: '，',
      t2: (r, sum, y) => `<span class="y">相加</span>：${sum} = ${y}，这就是 y${r === 1 ? '₁' : '₂'}。一个输出 = 一次点积`,
      done: (y) => `<span class="w">完成</span>：y = ${y}。2 行 × 3 列，一共 6 次乘加`,
      eqIdle: '按单步开始计算',
      sShapeK: 'y 的形状', sShapeF: '<b>= (2 × 3) · (3 × 1)</b><br>中间的 3 必须相等，然后消掉',
      sMacK: '乘加次数', sMacF: (b) => `<b>= 2 × 3 × ${b}</b><br>每个输入都要和每个权重乘一次`,
      sReuseK: '每读一次权重，用几次', sReuseF: '<b>= b</b><br>b = 1 叫 GEMV；b > 1 叫 GEMM',
      try: [
        '连按 <b>单步</b> 走完两行：每个输出都是“一行权重”和“整个 x”的点积。',
        '把 x 设成 <b>[0, 1, 0]</b> 再算：y 正好等于 W 的第 2 列。x 只有一个 1 时，Wx 就是把 W 的某一列挑出来。',
        '把 b 从 1 拉到 8：乘加次数涨 8 倍，可权重还是那 6 个。一份权重被用 8 次，这就是批量计算省搬运的来源（第 5 章）。',
      ],

      sCode: 'STRIDE_LAB', sTitle: '同一个元素，两个地址', sTag: '教学推演 · 缩小版 GDN 状态',
      sIntro: '一个三维数组，三个轴叫 i、h、j，大小是 2、3、2，一共 12 个数。内存只有一条线，12 个数总得排个先后。点上面任意一个格子，看它排在内存的第几位；再切换排法，看同一个格子搬到了哪里。',
      lgSel: '选中的元素', lgRead: '这次读到的地址', lgCell: '内存里的一格',
      sSteps: ['选元素', '查步长', '坐标 × 步长', '加起来 = 地址'],
      layA: '(i, h, j)：j 最快', layB: '(i, j, h)：h 最快',
      layNoteA: 'Strata 内核的排法', layNoteB: '参考实现的排法',
      block: (i) => `i = ${i}`, rowH: (h) => `h=${h}`, colJ: (j) => `j=${j}`,
      memLabel: '内存（地址 0–11）',
      walk: '▶ 固定 i，按 h、j 顺序读一遍',
      sReady: '<span class="c">$</span> ready. 点上面任意一个格子',
      p0: (e) => `<span class="c">选中</span> 元素 ${e}`,
      p1: (si, sh, sj) => `<span class="c">步长</span>：这种排法下 i 每加 1 跨 ${si} 格，h 跨 ${sh} 格，j 跨 ${sj} 格`,
      p2: (expr) => `<span class="m">相乘再相加</span>：${expr}`,
      p3: (a) => `<span class="y">地址 = ${a}</span>。内存条上高亮的就是它`,
      swap: (lay, e, a) => `<span class="y">// 换成「${lay}」：同一个元素 ${e} 搬到了地址 ${a}</span>`,
      walkLog: (seq, ok) => `<span class="w">读取顺序</span>：${seq}。${ok ? '每步 +1，连续读' : '来回跳着读'}`,
      kStride: '步长 (i, h, j)', fStride: '<b>最快的轴，步长是 1</b><br>往前每个轴 = 它后面各轴大小相乘',
      kAddr: '选中元素的地址', fAddr: (expr) => `<b>= ${expr}</b>`, fAddrIdle: '点一个格子',
      kStep: 'j 加 1，地址加几', vStep: (d) => d === 1 ? '+1（连续）' : `+${d}（跳着）`, fStep: '一组 GPU 线程读连续地址时最快',
      sTry: [
        '点 <b>i=1, h=2, j=0</b> 这一格，再切换排法：地址从 10 变成 8。两个地址都在 0–11 之内，越界检查发现不了“用错排法”。',
        '按 <b>固定 i 读一遍</b>：j 最快时地址连续 +1；h 最快时来回跳。GPU 上一组线程读相邻地址最划算，这就是 Strata 改排法的原因。',
        '看“步长”一栏：最后一个轴的步长总是 1，前面每个轴的步长 = 它后面所有轴的大小相乘。会算步长，就会算任意张量的地址。',
      ],
      sVerdict: '① 同一个数学元素，换一种排法就换一个地址。<br>② 两种地址都合法、都不越界，所以用错排法不会报错，只会悄悄算错。<br>③ Strata 的 GDN 内核让 j 最快，好让一组线程读连续的内存；它和参考实现的排法不同，必须写进接口说明。',
    },
    en: {
      code: 'MATVEC', title: 'Matrix times vector, step by step', tag: 'Teaching estimate · a small matrix by hand',
      intro: 'W is a 2 × 3 matrix and x has 3 numbers. Press <b>Step</b> to watch y = Wx being computed row by row. Drag the three sliders for x, then step again to see which outputs change.',
      lgRow: 'Row of weights in use', lgX: 'Inputs being multiplied', lgY: 'Output just computed',
      steps: ['Take row 1', 'Multiply pairs', 'Add up → y₁', 'Take row 2', 'Multiply pairs', 'Add up → y₂'],
      bStep: '▶ Step', bReset: 'Reset',
      xLabel: (k) => `x${['₁', '₂', '₃'][k]}`, bLabel: 'Inputs computed at once (b)',
      ready: '<span class="c">$</span> ready. Press [ ▶ Step ] to begin',
      t0: (r, row, x) => `<span class="c">Row ${r}</span>: row ${r} of W is ${row}; pair it up with x = ${x}`,
      t1: (prods) => `<span class="m">Multiply pairs</span>: ${prods}`,
      sep: ', ',
      t2: (r, sum, y) => `<span class="y">Add up</span>: ${sum} = ${y}, which is y${r === 1 ? '₁' : '₂'}. One output = one dot product`,
      done: (y) => `<span class="w">Done</span>: y = ${y}. 2 rows × 3 columns, 6 multiply-adds in total`,
      eqIdle: 'Press Step to start computing',
      sShapeK: 'Shape of y', sShapeF: '<b>= (2 × 3) · (3 × 1)</b><br>the 3 in the middle must match, then it cancels out',
      sMacK: 'Multiply-adds', sMacF: (b) => `<b>= 2 × 3 × ${b}</b><br>every input is multiplied once by every weight`,
      sReuseK: 'Uses per weight read', sReuseF: '<b>= b</b><br>b = 1 is a GEMV; b > 1 is a GEMM',
      try: [
        'Keep pressing <b>Step</b> through both rows: every output is the dot product of "one row of weights" and "all of x".',
        'Set x to <b>[0, 1, 0]</b> and compute: y is exactly column 2 of W. When x holds a single 1, Wx just picks out one column of W.',
        'Drag b from 1 to 8: the multiply-adds grow 8 times, but the weights are still the same 6. One copy of the weights is used 8 times; that is where batching saves data movement (Chapter 5).',
      ],

      sCode: 'STRIDE_LAB', sTitle: 'One element, two addresses', sTag: 'Teaching estimate · a shrunken GDN state',
      sIntro: 'A three-dimensional array with axes i, h and j of sizes 2, 3 and 2: 12 numbers in all. Memory is a single line, so the 12 numbers must come in some order. Click any cell above to see its place in memory; then switch layouts and see where the same cell moves.',
      lgSel: 'Selected element', lgRead: 'Address read this time', lgCell: 'One memory cell',
      sSteps: ['Pick element', 'Look up strides', 'Coord × stride', 'Sum = address'],
      layA: '(i, h, j): j fastest', layB: '(i, j, h): h fastest',
      layNoteA: 'Layout of Strata\'s kernel', layNoteB: 'Layout of the reference implementation',
      block: (i) => `i = ${i}`, rowH: (h) => `h=${h}`, colJ: (j) => `j=${j}`,
      memLabel: 'Memory (addresses 0–11)',
      walk: '▶ Fix i, read in h, j order',
      sReady: '<span class="c">$</span> ready. Click any cell above',
      p0: (e) => `<span class="c">Selected</span> element ${e}`,
      p1: (si, sh, sj) => `<span class="c">Strides</span>: in this layout, a +1 step moves i by ${si}, h by ${sh} and j by ${sj} cells`,
      p2: (expr) => `<span class="m">Multiply and add</span>: ${expr}`,
      p3: (a) => `<span class="y">Address = ${a}</span>. It is the highlighted cell in the memory strip`,
      swap: (lay, e, a) => `<span class="y">// switched to "${lay}": the same element ${e} moved to address ${a}</span>`,
      walkLog: (seq, ok) => `<span class="w">Read order</span>: ${seq}. ${ok ? '+1 each step: a contiguous read' : 'jumping back and forth'}`,
      kStride: 'Strides (i, h, j)', fStride: '<b>the fastest axis has stride 1</b><br>each axis before it = product of the sizes after it',
      kAddr: 'Address of the selected element', fAddr: (expr) => `<b>= ${expr}</b>`, fAddrIdle: 'Click a cell',
      kStep: 'Address change when j grows by 1', vStep: (d) => d === 1 ? '+1 (contiguous)' : `+${d} (jumping)`, fStep: 'GPU threads read fastest from contiguous addresses',
      sTry: [
        'Click the cell <b>i=1, h=2, j=0</b>, then switch layouts: the address changes from 10 to 8. Both addresses are inside 0–11, so a bounds check cannot catch "the wrong layout".',
        'Press <b>Fix i, read</b>: with j fastest the addresses go up by 1 each time; with h fastest they jump back and forth. A group of GPU threads works best reading neighboring addresses, which is why Strata changed the layout.',
        'Look at the "Strides" box: the last axis always has stride 1, and each earlier axis has stride = product of the sizes of all axes after it. Once you can compute strides, you can compute the address in any tensor.',
      ],
      sVerdict: '① Change the layout and the same mathematical element gets a different address.<br>② Both addresses are valid and in bounds, so a wrong layout raises no error; it just quietly computes the wrong thing.<br>③ Strata\'s GDN kernel makes j fastest so a group of threads reads contiguous memory; this differs from the reference implementation and must be written into the interface notes.',
    },
    ar: {
      code: 'MATVEC', title: 'ضرب مصفوفة في متجه خطوة بخطوة', tag: 'تقدير تعليمي · مصفوفة صغيرة بالقلم',
      intro: 'W مصفوفة 2 × 3 و x ثلاثة أعداد. اضغط <b>خطوة</b> لترى كيف يُحسب y = Wx صفًّا بعد صف. حرّك منزلقات x الثلاثة ثم اضغط خطوة مرة أخرى لترى أي المخرجات تتغيّر.',
      lgRow: 'صف الأوزان المستخدم الآن', lgX: 'المدخلات التي تُضرب', lgY: 'الناتج الذي حُسب للتو',
      steps: ['خذ الصف 1', 'اضرب الأزواج', 'اجمع فينتج y₁', 'خذ الصف 2', 'اضرب الأزواج', 'اجمع فينتج y₂'],
      bStep: '▶ خطوة', bReset: 'إعادة',
      xLabel: (k) => `x${['₁', '₂', '₃'][k]}`, bLabel: 'عدد المدخلات المحسوبة معًا (b)',
      ready: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ] للبدء',
      t0: (r, row, x) => `<span class="c">الصف ${r}</span>: الصف ${r} من W هو ${row}، ويُقرن عنصرًا بعنصر مع x = ${x}`,
      t1: (prods) => `<span class="m">اضرب الأزواج</span>: ${prods}`,
      sep: '، ',
      t2: (r, sum, y) => `<span class="y">اجمع</span>: ${sum} = ${y}، وهذا هو y${r === 1 ? '₁' : '₂'}. ناتج واحد = جداء نقطي واحد`,
      done: (y) => `<span class="w">تم</span>: y = ${y}. صفّان × ثلاثة أعمدة = 6 عمليات ضرب وجمع في المجموع`,
      eqIdle: 'اضغط خطوة لبدء الحساب',
      sShapeK: 'أبعاد y', sShapeF: '<b>= (2 × 3) · (3 × 1)</b><br>يجب أن يتطابق الرقم 3 في الوسط ثم يختفي',
      sMacK: 'عمليات الضرب والجمع', sMacF: (b) => `<b>= 2 × 3 × ${b}</b><br>كل مدخل يُضرب مرة واحدة في كل وزن`,
      sReuseK: 'عدد الاستخدامات لكل قراءة للأوزان', sReuseF: '<b>= b</b><br>b = 1 هو GEMV؛ و b > 1 هو GEMM',
      try: [
        'اضغط <b>خطوة</b> عدة مرات لتنهي الصفين: كل ناتج هو جداء نقطي بين «صف من الأوزان» و«x كاملة».',
        'اجعل x تساوي <b>[0, 1, 0]</b> ثم احسب: تصبح y تمامًا العمود 2 من W. حين تحمل x رقم 1 واحدًا فقط، يلتقط Wx عمودًا واحدًا من W.',
        'اسحب b من 1 إلى 8: تتضاعف عمليات الضرب والجمع 8 مرات، لكن الأوزان تبقى 6 أوزان فقط. تُستخدم نسخة الأوزان الواحدة 8 مرات؛ ومن هنا يأتي توفير نقل البيانات في الحساب الدفعي (الفصل 5).',
      ],

      sCode: 'STRIDE_LAB', sTitle: 'عنصر واحد وعنوانان', sTag: 'تقدير تعليمي · حالة GDN مصغّرة',
      sIntro: 'مصفوفة ثلاثية المحاور أسماؤها i و h و j وأحجامها 2 و3 و2، أي 12 عددًا. الذاكرة خط واحد، فلا بد من ترتيب الأعداد الاثني عشر بطريقة ما. انقر أي خانة أعلاه لترى موضعها في الذاكرة؛ ثم بدّل الترتيب وانظر إلى أين تنتقل الخانة نفسها.',
      lgSel: 'العنصر المختار', lgRead: 'العنوان المقروء هذه المرة', lgCell: 'خانة واحدة في الذاكرة',
      sSteps: ['اختر العنصر', 'ابحث عن الخطوات', 'الإحداثي × الخطوة', 'المجموع = العنوان'],
      layA: '(i, h, j): الأسرع j', layB: '(i, j, h): الأسرع h',
      layNoteA: 'ترتيب نواة Strata', layNoteB: 'ترتيب التنفيذ المرجعي',
      block: (i) => `i = ${i}`, rowH: (h) => `h=${h}`, colJ: (j) => `j=${j}`,
      memLabel: 'الذاكرة (العناوين 0–11)',
      walk: '▶ ثبّت i واقرأ بترتيب h ثم j',
      sReady: '<span class="c">$</span> ready. انقر أي خانة أعلاه',
      p0: (e) => `<span class="c">المختار</span>: العنصر ${e}`,
      p1: (si, sh, sj) => `<span class="c">الخطوات</span>: في هذا الترتيب، كل زيادة بمقدار 1 في i تقفز ${si} خانة، وفي h تقفز ${sh} خانة، وفي j تقفز ${sj} خانة`,
      p2: (expr) => `<span class="m">اضرب ثم اجمع</span>: ${expr}`,
      p3: (a) => `<span class="y">العنوان = ${a}</span>. هو الخانة المميّزة في شريط الذاكرة`,
      swap: (lay, e, a) => `<span class="y">// بدّلنا إلى «${lay}»: انتقل العنصر نفسه ${e} إلى العنوان ${a}</span>`,
      walkLog: (seq, ok) => `<span class="w">ترتيب القراءة</span>: ${seq}. ${ok ? 'كل خطوة +1، قراءة متصلة' : 'قراءة بالقفز ذهابًا وإيابًا'}`,
      kStride: 'الخطوات (i, h, j)', fStride: '<b>المحور الأسرع خطوته 1</b><br>كل محور قبله = حاصل ضرب أحجام المحاور بعده',
      kAddr: 'عنوان العنصر المختار', fAddr: (expr) => `<b>= ${expr}</b>`, fAddrIdle: 'انقر خانة',
      kStep: 'عند زيادة j بمقدار 1، كم يزيد العنوان', vStep: (d) => d === 1 ? '+1 (متصل)' : `+${d} (بالقفز)`, fStep: 'تقرأ مجموعة خيوط GPU أسرع ما يكون من عناوين متصلة',
      sTry: [
        'انقر الخانة <b>i=1, h=2, j=0</b> ثم بدّل الترتيب: يتغيّر العنوان من 10 إلى 8. كلا العنوانين داخل المدى 0–11، فلا يكتشف فحص الحدود «الترتيب الخاطئ».',
        'اضغط <b>ثبّت i واقرأ</b>: حين يكون j الأسرع يزيد العنوان 1 في كل مرة؛ وحين يكون h الأسرع يقفز ذهابًا وإيابًا. تعمل مجموعة خيوط GPU أفضل ما يكون حين تقرأ عناوين متجاورة، ولهذا غيّر Strata الترتيب.',
        'انظر إلى مربع «الخطوات»: خطوة المحور الأخير دائمًا 1، وخطوة كل محور سابق = حاصل ضرب أحجام كل المحاور بعده. وإذا أتقنت حساب الخطوات أمكنك حساب العنوان في أي موتّر.',
      ],
      sVerdict: '① غيّر الترتيب يتغيّر عنوان العنصر الرياضي نفسه.<br>② العنوانان صالحان وداخل الحدود، فالترتيب الخاطئ لا يُظهر خطأً؛ بل يُفسد الحساب بصمت.<br>③ تجعل نواة GDN في Strata المحور j الأسرع كي تقرأ مجموعة خيوط ذاكرة متصلة؛ وهذا يختلف عن التنفيذ المرجعي، فيجب كتابته في وصف الواجهة.',
    },
    es: {
      code: 'MATVEC', title: 'Matriz por vector, paso a paso', tag: 'Estimación didáctica · cálculo a mano con una matriz pequeña',
      intro: 'W es una matriz de 2 × 3 y x son 3 números. Pulsa <b>Paso</b> y mira cómo y = Wx se calcula fila por fila. Arrastra los tres controles de x y vuelve a pulsar Paso para ver qué salidas cambian.',
      lgRow: 'La fila de pesos en uso', lgX: 'La entrada que se multiplica', lgY: 'La salida recién calculada',
      steps: ['Tomar la fila 1', 'Multiplicar por pares', 'Sumar: y₁', 'Tomar la fila 2', 'Multiplicar por pares', 'Sumar: y₂'],
      bStep: '▶ Paso', bReset: 'Reiniciar',
      xLabel: (k) => `x${['₁', '₂', '₃'][k]}`, bLabel: 'Cuántas entradas a la vez, b',
      ready: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para empezar',
      t0: (r, row, x) => `<span class="c">Fila ${r}</span>: la fila ${r} de W es ${row} y se empareja una a una con x = ${x}`,
      t1: (prods) => `<span class="m">Multiplicar por pares</span>: ${prods}`,
      sep: ', ',
      t2: (r, sum, y) => `<span class="y">Sumar</span>: ${sum} = ${y}; es y${r === 1 ? '₁' : '₂'}. Una salida = un producto escalar`,
      done: (y) => `<span class="w">Listo</span>: y = ${y}. 2 filas × 3 columnas, 6 multiplicaciones-sumas en total`,
      eqIdle: 'Pulsa Paso para empezar a calcular',
      sShapeK: 'Forma de y', sShapeF: '<b>= (2 × 3) · (3 × 1)</b><br>los 3 del medio deben ser iguales y desaparecen',
      sMacK: 'Multiplicaciones-sumas', sMacF: (b) => `<b>= 2 × 3 × ${b}</b><br>cada entrada se multiplica una vez por cada peso`,
      sReuseK: 'Usos de cada lectura de pesos', sReuseF: '<b>= b</b><br>b = 1 es GEMV; b > 1 es GEMM',
      try: [
        'Pulsa <b>Paso</b> varias veces hasta terminar las dos filas: cada salida es el producto escalar de «una fila de pesos» con «todo x».',
        'Pon x en <b>[0, 1, 0]</b> y calcula otra vez: y es exactamente la columna 2 de W. Cuando x tiene un solo 1, Wx elige una columna de W.',
        'Sube b de 1 a 8: las multiplicaciones-sumas se multiplican por 8, pero los pesos siguen siendo los mismos 6. Una copia de los pesos se usa 8 veces; de ahí viene el ahorro de movimiento de datos al calcular por lotes (capítulo 5).',
      ],

      sCode: 'STRIDE_LAB', sTitle: 'Un elemento, dos direcciones', sTag: 'Estimación didáctica · estado GDN reducido',
      sIntro: 'Un arreglo tridimensional con tres ejes, i, h y j, de tamaño 2, 3 y 2, en total 12 números. La memoria es una sola línea, así que hay que ordenar los 12 números. Pulsa cualquier casilla de arriba para ver en qué posición de la memoria queda; luego cambia de orden y mira adónde se mueve la misma casilla.',
      lgSel: 'El elemento elegido', lgRead: 'La dirección leída esta vez', lgCell: 'Una casilla de la memoria',
      sSteps: ['Elegir elemento', 'Mirar el stride', 'Coordenada × stride', 'Sumar = dirección'],
      layA: '(i, h, j): j el más rápido', layB: '(i, j, h): h el más rápido',
      layNoteA: 'El orden del kernel de Strata', layNoteB: 'El orden de la referencia',
      block: (i) => `i = ${i}`, rowH: (h) => `h=${h}`, colJ: (j) => `j=${j}`,
      memLabel: 'Memoria (direcciones 0–11)',
      walk: '▶ Fijar i y leer en orden h, j',
      sReady: '<span class="c">$</span> ready. Pulsa cualquier casilla de arriba',
      p0: (e) => `<span class="c">Elegido</span>: elemento ${e}`,
      p1: (si, sh, sj) => `<span class="c">Stride</span>: con este orden, cada +1 en i salta ${si} casillas, en h salta ${sh} y en j salta ${sj}`,
      p2: (expr) => `<span class="m">Multiplicar y sumar</span>: ${expr}`,
      p3: (a) => `<span class="y">dirección = ${a}</span>. Es la que está resaltada en la tira de memoria`,
      swap: (lay, e, a) => `<span class="y">// cambio a «${lay}»: el mismo elemento ${e} pasa a la dirección ${a}</span>`,
      walkLog: (seq, ok) => `<span class="w">Orden de lectura</span>: ${seq}. ${ok ? 'cada paso +1, lectura continua' : 'lectura a saltos'}`,
      kStride: 'Stride (i, h, j)', fStride: '<b>el eje más rápido tiene stride 1</b><br>cada eje anterior = producto de los tamaños de los siguientes',
      kAddr: 'Dirección del elemento elegido', fAddr: (expr) => `<b>= ${expr}</b>`, fAddrIdle: 'Pulsa una casilla',
      kStep: 'Si j sube 1, cuánto sube la dirección', vStep: (d) => d === 1 ? '+1 (contiguo)' : `+${d} (a saltos)`, fStep: 'Un grupo de hilos de GPU es más rápido si lee direcciones contiguas',
      sTry: [
        'Pulsa la casilla <b>i=1, h=2, j=0</b> y cambia de orden: la dirección pasa de 10 a 8. Las dos direcciones están dentro de 0–11, así que la comprobación de límites no detecta que «usaste el orden equivocado».',
        'Pulsa <b>Fijar i y leer en orden h, j</b>: con j el más rápido, las direcciones suben de +1 en +1; con h el más rápido, saltan de un lado a otro. En la GPU, que un grupo de hilos lea direcciones vecinas es lo más rentable, y por eso Strata cambió el orden.',
        'Mira la columna de «stride»: el stride del último eje siempre es 1, y el de cada eje anterior = producto de los tamaños de los ejes que le siguen. Si sabes calcular el stride, sabes calcular la dirección en cualquier tensor.',
      ],
      sVerdict: '① El mismo elemento matemático cambia de dirección si cambias el orden.<br>② Las dos direcciones son válidas y no se salen de rango, así que usar un orden equivocado no da ningún error: solo calcula mal en silencio.<br>③ El kernel GDN de Strata hace de j el eje más rápido para que un grupo de hilos lea memoria contigua; su orden es distinto del de la referencia y debe quedar escrito en la descripción de la interfaz.',
    },
    ko: {
      code: 'MATVEC', title: '행렬-벡터 곱, 한 단계씩', tag: '교육용 추정 · 작은 행렬 손계산',
      intro: 'W는 2 × 3 행렬이고, x는 수 3개예요. <b>한 단계</b>를 누르면 y = Wx가 한 행씩 계산되는 모습을 볼 수 있어요. x의 슬라이더 세 개를 움직인 뒤 다시 한 단계를 눌러서 어떤 출력이 따라 바뀌는지 보세요.',
      lgRow: '지금 쓰는 가중치 한 행', lgX: '지금 곱하는 입력', lgY: '방금 계산한 출력',
      steps: ['1행 가져오기', '짝끼리 곱하기', '더해서 y₁', '2행 가져오기', '짝끼리 곱하기', '더해서 y₂'],
      bStep: '▶ 한 단계', bReset: '초기화',
      xLabel: (k) => `x${['₁', '₂', '₃'][k]}`, bLabel: '한 번에 계산할 입력 수 b',
      ready: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 눌러 시작하세요',
      t0: (r, row, x) => `<span class="c">${r}행</span>: W의 ${r}행은 ${row}이고, x = ${x}와 하나씩 짝을 지어요`,
      t1: (prods) => `<span class="m">짝끼리 곱하기</span>: ${prods}`,
      sep: ', ',
      t2: (r, sum, y) => `<span class="y">더하기</span>: ${sum} = ${y}, 이것이 y${r === 1 ? '₁' : '₂'}예요. 출력 하나 = 내적 한 번`,
      done: (y) => `<span class="w">완료</span>: y = ${y}. 2행 × 3열이라 곱셈-덧셈은 모두 6번이에요`,
      eqIdle: '한 단계를 눌러 계산을 시작하세요',
      sShapeK: 'y의 형상', sShapeF: '<b>= (2 × 3) · (3 × 1)</b><br>가운데 3이 같아야 하고, 곱하고 나면 사라져요',
      sMacK: '곱셈-덧셈 횟수', sMacF: (b) => `<b>= 2 × 3 × ${b}</b><br>입력 하나하나가 가중치 하나하나와 한 번씩 곱해져요`,
      sReuseK: '가중치를 한 번 읽을 때 쓰는 횟수', sReuseF: '<b>= b</b><br>b = 1이면 GEMV, b > 1이면 GEMM',
      try: [
        '<b>한 단계</b>를 계속 눌러 두 행을 모두 계산해 보세요. 출력은 모두 「가중치 한 행」과 「x 전체」의 내적이에요.',
        'x를 <b>[0, 1, 0]</b>으로 놓고 계산해 보세요. y가 정확히 W의 2열이 돼요. x에 1이 하나뿐이면 Wx는 W의 열 하나를 골라내는 일이에요.',
        'b를 1에서 8까지 늘려 보세요. 곱셈-덧셈 횟수는 8배가 되지만 가중치는 여전히 6개예요. 가중치 한 벌을 8번 쓰는 거예요. 배치 계산이 데이터 이동을 아끼는 이유가 여기에 있어요(5장).',
      ],

      sCode: 'STRIDE_LAB', sTitle: '같은 원소, 두 개의 주소', sTag: '교육용 추정 · 축소판 GDN 상태',
      sIntro: '3차원 배열이에요. 축 세 개를 i, h, j라 하고 크기는 2, 3, 2예요. 수는 모두 12개예요. 메모리는 한 줄뿐이라 12개의 수를 어떤 순서로든 놓아야 해요. 위의 칸을 아무거나 눌러서 메모리 몇 번째에 놓이는지 보세요. 그다음 배치를 바꿔서 같은 칸이 어디로 옮겨 가는지 보세요.',
      lgSel: '선택한 원소', lgRead: '이번에 읽은 주소', lgCell: '메모리의 한 칸',
      sSteps: ['원소 고르기', '스트라이드 찾기', '좌표 × 스트라이드', '더하면 주소'],
      layA: '(i, h, j): j가 가장 빠름', layB: '(i, j, h): h가 가장 빠름',
      layNoteA: 'Strata 커널의 배치', layNoteB: '참조 구현의 배치',
      block: (i) => `i = ${i}`, rowH: (h) => `h=${h}`, colJ: (j) => `j=${j}`,
      memLabel: '메모리 (주소 0–11)',
      walk: '▶ i를 고정하고 h, j 순서로 읽기',
      sReady: '<span class="c">$</span> ready. 위의 칸을 아무거나 눌러 보세요',
      p0: (e) => `<span class="c">선택</span> 원소 ${e}`,
      p1: (si, sh, sj) => `<span class="c">스트라이드</span>: 이 배치에서는 i가 1 늘면 ${si}칸, h가 1 늘면 ${sh}칸, j가 1 늘면 ${sj}칸 건너뛰어요`,
      p2: (expr) => `<span class="m">곱해서 더하기</span>: ${expr}`,
      p3: (a) => `<span class="y">주소 = ${a}</span>. 메모리 띠에서 강조된 칸이에요`,
      swap: (lay, e, a) => `<span class="y">// 배치 전환 「${lay}」: 같은 원소 ${e}의 주소는 이제 ${a}예요</span>`,
      walkLog: (seq, ok) => `<span class="w">읽는 순서</span>: ${seq}. ${ok ? '매번 +1이라 연속해서 읽어요' : '이리저리 건너뛰며 읽어요'}`,
      kStride: '스트라이드 (i, h, j)', fStride: '<b>가장 빠른 축의 스트라이드는 1</b><br>그 앞의 축 = 뒤에 있는 축들의 크기를 곱한 값',
      kAddr: '선택한 원소의 주소', fAddr: (expr) => `<b>= ${expr}</b>`, fAddrIdle: '칸을 눌러 보세요',
      kStep: 'j가 1 늘 때 주소의 변화', vStep: (d) => d === 1 ? '+1 (연속)' : `+${d} (건너뜀)`, fStep: 'GPU 스레드는 연속된 주소를 읽을 때 가장 빨라요',
      sTry: [
        '<b>i=1, h=2, j=0</b> 칸을 누른 뒤 배치를 바꿔 보세요. 주소가 10에서 8로 바뀌어요. 두 주소 모두 0–11 범위 안이라서 범위 검사로는 「배치를 잘못 쓴 것」을 잡아낼 수 없어요.',
        '<b>i를 고정하고 읽기</b>를 눌러 보세요. j가 가장 빠르면 주소가 매번 1씩 늘고, h가 가장 빠르면 이리저리 건너뛰어요. GPU 스레드 묶음은 이웃한 주소를 읽을 때 가장 효율적이에요. Strata가 배치를 바꾼 이유예요.',
        '「스트라이드」 칸을 보세요. 마지막 축의 스트라이드는 항상 1이고, 앞쪽 축의 스트라이드 = 그 뒤에 있는 모든 축의 크기를 곱한 값이에요. 스트라이드를 계산할 수 있으면 어떤 텐서의 주소도 계산할 수 있어요.',
      ],
      sVerdict: '① 수학적으로 같은 원소도 배치를 바꾸면 주소가 달라져요.<br>② 두 주소 모두 유효하고 범위 안이라서, 배치를 잘못 써도 오류가 나지 않고 조용히 틀리게 계산해요.<br>③ Strata의 GDN 커널은 j를 가장 빠르게 해서 스레드 묶음이 연속된 메모리를 읽게 해요. 참조 구현과 배치가 다르므로 인터페이스 설명에 꼭 적어야 해요.',
    },
    ja: {
      code: 'MATVEC', title: '行列とベクトルの積を 1 ステップずつ', tag: '教育用の試算 · 小さな行列を手計算',
      intro: 'W は 2 × 3 の行列、x は 3 つの数です。<b>ステップ</b>を押して、y = Wx が 1 行ずつ計算されるようすを見ましょう。x の 3 つのスライダーを動かしてからもう一度ステップを押すと、どの出力が変わるか分かります。',
      lgRow: '使っている重みの 1 行', lgX: '掛け合わせている入力', lgY: '計算できたばかりの出力',
      steps: ['1 行目を取る', '対応する要素を掛ける', '足して y₁', '2 行目を取る', '対応する要素を掛ける', '足して y₂'],
      bStep: '▶ ステップ', bReset: 'リセット',
      xLabel: (k) => `x${['₁', '₂', '₃'][k]}`, bLabel: '同時に計算する入力の数 b',
      ready: '<span class="c">$</span> ready. [ ▶ ステップ ] を押して開始',
      t0: (r, row, x) => `<span class="c">${r} 行目</span>：W の ${r} 行目は ${row}。x = ${x} と 1 つずつペアにします`,
      t1: (prods) => `<span class="m">対応する要素を掛ける</span>：${prods}`,
      sep: '、',
      t2: (r, sum, y) => `<span class="y">足し合わせる</span>：${sum} = ${y}。これが y${r === 1 ? '₁' : '₂'} です。出力 1 つ = 内積 1 回`,
      done: (y) => `<span class="w">完了</span>：y = ${y}。2 行 × 3 列で、積和は全部で 6 回`,
      eqIdle: 'ステップを押すと計算が始まります',
      sShapeK: 'y の形状', sShapeF: '<b>= (2 × 3) · (3 × 1)</b><br>間の 3 は一致している必要があり、計算で消えます',
      sMacK: '積和の回数', sMacF: (b) => `<b>= 2 × 3 × ${b}</b><br>どの入力も、どの重みとも 1 回ずつ掛け合わせます`,
      sReuseK: '重みを 1 回読むと何回使えるか', sReuseF: '<b>= b</b><br>b = 1 なら GEMV、b > 1 なら GEMM',
      try: [
        '<b>ステップ</b>を連打して 2 行とも計算してみましょう。どの出力も「重みの 1 行」と「x 全体」の内積です。',
        'x を <b>[0, 1, 0]</b> にして計算します。y はちょうど W の 2 列目になります。x に 1 が 1 つだけあると、Wx は W の列を 1 本選び出す操作になります。',
        'b を 1 から 8 まで増やします。積和の回数は 8 倍になりますが、重みは同じ 6 個のままです。1 つの重みを 8 回使うので、バッチ計算でデータ移動が減ります（第 5 章）。',
      ],

      sCode: 'STRIDE_LAB', sTitle: '同じ要素、2 つのアドレス', sTag: '教育用の試算 · 縮小版の GDN 状態',
      sIntro: '3 次元の配列です。軸は i、h、j で、大きさは 2、3、2。全部で 12 個の数があります。メモリは一本の線なので、12 個の数には並べる順番が必要です。上のマスを 1 つクリックすると、メモリの何番目に並ぶかが分かります。並べ方を切り替えると、同じマスがどこへ動くか見られます。',
      lgSel: '選んだ要素', lgRead: '今回読んだアドレス', lgCell: 'メモリの 1 マス',
      sSteps: ['要素を選ぶ', 'ストライドを調べる', '座標 × ストライド', '足してアドレス'],
      layA: '(i, h, j)：j が最速', layB: '(i, j, h)：h が最速',
      layNoteA: 'Strata カーネルの並べ方', layNoteB: 'リファレンス実装の並べ方',
      block: (i) => `i = ${i}`, rowH: (h) => `h=${h}`, colJ: (j) => `j=${j}`,
      memLabel: 'メモリ（アドレス 0–11）',
      walk: '▶ i を固定して h、j の順に読む',
      sReady: '<span class="c">$</span> ready. 上のマスを 1 つクリックしてください',
      p0: (e) => `<span class="c">選択</span> 要素 ${e}`,
      p1: (si, sh, sj) => `<span class="c">ストライド</span>：この並べ方では、i が 1 増えると ${si} マス、h は ${sh} マス、j は ${sj} マス進みます`,
      p2: (expr) => `<span class="m">掛けて足す</span>：${expr}`,
      p3: (a) => `<span class="y">アドレス = ${a}</span>。メモリの帯で強調されているマスです`,
      swap: (lay, e, a) => `<span class="y">// 「${lay}」に切り替え：同じ要素 ${e} がアドレス ${a} に移りました</span>`,
      walkLog: (seq, ok) => `<span class="w">読む順番</span>：${seq}。${ok ? '毎回 +1 で、連続して読めます' : 'あちこち飛びながら読みます'}`,
      kStride: 'ストライド (i, h, j)', fStride: '<b>最も速く変わる軸のストライドは 1</b><br>それより前の軸 = 後ろにある軸の大きさの積',
      kAddr: '選んだ要素のアドレス', fAddr: (expr) => `<b>= ${expr}</b>`, fAddrIdle: 'マスをクリック',
      kStep: 'j が 1 増えたときのアドレスの変化', vStep: (d) => d === 1 ? '+1（連続）' : `+${d}（飛び飛び）`, fStep: 'GPU のスレッドは連続したアドレスを読むときが最も速い',
      sTry: [
        '<b>i=1, h=2, j=0</b> のマスをクリックし、並べ方を切り替えます。アドレスは 10 から 8 に変わります。どちらも 0–11 の範囲内なので、範囲チェックでは「並べ方の取り違え」を見つけられません。',
        '<b>i を固定して読む</b>を押します。j が最速ならアドレスは毎回 +1、h が最速なら行ったり来たりします。GPU では、1 組のスレッドが隣り合うアドレスを読むのが最も効率的です。これが Strata が並べ方を変えた理由です。',
        '「ストライド」の欄を見ましょう。最後の軸のストライドは常に 1 で、それより前の軸のストライドは、後ろにあるすべての軸の大きさの積です。ストライドを計算できれば、どんなテンソルでもアドレスを計算できます。',
      ],
      sVerdict: '① 数学的には同じ要素でも、並べ方を変えるとアドレスが変わります。<br>② どちらのアドレスも有効で範囲内なので、並べ方を間違えてもエラーにならず、静かに計算が狂います。<br>③ Strata の GDN カーネルは j を最速にして、1 組のスレッドが連続したメモリを読めるようにしています。リファレンス実装と並べ方が違うので、インターフェースの説明に必ず書く必要があります。',
    },
  });

  const W = [[1, 2, 3], [4, 5, 6]];

  Viz.register('matvec-steps', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgRow, glow: true },
        { color: 'var(--a2)', text: T.lgX },
        { color: 'var(--a3)', text: T.lgY },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      const cellCss = 'display:flex;align-items:center;justify-content:center;height:34px;border:1px solid var(--frame);font-family:var(--mono);font-size:15px;color:var(--ink)';
      const opCss = 'display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--muted)';
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div style="display:grid;grid-template-columns:minmax(0,3fr) 22px minmax(0,1fr) 22px minmax(0,1fr);gap:6px;align-items:center;max-width:360px">
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px">${W.flat().map((w, k) => `<div data-w="${k}" style="${cellCss}">${w}</div>`).join('')}</div>
          <div style="${opCss}">×</div>
          <div style="display:grid;gap:4px">${[0, 1, 2].map(k => `<div data-x="${k}" style="${cellCss}"></div>`).join('')}</div>
          <div style="${opCss}">=</div>
          <div style="display:grid;gap:4px">${[0, 1].map(k => `<div data-y="${k}" style="${cellCss}">?</div>`).join('')}</div>
        </div>
        <div class="mv-eq" style="font-family:var(--mono);font-size:13px;color:var(--ink);margin-top:12px;min-height:20px"></div>
        ${[0, 1, 2].map(k => `<div class="viz-slider"><label>${T.xLabel(k)}</label><input data-xs="${k}" type="range" min="-2" max="2" step="1" value="${[1, 0, -1][k]}" aria-label="${Viz.esc(T.xLabel(k))}"><output data-xo="${k}"></output></div>`).join('')}
        <div class="viz-slider"><label>${T.bLabel}</label><input class="mv-b" type="range" min="1" max="8" step="1" value="1" aria-label="${Viz.esc(T.bLabel)}"><output class="mv-bo">1</output></div>
        <div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bReset, 'ghost')}</div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'mv-shape', k: T.sShapeK, v: '2 × 1', f: T.sShapeF }) +
        Viz.stat({ id: 'mv-mac', k: T.sMacK, v: '6', f: T.sMacF(1) }) +
        Viz.stat({ id: 'mv-reuse', k: T.sReuseK, v: '1', f: T.sReuseF, hot: true });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const bIn = $('.mv-b');
      let phase = -1;
      const x = () => [0, 1, 2].map(k => +el.querySelector(`[data-xs="${k}"]`).value);
      function paint() {
        const xv = x(), y = M.matvec(W, xv), row = phase < 0 ? -1 : phase < 3 ? 0 : 1, sub = phase < 0 ? -1 : phase % 3;
        [0, 1, 2].forEach(k => { el.querySelector(`[data-x="${k}"]`).textContent = num(xv[k]); el.querySelector(`[data-xo="${k}"]`).textContent = num(xv[k]); });
        W.flat().forEach((_, k) => { const c = el.querySelector(`[data-w="${k}"]`), on = Math.floor(k / 3) === row; c.style.borderColor = on ? 'var(--accent)' : 'var(--frame)'; c.style.boxShadow = on ? 'var(--glow)' : 'none'; c.style.background = on ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'transparent'; });
        [0, 1, 2].forEach(k => { el.querySelector(`[data-x="${k}"]`).style.borderColor = sub >= 1 ? 'var(--a2)' : 'var(--frame)'; });
        [0, 1].forEach(r => {
          const c = el.querySelector(`[data-y="${r}"]`), known = r < row || (r === row && sub === 2) || phase >= 6;
          c.textContent = known ? num(y[r]) : '?';
          c.style.borderColor = r === row && sub === 2 ? 'var(--a3)' : 'var(--frame)';
        });
        const b = +bIn.value, cst = M.cost(2, 3, b);
        $('.mv-bo').textContent = b;
        $('[data-s=mv-mac-v]').textContent = cst.macs;
        $('[data-s=mv-mac-f]').innerHTML = T.sMacF(b);
        $('[data-s=mv-reuse-v]').textContent = cst.reuse;
        const r = row >= 0 ? W[row] : null;
        $('.mv-eq').textContent = !r ? T.eqIdle : sub === 0 ? `${vec(r)} · ${vec(xv)}` : r.map((w, k) => `${w}×${xv[k] < 0 ? '(' + num(xv[k]) + ')' : xv[k]}`).join(' + ') + (sub === 2 ? ` = ${num(y[row])}` : '');
      }
      function step() {
        phase = phase >= 5 ? 0 : phase + 1;
        pipe.set(phase);
        const xv = x(), y = M.matvec(W, xv), row = phase < 3 ? 0 : 1, r = W[row];
        if (phase % 3 === 0) term.log(T.t0(row + 1, vec(r), vec(xv)));
        if (phase % 3 === 1) term.log(T.t1(r.map((w, k) => `${w}×${xv[k] < 0 ? '(' + num(xv[k]) + ')' : xv[k]} = ${num(w * xv[k])}`).join(T.sep)));
        if (phase % 3 === 2) term.log(T.t2(row + 1, r.map((w, k) => num(w * xv[k])).map((s, k) => (k && s[0] === '−' ? `(${s})` : s)).join(' + '), num(y[row])));
        if (phase === 5) term.log(T.done(vec(y)));
        paint();
      }
      const [stepBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      stepBtn.onclick = step;
      resetBtn.onclick = () => { phase = -1; pipe.set(-1); [1, 0, -1].forEach((v, k) => { el.querySelector(`[data-xs="${k}"]`).value = v; }); bIn.value = 1; term.clear(); term.log(T.ready); paint(); };
      el.querySelectorAll('input[type=range]').forEach(i => { i.oninput = paint; });
      paint();
    },
  });

  Viz.register('stride-explorer', {
    mount(el, ctx) {
      const shape = { i: 2, h: 3, j: 2 }, orders = [['i', 'h', 'j'], ['i', 'j', 'h']];
      const body = Viz.frame(el, { code: T.sCode, title: T.sTitle, tag: T.sTag, intro: T.sIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgSel, glow: true },
        { color: 'var(--a2)', text: T.lgRead },
        { color: 'var(--frame)', text: T.lgCell },
      ]));
      const pipe = Viz.pipe(body, T.sSteps);
      const cell = 'display:flex;align-items:center;justify-content:center;border:1px solid var(--frame);font-family:var(--mono);font-size:12px;color:var(--ink);background:transparent;padding:0;cursor:pointer;min-width:0';
      const blocks = [0, 1].map(i => `<div style="min-width:0"><div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-bottom:4px">${T.block(i)}</div>
        <div style="display:grid;grid-template-columns:34px repeat(2,minmax(0,1fr));gap:3px;align-items:center">
        <span></span>${[0, 1].map(j => `<span style="font-family:var(--mono);font-size:11px;color:var(--muted);text-align:center">${T.colJ(j)}</span>`).join('')}
        ${[0, 1, 2].map(h => `<span style="font-family:var(--mono);font-size:11px;color:var(--muted)">${T.rowH(h)}</span>${[0, 1].map(j => `<button type="button" data-e="${i}${h}${j}" style="${cell};height:30px">${i}${h}${j}</button>`).join('')}`).join('')}
        </div></div>`).join('');
      body.insertAdjacentHTML('beforeend', `<div class="viz-cols"><div class="viz-left">
        <div class="viz-row" style="margin-top:0">${orders.map((o, k) => `<button type="button" class="viz-btn${k ? ' ghost' : ''}" data-lay="${k}">${k ? T.layB : T.layA}</button>`).join('')}</div>
        <div class="se-note" style="font-size:12.5px;color:var(--muted);margin:6px 0 12px"></div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">${blocks}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin:14px 0 4px">${T.memLabel}</div>
        <div class="se-mem" style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:2px"></div>
        <div class="viz-row">${Viz.button(T.walk, 'alt se-walk')}</div>
      </div><div class="viz-right"></div></div>`);
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const term = Viz.term(left, T.sReady);
      right.innerHTML =
        Viz.stat({ id: 'se-st', k: T.kStride, v: '', f: T.fStride }) +
        Viz.stat({ id: 'se-ad', k: T.kAddr, v: '—', f: T.fAddrIdle, hot: true }) +
        Viz.stat({ id: 'se-dj', k: T.kStep, v: '', f: T.fStep });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.sTry) + `<div class="viz-verdict" hidden>${T.sVerdict}</div>`);
      const $ = s => el.querySelector(s);
      let lay = 0, sel = null, busy = false;
      const seen = new Set();
      const label = e => `(i=${e.i}, h=${e.h}, j=${e.j})`;
      const addrOf = e => M.offset(e, shape, orders[lay]);
      const expr = e => { const s = M.strides(shape, orders[lay]); return `${e.i}×${s.i} + ${e.h}×${s.h} + ${e.j}×${s.j}`; };
      function paint(reading) {
        const s = M.strides(shape, orders[lay]);
        $('.se-note').textContent = lay ? T.layNoteB : T.layNoteA;
        el.querySelectorAll('[data-lay]').forEach(b => b.classList.toggle('ghost', +b.dataset.lay !== lay));
        const mem = new Array(12);
        for (let i = 0; i < 2; i++) for (let h = 0; h < 3; h++) for (let j = 0; j < 2; j++) mem[M.offset({ i, h, j }, shape, orders[lay])] = `${i}${h}${j}`;
        const selKey = sel ? `${sel.i}${sel.h}${sel.j}` : '';
        $('.se-mem').innerHTML = mem.map((k, a) => {
          const on = k === selKey, rd = reading && reading.has(a);
          return `<div style="border:1px solid ${on ? 'var(--accent)' : rd ? 'var(--a2)' : 'var(--frame)'};background:${on ? 'var(--accent)' : rd ? 'color-mix(in srgb,var(--a2) 25%,transparent)' : 'transparent'};color:${on ? 'var(--paper)' : 'var(--ink)'};text-align:center;font-family:var(--mono);font-size:11px;line-height:1.3;padding:3px 0;min-width:0;overflow:hidden"><small style="display:block;font-size:10px;opacity:.7">${a}</small>${k}</div>`;
        }).join('');
        el.querySelectorAll('[data-e]').forEach(b => { const on = b.dataset.e === selKey; b.style.background = on ? 'var(--accent)' : 'transparent'; b.style.color = on ? 'var(--paper)' : 'var(--ink)'; b.style.borderColor = on ? 'var(--accent)' : 'var(--frame)'; });
        $('[data-s=se-st-v]').textContent = `(${s.i}, ${s.h}, ${s.j})`;
        $('[data-s=se-dj-v]').textContent = T.vStep(s.j);
        if (sel) { $('[data-s=se-ad-v]').textContent = addrOf(sel); $('[data-s=se-ad-f]').innerHTML = T.fAddr(expr(sel)); }
        if (sel) seen.add(lay);
        if (seen.size === 2) $('.viz-verdict').hidden = false;
      }
      async function guard(fn) {
        if (busy) return;
        busy = true;
        try { await fn(); } catch (e) { if (ctx.alive) throw e; }
        busy = false;
      }
      el.querySelectorAll('[data-e]').forEach(b => { b.onclick = () => guard(async () => {
        const k = b.dataset.e; sel = { i: +k[0], h: +k[1], j: +k[2] };
        const s = M.strides(shape, orders[lay]);
        pipe.set(0); term.log(T.p0(label(sel))); paint(); await ctx.sleep(220);
        pipe.set(1); term.log(T.p1(s.i, s.h, s.j)); await ctx.sleep(220);
        pipe.set(2); term.log(T.p2(expr(sel))); await ctx.sleep(220);
        pipe.set(3); term.log(T.p3(addrOf(sel))); paint();
      }); });
      el.querySelectorAll('[data-lay]').forEach(b => { b.onclick = () => guard(async () => {
        lay = +b.dataset.lay; paint();
        if (sel) term.log(T.swap(lay ? T.layB : T.layA, label(sel), addrOf(sel)));
      }); });
      el.querySelector('.se-walk').onclick = () => guard(async () => {
        const i = sel ? sel.i : 1, seq = [], reading = new Set();
        for (let h = 0; h < 3; h++) for (let j = 0; j < 2; j++) { const a = M.offset({ i, h, j }, shape, orders[lay]); seq.push(a); reading.add(a); paint(reading); await ctx.sleep(260); }
        const ok = seq.every((a, k) => !k || a === seq[k - 1] + 1);
        term.log(T.walkLog(seq.join(' → '), ok));
        await ctx.sleep(500); paint();
      });
      paint();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
