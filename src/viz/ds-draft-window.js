/* DeepSeek column, page 5.2: how many drafts enter the verify window, and what that does to the words per round.
   All visible text lives in T (zh is the master; translators add the other languages). Nothing here animates,
   so prefers-reduced-motion needs no special path: every control redraws the final state at once. */
(function (root) {
  'use strict';
  const { Viz } = root;
  const M = root.VizMath.dsDraftWindow;

  const T = Viz.t({
    zh: {
      code: 'DRAFT_WINDOW', title: '验几个草稿：两道门槛怎么裁窗口', tag: '教学推演 · 置信度是教学数字，不是实测',
      intro: '草稿模型一轮给出 5 个草稿和 5 个置信度。引擎从第 1 个数起：某个草稿的置信度低于<b>下限</b>，或者前面各草稿置信度的<b>连乘</b>低于连乘门槛，就在这里停，后面的整条丢掉。留下 k 个草稿，窗口就有 k + 1 行，每轮期望吐出 <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b> 个字。拖四个旋钮，看三种裁法各验几个、各吐几个字。把置信度当成条件接受率，是本页的教学假设，引擎没有测过。',
      lgFloor: '再加连乘后仍验的草稿', lgCum: '只设下限时多验的草稿', lgNone: '不裁剪时才验的草稿',
      chartLabel: (c, k1, k2, k3) => `五个草稿的置信度：${c}。不裁剪验 ${k1} 个；只设下限验 ${k2} 个；再加连乘门槛验 ${k3} 个`,
      floorLine: (v) => `下限 ${v}`,
      draft: (j) => `草稿 ${j}`, rowConf: '置信度', rowCum: '连乘', rowFloor: '只设下限', rowBoth: '再加连乘',
      yes: '验', stop: '停', none: '—',
      dLabel: '每轮草稿数', sLabel: '接受率', fLabel: '下限', cLabel: '连乘门槛',
      dOut: (v) => `${v} 个`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? '关' : v), cOut: (v) => (v === 0 ? '关' : v),
      sNone: '不裁剪', sFloor: '只设下限', sBoth: '再加连乘',
      sK: (name) => name,
      sV: (k, w) => `验 ${k} 个 · ${w} 字`,
      sF: (k, w, c) => `<b>窗口 ${k + 1} 行</b><br>= 1 + ${c}<br>≈ ${w} 个字 / 轮`,
      sFnone: '<b>窗口 1 行</b><br>= 1<br>没有草稿进窗口，和不猜一样多',
      vNormal: (dr, dw) => `① 连乘门槛比只设下限多砍 <b>${dr}</b> 行，期望少 <b>${dw}</b> 个字。<br>② 少验的那几行，省下多少成本，因机器而异：RDNA4 上值得，CUDA 上持平，所以连乘门槛默认值不同（0.5 或 0）。<br>③ 上游只给最后的 token/s，不给每轮的字数；这里的字数是教学推演。`,
      vSame: '① 两道门槛这次裁出同样多的草稿，连乘门槛没有额外作用。<br>② 试试调高连乘门槛，或者调低接受率，看它什么时候开始多砍。<br>③ 上游只给最后的 token/s，不给每轮的字数；这里的字数是教学推演。',
      vZero: '① 没有一个草稿过得了门槛：引擎照常走一个普通解码步，并让下一轮不起草（一轮白起草，下一轮就歇着）。<br>② 每轮只吐 1 个字，和不猜一样多，但起草的耗时已经花掉了。<br>③ 门槛太严，等于白起草。',
      try: [
        '保持默认（5 个草稿、接受率 100%、下限 0.5、连乘 0.5）：不裁剪验 5 个，期望 2.62 个字；只设下限验 2 个，2.30 个字；再加连乘验 1 个，1.80 个字。这是页上图 DS5-2 的数字。',
        '把连乘门槛拉到 <b>0.4</b>：草稿 2 的连乘 0.496 过关，连乘门槛不再多砍，两行结果一样。再拉回 0.5，它又差一点点被拦下。',
        '把接受率拉到 <b>60%</b>、再拉到 <b>120%</b>：置信度整体变低或变高，三种裁法验的个数和期望的字数一起变。接受率低时，两道门槛几乎把窗口砍光。',
      ],
    },
    en: {
      code: 'DRAFT_WINDOW', title: 'How many drafts to verify: how two gates trim the window', tag: 'Teaching estimate · confidences are teaching numbers, not measurements',
      intro: 'The draft model gives 5 drafts and 5 confidences per round. The engine counts from draft 1. It stops when a draft\'s confidence is below the <b>floor</b>, or when the <b>running product</b> of the confidences so far is below the product gate, and it drops the whole tail after that point. If k drafts stay, the window has k + 1 rows, and each round is expected to yield <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b> tokens. Drag the four knobs to see how many drafts each of the three ways to trim verifies, and how many tokens each yields. Treating confidence as the conditional acceptance rate is this page\'s teaching assumption. The engine has not measured it.',
      lgFloor: 'Still verified after adding the product gate', lgCum: 'Extra drafts verified with only the floor', lgNone: 'Drafts verified only with no trimming',
      chartLabel: (c, k1, k2, k3) => `Confidences of the five drafts: ${c}. With no trimming, ${k1} are verified; with only the floor, ${k2}; with the product gate added, ${k3}`,
      floorLine: (v) => `floor ${v}`,
      draft: (j) => `Draft ${j}`, rowConf: 'Confidence', rowCum: 'Product', rowFloor: 'Floor only', rowBoth: '+ product',
      yes: 'verify', stop: 'stop', none: '—',
      dLabel: 'Drafts per round', sLabel: 'Acceptance rate', fLabel: 'Floor', cLabel: 'Product gate',
      dOut: (v) => `${v}`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? 'off' : v), cOut: (v) => (v === 0 ? 'off' : v),
      sNone: 'No trimming', sFloor: 'Floor only', sBoth: '+ product',
      sK: (name) => name,
      sV: (k, w) => `verify ${k} · ${w} tokens`,
      sF: (k, w, c) => `<b>${k + 1}-row window</b><br>= 1 + ${c}<br>≈ ${w} tokens / round`,
      sFnone: '<b>1-row window</b><br>= 1<br>No draft enters the window: the same yield as not guessing',
      vNormal: (dr, dw) => `① The product gate cuts <b>${dr}</b> more rows than the floor alone, and the expected yield drops by <b>${dw}</b> tokens.<br>② How much cost the skipped rows save depends on the machine: it pays off on RDNA4 and is flat on CUDA, so the default product gate differs (0.5 or 0).<br>③ Upstream reports only the final tokens/s, not tokens per round; the token counts here are teaching estimates.`,
      vSame: '① This time the two gates trim to the same number of drafts, so the product gate adds nothing.<br>② Try raising the product gate or lowering the acceptance rate to see when it starts to cut more.<br>③ Upstream reports only the final tokens/s, not tokens per round; the token counts here are teaching estimates.',
      vZero: '① No draft passes the gates: the engine takes an ordinary decode step and makes the next round skip drafting (after one wasted round of drafting, the next round rests).<br>② Each round yields only 1 token, the same as not guessing, but the drafting time has already been spent.<br>③ Gates that are too strict mean wasted drafting.',
      try: [
        'Keep the defaults (5 drafts, acceptance rate 100%, floor 0.5, product 0.5). With no trimming, 5 are verified and the expected yield is 2.62 tokens. With only the floor, 2 are verified and the yield is 2.30. With the product gate added, 1 is verified and the yield is 1.80. These are the numbers in Figure DS5-2 on the page.',
        'Set the product gate to <b>0.4</b>: draft 2 has a product of 0.496 and passes, so the product gate no longer cuts more, and the two rows show the same result. Set it back to 0.5 and draft 2 misses by a hair again.',
        'Set the acceptance rate to <b>60%</b>, then to <b>120%</b>: all confidences get lower or higher, and the number of drafts verified and the expected tokens change together for all three ways to trim. At a low acceptance rate, the two gates cut the window almost to nothing.',
      ],
    },
    ja: {
      code: 'DRAFT_WINDOW', title: '検証するドラフトの数：2 つのしきい値がウィンドウをどう切るか', tag: '教育用の試算 · 信頼度は教育用の数字で、実測ではありません',
      intro: '1 ラウンドで、ドラフトモデルはドラフト 5 個と信頼度 5 個を出します。エンジンは 1 個目から数え、あるドラフトの信頼度が<b>下限</b>を下回るか、前のドラフトの信頼度の<b>累積積</b>が累積しきい値を下回ったところで止め、それ以降はまとめて捨てます。k 個のドラフトが残れば、ウィンドウは k + 1 行になり、1 ラウンドあたりの期待トークン数は <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b> です。4 つのつまみを動かして、3 通りの切り方がそれぞれ何個を検証し、何トークン出すかを見てください。信頼度を条件付き受理率とみなすのは、このページの教育上の仮定で、エンジンが測ったものではありません。',
      lgFloor: '累積も加えたあとなお検証されるドラフト', lgCum: '下限のみのときに余分に検証されるドラフト', lgNone: '切り詰めなしのときだけ検証されるドラフト',
      chartLabel: (c, k1, k2, k3) => `5 個のドラフトの信頼度：${c}。切り詰めなしなら ${k1} 個を検証、下限のみなら ${k2} 個を検証、累積しきい値も加えると ${k3} 個を検証`,
      floorLine: (v) => `下限 ${v}`,
      draft: (j) => `ドラフト ${j}`, rowConf: '信頼度', rowCum: '累積積', rowFloor: '下限のみ', rowBoth: 'さらに累積',
      yes: '検証', stop: '停止', none: '—',
      dLabel: '1 ラウンドのドラフト数', sLabel: '受理率', fLabel: '下限', cLabel: '累積しきい値',
      dOut: (v) => `${v} 個`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? 'オフ' : v), cOut: (v) => (v === 0 ? 'オフ' : v),
      sNone: '切り詰めなし', sFloor: '下限のみ', sBoth: 'さらに累積',
      sK: (name) => name,
      sV: (k, w) => `${k} 個を検証 · ${w} トークン`,
      sF: (k, w, c) => `<b>ウィンドウ ${k + 1} 行</b><br>= 1 + ${c}<br>≈ ${w} トークン / ラウンド`,
      sFnone: '<b>ウィンドウ 1 行</b><br>= 1<br>ウィンドウに入るドラフトはなく、推測しないのと同じ数',
      vNormal: (dr, dw) => `① 累積しきい値は、下限のみのときより、さらに <b>${dr}</b> 行を切り、期待値を <b>${dw}</b> トークン減らします。<br>② 検証を減らした行でどれだけコストが浮くかは、マシンによって違います。RDNA4 では見合い、CUDA では同等なので、累積しきい値の既定値が違います（0.5 か 0）。<br>③ 上流は最後の token/s しか与えず、1 ラウンドあたりのトークン数は与えません。ここのトークン数は教育用の試算です。`,
      vSame: '① 今回は 2 つのしきい値が同じ数のドラフトに切りました。累積しきい値は余分な働きをしていません。<br>② 累積しきい値を上げるか、受理率を下げて、どこから余分に切り始めるか試してみてください。<br>③ 上流は最後の token/s しか与えず、1 ラウンドあたりのトークン数は与えません。ここのトークン数は教育用の試算です。',
      vZero: '① しきい値を通るドラフトが 1 つもありません。エンジンは普通のデコードを 1 ステップ進め、次のラウンドは起草しません（無駄になった起草の次のラウンドは休み）。<br>② 1 ラウンドに出るのは 1 トークンで、推測しないのと同じですが、起草の時間はもう使われています。<br>③ しきい値が厳しすぎると、起草は無駄になります。',
      try: [
        '既定のまま（ドラフト 5 個、受理率 100%、下限 0.5、累積 0.5）：切り詰めなしは 5 個を検証して期待値 2.62 トークン、下限のみは 2 個で 2.30 トークン、さらに累積を加えると 1 個で 1.80 トークン。これはページの図 DS5-2 の数字です。',
        '累積しきい値を <b>0.4</b> にします：ドラフト 2 の累積積 0.496 が通るので、累積しきい値は余分に切らず、2 行の結果は同じになります。0.5 に戻すと、ほんの少し足りず、また止められます。',
        '受理率を <b>60%</b> に、次に <b>120%</b> にします：信頼度が全体に低く、または高くなり、3 通りの切り方の検証数と期待トークン数がいっしょに変わります。受理率が低いと、2 つのしきい値はウィンドウをほとんど切り尽くします。',
      ],
    },
    ko: {
      code: 'DRAFT_WINDOW', title: '초안 몇 개를 검증할까: 두 문턱값이 윈도를 줄이는 방법', tag: '교육용 추정 · 신뢰도는 교육용 숫자이며 실측값이 아니에요',
      intro: '초안 모델은 한 라운드에 초안 5개와 신뢰도 5개를 내요. 엔진은 첫 번째 초안부터 세요. 어떤 초안의 신뢰도가 <b>하한</b>보다 낮거나, 앞쪽 초안들의 신뢰도의 <b>누적곱</b>이 누적곱 문턱값보다 낮으면 거기서 멈추고, 그 뒤는 통째로 버려요. 초안이 k개 남으면 윈도는 k + 1행이 되고, 한 라운드의 토큰 기댓값은 <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b>개예요. 조절 항목 네 개를 움직이면서, 세 방법이 각각 몇 개를 검증하고 토큰을 몇 개 내는지 보세요. 신뢰도를 조건부 수락률로 보는 것은 이 페이지의 교육용 가정이고, 엔진이 측정한 값이 아니에요.',
      lgFloor: '누적곱을 더해도 검증하는 초안', lgCum: '하한만 둘 때 더 검증하는 초안', lgNone: '줄이지 않을 때만 검증하는 초안',
      chartLabel: (c, k1, k2, k3) => `다섯 초안의 신뢰도: ${c}. 줄이지 않으면 ${k1}개를 검증해요. 하한만 설정하면 ${k2}개를 검증해요. 누적곱 문턱값을 더하면 ${k3}개를 검증해요`,
      floorLine: (v) => `하한 ${v}`,
      draft: (j) => `초안 ${j}`, rowConf: '신뢰도', rowCum: '누적곱', rowFloor: '하한만', rowBoth: '+누적곱',
      yes: '검증', stop: '중단', none: '—',
      dLabel: '라운드당 초안 수', sLabel: '수락률', fLabel: '하한', cLabel: '누적곱 문턱값',
      dOut: (v) => `${v}개`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? '끔' : v), cOut: (v) => (v === 0 ? '끔' : v),
      sNone: '줄이지 않음', sFloor: '하한만 설정', sBoth: '누적곱 추가',
      sK: (name) => name,
      sV: (k, w) => `${k}개 검증 · 토큰 ${w}개`,
      sF: (k, w, c) => `<b>윈도 ${k + 1}행</b><br>= 1 + ${c}<br>≈ 라운드당 토큰 ${w}개`,
      sFnone: '<b>윈도 1행</b><br>= 1<br>윈도에 들어간 초안이 없어서, 추측하지 않을 때와 토큰 수가 같아요',
      vNormal: (dr, dw) => `① 누적곱 문턱값은 하한만 둘 때보다 행을 <b>${dr}</b>개 더 자르고, 기댓값은 토큰 <b>${dw}</b>개 줄어요.<br>② 덜 검증한 행들이 비용을 얼마나 아끼는지는 기계마다 달라요. RDNA4에서는 값어치가 있고 CUDA에서는 비슷해서, 누적곱 문턱값의 기본값이 달라요(0.5 또는 0).<br>③ 업스트림은 마지막 token/s만 주고 라운드당 토큰 수는 주지 않아요. 여기 나온 토큰 수는 교육용 추정이에요.`,
      vSame: '① 이번에는 두 문턱값이 같은 수의 초안을 남겨서, 누적곱 문턱값이 하는 일이 따로 없어요.<br>② 누적곱 문턱값을 올리거나 수락률을 내려서, 언제부터 더 자르기 시작하는지 보세요.<br>③ 업스트림은 마지막 token/s만 주고 라운드당 토큰 수는 주지 않아요. 여기 나온 토큰 수는 교육용 추정이에요.',
      vZero: '① 문턱값을 넘는 초안이 하나도 없어요. 엔진은 평소처럼 일반 디코드 한 단계를 돌리고, 다음 라운드에는 초안을 쓰지 않아요(한 라운드를 헛되이 초안 작성하면, 다음 라운드는 쉬어요).<br>② 라운드마다 토큰이 1개만 나와요. 추측하지 않을 때와 같지만, 초안 작성에 든 시간은 이미 썼어요.<br>③ 문턱값이 너무 엄격하면 초안 작성이 헛수고가 돼요.',
      try: [
        '기본값을 그대로 둬요(초안 5개, 수락률 100%, 하한 0.5, 누적곱 0.5). 줄이지 않으면 5개를 검증하고 기댓값은 토큰 2.62개예요. 하한만 설정하면 2개를 검증하고 2.30개예요. 누적곱까지 더하면 1개를 검증하고 1.80개예요. 이것이 페이지의 그림 DS5-2에 나온 숫자예요.',
        '누적곱 문턱값을 <b>0.4</b>로 올려요. 초안 2의 누적곱 0.496이 통과하므로 누적곱 문턱값이 더 자르지 않고, 두 줄의 결과가 같아져요. 다시 0.5로 돌리면 또 아슬아슬하게 막혀요.',
        '수락률을 <b>60%</b>로 낮췄다가 <b>120%</b>로 올려 봐요. 신뢰도가 전체적으로 낮아지거나 높아지고, 세 방법이 검증하는 개수와 기댓값 토큰 수가 함께 바뀌어요. 수락률이 낮으면 두 문턱값이 윈도를 거의 다 잘라 내요.',
      ],
    },
    es: {
      code: 'DRAFT_WINDOW', title: 'Cuántos borradores verificar: cómo recortan la ventana los dos umbrales', tag: 'Estimación didáctica · las confianzas son cifras didácticas, no medidas',
      intro: 'El modelo borrador da en cada ronda 5 borradores y 5 confianzas. El motor cuenta desde el primero: si la confianza de un borrador queda por debajo del <b>límite inferior</b>, o si el <b>producto acumulado</b> de las confianzas anteriores queda por debajo del umbral del producto, se detiene ahí y descarta entera la cola que sigue. Si se conservan k borradores, la ventana tiene k + 1 filas y cada ronda produce en promedio <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b> tokens. Mueve los cuatro controles y mira cuántos verifica cada una de las tres formas de recortar y cuántos tokens produce. Tratar la confianza como tasa de aceptación condicional es una suposición didáctica de esta página; el motor no la ha medido.',
      lgFloor: 'Borradores que se verifican aun con el producto', lgCum: 'Borradores extra con solo el límite inferior', lgNone: 'Borradores que solo se verifican sin recorte',
      chartLabel: (c, k1, k2, k3) => `Confianzas de los cinco borradores: ${c}. Sin recorte se verifican ${k1}; con solo el límite inferior, ${k2}; con el umbral de producto además, ${k3}`,
      floorLine: (v) => `límite ${v}`,
      draft: (j) => `Borr. ${j}`, rowConf: 'Confianza', rowCum: 'Producto', rowFloor: 'Solo límite', rowBoth: '+ producto',
      yes: 'Verif.', stop: 'Alto', none: '—',
      dLabel: 'Borradores por ronda', sLabel: 'Tasa de aceptación', fLabel: 'Límite inferior', cLabel: 'Umbral del producto',
      dOut: (v) => `${v}`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? 'apagado' : v), cOut: (v) => (v === 0 ? 'apagado' : v),
      sNone: 'Sin recorte', sFloor: 'Solo límite inferior', sBoth: '+ producto acumulado',
      sK: (name) => name,
      sV: (k, w) => `verifica ${k} · ${w} tokens`,
      sF: (k, w, c) => `<b>ventana de ${k + 1} filas</b><br>= 1 + ${c}<br>≈ ${w} tokens / ronda`,
      sFnone: '<b>ventana de 1 fila</b><br>= 1<br>ningún borrador entra en la ventana: lo mismo que sin adivinar',
      vNormal: (dr, dw) => `① El umbral del producto recorta <b>${dr}</b> filas más que el límite inferior solo, y se esperan <b>${dw}</b> tokens menos.<br>② Cuánto costo ahorran las filas que ya no se verifican depende de la máquina: en RDNA4 compensa y en CUDA queda en empate, por eso el valor por defecto del umbral del producto es distinto (0.5 o 0).<br>③ Upstream solo da los tokens/s finales, no los tokens por ronda; estos tokens son una estimación didáctica.`,
      vSame: '① Esta vez los dos umbrales dejan el mismo número de borradores, así que el umbral del producto no aporta nada extra.<br>② Prueba a subir el umbral del producto o a bajar la tasa de aceptación y mira cuándo empieza a recortar más.<br>③ Upstream solo da los tokens/s finales, no los tokens por ronda; estos tokens son una estimación didáctica.',
      vZero: '① Ningún borrador pasa los umbrales: el motor da un paso de decodificación normal y hace que la ronda siguiente no genere borrador (un borrador en vano, y la ronda siguiente descansa).<br>② Cada ronda produce solo 1 token, lo mismo que sin adivinar, pero el tiempo de generar el borrador ya se gastó.<br>③ Con umbrales demasiado estrictos, generar el borrador es tiempo perdido.',
      try: [
        'Déjalo por defecto (5 borradores, tasa de aceptación 100%, límite inferior 0.5, producto 0.5): sin recorte se verifican 5 y se esperan 2.62 tokens; con solo el límite inferior se verifican 2 y salen 2.30 tokens; con el producto además se verifica 1 y salen 1.80 tokens. Son las cifras de la Figura DS5-2 de la página.',
        'Baja el umbral del producto a <b>0.4</b>: el producto 0.496 del borrador 2 pasa, el umbral del producto ya no recorta de más y las dos filas dan lo mismo. Súbelo otra vez a 0.5 y vuelve a quedar bloqueado por muy poco.',
        'Lleva la tasa de aceptación a <b>60%</b> y luego a <b>120%</b>: las confianzas en conjunto bajan o suben, y el número de borradores verificados y los tokens esperados cambian a la vez de las tres formas. Con una tasa baja, los dos umbrales casi eliminan la ventana.',
      ],
    },
    ar: {
      code: 'DRAFT_WINDOW', title: 'كم مسودة نتحقق منها: كيف تقصّر العتبتان النافذة', tag: 'تقدير تعليمي · درجات الثقة أرقام تعليمية، وليست قياسًا',
      intro: 'يُخرج نموذج المسودة في كل جولة 5 مسودات و5 درجات ثقة. يعدّ المحرك من المسودة الأولى: إذا كانت درجة ثقة مسودة ما دون <b>الحد الأدنى</b>، أو كان <b>حاصل ضرب</b> درجات ثقة المسودات التي قبلها دون عتبة الضرب التراكمي، توقّف عندها وأسقط كل ما بعدها. فإذا بقيت k مسودة فللنافذة k + 1 صفًا، ويخرج في كل جولة عدد متوقع من الرموز هو <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b>. حرّك المقابض الأربعة وانظر كم تتحقق كل طريقة من الطرق الثلاث من مسودة، وكم رمزًا تُخرج. واعتبار درجة الثقة معدل قبول شرطيًا فرضية تعليمية في هذه الصفحة، ولم يقسها المحرك.',
      lgFloor: 'مسودات ما زال يُتحقَّق منها بعد إضافة الضرب التراكمي', lgCum: 'مسودات يُتحقَّق منها زيادةً إذا وُضع الحد الأدنى وحده', lgNone: 'مسودات لا يُتحقَّق منها إلا بلا تقصير',
      chartLabel: (c, k1, k2, k3) => `درجات ثقة المسودات الخمس: ${c}. بلا تقصير يُتحقَّق من ${k1}؛ بحد أدنى فقط يُتحقَّق من ${k2}؛ ومع عتبة الضرب التراكمي يُتحقَّق من ${k3}`,
      floorLine: (v) => `الحد الأدنى ${v}`,
      draft: (j) => `المسودة ${j}`, rowConf: 'الثقة', rowCum: 'التراكمي', rowFloor: 'الحد فقط', rowBoth: 'الاثنان',
      yes: 'تحقق', stop: 'توقف', none: '—',
      dLabel: 'المسودات في الجولة', sLabel: 'معدل القبول', fLabel: 'الحد الأدنى', cLabel: 'عتبة الضرب التراكمي',
      dOut: (v) => `${v}`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? 'إيقاف' : v), cOut: (v) => (v === 0 ? 'إيقاف' : v),
      sNone: 'بلا تقصير', sFloor: 'حد أدنى فقط', sBoth: 'مع الضرب التراكمي',
      sK: (name) => name,
      sV: (k, w) => `المُتحقَّق منه: ${k} · المتوقع: ${w}`,
      sF: (k, w, c) => `<b>عدد صفوف النافذة: ${k + 1}</b><br><span dir="ltr">= 1 + ${c}</span><br><span dir="ltr">≈ ${w}</span> رمز لكل جولة`,
      sFnone: '<b>صف واحد في النافذة</b><br><span dir="ltr">= 1</span><br>لا مسودة تدخل النافذة، فالناتج كما بلا تخمين',
      vNormal: (dr, dw) => `① عدد الصفوف الزائدة التي يقتطعها الضرب التراكمي عن الحد الأدنى وحده: <b>${dr}</b>؛ والخسارة في المتوقع: <b>${dw}</b> رمز.<br>② ما توفّره الصفوف التي لم نتحقق منها من تكلفة يختلف من جهاز إلى آخر: يستحق في RDNA4، ويتعادل في CUDA، ولذلك تختلف القيمة الافتراضية لعتبة الضرب التراكمي (0.5 أو 0).<br>③ المصدر الأصلي لا يعطي إلا token/s النهائية، ولا عدد الرموز في كل جولة؛ والأرقام هنا تقدير تعليمي.`,
      vSame: '① العتبتان قصّرتا النافذة إلى العدد نفسه من المسودات هذه المرة، فلا أثر إضافيًا لعتبة الضرب التراكمي.<br>② جرّب رفع عتبة الضرب التراكمي أو خفض معدل القبول، وانظر متى تبدأ بالاقتطاع الزائد.<br>③ المصدر الأصلي لا يعطي إلا token/s النهائية، ولا عدد الرموز في كل جولة؛ والأرقام هنا تقدير تعليمي.',
      vZero: '① لا مسودة واحدة تجتاز العتبتين: ينفّذ المحرك خطوة فك ترميز عادية، ويجعل الجولة التالية بلا تخمين (جولة تخمين ضائعة، فتستريح الجولة التالية).<br>② تخرج الجولة رمزًا واحدًا فقط، كما بلا تخمين، لكن زمن التخمين قد صُرف.<br>③ العتبة المتشددة أكثر من اللازم تعني تخمينًا ضائعًا.',
      try: [
        'أبقِ القيم الافتراضية (5 مسودات، ومعدل القبول 100%، والحد الأدنى 0.5، والضرب التراكمي 0.5): بلا تقصير يُتحقَّق من 5 والمتوقع 2.62 رمزًا؛ وبحد أدنى فقط يُتحقَّق من 2 والمتوقع 2.30 رمزًا؛ ومع الضرب التراكمي يُتحقَّق من 1 والمتوقع 1.80 رمزًا. هذه أرقام الشكل DS5-2 في الصفحة.',
        'ارفع عتبة الضرب التراكمي إلى <b>0.4</b>: الضرب التراكمي عند المسودة 2 هو 0.496 فتجتاز، ولا تقتطع العتبة شيئًا زائدًا، فتتطابق النتيجتان. ثم أعدها إلى 0.5 فتُمنع بفارق ضئيل.',
        'اخفض معدل القبول إلى <b>60%</b>، ثم ارفعه إلى <b>120%</b>: ترتفع درجات الثقة كلها أو تنخفض، فيتغير معها عدد المسودات التي تتحقق منها الطرق الثلاث والمتوقع من الرموز. وحين يكون معدل القبول منخفضًا تكاد العتبتان تقتطعان النافذة كلها.',
      ],
    },
    en: {
      code: 'DRAFT_WINDOW', title: 'How many drafts to verify: how two gates trim the window', tag: 'Teaching estimate · confidences are teaching numbers, not measurements',
      intro: 'The draft model gives 5 drafts and 5 confidences per round. The engine counts from draft 1. It stops when a draft\'s confidence is below the <b>floor</b>, or when the <b>running product</b> of the confidences so far is below the product gate, and it drops the whole tail after that point. If k drafts stay, the window has k + 1 rows, and each round is expected to yield <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b> tokens. Drag the four knobs to see how many drafts each of the three ways to trim verifies, and how many tokens each yields. Treating confidence as the conditional acceptance rate is this page\'s teaching assumption. The engine has not measured it.',
      lgFloor: 'Still verified after adding the product gate', lgCum: 'Extra drafts verified with only the floor', lgNone: 'Drafts verified only with no trimming',
      chartLabel: (c, k1, k2, k3) => `Confidences of the five drafts: ${c}. With no trimming, ${k1} are verified; with only the floor, ${k2}; with the product gate added, ${k3}`,
      floorLine: (v) => `floor ${v}`,
      draft: (j) => `Draft ${j}`, rowConf: 'Confidence', rowCum: 'Product', rowFloor: 'Floor only', rowBoth: '+ product',
      yes: 'verify', stop: 'stop', none: '—',
      dLabel: 'Drafts per round', sLabel: 'Acceptance rate', fLabel: 'Floor', cLabel: 'Product gate',
      dOut: (v) => `${v}`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? 'off' : v), cOut: (v) => (v === 0 ? 'off' : v),
      sNone: 'No trimming', sFloor: 'Floor only', sBoth: '+ product',
      sK: (name) => name,
      sV: (k, w) => `verify ${k} · ${w} tokens`,
      sF: (k, w, c) => `<b>${k + 1}-row window</b><br>= 1 + ${c}<br>≈ ${w} tokens / round`,
      sFnone: '<b>1-row window</b><br>= 1<br>No draft enters the window: the same yield as not guessing',
      vNormal: (dr, dw) => `① The product gate cuts <b>${dr}</b> more rows than the floor alone, and the expected yield drops by <b>${dw}</b> tokens.<br>② How much cost the skipped rows save depends on the machine: it pays off on RDNA4 and is flat on CUDA, so the default product gate differs (0.5 or 0).<br>③ Upstream reports only the final tokens/s, not tokens per round; the token counts here are teaching estimates.`,
      vSame: '① This time the two gates trim to the same number of drafts, so the product gate adds nothing.<br>② Try raising the product gate or lowering the acceptance rate to see when it starts to cut more.<br>③ Upstream reports only the final tokens/s, not tokens per round; the token counts here are teaching estimates.',
      vZero: '① No draft passes the gates: the engine takes an ordinary decode step and makes the next round skip drafting (after one wasted round of drafting, the next round rests).<br>② Each round yields only 1 token, the same as not guessing, but the drafting time has already been spent.<br>③ Gates that are too strict mean wasted drafting.',
      try: [
        'Keep the defaults (5 drafts, acceptance rate 100%, floor 0.5, product 0.5). With no trimming, 5 are verified and the expected yield is 2.62 tokens. With only the floor, 2 are verified and the yield is 2.30. With the product gate added, 1 is verified and the yield is 1.80. These are the numbers in Figure DS5-2 on the page.',
        'Set the product gate to <b>0.4</b>: draft 2 has a product of 0.496 and passes, so the product gate no longer cuts more, and the two rows show the same result. Set it back to 0.5 and draft 2 misses by a hair again.',
        'Set the acceptance rate to <b>60%</b>, then to <b>120%</b>: all confidences get lower or higher, and the number of drafts verified and the expected tokens change together for all three ways to trim. At a low acceptance rate, the two gates cut the window almost to nothing.',
      ],
    },
    ja: {
      code: 'DRAFT_WINDOW', title: '検証するドラフトの数：2 つのしきい値がウィンドウをどう切るか', tag: '教育用の試算 · 信頼度は教育用の数字で、実測ではありません',
      intro: '1 ラウンドで、ドラフトモデルはドラフト 5 個と信頼度 5 個を出します。エンジンは 1 個目から数え、あるドラフトの信頼度が<b>下限</b>を下回るか、前のドラフトの信頼度の<b>累積積</b>が累積しきい値を下回ったところで止め、それ以降はまとめて捨てます。k 個のドラフトが残れば、ウィンドウは k + 1 行になり、1 ラウンドあたりの期待トークン数は <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b> です。4 つのつまみを動かして、3 通りの切り方がそれぞれ何個を検証し、何トークン出すかを見てください。信頼度を条件付き受理率とみなすのは、このページの教育上の仮定で、エンジンが測ったものではありません。',
      lgFloor: '累積も加えたあとなお検証されるドラフト', lgCum: '下限のみのときに余分に検証されるドラフト', lgNone: '切り詰めなしのときだけ検証されるドラフト',
      chartLabel: (c, k1, k2, k3) => `5 個のドラフトの信頼度：${c}。切り詰めなしなら ${k1} 個を検証、下限のみなら ${k2} 個を検証、累積しきい値も加えると ${k3} 個を検証`,
      floorLine: (v) => `下限 ${v}`,
      draft: (j) => `ドラフト ${j}`, rowConf: '信頼度', rowCum: '累積積', rowFloor: '下限のみ', rowBoth: 'さらに累積',
      yes: '検証', stop: '停止', none: '—',
      dLabel: '1 ラウンドのドラフト数', sLabel: '受理率', fLabel: '下限', cLabel: '累積しきい値',
      dOut: (v) => `${v} 個`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? 'オフ' : v), cOut: (v) => (v === 0 ? 'オフ' : v),
      sNone: '切り詰めなし', sFloor: '下限のみ', sBoth: 'さらに累積',
      sK: (name) => name,
      sV: (k, w) => `${k} 個を検証 · ${w} トークン`,
      sF: (k, w, c) => `<b>ウィンドウ ${k + 1} 行</b><br>= 1 + ${c}<br>≈ ${w} トークン / ラウンド`,
      sFnone: '<b>ウィンドウ 1 行</b><br>= 1<br>ウィンドウに入るドラフトはなく、推測しないのと同じ数',
      vNormal: (dr, dw) => `① 累積しきい値は、下限のみのときより、さらに <b>${dr}</b> 行を切り、期待値を <b>${dw}</b> トークン減らします。<br>② 検証を減らした行でどれだけコストが浮くかは、マシンによって違います。RDNA4 では見合い、CUDA では同等なので、累積しきい値の既定値が違います（0.5 か 0）。<br>③ 上流は最後の token/s しか与えず、1 ラウンドあたりのトークン数は与えません。ここのトークン数は教育用の試算です。`,
      vSame: '① 今回は 2 つのしきい値が同じ数のドラフトに切りました。累積しきい値は余分な働きをしていません。<br>② 累積しきい値を上げるか、受理率を下げて、どこから余分に切り始めるか試してみてください。<br>③ 上流は最後の token/s しか与えず、1 ラウンドあたりのトークン数は与えません。ここのトークン数は教育用の試算です。',
      vZero: '① しきい値を通るドラフトが 1 つもありません。エンジンは普通のデコードを 1 ステップ進め、次のラウンドは起草しません（無駄になった起草の次のラウンドは休み）。<br>② 1 ラウンドに出るのは 1 トークンで、推測しないのと同じですが、起草の時間はもう使われています。<br>③ しきい値が厳しすぎると、起草は無駄になります。',
      try: [
        '既定のまま（ドラフト 5 個、受理率 100%、下限 0.5、累積 0.5）：切り詰めなしは 5 個を検証して期待値 2.62 トークン、下限のみは 2 個で 2.30 トークン、さらに累積を加えると 1 個で 1.80 トークン。これはページの図 DS5-2 の数字です。',
        '累積しきい値を <b>0.4</b> にします：ドラフト 2 の累積積 0.496 が通るので、累積しきい値は余分に切らず、2 行の結果は同じになります。0.5 に戻すと、ほんの少し足りず、また止められます。',
        '受理率を <b>60%</b> に、次に <b>120%</b> にします：信頼度が全体に低く、または高くなり、3 通りの切り方の検証数と期待トークン数がいっしょに変わります。受理率が低いと、2 つのしきい値はウィンドウをほとんど切り尽くします。',
      ],
    },
    ko: {
      code: 'DRAFT_WINDOW', title: '초안 몇 개를 검증할까: 두 문턱값이 윈도를 줄이는 방법', tag: '교육용 추정 · 신뢰도는 교육용 숫자이며 실측값이 아니에요',
      intro: '초안 모델은 한 라운드에 초안 5개와 신뢰도 5개를 내요. 엔진은 첫 번째 초안부터 세요. 어떤 초안의 신뢰도가 <b>하한</b>보다 낮거나, 앞쪽 초안들의 신뢰도의 <b>누적곱</b>이 누적곱 문턱값보다 낮으면 거기서 멈추고, 그 뒤는 통째로 버려요. 초안이 k개 남으면 윈도는 k + 1행이 되고, 한 라운드의 토큰 기댓값은 <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b>개예요. 조절 항목 네 개를 움직이면서, 세 방법이 각각 몇 개를 검증하고 토큰을 몇 개 내는지 보세요. 신뢰도를 조건부 수락률로 보는 것은 이 페이지의 교육용 가정이고, 엔진이 측정한 값이 아니에요.',
      lgFloor: '누적곱을 더해도 검증하는 초안', lgCum: '하한만 둘 때 더 검증하는 초안', lgNone: '줄이지 않을 때만 검증하는 초안',
      chartLabel: (c, k1, k2, k3) => `다섯 초안의 신뢰도: ${c}. 줄이지 않으면 ${k1}개를 검증해요. 하한만 설정하면 ${k2}개를 검증해요. 누적곱 문턱값을 더하면 ${k3}개를 검증해요`,
      floorLine: (v) => `하한 ${v}`,
      draft: (j) => `초안 ${j}`, rowConf: '신뢰도', rowCum: '누적곱', rowFloor: '하한만', rowBoth: '+누적곱',
      yes: '검증', stop: '중단', none: '—',
      dLabel: '라운드당 초안 수', sLabel: '수락률', fLabel: '하한', cLabel: '누적곱 문턱값',
      dOut: (v) => `${v}개`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? '끔' : v), cOut: (v) => (v === 0 ? '끔' : v),
      sNone: '줄이지 않음', sFloor: '하한만 설정', sBoth: '누적곱 추가',
      sK: (name) => name,
      sV: (k, w) => `${k}개 검증 · 토큰 ${w}개`,
      sF: (k, w, c) => `<b>윈도 ${k + 1}행</b><br>= 1 + ${c}<br>≈ 라운드당 토큰 ${w}개`,
      sFnone: '<b>윈도 1행</b><br>= 1<br>윈도에 들어간 초안이 없어서, 추측하지 않을 때와 토큰 수가 같아요',
      vNormal: (dr, dw) => `① 누적곱 문턱값은 하한만 둘 때보다 행을 <b>${dr}</b>개 더 자르고, 기댓값은 토큰 <b>${dw}</b>개 줄어요.<br>② 덜 검증한 행들이 비용을 얼마나 아끼는지는 기계마다 달라요. RDNA4에서는 값어치가 있고 CUDA에서는 비슷해서, 누적곱 문턱값의 기본값이 달라요(0.5 또는 0).<br>③ 업스트림은 마지막 token/s만 주고 라운드당 토큰 수는 주지 않아요. 여기 나온 토큰 수는 교육용 추정이에요.`,
      vSame: '① 이번에는 두 문턱값이 같은 수의 초안을 남겨서, 누적곱 문턱값이 하는 일이 따로 없어요.<br>② 누적곱 문턱값을 올리거나 수락률을 내려서, 언제부터 더 자르기 시작하는지 보세요.<br>③ 업스트림은 마지막 token/s만 주고 라운드당 토큰 수는 주지 않아요. 여기 나온 토큰 수는 교육용 추정이에요.',
      vZero: '① 문턱값을 넘는 초안이 하나도 없어요. 엔진은 평소처럼 일반 디코드 한 단계를 돌리고, 다음 라운드에는 초안을 쓰지 않아요(한 라운드를 헛되이 초안 작성하면, 다음 라운드는 쉬어요).<br>② 라운드마다 토큰이 1개만 나와요. 추측하지 않을 때와 같지만, 초안 작성에 든 시간은 이미 썼어요.<br>③ 문턱값이 너무 엄격하면 초안 작성이 헛수고가 돼요.',
      try: [
        '기본값을 그대로 둬요(초안 5개, 수락률 100%, 하한 0.5, 누적곱 0.5). 줄이지 않으면 5개를 검증하고 기댓값은 토큰 2.62개예요. 하한만 설정하면 2개를 검증하고 2.30개예요. 누적곱까지 더하면 1개를 검증하고 1.80개예요. 이것이 페이지의 그림 DS5-2에 나온 숫자예요.',
        '누적곱 문턱값을 <b>0.4</b>로 올려요. 초안 2의 누적곱 0.496이 통과하므로 누적곱 문턱값이 더 자르지 않고, 두 줄의 결과가 같아져요. 다시 0.5로 돌리면 또 아슬아슬하게 막혀요.',
        '수락률을 <b>60%</b>로 낮췄다가 <b>120%</b>로 올려 봐요. 신뢰도가 전체적으로 낮아지거나 높아지고, 세 방법이 검증하는 개수와 기댓값 토큰 수가 함께 바뀌어요. 수락률이 낮으면 두 문턱값이 윈도를 거의 다 잘라 내요.',
      ],
    },
    es: {
      code: 'DRAFT_WINDOW', title: 'Cuántos borradores verificar: cómo recortan la ventana los dos umbrales', tag: 'Estimación didáctica · las confianzas son cifras didácticas, no medidas',
      intro: 'El modelo borrador da en cada ronda 5 borradores y 5 confianzas. El motor cuenta desde el primero: si la confianza de un borrador queda por debajo del <b>límite inferior</b>, o si el <b>producto acumulado</b> de las confianzas anteriores queda por debajo del umbral del producto, se detiene ahí y descarta entera la cola que sigue. Si se conservan k borradores, la ventana tiene k + 1 filas y cada ronda produce en promedio <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b> tokens. Mueve los cuatro controles y mira cuántos verifica cada una de las tres formas de recortar y cuántos tokens produce. Tratar la confianza como tasa de aceptación condicional es una suposición didáctica de esta página; el motor no la ha medido.',
      lgFloor: 'Borradores que se verifican aun con el producto', lgCum: 'Borradores extra con solo el límite inferior', lgNone: 'Borradores que solo se verifican sin recorte',
      chartLabel: (c, k1, k2, k3) => `Confianzas de los cinco borradores: ${c}. Sin recorte se verifican ${k1}; con solo el límite inferior, ${k2}; con el umbral de producto además, ${k3}`,
      floorLine: (v) => `límite ${v}`,
      draft: (j) => `Borr. ${j}`, rowConf: 'Confianza', rowCum: 'Producto', rowFloor: 'Solo límite', rowBoth: '+ producto',
      yes: 'Verif.', stop: 'Alto', none: '—',
      dLabel: 'Borradores por ronda', sLabel: 'Tasa de aceptación', fLabel: 'Límite inferior', cLabel: 'Umbral del producto',
      dOut: (v) => `${v}`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? 'apagado' : v), cOut: (v) => (v === 0 ? 'apagado' : v),
      sNone: 'Sin recorte', sFloor: 'Solo límite inferior', sBoth: '+ producto acumulado',
      sK: (name) => name,
      sV: (k, w) => `verifica ${k} · ${w} tokens`,
      sF: (k, w, c) => `<b>ventana de ${k + 1} filas</b><br>= 1 + ${c}<br>≈ ${w} tokens / ronda`,
      sFnone: '<b>ventana de 1 fila</b><br>= 1<br>ningún borrador entra en la ventana: lo mismo que sin adivinar',
      vNormal: (dr, dw) => `① El umbral del producto recorta <b>${dr}</b> filas más que el límite inferior solo, y se esperan <b>${dw}</b> tokens menos.<br>② Cuánto costo ahorran las filas que ya no se verifican depende de la máquina: en RDNA4 compensa y en CUDA queda en empate, por eso el valor por defecto del umbral del producto es distinto (0.5 o 0).<br>③ Upstream solo da los tokens/s finales, no los tokens por ronda; estos tokens son una estimación didáctica.`,
      vSame: '① Esta vez los dos umbrales dejan el mismo número de borradores, así que el umbral del producto no aporta nada extra.<br>② Prueba a subir el umbral del producto o a bajar la tasa de aceptación y mira cuándo empieza a recortar más.<br>③ Upstream solo da los tokens/s finales, no los tokens por ronda; estos tokens son una estimación didáctica.',
      vZero: '① Ningún borrador pasa los umbrales: el motor da un paso de decodificación normal y hace que la ronda siguiente no genere borrador (un borrador en vano, y la ronda siguiente descansa).<br>② Cada ronda produce solo 1 token, lo mismo que sin adivinar, pero el tiempo de generar el borrador ya se gastó.<br>③ Con umbrales demasiado estrictos, generar el borrador es tiempo perdido.',
      try: [
        'Déjalo por defecto (5 borradores, tasa de aceptación 100%, límite inferior 0.5, producto 0.5): sin recorte se verifican 5 y se esperan 2.62 tokens; con solo el límite inferior se verifican 2 y salen 2.30 tokens; con el producto además se verifica 1 y salen 1.80 tokens. Son las cifras de la Figura DS5-2 de la página.',
        'Baja el umbral del producto a <b>0.4</b>: el producto 0.496 del borrador 2 pasa, el umbral del producto ya no recorta de más y las dos filas dan lo mismo. Súbelo otra vez a 0.5 y vuelve a quedar bloqueado por muy poco.',
        'Lleva la tasa de aceptación a <b>60%</b> y luego a <b>120%</b>: las confianzas en conjunto bajan o suben, y el número de borradores verificados y los tokens esperados cambian a la vez de las tres formas. Con una tasa baja, los dos umbrales casi eliminan la ventana.',
      ],
    },
    ar: {
      code: 'DRAFT_WINDOW', title: 'كم مسودة نتحقق منها: كيف تقصّر العتبتان النافذة', tag: 'تقدير تعليمي · درجات الثقة أرقام تعليمية، وليست قياسًا',
      intro: 'يُخرج نموذج المسودة في كل جولة 5 مسودات و5 درجات ثقة. يعدّ المحرك من المسودة الأولى: إذا كانت درجة ثقة مسودة ما دون <b>الحد الأدنى</b>، أو كان <b>حاصل ضرب</b> درجات ثقة المسودات التي قبلها دون عتبة الضرب التراكمي، توقّف عندها وأسقط كل ما بعدها. فإذا بقيت k مسودة فللنافذة k + 1 صفًا، ويخرج في كل جولة عدد متوقع من الرموز هو <b>E = 1 + c₁ + c₁c₂ + … + c₁…c<sub>k</sub></b>. حرّك المقابض الأربعة وانظر كم تتحقق كل طريقة من الطرق الثلاث من مسودة، وكم رمزًا تُخرج. واعتبار درجة الثقة معدل قبول شرطيًا فرضية تعليمية في هذه الصفحة، ولم يقسها المحرك.',
      lgFloor: 'مسودات ما زال يُتحقَّق منها بعد إضافة الضرب التراكمي', lgCum: 'مسودات يُتحقَّق منها زيادةً إذا وُضع الحد الأدنى وحده', lgNone: 'مسودات لا يُتحقَّق منها إلا بلا تقصير',
      chartLabel: (c, k1, k2, k3) => `درجات ثقة المسودات الخمس: ${c}. بلا تقصير يُتحقَّق من ${k1}؛ بحد أدنى فقط يُتحقَّق من ${k2}؛ ومع عتبة الضرب التراكمي يُتحقَّق من ${k3}`,
      floorLine: (v) => `الحد الأدنى ${v}`,
      draft: (j) => `المسودة ${j}`, rowConf: 'الثقة', rowCum: 'التراكمي', rowFloor: 'الحد فقط', rowBoth: 'الاثنان',
      yes: 'تحقق', stop: 'توقف', none: '—',
      dLabel: 'المسودات في الجولة', sLabel: 'معدل القبول', fLabel: 'الحد الأدنى', cLabel: 'عتبة الضرب التراكمي',
      dOut: (v) => `${v}`, sOut: (v) => `${v}%`, fOut: (v) => (v === 0 ? 'إيقاف' : v), cOut: (v) => (v === 0 ? 'إيقاف' : v),
      sNone: 'بلا تقصير', sFloor: 'حد أدنى فقط', sBoth: 'مع الضرب التراكمي',
      sK: (name) => name,
      sV: (k, w) => `المُتحقَّق منه: ${k} · المتوقع: ${w}`,
      sF: (k, w, c) => `<b>عدد صفوف النافذة: ${k + 1}</b><br><span dir="ltr">= 1 + ${c}</span><br><span dir="ltr">≈ ${w}</span> رمز لكل جولة`,
      sFnone: '<b>صف واحد في النافذة</b><br><span dir="ltr">= 1</span><br>لا مسودة تدخل النافذة، فالناتج كما بلا تخمين',
      vNormal: (dr, dw) => `① عدد الصفوف الزائدة التي يقتطعها الضرب التراكمي عن الحد الأدنى وحده: <b>${dr}</b>؛ والخسارة في المتوقع: <b>${dw}</b> رمز.<br>② ما توفّره الصفوف التي لم نتحقق منها من تكلفة يختلف من جهاز إلى آخر: يستحق في RDNA4، ويتعادل في CUDA، ولذلك تختلف القيمة الافتراضية لعتبة الضرب التراكمي (0.5 أو 0).<br>③ المصدر الأصلي لا يعطي إلا token/s النهائية، ولا عدد الرموز في كل جولة؛ والأرقام هنا تقدير تعليمي.`,
      vSame: '① العتبتان قصّرتا النافذة إلى العدد نفسه من المسودات هذه المرة، فلا أثر إضافيًا لعتبة الضرب التراكمي.<br>② جرّب رفع عتبة الضرب التراكمي أو خفض معدل القبول، وانظر متى تبدأ بالاقتطاع الزائد.<br>③ المصدر الأصلي لا يعطي إلا token/s النهائية، ولا عدد الرموز في كل جولة؛ والأرقام هنا تقدير تعليمي.',
      vZero: '① لا مسودة واحدة تجتاز العتبتين: ينفّذ المحرك خطوة فك ترميز عادية، ويجعل الجولة التالية بلا تخمين (جولة تخمين ضائعة، فتستريح الجولة التالية).<br>② تخرج الجولة رمزًا واحدًا فقط، كما بلا تخمين، لكن زمن التخمين قد صُرف.<br>③ العتبة المتشددة أكثر من اللازم تعني تخمينًا ضائعًا.',
      try: [
        'أبقِ القيم الافتراضية (5 مسودات، ومعدل القبول 100%، والحد الأدنى 0.5، والضرب التراكمي 0.5): بلا تقصير يُتحقَّق من 5 والمتوقع 2.62 رمزًا؛ وبحد أدنى فقط يُتحقَّق من 2 والمتوقع 2.30 رمزًا؛ ومع الضرب التراكمي يُتحقَّق من 1 والمتوقع 1.80 رمزًا. هذه أرقام الشكل DS5-2 في الصفحة.',
        'ارفع عتبة الضرب التراكمي إلى <b>0.4</b>: الضرب التراكمي عند المسودة 2 هو 0.496 فتجتاز، ولا تقتطع العتبة شيئًا زائدًا، فتتطابق النتيجتان. ثم أعدها إلى 0.5 فتُمنع بفارق ضئيل.',
        'اخفض معدل القبول إلى <b>60%</b>، ثم ارفعه إلى <b>120%</b>: ترتفع درجات الثقة كلها أو تنخفض، فيتغير معها عدد المسودات التي تتحقق منها الطرق الثلاث والمتوقع من الرموز. وحين يكون معدل القبول منخفضًا تكاد العتبتان تقتطعان النافذة كلها.',
      ],
    },
  });

  const f2 = (x) => x.toFixed(2);
  const f3 = (x) => x.toFixed(3);
  const NEXT = M.BLOCK;

  Viz.register('ds-draft-window', {
    mount(el, ctx) {
      void ctx;
      const body = Viz.frame(el, { code: T.code, title: T.title, tag: T.tag, intro: T.intro });
      body.insertAdjacentHTML('beforeend', Viz.legend([
        { color: 'var(--accent)', text: T.lgFloor, glow: true },
        { color: 'var(--a2)', text: T.lgCum },
        { color: 'var(--side)', text: T.lgNone },
      ]));
      body.insertAdjacentHTML('beforeend', '<div class="viz-cols"><div class="viz-left"></div><div class="viz-right"></div></div>');
      const left = body.querySelector('.viz-left'), right = body.querySelector('.viz-right');
      const slider = (id, label, min, max, step, val) =>
        `<div class="viz-slider"><label for="dw-${id}">${label}</label><input id="dw-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"><output for="dw-${id}"></output></div>`;

      // Chart: 360 wide so 12px text stays readable on a phone. Bars baseline y = 130, full height 90 (confidence 1).
      const W = 360, X0 = 64, CW = 58, BASE = 130, HMAX = 90;
      const svg = Viz.svg('svg', { viewBox: `0 0 ${W} 262`, class: 'viz-stage', role: 'img' }, left);
      const text = (x, y, anchor, cls, parent) => Viz.svg('text', { x, y, 'font-size': 12, 'text-anchor': anchor, style: `fill:var(--${cls})` }, parent || svg);
      const bars = [], names = [], confT = [], cumT = [], rowF = [], rowB = [];
      for (let j = 0; j < NEXT; j++) {
        const cx = X0 + j * CW + CW / 2;
        bars.push(Viz.svg('rect', { x: cx - 18, width: 36, rx: 2, stroke: 'var(--muted)', 'stroke-width': 1 }, svg));
        names.push(text(cx, BASE + 18, 'middle', 'ink')); names[j].textContent = T.draft(j + 1);
        confT.push(text(cx, BASE + 38, 'middle', 'ink'));
        cumT.push(text(cx, BASE + 58, 'middle', 'ink'));
        rowF.push(text(cx, BASE + 82, 'middle', 'ink'));
        rowB.push(text(cx, BASE + 102, 'middle', 'ink'));
      }
      [[BASE + 38, T.rowConf], [BASE + 58, T.rowCum], [BASE + 82, T.rowFloor], [BASE + 102, T.rowBoth]].forEach(([y, s]) => { text(2, y, 'start', 'muted').textContent = s; });
      const line = Viz.svg('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }, svg);
      const lineLab = text(2, 0, 'start', 'muted');

      left.insertAdjacentHTML('beforeend',
        slider('d', T.dLabel, 1, NEXT, 1, M.DEFAULTS.depth) + slider('s', T.sLabel, 40, 120, 5, M.DEFAULTS.scale * 100) +
        slider('f', T.fLabel, 0, 0.9, 0.05, M.DEFAULTS.floor) + slider('c', T.cLabel, 0, 0.9, 0.05, M.DEFAULTS.cum));
      right.innerHTML = Viz.stat({ id: 'n', k: T.sNone, v: '', f: '' }) + Viz.stat({ id: 'f', k: T.sFloor, v: '', f: '' }) + Viz.stat({ id: 'b', k: T.sBoth, v: '', f: '', hot: true });
      body.insertAdjacentHTML('beforeend', '<div class="viz-verdict"></div>' + Viz.tryList(T.try));
      const $ = (s) => el.querySelector(s);
      const [dR, sR, fR, cR] = left.querySelectorAll('input[type=range]');

      function draw() {
        const depth = +dR.value, scale = +sR.value / 100, floor = +fR.value, cum = +cR.value;
        dR.nextElementSibling.textContent = T.dOut(depth); sR.nextElementSibling.textContent = T.sOut(Math.round(scale * 100));
        fR.nextElementSibling.textContent = floor === 0 ? T.fOut(0) : T.fOut(floor.toFixed(2));
        cR.nextElementSibling.textContent = cum === 0 ? T.cOut(0) : T.cOut(cum.toFixed(2));
        const conf = M.scaleConf(M.PRESET_CONF, scale), run = M.cumulative(conf);
        const r = M.threeCuts(conf, { floor, cum, depth });
        const mark = (k, j) => (j < k ? T.yes : j === k && j < Math.min(depth, NEXT) ? T.stop : T.none);
        for (let j = 0; j < NEXT; j++) {
          const h = conf[j] * HMAX, inBoth = j < r.both.k, inFloor = j < r.floor.k, inNone = j < r.none.k;
          bars[j].setAttribute('y', BASE - h); bars[j].setAttribute('height', h);
          bars[j].style.fill = inBoth ? 'var(--accent)' : inFloor ? 'var(--a2)' : 'var(--side)';
          bars[j].style.opacity = inNone ? '1' : '0.45';
          confT[j].textContent = f2(conf[j]); cumT[j].textContent = f3(run[j]);
          [[rowF[j], r.floor.k], [rowB[j], r.both.k]].forEach(([t, k]) => { const s = mark(k, j); t.textContent = s; t.style.fill = s === T.none ? 'var(--muted)' : 'var(--ink)'; });
        }
        const ly = BASE - floor * HMAX;
        line.setAttribute('d', floor > 0 ? `M${X0 - 6} ${ly} H${X0 + NEXT * CW}` : '');
        lineLab.textContent = floor > 0 ? T.floorLine(f2(floor)) : '';
        lineLab.setAttribute('y', Math.max(12, ly - 4));
        svg.setAttribute('aria-label', T.chartLabel(conf.map(f2).join(['zh', 'ja'].includes(Viz.lang) ? '、' : ', '), r.none.k, r.floor.k, r.both.k));
        [['n', r.none], ['f', r.floor], ['b', r.both]].forEach(([id, c]) => {
          $(`[data-s=${id}-v]`).textContent = T.sV(c.k, f2(c.words));
          $(`[data-s=${id}-f]`).innerHTML = c.k === 0 ? T.sFnone : T.sF(c.k, f2(c.words), run.slice(0, c.k).map(f3).join(' + '));
        });
        const v = $('.viz-verdict');
        if (r.both.k === 0) v.innerHTML = T.vZero;
        else if (r.both.k === r.floor.k) v.innerHTML = T.vSame;
        else v.innerHTML = T.vNormal(r.floor.rows - r.both.rows, f2(r.floor.words - r.both.words));
      }
      [dR, sR, fR, cR].forEach(i => { i.oninput = draw; });
      draw();
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
