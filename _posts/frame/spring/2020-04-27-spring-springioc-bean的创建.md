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
		
###### 2.finishBeanFactoryInitialization 具体操作核心实例化bean 的单例如下 org.springframework.beans.factory.support.DefaultListableBeanFactory # preInstantiateSingletons
	
		@Override
		public void preInstantiateSingletons() throws BeansException {
			if (logger.isTraceEnabled()) {
				logger.trace("Pre-instantiating singletons in " + this);
			}
	
			// Iterate over a copy to allow for init methods which in turn register new bean definitions.
			// 遍历副本以允许init方法注册新的bean定义。
			// While this may not be part of the regular factory bootstrap, it does otherwise work fine.
			// 虽然这可能不是常规工厂引导的一部分，但它在其他方面工作正常。
			List<String> beanNames = new ArrayList<>(this.beanDefinitionNames);
	
			// Trigger initialization of all non-lazy singleton beans...
			//所有非惰性单例bean的触发器初始化。。。
			for (String beanName : beanNames) {
				RootBeanDefinition bd = getMergedLocalBeanDefinition(beanName);
				if (!bd.isAbstract() && bd.isSingleton() && !bd.isLazyInit()) {
					if (isFactoryBean(beanName)) {
						Object bean = getBean(FACTORY_BEAN_PREFIX + beanName);
						if (bean instanceof FactoryBean) {
							final FactoryBean<?> factory = (FactoryBean<?>) bean;
							boolean isEagerInit;
							if (System.getSecurityManager() != null && factory instanceof SmartFactoryBean) {
								isEagerInit = AccessController.doPrivileged((PrivilegedAction<Boolean>)
												((SmartFactoryBean<?>) factory)::isEagerInit,
										getAccessControlContext());
							}
							else {
								isEagerInit = (factory instanceof SmartFactoryBean &&
										((SmartFactoryBean<?>) factory).isEagerInit());
							}
							if (isEagerInit) {
								getBean(beanName);
							}
						}
					}
					else {
						getBean(beanName);
					}
				}
			}
	
			// Trigger post-initialization callback for all applicable beans...
			//为所有适用的bean触发初始化后回调。。。
			for (String beanName : beanNames) {
				Object singletonInstance = getSingleton(beanName);
				if (singletonInstance instanceof SmartInitializingSingleton) {
					final SmartInitializingSingleton smartSingleton = (SmartInitializingSingleton) singletonInstance;
					if (System.getSecurityManager() != null) {
						AccessController.doPrivileged((PrivilegedAction<Object>) () -> {
							smartSingleton.afterSingletonsInstantiated();
							return null;
						}, getAccessControlContext());
					}
					else {
						smartSingleton.afterSingletonsInstantiated();
					}
				}
			}
		}

###### 2.preInstantiateSingletons 具体操作核心实例化bean 的操作是org.springframework.beans.factory.support.AbstractBeanFactory#getBean()
-  org.springframework.beans.factory.support.AbstractBeanFactory#getBean()
-    org.springframework.beans.factory.support.AbstractBeanFactory#doGetBean(final String name, @Nullable final Class<T> requiredType,
			@Nullable final Object[] args, boolean typeCheckOnly)

doGetBean 源码如下
	
	
		