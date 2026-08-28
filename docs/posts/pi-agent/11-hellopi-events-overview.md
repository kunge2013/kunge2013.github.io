---
title: hellopi 事件包实战 · 总览与环境搭建
description: 把 Pi Agent 29 个生命周期事件拆成可运行 demo 的 hellopi 扩展——目录结构、安装启用、事件顺序、可观测产物与开关速查
tags: [Pi Agent, 扩展, 事件, hellopi]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# hellopi 事件包实战 · 总览与环境搭建

<!-- [AGC:START] tool=Cc author=fangkun -->

## 为什么有这个系列

[事件系统参考](./5-events) 回答了"Pi 有哪些事件、字段是什么"；[hellopi 扩展实战](./10-hellopi-extension) 给出了一个监听全部事件的最小扩展。但入门扩展开发时，真正缺的是**每个事件在真实业务里长什么样**：

- 这个事件在生命周期的哪一步触发？前后是谁？
- 它的返回值能改变什么？不改会怎样？
- 实际工作中拿它解决什么问题？
- 怎么验证我的监听器真的生效了？

`hellopi` 扩展（基于 pi-coding-agent **0.74.2** 的事件集合）把 **29 个扩展事件**拆成 29 个独立的"事件包"：每个事件一个目录，目录名 = 事件名 = 文件名，包内有一个**可运行的 demo** 和一份 README（触发时机、字段、返回值、实用场景、测试步骤）。

本系列文章逐包讲解，每篇对应一组相关事件，全部代码来自可运行的真实 demo。

## 事件包目录结构

扩展源码位于 `pi-pkg/src/extensions/hellopi/`：

```text
hellopi/
├── index.ts                 # 入口：注册全部 29 个事件包 + 启动时打印概览
├── shared/
│   ├── log.ts               # 彩色控制台日志 + ~/.pi-hellopi 演示文件工具
│   └── state.ts             # 跨事件共享内存状态（工具计时、流式节流）
├── resources_discover/      # 每个事件包 = <事件名>/<事件名>.ts + README.md
├── session_start/
├── session_before_switch/
├── …（共 29 个包）
└── user_bash/
```

入口 `index.ts` 用一个目录（CATALOG）把事件包按业务分类组织，加载时逐个注册：

```typescript
// [AGC:START] tool=Cc author=fangkun
interface EventPackage {
  name: string;
  summary: string;
  register: (pi: ExtensionAPI) => void;
}

const CATALOG: EventCategory[] = [
  { category: "资源发现", packages: [/* resources_discover */] },
  { category: "会话事件", packages: [/* session_start … session_shutdown */] },
  { category: "Agent 事件", packages: [/* input, before_agent_start, agent_start, agent_end */] },
  // … 共 11 个分类
];

export default function (pi: ExtensionAPI) {
  printOverview();
  for (const pkg of CATALOG.flatMap((c) => c.packages)) {
    pkg.register(pi);
  }
}
// [AGC:END]
```

每个事件包导出一个 `register(pi)` 函数，内部调用 `pi.on(事件名, handler)`。这种"一个事件一个文件"的拆法让 demo 之间互不干扰，也方便对照阅读。

## 安装与启用

在 pi 的配置文件 `settings.json` 的 `extensions` 数组中加入入口路径：

```json
{
  "extensions": [
    "D:/github.io/pi-pkg/src/extensions/hellopi/index.ts"
  ]
}
```

启动 pi 后，控制台会先打印一份彩色概览，确认 29 个事件包已加载：

```text
[hellopi] === hellopi 生命周期事件扩展已加载 ===
[hellopi] 共注册 29 个事件包，演示产物目录: C:\Users\你\.pi-hellopi
[hellopi] 资源发现
[hellopi]   resources_discover - 动态挂载外部 skills/prompts/themes 目录
[hellopi] 会话事件
[hellopi]   session_start - 会话启动/加载/重载（初始化状态）
…
```

## 事件顺序全景

demo 覆盖的 29 个事件在 pi 生命周期中的位置如下（箭头表示先后，标注"可返回"的事件能改变流程）：

