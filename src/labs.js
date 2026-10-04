/* Browser UI for the pure educational math models in lab-math.js.
   Visible text lives in TABLE, keyed by language; Chinese is the master. */
(function(root){
'use strict';
const M=root.LabMath;
const TABLE={
 zh:{
  locale:'zh-CN',
  numList:'请输入以逗号分隔的数字',outOfRange:'数值不在允许范围',missingInput:'缺少输入',
  plotX:'比例',plotAria:(y,x)=>y+' 随 '+x+' 变化的教学曲线',
  notFound:'未找到实验。',controls:'实验参数',reset:'恢复默认参数',kind:'教学推演；非硬件实测',
  journeyStep:'当前阶段',journeyKind:'教学路径示意',journeyRead:'阅读对应章节 →',
  journey:[['消息与模板','服务层把角色、工具与文本放入模板，再编码成 token IDs。'],['处理已有输入','Prefill 按块建立各层状态。最后一个 prompt token 与验证窗口的交接有明确约定。'],['逐层计算与路由','GDN / QSA 处理历史；每个 MoE 层选择专家，而不是整个模型只选一次。'],['异构专家计算','热专家在 GPU；RAM 侧可以由 CPU 计算缺失专家。关键路径仍受残差依赖限制。'],['验证与提交','候选只接受连续正确前缀；GDN、PLE、indexer 与 KV 各有状态处理方式。'],['采样与协议输出','目标选择成为新历史；字节经增量解码和事件分帧呈现给客户端，然后循环继续。']],
  temp:'温度（0 = 贪心）',u:'均匀随机数 u',chosen:'选中候选',probSum:'概率总和',fixedLogits:'固定 logits = [2, 1, 0]',
  samplingHead:['候选','概率','累计概率'],samplingHint:'逆累计法选择使 u 落入的区间。概率区间左闭右开，舍入后的展示值不是内部精度。',
  matrixHint:'形状：(2×3) · (3×1) → (2×1)。行优先 W[i,j] 的元素偏移为 i×3+j。',matrixHead:['输出行','逐项乘积','求和'],
  bits:'代码位宽',outlier:'最后一个元素倍率',maxErr:'最大误差',storage:'含 scale 的存储',perWeight:' bit/权重',
  quantEq:(Q,scale)=>`Q=${Q}；scale=${scale}；q=round(x/scale)，限制在 [−Q,Q]`,quantHead:['原值','代码','重构','误差'],
  quantHint:'存储指标另按每 32 个权重共用一个 16-bit scale 估算；本表只有 4 个示例元素。不含 offset、对齐或实际码本。',
  ops:'工作量',bytes:'跨所选层级流量',peak:'计算上限',bw:'持续带宽',launch:'不可隐藏固定开销',share:'被优化阶段占比',speedup:'局部加速',
  lower:'时间下界',bottleneck:'主约束',overall:'整体加速',pureCompute:'纯计算',pureMove:'纯搬运',
  roofHint:'输入的是假设持续能力。未计依赖、不规则访问等成本，输出不是某块显卡的真实性能。',
  old:'旧状态 S',alpha:'衰减 α',beta:'写入强度 β',key:'键 k',value:'值 v',right:'正确输出',wrong:'错误顺序输出',
  gdnHead:['步骤','数值'],gdnRows:['先衰减 αS','预测 k×衰减状态','残差 β(v−预测)','新状态 衰减状态+k×残差'],
  gdnHint:'q 固定为 1。错误顺序先按旧状态更新再衰减；有限、流畅的数值不等于正确。',
  policy:'策略',policies:[['lru','全相联 LRU'],['lfu','全相联 LFU'],['fifo','全相联 FIFO'],['assoc','八路组相联 · 轮换']],slots:'槽数',trace:'访问轨迹（0…10⁶，最多 256 项）',
  hitRate:'命中率',hitMiss:'命中 / 未命中',usable:'实际可用槽',hit:'命中',miss:'未命中',stepTitle:(n,h)=>`第 ${n} 步 · ${h}`,
  cacheHint:'绿色命中、带虚线的灰色未命中，同时提供文字状态。组映射 key % sets；容量非 8 整倍数时向下取整，最少 8。',
  cacheHead:['步','键','状态','淘汰','当前键集合'],cacheMore:'表仅展示前 48 步，计算与导出包含完整轨迹。',
  heteroBytes:'剩余流量 D',cpuRate:'CPU 分支有效速率',gpuRate:'PCIe/GPU 分支有效速率',gpuShare:'分给 GPU 的比例',join:'合并成本',
  stageTime:'当前分工阶段时间',bestShare:'理想 GPU 比例',bestTime:'理想平衡时间',heteroX:'GPU 比例 %',heteroY:'阶段时间 ms',
  heteroHint:(c,g)=>`CPU 分支 ${c} ms；GPU 分支 ${g} ms。模型未计共享 DRAM、KV 传输竞争与实际 GPU 算子成本变化。`,
  inTokens:'输入 token 数',chunk:'chunk 大小',budget:'可借用 scratch 预算',chunks:'块数',verdict:'预算判定',ok:'可行',bad:'不可行',over:'超额',
  prefillOk:s=>'教学成本约 '+s+' 秒。',prefillBad:'该块大小超出输入预算；不能把它当作可部署结果。',prefillTail:' 复用曲线与内存斜率均为人为设定。',
  prefillHead:['chunk','scratch MiB','教学时间 s','预算'],prefillEq:'r(C)=300+2700C/(C+512) token/s<br>scratch=128+0.5C MiB<br>T=N/r(C)+ceil(N/C)×0.005 秒',
  ctx:'每序列上下文',seqs:'活动序列数',kvBits:'教学 K/V 位宽',mixed:'K8 / V4（教学混合）',resident:'显存驻留窗口',meta:'假设 KV 元数据开销',
  kvAll:'总主 KV 载荷',kvRes:'驻留 KV 载荷',gdnSum:'GDN 主状态总和',kvHead:['项目','教学计算'],
  kvRows:['每序列每 token 主 KV','每序列完整 KV','总 KV + 假设元数据','未驻留的逻辑 KV 载荷'],bytesUnit:' 字节',
  kvWarn:'未驻留不等于已删除，主机可能还保留完整 KV 副本。位宽菜单只用于容量推演，不保证上游任意量化与 streaming 组合兼容。',
  kvEq:'12层 × T × 2 KV头 × 256维 × (K位宽+V位宽)/8 × 会话数',
  p:'每位置条件接受率 p',base:'无草稿目标成本',verify:'每份额外验证成本',draft:'每份起草成本',bestK:'理想最优草稿数',rate:'教学产出速率',vsNone:'相对无草稿',
  specHead:['k','期望推进 E','本轮成本 ms','token/s','净收益'],specEq:'E=1+p+p²+…+pᵏ<br>成本=base+k×(额外验证+起草)；速率=1000E/成本',
  specHint:'期望公式连接上游控制器；此成本式省略专家集合复用、缓存与非线性内核成本。',
  accepted:'接受的草稿前缀长度',start:'起点状态',committed:'正确提交状态',naive:'只回退计数的错误状态',draftN:n=>`草稿 ${n}`,accept:'接受',dropTail:'丢弃后缀',candState:'候选状态',
  commitEq:'toy 递推 s ← 0.5s+t；已提交前缀 [1,2]；候选 [3,5,2,4]',
  readBytes:'每次网络读取的字节数',newline:'事件换行',restored:'恢复文本',reads:'读取分片数',events:'完整事件数',rawEvents:'原始事件文本',hexSlices:'字节切片（十六进制）',slice:n=>`分片 ${n}`,
  sseHint:n=>`${n} 字节 → 增量 UTF-8 解码 → 空行分帧 → data 行合并 → JSON。网络分片数不是 token 数。`,
  lengths:'同时到达的作业长度（最多 6 条）',mode:'调度策略',modes:[['fcfs','FCFS 先来先服务'],['rr','轮转 RR']],quantum:'每轮 token 量子',switchCost:'换作业成本',
  total:'总完成时间',p95:'首 token p95',sysRate:'系统总吞吐',gantt:'作业调度教学甘特图',job:n=>`作业${n}`,
  schedHead:['作业','长度','首 token ms','完成 ms'],switches:n=>` 切换 ${n} 次；首次启动不计切换。`,
  // strings produced by lab-math.js, translated by exact match or pattern
  math:{},mathPatterns:[],names:{}
 },
 en:{
  locale:'en',
  numList:'Enter comma-separated numbers',outOfRange:'A value is outside the allowed range',missingInput:'Missing input',
  plotX:'share',plotAria:(y,x)=>'Teaching curve of '+y+' against '+x,
  notFound:'Lab not found.',controls:'Lab parameters',reset:'Reset to defaults',kind:'teaching estimate; not a hardware measurement',
  journeyStep:'Stage',journeyKind:'teaching path sketch',journeyRead:'Read the chapter →',
  journey:[['Message and template','The server puts roles, tools and text into the chat template, then encodes them as token IDs.'],['Read the prompt','Prefill builds each layer’s state chunk by chunk. The hand-over from the last prompt token to the verify window follows a fixed contract.'],['Layers and routing','GDN / QSA handle history; every MoE layer picks its own experts, not the model as a whole once.'],['Split expert compute','Hot experts sit on the GPU; on the RAM side the CPU can compute missing experts. The residual dependency still bounds the critical path.'],['Verify and commit','Only a continuous correct prefix of drafts is accepted; GDN, PLE, indexer and KV each handle state their own way.'],['Sample and stream','The target’s choice becomes new history; bytes are decoded incrementally and framed as events for the client, then the loop repeats.']],
  temp:'Temperature (0 = greedy)',u:'Uniform random number u',chosen:'Chosen candidate',probSum:'Sum of probabilities',fixedLogits:'Fixed logits = [2, 1, 0]',
  samplingHead:['Candidate','Probability','Cumulative'],samplingHint:'Inverse-CDF sampling picks the interval that u falls into. Intervals are closed on the left and open on the right; rounded display values are not the internal precision.',
  matrixHint:'Shapes: (2×3) · (3×1) → (2×1). In row-major order, element W[i,j] sits at offset i×3+j.',matrixHead:['Output row','Products','Sum'],
  bits:'Code width',outlier:'Scale of the last element',maxErr:'Max error',storage:'Storage incl. scale',perWeight:' bit/weight',
  quantEq:(Q,scale)=>`Q=${Q}; scale=${scale}; q=round(x/scale), clamped to [−Q,Q]`,quantHead:['Value','Code','Rebuilt','Error'],
  quantHint:'Storage assumes one 16-bit scale per 32 weights; this table shows only 4 sample values. Offsets, alignment and real codebooks are not included.',
  ops:'Work',bytes:'Traffic through the chosen level',peak:'Compute ceiling',bw:'Sustained bandwidth',launch:'Fixed overhead that cannot hide',share:'Share of the optimised stage',speedup:'Local speed-up',
  lower:'Time lower bound',bottleneck:'Bound by',overall:'Overall speed-up',pureCompute:'compute only',pureMove:'data movement only',
  roofHint:'Inputs are assumed sustained rates. Dependencies, irregular access and other costs are ignored; the output is not the real performance of any GPU.',
  old:'Old state S',alpha:'Decay α',beta:'Write strength β',key:'Key k',value:'Value v',right:'Correct output',wrong:'Wrong-order output',
  gdnHead:['Step','Value'],gdnRows:['Decay first: αS','Prediction: k × decayed state','Residual: β(v − prediction)','New state: decayed state + k × residual'],
  gdnHint:'q is fixed at 1. The wrong order updates from the old state and decays afterwards; a finite, smooth number is not a correct one.',
  policy:'Policy',policies:[['lru','Fully associative LRU'],['lfu','Fully associative LFU'],['fifo','Fully associative FIFO'],['assoc','8-way set associative · rotation']],slots:'Slots',trace:'Access trace (0…10⁶, up to 256 items)',
  hitRate:'Hit rate',hitMiss:'Hits / misses',usable:'Usable slots',hit:'hit',miss:'miss',stepTitle:(n,h)=>`Step ${n} · ${h}`,
  cacheHint:'Hits are highlighted, misses are dashed, and each also has a text label. Sets map by key % sets; capacity rounds down to a multiple of 8, at least 8.',
  cacheHead:['Step','Key','Result','Evicted','Keys now'],cacheMore:'The table shows the first 48 steps; the result and export cover the full trace.',
  heteroBytes:'Remaining traffic D',cpuRate:'Effective CPU rate',gpuRate:'Effective PCIe/GPU rate',gpuShare:'Share sent to the GPU',join:'Merge cost',
  stageTime:'Stage time for this split',bestShare:'Best GPU share',bestTime:'Balanced stage time',heteroX:'GPU share %',heteroY:'stage time ms',
  heteroHint:(c,g)=>`CPU branch ${c} ms; GPU branch ${g} ms. The model ignores shared DRAM, KV transfer contention and changing GPU kernel costs.`,
  inTokens:'Prompt tokens',chunk:'Chunk size',budget:'Borrowable scratch budget',chunks:'Chunks',verdict:'Budget check',ok:'fits',bad:'does not fit',over:'over budget',
  prefillOk:s=>'Teaching cost about '+s+' s.',prefillBad:'This chunk size exceeds the budget; do not treat it as a deployable result.',prefillTail:' The reuse curve and memory slope are made up for teaching.',
  prefillHead:['chunk','scratch MiB','teaching time s','budget'],prefillEq:'r(C)=300+2700C/(C+512) token/s<br>scratch=128+0.5C MiB<br>T=N/r(C)+ceil(N/C)×0.005 s',
  ctx:'Context per sequence',seqs:'Active sequences',kvBits:'Teaching K/V width',mixed:'K8 / V4 (teaching mix)',resident:'VRAM-resident window',meta:'Assumed KV metadata overhead',
  kvAll:'Main KV payload, total',kvRes:'Resident KV payload',gdnSum:'GDN main state, total',kvHead:['Item','Teaching calculation'],
  kvRows:['Main KV per token per sequence','Full KV per sequence','Total KV + assumed metadata','Logical KV payload not resident'],bytesUnit:' bytes',
  kvWarn:'Not resident does not mean deleted; the host may still keep a full KV copy. The width menu is for capacity estimates only and does not promise that any upstream quantisation works with streaming.',
  kvEq:'12 layers × T × 2 KV heads × 256 dims × (K width + V width)/8 × sessions',
  p:'Conditional acceptance rate p',base:'Target cost without drafts',verify:'Extra verify cost per draft',draft:'Draft cost per draft',bestK:'Best number of drafts',rate:'Teaching output rate',vsNone:'vs. no drafts',
  specHead:['k','Expected advance E','Round cost ms','token/s','Net gain'],specEq:'E=1+p+p²+…+pᵏ<br>cost=base+k×(extra verify+draft); rate=1000E/cost',
  specHint:'The expectation matches the upstream controller; this cost formula leaves out expert reuse, caching and non-linear kernel costs.',
  accepted:'Accepted draft prefix length',start:'Starting state',committed:'Correctly committed state',naive:'Wrong state after only rolling back the counter',draftN:n=>`Draft ${n}`,accept:'accepted',dropTail:'tail dropped',candState:'candidate state',
  commitEq:'toy recurrence s ← 0.5s+t; committed prefix [1,2]; candidates [3,5,2,4]',
  readBytes:'Bytes per network read',newline:'Event line ending',restored:'Recovered text',reads:'Reads',events:'Complete events',rawEvents:'Raw event text',hexSlices:'Byte slices (hex)',slice:n=>`slice ${n}`,
  sseHint:n=>`${n} bytes → incremental UTF-8 decoding → split on blank lines → join data lines → JSON. The number of network reads is not the number of tokens.`,
  lengths:'Lengths of jobs arriving together (up to 6)',mode:'Scheduling policy',modes:[['fcfs','FCFS first come, first served'],['rr','Round robin']],quantum:'Tokens per turn',switchCost:'Job switch cost',
  total:'Total completion time',p95:'First token p95',sysRate:'System throughput',gantt:'Teaching Gantt chart of job scheduling',job:n=>`Job ${n}`,
  schedHead:['Job','Length','First token ms','Done ms'],switches:n=>` ${n} switches; the first start does not count.`,
  math:{'计算':'compute','搬运':'data movement',
   '未计非专家权重、热专家、卷积/PLE/MTP、scratch、图、页表精确布局与预留；RAM/GPU 是否保留副本取决于实现。':'Not counted: non-expert weights, hot experts, conv/PLE/MTP, scratch, graphs, exact page-table layout and reserves. Whether RAM/GPU keep copies depends on the implementation.',
   '只演示候选状态事务，不模拟真实 Verifier row 0 / 目标下一 token 的计数偏移。':'Shows only the candidate-state transaction; it does not model the real Verifier row 0 / next-target-token counter offset.',
   '所有请求 t=0 已就绪；1 token=1 ms；无 prefill、GPU batching 或缓存。分位数为线性插值。':'All requests are ready at t=0; 1 token = 1 ms; no prefill, GPU batching or cache. Percentiles use linear interpolation.',
   'shape 不匹配':'Shape mismatch','trace 长度需为 1…256':'The trace needs 1…256 items','八路组相联至少需要 8 个槽；请增大容量。':'8-way set associative needs at least 8 slots; raise the capacity.','分数不能为空':'Scores cannot be empty','教学作业总长度不超过 400':'Total job length is limited to 400','未知调度':'Unknown scheduler','未知策略':'Unknown policy','空数组':'Empty array','空样本':'Empty sample','需要 1…6 条作业':'Needs 1…6 jobs'},
  mathPatterns:[[/^(.+)应在(.+)…(.+)$/,(m,n,a,b)=>`${n} must be in ${a}…${b}`],[/^(.+)必须大于零$/,(m,n)=>`${n} must be greater than zero`],[/^(.+)必须是有限数$/,(m,n)=>`${n} must be a finite number`],[/^(.+)超出整数范围$/,(m,n)=>`${n} is out of integer range`]],
  names:{'键':'key','衰减':'decay','会话数':'sessions','状态/输入':'state/input','CPU 有效速率':'CPU rate','GPU 比例':'GPU share','K 位宽':'K width','PCIe 分支有效速率':'PCIe branch rate','scratch 预算':'scratch budget','V 位宽':'V width','上下文':'context','条件概率':'conditional probability','位宽':'bit width','数值':'value','元数据比例':'metadata share','元素':'element','输入长度':'input length','输出长度':'output length','分位数':'percentile','分片字节':'slice bytes','切换成本':'switch cost','合并时间':'merge time','固定开销':'fixed overhead','基线时间':'base time','额外验证时间':'extra verify time','块大小':'chunk size','局部加速':'local speed-up','温度':'temperature'}
 },
 ja:{
  locale:'ja-JP',
  numList:'カンマ区切りで数値を入力してください',outOfRange:'値が許容範囲外です',missingInput:'入力がありません',
  plotX:'割合',plotAria:(y,x)=>x+' に対する '+y+' の教育用曲線',
  notFound:'実験が見つかりません。',controls:'実験パラメータ',reset:'初期値に戻す',kind:'教育用の試算、ハードウェア実測ではありません',
  journeyStep:'現在の段階',journeyKind:'教育用の経路図',journeyRead:'対応する章を読む →',
  journey:[['メッセージとテンプレート','サービス層がロール、ツール、テキストをテンプレートに入れ、トークン ID にエンコードします。'],['入力済みの部分を処理','プリフィルはチャンクごとに各層の状態を作ります。最後のプロンプトトークンから検証ウィンドウへの引き継ぎには、明確な取り決めがあります。'],['層ごとの計算とルーティング','GDN / QSA が履歴を処理します。エキスパートは MoE 層ごとに選びます。モデル全体で 1 回だけ選ぶのではありません。'],['異種混合のエキスパート計算','ホットなエキスパートは GPU に置きます。RAM 側では、足りないエキスパートを CPU で計算できます。それでもクリティカルパスは残差の依存関係に縛られます。'],['検証とコミット','候補は、連続して正しいプレフィックスだけが受理されます。GDN、PLE、indexer、KV は、それぞれ独自のやり方で状態を扱います。'],['サンプリングとプロトコル出力','ターゲットの選択が新しい履歴になります。バイト列はインクリメンタルにデコードされ、イベント単位に分割されてクライアントに届きます。そしてループが続きます。']],
  temp:'温度（0 = 貪欲）',u:'一様乱数 u',chosen:'選ばれた候補',probSum:'確率の合計',fixedLogits:'固定 logits = [2, 1, 0]',
  samplingHead:['候補','確率','累積確率'],samplingHint:'逆累積分布法で、u が入る区間を選びます。区間は左閉右開です。丸めた表示値は、内部の精度ではありません。',
  matrixHint:'形状：(2×3) · (3×1) → (2×1)。行優先では、要素 W[i,j] のオフセットは i×3+j です。',matrixHead:['出力行','各項の積','合計'],
  bits:'コードのビット幅',outlier:'最後の要素の倍率',maxErr:'最大誤差',storage:'scale 込みの格納量',perWeight:' bit/重み',
  quantEq:(Q,scale)=>`Q=${Q}、scale=${scale}、q=round(x/scale)、[−Q,Q] に制限`,quantHead:['元の値','コード','復元値','誤差'],
  quantHint:'格納量は、重み 32 個ごとに 16-bit の scale を 1 つ共有するとして別に見積もっています。この表の例は 4 要素だけです。offset、アラインメント、実際のコードブックは含みません。',
  ops:'仕事量',bytes:'選んだ階層を通るトラフィック',peak:'計算の上限',bw:'持続帯域幅',launch:'隠せない固定オーバーヘッド',share:'最適化する段階の割合',speedup:'局所的な高速化',
  lower:'時間の下限',bottleneck:'主な制約',overall:'全体の高速化',pureCompute:'計算のみ',pureMove:'データ転送のみ',
  roofHint:'入力は仮定した持続性能です。依存関係や不規則なアクセスなどのコストは含みません。出力は特定の GPU の実性能ではありません。',
  old:'古い状態 S',alpha:'減衰 α',beta:'書き込み強度 β',key:'キー k',value:'値 v',right:'正しい出力',wrong:'誤った順序の出力',
  gdnHead:['ステップ','値'],gdnRows:['まず減衰 αS','予測 k×減衰後の状態','残差 β(v−予測)','新しい状態 減衰後の状態+k×残差'],
  gdnHint:'q は 1 に固定です。誤った順序では、古い状態で更新してから減衰します。有限でなめらかな数値でも、正しいとは限りません。',
  policy:'ポリシー',policies:[['lru','フルアソシアティブ LRU'],['lfu','フルアソシアティブ LFU'],['fifo','フルアソシアティブ FIFO'],['assoc','8 ウェイ セットアソシアティブ · ローテーション']],slots:'スロット数',trace:'アクセス履歴（0…10⁶、最大 256 項目）',
  hitRate:'ヒット率',hitMiss:'ヒット / ミス',usable:'実際に使えるスロット',hit:'ヒット',miss:'ミス',stepTitle:(n,h)=>`ステップ ${n} · ${h}`,
  cacheHint:'緑はヒット、破線のグレーはミスです。文字でも状態を示します。セットへの対応は key % sets です。容量が 8 の倍数でないときは切り捨て、最小は 8 です。',
  cacheHead:['ステップ','キー','状態','追い出し','現在のキー集合'],cacheMore:'表には最初の 48 ステップだけを表示します。計算とエクスポートには全履歴が含まれます。',
  heteroBytes:'残りのトラフィック D',cpuRate:'CPU 側の実効速度',gpuRate:'PCIe/GPU 側の実効速度',gpuShare:'GPU に回す割合',join:'マージコスト',
  stageTime:'現在の分担での段階時間',bestShare:'理想的な GPU 割合',bestTime:'理想的なバランス時間',heteroX:'GPU 割合 %',heteroY:'段階時間 ms',
  heteroHint:(c,g)=>`CPU 側 ${c} ms、GPU 側 ${g} ms。このモデルは、共有 DRAM、KV 転送の競合、実際の GPU カーネルのコスト変化を考慮していません。`,
  inTokens:'入力トークン数',chunk:'チャンクサイズ',budget:'借りられる scratch 予算',chunks:'チャンク数',verdict:'予算の判定',ok:'可能',bad:'不可',over:'超過',
  prefillOk:s=>'教育用コストは約 '+s+' 秒です。',prefillBad:'このチャンクサイズは入力の予算を超えています。デプロイ可能な結果として扱わないでください。',prefillTail:' 再利用曲線とメモリの傾きは、説明のために人為的に決めた値です。',
  prefillHead:['chunk','scratch MiB','教育用時間 s','予算'],prefillEq:'r(C)=300+2700C/(C+512) token/s<br>scratch=128+0.5C MiB<br>T=N/r(C)+ceil(N/C)×0.005 秒',
  ctx:'シーケンスあたりのコンテキスト',seqs:'アクティブなシーケンス数',kvBits:'教育用 K/V ビット幅',mixed:'K8 / V4（教育用の混合）',resident:'VRAM 常駐ウィンドウ',meta:'仮定した KV メタデータのオーバーヘッド',
  kvAll:'主 KV ペイロード合計',kvRes:'常駐 KV ペイロード',gdnSum:'GDN 主状態の合計',kvHead:['項目','教育用の計算'],
  kvRows:['シーケンス・トークンあたりの主 KV','シーケンスあたりの全 KV','KV 合計 + 仮定メタデータ','常駐していない論理 KV ペイロード'],bytesUnit:' バイト',
  kvWarn:'常駐していないことは、削除済みを意味しません。ホストが完全な KV のコピーを持っている場合があります。ビット幅メニューは容量の見積もり専用です。上流の任意の量子化と streaming の組み合わせが動くことは保証しません。',
  kvEq:'12 層 × T × 2 KV ヘッド × 256 次元 × (K ビット幅 + V ビット幅)/8 × セッション数',
  p:'位置ごとの条件付き受理率 p',base:'ドラフトなしのターゲットコスト',verify:'1 件あたりの追加検証コスト',draft:'1 件あたりのドラフト作成コスト',bestK:'理想的なドラフト数',rate:'教育用の出力速度',vsNone:'ドラフトなし比',
  specHead:['k','期待前進量 E','このラウンドのコスト ms','token/s','純利益'],specEq:'E=1+p+p²+…+pᵏ<br>コスト=base+k×(追加検証+ドラフト)、速度=1000E/コスト',
  specHint:'期待値の式は上流のコントローラに対応しています。このコスト式は、エキスパート集合の再利用、キャッシュ、非線形なカーネルコストを省いています。',
  accepted:'受理したドラフトのプレフィックス長',start:'開始状態',committed:'正しくコミットした状態',naive:'カウンタだけ巻き戻した誤った状態',draftN:n=>`ドラフト ${n}`,accept:'受理',dropTail:'後続を破棄',candState:'候補の状態',
  commitEq:'toy 漸化式 s ← 0.5s+t、コミット済みプレフィックス [1,2]、候補 [3,5,2,4]',
  readBytes:'ネットワーク読み込み 1 回のバイト数',newline:'イベントの改行',restored:'復元したテキスト',reads:'読み込み回数',events:'完全なイベント数',rawEvents:'生のイベントテキスト',hexSlices:'バイトの分割（16 進）',slice:n=>`分割 ${n}`,
  sseHint:n=>`${n} バイト → インクリメンタル UTF-8 デコード → 空行でフレーム分割 → data 行を結合 → JSON。ネットワークの分割数は、トークン数ではありません。`,
  lengths:'同時に届いたジョブの長さ（最大 6 件）',mode:'スケジューリング方式',modes:[['fcfs','FCFS 先着順'],['rr','ラウンドロビン RR']],quantum:'1 ターンのトークン量子',switchCost:'ジョブ切替コスト',
  total:'総完了時間',p95:'最初のトークン p95',sysRate:'システム全体のスループット',gantt:'ジョブスケジューリングの教育用ガントチャート',job:n=>`ジョブ ${n}`,
  schedHead:['ジョブ','長さ','最初のトークン ms','完了 ms'],switches:n=>` 切替 ${n} 回。最初の起動は切替に数えません。`,
  math:{'计算':'計算','搬运':'データ転送',
   '未计非专家权重、热专家、卷积/PLE/MTP、scratch、图、页表精确布局与预留；RAM/GPU 是否保留副本取决于实现。':'含まないもの：非エキスパートの重み、ホットなエキスパート、conv/PLE/MTP、scratch、グラフ、ページテーブルの正確なレイアウトと予約領域。RAM/GPU がコピーを持つかどうかは実装によります。',
   '只演示候选状态事务，不模拟真实 Verifier row 0 / 目标下一 token 的计数偏移。':'候補状態のトランザクションだけを示します。実際の Verifier row 0 / ターゲットの次トークンに関するカウンタのずれはモデル化していません。',
   '所有请求 t=0 已就绪；1 token=1 ms；无 prefill、GPU batching 或缓存。分位数为线性插值。':'すべてのリクエストは t=0 で準備完了、1 token = 1 ms。プリフィル、GPU バッチ処理、キャッシュはありません。パーセンタイルは線形補間です。',
   'shape 不匹配':'shape が一致しません','trace 长度需为 1…256':'trace の長さは 1…256 にしてください','八路组相联至少需要 8 个槽；请增大容量。':'8 ウェイ セットアソシアティブには 8 スロット以上が必要です。容量を増やしてください。','分数不能为空':'スコアが空です','教学作业总长度不超过 400':'ジョブの長さの合計は 400 までです','未知调度':'不明なスケジューラです','未知策略':'不明なポリシーです','空数组':'配列が空です','空样本':'サンプルが空です','需要 1…6 条作业':'ジョブは 1…6 件必要です'},
  mathPatterns:[[/^(.+)应在(.+)…(.+)$/,(m,n,a,b)=>`「${n}」は ${a}…${b} の範囲にしてください`],[/^(.+)必须大于零$/,(m,n)=>`「${n}」はゼロより大きくしてください`],[/^(.+)必须是有限数$/,(m,n)=>`「${n}」は有限の数にしてください`],[/^(.+)超出整数范围$/,(m,n)=>`「${n}」が整数の範囲を超えています`]],
  names:{'键':'キー','衰减':'減衰','会话数':'セッション数','状态/输入':'状態/入力','CPU 有效速率':'CPU 実効速度','GPU 比例':'GPU 割合','K 位宽':'K ビット幅','PCIe 分支有效速率':'PCIe 側の実効速度','scratch 预算':'scratch 予算','V 位宽':'V ビット幅','上下文':'コンテキスト','条件概率':'条件付き確率','位宽':'ビット幅','数值':'値','元数据比例':'メタデータの割合','元素':'要素','输入长度':'入力の長さ','输出长度':'出力の長さ','分位数':'パーセンタイル','分片字节':'分割のバイト数','切换成本':'切替コスト','合并时间':'マージ時間','固定开销':'固定オーバーヘッド','基线时间':'ベース時間','额外验证时间':'追加検証時間','块大小':'チャンクサイズ','局部加速':'局所的な高速化','温度':'温度'}
},
 ko:{
  locale:'ko-KR',
  numList:'쉼표로 구분한 숫자를 입력하세요',outOfRange:'값이 허용 범위를 벗어났어요',missingInput:'입력값이 없어요',
  plotX:'비율',plotAria:(y,x)=>x+'에 따른 '+y+'의 교육용 곡선',
  notFound:'실험을 찾을 수 없어요.',controls:'실험 파라미터',reset:'기본값으로 되돌리기',kind:'교육용 추정, 하드웨어 실측 아님',
  journeyStep:'현재 단계',journeyKind:'교육용 경로 개요',journeyRead:'해당 장 읽기 →',
  journey:[['메시지와 템플릿','서비스 계층이 역할, 도구, 텍스트를 템플릿에 넣고 토큰 ID로 인코딩해요.'],['이미 받은 입력 처리','프리필은 청크 단위로 각 층의 상태를 만들어요. 마지막 프롬프트 토큰에서 검증 창으로 넘어가는 방식은 명확히 정해져 있어요.'],['층별 계산과 라우팅','GDN / QSA가 히스토리를 처리해요. 전문가는 MoE 층마다 따로 골라요. 모델 전체에서 한 번만 고르는 게 아니에요.'],['이기종 전문가 계산','핫 전문가는 GPU에 있어요. RAM 쪽에서는 빠진 전문가를 CPU가 계산할 수 있어요. 그래도 임계 경로는 잔차 의존성에 묶여 있어요.'],['검증과 커밋','후보는 연속으로 맞은 접두사만 받아들여요. GDN, PLE, indexer, KV는 각자 다른 방식으로 상태를 처리해요.'],['샘플링과 프로토콜 출력','타깃의 선택이 새 히스토리가 돼요. 바이트는 점진적으로 디코딩되고 이벤트 단위로 나뉘어 클라이언트에 전달돼요. 그리고 루프가 계속돼요.']],
  temp:'온도 (0 = 그리디)',u:'균등 난수 u',chosen:'선택된 후보',probSum:'확률 합계',fixedLogits:'고정 logits = [2, 1, 0]',
  samplingHead:['후보','확률','누적 확률'],samplingHint:'역누적분포 방법으로 u가 들어가는 구간을 골라요. 구간은 왼쪽 닫힘, 오른쪽 열림이에요. 반올림한 표시값은 내부 정밀도가 아니에요.',
  matrixHint:'형태: (2×3) · (3×1) → (2×1). 행 우선 순서에서 원소 W[i,j]의 오프셋은 i×3+j예요.',matrixHead:['출력 행','항별 곱','합계'],
  bits:'코드 비트 폭',outlier:'마지막 원소 배율',maxErr:'최대 오차',storage:'scale 포함 저장량',perWeight:' bit/가중치',
  quantEq:(Q,scale)=>`Q=${Q}; scale=${scale}; q=round(x/scale), [−Q,Q]로 제한`,quantHead:['원래 값','코드','복원값','오차'],
  quantHint:'저장량은 가중치 32개마다 16-bit scale 하나를 공유한다고 따로 추정해요. 이 표에는 예시 원소 4개만 있어요. offset, 정렬, 실제 코드북은 포함하지 않아요.',
  ops:'작업량',bytes:'선택한 계층을 지나는 트래픽',peak:'계산 상한',bw:'지속 대역폭',launch:'숨길 수 없는 고정 오버헤드',share:'최적화 단계의 비중',speedup:'부분 가속',
  lower:'시간 하한',bottleneck:'주요 제약',overall:'전체 가속',pureCompute:'계산만',pureMove:'데이터 이동만',
  roofHint:'입력은 가정한 지속 성능이에요. 의존성, 불규칙 접근 같은 비용은 넣지 않았어요. 출력은 특정 GPU의 실제 성능이 아니에요.',
  old:'이전 상태 S',alpha:'감쇠 α',beta:'쓰기 강도 β',key:'키 k',value:'값 v',right:'올바른 출력',wrong:'잘못된 순서의 출력',
  gdnHead:['단계','값'],gdnRows:['먼저 감쇠 αS','예측 k×감쇠된 상태','잔차 β(v−예측)','새 상태 감쇠된 상태+k×잔차'],
  gdnHint:'q는 1로 고정해요. 잘못된 순서는 이전 상태로 먼저 갱신하고 나중에 감쇠해요. 유한하고 매끄러운 숫자라고 해서 맞는 건 아니에요.',
  policy:'정책',policies:[['lru','완전 연관 LRU'],['lfu','완전 연관 LFU'],['fifo','완전 연관 FIFO'],['assoc','8웨이 집합 연관 · 순환']],slots:'슬롯 수',trace:'접근 순서 (0…10⁶, 최대 256개)',
  hitRate:'히트율',hitMiss:'히트 / 미스',usable:'실제 사용 가능 슬롯',hit:'히트',miss:'미스',stepTitle:(n,h)=>`${n}단계 · ${h}`,
  cacheHint:'초록색은 히트, 점선 회색은 미스예요. 글자로도 상태를 보여 줘요. 집합 매핑은 key % sets예요. 용량이 8의 배수가 아니면 내림하고, 최소 8이에요.',
  cacheHead:['단계','키','상태','축출','현재 키 집합'],cacheMore:'표에는 처음 48단계만 보여 줘요. 계산과 내보내기에는 전체 순서가 들어가요.',
  heteroBytes:'남은 트래픽 D',cpuRate:'CPU 쪽 유효 속도',gpuRate:'PCIe/GPU 쪽 유효 속도',gpuShare:'GPU에 보내는 비율',join:'병합 비용',
  stageTime:'현재 분담의 단계 시간',bestShare:'이상적인 GPU 비율',bestTime:'이상적인 균형 시간',heteroX:'GPU 비율 %',heteroY:'단계 시간 ms',
  heteroHint:(c,g)=>`CPU 쪽 ${c} ms, GPU 쪽 ${g} ms. 이 모델은 공유 DRAM, KV 전송 경합, 실제 GPU 커널 비용의 변화를 고려하지 않아요.`,
  inTokens:'입력 토큰 수',chunk:'청크 크기',budget:'빌릴 수 있는 scratch 예산',chunks:'청크 수',verdict:'예산 판정',ok:'가능',bad:'불가능',over:'초과',
  prefillOk:s=>'교육용 비용은 약 '+s+'초예요.',prefillBad:'이 청크 크기는 입력 예산을 넘어요. 배포 가능한 결과로 보면 안 돼요.',prefillTail:' 재사용 곡선과 메모리 기울기는 설명을 위해 임의로 정한 값이에요.',
  prefillHead:['chunk','scratch MiB','교육용 시간 s','예산'],prefillEq:'r(C)=300+2700C/(C+512) token/s<br>scratch=128+0.5C MiB<br>T=N/r(C)+ceil(N/C)×0.005초',
  ctx:'시퀀스당 컨텍스트',seqs:'활성 시퀀스 수',kvBits:'교육용 K/V 비트 폭',mixed:'K8 / V4 (교육용 혼합)',resident:'VRAM 상주 창',meta:'가정한 KV 메타데이터 오버헤드',
  kvAll:'주 KV 페이로드 합계',kvRes:'상주 KV 페이로드',gdnSum:'GDN 주 상태 합계',kvHead:['항목','교육용 계산'],
  kvRows:['시퀀스·토큰당 주 KV','시퀀스당 전체 KV','KV 합계 + 가정한 메타데이터','상주하지 않는 논리 KV 페이로드'],bytesUnit:' 바이트',
  kvWarn:'상주하지 않는다고 삭제된 건 아니에요. 호스트가 전체 KV 사본을 갖고 있을 수 있어요. 비트 폭 메뉴는 용량 추정에만 써요. 업스트림의 어떤 양자화든 streaming과 함께 동작한다고 보장하지 않아요.',
  kvEq:'12층 × T × 2 KV 헤드 × 256차원 × (K 비트 폭 + V 비트 폭)/8 × 세션 수',
  p:'위치별 조건부 수락률 p',base:'드래프트 없는 타깃 비용',verify:'드래프트당 추가 검증 비용',draft:'드래프트당 작성 비용',bestK:'이상적인 드래프트 수',rate:'교육용 출력 속도',vsNone:'드래프트 없음 대비',
  specHead:['k','기대 진행량 E','이번 라운드 비용 ms','token/s','순이득'],specEq:'E=1+p+p²+…+pᵏ<br>비용=base+k×(추가 검증+드래프트); 속도=1000E/비용',
  specHint:'기대값 공식은 업스트림 컨트롤러와 맞아요. 이 비용 공식은 전문가 집합 재사용, 캐시, 비선형 커널 비용을 생략했어요.',
  accepted:'수락된 드래프트 접두사 길이',start:'시작 상태',committed:'올바르게 커밋한 상태',naive:'카운터만 되돌린 잘못된 상태',draftN:n=>`드래프트 ${n}`,accept:'수락',dropTail:'뒷부분 버림',candState:'후보 상태',
  commitEq:'toy 점화식 s ← 0.5s+t; 커밋된 접두사 [1,2]; 후보 [3,5,2,4]',
  readBytes:'네트워크 읽기 1회의 바이트 수',newline:'이벤트 줄바꿈',restored:'복원된 텍스트',reads:'읽기 횟수',events:'완전한 이벤트 수',rawEvents:'원본 이벤트 텍스트',hexSlices:'바이트 조각 (16진수)',slice:n=>`조각 ${n}`,
  sseHint:n=>`${n}바이트 → 점진적 UTF-8 디코딩 → 빈 줄로 프레임 분할 → data 줄 합치기 → JSON. 네트워크 조각 수는 토큰 수가 아니에요.`,
  lengths:'동시에 도착한 작업 길이 (최대 6개)',mode:'스케줄링 정책',modes:[['fcfs','FCFS 선착순'],['rr','라운드 로빈 RR']],quantum:'한 차례의 토큰 퀀텀',switchCost:'작업 전환 비용',
  total:'총 완료 시간',p95:'첫 토큰 p95',sysRate:'시스템 전체 처리량',gantt:'작업 스케줄링 교육용 간트 차트',job:n=>`작업 ${n}`,
  schedHead:['작업','길이','첫 토큰 ms','완료 ms'],switches:n=>` 전환 ${n}회. 첫 시작은 전환으로 세지 않아요.`,
  math:{'计算':'계산','搬运':'데이터 이동',
   '未计非专家权重、热专家、卷积/PLE/MTP、scratch、图、页表精确布局与预留；RAM/GPU 是否保留副本取决于实现。':'포함하지 않은 것: 비전문가 가중치, 핫 전문가, conv/PLE/MTP, scratch, 그래프, 페이지 테이블의 정확한 배치와 예약 영역. RAM/GPU가 사본을 두는지는 구현에 따라 달라요.',
   '只演示候选状态事务，不模拟真实 Verifier row 0 / 目标下一 token 的计数偏移。':'후보 상태 트랜잭션만 보여 줘요. 실제 Verifier row 0 / 타깃 다음 토큰의 카운터 오프셋은 모델링하지 않아요.',
   '所有请求 t=0 已就绪；1 token=1 ms；无 prefill、GPU batching 或缓存。分位数为线性插值。':'모든 요청은 t=0에 준비돼 있고, 1 token = 1 ms예요. 프리필, GPU 배칭, 캐시는 없어요. 백분위수는 선형 보간이에요.',
   'shape 不匹配':'shape가 맞지 않아요','trace 长度需为 1…256':'trace 길이는 1…256이어야 해요','八路组相联至少需要 8 个槽；请增大容量。':'8웨이 집합 연관에는 슬롯이 8개 이상 필요해요. 용량을 늘리세요.','分数不能为空':'점수가 비어 있어요','教学作业总长度不超过 400':'작업 길이 합계는 400을 넘을 수 없어요','未知调度':'알 수 없는 스케줄러예요','未知策略':'알 수 없는 정책이에요','空数组':'배열이 비어 있어요','空样本':'샘플이 비어 있어요','需要 1…6 条作业':'작업이 1…6개 필요해요'},
  mathPatterns:[[/^(.+)应在(.+)…(.+)$/,(m,n,a,b)=>`${n} 값은 ${a}…${b} 범위여야 해요`],[/^(.+)必须大于零$/,(m,n)=>`${n} 값은 0보다 커야 해요`],[/^(.+)必须是有限数$/,(m,n)=>`${n} 값은 유한한 수여야 해요`],[/^(.+)超出整数范围$/,(m,n)=>`${n} 값이 정수 범위를 벗어났어요`]],
  names:{'键':'키','衰减':'감쇠','会话数':'세션 수','状态/输入':'상태/입력','CPU 有效速率':'CPU 유효 속도','GPU 比例':'GPU 비율','K 位宽':'K 비트 폭','PCIe 分支有效速率':'PCIe 쪽 유효 속도','scratch 预算':'scratch 예산','V 位宽':'V 비트 폭','上下文':'컨텍스트','条件概率':'조건부 확률','位宽':'비트 폭','数值':'값','元数据比例':'메타데이터 비율','元素':'원소','输入长度':'입력 길이','输出长度':'출력 길이','分位数':'백분위수','分片字节':'조각 바이트 수','切换成本':'전환 비용','合并时间':'병합 시간','固定开销':'고정 오버헤드','基线时间':'기준 시간','额外验证时间':'추가 검증 시간','块大小':'청크 크기','局部加速':'부분 가속','温度':'온도'}
},
 es:{
  locale:'es',
  numList:'Escribe números separados por comas',outOfRange:'Un valor está fuera del rango permitido',missingInput:'Falta un dato',
  plotX:'proporción',plotAria:(y,x)=>'Curva didáctica de '+y+' frente a '+x,
  notFound:'Laboratorio no encontrado.',controls:'Parámetros del laboratorio',reset:'Restablecer valores',kind:'estimación didáctica; no es una medición de hardware',
  journeyStep:'Etapa',journeyKind:'esquema didáctico del recorrido',journeyRead:'Leer el capítulo →',
  journey:[['Mensaje y plantilla','El servidor coloca roles, herramientas y texto en la plantilla de chat y luego los codifica como IDs de token.'],['Leer el prompt','El prefill construye el estado de cada capa chunk a chunk. El paso del último token del prompt a la ventana de verificación sigue un contrato fijo.'],['Capas y enrutamiento','GDN / QSA manejan el historial; cada capa MoE elige sus propios expertos, no el modelo entero una sola vez.'],['Expertos repartidos','Los expertos calientes viven en la GPU; del lado de la RAM, la CPU puede calcular los expertos que faltan. La dependencia residual sigue limitando la ruta crítica.'],['Verificar y confirmar','Solo se acepta un prefijo continuo de borradores correctos; GDN, PLE, el indexer y la KV gestionan el estado cada uno a su manera.'],['Muestrear y transmitir','La elección del modelo objetivo se vuelve historial; los bytes se decodifican de forma incremental y se empaquetan como eventos para el cliente, y el ciclo se repite.']],
  temp:'Temperatura (0 = voraz)',u:'Número aleatorio uniforme u',chosen:'Candidato elegido',probSum:'Suma de probabilidades',fixedLogits:'Logits fijos = [2, 1, 0]',
  samplingHead:['Candidato','Probabilidad','Acumulada'],samplingHint:'El muestreo por CDF inversa elige el intervalo donde cae u. Los intervalos son cerrados a la izquierda y abiertos a la derecha; los valores redondeados que se muestran no son la precisión interna.',
  matrixHint:'Formas: (2×3) · (3×1) → (2×1). En orden por filas, el elemento W[i,j] está en el desplazamiento i×3+j.',matrixHead:['Fila de salida','Productos','Suma'],
  bits:'Ancho del código',outlier:'Escala del último elemento',maxErr:'Error máximo',storage:'Almacenamiento con escala',perWeight:' bit/peso',
  quantEq:(Q,scale)=>`Q=${Q}; scale=${scale}; q=round(x/scale), limitado a [−Q,Q]`,quantHead:['Valor','Código','Reconstruido','Error'],
  quantHint:'El almacenamiento supone un factor de escala de 16 bits por cada 32 pesos; esta tabla muestra solo 4 valores de ejemplo. No incluye offsets, alineación ni codebooks reales.',
  ops:'Trabajo',bytes:'Tráfico por el nivel elegido',peak:'Techo de cómputo',bw:'Ancho de banda sostenido',launch:'Costo fijo que no se oculta',share:'Peso de la etapa optimizada',speedup:'Aceleración local',
  lower:'Cota inferior de tiempo',bottleneck:'Limitado por',overall:'Aceleración total',pureCompute:'solo cómputo',pureMove:'solo movimiento de datos',
  roofHint:'Las entradas son tasas sostenidas supuestas. Se ignoran dependencias, accesos irregulares y otros costos; el resultado no es el rendimiento real de ninguna GPU.',
  old:'Estado anterior S',alpha:'Decaimiento α',beta:'Fuerza de escritura β',key:'Clave k',value:'Valor v',right:'Salida correcta',wrong:'Salida en orden erróneo',
  gdnHead:['Paso','Valor'],gdnRows:['Primero decae: αS','Predicción: k × estado decaído','Residuo: β(v − predicción)','Nuevo estado: estado decaído + k × residuo'],
  gdnHint:'q vale 1. El orden erróneo actualiza desde el estado anterior y decae después; un número finito y suave no es por eso correcto.',
  policy:'Política',policies:[['lru','LRU totalmente asociativa'],['lfu','LFU totalmente asociativa'],['fifo','FIFO totalmente asociativa'],['assoc','Asociativa de 8 vías · rotación']],slots:'Huecos',trace:'Traza de accesos (0…10⁶, hasta 256)',
  hitRate:'Tasa de aciertos',hitMiss:'Aciertos / fallos',usable:'Huecos útiles',hit:'acierto',miss:'fallo',stepTitle:(n,h)=>`Paso ${n} · ${h}`,
  cacheHint:'Los aciertos se resaltan, los fallos llevan línea discontinua y cada uno tiene también una etiqueta de texto. Los conjuntos se asignan con key % sets; la capacidad se redondea hacia abajo a un múltiplo de 8, como mínimo 8.',
  cacheHead:['Paso','Clave','Resultado','Expulsada','Claves ahora'],cacheMore:'La tabla muestra los primeros 48 pasos; el resultado y la exportación cubren la traza completa.',
  heteroBytes:'Tráfico restante D',cpuRate:'Tasa efectiva de la CPU',gpuRate:'Tasa efectiva PCIe/GPU',gpuShare:'Parte enviada a la GPU',join:'Costo de unión',
  stageTime:'Tiempo de etapa con este reparto',bestShare:'Mejor parte para la GPU',bestTime:'Tiempo de etapa equilibrado',heteroX:'Parte GPU %',heteroY:'tiempo de etapa ms',
  heteroHint:(c,g)=>`Rama CPU ${c} ms; rama GPU ${g} ms. El modelo ignora la DRAM compartida, la contención en las transferencias de KV y los cambios de costo de los kernels de GPU.`,
  inTokens:'Tokens del prompt',chunk:'Tamaño de chunk',budget:'Presupuesto de scratch prestable',chunks:'Chunks',verdict:'Presupuesto',ok:'cabe',bad:'no cabe',over:'excede',
  prefillOk:s=>'Costo didáctico de unos '+s+' s.',prefillBad:'Este tamaño de chunk supera el presupuesto; no lo tomes como un resultado desplegable.',prefillTail:' La curva de reutilización y la pendiente de memoria son inventadas para enseñar.',
  prefillHead:['chunk','scratch MiB','tiempo didáctico s','presupuesto'],prefillEq:'r(C)=300+2700C/(C+512) token/s<br>scratch=128+0.5C MiB<br>T=N/r(C)+ceil(N/C)×0.005 s',
  ctx:'Contexto por secuencia',seqs:'Secuencias activas',kvBits:'Ancho K/V didáctico',mixed:'K8 / V4 (mezcla didáctica)',resident:'Ventana residente en VRAM',meta:'Sobrecosto supuesto de metadatos KV',
  kvAll:'Carga KV principal, total',kvRes:'Carga KV residente',gdnSum:'Estado GDN principal, total',kvHead:['Elemento','Cálculo didáctico'],
  kvRows:['KV principal por token y secuencia','KV completa por secuencia','KV total + metadatos supuestos','Carga KV lógica no residente'],bytesUnit:' bytes',
  kvWarn:'No residente no significa borrado; el host puede guardar todavía una copia completa de la KV. El menú de anchos sirve solo para estimar capacidad y no promete que cualquier cuantización upstream funcione con streaming.',
  kvEq:'12 capas × T × 2 cabezas KV × 256 dims × (ancho K + ancho V)/8 × sesiones',
  p:'Tasa de aceptación condicional p',base:'Costo objetivo sin borradores',verify:'Costo extra de verificar cada borrador',draft:'Costo de generar cada borrador',bestK:'Mejor número de borradores',rate:'Velocidad didáctica',vsNone:'vs. sin borradores',
  specHead:['k','Avance esperado E','Costo por ronda ms','token/s','Ganancia neta'],specEq:'E=1+p+p²+…+pᵏ<br>costo=base+k×(verificación extra+borrador); velocidad=1000E/costo',
  specHint:'La esperanza coincide con el controlador upstream; esta fórmula de costo omite la reutilización de expertos, la caché y los costos no lineales de los kernels.',
  accepted:'Longitud del prefijo aceptado',start:'Estado inicial',committed:'Estado confirmado correcto',naive:'Estado erróneo tras solo retroceder el contador',draftN:n=>`Borrador ${n}`,accept:'aceptado',dropTail:'cola descartada',candState:'estado candidato',
  commitEq:'recurrencia de juguete s ← 0.5s+t; prefijo confirmado [1,2]; candidatos [3,5,2,4]',
  readBytes:'Bytes por lectura de red',newline:'Fin de línea del evento',restored:'Texto recuperado',reads:'Lecturas',events:'Eventos completos',rawEvents:'Texto bruto de los eventos',hexSlices:'Trozos de bytes (hex)',slice:n=>`trozo ${n}`,
  sseHint:n=>`${n} bytes → decodificación UTF-8 incremental → corte en líneas vacías → unión de líneas data → JSON. El número de lecturas de red no es el número de tokens.`,
  lengths:'Longitudes de tareas que llegan juntas (hasta 6)',mode:'Política de planificación',modes:[['fcfs','FCFS: primero en llegar, primero en ser atendido'],['rr','Round robin (turno rotativo)']],quantum:'Tokens por turno',switchCost:'Costo de cambiar de tarea',
  total:'Tiempo total',p95:'Primer token p95',sysRate:'Throughput del sistema',gantt:'Diagrama de Gantt didáctico de la planificación',job:n=>`Tarea ${n}`,
  schedHead:['Tarea','Longitud','Primer token ms','Fin ms'],switches:n=>` ${n} ${n===1?'cambio':'cambios'}; el primer arranque no cuenta.`,
  math:{'计算':'cómputo','搬运':'movimiento de datos',
   '未计非专家权重、热专家、卷积/PLE/MTP、scratch、图、页表精确布局与预留；RAM/GPU 是否保留副本取决于实现。':'No se cuentan: pesos que no son de expertos, expertos calientes, conv/PLE/MTP, scratch, grafos, la disposición exacta de la tabla de páginas ni las reservas. Que la RAM/GPU guarden copias depende de la implementación.',
   '只演示候选状态事务，不模拟真实 Verifier row 0 / 目标下一 token 的计数偏移。':'Solo muestra la transacción del estado candidato; no modela el desfase real del contador entre Verifier row 0 y el siguiente token objetivo.',
   '所有请求 t=0 已就绪；1 token=1 ms；无 prefill、GPU batching 或缓存。分位数为线性插值。':'Todas las peticiones están listas en t=0; 1 token = 1 ms; sin prefill, batching en GPU ni caché. Los percentiles usan interpolación lineal.',
   'shape 不匹配':'Las formas no coinciden','trace 长度需为 1…256':'La traza necesita 1…256 elementos','八路组相联至少需要 8 个槽；请增大容量。':'La asociativa de 8 vías necesita al menos 8 huecos; aumenta la capacidad.','分数不能为空':'Las puntuaciones no pueden estar vacías','教学作业总长度不超过 400':'La longitud total de las tareas está limitada a 400','未知调度':'Planificador desconocido','未知策略':'Política desconocida','空数组':'Array vacío','空样本':'Muestra vacía','需要 1…6 条作业':'Se necesitan de 1 a 6 tareas'},
  mathPatterns:[[/^(.+)应在(.+)…(.+)$/,(m,n,a,b)=>`${n} debe estar en ${a}…${b}`],[/^(.+)必须大于零$/,(m,n)=>`${n} debe ser mayor que cero`],[/^(.+)必须是有限数$/,(m,n)=>`${n} debe ser un número finito`],[/^(.+)超出整数范围$/,(m,n)=>`${n} está fuera del rango de enteros`]],
  names:{'键':'clave','衰减':'decaimiento','会话数':'sesiones','状态/输入':'estado/entrada','CPU 有效速率':'tasa de la CPU','GPU 比例':'parte de la GPU','K 位宽':'ancho K','PCIe 分支有效速率':'tasa de la rama PCIe','scratch 预算':'presupuesto de scratch','V 位宽':'ancho V','上下文':'contexto','条件概率':'probabilidad condicional','位宽':'ancho de bits','数值':'valor','元数据比例':'proporción de metadatos','元素':'elemento','输入长度':'longitud de entrada','输出长度':'longitud de salida','分位数':'percentil','分片字节':'bytes por trozo','切换成本':'costo de cambio','合并时间':'tiempo de unión','固定开销':'costo fijo','基线时间':'tiempo base','额外验证时间':'tiempo extra de verificación','块大小':'tamaño de chunk','局部加速':'aceleración local','温度':'temperatura'}
},
 ar:{
  locale:'ar-u-nu-latn',
  numList:'أدخل أرقامًا مفصولة بفواصل',outOfRange:'قيمة خارج النطاق المسموح',missingInput:'مُدخل ناقص',
  plotX:'النسبة',plotAria:(y,x)=>'منحنى تعليمي: '+y+' مقابل '+x,
  notFound:'المختبر غير موجود.',controls:'معاملات المختبر',reset:'استعد القيم الافتراضية',kind:'تقدير تعليمي؛ ليس قياسًا على العتاد',
  journeyStep:'المرحلة',journeyKind:'مخطط تعليمي للمسار',journeyRead:'اقرأ الفصل ←',
  journey:[['الرسالة والقالب','يضع الخادم الأدوار والأدوات والنص في قالب المحادثة، ثم يرمّزها إلى معرّفات رموز (token IDs).'],['قراءة المُطالبة','تبني مرحلة prefill حالةَ كل طبقة دفعةً بعد دفعة. والانتقال من آخر رمز في المُطالبة إلى نافذة التحقق يتبع عقدًا ثابتًا.'],['الطبقات والتوجيه','تعالج GDN / QSA السجل؛ وكل طبقة MoE تختار خبراءها بنفسها، لا النموذج كله مرة واحدة.'],['توزيع الخبراء','الخبراء الساخنون على GPU؛ وفي جهة RAM يستطيع المعالج CPU حساب الخبراء الناقصين. لكن اعتماد الوصلة المتبقية ما زال يحدّ المسار الحرج.'],['التحقق والإيداع','لا تُقبل إلا بادئة متصلة من المسودات الصحيحة؛ ولكلٍّ من GDN وPLE وindexer وKV طريقته في معالجة الحالة.'],['أخذ العينة والبث','يصبح اختيار النموذج الهدف سجلًا جديدًا؛ ويُفكّ ترميز البايتات تدريجيًا وتُؤطَّر أحداثًا للعميل، ثم تتكرر الحلقة.']],
  temp:'درجة الحرارة (0 = جشع)',u:'رقم عشوائي منتظم u',chosen:'المرشّح المختار',probSum:'مجموع الاحتمالات',fixedLogits:'logits ثابتة = [2, 1, 0]',
  samplingHead:['المرشّح','الاحتمال','الاحتمال التراكمي'],samplingHint:'أخذ العينات بمعكوس دالة التوزيع التراكمي يختار المجال الذي يقع فيه u. كل مجال مغلق عند حده الأدنى ومفتوح عند حده الأعلى؛ والقيم المقرّبة المعروضة ليست الدقة الداخلية.',
  matrixHint:'الأشكال: (2×3) · (3×1) → (2×1). في الترتيب بالصفوف (row-major) يقع العنصر W[i,j] عند الإزاحة i×3+j.',matrixHead:['صف المُخرج','حواصل الضرب','المجموع'],
  bits:'عرض الترميز',outlier:'مُضاعِف العنصر الأخير',maxErr:'أقصى خطأ',storage:'التخزين مع معامل القياس',perWeight:' bit/وزن',
  quantEq:(Q,scale)=>`Q=${Q}; scale=${scale}; q=round(x/scale) — مقيّدة ضمن [−Q,Q]`,quantHead:['القيمة','الترميز','المُعاد بناؤها','الخطأ'],
  quantHint:'يفترض التخزين معامل قياس (scale) واحدًا بطول 16 بت لكل 32 وزنًا؛ والجدول يعرض 4 قيم مثال فقط. لا يشمل الإزاحات ولا المحاذاة ولا كتب الترميز الحقيقية.',
  ops:'حجم العمل',bytes:'الحركة عبر المستوى المختار',peak:'سقف الحوسبة',bw:'عرض النطاق المستدام',launch:'كلفة ثابتة لا تُخفى',share:'حصة المرحلة المُحسَّنة',speedup:'التسريع المحلي',
  lower:'الحد الأدنى للزمن',bottleneck:'القيد الرئيسي',overall:'التسريع الكلي',pureCompute:'حوسبة فقط',pureMove:'نقل بيانات فقط',
  roofHint:'المُدخلات معدلات مستدامة مفترضة. تُهمَل الاعتماديات والوصول غير المنتظم وكلف أخرى؛ والناتج ليس الأداء الحقيقي لأي GPU.',
  old:'الحالة القديمة S',alpha:'الاضمحلال α',beta:'قوة الكتابة β',key:'المفتاح k',value:'القيمة v',right:'المُخرج الصحيح',wrong:'مُخرج بترتيب خاطئ',
  gdnHead:['الخطوة','القيمة'],gdnRows:['الاضمحلال أولًا: αS','التنبؤ: k × الحالة المضمحلّة','المتبقي: β(v − التنبؤ)','الحالة الجديدة: الحالة المضمحلّة + k × المتبقي'],
  gdnHint:'q ثابتة عند 1. الترتيب الخاطئ يحدّث من الحالة القديمة ثم يطبّق الاضمحلال؛ والرقم المحدود السلس ليس بالضرورة صحيحًا.',
  policy:'السياسة',policies:[['lru','LRU كاملة الترابط'],['lfu','LFU كاملة الترابط'],['fifo','FIFO كاملة الترابط'],['assoc','ترابط مجموعات بثمانية مسارات · تناوب']],slots:'الخانات',trace:'سجل الوصول (0…10⁶، حتى 256 عنصرًا)',
  hitRate:'معدل الإصابة',hitMiss:'إصابات / إخفاقات',usable:'الخانات القابلة للاستخدام',hit:'إصابة',miss:'إخفاق',stepTitle:(n,h)=>`الخطوة ${n} · ${h}`,
  cacheHint:'الإصابات مُبرزة، والإخفاقات بخط متقطع، ولكلٍّ منهما وسم نصي أيضًا. تُوزَّع المجموعات بالصيغة key % sets؛ وتُقرَّب السعة نزولًا إلى مضاعف للعدد 8، ولا تقل عن 8.',
  cacheHead:['الخطوة','المفتاح','النتيجة','المُستبعَد','المفاتيح الآن'],cacheMore:'يعرض الجدول أول 48 خطوة؛ والنتيجة والتصدير يشملان السجل كاملًا.',
  heteroBytes:'الحركة المتبقية D',cpuRate:'معدل CPU الفعلي',gpuRate:'معدل PCIe/GPU الفعلي',gpuShare:'الحصة المرسلة إلى GPU',join:'كلفة الدمج',
  stageTime:'زمن المرحلة لهذا التقسيم',bestShare:'أفضل حصة GPU',bestTime:'زمن المرحلة المتوازن',heteroX:'حصة GPU %',heteroY:'زمن المرحلة ms',
  heteroHint:(c,g)=>`فرع CPU: ${c} ms؛ فرع GPU: ${g} ms. يتجاهل النموذج ذاكرة DRAM المشتركة، وتزاحم نقل KV، وتغيّر كلفة نوى GPU.`,
  inTokens:'رموز المُطالبة',chunk:'حجم الدفعة (chunk)',budget:'ميزانية scratch القابلة للاستعارة',chunks:'الدفعات',verdict:'فحص الميزانية',ok:'يتّسع',bad:'لا يتّسع',over:'تجاوز',
  prefillOk:s=>'الكلفة التعليمية نحو '+s+' s.',prefillBad:'حجم الدفعة هذا يتجاوز الميزانية؛ لا تعدّه نتيجة قابلة للنشر.',prefillTail:' منحنى إعادة الاستخدام وميل الذاكرة مصطنعان لأغراض التعليم.',
  prefillHead:['chunk','scratch MiB','الزمن التعليمي s','الميزانية'],prefillEq:'r(C)=300+2700C/(C+512) token/s<br>scratch=128+0.5C MiB<br>T=N/r(C)+ceil(N/C)×0.005 s',
  ctx:'السياق لكل تسلسل',seqs:'التسلسلات النشطة',kvBits:'عرض K/V التعليمي',mixed:'K8 / V4 (مزيج تعليمي)',resident:'النافذة المقيمة في VRAM',meta:'كلفة بيانات KV الوصفية المفترضة',
  kvAll:'حمولة KV الرئيسية، الإجمالي',kvRes:'حمولة KV المقيمة',gdnSum:'حالة GDN الرئيسية، الإجمالي',kvHead:['البند','الحساب التعليمي'],
  kvRows:['KV الرئيسية لكل رمز لكل تسلسل','KV الكاملة لكل تسلسل','إجمالي KV + البيانات الوصفية المفترضة','حمولة KV المنطقية غير المقيمة'],bytesUnit:' بايت',
  kvWarn:'غير مقيمة لا تعني محذوفة؛ فقد يحتفظ المضيف بنسخة KV كاملة. قائمة العرض لتقدير السعة فقط، ولا تَعِد بأن أي تكميم في المصدر الأصلي يعمل مع البث (streaming).',
  kvEq:'12 طبقة × T × 2 رأس KV × 256 بُعدًا × (عرض K + عرض V)/8 × الجلسات',
  p:'معدل القبول الشرطي p',base:'كلفة الهدف دون مسودات',verify:'كلفة التحقق الإضافية لكل مسودة',draft:'كلفة صياغة كل مسودة',bestK:'أفضل عدد للمسودات',rate:'معدل الإنتاج التعليمي',vsNone:'مقارنة بلا مسودات',
  specHead:['k','التقدّم المتوقع E','كلفة الجولة ms','token/s','الربح الصافي'],specEq:'E=1+p+p²+…+pᵏ<br>الكلفة = الأساس + k × (التحقق الإضافي + الصياغة)؛ المعدل = 1000E / الكلفة',
  specHint:'التوقع يطابق المتحكم في المصدر الأصلي؛ وصيغة الكلفة هذه تُغفل إعادة استخدام الخبراء والتخزين المؤقت وكلف النوى غير الخطية.',
  accepted:'طول البادئة المقبولة من المسودات',start:'الحالة الابتدائية',committed:'الحالة المودَعة الصحيحة',naive:'حالة خاطئة بعد إرجاع العدّاد فقط',draftN:n=>`مسودة ${n}`,accept:'مقبولة',dropTail:'ذيل مُسقَط',candState:'الحالة المرشّحة',
  commitEq:'تكرار تجريبي s ← 0.5s+t؛ البادئة المودَعة [1,2]؛ المرشّحات [3,5,2,4]',
  readBytes:'بايتات كل قراءة شبكية',newline:'نهاية سطر الحدث',restored:'النص المُستعاد',reads:'القراءات',events:'الأحداث الكاملة',rawEvents:'نص الأحداث الخام',hexSlices:'شرائح البايتات (hex)',slice:n=>`شريحة ${n}`,
  sseHint:n=>`${n} بايت ← فك ترميز UTF-8 تدريجي ← تقسيم عند الأسطر الفارغة ← دمج أسطر data ← JSON. عدد القراءات الشبكية ليس عدد الرموز.`,
  lengths:'أطوال المهام الواصلة معًا (حتى 6)',mode:'سياسة الجدولة',modes:[['fcfs','FCFS: من يأتي أولًا يُخدم أولًا'],['rr','التناوب الدائري (RR)']],quantum:'رموز في كل دور',switchCost:'كلفة تبديل المهمة',
  total:'زمن الإنجاز الكلي',p95:'أول رمز p95',sysRate:'إنتاجية النظام',gantt:'مخطط غانت تعليمي لجدولة المهام',job:n=>`مهمة ${n}`,
  schedHead:['المهمة','الطول','أول رمز ms','الإنجاز ms'],switches:n=>` مرات التبديل: ${n}؛ البدء الأول لا يُحتسب.`,
  math:{'计算':'الحوسبة','搬运':'نقل البيانات',
   '未计非专家权重、热专家、卷积/PLE/MTP、scratch、图、页表精确布局与预留；RAM/GPU 是否保留副本取决于实现。':'غير محسوب: أوزان غير الخبراء، والخبراء الساخنون، وconv/PLE/MTP، وscratch، والمخططات (graphs)، والتخطيط الدقيق لجدول الصفحات، والاحتياطيات. واحتفاظ RAM/GPU بنسخ يعتمد على التنفيذ.',
   '只演示候选状态事务，不模拟真实 Verifier row 0 / 目标下一 token 的计数偏移。':'يعرض فقط معاملة الحالة المرشّحة؛ ولا يحاكي إزاحة العدّاد الحقيقية بين Verifier row 0 والرمز الهدف التالي.',
   '所有请求 t=0 已就绪；1 token=1 ms；无 prefill、GPU batching 或缓存。分位数为线性插值。':'كل الطلبات جاهزة عند t=0؛ 1 token = 1 ms؛ لا prefill ولا تجميع دفعات على GPU ولا ذاكرة مؤقتة. المئينات تُحسب بالاستيفاء الخطي.',
   'shape 不匹配':'الأشكال غير متطابقة','trace 长度需为 1…256':'يحتاج سجل الوصول إلى 1…256 عنصرًا','八路组相联至少需要 8 个槽；请增大容量。':'ترابط المجموعات بثمانية مسارات يحتاج إلى 8 خانات على الأقل؛ زِد السعة.','分数不能为空':'الدرجات لا يمكن أن تكون فارغة','教学作业总长度不超过 400':'مجموع أطوال المهام محدود بـ400','未知调度':'مُجدوِل غير معروف','未知策略':'سياسة غير معروفة','空数组':'مصفوفة فارغة','空样本':'عينة فارغة','需要 1…6 条作业':'يلزم من 1 إلى 6 مهام'},
  mathPatterns:[[/^(.+)应在(.+)…(.+)$/,(m,n,a,b)=>`يجب أن تكون قيمة ${n} ضمن ${a}…${b}`],[/^(.+)必须大于零$/,(m,n)=>`يجب أن تكون قيمة ${n} أكبر من الصفر`],[/^(.+)必须是有限数$/,(m,n)=>`يجب أن تكون قيمة ${n} عددًا محدودًا`],[/^(.+)超出整数范围$/,(m,n)=>`قيمة ${n} خارج نطاق الأعداد الصحيحة`]],
  names:{'键':'المفتاح','衰减':'الاضمحلال','会话数':'الجلسات','状态/输入':'الحالة/المُدخل','CPU 有效速率':'معدل CPU','GPU 比例':'حصة GPU','K 位宽':'عرض K','PCIe 分支有效速率':'معدل فرع PCIe','scratch 预算':'ميزانية scratch','V 位宽':'عرض V','上下文':'السياق','条件概率':'الاحتمال الشرطي','位宽':'عرض البت','数值':'الرقم','元数据比例':'نسبة البيانات الوصفية','元素':'العنصر','输入长度':'طول المُدخل','输出长度':'طول المُخرج','分位数':'المئين','分片字节':'بايتات الشريحة','切换成本':'كلفة التبديل','合并时间':'زمن الدمج','固定开销':'الكلفة الثابتة','基线时间':'الزمن الأساسي','额外验证时间':'زمن التحقق الإضافي','块大小':'حجم الدفعة','局部加速':'التسريع المحلي','温度':'درجة الحرارة'}
}
};
function mount(id,element){
 const T=root.Viz.t(TABLE);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=(n,d=2)=>Number(n).toLocaleString(T.locale,{maximumFractionDigits:d});
 const pct=n=>fmt(n*100,1)+'%';
 // Text produced inside lab-math.js is Chinese; translate it for other languages.
 const tm=s=>{if(typeof s!=='string')return s;if(T.math[s])return T.math[s];for(const [re,f] of T.mathPatterns){const m=s.match(re);if(m)return f(...m.map((x,i)=>i&&T.names[x]?T.names[x]:x));}return s;};
 const metric=(label,value,unit='')=>`<div class="metric"><span>${label}</span><strong>${value}<small>${unit}</small></strong></div>`;
 const range=(key,label,value,min,max,step=1,unit='')=>`<label class="control"><span>${label}<output for="p-${key}">${value}${unit}</output></span><input id="p-${key}" name="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}"></label>`;
 const select=(key,label,options,value)=>`<label class="control"><span>${label}</span><select id="p-${key}" name="${key}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 const text=(key,label,value)=>`<label class="control"><span>${label}</span><input id="p-${key}" name="${key}" type="text" value="${esc(value)}" autocomplete="off" spellcheck="false"></label>`;
 const table=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 const bar=(label,v,max,value)=>`<div class="barrow"><span>${label}</span><div class="bartrack"><i style="width:${Math.max(0,Math.min(100,v/max*100))}%"></i></div><strong>${value}</strong></div>`;
 const numberlist=(text,min=-1e6,max=1e6)=>{const a=text.trim().split(/[,，\s]+/);if(!a.length||a.some(s=>!s.trim()))throw new Error(T.numList);return a.map(s=>{const n=Number(s);if(!Number.isFinite(n)||n<min||n>max)throw new Error(T.outOfRange);return n;});};
 function plot(points,{xLabel=T.plotX,yLabel='ms'}={}){
  const W=640,H=220,pad=44,maxX=Math.max(...points.map(p=>p[0]),1),maxY=Math.max(...points.map(p=>p[1]),.001)*1.08;
  const X=x=>pad+x/maxX*(W-pad-16),Y=y=>H-pad-y/maxY*(H-pad-20);
  const path=points.map(([x,y],i)=>(i?'L':'M')+X(x).toFixed(2)+','+Y(y).toFixed(2)).join(' ');
  return `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T.plotAria(yLabel,xLabel))}"><path class="axis" d="M${pad} 15V${H-pad}H625"/>${[0,.5,1].map(t=>`<text x="${pad-7}" y="${Y(maxY*t)+4}" text-anchor="end">${fmt(maxY*t,1)}</text><path class="gridline" d="M${pad} ${Y(maxY*t)}H625"/>`).join('')}<path class="plotline" d="${path}"/><text x="${pad}" y="205">0</text><text x="622" y="205" text-anchor="end">${fmt(maxX)} · ${esc(xLabel)}</text><text x="${pad+5}" y="14">${esc(yLabel)}</text></svg>`;
 }
 let controls='',compute;
 const val=(k)=>{const e=element.querySelector(`[name="${k}"]`);if(!e)throw new Error(T.missingInput);return e.value;};
 const num=k=>Number(val(k));
 if(id==='journey'){
  controls=range('step',T.journeyStep,0,0,5,1);
  const refs=[['23','S16'],['16','S12'],['10','S04'],['13','S06'],['18','S08'],['23','S15']];
  compute=()=>{const steps=T.journey;let i=num('step');return {data:{step:i,title:steps[i][0],kind:T.journeyKind},html:`<div class="journey-strip">${steps.map((s,j)=>`<button class="journey-step ${i===j?'selected':''}" data-journey="${j}"><b>0${j+1}</b>${s[0]}</button>`).join('')}</div><div class="focus-panel"><span class="eyebrow">STAGE 0${i+1}</span><h2>${steps[i][0]}</h2><p>${steps[i][1]}</p><a class="text-link" href="#chapter/${refs[i][0]}">${T.journeyRead}</a> <a class="ref" href="#source/${refs[i][1]}">${refs[i][1]}</a></div>`};};
 }else if(id==='sampling'){
  controls=range('temp',T.temp,1,0,3,.05)+range('u',T.u,.8,0,.999,.001);
  compute=()=>{const p=M.softmax([2,1,0],num('temp')),chosen=M.sample(p,num('u'));let total=0;return {data:{probabilities:p,selected:chosen},html:`<div class="metrics">${metric(T.chosen,['A','B','C'][chosen])}${metric(T.probSum,fmt(p.reduce((a,b)=>a+b),6))}</div><h3>${T.fixedLogits}</h3>${p.map((x,i)=>bar(['A','B','C'][i],x,1,pct(x))).join('')}${table(T.samplingHead,p.map((x,i)=>{total+=x;return [[`A`,`B`,`C`][i],fmt(x,6),fmt(total,6)];}))}<p class="hint">${T.samplingHint}</p>`};};
 }else if(id==='matrix'){
  controls=range('x0','x₀',1,-3,3,.5)+range('x1','x₁',0,-3,3,.5)+range('x2','x₂',-1,-3,3,.5);
  compute=()=>{const W=[[1,2,3],[4,5,6]],x=[num('x0'),num('x1'),num('x2')],y=M.gemv(W,x);return {data:{W,x,y},html:`<div class="matrix-equation"><div class="matrix-box">${W.map(r=>`<div>${r.map(n=>`<span>${n}</span>`).join('')}</div>`).join('')}</div><b>×</b><div class="matrix-box vector">${x.map(n=>`<div><span>${n}</span></div>`).join('')}</div><b>=</b><div class="matrix-box vector result-matrix">${y.map(n=>`<div><span>${n}</span></div>`).join('')}</div></div><p class="hint">${T.matrixHint}</p>${table(T.matrixHead,W.map((r,i)=>[i,r.map((w,j)=>`${w}×(${x[j]})`).join(' + '),fmt(y[i])]))}`};};
 }else if(id==='quant'){
  controls=range('bits',T.bits,4,2,8,1,' bit')+range('outlier',T.outlier,1,1,20,.5,'×');
  compute=()=>{const values=[-1,-.3,.2,num('outlier')],r=M.quantize(values,num('bits'));return {data:{values,...r},html:`<div class="metrics">${metric('MSE',fmt(r.mse,6))}${metric(T.maxErr,fmt(r.maxError,6))}${metric(T.storage,fmt(r.bpw32),T.perWeight)}</div><div class="equation">${T.quantEq(r.Q,fmt(r.scale,6))}</div>${table(T.quantHead,values.map((x,i)=>[x,r.codes[i],fmt(r.reconstructed[i],6),fmt(r.errors[i],6)]))}<p class="hint">${T.quantHint}</p>`};};
 }else if(id==='roofline'){
  controls=range('ops',T.ops,16,1,256,1,' GFLOP')+range('bytes',T.bytes,.6,.1,4,.1,' GB')+range('peak',T.peak,100,1,200,1,' TFLOP/s')+range('bw',T.bw,40,10,1000,10,' GB/s')+range('launch',T.launch,1,0,10,.1,' ms')+range('share',T.share,20,0,100,1,'%')+range('speedup',T.speedup,2,1,10,.1,'×');
  compute=()=>{const r=M.roofline(num('ops'),num('bytes'),num('peak'),num('bw'),num('launch')),s=M.amdahl(num('share')/100,num('speedup'));return {data:{...r,amdahl:s},html:`<div class="metrics">${metric(T.lower,fmt(r.lowerMs),' ms')}${metric(T.bottleneck,tm(r.bottleneck))}${metric(T.overall,fmt(s,3),'×')}</div>${bar(T.pureCompute,r.computeMs,Math.max(r.computeMs,r.memoryMs),fmt(r.computeMs)+' ms')}${bar(T.pureMove,r.memoryMs,Math.max(r.computeMs,r.memoryMs),fmt(r.memoryMs)+' ms')}<div class="equation">I=${fmt(r.intensity,2)} FLOP/byte<br>T ≥ max(${fmt(r.computeMs)}, ${fmt(r.memoryMs)}) + ${num('launch')} ms<br>S=1 / [(1−${num('share')/100})+${num('share')/100}/${num('speedup')}]</div><p class="hint">${T.roofHint}</p>`};};
 }else if(id==='gdn'){
  controls=range('old',T.old,2,-4,4,.25)+range('alpha',T.alpha,.5,0,1,.05)+range('beta',T.beta,.25,0,1,.05)+range('key',T.key,1,-2,2,.25)+range('value',T.value,3,-4,4,.25);
  compute=()=>{const r=M.gdn(num('old'),num('alpha'),num('beta'),num('key'),num('value'));return {data:r,html:`<div class="metrics">${metric(T.right,fmt(r.output,5))}${metric(T.wrong,fmt(r.wrong,5))}</div>${table(T.gdnHead,[[T.gdnRows[0],fmt(r.decayed,5)],[T.gdnRows[1],fmt(r.predicted,5)],[T.gdnRows[2],fmt(r.delta,5)],[T.gdnRows[3],fmt(r.state,5)]])}<p class="hint">${T.gdnHint}</p>`};};
 }else if(id==='cache'){
  controls=select('policy',T.policy,T.policies,'lru')+range('capacity',T.slots,16,4,32,4)+text('trace',T.trace,'1,3,5,7,9,11,13,15,17,1,3,5,7,9,11,13,15,17');
  compute=()=>{const t=numberlist(val('trace'),0,1e6),r=M.cache(t,num('capacity'),val('policy'));return {data:r,html:`<div class="metrics">${metric(T.hitRate,pct(r.rate))}${metric(T.hitMiss,r.hits+' / '+r.misses)}${metric(T.usable,r.capacity)}</div><div class="trace-tokens">${r.steps.map(s=>`<span class="${s.hit?'hit':'miss'}" title="${T.stepTitle(s.step,s.hit?T.hit:T.miss)}">${s.key}</span>`).join('')}</div><p class="hint">${T.cacheHint}</p>${table(T.cacheHead,r.steps.slice(0,48).map(s=>[s.step,s.key,s.hit?T.hit:T.miss,s.evicted??'—',s.contents.join(', ')]))}${r.steps.length>48?`<p class="hint">${T.cacheMore}</p>`:''}`};};
 }else if(id==='hetero'){
  controls=range('bytes',T.heteroBytes,.6,.1,2,.1,' GB')+range('cpu',T.cpuRate,40,5,100,5,' GB/s')+range('gpu',T.gpuRate,20,5,100,5,' GB/s')+range('fraction',T.gpuShare,33,0,100,1,'%')+range('join',T.join,1,0,10,.1,' ms');
  compute=()=>{const D=num('bytes'),c=num('cpu'),g=num('gpu'),j=num('join'),r=M.hetero(D,c,g,num('fraction')/100,j);const pts=Array.from({length:21},(_,i)=>[i*5,M.hetero(D,c,g,i/20,j).totalMs]);return {data:r,html:`<div class="metrics">${metric(T.stageTime,fmt(r.totalMs),' ms')}${metric(T.bestShare,pct(r.bestFraction))}${metric(T.bestTime,fmt(r.idealMs),' ms')}</div>${plot(pts,{xLabel:T.heteroX,yLabel:T.heteroY})}<p class="hint">${T.heteroHint(fmt(r.cpuMs),fmt(r.gpuMs))}</p>`};};
 }else if(id==='prefill'){
  controls=select('tokens',T.inTokens,[[1024,'1,024'],[4096,'4,096'],[16384,'16,384'],[65536,'65,536'],[131072,'131,072']],16384)+select('chunk',T.chunk,[128,256,512,1024,2048,4096,8192,16384].map(n=>[n,String(n)]),1024)+range('budget',T.budget,1024,256,8192,256,' MiB');
  compute=()=>{const N=num('tokens'),C=num('chunk'),B=num('budget'),r=M.prefill(N,C,B),sizes=[128,256,512,1024,2048,4096,8192,16384];return {data:r,html:`<div class="metrics">${metric(T.chunks,r.chunks)}${metric('scratch',fmt(r.scratchMiB),' MiB')}${metric(T.verdict,r.feasible?T.ok:T.bad)}</div><div class="callout ${r.feasible?'':'warn'}">${r.feasible?T.prefillOk(fmt(r.timeMs/1000,3)):T.prefillBad}${T.prefillTail}</div>${table(T.prefillHead,sizes.map(s=>{const p=M.prefill(N,s,B);return [s,p.scratchMiB,fmt(p.timeMs/1000,3),p.feasible?T.ok:T.over];}))}<div class="equation">${T.prefillEq}</div>`};};
 }else if(id==='kv'){
  controls=select('tokens',T.ctx,[4096,16384,32768,65536,131072,262144].map(n=>[n,fmt(n,0)]),131072)+range('sequences',T.seqs,1,1,20,1)+select('precision',T.kvBits,[[16,'K16 / V16'],[8,'K8 / V8'],[4,'K4 / V4'],[84,T.mixed]],16)+select('resident',T.resident,[4096,16384,32768,65536,131072,262144].map(n=>[n,fmt(n,0)]),32768)+range('metadata',T.meta,0,0,20,1,'%');
  compute=()=>{const b=num('precision'),r=M.kv(num('tokens'),num('sequences'),b===84?8:b,b===84?4:b,num('resident'),num('metadata')/100);return {data:r,html:`<div class="metrics">${metric(T.kvAll,fmt(r.all/2**30,3),' GiB')}${metric(T.kvRes,fmt(r.working/2**30,3),' GiB')}${metric(T.gdnSum,fmt(r.gdn/2**20,1),' MiB')}</div>${table(T.kvHead,[[T.kvRows[0],fmt(r.bytesPerToken/1024,2)+' KiB'],[T.kvRows[1],fmt(r.one,0)+T.bytesUnit],[T.kvRows[2],fmt(r.kvWithMetadata/2**30,3)+' GiB'],[T.kvRows[3],fmt(r.nonResidentPayload/2**30,3)+' GiB']])}<div class="callout warn">${T.kvWarn}</div><p class="hint">${tm(r.excluded)}</p><div class="equation">${T.kvEq}</div>`};};
 }else if(id==='spec'){
  controls=range('p',T.p,.8,0,1,.01)+range('base',T.base,8,1,30,.5,' ms')+range('verify',T.verify,2,0,10,.1,' ms')+range('draft',T.draft,1,0,10,.1,' ms');
  compute=()=>{const rows=Array.from({length:6},(_,k)=>M.spec(num('p'),k,num('base'),num('verify'),num('draft'))),best=rows.reduce((a,b)=>a.rate>=b.rate?a:b);return {data:{rows,best},html:`<div class="metrics">${metric(T.bestK,best.k)}${metric(T.rate,fmt(best.rate,1),' token/s')}${metric(T.vsNone,pct(best.gain))}</div>${table(T.specHead,rows.map(r=>[r.k===best.k?'<strong>'+r.k+' ★</strong>':r.k,fmt(r.expected,4),fmt(r.cost,2),fmt(r.rate,2),pct(r.gain)]))}<div class="equation">${T.specEq}</div><p class="hint">${T.specHint}</p>`};};
 }else if(id==='commit'){
  controls=range('accepted',T.accepted,1,0,4,1);
  compute=()=>{const r=M.commitDemo(num('accepted'));return {data:r,html:`<div class="metrics">${metric(T.start,r.base)}${metric(T.committed,fmt(r.committed,4))}${metric(T.naive,fmt(r.naive,4))}</div><div class="candidate-strip">${r.rows.map((x,i)=>`<div class="candidate ${x.accepted?'accepted':'rejected'}"><small>${T.draftN(i+1)}</small><b>${x.token}</b><span>${x.accepted?T.accept:T.dropTail}</span><small>${T.candState} ${fmt(x.state,4)}</small></div>`).join('')}</div><div class="equation">${T.commitEq}</div><p class="hint">${tm(r.warning)}</p>`};};
 }else if(id==='sse'){
  controls=range('size',T.readBytes,3,1,32,1,' B')+select('crlf',T.newline,[[0,'LF'],[1,'CRLF']],0);
  compute=()=>{const r=M.sse(num('size'),num('crlf')===1);return {data:r,html:`<div class="metrics">${metric(T.restored,esc(r.output))}${metric(T.reads,r.chunks.length)}${metric(T.events,r.events.length)}</div><h3>${T.rawEvents}</h3><pre><code>${esc(r.wire)}</code></pre><h3>${T.hexSlices}</h3><div class="hexchunks">${r.chunks.map((x,i)=>`<span title="${T.slice(i+1)}">${x}</span>`).join('')}</div><p class="hint">${T.sseHint(r.byteLength)}</p>`};};
 }else if(id==='scheduler'){
  controls=text('lengths',T.lengths,'8,3,5')+select('mode',T.mode,T.modes,'rr')+range('quantum',T.quantum,1,1,16,1)+range('switch',T.switchCost,0,0,3,.1,' ms');
  compute=()=>{const lengths=numberlist(val('lengths'),1,128),r=M.schedule(lengths,val('mode'),num('quantum'),num('switch')),W=640,H=45+lengths.length*35,scale=560/r.time;return {data:r,html:`<div class="metrics">${metric(T.total,fmt(r.time),' ms')}${metric(T.p95,fmt(r.p95first),' ms')}${metric(T.sysRate,fmt(r.rate,1),' token/s')}</div><svg class="timeline" viewBox="0 0 ${W} ${H}" role="img" aria-label="${T.gantt}">${lengths.map((_,i)=>`<text x="6" y="${30+i*35}">${T.job(i+1)}</text>`).join('')}${r.timeline.map(s=>`<rect class="job-${s.job%4}" x="${65+s.start*scale}" y="${12+s.job*35}" width="${Math.max(.5,(s.end-s.start)*scale)}" height="23"><title>${T.job(s.job+1)}: ${s.start}–${s.end}ms</title></rect>`).join('')}<text x="65" y="${H-3}">0</text><text x="625" text-anchor="end" y="${H-3}">${fmt(r.time)} ms</text></svg>${table(T.schedHead,lengths.map((n,i)=>[i+1,n,fmt(r.first[i]),fmt(r.finish[i])]))}<p class="hint">${tm(r.note)}${T.switches(r.switches)}</p>`};};
 }else{element.innerHTML=`<p>${T.notFound}</p>`;return;}
 element.innerHTML=`<div class="lab-layout"><form class="lab-controls" aria-label="${T.controls}" onsubmit="return false">${controls}<button type="button" class="secondary reset-lab">${T.reset}</button></form><div id="lab-result" class="lab-result" aria-live="polite"></div></div>`;
 const out=element.querySelector('#lab-result'),form=element.querySelector('form');
 let snapshot=null;
 function update(){
  form.querySelectorAll('input[type=range]').forEach(e=>{e.previousElementSibling.querySelector('output').textContent=e.value+e.dataset.unit;});
  try{const r=compute();out.innerHTML=r.html;const params=Object.fromEntries(new FormData(form));snapshot={lab:id,kind:T.kind,params,result:r.data};out.querySelectorAll('[data-journey]').forEach(b=>b.addEventListener('click',()=>{form.elements.step.value=b.dataset.journey;update();}));}
  catch(e){out.innerHTML=`<div class="callout warn" role="alert">${esc(tm(e.message))}</div>`;snapshot=null;}
 }
 form.addEventListener('input',update);form.addEventListener('change',update);element.querySelector('.reset-lab').onclick=()=>{form.reset();update();};update();
 return ()=>snapshot;
}
root.LabViews={mount,TABLE};
})(globalThis);
