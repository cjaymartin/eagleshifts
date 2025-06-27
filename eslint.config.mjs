// eslint.config.mjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),

    // Add your custom rule configuration here
    {
        rules: {
            // Disable the base ESLint rule as @typescript-eslint/no-unused-vars will handle it
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn', // You can change this to "error" if you prefer
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    ignoreRestSiblings: true, // This is key for your deconstruction scenario
                },
            ],
        },
    },
];

export default eslintConfig;
