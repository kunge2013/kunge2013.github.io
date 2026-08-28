---
title: Pi Coding Agent 事件系统
description: Pi Agent 完整事件系统参考 - 生命周期、启动、会话、Agent、工具、模型事件详解
tags: [Pi Agent, 扩展, 事件]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# Pi Coding Agent 事件系统

<!-- [AGC:START] tool=Cc author=fangkun -->

## 生命周期概览

```
pi 启动
  │
  ├─► project_trust（仅用户/全局和 CLI 扩展，在项目资源加载之前）
  ├─► session_start { reason: "startup" }
  └─► resources_discover { reason: "startup" }
      │
      ▼
用户发送提示词 ─────────────────────────────────────────┐
  │                                                        │
  ├─►（首先检查扩展命令，如果找到则绕过）                  │
  ├─► input（可以拦截、转换或处理）                        │
  ├─►（如果未处理则进行 skill/template 扩展）              │
  ├─► before_agent_start（可以注入消息、修改系统提示词）   │
  ├─► agent_start                                          │
  ├─► message_start / message_update / message_end         │
  │                                                        │
  │   ┌─── turn（当 LLM 调用工具时重复）───┐               │
  │   │                                    │               │
  │   ├─► turn_start                       │               │
  │   ├─► context（可以修改消息）           │               │
  │   ├─► before_provider_headers（可以修改 headers）       |
  │   ├─► before_provider_request（可以检查或替换 payload） │
  │   ├─► after_provider_response（status + headers，在流消费之前）
  │   │                                    │               │
  │   │   LLM 响应，可能调用工具：         │               │
  │   │     ├─► tool_execution_start       │               │
  │   │     ├─► tool_call（可以阻止）       │               │
  │   │     ├─► tool_execution_update      │               │
  │   │     ├─► tool_result（可以修改）     │               │
  │   │     └─► tool_execution_end         │               │
  │   │                                    │               │
  │   └─► turn_end                         │               │
  │                                                        │
  ├─► agent_end                                            │
  └─► agent_settled（没有剩余重试/压缩/后续消息）           │
                                                           │
用户发送另一个提示词 ◄────────────────────────────────────┘

/new（新会话）或 /resume（切换会话）
  ├─► session_before_switch（可以取消）
  ├─► session_shutdown
  ├─► session_start { reason: "new" | "resume", previousSessionFile? }
  └─► resources_discover { reason: "startup" }

/fork 或 /clone
  ├─► session_before_fork（可以取消）
  ├─► session_shutdown
  ├─► session_start { reason: "fork", previousSessionFile }
  └─► resources_discover { reason: "startup" }

/name 或 pi.setSessionName()
  └─► session_info_changed

/compact 或自动压缩
  ├─► session_before_compact（可以取消或自定义）
  ├─► session_compact（成功）
  └─► session_compact_failed（失败或中止）

/tree 导航
  ├─► session_before_tree（可以取消或自定义）
  └─► session_tree

/model 或 Ctrl+P（模型选择/切换）
  ├─► thinking_level_select（如果模型更改更改/限制了思考级别）
  └─► model_select

思考级别更改（设置、快捷键、pi.setThinkingLevel()）
  └─► thinking_level_select

退出（Ctrl+C、Ctrl+D、SIGHUP、SIGTERM）
  └─► session_shutdown
```

## 启动事件

### project\_trust

在 pi 决定是否信任具有动态配置（`.pi` 或 `.agents/skills`）的项目之前触发。它在启动时以及会话替换（例如 `/resume`）进入其信任尚未在当前进程中解析的 cwd 时运行。只有用户/全局扩展和 CLI `-e` 扩展参与；项目本地扩展在信任解析之前不会被加载。

```typescript
pi.on("project_trust", async (event, ctx) => {
  // event.cwd - 当前工作目录
  // ctx 具有有限的信任上下文：cwd、mode、hasUI 和 select/confirm/input/notify UI 辅助方法
  if (await ctx.ui.confirm("Trust project?", event.cwd)) {
    return { trusted: "yes", remember: true };
  }
  return { trusted: "undecided" };
});
```

