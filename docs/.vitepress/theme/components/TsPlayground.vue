<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-09-03 -->
<template>
  <div class="ts-playground">
    <!-- 代码编辑区 -->
    <div class="code-editor">
      <div class="editor-header">
        <span class="editor-title">TypeScript</span>
        <div class="editor-actions">
          <button
            @click="runCode"
            :disabled="isCompiling"
            class="run-button"
            title="运行代码 (Ctrl+Enter)"
          >
            <span v-if="isCompiling">⏳ 编译中...</span>
            <span v-else>▶ 运行</span>
          </button>
          <button
            @click="openInPlayground"
            class="playground-button"
            title="在 TypeScript Playground 中打开"
          >
            🔗 Playground
          </button>
        </div>
      </div>
      <div ref="editorContainer" class="code-input"></div>
    </div>

    <!-- 输出区 -->
    <div class="output-panel" v-if="hasOutput">
      <div class="output-header">
        <span class="output-title">输出</span>
        <button @click="clearOutput" class="clear-button" title="清空输出">
          🗑️ 清空
        </button>
      </div>

      <!-- 类型错误 -->
      <div v-if="result.typeErrors.length > 0" class="output-section error-section">
        <div class="section-title">❌ 类型错误</div>
        <div class="error-list">
          <div v-for="(err, idx) in result.typeErrors" :key="'type-' + idx" class="error-item">
            {{ err }}
          </div>
        </div>
      </div>

      <!-- 运行时错误 -->
      <div v-if="result.error" class="output-section error-section">
        <div class="section-title">❌ 运行时错误</div>
        <div class="error-item">{{ result.error }}</div>
      </div>

      <!-- 日志输出（支持不同级别） -->
      <div v-if="result.logs.length > 0" class="output-section log-section">
        <div class="section-title">📝 输出</div>
        <div class="log-list">
          <div
            v-for="(log, idx) in result.logs"
            :key="'log-' + idx"
            class="log-item"
            :class="'log-' + log.level"
          >
            <!-- 日志级别图标 -->
            <span class="log-icon">{{ getLogIcon(log.level) }}</span>

            <!-- 表格数据 -->
            <template v-if="log.level === 'table' && log.tableData">
              <div class="console-table">
                <table>
                  <thead>
                    <tr>
                      <th v-for="(value, key) in getTableHeaders(log.tableData)" :key="key">{{ key }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIdx) in getTableRows(log.tableData)" :key="rowIdx">
                      <td v-for="(value, colIdx) in row" :key="colIdx">{{ formatValue(value) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <!-- 普通日志 -->
            <template v-else>
              <span
                v-for="(arg, argIdx) in log.args"
                :key="argIdx"
                class="log-arg"
              >{{ formatValue(arg) }} </span>
            </template>
          </div>
        </div>
      </div>

      <!-- 返回值 -->
      <div v-if="result.returnValue !== undefined" class="output-section return-section">
        <div class="section-title">↩️ 返回值</div>
        <div class="return-value">
          {{ formatValue(result.returnValue) }}
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="isEmpty" class="output-section empty-section">
        <div class="empty-message">代码执行成功，无输出</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { compileAndRun, generatePlaygroundUrl, type ExecutionResult, type LogEntry } from '../../utils/ts-compiler';

// Props
interface Props {
  code?: string;
}

const props = withDefaults(defineProps<Props>(), {
  code: '// 在这里输入 TypeScript 代码\nconsole.log("Hello, TypeScript!");',
});

// 状态
const editorContainer = ref<HTMLElement | null>(null);
const editorView = ref<EditorView | null>(null);
const result = ref<ExecutionResult>({
  logs: [],
  returnValue: undefined,
  typeErrors: [],
});
const isCompiling = ref(false);

// 计算属性
const hasOutput = computed(() => {
  return (
    result.value.logs.length > 0 ||
    result.value.returnValue !== undefined ||
    result.value.error !== undefined ||
    result.value.typeErrors.length > 0
  );
});

const isEmpty = computed(() => {
  return (
    !result.value.error &&
    result.value.typeErrors.length === 0 &&
    result.value.logs.length === 0 &&
    result.value.returnValue === undefined
  );
});

// 检测当前主题
function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

// 方法
function getCode(): string {
  return editorView.value?.state.doc.toString() || '';
}

async function runCode() {
  if (isCompiling.value) return;

  isCompiling.value = true;
  try {
    const code = getCode();
    result.value = await compileAndRun(code);
  } catch (e) {
    result.value = {
      logs: [],
      returnValue: undefined,
      error: e instanceof Error ? e.message : String(e),
      typeErrors: [],
    };
  } finally {
    isCompiling.value = false;
  }
}

function openInPlayground() {
  const code = getCode();
  const url = generatePlaygroundUrl(code);
  window.open(url, '_blank');
}

function clearOutput() {
  result.value = {
    logs: [],
    returnValue: undefined,
    typeErrors: [],
  };
}

function formatValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getLogIcon(level: string): string {
  const icons: Record<string, string> = {
    log: '›',
    warn: '⚠',
    error: '✖',
    info: 'ℹ',
    debug: '🐛',
    table: '📊',
  };
  return icons[level] || '›';
}

function getTableHeaders(data: any): string[] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (typeof data[0] === 'object') {
      return ['(index)', ...Object.keys(data[0])];
    }
    return ['(index)', '(values)'];
  }
  if (typeof data === 'object') {
    return ['(index)', '(values)'];
  }
  return [];
}

