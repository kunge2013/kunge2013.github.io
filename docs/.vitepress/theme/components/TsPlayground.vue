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
      <textarea
        v-model="code"
        class="code-input"
        placeholder="输入 TypeScript 代码..."
        spellcheck="false"
        @keydown.ctrl.enter="runCode"
        @keydown.meta.enter="runCode"
      ></textarea>
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
          <div v-for="(err, idx) in result.typeErrors" :key="idx" class="error-item">
            {{ err }}
          </div>
        </div>
      </div>

      <!-- 运行时错误 -->
      <div v-if="result.error" class="output-section error-section">
        <div class="section-title">❌ 运行时错误</div>
        <div class="error-item">{{ result.error }}</div>
      </div>

      <!-- console.log 输出 -->
      <div v-if="result.logs.length > 0" class="output-section log-section">
        <div class="section-title">📝 console.log</div>
        <div class="log-list">
          <div v-for="(log, idx) in result.logs" :key="idx" class="log-item">
            {{ log }}
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
import { ref, computed, onMounted } from 'vue';
import { compileAndRun, generatePlaygroundUrl, type ExecutionResult } from '../../utils/ts-compiler';

// Props
interface Props {
  code?: string;
}

const props = withDefaults(defineProps<Props>(), {
  code: '// 在这里输入 TypeScript 代码\nconsole.log("Hello, TypeScript!");',
});

// 状态
const code = ref(props.code);
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

// 方法
async function runCode() {
  if (isCompiling.value) return;

  isCompiling.value = true;
  try {
    result.value = await compileAndRun(code.value);
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
  const url = generatePlaygroundUrl(code.value);
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

// 生命周期
onMounted(() => {
  // 预加载 TypeScript 编译器
  compileAndRun('// preload').catch(() => {});
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
  width: 100%;
  min-height: 200px;
  padding: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: none;
  outline: none;
  resize: vertical;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  tab-size: 2;
}

.code-input::placeholder {
  color: var(--vp-c-text-3);
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
  gap: 4px;
}

.log-item {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
  padding: 4px 8px;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
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
