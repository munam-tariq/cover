/**
 * Device Information Utility
 *
 * Collects browser, OS, device, and page context information
 * for analytics and customer tracking purposes.
 */

export interface DeviceInfo {
  // Browser
  userAgent: string;
  browser: string;
  browserVersion: string;

  // OS
  os: string;
  osVersion: string;

  // Device
  device: "desktop" | "mobile" | "tablet";
  screenWidth: number;
  screenHeight: number;

  // Page context
  pageUrl: string;
  pageTitle: string;
  referrer: string;

  // Timezone & Language
  timezone: string;
  language: string;
}

/**
 * Detect browser name from user agent string
 */
function detectBrowser(ua: string): string {
  // Order matters - check more specific patterns first
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg/") || ua.includes("Edge")) return "Edge";
  if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("MSIE") || ua.includes("Trident/")) return "IE";
  return "Unknown";
}

/**
 * Detect browser version from user agent string
 */
function detectBrowserVersion(ua: string): string {
  const browser = detectBrowser(ua);
  const patterns: Record<string, RegExp> = {
    Firefox: /Firefox\/(\d+(?:\.\d+)?)/,
    Edge: /Edg\/(\d+(?:\.\d+)?)/,
    Opera: /(?:OPR|Opera)\/(\d+(?:\.\d+)?)/,
    Chrome: /Chrome\/(\d+(?:\.\d+)?)/,
    Safari: /Version\/(\d+(?:\.\d+)?)/,
    IE: /(?:MSIE |rv:)(\d+(?:\.\d+)?)/,
  };

  const pattern = patterns[browser];
  if (!pattern) return "";

  const match = ua.match(pattern);
  return match ? match[1] : "";
}

/**
 * Detect operating system from user agent string
 */
function detectOS(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS X") || ua.includes("Macintosh")) return "macOS";
  if (ua.includes("CrOS")) return "ChromeOS";
  if (ua.includes("Linux") && !ua.includes("Android")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")) return "iOS";
  return "Unknown";
}

/**
 * Detect OS version from user agent string
 */
function detectOSVersion(ua: string): string {
  const os = detectOS(ua);
  const patterns: Record<string, RegExp> = {
    Windows: /Windows NT (\d+(?:\.\d+)?)/,
    macOS: /Mac OS X (\d+[._]\d+(?:[._]\d+)?)/,
    Android: /Android (\d+(?:\.\d+)?)/,
    iOS: /(?:iPhone|iPad|iPod).*?OS (\d+[._]\d+)/,
    ChromeOS: /CrOS \w+ (\d+(?:\.\d+)?)/,
  };

  const pattern = patterns[os];
  if (!pattern) return "";

  const match = ua.match(pattern);
  if (match) {
    return match[1].replace(/_/g, ".");
  }
  return "";
}

/**
 * Detect device type from user agent string
 */
function detectDevice(ua: string): "desktop" | "mobile" | "tablet" {
  // Tablets
  if (/iPad/i.test(ua)) return "tablet";
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return "tablet";
  if (/Tablet/i.test(ua)) return "tablet";

  // Mobile
  if (/Mobile|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) {
    return "mobile";
  }

  // Default to desktop
  return "desktop";
}

/**
 * Safely get page URL, stripping sensitive query parameters
 */
function getSafePageUrl(): string {
  try {
    const url = new URL(window.location.href);
    // Remove potentially sensitive query params
    const sensitiveParams = ["token", "key", "secret", "password", "auth", "session"];
    sensitiveParams.forEach((param) => {
      url.searchParams.delete(param);
    });
    return url.toString();
  } catch {
    return window.location.href;
  }
}

/**
 * Get timezone safely
 */
function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}

/**
 * Collect all device and page context information
 */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;

  return {
    // Browser
    userAgent: ua,
    browser: detectBrowser(ua),
    browserVersion: detectBrowserVersion(ua),

    // OS
    os: detectOS(ua),
    osVersion: detectOSVersion(ua),

    // Device
    device: detectDevice(ua),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,

    // Page context
    pageUrl: getSafePageUrl(),
    pageTitle: document.title || "",
    referrer: document.referrer || "",

    // Timezone & Language
    timezone: getTimezone(),
    language: navigator.language || "",
  };
}
