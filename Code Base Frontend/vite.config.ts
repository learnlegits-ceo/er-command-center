import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Read .env from the repo root so a single root .env drives everything.
  // In Docker, the compose file injects VITE_* vars directly into the process.
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 3000,
  },
})
