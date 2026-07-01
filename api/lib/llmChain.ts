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

  // 兼容旧版单一 DeepSeek 配置
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

function getTimeoutMs(env: Record<string, string | undefined>, override?: number): number {
  if (override !== undefined) return override;
  const parsed = parseInt(env.LLM_TIMEOUT_MS || '45000', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 45000;
}

/**
 * 按优先级调用 LLM，超时或 HTTP 错误时自动降级到下一个模型
 * @returns 成功的 fetch Response（通常为流式）及实际使用的模型信息
 */
export async function callLLMWithFallback(
  options: LLMRequestOptions,
  env: Record<string, string | undefined> = process.env
): Promise<LLMCallResult> {
  const configs = loadLLMConfigs(env);

  if (configs.length === 0) {
    throw new Error(
      '未配置 LLM 模型。请在 .env.local 中设置 LLM_1_MODEL_ID / LLM_1_API_KEY / LLM_1_BASE_URL（至少一组）'
    );
  }

  const timeoutMs = getTimeoutMs(env, options.timeoutMs);
  const errors: string[] = [];

  for (const config of configs) {
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

  throw new Error(`所有 LLM 模型均失败:\n${errors.join('\n')}`);
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
  // @ts-ignore — Node ReadableStream 兼容
  for await (const chunk of upstream.body) {
    write(chunk);
  }
  end();
}
