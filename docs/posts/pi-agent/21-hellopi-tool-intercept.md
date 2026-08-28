---
title: hellopi 事件包 21 · 工具拦截：危险命令闸门与结果脱敏
description: tool_call 与 tool_result 两个可改写事件实战——rm -rf 拦截、ls 参数修补、AWS Key 结果脱敏，构建工具调用的入站/出站过滤器
tags: [Pi Agent, 扩展, 事件, tool_call, tool_result, 安全]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# hellopi 事件包 21 · 工具拦截：危险命令闸门与结果脱敏

<!-- [AGC:START] tool=Cc author=fangkun -->

工具生命周期里有两个"能改变结果"的事件，分别卡在执行的前后：

```text
模型决定调用工具
 ├─ tool_call               ← 入站闸门：可 block 阻止执行，可原地改 input 修补参数
 ├─ tool_execution_start …（只读观测，见第 17 篇）
 └─ tool_result             ← 出站过滤：结果进入上下文前，可改 content / isError / details
```

与[第 17 篇](./17-hellopi-tool-execution)的只读观测事件不同，这两个事件是扩展做**安全管控**的核心位置：入站防破坏，出站防泄密。

## tool_call：工具执行前的权限闸门

在 `tool_execution_start` 之前触发。返回 `{ block: true, reason }` 阻止执行，模型会收到拒绝原因；也可以**原地修改 `event.input`** 修补参数，修改后直接执行、不再重新校验。

事件是按工具名区分的联合类型：bash/read/edit/write/grep/find/ls 各有精确类型（`input` 形状不同），自定义工具为 `CustomToolCallEvent`。推荐用包导出的 `isToolCallEventType("bash", event)` 做类型收窄；demo 用直接断言演示。

### Demo：危险命令拦截 + ls 参数修补

```typescript
// [AGC:START] tool=Cc author=fangkun
import type { ExtensionAPI, BashToolCallEvent } from "@earendil-works/pi-coding-agent";

const DANGEROUS_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /rm\s+-rf\s+(\/(\s|$)|~(\s|$)|\*)/, reason: "拒绝 rm -rf 根目录/家目录/通配符" },
  { pattern: /\bmkfs\b/, reason: "拒绝格式化文件系统 mkfs" },
  { pattern: /:\s*\(\s*\)\s*\{.*\}\s*;/, reason: "拒绝 fork bomb" },
];

export default function register(pi: ExtensionAPI): void {
  pi.on("tool_call", async (event) => {
    logEvent("tool_call", { toolName: event.toolName, toolCallId: event.toolCallId });
    appendDemoFile("tool-calls.log", `call ${event.toolName} id=${event.toolCallId}`);

    if (event.toolName !== "bash") return;

    const bash = event as BashToolCallEvent;
    const command = bash.input.command ?? "";

    // 1. 危险命令拦截：命中规则直接 block
    for (const { pattern, reason } of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        logAction("tool_call", `拦截危险命令: ${reason} → ${command.slice(0, 80)}`);
        appendDemoFile("tool-calls.log", `BLOCKED ${command.slice(0, 120)} | ${reason}`);
        return { block: true, reason: `[hellopi] ${reason}。命令: ${command.slice(0, 100)}` };
      }
    }

    // 2. 参数修补：裸 "ls" 原地改成 "ls -la"
    if (command.trim() === "ls") {
      bash.input.command = "ls -la";
      logAction("tool_call", "参数修补: ls → ls -la");
      appendDemoFile("tool-calls.log", "PATCHED ls -> ls -la");
    }
    return;
  });
}
// [AGC:END]
```

关键行为：

- **`block` 的 `reason` 会反馈给模型**：模型看到拒绝原因后会换方案（比如改用更安全的命令或转而征求用户同意），而不是让调用静默失败；
- **拦截规则表驱动**：`DANGEROUS_PATTERNS` 用"正则 + 原因"数组维护，加规则只改数据不改逻辑。三条规则分别覆盖 `rm -rf /`、`rm -rf ~`、`rm -rf *`（一条正则三个分支）、`mkfs`、fork bomb（`:(){...};` 形态）；
- **参数修补是原地修改**：`bash.input.command = "ls -la"` 之后实际执行的就是修补后的命令，且不再重新校验——这意味着修补逻辑要自己保证改完的参数合法；
- **先拦截后修补**：危险判断在前，良性修补在后，顺序不能反。

### 行为保证（官方文档要点）

- 对 `event.input` 的修改会影响实际执行，后续 `tool_call` 处理程序能看到早期处理程序的修改（链式）；
- `terminate: true` 可附加在 block 返回值上：只有批次中每个最终结果都是终止性时，agent 才提前停止；
- 并行工具模式下，兄弟工具调用被顺序预检、并发执行，`tool_call` 不保证在 sessionManager 中看到同批兄弟的结果。

### 业务场景

1. **权限门控**：禁止写工作区外路径、禁止网络命令、限制 `sudo`；
2. **危险操作二次确认**：检测删库/批量删除时 block，让模型先向用户确认；
3. **参数自动补全**：给 `grep` 自动加 `-n`、给 `find` 限定目录、为命令注入超时；
4. **审计与计费**：按工具类型记录调用量，对高成本工具限流；
5. **结果缓存命中**：只读工具参数命中缓存时直接 block 并回填缓存结果，跳过真实执行。

