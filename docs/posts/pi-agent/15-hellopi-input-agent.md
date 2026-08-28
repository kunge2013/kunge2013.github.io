---
title: hellopi 事件包 15 · 输入拦截与 Agent 循环
description: input、before_agent_start、agent_start、agent_end 四个事件实战——自定义命令、输入改写、系统提示词注入与 agent 运行状态/用量统计
tags: [Pi Agent, 扩展, 事件, input, before_agent_start, agent_start]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# hellopi 事件包 15 · 输入拦截与 Agent 循环

<!-- [AGC:START] tool=Cc author=fangkun -->

用户按下回车后，pi 内部依次经过四个事件才进入"模型说话、工具干活"的轮次循环。本篇讲这四个事件：`input`（输入闸门）、`before_agent_start`（最后改系统提示词的机会）、`agent_start` / `agent_end`（一次 agent 运行的起止）。

```text
用户回车提交输入
 ├─ input                   ← 最早拦截点：handled / transform / continue
 ├─ （未 handled 时）skill/template 扩展
 ├─ before_agent_start      ← 改系统提示词 / 注入消息
 ├─ agent_start             ← 一次 agent 循环开始
 │   └─ turn_start … turn_end（可能多轮，见后续篇章）
 └─ agent_end               ← 循环结束，本轮全部消息落定
```

## input：扩展拦截用户输入的最早位置

`input` 在扩展命令检查之后、skill/template 扩展之前触发，看到的是**原始输入文本**（`/skill:foo` 这类还没被展开）。三种返回 action 决定了输入的命运：

| action | 含义 | 附加字段 |
|--------|------|----------|
| `"continue"` | 放行（不返回值时的默认） | — |
| `"transform"` | 改写输入后继续 | `text`（必填）、`images?` |
| `"handled"` | 完全接管，agent 不启动、不耗 token | — |

事件字段：`text`（原始文本）、`images`（附带图片）、`source`（`interactive` 交互输入 / `rpc` API 调用 / `extension` 扩展注入）。

### Demo：一个事件演示三种 action

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("input", async (event) => {
    const text = event.text ?? "";
    logEvent("input", { source: event.source, text: text.slice(0, 80) });
    appendDemoFile("inputs.log", `source=${event.source} text=${JSON.stringify(text.slice(0, 120))}`);

    const trimmed = text.trim();

    // 1. 自定义命令：完全接管，不触发 agent
    if (trimmed === "/ping") {
      logAction("input", "拦截 /ping，返回 pong（handled）");
      pi.sendMessage({
        customType: "hellopi",
        content: "pong! 🏓 这条消息来自 hellopi 的 input 事件（action: handled），agent 没有被调用。",
        display: true,
      });
      return { action: "handled" };
    }

    // 2. 输入改写：">> xxx" → 强制中文回答
    if (text.startsWith(">> ")) {
      const transformed = `请用简体中文回答下面的问题：\n\n${text.slice(3)}`;
      logAction("input", "改写输入，注入中文指令（transform）");
      return { action: "transform", text: transformed };
    }

    // 3. 放行
    return { action: "continue" };
  });
}
// [AGC:END]
```

三个细节：

- **`handled` 后怎么给用户反馈？** 直接 `return { action: "handled" }` 会让输入"消失"，demo 用 `pi.sendMessage()` 发一条 `display: true` 的自定义消息把 pong 显示出来；
- **transform 可以链式**：多个扩展都返回 transform 时，后一个看到的是前一个改写后的文本；
- **`source` 用于分流**：自动化场景（rpc/extension）的输入往往不该走交互式预处理，可以据此跳过。

### 业务场景

1. **轻量自定义命令**：不想走完整 slash command 注册流程时，用 `handled` 实现查询状态、调外部 API 的快捷指令（零 token 成本）；
2. **输入预处理**：自动纠正拼写、展开缩写、把粘贴的大段日志包裹成代码块；
3. **输入门禁**：检测到密钥、身份证号等敏感信息时拦下并警告；
4. **按来源分流**：`source === "rpc"` 的自动化输入走不同逻辑。

```bash
pi> /ping                          # 出现 pong 消息，无 LLM 回复
pi> >> say hello in english        # agent 收到中文指令，用中文回复
pi> 你好                            # 正常回复，inputs.log 记录一条
```

## before_agent_start：最后改系统提示词的机会

用户提示词已确定、系统提示词已组装完毕，但 agent 循环还没开始。此事件可以**替换本轮系统提示词**或**注入一条持久消息**。

| 字段 | 说明 |
|------|------|
| `event.prompt` | 展开后的用户原始提示词 |
| `event.images` | 附带图片 |
| `event.systemPrompt` | 已组装完成的完整系统提示词（含更早处理程序的修改） |
| `event.systemPromptOptions` | 结构化组成：customPrompt、selectedTools、toolSnippets、skills、contextFiles 等 |

返回值：`{ systemPrompt? }`（替换系统提示词，多扩展链式拼接）、`{ message? }`（注入自定义消息，存入会话且发给 LLM，但不触发新轮次）。

### Demo：魔法标记触发提示词注入

```typescript
// [AGC:START] tool=Cc author=fangkun
const MAGIC_TAG = "[hellopi-sys]";

