/** ts-jest, matching the jest 30 + ts-jest 29 already in devDependencies. */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // TS 6 no longer auto-includes @types packages hoisted to a parent
        // node_modules, so the jest globals must be named explicitly.
        tsconfig: { types: ['jest', 'node'] },
      },
    ],
  },
};
