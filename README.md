# 交互式学习库

一个纯前端的交互式学习知识库，涵盖 DevOps、计算机科学、自动化控制与开发工具等主题。采用**单页壳 + 数据驱动**架构：唯一的 `index.html` 导航/容器页按需加载各模块的数据文件，无需后端，直接在浏览器中打开即可学习。

[Live Demo →](https://iroqi.github.io/interactive-learning/)

---

## 项目概览

本项目以 **单页壳（SPA）+ 数据驱动加载** 为核心设计理念：导航页从 `courses.js` 渲染课程卡片，点击卡片后按需加载 `modules/<key>.js` 中的模块内容（HTML/CSS/JS 数据），在同一页面内完成学习，无需新开网页。

| 维度 | 详情 |
|------|------|
| 分类 | DevOps / CS 基础 / 自动化 / 开发工具 |
| 学习专题 | 37 个（持续扩展中） |
| 技术栈 | 纯 HTML + CSS + JavaScript，零依赖 |
| 页面文件 | 仅 1 个 HTML（`index.html`） |
| 进度追踪 | localStorage（`il_progress`），导航页与各模块自动联动 |
| 学习系统 | 到期复习提醒（间隔重复）、连续学习天数、进度一键导出/导入、学习报告导出、导航排序、分类学习看板、进度重置、今日目标、星标收藏置顶、成就徽章、暗/亮主题、学习热力图 |
| 部署 | GitHub Pages + Cloudflare Pages（CI/CD 自动双部署） |

---

## 目录结构

```
.
├── index.html                         # 唯一页面：导航 + 模块容器 + hash 路由
├── courses.js                         # 课程数据源（卡片/计数/页脚的唯一来源）
├── modules/                           # 模块数据文件（按需加载）
│   ├── cf-workers.js                 # 每条 = { css, html, js, links, needsReady }
│   ├── docker.js
│   └── ...                            # 共 37 个模块
├── tools/
│   └── pack-modules.py                # 构建脚本：模块 HTML → modules/*.js 数据
│
├── .github/workflows/deploy.yml       # CI/CD 双部署流水线
├── .gitignore
└── README.md                          # 本文件
```

---

## 学习专题

> 所有模块入口统一在导航页 `index.html`（点卡片即进入对应模块，`#/m/<key>` 路由）。

### DevOps

| 模块 | 描述 |
|------|------|
| cf-workers | Cloudflare Workers — Serverless 边缘计算与部署 |
| docker | Docker 入门：从镜像到容器 — 容器化核心概念与 Dockerfile |
| compose | Docker Compose — 迷你配置校验器：services、端口映射、命名卷、依赖与健康检查（9 个里程碑，进度自动保存） |
| gh-actions | GitHub Actions Workflow — CI/CD 流水线与矩阵构建（含 4 级渐进关卡） |
| k8s | Kubernetes 交互式学习 — 迷你 kubectl 模拟器：集群架构、Pod/标签、Deployment 滚动更新、Service、探针与存储（9 个里程碑，进度自动保存） |
| makefile | Makefile 从零到实战 — 构建自动化利器 |
| terraform | Terraform 基础设施即代码 — 迷你 plan/apply/destroy 引擎：HCL 语法、变量、状态、模块化、隐式依赖与生命周期（9 个里程碑，进度自动保存） |
| nginx | Nginx 配置与运维 — 迷你 nginx -t 校验器：架构、配置层级、静态文件、虚拟主机、反向代理、重定向与 HTTPS（9 个里程碑，进度自动保存） |
| systemd | Systemd 服务管理 — 迷你 systemctl 命令台：启停、开机自启、unit 文件、日志与故障排查（9 个里程碑，进度自动保存） |
| helm | Helm chart 模板 — 迷你渲染器：chart 结构、模板表达式、模板函数、values 覆盖层级、release 生命周期与 hooks（9 个里程碑，进度自动保存） |
| prometheus | Prometheus 监控 — 迷你 PromQL 查询台：抓取配置、指标类型、即时/区间向量、rate/increase、sum by、标签匹配、告警规则与可用性计算（9 个里程碑，进度自动保存） |

### CS 基础

| 模块 | 描述 |
|------|------|
| cs | CS 基础工具互动学习 — 命令行与文件系统 |
| net | 网络基础与协议 — TCP/IP、HTTP、DNS 与分层模型 |
| http | HTTP 与 API 设计 — 迷你请求引擎：报文结构、方法语义、状态码、无状态与会话、REST 设计与缓存安全（9 个里程碑，进度自动保存） |
| netsec | 网络安全基础 — 迷你漏洞雷达：识别 XSS、SQL 注入、CSRF、SSRF 等漏洞类型并选择正确修复（9 个里程碑，进度自动保存） |
| async | JavaScript 异步与事件循环 — 输出预测器：同步、微任务、宏任务、async/await 的执行顺序预测与即时核对（9 个里程碑，进度自动保存） |
| algo | 算法与数据结构基础 — 迷你复杂度评估器：估 O()、辨结构（栈/队列/哈希/链表/树/图）（9 个里程碑，进度自动保存） |
| transactions | 数据库事务与隔离级别 — 迷你判读器：脏读/不可重复读/幻读场景 → 隔离级别，MVCC 与锁（9 个里程碑，进度自动保存） |
| sqlidx | SQL 索引与 EXPLAIN — 迷你判读器：全表扫描、B+ 树、EXPLAIN 字段、最左前缀、覆盖索引与失效场景（9 个里程碑，进度自动保存） |
| rust | Rust 所有权 — 迷你 borrow-checker：move/Copy、借用冲突、生命周期、String 与 &str、Option/Result（9 个里程碑，进度自动保存） |
| permissions | Linux 文件权限 — 迷你 chmod 计算器：rwx 符号与数字换算、umask、目录权限、特殊位（9 个里程碑，进度自动保存） |
| jwt | JWT 认证令牌 — 迷你解码器：三段式结构、Header/Payload 声明、Base64Url、验签语义、过期判断与常见漏洞防护（9 个里程碑，进度自动保存） |

### 自动化

| 模块 | 描述 |
|------|------|
| n8n | n8n 工作流自动化 — 节点编排与条件逻辑 |
| pid | PID 控制系统互动学习 — 实时仿真调参，专题入口另含三讲视频课件 |
| vfd | 变频器交互式学习 — 参数配置与电机控制实践 |
| plc | PLC 交互式学习 — 控制器原理、梯形图编程与工业自动化仿真 |

> PID 专题下的 `pid-courseware/` 三讲视频课件从 PID 模块页内进入，不单独占卡片入口。

### 开发工具

| 模块 | 描述 |
|------|------|
| vscode | VSCode 配置文件学习 — settings、快捷键与扩展管理 |
| css | CSS 布局与盒模型 — 迷你布局预测器：盒模型计算、选择器优先级、Flexbox/Grid、居中、断点与层叠（9 个里程碑，进度自动保存） |
| ts | TypeScript 类型系统 — 迷你判读器：类型标注、推断、interface、联合类型、函数类型、泛型与实用类型（9 个里程碑，进度自动保存） |
| yaml | YAML 标记语言 — 容器编排与云原生配置 |
| web | 建站全流程仿真学习 — 域名、DNS、部署与 SSL 配置 |
| git | Git 版本控制 — 对象模型、三区流动、提交图模拟、分支合并与协作（9 个里程碑，进度自动保存） |
| bash | Shell 脚本 — 内置迷你终端：变量、引号、管道、重定向、条件、循环与函数（9 个里程碑，进度自动保存） |
| regex | 正则表达式 — 实时匹配引擎：字符类、量词、分组捕获、锚点边界与实战提取（9 个里程碑，进度自动保存） |
| sql | SQL 查询 — 迷你查询引擎：SELECT、过滤、排序、聚合分组、JOIN 联表与实战提取（9 个里程碑，进度自动保存） |
| redis | Redis 数据结构 — 迷你 redis-cli 命令台：String、Hash、List、Set、ZSet、过期与持久化（9 个里程碑，进度自动保存） |
| prompt | AI 提示词工程 — 提示词评分引擎：四要素、few-shot、思维链、角色约束与反模式识别（9 个里程碑，进度自动保存） |
| terraform | Terraform 基础设施即代码 — 迷你 plan/apply/destroy 引擎：HCL 语法、变量、状态、模块化、隐式依赖与生命周期（9 个里程碑，进度自动保存） |
| nginx | Nginx 配置与运维 — 迷你 nginx -t 校验器：架构、配置层级、静态文件、虚拟主机、反向代理、重定向与 HTTPS（9 个里程碑，进度自动保存） |
| systemd | Systemd 服务管理 — 迷你 systemctl 命令台：启停、开机自启、unit 文件、日志与故障排查（9 个里程碑，进度自动保存） |

---

## 本地使用

无需任何构建工具或依赖，直接用浏览器打开 `index.html` 即可（或使用任意 HTTP 服务器，如 VS Code Live Server）。模块数据通过按需加载自动取用，支持 `file://` 直接打开。

### 搜索与筛选

- **搜索**：在导航页顶部的搜索框输入关键词，实时过滤课程；支持空格分隔的**多关键词 AND 匹配**（如 `redis 命令` 需同时命中标题或描述）
- **筛选**：点击分类 Pill（DevOps / CS 基础 / 自动化 / 开发工具）按主题筛选
- **排序**：导航页右侧排序下拉可选「最近学习 / 学习进度」，基于 `il_progress` 即时重排
- **快捷键**：按 `/` 聚焦搜索框，按 `Esc` 清空搜索

### 学习系统（壳层内置，基于 il_progress 自动生效）

- **复习提醒（间隔重复）**：超过 3 天未学习的进行中模块、超过 7 天未复习的已完成模块，导航页出现"复习提醒"条，点击直达最近到期模块
- **连续学习天数**：聚合所有模块最近学习时间，在进度总览显示连续学习 streak
- **进度备份/恢复**：进度总览右侧「导出进度」一键下载 `il_progress` JSON，「导入进度」选择文件即恢复——换浏览器/清缓存不再丢进度
- **分类学习看板**：有学习进度后，导航页展示四类（DevOps / CS 基础 / 自动化 / 开发工具）的完成步数条形统计
- **重置进度**：进度总览右侧「重置进度」按钮（confirm 确认）可一键清空全部学习进度，重新开始
- **今日目标**：导航页可设定每日里程碑目标（按天生效），实时显示"今日已解锁 / 目标"进度条，达成后标记 ✓
- **星标收藏**：每张课程卡片右上角可点星收藏（il_star 持久化），收藏模块在任何排序方式下都置顶显示
- **成就徽章**：按"连学 3 天 / 首个精通 / 三连精通 / 分类先锋 / 测验满分 / 半程达成"六项自动解锁（il_badges），进度总览展示解锁进度
- **暗/亮主题**：il_theme 持久化，右上角按钮循环切换亮色/暗色/自动跟随系统（prefers-color-scheme）
- **学习热力图**：近 90 天 GitHub 风格学习日历（il_progress 各模块时间戳聚合），展示活跃天数

---

## 添加新学习模块

导航页采用**数据驱动**架构：卡片、分类计数、页脚数字全部由 `courses.js` 的 `window.IL_COURSES` 数组渲染生成，`index.html` 无需再手动添加任何 HTML；模块内容以数据文件形式放在 `modules/<key>.js`，**整个库只有一个 HTML 页面**。

### 1. 创建模块数据

在仓库根目录新建 `{topic}-interactive.html`（命名规范：小写英文 + 连字符 + `-interactive` 后缀），要求**自包含**（CSS 和 JavaScript 全部内联，`lang="zh-CN"`，UTF-8，CDN 仅引入字体）。然后运行打包脚本，将其转换为数据文件：

```bash
python3 tools/pack-modules.py   # 在 tools/pack-modules.py 的 KEYS 中登记新模块后执行
```

脚本会生成 `modules/<key>.js`：`window.IL_MODULES['<key>'] = { css, html, js, links, needsReady }`，由 `index.html` 壳页按需加载渲染，无需再保留独立 HTML 页面。

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

`index.html` 会自动读取 localStorage 中的 `il_progress`，为带 `data-progress` 的卡片渲染进度条与「继续学习」横幅，并在导航页顶部汇总「我的学习进度」（进行中 / 已完成 / 未开始模块 + 总里程碑解锁数）。模块侧只需遵守约定：

- **存储 key**：`il_progress`，值为 JSON 对象
- **模块条目**：`{ "<模块key>": { "steps": [已解锁里程碑索引], "quiz": {"score":..,"total":..}, "last": 时间戳, "done": bool } }`
- **模块 key** 与 `courses.js` 记录中的 `progress` 字段保持一致（如 Git 模块为 `git`）
- `total` 字段声明该模块的里程碑总数（如 Git 为 9）

参考实现见 `modules/git.js` 数据内的 `loadProgress` / `saveProgress` / `completeMilestone`。

### 4. Commit 并推送

```bash
git add index.html courses.js modules/ tools/
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

push 到 `main` 后，GitHub Actions 自动触发以下两个并行 job：

| 平台 | 地址 | 配置 |
|------|------|------|
| **GitHub Pages** | `iroqi.github.io/interactive-learning/` | `actions/deploy-pages@v4`，无需 Secret |
| **Cloudflare Pages** | `iroqi.pages.dev` | `wrangler-action@v3`，需 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` |

两个 job 独立运行，任一失败不影响另一个。

---

## 技术约定

- **模块自包含**：CSS 和 JS 全部内联，每个 HTML 文件独立可运行
- **字体**：通过 Google Fonts CDN 引入，仅引入字体，不引入任何 JS 框架
- **字体栈**：中文使用 `'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC'`，英文标题使用 `Fraunces`，正文字体使用 `Plus Jakarta Sans`
- **提交规范**：
  - `feat:` — 新增功能或模块
  - `fix:` — 修复问题
  - `chore:` — 维护性变更

---

## 许可证

MIT
