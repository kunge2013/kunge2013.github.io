<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import { zhPosts, enPosts } from '../../data/posts'

const { lang } = useData()
const route = useRoute()

const isEn = computed(() => lang.value === 'en-US')

const currentCategory = computed(() => {
  const match = route.path.match(/posts\/([^/]+)\//)
  return match ? match[1] : ''
})

const currentUrl = computed(() => {
  const path = route.path.replace(/\.html$/, '').replace(/\/$/, '')
  return decodeURIComponent(path)
})

const sortedPosts = computed(() => {
  const source = isEn.value ? enPosts : zhPosts
  // [AGC:START] tool=Cc author=fangkun
  // 排序已在 generate-posts-data.mjs 中完成，这里直接信任数据源顺序
  return source[currentCategory.value] || []
  // [AGC:END]
})

const currentIndex = computed(() =>
  sortedPosts.value.findIndex((p) => p.url === currentUrl.value)
)

// [AGC:START] tool=Cc author=fangkun
// 日期降序：index 小 = 更新，index 大 = 更旧
// prevPost = 更新的文章（index - 1）
// nextPost = 更旧的文章（index + 1）
const prevPost = computed(() => {
  if (currentIndex.value <= 0) return null
  return sortedPosts.value[currentIndex.value - 1]
})

const nextPost = computed(() => {
  if (currentIndex.value < 0) return null
  const next = currentIndex.value + 1
  return next < sortedPosts.value.length ? sortedPosts.value[next] : null
})
// [AGC:END]

const labels = computed(() => ({
  prev: isEn.value ? 'Previous Post' : '上一篇',
  next: isEn.value ? 'Next Post' : '下一篇',
  arrow: isEn.value ? '&rarr;' : '&rarr;',
  backArrow: isEn.value ? '&larr;' : '&larr;',
}))
</script>

<template>
  <div v-if="prevPost || nextPost" class="post-nav">
    <div class="post-nav-divider"></div>
    <div class="post-nav-inner">
      <a v-if="prevPost" :href="prevPost.url" class="post-nav-card post-nav-prev">
        <span class="post-nav-label">{{ labels.prev }}</span>
        <span class="post-nav-title">
          <span class="post-nav-arrow" v-html="labels.backArrow"></span>
          {{ prevPost.title }}
        </span>
      </a>

      <a v-if="nextPost" :href="nextPost.url" class="post-nav-card post-nav-next">
        <span class="post-nav-label">{{ labels.next }}</span>
        <span class="post-nav-title">
          {{ nextPost.title }}
          <span class="post-nav-arrow" v-html="labels.arrow"></span>
        </span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.post-nav {
  margin-top: 48px;
}

.post-nav-divider {
  border-top: 1px solid var(--vp-c-divider);
  margin-bottom: 24px;
}

.post-nav-inner {
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.post-nav-inner:has(:only-child) {
  justify-content: flex-end;
}

.post-nav-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  flex: 1;
}

.post-nav-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.post-nav-prev {
  align-items: flex-start;
}

.post-nav-next {
  align-items: flex-end;
  text-align: right;
}

.post-nav-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.post-nav-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 6px;
}

.post-nav-next .post-nav-title {
  flex-direction: row-reverse;
}

.post-nav-card:hover .post-nav-title {
  color: var(--vp-c-brand-1);
}

.post-nav-arrow {
  font-size: 14px;
  color: var(--vp-c-text-3);
}

@media (max-width: 640px) {
  .post-nav-inner {
    flex-direction: column;
  }

  .post-nav-inner:has(:only-child) {
    justify-content: flex-end;
  }

  .post-nav-next {
    align-items: flex-start;
    text-align: left;
  }

  .post-nav-next .post-nav-title {
    flex-direction: row;
  }
}
</style>
<!-- [AGC:END] -->
