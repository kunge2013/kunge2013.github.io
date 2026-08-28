---
title: hellopi 事件包 14 · 会话生命周期（下）：上下文压缩与 /tree 导航
description: session_before_compact、session_compact、session_before_tree、session_tree 四个事件实战——取消压缩、自定义摘要、接管 /tree 分支导航摘要
tags: [Pi Agent, 扩展, 事件, compact, tree]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# hellopi 事件包 14 · 会话生命周期（下）：上下文压缩与 /tree 导航

<!-- [AGC:START] tool=Cc author=fangkun -->

本篇讲两组"前后配对"的会话事件：压缩（`session_before_compact` → `session_compact`）和树导航（`session_before_tree` → `session_tree`）。它们的共同特点是：**before 事件既能取消，也能跳过 pi 的默认 LLM 调用、直接提供自己的结果**——这是省 token、做定制化的关键口子。

## 上下文压缩：为什么需要它

对话变长后，消息总量会逼近模型的上下文窗口。pi 的压缩（compaction）会让 LLM 把较早的对话总结成一条摘要条目，之后只带摘要 + 最近消息继续。触发方式有三种：手动 `/compact`、接近阈值自动压缩（threshold）、上下文溢出后恢复（overflow）。

```text
上下文过长 / 用户执行 /compact
 ├─ session_before_compact   ← 闸门：可取消 / 可提供自定义摘要
 │    ├─ { cancel: true }                  → 中止压缩
 │    ├─ { compaction: CompactionResult }  → 用扩展摘要替代 LLM 压缩（省一次大调用）
 │    └─ 默认 → LLM 生成摘要
 └─ session_compact          ← 压缩已落盘（只读通知）
```

## session_before_compact：取消压缩或接管摘要

### 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `event.preparation` | `CompactionPreparation` | 压缩准备数据（`tokensBefore`、`firstKeptEntryId` 等） |
| `event.branchEntries` | `SessionEntry[]` | 将被压缩的会话条目 |
| `event.customInstructions` | `string?` | 用户传入的自定义压缩指令 |
| `event.reason` | `"manual" \| "threshold" \| "overflow"` | 压缩原因 |
| `event.willRetry` | `boolean` | 压缩后是否重试中止的轮次（溢出恢复） |
| `event.signal` | `AbortSignal` | 压缩被取消时触发 |

返回值：

| 字段 | 类型 | 说明 |
|------|------|------|
| `cancel` | `boolean?` | `true` 取消压缩 |
| `compaction` | `CompactionResult?` | 自定义压缩结果（跳过默认 LLM 压缩） |

### Demo：记录待压缩规模 + 哨兵拦截

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("session_before_compact", async (event) => {
    logEvent("session_before_compact", {
      branchEntries: event.branchEntries?.length,
      tokensBefore: event.preparation?.tokensBefore,
      hasCustomInstructions: event.customInstructions !== undefined,
    });
    appendDemoFile(
      "compactions.log",
      `before-compact entries=${event.branchEntries?.length ?? 0} tokensBefore=${event.preparation?.tokensBefore ?? 0}`,
    );

    if (sentinelExists("BLOCK_COMPACT")) {
      logAction("session_before_compact", "BLOCK_COMPACT 哨兵存在，已取消压缩");
      return { cancel: true };
    }
    return;
  });
}
// [AGC:END]
```

`event.preparation.tokensBefore` 是观测上下文消耗的好指标——demo 把它和待压缩条目数一起写入 `compactions.log`，多跑几次长对话就能看出你的任务通常在多少 token 时触发压缩。

### 业务场景

1. **压缩前保留关键信息**：把重要结论（决策记录、编号列表、任务清单）先写入会话，或直接构造自定义摘要确保它们不被 LLM 概括丢；
2. **压缩门禁**：检测到会话中有未完成的工具调用、待用户确认事项时阻止压缩，避免摘要打断工作流；
3. **外部摘要服务**：用自己的摘要逻辑或更小的模型生成 `compaction` 返回，降低压缩成本——结构是 `{ summary, firstKeptEntryId, tokensBefore }`；
4. **压缩审计**：记录每次压缩前的消息量，分析上下文消耗规律。

## session_compact：压缩完成通知

压缩成功后触发（失败/中止走的是 `session_compact_failed` 事件，本 demo 未覆盖）。此时摘要条目已写入会话树，只读。

| 字段 | 说明 |
|------|------|
| `event.compactionEntry` | 写入会话树的压缩摘要条目 |
| `event.fromExtension` | 是否由扩展提供的压缩（自定义摘要时为 true） |
| `event.reason` / `event.willRetry` | 同 before 事件 |

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("session_compact", async (event) => {
    logEvent("session_compact", {
      fromExtension: event.fromExtension,
      entryType: event.compactionEntry?.type,
    });
    appendDemoFile(
      "compactions.log",
      `compact-done fromExtension=${event.fromExtension} entry=${event.compactionEntry?.type ?? "-"}`,
    );
  });
}
// [AGC:END]
```

业务用法：压缩后自动把任务清单重新注入上下文、把摘要条目同步到外部笔记系统形成"会话简史"、累计压缩次数评估压缩策略效果。

```bash
# 正常压缩：多轮对话后 /compact
# compactions.log 同时出现 before-compact 和 compact-done 两行
touch ~/.pi-hellopi/BLOCK_COMPACT
# 再次 /compact → 提示已取消，对话历史不变
rm ~/.pi-hellopi/BLOCK_COMPACT
```

## /tree 导航：分支回退时的摘要

pi 的会话是一棵树：`/fork` 分叉后，每个分支有自己的对话。用 `/tree` 回退到旧分支节点时，岔路口之后**当前分支**的对话需要被总结成摘要带入新分支，否则模型不知道"另一条线发生过什么"。

