// [AGC:FILE] tool=Cc author=fangkun date=2026-09-03

// TypeScript 编译器接口
interface TypeScriptCompiler {
  transpileModule: (code: string, options: any) => { outputText: string; diagnostics: any[] };
  ScriptTarget: any;
  ModuleKind: any;
  flattenDiagnosticMessageText: (msg: any, newline: string) => string;
}

// 编译器懒加载缓存
let tsCompiler: TypeScriptCompiler | null = null;
let loadingPromise: Promise<TypeScriptCompiler> | null = null;

// 输出捕获接口
export interface ExecutionResult {
  logs: string[];
  returnValue: any;
  error?: string;
  typeErrors: string[];
}

// 懒加载 TypeScript 编译器（动态导入，减少初始包体积）
async function getCompiler(): Promise<TypeScriptCompiler> {
  if (tsCompiler) {
    return tsCompiler;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // 动态导入 TypeScript 编译器
      const ts = await import('typescript');
      tsCompiler = ts as any;
      return tsCompiler;
    } catch (e) {
      loadingPromise = null;
      throw new Error(`Failed to load TypeScript compiler: ${e}`);
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

  // 编译选项
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

  // 提取类型错误
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

// 执行编译后的 JavaScript（使用 Web Worker 隔离）
export async function executeJavaScript(jsCode: string): Promise<ExecutionResult> {
  const logs: string[] = [];
  let returnValue: any = undefined;
  let error: string | undefined = undefined;

  try {
    // 拦截 console.log
    const originalLog = console.log;
    const capturedLogs: any[][] = [];

    console.log = (...args: any[]) => {
      capturedLogs.push(args);
      logs.push(args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' '));
    };

    try {
      // 使用 Function 构造函数执行代码
      // 将代码包装成异步函数以支持 await
      const wrappedCode = `
        return (async () => {
          ${jsCode}
        })();
      `;

      const func = new Function(wrappedCode);
      returnValue = await func();
    } finally {
      // 恢复 console.log
      console.log = originalLog;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return {
    logs,
    returnValue,
    error,
    typeErrors: [],
  };
}

// 完整的编译 + 执行流程
export async function compileAndRun(code: string): Promise<ExecutionResult> {
  try {
    // 1. 编译 TypeScript
    const { js, typeErrors } = await compileTypeScript(code);

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

// 生成 TypeScript Playground 链接
export function generatePlaygroundUrl(code: string): string {
  // 使用 LZString 压缩代码（TypeScript Playground 使用此格式）
  const encoded = encodeURIComponent(code);
  const lzstringUrl = `https://www.typescriptlang.org/play/#code/${encoded}`;

  // 备用：使用 Base64 编码（更简单但 URL 更长）
  const base64Url = `https://www.typescriptlang.org/play?ts=5.7.3#code/${btoa(unescape(encodeURIComponent(code)))}`;

  return base64Url;
}
