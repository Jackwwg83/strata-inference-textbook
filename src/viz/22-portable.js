/* Chapter 22 widgets: one CUDA-shaped source built for NVIDIA and AMD, and the CPU kernel picker.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.portable;

  const T = Viz.t({
    zh: {
      code: 'BUILD_SPLIT', title: '一份源码，两个后端', tag: '代码事实 · 简化示意',
      intro: '左边是三行 CUDA 写法的源码。选一个目标显卡，按 <b>编译</b>，看这三行在预处理之后变成什么：哪些名字被换掉，哪个 <code>#if</code> 分支被留下。',
      lgSame: '原样保留的源码', lgSwap: '被垫片换掉的名字', lgPick: '被 #if 选中的分支',
      steps: ['CMake 配置', '强制包含垫片', '预处理：改名', '预处理：选分支', '编译成机器码', '启动检查'],
      targetsLabel: '目标显卡',
      targets: ['NVIDIA RTX 50 · sm_120', 'NVIDIA 老卡 · sm_60（实验开关）', 'AMD RX 7900 · gfx1100', 'AMD RX 6900 · gfx1030', '名单外的 AMD 架构 · gfx906'],
      srcHead: '源码（只写一次）', outHead: (n) => `预处理之后（${n}）`, outEmpty: '按 [ 编译 ] 后显示',
      bGo: '▶ 编译', bReset: '重置',
      ready: '<span class="c">$</span> ready. 先选目标显卡，再按 [ ▶ 编译 ]',
      sDotK: '例题：dp4a(a, b, acc) 的结果', sDotF: '<b>= 100 + 3×4 + (−2)×7 + 5×(−1) + 1×2</b><br>a = [3, −2, 5, 1]，b = [4, 7, −1, 2]，acc = 100',
      sDotSame: (n) => `<br>本目标的分支算出 ${n}，和参考值逐位相同`,
      sBranchK: 'dp4a 落到哪个分支', sBranchF: (file) => `由 <b>${file}</b> 里的 #if 链决定`,
      sFlagK: '这次配置用的开关', sTierK: 'CMake 对这个架构的态度',
      branch: {
        'cuda-hw': '硬件 __dp4a 指令', 'cuda-sw': '软件循环 strata_dp4a', 'hip-sudot4': 'v_dot4_i32_iu8（sudot4）',
        'hip-sdot4': 'v_dot4_i32_i8（sdot4）', 'hip-sdwa': 'RDNA1 的 SDWA 汇编（v_mul_i32_i24 + v_add3_u32）', 'hip-loop': '可移植的逐字节循环',
      },
      tier: {
        ok: '正常构建', experimental: '实验构建：维护者没有这类卡，只验证了能编译', validated: '维护者在真卡上验证过', community: '用户在真卡上验证过',
        unvalidated: '能编译，但给出警告：还没在真卡上验证', refused: '直接报错，拒绝配置',
      },
      try: [
        '选 <b>RTX 50</b>，再选 <b>RX 7900</b>，各按一次编译：第 1 行从 <code>cudaMalloc</code> 变成 <code>hipMalloc</code>，源码一个字没改。',
        '选 <b>RX 6900</b>：同样一行 dp4a，换成了 RDNA2 的老指令 sdot4。可例题结果仍是 95，整数运算换条路也逐位相同。',
        '选 <b>名单外的架构</b>：流程停在第 1 步。CMake 宁可拒绝，也不编出一个“能跑但没人验证过”的引擎。',
      ],
      l0ok: (flags) => `<span class="c">[cmake]</span> ${flags}：架构在名单里，继续`,
      l0warn: (arch) => `<span class="y">[cmake] 警告</span>：${arch} 能编译，但还没有人在真卡上验证过，请回报结果`,
      l0exp: '<span class="y">[cmake]</span> 打开了 STRATA_EXPERIMENTAL_SM60：低于 7.5 的老卡只走实验构建（v0.1.39 起 setup 另备一个 CUDA 12 引擎给这类卡）',
      l0no: (arch) => `<span class="m">[cmake] FATAL_ERROR</span>：${arch} 不在支持名单里，配置到此为止，什么也不编译`,
      l1cuda: '<span class="c">[include]</span> CUDA 构建直接用 NVIDIA 自己的头文件，不需要垫片',
      l1hip: '<span class="c">[include]</span> 编译器参数 <code>-include hip_compat/cuda_runtime.h</code>：每个源文件开头都被塞进这份“改名表”',
      l2cuda: '<span class="c">[cpp]</span> cudaMalloc、__shfl_xor_sync 都是 CUDA 的原生名字，原样保留',
      l2hip: '<span class="c">[cpp]</span> 宏替换：cudaMalloc → hipMalloc；__shfl_xor_sync → hip_compat 里的包装函数（先检查 32 条通道全部参与）',
      l3: (name, file) => `<span class="c">[cpp]</span> #if 链（${file}）只留下一个分支：<span class="w">${name}</span>，其他分支被删掉，编译器根本看不见`,
      l4cuda: (sm) => `<span class="c">[nvcc]</span> 生成 sm_${sm} 的机器码`,
      l4hip: (arch) => `<span class="c">[clang/HIP]</span> 生成 ${arch} 的机器码（.cu 文件被当作 HIP 语言编译）`,
      l5cuda: '<span class="c">[run]</span> 启动：驱动按显卡的计算能力加载对应机器码',
      l5hip: (arch) => `<span class="c">[run]</span> 启动检查：显卡架构必须是 ${arch}，而且一组线程必须是 32 个（wave32），否则直接报错退出`,
      done: (v) => `<span class="y">完成</span>：同一份源码，换了一套机器码。例题 dp4a = ${v}`,
      vOk: (name, v) => `① 源码一行没改，预处理器把名字换成了目标平台的说法，并为 dp4a 留下了“${name}”这一个分支。<br>② 例题结果是 <b>${v}</b>。dp4a 是整数运算，每条分支都逐位相同。<br>③ 浮点运算就没这么省心：上游文档明说，不承诺 CUDA 和 HIP 两个后端的回答逐位相同。`,
      vNo: '① CMake 在第一步就拒绝了：这个架构不在名单里。<br>② 拒绝比“编出来再说”更好：一个没人验证过的二进制，可能跑起来算错，却不报任何错。<br>③ gfx906 是 wave64，HIP 后端只收 wave32。v0.1.39 起它另有一个手动打开的实验构建（STRATA_HIP_GFX906），走另一套兼容层，不经过这份名单。',

      cCode: 'CPU_DISPATCH', cTitle: 'CPU 内核选择器', cTag: '代码事实 · 逻辑复刻',
      cIntro: 'CPU 没命中的专家，由 CPU 自己算。用哪套内核，引擎在<b>运行时</b>先问 CPU“你会哪些指令”，再决定。改下面的条件，看判断链走到哪一步。',
      cLgCheck: '检查过的条件', cLgPass: '最后选中的内核', cLgStop: '拒绝启动',
      cSteps: ['查 AVX2', '看模型包', '查 AVX-512', '数 token', '选内核'],
      cpuLabel: 'CPU', cpus: ['例：Ryzen 5 7600（Zen 4），有完整 AVX-512', '例：Zen 2/3、Intel 12–14 代酷睿：只有 AVX2', '2013 年 Haswell 以前的老 CPU：没有 AVX2'],
      packLabel: '模型包', packs: { q2_0: '标准 Q2_0 包', iq3_s: 'IQ3_S（原生格式）', iq4_xs: 'IQ4_XS（原生格式）' },
      ntLabel: '一组同时算几个 token', env512: 'STRATA_NO_IQ512（不用 AVX-512 内核）', env256: 'STRATA_NO_IQ256（不用 AVX2 内核）',
      sWideK: '一条向量指令能同时处理', sWideF: (bits, n) => `<b>= ${bits} 位 ÷ 8 位 = ${n} 个 int8</b><br>寄存器越宽，一条指令干的活越多`,
      int8s: (n) => `${n} 个 int8`, loopCode: '/* 4 次字节乘加 */',
      sWideNone: '—', sWideNoneF: '没有 AVX2：引擎不启动',
      sPathK: '选中的内核',
      paths: {
        'refuse-avx2': '拒绝启动', 'refuse-avx512': '拒绝启动', 'strata-vnni': 'Strata 自己的 AVX-512 内核',
        iq512: 'iq512：AVX-512 多 token 内核', iq256: 'iq256：AVX2 多 token 内核', ggml: 'ggml-cpu 的单 token 点积',
      },
      pathF: {
        'refuse-avx2': '现成引擎的 CPU 专家内核最低都要 AVX2、FMA、F16C', 'refuse-avx512': '标准 Q2_0 包的 CPU 内核只有 AVX-512 版本',
        'strata-vnni': '用到 AVX-512 的 VNNI 和 VBMI 两组指令', iq512: '权重解码一次，这组 token 共用', iq256: '同样的思路，换成 256 位寄存器',
        ggml: '每个 token 各自解码一遍权重',
      },
      c1: (ok) => ok ? '<span class="c">[1]</span> CPUID 说：支持 AVX2（含 FMA、F16C）' : '<span class="m">[1]</span> CPUID 说：没有 AVX2。现成的引擎报出 CPU 型号，提示需要 Haswell（2013）、Zen（2017）或更新的 CPU，退出',
      c2: (p) => `<span class="c">[2]</span> 模型包：${p}`,
      c3: (ok, env) => ok ? `<span class="c">[3]</span> CPUID 说：AVX-512 的 F、BW、VL、VNNI、VBMI 都有，操作系统也会保存这组寄存器${env ? '；但环境变量要求不用 AVX-512 内核' : ''}` : '<span class="c">[3]</span> CPUID 说：没有完整的 AVX-512',
      c3q2: (ok) => ok ? '<span class="c">[3]</span> 标准 Q2_0 包需要 AVX-512：这台 CPU 有，放行' : '<span class="m">[3]</span> 标准 Q2_0 包的 CPU 内核只有 AVX-512 版本：在启动时就报错退出，而不是算到第几千个 token 时撞上非法指令',
      c4: (nt) => nt >= M.MT_MIN ? `<span class="c">[4]</span> 这组有 ${nt} 个 token，达到多 token 内核的门槛 ${M.MT_MIN}` : `<span class="c">[4]</span> 这组只有 1 个 token，没到门槛 ${M.MT_MIN}：多 token 内核没有优势`,
      c5: (name) => `<span class="y">[5] 选中</span>：<span class="w">${name}</span>`,
      c5iq4: '<span class="y">注意</span>：IQ4_XS 只有 AVX2 版多 token 内核。AVX-512 的 CPU 不借用它，因为舍入方式会变，于是退回 ggml-cpu',
      cVerdict: {
        'refuse-avx2': '这台 CPU 太老，现成引擎的专家内核都跑不了。引擎在第 0 秒说清原因并退出。v0.1.39 起，setup 可以在这台电脑上现场编一个实验版引擎（STRATA_ISA_FLOOR），专家改走 ggml-cpu：能跑，但很慢。',
        'refuse-avx512': '标准 Q2_0 包只有 AVX-512 内核。没有 AVX-512 就在启动时拒绝，换原生格式的包才能在 AVX2 CPU 上跑。',
        'strata-vnni': '标准 Q2_0 包走 Strata 自己写的 AVX-512 内核。',
        iq512: '同一份程序，这台 CPU 走最宽的 512 位路线：权重解码一次，整组 token 共用。',
        iq256: '同一份程序，这台 CPU 走 256 位路线。二进制文件没变，变的是运行时的选择。',
        ggml: '退回 ggml-cpu 的单 token 点积：最通用，但每个 token 都要重新解码一遍权重。',
      },
      cTry: [
        'CPU 选 <b>Zen 4</b>，包选 <b>IQ3_S</b>，再勾上 <b>STRATA_NO_IQ512</b>：同一台机器改走 AVX2 内核。环境变量也是实验条件。',
        '把 token 数拉到 <b>1</b>：多 token 内核让位给 ggml。上游注释说，这会让同一个 token 单独算和成组算的舍入不同。',
        'CPU 选 <b>Zen 2/3</b>，包选 <b>标准 Q2_0</b>：启动即拒绝。再换成 IQ3_S：能跑。决定能不能跑的，是“CPU × 模型包”这对组合。',
      ],
    },
    en: {
      code: 'BUILD_SPLIT', title: 'One source, two backends', tag: 'Code fact · simplified sketch',
      intro: 'On the left are three lines of CUDA-style source. Pick a target card and press <b>Compile</b> to see what these three lines become after preprocessing: which names get swapped, and which <code>#if</code> branch is kept.',
      lgSame: 'Source kept as is', lgSwap: 'Name swapped by the shim', lgPick: 'Branch chosen by #if',
      steps: ['CMake configure', 'Force-include shim', 'Preprocess: rename', 'Preprocess: pick branch', 'Compile to machine code', 'Startup check'],
      targetsLabel: 'Target card',
      targets: ['NVIDIA RTX 50 · sm_120', 'Old NVIDIA card · sm_60 (experimental switch)', 'AMD RX 7900 · gfx1100', 'AMD RX 6900 · gfx1030', 'AMD architecture not on the list · gfx906'],
      srcHead: 'Source (written once)', outHead: (n) => `After preprocessing (${n})`, outEmpty: 'Shown after you press [ Compile ]',
      bGo: '▶ Compile', bReset: 'Reset',
      ready: '<span class="c">$</span> ready. Pick a target card, then press [ ▶ Compile ]',
      sDotK: 'Worked example: result of dp4a(a, b, acc)', sDotF: '<b>= 100 + 3×4 + (−2)×7 + 5×(−1) + 1×2</b><br>a = [3, −2, 5, 1], b = [4, 7, −1, 2], acc = 100',
      sDotSame: (n) => `<br>this target's branch computes ${n}, bit-identical to the reference`,
      sBranchK: 'Which branch dp4a lands in', sBranchF: (file) => `decided by the #if chain in <b>${file}</b>`,
      sFlagK: 'Switches used in this configure', sTierK: 'How CMake treats this architecture',
      branch: {
        'cuda-hw': 'hardware __dp4a instruction', 'cuda-sw': 'software loop strata_dp4a', 'hip-sudot4': 'v_dot4_i32_iu8 (sudot4)',
        'hip-sdot4': 'v_dot4_i32_i8 (sdot4)', 'hip-sdwa': 'RDNA1 SDWA assembly (v_mul_i32_i24 + v_add3_u32)', 'hip-loop': 'portable byte-by-byte loop',
      },
      tier: {
        ok: 'normal build', experimental: 'experimental build: the maintainer has no such card and only checked that it compiles', validated: 'verified on real cards by the maintainer', community: 'verified on real cards by users',
        unvalidated: 'compiles, but warns: not yet verified on a real card', refused: 'error: configure refused',
      },
      try: [
        'Pick <b>RTX 50</b>, then <b>RX 7900</b>, and compile each once: line 1 turns from <code>cudaMalloc</code> into <code>hipMalloc</code>, yet not a character of source changed.',
        'Pick <b>RX 6900</b>: the same dp4a line now uses RDNA2\'s older sdot4 instruction. The worked result is still 95: integer math stays bit-identical down a different path.',
        'Pick <b>not on the list</b>: the flow stops at step 1. CMake would rather refuse than build an engine that "runs but nobody has verified".',
      ],
      l0ok: (flags) => `<span class="c">[cmake]</span> ${flags}: architecture is on the list, continue`,
      l0warn: (arch) => `<span class="y">[cmake] warning</span>: ${arch} compiles, but nobody has verified it on a real card yet; please report your results`,
      l0exp: '<span class="y">[cmake]</span> STRATA_EXPERIMENTAL_SM60 is on: old cards below 7.5 only get an experimental build (since v0.1.39, setup also prepares a separate CUDA 12 engine for them)',
      l0no: (arch) => `<span class="m">[cmake] FATAL_ERROR</span>: ${arch} is not on the supported list; configure stops here and nothing is compiled`,
      l1cuda: '<span class="c">[include]</span> a CUDA build uses NVIDIA\'s own headers directly; no shim needed',
      l1hip: '<span class="c">[include]</span> compiler flag <code>-include hip_compat/cuda_runtime.h</code>: this "renaming table" is pushed onto the top of every source file',
      l2cuda: '<span class="c">[cpp]</span> cudaMalloc and __shfl_xor_sync are native CUDA names, kept as is',
      l2hip: '<span class="c">[cpp]</span> macro replacement: cudaMalloc → hipMalloc; __shfl_xor_sync → a wrapper in hip_compat (which first checks that all 32 lanes take part)',
      l3: (name, file) => `<span class="c">[cpp]</span> the #if chain (${file}) keeps only one branch: <span class="w">${name}</span>; the other branches are deleted and the compiler never sees them`,
      l4cuda: (sm) => `<span class="c">[nvcc]</span> generates machine code for sm_${sm}`,
      l4hip: (arch) => `<span class="c">[clang/HIP]</span> generates machine code for ${arch} (the .cu files are compiled as HIP)`,
      l5cuda: '<span class="c">[run]</span> startup: the driver loads the machine code matching the card\'s compute capability',
      l5hip: (arch) => `<span class="c">[run]</span> startup check: the card's architecture must be ${arch} and a thread group must be 32 wide (wave32), or it exits with an error`,
      done: (v) => `<span class="y">Done</span>: same source, a different set of machine code. Worked dp4a = ${v}`,
      vOk: (name, v) => `① Not a line of source changed; the preprocessor swapped the names for the target platform's terms and kept just one branch for dp4a: "${name}".<br>② The worked result is <b>${v}</b>. dp4a is integer math, so every branch is bit-identical.<br>③ Floating point is not so easy: the upstream docs say plainly that the CUDA and HIP backends are not promised to give bit-identical answers.`,
      vNo: '① CMake refused at the very first step: this architecture is not on the list.<br>② Refusing beats "build it and see": a binary nobody has verified may run, compute wrong answers, and report no error at all.<br>③ gfx906 is wave64, and the HIP backend accepts only wave32. Since v0.1.39 it has a separate experimental build that you switch on by hand (STRATA_HIP_GFX906). It uses a different compatibility layer and does not go through this list.',

      cCode: 'CPU_DISPATCH', cTitle: 'CPU kernel selector', cTag: 'Code fact · logic reproduced',
      cIntro: 'Experts the GPU misses are computed by the CPU itself. Which kernel set to use is decided at <b>run time</b>: the engine first asks the CPU "which instructions do you know?" and then chooses. Change the conditions below and see how far the decision chain goes.',
      cLgCheck: 'Condition checked', cLgPass: 'Kernel finally chosen', cLgStop: 'Refuses to start',
      cSteps: ['Check AVX2', 'Look at pack', 'Check AVX-512', 'Count tokens', 'Pick kernel'],
      cpuLabel: 'CPU', cpus: ['e.g. Ryzen 5 7600 (Zen 4), full AVX-512', 'e.g. Zen 2/3, Intel Core 12th–14th gen: AVX2 only', 'Old CPUs before 2013 Haswell: no AVX2'],
      packLabel: 'Model pack', packs: { q2_0: 'Standard Q2_0 pack', iq3_s: 'IQ3_S (native format)', iq4_xs: 'IQ4_XS (native format)' },
      ntLabel: 'Tokens computed together in a group', env512: 'STRATA_NO_IQ512 (no AVX-512 kernel)', env256: 'STRATA_NO_IQ256 (no AVX2 kernel)',
      sWideK: 'One vector instruction processes at once', sWideF: (bits, n) => `<b>= ${bits} bits ÷ 8 bits = ${n} int8</b><br>the wider the register, the more work per instruction`,
      int8s: (n) => `${n} int8`, loopCode: '/* 4 byte multiply-adds */',
      sWideNone: '—', sWideNoneF: 'No AVX2: the engine does not start',
      sPathK: 'Kernel chosen',
      paths: {
        'refuse-avx2': 'Refuses to start', 'refuse-avx512': 'Refuses to start', 'strata-vnni': 'Strata\'s own AVX-512 kernel',
        iq512: 'iq512: AVX-512 multi-token kernel', iq256: 'iq256: AVX2 multi-token kernel', ggml: 'ggml-cpu single-token dot product',
      },
      pathF: {
        'refuse-avx2': 'every CPU expert kernel in the prebuilt engine needs at least AVX2, FMA and F16C', 'refuse-avx512': 'the standard Q2_0 pack\'s CPU kernel exists only in an AVX-512 version',
        'strata-vnni': 'uses the AVX-512 VNNI and VBMI instruction groups', iq512: 'weights are decoded once and shared by the group of tokens', iq256: 'the same idea with 256-bit registers',
        ggml: 'each token decodes the weights on its own',
      },
      c1: (ok) => ok ? '<span class="c">[1]</span> CPUID says: AVX2 supported (with FMA, F16C)' : '<span class="m">[1]</span> CPUID says: no AVX2. The prebuilt engine reports the CPU model, says it needs a Haswell (2013), Zen (2017) or newer CPU, and exits',
      c2: (p) => `<span class="c">[2]</span> Model pack: ${p}`,
      c3: (ok, env) => ok ? `<span class="c">[3]</span> CPUID says: AVX-512 F, BW, VL, VNNI and VBMI are all present, and the OS saves these registers${env ? '; but an environment variable says not to use the AVX-512 kernel' : ''}` : '<span class="c">[3]</span> CPUID says: no complete AVX-512',
      c3q2: (ok) => ok ? '<span class="c">[3]</span> The standard Q2_0 pack needs AVX-512: this CPU has it, go ahead' : '<span class="m">[3]</span> The standard Q2_0 pack\'s CPU kernel exists only for AVX-512: it errors out at startup, instead of hitting an illegal instruction a few thousand tokens in',
      c4: (nt) => nt >= M.MT_MIN ? `<span class="c">[4]</span> this group has ${nt} tokens, reaching the multi-token kernel threshold of ${M.MT_MIN}` : `<span class="c">[4]</span> this group has only 1 token, below the threshold of ${M.MT_MIN}: the multi-token kernel has no advantage`,
      c5: (name) => `<span class="y">[5] Chosen</span>: <span class="w">${name}</span>`,
      c5iq4: '<span class="y">Note</span>: IQ4_XS has only an AVX2 multi-token kernel. AVX-512 CPUs do not borrow it, because the rounding would change, so they fall back to ggml-cpu',
      cVerdict: {
        'refuse-avx2': 'This CPU is too old: none of the prebuilt engine\'s expert kernels can run. The engine explains why at second 0 and exits. Since v0.1.39, setup can build an experimental engine on this machine (STRATA_ISA_FLOOR), and the experts then go through ggml-cpu: it runs, but very slowly.',
        'refuse-avx512': 'The standard Q2_0 pack has only an AVX-512 kernel. Without AVX-512 it refuses at startup; switch to a native-format pack to run on an AVX2 CPU.',
        'strata-vnni': 'The standard Q2_0 pack uses the AVX-512 kernel Strata wrote itself.',
        iq512: 'Same program; this CPU takes the widest, 512-bit route: weights are decoded once and shared by the whole group of tokens.',
        iq256: 'Same program; this CPU takes the 256-bit route. The binary did not change; the run-time choice did.',
        ggml: 'Falls back to ggml-cpu\'s single-token dot product: the most general, but every token decodes the weights again.',
      },
      cTry: [
        'Pick the <b>Zen 4</b> CPU and the <b>IQ3_S</b> pack, then tick <b>STRATA_NO_IQ512</b>: the same machine now takes the AVX2 kernel. Environment variables are experimental conditions too.',
        'Drag the token count to <b>1</b>: the multi-token kernel gives way to ggml. The upstream comments say this makes the same token round differently when computed alone versus in a group.',
        'Pick the <b>Zen 2/3</b> CPU and the <b>standard Q2_0</b> pack: refused at startup. Switch to IQ3_S: it runs. What decides whether it runs is the pair "CPU × model pack".',
      ],
    },
    ar: {
      code: 'BUILD_SPLIT', title: 'شيفرة واحدة، وخلفيتان', tag: 'حقيقة من الشيفرة · رسم مبسّط',
      intro: 'أمامك ثلاثة أسطر من شيفرة بأسلوب CUDA. اختر بطاقة مستهدفة واضغط <b>ترجمة</b>، لترى ماذا تصير هذه الأسطر الثلاثة بعد المعالجة المسبقة: أي الأسماء تُستبدل، وأي فروع <code>#if</code> يبقى.',
      lgSame: 'شيفرة تبقى كما هي', lgSwap: 'اسم استبدلته الطبقة الوسيطة', lgPick: 'فرع اختاره #if',
      steps: ['إعداد CMake', 'فرض الطبقة الوسيطة', 'المعالجة المسبقة: التسمية', 'المعالجة المسبقة: اختيار الفرع', 'الترجمة إلى شيفرة الآلة', 'فحص الإقلاع'],
      targetsLabel: 'البطاقة المستهدفة',
      targets: ['NVIDIA RTX 50 · sm_120', 'بطاقة NVIDIA قديمة · sm_60 (مفتاح تجريبي)', 'AMD RX 7900 · gfx1100', 'AMD RX 6900 · gfx1030', 'معمارية AMD خارج القائمة · gfx906'],
      srcHead: 'الشيفرة المصدرية (تُكتب مرة واحدة)', outHead: (n) => `بعد المعالجة المسبقة (${n})`, outEmpty: 'تظهر بعد الضغط على [ ترجمة ]',
      bGo: '▶ ترجمة', bReset: 'إعادة',
      ready: '<span class="c">$</span> ready. اختر بطاقة مستهدفة، ثم اضغط [ ▶ ترجمة ]',
      sDotK: 'مثال: ناتج dp4a(a, b, acc)', sDotF: '<b>= 100 + 3×4 + (−2)×7 + 5×(−1) + 1×2</b><br>a = [3, −2, 5, 1], b = [4, 7, −1, 2], acc = 100',
      sDotSame: (n) => `<br>فرع هذا الهدف يحسب ${n}، مطابقًا للقيمة المرجعية بتًّا ببت`,
      sBranchK: 'في أي فرع يقع dp4a', sBranchF: (file) => `تحدده سلسلة #if في <b>${file}</b>`,
      sFlagK: 'المفاتيح المستخدمة في هذا الإعداد', sTierK: 'كيف يعامل CMake هذه المعمارية',
      branch: {
        'cuda-hw': 'تعليمة __dp4a العتادية', 'cuda-sw': 'حلقة برمجية strata_dp4a', 'hip-sudot4': 'v_dot4_i32_iu8 (sudot4)',
        'hip-sdot4': 'v_dot4_i32_i8 (sdot4)', 'hip-sdwa': 'تجميع SDWA في RDNA1 (v_mul_i32_i24 + v_add3_u32)', 'hip-loop': 'حلقة قابلة للنقل بايتًا بايتًا',
      },
      tier: {
        ok: 'بناء عادي', experimental: 'بناء تجريبي: لا يملك المشرف هذه البطاقة، وتحقق فقط من أنها تُترجَم', validated: 'تحقق منها المشرف على بطاقات حقيقية', community: 'تحقق منها مستخدمون على بطاقات حقيقية',
        unvalidated: 'تُترجَم، لكن مع تحذير: لم يُتحقَّق منها بعد على بطاقة حقيقية', refused: 'خطأ: يُرفَض الإعداد',
      },
      try: [
        'اختر <b>RTX 50</b>، ثم <b>RX 7900</b>، وترجم كل واحدة مرة: السطر 1 يتحول من <code>cudaMalloc</code> إلى <code>hipMalloc</code>، ولم يتغير حرف من الشيفرة المصدرية.',
        'اختر <b>RX 6900</b>: سطر dp4a نفسه صار تعليمة sdot4 الأقدم في RDNA2. لكن ناتج المثال ما زال 95: الأعداد الصحيحة تتطابق بتًّا ببت ولو سلكت طريقًا آخر.',
        'اختر <b>معمارية خارج القائمة</b>: تتوقف العملية عند الخطوة 1. يفضّل CMake أن يرفض على أن يبني محركًا «يعمل لكن لم يتحقق منه أحد».',
      ],
      l0ok: (flags) => `<span class="c">[cmake]</span> ${flags}: المعمارية في القائمة، نواصل`,
      l0warn: (arch) => `<span class="y">[cmake] تحذير</span>: ${arch} تُترجَم، لكن لم يتحقق منها أحد بعد على بطاقة حقيقية؛ يُرجى الإبلاغ بالنتيجة`,
      l0exp: '<span class="y">[cmake]</span> شُغّل STRATA_EXPERIMENTAL_SM60: البطاقات القديمة دون 7.5 تأخذ بناءً تجريبيًّا فقط (ومنذ v0.1.39 يجهّز setup أيضًا محرك CUDA 12 لها)',
      l0no: (arch) => `<span class="m">[cmake] FATAL_ERROR</span>: ${arch} ليست في قائمة المدعوم؛ يتوقف الإعداد هنا ولا يُترجَم شيء`,
      l1cuda: '<span class="c">[include]</span> بناء CUDA يستخدم ترويسات NVIDIA نفسها مباشرة، ولا حاجة إلى طبقة وسيطة',
      l1hip: '<span class="c">[include]</span> معامل المترجم <code>-include hip_compat/cuda_runtime.h</code>: يُفرَض «جدول التسمية» هذا في رأس كل ملف مصدري',
      l2cuda: '<span class="c">[cpp]</span> cudaMalloc و__shfl_xor_sync أسماء CUDA الأصلية، وتبقى كما هي',
      l2hip: '<span class="c">[cpp]</span> استبدال الماكرو: cudaMalloc → hipMalloc؛ __shfl_xor_sync → دالة تغليف في hip_compat (تتحقق أولًا من مشاركة المسارات الـ 32 كلها)',
      l3: (name, file) => `<span class="c">[cpp]</span> سلسلة #if (${file}) تُبقي فرعًا واحدًا فقط: <span class="w">${name}</span>، وتُحذف بقية الفروع فلا يراها المترجم أصلًا`,
      l4cuda: (sm) => `<span class="c">[nvcc]</span> يولّد شيفرة آلة لـ sm_${sm}`,
      l4hip: (arch) => `<span class="c">[clang/HIP]</span> يولّد شيفرة آلة لـ ${arch} (تُترجَم ملفات .cu على أنها HIP)`,
      l5cuda: '<span class="c">[run]</span> الإقلاع: يحمّل برنامج التشغيل شيفرة الآلة المطابقة لقدرة الحوسبة في البطاقة',
      l5hip: (arch) => `<span class="c">[run]</span> فحص الإقلاع: يجب أن تكون معمارية البطاقة ${arch}، وأن تكون مجموعة الخيوط 32 (wave32)، وإلا يخرج بخطأ`,
      done: (v) => `<span class="y">تم</span>: شيفرة مصدرية واحدة، ومجموعة شيفرة آلة مختلفة. المثال dp4a = ${v}`,
      vOk: (name, v) => `① لم يتغير سطر من الشيفرة المصدرية؛ استبدل المعالج المسبق الأسماء بلغة المنصة المستهدفة، وأبقى لـ dp4a فرعًا واحدًا هو «${name}».<br>② ناتج المثال <b>${v}</b>. dp4a عملية على أعداد صحيحة، فتتطابق كل الفروع بتًّا ببت.<br>③ الأعداد العشرية ليست بهذه السهولة: تقول الوثائق الأصلية صراحة إنه لا وعد بأن تعطي الخلفيتان CUDA وHIP إجابات متطابقة بتًّا ببت.`,
      vNo: '① رفض CMake عند الخطوة الأولى: هذه المعمارية ليست في القائمة.<br>② الرفض أفضل من «نبني ثم نرى»: ملف ثنائي لم يتحقق منه أحد قد يعمل ويحسب نتائج خاطئة دون أي رسالة خطأ.<br>③ gfx906 من نوع wave64، والخلفية HIP لا تقبل إلا wave32. ومنذ v0.1.39 لها بناء تجريبي مستقل تشغّله بيدك (STRATA_HIP_GFX906)، ويستخدم طبقة توافق أخرى ولا يمر بهذه القائمة.',

      cCode: 'CPU_DISPATCH', cTitle: 'منتقي نواة CPU', cTag: 'حقيقة من الشيفرة · إعادة إنتاج المنطق',
      cIntro: 'الخبراء الذين لا تجدهم GPU يحسبهم CPU بنفسه. وأي مجموعة نوى يستخدم، يقرره المحرك <b>وقت التشغيل</b>: يسأل CPU أولًا «ما التعليمات التي تعرفها؟» ثم يختار. غيّر الشروط أدناه وانظر إلى أي خطوة تصل سلسلة القرار.',
      cLgCheck: 'شرط جرى فحصه', cLgPass: 'النواة التي اختيرت أخيرًا', cLgStop: 'يرفض الإقلاع',
      cSteps: ['فحص AVX2', 'النظر في الحزمة', 'فحص AVX-512', 'عدّ الرموز', 'اختيار النواة'],
      cpuLabel: 'المعالج',
      cpus: ['مثال: Ryzen 5 7600 (Zen 4)، فيه AVX-512 كامل', 'مثال: Zen 2/3 وجيل Intel Core 12-14: AVX2 فقط', 'معالجات قديمة قبل Haswell عام 2013: بلا AVX2'],
      packLabel: 'حزمة النموذج', packs: { q2_0: 'حزمة Q2_0 القياسية', iq3_s: 'IQ3_S (صيغة أصلية)', iq4_xs: 'IQ4_XS (صيغة أصلية)' },
      ntLabel: 'كم رمزًا يُحسب معًا في المجموعة', env512: 'STRATA_NO_IQ512 (بلا نواة AVX-512)', env256: 'STRATA_NO_IQ256 (بلا نواة AVX2)',
      sWideK: 'تعليمة متجهية واحدة تعالج في وقت واحد', sWideF: (bits, n) => `<b>= ${bits} بتًّا ÷ 8 بتات = ${n} عددًا int8</b><br>كلما اتسع السجل زاد عمل التعليمة الواحدة`,
      int8s: (n) => `${n} عددًا int8`, loopCode: '/* 4 عمليات ضرب وجمع بايتات */',
      sWideNone: '—', sWideNoneF: 'بلا AVX2: لا يقلع المحرك',
      sPathK: 'النواة المختارة',
      paths: {
        'refuse-avx2': 'يرفض الإقلاع', 'refuse-avx512': 'يرفض الإقلاع', 'strata-vnni': 'نواة AVX-512 التي كتبتها Strata',
        iq512: 'iq512: نواة AVX-512 متعددة الرموز', iq256: 'iq256: نواة AVX2 متعددة الرموز', ggml: 'ضرب نقطي برمز واحد في ggml-cpu',
      },
      pathF: {
        'refuse-avx2': 'كل نوى خبراء CPU في المحرك الجاهز تحتاج على الأقل AVX2 وFMA وF16C', 'refuse-avx512': 'نواة CPU لحزمة Q2_0 القياسية لا توجد إلا بنسخة AVX-512',
        'strata-vnni': 'تستخدم مجموعتي تعليمات VNNI وVBMI من AVX-512', iq512: 'تُفك ترميز الأوزان مرة واحدة وتشترك فيها مجموعة الرموز', iq256: 'الفكرة نفسها بسجلات من 256 بتًّا',
        ggml: 'كل رمز يفك ترميز الأوزان وحده',
      },
      c1: (ok) => ok ? '<span class="c">[1]</span> تقول CPUID: AVX2 مدعوم (مع FMA وF16C)' : '<span class="m">[1]</span> تقول CPUID: لا يوجد AVX2. يذكر المحرك الجاهز طراز CPU، ويقول إنه يحتاج Haswell (2013) أو Zen (2017) أو أحدث، ثم يخرج',
      c2: (p) => `<span class="c">[2]</span> حزمة النموذج: ${p}`,
      c3: (ok, env) => ok ? `<span class="c">[3]</span> تقول CPUID: AVX-512 بميزاته F وBW وVL وVNNI وVBMI كلها موجودة، ونظام التشغيل يحفظ هذه السجلات${env ? '؛ لكن متغير بيئة يطلب ألا تُستخدم نواة AVX-512' : ''}` : '<span class="c">[3]</span> تقول CPUID: لا يوجد AVX-512 كامل',
      c3q2: (ok) => ok ? '<span class="c">[3]</span> حزمة Q2_0 القياسية تحتاج AVX-512: هذا المعالج يملكه، فنمضي' : '<span class="m">[3]</span> نواة CPU لحزمة Q2_0 القياسية لا توجد إلا بنسخة AVX-512: يخرج بخطأ عند الإقلاع، بدل أن يصطدم بتعليمة غير مشروعة بعد آلاف الرموز',
      c4: (nt) => nt >= M.MT_MIN ? `<span class="c">[4]</span> في هذه المجموعة ${nt} من الرموز، فتبلغ عتبة النواة متعددة الرموز ${M.MT_MIN}` : `<span class="c">[4]</span> في هذه المجموعة رمز واحد فقط، دون العتبة ${M.MT_MIN}: لا ميزة للنواة متعددة الرموز`,
      c5: (name) => `<span class="y">[5] اختيرت</span>: <span class="w">${name}</span>`,
      c5iq4: '<span class="y">تنبيه</span>: IQ4_XS ليس له إلا نواة AVX2 متعددة الرموز. ولا تستعيرها معالجات AVX-512 لأن طريقة التقريب ستتغير، فتعود إلى ggml-cpu',
      cVerdict: {
        'refuse-avx2': 'هذا المعالج قديم جدًّا: لا تعمل عليه أي نواة خبراء من المحرك الجاهز. يشرح المحرك السبب في الثانية 0 ثم يخرج. ومنذ v0.1.39 يمكن لـ setup أن يبني على هذا الجهاز محركًا تجريبيًّا (STRATA_ISA_FLOOR)، ويذهب الخبراء حينئذ إلى ggml-cpu: يعمل، لكن ببطء شديد.',
        'refuse-avx512': 'حزمة Q2_0 القياسية ليس لها إلا نواة AVX-512. وبلا AVX-512 يُرفَض الإقلاع؛ وبحزمة بصيغة أصلية يمكن التشغيل على معالج AVX2.',
        'strata-vnni': 'تستخدم حزمة Q2_0 القياسية نواة AVX-512 التي كتبتها Strata بنفسها.',
        iq512: 'البرنامج نفسه، وهذا المعالج يأخذ الطريق الأعرض بسجلات 512 بتًّا: تُفك الأوزان مرة واحدة وتشترك فيها مجموعة الرموز كلها.',
        iq256: 'البرنامج نفسه، وهذا المعالج يأخذ طريق 256 بتًّا. لم يتغير الملف الثنائي، وإنما تغير الاختيار وقت التشغيل.',
        ggml: 'يعود إلى الضرب النقطي برمز واحد في ggml-cpu: الأعم، لكن كل رمز يفك ترميز الأوزان من جديد.',
      },
      cTry: [
        'اختر معالج <b>Zen 4</b> وحزمة <b>IQ3_S</b>، ثم فعّل <b>STRATA_NO_IQ512</b>: الجهاز نفسه صار يأخذ نواة AVX2. ومتغيرات البيئة شروط تجريبية أيضًا.',
        'اسحب عدد الرموز إلى <b>1</b>: تتنحى النواة متعددة الرموز لصالح ggml. وتقول تعليقات المصدر الأصلي إن هذا يجعل الرمز نفسه يُقرَّب بطريقة مختلفة إذا حُسب وحده أو ضمن مجموعة.',
        'اختر معالج <b>Zen 2/3</b> وحزمة <b>Q2_0 القياسية</b>: يُرفَض الإقلاع. ثم بدّلها بـ IQ3_S: تعمل. وما يقرر قدرتها على العمل هو الزوج «المعالج × حزمة النموذج».',
      ],
    },
    es: {
      code: 'BUILD_SPLIT', title: 'Un código fuente, dos backends', tag: 'Hecho de código · esquema simplificado',
      intro: 'A la izquierda hay tres líneas de código fuente al estilo CUDA. Elige una tarjeta de destino y pulsa <b>Compilar</b> para ver en qué se convierten esas tres líneas tras el preprocesado: qué nombres se cambian y qué rama de <code>#if</code> se conserva.',
      lgSame: 'Código fuente que se conserva', lgSwap: 'Nombre cambiado por el shim', lgPick: 'Rama elegida por #if',
      steps: ['Configurar CMake', 'Incluir el shim a la fuerza', 'Preprocesado: cambiar nombres', 'Preprocesado: elegir rama', 'Compilar a código máquina', 'Comprobación al arrancar'],
      targetsLabel: 'Tarjeta de destino',
      targets: ['NVIDIA RTX 50 · sm_120', 'NVIDIA antigua · sm_60 (interruptor experimental)', 'AMD RX 7900 · gfx1100', 'AMD RX 6900 · gfx1030', 'Arquitectura AMD fuera de la lista · gfx906'],
      srcHead: 'Código fuente (se escribe una vez)', outHead: (n) => `Tras el preprocesado (${n})`, outEmpty: 'Se muestra al pulsar [ Compilar ]',
      bGo: '▶ Compilar', bReset: 'Reiniciar',
      ready: '<span class="c">$</span> ready. Elige una tarjeta de destino y pulsa [ ▶ Compilar ]',
      sDotK: 'Ejemplo: resultado de dp4a(a, b, acc)', sDotF: '<b>= 100 + 3×4 + (−2)×7 + 5×(−1) + 1×2</b><br>a = [3, −2, 5, 1], b = [4, 7, −1, 2], acc = 100',
      sDotSame: (n) => `<br>la rama de este destino calcula ${n}, idéntico bit a bit al valor de referencia`,
      sBranchK: 'En qué rama cae dp4a', sBranchF: (file) => `lo decide la cadena de #if de <b>${file}</b>`,
      sFlagK: 'Interruptores de esta configuración', sTierK: 'Cómo trata CMake esta arquitectura',
      branch: {
        'cuda-hw': 'instrucción __dp4a de hardware', 'cuda-sw': 'bucle de software strata_dp4a', 'hip-sudot4': 'v_dot4_i32_iu8 (sudot4)',
        'hip-sdot4': 'v_dot4_i32_i8 (sdot4)', 'hip-sdwa': 'ensamblador SDWA de RDNA1 (v_mul_i32_i24 + v_add3_u32)', 'hip-loop': 'bucle portable byte a byte',
      },
      tier: {
        ok: 'compilación normal', experimental: 'compilación experimental: el mantenedor no tiene esa tarjeta y solo comprobó que compila', validated: 'verificada en tarjetas reales por el mantenedor', community: 'verificada en tarjetas reales por usuarios',
        unvalidated: 'compila, pero avisa: aún sin verificar en una tarjeta real', refused: 'error: se rechaza la configuración',
      },
      try: [
        'Elige <b>RTX 50</b> y luego <b>RX 7900</b>, y compila cada una una vez: la línea 1 pasa de <code>cudaMalloc</code> a <code>hipMalloc</code>, sin que haya cambiado ni un carácter del código fuente.',
        'Elige <b>RX 6900</b>: la misma línea de dp4a usa ahora la instrucción más antigua sdot4 de RDNA2. El resultado del ejemplo sigue siendo 95: la aritmética entera sigue siendo idéntica bit a bit por otro camino.',
        'Elige <b>fuera de la lista</b>: el flujo se detiene en el paso 1. CMake prefiere negarse antes que compilar un motor que «corre, pero nadie ha verificado».',
      ],
      l0ok: (flags) => `<span class="c">[cmake]</span> ${flags}: la arquitectura está en la lista, se continúa`,
      l0warn: (arch) => `<span class="y">[cmake] advertencia</span>: ${arch} compila, pero nadie lo ha verificado aún en una tarjeta real; por favor, reporta tus resultados`,
      l0exp: '<span class="y">[cmake]</span> STRATA_EXPERIMENTAL_SM60 está activo: las tarjetas viejas por debajo de 7.5 solo reciben una compilación experimental (desde v0.1.39, setup prepara además un motor CUDA 12 aparte para ellas)',
      l0no: (arch) => `<span class="m">[cmake] FATAL_ERROR</span>: ${arch} no está en la lista de soporte; la configuración se detiene aquí y no se compila nada`,
      l1cuda: '<span class="c">[include]</span> una compilación CUDA usa directamente las cabeceras de NVIDIA; no hace falta shim',
      l1hip: '<span class="c">[include]</span> opción del compilador <code>-include hip_compat/cuda_runtime.h</code>: esta «tabla de cambio de nombres» se mete al principio de cada archivo fuente',
      l2cuda: '<span class="c">[cpp]</span> cudaMalloc y __shfl_xor_sync son nombres nativos de CUDA y se conservan',
      l2hip: '<span class="c">[cpp]</span> sustitución de macros: cudaMalloc → hipMalloc; __shfl_xor_sync → una función envoltorio de hip_compat (que primero comprueba que los 32 carriles participen)',
      l3: (name, file) => `<span class="c">[cpp]</span> la cadena de #if (${file}) conserva una sola rama: <span class="w">${name}</span>; las otras ramas se borran y el compilador nunca las ve`,
      l4cuda: (sm) => `<span class="c">[nvcc]</span> genera código máquina para sm_${sm}`,
      l4hip: (arch) => `<span class="c">[clang/HIP]</span> genera código máquina para ${arch} (los archivos .cu se compilan como HIP)`,
      l5cuda: '<span class="c">[run]</span> arranque: el controlador carga el código máquina que corresponde a la capacidad de cómputo de la tarjeta',
      l5hip: (arch) => `<span class="c">[run]</span> comprobación al arrancar: la arquitectura de la tarjeta debe ser ${arch} y un grupo de hilos debe tener 32 (wave32); si no, sale con un error`,
      done: (v) => `<span class="y">Listo</span>: el mismo código fuente, otro juego de código máquina. dp4a del ejemplo = ${v}`,
      vOk: (name, v) => `① No cambió ni una línea del código fuente. El preprocesador cambió los nombres por los de la plataforma de destino y conservó una sola rama para dp4a: «${name}».<br>② El resultado del ejemplo es <b>${v}</b>. dp4a es aritmética entera, así que todas las ramas son idénticas bit a bit.<br>③ Con el punto flotante no es tan fácil: la documentación upstream dice sin rodeos que no promete que los backends CUDA y HIP den respuestas idénticas bit a bit.`,
      vNo: '① CMake se negó en el primer paso: esta arquitectura no está en la lista.<br>② Negarse es mejor que «compilar y ver»: un binario que nadie ha verificado puede correr, calcular mal y no dar ningún error.<br>③ gfx906 es wave64, y el backend HIP solo admite wave32. Desde v0.1.39 tiene una compilación experimental aparte que se activa a mano (STRATA_HIP_GFX906). Usa otra capa de compatibilidad y no pasa por esta lista.',

      cCode: 'CPU_DISPATCH', cTitle: 'Selector de kernel de CPU', cTag: 'Hecho de código · lógica reproducida',
      cIntro: 'Los expertos que la GPU no tiene los calcula la propia CPU. Qué juego de kernels se usa se decide en <b>tiempo de ejecución</b>: el motor pregunta primero a la CPU «¿qué instrucciones conoces?» y luego elige. Cambia las condiciones de abajo y mira hasta dónde llega la cadena de decisión.',
      cLgCheck: 'Condición comprobada', cLgPass: 'Kernel elegido al final', cLgStop: 'Se niega a arrancar',
      cSteps: ['Comprobar AVX2', 'Mirar el paquete', 'Comprobar AVX-512', 'Contar tokens', 'Elegir kernel'],
      cpuLabel: 'CPU', cpus: ['p. ej. Ryzen 5 7600 (Zen 4), con AVX-512 completo', 'p. ej. Zen 2/3, Intel Core de 12.ª a 14.ª gen.: solo AVX2', 'CPU antiguas, anteriores a Haswell (2013): sin AVX2'],
      packLabel: 'Paquete de modelo', packs: { q2_0: 'Paquete Q2_0 estándar', iq3_s: 'IQ3_S (formato nativo)', iq4_xs: 'IQ4_XS (formato nativo)' },
      ntLabel: 'Tokens calculados juntos en un grupo', env512: 'STRATA_NO_IQ512 (sin kernel AVX-512)', env256: 'STRATA_NO_IQ256 (sin kernel AVX2)',
      sWideK: 'Una instrucción vectorial procesa a la vez', sWideF: (bits, n) => `<b>= ${bits} bits ÷ 8 bits = ${n} int8</b><br>cuanto más ancho el registro, más trabajo por instrucción`,
      int8s: (n) => `${n} int8`, loopCode: '/* 4 multiplicaciones-sumas de bytes */',
      sWideNone: '—', sWideNoneF: 'Sin AVX2: el motor no arranca',
      sPathK: 'Kernel elegido',
      paths: {
        'refuse-avx2': 'Se niega a arrancar', 'refuse-avx512': 'Se niega a arrancar', 'strata-vnni': 'Kernel AVX-512 propio de Strata',
        iq512: 'iq512: kernel multi-token AVX-512', iq256: 'iq256: kernel multi-token AVX2', ggml: 'producto punto de 1 token de ggml-cpu',
      },
      pathF: {
        'refuse-avx2': 'todo kernel de expertos en CPU del motor precompilado necesita como mínimo AVX2, FMA y F16C', 'refuse-avx512': 'el kernel de CPU del paquete Q2_0 estándar solo existe en versión AVX-512',
        'strata-vnni': 'usa los grupos de instrucciones VNNI y VBMI de AVX-512', iq512: 'los pesos se decodifican una vez y los comparte el grupo de tokens', iq256: 'la misma idea con registros de 256 bits',
        ggml: 'cada token decodifica los pesos por su cuenta',
      },
      c1: (ok) => ok ? '<span class="c">[1]</span> CPUID dice: AVX2 disponible (con FMA y F16C)' : '<span class="m">[1]</span> CPUID dice: no hay AVX2. El motor precompilado informa del modelo de CPU, dice que necesita una CPU Haswell (2013), Zen (2017) o posterior, y sale',
      c2: (p) => `<span class="c">[2]</span> Paquete de modelo: ${p}`,
      c3: (ok, env) => ok ? `<span class="c">[3]</span> CPUID dice: AVX-512 F, BW, VL, VNNI y VBMI están todos, y el SO guarda esos registros${env ? '; pero una variable de entorno indica que no se use el kernel AVX-512' : ''}` : '<span class="c">[3]</span> CPUID dice: no hay AVX-512 completo',
      c3q2: (ok) => ok ? '<span class="c">[3]</span> El paquete Q2_0 estándar necesita AVX-512: esta CPU lo tiene, adelante' : '<span class="m">[3]</span> El kernel de CPU del paquete Q2_0 estándar solo existe para AVX-512: da error al arrancar, en lugar de toparse con una instrucción ilegal varios miles de tokens después',
      c4: (nt) => nt >= M.MT_MIN ? `<span class="c">[4]</span> este grupo tiene ${nt} tokens y alcanza el umbral de ${M.MT_MIN} del kernel multi-token` : `<span class="c">[4]</span> este grupo tiene solo 1 token, por debajo del umbral de ${M.MT_MIN}: el kernel multi-token no ofrece ventaja`,
      c5: (name) => `<span class="y">[5] Elegido</span>: <span class="w">${name}</span>`,
      c5iq4: '<span class="y">Nota</span>: IQ4_XS solo tiene un kernel multi-token AVX2. Las CPU con AVX-512 no lo toman prestado, porque cambiaría el redondeo, y vuelven a ggml-cpu',
      cVerdict: {
        'refuse-avx2': 'Esta CPU es demasiado vieja: ningún kernel de expertos del motor precompilado puede correr. El motor explica el motivo en el segundo 0 y sale. Desde v0.1.39, setup puede compilar en esta máquina un motor experimental (STRATA_ISA_FLOOR), y los expertos pasan entonces por ggml-cpu: funciona, pero muy lento.',
        'refuse-avx512': 'El paquete Q2_0 estándar solo tiene un kernel AVX-512. Sin AVX-512 se niega a arrancar; cambia a un paquete de formato nativo para correr en una CPU con AVX2.',
        'strata-vnni': 'El paquete Q2_0 estándar usa el kernel AVX-512 que escribió el propio Strata.',
        iq512: 'El mismo programa; esta CPU toma la ruta más ancha, de 512 bits: los pesos se decodifican una vez y los comparte todo el grupo de tokens.',
        iq256: 'El mismo programa; esta CPU toma la ruta de 256 bits. El binario no cambió; cambió la elección en tiempo de ejecución.',
        ggml: 'Vuelve al producto punto de 1 token de ggml-cpu: el más general, pero cada token decodifica los pesos otra vez.',
      },
      cTry: [
        'Elige la CPU <b>Zen 4</b> y el paquete <b>IQ3_S</b>, y marca <b>STRATA_NO_IQ512</b>: la misma máquina pasa a usar el kernel AVX2. Las variables de entorno también son condiciones experimentales.',
        'Baja el número de tokens a <b>1</b>: el kernel multi-token cede el paso a ggml. Los comentarios upstream dicen que así el mismo token se redondea distinto si se calcula solo o en grupo.',
        'Elige la CPU <b>Zen 2/3</b> y el paquete <b>Q2_0 estándar</b>: se rechaza al arrancar. Cambia a IQ3_S: corre. Lo que decide si corre es la pareja «CPU × paquete de modelo».',
      ],
    },
    ko: {
      code: 'BUILD_SPLIT', title: '소스 하나, 백엔드 둘', tag: '코드 사실 · 단순화한 도식',
      intro: '왼쪽은 CUDA 방식으로 쓴 소스 세 줄이에요. 대상 그래픽 카드를 고르고 <b>컴파일</b>을 누르세요. 전처리가 끝나면 이 세 줄이 어떻게 바뀌는지 볼 수 있어요. 어떤 이름이 바뀌고, 어떤 <code>#if</code> 분기가 남을까요?',
      lgSame: '그대로 남은 소스', lgSwap: 'shim이 바꾼 이름', lgPick: '#if가 고른 분기',
      steps: ['CMake 설정', 'shim 강제 포함', '전처리: 이름 바꾸기', '전처리: 분기 고르기', '기계어로 컴파일', '시작 시 점검'],
      targetsLabel: '대상 그래픽 카드',
      targets: ['NVIDIA RTX 50 · sm_120', 'NVIDIA 구형 카드 · sm_60 (실험 스위치)', 'AMD RX 7900 · gfx1100', 'AMD RX 6900 · gfx1030', '목록에 없는 AMD 아키텍처 · gfx906'],
      srcHead: '소스 (한 번만 작성)', outHead: (n) => `전처리 후 (${n})`, outEmpty: '[ 컴파일 ]을 누르면 나타나요',
      bGo: '▶ 컴파일', bReset: '초기화',
      ready: '<span class="c">$</span> ready. 대상 그래픽 카드를 고른 뒤 [ ▶ 컴파일 ]을 누르세요',
      sDotK: '예제: dp4a(a, b, acc)의 결과', sDotF: '<b>= 100 + 3×4 + (−2)×7 + 5×(−1) + 1×2</b><br>a = [3, −2, 5, 1], b = [4, 7, −1, 2], acc = 100',
      sDotSame: (n) => `<br>이 대상의 분기가 계산한 값: ${n}. 기준값과 비트까지 같아요`,
      sBranchK: 'dp4a가 들어가는 분기', sBranchF: (file) => `<b>${file}</b>의 #if 체인이 결정해요`,
      sFlagK: '이번 설정에 쓴 스위치', sTierK: '이 아키텍처에 대한 CMake의 태도',
      branch: {
        'cuda-hw': '하드웨어 __dp4a 명령', 'cuda-sw': '소프트웨어 루프 strata_dp4a', 'hip-sudot4': 'v_dot4_i32_iu8 (sudot4)',
        'hip-sdot4': 'v_dot4_i32_i8 (sdot4)', 'hip-sdwa': 'RDNA1의 SDWA 어셈블리 (v_mul_i32_i24 + v_add3_u32)', 'hip-loop': '이식 가능한 바이트 단위 루프',
      },
      tier: {
        ok: '일반 빌드', experimental: '실험 빌드: 메인테이너에게 이런 카드가 없어 컴파일만 확인함', validated: '메인테이너가 실제 카드에서 검증함', community: '사용자가 실제 카드에서 검증함',
        unvalidated: '컴파일은 되지만 경고를 냄: 아직 실제 카드에서 검증하지 않음', refused: '오류: 설정을 거부함',
      },
      try: [
        '<b>RTX 50</b>을 고르고, 이어서 <b>RX 7900</b>을 골라 각각 한 번씩 컴파일해 보세요. 첫째 줄이 <code>cudaMalloc</code>에서 <code>hipMalloc</code>으로 바뀌지만, 소스는 한 글자도 바뀌지 않았어요.',
        '<b>RX 6900</b>을 골라 보세요. 같은 dp4a 한 줄이 RDNA2의 오래된 명령 sdot4로 바뀌어요. 그래도 예제 결과는 95예요. 정수 연산은 길이 달라도 비트까지 같아요.',
        '<b>목록에 없는 아키텍처</b>를 골라 보세요. 흐름이 1단계에서 멈춰요. CMake는 「돌아가긴 하지만 아무도 검증하지 않은」 엔진을 만드느니 거부하는 쪽을 택해요.',
      ],
      l0ok: (flags) => `<span class="c">[cmake]</span> ${flags}: 아키텍처가 목록에 있어요. 계속해요`,
      l0warn: (arch) => `<span class="y">[cmake] 경고</span>: 아키텍처 ${arch}. 컴파일은 되지만 아직 아무도 실제 카드에서 검증하지 않았어요. 결과를 알려 주세요`,
      l0exp: '<span class="y">[cmake]</span> STRATA_EXPERIMENTAL_SM60을 켰어요. 7.5 미만의 구형 카드는 실험 빌드만 받아요(v0.1.39부터 setup이 이런 카드용 CUDA 12 엔진을 따로 준비해요)',
      l0no: (arch) => `<span class="m">[cmake] FATAL_ERROR</span>: 아키텍처 ${arch}. 지원 목록에 없어요. 설정이 여기서 멈추고 아무것도 컴파일하지 않아요`,
      l1cuda: '<span class="c">[include]</span> CUDA 빌드는 NVIDIA 자체 헤더를 그대로 써요. shim은 필요 없어요',
      l1hip: '<span class="c">[include]</span> 컴파일러 인자 <code>-include hip_compat/cuda_runtime.h</code>: 모든 소스 파일 맨 앞에 이 「이름 변환표」가 끼어들어요',
      l2cuda: '<span class="c">[cpp]</span> cudaMalloc과 __shfl_xor_sync는 CUDA 고유 이름이라 그대로 남아요',
      l2hip: '<span class="c">[cpp]</span> 매크로 치환: cudaMalloc → hipMalloc, __shfl_xor_sync → hip_compat의 래퍼 함수 (32개 레인이 모두 참여하는지 먼저 확인)',
      l3: (name, file) => `<span class="c">[cpp]</span> #if 체인(${file})이 분기 하나만 남겨요: <span class="w">${name}</span>. 나머지는 지워져서 컴파일러 눈에 보이지 않아요`,
      l4cuda: (sm) => `<span class="c">[nvcc]</span> 기계어를 만들어요: sm_${sm}`,
      l4hip: (arch) => `<span class="c">[clang/HIP]</span> 기계어를 만들어요: ${arch} (.cu 파일을 HIP 언어로 컴파일해요)`,
      l5cuda: '<span class="c">[run]</span> 시작: 드라이버가 카드의 컴퓨트 능력에 맞는 기계어를 불러와요',
      l5hip: (arch) => `<span class="c">[run]</span> 시작 시 점검: 카드 아키텍처가 목록(${arch})에 있어야 하고, 스레드 묶음이 32개(wave32)여야 해요. 아니면 오류를 내고 종료해요`,
      done: (v) => `<span class="y">완료</span>: 같은 소스에 다른 기계어. 예제 dp4a = ${v}`,
      vOk: (name, v) => `① 소스는 한 줄도 바뀌지 않았어요. 전처리기가 이름을 대상 플랫폼의 말로 바꾸고, dp4a에는 「${name}」 분기 하나만 남겼어요.<br>② 예제 결과는 <b>${v}</b>예요. dp4a는 정수 연산이라 어느 분기든 비트까지 같아요.<br>③ 부동소수점은 이렇게 간단하지 않아요. 업스트림 문서는 CUDA와 HIP 두 백엔드의 답이 비트까지 같다고 약속하지 않는다고 분명히 밝혀요.`,
      vNo: '① CMake가 첫 단계에서 거부했어요. 이 아키텍처는 목록에 없어요.<br>② 「일단 빌드해 보기」보다 거부가 나아요. 아무도 검증하지 않은 바이너리는 돌아가면서 틀린 답을 내고도 아무 오류를 알리지 않을 수 있어요.<br>③ gfx906은 wave64이고, HIP 백엔드는 wave32만 받아요. v0.1.39부터 직접 켜는 별도의 실험 빌드(STRATA_HIP_GFX906)가 있어요. 다른 호환 계층을 쓰고, 이 목록을 거치지 않아요.',

      cCode: 'CPU_DISPATCH', cTitle: 'CPU 커널 선택기', cTag: '코드 사실 · 로직 재현',
      cIntro: 'GPU가 못 맞힌 전문가는 CPU가 직접 계산해요. 어떤 커널을 쓸지는 <b>실행 시점</b>에 정해요. 엔진이 먼저 CPU에게 「어떤 명령을 아니?」 하고 물은 뒤 고르거든요. 아래 조건을 바꿔서 판단 체인이 어디까지 가는지 보세요.',
      cLgCheck: '확인한 조건', cLgPass: '최종 선택한 커널', cLgStop: '시작 거부',
      cSteps: ['AVX2 확인', '모델 팩 확인', 'AVX-512 확인', '토큰 수 세기', '커널 선택'],
      cpuLabel: 'CPU', cpus: ['예: Ryzen 5 7600 (Zen 4), 완전한 AVX-512', '예: Zen 2/3, Intel 12~14세대 코어: AVX2만 있음', '2013년 Haswell 이전의 구형 CPU: AVX2 없음'],
      packLabel: '모델 팩', packs: { q2_0: '표준 Q2_0 팩', iq3_s: 'IQ3_S (네이티브 형식)', iq4_xs: 'IQ4_XS (네이티브 형식)' },
      ntLabel: '한 묶음에서 함께 계산하는 토큰 수', env512: 'STRATA_NO_IQ512 (AVX-512 커널 사용 안 함)', env256: 'STRATA_NO_IQ256 (AVX2 커널 사용 안 함)',
      sWideK: '벡터 명령 하나가 한 번에 처리하는 양', sWideF: (bits, n) => `<b>= ${bits}비트 ÷ 8비트 = int8 ${n}개</b><br>레지스터가 넓을수록 명령 하나가 하는 일이 많아져요`,
      int8s: (n) => `int8 ${n}개`, loopCode: '/* 바이트 곱셈-덧셈 4번 */',
      sWideNone: '—', sWideNoneF: 'AVX2가 없으면 엔진이 시작하지 않아요',
      sPathK: '선택한 커널',
      paths: {
        'refuse-avx2': '시작 거부', 'refuse-avx512': '시작 거부', 'strata-vnni': 'Strata가 직접 쓴 AVX-512 커널',
        iq512: 'iq512: AVX-512 다중 토큰 커널', iq256: 'iq256: AVX2 다중 토큰 커널', ggml: 'ggml-cpu의 단일 토큰 내적',
      },
      pathF: {
        'refuse-avx2': '미리 빌드된 엔진의 CPU 전문가 커널은 모두 최소한 AVX2, FMA, F16C가 필요해요', 'refuse-avx512': '표준 Q2_0 팩의 CPU 커널은 AVX-512 버전뿐이에요',
        'strata-vnni': 'AVX-512의 VNNI와 VBMI 명령군을 써요', iq512: '가중치를 한 번 디코딩해서 이 묶음의 토큰이 함께 써요', iq256: '같은 방식을 256비트 레지스터로 옮겼어요',
        ggml: '토큰마다 가중치를 따로 디코딩해요',
      },
      c1: (ok) => ok ? '<span class="c">[1]</span> CPUID 응답: AVX2 지원 (FMA, F16C 포함)' : '<span class="m">[1]</span> CPUID 응답: AVX2 없음. 미리 빌드된 엔진이 CPU 모델명을 알려 주고, Haswell(2013), Zen(2017) 또는 더 새로운 CPU가 필요하다고 안내한 뒤 종료해요',
      c2: (p) => `<span class="c">[2]</span> 모델 팩: ${p}`,
      c3: (ok, env) => ok ? `<span class="c">[3]</span> CPUID 응답: AVX-512의 F, BW, VL, VNNI, VBMI가 모두 있고, 운영체제도 이 레지스터를 저장해요${env ? '. 하지만 환경 변수가 AVX-512 커널을 쓰지 말라고 해요' : ''}` : '<span class="c">[3]</span> CPUID 응답: 완전한 AVX-512 없음',
      c3q2: (ok) => ok ? '<span class="c">[3]</span> 표준 Q2_0 팩에는 AVX-512가 필요해요. 이 CPU에는 있으니 통과해요' : '<span class="m">[3]</span> 표준 Q2_0 팩의 CPU 커널은 AVX-512 버전뿐이에요. 수천 번째 토큰에서 잘못된 명령을 만나는 대신, 시작할 때 바로 오류를 내고 종료해요',
      c4: (nt) => nt >= M.MT_MIN ? `<span class="c">[4]</span> 이 묶음에는 토큰이 ${nt}개 있어요. 다중 토큰 커널의 기준 ${M.MT_MIN}개를 넘었어요` : `<span class="c">[4]</span> 이 묶음에는 토큰이 1개뿐이에요. 기준 ${M.MT_MIN}개에 못 미쳐서 다중 토큰 커널의 이점이 없어요`,
      c5: (name) => `<span class="y">[5] 선택</span>: <span class="w">${name}</span>`,
      c5iq4: '<span class="y">참고</span>: IQ4_XS는 AVX2 다중 토큰 커널만 있어요. AVX-512 CPU도 이 커널을 빌려 쓰지 않아요. 반올림 방식이 달라지기 때문이에요. 그래서 ggml-cpu로 돌아가요',
      cVerdict: {
        'refuse-avx2': '이 CPU는 너무 오래돼서 미리 빌드된 엔진의 전문가 커널을 하나도 돌릴 수 없어요. 엔진은 0초 시점에 이유를 밝히고 종료해요. v0.1.39부터 setup이 이 컴퓨터에서 실험 엔진(STRATA_ISA_FLOOR)을 직접 빌드할 수 있고, 이때 전문가는 ggml-cpu로 돌아요. 돌아가지만 아주 느려요.',
        'refuse-avx512': '표준 Q2_0 팩에는 AVX-512 커널뿐이에요. AVX-512가 없으면 시작할 때 거부해요. AVX2 CPU에서 돌리려면 네이티브 형식 팩으로 바꿔야 해요.',
        'strata-vnni': '표준 Q2_0 팩은 Strata가 직접 쓴 AVX-512 커널을 써요.',
        iq512: '같은 프로그램인데, 이 CPU는 가장 넓은 512비트 길로 가요. 가중치를 한 번 디코딩해서 묶음 전체가 함께 써요.',
        iq256: '같은 프로그램인데, 이 CPU는 256비트 길로 가요. 바이너리는 그대로고, 바뀐 것은 실행 시점의 선택이에요.',
        ggml: 'ggml-cpu의 단일 토큰 내적으로 돌아가요. 가장 범용이지만 토큰마다 가중치를 다시 디코딩해야 해요.',
      },
      cTry: [
        'CPU는 <b>Zen 4</b>, 팩은 <b>IQ3_S</b>를 고르고 <b>STRATA_NO_IQ512</b>를 체크해 보세요. 같은 머신이 AVX2 커널로 바뀌어요. 환경 변수도 실험 조건이에요.',
        '토큰 수를 <b>1</b>로 내려 보세요. 다중 토큰 커널이 물러나고 ggml이 맡아요. 업스트림 주석에 따르면, 같은 토큰도 혼자 계산할 때와 묶음으로 계산할 때 반올림이 달라져요.',
        'CPU는 <b>Zen 2/3</b>, 팩은 <b>표준 Q2_0</b>을 고르세요. 시작하자마자 거부당해요. IQ3_S로 바꾸면 돌아가요. 돌아갈지 말지는 「CPU × 모델 팩」 조합이 정해요.',
      ],
    },
    ja: {
      code: 'BUILD_SPLIT', title: '1 つのソース、2 つのバックエンド', tag: 'コード上の事実 · 簡略化した図',
      intro: '左は CUDA 流で書いた 3 行のソースです。ターゲットのカードを選んで<b>コンパイル</b>を押すと、この 3 行がプリプロセス後にどうなるか分かります。どの名前が置き換わり、どの <code>#if</code> 分岐が残るでしょうか。',
      lgSame: 'そのまま残るソース', lgSwap: 'シムが置き換えた名前', lgPick: '#if が選んだ分岐',
      steps: ['CMake 設定', 'シムを強制インクルード', 'プリプロセス：名前の置換', 'プリプロセス：分岐の選択', '機械語へコンパイル', '起動時チェック'],
      targetsLabel: 'ターゲットのカード',
      targets: ['NVIDIA RTX 50 · sm_120', 'NVIDIA 旧世代 · sm_60（実験スイッチ）', 'AMD RX 7900 · gfx1100', 'AMD RX 6900 · gfx1030', 'リスト外の AMD アーキテクチャ · gfx906'],
      srcHead: 'ソース（1 回だけ書く）', outHead: (n) => `プリプロセス後（${n}）`, outEmpty: '[ コンパイル ] を押すと表示されます',
      bGo: '▶ コンパイル', bReset: 'リセット',
      ready: '<span class="c">$</span> ready. ターゲットのカードを選んで、[ ▶ コンパイル ] を押してください',
      sDotK: '例題：dp4a(a, b, acc) の結果', sDotF: '<b>= 100 + 3×4 + (−2)×7 + 5×(−1) + 1×2</b><br>a = [3, −2, 5, 1]、b = [4, 7, −1, 2]、acc = 100',
      sDotSame: (n) => `<br>このターゲットの分岐の計算結果は ${n} で、参照値と 1 ビットまで同じです`,
      sBranchK: 'dp4a が落ちる分岐', sBranchF: (file) => `<b>${file}</b> の #if の連なりで決まります`,
      sFlagK: 'この設定で使うスイッチ', sTierK: 'このアーキテクチャへの CMake の態度',
      branch: {
        'cuda-hw': 'ハードウェアの __dp4a 命令', 'cuda-sw': 'ソフトウェアのループ strata_dp4a', 'hip-sudot4': 'v_dot4_i32_iu8（sudot4）',
        'hip-sdot4': 'v_dot4_i32_i8（sdot4）', 'hip-sdwa': 'RDNA1 の SDWA アセンブリ（v_mul_i32_i24 + v_add3_u32）', 'hip-loop': 'ポータブルなバイトごとのループ',
      },
      tier: {
        ok: '通常のビルド', experimental: '実験ビルド：メンテナはこの種のカードを持っておらず、コンパイルできることだけ確認', validated: 'メンテナが実機で検証済み', community: 'ユーザーが実機で検証済み',
        unvalidated: 'コンパイルできるが警告あり：実機ではまだ未検証', refused: 'エラーで設定を拒否',
      },
      try: [
        '<b>RTX 50</b> を選び、次に <b>RX 7900</b> を選んで、それぞれコンパイルします。1 行目が <code>cudaMalloc</code> から <code>hipMalloc</code> に変わりますが、ソースは 1 文字も変えていません。',
        '<b>RX 6900</b> を選びます。同じ 1 行の dp4a が、RDNA2 の古い命令 sdot4 に置き換わります。それでも例題の結果は 95 のままです。整数演算は、道が変わっても 1 ビットまで同じです。',
        '<b>リスト外のアーキテクチャ</b>を選びます。流れは第 1 段階で止まります。CMake は、「動くけれど誰も検証していない」エンジンを作るくらいなら、断るほうを選びます。',
      ],
      l0ok: (flags) => `<span class="c">[cmake]</span> ${flags}：アーキテクチャはリストにあります。続行`,
      l0warn: (arch) => `<span class="y">[cmake] 警告</span>：${arch} はコンパイルできますが、実機ではまだ誰も検証していません。結果を報告してください`,
      l0exp: '<span class="y">[cmake]</span> STRATA_EXPERIMENTAL_SM60 が有効です：7.5 未満の旧世代カードは、実験ビルドだけになります（v0.1.39 以降、setup はこの種のカード向けに CUDA 12 のエンジンを別に用意します）',
      l0no: (arch) => `<span class="m">[cmake] FATAL_ERROR</span>：${arch} はサポートリストにありません。設定はここで終わり、何もコンパイルしません`,
      l1cuda: '<span class="c">[include]</span> CUDA ビルドは NVIDIA 自身のヘッダをそのまま使うので、シムは不要です',
      l1hip: '<span class="c">[include]</span> コンパイラオプション <code>-include hip_compat/cuda_runtime.h</code>：すべてのソースファイルの先頭に、この「置き換え表」が差し込まれます',
      l2cuda: '<span class="c">[cpp]</span> cudaMalloc も __shfl_xor_sync も CUDA ネイティブの名前なので、そのまま残ります',
      l2hip: '<span class="c">[cpp]</span> マクロ置換：cudaMalloc → hipMalloc、__shfl_xor_sync → hip_compat のラッパー関数（まず 32 レーンすべてが参加しているか確認します）',
      l3: (name, file) => `<span class="c">[cpp]</span> #if の連なり（${file}）は 1 つの分岐だけを残します：<span class="w">${name}</span>。ほかの分岐は消され、コンパイラには見えません`,
      l4cuda: (sm) => `<span class="c">[nvcc]</span> sm_${sm} の機械語を生成します`,
      l4hip: (arch) => `<span class="c">[clang/HIP]</span> ${arch} の機械語を生成します（.cu ファイルは HIP としてコンパイルされます）`,
      l5cuda: '<span class="c">[run]</span> 起動：ドライバが、カードの compute capability に合う機械語を読み込みます',
      l5hip: (arch) => `<span class="c">[run]</span> 起動時チェック：カードのアーキテクチャは ${arch} で、スレッドの束は 32 個（wave32）でなければなりません。違えばエラーで終了します`,
      done: (v) => `<span class="y">完了</span>：同じソースから、別の機械語ができました。例題の dp4a = ${v}`,
      vOk: (name, v) => `① ソースは 1 行も変えていません。プリプロセッサが名前をターゲットのプラットフォームの言い方に置き換え、dp4a には「${name}」の分岐だけを残しました。<br>② 例題の結果は <b>${v}</b> です。dp4a は整数演算なので、どの分岐でも 1 ビットまで同じです。<br>③ 浮動小数点演算はこう簡単にはいきません。上流のドキュメントは、CUDA と HIP の 2 つのバックエンドが 1 ビットまで同じ答えを出すとは約束しない、とはっきり書いています。`,
      vNo: '① CMake は第 1 段階で断りました。このアーキテクチャはリストにありません。<br>② 「作ってから考える」より、断るほうがよいのです。誰も検証していないバイナリは、動いても計算を間違え、しかもエラーを 1 つも出さないかもしれません。<br>③ gfx906 は wave64 で、HIP バックエンドは wave32 しか受け付けません。v0.1.39 以降は、手動で有効にする別の実験ビルド（STRATA_HIP_GFX906）があります。別の互換レイヤーを使い、このリストは通りません。',

      cCode: 'CPU_DISPATCH', cTitle: 'CPU カーネル選択器', cTag: 'コード上の事実 · ロジックを再現',
      cIntro: 'GPU にキャッシュされていないエキスパートは、CPU 自身が計算します。どのカーネルを使うかは<b>実行時</b>に決まります。エンジンがまず CPU に「どの命令が使える？」と聞いてから選ぶのです。下の条件を変えて、判断の連なりがどこまで進むか見てみましょう。',
      cLgCheck: '確認した条件', cLgPass: '最終的に選ばれたカーネル', cLgStop: '起動を拒否',
      cSteps: ['AVX2 を確認', 'パッケージを見る', 'AVX-512 を確認', 'トークン数を数える', 'カーネルを選ぶ'],
      cpuLabel: 'CPU', cpus: ['Zen 4（Ryzen 5 7600）：AVX-512 あり', 'Zen 2/3 など：AVX2 のみ', '2013 年以前の古い CPU：AVX2 なし'],
      packLabel: 'モデルパッケージ', packs: { q2_0: '標準 Q2_0 パッケージ', iq3_s: 'IQ3_S（ネイティブ形式）', iq4_xs: 'IQ4_XS（ネイティブ形式）' },
      ntLabel: 'グループのトークン数', env512: 'STRATA_NO_IQ512（AVX-512 カーネルを使わない）', env256: 'STRATA_NO_IQ256（AVX2 カーネルを使わない）',
      sWideK: '1 つのベクトル命令が同時に処理できる数', sWideF: (bits, n) => `<b>= ${bits} ビット ÷ 8 ビット = ${n} 個の int8</b><br>レジスタが広いほど、1 命令の仕事が増えます`,
      int8s: (n) => `${n} 個の int8`, loopCode: '/* バイトの積和を 4 回 */',
      sWideNone: '—', sWideNoneF: 'AVX2 なし：エンジンは起動しません',
      sPathK: '選ばれたカーネル',
      paths: {
        'refuse-avx2': '起動を拒否', 'refuse-avx512': '起動を拒否', 'strata-vnni': 'Strata 自前の AVX-512 カーネル',
        iq512: 'iq512：AVX-512 マルチトークンカーネル', iq256: 'iq256：AVX2 マルチトークンカーネル', ggml: 'ggml-cpu の 1 トークン内積',
      },
      pathF: {
        'refuse-avx2': 'ビルド済みエンジンの CPU エキスパートカーネルは、最低でも AVX2、FMA、F16C が必要です', 'refuse-avx512': '標準 Q2_0 パッケージの CPU カーネルは AVX-512 版しかありません',
        'strata-vnni': 'AVX-512 の VNNI と VBMI の 2 つの命令群を使います', iq512: '重みを 1 回だけデコードし、このグループのトークンで共有します', iq256: '同じ考え方で、256 ビットのレジスタを使います',
        ggml: 'トークンごとに、それぞれ重みをデコードし直します',
      },
      c1: (ok) => ok ? '<span class="c">[1]</span> CPUID の答え：AVX2 に対応しています（FMA、F16C を含む）' : '<span class="m">[1]</span> CPUID の答え：AVX2 がありません。ビルド済みエンジンは CPU の型番を表示し、Haswell（2013 年）、Zen（2017 年）、またはそれ以降の CPU が必要だと伝えて、終了します',
      c2: (p) => `<span class="c">[2]</span> モデルパッケージ：${p}`,
      c3: (ok, env) => ok ? `<span class="c">[3]</span> CPUID の答え：AVX-512 の F、BW、VL、VNNI、VBMI がすべてあり、OS もこのレジスタを保存します${env ? '。ただし環境変数が AVX-512 カーネルを使わないよう指示しています' : ''}` : '<span class="c">[3]</span> CPUID の答え：完全な AVX-512 はありません',
      c3q2: (ok) => ok ? '<span class="c">[3]</span> 標準 Q2_0 パッケージには AVX-512 が必要です。この CPU にはあるので、通過します' : '<span class="m">[3]</span> 標準 Q2_0 パッケージの CPU カーネルは AVX-512 版しかありません。起動時にエラーで終了します。数千トークン目で不正命令にぶつかるよりずっとましです',
      c4: (nt) => nt >= M.MT_MIN ? `<span class="c">[4]</span> このグループは ${nt} トークンで、マルチトークンカーネルのしきい値 ${M.MT_MIN} に達しています` : `<span class="c">[4]</span> このグループは 1 トークンだけで、しきい値 ${M.MT_MIN} に届きません。マルチトークンカーネルの利点はありません`,
      c5: (name) => `<span class="y">[5] 選択</span>：<span class="w">${name}</span>`,
      c5iq4: '<span class="y">注意</span>：IQ4_XS には AVX2 版のマルチトークンカーネルしかありません。AVX-512 の CPU はそれを借りません。丸め方が変わってしまうので、ggml-cpu に戻ります',
      cVerdict: {
        'refuse-avx2': 'この CPU は古すぎて、ビルド済みエンジンのエキスパートカーネルは 1 つも動かせません。エンジンは 0 秒目に理由を説明して終了します。v0.1.39 以降、setup はこのマシン上で実験版エンジン（STRATA_ISA_FLOOR）をビルドでき、エキスパートは ggml-cpu で動きます。動きますが、とても遅いです。',
        'refuse-avx512': '標準 Q2_0 パッケージには AVX-512 カーネルしかありません。AVX-512 がなければ起動時に拒否します。AVX2 の CPU で動かすには、ネイティブ形式のパッケージに替えます。',
        'strata-vnni': '標準 Q2_0 パッケージは、Strata が自前で書いた AVX-512 カーネルを使います。',
        iq512: '同じプログラムで、この CPU はいちばん幅の広い 512 ビットの道を通ります。重みは 1 回だけデコードし、グループ全体のトークンで共有します。',
        iq256: '同じプログラムで、この CPU は 256 ビットの道を通ります。バイナリは変わっていません。変わったのは実行時の選択です。',
        ggml: 'ggml-cpu の 1 トークン内積に戻ります。いちばん汎用的ですが、トークンごとに重みをデコードし直します。',
      },
      cTry: [
        'CPU に <b>Zen 4</b>、パッケージに <b>IQ3_S</b> を選び、<b>STRATA_NO_IQ512</b> にチェックを入れます。同じマシンが AVX2 カーネルに回ります。環境変数も実験条件です。',
        'トークン数を <b>1</b> まで下げます。マルチトークンカーネルは ggml に道を譲ります。上流のコメントによると、同じトークンでも、単独で計算したときとグループで計算したときで丸めが変わります。',
        'CPU に <b>Zen 2/3</b>、パッケージに<b>標準 Q2_0</b> を選びます。起動時に拒否されます。IQ3_S に替えると動きます。動くかどうかを決めるのは、「CPU × モデルパッケージ」の組み合わせです。',
      ],
    },
  });

  const mono = 'font-family:var(--mono);font-size:12.5px;line-height:1.7';
  const pane = `${mono};border:1px solid var(--frame);background:var(--side);padding:8px 10px;margin:6px 0 0;white-space:pre-wrap;word-break:break-all;color:var(--ink);min-height:92px`;
  const swap = s => `<span style="color:var(--a2);font-weight:700">${s}</span>`;
  const pick = s => `<span style="color:var(--accent);font-weight:700;text-shadow:var(--glow)">${s}</span>`;
  const SRC = ['cudaMalloc(&amp;buf, bytes);', 'acc = STRATA_DP4A(a, b, acc);', 'v += __shfl_xor_sync(0xffffffff, v, 16);'];
  const TARGETS = [
    { backend: 'cuda', sm: 120, flags: '-DSTRATA_ENABLE_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=120' },
    { backend: 'cuda', sm: 60, experimental: true, flags: '-DSTRATA_ENABLE_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=60 -DSTRATA_EXPERIMENTAL_SM60=ON' },
    { backend: 'hip', arch: 'gfx1100', flags: '-DSTRATA_ENABLE_HIP=ON -DCMAKE_HIP_ARCHITECTURES=gfx1100' },
    { backend: 'hip', arch: 'gfx1030', flags: '-DSTRATA_ENABLE_HIP=ON -DCMAKE_HIP_ARCHITECTURES=gfx1030' },
    { backend: 'hip', arch: 'gfx906', flags: '-DSTRATA_ENABLE_HIP=ON -DCMAKE_HIP_ARCHITECTURES=gfx906' },
  ];
  const DOT_A = M.pack([3, -2, 5, 1]), DOT_B = M.pack([4, 7, -1, 2]), DOT_C = 100;

  function lowered(t, id) {
    const dp = {
      'cuda-hw': pick('__dp4a(a, b, acc)'), 'cuda-sw': pick('strata_dp4a(a, b, acc)'),
      'hip-sudot4': pick('__builtin_amdgcn_sudot4(true, a, true, b, acc, false)'), 'hip-sdot4': pick('__builtin_amdgcn_sdot4(a, b, acc, false)'),
      'hip-sdwa': pick('asm("v_mul_i32_i24 … v_add3_u32 …")'),
      'hip-loop': pick(T.loopCode),
    }[id];
    if (t.backend === 'cuda') return [SRC[0], 'acc = ' + dp + ';', SRC[2]];
    return [swap('hipMalloc') + '(&amp;buf, bytes);', 'acc = ' + dp + ';', 'v += ' + swap('hip_compat::shfl_xor_sync') + '(0xffffffff, v, 16);\n     ' + swap('→ __shfl_xor(v, 16, 32)')];
  }

  function guarded(ctx, el) {
    let busy = false;
    return async fn => {
      if (busy) return;
      busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
      try { await fn(); } catch (e) { if (ctx.alive) throw e; }
      busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
    };
  }

  Viz.register('portable-build', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgSame },
        { color: 'var(--a2)', text: T.lgSwap },
        { color: 'var(--accent)', text: T.lgPick, glow: true },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      left.insertAdjacentHTML('beforeend', `<div style="font-size:13px;color:var(--muted)">${T.targetsLabel}</div>
        <div class="viz-row tgt" style="margin-top:6px">${T.targets.map((s, i) => `<button type="button" class="viz-btn ghost" data-t="${i}" aria-pressed="false">${Viz.esc(s)}</button>`).join('')}</div>
        <div style="margin-top:12px;font-size:13px;color:var(--muted)">${T.srcHead}</div><div class="src" style="${pane}">${SRC.join('\n')}</div>
        <div style="margin-top:10px;font-size:13px;color:var(--muted)" class="oh"></div><div class="out" style="${pane}"></div>
        <div class="viz-row">${Viz.button(T.bGo)}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'p-dot', k: T.sDotK, v: String(M.dp4aRef(DOT_A, DOT_B, DOT_C)), f: T.sDotF, hot: true }) +
        Viz.stat({ id: 'p-br', k: T.sBranchK, v: '—', f: '' }) +
        Viz.stat({ id: 'p-flag', k: T.sFlagK, v: '', f: '' }) +
        Viz.stat({ id: 'p-tier', k: T.sTierK, v: '—', f: '' });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.try) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      const tBtns = [...el.querySelectorAll('.tgt .viz-btn')];
      const [goBtn, resetBtn] = [...el.querySelectorAll('.viz-row:not(.tgt) .viz-btn')];
      let cur = 0;
      const guard = guarded(ctx, el);

      function tierOf(t) { return t.backend === 'cuda' ? M.cudaTier(t.sm, !!t.experimental) : M.hipTier(t.arch); }
      function select(i) {
        cur = i;
        tBtns.forEach((b, j) => { b.className = 'viz-btn' + (j === i ? '' : ' ghost'); b.setAttribute('aria-pressed', String(j === i)); });
        const t = TARGETS[i];
        $('.oh').textContent = T.outHead(t.backend === 'cuda' ? 'sm_' + t.sm : t.arch);
        $('.out').innerHTML = `<span style="color:var(--muted)">${T.outEmpty}</span>`;
        $('[data-s=p-flag-v]').textContent = t.backend === 'cuda' ? 'CUDA' : 'HIP';
        $('[data-s=p-flag-f]').innerHTML = `<b>${t.flags}</b>`;
        $('[data-s=p-tier-v]').textContent = T.tier[tierOf(t)];
        $('[data-s=p-tier-f]').textContent = t.backend === 'cuda' ? 'CMakeLists.txt' : 'cmake/hip_backend.cmake';
        $('[data-s=p-br-v]').textContent = '—';
        $('[data-s=p-br-f]').textContent = '';
        $('[data-s=p-dot-f]').innerHTML = T.sDotF;
        pipe.set(-1);
        $('.viz-verdict').hidden = true;
      }
      async function compile() {
        const t = TARGETS[cur], tier = tierOf(t), name = t.backend === 'cuda' ? 'sm_' + t.sm : t.arch;
        $('.viz-verdict').hidden = true;
        term.clear();
        pipe.set(0);
        if (tier === 'refused') {
          term.log(T.l0no(name));
          $('.out').innerHTML = `<span style="color:var(--a3)">FATAL_ERROR</span>`;
          $('.viz-verdict').innerHTML = T.vNo; $('.viz-verdict').hidden = false;
          return;
        }
        term.log(tier === 'unvalidated' ? T.l0warn(name) : tier === 'experimental' ? T.l0exp : T.l0ok(t.flags));
        await ctx.sleep(450);
        pipe.set(1); term.log(t.backend === 'cuda' ? T.l1cuda : T.l1hip); await ctx.sleep(450);
        const br = M.dp4aBranch(t), lines = lowered(t, br.id);
        pipe.set(2); term.log(t.backend === 'cuda' ? T.l2cuda : T.l2hip);
        $('.out').innerHTML = [lines[0], SRC[1], lines[2]].join('\n');
        await ctx.sleep(550);
        pipe.set(3); term.log(T.l3(T.branch[br.id], br.file));
        $('.out').innerHTML = lines.join('\n');
        $('[data-s=p-br-v]').textContent = T.branch[br.id];
        $('[data-s=p-br-f]').innerHTML = T.sBranchF(br.file);
        await ctx.sleep(550);
        const fn = { 'cuda-hw': M.dp4aRef, 'cuda-sw': M.dp4aSm60, 'hip-sdwa': M.dp4aSdwa, 'hip-loop': M.dp4aHipLoop }[br.id] || M.dp4aRef;
        const v = fn(DOT_A, DOT_B, DOT_C);
        $('[data-s=p-dot-f]').innerHTML = T.sDotF + T.sDotSame(v);
        pipe.set(4); term.log(t.backend === 'cuda' ? T.l4cuda(t.sm) : T.l4hip(t.arch)); await ctx.sleep(450);
        pipe.set(5); term.log(t.backend === 'cuda' ? T.l5cuda : T.l5hip(t.arch)); await ctx.sleep(300);
        pipe.set(6);
        term.log(T.done(v));
        $('.viz-verdict').innerHTML = T.vOk(T.branch[br.id], v); $('.viz-verdict').hidden = false;
      }
      tBtns.forEach((b, i) => { b.onclick = () => guard(async () => select(i)); });
      goBtn.onclick = () => guard(compile);
      resetBtn.onclick = () => guard(async () => { select(cur); term.clear(); term.log(T.ready); });
      select(0);
    },
  });

  Viz.register('cpu-dispatch', {
    mount(el, ctx) {
      const CPUS = [{ avx2: true, avx512: true }, { avx2: true, avx512: false }, { avx2: false, avx512: false }];
      const body = Viz.frame(el, { code: T.cCode, title: T.cTitle, tag: T.cTag, intro: T.cIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.cLgCheck },
        { color: 'var(--accent)', text: T.cLgPass, glow: true },
        { color: 'var(--a3)', text: T.cLgStop },
      ]));
      const pipe = Viz.pipe(body, T.cSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const sel = (cls, label, opts) => `<label style="display:grid;gap:4px;margin-top:10px;font-size:13px;color:var(--muted);min-width:0">${label}<select class="${cls}" style="min-width:0;max-width:100%;font:inherit;font-size:14px;color:var(--ink);background:var(--paper);border:1px solid var(--frame);padding:6px">${opts}</select></label>`;
      left.insertAdjacentHTML('beforeend',
        sel('cpu', T.cpuLabel, T.cpus.map((s, i) => `<option value="${i}">${Viz.esc(s)}</option>`).join('')) +
        sel('pk', T.packLabel, Object.entries(T.packs).map(([k, s]) => `<option value="${k}"${k === 'iq3_s' ? ' selected' : ''}>${Viz.esc(s)}</option>`).join('')) +
        `<div class="viz-slider"><label>${T.ntLabel}</label><input type="range" min="1" max="4" value="3" aria-label="${Viz.esc(T.ntLabel)}"><output>3</output></div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-family:var(--mono);font-size:12px;min-width:0"><input type="checkbox" class="e512">${T.env512}</label>
        <label style="display:flex;gap:8px;align-items:center;margin-top:6px;font-family:var(--mono);font-size:12px;min-width:0"><input type="checkbox" class="e256">${T.env256}</label>`);
      const term = Viz.term(left);
      right.innerHTML =
        Viz.stat({ id: 'c-path', k: T.sPathK, v: '', f: '', hot: true }) +
        Viz.stat({ id: 'c-wide', k: T.sWideK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', Viz.tryList(T.cTry) + '<div class="viz-verdict" hidden></div>');
      const $ = s => el.querySelector(s);
      let run = 0;

      async function decide() {
        const my = ++run;
        const cpu = CPUS[+$('.cpu').value], pk = $('.pk').value, nt = +$('input[type=range]').value;
        const noIq512 = $('.e512').checked, noIq256 = $('.e256').checked;
        $('output').textContent = String(nt);
        const r = M.cpuPath({ ...cpu, pack: pk, nt, noIq512, noIq256 });
        const lines = [], stops = [];
        lines.push(T.c1(cpu.avx2)); stops.push(0);
        if (cpu.avx2) {
          lines.push(T.c2(T.packs[pk])); stops.push(1);
          if (pk === 'q2_0') { lines.push(T.c3q2(cpu.avx512)); stops.push(2); }
          else {
            lines.push(T.c3(cpu.avx512, cpu.avx512 && noIq512)); stops.push(2);
            lines.push(T.c4(nt)); stops.push(3);
            if (pk === 'iq4_xs' && cpu.avx512 && nt >= M.MT_MIN) { lines.push(T.c5iq4); stops.push(3); }
          }
        }
        if (!r.id.startsWith('refuse')) { lines.push(T.c5(T.paths[r.id])); stops.push(4); }
        term.clear();
        $('.viz-verdict').hidden = true;
        for (let i = 0; i < lines.length; i++) {
          if (my !== run) return;
          pipe.set(stops[i]); term.log(lines[i]);
          await ctx.sleep(260);
        }
        if (my !== run) return;
        pipe.set(r.id.startsWith('refuse') ? stops[stops.length - 1] : 5);
        $('[data-s=c-path-v]').textContent = T.paths[r.id];
        $('[data-s=c-path-v]').style.color = r.id.startsWith('refuse') ? 'var(--a3)' : '';
        $('[data-s=c-path-f]').textContent = T.pathF[r.id];
        const bits = r.id === 'iq512' || r.id === 'strata-vnni' ? 512 : cpu.avx2 ? 256 : 0;
        $('[data-s=c-wide-v]').textContent = bits ? T.int8s(M.lanes(bits, 8)) : T.sWideNone;
        $('[data-s=c-wide-f]').innerHTML = bits ? T.sWideF(bits, M.lanes(bits, 8)) : T.sWideNoneF;
        $('.viz-verdict').innerHTML = T.cVerdict[r.id]; $('.viz-verdict').hidden = false;
      }
      const go = () => { decide().catch(e => { if (ctx.alive) throw e; }); };
      el.querySelectorAll('select, input').forEach(i => { i.oninput = go; i.onchange = go; });
      go();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
