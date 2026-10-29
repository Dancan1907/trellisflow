/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  maxWorkers: 1,
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
      lines: 35,
      statements: 35,
      functions: 35,
      branches: 30,
    },
  },
  testEnvironment: 'node',
  transformIgnorePatterns: ['node_modules/(?!.*(@nestjs/jwt)/)'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  testTimeout: 30000,
};
