import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getChannelMeta } from "../../apps/web/lib/channels.ts";

describe("getChannelMeta", () => {
  it("returns WhatsApp metadata", () => {
    const meta = getChannelMeta("whatsapp");
    assert.equal(meta.label, "WhatsApp");
    assert.equal(meta.icon, "MessageCircle");
    assert.equal(meta.color, "#25D366");
  });

  it("returns widget metadata for 'widget' source", () => {
    const meta = getChannelMeta("widget");
    assert.equal(meta.label, "Widget");
    assert.equal(meta.icon, "MessageSquare");
    assert.equal(meta.color, "currentColor");
  });

  it("returns public page metadata", () => {
    const meta = getChannelMeta("public");
    assert.equal(meta.label, "Public Page");
    assert.equal(meta.icon, "Globe");
  });

  it("returns voice metadata", () => {
    const meta = getChannelMeta("voice");
    assert.equal(meta.label, "Voice");
    assert.equal(meta.icon, "Phone");
  });

  it("returns mobile metadata", () => {
    const meta = getChannelMeta("mobile");
    assert.equal(meta.label, "Mobile");
    assert.equal(meta.icon, "Smartphone");
  });

  it("returns fallback for unknown source", () => {
    const meta = getChannelMeta("something_new");
    assert.equal(meta.label, "Chat");
    assert.equal(meta.icon, "MessageSquare");
    assert.equal(meta.color, "currentColor");
  });
});
