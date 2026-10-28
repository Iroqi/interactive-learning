# 交互式学习库

一个纯前端的交互式学习知识库，涵盖 DevOps、计算机科学、自动化控制与开发工具等主题。采用**单页壳 + 数据驱动**架构：唯一的 `index.html` 导航/容器页按需加载各模块的数据文件，无需后端，直接在浏览器中打开即可学习。

[Live Demo →](https://iroqi.github.io/interactive-learning/)

---

## 项目概览

本项目以 **单页壳（SPA）+ 数据驱动加载** 为核心设计理念：导航页从 `courses.js` 渲染课程卡片，点击卡片后按需加载 `modules/<key>.js` 中的模块内容（HTML/CSS/JS 数据），在同一页面内完成学习，无需新开网页。

| 维度 | 详情 |
|------|------|
| 分类 | DevOps / CS 基础 / 自动化 / 开发工具 |
| 学习专题 | 46 个（持续扩展中） |
| 技术栈 | 纯 HTML + CSS + JavaScript，零依赖 |
| 页面文件 | 仅 1 个 HTML（`index.html`） |
| 进度追踪 | localStorage（`il_progress`），导航页与各模块自动联动；里程碑型看全部解锁，纯测验型看测验得分率 ≥ 75% |
| 学习系统 | 到期复习提醒（间隔重复）、连续学习天数、学习时长统计（今日 / 每模块累计）、全档案一键导出/导入、学习报告导出、导航排序、分类学习看板、进度重置、今日目标、星标收藏置顶、成就徽章、暗/亮主题、学习热力图、测验成绩趋势、错题本（测验错题聚合 + 一键重学 + 模块内错题优先重做）、搜索别名与拼写建议、统一课程皮肤（Geek 终端风：纯黑底 + 霓虹绿 + 等宽字体）、运行时对比度兜底（`ILContrast`，文字压在底色上低于 AA 时原地微调） |
| 部署 | GitHub Pages + Cloudflare Pages（CI/CD 自动双部署） |
| 数据校验 | CI 的 `check` + `browser`（矩阵）两组 job 六道把关：`src/` ↔ `modules/` 字节一致、`courses.js` 的 `size`/文案计数属实、`tags` 每个词都能在模块源码里找到、备份键清单与代码里的 `localStorage` 读写点对账、错题重做只许走共享运行时（禁止手抄 `quizData.sort`）、主题 token 双主题齐备且 skin 内无写死颜色、真实渲染对比度与 390×844 触控热区地板、真实点击遍历零崩溃且离开模块后零残留，且每个模块的测验都被真答过一遍、成绩真落了盘，**第二次进入同一个模块时错题确实排在前面、记录没被改写、角标确实给出提示**、学习时长的两本账（模块累计与每日累计）完全相等 |

---

## 目录结构

```
.
├── index.html                         # 唯一页面：导航 + 模块容器 + hash 路由
├── courses.js                         # 课程数据源（卡片/计数/页脚的唯一来源）
├── ilquiz.js                          # 共享运行时：IL.touch / IL.mount / IL.quiz / IL.order / IL.record
├── ilcontrast.js                      # 共享运行时：ILContrast 运行时文本对比度兜底（AA 下限）
├── ilquizzes.js                       # 壳层挂载测验的题库（无自测题的早期模块）
├── src/                               # 模块**源码**（自包含 HTML，作者直接编辑这里）
│   ├── git-interactive.html
│   └── ...                            # 共 46 个源码页，可单独用浏览器打开
├── modules/                           # 构建产物：数据文件（按需加载）
│   ├── git.js                         # 每条 = { title, css, html, js, links, needsReady }
│   └── ...                            # 共 46 个模块，由 src/ 打包生成
├── tools/
│   ├── pack-modules.py                # 构建：src/<key>-interactive.html → modules/<key>.js
│   ├── unpack-modules.js              # 反向：modules/<key>.js → src/（恢复丢失的源码层）
│   ├── verify-pack.js                 # 校验：src/ 重新打包后与 modules/ 内容一致
│   ├── check-courses.js               # 校验：courses.js 的 size / tags / total 与仓库实际一致，并查 id 唯一性、备份键清单有没有漏记的存储写入点、错题重做是否只走共享运行时
│   ├── check-theme.js                 # 校验：主题 token 双主题齐备、skin 无写死颜色、模块变量均已映射
│   ├── check-contrast.js              # 校验：46 模块 + 导航页 × 亮暗双主题的真实渲染对比度，含两遍量与覆盖率闸门（需浏览器，缺失则 SKIP）
│   ├── check-tap.js                   # 校验：46 模块 × 390×844 触屏视口的触控热区地板（需浏览器，缺失则 SKIP）
│   └── check-behavior.js              # 校验：46 模块真实点击遍历零崩溃 + 离开后零泄漏 + 点击确实改变 DOM + 每个模块的测验真答一遍并落成绩 + 全档案回环与导入守卫 + 学习时长两本账恒等（需浏览器，缺失则 SKIP）
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

### 开发工具（11 个）

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
| tmux | tmux 终端复用 — 迷你会话模拟器：前缀键模型、session/window/pane 三级结构、复制模式与缓冲区、`~/.tmux.conf` 手感配置（9 个里程碑，进度自动保存） |

> PID 专题下的 `pid-courseware/` 三讲视频课件从 PID 模块页内进入，不单独占卡片入口。

---

## 本地使用

无需任何构建工具或依赖，直接用浏览器打开 `index.html` 即可（或使用任意 HTTP 服务器，如 VS Code Live Server）。模块数据通过按需加载自动取用，支持 `file://` 直接打开。

### 搜索与筛选

- **搜索**：在导航页顶部的搜索框输入关键词，实时过滤课程；支持空格分隔的**多关键词 AND 匹配**（如 `redis 命令` 需同时命中）
- **搜索范围**：每个模块的可搜文本 = 标题 + 描述 + **模块 key** + **分类中文名**（搜 `DevOps` 会返回整个 devops 书架）+ `courses.js` 里的 `tags` 别名。所以搜 `k8s`、`网关`、`调试`、`协程` 这类只出现在正文而非标题的词也能命中
- **拼写建议**：零结果时若找到相近的词，会给一个「是不是想找「Redis 数据结构」」按钮，点击即跳转；只建议、不自动改写搜索结果，真的没有相近内容时只显示"换个关键词试试"
- **筛选**：点击分类 Pill（DevOps / CS 基础 / 自动化 / 开发工具）按主题筛选
- **排序**：导航页右侧排序下拉可选「最近学习 / 学习进度」，基于 `il_progress` 即时重排
- **快捷键**：按 `/` 聚焦搜索框，按 `Esc` 清空搜索

### 学习系统（壳层内置，基于 il_progress / il_time 自动生效）

- **复习提醒（间隔重复）**：超过 3 天未学习的进行中模块、超过 7 天未复习的已掌握模块，导航页出现"复习提醒"条，点击直达最近到期模块
- **连续学习天数**：聚合所有模块最近学习时间，在进度总览显示连续学习 streak
- **全档案备份/恢复**：进度总览右侧「导出数据」下载一个带封套的文件（`{app, kind, version, savedAt, keys, data}`），一次带走浏览器里全部学习数据——`il_progress` 学习进度、`il_time` 学习时长、`il_star` 收藏、`il_badges` 成就、`il_goal` 今日目标、`il_theme` 主题偏好、`website-simulation-progress` 建站仿真进度；「导入数据」按同一张键清单逐键清洗后写回，旧版只含 `il_progress` 的扁平备份仍然导得进来。导入按 `courses.js` 与每个键自己的结构校验：陌生 key 与畸形字段剔除、清洗后为空只提示不写盘、覆盖既有数据前先报"现有 N 项、读入 M 项"再确认，坏文件不会把已有进度清空。上面这段列出的键与 `index.html` 的 `IL_BACKUP_KEYS` 由 `tools/check-courses.js` 对账，漏写或多写都会让 CI 红
- **学习时长**：只统计"页面可见且停在某个模块里"的停留时间——15s 心跳 + 离开/隐藏/卸载时补最后一段，单段上限 30s（睡眠唤醒不灌水）；每段同时写 `il_progress[key].ms`（模块累计）与 `il_time`（按天累计），两本账之和恒等。导航页显示"今日分钟"，卡片显示累计时长，学习报告带时长列
- **分类学习看板**：有学习进度后，导航页展示四类（DevOps / CS 基础 / 自动化 / 开发工具）的掌握度条形统计，读数形如 `5 / 13 掌握 · 56%`（每类分母是该类模块数，两类模块各自折算成 0~1 的掌握度再平均）
- **重置进度**：进度总览右侧「重置进度」按钮（confirm 确认）可一键清空全部学习进度与学习时长，重新开始
- **今日目标**：导航页可设定每日里程碑目标（按天生效），实时显示"今日已解锁 / 目标"进度条，达成后标记 ✓
- **星标收藏**：每张课程卡片右上角可点星收藏（il_star 持久化），收藏模块在任何排序方式下都置顶显示
- **成就徽章**：9 枚（连学 3 天 / 连学 7 天 / 首个精通 / 三连精通 / 分类先锋 / 测验满分 / 测验学霸 / 半程达成 / 全站通关）按 `il_progress` 自动解锁（il_badges 记录已解锁）
- **暗/亮主题**：il_theme 持久化，右上角按钮循环切换亮色/暗色/自动跟随系统（prefers-color-scheme）
- **学习热力图**：近 90 天 GitHub 风格学习日历：有 `il_time` 的日子按分钟分档（10 / 30 / 60 分钟三刀），升级前的旧数据仍按 `il_progress` 的时间戳聚合；标题显示活跃天数与累计时长

---

## 添加新学习模块

导航页采用**数据驱动**架构：卡片、分类计数、页脚数字全部由 `courses.js` 的 `window.IL_COURSES` 数组渲染生成，`index.html` 无需再手动添加任何 HTML；模块内容以数据文件形式放在 `modules/<key>.js`，**整个库只有一个 HTML 页面**。

### 1. 创建模块数据

在 `src/` 下新建 `{topic}-interactive.html`（命名规范：小写英文 + 连字符 + `-interactive` 后缀），要求**自包含**（CSS 和 JavaScript 全部内联，`lang="zh-CN"`，UTF-8，CDN 仅引入字体）。源码页可以直接双击用浏览器打开调试，确认后打包成数据文件：

```bash
python3 tools/pack-modules.py   # 先在 KEYS 中登记 'xxx-interactive.html': 'xxx'
node tools/verify-pack.js       # 确认 src/ 与 modules/ 一致（CI 的 check job 跑同一条）
node tools/check-courses.js     # 确认 courses.js 的 size / tags / total 没在撒谎，并查 id 是否重复/撞壳层、存储键是否都在备份清单里
node tools/check-theme.js       # 确认新模块没有把颜色写死、也没漏掉 token 映射
node tools/check-contrast.js    # 量渲染后的实际对比度（需 Playwright + Chromium，没有则 SKIP）
node tools/check-tap.js         # 量渲染后的触控热区（同上，需浏览器）
node tools/check-behavior.js    # 真的点、也真的答题：逐模块点遍控件、答完每个模块的测验，再**第二次进入**同一个模块量错题优先，查离开后的残留报错与成绩有没有落盘
node tools/check-behavior.js --no-quiz     # 复现 Round 20 口径（只点按钮、不答题）
node tools/check-behavior.js --no-revisit  # 复现 Round 21 口径（答题但不第二次进入）
node tools/check-behavior.js --rcov=90     # 错题优先重做的可量到率下限
node tools/check-behavior.js --fpdump=docker  # 打印闸门见到的每张题卡指纹与"期望位序 / 重进实走"，用来排查"分母对不上"和"判据没有区分度"
node tools/check-behavior.js --walkmax=16    # 第二次进入后沿"下一题"最多走几步（0＝只看刚回来那一眼）
```

前三条是静态检查，后三条是浏览器检查：它把模块真正渲染出来（390×844 触摸视口、按读者方式滚动、等淡入与过渡走完）再量"这个字压在这个底上"的比值。对比度与触控两道闸门都做**两遍量**——先按读者当前能看到的东西量一遍，再把折叠面板 / `<details>` / `[hidden]` 里的内容临时揭开补量，并给出"量到的 / 页面上存在的"覆盖率，低于 `--cover=`（默认 90%）判失败：`0 失败` 只有配上"量到了多少"才有意义。对比度那一道除了 46 个模块还量**导航页**（要带一份确定性学习进度，否则进度条/徽章/错题本/热力图根本不渲染）。`--source` 会屏蔽运行时兜底、按"路径 + 前景色"聚合出源头簇，用来定位到底是哪条 CSS 规则出了问题，`[展开后]` 前缀标出那些只有揭开才露面的行：

```bash
node tools/check-contrast.js --source --keys=n8n --top=20
```

脚本生成 `modules/<key>.js`：`window.IL_MODULES['<key>'] = { title, css, html, js, links, needsReady }`，由 `index.html` 壳页按需加载渲染。

三条打包/运行约定值得知道：

- **作用域隔离**：壳层把所有模块的 `js` 追加进同一个文档，顶层 `const/let` 会在模块间互相冲突（第二轮 13 个模块因此整段失效）。打包脚本自动把模块顶层代码包进 `(function () { ... })()`，并把内联 `on*` 处理函数用到的名字挂回 `window`。源码里不需要自己写 IIFE。
- **CSS 作用域隔离**：壳层注入模块 `<style>` 前会跑 `scopeModuleCSS()`，把每条选择器改写为 `#moduleRoot …` 限定。因此**模块 CSS 永远不能假设自己能碰到壳层的 `html` / `body` / `:root`**——依赖它做全局改写（如 `body { overflow: hidden }`、`:root { --x }`）在壳层里无效，在独立页里又会污染壳层。需要主题请读 `#moduleRoot` 上的 `--sk-*` token，或用 `IL.isDark()` / `IL.toggleTheme()`。
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
  tags: ['session', '分屏', 'prefix'],  // 搜索别名，见下
  progress: 'tmux',                // 可选：进度追踪 key（与模块内 localStorage 一致）
  total: 9                         // 可选：里程碑总数（配合 progress 使用）
}
```

`size` 和 `tags` 不是装饰，`node tools/check-courses.js` 会当场核对：`size` 必须**精确等于** `modules/<key>.js` 的实际体积（判据是 `Math.round(字节数 / 1024)`，不留 ±1 容差——理由见下文"元数据必须有裁判"），`tags` 必须 3～6 个、不与 key 同名、**每个词都真的出现在 `src/<key>-interactive.html` 里**。这条下限很重要——写一个模块根本不讲的词，等于让搜索承诺不存在的内容。

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
| milestone（有 `total`） | `steps` 全部解锁或 `done: true` | 33 |
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

没有自测题的模块也会被壳层自动接入：`index.html` 在进入任意模块时调用 `IL.touch(key)` 记录访问时间，因此连续学习、到期复习对全部 46 个模块生效（学习时长与热力图的分钟分档另由壳层在模块进入/离开时记账，不依赖模块内部代码）；`ilquizzes.js` 里登记的模块还会在页尾被挂载一份共享测验（8 题），成绩与错题进入同一套 `quiz.wrongs` 协议。目前 46 个模块全部有判分测验（41 个模块自带 + 5 个壳层挂载）。

### 4. Commit 并推送

```bash
git add index.html courses.js src/ modules/ ilquiz.js ilcontrast.js ilquizzes.js tools/
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

