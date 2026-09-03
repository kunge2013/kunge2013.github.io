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
const PACKAGE_JSON = join(ROOT, 'package.json')

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

// [AGC:START] tool=Cc author=fangkun
/**
 * 从 frontmatter 或文件名提取文章序号。
 * 优先级：frontmatter.order > 文件名中的数字 > Infinity
 * 文件名数字匹配：第N章、N.xxx、N-xxx
 */
function extractOrder(fm, fileName) {
  // 1. frontmatter 的 order 字段
  if (typeof fm.order === 'number' && !isNaN(fm.order)) {
    return fm.order
  }
  // 2. 文件名中的数字
  const slug = fileName.replace(/\.md$/, '')
  // 匹配 "第N章" 格式
  const chMatch = slug.match(/第(\d+)章/)
  if (chMatch) return parseInt(chMatch[1], 10)
  // 匹配 "N.xxx" 或 "N-xxx" 格式（开头的数字）
  const numMatch = slug.match(/^(\d+)[.\-]/)
  if (numMatch) return parseInt(numMatch[1], 10)
  // 3. 没有序号
  return Infinity
}

/**
 * 文章排序比较函数。
 * 排序规则（优先级从高到低）：
 * 1. sticky = true → 永远置顶
 * 2. date 升序（老的在前，新的在后）
 * 3. order 降序（同日期内，大序号在前）
 * 4. fileName 升序（文件名 tiebreak）
 */
function comparePosts(a, b) {
  // sticky 置顶
  if (a.sticky && !b.sticky) return -1
  if (!a.sticky && b.sticky) return 1
  // date 升序
  const dateCmp = (a.date || '').localeCompare(b.date || '')
  if (dateCmp !== 0) return dateCmp
  // order 降序（大序号在前）
  const orderCmp = (b.order ?? Infinity) - (a.order ?? Infinity)
  if (orderCmp !== 0) return orderCmp
  // fileName 升序（tiebreak）
  return (a.fileName || '').localeCompare(b.fileName || '')
}
// [AGC:END]

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
        // [AGC:START] tool=Cc author=fangkun
        order: extractOrder(fm, file),
        fileName: file,
        // [AGC:END]
      })
    }

    // [AGC:START] tool=Cc author=fangkun
    // 排序：sticky → date 升序 → order 降序 → fileName 升序
    categoryPosts.sort(comparePosts)
    // [AGC:END]

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

// 读取 package.json 中的分类样式配置
let categoryStyles = {}
if (existsSync(PACKAGE_JSON)) {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8'))
  categoryStyles = pkg.categoryStyles || {}
}

const output = {
  zhPosts,
  enPosts,
  categoryLabels,
  enCategoryLabels,
  categoryStyles,
}
writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8')

console.log('Generated posts-data.json:')
console.log('  ZH categories:', Object.keys(zhPosts).join(', ') || '(none)')
console.log('  EN categories:', Object.keys(enPosts).join(', ') || '(none)')
console.log('  ZH posts:', Object.values(zhPosts).reduce((s, a) => s + a.length, 0))
console.log('  EN posts:', Object.values(enPosts).reduce((s, a) => s + a.length, 0))
console.log('  Category labels:', Object.keys(categoryLabels).join(', '))
// [AGC:END]
