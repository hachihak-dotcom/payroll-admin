import { defineConfig } from "vitest/config";
import config from "./vitest.config";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to a dedicated database with a name ending in _test");
}
process.env.DATABASE_URL = url;
process.env.AUTH_SECRET = "isolated-integration-tests-secret";

export default defineConfig({
  ...config,
  test: { include: ["tests/**/*.integration.test.ts"], testTimeout: 15_000 },
});
