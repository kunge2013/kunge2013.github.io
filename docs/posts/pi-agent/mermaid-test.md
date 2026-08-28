---
title: Mermaid 流程图测试
date: 2026-08-28
description: 测试 Mermaid 流程图在博客中的渲染效果
category: pi-agent
tags: [Mermaid, 流程图, 测试]
lang: zh
draft: false
---

# Mermaid 流程图测试

<!-- [AGC:START] tool=Cc author=fangkun -->

这篇文章用于测试 Mermaid 流程图在博客中的渲染效果。

## 简单流程图

下面是一个简单的流程图示例：

```mermaid
graph TD
    A[开始] --> B{是否完成?}
    B -->|是| C[结束]
    B -->|否| D[继续工作]
    D --> B
```

## 序列图

下面是一个序列图示例：

```mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    用户->>前端: 点击按钮
    前端->>后端: 发送请求
    后端-->>前端: 返回数据
    前端-->>用户: 显示结果
```

## 类图

下面是一个类图示例：

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +bark()
    }
    class Cat {
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

以上是 Mermaid 流程图的测试内容。

<!-- [AGC:END] -->
