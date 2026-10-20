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
2. Use font-size 12 or more for text in static figures; 11 is the hard floor of the checker. A phone shows a 400-wide figure at about 300px, so 12 renders at 9px, the lowest readable size. If a chapter master uses 11 in a static figure, raise it to 12 in the translation and make the text fit.
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

Chapter metadata uses these fixed values:

| Chinese | English |
| --- | --- |
| I · 计算基础 | I · Computing foundations |
| II · 模型与状态 | II · Model and state |
| III · 异构执行 | III · Heterogeneous execution |
| IV · 复用与投机 | IV · Reuse and speculation |
| V · 服务与扩展 | V · Serving and scaling |
| VI · 验证与实践 | VI · Verification and practice |
| 入门 / 核心 / 扩展 / 综合 (level) | Intro / Core / Extension / Capstone |

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
| 路由尾部跳过 | route tail skip (first use, `<dfn>`) / tail skip |

## 8. Columns (content/columns/)

A column page `content/columns/<column>/<page>.html` is translated to `content/i18n/<lang>/columns/<column>/<page>.html`, and the column and page titles go to `content/i18n/<lang>/columns.json` (`id`, `nav`, `title`, `deck`, `pages: [{id, title, deck}]`). Widget strings in `src/viz/<prefix>-<page>.js` follow §1. Check a page with `node scripts/check-chapter.cjs <column>/<page> --lang <lang>`.

Figure numbers in columns keep their letter: 图 D2-3 → Figure D2-3 / 図 D2-3 / 그림 D2-3 / Figura D2-3 / الشكل D2-3.

Fixed terms of the DeepInfer column:

| 中文 | en | ja | ko | es | ar |
| --- | --- | --- | --- | --- | --- |
| 专栏 | column | コラム | 칼럼 | serie | سلسلة |
| 对照 Strata： | Compared with Strata: | Strata と比べると： | Strata와 비교하면: | Frente a Strata: | مقارنةً بـ Strata: |
| 数据并行（DP） | data parallelism (DP) | データ並列（DP） | 데이터 병렬(DP) | paralelismo de datos (DP) | توازي البيانات (DP) |
| 专家并行（EP） | expert parallelism (EP) | エキスパート並列（EP） | 전문가 병렬(EP) | paralelismo de expertos (EP) | توازي الخبراء (EP) |
| 宽专家并行（Wide-EP） | wide expert parallelism (Wide-EP) | ワイドエキスパート並列（Wide-EP） | 와이드 전문가 병렬(Wide-EP) | paralelismo de expertos amplio (Wide-EP) | توازي الخبراء الواسع (Wide-EP) |
| 上下文并行（CP） | context parallelism (CP) | コンテキスト並列（CP） | 컨텍스트 병렬(CP) | paralelismo de contexto (CP) | توازي السياق (CP) |
| 张量并行（TP） | tensor parallelism (TP) | テンソル並列（TP） | 텐서 병렬(TP) | paralelismo de tensores (TP) | توازي الموترات (TP) |
| 专家负载均衡（EPLB） | expert load balancing (EPLB) | エキスパート負荷分散（EPLB） | 전문가 부하 분산(EPLB) | balanceo de carga de expertos (EPLB) | موازنة حمل الخبراء (EPLB) |
| 冗余专家 | redundant experts | 冗長エキスパート | 중복 전문가 | expertos redundantes | الخبراء المكرَّرون |
| 全对全通信（all-to-all） | all-to-all communication | 全対全通信（all-to-all） | 전체 대 전체 통신(all-to-all) | comunicación todos con todos (all-to-all) | الاتصال الكلّي (all-to-all) |
| 分发 / 合并 | dispatch / combine | ディスパッチ / コンバイン | 디스패치 / 컴바인 | dispatch / combine | التوزيع / التجميع (dispatch / combine) |
| 视觉编码器（VE） | vision encoder (VE) | ビジョンエンコーダー（VE） | 비전 인코더(VE) | codificador visual (VE) | مُرمِّز الرؤية (VE) |
| 三段分离（E/P/D 分离） | E/P/D disaggregation | E/P/D 分離 | E/P/D 분리 | desagregación E/P/D | فصل E/P/D |
| 首 token 延迟（TTFT） | time to first token (TTFT) | 最初のトークンまでの時間（TTFT） | 첫 토큰까지의 시간(TTFT) | tiempo hasta el primer token (TTFT) | زمن الوصول إلى أول رمز (TTFT) |
| 逐 token 间隔（TBT） | time between tokens (TBT) | トークン間隔（TBT） | 토큰 간 간격(TBT) | tiempo entre tokens (TBT) | الزمن بين الرموز (TBT) |
| 滑动窗口注意力（SWA） | sliding-window attention (SWA) | スライディングウィンドウ・アテンション（SWA） | 슬라이딩 윈도 어텐션(SWA) | atención de ventana deslizante (SWA) | انتباه النافذة المنزلقة (SWA) |
| 有界重放 | bounded replay | 有界リプレイ | 유계 재생(bounded replay) | reproducción acotada | إعادة التشغيل المحدودة |
| 异步调度 | asynchronous scheduling | 非同期スケジューリング | 비동기 스케줄링 | planificación asíncrona | الجدولة غير المتزامنة |
| 零开销批调度器 | zero-overhead batch scheduler | ゼロオーバーヘッド・バッチスケジューラー | 제로 오버헤드 배치 스케줄러 | planificador de lotes sin sobrecoste | مُجدوِل الدُّفعات عديم الكلفة |
| 批次不变（batch-invariant） | batch-invariant | バッチ不変（batch-invariant） | 배치 불변(batch-invariant) | invariante al lote (batch-invariant) | الثبات عبر الدُّفعات (batch-invariant) |
| 确定性采样 | deterministic sampling | 決定的サンプリング | 결정적 샘플링 | muestreo determinista | أخذ العينات الحتمي |
| 结构化输出 | structured outputs | 構造化出力 | 구조화 출력 | salidas estructuradas | المخرجات المهيكلة |
| 超节点 | supernode | スーパーノード | 슈퍼노드 | supernodo | العقدة الفائقة (supernode) |
| 显存（HBM） | GPU memory (HBM) | GPU メモリ（HBM） | GPU 메모리(HBM) | memoria de la GPU (HBM) | ذاكرة GPU (HBM) |
| 验证 (of drafts) | verification | 検証 | 검증 | verificación | التحقق |
| 纠删码 | erasure code | 消失訂正符号 | 소거 부호 | código de borrado | ترميز المحو |
