---
title: Pi Coding Agent hellopi 扩展实战
description: 实现一个监听所有 Pi 生命周期事件的调试扩展，输出触发时机、使用方法和应用场景
tags: [Pi Agent, 扩展, 实战, hellopi]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# Pi Coding Agent hellopi 扩展实战

<!-- [AGC:START] tool=Cc author=fangkun -->

## 目标

实现一个 `hellopi` 扩展，用于：
- 监听 Pi 的所有生命周期事件
- 在控制台输出每个事件的**触发时机**、**使用方法**和**应用场景**
- 帮助开发者快速了解 Pi 扩展系统的完整能力

## 安装位置

将 `hellopi.ts` 放到全局扩展目录，所有项目自动加载：

```bash
~/.pi/agent/extensions/hellopi.ts
```

## 完整代码

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const TAG = "[hellopi]";
const RESET = "\x1b[0m";
const GRAY = "\x1b[90m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";

// 事件说明映射表
const EVENT_INFO: Record<string, { when: string; how: string; usecase: string }> = {
  // 启动与资源
  project_trust: {
    when: "pi 启动时，判断是否信任项目前触发",
    how: "返回 { trusted: 'yes' | 'no' | 'undecided', remember: true }",
    usecase: "自定义项目信任决策、自动化信任流程",
  },
  resources_discover: {
    when: "session_start 之后，加载 skills/prompts/themes 时触发",
    how: "返回 { skillPaths, promptPaths, themePaths } 添加额外资源路径",
    usecase: "动态加载外部 skills、自定义主题、注入提示词",
  },

  // 会话事件
  session_start: {
    when: "会话启动/加载/重载时触发（startup/new/resume/fork/reload）",
    how: "可读取 ctx.sessionManager，初始化扩展状态",
    usecase: "恢复扩展状态、通知用户、启动后台任务",
  },
  session_shutdown: {
    when: "会话结束时触发（quit/reload/new/resume/fork）",
    how: "清理资源、保存状态",
    usecase: "关闭文件监视器、保存扩展状态、清理临时文件",
  },

  // Agent 事件
  input: {
    when: "用户输入后，skill/template 扩展之前触发",
    how: "返回 { action: 'transform', text } 转换输入，{ action: 'handled' } 完全处理",
    usecase: "输入预处理、自定义命令路由、输入验证",
  },
  before_agent_start: {
    when: "用户提交提示词后、agent 循环之前触发",
    how: "返回 { message, systemPrompt } 注入消息或修改系统提示词",
    usecase: "注入上下文、修改系统提示词、添加额外指令",
  },
  agent_settled: {
    when: "agent 完全稳定后触发（无重试/压缩/后续消息）",
    how: "只读通知，此时 ctx.isIdle() 为 true",
    usecase: "确认任务完成、发送通知、触发 CI/CD",
  },

  // 工具事件
  tool_call: {
    when: "工具执行之前触发（可阻止）",
    how: "返回 { block: true, reason, terminate } 阻止工具；修改 event.input 可修补参数",
    usecase: "权限门控、危险命令拦截、参数验证、路径保护",
  },
  tool_result: {
    when: "工具执行完成后触发（可修改结果）",
    how: "返回 { content, details, isError, usage } 修改结果",
    usecase: "结果后处理、敏感信息过滤、结果缓存、添加元数据",
  },
  // ... 更多事件定义见完整源码
};

