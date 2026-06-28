/**
 * SSRF guard for outbound fetches.
 *
 * Blocks requests to private / loopback / link-local / metadata addresses and non-HTTP(S)
 * schemes. Two layers:
 *
 *   1. `isUrlSafeForFetch`  — validates the URL's literal host (fast, sync).
 *   2. `resolveAndValidateUrl` — resolves DNS and re-checks the resulting IP(s)
 *      (async, catches DNS-rebinding where a domain resolves to a private IP).
 */

import { promises as dnsPromises } from "node:dns";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (
    parts.length !== 4 ||
    parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (100.64.0.0/10)
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local (ULA)
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped IPv6: dotted form (::ffff:127.0.0.1) or hex form (::ffff:7f00:1).
    const tail = lower.slice("::ffff:".length);
    if (tail.includes(".")) return isPrivateIPv4(tail);
    const hextets = tail.split(":");
    if (hextets.length === 2) {
      const [hi, lo] = hextets.map((h) => parseInt(h, 16));
      if (Number.isInteger(hi) && Number.isInteger(lo)) {
        const dotted = `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
        return isPrivateIPv4(dotted);
      }
    }
  }
  return false;
}

/**
 * Returns { ok: true } if the URL is safe to fetch from the server, or
 * { ok: false, reason } describing why it was blocked.
 */
export function isUrlSafeForFetch(rawUrl: string): {
  ok: boolean;
  reason?: string;
} {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `Blocked URL scheme: ${url.protocol}` };
  }

  // WHATWG URL keeps brackets on IPv6 literals ("[::1]") — strip them before
  // classification or net.isIP() returns 0 and the IPv6 checks never run.
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: "Blocked host" };
  }
  if (
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host.endsWith(".localhost")
  ) {
    return { ok: false, reason: "Blocked host" };
  }

  const ipType = net.isIP(host);
  if (ipType === 4 && isPrivateIPv4(host)) {
    return {
      ok: false,
      reason: "Private, loopback or link-local address is not allowed",
    };
  }
  if (ipType === 6 && isPrivateIPv6(host)) {
    return {
      ok: false,
      reason: "Private, loopback or link-local address is not allowed",
    };
  }

  return { ok: true };
}

type DnsResolver = {
  resolve4(hostname: string): Promise<string[]>;
  resolve6(hostname: string): Promise<string[]>;
};

/**
 * Static URL check + DNS-rebinding defense.
 *
 * Resolves the hostname and verifies none of the returned IPs are private. Accepts an
 * optional `resolver` for testing (defaults to `dns.promises`).
 *
 * If DNS resolution fails entirely (NXDOMAIN, timeout), the request is blocked — a domain
 * that can't be resolved can't be fetched anyway.
 */
export async function resolveAndValidateUrl(
  rawUrl: string,
  resolver?: DnsResolver
): Promise<{ ok: boolean; reason?: string }> {
  const staticCheck = isUrlSafeForFetch(rawUrl);
  if (!staticCheck.ok) return staticCheck;

  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (net.isIP(host)) return { ok: true };

  const dns: DnsResolver = resolver ?? dnsPromises;
  const [v4, v6] = await Promise.allSettled([
    dns.resolve4(host),
    dns.resolve6(host),
  ]);

  const ips: string[] = [];
  if (v4.status === "fulfilled") ips.push(...v4.value);
  if (v6.status === "fulfilled") ips.push(...v6.value);

  if (ips.length === 0) {
    return { ok: false, reason: "DNS resolution returned no addresses" };
  }

  for (const ip of ips) {
    if (net.isIP(ip) === 4 && isPrivateIPv4(ip)) {
      return { ok: false, reason: `DNS resolved to private address ${ip}` };
    }
    if (net.isIP(ip) === 6 && isPrivateIPv6(ip)) {
      return { ok: false, reason: `DNS resolved to private address ${ip}` };
    }
  }

  return { ok: true };
}
