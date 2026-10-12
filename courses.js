/* =========================================================
 * 交互式学习库 · 课程数据（数据驱动导航页的唯一数据源）
 * 新增模块：只需在本数组追加一条记录，
 * index.html 会自动渲染卡片、计算分类计数、联动进度。
 * 字段说明：
 *   key      模块标识（对应 modules/<key>.js 数据文件）
 *   cat      分类：devops / cs / automation / tools
 *   title    课程标题
 *   desc     一句话描述
 *   size     文件大小展示（~XX KB）
 *   progress 进度追踪 key（可选，须与模块内 localStorage 的 key 一致）
 *   total    里程碑总数（可选，配合 progress 使用）
 * ========================================================= */
window.IL_COURSES = [
  {
      key: 'cf-workers',
    cat: 'devops',
    title: 'Cloudflare Workers',
    desc: 'Serverless Workers 部署，掌握边缘计算与现代化部署流程',
    size: '45 KB'
  },
  {
      key: 'docker',
    cat: 'devops',
    title: 'Docker 入门：从镜像到容器',
    desc: '理解容器化核心概念，掌握 Dockerfile 编写、镜像构建与容器编排',
    size: '61 KB'
  },
  {
      key: 'k8s',
    cat: 'devops',
    title: 'Kubernetes 交互式学习',
    desc: '迷你 kubectl 模拟器：集群架构、Pod 与标签、Deployment 滚动更新、Service、探针与存储',
    size: '63 KB',
    progress: 'k8s',
    total: 9
  },
  {
      key: 'gh-actions',
    cat: 'devops',
    title: 'GitHub Actions Workflow 互动学习',
    desc: 'CI/CD 流水线、工作流模拟器、矩阵构建与密钥管理的完整实践（含 4 级渐进关卡）',
    size: '98 KB'
  },
  {
      key: 'makefile',
    cat: 'devops',
    title: 'Makefile 从零到实战',
    desc: '构建自动化利器，从规则语法到复杂项目构建的完整学习路径',
    size: '73 KB'
  },
  {
      key: 'cs',
    cat: 'cs',
    title: 'CS 基础工具互动学习',
    desc: '命令行、文件系统与常用开发工具的基础操作与概念认知',
    size: '46 KB'
  },
  {
      key: 'net',
    cat: 'cs',
    title: '网络基础与协议',
    desc: 'TCP/IP、HTTP、DNS 等核心协议的运作原理与网络分层模型',
    size: '55 KB'
  },
  {
      key: 'http',
    cat: 'cs',
    title: 'HTTP 与 API 设计',
    desc: '迷你请求引擎：报文结构、方法语义、状态码、无状态与会话、REST 设计与缓存安全',
    size: '52 KB',
    progress: 'http',
    total: 9
  },
  {
      key: 'n8n',
    cat: 'automation',
    title: 'n8n 工作流自动化',
    desc: '从零理解工作流自动化，掌握节点编排、数据流转与条件逻辑',
    size: '64 KB'
  },
  {
      key: 'pid',
    cat: 'automation',
    title: 'PID 控制系统互动学习',
    desc: '比例-积分-微分控制器原理与实时仿真，专题入口另含三讲视频课件',
    size: '37 KB'
  },
  {
      key: 'vfd',
    cat: 'automation',
    title: '变频器交互式学习',
    desc: '变频驱动器工作原理、参数配置与电机控制实践',
    size: '75 KB'
  },
  {
      key: 'vscode',
    cat: 'tools',
    title: 'VSCode 配置文件学习',
    desc: 'settings.json、快捷键、扩展管理与工作区配置的系统化学习',
    size: '66 KB'
  },
  {
      key: 'yaml',
    cat: 'tools',
    title: 'YAML 标记语言',
    desc: '缩进即结构——掌握容器编排、CI/CD 与云原生配置的核心标记语言',
    size: '37 KB'
  },
  {
      key: 'web',
    cat: 'tools',
    title: '建站全流程仿真学习',
    desc: '从域名注册、DNS 解析、部署到 SSL 配置的完整建站模拟',
    size: '66 KB'
  },
  {
      key: 'git',
    cat: 'tools',
    title: 'Git 版本控制',
    desc: '对象模型、三区流动、提交图模拟、分支合并与团队协作的完整交互式学习',
    size: '64 KB',
    progress: 'git',
    total: 9
  },
  {
      key: 'bash',
    cat: 'tools',
    title: 'Shell 脚本',
    desc: '内置迷你终端：变量、引号、管道、重定向、条件、循环与函数，动手学 Bash',
    size: '57 KB',
    progress: 'bash',
    total: 9
  },
  {
      key: 'plc',
    cat: 'automation',
    title: 'PLC 交互式学习',
    desc: '可编程逻辑控制器原理、梯形图编程与工业自动化仿真模拟',
    size: '71 KB'
  },
  {
      key: 'regex',
    cat: 'tools',
    title: '正则表达式',
    desc: '实时匹配引擎：字符类、量词、分组捕获、锚点边界与实战提取',
    size: '47 KB',
    progress: 'regex',
    total: 9
  },
  {
      key: 'sql',
    cat: 'cs',
    title: 'SQL 查询',
    desc: '迷你查询引擎：SELECT、过滤、排序、聚合分组、JOIN 联表与实战提取',
    size: '63 KB',
    progress: 'sql',
    total: 9
  },
  {
      key: 'redis',
    cat: 'cs',
    title: 'Redis 数据结构',
    desc: '迷你 redis-cli 命令台：String、Hash、List、Set、ZSet、过期与持久化',
    size: '57 KB',
    progress: 'redis',
    total: 9
  },
  {
      key: 'prompt',
    cat: 'tools',
    title: 'AI 提示词工程',
    desc: '提示词评分引擎：四要素、few-shot、思维链、角色约束与反模式识别',
    size: '51 KB',
    progress: 'prompt',
    total: 9
  },
  {
      key: 'terraform',
    cat: 'devops',
    title: 'Terraform 基础设施即代码',
    desc: '迷你 plan/apply/destroy 引擎：HCL 语法、变量、状态、模块化、隐式依赖与生命周期',
    size: '50 KB',
    progress: 'terraform',
    total: 9
  },
  {
      key: 'nginx',
    cat: 'devops',
    title: 'Nginx 配置与运维',
    desc: '迷你 nginx -t 校验器：架构、配置层级、静态文件、虚拟主机、反向代理、重定向与 HTTPS',
    size: '47 KB',
    progress: 'nginx',
    total: 9
  },
  {
      key: 'netsec',
    cat: 'cs',
    title: '网络安全基础',
    desc: '迷你漏洞雷达：识别 XSS、SQL 注入、CSRF、SSRF 等漏洞类型并选择正确修复',
    size: '49 KB',
    progress: 'netsec',
    total: 9
  },
  {
      key: 'async',
    cat: 'cs',
    title: 'JavaScript 异步与事件循环',
    desc: '输出预测器：同步、微任务、宏任务、async/await 的执行顺序预测与即时核对',
    size: '45 KB',
    progress: 'async',
    total: 9
  },
  {
      key: 'ts',
    cat: 'tools',
    title: 'TypeScript 类型系统',
    desc: '迷你判读器：类型标注、推断、interface、联合类型、函数类型、泛型与实用类型',
    size: '42 KB',
    progress: 'ts',
    total: 9
  },
  {
      key: 'permissions',
    cat: 'cs',
    title: 'Linux 文件权限',
    desc: '迷你 chmod 计算器：rwx 符号与数字换算、umask、目录权限、特殊位',
    size: '44 KB',
    progress: 'permissions',
    total: 9
  },
  {
      key: 'compose',
    cat: 'devops',
    title: 'Docker Compose',
    desc: '迷你配置校验器：services、端口映射、命名卷、依赖与健康检查解析校验',
    size: '47 KB',
    progress: 'compose',
    total: 9
  },
  {
      key: 'algo',
    cat: 'cs',
    title: '算法与数据结构基础',
    desc: '迷你复杂度评估器：估 O()、辨结构（栈/队列/哈希/链表/树/图）',
    size: '48 KB',
    progress: 'algo',
    total: 9
  },
  {
      key: 'transactions',
    cat: 'cs',
    title: '数据库事务与隔离级别',
    desc: '迷你判读器：脏读、不可重复读、幻读场景 → 隔离级别，MVCC 与锁',
    size: '46 KB',
    progress: 'transactions',
    total: 9
  },
  {
      key: 'systemd',
    cat: 'devops',
    title: 'Systemd 服务管理',
    desc: '迷你 systemctl 命令台：启停、自启、unit 文件、日志与故障排查',
    size: '49 KB',
    progress: 'systemd',
    total: 9
  },
  {
      key: 'css',
    cat: 'tools',
    title: 'CSS 布局与盒模型',
    desc: '迷你布局预测器：盒模型、选择器优先级、Flexbox/Grid、居中、断点与层叠',
    size: '45 KB',
    progress: 'css',
    total: 9
  },
  {
      key: 'sqlidx',
    cat: 'cs',
    title: 'SQL 索引与 EXPLAIN',
    desc: '迷你判读器：全表扫描、B+ 树、最左前缀、覆盖索引与失效场景',
    size: '43 KB',
    progress: 'sqlidx',
    total: 9
  },
  {
      key: 'rust',
    cat: 'cs',
    title: 'Rust 所有权',
    desc: '迷你 borrow-checker：move/Copy、借用冲突、生命周期与 Option/Result',
    size: '43 KB',
    progress: 'rust',
    total: 9
  },
  {
      key: 'helm',
    cat: 'devops',
    title: 'Helm chart 模板',
    desc: '迷你渲染器：模板表达式、模板函数、values 覆盖、release 生命周期与 hooks',
    size: '44 KB',
    progress: 'helm',
    total: 9
  },
  {
      key: 'prometheus',
    cat: 'devops',
    title: 'Prometheus 监控',
    desc: '迷你 PromQL 查询台：指标类型、rate/increase、sum by、告警规则与可用性',
    size: '44 KB',
    progress: 'prometheus',
    total: 9
  },
  {
      key: 'jwt',
    cat: 'cs',
    title: 'JWT 认证令牌',
    desc: '迷你解码器：三段式、Base64Url、验签、过期判断与常见漏洞防护',
    size: '44 KB',
    progress: 'jwt',
    total: 9
  },
  {
      key: 'dockerfile',
    cat: 'devops',
    title: 'Dockerfile 构建',
    desc: '迷你判读器：指令语义、多阶段构建、层缓存、HEALTHCHECK 与构建步骤预测',
    size: '43 KB',
    progress: 'dockerfile',
    total: 9
  },
  {
      key: 'go',
    cat: 'cs',
    title: 'Go 并发',
    desc: '迷你输出预测器：goroutine、channel、select、WaitGroup、Mutex 与死锁判断',
    size: '42 KB',
    progress: 'go',
    total: 9
  },
  {
      key: 'oauth2',
    cat: 'cs',
    title: 'OAuth2 与 OIDC',
    desc: '迷你流程预测器：授权码、PKCE、scope、token 刷新、state 防 CSRF 与 OIDC 验签',
    size: '45 KB',
    progress: 'oauth2',
    total: 9
  },
  {
      key: 'tls',
    cat: 'cs',
    title: 'TLS 与 HTTPS',
    desc: '迷你握手预测器：证书链、TLS 1.2/1.3 握手、混合加密、HSTS 与攻击防护',
    size: '45 KB',
    progress: 'tls',
    total: 9
  },
  {
      key: 'grpc',
    cat: 'cs',
    title: 'gRPC 与 Protobuf',
    desc: '迷你调用链预测器：HTTP/2、protobuf、四种方法类型、拦截器、错误码与重试',
    size: '45 KB',
    progress: 'grpc',
    total: 9
  },
  {
      key: 'graphql',
    cat: 'cs',
    title: 'GraphQL API',
    desc: '迷你 resolver 预测器：schema、类型系统、查询语法、N+1 与 DataLoader',
    size: '43 KB',
    progress: 'graphql',
    total: 9
  }
];