// 带颜色的日志输出
function log(event: string, data: Record<string, unknown> = {}) {
  const time = new Date().toISOString().slice(11, 23);
  const info = EVENT_INFO[event];

  const entries = Object.entries(data)
    .map(([k, v]) => {
      if (v === undefined || v === null) return "";
      if (typeof v === "string") return `${k}="${v.slice(0, 50)}"`;
      if (typeof v === "object") return `${k}=${JSON.stringify(v).slice(0, 80)}`;
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .join(" ");

  console.log(`${TAG} ${CYAN}${time}${RESET} ${GREEN}${event}${RESET} ${entries}`);

  // 输出事件说明
  if (info) {
    console.log(`     ${GRAY}├─ 触发: ${YELLOW}${info.when}${RESET}`);
    console.log(`     ${GRAY}├─ 用法: ${BLUE}${info.how}${RESET}`);
    console.log(`     ${GRAY}└─ 场景: ${info.usecase}${RESET}`);
  }
  console.log("");
}

// 启动时输出事件概览
function printEventOverview() {
  console.log("");
  console.log(`${TAG} ${GREEN}=== hellopi 扩展已加载 ===${RESET}`);
  console.log(`${TAG} 监听 ${Object.keys(EVENT_INFO).length} 个生命周期事件`);
  console.log("");
  console.log(`${TAG} ${CYAN}事件概览:${RESET}`);

  for (const [event, info] of Object.entries(EVENT_INFO)) {
    console.log(`     ${GREEN}${event}${RESET} - ${info.usecase}`);
  }
  console.log("");
}

export default function (pi: ExtensionAPI) {
  printEventOverview();

  // 监听所有事件
  pi.on("session_start", async (event) => {
    log("session_start", { reason: event.reason });
  });

  pi.on("tool_call", async (event) => {
    log("tool_call", { toolName: event.toolName });
  });

  pi.on("input", async (event) => {
    log("input", { text: event.text?.slice(0, 100), source: event.source });
  });

  // ... 更多事件监听见完整源码
}
```

## 输出示例

启动 pi 后，控制台会显示：

```
[hellopi] === hellopi 扩展已加载 ===
[hellopi] 监听 36 个生命周期事件

[hellopi] 事件概览:
     project_trust - 自定义项目信任决策、自动化信任流程
     resources_discover - 动态加载外部 skills、自定义主题、注入提示词
     session_start - 恢复扩展状态、通知用户、启动后台任务
     tool_call - 权限门控、危险命令拦截、参数验证、路径保护
     ...

────────────────────────────────────────────────────────────────────────────────

[hellopi] 14:32:15 session_start reason="startup"
     ├─ 触发: 会话启动/加载/重载时触发（startup/new/resume/fork/reload）
     ├─ 用法: 可读取 ctx.sessionManager，初始化扩展状态
     └─ 场景: 恢复扩展状态、通知用户、启动后台任务

[hellopi] 14:32:16 input text="hello world" source="interactive"
     ├─ 触发: 用户输入后，skill/template 扩展之前触发
     ├─ 用法: 返回 { action: 'transform', text } 转换输入
     └─ 场景: 输入预处理、自定义命令路由、输入验证
```

## 核心事件速查表

| 事件 | 触发时机 | 返回值 | 典型场景 |
|------|----------|--------|----------|
| `project_trust` | 启动时判断项目信任 | `{ trusted: 'yes' \| 'no' }` | 自动化信任流程 |
| `session_start` | 会话启动/恢复 | 无 | 初始化状态、启动后台任务 |
| `input` | 用户输入后 | `{ action: 'transform' \| 'handled' \| 'continue' }` | 输入预处理、命令路由 |
| `before_agent_start` | agent 循环前 | `{ message, systemPrompt }` | 注入上下文、修改系统提示词 |
| `tool_call` | 工具执行前 | `{ block: true, reason }` | 权限门控、危险命令拦截 |
| `tool_result` | 工具执行后 | `{ content, details, isError }` | 结果过滤、敏感信息脱敏 |
| `session_shutdown` | 会话结束 | 无 | 清理资源、保存状态 |
| `agent_settled` | agent 完全稳定 | 无 | 任务完成通知、触发 CI/CD |

## 完整源码

完整源码包含 36 个事件的监听和说明，详见：

- 博客源码：[hellopi.ts](https://github.com/kunge2013/kunge2013.github.io/blob/main/docs/posts/pi-agent/hellopi.ts)
- 全局安装：`~/.pi/agent/extensions/hellopi.ts`

## 相关文档

- [快速开始](./3-quick-start) - 扩展基础概念
- [事件系统](./5-events) - 完整的生命周期事件参考
- [自定义工具](./8-custom-tools) - registerTool 详解
- [自定义 UI](./9-custom-ui) - 对话框、组件、编辑器

<!-- [AGC:END] -->
