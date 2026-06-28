/**
 * Domain Whitelist Middleware
 *
 * Validates that requests to widget APIs come from allowed domains.
 * This is an opt-in security feature - if no domains are configured,
 * all requests are allowed (preserving current behavior for existing customers).
 *
 * Pure domain matching lives in ./public-widget-gate (Supabase-free, unit-tested). This module
 * adds the project allowlist lookup (cached) and the Express middleware.
 */

import { Request, Response, NextFunction } from "express";

import { supabaseAdmin } from "../lib/supabase";
import {
  extractDomain,
  isAlwaysAllowedDomain,
  isDomainAllowed,
  matchesConfiguredDomain,
} from "./public-widget-gate";

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
    .from("projects")
    .select("allowed_domains")
    .eq("id", projectId)
    .is("deleted_at", null)
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
export function domainWhitelistMiddleware(
  options: {
    requireDomain?: boolean;
    projectIdSource?: "body" | "query" | "params";
    projectIdParam?: string;
  } = {}
) {
  const {
    requireDomain = false,
    projectIdSource = "body",
    projectIdParam = "projectId",
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Extract project ID based on source
    let projectId: string | undefined;

    switch (projectIdSource) {
      case "body":
        projectId = req.body?.[projectIdParam];
        break;
      case "query":
        projectId = req.query[projectIdParam] as string;
        break;
      case "params":
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
            code: "MISSING_ORIGIN",
            message: "Request must include Origin or Referer header",
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
          code: "DOMAIN_NOT_ALLOWED",
          message: `This widget is not authorized for use on ${domain}`,
        },
      });
    }

    // Domain is allowed, continue
    next();
  };
}

export {
  extractDomain,
  isAlwaysAllowedDomain,
  isDomainAllowed,
  matchesConfiguredDomain,
  getProjectAllowedDomains,
};
