<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

# 数据结构参考

## posts-data.json 完整示例

```json
{
  "zhPosts": {
    "javascript": [
      {
        "title": "JavaScript 异步编程详解",
        "date": "2026-08-28",
        "description": "深入理解 Promise、async/await 的工作原理",
        "url": "/posts/javascript/promise-async-await",
        "tags": ["JavaScript", "异步", "Promise"],
        "sticky": false,
        "category": "javascript",
        "i18nLink": "/en/posts/javascript/promise-async-await"
      }
    ],
    "system-design": [
      {
        "title": "分布式锁详解",
        "date": "2026-08-27",
        "description": "Redis、Zookeeper 等分布式锁实现方案对比",
        "url": "/posts/system-design/distributed-lock",
        "tags": ["分布式", "Redis", "锁"],
        "sticky": true,
        "category": "system-design",
        "i18nLink": ""
      }
    ]
  },
  "enPosts": {
    "javascript": [
      {
        "title": "Understanding JavaScript Promises",
        "date": "2026-08-28",
        "description": "A deep dive into Promise API and async/await patterns",
        "url": "/en/posts/javascript/promise-async-await",
        "tags": ["JavaScript", "Async"],
        "sticky": false,
        "category": "javascript",
        "i18nLink": "/posts/javascript/promise-async-await"
      }
    ]
  },
  "categoryLabels": {
    "javascript": "JavaScript",
    "system-design": "系统设计",
    "react": "React"
  },
  "enCategoryLabels": {
    "javascript": "JavaScript",
    "system-design": "System Design",
    "react": "React"
  }
}
```

## Post 接口定义

```typescript
export interface Post {
  title: string          // 文章标题，来自 frontmatter.title
  date: string           // 发布日期，格式 YYYY-MM-DD
  description: string    // 一句话摘要，显示在列表和搜索结果
  url: string            // 文章 URL 路径，如 /posts/javascript/my-post
  tags: string[]         // 标签数组，来自 frontmatter.tags
  sticky?: boolean       // 是否置顶，默认 false
  category?: string      // 分类 ID，与目录名一致
  i18nLink?: string      // 另一语言版本的路径，用于语言切换
}
```

## 字段提取规则

| JSON 字段 | 来源 | 说明 |
|-----------|------|------|
| `title` | `frontmatter.title` | 如果为空，使用文件名（不含 `.md`） |
| `date` | `frontmatter.date` | 必须为 `YYYY-MM-DD` 格式 |
| `description` | `frontmatter.description` | 必填，用于 SEO 和列表显示 |
| `url` | 自动生成 | 格式：`/posts/<category>/<slug>` 或 `/en/posts/<category>/<slug>` |
| `tags` | `frontmatter.tags` | 数组，默认空数组 `[]` |
| `sticky` | `frontmatter.sticky` | 布尔值，默认 `false` |
| `category` | 目录名 | 自动从父目录名提取 |
| `i18nLink` | `frontmatter.i18n-link` | 可选，用于中英文切换 |

## 分类标签合并逻辑

```javascript
// 中文标签优先级：
// 1. 中文 index.md 的 title
// 2. 英文 index.md 的 title（回退）
// 3. 硬编码的 fallbackLabels（最终回退）
categoryLabels = buildCategoryLabels({ ...enLabels, ...zhLabels }, false)

// 英文标签优先级：
// 1. 英文 index.md 的 title
// 2. 中文 index.md 的 title（回退）
// 3. 硬编码的 fallbackLabels（最终回退）
enCategoryLabels = buildCategoryLabels({ ...zhLabels, ...enLabels }, true)
```

## 硬编码的 fallbackLabels

位于 `scripts/generate-posts-data.mjs`：

```javascript
const fallbackLabels = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  react: 'React',
  vue: 'Vue',
  spring: 'Spring',
  'system-design': isEn => (isEn ? 'System Design' : '系统设计'),
  'design-patterns': isEn => (isEn ? 'Design Patterns' : '设计模式'),
}
```

这些是预设的常见分类标签，如果 `index.md` 没有 `title` 字段，会使用这些默认值。