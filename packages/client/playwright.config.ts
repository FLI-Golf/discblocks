import { defineConfig, devices } from 'playwright/test';

// Playwright owns the BROWSER/UI-path regression for the Master Avatar rig.
// Vitest owns the numerical rig truth (GolferPoseTarget, joint mapping, L/R
// mirroring). This config serves the existing Vite dev server and drives the
// real /master.html controls. Chromium only for this phase.
export default defineConfig({
  testDir: './e2e',
  // Deterministic screenshots: no animations/retries flakiness, fixed viewport.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } },
    },
  ],
  webServer: {
    command: 'pnpm dev --port 5173 --strictPort',
    url: 'http://localhost:5173/master.html',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
