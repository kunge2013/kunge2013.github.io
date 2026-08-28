---
name: createCategory
description: 为博客创建新的文章分类目录。当用户想要新增分类、创建分类目录、添加新的文章类别时使用此技能。触发词包括：新增分类、创建分类、添加分类、新建分类、create category、new category。即使用户只是说"我想加一个 xxx 分类"或"开个新栏目"，也应使用此技能。
---

<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

# 创建博客分类

本技能用于在 `docs/posts/` 下创建新的分类目录和首页。博客采用自动扫描机制，创建分类后无需修改任何配置，运行 `npm run dev` 即可在导航、首页、分类页看到新分类。

## 信息收集

创建分类需要以下信息，通过对话逐步确认：

| 信息 | 必填 | 说明 | 示例 |
|------|------|------|------|
| 分类显示名（title） | ✅ | 中文名称，用于导航和卡片显示 | `系统设计` |
| 分类目录名（slug） | ✅ | 英文 kebab-case，用于目录路径和 category 字段 | `system-design` |
| 分类描述（description） | ✅ | 一句话描述分类涵盖的内容 | `分布式系统、高可用架构等设计话题` |
| 语言 | ❌ | 默认中文；可选英文（创建到 `docs/en/posts/`） | `zh` / `en` |

### Slug 命名规则

- 只允许小写字母、数字和连字符（`-`）
- 不能以连字符开头或结尾
- 不能用空格或中文字符
- 示例：`system-design`、`react`、`go-web`

如果用户只提供了显示名没有提供 slug，帮助生成一个合适的 slug 并确认。

## 执行步骤

### 步骤 1：检查分类是否已存在

检查 `docs/posts/<slug>/` 或 `docs/en/posts/<slug>/` 是否已存在。如果已存在，提示用户该分类已经存在，询问是否要查看或在该分类下新建文章。

### 步骤 2：创建分类目录

```bash
# 中文分类（默认）
mkdir docs/posts/<slug>

# 英文分类
mkdir docs/en/posts/<slug>
```

### 步骤 3：生成分类首页 index.md

复制本 skill 自带的模板文件到目标目录，并替换其中的占位符：

```bash
# 模板位于 .claude/skills/createCategory/assets/category-index.md
cp .claude/skills/createCategory/assets/category-index.md docs/posts/<slug>/index.md
```

然后编辑 `index.md`，将模板中的占位符替换为用户提供的信息：

- `分类名称` → 用户提供的分类显示名（title）
- `一句话描述这个分类涵盖的内容` → 用户提供的描述（description）

**替换后的文件内容示例**：

```markdown
---
title: 系统设计
description: 分布式系统、高可用架构等设计话题
---

# 系统设计

<!-- [AGC:START] tool=Cc author=fangkun -->

这个分类涵盖以下内容：

- 主题一
- 主题二
- 主题三

## 学习路径

按照以下顺序学习...

<!-- [AGC:END] -->
```

文件编码使用 UTF-8（无 BOM）。

### 步骤 4：配置分类样式（可选）

询问用户是否要配置分类样式（标签、描述、颜色、图标）。如果要配置，读取并更新 `package.json` 中的 `categoryStyles` 字段：

```bash
# 读取现有配置
cat package.json | grep -A 100 '"categoryStyles"'
```

然后在 `categoryStyles` 对象中添加新分类的配置：

```json
{
  "categoryStyles": {
    "your-category": {
      "tag": "分类标签",
      "desc": "分类描述",
      "color": "#0066cc",
      "icon": "🧠"
    }
  }
}
```

字段说明：
- `tag`: 卡片上显示的小标签（如：编程语言、前端框架、AI 技术）
- `desc`: 卡片下方显示的描述
- `color`: 主题色（十六进制颜色值）
- `icon`: 图标（emoji）

> 如果不配置样式，分类卡片会使用默认灰色样式显示。

### 步骤 5：验证

运行以下命令验证分类创建成功：

```bash
npm run generate-posts
```

检查 `posts-data.json` 中是否出现了新分类。如果有报错，帮助用户排查。

### 步骤 6：提示后续操作

告诉用户：
- 分类已创建成功
- 可以用 `npm run new-post -- <slug> <article-slug>` 在该分类下创建新文章
- 可以在 `package.json` 的 `categoryStyles` 字段中修改分类样式

## 注意事项

- `index.md` 是分类首页，不会被扫描为文章
- 分类目录下至少需要有一篇非 draft 的文章，分类才会出现在导航菜单中
- frontmatter 的 `title` 字段决定了分类在导航、首页卡片、分类页的显示名
- 如果不写 `title`，会回退使用目录名作为显示名
- 删除分类只需删除整个目录，`npm run dev` 后自动从所有页面消失