---
title: 费曼笔记：Pi Agent 架构设计与扩展
date: 2026-08-31
description: 用费曼学习法深入理解 Pi Agent 的架构设计哲学、核心特性和扩展方式
category: feynman-technique
tags: [Pi Agent, AI编程, Agent架构, 费曼学习法, Harness]
lang: zh
draft: true
---

# 费曼笔记：Pi Agent 架构设计与扩展

<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-31 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

> 学习日期：2026-08-31  
> 学习方式：费曼学习法（以教代学）

---

## 💡 一句话解释

**Pi 是毛坯房，Claude Code 是金装房——你来拥有脚手架。**

---

## 🎯 类比理解

想象你要装修房子：

- **Claude Code** = **金装房**：拎包入住，什么都配好了（MCP、子代理、权限管理），但你改不了
- **Pi Agent** = **毛坯房**：给你最基本的工具和材料（4个工具），你想怎么装就怎么装，但需要自己动手

选哪个？看你想要**方便**还是**自由**。

---

## 📌 核心要点

### 1. 最小化核心

Pi 只有 **4 个核心工具**（read、write、edit、bash）+ 短系统提示，故意不内置：
- MCP（Model Context Protocol）
- 子代理（Sub-agents）
- 计划模式（Plan mode）
- 权限弹窗（Permission popups）

设计哲学：**激进的可扩展性 > 内置工作流**

### 2. Harness 六组件

Pi 实现了 Agent Harness 的六个核心组件中的四个：

| 组件 | 谁负责 |
|------|--------|
| ① 任务定义 | 你来写（TODO.md、测试等） |
| ② 上下文管理 | AGENTS.md、SYSTEM.md、压缩策略 |
| ③ 工具执行 | 4个核心工具 + 扩展 |
| ④ 循环控制 | Pi 自动处理 |
| ⑤ 验证层 | 你来写（测试循环、CI） |
| ⑥ 失败处理 | 你来定义 |

### 3. 树状会话

不是线性聊天历史，而是**分支历史**：
- `/tree` 导航到任意节点继续
- 失败可回溯、重试，不丢失上下文
- 像 Git 分支一样管理会话

### 4. 四种运行模式

| 模式 | 用途 |
|------|------|
| 交互模式 | 日常终端编码 |
| 打印/JSON | 脚本、CI钩子 |
| RPC | 非Node集成 |
| SDK | 嵌入到产品中 |

### 5. 上下文工程

- `AGENTS.md`：项目指令，启动时加载
- `SYSTEM.md`：替换或追加系统提示
- 自定义压缩策略：上下文满时自动摘要

---

## 🔧 封装工作范式

基于 Pi 的设计，你可以这样封装团队的工作范式：

```
┌─────────────────────────────────────────────┐
│  📦 封装路径                                 │
├─────────────────────────────────────────────┤
│                                              │
│  AGENTS.md → 项目规则、代码规范、工作流      │
│       ↓                                      │
│  Skills → 能力包（TDD流程、代码审查等）      │
│       ↓                                      │
│  Extensions → 自定义工具（连接内部API）      │
│       ↓                                      │
│  Packages → 打包分享给团队                   │
│                                              │
└─────────────────────────────────────────────┘
```

---

## 📊 与 Claude Code 对比

| 维度 | Pi Agent | Claude Code |
|------|----------|-------------|
| 设计哲学 | 你来拥有脚手架 | 脚手架已搭好 |
| MCP | 扩展实现 | 内置原生 |
| 子代理 | tmux/扩展/包 | 内置 |
| 会话模型 | 树状（分支） | 线性+检查点 |
| 提供商 | 15+ | Anthropic优先 |
| 嵌入方式 | SDK/RPC/JSON | IDE/CLI产品 |
| 适合场景 | 自定义harness | 日常编码 |
| 上下文控制 | 完全可控 | 相对黑盒 |

---

## 🗣️ 三层次讲解

### 给完全不懂技术的人

> 想象你要装修房子。Claude Code 是金装房——拎包入住，什么都配好了，但你改不了。Pi Agent 是毛坯房——给你最基本的工具和材料，你想怎么装就怎么装，但需要你自己动手。
>
> 选哪个？看你想要方便还是自由。

### 给有编程基础的人

> Pi Agent 是一个最小化的终端 AI 编码代理。它和 Claude Code 的核心区别是：
>
> - Claude Code 内置一切（MCP、子代理、权限管理），开箱即用
> - Pi 只给你 4 个工具（read、write、edit、bash），其余全靠扩展
>
> Pi 的设计哲学是：你来拥有脚手架，而不是租别人的。你可以用 TypeScript 写扩展、装社区包、甚至用 Pi 改 Pi。
>
> 代价是需要更多配置，收获是完全的控制权。

### 给技术团队分享

> Pi Agent 是一个最小化 Harness 实现，实现了 Agent 六组件中的四个（任务定义、上下文管理、工具执行、循环控制），而验证层和失败处理留给你实现。
>
> **架构亮点**：
> 1. 树状会话：分支历史，失败可回溯
> 2. 四种运行模式：交互/打印/JSON/RPC/SDK，可嵌入任何场景
> 3. 上下文工程：AGENTS.md + SYSTEM.md + 自定义压缩策略
> 4. Skills 按需加载：保持提示缓存热度，效率更高
>
> **封装工作范式的路径**：
> - AGENTS.md → 项目规则
> - Skills → 能力包（TDD、代码审查、部署）
> - Extensions → 自定义工具
> - Packages → 打包分享给团队

---

## 🔍 学习反思

- **最大收获**：理解了"你来拥有脚手架"的设计哲学
- **曾经卡壳**：本次学习顺畅，无卡壳
- **延伸问题**：如何为团队设计一套 Pi Skills？

---

## 🔗 知识关联

- **与 Claude Code 的关系**：同赛道，不同哲学（控制权 vs 便利性）
- **与 Agent Harness 的关系**：Pi 是 harness 的参考实现
- **与 OpenClaw 的关系**：OpenClaw 用 Pi SDK 构建产品层

---

## 📚 参考链接

- [Pi.dev 官方文档](https://pi.dev)
- [Pi: The Minimal Agent Within OpenClaw](https://lucumr.pocoo.org/2026/1/31/pi/)
- [Pi Agent Harness 详解](https://explainx.ai/blog/pi-minimal-agent-harness-mario-zechner-guide-2026)

---

> "学 = 教。教不出来 = 没学会。" —— 费曼学习法

<!-- [AGC:END] -->
