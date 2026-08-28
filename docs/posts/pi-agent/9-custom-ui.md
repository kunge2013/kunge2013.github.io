---
title: Pi Coding Agent 自定义 UI
description: Pi Agent 自定义 UI 详解 - 对话框、自动完成、自定义组件、编辑器、消息渲染、主题颜色
tags: [Pi Agent, 扩展, 自定义UI, TUI]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# Pi Coding Agent 自定义 UI

<!-- [AGC:START] tool=Cc author=fangkun -->

扩展可以通过 `ctx.ui` 方法与用户交互并自定义消息/工具的渲染方式。

**自定义组件请参阅 [tui.md](https://pi.dev/docs/latest/tui)**，其中有可直接复制使用的模式：

- 选择对话框（SelectList）
- 带取消的异步操作（BorderedLoader）
- 设置开关（SettingsList）
- 状态指示器（setStatus）
- 流式传输时的工作消息、可见性和指示器（`setWorkingMessage`、`setWorkingVisible`、`setWorkingIndicator`）
- 编辑器上方/下方的组件（setWidget）
- 叠加在内置斜杠/路径完成之上的自动完成提供者（addAutocompleteProvider）
- 自定义底部栏（setFooter）

## 对话框

```typescript
// 从选项中选择
const choice = await ctx.ui.select("Pick one:", ["A", "B", "C"]);

// 确认对话框
const ok = await ctx.ui.confirm("Delete?", "This cannot be undone");

// 文本输入
const name = await ctx.ui.input("Name:", "placeholder");

// 多行编辑器
const text = await ctx.ui.editor("Edit:", "prefilled text");

// 通知（非阻塞）
ctx.ui.notify("Done!", "info");  // "info" | "warning" | "error"
```

### 带倒计时的定时对话框

对话框支持 `timeout` 选项，可自动关闭并显示实时倒计时：

```typescript
// 对话框显示 "Title (5s)" → "Title (4s)" → ... → 在 0 时自动关闭
const confirmed = await ctx.ui.confirm(
  "Timed Confirmation",
  "This dialog will auto-cancel in 5 seconds. Confirm?",
  { timeout: 5000 }
);

if (confirmed) {
  // 用户确认
} else {
  // 用户取消或超时
}
```

**超时时的返回值：**

- `select()` 返回 `undefined`
- `confirm()` 返回 `false`
- `input()` 返回 `undefined`

### 使用 AbortSignal 手动关闭

如需更多控制（例如区分超时和用户取消），使用 `AbortSignal`：

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

const confirmed = await ctx.ui.confirm(
  "Timed Confirmation",
  "This dialog will auto-cancel in 5 seconds. Confirm?",
  { signal: controller.signal }
);

clearTimeout(timeoutId);

if (confirmed) {
  // 用户确认
} else if (controller.signal.aborted) {
  // 对话框超时
} else {
  // 用户取消（按了 Escape 或选择了 "No"）
}
```

完整示例请参阅 [examples/extensions/timed-confirm.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/timed-confirm.ts)。

## UI 辅助方法

```typescript
// 底部状态栏（持续显示直到清除）
ctx.ui.setStatus("my-ext", "Processing...");
ctx.ui.setStatus("my-ext", undefined);  // 清除

// 工作加载器（在流式传输期间显示）
ctx.ui.setWorkingMessage("Thinking deeply...");
ctx.ui.setWorkingMessage();  // 恢复默认
ctx.ui.setWorkingVisible(false);  // 完全隐藏内置的工作加载器行
ctx.ui.setWorkingVisible(true);   // 显示内置的工作加载器行

// 工作指示器（在流式传输期间显示）
ctx.ui.setWorkingIndicator({ frames: [ctx.ui.theme.fg("accent", "●")] });  // 静态点
ctx.ui.setWorkingIndicator({
  frames: [
    ctx.ui.theme.fg("dim", "·"),
    ctx.ui.theme.fg("muted", "•"),
    ctx.ui.theme.fg("accent", "●"),
    ctx.ui.theme.fg("muted", "•"),
  ],
  intervalMs: 120,
});
ctx.ui.setWorkingIndicator({ frames: [] });  // 隐藏指示器
ctx.ui.setWorkingIndicator();  // 恢复默认旋转器

// 编辑器上方的组件（默认）
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"]);
// 编辑器下方的组件
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"], { placement: "belowEditor" });
ctx.ui.setWidget("my-widget", (tui, theme) => new Text(theme.fg("accent", "Custom"), 0, 0));
ctx.ui.setWidget("my-widget", undefined);  // 清除

// 自定义底部栏（完全替换内置底部栏）
ctx.ui.setFooter((tui, theme) => ({
  render(width) { return [theme.fg("dim", "Custom footer")]; },
  invalidate() {},
}));
ctx.ui.setFooter(undefined);  // 恢复内置底部栏

// 终端标题
ctx.ui.setTitle("pi - my-project");

// 编辑器文本
ctx.ui.setEditorText("Prefill text");
const current = ctx.ui.getEditorText();

// 粘贴到编辑器（触发粘贴处理，包括大内容的折叠）
ctx.ui.pasteToEditor("pasted content");

// 工具输出展开
const wasExpanded = ctx.ui.getToolsExpanded();
ctx.ui.setToolsExpanded(true);
ctx.ui.setToolsExpanded(wasExpanded);

// 主题管理（创建主题请参阅 themes.md）
const themes = ctx.ui.getAllThemes();  // [{ name: "dark", path: "/..." | undefined }, ...]
const lightTheme = ctx.ui.getTheme("light");  // 加载但不切换
const result = ctx.ui.setTheme("light");  // 按名称切换
if (!result.success) {
  ctx.ui.notify(`Failed: ${result.error}`, "error");
}
ctx.ui.setTheme(lightTheme!);  // 或通过 Theme 对象切换
ctx.ui.theme.fg("accent", "styled text");  // 访问当前主题
```

自定义工作指示器帧被逐字渲染。如果你想要颜色，自己在帧字符串中添加，例如使用 `ctx.ui.theme.fg(...)`。

## 自动完成提供者

使用 `ctx.ui.addAutocompleteProvider()` 在内置斜杠命令和路径提供者之上叠加自定义自动完成逻辑。为自定义自然触发字符（如 `$`）设置 `triggerCharacters`。

典型模式：

- 检查光标前的文本
- 当你的扩展特定语法匹配时返回你自己的建议
- 否则委托给 `current.getSuggestions(...)`
- 委托 `applyCompletion(...)` 除非你需要自定义插入行为

```typescript
pi.on("session_start", (_event, ctx) => {
  ctx.ui.addAutocompleteProvider((current) => ({
    triggerCharacters: ["#"],
    async getSuggestions(lines, cursorLine, cursorCol, options) {
      const line = lines[cursorLine] ?? "";
      const beforeCursor = line.slice(0, cursorCol);
      const match = beforeCursor.match(/(?:^|[ \t])#([^\s#]*)$/);
      if (!match) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      return {
        prefix: `#${match[1] ?? ""}`,
        items: [
          { value: "#2983", label: "#2983", description: "Extension API for registering custom @ autocomplete providers" },
          { value: "#2753", label: "#2753", description: "Reload stale resource settings" },
        ],
      };
    },

    applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
      return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
    },

    shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
      return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
    },
  }));
});
```

完整示例请参阅 [github-issue-autocomplete.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/github-issue-autocomplete.ts)，该示例使用 `gh issue list` 预加载最新的开放 GitHub issues 并在本地过滤以实现快速的 `#...` 补全。

