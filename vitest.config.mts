import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The *.integration.test.ts suites share one database and truncate the
    // tables they touch, so no two test files may run at the same time.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // Next resolves this marker to a no-op on the server; tests are a server
      // context too, so do the same rather than letting it throw.
      "server-only": path.resolve(
        import.meta.dirname,
        "./node_modules/server-only/empty.js",
      ),
    },
  },
});
