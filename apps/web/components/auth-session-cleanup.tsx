"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import { clearStaleAuthCookies } from "@/lib/supabase/clear-stale-cookies";

/**
 * See clearStaleAuthCookies for why the library's own cleanup can leave a
 * session cookie behind forever. This strips it whenever GoTrue signals the
 * session is gone (fires unconditionally, even when its own removal no-ops).
 */
export function AuthSessionCleanup() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearStaleAuthCookies();
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
