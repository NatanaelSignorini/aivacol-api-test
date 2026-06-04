/** @type {import('jest').Config} */
const sharedConfig = {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!uuid/)'],
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      ...sharedConfig,
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/*.spec.ts',
        '<rootDir>/test/fixtures/**/*.spec.ts',
      ],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/main.ts',
        '!src/**/*.spec.ts',
      ],
      coverageDirectory: 'coverage',
      coverageThreshold: {
        global: {
          branches: 70,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    {
      ...sharedConfig,
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
    },
    {
      ...sharedConfig,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.integration-spec.ts'],
      globalSetup: '<rootDir>/test/common/integration/jest-global-setup.ts',
      globalTeardown: '<rootDir>/test/common/integration/jest-global-teardown.ts',
      testTimeout: 120000,
      maxWorkers: 1,
    },
  ],
};
