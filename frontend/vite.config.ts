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
        '/api': env.API_PROXY_TARGET || 'http://localhost:8080',
      },
    },
  }
})
