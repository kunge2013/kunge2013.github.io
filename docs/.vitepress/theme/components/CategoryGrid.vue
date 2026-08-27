<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-27 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<script setup lang="ts">
import { computed } from 'vue'
import { zhPosts, enPosts, categoryLabels } from '../../data/posts'

interface CategoryStyle {
  tag: string
  desc: string
  color: string
  icon: string
}

const styleConfig: Record<string, CategoryStyle> = {
  javascript: { tag: '编程语言', desc: 'ES2026+、异步编程、Promise、async/await、模块化', color: '#f0db4f', icon: '🟨' },
  typescript: { tag: '编程语言', desc: '类型系统、泛型、工程实践、类型体操', color: '#3178c6', icon: '🟦' },
  python: { tag: '编程语言', desc: '语法技巧、数据处理、自动化脚本、爬虫', color: '#3776ab', icon: '🐍' },
  react: { tag: '前端框架', desc: 'Hooks、状态管理、性能优化、生态工具', color: '#61dafb', icon: '️' },
  vue: { tag: '前端框架', desc: '组合式 API、响应式原理、Vue 生态、VitePress', color: '#42b883', icon: '' },
  spring: { tag: '后端框架', desc: 'Spring Boot、IoC、AOP、微服务架构', color: '#6db33f', icon: '🌱' },
  'system-design': { tag: '架构设计', desc: '分布式系统、高可用、CAP 定理、微服务', color: '#e95420', icon: '🏗️' },
  'design-patterns': { tag: '架构设计', desc: 'GoF 23 种模式、SOLID 原则、实战应用', color: '#9b59b6', icon: '' },
  testing: { tag: '测试', desc: '测试分类、测试文章、自动扫描系统验证', color: '#ff9800', icon: '🧪' },
}

const categories = computed(() => {
  const allIds = new Set([
    ...Object.keys(zhPosts),
    ...Object.keys(enPosts),
  ])

  return [...allIds].map((id) => {
    const style = styleConfig[id] || {
      tag: '技术',
      desc: '',
      color: '#6c757d',
      icon: '📁',
    }
    const count = (zhPosts[id] || []).length + (enPosts[id] || []).length
    const meta = count > 0 ? `${count} 篇文章` : '暂无文章'

    return {
      id,
      name: categoryLabels[id] || id,
      url: `/posts/${id}/`,
      ...style,
      meta,
    }
  })
})
</script>

<template>
  <div class="category-section">
    <div class="sec-head">
      <div>
        <h2 class="sec-title">技术分类</h2>
        <p class="sec-sub">探索不同领域的技术文章</p>
      </div>
    </div>

    <ul class="card-grid">
      <li v-for="cat in categories" :key="cat.id">
        <a class="card" :href="cat.url" :style="{ '--card-color': cat.color }">
          <div class="card-media">
            <div class="card-icon">{{ cat.icon }}</div>
          </div>
          <div class="card-body">
            <span class="tag">{{ cat.tag }}</span>
            <h3>{{ cat.name }}</h3>
            <p>{{ cat.desc }}</p>
            <div class="meta">{{ cat.meta }}</div>
          </div>
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.category-section {
  margin: 48px 0;
}

.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--vp-c-divider);
}

.sec-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
}

.sec-sub {
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin: 0;
}

.card-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.card-grid li {
  margin: 0;
}

.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  border-color: var(--card-color, var(--vp-c-brand-1));
}

.card-media {
  height: 140px;
  background: linear-gradient(135deg, var(--card-color, var(--vp-c-brand-1)) 0%, color-mix(in srgb, var(--card-color, var(--vp-c-brand-1)) 70%, #000) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.card-media::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
}

.card-icon {
  font-size: 48px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.card-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-body .tag {
  display: inline-block;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  margin-bottom: 12px;
  width: fit-content;
  font-weight: 500;
}

.card-body h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: var(--vp-c-text-1);
  line-height: 1.4;
  transition: color 0.2s;
}

.card:hover .card-body h3 {
  color: var(--card-color, var(--vp-c-brand-1));
}

.card-body p {
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0 0 16px 0;
  flex: 1;
}

.card-body .meta {
  font-size: 12px;
  color: var(--vp-c-text-3);
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-body .meta::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--card-color, var(--vp-c-brand-1));
  display: inline-block;
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .sec-title {
    font-size: 24px;
  }
}

.card:active {
  transform: translateY(-2px) scale(0.98);
}
</style>
<!-- [AGC:END] -->
