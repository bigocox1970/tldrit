import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
        manifest: {
          name: 'TLDRit - AI Summarization',
          short_name: 'TLDRit',
          description: 'AI-powered summarization for articles, documents, and web content',
          theme_color: '#4285F4',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: supabaseUrl ? {
        '/api': {
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/functions/v1'),
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              const authHeader = req.headers.authorization;
              if (authHeader) {
                proxyReq.setHeader('Authorization', authHeader);
              }
            });
          }
        }
      } : undefined
    }
  };
});