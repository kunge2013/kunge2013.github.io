// [AGC:FILE] tool=Cc author=fangkun date=2026-08-27
// [AGC:START] tool=Cc author=fangkun
import { h, computed } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Comments from './components/Comments.vue'
import PostList from './components/PostList.vue'
import CategoryGrid from './components/CategoryGrid.vue'
import CategoryPage from './components/CategoryPage.vue'
import ArchiveList from './components/ArchiveList.vue'
import TagCloud from './components/TagCloud.vue'
import SearchModal from './components/SearchModal.vue'
import PostNav from './components/PostNav.vue'
import MermaidAutoRender from './components/MermaidAutoRender.vue'
import TsPlayground from './components/TsPlayground.vue'
import Busuanzi from './components/Busuanzi.vue'
import './styles/vars.css'
import './styles/custom.css'

export interface Theme {}

export default {
  extends: DefaultTheme,
  Layout() {
    const route = useRoute()
    const isHome = computed(() => route.path === '/' || route.path === '/en/')

    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h('div', { class: 'search-wrapper' }, [h(SearchModal)]),
      'layout-bottom': () => h(MermaidAutoRender),
      'doc-footer-before': () => h(PostNav),
      'doc-after': () => h(Busuanzi, { mode: 'post' }),
      'home-features-after': () => h(Busuanzi, { mode: 'home' }),
    })
  },
  enhanceApp({ app }) {
    app.component('Comments', Comments)
    app.component('PostList', PostList)
    app.component('CategoryGrid', CategoryGrid)
    app.component('CategoryPage', CategoryPage)
    app.component('ArchiveList', ArchiveList)
    app.component('TagCloud', TagCloud)
    app.component('TsPlayground', TsPlayground)
    app.component('Busuanzi', Busuanzi)
  },
}
// [AGC:END]
