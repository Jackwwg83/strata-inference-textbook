/* Pure teaching models. These are NOT Strata kernels or benchmark predictions. */
(function(root){
'use strict';
const finite=(v,name)=>{ if(!Number.isFinite(v)) throw new Error(`${name}必须是有限数`); return v; };
const positive=(v,name)=>{finite(v,name);if(v<=0)throw new Error(`${name}必须大于零`);return v;};
const integer=(v,name,min=0,max=1e7)=>{finite(v,name);if(!Number.isInteger(v)||v<min||v>max)throw new Error(`${name}超出整数范围`);return v;};
const bound=(v,name,lo,hi)=>{finite(v,name);if(v<lo||v>hi)throw new Error(`${name}应在${lo}…${hi}`);return v;};
function softmax(logits,temp=1){
 if(!Array.isArray(logits)||!logits.length)throw new Error('分数不能为空'); logits.forEach(x=>finite(x,'logit')); bound(temp,'温度',0,10);
 if(temp===0){const k=logits.indexOf(Math.max(...logits));return logits.map((_,i)=>+(i===k));}
 const m=Math.max(...logits),e=logits.map(x=>Math.exp((x-m)/temp)),sum=e.reduce((a,b)=>a+b,0);return e.map(x=>x/sum);
}
function sample(p,u){bound(u,'u',0,1);let s=0;for(let i=0;i<p.length;i++){s+=p[i];if(u<s)return i;}return p.length-1;}
function gemv(W,x){if(!W.length||W.some(r=>r.length!==x.length))throw new Error('shape 不匹配');[...W.flat(),...x].forEach(v=>finite(v,'元素'));return W.map(r=>r.reduce((s,w,i)=>s+w*x[i],0));}
function quantize(values,bits){integer(bits,'位宽',2,8);if(!values.length)throw new Error('空数组');values.forEach(x=>finite(x,'数值'));const Q=2**(bits-1)-1,a=Math.max(...values.map(Math.abs)),scale=a===0?1:a/Q;
 const codes=values.map(x=>Math.max(-Q,Math.min(Q,Math.sign(x)*Math.floor(Math.abs(x/scale)+0.5))));const reconstructed=codes.map(q=>q*scale),errors=values.map((x,i)=>reconstructed[i]-x);return {Q,scale,codes,reconstructed,errors,mse:errors.reduce((s,x)=>s+x*x,0)/values.length,maxError:Math.max(...errors.map(Math.abs)),bpw32:bits+16/32};}
function roofline(Fg,Dg,Pt,Bg,launchMs=0){positive(Fg,'GFLOP');positive(Dg,'GB');positive(Pt,'TFLOP/s');positive(Bg,'GB/s');bound(launchMs,'固定开销',0,1e6);const computeMs=Fg/Pt,memoryMs=Dg/Bg*1000;return {computeMs,memoryMs,intensity:Fg/Dg,lowerMs:Math.max(computeMs,memoryMs)+launchMs,bottleneck:computeMs>memoryMs?'计算':'搬运',serialLaunchMs:launchMs};}
function amdahl(f,s){bound(f,'占比',0,1);positive(s,'局部加速');return 1/(1-f+f/s);}
function kv(T,n,kbits,vbits,resident,metadata=0){integer(T,'上下文',1,1048576);integer(n,'会话数',1,128);positive(kbits,'K 位宽');positive(vbits,'V 位宽');integer(resident,'驻留窗口',1,1048576);bound(metadata,'元数据比例',0,1);
 const bytesPerToken=12*2*256*(kbits+vbits)/8,one=bytesPerToken*T,working=bytesPerToken*Math.min(T,resident),gdn=36*128*128*48*4;
 return {bytesPerToken,one,all:one*n,working:working*n,nonResidentPayload:(one-working)*n,gdn:gdn*n,kvWithMetadata:one*n*(1+metadata),residentWithMetadata:working*n*(1+metadata),excluded:'未计非专家权重、热专家、卷积/PLE/MTP、scratch、图、页表精确布局与预留；RAM/GPU 是否保留副本取决于实现。'};}
function gdn(old,alpha,beta,key,value,query=1){[old,key,value,query].forEach(v=>finite(v,'状态/输入'));bound(alpha,'衰减',0,1);bound(beta,'β',0,1);const decayed=alpha*old,predicted=decayed*key,delta=beta*(value-predicted),state=decayed+key*delta;return {decayed,predicted,delta,state,output:state*query,wrong:(old+key*beta*(value-old*key))*alpha*query};}
function hetero(D,Bc,Bp,f,join=1){positive(D,'流量');positive(Bc,'CPU 有效速率');positive(Bp,'PCIe 分支有效速率');bound(f,'GPU 比例',0,1);bound(join,'合并时间',0,10000);const cpu=(1-f)*D/Bc*1000,gpu=f*D/Bp*1000;return {cpuMs:cpu,gpuMs:gpu,totalMs:Math.max(cpu,gpu)+join,bestFraction:Bp/(Bc+Bp),idealMs:D/(Bc+Bp)*1000+join};}
function prefill(N,C,budget){integer(N,'输入长度',1,1048576);integer(C,'块大小',1,32768);positive(budget,'scratch 预算');const rate=300+2700*C/(C+512),chunks=Math.ceil(N/C),scratchMiB=128+.5*C;return {rate,chunks,scratchMiB,feasible:scratchMiB<=budget,timeMs:N/rate*1000+chunks*5,formula:'r(C)=300+2700C/(C+512); scratch=128+0.5C MiB; T=N/r(C)+ceil(N/C)×0.005 秒'};}
function spec(p,k,base=8,verify=2,draft=1){bound(p,'接受率',0,1);integer(k,'草稿数',0,5);positive(base,'基线时间');bound(verify,'额外验证时间',0,1e4);bound(draft,'草稿时间',0,1e4);let expected=1,run=1;for(let i=0;i<k;i++){run*=p;expected+=run;}const cost=base+k*(verify+draft);return {k,expected,cost,rate:expected/cost*1000,gain:expected*base/cost-1};}
function expectedConditional(p){let e=1,r=1;for(const x of p){bound(x,'条件概率',0,1);r*=x;e+=r;}return e;}
function cache(trace,capacity,policy='lru'){
 integer(capacity,'槽数',1,128);if(!trace.length||trace.length>256)throw new Error('trace 长度需为 1…256');trace.forEach(x=>integer(x,'键',0,1e6));if(!['lru','fifo','lfu','assoc'].includes(policy))throw new Error('未知策略');
 if(policy==='assoc'&&capacity<8)throw new Error('八路组相联至少需要 8 个槽；请增大容量。');
 const groups=policy==='assoc'?Math.floor(capacity/8):1,cap=policy==='assoc'?groups*8:capacity,entries=new Map(),ways=Array.from({length:groups},()=>Array(8).fill(null)),next=Array(groups).fill(0);let hits=0;const steps=[];
 trace.forEach((key,t)=>{let hit=entries.has(key),evicted=null;
 if(hit){hits++;const ent=entries.get(key);ent.last=t;ent.freq++;}
 else{
  if(policy==='assoc'){
   const group=key%groups,w=next[group];next[group]=(w+1)%8;evicted=ways[group][w];if(evicted!==null)entries.delete(evicted);ways[group][w]=key;
  }else if(entries.size>=cap){const pairs=[...entries.entries()];pairs.sort((a,b)=>policy==='lfu'?(a[1].freq-b[1].freq||a[1].born-b[1].born||a[0]-b[0]):policy==='lru'?(a[1].last-b[1].last||a[0]-b[0]):a[1].born-b[1].born);evicted=pairs[0][0];entries.delete(evicted);}
  entries.set(key,{last:t,born:t,freq:1});
 }
 steps.push({step:t+1,key,hit,evicted,contents:[...entries.keys()].sort((a,b)=>a-b),group:policy==='assoc'?key%groups:null});
 });return {hits,misses:trace.length-hits,rate:hits/trace.length,capacity:cap,requestedCapacity:capacity,steps};
}
function commitDemo(accepted){integer(accepted,'接受前缀',0,4);const prefix=[1,2],drafts=[3,5,2,4],step=(s,t)=>.5*s+t,base=prefix.reduce(step,0);let s=base;const rows=drafts.map((token,i)=>{s=step(s,token);return {token,state:s,accepted:i<accepted};});return {base,rows,committed:prefix.concat(drafts.slice(0,accepted)).reduce(step,0),naive:rows.at(-1).state,accepted,warning:'只演示候选状态事务，不模拟真实 Verifier row 0 / 目标下一 token 的计数偏移。'};}
function quantile(a,q){if(!a.length)throw new Error('空样本');bound(q,'分位数',0,1);const b=[...a].sort((x,y)=>x-y),pos=(b.length-1)*q,i=Math.floor(pos);return b[i]+(b[Math.min(i+1,b.length-1)]-b[i])*(pos-i);}
function schedule(lengths,mode='rr',quantum=1,switchMs=0){if(!lengths.length||lengths.length>6)throw new Error('需要 1…6 条作业');lengths.forEach(x=>integer(x,'输出长度',1,128));if(lengths.reduce((a,b)=>a+b,0)>400)throw new Error('教学作业总长度不超过 400');integer(quantum,'量子',1,128);bound(switchMs,'切换成本',0,10);if(!['rr','fcfs'].includes(mode))throw new Error('未知调度');
 const rem=[...lengths],first=Array(lengths.length).fill(null),finish=Array(lengths.length).fill(null),queue=lengths.map((_,i)=>i),timeline=[];let time=0,last=null,switches=0;
 while(queue.length){const i=queue.shift();if(last!==null&&last!==i){time+=switchMs;switches++;}const n=mode==='fcfs'?rem[i]:Math.min(quantum,rem[i]),start=time;if(first[i]===null)first[i]=time+1;time+=n;rem[i]-=n;timeline.push({job:i,start,end:time,tokens:n});last=i;if(rem[i]===0)finish[i]=time;else queue.push(i);}
 return {time,first,finish,switches,timeline,totalTokens:lengths.reduce((a,b)=>a+b,0),rate:lengths.reduce((a,b)=>a+b,0)/time*1000,p95first:quantile(first,.95),p95finish:quantile(finish,.95),note:'所有请求 t=0 已就绪；1 token=1 ms；无 prefill、GPU batching 或缓存。分位数为线性插值。'};
}
function parseDataEvents(chunks){const decoder=new TextDecoder('utf-8',{fatal:true});let buffer='',events=[];const consume=text=>{buffer+=text;let m;while((m=/\r\n\r\n|\n\n|\r\r/.exec(buffer))){const block=buffer.slice(0,m.index);buffer=buffer.slice(m.index+m[0].length);const lines=block.split(/\r\n|\n|\r/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).replace(/^ /,''));if(lines.length)events.push(lines.join('\n'));}};for(const c of chunks)consume(decoder.decode(c,{stream:true}));consume(decoder.decode());return {events,pending:buffer};}
function sse(size=3,crlf=false){integer(size,'分片字节',1,64);const sep=crlf?'\r\n':'\n',wire=['data: {"delta":"中"}','','data: {"delta":','data: "文"}','',''].join(sep),bytes=new TextEncoder().encode(wire),chunks=[];for(let i=0;i<bytes.length;i+=size)chunks.push(bytes.slice(i,i+size));const parsed=parseDataEvents(chunks);return {wire,byteLength:bytes.length,chunks:chunks.map(c=>Array.from(c).map(x=>x.toString(16).padStart(2,'0')).join(' ')),events:parsed.events,output:parsed.events.map(x=>JSON.parse(x).delta).join(''),pending:parsed.pending};}
const api={softmax,sample,gemv,quantize,roofline,amdahl,kv,gdn,hetero,prefill,spec,expectedConditional,cache,commitDemo,quantile,schedule,parseDataEvents,sse};
root.LabMath=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
