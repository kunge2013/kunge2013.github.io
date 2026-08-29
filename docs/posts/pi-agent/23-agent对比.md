# AI 编程 Agent 深度对比：Pi vs Claude Code vs Codex vs DeepSeek vs Harness

> 更新日期：2026-08-29
>
> 本文全面对比 2026 年主流 AI 编程 Agent 的设计理念、核心功能、优缺点与适用场景。

---

## 一、总览对比表

| 维度 | **Pi** | **Claude Code** | **Codex** | **DeepSeek** | **Harness（Agent Harness）** |
|------|--------|----------------|-----------|--------------|------------------------------|
| 开发者 | Mario Zechner（开源） | Anthropic | OpenAI | DeepSeek（深度求索） | 概念 / 方法论（非具体产品） |
| 类型 | 开源终端 Agent | 商业终端 Agent | 商业终端 + 云端 Agent | 模型 + API 服务 | Agent 运行框架（脚手架） |
| 开源 | ✅ MIT 协议 | ❌ 闭源 | ❌ 闭源 | 模型开源，工具链部分开源 | N/A（概念） |
| 默认模型 | BYO（自带 API Key） | Opus 5 / Opus 4.8 | GPT-5.6 Sol / GPT-5.5 | DeepSeek-R1 / V4 Pro | 可接任意模型 |
| Terminal-Bench 2.1 | ~77.6%（依赖模型） | ~89.1%（Opus 5） | ~89.5%（GPT-5.6 Sol） | ~82.7%（V4 Flash 0731） | 取决于具体实现 |
| 定价 | 免费 + API 费用 | $20/月起（Pro 计划） | ChatGPT Pro 包含 / API 按量 | 极低（输入 $0.55/MTok） | N/A |
| 运行环境 | 终端 CLI | 终端 CLI / IDE 扩展 | 终端 CLI / 云端沙箱 / IDE | API / TUI / 第三方集成 | 任意环境 |
| 核心工具数 | 4 个（read/write/edit/bash） | 丰富（含子 Agent、Hooks） | 丰富（含沙箱、持久化） | 依赖第三方 Harness | 自定义 |

---

## 二、各工具详细分析

### 1. Pi — 极简主义 Agent

#### 简介

Pi 是由 Mario Zechner（libGDX 框架作者）创建的**极简开源终端编程 Agent**。它是 OpenClaw 生态的一部分，设计理念是"让你适配 Pi，而不是让 Pi 适配你"。

#### 核心架构

Pi 只内置 **4 个核心工具**：
1. **read** — 读取文件
2. **write** — 创建或覆盖文件
3. **edit** — 编辑现有文件
4. **bash** — 执行 Shell 命令

#### 特色功能

- **极简设计**：没有子 Agent、没有 Plan Mode，专注于一个紧凑的 Agent 循环
- **技能文件（Skill Files）**：通过下载"技能文件"来扩展能力，而非内置插件系统
- **上下文高效**：在相同任务上，Pi 每轮消耗的 token 约为 Claude Code 或 Codex 的 **1/3**
- **完全可定制**：支持自定义扩展、技能、提示模板和主题
- **模型无关**：支持任意 LLM API（Claude、GPT、DeepSeek、本地模型等）

#### 优点

- ✅ **极低资源消耗**：上下文窗口利用效率高
- ✅ **完全开源**：MIT 协议，可自由修改和部署
- ✅ **高度可定制**：通过技能文件灵活扩展
- ✅ **无供应商锁定**：支持任意 LLM 后端
- ✅ **学习价值高**：代码简洁，适合理解 Agent 原理

#### 缺点

- ❌ **功能有限**：没有内置子 Agent、并行任务、持久化工作区
- ❌ **基准分数较低**：Terminal-Bench 2.1 约 77.6%（低于 Claude Code 和 Codex）
- ❌ **社区生态较小**：相比 Claude Code 和 Codex，第三方集成较少
- ❌ **需要技术能力**：需要自己配置 API Key 和技能文件

#### 适用场景

- 追求极简和可控性的开发者
- 需要深度定制 Agent 行为的场景
- 预算有限但有一定技术能力的个人开发者
- 学习和研究 Agent 架构的教育场景