`project_trust` 处理程序必须返回 `{ trusted: "yes" | "no" | "undecided" }`。返回 `"yes"` 或 `"no"` 的用户/全局或 CLI 扩展拥有决策权；第一个 yes/no 决策获胜并抑制内置的信任提示。使用 `remember: true` 持久化 yes/no 决策；否则它仅应用于当前进程。返回 `"undecided"` 让后续处理程序或内置信任流决定。在提示之前检查 `ctx.hasUI`。如果没有处理程序返回 yes/no，则继续正常的信任解析：首先应用已保存的 `trust.json` 决策，然后 `defaultProjectTrust` 控制 pi 默认是询问、信任还是拒绝。

## 资源事件

### resources\_discover

在 `session_start` 之后触发，以便扩展可以贡献额外的 skill、prompt 和 theme 路径。启动路径使用 `reason: "startup"`。重载使用 `reason: "reload"`。

```typescript
pi.on("resources_discover", async (event, _ctx) => {
  // event.cwd - 当前工作目录
  // event.reason - "startup" | "reload"
  return {
    skillPaths: ["/path/to/skills"],
    promptPaths: ["/path/to/prompts"],
    themePaths: ["/path/to/themes"],
  };
});
```

## 会话事件

请参阅 [Session Format](https://pi.dev/docs/latest/session-format) 了解会话存储内部结构和 SessionManager API。

### session\_start

当会话启动、加载或重载时触发。

```typescript
pi.on("session_start", async (event, ctx) => {
  // event.reason - "startup" | "reload" | "new" | "resume" | "fork"
  // event.previousSessionFile - 在 "new"、"resume" 和 "fork" 时存在
  ctx.ui.notify(`Session: ${ctx.sessionManager.getSessionFile() ?? "ephemeral"}`, "info");
});
```

### session\_info\_changed

当当前会话显示名称通过 `/name`、RPC 或 `pi.setSessionName()` 设置时触发。

```typescript
pi.on("session_info_changed", async (event, ctx) => {
  // event.name - 当前规范化的名称，如果已清除则为 undefined
  ctx.ui.notify(`Session renamed: ${event.name ?? "(none)"}`, "info");
});
```

### session\_before\_switch

在开始新会话（`/new`）或切换会话（`/resume`）之前触发。

```typescript
pi.on("session_before_switch", async (event, ctx) => {
  // event.reason - "new" 或 "resume"
  // event.targetSessionFile - 我们要切换到的会话（仅用于 "resume"）

  if (event.reason === "new") {
    const ok = await ctx.ui.confirm("Clear?", "Delete all messages?");
    if (!ok) return { cancel: true };
  }
});
```

在成功切换或新建会话操作之后，pi 为旧的扩展实例发出 `session_shutdown`，为新会话重新加载并重新绑定扩展，然后发出 `session_start` 以及 `reason: "new" | "resume"` 和 `previousSessionFile`。在 `session_shutdown` 中执行清理工作，然后在 `session_start` 中重新建立任何内存状态。

### session\_before\_fork

在通过 `/fork` 分叉或通过 `/clone` 克隆时触发。

```typescript
pi.on("session_before_fork", async (event, ctx) => {
  // event.entryId - 所选条目的 ID
  // event.position - "before" 表示 /fork，"at" 表示 /clone
  return { cancel: true }; // 取消 fork/clone
  // 或
  return { skipConversationRestore: true }; // 预留给未来的对话恢复控制
});
```

在成功分叉或克隆之后，pi 为旧的扩展实例发出 `session_shutdown`，为新会话重新加载并重新绑定扩展，然后发出 `session_start` 以及 `reason: "fork"` 和 `previousSessionFile`。在 `session_shutdown` 中执行清理工作，然后在 `session_start` 中重新建立任何内存状态。

### session\_before\_compact / session\_compact / session\_compact\_failed

在压缩时触发。详情请参阅 [compaction.md](https://pi.dev/docs/latest/compaction)。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // reason - "manual"（/compact）、"threshold" 或 "overflow"
  // willRetry - 压缩后是否重试中止的轮次（溢出恢复）

  // 取消：
  return { cancel: true };

  // 自定义摘要：
  return {
    compaction: {
      summary: "...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      // usage: summaryResponse.usage, // 可选；包含在会话总计中
    }
  };
});

pi.on("session_compact", async (event, ctx) => {
  // event.compactionEntry - 已保存的压缩
  // event.fromExtension - 是否由扩展提供
  // event.reason - "manual"（/compact）、"threshold" 或 "overflow"
  // event.willRetry - 压缩后是否重试中止的轮次（溢出恢复）
});

