
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ==============================
// ✅ PWA Service Worker 注册（安全、无报错）
// ==============================
if ('serviceWorker' in navigator) {
  const isProduction =
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.PROD);

  const isVercel = window.location.hostname.endsWith('vercel.app');

  if (isProduction && !isVercel) {
    window.addEventListener('load', () => {
      const swPath = './sw.js';

      navigator.serviceWorker
        .register(swPath)
        .then((registration) => {
          console.log('PWA Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.warn('PWA Service Worker registration failed:', error);
        });
    });
  }
}
