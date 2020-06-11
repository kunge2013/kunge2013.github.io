---
layout: post
title:  "reference包源码分析"
date:   2020-06-10 23:06:06
categories: java
tags: java
---

## 1,引用类型


|  类型	  | 对应类	|   特征 |
| ----  | ----  | ----  |
| 强引用	  |    		|	强引用的对象绝对不会被gc回收	   |	
|软引用	|SoftReference|如果物理内存充足则不会被gc回收,如果物理内存不充足则会被gc回收。|
|弱引用	|WeakReference|一旦被gc扫描到则会被回收|
|虚引用	|PhantomReference|不会影响对象的生命周期，形同于无，任何时候都可能被gc回收|
|	|FinalReference|用于收尾机制(finalization)|

![reference关系](https://kunge2013.github.io/images/frame/jdk/reference/reference.png)