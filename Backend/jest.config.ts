import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__test__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', types: ['node', 'jest'], rootDir: './src' } }],
  },
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
};

export default config;