```text
用户在 /tree 中选择一个分支节点
 ├─ session_before_tree    ← 闸门：可取消 / 可直接提供摘要 / 可改摘要指令
 │    ├─ { cancel: true }                → 中止导航
 │    ├─ { summary: { summary } }         → 跳过 LLM，直接用扩展摘要
 │    └─ 默认 → LLM 生成摘要
 └─ session_tree           ← 导航完成，会话已切到目标分支（只读）
```

## session_before_tree：取消导航或接管摘要

### 字段（都在 `event.preparation` 下）

| 字段 | 说明 |
|------|------|
| `targetId` | 导航目标节点 ID |
| `oldLeafId` | 当前叶子节点 |
| `commonAncestorId` | 两个分支的共同祖先 |
| `entriesToSummarize` | 需要摘要的条目 |
| `userWantsSummary` | 用户是否要求生成摘要 |
| `customInstructions` | 自定义摘要指令 |

返回值：

| 字段 | 说明 |
|------|------|
| `cancel` | 取消导航 |
| `summary` | `{ summary: string; details? }`，直接提供摘要（跳过 LLM 调用） |
| `customInstructions` / `replaceInstructions` | 覆盖/追加摘要指令 |
| `label` | 挂到摘要条目上的标签（可在会话树中识别来源） |

### Demo：哨兵开启"扩展摘要"，完全不调 LLM

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("session_before_tree", async (event) => {
    logEvent("session_before_tree", {
      targetId: event.preparation?.targetId,
      entriesToSummarize: event.preparation?.entriesToSummarize?.length,
      userWantsSummary: event.preparation?.userWantsSummary,
    });
    appendDemoFile(
      "tree.log",
      `before-tree target=${event.preparation?.targetId ?? "-"} summarize=${event.preparation?.entriesToSummarize?.length ?? 0}`,
    );

    if (sentinelExists("AUTO_TREE_SUMMARY")) {
      logAction("session_before_tree", "AUTO_TREE_SUMMARY 哨兵存在，使用扩展自定义摘要");
      return {
        summary: {
          summary:
            "【hellopi 自定义摘要】这是由 session_before_tree 事件直接提供的分支摘要，" +
            "未调用 LLM。用于演示扩展可以接管 /tree 导航时的摘要生成。",
        },
        label: "hellopi-demo",
      };
    }
    return;
  });
}
// [AGC:END]
```

对比两种路径的差异非常直观：默认导航时要等一次 LLM 调用；哨兵存在时**瞬间完成**，且摘要条目带着 `hellopi-demo` 标签。

### 业务场景

1. **导航门禁**：工作区有未保存修改时阻止回退分支，避免代码状态与对话历史错位；
2. **缓存摘要**：首次导航生成摘要后缓存，再次走同一路径直接返回，省一次 LLM 调用（demo 的哨兵版是最简形态——固定摘要）；
3. **企业知识库归档**：摘要同步写入外部系统，用 `label` 标记来源；
4. **自定义摘要风格**：通过 `customInstructions` 让摘要保留特定格式（决策表、TODO 列表）。

## session_tree：导航完成通知

| 字段 | 说明 |
|------|------|
| `event.newLeafId` / `event.oldLeafId` | 导航后/导航前的叶子节点 |
| `event.summaryEntry` | 本次生成的分支摘要条目（无摘要时为 undefined） |
| `event.fromExtension` | 是否由扩展触发的导航 |

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("session_tree", async (event) => {
    logEvent("session_tree", {
      newLeafId: event.newLeafId,
      oldLeafId: event.oldLeafId,
      hasSummary: event.summaryEntry !== undefined,
    });
    appendDemoFile(
      "tree.log",
      `tree-done ${event.oldLeafId ?? "-"} -> ${event.newLeafId ?? "-"} summary=${event.summaryEntry ? "yes" : "no"} fromExt=${event.fromExtension ?? false}`,
    );
  });
}
// [AGC:END]
```

业务用法：切回某分支时自动恢复该分支相关的工作区状态（打开文件、应用补丁）、记录完整"跳转前→跳转后"轨迹做使用统计、读取 `summaryEntry` 评估自动摘要是否丢信息。

```bash
# 1. 制造分叉：对话几轮 → /fork → 新分支再说几句话
# 2. /tree 选择旧分支：默认走 LLM 摘要，tree.log 出现 before-tree + tree-done
touch ~/.pi-hellopi/AUTO_TREE_SUMMARY
# 3. 再次导航：瞬间完成，摘要带 hellopi-demo 标签，无 LLM 等待
rm ~/.pi-hellopi/AUTO_TREE_SUMMARY
cat ~/.pi-hellopi/tree.log   # before-tree 与 tree-done 成对出现
```

## 本类事件小结

| 事件 | 能否改变流程 | 核心用途 |
|------|--------------|----------|
| `session_before_compact` | **取消 / 自定义摘要** | 压缩门禁、关键信息保留、外部摘要服务 |
| `session_compact` | 否（只读） | 压缩统计、压缩后补救、摘要归档 |
| `session_before_tree` | **取消 / 自定义摘要 / 改指令** | 导航门禁、摘要缓存、摘要风格定制 |
| `session_tree` | 否（只读） | 导航轨迹、分支切换联动、摘要质量分析 |

两组事件的设计模式完全一致：**before 管决策（取消/接管），after 管观测**。凡是"pi 默认要调一次 LLM 做总结"的地方，都留了让扩展用自己结果替代的口子。

## 相关文档

- [会话生命周期（上）：启动、关闭与切换分叉](./13-hellopi-session-lifecycle)
- [hellopi 事件包总览](./11-hellopi-events-overview)
- [Pi Coding Agent 事件系统](./5-events)

<!-- [AGC:END] -->
