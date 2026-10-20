/* DeepInfer column, page wide-ep: the EP width explorer and the EPLB simulator.
   All visible text lives in the T table below (zh is the master). Numbers come from di-wide-ep.math.js. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.diWideEp;

  const T = Viz.t({
    zh: {
      code: 'WIDE_EP', title: 'EP 宽度推演：从 8 张卡到 128 张卡', tag: '教学推演 · 384 个专家来自上游图例',
      intro: '选一个 EP 宽度，看<b>一张卡</b>在<b>一个 MoE 层、一步解码</b>里要干多少活。专家数 384 来自上游的对比图；每个专家的字节数 S 和每个 token 选几个专家 k 在仓库里查不到，所以下面用 S 和 k 当单位，只比较倍数。',
      lgSlot: '方块 = 本卡负责的专家', lgCopy: '方块 = 冗余槽位（放热门专家的副本）', lgW: '条 = 本卡每步要读的专家权重', lgA: '条 = 本卡每步发出的隐藏向量（分发）',
      epLabel: 'EP 宽度', modeLabel: '冗余下限',
      modes: ['每卡至少 1 个（Q&A 解码设置）', '总数至少 32 个（示例脚本默认）'],
      tLabel: '每卡每步 token 数 T',
      cardTitle: (ep, n) => `EP${ep}：一张卡上放 ${n} 个专家`,
      barTitleW: '每卡要读的专家权重（单位 S）', barTitleA: '每卡发出的隐藏向量（单位 k）',
      sLocalK: '每张卡放几个专家（每个 MoE 层）',
      sLocalF: (l) => `<b>= (384 + ${l.extra}) ÷ ${l.ep}</b><br>冗余下限 ${l.minExtra} 个，向上取整到 384 + 冗余能被 EP 整除`,
      sWK: '每步每层要读的专家权重',
      sWV: (n) => `${n} × S`,
      sWF: (pct) => `<b>= 每卡专家数 × S</b>，是 EP8 的 ${pct}%<br>S = 一个专家的权重字节数；假设本卡每个专家这一步都至少被一个 token 选中`,
      sTK: '一份专家权重读一次，平均服务多少 token',
      sTV: (x) => `≈ ${x} × k`,
      sTF: (t, n) => `<b>= T × k ÷ 每卡专家数 = ${t} × k ÷ ${n}</b><br>按负载完全均衡估算；k = 每个 token 选几个专家`,
      sAK: '本卡每步发出的隐藏向量（分发）',
      sAV: (x) => `≈ ${x} × k`,
      sAF: (t, ep) => `<b>= T × k × (EP − 1) ÷ EP = ${t} × k × ${ep - 1} ÷ ${ep}</b><br>合并时再收回同样多；按目标卡均匀分布的估计值，上界是 T × k`,
      verdict: (ep, w, tk, a) => `EP${ep} 和 EP8 比：每卡每步读的专家权重是 EP8 的 <b>${w}%</b>；一份权重服务的 token 是 EP8 的 <b>${tk} 倍</b>；每卡发出的向量是 EP8 的 <b>${a} 倍</b>。宽度换来的是“读得少、用得满”，代价是更大的通信组。`,
      try: [
        '依次点 <b>EP8 → EP64 → EP128</b>：本卡的方块从 49 个降到 7 个、再到 4 个，下面的权重条跟着缩短，向量条几乎不动。',
        '切到 <b>总数至少 32 个</b>：EP8 变成 52 个、EP64 仍是 7 个。冗余下限只是下限，代码会向上取整到能被 EP 整除。',
        '把 <b>T</b> 从 384 拉到 64：一份权重服务的 token 跟着变少。批越小，权重越难“用满”，这就是解码要攒大批的原因。',
      ],

      eCode: 'EPLB_SIM', eTitle: '专家负载均衡：先复制热门，再重新摆放', eTag: '教学推演 · 负载为随机生成',
      eIntro: '一层只画 16 个专家、4 张卡。每卡 5 个槽位，一共 20 个，比专家多出的 4 个就是冗余槽位。按 <b>单步</b>，看 EPLB 怎样根据一个统计窗口的负载，给热门专家加副本、再把所有副本重新分到各张卡。算法按 <code>policy.py</code> 移植，简化成单层。',
      eLgCold: '普通专家', eLgHot: '热门专家（只有一份）', eLgCopy: '有多份副本的专家', eLgMean: '虚线 = 平均每卡负载',
      eSteps: ['原始布局', '统计窗口', '复制热门', '重新摆放', '下一窗口'],
      eStage: '4 张卡的负载和专家槽位',
      card: (c) => `卡 ${c}`,
      bStep: '▶ 单步', bShuffle: '换一批热门', bReset: '重置',
      eReady: '<span class="c">$</span> ready. 按 [ ▶ 单步 ] 开始',
      sLbK: '当前 moe_lb（最忙的卡 ÷ 平均）', sLbF: '<b>= Σ 最忙那张卡的 token ÷ Σ 平均每卡 token</b><br>对窗口里 4 步求和，和 stats_logger 的算法一样',
      sHistK: 'moe_lb 变化', sHistNone: '按“单步”往下走',
      sHist: (a) => a.map(([n, v]) => `${n} ${v}`).join(' → '),
      sSlotK: '槽位', sSlotV: '16 + 4 = 20 个', sSlotF: '每卡至少 1 个冗余，取整后 20 个槽位，每卡 5 个',
      hist: ['原始', '复制后', '重排后', '下一窗口'],
      l0: (hot, n, lb) => `<span class="c">原始布局</span>：槽位按 [0…15, 0, 1, 2, 3] 排开。热门专家 ${hot} 里有 ${n} 个落在同一张卡上。moe_lb = <span class="w">${lb}</span>`,
      l1: (top, n) => `<span class="m">统计窗口</span>：dispatch 时每张卡给本地专家累加收到的 token 数；重排时全组 all-reduce 汇总。窗口里最热的 ${top} 收到 ${n} 个`,
      l2: (ids, lb) => `<span class="y">复制热门</span>：4 个冗余槽位依次给了 ${ids}。副本先留在原来的冗余槽位里，所以还没拉平：moe_lb = ${lb}`,
      l3: (a, b) => `<span class="c">重新摆放</span>：副本按负载从大到小，逐个放到“放下后最忙的卡最不忙”的那张卡。moe_lb ${a} → <span class="w">${b}</span>。接着按新映射搬权重`,
      l4: (lb) => `<span class="y">下一窗口</span>：热门不变，负载换一批随机数，布局不动。moe_lb = <span class="w">${lb}</span>，比统计窗口略差：EPLB 用过去预测未来`,
      restart: '<span class="y">// 已走完，从原始布局重新开始</span>',
      shuffled: (hot) => `<span class="y">// 换了一批热门：${hot}</span>`,
      eVerdict: (a, b, c) => `① 热门专家扎堆时，最忙的卡是平均的 <b>${a}</b> 倍，整层都要等它。<br>② 给热门专家加副本、再重新摆放后降到 <b>${b}</b>。<br>③ 换一个窗口检验是 <b>${c}</b>：统计窗口越像未来，效果越好。上游实测的解码 moe_lb 是 1.090。`,
      eTry: [
        '连按 <b>单步</b>，看第 3 步“复制热门”：副本先挤在卡 3 的冗余槽位里，卡 3 反而变忙；第 4 步重新摆放后才拉平。',
        '按 <b>换一批热门</b>，热门专家可能本来就分散在几张卡上，原始 moe_lb 低得多，EPLB 能改进的空间也小。',
        '看第 5 步：同一套布局换一批负载，moe_lb 会回升一点。这说明为什么要定期重排，而不是排一次就不管。',
      ],
    },
    en: {
      code: 'WIDE_EP', title: 'EP width explorer: from 8 GPUs to 128 GPUs', tag: 'Teaching estimate · 384 experts from the upstream legend',
      intro: 'Pick an EP width and see how much work <b>one GPU</b> does in <b>one MoE layer, one decode step</b>. The 384 experts come from the upstream comparison chart. The bytes per expert, S, and the number of experts each token picks, k, cannot be found in the repository. So below, S and k are the units, and only ratios are compared.',
      lgSlot: 'Square = an expert this GPU owns', lgCopy: 'Square = redundant slot (holds a copy of a popular expert)', lgW: 'Bar = expert weights this GPU reads per step', lgA: 'Bar = hidden vectors this GPU sends per step (dispatch)',
      epLabel: 'EP width', modeLabel: 'Redundancy floor',
      modes: ['At least 1 per GPU (Q&A decode setting)', 'At least 32 in total (example script default)'],
      tLabel: 'Tokens per GPU per step, T',
      cardTitle: (ep, n) => `EP${ep}: ${n} experts on one GPU`,
      barTitleW: 'Expert weights read per GPU (unit S)', barTitleA: 'Hidden vectors sent per GPU (unit k)',
      sLocalK: 'Experts per GPU (each MoE layer)',
      sLocalF: (l) => `<b>= (384 + ${l.extra}) ÷ ${l.ep}</b><br>Redundancy floor ${l.minExtra}, rounded up so that 384 + redundant divides evenly by EP`,
      sWK: 'Expert weights read per layer per step',
      sWV: (n) => `${n} × S`,
      sWF: (pct) => `<b>= experts per GPU × S</b>, ${pct}% of EP8<br>S = bytes of one expert’s weights; assumes every expert on this GPU is chosen by at least one token in this step`,
      sTK: 'Tokens served on average by one read of an expert’s weights',
      sTV: (x) => `≈ ${x} × k`,
      sTF: (t, n) => `<b>= T × k ÷ experts per GPU = ${t} × k ÷ ${n}</b><br>Estimated for a perfectly balanced load; k = experts picked per token`,
      sAK: 'Hidden vectors this GPU sends per step (dispatch)',
      sAV: (x) => `≈ ${x} × k`,
      sAF: (t, ep) => `<b>= T × k × (EP − 1) ÷ EP = ${t} × k × ${ep - 1} ÷ ${ep}</b><br>Combine brings back as many; an estimate with targets spread evenly over GPUs; the upper bound is T × k`,
      verdict: (ep, w, tk, a) => `EP${ep} vs EP8: the expert weights read per GPU per step are <b>${w}%</b> of EP8; the tokens served by one set of weights are <b>${tk}×</b> EP8; the vectors sent per GPU are <b>${a}×</b> EP8. Width buys “read less, use fully”. The price is a larger communication group.`,
      try: [
        'Click <b>EP8 → EP64 → EP128</b> in turn: the squares of this GPU drop from 49 to 7 and then to 4, the weight bar below shrinks with them, and the vector bar barely moves.',
        'Switch to <b>at least 32 in total</b>: EP8 becomes 52 and EP64 stays 7. The redundancy floor is only a floor, and the code rounds up so that EP divides evenly.',
        'Drag <b>T</b> from 384 down to 64: the tokens served by one set of weights shrink too. The smaller the batch, the harder it is to “use the weights fully”. This is why decode gathers a large batch.',
      ],

      eCode: 'EPLB_SIM', eTitle: 'Expert load balancing: copy the popular ones, then place again', eTag: 'Teaching estimate · randomly generated load',
      eIntro: 'Each layer shows only 16 experts and 4 GPUs. Each GPU has 5 slots, 20 in total. The 4 slots beyond the experts are the redundant slots. Go <b>step by step</b> and see how EPLB uses the load of one statistics window to add copies of popular experts, and then places all copies on the GPUs again. The algorithm is ported from <code>policy.py</code> and simplified to a single layer.',
      eLgCold: 'Ordinary expert', eLgHot: 'Popular expert (one copy only)', eLgCopy: 'Expert with several copies', eLgMean: 'Dashed line = average load per GPU',
      eSteps: ['Initial layout', 'Statistics window', 'Copy popular', 'Place again', 'Next window'],
      eStage: 'Load and expert slots of 4 GPUs',
      card: (c) => `GPU ${c}`,
      bStep: '▶ Step', bShuffle: 'New popular set', bReset: 'Reset',
      eReady: '<span class="c">$</span> ready. Press [ ▶ Step ] to start',
      sLbK: 'Current moe_lb (busiest GPU ÷ average)', sLbF: '<b>= Σ tokens of the busiest GPU ÷ Σ average tokens per GPU</b><br>Summed over the 4 steps of the window, the same as the stats_logger algorithm',
      sHistK: 'moe_lb history', sHistNone: 'Press “Step” to go on',
      sHist: (a) => a.map(([n, v]) => `${n} ${v}`).join(' → '),
      sSlotK: 'Slots', sSlotV: '16 + 4 = 20', sSlotF: 'At least 1 redundant slot per GPU; after rounding, 20 slots, 5 per GPU',
      hist: ['Initial', 'After copy', 'After placing', 'Next window'],
      l0: (hot, n, lb) => `<span class="c">Initial layout</span>: slots are laid out as [0…15, 0, 1, 2, 3]. Of the popular experts ${hot}, ${n} sit on the same GPU. moe_lb = <span class="w">${lb}</span>`,
      l1: (top, n) => `<span class="m">Statistics window</span>: at dispatch, each GPU adds up the tokens received by its local experts; at rearrangement, the whole group sums them with an all-reduce. The hottest expert in the window, ${top}, received ${n} tokens`,
      l2: (ids, lb) => `<span class="y">Copy popular</span>: the 4 redundant slots went in turn to ${ids}. The copies still stay in their old redundant slots, so the load is not flat yet: moe_lb = ${lb}`,
      l3: (a, b) => `<span class="c">Place again</span>: the copies, from the largest load to the smallest, go one by one to the GPU where the busiest GPU is least busy after placing. moe_lb ${a} → <span class="w">${b}</span>. Then the weights move by the new map`,
      l4: (lb) => `<span class="y">Next window</span>: the popular set stays, the load becomes a new batch of random numbers, and the layout does not move. moe_lb = <span class="w">${lb}</span>, a little worse than in the statistics window: EPLB uses the past to predict the future`,
      restart: '<span class="y">// Finished. Starting again from the initial layout</span>',
      shuffled: (hot) => `<span class="y">// New popular set: ${hot}</span>`,
      eVerdict: (a, b, c) => `① When popular experts crowd together, the busiest GPU has <b>${a}</b> times the average load, and the whole layer waits for it.<br>② After copying the popular experts and placing them again, it drops to <b>${b}</b>.<br>③ A test on another window gives <b>${c}</b>: the more the statistics window looks like the future, the better it works. The decode moe_lb that upstream measured is 1.090.`,
      eTry: [
        'Press <b>Step</b> several times and watch step 3, “Copy popular”: the copies first crowd into the redundant slots of GPU 3, and GPU 3 gets busier. Only step 4, “Place again”, evens it out.',
        'Press <b>New popular set</b>. The popular experts may already spread over several GPUs. Then the initial moe_lb is much lower, and EPLB has less room to improve.',
        'Look at step 5: the same layout with a new batch of load makes moe_lb rise a little. This shows why EPLB rearranges at regular intervals and not once and for all.',
      ],
    },
    ja: {
      code: 'WIDE_EP', title: 'EP 幅のシミュレーター：GPU 8 枚から 128 枚まで', tag: '教育用の試算 · 384 個のエキスパートは上流の凡例から',
      intro: 'EP の幅を選んで、<b>1 枚の GPU</b> が <b>MoE の 1 層、デコード 1 ステップ</b>でどれだけ仕事をするかを見ます。エキスパート数 384 は上流の比較図からとりました。1 つのエキスパートのバイト数 S と、token が選ぶエキスパート数 k は、リポジトリから調べられません。そこで以下では S と k を単位にして、倍率だけを比べます。T は、1 枚の GPU が 1 ステップで処理する token 数です。',
      lgSlot: '四角 = この GPU が受け持つエキスパート', lgCopy: '四角 = 冗長スロット（人気のエキスパートのコピーを置く）', lgW: '棒 = この GPU がステップごとに読むエキスパートの重み', lgA: '棒 = この GPU がステップごとに送る隠れベクトル（ディスパッチ）',
      epLabel: 'EP の幅', modeLabel: '冗長の下限',
      modes: ['GPU あたり 1 個以上（Q&A）', '合計 32 個以上（サンプル）'],
      tLabel: 'GPU あたり token 数 T',
      cardTitle: (ep, n) => `EP${ep}：1 枚の GPU に ${n} 個のエキスパート`,
      barTitleW: 'GPU あたり読むエキスパートの重み（単位 S）', barTitleA: 'GPU あたり送る隠れベクトル（単位 k）',
      sLocalK: '1 枚の GPU が持つエキスパート数（MoE の各層）',
      sLocalF: (l) => `<b>= (384 + ${l.extra}) ÷ ${l.ep}</b><br>冗長の下限は ${l.minExtra} 個。384 + 冗長が EP で割り切れるよう切り上げます`,
      sWK: '1 層・1 ステップで読むエキスパートの重み',
      sWV: (n) => `${n} × S`,
      sWF: (pct) => `<b>= GPU あたりのエキスパート数 × S</b>。EP8 の ${pct}%<br>S = 1 つのエキスパートの重みのバイト数。この GPU の各エキスパートは、このステップで少なくとも 1 つの token に選ばれると仮定します`,
      sTK: 'エキスパートの重みを 1 回読んで、平均で処理する token 数',
      sTV: (x) => `≈ ${x} × k`,
      sTF: (t, n) => `<b>= T × k ÷ GPU あたりのエキスパート数 = ${t} × k ÷ ${n}</b><br>負荷が完全に均等として見積もり。k = token が選ぶエキスパート数`,
      sAK: 'この GPU がステップごとに送る隠れベクトル（ディスパッチ）',
      sAV: (x) => `≈ ${x} × k`,
      sAF: (t, ep) => `<b>= T × k × (EP − 1) ÷ EP = ${t} × k × ${ep - 1} ÷ ${ep}</b><br>コンバインで同じ数が戻ってきます。宛先の GPU が均等に分布するとした見積もりで、上限は T × k`,
      verdict: (ep, w, tk, a) => `EP${ep} を EP8 と比べると、1 枚の GPU がステップごとに読むエキスパートの重みは EP8 の <b>${w}%</b>、重み 1 組が処理する token は EP8 の <b>${tk} 倍</b>、GPU が送るベクトルは EP8 の <b>${a} 倍</b>です。幅を広げると「読む量は少なく、使い切る」が手に入ります。代わりに、通信するグループは大きくなります。`,
      try: [
        '<b>EP8 → EP64 → EP128</b> の順に押してみましょう。この GPU の四角は 49 個から 7 個、さらに 4 個へ減り、下の重みの棒もそれに合わせて短くなります。ベクトルの棒はほとんど動きません。',
        '<b>合計 32 個以上</b>に切り替えます。EP8 は 52 個になり、EP64 は 7 個のままです。冗長の下限はあくまで下限で、コードは EP で割り切れるよう切り上げます。',
        '<b>T</b> を 384 から 64 に下げます。重み 1 組が処理する token も減ります。バッチが小さいほど、重みを「使い切る」のは難しくなります。デコードが大きなバッチをためる理由はここにあります。',
      ],

      eCode: 'EPLB_SIM', eTitle: 'エキスパート負荷分散：人気のものを複製し、置き直す', eTag: '教育用の試算 · 負荷は乱数で生成',
      eIntro: '1 層につき、16 個のエキスパートと 4 枚の GPU だけを描きます。各 GPU に 5 個のスロットがあり、合計 20 個です。エキスパートより多い 4 個が冗長スロットです。<b>1 ステップずつ</b>進めて、EPLB が 1 つの統計ウィンドウの負荷から、人気のエキスパートにコピーを足し、すべてのコピーを GPU に置き直す様子を見ます。アルゴリズムは <code>policy.py</code> から移植し、1 層に簡略化しています。',
      eLgCold: '普通のエキスパート', eLgHot: '人気のエキスパート（コピーは 1 つだけ）', eLgCopy: 'コピーが複数あるエキスパート', eLgMean: '点線 = GPU あたりの平均負荷',
      eSteps: ['元の配置', '統計ウィンドウ', '人気を複製', '置き直し', '次のウィンドウ'],
      eStage: '4 枚の GPU の負荷とエキスパートスロット',
      card: (c) => `GPU ${c}`,
      bStep: '▶ 1 ステップ', bShuffle: '人気を入れ替え', bReset: 'リセット',
      eReady: '<span class="c">$</span> ready. [ ▶ 1 ステップ ] を押して開始',
      sLbK: '現在の moe_lb（最も忙しい GPU ÷ 平均）', sLbF: '<b>= Σ 最も忙しい GPU の token ÷ Σ GPU あたり平均の token</b><br>ウィンドウ内の 4 ステップを合計します。stats_logger と同じ計算です',
      sHistK: 'moe_lb の変化', sHistNone: '「1 ステップ」を押して進めましょう',
      sHist: (a) => a.map(([n, v]) => `${n} ${v}`).join(' → '),
      sSlotK: 'スロット', sSlotV: '16 + 4 = 20 個', sSlotF: 'GPU あたり冗長 1 個以上。切り上げて 20 スロット、GPU あたり 5 個',
      hist: ['元の配置', '複製後', '置き直し後', '次のウィンドウ'],
      l0: (hot, n, lb) => `<span class="c">元の配置</span>：スロットは [0…15, 0, 1, 2, 3] の順に並びます。人気のエキスパート ${hot} のうち ${n} 個が同じ GPU にあります。moe_lb = <span class="w">${lb}</span>`,
      l1: (top, n) => `<span class="m">統計ウィンドウ</span>：dispatch のとき、各 GPU は自分のエキスパートが受け取った token 数を加算します。再配置のときは、グループ全体で all-reduce して合計します。ウィンドウで最も人気の ${top} は ${n} 個の token を受け取りました`,
      l2: (ids, lb) => `<span class="y">人気を複製</span>：4 個の冗長スロットは、順に ${ids} に渡されました。コピーはまだ元の冗長スロットにあるので、負荷はまだ平らになっていません。moe_lb = ${lb}`,
      l3: (a, b) => `<span class="c">置き直し</span>：コピーを負荷の大きい順に、「置いたあと最も忙しい GPU がいちばん楽になる」GPU へ 1 つずつ置きます。moe_lb ${a} → <span class="w">${b}</span>。続いて、新しい対応表にしたがって重みを移します`,
      l4: (lb) => `<span class="y">次のウィンドウ</span>：人気のエキスパートは同じまま、負荷は新しい乱数に替わり、配置は動きません。moe_lb = <span class="w">${lb}</span> で、統計ウィンドウのときより少し悪くなります。EPLB は過去から未来を予測するからです`,
      restart: '<span class="y">// 最後まで進みました。元の配置からやり直します</span>',
      shuffled: (hot) => `<span class="y">// 人気のエキスパートを入れ替えました：${hot}</span>`,
      eVerdict: (a, b, c) => `① 人気のエキスパートが集まると、最も忙しい GPU は平均の <b>${a}</b> 倍になり、層全体がその GPU を待ちます。<br>② 人気のエキスパートを複製して置き直すと、<b>${b}</b> に下がります。<br>③ 別のウィンドウで確かめると <b>${c}</b> です。統計ウィンドウが未来に似ているほど、効果が高くなります。上流が実測したデコードの moe_lb は 1.090 です。`,
      eTry: [
        '<b>1 ステップ</b>を続けて押し、手順 3「人気を複製」を見ましょう。コピーはまず GPU 3 の冗長スロットに集まり、GPU 3 のほうが忙しくなります。手順 4「置き直し」で、ようやく平らになります。',
        '<b>人気を入れ替え</b>を押します。人気のエキスパートが、もともと数枚の GPU に散らばっていることがあります。そのときは元の moe_lb がずっと低く、EPLB が改善できる余地も小さくなります。',
        '手順 5 を見ましょう。同じ配置で負荷を新しく入れ替えると、moe_lb が少し戻ります。EPLB が 1 回で終わらず、定期的に再配置する理由がわかります。',
      ],
    },
    ko: {
      code: 'WIDE_EP', title: 'EP 너비 시뮬레이터: GPU 8개에서 128개까지', tag: '교육용 추정 · 전문가 384개는 업스트림 범례에서',
      intro: 'EP 너비를 고르면 <b>GPU 한 개</b>가 <b>MoE 한 층, 디코드 한 단계</b>에서 얼마나 일하는지 볼 수 있어요. 전문가 수 384는 업스트림의 비교 그림에서 가져왔어요. 전문가 하나의 바이트 수 S와 token 하나가 고르는 전문가 수 k는 저장소에서 찾을 수 없어요. 그래서 아래에서는 S와 k를 단위로 삼아 배수만 비교해요. T는 GPU 한 개가 한 단계에서 처리하는 token 수예요.',
      lgSlot: '네모 = 이 GPU가 맡은 전문가', lgCopy: '네모 = 중복 슬롯(인기 전문가의 복사본을 놓는 자리)', lgW: '막대 = 이 GPU가 단계마다 읽는 전문가 가중치', lgA: '막대 = 이 GPU가 단계마다 보내는 은닉 벡터(디스패치)',
      epLabel: 'EP 너비', modeLabel: '중복 하한',
      modes: ['GPU당 1개 이상(Q&A)', '합계 32개 이상(예제)'],
      tLabel: 'GPU당 token 수 T',
      cardTitle: (ep, n) => `EP${ep}: GPU 한 개에 전문가 ${n}개`,
      barTitleW: 'GPU당 읽는 전문가 가중치(단위 S)', barTitleA: 'GPU당 보내는 은닉 벡터(단위 k)',
      sLocalK: 'GPU 한 개의 전문가 수(MoE 층마다)',
      sLocalF: (l) => `<b>= (384 + ${l.extra}) ÷ ${l.ep}</b><br>중복 하한은 ${l.minExtra}개. 384 + 중복이 EP로 나누어떨어지도록 올림해요`,
      sWK: '한 층, 한 단계에 읽는 전문가 가중치',
      sWV: (n) => `${n} × S`,
      sWF: (pct) => `<b>= GPU당 전문가 수 × S</b>, EP8의 ${pct}%<br>S = 전문가 하나의 가중치 바이트 수. 이 GPU의 전문가는 이번 단계에 모두 token 하나 이상에 선택된다고 가정해요`,
      sTK: '전문가 가중치를 한 번 읽어 평균 몇 개의 token을 처리하는가',
      sTV: (x) => `≈ ${x} × k`,
      sTF: (t, n) => `<b>= T × k ÷ GPU당 전문가 수 = ${t} × k ÷ ${n}</b><br>부하가 완전히 균등하다고 보고 추정. k = token 하나가 고르는 전문가 수`,
      sAK: '이 GPU가 단계마다 보내는 은닉 벡터(디스패치)',
      sAV: (x) => `≈ ${x} × k`,
      sAF: (t, ep) => `<b>= T × k × (EP − 1) ÷ EP = ${t} × k × ${ep - 1} ÷ ${ep}</b><br>컴바인에서 같은 만큼 돌아와요. 목적지 GPU가 고르게 분포한다고 본 추정이고, 상한은 T × k`,
      verdict: (ep, w, tk, a) => `EP8 대비 EP${ep}: GPU 한 개가 단계마다 읽는 전문가 가중치는 EP8의 <b>${w}%</b>, 가중치 한 묶음이 처리하는 token은 EP8의 <b>${tk}배</b>, GPU가 보내는 벡터는 EP8의 <b>${a}배</b>예요. 너비를 넓히면 「적게 읽고 꽉 채워 쓰기」를 얻어요. 대가는 더 큰 통신 그룹이에요.`,
      try: [
        '<b>EP8 → EP64 → EP128</b> 순서로 눌러 보세요. 이 GPU의 네모가 49개에서 7개, 다시 4개로 줄고, 아래 가중치 막대도 따라서 짧아져요. 벡터 막대는 거의 안 움직여요.',
        '<b>합계 32개 이상</b>으로 바꿔 보세요. EP8은 52개가 되고 EP64는 그대로 7개예요. 중복 하한은 말 그대로 하한이고, 코드는 EP로 나누어떨어지도록 올림해요.',
        '<b>T</b>를 384에서 64로 줄여 보세요. 가중치 한 묶음이 처리하는 token도 따라서 줄어요. 배치가 작을수록 가중치를 「꽉 채워 쓰기」가 어려워요. 디코드가 큰 배치를 모으는 이유예요.',
      ],

      eCode: 'EPLB_SIM', eTitle: '전문가 부하 분산: 인기 전문가를 복제하고 다시 배치', eTag: '교육용 추정 · 부하는 난수로 생성',
      eIntro: '한 층에 전문가 16개와 GPU 4개만 그려요. GPU마다 슬롯이 5개, 모두 20개예요. 전문가보다 많은 4개가 중복 슬롯이에요. <b>한 단계씩</b> 눌러서, EPLB가 통계 윈도 하나의 부하로 인기 전문가에 복사본을 더하고 모든 복사본을 GPU에 다시 배치하는 과정을 보세요. 알고리즘은 <code>policy.py</code>에서 옮겨 와 한 층으로 단순화했어요.',
      eLgCold: '일반 전문가', eLgHot: '인기 전문가(복사본 하나뿐)', eLgCopy: '복사본이 여러 개인 전문가', eLgMean: '점선 = GPU당 평균 부하',
      eSteps: ['처음 배치', '통계 윈도', '인기 복제', '다시 배치', '다음 윈도'],
      eStage: 'GPU 4개의 부하와 전문가 슬롯',
      card: (c) => `GPU ${c}`,
      bStep: '▶ 한 단계', bShuffle: '인기 전문가 교체', bReset: '초기화',
      eReady: '<span class="c">$</span> ready. [ ▶ 한 단계 ]를 눌러 시작하세요',
      sLbK: '현재 moe_lb(가장 바쁜 GPU ÷ 평균)', sLbF: '<b>= Σ 가장 바쁜 GPU의 token ÷ Σ GPU당 평균 token</b><br>윈도 안의 4단계를 합해요. stats_logger와 같은 계산이에요',
      sHistK: 'moe_lb 변화', sHistNone: '「한 단계」를 눌러 진행하세요',
      sHist: (a) => a.map(([n, v]) => `${n} ${v}`).join(' → '),
      sSlotK: '슬롯', sSlotV: '16 + 4 = 20개', sSlotF: 'GPU마다 중복 1개 이상. 올림하면 슬롯 20개, GPU마다 5개',
      hist: ['처음', '복제 후', '재배치 후', '다음 윈도'],
      l0: (hot, n, lb) => `<span class="c">처음 배치</span>: 슬롯이 [0…15, 0, 1, 2, 3] 순서로 놓여요. 인기 전문가 ${hot} 중 ${n}개가 같은 GPU에 있어요. moe_lb = <span class="w">${lb}</span>`,
      l1: (top, n) => `<span class="m">통계 윈도</span>: dispatch 때 각 GPU가 자기 전문가가 받은 token 수를 더해요. 재배치 때는 그룹 전체가 all-reduce로 합쳐요. 가장 인기 있는 전문가 ${top}: token ${n}개 수신`,
      l2: (ids, lb) => `<span class="y">인기 복제</span>: 중복 슬롯 4개를 차례로 ${ids}에 줬어요. 복사본은 아직 원래 중복 슬롯에 있어서 부하가 아직 평평하지 않아요: moe_lb = ${lb}`,
      l3: (a, b) => `<span class="c">다시 배치</span>: 복사본을 부하가 큰 순서로, 「놓은 뒤 가장 바쁜 GPU가 가장 덜 바빠지는」 GPU에 하나씩 놓아요. moe_lb ${a} → <span class="w">${b}</span>. 이어서 새 매핑에 따라 가중치를 옮겨요`,
      l4: (lb) => `<span class="y">다음 윈도</span>: 인기 전문가는 그대로이고, 부하는 새 난수로 바뀌고, 배치는 움직이지 않아요. moe_lb = <span class="w">${lb}</span>, 통계 윈도 때보다 조금 나빠요. EPLB는 과거로 미래를 예측하기 때문이에요`,
      restart: '<span class="y">// 끝까지 갔어요. 처음 배치부터 다시 시작해요</span>',
      shuffled: (hot) => `<span class="y">// 인기 전문가를 바꿨어요: ${hot}</span>`,
      eVerdict: (a, b, c) => `① 인기 전문가가 몰리면 가장 바쁜 GPU는 평균의 <b>${a}</b>배가 되고, 층 전체가 그 GPU를 기다려요.<br>② 인기 전문가를 복제하고 다시 배치하면 <b>${b}</b>까지 내려가요.<br>③ 다른 윈도로 확인한 값: <b>${c}</b>. 통계 윈도가 미래와 비슷할수록 효과가 커요. 업스트림이 실측한 디코드 moe_lb는 1.090이에요.`,
      eTry: [
        '<b>한 단계</b>를 계속 눌러 3단계 「인기 복제」를 보세요. 복사본이 먼저 GPU 3의 중복 슬롯에 몰려서 GPU 3이 오히려 더 바빠져요. 4단계 「다시 배치」를 해야 평평해져요.',
        '<b>인기 전문가 교체</b>를 눌러 보세요. 인기 전문가가 처음부터 여러 GPU에 흩어져 있을 수 있어요. 그러면 처음 moe_lb가 훨씬 낮고, EPLB가 개선할 여지도 작아요.',
        '5단계를 보세요. 같은 배치에 새 부하가 오면 moe_lb가 조금 올라가요. EPLB가 한 번으로 끝내지 않고 주기적으로 재배치하는 이유예요.',
      ],
    },
    es: {
      code: 'WIDE_EP', title: 'Explorador del ancho de EP: de 8 a 128 GPU', tag: 'Estimación didáctica · 384 expertos de la leyenda de upstream',
      intro: 'Elige un ancho de EP y mira cuánto trabajo hace <b>una GPU</b> en <b>una capa MoE, un paso de decode</b>. Los 384 expertos salen del gráfico comparativo de upstream. Los bytes por experto, S, y el número de expertos que elige cada token, k, no se encuentran en el repositorio. Por eso abajo S y k son las unidades, y solo se comparan proporciones. T es el número de tokens que procesa una GPU en un paso.',
      lgSlot: 'Cuadro = un experto de esta GPU', lgCopy: 'Cuadro = ranura redundante (guarda una copia de un experto popular)', lgW: 'Barra = pesos de expertos que esta GPU lee por paso', lgA: 'Barra = vectores ocultos que esta GPU envía por paso (dispatch)',
      epLabel: 'Ancho de EP', modeLabel: 'Mínimo de redundancia',
      modes: ['Al menos 1 por GPU (Q&A)', 'Al menos 32 en total (ejemplo)'],
      tLabel: 'Tokens por GPU, T',
      cardTitle: (ep, n) => `EP${ep}: ${n} expertos en una GPU`,
      barTitleW: 'Pesos de expertos leídos por GPU (unidad S)', barTitleA: 'Vectores ocultos enviados por GPU (unidad k)',
      sLocalK: 'Expertos por GPU (cada capa MoE)',
      sLocalF: (l) => `<b>= (384 + ${l.extra}) ÷ ${l.ep}</b><br>Mínimo de redundancia ${l.minExtra}, redondeado hacia arriba para que 384 + redundantes sea divisible entre EP`,
      sWK: 'Pesos de expertos leídos por capa y paso',
      sWV: (n) => `${n} × S`,
      sWF: (pct) => `<b>= expertos por GPU × S</b>, ${pct} % de EP8<br>S = bytes de los pesos de un experto; supone que cada experto de esta GPU lo elige al menos un token en este paso`,
      sTK: 'Tokens a los que sirve en promedio una lectura de los pesos de un experto',
      sTV: (x) => `≈ ${x} × k`,
      sTF: (t, n) => `<b>= T × k ÷ expertos por GPU = ${t} × k ÷ ${n}</b><br>Estimado con carga perfectamente equilibrada; k = expertos que elige cada token`,
      sAK: 'Vectores ocultos que esta GPU envía por paso (dispatch)',
      sAV: (x) => `≈ ${x} × k`,
      sAF: (t, ep) => `<b>= T × k × (EP − 1) ÷ EP = ${t} × k × ${ep - 1} ÷ ${ep}</b><br>El combine trae de vuelta otros tantos; estimación con destinos repartidos por igual entre GPU; el límite superior es T × k`,
      verdict: (ep, w, tk, a) => `EP${ep} frente a EP8: los pesos de expertos que lee cada GPU por paso son el <b>${w} %</b> de EP8; los tokens a los que sirve un juego de pesos son <b>${tk} veces</b> los de EP8; los vectores que envía cada GPU son <b>${a} veces</b> los de EP8. El ancho compra «leer menos y aprovechar más». El precio es un grupo de comunicación mayor.`,
      try: [
        'Pulsa en orden <b>EP8 → EP64 → EP128</b>: los cuadros de esta GPU bajan de 49 a 7 y luego a 4, la barra de pesos de abajo se acorta con ellos, y la barra de vectores casi no se mueve.',
        'Cambia a <b>al menos 32 en total</b>: EP8 pasa a 52 y EP64 se queda en 7. El mínimo de redundancia es solo un mínimo, y el código redondea hacia arriba para que EP divida exactamente.',
        'Arrastra <b>T</b> de 384 a 64: los tokens a los que sirve un juego de pesos también bajan. Cuanto menor es el lote, más difícil es «aprovechar los pesos». Por eso el decode junta un lote grande.',
      ],

      eCode: 'EPLB_SIM', eTitle: 'Balanceo de carga de expertos: copiar los populares y colocar de nuevo', eTag: 'Estimación didáctica · carga generada al azar',
      eIntro: 'Cada capa muestra solo 16 expertos y 4 GPU. Cada GPU tiene 5 ranuras, 20 en total. Las 4 ranuras que sobran respecto a los expertos son las ranuras redundantes. Avanza <b>paso a paso</b> y mira cómo EPLB usa la carga de una ventana de estadísticas para añadir copias de los expertos populares y luego colocar todas las copias de nuevo en las GPU. El algoritmo está portado de <code>policy.py</code> y simplificado a una sola capa.',
      eLgCold: 'Experto común', eLgHot: 'Experto popular (una sola copia)', eLgCopy: 'Experto con varias copias', eLgMean: 'Línea punteada = carga media por GPU',
      eSteps: ['Disposición inicial', 'Ventana de estadísticas', 'Copiar populares', 'Colocar de nuevo', 'Siguiente ventana'],
      eStage: 'Carga y ranuras de expertos de 4 GPU',
      card: (c) => `GPU ${c}`,
      bStep: '▶ Paso', bShuffle: 'Nuevos populares', bReset: 'Reiniciar',
      eReady: '<span class="c">$</span> ready. Pulsa [ ▶ Paso ] para empezar',
      sLbK: 'moe_lb actual (GPU más ocupada ÷ media)', sLbF: '<b>= Σ tokens de la GPU más ocupada ÷ Σ tokens medios por GPU</b><br>Suma sobre los 4 pasos de la ventana, igual que el algoritmo de stats_logger',
      sHistK: 'Evolución de moe_lb', sHistNone: 'Pulsa «Paso» para avanzar',
      sHist: (a) => a.map(([n, v]) => `${n} ${v}`).join(' → '),
      sSlotK: 'Ranuras', sSlotV: '16 + 4 = 20', sSlotF: 'Al menos 1 ranura redundante por GPU; tras redondear, 20 ranuras, 5 por GPU',
      hist: ['Inicial', 'Tras copiar', 'Tras colocar', 'Siguiente ventana'],
      l0: (hot, n, lb) => `<span class="c">Disposición inicial</span>: las ranuras se disponen como [0…15, 0, 1, 2, 3]. De los expertos populares ${hot}, ${n} están en la misma GPU. moe_lb = <span class="w">${lb}</span>`,
      l1: (top, n) => `<span class="m">Ventana de estadísticas</span>: en el dispatch, cada GPU suma los tokens que recibieron sus expertos locales; al reorganizar, todo el grupo los suma con un all-reduce. El experto más caliente de la ventana, ${top}, recibió ${n} tokens`,
      l2: (ids, lb) => `<span class="y">Copiar populares</span>: las 4 ranuras redundantes fueron en orden a ${ids}. Las copias siguen en sus ranuras redundantes antiguas, así que la carga aún no está plana: moe_lb = ${lb}`,
      l3: (a, b) => `<span class="c">Colocar de nuevo</span>: las copias, de mayor a menor carga, van una por una a la GPU donde la GPU más ocupada queda menos ocupada tras colocarlas. moe_lb ${a} → <span class="w">${b}</span>. Luego los pesos se mueven según el mapa nuevo`,
      l4: (lb) => `<span class="y">Siguiente ventana</span>: los populares siguen igual, la carga pasa a un lote nuevo de números aleatorios, y la disposición no se mueve. moe_lb = <span class="w">${lb}</span>, algo peor que en la ventana de estadísticas: EPLB usa el pasado para predecir el futuro`,
      restart: '<span class="y">// Terminado. Empieza otra vez desde la disposición inicial</span>',
      shuffled: (hot) => `<span class="y">// Nuevos populares: ${hot}</span>`,
      eVerdict: (a, b, c) => `① Cuando los expertos populares se amontonan, la GPU más ocupada tiene <b>${a}</b> veces la carga media, y toda la capa la espera.<br>② Tras copiar los expertos populares y colocarlos de nuevo, baja a <b>${b}</b>.<br>③ Una prueba con otra ventana da <b>${c}</b>: cuanto más se parece la ventana de estadísticas al futuro, mejor funciona. El moe_lb de decode que midió upstream es 1.090.`,
      eTry: [
        'Pulsa <b>Paso</b> varias veces y mira el paso 3, «Copiar populares»: las copias se amontonan primero en las ranuras redundantes de la GPU 3, y la GPU 3 se ocupa más. Solo el paso 4, «Colocar de nuevo», lo iguala.',
        'Pulsa <b>Nuevos populares</b>. Puede que los expertos populares ya estén repartidos entre varias GPU. Entonces el moe_lb inicial es mucho menor, y EPLB tiene menos margen de mejora.',
        'Mira el paso 5: la misma disposición con un lote nuevo de carga hace subir un poco moe_lb. Esto muestra por qué EPLB reorganiza cada cierto tiempo y no una vez para siempre.',
      ],
    },
    ar: {
      code: 'WIDE_EP', title: 'مستكشف عرض EP: من 8 بطاقات إلى 128 بطاقة', tag: 'تقدير تعليمي · 384 خبيرًا من مفتاح الرسم في المصدر الأصلي',
      intro: 'اختر عرض EP وراقب كم عملًا تؤديه <b>بطاقة واحدة</b> في <b>طبقة MoE واحدة وخطوة decode واحدة</b>. العدد 384 للخبراء مأخوذ من الرسم المقارن في المصدر الأصلي. أما بايتات الخبير الواحد S وعدد الخبراء الذين يختارهم كل رمز k فلا يمكن العثور عليهما في المستودع. لذلك نستخدم S وk وحدتين، ونقارن النسب فقط. T هو عدد الرموز التي تعالجها بطاقة واحدة في خطوة واحدة.',
      lgSlot: 'مربع = خبير تتولاه هذه البطاقة', lgCopy: 'مربع = خانة مكرَّرة (تحمل نسخة من خبير شائع)', lgW: 'عمود = أوزان الخبراء التي تقرؤها هذه البطاقة في كل خطوة', lgA: 'عمود = المتجهات المخفية التي ترسلها هذه البطاقة في كل خطوة (التوزيع)',
      epLabel: 'عرض EP', modeLabel: 'الحد الأدنى للتكرار',
      modes: ['خبير واحد على الأقل لكل بطاقة (Q&A)', '32 على الأقل في المجموع (المثال)'],
      tLabel: 'الرموز لكل بطاقة T',
      cardTitle: (ep, n) => `EP${ep}: عدد الخبراء في البطاقة = ${n}`,
      barTitleW: 'أوزان الخبراء المقروءة لكل بطاقة (الوحدة S)', barTitleA: 'المتجهات المخفية المرسلة لكل بطاقة (الوحدة k)',
      sLocalK: 'الخبراء في كل بطاقة (في كل طبقة MoE)',
      sLocalF: (l) => `<b>= (384 + ${l.extra}) ÷ ${l.ep}</b><br>الحد الأدنى للتكرار ${l.minExtra}، ويُقرَّب إلى الأعلى ليقبل 384 + المكرَّرون القسمة على EP`,
      sWK: 'أوزان الخبراء المقروءة في كل طبقة في كل خطوة',
      sWV: (n) => `${n} × S`,
      sWF: (pct) => `<b>= الخبراء في البطاقة × S</b>، أي ${pct}% من EP8<br>S = بايتات أوزان الخبير الواحد؛ ويُفترض أن كل خبير في هذه البطاقة يختاره رمز واحد على الأقل في هذه الخطوة`,
      sTK: 'عدد الرموز التي تخدمها قراءة واحدة لأوزان خبير في المتوسط',
      sTV: (x) => `≈ ${x} × k`,
      sTF: (t, n) => `<b>= T × k ÷ الخبراء في البطاقة = ${t} × k ÷ ${n}</b><br>تقدير بافتراض حمل متوازن تمامًا؛ k = عدد الخبراء الذين يختارهم كل رمز`,
      sAK: 'المتجهات المخفية التي ترسلها هذه البطاقة في كل خطوة (التوزيع)',
      sAV: (x) => `≈ ${x} × k`,
      sAF: (t, ep) => `<b>= T × k × (EP − 1) ÷ EP = ${t} × k × ${ep - 1} ÷ ${ep}</b><br>يعيد التجميع العدد نفسه؛ تقدير بافتراض توزيع البطاقات الوجهة بالتساوي، والحد الأعلى T × k`,
      verdict: (ep, w, tk, a) => `EP${ep} مقابل EP8: أوزان الخبراء التي تقرؤها كل بطاقة في كل خطوة تساوي <b>${w}%</b> من EP8؛ والرموز التي تخدمها مجموعة أوزان واحدة تساوي <b>${tk}×</b> ما في EP8؛ والمتجهات التي ترسلها كل بطاقة تساوي <b>${a}×</b> ما في EP8. يشتري العرض «قراءة أقل واستغلالًا أكمل». والثمن مجموعة اتصال أكبر.`,
      try: [
        'اضغط بالترتيب على <b>EP8 ثم EP64 ثم EP128</b>: تنخفض مربعات هذه البطاقة من 49 إلى 7 ثم إلى 4، ويقصر عمود الأوزان تحتها معها، أما عمود المتجهات فلا يكاد يتحرك.',
        'انتقل إلى <b>32 على الأقل في المجموع</b>: يصبح EP8 يساوي 52 ويبقى EP64 عند 7. الحد الأدنى للتكرار مجرد حد أدنى، وتقرّبه الشيفرة إلى الأعلى ليقبل EP القسمة.',
        'اسحب <b>T</b> من 384 إلى 64: تنخفض أيضًا الرموز التي تخدمها مجموعة أوزان واحدة. كلما صغرت الدفعة صعب «استغلال الأوزان استغلالًا كاملًا»، ولهذا يجمع decode دفعة كبيرة.',
      ],

      eCode: 'EPLB_SIM', eTitle: 'موازنة حمل الخبراء: انسخ الشائعين ثم أعد وضعهم', eTag: 'تقدير تعليمي · حمل مولَّد عشوائيًا',
      eIntro: 'تعرض كل طبقة 16 خبيرًا و4 بطاقات فقط. لكل بطاقة 5 خانات، أي 20 خانة. والخانات الأربع الزائدة على الخبراء هي الخانات المكرَّرة. تقدّم <b>خطوة خطوة</b> وراقب كيف يستخدم EPLB حمل نافذة إحصاء واحدة ليضيف نسخًا من الخبراء الشائعين ثم يعيد وضع كل النسخ على البطاقات. الخوارزمية منقولة من <code>policy.py</code> ومبسّطة إلى طبقة واحدة.',
      eLgCold: 'خبير عادي', eLgHot: 'خبير شائع (نسخة واحدة فقط)', eLgCopy: 'خبير له عدة نسخ', eLgMean: 'الخط المتقطع = متوسط الحمل لكل بطاقة',
      eSteps: ['الترتيب الأصلي', 'نافذة الإحصاء', 'نسخ الشائعين', 'إعادة الوضع', 'النافذة التالية'],
      eStage: 'حمل 4 بطاقات وخانات الخبراء',
      card: (c) => `GPU ${c}`,
      bStep: '▶ خطوة', bShuffle: 'شائعون جدد', bReset: 'إعادة ضبط',
      eReady: '<span class="c">$</span> ready. اضغط [ ▶ خطوة ] للبدء',
      sLbK: 'moe_lb الحالي (أكثر البطاقات انشغالًا ÷ المتوسط)', sLbF: '<b>= Σ رموز أكثر البطاقات انشغالًا ÷ Σ متوسط الرموز لكل بطاقة</b><br>يُجمع على 4 خطوات في النافذة، وهي الخوارزمية نفسها في stats_logger',
      sHistK: 'تغير moe_lb', sHistNone: 'اضغط «خطوة» للمتابعة',
      sHist: (a) => a.map(([n, v]) => `${n} ${v}`).join(' ← '),
      sSlotK: 'الخانات', sSlotV: '16 + 4 = 20', sSlotF: 'خانة مكرَّرة واحدة على الأقل لكل بطاقة؛ وبعد التقريب 20 خانة، 5 لكل بطاقة',
      hist: ['الأصلي', 'بعد النسخ', 'بعد الوضع', 'النافذة التالية'],
      l0: (hot, n, lb) => `<span class="c">الترتيب الأصلي</span>: تُرتَّب الخانات هكذا [0…15, 0, 1, 2, 3]. من الخبراء الشائعين ${hot}، عدد الواقعين في البطاقة نفسها: ${n}. moe_lb = <span class="w">${lb}</span>`,
      l1: (top, n) => `<span class="m">نافذة الإحصاء</span>: عند dispatch تجمع كل بطاقة الرموز التي استلمها خبراؤها المحليون؛ وعند إعادة الترتيب تجمعها المجموعة كلها بعملية all-reduce. أشيع خبير في النافذة: ${top}، وعدد الرموز التي استلمها: ${n}`,
      l2: (ids, lb) => `<span class="y">نسخ الشائعين</span>: أُعطيت الخانات المكرَّرة الأربع بالترتيب إلى ${ids}. ما زالت النسخ في خاناتها المكرَّرة القديمة، فلم يستوِ الحمل بعد: moe_lb = ${lb}`,
      l3: (a, b) => `<span class="c">إعادة الوضع</span>: تُوضع النسخ من الأكبر حملًا إلى الأصغر واحدة واحدة في البطاقة التي تصبح بعد الوضع فيها أكثر البطاقات انشغالًا هي الأقل انشغالًا. moe_lb ${a} ← <span class="w">${b}</span>. ثم تُنقل الأوزان وفق الجدول الجديد`,
      l4: (lb) => `<span class="y">النافذة التالية</span>: يبقى الشائعون كما هم، ويتبدل الحمل إلى دفعة جديدة من الأرقام العشوائية، ولا يتحرك الترتيب. moe_lb = <span class="w">${lb}</span>، أسوأ قليلًا مما في نافذة الإحصاء: يستعمل EPLB الماضي للتنبؤ بالمستقبل`,
      restart: '<span class="y">// انتهى. نبدأ من جديد من الترتيب الأصلي</span>',
      shuffled: (hot) => `<span class="y">// شائعون جدد: ${hot}</span>`,
      eVerdict: (a, b, c) => `① عندما يتكدس الخبراء الشائعون تحمل البطاقة الأكثر انشغالًا ما يعادل <b>${a}×</b> المتوسط، وتنتظرها الطبقة كلها.<br>② بعد نسخ الخبراء الشائعين وإعادة وضعهم ينخفض هذا إلى <b>${b}</b>.<br>③ ويعطي اختبار نافذة أخرى <b>${c}</b>: كلما شابهت نافذة الإحصاء المستقبل كان الأثر أفضل. أما قيمة moe_lb في decode التي قاسها المصدر الأصلي فهي 1.090.`,
      eTry: [
        'اضغط <b>خطوة</b> عدة مرات وراقب الخطوة 3 «نسخ الشائعين»: تتكدس النسخ أولًا في الخانات المكرَّرة للبطاقة 3 فتصبح أكثر انشغالًا. وفي الخطوة 4 «إعادة الوضع» فقط يستوي الحمل.',
        'اضغط <b>شائعون جدد</b>. قد يكون الخبراء الشائعون موزعين أصلًا على عدة بطاقات. عندها يكون moe_lb الأصلي أقل بكثير، ويكون أمام EPLB مجال أقل للتحسين.',
        'انظر إلى الخطوة 5: الترتيب نفسه مع دفعة حمل جديدة يرفع moe_lb قليلًا. وهذا يفسر لماذا يعيد EPLB الترتيب دوريًا، لا مرة واحدة وتنتهي.',
      ],
    },
  });

  const MODES = ['perCard', 'fixed32'];
  const fmt2 = (x) => x.toFixed(2);
  const round1 = (x) => (Math.round(x * 10) / 10).toString();

  Viz.register('di-wide-ep-width', {
    mount(el) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgSlot, glow: true },
        { color: 'var(--frame)', text: T.lgCopy },
        { color: 'var(--accent)', text: T.lgW },
        { color: 'var(--a2)', text: T.lgA },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.insertAdjacentHTML('beforeend',
        `<div class="viz-row" style="margin-top:0"><span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${T.epLabel}</span>${M.EP_WIDTHS.map(ep => `<button type="button" class="viz-btn ghost" data-ep="${ep}" style="padding:5px 9px;font-size:12px">EP${ep}</button>`).join('')}</div>
        <div class="viz-row"><span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${T.modeLabel}</span>${T.modes.map((l, k) => `<button type="button" class="viz-btn ghost" data-mode="${k}" style="padding:5px 9px;font-size:12px">${Viz.esc(l)}</button>`).join('')}</div>
        <div class="viz-slider"><label>${T.tLabel}</label><input type="range" min="32" max="1024" step="32" value="${M.DEFAULT_TOKENS}" aria-label="${Viz.esc(T.tLabel)}"><output>T = ${M.DEFAULT_TOKENS}</output></div>`);
      const svg = Viz.svg('svg', { viewBox: '0 0 400 330', class: 'viz-stage', role: 'img', 'aria-label': T.title }, left);
      right.innerHTML =
        Viz.stat({ id: 'w-local', k: T.sLocalK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'w-w', k: T.sWK, v: '', f: '' }) +
        Viz.stat({ id: 'w-t', k: T.sTK, v: '', f: '' }) +
        Viz.stat({ id: 'w-a', k: T.sAK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      let ep = 64, mode = 'perCard', tokens = M.DEFAULT_TOKENS;

      const txt = (x, y, s, opt = {}) => { const t = Viz.svg('text', { x, y, 'font-size': opt.size || 12, 'text-anchor': opt.anchor || 'start', style: `fill:${opt.color || 'var(--muted)'}` }, svg); t.textContent = s; return t; };

      function draw() {
        svg.innerHTML = '';
        const cur = M.stepTraffic(ep, tokens, mode);
        // One card: its expert slots, 13 per row.
        txt(0, 14, T.cardTitle(ep, cur.local), { color: 'var(--ink)', size: 13 });
        const per = 13, sz = 22, gap = 4;
        for (let i = 0; i < cur.local; i++) {
          const isCopy = i >= M.LOGICAL / ep;
          Viz.svg('rect', { x: (i % per) * (sz + gap), y: 24 + Math.floor(i / per) * (sz + gap), width: sz, height: sz, rx: 2, class: 'viz-cell' + (isCopy ? '' : ' pick') }, svg);
        }
        // Bars for every width.
        const all = M.EP_WIDTHS.map(w => M.stepTraffic(w, tokens, mode));
        const maxW = Math.max(...all.map(a => a.local)), x0 = 64, wMax = 270;
        const y1 = 150;
        txt(0, y1, T.barTitleW, { color: 'var(--ink)' });
        all.forEach((a, i) => {
          const y = y1 + 10 + i * 16, on = a.ep === ep;
          txt(0, y + 11, 'EP' + a.ep, { color: on ? 'var(--ink)' : 'var(--muted)' });
          Viz.svg('rect', { x: x0, y, width: Math.max(2, a.local / maxW * wMax), height: 11, style: `fill:var(--accent);opacity:${on ? 1 : 0.35}` }, svg);
          txt(x0 + a.local / maxW * wMax + 6, y + 11, a.local + '×S', { color: on ? 'var(--ink)' : 'var(--muted)' });
        });
        const y2 = y1 + 10 + 5 * 16 + 20;
        txt(0, y2, T.barTitleA, { color: 'var(--ink)' });
        all.forEach((a, i) => {
          const y = y2 + 10 + i * 16, on = a.ep === ep;
          txt(0, y + 11, 'EP' + a.ep, { color: on ? 'var(--ink)' : 'var(--muted)' });
          Viz.svg('rect', { x: x0, y, width: Math.max(2, a.dispatchPerK / tokens * wMax), height: 11, style: `fill:var(--a2);opacity:${on ? 1 : 0.35}` }, svg);
          txt(x0 + a.dispatchPerK / tokens * wMax + 6, y + 11, Math.round(a.dispatchPerK) + '×k', { color: on ? 'var(--ink)' : 'var(--muted)' });
        });
        svg.setAttribute('viewBox', `0 0 400 ${y2 + 10 + 5 * 16 + 4}`);

        const base = all[0];
        $('[data-s=w-local-v]').textContent = Viz.fmt(cur.local);
        $('[data-s=w-local-f]').innerHTML = T.sLocalF(cur);
        $('[data-s=w-w-v]').textContent = T.sWV(cur.local);
        $('[data-s=w-w-f]').innerHTML = T.sWF(Math.round(cur.weightVsEp8 * 100));
        $('[data-s=w-t-v]').textContent = T.sTV(round1(cur.tokensPerCopyPerK));
        $('[data-s=w-t-f]').innerHTML = T.sTF(tokens, cur.local);
        $('[data-s=w-a-v]').textContent = T.sAV(Math.round(cur.dispatchPerK));
        $('[data-s=w-a-f]').innerHTML = T.sAF(tokens, ep);
        $('.viz-verdict').innerHTML = T.verdict(ep, Math.round(cur.weightVsEp8 * 100), round1(cur.tokensPerCopyPerK / base.tokensPerCopyPerK), fmt2(cur.dispatchPerK / base.dispatchPerK));
        el.querySelectorAll('[data-ep]').forEach(b => b.classList.toggle('ghost', +b.dataset.ep !== ep));
        el.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('ghost', MODES[+b.dataset.mode] !== mode));
        $('output').textContent = 'T = ' + tokens;
      }
      el.querySelectorAll('[data-ep]').forEach(b => { b.onclick = () => { ep = +b.dataset.ep; draw(); }; });
      el.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { mode = MODES[+b.dataset.mode]; draw(); }; });
      const range = $('input[type=range]');
      range.oninput = () => { tokens = +range.value; draw(); };
      draw();
    },
  });

  Viz.register('di-wide-ep-eplb', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.eCode, title: T.eTitle, tag: T.eTag, intro: T.eIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.eLgCold },
        { color: 'var(--a2)', text: T.eLgHot },
        { color: 'var(--accent)', text: T.eLgCopy, glow: true },
        { color: 'var(--muted)', text: T.eLgMean },
      ]));
      const pipe = Viz.pipe(body, T.eSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 400 296', class: 'viz-stage', role: 'img', 'aria-label': T.eStage }, left);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bShuffle, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.eReady);
      right.innerHTML =
        Viz.stat({ id: 'e-lb', k: T.sLbK, v: '—', f: T.sLbF, hot: true }) +
        Viz.stat({ id: 'e-hist', k: T.sHistK, v: '', f: T.sHistNone }) +
        Viz.stat({ id: 'e-slot', k: T.sSlotK, v: T.sSlotV, f: T.sSlotF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.eTry));
      const $ = s => el.querySelector(s);
      const [stepBtn, shuffleBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const { experts, extra, capacity, cards } = M.TOY;

      let seed = 1, randomHot = false, data, states, phase = 0, hist = [];
      function prepare() {
        data = M.toyLoads({ seed, randomHot });
        const init = M.initialMap(experts, extra);
        const rep = M.replicate(data.tokens, experts + extra);
        const placed = M.place(data.tokens, rep.phys, rep.count, capacity);
        const next = M.toyLoads({ seed: seed + 1000, hot: data.hot });
        states = [
          { phys: init, tokens: data.tokens },
          { phys: init, tokens: data.tokens },
          { phys: rep.phys, tokens: data.tokens },
          { phys: placed, tokens: data.tokens },
          { phys: placed, tokens: next.tokens },
        ].map(s => { const loads = M.cardLoads(s.tokens, s.phys, capacity); return { ...s, loads, lb: M.moeLb(loads) }; });
        states.copies = rep.phys.slice(experts);
      }
      const avgLoads = s => Array.from({ length: cards }, (_, c) => s.loads.reduce((a, row) => a + row[c], 0) / s.loads.length);
      const hotName = h => h.map(e => '#' + String(e).padStart(2, '0')).join(' ');

      function draw(s, showCounts) {
        svg.innerHTML = '';
        const scale = Math.max(...states.flatMap(x => avgLoads(x))) * 1.08;
        const avg = avgLoads(s), mean = avg.reduce((a, b) => a + b, 0) / cards;
        const count = Array(experts).fill(0); s.phys.forEach(e => count[e]++);
        const perExpert = Array.from({ length: experts }, (_, e) => s.tokens.reduce((a, row) => a + row[e], 0) / s.tokens.length);
        const top = 22, h = 96;
        for (let c = 0; c < cards; c++) {
          const x = 8 + c * 98, bh = avg[c] / scale * h, hotCard = avg[c] > mean * 1.2;
          Viz.svg('rect', { x: x + 16, y: top + h - bh, width: 56, height: bh, style: `fill:var(${hotCard ? '--a2' : '--accent'})` }, svg);
          const t = Viz.svg('text', { x: x + 44, y: top + h - bh - 5, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, svg); t.textContent = Math.round(avg[c]);
          const l = Viz.svg('text', { x: x + 44, y: top + h + 18, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--muted)' }, svg); l.textContent = T.card(c);
          for (let i = 0; i < capacity; i++) {
            const e = s.phys[c * capacity + i], y = top + h + 28 + i * 28;
            const cls = count[e] > 1 ? 'viz-cell pick' : data.hot.includes(e) ? 'viz-cell score' : 'viz-cell';
            Viz.svg('rect', { x: x + 2, y, width: 86, height: 24, rx: 2, class: cls }, svg);
            const share = Math.round(perExpert[e] / count[e]);
            const tt = Viz.svg('text', { x: x + 45, y: y + 16, 'font-size': 12, 'text-anchor': 'middle', style: `fill:var(${cls === 'viz-cell' ? '--ink' : '--paper'})` }, svg);
            tt.textContent = '#' + String(e).padStart(2, '0') + (showCounts ? ' · ' + share : '');
          }
        }
        const my = top + h - mean / scale * h;
        Viz.svg('path', { d: `M4 ${my}H396`, style: 'fill:none;stroke:var(--muted);stroke-dasharray:4 3' }, svg);
      }

      function stats() {
        const s = states[phase];
        $('[data-s=e-lb-v]').textContent = fmt2(s.lb);
        $('[data-s=e-hist-v]').textContent = hist.length ? T.sHist(hist) : '';
        $('[data-s=e-hist-f]').textContent = hist.length ? '' : T.sHistNone;
      }
      function sameCard(hot, phys) {
        const by = hot.map(e => Math.floor(phys.indexOf(e) / capacity));
        return Math.max(...[...new Set(by)].map(c => by.filter(x => x === c).length));
      }
      function step() {
        pipe.set(phase);
        const s = states[phase];
        if (phase === 0) {
          hist = [[T.hist[0], fmt2(s.lb)]];
          draw(s, false);
          term.log(T.l0(hotName(data.hot), sameCard(data.hot, s.phys), fmt2(s.lb)));
        } else if (phase === 1) {
          draw(s, true);
          const per = Array.from({ length: experts }, (_, e) => data.tokens.reduce((a, row) => a + row[e], 0));
          const topE = per.indexOf(Math.max(...per));
          term.log(T.l1('#' + String(topE).padStart(2, '0'), per[topE]));
        } else if (phase === 2) {
          hist.push([T.hist[1], fmt2(s.lb)]);
          draw(s, true);
          term.log(T.l2(hotName(states.copies), fmt2(s.lb)));
        } else if (phase === 3) {
          hist.push([T.hist[2], fmt2(s.lb)]);
          draw(s, true);
          term.log(T.l3(fmt2(states[0].lb), fmt2(s.lb)));
        } else {
          hist.push([T.hist[3], fmt2(s.lb)]);
          draw(s, true);
          term.log(T.l4(fmt2(s.lb)));
          const v = $('.viz-verdict');
          v.innerHTML = T.eVerdict(fmt2(states[0].lb), fmt2(states[3].lb), fmt2(s.lb));
          v.hidden = false;
        }
        stats();
        phase = (phase + 1) % states.length;
      }
      function reset(msg) {
        phase = 0; hist = []; pipe.set(-1); prepare(); draw(states[0], false);
        $('[data-s=e-lb-v]').textContent = fmt2(states[0].lb);
        $('[data-s=e-hist-v]').textContent = ''; $('[data-s=e-hist-f]').textContent = T.sHistNone;
        $('.viz-verdict').hidden = true;
        term.clear(); term.log(msg || T.eReady);
      }
      let done = false;
      stepBtn.onclick = () => {
        if (!ctx.alive) return;
        if (done) { done = false; term.log(T.restart); $('.viz-verdict').hidden = true; }
        step();
        if (phase === 0) done = true;
      };
      shuffleBtn.onclick = () => { seed += 1; randomHot = true; done = false; reset(); term.log(T.shuffled(hotName(data.hot))); };
      resetBtn.onclick = () => { seed = 1; randomHot = false; done = false; reset(); };
      reset();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
