# Arabic (ar) fixed terms

Use these terms in every Arabic content file. One concept, one term.

## Conventions

- Modern Standard Arabic, friendly and plain. Address the reader as أنت (masculine singular imperative, the usual UI convention).
- Digits: Western 0-9 only. Lab pages format numbers with locale `ar-u-nu-latn` for this reason.
- Numbers: convert 万/亿 and recompute. 491.52 万 = 4.9152 مليون; 24 亿 = 2.4 مليار; 1208 亿 = 120.8 مليار. Keep `.` as the decimal point and `,` for thousands in digits.
- Units, code identifiers, file names and HTML tags stay in Latin script, unchanged: GB, GiB, ms, tok/s, `KVCache`.
- Direction: the page sets `dir="rtl"`. Do not add direction control characters. A Latin term inside Arabic stays intact; prefer to put it after the Arabic word, in parentheses, on first use: ذاكرة الفيديو (VRAM).
- Avoid the prefixes لـ / بـ / الـ glued to a Latin word when you can rephrase ("للمعالج CPU", not "لـCPU").
- Punctuation: Arabic comma ، semicolon ؛ question mark ؟. Quotation marks « ».
- Arrows: forward is ← and back is → (mirrored for RTL). Process chains read right to left: الحدس ← الاشتقاق ← الشيفرة.
- Counts: Arabic number agreement changes the noun (3-10 plural, 11+ singular). In generated text use "label: n" (الفصول: 28) or a fixed count you can inflect by hand (28 فصلًا).
- Chapter titles: separate title and subtitle with `: ` (ASCII colon + space). The UI cuts the short title at `: `.
- SVG figures: `text-anchor="start"`/`"end"` flip under RTL. Check every translated figure in the browser.

## Fixed template terms (TRANSLATION-GUIDE §6)

| Chinese | English | Arabic |
| --- | --- | --- |
| 代码事实 | Code fact | حقيقة من الشيفرة |
| 上游报告 | Upstream report | تقرير المصدر الأصلي |
| 教学推演 | Teaching estimate | تقدير تعليمي |
| 一句话： | In one line: | في سطر واحد: |
| 学过计算机的同学： | If you studied CS: | إن درستَ علوم الحاسوب: |
| 基础知识（专栏） | CS primer | أساسيات الحاسوب |
| 记住这三点 | Remember these three | تذكّر هذه الثلاث |
| 常见误解 | Common misconception | فهم خاطئ شائع |
| 深入一层 | Go deeper | تعمّق أكثر |
| 动手 | Hands-on | تطبيق عملي |
| 试试看 | Try it | جرّبها |
| 图 N-M | Figure N-M | الشكل N-M |
| 第 N 章 | Chapter N | الفصل N |
| 显存 | VRAM | ذاكرة الفيديو (VRAM)؛ ثم VRAM |
| 内存 | RAM | الذاكرة (RAM)؛ ثم RAM |
| 硬盘 / 固态硬盘 | SSD | قرص SSD |
| 显卡 | GPU | بطاقة الرسوميات (GPU) في أول استخدام؛ ثم GPU |
| 专家 | expert | خبير، ج. خبراء |
| 路由器 | router | الموجِّه (router) |
| 读题 (prefill) | prefill ("reading the prompt") | prefill (مرحلة «قراءة المُطالبة») |
| 写答案 (decode) | decode ("writing the answer") | decode (مرحلة «كتابة الإجابة») |
| 命中 / 未命中 | hit / miss | إصابة / إخفاق |
| 推理引擎 | inference engine | محرك الاستدلال |

## Parts and levels

| Chinese | English | Arabic |
| --- | --- | --- |
| I · 计算基础 | I · Computing foundations | I · أسس الحوسبة |
| II · 模型与状态 | II · Model and state | II · النموذج والحالة |
| III · 异构执行 | III · Heterogeneous execution | III · التنفيذ غير المتجانس |
| IV · 复用与投机 | IV · Reuse and speculation | IV · إعادة الاستخدام والتخمين |
| V · 服务与扩展 | V · Serving and scaling | V · الخدمة والتوسّع |
| VI · 验证与实践 | VI · Verification and practice | VI · التحقق والتطبيق |
| 入门 | Intro | تمهيدي |
| 核心 | Core | أساسي |
| 扩展 | Extension | توسّع |
| 综合 | Capstone | ختامي |

## Core technical terms

