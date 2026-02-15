import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx, defineManifest } from '@crxjs/vite-plugin';
import { resolve } from 'path';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'Spatial Browsing Map',
  description: 'Transform your browsing history into an interactive visual map.',
  version: '1.0.0',
  icons: {
    '16': 'icons/icon16.png',
    '32': 'icons/icon32.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Spatial Browsing Map',
    default_icon: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: [
    'tabs',
    'activeTab',
    'storage',
    'webNavigation',
  ],
  host_permissions: ['<all_urls>'],
  chrome_url_overrides: {},
});

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: {
        map: resolve(__dirname, 'src/map/index.html'),
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
});