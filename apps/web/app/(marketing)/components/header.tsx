"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { NAV } from "../landing-data";

import { Btn } from "./marketing-button";
import { Ic, Logo, WRAP } from "./marketing-kit";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const ctaHref = isLoggedIn ? "/dashboard" : "/login";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "background .25s, border-color .25s, box-shadow .25s",
        background: scrolled ? "rgba(246,247,249,.82)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: "1px solid " + (scrolled ? "var(--ff-line)" : "transparent"),
      }}
    >
      <nav
        style={{
          ...WRAP,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 68,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }} aria-label="FrontFace home">
          <Logo />
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: ".06em",
              color: "var(--ff-soft)",
              border: "1px solid var(--ff-line-2)",
              borderRadius: 6,
              padding: "2px 7px",
            }}
          >
            BETA
          </span>
        </Link>

        {/* desktop links */}
        <div className="ff-nav-links" style={{ display: "flex", alignItems: "center", gap: 30 }}>
          {NAV.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              style={{ fontSize: 14.5, fontWeight: 500, color: "var(--ff-soft)", transition: "color .15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ff-ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ff-soft)")}
            >
              {label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!isLoading &&
            (isLoggedIn ? (
              <Link
                href="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 38,
                  padding: "0 14px 0 6px",
                  borderRadius: 10,
                  border: "1px solid var(--ff-line-2)",
                  background: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ff-ink)",
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: "linear-gradient(150deg,var(--ff-ink),var(--ff-ink-3))",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  FF
                </span>
                Dashboard
              </Link>
            ) : (
              <span className="ff-cta-desktop">
                <Btn kind="primary" size="sm" href={ctaHref}>
                  Build your agent {Ic("arrowR", { size: 15 })}
                </Btn>
              </span>
            ))}

          {/* mobile menu toggle */}
          <button
            type="button"
            className="ff-nav-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            style={{
              display: "none",
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              border: "1px solid var(--ff-line-2)",
              background: "#fff",
              color: "var(--ff-ink)",
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* mobile dropdown */}
      {mobileOpen && (
        <div
          className="ff-nav-mobile"
          style={{
            display: "none",
            background: "rgba(246,247,249,.96)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--ff-line)",
          }}
        >
          <div style={{ ...WRAP, padding: "12px clamp(20px,5vw,40px) 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                style={{ padding: "12px 4px", fontSize: 15, fontWeight: 500, color: "var(--ff-soft)", borderBottom: "1px solid var(--ff-line)" }}
              >
                {label}
              </Link>
            ))}
            <div style={{ marginTop: 12 }}>
              <Btn kind="primary" size="md" href={ctaHref} style={{ width: "100%" }}>
                {isLoggedIn ? "Dashboard" : "Build your agent"} {Ic("arrowR", { size: 16 })}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* responsive rules for the nav */}
      <style>{`
        @media (max-width: 860px) {
          .ff-nav-links { display: none !important; }
          .ff-nav-toggle { display: inline-flex !important; }
          .ff-nav-mobile { display: block !important; }
        }
        @media (max-width: 520px) {
          .ff-cta-desktop { display: none !important; }
        }
      `}</style>
    </header>
  );
}
