import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Talks to the real AniList API (30 requests/minute): one file, no parallelism, no retries.
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    include: ['tests/live/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 60_000,
    retry: 0,
  },
});
