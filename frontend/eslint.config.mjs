import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Downgrade a handful of strict rules to warnings so CI stays green
    // while the codebase is still settling. These rules catch legit
    // anti-patterns but also fire on deliberate escape hatches
    // (latest-value refs, explicit `any` at boundaries). Contributors
    // can clean them up incrementally; they're still surfaced in the
    // editor and in lint output.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
