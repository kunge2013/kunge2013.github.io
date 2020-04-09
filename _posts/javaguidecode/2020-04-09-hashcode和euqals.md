---
layout: post
title:  "Java hashCode() 和 equals()的若干问题解答"
date:   2020-04-09 00:06:06
categories: java基础
tags: java基础
---
# Java hashCode() 和 equals()的若干问题解答

#### 本章的内容主要解决下面几个问题：
-  1 equals() 的作用是什么？
-  2 equals() 与 == 的区别是什么？
-  3 hashCode() 的作用是什么？
-  4 hashCode() 和 equals() 之间有什么联系？

##### 第1部分 equals() 的作用

- equals() 的作用是 用来判断两个对象是否相等。
- equals() 定义在JDK的Object.java中。通过判断两个对象的地址是否相等(即，是否是同一个对象)来区分它们是否相等。源码如下：
   
     public boolean equals(Object obj) {
    		return (this == obj);
	}
   
     既然Object.java中定义了equals()方法，这就意味着所有的Java类都实现了equals()方法，所有的类都可以通过equals()去比较两个对象是否相等。 但是，我们已经说过，使用默认的“equals()”方法，等价于“==”方法。因此，我们通常会重写equals()方法：若两个对象的内容相等，则equals()方法返回true；否则，返回fasle。  

-    下面根据“类是否覆盖equals()方法”，将它分为2类。
     1.  “没有覆盖equals()方法”的情况代码如下 (EqualsTest1.java)：
    
    import java.util.*;
	import java.lang.Comparable;
	/**
	 * @desc equals()的测试程序。
	 * @author fk
	 */
       public class EqualsTest1{

	    public static void main(String[] args) {
	        // 新建2个相同内容的Person对象，
	        // 再用equals比较它们是否相等
	        Person p1 = new Person("eee", 100);
	        Person p2 = new Person("eee", 100);
	        System.out.printf("%s\n", p1.equals(p2));
	    }

    /**
     * @desc Person类。
     */
	    private static class Person {
	        int age;
	        String name;
	
	        public Person(String name, int age) {
	            this.name = name;
	            this.age = age;
	        }
	
	        public String toString() {
	            return name + " - " +age;
	        }
	    }
    }	
    
   运行结果：
      
      false
    

    