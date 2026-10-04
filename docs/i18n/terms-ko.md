# Korean (ko) fixed term table

For content translators of the Strata textbook. The Chinese master decides every fact and number; the English edition is a second reference. Use these terms everywhere: chapters, figures, widgets, glossary, labs. The UI string tables (`ko.ui.cjs`, `ko.labs.cjs`) already use them.

## 0. Style

- Prose: 해요체 (friendly, short sentences). Labels and headings: noun phrases (「실험 시작」, 「해 보세요」).
- Write in Hangul only. Never use hanja or Chinese characters.
- Standard Korean spacing. Numbers and counters attach: `3장`, `48개 층`, `8웨이`. Units keep a space: `768 MiB`, `20 ms`.
- Keep code, identifiers, units and source ids (`[S04]`) exactly. Use ASCII punctuation: `: , . ( )`.
- Chapter titles: split title and subtitle with `: ` (the UI `shortTitle` splits on `：` or `: `).
- Explain every term on first use: Hangul term first, then the English in parentheses, e.g. `프리필(prefill, 프롬프트를 읽는 단계)`.
- Avoid particle forms that depend on a variable (은/는, 이/가). Rephrase, e.g. `${n} 값은 …`.

## 1. Numbers (TRANSLATION-GUIDE §3)

Korean counts in 만 (10⁴) and 억 (10⁸) like Chinese, so these units may stay as Hangul. Recompute every number you keep or convert.

| Chinese | Korean | Note |
| --- | --- | --- |
| 491 万 / 491.52 万 | 491만 / 491.52만 | or 약 490만 |
| 24 亿 | 24억 | |
| 42 亿 | 42억 | |
| 66 亿 | 66억 | |
| 1208 亿 | 1208억 | |
| 1250 亿 | 1250억 | |
| = 480 × 491.52 万 + 约 42 亿 | = 480 × 491.52만 + 약 42억 | |

Keep MB vs MiB and GB vs GiB exactly as in the source. Decimal point `.`, thousands separator `,`.

## 2. Fixed template terms (TRANSLATION-GUIDE §6)

| Chinese | English | Korean |
| --- | --- | --- |
| 代码事实 | Code fact | 코드 사실 |
| 上游报告 | Upstream report | 업스트림 보고 |
| 教学推演 | Teaching estimate | 교육용 추정 |
| 一句话： | In one line: | 한마디로: |
| 学过计算机的同学： | If you studied CS: | CS를 배운 분께: |
| 基础知识（专栏） | CS primer | 기초 지식(칼럼) |
| 记住这三点 | Remember these three | 이 세 가지를 기억하기 |
| 常见误解 | Common misconception | 흔한 오해 |
| 深入一层 | Go deeper | 한 걸음 더 |
| 动手 | Hands-on | 직접 해 보기 |
| 试试看 | Try it | 해 보세요 |
| 图 N-M | Figure N-M | 그림 N-M |
| 第 N 章 | Chapter N | N장 |
| 显存 | VRAM | VRAM |
| 内存 | RAM | RAM(메인 메모리) |
| 硬盘 / 固态硬盘 | SSD | SSD |
| 显卡 | GPU (graphics card on first use) | GPU(처음 나올 때 「GPU(그래픽 카드)」) |
| 专家 | expert | 전문가 |
| 路由器 | router | 라우터 |
| 读题 (prefill) | prefill (“reading the prompt”) | 프리필(prefill, 「문제 읽기」 단계) |
| 写答案 (decode) | decode (“writing the answer”) | 디코드(decode, 「답 쓰기」 단계) |
| 命中 / 未命中 | hit / miss | 히트 / 미스 |
| 推理引擎 | inference engine | 추론 엔진 |

## 3. Parts and levels

| Chinese | English | Korean |
| --- | --- | --- |
| I · 计算基础 | I · Computing foundations | I · 컴퓨팅 기초 |
| II · 模型与状态 | II · Model and state | II · 모델과 상태 |
| III · 异构执行 | III · Heterogeneous execution | III · 이기종 실행 |
| IV · 复用与投机 | IV · Reuse and speculation | IV · 재사용과 추측 실행 |
| V · 服务与扩展 | V · Serving and scaling | V · 서빙과 확장 |
| VI · 验证与实践 | VI · Verification and practice | VI · 검증과 실습 |
| 入门 | Intro | 입문 |
| 核心 | Core | 핵심 |
| 扩展 | Extension | 심화 |
| 综合 | Capstone | 종합 |

## 4. Core technical terms

