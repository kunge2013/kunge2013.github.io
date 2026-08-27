<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-27 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { zhPosts, enPosts, categoryLabels, enCategoryLabels } from '../../data/posts'
import type { Post } from '../../data/posts'

const { lang } = useData()

interface ArchiveGroup {
  year: string
  posts: Post[]
}

const isEn = computed(() => lang.value === 'en-US')

const allPosts = computed<Post[]>(() => {
  const source = isEn.value ? enPosts : zhPosts
  const labels = isEn.value ? enCategoryLabels : categoryLabels
  const posts: Post[] = []
  for (const [cat, list] of Object.entries(source)) {
    for (const p of list) {
      posts.push({
        ...p,
        category: labels[cat] || cat,
      })
    }
  }
  return posts.sort((a, b) => {
    if (a.sticky && !b.sticky) return -1
    if (!a.sticky && b.sticky) return 1
    return b.date.localeCompare(a.date)
  })
})

const archiveGroups = computed<ArchiveGroup[]>(() => {
  const groups: Record<string, Post[]> = {}
  for (const p of allPosts.value) {
    const year = p.date.slice(0, 4)
    if (!groups[year]) groups[year] = []
    groups[year].push(p)
  }
  return Object.entries(groups)
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => b.year.localeCompare(a.year))
})

const totalCount = computed(() => allPosts.value.length)

const emptyText = computed(() =>
  isEn.value ? 'No posts yet - write your first one!' : '暂无文章，快来写第一篇吧！'
)
</script>

<template>
  <div class="archive-container">
    <div v-if="totalCount === 0" class="empty-hint">
      {{ emptyText }}
    </div>

    <div v-else>
      <div class="archive-summary">
        <span class="summary-count">{{ totalCount }}</span>
        <span class="summary-label">{{ isEn ? 'posts in total' : '篇文章共' }}</span>
      </div>

      <div v-for="group in archiveGroups" :key="group.year" class="archive-group">
        <h2 class="archive-year">
          {{ group.year }}
          <span class="year-count">{{ group.posts.length }}</span>
        </h2>

        <ol class="archive-list">
          <li v-for="post in group.posts" :key="post.url" class="archive-row" :class="{ sticky: post.sticky }">
            <a :href="post.url" class="archive-link">
              <span v-if="post.sticky" class="pin" title="sticky">📌</span>
              <span class="post-title">{{ post.title }}</span>
              <span class="post-cat">{{ post.category }}</span>
              <time class="post-date">{{ post.date.slice(5) }}</time>
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
.archive-container {
  margin-top: 24px;
}

.empty-hint {
  text-align: center;
  padding: 48px 0;
  color: var(--vp-c-text-2);
  font-size: 15px;
  font-style: italic;
}

.archive-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 32px;
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

.archive-group {
  margin-bottom: 48px;
}

.archive-year {
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 16px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--vp-c-brand-1);
  display: inline-block;
}

.year-count {
  font-size: 14px;
  font-weight: 400;
  color: var(--vp-c-text-3);
  margin-left: 10px;
  background: var(--vp-c-bg-soft);
  padding: 2px 10px;
  border-radius: 10px;
}

.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-row {
  position: relative;
  border-bottom: 1px solid var(--vp-c-divider);
  transition: background 0.15s ease;
}

.archive-row:hover {
  background: var(--vp-c-bg-soft);
}

.archive-row.sticky {
  background: var(--vp-c-brand-soft);
}

.archive-row.sticky:hover {
  background: var(--vp-c-brand-soft);
  filter: brightness(0.97);
}

.archive-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.pin {
  font-size: 14px;
  flex-shrink: 0;
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

.archive-link:hover .post-title {
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

.archive-row:hover .post-tooltip {
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
  .archive-link {
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
