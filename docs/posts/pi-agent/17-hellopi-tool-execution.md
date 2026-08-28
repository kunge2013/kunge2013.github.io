---
title: hellopi 事件包 17 · 工具执行观测：计时、流式与失败统计
description: tool_execution_start/update/end 三个只读事件实战——工具耗时统计、bash 长命令流式输出镜像、并行工具调用观测
tags: [Pi Agent, 扩展, 事件, tool_execution, 性能监控]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# hellopi 事件包 17 · 工具执行观测：计时、流式与失败统计

<!-- [AGC:START] tool=Cc author=fangkun -->

模型决定调用工具后，工具的"执行过程"由三个只读事件刻画：开始、流式中间结果、结束。它们与[工具拦截事件](./21-hellopi-tool-intercept)（`tool_call` / `tool_result`，能阻止/改写）不同——**这三个事件只负责观测，不能干预执行**。

```text
模型决定调用工具
 ├─ tool_call                 ← 闸门：可 block / 改参数（见第 21 篇）
 ├─ tool_execution_start      ← 工具真正开始跑（计时起点）
 │   ├─ tool_execution_update ← 流式中间结果（bash 实时输出，高频）
 │   └─ tool_execution_end    ← 执行完成（成功/失败都触发）
 └─ tool_result               ← 结果入上下文前可改写（见第 21 篇）
```

并行工具模式下的时序：start 按 assistant 源顺序预检发出；update 可能在多个工具间交错；end 按工具**完成顺序**发出。因此关联同一次调用必须靠 `toolCallId`，不能靠事件先后顺序。

## tool_execution_start：计时起点与调用审计

| 字段 | 类型 | 说明 |
|------|------|------|
| `toolCallId` | `string` | 本次调用唯一 ID（与 update/end/tool_call/tool_result 关联） |
| `toolName` | `string` | 工具名（bash/read/edit/grep… 或自定义工具名） |
| `args` | `any` | 实际执行参数 |

```typescript
// [AGC:START] tool=Cc author=fangkun
import { toolStartTimes } from "../shared/state.js";

export default function register(pi: ExtensionAPI): void {
  pi.on("tool_execution_start", async (event) => {
    toolStartTimes.set(event.toolCallId, Date.now());

    const argsPreview = JSON.stringify(event.args ?? {}).slice(0, 120);
    logEvent("tool_execution_start", { toolName: event.toolName, toolCallId: event.toolCallId });
    appendDemoFile("tools.log", `exec-start ${event.toolName} id=${event.toolCallId} args=${argsPreview}`);
  });
}
// [AGC:END]
```

开始时间戳存到 `shared/state.ts` 的模块级 `Map<toolCallId, number>` 里——这是跨事件共享状态的标准模式：start 事件写、end 事件读并删除。

业务场景：统计每个工具的平均/P99 耗时发现慢工具、记录"哪次 agent 运行调了什么工具什么参数"的调用审计、并行执行时追踪并发度、工具开始前预分配资源。

## tool_execution_update：流式中间结果（高频，需节流）

典型触发者是 bash 长命令——命令边跑边输出，pi 把已产生的部分结果推出来。

