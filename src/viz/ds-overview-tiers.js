/* DeepSeek column, page overview: where the files of a chosen set go on a chosen machine.
   All visible text lives in the T table below (zh is the master). Numbers come from ds-overview-tiers.math.js. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsOverviewTiers;

  const T = Viz.t({
    zh: {
      code: 'DS_TIERS', title: '文件放在哪一层：显存、内存、SSD', tag: '教学估算 · 两组实测除外',
      intro: '选一套文件，再选这台电脑的显存和内存，看文件按页面 1.3 的规则放到哪一层：<b>显存</b>放稠密权重和尽量多的专家，放不下的专家在 CPU 上就地算、留在<b>内存</b>里，内存也放不下的改读 <b>SSD</b>。页面里的两台实测机器（4× R9700、Strix Halo）直接用实测数字；其他设置是<b>教学估算</b>，没有实测。',
      lgDense: '稠密权重（注意力等，放显存）', lgVram: '显存里的专家', lgRam: '内存里的专家（CPU 就地算）', lgSsd: '从 SSD 读的专家', lgTable: 'Engram 查找表', lgDraft: 'DSpark 草稿模型', lgCap: '虚线框 = 这一层的容量',
      setLabel: '文件集',
      sets: { ud: 'UD-Q8_K_XL · 508.4 GB', ist175: 'IST-DAS 1.75 bpw', ist200: 'IST-DAS 2.00 bpw', ist225: 'IST-DAS 2.25 bpw' },
      machineLabel: '机器类型',
      machines: ['独立显卡 + 内存', '统一内存（共用一个池）'],
      vramLabel: '显存合计', poolLabel: '统一内存池', ramLabel: '内存',
      presetLabel: '实测机器',
      presets: ['4× R9700 + 251 GB 内存 · UD 集', 'Strix Halo 128 GB · 2.00 集'],
      stage: (set) => `文件集 ${set} 在显存、内存、SSD 三层的放置`,
      rowVram: (cap, n) => `显存 · 容量 ${cap} GB（${n} 张卡）`,
      rowPool: (cap) => `统一内存池 · 容量 ${cap} GB`,
      rowRam: (cap) => `内存 · 容量 ${cap} GB`,
      rowSsd: 'SSD · 直读',
      dVram: (d, e) => `稠密 ${d} ＋ 专家 ${e} GB`,
      dRam: (e, t) => `专家 ${e} GB` + (t ? ` ＋ 表 ${t} GB` : ''),
      dSsd: (e, t, d) => [`专家 ${e}`, t ? `表 ${t}` : '', d ? `草稿 ${d}` : ''].filter(Boolean).join(' ＋ ') + ' GB',
      scaleNote: '三条横条用同一把 GB 尺子画；虚线框是容量，实心是放进去的文件',
      noRam: '统一内存没有单独的内存层',
      sVramK: '显存里放了多少', sRamK: '内存里放了多少', sSsdK: 'SSD 上放了多少', sDiskK: '这套文件占多少磁盘',
      sVramF: (p, f) => `<b>= 稠密 ${f(p.denseVram)} ＋ 专家 ${f(p.expertsVram)}（${Viz.fmt(p.expertsVramCount)} 个）</b><br>` + (p.kind === 'measured' ? '实测值，来自页面 1.3' : `估算：容量 ${f(p.vramCapGb)} GB 先扣每卡 1.15 GB 保留，再扣稠密权重，剩下的放专家`),
      sPoolF: (p, f) => `<b>= 稠密 ${f(p.denseVram)} ＋ 专家 ${f(p.expertsVram)}</b><br>` + (p.kind === 'measured' ? '实测值：约 109 GB 专家常驻（页面 1.3）' : `估算：池 ${f(p.vramCapGb)} GB 先扣稠密权重和 ${M.UMA_RESERVE_GB} GB 系统保留，剩下的放专家`),
      sRamF: (p, f) => `<b>= CPU 侧专家 ${f(p.expertsRam + p.expertsSsd)} 里，内存能缓存的部分${p.engramWhere === 'ram' ? ' ＋ 整张表' : ''}</b><br>全缓存要 ${f(p.ramNeededGb)} GB（专家 ＋ ${M.REST_RAM_GB} GB 留给引擎和系统），现有 ${f(p.ramGb)} GB`,
      sRamNone: '—',
      sSsdF: (p, f) => `<b>= 读 SSD 的专家 ${f(p.expertsSsd)} ＋ ${p.engramWhere === 'ssd' ? `Engram 表 ${f(p.engramGb)}` : '表（已在内存）'}${p.drafterGb ? ` ＋ 草稿 ${f(p.drafterGb)}` : ''}</b><br>表不计入内存，但每写一个字都要读它几行`,
      sDiskF: (p, f, set) => `<b>= 稠密 ＋ 专家 ＋ 表${p.drafterGb ? ' ＋ 草稿' : ''}</b><br>${set}；2-bit 三套共用同一张 ${f(p.engramGb)} GB 的表`,
      gb: (v) => `${v} GB`,
      kindMeasured: '这一组是页面里的<b>实测放置</b>。',
      kindEstimate: '这一组是<b>教学估算</b>：按页面的规则推出来，没有实测。',
      vFits: (p, f) => `放得下：${f(p.expertsVram)} GB 专家在显存，${f(p.expertsRam)} GB 在内存，内存还剩 ${f(p.spareRamGb)} GB。`,
      vFitsPool: (p, f) => `放得下：稠密权重和全部专家都在统一内存池里，只有表在 SSD。`,
      vTight: (p, f) => `刚好放得下：内存只比缓存 CPU 侧专家多出 ${f(p.spareRamGb)} GB，不到 4 GB，余量很小。`,
      vSpills: (p, f) => `放不下：有 ${f(p.expertsSsd)} GB 专家要从 SSD 读，能跑，但每写一个字都会变慢。`,
      vOom: '显存放不下稠密权重：引擎可能一启动就因为显存不足而停下。',
      vNoCard: '没有显卡：这个引擎需要至少一张显卡。',
      try: [
        '点 <b>实测机器：4× R9700</b>，再把<b>内存</b>从 251 拉到 100 GB：172 GB 的 CPU 侧专家只有 91 GB 能留在内存里，其余约 82 GB 改读 SSD，结论变成「放不下」。',
        '选 <b>IST-DAS 2.00</b>，显存拉到 <b>16</b> GB、内存 <b>160</b> GB：专家全在显存和内存里，111 GB 的表落在 SSD；把内存拉到 <b>400</b> GB，这张表改放内存。',
        '点 <b>实测机器：Strix Halo</b>，把<b>统一内存池</b>从 128 降到 64 GB：常驻专家从约 109 GB 掉到 46 GB，SSD 上的专家涨到约 86 GB。',
      ],
    },
    en: {
      code: 'DS_TIERS', title: 'Which tier holds the files: VRAM, RAM, SSD', tag: 'Teaching estimate · except the two measured sets',
      intro: 'Pick a file set, then pick this computer\'s VRAM and RAM, and see which tier each file goes to under the rules of section 1.3. <b>VRAM</b> holds the dense weights and as many experts as fit. Experts that do not fit are computed in place on the CPU and stay in <b>RAM</b>. Experts that RAM cannot hold are read from the <b>SSD</b>. The two measured machines on the page (4× R9700, Strix Halo) use the measured numbers directly. Every other setting is a <b>teaching estimate</b> with no measurement behind it.',
      lgDense: 'Dense weights (attention etc., in VRAM)', lgVram: 'Experts in VRAM', lgRam: 'Experts in RAM (computed in place on the CPU)', lgSsd: 'Experts read from the SSD', lgTable: 'Engram lookup table', lgDraft: 'DSpark draft model', lgCap: 'Dashed frame = capacity of this tier',
      setLabel: 'File set',
      sets: { ud: 'UD-Q8_K_XL · 508.4 GB', ist175: 'IST-DAS 1.75 bpw', ist200: 'IST-DAS 2.00 bpw', ist225: 'IST-DAS 2.25 bpw' },
      machineLabel: 'Machine type',
      machines: ['Discrete GPU + RAM', 'Unified memory (one shared pool)'],
      vramLabel: 'VRAM total', poolLabel: 'Unified memory pool', ramLabel: 'RAM',
      presetLabel: 'Measured machine',
      presets: ['4× R9700 + 251 GB RAM · UD set', 'Strix Halo 128 GB · 2.00 set'],
      stage: (set) => `Placement of file set ${set} across VRAM, RAM and SSD`,
      rowVram: (cap, n) => `VRAM · capacity ${cap} GB (${n} cards)`,
      rowPool: (cap) => `Unified memory pool · capacity ${cap} GB`,
      rowRam: (cap) => `RAM · capacity ${cap} GB`,
      rowSsd: 'SSD · direct reads',
      dVram: (d, e) => `dense ${d} + experts ${e} GB`,
      dRam: (e, t) => `experts ${e} GB` + (t ? ` + table ${t} GB` : ''),
      dSsd: (e, t, d) => [`experts ${e}`, t ? `table ${t}` : '', d ? `draft ${d}` : ''].filter(Boolean).join(' + ') + ' GB',
      scaleNote: 'One GB ruler for all bars; dashed = capacity, solid = files',
      noRam: 'Unified memory has no separate RAM tier',
      sVramK: 'How much sits in VRAM', sRamK: 'How much sits in RAM', sSsdK: 'How much sits on the SSD', sDiskK: 'Disk used by this file set',
      sVramF: (p, f) => `<b>= dense ${f(p.denseVram)} + experts ${f(p.expertsVram)} (${Viz.fmt(p.expertsVramCount)} experts)</b><br>` + (p.kind === 'measured' ? 'Measured value, from section 1.3' : `Estimate: capacity ${f(p.vramCapGb)} GB minus a 1.15 GB reserve per card, minus the dense weights; the rest holds experts`),
      sPoolF: (p, f) => `<b>= dense ${f(p.denseVram)} + experts ${f(p.expertsVram)}</b><br>` + (p.kind === 'measured' ? 'Measured value: about 109 GB of experts resident (section 1.3)' : `Estimate: pool ${f(p.vramCapGb)} GB minus the dense weights and a ${M.UMA_RESERVE_GB} GB system reserve; the rest holds experts`),
      sRamF: (p, f) => `<b>= the part of the CPU-side experts ${f(p.expertsRam + p.expertsSsd)} that RAM can cache${p.engramWhere === 'ram' ? ' + the whole table' : ''}</b><br>Caching all of them takes ${f(p.ramNeededGb)} GB (experts + ${M.REST_RAM_GB} GB for the engine and the system); you have ${f(p.ramGb)} GB`,
      sRamNone: '—',
      sSsdF: (p, f) => `<b>= experts read from the SSD ${f(p.expertsSsd)} + ${p.engramWhere === 'ssd' ? `Engram table ${f(p.engramGb)}` : 'table (already in RAM)'}${p.drafterGb ? ` + draft ${f(p.drafterGb)}` : ''}</b><br>The table does not count toward RAM, but every token written reads a few of its rows`,
      sDiskF: (p, f, set) => `<b>= dense + experts + table${p.drafterGb ? ' + draft' : ''}</b><br>${set}; the three 2-bit sets share the same ${f(p.engramGb)} GB table`,
      gb: (v) => `${v} GB`,
      kindMeasured: 'This setting is a <b>measured placement</b> from the page.',
      kindEstimate: 'This setting is a <b>teaching estimate</b>: worked out from the rules on the page, not measured.',
      vFits: (p, f) => `It fits: ${f(p.expertsVram)} GB of experts in VRAM, ${f(p.expertsRam)} GB in RAM, and ${f(p.spareRamGb)} GB of RAM left over.`,
      vFitsPool: (p, f) => `It fits: the dense weights and all the experts live in the unified memory pool; only the table is on the SSD.`,
      vTight: (p, f) => `A tight fit: RAM exceeds what the CPU-side experts need by only ${f(p.spareRamGb)} GB, under 4 GB, so the margin is small.`,
      vSpills: (p, f) => `It does not fit: ${f(p.expertsSsd)} GB of experts must be read from the SSD. It runs, but every token written gets slower.`,
      vOom: 'The dense weights do not fit in VRAM: the engine may stop at startup for lack of VRAM.',
      vNoCard: 'No graphics card: this engine needs at least one.',
      try: [
        'Click <b>Measured machine: 4× R9700</b>, then drag <b>RAM</b> from 251 down to 100 GB: only 91 GB of the 172 GB of CPU-side experts can stay in RAM, about 82 GB are read from the SSD instead, and the verdict becomes "does not fit".',
        'Choose <b>IST-DAS 2.00</b>, set VRAM to <b>16</b> GB and RAM to <b>160</b> GB: all experts sit in VRAM and RAM, and the 111 GB table lands on the SSD. Drag RAM up to <b>400</b> GB and the table moves into RAM.',
        'Click <b>Measured machine: Strix Halo</b> and lower the <b>unified memory pool</b> from 128 to 64 GB: the resident experts fall from about 109 GB to 46 GB, and the experts on the SSD grow to about 86 GB.',
      ],
    },
    ja: {
      code: 'DS_TIERS', title: 'ファイルはどの層に置かれるか：VRAM、RAM、SSD', tag: '教育用の試算 · 2 組の実測を除く',
      intro: 'ファイルセットを選び、このコンピューターのVRAMと RAM を選ぶと、1.3 節の規則でファイルがどの層に置かれるかが見えます。<b>VRAM</b>には、密な重みと入るだけのエキスパートを置きます。入りきらないエキスパートは CPU 上でその場計算し、<b>RAM</b> に残します。RAM にも入らないものは <b>SSD</b> から読みます。ページにある 2 台の実測マシン（4× R9700、Strix Halo）は実測の数字をそのまま使います。それ以外の設定は<b>教育用の試算</b>で、実測はありません。',
      lgDense: '密な重み（アテンションなど、VRAMに置く）', lgVram: 'VRAM内のエキスパート', lgRam: 'RAM 内のエキスパート（CPU 上でその場計算）', lgSsd: 'SSD から読むエキスパート', lgTable: 'Engram ルックアップテーブル', lgDraft: 'DSpark ドラフトモデル', lgCap: '点線の枠 ＝ この層の容量',
      setLabel: 'ファイルセット',
      sets: { ud: 'UD-Q8_K_XL · 508.4 GB', ist175: 'IST-DAS 1.75 bpw', ist200: 'IST-DAS 2.00 bpw', ist225: 'IST-DAS 2.25 bpw' },
      machineLabel: 'マシンの種類',
      machines: ['単体 GPU + RAM', '統合メモリ（1 つのプールを共用）'],
      vramLabel: 'VRAM合計', poolLabel: '統合メモリプール', ramLabel: 'RAM',
      presetLabel: '実測マシン',
      presets: ['4× R9700 + 251 GB の RAM · UD セット', 'Strix Halo 128 GB · 2.00 セット'],
      stage: (set) => `ファイルセット ${set} のVRAM、RAM、SSD への配置`,
      rowVram: (cap, n) => `VRAM · 容量 ${cap} GB（${n} 枚）`,
      rowPool: (cap) => `統合メモリプール · 容量 ${cap} GB`,
      rowRam: (cap) => `RAM · 容量 ${cap} GB`,
      rowSsd: 'SSD · 直接読み出し',
      dVram: (d, e) => `密な重み ${d} ＋ エキスパート ${e} GB`,
      dRam: (e, t) => `エキスパート ${e} GB` + (t ? ` ＋ テーブル ${t} GB` : ''),
      dSsd: (e, t, d) => [`エキスパート ${e}`, t ? `テーブル ${t}` : '', d ? `ドラフト ${d}` : ''].filter(Boolean).join(' ＋ ') + ' GB',
      scaleNote: '3 本の棒は同じ GB の物差し。点線は容量、塗りは配置したファイル',
      noRam: '統合メモリには別の RAM 層がありません',
      sVramK: 'VRAMに置く量', sRamK: 'RAM に置く量', sSsdK: 'SSD に置く量', sDiskK: 'このファイルセットのディスク使用量',
      sVramF: (p, f) => `<b>= 密な重み ${f(p.denseVram)} ＋ エキスパート ${f(p.expertsVram)}（${Viz.fmt(p.expertsVramCount)} 個）</b><br>` + (p.kind === 'measured' ? '実測値（1.3 節より）' : `試算：容量 ${f(p.vramCapGb)} GB からカード 1 枚あたり 1.15 GB の予約を引き、さらに密な重みを引いて、残りにエキスパートを置く`),
      sPoolF: (p, f) => `<b>= 密な重み ${f(p.denseVram)} ＋ エキスパート ${f(p.expertsVram)}</b><br>` + (p.kind === 'measured' ? '実測値：約 109 GB のエキスパートが常駐（1.3 節）' : `試算：プール ${f(p.vramCapGb)} GB から密な重みとシステム予約 ${M.UMA_RESERVE_GB} GB を引き、残りにエキスパートを置く`),
      sRamF: (p, f) => `<b>= CPU 側のエキスパート ${f(p.expertsRam + p.expertsSsd)} のうち、RAM がキャッシュできる分${p.engramWhere === 'ram' ? ' ＋ テーブル全体' : ''}</b><br>全部をキャッシュするには ${f(p.ramNeededGb)} GB が必要（エキスパート ＋ エンジンとシステム用の ${M.REST_RAM_GB} GB）で、現在は ${f(p.ramGb)} GB`,
      sRamNone: '—',
      sSsdF: (p, f) => `<b>= SSD から読むエキスパート ${f(p.expertsSsd)} ＋ ${p.engramWhere === 'ssd' ? `Engram テーブル ${f(p.engramGb)}` : 'テーブル（すでに RAM 内）'}${p.drafterGb ? ` ＋ ドラフト ${f(p.drafterGb)}` : ''}</b><br>テーブルは RAM に数えませんが、token を 1 つ書くたびにその数行を読みます`,
      sDiskF: (p, f, set) => `<b>= 密な重み ＋ エキスパート ＋ テーブル${p.drafterGb ? ' ＋ ドラフト' : ''}</b><br>${set}。2-bit の 3 セットは同じ ${f(p.engramGb)} GB のテーブルを共有します`,
      gb: (v) => `${v} GB`,
      kindMeasured: 'この設定は、ページにある<b>実測の配置</b>です。',
      kindEstimate: 'この設定は<b>教育用の試算</b>です。ページの規則から導いたもので、実測はありません。',
      vFits: (p, f) => `収まります：エキスパート ${f(p.expertsVram)} GB がVRAM、${f(p.expertsRam)} GB が RAM にあり、RAM はまだ ${f(p.spareRamGb)} GB 余っています。`,
      vFitsPool: (p, f) => `収まります：密な重みとすべてのエキスパートが統合メモリプールにあり、テーブルだけが SSD にあります。`,
      vTight: (p, f) => `ぎりぎり収まります：RAM は CPU 側のエキスパートをキャッシュする量を ${f(p.spareRamGb)} GB しか上回らず、4 GB 未満で、余裕はわずかです。`,
      vSpills: (p, f) => `収まりません：${f(p.expertsSsd)} GB のエキスパートを SSD から読む必要があります。動きますが、token を 1 つ書くたびに遅くなります。`,
      vOom: '密な重みがVRAMに収まりません。エンジンは起動時にVRAM不足で止まる可能性があります。',
      vNoCard: 'グラフィックスカードがありません。このエンジンには少なくとも 1 枚必要です。',
      try: [
        '<b>実測マシン：4× R9700</b> を押し、<b>RAM</b> を 251 から 100 GB まで下げます。CPU 側の 172 GB のエキスパートのうち RAM に残れるのは 91 GB だけで、残りの約 82 GB は SSD から読むことになり、判定は「収まりません」に変わります。',
        '<b>IST-DAS 2.00</b> を選び、VRAMを <b>16</b> GB、RAM を <b>160</b> GB にします。エキスパートはすべてVRAMと RAM に収まり、111 GB のテーブルは SSD に置かれます。RAM を <b>400</b> GB に上げると、テーブルは RAM に移ります。',
        '<b>実測マシン：Strix Halo</b> を押し、<b>統合メモリプール</b>を 128 から 64 GB に下げます。常駐するエキスパートは約 109 GB から 46 GB に減り、SSD 上のエキスパートは約 86 GB に増えます。',
      ],
    },
    ko: {
      code: 'DS_TIERS', title: '파일은 어느 층에 놓일까: VRAM, RAM, SSD', tag: '교육용 추정 · 실측 두 곳은 제외',
      intro: '파일 세트를 고르고 이 컴퓨터의 VRAM와 RAM을 고르면, 1.3절의 규칙에 따라 파일이 어느 층에 놓이는지 볼 수 있어요. <b>VRAM</b>에는 밀집 가중치와 들어가는 만큼의 전문가를 놓아요. 들어가지 못한 전문가는 CPU에서 그 자리에서 계산하고 <b>RAM</b>에 남겨요. RAM에도 못 담는 것은 <b>SSD</b>에서 읽어요. 페이지에 나오는 실측 기계 두 대(4× R9700, Strix Halo)는 실측 숫자를 그대로 써요. 나머지 설정은 <b>교육용 추정</b>이고 실측이 없어요.',
      lgDense: '밀집 가중치(어텐션 등, VRAM에 둠)', lgVram: 'VRAM 안의 전문가', lgRam: 'RAM 안의 전문가(CPU에서 그 자리 계산)', lgSsd: 'SSD에서 읽는 전문가', lgTable: 'Engram 조회 테이블', lgDraft: 'DSpark 초안 모델', lgCap: '점선 상자 = 이 층의 용량',
      setLabel: '파일 세트',
      sets: { ud: 'UD-Q8_K_XL · 508.4 GB', ist175: 'IST-DAS 1.75 bpw', ist200: 'IST-DAS 2.00 bpw', ist225: 'IST-DAS 2.25 bpw' },
      machineLabel: '기계 종류',
      machines: ['외장 GPU + RAM', '통합 메모리(풀 하나를 함께 씀)'],
      vramLabel: 'VRAM 합계', poolLabel: '통합 메모리 풀', ramLabel: 'RAM',
      presetLabel: '실측 기계',
      presets: ['4× R9700 + 251 GB RAM · UD 세트', 'Strix Halo 128 GB · 2.00 세트'],
      stage: (set) => `파일 세트 ${set}의 VRAM, RAM, SSD 배치`,
      rowVram: (cap, n) => `VRAM · 용량 ${cap} GB(${n}장)`,
      rowPool: (cap) => `통합 메모리 풀 · 용량 ${cap} GB`,
      rowRam: (cap) => `RAM · 용량 ${cap} GB`,
      rowSsd: 'SSD · 직접 읽기',
      dVram: (d, e) => `밀집 ${d} + 전문가 ${e} GB`,
      dRam: (e, t) => `전문가 ${e} GB` + (t ? ` + 테이블 ${t} GB` : ''),
      dSsd: (e, t, d) => [`전문가 ${e}`, t ? `테이블 ${t}` : '', d ? `초안 ${d}` : ''].filter(Boolean).join(' + ') + ' GB',
      scaleNote: '세 막대는 같은 GB 눈금. 점선은 용량, 채움은 놓은 파일',
      noRam: '통합 메모리에는 별도의 RAM 층이 없어요',
      sVramK: 'VRAM에 놓은 양', sRamK: 'RAM에 놓은 양', sSsdK: 'SSD에 놓은 양', sDiskK: '이 파일 세트의 디스크 사용량',
      sVramF: (p, f) => `<b>= 밀집 ${f(p.denseVram)} + 전문가 ${f(p.expertsVram)}(${Viz.fmt(p.expertsVramCount)}개)</b><br>` + (p.kind === 'measured' ? '실측값, 1.3절에서 가져옴' : `추정: 용량 ${f(p.vramCapGb)} GB에서 카드당 1.15 GB 예약분을 빼고, 밀집 가중치를 뺀 나머지에 전문가를 놓음`),
      sPoolF: (p, f) => `<b>= 밀집 ${f(p.denseVram)} + 전문가 ${f(p.expertsVram)}</b><br>` + (p.kind === 'measured' ? '실측값: 전문가 약 109 GB 상주(1.3절)' : `추정: 풀 ${f(p.vramCapGb)} GB에서 밀집 가중치와 시스템 예약 ${M.UMA_RESERVE_GB} GB를 빼고, 나머지에 전문가를 놓음`),
      sRamF: (p, f) => `<b>= CPU 쪽 전문가 ${f(p.expertsRam + p.expertsSsd)} 중 RAM이 캐시할 수 있는 부분${p.engramWhere === 'ram' ? ' + 테이블 전체' : ''}</b><br>전부 캐시하려면 ${f(p.ramNeededGb)} GB가 필요해요(전문가 + 엔진과 시스템 몫 ${M.REST_RAM_GB} GB). 지금은 ${f(p.ramGb)} GB예요`,
      sRamNone: '—',
      sSsdF: (p, f) => `<b>= SSD에서 읽는 전문가 ${f(p.expertsSsd)} + ${p.engramWhere === 'ssd' ? `Engram 테이블 ${f(p.engramGb)}` : '테이블(이미 RAM에 있음)'}${p.drafterGb ? ` + 초안 ${f(p.drafterGb)}` : ''}</b><br>테이블은 RAM으로 세지 않지만, 토큰을 하나 쓸 때마다 그 몇 행을 읽어요`,
      sDiskF: (p, f, set) => `<b>= 밀집 + 전문가 + 테이블${p.drafterGb ? ' + 초안' : ''}</b><br>${set}. 2-bit 세트 셋은 같은 ${f(p.engramGb)} GB 테이블을 함께 써요`,
      gb: (v) => `${v} GB`,
      kindMeasured: '이 설정은 페이지의 <b>실측 배치</b>예요.',
      kindEstimate: '이 설정은 <b>교육용 추정</b>이에요. 페이지의 규칙으로 계산했고 실측은 없어요.',
      vFits: (p, f) => `들어가요: 전문가 ${f(p.expertsVram)} GB는 VRAM에, ${f(p.expertsRam)} GB는 RAM에 있고, RAM이 ${f(p.spareRamGb)} GB 남아요.`,
      vFitsPool: (p, f) => `들어가요: 밀집 가중치와 모든 전문가가 통합 메모리 풀에 있고, 테이블만 SSD에 있어요.`,
      vTight: (p, f) => `간신히 들어가요: RAM이 CPU 쪽 전문가를 캐시하는 데 필요한 양보다 ${f(p.spareRamGb)} GB만 많아서 4 GB가 안 되고, 여유가 거의 없어요.`,
      vSpills: (p, f) => `안 들어가요: 전문가 ${f(p.expertsSsd)} GB를 SSD에서 읽어야 해요. 돌아가기는 하지만 토큰을 하나 쓸 때마다 느려져요.`,
      vOom: '밀집 가중치가 VRAM에 안 들어가요. 엔진이 시작하자마자 VRAM 부족으로 멈출 수 있어요.',
      vNoCard: '그래픽 카드가 없어요. 이 엔진에는 카드가 한 장 이상 필요해요.',
      try: [
        '<b>실측 기계: 4× R9700</b>을 누르고 <b>RAM</b>을 251에서 100 GB로 끌어내려 보세요. CPU 쪽 전문가 172 GB 중 RAM에 남을 수 있는 것은 91 GB뿐이고, 나머지 약 82 GB는 SSD에서 읽게 되어 판정이 "안 들어가요"로 바뀌어요.',
        '<b>IST-DAS 2.00</b>을 고르고 VRAM를 <b>16</b> GB, RAM을 <b>160</b> GB로 맞춰 보세요. 전문가는 모두 VRAM와 RAM에 들어가고, 111 GB 테이블은 SSD에 놓여요. RAM을 <b>400</b> GB로 올리면 테이블이 RAM으로 옮겨 가요.',
        '<b>실측 기계: Strix Halo</b>를 누르고 <b>통합 메모리 풀</b>을 128에서 64 GB로 낮춰 보세요. 상주 전문가는 약 109 GB에서 46 GB로 줄고, SSD 위의 전문가는 약 86 GB로 늘어요.',
      ],
    },
    es: {
      code: 'DS_TIERS', title: 'En qué nivel va cada archivo: VRAM, RAM, SSD', tag: 'Estimación didáctica · salvo las dos medidas',
      intro: 'Elige un conjunto de archivos y luego la VRAM y la RAM de esta computadora, y verás a qué nivel va cada archivo según las reglas de la sección 1.3. La <b>VRAM</b> aloja los pesos densos y todos los expertos que quepan. Los expertos que no caben se calculan en el sitio, en la CPU, y se quedan en la <b>RAM</b>. Los que la RAM tampoco puede alojar se leen del <b>SSD</b>. Las dos máquinas medidas de la página (4× R9700, Strix Halo) usan directamente los números medidos. Cualquier otro ajuste es una <b>estimación didáctica</b> sin medición detrás.',
      lgDense: 'Pesos densos (atención, etc., en la VRAM)', lgVram: 'Expertos en la VRAM', lgRam: 'Expertos en la RAM (calculados en el sitio en la CPU)', lgSsd: 'Expertos leídos del SSD', lgTable: 'Tabla de búsqueda Engram', lgDraft: 'Modelo borrador DSpark', lgCap: 'Marco discontinuo = capacidad de este nivel',
      setLabel: 'Conjunto de archivos',
      sets: { ud: 'UD-Q8_K_XL · 508,4 GB', ist175: 'IST-DAS 1,75 bpw', ist200: 'IST-DAS 2,00 bpw', ist225: 'IST-DAS 2,25 bpw' },
      machineLabel: 'Tipo de máquina',
      machines: ['GPU dedicada + RAM', 'Memoria unificada (un solo fondo compartido)'],
      vramLabel: 'VRAM total', poolLabel: 'Fondo de memoria unificada', ramLabel: 'RAM',
      presetLabel: 'Máquina medida',
      presets: ['4× R9700 + 251 GB de RAM · conjunto UD', 'Strix Halo 128 GB · conjunto 2,00'],
      stage: (set) => `Colocación del conjunto de archivos ${set} en la VRAM, la RAM y el SSD`,
      rowVram: (cap, n) => `VRAM · capacidad ${cap} GB (${n} tarjetas)`,
      rowPool: (cap) => `Fondo de memoria unificada · capacidad ${cap} GB`,
      rowRam: (cap) => `RAM · capacidad ${cap} GB`,
      rowSsd: 'SSD · lectura directa',
      dVram: (d, e) => `denso ${d} + expertos ${e} GB`,
      dRam: (e, t) => `expertos ${e} GB` + (t ? ` + tabla ${t} GB` : ''),
      dSsd: (e, t, d) => [`expertos ${e}`, t ? `tabla ${t}` : '', d ? `borrador ${d}` : ''].filter(Boolean).join(' + ') + ' GB',
      scaleNote: 'Misma escala de GB: línea = capacidad, relleno = archivos',
      noRam: 'La memoria unificada no tiene un nivel de RAM aparte',
      sVramK: 'Cuánto hay en la VRAM', sRamK: 'Cuánto hay en la RAM', sSsdK: 'Cuánto hay en el SSD', sDiskK: 'Disco que ocupa este conjunto',
      sVramF: (p, f) => `<b>= denso ${f(p.denseVram)} + expertos ${f(p.expertsVram)} (${Viz.fmt(p.expertsVramCount)} expertos)</b><br>` + (p.kind === 'measured' ? 'Valor medido, de la sección 1.3' : `Estimación: de la capacidad de ${f(p.vramCapGb)} GB se resta una reserva de 1,15 GB por tarjeta y luego los pesos densos; lo que queda aloja expertos`),
      sPoolF: (p, f) => `<b>= denso ${f(p.denseVram)} + expertos ${f(p.expertsVram)}</b><br>` + (p.kind === 'measured' ? 'Valor medido: unos 109 GB de expertos residentes (sección 1.3)' : `Estimación: del fondo de ${f(p.vramCapGb)} GB se restan los pesos densos y ${M.UMA_RESERVE_GB} GB de reserva del sistema; lo que queda aloja expertos`),
      sRamF: (p, f) => `<b>= la parte de los expertos del lado de la CPU (${f(p.expertsRam + p.expertsSsd)}) que la RAM puede guardar en caché${p.engramWhere === 'ram' ? ' + la tabla entera' : ''}</b><br>Guardarlos todos en caché requiere ${f(p.ramNeededGb)} GB (expertos + ${M.REST_RAM_GB} GB para el motor y el sistema); hay ${f(p.ramGb)} GB`,
      sRamNone: '—',
      sSsdF: (p, f) => `<b>= expertos leídos del SSD ${f(p.expertsSsd)} + ${p.engramWhere === 'ssd' ? `tabla Engram ${f(p.engramGb)}` : 'tabla (ya en la RAM)'}${p.drafterGb ? ` + borrador ${f(p.drafterGb)}` : ''}</b><br>La tabla no cuenta para la RAM, pero cada token que se escribe lee unas cuantas de sus filas`,
      sDiskF: (p, f, set) => `<b>= denso + expertos + tabla${p.drafterGb ? ' + borrador' : ''}</b><br>${set}; los tres conjuntos de 2 bits comparten la misma tabla de ${f(p.engramGb)} GB`,
      gb: (v) => `${v} GB`,
      kindMeasured: 'Este ajuste es una <b>colocación medida</b> de la página.',
      kindEstimate: 'Este ajuste es una <b>estimación didáctica</b>: sale de las reglas de la página, no de una medición.',
      vFits: (p, f) => `Cabe: ${f(p.expertsVram)} GB de expertos en la VRAM, ${f(p.expertsRam)} GB en la RAM, y sobran ${f(p.spareRamGb)} GB de RAM.`,
      vFitsPool: (p, f) => `Cabe: los pesos densos y todos los expertos están en el fondo de memoria unificada; solo la tabla está en el SSD.`,
      vTight: (p, f) => `Cabe justo: la RAM supera en solo ${f(p.spareRamGb)} GB lo que necesitan los expertos del lado de la CPU, menos de 4 GB, así que el margen es pequeño.`,
      vSpills: (p, f) => `No cabe: hay que leer ${f(p.expertsSsd)} GB de expertos del SSD. Funciona, pero cada token que se escribe va más lento.`,
      vOom: 'Los pesos densos no caben en la VRAM: el motor puede detenerse al arrancar por falta de VRAM.',
      vNoCard: 'No hay tarjeta gráfica: este motor necesita al menos una.',
      try: [
        'Pulsa <b>Máquina medida: 4× R9700</b> y arrastra la <b>RAM</b> de 251 a 100 GB: de los 172 GB de expertos del lado de la CPU solo 91 GB pueden quedarse en la RAM, unos 82 GB pasan a leerse del SSD y el veredicto se convierte en «no cabe».',
        'Elige <b>IST-DAS 2,00</b>, pon la VRAM en <b>16</b> GB y la RAM en <b>160</b> GB: todos los expertos están en la VRAM y la RAM, y la tabla de 111 GB cae en el SSD. Sube la RAM a <b>400</b> GB y la tabla pasa a la RAM.',
        'Pulsa <b>Máquina medida: Strix Halo</b> y baja el <b>fondo de memoria unificada</b> de 128 a 64 GB: los expertos residentes caen de unos 109 GB a 46 GB, y los expertos en el SSD suben a unos 86 GB.',
      ],
    },
    ar: {
      code: 'DS_TIERS', title: 'في أي طبقة توضع الملفات: VRAM أم RAM أم SSD', tag: 'تقدير تعليمي · باستثناء مجموعتين مقيستين',
      intro: 'اختر مجموعة ملفات، ثم اختر VRAM وRAM لهذا الحاسوب، وانظر في أي طبقة يوضع كل ملف بحسب قواعد القسم 1.3. تحمل <b>VRAM</b> الأوزان الكثيفة وأكبر عدد ممكن من الخبراء. أما الخبراء الذين لا يتسع لهم المكان فيُحسبون في موضعهم على CPU ويبقون في <b>RAM</b>. والذين لا تتسع لهم RAM أيضًا يُقرؤون من <b>SSD</b>. الجهازان المقيسان في الصفحة (4× R9700 وStrix Halo) يستخدمان الأرقام المقيسة مباشرة. وكل إعداد آخر هو <b>تقدير تعليمي</b> لا قياس وراءه.',
      lgDense: 'الأوزان الكثيفة (الانتباه وغيره، في VRAM)', lgVram: 'خبراء في VRAM', lgRam: 'خبراء في RAM (تُحسب في موضعها على CPU)', lgSsd: 'خبراء يُقرؤون من SSD', lgTable: 'جدول البحث Engram', lgDraft: 'نموذج المسودة DSpark', lgCap: 'الإطار المتقطع = سعة هذه الطبقة',
      setLabel: 'مجموعة الملفات',
      sets: { ud: 'UD-Q8_K_XL · 508.4 GB', ist175: 'IST-DAS 1.75 bpw', ist200: 'IST-DAS 2.00 bpw', ist225: 'IST-DAS 2.25 bpw' },
      machineLabel: 'نوع الجهاز',
      machines: ['بطاقة رسوميات منفصلة + RAM', 'ذاكرة موحدة (مجمّع واحد مشترك)'],
      vramLabel: 'إجمالي VRAM', poolLabel: 'مجمّع الذاكرة الموحدة', ramLabel: 'RAM',
      presetLabel: 'جهاز مقيس',
      presets: ['4× R9700 + 251 GB من RAM · مجموعة UD', 'Strix Halo 128 GB · مجموعة 2.00'],
      stage: (set) => `توزيع مجموعة الملفات ${set} على VRAM وRAM وSSD`,
      rowVram: (cap, n) => `VRAM · السعة ${cap} GB · البطاقات: ${n}`,
      rowPool: (cap) => `مجمّع الذاكرة الموحدة · السعة ${cap} GB`,
      rowRam: (cap) => `RAM · السعة ${cap} GB`,
      rowSsd: 'SSD · قراءة مباشرة',
      dVram: (d, e) => `كثيفة ${d} + خبراء ${e} GB`,
      dRam: (e, t) => `خبراء ${e} GB` + (t ? ` + جدول ${t} GB` : ''),
      dSsd: (e, t, d) => [`خبراء ${e}`, t ? `جدول ${t}` : '', d ? `مسودة ${d}` : ''].filter(Boolean).join(' + ') + ' GB',
      scaleNote: 'مسطرة GB واحدة للأشرطة؛ متقطع = سعة، ممتلئ = ملفات',
      noRam: 'الذاكرة الموحدة بلا طبقة RAM منفصلة',
      sVramK: 'كم يوضع في VRAM', sRamK: 'كم يوضع في RAM', sSsdK: 'كم يوضع على SSD', sDiskK: 'حجم هذه المجموعة على القرص',
      sVramF: (p, f) => `<b>= كثيفة ${f(p.denseVram)} + خبراء ${f(p.expertsVram)} (${Viz.fmt(p.expertsVramCount)} خبيرًا)</b><br>` + (p.kind === 'measured' ? 'قيمة مقيسة، من القسم 1.3' : `تقدير: من السعة ${f(p.vramCapGb)} GB يُطرح حجز قدره 1.15 GB لكل بطاقة ثم الأوزان الكثيفة، ويوضع الخبراء في الباقي`),
      sPoolF: (p, f) => `<b>= كثيفة ${f(p.denseVram)} + خبراء ${f(p.expertsVram)}</b><br>` + (p.kind === 'measured' ? 'قيمة مقيسة: نحو 109 GB من الخبراء مقيمة (القسم 1.3)' : `تقدير: من المجمّع ${f(p.vramCapGb)} GB تُطرح الأوزان الكثيفة وحجز النظام ${M.UMA_RESERVE_GB} GB، ويوضع الخبراء في الباقي`),
      sRamF: (p, f) => `<b>= الجزء الذي تستطيع RAM تخزينه مؤقتًا من خبراء جانب CPU (${f(p.expertsRam + p.expertsSsd)})${p.engramWhere === 'ram' ? ' + الجدول كله' : ''}</b><br>يتطلب تخزينهم جميعًا ${f(p.ramNeededGb)} GB (الخبراء + ${M.REST_RAM_GB} GB للمحرك والنظام)، والمتاح ${f(p.ramGb)} GB`,
      sRamNone: '—',
      sSsdF: (p, f) => `<b>= خبراء يُقرؤون من SSD ${f(p.expertsSsd)} + ${p.engramWhere === 'ssd' ? `جدول Engram ${f(p.engramGb)}` : 'الجدول (موجود في RAM)'}${p.drafterGb ? ` + مسودة ${f(p.drafterGb)}` : ''}</b><br>لا يُحسب الجدول من RAM، لكن كل رمز يُكتب يقرأ بضعة صفوف منه`,
      sDiskF: (p, f, set) => `<b>= كثيفة + خبراء + جدول${p.drafterGb ? ' + مسودة' : ''}</b><br>${set}؛ وتتشارك مجموعات 2-bit الثلاث الجدول نفسه البالغ ${f(p.engramGb)} GB`,
      gb: (v) => `${v} GB`,
      kindMeasured: 'هذا الإعداد <b>توزيع مقيس</b> من الصفحة.',
      kindEstimate: 'هذا الإعداد <b>تقدير تعليمي</b>: مستنتج من قواعد الصفحة وليس مقيسًا.',
      vFits: (p, f) => `يتسع: ${f(p.expertsVram)} GB من الخبراء في VRAM و${f(p.expertsRam)} GB في RAM، ويبقى ${f(p.spareRamGb)} GB فارغة في RAM.`,
      vFitsPool: (p, f) => `يتسع: الأوزان الكثيفة وكل الخبراء في مجمّع الذاكرة الموحدة، والجدول وحده على SSD.`,
      vTight: (p, f) => `يتسع بالكاد: تزيد RAM على ما يحتاجه تخزين خبراء جانب CPU بمقدار ${f(p.spareRamGb)} GB فقط، أي أقل من 4 GB، فالهامش صغير.`,
      vSpills: (p, f) => `لا يتسع: يجب قراءة ${f(p.expertsSsd)} GB من الخبراء من SSD. يعمل، لكن كل رمز يُكتب يصبح أبطأ.`,
      vOom: 'لا تتسع الأوزان الكثيفة في VRAM: قد يتوقف المحرك عند البدء بسبب نقص VRAM.',
      vNoCard: 'لا توجد بطاقة رسوميات: يحتاج هذا المحرك إلى بطاقة واحدة على الأقل.',
      try: [
        'اضغط <b>جهاز مقيس: 4× R9700</b>، ثم اسحب <b>RAM</b> من 251 إلى 100 GB: لا يبقى في RAM إلا 91 GB من خبراء جانب CPU البالغة 172 GB، ويُقرأ نحو 82 GB من SSD بدلًا منها، فيصبح الحكم «لا يتسع».',
        'اختر <b>IST-DAS 2.00</b> واضبط VRAM على <b>16</b> GB وRAM على <b>160</b> GB: كل الخبراء في VRAM وRAM، ويقع الجدول البالغ 111 GB على SSD. ارفع RAM إلى <b>400</b> GB وسينتقل الجدول إلى RAM.',
        'اضغط <b>جهاز مقيس: Strix Halo</b> وأنزل <b>مجمّع الذاكرة الموحدة</b> من 128 إلى 64 GB: ينخفض الخبراء المقيمون من نحو 109 GB إلى 46 GB، ويرتفع الخبراء على SSD إلى نحو 86 GB.',
      ],
    },
  });

  const f1 = (x) => Viz.fmt(x, 1);

  Viz.register('ds-overview-tiers', {
    mount(el) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--a3)', text: T.lgDense },
        { color: 'var(--a2)', text: T.lgVram },
        { color: 'var(--accent)', text: T.lgRam },
        { color: 'var(--side)', text: T.lgSsd },
        { color: 'var(--frame)', text: T.lgTable },
        { color: 'var(--muted)', text: T.lgDraft },
        { color: 'transparent', text: T.lgCap },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const lab = 'font-family:var(--mono);font-size:12px;color:var(--muted)';
      const btn = (attr, i, label) => `<button type="button" class="viz-btn ghost" data-${attr}="${i}" aria-pressed="false" style="padding:5px 9px;font-size:12px;min-width:0">${Viz.esc(label)}</button>`;
      left.insertAdjacentHTML('beforeend',
        `<div class="viz-row" style="margin-top:0" role="group" aria-label="${Viz.esc(T.setLabel)}"><span style="${lab}">${T.setLabel}</span>${M.SET_IDS.map((id, i) => btn('set', i, T.sets[id])).join('')}</div>
        <div class="viz-row" role="group" aria-label="${Viz.esc(T.machineLabel)}"><span style="${lab}">${T.machineLabel}</span>${T.machines.map((l, i) => btn('machine', i, l)).join('')}</div>
        <div class="viz-row" role="group" aria-label="${Viz.esc(T.presetLabel)}"><span style="${lab}">${T.presetLabel}</span>${T.presets.map((l, i) => btn('preset', i, l)).join('')}</div>
        <div class="viz-slider" data-row="vram"><label></label><input type="range" min="8" max="192" step="8" value="${M.DEFAULT.vram}"><output></output></div>
        <div class="viz-slider" data-row="ram"><label>${T.ramLabel}</label><input type="range" min="16" max="512" step="1" value="${M.DEFAULT.ram}" aria-label="${Viz.esc(T.ramLabel)}"><output></output></div>`);
      const svg = Viz.svg('svg', { viewBox: '0 0 400 214', class: 'viz-stage', role: 'img' }, left);
      right.innerHTML =
        Viz.stat({ id: 't-vram', k: T.sVramK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 't-ram', k: T.sRamK, v: '', f: '' }) +
        Viz.stat({ id: 't-ssd', k: T.sSsdK, v: '', f: '' }) +
        Viz.stat({ id: 't-disk', k: T.sDiskK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" aria-live="polite"></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const vramRange = $('[data-row=vram] input'), ramRange = $('[data-row=ram] input');
      const st = { ...M.DEFAULT };

      const txt = (x, y, s, color) => { const t = Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': 'start', style: `fill:${color || 'var(--muted)'}` }, svg); t.textContent = s; return t; };

      function draw() {
        const p = M.place(st), set = M.SETS[st.setId];
        const disk = M.diskGb(st.setId);
        // One GB ruler for the three rows: the largest of the files and the two capacities.
        const scale = Math.max(disk, p.vramCapGb, p.ramGb) / 400;
        svg.innerHTML = '';
        svg.setAttribute('aria-label', T.stage(T.sets[st.setId]));
        const rows = [
          { title: st.unified ? T.rowPool(f1(p.vramCapGb)) : T.rowVram(f1(p.vramCapGb), p.cards), cap: p.vramCapGb,
            segs: [[p.denseVram, 'var(--a3)'], [p.expertsVram, 'var(--a2)']], detail: T.dVram(f1(p.denseVram), f1(p.expertsVram)) },
          { title: st.unified ? T.noRam : T.rowRam(f1(p.ramGb)), cap: st.unified ? 0 : p.ramGb,
            segs: [[p.expertsRam, 'var(--accent)'], [p.engramWhere === 'ram' ? p.engramGb : 0, 'var(--frame)']], detail: st.unified ? '' : T.dRam(f1(p.expertsRam), p.engramWhere === 'ram' ? f1(p.engramGb) : '') },
          { title: T.rowSsd, cap: 0,
            segs: [[p.expertsSsd, 'var(--side)'], [p.engramWhere === 'ssd' ? p.engramGb : 0, 'var(--frame)'], [p.drafterGb, 'var(--muted)']], detail: T.dSsd(f1(p.expertsSsd), p.engramWhere === 'ssd' ? f1(p.engramGb) : '', p.drafterGb ? f1(p.drafterGb) : '') },
        ];
        rows.forEach((r, i) => {
          const y = 4 + i * 62;
          txt(0, y + 12, r.title, 'var(--ink)');
          let x = 0;
          for (const [gb, color] of r.segs) {
            if (!(gb > 0)) continue;
            const w = Math.max(1, gb / scale);
            Viz.svg('rect', { x, y: y + 20, width: w, height: 16, style: `fill:${color}` }, svg);
            x += w;
          }
          if (r.cap > 0) Viz.svg('rect', { x: 0.5, y: y + 19.5, width: Math.max(1, r.cap / scale - 1), height: 17, style: 'fill:none;stroke:var(--muted);stroke-dasharray:4 3' }, svg);
          if (r.detail) txt(0, y + 54, r.detail);
        });
        txt(0, 206, T.scaleNote);

        const v = (id, val, form) => { $(`[data-s=${id}-v]`).textContent = val; $(`[data-s=${id}-f]`).innerHTML = form; };
        v('t-vram', T.gb(f1(p.tiers.vram)), st.unified ? T.sPoolF(p, f1) : T.sVramF(p, f1));
        v('t-ram', st.unified ? T.sRamNone : T.gb(f1(p.tiers.ram)), st.unified ? T.noRam : T.sRamF(p, f1));
        v('t-ssd', T.gb(f1(p.tiers.ssd)), T.sSsdF(p, f1));
        v('t-disk', T.gb(f1(disk)), T.sDiskF(p, f1, set.label));
        const word = { fits: st.unified ? T.vFitsPool(p, f1) : T.vFits(p, f1), tight: T.vTight(p, f1), spills: T.vSpills(p, f1), oom: T.vOom, noCard: T.vNoCard }[p.verdict];
        $('.viz-verdict').innerHTML = `${word}<br>${p.kind === 'measured' ? T.kindMeasured : T.kindEstimate}`;

        el.querySelectorAll('[data-set]').forEach(b => { const on = M.SET_IDS[+b.dataset.set] === st.setId; b.classList.toggle('ghost', !on); b.setAttribute('aria-pressed', on); });
        el.querySelectorAll('[data-machine]').forEach(b => { const on = (+b.dataset.machine === 1) === st.unified; b.classList.toggle('ghost', !on); b.setAttribute('aria-pressed', on); });
        const presets = [M.PRESETS.r9700.state, M.PRESETS.strix.state];
        el.querySelectorAll('[data-preset]').forEach(b => {
          const s = presets[+b.dataset.preset], on = s.setId === st.setId && s.unified === st.unified && s.vram === st.vram && (s.unified || s.ram === st.ram);
          b.classList.toggle('ghost', !on); b.setAttribute('aria-pressed', on);
        });
        const vl = st.unified ? T.poolLabel : T.vramLabel;
        $('[data-row=vram] label').textContent = vl;
        vramRange.setAttribute('aria-label', vl);
        vramRange.value = st.vram; ramRange.value = st.ram;
        $('[data-row=vram] output').textContent = st.vram + ' GB';
        $('[data-row=ram] output').textContent = st.ram + ' GB';
        $('[data-row=ram]').hidden = st.unified;
      }

      el.querySelectorAll('[data-set]').forEach(b => { b.onclick = () => { st.setId = M.SET_IDS[+b.dataset.set]; draw(); }; });
      el.querySelectorAll('[data-machine]').forEach(b => { b.onclick = () => { st.unified = +b.dataset.machine === 1; draw(); }; });
      el.querySelectorAll('[data-preset]').forEach(b => { b.onclick = () => { Object.assign(st, [M.PRESETS.r9700.state, M.PRESETS.strix.state][+b.dataset.preset]); if (st.unified) st.ram = M.DEFAULT.ram; draw(); }; });
      vramRange.oninput = () => { st.vram = +vramRange.value; draw(); };
      ramRange.oninput = () => { st.ram = +ramRange.value; draw(); };
      draw();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
