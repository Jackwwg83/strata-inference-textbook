/* Chapter 20 widgets: the prefix-match checker and the copy-on-write branch simulator.
   All visible text lives in the T table below, keyed by language (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.prefix;

  const T = Viz.t({
    zh: {
      code: 'PREFIX_MATCH', title: '检查点能不能用', tag: '规则取自 conversation_cache.hpp · token 为示意',
      intro: '上面一行是引擎存着的检查点，下面一行是新来的请求。点一个场景，看引擎按什么顺序检查、在哪一步放行或拒绝。一个格子代表一个 token，<b>[图A]</b> 代表一张图片占的位置。',
      lgIdle: '还没比较', lgSame: '一致', lgDiff: '不一致', lgTail: '新增的尾巴：要重新读',
      steps: ['收到请求', '比 steering', '比长度', '逐个比 token', '比图片', '给结论'],
      stageLabel: '检查点与新请求逐个 token 对比',
      rowSaved: '检查点（已存）', rowReq: '新请求',
      steer: on => on ? 'steering 开' : 'steering 关',
      tok: { 1: '系统', 2: '提示', 3: '看图', 5: '这是', 6: '什么', 7: '它', 8: '多大', 4: '？', 10: '谁' },
      img: h => h === 0xa ? '[图A]' : '[图B]',
      sc: ['① 追问', '② 改了一个字', '③ 换了一张图', '④ 打开 steering', '⑤ 原样重发'],
      ready: '<span class="c">$</span> ready. 点一个场景按钮，引擎开始逐项检查',
      l0: (name, n) => `<span class="c">[请求]</span> ${name}：新请求共 ${n} 个 token`,
      l1ok: '<span class="m">steering</span>：两边模式相同，继续',
      l1bad: '<span class="m">steering</span>：模式不同。检查点是按另一种方式算出来的，<span class="y">直接跳过</span>',
      l2ok: (n, len) => `<span class="m">长度</span>：检查点 ${n} 个 &lt; 请求 ${len} 个，继续`,
      l2bad: (n, len) => `<span class="m">长度</span>：检查点 ${n} 个，请求也只有 ${len} 个。最后一个 token 必须留给下一轮验证去读，<span class="y">这个检查点不能用</span>`,
      l3ok: n => `<span class="m">token</span>：前 ${n} 个逐个相同`,
      l3bad: i => `<span class="m">token</span>：第 ${i + 1} 个不同，<span class="y">前缀断了</span>，整个检查点作废`,
      l4ok: '<span class="m">图片</span>：前缀里的图片位置和哈希都一致',
      l4bad: '<span class="m">图片</span>：占位 token 一样，图片哈希不同。<span class="y">内容换了，不能复用</span>',
      l5hit: (n, tail) => `<span class="c">→ 命中</span>：复用 ${n} 个 token 的状态，只读后面 ${tail} 个`,
      l5miss: len => `<span class="y">→ 未命中</span>：${len} 个 token 从头读`,
      sReuseK: '可复用的 token', sReuseF: '<b>= 检查点长度</b><br>四项检查全部通过才算数',
      sTailK: '要重新读的 token', sTailF: '<b>= 请求长度 − 可复用长度</b>',
      sScaleK: '放大到真实对话', sScaleHit: '省约 30 秒', sScaleMiss: '省 0 秒',
      sScaleF: '<b>假设前缀 30,000 个 token，读取约每秒 1,000 个</b><br>30,000 ÷ 1,000 = 30 s（教学推演）',
      try: [
        '点 <b>① 追问</b>：前 6 个 token 全部一致，引擎只读后面 3 个。多轮对话的追问就是这种情况。',
        '点 <b>③ 换了一张图</b>：token 一个不差，照样被拒。占位 token 只说“这里有图”，不说“是哪张图”。',
        '点 <b>⑤ 原样重发</b>：内容完全相同，这个检查点反而不能用。最后一个 token 必须真的读一遍，才能开始生成。',
      ],
      verdict: {
        hit: '前缀的 token、图片、steering 模式都一致，检查点又比请求短：可以接着读。引擎省下了前缀的全部计算。',
        steering: 'steering 模式不同，模型许多层的中间结果本来就不一样。token 再一致也不能复用。',
        'not-shorter': '检查点和请求一样长：没有剩下的 token 去启动下一轮验证。这个检查点不能用，引擎会找更短的检查点，或者从头读。',
        tokens: '只要有一个 token 不同，后面所有位置的计算都跟着变。前缀复用只认“一字不差”。',
        image: '图片在 token 序列里只是一串占位符。引擎另外记录每张图的位置和哈希，图一换就不复用。',
        empty: '空检查点没有可复用的内容。',
      },

      cCode: 'COW_BRANCH', cTitle: '一个前缀，两个分支', cTag: '教学推演 · 示意模型，非 Strata 实现',
      cIntro: '对话 A 和 B 有一段相同的前缀，然后各说各的。比较两种做法：<b>整份复制</b>在分叉时把前缀全抄一份；<b>写时复制</b>先共用，谁要往共享页里写，谁才复制那一页。每页装 4 个 token（示意）。',
      cLgPre: '前缀里的 token', cLgNew: '分叉后新写的 token', cLgOwn: '一个分支独占的页', cLgShared: '两个分支共用的页（×2 = 引用计数）', cLgCopy: '复制出来的页或状态',
      cSteps: ['读完前缀', '拍快照、分叉', 'A 写入', 'B 写入', '结算'],
      cStage: '两个分支各自看到的页',
      rowA: 'A 看到的', rowB: 'B 看到的', notYet: '（还没分叉）',
      stateLbl: '状态', stateCopy: '复制',
      kShared: '×2', kCopied: '复制', kInplace: '原地写',
      mCopy: '整份复制', mCow: '写时复制',
      pLabel: '前缀长度（token）', aLabel: 'A 新写（token）', bLabel: 'B 新写（token）',
      bStep: '▶ 单步', bAll: '▶▶ 跑完', bReset: '重置',
      cReady: '<span class="c">$</span> ready. 选一种做法，按 [ ▶ 单步 ]',
      c1: (n, p) => `<span class="c">[前缀]</span> 读完 ${n} 个 token，占 ${p} 页，递推状态停在第 ${n} 个 token`,
      c2copy: p => `<span class="m">分叉</span>：整份复制，把 ${p} 页前缀全抄给 B，再给 B 复制一份递推状态`,
      c2cow: p => `<span class="m">分叉</span>：写时复制，${p} 页前缀两边共用（引用计数 2）。递推状态仍要给 B 复制一份`,
      c3: (t, c) => `<span class="w">A 写入</span> ${t} 个 token` + (c ? '：要写的页是共享的，<span class="y">先复制这一页</span>' : ''),
      c4: (t, c) => `<span class="w">B 写入</span> ${t} 个 token` + (c ? '：那一页已经只剩 B 在用，<span class="y">原地写，不用复制</span>' : ''),
      c4copy: (t, c) => `<span class="w">B 写入</span> ${t} 个 token` + (c ? '：A 没写过这一页，B 是第一个写的，<span class="y">先复制</span>' : ''),
      c5: (phys, cp) => `<span class="c">结算</span>：物理页 ${phys} 页，其中复制 ${cp} 页`,
      sPhysK: '实际占用的物理页',
      sPhysCopy: (p, a, b) => `<b>= 2 × 前缀 ${p} 页 + A 新页 ${a} + B 新页 ${b}</b>`,
      sPhysCow: (p, c, a, b) => `<b>= 前缀 ${p} 页 + 复制 ${c} 页 + A 新页 ${a} + B 新页 ${b}</b>`,
      sCopyK: '分叉时复制的页',
      sCopyFCopy: '<b>= 整个前缀</b><br>分叉那一刻一次抄完',
      sCopyFCow: '<b>= 被写到的共享页</b><br>前缀正好填满整页时为 0',
      sSaveK: '写时复制比整份复制少占',
      sSaveF: '<b>= 整份复制的页数 − 写时复制的页数</b>',
      sStateK: '递推状态',
      sStateV: '每分支 1 份',
      sStateF: '<b>每读一个 token 就整块改写，没法共用</b><br>分叉时复制一整块。按 Strata 的几何约 113 MB',
      pages: n => `${n} 页`,
      cTry: [
        '选 <b>写时复制</b>，前缀设成 <b>16</b>（正好 4 整页），A、B 各写 3 个：一页都不用复制。前缀对齐到页边界时，分叉几乎免费。',
        '把前缀改成 <b>17</b>，再跑一遍：多出半页，两边都要往里写，第一个写的人必须先复制这一页。',
        '切到 <b>整份复制</b> 跑同样的设置：前缀越长，多占的页越多。但两种做法里，递推状态都得复制一份。',
      ],
      cVerdictCow: (c, save) => `写时复制只复制了 <b>${c}</b> 页，比整份复制少占 <b>${save}</b> 页。共享的页只读不写，所以可以放心共用。递推状态没法这样省：它每个 token 都整块改写，分叉时只能整份复制。`,
      cVerdictCopy: (c, save) => `整份复制在分叉时抄了 <b>${c}</b> 页。换成写时复制能少占 <b>${save}</b> 页。前缀越长，差距越大。`,
    },
    en: {
      code: 'PREFIX_MATCH', title: 'Can this checkpoint be used?', tag: 'Rules from conversation_cache.hpp · tokens are illustrative',
      intro: 'The top row is a checkpoint the engine has saved; the bottom row is a new request. Click a scenario to see in what order the engine checks, and at which step it lets the checkpoint through or rejects it. Each cell is one token; <b>[imgA]</b> marks the spot an image takes.',
      lgIdle: 'Not compared yet', lgSame: 'Match', lgDiff: 'Mismatch', lgTail: 'New tail: must be read',
      steps: ['Request arrives', 'Check steering', 'Check length', 'Compare tokens', 'Check images', 'Decide'],
      stageLabel: 'Checkpoint and new request compared token by token',
      rowSaved: 'Checkpoint (saved)', rowReq: 'New request',
      steer: on => on ? 'steering on' : 'steering off',
      tok: { 1: 'System', 2: 'prompt', 3: 'Look:', 5: 'What\'s', 6: 'this', 7: 'How', 8: 'big', 4: '?', 10: 'that' },
      img: h => h === 0xa ? '[imgA]' : '[imgB]',
      sc: ['① Follow-up', '② One word changed', '③ Different image', '④ Steering on', '⑤ Exact resend'],
      ready: '<span class="c">$</span> ready. Click a scenario button and the engine starts checking',
      l0: (name, n) => `<span class="c">[request]</span> ${name}: the new request has ${n} tokens`,
      l1ok: '<span class="m">steering</span>: both sides use the same mode, continue',
      l1bad: '<span class="m">steering</span>: different modes. The checkpoint was computed another way, so <span class="y">skip it</span>',
      l2ok: (n, len) => `<span class="m">length</span>: checkpoint ${n} &lt; request ${len}, continue`,
      l2bad: (n, len) => `<span class="m">length</span>: the checkpoint has ${n} tokens and the request only ${len}. The last token must be left for the next verify round to read, so <span class="y">this checkpoint cannot be used</span>`,
      l3ok: n => `<span class="m">tokens</span>: the first ${n} match one by one`,
      l3bad: i => `<span class="m">tokens</span>: token ${i + 1} differs, <span class="y">the prefix breaks</span>, and the whole checkpoint is void`,
      l4ok: '<span class="m">images</span>: image positions and hashes in the prefix all match',
      l4bad: '<span class="m">images</span>: same placeholder tokens, different image hash. <span class="y">The content changed, so no reuse</span>',
      l5hit: (n, tail) => `<span class="c">→ hit</span>: reuse the state of ${n} tokens and read only the next ${tail}`,
      l5miss: len => `<span class="y">→ miss</span>: read all ${len} tokens from the start`,
      sReuseK: 'Reusable tokens', sReuseF: '<b>= checkpoint length</b><br>counts only if all four checks pass',
      sTailK: 'Tokens to read again', sTailF: '<b>= request length − reusable length</b>',
      sScaleK: 'Scaled up to a real chat', sScaleHit: 'saves about 30 s', sScaleMiss: 'saves 0 s',
      sScaleF: '<b>Assume a 30,000-token prefix read at about 1,000 per second</b><br>30,000 ÷ 1,000 = 30 s (teaching estimate)',
      try: [
        'Click <b>① Follow-up</b>: the first 6 tokens all match, and the engine reads only the last 3. This is what a follow-up in a multi-turn chat looks like.',
        'Click <b>③ Different image</b>: not a single token differs, yet it is rejected. A placeholder token only says "an image goes here", not "which image".',
        'Click <b>⑤ Exact resend</b>: the content is identical, yet this checkpoint cannot be used. The last token must really be read before generation can start.',
      ],
      verdict: {
        hit: 'The prefix\'s tokens, images and steering mode all match, and the checkpoint is shorter than the request: reading can resume. The engine skipped all the computation for the prefix.',
        steering: 'With a different steering mode, the intermediate results of many layers were different to begin with. However well the tokens match, there is no reuse.',
        'not-shorter': 'The checkpoint is as long as the request: no token is left to start the next verify round. This checkpoint cannot be used; the engine will look for a shorter one or read from the start.',
        tokens: 'If even one token differs, the computation at every later position changes too. Prefix reuse accepts only an exact match.',
        image: 'In the token sequence an image is just a run of placeholders. The engine records each image\'s position and hash separately, and a swapped image means no reuse.',
        empty: 'An empty checkpoint has nothing to reuse.',
      },

      cCode: 'COW_BRANCH', cTitle: 'One prefix, two branches', cTag: 'Teaching estimate · illustrative model, not Strata\'s implementation',
      cIntro: 'Conversations A and B share a prefix, then each goes its own way. Compare two approaches: <b>full copy</b> copies the whole prefix at the fork; <b>copy-on-write</b> shares first, and whoever writes into a shared page copies that page first. Each page holds 4 tokens (illustrative).',
      cLgPre: 'Token in the prefix', cLgNew: 'Token written after the fork', cLgOwn: 'Page owned by one branch', cLgShared: 'Page shared by both branches (×2 = reference count)', cLgCopy: 'Copied page or state',
      cSteps: ['Prefix read', 'Snapshot, fork', 'A writes', 'B writes', 'Tally'],
      cStage: 'The pages each branch sees',
      rowA: 'A sees', rowB: 'B sees', notYet: '(not forked yet)',
      stateLbl: 'State', stateCopy: 'copied',
      kShared: '×2', kCopied: 'copy', kInplace: 'direct',
      mCopy: 'Full copy', mCow: 'Copy-on-write',
      pLabel: 'Prefix length (tokens)', aLabel: 'A writes (tokens)', bLabel: 'B writes (tokens)',
      bStep: '▶ Step', bAll: '▶▶ Run to end', bReset: 'Reset',
      cReady: '<span class="c">$</span> ready. Pick an approach and press [ ▶ Step ]',
      c1: (n, p) => `<span class="c">[prefix]</span> read ${n} tokens in ${p} pages; the recurrent state stops at token ${n}`,
      c2copy: p => `<span class="m">fork</span>: full copy. All ${p} prefix pages are copied for B, plus a copy of the recurrent state for B`,
      c2cow: p => `<span class="m">fork</span>: copy-on-write. The ${p} prefix pages are shared by both sides (reference count 2). B still needs its own copy of the recurrent state`,
      c3: (t, c) => `<span class="w">A writes</span> ${t} tokens` + (c ? ': the page it writes is shared, so <span class="y">copy that page first</span>' : ''),
      c4: (t, c) => `<span class="w">B writes</span> ${t} tokens` + (c ? ': only B uses that page now, so <span class="y">write in place, no copy</span>' : ''),
      c4copy: (t, c) => `<span class="w">B writes</span> ${t} tokens` + (c ? ': A never wrote this page and B is the first writer, so <span class="y">copy first</span>' : ''),
      c5: (phys, cp) => `<span class="c">Tally</span>: ${phys} physical pages, of which ${cp} copied`,
      sPhysK: 'Physical pages actually used',
      sPhysCopy: (p, a, b) => `<b>= 2 × prefix ${p} pages + A's new ${a} + B's new ${b}</b>`,
      sPhysCow: (p, c, a, b) => `<b>= prefix ${p} pages + copied ${c} + A's new ${a} + B's new ${b}</b>`,
      sCopyK: 'Pages copied at the fork',
      sCopyFCopy: '<b>= the whole prefix</b><br>copied all at once at the fork',
      sCopyFCow: '<b>= shared pages that get written</b><br>0 when the prefix exactly fills whole pages',
      sSaveK: 'Pages copy-on-write saves over a full copy',
      sSaveF: '<b>= full-copy pages − copy-on-write pages</b>',
      sStateK: 'Recurrent state',
      sStateV: '1 per branch',
      sStateF: '<b>Rewritten whole for every token read, so it cannot be shared</b><br>copy a whole block at the fork. With Strata\'s geometry, about 113 MB',
      pages: n => `${n} pages`,
      cTry: [
        'Pick <b>copy-on-write</b>, set the prefix to <b>16</b> (exactly 4 full pages), and let A and B write 3 each: no page needs copying. When the prefix lines up with a page boundary, a fork is nearly free.',
        'Change the prefix to <b>17</b> and run again: the extra half page gets written by both sides, so the first writer must copy it first.',
        'Switch to <b>full copy</b> with the same settings: the longer the prefix, the more extra pages. But with either approach, the recurrent state must be copied once.',
      ],
      cVerdictCow: (c, save) => `Copy-on-write copied only <b>${c}</b> pages and uses <b>${save}</b> fewer pages than a full copy. Shared pages are only read, never written, so sharing them is safe. The recurrent state cannot be saved this way: every token rewrites it whole, so a fork can only copy it in full.`,
      cVerdictCopy: (c, save) => `The full copy copied <b>${c}</b> pages at the fork. Copy-on-write would use <b>${save}</b> fewer pages. The longer the prefix, the bigger the gap.`,
    },
    ko: {
      code: 'PREFIX_MATCH', title: '이 체크포인트를 쓸 수 있을까?', tag: '규칙 출처: conversation_cache.hpp · 토큰은 예시',
      intro: '위쪽 줄은 엔진이 저장해 둔 체크포인트이고, 아래쪽 줄은 새로 온 요청이에요. 시나리오를 눌러 엔진이 어떤 순서로 검사하고, 어느 단계에서 통과시키거나 거부하는지 보세요. 칸 하나가 토큰 하나이고, <b>[그림A]</b>는 이미지 하나가 차지하는 자리예요.',
      lgIdle: '아직 비교 전', lgSame: '일치', lgDiff: '불일치', lgTail: '새로 늘어난 꼬리: 다시 읽어야 해요',
      steps: ['요청 도착', 'steering 비교', '길이 비교', '토큰 하나씩 비교', '이미지 비교', '결론'],
      stageLabel: '체크포인트와 새 요청을 토큰 단위로 비교',
      rowSaved: '체크포인트(저장됨)', rowReq: '새 요청',
      steer: on => on ? 'steering 켬' : 'steering 끔',
      tok: { 1: '시스템', 2: '프롬프트', 3: '보세요', 5: '이게', 6: '뭐야', 7: '얼마나', 8: '커요', 4: '?', 10: '누구' },
      img: h => h === 0xa ? '[그림A]' : '[그림B]',
      sc: ['① 후속 질문', '② 한 글자 변경', '③ 이미지 교체', '④ steering 켬', '⑤ 그대로 재전송'],
      ready: '<span class="c">$</span> ready. 시나리오 버튼을 누르면 엔진이 항목별로 검사해요',
      l0: (name, n) => `<span class="c">[요청]</span> ${name}: 새 요청은 토큰 ${n}개예요`,
      l1ok: '<span class="m">steering</span>: 두 쪽의 모드가 같아요. 계속해요',
      l1bad: '<span class="m">steering</span>: 모드가 달라요. 체크포인트는 다른 방식으로 계산된 거라서 <span class="y">바로 건너뛰어요</span>',
      l2ok: (n, len) => `<span class="m">길이</span>: 체크포인트 ${n}개 &lt; 요청 ${len}개예요. 계속해요`,
      l2bad: (n, len) => `<span class="m">길이</span>: 체크포인트가 ${n}개인데 요청도 ${len}개뿐이에요. 마지막 토큰은 다음 검증 라운드를 위해 남겨 둬야 해서 <span class="y">이 체크포인트는 쓸 수 없어요</span>`,
      l3ok: n => `<span class="m">토큰</span>: 앞의 ${n}개가 하나씩 모두 같아요`,
      l3bad: i => `<span class="m">토큰</span>: ${i + 1}번째가 달라요. <span class="y">접두부가 끊겼어요</span>. 체크포인트 전체가 무효예요`,
      l4ok: '<span class="m">이미지</span>: 접두부 안의 이미지 위치와 해시가 모두 같아요',
      l4bad: '<span class="m">이미지</span>: 자리표시 토큰은 같은데 이미지 해시가 달라요. <span class="y">내용이 바뀌었으니 재사용할 수 없어요</span>',
      l5hit: (n, tail) => `<span class="c">→ 히트</span>: 토큰 ${n}개의 상태를 재사용하고 뒤의 ${tail}개만 읽어요`,
      l5miss: len => `<span class="y">→ 미스</span>: 토큰 ${len}개를 처음부터 읽어요`,
      sReuseK: '재사용 가능한 토큰', sReuseF: '<b>= 체크포인트 길이</b><br>네 가지 검사를 모두 통과해야 인정돼요',
      sTailK: '다시 읽어야 하는 토큰', sTailF: '<b>= 요청 길이 − 재사용 길이</b>',
      sScaleK: '실제 대화로 키우면', sScaleHit: '약 30초 절약', sScaleMiss: '0초 절약',
      sScaleF: '<b>접두부 토큰 30,000개, 읽기 속도 초당 약 1,000개로 가정</b><br>30,000 ÷ 1,000 = 30 s(교육용 추정)',
      try: [
        '<b>① 후속 질문</b>을 눌러 보세요. 앞의 토큰 6개가 모두 같아서 엔진은 뒤의 3개만 읽어요. 멀티턴 대화의 후속 질문이 바로 이 경우예요.',
        '<b>③ 이미지 교체</b>를 눌러 보세요. 토큰은 하나도 안 달라도 거부돼요. 자리표시 토큰은 "여기 이미지가 있다"고만 말하고 "어떤 이미지인지"는 말하지 않아요.',
        '<b>⑤ 그대로 재전송</b>을 눌러 보세요. 내용이 완전히 같은데도 이 체크포인트는 쓸 수 없어요. 마지막 토큰은 실제로 읽어야 생성을 시작할 수 있어요.',
      ],
      verdict: {
        hit: '접두부의 토큰, 이미지, steering 모드가 모두 같고 체크포인트도 요청보다 짧아요. 이어서 읽을 수 있어요. 엔진이 접두부 계산 전부를 아꼈어요.',
        steering: 'steering 모드가 다르면 모델 여러 층의 중간 결과가 애초에 달라요. 토큰이 같아도 재사용할 수 없어요.',
        'not-shorter': '체크포인트와 요청의 길이가 같아요. 다음 검증 라운드를 시작할 토큰이 남지 않아요. 이 체크포인트는 쓸 수 없고, 엔진은 더 짧은 체크포인트를 찾거나 처음부터 읽어요.',
        tokens: '토큰이 하나라도 다르면 그 뒤 모든 위치의 계산이 따라서 달라져요. 접두부 재사용은 "한 글자도 다르지 않을 때"만 인정해요.',
        image: '이미지는 토큰열에서 자리표시 토큰 몇 개일 뿐이에요. 엔진이 이미지마다 위치와 해시를 따로 기록하고, 이미지가 바뀌면 재사용하지 않아요.',
        empty: '빈 체크포인트에는 재사용할 내용이 없어요.',
      },

      cCode: 'COW_BRANCH', cTitle: '접두부 하나, 분기 둘', cTag: '교육용 추정 · 예시 모델, Strata 구현 아님',
      cIntro: '대화 A와 B는 앞부분이 같고, 그다음부터 각자 이야기해요. 두 방식을 비교해 보세요. <b>전체 복사</b>는 분기할 때 접두부를 통째로 복사해요. <b>쓰기 시 복사</b>는 먼저 함께 쓰다가, 공유 페이지에 쓰려는 쪽이 그 페이지만 복사해요. 페이지 하나에 토큰 4개가 들어가요(예시).',
      cLgPre: '접두부의 토큰', cLgNew: '분기 후 새로 쓴 토큰', cLgOwn: '분기 하나가 독점하는 페이지', cLgShared: '두 분기가 함께 쓰는 페이지(×2 = 참조 카운트)', cLgCopy: '복사해서 만든 페이지 또는 상태',
      cSteps: ['접두부 읽기', '스냅샷, 분기', 'A 쓰기', 'B 쓰기', '정산'],
      cStage: '두 분기가 각자 보는 페이지',
      rowA: 'A가 보는 것', rowB: 'B가 보는 것', notYet: '(아직 분기 전)',
      stateLbl: '상태', stateCopy: '복사',
      kShared: '×2', kCopied: '복사', kInplace: '제자리 쓰기',
      mCopy: '전체 복사', mCow: '쓰기 시 복사',
      pLabel: '접두부 길이(토큰)', aLabel: 'A가 새로 쓴 토큰', bLabel: 'B가 새로 쓴 토큰',
      bStep: '▶ 한 단계', bAll: '▶▶ 끝까지', bReset: '초기화',
      cReady: '<span class="c">$</span> ready. 방식을 고르고 [ ▶ 한 단계 ]를 누르세요',
      c1: (n, p) => `<span class="c">[접두부]</span> 토큰 ${n}개를 읽었고 ${p}페이지를 차지해요. 재귀 상태는 ${n}번째 토큰에 있어요`,
      c2copy: p => `<span class="m">분기</span>: 전체 복사예요. 접두부 ${p}페이지를 B에게 통째로 복사하고, B용 재귀 상태도 하나 복사해요`,
      c2cow: p => `<span class="m">분기</span>: 쓰기 시 복사예요. 접두부 ${p}페이지를 두 쪽이 함께 써요(참조 카운트 2). 재귀 상태는 그래도 B용으로 하나 복사해야 해요`,
      c3: (t, c) => `<span class="w">A 쓰기</span> 토큰 ${t}개` + (c ? ': 쓸 페이지가 공유 중이라서 <span class="y">먼저 이 페이지를 복사해요</span>' : ''),
      c4: (t, c) => `<span class="w">B 쓰기</span> 토큰 ${t}개` + (c ? ': 그 페이지는 이제 B만 쓰고 있어서 <span class="y">제자리에 쓰면 돼요. 복사는 필요 없어요</span>' : ''),
      c4copy: (t, c) => `<span class="w">B 쓰기</span> 토큰 ${t}개` + (c ? ': A는 이 페이지에 쓰지 않았고 B가 처음 쓰는 거라서 <span class="y">먼저 복사해요</span>' : ''),
      c5: (phys, cp) => `<span class="c">정산</span>: 물리 페이지 ${phys}개, 그중 복사한 것은 ${cp}개예요`,
      sPhysK: '실제로 차지하는 물리 페이지',
      sPhysCopy: (p, a, b) => `<b>= 2 × 접두부 ${p}페이지 + A 새 페이지 ${a} + B 새 페이지 ${b}</b>`,
      sPhysCow: (p, c, a, b) => `<b>= 접두부 ${p}페이지 + 복사 ${c}페이지 + A 새 페이지 ${a} + B 새 페이지 ${b}</b>`,
      sCopyK: '분기할 때 복사하는 페이지',
      sCopyFCopy: '<b>= 접두부 전체</b><br>분기하는 순간에 한꺼번에 복사해요',
      sCopyFCow: '<b>= 쓰기가 일어나는 공유 페이지</b><br>접두부가 페이지를 딱 채우면 0이에요',
      sSaveK: '쓰기 시 복사가 전체 복사보다 덜 차지하는 양',
      sSaveF: '<b>= 전체 복사의 페이지 수 − 쓰기 시 복사의 페이지 수</b>',
      sStateK: '재귀 상태',
      sStateV: '분기마다 1개',
      sStateF: '<b>토큰을 읽을 때마다 통째로 덮어써서 함께 쓸 수 없어요</b><br>분기할 때 한 덩어리를 복사해요. Strata의 기하 구조로는 약 113 MB예요',
      pages: n => `${n}페이지`,
      cTry: [
        '<b>쓰기 시 복사</b>를 고르고 접두부를 <b>16</b>(딱 4페이지)으로, A와 B가 각각 3개를 쓰게 해 보세요. 복사할 페이지가 하나도 없어요. 접두부가 페이지 경계에 맞으면 분기는 거의 공짜예요.',
        '접두부를 <b>17</b>로 바꿔 다시 돌려 보세요. 반 페이지가 더 생기고, 두 쪽이 모두 거기에 써야 해서 먼저 쓰는 쪽이 이 페이지를 복사해야 해요.',
        '<b>전체 복사</b>로 바꿔 같은 설정으로 돌려 보세요. 접두부가 길수록 더 많은 페이지를 차지해요. 하지만 두 방식 모두 재귀 상태는 하나 복사해야 해요.',
      ],
      cVerdictCow: (c, save) => `쓰기 시 복사는 <b>${c}</b>페이지만 복사했고, 전체 복사보다 <b>${save}</b>페이지를 덜 차지해요. 공유 페이지는 읽기만 하고 쓰지 않으니 안심하고 함께 쓸 수 있어요. 재귀 상태는 이렇게 아낄 수 없어요. 토큰마다 통째로 덮어쓰니까, 분기할 때 한 덩어리를 통째로 복사해야 해요.`,
      cVerdictCopy: (c, save) => `전체 복사는 분기할 때 <b>${c}</b>페이지를 복사했어요. 쓰기 시 복사로 바꾸면 <b>${save}</b>페이지를 덜 차지해요. 접두부가 길수록 차이가 커져요.`,
    },
    ja: {
      code: 'PREFIX_MATCH', title: 'このチェックポイントは使える？', tag: 'ルールは conversation_cache.hpp より · トークンは説明用',
      intro: '上の行はエンジンが保存しているチェックポイント、下の行は新しいリクエストです。シナリオを選ぶと、エンジンがどの順番で調べ、どの段階で通すか断るかが見えます。1 マスが 1 トークンで、<b>[図A]</b> は画像が占める場所です。',
      lgIdle: '未比較', lgSame: '一致', lgDiff: '不一致', lgTail: '新しい末尾：読み直しが必要',
      steps: ['リクエスト受信', 'steering を比較', '長さを比較', 'トークンを比較', '画像を比較', '結論'],
      stageLabel: 'チェックポイントと新しいリクエストをトークンごとに比較',
      rowSaved: 'チェックポイント（保存済み）', rowReq: '新しいリクエスト',
      steer: on => on ? 'steering オン' : 'steering オフ',
      tok: { 1: '指示', 2: '文', 3: '見て', 5: 'これ', 6: '何', 7: 'それ', 8: '大きさ', 4: '？', 10: '誰' },
      img: h => h === 0xa ? '[図A]' : '[図B]',
      sc: ['① 追加の質問', '② 1 語だけ変更', '③ 画像を差し替え', '④ steering をオン', '⑤ そのまま再送'],
      ready: '<span class="c">$</span> ready. シナリオのボタンを押すと、エンジンが項目ごとに調べ始めます',
      l0: (name, n) => `<span class="c">[リクエスト]</span> ${name}：新しいリクエストは全部で ${n} トークン`,
      l1ok: '<span class="m">steering</span>：両方とも同じモード。続行',
      l1bad: '<span class="m">steering</span>：モードが違います。チェックポイントは別の方法で計算されたものなので、<span class="y">そのまま飛ばします</span>',
      l2ok: (n, len) => `<span class="m">長さ</span>：チェックポイント ${n} 個 &lt; リクエスト ${len} 個。続行`,
      l2bad: (n, len) => `<span class="m">長さ</span>：チェックポイントは ${n} 個、リクエストも ${len} 個だけ。最後のトークンは次の検証ラウンドで読むために残す必要があるので、<span class="y">このチェックポイントは使えません</span>`,
      l3ok: n => `<span class="m">トークン</span>：先頭の ${n} 個が 1 つずつ一致`,
      l3bad: i => `<span class="m">トークン</span>：${i + 1} 個目が違います。<span class="y">プレフィックスが途切れた</span>ので、チェックポイント全体が無効です`,
      l4ok: '<span class="m">画像</span>：プレフィックス内の画像の位置とハッシュがすべて一致',
      l4bad: '<span class="m">画像</span>：プレースホルダのトークンは同じですが、画像のハッシュが違います。<span class="y">中身が変わったので再利用できません</span>',
      l5hit: (n, tail) => `<span class="c">→ ヒット</span>：${n} トークン分の状態を再利用し、後ろの ${tail} 個だけ読みます`,
      l5miss: len => `<span class="y">→ ミス</span>：${len} トークンを最初から読みます`,
      sReuseK: '再利用できるトークン', sReuseF: '<b>= チェックポイントの長さ</b><br>4 つの検査すべてに通ったときだけ数えます',
      sTailK: '読み直すトークン', sTailF: '<b>= リクエストの長さ − 再利用できる長さ</b>',
      sScaleK: '実際の会話に拡大すると', sScaleHit: '約 30 秒の節約', sScaleMiss: '節約 0 秒',
      sScaleF: '<b>プレフィックスを 30,000 トークン、読み取り速度を毎秒約 1,000 個と仮定</b><br>30,000 ÷ 1,000 = 30 s（教育用の試算）',
      try: [
        '<b>① 追加の質問</b>を押します。先頭の 6 トークンはすべて一致し、エンジンは後ろの 3 個だけ読みます。マルチターン会話の追加質問はこの状況です。',
        '<b>③ 画像を差し替え</b>を押します。トークンは 1 つも違わないのに断られます。プレースホルダのトークンは「ここに画像がある」と言うだけで、「どの画像か」は言わないからです。',
        '<b>⑤ そのまま再送</b>を押します。内容がまったく同じなのに、このチェックポイントは使えません。生成を始めるには、最後のトークンを実際に読む必要があるからです。',
      ],
      verdict: {
        hit: 'プレフィックスのトークン、画像、steering モードがすべて一致し、チェックポイントはリクエストより短いので、続きから読めます。エンジンはプレフィックス全体の計算を省けました。',
        steering: 'steering モードが違うと、モデルの多くの層の途中結果がもともと違います。トークンがいくら一致しても再利用できません。',
        'not-shorter': 'チェックポイントがリクエストと同じ長さです。次の検証ラウンドを始めるためのトークンが残っていません。このチェックポイントは使えないので、エンジンはもっと短いチェックポイントを探すか、最初から読みます。',
        tokens: 'トークンが 1 つでも違うと、それ以降のすべての位置の計算が変わります。プレフィックスの再利用は「一字一句同じ」だけを認めます。',
        image: '画像はトークン列の中ではプレースホルダが並んでいるだけです。エンジンは各画像の位置とハッシュを別に記録していて、画像が変わると再利用しません。',
        empty: '空のチェックポイントには再利用できる内容がありません。',
      },

      cCode: 'COW_BRANCH', cTitle: '1 つのプレフィックス、2 つの分岐', cTag: '教育用の試算 · 説明用のモデルで、Strata の実装ではありません',
      cIntro: '会話 A と B は同じプレフィックスを持ち、そこから別々に進みます。2 つの方法を比べます。<b>全体コピー</b>は分岐の時点でプレフィックスを丸ごとコピーします。<b>コピーオンライト</b>はまず共有し、共有ページに書き込む側がそのページだけをコピーします。1 ページは 4 トークン分です（説明用）。',
      cLgPre: 'プレフィックスのトークン', cLgNew: '分岐後に書いたトークン', cLgOwn: '1 つの分岐だけが持つページ', cLgShared: '2 つの分岐が共有するページ（×2 = 参照カウント）', cLgCopy: 'コピーされたページや状態',
      cSteps: ['プレフィックスを読む', 'スナップショットと分岐', 'A が書く', 'B が書く', '集計'],
      cStage: '各分岐から見えるページ',
      rowA: 'A から見える', rowB: 'B から見える', notYet: '（まだ分岐前）',
      stateLbl: '状態', stateCopy: '複製',
      kShared: '×2', kCopied: '複製', kInplace: '直接',
      mCopy: '全体コピー', mCow: 'コピーオンライト',
      pLabel: 'プレフィックス長（トークン）', aLabel: 'A の書き込み（トークン）', bLabel: 'B の書き込み（トークン）',
      bStep: '▶ 1 歩進む', bAll: '▶▶ 最後まで', bReset: 'リセット',
      cReady: '<span class="c">$</span> ready. 方法を選んで [ ▶ 1 歩進む ] を押してください',
      c1: (n, p) => `<span class="c">[プレフィックス]</span> ${n} トークンを読み終え、${p} ページを使用。再帰状態は ${n} 個目のトークンで止まっています`,
      c2copy: p => `<span class="m">分岐</span>：全体コピー。${p} ページのプレフィックスをすべて B にコピーし、再帰状態も B 用に 1 つコピーします`,
      c2cow: p => `<span class="m">分岐</span>：コピーオンライト。${p} ページのプレフィックスは両方で共有（参照カウント 2）。再帰状態は B 用にコピーが必要です`,
      c3: (t, c) => `<span class="w">A が書く</span> ${t} トークン` + (c ? '：書き込むページは共有されているので、<span class="y">先にそのページをコピーします</span>' : ''),
      c4: (t, c) => `<span class="w">B が書く</span> ${t} トークン` + (c ? '：そのページはもう B だけが使っているので、<span class="y">その場で書き込み、コピーは不要です</span>' : ''),
      c4copy: (t, c) => `<span class="w">B が書く</span> ${t} トークン` + (c ? '：A はこのページに書いておらず、B が最初の書き手なので、<span class="y">先にコピーします</span>' : ''),
      c5: (phys, cp) => `<span class="c">集計</span>：物理ページは ${phys} ページ、そのうちコピーは ${cp} ページ`,
      sPhysK: '実際に使う物理ページ',
      sPhysCopy: (p, a, b) => `<b>= 2 × プレフィックス ${p} ページ + A の新ページ ${a} + B の新ページ ${b}</b>`,
      sPhysCow: (p, c, a, b) => `<b>= プレフィックス ${p} ページ + コピー ${c} ページ + A の新ページ ${a} + B の新ページ ${b}</b>`,
      sCopyK: '分岐時にコピーしたページ',
      sCopyFCopy: '<b>= プレフィックス全体</b><br>分岐の瞬間に一度でコピーします',
      sCopyFCow: '<b>= 書き込まれた共有ページ</b><br>プレフィックスがちょうどページ単位で埋まるときは 0',
      sSaveK: 'コピーオンライトで全体コピーより減るページ',
      sSaveF: '<b>= 全体コピーのページ数 − コピーオンライトのページ数</b>',
      sStateK: '再帰状態',
      sStateV: '分岐ごとに 1 つ',
      sStateF: '<b>トークンを 1 つ読むたびに全体を書き換えるので、共有できません</b><br>分岐時にまるごとコピーします。Strata の形状では約 113 MB',
      pages: n => `${n} ページ`,
      cTry: [
        '<b>コピーオンライト</b>を選び、プレフィックスを <b>16</b>（ちょうど 4 ページ分）にして、A と B が 3 個ずつ書きます。コピーするページは 1 つもありません。プレフィックスがページの境界にそろっていると、分岐はほぼ無料です。',
        'プレフィックスを <b>17</b> に変えてもう一度実行します。余った半ページに両方が書くので、先に書く側がまずそのページをコピーする必要があります。',
        '同じ設定で<b>全体コピー</b>に切り替えます。プレフィックスが長いほど、余分に使うページが増えます。ただし、どちらの方法でも再帰状態は 1 つコピーする必要があります。',
      ],
      cVerdictCow: (c, save) => `コピーオンライトがコピーしたのは <b>${c}</b> ページだけで、全体コピーより <b>${save}</b> ページ少なく済みます。共有ページは読むだけで書かないので、安心して共有できます。再帰状態はこの方法では節約できません。トークンごとに全体を書き換えるので、分岐時にはまるごとコピーするしかありません。`,
      cVerdictCopy: (c, save) => `全体コピーは分岐時に <b>${c}</b> ページをコピーしました。コピーオンライトなら <b>${save}</b> ページ少なく済みます。プレフィックスが長いほど、差は大きくなります。`,
    },
    es: {
      code: 'PREFIX_MATCH', title: '¿Puede usarse este checkpoint?', tag: 'Reglas de conversation_cache.hpp · los tokens son ilustrativos',
      intro: 'La fila de arriba es un checkpoint que el motor ha guardado; la de abajo es una solicitud nueva. Pulsa un escenario para ver en qué orden comprueba el motor, y en qué paso deja pasar o rechaza el checkpoint. Cada celda es un token; <b>[imgA]</b> marca el lugar que ocupa una imagen.',
      lgIdle: 'Aún sin comparar', lgSame: 'Coincide', lgDiff: 'No coincide', lgTail: 'Cola nueva: hay que leerla',
      steps: ['Llega la solicitud', 'Revisar steering', 'Revisar longitud', 'Comparar tokens', 'Revisar imágenes', 'Decidir'],
      stageLabel: 'Checkpoint y solicitud nueva comparados token a token',
      rowSaved: 'Checkpoint (guardado)', rowReq: 'Solicitud nueva',
      steer: on => on ? 'steering activo' : 'steering inactivo',
      tok: { 1: 'Sistema', 2: 'prompt', 3: 'Mira:', 5: 'Qué', 6: 'es', 7: 'Cuán', 8: 'grande', 4: '?', 10: 'eso' },
      img: h => h === 0xa ? '[imgA]' : '[imgB]',
      sc: ['① Seguimiento', '② Una palabra cambiada', '③ Imagen distinta', '④ Steering activo', '⑤ Reenvío exacto'],
      ready: '<span class="c">$</span> ready. Pulsa un botón de escenario y el motor empieza a comprobar',
      l0: (name, n) => `<span class="c">[solicitud]</span> ${name}: la solicitud nueva tiene ${n} tokens`,
      l1ok: '<span class="m">steering</span>: los dos lados usan el mismo modo, se continúa',
      l1bad: '<span class="m">steering</span>: modos distintos. El checkpoint se calculó de otra manera, así que <span class="y">se omite</span>',
      l2ok: (n, len) => `<span class="m">longitud</span>: checkpoint ${n} &lt; solicitud ${len}, se continúa`,
      l2bad: (n, len) => `<span class="m">longitud</span>: el checkpoint tiene ${n} tokens y la solicitud solo ${len}. El último token debe dejarse para que lo lea la ronda de verificación siguiente, así que <span class="y">este checkpoint no puede usarse</span>`,
      l3ok: n => `<span class="m">tokens</span>: los ${n} primeros coinciden uno a uno`,
      l3bad: i => `<span class="m">tokens</span>: el token ${i + 1} difiere, <span class="y">el prefijo se rompe</span> y todo el checkpoint queda anulado`,
      l4ok: '<span class="m">imágenes</span>: las posiciones y los hashes de las imágenes del prefijo coinciden todos',
      l4bad: '<span class="m">imágenes</span>: mismos tokens marcadores, distinto hash de imagen. <span class="y">El contenido cambió, así que no se reutiliza</span>',
      l5hit: (n, tail) => `<span class="c">→ acierto</span>: se reutiliza el estado de ${n} tokens y se leen solo los ${tail} siguientes`,
      l5miss: len => `<span class="y">→ fallo</span>: se leen los ${len} tokens desde el principio`,
      sReuseK: 'Tokens reutilizables', sReuseF: '<b>= longitud del checkpoint</b><br>cuenta solo si pasan las cuatro comprobaciones',
      sTailK: 'Tokens que releer', sTailF: '<b>= longitud de la solicitud − longitud reutilizable</b>',
      sScaleK: 'A escala de un chat real', sScaleHit: 'ahorra unos 30 s', sScaleMiss: 'ahorra 0 s',
      sScaleF: '<b>Supón un prefijo de 30.000 tokens leído a unos 1.000 por segundo</b><br>30.000 ÷ 1.000 = 30 s (estimación didáctica)',
      try: [
        'Pulsa <b>① Seguimiento</b>: los 6 primeros tokens coinciden todos, y el motor lee solo los 3 últimos. Así se ve un seguimiento en un chat de varios turnos.',
        'Pulsa <b>③ Imagen distinta</b>: ni un solo token difiere, y aun así se rechaza. Un token marcador solo dice «aquí va una imagen», no «qué imagen».',
        'Pulsa <b>⑤ Reenvío exacto</b>: el contenido es idéntico, y aun así este checkpoint no puede usarse. El último token debe leerse de verdad antes de poder empezar a generar.',
      ],
      verdict: {
        hit: 'Los tokens, las imágenes y el modo de steering del prefijo coinciden todos, y el checkpoint es más corto que la solicitud: se puede reanudar la lectura. El motor se saltó todo el cálculo del prefijo.',
        steering: 'Con otro modo de steering, los resultados intermedios de muchas capas eran distintos desde el principio. Por bien que coincidan los tokens, no hay reutilización.',
        'not-shorter': 'El checkpoint es tan largo como la solicitud: no queda ningún token para iniciar la ronda de verificación siguiente. Este checkpoint no puede usarse; el motor buscará uno más corto o leerá desde el principio.',
        tokens: 'Si difiere aunque sea un token, el cálculo de cada posición posterior también cambia. La reutilización de prefijos acepta solo una coincidencia exacta.',
        image: 'En la secuencia de tokens una imagen es solo una serie de marcadores. El motor registra por separado la posición y el hash de cada imagen, y una imagen cambiada significa que no hay reutilización.',
        empty: 'Un checkpoint vacío no tiene nada que reutilizar.',
      },

      cCode: 'COW_BRANCH', cTitle: 'Un prefijo, dos ramas', cTag: 'Estimación didáctica · modelo ilustrativo, no la implementación de Strata',
      cIntro: 'Las conversaciones A y B comparten un prefijo y luego cada una sigue su camino. Compara dos enfoques: la <b>copia completa</b> copia todo el prefijo en la bifurcación; la <b>copia en escritura</b> primero comparte, y quien escribe en una página compartida copia antes esa página. Cada página guarda 4 tokens (ilustrativo).',
      cLgPre: 'Token del prefijo', cLgNew: 'Token escrito tras la bifurcación', cLgOwn: 'Página de una sola rama', cLgShared: 'Página compartida por las dos ramas (×2 = contador de referencias)', cLgCopy: 'Página o estado copiado',
      cSteps: ['Prefijo leído', 'Instantánea, bifurcar', 'A escribe', 'B escribe', 'Recuento'],
      cStage: 'Las páginas que ve cada rama',
      rowA: 'A ve', rowB: 'B ve', notYet: '(aún sin bifurcar)',
      stateLbl: 'Estado', stateCopy: 'copiado',
      kShared: '×2', kCopied: 'copia', kInplace: 'directo',
      mCopy: 'Copia completa', mCow: 'Copia en escritura',
      pLabel: 'Longitud del prefijo (tokens)', aLabel: 'A escribe (tokens)', bLabel: 'B escribe (tokens)',
      bStep: '▶ Paso', bAll: '▶▶ Ejecutar hasta el final', bReset: 'Reiniciar',
      cReady: '<span class="c">$</span> ready. Elige un enfoque y pulsa [ ▶ Paso ]',
      c1: (n, p) => `<span class="c">[prefijo]</span> se leyeron ${n} tokens en ${p} páginas; el estado recurrente se detiene en el token ${n}`,
      c2copy: p => `<span class="m">bifurcación</span>: copia completa. Las ${p} páginas del prefijo se copian para B, más una copia del estado recurrente para B`,
      c2cow: p => `<span class="m">bifurcación</span>: copia en escritura. Las ${p} páginas del prefijo las comparten los dos lados (contador de referencias 2). B sigue necesitando su propia copia del estado recurrente`,
      c3: (t, c) => `<span class="w">A escribe</span> ${t} tokens` + (c ? ': la página en que escribe está compartida, así que <span class="y">primero se copia esa página</span>' : ''),
      c4: (t, c) => `<span class="w">B escribe</span> ${t} tokens` + (c ? ': ahora solo B usa esa página, así que <span class="y">escribe en el sitio, sin copiar</span>' : ''),
      c4copy: (t, c) => `<span class="w">B escribe</span> ${t} tokens` + (c ? ': A nunca escribió en esta página y B es el primero en escribir, así que <span class="y">primero se copia</span>' : ''),
      c5: (phys, cp) => `<span class="c">Recuento</span>: ${phys} páginas físicas, de las cuales ${cp} copiadas`,
      sPhysK: 'Páginas físicas realmente usadas',
      sPhysCopy: (p, a, b) => `<b>= 2 × ${p} páginas de prefijo + ${a} nuevas de A + ${b} nuevas de B</b>`,
      sPhysCow: (p, c, a, b) => `<b>= ${p} páginas de prefijo + ${c} copiadas + ${a} nuevas de A + ${b} nuevas de B</b>`,
      sCopyK: 'Páginas copiadas en la bifurcación',
      sCopyFCopy: '<b>= todo el prefijo</b><br>copiado de una vez en la bifurcación',
      sCopyFCow: '<b>= páginas compartidas en las que se escribe</b><br>0 cuando el prefijo llena exactamente páginas enteras',
      sSaveK: 'Páginas que ahorra la copia en escritura frente a la copia completa',
      sSaveF: '<b>= páginas de la copia completa − páginas de la copia en escritura</b>',
      sStateK: 'Estado recurrente',
      sStateV: '1 por rama',
      sStateF: '<b>Se reescribe entero con cada token leído, así que no puede compartirse</b><br>se copia un bloque entero en la bifurcación. Con la geometría de Strata, unos 113 MB',
      pages: n => `${n} páginas`,
      cTry: [
        'Elige <b>copia en escritura</b>, pon el prefijo en <b>16</b> (exactamente 4 páginas llenas) y deja que A y B escriban 3 cada uno: no hace falta copiar ninguna página. Cuando el prefijo coincide con el límite de una página, una bifurcación es casi gratis.',
        'Cambia el prefijo a <b>17</b> y ejecuta de nuevo: la media página extra la escriben los dos lados, así que quien escribe primero debe copiarla antes.',
        'Cambia a <b>copia completa</b> con los mismos ajustes: cuanto más largo es el prefijo, más páginas extra. Pero con cualquiera de los dos enfoques, el estado recurrente debe copiarse una vez.',
      ],
      cVerdictCow: (c, save) => `La copia en escritura copió solo <b>${c}</b> páginas y usa <b>${save}</b> páginas menos que una copia completa. Las páginas compartidas solo se leen, nunca se escriben, así que compartirlas es seguro. El estado recurrente no se puede ahorrar así: cada token lo reescribe entero, así que en una bifurcación solo puede copiarse completo.`,
      cVerdictCopy: (c, save) => `La copia completa copió <b>${c}</b> páginas en la bifurcación. La copia en escritura usaría <b>${save}</b> páginas menos. Cuanto más largo es el prefijo, mayor es la diferencia.`,
    },
  });

  async function guardRun(el, ctx, state, fn) {
    if (state.busy) return;
    state.busy = true; el.querySelectorAll('.viz-btn').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { if (ctx.alive) throw e; }
    state.busy = false; if (ctx.alive) el.querySelectorAll('.viz-btn').forEach(b => b.disabled = false);
  }

  /* ---------- Widget 1: prefix-match ---------- */
  const SAVED = { ids: [1, 2, 3, 9, 5, 6], imgs: [{ start: 3, hash: 0xa }], cvec: false };
  const ASK = [1, 2, 3, 9, 5, 6, 7, 8, 4];
  const SCENES = [
    { ids: ASK, imgs: [{ start: 3, hash: 0xa }], cvec: false },
    { ids: [1, 2, 3, 9, 5, 10, 7, 8, 4], imgs: [{ start: 3, hash: 0xa }], cvec: false },
    { ids: ASK, imgs: [{ start: 3, hash: 0xb }], cvec: false },
    { ids: ASK, imgs: [{ start: 3, hash: 0xa }], cvec: true },
    { ids: SAVED.ids.slice(), imgs: [{ start: 3, hash: 0xa }], cvec: false },
  ];

  Viz.register('prefix-match', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--frame)', text: T.lgIdle },
        { color: 'var(--accent)', text: T.lgSame, glow: true },
        { color: 'var(--a2)', text: T.lgDiff },
        { color: 'var(--a3)', text: T.lgTail },
      ]));
      const pipe = Viz.pipe(body, T.steps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 520 168', class: 'viz-stage', role: 'img', 'aria-label': T.stageLabel }, left);
      const lblSaved = Viz.svg('text', { x: 4, y: 18, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const lblReq = Viz.svg('text', { x: 4, y: 100, 'font-size': 13, style: 'fill:var(--ink)' }, svg);
      const mkRow = y => Array.from({ length: 9 }, (_, i) => {
        const g = Viz.svg('g', {}, svg);
        const r = Viz.svg('rect', { x: 4 + i * 57, y, width: 52, height: 36, rx: 3, class: 'viz-cell' }, g);
        const t = Viz.svg('text', { x: 4 + i * 57 + 26, y: y + 23, 'font-size': 13, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, g);
        return { g, r, t };
      });
      const rowS = mkRow(28), rowR = mkRow(110);
      left.insertAdjacentHTML('beforeend', `<div class="viz-row">${T.sc.map((s, i) => Viz.button(s, i ? 'alt' : '')).join('')}</div>`);
      const term = Viz.term(left, T.ready);
      right.innerHTML =
        Viz.stat({ id: 'pm-reuse', k: T.sReuseK, v: '—', f: T.sReuseF }) +
        Viz.stat({ id: 'pm-tail', k: T.sTailK, v: '—', f: T.sTailF }) +
        Viz.stat({ id: 'pm-scale', k: T.sScaleK, v: '—', f: T.sScaleF, hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.try));
      const $ = s => el.querySelector(s);
      const st = { busy: false };

      const label = (id, img) => id === 9 ? T.img(img ? img.hash : 0xa) : T.tok[id];
      function paintChip(c, mode) {
        // mode: idle | same | diff | tail | hidden
        c.g.style.display = mode === 'hidden' ? 'none' : '';
        const cls = { idle: 'viz-cell', same: 'viz-cell pick', diff: 'viz-cell score', tail: 'viz-cell' }[mode] || 'viz-cell';
        c.r.setAttribute('class', cls);
        c.r.style.fill = mode === 'tail' ? 'var(--paper)' : '';
        c.r.style.stroke = mode === 'tail' ? 'var(--a3)' : '';
        c.r.style.strokeDasharray = mode === 'tail' ? '4 3' : '';
        c.t.style.fill = mode === 'same' || mode === 'diff' ? 'var(--paper)' : 'var(--ink)';
      }
      function fill(row, req) {
        row.forEach((c, i) => {
          if (i >= req.ids.length) { paintChip(c, 'hidden'); return; }
          const img = req.imgs.find(m => m.start === i);
          c.t.textContent = label(req.ids[i], img);
          paintChip(c, 'idle');
        });
      }
      function setStats(r, len) {
        $('[data-s=pm-reuse-v]').textContent = r ? `${r.tokens} / ${len}` : '—';
        $('[data-s=pm-tail-v]').textContent = r ? String(r.tail) : '—';
        $('[data-s=pm-scale-v]').textContent = r ? (r.reason === 'hit' ? T.sScaleHit : T.sScaleMiss) : '—';
      }
      function reset() {
        lblSaved.textContent = `${T.rowSaved} · ${T.steer(SAVED.cvec)}`;
        lblReq.textContent = T.rowReq;
        fill(rowS, SAVED); rowR.forEach(c => paintChip(c, 'hidden'));
        pipe.set(-1); setStats(null, 0); $('.viz-verdict').hidden = true;
      }

      async function run(si) {
        const req = SCENES[si], res = M.match(SAVED, req), n = SAVED.ids.length, len = req.ids.length;
        const wait = ms => ctx.sleep(ms);
        reset();
        lblReq.textContent = `${T.rowReq} · ${T.steer(req.cvec)}`;
        fill(rowR, req);
        pipe.set(0); term.log(T.l0(T.sc[si], len)); await wait(350);
        const finish = async () => {
          pipe.set(5);
          if (res.reason === 'hit') {
            for (let i = n; i < len; i++) paintChip(rowR[i], 'tail');
            term.log(T.l5hit(res.tokens, res.tail));
          } else term.log(T.l5miss(len));
          setStats(res, len);
          const v = $('.viz-verdict'); v.innerHTML = T.verdict[res.reason]; v.hidden = false;
        };
        pipe.set(1); await wait(350);
        if (res.reason === 'steering') { term.log(T.l1bad); return finish(); }
        term.log(T.l1ok);
        pipe.set(2); await wait(350);
        if (res.reason === 'not-shorter') { term.log(T.l2bad(n, len)); return finish(); }
        term.log(T.l2ok(n, len));
        pipe.set(3);
        for (let i = 0; i < n; i++) {
          const same = SAVED.ids[i] === req.ids[i];
          paintChip(rowS[i], same ? 'same' : 'diff'); paintChip(rowR[i], same ? 'same' : 'diff');
          await wait(140);
          if (!same) { term.log(T.l3bad(i)); return finish(); }
        }
        term.log(T.l3ok(n));
        pipe.set(4); await wait(350);
        if (res.reason === 'image') {
          for (const im of req.imgs) if (im.start < n) { paintChip(rowS[im.start], 'diff'); paintChip(rowR[im.start], 'diff'); }
          term.log(T.l4bad); return finish();
        }
        term.log(T.l4ok);
        await wait(250);
        return finish();
      }
      el.querySelectorAll('.viz-row .viz-btn').forEach((b, i) => { b.onclick = () => guardRun(el, ctx, st, () => run(i)); });
      reset();
    },
  });

  /* ---------- Widget 2: prefix-cow ---------- */
  const PAGE = 4, COLS = 8, X0 = 150, CW = 50;

  Viz.register('prefix-cow', {
    mount(el, ctx) {
      const body = Viz.frame(el, { code: T.cCode, title: T.cTitle, tag: T.cTag, intro: T.cIntro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.cLgPre },
        { color: 'var(--a3)', text: T.cLgNew },
        { color: 'var(--frame)', text: T.cLgOwn },
        { color: 'var(--accent)', text: T.cLgShared, glow: true },
        { color: 'var(--a2)', text: T.cLgCopy },
      ]));
      const pipe = Viz.pipe(body, T.cSteps);
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 560 196', class: 'viz-stage', role: 'img', 'aria-label': T.cStage }, left);
      const layer = Viz.svg('g', {}, svg);
      const slider = (cls, lab, min, max, val) => `<div class="viz-slider ${cls}"><label>${lab}</label><input type="range" min="${min}" max="${max}" value="${val}" aria-label="${Viz.esc(lab)}"><output>${val}</output></div>`;
      left.insertAdjacentHTML('beforeend',
        `<div class="viz-row cow-mode">${Viz.button(T.mCopy, 'ghost')}${Viz.button(T.mCow)}</div>` +
        slider('s-p', T.pLabel, 1, 24, 17) + slider('s-a', T.aLabel, 0, 8, 3) + slider('s-b', T.bLabel, 0, 8, 3) +
        `<div class="viz-row cow-run">${Viz.button(T.bStep)}${Viz.button(T.bAll, 'alt')}${Viz.button(T.bReset, 'ghost')}</div>`);
      const term = Viz.term(left, T.cReady);
      right.innerHTML =
        Viz.stat({ id: 'cw-phys', k: T.sPhysK, v: '—', f: '' }) +
        Viz.stat({ id: 'cw-copy', k: T.sCopyK, v: '—', f: '', hot: true }) +
        Viz.stat({ id: 'cw-save', k: T.sSaveK, v: '—', f: T.sSaveF }) +
        Viz.stat({ id: 'cw-state', k: T.sStateK, v: T.sStateV, f: T.sStateF });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict" hidden></div>' + Viz.tryList(T.cTry));
      const $ = s => el.querySelector(s);
      const st = { busy: false, mode: 'cow', phase: 0 };
      const [bCopy, bCow] = el.querySelectorAll('.cow-mode .viz-btn');
      const [bStep, bAll, bReset] = el.querySelectorAll('.cow-run .viz-btn');
      const val = c => +$(`.${c} input`).value;
      const cfg = () => ({ prefix: val('s-p'), tailA: val('s-a'), tailB: val('s-b'), page: PAGE, mode: st.mode });

      const S = (tag, attrs) => Viz.svg(tag, attrs, layer);
      function page(x, y, h, p, prefTok, kind) {
        const stroke = kind === 'shared' ? 'var(--accent)' : kind === 'copied' ? 'var(--a2)' : 'var(--frame)';
        S('rect', { x, y, width: 44, height: h, rx: 3, style: `fill:var(--paper);stroke:${stroke};stroke-width:${kind === 'shared' || kind === 'copied' ? 2 : 1}` + (kind === 'copied' ? ';stroke-dasharray:4 3' : '') });
        const ty = y + h / 2 - 4;
        for (let j = 0; j < PAGE; j++) {
          const on = j < p.tokens;
          S('rect', { x: x + 4 + j * 10, y: ty, width: 7, height: 7, style: `fill:${on ? (j < prefTok ? 'var(--accent)' : 'var(--a3)') : 'var(--side)'}` });
        }
        const tag = { shared: T.kShared, copied: T.kCopied, inplace: T.kInplace }[kind];
        if (tag) S('text', { x: x + 22, y: y + h - 6, 'font-size': 11, 'text-anchor': 'middle', style: `fill:${kind === 'copied' ? 'var(--a2)' : 'var(--muted)'}` }).textContent = tag;
      }
      function stateBox(y, copied) {
        S('rect', { x: 80, y, width: 56, height: 46, rx: 3, style: `fill:var(--side);stroke:${copied ? 'var(--a2)' : 'var(--frame)'};stroke-width:${copied ? 2 : 1}` + (copied ? ';stroke-dasharray:4 3' : '') });
        S('text', { x: 108, y: y + 20, 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--ink)' }).textContent = T.stateLbl;
        if (copied) S('text', { x: 108, y: y + 37, 'font-size': 11, 'text-anchor': 'middle', style: 'fill:var(--a2)' }).textContent = T.stateCopy;
      }
      // phase 0 empty, 1 trunk, 2 fork, 3 A wrote, 4/5 B wrote
      function draw() {
        layer.innerHTML = '';
        const c = cfg(), ph = st.phase;
        const yA = 30, yB = 120, h = 46;
        S('text', { x: 4, y: yA + 28, 'font-size': 13, style: 'fill:var(--ink)' }).textContent = T.rowA;
        S('text', { x: 4, y: yB + 28, 'font-size': 13, style: 'fill:var(--ink)' }).textContent = T.rowB;
        if (ph === 0) return;
        const pp = M.pages(c.prefix, PAGE), rest = c.prefix % PAGE;
        const prefTok = i => i < pp.full ? PAGE : i === pp.full ? rest : 0;
        stateBox(yA, false);
        if (ph === 1) {
          S('text', { x: X0, y: yB + 28, 'font-size': 12, style: 'fill:var(--muted)' }).textContent = T.notYet;
          for (let i = 0; i < pp.total; i++) page(X0 + i * CW, yA, h, { tokens: prefTok(i) }, prefTok(i), 'own');
          return;
        }
        stateBox(yB, true);
        const b = M.branch({ ...c, tailA: ph >= 3 ? c.tailA : 0, tailB: ph >= 4 ? c.tailB : 0 });
        const n = Math.min(COLS, Math.max(b.layout.A.length, b.layout.B.length));
        for (let i = 0; i < n; i++) {
          const a = b.layout.A[i], bb = b.layout.B[i];
          if (a && bb && a.kind === 'shared' && bb.kind === 'shared') { page(X0 + i * CW, yA, yB + h - yA, a, prefTok(i), 'shared'); continue; }
          if (a) page(X0 + i * CW, yA, h, a, prefTok(i), a.kind);
          if (bb) page(X0 + i * CW, yB, h, bb, prefTok(i), bb.kind);
        }
      }
      function stats(final) {
        const c = cfg(), cp = M.branch({ ...c, mode: 'copy' }), cw = M.branch({ ...c, mode: 'cow' }), cur = st.mode === 'cow' ? cw : cp;
        const show = final || st.phase >= 4;
        $('[data-s=cw-phys-v]').textContent = show ? T.pages(cur.physicalPages) : '—';
        $('[data-s=cw-phys-f]').innerHTML = st.mode === 'cow' ? T.sPhysCow(cur.prefixPages, cur.copiedPages, cur.newA, cur.newB) : T.sPhysCopy(cur.prefixPages, cur.newA, cur.newB);
        $('[data-s=cw-copy-v]').textContent = show ? T.pages(cur.copiedPages) : '—';
        $('[data-s=cw-copy-f]').innerHTML = st.mode === 'cow' ? T.sCopyFCow : T.sCopyFCopy;
        const save = cp.physicalPages - cw.physicalPages;
        $('[data-s=cw-save-v]').textContent = show ? `${T.pages(save)}（${Math.round(save / cp.physicalPages * 100)}%）` : '—';
        return { cur, save };
      }
      function setMode(m) {
        st.mode = m; bCopy.className = 'viz-btn' + (m === 'copy' ? '' : ' ghost'); bCow.className = 'viz-btn' + (m === 'cow' ? '' : ' ghost');
        resetAll();
      }
      function resetAll() {
        st.phase = 0; pipe.set(-1); draw(); stats(false); $('.viz-verdict').hidden = true; term.clear(); term.log(T.cReady);
      }
      async function step() {
        const c = cfg();
        if (st.phase >= 5) { st.phase = 0; $('.viz-verdict').hidden = true; }
        st.phase++;
        pipe.set(st.phase - 1);
        const b = M.branch(c), pp = M.pages(c.prefix, PAGE);
        if (st.phase === 1) term.log(T.c1(c.prefix, pp.total));
        if (st.phase === 2) term.log(st.mode === 'cow' ? T.c2cow(pp.total) : T.c2copy(pp.total));
        if (st.phase === 3) term.log(T.c3(c.tailA, st.mode === 'cow' && pp.partial && c.tailA > 0));
        if (st.phase === 4) term.log(st.mode === 'cow' && c.tailA === 0 ? T.c4copy(c.tailB, pp.partial && c.tailB > 0) : T.c4(c.tailB, st.mode === 'cow' && pp.partial && c.tailB > 0));
        draw();
        if (st.phase >= 4) stats(true);
        if (st.phase === 5) {
          const { cur, save } = stats(true);
          term.log(T.c5(cur.physicalPages, cur.copiedPages));
          const v = $('.viz-verdict');
          v.innerHTML = st.mode === 'cow' ? T.cVerdictCow(cur.copiedPages, save) : T.cVerdictCopy(cur.copiedPages, save);
          v.hidden = false;
          pipe.set(5);
        }
        await ctx.sleep(0);
        return b;
      }
      bStep.onclick = () => guardRun(el, ctx, st, step);
      bAll.onclick = () => guardRun(el, ctx, st, async () => {
        if (st.phase >= 5) resetAll();
        while (st.phase < 5) { await step(); await ctx.sleep(450); }
      });
      bReset.onclick = () => guardRun(el, ctx, st, async () => resetAll());
      bCopy.onclick = () => { if (!st.busy) setMode('copy'); };
      bCow.onclick = () => { if (!st.busy) setMode('cow'); };
      ['s-p', 's-a', 's-b'].forEach(cls => {
        const inp = $(`.${cls} input`);
        inp.oninput = () => { $(`.${cls} output`).textContent = inp.value; if (!st.busy) { if (st.phase) { draw(); stats(st.phase >= 4); } else stats(false); } };
      });
      resetAll();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
