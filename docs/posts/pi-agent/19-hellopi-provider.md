---
title: hellopi 事件包 19 · Provider 请求与响应：payload、状态码与限流
description: before_provider_request 与 after_provider_response 两个事件实战——dump 完整请求体、强制模型参数、监控 429 限流与错误响应头
tags: [Pi Agent, 扩展, 事件, provider, 限流, 调试]
category: pi-agent
lang: zh
draft: false
date: 2026-08-28
---

# hellopi 事件包 19 · Provider 请求与响应：payload、状态码与限流

<!-- [AGC:START] tool=Cc author=fangkun -->

消息数组定稿后，pi 会把它序列化成具体 provider（OpenAI、Anthropic、OpenRouter 等）的请求格式，发出 HTTP 请求，再消费流式响应。这一进一出有两个观测/干预点：

```text
context（语义层消息定稿）
 ├─ before_provider_request   ← payload 构建完成、请求发出前（可整体替换 payload）
 ├─ HTTP 请求
 └─ after_provider_response   ← 响应头到达、body 流式消费前（状态码 + headers）
      └─ 流式消费 body → message_update… → message_end
```

## before_provider_request：请求上线前的最后一站

| 字段 | 类型 | 说明 |
|------|------|------|
| `event.payload` | `unknown` | 完整请求体（模型、消息、temperature、tools 等，**形状随 provider API 而异**） |

返回值：返回一个对象则**替换**本次请求的 payload；返回 `undefined`/void 使用原 payload。处理程序按扩展加载顺序链式执行，后一个看到前一个替换后的结果。

### Demo：记录模型 + 按需 dump 完整 payload

```typescript
// [AGC:START] tool=Cc author=fangkun
import { writeFileSync } from "node:fs";

export default function register(pi: ExtensionAPI): void {
  pi.on("before_provider_request", async (event) => {
    const payload = event.payload as { model?: string; messages?: unknown[] } | null;
    logEvent("before_provider_request", { model: payload?.model, messageCount: payload?.messages?.length });
    appendDemoFile("provider.log", `request model=${payload?.model ?? "?"} messages=${payload?.messages?.length ?? 0}`);

    if (process.env.HELLOPI_DUMP_PAYLOAD === "1") {
      try {
        ensureDemoDir();
        writeFileSync(demoPath("last-payload.json"), JSON.stringify(event.payload, null, 2), "utf8");
        logAction("before_provider_request", "payload 已写入 last-payload.json");
      } catch (err) {
        logAction("before_provider_request", `写 payload 失败: ${(err as Error).message}`);
      }
    }
    // 返回 undefined → 使用原 payload；也可返回替换后的 payload
  });
}
// [AGC:END]
```

dump payload 是扩展开发中排错频率最高的手段：pi 实际发给模型的 JSON 里系统提示词有多长、tools 怎么序列化、消息角色如何映射，看 `last-payload.json` 一目了然。所以 demo 用环境变量 `HELLOPI_DUMP_PAYLOAD=1` 控制——平时关闭避免每个请求都写文件，需要时打开。

### 业务场景

1. **请求调试**：对照 provider 官方文档排查序列化问题、缓存命中问题；
2. **参数强制**：统一覆盖 `temperature`、`max_tokens`，或注入 `cache_control` 字段降低成本；
3. **流量代理/Mock**：把请求改指向本地代理或 Mock 服务器（测试扩展行为时不烧 token）；
4. **模型路由**：按任务复杂度在 payload 层切换模型 ID。

```typescript
// [AGC:START] tool=Cc author=fangkun
// 示例：强制低温（payload 形状因 provider 而异，需按实际 provider 调整）
pi.on("before_provider_request", async (event) => {
  const payload = event.payload as Record<string, unknown>;
  return { ...payload, temperature: 0 };
});
// [AGC:END]
```

> 注意：payload 级别的系统指令改写**不会**反映在 `ctx.getSystemPrompt()` 中——后者报告的是 pi 语义层的系统提示词，不是最终序列化结果。

## after_provider_response：响应头先到，body 还没读

