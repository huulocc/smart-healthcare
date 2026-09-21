import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The RAG service (python rag/server.py) serves these paths itself, so no
      // rewrite is needed. Going through the proxy keeps the browser on one
      // origin, which is why the service needs no CORS setup for the app.
      //
      // When Spring Boot takes over this route, only `target` changes here -
      // the React code calls /api/chat either way.
      '/api/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Generation currently takes over a minute with thinking enabled, which
        // is past Node's default socket timeout. Without these, a slow answer
        // dies in the proxy and the widget reports a network error.
        timeout: 180000,
        proxyTimeout: 180000,
      },
    },
  },
})
