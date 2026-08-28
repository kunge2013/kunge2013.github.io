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
      return `<pre class="mermaid">${escaped}</pre>\n`
    }

    return defaultFence(tokens, idx, options, env, self)
  }
}
// [AGC:END]