---

### 2. Claude Code — 全功能商业 Agent

#### 简介

Claude Code 是 Anthropic 推出的**官方终端编程 Agent**，基于 Claude 模型家族（Opus/Sonnet/Haiku），提供从终端到 IDE 的全方位编程辅助。

#### 核心架构

- **丰富的工具集**：文件读写、代码搜索、Shell 执行、子 Agent 调度、Web 搜索等
- **Hooks 系统**：支持 PreToolUse、PostToolUse、Stop 等生命周期钩子
- **技能系统（Skills）**：内置和自定义技能，提供领域专业能力
- **CLAUDE.md 配置**：项目级、目录级、用户级多层配置
- **子 Agent 架构**：支持 planner、code-reviewer、tdd-guide 等专业子 Agent

#### 特色功能

- **200K 上下文窗口**：处理大型代码库和长文档
- **扩展思考（Extended Thinking）**：默认启用，支持深度推理
- **多模型支持**：Opus 5（最强推理）、Sonnet（平衡）、Haiku（轻量快速）
- **Team 和 Enterprise 计划**：支持团队协作和企业级安全
- **IDE 集成**：VS Code、JetBrains 扩展

#### 优点

- ✅ **顶级性能**：Terminal-Bench 2.1 达 89.1%（Opus 5）
- ✅ **超长上下文**：200K token 窗口，处理大型项目无压力
- ✅ **强大的推理能力**：Opus 5 在复杂架构决策和调试方面表现出色
- ✅ **完善的生态系统**：丰富的技能、Hooks、子 Agent
- ✅ **企业级支持**：Team/Enterprise 计划，安全合规

#### 缺点

- ❌ **价格较高**：$20/月起（Pro），高使用量下 API 费用可观
- ❌ **Token 消耗大**：每轮对话消耗的 token 比 Pi 多约 3 倍
- ❌ **供应商锁定**：绑定 Anthropic 模型，无法使用其他 LLM
- ❌ **闭源**：无法修改底层 Agent 逻辑

#### 定价

| 计划 | 价格 | 说明 |
|------|------|------|
| Pro | $20/月 | 基础 Claude Code 访问 |
| Max 5x | $100/月 | 更高使用额度 |
| Max 20x | $200/月 | 最高个人额度 |
| Team | $100/座/月 | 团队协作 |
| API | 按 token 计费 | Opus 5: $5/$25 per MTok（输入/输出） |

#### 适用场景

- 需要处理大型代码库的专业开发者
- 复杂架构设计和重构任务
- 长会话、多轮迭代开发
- 企业级团队协作
- 需要最强推理能力的场景

---

### 3. Codex — OpenAI 的全栈 Agent

#### 简介

Codex 是 OpenAI 推出的**全栈编程 Agent**，提供终端 CLI、云端沙箱、IDE 集成等多种使用方式，基于 GPT-5 系列模型。

#### 核心架构

- **双运行模式**：
  - **本地 CLI**：交互式、审批控制的本地工作流
  - **云端沙箱**：并行后台任务，完全隔离的执行环境
- **沙箱安全系统**：细粒度网络访问控制（可限制仅允许包管理器访问）
- **持久化工作区**：`/goal` 命令支持长期项目目标
- **审批策略**：可配置 Agent 自主性级别

#### 特色功能

- **云端沙箱**：安全的隔离环境，支持并行执行多个任务
- **文件系统配置**：灵活的文件访问权限管理
- **Memory 标志位**：支持持久化记忆和上下文
- **GPT-5.6 Sol 模型**：当前 Terminal-Bench 2.1 最高分（89.5%）
- **全栈覆盖**：CLI、IDE、ChatGPT、Computer Use 多种界面

#### 优点

- ✅ **最高基准分数**：Terminal-Bench 2.1 达 89.5%（GPT-5.6 Sol）
- ✅ **云端沙箱**：安全的并行任务执行环境
- ✅ **灵活自主性**：可配置的审批策略，平衡效率与安全
- ✅ **ChatGPT 集成**：Pro 用户直接使用，无需额外配置
- ✅ **异步批处理**：适合大规模代码生成和重构任务

