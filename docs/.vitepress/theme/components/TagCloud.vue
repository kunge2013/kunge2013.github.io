<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-27 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useData } from 'vitepress'
import { zhPosts, enPosts, categoryLabels, enCategoryLabels } from '../../data/posts'
import type { Post } from '../../data/posts'

const { lang } = useData()
const activeTag = ref<string>('')

const isEn = computed(() => lang.value === 'en-US')

interface PostWithCategory extends Post {
  category: string
}

const allPosts = computed<PostWithCategory[]>(() => {
  const source = isEn.value ? enPosts : zhPosts
  const labels = isEn.value ? enCategoryLabels : categoryLabels
  const posts: PostWithCategory[] = []
  for (const [cat, list] of Object.entries(source)) {
    for (const p of list) {
      posts.push({
        ...p,
        category: labels[cat] || cat,
      })
    }
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date))
})

interface TagInfo {
  name: string
  count: number
}

const tags = computed<TagInfo[]>(() => {
  const counts: Record<string, number> = {}
  for (const p of allPosts.value) {
    if (!p.tags) continue
    for (const t of p.tags) {
      counts[t] = (counts[t] || 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

const filteredPosts = computed<PostWithCategory[]>(() => {
  if (!activeTag.value) return allPosts.value
  return allPosts.value.filter((p) => p.tags && p.tags.includes(activeTag.value))
})

function selectTag(tag: string) {
  activeTag.value = activeTag.value === tag ? '' : tag
}

const emptyText = computed(() =>
  isEn.value ? 'No posts yet - write your first one!' : '暂无文章，快来写第一篇吧！'
)

const noTagEmpty = computed(() =>
  isEn.value ? 'No posts with this tag' : '该标签下暂无文章'
)
</script>

<template>
  <div class="tag-container">
    <div v-if="allPosts.length === 0" class="empty-hint">
      {{ emptyText }}
    </div>

    <div v-else>
      <div class="tag-summary">
        <span class="summary-count">{{ tags.length }}</span>
        <span class="summary-label">{{ isEn ? 'tags in total' : '个标签共' }}</span>
      </div>

      <div class="tag-cloud">
        <button
          class="tag-chip"
          :class="{ active: activeTag === '' }"
          type="button"
          @click="activeTag = ''"
        >
          {{ isEn ? 'All' : '全部' }}
          <span class="chip-count">{{ allPosts.length }}</span>
        </button>
        <button
          v-for="tag in tags"
          :key="tag.name"
          class="tag-chip"
          :class="{ active: activeTag === tag.name }"
          type="button"
          @click="selectTag(tag.name)"
        >
          {{ tag.name }}
          <span class="chip-count">{{ tag.count }}</span>
        </button>
      </div>

      <div v-if="filteredPosts.length === 0" class="empty-hint">
        {{ noTagEmpty }}
      </div>

      <div v-else class="filtered-list">
        <h3 v-if="activeTag" class="filter-title">
          {{ isEn ? `Posts tagged with "${activeTag}"` : `标签「${activeTag}」下的文章` }}
          <span class="filter-count">{{ filteredPosts.length }}</span>
        </h3>

        <ol class="tag-list">
          <li v-for="post in filteredPosts" :key="post.url" class="tag-row">
            <a :href="post.url" class="tag-link">
              <span class="post-title">{{ post.title }}</span>
              <span class="post-cat">{{ post.category }}</span>
              <time class="post-date">{{ post.date }}</time>
            </a>

            <div class="post-tooltip">
              <p class="tooltip-desc">{{ post.description }}</p>
              <div v-if="post.tags && post.tags.length" class="tooltip-tags">
                <span v-for="tag in post.tags" :key="tag" class="tooltip-tag">{{ tag }}</span>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tag-container {
  margin-top: 24px;
}

.empty-hint {
  text-align: center;
  padding: 48px 0;
  color: var(--vp-c-text-2);
  font-size: 15px;
  font-style: italic;
}

.tag-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border-left: 4px solid var(--vp-c-brand-1);
}

.summary-count {
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  font-variant-numeric: tabular-nums;
}

.summary-label {
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 40px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.tag-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.tag-chip.active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

.chip-count {
  font-size: 12px;
  padding: 1px 7px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

.tag-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.filter-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 16px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-count {
  font-size: 13px;
  font-weight: 400;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  padding: 2px 10px;
  border-radius: 10px;
}

.tag-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tag-row {
  position: relative;
  border-bottom: 1px solid var(--vp-c-divider);
  transition: background 0.15s ease;
}

.tag-row:hover {
  background: var(--vp-c-bg-soft);
}

.tag-row:last-child {
  border-bottom: none;
}

.tag-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.post-title {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.tag-link:hover .post-title {
  color: var(--vp-c-brand-1);
}

.post-cat {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.post-date {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
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

.tag-row:hover .post-tooltip {
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

@media (max-width: 768px) {
  .tag-link {
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
  }

  .post-title {
    width: 100%;
    flex: none;
  }

  .post-cat,
  .post-date {
    margin-left: 0;
    padding-left: 0;
  }

  .post-date {
    margin-left: auto;
  }
}
</style>
<!-- [AGC:END] -->
