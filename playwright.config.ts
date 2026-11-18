import { defineConfig } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to a dedicated database with a name ending in _test");
}
export const testBaseUrl = "http://127.0.0.1:3210";
export const testSetupToken = "temporary-playwright-only-setup-token-3210";
process.env.DATABASE_URL = databaseUrl;
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.spec.ts",
  workers: 1,
  timeout: 60_000,
  use: { baseURL: testBaseUrl, launchOptions: { executablePath: process.env.CHROMIUM_PATH } },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3210",
    url: testBaseUrl + "/login",
    env: {
      DATABASE_URL: databaseUrl, AUTH_URL: testBaseUrl, AUTH_SECRET: "isolated-e2e-tests-auth-secret",
      SETUP_TOKEN: testSetupToken, NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
