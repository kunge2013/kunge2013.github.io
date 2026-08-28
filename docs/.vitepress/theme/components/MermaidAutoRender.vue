<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<template>
  <div v-show="false"></div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
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
}
</style>
<!-- [AGC:END] -->
