<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-10-15 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<template>
  <span class="view-counter">
    <span v-if="showPV" class="pv">👁 {{ pv }}</span>
    <span v-if="showUV" class="uv">👤 {{ uv }}</span>
  </span>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  page: {
    type: String,
    required: true,
  },
  workerUrl: {
    type: String,
    default: 'https://blog-stats.fangkun.workers.dev',
  },
  showPV: {
    type: Boolean,
    default: true,
  },
  showUV: {
    type: Boolean,
    default: true,
  },
})

const pv = ref(0)
const uv = ref(0)

onMounted(async () => {
  try {
    // 记录访问
    const res = await fetch(`${props.workerUrl}/api/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: props.page }),
    })
    const data = await res.json()
    if (data.success) {
      pv.value = data.data.pv
      uv.value = data.data.uv
    }
  } catch (error) {
    console.error('Failed to record view:', error)
  }
})
</script>

<style scoped>
.view-counter {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  display: inline-flex;
  gap: 0.8rem;
  align-items: center;
}

.view-counter .pv,
.view-counter .uv {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
</style>
<!-- [AGC:END] -->
