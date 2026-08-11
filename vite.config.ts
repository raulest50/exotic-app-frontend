import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      proxy: {
        '/datos-gov': {
          target: 'https://www.datos.gov.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/datos-gov/, '')
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development', // Keep source maps for development
      minify: mode !== 'development' // Avoid minification for development
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    }
  };
});
