import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node'
  },
  resolve: {
    alias: {
      '@fysix/common': path.resolve(__dirname, '../../packages/common/src/index.ts')
    }
  }
});
