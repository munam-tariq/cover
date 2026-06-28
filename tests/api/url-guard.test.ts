import assert from "node:assert/strict";
import test from "node:test";

import {
  isPrivateIPv4,
  isPrivateIPv6,
  isUrlSafeForFetch,
  resolveAndValidateUrl,
} from "../../apps/api/src/lib/url-guard.ts";

// ---------------------------------------------------------------------------
// isPrivateIPv4
// ---------------------------------------------------------------------------

test("isPrivateIPv4 blocks loopback", () => {
  assert.ok(isPrivateIPv4("127.0.0.1"));
  assert.ok(isPrivateIPv4("127.255.255.255"));
});

test("isPrivateIPv4 blocks 10.x private range", () => {
  assert.ok(isPrivateIPv4("10.0.0.1"));
  assert.ok(isPrivateIPv4("10.255.255.255"));
});

test("isPrivateIPv4 blocks 172.16-31 private range", () => {
  assert.ok(isPrivateIPv4("172.16.0.1"));
  assert.ok(isPrivateIPv4("172.31.255.255"));
  assert.ok(!isPrivateIPv4("172.15.0.1"));
  assert.ok(!isPrivateIPv4("172.32.0.1"));
});

test("isPrivateIPv4 blocks 192.168 private range", () => {
  assert.ok(isPrivateIPv4("192.168.0.1"));
  assert.ok(isPrivateIPv4("192.168.255.255"));
});

test("isPrivateIPv4 blocks link-local / cloud metadata", () => {
  assert.ok(isPrivateIPv4("169.254.169.254"));
  assert.ok(isPrivateIPv4("169.254.0.1"));
});

test("isPrivateIPv4 blocks CGNAT range (100.64/10)", () => {
  assert.ok(isPrivateIPv4("100.64.0.1"));
  assert.ok(isPrivateIPv4("100.127.255.255"));
  assert.ok(!isPrivateIPv4("100.63.255.255"));
  assert.ok(!isPrivateIPv4("100.128.0.1"));
});

test("isPrivateIPv4 blocks 0.0.0.0/8", () => {
  assert.ok(isPrivateIPv4("0.0.0.0"));
  assert.ok(isPrivateIPv4("0.255.255.255"));
});

test("isPrivateIPv4 allows public IPs", () => {
  assert.ok(!isPrivateIPv4("8.8.8.8"));
  assert.ok(!isPrivateIPv4("1.1.1.1"));
  assert.ok(!isPrivateIPv4("93.184.216.34"));
});

// ---------------------------------------------------------------------------
// isPrivateIPv6
// ---------------------------------------------------------------------------

test("isPrivateIPv6 blocks loopback and unspecified", () => {
  assert.ok(isPrivateIPv6("::1"));
  assert.ok(isPrivateIPv6("::"));
});

test("isPrivateIPv6 blocks link-local", () => {
  assert.ok(isPrivateIPv6("fe80::1"));
  assert.ok(isPrivateIPv6("fe80::abcd:1234"));
});

test("isPrivateIPv6 blocks ULA (fc/fd)", () => {
  assert.ok(isPrivateIPv6("fc00::1"));
  assert.ok(isPrivateIPv6("fd12:3456::1"));
});

test("isPrivateIPv6 blocks IPv4-mapped private (dotted)", () => {
  assert.ok(isPrivateIPv6("::ffff:127.0.0.1"));
  assert.ok(isPrivateIPv6("::ffff:169.254.169.254"));
  assert.ok(isPrivateIPv6("::ffff:10.0.0.1"));
});

test("isPrivateIPv6 blocks IPv4-mapped private (hex)", () => {
  assert.ok(isPrivateIPv6("::ffff:7f00:1")); // 127.0.0.1
  assert.ok(isPrivateIPv6("::ffff:a9fe:a9fe")); // 169.254.169.254
});

test("isPrivateIPv6 allows public IPv4-mapped", () => {
  assert.ok(!isPrivateIPv6("::ffff:8.8.8.8"));
});

// ---------------------------------------------------------------------------
// isUrlSafeForFetch
// ---------------------------------------------------------------------------

test("isUrlSafeForFetch blocks private IPs", () => {
  assert.ok(!isUrlSafeForFetch("http://127.0.0.1/path").ok);
  assert.ok(!isUrlSafeForFetch("http://10.0.0.1").ok);
  assert.ok(!isUrlSafeForFetch("http://169.254.169.254/latest/meta-data").ok);
  assert.ok(!isUrlSafeForFetch("http://100.64.0.1").ok);
});