"Latin" in the note column means Arabic engineers usually write the English term in Latin script. Then use the Latin term after the first use, with the Arabic gloss in parentheses once.

| English | Arabic | Note |
| --- | --- | --- |
| token | رمز، ج. رموز | Latin "token" is common; colloquial توكن. Units stay `token/s` |
| logits | logits | Latin |
| softmax | softmax | Latin; gloss: الأُسّ المُطبَّع |
| autoregressive | انحداري ذاتي | |
| temperature | درجة الحرارة | |
| greedy (decoding) | جشع (greedy) | |
| sampling | أخذ العينات | |
| seed | البذرة (seed) | |
| tensor | موتّر (tensor) | Latin common |
| stride | الخطوة (stride) | |
| GEMV / GEMM | ضرب مصفوفة في متجه / مصفوفة في مصفوفة | keep GEMV / GEMM in Latin |
| weights | الأوزان | |
| activations | التنشيطات | |
| layer | طبقة | |
| attention head | رأس انتباه | |
| quantization | التكميم | |
| scale (factor) | معامل القياس (scale) | keep `scale` in formulas |
| MSE | متوسط مربع الخطأ (MSE) | |
| Roofline | نموذج Roofline | Latin |
| arithmetic intensity | الشدة الحسابية | |
| Amdahl's law | قانون أمدال | |
| critical path | المسار الحرج | |
| bandwidth | عرض النطاق | |
| latency | زمن الاستجابة | "الكمون" also used |
| throughput | الإنتاجية (throughput) | |
| page fault | خطأ الصفحة (page fault) | |
| page table | جدول الصفحات | |
| mmap | mmap | Latin; gloss: ربط ملف بالذاكرة |
| invariant | اللامتغيّر (invariant) | |
| residual connection | الوصلة المتبقية | |
| attention | الانتباه | |
| GQA | الانتباه بالاستعلامات المجمّعة (GQA) | |
| RoPE | ترميز الموضع الدوراني (RoPE) | |
| KV cache | ذاكرة KV المؤقتة (KV cache) | |
| indexer | المُفهرِس (indexer) | |
| causal mask | القناع السببي | |
| Gated DeltaNet (GDN) | Gated DeltaNet (GDN) | Latin |
| rank-one update | تحديث من الرتبة الأولى | |
| MoE | مزيج الخبراء (MoE) | |
| top-k | اختيار أعلى k (top-k) | |
| shared expert | خبير مشترك | |
| hot experts | الخبراء الساخنون | |
| set associative | ترابط المجموعات | 8-way: بثمانية مسارات |
| LRU / LFU / FIFO | LRU / LFU / FIFO | Latin |
| cache | الذاكرة المؤقتة | "الكاش" common in speech |
| working set | مجموعة العمل | |
| pinned memory | ذاكرة مثبّتة (pinned memory) | |
| DMA | الوصول المباشر إلى الذاكرة (DMA) | |
| PCIe | PCIe | Latin |
| stream | stream | Latin; gloss: طابور عمل الجهاز |
| kernel (GPU) | نواة حسابية (kernel)، ج. نوى | Latin common; the OS kernel is نواة نظام التشغيل |
| kernel fusion | دمج النوى (kernel fusion) | |
| CUDA Graph | CUDA Graph | Latin |
| scratch | مخزن العمل المؤقت (scratch) | Latin `scratch` in labs |
| chunk | دفعة (chunk) | |
| speculative decoding | فك الترميز التخميني | |
| draft | مسودة | |
| verify | التحقق | |
| commit | الإيداع (commit) | the git object stays "commit" |
| conditional acceptance rate | معدل القبول الشرطي | |
| MTP | التنبؤ بعدة رموز (MTP) | |
| checkpoint | نقطة حفظ (checkpoint) | |
| copy-on-write | النسخ عند الكتابة (copy-on-write) | |
| layer split | تقسيم الطبقات | |
| SSE | أحداث مُرسَلة من الخادم (SSE) | |
| continuous batching | التجميع المستمر (continuous batching) | |
| admission control | التحكم في القبول | |
| TTFT | زمن أول رمز (TTFT) | |
| p95 | المئين 95 (p95) | |
| prompt | المُطالبة (prompt) | do not use موجّه: that is the router |
| inference | الاستدلال | |
| upstream | المصدر الأصلي (upstream) | |
| host | المضيف | |
| buffer | مخزن مؤقت (buffer) | |
| code | الشيفرة | "الكود" common in speech |
| lab | المختبر | |
