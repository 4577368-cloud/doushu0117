/**
 * LLM 优先级调用链（纯 JS，兼容 Vercel Serverless）
 */

function readModelEnv(env, i, field) {
  return env[`LLM_${i}_${field}`] ?? env[`LLM_MODEL${i}_${field}`];
}

export function loadLLMConfigs(env = process.env) {
  const configs = [];

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

export function resolveChatEndpoint(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized}/chat/completions`;
}

function getPerModelTimeoutMs(env, override, modelCount) {
  if (override !== undefined) return override;

  const configured = parseInt(env.LLM_TIMEOUT_MS || '45000', 10);
  const safeConfigured = Number.isFinite(configured) && configured > 0 ? configured : 45000;

  if (env.VERCEL) {
    const maxSec = parseInt(env.VERCEL_FUNCTION_MAX_DURATION || '10', 10);
    if (maxSec <= 10) {
      const totalBudget = maxSec * 1000 - 2000;
      const perModel = Math.floor(totalBudget / Math.max(modelCount, 1));
      return Math.min(safeConfigured, Math.max(perModel, 2500));
    }
  }

  return safeConfigured;
}

export async function callLLMWithFallback(options, env = process.env) {
  const configs = loadLLMConfigs(env);

  if (configs.length === 0) {
    throw new Error(
      '未配置 LLM 模型。请设置 LLM_MODEL1_MODEL_ID / LLM_MODEL1_API_KEY / LLM_MODEL1_BASE_URL'
    );
  }

  const timeoutMs = getPerModelTimeoutMs(env, options.timeoutMs, configs.length);
  const errors = [];

  for (const config of configs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const endpoint = resolveChatEndpoint(config.baseUrl);
      const body = {
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
    } catch (err) {
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

export async function pipeStreamResponse(upstream, write, end) {
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
