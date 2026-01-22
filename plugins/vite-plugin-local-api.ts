
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Local API Middleware Plugin
 * Intercepts /api/analyze requests and handles them locally to bypass remote server issues.
 */
export function localApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/analyze', async (req: IncomingMessage, res: ServerResponse, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        console.log('[Local API] Intercepting /api/analyze request...');

        try {
          // 1. Parse Request Body
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(Buffer.from(chunk));
          }
          const rawBody = Buffer.concat(buffers).toString('utf-8');
          
          let body;
          try {
            body = JSON.parse(rawBody);
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            return;
          }

          const { messages, model, response_format, apiKey: userApiKey } = body;
          // Note: In local dev, we might not have process.env.DEEPSEEK_API_KEY populated 
          // unless we load .env. Vite loads it into import.meta.env but not process.env automatically here.
          // But usually the client sends the key if configured.
          const finalApiKey = userApiKey; // || process.env.DEEPSEEK_API_KEY; 

          if (!finalApiKey) {
            console.error('[Local API] No API Key provided');
            res.statusCode = 401;
            res.end(JSON.stringify({ error: '未配置 API Key。请在设置中输入 DeepSeek API Key。' }));
            return;
          }

          console.log('[Local API] Forwarding to DeepSeek...');

          // 2. Call DeepSeek API
          const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${finalApiKey.trim()}`
            },
            body: JSON.stringify({
              model: model || 'deepseek-chat',
              messages: messages,
              temperature: 0.7,
              stream: true,
              response_format: response_format
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[Local API] DeepSeek Error:', response.status, errorText);
            throw new Error(`DeepSeek API Error: ${response.status} - ${errorText}`);
          }

          // 3. Stream Response
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          if (response.body) {
             // @ts-ignore
             const reader = response.body.getReader();
             const decoder = new TextDecoder();
             
             while (true) {
               const { done, value } = await reader.read();
               if (done) break;
               const chunk = decoder.decode(value, { stream: true });
               res.write(chunk);
             }
          }
          res.end();
          console.log('[Local API] Request completed successfully.');

        } catch (error: any) {
          console.error('[Local API] Handler Error:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message || 'Local Server Error' }));
          } else {
            res.end();
          }
        }
      });
    }
  };
}
