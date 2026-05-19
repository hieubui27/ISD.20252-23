module.exports = {
  displayName: 'api-e2e',
  globalSetup: '<rootDir>/support/global-setup.ts',
  globalTeardown: '<rootDir>/support/global-teardown.ts',
  setupFiles: ['<rootDir>/support/test-setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
};
