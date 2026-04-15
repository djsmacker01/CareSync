import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Enable service worker in dev so you can test offline behaviour locally
      devOptions: { enabled: true },
      workbox: {
        // Pre-cache the app shell + all static assets
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        // Runtime caching: cache Supabase REST reads so MAR works offline
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/rest/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-rest',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'CareSync',
        short_name: 'CareSync',
        description: 'UK Care Home Management — MAR, stock, tasks, fire safety & visitors',
        theme_color: '#0d9488',      // teal
        background_color: '#0f172a', // navy
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
        shortcuts: [
          {
            name: 'MAR Chart',
            short_name: 'MAR',
            url: '/mar',
            description: 'Open the medication administration record',
          },
          {
            name: 'Task Board',
            short_name: 'Tasks',
            url: '/tasks',
            description: 'View and complete shift tasks',
          },
        ],
        categories: ['medical', 'productivity'],
      },
    }),
  ],
})
