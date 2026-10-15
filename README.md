# 交互式学习库

一个纯前端的交互式学习知识库，涵盖 DevOps、计算机科学、自动化控制与开发工具等主题。采用**单页壳 + 数据驱动**架构：唯一的 `index.html` 导航/容器页按需加载各模块的数据文件，无需后端，直接在浏览器中打开即可学习。

[Live Demo →](https://iroqi.github.io/interactive-learning/)

---

## 项目概览

本项目以 **单页壳（SPA）+ 数据驱动加载** 为核心设计理念：导航页从 `courses.js` 渲染课程卡片，点击卡片后按需加载 `modules/<key>.js` 中的模块内容（HTML/CSS/JS 数据），在同一页面内完成学习，无需新开网页。

| 维度 | 详情 |
|------|------|
| 分类 | DevOps / CS 基础 / 自动化 / 开发工具 |
| 学习专题 | 45 个（持续扩展中） |
| 技术栈 | 纯 HTML + CSS + JavaScript，零依赖 |
| 页面文件 | 仅 1 个 HTML（`index.html`） |
| 进度追踪 | localStorage（`il_progress`），导航页与各模块自动联动；里程碑型看全部解锁，纯测验型看测验得分率 ≥ 75% |
| 学习系统 | 到期复习提醒（间隔重复）、连续学习天数、进度一键导出/导入、学习报告导出、导航排序、分类学习看板、进度重置、今日目标、星标收藏置顶、成就徽章、暗/亮主题、学习热力图、测验成绩趋势、错题本（测验错题聚合 + 一键重学 + 模块内错题优先重做）、统一课程皮肤（Geek 终端风：纯黑底 + 霓虹绿 + 等宽字体） |
| 部署 | GitHub Pages + Cloudflare Pages（CI/CD 自动双部署） |

---

## 目录结构

```
.
├── index.html                         # 唯一页面：导航 + 模块容器 + hash 路由
├── courses.js                         # 课程数据源（卡片/计数/页脚的唯一来源）
├── ilquiz.js                          # 共享运行时：IL.touch / IL.mount / IL.quiz / IL.order / IL.record
├── ilquizzes.js                       # 壳层挂载测验的题库（无自测题的早期模块）
├── src/                               # 模块**源码**（自包含 HTML，作者直接编辑这里）
│   ├── git-interactive.html
│   └── ...                            # 共 45 个源码页，可单独用浏览器打开
├── modules/                           # 构建产物：数据文件（按需加载）
│   ├── git.js                         # 每条 = { title, css, html, js, links, needsReady }
│   └── ...                            # 共 45 个模块，由 src/ 打包生成
├── tools/
│   ├── pack-modules.py                # 构建：src/<key>-interactive.html → modules/<key>.js
│   ├── unpack-modules.js              # 反向：modules/<key>.js → src/（恢复丢失的源码层）
│   └── verify-pack.js                 # 校验：src/ 重新打包后与 modules/ 内容一致
│
├── .github/workflows/deploy.yml       # CI/CD 双部署流水线
├── .gitignore
└── README.md                          # 本文件
```

---

## 学习专题

> 所有模块入口统一在导航页 `index.html`（点卡片即进入对应模块，`#/m/<key>` 路由）。

### DevOps（13 个）

| 模块 | 描述 |
|------|------|
| cf-workers | Cloudflare Workers — Serverless Workers 部署，掌握边缘计算与现代化部署流程 |
| docker | Docker 入门：从镜像到容器 — 理解容器化核心概念，掌握 Dockerfile 编写、镜像构建与容器编排 |
| k8s | Kubernetes 交互式学习 — 迷你 kubectl 模拟器：集群架构、Pod 与标签、Deployment 滚动更新、Service、探针与存储（9 个里程碑，进度自动保存） |
| gh-actions | GitHub Actions Workflow 互动学习 — CI/CD 流水线、工作流模拟器、矩阵构建与密钥管理的完整实践（含 4 级渐进关卡） |
| makefile | Makefile 从零到实战 — 构建自动化利器，从规则语法到复杂项目构建的完整学习路径 |
| terraform | Terraform 基础设施即代码 — 迷你 plan/apply/destroy 引擎：HCL 语法、变量、状态、模块化、隐式依赖与生命周期（9 个里程碑，进度自动保存） |
| nginx | Nginx 配置与运维 — 迷你 nginx -t 校验器：架构、配置层级、静态文件、虚拟主机、反向代理、重定向与 HTTPS（9 个里程碑，进度自动保存） |
| compose | Docker Compose — 迷你配置校验器：services、端口映射、命名卷、依赖与健康检查解析校验（9 个里程碑，进度自动保存） |
| systemd | Systemd 服务管理 — 迷你 systemctl 命令台：启停、自启、unit 文件、日志与故障排查（9 个里程碑，进度自动保存） |
| helm | Helm chart 模板 — 迷你渲染器：模板表达式、模板函数、values 覆盖、release 生命周期与 hooks（9 个里程碑，进度自动保存） |
| prometheus | Prometheus 监控 — 迷你 PromQL 查询台：指标类型、rate/increase、sum by、告警规则与可用性（9 个里程碑，进度自动保存） |
| dockerfile | Dockerfile 构建 — 迷你判读器：指令语义、多阶段构建、层缓存、HEALTHCHECK 与构建步骤预测（9 个里程碑，进度自动保存） |
| cdn | CDN 与边缘缓存 — 迷你缓存判读器：命中/回源、Cache-Control、缓存键与 Vary、ETag 协商、purge 与击穿防护（9 个里程碑，进度自动保存） |

### CS 基础（18 个）

| 模块 | 描述 |
|------|------|
| cs | CS 基础工具互动学习 — 命令行、文件系统与常用开发工具的基础操作与概念认知 |
| net | 网络基础与协议 — TCP/IP、HTTP、DNS 等核心协议的运作原理与网络分层模型 |
| http | HTTP 与 API 设计 — 迷你请求引擎：报文结构、方法语义、状态码、无状态与会话、REST 设计与缓存安全（9 个里程碑，进度自动保存） |
| sql | SQL 查询 — 迷你查询引擎：SELECT、过滤、排序、聚合分组、JOIN 联表与实战提取（9 个里程碑，进度自动保存） |
| redis | Redis 数据结构 — 迷你 redis-cli 命令台：String、Hash、List、Set、ZSet、过期与持久化（9 个里程碑，进度自动保存） |
| netsec | 网络安全基础 — 迷你漏洞雷达：识别 XSS、SQL 注入、CSRF、SSRF 等漏洞类型并选择正确修复（9 个里程碑，进度自动保存） |
| async | JavaScript 异步与事件循环 — 输出预测器：同步、微任务、宏任务、async/await 的执行顺序预测与即时核对（9 个里程碑，进度自动保存） |
| permissions | Linux 文件权限 — 迷你 chmod 计算器：rwx 符号与数字换算、umask、目录权限、特殊位（9 个里程碑，进度自动保存） |
| algo | 算法与数据结构基础 — 迷你复杂度评估器：估 O()、辨结构（栈/队列/哈希/链表/树/图）（9 个里程碑，进度自动保存） |
| transactions | 数据库事务与隔离级别 — 迷你判读器：脏读、不可重复读、幻读场景 → 隔离级别，MVCC 与锁（9 个里程碑，进度自动保存） |
| sqlidx | SQL 索引与 EXPLAIN — 迷你判读器：全表扫描、B+ 树、最左前缀、覆盖索引与失效场景（9 个里程碑，进度自动保存） |
| rust | Rust 所有权 — 迷你 borrow-checker：move/Copy、借用冲突、生命周期与 Option/Result（9 个里程碑，进度自动保存） |
| jwt | JWT 认证令牌 — 迷你解码器：三段式、Base64Url、验签、过期判断与常见漏洞防护（9 个里程碑，进度自动保存） |
| go | Go 并发 — 迷你输出预测器：goroutine、channel、select、WaitGroup、Mutex 与死锁判断（9 个里程碑，进度自动保存） |
| oauth2 | OAuth2 与 OIDC — 迷你流程预测器：授权码、PKCE、scope、token 刷新、state 防 CSRF 与 OIDC 验签（9 个里程碑，进度自动保存） |
| tls | TLS 与 HTTPS — 迷你握手预测器：证书链、TLS 1.2/1.3 握手、混合加密、HSTS 与攻击防护（9 个里程碑，进度自动保存） |
| grpc | gRPC 与 Protobuf — 迷你调用链预测器：HTTP/2、protobuf、四种方法类型、拦截器、错误码与重试（9 个里程碑，进度自动保存） |
| graphql | GraphQL API — 迷你 resolver 预测器：schema、类型系统、查询语法、N+1 与 DataLoader（9 个里程碑，进度自动保存） |

### 自动化（4 个）

| 模块 | 描述 |
|------|------|
| n8n | n8n 工作流自动化 — 从零理解工作流自动化，掌握节点编排、数据流转与条件逻辑 |
| pid | PID 控制系统互动学习 — 比例-积分-微分控制器原理与实时仿真，专题入口另含三讲视频课件 |
| vfd | 变频器交互式学习 — 变频驱动器工作原理、参数配置与电机控制实践 |
| plc | PLC 交互式学习 — 可编程逻辑控制器原理、梯形图编程与工业自动化仿真模拟 |

### 开发工具（10 个）

| 模块 | 描述 |
|------|------|
| vscode | VSCode 配置文件学习 — settings.json、快捷键、扩展管理与工作区配置的系统化学习 |
| yaml | YAML 标记语言 — 缩进即结构——掌握容器编排、CI/CD 与云原生配置的核心标记语言 |
| web | 建站全流程仿真学习 — 从域名注册、DNS 解析、部署到 SSL 配置的完整建站模拟 |
| git | Git 版本控制 — 对象模型、三区流动、提交图模拟、分支合并与团队协作的完整交互式学习（9 个里程碑，进度自动保存） |
| bash | Shell 脚本 — 内置迷你终端：变量、引号、管道、重定向、条件、循环与函数，动手学 Bash（9 个里程碑，进度自动保存） |
| regex | 正则表达式 — 实时匹配引擎：字符类、量词、分组捕获、锚点边界与实战提取（9 个里程碑，进度自动保存） |
| prompt | AI 提示词工程 — 提示词评分引擎：四要素、few-shot、思维链、角色约束与反模式识别（9 个里程碑，进度自动保存） |
| ts | TypeScript 类型系统 — 迷你判读器：类型标注、推断、interface、联合类型、函数类型、泛型与实用类型（9 个里程碑，进度自动保存） |
| css | CSS 布局与盒模型 — 迷你布局预测器：盒模型、选择器优先级、Flexbox/Grid、居中、断点与层叠（9 个里程碑，进度自动保存） |
| css-layout | CSS 布局系统实战 — 迷你布局计算引擎：盒模型尺寸、flex 伸缩分配、grid 轨道与区域、居中与层叠上下文（9 个里程碑，进度自动保存） |

> PID 专题下的 `pid-courseware/` 三讲视频课件从 PID 模块页内进入，不单独占卡片入口。

---

## 本地使用

无需任何构建工具或依赖，直接用浏览器打开 `index.html` 即可（或使用任意 HTTP 服务器，如 VS Code Live Server）。模块数据通过按需加载自动取用，支持 `file://` 直接打开。

### 搜索与筛选

- **搜索**：在导航页顶部的搜索框输入关键词，实时过滤课程；支持空格分隔的**多关键词 AND 匹配**（如 `redis 命令` 需同时命中标题或描述）
- **筛选**：点击分类 Pill（DevOps / CS 基础 / 自动化 / 开发工具）按主题筛选
- **排序**：导航页右侧排序下拉可选「最近学习 / 学习进度」，基于 `il_progress` 即时重排
- **快捷键**：按 `/` 聚焦搜索框，按 `Esc` 清空搜索

### 学习系统（壳层内置，基于 il_progress 自动生效）

- **复习提醒（间隔重复）**：超过 3 天未学习的进行中模块、超过 7 天未复习的已掌握模块，导航页出现"复习提醒"条，点击直达最近到期模块
- **连续学习天数**：聚合所有模块最近学习时间，在进度总览显示连续学习 streak
- **进度备份/恢复**：进度总览右侧「导出进度」一键下载 `il_progress` JSON，「导入进度」选择文件即恢复——换浏览器/清缓存不再丢进度
- **分类学习看板**：有学习进度后，导航页展示四类（DevOps / CS 基础 / 自动化 / 开发工具）的掌握度条形统计，读数形如 `5 / 13 掌握 · 56%`（每类分母是该类模块数，两类模块各自折算成 0~1 的掌握度再平均）
- **重置进度**：进度总览右侧「重置进度」按钮（confirm 确认）可一键清空全部学习进度，重新开始
- **今日目标**：导航页可设定每日里程碑目标（按天生效），实时显示"今日已解锁 / 目标"进度条，达成后标记 ✓
- **星标收藏**：每张课程卡片右上角可点星收藏（il_star 持久化），收藏模块在任何排序方式下都置顶显示
- **成就徽章**：9 枚（连学 3 天 / 连学 7 天 / 首个精通 / 三连精通 / 分类先锋 / 测验满分 / 测验学霸 / 半程达成 / 全站通关）按 `il_progress` 自动解锁（il_badges 记录已解锁）
- **暗/亮主题**：il_theme 持久化，右上角按钮循环切换亮色/暗色/自动跟随系统（prefers-color-scheme）
- **学习热力图**：近 90 天 GitHub 风格学习日历（il_progress 各模块时间戳聚合），展示活跃天数

---

## 添加新学习模块

导航页采用**数据驱动**架构：卡片、分类计数、页脚数字全部由 `courses.js` 的 `window.IL_COURSES` 数组渲染生成，`index.html` 无需再手动添加任何 HTML；模块内容以数据文件形式放在 `modules/<key>.js`，**整个库只有一个 HTML 页面**。

### 1. 创建模块数据

在 `src/` 下新建 `{topic}-interactive.html`（命名规范：小写英文 + 连字符 + `-interactive` 后缀），要求**自包含**（CSS 和 JavaScript 全部内联，`lang="zh-CN"`，UTF-8，CDN 仅引入字体）。源码页可以直接双击用浏览器打开调试，确认后打包成数据文件：

```bash
python3 tools/pack-modules.py   # 先在 KEYS 中登记 'xxx-interactive.html': 'xxx'
node tools/verify-pack.js       # 确认 src/ 与 modules/ 一致（CI 的 check job 跑同一条）
```

脚本生成 `modules/<key>.js`：`window.IL_MODULES['<key>'] = { title, css, html, js, links, needsReady }`，由 `index.html` 壳页按需加载渲染。

两条打包约定值得知道：

- **作用域隔离**：壳层把所有模块的 `js` 追加进同一个文档，顶层 `const/let` 会在模块间互相冲突（第二轮 13 个模块因此整段失效）。打包脚本自动把模块顶层代码包进 `(function () { ... })()`，并把内联 `on*` 处理函数用到的名字挂回 `window`。源码里不需要自己写 IIFE。
- **共享运行时内联**：模块可以用 `<script src="../ilquiz.js"></script>` 引用 `IL.mount` / `IL.quiz` / `IL.order` / `IL.record`，打包时该文件内容被内联进 `js` 字段（带 `/* ilquiz:inlined */` 标记），因此 `modules/*.js` 仍然自包含；`unpack-modules.js` 会把它还原成引用。运行时带 `if (global.IL) return;` 幂等锁，壳层与模块各内联一份也只生效一次。

### 2. 注册课程数据

打开 `courses.js`，在 `window.IL_COURSES` 数组末尾追加一条记录：

```js
{
  key: 'tmux',                     // 模块标识（对应 modules/tmux.js）
  cat: 'tools',                    // 分类：devops / cs / automation / tools
  title: 'tmux 终端复用',
  desc: 'session 管理与分屏操作',
  size: '33 KB',
  progress: 'tmux',                // 可选：进度追踪 key（与模块内 localStorage 一致）
  total: 9                         // 可选：里程碑总数（配合 progress 使用）
}
```

保存后导航页自动完成：卡片渲染、分类计数、页脚总数、进度条与「我的学习进度」总览的联动。**不再需要手动改 `index.html`。**

> **一个系列只占一张卡片。** 同一主题下的多讲/子页面（如 PID 专题的 `pid-courseware/` 三讲视频课件）不各自建卡片，而是在系列入口页内提供跳转，`index.html` 只保留该专题的一个入口。

### 3. 启用进度追踪（可选，推荐）

`index.html` 会自动读取 localStorage 中的 `il_progress`，为卡片渲染进度条与「继续学习」横幅，并在导航页顶部汇总「我的学习进度」（进行中 / 已完成 / 未开始模块 + 里程碑解锁数与测验达标数）。模块侧只需遵守约定：

- **存储 key**：`il_progress`，值为 JSON 对象
- **模块条目**：`{ "<模块key>": { "steps": [已解锁里程碑索引], "quiz": {"score":..,"total":..,"wrongs":[..]}, "last": 时间戳, "done": bool } }`
- **模块 key** 与 `courses.js` 记录中的 `progress` 字段保持一致（如 Git 模块为 `git`）
- `total` 字段声明该模块的里程碑总数（如 Git 为 9）

壳层按 `total` 是否存在把模块分成两类，并各按自己的信号判定"掌握"：

| 类型 | 判据 | 数量 |
|---|---|---|
| milestone（有 `total`） | `steps` 全部解锁或 `done: true` | 32 |
| assess（无 `total`） | 测验得分率 ≥ 75%（`ceil(total × 0.75)`，与 `IL.quiz` 的默认 `pass` 同一条线） | 13 |

两条边界值得记住：**只打开过模块（`IL.touch` 只写 `last`）不算进行中、也不算掌握**——访问不等于掌握；**assess 型模块没有里程碑**，卡片进度条按测验得分率画，只访问过时明写"仅访问过 · 完成掌握度测验才算达标"。

参考实现见 `src/cdn-interactive.html`：`IL.mount('cdn', { total: 9 })` 管里程碑，`IL.quiz({ key, box, data, pass, onPass })` 管测验与错题。

自带测验 UI 的老模块不必重写界面，用同一段协议垫片即可接入错题本与错题优先重做（参考 `src/git-interactive.html`）：

```js
if (window.IL && IL.order) IL.order(MODULE_KEY, quizData);   // 渲染前：错题前置 + 打 _oi/_re 标记
// 判分时把「原始题库下标」push 进 quizWrongs（不是呈现位置，否则错题身份会漂移）
if (window.IL && IL.record) IL.record(MODULE_KEY, score, total, quizWrongs);  // 交卷时落盘
```

题目写死在 HTML 里、答案另存 `ANSWERS[]` 的模块（`regex` / `sql`）改用 `IL.orderDom(key, cards, labelSel)`：它返回 `perm`（呈现位置 → 原始下标），按同一张表重排 `ANSWERS` 即可保持判分正确。

没有自测题的模块也会被壳层自动接入：`index.html` 在进入任意模块时调用 `IL.touch(key)` 记录访问时间，因此连续学习、热力图、到期复习对全部 45 个模块生效；`ilquizzes.js` 里登记的模块还会在页尾被挂载一份共享测验（8 题），成绩与错题进入同一套 `quiz.wrongs` 协议。目前 45 个模块全部有判分测验（40 个模块自带 + 5 个壳层挂载）。

### 4. Commit 并推送

```bash
git add index.html courses.js src/ modules/ ilquiz.js ilquizzes.js tools/
git commit -m "feat: 添加 xxx 学习模块"
git push origin main
```

push 到 main 后 GitHub Actions 自动触发双平台部署。

---

## 分类体系

| 分类 | data-cat 值 | 颜色 |
|------|-------------|------|
| DevOps | `devops` | `#3ecfb4` |
| CS 基础 | `cs` | `#918cf6` |
| 自动化 | `automation` | `#f0a04b` |
| 开发工具 | `tools` | `#f06888` |

> 新增分类需同时在 CSS 中添加颜色变量和 badge 样式。

---

## 部署

push 到 `main` 后，GitHub Actions 先跑 `check`，再触发两个部署 job：

| Job | 作用 |
|------|------|
| **check** | `node tools/verify-pack.js`：把 `src/` 重新打包并与 `modules/` 逐字段比对，不一致就拦住部署（源码与产物脱节是这个库最容易犯的错） |
| **GitHub Pages** | `iroqi.github.io/interactive-learning/`，`actions/deploy-pages@v4`，无需 Secret |
| **Cloudflare Pages** | `iroqi.pages.dev`，`wrangler-action@v3`，需 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` |

`github-pages` 依赖 `check`；Cloudflare 部署仍独立运行，任一失败不影响另一个。

---

## 技术约定

- **模块自包含**：CSS 和 JS 全部内联，每个 `src/*.html` 独立可运行
- **模块 JS 用 ES5**：`modules/*.js` 的 `js` 字段被当作非模块 `<script>` 执行，早期模块统一用 `var` / `function`（新模块的顶层代码由打包脚本自动隔离作用域，见上文）
- **结构约定**：模板类模块固定 9 个编号里程碑（`<span class="num">1..9</span>`）+ 一个 `✓` 下一步章节，第 9 节为掌握度测验；迷你引擎可以是独立章节（`⚡`，置于测验前），也可以嵌在某节内
- **字体**：通过 Google Fonts CDN 引入，仅引入字体，不引入任何 JS 框架
- **字体栈**：中文使用 `'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC'`，英文标题使用 `Fraunces`，正文字体使用 `Plus Jakarta Sans`
- **提交规范**：
  - `feat:` — 新增功能或模块
  - `fix:` — 修复问题
  - `chore:` — 维护性变更

---

## 许可证

MIT
