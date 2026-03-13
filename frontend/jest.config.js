/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next/image$': '<rootDir>/src/__mocks__/next/image.tsx',
    '^next/navigation$': '<rootDir>/src/__mocks__/next/navigation.ts',
    '^next/link$': '<rootDir>/src/__mocks__/next/link.tsx',
    '^next-intl$': '<rootDir>/src/__mocks__/next-intl.ts',
    '^next-intl/(.*)$': '<rootDir>/src/__mocks__/next-intl.ts',
    '^@vercel/analytics$': '<rootDir>/src/__mocks__/@vercel/analytics.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  testRegex: '.*\\.test\\.(ts|tsx)$',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: './coverage',
};
