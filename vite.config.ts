import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tapeout-api': {
        target: 'https://tapeout.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tapeout-api/, ''),
      },
    },
  },
})