| Chinese | English | Korean | Note |
| --- | --- | --- | --- |
| 词元 | token | 토큰 | |
| 未归一化分数 | logits | 로짓(logits) | |
| 指数归一化 | softmax | 소프트맥스 | |
| 自回归 | autoregressive | 자기회귀 | |
| 采样 | sampling | 샘플링 | |
| 贪心解码 | greedy decoding | 그리디 디코딩 | |
| 温度 | temperature | 온도(temperature) | |
| 随机种子 | seed | 랜덤 시드 | |
| 权重 | weights | 가중치 | |
| 激活 | activations | 활성값(activation) | |
| 张量 | tensor | 텐서 | |
| 步长 | stride | 스트라이드 | |
| 矩阵向量乘法 | GEMV | 행렬-벡터 곱(GEMV) | |
| 矩阵矩阵乘法 | GEMM | 행렬 곱(GEMM) | |
| 量化 | quantization | 양자화 | |
| 缩放因子 | scale | 스케일(scale) | |
| 带宽 | bandwidth | 대역폭(메모리 대역폭) | |
| 延迟 | latency | 지연 시간(레이턴시) | |
| 吞吐量 | throughput | 처리량 | |
| 性能上界模型 | Roofline | 루프라인 모델 | |
| 算术强度 | arithmetic intensity | 산술 강도 | |
| 阿姆达尔定律 | Amdahl's law | 암달의 법칙 | |
| 关键路径 | critical path | 임계 경로 | |
| 文件映射 | mmap | mmap(메모리 맵 파일) | |
| 缺页 | page fault | 페이지 폴트 | |
| 页表 | page table | 페이지 테이블 | |
| 不变量 | invariant | 불변 조건 | |
| 残差 | residual connection | 잔차 연결 | 「잔차」 단독도 가능 |
| 注意力 | attention | 어텐션 | |
| 分组查询注意力 | GQA | 그룹 쿼리 어텐션(GQA) | |
| 旋转位置编码 | RoPE | 회전 위치 임베딩(RoPE) | |
| 键值缓存 | KV cache | KV 캐시 | |
| 注意力索引器 | indexer | indexer(어텐션 인덱서) | Strata 고유 이름은 영문 유지 |
| 因果掩码 | causal mask | 인과 마스크 | |
| 混合专家 | MoE | 전문가 혼합(MoE) | |
| 共享专家 | shared expert | 공유 전문가 | |
| 前 k 项选择 | top-k | top-k 선택 | |
| 组相联 | set associative | 집합 연관 | |
| 最近最少使用淘汰 | LRU | LRU | |
| 缓存命中 / 未命中 | cache hit / miss | 캐시 히트 / 캐시 미스 | hit rate = 히트율 |
| 工作集 | working set | 워킹 세트 | |
| 锁页内存 | pinned memory | 고정(pinned) 메모리 | |
| 直接内存访问 | DMA | DMA | |
| 设备互连 | PCIe | PCIe | |
| 内核（GPU） | kernel | 커널(GPU 커널) | OS 커널과 구분 |
| 内核融合 | kernel fusion | 커널 퓨전 | |
| 设备工作序列 | stream | 스트림(CUDA stream) | |
| 执行图重放 | CUDA Graph | CUDA Graph | |
| 临时工作缓冲 | scratch | scratch(임시 작업 버퍼) | |
| 预填充 | prefill | 프리필 | |
| 逐步生成 | decode | 디코드 | |
| 处理块 | chunk | 청크 | |
| 草稿 | draft | 드래프트 | |
| 多 token 预测草稿 | MTP | MTP(다중 토큰 예측) | |
| 投机解码 | speculative decoding | 추측 디코딩 | |
| 投机执行 | speculation | 추측 실행 | CPU 문맥의 「투기적 실행」과 같은 개념 |
| 验证 | verify | 검증 | |
| 提交 | commit | 커밋 | |
| 回退 | rollback | 롤백 | |
| 条件接受率 | conditional acceptance rate | 조건부 수락률 | |
| 检查点 | checkpoint | 체크포인트 | |
| 写时复制 | copy-on-write | 쓰기 시 복사(copy-on-write) | |
| 层切分 | layer split | 레이어 분할 | |
| 异构 | heterogeneous | 이기종 | |
| 服务端事件流 | SSE | SSE(Server-Sent Events) | |
| 连续批处理 | continuous batching | 연속 배칭(continuous batching) | |
| 准入控制 | admission control | 승인 제어(admission control) | |
| 首 token 延迟 | TTFT | TTFT(첫 토큰까지 걸리는 시간) | |
| 第 95 百分位 | p95 | p95(95번째 백분위수) | |
| 推理引擎 | inference engine | 추론 엔진 | |
