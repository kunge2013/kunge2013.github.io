// [AGC:FILE] tool=Cc author=fangkun date=2026-08-27
// [AGC:START] tool=Cc author=fangkun
import generatedData from './posts-data.json'

export interface Post {
  title: string
  date: string
  description: string
  url: string
  tags: string[]
  sticky?: boolean
  category?: string
  i18nLink?: string
}

export interface CategoryPosts {
  [category: string]: Post[]
}

export const zhPosts: CategoryPosts = generatedData.zhPosts
export const enPosts: CategoryPosts = generatedData.enPosts
export const categoryLabels: Record<string, string> = generatedData.categoryLabels
export const enCategoryLabels: Record<string, string> = generatedData.enCategoryLabels
// [AGC:END]
