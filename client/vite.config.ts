import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
      babel: {
        parserOpts: {
          plugins: ['decorators-legacy', 'classProperties']
        }
      }
    })
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
         manualChunks(id) {
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
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../shared"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@types": path.resolve(__dirname, "./src/types"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@api": path.resolve(__dirname, "./src/services/api"),
        "@services": path.resolve(__dirname, "./src/services"),
        "@lib": path.resolve(__dirname, "./src/lib"),
        "@contexts": path.resolve(__dirname, "./src/contexts"),
      // Backward compatibility aliases for refactored directories
      "@/components/claims": path.resolve(__dirname, "./src/features/claims/components"),
      "@/components/companies": path.resolve(__dirname, "./src/features/companies/components"),
      "@/components/premiums": path.resolve(__dirname, "./src/features/finance/components"),
      "@/components/dependents": path.resolve(__dirname, "./src/features/dependents/components"),
      "@/components/providers": path.resolve(__dirname, "./src/features/providers/components"),
      "@/components/members": path.resolve(__dirname, "./src/features/members/components"),
      "@/components/finance": path.resolve(__dirname, "./src/features/finance/components"),
      "@/components/dashboards": path.resolve(__dirname, "./src/features/dashboards/components"),
      "@/components/insurance": path.resolve(__dirname, "./src/features/insurance/components")
      },
      // Ensure extensions are properly resolved
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      // Automatically resolve extensions for imports
      extensionAlias: {
        '.js': ['.js', '.ts', '.tsx'],
        '.mjs': ['.mjs', '.mts']
      },
      // Try all extensions when resolving imports
      tryIndex: true,
      preserveSymlinks: false,
      // Force extension resolution for Vite 8 Rolldown bundler
      fullySpecified: false,
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