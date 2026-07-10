"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Sessions created before the `.frontface.app` cross-subdomain cookie scoping
 * shipped are host-only (no Domain attribute). @supabase/ssr always removes
 * the session cookie scoped to the configured domain, which never matches a
 * host-only cookie (cookie deletion requires an exact Domain+Path match to
 * how it was set) — so those leftovers can never be cleared by the library
 * itself. Once such a session dies server-side, every getSession()/getUser()
 * call across the app keeps retrying the same dead refresh token forever,
 * since cleanup silently no-ops. This strips the host-only leftover whenever
 * GoTrue signals the session is gone.
 */
export function AuthSessionCleanup() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") return;

      document.cookie
        .split("; ")
        .map((c) => c.split("=")[0])
        .filter((name) => /^sb-.*-auth-token$/.test(name))
        .forEach((name) => {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        });
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
