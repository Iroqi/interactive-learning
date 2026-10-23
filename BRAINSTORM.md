# BRAINSTORM：交互式学习库迭代方向

> 本文档记录一次"深度自由 brainstorm"的过程与结论：先盘点现状，再发散方向，最后收敛为本次迭代的具体实施项。目的是让每次迭代都有可追溯的取舍依据。

## 1. 现状盘点

- **架构**：纯前端 SPA + 数据驱动。唯一 `index.html` 壳页从 `courses.js` 渲染课程卡片，按需加载 `modules/<key>.js`（含 `css/html/js` 三件套）渲染模块。
- **规模**：17 个模块，覆盖 DevOps(4) / CS 基础(3) / 自动化(4) / 开发工具(6)。
- **进度体系**：`localStorage['il_progress']`，按模块存 `{ steps[], quiz{}, last, done }`，导航页自动渲染进度条、继续学习条、总览。
- **成功模式**：每个模块都带一个"迷你引擎"（迷你终端、实时匹配、迷你 SQL 引擎、提交图模拟、PID 仿真、梯形图、工作流模拟器、建站全流程仿真），"动手学"体验好。
- **部署**：push main 后 GitHub Actions 双部署（GitHub Pages + Cloudflare Pages）。

## 2. 发散：候选方向池

### A. 壳层（导航页）体验增强
| 方向 | 价值 | 成本 | 风险 |
|------|------|------|------|
| 到期复习提醒（间隔重复） | 高：符合学习科学，把"学完即忘"变"按时巩固" | 低：纯基于现有 `last` 时间戳 | 低 |
| 连续学习天数（streak） | 高：游戏化激励 | 低：同样基于 `last` 时间戳聚合 | 低 |
| 进度备份/恢复（导出/导入 JSON） | 高：浏览器 localStorage 易丢，备份是刚需 | 低 | 低 |
| 暗色/亮色主题切换 | 中 | 中 | 中 |
| 排序（按进度/最近学习） | 中 | 低 | 低 |
| 多关键词模糊搜索 | 中 | 低 | 低 |
| 键盘直达（1-9 打开卡片） | 中 | 低 | 低 |
| 每日学习目标设置 | 中 | 中 | 中 |

### B. 新学习模块（延续"迷你引擎"路线）
| 候选模块 | 迷你引擎设想 | 受众 | 与现状重叠 |
|----------|---------------|------|-----------|
| **Kubernetes** | 迷你 kubectl 模拟器（get/run/expose/rollout） | 云原生工程师 | 无 |
| **HTTP/API 设计** | 迷你 HTTP 客户端（方法/状态码/头 → 模拟响应） | 全栈/后端 | 与 net 部分相关但不重叠 |
| AI 提示词工程 | 提示词评分台（few-shot/思维链对比） | 全体 | 无 |
| Redis 数据结构 | 迷你命令台（String/Hash/List/Set/ZSet） | 后端 | 无 |
| Terraform/IaC | 迷你 plan/apply 流程 + HCL 校验 | DevOps | 无 |
| Nginx 配置 | 虚拟主机/反向代理配置校验器 | DevOps | 无 |
| Python 入门 | 迷你代码运行器 | 初学者 | 与 cs 相关 |
| JavaScript 异步 | 事件循环可视化 | 前端 | 无 |

## 3. 收敛：本次迭代的取舍

**原则**：一次迭代只做"证据充分、可独立验证、价值密度高"的事；壳层增强与新增模块分开交付，各自可独立验证。

### 3.1 壳层三项增强（全部基于现有 `il_progress`，零侵入）
1. **到期复习提醒条**：模块 `last` 时间戳距今 > 3 天且未完成 → "待复习"；已完成且 > 7 天 → "可巩固"。点击直达最近到期模块。
2. **连续学习天数**：聚合所有模块 `last` 的去重日期，从今天（或昨天）向前数连续天数，显示在进度总览。
3. **进度导出/导入**：一键下载 `il_progress` JSON 备份；导入文件即恢复（含校验与防抖）。

> 这三个方向都服务同一个学习闭环：**学 → 追踪 → 按时复习 → 备份防丢失**，把静态的"进度条"升级为"学习系统"。

### 3.2 新增两个模块（延续"迷你引擎"成功模式）
1. **Kubernetes（k8s）**：9 个里程碑，内置迷你 kubectl 模拟器。选题理由：云原生是当前最高频的技能需求，且仓库完全没有容器编排类目；与 docker 模块形成"镜像→编排"的学习链路。
2. **HTTP 与 API 设计（http）**：9 个里程碑，内置迷你 HTTP 客户端。选题理由：是 CS 基础里与 net 互补、且人人都要用的部分；迷你请求引擎可以做出真实感强的练习（状态码判断、方法语义、REST 设计）。

### 3.3 明确不做（本次）
- 主题切换、排序、模糊搜索：价值中等且改动面大，留待下次。
- Terraform / Redis / Nginx / Prompt：进入 backlog，本次先不扩展，避免一次 push 过多变更难以验证。
- 多关键词搜索：与排序同批处理。

## 4. 验收标准
- 壳层：有进度数据的浏览器打开 `index.html` 能看到复习提醒条、连续天数、备份按钮；导出文件可再导入并恢复进度。
- 新模块：`modules/k8s.js`、`modules/http.js` 可被壳页按需加载；9 个里程碑可逐步解锁；进度写入 `il_progress` 并在返回导航页后正确联动。
- 部署：push main 后 CI 自动双部署（无需人工介入）。

## 5. Backlog（下次迭代候选）
- 主题切换 / 排序 / 模糊搜索
- Terraform、Redis、AI 提示词工程、Nginx 模块
- 每日学习目标与推送提醒
- 学习时长统计（基于 last 间隔估算）

---

# 第二轮迭代（Round 2）

## 6. 现状盘点（Round 1 之后）
- 19 个模块（新增 k8s、http）；壳层已具备复习提醒、连续学习、进度备份。
- 仓库模式验证：**"迷你引擎 + 9 里程碑 + 进度追踪"** 是内容扩张的最优路径；用户画像以 DevOps/后端/学习工具为主。

## 7. 发散：Round 2 候选
| 候选 | 迷你引擎/形态 | 价值 | 成本 | 风险 |
|------|---------------|------|------|------|
| **Redis 数据结构** | 迷你 redis-cli 命令台（SET/HASH/LIST/SET/ZSET + 过期/持久化） | 高：后端高频技能，引擎真实感强 | 中 | 低 |
| **AI 提示词工程** | 提示词评分引擎 + 对比台（要素/few-shot/CoT/反模式） | 高：当下最热主题，且"学习场景"天然契合 | 中 | 低 |
| 导航排序（进度/最近学习/标题） | 壳层小改 | 中：学习路径更可控 | 低 | 低 |
| Terraform/IaC | 迷你 plan/apply 流程 | 中 | 高 | 中 |
| Nginx 配置 | 配置校验器 | 中 | 高 | 中 |
| 主题切换（暗/亮） | 全量配色改版 | 中 | 高 | 中（现 UI 为精心设计的暗色） |
| 每日目标/提醒 | 需要推送通道 | 中 | 中 | 中 |

## 8. 收敛：Round 2 实施项
1. **Redis 模块**（`redis`，tools/或 cs）—— 迷你 redis-cli 命令台：String/Hash/List/Set/ZSet、过期、持久化；9 里程碑 + 进度。
2. **AI 提示词工程模块**（`prompt`，tools）—— 交互式提示词评分引擎：要素拆解、few-shot、思维链、反模式；9 里程碑 + 进度。
3. **壳层排序**：导航页新增排序（默认 / 最近学习 / 学习进度），基于现有卡片数据与 `il_progress`，零侵入。
4. 更新 README 与 BACKLOG（Terraform/Nginx/主题切换留待 Round 3）。

> 取舍依据：延续已验证的"迷你引擎"模式；两个主题都是当前技能市场的高频需求；排序是壳层低成本高感知项；Terraform/Nginx 因内容量大留待专门一轮。

---

# 第三轮迭代（Round 3）

## 9. 现状盘点（Round 2 之后）
- 21 个模块（新增 redis、prompt）；壳层已具备复习提醒、连续学习、进度备份、导航排序。
- Round 2 明确留待本轮：Terraform、Nginx；同时搜索仍是"单关键词子串匹配"，可低成本升级。

## 10. 发散：Round 3 候选
| 候选 | 迷你引擎/形态 | 价值 | 成本 | 风险 |
|------|---------------|------|------|------|
| **Terraform / IaC** | 迷你 plan/apply/destroy 工作流 + HCL 资源块校验 | 高：DevOps 核心技能，差异化强 | 高 | 中 |
| **Nginx 配置** | 迷你 `nginx -t` 校验器 + 虚拟主机/反向代理/HTTPS 练习 | 高：Web 服务标配，配置即练习 | 高 | 中 |
| 多关键词搜索（AND 匹配） | 壳层搜索升级 | 中：搜索体验提升 | 低 | 低 |
| 主题切换（暗/亮） | 全量配色 | 中 | 高 | 中（现 UI 为精心设计的暗色） |
| 网络安全基础 | 漏洞类型识别 + 修复方案选择 | 中高 | 高 | 中（需严守"防御向、概念级"） |
| JavaScript 事件循环 | 可视化 | 中 | 中 | 中 |

## 11. 收敛：Round 3 实施项
1. **Terraform 模块**（`terraform`，DevOps）—— 迷你 plan/apply/destroy 引擎 + HCL 语法校验：资源块、变量、状态、模块化、依赖、生命周期；9 里程碑 + 进度。
2. **Nginx 模块**（`nginx`，DevOps）—— 迷你 `nginx -t` 配置校验器：架构、配置层级、静态文件、虚拟主机、反向代理、重定向、HTTPS；9 里程碑 + 进度。
3. **壳层搜索升级**：多关键词 AND 匹配（空格分隔，全部命中标题或描述才显示）。
4. 网络安全、主题切换、JavaScript 事件循环进入 Backlog（Round 4 候选）。

> 取舍依据：把 backlog 里两个"高成本高价值"模块一次性做扎实，避免半成品；两个模块的迷你引擎（plan 输出 / nginx -t 输出）真实感强、可独立验证；搜索升级成本最低、感知最直接。

---

# 第四轮迭代（Round 4）

## 12. 现状盘点（Round 3 之后）
- 23 个模块（新增 terraform、nginx）；壳层已有复习提醒、连续学习、进度备份、导航排序、多关键词 AND 搜索。
- Round 3 Backlog：网络安全、主题切换、JavaScript 事件循环、每日目标。

## 13. 发散：Round 4 候选
| 候选 | 迷你引擎/形态 | 价值 | 成本 | 风险 |
|------|---------------|------|------|------|
| **网络安全基础** | 迷你"漏洞雷达"：给代码片段识别漏洞类型 + 选择修复方案 | 高：开发者安全意识是刚需，OWASP 主题差异化强 | 中高 | 低（严守防御向、概念级） |
| **JavaScript 事件循环** | 输出预测引擎：给异步代码预测执行顺序并核对 | 高：经典面试/实战主题，即时反馈感强 | 中 | 低 |
| 学习看板（分类完成率 + 重置进度） | 壳层：分类条形完成率、一键重置全部进度 | 中高：学习系统闭环 | 低 | 低 |
| 主题切换（暗/亮） | 全量配色改版 | 中 | 高 | 中（现 UI 为精心设计的暗色） |
| 每日目标/提醒 | 需要推送通道 | 中 | 中 | 中 |

## 14. 收敛：Round 4 实施项
1. **网络安全基础模块**（`netsec`，cs）—— 迷你"漏洞雷达"：对 8 类常见漏洞（XSS/SQL 注入/CSRF/SSRF/认证缺陷/敏感信息/不安全反序列化/安全配置）做"识别 → 危害 → 修复"三步练习；9 里程碑 + 进度。
2. **JavaScript 事件循环模块**（`async`，cs）—— 输出预测引擎：微任务/宏任务/同步代码的执行顺序预测与核对，含经典输出题；9 里程碑 + 进度。
3. **壳层学习看板**：导航页新增分类完成率条形统计 + "重置全部进度"按钮（confirm 保护）。
4. 主题切换、每日目标进入 Backlog（Round 5 候选）。

> 取舍依据：netsec 与 async 都是"无引擎不可教"的主题，恰好适配交互式形态；netsec 严格防御向（OWASP 教学口径），async 输出预测引擎反馈即时；学习看板把既有 il_progress 变成可视化闭环，成本低感知高。

---

# 第五轮迭代（Round 5）

## 15. 现状盘点（Round 4 之后）
- 25 个模块（新增 netsec、async）；壳层已有复习提醒、连续学习、进度备份、导航排序、多关键词搜索、分类看板、进度重置。
- Round 4 Backlog：主题切换、每日目标；主题切换因 25 个模块各自独立配色、全量改版成本高且风险大。

## 16. 发散：Round 5 候选
| 候选 | 迷你引擎/形态 | 价值 | 成本 | 风险 |
|------|---------------|------|------|------|
| **TypeScript 类型系统** | 类型标注判断 + 泛型推断练习引擎 | 高：现代前端必备，库内无 TS 模块 | 中高 | 低 |
| **Linux 文件权限** | 迷你 chmod 权限计算器（rwx↔数字、umask、特殊位） | 高：经典且"可算可验"，与 bash/cs 互补不重叠 | 中 | 低 |
| **今日学习目标** | 壳层：设定每日里程碑目标 + 达成进度显示 | 中高：学习系统闭环（目标→执行→反馈） | 低 | 低 |
| CSS Flexbox/Grid 布局预测 | 布局结果预测引擎 | 中 | 高 | 中（纯文本预测表达力弱） |
| 主题切换（暗/亮） | 全量配色改版 | 中 | 高 | 中（25 模块独立配色） |

## 17. 收敛：Round 5 实施项
1. **TypeScript 类型系统模块**（`ts`，tools）—— 迷你类型判读器：基础类型/联合/字面量/接口/函数类型/泛型推断练习；9 里程碑 + 进度。
2. **Linux 文件权限模块**（`permissions`，cs）—— 迷你 chmod 计算器：rwx 符号/数字换算、umask、属主属组、特殊位（setuid/sticky）；9 里程碑 + 进度。
3. **壳层今日目标**：导航页设定每日里程碑目标（持久化 il_goal），进度总览实时显示"今日已解锁 x / 目标 y"。
4. 主题切换、CSS 布局预测进入 Backlog（Round 6 候选）。

> 取舍依据：ts 与 permissions 都有"计算可验证"的引擎形态（类型是否合法、权限值换算），交互反馈强；今日目标是纯壳层低成本项，把目标设定纳入学习系统闭环；主题切换风险收益比仍不佳，继续延后。

---

# 第六轮迭代（Round 6）

## 18. 现状盘点（Round 5 之后）
- 27 个模块（新增 ts、permissions）；壳层已有复习提醒、连续学习、进度备份、导航排序、多关键词搜索、分类看板、进度重置、今日目标。
- Round 5 Backlog：主题切换、CSS 布局预测、SQL 索引优化。

## 19. 发散：Round 6 候选
| 候选 | 迷你引擎/形态 | 价值 | 成本 | 风险 |
|------|---------------|------|------|------|
| **Docker Compose** | 迷你 compose 配置校验器（services/volumes/networks/依赖解析） | 高：与 docker 模块互补、DevOps 栈闭环 | 中 | 低 |
| **算法与数据结构基础** | 迷你复杂度评估器 + 数据结构辨识 | 高：CS 核心素养、面试刚需，库内空白 | 中 | 低 |
| **收藏模块（星标置顶）** | 壳层：il_star 持久化 + 置顶排序 | 中：学习优先级管理闭环 | 低 | 低 |
| SQL 索引与 EXPLAIN 解读 | 迷你 EXPLAIN 判读器 | 高 | 高 | 中 |
| 主题切换（暗/亮） | 全量配色 | 中 | 高 | 中（27 模块独立配色） |
| CSS Flexbox/Grid 布局预测 | 布局结果预测 | 中 | 高 | 中（纯文本表达弱） |

