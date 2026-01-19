/**
 * Domain Whitelist Middleware
 *
 * Validates that requests to widget APIs come from allowed domains.
 * This is an opt-in security feature - if no domains are configured,
 * all requests are allowed (preserving current behavior for existing customers).
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

// Domains that are always allowed (local development only)
const ALWAYS_ALLOWED_PATTERNS: (string | RegExp)[] = [
  'localhost',
  '127.0.0.1',
  /\.localhost$/,
  /\.local$/,
];

/**
 * Extract domain from Origin or Referer header
 */
function extractDomain(req: Request): string | null {
  // Try Origin header first (most reliable for CORS requests)
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      return url.hostname.toLowerCase();
    } catch {
      // Invalid URL, try next
    }
  }

  // Fallback to Referer header
  const referer = req.headers.referer;
  if (referer) {
    try {
      const url = new URL(referer);
      return url.hostname.toLowerCase();
    } catch {
      // Invalid URL
    }
  }

  return null;
}

/**
 * Check if domain matches an allowed pattern
 */
function isDomainAllowed(
  domain: string,
  allowedDomains: string[]
): boolean {
  // Check always-allowed patterns (dev/preview environments)
  for (const pattern of ALWAYS_ALLOWED_PATTERNS) {
    if (typeof pattern === 'string') {
      if (domain === pattern) return true;
    } else if (pattern.test(domain)) {
      return true;
    }
  }

  // If no domains configured, allow all (opt-in feature, no breaking change)
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }

  // Check against configured domains
  for (const allowed of allowedDomains) {
    const normalizedAllowed = allowed.toLowerCase().trim();

    // Exact match
    if (domain === normalizedAllowed) {
      return true;
    }

    // Auto-include www variant
    if (domain === `www.${normalizedAllowed}`) {
      return true;
    }

    // Wildcard match (*.example.com)
    if (normalizedAllowed.startsWith('*.')) {
      const baseDomain = normalizedAllowed.slice(2); // Remove '*.'
      if (domain === baseDomain || domain.endsWith(`.${baseDomain}`)) {
        return true;
      }
    }
  }

  return false;
}

// Cache for project domains (5 minute TTL)
const domainCache = new Map<string, { domains: string[]; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get allowed domains for a project (with caching)
 */
async function getProjectAllowedDomains(projectId: string): Promise<string[]> {
  // Check cache
  const cached = domainCache.get(projectId);
  if (cached && cached.expires > Date.now()) {
    return cached.domains;
  }

  // Fetch from database
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('allowed_domains')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    // Project not found - will be handled by other middleware
    return [];
  }

  const domains = data.allowed_domains || [];

  // Update cache
  domainCache.set(projectId, {
    domains,
    expires: Date.now() + CACHE_TTL_MS,
  });

  return domains;
}

/**
 * Clear cache for a project (call when domains are updated)
 */
export function clearDomainCache(projectId: string): void {
  domainCache.delete(projectId);
}

/**
 * Middleware factory for domain whitelisting
 *
 * @param options.requireDomain - If true, block requests with no domain header
 * @param options.projectIdSource - Where to find projectId ('body', 'query', 'params')
 * @param options.projectIdParam - The parameter name (default: 'projectId')
 */
export function domainWhitelistMiddleware(options: {
  requireDomain?: boolean;
  projectIdSource?: 'body' | 'query' | 'params';
  projectIdParam?: string;
} = {}) {
  const {
    requireDomain = false,
    projectIdSource = 'body',
    projectIdParam = 'projectId'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Extract project ID based on source
    let projectId: string | undefined;

    switch (projectIdSource) {
      case 'body':
        projectId = req.body?.[projectIdParam];
        break;
      case 'query':
        projectId = req.query[projectIdParam] as string;
        break;
      case 'params':
        projectId = req.params[projectIdParam];
        break;
    }

    if (!projectId) {
      // No project ID - let other middleware handle this error
      return next();
    }

    // Extract domain from request
    const domain = extractDomain(req);

    if (!domain) {
      if (requireDomain) {
        return res.status(403).json({
          error: {
            code: 'MISSING_ORIGIN',
            message: 'Request must include Origin or Referer header',
          },
        });
      }
      // Domain not required, allow request
      return next();
    }

    // Get allowed domains for project
    const allowedDomains = await getProjectAllowedDomains(projectId);

    // Check if domain is allowed
    if (!isDomainAllowed(domain, allowedDomains)) {
      console.warn(
        `[DomainWhitelist] Blocked request from unauthorized domain: ${domain} for project: ${projectId}`
      );

      return res.status(403).json({
        error: {
          code: 'DOMAIN_NOT_ALLOWED',
          message: `This widget is not authorized for use on ${domain}`,
        },
      });
    }

    // Domain is allowed, continue
    next();
  };
}

export { extractDomain, isDomainAllowed, getProjectAllowedDomains };
