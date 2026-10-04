# 从 Strata 学推理系统

**一颗 token 的计算机科学之旅 · 独立 Web 教材 1.0.0 · 2026-10-04**

这不是课程目录或网站模板，而是已经写入正文、习题、实验与授课手册的静态教材。以 Niko1221/Strata 为案例，连接线性代数、概率论、计算机组成、操作系统、并行计算、数据库、网络与软件工程。

## 交付内容

| 内容 | 数量 / 说明 |
| --- | --- |
| 章节 | 28 章；每章先修、3 项目标、正文推导、源码线索、反例与活动 |
| 自测 | 84 道选择题，公开答案与解析 |
| 开放题 | 28 道，附参考论证 |
| 交互实验 | 14 个：从采样、量化到 KV、投机提交、SSE 与调度 |
| 学习路线 | 通识 10 章；系统工程 28 章；研究专题 16 章 |
| 术语 | 74 项；链接回相关章节 |
| 来源地图 | 19 个项目文件阅读窗口、6 项原始资料、8 份逻辑导读 |
| 授课材料 | 16 周、64 学时（每学时 45 分钟，即 48 实际小时）、考核和课程项目 |
| CPU 实验 | 标准库 Python 微型随机权重推理链与 10 项测试，不需显卡 |
| 教学记录 | 本机笔记、书签、完成标记、自测状态、实验快照，JSON 导入导出 |

## 立刻打开

仓库不提交构建产物；运行 `npm run build` 后得到 `dist/index.html`，正文、数据、样式和脚本都在一个文件中，不需要 CDN、账号、模型 API 或构建依赖。下载后可以尝试直接用现代桌面浏览器打开。浏览器对 `file://` 本地存储的处理可能不同；正式学习与跨设备访问建议使用 HTTP 方式。

**不启用 JavaScript** 时，打开 `dist/fullbook.html`。它包含全文、答案、教师手册、实验说明、术语和来源，可以用浏览器打印。

## 本地启动（推荐）

要求 Node.js 20 或更高；本次用 Node.js 22 验证。应用无 npm 依赖，以下命令不需要 `npm install`：

```bash
cd strata-textbook
npm run build
npm start
```

浏览器访问 `http://127.0.0.1:3000`。自定义端口：

```bash
npm start -- --port 8080
```

通过可信局域网给 iPad 或其他设备使用（只在受控局域网运行）：

```bash
HOST=0.0.0.0 npm start -- --port 3000
```

在其他设备打开电脑的局域网 IP 与端口。这里提供的是教材页面，不是 Strata 模型服务，不接收学生的推理请求。

也可以完全不安装 Node.js，直接服务随包的成品：

```bash
python3 -m http.server 3000 --directory dist --bind 127.0.0.1
```

## 部署到 Vercel

将本文件所在目录的内容放进你自己的 Git 仓库，在 Vercel 导入。项目包含 `vercel.json`，配置是：

| 设置 | 值 |
| --- | --- |
| Root Directory | 含本 README、package.json 和 vercel.json 的目录 |
| Framework Preset | Other（配置文件中为 null） |
| Build Command | npm run build |
| Output Directory | dist |
| 环境变量 | 不需要 |
| 数据库 / Functions | 不需要 |

如果仓库根目录外又套了一层 `strata-textbook/`，请把 Root Directory 指向该层。使用 hash 路由，不需要为每个章节添加 SPA rewrite。可直接分享例如 `/#chapter/17` 或 `/#lab/spec`。

只上传静态成品时，将 `dist` 的内容作为静态项目根目录，选择 Other、跳过构建；不要误用整个源码目录作为公开静态根目录。

Vercel 原始配置说明：
- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/project-configuration/vercel-json

**本交付没有替你执行线上部署。** Vercel 在这里托管教材与浏览器计算，不运行 C++/CUDA 推理引擎；以后接入真实 GPU 实验应另建有认证、配额、隔离与审计的后端。

## 教材的阅读顺序

非计算机专业先选“通识路线”：用图、手算与浏览器建立直觉，暂时跳过较深源码。系统工程路线按 28 章完整阅读，适合计算机、电子信息等专业。研究专题路线适合已有基础的学生，关注反例、状态契约和真实复现。

