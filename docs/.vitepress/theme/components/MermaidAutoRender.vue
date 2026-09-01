<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-09-01 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<template>
  <div v-show="false"></div>
  <!-- 全屏查看 Modal -->
  <div v-if="showFullscreen" class="mermaid-fullscreen" @click.self="closeFullscreen">
    <!-- 关闭按钮 -->
    <button class="mermaid-close-btn" @click="closeFullscreen" title="关闭 (ESC)">✕</button>
    <!-- 图表内容 -->
    <div class="mermaid-fullscreen-content" @wheel.prevent="handleWheel" @mousedown="startDrag" @mousemove="onDrag" @mouseup="endDrag" @mouseleave="endDrag">
      <div class="mermaid-fullscreen-diagram" :style="fsDiagramStyle" v-html="fullscreenSvg"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import mermaid from 'mermaid'

const MERMAID_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  themeVariables: { fontFamily: MERMAID_FONT },
  flowchart: { htmlLabels: true, useMaxWidth: false, padding: 20, nodeSpacing: 30, rankSpacing: 50, curve: 'basis' },
  sequence: { useMaxWidth: false },
  gantt: { useMaxWidth: false },
})

const route = useRoute()
let counter = 0

// Fullscreen Modal 状态
const showFullscreen = ref(false)
const fullscreenSvg = ref('')
const fsZoom = ref(1)
const fsPanX = ref(0)
const fsPanY = ref(0)
const fsDragging = ref(false)
const fsDragStartX = ref(0)
const fsDragStartY = ref(0)

const fsDiagramStyle = computed(() => ({
  transform: `translate(${fsPanX.value}px, ${fsPanY.value}px) scale(${fsZoom.value})`,
  transformOrigin: 'center center',
  transition: fsDragging.value ? 'none' : 'transform 0.15s ease',
}))

function closeFullscreen() {
  showFullscreen.value = false
  resetFsZoom()
}

function resetFsZoom() {
  fsZoom.value = 1
  fsPanX.value = 0
  fsPanY.value = 0
}

function openFullscreen(svg: string) {
  fullscreenSvg.value = svg
  resetFsZoom()
  showFullscreen.value = true
  setTimeout(() => {
    const el = document.querySelector('.mermaid-fullscreen-diagram svg')
    if (el) el.removeAttribute('style')
  }, 50)
}

function handleWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.08 : 0.08
  fsZoom.value = Math.max(0.15, Math.min(3, fsZoom.value + delta))
}

function startDrag(e: MouseEvent) {
  fsDragging.value = true
  fsDragStartX.value = e.clientX - fsPanX.value
  fsDragStartY.value = e.clientY - fsPanY.value
}

function onDrag(e: MouseEvent) {
  if (!fsDragging.value) return
  fsPanX.value = e.clientX - fsDragStartX.value
  fsPanY.value = e.clientY - fsDragStartY.value
}

function endDrag() { fsDragging.value = false }

