<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-27 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

# Kunge2013's Blog

基于 VitePress 的个人技术博客，支持中英文双语，**新增分类和文章零代码改动**。

## 核心特性

- **自动扫描**：新建分类目录或文章文件后，自动出现在导航、首页、分类页、搜索结果中
- **双语支持**：中文（根路径 `/`）+ 英文（`/en/`）
- **全文搜索**：按 `Ctrl/⌘ + K` 弹出搜索框，按标题、描述、标签、分类模糊匹配
- **CI/CD**：推送到 `main` 分支自动构建并部署到 GitHub Pages

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（自动扫描文章并生成数据）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 仅重新生成文章数据
npm run generate-posts
```

## 目录结构

```
.
├── docs/
│   ├── .vitepress/
│   │   ├── config.ts              # VitePress 配置（导航/侧边栏/i18n）
│   │   ├── data/
│   │   │   ├── posts.ts            # 数据导出（自动读取 JSON）
│   │   │   └── posts-data.json    # 自动生成，请勿手动编辑
│   │   └── theme/                  # 自定义主题、组件、样式
│   ├── posts/                      # 中文文章（根路径）
│   │   ├── javascript/
│   │   │   ├── index.md            # 分类首页（决定分类显示名）
│   │   │   ├── es-modules.md
│   │   │   └── promise-async-await.md
│   │   ├── testing/
│   │   │   ├── index.md
│   │   │   └── test-article.md
│   │   └── ...
│   ├── en/                         # 英文文章
│   │   └── posts/
│   │       └── javascript/
│   │           └── sample-article.md
│   ├── archives.md                 # 归档页
│   ├── tags.md                     # 标签页
│   └── about.md                    # 关于页
├── templates/                      # 模板文件
│   ├── category-index.md           # 新增分类首页模板
│   └── new-post.md                 # 新增文章模板
└── scripts/
    ├── generate-posts-data.mjs     # 自动扫描数据生成
    ├── new-post.sh                 # 脚手架脚本
    └── validate-frontmatter.sh     # 格式校验脚本
```

## 模板文件

项目根目录 `templates/` 提供两个模板文件，可直接 `cp` 复用：

| 模板 | 用途 | 复制到 |
|------|------|--------|
| `templates/category-index.md` | 新分类的首页 | `docs/posts/<分类名>/index.md` |
| `templates/new-post.md` | 新文章的模板 | `docs/posts/<分类名>/<slug>.md` |

## 如何新增文章

### 方式一：复制模板手动创建（推荐）

```bash
# 1. 复制模板到目标分类目录
cp templates/new-post.md docs/posts/javascript/my-post.md

# 2. 编辑文件，修改 title / description / category / draft 等字段
# 3. 把 draft: true 改为 draft: false 发布
# 4. 运行 npm run dev 即可看到新文章
```

**文章模板内容**（`templates/new-post.md`）：

````markdown
---
title: 文章标题（必填）
date: 2026-08-27
description: 一句话摘要，会显示在搜索结果和列表中（必填）
category: javascript
tags: [标签1, 标签2]
lang: zh
i18n-link: /en/posts/javascript/article-slug
cover: ''
draft: false
sticky: false
---

# 文章标题

<!-- [AGC:START] tool=Cc author=fangkun -->

> 这里写文章导语或摘要，吸引读者继续阅读。

## 一、背景介绍

介绍文章要解决的问题、相关背景...

## 二、核心内容

### 2.1 子标题

正文段落...

### 2.2 子标题

正文段落...

```javascript
// 代码示例
function example() {
  console.log('Hello, World!')
}
```

## 三、实践应用

实际项目中如何应用...

## 四、总结

要点回顾：

1. **要点一**：简短说明
2. **要点二**：简短说明
3. **要点三**：简短说明

## 参考资料

- [文档名称](链接)
- [文档名称](链接)

<!-- [AGC:END] -->
````

### 方式二：使用脚手架脚本

```bash
# 中文文章（不存在分类时会自动创建分类目录和首页）
npm run new-post -- javascript my-first-post

