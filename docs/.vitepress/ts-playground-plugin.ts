// [AGC:FILE] tool=Cc author=fangkun date=2026-09-03

import type MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';

// TsPlayground Markdown 容器插件
// 支持两种语法：
// 1. ::: ts-playground
//    code here
//    :::
// 2. ```ts-playground
//    code here
//    ```

export default function tsPlaygroundPlugin(md: MarkdownIt) {
  // 注册 ::: ts-playground 容器
  md.use(container, 'ts-playground', {
    render(tokens: any[], idx: number) {
      const token = tokens[idx];

      if (token.nesting === 1) {
        // 提取容器内的代码内容
        let codeContent = '';
        let i = idx + 1;

        // 遍历直到找到容器的结束标记
        while (i < tokens.length) {
          const currentToken = tokens[i];

          // 如果遇到容器结束标记，停止
          if (currentToken.type === 'container_ts-playground_close') {
            break;
          }

          // 收集代码内容
          if (currentToken.type === 'inline') {
            codeContent += currentToken.content + '\n';
          }

          i++;
        }

        // 转义代码内容，避免 HTML 注入
        const escapedCode = codeContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

        // 返回 Vue 组件标签
        return `<TsPlayground code="${escapedCode.trim()}">\n`;
      } else {
        // 容器结束
        return `</TsPlayground>\n`;
      }
    },
  });

  // 注册 ```ts-playground 代码块
  const originalFence = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info.trim();

    // 检查是否是 ts-playground 代码块
    if (info === 'ts-playground' || info === 'typescript-playground') {
      const code = token.content;

      // 转义代码内容
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      return `<TsPlayground code="${escapedCode.trim()}"></TsPlayground>\n`;
    }

    // 其他代码块使用默认渲染
    return originalFence
      ? originalFence(tokens, idx, options, env, self)
      : `<pre><code>${token.content}</code></pre>\n`;
  };
}
