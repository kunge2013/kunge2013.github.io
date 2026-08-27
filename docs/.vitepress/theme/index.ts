// [AGC:FILE] tool=Cc author=fangkun date=2026-08-27
// [AGC:START] tool=Cc author=fangkun
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Comments from './components/Comments.vue'
import PostList from './components/PostList.vue'
import CategoryGrid from './components/CategoryGrid.vue'
import CategoryPage from './components/CategoryPage.vue'
import SearchModal from './components/SearchModal.vue'
import './styles/vars.css'
import './styles/custom.css'

export interface Theme {}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h('div', { class: 'search-wrapper' }, [h(SearchModal)]),
    })
  },
  enhanceApp({ app }) {
    app.component('Comments', Comments)
    app.component('PostList', PostList)
    app.component('CategoryGrid', CategoryGrid)
    app.component('CategoryPage', CategoryPage)
  },
}
// [AGC:END]
