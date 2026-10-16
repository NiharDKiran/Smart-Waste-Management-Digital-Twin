import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'http';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Strip the backend Permissions-Policy header so it doesn't block
        // the browser's getUserMedia() camera API on the frontend origin.
        configure: (proxy: any) => {
          proxy.on('proxyRes', (proxyRes: IncomingMessage) => {
            delete proxyRes.headers['permissions-policy'];
          });
        },
      },
    },
  },
});
