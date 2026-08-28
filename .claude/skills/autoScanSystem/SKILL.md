---
name: autoScanSystem
description: 理解和调试博客的自动扫描系统。当用户询问文章不显示、分类不出现、数据未更新、导航菜单错误、或需要修改扫描逻辑时使用此技能。触发词包括：文章不显示、分类找不到、数据没更新、扫描问题、posts-data.json、自动扫描、auto scan、debug scanning。即使用户只是说"我的文章为什么看不到"或"分类没出现在导航里"，也应使用此技能。
---

<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

# 自动扫描系统

本技能用于理解和调试博客的自动扫描数据管道。系统采用零配置设计：Markdown 文件 → JSON 数据 → Vue 组件，全程自动化。

## 核心架构

### 数据流向

```
Markdown 文件                    扫描脚本                      JSON 数据                      Vue 组件
docs/posts/**/*.md  ──┐
                      ├──→  scripts/generate-posts-data.mjs  ──→  docs/.vitepress/data/posts-data.json
docs/en/posts/**/*.md ──┘                                                    │
                                                                              ├─→ posts.ts (导出)
                                                                              │
                                                                              ├─→ config.ts (导航菜单)
                                                                              │
                                                                              └─→ Vue 组件 (渲染)
```

### 关键文件

| 文件 | 作用 | 说明 |
|------|------|------|
| `scripts/generate-posts-data.mjs` | 扫描脚本 | 读取所有 Markdown，解析 frontmatter，生成 JSON |
| `docs/.vitepress/data/posts-data.json` | 数据产物 | 已加入 `.gitignore`，每次 dev/build 自动重新生成 |
| `docs/.vitepress/data/posts.ts` | TypeScript 导出 | 从 JSON 导入并导出类型化的数据 |
| `docs/.vitepress/config.ts` | VitePress 配置 | 读取 JSON 构建导航菜单 |

### 数据结构

```typescript
interface Post {
  title: string          // 文章标题
  date: string           // 发布日期 (YYYY-MM-DD)
  description: string    // 一句话摘要
  url: string            // 文章路径
  tags: string[]         // 标签数组
  sticky?: boolean       // 是否置顶
  category?: string      // 分类 ID
  i18nLink?: string      // 另一语言版本路径
}

interface PostsData {
  zhPosts: Record<string, Post[]>           // 中文文章，按分类分组
  enPosts: Record<string, Post[]>           // 英文文章，按分类分组
  categoryLabels: Record<string, string>    // 分类显示名（中文）
  enCategoryLabels: Record<string, string>  // 分类显示名（英文）
}
```

## 扫描规则

### 扫描范围

- **中文文章**：`docs/posts/<category>/<article>.md`
- **英文文章**：`docs/en/posts/<category>/<article>.md`

### 过滤规则

1. **跳过 `index.md`**：分类目录下的 `index.md` 是分类首页，不作为文章扫描
2. **跳过草稿**：`draft: true` 的文章不会出现在数据中
3. **跳过非 Markdown**：只扫描 `.md` 文件

### 分类标签提取

从分类目录下的 `index.md` 的 frontmatter `title` 字段提取：

```markdown
---
title: 系统设计    ← 这个 title 会作为分类显示名
description: ...
---
```

如果不写 `title`，回退使用目录名（如 `system-design`）。

### 数据合并优先级

分类标签（`categoryLabels` / `enCategoryLabels`）的合并顺序：

```javascript
// 中文标签：优先中文 index.md，回退到英文 index.md，再回退到硬编码
categoryLabels = buildCategoryLabels({ ...enLabels, ...zhLabels }, false)

// 英文标签：优先英文 index.md，回退到中文 index.md，再回退到硬编码
enCategoryLabels = buildCategoryLabels({ ...zhLabels, ...enLabels }, true)
```

## 触发时机

### 自动触发

通过 `package.json` 的 hooks 自动运行：

```json
{
  "scripts": {
    "predev": "npm run generate-posts",
    "prebuild": "npm run generate-posts"
  }
}
```

- `npm run dev`：开发服务器启动前自动扫描
- `npm run build`：生产构建前自动扫描

### 手动触发

```bash
npm run generate-posts
```

适用场景：
- 添加/修改文章后，想立即看到效果
- 调试扫描问题
- CI/CD 流程中显式调用

## 消费方

### 导航菜单（config.ts）

```typescript
function buildCategoryNav(prefix: string, labelsKey: 'categoryLabels' | 'enCategoryLabels') {
  const data = JSON.parse(readFileSync(postsDataPath, 'utf-8'))
  const labels = data[labelsKey]
  return Object.entries(labels).map(([id, label]) => ({
    text: label,
    link: `${prefix}/posts/${id}/`
  }))
}
```

