<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-10-15 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<template>
  <div class="busuanzi-counter">
    <template v-if="mode === 'post'">
      <span id="busuanzi_container_page_pv">
        📖 本文阅读量：<strong id="busuanzi_value_page_pv">-</strong> 次
      </span>
      <span class="divider">|</span>
    </template>
    <span id="busuanzi_container_site_pv">
      🌍 本站总访问：<strong id="busuanzi_value_site_pv">-</strong> 次
    </span>
  </div>
</template>

<script setup>
defineProps({
  mode: {
    type: String,
    default: 'post', // 'post' 显示本文阅读+总访问，'home' 只显示总访问
  },
})
</script>

<style scoped>
.busuanzi-counter {
  margin-top: 2rem;
  padding: 1rem 0;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  text-align: center;
}

.busuanzi-counter strong {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  margin: 0 0.2em;
}

.busuanzi-counter .divider {
  margin: 0 0.8rem;
  color: var(--vp-c-divider);
}
</style>
<!-- [AGC:END] -->
