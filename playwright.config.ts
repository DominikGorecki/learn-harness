import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/desktop',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['./tests/flows/reporter.ts']],
  use: { trace: 'retain-on-failure' }
})
