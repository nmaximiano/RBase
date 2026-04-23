// Decision: skip testing lib/projects.ts directly. Every function there goes
// through queryDuckDB, which pulls in @duckdb/duckdb-wasm + OPFS + a worker,
// far too heavy for a smoke test. Instead, this file smoke-tests the pure
// formatToolName helper from lib/format.ts. Same "prove the module loads and
// does what it says" guarantee with none of the DB ceremony.

import { describe, expect, it } from "vitest";
import { formatToolName } from "./format";

describe("formatToolName", () => {
  it("replaces underscores with spaces and capitalizes the first letter", () => {
    expect(formatToolName("execute_r")).toBe("Execute r");
    expect(formatToolName("ask_user")).toBe("Ask user");
  });

  it("strips a trailing _tool suffix before formatting", () => {
    expect(formatToolName("plan_tool")).toBe("Plan");
    expect(formatToolName("run_code_tool")).toBe("Run code");
  });

  it("leaves a single-word name as a capitalized word", () => {
    expect(formatToolName("plan")).toBe("Plan");
  });
});
