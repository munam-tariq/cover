import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it, before } from "node:test";

/**
 * The request body template lives in the database but only matters if it
 * survives the whole path: row -> mapper -> executor -> outbound fetch. It
 * previously did not, and nothing failed — the column was simply never read,
 * so POST endpoints silently sent an empty body. These assertions pin each hop.
 *
 * Source-text assertions follow the convention used by the other tests over
 * modules that pull in the Supabase client at import time.
 */

const executorPath = new URL(
  "../../apps/api/src/services/tool-executor.ts",
  import.meta.url
);
const routePath = new URL(
  "../../apps/api/src/routes/endpoints.ts",
  import.meta.url
);

const sliceBetween = (src: string, start: string, end: string): string => {
  const from = src.indexOf(start);
  assert.notEqual(from, -1, `expected to find ${start}`);
  const to = src.indexOf(end, from);
  return src.slice(from, to === -1 ? undefined : to);
};

describe("request body reaches the outbound request", () => {
  let executor: string;
  let route: string;

  before(async () => {
    executor = await readFile(executorPath, "utf-8");
    route = await readFile(routePath, "utf-8");
  });

  it("the tool executor sends a body with its fetch", () => {
    const fetchCall = sliceBetween(executor, "await fetch(url, {", "});");
    assert.match(
      fetchCall,
      /\bbody,/,
      "executeToolCall must pass body to fetch, or POST endpoints send nothing"
    );
  });

  it("the tool executor builds the request through the shared helper", () => {
    assert.match(executor, /buildEndpointRequest\(endpoint, args\)/);
  });

  it("the test route sends a body with its fetch", () => {
    const fetchCall = sliceBetween(route, "await fetch(testUrl, {", "});");
    assert.match(
      fetchCall,
      /\bbody,/,
      "testing an endpoint must send the same body the AI would"
    );
  });

  it("the internal mapper carries the template out of the database", () => {
    // getProjectEndpoints maps each row by hand, so a field absent here never
    // reaches the executor no matter what is stored.
    assert.match(
      route,
      /bodyTemplate: \(endpoint\.request_body_template/,
      "getProjectEndpoints must map bodyTemplate"
    );
  });

  it("the create route persists the template", () => {
    const insert = sliceBetween(route, ".insert({", "})");
    assert.match(insert, /request_body_template: bodyTemplate \?\? null/);
  });

  it("the tool is named readably, not by raw id", () => {
    // A bare id spends the model's strongest naming signal on nothing, and
    // renders unreadably wherever tool calls are displayed.
    assert.match(executor, /name: toolNameForEndpoint\(endpoint\)/);
    assert.doesNotMatch(executor, /name: endpoint\.id/);
  });

  it("a chat turn resolves tool calls against one endpoint snapshot", () => {
    // executeToolByName takes the already-loaded endpoints; re-reading and
    // re-decrypting every endpoint per tool call is what this replaced.
    assert.match(executor, /export async function executeToolByName\(\s*endpoints: ApiEndpoint\[\]/);
    assert.doesNotMatch(
      executor,
      /getProjectEndpoints\(projectId\);\s*const endpoint = endpoints\.find/,
      "tool execution must not refetch endpoints per call"
    );
  });

  it("the tool schema derives params from the URL and the body template", () => {
    // required: params is what the LLM is told to supply; if this only covered
    // URL params, a body placeholder would never be filled.
    assert.match(executor, /const params = extractEndpointParams\(endpoint\)/);
  });
});

describe("editing auth does not silently drop changes", () => {
  let route: string;

  before(async () => {
    route = await readFile(routePath, "utf-8");
  });

  it("the update route merges incoming auth config over stored credentials", () => {
    // Changing only the API key header used to be discarded, because the
    // modal omits the secret when editing and the route ignored a config
    // without one.
    assert.match(route, /mergedAuthConfig/);
    assert.match(
      route,
      /existingEndpoint\.auth_type === targetAuthType/,
      "credentials may only carry forward when the auth type is unchanged"
    );
  });

  it("the update route validates the merged config, not the incoming one", () => {
    const apiKeyCheck = sliceBetween(
      route,
      'if (targetAuthType === "api_key"',
      "}"
    );
    assert.match(apiKeyCheck, /!mergedAuthConfig\.apiKey/);
  });

  it("the list route returns the stored API key header", () => {
    // The edit modal is opened from the list, and re-sends the header it was
    // given. If the list withholds it, the form falls back to the "X-API-Key"
    // default and the merge overwrites a custom header on any save.
    const listHandler = sliceBetween(
      route,
      'endpointsRouter.get("/", async',
      "endpointsRouter.get(\n  \"/:id\""
    );
    assert.match(
      listHandler,
      /auth_config/,
      "the list select must include auth_config"
    );
    assert.match(
      listHandler,
      /authConfig: readPublicAuthConfig\(e\.auth_type, e\.auth_config\)/,
      "the list must expose the header name so the edit form can round-trip it"
    );
  });

  it("only the header name is exposed, never the credentials", () => {
    const helper = sliceBetween(
      route,
      "function readPublicAuthConfig",
      "\n}\n"
    );
    assert.match(helper, /apiKeyHeader: decrypted\.apiKeyHeader/);
    assert.doesNotMatch(
      helper,
      /apiKey:|bearerToken:/,
      "credentials must never be returned to the dashboard"
    );
  });
});
