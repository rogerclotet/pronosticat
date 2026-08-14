import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
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
