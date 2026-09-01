<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<template>
  <div v-show="false"></div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import mermaid from 'mermaid'

// 固定字体栈：mermaid 的文本测量节点挂在 body 下，而渲染标签在 foreignObject 内、
// 会继承 .vp-doc 的字体。两侧字体不一致时，CJK 全角字被按偏窄宽度测量，
// 节点框偏小 → 浏览器在框内二次换行 → 末行被裁切。固定同一字体栈让测量与渲染一致。
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
      // 移除 SVG 上的固定宽度，让它自适应
      const svgEl = wrapper.querySelector('svg')
      if (svgEl) {
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')
        svgEl.style.width = '100%'
        svgEl.style.height = 'auto'
      }
      block.replaceWith(wrapper)
    } catch (e) {
      console.error('Mermaid render error:', e)
    }
  }
}

onMounted(() => {
  setTimeout(renderDiagrams, 100)
})

watch(() => route.path, () => {
  setTimeout(renderDiagrams, 200)
})
</script>

<style>
.mermaid-diagram {
  margin: 1.5em 0;
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

.mermaid-diagram svg {
  max-width: 100%;
  height: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue",
    Helvetica, Arial, sans-serif;
}
</style>
<!-- [AGC:END] -->
