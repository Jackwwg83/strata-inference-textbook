/* DeepSeek page "attention" widget: which rows one decode query reads in one layer, and the state a token keeps.
   All visible text lives in the T table below (zh is the master). Numbers come from ds-attention-state.math.js. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsAttentionState;
  const LENS = [64, 128, 300, 512, 1024, 4096, 8192, 32768, 131072, 262144, 524288, 1048576];
  const RS = [0, 1, 4];
  const W = 380, X0 = 10;   // strip and bar: x from 10 to 390 in a 400-wide viewBox

  const T = Viz.t({
    zh: {
      code: 'ATTN_ROWS', title: '一个字这一步读哪些行', tag: '教学推演 · 行数和字节数按本页公式算',
      intro: '选一个上下文长度和压缩比 R，看<b>最后一个字</b>在一层里读哪些行。窗口环里的最近 128 行一定读；索引器再从压缩行里挑最多 512 行；每个头另有一个 sink 数，它不是行，不计入。上下文变长，压缩行 n 在涨，读的行数却停在 640。默认是 R = 1 的层、上下文 8,192，和上面的静态图一致。竖线的位置只是示意，实际由分数决定。',
      lgWin: '窗口：最近 128 行，来自环，不经过挑选', lgPick: '索引器挑的行（最多 512）', lgRest: '其余压缩行：这一步不读，但要一直留着',
      lCtx: '上下文长度 L（token）', lR: '压缩比 R（每 R 个位置一行；0 = 没有压缩行）',
      rBtn: (r) => (r === 0 ? 'R = 0 · 只有窗口' : r === 1 ? 'R = 1 · 20 到 39 层' : `R = ${r} · 画图用的例子`),
      stage: '一个解码字读的行：窗口、挑出的压缩行和其余压缩行',
      stripCap: (n, R) => (R === 0 ? 'R = 0：没有压缩行，只读窗口' : `压缩行 n = ${n}（左旧右新）`),
      barCap: '这一步读的行（整条 = 上限 640）',
      barTxt: (w, p, t) => `窗口 ${w} + 挑选 ${p} = ${t}`,
      sReadK: '这一步读的行（每层）', sReadF: (w, p) => `<b>= 窗口 min(128, L) + 挑选 min(512, n)</b><br>= ${w} + ${p}；上限 128 + 512 = 640`,
      sScanK: '索引器要打分的行数 n',
      sScanF: (R, keys, macs, pairs) => R === 0
        ? '<b>R = 0 的层没有压缩行，也没有索引器</b>'
        : `<b>n = ⌊L ÷ R⌋</b>；每步读索引键 n × 80 B = ${keys}，做 n × 32 × 128 = ${macs} 次乘加<br>读完整段提示共 ${pairs} 对打分`,
      sBytesK: '每层每步从缓存读多少字节', sBytesF: (w, p, all) => `<b>= ${w} × 528 + ${p} × 288</b>（窗口 FP8，压缩行 FP4）${all}`,
      sBytesAll: (b) => `<br>40 层都有压缩行时，一步最多 ${b}`,
      sStateK: '一个字留下的状态（窗口环）',
      sStateF: (src, srcRows, naive) => `<b>= 40 层 × 128 × 528 B</b>，和 L、R 都无关<br>压缩行另算：一个来源层 ${srcRows} 行 × 368 B = ${src}<br>朴素做法（40 层每位置存一行 FP8）要 ${naive}`,
      rows: (n) => `${n} 行`, none: '没有',
      b: (x) => `${x} B`, kib: (x) => `${x} KiB`, mib: (x) => `${x} MiB`, gib: (x) => `${x} GiB`,
      ready: '<span class="c">$</span> 拖动上下文长度，或切换 R',
      l1: (L, R, n) => `<span class="c">[1] 压缩行</span>：${R === 0 ? 'R = 0，没有压缩行' : `n = ⌊${L} ÷ ${R}⌋ = ${n}`}`,
      l2: (n, p, all) => `<span class="m">[2] 挑选</span>：min(512, ${n}) = ${p}${n > 0 && all ? '（n 不超过 512，全选）' : ''}`,
      l3: (L, w, p, t) => `<span class="w">[3] 读取</span>：窗口 min(128, ${L}) = ${w}，共 ${w} + ${p} = ${t} 行`,
      verdict: (t, n, R, rest) => R === 0
        ? `① 这一层 R = 0：只读窗口环里的 ${t} 行，没有压缩行可挑。<br>② 它的状态只有 40 层共约 2.58 MiB 的环，和上下文长度无关。`
        : `① 这一步读 <b>${t}</b> 行，最多 640：上下文再长，读的行也不再增加。<br>② 压缩行 n = <b>${n}</b> 在随上下文涨，索引器要给它们全部打分；${rest}<br>③ 128 个字之前的位置，只靠压缩行留下来。`,
      restFull: 'n 不超过 512，挑选就是全选。', restPick: '挑选只留下其中 512 行，其余这一步不读，但要一直存着。',
      tryList: [
        '把上下文从 <b>8,192</b> 拉到 <b>1,048,576</b>：读的行数不动，压缩行 n 和索引器的扫描量涨了 128 倍。',
        '拉到 <b>300</b>：n 不到 512，索引器全选，读 428 行，比 640 少。',
        '点 <b>R = 4</b>：n 变成 L 的四分之一，一个来源层要存的行也少到约四分之一，读的行数仍是 640。',
      ],
    },
    en: {
      code: 'ATTN_ROWS', title: 'Which rows one token reads at this step', tag: 'Teaching estimate · rows and bytes by this page’s formulas',
      intro: 'Pick a context length and a compression ratio R, and see which rows the <b>last token</b> reads in one layer. The latest 128 rows in the window ring are always read; the indexer then picks at most 512 rows from the compressed rows; each head also has a sink number, which is not a row and is not counted. As the context grows, the compressed rows n grow, but the rows read stop at 640. The default is a layer with R = 1 and context 8,192, matching the static figure above. The position of the lines is only illustrative; the real positions depend on the scores.',
      lgWin: 'Window: last 128 rows, from the ring, not picked', lgPick: 'Rows picked by the indexer (at most 512)', lgRest: 'Other compressed rows: not read now, but always kept',
      lCtx: 'Context length L (tokens)', lR: 'Compression ratio R (one row per R positions; 0 = no compressed rows)',
      rBtn: (r) => (r === 0 ? 'R = 0 · window only' : r === 1 ? 'R = 1 · layers 20 to 39' : `R = ${r} · drawing example`),
      stage: 'Rows read by one decoding token: window, picked compressed rows and other compressed rows',
      stripCap: (n, R) => (R === 0 ? 'R = 0: no compressed rows, window only' : `Compressed rows n = ${n} (old left, new right)`),
      barCap: 'Rows read at this step (full bar = cap 640)',
      barTxt: (w, p, t) => `Window ${w} + picked ${p} = ${t}`,
      sReadK: 'Rows read at this step (per layer)', sReadF: (w, p) => `<b>= window min(128, L) + picked min(512, n)</b><br>= ${w} + ${p}; cap 128 + 512 = 640`,
      sScanK: 'Rows the indexer must score, n',
      sScanF: (R, keys, macs, pairs) => R === 0
        ? '<b>A layer with R = 0 has no compressed rows and no indexer</b>'
        : `<b>n = ⌊L ÷ R⌋</b>; each step reads index keys n × 80 B = ${keys} and does n × 32 × 128 = ${macs} multiply-adds<br>Reading the whole prompt takes ${pairs} scored pairs`,
      sBytesK: 'Bytes read from the cache per layer per step', sBytesF: (w, p, all) => `<b>= ${w} × 528 + ${p} × 288</b> (window FP8, compressed rows FP4)${all}`,
      sBytesAll: (b) => `<br>With compressed rows in all 40 layers, at most ${b} per step`,
      sStateK: 'State a token leaves (window ring)',
      sStateF: (src, srcRows, naive) => `<b>= 40 layers × 128 × 528 B</b>, independent of L and R<br>Compressed rows are separate: one source layer ${srcRows} rows × 368 B = ${src}<br>The naive way (40 layers, one FP8 row per position) needs ${naive}`,
      rows: (n) => `${n} rows`, none: 'none',
      b: (x) => `${x} B`, kib: (x) => `${x} KiB`, mib: (x) => `${x} MiB`, gib: (x) => `${x} GiB`,
      ready: '<span class="c">$</span> Drag the context length, or switch R',
      l1: (L, R, n) => `<span class="c">[1] Compressed rows</span>: ${R === 0 ? 'R = 0, no compressed rows' : `n = ⌊${L} ÷ ${R}⌋ = ${n}`}`,
      l2: (n, p, all) => `<span class="m">[2] Pick</span>: min(512, ${n}) = ${p}${n > 0 && all ? ' (n is at most 512, pick all)' : ''}`,
      l3: (L, w, p, t) => `<span class="w">[3] Read</span>: window min(128, ${L}) = ${w}, so ${w} + ${p} = ${t} rows`,
      verdict: (t, n, R, rest) => R === 0
        ? `① This layer has R = 0: it reads only ${t} rows of the window ring, with no compressed rows to pick.<br>② Its state is only the rings of 40 layers, about 2.58 MiB in total, independent of context length.`
        : `① This step reads <b>${t}</b> rows, at most 640: a longer context adds no more rows.<br>② The compressed rows n = <b>${n}</b> grow with the context, and the indexer must score all of them; ${rest}<br>③ Positions older than 128 tokens survive only as compressed rows.`,
      restFull: 'n is at most 512, so picking means picking all.', restPick: 'picking keeps only 512 of them; the rest are not read at this step, but must always be stored.',
      tryList: [
        'Drag the context from <b>8,192</b> to <b>1,048,576</b>: the rows read do not move, while the compressed rows n and the indexer scan grow 128 times.',
        'Drag to <b>300</b>: n is below 512, so the indexer picks all, and 428 rows are read, fewer than 640.',
        'Click <b>R = 4</b>: n becomes a quarter of L, the rows a source layer must store also drop to about a quarter, and the rows read are still 640.',
      ],
    },
    ja: {
      code: 'ATTN_ROWS', title: '1 トークンがこのステップで読む行', tag: '教育用の試算 · 行数とバイト数は本ページの式で計算',
      intro: '文脈の長さと圧縮比 R を選ぶと、<b>最後のトークン</b>が 1 つの層で読む行が分かります。ウィンドウリングの直近 128 行は必ず読みます。インデクサーが圧縮行から最大 512 行を選びます。各ヘッドには sink の値が別に 1 つありますが、行ではないので数えません。文脈が長くなると圧縮行 n は増えますが、読む行数は 640 で止まります。既定は R = 1 の層、文脈 8,192 で、上の静的な図と同じです。縦線の位置は目安で、実際はスコアで決まります。',
      lgWin: 'ウィンドウ：直近 128 行。リングから来て、選択を通らない', lgPick: 'インデクサーが選んだ行（最大 512）', lgRest: 'その他の圧縮行：このステップでは読まないが、ずっと保持する',
      lCtx: '文脈の長さ L（トークン）', lR: '圧縮比 R（R 個の位置につき 1 行。0 = 圧縮行なし）',
      rBtn: (r) => (r === 0 ? 'R = 0 · ウィンドウのみ' : r === 1 ? 'R = 1 · 20〜39 層' : `R = ${r} · 作図用の例`),
      stage: '1 つのデコードトークンが読む行：ウィンドウ、選ばれた圧縮行、その他の圧縮行',
      stripCap: (n, R) => (R === 0 ? 'R = 0：圧縮行なし。ウィンドウのみ読む' : `圧縮行 n = ${n}（左が古く右が新しい）`),
      barCap: 'このステップで読む行（全体 = 上限 640）',
      barTxt: (w, p, t) => `ウィンドウ ${w} + 選択 ${p} = ${t}`,
      sReadK: 'このステップで読む行（層ごと）', sReadF: (w, p) => `<b>= ウィンドウ min(128, L) + 選択 min(512, n)</b><br>= ${w} + ${p}。上限は 128 + 512 = 640`,
      sScanK: 'インデクサーが採点する行数 n',
      sScanF: (R, keys, macs, pairs) => R === 0
        ? '<b>R = 0 の層には圧縮行もインデクサーもありません</b>'
        : `<b>n = ⌊L ÷ R⌋</b>。1 ステップごとに索引キー n × 80 B = ${keys} を読み、n × 32 × 128 = ${macs} 回の積和を行う<br>プロンプトを読み終えるまでに、合計 ${pairs} 組の採点`,
      sBytesK: '1 層・1 ステップでキャッシュから読むバイト数', sBytesF: (w, p, all) => `<b>= ${w} × 528 + ${p} × 288</b>（ウィンドウは FP8、圧縮行は FP4）${all}`,
      sBytesAll: (b) => `<br>40 層すべてに圧縮行があると、1 ステップで最大 ${b}`,
      sStateK: '1 トークンが残す状態（ウィンドウリング）',
      sStateF: (src, srcRows, naive) => `<b>= 40 層 × 128 × 528 B</b>。L にも R にも関係なし<br>圧縮行は別勘定：ソース層 1 つ ${srcRows} 行 × 368 B = ${src}<br>素朴な方法（40 層が位置ごとに FP8 を 1 行保存）では ${naive}`,
      rows: (n) => `${n} 行`, none: 'なし',
      b: (x) => `${x} B`, kib: (x) => `${x} KiB`, mib: (x) => `${x} MiB`, gib: (x) => `${x} GiB`,
      ready: '<span class="c">$</span> 文脈の長さをドラッグするか、R を切り替えてください',
      l1: (L, R, n) => `<span class="c">[1] 圧縮行</span>：${R === 0 ? 'R = 0、圧縮行なし' : `n = ⌊${L} ÷ ${R}⌋ = ${n}`}`,
      l2: (n, p, all) => `<span class="m">[2] 選択</span>：min(512, ${n}) = ${p}${n > 0 && all ? '（n は 512 以下、全選択）' : ''}`,
      l3: (L, w, p, t) => `<span class="w">[3] 読み取り</span>：ウィンドウ min(128, ${L}) = ${w}、合計 ${w} + ${p} = ${t} 行`,
      verdict: (t, n, R, rest) => R === 0
        ? `① この層は R = 0：ウィンドウリングの ${t} 行だけを読み、選べる圧縮行はありません。<br>② 状態は 40 層で約 2.58 MiB のリングだけで、文脈の長さに関係しません。`
        : `① このステップで読むのは <b>${t}</b> 行で、最大 640 です。文脈がさらに長くなっても、読む行は増えません。<br>② 圧縮行 n = <b>${n}</b> は文脈とともに増え、インデクサーはそのすべてを採点します。${rest}<br>③ 128 トークンより前の位置は、圧縮行としてしか残りません。`,
      restFull: 'n は 512 以下なので、選択は全選択です。', restPick: '選択はそのうち 512 行だけを残します。残りはこのステップでは読みませんが、ずっと保存しておきます。',
      tryList: [
        '文脈を <b>8,192</b> から <b>1,048,576</b> まで引き上げる：読む行数は変わらず、圧縮行 n とインデクサーの走査量が 128 倍になります。',
        '<b>300</b> まで引き下げる：n が 512 未満なのでインデクサーは全選択し、読むのは 428 行で、640 より少なくなります。',
        '<b>R = 4</b> を押す：n は L の 4 分の 1 になり、ソース層 1 つが保存する行も約 4 分の 1 に減りますが、読む行数は 640 のままです。',
      ],
    },
    ko: {
      code: 'ATTN_ROWS', title: '토큰 하나가 이번 단계에 읽는 행', tag: '교육용 추정 · 행 수와 바이트 수는 이 페이지의 공식으로 계산',
      intro: '컨텍스트 길이와 압축비 R을 고르고, <b>마지막 토큰</b>이 한 층에서 어떤 행을 읽는지 보세요. 윈도 링의 최근 128행은 반드시 읽어요. 인덱서가 압축 행에서 최대 512행을 더 골라요. 헤드마다 sink 숫자가 하나 더 있지만 행이 아니라서 세지 않아요. 컨텍스트가 길어지면 압축 행 n은 늘어나는데, 읽는 행 수는 640에서 멈춰요. 기본값은 R = 1인 층, 컨텍스트 8,192로 위의 정적 그림과 같아요. 세로선 위치는 설명용이고, 실제로는 점수가 정해요.',
      lgWin: '윈도: 최근 128행, 링에서 오고 선택을 거치지 않음', lgPick: '인덱서가 고른 행(최대 512)', lgRest: '나머지 압축 행: 이번 단계엔 안 읽지만 계속 보관',
      lCtx: '컨텍스트 길이 L(토큰)', lR: '압축비 R(R개 위치마다 1행, 0 = 압축 행 없음)',
      rBtn: (r) => (r === 0 ? 'R = 0 · 윈도만' : r === 1 ? 'R = 1 · 20~39층' : `R = ${r} · 그림용 예시`),
      stage: '디코드 토큰 하나가 읽는 행: 윈도, 골라낸 압축 행, 나머지 압축 행',
      stripCap: (n, R) => (R === 0 ? 'R = 0: 압축 행 없음, 윈도만 읽음' : `압축 행 n = ${n}(왼쪽 옛것, 오른쪽 새것)`),
      barCap: '이번 단계에 읽는 행(막대 전체 = 상한 640)',
      barTxt: (w, p, t) => `윈도 ${w} + 선택 ${p} = ${t}`,
      sReadK: '이번 단계에 읽는 행(층당)', sReadF: (w, p) => `<b>= 윈도 min(128, L) + 선택 min(512, n)</b><br>= ${w} + ${p}, 상한 128 + 512 = 640`,
      sScanK: '인덱서가 점수를 매길 행 수 n',
      sScanF: (R, keys, macs, pairs) => R === 0
        ? '<b>R = 0인 층은 압축 행도 인덱서도 없음</b>'
        : `<b>n = ⌊L ÷ R⌋</b>, 단계마다 인덱스 키 n × 80 B = ${keys} 읽고 n × 32 × 128 = ${macs}번 곱셈-덧셈<br>프롬프트 전체를 읽으면 채점 ${pairs}쌍`,
      sBytesK: '층당 단계마다 캐시에서 읽는 바이트', sBytesF: (w, p, all) => `<b>= ${w} × 528 + ${p} × 288</b>(윈도 FP8, 압축 행 FP4)${all}`,
      sBytesAll: (b) => `<br>40층 모두에 압축 행이 있으면 한 단계 최대 ${b}`,
      sStateK: '토큰 하나가 남기는 상태(윈도 링)',
      sStateF: (src, srcRows, naive) => `<b>= 40층 × 128 × 528 B</b>, L과 R에 상관없음<br>압축 행은 따로 계산: 소스 층 하나 ${srcRows}행 × 368 B = ${src}<br>단순한 방식(40층이 위치마다 FP8 한 행 저장)은 ${naive}`,
      rows: (n) => `${n}행`, none: '없음',
      b: (x) => `${x} B`, kib: (x) => `${x} KiB`, mib: (x) => `${x} MiB`, gib: (x) => `${x} GiB`,
      ready: '<span class="c">$</span> 컨텍스트 길이를 끌거나 R을 바꿔 보세요',
      l1: (L, R, n) => `<span class="c">[1] 압축 행</span>: ${R === 0 ? 'R = 0, 압축 행 없음' : `n = ⌊${L} ÷ ${R}⌋ = ${n}`}`,
      l2: (n, p, all) => `<span class="m">[2] 선택</span>: min(512, ${n}) = ${p}${n > 0 && all ? '(n이 512 이하라 전부 선택)' : ''}`,
      l3: (L, w, p, t) => `<span class="w">[3] 읽기</span>: 윈도 min(128, ${L}) = ${w}, 모두 ${w} + ${p} = ${t}행`,
      verdict: (t, n, R, rest) => R === 0
        ? `① 이 층은 R = 0이라 윈도 링의 ${t}행만 읽고, 고를 압축 행이 없어요.<br>② 상태는 40층 합계 약 2.58 MiB의 링뿐이고, 컨텍스트 길이와 상관없어요.`
        : `① 이번 단계에 읽는 행은 <b>${t}</b>개이고 최대 640개예요. 컨텍스트가 더 길어져도 읽는 행은 늘지 않아요.<br>② 압축 행 수 n = <b>${n}</b>. 이 수는 컨텍스트와 함께 늘고, 인덱서는 그 전부에 점수를 매겨야 해요. ${rest}<br>③ 128개 토큰보다 앞선 위치는 압축 행으로만 남아요.`,
      restFull: 'n이 512 이하라서 선택은 전부 선택이에요.', restPick: '선택은 그중 512행만 남기고, 나머지는 이번 단계에 읽지 않지만 계속 보관해요.',
      tryList: [
        '컨텍스트를 <b>8,192</b>에서 <b>1,048,576</b>까지 끌어 보세요. 읽는 행 수는 그대로인데, 압축 행 n과 인덱서의 스캔량은 128배로 늘어요.',
        '<b>300</b>까지 끌어 보세요. n이 512보다 작아서 인덱서가 전부 선택하고, 읽는 행은 428개로 640보다 적어요.',
        '<b>R = 4</b>를 눌러 보세요. n은 L의 4분의 1이 되고, 소스 층 하나가 저장할 행도 약 4분의 1로 줄어요. 읽는 행 수는 여전히 640이에요.',
      ],
    },
    es: {
      code: 'ATTN_ROWS', title: 'Qué filas lee un token en este paso', tag: 'Estimación didáctica · filas y bytes según las fórmulas de esta página',
      intro: 'Elige una longitud de contexto y una razón de compresión R, y mira qué filas lee <b>el último token</b> en una capa. Las últimas 128 filas del anillo de ventana se leen siempre; el indexer elige además como máximo 512 filas comprimidas; cada cabeza tiene también un número sink, que no es una fila y no cuenta. Al alargar el contexto, las filas comprimidas n crecen, pero las filas leídas se quedan en 640. Por defecto: capa con R = 1 y contexto 8.192, igual que el gráfico estático de arriba. La posición de las rayas es solo ilustrativa; la decide la puntuación.',
      lgWin: 'Ventana: últimas 128 filas, salen del anillo sin selección', lgPick: 'Filas elegidas por el indexer (máximo 512)', lgRest: 'Resto de filas comprimidas: no se leen ahora, pero siempre se guardan',
      lCtx: 'Longitud de contexto L (tokens)', lR: 'Razón de compresión R (una fila cada R posiciones; 0 = sin filas comprimidas)',
      rBtn: (r) => (r === 0 ? 'R = 0 · solo ventana' : r === 1 ? 'R = 1 · capas 20 a 39' : `R = ${r} · ejemplo del dibujo`),
      stage: 'Filas que lee un token de decode: ventana, filas comprimidas elegidas y resto de filas comprimidas',
      stripCap: (n, R) => (R === 0 ? 'R = 0: sin filas comprimidas, solo ventana' : `Comprimidas n = ${n} (antiguas ← → nuevas)`),
      barCap: 'Filas leídas en este paso (barra = tope 640)',
      barTxt: (w, p, t) => `Ventana ${w} + elegidas ${p} = ${t}`,
      sReadK: 'Filas leídas en este paso (por capa)', sReadF: (w, p) => `<b>= ventana min(128, L) + elegidas min(512, n)</b><br>= ${w} + ${p}; tope 128 + 512 = 640`,
      sScanK: 'Filas que debe puntuar el indexer: n',
      sScanF: (R, keys, macs, pairs) => R === 0
        ? '<b>Una capa con R = 0 no tiene filas comprimidas ni indexer</b>'
        : `<b>n = ⌊L ÷ R⌋</b>; cada paso lee claves de índice n × 80 B = ${keys} y hace n × 32 × 128 = ${macs} multiplicaciones-sumas<br>Leer todo el prompt son ${pairs} pares de puntuación`,
      sBytesK: 'Bytes leídos de la caché por capa y paso', sBytesF: (w, p, all) => `<b>= ${w} × 528 + ${p} × 288</b> (ventana FP8, filas comprimidas FP4)${all}`,
      sBytesAll: (b) => `<br>Con filas comprimidas en las 40 capas, un paso lee como máximo ${b}`,
      sStateK: 'Estado que deja un token (anillo de ventana)',
      sStateF: (src, srcRows, naive) => `<b>= 40 capas × 128 × 528 B</b>, no depende de L ni de R<br>Las filas comprimidas se cuentan aparte: una capa fuente ${srcRows} filas × 368 B = ${src}<br>La forma ingenua (40 capas con una fila FP8 por posición) necesita ${naive}`,
      rows: (n) => `${n} filas`, none: 'ninguna',
      b: (x) => `${x} B`, kib: (x) => `${x} KiB`, mib: (x) => `${x} MiB`, gib: (x) => `${x} GiB`,
      ready: '<span class="c">$</span> arrastra la longitud de contexto o cambia R',
      l1: (L, R, n) => `<span class="c">[1] filas comprimidas</span>: ${R === 0 ? 'R = 0, sin filas comprimidas' : `n = ⌊${L} ÷ ${R}⌋ = ${n}`}`,
      l2: (n, p, all) => `<span class="m">[2] selección</span>: min(512, ${n}) = ${p}${n > 0 && all ? ' (n no pasa de 512: se eligen todas)' : ''}`,
      l3: (L, w, p, t) => `<span class="w">[3] lectura</span>: ventana min(128, ${L}) = ${w}, en total ${w} + ${p} = ${t} filas`,
      verdict: (t, n, R, rest) => R === 0
        ? `① Esta capa tiene R = 0: solo lee ${t} filas del anillo de ventana y no hay filas comprimidas que elegir.<br>② Su estado es solo el anillo, unos 2,58 MiB en las 40 capas, y no depende de la longitud del contexto.`
        : `① En este paso se leen <b>${t}</b> filas, con un máximo de 640: aunque el contexto sea más largo, las filas leídas ya no aumentan.<br>② Las filas comprimidas n = <b>${n}</b> crecen con el contexto y el indexer debe puntuarlas todas; ${rest}<br>③ Las posiciones anteriores a los últimos 128 tokens solo se conservan en las filas comprimidas.`,
      restFull: 'como n no pasa de 512, se eligen todas.', restPick: 'la selección conserva solo 512 y las demás no se leen en este paso, pero se guardan siempre.',
      tryList: [
        'Lleva el contexto de <b>8.192</b> a <b>1.048.576</b>: las filas leídas no cambian, y las filas comprimidas n y el recorrido del indexer se multiplican por 128.',
        'Llévalo a <b>300</b>: n no llega a 512, el indexer elige todas y se leen 428 filas, menos que 640.',
        'Pulsa <b>R = 4</b>: n pasa a ser la cuarta parte de L, las filas que guarda una capa fuente bajan a casi la cuarta parte, y las filas leídas siguen siendo 640.',
      ],
    },
    ar: {
      code: 'ATTN_ROWS', title: 'أي الصفوف يقرأها الرمز في هذه الخطوة', tag: 'تقدير تعليمي · أعداد الصفوف والبايتات بحسب صيغ هذه الصفحة',
      intro: 'اختر طول السياق ونسبة الضغط R، ثم انظر أي الصفوف يقرأها <b>الرمز الأخير</b> في طبقة واحدة. آخر 128 صفًّا في حلقة النافذة تُقرأ دائمًا؛ ثم يختار المُفهرِس (indexer) من الصفوف المضغوطة ما يصل إلى 512 صفًّا؛ ولكل رأس رقم sink وهو ليس صفًّا، فلا يُحسب. كلما طال السياق ازداد عدد الصفوف المضغوطة n، ويبقى عدد الصفوف المقروءة عند 640. الإعداد الافتراضي طبقة R = 1 وسياق 8,192، وهو يطابق الشكل الثابت أعلاه. موضع الخطوط العمودية للتوضيح فقط، والدرجات هي التي تحدد الاختيار فعليًّا.',
      lgWin: 'النافذة: آخر 128 صفًّا من الحلقة، دون اختيار', lgPick: 'صفوف يختارها المُفهرِس (حتى 512)', lgRest: 'بقية الصفوف المضغوطة: لا تُقرأ الآن، لكنها تبقى',
      lCtx: 'طول السياق L (رموز)', lR: 'نسبة الضغط R (صف لكل R موضعًا؛ 0 = لا صفوف مضغوطة)',
      rBtn: (r) => (r === 0 ? 'R = 0 · النافذة فقط' : r === 1 ? 'R = 1 · الطبقات 20 إلى 39' : `R = ${r} · مثال للرسم`),
      stage: 'الصفوف التي يقرأها رمز فك الترميز: النافذة والصفوف المضغوطة المختارة وبقية الصفوف المضغوطة',
      stripCap: (n, R) => (R === 0 ? 'R = 0: لا صفوف مضغوطة، النافذة فقط' : `الصفوف المضغوطة n = ${n} (القديم يسارًا)`),
      barCap: 'الصفوف المقروءة في هذه الخطوة (الشريط كله = الحد 640)',
      barTxt: (w, p, t) => `النافذة ${w} + المختارة ${p} = ${t}`,
      sReadK: 'الصفوف المقروءة في هذه الخطوة (لكل طبقة)', sReadF: (w, p) => `<b>= النافذة min(128, L) + المختارة min(512, n)</b><br>= ${w} + ${p}؛ والحد الأقصى 128 + 512 = 640`,
      sScanK: 'عدد الصفوف التي يقيّمها المُفهرِس n',
      sScanF: (R, keys, macs, pairs) => R === 0
        ? '<b>الطبقة التي R = 0 فيها لا صفوف مضغوطة فيها ولا مُفهرِس</b>'
        : `<b>n = ⌊L ÷ R⌋</b>؛ في كل خطوة تُقرأ مفاتيح الفهرسة n × 80 B = ${keys}، وتجري n × 32 × 128 = ${macs} عملية ضرب وجمع<br>وقراءة المُطالبة كاملة تتطلب ${pairs} زوج تقييم`,
      sBytesK: 'البايتات المقروءة من الذاكرة المؤقتة لكل طبقة في كل خطوة', sBytesF: (w, p, all) => `<b>= ${w} × 528 + ${p} × 288</b> (النافذة FP8، والصفوف المضغوطة FP4)${all}`,
      sBytesAll: (b) => `<br>إذا كانت الطبقات الأربعون كلها فيها صفوف مضغوطة فالحد الأقصى للخطوة ${b}`,
      sStateK: 'الحالة التي يتركها الرمز (حلقة النافذة)',
      sStateF: (src, srcRows, naive) => `<b>= 40 طبقة × 128 × 528 B</b>، ولا يتعلق بـ L ولا بـ R<br>الصفوف المضغوطة تُحسب على حدة: طبقة مصدر واحدة ${srcRows} صفًّا × 368 B = ${src}<br>والطريقة الساذجة (40 طبقة، صف FP8 لكل موضع) تحتاج ${naive}`,
      rows: (n) => `صفوف: ${n}`, none: 'لا شيء',
      b: (x) => `${x} B`, kib: (x) => `${x} KiB`, mib: (x) => `${x} MiB`, gib: (x) => `${x} GiB`,
      ready: '<span class="c">$</span> حرّك طول السياق، أو بدّل R',
      l1: (L, R, n) => `<span class="c">[1] الصفوف المضغوطة</span>: ${R === 0 ? 'R = 0، لا صفوف مضغوطة' : `n = ⌊${L} ÷ ${R}⌋ = ${n}`}`,
      l2: (n, p, all) => `<span class="m">[2] الاختيار</span>: min(512, ${n}) = ${p}${n > 0 && all ? ' (n لا يزيد على 512، فتُختار كلها)' : ''}`,
      l3: (L, w, p, t) => `<span class="w">[3] القراءة</span>: النافذة min(128, ${L}) = ${w}، فالمجموع ${w} + ${p} = ${t} صفًّا`,
      verdict: (t, n, R, rest) => R === 0
        ? `① في هذه الطبقة R = 0: لا يُقرأ إلا ${t} صفًّا من حلقة النافذة، ولا صفوف مضغوطة للاختيار.<br>② حالتها حلقات الطبقات الأربعين فقط، نحو 2.58 MiB، ولا تتعلق بطول السياق.`
        : `① تقرأ هذه الخطوة <b>${t}</b> صفًّا، والحد الأقصى 640: مهما طال السياق لا يزيد عدد الصفوف المقروءة.<br>② الصفوف المضغوطة n = <b>${n}</b> تنمو مع السياق، وعلى المُفهرِس أن يقيّمها كلها؛ ${rest}<br>③ المواضع الأقدم من 128 رمزًا لا يبقى منها إلا الصفوف المضغوطة.`,
      restFull: 'n لا يزيد على 512، فالاختيار هو اختيار الكل.', restPick: 'لا يبقى من الاختيار إلا 512 صفًّا، وبقيتها لا تُقرأ في هذه الخطوة لكنها تبقى مخزَّنة.',
      tryList: [
        'اسحب السياق من <b>8,192</b> إلى <b>1,048,576</b>: عدد الصفوف المقروءة لا يتغير، أما الصفوف المضغوطة n وحجم مسح المُفهرِس فيزيدان 128 مرة.',
        'اسحبه إلى <b>300</b>: n أقل من 512، فيختار المُفهرِس الكل، وتُقرأ 428 صفًّا، أي أقل من 640.',
        'اضغط <b>R = 4</b>: يصبح n ربع L، ويقل عدد الصفوف التي تخزّنها طبقة المصدر إلى نحو الربع، ويبقى عدد الصفوف المقروءة 640.',
      ],
    },
  });

  const ctl = (label, cls, min, max, step, val) => `<div class="viz-slider" style="grid-template-columns:minmax(0,1fr) auto;min-width:0"><label style="grid-column:1/-1;white-space:normal;min-width:0">${label}</label><input class="${cls}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${Viz.esc(label)}"><output style="min-width:0"></output></div>`;
  // Size goes into the inline style too: a page-wide rule shrinks widget svg text to 10px.
  const txt = (svg, x, y, s, extra = {}) => {
    const size = extra['font-size'] || 13;
    const t = Viz.svg('text', { x, y, 'font-size': size, ...extra }, svg);
    t.textContent = s;
    t.setAttribute('style', `${extra.style || 'fill:var(--ink)'};font-size:${size}px`);
    return t;
  };
  const bytesText = (b) => {
    if (b >= 1073741824) return T.gib(Viz.fmt(b / 1073741824, b / 1073741824 < 10 ? 2 : 1));
    if (b >= 1048576) return T.mib(Viz.fmt(b / 1048576, b / 1048576 < 10 ? 2 : b / 1048576 < 100 ? 1 : 0));
    if (b >= 1024) return T.kib(Viz.fmt(b / 1024, 1));
    return T.b(Viz.fmt(b));
  };
  const sci = (x) => {
    if (x < 1e6) return Viz.fmt(x);
    const e = Math.floor(Math.log10(x));
    return `${Viz.fmt(x / 10 ** e, 1)} × 10<sup>${e}</sup>`;
  };

  Viz.register('ds-attention-state', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgWin, glow: true },
        { color: 'var(--a3)', text: T.lgPick },
        { color: 'var(--side)', text: T.lgRest },
      ]) + '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 400 142', class: 'viz-stage', role: 'img', 'aria-label': T.stage }, left);
      left.insertAdjacentHTML('beforeend',
        ctl(T.lCtx, 'a-len', 0, LENS.length - 1, 1, LENS.indexOf(M.DEFAULTS.ctx)) +
        `<div style="font-size:14px;margin-top:14px">${T.lR}</div>` +
        `<div class="viz-row a-r" style="margin-top:6px">${RS.map(r => Viz.button(T.rBtn(r), 'ghost')).join('')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'a-read', k: T.sReadK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'a-scan', k: T.sScanK, v: '', f: '' }) +
        Viz.stat({ id: 'a-bytes', k: T.sBytesK, v: '', f: '' }) +
        Viz.stat({ id: 'a-state', k: T.sStateK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.tryList));
      const $ = s => el.querySelector(s);
      const rBtns = [...el.querySelectorAll('.a-r .viz-btn')];
      const put = (id, v, f) => { $(`[data-s=${id}-v]`).innerHTML = v; $(`[data-s=${id}-f]`).innerHTML = f; };
      let R = M.DEFAULTS.R;
      // Bar segments keep their elements, so a width change can animate unless the reader prefers reduced motion.
      const mk = (tag, attrs, style) => { const e = Viz.svg(tag, attrs, svg); e.setAttribute('style', style + (ctx.reduced ? '' : ';transition:width .25s')); return e; };
      const cap = txt(svg, X0, 16, '');
      mk('rect', { x: X0, y: 24, width: W, height: 30 }, 'fill:var(--side);stroke:var(--frame)');
      const picksFill = mk('rect', { x: X0, y: 24, width: W, height: 30 }, 'fill:var(--a3);opacity:.45');
      const picksPath = Viz.svg('path', { d: '', fill: 'none', 'stroke-width': 1.4 }, svg);
      picksPath.setAttribute('style', 'stroke:var(--a3)');
      const winRect = mk('rect', { x: X0 + W - 5, y: 22, width: 5, height: 34 }, 'fill:var(--accent)');
      txt(svg, X0, 82, T.barCap);
      mk('rect', { x: X0, y: 90, width: W, height: 26 }, 'fill:none;stroke:var(--frame);stroke-dasharray:4 3');
      const segW = mk('rect', { x: X0, y: 90, width: 0, height: 26 }, 'fill:var(--accent)');
      const segP = mk('rect', { x: X0, y: 90, width: 0, height: 26 }, 'fill:var(--a3)');
      const barTxt = txt(svg, X0, 136, '', { style: 'fill:var(--ink);font-weight:700', 'font-size': 14 });

      function update() {
        const L = LENS[+$('.a-len').value];
        const r = M.readState(L, R), sc = M.indexerScan(L, R), ks = M.keptState(L, R);
        $('.a-len + output').textContent = Viz.fmt(L);
        $('.a-len').setAttribute('aria-valuetext', Viz.fmt(L));
        rBtns.forEach((b, i) => { b.className = 'viz-btn' + (RS[i] === R ? '' : ' ghost'); b.setAttribute('aria-pressed', String(RS[i] === R)); });
        cap.textContent = T.stripCap(Viz.fmt(r.n), R);
        const all = r.n > 0 && r.n <= M.TOPK;
        picksFill.setAttribute('width', all ? W : 0);
        picksPath.setAttribute('d', !all && r.picked > 0
          ? M.pickPositions(r.n, r.picked).map(i => `M${(X0 + (i + 0.5) / r.n * W).toFixed(1)} 24V54`).join('') : '');
        const ww = Math.max(5, W * r.window / L);
        winRect.setAttribute('width', ww); winRect.setAttribute('x', X0 + W - ww);
        segW.setAttribute('width', W * r.window / M.MAX_ROWS_PER_LAYER);
        segP.setAttribute('x', X0 + W * r.window / M.MAX_ROWS_PER_LAYER);
        segP.setAttribute('width', W * r.picked / M.MAX_ROWS_PER_LAYER);
        barTxt.textContent = T.barTxt(r.window, r.picked, r.total);
        put('a-read', T.rows(Viz.fmt(r.total)), T.sReadF(r.window, r.picked));
        put('a-scan', R === 0 ? T.none : T.rows(Viz.fmt(sc.rows)),
          T.sScanF(R, bytesText(sc.keyBytes), sci(sc.macs), sci(M.promptPairs(L, R))));
        put('a-bytes', bytesText(r.bytes), T.sBytesF(r.window, r.picked, R > 0 ? T.sBytesAll(bytesText(M.stepBytesPerLayer() * M.LAYERS)) : ''));
        put('a-state', bytesText(ks.ringBytes), T.sStateF(R === 0 ? T.none : bytesText(ks.sourceBytes), Viz.fmt(ks.sourceRows), bytesText(ks.naiveBytes)));
        term.clear();
        term.log(T.l1(Viz.fmt(L), R, Viz.fmt(r.n)));
        term.log(T.l2(Viz.fmt(r.n), Viz.fmt(r.picked), all));
        term.log(T.l3(Viz.fmt(L), r.window, Viz.fmt(r.picked), Viz.fmt(r.total)));
        $('.viz-verdict').innerHTML = T.verdict(Viz.fmt(r.total), Viz.fmt(r.n), R, all ? T.restFull : T.restPick);
      }
      el.querySelectorAll('input').forEach(i => { i.oninput = update; i.onchange = update; });
      rBtns.forEach((b, i) => { b.onclick = () => { R = RS[i]; update(); }; });
      update();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
