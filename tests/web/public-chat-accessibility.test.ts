import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the public chat composer is identifiable to browsers and assistive tooling", async () => {
  const publicChat = await readFile(
    new URL(
      "../../apps/web/app/[locale]/c/[handle]/public-chat.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const composer = publicChat.slice(
    publicChat.indexOf("<textarea"),
    publicChat.indexOf("</textarea>")
  );

  assert.match(composer, /id="public-chat-message"/);
  assert.match(composer, /name="message"/);
});
