import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/storybook",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:6006",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm exec vite storybook-static --host 127.0.0.1 --port 6006",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:6006",
  },
});
