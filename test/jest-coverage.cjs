const { jest: baseConfig } = require('../package.json');

module.exports = {
  ...baseConfig,
  rootDir: '..',
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  testRegex: undefined,
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/*.e2e-spec.ts'],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
};
