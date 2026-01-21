/**
 * IP Geolocation Service
 *
 * Provides IP-to-location lookup using the free ip-api.com service.
 * Rate limit: 45 requests per minute (free tier).
 */

export interface GeoInfo {
  country: string | null;
  city: string | null;
  timezone: string | null;
  countryCode: string | null;
}

/**
 * Check if an IP address is private or localhost
 */
function isPrivateIP(ip: string): boolean {
  if (!ip) return true;

  // Localhost
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") {
    return true;
  }

  // IPv4 private ranges
  const privateRanges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (link-local)
  ];

  return privateRanges.some((range) => range.test(ip));
}

/**
 * Clean IP address from forwarded header
 * Handles formats like "1.2.3.4, 5.6.7.8" or "1.2.3.4:12345"
 */
function cleanIP(ip: string): string {
  if (!ip) return "";

  // Take first IP if comma-separated (proxy chain)
  let cleaned = ip.split(",")[0].trim();

  // Remove port if present
  if (cleaned.includes(":") && !cleaned.includes("::")) {
    // IPv4 with port
    cleaned = cleaned.split(":")[0];
  }

  return cleaned;
}

/**
 * Get geolocation from IP address using ip-api.com (free, no key needed)
 *
 * @param ip - The IP address to lookup
 * @returns GeoInfo or null if lookup fails or IP is private
 */
export async function getGeoFromIP(ip: string): Promise<GeoInfo | null> {
  const cleanedIP = cleanIP(ip);

  // Skip for private/localhost IPs
  if (isPrivateIP(cleanedIP)) {
    return null;
  }

  try {
    // ip-api.com free tier - 45 req/min
    // Using specific fields to minimize response size
    const response = await fetch(
      `http://ip-api.com/json/${cleanedIP}?fields=status,country,countryCode,city,timezone`,
      {
        signal: AbortSignal.timeout(3000), // 3 second timeout
      }
    );

    if (!response.ok) {
      console.warn(`IP geolocation failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== "success") {
      return null;
    }

    return {
      country: data.country || null,
      countryCode: data.countryCode || null,
      city: data.city || null,
      timezone: data.timezone || null,
    };
  } catch (error) {
    // Don't log timeout errors (common for localhost testing)
    if (!(error instanceof Error && error.name === "TimeoutError")) {
      console.warn("IP geolocation error:", error);
    }
    return null;
  }
}