```bash
pi> 帮我执行 rm -rf / --no-preserve-root
# 工具被阻止，模型收到 "[hellopi] 拒绝 rm -rf 根目录/家目录/通配符"，不会真的执行

pi> 用 bash 执行 ls
# 实际执行 ls -la，模型返回详细列表；控制台出现"参数修补: ls → ls -la"

pi> 用 bash 执行 echo hello
# 正常命令不受影响
cat ~/.pi-hellopi/tool-calls.log
```

## tool_result：结果进入上下文前的出站过滤

工具执行完成、`tool_execution_end` 之后、结果消息进入历史之前触发。处理程序像中间件一样链式执行：后一个看到前一个改写后的结果；可以返回部分补丁，省略的字段保持原值。

| 字段 | 类型 | 说明 |
|------|------|------|
| `toolCallId` / `toolName` | `string` | 调用 ID 与工具名 |
| `event.input` | `Record<string, unknown>` | 本次调用参数 |
| `event.content` | `(TextContent \| ImageContent)[]` | 结果内容 |
| `event.isError` | `boolean` | 是否失败 |
| `event.details` | 各工具不同 | 结构化详情（bash 的退出码/耗时等） |

返回补丁：`{ content? }` 替换内容、`{ details? }` 替换详情、`{ isError? }` 覆盖错误标记（可把失败"翻译"成成功，反之亦然）。

### Demo：AWS Access Key 脱敏

```typescript
// [AGC:START] tool=Cc author=fangkun
const AWS_KEY_PATTERN = /AKIA[0-9A-Z]{16}/g;
const REDACTED = "***AKIA-REDACTED***";

export default function register(pi: ExtensionAPI): void {
  pi.on("tool_result", async (event) => {
    logEvent("tool_result", { toolName: event.toolName, isError: event.isError });
    appendDemoFile(
      "tool-results.log",
      `result ${event.toolName} error=${event.isError} parts=${event.content?.length ?? 0}`,
    );

    let redactedCount = 0;
    const content = event.content.map((part) => {
      if (part.type !== "text") return part;
      const matches = part.text.match(AWS_KEY_PATTERN) ?? [];
      if (matches.length === 0) return part;
      redactedCount += matches.length;
      return { ...part, text: part.text.replace(AWS_KEY_PATTERN, REDACTED) };
    });

    if (redactedCount > 0) {
      logAction("tool_result", `工具结果脱敏 ${redactedCount} 处 AWS Access Key`);
      appendDemoFile("tool-results.log", `REDACTED ${event.toolName} count=${redactedCount}`);
      return { content };
    }
    return;
  });
}
// [AGC:END]
```

要点：

- **只改文本片段**：`part.type !== "text"` 的片段（图片等）原样返回，不破坏内容结构；
- **不可变更新**：`{ ...part, text }` 生成新片段，`content.map` 生成新数组，不原地改事件对象；
- **命中才返回**：没有密钥时返回 `undefined`，零开销放行；
- **与 context 脱敏的分工**：`tool_result` 只管工具结果这一类消息、在结果产生时立刻处理；[`context`](./18-hellopi-context) 在每次请求前扫描全部消息（含用户输入、历史消息），是最后一道兜底。生产环境常两层都做。

### 业务场景

1. **输出脱敏**：工具结果里的密钥、连接串、内部 URL 在进入上下文前抹掉（本 demo）；
2. **结果瘦身**：截断超长日志、移除 ANSI 颜色码、压缩重复行，节省上下文 token；
3. **错误翻译**：把晦涩报错改成可操作建议，或给失败结果附加排查提示（配合 `isError` 覆盖）；
4. **结果缓存/复用**：把只读工具结果写入外部缓存，供 `tool_call` 侧命中回填。

```bash
pi> 用 bash 执行 echo "AKIAIOSFODNN7EXAMPLE" 并告诉我输出了什么
# 模型回复的是 ***AKIA-REDACTED***（它看到的结果已脱敏）
# 控制台出现 "工具结果脱敏 1 处 AWS Access Key"

pi> 用 bash 执行 echo hello
# 原样返回，不受影响
cat ~/.pi-hellopi/tool-results.log
```

## 入站/出站过滤器的设计思路

这两个事件组合起来就是经典的**中间件/管道模型**：

| 位置 | 事件 | 管什么 | 典型手段 |
|------|------|--------|----------|
| 入站 | `tool_call` | 工具**该不该执行、用什么参数执行** | block + reason、原地改 input |
| 出站 | `tool_result` | 结果**该不该让模型看到、以什么形态看到** | 改 content/details/isError |

写这类过滤器时遵循三条经验：

1. **规则表驱动**：拦截/脱敏规则用数据数组维护（如 demo 的 `DANGEROUS_PATTERNS`），审核和加规则不用碰逻辑；
2. **最小修改**：只改必须改的字段，其余原样透传（tool_result 的部分补丁语义天然支持这一点）；
3. **留痕**：拦截和改写都写日志（tool-calls.log / tool-results.log）——安全类扩展出了问题，日志是唯一的复盘依据。

## 相关文档

- [工具执行观测](./17-hellopi-tool-execution) - tool_execution_start/update/end 只读事件
- [Context 事件](./18-hellopi-context) - 消息侧的全量脱敏兜底
- [Pi Coding Agent 事件系统](./5-events) - isToolCallEventType 类型收窄详解
- [hellopi 事件包总览](./11-hellopi-events-overview)

<!-- [AGC:END] -->
