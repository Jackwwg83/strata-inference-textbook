/* DeepInfer column, page 1: a clickable map of DeepSeek's production inference system.
   Each block says what it does, whether its code ships in the open-source release, and where to read more.
   All visible text lives in T (zh is the master). Status data lives in di-overview.math.js. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.diOverview;

  const T = Viz.t({
    zh: {
      code: 'SERVING_MAP', title: '生产推理系统地图', tag: '上游报告 · 开源状态按仓库核对',
      intro: 'DeepSeek 问答文档里的参考架构，一个方块是一个部件。<b>点一个方块</b>，旁边显示它做什么、这次开没开源、去哪一页细读。按 <b>▶ 走一步</b>，跟着一个请求从进门走到出门。',
      lgOpen: '本次开源：代码在仓库里', lgPartial: '引擎代码在，拆分部署的胶水不在', lgSep: '在另一个开源仓库', lgClosed: '未开源，只有文档描述', lgPath: '描边高亮：这一步用到的部件',
      steps: ['编码', '查命中', '分预填充', '编码图片', '预填充', '交给解码', '解码', '返回'],
      mapLabel: 'DeepSeek-V4.1-Flash 生产推理系统的部件地图',
      top: '用户请求 ↓　↑ 回应（JSON）',
      names: {
        recipe: 'DeepSeek Recipe', entry: 'Entrypoint（入口）', vlb: 'VE 负载均衡器', plb: '预填充负载均衡器', dlb: '解码负载均衡器',
        ve: '视觉编码器（VE）', prefill: '预填充（P）', decode: '解码（D）', eplb: 'EPLB（专家负载均衡）', kv: 'KV 缓存存储（3FS）',
      },
      boxText: {
        recipe: ['DeepSeek Recipe'], entry: ['Entrypoint（入口）'], vlb: ['VE 负载均衡器'], plb: ['预填充负载均衡器'], dlb: ['解码负载均衡器'],
        ve: ['视觉编码器', '（VE）'], prefill: ['预填充（P）'], decode: ['解码（D）'], eplb: ['EPLB'], kv: ['KV 缓存存储（3FS）'],
      },
      thinLine: '细线：请求', thickLine: '粗线：KV 缓存',
      st: { open: '本次开源', partial: '引擎在，胶水不在', separate: '另一个仓库', closed: '未开源' },
      hDo: '它做什么', hOpen: '开源情况', hRead: '去哪读',
      pageNames: { overview: '就在本页', 'wide-ep': '专栏第 2 页：宽专家并行', 'pd-kv': '专栏第 3 页：三段分离与 KV 缓存', 'spec-sched': '专栏第 4 页：投机解码与零开销调度', determinism: '专栏第 5 页：批次不变与确定性采样' },
      chNames: { '10': '第 10 章 MoE', '12': '第 12 章 专家缓存', '16': '第 16 章 Prefill', '17': '第 17 章 KV 容量', '18': '第 18 章 投机解码', '20': '第 20 章 前缀复用', '21': '第 21 章 两张显卡', '23': '第 23 章 从 token 到 API', '25': '第 25 章 调度器' },
      readNote: { ve: '书里没有专讲视觉编码器的章；第 20 章讲图片怎样参与前缀匹配。', recipe: '本专栏不再细讲它；第 23 章讲同一类工作在 Strata 里怎么做。' },
      does: {
        recipe: '把 Chat Completions、Responses、Messages 三种 API 请求统一成一种对话格式，编码成 token 序列；再把模型输出解析成正文、思考、工具调用等事件，转回各协议的流式响应。用 Rust 实现，带 Python 绑定（问答第 294–296 行）。它按特殊 token 切段、各段并行编码，既防止用户文本冒充控制 token，也缩短长输入的分词时间（第 35 行）。',
        entry: '接收 Recipe 给出的 token 序列和采样参数，交给预填充；最后把生成的 token 交回 Recipe（参考架构图）。路由之前，它先按前缀哈希链查 KV 存储的元数据，算出命中长度（问答第 157 行）。各台 Entrypoint 机器的内存里，还分片记着 SWA KV 缓存在哪台机器上（第 169 行）。',
        vlb: '按机器粒度分配图片：预填充机器随机挑一台视觉编码器机器，再交给那台机器上当前处理图像块最少的卡。块数直接按 (宽 / patch_size) × (高 / patch_size) 算（问答第 123 行）。',
        plb: '按总上下文长度把请求分成 4 档：16K 以下、16K–64K、64K–256K、256K 以上。每档分几台引擎，按上一轮各档的计算配额需求动态调整；引擎按剩余配额来领活。任何引擎都能命中任何前缀，所以不按前缀亲和性路由（问答第 109–113 行）。',
        dlb: '在所有解码实例的所有卡上统一路由，同时平衡两件事：请求数（决定每步的批大小）和 KV 总长度（决定注意力的开销）。短请求送去并发低、KV 总长度大的卡，长请求送去 KV 总长度小的卡（问答第 119 行）。',
        ve: '把图片变成嵌入向量，交给预填充。每个实例一张卡一般就够，推荐用便宜些的卡（问答第 51 行）。',
        prefill: '读入提示词里没命中缓存的部分，算出 KV 缓存交给解码。用普通的 8 卡机器，EP2–8 / DP2–8，在显存够用的前提下取最小值（问答第 11、47 行）。',
        decode: '逐步生成 token：每一步用投机解码验证几个草稿 token（草稿默认最多 5 个，environ.py 第 129 行），再配合异步调度。用 64–128 卡的超节点，EP64–128，也就是宽专家并行，卡越多越好（问答第 11、49 行）。解码产生的 KV 也写回存储，提高命中率（第 149 行）。',
        eplb: '每张卡除了自己负责的专家，再放几个冗余专家，给热门专家做副本。它统计最近 N 步每个专家的负载，每 M 步重新分配一次，专家权重在组内经 NVLink 搬运（问答第 97 行）。预填充和解码各有一套参数（第 99、103 行）。',
        kv: '专用的 3FS 存储集群，约 100 PiB 的 SSD，存分页的 block KV 缓存。任何预填充机器都能命中任何前缀；存储节点和计算节点各自扩缩容。保留时间：智能体流量 3 天，聊天流量 7 天（问答第 141、153 行）。',
      },
      open: {
        recipe: 'DeepSeek 把它作为单独的仓库 deepseek-recipe 开源（问答第 19 行）。DeepInfer 仓库里没有这部分代码；离线例子直接用 Hugging Face 分词器编码提示词（entrypoints/llm.py 第 156 行）。',
        entry: '仓库里没有这个部件。名字相近的 deepinfer/entrypoints/ 只有一个离线用的 LLM 类（llm.py 第 23 行），它在本进程里直接驱动引擎。',
        vlb: 'README 第 42 行只列了预填充和解码的负载均衡；VE 负载均衡器 README 没有提到，仓库里也没有对应代码。',
        plb: 'README 第 42 行：数据并行副本之间的负载均衡不在这次发布里。',
        dlb: 'README 第 42 行：数据并行副本之间的负载均衡不在这次发布里。',
        ve: '视觉编码器的模型代码在仓库里（model_executor/models/vision_encoder/、deepinfer/ve/）。离线例子把 ViT 和语言模型放在同一个引擎里跑（examples/README 第 97 行）；把它拆成独立服务的部分不在。',
        prefill: '引擎里有“只做预填充”的类型 EngineType.PROMPT（engine_type.py 第 12 行）。但“把算完的请求发给解码引擎”“保存 KV 缓存”这些钩子，在这次发布里是空函数（llm_engine.py 第 800–858 行）。',
        decode: '引擎里有“只做解码”的类型 EngineType.COMPLETION（engine_type.py 第 13 行）。离线推理用默认的 NORMAL 类型：同一个引擎先预填充、再解码（arg_utils.py 第 41 行）。',
        eplb: '代码在 deepinfer/model_executor/eplb/：policy.py 算新的专家放置，shuffle.py 按新放置搬运专家权重。',
        kv: 'README 第 40 行：KV 缓存系统不在这次发布里。引擎里的 worker/cache_engine.py 定义了 128 token 的落盘粒度（第 32 行），可真正保存 KV 的钩子 do_save_kvcache 是空函数（llm_engine.py 第 815–816 行）。',
      },
      dEmpty: '点地图上的一个方块，这里显示它的说明。',
      bStep: '▶ 走一步', bReset: '重置', bDim: '只看开源部分', bAll: '显示全部',
      sOpenK: '这张图里，代码在本次仓库里的方块',
      sOpenF: (o, p, s, c, n) => `<b>= ${o} 块完整开源 + ${p} 块只有引擎</b><br>另有 ${s} 块在别的仓库，${c} 块未开源；共 ${n} 块`,
      sLbK: '问答文档列出的四个负载均衡器里，开源的',
      sLbF: '<b>只有 EPLB，在 model_executor/eplb/</b><br>预填充、解码两个列在 README 第 42 行的“未包含”里；VE 负载均衡器 README 没提，仓库里也没有代码',
      ready: '<span class="c">$</span> ready. 点地图上的任意方块，或按 [ ▶ 走一步 ] 跟一个请求走',
      readyShort: '<span class="c">$</span> ready. 按 [ ▶ 走一步 ] 开始',
      log: [
        '<span class="c">[1/8]</span> 用户的 JSON 请求进来。<span class="w">DeepSeek Recipe</span> 把它统一成一种对话格式，编码成 token 序列和采样参数。',
        '<span class="c">[2/8]</span> <span class="w">Entrypoint</span> 按前缀哈希链查 KV 存储，看能命中多长。命中长度要在路由之前算出来，这一步藏不住。',
        '<span class="c">[3/8]</span> <span class="w">预填充负载均衡器</span>按上下文长度把请求分进 4 档；引擎按剩余计算配额来领活。',
        '<span class="c">[4/8]</span> 只有请求里带图片时才走这一步：预填充机器经 <span class="w">VE 负载均衡器</span>找一台视觉编码器机器，把图片变成嵌入向量。',
        '<span class="c">[5/8]</span> <span class="w">预填充</span>从 3FS 取回已命中的 KV，只算没命中的部分。MoE 层里，<span class="w">EPLB</span> 让各卡的专家负载接近。',
        '<span class="c">[6/8]</span> <span class="w">解码负载均衡器</span>选一张解码卡，KV 缓存从 P 传到 D。',
        '<span class="c">[7/8]</span> <span class="w">解码</span>逐 token 生成，64–128 张卡一起做宽专家并行。解码产生的 KV 也写回存储，下次能命中。',
        '<span class="c">[8/8]</span> 生成的 token 回到 Entrypoint，<span class="w">Recipe</span> 把它们解析成正文、思考、工具调用，转回各协议的流式响应。',
      ],
      restart: '<span class="y">// 一个请求走完了，从第 1 步重新开始</span>',
      dimOn: '<span class="y">// 只看开源</span>：未开源和在别的仓库的方块变淡',
      dimOff: '<span class="y">// 显示全部</span>',
      picked: (name, st) => `<span class="m">选中</span> ${name} · ${st}`,
      try: [
        '点 <b>KV 缓存存储</b>，再点 <b>EPLB</b>，比较两者的“开源情况”：一个只有文档描述，一个有完整代码。',
        '按 <b>只看开源部分</b>：还亮着的只剩引擎和 EPLB。想一想，要把离线推理变成在线服务，还缺哪几块。',
        '连按 <b>▶ 走一步</b> 走完 8 步：带图片的请求碰到全部 10 块，纯文本请求跳过第 4 步，碰到 8 块。不管哪种，代码在这次仓库里的都只有 4 块。',
      ],
      verdict: (n, nText, inRepo) => `带图片的请求走完 8 步，碰到全部 ${n} 块；纯文本请求跳过第 4 步，碰到 ${nText} 块。${n} 块里有 ${inRepo} 块的代码在这次的仓库里：P、D、VE 三段的引擎和 EPLB。KV 缓存系统、拆分部署的胶水和三个数据并行负载均衡器，要由部署者自己补上。`,
    },
    en: {
      code: 'SERVING_MAP', title: 'A map of the production inference system', tag: 'Upstream report · open-source status checked against the repository',
      intro: 'The reference architecture from DeepSeek\'s Q&amp;A doc; one square is one component. <b>Click a square</b> to see what it does, whether it is open-sourced this time, and which page to read. Press <b>▶ Step</b> to follow one request from the door to the exit.',
      lgOpen: 'Open-sourced now: the code is in the repository', lgPartial: 'Engine code is in; the glue for disaggregated deployment is not', lgSep: 'In another open-source repository', lgClosed: 'Not open-sourced; only described in the docs', lgPath: 'Outline highlight: components used in this step',
      steps: ['Encode', 'Check hits', 'Split prefill', 'Encode images', 'Prefill', 'Hand to decode', 'Decode', 'Return'],
      mapLabel: 'Component map of the DeepSeek-V4.1-Flash production inference system',
      top: 'User request ↓　↑ Response (JSON)',
      names: {
        recipe: 'DeepSeek Recipe', entry: 'Entrypoint', vlb: 'VE load balancer', plb: 'Prefill load balancer', dlb: 'Decode load balancer',
        ve: 'Vision encoder (VE)', prefill: 'Prefill (P)', decode: 'Decode (D)', eplb: 'EPLB (expert load balancing)', kv: 'KV cache storage (3FS)',
      },
      boxText: {
        recipe: ['DeepSeek Recipe'], entry: ['Entrypoint'], vlb: ['VE', 'load balancer'], plb: ['Prefill', 'load balancer'], dlb: ['Decode', 'load balancer'],
        ve: ['Vision encoder', '(VE)'], prefill: ['Prefill (P)'], decode: ['Decode (D)'], eplb: ['EPLB'], kv: ['KV cache storage (3FS)'],
      },
      thinLine: 'Thin line: request', thickLine: 'Thick line: KV cache',
      st: { open: 'Open-sourced now', partial: 'Engine in, glue out', separate: 'Another repository', closed: 'Not open-sourced' },
      hDo: 'What it does', hOpen: 'Open-source status', hRead: 'Where to read',
      pageNames: { overview: 'This page', 'wide-ep': 'Column page 2: wide expert parallelism', 'pd-kv': 'Column page 3: E/P/D disaggregation and the KV cache', 'spec-sched': 'Column page 4: speculative decoding and zero-overhead scheduling', determinism: 'Column page 5: batch invariance and deterministic sampling' },
      chNames: { '10': 'Chapter 10: MoE', '12': 'Chapter 12: The expert cache', '16': 'Chapter 16: Prefill', '17': 'Chapter 17: KV capacity, working sets and tiered storage', '18': 'Chapter 18: Speculative decoding', '20': 'Chapter 20: Prefix reuse, snapshots and copy-on-write', '21': 'Chapter 21: Two graphics cards', '23': 'Chapter 23: From tokens to an API', '25': 'Chapter 25: From one sequence to many users' },
      readNote: { ve: 'The book has no chapter just on the vision encoder; Chapter 20 covers how images take part in prefix matching.', recipe: 'This column does not go further into it; Chapter 23 covers how Strata does the same kind of work.' },
      does: {
        recipe: 'Unifies requests in the three API styles, Chat Completions, Responses and Messages, into one conversation format and encodes it into a token sequence; then parses the model output into events such as text, thinking and tool calls, and turns them back into the streaming response of each protocol. Written in Rust with Python bindings (Q&amp;A lines 294–296). It splits the input at special tokens and encodes the segments in parallel, which both stops user text from posing as control tokens and shortens the tokenizing time of long inputs (line 35).',
        entry: 'Takes the token sequence and sampling parameters from Recipe and hands them to prefill; at the end it passes the generated tokens back to Recipe (reference architecture diagram). Before routing, it looks up the KV store metadata along the prefix hash chain to work out the hit length (Q&amp;A line 157). In the memory of each Entrypoint machine, it also keeps a sharded record of which machine holds the SWA KV cache (line 169).',
        vlb: 'Assigns images at machine granularity: the prefill machine picks a vision encoder machine at random, then hands the images to the card on that machine that currently has the fewest image patches to process. The patch count is computed directly as (width / patch_size) × (height / patch_size) (Q&amp;A line 123).',
        plb: 'Splits requests into 4 tiers by total context length: under 16K, 16K–64K, 64K–256K, and over 256K. How many engines each tier gets is adjusted dynamically by the compute quota each tier needed in the last round; engines pull work by remaining quota. Any engine can hit any prefix, so it does not route by prefix affinity (Q&amp;A lines 109–113).',
        dlb: 'Routes across all cards of all decode instances, balancing two things at once: the number of requests (which sets the batch size of each step) and the total KV length (which sets the cost of attention). Short requests go to cards with low concurrency and a large total KV length, and long requests go to cards with a small total KV length (Q&amp;A line 119).',
        ve: 'Turns images into embedding vectors and hands them to prefill. One card per instance is usually enough, and cheaper cards are recommended (Q&amp;A line 51).',
        prefill: 'Reads in the part of the prompt that missed the cache, and computes the KV cache to hand to decode. Uses ordinary 8-card machines, EP2–8 / DP2–8, taking the smallest value that GPU memory allows (Q&amp;A lines 11, 47).',
        decode: 'Generates tokens step by step: at each step it verifies a few draft tokens with speculative decoding (up to 5 drafts by default, environ.py line 129), together with asynchronous scheduling. Uses 64–128-card supernodes with EP64–128, that is, wide expert parallelism, and more cards are better (Q&amp;A lines 11, 49). The KV that decode produces is also written back to storage to raise the hit rate (line 149).',
        eplb: 'Besides the experts it owns, each card holds a few redundant experts, which are copies of hot experts. It tracks the load of every expert over the last N steps, reassigns every M steps, and moves expert weights within the group over NVLink (Q&amp;A line 97). Prefill and decode each have their own parameters (lines 99, 103).',
        kv: 'A dedicated 3FS storage cluster, about 100 PiB of SSD, holding the paged block KV cache. Any prefill machine can hit any prefix; storage nodes and compute nodes scale separately. Retention: 3 days for agent traffic and 7 days for chat traffic (Q&amp;A lines 141, 153).',
      },
      open: {
        recipe: 'DeepSeek open-sourced it as a separate repository, deepseek-recipe (Q&amp;A line 19). The DeepInfer repository has no code for it; the offline example encodes the prompts directly with a Hugging Face tokenizer (entrypoints/llm.py line 156).',
        entry: 'This component is not in the repository. The similarly named deepinfer/entrypoints/ holds only an offline LLM class (llm.py line 23), which drives the engine directly in the current process.',
        vlb: 'README line 42 lists only the load balancing for prefill and decode. The README does not mention a VE load balancer, and the repository has no code for it.',
        plb: 'README line 42: load balancing between data-parallel replicas is not in this release.',
        dlb: 'README line 42: load balancing between data-parallel replicas is not in this release.',
        ve: 'The model code of the vision encoder is in the repository (model_executor/models/vision_encoder/, deepinfer/ve/). The offline example runs the ViT and the language model in the same engine (examples/README line 97); the part that splits it into a separate service is not included.',
        prefill: 'The engine has a "prefill only" type, EngineType.PROMPT (engine_type.py line 12). But the hooks "send the finished request to the decode engine" and "save the KV cache" are empty functions in this release (llm_engine.py lines 800–858).',
        decode: 'The engine has a "decode only" type, EngineType.COMPLETION (engine_type.py line 13). Offline inference uses the default NORMAL type: the same engine prefills first and then decodes (arg_utils.py line 41).',
        eplb: 'The code is in deepinfer/model_executor/eplb/: policy.py computes the new expert placement, and shuffle.py moves the expert weights to the new placement.',
        kv: 'README line 40: the KV cache system is not in this release. worker/cache_engine.py in the engine defines a persistence granularity of 128 tokens (line 32), but do_save_kvcache, the hook that really saves KV, is an empty function (llm_engine.py lines 815–816).',
      },
      dEmpty: 'Click a block on the map to see its description here.',
      bStep: '▶ Step', bReset: 'Reset', bDim: 'Open source only', bAll: 'Show all',
      sOpenK: 'Blocks on this map whose code is in this release\'s repository',
      sOpenF: (o, p, s, c, n) => `<b>= ${o} fully open + ${p} engine only</b><br>${s} more in another repository, ${c} not open-sourced; ${n} blocks in total`,
      sLbK: 'Of the four load balancers in the Q&amp;A doc, the ones that are open source',
      sLbF: '<b>Only EPLB, in model_executor/eplb/</b><br>Prefill and decode are listed in README line 42 as "not included"; the README does not mention a VE load balancer, and the repository has no code for it',
      ready: '<span class="c">$</span> ready. Click any block on the map, or press [ ▶ Step ] to follow a request',
      readyShort: '<span class="c">$</span> ready. Press [ ▶ Step ] to start',
      log: [
        '<span class="c">[1/8]</span> The user\'s JSON request comes in. <span class="w">DeepSeek Recipe</span> unifies it into one conversation format and encodes it into a token sequence and sampling parameters.',
        '<span class="c">[2/8]</span> <span class="w">Entrypoint</span> looks up KV storage along the prefix hash chain to see how long a hit it can get. The hit length must be computed before routing; this step cannot be hidden.',
        '<span class="c">[3/8]</span> The <span class="w">prefill load balancer</span> sorts the request into one of 4 tiers by context length; engines pull work by remaining compute quota.',
        '<span class="c">[4/8]</span> This step happens only if the request carries images: the prefill machine finds a vision encoder machine through the <span class="w">VE load balancer</span> and turns the images into embedding vectors.',
        '<span class="c">[5/8]</span> <span class="w">Prefill</span> fetches the KV that already hit from 3FS and computes only the part that missed. In the MoE layers, <span class="w">EPLB</span> keeps the expert load of the cards close.',
        '<span class="c">[6/8]</span> The <span class="w">decode load balancer</span> picks a decode card, and the KV cache moves from P to D.',
        '<span class="c">[7/8]</span> <span class="w">Decode</span> generates token by token, with 64–128 cards doing wide expert parallelism together. The KV that decode produces is also written back to storage, so the next request can hit it.',
        '<span class="c">[8/8]</span> The generated tokens return to Entrypoint, and <span class="w">Recipe</span> parses them into text, thinking and tool calls, and turns them back into the streaming response of each protocol.',
      ],
      restart: '<span class="y">// One request is done; starting again from step 1</span>',
      dimOn: '<span class="y">// Open source only</span>: blocks that are not open-sourced or are in another repository fade',
      dimOff: '<span class="y">// Show all</span>',
      picked: (name, st) => `<span class="m">picked</span> ${name} · ${st}`,
      try: [
        'Click <b>KV cache storage</b>, then <b>EPLB</b>, and compare their "Open-source status": one has only a description in the docs, the other has full code.',
        'Press <b>Open source only</b>: only the engine and EPLB stay lit. Think about which pieces are still missing to turn offline inference into an online service.',
        'Press <b>▶ Step</b> repeatedly to go through all 8 steps: a request with images touches all 10 blocks, and a text-only request skips step 4 and touches 8 blocks. Either way, only 4 blocks have their code in this release\'s repository.',
      ],
      verdict: (n, nText, inRepo) => `A request with images touches all ${n} blocks in 8 steps; a text-only request skips step 4 and touches ${nText} blocks. Of the ${n} blocks, ${inRepo} have their code in this release's repository: the engines of the P, D and VE stages, and EPLB. The KV cache system, the glue for disaggregated deployment and the three data-parallel load balancers have to be filled in by whoever deploys it.`,
    },
    ja: {
      code: 'SERVING_MAP', title: '本番推論システムの地図', tag: '上流レポート・公開状況はリポジトリで確認',
      intro: 'DeepSeek の Q&amp;A ドキュメントにある参照アーキテクチャです。1 つのマスが 1 つの部品です。<b>マスをクリック</b>すると、その部品が何をするか、今回公開されたか、どのページで詳しく読めるかが横に出ます。<b>▶ 1 歩進む</b>を押すと、1 つのリクエストが入口から出口まで進む様子を追えます。',
      lgOpen: '今回公開：コードがリポジトリにある', lgPartial: 'エンジンのコードはあるが、分離デプロイの接着コードはない', lgSep: '別のオープンソースリポジトリにある', lgClosed: '未公開。ドキュメントに説明があるだけ', lgPath: '枠の強調：このステップで使う部品',
      steps: ['エンコード', 'ヒット確認', '段階の割当', '画像の変換', 'プリフィル', 'デコードへ', 'デコード', '返却'],
      mapLabel: 'DeepSeek-V4.1-Flash 本番推論システムの部品の地図',
      top: 'ユーザーのリクエスト ↓　↑ 応答（JSON）',
      names: {
        recipe: 'DeepSeek Recipe', entry: 'Entrypoint（入口）', vlb: 'VE ロードバランサー', plb: 'プリフィルロードバランサー', dlb: 'デコードロードバランサー',
        ve: 'ビジョンエンコーダー（VE）', prefill: 'プリフィル（P）', decode: 'デコード（D）', eplb: 'EPLB（エキスパート負荷分散）', kv: 'KV キャッシュストレージ（3FS）',
      },
      boxText: {
        recipe: ['DeepSeek Recipe'], entry: ['Entrypoint（入口）'], vlb: ['VE', 'ロードバランサー'], plb: ['プリフィル', 'ロードバランサー'], dlb: ['デコード', 'ロードバランサー'],
        ve: ['ビジョン', 'エンコーダー', '（VE）'], prefill: ['プリフィル（P）'], decode: ['デコード（D）'], eplb: ['EPLB'], kv: ['KV キャッシュストレージ（3FS）'],
      },
      thinLine: '細い線：リクエスト', thickLine: '太い線：KV キャッシュ',
      st: { open: '今回公開', partial: 'エンジンあり、接着コードなし', separate: '別のリポジトリ', closed: '未公開' },
      hDo: 'できること', hOpen: '公開の状況', hRead: '読む場所',
      pageNames: { overview: 'このページ', 'wide-ep': 'コラム第 2 ページ：ワイドエキスパート並列', 'pd-kv': 'コラム第 3 ページ：E/P/D 分離と KV キャッシュ', 'spec-sched': 'コラム第 4 ページ：投機的デコーディングとゼロオーバーヘッド・スケジューリング', determinism: 'コラム第 5 ページ：バッチ不変と決定的サンプリング' },
      chNames: { '10': '第 10 章 MoE', '12': '第 12 章 エキスパートキャッシュ', '16': '第 16 章 プリフィル', '17': '第 17 章 KV の容量', '18': '第 18 章 投機的デコーディング', '20': '第 20 章 プレフィックスの再利用', '21': '第 21 章 2 枚の GPU', '23': '第 23 章 token から API へ', '25': '第 25 章 シングルシーケンスからマルチユーザーへ' },
      readNote: { ve: 'この本には、ビジョンエンコーダーだけを扱う章はありません。第 20 章で、画像がプレフィックス照合にどう関わるかを説明します。', recipe: 'このコラムではこれ以上詳しく扱いません。第 23 章で、Strata で同じ種類の仕事をどうしているかを説明します。' },
      does: {
        recipe: 'Chat Completions、Responses、Messages の 3 種類の API リクエストを 1 つの会話形式にそろえ、トークン列にエンコードします。さらに、モデルの出力を本文、思考、ツール呼び出しなどのイベントに解析し、各プロトコルのストリーミング応答に戻します。Rust で実装され、Python バインディングがあります（Q&amp;A 294–296 行目）。特殊トークンで区切り、各区間を並列にエンコードするので、ユーザーの文章が制御トークンになりすますのを防ぎ、長い入力のトークン化にかかる時間も短くなります（35 行目）。',
        entry: 'Recipe が渡すトークン列とサンプリングパラメータを受け取ってプリフィルに渡し、最後に生成されたトークンを Recipe に返します（参照アーキテクチャ図）。ルーティングの前に、プレフィックスのハッシュ連鎖をたどって KV ストアのメタデータを調べ、ヒット長を計算します（Q&amp;A 157 行目）。各 Entrypoint マシンのメモリには、SWA の KV キャッシュがどのマシンにあるかを、分割して記録しています（169 行目）。',
        vlb: '画像をマシン単位で割り当てます。プリフィルのマシンがビジョンエンコーダーのマシンをランダムに選び、そのマシンの中で、いま処理中の画像パッチがいちばん少ないカードに渡します。パッチ数は (幅 / patch_size) × (高さ / patch_size) で直接計算します（Q&amp;A 123 行目）。',
        plb: 'リクエストを総コンテキスト長で 4 段に分けます。16K 未満、16K–64K、64K–256K、256K 以上です。各段に何台のエンジンを割り当てるかは、前の周期の各段の計算クォータの需要に応じて動的に調整し、エンジンは残りのクォータに応じて仕事を取りに来ます。どのエンジンもどのプレフィックスにもヒットできるので、プレフィックスの親和性ではルーティングしません（Q&amp;A 109–113 行目）。',
        dlb: 'すべてのデコードインスタンスのすべてのカードにまたがって、一括でルーティングします。同時に 2 つを均衡させます。リクエスト数（各ステップのバッチサイズを決める）と、KV の合計長（アテンションのコストを決める）です。短いリクエストは、並行数が低く KV の合計長が大きいカードへ、長いリクエストは KV の合計長が小さいカードへ送ります（Q&amp;A 119 行目）。',
        ve: '画像を埋め込みベクトルに変えて、プリフィルに渡します。1 つのインスタンスにカード 1 枚で足りるのが普通で、安めのカードがお勧めです（Q&amp;A 51 行目）。',
        prefill: 'プロンプトのうちキャッシュにミスした部分を読み込み、KV キャッシュを計算してデコードに渡します。普通の 8 カードのマシンを使い、EP2–8 / DP2–8 で、GPU メモリが足りる範囲でいちばん小さい値にします（Q&amp;A 11、47 行目）。',
        decode: 'トークンを 1 ステップずつ生成します。各ステップで、投機的デコーディングによりいくつかのドラフトトークンを検証し（ドラフトは既定で最大 5 個、environ.py 129 行目）、非同期スケジューリングと組み合わせます。64–128 カードのスーパーノードを使い、EP64–128、つまりワイドエキスパート並列で、カードは多いほどよいとされています（Q&amp;A 11、49 行目）。デコードが作った KV もストレージに書き戻し、ヒット率を高めます（149 行目）。',
        eplb: '各カードは、自分の担当するエキスパートのほかに、冗長エキスパートをいくつか置き、人気のエキスパートの複製にします。直近 N ステップの各エキスパートの負荷を集計し、M ステップごとに再配置します。エキスパートの重みは、グループ内で NVLink を通して移動します（Q&amp;A 97 行目）。プリフィルとデコードには、それぞれ別のパラメータがあります（99、103 行目）。',
        kv: '専用の 3FS ストレージクラスタで、約 100 PiB の SSD に、ページ化したブロック KV キャッシュを保存します。どのプリフィルマシンもどのプレフィックスにもヒットでき、ストレージノードと計算ノードは別々にスケールします。保持期間は、エージェントのトラフィックが 3 日、チャットのトラフィックが 7 日です（Q&amp;A 141、153 行目）。',
      },
      open: {
        recipe: 'DeepSeek は、別のリポジトリ deepseek-recipe として公開しました（Q&amp;A 19 行目）。DeepInfer のリポジトリには、この部分のコードはありません。オフラインの例は、Hugging Face のトークナイザーでプロンプトを直接エンコードします（entrypoints/llm.py 156 行目）。',
        entry: 'リポジトリには、この部品はありません。名前の似た deepinfer/entrypoints/ には、オフライン用の LLM クラスが 1 つあるだけで（llm.py 23 行目）、同じプロセスの中でエンジンを直接動かします。',
        vlb: 'README 42 行目が挙げているのは、プリフィルとデコードのロードバランシングだけです。VE ロードバランサーは README に出てこず、リポジトリにも対応するコードがありません。',
        plb: 'README 42 行目：データ並列レプリカ間のロードバランシングは、今回のリリースに含まれません。',
        dlb: 'README 42 行目：データ並列レプリカ間のロードバランシングは、今回のリリースに含まれません。',
        ve: 'ビジョンエンコーダーのモデルコードはリポジトリにあります（model_executor/models/vision_encoder/、deepinfer/ve/）。オフラインの例は、ViT と言語モデルを同じエンジンの中で動かします（examples/README 97 行目）。これを独立したサービスに分ける部分は含まれません。',
        prefill: 'エンジンには「プリフィルだけ」を行うタイプ EngineType.PROMPT があります（engine_type.py 12 行目）。しかし、「処理が終わったリクエストをデコードエンジンに送る」「KV キャッシュを保存する」といったフックは、今回のリリースでは空の関数です（llm_engine.py 800–858 行目）。',
        decode: 'エンジンには「デコードだけ」を行うタイプ EngineType.COMPLETION があります（engine_type.py 13 行目）。オフライン推論は既定の NORMAL タイプを使い、同じエンジンが先にプリフィル、次にデコードをします（arg_utils.py 41 行目）。',
        eplb: 'コードは deepinfer/model_executor/eplb/ にあります。policy.py が新しいエキスパート配置を計算し、shuffle.py が新しい配置に合わせてエキスパートの重みを移動します。',
        kv: 'README 40 行目：KV キャッシュシステムは今回のリリースに含まれません。エンジンの worker/cache_engine.py は 128 トークンという書き出しの粒度を定義していますが（32 行目）、KV を実際に保存するフック do_save_kvcache は空の関数です（llm_engine.py 815–816 行目）。',
      },
      dEmpty: '地図のマスをクリックすると、ここに説明が出ます。',
      bStep: '▶ 1 歩進む', bReset: 'リセット', bDim: '公開部分だけ表示', bAll: 'すべて表示',
      sOpenK: 'この図で、コードが今回のリポジトリにあるブロック',
      sOpenF: (o, p, s, c, n) => `<b>= ${o} ブロックが完全公開 + ${p} ブロックはエンジンのみ</b><br>ほかに ${s} ブロックが別のリポジトリ、${c} ブロックが未公開。合計 ${n} ブロック`,
      sLbK: 'Q&amp;A ドキュメントが挙げる 4 つのロードバランサーのうち、公開されているもの',
      sLbF: '<b>EPLB だけ。model_executor/eplb/ にある</b><br>プリフィルとデコードの 2 つは README 42 行目の「含まれない」に挙がっている。VE ロードバランサーは README に出てこず、リポジトリにもコードがない',
      ready: '<span class="c">$</span> ready. 地図のブロックをクリックするか、[ ▶ 1 歩進む ] を押してリクエストを追ってください',
      readyShort: '<span class="c">$</span> ready. [ ▶ 1 歩進む ] を押して開始',
      log: [
        '<span class="c">[1/8]</span> ユーザーの JSON リクエストが届きます。<span class="w">DeepSeek Recipe</span> がそれを 1 つの会話形式にそろえ、トークン列とサンプリングパラメータにエンコードします。',
        '<span class="c">[2/8]</span> <span class="w">Entrypoint</span> がプレフィックスのハッシュ連鎖をたどって KV ストレージを調べ、どこまでヒットするかを見ます。ヒット長はルーティングの前に計算しなければならず、この手順は隠せません。',
        '<span class="c">[3/8]</span> <span class="w">プリフィルロードバランサー</span>が、コンテキスト長でリクエストを 4 段に振り分けます。エンジンは残りの計算クォータに応じて仕事を取りに来ます。',
        '<span class="c">[4/8]</span> この手順は、リクエストに画像があるときだけ通ります。プリフィルのマシンが <span class="w">VE ロードバランサー</span>を通してビジョンエンコーダーのマシンを探し、画像を埋め込みベクトルに変えます。',
        '<span class="c">[5/8]</span> <span class="w">プリフィル</span>が、すでにヒットした KV を 3FS から取り戻し、ミスした部分だけを計算します。MoE 層では、<span class="w">EPLB</span> が各カードのエキスパート負荷を近づけます。',
        '<span class="c">[6/8]</span> <span class="w">デコードロードバランサー</span>がデコードのカードを 1 枚選び、KV キャッシュが P から D に送られます。',
        '<span class="c">[7/8]</span> <span class="w">デコード</span>がトークンを 1 つずつ生成し、64–128 枚のカードがいっしょにワイドエキスパート並列を行います。デコードが作った KV もストレージに書き戻され、次回ヒットできます。',
        '<span class="c">[8/8]</span> 生成されたトークンが Entrypoint に戻り、<span class="w">Recipe</span> がそれを本文、思考、ツール呼び出しに解析して、各プロトコルのストリーミング応答に戻します。',
      ],
      restart: '<span class="y">// 1 つのリクエストが終わりました。第 1 ステップからやり直します</span>',
      dimOn: '<span class="y">// 公開部分だけ</span>：未公開と別リポジトリのブロックが薄くなります',
      dimOff: '<span class="y">// すべて表示</span>',
      picked: (name, st) => `<span class="m">選択</span> ${name} · ${st}`,
      try: [
        '<b>KV キャッシュストレージ</b>をクリックし、次に <b>EPLB</b> をクリックして、2 つの「公開の状況」を比べてください。一方はドキュメントに説明があるだけで、もう一方には完全なコードがあります。',
        '<b>公開部分だけ表示</b>を押すと、明るいままなのはエンジンと EPLB だけです。オフライン推論をオンラインサービスにするには、あとどの部品が足りないか、考えてみましょう。',
        '<b>▶ 1 歩進む</b>を続けて押して 8 ステップを進めてください。画像つきのリクエストは 10 ブロックすべてに触れ、テキストだけのリクエストはステップ 4 を飛ばして 8 ブロックに触れます。どちらでも、コードが今回のリポジトリにあるのは 4 ブロックだけです。',
      ],
      verdict: (n, nText, inRepo) => `画像つきのリクエストは 8 ステップで ${n} ブロックすべてに触れます。テキストだけのリクエストはステップ 4 を飛ばし、${nText} ブロックに触れます。${n} ブロックのうち、コードが今回のリポジトリにあるのは ${inRepo} ブロックで、P、D、VE の 3 段のエンジンと EPLB です。KV キャッシュシステム、分離デプロイの接着コード、3 つのデータ並列ロードバランサーは、デプロイする人が自分で補う必要があります。`,
    },
    ko: {
      code: 'SERVING_MAP', title: '프로덕션 추론 시스템 지도', tag: '업스트림 보고 · 공개 여부는 저장소에서 확인',
      intro: 'DeepSeek Q&amp;A 문서의 참조 아키텍처예요. 네모 하나가 부품 하나예요. <b>네모를 클릭</b>하면 옆에 그 부품이 하는 일, 이번에 공개됐는지, 어느 페이지에서 자세히 읽는지가 나와요. <b>▶ 한 단계 진행</b>을 누르면 요청 하나가 입구에서 출구까지 가는 길을 따라가요.',
      lgOpen: '이번에 공개: 코드가 저장소에 있음', lgPartial: '엔진 코드는 있고, 분리 배포 접착 코드는 없음', lgSep: '다른 오픈소스 저장소에 있음', lgClosed: '비공개, 문서에 설명만 있음', lgPath: '테두리 강조: 이 단계에서 쓰는 부품',
      steps: ['인코딩', '히트 확인', '프리필 배정', '이미지 인코딩', '프리필', '디코드로 전달', '디코드', '반환'],
      mapLabel: 'DeepSeek-V4.1-Flash 프로덕션 추론 시스템의 부품 지도',
      top: '사용자 요청 ↓　↑ 응답(JSON)',
      names: {
        recipe: 'DeepSeek Recipe', entry: 'Entrypoint(입구)', vlb: 'VE 로드 밸런서', plb: '프리필 로드 밸런서', dlb: '디코드 로드 밸런서',
        ve: '비전 인코더(VE)', prefill: '프리필(P)', decode: '디코드(D)', eplb: 'EPLB(전문가 부하 분산)', kv: 'KV 캐시 스토리지(3FS)',
      },
      boxText: {
        recipe: ['DeepSeek Recipe'], entry: ['Entrypoint(입구)'], vlb: ['VE', '로드 밸런서'], plb: ['프리필', '로드 밸런서'], dlb: ['디코드', '로드 밸런서'],
        ve: ['비전 인코더', '(VE)'], prefill: ['프리필(P)'], decode: ['디코드(D)'], eplb: ['EPLB'], kv: ['KV 캐시 스토리지(3FS)'],
      },
      thinLine: '가는 선: 요청', thickLine: '굵은 선: KV 캐시',
      st: { open: '이번에 공개', partial: '엔진은 있고 접착 코드는 없음', separate: '다른 저장소', closed: '비공개' },
      hDo: '하는 일', hOpen: '공개 여부', hRead: '어디서 읽나',
      pageNames: { overview: '바로 이 페이지', 'wide-ep': '칼럼 2페이지: 와이드 전문가 병렬', 'pd-kv': '칼럼 3페이지: E/P/D 분리와 KV 캐시', 'spec-sched': '칼럼 4페이지: 추측 디코딩과 제로 오버헤드 스케줄링', determinism: '칼럼 5페이지: 배치 불변과 결정적 샘플링' },
      chNames: { '10': '10장 MoE', '12': '12장 전문가 캐시', '16': '16장 프리필', '17': '17장 KV 용량', '18': '18장 추측 디코딩', '20': '20장 접두부 재사용', '21': '21장 카드 두 장', '23': '23장 토큰에서 API까지', '25': '25장 단일 시퀀스에서 다중 사용자로' },
      readNote: { ve: '이 책에는 비전 인코더만 다루는 장이 없어요. 20장에서 이미지가 접두부 매칭에 어떻게 참여하는지 다뤄요.', recipe: '이 칼럼은 이것을 더 자세히 다루지 않아요. 23장에서 Strata가 같은 종류의 일을 어떻게 하는지 다뤄요.' },
      does: {
        recipe: 'Chat Completions, Responses, Messages 세 가지 API 요청을 하나의 대화 형식으로 통일해 토큰 시퀀스로 인코딩해요. 그리고 모델 출력을 본문, 생각, 도구 호출 같은 이벤트로 파싱해서 각 프로토콜의 스트리밍 응답으로 돌려보내요. Rust로 구현했고 Python 바인딩이 있어요(Q&amp;A 294–296행). 특수 토큰으로 입력을 자르고 구간마다 병렬로 인코딩해서, 사용자 텍스트가 제어 토큰을 사칭하는 것을 막고 긴 입력의 토큰화 시간도 줄여요(35행).',
        entry: 'Recipe가 준 토큰 시퀀스와 샘플링 인자를 받아 프리필에 넘기고, 마지막에 생성된 토큰을 Recipe에 돌려줘요(참조 아키텍처 그림). 라우팅하기 전에 접두부 해시 체인을 따라 KV 스토어의 메타데이터를 조회해서 히트 길이를 계산해요(Q&amp;A 157행). Entrypoint 머신마다 메모리에는 SWA KV 캐시가 어느 머신에 있는지를 조각내어 기록해 둬요(169행).',
        vlb: '이미지를 머신 단위로 배정해요. 프리필 머신이 비전 인코더 머신 하나를 무작위로 고르고, 그 머신에서 지금 처리 중인 이미지 패치가 가장 적은 카드에 넘겨요. 패치 수는 (너비 / patch_size) × (높이 / patch_size)로 바로 계산해요(Q&amp;A 123행).',
        plb: '요청을 전체 컨텍스트 길이로 4구간으로 나눠요. 16K 미만, 16K–64K, 64K–256K, 256K 이상이에요. 구간마다 엔진을 몇 대 줄지는 지난 주기에 각 구간이 필요로 한 계산 쿼터에 따라 동적으로 조절하고, 엔진은 남은 쿼터만큼 일을 가져가요. 어떤 엔진이든 어떤 접두부에도 히트할 수 있어서, 접두부 친화성으로는 라우팅하지 않아요(Q&amp;A 109–113행).',
        dlb: '모든 디코드 인스턴스의 모든 카드에 걸쳐 한꺼번에 라우팅하면서 두 가지를 함께 맞춰요. 요청 수(단계마다의 배치 크기를 정함)와 KV 총길이(어텐션 비용을 정함)예요. 짧은 요청은 동시성이 낮고 KV 총길이가 큰 카드로, 긴 요청은 KV 총길이가 작은 카드로 보내요(Q&amp;A 119행).',
        ve: '이미지를 임베딩 벡터로 바꿔 프리필에 넘겨요. 인스턴스마다 카드 한 장이면 보통 충분하고, 더 싼 카드를 권해요(Q&amp;A 51행).',
        prefill: '프롬프트에서 캐시에 미스한 부분을 읽어 들여 KV 캐시를 계산해 디코드에 넘겨요. 평범한 8카드 머신을 쓰고, EP2–8 / DP2–8에서 GPU 메모리가 허용하는 한 가장 작은 값을 골라요(Q&amp;A 11, 47행).',
        decode: '토큰을 한 단계씩 생성해요. 단계마다 추측 디코딩으로 드래프트 토큰 몇 개를 검증하고(드래프트는 기본 최대 5개, environ.py 129행), 비동기 스케줄링을 함께 써요. 64–128카드 슈퍼노드에서 EP64–128, 곧 와이드 전문가 병렬로 돌리고, 카드가 많을수록 좋아요(Q&amp;A 11, 49행). 디코드가 만든 KV도 스토리지에 다시 써서 히트율을 높여요(149행).',
        eplb: '카드마다 자기가 맡은 전문가 말고도 중복 전문가를 몇 개 두어 인기 전문가의 복사본으로 써요. 최근 N 단계 동안 전문가마다의 부하를 집계하고, M 단계마다 다시 배치해요. 전문가 가중치는 그룹 안에서 NVLink로 옮겨요(Q&amp;A 97행). 프리필과 디코드는 각자 따로 매개변수가 있어요(99, 103행).',
        kv: '전용 3FS 스토리지 클러스터예요. 약 100 PiB의 SSD에 페이지로 나눈 블록 KV 캐시를 저장해요. 어떤 프리필 머신이든 어떤 접두부에도 히트할 수 있고, 스토리지 노드와 계산 노드는 따로 늘리고 줄여요. 보관 기간은 에이전트 트래픽이 3일, 채팅 트래픽이 7일이에요(Q&amp;A 141, 153행).',
      },
      open: {
        recipe: 'DeepSeek가 deepseek-recipe라는 별도 저장소로 오픈소스 공개했어요(Q&amp;A 19행). DeepInfer 저장소에는 이 부분의 코드가 없어요. 오프라인 예제는 Hugging Face 토크나이저로 프롬프트를 바로 인코딩해요(entrypoints/llm.py 156행).',
        entry: '저장소에 이 부품은 없어요. 이름이 비슷한 deepinfer/entrypoints/에는 오프라인용 LLM 클래스 하나만 있고(llm.py 23행), 같은 프로세스 안에서 엔진을 직접 움직여요.',
        vlb: 'README 42행은 프리필과 디코드의 로드 밸런싱만 나열해요. VE 로드 밸런서는 README에 언급이 없고, 저장소에도 대응하는 코드가 없어요.',
        plb: 'README 42행: 데이터 병렬 복제본 사이의 로드 밸런싱은 이번 릴리스에 없어요.',
        dlb: 'README 42행: 데이터 병렬 복제본 사이의 로드 밸런싱은 이번 릴리스에 없어요.',
        ve: '비전 인코더의 모델 코드는 저장소에 있어요(model_executor/models/vision_encoder/, deepinfer/ve/). 오프라인 예제는 ViT와 언어 모델을 같은 엔진에서 돌려요(examples/README 97행). 이것을 독립 서비스로 나누는 부분은 없어요.',
        prefill: '엔진에는 "프리필만" 하는 타입 EngineType.PROMPT가 있어요(engine_type.py 12행). 하지만 "계산을 마친 요청을 디코드 엔진에 보내기", "KV 캐시 저장하기" 같은 훅은 이번 릴리스에서 빈 함수예요(llm_engine.py 800–858행).',
        decode: '엔진에는 "디코드만" 하는 타입 EngineType.COMPLETION이 있어요(engine_type.py 13행). 오프라인 추론은 기본 NORMAL 타입을 써요. 같은 엔진이 먼저 프리필하고 그다음 디코드해요(arg_utils.py 41행).',
        eplb: '코드는 deepinfer/model_executor/eplb/에 있어요. policy.py가 새 전문가 배치를 계산하고, shuffle.py가 새 배치에 맞춰 전문가 가중치를 옮겨요.',
        kv: 'README 40행: KV 캐시 시스템은 이번 릴리스에 없어요. 엔진의 worker/cache_engine.py는 128토큰이라는 디스크 기록 단위를 정의하지만(32행), KV를 실제로 저장하는 훅 do_save_kvcache는 빈 함수예요(llm_engine.py 815–816행).',
      },
      dEmpty: '지도에서 블록을 클릭하면 여기에 설명이 나와요.',
      bStep: '▶ 한 단계 진행', bReset: '초기화', bDim: '공개된 부분만 보기', bAll: '모두 보기',
      sOpenK: '이 그림에서 코드가 이번 저장소에 있는 블록',
      sOpenF: (o, p, s, c, n) => `<b>= 완전 공개 ${o}개 + 엔진만 ${p}개</b><br>이 밖에 다른 저장소에 ${s}개, 비공개 ${c}개, 모두 ${n}개`,
      sLbK: 'Q&amp;A 문서가 나열한 로드 밸런서 네 개 가운데 공개된 것',
      sLbF: '<b>EPLB뿐이고, model_executor/eplb/에 있어요</b><br>프리필, 디코드 두 개는 README 42행의 "포함하지 않음"에 있고, VE 로드 밸런서는 README에 언급이 없으며 저장소에도 코드가 없어요',
      ready: '<span class="c">$</span> ready. 지도에서 블록을 아무거나 클릭하거나, [ ▶ 한 단계 진행 ]을 눌러 요청을 따라가 보세요',
      readyShort: '<span class="c">$</span> ready. [ ▶ 한 단계 진행 ]을 눌러 시작하세요',
      log: [
        '<span class="c">[1/8]</span> 사용자의 JSON 요청이 들어와요. <span class="w">DeepSeek Recipe</span>가 이것을 하나의 대화 형식으로 통일해서 토큰 시퀀스와 샘플링 인자로 인코딩해요.',
        '<span class="c">[2/8]</span> <span class="w">Entrypoint</span>가 접두부 해시 체인을 따라 KV 스토리지를 조회해서 얼마나 길게 히트하는지 봐요. 히트 길이는 라우팅하기 전에 계산해야 해서, 이 단계는 숨길 수 없어요.',
        '<span class="c">[3/8]</span> <span class="w">프리필 로드 밸런서</span>가 컨텍스트 길이로 요청을 4구간 중 하나에 넣어요. 엔진은 남은 계산 쿼터만큼 일을 가져가요.',
        '<span class="c">[4/8]</span> 요청에 이미지가 있을 때만 거치는 단계예요. 프리필 머신이 <span class="w">VE 로드 밸런서</span>를 거쳐 비전 인코더 머신을 찾고, 이미지를 임베딩 벡터로 바꿔요.',
        '<span class="c">[5/8]</span> <span class="w">프리필</span>이 이미 히트한 KV를 3FS에서 가져오고, 미스한 부분만 계산해요. MoE 층에서는 <span class="w">EPLB</span>가 카드마다의 전문가 부하를 비슷하게 맞춰요.',
        '<span class="c">[6/8]</span> <span class="w">디코드 로드 밸런서</span>가 디코드 카드 한 장을 고르고, KV 캐시가 P에서 D로 전달돼요.',
        '<span class="c">[7/8]</span> <span class="w">디코드</span>가 토큰을 하나씩 생성하고, 64–128장의 카드가 함께 와이드 전문가 병렬을 해요. 디코드가 만든 KV도 스토리지에 다시 써서, 다음에 히트할 수 있어요.',
        '<span class="c">[8/8]</span> 생성된 토큰이 Entrypoint로 돌아오고, <span class="w">Recipe</span>가 이것을 본문, 생각, 도구 호출로 파싱해서 각 프로토콜의 스트리밍 응답으로 돌려보내요.',
      ],
      restart: '<span class="y">// 요청 하나가 끝났어요. 1단계부터 다시 시작해요</span>',
      dimOn: '<span class="y">// 공개된 부분만</span>: 비공개와 다른 저장소의 블록이 흐려져요',
      dimOff: '<span class="y">// 모두 보기</span>',
      picked: (name, st) => `<span class="m">선택</span> ${name} · ${st}`,
      try: [
        '<b>KV 캐시 스토리지</b>를 클릭하고 <b>EPLB</b>를 클릭해서, 둘의 "공개 여부"를 비교해 보세요. 하나는 문서에 설명만 있고, 다른 하나는 코드가 전부 있어요.',
        '<b>공개된 부분만 보기</b>를 눌러 보세요. 계속 밝은 것은 엔진과 EPLB뿐이에요. 오프라인 추론을 온라인 서비스로 바꾸려면 어떤 부품이 더 필요한지 생각해 보세요.',
        '<b>▶ 한 단계 진행</b>을 계속 눌러 8단계를 끝까지 가 보세요. 이미지가 있는 요청은 블록 10개를 모두 건드리고, 텍스트만 있는 요청은 4단계를 건너뛰어 블록 8개를 건드려요. 어느 쪽이든 코드가 이번 저장소에 있는 블록은 4개뿐이에요.',
      ],
      verdict: (n, nText, inRepo) => `이미지가 있는 요청은 8단계를 거쳐 블록 ${n}개를 모두 건드리고, 텍스트만 있는 요청은 4단계를 건너뛰어 블록 ${nText}개를 건드려요. 블록 ${n}개 가운데 코드가 이번 저장소에 있는 것은 ${inRepo}개예요. P, D, VE 세 단계의 엔진과 EPLB예요. KV 캐시 시스템, 분리 배포의 접착 코드, 데이터 병렬 로드 밸런서 세 개는 배포하는 사람이 직접 채워야 해요.`,
    },
    es: {
      code: 'SERVING_MAP', title: 'Mapa del sistema de inferencia de producción', tag: 'Informe upstream · estado del código abierto comprobado en el repositorio',
      intro: 'La arquitectura de referencia del documento Q&amp;A de DeepSeek; un cuadrado es un componente. <b>Haz clic en un cuadrado</b> y al lado verás qué hace, si se publicó esta vez y en qué página leer más. Pulsa <b>▶ Avanzar un paso</b> para seguir una solicitud desde la puerta hasta la salida.',
      lgOpen: 'Publicado ahora: el código está en el repositorio', lgPartial: 'El código del motor está; el código de enlace del despliegue desagregado, no', lgSep: 'En otro repositorio de código abierto', lgClosed: 'No publicado; solo descrito en la documentación', lgPath: 'Contorno resaltado: componentes que usa este paso',
      steps: ['Codificar', 'Ver aciertos', 'Asignar prefill', 'Codif. imágenes', 'Prefill', 'Pasar a decode', 'Decode', 'Devolver'],
      mapLabel: 'Mapa de componentes del sistema de inferencia de producción de DeepSeek-V4.1-Flash',
      top: 'Solicitud del usuario ↓　↑ Respuesta (JSON)',
      names: {
        recipe: 'DeepSeek Recipe', entry: 'Entrypoint', vlb: 'Balanceador de carga de VE', plb: 'Balanceador de carga de prefill', dlb: 'Balanceador de carga de decode',
        ve: 'Codificador visual (VE)', prefill: 'Prefill (P)', decode: 'Decode (D)', eplb: 'EPLB (balanceo de carga de expertos)', kv: 'Almacén de la caché KV (3FS)',
      },
      boxText: {
        recipe: ['DeepSeek Recipe'], entry: ['Entrypoint'], vlb: ['Balanceador', 'de VE'], plb: ['Balanceador', 'de prefill'], dlb: ['Balanceador', 'de decode'],
        ve: ['Codificador', 'visual (VE)'], prefill: ['Prefill (P)'], decode: ['Decode (D)'], eplb: ['EPLB'], kv: ['Almacén de la caché KV (3FS)'],
      },
      thinLine: 'Línea fina: solicitud', thickLine: 'Línea gruesa: caché KV',
      st: { open: 'Publicado ahora', partial: 'Motor sí, enlace no', separate: 'Otro repositorio', closed: 'No publicado' },
      hDo: 'Qué hace', hOpen: 'Estado del código abierto', hRead: 'Dónde leer más',
      pageNames: { overview: 'Esta misma página', 'wide-ep': 'Serie, página 2: paralelismo de expertos amplio', 'pd-kv': 'Serie, página 3: desagregación E/P/D y caché KV', 'spec-sched': 'Serie, página 4: decodificación especulativa y planificación sin sobrecoste', determinism: 'Serie, página 5: invariancia al lote y muestreo determinista' },
      chNames: { '10': 'Capítulo 10: MoE', '12': 'Capítulo 12: Caché de expertos', '16': 'Capítulo 16: Prefill', '17': 'Capítulo 17: Capacidad de la KV, conjuntos de trabajo y almacenamiento por niveles', '18': 'Capítulo 18: Decodificación especulativa', '20': 'Capítulo 20: Reutilización de prefijos, instantáneas y copia en escritura', '21': 'Capítulo 21: Dos tarjetas gráficas', '23': 'Capítulo 23: Del token a la API', '25': 'Capítulo 25: De una secuencia a varios usuarios' },
      readNote: { ve: 'El libro no tiene un capítulo solo sobre el codificador visual; el capítulo 20 explica cómo participan las imágenes en la coincidencia de prefijos.', recipe: 'Esta serie no profundiza en él; el capítulo 23 explica cómo hace Strata el mismo tipo de trabajo.' },
      does: {
        recipe: 'Unifica las solicitudes de los tres estilos de API, Chat Completions, Responses y Messages, en un solo formato de conversación y las codifica en una secuencia de tokens; luego interpreta la salida del modelo como eventos (texto, razonamiento, llamadas a herramientas) y la convierte de nuevo en la respuesta en streaming de cada protocolo. Está escrito en Rust, con enlaces para Python (Q&amp;A, líneas 294–296). Divide la entrada en tokens especiales y codifica los segmentos en paralelo, lo que evita que el texto del usuario se haga pasar por tokens de control y acorta la tokenización de entradas largas (línea 35).',
        entry: 'Recibe de Recipe la secuencia de tokens y los parámetros de muestreo y los pasa a prefill; al final devuelve a Recipe los tokens generados (diagrama de arquitectura de referencia). Antes de enrutar, consulta los metadatos del almacén KV siguiendo la cadena de hashes del prefijo para calcular la longitud del acierto (Q&amp;A, línea 157). En la memoria de cada máquina Entrypoint guarda además, fragmentado, en qué máquina está la caché KV de SWA (línea 169).',
        vlb: 'Asigna las imágenes por máquina: la máquina de prefill elige al azar una máquina de codificador visual y luego entrega las imágenes a la tarjeta de esa máquina que tenga ahora menos parches de imagen por procesar. El número de parches se calcula directamente como (ancho / patch_size) × (alto / patch_size) (Q&amp;A, línea 123).',
        plb: 'Reparte las solicitudes en 4 niveles según la longitud total del contexto: menos de 16K, de 16K a 64K, de 64K a 256K y más de 256K. Cuántos motores recibe cada nivel se ajusta dinámicamente según la cuota de cómputo que necesitó cada nivel en la ronda anterior; los motores toman trabajo según su cuota restante. Cualquier motor puede acertar en cualquier prefijo, así que no se enruta por afinidad de prefijo (Q&amp;A, líneas 109–113).',
        dlb: 'Enruta entre todas las tarjetas de todas las instancias de decode, equilibrando dos cosas a la vez: el número de solicitudes (que fija el tamaño del lote de cada paso) y la longitud total de KV (que fija el costo de la atención). Las solicitudes cortas van a tarjetas con poca concurrencia y mucha longitud total de KV, y las largas van a tarjetas con poca longitud total de KV (Q&amp;A, línea 119).',
        ve: 'Convierte las imágenes en vectores de embedding y los entrega a prefill. Una tarjeta por instancia suele bastar, y se recomiendan tarjetas más baratas (Q&amp;A, línea 51).',
        prefill: 'Lee la parte del prompt que falló en la caché y calcula la caché KV que entrega a decode. Usa máquinas comunes de 8 tarjetas, con EP2–8 / DP2–8, tomando el valor más pequeño que permita la memoria de la GPU (Q&amp;A, líneas 11 y 47).',
        decode: 'Genera tokens paso a paso: en cada paso verifica varios tokens borrador con decodificación especulativa (hasta 5 borradores por defecto, environ.py, línea 129), junto con la planificación asíncrona. Usa supernodos de 64–128 tarjetas con EP64–128, es decir, paralelismo de expertos amplio, y cuantas más tarjetas, mejor (Q&amp;A, líneas 11 y 49). La KV que produce decode también se escribe de vuelta en el almacén para subir la tasa de aciertos (línea 149).',
        eplb: 'Además de los expertos que le tocan, cada tarjeta guarda algunos expertos redundantes, copias de los expertos más usados. Cuenta la carga de cada experto en los últimos N pasos, reasigna cada M pasos y mueve los pesos de los expertos dentro del grupo por NVLink (Q&amp;A, línea 97). Prefill y decode tienen cada uno sus propios parámetros (líneas 99 y 103).',
        kv: 'Un clúster de almacenamiento 3FS dedicado, de unos 100 PiB de SSD, que guarda la caché KV paginada por bloques. Cualquier máquina de prefill puede acertar en cualquier prefijo; los nodos de almacenamiento y los de cómputo escalan por separado. Retención: 3 días para el tráfico de agentes y 7 días para el de chat (Q&amp;A, líneas 141 y 153).',
      },
      open: {
        recipe: 'DeepSeek lo publicó como un repositorio aparte, deepseek-recipe (Q&amp;A, línea 19). El repositorio de DeepInfer no tiene este código; el ejemplo offline codifica los prompts directamente con un tokenizador de Hugging Face (entrypoints/llm.py, línea 156).',
        entry: 'Este componente no está en el repositorio. El directorio de nombre parecido, deepinfer/entrypoints/, solo tiene una clase LLM para uso offline (llm.py, línea 23), que maneja el motor directamente en el proceso actual.',
        vlb: 'La línea 42 del README solo enumera el balanceo de carga de prefill y de decode; el README no menciona un balanceador de carga de VE, y el repositorio tampoco tiene código para él.',
        plb: 'README, línea 42: el balanceo de carga entre réplicas de paralelismo de datos no está en esta publicación.',
        dlb: 'README, línea 42: el balanceo de carga entre réplicas de paralelismo de datos no está en esta publicación.',
        ve: 'El código del modelo del codificador visual está en el repositorio (model_executor/models/vision_encoder/, deepinfer/ve/). El ejemplo offline ejecuta el ViT y el modelo de lenguaje en el mismo motor (examples/README, línea 97); la parte que lo separa en un servicio independiente no está.',
        prefill: 'El motor tiene un tipo «solo prefill», EngineType.PROMPT (engine_type.py, línea 12). Pero los ganchos «enviar la solicitud terminada al motor de decode» y «guardar la caché KV» son funciones vacías en esta publicación (llm_engine.py, líneas 800–858).',
        decode: 'El motor tiene un tipo «solo decode», EngineType.COMPLETION (engine_type.py, línea 13). La inferencia offline usa el tipo NORMAL por defecto: el mismo motor hace primero prefill y luego decode (arg_utils.py, línea 41).',
        eplb: 'El código está en deepinfer/model_executor/eplb/: policy.py calcula la nueva colocación de expertos y shuffle.py mueve los pesos de los expertos a la nueva colocación.',
        kv: 'README, línea 40: el sistema de caché KV no está en esta publicación. worker/cache_engine.py, en el motor, define una granularidad de persistencia de 128 tokens (línea 32), pero do_save_kvcache, el gancho que realmente guarda la KV, es una función vacía (llm_engine.py, líneas 815–816).',
      },
      dEmpty: 'Haz clic en un bloque del mapa y aquí aparece su descripción.',
      bStep: '▶ Avanzar un paso', bReset: 'Reiniciar', bDim: 'Solo lo publicado', bAll: 'Mostrar todo',
      sOpenK: 'Bloques de este mapa cuyo código está en el repositorio de esta publicación',
      sOpenF: (o, p, s, c, n) => `<b>= ${o} bloques completamente abiertos + ${p} solo con el motor</b><br>Otros ${s} están en otro repositorio y ${c} no se publicaron; ${n} bloques en total`,
      sLbK: 'De los cuatro balanceadores de carga que enumera el documento Q&amp;A, los que son de código abierto',
      sLbF: '<b>Solo EPLB, en model_executor/eplb/</b><br>Los de prefill y decode figuran como «no incluidos» en la línea 42 del README; el README no menciona un balanceador de carga de VE y el repositorio no tiene código para él',
      ready: '<span class="c">$</span> ready. Haz clic en cualquier bloque del mapa o pulsa [ ▶ Avanzar un paso ] para seguir una solicitud',
      readyShort: '<span class="c">$</span> ready. Pulsa [ ▶ Avanzar un paso ] para empezar',
      log: [
        '<span class="c">[1/8]</span> Entra la solicitud JSON del usuario. <span class="w">DeepSeek Recipe</span> la unifica en un formato de conversación y la codifica en una secuencia de tokens y parámetros de muestreo.',
        '<span class="c">[2/8]</span> <span class="w">Entrypoint</span> consulta el almacén KV siguiendo la cadena de hashes del prefijo para ver cuánto acierta. La longitud del acierto hay que calcularla antes de enrutar; este paso no se puede esconder.',
        '<span class="c">[3/8]</span> El <span class="w">balanceador de carga de prefill</span> mete la solicitud en uno de 4 niveles según la longitud del contexto; los motores toman trabajo según su cuota de cómputo restante.',
        '<span class="c">[4/8]</span> Este paso solo ocurre si la solicitud lleva imágenes: la máquina de prefill busca una máquina de codificador visual mediante el <span class="w">balanceador de carga de VE</span> y convierte las imágenes en vectores de embedding.',
        '<span class="c">[5/8]</span> <span class="w">Prefill</span> recupera de 3FS la KV que ya acertó y calcula solo la parte que falló. En las capas MoE, <span class="w">EPLB</span> mantiene parecida la carga de expertos de las tarjetas.',
        '<span class="c">[6/8]</span> El <span class="w">balanceador de carga de decode</span> elige una tarjeta de decode, y la caché KV pasa de P a D.',
        '<span class="c">[7/8]</span> <span class="w">Decode</span> genera token a token, con 64–128 tarjetas haciendo juntas paralelismo de expertos amplio. La KV que produce decode también se escribe de vuelta en el almacén, para que la próxima vez acierte.',
        '<span class="c">[8/8]</span> Los tokens generados vuelven a Entrypoint, y <span class="w">Recipe</span> los interpreta como texto, razonamiento y llamadas a herramientas, y los convierte de nuevo en la respuesta en streaming de cada protocolo.',
      ],
      restart: '<span class="y">// Una solicitud terminó; se vuelve a empezar desde el paso 1</span>',
      dimOn: '<span class="y">// Solo lo publicado</span>: los bloques no publicados o de otro repositorio se atenúan',
      dimOff: '<span class="y">// Mostrar todo</span>',
      picked: (name, st) => `<span class="m">elegido</span> ${name} · ${st}`,
      try: [
        'Haz clic en <b>Almacén de la caché KV</b> y luego en <b>EPLB</b>, y compara su «Estado del código abierto»: uno solo tiene descripción en la documentación y el otro tiene el código completo.',
        'Pulsa <b>Solo lo publicado</b>: solo siguen iluminados el motor y EPLB. Piensa qué piezas faltan todavía para convertir la inferencia offline en un servicio en línea.',
        'Pulsa <b>▶ Avanzar un paso</b> varias veces para recorrer los 8 pasos: una solicitud con imágenes toca los 10 bloques, y una solicitud solo de texto se salta el paso 4 y toca 8 bloques. En ambos casos, solo 4 bloques tienen su código en el repositorio de esta publicación.',
      ],
      verdict: (n, nText, inRepo) => `Una solicitud con imágenes recorre 8 pasos y toca los ${n} bloques; una solicitud solo de texto se salta el paso 4 y toca ${nText} bloques. De los ${n} bloques, ${inRepo} tienen su código en el repositorio de esta publicación: los motores de las etapas P, D y VE, y EPLB. El sistema de caché KV, el código de enlace del despliegue desagregado y los tres balanceadores de carga del paralelismo de datos tendrá que rellenarlos quien despliegue.`,
    },
    ar: {
      code: 'SERVING_MAP', title: 'خريطة نظام الاستدلال الإنتاجي', tag: 'تقرير المصدر الأصلي · حالة فتح المصدر مُدقَّقة في المستودع',
      intro: 'البنية المرجعية من وثيقة Q&amp;A لدى DeepSeek؛ والمربع الواحد مكوّن واحد. <b>انقر على مربع</b> لترى بجانبه ما يفعله، وهل فُتح مصدره هذه المرة، وأي صفحة تقرأ للتفصيل. واضغط <b>▶ خطوة واحدة</b> لتتبّع طلب واحد من الباب إلى المخرج.',
      lgOpen: 'مفتوح المصدر الآن: الشيفرة في المستودع', lgPartial: 'شيفرة المحرك موجودة، أما الشيفرة اللاصقة للنشر المفصول فغير موجودة', lgSep: 'في مستودع آخر مفتوح المصدر', lgClosed: 'غير مفتوح المصدر؛ موصوف في الوثائق فقط', lgPath: 'إطار مميّز: المكوّنات المستخدمة في هذه الخطوة',
      steps: ['ترميز', 'فحص الإصابات', 'توزيع prefill', 'ترميز الصور', 'prefill', 'تسليم إلى decode', 'decode', 'الإرجاع'],
      mapLabel: 'خريطة مكوّنات نظام الاستدلال الإنتاجي في DeepSeek-V4.1-Flash',
      top: 'طلب المستخدم ↓　↑ الرد (JSON)',
      names: {
        recipe: 'DeepSeek Recipe', entry: 'Entrypoint', vlb: 'موازن حمل VE', plb: 'موازن حمل prefill', dlb: 'موازن حمل decode',
        ve: 'مُرمِّز الرؤية (VE)', prefill: 'prefill (P)', decode: 'decode (D)', eplb: 'EPLB (موازنة حمل الخبراء)', kv: 'تخزين ذاكرة KV المؤقتة (3FS)',
      },
      boxText: {
        recipe: ['DeepSeek Recipe'], entry: ['Entrypoint'], vlb: ['موازن حمل', 'VE'], plb: ['موازن حمل', 'prefill'], dlb: ['موازن حمل', 'decode'],
        ve: ['مُرمِّز الرؤية', '(VE)'], prefill: ['prefill (P)'], decode: ['decode (D)'], eplb: ['EPLB'], kv: ['تخزين ذاكرة KV المؤقتة (3FS)'],
      },
      thinLine: 'الخط الرفيع: الطلب', thickLine: 'الخط السميك: ذاكرة KV المؤقتة',
      st: { open: 'مفتوح المصدر الآن', partial: 'المحرك موجود واللاصق غائب', separate: 'مستودع آخر', closed: 'غير مفتوح المصدر' },
      hDo: 'ماذا يفعل', hOpen: 'حالة فتح المصدر', hRead: 'أين تقرأ',
      pageNames: { overview: 'هذه الصفحة نفسها', 'wide-ep': 'السلسلة، الصفحة 2: توازي الخبراء الواسع', 'pd-kv': 'السلسلة، الصفحة 3: فصل E/P/D وذاكرة KV المؤقتة', 'spec-sched': 'السلسلة، الصفحة 4: فك الترميز التخميني والجدولة عديمة الكلفة', determinism: 'السلسلة، الصفحة 5: الثبات عبر الدُّفعات وأخذ العينات الحتمي' },
      chNames: { '10': 'الفصل 10: MoE', '12': 'الفصل 12: ذاكرة الخبراء المؤقتة', '16': 'الفصل 16: Prefill', '17': 'الفصل 17: سعة KV ومجموعة العمل والتخزين الطبقي', '18': 'الفصل 18: فك الترميز التخميني', '20': 'الفصل 20: إعادة استخدام البادئة واللقطات والنسخ عند الكتابة', '21': 'الفصل 21: بطاقتا رسوميات', '23': 'الفصل 23: من الرمز إلى الواجهة البرمجية', '25': 'الفصل 25: من تسلسل واحد إلى عدة مستخدمين' },
      readNote: { ve: 'لا يوجد في الكتاب فصل مخصص لمُرمِّز الرؤية وحده؛ ويشرح الفصل 20 كيف تشارك الصور في مطابقة البادئة.', recipe: 'لا تتوسع هذه السلسلة فيه؛ ويشرح الفصل 23 كيف يؤدي Strata العمل نفسه.' },
      does: {
        recipe: 'يوحّد طلبات واجهات Chat Completions وResponses وMessages الثلاث في صيغة محادثة واحدة، ويرمّزها إلى تسلسل رموز؛ ثم يحلّل مخرجات النموذج إلى أحداث مثل النص والتفكير واستدعاءات الأدوات، ويعيدها إلى استجابة البث الخاصة بكل بروتوكول. مكتوب بلغة Rust مع ربط بـ Python (Q&amp;A، الأسطر 294–296). ويقطّع المدخل عند الرموز الخاصة ويرمّز المقاطع بالتوازي، فيمنع نص المستخدم من انتحال رموز التحكم ويقصّر زمن ترميز المدخلات الطويلة (السطر 35).',
        entry: 'يستقبل من Recipe تسلسل الرموز ومعاملات أخذ العينات ويسلّمها إلى prefill؛ وفي النهاية يعيد الرموز المولَّدة إلى Recipe (مخطط البنية المرجعية). وقبل التوجيه يستعلم عن بيانات KV الوصفية على طول سلسلة تجزئة البادئة ليحسب طول الإصابة (Q&amp;A، السطر 157). وفي ذاكرة كل جهاز Entrypoint يحتفظ أيضًا بسجل مجزَّأ يبيّن على أي جهاز توجد ذاكرة KV المؤقتة الخاصة بـ SWA (السطر 169).',
        vlb: 'يوزّع الصور على مستوى الجهاز: يختار جهاز prefill جهاز مُرمِّز رؤية عشوائيًا، ثم يسلّم الصور إلى البطاقة التي لديها حاليًا أقل عدد من رقع الصور المطلوب معالجتها في ذلك الجهاز. ويُحسب عدد الرقع مباشرة بالصيغة (العرض / patch_size) × (الارتفاع / patch_size) (Q&amp;A، السطر 123).',
        plb: 'يقسم الطلبات إلى 4 مستويات بحسب طول السياق الكلي: أقل من 16K، ومن 16K إلى 64K، ومن 64K إلى 256K، وأكثر من 256K. ويُضبط ديناميكيًا عدد المحركات المخصصة لكل مستوى بحسب حصة الحوسبة التي احتاجها كل مستوى في الجولة السابقة؛ وتأخذ المحركات العمل بحسب حصتها المتبقية. وأي محرك يستطيع أن يصيب أي بادئة، ولذلك لا يوجَّه بحسب تقارب البادئات (Q&amp;A، الأسطر 109–113).',
        dlb: 'يوجّه عبر كل بطاقات كل نسخ decode معًا، موازِنًا أمرين في آن واحد: عدد الطلبات (الذي يحدد حجم الدفعة في كل خطوة) والطول الكلي لـ KV (الذي يحدد كلفة الانتباه). فتذهب الطلبات القصيرة إلى بطاقات قليلة التزامن وكبيرة الطول الكلي لـ KV، وتذهب الطويلة إلى بطاقات صغيرة الطول الكلي لـ KV (Q&amp;A، السطر 119).',
        ve: 'يحوّل الصور إلى متجهات تضمين ويسلّمها إلى prefill. وتكفي عادةً بطاقة واحدة لكل نسخة، ويُوصى ببطاقات أرخص (Q&amp;A، السطر 51).',
        prefill: 'يقرأ الجزء من المُطالبة الذي أخفق في الذاكرة المؤقتة، ويحسب ذاكرة KV المؤقتة ليسلّمها إلى decode. يستخدم أجهزة عادية من 8 بطاقات، بقيمة EP2–8 / DP2–8، ويأخذ أصغر قيمة تسمح بها ذاكرة GPU (Q&amp;A، السطران 11 و47).',
        decode: 'يولّد الرموز خطوة بعد خطوة: في كل خطوة يتحقق من عدة رموز مسودة بفك الترميز التخميني (حتى 5 مسودات افتراضيًا، environ.py السطر 129)، مع الجدولة غير المتزامنة. ويستخدم عُقدًا فائقة من 64–128 بطاقة مع EP64–128، أي توازي الخبراء الواسع، وكلما زادت البطاقات كان أفضل (Q&amp;A، السطران 11 و49). وتُكتب ذاكرة KV التي ينتجها decode إلى المخزن أيضًا لرفع نسبة الإصابة (السطر 149).',
        eplb: 'تضع كل بطاقة، إضافة إلى الخبراء المسؤولة عنهم، عدة خبراء مكرَّرين هم نسخ من الخبراء الساخنين. ويحصي حمل كل خبير في آخر N خطوة، ويعيد التوزيع كل M خطوة، وتنتقل أوزان الخبراء داخل المجموعة عبر NVLink (Q&amp;A، السطر 97). ولكل من prefill وdecode معاملاته الخاصة (السطران 99 و103).',
        kv: 'عنقود تخزين 3FS مخصص، بنحو 100 PiB من SSD، يحفظ ذاكرة KV المؤقتة المقسّمة إلى كتل. وأي جهاز prefill يستطيع أن يصيب أي بادئة؛ وتتوسع عقد التخزين وعقد الحوسبة كلٌّ على حدة. مدة الاحتفاظ: 3 أيام لحركة الوكلاء و7 أيام لحركة الدردشة (Q&amp;A، السطران 141 و153).',
      },
      open: {
        recipe: 'فتحت DeepSeek مصدرها في مستودع منفصل هو deepseek-recipe (Q&amp;A، السطر 19). وليس في مستودع DeepInfer شيفرة لهذا الجزء؛ فالمثال دون اتصال يرمّز المُطالبات مباشرة بمُجزِّئ Hugging Face (entrypoints/llm.py السطر 156).',
        entry: 'هذا المكوّن غير موجود في المستودع. أما الدليل المشابه له في الاسم deepinfer/entrypoints/ فليس فيه إلا فئة LLM واحدة للعمل دون اتصال (llm.py السطر 23)، وهي تقود المحرك مباشرة داخل العملية الحالية.',
        vlb: 'السطر 42 من README يسرد موازنة الحمل في prefill وdecode فقط؛ أما موازن حمل VE فلم يذكره README، ولا توجد له شيفرة في المستودع.',
        plb: 'README، السطر 42: موازنة الحمل بين نسخ توازي البيانات ليست في هذا الإصدار.',
        dlb: 'README، السطر 42: موازنة الحمل بين نسخ توازي البيانات ليست في هذا الإصدار.',
        ve: 'شيفرة نموذج مُرمِّز الرؤية في المستودع (model_executor/models/vision_encoder/ وdeepinfer/ve/). ويشغّل المثال دون اتصال ViT والنموذج اللغوي في المحرك نفسه (examples/README السطر 97)؛ أما الجزء الذي يفصله في خدمة مستقلة فغير موجود.',
        prefill: 'في المحرك نوع «prefill فقط» هو EngineType.PROMPT (engine_type.py السطر 12). لكن الخطافات «إرسال الطلب المنتهي إلى محرك decode» و«حفظ ذاكرة KV المؤقتة» دوال فارغة في هذا الإصدار (llm_engine.py الأسطر 800–858).',
        decode: 'في المحرك نوع «decode فقط» هو EngineType.COMPLETION (engine_type.py السطر 13). ويستخدم الاستدلال دون اتصال النوع الافتراضي NORMAL: المحرك نفسه يقوم بـ prefill أولًا ثم decode (arg_utils.py السطر 41).',
        eplb: 'الشيفرة في deepinfer/model_executor/eplb/: يحسب policy.py مواضع الخبراء الجديدة، وينقل shuffle.py أوزان الخبراء بحسب المواضع الجديدة.',
        kv: 'README، السطر 40: نظام ذاكرة KV المؤقتة ليس في هذا الإصدار. ويعرّف worker/cache_engine.py في المحرك دقة حفظ مقدارها 128 رمزًا (السطر 32)، لكن الخطاف do_save_kvcache الذي يحفظ KV فعلًا دالة فارغة (llm_engine.py الأسطر 815–816).',
      },
      dEmpty: 'انقر على كتلة في الخريطة لتظهر هنا شروحها.',
      bStep: '▶ خطوة واحدة', bReset: 'إعادة', bDim: 'المفتوح المصدر فقط', bAll: 'عرض الكل',
      sOpenK: 'الكتل في هذه الخريطة التي شيفرتها في مستودع هذا الإصدار',
      sOpenF: (o, p, s, c, n) => `<b>= مفتوحة بالكامل: ${o} + المحرك فقط: ${p}</b><br>في مستودع آخر: ${s}، وغير مفتوحة المصدر: ${c}؛ المجموع: ${n}`,
      sLbK: 'من موازنات الحمل الأربعة في وثيقة Q&amp;A، المفتوحة المصدر منها',
      sLbF: '<b>EPLB فقط، وهو في model_executor/eplb/</b><br>موازنا prefill وdecode مذكوران في السطر 42 من README ضمن «غير المشمول»؛ أما موازن حمل VE فلم يذكره README ولا توجد له شيفرة في المستودع',
      ready: '<span class="c">$</span> ready. انقر على أي كتلة في الخريطة، أو اضغط [ ▶ خطوة واحدة ] لتتبّع طلب',
      readyShort: '<span class="c">$</span> ready. اضغط [ ▶ خطوة واحدة ] للبدء',
      log: [
        '<span class="c">[1/8]</span> يصل طلب JSON من المستخدم. تحوّله <span class="w">DeepSeek Recipe</span> إلى صيغة محادثة واحدة وترمّزه إلى تسلسل رموز ومعاملات أخذ العينات.',
        '<span class="c">[2/8]</span> يستعلم <span class="w">Entrypoint</span> عن مخزن KV على طول سلسلة تجزئة البادئة ليرى أي طول يصيب. يجب حساب طول الإصابة قبل التوجيه، ولا يمكن إخفاء هذه الخطوة.',
        '<span class="c">[3/8]</span> يضع <span class="w">موازن حمل prefill</span> الطلب في أحد 4 مستويات بحسب طول السياق؛ وتأخذ المحركات العمل بحسب حصة الحوسبة المتبقية.',
        '<span class="c">[4/8]</span> لا تحدث هذه الخطوة إلا إذا كان الطلب يحمل صورًا: يبحث جهاز prefill عن جهاز مُرمِّز رؤية عبر <span class="w">موازن حمل VE</span> ويحوّل الصور إلى متجهات تضمين.',
        '<span class="c">[5/8]</span> يجلب <span class="w">prefill</span> من 3FS ذاكرة KV التي أصابت بالفعل، ويحسب الجزء الذي أخفق فقط. وفي طبقات MoE تقرّب <span class="w">EPLB</span> حمل الخبراء بين البطاقات.',
        '<span class="c">[6/8]</span> يختار <span class="w">موازن حمل decode</span> بطاقة decode، وتنتقل ذاكرة KV المؤقتة من P إلى D.',
        '<span class="c">[7/8]</span> يولّد <span class="w">decode</span> رمزًا بعد رمز، وتقوم 64–128 بطاقة معًا بتوازي الخبراء الواسع. وتُكتب ذاكرة KV التي ينتجها decode إلى المخزن أيضًا، فتصيب في المرة القادمة.',
        '<span class="c">[8/8]</span> تعود الرموز المولَّدة إلى Entrypoint، وتحلّلها <span class="w">Recipe</span> إلى نص وتفكير واستدعاءات أدوات، وتعيدها إلى استجابة البث الخاصة بكل بروتوكول.',
      ],
      restart: '<span class="y">// انتهى طلب واحد؛ نبدأ من جديد من الخطوة 1</span>',
      dimOn: '<span class="y">// المفتوح المصدر فقط</span>: تبهت الكتل غير المفتوحة والكتل الموجودة في مستودع آخر',
      dimOff: '<span class="y">// عرض الكل</span>',
      picked: (name, st) => `<span class="m">اخترت</span> ${name} · ${st}`,
      try: [
        'انقر على <b>تخزين ذاكرة KV المؤقتة</b> ثم على <b>EPLB</b>، وقارن «حالة فتح المصدر» فيهما: أحدهما موصوف في الوثائق فقط، والآخر شيفرته كاملة.',
        'اضغط <b>المفتوح المصدر فقط</b>: لا يبقى مضيئًا إلا المحرك وEPLB. فكّر في القطع التي ما زالت ناقصة لتحويل الاستدلال دون اتصال إلى خدمة عبر الإنترنت.',
        'اضغط <b>▶ خطوة واحدة</b> مرارًا لتقطع الخطوات الثماني: الطلب الذي يحمل صورًا يلمس الكتل العشر كلها، والطلب النصي فقط يتخطى الخطوة 4 ويلمس 8 كتل. وفي الحالتين لا توجد شيفرة في مستودع هذا الإصدار إلا لأربع كتل.',
      ],
      verdict: (n, nText, inRepo) => `الطلب الذي يحمل صورًا يقطع 8 خطوات ويلمس الكتل كلها (عددها: ${n})؛ والطلب النصي فقط يتخطى الخطوة 4 ويلمس كتلًا عددها: ${nText}. ومن بين هذه الكتل، عدد ما شيفرته في مستودع هذا الإصدار: ${inRepo}، وهي محركات المراحل P وD وVE، وEPLB. أما نظام ذاكرة KV المؤقتة، والشيفرة اللاصقة للنشر المفصول، وموازنات حمل توازي البيانات الثلاثة، فعلى من ينشر النظام أن يملأها بنفسه.`,
    },
  });

  // Geometry of the map, shared in spirit with the static figure D1-2 in the page.
  const BOX = {
    recipe: [120, 24, 160, 34], entry: [120, 80, 160, 34],
    vlb: [6, 140, 112, 34], plb: [144, 140, 112, 34], dlb: [282, 140, 100, 34],
    ve: [6, 200, 112, 60], prefill: [144, 200, 112, 72], decode: [282, 200, 112, 72],
    kv: [144, 304, 250, 34],
  };
  const EPLB_BOXES = [[156, 234, 88, 26], [294, 234, 88, 26]];
  const THIN = ['M190 58V76', 'M210 80V62', 'M200 114V136', 'M200 174V196', 'M144 214H131V157H122', 'M62 174V196', 'M118 248H140', 'M256 214H269V157H278', 'M332 174V196', 'M388 198V97H284'];
  const HEADS = ['M186 74L190 80L194 74Z', 'M206 64L210 58L214 64Z', 'M196 134L200 140L204 134Z', 'M196 194L200 200L204 194Z', 'M124 153L118 157L124 161Z', 'M58 194L62 200L66 194Z', 'M138 244L144 248L138 252Z', 'M276 153L282 157L276 161Z', 'M328 194L332 200L336 194Z', 'M286 93L280 97L286 101Z'];
  const THICK = ['M256 250H276', 'M190 302V278', 'M340 274V298'];
  const THICK_HEADS = ['M274 245L282 250L274 255Z', 'M185 280L190 272L195 280Z', 'M335 296L340 304L345 296Z'];

  const FILL = {
    open: { fill: 'var(--accent)', stroke: 'var(--accent)', text: 'var(--paper)', dash: '' },
    partial: { fill: 'color-mix(in srgb,var(--accent) 16%,var(--paper))', stroke: 'var(--frame)', text: 'var(--ink)', dash: '' },
    separate: { fill: 'var(--paper)', stroke: 'var(--muted)', text: 'var(--ink)', dash: '4 3' },
    closed: { fill: 'var(--side)', stroke: 'var(--frame)', text: 'var(--muted)', dash: '' },
  };

  Viz.register('di-overview-arch', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: FILL.open.fill, text: T.lgOpen, glow: true },
        { color: FILL.partial.fill, text: T.lgPartial },
        { color: FILL.separate.fill, text: T.lgSep },
        { color: FILL.closed.fill, text: T.lgClosed },
        { color: 'var(--a3)', text: T.lgPath },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');

      const svg = Viz.svg('svg', { viewBox: '0 0 400 372', role: 'group', 'aria-label': T.mapLabel, style: 'width:100%;height:auto;display:block;font-family:var(--sans)' }, left);
      const text = (x, y, s, color, parent, bold) => { const t = Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': 'middle', 'font-weight': bold ? 600 : 400, style: `fill:${color};pointer-events:none` }, parent || svg); t.textContent = s; return t; };
      text(200, 14, T.top, 'var(--muted)');
      THIN.forEach(d => Viz.svg('path', { d, 'stroke-width': 1.4, style: 'fill:none;stroke:var(--muted)' }, svg));
      HEADS.forEach(d => Viz.svg('path', { d, style: 'fill:var(--muted)' }, svg));
      THICK.forEach(d => Viz.svg('path', { d, 'stroke-width': 3.2, style: 'fill:none;stroke:var(--a2)' }, svg));
      THICK_HEADS.forEach(d => Viz.svg('path', { d, style: 'fill:var(--a2)' }, svg));

      // One <g> per block; EPLB appears twice (inside P and inside D) and both copies share its id.
      const groups = [];
      function block(id, [x, y, w, h], titleTop) {
        const b = M.byId(id), c = FILL[b.status];
        const g = Viz.svg('g', { tabindex: 0, role: 'button', 'aria-label': `${T.names[id]} · ${T.st[b.status]}`, 'data-id': id, style: 'cursor:pointer' }, svg);
        const r = Viz.svg('rect', { x, y, width: w, height: h, rx: 7, style: `fill:${c.fill};stroke:${c.stroke};stroke-width:1.2${c.dash ? ';stroke-dasharray:' + c.dash : ''};transition:opacity .2s` }, g);
        const lines = T.boxText[id];
        const y0 = titleTop ? y + 20 : y + h / 2 + 4.5 - (lines.length - 1) * 8;
        lines.forEach((s, i) => text(x + w / 2, y0 + i * 17, s, c.text, g, true));
        groups.push({ id, g, r });
        return g;
      }
      Object.entries(BOX).forEach(([id, box]) => block(id, box, id === 'prefill' || id === 'decode'));
      EPLB_BOXES.forEach(box => block('eplb', box, false));
      text(200, 360, `${T.thinLine}　${T.thickLine}`, 'var(--muted)');

      right.innerHTML = `<div class="viz-stat di-overview-detail" aria-live="polite"><div class="k">${T.dEmpty}</div></div>` +
        Viz.stat({ id: 'dio-open', k: T.sOpenK, v: '', f: '' }) +
        Viz.stat({ id: 'dio-lb', k: T.sLbK, v: '', f: T.sLbF, hot: true });
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${Viz.button(T.bStep)}${Viz.button(T.bDim, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try) + `<div class="viz-verdict" hidden></div>`);

      const $ = s => el.querySelector(s);
      const [stepBtn, dimBtn, resetBtn] = el.querySelectorAll('.viz-btn');
      const detail = $('.di-overview-detail');
      let step = -1, dim = false, selected = null;

      const counts = M.countByStatus(), lb = M.balancersOpen();
      $('[data-s=dio-open-v]').textContent = `${counts.open + counts.partial} / ${M.BLOCKS.length}`;
      $('[data-s=dio-open-f]').innerHTML = T.sOpenF(counts.open, counts.partial, counts.separate, counts.closed, M.BLOCKS.length);
      $('[data-s=dio-lb-v]').textContent = `${lb.open} / ${lb.total}`;

      function paint() {
        const active = new Set(step >= 0 ? M.PATH[step] : []);
        groups.forEach(({ id, g, r }) => {
          const b = M.byId(id), c = FILL[b.status];
          const hot = active.has(id), sel = selected === id;
          r.style.stroke = sel ? 'var(--a3)' : hot ? 'var(--a3)' : c.stroke;
          r.style.strokeWidth = sel || hot ? '3' : '1.2';
          r.style.strokeDasharray = sel || hot ? '' : c.dash;
          g.style.opacity = dim && (b.status === 'closed' || b.status === 'separate') ? '.22' : '1';
        });
      }
      function show(id) {
        selected = id;
        const b = M.byId(id);
        const chapters = b.chapters.map(ch => `<a href="#chapter/${ch}">${T.chNames[ch] || ch}</a>`).join(' · ');
        const page = b.page === 'overview' ? T.pageNames.overview : `<a href="#deepinfer/${b.page}">${T.pageNames[b.page]}</a>`;
        const sec = (h, html) => `<p style="margin:8px 0 0;font-size:13.5px;line-height:1.75"><b style="color:var(--a2)">${h}</b><br>${html}</p>`;
        detail.innerHTML = `<div class="k">${T.st[b.status]}</div><div class="v" style="font-size:18px">${T.names[id]}</div>` +
          sec(T.hDo, T.does[id]) + sec(T.hOpen, T.open[id]) + sec(T.hRead, `${page} · ${chapters}${T.readNote[id] ? '<br>' + T.readNote[id] : ''}`);
        term.log(T.picked(T.names[id], T.st[b.status]));
        paint();
      }
      groups.forEach(({ id, g }) => {
        g.addEventListener('click', () => show(id));
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(id); } });
      });
      stepBtn.onclick = () => {
        if (step === M.PATH.length - 1) { step = -1; term.log(T.restart); $('.viz-verdict').hidden = true; }
        step++;
        pipe.set(step);
        term.log(T.log[step]);
        paint();
        if (step === M.PATH.length - 1) {
          const v = $('.viz-verdict');
          v.innerHTML = T.verdict(M.visited().length, M.visited(M.PATH, { images: false }).length, counts.open + counts.partial);
          v.hidden = false;
        }
      };
      dimBtn.onclick = () => {
        dim = !dim;
        dimBtn.textContent = dim ? T.bAll : T.bDim;
        term.log(dim ? T.dimOn : T.dimOff);
        paint();
      };
      resetBtn.onclick = () => {
        step = -1; dim = false; selected = null;
        dimBtn.textContent = T.bDim;
        pipe.set(-1);
        detail.innerHTML = `<div class="k">${T.dEmpty}</div>`;
        $('.viz-verdict').hidden = true;
        term.clear(); term.log(T.readyShort);
        paint();
      };
      paint();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
