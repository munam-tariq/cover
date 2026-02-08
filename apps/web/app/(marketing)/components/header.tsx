"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { label: "Product", href: "#showcase" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "/blog" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-black/[0.06]"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-lg font-semibold text-zinc-900 tracking-tight">
            SupportBase
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-400 border border-black/[0.08] rounded">
            Beta
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-zinc-500 hover:text-zinc-900 transition-colors text-[13px]"
            >
              {link.label}
            </Link>
          ))}
          {!isLoading && (
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="text-[13px] text-white bg-zinc-900 hover:bg-zinc-800 px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
            >
              {isLoggedIn ? "Dashboard" : "Start Free"}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-500 hover:text-zinc-900"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 backdrop-blur-xl border-b border-black/[0.06]"
          >
            <div className="px-6 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-zinc-500 hover:text-zinc-900 transition-colors text-sm"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-black/[0.06]">
                {!isLoading && (
                  <Link
                    href={isLoggedIn ? "/dashboard" : "/login"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm text-white text-center bg-zinc-900 hover:bg-zinc-800 py-2.5 rounded-full transition-colors"
                  >
                    {isLoggedIn ? "Dashboard" : "Start Free"}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
