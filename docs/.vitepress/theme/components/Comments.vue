<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-27 -->
<!-- [AGC:START] tool=Cc author=fangkun -->
<script setup lang="ts">
import { computed, ref, watchEffect, onMounted } from 'vue'
import { useData } from 'vitepress'

const { frontmatter, isDark } = useData()

const repo = import.meta.env.VITE_GISCUS_REPO ?? 'kunge2013/kunge2013.github.io'
const repoId = import.meta.env.VITE_GISCUS_REPO_ID ?? ''
const categoryId = import.meta.env.VITE_GISCUS_CATEGORY_ID ?? ''

const enabled = computed(() =>
  frontmatter.value.comments !== false && !!repoId && !!categoryId
)

const theme = computed(() =>
  isDark.value ? 'https://giscus.app/themes/dark.css' : 'https://giscus.app/themes/light.css'
)
</script>

<template>
  <div v-if="enabled" class="giscus-wrapper">
    <Comments
      :key="theme"
      :theme="theme"
      repo="kunge2013/kunge2013.github.io"
      :repoId="repoId"
      category="Announcements"
      :categoryId="categoryId"
      mapping="pathname"
      strict="1"
      reactions-enabled="1"
      emit-metadata="0"
      input-position="top"
      lang="zh-CN"
      crossorigin="anonymous"
      async
    />
  </div>
</template>
<!-- [AGC:END] -->
