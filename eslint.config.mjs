import { defineConfig } from 'eslint/config'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import pluginImport from 'eslint-plugin-import'
import js from '@eslint/js'
import eslintPluginPrettier from 'eslint-plugin-prettier'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

export default defineConfig([
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    plugins: {
      prettier: eslintPluginPrettier,
      import: pluginImport,
      js,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './',
        },
        node: {
          paths: ['src', 'public'],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      },
    },
    extends: [],
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_', // разрешает переменные, начинающиеся с _
          varsIgnorePattern: '^_', // разрешает неиспользуемые переменные с _
          caughtErrorsIgnorePattern: '^_', // разрешает неиспользуемые catch-параметры с _,
        },
      ],
      'no-shadow': 'error',
      'no-redeclare': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-dupe-class-members': 'error',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-misleading-character-class': 'error',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'error',
      'no-template-curly-in-string': 'error',
      'no-unexpected-multiline': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'require-atomic-updates': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/export': 'error',
    },
  },
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'dist/',
      'build/',
      '*.d.ts',
      '*.config.js',
      '*.config.mjs',
      'webhook.js',
      'prisma/@',
      'prisma/migrations',
      'src/generated',
    ],
  },
])
