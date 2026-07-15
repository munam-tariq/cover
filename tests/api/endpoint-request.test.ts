import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL(
  "../../apps/api/src/services/endpoint-request.ts",
  import.meta.url
);

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type EndpointRequestModule = {
  extractPlaceholders: (text: string) => string[];
  extractEndpointParams: (endpoint: {
    url: string;
    bodyTemplate?: JsonValue | null;
  }) => string[];
  substituteTemplate: (
    template: JsonValue,
    args: Record<string, string>
  ) => JsonValue;
  substituteUrlParams: (url: string, args: Record<string, string>) => string;
  findMissingParams: (
    params: string[],
    args: Record<string, unknown>
  ) => string[];
  buildAuthHeaders: (
    authType: string,
    authConfig: Record<string, unknown> | null
  ) => Record<string, string>;
  buildEndpointRequest: (
    endpoint: {
      method: string;
      authType: string;
      authConfig: Record<string, unknown> | null;
      bodyTemplate?: JsonValue | null;
    },
    args: Record<string, string>
  ) => { headers: Record<string, string>; body?: string };
};

const load = async (): Promise<EndpointRequestModule> =>
  (await import(moduleUrl.href)) as EndpointRequestModule;

test("placeholders are collected from both the URL and the body template", async () => {
  const { extractEndpointParams } = await load();

  assert.deepEqual(
    extractEndpointParams({ url: "https://api.test/orders/{order_id}" }),
    ["order_id"]
  );

  assert.deepEqual(
    extractEndpointParams({
      url: "https://api.test/orders/{order_id}",
      bodyTemplate: { email: "{email}", nested: { note: "{note}" } },
    }),
    ["order_id", "email", "note"]
  );

  // A param used in both places is only declared once.
  assert.deepEqual(
    extractEndpointParams({
      url: "https://api.test/orders/{order_id}",
      bodyTemplate: { id: "{order_id}" },
    }),
    ["order_id"]
  );

  assert.deepEqual(
    extractEndpointParams({ url: "https://api.test/orders", bodyTemplate: null }),
    []
  );
});

test("template placeholders are found inside arrays and nested objects", async () => {
  const { extractEndpointParams } = await load();

  assert.deepEqual(
    extractEndpointParams({
      url: "https://api.test/x",
      bodyTemplate: {
        items: [{ sku: "{sku}" }, { sku: "{other_sku}" }],
        meta: { deep: { deeper: "{deep_param}" } },
      },
    }),
    ["sku", "other_sku", "deep_param"]
  );
});

test("an argument value cannot inject structure into the request body", async () => {
  const { substituteTemplate } = await load();

  // A value crafted to break out of its JSON string and forge a sibling field.
  const hostile = '", "isAdmin": true, "x": "';
  const result = substituteTemplate({ name: "{name}" }, { name: hostile });

  assert.deepEqual(result, { name: hostile });

  // The forged field must not survive a stringify/parse round trip.
  const parsed = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
  assert.equal(parsed.isAdmin, undefined);
  assert.deepEqual(Object.keys(parsed), ["name"]);
});

test("static non-string values keep their JSON types", async () => {
  const { substituteTemplate } = await load();

  const result = substituteTemplate(
    { order_id: "{order_id}", qty: 5, notify: true, ref: null },
    { order_id: "A123" }
  );

  assert.deepEqual(result, {
    order_id: "A123",
    qty: 5,
    notify: true,
    ref: null,
  });
});

test("substitution recurses through arrays and nested objects", async () => {
  const { substituteTemplate } = await load();

  const result = substituteTemplate(
    {
      items: [{ sku: "{sku}", qty: 2 }],
      meta: { deep: { note: "for {name}" } },
    },
    { sku: "SKU-9", name: "Ada" }
  );

  assert.deepEqual(result, {
    items: [{ sku: "SKU-9", qty: 2 }],
    meta: { deep: { note: "for Ada" } },
  });
});

