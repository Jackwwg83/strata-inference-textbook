# Japanese (ja) fixed term table

For content translators of the Strata textbook. The Chinese master decides every fact and number; the English edition is a second reference. Use these terms everywhere: chapters, figures, widgets, glossary, labs. The UI string tables (`ja.ui.cjs`, `ja.labs.cjs`) already use them.

## 0. Style

- Prose: です・ます調. Friendly, short sentences. Labels and headings: noun phrases or plain form (「試してみよう」).
- Put a half-width space between Japanese text and Latin words or numbers: `GPU で`, `第 3 章`, `48 層`. Units keep their space: `768 MiB`, `20 ms`.
- Japanese punctuation: 、。「」（）：. Keep code, identifiers, units and source ids (`[S04]`) exactly.
- Chapter titles: split title and subtitle with a full-width colon `：` (the UI `shortTitle` splits on `：` or `: `).
- Explain every term on first use: katakana term first, then the English or the abbreviation in parentheses, e.g. `プリフィル（prefill、プロンプトを読む段階）`.

## 1. Numbers (TRANSLATION-GUIDE §3)

Japanese counts in 万 and 億 like Chinese, so these units may stay. Write the Japanese glyph 億, never the Chinese 亿. Recompute every number you keep or convert.

| Chinese | Japanese | Note |
| --- | --- | --- |
| 491 万 / 491.52 万 | 491 万 / 491.52 万 | or 約 490 万 |
| 24 亿 | 24 億 | |
| 42 亿 | 42 億 | |
| 66 亿 | 66 億 | |
| 1208 亿 | 1208 億 | |
| 1250 亿 | 1250 億 | |
| = 480 × 491.52 万 + 约 42 亿 | = 480 × 491.52 万 + 約 42 億 | |

Keep MB vs MiB and GB vs GiB exactly as in the source. Decimal point `.`, thousands separator `,`.

## 2. Fixed template terms (TRANSLATION-GUIDE §6)

| Chinese | English | Japanese |
| --- | --- | --- |
| 代码事实 | Code fact | コード上の事実 |
| 上游报告 | Upstream report | 上流レポート |
| 教学推演 | Teaching estimate | 教育用の試算 |
| 一句话： | In one line: | ひとことで： |
| 学过计算机的同学： | If you studied CS: | CS を学んだ人へ： |
| 基础知识（专栏） | CS primer | 基礎知識（コラム） |
| 记住这三点 | Remember these three | この 3 点を覚えよう |
| 常见误解 | Common misconception | よくある誤解 |
| 深入一层 | Go deeper | もう一歩深く |
| 动手 | Hands-on | 手を動かす |
| 试试看 | Try it | 試してみよう |
| 图 N-M | Figure N-M | 図 N-M |
| 第 N 章 | Chapter N | 第 N 章 |
| 显存 | VRAM | VRAM |
| 内存 | RAM | RAM（メインメモリ） |
| 硬盘 / 固态硬盘 | SSD | SSD |
| 显卡 | GPU (graphics card on first use) | GPU（初出は「GPU（グラフィックスカード）」） |
| 专家 | expert | エキスパート |
| 路由器 | router | ルーター |
| 读题 (prefill) | prefill (“reading the prompt”) | プリフィル（prefill、「問題を読む」段階） |
| 写答案 (decode) | decode (“writing the answer”) | デコード（decode、「答えを書く」段階） |
| 命中 / 未命中 | hit / miss | ヒット / ミス |
| 推理引擎 | inference engine | 推論エンジン |

## 3. Parts and levels

| Chinese | English | Japanese |
| --- | --- | --- |
| I · 计算基础 | I · Computing foundations | I · 計算の基礎 |
| II · 模型与状态 | II · Model and state | II · モデルと状態 |
| III · 异构执行 | III · Heterogeneous execution | III · ヘテロジニアス実行 |
| IV · 复用与投机 | IV · Reuse and speculation | IV · 再利用と投機実行 |
| V · 服务与扩展 | V · Serving and scaling | V · サービングとスケーリング |
| VI · 验证与实践 | VI · Verification and practice | VI · 検証と実践 |
| 入门 | Intro | 入門 |
| 核心 | Core | コア |
| 扩展 | Extension | 発展 |
| 综合 | Capstone | 総合 |

## 4. Core technical terms

