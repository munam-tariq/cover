import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

test("project client key lifecycle is owner-only at the database layer", async () => {
  const files = await readdir(migrationsDir);
  const migrations = files
    .filter((file) => file.includes("owner_only_project_client_keys"))
    .sort();

  assert.ok(
    migrations.length > 0,
    "expected an owner-only project client keys hardening migration"
  );

  const source = await readFile(path.join(migrationsDir, migrations.at(-1)!), "utf8");

  assert.match(
    source,
    /revoke\s+insert\s*,\s*update\s*,\s*delete\s+on\s+table\s+public\.project_client_keys\s+from\s+authenticated/i
  );
  assert.match(
    source,
    /drop\s+policy\s+if\s+exists\s+"Users can create client keys for their projects"\s+on\s+public\.project_client_keys/i
  );
  assert.match(
    source,
    /drop\s+policy\s+if\s+exists\s+"Users can update client keys for their projects"\s+on\s+public\.project_client_keys/i
  );
  assert.match(source, /create\s+policy\s+"Project owners can create client keys"/i);
  assert.match(source, /create\s+policy\s+"Project owners can update client keys"/i);

  const lifecyclePolicies =
    source.match(
      /create\s+policy\s+"Project owners can create client keys"[\s\S]*create\s+policy\s+"Project owners can update client keys"[\s\S]*;/i
    )?.[0] ?? "";

  assert.doesNotMatch(
    lifecyclePolicies,
    /project_members/i,
    "client key create/update policies must not authorize project members"
  );
});