# 英文文章
npm run new-post -- react hooks-basics --en
```

> 脚本会基于模板创建带 frontmatter 的文件，默认 `draft: true`（草稿），发布前改为 `false`。

## 如何新增分类

**完全零代码改动**，只需 2 步：

### 步骤 1：复制分类模板创建目录和首页

```bash
# 1. 创建分类目录
mkdir docs/posts/my-category

# 2. 复制分类首页模板
cp templates/category-index.md docs/posts/my-category/index.md

# 3. 编辑 index.md，修改 title / description
```

**分类模板内容**（`templates/category-index.md`）：

````markdown
---
title: 分类名称
description: 一句话描述这个分类涵盖的内容
---

# 分类名称

<!-- [AGC:START] tool=Cc author=fangkun -->

这个分类涵盖以下内容：

- 主题一
- 主题二
- 主题三

## 学习路径

按照以下顺序学习...

<!-- [AGC:END] -->
````

> **关键**：`title` 字段会自动用作导航菜单、首页卡片、分类页的显示名。
> 如果不写 `title`，则回退使用目录名（如 `my-category`）。

### 步骤 2：添加文章

在该目录下新建任意 `.md` 文章文件即可（参考上文「新增文章」）。

```bash
cp templates/new-post.md docs/posts/my-category/first-post.md
```

### 完成验证

运行 `npm run dev`，新分类会自动出现在：

- ✅ 顶部导航「分类」下拉菜单
- ✅ 首页技术分类卡片网格
- ✅ 分类页面 `/categories`
- ✅ 全文搜索结果

如果想让首页卡片显示自定义颜色和图标，编辑 `docs/.vitepress/theme/components/CategoryGrid.vue` 的 `styleConfig`，**这一步是可选的**，不配置也会用默认灰色样式显示。

### 删除分类

直接删除 `docs/posts/<分类名>/` 整个目录，运行 `npm run dev` 后该分类会自动从所有页面消失。

## 文章格式要求

### Frontmatter 字段说明

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `title` | ✅ | string | 文章标题 |
| `date` | ✅ | string (`YYYY-MM-DD`) | 发布日期，用于排序 |
| `description` | ✅ | string | 一句话摘要，显示在搜索结果和列表 |
| `category` | ✅ | string | 分类 ID（必须与所在目录名一致） |
| `tags` | ❌ | array | 标签数组，如 `[JavaScript, 异步]` |
| `lang` | ❌ | string | 语言代码：`zh` / `en`，默认 `zh` |
| `i18n-link` | ❌ | string | 对应的另一语言版本路径，用于切换语言 |
| `cover` | ❌ | string | 封面图 URL |
| `draft` | ❌ | boolean | `true` 时为草稿，不会被扫描；默认 `false` |
| `sticky` | ❌ | boolean | `true` 时在列表置顶 |

### 格式约束

1. **文件命名**：使用 kebab-case，如 `my-post.md`，不要用空格或中文
2. **frontmatter 必须在文件最顶部**：以 `---` 开始，以 `---` 结束，中间是 YAML
3. **`category` 必须与目录名一致**：在 `docs/posts/javascript/` 下，`category` 必须是 `javascript`
4. **`index.md` 不会被当作文章**：分类目录下的 `index.md` 是分类首页，不会被扫描为文章
5. **`draft: true` 的文章会被跳过**：草稿状态的文章不会出现在任何页面
6. **文件编码必须是 UTF-8**：用 VS Code 等编辑器保存时确认编码为 UTF-8（不带 BOM）

### 最小可用 frontmatter

```yaml
---
title: 我的文章
date: 2026-08-27
description: 简要描述
category: javascript
---
```

## 如何打包发布

### 自动发布（推荐）

推送到 `main` 分支即自动构建并部署到 GitHub Pages：

```bash
git add .
git commit -m "feat: add new post"
git push
```

GitHub Actions 工作流 `.github/workflows/deploy.yml` 会：

1. 校验所有文章的 frontmatter 格式
2. 安装依赖并构建站点
3. 部署到 GitHub Pages

> 部署前请在 GitHub 仓库 **Settings -> Pages -> Source** 选择 **GitHub Actions**。

### 手动构建与本地预览

```bash
# 构建生产版本到 docs/.vitepress/dist/
npm run build

