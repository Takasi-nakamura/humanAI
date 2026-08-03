import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// HumanAI - Vite設定
// GitHub Pagesで公開する場合は base を "/リポジトリ名/" に変更してください
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'HumanAI',
        short_name: 'HumanAI',
        description: '人間っぽいAI。人間関係を上手にサポートするAIチャットアシスタント。',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Firebase FCM の Service Worker と競合しないよう除外
        navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173
  }
})
