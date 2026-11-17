import { defineConfig } from "vitest/config";

// Many tests spawn the built CLI as a child process (spawnSync). Under load
// (parallel files, CI) a single spawn can take seconds, so allow generous time
// and cap worker count to avoid CPU contention.
export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    maxWorkers: 2,
  },
});
