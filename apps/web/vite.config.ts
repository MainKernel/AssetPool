import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api':
          env.VITE_USE_MOCK === 'true'
            ? {
                target: 'http://localhost:4010',
                rewrite: (p) => p.replace(/^\/api/, ''),
              }
            : { target: 'http://localhost:3000', changeOrigin: true },
      },
    },
    build: { sourcemap: false, target: 'es2022' },
  };
});
