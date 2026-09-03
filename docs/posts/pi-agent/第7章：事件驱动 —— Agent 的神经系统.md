---
title: "事件驱动：Agent 的神经系统 - 费曼笔记（大白话版）"
date: 2026-09-03
description: "用大白话理解 Pi-Agent 的事件驱动系统：两条管道、十种事件、等与不等的设计哲学，通俗类比 + 可视化图表 + 原文双链"
category: pi-agent
tags: [费曼笔记, 学习笔记, 事件驱动, 发布订阅, Agent架构, session.subscribe, pi.on]
lang: zh
draft: false
source: ./source/M07 · 第7章：事件驱动 —— Agent 的神经系统.md
source-title: "第7章：事件驱动 —— Agent 的神经系统"
---

<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-09-03 -->

# 大白话版：事件驱动 —— Agent 的神经系统

> 这是《第7章：事件驱动 —— Agent 的神经系统》的通俗解读版
> 核心理念：用大白话把技术概念讲明白，让自己和同事都能听懂
>

---

## 一、一句话说明白：事件驱动是什么？

**事件驱动就是 Agent 的"神经系统"——Agent 每做一件事就喊一嗓子，关心这事的人各自听到后各干各的，不用互相盯着。**

> 📖 **原文引用**：第7章 § 一、为什么需要事件系统？
>
> "把'发生了什么'和'谁关心什么'彻底分离。Agent 只管发事件，它不知道也不关心谁在听。"
>
> **为什么这么理解**：原文用外卖追踪类比——你不用一直盯骑手，状态变化时 App 推送给你。事件驱动本质就是"有事我通知你，你不用盯着我"。


### 类比理解

**🎨 类比图**（事件驱动 = 外卖追踪）：

```mermaid
---
title: "事件驱动 = 外卖追踪"
---
flowchart LR
    subgraph 外卖场景["🍱 外卖场景"]
        E1["🏪 商家<br/>接单、出餐"]
        E2["🛵 骑手<br/>取餐、送餐"]
        E3["📱 App<br/>推送状态更新"]
        E4["👤 你<br/>收到通知看一眼"]
    end

    subgraph Agent场景["💻 Agent 场景"]
        A1["🤖 Agent 内核<br/>执行工具、调模型"]
        A2["📡 事件总线<br/>10种事件源"]
        A3["🖥️ 终端 UI<br/>流式渲染"]
        A4["📝 日志/扩展<br/>各自处理"]
    end

    E1 -->|"状态变化"| E3
    E2 -->|"状态变化"| E3
    E3 -->|"推送"| E4

    A1 -->|"发出事件"| A2
    A2 -->|"订阅"| A3
    A2 -->|"订阅"| A4

    E1 <-.->|"映射"| A1
    E3 <-.->|"映射"| A2
    E4 <-.->|"映射"| A3

    style 外卖场景 fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style Agent场景 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style E1 fill:#ffe0b2,stroke:#ef6c00,stroke-width:1px
    style E2 fill:#ffe0b2,stroke:#ef6c00,stroke-width:1px
    style E3 fill:#fff9c4,stroke:#f9a825,stroke-width:1px
    style E4 fill:#e8f5e9,stroke:#388e3c,stroke-width:1px
    style A1 fill:#bbdefb,stroke:#1565c0,stroke-width:1px
    style A2 fill:#bbdefb,stroke:#1565c0,stroke-width:1px
    style A3 fill:#c8e6c9,stroke:#388e3c,stroke-width:1px
    style A4 fill:#c8e6c9,stroke:#388e3c,stroke-width:1px
```

**对比表格**：

| 概念 | 像什么 | 特点 |
|------|--------|------|
| **事件驱动** | 🛵 外卖追踪 | 有事推送，不用盯着，互不打扰 |
| **直接调用** | ☎️ 打电话通知 | 你得知道每个人的号码，加人要改通讯录 |
| **发布-订阅** | 📢 广播喇叭 | 对着空气喊，谁听到算谁的 |

