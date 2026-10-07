# 章节写作规范（2026-10 改版）

本规范约束 `content/chapters/NN.html` 和 `src/viz/NN-*.js` 的改写。**第 10 章是样板**：动手前通读 `content/chapters/10.html`、`src/viz/10-moe.js`、`src/viz/10-moe.math.js`、`tests/viz-10.test.cjs` 和 `src/viz/core.js`。第 1 章是第二个参考（图多、专栏写法）。

## 1. 读者与深浅

| 读者 | 目标 |
| --- | --- |
| 计算机专业本科生 | 正文**轻松看懂**；“学过计算机的同学”提示能把内容接到已学课程上 |
| 非计算机专业本科生、AI 爱好者 | 靠类比、图和「基础知识」专栏**看懂一半**：知道每个机制为什么存在、解决什么问题 |

Strata 是引子，不是全部。一章用到的计算机基础知识（存储层次、浮点数、缓存替换、DMA、调度……）要在本书内讲清楚：在「基础知识」专栏里讲，或者讲个直觉再链接到公开资料。

## 2. 章节结构

按顺序，类名不能改，测试会检查：

1. `<div class="hook">`：开场。以读者见过的现象或 Strata 的一个具体事实开头，抛出本章问题。
2. `<p class="tldr">`：一句话结论。
3. 5–6 个 `<h2 id="sec-N">N.M 标题</h2>` 小节，`sec-1` 起连续编号。标题用读者的问题或结论，不用术语堆砌。
4. 正文中按需插入：
   - `<figure class="fig">`：插图，**全章至少 5 张**（含专栏里的图）。
   - `<aside class="primer" id="cNN-主题">`：基础知识专栏，**至少 1 个**，见第 4 节。
   - `<p class="bridge"><strong>学过计算机的同学：</strong>…</p>`：1–2 处，一两句话对接已学课程。
   - `<dfn>术语</dfn>`：术语第一次出现时加粗并当场用大白话解释。
5. 倒数第二节通常是“动手”：指向本章交互实验（见 `content/labs.json`），说明怎么玩、能看出什么。
6. `<div class="recap"><h3>记住这三点</h3><ol>…</ol></div>`
7. `<div class="myth"><p><strong>常见误解：“……”</strong></p><p>…</p></div>`
8. `<details class="deep"><summary>深入一层：…</summary>…</details>`：保留原版的严谨内容（推导、反例、验收标准、源码契约），用 `<h3>` 分段，改写成通顺的中文，不删事实。

## 3. 插图规范

每讲一个机制，配一张图。图注写**结论**，不只写标题：读者只看图和图注就能抓住要点。

按内容选图型：

| 内容 | 图型 |
| --- | --- |
| 数据怎么流 | 流程图（竖向，方框 + 箭头） |
| 东西放在哪、占多大 | 存储布局图、按比例的条形图 |
| 谁先做、谁在等、哪些能并行 | 时间线（甘特图） |
| 状态怎么一步步变 | 分步状态图（第 1 步 / 第 2 步 / 第 3 步并排或上下排） |
| 两种做法的差异 | 前后对比 / 左右对比 |
| 数字有多大 | 比例条、对数刻度示意 |

SVG 技术约定（测试与打印版依赖这些规则）：

1. `<svg viewBox="0 0 400 H" role="img" aria-label="图 N-M：一句话说明">`。宽度固定 400，高度按内容定。手机上按比例缩小，所以字号**不小于 12**（检查脚本的硬下限是 11），主标签用 13–14。375px 宽的手机上图约 300px 宽，实际字号 ≈ 字号 × 0.75：12 号字显示为 9px，这是可读的底线。primer 里尽量不放图；放的话字号用 13–14。
2. 每个 `rect / text / circle / path` 都必须写 `fill="…"` 属性（线条用 `fill="none"`），作为打印版的颜色；同时写主题类：
   - `f-box`（白底卡片，配 `stroke="#dce3d9"`）、`f-soft`（浅绿底）、`f-accent`（主色块）、`f-side`（浅灰底，配描边）
   - `f-text`（正文色文字）、`f-muted`（次要文字）、`f-on`（主色块上的文字）、`f-warn`（警示色）
   - `f-line`（线条，配 `stroke="#5c6d66"`）
   - 主题类必须写在**元素自己**身上，写在父 `<g>` 上不生效。
3. 对应的打印色：`f-box #ffffff`、`f-soft #e5f1df`、`f-accent #136d5a`、`f-side #f0f3ed`、`f-text #182f2b`、`f-muted #5c6d66`、`f-on #ffffff`、`f-warn #9e5d24`。
4. 图里的 `id`（如 `<pattern id>`）必须以 `cNN-` 开头，避免整本书合并打印时撞名。
5. 文字不能超出所在方框，文字之间不能重叠。估算宽度：中文每字约等于字号，英文和数字约 0.6 倍字号。
6. 不写颜色名表示含义（如“深色的格子”），因为暗色模式下颜色会反转；用“高亮的”“主色的”。
7. 不嵌入外部图片、字体或脚本。

