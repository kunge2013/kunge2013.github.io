<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

# 常见问题排查指南

## 快速诊断流程

```
文章/分类不显示？
    ↓
1. 运行 npm run generate-posts
    ↓
2. 检查 posts-data.json 是否包含该文章/分类
    ↓
3. 运行 npm run validate
    ↓
4. 根据错误信息定位问题
```

## 问题 1：新分类不出现在导航菜单

### 症状
- 创建了分类目录和文章
- 但顶部导航"分类"下拉菜单中看不到

### 根本原因
**分类目录下没有非 draft 的文章**

扫描脚本的逻辑：
```javascript
// 只有 categoryPosts.length > 0 时才添加到结果中
if (categoryPosts.length > 0) {
  posts[category] = categoryPosts
}
```

### 检查步骤

```bash
# 1. 确认目录存在
ls docs/posts/<category>/

# 2. 检查是否有非草稿文章
grep -r "draft: false" docs/posts/<category>/

# 3. 运行扫描并查看输出
npm run generate-posts

# 4. 检查 JSON 是否包含该分类
cat docs/.vitepress/data/posts-data.json | grep "<category>"
```

### 解决方案

添加至少一篇 `draft: false` 的文章：

```markdown
---
title: 测试文章
date: 2026-08-28
description: 测试
category: <category>
draft: false
---
```

## 问题 2：文章不显示在列表中

### 可能的原因

#### 原因 1：draft: true

草稿状态的文章会被跳过：

```javascript
// generate-posts-data.mjs
if (fm.draft === true) continue
```

**解决**：将 `draft: true` 改为 `draft: false`

#### 原因 2：category 字段与目录名不一致

```yaml
# 错误示例
# 目录：docs/posts/javascript/
# 文件：my-post.md
---
category: js  # ❌ 应该是 javascript
---

# 正确示例
---
category: javascript  # ✅ 与目录名完全一致
---
```

**解决**：确保 `category` 字段与所在目录名完全一致

#### 原因 3：文件编码不是 UTF-8

扫描脚本使用 `utf-8` 读取文件：

```javascript
const content = readFileSync(filePath, 'utf-8')
```

如果文件是 UTF-8 with BOM 或其他编码，可能导致 frontmatter 解析失败。

**解决**：
- VS Code：右下角点击编码，选择"通过编码保存" → "UTF-8"
- 或使用命令转换：`iconv -f GBK -t UTF-8 file.md > file-utf8.md`

#### 原因 4：frontmatter 格式错误

正确的 frontmatter 格式：

```yaml
---
title: 文章标题
date: 2026-08-28
description: 摘要
category: javascript
---
```

常见错误：
- 缺少 `---` 分隔符
- YAML 语法错误（如缺少冒号、缩进错误）
- 在 frontmatter 外部有内容

**解决**：运行 `npm run validate` 检查格式

## 问题 3：分类显示名不正确

### 症状
- 导航菜单显示的是目录名（如 `system-design`）而不是中文名称（如"系统设计"）

### 原因
分类目录下的 `index.md` 缺少 `title` 字段

### 检查

```bash
cat docs/posts/<category>/index.md | head -10
```

应该看到：

```yaml
---
title: 系统设计  # ← 这个字段
description: ...
---
```

### 解决

在 `index.md` 的 frontmatter 中添加 `title`：

```yaml
---
title: 系统设计
description: 分布式系统、高可用架构等设计话题
---
```

## 问题 4：标签不显示

### 可能的原因

#### 原因 1：tags 字段为空

```yaml
# 错误
tags: []

# 正确
tags: [JavaScript, 异步]
```

#### 原因 2：tags 格式错误

```yaml
# 错误格式
tags: JavaScript, 异步  # ❌ 缺少方括号

# 正确格式 1（单行）
tags: [JavaScript, 异步]

# 正确格式 2（多行）
tags:
  - JavaScript
  - 异步
```

#### 原因 3：标签云组件未读取到数据

检查 `TagCloud.vue` 是否正确导入数据：

```typescript
import { zhPosts, enPosts } from '../data/posts'
```

## 问题 5：文章排序不正确

### 当前排序逻辑

扫描脚本**不进行排序**，文章顺序取决于文件系统的读取顺序。

### 解决方案

如果需要按日期排序，修改扫描脚本：

```javascript
// 在 scanDir 函数中，返回前排序
categoryPosts.sort((a, b) => {
  return new Date(b.date).getTime() - new Date(a.date).getTime()
})
```

## 问题 6：i18n-link 不工作

### 症状
- 中英文切换按钮不显示或链接错误

### 检查步骤

1. 确认两个版本的文章都存在
2. 确认 `i18n-link` 字段指向正确的路径

```yaml
# 中文文章
---
i18n-link: /en/posts/javascript/my-post
---

# 英文文章
---
i18n-link: /posts/javascript/my-post
---
```

3. 确认路径格式正确（以 `/` 开头，不含域名）

## 调试命令

### 查看生成的 JSON

```bash
# 格式化输出整个 JSON
cat docs/.vitepress/data/posts-data.json | jq

# 查看某个分类的文章
cat docs/.vitepress/data/posts-data.json | jq '.zhPosts.javascript'

# 查看分类标签
cat docs/.vitepress/data/posts-data.json | jq '.categoryLabels'

# 统计文章数量
cat docs/.vitepress/data/posts-data.json | jq '.zhPosts | to_entries[] | {category: .key, count: (.value | length)}'
```

### 测试 frontmatter 解析

```bash
# 提取文章的 frontmatter
sed -n '/^---$/,/^---$/p' docs/posts/javascript/my-post.md
```

### 监听文件变化并重新生成

```bash
# 使用 nodemon 监听变化
nodemon --watch docs/posts --exec "npm run generate-posts"
```

## 验证检查清单

创建新文章或分类后，按此清单验证：

- [ ] 文件编码是 UTF-8（无 BOM）
- [ ] frontmatter 格式正确（以 `---` 开始和结束）
- [ ] `title` 字段已填写
- [ ] `date` 格式为 `YYYY-MM-DD`
- [ ] `description` 字段已填写
- [ ] `category` 与目录名完全一致
- [ ] `draft: false`（如果要发布）
- [ ] 运行 `npm run validate` 无错误
- [ ] 运行 `npm run generate-posts` 后，`posts-data.json` 包含该文章
- [ ] 运行 `npm run dev`，文章在页面上显示