import assert from "node:assert/strict";
import test from "node:test";

import { getErrorDetail } from "../../apps/api/src/middleware/error-detail.ts";

test("thrown errors take priority over generic 5xx response bodies", () => {
  assert.deepEqual(
    getErrorDetail(
      { error: "Internal server error", message: "development-only detail" },
      new TypeError("database connection failed")
    ),
    {
      code: "TypeError",
      message: "database connection failed",
    }
  );
});

test("structured and string error responses retain their useful detail", () => {
  assert.deepEqual(
    getErrorDetail({
      error: { code: "CREATE_ERROR", message: "Failed to create project" },
    }),
    {
      code: "CREATE_ERROR",
      message: "Failed to create project",
    }
  );
  assert.deepEqual(
    getErrorDetail({
      error: "Internal server error",
      message: "Specific failure",
    }),
    {
      message: "Specific failure",
    }
  );
});
