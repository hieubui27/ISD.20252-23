module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@angular/core$': '<rootDir>/test/angular-core.mock.ts',
    '^@angular/router$': '<rootDir>/test/angular-router.mock.ts',
    '^@angular/common/http$': '<rootDir>/test/angular-http.mock.ts',
  },
};
