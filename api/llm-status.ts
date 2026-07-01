import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const { loadLLMConfigs } = await import('../lib/llmChain.js');
    const configs = loadLLMConfigs();
    res.status(200).json({
      ok: configs.length > 0,
      count: configs.length,
      models: configs.map(c => ({ name: c.name, modelId: c.modelId })),
      vercel: !!process.env.VERCEL,
      timeoutMs: process.env.LLM_TIMEOUT_MS || '(default)',
    });
  } catch (error: unknown) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.name : 'Unknown',
    });
  }
}
