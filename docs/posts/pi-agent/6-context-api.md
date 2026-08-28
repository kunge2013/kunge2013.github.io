---
title: Pi Coding Agent ExtensionContext 与 API
description: Pi Agent ExtensionContext 属性、ExtensionCommandContext 会话控制方法详解
tags: [Pi Agent, 扩展, Context, API]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# Pi Coding Agent ExtensionContext 与 API

<!-- [AGC:START] tool=Cc author=fangkun -->

## ExtensionContext

所有处理程序接收 `ctx: ExtensionContext`。

### ctx.ui

用于用户交互的 UI 方法。完整详情请参阅 [自定义 UI](./9-custom-ui)。

### ctx.mode

当前运行模式：`"tui"`、`"rpc"`、`"json"` 或 `"print"`。使用 `ctx.mode === "tui"` 来保护仅限终端的功能，如 `custom()`、组件工厂、终端输入和直接 TUI 渲染。

### ctx.hasUI

在 TUI 和 RPC 模式下为 `true`。在 print 模式（`-p`）和 JSON 模式下为 `false`。用它来保护对话框方法（`select`、`confirm`、`input`、`editor`）和在 TUI 和 RPC 模式下都有效的即发即忘方法（`notify`、`setStatus`、`setWidget`、`setTitle`、`setEditorText`）。在 RPC 模式下，一些 TUI 特定的方法是空操作或返回默认值（参见 [rpc.md](https://pi.dev/docs/latest/rpc#extension-ui-protocol)）。

### ctx.cwd

当前工作目录。

在构建项目本地配置路径时使用 `CONFIG_DIR_NAME` 而不是硬编码 `.pi`。品牌化的发行版可以使用不同的配置目录名称。

```typescript
import { CONFIG_DIR_NAME, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    const projectConfigPath = join(ctx.cwd, CONFIG_DIR_NAME, "my-extension.json");
    // ...
  });
}
```

### ctx.isProjectTrusted()

返回当前会话上下文的项目本地信任是否处于活动状态。这包括临时信任决策和 CLI 信任覆盖，而不仅仅是全局信任存储中保存的决策。

在读取应仅对受信任项目生效的项目本地扩展配置之前使用此方法。

### ctx.sessionManager

对会话状态的只读访问。完整 SessionManager API 和条目类型请参阅 [Session Format](https://pi.dev/docs/latest/session-format)。

对于 `tool_call`，此状态在处理程序运行之前通过当前 assistant 消息同步。在并行工具执行模式中，它仍然不保证包含来自同一 assistant 消息的兄弟工具结果。

```typescript
ctx.sessionManager.getEntries()             // 所有条目
ctx.sessionManager.getBranch()              // 当前分支
ctx.sessionManager.buildContextEntries()    // 应用了压缩的活动分支条目
ctx.sessionManager.getLeafId()              // 当前叶子条目 ID
```

### ctx.modelRegistry / ctx.model / ctx.thinkingLevel / ctx.scopedModels

访问模型、提供者和已解析的身份验证。`ctx.modelRegistry.getProvider(id)` 返回有效的 pi-ai 提供者，而 `getProviderAuth(id)` 解析其当前 API 密钥、headers、base URL 和提供者范围的环境，无需加载模型。`ctx.model` 是活动模型，`ctx.thinkingLevel` 是其当前有效的思考级别。

`ctx.scopedModels` 是作用域到当前会话的模型的只读列表——与 `/scoped-models` 命令显示的集合相同。它在会话启动时从 `--models` CLI 标志和 `enabledModels` 设置解析（使用 minimatch 对 `provider/modelId` 或单独的 `modelId` 进行匹配）。当没有配置作用域时它为空，这意味着每个可用模型都可使用。每个条目是 `{ model, thinkingLevel? }`，其中 `thinkingLevel` 仅在模式固定它时设置（例如 `anthropic/*:high`）。用它来填充与内置选择器镜像的模型选择器，而不是通过 `ctx.modelRegistry.getAvailable()` 枚举整个目录。

### ctx.signal

当前的 agent 中止信号，当没有 agent 轮次活动时为 `undefined`。

将它用于扩展处理程序启动的可中止嵌套工作，例如：

- `fetch(..., { signal: ctx.signal })`
- 接受 `signal` 的模型调用
- 接受 `AbortSignal` 的文件或进程辅助方法

`ctx.signal` 通常在活动轮次事件（如 `tool_call`、`tool_result`、`message_update` 和 `turn_end`）期间定义。在空闲或非轮次上下文（如会话事件、扩展命令和 pi 空闲时触发的快捷键）中通常为 `undefined`。

```typescript
pi.on("tool_result", async (event, ctx) => {
  const response = await fetch("https://example.com/api", {
    method: "POST",
    body: JSON.stringify(event),
    signal: ctx.signal,
  });

  const data = await response.json();
  return { details: data };
});
```

### ctx.isIdle() / ctx.abort() / ctx.hasPendingMessages()

控制流辅助方法。`ctx.isIdle()` 在 Pi 处理 agent 运行、自动重试、自动压缩重试或排队延续时为 false。

### ctx.shutdown()

请求优雅关闭 pi。

- **交互模式：** 延迟到 agent 变为空闲（处理完所有排队的引导和后续消息后）。
- **RPC 模式：** 延迟到下一个空闲状态（完成当前命令响应后，等待下一个命令时）。
- **Print 模式：** 空操作。当所有提示词处理完毕后进程自动退出。

在退出前向所有扩展发出 `session_shutdown` 事件。在所有上下文（事件处理程序、工具、命令、快捷键）中可用。

```typescript
pi.on("tool_call", (event, ctx) => {
  if (isFatal(event.input)) {
    ctx.shutdown();
  }
});
```

### ctx.getContextUsage()

返回活动模型的当前上下文使用量。优先使用最后的 assistant 使用量，然后估算尾部消息的 token 数。

```typescript
const usage = ctx.getContextUsage();
if (usage && usage.tokens > 100_000) {
  // ...
}
```

### ctx.compact()

触发压缩而不等待完成。使用 `onComplete` 和 `onError` 进行后续操作。

```typescript
ctx.compact({
  customInstructions: "Focus on recent changes",
  onComplete: (result) => {
    ctx.ui.notify("Compaction completed", "info");
  },
  onError: (error) => {
    ctx.ui.notify(`Compaction failed: ${error.message}`, "error");
  },
});
```

### ctx.getSystemPrompt()

返回 Pi 的当前系统提示字符串。

- 在 `before_agent_start` 期间，这反映截至当前轮次已链接的系统提示更改。
- 它不包括后续的 `context` 消息修改。
- 它不包括 `before_provider_request` payload 重写。
- 如果后加载的扩展在你的扩展之后运行，它们仍然可以更改最终发送的内容。
```typescript
pi.on("before_agent_start", (event, ctx) => {
  const prompt = ctx.getSystemPrompt();
  console.log(`System prompt length: ${prompt.length}`);
});
```

## ExtensionCommandContext

命令处理程序接收 `ExtensionCommandContext`，它扩展了 `ExtensionContext` 并带有会话控制方法。这些仅在命令中可用，因为如果从事件处理程序调用可能会导致死锁。

### ctx.getSystemPromptOptions()

返回 Pi 当前用于构建系统提示词的基础输入。

```typescript
const options = ctx.getSystemPromptOptions();
const contextPaths = options.contextFiles?.map((file) => file.path) ?? [];
```

这与 `before_agent_start` 的 `event.systemPromptOptions` 具有相同的形状和可变性：自定义提示词、活动工具、工具片段、提示词指南、追加的系统提示文本、cwd、加载的上下文文件和加载的 skills。它可能包含完整的上下文文件内容，因此将其视为敏感的扩展本地数据，避免通过命令列表、日志或自动完成元数据暴露它。

它报告当前的基础提示词输入。它不包括每轮 `before_agent_start` 链接的系统提示更改、后续的 `context` 事件消息修改或 `before_provider_request` payload 重写。

### ctx.waitForIdle()

等待 agent 完全稳定，包括自动重试、自动压缩重试和排队延续：

```typescript
pi.registerCommand("my-cmd", {
  handler: async (args, ctx) => {
    await ctx.waitForIdle();
    // Agent 现在空闲，可以安全修改会话
  },
});
```

### ctx.newSession(options?)

创建新会话：

```typescript
const parentSession = ctx.sessionManager.getSessionFile();
const kickoff = "Continue in the replacement session";

const result = await ctx.newSession({
  parentSession,
  setup: async (sm) => {
    sm.appendMessage({
      role: "user",
      content: [{ type: "text", text: "Context from previous session..." }],
      timestamp: Date.now(),
    });
  },
  withSession: async (ctx) => {
    // 仅在此处使用替换会话的 ctx。
    await ctx.sendUserMessage(kickoff);
  },
});

if (result.cancelled) {
  // 扩展取消了新会话
}
```

选项：

- `parentSession`: 在新会话头部记录的父会话文件
- `setup`: 在 `withSession` 运行之前修改新会话的 `SessionManager`
- `withSession`: 针对新的替换会话上下文运行切换后工作。不要使用捕获的旧 `pi` / 命令 `ctx`；参见[会话替换生命周期和陷阱](#会话替换生命周期和陷阱)。

### ctx.fork(entryId, options?)

从特定条目分叉，创建新的会话文件：

```typescript
const result = await ctx.fork("entry-id-123", {
  withSession: async (ctx) => {
    // 仅在此处使用替换会话的 ctx。
    ctx.ui.notify("Now in the forked session", "info");
  },
});
if (result.cancelled) {
  // 扩展取消了分叉
}

const cloneResult = await ctx.fork("entry-id-456", { position: "at" });
if (cloneResult.cancelled) {
  // 扩展取消了克隆
}
```

选项：

- `position`: `"before"`（默认）在所选用户消息之前分叉，将该提示词恢复到编辑器中
- `position`: `"at"` 复制通过所选条目的活动路径，不恢复编辑器文本
- `withSession`: 针对新的替换会话上下文运行切换后工作。不要使用捕获的旧 `pi` / 命令 `ctx`；参见[会话替换生命周期和陷阱](#会话替换生命周期和陷阱)。

### ctx.navigateTree(targetId, options?)

导航到会话树中的不同点：

```typescript
const result = await ctx.navigateTree("entry-id-456", {
  summarize: true,
  customInstructions: "Focus on error handling changes",
  replaceInstructions: false, // true = 完全替换默认提示词
  label: "review-checkpoint",
});
```

选项：

- `summarize`: 是否生成已放弃分支的摘要
- `customInstructions`: 给摘要器的自定义指令
- `replaceInstructions`: 如果为 true，`customInstructions` 替换默认提示词而不是追加
- `label`: 附加到分支摘要条目（或如果不摘要则为目标条目）的标签

### ctx.switchSession(sessionPath, options?)

切换到不同的会话文件：

```typescript
const result = await ctx.switchSession("/path/to/session.jsonl", {
  withSession: async (ctx) => {
    await ctx.sendUserMessage("Resume work in the replacement session");
  },
});
if (result.cancelled) {
  // 扩展通过 session_before_switch 取消了切换
}
```

选项：

- `withSession`: 针对新的替换会话上下文运行切换后工作。不要使用捕获的旧 `pi` / 命令 `ctx`；参见[会话替换生命周期和陷阱](#会话替换生命周期和陷阱)。

要发现可用会话，使用静态方法 `SessionManager.list()` 或 `SessionManager.listAll()`：

```typescript
import { SessionManager } from "@earendil-works/pi-coding-agent";

pi.registerCommand("switch", {
  description: "Switch to another session",
  handler: async (args, ctx) => {
    const sessions = await SessionManager.list(ctx.cwd);
    if (sessions.length === 0) return;
    const choice = await ctx.ui.select(
      "Pick session:",
      sessions.map(s => s.file),
    );
    if (choice) {
      await ctx.switchSession(choice, {
        withSession: async (ctx) => {
          ctx.ui.notify("Switched session", "info");
        },
      });
    }
  },
});
```

### 会话替换生命周期和陷阱

`withSession` 接收一个新的 `ReplacedSessionContext`，它扩展了 `ExtensionCommandContext` 并带有绑定到替换会话的异步 `sendMessage()` 和 `sendUserMessage()` 辅助方法。

生命周期和陷阱：

- `withSession` 仅在旧会话已发出 `session_shutdown`、旧运行时已被拆除、替换会话已重新绑定且新扩展实例已收到 `session_start` 之后运行。
- 回调仍在原始闭包中执行，而不是在新扩展实例内部。这意味着你的旧扩展实例可能在 `withSession` 开始之前已经运行了其关闭清理。
- 捕获的旧 `pi` / 旧命令 `ctx` 的会话绑定对象在替换后已过期，如果使用将抛出异常。仅使用传递给 `withSession` 的 `ctx` 进行会话绑定工作。
- 之前提取的原始对象仍然由你负责。例如，如果你在替换前捕获了 `const sm = ctx.sessionManager`，`sm` 仍然是旧的 `SessionManager` 对象。替换后不要重用它。
- `withSession` 中的代码应假设你的 `session_shutdown` 处理程序已失效的任何状态已经消失。仅捕获能干净通过关闭的简单数据，如字符串、id 和序列化配置。

安全模式：

```typescript
pi.registerCommand("handoff", {
  handler: async (_args, ctx) => {
    const kickoff = "Continue from the replacement session";
    await ctx.newSession({
      withSession: async (ctx) => {
        await ctx.sendUserMessage(kickoff);
      },
    });
  },
});
```

不安全模式：

```typescript
pi.registerCommand("handoff", {
  handler: async (_args, ctx) => {
    const oldSessionManager = ctx.sessionManager;
    await ctx.newSession({
      withSession: async (_ctx) => {
        // 过期的旧对象：不要这样做
        oldSessionManager.getSessionFile();
        pi.sendUserMessage("wrong");
      },
    });
  },
});
```

### ctx.reload()

运行与 `/reload` 相同的重载流程。

```typescript
pi.registerCommand("reload-runtime", {
  description: "Reload extensions, skills, prompts, themes, and context files",
  handler: async (_args, ctx) => {
    await ctx.reload();
    return;
  },
});
```

重要行为：

- `await ctx.reload()` 为当前扩展运行时发出 `session_shutdown`
- 然后重新加载资源并发出 `session_start`（`reason: "reload"`）和 `resources_discover`（reason `"reload"`）
- 当前运行的命令处理程序仍在旧调用帧中继续
- `await ctx.reload()` 之后的代码仍从预重载版本运行
- `await ctx.reload()` 之后的代码不能假设旧的内存中扩展状态仍然有效
- 处理程序返回后，后续的命令/事件/工具调用使用新的扩展版本

为了可预测的行为，将重载视为该处理程序的终止操作（`await ctx.reload(); return;`）。

工具使用 `ExtensionContext` 运行，因此不能直接调用 `ctx.reload()`。使用命令作为重载入口点，然后公开一个工具将该命令作为后续用户消息排队。

LLM 可以调用以触发重载的示例工具：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("reload-runtime", {
    description: "Reload extensions, skills, prompts, themes, and context files",
    handler: async (_args, ctx) => {
      await ctx.reload();
      return;
    },
  });

  pi.registerTool({
    name: "reload_runtime",
    label: "Reload Runtime",
    description: "Reload extensions, skills, prompts, themes, and context files",
    parameters: Type.Object({}),
    async execute() {
      pi.sendUserMessage("/reload-runtime", { deliverAs: "followUp" });
      return {
        content: [{ type: "text", text: "Queued /reload-runtime as a follow-up command." }],
      };
    },
  });
}
```

## 相关文档

- [事件系统](./5-events) - 完整的生命周期事件参考
- [ExtensionAPI 方法](./7-api-methods) - pi 对象的所有方法
- [自定义工具](./8-custom-tools) - registerTool 详解
- [自定义 UI](./9-custom-ui) - 对话框、组件、编辑器

<!-- [AGC:END] -->
