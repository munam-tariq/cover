"use client";

import Link from "next/link";

const links = {
  Product: [
    { label: "Features", href: "#showcase" },
    { label: "Pricing", href: "#pricing" },
    { label: "Blog", href: "/blog" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-black/[0.06]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          {/* Brand */}
          <div>
            <p className="text-sm font-medium text-zinc-900 mb-2">SupportBase</p>
            <p className="text-xs text-zinc-400 max-w-xs">
              AI-powered lead capture for your website. Turn visitors into
              customers, 24/7.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            {Object.entries(links).map(([group, items]) => (
              <div key={group}>
                <p className="text-xs text-zinc-400 mb-3">{group}</p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-black/[0.04]">
          <p className="text-[11px] text-zinc-400">
            &copy; {new Date().getFullYear()} SupportBase
          </p>
        </div>
      </div>
    </footer>
  );
}
