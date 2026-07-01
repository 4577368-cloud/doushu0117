
import type { Plugin, ViteDevServer } from 'vite';
import { loadEnv } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { callLLMWithFallback, pipeStreamResponse } from '../api/lib/llmChain';

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const buffers: Buffer[] = [];
  for await (const chunk of req) {
    buffers.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(buffers).toString('utf-8');
  return JSON.parse(raw);
}

function handleLLMRoute(
  routeName: string,
  env: Record<string, string>,
  buildOptions: (body: Record<string, unknown>) => Parameters<typeof callLLMWithFallback>[0]
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const body = await readJsonBody(req);
      console.log(`[Local API] ${routeName} — 开始 LLM 调用链`);

      const { response, model } = await callLLMWithFallback(buildOptions(body), env);

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
      console.log(`[Local API] ${routeName} — 完成 (${model.modelId})`);
    } catch (error: unknown) {
      console.error(`[Local API] ${routeName} Error:`, error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Local Server Error' }));
      } else {
        res.end();
      }
    }
  };
}

/**
 * 本地开发 API 中间件
 * 拦截 /api/analyze 和 /api/chat，使用 .env.local 中的 LLM 配置走优先级降级链路
 */
export function localApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-local-api',
    configureServer(server: ViteDevServer) {
      const env = loadEnv(server.config.mode, server.config.root, '');

      const analyzeHandler = handleLLMRoute('analyze', env, (body) => ({
        messages: body.messages as Array<{ role: string; content: string }>,
        temperature: 0.7,
        stream: true,
        response_format: body.response_format as { type: string } | undefined,
      }));

      const chatHandler = handleLLMRoute('chat', env, (body) => ({
        messages: body.messages as Array<{ role: string; content: string }>,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }));

      server.middlewares.use('/api/analyze', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        await analyzeHandler(req, res);
      });

      server.middlewares.use('/api/chat', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        await chatHandler(req, res);
      });
    },
  };
}