pi.on("session_compact_failed", async (event, ctx) => {
  // event.reason - "manual"（/compact）、"threshold" 或 "overflow"
  // event.errorMessage - 存在于非中止失败中
  // event.aborted - 对于已取消/中止的压缩为 true
  // event.willRetry - 中止的轮次是否会在压缩后重试
  // event.fromExtension - 是否正在使用扩展提供的压缩内容
});
```

### session\_before\_tree / session\_tree

在 `/tree` 导航时触发。请参阅 [Sessions](https://pi.dev/docs/latest/sessions) 了解树导航概念。

```typescript
pi.on("session_before_tree", async (event, ctx) => {
  const { preparation, signal } = event;
  return { cancel: true };
  // 或提供自定义摘要：
  return {
    summary: {
      summary: "...",
      // usage: summaryResponse.usage, // 可选；包含在会话总计中
      details: {},
    },
  };
});

pi.on("session_tree", async (event, ctx) => {
  // event.newLeafId, oldLeafId, summaryEntry, fromExtension
});
```

### session\_shutdown

在已启动的会话运行时被拆除之前触发。用它来清理从 `session_start` 或其他会话范围内的钩子打开的资源。

```typescript
pi.on("session_shutdown", async (event, ctx) => {
  // event.reason - "quit" | "reload" | "new" | "resume" | "fork"
  // event.targetSessionFile - 会话替换流程的目标会话
  // 清理、保存状态等
});
```

## Agent 事件

### before\_agent\_start

在用户提交提示词后、agent 循环之前触发。可以注入消息和/或修改系统提示词。

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  // event.prompt - 用户的提示词文本
  // event.images - 附加的图片（如果有）
  // event.systemPrompt - 当前链接的系统提示词（针对此处理程序）
  //   （包括来自更早的 before_agent_start 处理程序的更改）
  // event.systemPromptOptions - 用于构建系统提示词的结构化选项
  //   .customPrompt - 任何自定义系统提示词（来自 --system-prompt、SYSTEM.md 或自定义模板）
  //   .selectedTools - 当前在提示词中处于活动的工具
  //   .toolSnippets - 每个工具的单行描述
  //   .promptGuidelines - 自定义指南要点
  //   .appendSystemPrompt - 来自 --append-system-prompt 标志的文本
  //   .cwd - 工作目录
  //   .contextFiles - AGENTS.md 文件和其他加载的上下文文件
  //   .skills - 已加载的 skills

  return {
    // 注入持久消息（存储在会话中，发送给 LLM）
    message: {
      customType: "my-extension",
      content: "Additional context for the LLM",
      display: true,
    },
    // 替换此轮次的系统提示词（跨扩展链接）
    systemPrompt: event.systemPrompt + "\n\nExtra instructions for this turn...",
  };
});
```

`systemPromptOptions` 字段使扩展能够访问 Pi 用于构建系统提示词的相同结构化数据。这使你能够检查 Pi 已加载的内容——自定义提示词、指南、工具片段、上下文文件、skills——而无需重新发现资源或重新解析标志。当你的扩展需要对系统提示词进行深入的、知情的更改同时尊重用户提供的配置时，请使用它。

在 `before_agent_start` 内部，`event.systemPrompt` 和 `ctx.getSystemPrompt()` 都反映截至当前处理程序的链接系统提示词。后续的 `before_agent_start` 处理程序仍然可以再次修改它。

### agent\_start / agent\_end / agent\_settled

`agent_start` 在低级 agent 运行开始时触发。`agent_end` 在该运行结束时触发，但 Pi 可能仍会自动重试、自动压缩并重试，或继续执行排队的后续消息。对于需要知道 Pi 不会继续自动运行的状态集成，请使用 `agent_settled`。

```typescript
pi.on("agent_start", async (_event, ctx) => {});

pi.on("agent_end", async (event, ctx) => {
  // event.messages - 来自此次低级运行的消息
});

pi.on("agent_settled", async (_event, ctx) => {
  // 除非另一个扩展启动了新运行，否则 ctx.isIdle() 在此处为 true。
});
```

### ui\_prompt\_start / ui\_prompt\_end

用于阻止面向用户的扩展 UI 提示的通知型生命周期事件。它们在 `ctx.ui.select()`、`ctx.ui.confirm()`、`ctx.ui.input()`、`ctx.ui.editor()` 和 `ctx.ui.custom()` 周围触发，以便主机/状态集成可以报告"等待用户"而不是仅仅"运行中"。

