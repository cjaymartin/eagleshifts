// eslint.config.mjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import { defineConfig, globalIgnores } from 'eslint/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

export default defineConfig([
    // Global ignores for generated files
    globalIgnores(['src/generated/**/*']),

    ...compat.extends('next/core-web-vitals', 'next/typescript'),

    // Add your custom rule configuration here
    {
        rules: {
            // Disable the base rules for customization
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            'no-unused-expressions': 'off', // Suppresses unused expressions
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
]);
