/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.controller.ts',
    '!src/main.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.spec.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 50,
      statements: 50,
      functions: 50,
      branches: 40,
    },
  },
  testEnvironment: 'node',
  transformIgnorePatterns: ['node_modules/(?!.*(@nestjs/jwt)/)'],
  // This file runs before any tests, ensuring we use the test DB.
  setupFiles: ['<rootDir>/test/setup.ts'],
  // Global setup file runs once before all test suites
  globalSetup: '<rootDir>/test/global-setup.ts',
  // Allow additional time for Argon2 hashing during tests.
  testTimeout: 15000,
};
