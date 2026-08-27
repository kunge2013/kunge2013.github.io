---
title: Promise 与 async/await 详解
date: 2026-08-25
description: 深入理解 JavaScript 异步编程的核心机制，从回调地狱到 Promise 再到 async/await 的演进之路
category: javascript
tags: [JavaScript, 异步, Promise, async]
lang: zh
draft: false
sticky: true
---

# Promise 与 async/await 详解

<!-- [AGC:START] tool=Cc author=fangkun -->

> 异步编程是 JavaScript 的核心特性之一。

## 回调地狱问题

传统的回调方式会导致"回调地狱"：

```javascript
getUser(1, (user) => {
  getOrders(user.id, (orders) => {
    getOrderDetail(orders[0].id, (detail) => {
      // 嵌套越来越深...
    })
  })
})
```

## Promise 的出现

Promise 让异步操作变得平坦：

```javascript
getUser(1)
  .then(user => getOrders(user.id))
  .then(orders => getOrderDetail(orders[0].id))
  .then(detail => console.log(detail))
```

## async/await

最接近同步代码的异步写法：

```javascript
async function loadUserDetail() {
  const user = await getUser(1)
  const orders = await getOrders(user.id)
  const detail = await getOrderDetail(orders[0].id)
  return detail
}
```

<!-- [AGC:END] -->
