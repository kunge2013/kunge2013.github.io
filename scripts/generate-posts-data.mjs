#!/usr/bin/env node
// [AGC:FILE] tool=Cc author=fangkun date=2026-08-27
// [AGC:START] tool=Cc author=fangkun
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')
const DOCS = join(ROOT, 'docs')
const POSTS_DIR = join(DOCS, 'posts')
const EN_POSTS_DIR = join(DOCS, 'en', 'posts')
const OUTPUT = join(DOCS, '.vitepress', 'data', 'posts-data.json')

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}

  const lines = match[1].split('\n')
  const data = {}
  let currentKey = ''
  let currentVal = ''
  let inArray = false

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (inArray) {
      const trimmed = line.trim()
      if (trimmed === ']' || trimmed === '') {
        data[currentKey] = parseArray(currentVal)
        inArray = false
        currentKey = ''
        currentVal = ''
      } else if (trimmed.startsWith('- ')) {
        currentVal += (currentVal ? ',' : '') + trimmed.slice(2).trim()
      } else if (!trimmed.startsWith('#')) {
        currentVal += ',' + trimmed
      }
      continue
    }

    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (!kvMatch) continue

    const [, key, rawVal] = kvMatch
    const val = rawVal.trim()

    if (val === '[') {
      currentKey = key
      currentVal = ''
      inArray = true
    } else if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = parseArray(val.slice(1, -1))
    } else if (val === '') {
      data[key] = ''
    } else {
      data[key] = parseValue(val)
    }
  }

  if (inArray && currentKey) {
    data[currentKey] = parseArray(currentVal)
  }

  return data
}

function parseArray(str) {
  return str
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function parseValue(val) {
  if (val === 'true') return true
  if (val === 'false') return false
  if (/^\d+$/.test(val)) return Number(val)
  return val.replace(/^['"]|['"]$/g, '')
}

function readCategoryLabel(categoryDir) {
  const indexPath = join(categoryDir, 'index.md')
  if (!existsSync(indexPath)) return ''
  const content = readFileSync(indexPath, 'utf-8')
  const fm = parseFrontmatter(content)
  return fm.title || ''
}

function scanDir(dir, isEn) {
  const posts = {}
  const labels = {}

  if (!existsSync(dir)) return { posts, labels }
  const entries = readdirSync(dir)
  if (!entries.length) return { posts, labels }

  for (const entry of entries) {
    const entryPath = join(dir, entry)
    if (!statSync(entryPath).isDirectory()) continue

    const category = entry
    const categoryPosts = []

    for (const file of readdirSync(entryPath)) {
      if (!file.endsWith('.md') || file === 'index.md') continue

      const filePath = join(entryPath, file)
      const content = readFileSync(filePath, 'utf-8')
      const fm = parseFrontmatter(content)

      if (fm.draft === true) continue

      const slug = file.replace(/\.md$/, '')
      const url = isEn
        ? `/en/posts/${category}/${slug}`
        : `/posts/${category}/${slug}`

      categoryPosts.push({
        title: fm.title || slug,
        date: fm.date || '',
        description: fm.description || '',
        url,
        tags: fm.tags || [],
        sticky: fm.sticky || false,
        category,
        i18nLink: fm['i18n-link'] || '',
      })
    }

    const label = readCategoryLabel(entryPath)
    if (label) labels[category] = label

    if (categoryPosts.length > 0) {
      posts[category] = categoryPosts
    }
  }

  return { posts, labels }
}

const { posts: zhPosts, labels: zhLabels } = scanDir(POSTS_DIR, false)
const { posts: enPosts, labels: enLabels } = scanDir(EN_POSTS_DIR, true)

const fallbackLabels = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  react: 'React',
  vue: 'Vue',
  spring: 'Spring',
  'system-design': isEn => (isEn ? 'System Design' : '系统设计'),
  'design-patterns': isEn => (isEn ? 'Design Patterns' : '设计模式'),
}

function buildCategoryLabels(labels, isEn) {
  const result = { ...labels }
  for (const [id, val] of Object.entries(fallbackLabels)) {
    if (!result[id]) {
      result[id] = typeof val === 'function' ? val(isEn) : val
    }
  }
  return result
}

const categoryLabels = buildCategoryLabels({ ...enLabels, ...zhLabels }, false)
const enCategoryLabels = buildCategoryLabels({ ...zhLabels, ...enLabels }, true)

const output = {
  zhPosts,
  enPosts,
  categoryLabels,
  enCategoryLabels,
}
writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8')

console.log('Generated posts-data.json:')
console.log('  ZH categories:', Object.keys(zhPosts).join(', ') || '(none)')
console.log('  EN categories:', Object.keys(enPosts).join(', ') || '(none)')
console.log('  ZH posts:', Object.values(zhPosts).reduce((s, a) => s + a.length, 0))
console.log('  EN posts:', Object.values(enPosts).reduce((s, a) => s + a.length, 0))
console.log('  Category labels:', Object.keys(categoryLabels).join(', '))
// [AGC:END]
