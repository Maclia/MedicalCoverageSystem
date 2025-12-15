import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Production-specific Vite configuration
export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      external: [
        '@shared/schema',
        '../shared/schema',
        // All Node.js built-ins should be external in browser build
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
          // Core React libraries
          react: ['react', 'react-dom'],
          // UI component libraries
          ui: [
            '@radix-ui/react-tabs',
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-button',
            '@radix-ui/react-card',
            '@radix-ui/react-badge'
          ],
          // State management and routing
          state: ['@tanstack/react-query', 'wouter'],
          // Form handling
          forms: ['react-hook-form', '@hookform/resolvers'],
          // Utilities
          utils: ['zod', 'date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    minify: 'esbuild',
    target: 'es2015'
  },
  // Enable tree shaking
  rollupOptions: {
    treeshake: 'smallest'
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
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
  // Production optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'wouter',
      'zod'
    ],
    exclude: ['@shared/schema']
  },
  define: {
    __DEV__: 'false',
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'process.env.NODE_ENV': '"production"'
  }
})