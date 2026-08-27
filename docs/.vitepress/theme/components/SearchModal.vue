<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-27 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { zhPosts, enPosts, categoryLabels } from '../../data/posts'
import type { Post } from '../../data/posts'

interface SearchItem {
  title: string
  date: string
  description: string
  url: string
  tags: string[]
  category: string
  categoryLabel: string
}

const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const allItems = computed<SearchItem[]>(() => {
  const items: SearchItem[] = []
  for (const [cat, posts] of Object.entries(zhPosts)) {
    for (const p of posts) {
      items.push({ ...p, category: cat, categoryLabel: categoryLabels[cat] || cat })
    }
  }
  for (const [cat, posts] of Object.entries(enPosts)) {
    for (const p of posts) {
      items.push({ ...p, category: cat, categoryLabel: categoryLabels[cat] || cat })
    }
  }
  return items
})

const filteredItems = computed<SearchItem[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return allItems.value.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q)) ||
      item.categoryLabel.toLowerCase().includes(q)
  )
})

function openModal() {
  isOpen.value = true
  query.value = ''
  activeIndex.value = 0
  nextTick(() => inputRef.value?.focus())
}

function closeModal() {
  isOpen.value = false
  query.value = ''
}

function highlightText(text: string, q: string): string {
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  return text.replace(re, '<mark>$1</mark>')
}

function navigateTo(url: string) {
  closeModal()
  window.location.href = url
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    openModal()
    return
  }
  if (!isOpen.value) return

  if (e.key === 'Escape') {
    closeModal()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, filteredItems.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filteredItems.value[activeIndex.value]
    if (item) navigateTo(item.url)
  }
}

function onInput() {
  activeIndex.value = 0
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <button
    class="search-btn"
    type="button"
    aria-label="搜索"
    @click="openModal"
  >
    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <span class="search-btn-label">搜索</span>
    <kbd class="search-kbd">⌘K</kbd>
  </button>

  <Transition name="fade">
    <div v-if="isOpen" class="search-overlay" @click.self="closeModal">
      <div class="search-modal">
        <!-- Header -->
        <div class="search-header">
          <svg class="search-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            class="search-input"
            type="text"
            placeholder="搜索文章标题、描述或标签..."
            autocomplete="off"
            spellcheck="false"
            @input="onInput"
          />
          <button
            v-if="query"
            class="search-clear"
            type="button"
            aria-label="清除"
            @click="query = ''; activeIndex = 0"
          >
            ✕
          </button>
          <button class="search-close" type="button" aria-label="关闭" @click="closeModal">
            Esc
          </button>
        </div>

        <!-- Results -->
        <div class="search-body">
          <div v-if="!query" class="search-empty">
            输入关键词开始搜索
          </div>
          <div v-else-if="filteredItems.length === 0" class="search-empty">
            未找到与 "{{ query }}" 相关的结果
          </div>
          <div v-else class="search-results">
            <div
              v-for="(item, idx) in filteredItems"
              :key="item.url"
              class="search-item"
              :class="{ active: idx === activeIndex }"
              @click="navigateTo(item.url)"
              @mouseenter="activeIndex = idx"
            >
              <div class="search-item-main">
                <div class="search-item-title" v-html="highlightText(item.title, query)" />
                <div class="search-item-desc" v-html="highlightText(item.description, query)" />
              </div>
              <div class="search-item-meta">
                <span class="search-item-cat">{{ item.categoryLabel }}</span>
                <span class="search-item-date">{{ item.date }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="search-footer">
          <span class="search-footer-item"><kbd>↑↓</kbd> 切换</span>
          <span class="search-footer-item"><kbd>↵</kbd> 选择</span>
          <span class="search-footer-item"><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ---- Search Button ---- */

.search-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.search-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.search-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.search-btn-label {
  display: inline;
}

.search-kbd {
  margin-left: 4px;
  padding: 2px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
}

@media (max-width: 768px) {
  .search-btn-label,
  .search-kbd {
    display: none;
  }

  .search-btn {
    padding: 6px 8px;
  }
}

/* ---- Overlay ---- */

.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

/* ---- Modal ---- */

.search-modal {
  width: 90%;
  max-width: 640px;
  max-height: 70vh;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---- Header ---- */

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.search-header-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--vp-c-text-3);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: var(--vp-c-text-1);
}

.search-input::placeholder {
  color: var(--vp-c-text-3);
}

.search-clear {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.search-clear:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.search-close {
  padding: 2px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.search-close:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

/* ---- Body ---- */

.search-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.search-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 14px;
}

/* ---- Results ---- */

.search-results {
  display: flex;
  flex-direction: column;
}

.search-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}

.search-item:hover,
.search-item.active {
  background: var(--vp-c-bg-soft);
  border-left-color: var(--vp-c-brand-1);
}

.search-item-main {
  flex: 1;
  min-width: 0;
}

.search-item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.4;
  margin-bottom: 4px;
}

.search-item-title :deep(mark) {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 0 2px;
  border-radius: 2px;
}

.search-item-desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-item-desc :deep(mark) {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 0 2px;
  border-radius: 2px;
}

.search-item-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.search-item-cat {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  white-space: nowrap;
}

.search-item-date {
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ---- Footer ---- */

.search-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.search-footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-footer-item kbd {
  padding: 1px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  background: var(--vp-c-bg-soft);
}

/* ---- Transitions ---- */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .search-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.fade-leave-active .search-modal {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.fade-enter-from .search-modal,
.fade-leave-to .search-modal {
  transform: translateY(-16px);
  opacity: 0;
}
</style>
<!-- [AGC:END] -->
