import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We manually register /public/sw.js so disable auto-registration
      // to avoid conflicts with the Vite PWA dev stub
      registerType: 'prompt',
      injectRegister: null,
      // Use the manifest only — our real SW lives in /public/sw.js
      manifest: {
        name: 'BudgetWise',
        short_name: 'BudgetWise',
        description: 'Smart and beautiful budget tracking',
        theme_color: '#10b981',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      devOptions: {
        enabled: false  // Disable dev SW so it doesn't override our /public/sw.js
      }
    })
  ],
})

