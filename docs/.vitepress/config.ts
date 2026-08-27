// [AGC:FILE] tool=Cc author=fangkun date=2026-08-27
// [AGC:START] tool=Cc author=fangkun
import { defineConfig } from 'vitepress'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface CategoryEntry {
  text: string
  link: string
}

function buildCategoryNav(prefix: string, labelsKey: 'categoryLabels' | 'enCategoryLabels'): CategoryEntry[] {
  const dataPath = join(__dirname, 'data', 'posts-data.json')
  let categories: string[] = []
  let labels: Record<string, string> = {}

  try {
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'))
    categories = [
      ...new Set([...Object.keys(data.zhPosts || {}), ...Object.keys(data.enPosts || {})]),
    ]
    labels = data[labelsKey] || {}
  } catch {
    categories = []
  }

  return categories.map((id) => ({
    text: labels[id] || id,
    link: `${prefix}/posts/${id}/`,
  }))
}

export default defineConfig({
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'zh-CN' }],
    ['meta', { name: 'og:site_name', content: 'Kunge2013\'s Blog' }],
  ],

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Kunge2013\'s Blog',
      description: '个人技术博客 - 编程、框架、架构设计',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '归档', link: '/archives' },
          {
            text: '分类',
            items: buildCategoryNav('', 'categoryLabels'),
          },
          { text: '标签', link: '/tags' },
          { text: '关于', link: '/about' },
        ],
        sidebar: false,
        outline: { label: '页面导航', level: [2, 3] },
        docFooter: { prev: '上一篇', next: '下一篇' },
        lastUpdated: { text: '最后更新于' },
        editLink: {
          pattern: 'https://github.com/kunge2013/kunge2013.github.io/edit/main/docs/:path',
          text: '在 GitHub 上编辑此页',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'Kunge2013\'s Blog',
      description: 'Personal Tech Blog - Programming, Frameworks, Architecture',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Archives', link: '/en/archives' },
          {
            text: 'Categories',
            items: buildCategoryNav('/en', 'enCategoryLabels'),
          },
          { text: 'Tags', link: '/en/tags' },
          { text: 'About', link: '/en/about' },
        ],
        sidebar: false,
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdated: { text: 'Last updated' },
        editLink: {
          pattern: 'https://github.com/kunge2013/kunge2013.github.io/edit/main/docs/:path',
          text: 'Edit this page on GitHub',
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kunge2013' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Kunge2013',
    },
  },
})
// [AGC:END]
