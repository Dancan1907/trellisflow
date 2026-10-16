// @ts-check
/**
 * ESLint configuration for the web app.
 * Extends the root config and adds Next.js and browser-specific rules.
 */
import rootConfig from '../../eslint.config.mjs';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  ...rootConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
      },
    },
  },
  {
    ignores: ['.next/**', 'out/**', 'public/**', 'next-env.d.ts'],
  },
];