**关键区别**：
- 直接调用：Agent 必须知道每个消费者的存在，加个新功能就得改 Agent
- 事件驱动：Agent 只管发事件，消费者各自订阅，新功能只需订阅、不用改 Agent

---

## 二、核心概念详解

### 2.1 十种事件：4 层嵌套的生命周期

**大白话**：Agent 运行时会发出 10 种事件，它们像俄罗斯套娃一样 4 层嵌套——最外面是"Agent 开始/结束"，里面是"一轮对话开始/结束"，再里面是"一条消息开始/更新/结束"，最里面是"一次工具执行开始/更新/结束"。每一层都是"开始→中间更新→结束"的套路。

> 📖 **原文引用**：第7章 § 2.1 事件源：10 种 AgentEvent
>
> "10 种看着不少，但规律很清楚——它们是 4 层嵌套的生命周期，每层都有'开始→更新→结束'的配对"
>
> **为什么这么理解**：原文的代码定义和嵌套结构图清楚地展示了 2+2+3+3=10 的规律。从外到内：Agent(2) → Turn(2) → Message(3) → Tool Execution(3)。


**类比图**（4 层嵌套 = 一天的时间结构）：

```mermaid
---
title: "4层嵌套 = 一天的时间结构"
---
flowchart LR
    subgraph 时间类比["🕐 一天的时间结构"]
        D1["📅 一整年<br/>agent_start → agent_end"]
        D2["📆 一个月<br/>turn_start → turn_end"]
        D3["📄 一天里的事<br/>message_start → message_end"]
        D4["⏰ 某件具体的事<br/>tool_execution_start → end"]
    end

    subgraph 事件层次["💻 事件4层嵌套"]
        L1["Layer 1: Agent<br/>整体运行周期"]
        L2["Layer 2: Turn<br/>一轮模型调用"]
        L3["Layer 3: Message<br/>一条消息流式输出"]
        L4["Layer 4: Tool Exec<br/>一次工具执行"]
    end

    D1 <-->|"映射"| L1
    D2 <-->|"映射"| L2
    D3 <-->|"映射"| L3
    D4 <-->|"映射"| L4

    style 时间类比 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style 事件层次 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style D1 fill:#e1bee7,stroke:#7b1fa2
    style D2 fill:#ce93d8,stroke:#7b1fa2
    style D3 fill:#ba68c8,stroke:#7b1fa2
    style D4 fill:#ab47bc,stroke:#7b1fa2
    style L1 fill:#bbdefb,stroke:#1565c0
    style L2 fill:#90caf9,stroke:#1565c0
    style L3 fill:#64b5f6,stroke:#1565c0
    style L4 fill:#42a5f5,stroke:#1565c0
```

**嵌套关系图**：

```mermaid
flowchart TB
    AGENT["🤖 Agent 运行<br/>agent_start ─────────── agent_end"]

    subgraph TURN1["Turn 1：一轮对话"]
        T1S["turn_start"]
        subgraph MSG1["Message: 用户消息"]
            MS1["message_start"]
            ME1["message_end<br/>（用户消息无 update）"]
        end
        subgraph MSG2["Message: AI 回复"]
            MS2["message_start"]
            MU2["message_update ×N<br/>流式逐 token"]
            ME2["message_end"]
        end
        subgraph TOOL1["Tool Execution: 工具执行"]
            TS1["tool_execution_start"]
            TU1["tool_execution_update ×N<br/>进度输出"]
            TE1["tool_execution_end"]
        end
        T1E["turn_end"]
    end

    subgraph TURN2["Turn 2：又一轮对话"]
        T2S["turn_start"]
        subgraph MSG3["Message: AI 最终回复"]
            MS3["message_start"]
            MU3["message_update ×N"]
            ME3["message_end"]
        end
        T2E["turn_end<br/>（无 ToolCall → 无 Layer 4）"]
    end

    AGENT --> TURN1 --> TURN2

    style AGENT fill:#e3f2fd,stroke:#1565c0,stroke-width:3px
    style TURN1 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style TURN2 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style MSG1 fill:#fff3e0,stroke:#f57c00,stroke-width:1px
    style MSG2 fill:#fff3e0,stroke:#f57c00,stroke-width:1px
    style MSG3 fill:#fff3e0,stroke:#f57c00,stroke-width:1px
    style TOOL1 fill:#ffcdd2,stroke:#c62828,stroke-width:1px
```

