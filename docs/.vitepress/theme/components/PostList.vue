<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-27 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import { zhPosts, enPosts } from '../../data/posts'

const { lang } = useData()
const route = useRoute()

const currentCategory = computed(() => {
  const match = route.path.match(/posts\/([^/]+)/)
  return match ? match[1] : ''
})

const currentIsEn = computed(() => lang.value === 'en-US')

const allPosts = computed(() => {
  const isEn = currentIsEn.value
  const source = isEn ? enPosts : zhPosts
  const posts = source[currentCategory.value] || []

  return posts.sort((a, b) => {
    if (a.sticky && !b.sticky) return -1
    if (!a.sticky && b.sticky) return 1
    return b.date.localeCompare(a.date)
  })
})
</script>

<template>
  <div class="post-list-container">
    <div v-if="allPosts.length === 0" class="empty-hint">
      暂无文章，快来写第一篇吧！
    </div>

    <div v-for="post in allPosts" :key="post.url" class="post-row" :class="{ sticky: post.sticky }">
      <a :href="post.url" class="post-title-link">
        <span v-if="post.sticky" class="pin-icon" title="置顶">📌</span>
        <span class="post-title-text">{{ post.title }}</span>
        <span class="post-date">{{ post.date }}</span>
      </a>

      <div class="post-tooltip">
        <p class="tooltip-desc">{{ post.description }}</p>
        <div v-if="post.tags.length" class="tooltip-tags">
          <span v-for="tag in post.tags" :key="tag" class="tooltip-tag">{{ tag }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-list-container {
  margin-top: 24px;
}

.empty-hint {
  text-align: center;
  padding: 48px 0;
  color: var(--vp-c-text-2);
  font-size: 15px;
}

.post-row {
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--vp-c-divider);
  transition: background 0.15s ease;
}

.post-row:hover {
  background: var(--vp-c-bg-soft);
}

.post-row.sticky {
  background: var(--vp-c-brand-soft);
}

.post-row.sticky:hover {
  background: var(--vp-c-brand-soft);
  filter: brightness(0.97);
}

.post-row:last-child {
  border-bottom: none;
}

.post-title-link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.pin-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.post-title-text {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.post-title-link:hover .post-title-text {
  color: var(--vp-c-brand-1);
}

.post-date {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
  margin-left: auto;
  padding-left: 16px;
}

.post-tooltip {
  display: none;
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  z-index: 100;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.post-row:hover .post-tooltip {
  display: block;
}

.tooltip-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.tooltip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tooltip-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}
</style>
<!-- [AGC:END] -->
