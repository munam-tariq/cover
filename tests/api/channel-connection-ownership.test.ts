import assert from "node:assert/strict";
import test from "node:test";

const ownershipModuleUrl = new URL(
  "../../apps/api/src/services/channels/connection-ownership.ts",
  import.meta.url
);

test("connection upsert target resolves same-project active connection", async () => {
  const mod = await import(ownershipModuleUrl.href);
  const resolveConnectionUpsertTarget = mod.resolveConnectionUpsertTarget as (
    projectId: string,
    existingActive: { id: string; projectId: string } | null,
    existingByExternalId: { id: string; projectId: string } | null
  ) => string | null;

  assert.equal(
    resolveConnectionUpsertTarget(
      "project-a",
      { id: "conn-active", projectId: "project-a" },
      null
    ),
    "conn-active"
  );
});

test("connection upsert target resolves same-project reconnect by external id", async () => {
  const mod = await import(ownershipModuleUrl.href);
  const resolveConnectionUpsertTarget = mod.resolveConnectionUpsertTarget as (
    projectId: string,
    existingActive: { id: string; projectId: string } | null,
    existingByExternalId: { id: string; projectId: string } | null
  ) => string | null;

  assert.equal(
    resolveConnectionUpsertTarget(
      "project-a",
      null,
      { id: "conn-disabled", projectId: "project-a" }
    ),
    "conn-disabled"
  );
});

test("connection upsert target rejects external id owned by another project", async () => {
  const mod = await import(ownershipModuleUrl.href);
  const resolveConnectionUpsertTarget = mod.resolveConnectionUpsertTarget as (
    projectId: string,
    existingActive: { id: string; projectId: string } | null,
    existingByExternalId: { id: string; projectId: string } | null
  ) => string | null;

  assert.throws(
    () =>
      resolveConnectionUpsertTarget(
        "project-b",
        null,
        { id: "conn-a", projectId: "project-a" }
      ),
    /another project/i
  );
});
