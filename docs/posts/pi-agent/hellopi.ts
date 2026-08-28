// [AGC:FILE] tool=Cc author=fangkun date=2026-08-28
// [AGC:START] tool=Cc author=fangkun
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const TAG = "[hellopi]";
const RESET = "\x1b[0m";
const GRAY = "\x1b[90m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";

// 事件说明映射表
const EVENT_INFO: Record<string, { when: string; how: string; usecase: string }> = {
  // 启动与资源
  project_trust: {
    when: "pi 启动时，判断是否信任项目前触发",
    how: "返回 { trusted: 'yes' | 'no' | 'undecided', remember: true }",
    usecase: "自定义项目信任决策、自动化信任流程",
  },
  resources_discover: {
    when: "session_start 之后，加载 skills/prompts/themes 时触发",
    how: "返回 { skillPaths, promptPaths, themePaths } 添加额外资源路径",
    usecase: "动态加载外部 skills、自定义主题、注入提示词",
  },

  // 会话事件
  session_start: {
    when: "会话启动/加载/重载时触发（startup/new/resume/fork/reload）",
    how: "可读取 ctx.sessionManager，初始化扩展状态",
    usecase: "恢复扩展状态、通知用户、启动后台任务",
  },
  session_info_changed: {
    when: "通过 /name 或 pi.setSessionName() 设置会话名称时触发",
    how: "读取 event.name 获取新名称",
    usecase: "同步会话名称到外部系统、更新状态栏",
  },
  session_before_switch: {
    when: "/new 或 /resume 切换会话之前触发",
    how: "返回 { cancel: true } 可取消切换",
    usecase: "确认危险操作、保存当前状态、阻止切换",
  },
  session_before_fork: {
    when: "/fork 或 /clone 分叉会话之前触发",
    how: "返回 { cancel: true } 可取消分叉",
    usecase: "确认分叉操作、自动保存检查点",
  },
  session_before_compact: {
    when: "压缩会话之前触发（/compact 或自动压缩）",
    how: "返回 { cancel: true } 取消，或 { compaction: { summary, ... } } 自定义摘要",
    usecase: "自定义压缩摘要、阻止压缩、添加压缩前检查",
  },
  session_compact: {
    when: "压缩成功完成后触发",
    how: "读取 event.compactionEntry 获取压缩结果",
    usecase: "记录压缩历史、通知用户压缩完成",
  },
  session_compact_failed: {
    when: "压缩失败时触发",
    how: "读取 event.errorMessage 和 event.aborted",
    usecase: "错误恢复、通知用户、触发备用压缩策略",
  },
  session_before_tree: {
    when: "/tree 导航之前触发",
    how: "返回 { cancel: true } 取消，或 { summary: {...} } 自定义摘要",
    usecase: "自动生成分支摘要、阻止树导航",
  },
  session_tree: {
    when: "/tree 导航完成后触发",
    how: "读取 event.newLeafId 和 event.oldLeafId",
    usecase: "记录导航历史、触发分支切换后的操作",
  },
  session_shutdown: {
    when: "会话结束时触发（quit/reload/new/resume/fork）",
    how: "清理资源、保存状态",
    usecase: "关闭文件监视器、保存扩展状态、清理临时文件",
  },

  // Agent 事件
  input: {
    when: "用户输入后，skill/template 扩展之前触发",
    how: "返回 { action: 'transform', text } 转换输入，{ action: 'handled' } 完全处理，{ action: 'continue' } 继续",
    usecase: "输入预处理、自定义命令路由、输入验证",
  },
  before_agent_start: {
    when: "用户提交提示词后、agent 循环之前触发",
    how: "返回 { message, systemPrompt } 注入消息或修改系统提示词",
    usecase: "注入上下文、修改系统提示词、添加额外指令",
  },
  agent_start: {
    when: "agent 循环开始时触发",
    how: "只读通知",
    usecase: "记录开始时间、更新状态栏、触发外部系统",
  },
  agent_end: {
    when: "agent 循环结束时触发（可能还有自动重试）",
    how: "读取 event.messages 获取本轮消息",
    usecase: "统计使用量、记录结束时间、触发后续处理",
  },
  agent_settled: {
    when: "agent 完全稳定后触发（无重试/压缩/后续消息）",
    how: "只读通知，此时 ctx.isIdle() 为 true",
    usecase: "确认任务完成、发送通知、触发 CI/CD",
  },

  // UI 提示事件
  ui_prompt_start: {
    when: "扩展 UI 对话框显示时触发（select/confirm/input/editor/custom）",
    how: "只读通知",
    usecase: "状态集成报告'等待用户'、记录等待时间",
  },
  ui_prompt_end: {
    when: "扩展 UI 对话框关闭时触发",
    how: "只读通知",
    usecase: "计算用户响应时间、记录交互历史",
  },

  // 轮次事件
  turn_start: {
    when: "每个轮次（LLM 响应 + 工具调用）开始时触发",
    how: "读取 event.turnIndex",
    usecase: "Git 检查点、记录轮次开始、触发轮次前检查",
  },
  turn_end: {
    when: "每个轮次结束时触发",
    how: "读取 event.turnIndex、event.message、event.toolResults",
    usecase: "轮次统计、触发轮次后处理、自动提交",
  },

  // 消息事件
  message_start: {
    when: "消息开始处理时触发（user/assistant/toolResult）",
    how: "读取 event.message",
    usecase: "消息统计、自定义渲染准备",
  },
  message_update: {
    when: "assistant 流式更新时触发",
    how: "读取 event.message 和 event.assistantMessageEvent",
    usecase: "实时显示进度、流式日志记录",
  },
  message_end: {
    when: "消息处理完成时触发",
    how: "返回 { message } 可替换最终消息（需保持相同 role）",
    usecase: "修改消息内容、注入元数据、成本计算",
  },

  // 工具执行事件
  tool_execution_start: {
    when: "工具开始执行时触发",
    how: "读取 event.toolName、event.toolCallId、event.args",
    usecase: "工具调用日志、性能监控、权限检查",
  },
  tool_execution_update: {
    when: "工具执行过程中更新时触发",
    how: "读取 event.partialResult",
    usecase: "显示进度、流式输出",
  },
  tool_execution_end: {
    when: "工具执行完成时触发",
    how: "读取 event.result、event.isError",
    usecase: "结果缓存、错误处理、统计执行时间",
  },

  // Context 事件
  context: {
    when: "每次 LLM 调用之前触发",
    how: "返回 { messages } 修改消息（深拷贝，可安全修改）",
    usecase: "过滤敏感信息、注入额外上下文、消息裁剪",
  },

  // 提供者请求事件
  before_provider_headers: {
    when: "HTTP headers 组装完成后触发",
    how: "直接修改 event.headers（设为 null 可删除）",
    usecase: "添加追踪 headers、注入认证信息、删除敏感 headers",
  },
  before_provider_request: {
    when: "payload 构建完成后、请求发送之前触发",
    how: "返回替换的 payload，或 undefined 保持不变",
    usecase: "调试 payload、修改 temperature、注入缓存控制",
  },
  after_provider_response: {
    when: "收到 HTTP 响应后、流 body 消费之前触发",
    how: "读取 event.status 和 event.headers",
    usecase: "处理限流（429）、记录响应时间、调试 headers",
  },

  // 模型事件
  model_select: {
    when: "通过 /model、Ctrl+P 或会话恢复更改模型时触发",
    how: "读取 event.model 和 event.previousModel",
    usecase: "更新状态栏、执行模型特定初始化、记录模型切换",
  },
  thinking_level_select: {
    when: "思考级别更改时触发",
    how: "读取 event.level 和 event.previousLevel",
    usecase: "更新状态显示、记录思考级别变化",
  },

  // 工具事件
  tool_call: {
    when: "工具执行之前触发（可阻止）",
    how: "返回 { block: true, reason, terminate } 阻止工具；修改 event.input 可修补参数",
    usecase: "权限门控、危险命令拦截、参数验证、路径保护",
  },
  tool_result: {
    when: "工具执行完成后触发（可修改结果）",
    how: "返回 { content, details, isError, usage } 修改结果",
    usecase: "结果后处理、敏感信息过滤、结果缓存、添加元数据",
  },

  // 用户 Bash 事件
  user_bash: {
    when: "用户执行 ! 或 !! 命令时触发",
    how: "返回 { operations } 提供自定义操作，或 { result } 直接返回结果",
    usecase: "SSH 远程执行、沙箱化命令、命令审计",
  },
};

