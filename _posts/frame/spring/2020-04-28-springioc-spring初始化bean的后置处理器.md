---
layout: post
title:  "spring ioc bean的后置处理器"
date:   2020-04-28 00:06:05
categories: spring
tags: spring 源码
---

##### spring ioc bean的后置处理

####### 1.springioc 中有两个接口都可以被现实下，分别是 BeanFactoryPostProcessor和BeanPostProcessor

-   1.BeanFactoryPostProcessor和BeanPostProcessor有什么区别呢?

 a.BeanFactoryPostProcessor用于对beanFactory的对象的增强，修改beanFactory的相关属性
   beanFactory可以直接注册bean,修改属性
   
 b.BeanPostProcessor用于对实例bean创建后的增强，比如在bean实例创建前后，可以修改bean实例的属性值， bean的生命周期主要是围绕BeanPostProcessor来实现的
 
   beanPostProcessor可以偷梁换柱，修改bean的属性信息！
   
 以下是 BeanPostProcessor和BeanFactoryPostProcessor的部分源码实现
 	
 	
	public class InitBeanPostProcessor implements BeanPostProcessor {
	
		@Override
		public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
			// TODO Auto-generated method stub
			System.out.println(" postProcessBeforeInitialization ===" + beanName);
			if (bean instanceof String) {
				bean = "String 的对象被修改了值";
				return bean;
			}
			return BeanPostProcessor.super.postProcessBeforeInitialization(bean, beanName);
		}
		
		
		@Override
		public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
			// TODO Auto-generated method stub
			System.out.println(" postProcessAfterInitialization ===" + beanName);
			return BeanPostProcessor.super.postProcessAfterInitialization(bean, beanName);
		}
		
		
		
	}
	

	package org.kframe.springioc.annotations.processor;
	
	import org.springframework.beans.BeansException;
	import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
	import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
	import org.springframework.stereotype.Component;
	
	@Component
	public class SelfBeanFactoryPostProcessor implements BeanFactoryPostProcessor {
	
		@Override
		public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
			System.out.println(beanFactory);
			beanFactory.registerSingleton("String", new String("11111"));
		}
	
	}



	package org.kframe.springioc.annotations;
	
	import org.springframework.context.annotation.AnnotationConfigApplicationContext;
	
	public class AnnotationApplication {
		
		private static AnnotationConfigApplicationContext context;
		
		public static void main(String[] args) throws Exception {
			System.out.println("=======================begin  AnnotationConfigApplicationContext=======================================");
			context = new AnnotationConfigApplicationContext("org.kframe.springioc.annotations");
			System.out.println("String==== 代码手动注入后的String ：" +  context.getBean("String"));
			System.out.println("config==== name 被改编后的值 ：" +  context.getBean(Config.class).getName());
		}
		
	}
