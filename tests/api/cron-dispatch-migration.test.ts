import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");

test("cron dispatch fails visibly when its Vault configuration is incomplete", async () => {
  const sql = stripComments(
    await read(
      "../../supabase/migrations/20260716033100_harden_cron_http_dispatch.sql"
    )
  );

  assert.match(
    sql,
    /create or replace function private\.trigger_cron_endpoint/
  );
  assert.match(sql, /if base is null or secret is null then\s*raise exception/);
  assert.doesNotMatch(sql, /raise notice[\s\S]*return/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(
    sql,
    /revoke all on function private\.trigger_cron_endpoint\(text\) from public/
  );
});

test("cron dispatch gives the classifier a long endpoint-specific timeout", async () => {
  const sql = stripComments(
    await read(
      "../../supabase/migrations/20260716033100_harden_cron_http_dispatch.sql"
    )
  );

  assert.match(
    sql,
    /when endpoint = '\/api\/cron\/classify-insights' then 600000/
  );
  assert.match(sql, /else 30000/);
  assert.match(sql, /timeout_milliseconds\s*:=\s*timeout_ms/);
});
