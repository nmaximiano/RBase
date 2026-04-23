import { defineConfig } from "vitest/config";
import path from "node:path";

// Matches the "@/*": ["./*"] mapping in tsconfig.json.
export default defineConfig({
  resolve: {
    alias: {
      "@/": `${path.resolve(__dirname, ".")}/`,
    },
  },
  test: {
    environment: "happy-dom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "out"],
  },
});
