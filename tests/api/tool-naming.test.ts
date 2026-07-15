import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL(
  "../../apps/api/src/services/tool-naming.ts",
  import.meta.url
);

type Endpoint = { id: string; name: string };

type ToolNamingModule = {
  toolNameForEndpoint: (endpoint: Endpoint) => string;
  findEndpointByToolName: <T extends Endpoint>(
    endpoints: T[],
    toolName: string
  ) => T | undefined;
};

const load = async (): Promise<ToolNamingModule> =>
  (await import(moduleUrl.href)) as ToolNamingModule;

// OpenAI requires function names to match this pattern.
const OPENAI_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

const ID_A = "bb30cccc-b044-43e6-a58d-45c5075c0147";
const ID_B = "ff11dddd-1234-43e6-a58d-45c5075c0147";

test("a tool name is readable and carries the endpoint id", async () => {
  const { toolNameForEndpoint } = await load();

  assert.equal(
    toolNameForEndpoint({ id: ID_A, name: "Order Lookup Echo" }),
    "order_lookup_echo_bb30cccc"
  );
  assert.equal(
    toolNameForEndpoint({ id: ID_A, name: "Order Status" }),
    "order_status_bb30cccc"
  );
});

test("names that share a slug still resolve to different tools", async () => {
  const { toolNameForEndpoint } = await load();

  // Endpoint names have no uniqueness constraint, so two endpoints can be
  // called the same thing. Without the id suffix they would collide and a tool
  // call would resolve to whichever endpoint came back first.
  const a = toolNameForEndpoint({ id: ID_A, name: "Order Status" });
  const b = toolNameForEndpoint({ id: ID_B, name: "Order Status" });

  assert.notEqual(a, b);
});

test("a name with no ASCII letters still produces a valid tool name", async () => {
  const { toolNameForEndpoint } = await load();

  // Arabic is a live locale; this slugs to nothing and must not yield a name
  // that is empty, bare "_", or otherwise invalid.
  const arabic = toolNameForEndpoint({ id: ID_A, name: "حالة الطلب" });
  assert.equal(arabic, "endpoint_bb30cccc");
  assert.match(arabic, OPENAI_NAME_PATTERN);

  // Punctuation-only names collapse the same way.
  const punctuation = toolNameForEndpoint({ id: ID_A, name: "!!! ???" });
  assert.equal(punctuation, "endpoint_bb30cccc");
  assert.match(punctuation, OPENAI_NAME_PATTERN);
});

test("a long name is truncated to fit the 64 character limit", async () => {
  const { toolNameForEndpoint } = await load();

  // Endpoint names allow 100 characters; tool names allow 64.
  const longName = "a".repeat(100);
  const name = toolNameForEndpoint({ id: ID_A, name: longName });

  assert.ok(name.length <= 64, `expected <= 64 chars, got ${name.length}`);
  assert.match(name, OPENAI_NAME_PATTERN);
  assert.ok(name.endsWith("_bb30cccc"), "the id suffix must survive truncation");
});

test("every plausible endpoint name yields a valid OpenAI tool name", async () => {
  const { toolNameForEndpoint } = await load();

  const names = [
    "Order Status",
    "order-status",
    "Order  Status!!",
    "  leading and trailing  ",
    "123 numeric start",
    "حالة الطلب",
    "订单状态",
    "émoji 🚀 name",
    "a".repeat(100),
    "_",
    "-",
    "a",
  ];

  for (const name of names) {
    const toolName = toolNameForEndpoint({ id: ID_A, name });
    assert.match(
      toolName,
      OPENAI_NAME_PATTERN,
      `name ${JSON.stringify(name)} produced invalid tool name ${JSON.stringify(toolName)}`
    );
    assert.doesNotMatch(
      toolName,
      /__+|_$/,
      `name ${JSON.stringify(name)} produced untidy tool name ${JSON.stringify(toolName)}`
    );
  }
});

test("the same endpoint always produces the same name", async () => {
  const { toolNameForEndpoint } = await load();

  // Determinism is what lets the schema and the call resolution derive the
  // name independently, with no lookup table between them.
  const endpoint = { id: ID_A, name: "Order Status" };
  assert.equal(toolNameForEndpoint(endpoint), toolNameForEndpoint(endpoint));
});

test("a tool call resolves back to the endpoint it names", async () => {
  const { toolNameForEndpoint, findEndpointByToolName } = await load();

  const endpoints = [
    { id: ID_A, name: "Order Status" },
    { id: ID_B, name: "Order Status" },
  ];

  const first = findEndpointByToolName(
    endpoints,
    toolNameForEndpoint(endpoints[0])
  );
  const second = findEndpointByToolName(
    endpoints,
    toolNameForEndpoint(endpoints[1])
  );

  assert.equal(first?.id, ID_A);
  assert.equal(second?.id, ID_B, "identically named endpoints must not alias");
  assert.equal(findEndpointByToolName(endpoints, "nope_00000000"), undefined);
});
