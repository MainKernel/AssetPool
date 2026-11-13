import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv, type PluginOption } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const plugins: PluginOption[] = [react()];

  if (process.env.ANALYZE === 'true') {
    plugins.push(
      visualizer({
        filename: '../../docs/perf/bundle-stats.html',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    );
  }

  return {
    plugins,
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
