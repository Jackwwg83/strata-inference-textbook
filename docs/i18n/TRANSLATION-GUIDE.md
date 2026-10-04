# Translation guide

The Chinese edition in `content/` is the master copy. A translation never changes it.
English is translated first; Japanese, Korean, Spanish and Arabic follow from the English work but must be checked against the Chinese master for every number and code fact.

## 1. What to translate, and where it goes

| Source (Chinese) | Translation target |
| --- | --- |
| `content/chapters/NN.html` | `content/i18n/<lang>/chapters/NN.html`: the whole file, including every SVG `<text>` and `aria-label` |
| `content/chapters.json` | `content/i18n/<lang>/chapters.json`: per chapter `id`, `title`, `deck`, `part`, `courses`, `prereq`, `goals`, `quiz`, `problem`, `answer`, `level` |
| `content/glossary.json` | `content/i18n/<lang>/glossary.json`: keep `en` and `chapter`; put the localized term in `zh` (the field name stays) and translate `meaning` |
| `content/labs.json` | `content/i18n/<lang>/labs.json`: `id`, `title`, `category`, `description`, `assumptions`, `task` |
| `content/tracks.json` | `content/i18n/<lang>/tracks.json`: `id`, `name`, `sub`, `desc` |
| `content/sources.json` | `content/i18n/<lang>/sources.json`: `id`, `title`, `note`, `kind` |
| `content/walkthroughs.json` | `content/i18n/<lang>/walkthroughs.json`: `source`, `title`, `steps`, `challenge` (never the `code`) |
| `content/courses.json` | `content/i18n/<lang>/courses.json`: the same shape; course names must match the translated `courses` fields in chapters.json |
| `content/provenance.json` | `content/i18n/<lang>/provenance.json`: `scope`, `measurements`, `status`, `audience` |
| Widget text in `src/viz/NN-*.js` | add a `<lang>: { … }` block next to `zh:` inside each `Viz.t({ … })` table, with the same keys and function arities |
| `content/teacher.html`, `content/weeks.json` | not translated (Chinese only) |

Never translate: code, identifiers, file paths, source ids (`[S04]`), anchor ids (`c10-top-k`), `data-viz` names, URLs except Wikipedia (see §5), CSS classes.

## 2. Tone

Same reader as the Chinese edition: an undergraduate or an AI enthusiast. Friendly, plain, slightly playful, never wrong. Short sentences, active voice. Explain every term on first use. Keep the analogies (kitchen, hospital triage); adapt idioms that do not travel.

## 3. Numbers and units (critical)

Chinese counts in 万 (10⁴) and 亿 (10⁸). English counts in thousands, millions and billions. Convert, never copy:

| Chinese | English |
| --- | --- |
| 491 万 / 491.52 万 | 4.9 million / 4.9152 M |
| 24 亿 | 2.4 billion |
| 42 亿 | 4.2 billion |
| 66 亿 | 6.6 billion |
| 1208 亿 | 120.8 billion |
| 1250 亿 | 125 billion |

Recompute every converted number. In widget tables, formulas like `= 480 × 491.52 万 + 约 42 亿` become `= 480 × 4.9152 M + about 4.2 B`. Keep MB vs MiB and GB vs GiB exactly as the source has them. Keep decimal separators as `.` and thousands separators as `,` in English.

## 4. Figures

English text is often 1.5–2× wider than Chinese. After translating an SVG:
1. Every `<text>` must stay inside its box and inside the viewBox; nothing may overlap. Break long labels into two `<text>` lines or shorten them; widen boxes if there is room.
2. Never go below font-size 11 in static figures.
3. Run the browser figure checker (main task) at 375px and 1440px.

## 5. Links

Swap Chinese Wikipedia links for the English article on the same topic (`https://en.wikipedia.org/wiki/…`), verified to exist. Keep OI Wiki links only if no English equivalent is better; prefer MDN English, official docs or the English Wikipedia. Every link must pass `node scripts/check-links.cjs`.

