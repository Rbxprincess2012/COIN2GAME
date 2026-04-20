import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:4000'
    },
    // serve index.html for all routes (SPA)
    historyApiFallback: true,
  },
  preview: {
    port: 4173
  }
})
