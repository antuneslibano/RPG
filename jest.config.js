/**
 * Two projects: the domain runs headless in Node (fast, no native modules),
 * the UI renders through jest-expo so screens are proven to actually mount.
 */
const domainTransform = {
  '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS', jsx: 'react-jsx', strict: true } }],
};

module.exports = {
  projects: [
    {
      displayName: 'domain',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/*.test.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      transform: domainTransform,
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      setupFiles: ['<rootDir>/jest.setup.ui.js'],
      roots: ['<rootDir>/src'],
      testMatch: ['**/*.test.tsx'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
  ],
};
