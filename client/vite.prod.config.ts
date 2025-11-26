import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Production build configuration - excludes problematic shared modules
export default defineConfig({
  plugins: [
    react({
      // Exclude shared modules from JSX processing
      exclude: [/node_modules/, /shared/]
    })
  ],
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      external: [
        // All shared modules - externalize completely
        '@shared/*',
        '../shared/*',
        './shared/*',
        'shared/*',
        // Specific problematic imports
        '@shared/schema',
        '../shared/schema',
        'fs',
        'path',
        'crypto',
        'util',
        'os',
        'events',
        'stream',
        'buffer'
      ],
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          ui: [
            '@radix-ui/react-tabs',
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-button',
            '@radix-ui/react-card',
            '@radix-ui/react-badge',
            '@radix-ui/react-progress',
            '@radix-ui/react-alert'
          ],
          state: ['@tanstack/react-query', 'wouter'],
          forms: ['react-hook-form', '@hookform/resolvers'],
          utils: ['zod', 'date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    minify: 'esbuild',
    target: 'es2015'
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@api": path.resolve(__dirname, "./src/api"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@contexts": path.resolve(__dirname, "./src/contexts")
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'wouter',
      'zod'
    ],
    exclude: [
      '@shared/*',
      '../shared/*',
      './shared/*',
      'shared/*'
    ]
  },
  define: {
    __DEV__: 'false',
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'process.env.NODE_ENV': '"production"'
  }
})