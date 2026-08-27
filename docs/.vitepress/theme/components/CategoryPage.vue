<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-27 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { zhPosts, enPosts, categoryLabels } from '../../data/posts'

interface CategoryInfo {
  id: string
  name: string
  posts: any[]
}

const allCategoryIds = new Set([
  ...Object.keys(zhPosts),
  ...Object.keys(enPosts),
])

const categories: CategoryInfo[] = [...allCategoryIds].map((id) => ({
  id,
  name: categoryLabels[id] || id,
  posts: [
    ...(zhPosts[id] || []),
    ...(enPosts[id] || []),
  ].sort((a, b) => b.date.localeCompare(a.date)),
}))

const activeFilter = ref<string>('all')
const filteredCategories = computed(() => {
  if (activeFilter.value === 'all') return categories
  return categories.filter((c) => c.id === activeFilter.value)
})

const totalPosts = computed(() =>
  categories.reduce((sum, c) => sum + c.posts.length, 0)
)

function scrollToCategory(id: string) {
  activeFilter.value = id
  nextTick(() => {
    const el = document.getElementById(`cate-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
</script>

<template>
  <div class="category-page">
    <div class="cate-filter">
      <button
        class="cate-chip"
        :class="{ active: activeFilter === 'all' }"
        type="button"
        @click="activeFilter = 'all'"
      >
        全部 <span class="n">{{ totalPosts }}</span>
      </button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="cate-chip"
        :class="{ active: activeFilter === cat.id }"
        type="button"
        @click="scrollToCategory(cat.id)"
      >
        {{ cat.name }} <span class="n">{{ cat.posts.length }}</span>
      </button>
    </div>

    <div
      v-for="cat in filteredCategories"
      :key="cat.id"
      class="cate-block"
      :id="`cate-${cat.id}`"
      :data-cate="cat.id"
    >
      <h3 class="cate-name" :id="cat.id">
        {{ cat.name }}
        <span class="count">{{ cat.posts.length }} 篇</span>
      </h3>

      <ol v-if="cat.posts.length" class="cate-list">
        <li v-for="post in cat.posts" :key="post.url">
          <a :href="post.url">
            {{ post.title }}
          </a>
          <span class="d">{{ post.date }}</span>
        </li>
      </ol>

      <div v-else class="cate-empty">暂无文章，快来写第一篇吧！</div>
    </div>
  </div>
</template>

<style scoped>
.category-page {
  margin-top: 24px;
}

.cate-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.cate-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.cate-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.cate-chip.active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

.cate-chip .n {
  font-size: 12px;
  opacity: 0.7;
}

.cate-block {
  margin-bottom: 40px;
}

.cate-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 16px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--vp-c-brand-1);
  display: inline-block;
}

.cate-name .count {
  font-size: 14px;
  font-weight: 400;
  color: var(--vp-c-text-3);
  margin-left: 8px;
}

.cate-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.cate-list li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 12px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 16px;
}

.cate-list li:last-child {
  border-bottom: none;
}

.cate-list li a {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 0.15s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cate-list li a:hover {
  color: var(--vp-c-brand-1);
}

.cate-list li .d {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

.cate-empty {
  padding: 24px 0;
  color: var(--vp-c-text-3);
  font-size: 14px;
  font-style: italic;
}

@media (max-width: 768px) {
  .cate-filter {
    gap: 8px;
  }

  .cate-chip {
    padding: 5px 12px;
    font-size: 13px;
  }

  .cate-list li {
    flex-direction: column;
    gap: 4px;
  }

  .cate-list li .d {
    font-size: 12px;
  }
}
</style>
<!-- [AGC:END] -->
