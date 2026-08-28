---
name: createPost
description: 为博客创建新文章。当用户想要写新文章、发布文章、添加文章、新建博文时使用此技能。触发词包括：写文章、新建文章、发布文章、添加文章、create post、new post、write article。即使用户只是说"我想写一篇关于 xxx 的文章"或"帮我创建个文章"，也应使用此技能。
---

<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

# 创建博客文章

本技能用于在指定分类下创建新文章。文章默认以草稿（`draft: true`）状态创建，需要手动改为 `false` 才会发布。

## 信息收集

创建文章需要以下信息，通过对话逐步确认：

| 信息 | 必填 | 说明 | 示例 |
|------|------|------|------|
| 文章标题（title） | ✅ | 文章的完整标题 | `JavaScript 异步编程详解` |
| 文章描述（description） | ✅ | 一句话摘要，显示在搜索结果和列表中 | `深入理解 Promise、async/await 的工作原理` |
| 所属分类（category） | ✅ | 分类目录名（slug），必须是已存在的分类 | `javascript` |
| 草稿状态（draft） | ✅ | `true`（草稿不发布）或 `false`（直接发布） | `true` |
| 文章 slug | ❌ | 文件名，从标题自动生成 kebab-case，可自定义 | `javascript-async-await` |
| 语言 | ❌ | 默认中文；可选英文（创建到 `docs/en/posts/`） | `zh` / `en` |
| 标签（tags） | ❌ | 标签数组 | `[JavaScript, 异步]` |

### Slug 生成规则

- 从标题转换为 kebab-case（小写字母、数字、连字符）
- 去除中文字符，保留英文和数字
- 示例：`JavaScript 异步编程详解` → `javascript-yi-cheng-bian-cheng-xiang-jie`
- 如果标题是中文，可以让用户直接提供英文 slug

## 执行步骤

### 步骤 1：检查分类是否存在

```bash
# 检查分类目录是否存在
ls docs/posts/<category>/
# 或英文分类
ls docs/en/posts/<category>/
```

如果分类不存在，提示用户：
- 该分类不存在，是否要先创建分类？
- 建议使用 `createCategory` 技能先创建分类

### 步骤 2：检查文章是否已存在

```bash
# 检查文件是否已存在
ls docs/posts/<category>/<slug>.md
```

如果已存在，提示用户文件名冲突，建议换一个 slug。

### 步骤 3：生成文章文件

复制本 skill 自带的模板文件到目标目录：

```bash
# 模板位于 .claude/skills/createPost/assets/new-post.md
cp .claude/skills/createPost/assets/new-post.md docs/posts/<category>/<slug>.md
```

然后编辑文件，将模板中的占位符替换为用户提供的信息：

- `文章标题` → 用户提供的 title
- `YYYY-MM-DD` → 今天的日期（使用 `date +%Y-%m-%d` 获取）
- `一句话摘要` → 用户提供的 description
- `category-slug` → 用户提供的 category
- `tags: []` → 用户提供的 tags（如果有）
- `lang: zh` → 如果是英文文章改为 `lang: en`
- `draft: true` → 用户提供的 draft 值

**替换后的文件内容示例**：

```markdown
---
title: JavaScript 异步编程详解
date: 2026-08-28
description: 深入理解 Promise、async/await 的工作原理
category: javascript
tags: [JavaScript, 异步, Promise]
lang: zh
draft: true
---

# JavaScript 异步编程详解

<!-- [AGC:START] tool=Cc author=fangkun -->

> 在这里开始写你的文章...

<!-- [AGC:END] -->
```

文件编码使用 UTF-8（无 BOM）。

### 步骤 4：验证

运行以下命令验证文章创建成功：

```bash
npm run generate-posts
```

检查 `posts-data.json` 中是否出现了新文章（如果 `draft: false`）。如果有报错，帮助用户排查。

### 步骤 5：提示后续操作

告诉用户：
- 文章已创建成功
- 如果 `draft: true`，需要编辑文件将 `draft: true` 改为 `draft: false` 才会发布
- 可以用 `npm run dev` 本地预览
- 提交部署：`git add . && git commit -m 'feat: add <slug>' && git push`

## 快捷方式

如果用户提供了完整信息，可以直接使用脚手架脚本：

```bash
# 中文文章
npm run new-post -- <category> <slug>

# 英文文章
npm run new-post -- <category> <slug> --en
```

**注意**：脚手架脚本默认 `draft: true`，且 title/description 使用占位符，需要用户后续手动编辑。如果用户要求直接填写完整的 title 和 description，则应该手动创建文件（步骤 3）。

## 注意事项

- `category` 必须是已存在的分类目录名，否则文章不会被扫描
- 文件名使用 kebab-case，不要用空格或中文
- `draft: true` 的文章不会出现在任何页面
- 如果分类不存在，脚手架脚本会自动创建，但建议先用 `createCategory` 技能创建分类以便填写完整的分类信息