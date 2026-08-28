---
title: Pi Coding Agent 自定义工具
description: Pi Agent 自定义工具详解 - 工具定义、覆盖内置工具、远程执行、输出截断、自定义渲染、动态加载
tags: [Pi Agent, 扩展, 自定义工具]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# Pi Coding Agent 自定义工具

<!-- [AGC:START] tool=Cc author=fangkun -->

通过 `pi.registerTool()` 注册 LLM 可调用的工具。工具出现在系统提示词中并可以自定义渲染。

使用 `promptSnippet` 在默认系统提示词的 `Available tools` 部分添加简短的单行条目。如果省略，自定义工具不包含在该部分中。

使用 `promptGuidelines` 将工具特定的要点添加到默认系统提示词的 `Guidelines` 部分。这些要点仅在工具活动时（例如在 `pi.setActiveTools([...])` 之后）包含。

**重要：** `promptGuidelines` 要点以平面方式追加到 `Guidelines` 部分，没有工具名称前缀或分组。每个指南必须命名它引用的工具——避免"Use this tool when..."因为 LLM 无法分辨"this"指的是哪个工具。请写"Use my\_tool when..."。

注意：有些模型比较笨，会在工具路径参数中包含 @ 前缀。内置工具在解析路径之前会去掉前导 @。如果你的自定义工具接受路径，也要规范化前导 @。

如果你的自定义工具修改文件，请使用 `withFileMutationQueue()` 使其参与与内置 `edit` 和 `write` 相同的每文件队列。这很重要，因为工具调用默认并行运行。没有队列的话，两个工具可以读取相同的旧文件内容、计算不同的更新，然后最后写入的那个会覆盖另一个。

```typescript
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
  const absolutePath = resolve(ctx.cwd, params.path);

  return withFileMutationQueue(absolutePath, async () => {
    await mkdir(dirname(absolutePath), { recursive: true });
    const current = await readFile(absolutePath, "utf8");
    const next = current.replace(params.oldText, params.newText);
    await writeFile(absolutePath, next, "utf8");

    return {
      content: [{ type: "text", text: `Updated ${params.path}` }],
      details: {},
    };
  });
}
```

## 工具定义

```typescript
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";

pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "What this tool does (shown to LLM)",
  promptSnippet: "List or add items in the project todo list",
  promptGuidelines: [
    "Use my_tool for todo planning instead of direct file edits when the user asks for a task list."
  ],
  parameters: Type.Object({
    action: StringEnum(["list", "add"] as const),  // 使用 StringEnum 以获得 Google 兼容性
    text: Type.Optional(Type.String()),
  }),
  prepareArguments(args) {
    if (!args || typeof args !== "object") return args;
    const input = args as { action?: string; oldAction?: string };
    if (typeof input.oldAction === "string" && input.action === undefined) {
      return { ...input, action: input.oldAction };
    }
    return args;
  },

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // 检查取消
    if (signal?.aborted) {
      return { content: [{ type: "text", text: "Cancelled" }] };
    }

    // 流式进度更新
    onUpdate?.({
      content: [{ type: "text", text: "Working..." }],
      details: { progress: 50 },
    });

    // 通过 pi.exec 运行命令（从扩展闭包捕获）
    const result = await pi.exec("some-command", [], { signal });

    // 返回结果
    return {
      content: [{ type: "text", text: "Done" }],  // 发送给 LLM
      details: { data: result },                   // 用于渲染和状态
      // usage: nestedModelResponse.usage,          // 可选的嵌套 LLM 使用量
      terminate: true,  // 可选：提前终止
    };
  },

  // 可选：自定义渲染
  renderCall(args, theme, context) { ... },
  renderResult(result, options, theme, context) { ... },
});
```

**使用量计算：** 如果工具进行嵌套 LLM 调用，将其合并的 `Usage` 作为 `usage` 返回。Pi 将其持久化在工具结果上，并包含在底部栏、`/session` 和 RPC 会话总计中。`tool_result` 处理程序可以检查或替换此值。

**错误信号：** 要将工具执行标记为失败（在结果上设置 `isError: true` 并向 LLM 报告），从 `execute` 抛出错误。无论你在返回对象中包含什么属性，返回值永远不会设置错误标志。

