import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callLLMWithFallback, pipeStreamResponse } from './lib/llmChain';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, response_format } = req.body;

    const { response, model } = await callLLMWithFallback({
      messages,
      temperature: 0.7,
      stream: true,
      response_format,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-LLM-Model', model.modelId);
    res.setHeader('X-LLM-Name', encodeURIComponent(model.name));

    await pipeStreamResponse(
      response,
      (chunk) => res.write(chunk),
      () => res.end()
    );
  } catch (error: unknown) {
    console.error('Analyze Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Server Error' });
    } else {
      res.end();
    }
  }
}
