/**
 * VITE CONFIGURATION FOR TLDRIT
 * 
 * This file configures the development server and build process for TLDRit.
 * 
 * KEY FEATURES:
 * - PWA support with service worker and manifest
 * - Development proxy routing for API calls
 * - React and TypeScript support
 * 
 * PROXY CONFIGURATION:
 * - /api/extract-url → Supabase function (URL content extraction)
 * - /api/text-to-speech → Netlify function (audio generation)
 * - /api/process-file → Production Netlify function (PDF/file processing)
 * - /api/rss-proxy → Production Netlify function (RSS proxy for CORS)
 * 
 * The process-file endpoint uses the production Netlify function because:
 * 1. PDF processing libraries aren't compatible with Supabase Edge Runtime
 * 2. This ensures consistent PDF processing in both dev and production
 * 3. Local development gets the same reliable file processing as production
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL;

  return {
    base: '/',
    publicDir: 'public',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['tldrit-favicon.png', 'TLDRit-icon.png', 'TLDRit-logo.png'],
        manifest: {
          name: 'TLDRit - AI Summarization',
          short_name: 'TLDRit',
          description: 'AI-powered summarization for articles, documents, and web content',
          theme_color: '#4285F4',
          icons: [
            {
              src: '/TLDRit-icon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/TLDRit-icon.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/TLDRit-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff'
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/tldrit\.app\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'tldrit-dynamic',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60 // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//]
        }
      })
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      port: 5177,
      proxy: supabaseUrl ? {
        '/api/extract-url': {
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
        },
        '/api/text-to-speech': {
          target: 'https://tldrit.netlify.app',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/text-to-speech/, '/.netlify/functions/text-to-speech.mjs'),
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
        },
        '/api/process-file': {
          target: 'https://tldrit.netlify.app',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'),
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
        },
        '/api/rss-proxy': {
          target: 'https://tldrit.netlify.app',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'),
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('proxy error', err);
            });
          }
        }
      } : undefined
    }
  };
});
