import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/features\/(.*)$/, replacement: `${rootDir}features/$1` },
      { find: /^@\/shared\/(.*)$/, replacement: `${rootDir}shared/$1` },
      { find: /^@\/server\/(.*)$/, replacement: `${rootDir}server/$1` },
      { find: /^@\/app\/(.*)$/, replacement: `${rootDir}app/$1` },
      { find: /^@\/(.*)$/, replacement: `${rootDir}$1` },
    ],
  },
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**', 'tests/e2e/**'],
  },
});