async function renderDiagrams() {
  const blocks = document.querySelectorAll('pre.mermaid')
  for (const block of blocks) {
    if (block.dataset.rendered) continue
    block.dataset.rendered = 'true'

    const code = block.textContent || ''
    const id = `mermaid-${++counter}`

    try {
      const { svg } = await mermaid.render(id, code)

      const container = document.createElement('div')
      container.className = 'mermaid-container'

      // 工具栏
      const toolbar = document.createElement('div')
      toolbar.className = 'mermaid-toolbar'

      const tabs = document.createElement('div')
      tabs.className = 'mermaid-tabs'
      const tabChart = document.createElement('button')
      tabChart.className = 'mermaid-tab active'
      tabChart.textContent = '图表'
      const tabCode = document.createElement('button')
      tabCode.className = 'mermaid-tab'
      tabCode.textContent = '代码'
      tabs.appendChild(tabChart)
      tabs.appendChild(tabCode)

      const actions = document.createElement('div')
      actions.className = 'mermaid-actions'

      // 复制按钮（代码模式显示）
      const btnCopy = document.createElement('button')
      btnCopy.className = 'mermaid-action-btn'
      btnCopy.textContent = '📋 复制'
      btnCopy.style.display = 'none' // 初始隐藏，代码模式显示
      btnCopy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code)
          btnCopy.textContent = '✅ 已复制'
          setTimeout(() => { btnCopy.textContent = '📋 复制' }, 1500)
        } catch {
          /* clipboard not available */
        }
      })

      const btnZoom = document.createElement('button')
      btnZoom.className = 'mermaid-action-btn'
      btnZoom.textContent = '⤢ 全屏'

      const btnDownload = document.createElement('button')
      btnDownload.className = 'mermaid-action-btn'
      btnDownload.textContent = '⬇ 下载'

      actions.appendChild(btnCopy)
      actions.appendChild(btnZoom)
      actions.appendChild(btnDownload)

      toolbar.appendChild(tabs)
      toolbar.appendChild(actions)

      // 图表视图
      const chartView = document.createElement('div')
      chartView.className = 'mermaid-chart-view'
      chartView.innerHTML = svg
      const svgEl = chartView.querySelector('svg')
      if (svgEl) {
        svgEl.style.maxWidth = '100%'
        svgEl.style.height = 'auto'
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')
      }

      // 代码视图
      const codeView = document.createElement('div')
      codeView.className = 'mermaid-code-view'
      codeView.style.display = 'none'
      const pre = document.createElement('pre')
      pre.className = 'mermaid-code-block'
      const codeEl = document.createElement('code')
      codeEl.textContent = code
      pre.appendChild(codeEl)
      codeView.appendChild(pre)

      // 事件：标签切换
      tabChart.addEventListener('click', () => {
        tabChart.classList.add('active')
        tabCode.classList.remove('active')
        chartView.style.display = ''
        codeView.style.display = 'none'
        btnCopy.style.display = 'none'
        btnZoom.style.display = ''
      })
      tabCode.addEventListener('click', () => {
        tabCode.classList.add('active')
        tabChart.classList.remove('active')
        chartView.style.display = 'none'
        codeView.style.display = ''
        btnCopy.style.display = ''
        btnZoom.style.display = 'none'
      })

      // 事件：放大（全屏）
      btnZoom.addEventListener('click', () => openFullscreen(svg))

      // 事件：下载
      btnDownload.addEventListener('click', () => {
        // SVG 是严格的 XML，HTML 标签必须自闭合
        const cleanSvg = svg
          .replace(/<br\s*>/gi, '<br/>')
          .replace(/<hr\s*>/gi, '<hr/>')
          .replace(/<img\s([^>]*?)(?<!\/)>/gi, '<img $1/>')
          .replace(/<input\s([^>]*?)(?<!\/)>/gi, '<input $1/>')
        const blob = new Blob([cleanSvg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'mermaid-diagram.svg'
        a.click()
        URL.revokeObjectURL(url)
      })

      container.appendChild(toolbar)
      container.appendChild(chartView)
      container.appendChild(codeView)
      block.replaceWith(container)
    } catch (e) {
      console.error('Mermaid render error:', e)
    }
  }
}

onMounted(() => {
  setTimeout(renderDiagrams, 100)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && showFullscreen.value) closeFullscreen()
  })
})

watch(() => route.path, () => {
  setTimeout(renderDiagrams, 200)
})
</script>

<style>
/* ---- Mermaid 容器 ---- */

.mermaid-container {
  margin: 1.5em 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  background: var(--vp-c-bg);
  transition: border-color 0.2s;
}

.mermaid-container:hover {
  border-color: var(--vp-c-brand-1);
}

/* ---- 工具栏 ---- */

.mermaid-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.mermaid-tabs {
  display: flex;
  gap: 2px;
}

.mermaid-tab {
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.mermaid-tab:hover {
  color: var(--vp-c-text-1);
}

.mermaid-tab.active {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.mermaid-actions {
  display: flex;
  gap: 6px;
}

.mermaid-action-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  font-size: 11px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.mermaid-action-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

/* ---- 图表视图 ---- */

.mermaid-chart-view {
  padding: 20px;
  overflow-x: auto;
  display: flex;
  justify-content: center;
  cursor: zoom-in;
  min-height: 120px;
}

.mermaid-chart-view svg {
  max-width: 100%;
  height: auto;
}

/* ---- 代码视图 ---- */

.mermaid-code-view {
  padding: 16px 20px;
  overflow-x: auto;
  background: var(--vp-code-bg);
}

.mermaid-code-block {
  margin: 0;
  padding: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  background: transparent;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}

/* ---- 全屏 Modal ---- */

.mermaid-fullscreen {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f3ff;
  animation: mFadeIn 0.2s ease;
}

@keyframes mFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mermaid-fullscreen-content {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.mermaid-fullscreen-content:active {
  cursor: grabbing;
}

.mermaid-fullscreen-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100%;
  min-height: 100%;
  padding: 60px;
}

.mermaid-fullscreen-diagram svg {
  display: block;
  max-width: none;
  height: auto;
}

/* 关闭按钮 */
.mermaid-close-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.08);
  color: #333;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10000;
}

.mermaid-close-btn:hover {
  background: rgba(0,0,0,0.15);
  transform: scale(1.1);
}

.dark .mermaid-chart-view { cursor: zoom-in; }
</style>
<!-- [AGC:END] -->
