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
        'hip-sdot4': 'v_dot4_i32_i8（sdot4）', 'hip-loop': '可移植的逐字节循环',
      },
      tier: {
        ok: '正常构建', experimental: '实验构建：上游不支持', validated: '维护者在真卡上验证过', community: '用户在真卡上验证过',
        unvalidated: '能编译，但给出警告：还没在真卡上验证', refused: '直接报错，拒绝配置',
      },
      try: [
        '选 <b>RTX 50</b>，再选 <b>RX 7900</b>，各按一次编译：第 1 行从 <code>cudaMalloc</code> 变成 <code>hipMalloc</code>，源码一个字没改。',
        '选 <b>RX 6900</b>：同样一行 dp4a，换成了 RDNA2 的老指令 sdot4。可例题结果仍是 95，整数运算换条路也逐位相同。',
        '选 <b>名单外的架构</b>：流程停在第 1 步。CMake 宁可拒绝，也不编出一个“能跑但没人验证过”的引擎。',
      ],
      l0ok: (flags) => `<span class="c">[cmake]</span> ${flags}：架构在名单里，继续`,
      l0warn: (arch) => `<span class="y">[cmake] 警告</span>：${arch} 能编译，但还没有人在真卡上验证过，请回报结果`,
      l0exp: '<span class="y">[cmake]</span> 打开了 STRATA_EXPERIMENTAL_SM60：低于 7.5 的老卡只走社区实验构建',
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
      vNo: '① CMake 在第一步就拒绝了：这个架构不在名单里。<br>② 拒绝比“编出来再说”更好：一个没人验证过的二进制，可能跑起来算错，却不报任何错。',

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
        'refuse-avx2': '每个 CPU 专家内核最低都要 AVX2、FMA、F16C', 'refuse-avx512': '标准 Q2_0 包的 CPU 内核只有 AVX-512 版本',
        'strata-vnni': '用到 AVX-512 的 VNNI 和 VBMI 两组指令', iq512: '权重解码一次，这组 token 共用', iq256: '同样的思路，换成 256 位寄存器',
        ggml: '每个 token 各自解码一遍权重',
      },
      c1: (ok) => ok ? '<span class="c">[1]</span> CPUID 说：支持 AVX2（含 FMA、F16C）' : '<span class="m">[1]</span> CPUID 说：没有 AVX2。引擎报出 CPU 型号，提示需要 Haswell（2013）、Zen（2017）或更新的 CPU，退出',
      c2: (p) => `<span class="c">[2]</span> 模型包：${p}`,
      c3: (ok, env) => ok ? `<span class="c">[3]</span> CPUID 说：AVX-512 的 F、BW、VL、VNNI、VBMI 都有，操作系统也会保存这组寄存器${env ? '；但环境变量要求不用 AVX-512 内核' : ''}` : '<span class="c">[3]</span> CPUID 说：没有完整的 AVX-512',
      c3q2: (ok) => ok ? '<span class="c">[3]</span> 标准 Q2_0 包需要 AVX-512：这台 CPU 有，放行' : '<span class="m">[3]</span> 标准 Q2_0 包的 CPU 内核只有 AVX-512 版本：在启动时就报错退出，而不是算到第几千个 token 时撞上非法指令',
      c4: (nt) => nt >= M.MT_MIN ? `<span class="c">[4]</span> 这组有 ${nt} 个 token，达到多 token 内核的门槛 ${M.MT_MIN}` : `<span class="c">[4]</span> 这组只有 1 个 token，没到门槛 ${M.MT_MIN}：多 token 内核没有优势`,
      c5: (name) => `<span class="y">[5] 选中</span>：<span class="w">${name}</span>`,
      c5iq4: '<span class="y">注意</span>：IQ4_XS 只有 AVX2 版多 token 内核。AVX-512 的 CPU 不借用它，因为舍入方式会变，于是退回 ggml-cpu',
      cVerdict: {
        'refuse-avx2': '这台 CPU 太老，任何专家内核都跑不了。引擎在第 0 秒说清原因并退出。',
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
        const fn = { 'cuda-hw': M.dp4aRef, 'cuda-sw': M.dp4aSm60, 'hip-loop': M.dp4aHipLoop }[br.id] || M.dp4aRef;
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
