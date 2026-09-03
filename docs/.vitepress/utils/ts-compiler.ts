// [AGC:FILE] tool=Cc author=fangkun date=2026-09-03

// TypeScript 编译器 - 使用静态导入（Vite 生产环境下动态 import 会导致命名空间解析失败）
import * as tsCompiler from 'typescript';

// 日志条目类型
export interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug' | 'table';
  args: any[];
  tableData?: any; // console.table 的数据
}

// 输出捕获接口
export interface ExecutionResult {
  logs: LogEntry[];
  returnValue: any;
  error?: string;
  typeErrors: string[];
}

// [AGC:START] tool=Cc author=fangkun
// 编译 TypeScript 代码（同步，无需懒加载）
export function compileTypeScript(code: string): {
  js: string;
  typeErrors: string[];
} {
  // 编译选项
  const result = tsCompiler.transpileModule(code, {
    compilerOptions: {
      target: tsCompiler.ScriptTarget.ES2020,
      module: tsCompiler.ModuleKind.ESNext,
      strict: true,
      noEmit: false,
      removeComments: false,
    },
    reportDiagnostics: true,
  });

  // 提取类型错误
  const typeErrors: string[] = [];
  if (result.diagnostics && result.diagnostics.length > 0) {
    for (const diag of result.diagnostics) {
      const message = tsCompiler.flattenDiagnosticMessageText(diag.messageText, '\n');
      typeErrors.push(message);
    }
  }

  return {
    js: result.outputText,
    typeErrors,
  };
}
// [AGC:END]

// 执行编译后的 JavaScript
export async function executeJavaScript(jsCode: string): Promise<ExecutionResult> {
  const logs: LogEntry[] = [];
  let returnValue: any = undefined;
  let error: string | undefined = undefined;

  // 保存原始 console 方法
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    table: console.table,
  };

  // 拦截所有 console 方法
  console.log = (...args: any[]) => {
    logs.push({ level: 'log', args });
    originalConsole.log(...args);
  };

  console.warn = (...args: any[]) => {
    logs.push({ level: 'warn', args });
    originalConsole.warn(...args);
  };

  console.error = (...args: any[]) => {
    logs.push({ level: 'error', args });
    originalConsole.error(...args);
  };

  console.info = (...args: any[]) => {
    logs.push({ level: 'info', args });
    originalConsole.info(...args);
  };

  console.debug = (...args: any[]) => {
    logs.push({ level: 'debug', args });
    originalConsole.debug(...args);
  };

  console.table = (data: any) => {
    logs.push({ level: 'table', args: [data], tableData: data });
    originalConsole.table(data);
  };

  try {
    // 使用 Function 构造函数执行代码
    // 将代码包装成异步函数以支持 await
    const wrappedCode = `
      return (async () => {
        ${jsCode}
      })();
    `;

    // 使用 Function 构造函数（GitHub Pages 默认 CSP 不会阻止）
    const func = new Function(wrappedCode);
    returnValue = await func();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    // 恢复原始 console 方法
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
    console.table = originalConsole.table;
  }

  return {
    logs,
    returnValue,
    error,
    typeErrors: [],
  };
}

// [AGC:START] tool=Cc author=fangkun
// 完整的编译 + 执行流程
export async function compileAndRun(code: string): Promise<ExecutionResult> {
  try {
    // 1. 编译 TypeScript（同步）
    const { js, typeErrors } = compileTypeScript(code);

    // 如果有类型错误，返回错误信息
    if (typeErrors.length > 0) {
      return {
        logs: [],
        returnValue: undefined,
        typeErrors,
      };
    }

    // 2. 执行 JavaScript
    const result = await executeJavaScript(js);

    return result;
  } catch (e) {
    return {
      logs: [],
      returnValue: undefined,
      error: e instanceof Error ? e.message : String(e),
      typeErrors: [],
    };
  }
}
// [AGC:END]

// 生成 TypeScript Playground 链接
export function generatePlaygroundUrl(code: string): string {
  // 使用 Base64 编码
  const base64Url = `https://www.typescriptlang.org/play?ts=5.7.3#code/${btoa(unescape(encodeURIComponent(code)))}`;
  return base64Url;
}