**关键点**：
- 从 `posts-data.json` 读取分类标签
- 动态构建"分类"下拉菜单
- 新分类自动出现在导航中

### Vue 组件

所有列表组件从 `posts.ts` 导入数据：

```typescript
import { zhPosts, enPosts, categoryLabels } from '../data/posts'
```

| 组件 | 数据源 | 用途 |
|------|--------|------|
| `<ArchiveList />` | 所有文章 | 归档页（按年份分组） |
| `<TagCloud />` | 所有文章的 tags | 标签云 + 过滤 |
| `<PostList />` | 当前分类的文章 | 分类首页文章列表 |
| `<CategoryGrid />` | categoryLabels | 首页分类卡片 |
| `<CategoryPage />` | categoryLabels + 文章数 | 分类列表页 |
| `<SearchModal />` | 所有文章 | 全文搜索 |

## 常见问题排查

### 问题：新分类不出现在导航

**原因**：分类目录下没有非 draft 的文章

**检查步骤**：
1. 确认 `docs/posts/<category>/` 目录存在
2. 确认目录下至少有一个 `.md` 文件且 `draft: false`
3. 运行 `npm run generate-posts`，查看输出是否包含该分类
4. 检查 `posts-data.json` 是否包含该分类

**解决**：添加至少一篇非草稿文章，分类才会出现在导航中。

### 问题：文章不显示在列表

**可能原因**：
1. `draft: true`：草稿不会显示
2. `category` 字段与目录名不一致
3. 文件编码不是 UTF-8
4. frontmatter 格式错误

**检查步骤**：
```bash
# 运行校验脚本
npm run validate

# 手动检查 posts-data.json
cat docs/.vitepress/data/posts-data.json | grep "你的文章标题"
```

**解决**：
- 将 `draft: true` 改为 `draft: false`
- 确保 `category` 字段与所在目录名完全一致
- 用 VS Code 检查文件编码（右下角显示 UTF-8）

### 问题：分类显示名不正确

**原因**：`index.md` 缺少 `title` 字段

**检查**：
```bash
cat docs/posts/<category>/index.md | head -5
```

**解决**：在 `index.md` 的 frontmatter 中添加 `title` 字段：
```yaml
---
title: 正确的分类名称
---
```

### 问题：标签不显示

**原因**：文章的 `tags` 字段为空或格式错误

**正确格式**：
```yaml
tags: [JavaScript, 异步, Promise]
# 或
tags:
  - JavaScript
  - 异步
  - Promise
```

**检查**：
```bash
grep "tags:" docs/posts/<category>/<article>.md
```

## 扩展扫描系统

### 添加新的 frontmatter 字段

1. **修改扫描脚本**（`scripts/generate-posts-data.mjs`）：

```javascript
// 在 categoryPosts.push({...}) 中添加新字段
categoryPosts.push({
  title: fm.title || slug,
  // ... 其他字段
  customField: fm['custom-field'] || '',  // 新增
})
```

2. **更新 TypeScript 类型**（`docs/.vitepress/data/posts.ts`）：

```typescript
export interface Post {
  // ... 其他字段
  customField?: string  // 新增
}
```

3. **在组件中使用**：

```vue
<template>
  <div>{{ post.customField }}</div>
</template>
```

### 修改排序逻辑

当前按 `date` 字段排序。如需自定义：

```javascript
// 在 generate-posts-data.mjs 的 scanDir 函数中
categoryPosts.sort((a, b) => {
  // 自定义排序逻辑
  return new Date(b.date) - new Date(a.date)
})
```

### 添加过滤规则

例如，只扫描特定标签的文章：

```javascript
// 在扫描循环中添加
if (fm.tags && !fm.tags.includes('featured')) continue
```

## 调试技巧

### 查看生成的 JSON

```bash
# 格式化输出
cat docs/.vitepress/data/posts-data.json | jq

# 只查看某个分类
cat docs/.vitepress/data/posts-data.json | jq '.zhPosts.javascript'

# 查看分类标签
cat docs/.vitepress/data/posts-data.json | jq '.categoryLabels'
```

### 测试单篇文章的 frontmatter

```bash
# 提取并解析 frontmatter
head -20 docs/posts/javascript/my-post.md | sed -n '/^---$/,/^---$/p'
```

### 重新生成并监听变化

```bash
# 开发模式下，修改文章会自动重新扫描
npm run dev

# 手动重新生成
npm run generate-posts
```

## 相关命令

```bash
npm run dev              # 启动开发服务器（自动扫描）
npm run build            # 生产构建（自动扫描）
npm run generate-posts   # 手动重新生成数据
npm run validate         # 校验所有文章的 frontmatter
```