| 字段 | 说明 |
|------|------|
| `toolCallId` / `toolName` / `args` | 同 start |
| `partialResult` | 当前部分结果（bash 通常是已输出的文本） |

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("tool_execution_update", async (event) => {
    if (!throttle(event.toolCallId)) return;   // 800ms 最多一次，key 是 toolCallId

    const preview =
      typeof event.partialResult === "string"
        ? event.partialResult.slice(0, 120)
        : JSON.stringify(event.partialResult ?? {}).slice(0, 120);

    console.log(`[hellopi] tool_execution_update ${event.toolName} partial="${preview}"`);
    appendDemoFile("tools.log", `exec-update ${event.toolName} id=${event.toolCallId} partial=${JSON.stringify(preview)}`);
  });
}
// [AGC:END]
```

注意节流 key 用的是 **`event.toolCallId`** 而不是固定字符串：并行跑两个 bash 命令时，它们各自有独立的 800ms 节流窗口，互不挤占。

业务场景：

1. **实时输出镜像**：把 bash 输出同步到外部终端/网页/日志文件；
2. **长任务进度**：识别测试运行、构建、下载的进度百分比并展示；
3. **异常早发现**：输出中出现 error/警告关键字时提前告警，不用等工具结束；
4. **死循环检测**：工具长时间只有 update 没有 end 且输出停滞 → 提示用户。

## tool_execution_end：耗时结算与失败统计

| 字段 | 类型 | 说明 |
|------|------|------|
| `toolCallId` | `string` | 调用 ID |
| `toolName` | `string` | 工具名 |
| `result` | `any` | 执行结果（bash 输出、文件内容等） |
| `isError` | `boolean` | 是否执行失败 |

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("tool_execution_end", async (event) => {
    const startedAt = toolStartTimes.get(event.toolCallId);
    const durationMs = startedAt ? Date.now() - startedAt : undefined;
    toolStartTimes.delete(event.toolCallId);   // 用完即删，避免 Map 无限增长

    logEvent("tool_execution_end", {
      toolName: event.toolName,
      isError: event.isError,
      durationMs,
    });
    appendDemoFile(
      "tools.log",
      `exec-end   ${event.toolName} id=${event.toolCallId} ms=${durationMs ?? "?"} error=${event.isError}`,
    );
  });
}
// [AGC:END]
```

三个细节：

- **`toolStartTimes.delete`**：计时完成后立即清理 Map。长时间会话中工具调用成千上万，不清理就是内存泄漏；
- **`durationMs` 可能为 undefined**：start 事件缺失时（如扩展在工具执行中途被重载）兜底显示 `?`；
- **失败也触发**：`isError=true` 时 end 照常到来，这是统计错误率的依据。

业务场景：工具耗时排行榜定位性能瓶颈、错误率突增时告警、对只读工具（read/grep/ls）按参数做结果缓存（命中后可配合 `tool_call` 拦截直接返回）、释放 start 时预分配的资源。

## 动手测试

```bash
# 1. 计时：sleep 2 后看 ms≈2000
pi> 用 bash 执行 sleep 2 然后 echo done
# tools.log: exec-start bash … / exec-end bash ms≈20xx error=false

# 2. 流式输出：长命令才能看到 update
pi> 用 bash 每隔 0.5 秒输出一个数字，从 1 数到 10
# 执行过程中控制台周期出现 tool_execution_update bash partial="…"
# 对比：echo hi 这种瞬间结束的命令只有 start/end，没有 update

# 3. 失败统计
pi> 用 bash 执行 exit 1
# exec-end bash error=true

# 4. 多工具并行
pi> 读一下 package.json 再 grep 一下 "scripts"
# read、grep 的 id 各不相同，start/end 按各自完成顺序成对
cat ~/.pi-hellopi/tools.log
```

## 本类事件小结

| 事件 | 频率 | 能否干预 | 核心用途 |
|------|------|----------|----------|
| `tool_execution_start` | 每次调用 1 次 | 否（只读） | 计时起点、调用审计、资源预分配 |
| `tool_execution_update` | 流式高频 | 否（只读） | 输出镜像、进度展示、异常早发现（节流！） |
| `tool_execution_end` | 每次调用 1 次 | 否（只读） | 耗时统计、失败统计、资源清理 |

记忆法：**要看工具干得怎么样，用这三个事件；要管工具能不能干、干出什么结果，用 `tool_call` / `tool_result`**。观测事件只读、安全、永远不改变 pi 的行为，是写扩展时最容易上手的一类。

## 相关文档

- [工具拦截：危险命令闸门与结果脱敏](./21-hellopi-tool-intercept) - tool_call / tool_result
- [轮次与消息事件](./16-hellopi-turn-message) - turn_end 也能看到工具失败
- [hellopi 事件包总览](./11-hellopi-events-overview)

<!-- [AGC:END] -->