**提前终止：** 从 `execute()` 返回 `terminate: true` 以提示在当前工具批次后应跳过自动后续 LLM 调用。这仅在该批次中每个最终工具结果都是终止性时才生效。

```typescript
// 正确：抛出错误以信号错误
async execute(toolCallId, params) {
  if (!isValid(params.input)) {
    throw new Error(`Invalid input: ${params.input}`);
  }
  return { content: [{ type: "text", text: "OK" }], details: {} };
}
```

**重要：** 使用来自 `@earendil-works/pi-ai` 的 `StringEnum` 作为字符串枚举。`Type.Union` / `Type.Literal` 不适用于 Google 的 API。

**参数准备：** `prepareArguments(args)` 是可选的。如果定义，它在 schema 验证和 `execute()` 之前运行。当 pi 恢复旧会话且存储的工具调用参数不再匹配当前 schema 时，用它来模拟旧的可接受输入形状。

## 覆盖内置工具

扩展可以通过注册同名工具来覆盖内置工具（`read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`）。交互模式会在发生这种情况时显示警告。

```bash
# 扩展的 read 工具替换内置 read
pi -e ./tool-override.ts
```

或者，使用 `--no-builtin-tools` 在保持扩展工具启用的情况下不带任何内置工具启动：

```bash
# 没有内置工具，只有扩展工具
pi --no-builtin-tools -e ./my-extension.ts
```

完整示例请参阅 [examples/extensions/tool-override.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/tool-override.ts)，该示例覆盖 `read` 并添加了日志记录和访问控制。

**渲染：** 内置渲染器继承按插槽解析。执行覆盖和渲染覆盖是独立的。如果你的覆盖省略了 `renderCall`，则使用内置的 `renderCall`。如果你的覆盖省略了 `renderResult`，则使用内置的 `renderResult`。如果你的覆盖两者都省略，则自动使用内置渲染器（语法高亮、diff 等）。

**提示元数据：** `promptSnippet` 和 `promptGuidelines` 不从内置工具继承。如果你的覆盖应保留这些提示指令，请在覆盖上显式定义它们。

**你的实现必须匹配精确的结果形状**，包括 `details` 类型。UI 和会话逻辑依赖这些形状进行渲染和状态追踪。

内置工具实现：

- [read.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/read.ts) - `ReadToolDetails`
- [bash.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/bash.ts) - `BashToolDetails`
- [edit.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/edit.ts)
- [write.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/write.ts)
- [grep.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/grep.ts) - `GrepToolDetails`
- [find.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/find.ts) - `FindToolDetails`
- [ls.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/ls.ts) - `LsToolDetails`

## 远程执行

内置工具支持可插拔操作以委托给远程系统（SSH、容器等）：

```typescript
import { createReadTool, createBashTool, type ReadOperations } from "@earendil-works/pi-coding-agent";

// 创建带自定义操作的工具
const remoteRead = createReadTool(cwd, {
  operations: {
    readFile: (path) => sshExec(remote, `cat ${path}`),
    access: (path) => sshExec(remote, `test -r ${path}`).then(() => {}),
  }
});

// 注册，在执行时检查标志
pi.registerTool({
  ...remoteRead,
  async execute(id, params, signal, onUpdate, _ctx) {
    const ssh = getSshConfig();
    if (ssh) {
      const tool = createReadTool(cwd, { operations: createRemoteOps(ssh) });
      return tool.execute(id, params, signal, onUpdate);
    }
    return localRead.execute(id, params, signal, onUpdate);
  },
});
```

**操作接口：** `ReadOperations`、`WriteOperations`、`EditOperations`、`BashOperations`、`PowerShellOperations`、`LsOperations`、`GrepOperations`、`FindOperations`

对于 `user_bash`，扩展可以通过 `createLocalBashOperations()` 重用 pi 的本地 shell 后端，而不是重新实现本地进程生成、shell 解析和进程树终止。

`bash` 和 `powershell` 工具还支持 spawn 钩子，可以在执行前调整命令、cwd 或 env：

