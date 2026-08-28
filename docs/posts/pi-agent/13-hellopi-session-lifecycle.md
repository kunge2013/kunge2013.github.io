---
title: hellopi 事件包 13 · 会话生命周期（上）：启动、关闭与切换分叉
description: session_start、session_shutdown、session_before_switch、session_before_fork 四个会话事件实战——状态初始化、资源清理、取消会话切换与分叉
tags: [Pi Agent, 扩展, 事件, session_start, session_shutdown]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# hellopi 事件包 13 · 会话生命周期（上）：启动、关闭与切换分叉

<!-- [AGC:START] tool=Cc author=fangkun -->

会话事件围绕"一个会话从生到灭"的过程触发。本篇讲 4 个：`session_start`（生）、`session_shutdown`（灭）、`session_before_switch`（换会话前的闸门）、`session_before_fork`（分叉前的闸门）。压缩和 /tree 导航相关的 4 个事件见[下篇](./14-hellopi-session-compact-tree)。

## 事件在生命周期中的位置

```text
pi 启动
 └─ session_start(reason="startup")

 用户执行 /new 或 /resume
 ├─ session_before_switch   ← 闸门：返回 { cancel: true } 可中止
 ├─ session_shutdown(reason="new"/"resume")   旧运行时拆除
 └─ session_start(reason="new"/"resume", previousSessionFile)

 用户执行 /fork 或 /clone
 ├─ session_before_fork     ← 闸门：可取消 / 可跳过对话恢复
 ├─ session_shutdown(reason="fork")
 └─ session_start(reason="fork", previousSessionFile)

 退出 pi / 重载扩展
 └─ session_shutdown(reason="quit"/"reload")
```

关键认知：**会话切换 = 旧扩展实例 shutdown + 新扩展实例 start**。扩展的内存状态（模块级变量）在这个过程中会重置，所以需要跨会话保留的东西必须在 `session_shutdown` 落盘、在 `session_start` 恢复。

## session_start：初始化状态的第一个可靠时机

### 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `reason` | `"startup" \| "reload" \| "new" \| "resume" \| "fork"` | 启动原因 |
| `previousSessionFile` | `string?` | 上一个会话文件路径（new/resume/fork 时存在） |

只读通知，无返回值。

### Demo：记录会话快照

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("session_start", async (event) => {
    logEvent("session_start", {
      reason: event.reason,
      previousSessionFile: event.previousSessionFile,
    });

    const snapshot = {
      reason: event.reason,
      previousSessionFile: event.previousSessionFile ?? null,
      startedAt: new Date().toISOString(),
    };
    writeDemoJson("last-session.json", snapshot);
    appendDemoFile("sessions.log", `start reason=${event.reason} from=${event.previousSessionFile ?? "-"}`);
  });
}
// [AGC:END]
```

`reason` 的五种取值对应五种真实动作，这是 demo 最想让你观察到的东西：

| reason | 触发动作 |
|--------|----------|
| `startup` | pi 启动，新建会话 |
| `new` | `/new` 新建会话 |
| `resume` | `/resume` 恢复历史会话 |
| `fork` | `/fork` 从某条目分叉 |
| `reload` | 扩展被重载 |

### 业务场景

1. **恢复扩展状态**：读取上次保存的统计数据、用户偏好；
2. **启动后台任务**：开启文件监视器（fs.watch）、定时上报、webhook 长连接；
3. **环境检查**：启动时校验 API key、依赖工具是否就绪，缺什么提示什么；
4. **会话审计**：记录谁在什么时候恢复了哪个历史会话（`previousSessionFile`）。

## session_shutdown：保存状态、释放资源的最后时机

### 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `reason` | `"quit" \| "reload" \| "new" \| "resume" \| "fork"` | 关闭原因 |
| `targetSessionFile` | `string?` | 会话替换时的目标会话文件 |

只读通知，无返回值。注意 reason 集合与 start 不同：**没有 startup，多了 quit**。

### Demo：清理临时目录

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("session_shutdown", async (event) => {
    logEvent("session_shutdown", { reason: event.reason, targetSessionFile: event.targetSessionFile });
    appendDemoFile("shutdown.log", `shutdown reason=${event.reason} target=${event.targetSessionFile ?? "-"}`);

    cleanDemoTmp(); // rm -rf ~/.pi-hellopi/tmp
    logAction("session_shutdown", "已清理 ~/.pi-hellopi/tmp 临时目录");
  });
}
// [AGC:END]
```

`cleanDemoTmp` 是个很好的示范：其他事件 demo 可以放心往 `~/.pi-hellopi/tmp/` 扔中间产物，会话结束时统一兜底清理，不用各自关心删除逻辑。

### 业务场景

1. **资源释放**：关闭文件监视器、子进程、定时器、长连接——否则切换会话后旧监听器还在跑，造成重复触发和内存泄漏；
2. **状态持久化**：把内存中的统计/队列刷盘，保证下次 `session_start` 能恢复；
3. **临时文件清理**：删除扩展产生的中间产物；
4. **退出通知**：webhook 通知外部系统"会话结束"。

### start / shutdown 配对测试

