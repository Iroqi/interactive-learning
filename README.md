# 交互式学习库

纯前端的交互式学习知识库，收录 46 个专题，覆盖 DevOps、CS 基础、自动化与开发工具。

架构上是**单页壳 + 数据驱动**：唯一的 `index.html` 从 `courses.js` 渲染导航，按需加载 `modules/<key>.js` 里的模块内容。没有后端、没有构建步骤、没有运行时依赖，双击即可开始学习。

在线体验：<https://iroqi.github.io/interactive-learning/>

## 目录

- [特性](#特性)
- [快速开始](#快速开始)
- [项目信息](#项目信息)
- [目录结构](#目录结构)
- [使用指南](#使用指南)
- [学习专题](#学习专题)
- [添加新模块](#添加新模块)
- [架构说明](#架构说明)
- [质量保障](#质量保障)
- [部署](#部署)
- [开发约定](#开发约定)
- [已知限制](#已知限制)
- [提交规范](#提交规范)
- [许可证](#许可证)

## 特性

### 学习内容

- **每个专题都是一个可操作的模拟器**：迷你 kubectl、redis-cli、SQL 查询引擎、chmod 计算器、Flex/Grid 布局预测器……读者在页面里敲、点、改，而不是读静态讲义。
- **判分测验全覆盖**：46 个模块全部有判分测验（41 个模块自带 + 5 个壳层挂载），答完立刻判分并写入进度。
- **同一页面内完成学习**：点卡片进入模块，`#/m/<key>` 路由切换，无需新开网页；`src/` 里的源码页也可单独用浏览器打开调试。

### 学习系统

| 能力 | 行为 |
|------|------|
| 进度追踪 | 里程碑解锁与测验成绩写入 `localStorage`，导航页与模块自动联动 |
| 掌握判定 | 里程碑型看解锁数量，纯测验型看测验得分率 ≥ 75% |
| 复习队列 | 按最近一次交卷成绩与掌握状态排期（1 / 3 / 7 / 14 天），逾期最久的排最前，可展开逐个进入；点开看一眼不算复习 |
| 连续学习 | 聚合全部模块的最近学习时间，显示连续学习天数 |
| 学习时长 | 只统计"页面可见且停在模块里"的时间，同时记模块累计与按天累计两本账 |
| 今日目标 | 可设定每日里程碑目标，实时显示进度条，达成后标记 |
| 星标收藏 | 卡片星标持久化，收藏的模块在任何排序方式下置顶 |
| 成就徽章 | 9 枚徽章按进度自动解锁 |
| 错题本 | 聚合各模块错题，支持一键重学；再次进入模块时错题优先重做 |
| 学习报告 | 导出 Markdown 报告：模块状态、里程碑、测验成绩、学习时长与最近学习时间 |
| 数据备份 | 全部学习数据一键导出/导入，旧版扁平备份仍可导入 |
| 主题与热力图 | 亮色/暗色/跟随系统三态切换；近 90 天学习日历按分钟分档 |
| 界面风格 | 统一课程皮肤（Geek 终端风：纯黑底 + 霓虹绿 + 等宽字体），运行时对比度兜底 |

### 工程质量

- **六道 CI 闸门**：三道静态、三道浏览器，覆盖产物一致性、元数据真伪、对比度、触控热区、真实点击与答题、跨访问行为与复习排期。
- **源码与产物字节一致**：`src/*.html` 重新打包后必须与 `modules/*.js` 完全相同，脱节即拦住部署。
- **元数据有裁判**：`courses.js` 里的体积、别名、里程碑数都由脚本对账，不靠人工自觉。

## 快速开始

无需安装任何依赖，直接用浏览器打开 `index.html` 即可（支持 `file://`）。若需要本地 HTTP 服务：

```bash
python3 -m http.server 8000
# 访问 http://localhost:8000
```

## 项目信息

| 维度 | 详情 |
|------|------|
| 分类 | DevOps / CS 基础 / 自动化 / 开发工具 |
| 学习专题 | 46 个（持续扩展中） |
| 技术栈 | 纯 HTML + CSS + JavaScript，零依赖 |
| 页面文件 | 仅 1 个 HTML（`index.html`） |
| 数据存储 | `localStorage`，见[数据存储与备份](#数据存储与备份) |
| 部署 | GitHub Pages + Cloudflare Pages（push 后自动双部署） |
| 浏览器 | 现代 Chrome / Edge / Safari / Firefox |

## 目录结构

```text
.
├── index.html                    # 唯一页面：导航 + 模块容器 + hash 路由
├── courses.js                    # 课程元数据（卡片、计数、页脚的唯一来源）
├── ilquiz.js                     # 共享运行时：IL.touch / mount / quiz / order / record
├── ilcontrast.js                 # 共享运行时：文本对比度兜底 ILContrast
├── ilquizzes.js                  # 壳层挂载的测验题库（无自带测验的早期模块）
├── src/                          # 模块源码：自包含 HTML，作者直接编辑这里
│   ├── git-interactive.html
│   └── ...                       # 共 46 个源码页，可单独用浏览器打开
├── modules/                      # 构建产物：按需加载的数据文件
│   ├── git.js                    # 每条 = { title, css, html, js, links, needsReady }
│   └── ...                       # 共 46 个模块，由 src/ 打包生成
├── tools/                        # 打包、校验与闸门脚本
├── .github/workflows/deploy.yml  # CI/CD 流水线
├── .gitignore
└── README.md
```

`tools/` 下的脚本按用途分为三类：

| 类别 | 脚本 | 作用 |
|------|------|------|
| 构建 | `pack-modules.py` | `src/<key>-interactive.html` → `modules/<key>.js` |
| 构建 | `unpack-modules.js` | 反向还原：`modules/<key>.js` → `src/` |
| 静态校验 | `verify-pack.js` | 重新打包后与 `modules/` 逐字段比对 |
| 静态校验 | `check-courses.js` | `courses.js` 的 `size` / `tags` / `total` / id 唯一性 / 备份键清单 / 错题重做入口 |
| 静态校验 | `check-theme.js` | 主题 token 双主题齐备、skin 无写死颜色 |
| 浏览器校验 | `check-contrast.js` | 46 模块 + 导航页 × 亮暗主题的真实渲染对比度 |
| 浏览器校验 | `check-tap.js` | 46 模块 × 390×844 视口的触控热区地板 |
| 浏览器校验 | `check-behavior.js` | 真实点击遍历、答题落盘、跨访问顺序、档案回环、时长两本账 |

## 使用指南

### 导航、搜索与筛选

- **搜索**：导航页顶部搜索框实时过滤，支持空格分隔的多关键词 AND 匹配（`redis 命令` 需同时命中）。
- **搜索范围**：标题 + 描述 + 模块 key + 分类中文名 + `courses.js` 的 `tags`。搜 `k8s`、`网关`、`协程` 这类只出现在正文的词也能命中。
- **拼写建议**：零结果时若找到相近词，给出「是不是想找『Redis 数据结构』」按钮，点击跳转；不会自动改写搜索词。
- **筛选与排序**：分类 Pill 按主题筛选；排序下拉支持「最近学习 / 学习进度」，基于进度即时重排。
- **快捷键**：`/` 聚焦搜索框，`Esc` 清空搜索。

### 进度模型与掌握判定

进度存在 `localStorage` 的 `il_progress` 中，值为 JSON 对象：

```json
{
  "git": {
    "steps": [0, 1, 2],
    "quiz": { "score": 7, "total": 9, "wrongs": [3, 5], "at": 1749990000000 },
    "last": 1750000000000,
    "done": false,
    "ms": 3600000
  }
}
```

`courses.js` 是否声明 `total` 把模块分成两类，各自用不同信号判定掌握：

| 类型 | 判据 | 数量 |
|------|------|------|
| milestone（有 `total`） | `steps` 全部解锁或 `done: true` | 33 |
| assess（无 `total`） | 测验得分率 ≥ 75%（`ceil(total × 0.75)`，与 `IL.quiz` 默认 `pass` 同一条线） | 13 |

两条边界值得记住：**只打开过模块不算进行中、也不算掌握**（`IL.touch` 只写 `last`，访问不等于掌握）；**assess 型模块没有里程碑**，卡片进度条按测验得分率画，只访问过时明写"仅访问过 · 完成掌握度测验才算达标"。

### 复习队列与复习节奏

导航页的复习条只报摘要（`3 个模块待复习 · 最久逾期 6 天`），展开是一张排期表：每行一个模块，写明它凭什么排在这个间隔上、上次交卷是几天前。间隔由**最近一次交卷成绩 + 掌握状态**推导，不累计复习次数，也没有额外的存储字段：

| 判定顺序 | 状态 | 间隔 |
|------|------|------|
| 1 | 仅访问过（还没交卷） | 7 天 |
| 2 | 测验满分 | 14 天 |
| 3 | 已掌握 | 7 天 |
| 4 | 薄弱（得分率 < 50%） | 1 天 |
| 5 | 其余进行中 | 3 天 |

判定顺序就是上表从上到下，命中最前一条即止：满分优先于掌握，因为 `steps` 只说明读过、说明不了记得住。全部未到期时，提醒条改报「下次复习：2 天后 · Git 版本控制」；一份进度都没有时整块不出现。

时钟取 `quiz.at`（交卷时间），**不是** `last`：`IL.touch` 每次进入模块都会写 `last`，拿它当复习时钟等于"点开看一眼就把节奏重置了"。没有 `quiz.at` 的旧数据先回退到 `last`，下一次交卷后自动换轨；导入备份时 `at` 与 `score` / `total` / `wrongs` 一样在白名单里，漏了它会让复习节奏静默退回访问时间。

### 学习系统明细

- **全档案备份/恢复**：进度总览右侧「导出数据」下载带封套的文件（`{app, kind, version, savedAt, keys, data}`），一次带走浏览器里全部学习数据——`il_progress` 学习进度、`il_time` 学习时长、`il_star` 收藏、`il_badges` 成就、`il_goal` 今日目标、`il_theme` 主题偏好、`website-simulation-progress` 建站仿真进度；「导入数据」按同一张键清单逐键清洗后写回，旧版只含 `il_progress` 的扁平备份仍然导得进来。
- **导入校验**：陌生 key 与畸形字段剔除，清洗后为空只提示不写盘，覆盖既有数据前先报"现有 N 项、读入 M 项"再确认，坏文件不会把已有进度清空。
- **学习时长**：15s 心跳 + 离开/隐藏/卸载时补最后一段，单段上限 30s；每段同时写入 `il_progress[key].ms`（模块累计）与 `il_time`（按天累计），两本账之和恒等。导航页显示"今日分钟"，卡片显示累计时长，学习报告带时长列。
- **学习看板**：有进度后展示四个分类的掌握度条形统计，读数形如 `5 / 13 掌握 · 56%`（每类分母是该类模块数，两类模块各自折算成 0~1 后平均）。
- **学习热力图**：近 90 天日历，有 `il_time` 的日子按分钟分档（10 / 30 / 60 分钟三刀），旧数据按进度时间戳聚合；标题显示活跃天数与累计时长。
- **重置进度**：「重置进度」按钮（confirm 确认）一键清空全部学习进度与学习时长。

### 数据存储与备份

`index.html` 的 `IL_BACKUP_KEYS` 是唯一权威，导出、导入、文档与 CI 都以它为准：

| 键 | 内容 |
|----|------|
| `il_progress` | 各模块的里程碑、测验记录（含交卷时间 `quiz.at`）、最近学习时间、累计时长 |
| `il_time` | 按本地日累计的学习毫秒数 |
| `il_star` | 星标收藏 |
| `il_badges` | 已解锁成就 |
| `il_goal` | 今日目标 |
| `il_theme` | 主题偏好 |
| `website-simulation-progress` | 建站仿真进度（模块私有键） |

新增存储键必须同时登记到 `IL_BACKUP_KEYS`（或明确写入不备份的 `IL_NOBACKUP_KEYS`），否则 `tools/check-courses.js` 判定失败：未登记、登记了却没人用、两张表重叠都会红。

## 学习专题

> 全部入口在导航页 `index.html`，点卡片即进入（`#/m/<key>`）。带 `total` 的 33 个模块统一为 9 个编号里程碑 + 掌握度测验，进度自动保存；其余 13 个为单页或多讲结构，掌握度由测验判定。

### DevOps（13 个）

| 模块 | 描述 |
|------|------|
| cf-workers | Cloudflare Workers — Serverless 部署与边缘计算 |
| docker | Docker 入门：从镜像到容器 — 容器化概念、Dockerfile、镜像构建与编排 |
| k8s | Kubernetes — 迷你 kubectl 模拟器：集群架构、Pod 与标签、滚动更新、Service、探针与存储 |
| gh-actions | GitHub Actions — CI/CD 流水线、工作流模拟器、矩阵构建与密钥管理（含 4 级渐进关卡） |
| makefile | Makefile 从零到实战 — 规则语法到复杂项目构建 |
| terraform | Terraform — 迷你 plan/apply/destroy 引擎：HCL 语法、变量、状态、模块化、隐式依赖与生命周期 |
| nginx | Nginx 配置 — 迷你 `nginx -t` 校验器：配置层级、静态文件、虚拟主机、反向代理、重定向与 HTTPS |
| compose | Docker Compose — 迷你配置校验器：services、端口映射、命名卷、依赖与健康检查 |
| systemd | Systemd 服务管理 — 迷你 systemctl 命令台：启停、自启、unit 文件、日志与故障排查 |
| helm | Helm chart — 迷你渲染器：模板表达式、函数、values 覆盖、release 生命周期与 hooks |
| prometheus | Prometheus 监控 — 迷你 PromQL 查询台：指标类型、rate/increase、sum by、告警规则 |
| dockerfile | Dockerfile 构建 — 迷你判读器：指令语义、多阶段构建、层缓存、HEALTHCHECK |
| cdn | CDN 与边缘缓存 — 迷你缓存判读器：命中/回源、Cache-Control、缓存键与 Vary、ETag、purge |

### CS 基础（18 个）

| 模块 | 描述 |
|------|------|
| cs | CS 基础工具 — 命令行、文件系统与常用开发工具 |
| net | 网络基础与协议 — TCP/IP、HTTP、DNS 与网络分层模型 |
| http | HTTP 与 API 设计 — 迷你请求引擎：报文结构、方法语义、状态码、会话、REST 与缓存安全 |
| sql | SQL 查询 — 迷你查询引擎：SELECT、过滤、排序、聚合分组、JOIN 与实战提取 |
| redis | Redis 数据结构 — 迷你 redis-cli：String、Hash、List、Set、ZSet、过期与持久化 |
| netsec | 网络安全基础 — 迷你漏洞雷达：XSS、SQL 注入、CSRF、SSRF 与修复选择 |
| async | JavaScript 异步 — 输出预测器：同步、微任务、宏任务、async/await 执行顺序 |
| permissions | Linux 文件权限 — 迷你 chmod 计算器：rwx 换算、umask、目录权限、特殊位 |
| algo | 算法与数据结构 — 迷你复杂度评估器：估 O()、辨结构（栈/队列/哈希/链表/树/图） |
| transactions | 数据库事务 — 迷你判读器：脏读、不可重复读、幻读 → 隔离级别，MVCC 与锁 |
| sqlidx | SQL 索引与 EXPLAIN — 迷你判读器：全表扫描、B+ 树、最左前缀、覆盖索引与失效场景 |
| rust | Rust 所有权 — 迷你 borrow-checker：move/Copy、借用冲突、生命周期与 Option/Result |
| jwt | JWT — 迷你解码器：三段式、Base64Url、验签、过期判断与常见漏洞 |
| go | Go 并发 — 迷你输出预测器：goroutine、channel、select、WaitGroup、Mutex 与死锁 |
| oauth2 | OAuth2 与 OIDC — 迷你流程预测器：授权码、PKCE、scope、刷新、state 与验签 |
| tls | TLS 与 HTTPS — 迷你握手预测器：证书链、TLS 1.2/1.3、混合加密、HSTS |
| grpc | gRPC 与 Protobuf — 迷你调用链预测器：HTTP/2、protobuf、四种方法类型、拦截器与重试 |
| graphql | GraphQL API — 迷你 resolver 预测器：schema、类型系统、查询语法、N+1 与 DataLoader |

### 自动化（4 个）

| 模块 | 描述 |
|------|------|
| n8n | n8n 工作流自动化 — 节点编排、数据流转与条件逻辑 |
| pid | PID 控制 — 比例-积分-微分原理与实时仿真（专题入口另含三讲视频课件） |
| vfd | 变频器 — 工作原理、参数配置与电机控制实践 |
| plc | PLC — 可编程逻辑控制器、梯形图编程与工业自动化仿真 |

### 开发工具（11 个）

| 模块 | 描述 |
|------|------|
| vscode | VSCode 配置 — settings.json、快捷键、扩展管理与工作区配置 |
| yaml | YAML — 缩进即结构：容器编排、CI/CD 与云原生配置 |
| web | 建站全流程仿真 — 域名注册、DNS 解析、部署到 SSL 配置 |
| git | Git 版本控制 — 对象模型、三区流动、提交图、分支合并与团队协作 |
| bash | Shell 脚本 — 内置迷你终端：变量、引号、管道、重定向、条件、循环与函数 |
| regex | 正则表达式 — 实时匹配引擎：字符类、量词、分组捕获、锚点与实战提取 |
| prompt | AI 提示词工程 — 评分引擎：四要素、few-shot、思维链、角色约束与反模式 |
| ts | TypeScript 类型系统 — 迷你判读器：标注、推断、interface、联合、泛型与实用类型 |
| css | CSS 布局与盒模型 — 迷你布局预测器：盒模型、优先级、Flexbox/Grid、居中、断点 |
| css-layout | CSS 布局系统实战 — 迷你计算引擎：尺寸、flex 分配、grid 轨道与区域、层叠上下文 |
| tmux | tmux 终端复用 — 迷你会话模拟器：前缀键模型、三级结构、复制模式与 `~/.tmux.conf` |

> PID 专题下的 `pid-courseware/` 三讲视频课件从 PID 模块页内进入，不单独占卡片入口。一个系列只占一张卡片是硬约定。

## 添加新模块

导航页的卡片、分类计数、页脚数字全部由 `courses.js` 渲染，`index.html` 不需要手动添加任何 HTML。

### 1. 编写模块源码

在 `src/` 下新建 `{topic}-interactive.html`，命名规范为小写英文 + 连字符 + `-interactive` 后缀。要求自包含：CSS 与 JavaScript 全部内联，`lang="zh-CN"`，UTF-8，CDN 只引字体。源码页可双击用浏览器打开调试。

### 2. 打包

在 `tools/pack-modules.py` 的 `KEYS` 中登记 `'xxx-interactive.html': 'xxx'`，然后执行：

```bash
python3 tools/pack-modules.py
node tools/verify-pack.js
```

打包生成 `window.IL_MODULES['<key>'] = { title, css, html, js, links, needsReady }`，由壳页按需加载。

### 3. 注册课程数据

在 `courses.js` 的 `window.IL_COURSES` 末尾追加一条记录：

```js
{
  key: 'tmux',                          // 模块标识，对应 modules/tmux.js
  cat: 'tools',                         // devops / cs / automation / tools
  title: 'tmux 终端复用',
  desc: 'session 管理与分屏操作',
  size: '33 KB',                        // 必须与 modules/tmux.js 实际体积精确相等
  tags: ['session', '分屏', 'prefix'],  // 3~6 个，且每个词都出现在模块源码里
  progress: 'tmux',                     // 可选：进度 key，与模块内 localStorage 一致
  total: 9                              // 可选：里程碑总数，配合 progress 使用
}
```

`size` 与 `tags` 不是装饰：`tools/check-courses.js` 会核对 `size` 是否**精确等于** `Math.round(字节数 / 1024)`（不留 ±1 容差），以及每个 tag 是否真的出现在源码中。写一个模块根本不讲的词，等于让搜索承诺不存在的内容。

### 4. 接入进度与测验

推荐直接复用共享运行时，参考 `src/cdn-interactive.html`：

```js
IL.mount('cdn', { total: 9 });                                  // 里程碑
IL.quiz({ key, box, data, pass, onPass });                      // 测验与错题
```

自带测验 UI 的老模块用协议垫片接入错题本与错题优先重做（参考 `src/git-interactive.html`）：

```js
if (window.IL && IL.order) IL.order(MODULE_KEY, quizData);      // 渲染前：错题前置
if (window.IL && IL.record) IL.record(MODULE_KEY, score, total, quizWrongs);  // 交卷时落盘
```

题目写死在 HTML 里、答案另存 `ANSWERS[]` 的模块改用 `IL.orderDom(key, cards, labelSel)`：它返回 `perm`（呈现位置 → 原始下标），按同一张表重排 `ANSWERS` 即可保持判分正确。

没有自测题的模块也会被壳层自动接入：进入任意模块时 `IL.touch(key)` 记录访问时间，`ilquizzes.js` 里登记的模块还会在页尾挂载一份共享测验（8 题），成绩进入同一套 `quiz.wrongs` 协议。**目前 46 个模块全部有判分测验（41 个模块自带 + 5 个壳层挂载）。**

### 5. 校验并提交

```bash
node tools/check-courses.js     # size / tags / total / id 唯一性 / 备份键
node tools/check-theme.js       # 主题 token 与写死颜色
node tools/check-contrast.js    # 渲染对比度（需浏览器）
node tools/check-tap.js         # 触控热区（需浏览器）
node tools/check-behavior.js    # 真实点击与答题（需浏览器）
git add index.html courses.js src/ modules/ ilquiz.js ilcontrast.js ilquizzes.js tools/
git commit -m "feat: 添加 xxx 学习模块"
git push origin main
```

push 到 `main` 后 GitHub Actions 自动触发校验与双平台部署。

## 架构说明

### 单页壳与按需加载

`index.html` 是整个库唯一的页面。它读取 `courses.js` 渲染导航卡片，点击卡片时动态插入 `<script src="modules/<key>.js">`，把模块的 `css` / `html` / `js` 注入 `#moduleRoot`，路由为 `#/m/<key>`。因此：新增模块不需要改动壳层 HTML，卡片、计数、页脚全部由数据派生。

### 模块生命周期

同一文档里反复注入、销毁模块，三条边界必须由壳层统一承担：

- **渲染**：`renderModule(key)` 注入样式与节点、执行模块脚本、启动计时。
- **回收**：`cleanupModule()` 清空 `innerHTML`、摘除监听器、删除 `dataset.mod`、停止计时。
- **判活**：模块回收后，任何延迟回调都必须能判断自己已经失效（见[回收与泄漏](#回收与泄漏)）。

模块自己既不知道"什么时候算离开"，也不知道页面是否在前台，所以计时、清理、判活依据都只放在壳层的生灭点上。

### 共享运行时

| API | 作用 |
|-----|------|
| `IL.touch(key)` | 记录访问时间，驱动连续学习、最近排序与热力图（**不**驱动复习节奏） |
| `IL.mount(key, { total })` | 里程碑解锁与进度条 |
| `IL.quiz({ key, box, data, pass, onPass })` | 测验渲染、判分、错题落盘 |
| `IL.order` / `IL.orderDom` | 再次进入时错题前置，保持原始下标不变 |
| `IL.record` | 交卷时把成绩、错题与交卷时间 `at` 写入 `il_progress` |
| `IL.isDark` / `IL.toggleTheme` | 主题读取与切换，切换时派发 `il:theme` |
| `ILContrast.refresh(root)` | 换肤后重跑对比度兜底 |

模块用 `<script src="../ilquiz.js"></script>` 引用，打包时内容被内联进 `js` 字段（带 `/* ilquiz:inlined */` 标记），`modules/*.js` 因此仍然自包含；`unpack-modules.js` 会还原成引用。运行时带 `if (global.IL) return;` 幂等锁，壳层与模块各内联一份也只生效一次。

### 主题与配色体系

- **主题来源唯一**：`localStorage.il_theme` + `IL.isDark()` / `IL.toggleTheme()`，`applyTheme()` 监听 `il:theme`。模块自带主题按钮必须调 `IL.toggleTheme()`，不要自己写 `<html data-theme>` 或另存 key。
- **数值口径统一**：对比度审计与运行时兜底共用同一套合成规则（忽略 `background-image`、不看元素 `opacity`、白色画布打底），否则会出现"审计说 1.11、运行时说 4.62"的僵局。
- **换肤要等过渡结束**：`applyTheme()` 后的兜底一律走 `ILContrast.refresh(root)`（`clear → run → SETTLE 再补一遍`），不要用裸 `run()`，否则读到"旧字 + 新底"。
- **运行时兜底只救急**：`ILContrast` 沿 HSL 明度微调并把改动记在 `data-ilc` 上便于撤销；如果颜色一直在被它改，说明源头没配对，应回去改 token。

### 时间与存储

计时、备份与导入的边界写在[数据存储与备份](#数据存储与备份)与[数据与导入](#数据与导入)；核心约束是"**时长只能由一个地方记，而且必须记两本账**"，任何绕过壳层生灭点的计时都会让"今日分钟"与报告里的模块时长对不上。

## 质量保障

### 六道闸门

| 闸门 | 命令 | 判据 | 依赖 |
|------|------|------|------|
| 产物一致 | `verify-pack.js` | `src/` 重新打包与 `modules/` 逐字段相同 | 无 |
| 元数据 | `check-courses.js` | `size` / `tags` / `total` / id 唯一 / 备份键清单 / 错题重做入口 | 无 |
| 主题 | `check-theme.js` | 双主题 token 齐备、skin 无写死颜色、孤岛 token 完整 | 无 |
| 对比度 | `check-contrast.js` | 46 模块 + 导航页 × 亮暗主题，失败 0，覆盖率 ≥ 90% | 浏览器 |
| 触控热区 | `check-tap.js` | 390×844 视口下硬失败（< 24px）0 个，覆盖率 ≥ 90% | 浏览器 |
| 行为 | `check-behavior.js` | 点击遍历零崩溃、离开后零泄漏、答题落盘 46/46、跨访问顺序、档案回环、时长两本账、复习队列时钟与排期 | 浏览器 |

三道浏览器闸门在 CI 里各占一个 matrix 分支并发执行。实测串行需要 13m51s（contrast 431s + behavior 295s + tap 105s），并发后墙钟由最慢一条决定，约 7m15s。不合并成一道的原因：三个判据量的是不同维度，合并后一次红灯要同时解释三本账，答题 pass 的点击还会改变对比度 pass 的可见 DOM。

CI 会临时安装 Playwright + Chromium，**装不上时三道闸门打印 SKIP 并放行**——环境缺浏览器不等于库有病。

### 判据设计原则

这些原则是几轮迭代踩出来的，新增闸门时应沿用：

- **正向断言优先**：报错为 0 且覆盖率 100%，仍可能是所有按钮都是哑的。因此行为闸门额外要求"点击后 DOM 确实变化"（整库下限 50%）。
- **覆盖率必须自证**：折叠面板、`<details>`、`[hidden]` 里的内容同样是真交互，两道浏览器闸门都做两遍量（先按读者方式量，再揭开补量），低于 90% 直接失败。"0 失败"必须配"量到了多少"。
- **分母不靠猜**：行为闸门的判据是"本轮遍历的 46 个模块都在 `il_progress` 里留下 quiz 记录"，不是"点了多少个选项"。
- **跨访问的承诺只能由第二次进入证明**："错题优先重做"要等读者第二次来才兑现，所以闸门要真的离开、再回来、沿"下一题"走完，量记录自洽、记录不被改写、题序前缀与标红数一致。
- **题身份用题干 + 选项指纹**：题号按呈现位置重写，拿题号当身份等于把被测的东西抄进尺子。
- **没有区分度要报出来**：全对或全错时"错题前置"与"原序"是同一序列，判据红不了。答题时轮换选项起点，并单独打印"无区分度的模块数"。
- **导航页也是被审计对象**：且必须带确定性进度种子，否则同一个库两次跑出不同分母。
- **计数有裁判**：代码里的总量声明必须等于 `courses.length`，README 表格里的数字逐条对账；现时制的计数尽量不写死，改成不依赖计数的说法。
- **时钟要取事件发生的时间**：复习节奏只能由"交卷"推进，不能用"进入模块"的时间。`IL.touch` 每次访问都写 `last`，拿它当复习时钟等于让偷看重置节奏，而这类错误没有任何一屏会报错——所以判据要同时量两个方向：`last` 很近 / `at` 很远必须仍然到期，`at` 很近 / `last` 很远必须不到期。

### 常用调试命令

```bash
node tools/check-behavior.js --no-quiz        # 只点按钮、不答题
node tools/check-behavior.js --no-revisit     # 答题但不第二次进入
node tools/check-behavior.js --rcov=90        # 错题优先的可量到率下限
node tools/check-behavior.js --fpdump=docker  # 打印题卡指纹与期望/实走位序
node tools/check-behavior.js --walkmax=16     # 第二次进入后最多翻几题（0＝只看第一眼）
node tools/check-contrast.js --source --keys=n8n --top=20   # 按来源聚合，定位写死的 CSS
```

`--source` 会屏蔽运行时兜底并按"路径 + 前景色"聚合源头簇，`[展开后]` 前缀标出只有揭开面板才露面的行。

## 部署

push 到 `main` 后，GitHub Actions 先跑静态 `check`，再由 `browser` 矩阵并行跑三道浏览器闸门，两者都过才触发部署：

| Job | 作用 |
|------|------|
| `check` | 依次执行 `verify-pack.js` / `check-courses.js` / `check-theme.js` |
| `browser`（matrix） | 并行执行 contrast / tap / behavior 三道闸门 |
| GitHub Pages | 部署到 `iroqi.github.io/interactive-learning/`，使用 `actions/deploy-pages@v4`，无需 Secret |
| Cloudflare Pages | 部署到 `iroqi.pages.dev`，使用 `wrangler-action@v3`，需 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` |

`github-pages` 依赖 `check`；Cloudflare 部署独立运行，任一失败不影响另一个。

## 分类体系

| 分类 | `data-cat` | 颜色 |
|------|------------|------|
| DevOps | `devops` | `#3ecfb4` |
| CS 基础 | `cs` | `#918cf6` |
| 自动化 | `automation` | `#f0a04b` |
| 开发工具 | `tools` | `#f06888` |

新增分类需同时在 CSS 中添加颜色变量与 badge 样式。

## 开发约定

每条规则背后都是一整轮的踩坑与判据自测，完整记录在对应轮次的提交信息里，这里只保留结论。

### 模块与代码

- **自包含**：CSS 与 JS 全部内联，每个 `src/*.html` 独立可运行。
- **作用域隔离**：打包器把模块顶层代码包进 IIFE，并把内联 `on*` 用到的名字挂回 `window`，源码里不需要自己写 IIFE。
- **ES5**：`js` 字段被当作非模块 `<script>` 执行，统一使用 `var` / `function`。
- **结构约定**：模板类模块固定 9 个编号里程碑（`<span class="num">1..9</span>`）+ 一个 `✓` 下一步章节，第 9 节为掌握度测验；迷你引擎可独立成章（`⚡`，置于测验前）。
- **字体**：仅通过 Google Fonts CDN 引字体，不引任何框架；中文 `'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC'`，标题 `Fraunces`，正文 `Plus Jakarta Sans`。

### CSS 与作用域

- **模块 CSS 碰不到壳层**：注入前 `scopeModuleCSS()` 把选择器改写为 `#moduleRoot …`，所以 `body { overflow: hidden }`、`:root { --x }` 这类全局改写无效。需要主题请读 `#moduleRoot` 上的 `--sk-*`，或用 `IL.isDark()` / `IL.toggleTheme()`。
- **特异度是 1,0,0**：`* { … }` 被改写成 `#moduleRoot * { … }`，会赢过共享库的类选择器（`.ilq-opt` 只有 0,1,0）。`ilquiz.js` 因此在检测到 `#moduleRoot` 时额外注入 `#ilquiz-css-scoped` 追平，独立页不注入。
- **主题/模块配对的逃生阀**：`renderModule()` 写入 `moduleRoot.dataset.mod = key`，skin 里可以按模块精确配对（如 `html[data-theme="light"] #moduleRoot[data-mod="git"] h2 .num { … }`）。壳层同名规则带 `!important`，模块想覆盖也必须自带。

### 颜色与主题

- **成对声明前景与底色**：写 `background: var(--primary)` 时前景必须一起写成 `color: var(--sk-on-accent, #fff)`。暗色 token 是霓虹绿（配深字），亮色 token 是墨绿（配白字），写死 `#fff` 必然在其中一边破 AA。
- **品牌色不参与 token 映射**：`--git`、`--http`、`--async` 这类模块身份色的职责是识别，不是对比度；映射到 accent 会让白字圆章掉到 1.00:1。需要可读时在模块源码里单独配前景，或按主题配对。
- **恒定深色孤岛要整套换装**：`pre` / `.code-block` / `.console` / `.quiz-q` / `.clab` / `#nav` 在两个主题下都是深底。别名变量（`--muted: var(--sk-muted)`）在**声明它的元素**上完成替换，所以孤岛必须把模块自造的别名一并重声明；`check-theme.js` 会检查覆盖是否齐备。
- **SVG 文字用 `fill` 上色**：`color` 对 `<text>` 无效，真实底色通常是同一 `<g>` 里的 `<rect fill="#hex">` 属性或半透明色晕，必须逐层合成；`fill="var(--token)"` 在现代 Chrome 可用，可让图示标签跟随主题。
- **代码面板恒定深色**：语法高亮色板本来就是"深底浅字"，翻成白底会让整批 span 掉到 2:1 以下。

### 回收与泄漏

- **监听器统一包装**：`trackListeners()` 把 `window/document.addEventListener` 的回调包成「epoch 判活 + 恢复 curEpoch」，`releaseModule()` 按包装函数摘除；`modWrap` 记录映射，模块自己 `removeEventListener(原函数)` 也能摘干净。
- **节点上的监听器同样要包**：`EventTarget.prototype.addEventListener` 只包装"模块活着时注册"的调用，避免回调在回收后再排 `requestAnimationFrame`。
- **`on*` 内联处理器走第三条通道**：浏览器按属性字符串在 `window` 上找函数，绕过上面两条。渲染后按 `inlineHandlerNames(mod.js)` 把导出名统一包成「epoch 判活 + `running()` 守卫」，对象导出下包一层方法。包装体里先把 `this` 存进局部变量，否则闭包里会丢接收者。
- **判活依据由壳层维护**：`cleanupModule()` 必须 `delete moduleRoot.dataset.mod`，否则模块里的 `dataset.mod === 'n8n'` 守卫恒为真。

### 数据与导入

- **导入是系统边界**：必须按不可信输入处理——非数组对象、按 `courses.js` 认 key、逐字段清洗、未知键计数告知、清洗后为空只提示不写盘、覆盖前确认。
- **按原字段顺序写回**：不重排对象。第一版按固定顺序重建，长度一样字节不一样，逐字节回环判据当场就红。
- **备份覆盖全部学习数据**，不是只备份进度：键清单见[数据存储与备份](#数据存储与备份)，漏备与多写都会让 CI 红。
- **`ms` 必须进白名单**：`cleanProgress` 不认 `ms`，导入一次备份就会把读者时长静默清空。

### 判据与文案

- **手机可用性下限**：硬地板 24×24px（WCAG 2.5.8 AA），建议值 32px（只报 WARN）。行内链接不能只靠 `min-height`（CSS 2.1 不适用于非替换 inline 盒），要用 `:only-child { display: inline-block }` 换盒模型；输入框字号 ≥ 16px，模块不得横向溢出。
- **id 在模块内唯一且不与壳层同名**：`getElementById` 只返回第一个，重名会让模块拿到导航页的节点。静态扫描需连 JS 拼出的 HTML 字符串一起看，正则要带 `(?<![-\w])`。
- **元数据必须有裁判**：新增 `courses.js` 字段前先问"谁来证明它是对的"。`size` 判据不留容差——两个裁判口径不一致时，容差只会掩盖漂移。
- **搜索词只有一个来源**：可搜文本全部来自 `courses.js` 的 `tags`（每个词都在模块源码里验证过），壳层不维护第二份词表。

## 已知限制

- 学习时长统计的是**停留时间**而非专注时间：页面可见但读者离开，仍会计时，暂无 idle 超时。
- 复习间隔只看最近一次成绩，不累计复习次数；没有 `quiz.at` 的旧数据仍按最近访问时间排期，交一次卷后换轨。
- 行为闸门覆盖不到微任务里排的回调、`el.onclick = fn` 属性赋值、拖拽 / 填空 / 键盘作答。
- quiz 判据不验证"分数算得对不对"，只验证记录形状与跨访问一致性。
- 除 `localStorage` 以外的持久化方式没有裁判。
- 对比度仍有少量源头簇与 WARN 待清理；触控软警告条数随浏览器引擎不同（沙箱约 181，CI 约 259），硬失败与覆盖率两侧一致。

## 提交规范

| 前缀 | 用途 |
|------|------|
| `feat:` | 新增功能或模块 |
| `fix:` | 修复问题 |
| `chore:` | 维护性变更 |
| `docs:` | 文档变更 |

## 许可证

MIT
