---
title: ES Modules 完全指南
date: 2026-08-20
description: 全面介绍 ES Modules 的 import/export 语法、动态导入、以及模块化的最佳实践
category: javascript
tags: [JavaScript, ES Modules, 模块化]
lang: zh
draft: false
sticky: false
---

# ES Modules 完全指南

<!-- [AGC:START] tool=Cc author=fangkun -->

## 基本导出与导入

```javascript
// math.js
export const PI = 3.14159
export function add(a, b) { return a + b }

// app.js
import { PI, add } from './math.js'
```

## 默认导出

```javascript
// logger.js
export default function log(msg) {
  console.log(msg)
}

// app.js
import log from './logger.js'
```

## 命名空间导入

```javascript
// 一次性导入整个模块
import * as math from './math.js'
console.log(math.PI)
console.log(math.add(1, 2))
```

## 重新导出

```javascript
// utils/index.js
export { PI, add } from './math.js'
export { default as log } from './logger.js'

// 使用
import { PI, log } from './utils/index.js'
```

## 动态导入

```javascript
// 按需加载，返回 Promise
async function loadModule() {
  const { add } = await import('./math.js')
  return add(1, 2)
}
```

## 最佳实践

1. **优先使用命名导出**，明确知道导入了什么
2. **每个模块只做一件事**，保持单一职责
3. **避免循环依赖**，重构共享逻辑到独立模块
4. **使用动态导入做代码分割**，提升首屏加载性能

<!-- [AGC:END] -->
