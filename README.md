# 交互式学习库

一个纯前端的交互式学习知识库，涵盖 DevOps、计算机科学、自动化控制与开发工具等主题。采用**单页壳 + 数据驱动**架构：唯一的 `index.html` 导航/容器页按需加载各模块的数据文件，无需后端，直接在浏览器中打开即可学习。

[Live Demo →](https://iroqi.github.io/interactive-learning/)

---

## 项目概览

本项目以 **单页壳（SPA）+ 数据驱动加载** 为核心设计理念：导航页从 `courses.js` 渲染课程卡片，点击卡片后按需加载 `modules/<key>.js` 中的模块内容（HTML/CSS/JS 数据），在同一页面内完成学习，无需新开网页。

| 维度 | 详情 |
|------|------|
| 分类 | DevOps / CS 基础 / 自动化 / 开发工具 |
| 学习专题 | 15 个（持续扩展中） |
| 技术栈 | 纯 HTML + CSS + JavaScript，零依赖 |
| 页面文件 | 仅 1 个 HTML（`index.html`） |
| 进度追踪 | localStorage（`il_progress`），导航页与各模块自动联动 |
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
│   └── ...                            # 共 15 个模块
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
| gh-actions | GitHub Actions Workflow — CI/CD 流水线与矩阵构建（含 4 级渐进关卡） |
| makefile | Makefile 从零到实战 — 构建自动化利器 |

### CS 基础

| 模块 | 描述 |
|------|------|
| cs | CS 基础工具互动学习 — 命令行与文件系统 |
| net | 网络基础与协议 — TCP/IP、HTTP、DNS 与分层模型 |

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
| yaml | YAML 标记语言 — 容器编排与云原生配置 |
| web | 建站全流程仿真学习 — 域名、DNS、部署与 SSL 配置 |
| git | Git 版本控制 — 对象模型、三区流动、提交图模拟、分支合并与协作（9 个里程碑，进度自动保存） |
| bash | Shell 脚本 — 内置迷你终端：变量、引号、管道、重定向、条件、循环与函数（9 个里程碑，进度自动保存） |

---

## 本地使用

无需任何构建工具或依赖，直接用浏览器打开 `index.html` 即可（或使用任意 HTTP 服务器，如 VS Code Live Server）。模块数据通过按需加载自动取用，支持 `file://` 直接打开。

### 搜索与筛选

- **搜索**：在导航页顶部的搜索框输入关键词，实时过滤课程
- **筛选**：点击分类 Pill（DevOps / CS 基础 / 自动化 / 开发工具）按主题筛选
- **快捷键**：按 `/` 聚焦搜索框，按 `Esc` 清空搜索

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
