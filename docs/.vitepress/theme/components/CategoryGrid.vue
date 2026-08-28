<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-27 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { zhPosts, enPosts, categoryLabels, categoryStyles } from '../../data/posts'

const { lang } = useData()

interface CategoryStyle {
  tag: string
  desc: string
  color: string
  icon: string
}

const styleConfig: Record<string, CategoryStyle> = categoryStyles

const isEn = computed(() => lang.value === 'en-US')

const categories = computed(() => {
  const allIds = new Set([
    ...Object.keys(zhPosts),
    ...Object.keys(enPosts),
  ])

  return [...allIds].map((id) => {
    const style = styleConfig[id] || {
      tag: '技术',
      desc: '',
      color: '#1a1a1a',
      icon: '',
    }
    const count = isEn.value
      ? (enPosts[id] || []).length
      : (zhPosts[id] || []).length
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
        <a class="card" :href="cat.url">
          <div class="card-media">
            <div class="card-icon-text">{{ cat.icon }}</div>
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
  font-family: var(--vp-font-family-serif);
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
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--vp-c-text-3);
}

.card-media {
  height: 120px;
  background: var(--vp-c-bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.card-icon-text {
  font-size: 32px;
  font-weight: 700;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-serif);
  letter-spacing: 0.05em;
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
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
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
  font-family: var(--vp-font-family-serif);
}

.card:hover .card-body h3 {
  color: var(--vp-c-brand-1);
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
  background: var(--vp-c-brand-1);
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
