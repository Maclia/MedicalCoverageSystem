import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const srcDir = path.resolve(rootDir, 'src')
const sharedDir = path.resolve(rootDir, '../shared')
const servicesApiDir = path.resolve(srcDir, 'services/api')

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
    minify: 'oxc',
    target: 'es2020',
   chunkSizeWarningLimit: 900
   },
   resolve: {
      alias: {
        '@/components/claims': path.resolve(srcDir, 'features/claims/components'),
        '@/components/companies': path.resolve(srcDir, 'features/companies/components'),
        '@/components/premiums': path.resolve(srcDir, 'features/finance/components'),
        '@/components/dependents': path.resolve(srcDir, 'features/dependents/components'),
        '@/components/providers': path.resolve(srcDir, 'features/providers/components'),
        '@/components/members': path.resolve(srcDir, 'features/members/components'),
        '@/components/finance': path.resolve(srcDir, 'features/finance/components'),
        '@/components/dashboards': path.resolve(srcDir, 'features/dashboards/components'),
        '@/components/insurance': path.resolve(srcDir, 'features/insurance/components'),
        '@/services/api': servicesApiDir,
        '@api': servicesApiDir,
        '@services': path.resolve(srcDir, 'services'),
        '@components': path.resolve(srcDir, 'components'),
        '@pages': path.resolve(srcDir, 'pages'),
        '@utils': path.resolve(srcDir, 'utils'),
        '@types': path.resolve(srcDir, 'types'),
        '@hooks': path.resolve(srcDir, 'hooks'),
        '@lib': path.resolve(srcDir, 'lib'),
        '@contexts': path.resolve(srcDir, 'contexts'),
        '@shared': sharedDir,
        '@': srcDir,
      },
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
