import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/vrpc-js/', // Tells Vite to prepend this to all asset paths
  plugins: [react()],
  assetsInclude: ['**/*.md'],
  server: {
    fs: {
      allow: ['..']
    }
  }
})