## 20. 收敛：Round 6 实施项
1. **Docker Compose 模块**（`compose`，devops）—— 迷你 compose 校验器：services/volumes/networks/端口映射/依赖/健康检查解析与校验；9 里程碑 + 进度。
2. **算法与数据结构模块**（`algo`，cs）—— 迷你复杂度评估器（给代码估 O()）+ 数据结构场景辨识（栈/队列/哈希/链表/树）；9 里程碑 + 进度。
3. **壳层收藏**：卡片星标收藏（il_star 持久化），收藏模块在排序中置顶。
4. SQL 索引优化、主题切换、CSS 布局预测进入 Backlog（Round 7 候选）。

> 取舍依据：compose 与 algo 都是"无引擎不可教"且可验证的主题（配置是否合法、复杂度是否匹配）；收藏是壳层低成本高感知项，让学习者能管理优先级；SQL 索引优化内容量大，留待专门一轮。

---

# 第七轮迭代（Round 7）

## 21. 现状盘点（Round 6 之后）
- 29 个模块（新增 compose、algo）；壳层已有复习提醒、连续学习、进度备份、导航排序、多关键词搜索、分类看板、进度重置、今日目标、星标收藏。
- Round 6 Backlog：SQL 索引优化、主题切换、CSS 布局预测。

## 22. 发散：Round 7 候选
| 候选 | 迷你引擎/形态 | 价值 | 成本 | 风险 |
|------|---------------|------|------|------|
| **数据库事务与隔离级别** | 迷你隔离级别判读器（场景 → 脏读/不可重复读/幻读 → 隔离级别） | 高：数据库核心素养，与 sql 模块互补，判读可验证 | 中 | 低 |
| **Systemd 服务管理** | 迷你 systemctl 命令台 + unit 文件字段 | 高：Linux 运维刚需，命令可验证 | 中 | 低 |
| **成就徽章系统** | 壳层：il_badges 按进度/连学/精通/满分自动解锁 | 中高：激励闭环，低成本高感知 | 低 | 低 |
| SQL 索引与 EXPLAIN | 迷你 EXPLAIN 判读器 | 高 | 高 | 中（内容量大） |
| 主题切换（暗/亮） | 全量配色 | 中 | 高 | 中（29 模块独立配色） |
| CSS Flexbox/Grid 布局预测 | 布局结果预测 | 中 | 高 | 中（纯文本表达弱） |

## 23. 收敛：Round 7 实施项
1. **数据库事务与隔离级别模块**（`transactions`，cs）—— 迷你判读器：事务场景（脏读/不可重复读/幻读/组合）→ 隔离级别四选一；隔离级别矩阵 + MVCC/锁；9 里程碑 + 进度。
2. **Systemd 服务管理模块**（`systemd`，devops）—— 迷你 systemctl 命令台（start/enable/status/daemon-reload/journalctl 等）+ unit 文件字段；9 里程碑 + 进度。
3. **壳层成就徽章**：il_badges 持久化，按"首个完成 / 连学 3 天 / 精通 1 个 / 精通 3 个 / 测验满分 / 完成半数"自动解锁，进度总览展示解锁/未解锁态。
4. SQL 索引优化、主题切换、CSS 布局预测进入 Backlog（Round 8 候选）。

> 取舍依据：transactions 与 systemd 都是"判读/命令可验证"的引擎型主题；徽章是壳层低成本激励项，复用既有进度数据、无新存储结构；SQL 索引优化仍量大，待模块稳定后专门一轮。

---

# 第八轮迭代（Round 8）

## 24. 现状盘点（Round 7 之后）
- 31 个模块（新增 transactions、systemd）；壳层已有复习提醒、连续学习、进度备份、导航排序、多关键词搜索、分类看板、进度重置、今日目标、星标收藏、成就徽章。
- Round 7 Backlog（自 Round 5 累积三轮回）：SQL 索引优化、主题切换、CSS 布局预测。

## 25. 发散：Round 8 候选
| 候选 | 迷你引擎/形态 | 价值 | 成本 | 风险 |
|------|---------------|------|------|------|
| **CSS 布局预测** | 迷你布局预测器（盒模型计算、flexbox 主轴/交叉轴、grid 轨道、居中方案） | 高：Backlog 点名，前端刚需，计算可验证 | 中 | 低 |
| **SQL 索引与 EXPLAIN** | 迷你 EXPLAIN 判读器（type/key/rows、最左前缀、覆盖索引、失效场景） | 高：Backlog 点名，数据库性能核心，判读可验证 | 中 | 低 |
| **Rust 所有权** | 迷你 borrow-checker 判读器（move/Copy、借用冲突、生命周期） | 高：CS 领域热度最高的话题之一，规则可验证 | 中 | 低 |
| **主题切换（暗/亮）** | 壳层：il_theme 持久化 + prefers-color-scheme 自动跟随 | 中高：Backlog 点名，低风险（CSS 变量单一来源） | 中 | 低 |
| **学习热力图** | 壳层：近 90 天 GitHub 风格学习日历（聚合各模块 last 时间戳） | 中：可视化激励，与 streak 互补 | 低 | 低 |
| 错题本（quiz 错题聚合） | 壳层 | 中 | 高 | 中（需模块记录错题） |
| Helm chart 模板 | 迷你模板引擎 | 中 | 高 | 中 |
| Prometheus 监控 | 迷你 PromQL 查询台 | 中 | 高 | 中 |

## 26. 收敛：Round 8 实施项
1. **CSS 布局模块**（`css`，tools）—— 迷你布局预测器：盒模型尺寸计算、选择器优先级计算器、flexbox 主轴/交叉轴预测、flex 伸缩分配、grid 轨道与区域、居中方案判断、响应式断点、BFC 与 z-index 层叠；9 里程碑 + 进度。
2. **SQL 索引模块**（`sqlidx`，cs）—— 迷你 EXPLAIN 判读器：全表扫描 vs 索引、B+ 树结构、EXPLAIN 关键字段（type/key/rows/Extra）、单列/复合索引最左前缀、覆盖索引、like 前导通配符与函数包裹等失效场景、回表；9 里程碑 + 进度。
3. **Rust 所有权模块**（`rust`，cs）—— 迷你 borrow-checker 判读器：所有权三规则、move 与 Copy、借用与引用、可变/不可变借用冲突（"已借用不可再变"场景）、生命周期标注判断、String vs &str、Option/Result 处理；9 里程碑 + 进度。
4. **壳层主题切换**：il_theme（light/dark/auto），顶栏切换按钮 + 自动跟随系统 prefers-color-scheme；CSS 变量单一来源定义亮/暗两套。
5. **壳层学习热力图**：近 90 天 GitHub 风格热力日历（聚合全部模块 last 时间戳逐日计数），进度总览下方展示，与连续学习/徽章形成激励闭环。
6. SQL 索引优化本轮以独立模块消化；错题本、Helm、Prometheus 进入 Backlog（Round 9 候选）。

> 取舍依据：CSS/SQL 索引是 Backlog 积压三轮回的硬需求，Rust 是纯判读型主题（borrow checker 天然"对/错"可验证），三者均符合"无引擎不可教"原则；主题切换趁模块数还在可控范围（34）消化，避免继续累积；热力图纯壳层低成本，复用 il_progress 无需新数据结构。

---

# 第九轮迭代（Round 9）

## 27. 现状盘点（Round 8 之后）
- 34 个模块（新增 css、sqlidx、rust）；壳层已有复习提醒、连续学习、进度备份、导航排序、多关键词搜索、分类看板、进度重置、今日目标、星标收藏、成就徽章、暗/亮主题、学习热力图。
- Round 8 Backlog：错题本（quiz 错题聚合）、Helm chart 模板、Prometheus 监控。

## 28. 发散：Round 9 候选
| 候选 | 迷你引擎/形态 | 价值 | 成本 | 风险 |
|------|---------------|------|------|------|
| **Helm chart 模板** | 迷你 helm 渲染器（模板表达式 + values 覆盖预测） | 高：Backlog 点名，K8s 生态标配，渲染结果可验证 | 中 | 低 |
| **Prometheus 监控** | 迷你 PromQL 查询台（rate/sum by、指标类型、告警规则） | 高：Backlog 点名，可观测性刚需，查询输出可验证 | 中 | 低 |
| **JWT 认证令牌** | 迷你 JWT 解码器（三段式、Base64Url、验签、过期与漏洞） | 高：认证授权正面知识库内空白（netsec 只覆盖攻击面），解码可验证 | 中 | 低 |
| **学习报告导出** | 壳层：il_progress → Markdown 学习报告下载 | 中高：进度数据变现，真实交付价值 | 低 | 低 |
| **成就徽章扩展** | 壳层：连学 7 天 / 完成全部模块 / 测验平均 ≥7 三个新徽章 | 中：激励闭环补强，复用既有数据 | 低 | 低 |
| 错题本（quiz 错题聚合） | 壳层 | 中 | 高 | 中（需全部模块改造记录错题） |
| Vim 编辑器命令台 | 迷你命令台 | 中 | 高 | 中 |
| 微服务架构判读 | 熔断/限流/重试判读器 | 中 | 中 | 中（概念抽象） |

## 29. 收敛：Round 9 实施项
1. **Helm 模块**（`helm`，devops）—— 迷你 helm 渲染器：chart 结构、模板表达式 {{ .Values }}、模板函数（default/quote/upper）、values 覆盖层级、渲染预测、release 生命周期（upgrade/rollback/status）、依赖与 hooks；9 里程碑 + 进度。
2. **Prometheus 模块**（`prometheus`，devops）—— 迷你 PromQL 查询台：抓取配置、指标类型四选一、即时/区间向量、rate()/increase()、sum by、标签匹配、告警规则、可用性计算；9 里程碑 + 进度。
3. **JWT 模块**（`jwt`，cs）—— 迷你 JWT 解码器：三段式结构、Header/Payload 声明、Base64Url、验签语义、过期判断、常见漏洞（alg=none/弱密钥）；9 里程碑 + 进度。
4. **壳层学习报告导出**：il_progress + 课程元数据 → 一键下载 Markdown 学习报告（模块状态/里程碑/测验/最近学习时间）。
5. **壳层成就徽章扩展**：新增"连学 7 天 / 完赛全部 / 测验平均 ≥7"三枚，徽章总数 6 → 9。
6. 错题本继续进入 Backlog（Round 10 候选，需先统一模块测验接口记录错题）。

> 取舍依据：Helm/Prometheus 是 Backlog 硬需求且均有"输出可验证"的引擎形态（模板渲染结果、PromQL 返回序列）；JWT 是可计算主题（解码/验签/过期判断），补齐认证授权的正面教学空白；报告导出与徽章扩展纯壳层低成本，复用现有数据无新存储结构；错题本需改全部模块接口，成本高，待统一测验协议后专轮处理。

---

# 第十轮迭代（Round 10）

## 31. 现状盘点（Round 9 + 视觉重构之后）
- 37 个模块；壳层功能齐全（复习提醒/连续学习/备份/报告导出/排序/看板/重置/今日目标/收藏/徽章 9 枚/主题/热力图）。
- 已完成两轮 FFC 归一化：统一皮肤层（三代模块配色/组件收敛）+ 去蓝紫 AI 味（分类 4 色 → FFC 正蓝 #198eee、全站无渐变、无衬线）。
- 遗留：①用户提出"形态也往 FFC 靠拢"——双栏 challenge 布局尚未试点；②Round 9 Backlog 错题本——需先统一模块测验接口。

## 32. 发散：Round 10 候选
| 候选 | 形态/引擎 | 价值 | 成本 | 风险 |
|------|-----------|------|------|------|
| **FFC 双栏 challenge 布局试点（helm）** | 把 step 改为左讲解 + 右任务清单 | 高：回应用户形态诉求，产出全库示范模板 | 中 | 中（需改模块 html/css 并重打包） |
| **Dockerfile 构建** | 迷你 Dockerfile 判读器（指令/多阶段/缓存/HEALTHCHECK） | 高：docker 模块的编写侧补全，输出可验证 | 中 | 低 |
| **Go 并发** | goroutine/channel 输出预测器（并发执行顺序） | 高：热点主题，输出可验证 | 中 | 低 |
| **测验成绩趋势** | 壳层：聚合各模块 quiz 成绩展示 | 中高：复用既有 il_progress，激励可视 | 低 | 低 |
| 随机一课 | 壳层按钮随机推荐模块 | 低 | 低 | 低 |
| 错题本（quiz 错题聚合） | 壳层 | 中 | 高 | 中（需改全部模块测验接口） |

## 33. 收敛：Round 10 实施项
1. **FFC 双栏 challenge 试点（helm 模块重构）**：`.challenge` = 左栏讲解（.ch-lead）+ 右栏任务要求清单（.ch-task）+ 交互控件；移动端单栏堆叠；保留全部 id/js 与引擎；产出可复制的布局模板，README 记录新约定。
2. **Dockerfile 模块**（`dockerfile`，devops）：迷你 Dockerfile 判读器——指令语义、构建上下文、多阶段构建、层缓存与失效、ENTRYPOINT/CMD 区别、HEALTHCHECK、.dockerignore；含构建步骤预测引擎 + 9 里程碑。
3. **Go 并发模块**（`go`，cs）：迷你并发判读器——goroutine 调度、channel 收发阻塞、无缓冲/缓冲 channel、select、sync.WaitGroup、Mutex、defer 顺序、竞态；含输出预测引擎（main 结束即程序结束、channel 阻塞点）+ 9 里程碑。
4. **壳层测验成绩趋势**：`#ovQuiz` 区块聚合 il_progress 各模块 quiz，展示"各模块测验成绩条形图 + 平均分"，复用 FFC 皮肤。
5. 错题本继续入 Round 11 Backlog（待统一测验接口专项轮，先记录 quiz.wrongs 字段规范）。

> 取舍依据：双栏试点直接回应上轮"形态靠拢"诉求，以 helm 为样本验证布局可行性并形成模板；Dockerfile/Go 均为可计算可验证主题（构建步骤预测、并发输出预测），延续"迷你引擎"教学形态；测验趋势零成本复用数据；错题本需要 37 个模块统一接口改造，专轮处理。

---

# 第十一轮迭代（Round 11）

## 34. 现状盘点（Round 10 + 极客风之后）
- 39 个模块；双栏 challenge 模板（helm/dockerfile/go）确立；测验成绩趋势上线；全站 Geek 终端风（纯黑 #050507 + 霓虹绿 #00ff41 + 等宽字体）。
- Round 10 Backlog：**错题本**——需先统一各模块测验接口记录 quiz.wrongs（当时定为专项轮）。

## 35. 发散：Round 11 候选
| 候选 | 形态/引擎 | 价值 | 成本 | 风险 |
|------|-----------|------|------|------|
| **测验接口统一（M1 全量）** | 批量给 22 个 M1 模块 finishQuiz 写 quiz.wrongs | 高：错题本地基 | 中 | 中（需脚本批处理，模板一致才可批） |
| **壳层错题本** | #ovWrong 区块聚合各模块错题明细，一键重学 | 高：学习闭环（错题驱动复习） | 中 | 低 |
| **OAuth2/OIDC 模块** | 授权码流程状态机判读器（cs） | 高：热门安全主题，流程可预测 | 中 | 低 |
| **TLS/HTTPS 模块** | 握手流程判读器 + 证书链检查（cs） | 高：面试高频，可预测 | 中 | 低 |
| M2/M3 测验接口兼容 | regex/sql + 15 个老模块逐个接 wrongs | 中 | 高 | 中（结构各异） |

