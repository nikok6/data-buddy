module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  maxWorkers: 1, // Force sequential execution
  // silent: true // Disable console output during tests
};
