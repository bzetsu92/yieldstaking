import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'build/**',
            '*.config.js',
            '*.config.mjs',
            '*.config.ts',
            'vite-env.d.ts',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            import: importPlugin,
        },
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.app.json',
                },
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                },
            ],
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',

            // Import rules - Tối ưu thứ tự import
            'import/order': [
                'warn',
                {
                    groups: [
                        'builtin', // Node.js built-in modules (fs, path, etc.)
                        'external', // External packages (npm packages)
                        'internal', // Internal modules (path aliases @/)
                        ['parent', 'sibling'], // Relative imports (../)
                        'index', // Same directory imports (./)
                        'type', // Type-only imports
                    ],
                    pathGroups: [
                        {
                            pattern: '@/**',
                            group: 'internal',
                            position: 'before',
                        },
                        {
                            pattern: '@/components/**',
                            group: 'internal',
                            position: 'before',
                        },
                        {
                            pattern: '@/hooks/**',
                            group: 'internal',
                            position: 'before',
                        },
                        {
                            pattern: '@/lib/**',
                            group: 'internal',
                            position: 'before',
                        },
                        {
                            pattern: '@/pages/**',
                            group: 'internal',
                            position: 'before',
                        },
                        {
                            pattern: '@/interfaces/**',
                            group: 'internal',
                            position: 'before',
                        },
                    ],
                    pathGroupsExcludedImportTypes: ['type'],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                    warnOnUnassignedImports: false,
                },
            ],
            'import/no-duplicates': ['warn', { considerQueryString: true }],
            'import/no-unresolved': 'off', // TypeScript handles this
            'import/newline-after-import': ['warn', { count: 1 }],

            // Prettier integration
            'prettier/prettier': [
                'warn',
                {
                    endOfLine: 'lf',
                },
            ],

            // General rules
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'warn',
            'no-unused-vars': 'off', // Use TypeScript version instead
        },
    },
);
