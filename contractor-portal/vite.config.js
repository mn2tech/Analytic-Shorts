import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    // strictPort: PKCE verifier lives in localStorage per origin (scheme+host+port).
    // If Vite silently switches ports, Supabase may still redirect to an allowlisted URL on another port → "code verifier not found".
    port: Number(process.env.VITE_DEV_PORT || 5175),
    strictPort: true,
    host: true,
  },
})
