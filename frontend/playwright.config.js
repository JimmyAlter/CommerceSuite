import { defineConfig, devices } from '@playwright/test'
import os from 'node:os'
import path from 'node:path'

// End-to-end smoke tests: start the real API on a throwaway SQLite file and
// the Vite dev server pointed at it, then drive the app in Chromium.
const API_PORT = 4320
const WEB_PORT = 5320
const dbPath = path.join(os.tmpdir(), `commercesuite-e2e-${Date.now()}.db`)

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.e2e.js',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node ../backend/src/server.js',
      url: `http://localhost:${API_PORT}/api/health`,
      env: { PORT: String(API_PORT), DB_PATH: dbPath, JWT_SECRET: 'e2e-only-secret', CORS_ORIGIN: '' },
      reuseExistingServer: false,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
    },
  ],
})
