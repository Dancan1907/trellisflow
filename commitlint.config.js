/**
 * Commitlint configuration.
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
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce the list of allowed types.
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
    // Scope is optional but must be lowercase if provided.
    'scope-case': [2, 'always', 'lower-case'],
    // Subject must be lowercase in the config-conventional default.
    // Override so we can capitalize the first word after the prefix.
    'subject-case': [2, 'always', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    // No trailing period in the subject.
    'subject-full-stop': [2, 'never', '.'],
    // Subject line length.
    'header-max-length': [2, 'always', 100],
    // Body line length.
    'body-max-line-length': [2, 'always', 200],
    // Footer line length.
    'footer-max-line-length': [2, 'always', 200],
    // No empty subject.
    'subject-empty': [2, 'never'],
    // No empty type.
    'type-empty': [2, 'never'],
  },
};
