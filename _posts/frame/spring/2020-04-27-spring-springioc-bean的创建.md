---
layout: post
title:  "spring ioc的源码分析之 bean的创建"
date:   2020-04-27 00:06:05
categories: spring
tags: spring 源码
---

##### spring ioc的源码分析

###### 1.通过org.springframework.context.support.AbstractApplicationContext.finishBeanFactoryInitialization 创建Bean 对象的过程之单例的创建,在该方法中实现了，一个实例bean的创建，实例的初始化

	/**
		 * 完成此上下文的bean工厂的初始化，初始化所有剩余的单例bean。
		 * Finish the initialization of this context's bean factory,
		 * initializing all remaining singleton beans.
		 */
		protected void finishBeanFactoryInitialization(ConfigurableListableBeanFactory beanFactory) {
			// Initialize conversion service for this context.
			// 初始化此上下文的转换服务。
			if (beanFactory.containsBean(CONVERSION_SERVICE_BEAN_NAME) &&
					beanFactory.isTypeMatch(CONVERSION_SERVICE_BEAN_NAME, ConversionService.class)) {
				beanFactory.setConversionService(
						beanFactory.getBean(CONVERSION_SERVICE_BEAN_NAME, ConversionService.class));
			}
	
			// Register a default embedded value resolver if no bean post-processor
			// 如果没有bean后处理器，则注册默认的嵌入式值解析器
			// (such as a PropertyPlaceholderConfigurer bean) registered any before:
			// （例如PropertyPlaceholderConfigurer bean）在以下任何时间之前注册：
			// at this point, primarily for resolution in annotation attribute values.
			// 此时，主要用于注释属性值中的分辨率。
			if (!beanFactory.hasEmbeddedValueResolver()) {
				beanFactory.addEmbeddedValueResolver(strVal -> getEnvironment().resolvePlaceholders(strVal));
			}
	
			// Initialize LoadTimeWeaverAware beans early to allow for registering their transformers early.
			// 尽早初始化LoadTimeWeaverAware bean，以便尽早注册其转换器。
			String[] weaverAwareNames = beanFactory.getBeanNamesForType(LoadTimeWeaverAware.class, false, false);
			for (String weaverAwareName : weaverAwareNames) {
				getBean(weaverAwareName);
			}
	
			// Stop using the temporary ClassLoader for type matching.
			// 停止使用临时类加载器进行类型匹配。
			beanFactory.setTempClassLoader(null);
	
			// Allow for caching all bean definition metadata, not expecting further changes.
			// 允许缓存所有bean定义元数据，不需要进一步更改。
			beanFactory.freezeConfiguration();
	
			// Instantiate all remaining (non-lazy-init) singletons.
			//实例化所有剩余的（非延迟初始化）单个
			beanFactory.preInstantiateSingletons();
		}

	