```text
扩展加载
 ├─ resources_discover              收集额外资源路径（可返回路径）
 └─ session_start                   会话启动（startup/new/resume/fork/reload）

 用户提交输入
 ├─ input                           最早拦截点：handled / transform / continue（可返回）
 ├─ before_agent_start              改系统提示词 / 注入消息（可返回）
 ├─ agent_start                     一次 agent 循环开始
 │   └─ 每个轮次：
 │      turn_start
 │      ├─ context                  LLM 调用前改消息：脱敏/裁剪/注入（可返回）
 │      ├─ before_provider_request  HTTP 请求发出前（可替换 payload）
 │      ├─ after_provider_response  响应头到达（状态码/限流头）
 │      ├─ message_start/update/end assistant 流式消息（end 可替换消息）
 │      ├─ tool_call                工具执行前闸门：block / 改 input（可返回）
 │      ├─ tool_execution_start/update/end   工具执行过程（只读观测）
 │      ├─ tool_result              结果入上下文前：改写 content（可返回）
 │      └─ turn_end
 ├─ agent_end                       循环结束（messages/usage 统计）

 会话操作（任意时刻）
 ├─ session_before_switch / session_before_fork    可取消
 ├─ session_before_compact → session_compact       压缩前后
 ├─ session_before_tree → session_tree             /tree 导航前后（可取消/接管摘要）
 └─ session_shutdown              退出/重载/切换时清理

 其他（任意时刻）
 ├─ model_select / thinking_level_select           模型、思考级别切换
 └─ user_bash                   用户 ! / !! 命令（可接管/远程执行）
```

记忆要点：

- **能"改变流程"的事件只有 8 个**：`resources_discover`、`input`、`before_agent_start`、`context`、`before_provider_request`、`message_end`、`tool_call`、`tool_result`、`user_bash`，以及会话类的 `session_before_switch/fork/compact/tree`。其余都是只读通知。
- **agent / turn / message / tool 是四层嵌套**：一次提交 = 一个 agent；agent 内每调一轮模型 = 一个 turn；turn 内有消息流和工具流两条并行子生命周期。

## 可观测产物：`~/.pi-hellopi/`

所有 demo 都不靠"看屏幕一闪而过"验证，而是把证据写到用户目录下的 `~/.pi-hellopi/`：

| 文件 | 写入者 | 内容 |
|------|--------|------|
| `events.log` | 全部事件 | 所有事件的流水总日志（控制台输出同步落盘） |
| `sessions.log` / `last-session.json` | session_start | 会话启动历史与最近一次快照 |
| `shutdown.log` | session_shutdown | 退出原因 |
| `forks.log` | session_before_fork | 分叉记录 |
| `compactions.log` | compact 两个事件 | 压缩前后记录 |
| `tree.log` | tree 两个事件 | /tree 导航记录 |
| `inputs.log` | input | 用户输入审计 |
| `agent-runs.log` / `agent-state.json` | agent_start/end、before_agent_start | 每次 agent 运行与 running 状态快照 |
| `turns.log` | turn_start/end | 轮次与工具失败数 |
| `messages.log` | message_* | 消息角色/长度/流式进度 |
| `tools.log` | tool_execution_* | 工具耗时、参数、流式输出 |
| `tool-calls.log` | tool_call | 拦截/修补记录 |
| `tool-results.log` | tool_result | 结果脱敏记录 |
| `context.log` | context | 每次 LLM 调用消息数/脱敏数 |
| `provider.log` / `provider-error.json` | provider 两个事件 | 请求模型、状态码、限流 |
| `model.log` / `thinking.log` | 模型事件 | 切换记录 |
| `user-bash.log` | user_bash | `!` 命令审计 |
| `last-payload.json` | before_provider_request | 完整请求体（需开关） |
| `tmp/` | 任意 demo 可用 | session_shutdown 时自动清空 |

这些工具函数都在 `shared/log.ts` 中，写自己的扩展时可以直接抄走：

```typescript
// [AGC:START] tool=Cc author=fangkun
// 控制台彩色输出 + 同步追加到 events.log；data 会被截断成摘要
export function logEvent(event: string, data: Record<string, unknown> = {}): void {
  const time = new Date().toISOString().slice(11, 23);
  // …拼接 key=value 摘要…
  console.log(`${TAG} ${CYAN}${time}${RESET} ${GREEN}${event}${RESET} ${entries}`);
  appendDemoFile("events.log", `${event} ${entries}`);
}

// 醒目的红色行为提示（拦截/改写等主动干预场景）
export function logAction(event: string, message: string): void { /* … */ }

// 哨兵文件：touch ~/.pi-hellopi/<name> 即开启对应 demo 行为
export function sentinelExists(name: string): boolean { /* … */ }
// [AGC:END]
```

