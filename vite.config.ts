import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localApiPlugin } from './plugins/vite-plugin-local-api';

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  build: {
    sourcemap: true,
    minify: false
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
    // api/lib 变更走本地中间件，无需重启 dev server（避免 WebSocket 断开）
    watch: {
      ignored: ['**/api/**', '!**/lib/**'],
    },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'https://doushu.us.kg',
        changeOrigin: true,
        secure: false,
        // 本地中间件已处理的 analyze/chat 不走远程代理
        bypass(req) {
          const url = req.url || '';
          if (url.startsWith('/api/analyze') || url.startsWith('/api/chat')) {
            return url;
          }
        },
      }
    }
  }
});