**速记口诀**：

```
┌────────────────────────────────────────────────────────┐
│  📊 10种事件 = 2 + 2 + 3 + 3                          │
├────────────────────────────────────────────────────────┤
│  • Agent 层 (2种)：agent_start / agent_end            │
│  • Turn 层 (2种)：turn_start / turn_end               │
│  • Message 层 (3种)：start / update×N / end           │
│  • Tool 层 (3种)：start / update×N / end              │
│  规律：每层都是"开始 → 中间更新(可无) → 结束"        │
└────────────────────────────────────────────────────────┘
```

---

### 2.2 两条管道：等 vs 不等 —— 最核心的分水岭

**大白话**：Pi 有两条"接收事件的管道"。管道 A 像**公告栏**——Agent 把消息往上一贴就走，不管你看不看、看完有啥想法；管道 B 像**审批流程**——Agent 把材料递给你，必须等你签完字才走。一个是"通知一声就走"，一个是"等你回话才走"。

> 📖 **原文引用**：第7章 § 2.2 两条管道：subscribe 与扩展 pi.on
>
> "Pi 有两套并行的监听机制——session.subscribe（只读观察，Agent 不等你）和扩展系统的 pi.on（能拦截、能改写，Agent 会等你）。"
>
> "因果关系很直接：扩展要读返回值，所以必须等；subscribe 不读返回值，等了也没用。'能改 Agent 行为'是'等 + 读返回值'的结果，不是单独赋予的能力。"
>
> **为什么这么理解**：原文强调"等 vs 不等"是根本分水岭。不是先有"能改"的能力再去决定等不等，而是因为要读返回值所以必须等，"能改"只是等的自然结果。


**类比图**（两条管道 = 公告栏 vs 审批流程）：

```mermaid
---
title: "两条管道 = 公告栏 vs 审批流程"
---
flowchart LR
    subgraph 管道A["📋 管道 A · session.subscribe"]
        A_STYLE["📢 公告栏模式"]
        A1["Agent 贴出公告"]
        A2["你看或不看<br/>Agent 不在乎"]
        A3["你写了反馈<br/>被丢进垃圾桶"]
        A1 --> A2 --> A3
    end

    subgraph 管道B["📝 管道 B · 扩展 pi.on"]
        B_STYLE["✍️ 审批流程模式"]
        B1["Agent 递来材料"]
        B2["你必须签字<br/>Agent 等你"]
        B3["你签了啥 Agent<br/>就照做"]
        B1 --> B2 --> B3
    end

    subgraph 核心差异["🔑 核心差异"]
        C1["Agent 不等 ❌"]
        C2["Agent 等你 ✅"]
    end

    A3 --> C1
    B3 --> C2

    style 管道A fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style 管道B fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style 核心差异 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style A_STYLE fill:#ffcdd2,stroke:#c62828
    style B_STYLE fill:#c8e6c9,stroke:#2e7d32
```

**对比表格**：

| 维度 | 管道 A（session.subscribe） | 管道 B（扩展 pi.on） |
|------|---------|---------|
| **类比** | 📢 公告栏：贴了就走 | ✍️ 审批流程：等你签字 |
| **Agent 等不等** | ❌ 不等，通知一声就走 | ✅ 等，读完返回值才走 |
| **能不能改 Agent** | ❌ 不能，返回值被丢弃 | ✅ 能，返回值被 Agent 读取 |
| **代码写在哪** | 外部脚本里 | 扩展（插件）里 |
| **典型用途** | 日志、渲染、转发 SSE | 拦截工具、改上下文、换提示词 |
| **源码实现** | `this._emit(event)` 同步不等 | `await this._emitExtensionEvent(event)` |
| **错误处理** | async 错误被静默吞掉 | 大多数有 try-catch 隔离 |

