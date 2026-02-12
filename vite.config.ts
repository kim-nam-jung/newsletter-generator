/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react-quill-new'],
  },
  test: {
    exclude: ['tests/**', 'node_modules/**'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**', 'server/lib/**'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.css',
        'src/**/*.svg',
        'src/main.tsx',
        'src/App.tsx',
        'src/types.ts',
        'src/declarations.d.ts',
        'src/assets/**',
        'src/services/pdf-client-processor.ts',
        'src/components/**',
      ],
    },
  },
})