test("isUrlSafeForFetch blocks IPv6 private addresses", () => {
  assert.ok(!isUrlSafeForFetch("http://[::1]/path").ok);
  assert.ok(!isUrlSafeForFetch("http://[fe80::1]").ok);
  assert.ok(!isUrlSafeForFetch("http://[::ffff:127.0.0.1]").ok);
});

test("isUrlSafeForFetch blocks metadata hostnames", () => {
  assert.ok(!isUrlSafeForFetch("http://metadata/").ok);
  assert.ok(!isUrlSafeForFetch("http://metadata.google.internal/").ok);
  assert.ok(!isUrlSafeForFetch("http://instance-data/").ok);
});

test("isUrlSafeForFetch blocks reserved TLDs", () => {
  assert.ok(!isUrlSafeForFetch("http://foo.internal").ok);
  assert.ok(!isUrlSafeForFetch("http://foo.local").ok);
  assert.ok(!isUrlSafeForFetch("http://foo.localhost").ok);
});

test("isUrlSafeForFetch blocks non-HTTP schemes", () => {
  assert.ok(!isUrlSafeForFetch("ftp://example.com").ok);
  assert.ok(!isUrlSafeForFetch("file:///etc/passwd").ok);
  assert.ok(!isUrlSafeForFetch("gopher://evil.com").ok);
});

test("isUrlSafeForFetch allows public URLs", () => {
  assert.ok(isUrlSafeForFetch("https://example.com").ok);
  assert.ok(isUrlSafeForFetch("http://93.184.216.34").ok);
  assert.ok(isUrlSafeForFetch("https://api.github.com/repos").ok);
});

// ---------------------------------------------------------------------------
// resolveAndValidateUrl (with mock DNS resolver)
// ---------------------------------------------------------------------------

function mockResolver(v4: string[], v6: string[] = []) {
  return {
    resolve4: async () => v4,
    resolve6: async () => v6,
  };
}

function failingResolver() {
  return {
    resolve4: async () => { throw new Error("NXDOMAIN"); },
    resolve6: async () => { throw new Error("NXDOMAIN"); },
  };
}

test("resolveAndValidateUrl passes for public IPs", async () => {
  const result = await resolveAndValidateUrl(
    "https://example.com",
    mockResolver(["93.184.216.34"])
  );
  assert.ok(result.ok);
});

test("resolveAndValidateUrl blocks DNS resolving to private IPv4", async () => {
  const result = await resolveAndValidateUrl(
    "https://evil.com",
    mockResolver(["127.0.0.1"])
  );
  assert.ok(!result.ok);
  assert.match(result.reason!, /private address/i);
});

test("resolveAndValidateUrl blocks DNS resolving to metadata IP", async () => {
  const result = await resolveAndValidateUrl(
    "https://evil.com",
    mockResolver(["169.254.169.254"])
  );
  assert.ok(!result.ok);
});

test("resolveAndValidateUrl blocks DNS resolving to private IPv6", async () => {
  const result = await resolveAndValidateUrl(
    "https://evil.com",
    mockResolver([], ["::1"])
  );
  assert.ok(!result.ok);
});

test("resolveAndValidateUrl blocks if DNS returns no addresses", async () => {
  const result = await resolveAndValidateUrl(
    "https://nxdomain.invalid",
    failingResolver()
  );
  assert.ok(!result.ok);
  assert.match(result.reason!, /no addresses/i);
});

test("resolveAndValidateUrl skips DNS for IP literals", async () => {
  const result = await resolveAndValidateUrl(
    "https://8.8.8.8",
    failingResolver() // should not be called
  );
  assert.ok(result.ok);
});

test("resolveAndValidateUrl blocks mixed results with any private IP", async () => {
  const result = await resolveAndValidateUrl(
    "https://evil.com",
    mockResolver(["93.184.216.34", "10.0.0.1"])
  );
  assert.ok(!result.ok);
});

test("resolveAndValidateUrl inherits static URL checks", async () => {
  const result = await resolveAndValidateUrl(
    "ftp://example.com",
    mockResolver(["93.184.216.34"])
  );
  assert.ok(!result.ok);
  assert.match(result.reason!, /scheme/i);
});
