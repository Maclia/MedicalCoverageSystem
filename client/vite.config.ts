import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [
        // External shared modules that aren't part of the client build
        '@shared/schema',
        '../shared/schema',
        // Node.js built-in modules
        'fs',
        'path',
        'crypto',
        'util'
      ],
       output: {
         // Ensure consistent chunk naming
         manualChunks(id: string) {
           if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
             return 'vendor';
           }
           if (id.includes('@radix-ui')) {
             return 'ui';
           }
           if (id.includes('wouter')) {
             return 'router';
           }
         },
         globals: {
           '@shared/schema': 'SharedSchema'
         }
       }
    },
    // Optimize for production
    minify: 'esbuild',
    target: 'es2015'
   },
   resolve: {
      alias: [
        // Keep legacy feature aliases ahead of the generic @/ matcher.
        { find: /^@\/components\/claims/, replacement: path.resolve(rootDir, "./src/features/claims/components") },
        { find: /^@\/components\/companies/, replacement: path.resolve(rootDir, "./src/features/companies/components") },
        { find: /^@\/components\/premiums/, replacement: path.resolve(rootDir, "./src/features/finance/components") },
        { find: /^@\/components\/dependents/, replacement: path.resolve(rootDir, "./src/features/dependents/components") },
        { find: /^@\/components\/providers/, replacement: path.resolve(rootDir, "./src/features/providers/components") },
        { find: /^@\/components\/members/, replacement: path.resolve(rootDir, "./src/features/members/components") },
        { find: /^@\/components\/finance/, replacement: path.resolve(rootDir, "./src/features/finance/components") },
        { find: /^@\/components\/dashboards/, replacement: path.resolve(rootDir, "./src/features/dashboards/components") },
        { find: /^@\/components\/insurance/, replacement: path.resolve(rootDir, "./src/features/insurance/components") },
        { find: /^@\/services\/api$/, replacement: path.resolve(rootDir, "./src/services/api/index.ts") },
        { find: "@shared", replacement: path.resolve(rootDir, "../shared") },
        { find: "@components", replacement: path.resolve(rootDir, "./src/components") },
        { find: "@pages", replacement: path.resolve(rootDir, "./src/pages") },
        { find: "@utils", replacement: path.resolve(rootDir, "./src/utils") },
        { find: "@types", replacement: path.resolve(rootDir, "./src/types") },
        { find: "@hooks", replacement: path.resolve(rootDir, "./src/hooks") },
        { find: "@api", replacement: path.resolve(rootDir, "./src/services/api") },
        { find: "@services", replacement: path.resolve(rootDir, "./src/services") },
        { find: "@lib", replacement: path.resolve(rootDir, "./src/lib") },
        { find: "@contexts", replacement: path.resolve(rootDir, "./src/contexts") },
        { find: /^@\//, replacement: `${path.resolve(rootDir, "./src")}/` },
      ],
      // Ensure extensions are properly resolved
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      preserveSymlinks: false,
      conditions: ['import', 'module', 'browser', 'default'],
      mainFields: ['module', 'browser', 'main']
   },
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3000'),
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  // Optimize dependencies
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
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
})
