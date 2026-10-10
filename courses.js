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
  }
];
