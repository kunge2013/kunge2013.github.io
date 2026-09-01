<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<template>
  <div v-show="false"></div>
  <!-- 放大查看 Modal -->
  <div v-if="showModal" class="mermaid-modal" @click.self="closeModal">
    <div class="mermaid-modal-content">
      <div class="mermaid-modal-toolbar">
        <button class="mermaid-modal-btn" @click="zoomIn" title="放大">
          <span>🔍+</span>
        </button>
        <button class="mermaid-modal-btn" @click="zoomOut" title="缩小">
          <span>🔍-</span>
        </button>
        <button class="mermaid-modal-btn" @click="resetZoom" title="恢复原始大小">
          <span></span>
        </button>
        <button class="mermaid-modal-btn mermaid-modal-close" @click="closeModal" title="关闭">
          <span>✕</span>
        </button>
      </div>
      <div class="mermaid-modal-body" ref="modalBody">
        <div class="mermaid-modal-diagram" :style="diagramStyle" v-html="modalSvg"></div>
      </div>
      <div class="mermaid-modal-hint">双击图表可放大查看 · 拖动可移动 · 滚轮可缩放</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import mermaid from 'mermaid'

const MERMAID_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  themeVariables: {
    fontFamily: MERMAID_FONT,
  },
  flowchart: {
    htmlLabels: true,
    useMaxWidth: false,
    padding: 20,
    nodeSpacing: 30,
    rankSpacing: 50,
    curve: 'basis',
  },
  sequence: {
    useMaxWidth: false,
  },
  gantt: {
    useMaxWidth: false,
  },
})

const route = useRoute()
let counter = 0

// Modal 状态
const showModal = ref(false)
const modalSvg = ref('')
const zoomLevel = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

const diagramStyle = {
  transform: () => `translate(${panX.value}px, ${panY.value}px) scale(${zoomLevel.value})`,
  transformOrigin: 'center center',
  transition: 'transform 0.2s ease',
  cursor: 'grab',
}

function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value + 0.2, 4)
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value - 0.2, 0.3)
}

function resetZoom() {
  zoomLevel.value = 1
  panX.value = 0
  panY.value = 0
}

function closeModal() {
  showModal.value = false
  resetZoom()
}

function openModal(svg: string) {
  modalSvg.value = svg
  zoomLevel.value = 1
  panX.value = 0
  panY.value = 0
  showModal.value = true
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
      const wrapper = document.createElement('div')
      wrapper.className = 'mermaid-diagram'
      wrapper.innerHTML = svg
      const svgEl = wrapper.querySelector('svg')
      if (svgEl) {
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')
        svgEl.style.width = '100%'
        svgEl.style.height = 'auto'
      }
      // 添加双击放大功能
      wrapper.addEventListener('dblclick', () => {
        const svgContent = svgEl?.outerHTML || ''
        openModal(svgContent)
      })
      wrapper.title = '双击放大查看'
      block.replaceWith(wrapper)
    } catch (e) {
      console.error('Mermaid render error:', e)
    }
  }
}

onMounted(() => {
  setTimeout(renderDiagrams, 100)
  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && showModal.value) closeModal()
  })
})

watch(() => route.path, () => {
  setTimeout(renderDiagrams, 200)
})
</script>

<style>
.mermaid-diagram {
  margin: 1.5em 0;
  display: flex;
  justify-content: flex-start;
  overflow-x: auto;
  padding: 1.5em;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  cursor: zoom-in;
  transition: border-color 0.2s;
}

.mermaid-diagram:hover {
  border-color: var(--vp-c-brand-1);
}

.mermaid-diagram svg {
  max-width: none;
  width: 100%;
  height: auto;
  min-width: 600px;
}

.dark .mermaid-diagram {
  background: var(--vp-c-bg-soft);
}

/* ---- Modal 样式 ---- */

.mermaid-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mermaid-modal-content {
  position: relative;
  max-width: 95vw;
  max-height: 95vh;
  background: var(--vp-c-bg);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.mermaid-modal-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.mermaid-modal-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  color: var(--vp-c-text-1);
}

.mermaid-modal-btn:hover {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.mermaid-modal-close {
  margin-left: auto;
  background: #ff4757;
  color: white;
  border-color: #ff4757;
}

.mermaid-modal-close:hover {
  background: #ff6b81;
  border-color: #ff6b81;
}

.mermaid-modal-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.mermaid-modal-diagram {
  transition: transform 0.2s ease;
}

.mermaid-modal-diagram svg {
  max-width: none;
}

.mermaid-modal-hint {
  padding: 10px 16px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
</style>
<!-- [AGC:END] -->
