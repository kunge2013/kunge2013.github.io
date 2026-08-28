---
title: Pi Coding Agent ExtensionAPI 方法
description: Pi Agent ExtensionAPI 完整方法参考 - 事件订阅、工具注册、消息、命令、提供者管理
tags: [Pi Agent, 扩展, API, ExtensionAPI]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# Pi Coding Agent ExtensionAPI 方法

<!-- [AGC:START] tool=Cc author=fangkun -->

## pi.on(event, handler)

订阅事件。事件类型和返回值请参阅 [事件系统](./5-events)。

## pi.registerTool(definition)

注册 LLM 可调用的自定义工具。完整详情请参阅 [自定义工具](./8-custom-tools)。

`pi.registerTool()` 在扩展加载期间和启动后都可以工作。你可以在 `session_start`、命令处理程序或其他事件处理程序内部调用它。新工具在同一会话中立即刷新，因此它们出现在 `pi.getAllTools()` 中并且 LLM 无需 `/reload` 即可调用。

使用 `pi.setActiveTools()` 在运行时启用或禁用工具（包括动态添加的工具）。

使用 `promptSnippet` 让自定义工具在 `Available tools` 中获得单行条目，使用 `promptGuidelines` 在工具活动时向默认的 `Guidelines` 部分追加工具特定的要点。

**重要：** `promptGuidelines` 要点以平面方式追加到 `Guidelines` 部分，没有工具名称前缀。每个指南必须命名它引用的工具——避免"Use this tool when..."因为 LLM 无法分辨"this"指的是哪个工具。请写"Use my\_tool when..."。

完整示例参见 [dynamic-tools.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/dynamic-tools.ts)。

```typescript
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";

pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "What this tool does",
  promptSnippet: "Summarize or transform text according to action",
  promptGuidelines: ["Use my_tool when the user asks to summarize previously generated text."],
  parameters: Type.Object({
    action: StringEnum(["list", "add"] as const),
    text: Type.Optional(Type.String()),
  }),
  prepareArguments(args) {
    // 可选的兼容性垫片。在 schema 验证之前运行。
    return args;
  },

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // 流式进度
    onUpdate?.({ content: [{ type: "text", text: "Working..." }] });

    return {
      content: [{ type: "text", text: "Done" }],
      details: { result: "..." },
    };
  },

  // 可选：自定义渲染
  renderCall(args, theme, context) { ... },
  renderResult(result, options, theme, context) { ... },
});
```

## pi.sendMessage(message, options?)

向会话中注入自定义消息。自定义消息参与 LLM 上下文。对于不应发送给 LLM 的持久 TUI 内容，请使用 `pi.appendEntry()` 配合 `pi.registerEntryRenderer()`。

```typescript
pi.sendMessage({
  customType: "my-extension",
  content: "Message text",
  display: true,
  details: { ... },
}, {
  triggerTurn: true,
  deliverAs: "steer",
});
```

**选项：**

- `deliverAs` - 传递模式：
  - `"steer"`（默认）- 在流式传输时排队消息。在当前 assistant 轮次完成执行其工具调用之后、下一次 LLM 调用之前传递。
  - `"followUp"` - 等待 agent 完成。仅在 agent 没有更多工具调用时传递。
  - `"nextTurn"` - 排队等待下一个用户提示词。不中断或触发任何操作。
- `triggerTurn: true` - 如果 agent 空闲，立即触发 LLM 响应。仅适用于 `"steer"` 和 `"followUp"` 模式（对 `"nextTurn"` 忽略）。

## pi.sendUserMessage(content, options?)

向 agent 发送用户消息。与发送自定义消息的 `sendMessage()` 不同，这发送的是看起来像用户键入的实际用户消息。始终触发一个轮次。

```typescript
// 简单文本消息
pi.sendUserMessage("What is 2+2?");

// 带内容数组（文本 + 图片）
pi.sendUserMessage([
  { type: "text", text: "Describe this image:" },
  { type: "image", source: { type: "base64", mediaType: "image/png", data: "..." } },
]);

// 在流式传输期间 - 必须指定传递模式
pi.sendUserMessage("Focus on error handling", { deliverAs: "steer" });
pi.sendUserMessage("And then summarize", { deliverAs: "followUp" });

// 启用扩展命令分发和 skill/提示词模板扩展
pi.sendUserMessage("/review src/index.ts", { expandPromptTemplates: true });
```

**选项：**

