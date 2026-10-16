// @ts-check
/**
 * ESLint configuration for the API app.
 * Extends the root config and adds Node-specific rules.
 */
import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      // NestJS decorators rely on class methods; no rule adjustments needed yet.
    },
  },
];
