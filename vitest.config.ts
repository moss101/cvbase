import path from 'path';
import { defineConfig } from 'vitest/config';

// Unit tests run in Node by default (pure logic). Files that need a DOM can
// opt in per-file with: // @vitest-environment jsdom
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'android', 'ios', 'supabase/functions/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      exclude: ['node_modules', 'dist', 'android', 'ios', '**/*.config.ts'],
    },
  },
});
