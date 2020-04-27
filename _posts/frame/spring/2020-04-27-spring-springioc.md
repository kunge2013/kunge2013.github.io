---
layout: post
title:  "spring ioc的源码分析之 bean 的创建"
date:   2020-04-27 00:06:05
categories: spring
tags: spring 源码
---

##### spring ioc的源码分析

###### 1.通过ClassPathXmlApplicationContext 创建Bean 对象的过程
	
-   1.创建上下文对象

		public ClassPathXmlApplicationContext(
			String[] configLocations, boolean refresh, @Nullable ApplicationContext parent)
					throws BeansException {
		
			super(parent);
			//初始化文件路径
			setConfigLocations(configLocations);
			if (refresh) {
			// 构建相关对象
				refresh();
			}
		}			
	
-  2.ClassPathXmlApplicationContext#setConfigLocations 初始化配置文件路径

		/**
		 * 解析文件相关路径	
		 * Set the config locations for this application context.
		 * <p>If not set, the implementation may use a default as appropriate.
		 */
		public void setConfigLocations(@Nullable String... locations) {
			if (locations != null) {
				Assert.noNullElements(locations, "Config locations must not be null");
				this.configLocations = new String[locations.length];
				for (int i = 0; i < locations.length; i++) {
					this.configLocations[i] = resolvePath(locations[i]).trim();
				}
			}
			else {
				this.configLocations = null;
			}
		}

-  3.解析并处理文件ClassPathXmlApplicationContext#refresh
	
	@Override
	public void refresh() throws BeansException, IllegalStateException {
		synchronized (this.startupShutdownMonitor) {
			// Prepare this context for refreshing.
			//准备刷新此上下文。
			prepareRefresh();

			// Tell the subclass to refresh the internal bean factory.
			//告诉子类刷新内部bean工厂。
			ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

			// Prepare the bean factory for use in this context.
			//准备bean工厂以供在此上下文中使用。
			prepareBeanFactory(beanFactory);

			try {
				// Allows post-processing of the bean factory in context subclasses.
				// 允许在上下文子类中对bean工厂进行后处理。
				postProcessBeanFactory(beanFactory);

				// Invoke factory processors registered as beans in the context.
				// 调用上下文中注册为bean的工厂处理器。
				invokeBeanFactoryPostProcessors(beanFactory);

				// Register bean processors that intercept bean creation.
				//注册拦截bean创建的bean处理器。
				registerBeanPostProcessors(beanFactory);

				// Initialize message source for this context.
				//初始化此上下文的消息源。
				initMessageSource();

				// Initialize event multicaster for this context.
				//为此上下文初始化事件多主机。
				initApplicationEventMulticaster();

				// Initialize other special beans in specific context subclasses.
				//初始化特定上下文子类中的其他特殊bean。
				onRefresh();

				// Check for listener beans and register them.
				//检查侦听器bean并注册它们。
				registerListeners();

				// Instantiate all remaining (non-lazy-init) singletons.
				//实例化所有剩余的（非延迟初始化）单例。
				finishBeanFactoryInitialization(beanFactory);

				// Last step: publish corresponding event.
				//最后一步：发布对应的事件。
				finishRefresh();
			}

			catch (BeansException ex) {
				if (logger.isWarnEnabled()) {
					logger.warn("Exception encountered during context initialization - " +
							"cancelling refresh attempt: " + ex);
				}

				// Destroy already created singletons to avoid dangling resources.
				//销毁已经创建的单例以避免资源悬空。
				destroyBeans();

				// Reset 'active' flag.
				//重置“活动”标志。
				cancelRefresh(ex);

				// Propagate exception to caller.
				//将异常传播到调用方。
				throw ex;
			}

			finally {
				// Reset common introspection caches in Spring's core, since we
				// might not ever need metadata for singleton beans anymore...
				// 重置Spring核心中的常见内省缓存，因为
				resetCommonCaches();
			}
		}
	}


###### a. 针对 org.springframework.context.support.AbstractApplicationContext#obtainFreshBeanFactory() 创建了beanFactory 

-  1.obtainFreshBeanFactory的源码如下:


		/**
		 * 构建 beanFactory 对象
		 * Tell the subclass to refresh the internal bean factory.
		 * @return the fresh BeanFactory instance
		 * @see #refreshBeanFactory()
		 * @see #getBeanFactory()
		 */
		protected ConfigurableListableBeanFactory obtainFreshBeanFactory() {
			refreshBeanFactory();// 刷新 或者创建beanFactory
			return getBeanFactory();
		}
		
	
-  2. 默认 AbstractApplicationContext#refreshBeanFactory 销毁旧的beanFactory 创建新beanFactory

		/**
		 * This implementation performs an actual refresh of this context's underlying
		 * bean factory, shutting down the previous bean factory (if any) and
		 * initializing a fresh bean factory for the next phase of the context's lifecycle.
		 */
		@Override
		protected final void refreshBeanFactory() throws BeansException {
			if (hasBeanFactory()) {
				destroyBeans();
				closeBeanFactory();
			}
			try {
				DefaultListableBeanFactory beanFactory = createBeanFactory();
				beanFactory.setSerializationId(getId());
				customizeBeanFactory(beanFactory);
				loadBeanDefinitions(beanFactory);
				synchronized (this.beanFactoryMonitor) {
					this.beanFactory = beanFactory;
				}
			}
			catch (IOException ex) {
				throw new ApplicationContextException("I/O error parsing bean definition source for " + getDisplayName(), ex);
			}
		}
	