嵌套或重叠的提示被合并为一个外部等待区间。处理程序以尽力方式调用，在显示或关闭提示之前不会被等待。

```typescript
pi.on("ui_prompt_start", async (event, ctx) => {
  // event.reason === "ui_prompt"
  // event.kind: "select" | "confirm" | "input" | "editor" | "custom"
  // event.title: 提示标题（可用时）
});

pi.on("ui_prompt_end", async (event, ctx) => {
  // Pi 不再等待该 UI 提示区间。
});
```

### turn\_start / turn\_end

为每个轮次（一次 LLM 响应 + 工具调用）触发。

```typescript
pi.on("turn_start", async (event, ctx) => {
  // event.turnIndex, event.timestamp
});

pi.on("turn_end", async (event, ctx) => {
  // event.turnIndex, event.message, event.toolResults
});
```

### message\_start / message\_update / message\_end

为消息生命周期更新触发。

- `message_start` 和 `message_end` 为 user、assistant 和 toolResult 消息触发。
- `message_update` 为 assistant 流式更新触发。
- `message_end` 处理程序可以返回 `{ message }` 来替换最终消息。替换必须保持相同的 `role`。
```typescript
pi.on("message_start", async (event, ctx) => {
  // event.message
});

pi.on("message_update", async (event, ctx) => {
  // event.message
  // event.assistantMessageEvent（逐 token 的流事件）
});

pi.on("message_end", async (event, ctx) => {
  if (event.message.role !== "assistant") return;

  return {
    message: {
      ...event.message,
      usage: {
        ...event.message.usage,
        cost: {
          ...event.message.usage.cost,
          total: 0.123,
        },
      },
    },
  };
});
```

### tool\_execution\_start / tool\_execution\_update / tool\_execution\_end

为工具执行生命周期更新触发。

在并行工具模式中：

- `tool_execution_start` 在预检阶段按 assistant 源顺序发出
- `tool_execution_update` 事件可能在工具之间交错
- `tool_execution_end` 在每个工具完成后按工具完成顺序发出
- 最终的 `toolResult` 消息事件仍然稍后按 assistant 源顺序发出
```typescript
pi.on("tool_execution_start", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.args
});

pi.on("tool_execution_update", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.args, event.partialResult
});

pi.on("tool_execution_end", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.result, event.isError
});
```

### context