| Chinese | English | Japanese | Note |
| --- | --- | --- | --- |
| 词元 | token | トークン | |
| 未归一化分数 | logits | ロジット（logits） | |
| 指数归一化 | softmax | ソフトマックス | |
| 自回归 | autoregressive | 自己回帰 | |
| 采样 | sampling | サンプリング | |
| 贪心解码 | greedy decoding | 貪欲デコーディング（greedy） | |
| 温度 | temperature | 温度（temperature） | |
| 随机种子 | seed | 乱数シード | |
| 权重 | weights | 重み | |
| 激活 | activations | 活性化（アクティベーション） | |
| 张量 | tensor | テンソル | |
| 步长 | stride | ストライド | |
| 矩阵向量乘法 | GEMV | 行列ベクトル積（GEMV） | |
| 矩阵矩阵乘法 | GEMM | 行列積（GEMM） | |
| 量化 | quantization | 量子化 | |
| 缩放因子 | scale | スケール（scale） | |
| 带宽 | bandwidth | 帯域幅（メモリ帯域） | |
| 延迟 | latency | レイテンシ | |
| 吞吐量 | throughput | スループット | |
| 性能上界模型 | Roofline | ルーフラインモデル | |
| 算术强度 | arithmetic intensity | 演算強度 | |
| 阿姆达尔定律 | Amdahl's law | アムダールの法則 | |
| 关键路径 | critical path | クリティカルパス | |
| 文件映射 | mmap | mmap（メモリマップトファイル） | |
| 缺页 | page fault | ページフォールト | |
| 页表 | page table | ページテーブル | |
| 不变量 | invariant | 不変条件 | |
| 残差 | residual connection | 残差接続 | 「残差」単独でも可 |
| 注意力 | attention | アテンション | |
| 分组查询注意力 | GQA | グループ化クエリアテンション（GQA） | |
| 旋转位置编码 | RoPE | 回転位置埋め込み（RoPE） | |
| 键值缓存 | KV cache | KV キャッシュ | |
| 注意力索引器 | indexer | indexer（アテンションのインデクサ） | Strata 固有名は英字のまま |
| 因果掩码 | causal mask | 因果マスク | |
| 混合专家 | MoE | MoE（Mixture of Experts） | 初出で説明 |
| 共享专家 | shared expert | 共有エキスパート | |
| 前 k 项选择 | top-k | top-k 選択 | |
| 组相联 | set associative | セットアソシアティブ | |
| 最近最少使用淘汰 | LRU | LRU | |
| 缓存命中 / 未命中 | cache hit / miss | キャッシュヒット / キャッシュミス | ヒット率 = hit rate |
| 工作集 | working set | ワーキングセット | |
| 锁页内存 | pinned memory | ピン留めメモリ（ページロックメモリ） | |
| 直接内存访问 | DMA | DMA | |
| 设备互连 | PCIe | PCIe | |
| 内核（GPU） | kernel | カーネル（GPU カーネル） | OS カーネルと区別 |
| 内核融合 | kernel fusion | カーネル融合 | |
| 设备工作序列 | stream | ストリーム（CUDA stream） | |
| 执行图重放 | CUDA Graph | CUDA Graph | |
| 临时工作缓冲 | scratch | scratch（一時作業バッファ） | |
| 预填充 | prefill | プリフィル | |
| 逐步生成 | decode | デコード | |
| 处理块 | chunk | チャンク | |
| 草稿 | draft | ドラフト | |
| 多 token 预测草稿 | MTP | MTP（マルチトークン予測） | |
| 投机解码 | speculative decoding | 投機的デコーディング | |
| 投机执行 | speculation | 投機実行 | |
| 验证 | verify | 検証 | |
| 提交 | commit | コミット | |
| 回退 | rollback | ロールバック | |
| 条件接受率 | conditional acceptance rate | 条件付き受理率 | |
| 检查点 | checkpoint | チェックポイント | |
| 写时复制 | copy-on-write | コピーオンライト | |
| 层切分 | layer split | レイヤー分割 | |
| 异构 | heterogeneous | ヘテロジニアス（異種混合） | |
| 服务端事件流 | SSE | SSE（Server-Sent Events） | |
| 连续批处理 | continuous batching | 連続バッチング（continuous batching） | |
| 准入控制 | admission control | アドミッション制御 | |
| 首 token 延迟 | TTFT | TTFT（最初のトークンまでの時間） | |
| 第 95 百分位 | p95 | p95（95 パーセンタイル） | |
| 推理引擎 | inference engine | 推論エンジン | |
