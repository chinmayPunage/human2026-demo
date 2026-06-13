import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // Bind on all interfaces — required for Tailscale VPN mesh access
    port: 5173,
    open: false,
  },
})
