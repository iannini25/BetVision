import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // 'server-only' lança fora de um bundle RSC; nos testes (node puro) vira no-op.
      'server-only': fileURLToPath(new URL('./test/server-only.stub.ts', import.meta.url)),
    },
  },
})
