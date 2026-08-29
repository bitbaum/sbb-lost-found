/** ts-jest, matching the jest 29 + ts-jest 29 already in devDependencies. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
};