- `deliverAs` - 在 agent 流式传输时必需：
  - `"steer"` - 在当前 assistant 轮次完成执行其工具调用后排队消息
  - `"followUp"` - 等待 agent 完成所有工具
- `expandPromptTemplates` - 分发扩展命令并扩展 skill 命令和提示词模板。默认为 `false`。

当非流式传输时，消息立即发送并触发新轮次。当流式传输且没有 `deliverAs` 时，抛出错误。

完整示例参见 [send-user-message.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/send-user-message.ts)。

## pi.appendEntry(customType, data?)

持久化扩展数据。自定义条目不参与 LLM 上下文。在交互模式中，当与 `pi.registerEntryRenderer()` 配合使用时，它们也可以在聊天记录中渲染。

```typescript
pi.appendEntry("my-state", { count: 42 });
pi.appendEntry("status-card", { title: "Indexed files", count: 17 });

// 在重载时恢复
pi.on("session_start", async (_event, ctx) => {
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === "my-state") {
      // 从 entry.data 重建
    }
  }
});
```

## pi.setSessionName(name)

设置会话显示名称（在会话选择器中显示，代替第一条消息）。

```typescript
pi.setSessionName("Refactor auth module");
```

## pi.getSessionName()

获取当前会话名称（如果已设置）。

```typescript
const name = pi.getSessionName();
if (name) {
  console.log(`Session: ${name}`);
}
```

## pi.setLabel(entryId, label)

在条目上设置或清除标签。标签是用于书签和导航的用户定义标记（在 `/tree` 选择器中显示）。

```typescript
// 设置标签
pi.setLabel(entryId, "checkpoint-before-refactor");

// 清除标签
pi.setLabel(entryId, undefined);

// 通过 sessionManager 读取标签
const label = ctx.sessionManager.getLabel(entryId);
```

标签在会话中持久存在并在重启后保留。用它们标记对话树中的重要点（轮次、检查点）。

## pi.registerCommand(name, options)

注册命令。

如果多个扩展注册相同的命令名称，pi 保留所有扩展并按加载顺序分配数字调用后缀，例如 `/review:1` 和 `/review:2`。

```typescript
pi.registerCommand("stats", {
  description: "Show session statistics",
  handler: async (args, ctx) => {
    const count = ctx.sessionManager.getEntries().length;
    ctx.ui.notify(`${count} entries`, "info");
  }
});
```

可选：为 `/command ...` 添加参数自动完成：

```typescript
import type { AutocompleteItem } from "@earendil-works/pi-tui";

pi.registerCommand("deploy", {
  description: "Deploy to an environment",
  getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
    const envs = ["dev", "staging", "prod"];
    const items = envs.map((e) => ({ value: e, label: e }));
    const filtered = items.filter((i) => i.value.startsWith(prefix));
    return filtered.length > 0 ? filtered : null;
  },
  handler: async (args, ctx) => {
    ctx.ui.notify(`Deploying: ${args}`, "info");
  },
});
```

## pi.getCommands()

获取当前会话中可通过 `prompt` 调用的斜杠命令。包括扩展命令、提示词模板和 skill 命令。列表与 RPC `get_commands` 排序一致：先是扩展，然后是模板，最后是 skills。

```typescript
const commands = pi.getCommands();
const bySource = commands.filter((command) => command.source === "extension");
const userScoped = commands.filter((command) => command.sourceInfo.scope === "user");
```

每个条目具有如下形状：

```typescript
{
  name: string; // 可调用命令名称，不带前导斜杠。可能带有后缀如 "review:1"
  description?: string;
  source: "extension" | "prompt" | "skill";
  sourceInfo: {
    path: string;
    source: string;
    scope: "user" | "project" | "temporary";
    origin: "package" | "top-level";
    baseDir?: string;
  };
}
```

使用 `sourceInfo` 作为规范的来源字段。不要从命令名称或特殊路径解析推断所有权。

内置交互命令（如 `/model` 和 `/settings`）不包含在此处。它们仅在交互模式中处理，如果通过 `prompt` 发送将不会执行。

## pi.registerMessageRenderer(customType, renderer)

为你的 `customType` 的自定义消息注册自定义 TUI 渲染器。自定义消息通过 `pi.sendMessage()` 创建并参与 LLM 上下文。参见 [自定义 UI](./9-custom-ui)。

## pi.registerMarkdownTransformer(transformer)

为普通用户文本、assistant 文本和思考块中的 Markdown 注册转换器。转换器按扩展加载顺序运行，每个转换器接收前一个转换器返回的 Markdown。链完成后，Pi 使用内置渲染器渲染转换后的内容。

