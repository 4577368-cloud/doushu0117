import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'https://doushu.us.kg',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
