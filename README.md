# 交互式学习库

一个纯前端的交互式学习知识库，涵盖 DevOps、计算机科学、自动化控制与开发工具等主题。每个学习专题都是自包含的单文件 HTML 模块，无需后端，直接在浏览器中打开即可学习。

[Live Demo →](https://iroqi.github.io/interactive-learning/)

---

## 项目概览

本项目以 **单文件 HTML 模块** 为核心设计理念，每个学习专题都是一个独立的、自包含的交互式页面。通过 `index.html` 导航页统一索引和分类，用户可按主题筛选和搜索课程。

| 维度 | 详情 |
|------|------|
| 分类 | DevOps / CS 基础 / 自动化 / 开发工具 |
| 学习专题 | 12 个（持续扩展中） |
| 技术栈 | 纯 HTML + CSS + JavaScript，零依赖 |
| 部署 | GitHub Pages + Cloudflare Pages（CI/CD 自动双部署） |

---

## 目录结构

```
.
├── index.html                         # 导航目录页（唯一的结构性入口）
├── {topic}-interactive.html           # 各学习模块（自包含，互不依赖）
│
├── .github/workflows/deploy.yml       # CI/CD 双部署流水线
├── .gitignore
└── README.md                          # 本文件
```

---

## 学习专题

### DevOps

| 模块 | 描述 |
|------|------|
| [cf-workers-interactive.html](cf-workers-interactive.html) | Cloudflare Workers — Serverless 边缘计算与部署 |
| [docker-interactive.html](docker-interactive.html) | Docker 入门：从镜像到容器 — 容器化核心概念与 Dockerfile |
| [gh-actions-interactive.html](gh-actions-interactive.html) | GitHub Actions Workflow — CI/CD 流水线与矩阵构建（含 4 级渐进关卡） |
| [makefile-interactive.html](makefile-interactive.html) | Makefile 从零到实战 — 构建自动化利器 |

### CS 基础

| 模块 | 描述 |
|------|------|
| [cs-interactive.html](cs-interactive.html) | CS 基础工具互动学习 — 命令行与文件系统 |
| [net-interactive.html](net-interactive.html) | 网络基础与协议 — TCP/IP、HTTP、DNS 与分层模型 |

### 自动化

| 模块 | 描述 |
|------|------|
| [n8n-interactive.html](n8n-interactive.html) | n8n 工作流自动化 — 节点编排与条件逻辑 |
| [pid-interactive.html](pid-interactive.html) | PID 控制系统互动学习 — 含实时交互式仿真模拟器 |
| [vfd-interactive.html](vfd-interactive.html) | 变频器交互式学习 — 参数配置与电机控制实践 |

### 开发工具

| 模块 | 描述 |
|------|------|
| [vscode-interactive.html](vscode-interactive.html) | VSCode 配置文件学习 — settings、快捷键与扩展管理 |
| [yaml-interactive.html](yaml-interactive.html) | YAML 标记语言 — 容器编排与云原生配置 |
| [web-interactive.html](web-interactive.html) | 建站全流程仿真学习 — 域名、DNS、部署与 SSL 配置 |

---

## 本地使用

无需任何构建工具或依赖，直接用浏览器打开 `index.html` 即可：

```bash
# macOS / Linux
open index.html

# Windows
start index.html

# 或使用任意 HTTP 服务器（如 VS Code Live Server）
```

### 搜索与筛选

- **搜索**：在导航页顶部的搜索框输入关键词，实时过滤课程
- **筛选**：点击分类 Pill（DevOps / CS 基础 / 自动化 / 开发工具）按主题筛选
- **快捷键**：按 `/` 聚焦搜索框，按 `Esc` 清空搜索

---

## 添加新学习模块

### 1. 创建模块文件

在仓库根目录新建 `{topic}-interactive.html`，命名规范：小写英文 + 连字符 + `-interactive` 后缀。

模块文件要求：
- **自包含**：CSS 和 JavaScript 全部内联
- **编码**：`lang="zh-CN"`，UTF-8
- **字体**：CDN 仅引入字体，不引入任何 JS/CSS 框架

### 2. 更新导航页

打开 `index.html`，在 `<div class="grid" id="grid">` 内追加一张卡片：

```html
<a class="card" data-cat="分类" href="文件名.html">
  <div class="card-head">
    <span class="badge" data-b="分类">分类显示名</span>
    <span class="card-idx">序号</span>
  </div>
  <h3>课程标题</h3>
  <p class="card-desc">一句话描述</p>
  <div class="card-foot">
    <span class="card-meta">~XX KB</span>
    <span class="card-go">开始学习 <svg ...></svg></span>
  </div>
</a>
```

### 3. 同步更新数据

- 更新筛选按钮中的 count 数字
- 更新顶部 stats 区的课程总数
- 更新 footer 中的总数

### 4. Commit 并推送

```bash
git add index.html 新模块.html
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
