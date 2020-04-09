---
layout: post
title:  "Java hashCode() 和 equals()的若干问题解答"
date:   2020-04-09 00:06:06
categories: java基础
tags: java基础
---

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
      
  结果分析：
  
    我们通过 p1.equals(p2) 来“比较p1和p2是否相等时”。实际上，调用的Object.java的equals()方法，即调用的 (p1==p2) 。它是比较“p1和p2是否是同一个对象”。 而由 p1 和 p2 的定义可知，它们虽然内容相同；但它们是两个不同的对象！因此，返回结果是false。

    2. "覆盖equals()方法"的情况
   我们修改上面的EqualsTest1.java：覆盖equals()方法。代码如下 (EqualsTest1.java)：
	   
	import java.util.*;
import java.lang.Comparable;

	/**
	 * @desc equals()的测试程序。
	 *
	 * @author skywang
	 * @emai kuiwu-wang@163.com
	 */
	public class EqualsTest2{
	
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
	
	        /** 
	         * @desc 覆盖equals方法 
	         */  
	        @Override
	        public boolean equals(Object obj){  
	            if(obj == null){  
	                return false;  
	            }  
	              
	            //如果是同一个对象返回true，反之返回false  
	            if(this == obj){  
	                return true;  
	            }  
	              
	            //判断是否类型相同  
	            if(this.getClass() != obj.getClass()){  
	                return false;  
	            }  
	              
	            Person person = (Person)obj;  
	            return name.equals(person.name) && age==person.age;  
	        } 
	    }
    }

   运行结果： 
    
    true
    
    
   结果分析：

    我们在EqualsTest2.java 中重写了Person的equals()函数：当两个Person对象的 name 和 age 都相等，则返回true。 因此，运行结果返回true。

    讲到这里，顺便说一下java对equals()的要求。有以下几点：
	1. 对称性：如果x.equals(y)返回是"true"，那么y.equals(x)也应该返回是"true"。
	2. 反射性：x.equals(x)必须返回是"true"。
	3. 类推性：如果x.equals(y)返回是"true"，而且y.equals(z)返回是"true"，那么z.equals(x)也应该返回是"true"。
	4. 一致性：如果x.equals(y)返回是"true"，只要x和y内容一直不变，不管你重复x.equals(y)多少次，返回都是"true"。
	5. 非空性，x.equals(null)，永远返回是"false"；x.equals(和x不同类型的对象)永远返回是"false"。


    

      


     

    