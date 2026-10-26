import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    // Docker Desktop on macOS does not propagate filesystem events across
    // bind mounts, so chokidar's native watcher misses edits and HMR never
    // fires. Polling is required for hot reload to work inside the container.
    watch: { usePolling: true, interval: 200 },
  },
  resolve: {
    alias: {
      '@eventflow/i18n/react': path.resolve(__dirname, '../../packages/i18n/src/react/index.ts'),
      '@eventflow/i18n/next': path.resolve(__dirname, '../../packages/i18n/src/next/index.ts'),
      '@eventflow/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@api': path.resolve(__dirname, './src/api'),
      '@app': path.resolve(__dirname, './src/app'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@features': path.resolve(__dirname, './src/features'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
          ],
        },
      },
    },
  },
})
