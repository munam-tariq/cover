"use client";

import { usePathname } from "next/navigation";

export function DashboardContentTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="animate-in fade-in-0 duration-200 motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}
