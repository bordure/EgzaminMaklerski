import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [],
    },
    commonjsOptions: {
      include: [/node_modules/],
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  }
})