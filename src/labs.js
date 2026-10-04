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