#### 缺点

- ❌ **供应商锁定**：绑定 OpenAI GPT 模型
- ❌ **闭源**：无法修改底层 Agent 逻辑
- ❌ **Token 消耗大**：与 Claude Code 类似，上下文效率不如 Pi
- ❌ **云端依赖**：部分功能依赖 OpenAI 服务器

#### 定价

| 方式 | 价格 | 说明 |
|------|------|------|
| ChatGPT Pro | $200/月 | 包含 Codex 使用 |
| ChatGPT Plus | $20/月 | 有限额度 |
| API | 按 token 计费 | GPT-5.6 Sol: 约 $5/$25 per MTok |

#### 适用场景

- 需要并行处理多个独立任务
- 大规模代码生成和重构
- 需要安全沙箱环境的高风险操作
- ChatGPT Pro 用户的一体化工作流
- 异步批处理任务

---

### 4. DeepSeek — 极致性价比之选

#### 简介

DeepSeek（深度求索）是中国 AI 公司推出的**大模型系列**，以极低的价格提供接近顶级模型的编码能力。主要通过 API 服务，配合第三方 Harness（如 Claude Code、Pi 等）使用。

#### 核心架构

- **MoE 架构**：Mixture-of-Experts，高效推理
- **多种模型**：
  - **DeepSeek-R1**：擅长算法、数学、调试
  - **DeepSeek V4 Pro**：旗舰模型
  - **DeepSeek V4 Flash**：轻量高速
  - **DeepSeek-Coder**：专门优化的代码模型
- **训练数据**：87% 代码 + 13% 自然语言（中英文）

#### 特色功能

- **极低价格**：输入 $0.55/MTok，输出 $2.19/MTok（R1）
- **Flash 模型**：$0.14/$0.28 per MTok，极致性价比
- **中英文双语**：对中文支持优秀
- **开源模型**：部分模型权重开源，可本地部署
- **Terminal-Bench 表现**：V4 Flash 0731 达 82.7%

#### 优点

- ✅ **极低价格**：比 GPT-5 和 Claude 便宜 10-30 倍
- ✅ **开源可自部署**：可本地运行，数据隐私有保障
- ✅ **中文支持优秀**：对中文代码注释和文档理解好
- ✅ **性价比高**：适合预算有限的高频使用场景
- ✅ **模型多样**：从轻量 Flash 到旗舰 Pro，覆盖不同需求

#### 缺点

- ❌ **工具链不完善**：主要依赖第三方 Harness
- ❌ **生态较小**：相比 OpenAI 和 Anthropic，第三方集成较少
- ❌ **推理能力略逊**：在极复杂任务上不如 Opus 5 和 GPT-5.6
- ❌ **国际访问受限**：部分地区访问 API 可能有限制
- ❌ **文档以中文为主**：英文文档相对较少

#### 定价

| 模型 | 输入（/MTok） | 输出（/MTok） | 说明 |
|------|--------------|--------------|------|
| DeepSeek-R1 | $0.55 | $2.19 | 推理优化 |
| V4 Pro | $1.74 | $3.48 | 旗舰（2026.5 降价 75%） |
| V4 Flash | $0.14 | $0.28 | 极致性价比 |
| DeepSeek-Coder | 变动 | 变动 | 代码专用 |

#### 适用场景

- 预算敏感的高频编码任务
- 中文项目开发
- 需要本地部署的数据敏感场景
- 作为其他 Agent 的底层模型（如 Pi + DeepSeek）
- 批量代码生成和转换

---

### 5. Harness — Agent 运行框架（概念）

#### 简介

**Harness（Agent Harness）** 不是一个具体产品，而是一个**概念和方法论**——指围绕 AI 模型构建的运行时脚手架，将语言模型转化为能够执行实际工作的 Agent。

> **公式**：Agent = Model + Harness
>
> Harness 是"除了模型本身以外的一切"。

#### 核心组件

一个完整的 Agent Harness 包括：

