---
title: Pi Coding Agent 编写扩展
description: Pi Agent 扩展工厂函数、异步初始化与资源生命周期详解
tags: [Pi Agent, 扩展, 编写扩展]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# Pi Coding Agent 编写扩展

<!-- [AGC:START] tool=Cc author=fangkun -->

## 扩展工厂函数

扩展导出一个接收 `ExtensionAPI` 的默认工厂函数。工厂可以是同步或异步的：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // 订阅事件
  pi.on("event_name", async (event, ctx) => {
    // ctx.ui 用于用户交互
    const ok = await ctx.ui.confirm("Title", "Are you sure?");
    ctx.ui.notify("Done!", "info");
    ctx.ui.setStatus("my-ext", "Processing...");  // 底部状态栏
    ctx.ui.setWidget("my-ext", ["Line 1", "Line 2"]);  // 编辑器上方的组件（默认）
  });

  // 注册工具、命令、快捷键、标志
  pi.registerTool({ ... });
  pi.registerCommand("name", { ... });
  pi.registerShortcut("ctrl+x", { ... });
  pi.registerFlag("my-flag", { ... });
}
```

扩展通过 [jiti](https://github.com/unjs/jiti) 加载，因此 TypeScript 无需编译即可运行。

如果工厂返回 `Promise`，pi 会在继续启动之前等待它。这意味着异步初始化在 `session_start` 之前、`resources_discover` 之前以及通过 `pi.registerProvider()` 排队的提供者注册被刷新之前完成。

## 异步工厂函数

使用异步工厂处理一次性启动工作，例如获取远程配置或动态发现可用模型。

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default async function (pi: ExtensionAPI) {
  const response = await fetch("http://localhost:1234/v1/models");
  const payload = (await response.json()) as {
    data: Array<{
      id: string;
      name?: string;
      context_window?: number;
      max_tokens?: number;
    }>;
  };

  pi.registerProvider("local-openai", {
    baseUrl: "http://localhost:1234/v1",
    apiKey: "$LOCAL_OPENAI_API_KEY",
    api: "openai-completions",
    models: payload.data.map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: model.context_window ?? 128000,
      maxTokens: model.max_tokens ?? 4096,
    })),
  });
}
```

此模式使获取的模型在正常启动和 `pi --list-models` 中可用。

## 长生命周期资源和关闭

扩展工厂可能在没有启动会话的调用中运行。不要从工厂启动后台资源，如进程、套接字、文件监视器或定时器。

将后台资源的启动延迟到 `session_start` 或需要该资源的命令/工具/事件。注册一个幂等的 `session_shutdown` 处理程序来关闭你启动的任何会话范围内的资源。

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let watcher: fs.FSWatcher | null = null;

  pi.on("session_start", async (_event, _ctx) => {
    // 延迟到会话启动后再启动文件监视器
    watcher = fs.watch("/some/path", () => {
      pi.sendUserMessage("File changed!", { deliverAs: "followUp" });
    });
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    // 会话结束时关闭文件监视器
    watcher?.close();
    watcher = null;
  });
}
```

## 相关文档

- [快速开始](./3-quick-start) - 扩展基础概念与项目结构
- [事件系统](./5-events) - 完整的生命周期事件参考
- [ExtensionContext 与 API](./6-context-api) - ctx 对象和 pi 方法

<!-- [AGC:END] -->