---

### 2.3 容易搞混的两个事件：tool_call vs tool_execution_start

**大白话**：这两个名字很像，但完全不同。`tool_call` 是**安检门**——工具还没开始跑，你可以拦下来不让它跑；`tool_execution_start` 是**起跑发令枪**——工具已经开跑了，你只能看着、拦不住了。而且安检门只有管道 B 能过，管道 A 根本到不了那里。

> 📖 **原文引用**：第7章 § 2.2 两条管道（容易搞混的两个事件名）
>
> "tool_call 是执行前的安检门（能拦，管道 B 独占），tool_execution_start 是开跑后的广播（拦不了，两条管道都收）。"
>
> **为什么这么理解**：原文的时间线清楚地展示了先后顺序——先过安检门(tool_call)，没被拦才起跑(tool_execution_start)。被拦掉的调用根本不会触发后面的事件。


**流程图**：

```mermaid
flowchart TD
    START["🤖 LLM 决定调用一个工具"] --> CHECK{"🛡️ 安检门<br/>tool_call<br/>（管道B独占）"}
    CHECK -->|"扩展返回<br/>{ block: true }"| BLOCKED["🚫 被拦下<br/>什么都不发生"]
    CHECK -->|"放行<br/>return undefined"| RUN["🏃 工具开始执行"]
    RUN --> S["📢 tool_execution_start<br/>（两条管道都能收到）"]
    S --> U["📢 tool_execution_update ×N<br/>进度更新"]
    U --> E["📢 tool_execution_end<br/>执行完毕"]

    style START fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CHECK fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style BLOCKED fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style RUN fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style S fill:#e8f5e9,stroke:#388e3c
    style U fill:#e8f5e9,stroke:#388e3c
    style E fill:#e8f5e9,stroke:#388e3c
```

---

### 2.4 管道 A 详解：session.subscribe

**大白话**：管道 A 就是一个"只看不动手"的观察窗。你在外面挂个摄像头看 Agent 干活——Agent 干它的，你看你的，互不影响。你可以在摄像头后面慢慢分析录像（异步处理），但 Agent 不会等你分析完。代价是：如果你的摄像头坏了（async 报错），没人会注意到。

> 📖 **原文引用**：第7章 § 三、管道 A：session.subscribe
>
> "listener 的签名返回值是 void——就算你在 listener 里 return { block: true }，Agent 也不读、不用。这是管道 A'只能看不能改'在类型层面的体现。"
>
> "async 监听器里的错误不会冒泡到 Agent。如果你在 async 监听器里 await 一个会失败的操作，失败会被悄悄吞掉。务必在 async 监听器里自己 try-catch。"
>
> **为什么这么理解**：返回值为 void 意味着 TypeScript 在类型层面就不让你"改"。不等意味着你的异步操作在后台跑，错误只能自己兜。


**三个关键后果**：

| 后果 | 说明 | 类比 |
|------|------|------|
| 异步重活不拖 Agent | 你在 listener 里 await 慢请求，Agent 早走了 | 你看监控不影響小偷作案 |
| 异步结果传不回去 | Agent 已经发下一个事件了 | 你写分析报告，没人等 |
| async 错误被静默吞掉 | 你的 try-catch 没写就啥都不知道 | 摄像头坏了没人修 |

**管道 A 能收到的事件**：

- 10 种内核生命周期事件（2.1 讲的那 10 种）
- 加上产品级事件：`agent_settled`（整轮收尾）、`compaction_start/end`（压缩）、`auto_retry_start/end`（重试）等
- ❌ 收不到管道 B 独占的 5 个决策点事件

---

### 2.5 管道 B 详解：扩展系统 pi.on

**大白话**：管道 B 是一个"能动手"的遥控器。你不仅能看 Agent 在干什么，还能在它要干蠢事时按下暂停键、改它的剧本、甚至替换它的台词。代价是你的代码必须写成"扩展"（插件形式），而且 Agent 会等你——你处理慢了，Agent 就卡住了。