1. **工具系统（Tools）**：文件读写、Shell 执行、搜索等
2. **沙箱环境（Sandbox）**：安全隔离的执行环境
3. **记忆系统（Memory）**：上下文管理和持久化存储
4. **编排逻辑（Orchestration）**：多步骤任务协调
5. **反馈循环（Feedback Loops）**：验证输出、处理失败
6. **上下文管理（Context Management）**：决定传入模型的信息
7. **安全防护（Guardrails）**：权限控制、审批策略

#### Harness Engineering（Harness 工程）

OpenAI 在 2026 年提出的**Harness Engineering**概念，强调：

> "设计围绕 AI Agent 的系统、约束和反馈循环，使其在大规模生产中可靠运行的学科。"

核心原则：
- **中央强制边界，本地允许自主**（类似大型工程组织管理）
- **自动化测试驱动**：通过浏览器测试、视频验证等自动化手段验证 Agent 输出
- **渐进式自主**：从严格审批到逐步放权

#### 为什么 Harness 重要

**同一个模型，不同的 Harness，结果天差地别**：

| 场景 | 分数差异 |
|------|----------|
| Claude Code vs Pi（同模型） | 0.2 - 8+ 个百分点 |
| 优化 Harness 前后 | 可达 20 个百分点差距 |
| DeepSeek 在不同 Harness 下 | 分数波动显著 |

关键发现：
- **Pi 的上下文效率**：相同任务，Pi 每轮 token 消耗约为 Claude Code 的 1/3
- **Harness 优化可弥补模型差距**：Pi + Opus 4.5 可在某些任务上超越 Claude Code + Sonnet 4.5
- **DeepSeek 的 Harness 依赖**：同一 DeepSeek 模型在不同 Harness 下差距可达 20 分

#### 主流 Harness 实现

| Harness | 类型 | 特点 |
|---------|------|------|
| **Claude Code** | 商业 | 全功能，Hooks/Skills/子 Agent |
| **Codex** | 商业 | 云端沙箱，并行任务 |
| **Pi** | 开源 | 极简，4 工具，技能文件 |
| **OpenCode** | 开源 | 172K Star，MIT 协议 |
| **Aider** | 开源 | 经典 Git 集成 |
| **Kilo Code** | 开源 | 20K Star，MIT 协议 |
| **Goose** | 开源 | Block 出品 |

#### 适用场景

- 构建自定义 AI Agent 的开发者
- 需要优化 Agent 性能的团队
- 研究 Agent 架构的学者
- 评估和选择 Agent 框架的决策者

---

## 三、横向深度对比

### 1. 性能基准对比

#### Terminal-Bench 2.1（2026 年 8 月最新）

| Agent + 模型组合 | 分数 | 说明 |
|------------------|------|------|
| Codex + GPT-5.6 Sol | **89.5%** | 当前最高 |
| Claude Code + Opus 5 | **89.1%** | 紧随其后 |
| DeepSeek V4 Flash 0731 | **82.7%** | 性价比之王 |
| Pi + Claude Opus 4.5 | **~77.6%** | 极简 Harness |
| Claude Code + Opus 4.8 | **78.9%** | 上一代模型 |
| Claude Code + Sonnet 5 | **74.6%** | 轻量模型 |

#### 关键发现

1. **顶尖差距极小**：Codex（89.5%）与 Claude Code（89.1%）仅差 0.4 个百分点
2. **Harness 影响显著**：同一模型在不同 Harness 下可差 8+ 分
3. **DeepSeek 性价比突出**：以 1/10 的价格达到 82.7% 的成绩
4. **Pi 的极简哲学**：虽然分数较低，但 token 消耗仅为其他 Agent 的 1/3

### 2. 成本对比

#### 每任务成本估算（基于典型编码任务）

| Agent | 模型成本/任务 | 订阅费 | 总成本/月（中度使用） |
|-------|-------------|--------|---------------------|
| Pi + DeepSeek Flash | ~$0.01 | $0 | ~$0.01 × 1000 = **$10** |
| Pi + Claude Opus 5 | ~$0.15 | $0 | ~$0.15 × 1000 = **$150** |
| Claude Code Pro | 包含 | $20 | **$20**（有限额度） |
| Claude Code API | ~$0.20 | $0 | ~$0.20 × 1000 = **$200** |
| Codex (ChatGPT Pro) | 包含 | $200 | **$200**（无限使用） |
| Codex API | ~$0.18 | $0 | ~$0.18 × 1000 = **$180** |

