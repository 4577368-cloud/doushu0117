import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callLLMWithFallback, pipeStreamResponse } from './_lib/llmChain';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages } = req.body;

    const { response, model } = await callLLMWithFallback({
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Content-Encoding', 'none');
    res.setHeader('X-LLM-Model', model.modelId);
    res.setHeader('X-LLM-Name', encodeURIComponent(model.name));

    await pipeStreamResponse(
      response,
      (chunk) => res.write(chunk),
      () => res.end()
    );
  } catch (error: unknown) {
    console.error('Chat Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' });
    } else {
      res.end();
    }
  }
}