## 4. 「基础知识」专栏

```html
<aside class="primer" id="cNN-topic">
<h3>标题（如：存储层次结构）</h3>
<p>直觉 → 定义 → 一个具体数字或例子 → 和本章 Strata 内容的关系。</p>
<p class="further">延伸阅读：<a href="…" target="_blank" rel="noopener noreferrer">维基百科：…</a> · <a …>…</a></p>
</aside>
```

- 每个概念只在它的**归属章**细讲（见第 5 节）。其他章用一两句话带过，再链接过去：`<a href="#chapter/12/c12-cache-replacement">第 12 章「缓存替换」</a>`。只能链接到**已经存在**的锚点，测试会检查。
- 专栏标题前的“基础知识”标签由样式自动加，不要手写。

## 5. 概念归属表

| 章 | 归属本章的基础知识 |
| --- | --- |
| 01 | 存储层次结构 |
| 02 | 条件概率与链式法则；softmax 与浮点溢出；伪随机数与种子 |
| 03 | 数组的内存布局（行主序、步长）；向量点积与矩阵乘法 |
| 04 | 二进制与浮点数（FP32 / FP16 / BF16）；整数量化与误差 |
| 05 | 带宽与延迟；算力与 roofline；Amdahl 定律与关键路径 |
| 06 | 文件、内存映射（mmap）与页缓存；校验和与哈希 |
| 07 | 神经网络层与激活函数；归一化；残差连接 |
| 08 | 注意力机制（Q/K/V）；计算复杂度 O(n²) |
| 09 | 循环神经网络与状态；外积与秩一更新 |
| 10 | top-k 选择算法 |
| 11 | 哈希表；组相联缓存；n-gram 语言模型 |
| 12 | 缓存替换策略（LRU / LFU）；命中率与工作集 |
| 13 | CPU 与 GPU 的架构差异（SIMD / SIMT）；并行与数据依赖 |
| 14 | 虚拟内存与分页；DMA；同步与异步、双缓冲 |
| 15 | GPU 编程模型（线程、线程块、warp）；kernel 启动开销与算子融合 |
| 16 | 批处理：矩阵-向量与矩阵-矩阵；流水线 |
| 17 | GB 与 GiB；KV 缓存与分页式管理 |
| 18 | 推测执行与分支预测；事务的提交与回滚 |
| 19 | 期望值与几何级数；指数移动平均（EMA） |
| 20 | 快照与写时复制（copy-on-write） |
| 21 | 流水线并行与张量并行；互连带宽（PCIe / NVLink） |
| 22 | 编译器、指令集与条件编译；CUDA 与 HIP |
| 23 | HTTP 与流式传输（SSE）；UTF-8 编码；JSON |
| 24 | 进程与线程的生命周期；取消；认证与 API Key |
| 25 | 调度算法（FIFO / SJF / 轮转）；排队论入门；连续批处理 |
| 26 | 软件测试层次；浮点比较的容差；差分测试 |
| 27 | 均值、分位数与方差；预热与基准测试方法 |
| 28 | 系统设计与工程取舍 |

## 6. 链接政策

1. 只用 https，并带 `target="_blank" rel="noopener noreferrer"`。
2. 域名白名单在 `tests/content.test.cjs` 的 `LINK_HOSTS` 里。新增域名要说明理由。
3. 中文维基用 `https://zh.wikipedia.org/zh-cn/条目名`（简体显示）。条目名必须先用 API 确认存在，不能凭记忆写。
4. 维基百科在中国大陆通常无法直接访问，能找到国内可访问的来源（OI Wiki、MDN 中文、官方文档）时一并给出。
5. 改完运行 `node scripts/check-links.cjs NN`，所有链接必须返回 200。

## 7. 证据与事实核查

1. 证据标签：`<span class="ev ev-code">代码事实</span>`、`<span class="ev ev-report">上游报告</span>`、`<span class="ev ev-est">教学推演</span>`。基础原理不加标签。
2. 所有关于 Strata 的事实，都要对照固定提交 `e8ca9afd03d839d4f8dbbe82dffce7f8a3bafd7a` 的源码或文档核实：
   `https://raw.githubusercontent.com/Niko1221/Strata/e8ca9afd03d839d4f8dbbe82dffce7f8a3bafd7a/<路径>`
3. 引用 `[S01]`–`[S19]`、`[R01]`–`[R06]` 必须存在于 `content/sources.json`，且所引内容落在该来源的行号窗口内。
4. 不确定的说法，宁可删掉，也不要写成事实。推算要标“教学推演”并写出算式。
5. 上游数字要写清条件：硬件、模型版本、上下文长度、引擎版本。

