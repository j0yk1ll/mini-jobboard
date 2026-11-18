import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';

export default defineConfig(
  { ignores: ['.svelte-kit/**', 'build/**', 'drizzle/**'] },
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  {
    files: ['**/*.svelte'],
    languageOptions: { parserOptions: { parser: ts.parser } }
  },
  {
    files: ['scripts/*.mjs', 'tests/*.mjs'],
    languageOptions: {
      globals: {
        fetch: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly'
      }
    }
  }
);