#### 成本优化建议

- **预算有限**：Pi + DeepSeek Flash（每任务 ~$0.01）
- **平衡性能与成本**：Pi + DeepSeek V4 Pro（每任务 ~$0.05）
- **追求极致性能**：Claude Code + Opus 5 或 Codex + GPT-5.6 Sol
- **团队使用**：Claude Code Team（$100/座/月）

### 3. 功能对比矩阵

| 功能 | Pi | Claude Code | Codex | DeepSeek |
|------|----|----|----|----|
| 文件读写 | ✅ | ✅ | ✅ | ⚠️（依赖 Harness） |
| Shell 执行 | ✅ | ✅ | ✅ | ⚠️（依赖 Harness） |
| 子 Agent | ❌ | ✅ | ✅ | ❌ |
| Hooks 系统 | ❌ | ✅ | ❌ | ❌ |
| 技能/插件 | ✅（技能文件） | ✅（Skills） | ✅ | ❌ |
| 云端沙箱 | ❌ | ❌ | ✅ | ❌ |
| 并行任务 | ❌ | ✅（子 Agent） | ✅ | ❌ |
| 持久化记忆 | ❌ | ✅（CLAUDE.md） | ✅（/goal） | ❌ |
| IDE 集成 | ❌ | ✅ | ✅ | ⚠️（第三方） |
| Web 搜索 | ❌ | ✅ | ✅ | ❌ |
| 扩展思考 | ⚠️（模型依赖） | ✅ | ✅ | ✅（R1） |
| 自定义模型 | ✅ | ❌ | ❌ | N/A |
| 开源 | ✅ | ❌ | ❌ | ✅（部分） |

### 4. 设计哲学对比

| Agent | 设计哲学 | 核心理念 |
|-------|----------|----------|
| **Pi** | 极简主义 | "做一件事，做好它"——紧凑的 Agent 循环，通过技能文件扩展 |
| **Claude Code** | 全功能平台 | "一站式解决方案"——内置一切，开箱即用 |
| **Codex** | 安全并行 | "沙箱优先"——安全隔离，并行执行，渐进自主 |
| **DeepSeek** | 普惠 AI | "极致性价比"——让每个人都能用得起顶级编码 AI |
| **Harness 工程** | 系统工程 | "Agent = Model + Harness"——优化脚手架而非仅优化模型 |

---

## 四、优缺点总结

### Pi

| 优点 | 缺点 |
|------|------|
| 极简高效，token 消耗低 | 功能有限，无子 Agent |
| 完全开源，可自由定制 | 基准分数较低 |
| 模型无关，无供应商锁定 | 需要技术能力配置 |
| 学习价值高 | 社区生态较小 |

### Claude Code

| 优点 | 缺点 |
|------|------|
| 顶级性能（89.1%） | 价格较高 |
| 200K 超长上下文 | Token 消耗大 |
| 完善的生态系统 | 供应商锁定 |
| 企业级支持 | 闭源不可定制 |

### Codex

| 优点 | 缺点 |
|------|------|
| 最高基准分数（89.5%） | 供应商锁定 |
| 云端沙箱安全隔离 | 闭源不可定制 |
| 并行任务处理 | Token 消耗大 |
| ChatGPT 一体化 | 部分功能依赖云端 |

### DeepSeek

| 优点 | 缺点 |
|------|------|
| 极低价格（便宜 10-30 倍） | 工具链不完善 |
| 开源可本地部署 | 生态较小 |
| 中文支持优秀 | 推理能力略逊顶级 |
| 性价比高 | 国际访问受限 |

### Harness（概念）

| 优点 | 缺点 |
|------|------|
| 可弥补模型差距 | 需要工程投入 |
| 可定制优化 | 没有标准答案 |
| 系统工程方法 | 学习曲线陡峭 |
| 可复用到不同模型 | 需要持续维护 |

