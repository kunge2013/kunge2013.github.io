<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-09-01 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<template>
  <div v-show="false"></div>
  <!-- 全屏查看 Modal -->
  <div v-if="showFullscreen" class="mermaid-fullscreen" @click.self="closeFullscreen">
    <div class="mermaid-fullscreen-content">
      <div class="mermaid-fullscreen-toolbar">
        <div class="mermaid-fullscreen-tabs">
          <button class="mermaid-tab" :class="{ active: fullscreenMode === 'chart' }" @click="fullscreenMode = 'chart'">图表</button>
          <button class="mermaid-tab" :class="{ active: fullscreenMode === 'code' }" @click="fullscreenMode = 'code'">代码</button>
        </div>
        <div class="mermaid-fullscreen-actions">
          <button class="mermaid-action-btn" @click="copyCode" title="复制">📋 复制</button>
          <button class="mermaid-action-btn" @click="downloadSvg" title="下载">⬇ 下载</button>
          <button class="mermaid-action-btn" @click="closeFullscreen" title="退出全屏">✕ 关闭</button>
        </div>
      </div>
      <div class="mermaid-fullscreen-body">
        <div v-if="fullscreenMode === 'chart'" class="mermaid-fullscreen-chart" ref="fsBody" @wheel.prevent="handleWheel" @mousedown="startDrag" @mousemove="onDrag" @mouseup="endDrag" @mouseleave="endDrag">
          <div class="mermaid-fullscreen-diagram" :style="fsDiagramStyle" v-html="fullscreenSvg"></div>
        </div>
        <div v-else class="mermaid-fullscreen-code-wrap">
          <pre class="mermaid-fullscreen-code"><code v-html="highlightedCode"></code></pre>
        </div>
      </div>
      <div class="mermaid-fullscreen-hint">
        <span v-if="fullscreenMode === 'chart'">🖱️ 滚轮缩放 ·  拖拽移动</span>
        <span v-else>📋 点击复制按钮可复制源码</span>
        <span style="margin-left:auto">当前缩放: {{ Math.round(fsZoom * 100) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
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
const fullscreenCode = ref('')
const fullscreenMode = ref<'chart' | 'code'>('chart')
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

const highlightedCode = computed(() => {
  return escapeHtml(fullscreenCode.value)
    .replace(/^(\s*flowchart\s+.*)$/gm, '<span class="mc-keyword">$1</span>')
    .replace(/^(\s*subgraph\s+.*)$/gm, '<span class="mc-keyword">$1</span>')
    .replace(/^(\s*end)$/gm, '<span class="mc-keyword">$1</span>')
    .replace(/(style\s+\w+\s+fill:[^,]*,stroke:[^\s]*)/g, '<span class="mc-style">$1</span>')
    .replace(/\|([^|]+)\|/g, '<span class="mc-label">|$1|</span>')
    .replace(/"([^"]+)"/g, '<span class="mc-string">"$1"</span>')
    .replace(/(style\s+\w+\s+)/g, '<span class="mc-keyword">$1</span>')
})

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function closeFullscreen() {
  showFullscreen.value = false
  resetFsZoom()
}

function resetFsZoom() {
  fsZoom.value = 1
  fsPanX.value = 0
  fsPanY.value = 0
}

function openFullscreen(svg: string, code: string) {
  fullscreenSvg.value = svg
  fullscreenCode.value = code
  fullscreenMode.value = 'chart'
  resetFsZoom()
  showFullscreen.value = true
  setTimeout(() => {
    const el = document.querySelector('.mermaid-fullscreen-diagram svg')
    if (el) el.removeAttribute('style')
  }, 50)
}

function handleWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.08 : 0.08
  fsZoom.value = Math.max(0.15, Math.min(5, fsZoom.value + delta))
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

async function copyCode() {
  try {
    await navigator.clipboard.writeText(fullscreenCode.value)
    const btn = document.querySelector('.mermaid-action-btn')
    if (btn) {
      const orig = btn.textContent
      btn.textContent = '✅ 已复制'
      setTimeout(() => { btn.textContent = orig }, 1500)
    }
  } catch {
    /* clipboard not available */
  }
}

function downloadSvg() {
  const blob = new Blob([fullscreenSvg.value], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mermaid-diagram.svg`
  a.click()
  URL.revokeObjectURL(url)
}

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

      const btnZoom = document.createElement('button')
      btnZoom.className = 'mermaid-action-btn'
      btnZoom.textContent = '🔍 放大'
      const btnDownload = document.createElement('button')
      btnDownload.className = 'mermaid-action-btn'
      btnDownload.textContent = '⬇ 下载'
      const btnFull = document.createElement('button')
      btnFull.className = 'mermaid-action-btn'
      btnFull.textContent = '⤢ 全屏'

      actions.appendChild(btnZoom)
      actions.appendChild(btnDownload)
      actions.appendChild(btnFull)

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
      })
      tabCode.addEventListener('click', () => {
        tabCode.classList.add('active')
        tabChart.classList.remove('active')
        chartView.style.display = 'none'
        codeView.style.display = ''
      })

      // 事件：放大
      btnZoom.addEventListener('click', () => openFullscreen(svg, code))

      // 事件：下载
      btnDownload.addEventListener('click', () => {
        const blob = new Blob([svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'mermaid-diagram.svg'
        a.click()
        URL.revokeObjectURL(url)
      })

      // 事件：全屏
      btnFull.addEventListener('click', () => openFullscreen(svg, code))

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
  padding: 5px 14px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
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
  gap: 4px;
  padding: 5px 12px;
  font-size: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
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

.mc-keyword { color: #c2185b; font-weight: 600; }
.mc-label { color: #1565c0; }
.mc-string { color: #2e7d32; }
.mc-style { color: #e65100; }

/* ---- 全屏 Modal ---- */

.mermaid-fullscreen {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  animation: mFadeIn 0.2s ease;
}

@keyframes mFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mermaid-fullscreen-content {
  position: relative;
  width: 92vw;
  height: 92vh;
  max-width: 1400px;
  background: var(--vp-c-bg);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: mSlideUp 0.25s ease;
}

@keyframes mSlideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.mermaid-fullscreen-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.mermaid-fullscreen-actions {
  display: flex;
  gap: 6px;
}

.mermaid-fullscreen-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.mermaid-fullscreen-chart {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: var(--vp-c-bg-soft);
  cursor: grab;
}

.mermaid-fullscreen-chart:active {
  cursor: grabbing;
}

.mermaid-fullscreen-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100%;
  min-height: 100%;
  padding: 40px;
}

.mermaid-fullscreen-diagram svg {
  display: block;
  max-width: none;
  height: auto;
}

.mermaid-fullscreen-code-wrap {
  height: 100%;
  overflow: auto;
  padding: 20px;
  background: var(--vp-code-bg);
}

.mermaid-fullscreen-code {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--vp-c-text-1);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  white-space: pre;
}

.mermaid-fullscreen-hint {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.dark .mermaid-chart-view { cursor: zoom-in; }
</style>
<!-- [AGC:END] -->