转换器接收 Markdown 字符串和包含以下内容的上下文：

- `messageType` — `"user"`、`"assistant"` 或 `"assistant-thinking"`
- `isStreaming` — 对于部分 assistant 更新为 `true`；对于 user、最终 assistant 和恢复的消息为 `false`
- `availableWidth` — 转换后的 Markdown 内容可用的精确终端列数

返回转换后的 Markdown：

```typescript
pi.registerMarkdownTransformer((markdown, { messageType, isStreaming }) => {
  if (isStreaming || messageType === "assistant-thinking") return markdown;
  return markdown.replaceAll("-->", "→");
});
```

如果转换器抛出异常，Pi 保留目前生成的 Markdown 并继续下一个转换器。此钩子仅用于显示：原始消息在会话和模型上下文中保持不变。

## pi.registerEntryRenderer(customType, renderer)

为你的 `customType` 的自定义条目注册自定义 TUI 渲染器。自定义条目通过 `pi.appendEntry()` 创建，不参与 LLM 上下文。

```typescript
import { Box, Text } from "@earendil-works/pi-tui";

pi.registerEntryRenderer("status-card", (entry, { expanded }, theme) => {
  const data = entry.data as { title: string; count: number };
  const box = new Box(1, 1, (text) => theme.bg("customMessageBg", text));
  box.addChild(new Text(`${theme.bold(data.title)}: ${data.count}`));
  if (expanded) {
    box.addChild(new Text(theme.fg("dim", JSON.stringify(data, null, 2))));
  }
  return box;
});

pi.appendEntry("status-card", { title: "Indexed files", count: 17 });
```

## pi.registerShortcut(shortcut, options)

