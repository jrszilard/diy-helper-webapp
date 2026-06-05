import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // In CI, run a production build so every route/chunk is precompiled up front.
    // `next dev` compiles routes on first hit, which under CI CPU contention can blow
    // past assertion timeouts and flake (e.g. the landing chip-morph test). Locally we
    // keep `next dev` for fast HMR iteration.
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // `next build` takes longer than Playwright's default 60s webServer startup window.
    timeout: 180_000,
  },
});
