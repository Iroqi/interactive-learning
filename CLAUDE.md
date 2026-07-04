# CLAUDE.md — 交互式学习库维护手册

## 第一性原理

这个项目是一个**纯前端静态知识库**。每个学习专题是一个自包含的单文件 HTML 模块，导航页 `index.html` 是所有模块的入口索引。所有变更归结为两件事：**添加/修改模块** 和 **保持导航页同步**。

## 项目结构

```
.
├── index.html                         ← 导航目录页（唯一需要维护的结构性文件）
├── {topic}-interactive.html           ← 各学习模块（自包含，互不依赖）
├── website-building-interactive.html  ← 建站仿真课程
├── .gitignore
└── .github/workflows/deploy.yml       ← CI/CD 双部署流水线
```

**上下文规则：** 各 `*-interactive.html` 是已完成产物，体积 30KB–1.5MB，**不要加载进上下文**。只在需要修改导航页或添加新模块时读取相关文件。

## 导航页 index.html

### 数据结构

导航页的 card grid 是核心，每张 card 有四个数据属性：

| 属性 | 说明 | 取值 |
|------|------|------|
| `data-cat` | 分类（card 元素上） | `devops` / `cs` / `automation` / `tools` |
| `data-b` | 分类（badge 元素上） | 同上，必须和 `data-cat` 一致 |
| `href` | 相对路径 | 指向对应 HTML 文件名 |
| `card-meta` | 文件大小 | 如 `~64 KB` |

筛选按钮的 `data-cat` 值 + 右侧 count 数字必须与实际 card 数量匹配。顶部 stats 区的"学习专题"总数也必须同步更新。

### 分类体系

- **DevOps** — 容器化、CI/CD、构建工具、部署（Docker, GitHub Actions, Makefile, Cloudflare Workers）
- **CS 基础** — 计算机科学基础概念（网络协议、CS 工具）
- **自动化** — 工作流自动化、工业控制（n8n, PID, 变频器）
- **开发工具** — IDE 配置、建站流程等实用技能

分类可随内容增长扩展，新增分类需在 CSS 中添加对应颜色变量（`--新分类: 色值`）和 badge 样式。

### 添加新模块的完整流程

1. 在仓库根目录创建 `{topic}-interactive.html`（命名约定：小写英文 + 连字符 + `-interactive` 后缀）
2. 打开 `index.html`，在 `<div class="grid" id="grid">` 内追加一张 card，模板：

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

3. 更新筛选按钮 count 和 stats 总数
4. `git add` + `git commit` + `git push origin main` → 自动部署

## 部署

push 到 main 后 GitHub Actions 自动触发：

- **GitHub Pages** → `iroqi.github.io/interactive-learning/`（`actions/deploy-pages@v4`，无需 secret）
- **Cloudflare Pages** → `iroqi.pages.dev`（`wrangler-action@v3`，需 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets）

两个 job 并行独立，任一失败不影响另一个。

## 技术约定

- 所有 HTML 文件 `lang="zh-CN"`，UTF-8 编码
- 中文字体栈：`'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif`
- 模块自包含：CSS 内联、JS 内联、CDN 只引字体
- Git 提交格式：`feat: 描述`（新增）/ `fix: 描述`（修复）/ `chore: 描述`（维护）
- Windows 环境，CRLF 换行（git 会自动转换，无需手动处理）
