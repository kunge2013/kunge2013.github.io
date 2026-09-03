---
title: "TypeScript Playground 测试"
date: 2026-09-03
description: "测试 TypeScript 可执行代码块功能"
category: typescript
tags: [TypeScript, Playground, 测试]
lang: zh
draft: false
---

# TypeScript Playground 测试

## 示例 1：基础语法

```ts-playground
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "fangkun",
  age: 18
};

console.log("用户信息:", user);
console.log(`姓名: ${user.name}, 年龄: ${user.age}`);
```

## 示例 2：泛型

```ts-playground
function identity<T>(arg: T): T {
  return arg;
}

const num = identity<number>(42);
const str = identity<string>("hello");

console.log("数字:", num);
console.log("字符串:", str);
```

## 示例 3：联合类型

```ts-playground
type Status = "pending" | "success" | "error";

function handleStatus(status: Status): string {
  switch (status) {
    case "pending":
      return "处理中...";
    case "success":
      return "成功!";
    case "error":
      return "失败了";
  }
}

console.log(handleStatus("pending"));
console.log(handleStatus("success"));
console.log(handleStatus("error"));
```

## 示例 4：类型错误演示

```ts-playground
// 这段代码有类型错误
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "fangkun",
  age: "18"  // ❌ 类型错误：age 应该是 number，不是 string
};

console.log(user);
```

## 示例 5：使用 Vue 组件语法

<TsPlayground code="// 直接在组件中写代码
const arr = [1, 2, 3, 4, 5];
const sum = arr.reduce((a, b) => a + b, 0);
console.log('数组:', arr);
console.log('总和:', sum);" />

## 测试说明

- ✅ 点击 **▶ 运行** 按钮执行代码
- ✅ 修改代码后重新运行
- ✅ 类型错误会显示在输出区
- ✅ 点击 **🔗 Playground** 跳转到 TypeScript Playground
- ✅ 支持 `Ctrl+Enter`（Windows）/ `Cmd+Enter`（Mac）快捷键运行
