import assert from "node:assert/strict";
import test from "node:test";

import {
  getSelectedPathname,
  isSidebarItemActive,
} from "../../apps/web/components/layout/sidebar-navigation.ts";

test("uses the pending destination before the committed pathname", () => {
  assert.equal(getSelectedPathname("/dashboard", "/analytics"), "/analytics");
});

test("uses the committed pathname when no destination is pending", () => {
  assert.equal(getSelectedPathname("/dashboard", null), "/dashboard");
});

test("matches exact and nested sidebar routes without matching siblings", () => {
  assert.equal(isSidebarItemActive("/settings", "/settings"), true);
  assert.equal(isSidebarItemActive("/settings/handoff", "/settings"), true);
  assert.equal(isSidebarItemActive("/settings-old", "/settings"), false);
});