> 📖 **原文引用**：第7章 § 四、管道 B：扩展系统 pi.on
>
> "handler 有返回值（return { block: true }）——这是管道 B 能干预 Agent 的根本，也是'Agent 必须等你'的原因。"
>
> "tool_call 是所有派发方法里唯一不包 try-catch 的——扩展抛错会冒泡，导致这次工具调用被 block（fail-closed：宁可错杀，不放行可能危险的操作）。"
>
> **为什么这么理解**：管道 B 的"能改"本质是 Agent 读了你的返回值。tool_call 的特殊 fail-closed 设计说明：安全 > 可用性，宁错拦不可漏放。


**三条派发路径对比**：

| 路径 | 处理什么 | 特点 | 异常处理 |
|------|----------|------|----------|
| **通知型 `emit()`** | message_update 等只读事件 | 串行 await、忽略返回值 | try-catch 隔离 |
| **决策型 `emitToolCall()`** | tool_call 拦截 | await + 读返回值 + block 短路 | ❌ 无 try-catch（fail-closed） |
| **链式 transform 型** | context、input、tool_result | 每个 handler 接力改、链式传递 | try-catch 隔离 |

**管道 B 独占的 5 个决策点**：

```
┌────────────────────────────────────────────────────────┐
│  🔑 管道 B 独占的 5 个"能动手"的入口                   │
├────────────────────────────────────────────────────────┤
│  1. input        — 用户输入后，展开 skill/template 前   │
│  2. before_agent_start — Agent 开跑前，可改系统提示词   │
│  3. context      — 发给 LLM 前，可改消息列表           │
│  4. tool_call    — 工具执行前，可拦截                  │
│  5. tool_result  — 工具执行后，可改工具返回值          │
│                                                        │
│  共同点：Agent 要停下来读你的返回值                     │
│  管道 A 一律收不到这些事件                             │
└────────────────────────────────────────────────────────┘
```

**类比图**（管道 B = 导演 vs 观众）：

```mermaid
---
title: "管道 B = 导演可以改剧本"
---
flowchart LR
    subgraph 管道A视角["👀 管道 A = 观众"]
        PA1["🎬 演员在台上演"]
        PA2["👀 你在台下看"]
        PA3["📝 你写了评论<br/>但演员听不到"]
        PA1 --> PA2 --> PA3
    end

    subgraph 管道B视角["🎬 管道 B = 导演"]
        PB1["🎬 演员在台上演"]
        PB2["📢 导演喊'卡！'"]
        PB3["📝 导演改剧本<br/>演员照着演"]
        PB1 --> PB2 --> PB3
    end

    style 管道A视角 fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style 管道B视角 fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style PA1 fill:#ffcdd2
    style PA2 fill:#ffe0b2
    style PA3 fill:#fff9c4
    style PB1 fill:#c8e6c9
    style PB2 fill:#a5d6a7
    style PB3 fill:#81c784
```

---

## 三、可视化总览

### 3.1 事件系统全景架构图

> 📖 **原文引用**：第7章 § 二、两条管道的全貌
>
> 原文中的两张 SVG 配图展示了完整的事件流向：事件源 → 两条管道 → 两类监听器


