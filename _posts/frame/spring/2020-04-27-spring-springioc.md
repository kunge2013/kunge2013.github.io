---
layout: post
title:  "spring ioc的源码分析之 bean 的创建"
date:   2020-04-27 00:06:05
categories: spring
tags: spring 源码
---

#### spring ioc的源码分析

##### 1.通过ClassPathXmlApplicationContext 创建Bean 对象的过程
	
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
	
-  2.初始化配置文件路径

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

-  3.解析并处理文件
	
			@Override
				public void refresh() throws BeansException, IllegalStateException {
					synchronized (this.startupShutdownMonitor) {
						// Prepare this context for refreshing.
						prepareRefresh();
			
						// Tell the subclass to refresh the internal bean factory.
						ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();
			
						// Prepare the bean factory for use in this context.
						prepareBeanFactory(beanFactory);
			
						try {
							// Allows post-processing of the bean factory in context subclasses.
							postProcessBeanFactory(beanFactory);
			
							// Invoke factory processors registered as beans in the context.
							invokeBeanFactoryPostProcessors(beanFactory);
			
							// Register bean processors that intercept bean creation.
							registerBeanPostProcessors(beanFactory);
			
							// Initialize message source for this context.
							initMessageSource();
			
							// Initialize event multicaster for this context.
							initApplicationEventMulticaster();
			
							// Initialize other special beans in specific context subclasses.
							onRefresh();
			
							// Check for listener beans and register them.
							registerListeners();
			
							// Instantiate all remaining (non-lazy-init) singletons.
							finishBeanFactoryInitialization(beanFactory);
			
							// Last step: publish corresponding event.
							finishRefresh();
						}
			
						catch (BeansException ex) {
							if (logger.isWarnEnabled()) {
								logger.warn("Exception encountered during context initialization - " +
										"cancelling refresh attempt: " + ex);
							}
			
							// Destroy already created singletons to avoid dangling resources.
							destroyBeans();
			
							// Reset 'active' flag.
							cancelRefresh(ex);
			
							// Propagate exception to caller.
							throw ex;
						}
			
						finally {
							// Reset common introspection caches in Spring's core, since we
							// might not ever need metadata for singleton beans anymore...
							resetCommonCaches();
						}
					}
				}


