import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // API_PROXY_TARGET can be overridden in frontend/.env.local (e.g. when port 8080 is taken on your machine).
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // The RAG service (python rag/server.py) serves these paths itself, so no
        // rewrite is needed. Going through the proxy keeps the browser on one
        // origin, which is why the service needs no CORS setup for the app.
        //
        // This key must stay above '/api': Vite matches proxy keys in insertion
        // order, so the Spring Boot rule would otherwise swallow /api/chat.
        '/api/chat': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          // Generation currently takes over a minute with thinking enabled, which
          // is past Node's default socket timeout. Without these, a slow answer
          // dies in the proxy and the widget reports a network error.
          timeout: 180000,
          proxyTimeout: 180000,
        },
        '/api': env.API_PROXY_TARGET || 'http://localhost:8080',
      },
    },
  }
})

