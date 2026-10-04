import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { developmentCsp } from './src/main/security/policy'

export default defineConfig({
  main: {},
  preload: {
    build: {
      externalizeDeps: false,
      rollupOptions: {
        output: { format: 'cjs', entryFileNames: 'index.cjs', inlineDynamicImports: true }
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: { minify: true },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      headers: { 'Content-Security-Policy': developmentCsp }
    }
  }
})