```bash
# 造一个临时文件
mkdir -p ~/.pi-hellopi/tmp && echo hello > ~/.pi-hellopi/tmp/a.tmp

# 分别测试：直接退出 pi、/new、/resume、/fork、重载扩展
# 每次动作后观察：
cat ~/.pi-hellopi/shutdown.log   # reason 取值各不相同
ls ~/.pi-hellopi/tmp 2>/dev/null || echo "tmp 已被清理"
cat ~/.pi-hellopi/last-session.json  # 新会话的 reason
```

## session_before_switch：取消 /new 与 /resume

这是少数能**否决用户操作**的事件。返回 `{ cancel: true }` 后切换被中止，当前会话保持不变。

### 字段与返回值

| 字段 | 类型 | 说明 |
|------|------|------|
| `event.reason` | `"new" \| "resume"` | 切换类型 |
| `event.targetSessionFile` | `string?` | 目标会话文件（resume 时存在） |
| 返回 `cancel` | `boolean?` | `true` 取消本次切换 |

### Demo：哨兵文件模拟"未保存工作保护"

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("session_before_switch", async (event) => {
    logEvent("session_before_switch", {
      reason: event.reason,
      targetSessionFile: event.targetSessionFile,
    });

    if (sentinelExists("BLOCK_SWITCH")) {
      logAction("session_before_switch", "BLOCK_SWITCH 哨兵存在，已取消会话切换");
      return { cancel: true };
    }
    return;
  });
}
// [AGC:END]
```

哨兵文件（`touch ~/.pi-hellopi/BLOCK_SWITCH` 即存在，删除即恢复）是 demo 里模拟运行时条件的常用手法——真实扩展中这里的判断会换成"是否有未提交的批量修改""测试是否通过"等业务条件。

### 业务场景

1. **未保存工作保护**：扩展维护了脏状态时，提示并阻止切换；
2. **强制收尾流程**：切换前要求先完成某些检查；
3. **切换前自动保存**：不取消，但在事件里把扩展状态落盘，保证新会话能恢复；
4. **审计合规**：禁止切换到外部目录的会话文件。

```bash
# 正常情况：/new 切换成功
# 开启闸门：
touch ~/.pi-hellopi/BLOCK_SWITCH
# 再次 /new 或 /resume → 控制台提示"已取消会话切换"，会话不变
rm ~/.pi-hellopi/BLOCK_SWITCH   # 恢复
```

## session_before_fork：取消 /fork 或轻量分叉

`/fork`（从某条目分叉）和 `/clone`（从某条目克隆）之前触发。

### 字段与返回值

| 字段 | 类型 | 说明 |
|------|------|------|
| `event.entryId` | `string` | 分叉点条目 ID |
| `event.position` | `"before" \| "at"` | 在该条目之前分叉（/fork），还是从该条目分叉（/clone） |
| 返回 `cancel` | `boolean?` | `true` 取消分叉 |
| 返回 `skipConversationRestore` | `boolean?` | `true` 分叉但不恢复对话上下文（轻量分叉） |

### Demo：记录分叉点 + 哨兵拦截

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("session_before_fork", async (event) => {
    logEvent("session_before_fork", { entryId: event.entryId, position: event.position });
    appendDemoFile("forks.log", `fork at entry=${event.entryId} position=${event.position}`);

    if (sentinelExists("BLOCK_FORK")) {
      logAction("session_before_fork", "BLOCK_FORK 哨兵存在，已取消分叉");
      return { cancel: true };
    }
    return;
  });
}
// [AGC:END]
```

### 业务场景

1. **分叉前检查点**：自动把当前工作区状态（git stash、文件快照）与分叉点关联，将来能回溯"分叉时代码长什么样"；
2. **防止误分叉**：自动化任务运行期间锁定会话树；
3. **轻量实验分支**：返回 `{ skipConversationRestore: true }`，开一个不带历史上下文的干净分支——适合"我想换个思路重新问，但不想被前文带偏"；
4. **分叉审计**：记录谁在什么位置分叉，配合[下篇](./14-hellopi-session-compact-tree)的 `session_tree` 还原完整会话树操作历史。

```bash
# 对话几轮后 /fork → forks.log 出现分叉记录
touch ~/.pi-hellopi/BLOCK_FORK
# 再次 /fork → 提示已取消，会话树无新分支
rm ~/.pi-hellopi/BLOCK_FORK
```

## 本类事件小结

| 事件 | 能否改变流程 | 核心用途 |
|------|--------------|----------|
| `session_start` | 否（只读） | 恢复状态、启动后台任务、环境检查 |
| `session_shutdown` | 否（只读） | 刷盘状态、释放资源、清理临时文件 |
| `session_before_switch` | **能取消** | 未保存保护、切换前保存、合规拦截 |
| `session_before_fork` | **能取消/轻量分叉** | 分叉检查点、防误分叉、审计 |

记忆法：**start 恢复、shutdown 收尾、before_* 是闸门**。凡是名字里带 `before_` 的会话事件，都可以返回 `{ cancel: true }` 否决用户操作。

## 相关文档

- [hellopi 事件包总览](./11-hellopi-events-overview) - 环境搭建与开关速查
- [会话生命周期（下）：压缩与 /tree 导航](./14-hellopi-session-compact-tree) - compact/tree 四个事件
- [Pi Coding Agent 事件系统](./5-events) - 完整字段参考

<!-- [AGC:END] -->
