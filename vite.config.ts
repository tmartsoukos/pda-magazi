import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/pda-magazi/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'PDA Παραγγελιοληψία',
        short_name: 'PDA',
        description: 'Παραγγελιοληψία μαγαζιού',
        lang: 'el',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1a1d24',
        background_color: '#1a1d24',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