HTTP 响应头到达之后、流式 body 被消费之前触发。此时看不到模型生成的内容，但能拿到状态码和响应头——这是监控限流和服务可用性的位置。

| 字段 | 类型 | 说明 |
|------|------|------|
| `event.status` | `number` | HTTP 状态码（200/401/429/500…） |
| `event.headers` | `Record<string, string>` | 规范化的响应头（含 `x-ratelimit-*`、`retry-after` 等） |

只读通知，无返回值。header 的可用性取决于 provider 和传输方式（抽象 HTTP 响应的 provider 可能不暴露 headers）。

### Demo：限流头提取 + 错误响应落盘

```typescript
// [AGC:START] tool=Cc author=fangkun
export default function register(pi: ExtensionAPI): void {
  pi.on("after_provider_response", async (event) => {
    const rateLimitHeaders = Object.fromEntries(
      Object.entries(event.headers ?? {}).filter(([k]) => k.toLowerCase().startsWith("x-ratelimit")),
    );

    logEvent("after_provider_response", {
      status: event.status,
      rateLimit: Object.keys(rateLimitHeaders).length,
    });
    appendDemoFile(
      "provider.log",
      `response status=${event.status} ratelimit=${JSON.stringify(rateLimitHeaders)}`,
    );

    if (event.status >= 400) {
      logAction("after_provider_response", `响应异常 status=${event.status}，已写入 provider-error.json`);
      writeDemoJson("provider-error.json", {
        status: event.status,
        at: new Date().toISOString(),
        headers: event.headers,
      });
    }
  });
}
// [AGC:END]
```

要点：

- **限流头统一过滤**：不同 provider 的限流头都以 `x-ratelimit` 开头（剩余额度、重置时间等），用 `toLowerCase().startsWith` 一次性提取；
- **`status >= 400` 落盘完整 headers**：401（认证）、429（限流）、5xx（服务端故障）的排查依据不同，把响应头保存到 `provider-error.json` 比事后复现靠谱；
- **与请求日志配对**：`provider.log` 里 request/response 行相邻，配合时间戳可以粗算响应延迟。

### 业务场景

1. **限流处理**：捕获 429 与 `retry-after`，提示用户或通知扩展自动降级到备用模型；
2. **可用性监控**：5xx 率统计、与 before 事件配对做响应时间打点；
3. **额度看板**：解析 `x-ratelimit-*` 剩余额度，实时展示"还剩多少 token"；
4. **故障排查**：错误响应头落盘，快速区分认证问题、限流还是服务端故障。

## 动手测试

```bash
# 1. 正常请求
pi> 你好
cat ~/.pi-hellopi/provider.log
# request model=<provider/model> messages=N
# response status=200 ratelimit={...}

# 2. dump 完整 payload
export HELLOPI_DUMP_PAYLOAD=1
# 重启 pi 后随便说一句
pi> 你好
python -m json.tool ~/.pi-hellopi/last-payload.json | head -30
# 可以看到完整 messages、system、tools 等字段

# 3. 模拟错误：临时把 provider API key 改错后启动，发任意消息
# 预期：status=401，控制台红色提示，~/.pi-hellopi/provider-error.json 生成
cat ~/.pi-hellopi/provider-error.json
```

## 本类事件小结

| 事件 | 时机 | 能否改变流程 | 核心用途 |
|------|------|--------------|----------|
| `before_provider_request` | payload 构建后、发请求前 | **可替换整个 payload** | 调试序列化、强制参数、流量代理、模型路由 |
| `after_provider_response` | 响应头到达、body 消费前 | 否（只读） | 429 限流处理、额度看板、错误落盘、可用性监控 |

记忆法：**before 管"发出去的包裹"，after 管"回执上的状态码"**；想改消息语义用 `context`，想改 HTTP 实物用这两个事件。

## 相关文档

- [Context 事件：发给模型前的最后一道关口](./18-hellopi-context)
- [模型与思考级别切换](./20-hellopi-model)
- [hellopi 事件包总览](./11-hellopi-events-overview)

<!-- [AGC:END] -->
