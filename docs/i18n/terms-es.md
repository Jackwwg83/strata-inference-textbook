# Spanish (es) fixed terms

Use these terms in every Spanish content file. One concept, one term.

## Conventions

- Variety: neutral Latin American Spanish. Use `tú`, `costo`, `video`, `computadora`, `archivo`.
- Tone: friendly and plain. Short sentences. Active voice.
- Numbers: convert 万/亿 and recompute. 491.52 万 = 4,9152 millones; 24 亿 = 2.400 millones; 42 亿 = 4.200 millones; 1208 亿 = 120.800 millones. Never write "billón" for 10⁹: in Spanish "billón" is 10¹². "Mil millones" is correct but use the "N.NNN millones" form for one style.
- Separators: prose uses the decimal comma and the thousands point (`1.234.567,89`), the same as the lab pages (`toLocaleString('es')`). Formulas, code and values copied from code keep their original form (`0.5C`, `ceil(N/C)×0.005`).
- Keep MB vs MiB and GB vs GiB exactly as the source. Units, identifiers and HTML tags stay in Latin script, unchanged.
- Chapter titles: separate title and subtitle with `: ` (ASCII colon + space). The UI cuts the short title at `: `.
- Grammatical gender: la GPU, la CPU, la RAM, el SSD, la caché KV, el token, el kernel, el prompt, el chunk.

## Fixed template terms (TRANSLATION-GUIDE §6)

| Chinese | English | Spanish |
| --- | --- | --- |
| 代码事实 | Code fact | Hecho de código |
| 上游报告 | Upstream report | Informe upstream |
| 教学推演 | Teaching estimate | Estimación didáctica |
| 一句话： | In one line: | En una línea: |
| 学过计算机的同学： | If you studied CS: | Si estudiaste informática: |
| 基础知识（专栏） | CS primer | Bases de informática |
| 记住这三点 | Remember these three | Recuerda estas tres ideas |
| 常见误解 | Common misconception | Error común |
| 深入一层 | Go deeper | Más a fondo |
| 动手 | Hands-on | Manos a la obra |
| 试试看 | Try it | Pruébalo |
| 图 N-M | Figure N-M | Figura N-M |
| 第 N 章 | Chapter N | Capítulo N |
| 显存 | VRAM | VRAM (memoria de video en el primer uso) |
| 内存 | RAM | RAM |
| 硬盘 / 固态硬盘 | SSD | SSD |
| 显卡 | GPU | GPU (tarjeta gráfica en el primer uso) |
| 专家 | expert | experto |
| 路由器 | router | router (enrutador en el primer uso) |
| 读题 (prefill) | prefill ("reading the prompt") | prefill («leer el prompt») |
| 写答案 (decode) | decode ("writing the answer") | decode («escribir la respuesta») |
| 命中 / 未命中 | hit / miss | acierto / fallo |
| 推理引擎 | inference engine | motor de inferencia |

## Parts and levels

| Chinese | English | Spanish |
| --- | --- | --- |
| I · 计算基础 | I · Computing foundations | I · Fundamentos de computación |
| II · 模型与状态 | II · Model and state | II · Modelo y estado |
| III · 异构执行 | III · Heterogeneous execution | III · Ejecución heterogénea |
| IV · 复用与投机 | IV · Reuse and speculation | IV · Reutilización y especulación |
| V · 服务与扩展 | V · Serving and scaling | V · Servicio y escalado |
| VI · 验证与实践 | VI · Verification and practice | VI · Verificación y práctica |
| 入门 | Intro | Inicial |
| 核心 | Core | Esencial |
| 扩展 | Extension | Ampliación |
| 综合 | Capstone | Integrador |

## Core technical terms

Spanish engineers keep many English terms. The table gives the term to use; a gloss in parentheses goes on first use only.

| English | Spanish | Note |
| --- | --- | --- |
| token | token (pl. tokens) | not "ficha" |
| logits | logits | |
| softmax | softmax | |
| autoregressive | autorregresivo | |
| temperature | temperatura | |
| greedy (decoding) | voraz (greedy) | |
| sampling | muestreo | |
| seed | semilla | |
| tensor | tensor | |
| stride | stride (paso) | |
| GEMV / GEMM | GEMV / GEMM | producto matriz-vector / matriz-matriz |
| weights | pesos | |
| activations | activaciones | |
| layer | capa | |
| attention head | cabeza de atención | |
| quantization | cuantización | |
| scale (factor) | factor de escala | keep `scale` in formulas |
| MSE | error cuadrático medio (MSE) | |
| Roofline | modelo Roofline | |
| arithmetic intensity | intensidad aritmética | |
| Amdahl's law | ley de Amdahl | |
| critical path | ruta crítica | |
| bandwidth | ancho de banda | |
| latency | latencia | |
| throughput | throughput | gloss: rendimiento por unidad de tiempo |
| page fault | fallo de página | |
| page table | tabla de páginas | |
| mmap | mmap | gloss: archivo mapeado en memoria |
| invariant | invariante | |
| residual connection | conexión residual | |
| attention | atención | |
| GQA | atención de consultas agrupadas (GQA) | |
| RoPE | RoPE | gloss: codificación posicional rotatoria |
| KV cache | caché KV (la) | |
| indexer | indexer | gloss: indexador |
| causal mask | máscara causal | |
| Gated DeltaNet (GDN) | Gated DeltaNet (GDN) | |
| rank-one update | actualización de rango uno | |
| MoE | mezcla de expertos (MoE) | |
| top-k | top-k | |
| shared expert | experto compartido | |
| hot experts | expertos calientes | |
| set associative | asociativa por conjuntos | "de 8 vías" for 8-way |
| LRU / LFU / FIFO | LRU / LFU / FIFO | |
| working set | conjunto de trabajo | |
| pinned memory | memoria fijada (pinned) | |
| DMA | acceso directo a memoria (DMA) | |
| PCIe | PCIe | |
| stream | stream | gloss: cola de trabajo del dispositivo |
| kernel (GPU) | kernel | not "núcleo" (that is the OS kernel) |
| kernel fusion | fusión de kernels | |
| CUDA Graph | CUDA Graph | |
| scratch | búfer scratch | |
| chunk | chunk | gloss: bloque de procesamiento |
| speculative decoding | decodificación especulativa | |
| draft | borrador | |
| verify | verificar / verificación | |
| commit | confirmar (commit) | the git object stays "commit" |
| conditional acceptance rate | tasa de aceptación condicional | |
| MTP | MTP | gloss: predicción de varios tokens |
| checkpoint | checkpoint | gloss: punto de control |
| copy-on-write | copia en escritura (copy-on-write) | |
| layer split | división por capas | |
| SSE | SSE (server-sent events) | |
| continuous batching | batching continuo | |
| admission control | control de admisión | |
| TTFT | tiempo hasta el primer token (TTFT) | |
| p95 | percentil 95 (p95) | |
| prompt | prompt | |
| inference | inferencia | |
| upstream | upstream | for the original Strata project |
| host | host | |
| buffer | búfer | |
| lab | laboratorio | nav label: "Lab" |
