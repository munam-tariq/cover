import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const projectsPath = new URL(
  "../../apps/api/src/routes/projects.ts",
  import.meta.url
);
const connectionsPath = new URL(
  "../../apps/api/src/services/channels/connections.ts",
  import.meta.url
);
const channelTypesPath = new URL(
  "../../apps/api/src/types/channels.ts",
  import.meta.url
);
const envExamplePath = new URL("../../apps/api/.env.example", import.meta.url);

describe("channel API endpoints in projects.ts", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(projectsPath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("has GET /:id/channels endpoint", () => {
    assert.ok(src.includes('/:id/channels"'));
  });

  it("has POST /:id/channels/whatsapp endpoint", () => {
    assert.ok(src.includes('/:id/channels/whatsapp"'));
  });

  it("has DELETE /:id/channels/whatsapp/:connectionId endpoint", () => {
    assert.ok(src.includes("/:id/channels/whatsapp/:connectionId"));
  });

  it("has POST /:id/channels/whatsapp/test endpoint", () => {
    assert.ok(src.includes('/:id/channels/whatsapp/test"'));
  });

  it("disconnect uses disabled status, not disconnected", () => {
    assert.ok(!src.includes('"disconnected"'));
    assert.ok(!src.includes("'disconnected'"));
    assert.ok(src.includes('"disabled"') || src.includes("'disabled'"));
  });

  it("disconnect scopes status update to project and provider", () => {
    assert.ok(
      src.includes('setProjectConnectionStatus(') &&
        src.includes('"whatsapp"') &&
        src.includes('"disabled"'),
      "DELETE must use setProjectConnectionStatus with project scope"
    );
    assert.ok(
      !src.includes("setConnectionStatus(connectionId"),
      "DELETE must not update arbitrary connectionId without project scope"
    );
  });

  it("uses owner-only access (allowMember=false) for all channel endpoints", () => {
    const channelSection = src.slice(src.indexOf("/:id/channels"));
    const accessCalls = [...channelSection.matchAll(/getAccessibleProject\([^)]+\)/g)];
    for (const match of accessCalls) {
      assert.ok(
        match[0].includes("false"),
        `Channel endpoint must use owner-only access: ${match[0]}`
      );
    }
  });

  it("GET channels does NOT return credentials or encryptedCredentials", () => {
    const getIdx = src.indexOf('/:id/channels"');
    const getBlock = src.slice(getIdx, getIdx + 1500);
    assert.ok(
      !getBlock.includes("encryptedCredentials") ||
        getBlock.includes("encryptedCredentials: _") ||
        getBlock.includes("encryptedCredentials, ..."),
      "GET channels must strip encryptedCredentials from response"
    );
  });
});

describe("getProjectConnection in connections.ts", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(connectionsPath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("exports getProjectConnection function", () => {
    assert.ok(
      src.includes("export async function getProjectConnection") ||
        src.includes("export function getProjectConnection"),
      "Must export getProjectConnection for GET channels endpoint"
    );
  });

  it("exports scoped setProjectConnectionStatus helper", () => {
    assert.ok(
      src.includes("export async function setProjectConnectionStatus") ||
        src.includes("export function setProjectConnectionStatus"),
      "Must export project-scoped status update helper for DELETE endpoint"
    );
    assert.ok(
      src.includes('.eq("project_id", projectId)') ||
        src.includes(".eq('project_id', projectId)"),
    );
    assert.ok(
      src.includes('.eq("provider", provider)') ||
        src.includes(".eq('provider', provider)"),
    );
  });
});

describe("WhatsAppCredentials type", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(channelTypesPath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("does not require per-connection verifyToken", () => {
    const match = src.match(/export interface WhatsAppCredentials \{([\s\S]*?)\}/);
    assert.ok(match, "expected WhatsAppCredentials interface");
    assert.ok(!match[1].includes("verifyToken"));
  });

  it("allows optional wabaId", () => {
    const match = src.match(/export interface WhatsAppCredentials \{([\s\S]*?)\}/);
    assert.ok(match, "expected WhatsAppCredentials interface");
    assert.match(match[1], /wabaId\?:\s*string/);
  });
});

describe("WhatsApp env example", () => {
  let src: string;

  it("loads env example", async () => {
    src = await readFile(envExamplePath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("documents platform-level WhatsApp webhook settings", () => {
    assert.match(src, /^WHATSAPP_VERIFY_TOKEN=/m);
    assert.match(src, /^GRAPH_API_VERSION=v25\.0$/m);
  });

  it("does not document a global WhatsApp app secret fallback", () => {
    assert.doesNotMatch(src, /^WHATSAPP_APP_SECRET=/m);
  });
});