在每次 LLM 调用之前触发。以非破坏性方式修改消息。请参阅 [Session Format](https://pi.dev/docs/latest/session-format) 了解消息类型。

```typescript
pi.on("context", async (event, ctx) => {
  // event.messages - 深拷贝，可安全修改
  const filtered = event.messages.filter(m => !shouldPrune(m));
  return { messages: filtered };
});
```

### before\_provider\_headers

在传出 HTTP headers 组装完成后触发。用它来添加、覆盖或删除请求 headers。

处理程序就地修改 `event.headers`。将键设置为字符串以添加或覆盖它，或设置为 `null` 以删除它。

```typescript
pi.on("before_provider_headers", (event, ctx) => {
  // 添加或覆盖 — 例如用于网关追踪/归属的会话 id
  event.headers["x-session-id"] = ctx.sessionManager.getSessionId();

  // 删除 pi 为此调用添加的追踪 header
  event.headers["X-OpenRouter-Title"] = null;
});
```

每个提供者请求运行一次；重试复用相同的 headers 而不是重新触发钩子。

### before\_provider\_request

在提供者特定的 payload 构建完成后、请求发送之前触发。处理程序按扩展加载顺序运行。返回 `undefined` 保持 payload 不变。返回任何其他值会替换后续处理程序和实际请求的 payload。

此钩子可以重写提供者级别的系统指令或完全删除它们。这些 payload 级别的更改不会反映在 `ctx.getSystemPrompt()` 中，后者报告的是 Pi 的系统提示字符串而不是最终序列化的提供者 payload。

```typescript
pi.on("before_provider_request", (event, ctx) => {
  console.log(JSON.stringify(event.payload, null, 2));

  // 可选：替换 payload
  // return { ...event.payload, temperature: 0 };
});
```

这主要用于调试提供者序列化和缓存行为。

### after\_provider\_response

在收到 HTTP 响应之后、其流 body 被消费之前触发。处理程序按扩展加载顺序运行。

```typescript
pi.on("after_provider_response", (event, ctx) => {
  // event.status - HTTP 状态码
  // event.headers - 规范化的响应 headers
  if (event.status === 429) {
    console.log("rate limited", event.headers["retry-after"]);
  }
});
```

Header 的可用性取决于提供者和传输方式。抽象 HTTP 响应的提供者可能不暴露 headers。

## 模型事件

### model\_select

当模型通过 `/model` 命令、模型切换（`Ctrl+P`）或会话恢复更改时触发。

```typescript
pi.on("model_select", async (event, ctx) => {
  // event.model - 新选择的模型
  // event.previousModel - 之前的模型（如果是首次选择则为 undefined）
  // event.source - "set" | "cycle" | "restore"

  const prev = event.previousModel
    ? `${event.previousModel.provider}/${event.previousModel.id}`
    : "none";
  const next = `${event.model.provider}/${event.model.id}`;

  ctx.ui.notify(`Model changed (${event.source}): ${prev} -> ${next}`, "info");
});
```

用它来在活动模型更改时更新 UI 元素（状态栏、底部栏）或执行模型特定的初始化。

### thinking\_level\_select

当思考级别更改时触发。这仅是通知型；处理程序返回值被忽略。

```typescript
pi.on("thinking_level_select", async (event, ctx) => {
  // event.level - 新选择的思考级别
  // event.previousLevel - 之前的思考级别

  ctx.ui.setStatus("thinking", `thinking: ${event.level}`);
});
```

用它来在 `pi.setThinkingLevel()`、模型更改或内置思考级别控制更改活动思考级别时更新扩展 UI。

## 工具事件

### tool\_call

在 `tool_execution_start` 之后、工具执行之前触发。**可以阻止。** 使用 `isToolCallEventType` 来缩小范围并获取类型化的输入。

在 `tool_call` 运行之前，pi 等待之前发出的 Agent 事件通过 `AgentSession` 完成排空。这意味着 `ctx.sessionManager` 通过当前的 assistant 工具调用消息保持最新。

在默认的并行工具执行模式中，来自同一 assistant 消息的兄弟工具调用被顺序预检，然后并发执行。`tool_call` 不保证在 `ctx.sessionManager` 中看到来自同一 assistant 消息的兄弟工具结果。

`event.input` 是可变的。就地修改它可以在执行前修补工具参数。

行为保证：

- 对 `event.input` 的修改会影响实际的工具执行
- 后续的 `tool_call` 处理程序可以看到早期处理程序所做的修改
- 修改后不会执行重新验证
- `tool_call` 的返回值通过 `{ block: true, reason?: string, terminate?: boolean }` 控制阻止
- `terminate` 仅适用于被阻止的调用；只有当批次中每个最终结果都是终止性时，agent 才会提前停止
```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

pi.on("tool_call", async (event, ctx) => {
  // event.toolName - "bash"、"read"、"write"、"edit" 等
  // event.toolCallId
  // event.input - 工具参数（可变的）

  // 内置工具：不需要类型参数
  if (isToolCallEventType("bash", event)) {
    // event.input 的类型为 { command: string; timeout?: number }
    event.input.command = `source ~/.profile\n${event.input.command}`;

    if (event.input.command.includes("rm -rf")) {
      return { block: true, reason: "Dangerous command", terminate: true };
    }
  }

  if (isToolCallEventType("read", event)) {
    // event.input 的类型为 { path: string; offset?: number; limit?: number }
    console.log(`Reading: ${event.input.path}`);
  }
});
```

### 自定义工具输入的类型

自定义工具应导出其输入类型：

```typescript
// my-extension.ts
export type MyToolInput = Static<typeof myToolSchema>;
```

使用带显式类型参数的 `isToolCallEventType`：

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import type { MyToolInput } from "my-extension";

pi.on("tool_call", (event) => {
  if (isToolCallEventType<"my_tool", MyToolInput>("my_tool", event)) {
    event.input.action;  // 已类型化
  }
});
```

### tool\_result

在工具执行完成后、`tool_execution_end` 和最终工具结果消息事件发出之前触发。**可以修改结果。**

在并行工具模式中，`tool_result` 和 `tool_execution_end` 可能按工具完成顺序交错，而最终的 `toolResult` 消息事件仍然稍后按 assistant 源顺序发出。

`tool_result` 处理程序像中间件一样链接：

- 处理程序按扩展加载顺序运行
- 每个处理程序看到前一个处理程序更改后的最新结果
- 处理程序可以返回部分补丁（`content`、`details`、`isError` 或 `usage`）；省略的字段保持其当前值

在处理程序内部使用 `ctx.signal` 进行嵌套异步工作。这使 Esc 可以取消模型调用、`fetch()` 以及扩展启动的其他可中止操作。

```typescript
import { isBashToolResult } from "@earendil-works/pi-coding-agent";

pi.on("tool_result", async (event, ctx) => {
  // event.toolName, event.toolCallId, event.input
  // event.content, event.details, event.isError, event.usage

  if (isBashToolResult(event)) {
    // event.details 的类型为 BashToolDetails
  }

  const response = await fetch("https://example.com/summarize", {
    method: "POST",
    body: JSON.stringify({ content: event.content }),
    signal: ctx.signal,
  });

  // 修改结果：
  return { content: [...], details: {...}, isError: false, usage: nestedModelUsage };
});
```

## 用户 Bash 事件

### user\_bash

当用户执行 `!` 或 `!!` 命令时触发。**可以拦截。**

```typescript
import { createLocalBashOperations } from "@earendil-works/pi-coding-agent";

pi.on("user_bash", (event, ctx) => {
  // event.command - bash 命令
  // event.excludeFromContext - 如果是 !! 前缀则为 true
  // event.cwd - 工作目录

  // 选项 1：提供自定义操作（例如 SSH）
  return { operations: remoteBashOps };

  // 选项 2：包装 pi 的内置本地 bash 后端
  const local = createLocalBashOperations();
  return {
    operations: {
      exec(command, cwd, options) {
        return local.exec(`source ~/.profile\n${command}`, cwd, options);
      }
    }
  };

  // 选项 3：完全替换 - 直接返回结果
  return { result: { output: "...", exitCode: 0, cancelled: false, truncated: false } };
});
```

## 输入事件

### input

当接收到用户输入时触发，在扩展命令被检查之后但在 skill 和模板扩展之前。事件看到原始输入文本，因此 `/skill:foo` 和 `/template` 尚未被扩展。

**处理顺序：**

1. 首先检查扩展命令（`/cmd`）- 如果找到，处理程序运行并跳过 input 事件
2. `input` 事件触发 - 可以拦截、转换或处理
3. 如果未处理：skill 命令（`/skill:name`）被扩展为 skill 内容
4. 如果未处理：提示词模板（`/template`）被扩展为模板内容
5. Agent 处理开始（`before_agent_start` 等）
```typescript
pi.on("input", async (event, ctx) => {
  // event.text - 原始输入（在 skill/template 扩展之前）
  // event.images - 附加的图片，如果有
  // event.source - "interactive"（键入）、"rpc"（API）或 "extension"（通过 sendUserMessage）
  // event.streamingBehavior - "steer" | "followUp" | undefined
  //   空闲时为 undefined，流中断时为 "steer"，
  //   排队直到 agent 完成的消息为 "followUp"

  // 转换：在扩展之前重写输入
  if (event.text.startsWith("?quick "))
    return { action: "transform", text: `Respond briefly: ${event.text.slice(7)}` };

  // 处理：不使用 LLM 响应（扩展显示自己的反馈）
  if (event.text === "ping") {
    ctx.ui.notify("pong", "info");
    return { action: "handled" };
  }

  // 按来源路由：跳过扩展注入消息的处理
  if (event.source === "extension") return { action: "continue" };

  // 在扩展之前拦截 skill 命令
  if (event.text.startsWith("/skill:")) {
    // 可以转换、阻止或让其通过
  }

  return { action: "continue" };  // 默认：传递到扩展
});
```

**结果：**

- `continue` - 不变地传递（如果处理程序没有返回值则为默认）
- `transform` - 修改文本/图片，然后继续到扩展
- `handled` - 完全跳过 agent（第一个返回此值的处理程序获胜）

转换在处理程序之间链接。参见 [input-transform.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/input-transform.ts) 和 [input-transform-streaming.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/input-transform-streaming.ts) 了解 `streamingBehavior` 感知的路由。

## 相关文档

- [编写扩展与异步工厂](./4-writing-extensions) - 扩展工厂函数、异步初始化
- [ExtensionContext 与 API](./6-context-api) - ctx 对象和 pi 方法
- [自定义工具](./8-custom-tools) - registerTool 详解
- [自定义 UI](./9-custom-ui) - 对话框、组件、编辑器

<!-- [AGC:END] -->
