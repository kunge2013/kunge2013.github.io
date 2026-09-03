// [AGC:FILE] tool=Cc author=fangkun date=2026-09-03

// TypeScript 编译器 - 从 CDN 加载，避免 Vite 打包导致的命名空间解析问题
// TypeScript 编译器接口（仅用于类型检查）
interface TypeScriptCompiler {
  transpileModule: (code: string, options: any) => { outputText: string; diagnostics: any[] };
  ScriptTarget: any;
  ModuleKind: any;
  flattenDiagnosticMessageText: (msg: any, newline: string) => string;
}

// 日志条目类型
export interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug' | 'table';
  args: any[];
  tableData?: any;
}

// 输出捕获接口
export interface ExecutionResult {
  logs: LogEntry[];
  returnValue: any;
  error?: string;
  typeErrors: string[];
}

// [AGC:START] tool=Cc author=fangkun
// TypeScript 编译器懒加载（从 CDN 加载）
let tsCompiler: TypeScriptCompiler | null = null;
let loadingPromise: Promise<TypeScriptCompiler> | null = null;

// TypeScript CDN 版本
const TS_VERSION = '5.7.3';
const TS_CDN_URL = `https://cdn.jsdelivr.net/npm/typescript@${TS_VERSION}/lib/typescript.min.js`;

async function getCompiler(): Promise<TypeScriptCompiler> {
  if (tsCompiler) return tsCompiler;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // 检查是否已加载（全局 window.ts）
      if (typeof (window as any).ts !== 'undefined' && (window as any).ts.transpileModule) {
        tsCompiler = (window as any).ts;
        return tsCompiler;
      }

      // 动态加载 TypeScript CDN
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = TS_CDN_URL;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load TypeScript from CDN: ${TS_CDN_URL}`));
        document.head.appendChild(script);
      });

      // 验证加载结果
      if (typeof (window as any).ts === 'undefined' || !(window as any).ts.transpileModule) {
        throw new Error('TypeScript loaded but transpileModule not available');
      }

      tsCompiler = (window as any).ts;
      return tsCompiler;
    } catch (e) {
      loadingPromise = null;
      throw e;
    }
  })();

  return loadingPromise;
}

// 编译 TypeScript 代码
export async function compileTypeScript(code: string): Promise<{
  js: string;
  typeErrors: string[];
}> {
  const compiler = await getCompiler();

  const result = compiler.transpileModule(code, {
    compilerOptions: {
      target: compiler.ScriptTarget.ES2020,
      module: compiler.ModuleKind.ESNext,
      strict: true,
      noEmit: false,
      removeComments: false,
    },
    reportDiagnostics: true,
  });

  const typeErrors: string[] = [];
  if (result.diagnostics && result.diagnostics.length > 0) {
    for (const diag of result.diagnostics) {
      const message = compiler.flattenDiagnosticMessageText(diag.messageText, '\n');
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

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    table: console.table,
  };

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

// [AGC:START] tool=Cc author=fangkun
  try {
    const wrappedCode = `
      return (async () => {
        ${jsCode}
      })();
    `;

    const func = new Function(wrappedCode);
    returnValue = await func();
  } catch (e) {
    // 捕获完整的错误信息，包括堆栈
    if (e instanceof Error) {
      error = `${e.message}\n\nStack: ${e.stack || 'No stack trace'}`;
    } else {
      error = String(e);
    }
  } finally {
// [AGC:END]
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
    const { js, typeErrors } = await compileTypeScript(code);

    if (typeErrors.length > 0) {
      return {
        logs: [],
        returnValue: undefined,
        typeErrors,
      };
    }

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
  const base64Url = `https://www.typescriptlang.org/play?ts=${TS_VERSION}#code/${btoa(unescape(encodeURIComponent(code)))}`;
  return base64Url;
}
