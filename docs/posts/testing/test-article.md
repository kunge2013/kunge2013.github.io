---
title: 测试文章 - 验证自动扫描系统
date: 2026-08-27
description: 这是一篇测试文章，用于验证添加新分类和新文章后能否被自动扫描、索引和搜索
category: testing
tags: [测试, 自动扫描, 验证]
lang: zh
i18n-link: ''
cover: ''
draft: false
sticky: false
---

# 测试文章 - 验证自动扫描系统

<!-- [AGC:START] tool=Cc author=fangkun -->

> 这是一篇测试文章，用于验证自动扫描系统是否正常工作。

## 验证项

如果你能看到这篇文章，说明以下功能正常：

1. **目录自动扫描** - `scripts/generate-posts-data.mjs` 自动扫描 `docs/posts/` 子目录
2. **JSON 数据生成** - 文章 frontmatter 被解析并写入 `posts-data.json`
3. **分类自动发现** - 新分类 `testing` 自动出现在首页、导航、分类页
4. **搜索功能** - 搜索"测试"或"验证"可以找到这篇文章

## 代码示例

```javascript
// 测试代码块
function autoScan(directory) {
  console.log(`扫描目录: ${directory}`)
  return ['测试文章 - 验证自动扫描系统']
}

const result = autoScan('docs/posts/testing')
console.log(result)
```

## 总结

删除 `docs/posts/testing/` 目录后，该分类和文章会自动从所有页面消失，无需修改任何代码。这就是自动扫描系统的便利之处。

<!-- [AGC:END] -->
