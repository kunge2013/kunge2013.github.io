---
title: hellopi 事件包 20 · 模型与思考级别切换
description: model_select 与 thinking_level_select 两个通知事件实战——模型使用画像、切换来源审计、思考成本统计与 UI 状态栏同步
tags: [Pi Agent, 扩展, 事件, model_select, thinking_level]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# hellopi 事件包 20 · 模型与思考级别切换

<!-- [AGC:START] tool=Cc author=fangkun -->

模型和思考级别的切换**不在 agent 循环内**，任何时刻都可能发生（命令、快捷键、会话恢复）。这两个事件都是纯通知——只读、无返回值——用于记录切换轨迹和同步外部 UI。

```text
（任意时刻）
 ├─ /model 命令、Ctrl+P 模型选择器、会话恢复还原模型
 │    └─ model_select
 ├─ 切换思考级别（快捷键/命令/pi.setThinkingLevel()）
 │    └─ thinking_level_select
 └─ 模型变化导致思考级别被限制/调整时，thinking_level_select 先于 model_select
```

## model_select：新旧模型与切换来源

| 字段 | 类型 | 说明 |
|------|------|------|
| `event.model` | `Model<any>` | 新模型（`provider`、`id` 等） |
| `event.previousModel` | `Model<any> \| undefined` | 旧模型（首次选择时为 undefined） |
| `event.source` | `"set" \| "cycle" \| "restore"` | 切换来源 |

`source` 的三种取值：

| source | 触发方式 |
|--------|----------|
| `"set"` | `/model` 命令手动设置 |
| `"cycle"` | Ctrl+P 循环切换 |
| `"restore"` | `/resume` 会话恢复时还原历史模型 |

### Demo：记录"旧模型 → 新模型"轨迹

```typescript
// [AGC:START] tool=Cc author=fangkun
function modelId(model: { provider?: string; id?: string } | undefined): string {
  return model ? `${model.provider ?? "?"}/${model.id ?? "?"}` : "(none)";
}

export default function register(pi: ExtensionAPI): void {
  pi.on("model_select", async (event) => {
    const from = modelId(event.previousModel);
    const to = modelId(event.model);

    logEvent("model_select", { from, to, source: event.source });
    appendDemoFile("model.log", `${from} -> ${to} source=${event.source}`);
  });
}
// [AGC:END]
```

`modelId` 辅助函数把模型对象格式化成 `provider/id` 的可读形式（首次选择时旧模型为 `(none)`）——这是处理 `previous*` 可选字段的标准兜底写法。

### 业务场景

1. **模型使用画像**：统计各模型的使用时长/次数，结合 agent_end 的 cost 数据做成本分析；
2. **模型特定初始化**：切到某模型时自动调整兼容配置（如该模型不支持某种工具序列化方式）或联动调整 thinking level；
3. **状态栏同步**：外部 UI/底部栏显示当前模型；
4. **切换审计**：记录是谁、通过什么方式切换的模型（`source` 区分手动/循环/恢复）。

```bash
# /model 选择另一个模型  → source="set"
# Ctrl+P 循环切换         → source="cycle"
# /resume 历史会话        → source="restore"（该会话用过不同模型时）
cat ~/.pi-hellopi/model.log
# (none) -> openai/gpt-xxx source=set
# openai/gpt-xxx -> anthropic/claude-xxx source=cycle
```

> 要**主动**切换模型，用 `ctx.setModel()`，这个事件只是通知。

## thinking_level_select：思考级别变化

思考级别（off/minimal/low/medium/high 等，具体取值随模型能力）控制模型投入多少推理预算。

| 字段 | 类型 | 说明 |
|------|------|------|
| `event.level` | `ThinkingLevel` | 新级别 |
| `event.previousLevel` | `ThinkingLevel` | 旧级别 |

纯通知，返回值被忽略。

### Demo：记录级别切换

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("thinking_level_select", async (event) => {
    logEvent("thinking_level_select", { from: event.previousLevel, to: event.level });
    appendDemoFile("thinking.log", `${event.previousLevel} -> ${event.level}`);
  });
}
// [AGC:END]
```

### 业务场景

1. **思考成本统计**：按级别统计 token 消耗差异，评估高思考级别是否划算；
2. **UI 同步**：状态栏显示当前思考级别（官方推荐用法是 `ctx.ui.setStatus("thinking", ...)`）；
3. **策略联动**：切到 high 时自动降低并行度/拉长超时，切到 off 时切换快速模型；
4. **习惯分析**：记录用户在什么任务前倾向于调整思考级别。

```bash
# 在 pi 中用快捷键/命令循环调整思考级别
cat ~/.pi-hellopi/thinking.log
# low -> medium
# medium -> high
```

> 主动设置用 `ctx.setThinkingLevel()`，读取用 `ctx.getThinkingLevel()`。

## 这两个事件为什么值得单独监听

它们看起来只是"记录一下"，但在真实工作流里解决两类问题：

- **可观测性**：模型和思考级别直接决定成本与回答质量。当用户反馈"今天回答特别贵/特别笨"时，`model.log` + `thinking.log` 能立刻还原他当时用的是什么配置；
- **外部 UI 集成**：pi 作为终端工具，其状态常被嵌入更大的工作流（状态栏、IDE 插件、web 面板）。这两个事件 + agent_start/end 就是驱动外部"当前状态"显示的全部信号源。

## 相关文档

- [Provider 请求与响应](./19-hellopi-provider) - 请求里可以看到实际 model 字段
- [输入拦截与 Agent 循环](./15-hellopi-input-agent) - agent_end 的 usage 成本统计
- [hellopi 事件包总览](./11-hellopi-events-overview)

<!-- [AGC:END] -->