## 8. 中文写作与语气

短句，一句一事，主动语态。同一概念全书只用一个词（例如统一用“显存”，不混用“VRAM 内存”）。少用“不是……而是……”式的防御性否定，先正面讲清楚。

语气像一个懂行的朋友在讲：可以用比喻、可以有一点幽默，但数字和结论一个都不能错。开场用读者见过的现象；每节先给直觉，再给数字，再给 Strata 的代码事实。避免教科书腔（“本节将讨论……”“综上所述……”）。

## 9. 元数据

`content/chapters.json` 中对应章节的 `deck`、`prereq`、`goals`（3 条）、`quiz`（3 题，每题 3 个选项，`correct` 为零基索引）、`problem`、`answer`、`sources` 要与新正文一致。习题用读者语言，解析说清为什么。


## 10. 交互图（src/viz）

每章**至少 1 个**交互图，建议 2 个。交互图要能“教会人”，不只是会动。

### 10.1 放进章节

```html
<div class="viz" data-viz="组件名"><figure class="fig"><svg …>静态兜底图（计入 5 张图）</svg><figcaption>…</figcaption></figure></div>
```

- 结构必须一字不差：`div.viz` 里直接是 `figure.fig`，再里面是 `svg`。打印版和不支持脚本时显示这张静态图。
- 组件名用小写加连字符，带上本章主题，例如 `sampling-temperature`、`kv-budget`。全书唯一。

### 10.2 写组件

- 文件：`src/viz/NN-主题.js`（界面与交互），`src/viz/NN-主题.math.js`（纯计算，可选），`tests/viz-NN.test.cjs`（纯计算的测试，有 `.math.js` 就必须有）。只有本章用到的代码放在本章文件里。
- 用 `Viz.register('组件名', { mount(el, ctx) { … } })` 注册。
- **所有可见文字放进 `const T = Viz.t({ zh: { … } })`**，代码里不出现中文字面量。日后翻译只在表里加 `en`、`ja` 等键。
- 计时一律用 `ctx.sleep / ctx.timeout / ctx.interval / ctx.raf`。翻页时框架会自动停掉它们；`ctx.sleep` 在组件销毁后会抛错，按 `10-moe.js` 的 `guard()` 写法吞掉。
- 颜色只用 CSS 变量或类：`var(--accent)` `var(--a2)` `var(--a3)` `var(--frame)` `var(--muted)` `var(--ink)` `var(--paper)` `var(--side)`，以及 `viz-cell / score / pick`。不写死十六进制颜色，这样暗色和亮色主题都对。
- 手机宽度 375px 下不能横向溢出：网格用 `minmax(0,1fr)`，SVG 用 `viewBox` 等比缩放，表单控件给 `min-width:0`。
- 系统开启“减少动态效果”时（`ctx.reduced`），动画直接跳到终态。

### 10.3 讲解零件（必备）

按 `10-moe.js` 的顺序组合：

1. `Viz.frame`：模块编号（英文大写下划线，如 `ROUTER_SIM`）+ 中文标题 + 证据标签 + 一两句 intro，说清“这是什么、怎么玩”。
2. `Viz.legend`：每种颜色、每种形状代表什么。
3. 过程类组件用 `Viz.pipe` 画流程条，动画走到哪一步，哪一步亮。
4. `Viz.term`：每一步打印一句人话，说明此刻发生了什么、数字从哪来。
5. `Viz.stat`：关键数字，下面一行写**算式**。
6. `Viz.tryList`：3 个具体任务，每个都写明“做完能看出什么”。
7. 结果类组件跑完后显示 `.viz-verdict` 结论。

组件里的数字同样要遵守第 7 节：源自 Strata 的数字必须核实；随机数和教学假设要在标签或 intro 里说明。

## 11. 并行改写的工作约定

1. 只改自己负责的文件：`content/chapters/NN.html`、`src/viz/NN-*.js`、`tests/viz-NN.test.cjs`。不改 `chapters.json`、`app.js`、`machine.css`、`core.js`、测试总表或其他章节。需要框架新能力时，在汇报里提出，不要自己改共享文件。
2. 章节元数据写到 scratchpad 的 `meta/NN.json`：`{ "title"?, "deck", "prereq", "goals":[3], "quiz":[3 × {text, choices:[3], correct, why}], "problem", "answer", "sources":[…] }`，由主任务合并进 `chapters.json`。
3. 事实核查记录写到 scratchpad 的 `factcheck/NN.md`：每条关于 Strata 的事实一行，写明来源文件、行号和原文要点。
4. 自检命令（必须全部通过）：
   - `node scripts/check-chapter.cjs NN <scratchpad>/meta/NN.json`
   - `node --test tests/viz-NN.test.cjs`
   - `node scripts/check-links.cjs NN`
5. 不运行 `git commit`，不启动浏览器。浏览器检查由主任务统一做。
