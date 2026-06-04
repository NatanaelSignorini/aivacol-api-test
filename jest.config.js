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
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/main.ts',
        '!src/**/*.spec.ts',
      ],
      coverageDirectory: 'coverage',
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
      globalSetup: '<rootDir>/test/common/integration-global-setup.ts',
      globalTeardown: '<rootDir>/test/common/integration-global-teardown.ts',
      testTimeout: 120000,
      maxWorkers: 1,
    },
  ],
};