## 36. 收敛：Round 11 实施项
1. **测验接口统一（M1 22 模块批量注入）**：脚本化给全部 M1 模板模块的 renderQuiz 答题处记录错题（答错 push 题索引），finishQuiz 写 `g.quiz.wrongs`；M2/M3 逐个兼容（结构一致的批处理，特殊的至少壳层容错）。
2. **壳层错题本 `#ovWrong`**：聚合各模块 quiz.wrongs → "模块 × 错题数 × 上次测验时间"清单，错题优先模块置顶，点击卡片直接重学该模块。
3. **OAuth2/OIDC 模块**（`oauth2`，cs，双栏布局）：授权码/隐式/PKCE 流程状态机、token 类型与 scope、刷新令牌、常见攻击防护；9 里程碑。
4. **TLS/HTTPS 模块**（`tls`，cs，双栏布局）：握手流程判读器（TLS1.2/1.3、证书链、SNI）、对称/非对称混合加密、常见风险（中间人/证书过期）；9 里程碑。
5. 总数 39 → 41；README/pack/courses 同步。

> 取舍依据：错题本是 Round 9 起连续三轮的 Backlog，M1 模板自 Round 1 起保持一致（IIFE + quizData/renderQuiz/finishQuiz），具备脚本批处理条件，本轮必须兑现；OAuth2/TLS 是安全方向两大高频主题，且均可用"流程/握手状态机"可预测引擎落地，延续双栏模板；M3 老模块测验接口逐个改造成本高，先保证壳层容错 + M1 全覆盖。

