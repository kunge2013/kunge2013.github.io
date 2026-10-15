# 博客阅读量统计 - Cloudflare Workers

## 功能

- ✅ 每篇文章显示 PV（总访问）和 UV（独立访客）
- ✅ 支持列表页批量查询多篇文章阅读量
- ✅ 免费额度充足：10万次请求/天，1GB 存储
- ✅ 数据存储在 Cloudflare KV，访问速度快

## 部署步骤

### 1. 注册 Cloudflare 账号

访问 https://dash.cloudflare.com/sign-up 注册免费账号

### 2. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 3. 登录 Cloudflare

```bash
wrangler login
```

浏览器会打开授权页面，点击授权即可。

### 4. 创建 KV Namespace

```bash
cd workers/blog-stats
wrangler kv:namespace create STATS_KV
```

会输出类似：

```
{ binding = "STATS_KV", id = "abc123def456..." }
```

### 5. 更新 wrangler.toml

将上一步得到的 `id` 填入 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "STATS_KV"
id = "abc123def456..."  # 替换为实际的 ID
```

### 6. 部署 Worker

```bash
wrangler deploy
```

部署成功后会得到一个 URL，类似：

```
https://blog-stats.fangkun.workers.dev
```

### 7. 配置博客

修改 `docs/.vitepress/theme/components/ViewCounter.vue` 中的 `workerUrl`：

```javascript
workerUrl: {
  type: String,
  default: 'https://blog-stats.fangkun.workers.dev', // 替换为你的 Worker URL
},
```

## API 接口

### 记录单篇文章访问

```javascript
POST /api/views
Body: { "page": "/posts/javascript/async-await" }
Response: { "success": true, "data": { "pv": 123, "uv": 45 } }
```

### 批量查询多篇文章

```javascript
POST /api/views/batch
Body: { "pages": ["/posts/1", "/posts/2"] }
Response: { 
  "success": true, 
  "data": {
    "/posts/1": { "pv": 100, "uv": 50 },
    "/posts/2": { "pv": 200, "uv": 80 }
  }
}
```

### 获取站点总访问

```javascript
GET /api/summary
Response: { "success": true, "data": { "totalPV": 10000, "totalUV": 5000, "pages": 50 } }
```

## 数据说明

- **PV**：总访问量，每次访问 +1
- **UV**：独立访客数，同一 IP 24小时内只算 1 次
- **访客记录**：每篇文章保留最近 1000 个访客记录，用于 UV 计算
- **站点总统计**：自动增量更新，每天校准一次

## 费用

Cloudflare Workers 免费额度：

- 请求数：10 万次/天
- KV 读取：10 万次/天
- KV 写入：1000 次/天
- KV 存储：1 GB

个人博客完全够用，超过免费额度才会收费（$0.30/百万次请求）。

## 自定义域名（可选）

如果想用自定义域名（如 `stats.yourdomain.com`）：

1. 在 Cloudflare Dashboard → Workers → blog-stats → Triggers
2. 添加 Route 或 Custom Domain
3. 配置 DNS 记录

## 常见问题

### Q: 为什么 UV 不准确？
A: UV 基于 IP 判断，同一 WiFi 下的多人访问只算 1 次 UV。如果需要更精确，可以改用浏览器指纹（但涉及隐私）。

### Q: 数据会丢失吗？
A: KV 存储是持久化的，数据不会丢失。但建议定期导出备份。

### Q: 可以迁移数据吗？
A: 可以。使用 `wrangler kv:key list` 导出，`wrangler kv:key put` 导入。

## 下一步

- [ ] 在列表页显示每篇文章阅读量
- [ ] 添加图表展示访问趋势
- [ ] 导出统计数据为 JSON/CSV
