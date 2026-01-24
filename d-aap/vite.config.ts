import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
    plugins: [react()],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            'use-sync-external-store': path.resolve(__dirname, './node_modules/use-sync-external-store'),
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        dedupe: [
            'use-sync-external-store',
            'lodash',
            'debug',
            'eventemitter3',
            'eventemitter2',
            'semver',
            'fast-safe-stringify',
            'ua-parser-js',
            'cross-fetch',
        ],
        conditions: ['import', 'module', 'browser', 'default'],
    },

    server: {
        port: 8080,
        strictPort: true,
        host: true,
    },

    build: {
        outDir: 'dist',
        sourcemap: mode !== 'production',
        minify: 'esbuild',
        target: 'es2020',
        cssCodeSplit: true,
        reportCompressedSize: false,
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true,
            // Tự động chuyển đổi CommonJS sang ESM
            requireReturnsDefault: 'auto',
            esmExternals: true,
        },
        rollupOptions: {
            treeshake: {
                moduleSideEffects: 'no-external',
                propertyReadSideEffects: false,
                tryCatchDeoptimization: false,
            },
            onwarn(warning, warn) {
                if (
                    warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
                    (warning.message && warning.message.includes('/*#__PURE__*/'))
                ) {
                    return;
                }
                warn(warning);
            },
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;

                    if (
                        id.includes('/react/') ||
                        id.includes('/react-dom/') ||
                        id.includes('/react-router')
                    ) {
                        return 'react-vendor';
                    }

                    if (id.includes('/viem/') && !id.includes('/@wagmi/') && !id.includes('/@rainbow-me/') && !id.includes('/@reown/')) {
                        if (id.includes('/viem/chains') || id.includes('/viem/accounts')) {
                            return 'viem-data';
                        }
                        return 'viem-vendor';
                    }

                    if (id.includes('/wagmi/') || id.includes('/@wagmi/')) {
                        return 'wagmi-vendor';
                    }

                    if (id.includes('/@rainbow-me/rainbowkit')) {
                        if (id.includes('/@rainbow-me/rainbowkit/dist')) {
                            return 'rainbowkit-core';
                        }
                        return 'rainbowkit-vendor';
                    }

                    if (id.includes('/@reown/appkit')) {
                        return 'appkit-vendor';
                    }
                    if (id.includes('/@reown/')) {
                        return 'reown-vendor';
                    }

                    if (id.includes('/@coinbase/')) {
                        return 'coinbase-vendor';
                    }

                    if (id.includes('/@walletconnect/')) {
                        return 'walletconnect-vendor';
                    }

                    if (id.includes('/@metamask/')) {
                        return 'metamask-vendor';
                    }

                    if (id.includes('/@tanstack/react-query')) {
                        return 'query-vendor';
                    }

                    if (id.includes('/@radix-ui/')) {
                        return 'ui-vendor';
                    }

                    if (id.includes('/recharts/')) {
                        return 'charts-vendor';
                    }

                    // Icons
                    if (id.includes('/@tabler/icons') || id.includes('/lucide-react/')) {
                        return 'icons-vendor';
                    }

                    if (id.includes('/axios/')) {
                        return 'axios-vendor';
                    }
                    if (id.includes('/date-fns/')) {
                        return 'date-fns-vendor';
                    }

                    if (id.includes('/@dnd-kit/')) {
                        return 'dnd-vendor';
                    }

                    if (id.includes('/@tanstack/react-table')) {
                        return 'table-vendor';
                    }

                    const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
                    if (match) {
                        const pkgName = match[1];
                        
                        const smallPackages = ['zod', 'clsx', 'tailwind-merge', 'class-variance-authority', 'vaul', 'sonner', 'next-themes'];
                        if (smallPackages.some(pkg => pkgName.includes(pkg))) {
                            return 'vendor-utils';
                        }

                        if (pkgName.startsWith('@')) {
                            const scope = pkgName.split('/')[0].replace('@', '');
                            const largeScopes = ['tanstack', 'base-org', 'noble', 'safe-global', 'floating-ui', 'remix-run'];
                            if (largeScopes.some(s => scope.includes(s))) {
                                return `vendor-${scope}`;
                            }
                        }
                        
                        const largePackages = ['socket.io', 'lit', 'vanilla-extract'];
                        if (largePackages.some(pkg => pkgName.includes(pkg))) {
                            return `vendor-${pkgName}`;
                        }
                    }

                    return 'vendor';
                },

                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
            },
        },

        chunkSizeWarningLimit: 1000,
    },

    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            '@tanstack/react-query',
            'eventemitter3',
            'eventemitter2',
            'use-sync-external-store',
            'use-sync-external-store/shim',
            'use-sync-external-store/shim/with-selector',
            'lodash',
            'debug',
            'semver',
            'fast-safe-stringify',
            'ua-parser-js',
            'cross-fetch',
            '@metamask/sdk-analytics',
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-link',
            '@tiptap/extension-text-align',
            '@tiptap/extension-underline',
        ],
        exclude: ['@rainbow-me/rainbowkit'],
        esbuildOptions: {
            target: 'es2020',
            mainFields: ['module', 'main', 'browser'],
            format: 'esm',
            supported: {
                'dynamic-import': true,
                'import-meta': true,
            },
        },
    },
}));
