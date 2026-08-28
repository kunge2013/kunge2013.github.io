---
name: archive
description: 管理和查看文章归档。当用户想要查看归档、按时间浏览文章、置顶文章、或归档页面有问题时使用此技能。触发词包括：归档、文章列表、时间线、置顶文章、archive、timeline、sticky post。即使用户只是说"看看所有文章"或"把这篇文章置顶"，也应使用此技能。
---

<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

# 文章归档

本技能用于管理和查看博客的文章归档页面。归档页面按时间线展示所有文章，支持按年份分组和文章置顶功能。

## 归档页面

### 访问地址

- 中文归档：`/archives` 或 `https://<username>.github.io/<repo>/archives`
- 英文归档：`/en/archives`（如有配置）

### 页面结构

归档页面自动显示以下内容：

1. **顶部统计**：显示文章总数
   - 格式：`共 XX 篇文章`
   
2. **按年份分组**：文章按发布年份倒序排列（2026 → 2025 → ...）
   - 每年标题旁显示该年文章数
   - 如：`2026 (15)` 表示 2026 年有 15 篇文章

3. **文章列表**：每年内按日期倒序排列
   - 每条文章显示：标题、分类标签、日期
   - 鼠标悬停显示：描述和标签

4. **置顶文章**：标记为 `sticky: true` 的文章显示 📌 图标，并在同年内置顶

## 排序规则

### 默认排序

1. **置顶优先**：`sticky: true` 的文章排在最前
2. **日期倒序**：非置顶文章按 `date` 字段倒序排列（新 → 旧）
3. **年份分组**：按年份分组展示

### 排序示例

```
2026 (3)
├── 📌 置顶文章 A (2026-08-28)  ← sticky: true，排最前
├── 文章 B (2026-08-27)          ← 按日期倒序
└── 文章 C (2026-08-20)

2025 (2)
├── 文章 D (2025-12-15)
└── 文章 E (2025-06-10)
```

## 置顶文章

### 设置置顶

在文章 frontmatter 中设置 `sticky: true`：

```yaml
---
title: 重要文章
date: 2026-08-28
description: 这是一篇置顶文章
category: javascript
sticky: true  # ← 设置为 true
---
```

### 置顶效果

- 归档页面：显示 📌 图标，在同年内置顶
- 分类页面：在该分类内置顶
- 首页：在分类文章列表中置顶

### 取消置顶

将 `sticky` 改为 `false` 或删除该字段：

```yaml
sticky: false  # 或直接删除此行
```

## 归档组件

归档页面使用 `<ArchiveList />` 组件，该组件已全局注册，可直接在 markdown 中使用：

```markdown
---
title: 文章归档
layout: page
---

# 文章归档

<ArchiveList />
```

### 组件功能

- 自动从 `posts-data.json` 读取所有文章
- 按年份分组，年份内按日期倒序
- 支持置顶文章
- 响应式设计（移动端适配）
- 鼠标悬停显示文章详情

### 数据来源

`<ArchiveList />` 从 `docs/.vitepress/data/posts.ts` 导入数据：

```typescript
import { zhPosts, enPosts, categoryLabels, enCategoryLabels } from '../../data/posts'
```

## 常见问题

### 问题 1：归档页面没有文章

**原因**：没有非草稿状态的文章

**检查**：
```bash
# 查看 posts-data.json 中的文章数
npm run generate-posts
```

**解决**：确保文章的 `draft: false`

### 问题 2：文章顺序不正确

**原因**：`date` 字段格式不正确或缺失

**检查**：
```bash
# 查看文章的 date 字段
grep "date:" docs/posts/<category>/<article>.md
```

**解决**：确保 `date` 格式为 `YYYY-MM-DD`

### 问题 3：置顶文章没有显示 📌

**原因**：`sticky` 字段未设置或不是 `true`

**检查**：
```bash
# 查看文章的 sticky 字段
grep "sticky:" docs/posts/<category>/<article>.md
```

**解决**：设置 `sticky: true`

### 问题 4：年份分组不正确

**原因**：`date` 字段的年份部分错误

**检查**：
```bash
# 查看文章日期
cat docs/.vitepress/data/posts-data.json | jq '.zhPosts | to_entries[] | .value[] | {title, date}'
```

**解决**：修正文章的 `date` 字段

## 自定义归档页面

### 修改归档页面标题

编辑 `docs/archives.md`：

```markdown
---
title: 我的文章归档  # ← 修改这里
description: 所有文章的时间线
layout: page
---

# 我的文章归档  # ← 修改这里

<ArchiveList />
```

### 添加自定义内容

在 `<ArchiveList />` 前后添加内容：

```markdown
---
title: 文章归档
layout: page
---

# 文章归档

> 这里是我所有文章的归档，按时间倒序排列。

<ArchiveList />

## 说明

归档页面自动更新，新文章会自动出现在这里。
```

### 在其他页面使用归档组件

可以在任何 markdown 页面中使用 `<ArchiveList />`：

```markdown
---
title: 技术文章
layout: page
---

# 技术文章

<ArchiveList />
```

## 相关命令

```bash
npm run dev              # 本地预览归档页面
npm run generate-posts   # 重新生成数据
```

## 相关文件

| 文件 | 用途 |
|------|------|
| `docs/archives.md` | 归档页面 |
| `docs/.vitepress/theme/components/ArchiveList.vue` | 归档组件 |
| `docs/.vitepress/data/posts.ts` | 数据导出 |
| `docs/.vitepress/data/posts-data.json` | 文章数据 |