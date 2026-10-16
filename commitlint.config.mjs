/**
 * Commitlint configuration (ESM).
 *
 * Enforces Conventional Commits:
 *   <type>(<scope>): <Subject>
 *
 * Examples:
 *   feat(auth): Add login endpoint
 *   fix(transactions): Correct transfer pairing bug
 *   chore(setup): Add commitlint configuration
 *
 * The subject MUST be capitalized.
 * The full subject line MUST be <= 100 characters.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // A new feature
        'fix', // A bug fix
        'docs', // Documentation only
        'style', // Formatting, missing semicolons, etc. (no code change)
        'refactor', // Refactor without changing behavior
        'perf', // Performance improvement
        'test', // Adding or fixing tests
        'chore', // Build process, tooling, dependencies
        'ci', // CI/CD configuration
        'revert', // Revert a previous commit
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
    'footer-max-line-length': [2, 'always', 200],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
  },
};
