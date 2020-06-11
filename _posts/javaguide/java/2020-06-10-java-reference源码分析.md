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

## 2, FinalReference

	FinalReference访问权限为package，并且只有一个子类Finalizer，同时Finalizer 是final修饰的类，所以无法继承扩展。
	
	​ 与Finalizer相关联的则是Object中的finalize()方法，在类加载的过程中，如果当前类有覆写finalize()方法，则其对象会被标记为finalizer类，这种类型的对象被回收前会先调用其finalize()。
	
	​ 具体的实现机制是，在gc进行可达性分析的时候，如果当前对象是finalizer类型的对象，并且本身不可达（与GC Roots无相连接的引用），则会被加入到一个ReferenceQueue类型的队列(F-Queue)中。而系统在初始化的过程中，会启动一个FinalizerThread实例的守护线程(线程名Finalizer)，该线程会不断消费F-Queue中的对象，并执行其finalize()方法(runFinalizer)，并且runFinalizer方法会捕获Throwable级别的异常，也就是说finalize()方法的异常不会导致FinalizerThread运行中断退出。对象在执行finalize()方法后，只是断开了与Finalizer的关联，并不意味着会立即被回收，还是要等待下一次GC，而每个对象的finalize()方法都只会执行一次，不会重复执行。
	
	​ finalize()方法是对象逃脱死亡命运的最后一次机会，如果在该方法中将对象本身(this关键字) 赋值给某个类变量或者对象的成员变量，那在第二次标记时它将被移出"即将回收的集合"。
	
	——《深入理解java虚拟机》
	
	注意：finalize()使用不当会导致内存泄漏和内存溢出，比如SocksSocketImpl之类的服务会在finalize()中加入close()操作用于释放资源，但是如果FinalizerThread一直没有执行的话就会导致资源一直无法释放，从而出现内存泄漏。还有如果某对象的finalize()方法执行时间太长或者陷入死循环，将导致F-Queue一直堆积，从而造成内存溢出(oom)。
	
### 2.1, Finalizer

-  FinalizerThread
	
		  //消费ReferenceQueue并执行对应元素对象的finalize()方法
		    private static class FinalizerThread extends Thread {
		        ......
		        public void run() {
		            ......
		            final JavaLangAccess jla = SharedSecrets.getJavaLangAccess();
		            running = true;
		            for (;;) {
		                try {
		                    Finalizer f = (Finalizer)queue.remove();
		                    f.runFinalizer(jla);
		                } catch (InterruptedException x) {
		                }
		            }
		        }
		    }
	
		/初始化的时候启动FinalizerThread(守护线程)
		    static {
		        ThreadGroup tg = Thread.currentThread().getThreadGroup();
		        for (ThreadGroup tgn = tg;
		             tgn != null;
		             tg = tgn, tgn = tg.getParent());
		        Thread finalizer = new FinalizerThread(tg);
		        finalizer.setPriority(Thread.MAX_PRIORITY - 2);
		        finalizer.setDaemon(true);
		        finalizer.start();
		    }
-   add
	在jvm启动的时候就会启动一个守护线程去消费引用队列，并调用引用队列指向对象的finalize()方法。
	jvm在注册finalize()方法被覆写的对象的时候会创建一个Finalizer对象，并且将该对象加入一个双向链表中：


	    static void register(Object finalizee) {
	        new Finalizer(finalizee);
	    }
	    private Finalizer(Object finalizee) {
	        super(finalizee, queue);
	        add();
	    }
	    private void add() { 
	        synchronized (lock) { //头插法构建Finalizer对象的链表
	            if (unfinalized != null) {
	                this.next = unfinalized;
	                unfinalized.prev = this;
	            }
	            unfinalized = this;
	        }
	    }


另外还有两个附加线程用于消费Finalizer链表以及队列:
Runtime.runFinalization()会调用runFinalization()用于消费Finalizer队列，而java.lang.Shutdown则会在jvm退出的时候(jvm关闭钩子)调用runAllFinalizers()用于消费Finalizer链表。

