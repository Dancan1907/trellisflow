// @ts-check
/**
 * Root ESLint configuration (flat config, ESLint 9+).
 *
 * This is the base config shared by every workspace.
 * Individual apps (apps/api, apps/web) extend this with their own rules.
 *
 * Uses typescript-eslint for type-aware linting.
 * Disables rules that conflict with Prettier via eslint-config-prettier.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Base JS recommendations.
  js.configs.recommended,

  // TypeScript recommendations (non-type-aware — fast, sufficient for now).
  ...tseslint.configs.recommended,

  // Turn off rules that conflict with Prettier.
  prettier,

  {
    // Apply these settings to all TS/JS files.
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // Warn on unused vars, but allow args prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow explicit `any` — warn instead of error (can relax as code matures).
      '@typescript-eslint/no-explicit-any': 'warn',
      // Prefer const where possible.
      'prefer-const': 'warn',
      // No console.log in committed code (use a logger).
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  {
    // Files and folders ESLint should never touch.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/next.config.*',
      '**/commitlint.config.js',
    ],
  },
);
