import { defineConfig, devices } from '@playwright/test';

// E2E runs against a built app (`vite preview`) talking to the local Supabase stack.
// See docs/TESTING.md → End-to-end for how to run it.
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e/.results',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Skips the welcome animation so tests start on the page itself; intro.spec.ts turns motion back on.
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], locale: 'en-IN' },
    },
    {
      // The narrowest common Android width; layout checks only.
      name: 'small-android',
      testMatch: 'layout.spec.ts',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 }, locale: 'en-IN' },
    },
    {
      // The narrowest desktop layout (top bar instead of the floating nav); layout checks only.
      name: 'desktop',
      testMatch: 'layout.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 800 }, locale: 'en-IN' },
    },
  ],
});