## 自定义组件

对于复杂 UI，使用 `ctx.ui.custom()`。这会临时用你的组件替换编辑器，直到调用 `done()`：

```typescript
import { Text, Component } from "@earendil-works/pi-tui";

const result = await ctx.ui.custom<boolean>((tui, theme, keybindings, done) => {
  const text = new Text("Press Enter to confirm, Escape to cancel", 1, 1);

  text.onKey = (key) => {
    if (key === "return") done(true);
    if (key === "escape") done(false);
    return true;
  };

  return text;
});

if (result) {
  // 用户按了 Enter
}
```

回调接收：

- `tui` - TUI 实例（用于屏幕尺寸、焦点管理）
- `theme` - 当前主题用于样式
- `keybindings` - 应用快捷键管理器（用于检查快捷键）
- `done(value)` - 调用以关闭组件并返回值

完整组件 API 请参阅 [tui.md](https://pi.dev/docs/latest/tui)。

### 覆盖模式（实验性）

传递 `{ overlay: true }` 将组件渲染为浮动模态框在现有内容之上，不清除屏幕：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyOverlayComponent({ onClose: done }),
  { overlay: true }
);
```

对于高级定位（锚点、边距、百分比、响应式可见性），传递 `overlayOptions`。使用 `onHandle` 以编程方式控制焦点或可见性：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyOverlayComponent({ onClose: done }),
  {
    overlay: true,
    overlayOptions: { anchor: "top-right", width: "50%", margin: 2 },
    onHandle: (handle) => {
      handle.focus(); // 聚焦此覆盖层并将其置于视觉前方
      // handle.unfocus({ target: editorComponent }); // 将输入释放到特定组件
      // handle.setHidden(true/false); // 切换可见性
      // handle.hide(); // 永久移除
    }
  }
);
```

