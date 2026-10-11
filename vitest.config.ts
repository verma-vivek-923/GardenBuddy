import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['server/test/**/*.test.ts', 'client/src/test/**/*.test.ts'], environment: 'node', clearMocks: true } });