function getTableRows(data: any): any[][] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (typeof data[0] === 'object') {
      return data.map((item, idx) => [idx, ...Object.values(item)]);
    }
    return data.map((item, idx) => [idx, item]);
  }
  if (typeof data === 'object') {
    return Object.entries(data).map(([key, value]) => [key, value]);
  }
  return [];
}

// 生命周期
onMounted(() => {
  if (!editorContainer.value) return;

  // 自定义快捷键
  const customKeymap = keymap.of([
    {
      key: 'Ctrl-Enter',
      run: () => {
        runCode();
        return true;
      },
    },
    {
      key: 'Cmd-Enter',
      run: () => {
        runCode();
        return true;
      },
    },
  ]);

  // 创建编辑器
  const startState = EditorState.create({
    doc: props.code,
    extensions: [
      basicSetup,
      javascript({ typescript: true }),
      isDarkMode() ? oneDark : [],
      customKeymap,
      EditorView.theme({
        '&': {
          fontSize: '14px',
          height: 'auto',
          minHeight: '200px',
          maxHeight: '500px',
        },
        '.cm-content': {
          padding: '12px 0',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        },
        '.cm-gutters': {
          borderRight: '1px solid var(--vp-c-divider)',
        },
      }),
    ],
  });

  editorView.value = new EditorView({
    state: startState,
    parent: editorContainer.value,
  });

  // 监听主题变化
  const observer = new MutationObserver(() => {
    if (!editorView.value) return;
    // 重新创建编辑器以切换主题
    const code = getCode();
    editorView.value.destroy();

    const newState = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        javascript({ typescript: true }),
        isDarkMode() ? oneDark : [],
        customKeymap,
        EditorView.theme({
          '&': {
            fontSize: '14px',
            height: 'auto',
            minHeight: '200px',
            maxHeight: '500px',
          },
          '.cm-content': {
            padding: '12px 0',
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          },
          '.cm-gutters': {
            borderRight: '1px solid var(--vp-c-divider)',
          },
        }),
      ],
    });

    editorView.value = new EditorView({
      state: newState,
      parent: editorContainer.value!,
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // 预加载 TypeScript 编译器
  compileAndRun('// preload').catch(() => {});
});

onBeforeUnmount(() => {
  editorView.value?.destroy();
});
</script>

<style scoped>
.ts-playground {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
  background: var(--vp-c-bg);
}

/* 代码编辑区 */
.code-editor {
  border-bottom: 1px solid var(--vp-c-divider);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.editor-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.run-button,
.playground-button,
.clear-button {
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.run-button:hover:not(:disabled) {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.run-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.playground-button:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
}

.code-input {
  min-height: 200px;
}

.code-input :deep(.cm-editor) {
  height: auto;
  min-height: 200px;
  max-height: 500px;
  overflow: auto;
}

.code-input :deep(.cm-editor.cm-focused) {
  outline: none;
}

/* 输出区 */
.output-panel {
  background: var(--vp-c-bg-soft);
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.output-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.clear-button:hover {
  background: var(--vp-c-danger-1);
  color: white;
  border-color: var(--vp-c-danger-1);
}

.output-section {
  padding: 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.output-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--vp-c-text-2);
}

/* 错误样式 */
.error-section {
  background: var(--vp-c-danger-soft, rgba(255, 0, 0, 0.05));
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-item {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-danger-1, #d32f2f);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 日志样式 */
.log-section {
  background: var(--vp-c-bg);
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.log-item {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.log-icon {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
}

.log-arg {
  flex: 1;
}

/* 不同日志级别的颜色 */
.log-log {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.log-warn {
  color: var(--vp-c-warning-1, #b45309);
  background: var(--vp-c-warning-soft, rgba(245, 158, 11, 0.1));
  border-left: 3px solid var(--vp-c-warning-1, #f59e0b);
}

.log-error {
  color: var(--vp-c-danger-1, #dc2626);
  background: var(--vp-c-danger-soft, rgba(239, 68, 68, 0.1));
  border-left: 3px solid var(--vp-c-danger-1, #ef4444);
}

.log-info {
  color: var(--vp-c-brand-1, #2563eb);
  background: var(--vp-c-brand-soft, rgba(37, 99, 235, 0.1));
  border-left: 3px solid var(--vp-c-brand-1, #3b82f6);
}

.log-debug {
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  opacity: 0.8;
}

.log-table {
  background: var(--vp-c-bg-soft);
}

/* 表格样式 */
.console-table {
  width: 100%;
  overflow-x: auto;
}

.console-table table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
  margin-top: 4px;
}

.console-table th,
.console-table td {
  border: 1px solid var(--vp-c-divider);
  padding: 4px 8px;
  text-align: left;
}

.console-table th {
  background: var(--vp-c-bg);
  font-weight: 600;
}

.console-table tbody tr:nth-child(even) {
  background: var(--vp-c-bg);
}

/* 返回值样式 */
.return-section {
  background: var(--vp-c-success-soft, rgba(0, 255, 0, 0.05));
}

.return-value {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-success-1, #2e7d32);
  white-space: pre-wrap;
  word-break: break-word;
  padding: 8px;
  background: var(--vp-c-bg);
  border-radius: 4px;
}

/* 空状态 */
.empty-section {
  text-align: center;
  padding: 20px;
}

.empty-message {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

/* 响应式 */
@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .editor-actions {
    width: 100%;
  }

  .run-button,
  .playground-button {
    flex: 1;
  }
}
</style>