注册键盘快捷键。快捷键格式和内置快捷键绑定请参阅 [keybindings.md](https://pi.dev/docs/latest/keybindings)。

```typescript
pi.registerShortcut("ctrl+shift+p", {
  description: "Toggle plan mode",
  handler: async (ctx) => {
    ctx.ui.notify("Toggled!");
  },
});
```

## pi.registerFlag(name, options)

注册 CLI 标志。

```typescript
pi.registerFlag("plan", {
  description: "Start in plan mode",
  type: "boolean",
  default: false,
});

// 检查值
if (pi.getFlag("plan")) {
  // Plan mode 已启用
}
```

## pi.exec(command, args, options?)

执行 shell 命令。

```typescript
const result = await pi.exec("git", ["status"], { signal, timeout: 5000 });
// result.stdout, result.stderr, result.code, result.killed
```

## pi.getActiveTools() / pi.getAllTools() / pi.setActiveTools(names)

管理活动工具。这适用于内置工具和动态注册的工具。`pi.getActiveTools()` 将活动工具名称作为 `string[]` 返回；`pi.getAllTools()` 返回所有已配置工具的元数据。

```typescript
const active = pi.getActiveTools(); // ["read", "bash", ...]
const all = pi.getAllTools();
const builtinTools = all.filter((t) => t.sourceInfo.source === "builtin");
const extensionTools = all.filter((t) => t.sourceInfo.source !== "builtin" && t.sourceInfo.source !== "sdk");
pi.setActiveTools([...new Set([...active, "my_custom_tool"])]); // 保留当前工具并启用 my_custom_tool
pi.setActiveTools(["read", "bash"]); // 切换到只读
```

`pi.getAllTools()` 返回 `name`、`description`、`parameters`、`promptGuidelines` 和 `sourceInfo`。

常见的 `sourceInfo.source` 值：

- 内置工具为 `builtin`
- 通过 `createAgentSession({ customTools })` 传递的工具为 `sdk`
- 扩展注册的工具的扩展来源元数据

## pi.setModel(model)

设置当前模型。如果模型没有可用的 API 密钥则返回 `false`。配置自定义模型请参阅 [models.md](https://pi.dev/docs/latest/models)。

```typescript
const model = ctx.modelRegistry.find("anthropic", "claude-sonnet-4-5");
if (model) {
  const success = await pi.setModel(model);
  if (!success) {
    ctx.ui.notify("No API key for this model", "error");
  }
}
```

## pi.getThinkingLevel() / pi.setThinkingLevel(level)

获取或设置思考级别。级别被限制在模型能力范围内（非推理模型始终使用 "off"）。更改会触发 `thinking_level_select`。

```typescript
const current = pi.getThinkingLevel();  // "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"
pi.setThinkingLevel("high");
```

## pi.events

用于扩展之间通信的共享事件总线：

```typescript
pi.events.on("my:event", (data) => { ... });
pi.events.emit("my:event", { ... });
```

## pi.registerProvider(name, config)

动态注册或覆盖模型提供者。对代理、自定义端点或团队范围的模型配置很有用。

在扩展工厂函数期间进行的调用会被排队，并在 runner 初始化后一次性应用。在此之后进行的调用——例如来自跟随用户设置流程的命令处理程序——会立即生效，无需 `/reload`。

动态提供者可以实现 `refreshModels`。Pi 在模型刷新期间调用它，通过提供者同步发布返回的列表，并传递规范的凭证/存储目录/网络/信号上下文。

```typescript
import { createProvider, openAICompletionsApi } from "@earendil-works/pi-ai";

const provider = createProvider({
  id: "local-server",
  name: "Local Server",
  baseUrl: "http://localhost:8080/v1",
  auth: {
    apiKey: {
      name: "Local server setup",
      async login(interaction) {
        return {
          type: "api_key",
          key: await interaction.prompt({ type: "secret", message: "API key" }),
        };
      },
      async resolve({ credential }) {
        return credential?.key
          ? { auth: { apiKey: credential.key }, source: "stored API key" }
          : undefined;
      },
    },
  },
  models: [],
  api: openAICompletionsApi(),
});

pi.registerProvider(provider);

// 注册带自定义模型的新提供者
pi.registerProvider("my-proxy", {
  name: "My Proxy",
  baseUrl: "https://proxy.example.com",
  apiKey: "$PROXY_API_KEY",
  api: "anthropic-messages",
  models: [
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude 4 Sonnet (proxy)",
      reasoning: false,
      input: ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 16384
    }
  ]
});

// 覆盖现有提供者的 baseUrl（保留所有模型）
pi.registerProvider("anthropic", {
  baseUrl: "https://proxy.example.com"
});
```

对象形式接受完整的 pi-ai `Provider`，包括原生 `auth`、`getModels`、`refreshModels`、`filterModels`、`stream` 和 `streamSimple` 行为。

**旧版配置选项：**

- `name` - 提供者在 UI（如 `/login`）中的显示名称。
- `baseUrl` - API 端点 URL。定义模型时必需。
- `apiKey` - API 密钥字面量、环境插值（`$ENV_VAR` 或 `${ENV_VAR}`）或前导 `!command`。
- `api` - API 类型：`"anthropic-messages"`、`"openai-completions"`、`"openai-responses"` 等。
- `headers` - 包含在请求中的自定义 headers。
- `models` - 模型定义数组。如果提供，替换此提供者的所有现有模型。
- `oauth` - 用于 `/login` 支持的 OAuth 提供者配置。

高级主题请参阅 [custom-provider.md](https://pi.dev/docs/latest/custom-provider)。

## pi.unregisterProvider(name)

移除之前注册的提供者及其模型。被提供者覆盖的内置模型会被恢复。如果提供者未注册则无效。

与 `registerProvider` 一样，在初始加载阶段之后调用时立即生效，无需 `/reload`。

```typescript
pi.registerCommand("my-setup-teardown", {
  description: "Remove the custom proxy provider",
  handler: async (_args, _ctx) => {
    pi.unregisterProvider("my-proxy");
  },
});
```

## 状态管理

有状态的扩展应将状态存储在工具结果的 `details` 中以获得正确的分支支持：

```typescript
export default function (pi: ExtensionAPI) {
  let items: string[] = [];

  // 从会话重建状态
  pi.on("session_start", async (_event, ctx) => {
    items = [];
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "message" && entry.message.role === "toolResult") {
        if (entry.message.toolName === "my_tool") {
          items = entry.message.details?.items ?? [];
        }
      }
    }
  });

  pi.registerTool({
    name: "my_tool",
    // ...
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      items.push("new item");
      return {
        content: [{ type: "text", text: "Added" }],
        details: { items: [...items] },  // 存储以便重建
      };
    },
  });
}
```

## 相关文档

- [事件系统](./5-events) - 完整的生命周期事件参考
- [ExtensionContext 与 API](./6-context-api) - ctx 对象和 pi 方法
- [自定义工具](./8-custom-tools) - registerTool 详解
- [自定义 UI](./9-custom-ui) - 对话框、组件、编辑器

<!-- [AGC:END] -->
