# 源码研究范围与关键复核

研究日期：2026-10-04。固定 SHA：`99f3dbd0b21d1401b3769e0c0d963913607f380b`。

## 阅读范围

通过 GitHub 连接读取下表文档、接口与实现窗口，并读取仓库树定位模块。没有在本容器取得可构建的完整仓库或权重；未运行 C++/CUDA/HIP 主引擎。没有用测试数量冒称上游覆盖率。

| 来源 | 文件 / 窗口 | 关注点 |
| --- | --- | --- |
| [S01](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/README.md#L1-L240) | `README.md` L1–L240 | 项目宣称的模型、设备与单请求行为；并非独立实测。 |
| [S02](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/docs/HOW_IT_WORKS.md#L1-L84) | `docs/HOW_IT_WORKS.md` L1–L84 | GPU 热专家、CPU 缺失专家、SSD n-gram，及 MTP / prompt lookup。 |
| [S03](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/docs/DETAILS.md#L15-L160) | `docs/DETAILS.md` L15–L160 | 版本混合的性能表、量化 KV、低内存模式与输出确定性；本教材未复测。 |
| [S04](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/core/layout.hpp#L1-L102) | `include/strata/core/layout.hpp` L1–L102 | 48 层、36 GDN / 12 QSA、512 专家与 check_layer / check_all。 |
| [S05](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/core/expert_cache.hpp#L1-L165) | `include/strata/core/expert_cache.hpp` L1–L165 | 槽位、分层准入、异步填充、字节校验；开头含历史阶段注释。 |
| [S06](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/core/expert_source.hpp#L1-L145) | `include/strata/core/expert_source.hpp` L1–L145 | 固定地址不等于固定内容；路由权重仅应用一次；RAM 补集与临时指针。 |
| [S07](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/core/coupled_draft.hpp#L1-L97) | `include/strata/core/coupled_draft.hpp` L1–L97 | 与目标采样结果精确匹配；位置计数器与惩罚历史；耦合开关默认关闭。 |
| [S08](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/core/verify.hpp#L1-L140) | `include/strata/core/verify.hpp` L1–L140 | run / commit / wait_commit；GDN、indexer、PLE 与 KV 的不同提交方式。 |
| [S09](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/src/spec/controller.cpp#L1-L74) | `src/spec/controller.cpp` L1–L74 | 期望产出 / 成本决策、条件接受率与 EMA；未审计所有调用分支。 |
| [S10](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/core/conversation_cache.hpp#L1-L150) | `include/strata/core/conversation_cache.hpp` L1–L150 | token 前缀、图像身份、steering 模式、容量；不是多租户安全契约。 |
| [S11](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/src/ngram/ple_reader.cpp#L1-L125) | `src/ngram/ple_reader.cpp` L1–L125 | 八路组相联、组内轮换替换、页对齐及 I/O 线程。 |
| [S12](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/prefill/prefill.hpp#L1-L145) | `include/strata/prefill/prefill.hpp` L1–L145 | 按专家分组、DMA 环、借用缓存空间、多 GPU chunk 流水。 |
| [S13](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/core/session.hpp#L1-L165) | `include/strata/core/session.hpp` L1–L165 | k=10、各层状态、共享 scratch、分层范围、图捕获与残差依赖。 |
| [S14](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/src/core/layer.cpp#L1-L150) | `src/core/layer.cpp` L1–L150 | 量化代码 / scale / offset 字节核验；权重类型而非名称决定计算分派。 |
| [S15](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/serve/server.py#L1-L130) | `serve/server.py` L1–L130 | FIFO 单序列、Engine.generate、驻留子进程、context 拒绝、MockEngine。 |
| [S16](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/serve/frontend.py#L1-L110) | `serve/frontend.py` L1–L110 | 消息归一化、Jinja 模板、reasoning / content / tool 增量解析。 |
| [S17](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/kernels/gdn.hpp#L1-L113) | `include/strata/kernels/gdn.hpp` L1–L113 | 衰减先于秩一更新；模运算头映射；L2 与 RMS 区别。开头层数注释过时。 |
| [S18](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/include/strata/kernels/qsa.hpp#L1-L145) | `include/strata/kernels/qsa.hpp` L1–L145 | GQA、页表、indexer、2051 宽度上界、动态 step buffer。旧 MiB 注释有单位错误。 |
| [S19](https://github.com/Niko1221/Strata/blob/99f3dbd0b21d1401b3769e0c0d963913607f380b/LICENSE#L1-L21) | `LICENSE` L1–L21 | 仓库代码许可；不能代替模型权重及其他第三方许可。 |

## 关键复核与教学用途

**层数与路由计数。** layout.hpp 给出 48 层、每四层的末层为 QSA，因此是 36 GDN + 12 QSA。gdn.hpp 的旧说明出现“48 GDN”不能覆盖当前几何。每层 512 个路由专家、每 token 每层选择 10 个，整次前向是 480 次路由选择，另有共享专家。用于讲循环层次、几何契约和量纲。

**字节单位。** 12 × 32768 × 2 × 256 × 2 × 2 = 805,306,368 B = 768 MiB，不是 805 MiB。该值仅主 QSA K/V 载荷；108 MiB 是主 GDN 递归矩阵状态，仍不含卷积、PLE、索引、对齐及 scratch。用于讲内存预算与独立复算。

**缓存算法。** ple_reader.cpp 的 RowCache 是八路组相联，每组轮换指针；不可称为 LRU。专家缓存的旧阶段注释不能代替当前调用链。地址、驻留表和拷贝完成是不同条件。用于讲替换、工作集、异步可见性。

**数值契约。** expert_source.hpp 明确固定输入缓冲每层重写，不能按指针缓存量化；CPU 专家不重复乘路由权重。GDN 中先衰减再更新、L2 与 RMS、头映射和输出门都需要分别验证。用于讲接口契约和“有限的错误数值”。

**投机语义。** coupled_draft.hpp 描述目标采样与精确匹配验证，不能直接套经典拒绝采样的 p/q 规则。verify.hpp 区分 run、commit、wait_commit 和各类状态；丢弃后缀不是只回退 token 计数。用于讲条件概率、事务、异步完成与 off-by-one。

**服务层并发。** serve/server.py 所读入口明确 FIFO 下单个驻留序列；HTTP 线程、多 GPU、会话停放与连续批处理是不同能力。第 25 章提供扩展设计课，不声称用户 fork 已通过审计。

## 不做出的推断

不从 README 的性能表推断其他 GPU 速度；不把函数声明当作所有配置实跑；不把纯数学实验当成设备基准；不把 toy 引擎测试当作 Strata 正确性证据；不把“支持一个 API”当作全协议/全安全审查完成。

## 下一次实证工作的入口

按第 26–28 章与 labs/benchmark_protocol.md 进行真实构建、算子差分、前后缀恢复和负载测试。保留本版来源，不让后续 main 的变化反向改写旧版课程结论。