export default function register(pi: ExtensionAPI): void {
  pi.on("before_agent_start", async (event) => {
    logEvent("before_agent_start", { prompt: event.prompt.slice(0, 80) });
    appendDemoFile(
      "agent-runs.log",
      `before-agent-start prompt=${JSON.stringify(event.prompt.slice(0, 120))} sysPromptLen=${event.systemPrompt.length}`,
    );

    if (event.prompt.includes(MAGIC_TAG)) {
      logAction("before_agent_start", `检测到 ${MAGIC_TAG}，追加系统提示词`);
      return {
        systemPrompt:
          event.systemPrompt +
          "\n\n[hellopi demo 注入] 无论用户问什么，在回答的最后另起一行输出文字：--hellopi--",
      };
    }
    return;
  });
}
// [AGC:END]
```

注意返回的是 **`event.systemPrompt + 追加内容`** 而不是只返回追加段——系统提示词是"替换"语义，不带上原文就会把 pi 组装的整套提示词弄丢。验证方式很巧妙：让模型在回答末尾输出固定暗号 `--hellopi--`，肉眼即可确认注入生效。

`systemPromptOptions` 让你能看到 pi 已加载了哪些 skills、工具片段、上下文文件——需要深度改提示词时先读它，避免重复注入或与用户配置冲突。

### 业务场景

1. **动态系统提示词**：注入当前时间、git 分支、工作区状态、今日任务清单；
2. **合规策略**：强制加入"禁止输出某类内容"的指令；
3. **A/B 实验**：对部分会话追加实验性指令；
4. **上下文引导**：根据已加载 skills 调整注入内容。

```bash
pi> 说一句话                    # 正常回复，末尾无暗号
pi> 随便说点什么 [hellopi-sys]  # 回复最后单独一行出现 --hellopi--
```

## agent_start / agent_end：一次运行的起止

一次"提交"触发一个 agent 运行；运行内部可能有多个轮次（模型每调一次工具就多一轮）。`agent_start` / `agent_end` 每次提交各触发一次（自动重试可能重新触发 start）。

- `agent_start`：无字段，只读通知；
- `agent_end`：`event.messages` 是本轮产生的全部消息（user/assistant/toolResult），assistant 消息上带 `usage`（input/output/cacheRead/cacheWrite/totalTokens/cost）。

### Demo：运行状态快照 + token 用量统计

两个事件包配合，把"agent 是否在跑"写成一个可被外部读取的状态文件：

```typescript
// [AGC:START] tool=Cc author=fangkun
// agent_start：写入 running 状态
export default function register(pi: ExtensionAPI): void {
  pi.on("agent_start", async () => {
    logEvent("agent_start");
    const startedAt = new Date().toISOString();
    writeDemoJson("agent-state.json", { running: true, startedAt });
    appendDemoFile("agent-runs.log", `agent-start at=${startedAt}`);
  });
}
// [AGC:END]
```

```typescript
// [AGC:START] tool=Cc author=fangkun
// agent_end：汇总消息数与总 token，标记 running=false
export default function register(pi: ExtensionAPI): void {
  pi.on("agent_end", async (event) => {
    const messages = event.messages ?? [];
    const totalTokens = messages
      .filter((m): m is typeof m & { role: "assistant" } => m.role === "assistant")
      .reduce((sum, m) => sum + (m.usage?.totalTokens ?? 0), 0);

    logEvent("agent_end", { messageCount: messages.length, totalTokens });
    writeDemoJson("agent-state.json", {
      running: false,
      endedAt: new Date().toISOString(),
      messageCount: messages.length,
      totalTokens,
    });
    appendDemoFile("agent-runs.log", `agent-end messages=${messages.length} tokens=${totalTokens}`);
  });
}
// [AGC:END]
```

类型收窄写法 `(m): m is typeof m & { role: "assistant" } => m.role === "assistant"` 是处理联合类型消息数组的常用模式：先过滤出 assistant 消息，再安全读取 `usage`。

### 业务场景

- **agent_start**：计时起点、通知状态栏"agent 正在工作"、运行期间暂停其他通知、加运行锁防并发；
- **agent_end**：按天/按会话汇总 `usage.cost` 做成本统计、长任务完成后推送桌面通知/webhook、自动格式化改动文件或跑测试、扫描本轮回复做质量检查。

> 提示：`agent_end` 之后 pi 仍可能自动重试、自动压缩后重试。需要确认"pi 彻底空闲"的状态集成应监听 `agent_settled`（参考[事件系统](./5-events)）。

```bash
pi> 帮我写一首诗
# 回复期间 cat agent-state.json → running:true；结束后 → running:false + totalTokens
cat ~/.pi-hellopi/agent-runs.log   # 每次提交 agent-start / agent-end 成对
```

## 本类事件小结

| 事件 | 能否改变流程 | 核心用途 |
|------|--------------|----------|
| `input` | **接管/改写/放行** | 自定义命令、输入预处理、敏感信息门禁 |
| `before_agent_start` | **改提示词/注入消息** | 动态上下文、合规策略、实验指令 |
| `agent_start` | 否（只读） | 计时、状态通知、运行锁 |
| `agent_end` | 否（只读） | 成本统计、自动收尾、完成通知 |

记忆法：**input 管"进什么"，before_agent_start 管"拿什么身份答"，agent_start/end 管"这一摊活的起止"**。

## 相关文档

- [轮次与消息事件](./16-hellopi-turn-message) - agent 循环内部的 turn/message 生命周期
- [hellopi 事件包总览](./11-hellopi-events-overview)
- [Pi Coding Agent 事件系统](./5-events)

<!-- [AGC:END] -->
