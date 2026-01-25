import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
    plugins: [react()],

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