push 到 `main` 后，GitHub Actions 先跑静态的 `check`，再由 `browser` 矩阵 job **并行**跑三道要开浏览器的闸门，两者都过才触发两个部署 job：

| Job | 作用 |
|------|------|
| **check** | `node tools/verify-pack.js`：把 `src/` 重新打包并与 `modules/` 逐字段比对，不一致就拦住部署（源码与产物脱节是这个库最容易犯的错）。再跑 `node tools/check-courses.js`：核对 `courses.js` 的 key 唯一、`src/`↔`modules/`↔记录三向齐备、`size` 与实际字节相符、`tags` 均可在模块源码中验证、`progress`/`total` 配对，以及 `src/<key>-interactive.html` 里 **id 不重复、不与壳层同名**（静态扫，连 JS 拼出来的 HTML 字符串一起看——渲染态普查看不见"点击后才建"的那段 DOM）；最后查**错题重做是否只走共享运行时**：每个模块必须有 `IL.order` / `IL.orderDom` / `IL.quiz` / `IL_QUIZZES` 之一，手抄的 `quizData.sort` / `_want` / `_oi = oi` 一律判红，用 `IL.order` 却不渲染 `_re` 角标也判红。然后跑 `node tools/check-theme.js`：`--sk-*` / `--ilq-*` 在亮暗两套都齐备、skin 的**非限定**规则里不出现写死的颜色（自定义属性声明、以及 `html[data-theme="…"]` / `#moduleRoot[data-mod="…"]` 这类显式主题/模块配对块允许写死，那正是恒定深色孤岛调色板本身）、壳层 `:root` 的语义变量在 `html[data-theme="light"]` 里都有覆盖、被 8 个以上模块用到的自造颜色变量必须已进映射块、任何重定义 `--sk-page` 的孤岛块必须把"文字系" token 一次配齐 |
| **browser**（矩阵：contrast / tap / behavior） | 三道要开浏览器的闸门各占一个 matrix 分支并发跑。为什么拆开：CI 实测三个 job 各 contrast 431s、behavior 295s、tap 105s（含各自的装浏览器），串行是 13m51s，拆成并发墙钟由最慢那条决定，约 7m15s；本地单趟则是 contrast 392s / behavior 264s / tap 67s；为什么不合并成一道闸门：三个判据量的是对比度、触控地板、点击后果，合并后一次红灯要说清三本账，判据之间还会互相借道（答题 pass 的点击会改变对比度 pass 的可见 DOM）。CI 会临时装 Playwright + Chromium，**装不上时三道都打印 SKIP 并放行**（判据不能把"环境没有浏览器"说成"库有病"）。contrast：真浏览器里逐模块量渲染对比度，外加**导航页**一趟（带确定性进度种子），折叠内容两遍量后给出覆盖率，低于 90% 判失败。tap：390×844 触屏视口下遍历全部模块的触控热区，硬失败（<24px）预算 0，覆盖率同样 90% 下限。behavior：把"读者真的点下去会发生什么"这条维度补上——逐模块点遍所有 `button` / `[role=button]` 并在文本框里输入，统计**模块内**与**切到下一个模块之后**两笔未捕获错误（后者是模块回收漏了的直接证据，只在前一个口径上看不到）；再量一次"点击之后 `moduleRoot` 的签名有没有变"（整库下限 50%，低于即失败；单模块真点下去 5 个以上控件却一次都没变也失败——交卷/翻页那类按钮是留给答题 pass 的，不计入这个分母）——因为"0 报错 + 100% 覆盖"同样可能是**所有按钮都是哑的**，收纳做过头时症状是静默不是异常。同一趟里闸门还要**把每个模块的测验真答一遍**：radio 按 `name` 分组逐组作答（组内每个选项都点，第一支验"作答被接受"、其余验"已作答被拒"）、checkbox 点一次、`select` 换值并派 `change`、手写题库那种带内联 `onclick` 的非按钮选项与"整卷提交"型模块的 `<div class="opt">` 全点；答完再点一遍"提交/检查"让模块亮出答案，然后按"下一题"这类按钮翻页，扫到签名不再变化为止——重置类按钮跳过，否则刚答完的题被自己抹掉，判据就成了假阴性。口径是**本轮遍历的每个模块都必须在 `il_progress` 里留下一条 quiz 记录**，缺一即失败，没有"这个模块没测验所以跳过"这一档：README 那句"全部模块都有判分测验"由 `tools/check-courses.js` 与 `ilquizzes.js` 交叉对账过。答完之后闸门**再离开、再回到同一个模块**走一趟（Round 22 新增），量四件事：`il_progress` 里那条记录自洽（0 ≤ score ≤ total、`wrongs` 是落在 `[0, total)` 的不重复整数、错题数 + 得分 == 题数）；重进之后记录逐字节没被改写；重进那一趟沿"下一题"走到的题序确实是"上次答错的题按原序前置、其余保持原序"的前缀——跨访问稳定的是**题干 + 选项的指纹**而不是题号（题号按呈现位置重写，拿它当身份等于把被测的东西抄进尺子）；模块逐题给了可见判定时，界面标红的题数要等于记录里的错题数。可量到率低于 `--rcov=`（默认 90%）判失败：分母对不上的模块会列成"未量到"，因为"闸门没量到 ≠ 没问题"；尺子自己的两处盲区同样打印出来（"可比满整卷顺序的模块 N/Y"、"重排判据没有区分度的模块 N/Y"），因为"量到了"与"量得准"是两件事。最后把壳层的全档案回环跑一遍：备份里的**每一个** `il_*` 键都要逐字节回来（导出→清库→导入），六类非法输入（数组 / 坏 JSON / 陌生对象 / 脏条目 / 空 envelope / 假成就清单）喂进去必须一个字节都不改，旧版只含 `il_progress` 的扁平备份必须仍然导得进来 |
| **GitHub Pages** | `iroqi.github.io/interactive-learning/`，`actions/deploy-pages@v4`，无需 Secret |
| **Cloudflare Pages** | `iroqi.pages.dev`，`wrangler-action@v3`，需 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` |

`github-pages` 依赖 `check`；Cloudflare 部署仍独立运行，任一失败不影响另一个。

---

## 技术约定

- **模块自包含**：CSS 和 JS 全部内联，每个 `src/*.html` 独立可运行
- **元数据必须有裁判**：`courses.js` 是人写的元数据，没有校验就会腐烂（Round 16 发现 44/45 条 `size` 与实际体积不符）。新增字段前先问"谁来证明它是对的"——`size`/`tags`/`total` 现在由 `tools/check-courses.js` + CI 守着。`size` 的判据本轮从 ±1 容差收紧成**精确相等**：容差让 CI 绿而本地探针红（yaml 46↔47、plc 83↔84），两个裁判口径不一致时，容差只会掩盖漂移
- **搜索靠数据不靠猜**：壳层不为模块维护第二份词表，可搜文本全部来自 `courses.js` 的 `tags`，且每个词都在模块源码中验证过
- **主题只有一个权威**：`localStorage.il_theme` + `IL.isDark()` / `IL.toggleTheme()`，切换时派发 `il:theme` 事件，壳层的 `applyTheme()` 监听它。模块自带主题按钮**必须**调 `IL.toggleTheme()`（参考 `src/docker-interactive.html:556`），不要自己写 `<html data-theme>` 或另存一份 key——`<html>` 上的这个属性是壳层和 5 个模块共用的，模块直接写会把全站主题抢走（表现为"切过一次模块主题，暗色再也回不来"）
- **成对声明前景与底色**：给元素写 `background: var(--primary)` 这类实心色块时，前景必须一起写成 `color: var(--sk-on-accent, #fff)`。暗色 token 是霓虹绿（配深字）、亮色 token 是墨绿（配白字），写死 `#fff` 必然在其中一边破 AA。壳层外的独立页面没有 `--sk-on-accent`，走 fallback，行为不变
- **品牌色不参与 token 映射**：`--git: #f05133`、`--http`、`--async` 这类"模块身份色"绝不能指到 `--sk-accent`。Round 17 试过把 `--git` 映射到 accent，git 页 289 个白字圆章立刻变成"白字压绿底"（1.00:1）——品牌色的职责是识别，不是对比度。需要它可读时，在模块源码里给它配一个前景（`h2 .num { color:#fff !important }`），或按下一条做主题配对
- **恒定深色孤岛要整套换装**：`pre` / `.code-block` / `.console` / `.quiz-q` / `.clab` / `#nav` 等区块在两个主题下都是深底，靠 skin 里一段"孤岛选择器 + `--sk-*` 覆写"实现。这里有个 CSS 变量机制的坑：`--muted: var(--sk-muted)` 这种别名是在**声明它的那个元素**上完成替换的，所以只覆写 `--sk-*` 不够——孤岛必须把模块自造的别名（`--muted/--text2/--dim/…`）也一起重声明，否则别名仍带着主题值继承进深底，深字压深底。`tools/check-theme.js` 会检查孤岛块的 token 覆盖是否齐备
- **模块 CSS 的特异度是 1,0,0**：`scopeModuleCSS()` 把 `*{…}` 改写成 `#moduleRoot *{…}`，它会**赢过共享库的类选择器**（`.ilq-opt` 只有 0,1,0）。表现是测验选项 padding 被模块 reset 抹平、整片压成 25px 高。`ilquiz.js` 因此检测到 `#moduleRoot` 存在时，额外注入一份 `#ilquiz-css-scoped` 样式表（同样加 `#moduleRoot ` 前缀）把特异度追平；独立页不注入，行为不变
- **主题/模块配对的逃生阀**：`renderModule()` 会写 `moduleRoot.dataset.mod = key`，skin 里可以按模块精确配对，例如 `html[data-theme="light"] #moduleRoot[data-mod="git"] h2 .num { background:#c23616 !important }`、`#moduleRoot[data-mod="plc"] .simulator {…}`。模块源码里同理：壳层有 `#moduleRoot .num {…}`（1,1,0 + `!important`），模块想配对前景必须自带 `!important`，否则被壳层压过去
- **SVG 文字用 `fill` 上色**：`color` 在 `<text>` 上根本不生效，而它的真实底色通常是同一 `<g>` 里那块 `<rect fill="#hex">`（**属性**，`backgroundColor` 看不见）。审计和兜底都必须读 `cs.fill` 并合成那块板，否则图示标签在两边都是隐形盲区；`<svg>` 根节点上的直接子元素没有 `ownerSVGElement`，找底板时不能拿它当判据。底板还可能是半透明色晕（`rgba(46,204,113,.15)`），必须继续往下层 HTML 祖先合成——把它当不透明底色会把本来清楚的浅绿字改到近黑
- **代码面板恒定深色**：`pre` / `.code-block` / `.console` 等终端类区块在两个主题下都用 `--sk-code-bg`/`--sk-code-fg`，不随主题翻转。模块里的语法高亮色板（`.kw`/`.str`/`.fn`…）本来就是"深底浅字"配色，翻成白底会让整批 inline span 掉到 2:1 以下
- **SVG 文字可以 `fill="var(--token)"`**：Chrome 支持在 SVG 呈现属性里用 `var()`，所以图示标签想跟主题走不必写死两套 hex——模块里加 `[data-theme="light"] { --svg-label:#5c6674 }` / `[data-theme="dark"] { --svg-label:#8888aa }`，正文写 `fill="var(--svg-label)"` 即可（n8n 的 11 个标签就是这么改的）。也别为了修亮色把字色改成单一深灰：`#8888aa` 在亮色 5.82 通过、`#5c6674` 在暗色只剩 3.26，同一支颜色在两个主题下的合格区间常常不重叠，必须按主题配对
- **模块的事件监听器由壳层包一层再注册**：`trackListeners()` 在模块脚本执行期间把 `window/document.addEventListener` 的回调包成「带 epoch 判活 + 恢复 curEpoch」的包装函数，`releaseModule()` 按包装函数摘除；另记一张 `modWrap`（原函数 → 包装函数），使模块自己 `removeEventListener(原函数)` 也能摘干净。堵的是这一类残留：模块最常见的滚动 spy 写成 `scroll → setTimeout(showNav, 60)`，回调执行时 `curEpoch` 是 `null`，那个 `setTimeout` 走原生实现、既没记账也没判活，切走之后照样跑起来，对着已经 `innerHTML=''` 的 DOM 写 `textContent`（plc / n8n / gh-actions / redis 那一族稳定抛 `TypeError`）。包一层之后，处理器内部再排的定时器会正常随模块回收。同一族的**第三个注册点**是模块加在自己 DOM 控件上的监听器（slider / 按钮 / canvas）：节点随模块消失，所以"摘不掉"不是问题，问题是回调执行时 `curEpoch` 是 `null`，它再排的 `requestAnimationFrame` 走原生实现——pid 的 `runBtn.click → resetAndRun → step()` 整条 rAF 链就是这么在模块回收之后继续跑到 `computeMetrics()` 的。因此 `EventTarget.prototype.addEventListener` 也接了同样一层包装：只包 `curEpoch` 非空时的注册（=模块活着时注册的），壳层自己的注册原样通过；`window`/`document` 走 own-property 版本与 `nativeAdd`，不经过原型，不会被二次包装
- **`on*` 内联 handler 也在同一套回收里**：模块写 `onclick="resetWF()"` 时，浏览器按**属性字符串**在 `window` 上找函数，而打包器为了让内联属性可用是把顶层函数重导出成 `__g.foo = foo` 的——这条通道完全绕过 `trackListeners()`，切走模块后 `modWrap` 里没有它、包装函数从不摘除，于是残留的 `setTimeout` 回调在 `curEpoch` 已经是 `null` 的 microtask 里继续写已经清空的 DOM。上一轮五道闸门全绿时，点击遍历量到 29/46 个模块共 81 个未捕获 `TypeError`，全部是这一类。修法是渲染后按 `inlineHandlerNames(mod.js)` 扫出导出名，一次性把 `window` 上那些导出点包成「epoch 判活 + `running()` 守卫」的函数（对象导出如 `DFL`/`WB` 下包一层方法），模块回收即失效。跑通它有两个坑：包对象时必须 `defineProperty(o, k, {value: wrapped})` 重新绑定否则内联属性拿到的还是原函数；包装体里要先把 `this` 存进局部变量再进 `running()` 的闭包——`running` 是裸调用回调的，`orig.apply(this, …)` 会在闭包里丢掉接收者，n8n 因此报 `this.reset is not a function`
- **导入是系统边界，要按不可信输入对待**：「导入进度」曾经对任何能 `JSON.parse` 的东西直接 `localStorage.setItem` 然后 reload，因此一个数组、一份别站点的备份、甚至一个手滑选中的配置文件都会把全部学习进度清成空壳。现在的口径是：解析结果必须是非数组对象，逐模块按 `courses.js` 认 key，`steps` 只收整数数组、`quiz` 只收数字 `score`/`total` 与数组 `wrongs`，非法条目丢弃、未知 key 计数后丢弃；清洗后为空就只提示不写盘，会覆盖既有进度时先报"覆盖 N 个、读入 M 个"再确认。这类边界不写判据就一定会回潮，所以 `tools/check-behavior.js` 里带了六类非法输入用例（数组 / 坏 JSON / 陌生对象 / 脏条目 / 空 envelope / 假成就清单，每一类都要求存储**一个字节都不改**），并要求备份里的每个键都逐字节回来。清洗时**按备份里原本的字段顺序**写回、不重排：第一版按固定顺序重建对象，长度一样、字节不一样——闸门按"逐字节回来"断言时它红了，而读者拿两份备份做 diff 时同样是这个痛
- **时长只能由一个地方记，而且必须记两本账**：模块是同一个文档里的 `<script>`，读者切走时没有 unload，模块自己既不知道"什么时候算离开"，也不知道页面在不在前台；所以计时只放在壳层的 `renderModule` / `cleanupModule` 这一对生灭点上，模块不掺和。口径是"页面可见且停在某个模块里"的停留时间，15s 心跳 + 离开/隐藏/卸载补最后一段，单段上限 30s（系统睡眠唤醒时定时器会一次跳很久，不能算成学习）。每一段由同一个 delta 同时写 `il_progress[key].ms` 与 `il_time['YYYY-MM-DD']`，于是两本账之和恒等——`tools/check-behavior.js` 遍历完 46 个模块后量的就是这条：只写一处时界面完全正常，唯一对不上的地方是"今日分钟"和报告里的模块时长，而它们很少同时出现在一屏上。`ms` 必须进 `cleanProgress` 的白名单：它不在那里，导入一次备份就把读者的时长静默清空（回环判据会先红）
- **备份的范围是浏览器里的全部学习数据，不是只有进度**：Round 20 的导入守卫修的是"别把数据搞丢"，没修"本来就少备了五分之五"——那时那个叫"导出进度"的按钮真的只搬 `il_progress`，收藏 / 成就 / 今日目标 / 主题偏好全不在里面，而读者以为备份就是自己的全部。现在的口径是一张 `IL_BACKUP_KEYS` 表（进度、学习时长、收藏、成就、今日目标、主题、建站仿真进度）+ 每键自己的清洗器，导出写成带封套的文件（`{app, kind, version, savedAt, keys, data}`）：封套里 `keys` 是这一份到底装了什么的清单，导入时**认不出的键一律计数并告知**（`忽略文件里 N 项不认的数据`），而不是静默丢掉。旧版只含 `il_progress` 的扁平文件仍然导得进来——已经备份过的读者不该因为格式升级而手里那份作废。**键清单必须由代码对账**：`tools/check-courses.js` 扫壳层与全部 `src/*.html` 里的 `localStorage.getItem/setItem/removeItem`（字面量与 `var X = 'key'` 别名都能解析），逐键要求在 `IL_BACKUP_KEYS` 或 `IL_NOBACKUP_KEYS` 登记，未登记红、登记了却没人用（死声明）红、两张表重叠红，README 那句承诺列出的键也必须与表一致。这条判据上线当轮就抓到一个：`src/web-interactive.html:746` 的 `const STORAGE_KEY = 'website-simulation-progress'`——模块私有的键，不在任何清单里，读者的仿真进度从来没被备份过，而这件事在文档里是隐形的
- **答题是主路径，闸门得真答一遍**：`check-behavior.js` 从 Round 20 起就在点 `button` / `[role=button]` / 文本框，但本库的测验主体一支都不在那三个选择器里（实测：722 个 `<input type=radio>` 散在 `<label class="opt-row">` 里、手写题库是 `<div class="quiz-opt" onclick="…">`、另有 `select` 15 个 / `checkbox` 26 个）。也就是说"读者答完一套题 → 记分 → 写进度 → 壳层判定掌握"这条整站最核心的路径，从来没有裁判走过。现在每题组的每个选项都点（第一支验"作答被接受"、其余验"已作答被拒"），答完再点一遍提交、并按"下一题"翻页，判据是**每个被遍历的模块都要在 `il_progress` 里留下一条 quiz 记录**（46/46），缺一即失败。三个坑：一是**一次只出一道题的模块**（docker 那种）"下一题"按钮在作答之前不存在，所以固定快照扫不出来，必须重新查询；二是重查询的 worklist **必须由测验语义圈定范围**（测验选项选择器 + "提交/检查/下一题"这类文案），不能由"DOM 变了"圈定——第一版照后者写，240 步全花在一个每次作答都重画的 `↓` 锚点上，一题没答；三是**重置类按钮要跳过**，否则刚答完的题被自己抹掉，判据退化成假阴性。"点了 2206 个选项"不是这条闸门的判据，"46 个模块都留下了成绩"才是
- **跨访问的承诺只能由"第二次进入"来证明**：错题本写"进入模块后错题优先重做"、测验面板写"下次进入将优先呈现错题"——这是全站唯一一句要**等读者第二次来**才兑现的承诺。Round 22 给它装了行为裁判时，46 个模块仍分三种实现（26 个手抄 `_oi` + sort、10 个走 `IL.order`、2 个走 `IL.orderDom` 的 perm 表、8 个走 `IL.quiz`），裁判只能证明"今天顺序碰巧对"。Round 23 把最后 26 份手抄迁进 `IL.order`，现在四种共享入口（`IL.order` / `IL.orderDom` / `IL.quiz` / 壳层 `IL_QUIZZES`）覆盖 46/46；`tools/check-courses.js` 第 10 节静态禁止 `quizData.sort` / `_want` / `_oi = oi` 再回流，并要求用 `IL.order` 的模块必须渲染 `_re` 角标。Round 22 把这段路加进 `tools/check-behavior.js`：答完题 → 离开 → 回到同一个模块 → **沿"下一题"把这一趟能看见的题序走完** → 量四件事（记录自洽、记录不被改写、题序是"错题按原序前置、其余保持原序"的前缀、界面标红数 == 记录错题数），可量到率低于 `--rcov=`（默认 90%）判失败。三条口径是这轮踩出来的：**跨访问的题身份必须是题干 + 选项的指纹**，题号按呈现位置重写，拿它当身份等于把被测的东西抄进尺子里；**第一次访问的指纹要一路跟着点击扫**（每点一下整片扫一遍），只挂在某一条点击分支上就会漏掉"所有按钮"那一相直接点掉的新一题，docker 因此量出 6/8 张、分母对不上只能弃权；**"什么算一道题"按读者能不能作答定，不按类名字面定**——`.quiz-question`（题干）因为含 `quiz-q` 命中了卡片选择器却一个选项都没有，把 vfd 整份 10 题的卷子量成 0 张。两趟访问共用**同一份**扫描代码（`FP_FACTORY` / `SWEEP_FACTORY` 各一份函数体，由 `new Function` 现场装配），手写第二份尺子的差别会伪装成模块的缺陷。分母对不上时判据可以按"挂在同一个容器下的那一组卡"认领（vfd 一页 13 张可作答卡里只有 10 张属于这份卷子），但**两组都对得上就弃权**——不许挑一个答案去凑。判据自测还揪出尺子自己的两个瞎点，两个都改成"报出来而不是冒充量过"：**只看刚回来那一眼不够**——分页式模块那时只亮一道题，比前缀就成了比第 1 题，把 docker 的重排整段关掉判据照样绿，所以第一眼没看全（可见题卡 < 记录 total）时闸门要沿着"下一题"把这一趟能看见的题走到底（`--walkmax=`，走之前先把 quiz 记录抄下来，免得走完重新落盘污染"不丢档"），并打印"可比满整卷顺序的模块 N/Y"；**这一份卷子没有区分度时也不能算数**——全对（错题数为 0）或全错（错题数 == total）时"错题前置"和"原序"是同一个序列，重排坏了也红不了，所以答题 pass 点每组选项时**轮换起点**（每一支仍然都点过、作答与"已作答被拒"两条分支仍然都走到，只是决定判定的那一次不再永远是最后一个选项），并单独打印"重排判据没有区分度的模块 N/Y"
- **模块用来判活的依据，得由壳层负责擦干净**：`n8n` 的两条工作流动画自带判活守卫（`moduleRoot.dataset.mod === 'n8n'`，读者切走就让 `sleep` 不再 resolve），看起来已经防住了"离开后写已删除的 DOM"。可它还是抛了 `TypeError`：壳层只在**进入**模块时写 `dataset.mod`，离开时清空了 `innerHTML` 却没清这个标记，于是判活恒为真——守卫在，依据是假的。修在壳层的 `cleanupModule()` 里加一行 `delete moduleRoot.dataset.mod`（一处修全库，比逐模块加 `if (!el) return` 更根本），探针实测"点运行后 0ms / 300ms / 3000ms 离开"三种时序修前都红、修后都为 0。这是 Round 22 的"第二次进入"第一次走这段路就撞到的真缺陷；教训是**判据之间的时序会互相遮蔽**：Round 21 的答题 pass 答完就切下一个模块，模块动画在切换之后才被打断，而那一趟的"离开后"计数只看 `pageerror` 落在切换之后的窗口，写空节点的报错于是记成了"模块内 0"
- **运行时对比度只是兜底**：`ILContrast` 在渲染后测量文字与实际合成底色，不足 AA 就沿 HSL 明度微调（保持色相/饱和度），改 `color` 或 SVG 的 `fill` 并记在 `data-ilc` 上以便撤销。它能救命，但不是修问题的地方——颜色要一直在被它改，说明源头没配对，该回去改 token。审计脚本与它**故意共用同一套合成规则**（忽略 `background-image`、不看元素 `opacity`、白色画布打底）：两边算出不同的数就会出现"审计说 1.11、运行时说 4.62"的僵局，谁也修不了
- **兜底读样式必须等过渡结束**：`applyTheme()` 改完 `data-theme` 的同一个 task 里跑兜底，读到的是"旧字 + 新底"——带 `transition` 的属性（`.pill` / `.card` 全是 `all .2s~.25s`）还停在过渡起点，而没有 transition 的祖先底色已经翻成新主题了。实测 light 启动那一趟把 `.pill.active` 的暗色 accent `rgb(0,255,65)` 压在 `rgb(216,247,226)` 上算出 1.19:1，于是钉死 `rgb(0,122,31)`，**把作者本来合格的 5.28:1 改成 4.41:1**。换肤一律走 `ILContrast.refresh(root)`（`clear → run → SETTLE 再补一遍`），不要用裸 `run()`。同一处还有第二个坑：`clear()` 撤掉 inline 之后**立刻** `run()`，读到的还是刚被撤掉的那个颜色（过渡从旧值起走），于是每一轮重扫都在给自己上一轮的输出再"修"一次，实测同一个 pill 在 `0,122,31 / 0,116,30 / 0,117,30` 之间漂；`clear()` 因此要在撤的期间临时压掉 `transition`、批量强制一次样式结算再恢复
- **导航页也是被审计对象**：`#navView` 与模块页是两个口径，`COLLECT` 里写了 `#navView` 不等于量过它——驱动只在 `#/m/<key>` 之间跳时，导航页一直 hidden，每次拿回来的都是没有盒子的行。且导航页**没有学习进度就只渲染一半**：无进度种子 323 个文本元素，按 `courses.js` 造一份确定性进度之后 563 个（进度条、掌握徽章、错题本、热力图、测验趋势全是"有进度才出现"）。种子必须确定性，否则同一个库两次跑出不同分母，闸门数字就成了噪声
- **闸门要自证覆盖率**："0 失败"可能只是"0 次测量"。折叠面板、未激活标签页、`<details>`、`[hidden]` 里的内容同样是真交互、真像素，`tools/check-tap.js` 与 `tools/check-contrast.js` 都因此改成两遍量：先按读者方式量可见的，再把量不到的元素临时揭开补量，补量到的行**计入覆盖率分子**，低于 `--cover=`（默认 90%）直接判失败。口径要成对：闸门替读者翻开面板，就必须同时替读者触发兜底那次重扫（审计在 root 上派发一次 `click`，与 `ilcontrast.js` 的 `click/keydown/toggle` 通道对应），并等够 `DELAY(120) + SETTLE(620) + transition(.25s)` 再量——否则量到的是过期前景，子集首跑因此虚报 8 行。反过来"渲染态普查"也有盲区：点击后才拼出来的 DOM（web 的 `test-results` 卡片）在初始渲染里根本不存在，把判据挂在浏览器遍历上会全库报 0，而缺陷在场。第三条同类判据来自 Round 20：`check-behavior.js` 除了数报错，还数"点下去 DOM 变没变"——**报错 0 与覆盖率 100% 可以同时成立而所有按钮都是哑的**，回收/收纳做过头时症状是静默，不是异常，只有正向断言（交互确实改变了页面）才看得见它。这种"整库性状"的下限只在**全库跑**时生效：`--keys=` 子集的分母小又偏科（pid 的 8 个控件里 6 个只重画 canvas，签名看不见 canvas 重绘），拿它判失败会把"我在调试"误报成"这个库有病"
- **计数必须有裁判，且裁判要管到给人读的那句文案**：`courses.js` 的 `size` 早就有 `check-courses.js` 对账，但"人写的数字"没裁判，于是同一批数字各说各话——徽章写「掌握全部 **45** 个模块」（库里 46）、README 掌握口径表写 **32**/**13**（相加 45，实际 **33**/**13**）。判据两条：代码侧剥掉注释后，`全部/全站/共 + N + 个模块`这类总量声明必须等于 `courses.length`，且 finisher 那句必须由 `+ courses.length` 拼出来（少了接线检查，改回硬编码 46 也能绿，下次加模块再假）；README 侧把表格里的数字逐条对账（专题总数、`src/` 与 `modules/` 的"共 N 个"、milestone/assess 两行、四个分类小节数、"N 个模块全部有判分测验（X 自带 + Y 挂载）"，其中 Y 还要能在 `ilquizzes.js` 里数出来）。注释不参与检查是故意的：注释里的 `15/45` 是某一轮的测量记录，改成 46 等于篡改历史。**现时制的计数不要写死，改成不依赖计数的说法**（"全站模块分两种（计数以 courses.js 为准）"）——写死一个此刻正确的数字，只是把错误推迟到下一次加模块
- **id 在模块内唯一、且不与壳层同名**：`getElementById` 只返回第一个，重复的那个是永远拿不到的死节点；模块 id 与壳层同名同样算缺陷——文档顺序里 `#navView` 在前，模块 `getElementById('search')` 拿到的是导航页那个节点。由 `tools/check-courses.js` 静态扫 `src/<key>-interactive.html` 把关（含 JS 里拼 HTML 的字符串，web 那个嵌套重复正是这么发现的），正则必须带 `(?<![-\w])`，否则 `data-id="a"` 会被当成 id 虚报 30 个模块
- **手机可用性下限**：触控热区分两层口径——**硬地板 24×24px**（WCAG 2.5.8 AA「Minimum Target Size」，宽或高任一不足即失败，`tools/check-tap.js` 按它判 FAIL）与**建议值 32px**（iOS/Android 可用性下限，check-tap 只列 WARN，由模块作者决定）。32/44 是厂商建议而不是规范硬线：把正文行内的外链、代码块里的 `💡` 提示、紧凑 stepper 一律拉到 44px 只会撑坏既有排版，换来的只是报表好看。地板实现在 skin 末尾（`#moduleRoot button/input/select/textarea/a[href] { min-height:24px }` + checkbox/radio 等尺寸盒 + `label:has(input){min-height:32px}`）；checkbox/radio 那两条必须带 `!important`，因为 CSS 隔离把模块规则也提权到 1,2,1。被 ≥32px 的 label 包裹的 radio/checkbox 豁免（热区由 label 承担）。**行内链接不能只靠 `min-height`**：CSS 2.1 规定 `min-height` 不适用于非替换 inline 盒，所以这条地板到底能不能生效是引擎行为——沙箱的 Chrome for Testing 152 应用了（同一元素实测 24px），CI 的 Chromium 没应用（17px），于是同一个库本地绿、CI 红。规范内的写法是换盒模型，因此 skin 用 `p/div/li > a[href]:only-child { display:inline-block }` 把独立成行的链接提为 inline-block（`:only-child` 只看元素子节点、不看文本节点，所以"回到 [链接]"这种行文里的短链接也会被命中；实测全库 34 个，开关该规则只有 2 个元素的几何有变化，各 1–4px，代价是这几条链接自己的行盒被抬到 24px）。闸门对"inline 且无兄弟文本"的元素按 `display` 判 FAIL 而不是按实测像素判，就是为了换引擎也不会一边红一边绿；而真正落在行文里的链接由 2.5.8 的 Inline 豁免免掉尺寸判据。另外两条不变：输入框字号 ≥16px（iOS 聚焦时不自动放大）、模块不得出现横向溢出或被 `overflow-x: hidden` 吞掉的不可达内容。这几条由 Playwright 在 390×844 视口下**遍历全部模块**，且已从往轮的临时探针升级为仓库内闸门 `tools/check-tap.js`（CI 与对比度审计共用同一次浏览器安装）——上一轮的 tap 检查只在哈希当前那一个模块上跑，等于其余模块的控件从来没被测过
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
