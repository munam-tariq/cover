"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Inbox, Users } from "lucide-react";
import { useAgent } from "@/contexts/agent-context";
import { useProject } from "@/contexts/project-context";
import { useInboxPollingOptional } from "@/contexts/inbox-polling-context";

// Navigation items with role requirements
// roles: undefined = all, "owner" = owner only, "owner_admin" = owner or admin, "agent_only" = agents (not owners viewing their own project)
const allNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "home", roles: undefined },
  { href: "/inbox", label: "Inbox", icon: "inbox", roles: undefined },
  { href: "/team", label: "Team", icon: "users", roles: undefined },
  { href: "/projects", label: "Agents", icon: "folder", roles: "owner" as const },
  { href: "/leads", label: "Leads", icon: "user-plus", roles: "owner" as const },
  { href: "/analytics", label: "Analytics", icon: "bar-chart", roles: "owner" as const },
  { href: "/feedback", label: "Feedback", icon: "thumbs-up", roles: "owner" as const },
  { href: "/pulse", label: "Pulse", icon: "activity", roles: "owner" as const },
  { href: "/playground", label: "Playground", icon: "sparkles", roles: "owner_admin" as const },
  { href: "/knowledge", label: "Knowledge Base", icon: "book", roles: "owner_admin" as const },
  { href: "/api-endpoints", label: "API Endpoints", icon: "code", roles: "owner" as const },
  { href: "/embed", label: "Embed", icon: "code-2", roles: "owner" as const },
  { href: "/settings", label: "Settings", icon: "settings", roles: "owner_admin" as const },
];

const icons: Record<string, React.FC<{ className?: string }>> = {
  home: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  folder: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  "bar-chart": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  sparkles: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  book: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  code: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  "code-2": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  settings: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  inbox: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  users: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  "user-plus": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 8v6m3-3h-6" />
    </svg>
  ),
  "thumbs-up": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  ),
  activity: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
};

export function Sidebar() {
  const pathname = usePathname();
  const { role, availability, isLoading } = useAgent();
  const { currentProject, isLoading: isProjectLoading } = useProject();
  const inboxPolling = useInboxPollingOptional();

  // Get the effective role for the current project
  // Priority: project.role > agent context role
  // Default to restricted view (false) while loading to prevent flash of full menu
  const projectRole = currentProject?.role || role?.role || "agent";
  const isOwner = currentProject?.isOwner ?? role?.isOwner ?? false;
  const isAdmin = projectRole === "admin";

  // Build navigation items based on role
  const getNavItems = () => {
    return allNavItems.filter((item) => {
      // No role restriction - show to everyone
      if (!item.roles) return true;

      // Owner only
      if (item.roles === "owner") return isOwner;

      // Owner or admin
      if (item.roles === "owner_admin") return isOwner || isAdmin;

      return true;
    });
  };

  const navItems = getNavItems();

  // Inbox badge: use polling context (queue + assigned) if available, fallback to agent's chat count
  const inboxCount = inboxPolling?.totalPending ?? availability?.currentChatCount ?? 0;
  const hasUnread = inboxPolling?.hasUnread ?? false;
  const showInboxBadge = inboxCount > 0;

  return (
    <aside className="w-64 bg-card border-r min-h-screen p-4">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Image src="/logo.png" alt="FrontFace logo" width={20} height={20} className="h-5 w-5 object-contain" priority />
          </div>
          <span className="text-xl font-bold">FrontFace</span>
        </Link>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = icons[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {/* Badge for Inbox - shows queue + assigned count */}
              {item.href === "/inbox" && showInboxBadge && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    hasUnread
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {inboxCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Agent Status Summary (bottom of sidebar) */}
      {!isLoading && (
        <div className="mt-auto pt-4 border-t">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <p>Agent Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  availability?.status === "online"
                    ? "bg-green-500"
                    : availability?.status === "away"
                    ? "bg-yellow-500"
                    : "bg-gray-400"
                }`}
              />
              <span className="capitalize">{availability?.status || "offline"}</span>
              {availability?.status === "online" && (
                <span className="text-muted-foreground">
                  ({availability?.currentChatCount || 0}/{availability?.maxConcurrentChats || 5})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
