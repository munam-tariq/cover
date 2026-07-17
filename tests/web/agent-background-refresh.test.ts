import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("background availability refreshes preserve the rendered agent UI", async () => {
  const context = await read("../../apps/web/contexts/agent-context.tsx");

  assert.match(
    context,
    /const fetchAgentInfo = useCallback\(\s*async \(\{ background = false \}/,
    "agent requests must distinguish initial loads from background refreshes"
  );
  assert.match(
    context,
    /if \(!background\) setIsLoading\(true\)/,
    "only an initial agent load may activate the shared loading boundary"
  );
  assert.match(
    context,
    /finally \{\s*if \(!background\) setIsLoading\(false\)/,
    "a background refresh must not clear an overlapping initial-load boundary"
  );
  assert.match(
    context,
    /const refreshAvailability = useCallback\(async \(\) => \{\s*await fetchAgentInfo\(\{ background: true \}\)/,
    "availability refreshes must retain the current role and status while fetching"
  );
});