function log(event: string, data: Record<string, unknown> = {}) {
  const time = new Date().toISOString().slice(11, 23);
  const info = EVENT_INFO[event];

  // 输出事件名称和数据
  const entries = Object.entries(data)
    .map(([k, v]) => {
      if (v === undefined || v === null) return "";
      if (typeof v === "string") return `${k}="${v.slice(0, 50)}"`;
      if (typeof v === "object") return `${k}=${JSON.stringify(v).slice(0, 80)}`;
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .join(" ");

  console.log(`${TAG} ${CYAN}${time}${RESET} ${GREEN}${event}${RESET} ${entries}`);

  // 输出事件说明
  if (info) {
    console.log(`     ${GRAY}├─ 触发: ${YELLOW}${info.when}${RESET}`);
    console.log(`     ${GRAY}├─ 用法: ${BLUE}${info.how}${RESET}`);
    console.log(`     ${GRAY}└─ 场景: ${info.usecase}${RESET}`);
  }
  console.log("");
}

function printEventOverview() {
  console.log("");
  console.log(`${TAG} ${GREEN}=== hellopi 扩展已加载 ===${RESET}`);
  console.log(`${TAG} 监听 ${Object.keys(EVENT_INFO).length} 个生命周期事件`);
  console.log(`${TAG} 每个事件触发时会输出详细说明`);
  console.log("");
  console.log(`${TAG} ${CYAN}事件概览:${RESET}`);

  const categories: Record<string, string[]> = {
    "启动与资源": ["project_trust", "resources_discover"],
    "会话事件": ["session_start", "session_info_changed", "session_before_switch", "session_before_fork", "session_before_compact", "session_compact", "session_compact_failed", "session_before_tree", "session_tree", "session_shutdown"],
    "Agent 事件": ["input", "before_agent_start", "agent_start", "agent_end", "agent_settled"],
    "UI 提示": ["ui_prompt_start", "ui_prompt_end"],
    "轮次事件": ["turn_start", "turn_end"],
    "消息事件": ["message_start", "message_update", "message_end"],
    "工具执行": ["tool_execution_start", "tool_execution_update", "tool_execution_end"],
    "Context": ["context"],
    "提供者请求": ["before_provider_headers", "before_provider_request", "after_provider_response"],
    "模型事件": ["model_select", "thinking_level_select"],
    "工具事件": ["tool_call", "tool_result"],
    "用户 Bash": ["user_bash"],
  };

  for (const [category, events] of Object.entries(categories)) {
    console.log(`     ${YELLOW}${category}:${RESET}`);
    for (const e of events) {
      const info = EVENT_INFO[e];
      if (info) {
        console.log(`       ${GREEN}${e}${RESET} - ${info.usecase}`);
      }
    }
  }
  console.log("");
  console.log(`${TAG} 开始监听事件...`);
  console.log("─".repeat(80));
}

export default function (pi: ExtensionAPI) {
  // 启动时输出事件概览
  printEventOverview();

  // ============ 启动与资源事件 ============

  pi.on("project_trust", async (event) => {
    log("project_trust", { cwd: event.cwd });
    return { trusted: "undecided" };
  });

  pi.on("resources_discover", async (event) => {
    log("resources_discover", { cwd: event.cwd, reason: event.reason });
    return { skillPaths: [], promptPaths: [], themePaths: [] };
  });

  // ============ 会话事件 ============

  pi.on("session_start", async (event) => {
    log("session_start", { reason: event.reason, previousSessionFile: event.previousSessionFile });
  });

  pi.on("session_info_changed", async (event) => {
    log("session_info_changed", { name: event.name });
  });

  pi.on("session_before_switch", async (event) => {
    log("session_before_switch", { reason: event.reason, targetSessionFile: event.targetSessionFile });
  });

  pi.on("session_before_fork", async (event) => {
    log("session_before_fork", { entryId: event.entryId, position: event.position });
  });

  pi.on("session_before_compact", async (event) => {
    log("session_before_compact", { reason: event.reason, willRetry: event.willRetry });
  });

  pi.on("session_compact", async (event) => {
    log("session_compact", { fromExtension: event.fromExtension, reason: event.reason });
  });

  pi.on("session_compact_failed", async (event) => {
    log("session_compact_failed", { reason: event.reason, aborted: event.aborted });
  });

  pi.on("session_before_tree", async (event) => {
    log("session_before_tree");
  });

  pi.on("session_tree", async (event) => {
    log("session_tree", { newLeafId: event.newLeafId, oldLeafId: event.oldLeafId });
  });

  pi.on("session_shutdown", async (event) => {
    log("session_shutdown", { reason: event.reason });
  });

  // ============ Agent 事件 ============

  pi.on("input", async (event) => {
    log("input", { text: event.text?.slice(0, 100), source: event.source });
  });

  pi.on("before_agent_start", async (event) => {
    log("before_agent_start", { prompt: event.prompt?.slice(0, 100) });
  });

  pi.on("agent_start", async () => {
    log("agent_start");
  });

  pi.on("agent_end", async (event) => {
    log("agent_end", { messageCount: event.messages?.length });
  });

  pi.on("agent_settled", async () => {
    log("agent_settled");
  });

  // ============ UI 提示事件 ============

  pi.on("ui_prompt_start", async (event) => {
    log("ui_prompt_start", { kind: event.kind, title: event.title });
  });

  pi.on("ui_prompt_end", async (event) => {
    log("ui_prompt_end", { kind: event.kind });
  });

  // ============ 轮次事件 ============

  pi.on("turn_start", async (event) => {
    log("turn_start", { turnIndex: event.turnIndex });
  });

  pi.on("turn_end", async (event) => {
    log("turn_end", { turnIndex: event.turnIndex, toolCount: event.toolResults?.length });
  });

  // ============ 消息事件 ============

  pi.on("message_start", async (event) => {
    log("message_start", { role: event.message?.role });
  });

  pi.on("message_update", async (event) => {
    log("message_update", { role: event.message?.role });
  });

  pi.on("message_end", async (event) => {
    log("message_end", { role: event.message?.role });
  });

  // ============ 工具执行事件 ============

  pi.on("tool_execution_start", async (event) => {
    log("tool_execution_start", { toolName: event.toolName, toolCallId: event.toolCallId });
  });

  pi.on("tool_execution_update", async (event) => {
    log("tool_execution_update", { toolName: event.toolName });
  });

  pi.on("tool_execution_end", async (event) => {
    log("tool_execution_end", { toolName: event.toolName, isError: event.isError });
  });

  // ============ Context 事件 ============

  pi.on("context", async (event) => {
    log("context", { messageCount: event.messages?.length });
  });

  // ============ 提供者请求事件 ============

  pi.on("before_provider_headers", async (event) => {
    log("before_provider_headers", { headerKeys: Object.keys(event.headers || {}) });
  });

  pi.on("before_provider_request", async (event) => {
    log("before_provider_request", { hasPayload: !!event.payload });
  });

  pi.on("after_provider_response", async (event) => {
    log("after_provider_response", { status: event.status });
  });

  // ============ 模型事件 ============

  pi.on("model_select", async (event) => {
    log("model_select", {
      model: `${event.model?.provider}/${event.model?.id}`,
      source: event.source,
    });
  });

  pi.on("thinking_level_select", async (event) => {
    log("thinking_level_select", { level: event.level });
  });

  // ============ 工具事件 ============

  pi.on("tool_call", async (event) => {
    log("tool_call", { toolName: event.toolName, toolCallId: event.toolCallId });
  });

  pi.on("tool_result", async (event) => {
    log("tool_result", { toolName: event.toolName, isError: event.isError });
  });

  // ============ 用户 Bash 事件 ============

  pi.on("user_bash", async (event) => {
    log("user_bash", { command: event.command });
  });
}
// [AGC:END]
