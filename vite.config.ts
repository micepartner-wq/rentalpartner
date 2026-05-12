import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              const normalizedId = id.split(path.sep).join('/');

              if (!normalizedId.includes('/node_modules/')) {
                return undefined;
              }

              const modulePath = normalizedId.split('/node_modules/')[1];
              const moduleName = modulePath.startsWith('@')
                ? modulePath.split('/').slice(0, 2).join('/')
                : modulePath.split('/')[0];

              if (
                moduleName === 'cookie' ||
                moduleName === 'set-cookie-parser' ||
                moduleName === 'react-router-dom' ||
                moduleName === 'tabbable'
              ) {
                return undefined;
              }

              return `vendor-${moduleName.replace('@', '').replace('/', '-')}`;
            },
          },
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