```typescript
import { createBashTool } from "@earendil-works/pi-coding-agent";

const bashTool = createBashTool(cwd, {
  spawnHook: ({ command, cwd, env }) => ({
    command: `source ~/.profile\n${command}`,
    cwd: `/mnt/sandbox${cwd}`,
    env: { ...env, CI: "1" },
  }),
});
```

`createBashTool()` 和 `createPowerShellTool()` 通过 `PI_SESSION_ID`、`PI_SESSION_FILE`、`PI_PROVIDER`、`PI_MODEL` 和 `PI_REASONING_LEVEL` 向命令暴露当前会话。注入发生在 `spawnHook` 之前，因此钩子在 `env` 中接收这些值。设置 `exposeSessionEnvironment: false` 可以禁用它们。

完整 SSH 示例请参阅 [examples/extensions/ssh.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/ssh.ts) 以及 `--ssh` 标志。

## 输出截断

**工具必须截断其输出**以避免压倒 LLM 上下文。大型输出可能导致：

- 上下文溢出错误（提示词太长）
- 压缩失败
- 模型性能下降

内置限制为 **50KB**（约 10k tokens）和 **2000 行**，以先到达者为准。使用导出的截断工具：

```typescript
import {
  truncateHead,      // 保留前 N 行/字节（适用于文件读取、搜索结果）
  truncateTail,      // 保留后 N 行/字节（适用于日志、命令输出）
  truncateLine,      // 将单行截断到 maxBytes 并添加省略号
  formatSize,        // 人类可读的大小（例如 "50KB"、"1.5MB"）
  DEFAULT_MAX_BYTES, // 50KB
  DEFAULT_MAX_LINES, // 2000
} from "@earendil-works/pi-coding-agent";

async execute(toolCallId, params, signal, onUpdate, ctx) {
  const output = await runCommand();

  // 应用截断
  const truncation = truncateHead(output, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES,
  });

  let result = truncation.content;

  if (truncation.truncated) {
    // 将完整输出写入临时文件
    const tempFile = writeTempFile(output);

    // 告知 LLM 完整输出在哪里
    result += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines`;
    result += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
    result += ` Full output saved to: ${tempFile}]`;
  }

  return { content: [{ type: "text", text: result }] };
}
```

**要点：**

- 对于开头重要的内容使用 `truncateHead`（搜索结果、文件读取）
- 对于结尾重要的内容使用 `truncateTail`（日志、命令输出）
- 始终在输出被截断时告知 LLM 并说明在哪里可以找到完整版本
- 在你的工具描述中记录截断限制

完整示例请参阅 [examples/extensions/truncated-tool.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/truncated-tool.ts)，该示例用适当的截断包装了 `rg`（ripgrep）。

## 多个工具

一个扩展可以注册多个共享状态的工具：

```typescript
export default function (pi: ExtensionAPI) {
  let connection = null;

  pi.registerTool({ name: "db_connect", ... });
  pi.registerTool({ name: "db_query", ... });
  pi.registerTool({ name: "db_close", ... });

  pi.on("session_shutdown", async () => {
    connection?.close();
  });
}
```

## 自定义渲染

工具可以提供 `renderCall` 和 `renderResult` 用于自定义 TUI 显示。完整组件 API 请参阅 [tui.md](https://pi.dev/docs/latest/tui)。

默认情况下，工具输出被包装在处理内边距和背景的 `Box` 中。定义的 `renderCall` 或 `renderResult` 必须返回 `Component`。如果未定义某个插槽渲染器，`tool-execution.ts` 对该插槽使用回退渲染。

当工具应渲染自己的 shell 而不是使用默认的 `Box` 时，设置 `renderShell: "self"`。这对于需要完全控制框架或背景行为的工具很有用。

```typescript
pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "Custom shell example",
  parameters: Type.Object({}),
  renderShell: "self",
  async execute() {
    return { content: [{ type: "text", text: "ok" }], details: undefined };
  },
  renderCall(args, theme, context) {
    return new Text(theme.fg("accent", "my custom shell"), 0, 0);
  },
});
```

`renderCall` 和 `renderResult` 各自接收一个包含以下内容的 `context` 对象：

- `args` - 当前工具调用参数
- `state` - `renderCall` 和 `renderResult` 之间共享的行级状态
- `lastComponent` - 该插槽之前返回的组件，如果有
- `invalidate()` - 请求重新渲染此工具行
- `toolCallId`、`cwd`、`executionStarted`、`argsComplete`、`isPartial`、`expanded`、`showImages`、`isError`

使用 `context.state` 进行跨插槽共享状态。

### renderCall

渲染工具调用或头部：

```typescript
import { Text } from "@earendil-works/pi-tui";