每章遵循：**问题 → 基础原理 → 推导 / 例题 → 固定源码 → 易错反例 → 实验 → 自测与开放题**。关联课程不只是标签，也进入正文论证：例如将专家缓存对应组相联缓存，将提交对应事务可见性，将多用户执行对应操作系统调度。

## 修改教材

```text
content/chapters/*.html       28 章正文（编辑源，不是构建产物）
content/chapters.json         标题、课程关联、目标、习题、解析与实验关联
content/labs.json             实验说明、边界、作业
content/sources.json          固定版本源码窗口与原始资料
content/teacher.html          教师手册
content/weeks.json            16 周安排
content/tracks.json           学习路线
content/glossary.json         术语表
content/walkthroughs.json     重点代码逻辑导读
content/provenance.json       版本、证据边界
src/lab-math.js               可单元测试的纯计算模型
src/labs.js                   实验控件与结果视图
src/app.js                    阅读、搜索、记录和导出
src/style.css                 响应式、暗色和打印样式
scripts/build.cjs             零依赖静态构建
scripts/serve.cjs             本地静态服务
labs/                        CPU 实验、测试、真实基准测试模板
```

编辑后执行 `npm run build && npm test`。不要只改 `dist/index.html`，否则下次构建会覆盖。不要把未核验的新模型信息填入原版固定参数；新增版次并更新来源清单。更多规范见 `docs/EDITORIAL.md`。

## 测试

```bash
npm run build
npm test
python3 -m unittest discover -s labs -p 'test_*.py' -v
python3 labs/tiny_inference.py --tokens 4
```

网页的可选 Playwright 检查：

```bash
# 先另行安装 Playwright 与其 Chromium，并启动本地 HTTP 服务
python3 tests/browser_qa.py --url http://127.0.0.1:3000/
# 有自己的 Chromium 可加 --chromium /path/to/chromium
```

本次验证包括 20 组 Node 测试、10 项 Python 测试和 624 条浏览器渲染/交互断言。浏览器检查在限制网络导航的环境中使用 `set_content`，持久化采用明确标记的存储测试替身，不能等同于真实浏览器磁盘存储或 Vercel 端到端验收。完整条件见 `docs/QA.md` 与 `docs/browser-qa.json`。

## 必须保留的边界

源码锚点：`99f3dbd0b21d1401b3769e0c0d963913607f380b`，提交时间 2026-10-03T00:21:36Z。来源全部固定到此提交，不追随 main 静默改变。

本教材审阅列出的关键文件窗口与上游文档，**不是全仓库逐行审计**；未编译运行上游 GPU 引擎，也未读取用户自己的多并发 fork。原版单序列行为与多并发设计练习分开讲述。浏览器数字均为教学模型；CPU toy 的测试不能证明 Strata GPU 正确。

学习记录只保存在当前浏览器或本页内存，定期导出 JSON。没有账号、云同步、班级花名册、教师看板或保密考试功能；答案在客户端公开，不应作为受监考系统使用。服务不上传笔记，但共享电脑可能由同一浏览器用户读取本机记录。

这是可使用、可修改的教学初版，尚未经过正式同行外审或真实课堂验证。作为大学正式教材发布之前，应安排系统课程教师审阅数学与先修难度，并为选定硬件补充真实复现实验。

## 来源与许可

独立教材，不是 Strata 官方作品，不代表原作者背书。引用/摘编的源码保留上游 MIT 许可，全文在 `licenses/Strata-MIT.txt`，也嵌入交互版与完整阅读版。本包没有模型权重、第三方字体或上游全仓库。

作者：Jackwwg83（AI 辅助编写）。许可分三层：

| 内容 | 许可 |
| --- | --- |
| 正文、习题、解析、教师手册等课程内容 | CC BY-SA 4.0，见 `LICENSE-CONTENT.md` |
| `src/`、`scripts/`、`tests/`、`labs/` 下的教学代码 | MIT，见 `LICENSE` |
| 引用或摘编的 Strata 源码 | 上游 MIT，见 `licenses/Strata-MIT.txt` |

这是初版，未经同行审阅。发现错误请在 GitHub Issues 提交勘误：https://github.com/Jackwwg83/strata-inference-textbook/issues 。详见 `docs/LICENSING.md`。
