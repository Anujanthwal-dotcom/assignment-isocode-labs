import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec,e2e-spec}.?(c|m)[jt]s?(x)'],
  },
  resolve: {
    alias: {
      '@pharmacy/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@pharmacy/validation': path.resolve(__dirname, '../../packages/validation/src'),
    },
  },
});
