import { defineConfig, devices } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// Ensure the Playwright test runner itself has the safety env flags set.
process.env.PLAYWRIGHT_TEST = 'true';
if (!process.env.MOCK_TV) {
  process.env.MOCK_TV = 'true';
}

/**
 * Playwright configuration for E2E tests.
 * 
 * CRITICAL: MOCK_TV=true is always enforced to prevent accidental real TV connections.
 */
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
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Configure web server and sync service
  webServer: [
    {
      command: 'npm run dev:web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        ...process.env,
        // Ensure MOCK_TV is always set in test environment
        MOCK_TV: 'true',
        PLAYWRIGHT_TEST: 'true',
      },
    },
    {
      command: 'cd ../sync-service && .venv/bin/python src/main.py',
      url: 'http://localhost:8000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        ...process.env,
        // CRITICAL: Always mock TV connections in tests
        MOCK_TV: 'true',
        MOCK_TV_SCENARIO: process.env.MOCK_TV_SCENARIO || 'success_with_pin',
        SYNC_SERVICE_PORT: '8000',
        PLAYWRIGHT_TEST: 'true',
      },
    },
  ],
});