-   3.	AbstractRefreshableApplicationContext#createBeanFactory 默认DefaultListableBeanFactory

		/**
		 * Create an internal bean factory for this context.
		 * Called for each {@link #refresh()} attempt.
		 * <p>The default implementation creates a
		 * {@link org.springframework.beans.factory.support.DefaultListableBeanFactory}
		 * with the {@linkplain #getInternalParentBeanFactory() internal bean factory} of this
		 * context's parent as parent bean factory. Can be overridden in subclasses,
		 * for example to customize DefaultListableBeanFactory's settings.
		 * @return the bean factory for this context
		 * @see org.springframework.beans.factory.support.DefaultListableBeanFactory#setAllowBeanDefinitionOverriding
		 * @see org.springframework.beans.factory.support.DefaultListableBeanFactory#setAllowEagerClassLoading
		 * @see org.springframework.beans.factory.support.DefaultListableBeanFactory#setAllowCircularReferences
		 * @see org.springframework.beans.factory.support.DefaultListableBeanFactory#setAllowRawInjectionDespiteWrapping
		 */
		protected DefaultListableBeanFactory createBeanFactory() {
			return new DefaultListableBeanFactory(getInternalParentBeanFactory());
		}


###### 2.通过org.springframework.context.support.AbstractApplicationContext#prepareBeanFactory 配置 类加载器， 前置后置处理器(用于bean初始化的过程中的生命周期)

	/**
		 * Configure the factory's standard context characteristics,
		 * such as the context's ClassLoader and post-processors.
		 * 配置工厂的标准上下文特性，例如上下文的类加载器和后处理器。
		 * @param beanFactory the BeanFactory to configure
		 */
		protected void prepareBeanFactory(ConfigurableListableBeanFactory beanFactory) {
			// Tell the internal bean factory to use the context's class loader etc.
			// 告诉内部bean工厂使用上下文的类加载器等。
			beanFactory.setBeanClassLoader(getClassLoader());
			beanFactory.setBeanExpressionResolver(new StandardBeanExpressionResolver(beanFactory.getBeanClassLoader()));
			beanFactory.addPropertyEditorRegistrar(new ResourceEditorRegistrar(this, getEnvironment()));
	
			// Configure the bean factory with context callbacks.
			// 使用上下文回调配置bean工厂。
			beanFactory.addBeanPostProcessor(new ApplicationContextAwareProcessor(this));
			beanFactory.ignoreDependencyInterface(EnvironmentAware.class);
			beanFactory.ignoreDependencyInterface(EmbeddedValueResolverAware.class);
			beanFactory.ignoreDependencyInterface(ResourceLoaderAware.class);
			beanFactory.ignoreDependencyInterface(ApplicationEventPublisherAware.class);
			beanFactory.ignoreDependencyInterface(MessageSourceAware.class);
			beanFactory.ignoreDependencyInterface(ApplicationContextAware.class);
	
			// BeanFactory interface not registered as resolvable type in a plain factory.
			// MessageSource registered (and found for autowiring) as a bean.
			// BeanFactory接口未在普通工厂中注册为可解析类型。
			// MessageSource已注册（并为自动连接找到）为bean。
	
			beanFactory.registerResolvableDependency(BeanFactory.class, beanFactory);
			beanFactory.registerResolvableDependency(ResourceLoader.class, this);
			beanFactory.registerResolvableDependency(ApplicationEventPublisher.class, this);
			beanFactory.registerResolvableDependency(ApplicationContext.class, this);
	
			// Register early post-processor for detecting inner beans as ApplicationListeners.
			// 注册早期的后处理器，以便将内部bean检测为ApplicationListeners。
			beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(this));
	
			// Detect a LoadTimeWeaver and prepare for weaving, if found.
			// 检测LoadTimeWeaver并准备编织（如果发现）。
			if (beanFactory.containsBean(LOAD_TIME_WEAVER_BEAN_NAME)) {
				beanFactory.addBeanPostProcessor(new LoadTimeWeaverAwareProcessor(beanFactory));
				// Set a temporary ClassLoader for type matching.
				beanFactory.setTempClassLoader(new ContextTypeMatchClassLoader(beanFactory.getBeanClassLoader()));
			}
	
			// Register default environment beans.
			//注册默认环境bean。
			if (!beanFactory.containsLocalBean(ENVIRONMENT_BEAN_NAME)) {
				beanFactory.registerSingleton(ENVIRONMENT_BEAN_NAME, getEnvironment());
			}
			if (!beanFactory.containsLocalBean(SYSTEM_PROPERTIES_BEAN_NAME)) {
				beanFactory.registerSingleton(SYSTEM_PROPERTIES_BEAN_NAME, getEnvironment().getSystemProperties());
			}
			if (!beanFactory.containsLocalBean(SYSTEM_ENVIRONMENT_BEAN_NAME)) {
				beanFactory.registerSingleton(SYSTEM_ENVIRONMENT_BEAN_NAME, getEnvironment().getSystemEnvironment());
			}
		}
