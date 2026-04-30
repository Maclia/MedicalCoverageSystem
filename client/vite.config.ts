import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const toPosixPath = (value: string) => value.replace(/\\/g, '/')
const srcDir = toPosixPath(path.resolve(rootDir, 'src'))
const sharedDir = toPosixPath(path.resolve(rootDir, '../shared'))
const servicesApiDir = `${srcDir}/services/api`

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
    sourcemap: false,
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
           if (id.includes('@mui') || id.includes('@emotion')) {
             return 'mui';
           }
           if (id.includes('recharts')) {
             return 'charts';
           }
           if (id.includes('framer-motion')) {
             return 'motion';
           }
           if (id.includes('@stripe')) {
             return 'stripe';
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
    target: 'es2020',
    chunkSizeWarningLimit: 900
   },
   resolve: {
      alias: [
        // Keep legacy feature aliases ahead of the generic @/ matcher.
        { find: /^@\/components\/claims\/(.*)$/, replacement: `${srcDir}/features/claims/components/$1` },
        { find: /^@\/components\/companies\/(.*)$/, replacement: `${srcDir}/features/companies/components/$1` },
        { find: /^@\/components\/premiums\/(.*)$/, replacement: `${srcDir}/features/finance/components/$1` },
        { find: /^@\/components\/dependents\/(.*)$/, replacement: `${srcDir}/features/dependents/components/$1` },
        { find: /^@\/components\/providers\/(.*)$/, replacement: `${srcDir}/features/providers/components/$1` },
        { find: /^@\/components\/members\/(.*)$/, replacement: `${srcDir}/features/members/components/$1` },
        { find: /^@\/components\/finance\/(.*)$/, replacement: `${srcDir}/features/finance/components/$1` },
        { find: /^@\/components\/dashboards\/(.*)$/, replacement: `${srcDir}/features/dashboards/components/$1` },
        { find: /^@\/components\/insurance\/(.*)$/, replacement: `${srcDir}/features/insurance/components/$1` },
        { find: /^@api\/(.*)$/, replacement: `${servicesApiDir}/$1` },
        { find: /^@api$/, replacement: servicesApiDir },
        { find: /^@\/services\/api\/(.*)$/, replacement: `${servicesApiDir}/$1` },
        { find: /^@shared\/(.*)$/, replacement: `${sharedDir}/$1` },
        { find: /^@shared$/, replacement: sharedDir },
        { find: /^@components\/(.*)$/, replacement: `${srcDir}/components/$1` },
        { find: /^@pages\/(.*)$/, replacement: `${srcDir}/pages/$1` },
        { find: /^@utils\/(.*)$/, replacement: `${srcDir}/utils/$1` },
        { find: /^@types\/(.*)$/, replacement: `${srcDir}/types/$1` },
        { find: /^@hooks\/(.*)$/, replacement: `${srcDir}/hooks/$1` },
        { find: /^@services\/(.*)$/, replacement: `${srcDir}/services/$1` },
        { find: /^@lib\/(.*)$/, replacement: `${srcDir}/lib/$1` },
        { find: /^@contexts\/(.*)$/, replacement: `${srcDir}/contexts/$1` },
        { find: /^@\/(.*)$/, replacement: `${srcDir}/$1` },
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