完整的 `OverlayOptions` 和 `OverlayHandle` API 请参阅 [tui.md](https://pi.dev/docs/latest/tui)，示例请参阅 [overlay-qa-tests.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/overlay-qa-tests.ts)。

## 自定义编辑器

用自定义实现替换主输入编辑器（vim 模式、emacs 模式等）：

```typescript
import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

class VimEditor extends CustomEditor {
  private mode: "normal" | "insert" = "insert";

  handleInput(data: string): void {
    if (matchesKey(data, "escape") && this.mode === "insert") {
      this.mode = "normal";
      return;
    }
    if (this.mode === "normal" && data === "i") {
      this.mode = "insert";
      return;
    }
    super.handleInput(data);  // 应用快捷键 + 文本编辑
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setEditorComponent((tui, theme, keybindings) =>
      new VimEditor(tui, theme, keybindings)
    );
  });
}
```

**要点：**

- 继承 `CustomEditor`（不是基础 `Editor`）以获得应用快捷键（escape 中止、ctrl+d、模型切换）
- 对你不处理的键调用 `super.handleInput(data)`
- 工厂从应用接收 `tui`、`theme` 和 `keybindings`
- 在 `setEditorComponent()` 之前使用 `ctx.ui.getEditorComponent()` 来包装之前配置的自定义编辑器
- 传递 `undefined` 恢复默认：`ctx.ui.setEditorComponent(undefined)`

要与已替换编辑器的另一个扩展组合，在设置你的工厂之前捕获之前的工厂：

```typescript
const previous = ctx.ui.getEditorComponent();
ctx.ui.setEditorComponent((tui, theme, keybindings) =>
  new MyEditor(tui, theme, keybindings, { base: previous?.(tui, theme, keybindings) })
);
```

完整示例（带模式指示器）请参阅 [tui.md](https://pi.dev/docs/latest/tui) Pattern 7。

## 消息和条目渲染

为你的 `customType` 注册自定义消息渲染器。对参与 LLM 上下文的内容使用消息渲染器：

```typescript
import { Text } from "@earendil-works/pi-tui";

pi.registerMessageRenderer("my-extension", (message, options, theme) => {
  const { expanded, outputPad } = options;
  let text = theme.fg("accent", `[${message.customType}] `);
  text += message.content;

  if (expanded && message.details) {
    text += "\n" + theme.fg("dim", JSON.stringify(message.details, null, 2));
  }

  return new Text(text, outputPad, 0);
});
```

消息通过 `pi.sendMessage()` 发送：

```typescript
pi.sendMessage({
  customType: "my-extension",  // 匹配 registerMessageRenderer
  content: "Status update",
  display: true,               // 在 TUI 中显示
  details: { ... },            // 在渲染器中可用
});
```

对于不应发送给 LLM 的仅 TUI 内容，改为渲染自定义条目：

```typescript
pi.registerEntryRenderer("my-card", (entry, options, theme) => {
  return new Text(theme.fg("accent", JSON.stringify(entry.data)));
});

pi.appendEntry("my-card", { status: "done" });
```

## 主题颜色

所有渲染函数接收一个 `theme` 对象。创建自定义主题和完整调色板请参阅 [themes.md](https://pi.dev/docs/latest/themes)。

```typescript
// 前景色
theme.fg("toolTitle", text)   // 工具名称
theme.fg("accent", text)      // 高亮
theme.fg("success", text)     // 成功（绿色）
theme.fg("error", text)       // 错误（红色）
theme.fg("warning", text)     // 警告（黄色）
theme.fg("muted", text)       // 次要文本
theme.fg("dim", text)         // 三级文本

// 文本样式
theme.bold(text)
theme.italic(text)
theme.strikethrough(text)
```

在自定义工具渲染器中进行语法高亮：

```typescript
import { highlightCode, getLanguageFromPath } from "@earendil-works/pi-coding-agent";

// 使用显式语言进行代码高亮
const highlighted = highlightCode("const x = 1;", "typescript", theme);

// 从文件路径自动检测语言
const lang = getLanguageFromPath("/path/to/file.rs");  // "rust"
const highlighted = highlightCode(code, lang, theme);
```

## 错误处理

- 扩展错误被记录，agent 继续运行
- `tool_call` 错误阻止工具（失效安全）
- 工具 `execute` 错误必须通过抛出异常来发出信号；抛出的错误被捕获、以 `isError: true` 报告给 LLM，然后继续执行

## 模式行为

| 模式 | `ctx.mode` | `ctx.hasUI` | 备注 |
| --- | --- | --- | --- |
| 交互 | `"tui"` | `true` | 带终端渲染的完整 TUI |
| RPC（`--mode rpc`） | `"rpc"` | `true` | 通过 JSON 协议的对话框和通知；`custom()` 返回 `undefined`。参见 [rpc.md](https://pi.dev/docs/latest/rpc) |
| JSON（`--mode json`） | `"json"` | `false` | 事件流输出到 stdout；UI 方法是空操作 |
| Print（`-p`） | `"print"` | `false` | 扩展运行但不能提示 |

在 TUI 特定功能（`custom()`、组件工厂、终端输入）之前使用 `ctx.mode === "tui"`。在 TUI 和 RPC 模式下都有效的对话框和通知方法之前使用 `ctx.hasUI`。

## 示例参考

所有示例在 [examples/extensions/](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions)。

| 示例 | 描述 | 关键 API |
| --- | --- | --- |
| **工具** |  |  |
| `hello.ts` | 最小工具注册 | `registerTool` |
| `question.ts` | 带用户交互的工具 | `registerTool`、`ui.select` |
| `questionnaire.ts` | 多步骤向导工具 | `registerTool`、`ui.custom` |
| `todo.ts` | 带持久化的有状态工具 | `registerTool`、`appendEntry`、`renderResult`、会话事件 |
| `dynamic-tools.ts` | 在启动后和命令期间注册工具 | `registerTool`、`session_start`、`registerCommand` |
| `structured-output.ts` | 带 `terminate: true` 的最终结构化输出工具 | `registerTool`、终止工具结果 |
| `truncated-tool.ts` | 输出截断示例 | `registerTool`、`truncateHead` |
| `tool-override.ts` | 覆盖内置 read 工具 | `registerTool`（与内置同名） |
| **命令** |  |  |
| `pirate.ts` | 每轮修改系统提示词 | `registerCommand`、`before_agent_start` |
| `summarize.ts` | 对话摘要命令 | `registerCommand`、`ui.custom` |
| `handoff.ts` | 跨提供者模型交接 | `registerCommand`、`ui.editor`、`ui.custom` |
| `qna.ts` | 带自定义 UI 的问答 | `registerCommand`、`ui.custom`、`setEditorText` |
| `send-user-message.ts` | 注入用户消息 | `registerCommand`、`sendUserMessage` |
| `reload-runtime.ts` | 重载命令和 LLM 工具交接 | `registerCommand`、`ctx.reload()`、`sendUserMessage` |
| `shutdown-command.ts` | 优雅关闭命令 | `registerCommand`、`shutdown()` |
| **事件与门控** |  |  |
| `permission-gate.ts` | 阻止危险命令 | `on("tool_call")`、`ui.confirm` |
| `project-trust.ts` | 从用户/全局或 CLI 扩展决定或推迟项目信任 | `on("project_trust")`、信任 UI、必需信任结果 |
| `protected-paths.ts` | 阻止写入特定路径 | `on("tool_call")` |
| `confirm-destructive.ts` | 确认会话更改 | `on("session_before_switch")`、`on("session_before_fork")` |
| `dirty-repo-guard.ts` | 在脏 git 仓库上警告 | `on("session_before_*")`、`exec` |
| `input-transform.ts` | 转换用户输入 | `on("input")` |
| `input-transform-streaming.ts` | 流感知的输入转换 | `on("input")`、`streamingBehavior` |
| `model-status.ts` | 对模型更改做出响应 | `on("model_select")`、`setStatus` |
| `provider-payload.ts` | 检查 payload 和提供者响应 headers | `on("before_provider_request")`、`on("after_provider_response")` |
| `system-prompt-header.ts` | 显示系统提示词信息 | `on("agent_start")`、`getSystemPrompt` |
| `claude-rules.ts` | 从文件加载规则 | `on("session_start")`、`on("before_agent_start")` |
| `prompt-customizer.ts` | 使用 `systemPromptOptions` 添加上下文感知的工具指导 | `on("before_agent_start")`、`BuildSystemPromptOptions` |
| `file-trigger.ts` | 文件监视器触发消息 | `sendMessage` |
| **压缩与会话** |  |  |
| `custom-compaction.ts` | 自定义压缩摘要 | `on("session_before_compact")` |
| `trigger-compact.ts` | 手动触发压缩 | `compact()` |
| `git-checkpoint.ts` | 在轮次进行 Git stash | `on("turn_start")`、`on("session_before_fork")`、`exec` |
| `git-merge-and-resolve.ts` | 获取、合并和解决冲突 | `on("agent_end")`、`exec`、`sendUserMessage` |
| `auto-commit-on-exit.ts` | 关闭时提交 | `on("session_shutdown")`、`exec` |
| **UI 组件** |  |  |
| `status-line.ts` | 底部状态指示器 | `setStatus`、会话事件 |
| `working-indicator.ts` | 自定义流式工作指示器 | `setWorkingIndicator`、`registerCommand` |
| `github-issue-autocomplete.ts` | 在内置自动完成之上通过预加载 `gh issue list` 的最近开放 issues 添加 `#1234` issue 补全 | `addAutocompleteProvider`、`on("session_start")`、`exec` |
| `custom-footer.ts` | 完全替换底部栏 | `registerCommand`、`setFooter` |
| `custom-header.ts` | 替换启动头部 | `on("session_start")`、`setHeader` |
| `modal-editor.ts` | Vim 风格的模态编辑器 | `setEditorComponent`、`CustomEditor` |
| `rainbow-editor.ts` | 自定义编辑器样式 | `setEditorComponent` |
| `widget-placement.ts` | 编辑器上方/下方的组件 | `setWidget` |
| `overlay-test.ts` | 覆盖组件 | 带覆盖选项的 `ui.custom` |
| `overlay-qa-tests.ts` | 综合覆盖测试 | `ui.custom`、所有覆盖选项 |
| `notify.ts` | 简单通知 | `ui.notify` |
| `timed-confirm.ts` | 带超时的对话框 | 带 timeout/signal 的 `ui.confirm` |
| `mac-system-theme.ts` | 自动切换主题 | `setTheme`、`exec` |
| **复杂扩展** |  |  |
| `plan-mode/` | 完整的 plan mode 实现 | 所有事件类型、`registerCommand`、`registerShortcut`、`registerFlag`、`setStatus`、`setWidget`、`sendMessage`、`setActiveTools` |
| `preset.ts` | 可保存的预设（模型、工具、思考） | `registerCommand`、`registerShortcut`、`registerFlag`、`setModel`、`setActiveTools`、`setThinkingLevel`、`appendEntry` |
| `tools.ts` | 切换工具开关 UI | `registerCommand`、`setActiveTools`、`SettingsList`、会话事件 |
| **远程与沙箱** |  |  |
| `ssh.ts` | SSH 远程执行 | `registerFlag`、`on("user_bash")`、`on("before_agent_start")`、工具操作 |
| `interactive-shell.ts` | 持久 shell 会话 | `on("user_bash")` |
| `sandbox/` | 沙箱化工具执行 | 工具操作 |
| `gondolin/` | 将内置工具和 `!` 命令路由到 Gondolin 微虚拟机 | 工具操作、内置工具覆盖、`on("user_bash")` |
| `subagent/` | 生成子 agent | `registerTool`、`exec` |
| **游戏** |  |  |
| `snake.ts` | 贪吃蛇游戏 | `registerCommand`、`ui.custom`、键盘处理 |
| `space-invaders.ts` | 太空入侵者游戏 | `registerCommand`、`ui.custom` |
| `doom-overlay/` | 覆盖层中的 Doom | 带覆盖的 `ui.custom` |
| **提供者** |  |  |
| `custom-provider-anthropic/` | 自定义 Anthropic 代理 | `registerProvider` |
| `custom-provider-gitlab-duo/` | GitLab Duo 集成 | 带 OAuth 的 `registerProvider` |
| **消息与通信** |  |  |
| `message-renderer.ts` | 自定义消息渲染 | `registerMessageRenderer`、`sendMessage` |
| `entry-renderer.ts` | 仅 TUI 的自定义条目渲染 | `registerEntryRenderer`、`appendEntry` |
| `event-bus.ts` | 扩展间事件 | `pi.events` |
| **会话元数据** |  |  |
| `session-name.ts` | 为选择器命名会话 | `setSessionName`、`getSessionName` |
| `bookmark.ts` | 为 /tree 书签条目 | `setLabel` |
| **杂项** |  |  |
| `inline-bash.ts` | 工具调用中的内联 bash | `on("tool_call")` |
| `bash-spawn-hook.ts` | 在执行前调整 bash 命令、cwd 和 env | `createBashTool`、`spawnHook` |
| `with-deps/` | 带 npm 依赖的扩展 | 带 `package.json` 的包结构 |

## 相关文档

- [ExtensionAPI 方法](./7-api-methods) - pi 对象的所有方法
- [自定义工具](./8-custom-tools) - registerTool 详解
- [ExtensionContext 与 API](./6-context-api) - ctx 对象和 pi 方法
- [事件系统](./5-events) - 完整的生命周期事件参考
- [编写扩展](./4-writing-extensions) - 扩展工厂函数、异步初始化

<!-- [AGC:END] -->
