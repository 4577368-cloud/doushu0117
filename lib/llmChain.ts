/**
 * LLM 优先级调用链
 * 按 LLM_1 → LLM_2 → LLM_3 顺序请求，超时或失败自动切换下一个模型
 */

export interface LLMModelConfig {
  priority: number;
  name: string;
  modelId: string;
  apiKey: string;
  baseUrl: string;
}

export interface LLMRequestOptions {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
  stream?: boolean;
  timeoutMs?: number;
}

export interface LLMCallResult {
  response: Response;
  model: LLMModelConfig;
}

/** 读取第 N 个模型的环境变量（兼容 LLM_1_* 与 LLM_MODEL1_* 两种命名） */
function readModelEnv(env: Record<string, string | undefined>, i: number, field: string): string | undefined {
  return env[`LLM_${i}_${field}`] ?? env[`LLM_MODEL${i}_${field}`];
}

/** 从环境变量加载已配置的模型列表（按优先级排序） */
export function loadLLMConfigs(env: Record<string, string | undefined> = process.env): LLMModelConfig[] {
  const configs: LLMModelConfig[] = [];

  for (let i = 1; i <= 3; i++) {
    const modelId = readModelEnv(env, i, 'MODEL_ID');
    const apiKey = readModelEnv(env, i, 'API_KEY');
    const baseUrl = readModelEnv(env, i, 'BASE_URL');
    if (modelId && apiKey && baseUrl) {
      configs.push({
        priority: i,
        name: readModelEnv(env, i, 'NAME') ?? readModelEnv(env, i, 'LABEL') ?? `模型 ${i}`,
        modelId,
        apiKey,
        baseUrl,
      });
    }
  }

  if (configs.length === 0 && env.DEEPSEEK_API_KEY) {
    configs.push({
      priority: 1,
      name: 'DeepSeek',
      modelId: 'deepseek-chat',
      apiKey: env.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com',
    });
  }

  return configs.sort((a, b) => a.priority - b.priority);
}

/** 拼接 OpenAI 兼容的 chat/completions 端点 */
export function resolveChatEndpoint(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized}/chat/completions`;
}

/** Vercel 免费版函数上限 10s，需为多次降级留出时间 */
function getPerModelTimeoutMs(
  env: Record<string, string | undefined>,
  override: number | undefined,
  modelCount: number
): number {
  if (override !== undefined) return override;

  const configured = parseInt(env.LLM_TIMEOUT_MS || '45000', 10);
  const safeConfigured = Number.isFinite(configured) && configured > 0 ? configured : 45000;

  if (env.VERCEL) {
    const maxSec = parseInt(env.VERCEL_FUNCTION_MAX_DURATION || '10', 10);
    const totalBudget = Math.max(maxSec * 1000 - 2000, 6000);
    const perModel = Math.floor(totalBudget / Math.max(modelCount, 1));
    return Math.min(safeConfigured, Math.max(perModel, 2500));
  }

  return safeConfigured;
}

function isUnreachableOnVercel(baseUrl: string): boolean {
  if (!process.env.VERCEL) return false;
  try {
    const { hostname, protocol } = new URL(baseUrl);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) return true;
    const m = hostname.match(/^172\.(\d+)\./);
    if (m && +m[1] >= 16 && +m[1] <= 31) return true;
    // Vercel 无法访问内网 HTTP 服务
    if (protocol === 'http:' && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * 按优先级调用 LLM，超时或 HTTP 错误时自动降级到下一个模型
 */
export async function callLLMWithFallback(
  options: LLMRequestOptions,
  env: Record<string, string | undefined> = process.env
): Promise<LLMCallResult> {
  const configs = loadLLMConfigs(env);

  if (configs.length === 0) {
    throw new Error(
      '未配置 LLM 模型。请在环境变量中设置 LLM_MODEL1_MODEL_ID / LLM_MODEL1_API_KEY / LLM_MODEL1_BASE_URL（至少一组）'
    );
  }

  const timeoutMs = getPerModelTimeoutMs(env, options.timeoutMs, configs.length);
  const errors: string[] = [];

  for (const config of configs) {
    if (isUnreachableOnVercel(config.baseUrl)) {
      const msg = `[${config.name}/${config.modelId}] 内网地址，Vercel 无法访问，已跳过`;
      errors.push(msg);
      console.warn(`[LLM Chain] 跳过 — ${msg}`);
      continue;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const endpoint = resolveChatEndpoint(config.baseUrl);
      const body: Record<string, unknown> = {
        model: config.modelId,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        stream: options.stream ?? true,
      };
      if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;
      if (options.response_format) body.response_format = options.response_format;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const msg = `[${config.name}/${config.modelId}] HTTP ${response.status}: ${errorText.slice(0, 200)}`;
        errors.push(msg);
        console.warn(`[LLM Chain] 降级 — ${msg}`);
        continue;
      }

      console.log(`[LLM Chain] 使用模型: ${config.name} (${config.modelId})`);
      return { response, model: config };
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort
        ? `[${config.name}/${config.modelId}] 超时 (${timeoutMs}ms)`
        : `[${config.name}/${config.modelId}] ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.warn(`[LLM Chain] 降级 — ${msg}`);
    }
  }

  throw new Error(`所有 LLM 模型均失败: ${errors.join(' | ')}`);
}

/** 将上游流式响应转发到 Node ServerResponse / VercelResponse */
export async function pipeStreamResponse(
  upstream: Response,
  write: (chunk: Uint8Array | Buffer) => void,
  end: () => void
): Promise<void> {
  if (!upstream.body) {
    end();
    return;
  }
  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) write(value);
    }
  } finally {
    reader.releaseLock();
  }
  end();
}