## 37. Round 11 执行记录（已完成并推送 `9c057c3`）
- **测验接口统一**：node eval 批处理对 22 个 M1 模块三处注入——声明 `var quizWrongs = []`、答错分支 `quizWrongs.push(qi)`、`finishQuiz` 写 `g.quiz = { score, total, wrongs: quizWrongs }`；jsdom 验证 k8s/go/helm 全对 wrongs=[]、一错 wrongs=[1]。
- **壳层错题本 `#ovWrong`**：CSS grid + HTML + JS `renderWrongBook(store)`（聚合 cards 各模块 quiz.wrongs，按错题数降序，点击卡片 href 直达重学）。修复 1 个真实缺陷：卡片标题选择器实为 `.card h3`（非 `.card-title`），quiz 趋势与错题本两处受益。smoke11-wrongbook.js 6/6。
- **OAuth2/OIDC 模块**（oauth2，cs，双栏）：9 里程碑 + 8 题测验 + 流程预测器（stageInput/stageBtn/stageOut 状态机判读），quiz.wrongs 原生支持。
- **TLS/HTTPS 模块**（tls，cs，双栏）：9 里程碑 + 8 题测验 + 握手预测器（hsInput/hsBtn/hsOut，TLS1.2/1.3 双路径 + 常见失败点），quiz.wrongs 原生支持。
- **注册与同步**：pack KEYS +oauth2/+tls（41 模块）、courses.js +2 条（41 课程）、README 模块表/统计/错题本特性行更新。
- **验证**：smoke11.js 全量 14/14（41 卡片、错题本 2 条、趋势显示、oauth2/tls 各 10 step/8 双栏/7 选择里程碑/测验 8/8 wrongs=[]、regex 老模块渲染兼容）；chromium 采样 oauth2 页确认纯黑底 (#050507) + 右栏 (#0d0d12) + 双栏布局 + 霓虹绿强调。
- 提交 `9c057c3` 推送 main 成功，HEAD == origin/main。

---

# 第十二轮迭代（Round 12）

## 38. 现状盘点（Round 11 之后）
- 41 个模块（devops 12 / cs 16 / automation 4 / tools 9）；错题本 `#ovWrong` 上线（quiz.wrongs 统一接口，M1 22 模块全覆盖）。
- 双栏 challenge 模板 + Geek 终端风（纯黑 + 霓虹绿 + 等宽）锁定；每轮 smoke + chromium 验证后推送。
- 学习闭环现状：测验 → 记录错题 → 错题本聚合 → 一键重学（跳转模块）。**缺口**：进入模块后错题不会优先呈现，用户需手动重做全部 8 题；尚无 API 传输/查询主题（grpc/graphql 空缺）。

## 39. 发散：Round 12 候选
| 候选 | 形态/引擎 | 价值 | 成本 | 风险 |
|------|-----------|------|------|------|
| **错题优先重做** | M1 22 模块 renderQuiz 前置重排：有 quiz.wrongs 时错题题序提前并标注 | 高：直接补学习闭环缺口 | 低（模板一致可批处理） | 低 |
| **gRPC 模块** | 迷你调用链预测器：protobuf、四种方法类型、拦截器顺序、错误码重试（cs 双栏） | 高：微服务/面试高频 | 中 | 低 |
| **GraphQL 模块** | 迷你 resolver 预测器：类型系统、resolver 树、N+1、DataLoader、mutation（cs 双栏） | 高：现代 API 热门 | 中 | 低 |
| CDN 模块 | 缓存判读器：Cache-Control/ETag/回源/purge（devops） | 中高 | 中 | 低 |
| 学习时长统计 | 壳层 session 计时与图表 | 中 | 中 | 中（语义模糊） |
| 间隔复习排期 | 错题本按 1/3/7 天调度 | 中 | 中 | 中（无后台任务） |

## 40. 收敛：Round 12 实施项
1. **错题优先重做（M1 22 模块批量注入）**：renderQuiz 开头读取 `il_progress[MODULE_KEY].quiz.wrongs`，若存在则把错题题序提前（降序 splice/unshift 防索引错乱），重新测验后 wrongs 更新为新错题——形成"错题 → 重做 → 收敛"闭环；新模块（grpc/graphql）原生带该逻辑。
2. **gRPC 模块**（`grpc`，cs，双栏布局）：HTTP/2 + protobuf + 四种方法类型 + 拦截器 + 错误码/重试 + 连接管理；迷你调用链预测器（输入方法类型与故障场景 → 预测调用行为）；9 里程碑。
3. **GraphQL 模块**（`graphql`，cs，双栏布局）：schema/类型系统/查询参数/resolver 树/N+1 与 DataLoader/mutation/生产实践；迷你 resolver 预测器（输入查询字段 → 预测 resolver 调用次数与顺序）；9 里程碑。
4. 总数 41 → 43；pack/courses/README 同步；错题本 UI 提示"错题优先重做"。

> 取舍依据：错题优先重做成本极低（模板一致）且直接完成学习闭环，本轮必做；gRPC/GraphQL 补全"现代 API"主题带（REST 尚无专门模块，但 grpc/graphql 引擎性更强），均可用状态机/调用树预测落地；CDN 与间隔复习留待后续轮次。

## 41. Round 12 执行记录（已完成并推送 `19f1f55`）
- **错题优先重做（M1 22 模块）**：renderQuiz 前置逻辑——存在 `il_progress[key].quiz.wrongs` 时，把错题题序提前（降序 splice 取出 + concat 前置，保持错题原相对顺序）；重做后 wrongs 收敛为新错题。注入采用**字符串级锚点替换**（JSON 转义形式，不改格式）：此前 JSON.stringify 重写会把 `\n` 转义破坏导致 22 模块全语法错误，回滚改字符串级注入成功（每模块仅 1 行 diff）。jsdom 验证错题 [1,2] 排至 Q1/Q2、全对后 wrongs=[]、无错题不重排。
- **错题本 UI**：条目新增上次成绩徽标 `score/total`，提示行"进入模块后错题优先重做"。
- **gRPC 模块**（grpc，cs，双栏）：9 里程碑 + 8 题测验 + 调用链预测器（rpcInput/rpcBtn/rpcOut：实时推送→server-streaming、分片上传→client-streaming、视频会议→bidi、Unavailable 退避重试），quiz.wrongs + wrongs-first 原生。
- **GraphQL 模块**（graphql，cs，双栏）：9 里程碑 + 8 题测验 + resolver 预测器（resInput/resBtn/resOut：单用户详情、N 用户帖子→N+1 修复、嵌套评论、分页），quiz.wrongs + wrongs-first 原生。
- **注册与同步**：pack KEYS +grpc/+graphql（43 模块）、courses.js +2 条（43 课程）、README 模块表/统计/错题本特性更新。
- **验证**：smoke12.js 全量 20/20（43 卡片、错题本徽标/提示、grpc/graphql 各 10 step/8 双栏/错题优先重排/7 选择里程碑/测验 8/8 wrongs 收敛、regex 老模块兼容）；chromium 采样确认纯黑底 + 霓虹绿 + 双栏。
- 提交 `19f1f55` 推送 main 成功，HEAD == origin/main。

# 第十三轮迭代（Round 13）

## 42. 现状盘点（Round 12 之后）
- 43 个模块（devops 12 / cs 18 / automation 4 / tools 9），全部走 `src/<key>-interactive.html → tools/pack-modules.py → modules/<key>.js` 单向构建，`verify-pack.js` 在 CI `check` job 把关。
- 错题闭环：测验 → `quiz.wrongs` → 错题本聚合 → 错题优先重做。但**错题优先重做从未真正生效过**（见 43）。
- 壳层与模块共享同一个 document：`modules/<key>.js` 里的 `js` 字段被当作**普通 `<script>` 追加进 SPA**，也就是 45 个模块的顶层 `var/function` 全部落在同一个全局作用域。
- 进度协议只有 `il_progress[key] = {steps[], quiz{score,total,wrongs}, last, done}`，没有"运行时资源"概念——模块内 `setTimeout`/监听器切走后照旧存活。

## 43. 发散：Round 13 候选（本轮以"体检"为主，先找真 bug 再加功能）
| 候选 | 价值 | 成本 | 风险 |
|------|------|------|------|
| **错题优先重做失效根因** | 极高：Round 12 的招牌特性是空的 | 低 | 低 |
| **全局作用域污染** | 极高：模块间顶层同名声明互相覆盖，跨模块导航静默报错 | 中（打包器改造） | 中 |
| **模块运行时资源回收** | 高：泄漏定时器改 DOM 导致下一页 `Cannot set properties of null` | 中 | 中 |
| 共享运行时 `ilquiz.js` | 高：把"迷你引擎 + 测验"从每模块复制改为一份可复用实现 | 中 | 中 |
| CDN / CSS 布局两个新模块 | 中高：补 CDN 主题、把布局计算做成引擎 | 中 | 低 |
| `.card h3` 选择器 | 中：错题本/趋势显示 key 而非标题 | 极低 | 低 |
| 测验选项位置偏置 | 中：答案集中在同一位置可被"蒙对" | 低 | 低 |
| README 模块表与 courses.js 漂移 | 中：文档重复/错分类 | 低 | 低 |
| 间隔复习排期、学习时长统计 | 中 | 中高 | 中（语义模糊，继续搁置） |

## 44. 收敛：Round 13 实施项
1. **修复错题优先重做**：`reorderWrong()` 读的是 `saved.wrongs`，协议实际是 `saved.quiz.wrongs`——恒不触发。修后发现更深一层：wrongs 存的是**重排后的展示下标**，题序一变错题身份就漂移；统一改为存**原始题库下标 `oi`**。
2. **打包期作用域隔离**：`pack-modules.py` 对未包 IIFE 的模块自动 `(function(){ … })()` 包裹，并只把内联 `on*` 处理函数引用的自有名字挂回 `window`（HTML 内联属性在全局作用域编译，必须可见）；`unpack-modules.js` 对称还原，保证 round-trip 干净。
3. **壳层运行时回收**：epoch 计数 + 包裹 `setTimeout`/`setInterval`/`requestAnimationFrame` + 追踪 `window`/`document` 监听器，切模块时 `releaseModule()` 清掉上一页的定时器、帧回调与监听器。
4. **共享运行时 `ilquiz.js` + 题库 `ilquizzes.js`**：`IL.touch`/`IL.mount`/`IL.quiz`（带 `if (global.IL) return;` 幂等锁，打包时按 `/* ilquiz:inlined */` 内联进各模块）；无自建测验的早期模块由壳层 `attachQuiz(key)` 在页尾挂载题库测验，复用同一 `quiz.wrongs` 协议。
5. **新增 2 模块**：`cdn`（devops，迷你缓存判读器）、`css-layout`（tools，迷你布局计算引擎），均为 `IL.quiz` 原生用户。
6. 卫生项：`.card h3` 选择器、`.il-quiz-append` 缺失样式、`ilquizzes.js` 选项位置轮换消偏置、README 模块表改为**由 courses.js 生成**。

> 取舍依据：本轮不堆功能——先让已有承诺兑现（错题优先重做、模块隔离），因为这两个属于"用户以为有、实际没有"的静默失效；新模块只挑引擎化程度最高、且能直接当 `IL.quiz` 首个真实用户的两个。

## 45. Round 13 执行记录（已完成并推送）
- **错题优先重做**：`ilquiz.js` 的 `reorderWrong()` 返回 `[{item, oi}]`，错题按原始下标前置且保持相对顺序；`quiz()` 用 `prevWrong.indexOf(row.oi)` 打"错题重做"标，答错 push `rows[qi].oi`。26 个仍用内联测验的老模块同步改造（`item._oi = oi` + `quizWrongs.push(..._oi)`），并把 Round 12 那段读 `saved.wrongs` 的死代码替换掉。`go` 模块实测：wrongs `[1,4]` → 呈现为 Q1/Q2，其余保持相对顺序。
- **作用域隔离**：`isolate_scope()` + `SCOPE_MARK`/`ON_ATTR_RE`/`CALL_ROOT_RE`；`is_already_iife()` 允许 unpack→pack 往返。**13 个模块**被包裹（cf-workers、cs、docker、gh-actions、makefile、n8n、net、plc、sql、vfd、vscode、web、yaml），其余 32 个本就是 IIFE。导出名单做了内置名排除（`stopPropagation`/`toggle`/`scrollTo`/`event` 等不覆盖全局）。
- **发现并修复的真 bug（smoke13 逐个定位）**：① `Identifier 'quizData' has already been declared`（gh-actions/makefile/net/vscode/yaml）与 `revealEls`（cf-workers）——隔离后消失；② `cf-workers` 自 Round 1 起就是死的：非 async 函数里用 `await`（改 `async function runLevel1`）+ `onclick="toggleComplete(...)"` 指向不存在的函数（补实现）；③ `Cannot set properties of null`（6 次，`pid` 的 300ms 定时器越过页面生命周期）——壳层 epoch 回收解决；④ 错题本/趋势显示 key 而非标题——`card.querySelector('.card h3')` 在卡片元素内部恒为 null，改 `querySelector('h3')`（Round 11 曾声称修过，其实只改了类名）；⑤ 壳层挂载的测验区块无样式——补 `.il-quiz-append` 三条规则；⑥ `ilquizzes.js` 答案位置偏置（A/B/C/D = 7/8/7/18，`plc` 是 1/1/0/6）——按题库轮换为**每个 bank 2/2/2/2、总计 10/10/10/10**，题干/解析/选项集合/正确项文本逐题比对不变。
- **共享运行时**：`ilquiz.js` 236 行、`ilquizzes.js` 5 bank / 40 题（cf-workers、web、yaml、pid、plc）；壳层 `index.html` 全局加载 `ilquiz.js`；`IL.quiz` 当前原生用户 `cdn` + `css-layout`。
  > **订正（Round 14 复查）**：本条原写「45 个模块全部内联运行时」，是错的。测量用了 `grep -c 'ilquiz:inlined' modules/*.js | wc -l`——`grep -c` 对每个文件都输出一行（包括 `0`），`wc -l` 数到的是文件数而不是命中数。真实情况：**只有 14 个模块内联了运行时**（即 src 里写了运行时引用的那 14 个），其余 31 个不引用它、只在壳层里靠全局加载使用 `IL.*`。因此独立打开 `src/` 页面时，那 31 个模块没有 `window.IL`（实测 `go`、`cf-workers` 为 undefined）；它们本来也不调用 `IL.*`，所以不报错，但这正是 Round 14 的垫片必须写成 `if (window.IL && IL.order)` 防御式调用的原因。
- **新模块**：`cdn`（devops，9 里程碑 + 迷你缓存判读器：MISS/HIT/回源、Cache-Control、Vary、ETag、purge、击穿防护）；`css-layout`（tools，9 里程碑 + 盒模型/flex/grid 轨道计算，实测 `width 300 padding 20 border 5 → 350`、flex `600 / 100,100,100 / 1,2,1 → 175,250,175`）。`css-layout` 补 `✓ 下一步` 区块、`cdn` 的判读器挪到 `9 掌握度测验` 之前，两者与 `tls`/`oauth2` 一样是"8 编号里程碑 + 测验 + 下一步"。
- **注册与同步**：pack KEYS 43 → **45 模块**、courses.js **45 课程**（devops 13 / cs 18 / automation 4 / tools 10）、README 模块表改由 `courses.js` 生成（顺带修掉 terraform/nginx/systemd 重复行与 go/oauth2/tls/grpc/graphql 错分类）、目录树与贡献流程补 `pack-modules.py` / `verify-pack.js` 及两条打包约定。
- **验证**：smoke13.js 全量 **46/46**（含 [6b] 19 次连续跨模块导航 + "内部变量不外泄" + "内联处理函数名仍全局可见"、[6c] `pid → regex` 与方向键切换、[6] 错题优先重做真实流程——注意 `page.goto()` 到相同 hash 是 no-op，必须先回 `#/`）；45 个壳层模块与 45 个 `src/` 独立页零 `pageerror`；`verify-pack.js` → `OK: 45 modules round-trip src/ -> modules/ with identical content`。
- **遗留**：M2/M3 的内联测验（regex/sql/n8n）尚未迁到 `IL.*`；16 个模块没有自建打分测验（其中仅 5 个拿到壳层题库）；间隔复习与学习时长统计仍搁置。

# 第十四轮迭代（Round 14）

## 46. 现状盘点（Round 13 之后）
- 45 个模块，壳层与 `src/` 独立页双形态可用；作用域隔离 + 运行时回收 + `IL.*` 共享运行时已就位。
- 错题闭环看似完整，实际只覆盖一部分：**只有 28/45 个模块的测验会写 `quiz.wrongs`**。剩下 17 个里，5 个由壳层 `ilquizzes.js` 题库挂载补齐，**12 个模块自带测验 UI 却只落 `{score,total}`、不落 wrongs**。
- 后果是连锁的：这 12 个模块不进错题本、没有错题优先重做、不进测验成绩趋势；其中 8 个（cs/docker/gh-actions/makefile/net/vfd/n8n/vscode）**连 `il_progress` 都不写**，因此在连续学习、热力图、到期复习里也是隐形的。
- `showDueReview()` 的排序方向与注释相反（升序 = 推最近看过的那个）。

## 47. 发散：Round 14 候选
| 候选 | 价值 | 成本 | 风险 |
|------|------|------|------|
| **12 模块接入 wrongs 协议** | 极高：错题本/趋势对全库才真正成立 | 中 | 中（12 套判分代码各不相同） |
| 到期复习排序修正 | 高：面板语义反了 | 极低 | 低 |
| 把这 12 个模块的测验 UI 全量重写成 `IL.quiz` | 中：最彻底 | 极高 | 高（丢各模块配色与讲解风格） |
| 新增模块 / 新主题 | 中 | 中 | 低 |
| vfd 故障挑战题（答案写死在 HTML onclick）纳入错题协议 | 低 | 高 | 高（需要给卡片造题库下标） |
| regex/sql 题目从 HTML 迁到 JS 题库 | 中 | 中高 | 中 |

## 48. 收敛：Round 14 实施项
1. **不动 UI，只补协议**：给共享运行时加两个垫片——`IL.order(key, quizData)`（就地重排 + 打 `_oi`/`_re` 标记）与 `IL.record(key, score, total, wrongs)`（落盘）。模块侧改动稳定为三处：渲染前 `IL.order`、答错分支 `push(原始下标)`、交卷处 `IL.record`。
2. **`IL.orderDom(key, cards, labelSel)`** 专门伺候 `regex`/`sql`：题写死在 HTML、答案在独立 `ANSWERS[]`、事件按卡片位置绑定，因此返回 `perm`（呈现位置 → 原始下标）让模块**用同一张表重排 ANSWERS**，否则重排后判分会错配。
3. 到期复习排序改为降序。
4. 覆盖核算：45 个模块全部具备判分测验（40 模块自带 + 5 壳层挂载）。

> 取舍依据：这 12 套测验 UI 是 12 种交互形态（一次一题带进度点 / 平铺 radio / 平铺按钮 / 提交时统一判分 / HTML onclick 硬编码），重写等于重做 12 个模块的测验章节，且会丢掉各自的讲解文案与配色；而它们缺的只是"把错题下标存下来"这一件事。垫片方案让每个模块的 diff 收敛到 3–6 行。vfd 的故障挑战题答案直接写在 `onclick="checkAnswer(this,true,'faultB')"` 里，没有题库下标可言，判分回调 `updateQuizScore` 还是空实现——本轮明确不做，只接它的自测题。

## 49. Round 14 执行记录（已完成并推送）
- **运行时**：`IL.order` / `IL.orderDom` / `IL.record` 三个新出口。`IL.order` 刻意**就地重排**而非返回新数组——一半模块把题库声明成 `const`，`quizData = IL.order(...)` 会直接抛 TypeError。
- **就地重排的代价（自查出来的坑）**：数组被就地改过之后，第二次调用的"当前位置"已不是"原始下标"。于是 `reorderWrong()` 改为复用已有的 `item._oi` 标记；否则 `bash`/`git` 这类"模块内多次调用 renderQuiz"的路径会重新踩上 Round 13 刚修掉的错题身份漂移。
- **12 个模块接入**：`bash`/`git`（`right`/`expl` + MODULE_KEY + 已有手写落盘，垫进 wrongs 即可）；`cs`/`docker`（`ans`/`explain`、一次一题、原本零落盘）；`gh-actions`/`net`/`n8n`/`vscode`/`vfd`（平铺按钮即时判分，其中 `n8n` 挂在 `QUIZ.questions`、`vscode` 挂在 `QUIZ_DATA` 的 `answer` 键、`vfd` 只接自测题）；`makefile`（`correct` 键 + 提交时判分，"未作答"同样记为错题）；`regex`/`sql`（`IL.orderDom` + ANSWERS 重排）。
- **到期复习方向修正**：`due.sort` 由升序改为降序。改前面板永远推"昨天刚看过"的模块，改后才推最久未复习的。
- **本轮自己制造又自己抓到的两个缺陷**（记录以免日后误判）：① 注入脚本把 `regex` 的 `<script>` 开标签当成锚点吃掉了，模块内联脚本静默不执行，测验点了没反应——独立页与壳页表现一致地"死"，靠对比 `git show HEAD:` 版本定位；② `sql` 的 `var KEY` 声明在测验代码之后（提升后此刻是 undefined），垫片初版拿它当 key 会写到 `undefined` 条目，改为字面量 `'sql'`。
- **测试自身的坑**：统计"错题重做"角标时数了 `moduleRoot.textContent`，把模块 `<script>` 源码里的字符串也数了进去（虚高 4~5 个）；改为限定到测验容器。一次一题型（`cs`/`docker`）同一时刻只渲染一题，角标恒为 1，断言按形态分支。`page.evaluate` 只接一个参数，Node 侧数组要显式取用；`MODS` 是 Node 变量，不能直接在浏览器里引用。
- **验证**：新增 `smoke14.js` **77/77** —— 12 个模块 × {可答完、quiz 落盘、wrongs 唯一且在范围内、错题数与失题数吻合、重进后角标数吻合}，`regex` 的三轮全链路（原始下标正确 → 卡片重排且判分跟随原答案 → 全对后 wrongs 清空），壳层错题本一次列出 12 个模块且显示标题、成绩趋势与到期复习覆盖到它们，最后 45 卡片 / 45 模块挂载 / 零 pageerror。Round 13 的 `smoke13.js` 回归 **46/46**（`reorderWrong` 改动同时影响 `IL.quiz` 路径，必须一起跑）；45 个 `src/` 独立页零 pageerror；`verify-pack` → `OK: 45 modules round-trip src/ -> modules/ with identical content`。
- **遗留**：vfd 故障挑战题仍无错题协议（答案在 HTML onclick 内、`updateQuizScore` 为空实现）；`regex`/`sql` 的题目本体仍写死在 HTML（垫片可用，但题库不可复用）；`cs`/`docker`/`gh-actions`/`makefile`/`net`/`n8n`/`vscode` 已写 `il_progress` 但没有里程碑体系，进度条仍为空。

# 第十五轮迭代（Round 15）

## 50. 现状盘点（Round 14 之后）
- 45 个模块的"进度信号"其实是两套互不相通的协议：**32 个 milestone 型**（`courses.js` 声明 `total: 9`，模块调 `IL.mount` 或在自家落盘函数里写 `steps`）与 **13 个 assess 型**（没有里程碑体系，Round 14 刚让它们开始写 `quiz`）。
- 13 个 assess 型再分两种：**8 个自带题库**（cs / docker / gh-actions / makefile / net / n8n / vfd / vscode，走 `IL.record`）与 **5 个只有壳层挂载题库**（cf-workers / pid / plc / web / yaml，走 `IL.quiz`）。
- 壳层所有"是否完成"的判断都只认 `steps`：`evaluateBadges()` 用 `p.steps.length >= total`，`renderCatBars()` 用 `c.total || 9` 当分母，`showDueReview()` 用 `card.dataset.total || p.steps.length`。三处对 assess 型分别退化成"永远 false"、"分母 9 分子 0"、`total = 0`。
- 于是三个可见后果：**🏁全站通关数学上不可能**（45 个模块里 13 个永远进不了 `doneCount`）；**自动化分类看板对满分学生显示 0 / 36 步 · 0%**（该分类 4 个模块恰好全是 assess 型）；这 13 张卡片的进度条恒为空，永远读作"未开始"。
- 顺带核出两条口径不干净的地方：`quizAvg7` 徽章拿**原始平均分**比 7，而题库长度是 5～12（`makefile` 满分 5 分永远达不到 7，`gh-actions` 12 题蒙对一半就有 6 分）；学习报告写死"平均 x/8"，对 8 个非 8 题模块是假数字。
- 交叉验证过没有漂移：**"声明了 `total` 的 32 个"与"静态能找到写 steps 的 32 个"是同一个集合**（第一版检测正则 `\.steps\s*=\s*steps` 太窄，把 `k8s`/`http`/`sql` 等 30 个误报成缺失，补上 `IL.mount(` / `steps:` 形态后才对齐——统计口径本身要先证伪）。

## 51. 发散：Round 15 候选
| 候选 | 价值 | 成本 | 风险 |
|------|------|------|------|
| **A. 壳层统一"掌握度"派生**：assess 型按测验得分率参与完成判定 | 极高：徽章/看板/复习/报告一次全对 | 中（纯壳层，6 处调用点） | 低（不写存储、不动模块） |
| B. 给 8 个 quiz-only 模块补 9 里程碑体系（`IL.mount`） | 中：让它们也有"步" | 极高 | 高（8 套交互形态各要设计 9 个解锁点） |
| C. 把 5 个壳层挂载模块改成模块内自测题 | 低 | 高 | 中（打包/独立页双份维护） |
| D. 徽章与报告的分数口径归一（得分率） | 高：现在是错的数字 | 低 | 低 |
| E. 到期复习对 assess 型的节奏（7 天 vs 3 天） | 中 | 低 | 低 |
| F. 新增模块 / 间隔复习调度 / 学习时长统计 | 中 | 中 | 低 |

> 取舍依据：B 是"为了让旧模块适应指标，去给它们造指标"——8 个模块的里程碑只能硬凑（它们的章节本来就没有可解锁的交互点），成本极高且做出来的"9 步"没有教学含义。真正错的是壳层的判定口径，不是模块缺功能：一个只有判分测验的模块，"测验得分率 ≥ 75%"就是它的掌握信号，而且 `IL.quiz` 早就把这条线定在 `ceil(total*0.75)` 了，壳层却没有沿用。所以选 A + D + E，把"掌握"这件事在运行时、看板、徽章、报告里收敛成同一条定义。壳层只读不写是关键约束：`steps` 的含义（模块内真解锁的里程碑）不能被壳层改写，`IL.touch` 也继续不写 `steps`/`done`。

## 52. 收敛：Round 15 实施项
1. **一个派生函数、两个入口**：`deriveEntry(key, declared, p)` 是唯一的判定处；卡片走 `derive(card, store)`（读 `data-total`），课程记录走 `deriveCourse(c, store)`（读 `c.total`），两条路共用同一规则，避免卡片和看板又各算一套。
2. **`mastered`**：milestone 型 = `p.done || steps.length >= total`（沿用旧语义）；assess 型 = `score >= ceil(total × 0.75)`，与 `IL.quiz` 的默认 `pass` 同一条线。
3. **`started` 与 `visited` 分开**：`started` = 真解锁过里程碑或真交过卷；`visited` 只表示 `IL.touch` 写过 `last`。只有 `started` 计入"进行中"和分母——否则随手点开一个模块就永远显示在读，随手点开 32 个模块会把顶栏读成"3 / 288 步"。
4. **单位不同的两类不再混进一个数字**：`ovMilestones` 从"里程碑 X / Y 已解锁"改为"里程碑 X / Y 已解锁 · 测验 a / b 个模块达标"。
5. **分类看板改以模块为单位**：每类分母是该类模块数，每个模块贡献 0～1 的掌握度（milestone 看步数比例、assess 看得分率），读数改为 `n / m 掌握 · pct%`。
6. **徽章与报告口径修正**：`quizAvg7` 改用平均得分率比 7/8；报告标题改"已掌握"，新增"仅访问"状态，平均项从 `x/8` 改为百分比，并把判定口径写进报告里。
7. **assess 型卡片有可读状态**：交过卷显示 `测验 6/8 题 · 达标需 6` 或 `✓ 测验达标 · 8/8 题`；只访问过显示"仅访问过 · 完成掌握度测验才算达标"。

## 53. Round 15 执行记录（已完成并推送）
- **改动面**：只有 `index.html`（壳层）+ `README.md` + `courses.js` 字段注释；45 个 `src/` 模块与 `ilquiz.js` 一行未动，`verify-pack` 因此仍应报 identical。
- **复现先证伪**：第一版 repro 手工把 45 个模块都写成 `done:true`，结果"全站通关"点亮、缺陷被测试自己盖住了。改为**只种模块真写得出的字段**（32 个 milestone 给 `steps`+`done`，13 个 assess 只给 `quiz`+`last`）才读出真相：`0 进行中 / 32 已完成 / 13 未开始`、`自动化 0/36 步 · 0%`、🏁全站通关恒灭。
- **另一个自己踩的口径坑**：里程碑分母一开始仍按"全部 milestone 模块"累加，于是"只点开过 1 个模块"的学生读成"里程碑 3 / 288 已解锁"，像落后了 285 步。改成只累计 `started` 的模块后，分母跟着真实学习面走。
- **`derive` 中途暴露的一处结构问题**：初版把分支返回值直接写成两个不同的对象字面量，`touched` 语义在两条路里不一致（milestone 用 `steps||last`、assess 用 `last`），`renderCatBars` 因此会把"只访问过"的模块算进分子。抽成单一 `deriveEntry` 后 `started`/`visited`/`mastered` 只有一个定义处——这也是本轮把 6 个调用点全部改走派生的原因。
- **验证**：新增 `smoke15.js` **33/33**：库形态（45 = 32 milestone + 8 own-quiz + 5 attached-quiz，且 32 个 milestone 模块静态都能找到写 steps 的路径）；壳层挂载测验**在真实浏览器里**确实挂载并落盘 8 题成绩（`attachQuiz` 只在壳层路由时运行，静态 grep 证不了这件事，所以 cf-workers/pid/yaml/web/plc 逐个点开实测）；满分学生 9 枚徽章全亮、`45 已完成 / 0 未开始`、`里程碑 288 / 288 已解锁 · 测验 13 / 13 个模块达标`、`自动化 4 / 4 掌握 · 100%`；及格线在 5/8/10/12 题四种题库上都精确落在 `ceil(total*0.75)`（4/5、6/8、8/10、9/12 掌握，各低一分则一个都不掌握）；只访问不做题不产生假进度（总览面板保持隐藏、零掌握徽章）；5/5 的 5 题满分卷现在能点亮"测验学霸"；复习条对满分的 assess 模块走 7 天口径并标注"已掌握 · 可巩固"；学习报告读作 `已掌握：45（100%）` 与平均得分率百分比。回归 `smoke14.js` **77/77**、`smoke13.js` **46/46**、45 个 `src/` 独立页零 pageerror、45 卡片 / 45 模块挂载 / 零 pageerror。
- **遗留**：assess 型仍没有里程碑体系，`今日目标`只统计 milestone 型解锁的步数（本轮刻意不改它的语义，避免目标数与"达标模块数"混在一条进度里）；vfd 故障挑战题、`regex`/`sql` 题库本体仍在 HTML；`courses.js` 的 `size` 标签与实际文件大小的历史漂移未动。

# 第十六轮迭代（Round 16）

## 54. 现状盘点（Round 15 之后）
- 前五轮都在改"进度这件事算得对不对"，本轮换了个入口去用这个库：**搜索框**。写了一个 Playwright 探针（`/tmp/r16probe2.js`，95 条真实语感的查询）量它的实际表现——`filter()` 只比对 `h3` 与 `.card-desc` 两段 DOM 文本。
- 结果：**15/95 查询零结果**，其中 9 条不是拼错就是站内根本没有该词，另外 6 条是本该命中的：`k8s` / `regex` / `ts` / `sqlidx` / `css-layout` / `DevOps`。前五个是**模块自己的 key**——卡片副标题下面明晃晃印着 `k8s`，搜 `k8s` 却返回"没有找到匹配的课程"。
- `DevOps` 更难看：分类 Pill 就写在搜索框下面，pill 文案正是 `DevOps`，搜它零结果。原因是 `CAT_LABEL` 只用于渲染 badge，从来没进过匹配文本。`网关` / `调试` 同理——模块里真讲了（`net`/`nginx` 有"网关"、`vscode` 有 21 处"调试"），但既不在标题也不在描述里。
- 顺着这个洞去看 `courses.js`，挖出第二类腐烂：**`size` 标签 44/45 条与现实不符**（`vfd` 写 75 KB，`modules/vfd.js` 实际 114 KB；`gh-actions` 写 98 KB，实际 133 KB）。这个数字是手抄的，Round 12～15 每次重打包都在涨，没人回头改注释。
- 根因不是"没人写校验"，是**根本没有任何东西校验 `courses.js`**：`verify-pack.js` 只管 `src/ → modules/` 的字节往返，`size`/`tags`/`total` 这些"人写的元数据"落在所有自动化之外。数据文件没有裁判，就会持续撒谎。
- 交叉核对了一件事以免误判：32 个声明 `total` 的模块与静态能找到写 steps 的模块仍是同一集合（沿用上轮正则），也就是说本轮的搜索缺陷与上轮的掌握度判定无关，纯属壳层搜索自己的问题。

## 55. 发散：Round 16 候选
| 候选 | 价值 | 成本 | 风险 |
|------|------|------|------|
| **A. 搜索文本扩容**：key + 分类中文名 + tags 一起进匹配 | 极高：一次消掉两类已知 miss | 低（壳层单函数） | 低 |
| **B. `tools/check-courses.js`**：给 `courses.js` 配裁判并进 CI | 极高：让 A 的数据可信，且阻止 size 继续烂 | 中 | 低 |
| C. 零结果时给"是不是想找 X"（拼写建议） | 高：95 条里 6 条是拼错，现在只能自己猜 | 中 | 中（模糊匹配容易给假建议） |
| D. 同义词/别名词典（`容器` → docker，`流水线` → CI） | 中 | 高（要人工维护，且没有正确性来源） | 中 |
| E. `size` 改成运行时从 `modules/*.js` 派生，删掉手抄字段 | 高：漂移根除 | 中 | 中（卡片渲染要等 fetch，独立页/`file://` 下拿不到目录列表） |
| F. 搜索打分排序（命中 title 权重高于 desc） | 中 | 中 | 低 |
| G. 分词/拼音搜索（`wangye` → 网关） | 低 | 高 | 中 |

> 取舍依据：A 单独做是**不够**的。给 45 个模块手写 tags 意味着往一个没有裁判的文件里再塞 200 多行"人说的话"——上轮 `size` 已经演示过这类字段怎么腐烂。所以 A 必须和 B 同批落地：B 里最硬的一条规则是"每个 tag 必须真的出现在 `src/<key>-interactive.html` 里"，它把 tag 从"我希望用户这样搜"变成"这个模块确实讲了这个词"。C 选做，但只**建议不改写**：静默模糊匹配会把无关卡片塞进结果，排查成本比零结果更高。D 否掉——别名词典没有正确性来源，只能靠人自觉，正是 B 要消灭的那类字段。E 也否掉：`file://` 下无法枚举目录，为了一个显示用的数字引入异步渲染和失败分支不值；改成 B 校验它、并让 `pack-modules.py` 之后必然重跑校验，漂移就停在 CI 里而不是卡片上。F/G 留给下轮。

## 56. 收敛：Round 16 实施项
1. **`searchBlob(card)`**：`title + desc + dataset.key + CAT_LABEL[cat] + dataset.tags` 拼成一段小写文本并缓存在 `card._sb`；`filter()` 的多关键词 AND 改为对这段文本逐词 `indexOf`。AND 语义不变，只是每词的搜索面变大。
2. **`renderCards()` 导出 `dataset.tags`**：tags 来自 `courses.js`，卡片渲染时写进 dataset，壳层不猜、不维护第二份词表。
3. **别名数据**：45 个模块共 212 个 tag（每个 4～6 个）。清洗规则三条——删掉与 key 同名的标签（`searchBlob` 已含 key，写它是白占额度）、ASCII 标签必须**按词边界**出现、拒绝"学习/课程/入门/基础"这类无区分度词。
4. **`tools/check-courses.js`** 六组校验：key 唯一性与形态；`src/` ↔ `modules/` ↔ `courses.js` **三向存在性**（既查登记了却没文件，也查有文件却没登记）；`size` 与实际字节（±1 KB）；`progress`/`total` 配对且 `total` 必须有写 steps 的路径；tags 数量 3～6、不重复、不与 key 同名、且**逐个在源码中验证**；最后一组反过来守壳层——`index.html` 的 `filter()` 若不再调 `searchBlob()`、或不再导出 `dataset.tags`/`dataset.key`，直接报错。
5. **拼写建议**：零结果时算 Dice 二元组相似度与 OSA 编辑距离的较大者，阈值 0.5，命中就渲染一个"是不是想找「X」"按钮。编辑距离**只在两边都 ≥3 字符时参与**，否则两个两字词换一个字母就有 0.5 分，`网关` 会莫名推出 `网络`。同分时优先词长更接近查询的候选。
6. **点击建议写进 `dataset.key`** 而不是闭包变量：`filter()` 每次输入都重建空态 DOM，共享变量在重渲染后会指向旧卡片。
7. **CI 接入**：`deploy.yml` 的 `check` job 在 `verify-pack.js` 之后加 `check-courses.js`，job 改名 `Check (src ↔ modules ↔ courses.js)`。
8. **`courses.js` 头部文档**补 `tags` 字段说明，并写明 `size` 现在必须等于实际体积、由工具校验。

## 57. Round 16 执行记录（已完成并推送）
- **改动面**：`index.html`（搜索层）+ `courses.js`（45 条 tags + 44 条 size 纠正 + 字段文档）+ 新增 `tools/check-courses.js` + `.github/workflows/deploy.yml`。45 个 `src/` 模块与 `ilquiz.js` 一行未动，`verify-pack` 仍报 45 modules identical。
- **`size` 是"顺手修"还是"真修"**：一开始想把校验做成 ±5 KB 容差放过历史漂移，那样 CI 立刻能绿——但那等于把 44 个谎写进基线。改成 ±1 KB 并全量重抄实际字节，工具从此能挡住"改了模块没改注释"。
- **校验器自己差点是假的**：第 6 组最初用与 `filter()` 相同的逻辑重算 `searchBlob`，于是它永远只能得出"两边一致"，即使 tags 根本没接进渲染。换成守 `index.html` 源码里 `searchBlob(` / `dataset.tags` / `dataset.key` 三处接线是否存在——现在把 `filter()` revert 回只读 `h3` 会让校验失败（`smoke16.js` 第 [2] 组实测了这条负例）。
- **裸 substring 造出的假标签**：`nginx` 的 `SPA` 只是命中了 CSS 里的 `ui-monospace` / `space-between`。加词边界后复验才通过（`SPA` 真出现在正文里，保留），校验器同步采用"ASCII 按词边界、中文退回 substring"的判定。
- **`卷` / `栈` 两个单字标签**：`compose: '卷'`、`algo: '栈'` 能过词边界检查但单字搜索会命中大量无关文本，最终改为 `数据卷` / `栈与队列`（`algo` 原标签是"队列"，与"栈"合并成一个更准的词）。
- **建议按钮的第一版只救回一半拼写**：纯 Dice 对换位拼写失效——`gprc` vs `grpc` 的二元组集合交集为空、直接 0 分，仍然零结果无提示。补 OSA 编辑距离（换位算一次代价）后救回，但 `gprc` 与 `grpc`、`plc` 同为 0.5，会撞车；加"同分优先词长更接近"才稳定指向 gRPC。阈值也从 0.34 收到 0.5，避免 `不存在的课程xyz` 这类乱码拿到假建议。
- **验证**：新增 `smoke16.js` **59/59**——[1] 数据契约（45 条、tags 4～6、无 tag 与 key 同名、size 逐条等于实际字节、校验器 exit 0）；[2] **负例测试**（往临时副本里塞一个站内不存在的 tag「量子计算」、把 size 改回 12 KB、放一个未登记的 `src/ghost-interactive.html`，三类都被 exit 1 挡下；再把 `filter()` 改回只读 `h3`，接线守卫同样报错）；[3] 18 条曾经 miss 的查询全部命中且命中预期模块，`DevOps` 返回整个 devops 书架（13 张），多关键词 AND 仍严格（`css 不存在的词` 零结果）；[4] 5 条拼写错误全部给出正确建议、点击后搜索框填入 key 且只剩那张卡、`不存在的课程xyz` 只给提示不给假建议、连续两次重渲染后建议目标仍指向最新一次（守 dataset 那条）；[5] 清空搜索恢复 45 卡、分类 Pill 计数不变、零 pageerror。
- **95 条查询探针复测**：零结果从 **15 → 7**，单命中 59 → 61。剩下 7 条里 4 条是拼写错误（`gprc`/`redix`/`pormises`/`dckear`，现在都有"是不是想找"兜底），3 条是站内确实没有的概念（`效率`、`工作流引擎` 有建议、`不存在的课程xyz`）。
- **回归**：`smoke15.js` **33/33**、`smoke14.js` **77/77**、`smoke13.js` **46/46**、45 个 `src/` 独立页零 pageerror、`pack-modules.py` + `verify-pack.js` 全绿。
- **遗留**：搜索仍是"包含匹配 + 无排序"，命中 title 和命中 desc 同权，`F. 打分排序` 未做；`size` 改为运行时派生（候选 E）没做，靠 CI 挡住漂移而不是根除手抄；拼音/别名（`wangye` → 网关）未做；`效率` 这类真正的站外概念只能靠"换个关键词"文案兜住。tags 的质量依赖"确实出现在源码里"这条下限，它不保证这个词是模块的**教学重点**——那是需要人工审的，工具只能保证不是凭空捏造。

## 58. 现状盘点（Round 16 之后）
- 前几轮都在改"这个库算得对不对"，本轮换了个完全物理的入口：**用手机读它**。写了一组 Playwright 探针（390×844、hasTouch、`file://` 直开 `index.html`），把七类缺陷当成七个独立问题去量：键盘劫持、壳层 CSS 漏进模块、页面横向溢出、内容被裁、共享测验在壳层里失效、可点目标尺寸、亮色主题破功。
- 前六类的结果基本干净（45 模块横向溢出 0、被 `overflow-x:hidden` 吞掉的不可达内容 0、输入框字号 ≥16px），第七类是一个巨大的坑：**亮色模式下源头对比度失败 285 个簇**（关掉运行时兜底、`route('**/ilcontrast.js', abort)` 后逐元素量合成底色）。
- 一开始把这个数字归因错了。第一轮探针把"簇"统计成 `tag.class + 前景色`，285 是**颜色字符串的种类数**，不是元素数；而 `ratio` 报出的 4.17~4.49 其实是**运行时改完之后**的值——因为没有 abort 掉兜底，量到的是被 `ILContrast` 拉到 AA 线以下的边缘。真实源头比值是 1.00~4.49，最坏的一批是 `1.00`：完全同色。
- 三个真正的根因，每个都是结构性问题而不是"某个模块写错颜色"：
  1. **CSS 变量的替换时机**。`--muted: var(--sk-muted)` 这类别名是在**声明它的那个元素**上解析成具体颜色的，然后以具体颜色往下继承。所以 skin 在 `#moduleRoot` 上覆写 `--sk-*` 做"恒定深色孤岛"时，孤岛里的 `var(--muted)` 早就被换成了亮色值——深底配浅字变成深底配深字。修法是孤岛必须把 `--sk-*` 和**模块自造的别名**一起重声明。
  2. **壳层与共享库的特异度不对称**。`scopeModuleCSS()` 把模块的 `*{…}` 改写成 `#moduleRoot *{…}`（1,0,0），而 `ilquiz.js` 的 `.ilq-opt{padding:9px 12px}` 只有 0,1,0——模块那条通用 reset 直接赢，测验选项被压成 25px 高，手机上点不准。共享库在壳层里不是"上层"，是被打平的那一方。
  3. **SVG 文字在审计和兜底里双双隐形**。`<text>` 用 `fill` 上色，`cs.color` 是从主题继承来的、跟屏幕上看到的颜色没关系；而它的真实底色是同一 `<g>` 里那块 `<rect fill="#hex">`——**属性**，`getComputedStyle().backgroundColor` 永远是 transparent。于是祖先链一路穿出 SVG，量到的是外层主题浅卡，"深底板 + 浅字"被误判成"浅底 + 浅字"。

## 59. 发散：Round 17 候选
| 候选 | 价值 | 成本 | 风险 |
|------|------|------|------|
| **A. 恒定深色孤岛整套换装**（skin 里为 `pre/.code-block/.quiz-q/.clab/#nav`… 重声明 token + 别名） | 极高：一次性解掉 285 簇的绝大部分 | 高（几十个选择器 × 两套别名） | 中（选错家族就把亮色模块改黑） |
| **B. `ilquiz.js` 在壳层注入 `#moduleRoot` 前缀的第二份样式表** | 极高：修测验压平，且修在正确的层 | 中 | 低（独立页不注入，行为不变） |
| **C. `ILContrast` + 审计同时支持 SVG `fill` 与 `<rect>` 底板** | 高：补上唯一还剩下的盲区 | 中 | 中（底板找错会把清楚的图示改糊） |
| **D. `moduleRoot.dataset.mod = key` 逃生阀** | 高：plc/git 这类"模块特例"不再污染全局规则 | 低 | 低 |
| E. 把 `--git`/`--http` 等品牌色统一映射到 `--sk-accent` | 表面很美：一行解决一批"不跟随主题"的颜色 | 极低 | **极高**——已实测翻车 |
| F. 给 `h2 .num` 在壳层统一配前景 | 表面合理：一处修十六个模块的圆章 | 低 | **极高**——已实测翻车 |
| G. 把 285 簇逐条写成 285 条模块源码规则 | 低 | 极高 | 中（可维护性反而更差） |
| H. `tools/check-contrast.js` 进 CI（真浏览器量像素） | 高：把本轮所有成果变成一条可回归的下限 | 中 | 中（CI 装浏览器；本地/CI 算法必须一致） |

> 取舍：A/B/C/D 是同一条主线的四层——"谁在什么条件下赢"。E 和 F 是本轮**自己踩的两个坑**，写在发散里是因为它们的失败比成功更有信息量：E 把 `--git` 指到 accent，git 页 289 个白字圆章瞬间"白压绿"1.00:1——品牌色的职责是识别不是对比度，从此定规"品牌色不进 token 映射"；F 在壳层写 `#moduleRoot h2 .num { color:#fff !important }`，把 16 个模块**本来没有底色**的描边数字也刷成白字，同样是 289 个 1.00:1——配对必须写在有实底的那一侧（模块源码），且需要 `!important` 才压得过壳层的 1,1,0 通用规则。G 否掉：285 簇里绝大多数是同一族选择器的不同颜色值，逐条写等于放弃抽象。H 做，但必须是"能 SKIP 的 CI 步骤"——这个仓库没有 `package.json`，为了一个检查引入依赖清单是把审计的成本转嫁成仓库的复杂度。

## 60. 收敛：Round 17 实施项
1. **孤岛选择器集合**（源码普查得出，逐个验证在模块里确实是硬编码深底）：`pre, .code-block, .code-area, .code-editor, .expr-input(-area), .sandbox-editor, .editor-area, .console(-output), .explorer-code, .clab(-head/-out), .quiz-q, .ch-task, .predict(-box), .eg, #nav, #nav-inner, .nav-links`。每块内容 = 一整套 `--sk-*` 深色 token + 该家族在模块里用到的**全部别名**重声明。
2. **刻意不进孤岛的家族**：`.term`（既是终端也是术语表，误伤）、`.simulator`（只有 plc 硬编码深底，改成 `#moduleRoot[data-mod="plc"] .simulator`）、`.step-nav`、`.lab`、`.exercise`（原本 rgba 色晕，改用 `--sk-tint-08`）。
3. **`ilquiz.js` 的 `scopeToRoot(css)`**：检测到 `#moduleRoot` 存在时，把整份 CSS 按 `{}` 切开、给每条选择器加 `#moduleRoot ` 前缀，注入为 `#ilquiz-css-scoped`；`:root` → `#moduleRoot`、`:root[data-theme="dark"]` → `html[data-theme="dark"] #moduleRoot`，且已含 `#moduleRoot` 的选择器不重复加前缀。独立页走原路径，一行不变。
4. **`ILContrast` 的 SVG 通道**：`svgBackdrop(el)` 在**父级**（可能是 `<svg>` 根，其直接子元素没有 `ownerSVGElement`，不能拿它当判据）用 `getElementsByTagName('*')` 找 rect/circle/path，`path` 与无显式宽高者退回 `getBBox()`，取"锚点被包住且面积最小"的那块，颜色按 **属性 → 计算值** 顺序解析并把 `#hex` 归一成 `rgb()`（下游合成函数只认 `rgb()`）；前景按 `cs.fill` 读、写回也写 `fill`，撤销时按 `data-ilc="fill"` 撤对属性。
5. **半透明底板不能当最终底色**：n8n 概念图的节点底板是 `rect fill="rgba(46,204,113,.15)"`，旧代码直接 `return svgBg`，等于假装它是不透明亮绿——`#2ecc71` 标签被判 1.05:1，运行时把它改成近黑 `rgb(0,76,19)`，**本来清楚的图被兜底改糊**。现在 a<1 的底板只作为最上一层，继续往下层 HTML 祖先合成。
6. **审计与兜底共用同一套合成规则**（写进 `tools/check-contrast.js` 的头注释）：忽略 `background-image`、**不看元素 `opacity`**（淡入中的 `.step` 会让全站文字压向页面底色、比值全线失真）、白色画布打底且最深不透明层替换它。两边算法分叉的代价本轮实测过一次——"审计说 1.11、运行时说 4.62"，谁也修不了。
7. **`tools/check-contrast.js`**：默认模式量 45 模块 × 亮暗双主题的**出厂状态**（兜底生效），失败 > 预算即 exit 1；`--source` 屏蔽 `ilcontrast.js` 并按"路径 + 前景色"聚合源头簇供定位用（仅参考、不作 CI 判据）；`--theme=` / `--keys=` / `--top=` / `--budget=` 分片；找不到 Playwright 或 Chromium 时打印 SKIP 并 exit 0。CI 里临时 `npm init -y` + `npm i --no-save playwright` + `npx playwright install chromium`，装不上就自然退化成 SKIP。
8. **`tools/check-theme.js` 从"一刀切禁字面色"改成三条**：自定义属性声明允许（那是孤岛调色板本身）；选择器含 `html[data-theme=` / `#moduleRoot[data-mod=` 的允许（显式主题/模块配对）；其余真属性写字面色报错。另加**孤岛完整性检查**——凡重定义 `--sk-page` 的块必须覆盖全部"文字系" token，少一个就是深底压深字。
9. **源码侧修的具体缺陷**：git/bash/pid 的 `h2 .num` 配 `color … !important`；58 处 `color:#00ff41` 霓虹绿改 `var(--sk-accent, #00ff41)`（cdn/css-layout/graphql/grpc/oauth2/tls）；`transactions` 的 `td.okc/td.badc`、`web` 的 11 处 inline `color:#6b7280`、plc 的 `#e94560` 按钮与一处**非法 9 位** `fill="#64748b8"`（浏览器静默忽略，等于没上色）、css-layout flex-demo 色块 C 的 `#5f7a66`。`courses.js` 的 `size` 随重打包重新同步 14 条。
10. **`.progress-strip .fill` / `.plabel`**：进度条填充色改指 `--sk-accent`，标签从"被模块规则刷成实心 accent（1.25:1）"改回 `--sk-dim`。

## 61. Round 17 执行记录（已完成并推送）
- **285 → 37 的轨迹**（旧探针：仅 `#moduleRoot`、light 单主题）：孤岛换装前先 1576 → 1414 → **142** 次运行时改写，其中被改成"无彩色（灰）"的从 12 → 11 → **0**；出厂状态双主题全量扫描 **TOTAL 0**。收尾时用仓库里的 `tools/check-contrast.js` 复量：亮色改写 **141**、暗色 **111**，灰化 **0**（暗色那 111 次主要是 `cs:26`、`makefile:14`、`plc:39` 这类语法高亮 span 压在半透明色晕上）。`--source --theme=light` 报 **52 簇**——比 37 多是因为新工具把 `#navView` 和 SVG 底板口径也纳进来了，不是回归。
- **遗留（如实）**：这 37/52 簇由运行时兜底覆盖，源头仍不达标的小尾巴是 plc 的 SVG 尺寸标注（3.1~3.8）、n8n 的 `--accent-2` 紫色（2.81）、git 深色面板上的 chip（2.4~3.3）、`yaml #navLabel` 的 `9 / 9`（2.42）、bash 终端输出 `.dim`（3.32）。它们都是 1~2 个元素的小簇，改法各不相同（SVG 属性 vs token），留待下一轮按 `--source --keys=` 逐模块清。
- **自己制造的两个回归**（都已修，且都写进 README 的约定里）：`--git → var(--sk-accent)` 造成 289 个白章 1.00:1；壳层 `#moduleRoot h2 .num { color:#fff !important }` 造成另一批 289 个 1.00:1。教训是**修对比度不能靠全局覆盖**，凡"看起来一次改十六个模块"的规则都要先看它会不会碰到不需要它的那十四个。
- **审计工具自身也出过假阳性**：第一版 `svgPlate()` 拿 `parentElement.ownerSVGElement` 当判据，`<svg>` 根节点的直接子元素全被漏掉 → git 报 4 处假失败；第二版 `compose()` 把元素 `opacity` 乘进前景，正在淡入的文字被算成压页面底色 → 双主题下多报 13 行假失败，其中 4 行给出"白字压 `rgb(11,107,57)` = 1.00"这种自相矛盾的数（真实是 6.67），一眼就能看出量错了。两处都按兜底算法对齐后归零。**假阳性比漏报更贵**：它会把人引去改本来正确的代码。
- **验证**：`verify-pack` 45 模块字节一致、`check-courses` OK、`check-theme` OK、新增 `check-contrast` 出厂状态 **0 失败**（light/dark 双主题 45 模块）、裁剪探针 0/45、壳层↔模块泄漏探针一致、45 个 `src/` 独立页零 pageerror；`smoke13` **46**、`smoke14` **77**、`smoke15` **33**、`smoke16` **59**、`smoke17` **29/0**（本轮新增：键盘不劫持、无横向溢出、内容不被裁、测验在壳层里正常展开且选项 ≥32px、可点目标仅对**控件**判 32px 下限——正文里的行内链接 20px 是排版不是缺陷）。
- **改动面**：`index.html`（skin：孤岛调色板 + 别名 + 品牌色不映射 + 模块配对逃生阀）、`ilquiz.js`（`scopeToRoot` + `#ilquiz-css-scoped`）、新增 `ilcontrast.js`（SVG fill 通道 + 半透明底板合成）、新增 `tools/check-theme.js` 与 `tools/check-contrast.js`、`.github/workflows/deploy.yml`（两个新 checker 进 CI）、30 个 `src/*.html` 源码修色 + 45 个 `modules/*.js` 重打包、`courses.js` size 同步、README 技术约定新增 5 条。

## 62. 现状盘点（Round 17 之后）

- 上一轮收尾时留下两类明确的账。**账一：37 个源头对比度簇**（`--source` 模式，关掉 `ilcontrast.js` 后量），集中在 plc / n8n / git / yaml / bash 五个模块——它们都被运行时兜底盖住了，出厂审计是 0 失败，但源头比值仍在 2.4~4.5 之间。上一轮把它们列为"留待下一轮按 `--source --keys=` 逐模块清"。
- **账二：smoke17 的触控检查有覆盖 bug**。那版把 tap 段写成"从 `location.hash` 取当前模块名"再跑一次 `evaluate`，于是每轮只量到收尾时恰好打开的那一个模块，其余 44 个模块的控件从来没被扫过——上一轮报的"可点目标仅对控件判 32px 下限、通过"其实是"一个模块通过"。这条不修，触控这一栏的绿灯没有意义。
- 先把复现做实：`node tools/check-contrast.js --source --keys=plc,n8n,git,yaml,bash` 在当前 HEAD 复量出 **37 簇**，与上一轮记录一致（不是漂移）。同时把 tap 探针重写成"遍历 courses.js 全部模块"的版本，第一版按 `#moduleRoot button/input/select/textarea/label/.btn/.chip/.tab/.key` 扫，报出 **25 模块 / 309 个"小控件"**——里面 137 个是 `span.key`，实为 redis / vscode / tmux 的 `<pre>` 语法高亮（`pre .key { color: var(--warn) }`），不是可点目标。**探针虚报会把下一轮引去给代码着色加 padding**，于是收紧成"只认真实可点/可输入元素 + 行内豁免"，得到可信的基线：**12 个模块 47 个 <24px 真控件，11 个模块 125 个落在 24–31px**。
- 另一条不在计划里但必须记录的现状：`git pull` 本轮两次失败（GnuTLS -110 / 443 连接超时），本地 HEAD 已是上一轮成功推送的 `2bf8c61`，`origin/main` 引用与之一致，内容侧无差异，按本地状态继续。

## 63. 发散：Round 18 候选

| 候选 | 价值 | 成本 | 风险 |
|------|------|------|------|
| **A. 清零 37 个源头簇**（按模块逐个把颜色配到源头） | 高：兜底不再是必需的拐杖，暗色那 111 次改写有明确去处 | 中（5 模块 × 多套机制） | 中（改错主题会反向破另一套） |
| **B. SVG 标签改用 `fill="var(--svg-label)"`** | 高：一支属性同时跟随两套主题，替掉"写死一个 hex 赌运气" | 低 | 低（需先证实 Chrome 支持 var() 在呈现属性里） |
| **C. 模块内元素级 token 换装**（把上一轮的孤岛机制下沉到模块源码） | 高：修在源头，且只影响该模块 | 中 | **中高**（写错宿主会波及跟随主题的兄弟节点） |
| **D. 触控地板放 skin**（`min-height` 一组 + checkbox/radio 等尺寸盒） | 高：一次覆盖 46 模块，不必改十几套 CSS | 低 | 中（阈值选错会撑坏排版） |
| E. 逐模块补 padding 到 44px | 表面最"正"：每处都按模块本意改 | 极高（16 套 CSS × 两套主题回归） | **高**——正文行内外链、代码块 `💡`、紧凑 stepper 全被拉高，排版代价远大于收益 |
| F. 触控阈值直接取 32px 做硬判据 | 看似更严 | 低 | **中**——32/44 是厂商建议不是规范线，用它当硬线会把 149 个"能用但不理想"标成失败，等于制造红灯墙 |
| G. 新增第 46 个模块（tmux） | 高：终端复用是这一库明显缺口，且能复用迷你引擎+9 里程碑模式 | 中高 | 低 |
| H. 修监听器回收残留（滚动 spy 的 debounce） | 高：3 个模块稳定抛 `TypeError`，是全库唯一的运行时错误源 | 中 | **中高**（包装 add/remove 会改变模块自摘监听的行为） |

> 取舍：A/B/C 是同一条主线的三层——"颜色到底该写在哪"。B 的前提是先做实验证实 Chrome 允许在 SVG 呈现属性里用 `var()`（写了 `/tmp/svgvar.js` 量过：`fill="var(--x)"` 生效），因此图示标签不再需要在源码里各写一套亮/暗 hex。C 是把上一轮 skin 里的孤岛机制**下沉到模块**：git 的 `.sim-log`、bash 的 `.term-out` 这类硬编码深面板，在模块里直接重声明自己的别名，不再依赖壳层点名。E 否掉的理由和上一轮的 F 一样：一条"看起来一次改十六个模块"的规则会碰到不需要它的那十四个。H 单列，因为它不是本轮计划里的项，是修 tap 时顺带被探针撞出来的真缺陷。

## 64. 收敛：Round 18 实施项

1. **37 簇按机制分五类清零**（诊断由 `/tmp/r18diag.md` 出具，A~E 类各配一种修法）：
   - **A 类 · SVG 标签（n8n 11 处）**：`fill="#8888aa"` → `fill="var(--svg-label)"`，模块内加 `[data-theme="light"]{--svg-label:#5c6674}` / `[data-theme="dark"]{--svg-label:#8888aa}`。诊断给出的"直接改成 #5c6674"被否：亮色 5.82 通过，暗色只剩 3.26，同一支颜色在两套主题下的合格区间不重叠。
   - **B 类 · 模块自造别名指到主题 token（n8n `--accent-2`/`--action`）**：不走 token 映射（上一轮定的规），改为模块内主题配对色板——`[data-theme="light"]{--accent-2:#7b3f9d;--action:#1668a8}`，暗色保留原值。实测紫色 5.6~6.5、蓝色 4.7~5.5。
   - **C 类 · 恒定深色面板的字色（plc 32 处 `#64748b`、git `.sim-log/.file-chip/.ctl-label`、bash `.term-out`）**：plc 整体硬编码深底，直接把 `#64748b` 提到 `#94a3b8`（7.51 vs 4.05）；git/bash 用元素级别名重声明，**只写在那几个真正硬编码深底的元素上**。这里有一次自我纠正：第一版把别名写在共享父级，`.col` / `.term-bar` 用的是 `var(--raise)`（跟随主题），于是亮色下浅字压浅底——别名替换发生在声明元素上，宿主选错就殃及兄弟。
   - **D 类 · 面板内语法高亮（yaml `pre.code`）**：底色是模块写死的 `#1b1d23`，但 `.k` 用 `var(--indigo)`，壳层把它映射成主题强调色（亮色墨绿 `#0b6b39`，压深底 2.71）。改成面板内 `--indigo:#818cf8` 并让 `.k` 直接取字面值（不再依赖会被主题改写的别名），`.c` 注释 `#6a6d77`(3.26) → `#8b8e99`(5.16)。
   - **E 类 · 单点硬编码（yaml `.gotcha strong`、git/bash `.warn strong`）**：`.gotcha` 的米黄底是**半透明蒙层**，跟着面板走（亮 `rgb(228,237,235)`、暗 `rgb(12,32,22)`），一支字色无法两边都过（`#7a5606` 亮 5.57 / 暗 2.55），故按主题分色 `--amber-ink`。git/bash 的 `.warn strong` 用 `var(--bad)`（暗 `#d24d4d` 压深红底 4.24），改取壳层危险前景 token `var(--sk-danger-fg, #ff9db4)`。
2. **触控热区分层策略**：硬地板 **24×24px**（WCAG 2.5.8 AA）+ 建议值 **32px**（WARN）。实现放在 skin 末尾三组规则：通用 `min-height:24px`（button/select/textarea/input/`a[href]`/`[role=button]`）、checkbox/radio 等尺寸盒（`width/height:24px !important` + `flex:none`）、`label:has(input){min-height:32px}`。行内链接天然豁免——`min-height` 对 `display:inline` 无效，正好对上 2.5.8 的 Inline 例外。makefile 的 `div.check-box`（22×22 假复选框）用 `[data-mod="makefile"]` 点名。
3. **探针自身迭代三轮**（v1→v4），每轮都在削虚假信号：`.key/.chip/.pill` 类名当控件 → 语法高亮误报；`label` 全算 → 图注误报；radio/checkbox 全算 → 被 ≥32px label 包裹的热区已够。最终口径写进 `/tmp/tappolicy.js` 与 `/tmp/smoke18.js`。
4. **新增第 46 个模块 tmux**：`src/tmux-interactive.html`（1015 行）+ 打包 `modules/tmux.js`（92 KB），沿用"迷你引擎 + 9 里程碑 + 进度追踪"。⚡ 迷你会话解析器实现 `new-session/-A`、`list-sessions`、`attach/kill/rename/has-session/source-file`，维护 session/window/pane 三级内存树，报真实 tmux 的错误串（`no sessions`、`ambiguous command`）；按键按钮覆盖 `c % " o z d x n p [`；第 9 节由 `IL.quiz` 判分解锁。`courses.js` 登记（cat=tools，9 里程碑），`pack-modules.py` 的 KEYS 增补。
5. **监听器回收补一条链**：`trackListeners()` 在模块执行期间把回调包成"epoch 判活 + 恢复 curEpoch"的包装函数，`releaseModule()` 按包装函数摘除，并记 `modWrap`（原函数 → 包装函数）让模块自摘仍生效。堵的正是 `scroll → setTimeout(showNav, 60)` 这条 debounce：它在事件触发时 `curEpoch === null`，走原生 `setTimeout`，既不记账也不判活，切走后对着已清空的 DOM 写 `textContent`。
6. **两个裁判口径对齐**：`tools/check-courses.js` 的 `size` 判据从 ±1 容差收紧为**精确相等**（容差导致 CI 绿、smoke16 红：yaml 46↔47、plc 83↔84）。smoke13/14/15/16 里写死的 45、44、32、288 全部改成从 `courses.js` 推导，加模块不再需要改 smoke。

## 65. Round 18 执行记录（已完成并推送）

- **37 → 0**：`--source --keys=plc,n8n,git,yaml,bash` 复量 **0 簇 / 0 行**（双主题）。过程中逐次收敛：37 → 7（A/B/C/D 四类落地）→ 1（E 类，仅剩 bash `.warn strong`）→ 0。出厂状态审计维持 **0 失败**（46 模块 × 2 主题）。
- **触控热区**：硬失败 **47 个 / 12 模块 → 0 个 / 0 模块**；24–31px 区间 149→154（原 <24px 的那批被顶到 24–31，符合预期，这栏本来就是 WARN 不是失败）。`smoke18` 断言改为**遍历 46 个模块**，与 r17clip 同一套裁切判据（第一版自造的"超出视口即裁切"误报 makefile/vfd/plc 共 15 处——模块里的表格与 `pre` 本就在 `overflow-x:auto` 容器里，那是可滚动不是丢内容）。
- **运行时错误**：全库扫描 pageerror **3 → 0**（plc / n8n / gh-actions 的 `TypeError: Cannot set properties of null`）。用 HEAD worktree（`git worktree add /tmp/base HEAD`）做对照，确认这 3 个是上一轮就存在的缺陷、本轮修掉，且包装后 spy 与方向键行为与基线**逐模块一致**（`scroll` 读数 `1 / 10 → 4 / 10` 仍动，ArrowRight 生效数 30/32 → 31/33）。
- **新模块 tmux**：壳层内两套主题 0 溢出、测验选项 44px、0 pageerror、`IL.progress` 的 steps 正常增长；独立页 `src/tmux-interactive.html` 也进 46 页零错误普查。
- **元数据**：`courses.js` size 精确同步（n8n 104、git 106、bash 96、plc 84、yaml 47、tmux 92），`check-courses` 46 模块 OK；README 计数 45→46、开发工具 10→11、新增 tmux 行，`deploy.yml` 步骤名同步。
- **闸门固化 `tools/check-tap.js`**：触控判据从"每轮临时探针"升格为仓库内工具，与 `check-contrast.js` 同一套 SKIP 约定（仓库没有 `package.json`，不能为一个检查引入依赖清单），CI 里复用对比度那一步刚装好的 Playwright/Chromium。首跑：硬失败 0、WARN 146、exit 0。判据里写死了两条教训——只认真实可点/可输入元素（不猜类名族），以及豁免口径（行内链接、被 ≥32px label 包裹的 radio/checkbox、图注 label、range/color/hidden、disabled）。它与 `smoke18` 的 WARN 数差 8 个（154 vs 146）是刻意的：探针的选择器里带了 `[onclick]`，闸门不带——`<span onclick>` 本该改写成 `<button>`，给它算"热区"等于默认这种写法可以继续留在库里。
- **打包器与裁判对齐**：`pack-modules.py` 原来用 `os.path.getsize(path) // 1024`（向下取整），而 `check-courses.js` 用 `Math.round(bytes/1024)`（四舍五入）——两个裁判口径不一致时，一个模块的显示体积会比声明大 1 KB 而无人报错。改成 `(bytes + 512) // 1024`，并把 README 里遗留的"±1 KB"描述一并清掉。
- **遗留（如实）**：24–31px 那批热区仍是 WARN（补量折叠面板后为 **181** 个：`git:24`、`bash:15`、`docker:24`、`regex:24`、`gh-actions:28`、`n8n:12` 为主，多为紧凑按钮与行内导航），本轮按"规范硬线 + 建议值分层"定线而未强行拉满，留给后续按模块审美逐个处理；`n8n` 的 `--svg-label` 在暗色仍是 `#8888aa`（5.55，达标但非最优）。
- **踩坑记录**：`div` 冒充复选框（makefile `.check-box`）、`span.key` 是语法高亮不是按键（redis/vscode/tmux）、`label` 有"图注"和"热区"两种职责——**把类名当语义是探针最常见的一类错误**，v1 的 309 个"小控件"里 137 个源于此。另一条：给 checkbox 只写 `min-height` 会得到 `13×18` 的畸形盒（浏览器按 intrinsic size 画），必须给等尺寸 `width/height`，且因 CSS 隔离后模块规则特异度更高（`#moduleRoot .complete-check input[type=checkbox]` = 1,2,1）而需要 `!important`。
- **验证**：`verify-pack` 46 模块字节一致、`check-courses` OK（size 判据已收紧）、`check-theme` OK、`check-contrast` 出厂状态 **0 失败**（46 × 2）、源头模式 **0 簇**、`smoke18` 4/4、`smoke13` 46、`smoke14` 77、`smoke15` 33、`smoke16` 59、`smoke17` 29/0、r17clip 0/46 横溢 + 0/46 裁切、泄漏探针壳层样式一致、46 个独立页 0 pageerror。
- **改动面**：`index.html`（skin 触控地板三组 + `trackListeners` 包装与 `modWrap` 反查）、`src/{plc,n8n,git,bash,yaml}-interactive.html` 源码修色、新增 `src/tmux-interactive.html` + `modules/tmux.js`、6 个 `modules/*.js` 重打包、`tools/pack-modules.py`（KEYS）、`tools/check-courses.js`（size 精确判据）、`courses.js`（tmux 登记 + size 同步）、`.github/workflows/deploy.yml` 与 README 计数/约定。**探针脚本仍不进仓库**（`/tmp/tapall*.js`、`/tmp/tappolicy.js`、`/tmp/smoke18.js`、`/tmp/r18*.js`），与往轮一致；触控普查这一项例外——它已固化成 `tools/check-tap.js` 进仓库并进 CI，因为它守的是 skin 里的地板规则，靠每轮手写探针保不住。

## 66. Round 18 的返工：CI 抓到本地抓不到的东西（已推送 2cce38e 之后）

第一次把 `tools/check-tap.js` 接进 CI，CI 就红了，而本地全绿。这不是 CI 抽风，是三条真缺陷，
而且每一条都说明"只在沙箱里自测"这件事有多不可靠。

**缺陷 1 — 地板本身写错了，只是沙箱的浏览器替我们兜住了。**
`#moduleRoot a[href] { min-height: 24px }` 对 `cs: 访问网站` 那个链接没起作用：它是
`<p>` 的唯一子元素、`display:inline`，而 **CSS 2.1 规定 min-height 不适用于非替换 inline 盒**。
沙箱里 Chrome for Testing 152 宽松地把它应用了（实测 24px，判 WARN），CI 的 Chromium 严格按规范
（实测 17px，判 FAIL）。同一个仓库、同一个元素、两个结论。
修法必须选规范内的那条：`p/div/li > a[href]:only-child { display: inline-block }`——
inline-block 才真的吃得到 min-height，同时保持 shrink-to-fit（实测短链接 42px 宽、长文本仍换行、
`scrollWidth` 仍是 390，不会撑出横向溢出）。
这里我自己写错了一次并当场改掉：原以为 `:only-child` 能精准挑出"块里只有它自己"的链接、
行文里的链接不受影响，实测 **`:only-child` 只看元素子节点、不看文本节点**，所以"回到 [链接]"
这类行文里的链接同样被命中（34 个命中里 33 个是这种）。于是补了 A/B 几何对照
（同一份页面，注入 `display:inline !important` 关掉规则再量一遍）：34 个元素里只有 2 个的
几何有变化，各 1–4px，就是那几条链接自己的行盒被抬到 24px，祖先无一需要横滚。结论是这条
规则可用，但理由要写对——它是"把独立/近似独立的成行链接提为 inline-block"，代价可控，
而不是"只影响独立链接"。
顺带把闸门判据改成**按 display 判而不是按实测像素判**：inline 且无兄弟文本 ⇒ 直接 FAIL。
这样换引擎也不会一边红一边绿（把 skin 那条规则临时注掉，闸门在宽松的 152 上照样报出
`FAIL cs <a> 64x24 display:inline`，证明它抓的是缺陷本身而不是某台机器的读数）。

**缺陷 2 — 闸门自己也在漏测，而且漏得很像"通过"。**
本地 WARN 146、CI WARN 209，差 63 个。查出来是：首版只量"当时可见"的元素，折叠面板 / 未激活
标签页 / `[hidden]` 里的控件全部隐身——`plc` 量到 5/86、`yaml` 9/79、`pid` 22/86，覆盖率不到
10% 却照样打印 OK。跟 smoke17 那个"只测当前模块"的 bug 是同一个形态：**没测到 ≠ 没问题**。
现在两遍量：先按读者方式量可见的，再把量不到元素的祖先链临时揭开（`display:block` /
`visibility:visible` / 去掉 `hidden`）统一补量、量完按原样还原 inline style 值与优先级。
覆盖率 4660/4662（99%+），并新增 `--cover=`（默认 90%）——低于下限直接判失败，别让"隐身"
再伪装成绿灯。WARN 也从 146 变成真实的 181。

**缺陷 3 — CI 的读数顺带纠正了本地的一组虚高。**
CI 报 `gh-actions 30 / pid 10 / jwt 7`，本地是 26/4/2：这些模块的交互藏在 tab 面板里，补量之后
两边终于量到同一批元素。也就是说上一轮"硬失败 47→0、WARN 154"那组数，分母本身就是不完整渲染
状态下的数。

**流程教训**：闸门要**尽早接进 CI**，哪怕当轮还不确定它稳。这一轮如果只把 `check-tap.js` 写进
仓库、本地跑一遍就收工，这三条缺陷会一起留在 main 上，而其中缺陷 1 是"手机上真的点不准"的
真问题。下一轮起：新闸门当轮就进 deploy.yml，并且默认它会在与沙箱不同的浏览器上跑。

**修完之后的 CI 复跑（b459861）留了一条新信息**：闸门在 CI 上真跑而非 SKIP，硬失败 0、
覆盖率 4660/4662 **与沙箱逐字节相同**——说明"测到哪些元素"这件事已经与引擎无关了。
但 WARN 数 CI 259 / 本地 181：24–31px 这一栏量的是"实际换行后行盒有多高"，会随引擎与字体
度量浮动（同一批元素、同样的选择器，落到 24–31 区间的个数不同）。原因没有逐项查证，只记录
现象与结论：WARN 只能当趋势参考，不能当判据——判据是硬失败那一栏，而它两边一致。这也反过来
印证把硬线判据改成"按 display 判"是对的。

## 67. 现状盘点（Round 19 起点）

- **基线**：HEAD `22fa3a6`，五道闸门全绿——`verify-pack` 46 模块字节一致、`check-courses` OK、
  `check-theme` OK、`check-tap` 硬失败 0 / 覆盖率 4660/4662、`check-contrast` 出厂状态双主题 0 失败。
  上一轮结尾写的那句教训是"**没测到 ≠ 没问题**"，而它的下一句必然是：这三道闸门本身有没有也在漏测？
  本轮就干这件事——把裁判当被告再量一遍。
- **对比度闸门的覆盖率从来没被量过**。写探针把"页面上真实存在多少文本元素"与"闸门报了多少个"对齐，
  第一版（`/tmp/r19cov.js`）就给出一个可疑的结果：每个模块 skip/revealed 都是 **339 / 336**，一模一样。
  原因不是巧合，而是探针查的是 `document` 全局——模块页在屏幕上时 `#navView` 是 `hidden` 的，
  那 339 个元素绝大多数是导航页的，与模块无关。**v2（`/tmp/r19cov2.js`）按 `#navView` / `#moduleRoot`
  分口径**才拿到真数：46 个模块页共 **11781** 个文本元素，出厂审计量到 **10886（92.4%）**，补量 768。
  最差的是 **plc 19.3%**（`/tmp` 折叠面板与 `#ex-M*` 梯形图示例）、yaml 74.2%、pid 75.0%、cs 76.2%、
  cf-workers 83.2%、vscode 83.5%。上一轮 tap 闸门是 plc 5/86，本轮对比度闸门是 plc 64/332——同一个形状。
- **`check-contrast.js` 的 COLLECT 里明明写着 `#navView *`，但导航页一次也没被量过**：驱动只在
  `#/m/<key>` 之间跳，导航视图始终是 hidden，`querySelectorAll('#navView *')` 每次回来一批拿不到盒子
  的行。也就是说"导航页 0 失败"这句 README 里的话，含义是"0 次测量"。给它补一次带学习进度的量：
  无进度种子时导航页只有 **323** 个文本元素，按 `courses.js` 造一份确定性进度之后是 **563** 个——
  进度条、掌握徽章、错题本、热力图、测验趋势全是"有进度才渲染"的那一半界面。
- **揭开之后，源头确实还有债**（`--source` 口径）：light 16 行 / dark 8 行，集中在新露面的折叠内容上——
  n8n `.ch-hint` 3.08（提示面板是恒定深色代码底、字用 `--muted`）、vscode `.hint-panel` 4.31/4.21
  （两主题都不达 AA，muted 压在 accent 淡染上）、dockerfile+go `#doneBadge` 3.42（品牌蓝压白底，
  而暗色下同一支蓝是 5.69，合格区间不重叠）、plc `#ex-M0.ladder-coil` 4.47（得电格的 `#e94560` 压 `#3a0a0a`）。
- **静态普查 46 个 `src/` 文件**：唯一真正重复的 id 是 web 的嵌套 `<div id="test-results"><div id="test-results"></div></div>`。
  第一版正则 `id="..."` 把 `data-id="a"` 也当 id，一口气"发现"30 个模块有重复——**虚报比漏报更贵**，
  它会把人引去改本来正确的代码；加 `(?<![-\w])` 之后只剩 web 一处。
- **运行时兜底自己有没有改坏过东西？** 这是本轮唯一没人查过的假设。修完覆盖率之后导航页报出
  `#navView button.pill.active` 4.41（light），而它**源色 5.28 是合格的**——第一次怀疑兜底会倒着改。

## 68. 发散：Round 19 候选

| 候选 | 价值 | 成本 | 风险 |
|------|------|------|------|
| **A. 对比度闸门加两遍量 + 覆盖率硬线**（`--cover=`，默认 90%） | 高：把"0 失败"重新定义为"0 次失败 **且** 量到了 90% 以上" | 中 | 中（揭开后量到的浅底文字会冒出真债） |
| **B. 导航页进审计**（带确定性进度种子） | 高：壳层界面第一次被量像素 | 中（要造一份能渲染出进度 UI 的 store） | 低 |
| **C. 兜底补 reveal 通道**（`observe` 加 `open` + `click/keydown/toggle` 重扫） | 高：读者翻开面板后前景才会被重算，否则闸门补量到的仍是旧色 | 低 | 中（重扫时机要与防抖一致，不能自激） |
| **D. 浏览器里查重复 id**（挂在 check-tap 的遍历上） | 看似最省：遍历已经有了 | 低 | **已实测否掉**：全库报 0 处，而 web 那个缺陷在场——那些 DOM 是点击后才建的 |
| **E. 在源头清掉揭开后暴露的簇** | 高：8 个模块 × 5 处写法，全是本轮"新露面"的债 | 中 | 中（配对错主题会把另一边弄坏） |
| **F. 查兜底的读样式时机** | 高（本轮最重的一项）：怀疑"底线把底线改坏" | 中 | 低（不改行为，只改时序与撤销口径） |
| G. 新增第 47 个模块 | 中 | 中高 | 低 |
| H. 把 `--source` 全库跑一遍取基线 | 中：以前只在 5 个模块上声称"0 簇" | 低 | 低 |

> 取舍：A/B/C 是同一条线——裁判要能证明自己量到了。D 被自己的测量否掉，写法保留在
> `tools/check-courses.js` 的注释里，因为它又是"闸门量不到 = 闸门通过"的一个实例（见 67 节的
> 339/336 探针与这里的 0 处）。G 再往后：连着两轮都在修裁判，本轮至少要有**裁判抓到的缺陷**，
> 但缺陷不是本轮的目标，是本轮的产物。H 顺手做，结果见 70 节——它把上一轮"0 簇"这句
> 听起来像全库的话，还原成"5 个模块的子集"。
> F 的优先级从"审计口径"升到本轮第一，是因为它给出的结论比覆盖率更难受：**兜底会把唯一读得清的颜色改坏**。

## 69. 收敛：Round 19 实施项

1. **`tools/check-contrast.js` 两遍量 + 覆盖率硬线**：`COLLECT(scope)` 按 `#navView` / `#moduleRoot`
   分口径，并把"拿不到盒子"的行**保留**（带 `hidden` 与 `why: display:none / visibility / no-box`），
   否则分母会被偷偷缩小。第一遍按读者方式量，第二遍把第一遍量不到的元素的 `details.open` /
   `[hidden]` / `display:none` / `visibility:hidden` 临时顶掉再补量，按 `path||txt` 做 fresh 去重，
   **补量到的行计入覆盖率分子**（不算分子就等于"揭开"白做）。覆盖率 < `--cover=`（默认 90）直接
   `exit 1`，失败信息沿用上一轮那句：闸门没量到 ≠ 没问题。
2. **导航页单独一趟 + 确定性进度种子**：用 `courses.js` 的 `total` 造一份 `il_progress`
   （按 index 取模决定完成/进行中/未开始、quiz 分数与错题），`addInitScript` 灌进 localStorage，
   再量 `#/`。种子必须确定性，否则同一个库两次跑出不同分母，闸门就成了噪声。
3. **闸门与兜底走同一条交互路径**：审计揭开之后要 `PING` 一次（在 root 上派发冒泡 `click`），
   与 `ilcontrast.js` 新加的事件通道一一对应；等待时间取 `DELAY(120) + SETTLE(620) + transition(.25s)`
   之上（1200ms），否则闸门量到的是兜底**还没重扫**的前景，报出一批假失败（子集首跑 8 行 → 1 行）。
4. **`ilcontrast.js` 补 reveal 通道**：`attributeFilter` 加 `open`（`<details>` 只改这一个属性），
   另挂 `click/keydown/toggle`（capture，`toggle` 不冒泡）到 `reschedule`；`style` 仍然**不能**放进
   `attributeFilter`——`clear()` 自己写 `style`，放进去就是自激循环。
5. **修 F：兜底不能再读过渡中间的样式**（本轮真缺陷）。`applyTheme()` 改完 `data-theme` 立刻跑
   `refreshContrast()`，而此时带 `transition` 的属性还停在过渡起点、祖先底色已经翻新——量到的是
   "旧字 + 新底"。实测 light 启动那一趟读到 `.pill.active` 前景 `rgb(0,255,65)`（暗色 accent）压在
   `rgb(216,247,226)` 上 = 1.19:1，于是兜底钉死 `rgb(0,122,31)`，把作者本来 5.28:1 的颜色改成 4.41:1。
   三处改动：① 新增 `ILContrast.refresh(root)` = `clear → run → SETTLE 再补一遍`，壳层换肤走它；
   ② `clear()` 撤颜色时临时压掉 `transition`、批量强制一次样式结算再恢复——否则紧跟着的 `run()`
   读到的仍是刚被撤掉的那个值（同一个 pill 实测在 `0,122,31 / 0,116,30 / 0,117,30` 之间来回漂，
   每一轮重扫都在给上一轮的输出再"修"一次）；③ `#navView` 也交给 `watch()`（原来只有一次性 `run()`），
   并把 window 上的 scroll 监听改成**所有 watched root 共享一个**，避免导航页加入后每次停止滚动重扫两遍。
6. **在源头清掉本轮新露面的债**（8 个模块）：n8n `.ch-hint` → `var(--code-text)`（与 `.dfl-log` 同族）；
   vscode `.hint-panel` → `var(--text)`、`.sandbox-btn.primary` 的 `color:#fff` → `var(--sk-on-accent, #fff)`
   （暗色实测 1.80:1，正是 README"成对声明前景与底色"那条约定的违例）；plc `.ladder-coil.on`
   `#e94560` → `#ff8fa3`（4.47 → 7.91）；dockerfile/go `.done-badge` 加 `[data-theme="light"]` 配对
   `#0b62c4`，返回导航页那条链接的内联 `color:#198eee` → `var(--sk-accent, #198eee)`（与 cdn 同写法）；
   cs `.flip-back .card-full` → `var(--text)`（4.07，翻面才可见）；pid 三行 `⚠` 图示注记
   `fill="#ef476f"` → `fill="var(--svg-warn)"` + `[data-theme="light"]{--svg-warn:#c2274a}`；
   web 的嵌套重复 id 合成一个节点。
7. **`tools/check-courses.js` 新增 id 唯一性判据（静态）**：模块内 `id=` 不得重复、不得与壳层同名；
   正则必须带 `(?<![-\w])`（`data-id` 会虚报 30 个模块）；注释里写清为什么**不是**浏览器检查（D 的实测结果）。
8. **`--source` 全库基线**：首次 46 模块 × 2 主题跑源头口径，把"0 簇"这句话换成可核对的数（见 70 节）。

## 70. Round 19 执行记录（已完成并推送）

- **覆盖率轨迹**（light，`--keys=plc,n8n,vscode,dockerfile`）：闸门改造前 8 失败 / 78%（78% 是自己
  踩出来的：补量到的行没算进分子，闸门按自己的阈值红了一次）→ 接上交互通道 + `PING` + 1200ms 之后
  **1 失败 / 96.5%** → 修完 `clear()` 的过渡自激之后 **0 失败 / 96.5%**。
  那唯一剩下的 1 条正是 67 节末的怀疑对象：`#navView button.pill.active 11px rgb(0,122,31) bg=222,232,229`，
  而它的源色是 5.28:1——**兜底把兜底的东西改坏了**。
- **全库出厂状态**：`46 模块 + 导航页 × 2 主题`，文本元素 **24690** / 量到 **24434（99.0%）** /
  揭开补量 **1562** / **失败 0**。这是这个库第一次把导航页与"读者自己翻开的内容"一起算进对比度分母。
- **`--source` 全库基线**：**26 簇**，其中 **0 簇来自揭开后才露面的内容**（本轮新露面的已在源头清完）。
  分布：gh-actions 5、permissions 3、makefile 3、web 2、tmux 2、terraform 2、nginx 2、k8s 2、
  redis/pid/cs/css-layout/git/http/algo/oauth2 各 1。这同时把上一轮那句"源头模式 **0 簇**"
  还原成它本来的范围——那是 `--keys=plc,n8n,git,yaml,bash` 五个模块的结论，不是全库的。
- **id 判据的自测**：浏览器版挂在 check-tap 遍历上时全库报 **0 处**，而 web 的缺陷在场（那段 HTML
  是点 `go-test` 才拼出来的）；把判据挪进 `check-courses.js` 静态扫描后，塞回重复 →
  `web: id="test-results" 出现两次（getElementById 只返回第一个，后一个是死节点）`，恢复 → 全绿。
  一个只能抓到"已经修掉的"缺陷的闸门不算闸门，这条自测是判据本身的一部分。
- **闸门**：`verify-pack` 46 模块字节一致、`check-courses` OK（含新增 id 判据）、`check-theme` OK、
  `check-tap` 硬失败 0 / WARN 181 / 覆盖 4660/4662（与上一轮 CI 读数一致，说明 skin 与 ilcontrast
  的本轮改动没动到热区）、`check-contrast` 出厂状态 0 失败（46 模块 + 导航页 × 2 主题，覆盖 99.0%）。
- **遗留（如实）**：
  1. **26 个源头簇**仍由运行时兜底盖着，本轮只清了"新露面"的那批。它们各有不同机制（模块自造别名压半透明
     色晕、`.lab-out`/`.term-input` 这类面板内前景、`--sk-accent` 直接给了描边数字），按 `--source --keys=` 逐模块清。
  2. 181 个 24–31px 热区仍是 WARN（判据不变：硬线才算失败）。
  3. `#navView` 只有 `watch()` 没有 `unwatch()`——它是常驻容器，摘掉反而会在回到导航页时漏扫；写下这条是为了
     别被当成泄漏：它只有一份，且监听器挂在它自己身上。
  4. `check-tap` 与 `check-contrast` 各自把 46 个模块渲染一遍（CI 里两次浏览器遍历）。合并成一次遍历
     能省一半时间，但两个闸门的中止条件不同（颜色 vs 几何），本轮没合，留下一轮判断。
  5. `ILContrast` 头注释里的"45 个模块"是历史数字，本轮改到 46 的只言片语没顺手全查——留给 README 计数校准那一轮。
- **踩坑记录**（本轮四条，都是"裁判自己的口径"类）：
  - **裁判查的容器 ≠ 驱动打开的视图**：`COLLECT` 里有 `#navView`，驱动从来没让导航页可见过。
  - **探针按 class/属性名猜语义**：`id="` 的正则没加 `(?<![-\w])`，`data-id` 让 30 个模块"有病"。
  - **揭开之后要等兜底**：闸门替读者翻开面板，也就得替读者触发那次重扫，否则量到的是过期前景；
    等待时长必须显式大于 `DELAY + SETTLE + transition`，这个数不是猜的，是 8 行假失败换来的。
  - **改颜色要能撤干净、且不能在过渡里读**：`clear()` 之后立刻 `run()` 会把自己刚撤下的值当成作者声明的
    颜色再修一遍——同一个元素每轮漂移一点，看起来"改过了"但一直在改自己的输出。这条比覆盖率更隐蔽，
    因为它不是漏测，是**测了并据此做错了事**。
- **改动面**：`tools/check-contrast.js`（分口径 COLLECT + hidden 保留 + 两遍量 + `PING` + 确定性进度种子 +
  覆盖率硬线 + `--no-reveal` / `--no-nav`）、`ilcontrast.js`（`refresh()`、`clear()` 过渡抑制、`open` +
  交互事件通道、共享 scroll 监听）、`index.html`（换肤走 `refresh()`、`#navView` 交 `watch()`）、
  `src/{web,n8n,vscode,plc,dockerfile,go,cs,pid}-interactive.html` 源码修色与修结构、8 个 `modules/*.js` 重打包、
  `courses.js` size 同步 4 条、`tools/check-courses.js`（id 唯一性判据）、README 技术约定新增/改写 4 条。
  **探针脚本仍不进仓库**（`/tmp/r19cov*.js`、`/tmp/r19runtime*.js`、`/tmp/r19reveal.js`、`/tmp/pill*.js`、
  `/tmp/themestale.js`、`/tmp/rat.js`）；本轮新增的判据（id 唯一性）例外，直接固化进 `tools/check-courses.js`，
  因为它已经在 CI 里，且靠临时探针守不住 web 那种写法。