## 6. Fixed template terms

| Chinese | English |
| --- | --- |
| 代码事实 | Code fact |
| 上游报告 | Upstream report |
| 教学推演 | Teaching estimate |
| 一句话： | In one line: |
| 学过计算机的同学： | If you studied CS: |
| 基础知识（专栏） | CS primer |
| 记住这三点 | Remember these three |
| 常见误解 | Common misconception |
| 深入一层 | Go deeper |
| 动手 | Hands-on |
| 试试看 | Try it |
| 图 N-M | Figure N-M |
| 第 N 章 | Chapter N |
| 显存 | VRAM |
| 内存 | RAM |
| 硬盘 / 固态硬盘 | SSD |
| 显卡 | GPU (graphics card on first use) |
| 专家 | expert |
| 路由器 | router |
| 读题 (prefill) | prefill (“reading the prompt”) |
| 写答案 (decode) | decode (“writing the answer”) |
| 命中 / 未命中 | hit / miss |
| 推理引擎 | inference engine |

## 7. Glossary terms (from content/glossary.json)

| Chinese | English |
| --- | --- |
| 词元 | token |
| 未归一化分数 | logits |
| 指数归一化 | softmax |
| 自回归 | autoregressive |
| 温度 | temperature |
| 随机种子 | seed |
| 张量 | tensor |
| 步长 | stride |
| 矩阵向量乘法 | GEMV |
| 矩阵矩阵乘法 | GEMM |
| 量化 | quantization |
| 缩放因子 | scale |
| 均方误差 | MSE |
| 半精度浮点 | FP16 |
| 脑浮点格式 | BF16 |
| 二进制容量单位 | MiB / GiB |
| 性能上界模型 | Roofline |
| 算术强度 | arithmetic intensity |
| 阿姆达尔定律 | Amdahl |
| 关键路径 | critical path |
| 文件映射 | mmap |
| 缺页 | page fault |
| 资源即初始化 | RAII |
| 不变量 | invariant |
| 均方根归一化 | RMSNorm |
| 残差 | residual |
| 分组查询注意力 | GQA |
| 旋转位置编码 | RoPE |
| 本案例稀疏注意力路径 | QSA |
| 键值缓存 | KV cache |
| 注意力索引器 | indexer |
| 因果掩码 | causal mask |
| 门控 DeltaNet | GDN |
| 秩一更新 | rank-one update |
| 混合专家 | MoE |
| 前 k 项选择 | top-k |
| 共享专家 | shared expert |
| 本案例学习表查询模块 | PLE |
| 组相联 | set associative |
| 最近最少使用淘汰 | LRU |
| 最不经常使用淘汰 | LFU |
| 缓存命中 | cache hit |
| 工作集 | working set |
| 锁页内存 | pinned memory |
| 直接内存访问 | DMA |
| 设备互连 | PCIe |
| 设备工作序列 | stream |
| 执行图重放 | CUDA Graph |
| 内核融合 | kernel fusion |
| 临时工作缓冲 | scratch |
| 预填充 | prefill |
| 逐步生成 | decode |
| 处理块 | chunk |
| 多 token 预测草稿 | MTP |
| 投机执行 | speculation |
| 提交 | commit |
| 条件接受率 | conditional acceptance |
| 指数滑动平均 | EMA |
| 检查点 | checkpoint |
| 写时复制 | copy-on-write |
| 层切分 | layer split |
| 数据并行执行模型 | SIMD / SIMT |
| 服务端事件流 | SSE |
| 字符编码 | UTF-8 |
| 先来先服务 | FIFO / FCFS |
| 连续批处理 | continuous batching |
| 准入控制 | admission control |
| 代次 | generation |
| 固定历史比较 | teacher forcing |
| 参考判定器 | oracle |
| 变形测试 | metamorphic test |
| 首 token 延迟 | TTFT |
| 第 95 百分位 | p95 |
| 吞吐量 | throughput |