跨事件的内存状态放在 `shared/state.ts`——模块级变量随扩展生命周期存在，会话切换时会重置：

```typescript
// [AGC:START] tool=Cc author=fangkun
export const toolStartTimes = new Map<string, number>();   // 工具计时：start 记 → end 算
export const streamLastLogAt = new Map<string, number>(); // 流式日志节流
export const streamLastChars = new Map<string, number>(); // 流式字符增量
export const STREAM_THROTTLE_MS = 800;

export function throttle(key: string, intervalMs = STREAM_THROTTLE_MS): boolean {
  const now = Date.now();
  const last = streamLastLogAt.get(key) ?? 0;
  if (now - last < intervalMs) return false;
  streamLastLogAt.set(key, now);
  return true;
}
// [AGC:END]
```

## 开关速查

部分 demo 的"主动干预"行为默认关闭，用哨兵文件或环境变量按需打开，避免一加载就改变正常使用：

| 开关 | 类型 | 影响事件 | 行为 |
|------|------|----------|------|
| `~/.pi-hellopi/BLOCK_SWITCH` | 哨兵文件 | session_before_switch | 存在时取消 /new、/resume |
| `~/.pi-hellopi/BLOCK_FORK` | 哨兵文件 | session_before_fork | 存在时取消 /fork |
| `~/.pi-hellopi/BLOCK_COMPACT` | 哨兵文件 | session_before_compact | 存在时取消压缩 |
| `~/.pi-hellopi/AUTO_TREE_SUMMARY` | 哨兵文件 | session_before_tree | 存在时用扩展摘要替代 LLM 摘要 |
| `HELLOPI_SIGNATURE=1` | 环境变量 | message_end | assistant 消息末尾追加签名 |
| `HELLOPI_DUMP_PAYLOAD=1` | 环境变量 | before_provider_request | 落盘完整请求 payload |

输入类快捷测试指令（无需开关，直接在 pi 里输入）：

| 输入 | 触发事件 | 效果 |
|------|----------|------|
| `/ping` | input | 扩展直接回 pong，agent 不启动、不耗 token |
| `>> 问题` | input | 输入被改写成"请用简体中文回答…" |
| 句子中含 `[hellopi-sys]` | before_agent_start | 系统提示词被追加指令，回复末尾出现 `--hellopi--` |
| `! hellopi-version` | user_bash | 扩展直接返回版本信息，不开 shell |

## 本系列文章导航

| 篇 | 文章 | 覆盖事件 |
|----|------|----------|
| 12 | [资源发现：动态挂载外部 skills](./12-hellopi-resources-discover) | resources_discover |
| 13 | [会话生命周期（上）：启动、关闭与切换分叉](./13-hellopi-session-lifecycle) | session_start、session_shutdown、session_before_switch、session_before_fork |
| 14 | [会话生命周期（下）：上下文压缩与 /tree 导航](./14-hellopi-session-compact-tree) | session_before_compact、session_compact、session_before_tree、session_tree |
| 15 | [输入拦截与 Agent 循环](./15-hellopi-input-agent) | input、before_agent_start、agent_start、agent_end |
| 16 | [轮次与消息：流式输出的观测与改写](./16-hellopi-turn-message) | turn_start/end、message_start/update/end |
| 17 | [工具执行观测：计时、流式与失败统计](./17-hellopi-tool-execution) | tool_execution_start/update/end |
| 18 | [Context 事件：发给模型前的最后一道关口](./18-hellopi-context) | context |
| 19 | [Provider 请求与响应：payload、状态码与限流](./19-hellopi-provider) | before_provider_request、after_provider_response |
| 20 | [模型与思考级别切换](./20-hellopi-model) | model_select、thinking_level_select |
| 21 | [工具拦截：危险命令闸门与结果脱敏](./21-hellopi-tool-intercept) | tool_call、tool_result |
| 22 | [用户 Bash：`!` 命令的审计与接管](./22-hellopi-user-bash) | user_bash |

## 相关文档

- [Pi Coding Agent 事件系统](./5-events) - 29+ 事件的完整字段与返回值参考
- [hellopi 扩展实战](./10-hellopi-extension) - 最小监听版扩展的实现思路
- [编写扩展](./4-writing-extensions) - 扩展工厂函数与异步初始化
- [ExtensionContext 与 API](./6-context-api) - ctx 对象与 pi 方法

<!-- [AGC:END] -->
