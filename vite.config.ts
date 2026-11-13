import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Sign-in and saving need the Worker: run `npx wrangler dev` alongside `npm run dev`
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  test: { environment: 'node' },
})
