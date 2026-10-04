# CPU 微型推理实验

Python 3.10+，仅标准库，不下载模型，不需要 GPU。

```bash
python labs/tiny_inference.py --prompt "hello" --tokens 16
python -m unittest discover -s labs -p 'test_*.py' -v
python labs/tiny_inference.py --snapshot toy-state.json
```

本模型权重固定随机，输出没有语言质量；它不是 Strata 的兼容后端，不读取 GGUF，不实现真实 GDN 多头、PLE、QSA 稀疏选择、CUDA 图、MTP 或多 GPU。它使用 4 层（3 递归 + 1 普通因果注意力）、8 维隐藏、每层 4 个专家选 2 个及简单残差；目的是以可手算和可追踪的规模连接完整推理链。

## 五个任务
1. 在 step 中打印每一层 shape，画出只读权重与可变状态。
2. 把 prompt 切成不同块，验证等于逐步从头处理；说明这不是 GEMM prefill。
3. 交换 decay 与 rank-one update 顺序，新增一个会失败的一维 oracle。
4. 模拟 A/B 两条会话交错，故意共享 recurrent 数组，确认隔离测试失败。
5. 修改 draft_demo 的候选，在任意首次拒绝后丢弃后缀，保持与目标 greedy 一致。

`draft_demo` 使用昂贵的目标副本提出草稿，并逐 token 串行验证；它仅证明接受前缀语义，不提供真实投机加速。snapshot 导出是教学 JSON，包含形状与模型身份检查，但不是经过安全审计的生产快照格式，也不承诺崩溃持久性。请勿把不可信的大文件直接输入生产程序。

提交：预测、代码变更、负例、测试结果、数值差异和边界；不得把此脚本耗时当作真实 Strata 性能。
