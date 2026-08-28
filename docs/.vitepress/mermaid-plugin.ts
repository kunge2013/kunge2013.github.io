// [AGC:FILE] tool=Cc author=fangkun date=2026-08-28
// [AGC:START] tool=Cc author=fangkun
import type MarkdownIt from 'markdown-it'

export default function mermaidPlugin(md: MarkdownIt) {
  const defaultFence = md.renderer.rules.fence || function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options)
  }

  md.renderer.rules.fence = function (tokens, idx, options, env, self) {
    const token = tokens[idx]
    const info = token.info ? token.info.trim() : ''
    const lang = info.split(/\s+/)[0]

    if (lang === 'mermaid') {
      const code = token.content
      const escaped = md.utils.escapeHtml(code)
      // v-pre：VitePress 会把 markdown 里的原生 HTML 当 Vue 模板编译，
      // mermaid 的菱形语法 {{ ... }} 会被当成 Vue 插值吞掉，必须跳过编译
      return `<pre class="mermaid" v-pre>${escaped}</pre>\n`
    }

    return defaultFence(tokens, idx, options, env, self)
  }
}
// [AGC:END]
