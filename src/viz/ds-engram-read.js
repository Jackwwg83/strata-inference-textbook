/* DeepSeek column, page engram, section 4.5: the upper bound on words per second for a chosen SSD read speed and
   MB read per word, with the measured Mac points marked. Static, no animation, so reduced motion needs nothing extra
   (ctx.reduced is respected by never starting a timer). All visible text lives in T (zh is the master). */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsEngramRead;

  const T = Viz.t({
    zh: {
      code: 'ENGRAM_READ', title: '字速上限：读速 ÷ 每字读盘量', tag: '教学推演 · 实测点来自 Mac 文档',
      intro: '一个字要从盘里读多少 MB，一秒钟盘能读多少 MB，两者相除就是每秒最多写几个字。<b>拖动读速和每字 MB</b>，看上限怎么变。两条彩色线是 Mac 文档里的两套模型包，圆点是它们的实测字速。实测点远在线下面，说明字速不由读速单独决定。',
      lg48: '每字 48 MB（2.00 套装）', lg111: '每字 111 MB（2.25 套装）', lgMeas: '圆点：Mac 实测字速', lgCustom: '细线：你选的每字 MB',
      figLabel: '字速上限等于 SSD 读速除以每字读盘量。横轴是读速，竖轴是字速上限，圆点是 Mac 实测。',
      top48: '每字读 48 MB（2.00 套装）：实测约 15.6 字/秒（实心点）',
      top111: '每字读 111 MB（2.25 套装）：实测约 15.0 字/秒（空心点）',
      topDash: (g, a, b) => `虚线：${g} GB/s 时的上限，分别是 ${a} 和 ${b} 字/秒`,
      axisX: 'SSD 读速（GB/s）', axisY: '上限（字/秒）',
      sGbps: 'SSD 读速', sMb: '每字读盘量', outGbps: (v) => `${v} GB/s`, outMb: (v) => `${v} MB`,
      bp48: '用 48 MB', bp111: '用 111 MB', pressed: '当前选择',
      sBoundK: '你选的字速上限', sBoundF: (g, mb) => `<b>= ${g} GB/s × 1000 ÷ ${mb} MB</b><br>1 GB 按 1000 MB 算`,
      sNeedK: 'Mac 实测要求的读速', sNeedV: (a, b) => `${a} / ${b} GB/s`, sNeedF: '<b>= 字速 × 每字 MB ÷ 1000</b><br>15.6 × 48，15.0 × 111',
      sRoomK: '上限是实测的几倍', sRoomV: (a, b) => `${a}× / ${b}×`, sRoomF: (g) => `<b>= 上限 ÷ 实测字速</b><br>读速 ${g} GB/s，48 MB / 111 MB 两套`,
      vOk: (g, a, b) => `① 读速 ${g} GB/s 时，两套的上限是 <b>${a}</b> 和 <b>${b}</b> 字/秒，都高于实测的 15.6 和 15.0。读盘不是唯一的限制。<br>② 每字 MB 不变，读速翻倍，上限也翻倍；读速不变，每字 MB 翻倍，上限减半。<br>③ 这是上限。专家还要在 CPU 上算，真实字速更低。`,
      vLow48: (g, a) => `① 读速 ${g} GB/s 时，48 MB 那套的上限只有 <b>${a}</b> 字/秒，低于实测的 15.6：盘慢到这个程度，读盘本身就是瓶颈。`,
      vLow111: (g, b) => `① 读速 ${g} GB/s 时，111 MB 那套的上限只有 <b>${b}</b> 字/秒，低于实测的 15.0：这套每字读得多，先被盘卡住。`,
      vLowBoth: (g, a, b) => `① 读速 ${g} GB/s 时，两套的上限只有 <b>${a}</b> 和 <b>${b}</b> 字/秒，都低于实测的 15.6 和 15.0：盘慢到这个程度，读盘本身就是瓶颈。`,
      vTail: '<br>② 实测点对应的读速是 0.75 和 1.67 GB/s：只要盘比这快，读速就不再单独决定字速。<br>③ 读速要按你的读法取值：专家是大块读，接近顺序读；Engram 是小块随机读，吞吐低得多。',
      tryList: [
        '保持默认 3.6 GB/s、48 MB：上限 75 字/秒，是实测 15.6 的近 5 倍。这就是“盘不是唯一的限制”。',
        '把读速拖到 <b>0.7 GB/s</b>：48 MB 那套的上限掉到约 15 字/秒，贴住实测点。再往下，读盘就成了瓶颈。',
        '点“用 111 MB”，再把读速拖到 <b>1.6 GB/s</b>：上限约 14 字/秒，刚好够不到实测的 15.0。每字读得越多，对盘的要求越高。',
      ],
    },
    en: {
      code: 'ENGRAM_READ', title: 'Token-rate bound: read speed ÷ MB read per token', tag: 'Teaching estimate · measured points from the Mac document',
      intro: 'Divide the MB a token must read from disk into the MB the disk reads per second, and you get the most tokens per second you can write. <b>Drag the read speed and the MB per token</b> to see how the bound moves. The two colored lines are the two model bundles in the Mac document, and the dots are their measured token rates. The dots sit far below the lines, so token rate is not decided by read speed alone.',
      lg48: '48 MB per token (2.00 bundle)', lg111: '111 MB per token (2.25 bundle)', lgMeas: 'Dots: measured tokens/s on the Mac', lgCustom: 'Thin line: your MB per token',
      figLabel: 'Token-rate bound equals SSD read speed divided by MB read per token. The horizontal axis is read speed, the vertical axis is the token-rate bound, and the dots are Mac measurements.',
      top48: '48 MB/token (2.00 bundle): measured ~15.6 tok/s (filled)',
      top111: '111 MB/token (2.25 bundle): measured ~15.0 tok/s (hollow)',
      topDash: (g, a, b) => `Dashed: bound at ${g} GB/s: ${a} and ${b} tok/s`,
      axisX: 'SSD read speed (GB/s)', axisY: 'Bound (tokens/s)',
      sGbps: 'SSD read speed', sMb: 'MB read per token', outGbps: (v) => `${v} GB/s`, outMb: (v) => `${v} MB`,
      bp48: 'Use 48 MB', bp111: 'Use 111 MB', pressed: 'Selected',
      sBoundK: 'Your token-rate bound', sBoundF: (g, mb) => `<b>= ${g} GB/s × 1000 ÷ ${mb} MB</b><br>1 GB counted as 1000 MB`,
      sNeedK: 'Read speed the Mac measurements need', sNeedV: (a, b) => `${a} / ${b} GB/s`, sNeedF: '<b>= token rate × MB per token ÷ 1000</b><br>15.6 × 48, 15.0 × 111',
      sRoomK: 'Bound as a multiple of measured', sRoomV: (a, b) => `${a}× / ${b}×`, sRoomF: (g) => `<b>= bound ÷ measured token rate</b><br>read speed ${g} GB/s, the 48 MB / 111 MB bundles`,
      vOk: (g, a, b) => `① At ${g} GB/s read speed, the bounds of the two bundles are <b>${a}</b> and <b>${b}</b> tokens/s, both above the measured 15.6 and 15.0. Disk reads are not the only limit.<br>② With MB per token fixed, doubling the read speed doubles the bound; with read speed fixed, doubling the MB per token halves it.<br>③ This is an upper bound. The experts still have to be computed on the CPU, so the real token rate is lower.`,
      vLow48: (g, a) => `① At ${g} GB/s read speed, the 48 MB bundle's bound is only <b>${a}</b> tokens/s, below the measured 15.6: the disk is so slow that reading itself is the bottleneck.`,
      vLow111: (g, b) => `① At ${g} GB/s read speed, the 111 MB bundle's bound is only <b>${b}</b> tokens/s, below the measured 15.0: this bundle reads more per token, so the disk stalls it first.`,
      vLowBoth: (g, a, b) => `① At ${g} GB/s read speed, the bounds of the two bundles are only <b>${a}</b> and <b>${b}</b> tokens/s, both below the measured 15.6 and 15.0: the disk is so slow that reading itself is the bottleneck.`,
      vTail: '<br>② The read speeds the measured points need are 0.75 and 1.67 GB/s: once the disk is faster than that, read speed alone no longer decides token rate.<br>③ Take the read speed for your way of reading: experts are read in large blocks, close to sequential; Engram does small random reads, with much lower throughput.',
      tryList: [
        'Keep the defaults, 3.6 GB/s and 48 MB: the bound is 75 tokens/s, almost 5 times the measured 15.6. This is what "the disk is not the only limit" means.',
        'Drag the read speed to <b>0.7 GB/s</b>: the bound of the 48 MB bundle drops to about 15 tokens/s, right at the measured point. Go lower and disk reads become the bottleneck.',
        'Click "Use 111 MB", then drag the read speed to <b>1.6 GB/s</b>: the bound is about 14 tokens/s, just short of the measured 15.0. The more each token reads, the more it demands of the disk.',
      ],
    },
    ja: {
      code: 'ENGRAM_READ', title: 'トークン速度の上限：読み込み速度 ÷ 1 トークンあたりの読み込み量', tag: '教育用の試算 · 実測点は Mac 文書より',
      intro: '1 トークンのためにディスクから何 MB 読むか。ディスクは 1 秒に何 MB 読めるか。この 2 つを割ると、1 秒に最大で何トークン書けるかが出ます。<b>読み込み速度と 1 トークンあたりの MB を動かして</b>、上限がどう変わるか見てください。色つきの 2 本の線は、Mac 文書にある 2 つのモデルパックです。点はそれぞれの実測トークン速度です。実測点は線よりずっと下にあります。つまり、トークン速度は読み込み速度だけでは決まりません。',
      lg48: '1 トークンあたり 48 MB（2.00 パック）', lg111: '1 トークンあたり 111 MB（2.25 パック）', lgMeas: '点：Mac の実測トークン速度', lgCustom: '細い線：選んだ 1 トークンあたりの MB',
      figLabel: 'トークン速度の上限は、SSD の読み込み速度を 1 トークンあたりの読み込み量で割った値です。横軸は読み込み速度、縦軸はトークン速度の上限、点は Mac の実測です。',
      top48: '48 MB/トークン（2.00 パック）：実測 約 15.6 tok/s（塗り）',
      top111: '111 MB/トークン（2.25 パック）：実測 約 15.0 tok/s（白抜き）',
      topDash: (g, a, b) => `点線：${g} GB/s のときの上限は ${a} と ${b} tok/s`,
      axisX: 'SSD 読み込み速度（GB/s）', axisY: '上限（tok/s）',
      sGbps: 'SSD 読み込み速度', sMb: '1 トークンあたりの読み込み量', outGbps: (v) => `${v} GB/s`, outMb: (v) => `${v} MB`,
      bp48: '48 MB にする', bp111: '111 MB にする', pressed: '現在の選択',
      sBoundK: '選んだ条件のトークン速度の上限', sBoundF: (g, mb) => `<b>= ${g} GB/s × 1000 ÷ ${mb} MB</b><br>1 GB = 1000 MB として計算`,
      sNeedK: 'Mac の実測が求める読み込み速度', sNeedV: (a, b) => `${a} / ${b} GB/s`, sNeedF: '<b>= トークン速度 × 1 トークンあたりの MB ÷ 1000</b><br>15.6 × 48、15.0 × 111',
      sRoomK: '上限は実測の何倍か', sRoomV: (a, b) => `${a}× / ${b}×`, sRoomF: (g) => `<b>= 上限 ÷ 実測トークン速度</b><br>読み込み速度 ${g} GB/s、48 MB と 111 MB の 2 パック`,
      vOk: (g, a, b) => `① 読み込み速度 ${g} GB/s のとき、2 パックの上限は <b>${a}</b> と <b>${b}</b> tok/s で、どちらも実測の 15.6 と 15.0 を上回ります。ディスク読み込みだけが制限ではありません。<br>② 1 トークンあたりの MB が同じなら、読み込み速度が 2 倍で上限も 2 倍。読み込み速度が同じなら、1 トークンあたりの MB が 2 倍で上限は半分です。<br>③ これは上限です。エキスパートは CPU で計算する必要もあるので、実際のトークン速度はもっと低くなります。`,
      vLow48: (g, a) => `① 読み込み速度 ${g} GB/s のとき、48 MB のパックの上限は <b>${a}</b> tok/s しかなく、実測の 15.6 を下回ります。ディスクがここまで遅いと、ディスク読み込みそのものがボトルネックです。`,
      vLow111: (g, b) => `① 読み込み速度 ${g} GB/s のとき、111 MB のパックの上限は <b>${b}</b> tok/s しかなく、実測の 15.0 を下回ります。このパックは 1 トークンあたりの読み込みが多いので、先にディスクに詰まります。`,
      vLowBoth: (g, a, b) => `① 読み込み速度 ${g} GB/s のとき、2 パックの上限は <b>${a}</b> と <b>${b}</b> tok/s しかなく、どちらも実測の 15.6 と 15.0 を下回ります。ディスクがここまで遅いと、ディスク読み込みそのものがボトルネックです。`,
      vTail: '<br>② 実測点に対応する読み込み速度は 0.75 と 1.67 GB/s です。ディスクがこれより速ければ、読み込み速度だけではトークン速度が決まりません。<br>③ 読み込み速度は、あなたの読み方に合わせて取ってください。エキスパートは大きなブロックで読むので、順次読みに近くなります。Engram は小さなランダム読みで、スループットはずっと低くなります。',
      tryList: [
        '既定の 3.6 GB/s、48 MB のままにします。上限は 75 tok/s で、実測 15.6 の 5 倍近くです。これが「ディスクだけが制限ではない」ということです。',
        '読み込み速度を <b>0.7 GB/s</b> まで下げます。48 MB のパックの上限は約 15 tok/s まで落ち、実測点にぴったり重なります。これより下では、ディスク読み込みがボトルネックになります。',
        '「111 MB にする」を押し、読み込み速度を <b>1.6 GB/s</b> にします。上限は約 14 tok/s で、実測の 15.0 にぎりぎり届きません。1 トークンあたりの読み込みが多いほど、ディスクへの要求は高くなります。',
      ],
    },
    ko: {
      code: 'ENGRAM_READ', title: '토큰 속도 상한: 읽기 속도 ÷ 토큰당 디스크 읽기량', tag: '교육용 추정 · 실측 지점은 Mac 문서 기준',
      intro: '토큰 하나를 쓰려면 디스크에서 몇 MB를 읽어야 하는지, 디스크가 1초에 몇 MB를 읽는지를 알면, 둘을 나눈 값이 초당 최대 토큰 수예요. <b>읽기 속도와 토큰당 MB를 끌어서</b> 상한이 어떻게 변하는지 보세요. 색깔 선 두 개는 Mac 문서의 모델 패키지 두 가지이고, 동그라미는 그 실측 토큰 속도예요. 실측 지점은 선보다 한참 아래에 있어요. 토큰 속도는 읽기 속도 하나로 정해지지 않는다는 뜻이에요.',
      lg48: '토큰당 48 MB (2.00 세트)', lg111: '토큰당 111 MB (2.25 세트)', lgMeas: '동그라미: Mac 실측 토큰 속도', lgCustom: '가는 선: 내가 고른 토큰당 MB',
      figLabel: '토큰 속도 상한은 SSD 읽기 속도를 토큰당 디스크 읽기량으로 나눈 값이에요. 가로축은 읽기 속도, 세로축은 토큰 속도 상한, 동그라미는 Mac 실측이에요.',
      top48: '토큰당 48 MB (2.00 세트): 실측 약 15.6 토큰/초 (채운 점)',
      top111: '토큰당 111 MB (2.25 세트): 실측 약 15.0 토큰/초 (빈 점)',
      topDash: (g, a, b) => `점선: ${g} GB/s일 때 상한은 각각 ${a}, ${b} 토큰/초`,
      axisX: 'SSD 읽기 속도 (GB/s)', axisY: '상한 (토큰/초)',
      sGbps: 'SSD 읽기 속도', sMb: '토큰당 디스크 읽기량', outGbps: (v) => `${v} GB/s`, outMb: (v) => `${v} MB`,
      bp48: '48 MB 선택', bp111: '111 MB 선택', pressed: '현재 선택',
      sBoundK: '내가 고른 토큰 속도 상한', sBoundF: (g, mb) => `<b>= ${g} GB/s × 1000 ÷ ${mb} MB</b><br>1 GB를 1000 MB로 계산`,
      sNeedK: 'Mac 실측이 요구하는 읽기 속도', sNeedV: (a, b) => `${a} / ${b} GB/s`, sNeedF: '<b>= 토큰 속도 × 토큰당 MB ÷ 1000</b><br>15.6 × 48, 15.0 × 111',
      sRoomK: '상한은 실측의 몇 배', sRoomV: (a, b) => `${a}× / ${b}×`, sRoomF: (g) => `<b>= 상한 ÷ 실측 토큰 속도</b><br>읽기 속도 ${g} GB/s, 48 MB / 111 MB 두 세트`,
      vOk: (g, a, b) => `① 읽기 속도가 ${g} GB/s이면 두 세트의 상한은 <b>${a}</b>, <b>${b}</b> 토큰/초로, 실측 15.6과 15.0보다 모두 높아요. 디스크 읽기만이 유일한 제한은 아니에요.<br>② 토큰당 MB가 그대로일 때 읽기 속도가 2배가 되면 상한도 2배가 돼요. 읽기 속도가 그대로일 때 토큰당 MB가 2배가 되면 상한은 절반이 돼요.<br>③ 이건 상한이에요. 전문가는 CPU에서 계산도 해야 해서 실제 토큰 속도는 더 낮아요.`,
      vLow48: (g, a) => `① 읽기 속도가 ${g} GB/s이면 48 MB 세트의 상한은 <b>${a}</b> 토큰/초뿐이에요. 실측 15.6보다 낮아요. 디스크가 이렇게 느리면 디스크 읽기 자체가 병목이에요.`,
      vLow111: (g, b) => `① 읽기 속도가 ${g} GB/s이면 111 MB 세트의 상한은 <b>${b}</b> 토큰/초뿐이에요. 실측 15.0보다 낮아요. 이 세트는 토큰마다 읽는 양이 많아서 디스크에 먼저 막혀요.`,
      vLowBoth: (g, a, b) => `① 읽기 속도가 ${g} GB/s이면 두 세트의 상한은 <b>${a}</b>, <b>${b}</b> 토큰/초뿐이에요. 실측 15.6과 15.0보다 모두 낮아요. 디스크가 이렇게 느리면 디스크 읽기 자체가 병목이에요.`,
      vTail: '<br>② 실측 지점에 해당하는 읽기 속도는 0.75와 1.67 GB/s예요. 디스크가 이보다 빠르면 읽기 속도 하나만으로 토큰 속도가 정해지지 않아요.<br>③ 읽기 속도는 읽는 방식에 맞게 골라야 해요. 전문가는 큰 덩어리로 읽어서 순차 읽기에 가깝고, Engram은 작은 덩어리를 무작위로 읽어서 처리량이 훨씬 낮아요.',
      tryList: [
        '기본값 3.6 GB/s, 48 MB를 그대로 두세요. 상한은 75 토큰/초로, 실측 15.6의 거의 5배예요. 이것이 "디스크 읽기만이 유일한 제한은 아니다"라는 뜻이에요.',
        '읽기 속도를 <b>0.7 GB/s</b>까지 끌어 보세요. 48 MB 세트의 상한이 약 15 토큰/초로 떨어져 실측 지점에 딱 붙어요. 더 내려가면 디스크 읽기가 병목이 돼요.',
        '"111 MB 선택"를 누르고 읽기 속도를 <b>1.6 GB/s</b>로 끌어 보세요. 상한은 약 14 토큰/초로, 실측 15.0에 겨우 못 미쳐요. 토큰마다 많이 읽을수록 디스크에 요구하는 수준이 높아져요.',
      ],
    },
    es: {
      code: 'ENGRAM_READ', title: 'Límite de tokens por segundo: velocidad de lectura ÷ lectura de disco por token', tag: 'Estimación didáctica · puntos medidos del documento de Mac',
      intro: 'Cuántos MB hay que leer del disco por token, y cuántos MB lee el disco por segundo: al dividir uno entre otro sale el máximo de tokens por segundo. <b>Arrastra la velocidad de lectura y los MB por token</b> para ver cómo cambia el límite. Las dos líneas de color son los dos paquetes de modelo del documento de Mac, y los puntos son su velocidad medida. Los puntos medidos quedan muy por debajo de las líneas: la velocidad en tokens por segundo no depende solo de la velocidad de lectura.',
      lg48: '48 MB por token (paquete 2.00)', lg111: '111 MB por token (paquete 2.25)', lgMeas: 'Puntos: velocidad medida en Mac', lgCustom: 'Línea fina: los MB por token que elijas',
      figLabel: 'El límite de tokens por segundo es la velocidad de lectura del SSD dividida entre los MB leídos por token. El eje horizontal es la velocidad de lectura, el vertical es el límite de tokens por segundo, y los puntos son lo medido en Mac.',
      top48: '48 MB/token (2.00): medido ~15,6 tokens/s (punto lleno)',
      top111: '111 MB/token (2.25): medido ~15,0 tokens/s (punto vacío)',
      topDash: (g, a, b) => `Línea punteada: a ${g} GB/s el límite es ${a} y ${b} tokens/s`,
      axisX: 'Velocidad de lectura del SSD (GB/s)', axisY: 'Límite superior (tokens/s)',
      sGbps: 'Velocidad de lectura del SSD', sMb: 'Lectura de disco por token', outGbps: (v) => `${v} GB/s`, outMb: (v) => `${v} MB`,
      bp48: 'Usar 48 MB', bp111: 'Usar 111 MB', pressed: 'Selección actual',
      sBoundK: 'Límite de tokens/s que elegiste', sBoundF: (g, mb) => `<b>= ${g} GB/s × 1000 ÷ ${mb} MB</b><br>1 GB se cuenta como 1000 MB`,
      sNeedK: 'Lectura que exige lo medido en Mac', sNeedV: (a, b) => `${a} / ${b} GB/s`, sNeedF: '<b>= tokens/s × MB por token ÷ 1000</b><br>15,6 × 48, 15,0 × 111',
      sRoomK: 'Cuántas veces supera el límite a lo medido', sRoomV: (a, b) => `${a}× / ${b}×`, sRoomF: (g) => `<b>= límite ÷ tokens/s medidos</b><br>Lectura de ${g} GB/s, paquetes de 48 MB / 111 MB`,
      vOk: (g, a, b) => `① Con una lectura de ${g} GB/s, el límite de los dos paquetes es <b>${a}</b> y <b>${b}</b> tokens/s, ambos por encima de los 15,6 y 15,0 medidos. La lectura de disco no es la única limitación.<br>② Con los MB por token fijos, si la velocidad de lectura se duplica, el límite también se duplica; con la velocidad fija, si los MB por token se duplican, el límite se reduce a la mitad.<br>③ Esto es un límite superior. Los expertos también tienen que calcularse en la CPU, así que la velocidad real es menor.`,
      vLow48: (g, a) => `① Con una lectura de ${g} GB/s, el límite del paquete de 48 MB es de solo <b>${a}</b> tokens/s, por debajo de los 15,6 medidos: con un disco tan lento, la propia lectura de disco es el cuello de botella.`,
      vLow111: (g, b) => `① Con una lectura de ${g} GB/s, el límite del paquete de 111 MB es de solo <b>${b}</b> tokens/s, por debajo de los 15,0 medidos: este paquete lee más por token y el disco lo frena primero.`,
      vLowBoth: (g, a, b) => `① Con una lectura de ${g} GB/s, el límite de los dos paquetes es de solo <b>${a}</b> y <b>${b}</b> tokens/s, ambos por debajo de los 15,6 y 15,0 medidos: con un disco tan lento, la propia lectura de disco es el cuello de botella.`,
      vTail: '<br>② Los puntos medidos corresponden a velocidades de lectura de 0,75 y 1,67 GB/s: mientras el disco sea más rápido que eso, la velocidad de lectura deja de decidir por sí sola la velocidad en tokens por segundo.<br>③ La velocidad de lectura hay que tomarla según tu forma de leer: los expertos se leen en bloques grandes, casi secuencial; Engram lee bloques pequeños al azar, con un rendimiento mucho menor.',
      tryList: [
        'Deja los valores por defecto, 3,6 GB/s y 48 MB: el límite es 75 tokens/s, casi 5 veces los 15,6 medidos. Eso es «el disco no es la única limitación».',
        'Arrastra la lectura a <b>0,7 GB/s</b>: el límite del paquete de 48 MB baja a unos 15 tokens/s, pegado al punto medido. Por debajo de eso, la lectura de disco pasa a ser el cuello de botella.',
        'Pulsa «Usar 111 MB» y arrastra la lectura a <b>1,6 GB/s</b>: el límite es de unos 14 tokens/s, justo sin llegar a los 15,0 medidos. Cuanto más se lee por token, más se le exige al disco.',
      ],
    },
    ar: {
      code: 'ENGRAM_READ', title: 'سقف سرعة الرموز: سرعة القراءة ÷ ما يُقرأ من القرص لكل رمز', tag: 'تقدير تعليمي · النقاط المقيسة من وثيقة Mac',
      intro: 'كم MB يُقرأ من القرص لكل رمز، وكم MB يقرأ القرص في الثانية؛ وقسمة الأول على الثاني تعطي أقصى عدد من الرموز يمكن كتابته في الثانية. <b>اسحب سرعة القراءة وMB لكل رمز</b> لترى كيف يتغير السقف. الخطان الملونان حزمتا النموذج في وثيقة Mac، والنقطتان سرعة الرموز المقيسة لهما. النقطتان أدنى بكثير من الخطين، مما يعني أن سرعة الرموز لا تحددها سرعة القراءة وحدها.',
      lg48: '48 MB لكل رمز (حزمة 2.00)', lg111: '111 MB لكل رمز (حزمة 2.25)', lgMeas: 'النقطتان: سرعة الرموز المقيسة على Mac', lgCustom: 'الخط الرفيع: MB لكل رمز الذي اخترته',
      figLabel: 'سقف سرعة الرموز يساوي سرعة قراءة SSD مقسومة على ما يُقرأ من القرص لكل رمز. المحور الأفقي سرعة القراءة، والعمودي سقف سرعة الرموز، والنقطتان سرعة الرموز المقيسة على Mac.',
      top48: '48 MB لكل رمز (حزمة 2.00): ≈ 15.6 رمز/ث مقيسًا (نقطة ممتلئة)',
      top111: '111 MB لكل رمز (حزمة 2.25): ≈ 15.0 رمز/ث مقيسًا (نقطة مفرغة)',
      topDash: (g, a, b) => `الخط المتقطع: الحد الأقصى عند ${g} GB/s هو ${a} و${b} رمزًا/ث`,
      axisX: 'سرعة قراءة SSD (GB/s)', axisY: 'الحد الأقصى (رمز/ث)',
      sGbps: 'سرعة قراءة SSD', sMb: 'ما يُقرأ من القرص لكل رمز', outGbps: (v) => `${v} GB/s`, outMb: (v) => `${v} MB`,
      bp48: 'استعمل 48 MB', bp111: 'استعمل 111 MB', pressed: 'الاختيار الحالي',
      sBoundK: 'سقف سرعة الرموز الذي اخترته', sBoundF: (g, mb) => `<b>= ${g} GB/s × 1000 ÷ ${mb} MB</b><br>نحسب 1 GB = 1000 MB`,
      sNeedK: 'سرعة القراءة التي تتطلبها السرعة المقيسة على Mac', sNeedV: (a, b) => `${a} / ${b} GB/s`, sNeedF: '<b>= سرعة الرموز × MB لكل رمز ÷ 1000</b><br>15.6 × 48، و15.0 × 111',
      sRoomK: 'كم مرة السقف أعلى من المقيس', sRoomV: (a, b) => `${a}× / ${b}×`, sRoomF: (g) => `<b>= السقف ÷ سرعة الرموز المقيسة</b><br>سرعة القراءة ${g} GB/s، للحزمتين 48 MB و111 MB`,
      vOk: (g, a, b) => `① عند سرعة قراءة ${g} GB/s يكون سقف الحزمتين <b>${a}</b> و<b>${b}</b> رمزًا/ث، وكلاهما أعلى من المقيس 15.6 و15.0. فقراءة القرص ليست القيد الوحيد.<br>② إذا ثبت MB لكل رمز وتضاعفت سرعة القراءة تضاعف السقف؛ وإذا ثبتت سرعة القراءة وتضاعف MB لكل رمز نزل السقف إلى النصف.<br>③ هذا سقف. الخبراء يُحسبون أيضًا على CPU، فالسرعة الحقيقية أقل.`,
      vLow48: (g, a) => `① عند سرعة قراءة ${g} GB/s لا يتجاوز سقف حزمة 48 MB قيمة <b>${a}</b> رمزًا/ث، وهو أقل من المقيس 15.6: القرص بطيء إلى حد أن القراءة نفسها صارت عنق الزجاجة.`,
      vLow111: (g, b) => `① عند سرعة قراءة ${g} GB/s لا يتجاوز سقف حزمة 111 MB قيمة <b>${b}</b> رمزًا/ث، وهو أقل من المقيس 15.0: هذه الحزمة تقرأ أكثر لكل رمز، فيوقفها القرص أولًا.`,
      vLowBoth: (g, a, b) => `① عند سرعة قراءة ${g} GB/s لا يتجاوز سقف الحزمتين <b>${a}</b> و<b>${b}</b> رمزًا/ث، وكلاهما أقل من المقيس 15.6 و15.0: القرص بطيء إلى حد أن القراءة نفسها صارت عنق الزجاجة.`,
      vTail: '<br>② سرعتا القراءة المقابلتان للنقطتين المقيستين هما 0.75 و1.67 GB/s: ما دام القرص أسرع من ذلك فلا تحدد سرعة القراءة وحدها سرعة الرموز.<br>③ خذ سرعة القراءة بحسب طريقة قراءتك: الخبراء قراءات كبيرة قريبة من التسلسلية؛ أما Engram فقراءات عشوائية صغيرة، وإنتاجيتها أقل بكثير.',
      tryList: [
        'أبقِ القيمتين الافتراضيتين 3.6 GB/s و48 MB: السقف 75 رمزًا/ث، أي نحو 5 أضعاف المقيس 15.6. هذا معنى «القرص ليس القيد الوحيد».',
        'اسحب سرعة القراءة إلى <b>0.7 GB/s</b>: ينزل سقف حزمة 48 MB إلى نحو 15 رمزًا/ث، فيلتصق بالنقطة المقيسة. وتحت ذلك تصير قراءة القرص هي عنق الزجاجة.',
        'اضغط «استعمل 111 MB» ثم اسحب سرعة القراءة إلى <b>1.6 GB/s</b>: السقف نحو 14 رمزًا/ث، فلا يبلغ المقيس 15.0. كلما زاد ما يُقرأ لكل رمز زاد ما يُطلب من القرص.',
      ],
    },
  });

  const f1 = v => Viz.fmt(v, 1), f0 = v => Viz.fmt(v, 0), f2 = v => Viz.fmt(v, 2);
  const [P48, P111] = M.MEASURED;

  Viz.register('ds-engram-read', {
    mount(el) {
      const g = M.geometry, ax = M.axes, R = M.RANGES;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lg48 },
        { color: 'var(--a3)', text: T.lg111 },
        { color: 'var(--ink)', text: T.lgMeas },
        { color: 'var(--muted)', text: T.lgCustom },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const svg = Viz.svg('svg', { viewBox: '0 0 400 254', class: 'viz-stage', role: 'img', 'aria-label': T.figLabel }, left);
      const txt = (x, y, s, anchor, fill, parent) => { const t = Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': anchor, style: `fill:${fill || 'var(--muted)'}` }, parent || svg); t.textContent = s; return t; };
      const line = (d, stroke, w, extra, parent) => Viz.svg('path', Object.assign({ d, fill: 'none', style: `stroke:${stroke}`, 'stroke-width': w }, extra || {}), parent || svg);

      // Fixed parts: top captions, axes, ticks.
      const dyn = {};
      txt(12, 14, T.top48, 'start'); txt(12, 32, T.top111, 'start');
      dyn.dashNote = txt(12, 50, '', 'start');
      line(`M${g.x(0)} ${g.y(ax.yMax)}V${g.y(0)}H${g.x(ax.xMax)}`, 'var(--muted)', 1.2);
      for (let k = 0; k <= ax.xMax; k++) txt(g.x(k), 228, String(k), 'middle');
      txt(g.x(2), 246, T.axisX, 'middle');
      [0, 25, 50, 75].forEach(w => txt(42, g.y(w) + 4, String(w), 'end'));
      txt(g.x(0) + 8, g.y(ax.yMax) + 8, T.axisY, 'start');

      // Lines: custom (thin) first so the two pack lines sit on top.
      const pathFor = mb => { const [a, b] = M.curve(mb); return `M${g.x(a.gbps).toFixed(1)} ${g.y(a.wps).toFixed(1)}L${g.x(b.gbps).toFixed(1)} ${g.y(b.wps).toFixed(1)}`; };
      dyn.custom = line('', 'var(--muted)', 1.5, { opacity: 0.9 });
      line(pathFor(P48.mb), 'var(--accent)', 2);
      line(pathFor(P111.mb), 'var(--a3)', 2);
      dyn.vline = line('', 'var(--muted)', 1, { 'stroke-dasharray': '3 3' });
      const dot = (fill, stroke, r) => Viz.svg('circle', { r, style: `fill:${fill};stroke:${stroke}`, 'stroke-width': stroke === 'none' ? 0 : 2 }, svg);
      dyn.d48 = dot('var(--accent)', 'none', 3); dyn.d111 = dot('var(--a3)', 'none', 3); dyn.dc = dot('var(--muted)', 'none', 3);
      dyn.l48 = txt(0, 0, '', 'end'); dyn.l111 = txt(0, 0, '', 'end');
      // Measured Mac points: x = the read speed they need at least, y = measured words/s.
      [[P48, 'var(--accent)', 'var(--accent)', 'end'], [P111, 'var(--paper)', 'var(--a3)', 'middle']].forEach(([p, fill, stroke, anchor], i) => {
        const x = g.x(M.requiredRead(p.tps, p.mb)), y = g.y(p.tps);
        const c = Viz.svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 5, style: `fill:${fill};stroke:${stroke}`, 'stroke-width': 2 }, svg);
        c.setAttribute('aria-hidden', 'true');
        txt(i === 0 ? x - 8 : x, y - (i === 0 ? 9 : 12), f2(M.requiredRead(p.tps, p.mb)), anchor, 'var(--muted)');
      });

      left.insertAdjacentHTML('beforeend', `
        <div class="viz-slider"><label for="der-g">${Viz.esc(T.sGbps)}</label><input id="der-g" type="range" min="${R.gbps.min}" max="${R.gbps.max}" step="${R.gbps.step}" value="${M.DEFAULTS.gbps}"><output for="der-g"></output></div>
        <div class="viz-slider"><label for="der-m">${Viz.esc(T.sMb)}</label><input id="der-m" type="range" min="${R.mb.min}" max="${R.mb.max}" step="${R.mb.step}" value="${M.DEFAULTS.mb}"><output for="der-m"></output></div>
        <div class="viz-row"><button type="button" class="viz-btn" data-mb="${P48.mb}" aria-pressed="false">${Viz.esc(T.bp48)}</button><button type="button" class="viz-btn" data-mb="${P111.mb}" aria-pressed="false">${Viz.esc(T.bp111)}</button></div>`);
      right.innerHTML = Viz.stat({ id: 'e-b', k: T.sBoundK, v: '', f: '', hot: true }) + Viz.stat({ id: 'e-n', k: T.sNeedK, v: T.sNeedV(f2(M.requiredRead(P48.tps, P48.mb)), f2(M.requiredRead(P111.tps, P111.mb))), f: T.sNeedF }) +
        Viz.stat({ id: 'e-r', k: T.sRoomK, v: '', f: '' });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.tryList));

      const $ = s => el.querySelector(s);
      const gIn = $('#der-g'), mIn = $('#der-m'), btns = [...left.querySelectorAll('button[data-mb]')];
      const setPos = (c, x, y) => { c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); };

      function draw() {
        const gb = M.clamp(+gIn.value, R.gbps.min, R.gbps.max), mb = M.clamp(+mIn.value, R.mb.min, R.mb.max);
        gIn.nextElementSibling.textContent = T.outGbps(f1(gb)); mIn.nextElementSibling.textContent = T.outMb(f0(mb));
        const l48 = M.upperBound(gb, P48.mb), l111 = M.upperBound(gb, P111.mb), lc = M.upperBound(gb, mb);
        const gx = g.x(gb), top = ax.yMax;
        dyn.vline.setAttribute('d', `M${gx.toFixed(1)} ${g.y(0)}V${g.y(top).toFixed(1)}`);
        dyn.dashNote.textContent = T.topDash(f1(gb), f0(l48), f0(l111));
        const preset = mb === P48.mb || mb === P111.mb;
        dyn.custom.setAttribute('d', preset ? '' : pathFor(mb));
        dyn.dc.setAttribute('visibility', preset ? 'hidden' : 'visible');
        setPos(dyn.d48, gx, g.y(Math.min(l48, top))); setPos(dyn.d111, gx, g.y(Math.min(l111, top))); setPos(dyn.dc, gx, g.y(Math.min(lc, top)));
        // Value labels sit left of the dashed line, or right of it when the line is near the axis.
        const nearAxis = gx < 100, ax2 = nearAxis ? gx + 8 : gx - 8, an = nearAxis ? 'start' : 'end';
        [[dyn.l48, l48, -8], [dyn.l111, l111, 16]].forEach(([t, l, dy]) => {
          t.setAttribute('x', ax2.toFixed(1)); t.setAttribute('text-anchor', an);
          t.setAttribute('y', Math.min(g.y(0) - 4, Math.max(g.y(top) + 10, g.y(Math.min(l, top)) + dy)).toFixed(1));
          t.textContent = f0(l);
        });
        btns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.mb === mb)));
        $('[data-s=e-b-v]').textContent = f1(lc) + ' / s';
        $('[data-s=e-b-f]').innerHTML = T.sBoundF(f1(gb), f0(mb));
        const r48 = l48 / P48.tps, r111 = l111 / P111.tps;
        $('[data-s=e-r-v]').textContent = T.sRoomV(f1(r48), f1(r111));
        $('[data-s=e-r-f]').innerHTML = T.sRoomF(f1(gb));
        const v = $('.viz-verdict'), lo48 = l48 < P48.tps, lo111 = l111 < P111.tps;
        v.innerHTML = (lo48 && lo111 ? T.vLowBoth(f1(gb), f0(l48), f0(l111)) : lo48 ? T.vLow48(f1(gb), f0(l48)) : lo111 ? T.vLow111(f1(gb), f0(l111)) : T.vOk(f1(gb), f0(l48), f0(l111))) + (lo48 || lo111 ? T.vTail : '');
      }
      gIn.oninput = draw; mIn.oninput = draw;
      btns.forEach(b => { b.onclick = () => { mIn.value = b.dataset.mb; draw(); }; });
      draw();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
