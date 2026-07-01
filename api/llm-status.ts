import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadLLMConfigs } from '../lib/llmChain';

/** 诊断接口：检查 Vercel 是否正确加载了 LLM 环境变量（不发起真实请求） */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const configs = loadLLMConfigs();
  res.status(200).json({
    ok: configs.length > 0,
    count: configs.length,
    models: configs.map(c => ({ name: c.name, modelId: c.modelId, baseUrl: c.baseUrl.replace(/\/v1\/?$/, '/***') })),
    vercel: !!process.env.VERCEL,
    timeoutMs: process.env.LLM_TIMEOUT_MS || '(default)',
  });
}