---

## 五、选型建议

### 按使用场景推荐

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| **预算有限的个人开发者** | Pi + DeepSeek Flash | 每任务仅 ~$0.01，性价比极致 |
| **追求极致性能** | Claude Code + Opus 5 | 89.1% 基准分，200K 上下文 |
| **大规模并行任务** | Codex + GPT-5.6 Sol | 云端沙箱，89.5% 最高分 |
| **中文项目开发** | Pi/Claude Code + DeepSeek | 中文理解优秀，成本低 |
| **数据敏感场景** | Pi + 本地 DeepSeek | 完全本地化，数据不出境 |
| **企业团队协作** | Claude Code Team | 企业级安全和支持 |
| **学习和研究** | Pi（开源） | 代码简洁，架构清晰 |
| **定制 Agent 需求** | Pi + 自定义 Harness | 完全可控，灵活扩展 |

### 按角色推荐

| 角色 | 推荐 | 理由 |
|------|------|------|
| **独立开发者** | Pi + DeepSeek | 低成本，高效能 |
| **高级工程师** | Claude Code | 强大推理，处理复杂任务 |
| **团队 Leader** | Codex / Claude Code Team | 并行处理，团队协作 |
| **学生/教育** | Pi（开源免费） | 学习 Agent 架构 |
| **企业 CTO** | Claude Code Enterprise | 安全合规，企业支持 |

---

## 六、未来趋势

### 1. Harness 工程将成为核心竞争力

> "同样的模型，不同的 Harness，结果天差地别。"

未来竞争不仅在模型本身，更在于如何设计和优化 Agent 的运行时脚手架。

### 2. 开源 vs 商业的共存

- **商业 Agent**（Claude Code、Codex）：开箱即用，性能顶尖
- **开源 Agent**（Pi、OpenCode）：高度可定制，社区驱动
- 两者将长期共存，服务不同需求的用户

### 3. 模型与 Harness 的解耦

越来越多用户选择"自带模型"的模式：
- 用 Pi 或 OpenCode 作为 Harness
- 接入 DeepSeek、Claude、GPT 等不同模型
- 根据任务和预算灵活切换

### 4. 中文 AI 编码的崛起

DeepSeek 等中国 AI 公司在编码领域快速追赶：
- 价格优势明显（便宜 10-30 倍）
- 中文支持更好
- 开源策略赢得开发者信任

---

## 七、结论

**没有"最好"的 Agent，只有"最适合"的选择**：

- 如果你追求**极简和可控** → **Pi**
- 如果你需要**最强性能** → **Claude Code** 或 **Codex**
- 如果你预算有限 → **DeepSeek**（配合任意 Harness）
- 如果你想**构建自己的 Agent** → 学习 **Harness 工程**

最终，**Agent 的效果取决于三个因素**：
1. **底层模型的能力**（Opus 5、GPT-5.6、DeepSeek V4）
2. **Harness 的设计质量**（工具、沙箱、记忆、编排）
3. **使用者的熟练程度**（配置、技能、工作流）

投资于这三方面的优化，才能获得最佳的 AI 编码体验。

---

## 参考资料

- [Terminal-Bench 2.1 官方排行榜](https://www.tbench.ai/leaderboard/terminal-bench/2.1)
- [Pi Coding Agent 官网](https://pi.dev/)
- [Claude Code vs Codex vs Aider vs OpenCode vs Pi 2026](https://thoughts.jock.pl/p/ai-coding-harness-agents-2026)
- [Best AI Coding Agent (2026): Ranked by Terminal-Bench](https://www.morphllm.com/ai-coding-agent)
- [Mario Zechner: What I learned building Pi](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/)
- [DeepSeek API Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [Claude Pricing 2026](https://claude.com/pricing)
- [Best CLI AI Coding Assistants 2026](https://sanj.dev/post/comparing-ai-coding-assistants/)
- [I Tested Claude Code, Codex, OpenCode, and Pi for 14 Days](https://www.tensorlake.ai/blog/best-ai-coding-agents-2026)