test("a substituted value is a string, and interpolation fills in place", async () => {
  const { substituteTemplate } = await load();

  // Whole-string placeholder -> the raw value, still a string.
  assert.deepEqual(substituteTemplate({ qty: "{qty}" }, { qty: "5" }), {
    qty: "5",
  });

  // Placeholder embedded in surrounding text -> interpolated.
  assert.deepEqual(
    substituteTemplate({ msg: "Order {id} for {name}" }, { id: "7", name: "Ada" }),
    { msg: "Order 7 for Ada" }
  );
});

test("URL params are encoded but body params are not", async () => {
  const { substituteUrlParams, substituteTemplate } = await load();

  assert.equal(
    substituteUrlParams("https://api.test/o/{order_id}", {
      order_id: "a b/c&d",
    }),
    "https://api.test/o/a%20b%2Fc%26d"
  );

  assert.deepEqual(
    substituteTemplate({ order_id: "{order_id}" }, { order_id: "a b/c&d" }),
    { order_id: "a b/c&d" }
  );
});

test("missing params are reported but an empty string is a real value", async () => {
  const { findMissingParams } = await load();

  assert.deepEqual(findMissingParams(["a", "b"], { a: "1" }), ["b"]);
  assert.deepEqual(findMissingParams(["a"], { a: undefined }), ["a"]);
  assert.deepEqual(findMissingParams(["a"], { a: null }), ["a"]);

  // Empty string and "0" are legitimate values, not missing ones.
  assert.deepEqual(findMissingParams(["a"], { a: "" }), []);
  assert.deepEqual(findMissingParams(["a"], { a: "0" }), []);
});

test("auth headers are built per auth type", async () => {
  const { buildAuthHeaders } = await load();

  assert.deepEqual(buildAuthHeaders("none", null), {});
  assert.deepEqual(buildAuthHeaders("none", { apiKey: "k" }), {});
  assert.deepEqual(buildAuthHeaders("api_key", null), {});

  assert.deepEqual(buildAuthHeaders("api_key", { apiKey: "k" }), {
    "X-API-Key": "k",
  });
  assert.deepEqual(
    buildAuthHeaders("api_key", { apiKey: "k", apiKeyHeader: "X-Custom" }),
    { "X-Custom": "k" }
  );
  assert.deepEqual(buildAuthHeaders("bearer", { bearerToken: "t" }), {
    Authorization: "Bearer t",
  });
});

test("a body is sent only for POST with a template", async () => {
  const { buildEndpointRequest } = await load();

  const base = { authType: "none", authConfig: null };

  // GET never sends a body, even if a template somehow exists.
  const get = buildEndpointRequest(
    { ...base, method: "GET", bodyTemplate: { a: "{a}" } },
    { a: "1" }
  );
  assert.equal(get.body, undefined);
  assert.equal(get.headers["Content-Type"], undefined);

  // POST without a template sends no body.
  const postNoTemplate = buildEndpointRequest(
    { ...base, method: "POST", bodyTemplate: null },
    {}
  );
  assert.equal(postNoTemplate.body, undefined);
  assert.equal(postNoTemplate.headers["Content-Type"], undefined);

  // POST with a template sends the substituted body and declares its type.
  const post = buildEndpointRequest(
    { ...base, method: "POST", bodyTemplate: { order_id: "{order_id}", qty: 5 } },
    { order_id: "A123" }
  );
  assert.equal(post.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(post.body as string), {
    order_id: "A123",
    qty: 5,
  });
});

test("built requests carry auth headers alongside the body", async () => {
  const { buildEndpointRequest } = await load();

  const req = buildEndpointRequest(
    {
      method: "POST",
      authType: "bearer",
      authConfig: { bearerToken: "t" },
      bodyTemplate: { id: "{id}" },
    },
    { id: "9" }
  );

  assert.equal(req.headers.Authorization, "Bearer t");
  assert.equal(req.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(req.body as string), { id: "9" });
});