```mermaid
flowchart TB
    subgraph EVENT_SOURCE["📡 事件源（共同水源）"]
        ES["10 种 AgentEvent<br/>4层嵌套生命周期"]
        ES_EXT["+ 5 个扩展独占事件<br/>input/before_agent_start/<br/>context/tool_call/tool_result"]
    end

    subgraph PIPELINE_A["📋 管道 A · session.subscribe"]
        direction TB
        A1["注册方式<br/>外部脚本里 subscribe"]
        A2["Agent态度<br/>❌ 不等，通知一声就走"]
        A3["返回值<br/>丢弃（void）"]
        A4["能力<br/>只看，不改"]
        A5["错误处理<br/>async错误被静默吞"]
    end

    subgraph PIPELINE_B["📝 管道 B · 扩展 pi.on"]
        direction TB
        B1["注册方式<br/>写在扩展里 pi.on"]
        B2["Agent态度<br/>✅ 等，读完返回值才走"]
        B3["返回值<br/>被Agent读取"]
        B4["能力<br/>能拦、能改、能干预"]
        B5["错误处理<br/>大多数隔离，tool_call不隔离"]
    end

    subgraph USE_CASES_A["🔧 管道 A 适用场景"]
        UA1["流式渲染"]
        UA2["日志记录"]
        UA3["SSE 转发"]
        UA4["统计 token"]
    end

    subgraph USE_CASES_B["🔧 管道 B 适用场景"]
        UB1["拦截危险工具"]
        UB2["改写上下文"]
        UB3["替换系统提示词"]
        UB4["修改工具返回值"]
    end

    ES --> PIPELINE_A
    ES --> PIPELINE_B
    ES_EXT --> PIPELINE_B
    ES_EXT -.->|"管道A收不到"| PIPELINE_A

    PIPELINE_A --> USE_CASES_A
    PIPELINE_B --> USE_CASES_B

    style EVENT_SOURCE fill:#e3f2fd,stroke:#1565c0,stroke-width:3px
    style PIPELINE_A fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style PIPELINE_B fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style USE_CASES_A fill:#ffe0b2,stroke:#ef6c00,stroke-width:1px
    style USE_CASES_B fill:#a5d6a7,stroke:#2e7d32,stroke-width:1px
    style ES fill:#bbdefb,stroke:#1565c0
    style ES_EXT fill:#90caf9,stroke:#1565c0
```

### 3.2 判断流程图：我该用哪条管道？

> 📖 **原文引用**：第7章 § 5.3 怎么选管道？一句话判断


```mermaid
flowchart TD
    START["🤔 我要给 Agent 加功能"] --> Q{"我的代码需要<br/>改变 Agent 的行为吗？"}
    Q -->|"✅ 要<br/>（拦截、改参数、改消息）"| PB["📝 管道 B<br/>写扩展 · pi.on"]
    Q -->|"❌ 不要<br/>（打日志、推前端、记统计）"| PA["📋 管道 A<br/>session.subscribe"]

    PB --> PB_DETAIL["Agent 会等你<br/>读你的返回值"]
    PA --> PA_DETAIL["Agent 不等你<br/>返回值丢弃"]

    PA_DETAIL --> PA_USE["适合：流式渲染<br/>日志、SSE、统计"]
    PB_DETAIL --> PB_USE["适合：安全拦截<br/>上下文改写<br/>提示词替换"]

    PA_USE --> PA_WARN["⚠️ async 里自己 try-catch<br/>⚠️ 收不到 tool_call 等5个事件"]
    PB_WARN["⚠️ handler 被 await<br/>慢了会卡住 Agent<br/>⚠️ tool_call 里别出错"]

    style START fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Q fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style PB fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style PA fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style PA_WARN fill:#fff9c4,stroke:#f9a825,stroke-width:1px
    style PB_WARN fill:#fff9c4,stroke:#f9a825,stroke-width:1px
```

---

## 四、关键数字速记

> 📖 **原文引用**：第7章 § 2.1-2.2


```
┌────────────────────────────────────────────────────────┐
│  📊 关键数字（吹牛用）                                 │
├────────────────────────────────────────────────────────┤
│  • 10 种 AgentEvent：事件源的总数（2+2+3+3）           │
│  • 4 层嵌套：Agent → Turn → Message → Tool Execution  │
│  • 2 条管道：subscribe（只读）+ pi.on（能改）          │
│  • 5 个决策点：管道B独占的干预入口                     │
│  • 1 个分水岭："等 vs 不等"决定一切                    │
│  • 3 条派发路径：通知型/决策型/链式transform型         │
│  • 0 个例外：tool_call 是唯一不包 try-catch 的         │
│                                                        │
│  记忆口诀：10事件4层嵌套，2管道1分水岭                │
│  "等就有能力，不等就只能看"                           │
└────────────────────────────────────────────────────────┘
```

---