# 本地预览构建结果
npm run preview
```

构建产物位于 `docs/.vitepress/dist/`，可手动上传到任意静态托管服务。

### frontmatter 格式校验

```bash
npm run validate
```

CI 会在部署前运行此脚本，本地先跑可以提前发现问题。

## 自动扫描原理

- **数据生成脚本**：`scripts/generate-posts-data.mjs`
- **生成产物**：`docs/.vitepress/data/posts-data.json`（已加入 `.gitignore`，每次 `dev`/`build` 前自动重新生成）
- **数据结构**：
  ```json
  {
    "zhPosts": { "<分类>": [{ title, date, description, url, tags, ... }] },
    "enPosts": { ... },
    "categoryLabels": { "<分类ID>": "<中文名>" },
    "enCategoryLabels": { "<分类ID>": "<英文名>" }
  }
  ```
- **消费方**：
  - `config.ts` 从 JSON 派生导航菜单
  - `theme/components/CategoryGrid.vue` 从 JSON 派生首页分类卡片
  - `theme/components/CategoryPage.vue` 从 JSON 派生分类列表
  - `theme/components/ArchiveList.vue` 从 JSON 派生归档页（按年份分组）
  - `theme/components/TagCloud.vue` 从 JSON 派生标签云和过滤列表
  - `theme/components/SearchModal.vue` 从 JSON 派生搜索结果

## 归档页与标签页

### 归档页（`/archives`）

**作用**：按时间倒序展示所有文章，按年份自动分组。

**使用方法**：访问 `https://kunge2013.github.io/archives` 即可，**无需任何配置**。组件 `ArchiveList.vue` 会自动从 `posts-data.json` 读取所有文章，按年份分组展示：

- 顶部统计：总文章数
- 按年份倒序分组（2026 → 2025 → ...）
- 每年标题旁显示该年文章数
- 每条文章：标题 + 分类标签 + 日期，hover 显示描述和标签
- `sticky: true` 的文章自动置顶（同年内）

**置顶效果**：

```yaml
---
sticky: true
---
```

### 标签页（`/tags`）

**作用**：以标签云形式展示所有标签，点击标签过滤文章。

**使用方法**：访问 `https://kunge2013.github.io/tags` 即可，**无需任何配置**。组件 `TagCloud.vue` 会自动从所有文章的 `tags` 字段聚合标签：

- 顶部统计：总标签数
- 标签云区域：每个标签显示名称 + 文章数，按出现次数倒序
- 点击标签过滤：下方列表只显示带该标签的文章
- 再次点击同一标签或点「全部」取消过滤
- 「全部」chip 始终在第一位

**新增标签的流程**：

直接在文章 frontmatter 的 `tags` 数组里写新标签，下次 `npm run dev` 自动出现在标签页：

```yaml
tags: [JavaScript, 异步, Promise, async]   # 任意标签都行，不需要预先注册
```

### 组件引用方式（自定义页面）

如果想在其他 markdown 页面里引用这两个组件：

```markdown
---
title: 我的自定义页面
layout: page
---

# 我的自定义页面

<ArchiveList />
```

或在 Vue 组件里：

```vue
<script setup>
import ArchiveList from './theme/components/ArchiveList.vue'
import TagCloud from './theme/components/TagCloud.vue'
</script>

<template>
  <ArchiveList />
  <TagCloud />
</template>
```

### 已注册的全局组件列表

在 `docs/.vitepress/theme/index.ts` 的 `enhanceApp` 里全局注册，**markdown 直接用**无需 import：

| 组件 | 用途 | 用法 |
|------|------|------|
| `<ArchiveList />` | 归档列表（按年份分组） | 任意 markdown 页面 |
| `<TagCloud />` | 标签云 + 过滤列表 | 任意 markdown 页面 |
| `<PostList />` | 当前分类下的文章列表 | 分类首页 `index.md` |
| `<CategoryGrid />` | 首页分类卡片网格 | 首页或自定义页 |
| `<CategoryPage />` | 分类列表页 | 分类列表页 |
| `<Comments />` | 评论区（Giscus） | 文章页底部 |

## 参考上文「新增文章」）。
-[minifog]( https://a.minifog.org.cn)
## License

MIT
<!-- [AGC:END] -->
