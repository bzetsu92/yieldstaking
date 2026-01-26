import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Plugin to handle SPA routing fallback
const spaFallbackPlugin = (): Plugin => ({
    name: 'spa-fallback',
    configureServer(server) {
        return () => {
            server.middlewares.use((req, res, next) => {
                const url = req.url || ''
                if (
                    url.includes('.') ||
                    url.startsWith('/@') ||
                    url.startsWith('/node_modules') ||
                    url.startsWith('/src') ||
                    url.startsWith('/api')
                ) {
                    return next()
                }
                const indexHtml = path.resolve(__dirname, 'index.html')
                if (fs.existsSync(indexHtml)) {
                    res.setHeader('Content-Type', 'text/html')
                    res.end(fs.readFileSync(indexHtml, 'utf-8'))
                    return
                }
                next()
            })
        }
    },
})

export default defineConfig(({ mode }) => ({
    plugins: [react(), spaFallbackPlugin()],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        dedupe: [
            'react',
            'react-dom',
            'use-sync-external-store',
        ],
    },

    server: {
        port: 8080,
        strictPort: true,
        host: true,
    },

    build: {
        outDir: 'dist',
        sourcemap: mode !== 'production',
        target: 'es2020',
        cssCodeSplit: true,
        reportCompressedSize: false,
        minify: 'esbuild',
        chunkSizeWarningLimit: 5000,
    },

    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            'use-sync-external-store',
            'use-sync-external-store/shim',
            'use-sync-external-store/shim/with-selector',
        ],
    },
}))
