/* DeepSeek column, page experts, section 2.5: Full (6 experts per word) against Faster (5).
   All visible text lives in the T table below (zh is the master). Numbers come from ds-experts-faster.math.js. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsExpertsFaster;

  const T = Viz.t({
    zh: {
      code: 'EXPERTS_FASTER', title: '每字少用一个专家，省下多少搬运', tag: '教学推演 · 专家大小与规则取自本页',
      intro: '模型每写一个字选 6 个专家（Full），Faster 档只取前 5 个。选一个文件集，再拖动<b>单卡空闲显存</b>：显存里放得下的专家在卡上算，不用搬；其余的要从<b>内存槽位或 SSD</b> 读。图里两条横条等比，都按 Full 的总字节画。教学假设：每个专家被选中的机会均等，所以“在显存里的比例”就是“不用搬的比例”。真实引擎按热度从热到冷填充，实际会比这里更好。',
      lgOff: '内存槽位或 SSD 要读的字节', lgOn: '常驻显存、在卡上算的字节',
      setLabel: '文件集', sets: { q8: 'UD-Q8_K_XL（18.8 MB/个）', bit2: '2 比特集（8.6 MB/个）' },
      memLabel: '单卡空闲显存', memAria: '单卡空闲显存，单位 GiB',
      gib: (g) => `${g} GiB`,
      bFull: (k) => `Full：${k} 个专家`, bFaster: (k) => `Faster：${k} 个专家`,
      mb: (x) => `${x} MB`,
      barTotal: (x) => `共 ${x} MB`,
      axis: '深色 = 从内存槽位或 SSD 读；浅色 = 常驻显存',
      sShareK: '常驻显存的专家占比',
      sShareV: (p) => `${p}%`,
      sShareF: (n, total, p) => `<b>= ${n} ÷ ${total} = ${p}%</b><br>能放进显存的整个专家数 ÷ 15,360`,
      sBudgetK: '这张卡的专家预算',
      sBudgetV: (g) => `${g} GB`,
      sBudgetF: (free, n, sz) => `<b>=（${free} GiB × 1024 − 600 MiB 预留）× 1.0</b><br>÷ ${sz} MB/个，向下取整 = ${n} 个专家（集成显卡的额外预留和换入空槽这里不计）`,
      sFullK: 'Full 每字要从内存或 SSD 读',
      sFullV: (x) => `${x} MB`,
      sFullF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − 常驻比例) = ${off}% 不在显存</b><br>先算每字专家总字节，再乘上不在显存的份额`,
      sFastK: 'Faster 每字要从内存或 SSD 读',
      sFastV: (x) => `${x} MB`,
      sFastF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − 常驻比例) = ${off}% 不在显存</b><br>名单短一格，其余算法相同`,
      sSaveK: 'Faster 省下的搬运',
      sSaveV: (mb, pct) => `${mb} MB（${pct}%）`,
      sSaveF: (sz) => `<b>= 少选的 1 个专家 × ${sz} MB × 不在显存的份额</b><br>个数之比永远是 −1 ÷ 6 ≈ −16.7%；没有要搬的字节时，没有可省的`,
      verdictOff: (full, fast, saved) => `这个显存下，Full 每字要从内存或 SSD 读 <b>${full} MB</b>，Faster 是 <b>${fast} MB</b>，省下 <b>${saved} MB</b>。省的是搬运：常驻显存的专家，5 个和 6 个都在卡上算。`,
      verdictAll: '这个显存装得下全部专家：每字不用从内存或 SSD 读任何东西，Faster 没有搬运可省。它仍然少算一个专家，但那不是这张图量的东西。',
      try: [
        '把显存拖到 <b>0 GiB</b>：和上面那张静态图一样，6 个专家 112.8 MB，5 个 94 MB，省 18.8 MB。这是“6 个都不常驻”的上限账单。',
        '拖到 <b>12 GiB</b>（一台普通电脑的量级）：只有约 4% 的专家放得下，账单几乎没变，Faster 照样省约六分之一。显存小的机器，Faster 的好处最大。',
        '拖到 <b>270 GiB</b> 以上：全部专家常驻，两条横条都变成浅色，省下的搬运变成 0。再切到 <b>2 比特集</b>，同样的显存装得下更多专家，每字要读的字节也少得多。',
      ],
    },
    en: {
      code: 'EXPERTS_FASTER', title: 'One expert fewer per token: how much transfer it saves', tag: 'Teaching estimate · expert sizes and rule from this page',
      intro: 'For every token the model picks 6 experts (Full). The Faster mode takes only the first 5. Pick a file set, then drag <b>free VRAM per card</b>. Experts that fit in VRAM are computed on the card and need no transfer. The others must be read from <b>RAM slots or the SSD</b>. The two bars are to scale, and both are drawn from the Full total. Teaching assumption: every expert is equally likely to be picked, so “the share in VRAM” is “the share that needs no transfer”. The real engine fills from hot to cold, so the real result is better than this.',
      lgOff: 'Bytes read from RAM slots or the SSD', lgOn: 'Bytes resident in VRAM, computed on the card',
      setLabel: 'File set', sets: { q8: 'UD-Q8_K_XL (18.8 MB each)', bit2: '2-bit sets (8.6 MB each)' },
      memLabel: 'Free VRAM per card', memAria: 'Free VRAM per card, in GiB',
      gib: (g) => `${g} GiB`,
      bFull: (k) => `Full: ${k} experts`, bFaster: (k) => `Faster: ${k} experts`,
      mb: (x) => `${x} MB`,
      barTotal: (x) => `${x} MB in total`,
      axis: 'Dark = read (RAM slot / SSD); light = in VRAM',
      sShareK: 'Share of experts resident in VRAM',
      sShareV: (p) => `${p}%`,
      sShareF: (n, total, p) => `<b>= ${n} ÷ ${total} = ${p}%</b><br>whole experts that fit in VRAM ÷ 15,360`,
      sBudgetK: 'Expert budget of this card',
      sBudgetV: (g) => `${g} GB`,
      sBudgetF: (free, n, sz) => `<b>= (${free} GiB × 1024 − 600 MiB reserve) × 1.0</b><br>÷ ${sz} MB each, rounded down = ${n} experts (the extra reserve of an integrated GPU and the empty swap slot are not counted here)`,
      sFullK: 'Full: read from RAM or SSD per token',
      sFullV: (x) => `${x} MB`,
      sFullF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − resident share) = ${off}% not in VRAM</b><br>first the expert bytes of one token, then the share that is not in VRAM`,
      sFastK: 'Faster: read from RAM or SSD per token',
      sFastV: (x) => `${x} MB`,
      sFastF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − resident share) = ${off}% not in VRAM</b><br>the list is one entry shorter, the rest of the calculation is the same`,
      sSaveK: 'Transfer saved by Faster',
      sSaveV: (mb, pct) => `${mb} MB (${pct}%)`,
      sSaveF: (sz) => `<b>= 1 expert fewer × ${sz} MB × share not in VRAM</b><br>the ratio of counts is always −1 ÷ 6 ≈ −16.7%; with no bytes to move, there is nothing to save`,
      verdictOff: (full, fast, saved) => `With this VRAM, Full reads <b>${full} MB</b> per token from RAM or the SSD, Faster reads <b>${fast} MB</b>, and saves <b>${saved} MB</b>. What is saved is transfer: for experts resident in VRAM, 5 and 6 are both computed on the card.`,
      verdictAll: 'This VRAM holds all the experts: no token reads anything from RAM or the SSD, so Faster has no transfer to save. It still computes one expert fewer, but this chart does not measure that.',
      try: [
        'Drag VRAM to <b>0 GiB</b>: same as the static figure above, 6 experts are 112.8 MB, 5 are 94 MB, and 18.8 MB is saved. This is the upper-limit bill for “none of the 6 resident”.',
        'Drag to <b>12 GiB</b> (the size of an ordinary computer): only about 4% of the experts fit, the bill hardly changes, and Faster still saves about one sixth. The smaller the VRAM, the more Faster helps.',
        'Drag to <b>270 GiB</b> or more: all experts are resident, both bars turn light, and the saved transfer becomes 0. Then switch to the <b>2-bit sets</b>: the same VRAM holds more experts, and the bytes to read per token are much fewer.',
      ],
    },
    ja: {
      code: 'EXPERTS_FASTER', title: '1 トークンあたりエキスパートを 1 個減らすと、移動はどれだけ減るか', tag: '教育用の試算 · エキスパートのサイズと規則はこのページのもの',
      intro: 'モデルは 1 トークンごとに 6 個のエキスパートを選びます（Full）。Faster モードは先頭の 5 個だけを取ります。ファイルセットを選び、<b>カード 1 枚あたりの空きVRAM</b>をドラッグしてください。VRAMに入るエキスパートはカード上で計算するので、移動は要りません。残りは <b>RAM のスロットか SSD</b> から読む必要があります。2 本の横棒は同じ縮尺で、どちらも Full の合計バイト数を基準に描いています。教育用の仮定：どのエキスパートも同じ確率で選ばれる。だから「VRAMにある割合」が「移動が要らない割合」になります。実際のエンジンはホットな順に埋めるので、実際の結果はここよりよくなります。',
      lgOff: 'RAM のスロットか SSD から読むバイト', lgOn: 'VRAMに常駐し、カード上で計算するバイト',
      setLabel: 'ファイルセット', sets: { q8: 'UD-Q8_K_XL（1 個 18.8 MB）', bit2: '2 ビットセット（1 個 8.6 MB）' },
      memLabel: 'カード 1 枚の空きVRAM', memAria: 'カード 1 枚の空きVRAM（単位 GiB）',
      gib: (g) => `${g} GiB`,
      bFull: (k) => `Full：エキスパート ${k} 個`, bFaster: (k) => `Faster：エキスパート ${k} 個`,
      mb: (x) => `${x} MB`,
      barTotal: (x) => `合計 ${x} MB`,
      axis: '濃い色 = RAM スロット / SSD から読む、薄い色 = 常駐',
      sShareK: 'VRAMに常駐するエキスパートの割合',
      sShareV: (p) => `${p}%`,
      sShareF: (n, total, p) => `<b>= ${n} ÷ ${total} = ${p}%</b><br>VRAMに入るエキスパートの個数 ÷ 15,360`,
      sBudgetK: 'このカードのエキスパート予算',
      sBudgetV: (g) => `${g} GB`,
      sBudgetF: (free, n, sz) => `<b>=（${free} GiB × 1024 − 予約 600 MiB）× 1.0</b><br>÷ 1 個 ${sz} MB、切り捨て = ${n} 個のエキスパート（統合 GPU の追加の予約と入れ替え用の空きスロットは、ここでは数えない）`,
      sFullK: 'Full が 1 トークンごとに RAM か SSD から読む量',
      sFullV: (x) => `${x} MB`,
      sFullF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − 常駐の割合) = ${off}% がVRAMの外</b><br>まず 1 トークンのエキスパートのバイト数を出し、次にVRAMの外にある割合を掛ける`,
      sFastK: 'Faster が 1 トークンごとに RAM か SSD から読む量',
      sFastV: (x) => `${x} MB`,
      sFastF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − 常駐の割合) = ${off}% がVRAMの外</b><br>リストが 1 項目短くなるだけで、ほかの計算は同じ`,
      sSaveK: 'Faster が省く移動',
      sSaveV: (mb, pct) => `${mb} MB（${pct}%）`,
      sSaveF: (sz) => `<b>= 減らした 1 個のエキスパート × ${sz} MB × VRAMの外にある割合</b><br>個数の比は常に −1 ÷ 6 ≈ −16.7%。移動するバイトがなければ、省けるものもない`,
      verdictOff: (full, fast, saved) => `このVRAMでは、Full は 1 トークンごとに RAM か SSD から <b>${full} MB</b> を読み、Faster は <b>${fast} MB</b> で、<b>${saved} MB</b> 省けます。省けるのは移動です。VRAMに常駐するエキスパートは、5 個でも 6 個でもカード上で計算されます。`,
      verdictAll: 'このVRAMには全エキスパートが入ります。1 トークンごとに RAM や SSD から読むものはなく、Faster が省ける移動はありません。エキスパートを 1 個少なく計算することには変わりませんが、この図が測っているのはそれではありません。',
      try: [
        'VRAMを <b>0 GiB</b> までドラッグします。上の静的な図と同じで、6 個なら 112.8 MB、5 個なら 94 MB、18.8 MB 省けます。これは「6 個とも常駐していない」ときの上限の請求です。',
        '<b>12 GiB</b>（ふつうのパソコンの規模）までドラッグします。入るエキスパートは約 4% だけで、請求はほとんど変わらず、Faster はそれでも約 6 分の 1 を省きます。VRAMが小さいマシンほど、Faster の効果は大きくなります。',
        '<b>270 GiB</b> 以上までドラッグします。全エキスパートが常駐し、2 本の棒はどちらも薄い色になり、省ける移動は 0 になります。次に <b>2 ビットセット</b>に切り替えると、同じVRAMでもより多くのエキスパートが入り、1 トークンごとに読むバイト数もずっと少なくなります。',
      ],
    },
    ko: {
      code: 'EXPERTS_FASTER', title: '토큰마다 전문가 하나를 덜 쓰면 옮기는 양이 얼마나 줄까', tag: '교육용 추정 · 전문가 크기와 규칙은 이 쪽의 것',
      intro: '모델은 토큰마다 전문가 6개를 골라요(Full). Faster 모드는 앞의 5개만 취해요. 파일 세트를 고르고 <b>카드 한 장의 여유 VRAM</b>를 끌어 보세요. VRAM에 들어가는 전문가는 카드 위에서 계산하니 옮길 필요가 없어요. 나머지는 <b>RAM 슬롯이나 SSD</b>에서 읽어야 해요. 두 막대는 같은 축척이고, 둘 다 Full의 총 바이트 수를 기준으로 그렸어요. 교육용 가정: 전문가는 모두 같은 확률로 뽑혀요. 그래서 “VRAM에 있는 비율”이 곧 “옮길 필요가 없는 비율”이에요. 실제 엔진은 뜨거운 순서로 채우므로 실제 결과는 이보다 좋아요.',
      lgOff: 'RAM 슬롯이나 SSD에서 읽는 바이트', lgOn: 'VRAM에 상주해 카드 위에서 계산하는 바이트',
      setLabel: '파일 세트', sets: { q8: 'UD-Q8_K_XL (하나에 18.8 MB)', bit2: '2비트 세트 (하나에 8.6 MB)' },
      memLabel: '카드 한 장의 여유 VRAM', memAria: '카드 한 장의 여유 VRAM, 단위 GiB',
      gib: (g) => `${g} GiB`,
      bFull: (k) => `Full: 전문가 ${k}개`, bFaster: (k) => `Faster: 전문가 ${k}개`,
      mb: (x) => `${x} MB`,
      barTotal: (x) => `합계 ${x} MB`,
      axis: '진한 색 = RAM 슬롯/SSD에서 읽음, 연한 색 = 상주',
      sShareK: 'VRAM에 상주하는 전문가 비율',
      sShareV: (p) => `${p}%`,
      sShareF: (n, total, p) => `<b>= ${n} ÷ ${total} = ${p}%</b><br>VRAM에 들어가는 전문가 개수 ÷ 15,360`,
      sBudgetK: '이 카드의 전문가 예산',
      sBudgetV: (g) => `${g} GB`,
      sBudgetF: (free, n, sz) => `<b>= (${free} GiB × 1024 − 예약 600 MiB) × 1.0</b><br>÷ 하나에 ${sz} MB, 내림 = 전문가 ${n}개 (통합 GPU의 추가 예약과 교체용 빈 슬롯은 여기서 세지 않음)`,
      sFullK: 'Full이 토큰마다 RAM이나 SSD에서 읽는 양',
      sFullV: (x) => `${x} MB`,
      sFullF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − 상주 비율) = ${off}%가 VRAM 밖</b><br>먼저 토큰 하나의 전문가 바이트 수를 구하고, VRAM 밖에 있는 몫을 곱한다`,
      sFastK: 'Faster가 토큰마다 RAM이나 SSD에서 읽는 양',
      sFastV: (x) => `${x} MB`,
      sFastF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − 상주 비율) = ${off}%가 VRAM 밖</b><br>목록이 한 칸 짧아질 뿐, 나머지 계산은 같다`,
      sSaveK: 'Faster가 아끼는 이동량',
      sSaveV: (mb, pct) => `${mb} MB (${pct}%)`,
      sSaveF: (sz) => `<b>= 덜 고른 전문가 1개 × ${sz} MB × VRAM 밖에 있는 몫</b><br>개수의 비는 언제나 −1 ÷ 6 ≈ −16.7%. 옮길 바이트가 없으면 아낄 것도 없다`,
      verdictOff: (full, fast, saved) => `이 VRAM에서 Full은 토큰마다 RAM이나 SSD에서 <b>${full} MB</b>를 읽고, Faster는 <b>${fast} MB</b>를 읽어서 <b>${saved} MB</b>를 아껴요. 아끼는 것은 옮기는 일이에요. VRAM에 상주하는 전문가는 5개든 6개든 카드 위에서 계산돼요.`,
      verdictAll: '이 VRAM에는 전문가가 전부 들어가요. 토큰마다 RAM이나 SSD에서 읽을 것이 없으니 Faster가 아낄 이동량도 없어요. 전문가를 하나 덜 계산하는 것은 여전하지만, 이 그림이 재는 것은 그게 아니에요.',
      try: [
        'VRAM를 <b>0 GiB</b>로 끌어 보세요. 위의 정적 그림과 같아요. 6개면 112.8 MB, 5개면 94 MB, 18.8 MB를 아껴요. “6개 모두 상주하지 않음”일 때의 상한 청구서예요.',
        '<b>12 GiB</b>(보통 컴퓨터 수준)로 끌어 보세요. 들어가는 전문가는 약 4%뿐이라 청구서는 거의 안 변하고, Faster는 그래도 약 6분의 1을 아껴요. VRAM가 작은 머신일수록 Faster의 이득이 커요.',
        '<b>270 GiB</b> 이상으로 끌어 보세요. 전문가가 전부 상주하고, 두 막대가 모두 연한 색이 되고, 아끼는 이동량은 0이 돼요. 그다음 <b>2비트 세트</b>로 바꿔 보세요. 같은 VRAM에 더 많은 전문가가 들어가고, 토큰마다 읽어야 하는 바이트도 훨씬 줄어요.',
      ],
    },
    es: {
      code: 'EXPERTS_FASTER', title: 'Un experto menos por token: cuánto traslado se ahorra', tag: 'Estimación didáctica · tamaños y regla de esta página',
      intro: 'En cada token el modelo elige 6 expertos (Full). El modo Faster toma solo los 5 primeros. Elige un conjunto de archivos y arrastra la <b>VRAM libre por tarjeta</b>. Los expertos que caben en la VRAM se calculan en la tarjeta y no necesitan traslado. Los demás hay que leerlos de las <b>ranuras de RAM o del SSD</b>. Las dos barras están a escala y ambas se dibujan a partir del total de Full. Supuesto didáctico: todos los expertos tienen la misma probabilidad de ser elegidos, así que «la parte que está en la VRAM» es «la parte que no necesita traslado». El motor real llena de caliente a frío, así que el resultado real es mejor que este.',
      lgOff: 'Bytes leídos de ranuras de RAM o del SSD', lgOn: 'Bytes residentes en la VRAM, calculados en la tarjeta',
      setLabel: 'Conjunto', sets: { q8: 'UD-Q8_K_XL (18.8 MB c/u)', bit2: 'Conjuntos de 2 bits (8.6 MB c/u)' },
      memLabel: 'VRAM libre por tarjeta', memAria: 'VRAM libre por tarjeta, en GiB',
      gib: (g) => `${g} GiB`,
      bFull: (k) => `Full: ${k} expertos`, bFaster: (k) => `Faster: ${k} expertos`,
      mb: (x) => `${x} MB`,
      barTotal: (x) => `${x} MB en total`,
      axis: 'Oscuro = se lee (ranura/SSD); claro = en VRAM',
      sShareK: 'Parte de expertos residentes en VRAM',
      sShareV: (p) => `${p}%`,
      sShareF: (n, total, p) => `<b>= ${n} ÷ ${total} = ${p}%</b><br>expertos enteros que caben en la VRAM ÷ 15,360`,
      sBudgetK: 'Presupuesto de expertos de esta tarjeta',
      sBudgetV: (g) => `${g} GB`,
      sBudgetF: (free, n, sz) => `<b>= (${free} GiB × 1024 − 600 MiB de reserva) × 1.0</b><br>÷ ${sz} MB cada uno, redondeado hacia abajo = ${n} expertos (la reserva extra de una GPU integrada y la ranura vacía de intercambio no se cuentan aquí)`,
      sFullK: 'Full: lectura de RAM o SSD por token',
      sFullV: (x) => `${x} MB`,
      sFullF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − parte residente) = ${off}% fuera de la VRAM</b><br>primero los bytes de expertos de un token, luego la parte que no está en la VRAM`,
      sFastK: 'Faster: lectura de RAM o SSD por token',
      sFastV: (x) => `${x} MB`,
      sFastF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − parte residente) = ${off}% fuera de la VRAM</b><br>la lista es una entrada más corta; el resto del cálculo es igual`,
      sSaveK: 'Traslado que ahorra Faster',
      sSaveV: (mb, pct) => `${mb} MB (${pct}%)`,
      sSaveF: (sz) => `<b>= 1 experto menos × ${sz} MB × parte fuera de la VRAM</b><br>la proporción de cantidades es siempre −1 ÷ 6 ≈ −16.7%; si no hay bytes que mover, no hay nada que ahorrar`,
      verdictOff: (full, fast, saved) => `Con esta VRAM, Full lee <b>${full} MB</b> por token de la RAM o del SSD, Faster lee <b>${fast} MB</b> y ahorra <b>${saved} MB</b>. Lo que se ahorra es traslado: los expertos residentes en la VRAM, con 5 o con 6, se calculan en la tarjeta.`,
      verdictAll: 'Esta VRAM aloja todos los expertos: ningún token lee nada de la RAM ni del SSD, así que Faster no tiene traslado que ahorrar. Sigue calculando un experto menos, pero eso no lo mide este gráfico.',
      try: [
        'Arrastra la VRAM a <b>0 GiB</b>: igual que la figura estática de arriba, 6 expertos son 112.8 MB, 5 son 94 MB y se ahorran 18.8 MB. Es la cuenta máxima de «ninguno de los 6 residente».',
        'Arrastra a <b>12 GiB</b> (el orden de un ordenador normal): solo cabe un 4% de los expertos, la cuenta casi no cambia y Faster sigue ahorrando cerca de una sexta parte. Cuanto menor es la VRAM, más ayuda Faster.',
        'Arrastra a <b>270 GiB</b> o más: todos los expertos son residentes, las dos barras se vuelven claras y el traslado ahorrado pasa a 0. Luego cambia a los <b>conjuntos de 2 bits</b>: la misma VRAM aloja más expertos y los bytes que hay que leer por token son muchos menos.',
      ],
    },
    ar: {
      code: 'EXPERTS_FASTER', title: 'خبير أقل لكل رمز: كم من النقل يوفّر', tag: 'تقدير تعليمي · أحجام الخبراء والقاعدة من هذه الصفحة',
      intro: 'مع كل رمز يختار النموذج 6 خبراء (Full). ووضع Faster يأخذ أول 5 فقط. اختر مجموعة ملفات، ثم اسحب <b>VRAM الحرة لكل بطاقة</b>. الخبراء الذين يتسع لهم VRAM يُحسبون على البطاقة ولا يحتاجون إلى نقل. أما الباقون فيجب قراءتهم من <b>خانات RAM أو من SSD</b>. الشريطان بمقياس واحد، وكلاهما مرسوم من إجمالي Full. افتراض تعليمي: لكل خبير الاحتمال نفسه في أن يُختار، فتكون «نسبة ما في VRAM» هي «نسبة ما لا يحتاج إلى نقل». والمحرّك الحقيقي يملأ من الأسخن إلى الأبرد، فالنتيجة الحقيقية أفضل من هذه.',
      lgOff: 'بايتات تُقرأ من خانات RAM أو من SSD', lgOn: 'بايتات مقيمة في VRAM وتُحسب على البطاقة',
      setLabel: 'المجموعة', sets: { q8: 'UD-Q8_K_XL (18.8 MB للخبير)', bit2: 'مجموعات 2 بت (8.6 MB للخبير)' },
      memLabel: 'VRAM الحرة لكل بطاقة', memAria: 'VRAM الحرة لكل بطاقة، بوحدة GiB',
      gib: (g) => `${g} GiB`,
      bFull: (k) => `Full: ${k} خبراء`, bFaster: (k) => `Faster: ${k} خبراء`,
      mb: (x) => `${x} MB`,
      barTotal: (x) => `المجموع ${x} MB`,
      axis: 'داكن = يُقرأ (خانة/SSD)؛ فاتح = في VRAM',
      sShareK: 'نسبة الخبراء المقيمين في VRAM',
      sShareV: (p) => `${p}%`,
      sShareF: (n, total, p) => `<b>= ${n} ÷ ${total} = ${p}%</b><br>عدد الخبراء الكاملين الذين يتسع لهم VRAM ÷ 15,360`,
      sBudgetK: 'ميزانية الخبراء لهذه البطاقة',
      sBudgetV: (g) => `${g} GB`,
      sBudgetF: (free, n, sz) => `<b>= (${free} GiB × 1024 − 600 MiB محجوزة) × 1.0</b><br>÷ ${sz} MB للخبير، بالتقريب إلى الأدنى = ${n} خبيرًا (حجز البطاقة المدمجة الإضافي وخانة التبديل الفارغة لا تُحسبان هنا)`,
      sFullK: 'Full: ما يُقرأ من RAM أو SSD لكل رمز',
      sFullV: (x) => `${x} MB`,
      sFullF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − نسبة المقيم) = ${off}% خارج VRAM</b><br>أولًا بايتات الخبراء لرمز واحد، ثم النسبة التي ليست في VRAM`,
      sFastK: 'Faster: ما يُقرأ من RAM أو SSD لكل رمز',
      sFastV: (x) => `${x} MB`,
      sFastF: (k, sz, off) => `<b>= ${k} × ${sz} MB × (1 − نسبة المقيم) = ${off}% خارج VRAM</b><br>القائمة أقصر بخانة واحدة، وبقية الحساب كما هي`,
      sSaveK: 'النقل الذي يوفّره Faster',
      sSaveV: (mb, pct) => `${mb} MB (${pct}%)`,
      sSaveF: (sz) => `<b>= خبير واحد أقل × ${sz} MB × النسبة التي خارج VRAM</b><br>نسبة الأعداد دائمًا −1 ÷ 6 ≈ −16.7%؛ وإن لم تكن هناك بايتات تُنقل فلا شيء يُوفَّر`,
      verdictOff: (full, fast, saved) => `بهذه الذاكرة، يقرأ Full لكل رمز <b>${full} MB</b> من RAM أو SSD، ويقرأ Faster <b>${fast} MB</b>، فيوفّر <b>${saved} MB</b>. الموفَّر هو النقل: فالخبراء المقيمون في VRAM يُحسبون على البطاقة سواء كانوا 5 أم 6.`,
      verdictAll: 'هذه الذاكرة تتسع لجميع الخبراء: لا يقرأ أي رمز شيئًا من RAM أو SSD، فلا نقل يوفّره Faster. ويبقى يحسب خبيرًا أقل، لكن هذا الرسم لا يقيس ذلك.',
      try: [
        'اسحب VRAM إلى <b>0 GiB</b>: كما في الشكل الثابت أعلاه، 6 خبراء 112.8 MB و5 خبراء 94 MB، ويُوفَّر 18.8 MB. هذه الفاتورة القصوى لحالة «لا أحد من الستة مقيم».',
        'اسحب إلى <b>12 GiB</b> (حجم حاسوب عادي): لا يتسع إلا نحو 4% من الخبراء، فتكاد الفاتورة لا تتغير، ويوفّر Faster مع ذلك نحو السدس. وكلما صغرت VRAM زادت فائدة Faster.',
        'اسحب إلى <b>270 GiB</b> أو أكثر: يصير كل الخبراء مقيمين، ويصبح الشريطان فاتحين، ويصير النقل الموفَّر 0. ثم انتقل إلى <b>مجموعات 2 بت</b>: تتسع الذاكرة نفسها لخبراء أكثر، وتقل البايتات التي تُقرأ لكل رمز كثيرًا.',
      ],
    },

  });

  const pct1 = (x) => (Math.round(x * 1000) / 10).toString();
  const mb1 = (x) => Viz.fmt(x, 1);

  Viz.register('ds-experts-faster', {
    mount(el) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgOff },
        { color: 'var(--frame)', text: T.lgOn },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.insertAdjacentHTML('beforeend',
        `<div class="viz-row" style="margin-top:0"><span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${T.setLabel}</span>${M.SETS.map(s => `<button type="button" class="viz-btn ghost" data-set="${s}" aria-pressed="false" style="padding:5px 9px;font-size:12px">${Viz.esc(T.sets[s])}</button>`).join('')}</div>
        <div class="viz-slider"><label for="dsef-mem">${T.memLabel}</label><input id="dsef-mem" type="range" min="0" max="${M.MAX_FREE_GIB}" step="1" value="${M.DEFAULT_FREE_GIB}" aria-label="${Viz.esc(T.memAria)}"><output aria-live="polite">${T.gib(M.DEFAULT_FREE_GIB)}</output></div>`);
      const svg = Viz.svg('svg', { viewBox: '0 0 400 150', class: 'viz-stage', role: 'img', 'aria-label': T.title }, left);
      right.innerHTML =
        Viz.stat({ id: 'e-share', k: T.sShareK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'e-budget', k: T.sBudgetK, v: '', f: '' }) +
        Viz.stat({ id: 'e-full', k: T.sFullK, v: '', f: '' }) +
        Viz.stat({ id: 'e-fast', k: T.sFastK, v: '', f: '' }) +
        Viz.stat({ id: 'e-save', k: T.sSaveK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      let free = M.DEFAULT_FREE_GIB, set = M.DEFAULT_SET;

      const txt = (x, y, s, opt = {}) => { const t = Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': opt.anchor || 'start', style: `fill:${opt.color || 'var(--muted)'}` }, svg); t.textContent = s; return t; };

      function bar(y, label, bill, scale) {
        txt(12, y, label, { color: 'var(--ink)' });
        const x0 = 12, wTotal = 376, wAll = bill.totalMB * scale, wOff = bill.offMB * scale;
        // Soft part first (resident), dark part (read from RAM or SSD) on top from the left edge.
        Viz.svg('rect', { x: x0, y: y + 6, width: wAll, height: 24, class: 'viz-cell', style: 'stroke:var(--frame)' }, svg);
        if (wOff > 0) Viz.svg('rect', { x: x0, y: y + 6, width: wOff, height: 24, style: 'fill:var(--accent)' }, svg);
        const inside = wOff >= 150;
        if (inside) txt(x0 + wOff / 2, y + 22, T.mb(mb1(bill.offMB)), { anchor: 'middle', color: 'var(--paper)' });
        else txt(Math.min(x0 + wOff + 6, wTotal - 40), y + 46, T.mb(mb1(bill.offMB)), { color: 'var(--ink)' });
        return y;
      }

      function draw() {
        svg.innerHTML = '';
        const c = M.compare(free, set), scale = 376 / c.full.totalMB;
        bar(14, T.bFull(M.FULL_K), c.full, scale);
        bar(74, T.bFaster(M.FASTER_K), c.faster, scale);
        txt(12, 144, T.axis);
        const n = M.residentExperts(free, set), share = M.residentShare(free, set), budget = M.vramBudgetMB(free) / 1000;
        const offPct = pct1(1 - share);
        $('[data-s=e-share-v]').textContent = T.sShareV(pct1(share));
        $('[data-s=e-share-f]').innerHTML = T.sShareF(Viz.fmt(n), Viz.fmt(M.TOTAL_EXPERTS), pct1(share));
        $('[data-s=e-budget-v]').textContent = T.sBudgetV(Viz.fmt(budget, 1));
        $('[data-s=e-budget-f]').innerHTML = T.sBudgetF(free, Viz.fmt(n), c.full.sizeMB);
        $('[data-s=e-full-v]').textContent = T.sFullV(mb1(c.full.offMB));
        $('[data-s=e-full-f]').innerHTML = T.sFullF(M.FULL_K, c.full.sizeMB, offPct);
        $('[data-s=e-fast-v]').textContent = T.sFastV(mb1(c.faster.offMB));
        $('[data-s=e-fast-f]').innerHTML = T.sFastF(M.FASTER_K, c.faster.sizeMB, offPct);
        $('[data-s=e-save-v]').textContent = T.sSaveV(mb1(c.savedMB), pct1(c.savedPct));
        $('[data-s=e-save-f]').innerHTML = T.sSaveF(c.full.sizeMB);
        $('.viz-verdict').innerHTML = c.full.offMB > 0 ? T.verdictOff(mb1(c.full.offMB), mb1(c.faster.offMB), mb1(c.savedMB)) : T.verdictAll;
        el.querySelectorAll('[data-set]').forEach(b => { const on = b.dataset.set === set; b.classList.toggle('ghost', !on); b.setAttribute('aria-pressed', String(on)); });
        $('output').textContent = T.gib(free);
        svg.setAttribute('aria-label', `${T.title}: ${T.bFull(M.FULL_K)} ${T.mb(mb1(c.full.offMB))}; ${T.bFaster(M.FASTER_K)} ${T.mb(mb1(c.faster.offMB))}`);
      }
      el.querySelectorAll('[data-set]').forEach(b => { b.onclick = () => { set = b.dataset.set; draw(); }; });
      const range = $('input[type=range]');
      range.oninput = () => { free = +range.value; draw(); };
      draw();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
