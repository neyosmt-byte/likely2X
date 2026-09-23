import { defineConfig } from '@playwright/test'

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  reporter: 'list',
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:57389',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 57389 --strictPort',
    reuseExistingServer: true,
    timeout: 120_000,
    url: 'http://127.0.0.1:57389',
  },
})