renderCall(args, theme, context) {
  const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
  let content = theme.fg("toolTitle", theme.bold("my_tool "));
  content += theme.fg("muted", args.action);
  if (args.text) {
    content += " " + theme.fg("dim", `"${args.text}"`);
  }
  text.setText(content);
  return text;
}
```

### renderResult

渲染工具结果或输出：

```typescript
renderResult(result, { expanded, isPartial }, theme, context) {
  if (isPartial) {
    return new Text(theme.fg("warning", "Processing..."), 0, 0);
  }

  if (result.details?.error) {
    return new Text(theme.fg("error", `Error: ${result.details.error}`), 0, 0);
  }

  let text = theme.fg("success", "✓ Done");
  if (expanded && result.details?.items) {
    for (const item of result.details.items) {
      text += "\n  " + theme.fg("dim", item);
    }
  }
  return new Text(text, 0, 0);
}
```

### 快捷键提示

使用 `keyHint()` 显示尊重活动快捷键绑定的快捷键提示：

```typescript
import { keyHint } from "@earendil-works/pi-coding-agent";

renderResult(result, { expanded }, theme, context) {
  let text = theme.fg("success", "✓ Done");
  if (!expanded) {
    text += ` (${keyHint("app.tools.expand", "to expand")})`;
  }
  return new Text(text, 0, 0);
}
```

可用函数：

- `keyHint(keybinding, description)` - 格式化配置的快捷键绑定 id
- `keyText(keybinding)` - 返回快捷键绑定 id 的原始配置键文本
- `rawKeyHint(key, description)` - 格式化原始键字符串

### 最佳实践

- 使用 padding 为 `(0, 0)` 的 `Text`。默认的 Box 处理内边距。
- 多行内容使用 `\n`。
- 处理 `isPartial` 以应对流式进度。
- 支持 `expanded` 以按需显示详情。
- 保持默认视图紧凑。
- 在 `renderResult` 中读取 `context.args` 而不是将 args 复制到 `context.state` 中。
- 仅对必须在 call 和 result 插槽之间共享的数据使用 `context.state`。
- 当同一组件实例可以就地更新时复用 `context.lastComponent`。
- 仅在默认的 boxed shell 妨碍时才使用 `renderShell: "self"`。

### 回退

如果未定义某个插槽渲染器或抛出异常：

- `renderCall`：显示工具名称
- `renderResult`：显示来自 `content` 的原始文本

## 动态工具加载

扩展可以注册许多工具但只保持少量初始集合处于活动状态。然后工具可以在执行期间通过 `pi.setActiveTools()` 添加更多工具。Pi 检测纯粹的添加更改，在该工具结果上记录新可用的工具名称，并在下一次模型请求之前应用更新的活动集合。

这适用于所有模型。具有原生延迟加载支持的模型保持稳定的提示词前缀，并在工具结果位置加载新定义。其他模型使用下面描述的回退方式。

生命周期为：

1. 使用 `pi.registerTool()` 注册每个工具，使其出现在 `pi.getAllTools()` 中。
2. 保持加载器工具（如 `search_tools`）处于活动状态，并让可搜索工具保持非活动状态。
3. 在加载器执行期间，调用 `pi.setActiveTools([...currentTools, ...matchingTools])`。更改必须是添加性的：不要在同一调用中移除当前活动的工具。
4. Pi 记录哪些工具是在加载器的工具结果上添加的。
5. 在下一个模型响应之前，Pi 在支持时使用原生延迟加载公开添加的定义，否则使用正常的活动工具列表。

### 具有原生延迟加载的模型

- **Anthropic**
  - **模型：** Sonnet、Opus、Fable 4.5 版或更新版（不包括 Haiku）
  - **原生表示：** 延迟定义使用 `defer_loading`；加载点使用 `tool_reference` 内容。
- **OpenAI**
  - **模型：** `gpt-5.4` 及更新系列
  - **原生表示：** Pi 在加载点添加已完成的客户端 `tool_search_call` 和 `tool_search_output` 项目。

对于经过验证的自定义模型或代理，可以使用 `compat.supportsToolReferences: true`（对于 `anthropic-messages`）或 `compat.supportsToolSearch: true`（对于 `openai-responses` 和 `openai-codex-responses`）启用原生处理。

### 回退行为

对于所有其他模型和提供者，动态激活仍然有效：Pi 在下一次请求时正常发送完整的当前活动工具列表。模型可以调用新激活的工具，但添加它们的定义可能使提供者的缓存提示词前缀失效。

Pi 在活动集合不是纯粹添加性时也使用这种安全回退，例如用一组工具替换另一组。因此工具移除有效，但它们不使用延迟加载。

为了获得最佳缓存行为，在整个会话中保持加载器工具处于活动状态，并添加工具而不是替换活动集合。

### 搜索工具示例

以下扩展注册了两个可搜索工具，将它们从初始活动集合中移除，并只保持 `search_tools` 作为它们的加载器：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const SEARCHABLE_TOOL_NAMES = new Set(["lookup_weather", "search_issues"]);

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "lookup_weather",
    label: "Lookup Weather",
    description: "Look up the current weather for a city",
    parameters: Type.Object({ city: Type.String() }),
    async execute(_toolCallId, params) {
      return {
        content: [{ type: "text", text: `Weather for ${params.city}: sunny` }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "search_issues",
    label: "Search Issues",
    description: "Search project issues by keyword",
    parameters: Type.Object({ query: Type.String() }),
    async execute(_toolCallId, params) {
      return {
        content: [{ type: "text", text: `No open issues matching ${params.query}` }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "search_tools",
    label: "Search Tools",
    description: "Search for and enable tools relevant to a task",
    promptSnippet: "Search for additional tools when the active tools cannot perform the task",
    promptGuidelines: [
      "Use search_tools when a task requires a capability that is not currently available.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Capability or task to search for" }),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 10 })),
    }),
    async execute(_toolCallId, params) {
      const terms = params.query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      const matches = pi.getAllTools()
        .filter((tool) => SEARCHABLE_TOOL_NAMES.has(tool.name))
        .map((tool) => ({
          tool,
          score: terms.reduce(
            (score, term) =>
              score + (`${tool.name} ${tool.description}`.toLowerCase().includes(term) ? 1 : 0),
            0,
          ),
        }))
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, params.limit ?? 3)
        .map((match) => match.tool.name);

      if (matches.length === 0) {
        return {
          content: [{ type: "text", text: `No tools found for: ${params.query}` }],
          details: { matches: [] },
        };
      }

      const active = pi.getActiveTools();
      const added = matches.filter((name) => !active.includes(name));
      pi.setActiveTools([...new Set([...active, ...added])]);

      return {
        content: [{
          type: "text",
          text: added.length > 0
            ? `Loaded tools: ${added.join(", ")}`
            : `Matching tools already active: ${matches.join(", ")}`,
        }],
        details: { matches, added },
      };
    },
  });

  pi.on("session_start", () => {
    const initialTools = pi.getActiveTools().filter(
      (name) => !SEARCHABLE_TOOL_NAMES.has(name),
    );
    pi.setActiveTools([...new Set([...initialTools, "search_tools"])]);
  });
}
```

当 `search_tools` 添加匹配时，模型在紧接着的下一个请求中接收到该定义。在原生能力的模型上，定义锚定在搜索结果之后而不改变初始工具 schema 前缀。

## 相关文档

- [ExtensionAPI 方法](./7-api-methods) - pi 对象的所有方法
- [自定义 UI](./9-custom-ui) - 对话框、组件、编辑器
- [事件系统](./5-events) - 完整的生命周期事件参考

<!-- [AGC:END] -->
