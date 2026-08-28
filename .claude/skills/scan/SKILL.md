---
name: scan
description: 手动触发文章扫描、重新生成数据、调试扫描问题。当用户想要更新文章数据、刷新缓存、重新扫描、或扫描结果不正确时使用此技能。触发词包括：扫描、刷新数据、更新数据、重新生成、scan、regenerate、refresh data。即使用户只是说"数据没更新"或"重新扫描一下"，也应使用此技能。
---

<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

# 文章扫描

本技能用于手动触发文章扫描、重新生成数据、调试扫描问题。

## 扫描系统概览

博客使用自动扫描系统，将 Markdown 文件转换为 JSON 数据供组件使用：

```
Markdown 文件 → 扫描脚本 → JSON 数据 → Vue 组件
```

### 关键文件

| 文件 | 作用 |
|------|------|
| `scripts/generate-posts-data.mjs` | 扫描脚本 |
| `docs/.vitepress/data/posts-data.json` | 生成的数据文件 |
| `docs/.vitepress/data/posts.ts` | TypeScript 导出 |

## 何时需要手动扫描

### 自动触发场景

以下命令会自动运行扫描（通过 `predev` 和 `prebuild` hooks）：

```bash
npm run dev      # 启动开发服务器前自动扫描
npm run build    # 生产构建前自动扫描
```

### 需要手动扫描的场景

1. **修改了文章 frontmatter**，想立即看到效果
2. **添加/删除了文章**，但开发服务器未自动更新
3. **修改了分类的 `index.md`**（如更改 title）
4. **调试扫描问题**，需要查看扫描输出
5. **CI/CD 流程**中需要显式生成数据

## 手动扫描命令

### 基本用法

```bash
npm run generate-posts
```

### 预期输出

```bash
Generated posts-data.json:
  ZH categories: javascript, system-design, react
  EN categories: javascript
  ZH posts: 15
  EN posts: 3
  Category labels: javascript, system-design, react
```

### 输出解读

| 字段 | 说明 |
|------|------|
| `ZH categories` | 中文分类列表 |
| `EN categories` | 英文分类列表 |
| `ZH posts` | 中文文章总数 |
| `EN posts` | 英文文章总数 |
| `Category labels` | 所有分类的显示名 |

## 扫描后验证

### 步骤 1：检查 JSON 文件

```bash
# 查看生成的 JSON
cat docs/.vitepress/data/posts-data.json

# 格式化输出（需要 jq）
cat docs/.vitepress/data/posts-data.json | jq

# 查看特定分类的文章
cat docs/.vitepress/data/posts-data.json | jq '.zhPosts.javascript'

# 查看分类标签
cat docs/.vitepress/data/posts-data.json | jq '.categoryLabels'
```

### 步骤 2：验证新文章

如果刚添加了新文章，确认它出现在 JSON 中：

```bash
# 搜索文章标题
cat docs/.vitepress/data/posts-data.json | jq '.zhPosts | to_entries[] | .value[] | select(.title == "你的文章标题")'
```

### 步骤 3：本地预览

```bash
npm run dev
```

访问网站，确认文章/分类正确显示。

## 扫描规则详解

### 扫描范围

- **中文文章**：`docs/posts/<category>/<article>.md`
- **英文文章**：`docs/en/posts/<category>/<article>.md`

### 过滤规则

1. **跳过 `index.md`**：分类首页不作为文章
2. **跳过 `draft: true`**：草稿文章不扫描
3. **只扫描 `.md` 文件**：其他文件忽略

### 数据提取

从 frontmatter 提取以下字段：

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | ✅ | 文章标题 |
| `date` | ✅ | 发布日期 |
| `description` | ✅ | 一句话摘要 |
| `category` | ✅ | 分类 ID（必须与目录名一致） |
| `tags` | ❌ | 标签数组 |
| `sticky` | ❌ | 是否置顶 |
| `i18n-link` | ❌ | 另一语言版本路径 |

### 分类标签提取

从分类目录下的 `index.md` 的 `title` 字段提取：

```markdown
---
title: 系统设计  ← 这个作为分类显示名
---
```

## 常见扫描问题

### 问题 1：扫描后分类不出现

**原因**：分类目录下没有非 draft 的文章

**检查**：
```bash
# 查看分类目录
ls docs/posts/<category>/

# 检查是否有非草稿文章
grep -r "draft: false" docs/posts/<category>/
```

**解决**：添加至少一篇 `draft: false` 的文章

### 问题 2：文章不在扫描结果中

**可能原因**：
1. `draft: true`（草稿）
2. `category` 字段与目录名不一致
3. 文件编码不是 UTF-8
4. frontmatter 格式错误

**检查步骤**：
```bash
# 1. 运行校验
npm run validate

# 2. 查看扫描输出，确认分类和文章数

# 3. 直接搜索 JSON
cat docs/.vitepress/data/posts-data.json | grep "文章标题"
```

**解决**：
- 将 `draft: true` 改为 `false`
- 确保 `category` 与目录名一致
- 检查文件编码（UTF-8 无 BOM）
- 修正 frontmatter 格式

### 问题 3：分类显示名错误

**原因**：`index.md` 缺少 `title` 字段

**检查**：
```bash
cat docs/posts/<category>/index.md | head -5
```

**解决**：在 `index.md` 的 frontmatter 中添加 `title`

### 问题 4：扫描脚本报错

**常见错误**：
- `Error: ENOENT: no such file or directory`：目录不存在
- `SyntaxError: Unexpected token`：JSON 格式错误

**解决**：
1. 确认 `docs/posts/` 和 `docs/en/posts/` 目录存在
2. 删除 `posts-data.json` 重新生成
3. 检查 Markdown 文件的 frontmatter 格式

## 扫描调试技巧

### 查看扫描脚本详细输出

```bash
# 使用 Node.js 直接运行，查看详细信息
node scripts/generate-posts-data.mjs
```

### 测试单篇文章的 frontmatter 解析

```bash
# 提取 frontmatter
sed -n '/^---$/,/^---$/p' docs/posts/javascript/my-post.md
```

### 监听文件变化自动扫描

```bash
# 开发模式下，修改文件会自动重新扫描
npm run dev

# 或使用 nodemon 监听
npx nodemon --watch docs/posts --ext md --exec "npm run generate-posts"
```

### 对比扫描前后

```bash
# 备份当前 JSON
cp docs/.vitepress/data/posts-data.json /tmp/posts-data-backup.json

# 重新扫描
npm run generate-posts

# 对比差异
diff /tmp/posts-data-backup.json docs/.vitepress/data/posts-data.json
```

## 相关命令

```bash
npm run generate-posts   # 手动重新生成数据
npm run validate         # 校验 frontmatter 格式
npm run dev              # 启动开发服务器（自动扫描）
npm run build            # 生产构建（自动扫描）
```

## 扫描数据用途

生成的 `posts-data.json` 被以下组件消费：

| 组件 | 用途 |
|------|------|
| `<ArchiveList />` | 归档列表（按年份分组） |
| `<TagCloud />` | 标签云 + 过滤 |
| `<PostList />` | 分类首页文章列表 |
| `<CategoryGrid />` | 首页分类卡片 |
| `<CategoryPage />` | 分类列表页 |
| `<SearchModal />` | 全文搜索 |
| `config.ts` | 导航菜单 |