## 五、类比速记卡

| 概念 | 类比 | 原文出处 |
|------|------|----------|
| **事件驱动** | 🛵 外卖追踪——有事推送，不用盯着 | § 一 |
| **发布-订阅 vs 直接调用** | 📢 广播喇叭 vs ☎️ 打电话 | § 一 |
| **4 层事件嵌套** | 🕐 年→月→日→具体事情 | § 2.1 |
| **管道 A（subscribe）** | 📢 公告栏——贴了就走 | § 2.2 |
| **管道 B（pi.on）** | ✍️ 审批流程——等你签字 | § 2.2 |
| **tool_call** | 🛡️ 安检门——执行前能拦 | § 2.2 |
| **tool_execution_start** | 🏃 起跑发令枪——已经开跑拦不了 | § 2.2 |
| **"等 vs 不等"** | 🔑 分水岭——决定一切的根本差别 | § 2.2 |
| **管道 A 的 async 错误** | 📹 摄像头坏了没人知道 | § 3.2 |
| **管道 B 的 fail-closed** | 🛡️ 宁可错杀、不可漏放 | § 4.3 |
| **管道 A vs B** | 👀 观众 vs 🎬 导演 | § 四 |

---

## 六、实战代码速查

### 6.1 管道 A 代码模板

```typescript
// 管道 A：只读观察，Agent 不等
const unsubscribe = session.subscribe((event) => {
    // 流式渲染
    if (event.type === "message_update") {
        process.stdout.write(event.assistantMessageEvent.delta);
    }
    // 工具日志
    if (event.type === "tool_execution_end") {
        console.log(`🔧 ${event.toolName}: ${event.isError ? "❌" : "✅"}`);
    }
    // ⚠️ 如果用了 async，必须自己 try-catch！
});
// 不用了就注销
unsubscribe();
```

### 6.2 管道 B 代码模板

```typescript
// 管道 B：能拦截改写，Agent 等你
function myExtension(pi) {
    // 拦截危险工具
    pi.on("tool_call", async (event) => {
        if (event.toolName === "delete_table") {
            return { block: true, reason: "禁止删除" };
        }
        return undefined;  // 放行
    });

    // 改写上下文
    pi.on("context", async (event) => {
        return {
            messages: [
                { role: "user", content: `当前时间：${new Date()}` },
                ...event.messages
            ]
        };
    });
}
// 挂载到 loader 的 extensionFactories
```

---

## 七、一句话总结（费曼技巧版）

**事件驱动是什么？**
> Agent 每做一步就广播一个事件，关心的人各自订阅、各干各的——"发生了什么"和"谁关心什么"彻底分离。

**两条管道的本质区别？**
> 等 vs 不等。Agent 等你的 handler（管道 B），就能读你的返回值、就能被你拦截；Agent 不等你的 listener（管道 A），你就只能看、不能改。

**为什么重要？**
> 没有事件系统，你加任何功能都得改 Agent 源码。有了它，新功能只是"挂一段代码"，Agent 更新你只需 npm update。

**一句话判断用哪条管道？**
> 要改 Agent 行为 → 写扩展走管道 B；只看不动手 → subscribe 走管道 A。

---

## 八、知识关联

| 关联章节 | 关系 |
|----------|------|
| **第 3 章：Agent Loop** | Agent Loop 每步发事件 → 就是这里讲的事件源 |
| **第 5 章：工具系统** | 工具执行五步管道 → 第 3 步 beforeToolCall 底层就是管道 B 的 tool_call |
| **第 6 章：消息系统** | transformContext → 管道 B 的 context hook 在内核层的对应物 |
| **第 8-9 章（预告）** | Compaction 压缩 → 会触发 compaction_start/end 事件（管道 A 能收到） |

---

> 📝 **学习笔记**
> - 学习日期：2026-09-03
> - 学习方式：费曼学习法（大白话版）
> - 原始文档：M07 · 第7章：事件驱动 —— Agent 的神经系统.md
> - 下一步：理解后，用自己的话讲给同事听（Step 3）
