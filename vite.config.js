import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // Relative base for universal deployment (Vercel, GitHub Pages, etc.)
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline', // Ensure SW is registered automatically
      manifest: {
        id: '/Material-List-Pro/', // Consistent ID for the PWA
        start_url: './',
        scope: './',
        name: 'Material List Pro',
        short_name: 'MatList Pro',
        description: 'App profesional para gestión de listas de materiales de construcción.',
        theme_color: '#0dccf2',
        background_color: '#101f22',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
