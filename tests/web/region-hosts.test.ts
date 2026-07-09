import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  authCookieDomainForHost,
  regionLocaleForHost,
} from "../../apps/web/lib/region-hosts.ts";

describe("regionLocaleForHost", () => {
  it("defaults the ksa subdomain to Arabic", () => {
    assert.equal(regionLocaleForHost("ksa.frontface.app"), "ar");
    assert.equal(regionLocaleForHost("KSA.FrontFace.app"), "ar");
    assert.equal(regionLocaleForHost("ksa.frontface.app:443"), "ar");
  });

  it("returns null for non-region hosts", () => {
    assert.equal(regionLocaleForHost("frontface.app"), null);
    assert.equal(regionLocaleForHost("app.frontface.app"), null);
    assert.equal(regionLocaleForHost("localhost:3000"), null);
    assert.equal(regionLocaleForHost(""), null);
    assert.equal(regionLocaleForHost(null), null);
  });
});

describe("authCookieDomainForHost", () => {
  it("shares .frontface.app across the apex and its subdomains", () => {
    assert.equal(authCookieDomainForHost("frontface.app"), ".frontface.app");
    assert.equal(
      authCookieDomainForHost("ksa.frontface.app"),
      ".frontface.app"
    );
    assert.equal(
      authCookieDomainForHost("app.frontface.app:443"),
      ".frontface.app"
    );
    assert.equal(authCookieDomainForHost("FRONTFACE.APP"), ".frontface.app");
  });

  it("stays host-only (undefined) off production", () => {
    assert.equal(authCookieDomainForHost("localhost:3000"), undefined);
    assert.equal(authCookieDomainForHost("preview.vercel.app"), undefined);
    assert.equal(authCookieDomainForHost(""), undefined);
    assert.equal(authCookieDomainForHost(null), undefined);
  });

  it("rejects lookalike domains", () => {
    assert.equal(authCookieDomainForHost("notfrontface.app"), undefined);
    assert.equal(authCookieDomainForHost("frontface.app.evil.com"), undefined);
  });
});
