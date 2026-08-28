---
title: Pi Coding Agent 扩展 - 快速开始
description: Pi Agent 扩展的基础概念、安装位置、可用导入和快速上手指南
tags: [Pi Agent, 扩展, 快速开始]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# Pi Coding Agent 扩展 - 快速开始

<!-- [AGC:START] tool=Cc author=fangkun -->

## 什么是扩展

> pi 可以创建扩展。让它为你的使用场景构建一个。

扩展是扩展 pi 行为的 TypeScript 模块。它们可以订阅生命周期事件、注册 LLM 可调用的自定义工具、添加命令等。

### 核心能力

- **自定义工具** - 通过 `pi.registerTool()` 注册 LLM 可调用的工具
- **事件拦截** - 阻止或修改工具调用、注入上下文、自定义压缩
- **用户交互** - 通过 `ctx.ui` 提示用户（select、confirm、input、notify）
- **自定义 UI 组件** - 通过 `ctx.ui.custom()` 实现带键盘输入的完整 TUI 组件
- **自定义命令** - 通过 `pi.registerCommand()` 注册类似 `/mycommand` 的命令
- **会话持久化** - 通过 `pi.appendEntry()` 存储在重启后仍然有效的状态
- **自定义渲染** - 控制工具调用/结果和消息在 TUI 中的显示方式

### 示例用例

- 权限门控（在 `rm -rf`、`sudo` 等命令前确认）
- Git 检查点（每轮 stash，在分支上恢复）
- 路径保护（阻止写入 `.env`、`node_modules/`）
- 自定义压缩（按你的方式总结对话）
- 交互式工具（问题、向导、自定义对话框）
- 有状态工具（待办列表、连接池）
- 外部集成（文件监视器、webhook、CI 触发器）

参见 [examples/extensions/](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions) 获取可运行的实现。

## 快速开始

创建 `~/.pi/agent/extensions/my-extension.ts`：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // 对事件做出响应
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Extension loaded!", "info");
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("Dangerous!", "Allow rm -rf?");
      if (!ok) return { block: true, reason: "Blocked by user" };
    }
  });

  // 注册自定义工具
  pi.registerTool({
    name: "greet",
    label: "Greet",
    description: "Greet someone by name",
    parameters: Type.Object({
      name: Type.String({ description: "Name to greet" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: "text", text: `Hello, ${params.name}!` }],
        details: {},
      };
    },
  });

  // 注册命令
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (args, ctx) => {
      ctx.ui.notify(`Hello ${args || "world"}!`, "info");
    },
  });
}
```

使用 `--extension`（或 `-e`）标志测试：

```bash
pi -e ./my-extension.ts
```

## 扩展位置

> **安全性：** 扩展以你的完整系统权限运行，可以执行任意代码。仅从你信任的来源安装。

扩展从受信任的位置自动发现。项目本地的 `.pi/extensions` 条目仅在项目被信任后才会加载。

| 位置 | 范围 |
| --- | --- |
| `~/.pi/agent/extensions/*.ts` | 全局（所有项目） |
| `~/.pi/agent/extensions/*/index.ts` | 全局（子目录） |
| `.pi/extensions/*.ts` | 项目本地 |
| `.pi/extensions/*/index.ts` | 项目本地（子目录） |

### `/reload` 的放置位置

将扩展放在 `~/.pi/agent/extensions/`（全局）或 `.pi/extensions/`（项目本地）以便自动发现。仅在快速测试时使用 `pi -e ./path.ts`。位于自动发现路径中的扩展可以通过 `/reload` 进行热重载。

### 通过 settings.json 添加额外路径

```json
{
  "packages": [
    "npm:@foo/bar@1.0.0",
    "git:github.com/user/repo@v1"
  ],
  "extensions": [
    "/path/to/local/extension.ts",
    "/path/to/local/extension/dir"
  ]
}
```

## 可用的导入

| 包 | 用途 |
| --- | --- |
| `@earendil-works/pi-coding-agent` | 扩展类型（`ExtensionAPI`、`ExtensionContext`、事件） |
| `typebox` | 工具参数的 Schema 定义 |
| `@earendil-works/pi-ai` | AI 工具（`StringEnum` 用于 Google 兼容的枚举） |
| `@earendil-works/pi-tui` | 用于自定义渲染的 TUI 组件 |

npm 依赖也可以使用。在你的扩展旁边（或父目录中）添加一个 `package.json`，运行 `npm install`，来自 `node_modules/` 的导入会自动解析。

Node.js 内置模块（`node:fs`、`node:path` 等）也可用。

## 扩展项目结构

**单文件** - 最简单，适用于小型扩展：

```
~/.pi/agent/extensions/
└── my-extension.ts
```

**带 index.ts 的目录** - 适用于多文件扩展：

```
~/.pi/agent/extensions/
└── my-extension/
    ├── index.ts        # 入口点（导出默认函数）
    ├── tools.ts        # 辅助模块
    └── utils.ts        # 辅助模块
```

**带依赖的包** - 适用于需要 npm 包的扩展：

```
~/.pi/agent/extensions/
└── my-extension/
    ├── package.json    # 声明依赖和入口点
    ├── package-lock.json
    ├── node_modules/   # npm install 之后
    └── src/
        └── index.ts
```

```json
// package.json
{
  "name": "my-extension",
  "dependencies": {
    "zod": "^3.0.0",
    "chalk": "^5.0.0"
  },
  "pi": {
    "extensions": ["./src/index.ts"]
  }
}
```

## 相关文档

- [编写扩展与异步工厂](./4-writing-extensions) - 扩展工厂函数、异步初始化
- [事件系统](./5-events) - 完整的生命周期事件参考
- [ExtensionContext 与 API](./6-context-api) - ctx 对象和 pi 方法
- [ExtensionAPI 方法](./7-api-methods) - pi 对象的所有方法
- [自定义工具](./8-custom-tools) - registerTool 详解
- [自定义 UI](./9-custom-ui) - 对话框、组件、编辑器

<!-- [AGC:END] -->
