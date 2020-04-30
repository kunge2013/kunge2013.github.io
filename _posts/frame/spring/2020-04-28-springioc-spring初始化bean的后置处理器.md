---
layout: post
title:  "spring ioc bean的后置处理器"
date:   2020-04-28 00:06:05
categories: spring
tags: spring 源码
---

##### spring ioc bean的后置处理


##### 1.springioc 中有两个接口都可以被现实下，分别是 BeanFactoryPostProcessor和BeanPostProcessor


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

	
##### 2.spring bean 对象注解初始化 后置处理器 InitDestroyAnnotationBeanPostProcessor


-   1.InitDestroyAnnotationBeanPostProcessor后置处理器的作用?
	InitDestroyAnnotationBeanPostProcessor 后置处理器主要用于，实例化bean后解析 PostConstruct 和 PreDestroy 注解，如果当前的bean 
	配置了PostConstruct 或 PreDestroy，那么 会通过反射的方式获取到当前bean的方法，然后在执行PostConstruct和PreDestroy对应的方法



	@Override
		public void postProcessMergedBeanDefinition(RootBeanDefinition beanDefinition, Class<?> beanType, String beanName) {
			LifecycleMetadata metadata = findLifecycleMetadata(beanType);
			metadata.checkConfigMembers(beanDefinition);
		}
		/**
		 * 	查找或者初始化 当前bean 实例的初始化方法或者销毁方法 （PostConstruct 或者  PreDestroy）
		 * @param clazz
		 * @return
		 */
		private LifecycleMetadata findLifecycleMetadata(Class<?> clazz) {
			if (this.lifecycleMetadataCache == null) {
				// Happens after deserialization, during destruction...
				return buildLifecycleMetadata(clazz);
			}
			// Quick check on the concurrent map first, with minimal locking.
			LifecycleMetadata metadata = this.lifecycleMetadataCache.get(clazz);
			if (metadata == null) {
				synchronized (this.lifecycleMetadataCache) {
					metadata = this.lifecycleMetadataCache.get(clazz);
					if (metadata == null) {
						// 获取是由引用了  PostConstruct 或者  PreDestroy的相关注解 ，也就是是否自定义了对bean 的自定义的方法
						metadata = buildLifecycleMetadata(clazz);
						this.lifecycleMetadataCache.put(clazz, metadata);
					}
					return metadata;
				}
			}
			return metadata;
		}
		/**
		 * 获取当前bean 实例中是否包含 PostConstruct 或者  PreDestroy的相关注解
		 * @param clazz
		 * @return
		 */
		private LifecycleMetadata buildLifecycleMetadata(final Class<?> clazz) {
			if (!AnnotationUtils.isCandidateClass(clazz, Arrays.asList(this.initAnnotationType, this.destroyAnnotationType))) {
				return this.emptyLifecycleMetadata;
			}
			List<LifecycleElement> initMethods = new ArrayList<>();
			List<LifecycleElement> destroyMethods = new ArrayList<>();
			Class<?> targetClass = clazz;
			do {
				final List<LifecycleElement> currInitMethods = new ArrayList<>();
				final List<LifecycleElement> currDestroyMethods = new ArrayList<>();
				// 此处主要通过反射方式获取方法体中包不包含 初始化注解，销毁注解  
				ReflectionUtils.doWithLocalMethods(targetClass, method -> {
					if (this.initAnnotationType != null && method.isAnnotationPresent(this.initAnnotationType)) {
						LifecycleElement element = new LifecycleElement(method);
						currInitMethods.add(element);
						if (logger.isTraceEnabled()) {
							logger.trace("Found init method on class [" + clazz.getName() + "]: " + method);
						}
					}
					if (this.destroyAnnotationType != null && method.isAnnotationPresent(this.destroyAnnotationType)) {
						currDestroyMethods.add(new LifecycleElement(method));
						if (logger.isTraceEnabled()) {
							logger.trace("Found destroy method on class [" + clazz.getName() + "]: " + method);
						}
					}
				});
				initMethods.addAll(0, currInitMethods);
				destroyMethods.addAll(currDestroyMethods);
				targetClass = targetClass.getSuperclass();
			}
			while (targetClass != null && targetClass != Object.class);
			return (initMethods.isEmpty() && destroyMethods.isEmpty() ? this.emptyLifecycleMetadata :
					new LifecycleMetadata(clazz, initMethods, destroyMethods));
		}	
	
	
	
-   2.初始化参数， 该后置处理器在org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory # applyMergedBeanDefinitionPostProcessors中调用初始化参数

		/**
		 *  	对指定的bean定义应用MergedBeanDefinitionPostProcessors，调用它们的postProcessMergedBeanDefinition方法。
		 * Apply MergedBeanDefinitionPostProcessors to the specified bean definition,
		 * invoking their {@code postProcessMergedBeanDefinition} methods.
		 * @param mbd the merged bean definition for the bean
		 * @param beanType the actual type of the managed bean instance
		 * @param beanName the name of the bean
		 * @see MergedBeanDefinitionPostProcessor#postProcessMergedBeanDefinition
		 */
		protected void applyMergedBeanDefinitionPostProcessors(RootBeanDefinition mbd, Class<?> beanType, String beanName) {
			for (BeanPostProcessor bp : getBeanPostProcessors()) {
				if (bp instanceof MergedBeanDefinitionPostProcessor) {
					MergedBeanDefinitionPostProcessor bdp = (MergedBeanDefinitionPostProcessor) bp;
					bdp.postProcessMergedBeanDefinition(mbd, beanType, beanName);
				}
			}
		}



-   3.执行, 该后置处理器在org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory # applyMergedBeanDefinitionPostProcessors中调用初始化参数

org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#applyBeanPostProcessorsBeforeInitialization 调用执行后置处理器,调用位置如下
	
-  a.上层调用栈

		/**
			 * 执行后置处理器
			 */
			@Override
			public Object applyBeanPostProcessorsBeforeInitialization(Object existingBean, String beanName)
					throws BeansException {
		
				Object result = existingBean;
				for (BeanPostProcessor processor : getBeanPostProcessors()) {
					Object current = processor.postProcessBeforeInitialization(result, beanName);
					if (current == null) {
						return result;
					}
					result = current;
				}
				return result;
			}
		
-   b.执行后置处理器并初始化bean的属性值	，初始化代码逻辑如下
	
	
		/**
		 * 	执行后置处理器
		 * 	初始化bean的属性
		 * 
		 */
		@Override
		public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
			LifecycleMetadata metadata = findLifecycleMetadata(bean.getClass());
			try {
				metadata.invokeInitMethods(bean, beanName);
			}
			catch (InvocationTargetException ex) {
				throw new BeanCreationException(beanName, "Invocation of init method failed", ex.getTargetException());
			}
			catch (Throwable ex) {
				throw new BeanCreationException(beanName, "Failed to invoke init method", ex);
			}
			return bean;
		}
	
	
